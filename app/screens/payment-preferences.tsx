import { View, Text, TouchableOpacity, TextInput } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { SafeAreaWrapper } from '../../components/ui/SafeAreaWrapper';
import { FinWiseScreen } from '../../components/ui/FinWiseScreen';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { useServerSettings } from '../../hooks/useServerSettings';
import { useAuth } from '../../hooks/useAuth';
import { getMobileMoneyProvider } from '../../lib/currency';
import { MobileMoneyProviderId, PaymentPreferences } from '../../types';

const PHONE_RE = /^(\+?256|0)[0-9]{9}$/;

const PROVIDERS: { value: MobileMoneyProviderId; label: string }[] = [
  { value: 'mtn', label: 'MTN' },
  { value: 'airtel', label: 'Airtel' }
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
  const [isDirty, setIsDirty] = useState(false);

  const [previous, setPrevious] = useState<{ settings: PaymentPreferences | null | undefined; isLoading: boolean; phone: string | undefined; userId: string | undefined }>({ settings: undefined, isLoading: true, phone: undefined, userId: user?.id });
  const accountChanged = previous.userId !== user?.id;
  if (accountChanged) setIsDirty(false);
  if (accountChanged || previous.settings !== settings?.paymentPreferences || previous.isLoading !== isLoading || previous.phone !== user?.phone) {
    setPrevious({ settings: settings?.paymentPreferences, isLoading, phone: user?.phone, userId: user?.id });
    if ((!isDirty || accountChanged) && (!isLoading || accountChanged)) {
      const p = settings?.paymentPreferences;
      // Fall back to the tenant's profile phone (and phone-derived provider) when unset
      const fallbackPhone = user?.phone ?? '';
      const detected = fallbackPhone ? getMobileMoneyProvider(fallbackPhone) : 'unknown';
      setPhone(p?.mobileMoneyPhone ?? fallbackPhone);
      setProvider(
        p?.mobileMoneyProvider ?? (detected === 'unknown' ? null : detected)
      );
      setReminderDays(p?.reminderDaysBefore ?? 3);
    }
  }

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
    setIsDirty(true);
    setReminderDays((d) => Math.min(REMINDER_MAX, Math.max(REMINDER_MIN, d + delta)));
  };

  if (isLoading) {
    return <LoadingSpinner message="Loading payment preferences..." />;
  }

  return (
    <SafeAreaWrapper>
      <FinWiseScreen
        title="Payment Preferences"
        onBack={() => router.back()}
        header={<View />}
        headerClassName="px-9 pt-6 pb-8"
      >
        <View className="gap-9">
          {/* Mobile money account */}
          <View>
            <Text className="text-[15px] font-medium text-finance-fence mb-1">Mobile Money</Text>
            <Text className="text-[13px] text-gray-500 mb-3 leading-relaxed">
              Used to pre-fill your rent payments. Leave blank to use your profile phone number.
            </Text>

            <View className="mb-5">
              <Text className="text-[15px] font-medium text-finance-fence mb-2">Mobile Money Number</Text>
              <TextInput
                value={phone}
                onChangeText={(t) => {
                  setIsDirty(true);
                  setPhone(t);
                  if (errors.phone) setErrors((p) => ({ ...p, phone: '' }));
                }}
                placeholder="0XXXXXXXXX"
                placeholderTextColor="#9CA3AF"
                keyboardType="phone-pad"
                className={`h-[41px] rounded-[18px] px-4 text-[16px] text-finance-fence ${
                  errors.phone ? 'bg-red-50' : 'bg-brand-light'
                }`}
              />
              {errors.phone ? (
                <Text className="text-red-500 text-[12px] mt-1.5">{errors.phone}</Text>
              ) : null}
            </View>

            <Text className="text-[15px] font-medium text-finance-fence mb-2">Provider</Text>
            <View className="flex-row gap-3">
              {PROVIDERS.map((p) => {
                const selected = provider === p.value;
                return (
                  <TouchableOpacity
                    key={p.value}
                    onPress={() => {
                      setIsDirty(true);
                      setProvider(p.value);
                      if (errors.provider) setErrors((e) => ({ ...e, provider: '' }));
                    }}
                    className={`flex-1 h-[45px] rounded-[18px] items-center justify-center ${selected ? 'bg-brand-light' : 'bg-white border border-gray-100'
                      }`}
                  >
                    <Text className={`text-[15px] font-medium ${selected ? 'text-brand' : 'text-finance-fence'}`}>
                      {p.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {errors.provider ? (
              <Text className="text-red-500 text-[12px] mt-1.5">{errors.provider}</Text>
            ) : null}
          </View>

          {/* Reminder lead time */}
          <View>
            <Text className="text-[15px] font-medium text-finance-fence mb-1">Rent Reminders</Text>
            <Text className="text-[13px] text-gray-500 mb-3 leading-relaxed">
              How many days before rent is due you&apos;d like to be reminded (0–30).
            </Text>

            <View className="flex-row items-center justify-between">
              <TouchableOpacity
                onPress={() => adjustReminder(-1)}
                disabled={reminderDays <= REMINDER_MIN}
                className={`w-12 h-12 rounded-full items-center justify-center ${reminderDays <= REMINDER_MIN ? 'bg-gray-100' : 'bg-finance'
                  }`}
              >
                <MaterialIcons name="remove" size={24} color={reminderDays <= REMINDER_MIN ? '#9CA3AF' : '#052224'} />
              </TouchableOpacity>

              <View className="items-center">
                <Text className="text-[24px] font-bold text-finance-fence">{reminderDays}</Text>
                <Text className="text-[12px] text-gray-500">
                  {reminderDays === 0 ? 'On due date' : `day${reminderDays === 1 ? '' : 's'} before`}
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => adjustReminder(1)}
                disabled={reminderDays >= REMINDER_MAX}
                className={`w-12 h-12 rounded-full items-center justify-center ${reminderDays >= REMINDER_MAX ? 'bg-gray-100' : 'bg-finance'
                  }`}
              >
                <MaterialIcons name="add" size={24} color={reminderDays >= REMINDER_MAX ? '#9CA3AF' : '#052224'} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Save */}
          <TouchableOpacity
            onPress={save}
            disabled={updatePaymentPrefs.isPending}
            className={`h-[45px] rounded-[30px] items-center justify-center ${
              updatePaymentPrefs.isPending ? 'bg-brand-light' : 'bg-finance'
            }`}
          >
            <Text
              className={`font-semibold text-[15px] ${
                updatePaymentPrefs.isPending ? 'text-gray-400' : 'text-finance-fence'
              }`}
            >
              {updatePaymentPrefs.isPending ? 'Saving...' : 'Save Changes'}
            </Text>
          </TouchableOpacity>
        </View>
      </FinWiseScreen>
    </SafeAreaWrapper>
  );
}
