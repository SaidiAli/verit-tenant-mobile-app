import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { MaterialIcons } from '@expo/vector-icons';
import { BRAND_COLOR } from '@/constants/theme';
import { Card } from '../../components/ui/Card';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { IdentityImagePreview } from '../../components/identity/IdentityImagePreview';
import { SafeAreaWrapper } from '../../components/ui/SafeAreaWrapper';
import { useAuth } from '../../hooks/useAuth';
import { tenantIdentityApi, type TenantIdentity, type IdentitySide, type IdentityPicture } from '../../lib/tenant-identity';
import { identityValues, validateIdentityImage } from '../../lib/tenant-identity-validation';

const sides: IdentitySide[] = ['front', 'back'];
const messageFor = (error: unknown) => (error as { response?: { data?: { error?: string } } })?.response?.data?.error
  || (error instanceof Error ? error.message : 'Unable to complete identity request');

export default function IdentityScreen() {
  const { user } = useAuth();
  return <IdentityEditor key={user?.id ?? 'signed-out'} enabled={user?.role === 'tenant'} />;
}

function IdentityEditor({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const [identity, setIdentity] = useState<TenantIdentity | null>(null);
  const [draft, setDraft] = useState<{ tin: string; nin: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const operationInFlight = useRef(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [pictures, setPictures] = useState<Partial<Record<IdentitySide, IdentityPicture>>>({});
  const [preview, setPreview] = useState<{ side: IdentitySide; url: string; expiresAt: number | null; selected?: boolean } | null>(null);
  const screenActive = useRef(false);
  useFocusEffect(useCallback(() => {
    screenActive.current = true;
    let cancelled = false;
    if (enabled) {
      setLoading(true); setError('');
      tenantIdentityApi.read().then(data => { if (!cancelled) setIdentity(data); })
        .catch(failure => { if (!cancelled) { setIdentity(null); setError(messageFor(failure)); } })
        .finally(() => { if (!cancelled) setLoading(false); });
    }
    return () => { cancelled = true; screenActive.current = false; setPreview(null); };
  }, [enabled]));
  useEffect(() => {
    if (!preview || preview.expiresAt === null) return;
    const timer = setTimeout(() => setPreview(null), Math.max(0, preview.expiresAt - Date.now()));
    return () => clearTimeout(timer);
  }, [preview]);
  useEffect(() => {
    const listener = AppState.addEventListener('change', state => { if (state !== 'active') setPreview(null); });
    return () => listener.remove();
  }, []);
  const values = draft ?? { tin: identity?.tin ?? '', nin: identity?.nin ?? '' };
  async function refresh() {
    setLoading(true); setError('');
    try { setIdentity(await tenantIdentityApi.read()); }
    catch (failure) { setIdentity(null); setError(messageFor(failure)); }
    finally { setLoading(false); }
  }
  async function change(operation: () => Promise<TenantIdentity>) {
    if (operationInFlight.current) return;
    operationInFlight.current = true;
    setBusy(true); setError(''); setSaved(false); setPreview(null);
    try { const data = await operation(); if (screenActive.current) { setIdentity(data); setSaved(true); } }
    catch (failure) { if (screenActive.current) setError(messageFor(failure)); }
    finally { operationInFlight.current = false; setBusy(false); setProgress(null); }
  }
  async function pick(side: IdentitySide, camera: boolean) {
    if (operationInFlight.current) return;
    try {
      const permission = camera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) { setError(`${camera ? 'Camera' : 'Photo'} access is required to choose an ID picture. Enable access in device settings.`); return; }
      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ['images'], quality: 0.85,
        preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
      };
      const result = camera ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
      if (result.canceled || !result.assets[0]) return;
      const asset = result.assets[0];
      validateIdentityImage(asset);
      const extension = asset.mimeType === 'image/png' ? 'png' : asset.mimeType === 'image/webp' ? 'webp' : 'jpg';
      setPictures(previous => ({ ...previous, [side]: { uri: asset.uri, name: `id-${side}.${extension}`, type: asset.mimeType! } }));
      setError(''); setSaved(false);
    } catch (failure) { setError(messageFor(failure)); }
  }
  async function view(side: IdentitySide) {
    setPreview(null); setError('');
    try {
      const result = await tenantIdentityApi.download(side);
      if (screenActive.current && AppState.currentState === 'active') setPreview({ side, url: result.url, expiresAt: Date.now() + result.expiresIn * 1000 });
    } catch (failure) { if (screenActive.current) setError(messageFor(failure)); }
  }

  function promptChangePicture(side: IdentitySide) {
    Alert.alert(
      `Change ${side === 'front' ? 'front' : 'back'} picture`,
      'Choose how you want to update this ID picture',
      [
        { text: 'Take Picture', onPress: () => void pick(side, true) },
        { text: 'Choose Picture', onPress: () => void pick(side, false) },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  }

  return (
    <SafeAreaWrapper>
      <View className="flex-1 bg-gray-50">
        <ScrollView showsVerticalScrollIndicator={false}>
          <View className="px-4 pt-6 pb-6">
            {/* Header */}
            <View className="flex-row items-center mb-6">
              <TouchableOpacity
                onPress={() => router.back()}
                className="flex-row items-center gap-2 p-2 -ml-2 rounded-md active:bg-gray-200"
                accessibilityRole="button"
                accessibilityLabel="Back"
              >
                <MaterialIcons name="arrow-back" size={24} color="#374151" />
              </TouchableOpacity>
              <Text className="text-xl font-semibold text-gray-800 ml-2">Identity</Text>
            </View>

            {/* Info Card */}
            <Card className="mb-4">
              <View className="flex-row items-start gap-3">
                <MaterialIcons name="badge" size={24} color={BRAND_COLOR} />
                <View className="flex-1">
                  <Text className="font-semibold text-gray-800 mb-1">Tenant Identity</Text>
                  <Text className="text-sm text-gray-600">
                    Shared with your authorized landlords and staff. Changes update your shared tenant profile.
                  </Text>
                </View>
              </View>
            </Card>

            {/* Status alerts */}
            {saved && (
              <View className="mb-4 flex-row items-center gap-2 rounded-md bg-green-50 p-3 border border-green-200">
                <MaterialIcons name="check-circle" size={20} color="#16A34A" />
                <Text className="text-green-800 font-medium text-sm flex-1">Identity updated</Text>
              </View>
            )}

            {!!error && (
              <View className="mb-4 flex-row items-center gap-2 rounded-md bg-red-50 p-3 border border-red-200">
                <MaterialIcons name="error-outline" size={20} color="#DC2626" />
                <Text accessibilityRole="alert" className="text-red-700 text-sm flex-1">{error}</Text>
              </View>
            )}

            {progress !== null && (
              <View className="mb-4 rounded-md bg-blue-50 p-3 border border-blue-200">
                <View className="flex-row justify-between mb-1">
                  <Text accessibilityRole="progressbar" className="text-blue-900 font-medium text-sm">
                    Uploading: {Math.min(progress, 100)}%
                  </Text>
                </View>
                <View className="h-2 w-full bg-blue-200 rounded-full overflow-hidden">
                  <View className="h-full bg-brand rounded-full" style={{ width: `${Math.min(progress, 100)}%` }} />
                </View>
              </View>
            )}

            {!enabled ? (
              <Card className="mb-4">
                <View className="py-4 items-center">
                  <MaterialIcons name="lock-outline" size={36} color="#9CA3AF" />
                  <Text className="text-gray-800 font-semibold text-base mt-2">Tenant Access Required</Text>
                  <Text className="text-gray-500 text-center text-sm mt-1">
                    Sign in with your tenant account.
                  </Text>
                </View>
              </Card>
            ) : loading && !identity ? (
              <View className="py-12">
                <LoadingSpinner message="Loading identity details..." />
              </View>
            ) : !identity ? (
              <Card className="mb-4">
                <View className="py-4 items-center gap-2">
                  <MaterialIcons name="error-outline" size={36} color="#EF4444" />
                  <Text className="text-gray-800 font-semibold text-base">Unable to load identity</Text>
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel="Retry loading identity"
                    onPress={() => void refresh()}
                    className="bg-brand px-5 py-2.5 rounded-md mt-2"
                  >
                    <Text className="text-white font-semibold text-sm">Retry loading identity</Text>
                  </TouchableOpacity>
                </View>
              </Card>
            ) : (
              <>
                {/* Tax & National ID Card */}
                <Card className="mb-4">
                  <Text className="text-lg font-semibold text-gray-800 mb-1">Identification Numbers</Text>
                  <Text className="text-sm text-gray-500 mb-4">
                    Optional tax and national identification details.
                  </Text>

                  <View className="gap-4">
                    <View>
                      <Text className="text-sm font-medium text-gray-700 mb-1">TIN (Optional)</Text>
                      <TextInput
                        accessibilityLabel="TIN"
                        editable={!busy}
                        value={values.tin}
                        autoCapitalize="none"
                        autoCorrect={false}
                        keyboardType="number-pad"
                        placeholder="Enter 10-digit TIN"
                        className="border border-gray-300 rounded-md px-3 py-3 bg-white text-gray-800"
                        onChangeText={value => {
                          setSaved(false);
                          setDraft({ ...values, tin: value });
                        }}
                      />
                    </View>

                    <View>
                      <Text className="text-sm font-medium text-gray-700 mb-1">NIN (Optional)</Text>
                      <TextInput
                        accessibilityLabel="NIN"
                        editable={!busy}
                        value={values.nin}
                        autoCapitalize="characters"
                        autoCorrect={false}
                        keyboardType="default"
                        placeholder="Enter 14-character NIN"
                        className="border border-gray-300 rounded-md px-3 py-3 bg-white text-gray-800"
                        onChangeText={value => {
                          setSaved(false);
                          setDraft({ ...values, nin: value });
                        }}
                      />
                    </View>

                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityLabel="Save identity details"
                      onPress={() => void change(async () => {
                        const data = await tenantIdentityApi.update(identityValues(values.tin, values.nin));
                        setDraft(null);
                        return data;
                      })}
                      disabled={busy}
                      className={`py-3.5 rounded-md mt-1 ${busy ? 'bg-gray-300' : 'bg-brand'}`}
                    >
                      <Text className="text-white font-semibold text-center text-base">
                        Save identity details
                      </Text>
                    </TouchableOpacity>
                  </View>
                </Card>

                {/* National ID Front & Back Cards */}
                {sides.map(side => {
                  const isUploaded = Boolean(identity.images[side]);
                  const staged = pictures[side];
                  const sideTitle = side === 'front' ? 'Front Side' : 'Back Side';

                  return (
                    <Card key={side} className="mb-4">
                      <View className="flex-row items-center justify-between mb-1">
                        <Text className="text-lg font-semibold text-gray-800">
                          National ID {side}
                        </Text>
                        <View className={`flex-row items-center gap-1 px-2.5 py-1 rounded-full ${
                          isUploaded ? 'bg-green-50 border border-green-200' : 'bg-gray-100 border border-gray-200'
                        }`}>
                          <MaterialIcons
                            name={isUploaded ? 'check-circle' : 'help-outline'}
                            size={14}
                            color={isUploaded ? '#16A34A' : '#6B7280'}
                          />
                          <Text className={`text-xs font-medium ${isUploaded ? 'text-green-700' : 'text-gray-600'}`}>
                            {isUploaded ? 'Uploaded' : 'Not provided'}
                          </Text>
                        </View>
                      </View>
                      <Text className="text-sm text-gray-500 mb-4">
                        Photo of the {side} of your national ID card ({sideTitle.toLowerCase()}).
                      </Text>

                      {/* View & Remove actions for uploaded ID */}
                      {isUploaded && (
                        <View className="flex-row gap-2 mb-3">
                          <TouchableOpacity
                            accessibilityRole="button"
                            accessibilityLabel={`View ${side}`}
                            onPress={() => void view(side)}
                            disabled={busy}
                            className={`flex-1 flex-row items-center justify-center gap-2 py-2.5 px-3 rounded-md border border-gray-300 bg-white ${busy ? 'opacity-50' : ''}`}
                          >
                            <MaterialIcons name="visibility" size={18} color="#374151" />
                            <Text className="font-medium text-gray-700 text-sm">View {side}</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            accessibilityRole="button"
                            accessibilityLabel={`Remove ${side}`}
                            onPress={() => Alert.alert('Remove ID picture?', 'This removes the picture from your shared profile.', [
                              { text: 'Cancel', style: 'cancel' },
                              { text: 'Remove', style: 'destructive', onPress: () => void change(() => tenantIdentityApi.remove(side)) },
                            ])}
                            disabled={busy}
                            className={`flex-1 flex-row items-center justify-center gap-2 py-2.5 px-3 rounded-md border border-red-200 bg-red-50 ${busy ? 'opacity-50' : ''}`}
                          >
                            <MaterialIcons name="delete-outline" size={18} color="#DC2626" />
                            <Text className="font-medium text-red-600 text-sm">Remove {side}</Text>
                          </TouchableOpacity>
                        </View>
                      )}

                      {/* Photo selection buttons - hidden when already uploaded or staged */}
                      {!isUploaded && !staged && (
                        <View className="flex-row gap-2">
                          <TouchableOpacity
                            accessibilityRole="button"
                            accessibilityLabel={`Take ${side} picture`}
                            onPress={() => void pick(side, true)}
                            disabled={busy}
                            className={`flex-1 flex-row items-center justify-center gap-2 py-2.5 px-3 rounded-md border border-gray-300 bg-white ${busy ? 'opacity-50' : ''}`}
                          >
                            <MaterialIcons name="photo-camera" size={18} color={BRAND_COLOR} />
                            <Text className="font-medium text-gray-700 text-sm">Take picture</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            accessibilityRole="button"
                            accessibilityLabel={`Choose ${side} picture`}
                            onPress={() => void pick(side, false)}
                            disabled={busy}
                            className={`flex-1 flex-row items-center justify-center gap-2 py-2.5 px-3 rounded-md border border-gray-300 bg-white ${busy ? 'opacity-50' : ''}`}
                          >
                            <MaterialIcons name="photo-library" size={18} color={BRAND_COLOR} />
                            <Text className="font-medium text-gray-700 text-sm">Choose picture</Text>
                          </TouchableOpacity>
                        </View>
                      )}

                      {/* Staged upload preview & confirm */}
                      {staged && (
                        <View className="mt-3 p-3 bg-brand/5 border border-brand/20 rounded-md gap-3">
                          <View className="flex-row items-center gap-2">
                            <MaterialIcons name="image" size={20} color={BRAND_COLOR} />
                            <Text className="text-sm text-gray-800 font-medium flex-1" numberOfLines={1}>
                              {staged.name}
                            </Text>
                          </View>
                          <View className="flex-row gap-2">
                            <TouchableOpacity
                              accessibilityRole="button"
                              accessibilityLabel={`Preview selected ${side}`}
                              onPress={() => setPreview({ side, url: staged.uri, expiresAt: null, selected: true })}
                              disabled={busy}
                              className={`flex-1 py-2 rounded-md border border-gray-300 bg-white items-center ${busy ? 'opacity-50' : ''}`}
                            >
                              <Text className="font-medium text-gray-700 text-sm">Preview</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              accessibilityRole="button"
                              accessibilityLabel={`Cancel selected ${side}`}
                              onPress={() => setPictures(previous => ({ ...previous, [side]: undefined }))}
                              disabled={busy}
                              className={`py-2 px-3 rounded-md border border-gray-300 bg-white items-center ${busy ? 'opacity-50' : ''}`}
                            >
                              <Text className="font-medium text-gray-700 text-sm">Cancel</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              accessibilityRole="button"
                              accessibilityLabel={`Upload ${side}`}
                              onPress={() => void change(async () => {
                                const data = await tenantIdentityApi.upload(side, staged, setProgress);
                                setPictures(previous => ({ ...previous, [side]: undefined }));
                                return data;
                              })}
                              disabled={busy}
                              className={`flex-1 py-2 rounded-md bg-brand items-center ${busy ? 'opacity-50' : ''}`}
                            >
                              <Text className="font-semibold text-white text-sm">Upload {side}</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      )}
                    </Card>
                  );
                })}
              </>
            )}
          </View>
        </ScrollView>
      </View>

      <IdentityImagePreview
        uri={preview?.url ?? null}
        title={`${preview?.selected ? 'Selected national ID' : 'National ID'} ${preview?.side ?? ''}`}
        onClose={() => setPreview(null)}
        onError={() => {
          setPreview(null);
          setError(preview?.selected ? 'Unable to preview the selected picture. Choose it again to retry.' : 'Picture link expired or unavailable. Select View to retry.');
        }}
        onChangePicture={
          preview && !preview.selected && preview.side
            ? () => {
                const side = preview.side;
                setPreview(null);
                promptChangePicture(side);
              }
            : undefined
        }
      />
    </SafeAreaWrapper>
  );
}
