const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const layout = fs.readFileSync(path.join(__dirname, '../public/sandbox/vista.html'), 'utf8');
const bridge = fs.readFileSync(path.join(__dirname, '../public/js/sandbox-frame.js'), 'utf8');
const runnable = bridge.replace(/^import .*;$/gm, '')
  .replace("const behavior = await import('/js/' + script + '.js');", 'const behavior = { mount() {} };')
  .replace('iniciar().catch(() => window.location.replace(\'/sandbox\'));', '');

function fixture(parent, ruta = '/panel') {
  const redirects = [], calls = [];
  const document = {
    documentElement: { classList: { toggle() {} } }, body: { dataset: {} },
    getElementById() {}, addEventListener() {}, dispatchEvent() {}
  };
  const location = {
    search: '?ruta=' + encodeURIComponent(ruta), origin: 'http://localhost',
    replace: value => redirects.push(value)
  };
  const context = {
    window: { parent, location }, location, document, URL, URLSearchParams, Response, CustomEvent,
    mountCommon() {}, mountTour() {}, pantallas: { index: '<main></main>' },
    createPageScope(root, options) { calls.push(options); return options; }
  };
  vm.createContext(context);
  vm.runInContext(runnable, context);
  return { context, redirects, calls, start: () => vm.runInContext('iniciar()', context) };
}

test('CSP is applied before the frame module and blocks live network and forms', () => {
  assert.match(layout, /connect-src 'none'; form-action 'none'/);
  assert.match(layout, /script-src 'self'/);
  assert(layout.indexOf('Content-Security-Policy') < layout.indexOf('sandbox-frame.js'));
});

test('a frame without a sandbox host redirects without mounting a page', async () => {
  const page = fixture({});
  await page.start();
  assert.deepEqual(page.redirects, ['/sandbox']);
  assert.equal(page.calls.length, 0);
});

test('the sandbox uses only the parent RAM storage and API', async () => {
  const requests = [];
  const host = {
    storage: { getItem() {} }, sessionStorage: {}, navigate() {},
    request: async (url, options) => {
      requests.push([url, options.method]);
      return { status: 200, data: { local: true } };
    }
  };
  const page = fixture({ StudyFlowSandbox: host });
  await page.start();
  assert.equal(page.context.window.localStorage, host.storage);
  assert.equal(page.context.window.sessionStorage, host.sessionStorage);
  assert.deepEqual(await (await page.calls[0].request('/api/proyectos', { method: 'GET' })).json(), { local: true });
  assert.deepEqual(requests, [['/api/proyectos', 'GET']]);
  await assert.rejects(page.calls[0].request('https://example.com/api/proyectos'), /deshabilitada/);
  await assert.rejects(page.calls[0].request('/perfil'), /deshabilitada/);
  await assert.rejects(page.context.window.fetch('/api/proyectos'), /deshabilitada/);
});

test('arbitrary frame views are rejected before mounting', async () => {
  const links = [];
  const host = {
    storage: { getItem() {} }, sessionStorage: {},
    request() {}, navigate: url => links.push(url)
  };
  const page = fixture({ StudyFlowSandbox: host }, '/api/usuarios/actual');
  await page.start();
  assert.deepEqual(links, ['/panel']);
  assert.equal(page.calls.length, 0);
});
