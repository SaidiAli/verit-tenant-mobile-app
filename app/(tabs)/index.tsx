import { BRAND_COLOR } from '@/constants/theme';
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
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
import { formatUGX } from "../../lib/currency";
import { tenantApi } from "../../lib/api";

import { SafeAreaWrapper } from "../../components/ui/SafeAreaWrapper";
import { formatDateShort } from "@/lib/utils";

export default function DashboardScreen() {
  const { user } = useAuth();
  const { selectedLeaseId } = useLease();

  const {
    data: dashboardData,
    isLoading,
    isRefetching,
    error,
    refetch,
  } = useQuery({
    queryKey: ["tenant-dashboard", selectedLeaseId],
    queryFn: () => tenantApi.getDashboard(selectedLeaseId || undefined),
  });

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
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
        message={(error as any).message || "Failed to load dashboard data"}
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
                  <Text className="text-gray-600 text-body">
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
                  value={
                    dashboardData?.lease
                      ? formatUGX(dashboardData.lease.monthlyRent)
                      : "Loading..."
                  }
                  subtitle={""}
                  variant="brand"
                  className="flex-1"
                />
                <MetricCard
                  title="Outstanding balance"
                  value={
                    dashboardData
                      ? formatUGX(dashboardData.payments.currentBalance)
                      : "Loading..."
                  }
                  subtitle={
                    dashboardData?.payments.isOverdue ? "Overdue" : "On Track"
                  }
                  variant="danger"
                  className="flex-1"
                />
              </View>
            </View>

            {/* Quick Actions */}
            {dashboardData && dashboardData.payments.currentBalance > 0 && (
              <Card className="mb-4">
                <View className="space-y-3">
                  <View className="flex-row justify-between items-center">
                    <Text className="text-lg font-semibold text-gray-800">
                      Quick Actions
                    </Text>
                  </View>
                  <View className="flex-row justify-between items-center">
                    <View>
                      <Text className="text-2xl font-bold text-gray-800">
                        {formatUGX(dashboardData.payments.currentBalance)}
                      </Text>
                      {dashboardData.payments.nextDueDate && (
                        <Text className="text-gray-600 text-sm">
                          Due:{" "}
                          {formatDateShort(dashboardData.payments.nextDueDate)}
                        </Text>
                      )}
                    </View>
                    <TouchableOpacity
                      className="bg-brand px-4 py-2 rounded-md"
                      onPress={() => router.push("/payments")}
                    >
                      <Text className="text-white font-medium">Pay Now</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </Card>
            )}

            {/* Maintenance Requests */}
            <TouchableOpacity
              onPress={() =>
                router.push("/screens/maintenance-requests" as any)
              }
              activeOpacity={0.7}
            >
              <Card className="mb-4">
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center gap-3">
                    <View className="w-10 h-10 bg-brand/10 rounded-full items-center justify-center">
                      <MaterialIcons name="build" size={24} color={BRAND_COLOR} />
                    </View>
                    <View>
                      <Text className="text-lg font-semibold text-gray-800">
                        Maintenance
                      </Text>
                      <Text className="text-sm text-gray-500">
                        Report an issue or track requests
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

            {/* Recent Payments */}
            <Card className="mb-4">
              <View className="space-y-3">
                <View className="flex-row justify-between items-center mb-4">
                  <Text className="text-lg font-semibold text-gray-800">
                    Recent Payments
                  </Text>
                  <TouchableOpacity
                    onPress={() => router.push("/screens/payment-history")}
                  >
                    <Text className="text-brand text-sm">View All</Text>
                  </TouchableOpacity>
                </View>
                {!dashboardData?.payments.recentPayments ||
                dashboardData.payments.recentPayments.length === 0 ? (
                  <View className="items-center py-8">
                    <MaterialIcons name="receipt" size={48} color="#9CA3AF" />
                    <Text className="text-gray-500 mt-2">No payments yet</Text>
                  </View>
                ) : (
                  <View className="space-y-3">
                    {dashboardData.payments.recentPayments
                      .slice(0, 2)
                      .map((paymentData, index) => {
                        const payment = paymentData.payment;
                        return (
                          <View key={payment.id}>
                            <View className="flex-row justify-between items-center">
                              <View>
                                <Text className="font-medium text-gray-800">
                                  {formatUGX(
                                    typeof payment.amount === "string"
                                      ? parseFloat(payment.amount)
                                      : payment.amount,
                                  )}
                                </Text>
                                <Text className="text-gray-600 text-sm">
                                  {payment.paidDate
                                    ? formatDateShort(payment.paidDate)
                                    : formatDateShort(payment.createdAt)}
                                </Text>
                              </View>
                              <StatusBadge
                                {...getPaymentStatusBadge(payment.status)}
                              />
                            </View>
                            {index <
                              Math.min(
                                2,
                                dashboardData.payments.recentPayments.length,
                              ) -
                                1 && (
                              <View className="border-t border-gray-200 mt-3" />
                            )}
                          </View>
                        );
                      })}
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
