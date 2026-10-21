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
}

const SLIDES: Slide[] = [
  {
    id: '1',
    title: 'Manage Your Tenancy with Confidence',
    subtitle:
      'View your lease agreements, active units, and tenancy history all from a single modern hub.',
    iconName: 'home-work',
  },
  {
    id: '2',
    title: 'Effortless & Transparent Payments',
    subtitle:
      'Pay rent and deposits directly via Mobile Money or Card. Receive instant automated receipts.',
    iconName: 'account-balance-wallet',
  },
  {
    id: '3',
    title: 'Rapid Maintenance Requests',
    subtitle:
      'Report repairs, attach photos, and track resolution status in real-time with property managers.',
    iconName: 'build-circle',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollRef = useRef<React.ComponentRef<typeof ScrollView>>(null);

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
      <View className="flex-1 bg-brand">
        {/* Top Header with Skip */}
        <View className="flex-row justify-between items-center px-9 pt-6 pb-2">
          <View className="flex-row items-center gap-1.5">
            <View className="w-2.5 h-2.5 rounded-full bg-finance" />
            <Text className="text-[13px] font-semibold tracking-widest text-white uppercase">
              Verit
            </Text>
          </View>
          {currentIndex < SLIDES.length - 1 ? (
            <TouchableOpacity
              onPress={handleFinish}
              activeOpacity={0.7}
              className="py-1 px-3 rounded-full bg-white/10"
            >
              <Text className="text-[12px] font-semibold text-white/80">Skip</Text>
            </TouchableOpacity>
          ) : (
            <View className="w-12" />
          )}
        </View>

        {/* Title on the colored background (Figma: 30px Semibold centered) */}
        <View className="px-9 pt-6 pb-4 items-center">
          <Text className="text-[30px] leading-[39px] font-semibold text-white text-center max-w-[290px]">
            {SLIDES[currentIndex].title}
          </Text>
        </View>

        {/* Illustration carousel */}
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleScroll}
        >
          {SLIDES.map((slide) => (
            <View
              key={slide.id}
              style={{ width }}
              className="items-center justify-center px-8"
            >
              <View className="w-56 h-56 rounded-full bg-white/10 items-center justify-center relative">
                <View className="w-44 h-44 rounded-full bg-white items-center justify-center">
                  <MaterialIcons name={slide.iconName} size={80} color={BRAND_COLOR} />
                </View>
                {/* Floating financial accent bubble */}
                <View className="absolute top-4 right-4 w-10 h-10 rounded-full bg-finance items-center justify-center">
                  <MaterialIcons name="check" size={22} color="white" />
                </View>
              </View>
            </View>
          ))}
        </ScrollView>

        {/* FinWise bottom sheet with subtitle, dots and text-style Next */}
        <View className="flex-1 bg-white rounded-t-[40px] px-9 pt-8 pb-10 justify-end">
          <Text className="text-[14px] leading-relaxed text-gray-500 text-center min-h-[48px]">
            {SLIDES[currentIndex].subtitle}
          </Text>

          <View className="flex-row items-center justify-between mt-8">
            {/* 3-Dot Pagination Indicator */}
            <View className="flex-row items-center gap-1.5">
              {SLIDES.map((_, index) => {
                const isActive = index === currentIndex;
                return (
                  <View
                    key={index}
                    className={`h-[13px] rounded-full ${
                      isActive ? 'w-[42px] bg-brand' : 'w-[13px] bg-brand-light'
                    }`}
                  />
                );
              })}
            </View>

            {/* Text-style Next action (Figma 7038:283) */}
            <TouchableOpacity onPress={handleNext} activeOpacity={0.6}>
              <Text className="text-[30px] leading-[22px] font-semibold text-brand">
                {currentIndex === SLIDES.length - 1 ? 'Get Started' : 'Next'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaWrapper>
  );
}
