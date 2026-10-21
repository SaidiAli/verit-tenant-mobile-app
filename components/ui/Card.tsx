import { ReactNode } from 'react';
import { View, Text, StyleSheet } from 'react-native';

const elevation = StyleSheet.create({
  card: {
    shadowColor: '#1F2937',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  cardSm: {
    shadowColor: '#1F2937',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
});

interface CardProps {
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'brand' | 'finance' | 'tinted';
  /** Includes the default `p-4` padding. Set to false when the caller passes
   * its own padding via `className` — conflicting `p-*` classes are resolved
   * by stylesheet order in NativeWind, not by class-string order, so callers
   * can't reliably override the base padding. */
  padded?: boolean;
}

export function Card({
  children,
  className = '',
  variant = 'default',
  padded = true,
}: CardProps) {
  const variantStyles = {
    default: 'bg-white border border-gray-100',
    brand: 'bg-brand text-white border border-brand-dark',
    finance: 'bg-finance-honeydew border border-finance-light',
    tinted: 'bg-brand-light border border-brand-muted/60',
  }[variant];

  return (
    <View
      style={elevation.card}
      className={`rounded-2xl ${padded ? 'p-4' : ''} ${variantStyles} ${className}`}
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
  variant?: 'default' | 'danger' | 'brand' | 'finance';
}

export function MetricCard({
  title,
  value,
  subtitle,
  icon,
  className = '',
  variant = 'default',
}: MetricCardProps) {
  const isFilled = variant === 'brand';
  const isFinance = variant === 'finance';
  const isDanger = variant === 'danger';

  const containerClasses =
    variant === 'danger'
      ? 'flex-1 rounded-2xl p-4 bg-red-50 border border-red-100'
      : variant === 'brand'
        ? 'flex-1 rounded-2xl p-4 bg-brand border border-brand-dark'
        : variant === 'finance'
          ? 'flex-1 rounded-2xl p-4 bg-finance-honeydew border border-finance-light'
          : 'flex-1 rounded-2xl p-4 bg-white border border-gray-100';

  const titleColor = isFilled
    ? 'text-white/80'
    : isFinance
      ? 'text-finance-dark/70'
      : isDanger
        ? 'text-red-700'
        : 'text-gray-500';

  const valueColor = isFilled
    ? 'text-white'
    : isFinance
      ? 'text-finance-dark font-bold'
      : isDanger
        ? 'text-red-900 font-bold'
        : 'text-gray-900 font-semibold';

  const subtitleColor = isFilled
    ? 'text-white/70'
    : isFinance
      ? 'text-emerald-700'
      : isDanger
        ? 'text-red-600'
        : 'text-gray-500';

  return (
    <View style={elevation.cardSm} className={`${containerClasses} ${className}`}>
      <View className="space-y-1">
        <View className="flex-row justify-between items-start">
          <View className="flex-1 space-y-1">
            <Text className={`text-xs font-medium uppercase tracking-wider ${titleColor}`}>
              {title}
            </Text>
            <Text className={`text-xl tracking-tight ${valueColor}`}>{value}</Text>
            {subtitle ? (
              <View className="flex-row items-center mt-1">
                <Text className={`text-xs font-medium ${subtitleColor}`}>
                  {subtitle}
                </Text>
              </View>
            ) : null}
          </View>
          {icon && (
            <View className="ml-2 w-9 h-9 rounded-full items-center justify-center bg-black/5">
              {icon}
            </View>
          )}
        </View>
      </View>
    </View>
  );
}
