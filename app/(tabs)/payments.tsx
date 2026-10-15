import { BRAND_COLOR } from "@/constants/theme";
import React, { useState, useCallback, useMemo, useEffect } from "react";
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "../../components/ui/Card";
import { LoadingSpinner } from "../../components/ui/LoadingSpinner";
import { PaymentModal } from "../../components/ui/PaymentModal";
import { PaymentConfirmationModal } from "../../components/ui/PaymentConfirmationModal";
import { PaymentStatusTracker } from "../../components/ui/PaymentStatusTracker";
import { useAuth } from "../../hooks/useAuth";
import { useServerSettings } from "../../hooks/useServerSettings";
import { useLease } from "../../hooks/LeaseContext";
import { paymentApi, tenantApi } from "../../lib/api";
import { ErrorView } from "../../components/ui/ErrorView";
import {
  CurrencyBalance,
  PaymentInitiationResponse,
  PaymentStatusResponse,
  PaymentFlowState,
} from "../../types";
import {
  formatMoney,
  MOBILE_MONEY_UNAVAILABLE_MESSAGE,
  normalizePhoneNumber,
  getMobileMoneyProvider,
} from "../../lib/currency";
import { SafeAreaWrapper } from "../../components/ui/SafeAreaWrapper";
import { formatDateShort } from "@/lib/utils";

export default function PaymentsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { settings } = useServerSettings();
  const { selectedLeaseId } = useLease();

  // Payment flow states
  const [paymentFlow, setPaymentFlow] = useState<PaymentFlowState>({
    step: "idle",
  });
  const [currentPayment, setCurrentPayment] =
    useState<PaymentInitiationResponse | null>(null);

  useEffect(() => {
    setCurrentPayment(null);
    setPaymentFlow({ step: 'idle', isLoading: false });
  }, [selectedLeaseId]);

  const {
    data: balance,
    isLoading: isBalanceLoading,
    isRefetching: isBalanceRefetching,
    error: balanceError,
    refetch: refetchBalance,
  } = useQuery({
    queryKey: ["payment-balance", selectedLeaseId],
    queryFn: () => paymentApi.getBalance(selectedLeaseId!),
    enabled: !!selectedLeaseId,
  });
  const { data: tenantContext, refetch: refetchTenantContext } = useQuery({
    queryKey: ["payment-management-context", selectedLeaseId],
    queryFn: () => tenantApi.getDashboard(selectedLeaseId || undefined),
    enabled: !!selectedLeaseId,
  });

  const {
    data: payments = [],
    isRefetching: isPaymentsRefetching,
    refetch: refetchPayments,
  } = useQuery({
    queryKey: ["payment-history", selectedLeaseId],
    queryFn: () => paymentApi.getHistory(selectedLeaseId!),
    enabled: !!selectedLeaseId,
  });

  const initiatePaymentMutation = useMutation({
    mutationFn: paymentApi.initiate,
    retry: false,
    onSuccess: (paymentResponse) => {
      if (paymentResponse.leaseId !== selectedLeaseId) return;
      setCurrentPayment(paymentResponse);
      setPaymentFlow((prev) => ({
        ...prev,
        transactionId: paymentResponse.transactionId,
        step: paymentResponse.status === 'completed' ? 'success' : paymentResponse.status === 'failed' ? 'failed' : 'processing',
        isLoading: false,
        error: undefined,
      }));
      if (paymentResponse.status === 'completed') { void refetchBalance(); void refetchPayments(); }
    },
    onError: (err: any) => {
      if (err.confirmationPending) {
        setPaymentFlow(prev => ({ ...prev, step: 'pending', isLoading: false, error: 'The payment outcome is unknown. Check payment history before starting another collection.' }));
        void refetchPayments();
        return;
      }
      let errorMessage = "Payment failed. Please try again.";
      if (
        err.message?.includes("Network Error") ||
        err.message?.includes("connection")
      ) {
        errorMessage =
          "Connection failed. Please check your internet and try again.";
      } else if (err.message?.includes("timeout")) {
        errorMessage = "Request timed out. Please try again.";
      } else if (err.message?.includes("Invalid payment data")) {
        errorMessage =
          "Invalid payment information. Please check your details.";
      } else if (err.message?.includes("Insufficient funds")) {
        errorMessage = "Insufficient funds in your mobile money account.";
      } else if (err.message?.includes("Phone number")) {
        errorMessage =
          "Invalid phone number. Please check your mobile money number.";
      } else if (err.message?.toLowerCase().includes("mobile money supports ugx only")) {
        errorMessage = MOBILE_MONEY_UNAVAILABLE_MESSAGE;
      } else if (err.message) {
        errorMessage = err.message;
      }
      setPaymentFlow((prev) => ({
        ...prev,
        error: errorMessage,
        isLoading: false,
      }));
    },
  });

  // `balances[0]` is the payable bucket and mirrors the flat fields; the rest are other
  // currencies still owed on the lease (old-currency arrears after a rent-currency
  // transition). Fall back to the flat fields so an older server still renders.
  const { primaryBalance, otherBalances } = useMemo(() => {
    if (!balance) return { primaryBalance: null, otherBalances: [] as CurrencyBalance[] };
    const buckets = balance.balances?.length
      ? balance.balances
      : [{
          currency: balance.currency,
          paidAmount: balance.paidAmount,
          outstandingBalance: balance.outstandingBalance,
          minimumPayment: balance.minimumPayment,
          dueDate: balance.dueDate,
          nextPaymentDue: balance.nextPaymentDue,
          isOverdue: balance.isOverdue,
        }];
    return {
      primaryBalance: buckets[0],
      otherBalances: buckets.slice(1).filter(b => b.outstandingBalance > 0),
    };
  }, [balance]);

  const isRefreshing = isBalanceRefetching || isPaymentsRefetching;

  const handleRefresh = useCallback(async () => {
    if (selectedLeaseId) {
      await Promise.all([refetchBalance(), refetchPayments(), refetchTenantContext()]);
    }
  }, [selectedLeaseId, refetchBalance, refetchPayments, refetchTenantContext]);

  useFocusEffect(
    useCallback(() => {
      if (selectedLeaseId) {
        refetchBalance();
        refetchPayments();
      }
    }, [selectedLeaseId, refetchBalance, refetchPayments]),
  );

  const pendingPayment = payments.map(row => row.payment).find(payment => (payment.status === 'pending' || payment.status === 'processing') && payment.paymentMethod === 'mobile_money' && payment.transactionId);
  const resumePendingPayment = useCallback(() => {
    if (!pendingPayment?.transactionId || !selectedLeaseId) return;
    setCurrentPayment({ paymentId: pendingPayment.id, transactionId: pendingPayment.transactionId,
      amount: Number(pendingPayment.amount), currency: pendingPayment.currency ?? 'UGX', leaseId: selectedLeaseId,
      status: 'pending', gateway: pendingPayment.gateway === 'yo' || pendingPayment.gateway === 'iotec' ? pendingPayment.gateway : undefined,
      gatewayReference: pendingPayment.gatewayReference ?? '', confirmationPending: true });
    setPaymentFlow({ step: 'processing', transactionId: pendingPayment.transactionId, isLoading: false });
  }, [pendingPayment, selectedLeaseId]);
  useEffect(() => {
    if ((paymentFlow.step === 'idle' || (paymentFlow.step === 'pending' && !currentPayment)) && pendingPayment) resumePendingPayment();
  }, [paymentFlow.step, currentPayment, pendingPayment, resumePendingPayment]);

  const handlePayNow = useCallback(() => {
    if (currentPayment && (paymentFlow.step === 'processing' || paymentFlow.step === 'pending')) {
      setPaymentFlow(prev => ({ ...prev, step: 'processing', error: undefined }));
      return;
    }
    if (pendingPayment) { resumePendingPayment(); return; }
    if (paymentFlow.step === 'pending') { void refetchPayments(); return; }
    if (!balance || balance.currency !== "UGX") return;
    if (tenantContext?.management && !tenantContext.management.payeeReady) {
      Alert.alert('Online payment unavailable', 'The payment recipient is not verified yet. Contact the managing organization for an approved payment method.');
      return;
    }
    setPaymentFlow({ step: "amount-selection", isLoading: false });
  }, [balance, tenantContext?.management, currentPayment, paymentFlow.step, pendingPayment, resumePendingPayment, refetchPayments]);

  const handleAmountConfirm = useCallback(
    async (amount: number) => {
      if (!balance || balance.currency !== "UGX") {
        Alert.alert("Payment unavailable", MOBILE_MONEY_UNAVAILABLE_MESSAGE);
        return;
      }

      if (!selectedLeaseId) {
        Alert.alert(
          "Error",
          "Payment information not available. Please try again.",
        );
        return;
      }

      try {
        setPaymentFlow((prev) => ({
          ...prev,
          amount,
          isLoading: true,
          error: undefined,
        }));

        // Prefer the tenant's saved payment preferences; fall back to the profile
        // phone with phone-prefix provider detection when they're unset.
        const prefs = settings?.paymentPreferences;
        const phoneNumber = prefs?.mobileMoneyPhone || user?.phone;

        if (!phoneNumber) {
          throw new Error(
            "Phone number not found. Please update your profile.",
          );
        }

        const normalizedPhone = normalizePhoneNumber(phoneNumber);
        const provider =
          prefs?.mobileMoneyProvider || getMobileMoneyProvider(normalizedPhone);

        if (provider === "unknown") {
          throw new Error(
            "Unsupported phone number. Please use MTN or Airtel mobile money.",
          );
        }

        const providerName =
          provider === "mtn"
            ? "MTN MoMo"
            : provider === "airtel"
              ? "Airtel Money"
              : "M-Sente";
        const providerColor =
          provider === "mtn"
            ? "#FFCB05"
            : provider === "airtel"
              ? "#E51A1A"
              : BRAND_COLOR;

        setPaymentFlow((prev) => ({
          ...prev,
          phoneNumber: normalizedPhone,
          paymentMethod: {
            id: provider as any,
            name: provider,
            displayName: providerName,
            color: providerColor,
            icon: "phone-android",
            prefixes: [],
          },
          step: "confirmation",
          isLoading: false,
          error: undefined,
        }));
      } catch (err: any) {
        Alert.alert("Error", err.message || "Failed to proceed with payment");
        setPaymentFlow((prev) => ({
          ...prev,
          isLoading: false,
          error: err.message,
        }));
      }
    },
    [balance, user?.phone, settings?.paymentPreferences, selectedLeaseId],
  );

  const handlePaymentConfirm = useCallback(
    async (confirmedPhoneNumber?: string) => {
      const { amount, phoneNumber, paymentMethod } = paymentFlow;
      const effectivePhoneNumber = confirmedPhoneNumber || phoneNumber;

      if (!balance || balance.currency !== "UGX") {
        Alert.alert("Payment unavailable", MOBILE_MONEY_UNAVAILABLE_MESSAGE);
        return;
      }

      if (!amount || !effectivePhoneNumber || !selectedLeaseId) {
        Alert.alert("Error", "Missing payment information. Please try again.");
        return;
      }

      let effectiveProviderId = paymentMethod?.id;

      if (confirmedPhoneNumber) {
        const newProvider = getMobileMoneyProvider(confirmedPhoneNumber);
        if (newProvider === "unknown") {
          Alert.alert(
            "Error",
            "Invalid phone number. Please use a valid MTN or Airtel number.",
          );
          return;
        }
        effectiveProviderId = newProvider;
      }

      if (!effectiveProviderId) {
        Alert.alert("Error", "Unknown mobile money provider.");
        return;
      }

      setPaymentFlow((prev) => ({
        ...prev,
        isLoading: true,
        error: undefined,
      }));

      initiatePaymentMutation.mutate({
        leaseId: selectedLeaseId,
        amount,
        phoneNumber: effectivePhoneNumber,
        provider: effectiveProviderId as "mtn" | "airtel" | "m-sente",
        paymentMethod: "mobile_money",
      });
    },
    [balance, paymentFlow, selectedLeaseId, initiatePaymentMutation],
  );

  const handlePaymentSuccess = useCallback(
    (status: PaymentStatusResponse) => {
      setPaymentFlow((prev) => ({
        ...prev,
        step: "success",
        error: undefined,
        isLoading: false,
      }));
      setTimeout(() => {
        refetchBalance();
        refetchPayments();
      }, 1000);
    },
    [refetchBalance, refetchPayments],
  );

  const handlePaymentFailed = useCallback((status: PaymentStatusResponse) => {
    setPaymentFlow((prev) => ({
      ...prev,
      step: "failed",
      error: status.message || "Payment failed",
      isLoading: false,
    }));
  }, []);

  const handlePaymentTimeout = useCallback(() => {
    setPaymentFlow((prev) => ({
      ...prev,
      step: "pending",
      error: "Confirmation is still pending. Check this payment before starting another.",
      isLoading: false,
    }));
  }, []);

  const closePaymentFlow = useCallback(() => {
    if (paymentFlow.step === 'pending' || paymentFlow.step === 'processing') return;
    setPaymentFlow({ step: "idle", isLoading: false, error: undefined });
    setCurrentPayment(null);
  }, [paymentFlow.step]);

  const retryPayment = useCallback(() => {
    setPaymentFlow({
      step: "amount-selection",
      isLoading: false,
      error: undefined,
    });
    setCurrentPayment(null);
  }, []);

  if (isBalanceLoading) {
    return <LoadingSpinner message="Loading payment information..." />;
  }

  if (!selectedLeaseId) {
    return (
      <ErrorView
        title="No Active Lease Found"
        message="You don't have an active lease. Please contact your landlord."
        icon="home"
        iconColor="#6B7280"
      />
    );
  }

  if (balanceError && !balance) {
    return (
      <ErrorView
        title="Unable to Load Payments"
        message={
          (balanceError as any).message || "Failed to load payment information"
        }
        onRetry={() => refetchBalance()}
      >
        <Text className="text-xs text-gray-500 mt-2 text-center">
          Check your internet connection and try again
        </Text>
      </ErrorView>
    );
  }

  return (
    <SafeAreaWrapper>
      <View className="flex-1 bg-gray-50">
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
            />
          }
        >
          <View className="px-4 pt-6 pb-4">
            {/* Header */}
            <Text className="text-3xl font-bold text-gray-800 mb-6">
              Payments
            </Text>

            {/* Processing tracker — polls the verified status endpoint and is
                nudged by realtime payment:updated events; drives the flow to
                success/failed/timeout. Falls back to a spinner if we somehow
                reach 'processing' without an initiated payment in hand. */}
            {paymentFlow.step === "processing" &&
              (currentPayment ? (
                <PaymentStatusTracker
                  transactionId={currentPayment.transactionId}
                  amount={currentPayment.amount}
                  currency={currentPayment.currency}
                  onSuccess={handlePaymentSuccess}
                  onFailed={handlePaymentFailed}
                  onTimeout={handlePaymentTimeout}
                  confirmationPending={currentPayment.confirmationPending}
                  className="mb-6"
                />
              ) : (
                <Card className="mb-6">
                  <View className="items-center py-8">
                    <LoadingSpinner
                      size="large"
                      message="Processing payment..."
                      className="my-0"
                    />
                  </View>
                </Card>
              ))}

            {paymentFlow.step === 'pending' && <Card className="mb-6 bg-yellow-50">
              <Text className="text-lg font-semibold">Confirmation pending</Text>
              <Text className="my-3">{paymentFlow.error}</Text>
              <TouchableOpacity onPress={() => { if (currentPayment) setPaymentFlow(prev => ({ ...prev, step: 'processing', error: undefined })); else void refetchPayments(); }}>
                <Text className="text-brand font-semibold">Check payment status</Text>
              </TouchableOpacity>
            </Card>}

            {/* Success/Failure Messages */}
            {paymentFlow.step === "success" && currentPayment && (
              <Card className="mb-6 bg-green-50 border-green-200">
                <View className="items-center space-y-4 py-4">
                  <MaterialIcons
                    name="check-circle"
                    size={48}
                    color="#10B981"
                  />
                  <Text className="text-xl font-bold text-green-800">
                    Payment Successful!
                  </Text>
                  <Text className="text-green-700 text-center">
                    Your payment of {formatMoney(currentPayment.amount, currentPayment.currency)} has been
                    processed successfully.
                  </Text>
                  <TouchableOpacity
                    onPress={closePaymentFlow}
                    className="bg-green-600 px-6 py-3 rounded-md"
                  >
                    <Text className="text-white font-semibold">Continue</Text>
                  </TouchableOpacity>
                </View>
              </Card>
            )}

            {paymentFlow.step === "failed" && (
              <Card className="mb-6 bg-red-50 border-red-200">
                <View className="items-center space-y-4 py-4">
                  <MaterialIcons name="error" size={48} color="#EF4444" />
                  <Text className="text-xl font-bold text-red-800">
                    Payment Failed
                  </Text>
                  <Text className="text-red-700 text-center">
                    {paymentFlow.error ||
                      "Your payment could not be processed."}
                  </Text>
                  <View className="flex-row gap-2">
                    <TouchableOpacity
                      onPress={retryPayment}
                      className="bg-red-600 px-6 py-3 rounded-md"
                    >
                      <Text className="text-white font-semibold">
                        Try Again
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={closePaymentFlow}
                      className="border border-red-600 px-6 py-3 rounded-md"
                    >
                      <Text className="text-red-600 font-semibold">Close</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </Card>
            )}

            {/* Current Balance Card */}
            {balance && primaryBalance && (
              <Card className="mb-4">
                <View className="space-y-4">
                  <View className="flex-row justify-between items-center mb-4">
                    <Text className="text-lg font-semibold text-gray-800">
                      Outstanding Balance
                    </Text>
                  </View>

                  <View className="space-y-2">
                    <Text className="text-3xl font-bold text-brand">
                      {formatMoney(primaryBalance.outstandingBalance, primaryBalance.currency)}
                    </Text>
                    {/* A transitioned lease also owes its old currency. Shown separately —
                        summing across currencies would be meaningless. */}
                    {otherBalances.map((bucket) => (
                      <View key={bucket.currency} className="flex-row items-center gap-2">
                        <Text className="text-gray-800 text-base font-semibold">
                          + {formatMoney(bucket.outstandingBalance, bucket.currency)}
                        </Text>
                        <Text className="text-gray-500 text-xs">
                          {bucket.currency} arrears{bucket.isOverdue ? ' · overdue' : ''}
                        </Text>
                      </View>
                    ))}
                    <View className="flex-row justify-between">
                      <Text className="text-gray-600 text-sm">
                        Monthly Rent: {formatMoney(balance.monthlyRent, balance.monthlyRentCurrency)}
                      </Text>
                    </View>
                    {primaryBalance.dueDate && (
                      <Text className="text-gray-600 text-sm">
                        Next Due: {formatDateShort(primaryBalance.dueDate)}
                      </Text>
                    )}
                    {primaryBalance.isOverdue && (
                      <Text className="text-yellow-600 text-sm font-medium">
                        ⚠️ Payment is overdue
                      </Text>
                    )}
                  </View>

                  {balance.currency === "UGX" ? (
                    tenantContext?.management && !tenantContext.management.payeeReady ? (
                      <View className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mt-8">
                        <Text className="text-yellow-900 text-sm leading-5">Online payment is paused until the payment recipient is verified. {tenantContext.management.managingDisplayName} can provide an approved alternative.</Text>
                      </View>
                    ) : (
                    <View className="mt-8 gap-2">
                      {tenantContext?.management?.payeeDisplayName && (
                        <Text className="text-gray-600 text-sm text-center">
                          Mobile-money recipient: {tenantContext.management.payeeDisplayName}
                          {tenantContext.management.settlementMode?.startsWith('agency_collect') ? ' (managing agency)' : ''}
                        </Text>
                      )}
                      <TouchableOpacity
                        className="bg-brand py-3 rounded-md items-center flex-row justify-center space-x-2"
                        onPress={handlePayNow}
                        disabled={paymentFlow.step !== "idle"}
                      >
                        <Text className="text-white font-medium text-lg">
                          Pay with mobile money
                        </Text>
                      </TouchableOpacity>
                    </View>
                    )
                  ) : (
                    <View className="bg-blue-50 border border-blue-200 rounded-md p-3 mt-8">
                      <Text className="text-blue-900 text-sm leading-5">
                        {MOBILE_MONEY_UNAVAILABLE_MESSAGE}
                      </Text>
                    </View>
                  )}
                </View>
              </Card>
            )}

            {/* Payment Methods Card */}
            {balance && <Card className="mb-4">
              <View className="space-y-3">
                <Text className="text-lg font-semibold text-gray-800 mb-4">
                  Payment Methods
                </Text>

                {balance.currency === "UGX" ? <>
                <View className="flex-row items-center justify-between py-2 px-2 mb-2 rounded-md bg-yellow-50 border border-yellow-200">
                  <View className="flex-row items-center gap-2">
                    <MaterialIcons
                      name="phone-android"
                      size={24}
                      color="#F59E0B"
                    />
                    <View>
                      <Text className="font-medium text-gray-800">
                        MTN Mobile Money
                      </Text>
                      <Text className="text-sm text-gray-600">
                        Pay with your MTN MoMo account
                      </Text>
                    </View>
                  </View>
                  <MaterialIcons name="verified" size={20} color="#10B981" />
                </View>

                <View className="flex-row items-center justify-between py-2 px-2 rounded-md bg-red-50 border border-red-200">
                  <View className="flex-row items-center gap-2">
                    <MaterialIcons
                      name="phone-android"
                      size={24}
                      color="#E51A1A"
                    />
                    <View>
                      <Text className="font-medium text-gray-800">
                        Airtel Money
                      </Text>
                      <Text className="text-sm text-gray-600">
                        Pay with your Airtel Money account
                      </Text>
                    </View>
                  </View>
                  <MaterialIcons name="verified" size={20} color="#10B981" />
                </View>
                </> : (
                  <Text className="text-gray-600 text-sm leading-5">
                    {MOBILE_MONEY_UNAVAILABLE_MESSAGE}
                  </Text>
                )}
              </View>
            </Card>}

            {/* Payment Schedule Link */}
            <TouchableOpacity
              onPress={() => router.push("/screens/payment-schedule")}
              activeOpacity={0.7}
            >
              <Card className="mb-4">
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center gap-3">
                    <View className="w-10 h-10 bg-brand/10 rounded-full items-center justify-center">
                      <MaterialIcons
                        name="event-note"
                        size={24}
                        color={BRAND_COLOR}
                      />
                    </View>
                    <View>
                      <Text className="text-lg font-semibold text-gray-800">
                        Payment Schedule
                      </Text>
                      <Text className="text-sm text-gray-500">
                        View upcoming payments
                      </Text>
                    </View>
                  </View>
                  <MaterialIcons
                    name="chevron-right"
                    size={24}
                    color="#9CA3AF"
                  />
                </View>
              </Card>
            </TouchableOpacity>

            {/* Payment History Link */}
            <TouchableOpacity
              onPress={() => router.push("/screens/payment-history")}
              activeOpacity={0.7}
            >
              <Card className="mb-6">
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center gap-3">
                    <View className="w-10 h-10 bg-brand/10 rounded-full items-center justify-center">
                      <MaterialIcons
                        name="receipt-long"
                        size={24}
                        color={BRAND_COLOR}
                      />
                    </View>
                    <View>
                      <Text className="text-lg font-semibold text-gray-800">
                        Payment History
                      </Text>
                      <Text className="text-sm text-gray-500">
                        {payments.length === 0
                          ? "No payments yet"
                          : `${payments.length} payment${payments.length === 1 ? "" : "s"}`}
                      </Text>
                    </View>
                  </View>
                  <MaterialIcons
                    name="chevron-right"
                    size={24}
                    color="#9CA3AF"
                  />
                </View>
              </Card>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Payment Amount Modal */}
        {balance && balance.currency === "UGX" && (
          <PaymentModal
            visible={paymentFlow.step === "amount-selection"}
            onClose={closePaymentFlow}
            onConfirm={handleAmountConfirm}
            balance={balance}
            isLoading={paymentFlow.isLoading}
          />
        )}

        {/* Payment Confirmation Modal */}
        {balance?.currency === "UGX" &&
          paymentFlow.paymentMethod &&
          paymentFlow.phoneNumber && (
          <PaymentConfirmationModal
            visible={paymentFlow.step === "confirmation"}
            onClose={closePaymentFlow}
            onConfirm={handlePaymentConfirm}
            amount={paymentFlow.amount || 0}
            currency={balance?.currency || "UGX"}
            phoneNumber={paymentFlow.phoneNumber}
            providerName={paymentFlow.paymentMethod.displayName}
            isLoading={paymentFlow.isLoading}
            error={paymentFlow.error}
          />
        )}
      </View>
    </SafeAreaWrapper>
  );
}
