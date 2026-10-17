const assert = require('node:assert/strict');
const test = require('node:test');
const React = require('react');
const renderer = require('react-test-renderer');
const { loader } = require('./helpers/load.cjs');
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

async function fixture(file, initialProps = {}, initialSettings = {}) {
  let settings = initialSettings;
  let user = { id: 'tenant-a', phone: '0771234567' };
  const saved = [];
  const host = name => function NativeHost(props) { return React.createElement(name, props, props.children); };
  const native = Object.fromEntries(['View', 'Text', 'Modal', 'TouchableOpacity', 'TextInput', 'KeyboardAvoidingView', 'ScrollView', 'Switch', 'Image'].map(name => [name, host(name)]));
  const load = loader({
    'react-native': { ...native, Platform: { OS: 'ios' }, Alert: { alert() {} } },
    '@expo/vector-icons': { MaterialIcons: host('Icon') },
    'expo-router': { useRouter: () => ({ back() {} }) },
    'expo-image-picker': {},
    '@tanstack/react-query': { useQueryClient: () => ({}), useMutation: () => ({ mutate() {}, isPending: false }) },
    'hooks/useAuth.tsx': { useAuth: () => ({ user }) },
    'hooks/useServerSettings.tsx': { useServerSettings: () => ({ settings, isLoading: false,
      updateNotifications: { mutate: value => saved.push(value) }, updatePaymentPrefs: { mutate: value => saved.push(value) }, updatePreferences: { mutate: value => saved.push(value) } }) },
    'lib/api.ts': {},
    'components/ui/Card.tsx': { Card: host('Card') },
    'components/ui/LoadingSpinner.tsx': { LoadingSpinner: host('Spinner') },
    'components/ui/SafeAreaWrapper.tsx': { SafeAreaWrapper: host('SafeArea') },
  });
  const exports = load(file);
  const Component = exports.default ?? Object.values(exports)[0];
  let root, props = initialProps;
  await renderer.act(async () => { root = renderer.create(React.createElement(Component, props)); });
  return { root, saved,
    async update(nextProps = props, nextSettings = settings, nextUser = user) { props = nextProps; settings = nextSettings; user = nextUser; await renderer.act(async () => root.update(React.createElement(Component, props))); },
    async change(index, value) { await renderer.act(async () => root.root.findAllByType('TextInput')[index].props.onChangeText(value)); },
    async press(label) {
      const button = root.root.findAllByType('TouchableOpacity').find(node => node.findAllByType('Text').some(text => text.props.children === label));
      assert.ok(button, `Missing ${label}`);
      await renderer.act(async () => button.props.onPress());
    },
    async close() { await renderer.act(async () => root.unmount()); },
  };
}

test('confirmation keeps edits during rerenders and resets when reopened or its source phone changes', async () => {
  const props = { visible: true, phoneNumber: '0771234567', providerName: 'MTN MoMo', amount: 5000, currency: 'UGX', onClose() {}, onConfirm() {} };
  const app = await fixture('components/ui/PaymentConfirmationModal.tsx', props);
  try {
    // Open the phone editor through its edit button.
    const edit = app.root.root.findAllByType('TouchableOpacity').find(node => node.findAllByType('Icon').some(icon => icon.props.name === 'edit'));
    await renderer.act(async () => edit.props.onPress());
    await app.change(0, '0701234567');
    await app.update({ ...props });
    assert.equal(app.root.root.findByType('TextInput').props.value, '0701234567');
    await app.update({ ...props, visible: false });
    await app.update(props);
    assert.equal(app.root.root.findAllByType('TextInput').length, 0);
    await app.update({ ...props, phoneNumber: '0751234567' });
    const editAgain = app.root.root.findAllByType('TouchableOpacity').find(node => node.findAllByType('Icon').some(icon => icon.props.name === 'edit'));
    await renderer.act(async () => editAgain.props.onPress());
    assert.equal(app.root.root.findByType('TextInput').props.value, '0751234567');
  } finally { await app.close(); }
});

test('amount and maintenance modals discard drafts when reopened', async () => {
  for (const [file, props, typed] of [
    ['components/ui/PaymentModal.tsx', { balance: { currency: 'UGX', outstandingBalance: 50000, monthlyRent: 50000 } }, '25000'],
    ['components/ui/CreateMaintenanceRequestModal.tsx', {}, 'Leaking tap'],
  ]) {
    const base = { ...props, visible: true, onClose() {}, onConfirm() {} };
    const app = await fixture(file, base);
    try {
      await app.change(0, typed);
      await app.update({ ...base });
      assert.notEqual(app.root.root.findAllByType('TextInput')[0].props.value, '');
      await app.update({ ...base, visible: false });
      await app.update(base);
      assert.equal(app.root.root.findAllByType('TextInput')[0].props.value, '');
    } finally { await app.close(); }
  }
});

test('settings hydrate cached data and refresh clean forms without overwriting dirty drafts', async () => {
  const initial = { paymentPreferences: { mobileMoneyPhone: '0751234567', mobileMoneyProvider: 'airtel', reminderDaysBefore: 7 } };
  const app = await fixture('app/screens/payment-preferences.tsx', {}, initial);
  try {
    assert.equal(app.root.root.findAllByType('TextInput')[0].props.value, '0751234567');
    await app.update({}, { paymentPreferences: { ...initial.paymentPreferences, mobileMoneyPhone: '0781234567' } });
    assert.equal(app.root.root.findAllByType('TextInput')[0].props.value, '0781234567');
    await app.change(0, '0701234567');
    await app.update({}, { paymentPreferences: { ...initial.paymentPreferences, reminderDaysBefore: 8 } });
    assert.equal(app.root.root.findAllByType('TextInput')[0].props.value, '0701234567');
    await app.press('Save Changes');
    assert.equal(app.saved[0].mobileMoneyPhone, '0701234567');
    await app.update({}, initial, { id: 'tenant-b', phone: '0771234567' });
    assert.equal(app.root.root.findAllByType('TextInput')[0].props.value, '0751234567');
  } finally { await app.close(); }
});

test('notification edits survive changed server settings and reset when the account changes', async () => {
  const notifications = { notifyEmail: true, notifySms: true, notifyWhatsapp: true, notifyPush: true, quietHoursStart: '22:00', quietHoursEnd: '06:00' };
  const app = await fixture('app/screens/notifications-settings.tsx', {}, { notifications });
  try {
    await renderer.act(async () => app.root.root.findAllByType('Switch')[0].props.onValueChange(false));
    await app.change(0, '23:00');
    await app.update({}, { notifications: { ...notifications, notifySms: false } });
    assert.equal(app.root.root.findAllByType('Switch')[0].props.value, false);
    assert.equal(app.root.root.findAllByType('TextInput')[0].props.value, '23:00');
    await app.press('Save Changes');
    assert.equal(app.saved[0].quietHoursStart, '23:00');
    assert.equal(app.saved[0].notifyEmail, false);
    await app.update({}, { notifications }, { id: 'tenant-b', phone: '0771234567' });
    assert.equal(app.root.root.findAllByType('Switch')[0].props.value, true);
    assert.equal(app.root.root.findAllByType('TextInput')[0].props.value, '22:00');
  } finally { await app.close(); }
});

test('language and timezone drafts survive changed server preferences and reset for another account', async () => {
  const preferences = { language: 'en', timezone: 'Africa/Kampala' };
  const app = await fixture('app/screens/preferences-settings.tsx', {}, { preferences });
  try {
    await app.press('Swahili');
    await app.press('Nairobi');
    await app.update({}, { preferences: { language: 'lg', timezone: 'Africa/Dar_es_Salaam' } });
    await app.press('Save Changes');
    assert.equal(app.saved[0].language, 'sw');
    assert.equal(app.saved[0].timezone, 'Africa/Nairobi');
    await app.update({}, { preferences }, { id: 'tenant-b', phone: '0771234567' });
    await app.press('Save Changes');
    assert.equal(app.saved[1].language, 'en');
    assert.equal(app.saved[1].timezone, 'Africa/Kampala');
  } finally { await app.close(); }
});

test('web safe areas use CSS insets while native keeps SafeAreaView edges', async () => {
  const host = name => function NativeHost(props) { return React.createElement(name, props, props.children); };
  for (const platform of ['web', 'ios']) {
    const load = loader({
      'react-native': { Platform: { OS: platform }, View: host('View') },
      'react-native-safe-area-context': { SafeAreaView: host('NativeSafeArea') },
      'expo-image': { Image: host('Image') },
      '../../assets/logos/logos-02.svg': {},
    });
    const Wrapper = load('components/ui/SafeAreaWrapper.tsx').SafeAreaWrapper;
    let root;
    await renderer.act(async () => { root = renderer.create(React.createElement(Wrapper, { edges: ['top', 'bottom'] })); });
    try {
      if (platform === 'web') {
        const container = root.root.findAllByType('View')[0];
        const style = Object.assign({}, ...container.props.style);
        assert.equal(style.paddingTop, 'env(safe-area-inset-top, 0px)');
        assert.equal(style.paddingBottom, 'env(safe-area-inset-bottom, 0px)');
        assert.equal(root.root.findAllByType('NativeSafeArea').length, 0);
      } else {
        assert.deepEqual(root.root.findByType('NativeSafeArea').props.edges, ['top', 'bottom']);
      }
    } finally { await renderer.act(async () => root.unmount()); }
  }
});
