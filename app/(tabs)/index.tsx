import { tenantKeys } from '../../lib/queryKeys';
import { BRAND_COLOR } from '@/constants/theme';
import { View, Text, TouchableOpacity, RefreshControl } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useFocusEffect } from "expo-router/react-navigation";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useAuth } from "../../hooks/useAuth";
import { useLease } from "../../hooks/LeaseContext";
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
import { FinWiseScreen } from "../../components/ui/FinWiseScreen";
import { FinWiseProgressBar } from "../../components/ui/FinWiseProgressBar";
import { TransactionRow } from "../../components/ui/TransactionRow";
import { PillSwitch } from "../../components/ui/PillSwitch";
import { formatDateShort } from "@/lib/utils";

type PaymentFilter = "all" | "rent" | "security_deposit";

export default function DashboardScreen() {
  const { user } = useAuth();
  const { selectedLeaseId, isLoadingLeases, refreshLeases } = useLease();
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>("all");

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

  // If the dashboard rejects the selected lease (e.g. it was ended or
  // deactivated server-side and the server returns 403), refresh the lease
  // list so LeaseContext can re-validate the selection and switch leases
  // automatically when the selected one disappears.
  useEffect(() => {
    if (error) void refreshLeases();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error]);

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
  const monthlyRent = dashboardData?.lease?.monthlyRent ?? 0;
  const leaseStatus = dashboardData?.lease?.status;

  // Portion of this month's rent that is settled (0–100).
  const settledPercent =
    monthlyRent > 0
      ? Math.max(0, Math.min(100, ((monthlyRent - currentBalance) / monthlyRent) * 100))
      : currentBalance === 0
        ? 100
        : 0;

  const recentPayments = (dashboardData?.payments.recentPayments ?? []).filter(
    ({ payment }) =>
      paymentFilter === "all" || payment.paymentType === paymentFilter,
  );

  return (
    <SafeAreaWrapper>
      <FinWiseScreen
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => {
              void refetch();
            }}
            tintColor="#FFFFFF"
          />
        }
        headerClassName="px-9 pt-6 pb-10"
        header={
          <>
            {/* Greeting row (Figma "Hi, Welcome Back" 20px Semibold) */}
            <View className="flex-row justify-between items-center">
              <View className="flex-1 mr-3">
                <Text className="text-[20px] leading-[22px] font-semibold text-white">
                  Hi, Welcome Back
                </Text>
                <Text className="text-[14px] text-white/70 mt-1">
                  {user.firstName} {user.lastName || ''}
                </Text>
              </View>
              <View className="flex-row items-center gap-2.5">
                <LeaseSwitcher />
                <TouchableOpacity
                  onPress={() => router.push('/screens/notifications-settings')}
                  activeOpacity={0.7}
                  className="w-[30px] h-[30px] rounded-[15px] bg-brand-light items-center justify-center"
                >
                  <MaterialIcons name="notifications-none" size={18} color={BRAND_COLOR} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Balance split hero — directly on the colored background (Figma 7110:4451+) */}
            <View className="mt-9">
              <View className="flex-row items-start">
                <View className="flex-1">
                  <Text className="text-[12px] text-white/70">
                    Outstanding Balance
                  </Text>
                  <Text className="text-[24px] font-bold text-white mt-1">
                    {dashboardData
                      ? formatMoney(currentBalance, dashboardData.payments.currency)
                      : '...'}
                  </Text>
                  {otherCurrencyOwed ? (
                    <Text className="text-[12px] text-white/70 mt-0.5">
                      + {otherCurrencyOwed} other owed
                    </Text>
                  ) : null}
                </View>
                <View className="w-px h-[42px] bg-white/25 mx-4" />
                <View className="flex-1 items-end">
                  <Text className="text-[12px] text-white/70">Monthly Rent</Text>
                  <Text className="text-[24px] font-semibold text-ocean-light mt-1">
                    {dashboardData?.lease
                      ? formatMoney(monthlyRent, dashboardData.lease.currency)
                      : '...'}
                  </Text>
                </View>
              </View>

              {/* Two-segment progress bar (Figma 7110:4827) */}
              <View className="mt-8">
                <FinWiseProgressBar
                  percent={settledPercent}
                  filledLabel={`${Math.round(settledPercent)}%`}
                  remainingLabel={
                    dashboardData
                      ? formatMoney(currentBalance, dashboardData.payments.currency)
                      : ''
                  }
                />
                <Text className="text-[13px] text-white/80 mt-3">
                  {settledPercent >= 100
                    ? 'Your rent is fully settled. Looks good.'
                    : `${Math.round(settledPercent)}% of this month's rent settled.`}
                </Text>
              </View>

              {/* Due date + status + Pay Now */}
              <View className="flex-row items-center justify-between mt-7">
                <View>
                  <Text className="text-[12px] text-white/70">Next Due Date</Text>
                  <Text className="text-[15px] font-medium text-white mt-0.5">
                    {nextDueDate ? formatDateShort(nextDueDate) : 'No pending due date'}
                  </Text>
                  <Text
                    className={`text-[12px] font-semibold mt-0.5 ${
                      currentBalance === 0
                        ? 'text-finance'
                        : isOverdue
                          ? 'text-rose-300'
                          : 'text-amber-200'
                    }`}
                  >
                    {currentBalance === 0
                      ? 'All paid'
                      : isOverdue
                        ? 'Overdue'
                        : 'Pending'}
                    {leaseStatus ? ` · Lease ${leaseStatus}` : ''}
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={() => router.push('/payments')}
                  activeOpacity={0.8}
                  className="h-[45px] px-6 rounded-[30px] bg-finance flex-row items-center justify-center"
                >
                  <Text className="text-[15px] font-semibold text-finance-fence">
                    {currentBalance > 0 ? 'Pay Now' : 'Payments'}
                  </Text>
                  <MaterialIcons name="arrow-forward" size={16} color="#052224" />
                </TouchableOpacity>
              </View>
            </View>
          </>
        }
      >
        <View className="space-y-9">
          {/* Filter segmented control (Figma Switch2) */}
          <PillSwitch
            options={[
              { id: 'all' as const, label: 'All' },
              { id: 'rent' as const, label: 'Rent' },
              { id: 'security_deposit' as const, label: 'Deposit' },
            ]}
            selected={paymentFilter}
            onSelect={setPaymentFilter}
          />

          {/* Quick Services tiles */}
          <View className="flex-row gap-3">
            <TouchableOpacity
              onPress={() => router.push('/payments')}
              activeOpacity={0.7}
              className="flex-1 bg-brand-light/60 rounded-[22px] py-4 items-center justify-center"
            >
              <View className="w-11 h-11 rounded-[22px] bg-finance/15 items-center justify-center mb-2">
                <MaterialIcons name="receipt-long" size={22} color="#00D09E" />
              </View>
              <Text className="text-[12px] font-medium text-finance-fence text-center">
                Pay Rent
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push('/screens/maintenance-requests' as any)}
              activeOpacity={0.7}
              className="flex-1 bg-brand-light/60 rounded-[22px] py-4 items-center justify-center"
            >
              <View className="w-11 h-11 rounded-[22px] bg-amber-400/20 items-center justify-center mb-2">
                <MaterialIcons name="build" size={20} color="#D97706" />
              </View>
              <Text className="text-[12px] font-medium text-finance-fence text-center">
                Maintenance
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push('/screens/lease' as any)}
              activeOpacity={0.7}
              className="flex-1 bg-brand-light/60 rounded-[22px] py-4 items-center justify-center"
            >
              <View className="w-11 h-11 rounded-[22px] bg-brand/10 items-center justify-center mb-2">
                <MaterialIcons name="description" size={20} color={BRAND_COLOR} />
              </View>
              <Text className="text-[12px] font-medium text-finance-fence text-center">
                My Lease
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push('/screens/property' as any)}
              activeOpacity={0.7}
              className="flex-1 bg-brand-light/60 rounded-[22px] py-4 items-center justify-center"
            >
              <View className="w-11 h-11 rounded-[22px] bg-vivid-blue/15 items-center justify-center mb-2">
                <MaterialIcons name="apartment" size={20} color="#3299FF" />
              </View>
              <Text className="text-[12px] font-medium text-finance-fence text-center">
                Property
              </Text>
            </TouchableOpacity>
          </View>

          {/* Recent transactions */}
          <View>
            <View className="flex-row justify-between items-center mb-2">
              <Text className="text-[15px] font-medium text-finance-fence">
                Recent Payments
              </Text>
              <TouchableOpacity
                onPress={() => router.push('/screens/payment-history')}
                activeOpacity={0.7}
              >
                <Text className="text-[12px] font-semibold text-ocean">
                  View All
                </Text>
              </TouchableOpacity>
            </View>

            {recentPayments.length === 0 ? (
              <View className="items-center py-10">
                <View className="w-14 h-14 rounded-full bg-brand-light items-center justify-center mb-3">
                  <MaterialIcons name="receipt" size={26} color="#9CA3AF" />
                </View>
                <Text className="text-[15px] font-medium text-finance-fence">
                  No payments yet
                </Text>
                <Text className="text-[12px] text-gray-400 text-center mt-1">
                  {paymentFilter === 'all'
                    ? 'Payments made will appear here automatically'
                    : 'No payments in this category yet'}
                </Text>
              </View>
            ) : (
              <View>
                {recentPayments.slice(0, 3).map((paymentData, index) => {
                  const payment = paymentData.payment;
                  const amountNum =
                    typeof payment.amount === "string"
                      ? parseFloat(payment.amount)
                      : payment.amount;

                  return (
                    <View key={payment.id}>
                      <TransactionRow
                        iconBgClass={
                          payment.paymentType === 'security_deposit'
                            ? 'bg-ocean-light'
                            : 'bg-vivid-blue'
                        }
                        icon={
                          <MaterialIcons
                            name={
                              payment.paymentType === 'security_deposit'
                                ? 'security'
                                : 'home-work'
                            }
                            size={24}
                            color="#FFFFFF"
                          />
                        }
                        title={
                          payment.paymentType === 'security_deposit'
                            ? 'Security Deposit'
                            : 'Rent Payment'
                        }
                        subtitle={
                          payment.paidDate
                            ? formatDateShort(payment.paidDate)
                            : formatDateShort(payment.createdAt)
                        }
                        subtitleClass="text-ocean"
                        amount={formatMoney(amountNum, payment.currency)}
                        amountClass="text-finance-fence"
                        rightExtra={
                          <StatusBadge
                            {...getPaymentStatusBadge(payment.status)}
                            dot
                          />
                        }
                      />
                      {index < Math.min(3, recentPayments.length) - 1 && (
                        <View className="h-px bg-gray-100" />
                      )}
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        </View>
      </FinWiseScreen>
    </SafeAreaWrapper>
  );
}
