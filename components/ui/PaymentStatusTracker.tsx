import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, Animated } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Card } from './Card';
import { LoadingSpinner } from './LoadingSpinner';
import { usePaymentStatus } from '../../hooks/usePaymentStatus';
import { PaymentStatusResponse } from '../../types';
import { formatUGX } from '../../lib/currency';

interface PaymentStatusTrackerProps {
  transactionId: string;
  amount: number;
  onSuccess: (status: PaymentStatusResponse) => void;
  onFailed: (status: PaymentStatusResponse) => void;
  onTimeout: () => void;
  className?: string;
}

export function PaymentStatusTracker({
  transactionId,
  amount,
  onSuccess,
  onFailed,
  onTimeout,
  className = ''
}: PaymentStatusTrackerProps) {
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const [elapsed, setElapsed] = React.useState(0);
  const timerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  const { status, isPolling, error, startPolling, stopPolling } = usePaymentStatus({
    transactionId,
    onSuccess,
    onFailed,
    onError: (error) => {
      if (error.includes('timeout') || error.includes('timed out')) {
        onTimeout();
      }
    },
    pollingInterval: 5000,
    maxPollingDuration: 120000,
  });

  useEffect(() => {
    if (transactionId) {
      startPolling();
      setElapsed(0);

      // Start elapsed time counter
      timerRef.current = setInterval(() => {
        setElapsed(prev => prev + 1);
      }, 1000);

      // Fade in animation
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }

    return () => {
      stopPolling();
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [transactionId, startPolling, stopPolling, fadeAnim]);

  // Stop timer when polling stops
  useEffect(() => {
    if (!isPolling && timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, [isPolling]);

  const getStatusInfo = () => {
    if (error) {
      return {
        icon: 'error' as const,
        color: '#EF4444',
        title: 'Connection Error',
        message: error,
        showRetry: true,
      };
    }

    if (!status || status.paymentStatus === 'pending') {
      const message = elapsed > 30
        ? 'Payment is taking longer than usual. Please keep this screen open.'
        : 'Please complete the payment on your mobile device and wait...';

      return {
        icon: 'hourglass-empty' as const,
        color: '#F59E0B',
        title: 'Processing Payment',
        message,
        showRetry: false,
      };
    }

    if (status.paymentStatus === 'completed') {
      return {
        icon: 'check-circle' as const,
        color: '#10B981',
        title: 'Payment Successful',
        message: 'Your payment has been processed successfully!',
        showRetry: false,
      };
    }

    if (status.paymentStatus === 'failed') {
      return {
        icon: 'cancel' as const,
        color: '#EF4444',
        title: 'Payment Failed',
        message: status.message || 'Your payment could not be processed.',
        showRetry: true,
      };
    }

    return {
      icon: 'help' as const,
      color: '#6B7280',
      title: 'Unknown Status',
      message: 'Unable to determine payment status.',
      showRetry: true,
    };
  };

  const statusInfo = getStatusInfo();

  const handleRetry = () => {
    if (!isPolling) {
      startPolling();
    }
  };

  return (
    <Animated.View
      style={{ opacity: fadeAnim }}
      className={`${className}`}
    >
      <Card>
        <View className="items-center space-y-6 py-4">
          {/* Status Icon */}
          <View className="relative">
            <View
              className="w-20 h-20 rounded-full items-center justify-center"
              style={{ backgroundColor: statusInfo.color + '20' }}
            >
              <MaterialIcons
                name={statusInfo.icon}
                size={40}
                color={statusInfo.color}
              />
            </View>

            {/* Pulsing animation for pending status */}
            {status?.paymentStatus === 'pending' && isPolling && (
              <View className="absolute inset-0">
                <LoadingSpinner size="large" message="" className="my-0" />
              </View>
            )}
          </View>

          {/* Status Text */}
          <View className="items-center space-y-2">
            <Text className="text-xl font-bold text-gray-800">
              {statusInfo.title}
            </Text>
            <Text className="text-gray-600 text-center">
              {statusInfo.message}
            </Text>
          </View>

          {/* Amount */}
          <View className="bg-gray-50 px-4 py-2 rounded-md">
            <Text className="text-lg font-semibold text-gray-800">
              {formatUGX(amount)}
            </Text>
          </View>

          {/* Transaction Details */}
          {status && (
            <View className="w-full space-y-2">
              <View className="flex-row justify-between items-center py-1">
                <Text className="text-gray-600 text-sm">Transaction ID:</Text>
                <Text className="text-gray-800 text-sm font-mono">
                  {transactionId.substring(0, 8)}...
                </Text>
              </View>

              {status.gatewayReference && (
                <View className="flex-row justify-between items-center py-1">
                  <Text className="text-gray-600 text-sm">Gateway Ref:</Text>
                  <Text className="text-gray-800 text-sm font-mono">
                    {status.gatewayReference}
                  </Text>
                </View>
              )}

              {status.mnoReference && (
                <View className="flex-row justify-between items-center py-1">
                  <Text className="text-gray-600 text-sm">MNO Ref:</Text>
                  <Text className="text-gray-800 text-sm font-mono">
                    {status.mnoReference}
                  </Text>
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
          )}

          {/* Retry Button */}
          {statusInfo.showRetry && (
            <TouchableOpacity
              onPress={handleRetry}
              disabled={isPolling}
              className={`px-6 py-2 rounded-md border ${isPolling
                  ? 'border-gray-300 bg-gray-100'
                  : 'border-[#524768] bg-white active:bg-[#524768]/10'
                }`}
            >
              <Text
                className={`font-medium ${isPolling ? 'text-gray-400' : 'text-[#524768]'
                  }`}
              >
                {isPolling ? 'Checking...' : 'Check Status'}
              </Text>
            </TouchableOpacity>
          )}

          {/* Progress Indicator */}
          {isPolling && !error && (
            <View className="w-full">
              <View className="flex-row justify-between items-center mb-2">
                <Text className="text-xs text-gray-500">
                  Processing... {Math.floor(elapsed / 60)}:{(elapsed % 60).toString().padStart(2, '0')}
                </Text>
                <Text className="text-xs text-gray-500">Up to 2 min</Text>
              </View>
              <View className="w-full bg-gray-200 rounded-full h-2">
                <View
                  className="bg-[#524768] h-2 rounded-full transition-all duration-1000"
                  style={{
                    width: `${Math.min((elapsed / 120) * 100, 95)}%` // 120 seconds = 2 minutes
                  }}
                />
              </View>
              {elapsed > 90 && (
                <Text className="text-xs text-amber-600 mt-1 text-center">
                  Payment taking longer than usual...
                </Text>
              )}
            </View>
          )}
        </View>
      </Card>
    </Animated.View>
  );
}