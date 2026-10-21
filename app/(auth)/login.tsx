import { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  BackHandler,
} from 'react-native';
import { useFocusEffect } from 'expo-router/react-navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useAuth } from '../../hooks/useAuth';
import { SafeAreaWrapper } from '../../components/ui/SafeAreaWrapper';
import { useRouter } from 'expo-router';
import { BRAND_COLOR } from '@/constants/theme';

const loginSchema = z.object({
  userName: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  // Prevent Android hardware back button from navigating away from login
  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => true);
      return () => subscription.remove();
    }, [])
  );

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);

    try {
      await login(data.userName, data.password);
    } catch (err: any) {
      let errorMessage = 'Login failed';

      if (err.message) {
        errorMessage = err.message;
      } else if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      }

      Alert.alert('Login Error', errorMessage, [
        { text: 'OK', style: 'default' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaWrapper>
      <KeyboardAvoidingView
        className="flex-1 bg-brand"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* FinWise Top Branded Header */}
          <View className="pt-8 pb-10 px-6 items-center justify-center">
            <View className="w-48 h-16 mb-4 items-center justify-center">
              <Image
                source={require('../../assets/logos/logos-02.svg')}
                style={{ width: '100%', height: '100%' }}
                contentFit="contain"
              />
            </View>
            <View className="px-3 py-1 rounded-full bg-white/10 mb-2">
              <Text className="text-white/90 text-xs font-semibold tracking-wider uppercase">
                Tenant Portal
              </Text>
            </View>
            <Text className="text-[30px] leading-[22px] font-semibold text-white text-center mt-1">
              Welcome Back
            </Text>
            <Text className="text-white/70 text-[14px] text-center mt-2">
              Sign in to manage your rent, lease and requests
            </Text>
          </View>

          {/* FinWise Curved Main Card */}
          <View
            className="flex-1 bg-white rounded-t-[40px] px-9 pt-8 pb-10"
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: -4 },
              shadowOpacity: 0.1,
              shadowRadius: 16,
              elevation: 8,
            }}
          >
            <View className="w-full max-w-sm mx-auto space-y-6">
              {/* Username Field */}
              <View>
                <Text className="text-[15px] font-medium text-finance-fence mb-2">
                  Username
                </Text>
                <Controller
                  control={control}
                  name="userName"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <View
                      className={`flex-row items-center h-[41px] rounded-[18px] px-4 ${
                        errors.userName ? 'bg-red-50' : 'bg-brand-light'
                      }`}
                    >
                      <MaterialIcons name="person-outline" size={20} color="#6B7280" />
                      <TextInput
                        className="flex-1 ml-3 text-[16px] text-finance-fence"
                        placeholder="Enter your username"
                        placeholderTextColor="#9CA3AF"
                        onBlur={onBlur}
                        onChangeText={onChange}
                        value={value}
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                    </View>
                  )}
                />
                {errors.userName && (
                  <Text className="text-red-500 text-xs mt-1.5 ml-1 font-medium">
                    {errors.userName.message}
                  </Text>
                )}
              </View>

              {/* Password Field */}
              <View>
                <View className="flex-row justify-between items-center mb-1.5 ml-1">
                  <Text className="text-[15px] font-medium text-finance-fence">
                    Password
                  </Text>
                  <TouchableOpacity
                    onPress={() => router.push('/(auth)/forgot-password')}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text className="text-[14px] font-semibold text-brand">
                      Forgot Password?
                    </Text>
                  </TouchableOpacity>
                </View>
                <Controller
                  control={control}
                  name="password"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <View
                      className={`flex-row items-center h-[41px] rounded-[18px] px-4 ${
                        errors.password ? 'bg-red-50' : 'bg-brand-light'
                      }`}
                    >
                      <MaterialIcons name="lock-outline" size={20} color="#6B7280" />
                      <TextInput
                        className="flex-1 ml-3 text-[16px] text-finance-fence"
                        placeholder="Enter your password"
                        placeholderTextColor="#9CA3AF"
                        onBlur={onBlur}
                        onChangeText={onChange}
                        value={value}
                        secureTextEntry={!showPassword}
                        autoCapitalize="none"
                      />
                      <TouchableOpacity
                        onPress={() => setShowPassword((prev) => !prev)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        accessibilityRole="button"
                        accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                      >
                        <MaterialIcons
                          name={showPassword ? 'visibility-off' : 'visibility'}
                          size={20}
                          color="#6B7280"
                        />
                      </TouchableOpacity>
                    </View>
                  )}
                />
                {errors.password && (
                  <Text className="text-red-500 text-xs mt-1.5 ml-1 font-medium">
                    {errors.password.message}
                  </Text>
                )}
              </View>

              {/* Sign In Primary CTA (Figma LogIn: 207x45 pill, radius 30, green) */}
              <TouchableOpacity
                onPress={() => { void handleSubmit(onSubmit)(); }}
                disabled={isLoading}
                activeOpacity={0.8}
                className={`w-[207px] h-[45px] rounded-[30px] bg-finance items-center justify-center self-center mt-4 ${
                  isLoading ? 'opacity-60' : ''
                }`}
              >
                <View className="flex-row items-center justify-center">
                  {isLoading ? (
                    <ActivityIndicator color="#052224" size="small" className="mr-2" />
                  ) : null}
                  <Text className="text-finance-fence font-semibold text-[20px]">
                    {isLoading ? 'Signing In...' : 'Log In'}
                  </Text>
                </View>
              </TouchableOpacity>

              {/* FinWise Biometric Login Prompt */}
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  Alert.alert(
                    'Biometric Access',
                    'Biometric sign-in is not available yet. Please sign in with your username and password.'
                  );
                }}
                className="flex-row items-center justify-center py-2.5 px-4 rounded-xl bg-gray-50 border border-gray-100"
              >
                <MaterialIcons name="fingerprint" size={22} color={BRAND_COLOR} />
                <Text className="text-xs font-semibold text-gray-700 ml-2">
                  Use Biometrics to sign in
                </Text>
              </TouchableOpacity>

              {/* FinWise Divider */}
              <View className="flex-row items-center my-4">
                <View className="flex-1 h-px bg-gray-200" />
                <Text className="text-xs uppercase tracking-wider text-gray-400 mx-3 font-semibold">
                  New to Verit?
                </Text>
                <View className="flex-1 h-px bg-gray-200" />
              </View>

              {/* Account Activation (Figma Sign Up: light 207x45 pill) */}
              <TouchableOpacity
                onPress={() => router.push('/(auth)/activate')}
                activeOpacity={0.8}
                className="w-[207px] h-[45px] rounded-[30px] bg-brand-light items-center justify-center self-center"
              >
                <Text className="text-brand font-semibold text-[15px]">
                  Activate Account
                </Text>
              </TouchableOpacity>

              {/* Support note */}
              <Text className="text-xs text-gray-400 text-center pt-2">
                Need help? Contact your property manager
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaWrapper>
  );
}
