import { View, Text, TouchableOpacity, Linking } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { SafeAreaWrapper } from "../../components/ui/SafeAreaWrapper";
import { FinWiseScreen } from "../../components/ui/FinWiseScreen";
import { SettingsRow } from "../../components/ui/SettingsRow";

// Mock help topics and resources for tenants
const helpTopics = [
  {
    id: "1",
    title: "How to Make a Payment",
    description:
      "Learn about different payment methods and how to pay your rent online.",
    icon: "payment",
  },
  {
    id: "2",
    title: "Submit Maintenance Request",
    description:
      "Step-by-step guide on how to report maintenance issues in your unit.",
    icon: "build",
  },
  {
    id: "3",
    title: "Understanding Your Lease",
    description:
      "Find information about your lease terms, renewal process, and policies.",
    icon: "description",
  },
  {
    id: "4",
    title: "Property Amenities",
    description: "Learn about available amenities and how to access them.",
    icon: "pool",
  },
];

const quickActions = [
  {
    id: "1",
    title: "Emergency Contact",
    description: "Get emergency contact information",
    icon: "emergency",
    iconBgClass: "bg-rose-100",
    iconColor: "#EF4444",
  },
  {
    id: "2",
    title: "Office Hours",
    description: "View property management hours",
    icon: "schedule",
    iconBgClass: "bg-brand-light",
    iconColor: "#524768",
  },
  {
    id: "3",
    title: "Pay Rent",
    description: "Make your monthly payment",
    icon: "payment",
    iconBgClass: "bg-finance/15",
    iconColor: "#00D09E",
  },
];

export default function HelpScreen() {
  const router = useRouter();

  const handleTopicPress = (topicId: string) => {
    // TODO: Navigate to help topic detail or open relevant screen
  };

  const handleQuickAction = (actionId: string) => {
    // TODO: Navigate to appropriate screen based on action
  };

  const handleContactSupport = () => {
    // TODO: Open support contact options
  };

  const openWebsite = () => {
    Linking.openURL("https://verit.tech");
  };

  return (
    <SafeAreaWrapper>
      <FinWiseScreen
        title="Help"
        onBack={() => router.back()}
        header={<View />}
        headerClassName="px-9 pt-6 pb-8"
      >
        <View className="space-y-9">
          {/* Quick Actions */}
          <View>
            <Text className="text-[15px] font-medium text-finance-fence mb-3">
              Quick Actions
            </Text>
            <View className="flex-row gap-3">
              {quickActions.map((action) => (
                <TouchableOpacity
                  key={action.id}
                  className="flex-1 bg-brand-light/60 rounded-[22px] py-4 items-center"
                  onPress={() => handleQuickAction(action.id)}
                >
                  <View className={`w-[57px] h-[53px] rounded-[22px] items-center justify-center mb-2 ${action.iconBgClass}`}>
                    <MaterialIcons name={action.icon as any} size={24} color={action.iconColor} />
                  </View>
                  <Text className="text-[13px] font-medium text-finance-fence text-center">
                    {action.title}
                  </Text>
                  <Text className="text-[11px] text-gray-400 text-center mt-0.5 px-1">
                    {action.description}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Help Topics */}
          <View>
            <Text className="text-[15px] font-medium text-finance-fence mb-2">
              Help Topics
            </Text>
            {helpTopics.map((topic) => (
              <SettingsRow
                key={topic.id}
                icon={topic.icon as any}
                iconBgClass="bg-brand-light"
                iconColor="#524768"
                label={topic.title}
                description={topic.description}
                onPress={() => handleTopicPress(topic.id)}
              />
            ))}
          </View>

          {/* Contact Support */}
          <View className="bg-brand-light/60 rounded-[22px] p-6 items-center">
            <View className="w-16 h-16 rounded-full bg-ocean/10 items-center justify-center mb-3">
              <MaterialIcons name="support-agent" size={28} color="#0068FF" />
            </View>

            <Text className="text-[15px] font-medium text-finance-fence">
              Need More Help?
            </Text>
            <Text className="text-[13px] text-gray-500 text-center mt-1 leading-relaxed">
              Can&apos;t find what you&apos;re looking for? Contact our
              support team.
            </Text>

            <TouchableOpacity
              className="h-[45px] px-8 rounded-[30px] bg-finance items-center justify-center mt-4"
              onPress={handleContactSupport}
            >
              <Text className="text-finance-fence font-semibold text-[15px]">
                Contact Support
              </Text>
            </TouchableOpacity>
          </View>

          {/* Property Management Info */}
          <View>
            <Text className="text-[15px] font-medium text-finance-fence mb-2">
              Property Management
            </Text>
            <Text className="text-[13px] text-gray-500 leading-relaxed">
              Verit Property Management — your trusted property management team is here to help make
              your rental experience as smooth as possible.
            </Text>

            <TouchableOpacity
              className="flex-row items-center gap-2 mt-3"
              onPress={openWebsite}
            >
              <MaterialIcons name="language" size={16} color="#524768" />
              <Text className="text-brand text-[13px] font-semibold">
                Visit Our Website
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </FinWiseScreen>
    </SafeAreaWrapper>
  );
}
