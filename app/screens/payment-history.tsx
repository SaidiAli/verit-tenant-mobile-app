import { BRAND_COLOR } from '@/constants/theme';
import { useAuth } from '../../hooks/useAuth';
import { tenantKeys } from '../../lib/queryKeys';
import React, { useState, useCallback, useMemo } from 'react';
import { ScrollView, View, Text, TouchableOpacity, RefreshControl } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router/react-navigation';
import { useQuery } from '@tanstack/react-query';
import { Card } from '../../components/ui/Card';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { PaymentReceiptModal } from '../../components/ui/PaymentReceiptModal';
import { ErrorView } from '../../components/ui/ErrorView';
import { useLease } from '../../hooks/LeaseContext';
import { paymentApi } from '../../lib/api';
import { formatMoney } from '../../lib/currency';
import { SafeAreaWrapper } from '../../components/ui/SafeAreaWrapper';
import { formatDateShort } from '@/lib/utils';
import { Currency, Payment, PAYMENT_TYPE_LABELS, PaymentWithDetails } from '../../types';

type PaymentStatus = Payment['status'];

const getStatusBadgeConfig = (status: PaymentStatus) => {
  switch (status) {
    case 'completed':
      return { label: 'Completed', bgColor: 'bg-green-100', textColor: 'text-green-800' };
    case 'pending':
    case 'processing':
      return { label: 'Pending', bgColor: 'bg-yellow-100', textColor: 'text-yellow-800' };
    case 'failed':
      return { label: 'Failed', bgColor: 'bg-red-100', textColor: 'text-red-800' };
    case 'refunded':
      return { label: 'Refunded', bgColor: 'bg-blue-100', textColor: 'text-blue-800' };
    default:
      return { label: status, bgColor: 'bg-gray-100', textColor: 'text-gray-800' };
  }
};

const StatusBadge = ({ status }: { status: PaymentStatus }) => {
  const config = getStatusBadgeConfig(status);
  return (
    <View className={`px-2 py-1 rounded-full ${config.bgColor}`}>
      <Text className={`text-xs font-medium ${config.textColor}`}>
        {config.label}
      </Text>
    </View>
  );
};

export default function PaymentHistoryScreen() {
  const { user } = useAuth();
  const { selectedLeaseId } = useLease();
  const [selectedReceiptPaymentId, setSelectedReceiptPaymentId] = useState<string | null>(null);
  const [showHistorical, setShowHistorical] = useState(false);

  const { data: payments = [], isLoading, isRefetching, error, refetch } = useQuery({
    queryKey: tenantKeys.query(user?.id, 'payment-history', selectedLeaseId),
    queryFn: ({ signal }) => paymentApi.getHistory(selectedLeaseId!, signal),
    enabled: !!selectedLeaseId,
  });

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  const currentYear = useMemo(() => new Date().getFullYear().toString(), []);

  const { currentYearPayments, historicalPayments, totalPaidByCurrency, pendingCount, latestPaymentDate } = useMemo(() => {
    const current: PaymentWithDetails[] = [];
    const historical: PaymentWithDetails[] = [];
    const totals = new Map<Currency, number>();
    let pendingCnt = 0;
    let latestDate: string | null = null;

    for (const item of payments) {
      const p = item.payment;
      const dateStr = p.paidDate || p.createdAt || p.dueDate;
      const year = dateStr ? new Date(dateStr).getFullYear().toString() : currentYear;

      if (year === currentYear) {
        current.push(item);
      } else {
        historical.push(item);
      }

      if (p.status === 'completed') {
        const currency: Currency = p.currency === 'USD' ? 'USD' : 'UGX';
        const numAmount = typeof p.amount === 'string' ? parseFloat(p.amount) : p.amount;
        totals.set(currency, (totals.get(currency) ?? 0) + (isNaN(numAmount) ? 0 : numAmount));
      }

      if (p.status === 'pending' || p.status === 'processing') {
        pendingCnt++;
      }

      if (p.paidDate && (!latestDate || new Date(p.paidDate) > new Date(latestDate))) {
        latestDate = p.paidDate;
      }
    }

    const totalPaid = [...totals.entries()]
      .filter(([, amount]) => amount > 0)
      .map(([currency, amount]) => ({ currency, amount }));

    return {
      currentYearPayments: current,
      historicalPayments: historical,
      totalPaidByCurrency: totalPaid,
      pendingCount: pendingCnt,
      latestPaymentDate: latestDate,
    };
  }, [payments, currentYear]);

  // Group historical by year
  const historicalByYear = useMemo(() => {
    const grouped: Record<string, PaymentWithDetails[]> = {};
    for (const item of historicalPayments) {
      const dateStr = item.payment.paidDate || item.payment.createdAt || item.payment.dueDate;
      const year = dateStr ? new Date(dateStr).getFullYear().toString() : 'Earlier';
      if (!grouped[year]) grouped[year] = [];
      grouped[year].push(item);
    }
    return Object.entries(grouped).sort(([a], [b]) => parseInt(b) - parseInt(a));
  }, [historicalPayments]);

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

  const renderPaymentItem = (paymentData: PaymentWithDetails, index: number, arr: PaymentWithDetails[]) => {
    const payment = paymentData.payment;
    const isLate = payment.paidDate && payment.dueDate &&
      new Date(payment.paidDate) > new Date(payment.dueDate);
    const amountVal = typeof payment.amount === 'string' ? parseFloat(payment.amount) : payment.amount;
    const isClickable = payment.status === 'completed';

    const content = (
      <View className="space-y-2">
        <View className="flex-row justify-between items-center">
          <View className="flex-row items-center gap-2 flex-1 pr-2">
            <Text className="font-medium text-gray-800" numberOfLines={1}>
              {PAYMENT_TYPE_LABELS[payment.paymentType ?? 'rent']} {payment.dueDate ? `(${formatDateShort(payment.dueDate)})` : ''}
            </Text>
            {payment.paymentType && payment.paymentType !== 'rent' && (
              <View className="rounded-full bg-blue-100 px-2 py-0.5">
                <Text className="text-xs text-blue-700">
                  {PAYMENT_TYPE_LABELS[payment.paymentType]}
                </Text>
              </View>
            )}
          </View>
          <StatusBadge status={payment.status} />
        </View>

        {payment.paidDate ? (
          <View className="flex-row items-center gap-2">
            <MaterialIcons name="event" size={16} color="#6B7280" />
            <Text className="text-sm text-gray-600">
              Paid: {formatDateShort(payment.paidDate)}
            </Text>
            {isLate && (
              <View className="rounded-full bg-yellow-100 px-2 py-0.5">
                <Text className="text-xs font-medium text-yellow-800">Late Payment</Text>
              </View>
            )}
          </View>
        ) : payment.dueDate ? (
          <View className="flex-row items-center gap-2">
            <MaterialIcons name="event" size={16} color="#6B7280" />
            <Text className="text-sm text-gray-600">
              Due: {formatDateShort(payment.dueDate)}
            </Text>
          </View>
        ) : null}

        <View className="flex-row justify-between items-center">
          <Text className="text-gray-600">Amount</Text>
          <Text className="text-lg font-bold text-gray-800">
            {formatMoney(amountVal, payment.currency)}
          </Text>
        </View>

        {(payment.periodCovered || payment.dueDate) && (
          <View className="flex-row items-center gap-2">
            <MaterialIcons name="date-range" size={16} color="#6B7280" />
            <Text className="text-sm text-gray-600">
              Period: {payment.periodCovered || (payment.dueDate ? formatDateShort(payment.dueDate) : '')}
            </Text>
          </View>
        )}

        <View className="flex-row justify-between items-center pt-1">
          {payment.gateway ? (
            <Text className="text-xs text-gray-400">
              via {payment.gateway === 'yo' ? 'Yo! Payments' : 'IoTec'}
            </Text>
          ) : <View />}

          {isClickable && (
            <View className="flex-row items-center gap-1">
              <MaterialIcons name="receipt" size={14} color={BRAND_COLOR} />
              <Text className="text-xs text-brand font-medium">
                Tap to view receipt
              </Text>
            </View>
          )}
        </View>
      </View>
    );

    return (
      <View key={payment.id} className="py-4">
        {isClickable ? (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={`View receipt for ${PAYMENT_TYPE_LABELS[payment.paymentType ?? 'rent']} payment`}
            onPress={() => setSelectedReceiptPaymentId(payment.id)}
          >
            {content}
          </TouchableOpacity>
        ) : (
          content
        )}
        {index < arr.length - 1 && (
          <View className="border-t border-gray-200 mt-4" />
        )}
      </View>
    );
  };

  return (
    <SafeAreaWrapper>
      <View className="flex-1 bg-gray-50">
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={() => { void refetch(); }} />
          }
        >
          <View className="px-4 pt-6 pb-4">
            {/* Header */}
            <Text className="text-2xl font-semibold text-gray-800 mb-6">
              Payment History
            </Text>

            {/* Payment Summary */}
            <Card className="mb-4">
              <View className="space-y-3">
                <Text className="text-lg font-semibold text-gray-800 mb-2">
                  Payment Summary
                </Text>
                {totalPaidByCurrency.map(({ currency, amount }) => (
                  <View key={`total-${currency}`} className="flex-row justify-between items-center">
                    <View className="flex-row items-center gap-2">
                      <MaterialIcons name="check-circle" size={18} color="#16A34A" />
                      <Text className="text-gray-700">
                        Total Paid{totalPaidByCurrency.length > 1 ? ` (${currency})` : ''}
                      </Text>
                    </View>
                    <Text className="font-semibold text-gray-800">
                      {formatMoney(amount, currency)}
                    </Text>
                  </View>
                ))}
                <View className="flex-row justify-between items-center">
                  <View className="flex-row items-center gap-2">
                    <MaterialIcons name="receipt" size={18} color="#6B7280" />
                    <Text className="text-gray-600">Total Transactions</Text>
                  </View>
                  <Text className="font-semibold text-gray-800">{payments.length}</Text>
                </View>
                {pendingCount > 0 && (
                  <View className="flex-row justify-between items-center">
                    <View className="flex-row items-center gap-2">
                      <MaterialIcons name="hourglass-empty" size={18} color="#F59E0B" />
                      <Text className="text-yellow-600">Pending Transactions</Text>
                    </View>
                    <Text className="font-semibold text-yellow-600">{pendingCount}</Text>
                  </View>
                )}
                {latestPaymentDate && (
                  <View className="flex-row justify-between items-center">
                    <View className="flex-row items-center gap-2">
                      <MaterialIcons name="event" size={18} color="#6B7280" />
                      <Text className="text-gray-600">Latest Payment</Text>
                    </View>
                    <Text className="font-semibold text-gray-800">
                      {formatDateShort(latestPaymentDate)}
                    </Text>
                  </View>
                )}
                {payments.length === 0 && (
                  <Text className="text-gray-500 text-center py-2">
                    No payments recorded yet
                  </Text>
                )}
              </View>
            </Card>

            {/* Historical Payments - Grouped by Year */}
            {historicalPayments.length > 0 && (
              <Card className="mb-4">
                <View className="space-y-3">
                  <TouchableOpacity
                    onPress={() => setShowHistorical(!showHistorical)}
                    className="flex-row justify-between items-center"
                  >
                    <View>
                      <Text className="text-lg font-semibold text-gray-800">
                        Historical Payments
                      </Text>
                      <Text className="text-sm text-gray-500">
                        {historicalPayments.length} payment{historicalPayments.length > 1 ? 's' : ''} from previous years
                      </Text>
                    </View>
                    <MaterialIcons
                      name={showHistorical ? 'expand-less' : 'expand-more'}
                      size={24}
                      color="#6B7280"
                    />
                  </TouchableOpacity>
                  {showHistorical && (
                    <View className="space-y-0">
                      {historicalByYear.map(([year, yearItems]) => (
                        <View key={year} className="mt-2">
                          <View className="bg-gray-100 px-3 py-2 rounded-md mb-2">
                            <Text className="font-semibold text-gray-700">{year}</Text>
                          </View>
                          {yearItems.map((item, idx) => renderPaymentItem(item, idx, yearItems))}
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              </Card>
            )}

            {/* Current Payments List */}
            <Card className="mb-6">
              <View className="space-y-3">
                <Text className="text-lg font-semibold text-gray-800 mb-2">
                  {historicalPayments.length > 0 ? `Payments (${currentYear})` : 'All Payments'}
                </Text>
                {currentYearPayments.length === 0 ? (
                  <View className="items-center py-8">
                    <MaterialIcons name="receipt" size={48} color="#9CA3AF" />
                    <Text className="text-gray-500 mt-2">No payments yet</Text>
                    <Text className="text-gray-400 text-sm mt-1 text-center">
                      Your payment history will appear here once you make your first payment.
                    </Text>
                  </View>
                ) : (
                  <View className="space-y-0">
                    {currentYearPayments.map((paymentData, index) =>
                      renderPaymentItem(paymentData, index, currentYearPayments)
                    )}
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
