import React, { ReactNode } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

interface TransactionRowProps {
  /** Icon element rendered inside the 57x53 tile. */
  icon: ReactNode;
  /** Tailwind bg class for the icon tile, e.g. 'bg-vivid-blue'. */
  iconBgClass?: string;
  title: string;
  /** Small line under the title (Figma uses a 12px semibold timestamp in blue). */
  subtitle?: string;
  /** Tailwind class for the subtitle text. */
  subtitleClass?: string;
  /** Right-aligned amount, e.g. "-$674.40". */
  amount: string;
  /** Tailwind class for the amount text (Figma: Ocean Blue). */
  amountClass?: string;
  /** Optional right-side extra under the amount (e.g. StatusBadge). */
  rightExtra?: ReactNode;
  onPress?: () => void;
  disabled?: boolean;
}

/**
 * FinWise transaction row (Figma Rent screen): a 57x53 icon tile with 22px
 * radius, 15px medium title with a 12px semibold timestamp underneath, and a
 * right-aligned 15px amount.
 */
export function TransactionRow({
  icon,
  iconBgClass = 'bg-finance',
  title,
  subtitle,
  subtitleClass = 'text-ocean',
  amount,
  amountClass = 'text-ocean',
  rightExtra,
  onPress,
  disabled = false,
}: TransactionRowProps) {
  const body = (
    <View className="flex-row items-center gap-[13px] py-[14px]">
      <View
        className={`w-[57px] h-[53px] rounded-[22px] items-center justify-center ${iconBgClass}`}
      >
        {icon}
      </View>
      <View className="flex-1">
        <Text className="text-[15px] font-medium text-finance-fence">{title}</Text>
        {subtitle ? (
          <Text className={`text-[12px] font-semibold ${subtitleClass}`}>{subtitle}</Text>
        ) : null}
      </View>
      <View className="items-end">
        <Text className={`text-[15px] font-medium ${amountClass}`}>{amount}</Text>
        {rightExtra ? <View className="mt-1.5">{rightExtra}</View> : null}
      </View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} disabled={disabled} activeOpacity={0.7}>
        {body}
      </TouchableOpacity>
    );
  }
  return body;
}
