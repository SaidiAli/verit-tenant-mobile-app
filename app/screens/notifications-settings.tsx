import { ScrollView, View, Text, TouchableOpacity, Switch, TextInput, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { Card } from '../../components/ui/Card';
import { SafeAreaWrapper } from '../../components/ui/SafeAreaWrapper';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { useServerSettings } from '../../hooks/useServerSettings';

const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/;

interface ChannelRowProps {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  disabled?: boolean;
}

function ChannelRow({ icon, label, description, value, onValueChange, disabled }: ChannelRowProps) {
  return (
    <View className="flex-row justify-between items-center py-3">
      <View className="flex-row items-center gap-3 flex-1 pr-3">
        <MaterialIcons name={icon} size={20} color="#6B7280" />
        <View className="flex-1">
          <Text className="font-medium text-gray-800">{label}</Text>
          {description ? <Text className="text-sm text-gray-500">{description}</Text> : null}
        </View>
      </View>
      <Switch
        value={value}
        disabled={disabled}
        onValueChange={onValueChange}
        trackColor={{ false: '#E5E7EB', true: '#524768' }}
        thumbColor={value ? '#ffffff' : '#9CA3AF'}
      />
    </View>
  );
}

export default function NotificationsSettingsScreen() {
  const router = useRouter();
  const { settings, isLoading, updateNotifications } = useServerSettings();

  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifySms, setNotifySms] = useState(true);
  const [notifyWhatsapp, setNotifyWhatsapp] = useState(true);
  const [notifyPush, setNotifyPush] = useState(true);
  const [quietStart, setQuietStart] = useState('');
  const [quietEnd, setQuietEnd] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Hydrate local form from server settings once loaded
  useEffect(() => {
    const n = settings?.notifications;
    if (n) {
      setNotifyEmail(n.notifyEmail);
      setNotifySms(n.notifySms);
      setNotifyWhatsapp(n.notifyWhatsapp);
      setNotifyPush(n.notifyPush);
      setQuietStart(n.quietHoursStart ?? '');
      setQuietEnd(n.quietHoursEnd ?? '');
    }
  }, [settings?.notifications]);

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
    <SafeAreaWrapper backgroundColor="#F9FAFB">
      <View className="flex-1 bg-gray-50">
        <ScrollView showsVerticalScrollIndicator={false}>
          <View className="px-4 pt-6 pb-4">
            {/* Header */}
            <View className="flex-row items-center mb-6">
              <TouchableOpacity
                onPress={() => router.back()}
                className="flex-row items-center gap-2 p-2 -ml-2 rounded-md active:bg-gray-200"
              >
                <MaterialIcons name="arrow-back" size={24} color="#374151" />
              </TouchableOpacity>
              <Text className="text-xl font-semibold text-gray-800 ml-2">Notifications</Text>
            </View>

            {/* Channels */}
            <Card className="mb-4">
              <Text className="text-lg font-semibold text-gray-800 mb-1">Channels</Text>
              <Text className="text-sm text-gray-500 mb-2">
                Notifications are on by default. Turn off any channel you don&apos;t want.
              </Text>
              <ChannelRow
                icon="email"
                label="Email"
                value={notifyEmail}
                onValueChange={setNotifyEmail}
              />
              <ChannelRow
                icon="sms"
                label="SMS"
                value={notifySms}
                onValueChange={setNotifySms}
              />
              <ChannelRow
                icon="chat"
                label="WhatsApp"
                value={notifyWhatsapp}
                onValueChange={setNotifyWhatsapp}
              />
              <ChannelRow
                icon="notifications-active"
                label="Push"
                description="Coming soon — saved but not yet delivered"
                value={notifyPush}
                onValueChange={setNotifyPush}
              />
            </Card>

            {/* Quiet hours */}
            <Card className="mb-4">
              <Text className="text-lg font-semibold text-gray-800 mb-1">Quiet Hours</Text>
              <Text className="text-sm text-gray-500 mb-3">
                Reminders (rent, lease expiry) are held during these hours. Payment confirmations and
                other transactional messages still arrive.
              </Text>

              <View className="flex-row gap-3">
                <View className="flex-1">
                  <Text className="text-sm font-medium text-gray-700 mb-1">Start</Text>
                  <TextInput
                    value={quietStart}
                    onChangeText={(t) => {
                      setQuietStart(t);
                      if (errors.quiet || errors.quietStart) setErrors({});
                    }}
                    placeholder="22:00"
                    keyboardType="numbers-and-punctuation"
                    maxLength={5}
                    className={`border rounded-md px-3 py-3 bg-white ${errors.quietStart ? 'border-red-500' : 'border-gray-300'
                      }`}
                  />
                  {errors.quietStart ? (
                    <Text className="text-red-500 text-sm mt-1">{errors.quietStart}</Text>
                  ) : null}
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-medium text-gray-700 mb-1">End</Text>
                  <TextInput
                    value={quietEnd}
                    onChangeText={(t) => {
                      setQuietEnd(t);
                      if (errors.quiet || errors.quietEnd) setErrors({});
                    }}
                    editable={quietStart.trim().length > 0}
                    placeholder="07:00"
                    keyboardType="numbers-and-punctuation"
                    maxLength={5}
                    className={`border rounded-md px-3 py-3 ${quietStart.trim().length > 0 ? 'bg-white' : 'bg-gray-100'
                      } ${errors.quietEnd ? 'border-red-500' : 'border-gray-300'}`}
                  />
                  {errors.quietEnd ? (
                    <Text className="text-red-500 text-sm mt-1">{errors.quietEnd}</Text>
                  ) : null}
                </View>
              </View>
              {errors.quiet ? (
                <Text className="text-red-500 text-sm mt-2">{errors.quiet}</Text>
              ) : null}
              {(quietStart.trim().length > 0 || quietEnd.trim().length > 0) ? (
                <TouchableOpacity
                  className="mt-3 self-start"
                  onPress={() => {
                    setQuietStart('');
                    setQuietEnd('');
                    setErrors({});
                  }}
                >
                  <Text className="text-[#524768] font-medium text-sm">Clear quiet hours</Text>
                </TouchableOpacity>
              ) : null}
            </Card>

            {/* Save */}
            <TouchableOpacity
              onPress={handleSave}
              disabled={updateNotifications.isPending}
              className={`py-4 rounded-md mt-2 ${updateNotifications.isPending ? 'bg-gray-300' : 'bg-[#524768]'
                }`}
            >
              <Text className="text-white font-semibold text-center text-lg">
                {updateNotifications.isPending ? 'Saving...' : 'Save Changes'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </SafeAreaWrapper>
  );
}
