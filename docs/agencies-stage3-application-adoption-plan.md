# Agencies Stage 3 Tenant App Adoption

Status: implemented as additive, nullable presentation with no tenant workspace selector.

## Implemented scope

- Show the managing organization and contact on property service surfaces.
- Show the legal owner separately from the managing organization on the lease surface.
- Fetch lease-derived payee readiness before opening mobile-money initiation and display a safe
  unavailable state when the owner destination is not verified.
- Preserve existing identity-and-lease authorization, endpoints, and behavior when the backend omits
  the new nullable management object.

## Verification and rollout

- `npx tsc --noEmit` passes. This package does not define a production `build` script.
- Release after backend/admin and landlord-portal canary evidence is clean.
- Roll back presentation by disabling Stage 3 server-side; older response shapes remain accepted.

The tenant app never accepts organization or portfolio context and never exposes private organization
profiles, settlement account details, custody controls, transfers, or handovers.
