const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

for (const [file, name] of [['app/screens/lease.tsx', 'handleDownloadStatement'], ['components/ui/PaymentReceiptModal.tsx', 'handleDownloadPdf']]) {
  test(`${name} discards an old-account download instead of opening the new account share sheet`, async () => {
    const filename = path.resolve(__dirname, '..', file);
    const source = ts.createSourceFile(filename, fs.readFileSync(filename, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    let handler;
    function visit(node) { if (ts.isVariableDeclaration(node) && node.name.getText(source) === name) handler = node.initializer; ts.forEachChild(node, visit); }
    visit(source);
    const code = ts.transpileModule(`(${handler.getText(source)});`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
    let active = true, resolve, shared = 0, removed = 0;
    const download = new Promise(done => { resolve = done; });
    let start; const started = new Promise(done => { start = done; });
    class File {
      static downloadFileAsync() { start(); return download; }
    }
    const run = vm.runInNewContext(code, {
      active: () => active, selectedLeaseId: 'lease', paymentId: 'payment', API_BASE_URL: 'https://example.invalid',
      secureStorage: { getToken: async () => 'old-token' }, File, Paths: { cache: 'cache' },
      Sharing: { shareAsync: async () => { shared++; } }, Alert: { alert: () => assert.fail('Stale alert') },
      setIsDownloading: () => {},
    });
    const operation = run();
    await started;
    active = false;
    resolve({ uri: 'old-private.pdf', delete: () => { removed++; } });
    await operation;
    assert.equal(shared, 0); assert.equal(removed, 1);
  });
}
