const assert = require('node:assert/strict');
const test = require('node:test');
const React = require('react');
const renderer = require('react-test-renderer');
const { loader } = require('./helpers/load.cjs');
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const delay = () => new Promise(resolve => setTimeout(resolve, 20));

const TIMEOUT_MESSAGE = 'Payment processing timed out. Please check your payment status manually.';

// Drives the real PaymentStatusTracker against a controllable usePaymentStatus.
async function fixture() {
  // Mutable hook state the tests advance between renders, mirroring what the
  // real hook reports as polling progresses or times out.
  const state = { status: null, isPolling: false, error: null };
  let startCount = 0;
  let alert;
  const calls = { dismiss: [], background: 0, foreground: 0 };
  const host = name => function NativeHost(props) { return React.createElement(name, props, props.children); };
  const usePaymentStatus = () => ({
    status: state.status, isPolling: state.isPolling, error: state.error,
    startPolling: () => { state.isPolling = true; startCount++; },
    stopPolling: () => { state.isPolling = false; },
    refetch: async () => {},
  });
  const load = loader({
    'react-native': {
      View: host('View'), Text: host('Text'), TouchableOpacity: host('Button'), Pressable: host('Pressable'),
      Modal: host('Modal'), ScrollView: host('ScrollView'),
      Alert: { alert: (title, message, buttons) => { alert = { title, message, buttons }; } },
    },
    'react-native-safe-area-context': { useSafeAreaInsets: () => ({ bottom: 10 }) },
    '@expo/vector-icons': { MaterialIcons: host('Icon') },
    'constants/theme.ts': { BRAND_COLOR: '#brand' },
    'components/ui/LoadingSpinner.tsx': { LoadingSpinner: host('Spinner') },
    'hooks/usePaymentStatus.tsx': { usePaymentStatus },
    'hooks/usePaymentSocket.tsx': { usePaymentSocket: () => {} },
    'lib/currency.ts': { formatMoney: amount => `UGX ${amount}` },
  });
  const Tracker = load('components/ui/PaymentStatusTracker.tsx').PaymentStatusTracker;
  const element = props => React.createElement(Tracker, {
    transactionId: 'txn-123', amount: 5000, currency: 'UGX',
    onBackground: () => { calls.background++; },
    onForeground: () => { calls.foreground++; },
    onDismiss: outcome => { calls.dismiss.push(outcome); },
    ...props,
  });
  let root;
  const render = async props => {
    await renderer.act(async () => {
      if (root) root.update(element(props));
      else root = renderer.create(element(props));
      await delay();
    });
  };
  await render();
  const text = () => root.root.findAllByType('Text').map(node => node.children.filter(child => typeof child === 'string').join('')).join(' ');
  const button = label => root.root.findAllByType('Button').find(node => node.findAllByType('Text').some(child => child.props.children === label));
  return {
    state, calls, render, text, button,
    get startCount() { return startCount; },
    alert: () => alert,
    async press(label) {
      const node = button(label);
      assert.ok(node, `Missing ${label}`);
      assert.ok(!node.props.disabled);
      await renderer.act(async () => { node.props.onPress(); await delay(); });
    },
    async close() { await renderer.act(async () => root.unmount()); },
  };
}

test('the waiting sheet shows submitted/confirmation copy and never dismisses on its own', async () => {
  const app = await fixture();
  try {
    assert.equal(app.startCount >= 1, true); // polling started on mount
    assert.match(app.text(), /Details Submitted/);
    assert.match(app.text(), /Waiting for Confirmation/);
    assert.match(app.text(), /Please wait for up to 2 minutes/);
    assert.match(app.text(), /UGX 5000/);
    assert.deepEqual(app.calls.dismiss, []);
    await app.press('Move to Background');
    assert.equal(app.calls.background, 1);
    assert.deepEqual(app.calls.dismiss, []);
  } finally { await app.close(); }
});

test('cancel requires confirmation and then reports itself as cancelled', async () => {
  const app = await fixture();
  try {
    await app.press('Cancel Payment');
    assert.equal(app.calls.dismiss.length, 0); // alert keeps the sheet open
    assert.match(app.alert().message, /may still complete/);
    await renderer.act(async () => { app.alert().buttons.find(option => option.style === 'destructive').onPress(); await delay(); });
    assert.deepEqual(app.calls.dismiss, ['cancelled']);
  } finally { await app.close(); }
});

test('a polling timeout stays unresolved, warns, and can resume polling', async () => {
  const app = await fixture();
  try {
    app.state.isPolling = false;
    app.state.error = TIMEOUT_MESSAGE;
    await app.render();
    assert.match(app.text(), /Still Waiting/);
    assert.match(app.text(), /Do not start another payment/);
    assert.deepEqual(app.calls.dismiss, []);
    await app.press('Check Status');
    assert.equal(app.state.isPolling, true);
    assert.deepEqual(app.calls.dismiss, []);
  } finally { await app.close(); }
});

test('success and failure render in the sheet and end only through Done', async () => {
  const app = await fixture();
  try {
    app.state.status = { paymentStatus: 'completed', amount: 5000, currency: 'UGX' };
    await app.render();
    assert.match(app.text(), /Payment Successful/);
    assert.deepEqual(app.calls.dismiss, []);
    await app.press('Done');
    assert.deepEqual(app.calls.dismiss, ['success']);

    app.state.status = { paymentStatus: 'failed', message: 'Declined by the network' };
    await app.render();
    assert.match(app.text(), /Payment Failed/);
    assert.match(app.text(), /Declined by the network/);
    await app.press('Done');
    assert.deepEqual(app.calls.dismiss, ['success', 'failed']);
  } finally { await app.close(); }
});

test('the backgrounded card tracks, reopens the sheet, and finishes with Continue', async () => {
  const app = await fixture();
  try {
    await app.render({ backgrounded: true });
    assert.match(app.text(), /Payment in progress/);
    assert.match(app.text(), /Waiting for confirmation/);
    assert.match(app.text(), /UGX 5000/);
    assert.equal(app.button('Done'), undefined);

    // Tapping the card brings the full sheet back.
    const row = app.button('Payment in progress');
    await renderer.act(async () => { row.props.onPress(); await delay(); });
    assert.equal(app.calls.foreground, 1);

    // While backgrounded, a terminal status swaps in the result and Continue.
    await app.render({ backgrounded: true });
    app.state.status = { paymentStatus: 'failed', message: 'Declined by the network' };
    await app.render({ backgrounded: true });
    assert.match(app.text(), /Payment not completed/);
    await app.press('Continue');
    assert.deepEqual(app.calls.dismiss, ['failed']);
  } finally { await app.close(); }
});
