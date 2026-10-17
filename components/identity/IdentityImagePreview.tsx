import { Modal, Pressable, Text, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';

export function IdentityImagePreview({ uri, title, onClose, onError, onChangePicture }: {
  uri: string | null;
  title: string;
  onClose: () => void;
  onError: () => void;
  onChangePicture?: () => void;
}) {
  const { height } = useWindowDimensions();
  return <Modal visible={!!uri} transparent animationType="fade" onRequestClose={onClose}>
    {uri && <View className="flex-1 items-center justify-center bg-black/70 p-5">
      <Pressable accessibilityRole="button" accessibilityLabel="Dismiss picture preview" onPress={onClose}
        style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }} />
      <View accessibilityViewIsModal onAccessibilityEscape={onClose} className="w-full gap-4 rounded-xl bg-white p-4"
        style={{ height: Math.min(height * 0.85, 760), maxWidth: 720 }}>
        <Text accessibilityRole="header" className="text-lg font-semibold">{title}</Text>
        <Image source={{ uri }} accessibilityLabel={title} style={{ flex: 1, width: '100%' }}
          contentFit="contain" cachePolicy="none" onError={onError} />
        <View className="flex-row gap-3">
          {onChangePicture && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Change picture"
              onPress={onChangePicture}
              className="flex-1 rounded-md border border-gray-300 bg-white px-4 py-3 active:bg-gray-50"
            >
              <Text className="text-center font-semibold text-gray-700">Change picture</Text>
            </Pressable>
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close picture"
            onPress={onClose}
            className={`${onChangePicture ? 'flex-1' : 'w-full'} rounded-md bg-brand px-4 py-3 active:opacity-90`}
          >
            <Text className="text-center font-semibold text-white">Close picture</Text>
          </Pressable>
        </View>
      </View>
    </View>}
  </Modal>;
}
