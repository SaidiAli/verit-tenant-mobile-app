const assert = require('node:assert/strict');
const test = require('node:test');
const React = require('react');
const renderer = require('react-test-renderer');
const { loader } = require('./helpers/load.cjs');
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

async function fixture(accounts, verifyError, activationError) {
  const activated = []; let sends = 0;
  const host = name => function NativeHost(props) { return React.createElement(name, props, props.children); };
  const load = loader({
    'react-native': { View: host('View'), Text: host('Text'), TextInput: host('Input'), TouchableOpacity: host('Button'), ScrollView: host('ScrollView'), KeyboardAvoidingView: host('Keyboard'), ActivityIndicator: host('Spinner'), Platform: { OS: 'ios' } },
    '@expo/vector-icons': { MaterialIcons: host('Icon') },
    'expo-router': { useRouter: () => ({ replace() {} }) },
    'constants/theme.ts': { BRAND_COLOR: '#000000' },
    'hooks/useAuth.tsx': { useAuth: () => ({ activate: async (...args) => { if (activationError) throw activationError; activated.push(args); } }) },
    'components/ui/SafeAreaWrapper.tsx': { SafeAreaWrapper: host('SafeArea') },
    'lib/api.ts': { authApi: { requestTenantOtp: async () => { sends++; }, verifyTenantOtp: async () => { if (verifyError) throw verifyError; return accounts; } } },
  });
  const Screen = load('app/(auth)/activate.tsx').default;
  let root; await renderer.act(async () => { root = renderer.create(React.createElement(Screen)); });
  const text = () => root.root.findAllByType('Text').map(node => node.children.filter(child => typeof child === 'string').join('')).join(' ');
  const press = async label => {
    const button = root.root.findAllByType('Button').find(node => node.findAllByType('Text').some(text => text.props.children === label));
    assert.ok(button, `Missing ${label}`); assert.ok(!button.props.disabled);
    await renderer.act(async () => { await button.props.onPress(); });
  };
  const enter = async (placeholder, value) => {
    const input = root.root.findAllByType('Input').find(node => node.props.placeholder === placeholder);
    assert.ok(input, `Missing ${placeholder}`);
    await renderer.act(async () => input.props.onChangeText(value));
  };
  return { text, press, enter, activated, get sends() { return sends; }, async close() { await renderer.act(async () => root.unmount()); } };
}
async function verify(app) { await app.enter('0771 234 567', '0771234567'); await app.press('Send Verification Code'); await app.enter('Enter 6-digit code', '123456'); await app.press('Verify Code'); }

test('zero pending accounts return to phone with guidance', async () => {
  const app = await fixture([]);
  try { await verify(app); assert.match(app.text(), /No pending account/); assert.equal(app.activated.length, 0); } finally { await app.close(); }
});
test('one pending account skips chooser and submits that exact tenant ID', async () => {
  const app = await fixture([{ tenantId: 'one', landlordName: 'Owner', propertyName: null }]);
  try {
    await verify(app); assert.match(app.text(), /Set Up Your Login/);
    await app.enter('Choose a username', 'tenant'); await app.enter('Choose a password', 'secret1'); await app.press('Activate Account');
    assert.equal(app.activated[0][1], 'one');
  } finally { await app.close(); }
});
test('multiple pending accounts require choosing the intended landlord, including an account without a property', async () => {
  const app = await fixture([{ tenantId: 'one', landlordName: 'Owner A', propertyName: 'Home A' }, { tenantId: 'two', landlordName: 'Owner B', propertyName: null }]);
  try {
    await verify(app); assert.match(app.text(), /Choose your account/); assert.match(app.text(), /Home A/);
    await app.press('Owner B'); await app.enter('Choose a username', 'tenant'); await app.enter('Choose a password', 'secret1'); await app.press('Activate Account');
    assert.equal(app.activated[0][1], 'two');
  } finally { await app.close(); }
});
test('multiple pending accounts display propertyName and unit number together', async () => {
  const app = await fixture([
    { tenantId: 'one', landlordName: 'Owner A', propertyName: 'Kololo Heights', unitNumber: 'B4' },
    { tenantId: 'two', landlordName: 'Owner B', propertyName: 'Ntinda Court', unitNumber: null },
  ]);
  try {
    await verify(app);
    assert.match(app.text(), /Kololo Heights · Unit B4/);
    assert.match(app.text(), /Ntinda Court/);
    await app.press('Owner A');
    await app.enter('Choose a username', 'tenant');
    await app.enter('Choose a password', 'secret1');
    await app.press('Activate Account');
    assert.equal(app.activated[0][1], 'one');
  } finally { await app.close(); }
});
test('OTP lockout keeps verification disabled until a new code is requested', async () => {
  const app = await fixture([], Object.assign(new Error('Locked out'), { status: 429 }));
  try { await verify(app); assert.match(app.text(), /Too many incorrect attempts/); await app.press('Resend Code'); assert.equal(app.sends, 2); } finally { await app.close(); }
});

test('expired verification returns to phone while username conflicts preserve credential entry', async () => {
  for (const expired of [true, false]) {
    const failure = Object.assign(new Error(expired ? 'Verify your phone first' : 'Username already taken'), expired ? { status: 400 } : {});
    const app = await fixture([{ tenantId: 'one', landlordName: 'Owner', propertyName: null }], undefined, failure);
    try {
      await verify(app); await app.enter('Choose a username', 'tenant'); await app.enter('Choose a password', 'secret1'); await app.press('Activate Account');
      assert.match(app.text(), expired ? /Activate Your Account/ : /Set Up Your Login/);
      assert.match(app.text(), expired ? /Verify your phone/ : /Username already taken/);
      assert.equal(app.activated.length, 0);
    } finally { await app.close(); }
  }
});
