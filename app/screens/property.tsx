import { ErrorView } from '../../components/ui/ErrorView';
import { useAuth } from '../../hooks/useAuth';
import { tenantKeys } from '../../lib/queryKeys';
import { BRAND_COLOR } from "@/constants/theme";
import {
  View,
  Text,
  TouchableOpacity,
  Linking,
  Alert,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { useQuery } from "@tanstack/react-query";
import { tenantApi } from "../../lib/api";
import { useLease } from "../../hooks/LeaseContext";
import { LeaseSwitcher } from "../../components/ui/LeaseSwitcher";
import { LoadingSpinner } from "../../components/ui/LoadingSpinner";
import { SafeAreaWrapper } from "../../components/ui/SafeAreaWrapper";
import { FinWiseScreen } from "../../components/ui/FinWiseScreen";

export default function PropertyScreen() {
  const { user } = useAuth();
  const { selectedLeaseId, isLoadingLeases } = useLease();
  const router = useRouter();

  // Fetch property information
  const {
    data: propertyInfo,
    isLoading: isPropertyLoading,
    error: propertyError,
  } = useQuery({
    queryKey: tenantKeys.query(user?.id, 'tenant-property', selectedLeaseId),
    queryFn: ({ signal }) => tenantApi.getPropertyInfo(selectedLeaseId!, signal),
    enabled: !!user && !!selectedLeaseId,
  });

  const handleEmergencyCall = (phoneNumber: string) => {
    const phoneUrl = `tel:${phoneNumber}`;
    Linking.canOpenURL(phoneUrl)
      .then((supported) => {
        if (supported) {
          return Linking.openURL(phoneUrl);
        } else {
          Alert.alert("Error", "Unable to make phone calls on this device");
        }
      })
      .catch((err) => Alert.alert("Error", "Failed to initiate phone call"));
  };

  const handleSubmitMaintenance = () => {
    // Navigate to maintenance form or show modal
    Alert.alert(
      "Maintenance",
      "Feature to submit maintenance request coming soon.",
    );
  };

  const isLoading = isPropertyLoading;

  if (!selectedLeaseId && !isLoadingLeases) return <ErrorView title="No lease selected" message="Select a lease or contact your property manager." />;

  if (isLoading) {
    return (
      <View className="flex-1 bg-brand justify-center items-center">
        <LoadingSpinner size="large" className="bg-transparent" />
        <Text className="text-white/70 mt-2">Loading property details...</Text>
      </View>
    );
  }

  if (propertyError || !propertyInfo) {
    return (
      <View className="flex-1 bg-brand justify-center items-center px-9">
        <MaterialIcons name="error-outline" size={48} color="#EF4444" />
        <Text className="text-[20px] font-semibold text-white mt-4 text-center">
          Unable to Load Property Information
        </Text>
        <Text className="text-[14px] text-white/70 mt-2 text-center">
          {propertyError
            ? "Failed to fetch property data."
            : "No property information found for this lease."}
        </Text>
      </View>
    );
  }

  const { property, emergencyContacts, rules, management } = propertyInfo;

  return (
    <SafeAreaWrapper>
      <FinWiseScreen
        title="Property & Unit"
        onBack={() => router.back()}
        header={
          <View className="flex-row items-center justify-end mt-4">
            <LeaseSwitcher />
          </View>
        }
        headerClassName="px-9 pt-6 pb-8"
      >
        <View className="space-y-9">
          {/* Property Overview */}
          <View>
            <Text className="text-[20px] leading-[22px] font-semibold text-finance-fence">
              {property.name}
            </Text>

            <View className="flex-row items-start gap-2 mt-2">
              <MaterialIcons name="location-on" size={16} color="#9CA3AF" />
              <Text className="text-[13px] text-gray-500 flex-1 leading-relaxed">
                {property.address}, {property.city}, {property.state}{" "}
                {property.zipCode}
              </Text>
            </View>

            {property.description && (
              <Text className="text-[13px] text-gray-600 leading-relaxed mt-3">
                {property.description}
              </Text>
            )}
          </View>

          {/* Managed by */}
          {management && (
            <View>
              <Text className="text-[15px] font-medium text-finance-fence mb-1">
                Managed by
              </Text>
              <Text className="text-[13px] font-medium text-finance-fence">
                {management.managingDisplayName}
              </Text>
              <Text className="text-[13px] text-gray-500 leading-relaxed mt-1">
                Contact this organization for maintenance and day-to-day property service.
              </Text>
              {management.managingContactPhone && (
                <TouchableOpacity onPress={() => handleEmergencyCall(management.managingContactPhone!)}>
                  <Text className="text-brand font-semibold text-[13px] mt-2">
                    Call {management.managingContactPhone}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Emergency Contact */}
          {emergencyContacts && emergencyContacts.length > 0 && (
            <View>
              <View className="flex-row items-center gap-2 mb-2">
                <Text className="text-[15px] font-medium text-finance-fence">
                  Emergency Contact
                </Text>
                <MaterialIcons name="emergency" size={18} color="#EF4444" />
              </View>

              {emergencyContacts.map((contact, index) => (
                <View key={index} className="mb-3">
                  <Text className="text-[13px] font-medium text-finance-fence">
                    {contact.name} ({contact.type})
                  </Text>

                  <TouchableOpacity
                    className="h-[45px] rounded-[30px] bg-rose-600 flex-row items-center justify-center gap-2 mt-2"
                    onPress={() => handleEmergencyCall(contact.phone)}
                  >
                    <MaterialIcons name="phone" size={18} color="white" />
                    <Text className="text-white font-semibold text-[15px]">
                      Call: {contact.phone}
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}

              <Text className="text-[12px] text-gray-400 text-center">
                For emergencies only
              </Text>
            </View>
          )}

          {/* Rules */}
          {rules && (
            <View>
              <Text className="text-[15px] font-medium text-finance-fence mb-1">
                House Rules
              </Text>
              <Text className="text-[13px] text-gray-600 leading-relaxed">
                {rules}
              </Text>
            </View>
          )}

          {/* Maintenance Request */}
          <View>
            <Text className="text-[15px] font-medium text-finance-fence mb-1">
              Submit Maintenance Request
            </Text>
            <Text className="text-[13px] text-gray-500 leading-relaxed mb-3">
              Need something fixed? Submit a maintenance request and
              we&apos;ll get it taken care of.
            </Text>

            <TouchableOpacity
              className="h-[45px] rounded-[30px] bg-brand-light flex-row items-center justify-center gap-2"
              onPress={handleSubmitMaintenance}
            >
              <MaterialIcons name="build" size={20} color={BRAND_COLOR} />
              <Text className="text-brand font-semibold text-[15px]">
                Submit New Request
              </Text>
            </TouchableOpacity>
          </View>

          {/* Recent Maintenance Requests */}
          <View>
            <Text className="text-[15px] font-medium text-finance-fence mb-2">
              Your Maintenance Requests
            </Text>
            <Text className="text-[13px] text-gray-400 text-center py-4">
              No maintenance requests submitted yet
            </Text>
          </View>
        </View>
      </FinWiseScreen>
    </SafeAreaWrapper>
  );
}
