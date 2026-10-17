const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, mocks = {}) {
  const filename = path.resolve(__dirname, '..', file);
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(code, { module, exports: module.exports, require: name => mocks[name] || require(name), FormData, Error, console });
  return module.exports;
}
const validation = load('lib/tenant-identity-validation.ts');
test('mobile keeps optional fields, leading zeroes, NIN normalization and explicit clearing', () => {
  const values = validation.identityValues(' 0123456789 ', ' ab12cd34ef5678 ');
  assert.equal(values.tin, '0123456789'); assert.equal(values.nin, 'AB12CD34EF5678');
  assert.equal(validation.identityValues('', '').tin, null);
  assert.throws(() => validation.identityValues('123', ''), /10 digits/);
  assert.throws(() => validation.identityValues('', 'short'), /14 letters/);
});
test('mobile rejects unsupported or oversized selected pictures', () => {
  assert.throws(() => validation.validateIdentityImage({ mimeType: 'image/heic', fileSize: 1 }), /JPEG/);
  assert.throws(() => validation.validateIdentityImage({ mimeType: 'image/jpeg', fileSize: 15 * 1024 * 1024 + 1 }), /15 MiB/);
  validation.validateIdentityImage({ mimeType: 'image/png', fileSize: 1024 });
});
test('mobile self-service calls never submit a landlord or target tenant ID', async () => {
  const calls = [];
  const api = new Proxy({}, { get: (_target, method) => async (...args) => { calls.push([method, ...args]); return { data: { success: true, data: { tenantId: 'self' } } }; } });
  const service = load('lib/tenant-identity.ts', { './api': { __esModule: true, default: api } }).tenantIdentityApi;
  await service.read(); await service.update({ tin: null }); await service.download('front'); await service.remove('back');
  assert.deepEqual(calls.map(call => call[1]), ['/tenant/identity', '/tenant/identity', '/tenant/identity/images/front/download', '/tenant/identity/images/back']);
  assert.deepEqual(Object.keys(calls[1][2]), ['tin']);
});
test('mobile permission denial and cancellation never launch an upload', async () => {
  const file = path.resolve(__dirname, '../app/screens/identity.tsx');
  const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let pick;
  function visit(node) { if (ts.isFunctionDeclaration(node) && node.name?.text === 'pick') pick = node; ts.forEachChild(node, visit); } visit(source);
  const code = ts.transpileModule(`(${pick.getText(source)});`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  for (const allowed of [false, true]) {
    let launched = 0, selected = 0, error = '';
    const call = vm.runInNewContext(code, {
      operationInFlight: { current: false },
      ImagePicker: { requestCameraPermissionsAsync: async () => ({ granted: allowed }), launchCameraAsync: async () => { launched++; return { canceled: true }; }, UIImagePickerPreferredAssetRepresentationMode: { Compatible: 'compatible' } },
      setError: value => { error = value; }, setPictures: () => { selected++; }, setSaved: () => {}, messageFor: error => error.message, validateIdentityImage: validation.validateIdentityImage,
    });
    await call('front', true);
    assert.equal(launched, allowed ? 1 : 0); assert.equal(selected, 0);
    if (!allowed) assert.match(error, /Camera access/);
  }
});

test('mobile mutation failure clears busy state and permits retry without discarding selected pictures', async () => {
  const file = path.resolve(__dirname, '../app/screens/identity.tsx');
  const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let change;
  function visit(node) { if (ts.isFunctionDeclaration(node) && node.name?.text === 'change') change = node; ts.forEachChild(node, visit); } visit(source);
  const code = ts.transpileModule(`(${change.getText(source)});`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const state = { busy: false, saved: false, error: '', identity: null, progress: 50 };
  const call = vm.runInNewContext(code, {
    operationInFlight: { current: false }, screenActive: { current: true },
    setBusy: value => { state.busy = value; }, setError: value => { state.error = value; }, setSaved: value => { state.saved = value; },
    setIdentity: value => { state.identity = value; }, setProgress: value => { state.progress = value; }, setPreview: () => {},
    messageFor: error => error.message,
  });
  await call(async () => { throw new Error('Upload interrupted'); });
  assert.equal(state.error, 'Upload interrupted'); assert.equal(state.busy, false); assert.equal(state.progress, null);
  await call(async () => ({ images: { front: true, back: false } }));
  assert.equal(state.identity.images.front, true); assert.equal(state.saved, true); assert.equal(state.error, '');
});

test('mobile picture popup contains the image and closes through native back, accessibility, backdrop or close', () => {
  const jsx = (type, props) => ({ type, props });
  const { IdentityImagePreview } = load('components/identity/IdentityImagePreview.tsx', {
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'react-native': { Modal: 'Modal', Pressable: 'Pressable', Text: 'Text', View: 'View', useWindowDimensions: () => ({ height: 800 }) },
    'expo-image': { Image: 'Image' },
  });
  const nodes = tree => [tree, ...[tree?.props?.children].flat().filter(child => child && typeof child === 'object').flatMap(nodes)];
  for (const uri of ['https://private.example/signed', 'file:///selected-front.jpg']) {
    let closed = 0, failed = 0;
    const tree = IdentityImagePreview({ uri, title: 'National ID front', onClose: () => { closed++; }, onError: () => { failed++; } });
    assert.equal(tree.type, 'Modal'); assert.equal(tree.props.visible, true);
    tree.props.onRequestClose();
    const content = nodes(tree);
    const image = content.find(node => node.type === 'Image');
    assert.equal(image.props.source.uri, uri); assert.equal(image.props.contentFit, 'contain'); assert.equal(image.props.cachePolicy, 'none');
    image.props.onError(); assert.equal(failed, 1);
    const panel = content.find(node => node.props.accessibilityViewIsModal);
    panel.props.onAccessibilityEscape();
    for (const button of content.filter(node => node.type === 'Pressable')) button.props.onPress();
    assert.equal(closed, 4);
  }
  const closed = IdentityImagePreview({ uri: null, title: '', onClose: () => {}, onError: () => {} });
  assert.equal(closed.props.visible, false);
  assert.equal(nodes(closed).some(node => node.type === 'Image'), false);
});
