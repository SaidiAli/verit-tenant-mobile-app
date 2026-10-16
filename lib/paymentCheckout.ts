import type { CurrencyBalance, PaymentBalance, PaymentInitiationRequest, SecurityDepositProjection } from '../types';

export const SECURITY_DEPOSIT_LABELS = {
  not_required: 'Not required', unpaid: 'Unpaid', pending: 'Confirmation pending', paid: 'Paid', refunded: 'Refunded',
} as const;
export function rentCheckout(balance: PaymentBalance, bucket: CurrencyBalance) {
  if (bucket.currency !== 'UGX') throw new Error('Arrange USD payment with your property manager.');
  return { paymentType: 'rent' as const, paymentScope: bucket.currency === balance.monthlyRentCurrency ? 'current' as const : 'arrears' as const, bucket };
}
export function securityCheckout(deposit: SecurityDepositProjection) {
  if (deposit.securityDepositStatus !== 'unpaid') throw new Error('Refresh the security deposit before paying.');
  if (deposit.securityDepositCurrency !== 'UGX') throw new Error('Arrange USD security payment with your property manager.');
  if (!Number.isFinite(deposit.securityDeposit) || !deposit.securityDeposit || deposit.securityDeposit <= 0) throw new Error('Security deposit amount is unavailable. Refresh and try again.');
  return { paymentType: 'security_deposit' as const, amount: deposit.securityDeposit };
}
export function depositError(code: string | undefined): string | undefined {
  switch (code) {
    case 'SECURITY_DEPOSIT_NOT_REQUIRED': return 'This lease no longer requires a security deposit. Refresh the lease.';
    case 'SECURITY_DEPOSIT_AMOUNT_MISMATCH': return 'The security deposit amount changed. Refresh and confirm the new amount.';
    case 'SECURITY_DEPOSIT_PAYMENT_EXISTS': return 'A security payment already exists. Check its status before paying again.';
    case 'SECURITY_DEPOSIT_LOCKED': return 'The security deposit is being updated. Refresh and try again shortly.';
    default: return undefined;
  }
}
export function validateCheckoutRequest(request: PaymentInitiationRequest, deposit?: SecurityDepositProjection): void {
  if (request.paymentType === 'security_deposit') {
    if (!deposit || securityCheckout(deposit).amount !== request.amount) throw new Error('The security deposit changed. Refresh before paying.');
  } else if (!request.paymentScope) throw new Error('Select the rent balance you want to pay.');
}
