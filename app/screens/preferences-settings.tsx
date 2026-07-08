import { BRAND_COLOR } from '@/constants/theme';
import { ScrollView, View, Text, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { Card } from '../../components/ui/Card';
import { SafeAreaWrapper } from '../../components/ui/SafeAreaWrapper';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { useServerSettings } from '../../hooks/useServerSettings';
import { PreferenceLanguage } from '../../types';

const LANGUAGES: { value: PreferenceLanguage; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'sw', label: 'Swahili' },
  { value: 'lg', label: 'Luganda' },
];

const TIMEZONES = ['Africa/Kampala', 'Africa/Nairobi', 'Africa/Dar_es_Salaam'];

export default function PreferencesSettingsScreen() {
  const router = useRouter();
  const { settings, isLoading, updatePreferences } = useServerSettings();

  const [language, setLanguage] = useState<PreferenceLanguage>('en');
  const [timezone, setTimezone] = useState('Africa/Kampala');

  useEffect(() => {
    const p = settings?.preferences;
    if (p) {
      setLanguage(p.language);
      setTimezone(p.timezone || 'Africa/Kampala');
    }
  }, [settings?.preferences]);

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
              <Text className="text-xl font-semibold text-gray-800 ml-2">Preferences</Text>
            </View>

            {/* Language */}
            <Card className="mb-4">
              <Text className="text-lg font-semibold text-gray-800 mb-3">Language</Text>
              <View className="gap-2">
                {LANGUAGES.map((lang) => {
                  const selected = language === lang.value;
                  return (
                    <TouchableOpacity
                      key={lang.value}
                      onPress={() => setLanguage(lang.value)}
                      className={`flex-row justify-between items-center px-3 py-3 rounded-md border ${selected ? 'border-brand bg-brand/5' : 'border-gray-300 bg-white'
                        }`}
                    >
                      <Text className={`font-medium ${selected ? 'text-brand' : 'text-gray-800'}`}>
                        {lang.label}
                      </Text>
                      {selected ? (
                        <MaterialIcons name="check-circle" size={20} color={BRAND_COLOR} />
                      ) : (
                        <MaterialIcons name="radio-button-unchecked" size={20} color="#9CA3AF" />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </Card>

            {/* Timezone */}
            <Card className="mb-4">
              <Text className="text-lg font-semibold text-gray-800 mb-3">Timezone</Text>
              <View className="gap-2">
                {TIMEZONES.map((tz) => {
                  const selected = timezone === tz;
                  return (
                    <TouchableOpacity
                      key={tz}
                      onPress={() => setTimezone(tz)}
                      className={`flex-row justify-between items-center px-3 py-3 rounded-md border ${selected ? 'border-brand bg-brand/5' : 'border-gray-300 bg-white'
                        }`}
                    >
                      <Text className={`font-medium ${selected ? 'text-brand' : 'text-gray-800'}`}>
                        {tz.replace('Africa/', '').replace('_', ' ')}
                      </Text>
                      {selected ? (
                        <MaterialIcons name="check-circle" size={20} color={BRAND_COLOR} />
                      ) : (
                        <MaterialIcons name="radio-button-unchecked" size={20} color="#9CA3AF" />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </Card>

            {/* Save */}
            <TouchableOpacity
              onPress={save}
              disabled={updatePreferences.isPending}
              className={`py-4 rounded-md mt-2 ${updatePreferences.isPending ? 'bg-gray-300' : 'bg-brand'
                }`}
            >
              <Text className="text-white font-semibold text-center text-lg">
                {updatePreferences.isPending ? 'Saving...' : 'Save Changes'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </SafeAreaWrapper>
  );
}
