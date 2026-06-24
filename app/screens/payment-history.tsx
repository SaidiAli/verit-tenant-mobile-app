import React, { useState, useCallback } from 'react';
import { ScrollView, View, Text, TouchableOpacity, RefreshControl } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { Card } from '../../components/ui/Card';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { StatusBadge, getPaymentStatusBadge } from '../../components/ui/StatusBadge';
import { PaymentReceiptModal } from '../../components/ui/PaymentReceiptModal';
import { ErrorView } from '../../components/ui/ErrorView';
import { useLease } from '../../hooks/LeaseContext';
import { paymentApi } from '../../lib/api';
import { formatUGX } from '../../lib/currency';
import { SafeAreaWrapper } from '../../components/ui/SafeAreaWrapper';
import { formatDateShort } from '@/lib/utils';
import { PAYMENT_TYPE_LABELS } from '../../types';

export default function PaymentHistoryScreen() {
  const { selectedLeaseId } = useLease();
  const [selectedReceiptPaymentId, setSelectedReceiptPaymentId] = useState<string | null>(null);

  const { data: payments = [], isLoading, isRefetching, error, refetch } = useQuery({
    queryKey: ['payment-history', selectedLeaseId],
    queryFn: () => paymentApi.getHistory(selectedLeaseId!),
    enabled: !!selectedLeaseId,
  });

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  if (isLoading) {
    return <LoadingSpinner message="Loading payment history..." />;
  }

  if (!selectedLeaseId && !isLoading) {
    return (
      <ErrorView
        title="No Active Lease Found"
        message="You don't have an active lease. Please contact your landlord."
        icon="home"
        iconColor="#6B7280"
      />
    );
  }

  if (error && payments.length === 0) {
    return (
      <ErrorView
        title="Unable to Load Payment History"
        message={(error as any).message || 'Failed to load payment history'}
        onRetry={() => refetch()}
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
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
          }
        >
          <View className="px-4 pt-6 pb-4">
            {/* Header */}
            <Text className="text-2xl font-semibold text-gray-800 mb-6">
              Payment History
            </Text>

            {/* Payment List */}
            <Card className="mb-6">
              <View className="space-y-3">
                {payments.length === 0 ? (
                  <View className="items-center py-8">
                    <MaterialIcons name="receipt" size={48} color="#9CA3AF" />
                    <Text className="text-gray-500 mt-2">No payments yet</Text>
                    <Text className="text-gray-400 text-sm mt-1 text-center">
                      Your payment history will appear here once you make your first payment.
                    </Text>
                  </View>
                ) : (
                  <View className="space-y-0">
                    {payments.map((paymentData, index) => {
                      const payment = paymentData.payment;
                      const isLate = payment.paidDate && payment.dueDate &&
                        new Date(payment.paidDate) > new Date(payment.dueDate);

                      return (
                        <TouchableOpacity
                          key={payment.id}
                          className="py-4 rounded-md"
                          onPress={() => {
                            if (payment.status === 'completed') {
                              setSelectedReceiptPaymentId(payment.id);
                            }
                          }}
                        >
                          <View className="space-y-2">
                            <View className="flex-row justify-between items-start">
                              <View className="flex-1 space-y-1">
                                <Text className="font-medium text-gray-800">
                                  {PAYMENT_TYPE_LABELS[payment.paymentType ?? 'rent']} {payment.dueDate ? `(${formatDateShort(payment.dueDate)})` : ''}
                                </Text>
                                {payment.paymentType && payment.paymentType !== 'rent' && (
                                  <View className="mt-1 self-start rounded-full bg-blue-100 px-2 py-0.5">
                                    <Text className="text-xs text-blue-700">
                                      {PAYMENT_TYPE_LABELS[payment.paymentType]}
                                    </Text>
                                  </View>
                                )}
                                <Text className="text-sm text-gray-600">
                                  {payment.periodCovered ? (
                                    <Text>Period: {payment.periodCovered}</Text>
                                  ) : (
                                    payment.dueDate && (
                                      <Text>Period: {formatDateShort(payment.dueDate)}</Text>
                                    )
                                  )}
                                </Text>
                                <Text className="text-sm text-gray-600">
                                  {payment.paidDate && (
                                    <Text>
                                      {'Paid: '}
                                      {formatDateShort(payment.paidDate)}
                                    </Text>
                                  )}
                                </Text>
                                {payment.gateway && (
                                  <Text className="text-xs text-gray-400">
                                    via {payment.gateway === 'yo' ? 'Yo! Payments' : 'IoTec'}
                                  </Text>
                                )}
                                {isLate && (
                                  <Text className="text-sm text-yellow-600 font-medium">
                                    Late Payment
                                  </Text>
                                )}
                                {payment.status === 'completed' && (
                                  <Text className="text-xs text-brand font-medium">
                                    Tap to view receipt
                                  </Text>
                                )}
                              </View>

                              <View className="items-end space-y-1">
                                <Text className="text-lg font-bold text-gray-800">
                                  {formatUGX(typeof payment.amount === 'string' ? parseFloat(payment.amount) : payment.amount)}
                                </Text>
                                <StatusBadge {...getPaymentStatusBadge(payment.status)} />
                              </View>
                            </View>
                          </View>

                          {index < payments.length - 1 && (
                            <View className="border-t border-gray-200 mt-4" />
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>
            </Card>
          </View>
        </ScrollView>

        {/* Payment Receipt Modal */}
        {selectedReceiptPaymentId && (
          <PaymentReceiptModal
            visible={!!selectedReceiptPaymentId}
            onClose={() => setSelectedReceiptPaymentId(null)}
            paymentId={selectedReceiptPaymentId}
          />
        )}
      </View>
    </SafeAreaWrapper>
  );
}
