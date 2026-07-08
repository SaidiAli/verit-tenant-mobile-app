import { ScrollView, View, Text, TouchableOpacity } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Card } from "../../components/ui/Card";
import { SafeAreaWrapper } from "../../components/ui/SafeAreaWrapper";

export default function TermsOfServiceScreen() {
  const router = useRouter();

  return (
    <SafeAreaWrapper>
      <View className="flex-1 bg-gray-50">
        <ScrollView showsVerticalScrollIndicator={false}>
          <View className="px-4 pt-6 pb-4">

            <Card className="mb-4">
              <View className="gap-4">
                <View>
                  <Text className="text-lg font-semibold text-gray-800 mb-2">
                    1. Acceptance of Terms
                  </Text>
                  <Text className="text-gray-600 leading-6">
                    By accessing and using the Verit application, you accept and
                    agree to be bound by the terms and provision of this
                    agreement.
                  </Text>
                </View>

                <View>
                  <Text className="text-lg font-semibold text-gray-800 mb-2">
                    2. Use License
                  </Text>
                  <Text className="text-gray-600 leading-6">
                    Permission is granted to temporarily download one copy of
                    the materials on Verit&apos;s mobile application for
                    personal, non-commercial transitory viewing only.
                  </Text>
                </View>

                <View>
                  <Text className="text-lg font-semibold text-gray-800 mb-2">
                    3. User Account
                  </Text>
                  <Text className="text-gray-600 leading-6">
                    You are responsible for safeguarding the password and for
                    maintaining the confidentiality of your account. You agree
                    not to disclose your password to any third party.
                  </Text>
                </View>

                <View>
                  <Text className="text-lg font-semibold text-gray-800 mb-2">
                    4. Privacy Policy
                  </Text>
                  <Text className="text-gray-600 leading-6">
                    Your privacy is important to us. Please review our Privacy
                    Policy, which also governs your use of the Service, to
                    understand our practices.
                  </Text>
                </View>

                <View>
                  <Text className="text-lg font-semibold text-gray-800 mb-2">
                    5. Payment Terms
                  </Text>
                  <Text className="text-gray-600 leading-6">
                    All payments made through the application are subject to the
                    terms and conditions of the respective payment providers. We
                    are not responsible for payment processing failures.
                  </Text>
                </View>

                <View>
                  <Text className="text-lg font-semibold text-gray-800 mb-2">
                    6. Disclaimer
                  </Text>
                  <Text className="text-gray-600 leading-6">
                    The materials on Verit&apos;s mobile application are
                    provided on an &apos;as is&apos; basis. Verit makes no
                    warranties, expressed or implied.
                  </Text>
                </View>

                <View>
                  <Text className="text-lg font-semibold text-gray-800 mb-2">
                    7. Limitations
                  </Text>
                  <Text className="text-gray-600 leading-6">
                    In no event shall Verit or its suppliers be liable for any
                    damages arising out of the use or inability to use the
                    materials on the application.
                  </Text>
                </View>

                <View>
                  <Text className="text-lg font-semibold text-gray-800 mb-2">
                    8. Accuracy of Materials
                  </Text>
                  <Text className="text-gray-600 leading-6">
                    The materials appearing on Verit&apos;s application could
                    include technical, typographical, or photographic errors.
                    Verit does not warrant that any of the materials are
                    accurate, complete, or current.
                  </Text>
                </View>

                <View>
                  <Text className="text-lg font-semibold text-gray-800 mb-2">
                    9. Modifications
                  </Text>
                  <Text className="text-gray-600 leading-6">
                    Verit may revise these terms of service at any time without
                    notice. By using this application, you are agreeing to be
                    bound by the then current version of these terms of service.
                  </Text>
                </View>

                <View>
                  <Text className="text-lg font-semibold text-gray-800 mb-2">
                    10. Contact Information
                  </Text>
                  <Text className="text-gray-600 leading-6">
                    If you have any questions about these Terms of Service,
                    please contact us at support@verit.tech
                  </Text>
                </View>

                <View className="mt-6 pt-4 border-t border-gray-200">
                  <Text className="text-sm text-gray-500 text-center">
                    Last updated: December 2025
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
