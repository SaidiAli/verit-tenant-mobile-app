import React, { useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';

interface PinInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  disabled?: boolean;
  hasError?: boolean;
  placeholder?: string;
}

export function PinInput({
  length = 6,
  value,
  onChange,
  onComplete,
  disabled = false,
  hasError = false,
  placeholder = 'Enter 6-digit code',
}: PinInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<React.ComponentRef<typeof TextInput>>(null);

  const digits = Array.from({ length }, (_, i) => value[i] || '');

  return (
    <View className="items-center my-2 relative w-full">
      {/* Visual FinWise 6-Pin Bubbles */}
      <TouchableOpacity
        activeOpacity={1}
        onPress={() => inputRef.current?.focus()}
        className="flex-row justify-center items-center gap-2 py-2 w-full"
      >
        {digits.map((char, index) => {
          const isCurrent = isFocused && index === Math.min(value.length, length - 1);
          const isFilled = !!char;

          const borderColor = hasError
            ? 'border-red-500'
            : isCurrent
              ? 'border-brand'
              : isFilled
                ? 'border-brand/40'
                : 'border-gray-200';

          const bgColor = isCurrent
            ? 'bg-brand/5'
            : isFilled
              ? 'bg-gray-50'
              : 'bg-white';

          return (
            <View
              key={index}
              // flex-1 + max-w-12 lets the bubbles shrink on narrow screens
              // (fixed w-12 bubbles overflow on 360dp-wide devices) while
              // capping their size on tablets.
              className={`flex-1 max-w-12 h-14 rounded-2xl border-2 items-center justify-center ${borderColor} ${bgColor}`}
            >
              <Text className="text-xl font-bold text-gray-900">
                {char || ''}
              </Text>
            </View>
          );
        })}
      </TouchableOpacity>

      {/* Underlying TextInput for accessible typing, paste, SMS autofill & test
       * runners. It stays invisible (opacity 0.01) — the `placeholder` is kept
       * because the Node test harness locates inputs by placeholder text. */}
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={(text) => {
          const sanitized = text.replace(/[^0-9]/g, '').slice(0, length);
          onChange(sanitized);
          if (sanitized.length === length && onComplete) {
            onComplete(sanitized);
          }
        }}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        keyboardType="number-pad"
        maxLength={length}
        placeholder={placeholder}
        editable={!disabled}
        style={{
          position: 'absolute',
          opacity: 0.01,
          width: '100%',
          height: '100%',
          top: 0,
          left: 0,
        }}
      />
    </View>
  );
}
