import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaWrapper } from '../../components/ui/SafeAreaWrapper';
import { FinWiseScreen } from '../../components/ui/FinWiseScreen';
import { SettingsRow } from '../../components/ui/SettingsRow';

interface SettingsSection {
  icon: Parameters<typeof SettingsRow>[0]['icon'];
  label: string;
  description: string;
  route: string;
  iconBgClass?: string;
  iconColor?: string;
}

const SECTIONS: SettingsSection[] = [
  {
    icon: 'person',
    label: 'Profile',
    description: 'Name, email and phone number',
    route: '/screens/edit-profile',
    iconBgClass: 'bg-vivid-blue/15',
    iconColor: '#3299FF',
  },
  {
    icon: 'badge',
    label: 'Identity',
    description: 'National ID, TIN and documents',
    route: '/screens/identity',
    iconBgClass: 'bg-finance/15',
    iconColor: '#00D09E',
  },
  {
    icon: 'lock',
    label: 'Security',
    description: 'Change your password',
    route: '/screens/change-password',
    iconBgClass: 'bg-amber-400/20',
    iconColor: '#D97706',
  },
  {
    icon: 'notifications',
    label: 'Notifications',
    description: 'Channels and quiet hours',
    route: '/screens/notifications-settings',
    iconBgClass: 'bg-ocean/10',
    iconColor: '#0068FF',
  },
  {
    icon: 'tune',
    label: 'Preferences',
    description: 'Language and timezone',
    route: '/screens/preferences-settings',
    iconBgClass: 'bg-brand-light',
    iconColor: '#524768',
  },
  {
    icon: 'payments',
    label: 'Payment Preferences',
    description: 'Mobile money and reminders',
    route: '/screens/payment-preferences',
    iconBgClass: 'bg-ocean-light/30',
    iconColor: '#0068FF',
  },
];

export default function SettingsScreen() {
  const router = useRouter();

  return (
    <SafeAreaWrapper>
      <FinWiseScreen
        title="Settings"
        onBack={() => router.back()}
        header={<View />}
        headerClassName="px-9 pt-6 pb-8"
      >
        <View>
          {SECTIONS.map(section => (
            <SettingsRow
              key={section.route}
              icon={section.icon}
              iconBgClass={section.iconBgClass}
              iconColor={section.iconColor}
              label={section.label}
              description={section.description}
              onPress={() => router.push(section.route as any)}
            />
          ))}
        </View>
      </FinWiseScreen>
    </SafeAreaWrapper>
  );
}
