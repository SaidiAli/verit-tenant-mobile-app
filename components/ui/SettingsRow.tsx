import React, { ReactNode } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface SettingsRowProps {
  icon: keyof typeof MaterialIcons.glyphMap;
  /** Tailwind bg class for the 31px icon tile, e.g. 'bg-brand-light'. */
  iconBgClass?: string;
  /** Icon tint. */
  iconColor?: string;
  label: string;
  /** Optional 12px second line under the label. */
  description?: string;
  /** Right-side control (Switch, value text). Replaces the chevron. */
  right?: ReactNode;
  onPress?: () => void;
  disabled?: boolean;
}

/**
 * FinWise settings row (Figma 9.5.3-A Settings): 31px rounded icon tile,
 * 15px Medium label, right chevron, ~48px row pitch. Flat — no card chrome.
 */
export function SettingsRow({
  icon,
  iconBgClass = 'bg-brand-light',
  iconColor = '#524768',
  label,
  description,
  right,
  onPress,
  disabled = false,
}: SettingsRowProps) {
  const body = (
    <View className="flex-row items-center gap-[23px] py-[13px]">
      <View
        className={`w-[31px] h-[31px] rounded-[10px] items-center justify-center ${iconBgClass}`}
      >
        <MaterialIcons name={icon} size={17} color={iconColor} />
      </View>
      <View className="flex-1">
        <Text className="text-[15px] font-medium text-finance-fence">{label}</Text>
        {description ? (
          <Text className="text-[12px] text-gray-400 mt-0.5">{description}</Text>
        ) : null}
      </View>
      {right ??
        (onPress ? (
          <MaterialIcons name="chevron-right" size={18} color="#9CA3AF" />
        ) : null)}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.7}
      >
        {body}
      </TouchableOpacity>
    );
  }
  return body;
}
