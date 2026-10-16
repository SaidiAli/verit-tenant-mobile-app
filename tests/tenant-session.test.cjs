const assert = require('node:assert/strict');
const test = require('node:test');
const React = require('react');
const renderer = require('react-test-renderer');
const { QueryClient, QueryClientProvider } = require('@tanstack/react-query');
const { loader } = require('./helpers/load.cjs');
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const delay = () => new Promise(resolve => setTimeout(resolve, 20));
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };

async function fixture() {
  let state = {}; let resets = 0; let auth; let lease; let currentUserRequest; let leaseRequest; let activationFailure; let mounts = 0;
  const navigation = { replace: () => {} };
  const accounts = { A: { id: 'A', firstName: 'A', role: 'tenant' }, B: { id: 'B', firstName: 'B', role: 'tenant' } };
  const secureStorage = {
    getToken: async () => state.token, getUser: async () => state.user,
    setToken: async token => { state.token = token; }, setUser: async user => { state.user = user; },
    clear: async () => { state = {}; }, getLeaseId: async () => null, setLeaseId: async () => {},
  };
  const load = loader({
    'expo-router': { useRouter: () => navigation },
    'lib/storage.ts': { secureStorage },
    'lib/socket.ts': { resetSocket: () => { resets++; } },
    'lib/api.ts': {
      setUnauthorizedHandler: () => {},
      authApi: {
        login: async ({ username }) => ({ user: accounts[username], token: username }),
        activateTenant: async input => { if (activationFailure) throw activationFailure; assert.equal(input.tenantId, 'A'); return { user: accounts.A, token: 'A' }; },
        getCurrentUser: async () => currentUserRequest ? currentUserRequest.promise : state.user,
        updateUser: async () => currentUserRequest.promise,
      },
      tenantApi: { getAllLeases: async signal => {
        assert.ok(signal);
        if (leaseRequest) { const request = leaseRequest; leaseRequest = undefined; return request.promise; }
        return [{ id: `${state.user.id}-lease`, status: 'active' }];
      } },
    },
  });
  const { AuthProvider, useAuth } = load('hooks/useAuth.tsx');
  const { LeaseProvider, useLease } = load('hooks/LeaseContext.tsx');
  function Consumer() { React.useState(() => ++mounts); auth = useAuth(); lease = useLease(); return null; }
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, cacheTime: 0, staleTime: 60000 } } });
  let root;
  await renderer.act(async () => { root = renderer.create(React.createElement(QueryClientProvider, { client }, React.createElement(AuthProvider, null, React.createElement(LeaseProvider, null, React.createElement(Consumer))))); await delay(); });
  const flush = () => renderer.act(delay);
  const signIn = async name => { await renderer.act(async () => { await auth.login(name, 'password'); await delay(); }); await flush(); };
  return {
    get mounts() { return mounts; }, failActivation: error => { activationFailure = error; },
    get auth() { return auth; }, get lease() { return lease; }, get state() { return state; }, get resets() { return resets; },
    client, load, signIn, flush,
    deferUser: () => (currentUserRequest = deferred()), deferLeases: () => (leaseRequest = deferred()),
    async close() { await renderer.act(async () => root.unmount()); client.clear(); },
  };
}

test('mounted providers clear tenant A caches, lease selection, and sockets before tenant B sees data', async () => {
  const app = await fixture();
  try {
    await app.signIn('A');
    assert.equal(app.lease.selectedLeaseId, 'A-lease');
    app.client.setQueryData(['tenant', 'A', 'tenant-dashboard', 'A-lease'], { privateA: true });
    await renderer.act(async () => { await app.auth.logout(); });
    assert.equal(app.auth.user, null);
    assert.equal(app.lease.selectedLeaseId, null);
    assert.equal(app.client.getQueryData(['tenant', 'A', 'tenant-dashboard', 'A-lease']), undefined);
    await app.signIn('B');
    assert.equal(app.auth.user.id, 'B');
    assert.equal(app.lease.selectedLeaseId, 'B-lease');
    assert.ok(app.lease.allLeases.every(row => row.id === 'B-lease'));
    assert.ok(app.resets >= 3);
  } finally { await app.close(); }
});

test('late profile success cannot overwrite the next account or its persisted credentials', async () => {
  const app = await fixture();
  try {
    await app.signIn('A');
    const request = app.deferUser();
    const updating = app.auth.updateUser({ firstName: 'Old edit' }).catch(error => error);
    await app.signIn('B');
    await renderer.act(async () => { request.resolve({ id: 'A', firstName: 'Old edit' }); await updating; });
    assert.equal(app.auth.user.id, 'B');
    assert.equal(app.state.user.id, 'B');
    assert.equal(app.state.token, 'B');
  } finally { await app.close(); }
});

test('late lease discovery cannot select a previous account lease', async () => {
  const app = await fixture();
  try {
    const request = app.deferLeases();
    await app.signIn('A');
    await app.signIn('B');
    await renderer.act(async () => { request.resolve([{ id: 'A-lease', status: 'active' }]); await delay(); });
    assert.equal(app.client.getQueryData(['tenant', 'A', 'all-leases']), undefined);
    assert.equal(app.auth.user.id, 'B');
    assert.equal(app.lease.selectedLeaseId, 'B-lease');
  } finally { await app.close(); }
});

test('activation persists the selected account and enters its authenticated provider tree', async () => {
  const app = await fixture();
  try {
    await renderer.act(async () => { await app.auth.activate('0771234567', 'A', 'username', 'password'); await delay(); });
    await app.flush();
    assert.equal(app.auth.user.id, 'A');
    assert.equal(app.lease.selectedLeaseId, 'A-lease');
  } finally { await app.close(); }
});

test('failed activation retains the signed-out screen tree so conflicts can be corrected', async () => {
  const app = await fixture();
  try {
    const before = app.mounts;
    app.failActivation(new Error('Username already taken'));
    await renderer.act(async () => { await assert.rejects(app.auth.activate('0771234567', 'A', 'taken', 'password'), /Username already taken/); });
    assert.equal(app.auth.user, null);
    assert.equal(app.mounts, before);
    app.failActivation(undefined);
    await renderer.act(async () => { await app.auth.activate('0771234567', 'A', 'available', 'password'); await delay(); });
    assert.equal(app.auth.user.id, 'A');
  } finally { await app.close(); }
});
