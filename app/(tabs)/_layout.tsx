import { Tabs, Redirect } from 'expo-router';
import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { HapticTab } from '@/components/haptic-tab';
import { BRAND_COLOR } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';

export default function TabLayout() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return null;
  if (!isAuthenticated) return <Redirect href="/(auth)/login" />;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: BRAND_COLOR,
        tabBarInactiveTintColor: '#9CA3AF',
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#F3F4F6',
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 88 : 68,
          paddingTop: 8,
          paddingBottom: Platform.OS === 'ios' ? 28 : 10,
          ...styles.shadow,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ focused, size }) => (
            <View
              className={`px-3 py-1 rounded-full items-center justify-center ${
                focused ? 'bg-brand/10' : ''
              }`}
            >
              <MaterialIcons
                name="grid-view"
                size={size || 22}
                color={focused ? BRAND_COLOR : '#9CA3AF'}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="payments"
        options={{
          title: 'Payments',
          tabBarIcon: ({ focused, size }) => (
            <View
              className={`px-3 py-1 rounded-full items-center justify-center ${
                focused ? 'bg-brand/10' : ''
              }`}
            >
              <MaterialIcons
                name="account-balance-wallet"
                size={size || 22}
                color={focused ? BRAND_COLOR : '#9CA3AF'}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused, size }) => (
            <View
              className={`px-3 py-1 rounded-full items-center justify-center ${
                focused ? 'bg-brand/10' : ''
              }`}
            >
              <MaterialIcons
                name={focused ? 'person' : 'person-outline'}
                size={size || 22}
                color={focused ? BRAND_COLOR : '#9CA3AF'}
              />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  shadow: {
    shadowColor: '#1F2937',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 8,
  },
});
