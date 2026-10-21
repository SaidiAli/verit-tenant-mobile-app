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
  size?: 'sm' | 'md';
}

export function PillSwitch<T extends string = string>({
  options,
  selected,
  onSelect,
  className = '',
  size = 'md',
}: PillSwitchProps<T>) {
  const isSmall = size === 'sm';

  return (
    <View
      className={`flex-row bg-gray-100/90 rounded-2xl p-1 items-center ${className}`}
    >
      {options.map((option) => {
        const isSelected = option.id === selected;

        return (
          <TouchableOpacity
            key={option.id}
            activeOpacity={0.7}
            onPress={() => onSelect(option.id)}
            className={`flex-1 flex-row items-center justify-center rounded-xl transition-all ${
              isSmall ? 'py-1.5 px-2' : 'py-2 px-3'
            } ${
              isSelected
                ? 'bg-white shadow-sm'
                : 'bg-transparent'
            }`}
          >
            <Text
              className={`font-medium ${isSmall ? 'text-xs' : 'text-sm'} ${
                isSelected ? 'text-gray-900 font-semibold' : 'text-gray-500'
              }`}
            >
              {option.label}
            </Text>
            {option.count !== undefined && option.count > 0 && (
              <View
                className={`ml-1.5 px-1.5 py-0.5 rounded-full ${
                  isSelected ? 'bg-brand/10' : 'bg-gray-200'
                }`}
              >
                <Text
                  className={`text-[10px] font-bold ${
                    isSelected ? 'text-brand' : 'text-gray-600'
                  }`}
                >
                  {option.count}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
