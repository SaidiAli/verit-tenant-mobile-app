const assert = require('node:assert/strict');
const test = require('node:test');
const { loader } = require('./helpers/load.cjs');
process.env.EXPO_PUBLIC_API_URL = 'https://example.invalid/api';

function fixture() {
  let unauthorized = 0;
  const load = loader({
    '@sentry/react-native': { captureException: () => {} },
    'lib/storage.ts': { secureStorage: { getToken: async () => 'token' } },
  });
  const api = load('lib/api.ts');
  api.setUnauthorizedHandler(() => { unauthorized++; });
  const session = load('lib/session.ts').session;
  return { ...api, session, get unauthorized() { return unauthorized; } };
}
test('OTP returns zero/one/many pending accounts and activation sends selected tenantId', async () => {
  const app = fixture(); let sent;
  for (const count of [0, 1, 2]) {
    const accounts = Array.from({ length: count }, (_, i) => ({ tenantId: `tenant-${i}`, landlordName: `Owner ${i}`, propertyName: i ? null : 'Home' }));
    app.default.defaults.adapter = async config => ({ status: 200, statusText: 'OK', headers: {}, config, data: { success: true, data: { accounts } } });
    assert.deepEqual(await app.authApi.verifyTenantOtp('0771234567', '123456'), accounts);
  }
  app.default.defaults.adapter = async config => { sent = JSON.parse(config.data); return { status: 200, statusText: 'OK', headers: {}, config, data: { success: true, data: { user: { id: sent.tenantId }, token: 'token' } } }; };
  await app.authApi.activateTenant({ phone: '0771234567', tenantId: 'selected', userName: 'name', password: 'secret' });
  assert.equal(sent.tenantId, 'selected');
});
test('a delayed 401 from the old session cannot log out the next account', async () => {
  const app = fixture();
  const old = app.session.current(); app.session.reset();
  const reject = app.default.interceptors.response.handlers[0].rejected;
  await assert.rejects(reject({ config: { sessionGeneration: old, headers: { Authorization: 'Bearer A' } }, response: { status: 401 } }), /Session changed/);
  assert.equal(app.unauthorized, 0);
  await assert.rejects(reject({ config: { sessionGeneration: app.session.current(), headers: { Authorization: 'Bearer B' } }, response: { status: 401 } }));
  assert.equal(app.unauthorized, 1);
});
test('structured security conflicts survive the API wrapper', async () => {
  const app = fixture();
  app.default.defaults.adapter = async config => { throw { config, message: 'HTTP 409', response: { status: 409, data: { code: 'SECURITY_DEPOSIT_PAYMENT_EXISTS', error: 'Already pending' } } }; };
  await assert.rejects(app.paymentApi.initiate({ leaseId: 'lease', amount: 5000, paymentType: 'security_deposit' }), error => error.code === 'SECURITY_DEPOSIT_PAYMENT_EXISTS' && error.message === 'Already pending');
});
test('query cancellation reaches Axios without starting a transport', async () => {
  const app = fixture(); let calls = 0;
  app.default.defaults.adapter = async () => { calls++; throw new Error('Must not run'); };
  const controller = new AbortController(); controller.abort();
  await assert.rejects(app.paymentApi.getHistory('lease', controller.signal));
  assert.equal(calls, 0);
});
