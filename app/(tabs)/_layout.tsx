import { Tabs, Redirect } from 'expo-router';
import React from 'react';
import { StyleSheet, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { HapticTab } from '@/components/haptic-tab';
import { BRAND_COLOR, BRAND_LIGHT } from '@/constants/theme';
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
          // FinWise bottom navigation: light fill with 70px rounded top corners,
          // tall rhythm (36/41 padding in the kit) and no top border.
          backgroundColor: BRAND_LIGHT,
          borderTopWidth: 0,
          borderTopLeftRadius: 70,
          borderTopRightRadius: 70,
          height: Platform.OS === 'ios' ? 118 : 98,
          paddingTop: 28,
          paddingHorizontal: 50,
          ...styles.shadow,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
          marginTop: 3,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ focused }) => (
            <MaterialIcons
              name={focused ? 'grid-view' : 'grid-view'}
              size={26}
              color={focused ? BRAND_COLOR : '#9CA3AF'}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="payments"
        options={{
          title: 'Payments',
          tabBarIcon: ({ focused }) => (
            <MaterialIcons
              name="account-balance-wallet"
              size={26}
              color={focused ? BRAND_COLOR : '#9CA3AF'}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => (
            <MaterialIcons
              name={focused ? 'person' : 'person-outline'}
              size={26}
              color={focused ? BRAND_COLOR : '#9CA3AF'}
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  shadow: {
    shadowColor: '#1F2937',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 10,
  },
});
