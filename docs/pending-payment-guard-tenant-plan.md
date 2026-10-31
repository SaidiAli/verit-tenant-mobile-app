# Pending-Payment Guard — Tenant App Changes

**Status:** Implemented 2026-10-25. Platform change record for backend wallet disbursement
hardening (see `verit-server/docs/wallet-disbursement-hardening.md`).

## What changed on the server

`POST /api/payments/initiate` now enforces **collect-once per debt bucket**: if a live pending
mobile-money collection already exists for the same lease + payment type (+ rent scope), a new
attempt returns:

```json
{
  "success": false,
  "error": "A payment is already in progress",
  "code": "PAYMENT_ALREADY_PENDING",
  "message": "A pending mobile money collection already exists for this payment. Wait for it to complete or fail before starting another.",
  "data": { "transactionId": "VRT_...", "paymentId": "..." }
}
```

This prevents double-charging when a collection is retried (and is the safety net any future
gateway-failover logic depends on). A late webhook or the reconcile poller settles the pending
attempt automatically.

## App changes made

| Area | Change |
|------|--------|
| `lib/api.ts` `paymentsApi.initiate` | Explicit `PAYMENT_ALREADY_PENDING` branch: throws an Error with the server message and `alreadyPending: true` so callers can branch on it |

The generic error path already displays `error.message` from the initiate call, so the copy
above is what the tenant sees. No other screens change — payment history and status polling are
unaffected.

## Behavior notes

- If a tenant taps "Pay" twice quickly, the second attempt now shows the in-progress message
  instead of creating a second charge.
- Pending payments continue to resolve through the existing status polling
  (`GET /payments/status/:transactionId`) and history refresh — the server's reconcile poller
  is the backstop for missing webhooks.
