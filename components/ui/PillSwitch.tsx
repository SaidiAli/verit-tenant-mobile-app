import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

export interface PillOption<T extends string = string> {
  id: T;
  label: string;
  count?: number;
}

interface PillSwitchProps<T extends string = string> {
  options: PillOption<T>[];
  selected: T;
  onSelect: (id: T) => void;
  className?: string;
}

/**
 * FinWise segmented control (Figma "Switch2"): 60px tall track with a 22px
 * radius, colored 50px active pill with 19px radius, 31px/10px inactive
 * options, 24px gaps, 15px labels in dark teal.
 */
export function PillSwitch<T extends string = string>({
  options,
  selected,
  onSelect,
  className = '',
}: PillSwitchProps<T>) {
  return (
    <View
      className={`flex-row items-center justify-center bg-brand-light rounded-[22px] h-[60px] px-[14px] py-[6px] ${className}`}
    >
      {options.map((option, index) => {
        const isSelected = option.id === selected;

        return (
          <TouchableOpacity
            key={option.id}
            activeOpacity={0.8}
            onPress={() => onSelect(option.id)}
            className={`flex-1 items-center justify-center rounded-[19px] h-[50px] ${
              index > 0 ? 'ml-[24px]' : ''
            } ${isSelected ? 'bg-finance' : ''}`}
          >
            <View className="flex-row items-center">
              <Text
                className={`text-[15px] ${
                  isSelected
                    ? 'text-finance-fence font-medium'
                    : 'text-finance-fence/70 font-normal'
                }`}
              >
                {option.label}
              </Text>
              {option.count !== undefined && option.count > 0 && (
                <View
                  className={`ml-1.5 px-1.5 py-0.5 rounded-full ${
                    isSelected ? 'bg-finance-fence/15' : 'bg-finance-fence/10'
                  }`}
                >
                  <Text className="text-[10px] font-semibold text-finance-fence">
                    {option.count}
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
