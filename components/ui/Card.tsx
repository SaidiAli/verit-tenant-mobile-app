import { ReactNode } from 'react';
import { View, Text, StyleSheet } from 'react-native';

const elevation = StyleSheet.create({
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
});

interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className = '' }: CardProps) {
  return (
    <View
      style={elevation.card}
      className={`bg-white rounded-lg p-4 border border-gray-200 ${className}`}
    >
      {children}
    </View>
  );
}

interface MetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon?: ReactNode;
  className?: string;
  variant?: 'default' | 'danger' | 'brand';
}

export function MetricCard({ title, value, subtitle, icon, className = '', variant = 'default' }: MetricCardProps) {
  const filled = variant === 'danger' || variant === 'brand';
  const container =
    variant === 'danger'
      ? 'flex-1 rounded-lg p-4 bg-red-600 border border-red-600'
      : variant === 'brand'
        ? 'flex-1 rounded-lg p-4 bg-brand border border-brand'
        : 'flex-1 rounded-lg p-4 bg-white border border-gray-200';
  return (
    <View style={elevation.card} className={`${container} ${className}`}>
      <View className="space-y-1">
        <View className="flex-row justify-between items-start">
          <View className="flex-1 space-y-1">
            <Text className={`text-body ${filled ? 'text-white' : 'text-gray-600'}`}>{title}</Text>
            <Text className={`text-2xl font-semibold ${filled ? 'text-white' : 'text-gray-800'}`}>{value}</Text>
            {subtitle && (
              <Text className={`text-xs ${filled ? 'text-white' : 'text-gray-500'}`}>{subtitle}</Text>
            )}
          </View>
          {icon && (
            <View className="ml-2">{icon}</View>
          )}
        </View>
      </View>
    </View>
  );
}