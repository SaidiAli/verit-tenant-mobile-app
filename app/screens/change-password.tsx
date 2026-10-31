import { session } from '../../lib/session';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Alert,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useState, useRef } from "react";
import { useRouter } from "expo-router";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "../../hooks/useAuth";
import { SafeAreaWrapper } from "../../components/ui/SafeAreaWrapper";
import { FinWiseScreen } from "../../components/ui/FinWiseScreen";

export default function ChangePasswordScreen() {
  const { changePassword } = useAuth();
  const router = useRouter();
  const generation = useRef(session.current()).current;

  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const { mutate: submitChange, isPending } = useMutation({
    mutationFn: () =>
      changePassword({
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword,
      }),
    onSuccess: () => {
      if (!session.isCurrent(generation)) return;
      Alert.alert("Success", "Password changed successfully.", [
        { text: "OK", onPress: () => router.back() },
      ]);
      setFormData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    },
    onError: (err: any) =>
      Alert.alert("Error", err.message || "Failed to change password"),
  });

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.currentPassword) {
      newErrors.currentPassword = "Current password is required";
    }

    if (!formData.newPassword) {
      newErrors.newPassword = "New password is required";
    } else if (formData.newPassword.length < 8) {
      newErrors.newPassword = "Password must be at least 8 characters";
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your new password";
    } else if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    if (
      formData.currentPassword &&
      formData.newPassword &&
      formData.currentPassword === formData.newPassword
    ) {
      newErrors.newPassword =
        "New password must be different from current password";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChangePassword = () => {
    if (!validateForm()) return;
    submitChange();
  };

  const handleCancel = () => {
    router.back();
  };

  const togglePasswordVisibility = (field: "current" | "new" | "confirm") => {
    setShowPasswords((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const getPasswordStrength = (password: string) => {
    if (password.length === 0) return { strength: 0, label: "" };
    if (password.length < 8) return { strength: 1, label: "Weak" };
    if (password.length < 10) return { strength: 2, label: "Fair" };
    if (
      password.length >= 8 &&
      /[A-Z]/.test(password) &&
      /[0-9]/.test(password)
    ) {
      return { strength: 4, label: "Strong" };
    }
    return { strength: 3, label: "Good" };
  };

  const passwordStrength = getPasswordStrength(formData.newPassword);

  return (
    <SafeAreaWrapper>
      <FinWiseScreen
        title="Change Password"
        onBack={handleCancel}
        header={<View />}
        headerClassName="px-9 pt-6 pb-8"
      >
        <View className="gap-8">
          {/* Security Notice */}
          <View className="bg-brand-light/60 rounded-[22px] p-5 flex-row items-start gap-3">
            <View className="w-[31px] h-[31px] rounded-[10px] bg-finance/15 items-center justify-center">
              <MaterialIcons name="security" size={17} color="#00D09E" />
            </View>
            <View className="flex-1">
              <Text className="text-[15px] font-medium text-finance-fence mb-1">
                Security Notice
              </Text>
              <Text className="text-[13px] text-gray-500 leading-relaxed">
                Choose a strong password that you haven&apos;t used before.
                Your password should be at least 8 characters long.
              </Text>
            </View>
          </View>

          {/* Form Fields */}
          <View className="gap-7">
            {/* Current Password */}
            <View>
              <Text className="text-[15px] font-medium text-finance-fence mb-2">
                Current Password
              </Text>
              <View className="relative">
                <TextInput
                  value={formData.currentPassword}
                  onChangeText={(text) => {
                    setFormData((prev) => ({
                      ...prev,
                      currentPassword: text,
                    }));
                    if (errors.currentPassword) {
                      setErrors((prev) => ({
                        ...prev,
                        currentPassword: "",
                      }));
                    }
                  }}
                  className={`h-[41px] rounded-[18px] px-4 pr-12 text-[16px] text-finance-fence ${
                    errors.currentPassword ? "bg-red-50" : "bg-brand-light"
                  }`}
                  placeholder="Enter your current password"
                  placeholderTextColor="#9CA3AF"
                  secureTextEntry={!showPasswords.current}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={() => togglePasswordVisibility("current")}
                  className="absolute right-4 top-[10px]"
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <MaterialIcons
                    name={showPasswords.current ? "visibility-off" : "visibility"}
                    size={20}
                    color="#6B7280"
                  />
                </TouchableOpacity>
              </View>
              {errors.currentPassword && (
                <Text className="text-red-500 text-[12px] mt-1.5">
                  {errors.currentPassword}
                </Text>
              )}
            </View>

            {/* New Password */}
            <View>
              <Text className="text-[15px] font-medium text-finance-fence mb-2">
                New Password
              </Text>
              <View className="relative">
                <TextInput
                  value={formData.newPassword}
                  onChangeText={(text) => {
                    setFormData((prev) => ({ ...prev, newPassword: text }));
                    if (errors.newPassword) {
                      setErrors((prev) => ({ ...prev, newPassword: "" }));
                    }
                  }}
                  className={`h-[41px] rounded-[18px] px-4 pr-12 text-[16px] text-finance-fence ${
                    errors.newPassword ? "bg-red-50" : "bg-brand-light"
                  }`}
                  placeholder="Enter your new password"
                  placeholderTextColor="#9CA3AF"
                  secureTextEntry={!showPasswords.new}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={() => togglePasswordVisibility("new")}
                  className="absolute right-4 top-[10px]"
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <MaterialIcons
                    name={showPasswords.new ? "visibility-off" : "visibility"}
                    size={20}
                    color="#6B7280"
                  />
                </TouchableOpacity>
              </View>

              {/* Password Strength Indicator */}
              {formData.newPassword.length > 0 && (
                <View className="mt-3">
                  <View className="flex-row items-center gap-2 mb-1.5">
                    <Text className="text-[12px] text-gray-500">
                      Password strength:
                    </Text>
                    <Text
                      className={`text-[12px] font-medium ${
                        passwordStrength.strength === 1
                          ? "text-red-500"
                          : passwordStrength.strength === 2
                            ? "text-yellow-600"
                            : passwordStrength.strength === 3
                              ? "text-ocean"
                              : "text-finance"
                      }`}
                    >
                      {passwordStrength.label}
                    </Text>
                  </View>
                  <View className="flex-row gap-1.5">
                    {[1, 2, 3, 4].map((level) => (
                      <View
                        key={level}
                        className={`h-[6px] flex-1 rounded-[3px] ${
                          level <= passwordStrength.strength
                            ? level === 1
                              ? "bg-red-400"
                              : level === 2
                                ? "bg-amber-400"
                                : level === 3
                                  ? "bg-ocean-light"
                                  : "bg-finance"
                            : "bg-gray-200"
                        }`}
                      />
                    ))}
                  </View>
                </View>
              )}

              {errors.newPassword && (
                <Text className="text-red-500 text-[12px] mt-1.5">
                  {errors.newPassword}
                </Text>
              )}
            </View>

            {/* Confirm Password */}
            <View>
              <Text className="text-[15px] font-medium text-finance-fence mb-2">
                Confirm New Password
              </Text>
              <View className="relative">
                <TextInput
                  value={formData.confirmPassword}
                  onChangeText={(text) => {
                    setFormData((prev) => ({
                      ...prev,
                      confirmPassword: text,
                    }));
                    if (errors.confirmPassword) {
                      setErrors((prev) => ({
                        ...prev,
                        confirmPassword: "",
                      }));
                    }
                  }}
                  className={`h-[41px] rounded-[18px] px-4 pr-12 text-[16px] text-finance-fence ${
                    errors.confirmPassword ? "bg-red-50" : "bg-brand-light"
                  }`}
                  placeholder="Confirm your new password"
                  placeholderTextColor="#9CA3AF"
                  secureTextEntry={!showPasswords.confirm}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={() => togglePasswordVisibility("confirm")}
                  className="absolute right-4 top-[10px]"
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <MaterialIcons
                    name={showPasswords.confirm ? "visibility-off" : "visibility"}
                    size={20}
                    color="#6B7280"
                  />
                </TouchableOpacity>
              </View>
              {errors.confirmPassword && (
                <Text className="text-red-500 text-[12px] mt-1.5">
                  {errors.confirmPassword}
                </Text>
              )}
            </View>
          </View>

          {/* Action Buttons */}
          <View className="gap-2.5">
            <TouchableOpacity
              onPress={handleChangePassword}
              disabled={isPending}
              className={`h-[45px] rounded-[30px] items-center justify-center ${
                isPending ? "bg-brand-light" : "bg-finance"
              }`}
            >
              <Text
                className={`font-semibold text-[15px] ${
                  isPending ? "text-gray-400" : "text-finance-fence"
                }`}
              >
                {isPending ? "Changing Password..." : "Change Password"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleCancel}
              className="h-[45px] rounded-[30px] bg-brand-light items-center justify-center"
            >
              <Text className="text-finance-fence font-medium text-[15px]">
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </FinWiseScreen>
    </SafeAreaWrapper>
  );
}
