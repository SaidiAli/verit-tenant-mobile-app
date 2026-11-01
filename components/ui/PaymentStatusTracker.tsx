import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  Modal,
  ScrollView,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { BRAND_COLOR } from '../../constants/theme';
import { LoadingSpinner } from './LoadingSpinner';
import { usePaymentStatus } from '../../hooks/usePaymentStatus';
import { usePaymentSocket } from '../../hooks/usePaymentSocket';
import { Currency, PaymentStatusResponse } from '../../types';
import { formatMoney } from '../../lib/currency';

/** How tracking ended when the tracker was dismissed. */
export type TrackerOutcome = 'success' | 'failed' | 'cancelled';

interface PaymentStatusTrackerProps {
  transactionId: string;
  amount: number;
  currency: Currency;
  /** Payment was resumed from history rather than freshly initiated. */
  confirmationPending?: boolean;
  /** Hide the bottom sheet and show only the compact progress card on screen. */
  backgrounded?: boolean;
  /** User tapped "Move to Background" (or closed the sheet while still waiting). */
  onBackground: () => void;
  /** User tapped the compact card to bring the sheet back. */
  onForeground: () => void;
  /** Single exit path: tracking is over (or the user gave up on it). */
  onDismiss: (outcome: TrackerOutcome) => void;
  /** Balance/history refresh hooks, fired when a terminal status arrives. */
  onSuccess?: (status: PaymentStatusResponse) => void;
  onFailed?: (status: PaymentStatusResponse) => void;
  /** Applied to the compact card rendered while backgrounded. */
  className?: string;
}

type TrackerView =
  | { kind: 'tracking' }
  | { kind: 'timeout' }
  | { kind: 'connectionError'; message: string }
  | { kind: 'success' }
  | { kind: 'failed'; message: string };

const PENDING_COLOR = '#F59E0B';
const SUCCESS_COLOR = '#10B981';
const FAILED_COLOR = '#EF4444';
// Must stay in sync with maxPollingDuration passed to usePaymentStatus below.
const MAX_WAIT_SECONDS = 120;

export function PaymentStatusTracker({
  transactionId,
  amount,
  currency,
  confirmationPending = false,
  backgrounded = false,
  onBackground,
  onForeground,
  onDismiss,
  onSuccess,
  onFailed,
  className = '',
}: PaymentStatusTrackerProps) {
  const insets = useSafeAreaInsets();
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { status, isPolling, error, startPolling, stopPolling, refetch } = usePaymentStatus({
    transactionId,
    onSuccess,
    onFailed,
    pollingInterval: 5000,
    maxPollingDuration: MAX_WAIT_SECONDS * 1000,
  });

  // Realtime nudge: when the backend pushes a status change for this payment,
  // immediately re-check the authoritative /status endpoint instead of waiting
  // for the next 5s poll. Polling stays as the fallback if the socket is down.
  usePaymentSocket(transactionId, () => {
    refetch().catch(() => {
      /* ignore — the poller will retry */
    });
  });

  // Start polling whenever we attach to a transaction; stop on unmount.
  useEffect(() => {
    if (!transactionId) return;
    startPolling();
    return () => stopPolling();
  }, [transactionId, startPolling, stopPolling]);

  // Elapsed-time counter, restarted with each polling session so the progress
  // bar and "up to 2 minutes" copy stay meaningful after a manual retry.
  useEffect(() => {
    if (!isPolling) return;
    setElapsed(0);
    timerRef.current = setInterval(() => setElapsed(prev => prev + 1), 1000);
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isPolling, transactionId]);

  // Terminal states win over transient polling errors (e.g. a socket-triggered
  // refetch failing after the payment already completed).
  const view: TrackerView = (() => {
    if (status?.paymentStatus === 'completed') return { kind: 'success' };
    if (status?.paymentStatus === 'failed') {
      return { kind: 'failed', message: status.message || 'Your payment could not be processed.' };
    }
    // Only the overall polling-timeout message contains "timed out"; a single
    // slow status request times out as "timeout of 15000ms exceeded".
    if (error?.includes('timed out')) return { kind: 'timeout' };
    if (error) return { kind: 'connectionError', message: error };
    return { kind: 'tracking' };
  })();

  const terminal = view.kind === 'success' || view.kind === 'failed';

  const handleDone = () => onDismiss(view.kind === 'failed' ? 'failed' : 'success');

  // The request was already sent to the phone and cannot be aborted server
  // side — cancelling only stops tracking. Make that explicit.
  const handleCancel = () => {
    Alert.alert(
      'Stop tracking this payment?',
      'The request was already sent to your phone. The payment may still complete — check your payment history.',
      [
        { text: 'Keep Waiting', style: 'cancel' },
        { text: 'Stop Tracking', style: 'destructive', onPress: () => onDismiss('cancelled') },
      ],
    );
  };

  const handleCheckStatus = () => {
    if (!isPolling) startPolling();
  };

  // Backdrop / header close / Android back: while waiting, closing the sheet
  // means backgrounding (tracking continues via the compact card); once a
  // terminal status has arrived it means the same as Done.
  const handleSheetClose = () => {
    if (terminal) handleDone();
    else onBackground();
  };

  const formattedAmount = formatMoney(status?.amount ?? amount, status?.currency ?? currency);

  const sheetHeader =
    view.kind === 'success'
      ? 'Payment Successful'
      : view.kind === 'failed'
        ? 'Payment Failed'
        : 'Payment Status';

  // While backgrounded, only the compact progress card is rendered on screen.
  if (backgrounded) {
    const cardMeta = (() => {
      switch (view.kind) {
        case 'success':
          return { title: 'Payment successful', subtitle: formattedAmount, color: SUCCESS_COLOR, icon: 'check-circle' as const };
        case 'failed':
          return { title: 'Payment not completed', subtitle: view.message, color: FAILED_COLOR, icon: 'cancel' as const };
        case 'timeout':
          return { title: 'Confirmation pending', subtitle: 'Taking longer than usual — tap to check.', color: PENDING_COLOR, icon: 'hourglass-empty' as const };
        case 'connectionError':
          return { title: 'Connection problem', subtitle: view.message, color: FAILED_COLOR, icon: 'error' as const };
        default:
          return { title: 'Payment in progress', subtitle: `Waiting for confirmation · up to ${MAX_WAIT_SECONDS / 60} min`, color: PENDING_COLOR, icon: 'hourglass-empty' as const };
      }
    })();

    return (
      <View className={`bg-brand-light/60 rounded-[22px] p-5 ${className}`}>
        <TouchableOpacity
          onPress={onForeground}
          disabled={terminal}
          className="flex-row items-center gap-3"
        >
          {view.kind === 'tracking' && isPolling ? (
            <LoadingSpinner size="small" message="" className="my-0" />
          ) : (
            <View
              className="w-10 h-10 rounded-full items-center justify-center"
              style={{ backgroundColor: cardMeta.color + '20' }}
            >
              <MaterialIcons name={cardMeta.icon} size={22} color={cardMeta.color} />
            </View>
          )}
          <View className="flex-1">
            <Text className="text-[15px] font-semibold text-finance-fence">
              {cardMeta.title}
            </Text>
            <Text className="text-[12px] text-gray-500 mt-0.5" numberOfLines={2}>
              {cardMeta.subtitle}
            </Text>
          </View>
          {!terminal && (
            <>
              <Text className="text-[13px] font-semibold text-finance-fence">
                {formattedAmount}
              </Text>
              <MaterialIcons name="chevron-right" size={24} color="#9CA3AF" />
            </>
          )}
        </TouchableOpacity>

        {terminal && (
          <TouchableOpacity
            onPress={handleDone}
            className="h-[45px] rounded-[30px] bg-finance items-center justify-center mt-4"
          >
            <Text className="text-finance-fence font-semibold text-[15px]">Continue</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <Modal
      visible
      animationType="slide"
      transparent
      statusBarTranslucent
      onRequestClose={handleSheetClose}
    >
      <View
        className="flex-1 justify-end"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      >
        {/* Backdrop — closing the sheet backgrounds the tracker while waiting */}
        <Pressable className="flex-1" onPress={handleSheetClose} />

        {/* Bottom sheet */}
        <View
          className="bg-white rounded-t-[40px] px-9 pt-3"
          style={{ paddingBottom: Math.max(insets.bottom, 20), maxHeight: '90%' }}
        >
          {/* Drag handle */}
          <View className="w-12 h-1.5 rounded-full bg-gray-200 self-center mt-3" />

          {/* Header */}
          <View className="flex-row items-center justify-between mt-4 mb-5">
            <Text className="text-[20px] leading-[22px] font-semibold text-finance-fence">
              {sheetHeader}
            </Text>
            <TouchableOpacity
              onPress={handleSheetClose}
              className="w-[30px] h-[30px] rounded-full bg-brand-light items-center justify-center"
            >
              <MaterialIcons name="close" size={18} color={BRAND_COLOR} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {view.kind === 'tracking' && (
              <View className="items-center gap-6 pb-4">
                <StatusIcon color={PENDING_COLOR} name="hourglass-empty" spinning={isPolling} />

                <View className="items-center gap-1.5">
                  <Text className="text-[20px] font-bold text-finance-fence">Details Submitted</Text>
                  <Text className="text-[16px] font-semibold text-finance-fence">
                    Waiting for Confirmation
                  </Text>
                  <Text className="text-[13px] text-gray-500 text-center">
                    Please wait for up to {MAX_WAIT_SECONDS / 60} minutes.
                  </Text>
                  {confirmationPending && (
                    <Text className="text-[13px] text-gray-500 text-center">
                      This payment was already submitted — do not start another one.
                    </Text>
                  )}
                </View>

                <AmountChip amount={formattedAmount} />

                {isPolling && <Progress elapsed={elapsed} />}

                <View className="w-full gap-3">
                  <TouchableOpacity
                    onPress={handleCancel}
                    className="h-[45px] rounded-[30px] items-center justify-center border border-red-200 bg-red-50"
                  >
                    <Text className="text-red-600 font-semibold text-[15px]">Cancel Payment</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={onBackground}
                    className="h-[45px] rounded-[30px] items-center justify-center bg-finance"
                  >
                    <Text className="text-finance-fence font-semibold text-[15px]">
                      Move to Background
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {view.kind === 'timeout' && (
              <View className="items-center gap-6 pb-4">
                <StatusIcon color={PENDING_COLOR} name="hourglass-empty" />

                <View className="items-center gap-1.5">
                  <Text className="text-xl font-bold text-finance-fence">Still Waiting</Text>
                  <Text className="text-gray-600 text-center">
                    Confirmation is still pending. Do not start another payment.
                  </Text>
                </View>

                <AmountChip amount={formattedAmount} />

                <View className="w-full gap-3">
                  <TouchableOpacity
                    onPress={handleCheckStatus}
                    className="h-[45px] rounded-[30px] items-center justify-center bg-finance"
                  >
                    <Text className="text-finance-fence font-semibold text-[15px]">
                      {isPolling ? 'Checking...' : 'Check Status'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={onBackground}
                    className="h-[45px] rounded-[30px] items-center justify-center border border-brand-light bg-white"
                  >
                    <Text className="text-brand font-semibold text-[15px]">Move to Background</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleCancel}
                    className="h-[45px] rounded-[30px] items-center justify-center border border-red-200 bg-red-50"
                  >
                    <Text className="text-red-600 font-semibold text-[15px]">Cancel Payment</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {view.kind === 'connectionError' && (
              <View className="items-center gap-6 pb-4">
                <StatusIcon color={FAILED_COLOR} name="error" />

                <View className="items-center gap-1.5">
                  <Text className="text-xl font-bold text-finance-fence">Connection Error</Text>
                  <Text className="text-gray-600 text-center">{view.message}</Text>
                </View>

                <AmountChip amount={formattedAmount} />

                <View className="w-full gap-3">
                  <TouchableOpacity
                    onPress={handleCheckStatus}
                    className="h-[45px] rounded-[30px] items-center justify-center bg-finance"
                  >
                    <Text className="text-finance-fence font-semibold text-[15px]">
                      {isPolling ? 'Checking...' : 'Check Status'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={onBackground}
                    className="h-[45px] rounded-[30px] items-center justify-center border border-brand-light bg-white"
                  >
                    <Text className="text-brand font-semibold text-[15px]">Move to Background</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {(view.kind === 'success' || view.kind === 'failed') && (
              <View className="items-center gap-6 pb-4">
                <StatusIcon
                  color={view.kind === 'success' ? SUCCESS_COLOR : FAILED_COLOR}
                  name={view.kind === 'success' ? 'check-circle' : 'cancel'}
                />

                <View className="items-center gap-1.5">
                  <Text className="text-xl font-bold text-finance-fence">
                    {view.kind === 'success' ? 'Payment Successful' : 'Payment Failed'}
                  </Text>
                  <Text className="text-gray-600 text-center">
                    {view.kind === 'success'
                      ? 'Your payment has been processed successfully!'
                      : view.message}
                  </Text>
                </View>

                <AmountChip amount={formattedAmount} />

                <TransactionDetails transactionId={transactionId} status={status} />

                <TouchableOpacity
                  onPress={handleDone}
                  className="h-[45px] rounded-[30px] items-center justify-center bg-finance w-full"
                >
                  <Text className="text-finance-fence font-semibold text-[15px]">Done</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function StatusIcon({
  color,
  name,
  spinning = false,
}: {
  color: string;
  name: React.ComponentProps<typeof MaterialIcons>['name'];
  spinning?: boolean;
}) {
  return (
    <View className="relative">
      <View
        className="w-20 h-20 rounded-full items-center justify-center"
        style={{ backgroundColor: color + '20' }}
      >
        <MaterialIcons name={name} size={40} color={color} />
      </View>
      {spinning && (
        <View className="absolute inset-0">
          <LoadingSpinner size="large" message="" className="my-0" />
        </View>
      )}
    </View>
  );
}

function AmountChip({ amount }: { amount: string }) {
  return (
    <View className="bg-brand-light px-5 py-2.5 rounded-[18px]">
      <Text className="text-[18px] font-bold text-finance-fence">{amount}</Text>
    </View>
  );
}

function Progress({ elapsed }: { elapsed: number }) {
  return (
    <View className="w-full">
      <View className="flex-row justify-between items-center mb-2">
        <Text className="text-xs text-gray-500">
          Processing... {Math.floor(elapsed / 60)}:{(elapsed % 60).toString().padStart(2, '0')}
        </Text>
        <Text className="text-xs text-gray-500">Up to {MAX_WAIT_SECONDS / 60} min</Text>
      </View>
      <View className="w-full bg-gray-200 rounded-full h-2">
        <View
          className="bg-brand h-2 rounded-full"
          style={{ width: `${Math.min((elapsed / MAX_WAIT_SECONDS) * 100, 95)}%` }}
        />
      </View>
      {elapsed > 90 && (
        <Text className="text-xs text-amber-600 mt-1 text-center">
          Payment taking longer than usual...
        </Text>
      )}
    </View>
  );
}

function TransactionDetails({
  transactionId,
  status,
}: {
  transactionId: string;
  status: PaymentStatusResponse | null;
}) {
  if (!status) return null;
  return (
    <View className="w-full gap-2">
      <View className="flex-row justify-between items-center py-1">
        <Text className="text-gray-600 text-sm">Transaction ID:</Text>
        <Text className="text-gray-800 text-sm font-mono">
          {transactionId.substring(0, 8)}...
        </Text>
      </View>

      {status.gatewayReference && (
        <View className="flex-row justify-between items-center py-1">
          <Text className="text-gray-600 text-sm">Gateway Ref:</Text>
          <Text className="text-gray-800 text-sm font-mono">{status.gatewayReference}</Text>
        </View>
      )}

      {status.mnoReference && (
        <View className="flex-row justify-between items-center py-1">
          <Text className="text-gray-600 text-sm">MNO Ref:</Text>
          <Text className="text-gray-800 text-sm font-mono">{status.mnoReference}</Text>
        </View>
      )}

      {status.processedAt && (
        <View className="flex-row justify-between items-center py-1">
          <Text className="text-gray-600 text-sm">Processed:</Text>
          <Text className="text-gray-800 text-sm">
            {new Date(status.processedAt).toLocaleTimeString()}
          </Text>
        </View>
      )}
    </View>
  );
}
