import { ScrollView, View, Text, TouchableOpacity, TextInput, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import { Card } from '../../components/ui/Card';
import { SafeAreaWrapper } from '../../components/ui/SafeAreaWrapper';

export default function EditProfileScreen() {
  const { user, updateUser } = useAuth();
  const router = useRouter();

  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: user?.phone || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const { mutate: saveProfile, isPending } = useMutation({
    mutationFn: (data: typeof formData) => updateUser(data),
    onSuccess: () => Alert.alert('Success', 'Profile updated successfully', [{ text: 'OK', onPress: () => router.back() }]),
    onError: (err: any) => Alert.alert('Error', err.message || 'Failed to update profile'),
  });

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (formData.phone && !/^(\+?256|0)[0-9]{9}$/.test(formData.phone.replace(/\s/g, ''))) {
      newErrors.phone = 'Enter a valid Ugandan phone (+256XXXXXXXXX or 0XXXXXXXXX)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validateForm()) return;
    saveProfile({ ...formData, phone: formData.phone.replace(/\s/g, '') });
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <SafeAreaWrapper>
      <View className="flex-1 bg-gray-50">
        <ScrollView showsVerticalScrollIndicator={false}>
          <View className="px-4 pt-6 pb-4">
            {/* Header */}
            <View className="flex-row items-center mb-6">
              <TouchableOpacity
                onPress={handleCancel}
                className="flex-row items-center gap-2 p-2 -ml-2 rounded-md active:bg-gray-200"
              >
                <MaterialIcons name="arrow-back" size={24} color="#374151" />
              </TouchableOpacity>

              <Text className="text-xl font-semibold text-gray-800 ml-2">
                Edit Profile
              </Text>
            </View>

            {/* Profile Photo Section */}
            <View className="mb-4">
              <View className="items-center space-y-4">
                <View className="w-24 h-24 bg-brand rounded-full items-center justify-center">
                  <Text className="text-white font-bold text-2xl">
                    {formData.firstName?.charAt(0).toUpperCase() ?? ''}{formData.lastName?.charAt(0).toUpperCase() ?? ''}
                  </Text>
                </View>
              </View>
            </View>

            {/* Form Fields */}
            <Card className="mb-4">
              <View className="space-y-4">
                <Text className="text-lg font-semibold text-gray-800 mb-2">
                  Personal Information
                </Text>

                {/* First Name */}
                <View>
                  <Text className="text-sm font-medium text-gray-700 mb-1">
                    First Name
                  </Text>
                  <TextInput
                    value={formData.firstName}
                    onChangeText={(text) => {
                      setFormData(prev => ({ ...prev, firstName: text }));
                      if (errors.firstName) {
                        setErrors(prev => ({ ...prev, firstName: '' }));
                      }
                    }}
                    className={`border rounded-md px-3 py-3 bg-white ${errors.firstName ? 'border-red-500' : 'border-gray-300'
                      }`}
                    placeholder="Enter your first name"
                  />
                  {errors.firstName && (
                    <Text className="text-red-500 text-sm mt-1">
                      {errors.firstName}
                    </Text>
                  )}
                </View>

                {/* Last Name */}
                <View>
                  <Text className="text-sm font-medium text-gray-700 mb-1">
                    Last Name
                  </Text>
                  <TextInput
                    value={formData.lastName}
                    onChangeText={(text) => {
                      setFormData(prev => ({ ...prev, lastName: text }));
                      if (errors.lastName) {
                        setErrors(prev => ({ ...prev, lastName: '' }));
                      }
                    }}
                    className={`border rounded-md px-3 py-3 bg-white ${errors.lastName ? 'border-red-500' : 'border-gray-300'
                      }`}
                    placeholder="Enter your last name"
                  />
                  {errors.lastName && (
                    <Text className="text-red-500 text-sm mt-1">
                      {errors.lastName}
                    </Text>
                  )}
                </View>

                {/* Email */}
                <View>
                  <Text className="text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </Text>
                  <TextInput
                    value={formData.email}
                    onChangeText={(text) => {
                      setFormData(prev => ({ ...prev, email: text }));
                      if (errors.email) {
                        setErrors(prev => ({ ...prev, email: '' }));
                      }
                    }}
                    className={`border rounded-md px-3 py-3 bg-white ${errors.email ? 'border-red-500' : 'border-gray-300'
                      }`}
                    placeholder="Enter your email address"
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                  {errors.email && (
                    <Text className="text-red-500 text-sm mt-1">
                      {errors.email}
                    </Text>
                  )}
                </View>

                {/* Phone */}
                <View>
                  <Text className="text-sm font-medium text-gray-700 mb-1">
                    Phone Number
                  </Text>
                  <TextInput
                    value={formData.phone}
                    onChangeText={(text) => {
                      setFormData(prev => ({ ...prev, phone: text }));
                      if (errors.phone) {
                        setErrors(prev => ({ ...prev, phone: '' }));
                      }
                    }}
                    className={`border rounded-md px-3 py-3 bg-white ${errors.phone ? 'border-red-500' : 'border-gray-300'
                      }`}
                    placeholder="Enter your phone number"
                    keyboardType="phone-pad"
                  />
                  {errors.phone && (
                    <Text className="text-red-500 text-sm mt-1">
                      {errors.phone}
                    </Text>
                  )}
                </View>
              </View>
            </Card>

            {/* Action Buttons */}
            <View className="gap-2 mt-6">
              <TouchableOpacity
                onPress={handleSave}
                disabled={isPending}
                className={`py-4 rounded-md ${isPending ? 'bg-gray-300' : 'bg-brand'
                  }`}
              >
                <Text className="text-white font-semibold text-center text-lg">
                  {isPending ? 'Saving Changes...' : 'Save Changes'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleCancel}
                className="py-4 rounded-md border border-gray-300 bg-white"
              >
                <Text className="text-gray-700 font-semibold text-center text-lg">
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>
    </SafeAreaWrapper>
  );
}
