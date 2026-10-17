const assert = require('node:assert/strict');
const test = require('node:test');
const React = require('react');
const renderer = require('react-test-renderer');
const { QueryClient, QueryClientProvider } = require('@tanstack/react-query');
const { loader } = require('./helpers/load.cjs');
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const delay = () => new Promise(resolve => setTimeout(resolve, 20));

async function fixture({ status = 'unpaid', rentCurrency = 'USD', securityCurrency = 'UGX', extraCurrency, initiate, history = [], getHistory } = {}) {
  const balance = { currency: rentCurrency, monthlyRentCurrency: rentCurrency, monthlyRent: 100,
    balances: [{ currency: rentCurrency, outstandingBalance: 75, minimumPayment: 25, paidAmount: 25, dueDate: null, isOverdue: false }] };
  if (extraCurrency) balance.balances.push({ ...balance.balances[0], currency: extraCurrency, outstandingBalance: 25000, minimumPayment: 10000 });
  const deposit = { securityDeposit: 5000, securityDepositCurrency: securityCurrency, securityDepositStatus: status };
  let selectedLeaseId = 'lease';
  const user = { id: 'tenant', phone: '0771234567' }; const router = { push() {} };
  const calls = [];
  const timers = [];
  const host = name => function NativeHost(props) { return React.createElement(name, props, props.children); };
  const api = {
    paymentApi: { getBalance: async () => balance, getHistory: getHistory ?? (async () => history),
      initiate: async request => { calls.push(request); return initiate ? initiate(request) : { paymentId: 'p', transactionId: 't', amount: request.amount, currency: 'UGX', status: 'completed' }; } },
    tenantApi: { getDashboard: async () => ({ lease: deposit, management: null }) },
  };
  const load = loader({
    'react-native': { ScrollView: host('ScrollView'), View: host('View'), Text: host('Text'), TouchableOpacity: host('Button'), RefreshControl: host('RefreshControl'), Alert: { alert() {} } },
    'expo-router/react-navigation': { useFocusEffect: callback => React.useEffect(callback, [callback]) },
    'expo-router': { useRouter: () => router },
    'hooks/useAuth.tsx': { useAuth: () => ({ user }) },
    'hooks/LeaseContext.tsx': { useLease: () => ({ selectedLeaseId, isLoadingLeases: false }) },
    'hooks/useServerSettings.tsx': { useServerSettings: () => ({ settings: {} }) },
    'lib/api.ts': api,
    'lib/utils.ts': { formatDateShort: value => value },
    'components/ui/Card.tsx': { Card: host('Card') },
    'components/ui/LoadingSpinner.tsx': { LoadingSpinner: host('Spinner') },
    'components/ui/ErrorView.tsx': { ErrorView: host('ErrorView') },
    'components/ui/SafeAreaWrapper.tsx': { SafeAreaWrapper: host('SafeArea') },
    'components/ui/PaymentModal.tsx': { PaymentModal: host('AmountModal') },
    'components/ui/PaymentConfirmationModal.tsx': { PaymentConfirmationModal: host('ConfirmModal') },
    'components/ui/PaymentStatusTracker.tsx': { PaymentStatusTracker: host('StatusTracker') },
  }, { setTimeout: (callback, duration) => { if (duration === 120000) { timers.push(callback); return null; } return setTimeout(callback, duration); } });
  const Screen = load('app/(tabs)/payments.tsx').default;
  const client = new QueryClient({ logger: { log: console.log, warn: console.warn, error: () => {} }, defaultOptions: { queries: { retry: false, cacheTime: 0 } } });
  const tree = () => React.createElement(QueryClientProvider, { client }, React.createElement(Screen));
  let root;
  await renderer.act(async () => { root = renderer.create(tree()); await delay(); });
  await renderer.act(delay);
  const text = () => root.root.findAllByType('Text').map(node => node.children.filter(child => typeof child === 'string').join('')).join(' ');
  const button = label => root.root.findAllByType('Button').find(node => node.findAllByType('Text').some(text => text.props.children === label));
  return { root, calls, text, button, deposit,
    async expirePolling() { await renderer.act(async () => timers.at(-1)()); },
    async switchLease() { selectedLeaseId = 'second-lease'; await renderer.act(async () => { root.update(tree()); await delay(); }); await renderer.act(delay); },
    async press(label) { const node = button(label); assert.ok(node, `Missing ${label}`); assert.equal(node.props.disabled, false); await renderer.act(async () => { node.props.onPress(); await delay(); }); },
    async close() { await renderer.act(async () => root.unmount()); client.clear(); },
  };
}

test('USD rent does not block an exact UGX security payment or permit double submission', async () => {
  let resolve;
  const pending = new Promise(done => { resolve = done; });
  const app = await fixture({ initiate: () => pending });
  try {
    await app.press('Pay security deposit');
    const confirm = app.root.root.findByType('ConfirmModal');
    assert.equal(confirm.props.paymentType, 'security_deposit'); assert.equal(confirm.props.amount, 5000);
    await renderer.act(async () => { confirm.props.onConfirm('0771234567'); confirm.props.onConfirm('0771234567'); await delay(); });
    assert.equal(app.calls.length, 1); assert.equal(app.calls[0].amount, 5000); assert.equal(app.calls[0].paymentType, 'security_deposit');
    app.deposit.securityDepositStatus = 'paid';
    await renderer.act(async () => { resolve({ paymentId: 'p', transactionId: 't', amount: 5000, currency: 'UGX', status: 'completed' }); await delay(); });
    assert.match(app.text(), /Payment successful/);
  } finally { await app.close(); }
});

for (const outcome of ['success', 'failed']) {
  for (const refreshMode of ['delayed', 'failed']) {
    test(`${outcome} can be dismissed with ${refreshMode} history refresh without reopening or enabling collection`, async () => {
      const history = [{ payment: { id: 'existing', transactionId: 'existing-txn', status: 'pending',
        paymentMethod: 'mobile_money', amount: '5000', currency: 'UGX', paymentType: 'security_deposit' } }];
      let refreshing = false, fresh = false;
      const waiting = [];
      const app = await fixture({ history, getHistory: () => {
        if (fresh) return Promise.resolve([]);
        if (!refreshing) return Promise.resolve(history);
        if (refreshMode === 'failed') return Promise.reject(new Error('History unavailable'));
        return new Promise(resolve => waiting.push(resolve));
      } });
      try {
        refreshing = true;
        await renderer.act(async () => {
          app.root.root.findByType('StatusTracker').props[outcome === 'success' ? 'onSuccess' : 'onFailed']({ message: 'Declined' });
          await delay();
        });
        await app.press('Continue');
        assert.equal(app.root.root.findAllByType('StatusTracker').length, 0);
        assert.equal(app.button('Pay security deposit').props.disabled, true);
        assert.equal(app.calls.length, 0);

        fresh = true;
        if (outcome === 'success') app.deposit.securityDepositStatus = 'paid';
        await renderer.act(async () => { waiting.forEach(resolve => resolve([])); await delay(); });
        // A failed refresh must remain recoverable through the screen's refresh action.
        if (refreshMode === 'failed') await app.press('Refresh payments');
        if (outcome === 'success') assert.equal(app.button('Pay security deposit'), undefined);
        else assert.equal(app.button('Pay security deposit').props.disabled, false);
        assert.equal(app.root.root.findAllByType('StatusTracker').length, 0);
        assert.equal(app.calls.length, 0);
      } finally { await app.close(); }
    });
  }
}

test('dismissing a completed tracker resumes a different unresolved payment behind it', async () => {
  const payment = id => ({ payment: { id, transactionId: id, status: 'pending', paymentMethod: 'mobile_money', amount: '5000', currency: 'UGX', paymentType: 'rent' } });
  const app = await fixture({ history: [payment('first'), payment('second')] });
  try {
    await renderer.act(async () => app.root.root.findByType('StatusTracker').props.onSuccess());
    await app.press('Continue');
    assert.equal(app.root.root.findByType('StatusTracker').props.transactionId, 'second');
    assert.equal(app.calls.length, 0);
    await renderer.act(async () => app.root.root.findByType('StatusTracker').props.onFailed({ message: 'Declined' }));
    await app.press('Continue');
    assert.equal(app.root.root.findAllByType('StatusTracker').length, 0);
    assert.equal(app.button('Pay security deposit').props.disabled, true);
  } finally { await app.close(); }
});
test('paid, refunded, pending, and not-required obligations never offer collection', async () => {
  for (const status of ['paid', 'refunded', 'pending', 'not_required']) {
    const app = await fixture({ status });
    try { assert.equal(app.button('Pay security deposit'), undefined); } finally { await app.close(); }
  }
  const app = await fixture({ securityCurrency: 'USD' });
  try { assert.equal(app.button('Pay security deposit'), undefined); assert.match(app.text(), /exact-amount USD/); } finally { await app.close(); }
});
test('ambiguous transport outcomes stay pending and cannot start another collection', async () => {
  const app = await fixture({ initiate: async () => { throw Object.assign(new Error('Unknown'), { confirmationPending: true }); } });
  try {
    await app.press('Pay security deposit');
    await renderer.act(async () => { app.root.root.findByType('ConfirmModal').props.onConfirm('0771234567'); await delay(); });
    assert.match(app.text(), /Confirmation pending/);
    assert.equal(app.button('Pay security deposit').props.disabled, true);
    await app.press('Check payment status'); assert.equal(app.calls.length, 1);
  } finally { await app.close(); }
});
test('503 references resume status checks and confirmed failures allow refresh before retry', async () => {
  const app = await fixture({ initiate: async request => ({ paymentId: 'p', transactionId: 't', amount: request.amount, currency: 'UGX', status: 'pending', confirmationPending: true }) });
  try {
    await app.press('Pay security deposit');
    await renderer.act(async () => { app.root.root.findByType('ConfirmModal').props.onConfirm('0771234567'); await delay(); });
    const tracker = app.root.root.findByType('StatusTracker'); assert.equal(tracker.props.transactionId, 't');
    await renderer.act(async () => { tracker.props.onTimeout(); await delay(); });
    await app.press('Check payment status'); assert.equal(app.calls.length, 1);
    await renderer.act(async () => { app.root.root.findByType('StatusTracker').props.onFailed({ message: 'Declined' }); await delay(); });
    assert.match(app.text(), /Declined/); await app.press('Continue');
    assert.equal(app.button('Pay security deposit').props.disabled, false);
  } finally { await app.close(); }
});

test('both mixed-currency directions submit the scope of the selected UGX bucket', async () => {
  for (const rentCurrency of ['UGX', 'USD']) {
    const app = await fixture({ rentCurrency, extraCurrency: rentCurrency === 'UGX' ? 'USD' : 'UGX', status: 'not_required' });
    try {
      await app.press('Pay UGX rent');
      const amount = app.root.root.findByType('AmountModal');
      assert.equal(amount.props.balance.currency, 'UGX');
      await renderer.act(async () => amount.props.onConfirm(10000));
      await renderer.act(async () => { app.root.root.findByType('ConfirmModal').props.onConfirm('0771234567'); await delay(); });
      assert.equal(app.calls[0].paymentType, 'rent');
      assert.equal(app.calls[0].paymentScope, rentCurrency === 'UGX' ? 'current' : 'arrears');
    } finally { await app.close(); }
  }
});

test('switching leases discards a late successful checkout response', async () => {
  let resolve;
  const outcome = new Promise(done => { resolve = done; });
  const app = await fixture({ initiate: () => outcome });
  try {
    await app.press('Pay security deposit');
    await renderer.act(async () => { app.root.root.findByType('ConfirmModal').props.onConfirm('0771234567'); await delay(); });
    await app.switchLease();
    await renderer.act(async () => { resolve({ paymentId: 'old', transactionId: 'old-reference', currency: 'UGX', amount: 5000, status: 'completed' }); await delay(); });
    assert.doesNotMatch(app.text(), /Payment successful/);
    assert.equal(app.button('Pay security deposit').props.disabled, false);
    assert.equal(app.calls.length, 1);
  } finally { await app.close(); }
});

test('pending obligation polling times out to manual refresh without enabling collection', async () => {
  const app = await fixture({ status: 'pending' });
  try {
    assert.match(app.text(), /Checking confirmation/);
    await app.expirePolling();
    assert.match(app.text(), /Confirmation remains pending/);
    assert.equal(app.button('Pay security deposit'), undefined);
    await app.press('Refresh deposit status');
    assert.equal(app.calls.length, 0);
  } finally { await app.close(); }
});


test('a pending payment from history resumes its tracker without initiating another collection', async () => {
  const app = await fixture({ history: [{ payment: { id: 'existing', transactionId: 'existing-txn', status: 'pending',
    paymentMethod: 'mobile_money', amount: '5000', currency: 'UGX', paymentType: 'security_deposit' } }] });
  try {
    const tracker = app.root.root.findByType('StatusTracker');
    assert.equal(tracker.props.transactionId, 'existing-txn');
    assert.equal(tracker.props.confirmationPending, true);
    assert.equal(app.calls.length, 0);
    assert.equal(app.button('Pay security deposit').props.disabled, true);
  } finally { await app.close(); }
});
