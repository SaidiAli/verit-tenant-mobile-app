const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function loader(mocks = {}, globals = {}) {
  const cache = new Map();
  const root = path.resolve(__dirname, '../..');
  function load(name) {
    if (Object.hasOwn(mocks, name)) return mocks[name];
    if (cache.has(name)) return cache.get(name).exports;
    const filename = path.join(root, name);
    const source = fs.readFileSync(filename, 'utf8');
    const code = ts.transpileModule(source, { compilerOptions: {
      target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    } }).outputText;
    const module = { exports: {} }; cache.set(name, module);
    const localRequire = request => {
      if (Object.hasOwn(mocks, request)) return mocks[request];
      if (request.startsWith('.') || request.startsWith('@/')) {
        const base = request.startsWith('@/') ? path.join(root, request.slice(2)) : path.resolve(path.dirname(filename), request);
        const resolved = ['.ts', '.tsx', '.cjs'].map(ext => base + ext).find(file => fs.existsSync(file));
        return load(path.relative(root, resolved));
      }
      return require(request);
    };
    vm.runInNewContext(code, { require: localRequire, module, exports: module.exports, console,
      process, AbortController, setTimeout, clearTimeout, setInterval, clearInterval, FormData, __DEV__: false, ...globals }, { filename });
    return module.exports;
  }
  return load;
}
module.exports = { loader };
