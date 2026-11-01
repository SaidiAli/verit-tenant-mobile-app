import { session } from '../../lib/session';
import { tenantKeys } from '../../lib/queryKeys';
import { BRAND_COLOR } from '@/constants/theme';
import { useState, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  Alert,
  Image,
  useWindowDimensions,
  Pressable,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../hooks/useAuth';
import { useKeyboardHeight } from '../../hooks/useKeyboardHeight';
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

interface CreateMaintenanceRequestModalProps {
  visible: boolean;
  onClose: () => void;
}

export function CreateMaintenanceRequestModal({
  visible,
  onClose,
}: CreateMaintenanceRequestModalProps) {
  const { user } = useAuth();
  const generation = useRef(session.current()).current;
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const keyboardHeight = useKeyboardHeight();
  const { height: windowHeight } = useWindowDimensions();

  const [form, setForm] = useState({
    title: '',
    description: '',
    priority: 'medium' as MaintenancePriority,
  });
  const [photos, setPhotos] = useState<MaintenancePhotoUpload[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [previousVisible, setPreviousVisible] = useState(visible);
  if (previousVisible !== visible) {
    setPreviousVisible(visible);
    if (visible) {
      setForm({ title: '', description: '', priority: 'medium' });
      setPhotos([]);
      setErrors({});
    }
  }

  // Category is intentionally not collected here — the landlord/manager triages
  // and sets it. The server defaults new requests to "other".
  const { mutate: submit, isPending } = useMutation({
    mutationFn: (input: CreateMaintenanceRequestInput) => tenantApi.createMaintenanceRequest(input),
    onSuccess: () => {
      if (!session.isCurrent(generation)) return;
      queryClient.invalidateQueries({ queryKey: tenantKeys.query(user?.id, 'maintenance-requests') });
      Alert.alert('Submitted', 'Your maintenance request has been sent to your landlord.', [
        { text: 'OK', onPress: () => onClose() },
      ]);
    },
    onError: (err: any) => session.isCurrent(generation) && Alert.alert('Error', err.message || 'Failed to submit request'),
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
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View
        className="flex-1 justify-end"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      >
        {/* Backdrop — tap to dismiss */}
        <Pressable className="flex-1" onPress={() => { if (!isPending) onClose(); }} />

        {/* Bottom sheet — lifted above the keyboard while typing */}
        <View
          className="bg-white rounded-t-[40px] px-9 pt-3"
          style={{
            paddingBottom: Math.max(insets.bottom, 20),
            marginBottom: keyboardHeight,
            maxHeight: windowHeight * 0.9 - keyboardHeight,
          }}
        >
          {/* Drag handle */}
          <View className="w-12 h-1.5 rounded-full bg-gray-200 self-center mt-3" />

          {/* Header */}
          <View className="flex-row items-center justify-between mt-4 mb-5">
            <Text className="text-[20px] leading-[22px] font-semibold text-finance-fence">
              Report an Issue
            </Text>
            <TouchableOpacity
              onPress={onClose}
              disabled={isPending}
              className="w-[30px] h-[30px] rounded-full bg-brand-light items-center justify-center"
            >
              <MaterialIcons name="close" size={18} color={BRAND_COLOR} />
            </TouchableOpacity>
          </View>

          <ScrollView
            automaticallyAdjustKeyboardInsets
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View className="gap-6 pb-2">
              {/* Title */}
              <View>
                <Text className="text-sm font-medium text-gray-700 mb-1">Title</Text>
                <TextInput
                  value={form.title}
                  onChangeText={(text) => {
                    setForm((prev) => ({ ...prev, title: text }));
                    if (errors.title) setErrors((prev) => ({ ...prev, title: '' }));
                  }}
                  className={`h-[41px] rounded-[18px] px-4 bg-brand-light text-[16px] text-finance-fence ${
                    errors.title ? 'bg-red-50' : ''
                  }`}
                  placeholder="e.g. Leaking kitchen tap"
                  placeholderTextColor="#9CA3AF"
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
                  className="rounded-[18px] px-4 py-3 bg-brand-light text-[16px] text-finance-fence"
                  placeholder="Describe the problem in detail"
                  placeholderTextColor="#9CA3AF"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  maxLength={5000}
                />
              </View>

              {/* Priority */}
              <View>
                <Text className="text-[15px] font-medium text-finance-fence mb-3">Priority</Text>
                <View className="flex-row flex-wrap gap-2">
                  {PRIORITIES.map((p) => {
                    const selected = form.priority === p.value;
                    return (
                      <TouchableOpacity
                        key={p.value}
                        onPress={() => setForm((prev) => ({ ...prev, priority: p.value }))}
                        className={`h-[38px] px-5 rounded-full items-center justify-center ${
                          selected ? 'bg-finance' : 'bg-brand-light'
                        }`}
                      >
                        <Text className={selected ? 'text-finance-fence font-medium text-[13px]' : 'text-finance-fence text-[13px]'}>
                          {p.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Photos */}
              <View>
                <View className="flex-row justify-between items-center mb-3">
                  <Text className="text-[15px] font-medium text-finance-fence">
                    Photos {photos.length > 0 ? `(${photos.length}/${MAX_PHOTOS})` : '(optional)'}
                  </Text>
                  <TouchableOpacity
                    onPress={pickPhotos}
                    className="flex-row items-center gap-1.5 px-4 h-[34px] rounded-full bg-brand-light"
                  >
                    <MaterialIcons name="add-a-photo" size={16} color={BRAND_COLOR} />
                    <Text className="text-brand font-semibold text-[12px]">Add</Text>
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
                          className="w-20 h-20 rounded-[18px]"
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
              </View>

              {/* Submit */}
              <TouchableOpacity
                onPress={handleSubmit}
                disabled={isPending}
                className={`h-[45px] rounded-[30px] items-center justify-center mt-2 ${
                  isPending ? 'bg-brand-light' : 'bg-finance'
                }`}
              >
                <Text className={`font-semibold text-[15px] ${isPending ? 'text-gray-400' : 'text-finance-fence'}`}>
                  {isPending ? 'Submitting...' : 'Submit Request'}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
