import { BRAND_COLOR } from "@/constants/theme";
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  Linking,
  Alert,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { Card } from "../../components/ui/Card";

import { useQuery } from "@tanstack/react-query";
import { tenantApi } from "../../lib/api";
import { useLease } from "../../hooks/LeaseContext";
import { LeaseSwitcher } from "../../components/ui/LeaseSwitcher";
import { LoadingSpinner } from "../../components/ui/LoadingSpinner";
import { SafeAreaWrapper } from "../../components/ui/SafeAreaWrapper";

export default function PropertyScreen() {
  const { selectedLeaseId } = useLease();

  // Fetch property information
  const {
    data: propertyInfo,
    isLoading: isPropertyLoading,
    error: propertyError,
  } = useQuery({
    queryKey: ["tenant-property", selectedLeaseId],
    queryFn: () => tenantApi.getPropertyInfo(selectedLeaseId || undefined),
    enabled: !!selectedLeaseId,
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

  if (isLoading) {
    return (
      <View className="flex-1 bg-gray-50 justify-center items-center">
        <LoadingSpinner size="large" />
        <Text className="text-gray-600 mt-4">Loading property details...</Text>
      </View>
    );
  }

  if (propertyError || !propertyInfo) {
    return (
      <View className="flex-1 bg-gray-50 justify-center items-center px-4">
        <MaterialIcons name="error-outline" size={48} color="#EF4444" />
        <Text className="text-xl font-semibold text-gray-800 mt-4 text-center">
          Unable to Load Property Information
        </Text>
        <Text className="text-gray-600 mt-2 text-center">
          {propertyError
            ? "Failed to fetch property data."
            : "No property information found for this lease."}
        </Text>
        <LoadingSpinner className="mt-4" />
        {/* Helper to allow easy retry by switching lease if needed, though LeaseSwitcher is in header usually.
            Here we might need a go back or retry button if it persists.
        */}
      </View>
    );
  }

  const { property, emergencyContacts, rules } = propertyInfo;

  return (
    <SafeAreaWrapper>
      <View className="flex-1 bg-gray-50">
        <ScrollView showsVerticalScrollIndicator={false}>
          <View className="px-4 pt-6 pb-4">
            {/* Header */}
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-2xl font-semibold text-gray-800">
                Property Information
              </Text>
              <LeaseSwitcher />
            </View>

            {/* Property Overview */}
            <Card className="mb-4">
              <View className="space-y-3">
                <Text className="text-lg font-semibold text-gray-800">
                  {property.name}
                </Text>

                <View className="flex-row items-start space-x-2">
                  <MaterialIcons
                    name="location-on"
                    size={16}
                    color="#6B7280"
                    style={{ marginTop: 2 }}
                  />
                  <Text className="text-gray-600 text-sm flex-1">
                    {property.address}, {property.city}, {property.state}{" "}
                    {property.zipCode}
                  </Text>
                </View>

                {property.description && (
                  <Text className="text-gray-700 text-sm leading-5">
                    {property.description}
                  </Text>
                )}
              </View>
            </Card>

            {/* Emergency Contact */}
            {emergencyContacts && emergencyContacts.length > 0 && (
              <Card className="mb-4">
                <View className="gap-3">
                  <View className="flex-row justify-between items-center">
                    <Text className="text-lg font-semibold text-gray-800">
                      Emergency Contact
                    </Text>
                    <MaterialIcons name="emergency" size={20} color="#EF4444" />
                  </View>

                  <View className="space-y-3">
                    {emergencyContacts.map((contact, index) => (
                      <View key={index} className="mb-2">
                        <Text className="font-medium text-gray-800">
                          {contact.name} ({contact.type})
                        </Text>

                        <TouchableOpacity
                          className="bg-red-500 py-3 rounded-md flex-row items-center justify-center space-x-2 mt-2"
                          onPress={() => handleEmergencyCall(contact.phone)}
                        >
                          <MaterialIcons name="phone" size={20} color="white" />
                          <Text className="text-white font-medium">
                            Call: {contact.phone}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    ))}

                    <Text className="text-sm text-gray-600 text-center">
                      For emergencies only
                    </Text>
                  </View>
                </View>
              </Card>
            )}

            {/* Rules */}
            {rules && (
              <Card className="mb-4">
                <View className="space-y-3">
                  <Text className="text-lg font-semibold text-gray-800">
                    House Rules
                  </Text>
                  <Text className="text-gray-700 text-sm leading-5">
                    {rules}
                  </Text>
                </View>
              </Card>
            )}

            {/* Maintenance Request Form */}
            <Card className="mb-4">
              <View className="gap-3">
                <Text className="text-lg font-semibold text-gray-800">
                  Submit Maintenance Request
                </Text>

                <Text className="text-gray-600 text-sm">
                  Need something fixed? Submit a maintenance request and
                  we&apos;ll get it taken care of.
                </Text>

                <TouchableOpacity
                  className="border border-brand py-3 rounded-md flex-row items-center justify-center space-x-2 active:bg-brand/10"
                  onPress={handleSubmitMaintenance}
                >
                  <MaterialIcons name="build" size={20} color={BRAND_COLOR} />
                  <Text className="text-brand font-medium">
                    Submit New Request
                  </Text>
                </TouchableOpacity>
              </View>
            </Card>

            {/* Recent Maintenance Requests */}
            <Card className="mb-6">
              <View className="space-y-3">
                <Text className="text-lg font-semibold text-gray-800">
                  Your Maintenance Requests
                </Text>

                <Text className="text-gray-500 text-sm text-center py-4">
                  No maintenance requests submitted yet
                </Text>
              </View>
            </Card>
          </View>
        </ScrollView>
      </View>
    </SafeAreaWrapper>
  );
}
