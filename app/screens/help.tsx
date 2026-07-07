import { BRAND_COLOR } from "@/constants/theme";
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  Linking,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { Card } from "../../components/ui/Card";
import { SafeAreaWrapper } from "../../components/ui/SafeAreaWrapper";

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
    color: "#EF4444",
  },
  {
    id: "2",
    title: "Office Hours",
    description: "View property management hours",
    icon: "schedule",
    color: BRAND_COLOR,
  },
  {
    id: "3",
    title: "Pay Rent",
    description: "Make your monthly payment",
    icon: "payment",
    color: "#10B981",
  },
];

export default function HelpScreen() {
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
      <View className="flex-1 bg-gray-50">
        <ScrollView showsVerticalScrollIndicator={false}>
          <View className="px-4 pt-6 pb-4">
            {/* Header */}
            <Text className="text-2xl font-semibold text-gray-800 mb-6">
              Help & Resources
            </Text>

            {/* Quick Actions */}
            <View className="mb-6">
              <Text className="text-lg font-semibold text-gray-800 mb-4">
                Quick Actions
              </Text>
              <View className="flex-row flex-wrap gap-3">
                {quickActions.map((action) => (
                  <TouchableOpacity
                    key={action.id}
                    className="flex-1 min-w-[100px] items-center py-4 bg-white rounded-lg shadow-sm border border-gray-200 active:bg-gray-50"
                    onPress={() => handleQuickAction(action.id)}
                  >
                    <MaterialIcons
                      name={action.icon as any}
                      size={28}
                      color={action.color}
                    />
                    <Text className="text-sm font-medium text-gray-800 mt-2 text-center">
                      {action.title}
                    </Text>
                    <Text className="text-xs text-gray-500 mt-1 text-center px-2">
                      {action.description}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Help Topics */}
            <View className="mb-6">
              <Text className="text-lg font-semibold text-gray-800 mb-4">
                Help Topics
              </Text>
              <View className="gap-3">
                {helpTopics.map((topic) => (
                  <Card key={topic.id}>
                    <TouchableOpacity
                      className="flex-row items-center gap-3"
                      onPress={() => handleTopicPress(topic.id)}
                    >
                      <View className="w-10 h-10 bg-brand/10 rounded-full items-center justify-center">
                        <MaterialIcons
                          name={topic.icon as any}
                          size={20}
                          color={BRAND_COLOR}
                        />
                      </View>
                      <View className="flex-1">
                        <Text className="font-medium text-gray-800">
                          {topic.title}
                        </Text>
                        <Text className="text-sm text-gray-600 mt-1">
                          {topic.description}
                        </Text>
                      </View>
                      <MaterialIcons
                        name="chevron-right"
                        size={20}
                        color="#6B7280"
                      />
                    </TouchableOpacity>
                  </Card>
                ))}
              </View>
            </View>

            {/* Contact Support */}
            <Card className="mb-4">
              <View className="gap-4 items-center">
                <View className="w-16 h-16 bg-blue-100 rounded-full items-center justify-center">
                  <MaterialIcons
                    name="help-outline"
                    size={28}
                    color="#3B82F6"
                  />
                </View>

                <View className="items-center">
                  <Text className="text-lg font-semibold text-gray-800">
                    Need More Help?
                  </Text>
                  <Text className="text-gray-600 text-center mt-1">
                    Can&apos;t find what you&apos;re looking for? Contact our
                    support team.
                  </Text>
                </View>

                <TouchableOpacity
                  className="bg-brand px-6 py-3 rounded-md"
                  onPress={handleContactSupport}
                >
                  <Text className="text-white font-medium">
                    Contact Support
                  </Text>
                </TouchableOpacity>
              </View>
            </Card>

            {/* Property Management Info */}
            <Card className="mb-6">
              <View className="space-y-3">
                <Text className="text-lg font-semibold text-gray-800">
                  Property Management
                </Text>

                <View className="space-y-2">
                  <Text className="text-gray-700">
                    Verit Property Management
                  </Text>
                  <Text className="text-gray-600 text-sm">
                    Your trusted property management team is here to help make
                    your rental experience as smooth as possible.
                  </Text>
                </View>

                <TouchableOpacity
                  className="flex-row items-center space-x-2 mt-3"
                  onPress={openWebsite}
                >
                  <MaterialIcons
                    name="language"
                    size={16}
                    color={BRAND_COLOR}
                  />
                  <Text className="text-brand text-sm font-medium">
                    Visit Our Website
                  </Text>
                </TouchableOpacity>
              </View>
            </Card>
          </View>
        </ScrollView>
      </View>
    </SafeAreaWrapper>
  );
}
