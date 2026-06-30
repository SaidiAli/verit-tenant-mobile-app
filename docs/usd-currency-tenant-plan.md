# USD Currency Support — Tenant Mobile App Plan

**Status:** Plan only. Not implemented. Depends on `verit-server/docs/usd-currency-server-plan.md`.

**Scope:** Currency is per-property (`UGX` | `USD`). A tenant rents one unit → one property → **one currency**, so the whole app is single-currency from the tenant's view (no mixed-currency UI needed). USD tenants pay **manually** — no online payment in the app for USD.

---

## 1. Central chokepoint — `lib/currency.ts`

Today: `formatUGX` (`:8-17`, `en-UG`/`UGX`, with `USh`→`UGX` replace), `formatCompactUGX` (`:22-35`), `formatNumber` (`:40-47`), `parseUGX` (`:52-61`), `validateUGXAmount` (`:66-90`, default min `10000`).

**Change:** parameterize currency, keep UGX default.
```ts
type Currency = 'UGX' | 'USD';
const LOCALE: Record<Currency,string> = { UGX:'en-UG', USD:'en-US' };
export function formatMoney(amount: number|string, currency: Currency = 'UGX'): string
export function formatCompactMoney(amount: number|string, currency: Currency = 'UGX'): string
```
- Keep the `USh`→`UGX` cleanup for UGX; USD renders `$`/`US$`.
- Keep `formatUGX`/`formatCompactUGX` as wrappers during migration.
- `validateUGXAmount` min `10000` is UGX-specific — for USD use a sensible min or drop it (manual payment, amount entered by landlord-side anyway).

## 2. Thread `currency` — single source per session

The tenant's currency comes from their lease/property. `LeaseContext` (per CLAUDE.md, `hooks/`) is the natural place to expose the active `currency` once, then pass it into every `formatMoney` call. Update `types/index.ts:380` — `PaymentReceipt.currency: 'UGX'` literal → `Currency`.

Helper is imported across dashboard, payments, payment-history, payment-schedule, and modals (`PaymentStatusTracker`, `PaymentReceiptModal`, `PaymentConfirmationModal`, `PaymentModal`). All read the lease currency.

## 3. Inline `UGX` literals to replace

- `app/screens/lease.tsx:265,271` (`UGX {x.toLocaleString()}`)
- `components/ui/PaymentModal.tsx:128` (`UGX` adornment)

## 4. USD = no online payment

For a **USD** lease, the in-app online payment flow (mobile-money `PaymentModal` / STK) must be **hidden or disabled**, with a message that USD rent is paid manually (cash/bank, recorded by the landlord). Server backstops with `400 ONLINE_PAYMENT_UNSUPPORTED`.

- Payment **history** and **schedule** screens still work — they just display USD amounts (read-only).
- Realtime payment sockets/receipts unchanged; receipts show `payment.currency`.

## 5. Locale

`en-UG` formatting + `Africa/Kampala` timezone stay; USD uses `en-US` grouping inside `formatMoney`. No currency selector — currency is fixed by the tenant's property.

## 6. Touch-list

`lib/currency.ts` (param + USD min), `types/index.ts` (`PaymentReceipt.currency`), `LeaseContext` (expose currency), `app/screens/lease.tsx`, `components/ui/PaymentModal.tsx` (USD gate + literal), payment-history / payment-schedule / receipt modals (pass currency).
