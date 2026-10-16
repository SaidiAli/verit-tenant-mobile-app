# Tenant activation: account chooser for duplicate phone numbers

Status: implemented. Native release acceptance remains outstanding.

## Context

The phone+OTP activation flow (`app/(auth)/activate.tsx`) currently assumes a phone number identifies
exactly one pending tenant account. That assumption is wrong on the server side by design: two
separate landlords can independently register the same person as a tenant, so the same phone number
can legitimately have more than one pending (not-yet-activated) account behind it. The server has
already been updated to handle this — the app now implements the matching account selection and activation request.

The server-side contract (already live in `verit-server`):

- `POST /auth/tenant/request-otp` — unchanged request (`{ phone }`), unchanged response shape. It no
  longer looks up any account before sending, so it never returns 404 ("no account") or 409 ("already
  activated") anymore — those checks moved to `verify-otp`/`activate`.
- `POST /auth/tenant/verify-otp` — same request (`{ phone, otp }`). On a correct code it now returns:
  ```json
  {
    "success": true,
    "data": {
      "accounts": [
        { "tenantId": "uuid", "landlordName": "Jane Doe", "propertyName": "Kololo Heights" }
      ]
    },
    "message": "..."
  }
  ```
  `accounts` can be empty (no pending account for this phone — show the "ask your landlord" message),
  have exactly one entry (skip straight through, no visible change from today's UX), or have more than
  one (the tenant needs to pick). `propertyName` is `null` when that pending account has no lease yet.
- `POST /auth/tenant/activate` — request body gains a required `tenantId` field:
  `{ phone, tenantId, userName, password }`. The `tenantId` must be one of the ids `verify-otp`
  returned for that phone; the server still requires the phone-verified flag and re-checks the phone
  match server-side.

## Implemented changes

### 1. `types/index.ts`
Add:
```ts
export interface PendingTenantAccount {
  tenantId: string;
  landlordName: string;
  propertyName: string | null;
}
```
Extend `TenantActivateRequest` with `tenantId: string`.

### 2. `lib/api.ts`
- `authApi.verifyTenantOtp(phone, otp)`: change return type from `Promise<void>` to
  `Promise<PendingTenantAccount[]>`, reading `response.data.data.accounts` (default to `[]` if
  missing). Keep the existing 429-lockout handling as-is.
- `authApi.requestTenantOtp`: drop the now-dead 404 ("no account found") and 409 ("already activated")
  branches in its catch block — the server no longer returns those statuses for this endpoint. Leave
  429 and generic-error handling as-is.
- `authApi.activateTenant`: include `tenantId` in the POST body (already typed via
  `TenantActivateRequest` once step 1 lands).

### 3. `hooks/useAuth.tsx`
`activate(phone, userName, password)` → `activate(phone, tenantId, userName, password)`. Pass
`tenantId` straight through to `authApi.activateTenant`; everything else (store token/user, navigate
to `/(tabs)`) is unchanged.

### 4. `app/(auth)/activate.tsx`
- `Step` union: `"phone" | "otp" | "choose-account" | "credentials"`.
- New state: `accounts: PendingTenantAccount[]` and `selectedTenantId: string | null`.
- `handleVerifyOtp`: after a successful `verifyTenantOtp` call, branch on `accounts.length`:
  - `0` → show an inline error ("No pending account found for this phone number — ask your landlord
    to add you as a tenant.") and stay on/return to the `"phone"` step (mirrors the "no account"
    messaging that used to live in `request-otp`'s error handling).
  - `1` → set `selectedTenantId` to that one account's `tenantId`, go straight to `"credentials"` — no
    visible change from the current single-account UX.
  - `>1` → store the list, go to `"choose-account"`.
- New `"choose-account"` step UI: a simple vertical list, one tappable row per account — primary text
  `landlordName`, secondary text `propertyName` if present (else omit that line). Selecting a row sets
  `selectedTenantId` and advances to `"credentials"`. Style it consistently with the existing
  OTP/credentials steps (same card/row treatment already used elsewhere in the app, e.g. the unit list
  in `app/screens/property.tsx` or similar list rows — reuse whatever pattern is already established
  rather than introducing a new one).
- `handleActivate`: pass `selectedTenantId` (guard against it being null — shouldn't happen given the
  flow above, but fail closed with an error rather than silently sending `tenantId: null`).

## Verification

- `npx tsc --noEmit` for a clean type-check after the changes.
- Manual: activate a phone with exactly one pending account — confirm no visible change (straight from
  OTP to credentials, same as before this change). Then create two tenants under two different
  landlords with the same phone number (via the landlord portal) and run activation again — confirm
  the chooser appears with both landlord names, and that activating one leaves the other still pending
  (unaffected, `activatedAt` still null) — it can be activated separately later with its own
  username/password.
