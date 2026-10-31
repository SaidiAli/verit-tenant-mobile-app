import { View, Text } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaWrapper } from "../../components/ui/SafeAreaWrapper";
import { FinWiseScreen } from "../../components/ui/FinWiseScreen";

const SECTIONS: { title: string; body: string }[] = [
  {
    title: "1. Information We Collect",
    body: "We collect information you provide directly to us, such as when you create an account, make a payment, or contact us for support. This includes your name, email address, phone number, and payment information.",
  },
  {
    title: "2. How We Use Your Information",
    body: "We use the information we collect to provide, maintain, and improve our services, process payments, send you technical notices and support messages, and communicate with you about products, services, and promotional offers.",
  },
  {
    title: "3. Information Sharing and Disclosure",
    body: "We do not sell, trade, or otherwise transfer your personal information to third parties without your consent, except as described in this privacy policy or as required by law.",
  },
  {
    title: "4. Data Security",
    body: "We implement appropriate security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the internet is 100% secure.",
  },
  {
    title: "5. Payment Information",
    body: "Payment processing is handled by secure third-party payment processors. We do not store your complete payment card information on our servers.",
  },
  {
    title: "6. Location Information",
    body: "We may collect location information to provide location-based services. You can disable location services in your device settings at any time.",
  },
  {
    title: "7. Cookies and Tracking Technologies",
    body: "We use cookies and similar tracking technologies to track activity on our service and hold certain information to improve user experience.",
  },
  {
    title: "8. Children's Privacy",
    body: "Our service is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13.",
  },
  {
    title: "9. Your Rights",
    body: "You have the right to access, update, or delete your personal information. You can also opt out of certain communications from us.",
  },
  {
    title: "10. Changes to This Policy",
    body: "We may update this privacy policy from time to time. We will notify you of any changes by posting the new privacy policy on this page.",
  },
  {
    title: "11. Contact Us",
    body: "If you have any questions about this Privacy Policy, please contact us at privacy@verit.tech or through the app's support section.",
  },
];

export default function PrivacyPolicyScreen() {
  const router = useRouter();

  return (
    <SafeAreaWrapper>
      <FinWiseScreen
        title="Privacy Policy"
        onBack={() => router.back()}
        header={<View />}
        headerClassName="px-9 pt-6 pb-8"
      >
        <View className="space-y-7">
          {SECTIONS.map(section => (
            <View key={section.title}>
              <Text className="text-[15px] font-medium text-finance-fence mb-1.5">
                {section.title}
              </Text>
              <Text className="text-[13px] text-gray-500 leading-relaxed">
                {section.body}
              </Text>
            </View>
          ))}

          <View className="pt-4 border-t border-gray-100">
            <Text className="text-[12px] text-gray-400 text-center">
              Last updated: January 2024
            </Text>
          </View>
        </View>
      </FinWiseScreen>
    </SafeAreaWrapper>
  );
}
