import { BRAND_COLOR } from "@/constants/theme";
import type { PendingTenantAccount } from "../../types";
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
import { useRouter } from "expo-router";
import { SafeAreaWrapper } from "../../components/ui/SafeAreaWrapper";
import { authApi } from "../../lib/api";
import { useAuth } from "../../hooks/useAuth";
import { validatePhoneNumber, normalizePhoneNumber } from "../../lib/currency";

type Step = "phone" | "otp" | "choose-account" | "credentials";

export default function ActivateAccountScreen() {
  const router = useRouter();
  const { activate } = useAuth();
  const [step, setStep] = useState<Step>("phone");
  const [accounts, setAccounts] = useState<PendingTenantAccount[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [userName, setUserName] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Set when the server returns 429 (too many failed OTP attempts). Requesting a
  // fresh code clears the lockout server-side, so we steer the user to resend.
  const [lockedOut, setLockedOut] = useState(false);

  const validatePhone = () => {
    if (!phone.trim()) {
      setError("Phone number is required");
      return false;
    }
    const result = validatePhoneNumber(phone);
    if (!result.isValid) {
      setError(result.error || "Please enter a valid phone number");
      return false;
    }
    setError(null);
    return true;
  };

  const validateCredentials = () => {
    if (!userName.trim()) {
      setError("Username is required");
      return false;
    }
    if (!password) {
      setError("Password is required");
      return false;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return false;
    }
    setError(null);
    return true;
  };

  const handleSendCode = async () => {
    if (!validatePhone()) return;
    setAccounts([]); setSelectedTenantId(null); setError(null);
    setIsLoading(true);
    try {
      await authApi.requestTenantOtp(normalizePhoneNumber(phone));
      // A fresh code clears any prior lockout server-side.
      setLockedOut(false);
      setOtp("");
      setStep("otp");
    } catch (err: any) {
      setError(err.message || "Failed to send verification code");
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
      const pending = await authApi.verifyTenantOtp(normalizePhoneNumber(phone), otp);
      setAccounts(pending);
      setError(null);
      if (pending.length === 0) {
        setSelectedTenantId(null);
        setStep("phone");
        setError("No pending account found for this phone number. Ask your landlord to add you as a tenant.");
      } else if (pending.length === 1) {
        setSelectedTenantId(pending[0].tenantId);
        setStep("credentials");
      } else {
        setSelectedTenantId(null);
        setStep("choose-account");
      }
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

  const handleActivate = async () => {
    if (!validateCredentials()) return;
    if (!selectedTenantId) { setError("Verify your phone and select an account first."); setStep("phone"); return; }
    setIsLoading(true);
    try {
      await activate(normalizePhoneNumber(phone), selectedTenantId, userName.trim(), password);
      // `activate()` navigates to /(tabs) on success.
    } catch (err: any) {
      if (err.status === 400) {
        setSelectedTenantId(null); setAccounts([]); setStep("phone");
      }
      setError(err.message || "Failed to activate account");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToLogin = () => {
    router.replace("/(auth)/login");
  };

  return (
    <SafeAreaWrapper>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView className="flex-1 bg-gray-50">
          <View className="flex-1 px-6 justify-center min-h-screen">
            <View className="items-center w-full max-w-sm mx-auto">
              {/* Header */}
              <View className="mb-8 items-center">
                <View className="w-16 h-16 bg-brand/10 rounded-full items-center justify-center mb-4">
                  <MaterialIcons
                    name="how-to-reg"
                    size={32}
                    color={BRAND_COLOR}
                  />
                </View>
                <Text className="text-2xl font-semibold text-gray-800 text-center">
                  {step === "phone" && "Activate Your Account"}
                  {step === "otp" && "Verify Your Number"}
                  {step === "credentials" && "Set Up Your Login"}
                </Text>
                <Text className="text-sm text-gray-600 text-center mt-2">
                  {step === "phone" &&
                    "Enter the phone number your landlord added to get a verification code"}
                  {step === "otp" && `Enter the 6-digit code sent to ${phone}`}
                  {step === "credentials" &&
                    "Choose a username and password to finish setting up your account"}
                </Text>
              </View>

              {/* Phone Step */}
              {step === "phone" && (
                <View className="w-full gap-4">
                  <View className="relative">
                    <View className="absolute left-3 top-3 z-10">
                      <MaterialIcons name="phone" size={20} color="#6B7280" />
                    </View>
                    <TextInput
                      className="w-full pl-12 pr-4 py-3 border rounded-md bg-white border-gray-300"
                      placeholder="0771 234 567"
                      value={phone}
                      onChangeText={(text) => {
                        setPhone(text);
                        setAccounts([]); setSelectedTenantId(null);
                        if (error) setError(null);
                      }}
                      keyboardType="phone-pad"
                      editable={!isLoading}
                    />
                  </View>

                  {error && (
                    <View className="flex-row items-center space-x-2 bg-red-50 px-3 py-2 rounded-md">
                      <MaterialIcons name="error" size={16} color="#EF4444" />
                      <Text className="text-red-600 text-sm flex-1">
                        {error}
                      </Text>
                    </View>
                  )}

                  <TouchableOpacity
                    onPress={handleSendCode}
                    disabled={isLoading}
                    className={`w-full py-3 rounded-md ${isLoading ? "bg-gray-400" : "bg-brand"}`}
                  >
                    <View className="flex-row justify-center items-center">
                      {isLoading && (
                        <ActivityIndicator
                          color="white"
                          size="small"
                          className="mr-2"
                        />
                      )}
                      <Text className="text-white font-medium text-center">
                        {isLoading ? "Sending..." : "Send Verification Code"}
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>
              )}

              {/* OTP Step */}
              {step === "otp" && (
                <View className="w-full gap-4">
                  <View className="relative">
                    <View className="absolute left-3 top-3 z-10">
                      <MaterialIcons
                        name="verified"
                        size={20}
                        color="#6B7280"
                      />
                    </View>
                    <TextInput
                      className="w-full pl-12 pr-4 py-3 border rounded-md bg-white border-gray-300"
                      placeholder="Enter 6-digit code"
                      value={otp}
                      onChangeText={(text) => {
                        setOtp(text.replace(/[^0-9]/g, "").slice(0, 6));
                        if (error) setError(null);
                      }}
                      keyboardType="number-pad"
                      maxLength={6}
                      editable={!isLoading}
                    />
                  </View>

                  {lockedOut ? (
                    <View className="flex-row items-start space-x-2 bg-amber-50 px-3 py-2 rounded-md">
                      <MaterialIcons
                        name="lock-clock"
                        size={16}
                        color="#B45309"
                      />
                      <Text className="text-amber-700 text-sm flex-1">
                        Too many incorrect attempts. This code is no longer
                        valid — request a new one to try again.
                      </Text>
                    </View>
                  ) : error ? (
                    <View className="flex-row items-center space-x-2 bg-red-50 px-3 py-2 rounded-md">
                      <MaterialIcons name="error" size={16} color="#EF4444" />
                      <Text className="text-red-600 text-sm flex-1">
                        {error}
                      </Text>
                    </View>
                  ) : null}

                  <TouchableOpacity
                    onPress={handleVerifyOtp}
                    disabled={isLoading || lockedOut}
                    className={`w-full py-3 rounded-md ${isLoading || lockedOut ? "bg-gray-400" : "bg-brand"}`}
                  >
                    <View className="flex-row justify-center items-center">
                      {isLoading && (
                        <ActivityIndicator
                          color="white"
                          size="small"
                          className="mr-2"
                        />
                      )}
                      <Text className="text-white font-medium text-center">
                        {isLoading ? "Verifying..." : "Verify Code"}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleSendCode}
                    disabled={isLoading}
                    className={
                      lockedOut
                        ? "w-full py-3 rounded-md bg-brand"
                        : "items-center py-2"
                    }
                  >
                    <Text
                      className={
                        lockedOut
                          ? "text-white font-medium text-center"
                          : "text-brand text-sm font-medium text-center"
                      }
                    >
                      Resend Code
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {step === "choose-account" && <View className="w-full gap-3">
                <Text className="text-lg font-semibold">Choose your account</Text>
                {accounts.map(account => <TouchableOpacity key={account.tenantId}
                  className="rounded-md border border-gray-300 bg-white p-4"
                  onPress={() => { setSelectedTenantId(account.tenantId); setStep("credentials"); }}>
                  <Text className="font-semibold">{account.landlordName}</Text>
                  {account.propertyName && <Text>{account.propertyName}</Text>}
                </TouchableOpacity>)}
              </View>}
              {/* Credentials Step */}
              {step === "credentials" && (
                <View className="w-full gap-2">
                  <View className="relative">
                    <View className="absolute left-3 top-3 z-10">
                      <MaterialIcons name="person" size={20} color="#6B7280" />
                    </View>
                    <TextInput
                      className="w-full pl-12 pr-4 py-3 border rounded-md bg-white border-gray-300"
                      placeholder="Choose a username"
                      value={userName}
                      onChangeText={(text) => {
                        setUserName(text);
                        if (error) setError(null);
                      }}
                      autoCapitalize="none"
                      editable={!isLoading}
                    />
                  </View>

                  <View className="relative">
                    <View className="absolute left-3 top-3 z-10">
                      <MaterialIcons name="lock" size={20} color="#6B7280" />
                    </View>
                    <TextInput
                      className="w-full pl-12 pr-4 py-3 border rounded-md bg-white border-gray-300"
                      placeholder="Choose a password"
                      value={password}
                      onChangeText={(text) => {
                        setPassword(text);
                        if (error) setError(null);
                      }}
                      secureTextEntry
                      editable={!isLoading}
                    />
                  </View>

                  {error && (
                    <View className="flex-row items-center space-x-2 bg-red-50 px-3 py-2 rounded-md">
                      <MaterialIcons name="error" size={16} color="#EF4444" />
                      <Text className="text-red-600 text-sm flex-1">
                        {error}
                      </Text>
                    </View>
                  )}

                  <TouchableOpacity
                    onPress={handleActivate}
                    disabled={isLoading}
                    className={`w-full py-3 rounded-md ${isLoading ? "bg-gray-400" : "bg-brand"}`}
                  >
                    <View className="flex-row justify-center items-center">
                      {isLoading && (
                        <ActivityIndicator
                          color="white"
                          size="small"
                          className="mr-2"
                        />
                      )}
                      <Text className="text-white font-medium text-center">
                        {isLoading ? "Activating..." : "Activate Account"}
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>
              )}

              {/* Back to Login */}
              <TouchableOpacity
                onPress={handleBackToLogin}
                className="mt-6 items-center"
              >
                <Text className="text-gray-500 text-sm">
                  Already activated?{" "}
                  <Text className="text-brand font-medium">Sign In</Text>
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaWrapper>
  );
}
