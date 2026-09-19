const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const layout = fs.readFileSync(path.join(__dirname, '../src/main/resources/templates/fragments/layout.html'), 'utf8');
const preflight = layout.match(/<script\b[^>]*id="sandbox-preflight"[^>]*>([\s\S]*?)<\/script>/)[1];
const bridge = fs.readFileSync(path.join(__dirname, '../src/main/resources/static/js/sandbox-frame.js'), 'utf8');

function storage() {
  const values = new Map();
  return {getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, String(value))};
}

function fixture(mode = 'valid') {
  const actualLocal = storage(), actualSession = storage();
  actualLocal.setItem('private', 'real account');
  actualSession.setItem('private', 'real session');
  const redirects = [], calls = [], events = new Map(), dispatched = [];
  let networkCalls = 0, stopped = false;
  const host = {storage:storage(), sessionStorage:storage(), navigate:url=>redirects.push(url),
    request:async (url, options) => {calls.push({url, options}); return {status:200, data:{sandbox:true}};}};
  const context = {
    URL, Response, console,
    location:{origin:'http://localhost:6768', replace:url=>redirects.push(url)},
    stop:()=>{stopped=true;},
    fetch:async()=>{networkCalls++; throw new Error('Real network must never run');},
    localStorage:actualLocal, sessionStorage:actualSession,
    CustomEvent: class {constructor(type, init={}) {this.type=type; this.detail=init.detail;}},
    document:{addEventListener:(type, handler)=>events.set(type, handler), dispatchEvent:event=>{dispatched.push(event); events.get(event.type)?.(event);}}
  };
  context.window=context;
  context.parent=mode==='absent'?context:{StudyFlowSandbox:host};
  if(mode==='cross-origin') {
    context.parent={};
    Object.defineProperty(context.parent,'StudyFlowSandbox',{get(){throw new Error('Cross-origin parent');}});
  }
  vm.createContext(context);
  return {context,host,actualLocal,actualSession,redirects,calls,events,dispatched,
    networkCalls:()=>networkCalls,stopped:()=>stopped,
    preflight:()=>vm.runInContext(preflight,context),bridge:()=>vm.runInContext(bridge,context)};
}

test('inline isolation precedes every external bridge and app script', () => {
  const isolation = layout.indexOf('id="sandbox-preflight"');
  assert.ok(isolation > 0);
  assert.ok(isolation < layout.indexOf('src="/js/sandbox-frame.js"'));
  assert.ok(isolation < layout.indexOf('src="/js/main.js"'));
});

test('a failed external bridge load cannot expose actual storage or network', async () => {
  const f=fixture(); f.preflight();
  assert.equal(f.context.__sandboxIsolated,true);
  assert.equal(f.context.localStorage.getItem('private'),null);
  assert.equal(f.context.sessionStorage.getItem('private'),null);
  f.context.localStorage.setItem('private','trial');
  f.context.sessionStorage.setItem('private','temporary');
  assert.equal(f.actualLocal.getItem('private'),'real account');
  assert.equal(f.actualSession.getItem('private'),'real session');
  await assert.rejects(f.context.fetch('/api/proyectos',{method:'POST'}),/Network disabled/);
  assert.equal(f.networkCalls(),0);
});

for(const mode of ['absent','cross-origin']) {
  test(`an ${mode} host fails closed before later scripts run`, async () => {
    const f=fixture(mode); f.preflight();
    assert.throws(()=>f.bridge(),/Isolated sandbox host required/);
    assert.equal(f.stopped(),true);
    assert.deepEqual(f.redirects,['/sandbox']);
    f.context.localStorage.setItem('private','trial');
    assert.equal(f.actualLocal.getItem('private'),'real account');
    await assert.rejects(f.context.fetch('/api/sesion/salir',{method:'POST'}),/Network disabled/);
    assert.equal(f.calls.length,0);
    assert.equal(f.networkCalls(),0);
  });
}

test('a valid host shares only RAM storage and handles API requests locally', async () => {
  const f=fixture(); f.preflight(); f.bridge();
  assert.equal(f.context.localStorage,f.host.storage);
  assert.equal(f.context.sessionStorage,f.host.sessionStorage);
  f.context.localStorage.setItem('draft','project');
  assert.equal(f.host.storage.getItem('draft'),'project');
  assert.equal(f.actualLocal.getItem('draft'),null);
  const result=await f.context.fetch('/api/proyectos',{method:'POST',body:'{}'});
  assert.deepEqual(await result.json(),{sandbox:true});
  assert.equal(f.calls[0].url,'/api/proyectos');
  assert.equal(f.calls[0].options.method,'POST');
  assert.equal(f.dispatched[0].type,'studyflow:tour-action');
  assert.equal(f.dispatched[0].detail.method,'POST');
  assert.equal(f.dispatched[0].detail.path,'/api/proyectos');
  assert.equal(f.dispatched[0].detail.status,200);
  assert.equal(f.networkCalls(),0);
});

test('external, non-API and unsupported fetch calls cannot fall through to network', async () => {
  const f=fixture(); f.preflight(); f.bridge();
  for(const input of ['https://example.org/api/proyectos','/perfil','/api','//example.org/api/proyectos',{}]) {
    await assert.rejects(f.context.fetch(input),/Network disabled|Unsupported request/);
  }
  assert.equal(f.calls.length,0);
  assert.equal(f.networkCalls(),0);
});

test('missing preflight refuses a valid host rather than using persistent storage', async () => {
  const f=fixture();
  assert.throws(()=>f.bridge(),/Isolated sandbox host required/);
  await assert.rejects(f.context.fetch('/api/proyectos'),/Network disabled/);
  assert.equal(f.calls.length,0);
});
