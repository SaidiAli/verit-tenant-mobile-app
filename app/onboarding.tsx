import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { BRAND_COLOR } from '@/constants/theme';
import { SafeAreaWrapper } from '@/components/ui/SafeAreaWrapper';
import { secureStorage } from '@/lib/storage';

const { width } = Dimensions.get('window');

interface Slide {
  id: string;
  title: string;
  subtitle: string;
  iconName: keyof typeof MaterialIcons.glyphMap;
  badge: string;
}

const SLIDES: Slide[] = [
  {
    id: '1',
    badge: 'TENANT PORTAL',
    title: 'Manage Your Tenancy with Confidence',
    subtitle:
      'View your lease agreements, active units, and tenancy history all from a single modern hub.',
    iconName: 'home-work',
  },
  {
    id: '2',
    badge: 'RENT & BALANCES',
    title: 'Effortless & Transparent Payments',
    subtitle:
      'Pay rent and deposits directly via Mobile Money or Card. Receive instant automated receipts.',
    iconName: 'account-balance-wallet',
  },
  {
    id: '3',
    badge: 'INSTANT SERVICE',
    title: 'Rapid Maintenance Requests',
    subtitle:
      'Report repairs, attach photos, and track resolution status in real-time with property managers.',
    iconName: 'build-circle',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollRef = useRef<any>(null);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffsetX / width);
    if (index !== currentIndex && index >= 0 && index < SLIDES.length) {
      setCurrentIndex(index);
    }
  };

  const handleNext = async () => {
    if (currentIndex < SLIDES.length - 1) {
      scrollRef.current?.scrollTo({
        x: (currentIndex + 1) * width,
        animated: true,
      });
      setCurrentIndex(currentIndex + 1);
    } else {
      await handleFinish();
    }
  };

  const handleFinish = async () => {
    await secureStorage.setOnboardingCompleted(true);
    router.replace('/(auth)/login');
  };

  return (
    <SafeAreaWrapper>
      <View className="flex-1 bg-[#F5F3F8]">
        {/* Top Header with Skip Button */}
        <View className="flex-row justify-between items-center px-6 pt-4 pb-2">
          <View className="flex-row items-center gap-1.5">
            <View className="w-2.5 h-2.5 rounded-full bg-brand" />
            <Text className="text-xs font-bold tracking-widest text-brand uppercase">
              Verit
            </Text>
          </View>
          {currentIndex < SLIDES.length - 1 ? (
            <TouchableOpacity
              onPress={handleFinish}
              activeOpacity={0.7}
              className="py-1 px-3 rounded-full bg-white/80"
            >
              <Text className="text-xs font-semibold text-gray-600">Skip</Text>
            </TouchableOpacity>
          ) : (
            <View className="w-12" />
          )}
        </View>

        {/* Illustrations / Visual Hero Carousel */}
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleScroll}
          className="flex-1"
        >
          {SLIDES.map((slide) => (
            <View
              key={slide.id}
              style={{ width }}
              className="flex-1 items-center justify-center px-8"
            >
              <View className="w-56 h-56 rounded-full bg-brand/10 items-center justify-center relative">
                <View className="w-44 h-44 rounded-full bg-white shadow-sm items-center justify-center">
                  <MaterialIcons
                    name={slide.iconName}
                    size={80}
                    color={BRAND_COLOR}
                  />
                </View>
                {/* Floating financial accent bubble */}
                <View className="absolute top-4 right-4 w-10 h-10 rounded-full bg-[#00D09E] items-center justify-center shadow-md">
                  <MaterialIcons name="check" size={22} color="white" />
                </View>
              </View>
            </View>
          ))}
        </ScrollView>

        {/* FinWise Curved Bottom Sheet */}
        <View
          className="bg-white rounded-t-[36px] px-8 pt-8 pb-10 shadow-lg border-t border-gray-100"
          style={{
            shadowColor: '#1F2937',
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.08,
            shadowRadius: 16,
            elevation: 10,
          }}
        >
          {/* Badge */}
          <View className="self-start mb-3 px-3 py-1 rounded-full bg-brand/10">
            <Text className="text-[11px] font-bold tracking-wider text-brand">
              {SLIDES[currentIndex].badge}
            </Text>
          </View>

          {/* Title & Subtitle */}
          <Text className="text-2xl font-bold text-gray-900 leading-tight mb-2">
            {SLIDES[currentIndex].title}
          </Text>
          <Text className="text-sm text-gray-500 leading-relaxed min-h-[48px] mb-8">
            {SLIDES[currentIndex].subtitle}
          </Text>

          {/* Controls: Pagination Indicator & Action Button */}
          <View className="flex-row items-center justify-between">
            {/* 3-Dot Pagination Indicator */}
            <View className="flex-row items-center gap-1.5">
              {SLIDES.map((_, index) => {
                const isActive = index === currentIndex;
                return (
                  <View
                    key={index}
                    className={`h-2 rounded-full transition-all ${
                      isActive ? 'w-8 bg-brand' : 'w-2 bg-gray-200'
                    }`}
                  />
                );
              })}
            </View>

            {/* Next / Get Started Button */}
            <TouchableOpacity
              onPress={handleNext}
              activeOpacity={0.8}
              className="flex-row items-center gap-2 bg-brand px-6 py-3.5 rounded-2xl shadow-sm"
              style={{
                shadowColor: BRAND_COLOR,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.25,
                shadowRadius: 8,
                elevation: 4,
              }}
            >
              <Text className="text-white font-semibold text-base">
                {currentIndex === SLIDES.length - 1 ? 'Get Started' : 'Next'}
              </Text>
              <MaterialIcons name="arrow-forward" size={18} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaWrapper>
  );
}
