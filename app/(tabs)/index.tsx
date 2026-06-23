import { ScrollView, View, Text, TouchableOpacity, RefreshControl } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { useLease } from '../../hooks/LeaseContext';
import { Card, MetricCard } from '../../components/ui/Card';
import { LeaseSwitcher } from '../../components/ui/LeaseSwitcher';
import { StatusBadge, getPaymentStatusBadge } from '../../components/ui/StatusBadge';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ErrorView } from '../../components/ui/ErrorView';
import { formatUGX } from '../../lib/currency';
import { tenantApi } from '../../lib/api';

import { SafeAreaWrapper } from '../../components/ui/SafeAreaWrapper';
import { formatDateShort } from '@/lib/utils';

export default function DashboardScreen() {
  const { user } = useAuth();
  const { selectedLeaseId } = useLease();

  const { data: dashboardData, isLoading, isRefetching, error, refetch } = useQuery({
    queryKey: ['tenant-dashboard', selectedLeaseId],
    queryFn: () => tenantApi.getDashboard(selectedLeaseId || undefined),
  });

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  if (!user) {
    return <LoadingSpinner message="Loading dashboard..." />;
  }

  if (isLoading) {
    return <LoadingSpinner message="Loading dashboard data..." />;
  }

  if (error && !dashboardData) {
    return (
      <ErrorView
        title="Unable to Load Dashboard"
        message={(error as any).message || 'Failed to load dashboard data'}
        onRetry={() => refetch()}
      />
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
            <View className="space-y-4 mb-6">
              <View className="flex-row justify-between items-start">
                <View>
                  <Text className="text-2xl font-semibold text-gray-800">
                    Hello, {user.firstName}!
                  </Text>
                  <Text className="text-gray-600 text-sm">
                    Welcome to your tenant portal
                  </Text>
                </View>
                <LeaseSwitcher />
              </View>
            </View>

            {/* Quick Stats */}
            <View className="space-y-4 mb-6">
              <View className="flex-row gap-2">
                <MetricCard
                  title="Monthly Rent"
                  value={dashboardData?.lease ? formatUGX(dashboardData.lease.monthlyRent) : "Loading..."}
                  subtitle={""}
                  icon={
                    <MaterialIcons name="home" size={20} color="#6B7280" />
                  }
                  className="flex-1"
                />
                <MetricCard
                  title="Outstanding balance"
                  value={dashboardData ? formatUGX(dashboardData.payments.currentBalance) : "Loading..."}
                  subtitle={dashboardData?.payments.isOverdue ? "Overdue" : "On Track"}
                  icon={
                    <MaterialIcons
                      name={dashboardData?.payments.isOverdue ? "warning" : "payment"}
                      size={20}
                      color={dashboardData?.payments.isOverdue ? "#F59E0B" : "#6B7280"}
                    />
                  }
                  className="flex-1"
                />
              </View>
            </View>

            {/* Current Balance Card */}
            {dashboardData?.lease && (
              <Card className="mb-4">
                <View className="space-y-3">
                  <View className="flex-row justify-between items-center mb-4">
                    <Text className="text-lg font-semibold text-gray-800">
                      Payment Summary
                    </Text>
                    <MaterialIcons
                      name={dashboardData.payments.isOverdue ? "warning" : "account-balance"}
                      size={24}
                      color={dashboardData.payments.isOverdue ? "#F59E0B" : "#6B7280"}
                    />
                  </View>
                  <View className="space-y-2">
                    <View className="flex-row justify-between">
                      <Text className="text-gray-600">Monthly Rent:</Text>
                      <Text className="font-medium text-gray-800">
                        {formatUGX(dashboardData.lease.monthlyRent)}
                      </Text>
                    </View>
                    <View className="flex-row justify-between">
                      <Text className="text-gray-600">Total Paid:</Text>
                      <Text className="font-medium text-gray-800">
                        {formatUGX(dashboardData.quickStats.totalPaid)}
                      </Text>
                    </View>
                    <View className="flex-row justify-between">
                      <Text className="text-gray-600">Outstanding:</Text>
                      <Text className="font-bold text-[#524768] text-lg">
                        {formatUGX(dashboardData.payments.currentBalance)}
                      </Text>
                    </View>
                    {dashboardData.payments.nextDueDate && (
                      <Text className="text-gray-600 text-sm">
                        Next Due: {formatDateShort(dashboardData.payments.nextDueDate)}
                      </Text>
                    )}
                    {dashboardData.payments.isOverdue && (
                      <Text className="text-yellow-600 text-sm font-medium">
                        ⚠️ Payment is overdue
                      </Text>
                    )}
                  </View>
                </View>
              </Card>
            )}

            {/* Quick Actions */}
            {dashboardData && dashboardData.payments.currentBalance > 0 && (
              <Card className="mb-4">
                <View className="space-y-3">
                  <View className="flex-row justify-between items-center">
                    <Text className="text-lg font-semibold text-gray-800">
                      Quick Actions
                    </Text>
                    <StatusBadge
                      status={dashboardData.payments.isOverdue ? "error" : "warning"}
                      text={dashboardData.payments.isOverdue ? "Overdue" : "Payment Due"}
                    />
                  </View>
                  <View className="flex-row justify-between items-center">
                    <View>
                      <Text className="text-2xl font-bold text-gray-800">
                        {formatUGX(dashboardData.payments.currentBalance)}
                      </Text>
                      {dashboardData.payments.nextDueDate && (
                        <Text className="text-gray-600 text-sm">
                          Due: {formatDateShort(dashboardData.payments.nextDueDate)}
                        </Text>
                      )}
                    </View>
                    <TouchableOpacity
                      className="bg-[#524768] px-4 py-2 rounded-md"
                      onPress={() => router.push('/payments')}
                    >
                      <Text className="text-white font-medium">
                        Pay Now
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </Card>
            )}

            {/* Recent Payments */}
            <Card className="mb-4">
              <View className="space-y-3">
                <View className="flex-row justify-between items-center mb-4">
                  <Text className="text-lg font-semibold text-gray-800">
                    Recent Payments
                  </Text>
                  <TouchableOpacity onPress={() => router.push('/screens/payment-history')}>
                    <Text className="text-[#524768] text-sm">
                      View All
                    </Text>
                  </TouchableOpacity>
                </View>
                {!dashboardData?.payments.recentPayments || dashboardData.payments.recentPayments.length === 0 ? (
                  <View className="items-center py-8">
                    <MaterialIcons name="receipt" size={48} color="#9CA3AF" />
                    <Text className="text-gray-500 mt-2">No payments yet</Text>
                  </View>
                ) : (
                  <View className="space-y-3">
                    {dashboardData.payments.recentPayments.slice(0, 2).map((paymentData, index) => {
                      const payment = paymentData.payment;
                      return (
                        <View key={payment.id}>
                          <View className="flex-row justify-between items-center">
                            <View>
                              <Text className="font-medium text-gray-800">
                                {formatUGX(typeof payment.amount === 'string' ? parseFloat(payment.amount) : payment.amount)}
                              </Text>
                              <Text className="text-gray-600 text-sm">
                                {payment.paidDate
                                  ? formatDateShort(payment.paidDate)
                                  : formatDateShort(payment.createdAt)
                                }
                              </Text>
                            </View>
                            <StatusBadge {...getPaymentStatusBadge(payment.status)} />
                          </View>
                          {index < Math.min(2, dashboardData.payments.recentPayments.length) - 1 && (
                            <View className="border-t border-gray-200 mt-3" />
                          )}
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            </Card>

            {/* Maintenance Requests */}

          </View>
        </ScrollView>
      </View>
    </SafeAreaWrapper>
  );
}
