const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const file = path.join(__dirname, '../lib/api.ts');
const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
const declaration = source.statements.filter(ts.isVariableStatement).flatMap(node => [...node.declarationList.declarations]).find(node => node.name.getText(source) === 'paymentApi');
const method = declaration.initializer.properties.find(node => node.name?.getText(source) === 'initiate');
const code = ts.transpileModule(`const paymentApi = { ${method.getText(source)} }; paymentApi.initiate;`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
const input = { leaseId: 'lease', amount: 50000, phoneNumber: '0771234567', provider: 'mtn' };
function run(post) { return vm.runInNewContext(code, { api: { post }, isCancel: () => false })(input); }

test('retains pending confirmation references returned with 503', async () => {
  const data = { paymentId: 'payment', transactionId: 'VRT_test', status: 'pending', gateway: 'yo' };
  const result = await run(() => Promise.reject({ response: { status: 503, data: { error: 'Payment confirmation pending', data } } }));
  assert.equal(result.transactionId, 'VRT_test');
  assert.equal(result.confirmationPending, true);
  assert.equal(result.amount, 50000);
  assert.equal(result.currency, 'UGX');
});
test('immediate completion is preserved and initiation has a provider-sized timeout', async () => {
  const result = await run((_url, body, options) => {
    assert.equal(options.timeout, 60000);
    return Promise.resolve({ data: { success: true, data: { paymentId: 'payment', transactionId: 'VRT_test', status: 'completed' } } });
  });
  assert.equal(result.status, 'completed');
  assert.equal(result.leaseId, 'lease');
});
test('transport loss or unclassified server error is unresolved rather than retryable collection', async () => {
  for (const error of [{ message: 'timeout' }, { response: { status: 500, data: {} } }]) {
    await assert.rejects(run(() => Promise.reject(error)), error => error.confirmationPending === true);
  }
});
test('a confirmed decline remains an ordinary failure', async () => {
  await assert.rejects(run(() => Promise.reject({ response: { status: 400, data: { error: 'Payment failed' } } })), error => error.message === 'Payment failed' && !error.confirmationPending);
});

test('polling timeout keeps the payment unresolved with the same reference', () => {
  const file = path.join(__dirname, '../app/(tabs)/payments.tsx');
  const text = fs.readFileSync(file, 'utf8');
  const ast = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
  let declaration;
  function visit(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(ast) === 'handlePaymentTimeout') declaration = node;
    ts.forEachChild(node, visit);
  }
  visit(ast);
  const code = ts.transpileModule(`(${declaration.initializer.arguments[0].getText(ast)});`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  let state = 'processing'; let error = '';
  vm.runInNewContext(code, { setStep: value => { state = value; }, setError: value => { error = value; } })();
  assert.equal(state, 'pending');
  assert.match(error, /pending/);
});
