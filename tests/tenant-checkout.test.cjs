const assert = require('node:assert/strict');
const test = require('node:test');
const { loader } = require('./helpers/load.cjs');
const load = loader();
const { rentCheckout, securityCheckout, validateCheckoutRequest, depositError, SECURITY_DEPOSIT_LABELS } = load('lib/paymentCheckout.ts');
const contracts = load('lib/paymentContracts.ts');
const { tenantKeys } = load('lib/queryKeys.ts');

const ugx = { currency: 'UGX', outstandingBalance: 20000, minimumPayment: 10000, paidAmount: 10000, dueDate: '2026-10-01', isOverdue: true };
const usd = { ...ugx, currency: 'USD' };
const deposit = { securityDeposit: 5000, securityDepositCurrency: 'UGX', securityDepositStatus: 'unpaid' };

test('UGX checkout chooses current or arrears independently from the primary bucket', () => {
  for (const monthlyRentCurrency of ['UGX', 'USD']) {
    const result = rentCheckout({ monthlyRentCurrency, currency: 'USD', balances: [usd, ugx] }, ugx);
    assert.equal(result.paymentScope, monthlyRentCurrency === 'UGX' ? 'current' : 'arrears');
    assert.equal(result.bucket.minimumPayment, 10000);
    assert.equal(result.bucket.outstandingBalance, 20000);
  }
  assert.throws(() => rentCheckout({ monthlyRentCurrency: 'USD' }, usd), /USD/);
});
test('security collection bypasses rent minimums and requires the exact unpaid UGX amount', () => {
  assert.equal(securityCheckout(deposit).amount, 5000);
  validateCheckoutRequest({ paymentType: 'security_deposit', amount: 5000 }, deposit);
  for (const amount of [1, 4999, 5001, 10000]) assert.throws(() => validateCheckoutRequest({ paymentType: 'security_deposit', amount }, deposit));
  for (const status of ['not_required', 'pending', 'paid', 'refunded']) {
    assert.ok(SECURITY_DEPOSIT_LABELS[status]);
    assert.throws(() => securityCheckout({ ...deposit, securityDepositStatus: status }));
  }
  assert.throws(() => securityCheckout({ ...deposit, securityDepositCurrency: 'USD' }), /USD/);
  assert.equal(securityCheckout({ ...deposit, rentCurrency: 'USD' }).amount, 5000);
});
test('all collection conflicts give actionable refresh/status guidance', () => {
  for (const code of ['SECURITY_DEPOSIT_NOT_REQUIRED', 'SECURITY_DEPOSIT_AMOUNT_MISMATCH', 'SECURITY_DEPOSIT_PAYMENT_EXISTS', 'SECURITY_DEPOSIT_LOCKED']) assert.match(depositError(code), /[Rr]efresh|status/);
  assert.throws(() => validateCheckoutRequest({ paymentType: 'rent', amount: 10000 }), /Select/);
});
test('history and receipts never silently accept missing currency or substitute lease currency', () => {
  contracts.assertHistoryCurrencies([{ payment: { currency: 'USD' }, lease: { currency: 'UGX' } }]);
  assert.throws(() => contracts.assertHistoryCurrencies([{ payment: {} }]), /Currency/);
  contracts.assertReceiptCurrencies({ currency: 'USD', lease: { currency: 'UGX' }, appliedSchedules: [{ currency: 'USD' }] });
  assert.throws(() => contracts.assertReceiptCurrencies({ currency: 'USD', lease: {} }), /Currency/);
  assert.throws(() => contracts.assertBalanceCurrencies({ currency: 'UGX', monthlyRentCurrency: 'EUR' }), /Currency/);
});
test('every query namespace belongs to an account and supports scoped invalidation', () => {
  for (const resource of ['all-leases', 'tenant-dashboard', 'payment-history', 'payment-status', 'payment-receipt', 'settings', 'maintenance-request']) {
    assert.notDeepEqual(tenantKeys.query('A', resource, 'same'), tenantKeys.query('B', resource, 'same'));
    assert.deepEqual([...tenantKeys.query('A', resource, 'same').slice(0, 3)], [...tenantKeys.query('A', resource)]);
  }
});
