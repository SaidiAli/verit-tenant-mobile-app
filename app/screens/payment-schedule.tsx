import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, View, Text, RefreshControl, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { Card } from '../../components/ui/Card';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ErrorView } from '../../components/ui/ErrorView';
import { useLease } from '../../hooks/LeaseContext';
import { paymentApi } from '../../lib/api';
import { PaymentScheduleItem } from '../../types';
import { formatUGX } from '../../lib/currency';
import { SafeAreaWrapper } from '../../components/ui/SafeAreaWrapper';
import { formatDateShort } from '@/lib/utils';

type ScheduleStatus = PaymentScheduleItem['status'];

const getStatusBadgeConfig = (status: ScheduleStatus) => {
  switch (status) {
    case 'upcoming':
      return { label: 'Upcoming', bgColor: 'bg-blue-100', textColor: 'text-blue-800' };
    case 'pending':
      return { label: 'Pending', bgColor: 'bg-yellow-100', textColor: 'text-yellow-800' };
    case 'overdue':
      return { label: 'Overdue', bgColor: 'bg-red-100', textColor: 'text-red-800' };
    case 'paid':
      return { label: 'Paid', bgColor: 'bg-green-100', textColor: 'text-green-800' };
    case 'partial':
      return { label: 'Partial', bgColor: 'bg-yellow-100', textColor: 'text-yellow-800' };
    default:
      return { label: status, bgColor: 'bg-gray-100', textColor: 'text-gray-800' };
  }
};

const StatusBadge = ({ status }: { status: ScheduleStatus }) => {
  const config = getStatusBadgeConfig(status);
  return (
    <View className={`px-2 py-1 rounded-full ${config.bgColor}`}>
      <Text className={`text-xs font-medium ${config.textColor}`}>
        {config.label}
      </Text>
    </View>
  );
};

export default function PaymentScheduleScreen() {
  const { selectedLeaseId } = useLease();
  const [showHistorical, setShowHistorical] = useState(false);

  const { data: schedule = [], isLoading, isRefetching, error, refetch } = useQuery({
    queryKey: ['payment-schedule', selectedLeaseId],
    queryFn: () => paymentApi.getSchedule(selectedLeaseId!),
    enabled: !!selectedLeaseId,
  });

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  const currentMonthStart = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }, []);

  const {
    historicalSchedules,
    currentAndFutureSchedules,
    arrearsAmount,
    currentDueAmount,
    overdueCount,
    nextDueItem,
    hasBackdatedLease,
  } = useMemo(() => {
    const historical: PaymentScheduleItem[] = [];
    const currentFuture: PaymentScheduleItem[] = [];
    let arrears = 0;
    let currentDue = 0;
    let overdueCnt = 0;

    for (const item of schedule) {
      const periodEnd = new Date(item.periodEnd);
      const isOutstanding =
        item.status === 'overdue' || item.status === 'pending' || item.status === 'partial';
      if (periodEnd < currentMonthStart) {
        historical.push(item);
        if (isOutstanding) {
          arrears += item.amount - item.paidAmount;
        }
      } else {
        currentFuture.push(item);
        if (isOutstanding) {
          currentDue += item.amount - item.paidAmount;
        }
      }
      if (item.status === 'overdue') {
        overdueCnt++;
      }
    }

    const nextDue = currentFuture.find(item => item.status === 'pending' || item.status === 'upcoming');
    const hasBackdated = historical.length > 3;

    return {
      historicalSchedules: historical,
      currentAndFutureSchedules: currentFuture,
      arrearsAmount: arrears,
      currentDueAmount: currentDue,
      overdueCount: overdueCnt,
      nextDueItem: nextDue,
      hasBackdatedLease: hasBackdated,
    };
  }, [schedule, currentMonthStart]);

  // Group historical by year
  const historicalByYear = useMemo(() => {
    const grouped: Record<string, PaymentScheduleItem[]> = {};
    for (const item of historicalSchedules) {
      const year = new Date(item.periodStart).getFullYear().toString();
      if (!grouped[year]) grouped[year] = [];
      grouped[year].push(item);
    }
    return Object.entries(grouped).sort(([a], [b]) => parseInt(b) - parseInt(a));
  }, [historicalSchedules]);

  if (isLoading) {
    return <LoadingSpinner message="Loading payment schedule..." />;
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

  if (error) {
    return (
      <ErrorView
        title="Unable to Load Payment Schedule"
        message={(error as any).message || 'Failed to load payment schedule'}
        onRetry={() => refetch()}
      >
        <Text className="text-xs text-gray-500 mt-2 text-center">
          Check your internet connection and try again
        </Text>
      </ErrorView>
    );
  }

  const renderScheduleItem = (item: PaymentScheduleItem, index: number, arr: PaymentScheduleItem[]) => {
    const progressPercent = item.amount > 0
      ? Math.min((item.paidAmount / item.amount) * 100, 100)
      : 0;

    return (
      <View key={item.id} className="py-4">
        <View className="space-y-2">
          <View className="flex-row justify-between items-center">
            <Text className="font-medium text-gray-800">
              Payment #{item.paymentNumber}
            </Text>
            <StatusBadge status={item.status} />
          </View>
          <View className="flex-row items-center gap-2">
            <MaterialIcons name="event" size={16} color="#6B7280" />
            <Text className="text-sm text-gray-600">
              Due: {formatDateShort(item.dueDate)}
            </Text>
          </View>
          <View className="flex-row justify-between items-center">
            <Text className="text-gray-600">Amount</Text>
            <Text className="text-lg font-bold text-gray-800">
              {formatUGX(item.paidAmount < item.amount ? item.amount - item.paidAmount : item.amount)}
            </Text>
          </View>
          <View className="flex-row items-center gap-2">
            <MaterialIcons name="date-range" size={16} color="#6B7280" />
            <Text className="text-sm text-gray-600">
              Period: {formatDateShort(item.periodStart)} - {formatDateShort(item.periodEnd)}
            </Text>
          </View>
          {item.status === 'partial' && (
            <View className="mt-2">
              <View className="flex-row justify-between items-center mb-1">
                <Text className="text-xs text-gray-500">
                  Paid: {formatUGX(item.paidAmount)}
                </Text>
                <Text className="text-xs text-gray-500">
                  {Math.round(progressPercent)}%
                </Text>
              </View>
              <View className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <View
                  className="h-full bg-yellow-500 rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </View>
            </View>
          )}
        </View>
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
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
          }
        >
          <View className="px-4 pt-6 pb-4">
            {/* Header */}
            <Text className="text-2xl font-semibold text-gray-800 mb-6">
              Payment Schedule
            </Text>

            {/* Arrears vs Current Due Split */}
            <Card className="mb-4">
              <View className="space-y-3">
                <Text className="text-lg font-semibold text-gray-800 mb-2">
                  Balance Breakdown
                </Text>
                {arrearsAmount > 0 && (
                  <View className="flex-row justify-between items-center">
                    <View className="flex-row items-center gap-2">
                      <MaterialIcons name="history" size={18} color="#EF4444" />
                      <Text className="text-red-600">Historical Arrears</Text>
                    </View>
                    <Text className="font-semibold text-red-600">{formatUGX(arrearsAmount)}</Text>
                  </View>
                )}
                {currentDueAmount > 0 && (
                  <View className="flex-row justify-between items-center">
                    <View className="flex-row items-center gap-2">
                      <MaterialIcons name="event" size={18} color="#F59E0B" />
                      <Text className="text-yellow-600">Current Due</Text>
                    </View>
                    <Text className="font-semibold text-yellow-600">{formatUGX(currentDueAmount)}</Text>
                  </View>
                )}
                {overdueCount > 0 && (
                  <View className="flex-row justify-between items-center">
                    <Text className="text-gray-600">Overdue Periods</Text>
                    <Text className="font-semibold text-red-600">{overdueCount}</Text>
                  </View>
                )}
                {nextDueItem && (
                  <View className="flex-row justify-between items-center">
                    <Text className="text-gray-600">Next Due</Text>
                    <Text className="font-semibold text-gray-800">
                      {formatDateShort(nextDueItem.dueDate)}
                    </Text>
                  </View>
                )}
                {arrearsAmount === 0 && currentDueAmount === 0 && (
                  <Text className="text-green-600 text-center py-2">
                    All payments are up to date
                  </Text>
                )}
              </View>
            </Card>

            {/* Backdated Lease Warning */}
            {hasBackdatedLease && (
              <View className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 mb-4">
                <View className="flex-row items-start gap-2">
                  <MaterialIcons name="warning" size={20} color="#F59E0B" />
                  <View className="flex-1">
                    <Text className="font-semibold text-yellow-900">Historical Periods</Text>
                    <Text className="text-yellow-800 text-sm mt-1">
                      Your lease has {historicalSchedules.length} historical periods. Contact your landlord if you have already paid these periods outside the system.
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Historical Periods - Grouped by Year */}
            {historicalSchedules.length > 0 && (
              <Card className="mb-4">
                <View className="space-y-3">
                  <TouchableOpacity
                    onPress={() => setShowHistorical(!showHistorical)}
                    className="flex-row justify-between items-center"
                  >
                    <View>
                      <Text className="text-lg font-semibold text-gray-800">
                        Historical Periods
                      </Text>
                      <Text className="text-sm text-gray-500">
                        {historicalSchedules.length} period{historicalSchedules.length > 1 ? 's' : ''} before {currentMonthStart.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
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
                          {yearItems.map((item, idx) => renderScheduleItem(item, idx, yearItems))}
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              </Card>
            )}

            {/* Current and Future Schedule List */}
            <Card className="mb-6">
              <View className="space-y-3">
                <Text className="text-lg font-semibold text-gray-800 mb-2">
                  Current and Upcoming Payments
                </Text>
                {currentAndFutureSchedules.length === 0 ? (
                  <View className="items-center py-8">
                    <MaterialIcons name="event-note" size={48} color="#9CA3AF" />
                    <Text className="text-gray-500 mt-2">No upcoming payments</Text>
                  </View>
                ) : (
                  <View className="space-y-0">
                    {currentAndFutureSchedules.map((item, index) =>
                      renderScheduleItem(item, index, currentAndFutureSchedules)
                    )}
                  </View>
                )}
              </View>
            </Card>
          </View>
        </ScrollView>
      </View>
    </SafeAreaWrapper>
  );
}
