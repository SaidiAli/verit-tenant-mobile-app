import { ScrollView, View, Text, TouchableOpacity, TextInput } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { Card } from '../../components/ui/Card';
import { SafeAreaWrapper } from '../../components/ui/SafeAreaWrapper';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { useServerSettings } from '../../hooks/useServerSettings';
import { useAuth } from '../../hooks/useAuth';
import { getMobileMoneyProvider } from '../../lib/currency';
import { MobileMoneyProviderId } from '../../types';

const PHONE_RE = /^(\+?256|0)[0-9]{9}$/;

const PROVIDERS: { value: MobileMoneyProviderId; label: string }[] = [
  { value: 'mtn', label: 'MTN' },
  { value: 'airtel', label: 'Airtel' },
  { value: 'm-sente', label: 'M-Sente' },
];

const REMINDER_MIN = 0;
const REMINDER_MAX = 30;

export default function PaymentPreferencesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { settings, isLoading, updatePaymentPrefs } = useServerSettings();

  const [phone, setPhone] = useState('');
  const [provider, setProvider] = useState<MobileMoneyProviderId | null>(null);
  const [reminderDays, setReminderDays] = useState(3);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isLoading) return;
    const p = settings?.paymentPreferences;
    // Fall back to the tenant's profile phone (and phone-derived provider) when unset
    const fallbackPhone = user?.phone ?? '';
    const detected = fallbackPhone ? getMobileMoneyProvider(fallbackPhone) : 'unknown';
    setPhone(p?.mobileMoneyPhone ?? fallbackPhone);
    setProvider(
      p?.mobileMoneyProvider ?? (detected === 'unknown' ? null : detected)
    );
    setReminderDays(p?.reminderDaysBefore ?? 3);
    // Only re-run when the loaded data changes
  }, [settings?.paymentPreferences, isLoading, user?.phone]);

  const validate = () => {
    const next: Record<string, string> = {};
    if (phone.trim() && !PHONE_RE.test(phone.replace(/\s/g, ''))) {
      next.phone = 'Enter a valid Ugandan phone (+256XXXXXXXXX or 0XXXXXXXXX)';
    }
    if (!provider) {
      next.provider = 'Select a mobile money provider';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const save = () => {
    if (!validate()) return;
    updatePaymentPrefs.mutate(
      {
        mobileMoneyPhone: phone.trim() ? phone.replace(/\s/g, '') : null,
        mobileMoneyProvider: provider,
        reminderDaysBefore: reminderDays,
      },
      { onSuccess: () => router.back() }
    );
  };

  const adjustReminder = (delta: number) => {
    setReminderDays((d) => Math.min(REMINDER_MAX, Math.max(REMINDER_MIN, d + delta)));
  };

  if (isLoading) {
    return <LoadingSpinner message="Loading payment preferences..." />;
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
              <Text className="text-xl font-semibold text-gray-800 ml-2">Payment Preferences</Text>
            </View>

            {/* Mobile money account */}
            <Card className="mb-4">
              <Text className="text-lg font-semibold text-gray-800 mb-1">Mobile Money</Text>
              <Text className="text-sm text-gray-500 mb-3">
                Used to pre-fill your rent payments. Leave blank to use your profile phone number.
              </Text>

              <View className="mb-4">
                <Text className="text-sm font-medium text-gray-700 mb-1">Mobile Money Number</Text>
                <TextInput
                  value={phone}
                  onChangeText={(t) => {
                    setPhone(t);
                    if (errors.phone) setErrors((p) => ({ ...p, phone: '' }));
                  }}
                  placeholder="0XXXXXXXXX"
                  keyboardType="phone-pad"
                  className={`border rounded-md px-3 py-3 bg-white ${errors.phone ? 'border-red-500' : 'border-gray-300'
                    }`}
                />
                {errors.phone ? (
                  <Text className="text-red-500 text-sm mt-1">{errors.phone}</Text>
                ) : null}
              </View>

              <Text className="text-sm font-medium text-gray-700 mb-2">Provider</Text>
              <View className="flex-row gap-2">
                {PROVIDERS.map((p) => {
                  const selected = provider === p.value;
                  return (
                    <TouchableOpacity
                      key={p.value}
                      onPress={() => {
                        setProvider(p.value);
                        if (errors.provider) setErrors((e) => ({ ...e, provider: '' }));
                      }}
                      className={`flex-1 py-3 rounded-md border items-center ${selected ? 'border-brand bg-brand/5' : 'border-gray-300 bg-white'
                        }`}
                    >
                      <Text className={`font-medium ${selected ? 'text-brand' : 'text-gray-700'}`}>
                        {p.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {errors.provider ? (
                <Text className="text-red-500 text-sm mt-1">{errors.provider}</Text>
              ) : null}
            </Card>

            {/* Reminder lead time */}
            <Card className="mb-4">
              <Text className="text-lg font-semibold text-gray-800 mb-1">Rent Reminders</Text>
              <Text className="text-sm text-gray-500 mb-3">
                How many days before rent is due you&apos;d like to be reminded (0–30).
              </Text>

              <View className="flex-row items-center justify-between">
                <TouchableOpacity
                  onPress={() => adjustReminder(-1)}
                  disabled={reminderDays <= REMINDER_MIN}
                  className={`w-12 h-12 rounded-md items-center justify-center ${reminderDays <= REMINDER_MIN ? 'bg-gray-200' : 'bg-brand'
                    }`}
                >
                  <MaterialIcons name="remove" size={24} color="#ffffff" />
                </TouchableOpacity>

                <View className="items-center">
                  <Text className="text-3xl font-bold text-gray-800">{reminderDays}</Text>
                  <Text className="text-sm text-gray-500">
                    {reminderDays === 0 ? 'On due date' : `day${reminderDays === 1 ? '' : 's'} before`}
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={() => adjustReminder(1)}
                  disabled={reminderDays >= REMINDER_MAX}
                  className={`w-12 h-12 rounded-md items-center justify-center ${reminderDays >= REMINDER_MAX ? 'bg-gray-200' : 'bg-brand'
                    }`}
                >
                  <MaterialIcons name="add" size={24} color="#ffffff" />
                </TouchableOpacity>
              </View>
            </Card>

            {/* Save */}
            <TouchableOpacity
              onPress={save}
              disabled={updatePaymentPrefs.isPending}
              className={`py-4 rounded-md mt-2 ${updatePaymentPrefs.isPending ? 'bg-gray-300' : 'bg-brand'
                }`}
            >
              <Text className="text-white font-semibold text-center text-lg">
                {updatePaymentPrefs.isPending ? 'Saving...' : 'Save Changes'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </SafeAreaWrapper>
  );
}
