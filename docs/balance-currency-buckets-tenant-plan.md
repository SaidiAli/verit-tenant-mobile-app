# Currency buckets and tenant checkout

Implemented: Payments shows each denomination separately, with a UGX mobile-money action per payable
bucket. The chosen bucket supplies outstanding/minimum amounts and its due date; no currencies are
added or converted. Current rent uses `paymentScope: "current"`; old-currency rent uses `"arrears"`.
USD buckets explain manual payment, including USD arrears on a UGX lease. UGX arrears remain payable
on a current USD lease. Monthly rent always retains `monthlyRentCurrency`.

History and dashboard activity use persisted payment currency. Receipt rent uses lease currency. The
API client rejects missing/unsupported currency information instead of labeling unknown amounts UGX.
Deploy the backend's additive history/allocation/receipt currency fields before the mobile release.

Queries use account-scoped keys from `lib/queryKeys.ts`. Session changes cancel requests, clear caches,
reset private screen state, and reject late results from the previous session. Saved lease IDs are
account-scoped and checked against the current account's lease list before use.

Automated scope, API-contract, mounted checkout, and account-isolation tests accompany the change.
Native acceptance remains: UGX/USD leases in both transition directions, partial payments, provider
prompts, connectivity loss, account switching, and background/resume. No live collection was run.
