import { tenantKeys } from '../../lib/queryKeys';
import { BRAND_COLOR } from '@/constants/theme';
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useCallback, useMemo } from "react";
import { useFocusEffect } from "expo-router/react-navigation";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useAuth } from "../../hooks/useAuth";
import { useLease } from "../../hooks/LeaseContext";
import { Card, MetricCard } from "../../components/ui/Card";
import { LeaseSwitcher } from "../../components/ui/LeaseSwitcher";
import {
  StatusBadge,
  getPaymentStatusBadge,
} from "../../components/ui/StatusBadge";
import { LoadingSpinner } from "../../components/ui/LoadingSpinner";
import { ErrorView } from "../../components/ui/ErrorView";
import { formatMoney } from "../../lib/currency";
import { tenantApi } from "../../lib/api";
import { SafeAreaWrapper } from "../../components/ui/SafeAreaWrapper";
import { formatDateShort } from "@/lib/utils";

export default function DashboardScreen() {
  const { user } = useAuth();
  const { selectedLeaseId, isLoadingLeases } = useLease();

  const {
    data: dashboardData,
    isLoading,
    isRefetching,
    error,
    refetch,
  } = useQuery({
    queryKey: tenantKeys.query(user?.id, 'tenant-dashboard', selectedLeaseId),
    queryFn: ({ signal }) => tenantApi.getDashboard(selectedLeaseId!, signal),
    enabled: !!user && !!selectedLeaseId,
  });

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  // `currentBalance` is scoped to the payable currency. Any further bucket is another
  // currency owed on the lease (old-currency arrears after a rent-currency transition) —
  // disclose it rather than fold it in, since the two can't be added.
  const otherCurrencyOwed = useMemo(
    () =>
      (dashboardData?.payments.balances ?? [])
        .slice(1)
        .filter(bucket => bucket.outstandingBalance > 0)
        .map(bucket => formatMoney(bucket.outstandingBalance, bucket.currency))
        .join(" + "),
    [dashboardData?.payments.balances],
  );

  if (!user) {
    return <LoadingSpinner message="Loading dashboard..." />;
  }

  if (!selectedLeaseId && !isLoadingLeases) {
    return (
      <ErrorView
        title="No lease selected"
        message="Your account has no available lease. Contact your property manager."
      />
    );
  }

  if (isLoading) {
    return <LoadingSpinner message="Loading dashboard data..." />;
  }

  if (error && !dashboardData) {
    return (
      <ErrorView
        title="Unable to Load Dashboard"
        message={(error as any).message || "Failed to load dashboard data"}
        onRetry={() => refetch()}
      />
    );
  }

  const currentBalance = dashboardData?.payments.currentBalance ?? 0;
  const isOverdue = dashboardData?.payments.isOverdue;
  const nextDueDate = dashboardData?.payments.nextDueDate;

  return (
    <SafeAreaWrapper>
      <View className="flex-1 bg-[#F8F9FA]">
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => {
                void refetch();
              }}
              tintColor={BRAND_COLOR}
            />
          }
        >
          <View className="px-5 pt-6 pb-8 space-y-6">
            {/* FinWise Header Section */}
            <View className="flex-row justify-between items-center mb-1">
              <View className="flex-1 mr-3">
                <Text className="text-xs font-bold uppercase tracking-wider text-brand">
                  Hi, Welcome Back
                </Text>
                <Text className="text-2xl font-bold text-gray-900 mt-0.5">
                  {user.firstName} {user.lastName || ''}
                </Text>
              </View>
              <View className="flex-row items-center gap-2">
                <LeaseSwitcher />
                <TouchableOpacity
                  onPress={() => router.push('/screens/notifications-settings')}
                  activeOpacity={0.7}
                  className="w-10 h-10 rounded-full bg-white border border-gray-100 items-center justify-center shadow-sm"
                >
                  <MaterialIcons
                    name="notifications-none"
                    size={22}
                    color={BRAND_COLOR}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* FinWise Hero Balance Card (Screen 4-A / 6-A) */}
            <View
              className="bg-brand rounded-3xl p-5 shadow-xl relative overflow-hidden"
              style={{
                shadowColor: BRAND_COLOR,
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.25,
                shadowRadius: 16,
                elevation: 6,
              }}
            >
              {/* Background decorative glow circle */}
              <View className="absolute -top-12 -right-12 w-44 h-44 rounded-full bg-white/5" />

              <View className="flex-row justify-between items-start mb-2">
                <View>
                  <Text className="text-xs font-semibold uppercase tracking-wider text-white/70">
                    Outstanding Balance
                  </Text>
                  <Text className="text-3xl font-extrabold text-white mt-1">
                    {dashboardData
                      ? formatMoney(
                          currentBalance,
                          dashboardData.payments.currency,
                        )
                      : '...'}
                  </Text>
                  {otherCurrencyOwed ? (
                    <Text className="text-xs text-white/70 mt-1">
                      + {otherCurrencyOwed} other owed
                    </Text>
                  ) : null}
                </View>

                {/* Status Chip */}
                <View
                  className={`px-3 py-1.5 rounded-full flex-row items-center gap-1.5 ${
                    currentBalance === 0
                      ? 'bg-[#00D09E]/20'
                      : isOverdue
                        ? 'bg-rose-500/20'
                        : 'bg-white/15'
                  }`}
                >
                  <View
                    className={`w-2 h-2 rounded-full ${
                      currentBalance === 0
                        ? 'bg-[#00D09E]'
                        : isOverdue
                          ? 'bg-rose-400'
                          : 'bg-amber-300'
                    }`}
                  />
                  <Text className="text-xs font-bold text-white tracking-wide">
                    {currentBalance === 0
                      ? 'All Paid'
                      : isOverdue
                        ? 'Overdue'
                        : 'Pending'}
                  </Text>
                </View>
              </View>

              {/* Due Date & Action Banner */}
              <View className="flex-row items-center justify-between pt-4 mt-3 border-t border-white/10">
                <View>
                  <Text className="text-[11px] font-medium text-white/60 uppercase tracking-wider">
                    Next Due Date
                  </Text>
                  <Text className="text-xs font-bold text-white mt-0.5">
                    {nextDueDate ? formatDateShort(nextDueDate) : 'No pending due date'}
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={() => router.push('/payments')}
                  activeOpacity={0.8}
                  className="bg-[#00D09E] px-5 py-2.5 rounded-2xl shadow-sm flex-row items-center gap-1"
                >
                  <Text className="text-gray-950 font-bold text-xs uppercase tracking-wider">
                    {currentBalance > 0 ? 'Pay Now' : 'View Payments'}
                  </Text>
                  <MaterialIcons name="arrow-forward" size={14} color="#031314" />
                </TouchableOpacity>
              </View>
            </View>

            {/* FinWise Split Metrics: Monthly Rent vs Outstanding */}
            <View className="flex-row gap-3">
              <MetricCard
                title="Monthly Rent"
                value={
                  dashboardData?.lease
                    ? formatMoney(
                        dashboardData.lease.monthlyRent,
                        dashboardData.lease.currency,
                      )
                    : 'Loading...'
                }
                subtitle="Agreed monthly rate"
                icon={<MaterialIcons name="home" size={20} color={BRAND_COLOR} />}
                variant="default"
                className="flex-1"
              />
              <MetricCard
                title="Lease Status"
                value={
                  dashboardData?.lease?.status
                    ? dashboardData.lease.status.toUpperCase()
                    : '—'
                }
                subtitle={
                  isOverdue ? 'Action required' : 'In good standing'
                }
                icon={
                  <MaterialIcons
                    name={isOverdue ? 'warning' : 'verified'}
                    size={20}
                    color={isOverdue ? '#EF4444' : '#00D09E'}
                  />
                }
                variant={isOverdue ? 'danger' : 'finance'}
                className="flex-1"
              />
            </View>

            {/* Quick Action Navigation Tiles */}
            <View>
              <Text className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3 ml-1">
                Quick Services
              </Text>
              <View className="flex-row gap-3">
                <TouchableOpacity
                  onPress={() => router.push('/payments')}
                  activeOpacity={0.7}
                  className="flex-1 bg-white p-3.5 rounded-2xl border border-gray-100 items-center justify-center shadow-sm"
                >
                  <View className="w-10 h-10 rounded-2xl bg-[#00D09E]/15 items-center justify-center mb-2">
                    <MaterialIcons name="receipt-long" size={22} color="#00D09E" />
                  </View>
                  <Text className="text-xs font-bold text-gray-900 text-center">
                    Pay Rent
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() =>
                    router.push('/screens/maintenance-requests' as any)
                  }
                  activeOpacity={0.7}
                  className="flex-1 bg-white p-3.5 rounded-2xl border border-gray-100 items-center justify-center shadow-sm"
                >
                  <View className="w-10 h-10 rounded-2xl bg-amber-500/15 items-center justify-center mb-2">
                    <MaterialIcons name="build" size={20} color="#D97706" />
                  </View>
                  <Text className="text-xs font-bold text-gray-900 text-center">
                    Maintenance
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => router.push('/screens/lease' as any)}
                  activeOpacity={0.7}
                  className="flex-1 bg-white p-3.5 rounded-2xl border border-gray-100 items-center justify-center shadow-sm"
                >
                  <View className="w-10 h-10 rounded-2xl bg-brand/10 items-center justify-center mb-2">
                    <MaterialIcons name="description" size={20} color={BRAND_COLOR} />
                  </View>
                  <Text className="text-xs font-bold text-gray-900 text-center">
                    My Lease
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => router.push('/screens/property' as any)}
                  activeOpacity={0.7}
                  className="flex-1 bg-white p-3.5 rounded-2xl border border-gray-100 items-center justify-center shadow-sm"
                >
                  <View className="w-10 h-10 rounded-2xl bg-sky-500/15 items-center justify-center mb-2">
                    <MaterialIcons name="apartment" size={20} color="#0284C7" />
                  </View>
                  <Text className="text-xs font-bold text-gray-900 text-center">
                    Property
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* FinWise Recent Transactions Section */}
            <Card padded={false} className="p-5">
              <View className="flex-row justify-between items-center mb-4">
                <View>
                  <Text className="text-base font-bold text-gray-900">
                    Recent Payments
                  </Text>
                  <Text className="text-xs text-gray-500">
                    Latest settled transactions
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => router.push('/screens/payment-history')}
                  activeOpacity={0.7}
                  className="py-1 px-3 rounded-full bg-brand/10"
                >
                  <Text className="text-xs font-bold text-brand">View All</Text>
                </TouchableOpacity>
              </View>

              {!dashboardData?.payments.recentPayments ||
              dashboardData.payments.recentPayments.length === 0 ? (
                <View className="items-center py-8">
                  <View className="w-14 h-14 rounded-full bg-gray-100 items-center justify-center mb-2">
                    <MaterialIcons name="receipt" size={28} color="#9CA3AF" />
                  </View>
                  <Text className="text-sm font-semibold text-gray-700">No payments yet</Text>
                  <Text className="text-xs text-gray-400 text-center mt-0.5">
                    Payments made will appear here automatically
                  </Text>
                </View>
              ) : (
                <View className="space-y-3">
                  {dashboardData.payments.recentPayments
                    .slice(0, 3)
                    .map((paymentData, index) => {
                      const payment = paymentData.payment;
                      const amountNum =
                        typeof payment.amount === "string"
                          ? parseFloat(payment.amount)
                          : payment.amount;

                      return (
                        <View key={payment.id}>
                          <View className="flex-row justify-between items-center py-1">
                            <View className="flex-row items-center gap-3">
                              {/* Category Icon */}
                              <View className="w-11 h-11 rounded-2xl bg-finance-honeydew items-center justify-center border border-finance-light">
                                <MaterialIcons
                                  name="account-balance-wallet"
                                  size={22}
                                  color="#00D09E"
                                />
                              </View>
                              <View>
                                <Text className="font-bold text-gray-900 text-sm">
                                  {payment.paymentType === 'security_deposit'
                                    ? 'Security Deposit'
                                    : 'Rent Payment'}
                                </Text>
                                <Text className="text-xs text-gray-500 mt-0.5">
                                  {payment.paidDate
                                    ? formatDateShort(payment.paidDate)
                                    : formatDateShort(payment.createdAt)}
                                </Text>
                              </View>
                            </View>

                            <View className="items-end">
                              <Text className="font-bold text-gray-900 text-sm">
                                {formatMoney(amountNum, payment.currency)}
                              </Text>
                              <View className="mt-1">
                                <StatusBadge
                                  {...getPaymentStatusBadge(payment.status)}
                                  dot
                                />
                              </View>
                            </View>
                          </View>
                          {index <
                            Math.min(
                              3,
                              dashboardData.payments.recentPayments.length
                            ) - 1 && (
                            <View className="border-t border-gray-100 mt-3" />
                          )}
                        </View>
                      );
                    })}
                </View>
              )}
            </Card>
          </View>
        </ScrollView>
      </View>
    </SafeAreaWrapper>
  );
}
