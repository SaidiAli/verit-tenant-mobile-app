import React, { ReactElement, ReactNode } from 'react';
import { View, ScrollView, RefreshControl, StyleProp, ViewStyle } from 'react-native';

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
}

/**
 * FinWise screen anatomy: full brand-colored background with content on it,
 * flowing into a single white sheet anchored to the bottom with a 40px top
 * radius (Figma "Base Shape"). Side margins are 36px like the kit.
 */
export function FinWiseScreen({
  header,
  children,
  sheetClassName = '',
  headerClassName = '',
  refreshControl,
  style,
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
        <View className={`shrink-0 ${headerClassName}`}>{header}</View>
        <View
          className={`flex-1 bg-white rounded-t-[40px] px-9 pt-8 pb-16 ${sheetClassName}`}
        >
          {children}
        </View>
      </ScrollView>
    </View>
  );
}
