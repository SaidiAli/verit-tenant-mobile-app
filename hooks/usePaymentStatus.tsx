import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { paymentApi } from '../lib/api';
import { PaymentStatusResponse } from '../types';

interface UsePaymentStatusOptions {
  transactionId: string;
  onSuccess?: (status: PaymentStatusResponse) => void;
  onFailed?: (status: PaymentStatusResponse) => void;
  onError?: (error: string) => void;
  pollingInterval?: number; // in milliseconds
  maxPollingDuration?: number; // in milliseconds
}

interface UsePaymentStatusReturn {
  status: PaymentStatusResponse | null;
  isPolling: boolean;
  error: string | null;
  startPolling: () => void;
  stopPolling: () => void;
  refetch: () => Promise<void>;
}

export function usePaymentStatus({
  transactionId,
  onSuccess,
  onFailed,
  onError,
  pollingInterval = 5000, // 5 seconds
  maxPollingDuration = 180000, // 3 minutes
}: UsePaymentStatusOptions): UsePaymentStatusReturn {
  const [isPolling, setIsPolling] = useState(false);
  const [timeoutError, setTimeoutError] = useState<string | null>(null);

  // Use refs to store callbacks to avoid dependency issues
  const onSuccessRef = useRef(onSuccess);
  const onFailedRef = useRef(onFailed);
  const onErrorRef = useRef(onError);

  useEffect(() => { onSuccessRef.current = onSuccess; }, [onSuccess]);
  useEffect(() => { onFailedRef.current = onFailed; }, [onFailed]);
  useEffect(() => { onErrorRef.current = onError; }, [onError]);

  const { data: status, error: queryErr, refetch: queryRefetch } = useQuery({
    queryKey: ['payment-status', transactionId],
    queryFn: () => paymentApi.getStatus(transactionId),
    enabled: isPolling && !!transactionId,
    // In TanStack Query v4 the refetchInterval callback receives (data, query)
    refetchInterval: (data: PaymentStatusResponse | undefined) => {
      if (data?.paymentStatus === 'completed' || data?.paymentStatus === 'failed' || !isPolling) return false;
      return pollingInterval;
    },
    retry: false,
  });

  // Fire success/failed callbacks when status changes
  useEffect(() => {
    if (status?.paymentStatus === 'completed') {
      onSuccessRef.current?.(status);
      setIsPolling(false);
    } else if (status?.paymentStatus === 'failed') {
      onFailedRef.current?.(status);
      setIsPolling(false);
    }
  }, [status?.paymentStatus]);

  // Surface query errors to the onError callback
  useEffect(() => {
    if (queryErr) {
      const errorMessage = (queryErr as Error).message || 'Failed to get payment status';
      onErrorRef.current?.(errorMessage);
    }
  }, [queryErr]);

  // Timeout after maxPollingDuration
  useEffect(() => {
    if (!isPolling) return;
    setTimeoutError(null);
    const timer = setTimeout(() => {
      const msg = 'Payment processing timed out. Please check your payment status manually.';
      setTimeoutError(msg);
      onErrorRef.current?.(msg);
      setIsPolling(false);
    }, maxPollingDuration);
    return () => clearTimeout(timer);
  }, [isPolling, maxPollingDuration]);

  const startPolling = useCallback(() => {
    if (isPolling || !transactionId) return;
    setTimeoutError(null);
    setIsPolling(true);
  }, [isPolling, transactionId]);

  const stopPolling = useCallback(() => {
    setIsPolling(false);
    setTimeoutError(null);
  }, []);

  const refetch = useCallback(async () => {
    if (!transactionId) {
      throw new Error('No transaction ID provided');
    }
    await queryRefetch();
  }, [transactionId, queryRefetch]);

  const error = timeoutError || (queryErr ? (queryErr as Error).message || 'Failed to get payment status' : null);

  return {
    status: status ?? null,
    isPolling,
    error,
    startPolling,
    stopPolling,
    refetch,
  };
}
