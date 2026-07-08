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
import { useFocusEffect } from '@react-navigation/native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useAuth } from '../../hooks/useAuth';
import { SafeAreaWrapper } from '../../components/ui/SafeAreaWrapper';
import { useRouter } from 'expo-router';

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

  // Prevent the Android hardware back button from navigating away from login
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
        { text: 'OK', style: 'default' }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaWrapper>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView className="flex-1 bg-gray-50">
          <View className="flex-1 px-6 justify-center min-h-screen">
            <View className="items-center">
              {/* Logo/Brand Section */}
              <View className="mb-8 items-center">
                <View className="w-64 h-20 mb-2">
                  <Image
                    source={require('../../assets/logos/logos-02.svg')}
                    style={{ width: '100%', height: '100%' }}
                    contentFit="contain"
                  />
                </View>
                <Text className="text-lg font-semibold text-gray-800 text-center">
                  Tenant Portal
                </Text>
              </View>

              {/* Login Form */}
              <View className="w-full max-w-sm">
                <View className="space-y-4">
                  <View>
                    <Text className="text-2xl font-semibold text-gray-800 text-center">
                      Welcome Back
                    </Text>
                    <Text className="text-sm font-semibold text-gray-600 text-center mt-2">
                      Sign in to access your tenant portal
                    </Text>
                  </View>

                  {/* Username Field */}
                  <View className="w-full">
                    <Text className="text-sm font-medium text-gray-700 mb-2">
                      Username
                    </Text>
                    <Controller
                      control={control}
                      name="userName"
                      render={({ field: { onChange, onBlur, value } }) => (
                        <View className="relative">
                          <View className="absolute left-3 top-3 z-10">
                            <MaterialIcons name="person" size={20} color="#6B7280" />
                          </View>
                          <TextInput
                            className={`w-full pl-12 pr-4 py-3 border rounded-md bg-white ${errors.userName ? 'border-red-500' : 'border-gray-300'
                              }`}
                            placeholder="Enter your username"
                            onBlur={onBlur}
                            onChangeText={onChange}
                            value={value}
                            autoCapitalize="none"
                            secureTextEntry={false}
                          />
                        </View>
                      )}
                    />
                    {errors.userName && (
                      <Text className="text-red-500 text-sm mt-1">
                        {errors.userName.message}
                      </Text>
                    )}
                  </View>

                  {/* Password Field */}
                  <View className="w-full">
                    <Text className="text-sm font-medium text-gray-700 mb-2">
                      Password
                    </Text>
                    <Controller
                      control={control}
                      name="password"
                      render={({ field: { onChange, onBlur, value } }) => (
                        <View className="relative">
                          <View className="absolute left-3 top-3 z-10">
                            <MaterialIcons name="lock" size={20} color="#6B7280" />
                          </View>
                          <TextInput
                            className={`w-full pl-12 pr-12 py-3 border rounded-md bg-white ${errors.password ? 'border-red-500' : 'border-gray-300'
                              }`}
                            placeholder="Enter your password"
                            onBlur={onBlur}
                            onChangeText={onChange}
                            value={value}
                            secureTextEntry={!showPassword}
                          />
                          <TouchableOpacity
                            onPress={() => setShowPassword((prev) => !prev)}
                            className="absolute right-0 top-0 bottom-0 justify-center px-3 z-10"
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
                      <Text className="text-red-500 text-sm mt-1">
                        {errors.password.message}
                      </Text>
                    )}
                  </View>

                  {/* Sign In Button */}
                  <TouchableOpacity
                    onPress={handleSubmit(onSubmit)}
                    disabled={isLoading}
                    className={`w-full py-3 rounded-md mt-6 ${isLoading ? 'bg-gray-400' : 'bg-brand'
                      }`}
                  >
                    <View className="flex-row justify-center items-center">
                      {isLoading && (
                        <ActivityIndicator color="white" size="small" className="mr-2" />
                      )}
                      <Text className="text-white font-medium text-center">
                        {isLoading ? 'Signing in...' : 'Sign In'}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  <Text className="text-sm text-gray-500 text-center mt-6">
                    Need help? Contact your property manager
                  </Text>

                  {/* Forgot Password */}
                  <TouchableOpacity
                    onPress={() => router.push('/(auth)/forgot-password')}
                    className="self-center mt-4"
                  >
                    <Text className="text-brand text-sm font-medium">
                      Forgot Password?
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaWrapper>
  );
}