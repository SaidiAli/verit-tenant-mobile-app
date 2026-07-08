import { BRAND_COLOR } from '@/constants/theme';
import { ScrollView, View, Text, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Card } from '../../components/ui/Card';
import { SafeAreaWrapper } from '../../components/ui/SafeAreaWrapper';

interface SettingsRow {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  description: string;
  route: string;
}

const SECTIONS: SettingsRow[] = [
  {
    icon: 'person',
    label: 'Profile',
    description: 'Name, email and phone number',
    route: '/screens/edit-profile',
  },
  {
    icon: 'lock',
    label: 'Security',
    description: 'Change your password',
    route: '/screens/change-password',
  },
  {
    icon: 'notifications',
    label: 'Notifications',
    description: 'Channels and quiet hours',
    route: '/screens/notifications-settings',
  },
  {
    icon: 'tune',
    label: 'Preferences',
    description: 'Language and timezone',
    route: '/screens/preferences-settings',
  },
  {
    icon: 'payments',
    label: 'Payment Preferences',
    description: 'Mobile money and reminders',
    route: '/screens/payment-preferences',
  },
];

export default function SettingsScreen() {
  const router = useRouter();

  return (
    <SafeAreaWrapper>
      <View className="flex-1 bg-gray-50">
        <ScrollView showsVerticalScrollIndicator={false}>
          <View className="px-4 pt-6 pb-4">

            <Card>
              <View className="space-y-1">
                {SECTIONS.map((section, index) => (
                  <TouchableOpacity
                    key={section.route}
                    className={`flex-row justify-between items-center py-3 px-2 rounded-md ${index !== SECTIONS.length - 1 ? 'border-b border-gray-100' : ''
                      }`}
                    onPress={() => router.push(section.route as any)}
                  >
                    <View className="flex-row items-center gap-3 flex-1">
                      <MaterialIcons name={section.icon} size={22} color={BRAND_COLOR} />
                      <View className="flex-1">
                        <Text className="font-medium text-gray-800">{section.label}</Text>
                        <Text className="text-sm text-gray-500">{section.description}</Text>
                      </View>
                    </View>
                    <MaterialIcons name="chevron-right" size={20} color="#9CA3AF" />
                  </TouchableOpacity>
                ))}
              </View>
            </Card>
          </View>
        </ScrollView>
      </View>
    </SafeAreaWrapper>
  );
}
