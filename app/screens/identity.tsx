import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
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
  const [preview, setPreview] = useState<{ side: IdentitySide; url: string; expiresAt: number } | null>(null);
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
    if (!preview) return;
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
      if (screenActive.current) setPreview({ side, url: result.url, expiresAt: Date.now() + result.expiresIn * 1000 });
    } catch (failure) { if (screenActive.current) setError(messageFor(failure)); }
  }
  const action = (label: string, onPress: () => void, disabled = busy) => <TouchableOpacity accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress}
    className={`rounded-md bg-brand px-4 py-3 ${disabled ? 'opacity-50' : ''}`}><Text className="text-center font-semibold text-white">{label}</Text></TouchableOpacity>;
  return <SafeAreaWrapper><ScrollView className="flex-1 bg-gray-50" contentContainerStyle={{ padding: 20, gap: 16 }}>
    {action('Back', () => router.back(), false)}
    <Text className="text-2xl font-semibold">Identity</Text>
    <Text className="text-gray-600">Shared with your authorized landlords and staff. Changes update your shared tenant profile.</Text>
    {!enabled ? <Text>Sign in with your tenant account.</Text> : loading ? <Text>Loading identity details...</Text> : !identity ? action('Retry loading identity', () => void refresh(), false) : <>
      <View className="gap-3 rounded-lg bg-white p-4">
        {(['tin', 'nin'] as const).map(field => <View key={field} className="gap-2">
          <Text className="font-semibold">{field.toUpperCase()} (Optional)</Text>
          <TextInput accessibilityLabel={field.toUpperCase()} editable={!busy} value={values[field]} autoCapitalize={field === 'nin' ? 'characters' : 'none'} autoCorrect={false}
            keyboardType={field === 'tin' ? 'number-pad' : 'default'} className="rounded-md border border-gray-300 p-3"
            onChangeText={value => { setSaved(false); setDraft({ ...values, [field]: value }); }} />
        </View>)}
        {action('Save identity details', () => void change(async () => {
          const data = await tenantIdentityApi.update(identityValues(values.tin, values.nin)); setDraft(null); return data;
        }))}
      </View>
      {sides.map(side => <View key={side} className="gap-3 rounded-lg bg-white p-4">
        <Text className="text-lg font-semibold">National ID {side}</Text>
        <Text>{identity.images[side] ? 'Uploaded' : 'Not provided'}</Text>
        {identity.images[side] && <>
          {action(`View ${side}`, () => void view(side))}
          {action(`Remove ${side}`, () => Alert.alert('Remove ID picture?', 'This removes the picture from your shared profile.', [
            { text: 'Cancel', style: 'cancel' }, { text: 'Remove', style: 'destructive', onPress: () => void change(() => tenantIdentityApi.remove(side)) },
          ]))}
        </>}
        {action(`Take ${side} picture`, () => void pick(side, true))}
        {action(`Choose ${side} picture`, () => void pick(side, false))}
        {pictures[side] && <>
          <Image source={{ uri: pictures[side]!.uri }} accessibilityLabel={`Selected ID ${side}`} style={{ height: 160, width: '100%' }} contentFit="contain" cachePolicy="none" />
          {action(`Upload ${side}`, () => void change(async () => {
            const data = await tenantIdentityApi.upload(side, pictures[side]!, setProgress);
            setPictures(previous => ({ ...previous, [side]: undefined })); return data;
          }))}
        </>}
      </View>)}
      {preview && <View className="gap-3">
        <Image source={{ uri: preview.url }} accessibilityLabel={`National ID ${preview.side}`} style={{ height: 260, width: '100%' }} contentFit="contain" cachePolicy="none"
          onError={() => { setPreview(null); setError('Picture link expired or unavailable. Select View to retry.'); }} />
        {action('Close picture', () => setPreview(null), false)}
      </View>}
    </>}
    {progress !== null && <Text accessibilityRole="progressbar">Uploading: {Math.min(progress, 100)}%</Text>}
    {saved && <Text>Identity updated</Text>}
    {!!error && <Text accessibilityRole="alert" className="text-red-700">{error}</Text>}
  </ScrollView></SafeAreaWrapper>;
}
