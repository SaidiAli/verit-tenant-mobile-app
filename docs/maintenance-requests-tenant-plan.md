# Tenant Mobile App — Maintenance Requests Plan

Backend is live (`verit-server`). The mobile app already has stubs in `lib/api.ts`
(`getMaintenanceRequests`, `createMaintenanceRequest`) pointing at `/maintenance`. This plan wires
the screens and real-time updates.

## API (lib/api.ts)
Update the existing `tenantApi`/maintenance methods to match the server contract (envelope
`{ success, data }`):

- `getMaintenanceRequests()` → `GET /api/maintenance` (server branches on role; tenant gets own list).
  Returns `{ maintenanceRequest, unit, property, vendor }[]`.
- `getMaintenanceRequest(id)` → `GET /api/maintenance/:id` → `{ maintenanceRequest, unit, property, vendor, photos }`.
- `createMaintenanceRequest(form)` → `POST /api/maintenance` as **multipart/form-data** when photos
  are attached. Up to **10 photos** are accepted — append multiple parts under the same field name
  **`document`** (max 15MB each, jpg/png/gif/webp/pdf). Body fields: `title` (required), `description?`
  (optional), `priority?`
  (`low|medium|high|urgent`), `category?`
  (`plumbing|electrical|hvac|appliance|structural|pest|cleaning|other`). `unitId` is optional — the
  server derives it from the tenant's active lease.
- `addMaintenancePhoto(id, file)` → `POST /api/maintenance/:id/photos` (multipart, field `document`).

Note: tenants **cannot** set status, cost, due date, vendor, or schedule — those are landlord-only.

## Screens (app/)
1. **`app/screens/maintenance-requests.tsx`** — list of the tenant's requests.
   - `useQuery({ queryKey: ['maintenance-requests', user?.id], queryFn: tenantApi.getMaintenanceRequests })`.
   - Card per request: title, status badge (map enum → friendly label, mirror server's
     `humanMaintenanceStatus`: submitted / assigned to a technician / scheduled / in progress / on hold /
     completed / cancelled), priority chip, submitted date, vendor name + scheduled date when present.
   - `useFocusEffect`→`refetch()` like `payments.tsx`.
2. **`app/screens/create-maintenance-request.tsx`** — submission form.
   - Plain `useState` form (the app's convention — see `edit-profile.tsx`): title, description,
     priority picker, category picker, optional photo via `expo-image-picker`.
   - `useMutation` → `createMaintenanceRequest`; on success invalidate `['maintenance-requests', user?.id]`,
     `Alert.alert('Submitted')`, navigate back.
3. Register both as `Stack.Screen` in `app/_layout.tsx`. Add an entry point from `(tabs)/index.tsx`
   (a "Report an issue" / "Maintenance" card) — or a 4th tab if desired.

## Real-time (hooks/)
- Add a `useMaintenanceSocket(onUpdate)` mirroring `usePaymentSocket` — subscribe to the
  **`maintenance:updated`** socket event (payload `{ requestId, status, event }`). On receipt, treat it
  as a nudge: invalidate/`refetch` the list and the open detail query. The tenant socket room is already
  joined on connect (`lib/socket.ts`).
- Tenants also receive SMS/WhatsApp on status change / vendor assignment automatically (server-side via
  `MessagingService`), respecting their notification opt-ins.

## Category picker (now API-driven)
The maintenance `category` is no longer a fixed enum — it's a landlord-managed list. The create form's
category picker should fetch the tenant's landlord's categories from
`GET /api/tenant/maintenance-categories` (tenant-scoped, read-only; resolves the landlord from the active
lease). Each item is `{ slug, label }` — submit the **slug**, display the **label**. `category` is optional
(defaults to `other`), so the picker can default to "Other" if the list hasn't loaded.

## Notes
- TanStack Query v4 here (not v5) — keep the v4 object syntax.
- Money (`estimatedCost`/`actualCost`) is returned as decimal **strings** — `parseFloat` before display,
  format with the app's UGX helper. Tenants typically don't see cost; hide unless product wants it.
