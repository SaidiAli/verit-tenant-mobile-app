# Settings Workflow — Tenant Mobile App Implementation Plan

Adds tenant-facing settings against the new server `/api/settings` surface
(see `verit-server/docs/settings-workflow.md`). Tenants are always self-scoped — no
`X-Landlord-Context`, no account/business layer.

Conventions to follow (this app differs from the web portals):
- **Expo Router** (file-based under `app/`), **NativeWind** (Tailwind `className`).
- **TanStack Query v4** — `useQuery({ queryKey, queryFn })` / `useMutation` (note `isPending` is used
  in this codebase via v4.36; keep the existing call style).
- Forms are **plain `useState` + manual `validateForm()`** — no React Hook Form / Zod.
- User feedback is **`Alert.alert(...)`** — there is **no toast library**.
- Axios client in `lib/api.ts` already injects the JWT from `expo-secure-store` and reports errors to
  Sentry; `401` clears the token.

## Current state (what exists)

- `hooks/useSettings.tsx` is **local-only** today: it stores `{ pushNotifications, autoPayment,
  biometricAuth, darkMode }` in `expo-secure-store` and **never calls the server**. It must be
  extended (or paired with a new hook) to sync server settings.
- `app/screens/edit-profile.tsx` (firstName/lastName/email/phone) and `app/screens/change-password.tsx`
  already exist — they call `authApi.updateUser` / `authApi.changePassword`. **Repoint these at the
  unified `/api/settings/profile` and `/api/settings/security` endpoints.**
- `app/(tabs)/profile.tsx` has a **Preferences** section with a **disabled** push-notifications
  `Switch` (placeholder) — the new Notifications screen replaces this.
- Mobile-money: `app/(tabs)/payments.tsx` auto-detects the provider from `user.phone` via
  `getMobileMoneyProvider()` in `lib/currency.ts` (`mtn`/`airtel`; `m-sente` is type-only, not
  prefix-detected). Payment preferences will pre-fill / override this.

## Server contract for a tenant

`GET /api/settings` returns `profile`, `notifications`, `preferences`, `paymentPreferences`
(no `account`).

```jsonc
{
  "profile":       { "id","userName","firstName","lastName","email","phone","avatarUrl","role" },
  "notifications": { "notifyEmail","notifySms","notifyWhatsapp","notifyPush","quietHoursStart","quietHoursEnd" },
  "preferences":   { "language","timezone" },
  "paymentPreferences": { "mobileMoneyPhone","mobileMoneyProvider","reminderDaysBefore" } | null
}
```

| Method | Path | Body | Notes |
|--------|------|------|-------|
| GET | `/api/settings` | — | Aggregated (tenant blocks above). |
| PUT | `/api/settings/profile` | `{ firstName?, lastName?, email?, phone?, avatarUrl? }` | Partial; ≥1 field. phone `^(\+?256|0)[0-9]{9}$`. |
| PUT | `/api/settings/security` | `{ currentPassword, newPassword }` | `400` on wrong current password (`Current password is incorrect`); `newPassword` ≥ 8. |
| PUT | `/api/settings/notifications` | `{ notifyEmail?, notifySms?, notifyWhatsapp?, notifyPush?, quietHoursStart?, quietHoursEnd? }` | Quiet hours `HH:MM`; set/clear **both together**. |
| PUT | `/api/settings/preferences` | `{ language?, timezone? }` | `language ∈ 'en'｜'sw'｜'lg'`. |
| GET | `/api/settings/payment-preferences` | — | tenant self. |
| PUT | `/api/settings/payment-preferences` | `{ mobileMoneyPhone?, mobileMoneyProvider?, reminderDaysBefore? }` | provider ∈ `mtn｜airtel｜m-sente`; reminder 0–30 (int). |

## Navigation / screens

Add a **Settings** entry point from `(tabs)/profile.tsx` (a "Settings" row) routing to new screens
under `app/screens/`:

- `screens/settings.tsx` — hub listing the sections (or one scroll screen with `Card` sections).
- Reuse the existing `edit-profile.tsx` (Profile) and `change-password.tsx` (Security).
- `screens/notifications-settings.tsx` — channel `Switch`es + quiet-hours pickers.
- `screens/preferences-settings.tsx` — language + timezone pickers.
- `screens/payment-preferences.tsx` — mobile-money phone, provider picker, reminder lead time.

Match the `edit-profile.tsx` layout: `SafeAreaWrapper` → `ScrollView` → header row with back button →
`Card` sections → primary `TouchableOpacity` button (`bg-[#524768]`, disabled state `bg-gray-300`).

## Data layer (TanStack Query v4)

Add a `settingsApi` object to `lib/api.ts` alongside `authApi`/`paymentApi`/`tenantApi`:

```ts
export const settingsApi = {
  get:                 () => api.get('/settings').then(r => r.data.data),
  updateProfile:      (d) => api.put('/settings/profile', d).then(r => r.data.data),
  updateSecurity:     (d) => api.put('/settings/security', d).then(r => r.data),
  updateNotifications:(d) => api.put('/settings/notifications', d).then(r => r.data.data),
  updatePreferences:  (d) => api.put('/settings/preferences', d).then(r => r.data.data),
  getPaymentPrefs:     () => api.get('/settings/payment-preferences').then(r => r.data.data),
  updatePaymentPrefs: (d) => api.put('/settings/payment-preferences', d).then(r => r.data.data),
};
```

Hook usage (v4), keyed per user:

```ts
const { user } = useAuth();
const { data: settings } = useQuery({
  queryKey: ['settings', user?.id],
  queryFn: settingsApi.get,
  enabled: !!user,
});

const qc = useQueryClient();
const { mutate: saveNotifications, isPending } = useMutation({
  mutationFn: settingsApi.updateNotifications,
  onSuccess: () => { qc.invalidateQueries({ queryKey: ['settings', user?.id] });
                     Alert.alert('Saved', 'Notification settings updated'); },
  onError: (e: any) => Alert.alert('Error', e?.response?.data?.error || 'Failed to update'),
});
```

`hooks/useSettings.tsx`: keep its local device-only flags (biometric/dark mode), and **add** the
server-backed query + mutations there so screens consume one hook — or add a sibling `useServerSettings`
hook. Don't conflate device-local toggles with the server `notify*` flags.

## Forms / validation (useState + manual)

Mirror server bounds in `validateForm()`:
- **phone / mobileMoneyPhone**: `^(\+?256|0)[0-9]{9}$`.
- **password**: `newPassword` ≥ 8; client-side confirm match in `change-password.tsx`.
- **quiet hours**: `HH:MM`; both-or-neither (disable the End field until Start set; clearing one clears
  both → send both `null`). Use a time picker or two `TextInput`s with masks.
- **reminderDaysBefore**: integer 0–30 (stepper/slider).
- **mobileMoneyProvider**: picker `mtn | airtel | m-sente`.
- **language**: picker `en | sw | lg`; **timezone**: default `Africa/Kampala`.

## Behaviours to surface in the UI

- **Notifications are opt-out** — every channel defaults on. Toggling SMS/WhatsApp off stops that
  channel; turning **both** off stops the tenant receiving reminders entirely — warn before saving.
- **Quiet hours suppress reminders only** (rent reminder, lease expiry); payment confirmations and
  other transactional messages still arrive. Make that explicit in helper text.
- **Push (`notifyPush`)**: there is **no `expo-notifications` infra** in the app yet, so the toggle
  **persists the preference but nothing delivers push** until push is wired. Either hide the push
  toggle for v1 or show it with a "coming soon" note — don't imply working push.
- **Payment preferences pre-fill the payment flow**: `payments.tsx` currently derives provider from
  `user.phone`. After this lands, default the mobile-money number/provider from `paymentPreferences`
  (fall back to phone-based detection when unset). `reminderDaysBefore` is server-side reminder timing —
  no client scheduling needed.

## Uploads (avatar)

There is **no multipart→S3 upload pipeline in the mobile app today**. Avatar upload is therefore a
**follow-up**: ship Profile without avatar first (the field is optional). When added, upload via the
server's multer→S3 endpoint and submit the returned reference string as `avatarUrl`.

## Out of scope (v2 — server placeholders only)

2FA, device/session management, push-notification delivery infrastructure.

## Step-by-step

1. Add `settingsApi` to `lib/api.ts`.
2. Extend `useSettings` (or add `useServerSettings`) with the `['settings', user?.id]` query + mutations.
3. Repoint `edit-profile.tsx` → `/settings/profile` and `change-password.tsx` → `/settings/security`
   (handle the `400` wrong-password case with an inline error / `Alert`).
4. Add a **Settings** hub row in `(tabs)/profile.tsx` and the new section screens.
5. Build Notifications (switches + quiet hours), Preferences (language/timezone), Payment preferences
   (phone/provider/reminder).
6. Pre-fill `payments.tsx` from `paymentPreferences`; remove the disabled placeholder push switch.
7. Run `npm run lint`; exercise each screen against the running server.
