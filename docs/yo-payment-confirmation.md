# Payment confirmation handling

Pending confirmation and polling timeouts remain unresolved. Do not automatically
repeat a collection. Keep returned references, refresh authoritative payment history,
and show completed/failed only when the server reports an outcome.

Landlord checkout tracks the exact subscription payment ID and external reference,
handles immediate completion, and checks for an existing pending transaction before
collecting. Admin subscription details expose paginated read-only payment history,
provider references, and pending/review warnings with refresh and pending polling.
Tenant checkout recovers backend 503 references and pending history rows, shows a
check-status action on timeout, and handles immediate completion without another
phone authorization prompt. Lease changes reset visible payment state.

Backend certificate selection is unchanged. No live collection is needed to validate
these frontend paths. Historic failures must be reconciled before any manual repair.
