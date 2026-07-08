import { ReactNode } from 'react';
import { View, Text } from 'react-native';

interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className = '' }: CardProps) {
  return (
    <View className={`bg-white rounded-lg shadow-sm p-4 border border-gray-200 ${className}`}>
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
  variant?: 'default' | 'danger';
}

export function MetricCard({ title, value, subtitle, icon, className = '', variant = 'default' }: MetricCardProps) {
  const danger = variant === 'danger';
  const container = danger
    ? 'flex-1 rounded-lg shadow-sm p-4 bg-red-600 border border-red-600'
    : 'flex-1 rounded-lg shadow-sm p-4 bg-white border border-gray-200';
  return (
    <View className={`${container} ${className}`}>
      <View className="space-y-1">
        <View className="flex-row justify-between items-start">
          <View className="flex-1 space-y-1">
            <Text className={`text-sm ${danger ? 'text-white' : 'text-gray-600'}`}>{title}</Text>
            <Text className={`text-lg font-semibold ${danger ? 'text-white' : 'text-gray-800'}`}>{value}</Text>
            {subtitle && (
              <Text className={`text-xs ${danger ? 'text-white' : 'text-gray-500'}`}>{subtitle}</Text>
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