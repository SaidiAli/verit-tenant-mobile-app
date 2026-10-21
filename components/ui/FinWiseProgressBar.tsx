import React from 'react';
import { View, Text } from 'react-native';

interface FinWiseProgressBarProps {
  /** 0–100. Portion covered by the filled (leading) segment. */
  percent: number;
  /** Label inside the filled segment, e.g. "30%". */
  filledLabel: string;
  /** Label inside the remaining segment, e.g. "$20,000.00". */
  remainingLabel: string;
}

/**
 * FinWise two-segment progress bar (Figma nodes 7110:4827–4829): 27px tall,
 * 13.5px radius, filled segment solid, remainder translucent, labels inline.
 * Designed to sit directly on the colored hero area.
 */
export function FinWiseProgressBar({
  percent,
  filledLabel,
  remainingLabel,
}: FinWiseProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, percent));

  return (
    <View className="flex-row w-full h-[27px] rounded-[13.5px] overflow-hidden">
      <View
        className="h-full items-center justify-center bg-white"
        style={{ flex: Math.max(clamped, 0.001) }}
      >
        <Text className="text-brand text-[11px] font-semibold">{filledLabel}</Text>
      </View>
      <View
        className="h-full items-center justify-center bg-white/20"
        style={{ flex: Math.max(100 - clamped, 0.001) }}
      >
        <Text className="text-white text-[12px]">{remainingLabel}</Text>
      </View>
    </View>
  );
}
