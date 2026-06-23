import { useCallback } from 'react';
import { ScrollView, View, Text, TouchableOpacity, RefreshControl } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card } from '../../components/ui/Card';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ErrorView } from '../../components/ui/ErrorView';
import {
  StatusBadge,
  getMaintenanceStatusBadge,
  getMaintenancePriorityBadge,
} from '../../components/ui/StatusBadge';
import { SafeAreaWrapper } from '../../components/ui/SafeAreaWrapper';
import { useAuth } from '../../hooks/useAuth';
import { useMaintenanceSocket } from '../../hooks/useMaintenanceSocket';
import { tenantApi } from '../../lib/api';
import { formatDateShort } from '@/lib/utils';
import type { MaintenanceListItem } from '../../types';

export default function MaintenanceRequestsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const {
    data: requests = [],
    isLoading,
    isRefetching,
    error,
    refetch,
  } = useQuery({
    queryKey: ['maintenance-requests', user?.id],
    queryFn: tenantApi.getMaintenanceRequests,
  });

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  // Realtime nudge: refetch the list (and any open detail) when the landlord
  // assigns a vendor or transitions status server-side.
  useMaintenanceSocket(
    useCallback(() => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-requests', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['maintenance-request'] });
    }, [queryClient, user?.id])
  );

  if (isLoading) {
    return <LoadingSpinner message="Loading maintenance requests..." />;
  }

  if (error && requests.length === 0) {
    return (
      <ErrorView
        title="Unable to Load Requests"
        message={(error as any).message || 'Failed to load maintenance requests'}
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <SafeAreaWrapper backgroundColor="#F9FAFB">
      <View className="flex-1 bg-gray-50">
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
        >
          <View className="px-4 pt-6 pb-4">
            {/* New request button */}
            <TouchableOpacity
              className="bg-[#524768] py-3 rounded-md items-center flex-row justify-center gap-2 mb-6"
              onPress={() => router.push('/screens/create-maintenance-request' as any)}
            >
              <MaterialIcons name="add" size={20} color="white" />
              <Text className="text-white font-medium text-lg">Report an Issue</Text>
            </TouchableOpacity>

            {requests.length === 0 ? (
              <Card>
                <View className="items-center py-10">
                  <MaterialIcons name="build" size={48} color="#9CA3AF" />
                  <Text className="text-gray-500 mt-3 text-center">
                    No maintenance requests yet.
                  </Text>
                  <Text className="text-gray-400 text-sm mt-1 text-center">
                    Report an issue and we&apos;ll notify your landlord.
                  </Text>
                </View>
              </Card>
            ) : (
              <View className="gap-3">
                {requests.map((item: MaintenanceListItem) => {
                  const r = item.maintenanceRequest;
                  const statusBadge = getMaintenanceStatusBadge(r.status);
                  const priorityBadge = getMaintenancePriorityBadge(r.priority);
                  return (
                    <Card key={r.id}>
                      <View className="gap-2">
                        <View className="flex-row justify-between items-start gap-2">
                          <Text className="text-lg font-semibold text-gray-800 flex-1" numberOfLines={1}>
                            {r.title}
                          </Text>
                          <StatusBadge {...statusBadge} />
                        </View>

                        {r.description ? (
                          <Text className="text-gray-600 text-sm" numberOfLines={2}>
                            {r.description}
                          </Text>
                        ) : null}

                        <View className="flex-row items-center gap-2 mt-1">
                          <StatusBadge {...priorityBadge} />
                          <Text className="text-gray-400 text-xs">
                            Submitted {formatDateShort(r.submittedAt)}
                          </Text>
                        </View>

                        {item.property && (
                          <Text className="text-gray-500 text-xs">
                            {item.property.name}
                            {item.unit ? ` · Unit ${item.unit.unitNumber}` : ''}
                          </Text>
                        )}

                        {/* Vendor + scheduled date once the landlord has triaged it. */}
                        {(item.vendor || r.scheduledDate) && (
                          <View className="border-t border-gray-100 mt-2 pt-2 gap-1">
                            {item.vendor && (
                              <View className="flex-row items-center gap-2">
                                <MaterialIcons name="engineering" size={16} color="#6B7280" />
                                <Text className="text-gray-600 text-sm">
                                  {item.vendor.companyName || item.vendor.name}
                                </Text>
                              </View>
                            )}
                            {r.scheduledDate && (
                              <View className="flex-row items-center gap-2">
                                <MaterialIcons name="event" size={16} color="#6B7280" />
                                <Text className="text-gray-600 text-sm">
                                  Scheduled {formatDateShort(r.scheduledDate)}
                                </Text>
                              </View>
                            )}
                          </View>
                        )}
                      </View>
                    </Card>
                  );
                })}
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    </SafeAreaWrapper>
  );
}
