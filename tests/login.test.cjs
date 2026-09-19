const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../src/main/resources/static/js/login.js'), 'utf8');
const template = fs.readFileSync(path.join(__dirname, '../src/main/resources/templates/login.html'), 'utf8');

function fixture({ query = '', result = { acceso:true }, ok = true } = {}) {
  const requests = [], navigation = [], nodes = new Map();
  for (const id of ['entry-options','signin-panel','show-signin','hide-signin','entry-title','entry-description','login-feedback','login-email','login-password','signin-submit','password-form']) {
    const classes = new Set(), attributes = {};
    nodes.set('#'+id, { value:'', hidden:id==='signin-panel', disabled:false, textContent:'', listeners:{}, attributes,
      classList:{toggle(name,value){if(value) classes.add(name);else classes.delete(name);},contains(name){return classes.has(name);}},
      setAttribute(name,value){attributes[name]=value;}, removeAttribute(name){delete attributes[name];},
      addEventListener(name,listener){this.listeners[name]=listener;}, focus(){this.focused=true;}, checkValidity(){return this.value.includes('@');}
    });
  }
  const icon = {}, toggle = { dataset:{passwordToggle:'login-password'}, listeners:{}, attributes:{}, querySelector(){return icon;},addEventListener(name,listener){this.listeners[name]=listener;},setAttribute(name,value){this.attributes[name]=value;} };
  nodes.get('#login-password').type='password';
  const context = {
    URLSearchParams,
    document:{readyState:'complete',querySelector:selector=>nodes.get(selector),querySelectorAll:()=>[toggle],getElementById:id=>nodes.get('#'+id)},
    location:{search:query,assign:url=>navigation.push(url)},
    fetch:async(url,options)=>{requests.push({url,options});return {ok,json:async()=>result};}
  };
  context.window=context;
  vm.runInNewContext(source,context);
  return {nodes,requests,navigation,toggle,icon,submit:()=>nodes.get('#password-form').listeners.submit({preventDefault(){}})};
}

test('entry offers an isolated sandbox and never creates an account automatically', () => {
  const page=fixture();
  assert.equal(page.requests.length,0);
  assert(template.includes('href="/sandbox"'));
  assert(template.includes('href="/registro"'));
  for(const removed of ['quick-form','demo-button','Valentina','sesion/demostracion','sesion/entrar']) assert(!template.includes(removed)&&!source.includes(removed));
});

test('existing-account choice reveals login and back restores entry options', () => {
  const page=fixture();
  page.nodes.get('#show-signin').listeners.click();
  assert.equal(page.nodes.get('#entry-options').hidden,true);
  assert.equal(page.nodes.get('#signin-panel').hidden,false);
  assert(page.nodes.get('#login-email').focused);
  page.nodes.get('#hide-signin').listeners.click();
  assert.equal(page.nodes.get('#entry-options').hidden,false);
  assert.equal(page.nodes.get('#signin-panel').hidden,true);
});

test('direct existing-account link opens the password form without submitting', () => {
  const page=fixture({query:'?acceso=cuenta'});
  assert.equal(page.nodes.get('#signin-panel').hidden,false);
  assert.equal(page.requests.length,0);
});

test('empty credentials do not send a request', async () => {
  const page=fixture();await page.submit();
  assert.equal(page.requests.length,0);
  assert(page.nodes.get('#login-feedback').textContent.includes('correo válido'));
});

test('valid password authentication navigates to the real panel', async () => {
  const page=fixture();
  page.nodes.get('#login-email').value='user@example.com';page.nodes.get('#login-password').value='password';
  await page.submit();
  assert.deepEqual(page.navigation,['/panel']);
  assert.equal(page.requests[0].url,'/api/sesion/acceder');
  assert.deepEqual(JSON.parse(page.requests[0].options.body),{correo:'user@example.com',contrasena:'password'});
});

test('failed authentication stays in the form and allows retry', async () => {
  const page=fixture({result:{acceso:false,mensaje:'Datos incorrectos'}});
  page.nodes.get('#login-email').value='user@example.com';page.nodes.get('#login-password').value='wrong';
  await page.submit();
  assert.equal(page.navigation.length,0);
  assert.equal(page.nodes.get('#login-feedback').textContent,'Datos incorrectos');
  assert.equal(page.nodes.get('#signin-submit').disabled,false);
});

test('password visibility control updates its accessible label and state', () => {
  const page=fixture();page.toggle.listeners.click();
  assert.equal(page.nodes.get('#login-password').type,'text');
  assert.equal(page.toggle.attributes['aria-label'],'Ocultar contraseña');
  assert.equal(page.toggle.attributes['aria-pressed'],'true');
  page.toggle.listeners.click();assert.equal(page.nodes.get('#login-password').type,'password');
});
