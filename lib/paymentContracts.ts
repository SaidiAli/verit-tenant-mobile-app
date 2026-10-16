import type { Currency, PaymentBalance, PaymentReceipt, PaymentWithDetails, TenantDashboardData } from '../types';

export function assertCurrency(value: unknown): asserts value is Currency {
  if (value !== 'UGX' && value !== 'USD') throw new Error('Currency information is unavailable. Refresh or try again after the server is updated.');
}
export function assertBalanceCurrencies(value: PaymentBalance): void {
  assertCurrency(value.currency);
  assertCurrency(value.monthlyRentCurrency);
  for (const bucket of value.balances ?? []) assertCurrency(bucket.currency);
}
export function assertHistoryCurrencies(value: PaymentWithDetails[] | undefined): void {
  for (const row of value ?? []) assertCurrency(row.payment.currency);
}
export function assertReceiptCurrencies(value: PaymentReceipt): void {
  assertCurrency(value.currency);
  if (value.lease) assertCurrency(value.lease.currency);
  for (const schedule of value.appliedSchedules ?? []) assertCurrency(schedule.currency);
}
export function assertDashboardCurrencies(value: TenantDashboardData): void {
  if (value.lease) {
    assertCurrency(value.lease.currency);
    assertCurrency(value.lease.depositCurrency);
    if (value.lease.securityDepositStatus !== 'not_required') assertCurrency(value.lease.securityDepositCurrency);
  }
  for (const bucket of value.payments.balances ?? []) assertCurrency(bucket.currency);
  assertHistoryCurrencies(value.payments.recentPayments);
}
