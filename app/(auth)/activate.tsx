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
import { PinInput } from "@/components/ui/PinInput";

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
  const [showPassword, setShowPassword] = useState(false);
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
    setAccounts([]);
    setSelectedTenantId(null);
    setError(null);
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
      const pending = await authApi.verifyTenantOtp(
        normalizePhoneNumber(phone),
        otp
      );
      setAccounts(pending);
      setError(null);
      if (pending.length === 0) {
        setSelectedTenantId(null);
        setStep("phone");
        setError(
          "No pending account found for this phone number. Ask your landlord to add you as a tenant."
        );
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
    if (!selectedTenantId) {
      setError("Verify your phone and select an account first.");
      setStep("phone");
      return;
    }
    setIsLoading(true);
    try {
      await activate(
        normalizePhoneNumber(phone),
        selectedTenantId,
        userName.trim(),
        password
      );
      // `activate()` navigates to /(tabs) on success.
    } catch (err: any) {
      if (err.status === 400) {
        setSelectedTenantId(null);
        setAccounts([]);
        setStep("phone");
      }
      setError(err.message || "Failed to activate account");
    } finally {
      setIsLoading(false);
    }
  };

  const getStepNumber = () => {
    switch (step) {
      case "phone":
        return "1";
      case "otp":
        return "2";
      case "choose-account":
        return "3";
      case "credentials":
        return accounts.length > 1 ? "4" : "3";
    }
  };

  const getTotalSteps = () => (accounts.length > 1 ? "4" : "3");

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
            <View className="flex-row items-center justify-between w-full mb-4">
              <TouchableOpacity
                onPress={() => {
                  if (step === "otp") setStep("phone");
                  else if (step === "choose-account") setStep("otp");
                  else if (step === "credentials" && accounts.length > 1)
                    setStep("choose-account");
                  else if (step === "credentials") setStep("otp");
                  else router.replace("/(auth)/login");
                }}
                className="w-10 h-10 rounded-full bg-white/10 items-center justify-center"
              >
                <MaterialIcons name="arrow-back" size={20} color="white" />
              </TouchableOpacity>
              <View className="px-3 py-1 rounded-full bg-white/10">
                <Text className="text-white text-xs font-semibold tracking-wider">
                  STEP {getStepNumber()} OF {getTotalSteps()}
                </Text>
              </View>
              <View className="w-10" />
            </View>

            <Text className="text-2xl font-bold text-white text-center">
              {step === "phone" && "Activate Your Account"}
              {step === "otp" && "Verify Your Number"}
              {step === "choose-account" && "Select Tenancy"}
              {step === "credentials" && "Set Up Your Login"}
            </Text>
            <Text className="text-white/70 text-xs text-center mt-1 px-4 leading-relaxed">
              {step === "phone" &&
                "Enter your registered lease phone number to receive a verification code"}
              {step === "otp" &&
                `Enter the 6-digit verification code sent to ${phone}`}
              {step === "choose-account" &&
                "Select which lease unit you want to activate for this portal login"}
              {step === "credentials" &&
                "Set your permanent username and secure password"}
            </Text>
          </View>

          {/* FinWise Curved Sheet */}
          <View
            className="flex-1 bg-white rounded-t-[36px] px-6 pt-8 pb-10 shadow-2xl"
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: -4 },
              shadowOpacity: 0.1,
              shadowRadius: 16,
              elevation: 8,
            }}
          >
            <View className="w-full max-w-sm mx-auto">
              {/* STEP 1: Phone */}
              {step === "phone" && (
                <View className="space-y-4">
                  <View>
                    <Text className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5 ml-1">
                      Mobile Phone Number
                    </Text>
                    <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3.5">
                      <MaterialIcons name="phone-iphone" size={20} color="#6B7280" />
                      <TextInput
                        className="flex-1 ml-3 text-base text-gray-900 font-medium"
                        placeholder="0771 234 567"
                        placeholderTextColor="#9CA3AF"
                        value={phone}
                        onChangeText={(text) => {
                          setPhone(text);
                          setAccounts([]);
                          setSelectedTenantId(null);
                          if (error) setError(null);
                        }}
                        keyboardType="phone-pad"
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
                    className="w-full py-4 rounded-2xl bg-brand items-center justify-center mt-2 shadow-sm"
                    style={{
                      shadowColor: BRAND_COLOR,
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.25,
                      shadowRadius: 8,
                      elevation: 3,
                    }}
                  >
                    <View className="flex-row items-center justify-center">
                      {isLoading && (
                        <ActivityIndicator
                          color="white"
                          size="small"
                          className="mr-2"
                        />
                      )}
                      <Text className="text-white font-bold text-base">
                        {isLoading ? "Sending Code..." : "Send Verification Code"}
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

                  {/* FinWise 6-Digit PIN Input */}
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
                        Too many incorrect attempts. This code is no longer
                        valid — request a new one to try again.
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
                    disabled={isLoading || lockedOut}
                    activeOpacity={0.8}
                    className={`w-full py-4 rounded-2xl items-center justify-center mt-2 ${
                      isLoading || lockedOut
                        ? "bg-gray-300"
                        : "bg-brand"
                    }`}
                  >
                    <View className="flex-row items-center justify-center">
                      {isLoading && (
                        <ActivityIndicator
                          color="white"
                          size="small"
                          className="mr-2"
                        />
                      )}
                      <Text className="text-white font-bold text-base">
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
                      Resend Code
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* STEP 3: Choose Account */}
              {step === "choose-account" && (
                <View className="space-y-3">
                  <Text className="text-lg font-semibold text-gray-800 mb-1">
                    Choose your account
                  </Text>
                  {accounts.map((account) => {
                    const propertyHeading =
                      [
                        account.propertyName,
                        account.unitNumber ? `Unit ${account.unitNumber}` : null,
                      ]
                        .filter(Boolean)
                        .join(" · ") || "Tenancy Account";

                    return (
                      <TouchableOpacity
                        key={account.tenantId}
                        activeOpacity={0.7}
                        className="rounded-2xl border border-gray-200 bg-gray-50/70 p-4 mb-2 active:border-brand active:bg-brand/5"
                        onPress={() => {
                          setSelectedTenantId(account.tenantId);
                          setStep("credentials");
                        }}
                      >
                        <View className="flex-row items-center justify-between">
                          <View className="flex-1 pr-3">
                            <Text className="font-bold text-gray-900 text-base">
                              {propertyHeading}
                            </Text>
                            <Text className="text-xs text-gray-500 mt-1">
                              Landlord:{" "}
                              <Text className="font-medium text-gray-700">
                                {account.landlordName}
                              </Text>
                            </Text>
                          </View>
                          <MaterialIcons
                            name="chevron-right"
                            size={24}
                            color={BRAND_COLOR}
                          />
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {/* STEP 4: Credentials */}
              {step === "credentials" && (
                <View className="space-y-4">
                  <View>
                    <Text className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5 ml-1">
                      Choose Username
                    </Text>
                    <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3.5">
                      <MaterialIcons name="person-outline" size={20} color="#6B7280" />
                      <TextInput
                        className="flex-1 ml-3 text-base text-gray-900 font-medium"
                        placeholder="Choose a username"
                        placeholderTextColor="#9CA3AF"
                        value={userName}
                        onChangeText={(text) => {
                          setUserName(text);
                          if (error) setError(null);
                        }}
                        autoCapitalize="none"
                        autoCorrect={false}
                        editable={!isLoading}
                      />
                    </View>
                  </View>

                  <View>
                    <Text className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5 ml-1">
                      Choose Password
                    </Text>
                    <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3.5">
                      <MaterialIcons name="lock-outline" size={20} color="#6B7280" />
                      <TextInput
                        className="flex-1 ml-3 text-base text-gray-900 font-medium"
                        placeholder="Choose a password"
                        placeholderTextColor="#9CA3AF"
                        value={password}
                        onChangeText={(text) => {
                          setPassword(text);
                          if (error) setError(null);
                        }}
                        secureTextEntry={!showPassword}
                        editable={!isLoading}
                      />
                      <TouchableOpacity
                        onPress={() => setShowPassword((prev) => !prev)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <MaterialIcons
                          name={showPassword ? "visibility-off" : "visibility"}
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
                    onPress={handleActivate}
                    disabled={isLoading}
                    activeOpacity={0.8}
                    className="w-full py-4 rounded-2xl bg-brand items-center justify-center mt-2 shadow-sm"
                    style={{
                      shadowColor: BRAND_COLOR,
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.25,
                      shadowRadius: 8,
                      elevation: 3,
                    }}
                  >
                    <View className="flex-row items-center justify-center">
                      {isLoading && (
                        <ActivityIndicator
                          color="white"
                          size="small"
                          className="mr-2"
                        />
                      )}
                      <Text className="text-white font-bold text-base">
                        {isLoading ? "Activating..." : "Activate Account"}
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>
              )}

              {/* Bottom Back to Sign In */}
              <TouchableOpacity
                onPress={() => router.replace("/(auth)/login")}
                className="mt-8 items-center py-2"
              >
                <Text className="text-gray-500 text-xs font-medium">
                  Already activated?{" "}
                  <Text className="text-brand font-bold">Sign In</Text>
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaWrapper>
  );
}
