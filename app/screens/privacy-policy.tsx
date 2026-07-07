import { ScrollView, View, Text, TouchableOpacity } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Card } from "../../components/ui/Card";
import { SafeAreaWrapper } from "../../components/ui/SafeAreaWrapper";

export default function PrivacyPolicyScreen() {
  const router = useRouter();

  return (
    <SafeAreaWrapper backgroundColor="#F9FAFB">
      <View className="flex-1 bg-gray-50">
        <ScrollView showsVerticalScrollIndicator={false}>
          <View className="px-4 pt-6 pb-4">
            {/* Header */}
            <View className="flex-row items-center mb-6">
              <TouchableOpacity
                onPress={() => router.back()}
                className="flex-row items-center gap-2 p-2 -ml-2 rounded-md active:bg-gray-200"
              >
                <MaterialIcons name="arrow-back" size={24} color="#374151" />
              </TouchableOpacity>

              <Text className="text-xl font-semibold text-gray-800 ml-2">
                Privacy Policy
              </Text>
            </View>

            <Card className="mb-4">
              <View className="gap-4">
                <View>
                  <Text className="text-lg font-semibold text-gray-800 mb-2">
                    1. Information We Collect
                  </Text>
                  <Text className="text-gray-600 leading-6">
                    We collect information you provide directly to us, such as
                    when you create an account, make a payment, or contact us
                    for support. This includes your name, email address, phone
                    number, and payment information.
                  </Text>
                </View>

                <View>
                  <Text className="text-lg font-semibold text-gray-800 mb-2">
                    2. How We Use Your Information
                  </Text>
                  <Text className="text-gray-600 leading-6">
                    We use the information we collect to provide, maintain, and
                    improve our services, process payments, send you technical
                    notices and support messages, and communicate with you about
                    products, services, and promotional offers.
                  </Text>
                </View>

                <View>
                  <Text className="text-lg font-semibold text-gray-800 mb-2">
                    3. Information Sharing and Disclosure
                  </Text>
                  <Text className="text-gray-600 leading-6">
                    We do not sell, trade, or otherwise transfer your personal
                    information to third parties without your consent, except as
                    described in this privacy policy or as required by law.
                  </Text>
                </View>

                <View>
                  <Text className="text-lg font-semibold text-gray-800 mb-2">
                    4. Data Security
                  </Text>
                  <Text className="text-gray-600 leading-6">
                    We implement appropriate security measures to protect your
                    personal information against unauthorized access,
                    alteration, disclosure, or destruction. However, no method
                    of transmission over the internet is 100% secure.
                  </Text>
                </View>

                <View>
                  <Text className="text-lg font-semibold text-gray-800 mb-2">
                    5. Payment Information
                  </Text>
                  <Text className="text-gray-600 leading-6">
                    Payment processing is handled by secure third-party payment
                    processors. We do not store your complete payment card
                    information on our servers.
                  </Text>
                </View>

                <View>
                  <Text className="text-lg font-semibold text-gray-800 mb-2">
                    6. Location Information
                  </Text>
                  <Text className="text-gray-600 leading-6">
                    We may collect location information to provide
                    location-based services. You can disable location services
                    in your device settings at any time.
                  </Text>
                </View>

                <View>
                  <Text className="text-lg font-semibold text-gray-800 mb-2">
                    7. Cookies and Tracking Technologies
                  </Text>
                  <Text className="text-gray-600 leading-6">
                    We use cookies and similar tracking technologies to track
                    activity on our service and hold certain information to
                    improve user experience.
                  </Text>
                </View>

                <View>
                  <Text className="text-lg font-semibold text-gray-800 mb-2">
                    8. Children&apos;s Privacy
                  </Text>
                  <Text className="text-gray-600 leading-6">
                    Our service is not intended for children under 13 years of
                    age. We do not knowingly collect personal information from
                    children under 13.
                  </Text>
                </View>

                <View>
                  <Text className="text-lg font-semibold text-gray-800 mb-2">
                    9. Your Rights
                  </Text>
                  <Text className="text-gray-600 leading-6">
                    You have the right to access, update, or delete your
                    personal information. You can also opt out of certain
                    communications from us.
                  </Text>
                </View>

                <View>
                  <Text className="text-lg font-semibold text-gray-800 mb-2">
                    10. Changes to This Policy
                  </Text>
                  <Text className="text-gray-600 leading-6">
                    We may update this privacy policy from time to time. We will
                    notify you of any changes by posting the new privacy policy
                    on this page.
                  </Text>
                </View>

                <View>
                  <Text className="text-lg font-semibold text-gray-800 mb-2">
                    11. Contact Us
                  </Text>
                  <Text className="text-gray-600 leading-6">
                    If you have any questions about this Privacy Policy, please
                    contact us at privacy@verit.tech or through the app&apos;s
                    support section.
                  </Text>
                </View>

                <View className="mt-6 pt-4 border-t border-gray-200">
                  <Text className="text-sm text-gray-500 text-center">
                    Last updated: January 2024
                  </Text>
                </View>
              </View>
            </Card>
          </View>
        </ScrollView>
      </View>
    </SafeAreaWrapper>
  );
}
