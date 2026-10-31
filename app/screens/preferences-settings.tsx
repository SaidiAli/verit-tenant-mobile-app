import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { SafeAreaWrapper } from '../../components/ui/SafeAreaWrapper';
import { FinWiseScreen } from '../../components/ui/FinWiseScreen';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { useServerSettings } from '../../hooks/useServerSettings';
import { useAuth } from '../../hooks/useAuth';
import { PreferenceLanguage, PreferenceSettings } from '../../types';

const LANGUAGES: { value: PreferenceLanguage; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'sw', label: 'Swahili' },
  { value: 'lg', label: 'Luganda' },
];

const TIMEZONES = ['Africa/Kampala', 'Africa/Nairobi', 'Africa/Dar_es_Salaam'];

export default function PreferencesSettingsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { settings, isLoading, updatePreferences } = useServerSettings();

  const [language, setLanguage] = useState<PreferenceLanguage>('en');
  const [timezone, setTimezone] = useState('Africa/Kampala');
  const [isDirty, setIsDirty] = useState(false);
  const [previousUserId, setPreviousUserId] = useState(user?.id);
  const accountChanged = previousUserId !== user?.id;
  if (accountChanged) {
    setPreviousUserId(user?.id);
    setIsDirty(false);
  }

  const [previousSettings, setPreviousSettings] = useState<PreferenceSettings | undefined>(undefined);
  if (accountChanged || previousSettings !== settings?.preferences) {
    setPreviousSettings(settings?.preferences);
    const p = settings?.preferences;
    if ((!isDirty || accountChanged) && (p || accountChanged)) {
      setLanguage(p?.language ?? 'en');
      setTimezone(p?.timezone || 'Africa/Kampala');
    }
  }

  const save = () => {
    updatePreferences.mutate(
      { language, timezone },
      { onSuccess: () => router.back() }
    );
  };

  if (isLoading) {
    return <LoadingSpinner message="Loading preferences..." />;
  }

  return (
    <SafeAreaWrapper>
      <FinWiseScreen
        title="Preferences"
        onBack={() => router.back()}
        header={<View />}
        headerClassName="px-9 pt-6 pb-8"
      >
        <View className="space-y-9">
          {/* Language */}
          <View>
            <Text className="text-[15px] font-medium text-finance-fence mb-3">Language</Text>
            <View className="gap-2">
              {LANGUAGES.map((lang) => {
                const selected = language === lang.value;
                return (
                  <TouchableOpacity
                    key={lang.value}
                    onPress={() => { setIsDirty(true); setLanguage(lang.value); }}
                    className={`flex-row justify-between items-center h-[45px] px-4 rounded-[18px] ${selected ? 'bg-brand-light' : 'bg-white border border-gray-100'
                      }`}
                  >
                    <Text className={`text-[15px] font-medium ${selected ? 'text-brand' : 'text-finance-fence'}`}>
                      {lang.label}
                    </Text>
                    {selected ? (
                      <MaterialIcons name="check-circle" size={20} color="#00D09E" />
                    ) : (
                      <MaterialIcons name="radio-button-unchecked" size={20} color="#9CA3AF" />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Timezone */}
          <View>
            <Text className="text-[15px] font-medium text-finance-fence mb-3">Timezone</Text>
            <View className="gap-2">
              {TIMEZONES.map((tz) => {
                const selected = timezone === tz;
                return (
                  <TouchableOpacity
                    key={tz}
                    onPress={() => { setIsDirty(true); setTimezone(tz); }}
                    className={`flex-row justify-between items-center h-[45px] px-4 rounded-[18px] ${selected ? 'bg-brand-light' : 'bg-white border border-gray-100'
                      }`}
                  >
                    <Text className={`text-[15px] font-medium ${selected ? 'text-brand' : 'text-finance-fence'}`}>
                      {tz.replace('Africa/', '').replace('_', ' ')}
                    </Text>
                    {selected ? (
                      <MaterialIcons name="check-circle" size={20} color="#00D09E" />
                    ) : (
                      <MaterialIcons name="radio-button-unchecked" size={20} color="#9CA3AF" />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Save */}
          <TouchableOpacity
            onPress={save}
            disabled={updatePreferences.isPending}
            className={`h-[45px] rounded-[30px] items-center justify-center ${
              updatePreferences.isPending ? 'bg-brand-light' : 'bg-finance'
            }`}
          >
            <Text
              className={`font-semibold text-[15px] ${
                updatePreferences.isPending ? 'text-gray-400' : 'text-finance-fence'
              }`}
            >
              {updatePreferences.isPending ? 'Saving...' : 'Save Changes'}
            </Text>
          </TouchableOpacity>
        </View>
      </FinWiseScreen>
    </SafeAreaWrapper>
  );
}
