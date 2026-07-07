import { BRAND_COLOR } from '@/constants/theme';
import { useState } from 'react';
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
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaWrapper } from '../../components/ui/SafeAreaWrapper';
import { authApi } from '../../lib/api';

type Step = 'email' | 'otp' | 'password' | 'success';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Set when the server returns 429 (too many failed OTP attempts). Requesting a
  // fresh code clears the lockout server-side, so we steer the user to resend.
  const [lockedOut, setLockedOut] = useState(false);

  const validateEmail = () => {
    if (!email.trim()) {
      setError('Email is required');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address');
      return false;
    }
    setError(null);
    return true;
  };

  const validatePassword = () => {
    if (!newPassword) {
      setError('Password is required');
      return false;
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return false;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    setError(null);
    return true;
  };

  const handleSendCode = async () => {
    if (!validateEmail()) return;
    setIsLoading(true);
    try {
      await authApi.forgotPassword(email);
      // A fresh code clears any prior lockout server-side.
      setLockedOut(false);
      setOtp('');
      setStep('otp');
    } catch (err: any) {
      setError(err.message || 'Failed to send reset code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp || otp.length !== 6) {
      setError('Please enter the 6-digit code');
      return;
    }
    setIsLoading(true);
    try {
      await authApi.verifyOtp(email, otp);
      setStep('password');
    } catch (err: any) {
      if (err.status === 429) {
        // Locked out — this code is dead; only a new one works.
        setLockedOut(true);
      }
      setError(err.message || 'Invalid verification code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!validatePassword()) return;
    setIsLoading(true);
    try {
      await authApi.resetPassword(email, otp, newPassword);
      setStep('success');
    } catch (err: any) {
      setError(err.message || 'Failed to reset password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToLogin = () => {
    router.replace('/(auth)/login');
  };

  return (
    <SafeAreaWrapper>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView className="flex-1 bg-gray-50">
          <View className="flex-1 px-6 justify-center min-h-screen">
            <View className="items-center w-full max-w-sm mx-auto">
              {/* Header */}
              <View className="mb-8 items-center">
                <View className="w-16 h-16 bg-brand/10 rounded-full items-center justify-center mb-4">
                  <MaterialIcons name="lock-reset" size={32} color={BRAND_COLOR} />
                </View>
                <Text className="text-2xl font-semibold text-gray-800 text-center">
                  {step === 'email' && 'Reset Password'}
                  {step === 'otp' && 'Verify Code'}
                  {step === 'password' && 'New Password'}
                  {step === 'success' && 'Success!'}
                </Text>
                <Text className="text-sm text-gray-600 text-center mt-2">
                  {step === 'email' && 'Enter your email to receive a reset code'}
                  {step === 'otp' && `Enter the 6-digit code sent to ${email}`}
                  {step === 'password' && 'Create a new password for your account'}
                  {step === 'success' && 'Your password has been reset successfully'}
                </Text>
              </View>

              {/* Email Step */}
              {step === 'email' && (
                <View className="w-full space-y-4">
                  <View className="relative">
                    <View className="absolute left-3 top-3 z-10">
                      <MaterialIcons name="email" size={20} color="#6B7280" />
                    </View>
                    <TextInput
                      className="w-full pl-12 pr-4 py-3 border rounded-md bg-white border-gray-300"
                      placeholder="Enter your email"
                      value={email}
                      onChangeText={(text) => {
                        setEmail(text);
                        if (error) setError(null);
                      }}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      editable={!isLoading}
                    />
                  </View>

                  {error && (
                    <View className="flex-row items-center space-x-2 bg-red-50 px-3 py-2 rounded-md">
                      <MaterialIcons name="error" size={16} color="#EF4444" />
                      <Text className="text-red-600 text-sm flex-1">{error}</Text>
                    </View>
                  )}

                  <TouchableOpacity
                    onPress={handleSendCode}
                    disabled={isLoading}
                    className={`w-full py-3 rounded-md ${isLoading ? 'bg-gray-400' : 'bg-brand'}`}
                  >
                    <View className="flex-row justify-center items-center">
                      {isLoading && <ActivityIndicator color="white" size="small" className="mr-2" />}
                      <Text className="text-white font-medium text-center">
                        {isLoading ? 'Sending...' : 'Send Reset Code'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>
              )}

              {/* OTP Step */}
              {step === 'otp' && (
                <View className="w-full space-y-4">
                  <View className="relative">
                    <View className="absolute left-3 top-3 z-10">
                      <MaterialIcons name="verified" size={20} color="#6B7280" />
                    </View>
                    <TextInput
                      className="w-full pl-12 pr-4 py-3 border rounded-md bg-white border-gray-300"
                      placeholder="Enter 6-digit code"
                      value={otp}
                      onChangeText={(text) => {
                        setOtp(text.replace(/[^0-9]/g, '').slice(0, 6));
                        if (error) setError(null);
                      }}
                      keyboardType="number-pad"
                      maxLength={6}
                      editable={!isLoading}
                    />
                  </View>

                  {lockedOut ? (
                    <View className="flex-row items-start space-x-2 bg-amber-50 px-3 py-2 rounded-md">
                      <MaterialIcons name="lock-clock" size={16} color="#B45309" />
                      <Text className="text-amber-700 text-sm flex-1">
                        Too many incorrect attempts. This code is no longer valid — request a new one to try again.
                      </Text>
                    </View>
                  ) : error ? (
                    <View className="flex-row items-center space-x-2 bg-red-50 px-3 py-2 rounded-md">
                      <MaterialIcons name="error" size={16} color="#EF4444" />
                      <Text className="text-red-600 text-sm flex-1">{error}</Text>
                    </View>
                  ) : null}

                  <TouchableOpacity
                    onPress={handleVerifyOtp}
                    disabled={isLoading || lockedOut}
                    className={`w-full py-3 rounded-md ${isLoading || lockedOut ? 'bg-gray-400' : 'bg-brand'}`}
                  >
                    <View className="flex-row justify-center items-center">
                      {isLoading && <ActivityIndicator color="white" size="small" className="mr-2" />}
                      <Text className="text-white font-medium text-center">
                        {isLoading ? 'Verifying...' : 'Verify Code'}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleSendCode}
                    disabled={isLoading}
                    className={lockedOut ? 'w-full py-3 rounded-md bg-brand' : 'items-center py-2'}
                  >
                    <Text className={lockedOut ? 'text-white font-medium text-center' : 'text-brand text-sm font-medium text-center'}>
                      Resend Code
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* New Password Step */}
              {step === 'password' && (
                <View className="w-full space-y-4">
                  <View className="relative">
                    <View className="absolute left-3 top-3 z-10">
                      <MaterialIcons name="lock" size={20} color="#6B7280" />
                    </View>
                    <TextInput
                      className="w-full pl-12 pr-4 py-3 border rounded-md bg-white border-gray-300"
                      placeholder="New password"
                      value={newPassword}
                      onChangeText={(text) => {
                        setNewPassword(text);
                        if (error) setError(null);
                      }}
                      secureTextEntry
                      editable={!isLoading}
                    />
                  </View>

                  <View className="relative">
                    <View className="absolute left-3 top-3 z-10">
                      <MaterialIcons name="lock-outline" size={20} color="#6B7280" />
                    </View>
                    <TextInput
                      className="w-full pl-12 pr-4 py-3 border rounded-md bg-white border-gray-300"
                      placeholder="Confirm new password"
                      value={confirmPassword}
                      onChangeText={(text) => {
                        setConfirmPassword(text);
                        if (error) setError(null);
                      }}
                      secureTextEntry
                      editable={!isLoading}
                    />
                  </View>

                  {error && (
                    <View className="flex-row items-center space-x-2 bg-red-50 px-3 py-2 rounded-md">
                      <MaterialIcons name="error" size={16} color="#EF4444" />
                      <Text className="text-red-600 text-sm flex-1">{error}</Text>
                    </View>
                  )}

                  <TouchableOpacity
                    onPress={handleResetPassword}
                    disabled={isLoading}
                    className={`w-full py-3 rounded-md ${isLoading ? 'bg-gray-400' : 'bg-brand'}`}
                  >
                    <View className="flex-row justify-center items-center">
                      {isLoading && <ActivityIndicator color="white" size="small" className="mr-2" />}
                      <Text className="text-white font-medium text-center">
                        {isLoading ? 'Resetting...' : 'Reset Password'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>
              )}

              {/* Success Step */}
              {step === 'success' && (
                <View className="w-full space-y-4 items-center">
                  <View className="w-20 h-20 bg-green-100 rounded-full items-center justify-center">
                    <MaterialIcons name="check-circle" size={48} color="#10B981" />
                  </View>
                  <Text className="text-gray-600 text-center">
                    You can now sign in with your new password.
                  </Text>
                  <TouchableOpacity
                    onPress={handleBackToLogin}
                    className="w-full py-3 rounded-md bg-brand"
                  >
                    <Text className="text-white font-medium text-center">
                      Back to Sign In
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Back to Login */}
              {step !== 'success' && (
                <TouchableOpacity
                  onPress={handleBackToLogin}
                  className="mt-6 items-center"
                >
                  <Text className="text-gray-500 text-sm">
                    Remember your password?{' '}
                    <Text className="text-brand font-medium">Sign In</Text>
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaWrapper>
  );
}
