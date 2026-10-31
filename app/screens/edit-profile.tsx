import { session } from '../../lib/session';
import { View, Text, TouchableOpacity, TextInput, Alert } from 'react-native';
import { useState, useRef } from 'react';
import { useRouter } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import { SafeAreaWrapper } from '../../components/ui/SafeAreaWrapper';
import { FinWiseScreen } from '../../components/ui/FinWiseScreen';

export default function EditProfileScreen() {
  const { user, updateUser } = useAuth();
  const router = useRouter();
  const generation = useRef(session.current()).current;

  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: user?.phone || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const { mutate: saveProfile, isPending } = useMutation({
    mutationFn: (data: typeof formData) => updateUser(data),
    onSuccess: () => session.isCurrent(generation) && Alert.alert('Success', 'Profile updated successfully', [{ text: 'OK', onPress: () => router.back() }]),
    onError: (err: any) => session.isCurrent(generation) && Alert.alert('Error', err.message || 'Failed to update profile'),
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
      <FinWiseScreen
        title="Edit my Profile"
        onBack={handleCancel}
        headerClassName="px-9 pt-6 pb-8 items-center"
        header={
          /* Avatar on the colored background (Figma 9.5.1-A) */
          <View className="w-[117px] h-[117px] rounded-full bg-white/15 border-2 border-white/30 items-center justify-center mt-4">
            <Text className="text-white font-bold text-[36px] tracking-wider">
              {formData.firstName?.charAt(0).toUpperCase() ?? ''}{formData.lastName?.charAt(0).toUpperCase() ?? ''}
            </Text>
          </View>
        }
      >
        <View className="space-y-9">
          {/* Account settings (Figma 9.5.1-A: 20px heading, 61px field gaps) */}
          <Text className="text-[20px] leading-[22px] font-semibold text-finance-fence">
            Account Settings
          </Text>

          <View className="gap-[30px]">
            {/* First Name */}
            <View>
              <Text className="text-[15px] font-medium text-finance-fence mb-2">
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
                className={`h-[41px] rounded-[18px] px-4 text-[16px] text-finance-fence ${
                  errors.firstName ? 'bg-red-50' : 'bg-brand-light'
                }`}
                placeholder="Enter your first name"
                placeholderTextColor="#9CA3AF"
              />
              {errors.firstName && (
                <Text className="text-red-500 text-[12px] mt-1.5">
                  {errors.firstName}
                </Text>
              )}
            </View>

            {/* Last Name */}
            <View>
              <Text className="text-[15px] font-medium text-finance-fence mb-2">
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
                className={`h-[41px] rounded-[18px] px-4 text-[16px] text-finance-fence ${
                  errors.lastName ? 'bg-red-50' : 'bg-brand-light'
                }`}
                placeholder="Enter your last name"
                placeholderTextColor="#9CA3AF"
              />
              {errors.lastName && (
                <Text className="text-red-500 text-[12px] mt-1.5">
                  {errors.lastName}
                </Text>
              )}
            </View>

            {/* Email */}
            <View>
              <Text className="text-[15px] font-medium text-finance-fence mb-2">
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
                className={`h-[41px] rounded-[18px] px-4 text-[16px] text-finance-fence ${
                  errors.email ? 'bg-red-50' : 'bg-brand-light'
                }`}
                placeholder="Enter your email address"
                placeholderTextColor="#9CA3AF"
                keyboardType="email-address"
                autoCapitalize="none"
              />
              {errors.email && (
                <Text className="text-red-500 text-[12px] mt-1.5">
                  {errors.email}
                </Text>
              )}
            </View>

            {/* Phone */}
            <View>
              <Text className="text-[15px] font-medium text-finance-fence mb-2">
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
                className={`h-[41px] rounded-[18px] px-4 text-[16px] text-finance-fence ${
                  errors.phone ? 'bg-red-50' : 'bg-brand-light'
                }`}
                placeholder="Enter your phone number"
                placeholderTextColor="#9CA3AF"
                keyboardType="phone-pad"
              />
              {errors.phone && (
                <Text className="text-red-500 text-[12px] mt-1.5">
                  {errors.phone}
                </Text>
              )}
            </View>
          </View>

          {/* Action Buttons */}
          <View className="gap-2.5 pt-2">
            <TouchableOpacity
              onPress={handleSave}
              disabled={isPending}
              className={`h-[45px] rounded-[30px] items-center justify-center ${
                isPending ? 'bg-brand-light' : 'bg-finance'
              }`}
            >
              <Text
                className={`font-semibold text-[15px] ${
                  isPending ? 'text-gray-400' : 'text-finance-fence'
                }`}
              >
                {isPending ? 'Saving Changes...' : 'Save Changes'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleCancel}
              className="h-[45px] rounded-[30px] bg-brand-light items-center justify-center"
            >
              <Text className="text-finance-fence font-medium text-[15px]">
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </FinWiseScreen>
    </SafeAreaWrapper>
  );
}
