import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { SafeAreaWrapper } from "../../components/ui/SafeAreaWrapper";
import { authApi } from "../../lib/api";
import { PinInput } from "@/components/ui/PinInput";

type Step = "email" | "otp" | "password" | "success";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Set when the server returns 429 (too many failed OTP attempts). Requesting a
  // fresh code clears the lockout server-side, so we steer the user to resend.
  const [lockedOut, setLockedOut] = useState(false);

  const validateEmail = () => {
    if (!email.trim()) {
      setError("Email is required");
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address");
      return false;
    }
    setError(null);
    return true;
  };

  const validatePassword = () => {
    if (!newPassword) {
      setError("Password is required");
      return false;
    }
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters");
      return false;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
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
      setOtp("");
      setStep("otp");
    } catch (err: any) {
      setError(err.message || "Failed to send reset code");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp || otp.length !== 6) {
      setError("Please enter the 6-digit code");
      return;
    }
    setIsLoading(true);
    try {
      await authApi.verifyOtp(email, otp);
      setStep("password");
    } catch (err: any) {
      if (err.status === 429) {
        // Locked out — this code is dead; only a new one works.
        setLockedOut(true);
      }
      setError(err.message || "Invalid verification code");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!validatePassword()) return;
    setIsLoading(true);
    try {
      await authApi.resetPassword(email, otp, newPassword);
      setStep("success");
    } catch (err: any) {
      setError(err.message || "Failed to reset password");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToLogin = () => {
    router.replace("/(auth)/login");
  };

  const getStepNumber = () => {
    switch (step) {
      case "email":
        return "1";
      case "otp":
        return "2";
      case "password":
        return "3";
      case "success":
        return "3";
    }
  };

  return (
    <SafeAreaWrapper>
      <KeyboardAvoidingView
        className="flex-1 bg-brand"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Top Branded Curve Header */}
          <View className="pt-8 pb-10 px-6 items-center">
            <View className="w-40 h-14 mb-4 items-center justify-center">
              <Image
                source={require('../../assets/logos/logos-09.svg')}
                style={{ width: '100%', height: '100%' }}
                contentFit="contain"
              />
            </View>
            <View className="flex-row items-center justify-between w-full mb-4">
              <TouchableOpacity
                onPress={() => {
                  if (step === "otp") setStep("email");
                  else if (step === "password") setStep("otp");
                  else handleBackToLogin();
                }}
                className="w-10 h-10 rounded-full bg-white/10 items-center justify-center"
              >
                <MaterialIcons name="arrow-back" size={20} color="white" />
              </TouchableOpacity>
              {step !== "success" ? (
                <View className="px-3 py-1 rounded-full bg-white/10">
                  <Text className="text-white text-xs font-semibold tracking-wider">
                    STEP {getStepNumber()} OF 3
                  </Text>
                </View>
              ) : (
                <View className="w-16" />
              )}
              <View className="w-10" />
            </View>

            <Text className="text-2xl font-bold text-white text-center">
              {step === "email" && "Reset Password"}
              {step === "otp" && "Verify Code"}
              {step === "password" && "New Password"}
              {step === "success" && "Password Reset!"}
            </Text>
            <Text className="text-white/70 text-xs text-center mt-1 px-4 leading-relaxed">
              {step === "email" &&
                "Enter your registered account email to receive a recovery code"}
              {step === "otp" && `Enter the 6-digit verification code sent to ${email}`}
              {step === "password" &&
                "Choose a strong new password with at least 8 characters"}
              {step === "success" &&
                "Your password has been successfully updated. You can now sign in."}
            </Text>
          </View>

          {/* FinWise Curved Main Card */}
          <View
            className="flex-1 bg-white rounded-t-[40px] px-9 pt-8 pb-10"
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: -4 },
              shadowOpacity: 0.1,
              shadowRadius: 16,
              elevation: 8,
            }}
          >
            <View className="w-full max-w-sm mx-auto">
              {/* STEP 1: Email */}
              {step === "email" && (
                <View className="space-y-4">
                  <View>
                    <Text className="text-[15px] font-medium text-finance-fence mb-2">
                      Email Address
                    </Text>
                    <View className="flex-row items-center h-[41px] rounded-[18px] px-4 bg-brand-light">
                      <MaterialIcons name="mail-outline" size={20} color="#6B7280" />
                      <TextInput
                        className="flex-1 ml-3 text-[16px] text-finance-fence"
                        placeholder="e.g. tenant@example.com"
                        placeholderTextColor="#9CA3AF"
                        value={email}
                        onChangeText={(text) => {
                          setEmail(text);
                          if (error) setError(null);
                        }}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                        editable={!isLoading}
                      />
                    </View>
                  </View>

                  {error && (
                    <View className="flex-row items-center bg-red-50 p-3 rounded-xl border border-red-100">
                      <MaterialIcons name="error-outline" size={18} color="#EF4444" />
                      <Text className="text-red-700 text-xs ml-2 flex-1 font-medium">
                        {error}
                      </Text>
                    </View>
                  )}

                  <TouchableOpacity
                    onPress={handleSendCode}
                    disabled={isLoading}
                    activeOpacity={0.8}
                    className="w-full h-[45px] rounded-[30px] bg-finance items-center justify-center mt-3"
                  >
                    <View className="flex-row items-center justify-center">
                      {isLoading && (
                        <ActivityIndicator
                          color="#052224"
                          size="small"
                          className="mr-2"
                        />
                      )}
                      <Text className="text-finance-fence font-semibold text-[15px]">
                        {isLoading ? "Sending Code..." : "Send Reset Code"}
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>
              )}

              {/* STEP 2: OTP */}
              {step === "otp" && (
                <View className="space-y-4 items-center">
                  <Text className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
                    Enter 6-Digit PIN
                  </Text>

                  <PinInput
                    length={6}
                    value={otp}
                    onChange={(val) => {
                      setOtp(val);
                      if (error) setError(null);
                    }}
                    disabled={isLoading || lockedOut}
                    hasError={!!error}
                  />

                  {lockedOut ? (
                    <View className="flex-row items-start bg-amber-50 p-3.5 rounded-xl border border-amber-200 w-full my-2">
                      <MaterialIcons name="lock-clock" size={20} color="#B45309" />
                      <Text className="text-amber-800 text-xs ml-2.5 flex-1 font-medium leading-relaxed">
                        Too many incorrect attempts. Request a fresh code below.
                      </Text>
                    </View>
                  ) : error ? (
                    <View className="flex-row items-center bg-red-50 p-3 rounded-xl border border-red-100 w-full my-2">
                      <MaterialIcons name="error-outline" size={18} color="#EF4444" />
                      <Text className="text-red-700 text-xs ml-2 flex-1 font-medium">
                        {error}
                      </Text>
                    </View>
                  ) : null}

                  <TouchableOpacity
                    onPress={() => void handleVerifyOtp()}
                    disabled={isLoading || lockedOut || otp.length !== 6}
                    activeOpacity={0.8}
                    className={`w-full h-[45px] rounded-[30px] items-center justify-center mt-2 ${
                      isLoading || lockedOut || otp.length !== 6
                        ? "bg-brand-light"
                        : "bg-finance"
                    }`}
                  >
                    <View className="flex-row items-center justify-center">
                      {isLoading && (
                        <ActivityIndicator
                          color="#052224"
                          size="small"
                          className="mr-2"
                        />
                      )}
                      <Text
                        className={`font-semibold text-[15px] ${
                          isLoading || lockedOut || otp.length !== 6
                            ? "text-gray-400"
                            : "text-finance-fence"
                        }`}
                      >
                        {isLoading ? "Verifying..." : "Verify Code"}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleSendCode}
                    disabled={isLoading}
                    className="py-3 px-4"
                  >
                    <Text className="text-brand font-semibold text-sm">
                      {"Didn't get the code? Resend Code"}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* STEP 3: Password */}
              {step === "password" && (
                <View className="space-y-4">
                  <View>
                    <Text className="text-[15px] font-medium text-finance-fence mb-2">
                      New Password
                    </Text>
                    <View className="flex-row items-center h-[41px] rounded-[18px] px-4 bg-brand-light">
                      <MaterialIcons name="lock-outline" size={20} color="#6B7280" />
                      <TextInput
                        className="flex-1 ml-3 text-[16px] text-finance-fence"
                        placeholder="At least 8 characters"
                        placeholderTextColor="#9CA3AF"
                        value={newPassword}
                        onChangeText={(text) => {
                          setNewPassword(text);
                          if (error) setError(null);
                        }}
                        secureTextEntry={!showNewPassword}
                        editable={!isLoading}
                      />
                      <TouchableOpacity
                        onPress={() => setShowNewPassword((prev) => !prev)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <MaterialIcons
                          name={showNewPassword ? "visibility-off" : "visibility"}
                          size={20}
                          color="#6B7280"
                        />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View>
                    <Text className="text-[15px] font-medium text-finance-fence mb-2">
                      Confirm New Password
                    </Text>
                    <View className="flex-row items-center h-[41px] rounded-[18px] px-4 bg-brand-light">
                      <MaterialIcons name="lock-outline" size={20} color="#6B7280" />
                      <TextInput
                        className="flex-1 ml-3 text-[16px] text-finance-fence"
                        placeholder="Re-type new password"
                        placeholderTextColor="#9CA3AF"
                        value={confirmPassword}
                        onChangeText={(text) => {
                          setConfirmPassword(text);
                          if (error) setError(null);
                        }}
                        secureTextEntry={!showConfirmPassword}
                        editable={!isLoading}
                      />
                      <TouchableOpacity
                        onPress={() => setShowConfirmPassword((prev) => !prev)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <MaterialIcons
                          name={showConfirmPassword ? "visibility-off" : "visibility"}
                          size={20}
                          color="#6B7280"
                        />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {error && (
                    <View className="flex-row items-center bg-red-50 p-3 rounded-xl border border-red-100">
                      <MaterialIcons name="error-outline" size={18} color="#EF4444" />
                      <Text className="text-red-700 text-xs ml-2 flex-1 font-medium">
                        {error}
                      </Text>
                    </View>
                  )}

                  <TouchableOpacity
                    onPress={handleResetPassword}
                    disabled={isLoading}
                    activeOpacity={0.8}
                    className="w-full h-[45px] rounded-[30px] bg-finance items-center justify-center mt-3"
                  >
                    <View className="flex-row items-center justify-center">
                      {isLoading && (
                        <ActivityIndicator
                          color="#052224"
                          size="small"
                          className="mr-2"
                        />
                      )}
                      <Text className="text-finance-fence font-semibold text-[15px]">
                        {isLoading ? "Updating..." : "Reset Password"}
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>
              )}

              {/* STEP 4: Success */}
              {step === "success" && (
                <View className="items-center py-6">
                  <View className="w-20 h-20 rounded-full bg-emerald-50 border-4 border-emerald-100 items-center justify-center mb-4">
                    <MaterialIcons name="check" size={40} color="#00D09E" />
                  </View>
                  <Text className="text-xl font-bold text-gray-900 text-center mb-1">
                    Password Changed
                  </Text>
                  <Text className="text-sm text-gray-500 text-center mb-8 px-4">
                    Your password has been successfully updated. You can now
                    sign in with your new credentials.
                  </Text>
                  <TouchableOpacity
                    onPress={handleBackToLogin}
                    activeOpacity={0.8}
                    className="w-full h-[45px] rounded-[30px] bg-finance items-center justify-center"
                  >
                    <Text className="text-finance-fence font-semibold text-[15px]">
                      Sign In Now
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Back to Login Footer */}
              {step !== "success" && (
                <TouchableOpacity
                  onPress={handleBackToLogin}
                  className="mt-8 items-center py-2"
                >
                  <Text className="text-gray-500 text-xs font-medium">
                    Remember your password?{" "}
                    <Text className="text-brand font-bold">Sign In</Text>
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
