import React, { useState, useCallback, useEffect, useRef } from 'react';
import { ScrollView, Text, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { useFocusEffect } from 'expo-router/react-navigation';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '../../components/ui/Card';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { PaymentModal } from '../../components/ui/PaymentModal';
import { PaymentConfirmationModal } from '../../components/ui/PaymentConfirmationModal';
import { PaymentStatusTracker } from '../../components/ui/PaymentStatusTracker';
import { useAuth } from '../../hooks/useAuth';
import { useServerSettings } from '../../hooks/useServerSettings';
import { useLease } from '../../hooks/LeaseContext';
import { paymentApi, tenantApi } from '../../lib/api';
import { ErrorView } from '../../components/ui/ErrorView';
import type { CurrencyBalance, PaymentBalance, PaymentInitiationRequest, PaymentInitiationResponse } from '../../types';
import { formatMoney, normalizePhoneNumber, getMobileMoneyProvider } from '../../lib/currency';
import { SafeAreaWrapper } from '../../components/ui/SafeAreaWrapper';
import { tenantKeys } from '../../lib/queryKeys';
import { session } from '../../lib/session';
import { rentCheckout, securityCheckout, depositError, validateCheckoutRequest, SECURITY_DEPOSIT_LABELS } from '../../lib/paymentCheckout';
import { formatDateShort } from '../../lib/utils';

type Checkout = { paymentType: 'rent' | 'security_deposit'; paymentScope?: 'current' | 'arrears'; bucket?: CurrencyBalance; amount?: number };
type Step = 'idle' | 'amount' | 'confirmation' | 'processing' | 'pending' | 'success' | 'failed';

export default function PaymentsScreen() {
  const { user } = useAuth();
  const { selectedLeaseId, isLoadingLeases } = useLease();
  if (!user || isLoadingLeases) return <LoadingSpinner message="Loading your leases..." />;
  if (!selectedLeaseId) return <ErrorView title="No lease selected" message="Select a lease or contact your property manager." />;
  return <LeasePayments key={`${user.id}:${selectedLeaseId}`} leaseId={selectedLeaseId} />;
}

function LeasePayments({ leaseId }: { leaseId: string }) {
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { settings } = useServerSettings();
  const [step, setStep] = useState<Step>('idle');
  const [checkout, setCheckout] = useState<Checkout | null>(null);
  const [currentPayment, setCurrentPayment] = useState<PaymentInitiationResponse | null>(null);
  const [handledTransactionIds, setHandledTransactionIds] = useState<ReadonlySet<string>>(() => new Set());
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [focused, setFocused] = useState(false);
  const [pollDeposit, setPollDeposit] = useState(false);
  const mounted = useRef(true);
  const attempt = useRef(0);
  const submitting = useRef(false);
  const [generation] = useState(() => session.current());
  const active = () => mounted.current && session.isCurrent(generation);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  const balanceQuery = useQuery({
    queryKey: tenantKeys.query(user?.id, 'payment-balance', leaseId),
    queryFn: ({ signal }) => paymentApi.getBalance(leaseId, signal),
  });
  const contextQuery = useQuery({
    queryKey: tenantKeys.query(user?.id, 'payment-management-context', leaseId),
    queryFn: ({ signal }) => tenantApi.getDashboard(leaseId, signal),
    refetchInterval: focused && pollDeposit ? 5000 : false,
  });
  const historyQuery = useQuery({
    queryKey: tenantKeys.query(user?.id, 'payment-history', leaseId),
    queryFn: ({ signal }) => paymentApi.getHistory(leaseId, signal),
  });
  const { refetch: refetchBalance } = balanceQuery;
  const { refetch: refetchContext } = contextQuery;
  const { refetch: refetchHistory } = historyQuery;
  const refresh = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: tenantKeys.query(user?.id, 'tenant-dashboard', leaseId) }),
      queryClient.invalidateQueries({ queryKey: tenantKeys.query(user?.id, 'payment-schedule', leaseId) }),
      refetchBalance(), refetchContext(), refetchHistory(),
    ]);
  }, [queryClient, user?.id, leaseId, refetchBalance, refetchContext, refetchHistory]);
  useFocusEffect(useCallback(() => {
    setFocused(true);
    void refresh();
    return () => setFocused(false);
  }, [refresh]));
  const deposit = contextQuery.data?.lease;
  const pollingKey = `${focused}:${deposit?.securityDepositStatus}`;
  const [previousPollingKey, setPreviousPollingKey] = useState(pollingKey);
  if (previousPollingKey !== pollingKey) {
    setPreviousPollingKey(pollingKey);
    setPollDeposit(focused && deposit?.securityDepositStatus === 'pending');
  }
  useEffect(() => {
    if (!pollDeposit) return;
    const timer = setTimeout(() => setPollDeposit(false), 120000);
    return () => clearTimeout(timer);
  }, [pollDeposit]);

  const mutation = useMutation({
    retry: false,
    mutationFn: async ({ request }: { request: PaymentInitiationRequest; attemptId: number }) => paymentApi.initiate(request),
    onSuccess: (payment, variables) => {
      if (!active() || variables.attemptId !== attempt.current) return;
      submitting.current = false;
      setCurrentPayment(payment);
      setStep(payment.status === 'completed' ? 'success' : payment.status === 'failed' ? 'failed' : 'processing');
      setError('');
      void refresh();
    },
    onError: (failure: Error & { code?: string; confirmationPending?: boolean }, variables) => {
      if (!active() || variables.attemptId !== attempt.current) return;
      submitting.current = false;
      if (failure.confirmationPending) {
        setStep('pending');
        setError('The outcome is unknown. Check payment history before starting another payment.');
      } else {
        setStep('failed');
        setError(depositError(failure.code) || failure.message || 'Payment failed. Refresh before trying again.');
      }
      void refresh();
    },
  });

  const payments = historyQuery.data ?? [];
  const pendingPayments = payments.map(row => row.payment).filter(payment =>
    (payment.status === 'pending' || payment.status === 'processing') && payment.paymentMethod === 'mobile_money' && payment.transactionId);
  const pending = pendingPayments.find(payment => !handledTransactionIds.has(payment.transactionId!));
  if (pending?.transactionId && (step === 'idle' || (step === 'pending' && !currentPayment))) {
    setCurrentPayment({ paymentId: pending.id, transactionId: pending.transactionId,
      amount: Number(pending.amount), currency: pending.currency, leaseId, status: 'pending', confirmationPending: true });
    setCheckout({ paymentType: pending.paymentType === 'security_deposit' ? 'security_deposit' : 'rent' });
    setStep('processing');
  }

  const balance = balanceQuery.data;
  const ready = historyQuery.isSuccess && !historyQuery.isError && contextQuery.isSuccess && !contextQuery.isError;
  const unavailable = contextQuery.data?.management?.payeeReady === false;
  // Dismissal must not enable collection against history that still reports a pending payment.
  const locked = step !== 'idle' || mutation.isLoading || pendingPayments.length > 0;
  const prepare = (selection: Checkout) => {
    if (locked || !ready || unavailable) return;
    setError('');
    setCurrentPayment(null);
    setCheckout(selection);
    if (selection.paymentType === 'security_deposit') {
      setPhone(settings?.paymentPreferences?.mobileMoneyPhone || user?.phone || '');
      setStep('confirmation');
    } else setStep('amount');
  };
  const confirm = (confirmedPhone?: string) => {
    if (!checkout || submitting.current || !active()) return;
    try {
      const phoneNumber = normalizePhoneNumber(confirmedPhone || phone);
      const provider = getMobileMoneyProvider(phoneNumber);
      const savedProvider = settings?.paymentPreferences?.mobileMoneyProvider;
      const resolved = !confirmedPhone && savedProvider ? savedProvider : provider;
      if (resolved === 'unknown') throw new Error('Enter a valid mobile money phone number.');
      const request: PaymentInitiationRequest = {
        leaseId, amount: checkout.amount!, phoneNumber, provider: resolved,
        paymentMethod: 'mobile_money', paymentType: checkout.paymentType, paymentScope: checkout.paymentScope,
      };
      validateCheckoutRequest(request, deposit ?? undefined);
      submitting.current = true;
      setError('');
      mutation.mutate({ request, attemptId: ++attempt.current });
    } catch (failure) { setError((failure as Error).message); }
  };
  const close = () => {
    if (submitting.current || step === 'processing' || step === 'pending') return;
    const transactionId = currentPayment?.transactionId;
    if ((step === 'success' || step === 'failed') && transactionId) {
      setHandledTransactionIds(previous => new Set([...previous, transactionId]));
    }
    setStep('idle'); setCheckout(null); setCurrentPayment(null); setError('');
  };
  const terminal = (next: 'success' | 'failed', message = '') => {
    if (!active()) return;
    setStep(next); setError(message); void refresh();
  };
  const handlePaymentTimeout = useCallback(() => {
    setStep('pending'); setError('Confirmation is still pending. Check this payment before starting another.');
  }, []);
  if (balanceQuery.isLoading || contextQuery.isLoading) return <LoadingSpinner message="Loading payment information..." />;
  if (!balance || balanceQuery.isError || contextQuery.isError) return <ErrorView title="Unable to load payments"
    message={(balanceQuery.error as Error)?.message || (contextQuery.error as Error)?.message || 'Refresh and try again.'} onRetry={() => void refresh()} />;

  const buckets = balance.balances?.length ? balance.balances : [balance];
  const selectedBalance: PaymentBalance | null = checkout?.bucket ? { ...balance, ...checkout.bucket, balances: [checkout.bucket] } : null;
  return <SafeAreaWrapper><ScrollView className="flex-1 bg-gray-50" contentContainerStyle={{ padding: 16, gap: 16 }}
    refreshControl={<RefreshControl refreshing={balanceQuery.isRefetching || contextQuery.isRefetching || historyQuery.isRefetching} onRefresh={() => void refresh()} />}>
    <Text className="text-3xl font-bold">Payments</Text>
    {step === 'processing' && currentPayment && <PaymentStatusTracker key={currentPayment.transactionId}
      transactionId={currentPayment.transactionId} amount={currentPayment.amount} currency={currentPayment.currency}
      confirmationPending={currentPayment.confirmationPending}
      onSuccess={() => terminal('success')} onFailed={status => terminal('failed', status.message)} onTimeout={handlePaymentTimeout} />}
    {step === 'pending' && <Card><Text className="font-semibold">Confirmation pending</Text><Text className="my-3">{error}</Text>
      <ActionButton label="Check payment status" onPress={() => { if (currentPayment) setStep('processing'); else void refresh(); }} disabled={false} /></Card>}
    {(step === 'success' || step === 'failed') && <Card>
      <Text className="text-lg font-semibold">{step === 'success' ? 'Payment successful' : 'Payment not completed'}</Text>
      {currentPayment && <Text className="my-2">{formatMoney(currentPayment.amount, currentPayment.currency)}</Text>}
      {!!error && <Text className="my-2">{error}</Text>}
      <ActionButton label="Continue" onPress={close} disabled={false} />
    </Card>}
    {unavailable && <Text>Online payment is paused until the recipient is verified. Contact your property manager for an approved alternative.</Text>}
    {!ready && <Card><Text>Payment history must be refreshed before starting a payment.</Text><ActionButton label="Refresh payments" onPress={() => void refresh()} disabled={false} /></Card>}
    {ready && step === 'idle' && pendingPayments.length > 0 && !pending && <Card>
      <Text>Payment history is still updating. Refresh before starting another payment.</Text>
      <ActionButton label="Refresh payments" onPress={() => void refresh()} disabled={false} />
    </Card>}
    {buckets.map(bucket => <Card key={bucket.currency}>
      <Text className="text-lg font-semibold">{bucket.currency === balance.monthlyRentCurrency ? 'Rent balance' : 'Previous-currency rent balance'}</Text>
      <Text className="text-2xl font-bold my-2">{formatMoney(bucket.outstandingBalance, bucket.currency)}</Text>
      {bucket.dueDate && <Text>Next due: {formatDateShort(bucket.dueDate)}</Text>}
      {bucket.isOverdue && <Text>Payment is overdue</Text>}
      {bucket.currency === 'UGX' ? <ActionButton label="Pay UGX rent" onPress={() => prepare(rentCheckout(balance, bucket))} disabled={locked || !ready || unavailable} />
        : <Text>Arrange USD payment with your property manager by bank transfer or cash. Mobile money supports UGX only.</Text>}
    </Card>)}
    {deposit && <Card>
      <Text className="text-lg font-semibold">Refundable security deposit</Text>
      <Text className="my-2">{SECURITY_DEPOSIT_LABELS[deposit.securityDepositStatus]}</Text>
      {deposit.securityDeposit !== null && deposit.securityDepositCurrency && <Text>{formatMoney(deposit.securityDeposit, deposit.securityDepositCurrency)}</Text>}
      {deposit.securityDepositStatus === 'unpaid' && (deposit.securityDepositCurrency === 'UGX'
        ? <ActionButton label="Pay security deposit" onPress={() => { try { prepare(securityCheckout(deposit)); } catch (failure) { Alert.alert('Deposit unavailable', (failure as Error).message); } }} disabled={locked || !ready || unavailable} />
        : <Text>Arrange exact-amount USD security payment with your property manager. Mobile money supports UGX only.</Text>)}
      {deposit.securityDepositStatus === 'pending' && <>
        <Text>{pollDeposit ? 'Checking confirmation...' : 'Confirmation remains pending. Do not pay again.'}</Text>
        <ActionButton label="Refresh deposit status" onPress={() => void refresh()} disabled={false} />
      </>}
    </Card>}
    <ActionButton label="Payment schedule" onPress={() => router.push('/screens/payment-schedule')} disabled={false} />
    <ActionButton label={`Payment history (${payments.length})`} onPress={() => router.push('/screens/payment-history')} disabled={false} />
  </ScrollView>
    {selectedBalance && <PaymentModal visible={step === 'amount'} balance={selectedBalance} onClose={close}
      onConfirm={amount => { setCheckout(previous => previous && { ...previous, amount }); setPhone(settings?.paymentPreferences?.mobileMoneyPhone || user?.phone || ''); setStep('confirmation'); }} />}
    {checkout && <PaymentConfirmationModal visible={step === 'confirmation'} onClose={close} onConfirm={confirm}
      amount={checkout.amount ?? 0} currency="UGX" phoneNumber={phone}
      providerName={settings?.paymentPreferences?.mobileMoneyProvider === 'airtel' ? 'Airtel Money' : 'Mobile money'}
      isLoading={mutation.isLoading} error={error} paymentType={checkout.paymentType} />}
  </SafeAreaWrapper>;
}

function ActionButton({ label, onPress, disabled }: { label: string; onPress: () => void; disabled: boolean }) {
  return <TouchableOpacity
    accessibilityRole="button" onPress={onPress} disabled={disabled}
    className={`bg-brand p-3 rounded-md ${disabled ? 'opacity-50' : ''}`}>
    <Text className="text-white font-semibold text-center">{label}</Text>
  </TouchableOpacity>;
}
