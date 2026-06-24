import { BRAND_COLOR } from '@/constants/theme';
import { View, Text, ActivityIndicator } from 'react-native';

interface LoadingSpinnerProps {
  message?: string;
  size?: 'small' | 'large';
  className?: string;
}

export function LoadingSpinner({
  message = 'Loading...',
  size = 'large',
  className = ''
}: LoadingSpinnerProps) {
  return (
    <View className={`flex-1 justify-center items-center ${className}`}>
      <ActivityIndicator size={size} color={BRAND_COLOR} className="mb-4" />
      {message && (
        <Text className="text-gray-600 text-center">{message}</Text>
      )}
    </View>
  );
}