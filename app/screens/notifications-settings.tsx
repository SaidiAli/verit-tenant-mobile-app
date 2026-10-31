import { View, Text, TouchableOpacity, Switch, TextInput, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { SafeAreaWrapper } from '../../components/ui/SafeAreaWrapper';
import { FinWiseScreen } from '../../components/ui/FinWiseScreen';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { useServerSettings } from '../../hooks/useServerSettings';
import { useAuth } from '../../hooks/useAuth';

import type { NotificationSettings } from '../../types';

const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/;

interface ChannelRowProps {
  icon: keyof typeof MaterialIcons.glyphMap;
  iconBgClass: string;
  iconColor: string;
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
}

/** FinWise settings row (31px icon tile, 15px label) with an inline Switch. */
function ChannelRow({ icon, iconBgClass, iconColor, label, description, value, onValueChange }: ChannelRowProps) {
  return (
    <View className="flex-row items-center gap-[23px] py-[13px]">
      <View className={`w-[31px] h-[31px] rounded-[10px] items-center justify-center ${iconBgClass}`}>
        <MaterialIcons name={icon} size={17} color={iconColor} />
      </View>
      <View className="flex-1">
        <Text className="text-[15px] font-medium text-finance-fence">{label}</Text>
        {description ? (
          <Text className="text-[12px] text-gray-400 mt-0.5">{description}</Text>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: '#E5E7EB', true: '#00D09E' }}
        thumbColor={value ? '#ffffff' : '#9CA3AF'}
      />
    </View>
  );
}

export default function NotificationsSettingsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { settings, isLoading, updateNotifications } = useServerSettings();

  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifySms, setNotifySms] = useState(true);
  const [notifyWhatsapp, setNotifyWhatsapp] = useState(true);
  const [notifyPush, setNotifyPush] = useState(true);
  const [quietStart, setQuietStart] = useState('');
  const [quietEnd, setQuietEnd] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isDirty, setIsDirty] = useState(false);
  const [previousUserId, setPreviousUserId] = useState(user?.id);
  const accountChanged = previousUserId !== user?.id;
  if (accountChanged) {
    setPreviousUserId(user?.id);
    setIsDirty(false);
  }

  // Hydrate local form from server settings once loaded
  const [previousSettings, setPreviousSettings] = useState<NotificationSettings | undefined>(undefined);
  if (accountChanged || previousSettings !== settings?.notifications) {
    setPreviousSettings(settings?.notifications);
    const n = settings?.notifications;
    if ((!isDirty || accountChanged) && (n || accountChanged)) {
      setNotifyEmail(n?.notifyEmail ?? true);
      setNotifySms(n?.notifySms ?? true);
      setNotifyWhatsapp(n?.notifyWhatsapp ?? true);
      setNotifyPush(n?.notifyPush ?? true);
      setQuietStart(n?.quietHoursStart ?? '');
      setQuietEnd(n?.quietHoursEnd ?? '');
    }
  }

  const validate = () => {
    const next: Record<string, string> = {};
    const startSet = quietStart.trim().length > 0;
    const endSet = quietEnd.trim().length > 0;

    if (startSet !== endSet) {
      next.quiet = 'Set both quiet-hours times, or clear both.';
    } else if (startSet && endSet) {
      if (!HHMM.test(quietStart.trim())) next.quietStart = 'Use HH:MM (24-hour)';
      if (!HHMM.test(quietEnd.trim())) next.quietEnd = 'Use HH:MM (24-hour)';
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const save = () => {
    if (!validate()) return;

    const startSet = quietStart.trim().length > 0;
    const endSet = quietEnd.trim().length > 0;

    updateNotifications.mutate(
      {
        notifyEmail,
        notifySms,
        notifyWhatsapp,
        notifyPush,
        // Both-or-neither: clear sends both null
        quietHoursStart: startSet ? quietStart.trim() : null,
        quietHoursEnd: endSet ? quietEnd.trim() : null,
      },
      { onSuccess: () => router.back() }
    );
  };

  const handleSave = () => {
    if (!validate()) return;
    // Warn if the tenant is about to silence every delivery channel
    const noChannels = !notifyEmail && !notifySms && !notifyWhatsapp && !notifyPush;
    if (noChannels) {
      Alert.alert(
        'Turn off all notifications?',
        'With every channel off you will stop receiving rent reminders and other alerts. Continue?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Turn off', style: 'destructive', onPress: save },
        ]
      );
      return;
    }
    save();
  };

  if (isLoading) {
    return <LoadingSpinner message="Loading notification settings..." />;
  }

  return (
    <SafeAreaWrapper>
      <FinWiseScreen
        title="Notifications"
        onBack={() => router.back()}
        header={<View />}
        headerClassName="px-9 pt-6 pb-8"
      >
        <View className="space-y-9">
          {/* Channels */}
          <View>
            <Text className="text-[15px] font-medium text-finance-fence mb-1">
              Channels
            </Text>
            <Text className="text-[13px] text-gray-500 mb-1">
              Notifications are on by default. Turn off any channel you don&apos;t want.
            </Text>
            <ChannelRow
              icon="email"
              iconBgClass="bg-ocean/10"
              iconColor="#0068FF"
              label="Email"
              value={notifyEmail}
              onValueChange={value => { setIsDirty(true); setNotifyEmail(value); }}
            />
            <ChannelRow
              icon="sms"
              iconBgClass="bg-finance/15"
              iconColor="#00D09E"
              label="SMS"
              value={notifySms}
              onValueChange={value => { setIsDirty(true); setNotifySms(value); }}
            />
            <ChannelRow
              icon="chat"
              iconBgClass="bg-finance/15"
              iconColor="#00D09E"
              label="WhatsApp"
              value={notifyWhatsapp}
              onValueChange={value => { setIsDirty(true); setNotifyWhatsapp(value); }}
            />
            <ChannelRow
              icon="notifications-active"
              iconBgClass="bg-brand-light"
              iconColor="#524768"
              label="Push"
              description="Coming soon — saved but not yet delivered"
              value={notifyPush}
              onValueChange={value => { setIsDirty(true); setNotifyPush(value); }}
            />
          </View>

          {/* Quiet hours */}
          <View>
            <Text className="text-[15px] font-medium text-finance-fence mb-1">
              Quiet Hours
            </Text>
            <Text className="text-[13px] text-gray-500 mb-3 leading-relaxed">
              Reminders (rent, lease expiry) are held during these hours. Payment confirmations and
              other transactional messages still arrive.
            </Text>

            <View className="flex-row gap-3">
              <View className="flex-1">
                <Text className="text-[15px] font-medium text-finance-fence mb-2">Start</Text>
                <TextInput
                  value={quietStart}
                  onChangeText={(t) => {
                    setIsDirty(true);
                    setQuietStart(t);
                    if (errors.quiet || errors.quietStart) setErrors({});
                  }}
                  placeholder="22:00"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="numbers-and-punctuation"
                  maxLength={5}
                  className={`h-[41px] rounded-[18px] px-4 text-[16px] text-finance-fence ${
                    errors.quietStart ? 'bg-red-50' : 'bg-brand-light'
                  }`}
                />
                {errors.quietStart ? (
                  <Text className="text-red-500 text-[12px] mt-1.5">{errors.quietStart}</Text>
                ) : null}
              </View>
              <View className="flex-1">
                <Text className="text-[15px] font-medium text-finance-fence mb-2">End</Text>
                <TextInput
                  value={quietEnd}
                  onChangeText={(t) => {
                    setIsDirty(true);
                    setQuietEnd(t);
                    if (errors.quiet || errors.quietEnd) setErrors({});
                  }}
                  editable={quietStart.trim().length > 0}
                  placeholder="07:00"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="numbers-and-punctuation"
                  maxLength={5}
                  className={`h-[41px] rounded-[18px] px-4 text-[16px] text-finance-fence ${
                    quietStart.trim().length > 0 ? 'bg-brand-light' : 'bg-gray-100'
                  } ${errors.quietEnd ? 'bg-red-50' : ''}`}
                />
                {errors.quietEnd ? (
                  <Text className="text-red-500 text-[12px] mt-1.5">{errors.quietEnd}</Text>
                ) : null}
              </View>
            </View>
            {errors.quiet ? (
              <Text className="text-red-500 text-[12px] mt-2">{errors.quiet}</Text>
            ) : null}
            {(quietStart.trim().length > 0 || quietEnd.trim().length > 0) ? (
              <TouchableOpacity
                className="mt-3 self-start"
                onPress={() => {
                  setIsDirty(true);
                  setQuietStart('');
                  setQuietEnd('');
                  setErrors({});
                }}
              >
                <Text className="text-brand font-semibold text-[13px]">Clear quiet hours</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Save */}
          <TouchableOpacity
            onPress={handleSave}
            disabled={updateNotifications.isPending}
            className={`h-[45px] rounded-[30px] items-center justify-center ${
              updateNotifications.isPending ? 'bg-brand-light' : 'bg-finance'
            }`}
          >
            <Text
              className={`font-semibold text-[15px] ${
                updateNotifications.isPending ? 'text-gray-400' : 'text-finance-fence'
              }`}
            >
              {updateNotifications.isPending ? 'Saving...' : 'Save Changes'}
            </Text>
          </TouchableOpacity>
        </View>
      </FinWiseScreen>
    </SafeAreaWrapper>
  );
}
