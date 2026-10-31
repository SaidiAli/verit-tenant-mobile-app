import { tenantKeys } from '../../lib/queryKeys';
import { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, RefreshControl } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router/react-navigation';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CreateMaintenanceRequestModal } from '../../components/ui/CreateMaintenanceRequestModal';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ErrorView } from '../../components/ui/ErrorView';
import {
  StatusBadge,
  getMaintenanceStatusBadge,
  getMaintenancePriorityBadge,
} from '../../components/ui/StatusBadge';
import { SafeAreaWrapper } from '../../components/ui/SafeAreaWrapper';
import { FinWiseScreen } from '../../components/ui/FinWiseScreen';
import { useAuth } from '../../hooks/useAuth';
import { useMaintenanceSocket } from '../../hooks/useMaintenanceSocket';
import { tenantApi } from '../../lib/api';
import { formatDateShort } from '@/lib/utils';
import type { MaintenanceListItem } from '../../types';

export default function MaintenanceRequestsScreen() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [showCreateModal, setShowCreateModal] = useState(false);

  const {
    data: requests = [],
    isLoading,
    isRefetching,
    error,
    refetch,
  } = useQuery({
    queryKey: tenantKeys.query(user?.id, 'maintenance-requests'),
    queryFn: ({ signal }) => tenantApi.getMaintenanceRequests(signal),
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
      queryClient.invalidateQueries({ queryKey: tenantKeys.query(user?.id, 'maintenance-requests') });
      queryClient.invalidateQueries({ queryKey: tenantKeys.query(user?.id, 'maintenance-request') });
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
    <SafeAreaWrapper>
      <FinWiseScreen
        title="Maintenance"
        onBack={() => router.back()}
        header={<View />}
        headerClassName="px-9 pt-6 pb-8"
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => { void refetch(); }}
            tintColor="#FFFFFF"
          />
        }
      >
        <View className="space-y-4">
          {/* New request button */}
          <TouchableOpacity
            className="h-[45px] rounded-[30px] bg-finance items-center flex-row justify-center gap-2"
            onPress={() => setShowCreateModal(true)}
          >
            <MaterialIcons name="add" size={20} color="#052224" />
            <Text className="text-finance-fence font-semibold text-[15px]">Report an Issue</Text>
          </TouchableOpacity>

          {requests.length === 0 ? (
            <View className="items-center py-12">
              <View className="w-16 h-16 rounded-full bg-brand-light items-center justify-center mb-3">
                <MaterialIcons name="build" size={30} color="#9CA3AF" />
              </View>
              <Text className="text-[15px] font-medium text-finance-fence mt-1 text-center">
                No maintenance requests yet.
              </Text>
              <Text className="text-[13px] text-gray-400 mt-1 text-center">
                Report an issue and we&apos;ll notify your landlord.
              </Text>
            </View>
          ) : (
            <View>
              {requests.map((item: MaintenanceListItem) => {
                const r = item.maintenanceRequest;
                const statusBadge = getMaintenanceStatusBadge(r.status);
                const priorityBadge = getMaintenancePriorityBadge(r.priority);
                return (
                  <View key={r.id} className="py-4">
                    <View className="flex-row items-start gap-[13px]">
                      <View className="w-[57px] h-[53px] rounded-[22px] bg-amber-400/20 items-center justify-center">
                        <MaterialIcons name="build" size={24} color="#D97706" />
                      </View>
                      <View className="flex-1 gap-1">
                        <View className="flex-row justify-between items-start gap-2">
                          <Text className="text-[15px] font-medium text-finance-fence flex-1" numberOfLines={1}>
                            {r.title}
                          </Text>
                          <StatusBadge {...statusBadge} dot />
                        </View>

                        {r.description ? (
                          <Text className="text-gray-500 text-[13px] leading-relaxed" numberOfLines={2}>
                            {r.description}
                          </Text>
                        ) : null}

                        <View className="flex-row items-center gap-2 mt-1">
                          <StatusBadge {...priorityBadge} />
                          <Text className="text-gray-400 text-[12px] font-semibold">
                            {formatDateShort(r.submittedAt)}
                          </Text>
                        </View>

                        {item.property && (
                          <Text className="text-gray-400 text-[12px]">
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
                                <Text className="text-gray-500 text-[13px]">
                                  {item.vendor.companyName || item.vendor.name}
                                </Text>
                              </View>
                            )}
                            {r.scheduledDate && (
                              <View className="flex-row items-center gap-2">
                                <MaterialIcons name="event" size={16} color="#6B7280" />
                                <Text className="text-gray-500 text-[13px]">
                                  Scheduled {formatDateShort(r.scheduledDate)}
                                </Text>
                              </View>
                            )}
                          </View>
                        )}
                      </View>
                    </View>
                    <View className="h-px bg-gray-100 mt-4" />
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </FinWiseScreen>

      <CreateMaintenanceRequestModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
    </SafeAreaWrapper>
  );
}
