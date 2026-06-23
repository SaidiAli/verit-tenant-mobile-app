import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState, Component, ReactNode } from 'react';
import 'react-native-reanimated';
import { Text, TextInput, View } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  NunitoSans_300Light,
  NunitoSans_400Regular,
  NunitoSans_400Regular_Italic,
  NunitoSans_600SemiBold,
  NunitoSans_700Bold,
  NunitoSans_800ExtraBold,
} from '@expo-google-fonts/nunito-sans';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider } from '@/hooks/useAuth';
import { SettingsProvider } from '@/hooks/useSettings';
import { LeaseProvider } from '@/hooks/LeaseContext';

import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';
import '@/global.css';
import * as Sentry from '@sentry/react-native';

SplashScreen.preventAutoHideAsync();

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: Error) {
    Sentry.captureException(error);
  }
  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 8 }}>Something went wrong</Text>
          <Text style={{ color: '#6B7280', textAlign: 'center' }}>Please restart the app. If the problem persists, contact support.</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

// Apply Nunito Sans as the default font to all Text and TextInput components
(Text as any).defaultProps = { ...((Text as any).defaultProps ?? {}), style: [{ fontFamily: 'NunitoSans_400Regular' }, (Text as any).defaultProps?.style] };
(TextInput as any).defaultProps = { ...((TextInput as any).defaultProps ?? {}), style: [{ fontFamily: 'NunitoSans_400Regular' }, (TextInput as any).defaultProps?.style] };

Sentry.init({
  dsn: 'https://e268093b0b645c3bc79a5f4abd022243@o4510142309203968.ingest.de.sentry.io/4510142310383696',

  // Adds more context data to events (IP address, cookies, user, etc.)
  // For more information, visit: https://docs.sentry.io/platforms/react-native/data-management/data-collected/
  sendDefaultPii: false,
});

export const unstable_settings = {
  anchor: '(tabs)',
};

export default Sentry.wrap(function RootLayout() {
  const colorScheme = useColorScheme();
  const [fontsLoaded] = useFonts({
    NunitoSans_300Light,
    NunitoSans_400Regular,
    NunitoSans_400Regular_Italic,
    NunitoSans_600SemiBold,
    NunitoSans_700Bold,
    NunitoSans_800ExtraBold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            retry: 1,
          },
        },
      })
  );

  return (
    <ErrorBoundary>
    <GluestackUIProvider mode="light">
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <SettingsProvider>
            <LeaseProvider>
              <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
                <Stack screenOptions={{ headerShown: false }}>
                  <Stack.Screen name="(auth)" options={{ headerShown: false }} />
                  <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                  <Stack.Screen name="index" options={{ headerShown: false }} />
                  <Stack.Screen
                    name="screens/lease"
                    options={{
                      headerShown: true,
                      title: 'Lease Information',
                      headerStyle: { backgroundColor: '#524768' },
                      headerTintColor: 'white',
                      headerTitleStyle: { fontWeight: 'bold' }
                    }}
                  />
                  <Stack.Screen
                    name="screens/property"
                    options={{
                      headerShown: true,
                      title: 'Property Information',
                      headerStyle: { backgroundColor: '#524768' },
                      headerTintColor: 'white',
                      headerTitleStyle: { fontWeight: 'bold' }
                    }}
                  />
                  <Stack.Screen
                    name="screens/help"
                    options={{
                      headerShown: true,
                      title: 'Help & Resources',
                      headerStyle: { backgroundColor: '#524768' },
                      headerTintColor: 'white',
                      headerTitleStyle: { fontWeight: 'bold' }
                    }}
                  />
                  <Stack.Screen
                    name="screens/settings"
                    options={{ headerShown: false }}
                  />
                  <Stack.Screen
                    name="screens/notifications-settings"
                    options={{ headerShown: false }}
                  />
                  <Stack.Screen
                    name="screens/preferences-settings"
                    options={{ headerShown: false }}
                  />
                  <Stack.Screen
                    name="screens/payment-preferences"
                    options={{ headerShown: false }}
                  />
                  <Stack.Screen
                    name="screens/edit-profile"
                    options={{ headerShown: false }}
                  />
                  <Stack.Screen
                    name="screens/change-password"
                    options={{ headerShown: false }}
                  />
                  <Stack.Screen
                    name="screens/terms-of-service"
                    options={{ headerShown: false }}
                  />
                  <Stack.Screen
                    name="screens/privacy-policy"
                    options={{ headerShown: false }}
                  />
                  <Stack.Screen
                    name="screens/payment-history"
                    options={{
                      headerShown: true,
                      title: 'Payment History',
                      headerStyle: { backgroundColor: '#524768' },
                      headerTintColor: 'white',
                      headerTitleStyle: { fontWeight: 'bold' }
                    }}
                  />
                  <Stack.Screen
                    name="screens/payment-schedule"
                    options={{
                      headerShown: true,
                      title: 'Payment Schedule',
                      headerStyle: { backgroundColor: '#524768' },
                      headerTintColor: 'white',
                      headerTitleStyle: { fontWeight: 'bold' }
                    }}
                  />
                  <Stack.Screen
                    name="screens/maintenance-requests"
                    options={{
                      headerShown: true,
                      title: 'Maintenance Requests',
                      headerStyle: { backgroundColor: '#524768' },
                      headerTintColor: 'white',
                      headerTitleStyle: { fontWeight: 'bold' }
                    }}
                  />
                  <Stack.Screen
                    name="screens/create-maintenance-request"
                    options={{ headerShown: false }}
                  />
                </Stack>
                <StatusBar style="light" backgroundColor="#524768" />
              </ThemeProvider>
            </LeaseProvider>
          </SettingsProvider>
        </AuthProvider>
      </QueryClientProvider>
    </GluestackUIProvider>
    </ErrorBoundary>
  );
});