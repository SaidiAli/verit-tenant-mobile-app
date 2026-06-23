import { Alert } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { settingsApi } from '../lib/api';
import { useAuth } from './useAuth';
import {
  NotificationSettings,
  PaymentPreferences,
  PreferenceSettings,
  TenantSettings,
} from '../types';

/**
 * Server-backed settings (profile, notifications, preferences, paymentPreferences)
 * from the unified `/api/settings` surface. This is distinct from `useSettings`,
 * which holds device-local toggles (biometric / dark mode) in expo-secure-store.
 */
export function useServerSettings() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const settingsQuery = useQuery<TenantSettings>({
    queryKey: ['settings', user?.id],
    queryFn: settingsApi.get,
    enabled: !!user,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['settings', user?.id] });

  const onError = (e: any) =>
    Alert.alert('Error', e?.response?.data?.error || e?.message || 'Failed to update');

  const updateNotifications = useMutation({
    mutationFn: (data: Partial<NotificationSettings>) => settingsApi.updateNotifications(data),
    onSuccess: () => {
      invalidate();
      Alert.alert('Saved', 'Notification settings updated');
    },
    onError,
  });

  const updatePreferences = useMutation({
    mutationFn: (data: Partial<PreferenceSettings>) => settingsApi.updatePreferences(data),
    onSuccess: () => {
      invalidate();
      Alert.alert('Saved', 'Preferences updated');
    },
    onError,
  });

  const updatePaymentPrefs = useMutation({
    mutationFn: (data: Partial<PaymentPreferences>) => settingsApi.updatePaymentPrefs(data),
    onSuccess: () => {
      invalidate();
      Alert.alert('Saved', 'Payment preferences updated');
    },
    onError,
  });

  return {
    settings: settingsQuery.data,
    isLoading: settingsQuery.isLoading,
    error: settingsQuery.error,
    refetch: settingsQuery.refetch,
    updateNotifications,
    updatePreferences,
    updatePaymentPrefs,
  };
}
