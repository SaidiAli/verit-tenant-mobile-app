import { useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Alert,
  Image,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { Card } from '../../components/ui/Card';
import { SafeAreaWrapper } from '../../components/ui/SafeAreaWrapper';
import { useAuth } from '../../hooks/useAuth';
import { tenantApi } from '../../lib/api';
import type {
  CreateMaintenanceRequestInput,
  MaintenancePhotoUpload,
  MaintenancePriority,
} from '../../types';

const MAX_PHOTOS = 10;

const PRIORITIES: { value: MaintenancePriority; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

export default function CreateMaintenanceRequestScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    title: '',
    description: '',
    priority: 'medium' as MaintenancePriority,
  });
  const [photos, setPhotos] = useState<MaintenancePhotoUpload[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Category is intentionally not collected here — the landlord/manager triages
  // and sets it. The server defaults new requests to "other".
  const { mutate: submit, isPending } = useMutation({
    mutationFn: (input: CreateMaintenanceRequestInput) => tenantApi.createMaintenanceRequest(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-requests', user?.id] });
      Alert.alert('Submitted', 'Your maintenance request has been sent to your landlord.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    },
    onError: (err: any) => Alert.alert('Error', err.message || 'Failed to submit request'),
  });

  const pickPhotos = async () => {
    const remaining = MAX_PHOTOS - photos.length;
    if (remaining <= 0) {
      Alert.alert('Limit reached', `You can attach up to ${MAX_PHOTOS} photos.`);
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Please allow photo library access to attach photos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.7,
    });

    if (result.canceled) return;

    const picked: MaintenancePhotoUpload[] = result.assets.map((asset, index) => {
      const name = asset.fileName || asset.uri.split('/').pop() || `photo-${index}.jpg`;
      return {
        uri: asset.uri,
        name,
        type: asset.mimeType || 'image/jpeg',
      };
    });

    setPhotos((prev) => [...prev, ...picked].slice(0, MAX_PHOTOS));
  };

  const removePhoto = (uri: string) => {
    setPhotos((prev) => prev.filter((p) => p.uri !== uri));
  };

  const validate = () => {
    const next: Record<string, string> = {};
    if (!form.title.trim()) next.title = 'Title is required';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    submit({
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      priority: form.priority,
      photos: photos.length > 0 ? photos : undefined,
    });
  };

  return (
    <SafeAreaWrapper backgroundColor="#F9FAFB">
      <View className="flex-1 bg-gray-50">
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View className="px-4 pt-6 pb-4">
            {/* Header */}
            <View className="flex-row items-center mb-6">
              <TouchableOpacity
                onPress={() => router.back()}
                className="flex-row items-center gap-2 p-2 -ml-2 rounded-md"
              >
                <MaterialIcons name="arrow-back" size={24} color="#374151" />
              </TouchableOpacity>
              <Text className="text-xl font-semibold text-gray-800 ml-2">Report an Issue</Text>
            </View>

            <Card className="mb-4">
              <View className="space-y-4">
                {/* Title */}
                <View>
                  <Text className="text-sm font-medium text-gray-700 mb-1">Title</Text>
                  <TextInput
                    value={form.title}
                    onChangeText={(text) => {
                      setForm((prev) => ({ ...prev, title: text }));
                      if (errors.title) setErrors((prev) => ({ ...prev, title: '' }));
                    }}
                    className={`border rounded-md px-3 py-3 bg-white ${
                      errors.title ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="e.g. Leaking kitchen tap"
                    maxLength={255}
                  />
                  {errors.title && <Text className="text-red-500 text-sm mt-1">{errors.title}</Text>}
                </View>

                {/* Description (optional) */}
                <View>
                  <Text className="text-sm font-medium text-gray-700 mb-1">
                    Description <Text className="text-gray-400 font-normal">(optional)</Text>
                  </Text>
                  <TextInput
                    value={form.description}
                    onChangeText={(text) => setForm((prev) => ({ ...prev, description: text }))}
                    className="border border-gray-300 rounded-md px-3 py-3 bg-white"
                    placeholder="Describe the problem in detail"
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                    maxLength={5000}
                  />
                </View>
              </View>
            </Card>

            {/* Priority */}
            <Card className="mb-4">
              <Text className="text-sm font-medium text-gray-700 mb-3">Priority</Text>
              <View className="flex-row flex-wrap gap-2">
                {PRIORITIES.map((p) => {
                  const selected = form.priority === p.value;
                  return (
                    <TouchableOpacity
                      key={p.value}
                      onPress={() => setForm((prev) => ({ ...prev, priority: p.value }))}
                      className={`px-4 py-2 rounded-full border ${
                        selected ? 'bg-[#524768] border-[#524768]' : 'bg-white border-gray-300'
                      }`}
                    >
                      <Text className={selected ? 'text-white font-medium' : 'text-gray-700'}>
                        {p.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </Card>

            {/* Photos */}
            <Card className="mb-4">
              <View className="flex-row justify-between items-center mb-3">
                <Text className="text-sm font-medium text-gray-700">
                  Photos {photos.length > 0 ? `(${photos.length}/${MAX_PHOTOS})` : '(optional)'}
                </Text>
                <TouchableOpacity
                  onPress={pickPhotos}
                  className="flex-row items-center gap-1 px-3 py-2 rounded-md bg-gray-100"
                >
                  <MaterialIcons name="add-a-photo" size={18} color="#524768" />
                  <Text className="text-[#524768] font-medium text-sm">Add</Text>
                </TouchableOpacity>
              </View>

              {photos.length === 0 ? (
                <Text className="text-gray-400 text-sm">
                  Add up to {MAX_PHOTOS} photos to help your landlord understand the issue.
                </Text>
              ) : (
                <View className="flex-row flex-wrap gap-2">
                  {photos.map((photo) => (
                    <View key={photo.uri} className="relative">
                      <Image
                        source={{ uri: photo.uri }}
                        className="w-20 h-20 rounded-md"
                        resizeMode="cover"
                      />
                      <TouchableOpacity
                        onPress={() => removePhoto(photo.uri)}
                        className="absolute -top-2 -right-2 bg-red-500 rounded-full w-6 h-6 items-center justify-center"
                      >
                        <MaterialIcons name="close" size={16} color="white" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </Card>

            {/* Actions */}
            <View className="gap-2 mt-4">
              <TouchableOpacity
                onPress={handleSubmit}
                disabled={isPending}
                className={`py-4 rounded-md ${isPending ? 'bg-gray-300' : 'bg-[#524768]'}`}
              >
                <Text className="text-white font-semibold text-center text-lg">
                  {isPending ? 'Submitting...' : 'Submit Request'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => router.back()}
                disabled={isPending}
                className="py-4 rounded-md border border-gray-300 bg-white"
              >
                <Text className="text-gray-700 font-semibold text-center text-lg">Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>
    </SafeAreaWrapper>
  );
}
