import React, { ReactElement, ReactNode } from 'react';
import { View, Text, ScrollView, RefreshControl, StyleProp, ViewStyle, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface FinWiseScreenProps {
  /** Content rendered directly on the colored (brand) background. */
  header: ReactNode;
  /** Content rendered inside the white bottom sheet. */
  children: ReactNode;
  /** Extra classes for the white sheet (e.g. custom bottom padding). */
  sheetClassName?: string;
  /** Extra classes for the header container (e.g. horizontal padding). */
  headerClassName?: string;
  /** Optional pull-to-refresh control for the scroll view. */
  refreshControl?: ReactElement<typeof RefreshControl>;
  /** Extra style on the root view. */
  style?: StyleProp<ViewStyle>;
  /** Sub-screen mode: renders the standard back button + 20px title bar
   * (Figma 9.5.x frames) above the header content. */
  title?: string;
  /** Called when the back button is pressed (sub-screen mode). */
  onBack?: () => void;
}

/**
 * FinWise screen anatomy: full brand-colored background with content on it,
 * flowing into a single white sheet anchored to the bottom with a 40px top
 * radius (Figma "Base Shape"). Side margins are 36px like the kit.
 *
 * Pass `title` + `onBack` for secondary screens to get the kit's sub-screen
 * header (back arrow at 38px left, centered 20px Semibold title at top ~64).
 */
export function FinWiseScreen({
  header,
  children,
  sheetClassName = '',
  headerClassName = '',
  refreshControl,
  style,
  title,
  onBack,
}: FinWiseScreenProps) {
  return (
    <View className="flex-1 bg-brand" style={style}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={refreshControl}
      >
        <View className={`shrink-0 ${headerClassName}`}>
          {onBack ? (
            <View className="flex-row items-center justify-center relative">
              <TouchableOpacity
                onPress={onBack}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                className="w-[30px] h-[30px] rounded-full bg-white/10 items-center justify-center absolute left-0"
                accessibilityRole="button"
                accessibilityLabel="Go back"
              >
                <MaterialIcons name="arrow-back" size={18} color="#FFFFFF" />
              </TouchableOpacity>
              {title ? (
                <Text className="text-[20px] leading-[22px] font-semibold text-white">
                  {title}
                </Text>
              ) : null}
            </View>
          ) : null}
          {header}
        </View>
        <View
          className={`flex-1 bg-white rounded-t-[40px] px-9 pt-8 pb-16 ${sheetClassName}`}
        >
          {children}
        </View>
      </ScrollView>
    </View>
  );
}
