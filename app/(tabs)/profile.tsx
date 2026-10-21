import { BRAND_COLOR } from "@/constants/theme";
import { useState } from "react";
import { View, Text, TouchableOpacity, Alert, Linking, Modal } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuth } from "../../hooks/useAuth";
import { SafeAreaWrapper } from "../../components/ui/SafeAreaWrapper";
import { FinWiseScreen } from "../../components/ui/FinWiseScreen";
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
      <View className="flex-1 bg-brand justify-center items-center">
        <Text className="text-white/80 font-medium">Loading profile...</Text>
      </View>
    );
  }

  const initials = `${user.firstName?.charAt(0) ?? ""}${user.lastName?.charAt(0) ?? ""}`.toUpperCase();

  return (
    <SafeAreaWrapper>
      <FinWiseScreen
        headerClassName="px-9 pt-6 pb-10 items-center"
        header={
          <>
            <Text className="text-[20px] leading-[22px] font-semibold text-white self-start">
              Profile
            </Text>

            {/* Avatar (Figma: 117px circle) */}
            <View className="w-[117px] h-[117px] rounded-full bg-white/15 border-2 border-white/30 items-center justify-center mt-6">
              <Text className="text-white font-bold text-[36px] tracking-wider">
                {initials}
              </Text>
            </View>

            <Text className="text-[20px] font-bold text-white mt-4 text-center">
              {user.firstName} {user.lastName}
            </Text>
            {user.id ? (
              <View className="px-3 py-1 rounded-full bg-white/10 mt-2">
                <Text className="text-[13px] text-white/80">
                  ID: {user.id.slice(0, 10)}...
                </Text>
              </View>
            ) : null}
            <Text className="text-[12px] text-white/60 mt-2 text-center">
              {user.email || user.phone || "Verified Tenant"}
            </Text>
          </>
        }
      >
        {/* FinWise flat settings list (Figma 9.5.0-A): 57x53 icon tiles,
            13px icon-to-text gap, 34px row rhythm, 15px medium labels. */}
        <View className="gap-[34px] pt-2">
          <ProfileRow
            icon="person"
            iconBgClass="bg-vivid-blue"
            label="Edit Profile"
            onPress={handleEditProfile}
          />
          <ProfileRow
            icon="description"
            iconBgClass="bg-brand"
            iconColor="#FFFFFF"
            label="Lease Information"
            onPress={handleNavigateToLease}
          />
          <ProfileRow
            icon="apartment"
            iconBgClass="bg-ocean"
            iconColor="#FFFFFF"
            label="Property & Unit"
            onPress={handleNavigateToProperty}
          />
          <ProfileRow
            icon="security"
            iconBgClass="bg-amber-400"
            iconColor="#FFFFFF"
            label="Security & Settings"
            onPress={handleSettings}
          />
          <ProfileRow
            icon="help-outline"
            iconBgClass="bg-ocean-light"
            iconColor="#FFFFFF"
            label="Help & FAQs"
            onPress={handleNavigateToHelp}
          />
          <ProfileRow
            icon="support-agent"
            iconBgClass="bg-brand-light"
            iconColor={BRAND_COLOR}
            label="Contact Support"
            onPress={handleContactSupport}
          />
          <ProfileRow
            icon="gavel"
            iconBgClass="bg-brand-light"
            iconColor={BRAND_COLOR}
            label="Terms of Service"
            onPress={handleTermsOfService}
          />
          <ProfileRow
            icon="privacy-tip"
            iconBgClass="bg-brand-light"
            iconColor={BRAND_COLOR}
            label="Privacy Policy"
            onPress={handlePrivacyPolicy}
          />
          <ProfileRow
            icon="logout"
            iconBgClass="bg-rose-100"
            iconColor="#E11D48"
            label="Logout"
            labelClass="text-rose-600"
            onPress={() => setShowLogoutModal(true)}
          />
        </View>

        <View className="items-center pt-10">
          <Text className="text-[12px] text-gray-400">
            Verit Tenant Mobile • v{Constants.expoConfig?.version || '1.0.0'}
          </Text>
        </View>
      </FinWiseScreen>

      {/* Log Out confirmation sheet */}
      <Modal
        visible={showLogoutModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLogoutModal(false)}
      >
        <View className="flex-1 bg-black/50 justify-center items-center px-6">
          <View className="w-full max-w-sm bg-white rounded-[30px] p-6 items-center">
            <View className="w-16 h-16 rounded-full bg-rose-50 border-4 border-rose-100 items-center justify-center mb-4">
              <MaterialIcons name="logout" size={28} color="#E11D48" />
            </View>

            <Text className="text-[20px] font-semibold text-gray-900 text-center mb-1">
              End Session?
            </Text>
            <Text className="text-[13px] text-gray-500 text-center mb-6 leading-relaxed px-2">
              Are you sure you want to sign out of your tenant portal account on this device?
            </Text>

            <View className="w-full gap-2.5">
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleLogout}
                className="h-[45px] rounded-[30px] bg-rose-600 items-center justify-center"
              >
                <Text className="text-white font-semibold text-[15px]">
                  Yes, Log Out
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setShowLogoutModal(false)}
                className="h-[45px] rounded-[30px] bg-brand-light items-center justify-center"
              >
                <Text className="text-finance-fence font-medium text-[15px]">
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaWrapper>
  );
}

function ProfileRow({
  icon,
  iconBgClass,
  iconColor = '#FFFFFF',
  label,
  labelClass = 'text-finance-fence',
  onPress,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  iconBgClass: string;
  iconColor?: string;
  label: string;
  labelClass?: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      className="flex-row items-center gap-[13px]"
    >
      <View
        className={`w-[57px] h-[53px] rounded-[22px] items-center justify-center ${iconBgClass}`}
      >
        <MaterialIcons name={icon} size={24} color={iconColor} />
      </View>
      <Text className={`text-[15px] font-medium ${labelClass}`}>{label}</Text>
    </TouchableOpacity>
  );
}
