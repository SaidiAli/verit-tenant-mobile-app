import { BRAND_COLOR } from "@/constants/theme";
import { useState } from "react";
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  Alert,
  Linking,
  Modal,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuth } from "../../hooks/useAuth";
import { Card } from "../../components/ui/Card";
import { SafeAreaWrapper } from "../../components/ui/SafeAreaWrapper";
import Constants from "expo-constants";

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleLogout = async () => {
    setShowLogoutModal(false);
    await logout();
  };

  const handleEditProfile = () => {
    router.push("/screens/edit-profile");
  };

  const handleSettings = () => {
    router.push("/screens/settings" as any);
  };

  const handleContactSupport = async () => {
    const supportEmail = "support@verit.tech";
    const subject = "Support Request - Verit App";
    const mailtoUrl = `mailto:${supportEmail}?subject=${encodeURIComponent(subject)}`;

    try {
      const canOpen = await Linking.canOpenURL(mailtoUrl);
      if (canOpen) {
        await Linking.openURL(mailtoUrl);
      } else {
        Alert.alert(
          "Email Support",
          `Please send an email to ${supportEmail} for support.`,
          [{ text: "OK" }],
        );
      }
    } catch {
      Alert.alert(
        "Contact Support",
        `Email: ${supportEmail}\nPhone: +256 700 123 456`,
        [{ text: "OK" }],
      );
    }
  };

  const handleTermsOfService = () => {
    router.push("/screens/terms-of-service");
  };

  const handlePrivacyPolicy = () => {
    router.push("/screens/privacy-policy");
  };

  const handleNavigateToLease = () => {
    router.push("/screens/lease");
  };

  const handleNavigateToProperty = () => {
    router.push("/screens/property");
  };

  const handleNavigateToHelp = () => {
    router.push("/screens/help");
  };

  if (!user) {
    return (
      <View className="flex-1 bg-gray-50 justify-center items-center">
        <Text className="text-gray-500 font-medium">Loading profile...</Text>
      </View>
    );
  }

  const initials = `${user.firstName?.charAt(0) ?? ""}${user.lastName?.charAt(0) ?? ""}`.toUpperCase();

  return (
    <SafeAreaWrapper>
      <View className="flex-1 bg-[#F8F9FA]">
        <ScrollView showsVerticalScrollIndicator={false}>
          <View className="px-5 pt-6 pb-12 space-y-6">
            {/* Header */}
            <View className="flex-row justify-between items-center">
              <Text className="text-2xl font-bold text-gray-900">
                Profile
              </Text>
              <TouchableOpacity
                onPress={handleEditProfile}
                activeOpacity={0.7}
                className="py-1.5 px-3.5 rounded-full bg-brand/10 flex-row items-center gap-1"
              >
                <MaterialIcons name="edit" size={14} color={BRAND_COLOR} />
                <Text className="text-xs font-bold text-brand">Edit</Text>
              </TouchableOpacity>
            </View>

            {/* FinWise Profile Identity Card (Screen 9.5.0 - A) */}
            <Card padded={false} className="items-center py-6 px-4">
              <View className="w-24 h-24 rounded-full bg-brand/10 border-2 border-brand p-1 items-center justify-center mb-3 shadow-sm">
                <View className="w-full h-full rounded-full bg-brand items-center justify-center">
                  <Text className="text-white font-extrabold text-2xl tracking-wider">
                    {initials}
                  </Text>
                </View>
              </View>

              <Text className="text-xl font-bold text-gray-900 text-center">
                {user.firstName} {user.lastName}
              </Text>

              {user.id ? (
                <View className="px-3 py-1 rounded-full bg-gray-100 mt-1 mb-2">
                  <Text className="text-[11px] font-semibold text-gray-500">
                    ID: {user.id.slice(0, 10)}...
                  </Text>
                </View>
              ) : null}

              <Text className="text-xs text-gray-500 text-center">
                {user.email || user.phone || "Verified Tenant"}
              </Text>
            </Card>

            {/* Tenancy & Lease Section */}
            <View>
              <Text className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2 ml-1">
                Tenancy & Agreement
              </Text>
              <Card padded={false} className="p-2">
                <TouchableOpacity
                  activeOpacity={0.7}
                  className="flex-row justify-between items-center p-3 rounded-xl active:bg-gray-50"
                  onPress={handleNavigateToLease}
                >
                  <View className="flex-row items-center gap-3">
                    <View className="w-10 h-10 rounded-2xl bg-brand/10 items-center justify-center">
                      <MaterialIcons name="description" size={20} color={BRAND_COLOR} />
                    </View>
                    <View>
                      <Text className="font-bold text-gray-900 text-sm">
                        Lease Information
                      </Text>
                      <Text className="text-xs text-gray-400">
                        Terms, deposit and rent rate
                      </Text>
                    </View>
                  </View>
                  <MaterialIcons name="chevron-right" size={20} color="#9CA3AF" />
                </TouchableOpacity>

                <View className="border-t border-gray-100 mx-3 my-1" />

                <TouchableOpacity
                  activeOpacity={0.7}
                  className="flex-row justify-between items-center p-3 rounded-xl active:bg-gray-50"
                  onPress={handleNavigateToProperty}
                >
                  <View className="flex-row items-center gap-3">
                    <View className="w-10 h-10 rounded-2xl bg-sky-500/10 items-center justify-center">
                      <MaterialIcons name="apartment" size={20} color="#0284C7" />
                    </View>
                    <View>
                      <Text className="font-bold text-gray-900 text-sm">
                        Property & Unit
                      </Text>
                      <Text className="text-xs text-gray-400">
                        Building address & manager contacts
                      </Text>
                    </View>
                  </View>
                  <MaterialIcons name="chevron-right" size={20} color="#9CA3AF" />
                </TouchableOpacity>
              </Card>
            </View>

            {/* Account Settings Section */}
            <View>
              <Text className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2 ml-1">
                Preferences & Security
              </Text>
              <Card padded={false} className="p-2">
                <TouchableOpacity
                  activeOpacity={0.7}
                  className="flex-row justify-between items-center p-3 rounded-xl active:bg-gray-50"
                  onPress={handleSettings}
                >
                  <View className="flex-row items-center gap-3">
                    <View className="w-10 h-10 rounded-2xl bg-amber-500/10 items-center justify-center">
                      <MaterialIcons name="security" size={20} color="#D97706" />
                    </View>
                    <View>
                      <Text className="font-bold text-gray-900 text-sm">
                        Security & Settings
                      </Text>
                      <Text className="text-xs text-gray-400">
                        Password, notifications & preferences
                      </Text>
                    </View>
                  </View>
                  <MaterialIcons name="chevron-right" size={20} color="#9CA3AF" />
                </TouchableOpacity>

                <View className="border-t border-gray-100 mx-3 my-1" />

                <TouchableOpacity
                  activeOpacity={0.7}
                  className="flex-row justify-between items-center p-3 rounded-xl active:bg-gray-50"
                  onPress={handleNavigateToHelp}
                >
                  <View className="flex-row items-center gap-3">
                    <View className="w-10 h-10 rounded-2xl bg-[#00D09E]/10 items-center justify-center">
                      <MaterialIcons name="help-outline" size={20} color="#00D09E" />
                    </View>
                    <View>
                      <Text className="font-bold text-gray-900 text-sm">
                        Help & FAQs
                      </Text>
                      <Text className="text-xs text-gray-400">
                        Frequently asked questions
                      </Text>
                    </View>
                  </View>
                  <MaterialIcons name="chevron-right" size={20} color="#9CA3AF" />
                </TouchableOpacity>
              </Card>
            </View>

            {/* Legal & Support Section */}
            <View>
              <Text className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2 ml-1">
                Support & Legal
              </Text>
              <Card padded={false} className="p-2">
                <TouchableOpacity
                  activeOpacity={0.7}
                  className="flex-row justify-between items-center p-3 rounded-xl active:bg-gray-50"
                  onPress={handleContactSupport}
                >
                  <View className="flex-row items-center gap-3">
                    <View className="w-10 h-10 rounded-2xl bg-gray-100 items-center justify-center">
                      <MaterialIcons name="support-agent" size={20} color="#4B5563" />
                    </View>
                    <Text className="font-bold text-gray-900 text-sm">
                      Contact Support
                    </Text>
                  </View>
                  <MaterialIcons name="chevron-right" size={20} color="#9CA3AF" />
                </TouchableOpacity>

                <View className="border-t border-gray-100 mx-3 my-1" />

                <TouchableOpacity
                  activeOpacity={0.7}
                  className="flex-row justify-between items-center p-3 rounded-xl active:bg-gray-50"
                  onPress={handleTermsOfService}
                >
                  <View className="flex-row items-center gap-3">
                    <View className="w-10 h-10 rounded-2xl bg-gray-100 items-center justify-center">
                      <MaterialIcons name="gavel" size={20} color="#4B5563" />
                    </View>
                    <Text className="font-bold text-gray-900 text-sm">
                      Terms of Service
                    </Text>
                  </View>
                  <MaterialIcons name="chevron-right" size={20} color="#9CA3AF" />
                </TouchableOpacity>

                <View className="border-t border-gray-100 mx-3 my-1" />

                <TouchableOpacity
                  activeOpacity={0.7}
                  className="flex-row justify-between items-center p-3 rounded-xl active:bg-gray-50"
                  onPress={handlePrivacyPolicy}
                >
                  <View className="flex-row items-center gap-3">
                    <View className="w-10 h-10 rounded-2xl bg-gray-100 items-center justify-center">
                      <MaterialIcons name="privacy-tip" size={20} color="#4B5563" />
                    </View>
                    <Text className="font-bold text-gray-900 text-sm">
                      Privacy Policy
                    </Text>
                  </View>
                  <MaterialIcons name="chevron-right" size={20} color="#9CA3AF" />
                </TouchableOpacity>
              </Card>
            </View>

            {/* Logout Trigger */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setShowLogoutModal(true)}
              className="w-full py-4 rounded-2xl bg-rose-50 border border-rose-100 items-center justify-center flex-row gap-2"
            >
              <MaterialIcons name="logout" size={20} color="#E11D48" />
              <Text className="font-bold text-rose-600 text-sm">
                End Session / Log Out
              </Text>
            </TouchableOpacity>

            {/* Version Information */}
            <View className="items-center py-2">
              <Text className="text-xs font-semibold text-gray-400">
                Verit Tenant Mobile • v{Constants.expoConfig?.version || '1.0.0'}
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* FinWise Log Out Modal Sheet (Screen 9.5.5 - B) */}
        <Modal
          visible={showLogoutModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowLogoutModal(false)}
        >
          <View className="flex-1 bg-black/50 justify-center items-center px-6">
            <View
              className="w-full max-w-sm bg-white rounded-3xl p-6 items-center shadow-2xl"
              style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.2,
                shadowRadius: 20,
                elevation: 10,
              }}
            >
              <View className="w-16 h-16 rounded-full bg-rose-50 border-4 border-rose-100 items-center justify-center mb-4">
                <MaterialIcons name="logout" size={28} color="#E11D48" />
              </View>

              <Text className="text-xl font-bold text-gray-900 text-center mb-1">
                End Session?
              </Text>
              <Text className="text-xs text-gray-500 text-center mb-6 leading-relaxed px-2">
                Are you sure you want to sign out of your tenant portal account on this device?
              </Text>

              <View className="w-full space-y-2.5">
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={handleLogout}
                  className="w-full py-3.5 rounded-2xl bg-rose-600 items-center justify-center shadow-sm"
                >
                  <Text className="text-white font-bold text-sm">
                    Yes, Log Out
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setShowLogoutModal(false)}
                  className="w-full py-3 rounded-2xl bg-gray-100 items-center justify-center"
                >
                  <Text className="text-gray-700 font-semibold text-sm">
                    Cancel
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaWrapper>
  );
}
