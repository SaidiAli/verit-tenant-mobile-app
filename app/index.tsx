import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { secureStorage } from '../lib/storage';

export default function IndexScreen() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    let mounted = true;
    const checkInitialRoute = async () => {
      if (isLoading) return;
      if (isAuthenticated) {
        router.replace('/(tabs)');
      } else {
        const hasOnboarded = await secureStorage.isOnboardingCompleted();
        if (!mounted) return;
        if (!hasOnboarded) {
          router.replace('/onboarding');
        } else {
          router.replace('/(auth)/login');
        }
      }
    };

    checkInitialRoute();
    return () => {
      mounted = false;
    };
  }, [isAuthenticated, isLoading, router]);

  return (
    <View className="flex-1 bg-brand justify-center items-center">
      <ActivityIndicator size="large" color="white" />
    </View>
  );
}