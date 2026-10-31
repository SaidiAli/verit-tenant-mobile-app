import { View, Text } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaWrapper } from "../../components/ui/SafeAreaWrapper";
import { FinWiseScreen } from "../../components/ui/FinWiseScreen";

const SECTIONS: { title: string; body: string }[] = [
  {
    title: "1. Acceptance of Terms",
    body: "By accessing and using the Verit application, you accept and agree to be bound by the terms and provision of this agreement.",
  },
  {
    title: "2. Use License",
    body: "Permission is granted to temporarily download one copy of the materials on Verit's mobile application for personal, non-commercial transitory viewing only.",
  },
  {
    title: "3. User Account",
    body: "You are responsible for safeguarding the password and for maintaining the confidentiality of your account. You agree not to disclose your password to any third party.",
  },
  {
    title: "4. Privacy Policy",
    body: "Your privacy is important to us. Please review our Privacy Policy, which also governs your use of the Service, to understand our practices.",
  },
  {
    title: "5. Payment Terms",
    body: "All payments made through the application are subject to the terms and conditions of the respective payment providers. We are not responsible for payment processing failures.",
  },
  {
    title: "6. Disclaimer",
    body: "The materials on Verit's mobile application are provided on an 'as is' basis. Verit makes no warranties, expressed or implied.",
  },
  {
    title: "7. Limitations",
    body: "In no event shall Verit or its suppliers be liable for any damages arising out of the use or inability to use the materials on the application.",
  },
  {
    title: "8. Accuracy of Materials",
    body: "The materials appearing on Verit's application could include technical, typographical, or photographic errors. Verit does not warrant that any of the materials are accurate, complete, or current.",
  },
  {
    title: "9. Modifications",
    body: "Verit may revise these terms of service at any time without notice. By using this application, you are agreeing to be bound by the then current version of these terms of service.",
  },
  {
    title: "10. Contact Information",
    body: "If you have any questions about these Terms of Service, please contact us at support@verit.tech",
  },
];

export default function TermsOfServiceScreen() {
  const router = useRouter();

  return (
    <SafeAreaWrapper>
      <FinWiseScreen
        title="Terms & Conditions"
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
              Last updated: December 2025
            </Text>
          </View>
        </View>
      </FinWiseScreen>
    </SafeAreaWrapper>
  );
}
