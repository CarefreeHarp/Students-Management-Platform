const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../src/main/resources/static/js/recorrido.js'), 'utf8');

function fixture({ query = '?recorrido=1', pathname = '/panel', width = 390, height = 844, reducedMotion = true, projects = [{ codigo: 'psicologia' }], navPosition = 'sticky', sandbox = false, seedDiagram = false } = {}) {
  const events = new Map();
  const listeners = new Map();
  const frames = new Map();
  const observers = [];
  const history = [];
  const assigned = [];
  const scrolled = [];
  let initialize;
  let frameId = 0;
  let apiCalls = 0;
  let paused = 0;
  let pauseDetails = null;
  let finished = 0;
  const preparedDiagrams = [];
  const completedSteps = [];
  let focused = null;
  const listen = (scope, name, callback) => {
    const key = `${scope}:${name}`;
    const callbacks = listeners.get(key) || [];
    callbacks.push(callback);
    listeners.set(key, callbacks);
    events.set(key, event => [...(listeners.get(key) || [])].forEach(listener => listener(event)));
  };
  const unlisten = (scope, name, callback) => {
    const key = `${scope}:${name}`;
    const callbacks = (listeners.get(key) || []).filter(listener => listener !== callback);
    if (callbacks.length) listeners.set(key, callbacks);
    else { listeners.delete(key); events.delete(key); }
  };
  function element(rect = { left: 24, top: 120, right: 350, bottom: 260, width: 326, height: 140 }) {
    const classes = new Set();
    const attributes = new Map();
    return {
      style: {}, dataset: {}, isConnected: true, offsetHeight: 320, rect,
      classList: {
        add: c => classes.add(c),
        remove: c => classes.delete(c),
        contains: c => classes.has(c),
        toggle: (c, force) => {
          const enabled = force === undefined ? !classes.has(c) : Boolean(force);
          if (enabled) classes.add(c);
          else classes.delete(c);
          return enabled;
        }
      },
      getBoundingClientRect() { return this.rect; },
      focus() { focused = this; },
      remove() { this.isConnected = false; },
      matches() { return attributes.has('tabindex'); },
      setAttribute(name, value) { attributes.set(name, value); },
      removeAttribute(name) { attributes.delete(name); },
      contains(item) { return item === this; },
      querySelector() { return null; },
      querySelectorAll() { return []; }
    };
  }
  const body = element();
  const main = element();
  const nav = element(); nav.offsetHeight = 62;
  const target = element();
  const calendarActions = element({ left: 24, top: 120, right: 124, bottom: 164, width: 100, height: 44 });
  const secondary = element({ left: 24, top: 280, right: 350, bottom: 480, width: 326, height: 200 });
  const spotlight = element();
  const companionHalo = element();
  const card = element();
  const blockers = Array.from({ length: 4 }, () => element());
  const controls = {
    '.tour-close': element(), '[data-tour-prev]': element(), '[data-tour-next]': element(), 'h2': element()
  };
  const chapters = Array.from({ length: 7 }, (_, index) => Object.assign(element(), { dataset: { tourChapter: String(index) } }));
  const content = element();
  content.querySelector = selector => controls[selector] || null;
  content.querySelectorAll = selector => selector === '[data-tour-chapter]' ? chapters : [];
  const layer = element();
  layer.querySelector = selector => ({ '.tour-spotlight': spotlight, '.tour-companion-halo': companionHalo, '.tour-card': card, '.tour-card-content': content }[selector]);
  layer.querySelectorAll = selector => selector === '.tour-blocker' ? blockers : [];
  const nodes = new Map([
    ['#main-nav', nav], ['main', main], ['.calendar-shell', target], ['.dashboard-agenda-day', target], ['.calendar-actions', calendarActions],
    ['.dashboard-overview > .panel', target], ['.page-heading', target], ['.overview-project', secondary],
    ['.project-overview', secondary], ['#create-project-form .form-panel', target], ['#create-project-form button[type="submit"]', target], ['#project-name', target], ['#project-description', target], ['#project-due-date', target], ['label.form-field:has(#project-name)', target], ['label.form-field:has(#project-description)', target], ['label.form-field:has(#project-due-date)', target], ['label.form-field:has(#project-stage)', target], ['#planning-calendar', secondary], ['aside[aria-labelledby="planning-preview-title"]', secondary], ['#add-project-phase', target], ['.project-phase-row:last-child .project-phase-name', target], ['#project-stage', target], ['#add-member', target], ['.member-input-row:last-child .member-name', target], ['[data-new-task]', target], ['.reparto-create', target],
    ['.channels-sidebar', target], ['#channel-list', target], ['.channel-conversation', secondary], ['#messages', secondary], ['#message-form', target], ['.channel-resources', secondary], ['#documents', secondary],
    ['#subject-editor', target], ['.schedule-preferences', secondary], ['#schedule-preferences-title', secondary],
    ['#diagram', secondary], ['.branch-panel', secondary], ['#task-dependency', target], ['#task-dialog', secondary]
  ]);
  body.append = item => { item.isConnected = true; };
  const document = {
    readyState: 'loading', body, activeElement: body,
    createElement: () => layer,
    querySelector: selector => nodes.get(selector) || null,
    querySelectorAll: () => [],
    addEventListener: (name, callback) => name === 'DOMContentLoaded' ? initialize = callback : listen('document', name, callback),
    removeEventListener: (name, callback) => unlisten('document', name, callback)
  };
  class Observer {
    constructor(callback) { this.callback = callback; this.disconnected = false; observers.push(this); }
    observe() { this.disconnected = false; }
    unobserve() {}
    disconnect() { this.disconnected = true; }
  }
  const visualViewport = {
    width, height, offsetLeft: 0, offsetTop: 0,
    addEventListener: (name, callback) => listen('viewport', name, callback),
    removeEventListener: (name, callback) => unlisten('viewport', name, callback)
  };
  const context = {
    URLSearchParams, URL, document, console,
    location: { search: query, pathname, hash: '#agenda', assign: url => assigned.push(url) },
    history: { replaceState: (_, __, url) => history.push(url) },
    App: { escapeHTML: value => String(value), api: async () => { apiCalls++; return projects; } },
    matchMedia: () => ({ matches: reducedMotion }),
    getComputedStyle: node => ({ position: node === nav ? navPosition : 'static' }),
    innerWidth: width, innerHeight: height, scrollY: 0,
    ResizeObserver: Observer, MutationObserver: Observer,
    setTimeout, clearTimeout,
    requestAnimationFrame: callback => { frames.set(++frameId, callback); return frameId; },
    cancelAnimationFrame: id => frames.delete(id),
    visualViewport,
    addEventListener: (name, callback) => listen('window', name, callback),
    removeEventListener: (name, callback) => unlisten('window', name, callback),
    scrollTo: options => scrolled.push(options)
  };
  context.window = context;
  if (sandbox) {
    context.SandboxBridge = { tourActive: true, navigate: url => assigned.push(url), completeTourStep: (chapter, spot) => completedSteps.push({chapter, spot}), isTourStepComplete: (chapter, spot) => completedSteps.some(step => step.chapter === chapter && step.spot === spot), pauseTour: (chapter, spot) => { paused++; pauseDetails = {chapter, spot}; }, finishTour: () => finished++ };
    if (seedDiagram) {
      context.SandboxBridge.projectCode = () => projects[0]?.codigo || null;
      context.SandboxBridge.prepareTourDiagram = async code => {
        preparedDiagrams.push(code);
        return { codigo: code };
      };
    }
  }
  vm.createContext(context);
  vm.runInContext(source, context);
  return {
    initialize: () => initialize(), context, nodes, target, card, spotlight, companionHalo, blockers, content, controls, layer, history, assigned, scrolled, events, observers,
    apiCalls: () => apiCalls, focused: () => focused, paused: () => paused, pauseDetails: () => pauseDetails, finished: () => finished, completedSteps, preparedDiagrams,
    frames: () => frames.size,
    flushFrames() {
      let count = 0;
      while (frames.size && count++ < 150) {
        const pending = [...frames.values()]; frames.clear(); pending.forEach(callback => callback());
      }
      assert(count < 150, 'The animation must settle instead of scheduling forever.');
      return count;
    }
  };
}

test('invalid or missing chapters do not start the tour or request project data', async () => {
  for (const query of ['', '?recorrido=0', '?recorrido=8', '?recorrido=-1', '?recorrido=NaN', '?recorrido=1.5']) {
    const page = fixture({ query });
    await page.initialize();
    assert.equal(page.apiCalls(), 0, query);
    assert.equal(page.frames(), 0, query);
  }
});

test('invalid focus values are clamped and other query/hash values survive closing', async () => {
  for (const [focus, expected] of [['-99', 0], ['NaN', 0], ['Infinity', 1], ['1.9', 1]]) {
    const page = fixture({ query: `?recorrido=1&enfoque=${focus}&origen=prueba` });
    await page.initialize();
    assert(page.history.at(-1).includes(`enfoque=${expected}`));
    page.controls['.tour-close'].onclick();
    assert.equal(page.history.at(-1), '/panel?origen=prueba#agenda');
  }
});

test('reduced-motion spotlight settles immediately and close releases listeners/observers', async () => {
  const page = fixture({ reducedMotion: true });
  await page.initialize();
  assert(page.card.classList.contains('is-ready'));
  assert(page.flushFrames() <= 2);
  assert.equal(page.spotlight.style.width, '342px');
  assert.equal(page.spotlight.style.transform, 'translate3d(16px,112px,0)', 'The spotlight stays centered on its target.');
  assert.equal(page.focused(), page.controls.h2);
  page.controls['.tour-close'].onclick();
  assert.equal(page.layer.isConnected, false);
  assert.equal(page.frames(), 0);
  assert.equal(page.events.size, 0);
  assert(page.observers.every(observer => observer.disconnected));
});

test('clicks outside the highlighted element are blocked while the tour is open', async () => {
  const page = fixture();
  await page.initialize();
  let prevented = false, stopped = false;
  page.events.get('document:click')({
    type: 'click', target: {...page.nodes.get('.overview-project'), closest: () => null},
    preventDefault: () => { prevented = true; }, stopImmediatePropagation: () => { stopped = true; }
  });
  assert.equal(prevented, true);
  assert.equal(stopped, true);
  page.controls['.tour-close'].onclick();
});

test('physical blockers leave a hole only over the highlighted element', async () => {
  const page = fixture({ reducedMotion:true });
  await page.initialize(); page.flushFrames();
  const [top, right, bottom, left] = page.blockers;
  assert.equal(top.style.height, '118px');
  assert.equal(right.style.left, '352px');
  assert.equal(right.style.width, '38px');
  assert.equal(bottom.style.top, '262px');
  assert.equal(left.style.width, '22px');
  page.controls['.tour-close'].onclick();
});

test('the overlay is repositioned after the visible viewport becomes narrower', async () => {
  const page = fixture({ width: 768, height: 700, reducedMotion: true });
  await page.initialize(); page.flushFrames();
  page.context.visualViewport.width = 320;
  page.context.visualViewport.height = 460;
  page.events.get('viewport:resize')(); page.flushFrames();
  assert.equal(page.card.style.width, '296px');
  assert(Number.parseFloat(page.card.style.left) >= 12);
  assert(Number.parseFloat(page.card.style.left) + Number.parseFloat(page.card.style.width) <= 308);
  assert(Number.parseFloat(page.card.style.top) >= 12);
  page.controls['.tour-close'].onclick();
});

test('a highlight near the top edge stays centered on its button', async () => {
  const page = fixture({ reducedMotion:true });
  page.target.rect = {left:143.5, top:13.5, right:237, bottom:47.5, width:93.5, height:34};
  await page.initialize(); page.flushFrames();
  assert.equal(page.spotlight.style.transform, 'translate3d(135.5px,5.5px,0)');
  assert.equal(page.spotlight.style.width, '109.5px');
  assert.equal(page.spotlight.style.height, '50px');
  page.controls['.tour-close'].onclick();
});

test('Escape leaves open native dialogs alone and otherwise ends the tour', async () => {
  const page = fixture();
  await page.initialize();
  const query = page.context.document.querySelector;
  page.context.document.querySelector = selector => selector === 'dialog[open]' ? {} : query(selector);
  page.events.get('document:keydown')({ key: 'Escape' });
  assert.equal(page.layer.isConnected, true);
  page.context.document.querySelector = query;
  page.events.get('document:keydown')({ key: 'Escape' });
  assert.equal(page.layer.isConnected, false);
});

test('scrolling the target away hides the spotlight, keeps the card reachable and restores focus on close', async () => {
  const page = fixture({ reducedMotion: true });
  await page.initialize(); page.flushFrames();
  const original = page.target.rect;
  for (const top of [-2000, 2000]) {
    page.target.rect = { ...original, top, bottom: top + 140 };
    page.events.get('window:scroll')(); page.flushFrames();
    assert.equal(page.spotlight.style.visibility, 'hidden');
    const cardTop = Number.parseFloat(page.card.style.top);
    assert(cardTop >= 12 && cardTop + page.card.offsetHeight <= 832);
  }
  page.target.rect = original;
  page.events.get('window:scroll')(); page.flushFrames();
  assert.equal(page.spotlight.style.visibility, 'visible');
  page.controls['.tour-close'].onclick();
  assert.equal(page.focused(), page.target);
  assert.equal(page.target.matches('[tabindex]'), false, 'Temporary focusability must not remain after closing.');
});

test('short landscape uses side placement when there is room', async () => {
  const page = fixture({ width: 844, height: 390, reducedMotion: true });
  await page.initialize(); page.flushFrames();
  assert.equal(page.card.style.width, '408px');
  assert.equal(page.card.dataset.placement, 'right');
  assert(Number.parseFloat(page.card.style.top) >= 12);
  assert(Number.parseFloat(page.card.style.top) + page.card.offsetHeight <= 378);
  assert.equal(page.spotlight.style.width, '116px', 'Short landscape should focus the compact calendar controls.');
  page.controls['.tour-close'].onclick();
});

test('static and relative headers do not reserve a sticky-header gap when scrolling to a focus', async () => {
  for (const [navPosition, expectedTop] of [['static', 622], ['relative', 622], ['sticky', 560], ['fixed', 560]]) {
    const page = fixture({ width: 844, height: 390, reducedMotion: true, navPosition });
    const actions = page.nodes.get('.calendar-actions');
    actions.rect = { ...actions.rect, top: 650, bottom: 694 };
    await page.initialize();
    assert.equal(page.scrolled.at(-1).top, expectedTop, navPosition);
    assert.equal(page.scrolled.at(-1).behavior, 'instant');
    page.controls['.tour-close'].onclick();
  }
});

test('tall desktop continues to focus the calendar instead of landscape controls', async () => {
  const page = fixture({ width: 1024, height: 768, reducedMotion: true });
  await page.initialize(); page.flushFrames();
  assert.equal(page.spotlight.style.width, '342px');
  page.controls['.tour-close'].onclick();
  assert.equal(page.focused(), page.target);
});

test('the complete-diagram explanation leaves the real diagram unobscured and glows only its guide', async () => {
  const page = fixture({
    query: '?recorrido=4&enfoque=3',
    sandbox: true,
    reducedMotion: true,
  });
  await page.initialize(); page.flushFrames();
  assert.equal(page.spotlight.style.visibility, 'hidden');
  assert.match(page.card.style.boxShadow, /168 151 255/);
  assert.match(page.content.innerHTML, /Este árbol muestra fases, tareas, responsables, estados y fechas/);
  assert.match(page.content.innerHTML, /línea que sale por abajo/);
  page.controls['.tour-close'].onclick();
});

test('both diagram explanations use the guide card without drawing a spotlight around the tree', async () => {
  for (const focus of [2, 3]) {
    const page = fixture({
      query: `?recorrido=4&enfoque=${focus}`,
      sandbox: true,
      reducedMotion: true,
    });
    await page.initialize(); page.flushFrames();
    assert.equal(page.spotlight.style.visibility, 'hidden', `diagram focus ${focus}`);
    assert.match(page.content.innerHTML, /diagrama/);
    page.controls['.tour-close'].onclick();
  }
});

test('the guide-only diagram card stays wide and readable in a desktop side corner', async () => {
  const page = fixture({
    query: '?recorrido=4&enfoque=3', sandbox: true, width: 1440, height: 900, reducedMotion: true,
  });
  page.nodes.get('#main-nav').rect = { left:0, top:0, right:1440, bottom:64, width:1440, height:64 };
  page.nodes.get('#diagram').rect = { left:120, top:220, right:1050, bottom:800, width:930, height:580 };
  await page.initialize(); page.flushFrames();
  assert.equal(page.card.dataset.placement, 'guide-side');
  assert.equal(page.card.style.width, '528px');
  assert.equal(page.card.style.left, '900px');
  assert.equal(page.card.style.top, '80px');
  assert.equal(page.spotlight.style.visibility, 'hidden');
  assert.equal(page.blockers[0].style.height, '218px', 'The real diagram remains the interaction hole in the blockers.');
  page.controls['.tour-close'].onclick();
});

test('the guide-only diagram card remains a compact bottom dock on mobile', async () => {
  const page = fixture({ query: '?recorrido=4&enfoque=3', sandbox: true, reducedMotion: true });
  await page.initialize(); page.flushFrames();
  assert.equal(page.card.dataset.placement, 'guide-bottom');
  assert.equal(page.card.style.top, '512px');
  page.controls['.tour-close'].onclick();
});

test('the final diagram tour step prepares RAM data and reloads the same functional project', async () => {
  const page = fixture({
    query: '?ruta=%2Fproyectos%2Fpsicologia%2Ffases&recorrido=4&enfoque=3', pathname: '/sandbox/vista', sandbox: true, seedDiagram: true, reducedMotion: true,
  });
  await page.initialize();
  assert.deepEqual(page.preparedDiagrams, ['psicologia']);
  assert.match(page.assigned.at(-1), /^\/proyectos\/psicologia\/fases\?recorrido=4&enfoque=3&arbol=real$/);
});

test('accepting the complete diagram explanation unlocks its next workspace', async () => {
  const page = fixture({
    query: '?recorrido=4&enfoque=3&arbol=real', sandbox: true,
    projects: [{ codigo: 'psicologia' }], reducedMotion: true,
  });
  await page.initialize();
  page.controls['[data-tour-next]'].onclick();
  await new Promise(resolve => setTimeout(resolve, 460));
  assert.deepEqual(page.completedSteps, [{ chapter: 4, spot: 3 }]);
  assert.deepEqual(page.assigned, ['/proyectos/psicologia/canales?recorrido=5&enfoque=0']);
});

test('closing while waiting for asynchronously rendered content resolves and cleans up', async () => {
  const page = fixture();
  page.nodes.delete('.calendar-shell'); page.nodes.delete('.dashboard-agenda-day');
  const pending = page.initialize();
  await new Promise(setImmediate);
  page.controls['.tour-close'].onclick();
  await pending;
  assert.equal(page.events.size, 0);
  assert.equal(page.frames(), 0);
  assert(page.observers.every(observer => observer.disconnected));
});

test('advancing while the first target is loading cannot overwrite the next focus', async () => {
  const page = fixture({ reducedMotion: true });
  page.nodes.delete('.calendar-shell'); page.nodes.delete('.dashboard-agenda-day');
  const pending = page.initialize();
  await new Promise(setImmediate);
  page.controls['[data-tour-next]'].onclick();
  await pending; await new Promise(setImmediate);
  page.flushFrames();
  assert(page.content.innerHTML.includes('Lo que sigue'));
  assert(page.history.at(-1).includes('enfoque=1'));
  page.controls['.tour-close'].onclick();
  assert.equal(page.focused(), page.nodes.get('.overview-project'));
});

test('an empty account receives an honest channels placeholder', async () => {
  const page = fixture({ query: '?recorrido=4', projects: [] });
  await page.initialize();
  assert(page.content.innerHTML.includes('Cuando crees un proyecto, sus canales aparecerán dentro de él.'));
  assert(!page.content.innerHTML.includes('tour-detail-count'));
  page.controls['.tour-close'].onclick();
});

test('the card is minimalist: title, one description and three controls', async () => {
  const page = fixture();
  await page.initialize();
  assert.equal((page.content.innerHTML.match(/<button/g) || []).length, 3);
  assert.equal((page.content.innerHTML.match(/<p /g) || []).length, 1);
  for (const extra of ['Tu espacio, paso a paso', 'tour-progress', 'tour-kicker', 'tour-hint', 'tour-step-label']) {
    assert(!page.content.innerHTML.includes(extra), extra);
  }
  page.controls['.tour-close'].onclick();
});

test('page navigation fades out and cannot be skipped with repeated next clicks', async () => {
  const page = fixture({ query:'?recorrido=1&enfoque=1', reducedMotion:false });
  await page.initialize();
  page.flushFrames();
  page.controls['[data-tour-next]'].onclick();
  page.controls['[data-tour-next]'].onclick();
  assert.equal(page.assigned.length, 0, 'Navigation is not immediate.');
  assert(page.layer.classList.contains('is-leaving'));
  await new Promise(resolve => setTimeout(resolve, 460));
  assert.deepEqual(page.assigned, ['/proyectos?recorrido=2&enfoque=0']);
  page.controls['.tour-close'].onclick();
});

test('sandbox keeps the next button locked until the highlighted action is completed', async () => {
  const create = fixture({ sandbox:true, projects:[], query:'?recorrido=2' });
  await create.initialize();
  assert.equal(create.controls['[data-tour-next]'].disabled, true);
  create.events.get('document:input')({type:'input', target:{closest:selector=>selector==='#project-name'?{}:null}});
  assert.equal(create.controls['[data-tour-next]'].disabled, false);
  assert.deepEqual(create.completedSteps, [{chapter:2,spot:0}]);
  create.controls['[data-tour-next]'].onclick();
  await new Promise(setImmediate);
  assert.equal(create.controls['[data-tour-next]'].disabled, true);
  create.events.get('document:input')({type:'input', target:{closest:selector=>selector==='#project-description'?{}:null}});
  assert.equal(create.controls['[data-tour-next]'].disabled, false);
  create.controls['[data-tour-next]'].onclick();
  await new Promise(setImmediate);
  assert.equal(create.controls['[data-tour-next]'].disabled, true);
  create.events.get('document:change')({type:'change', target:{closest:selector=>selector==='#project-due-date'?{}:null}});
  assert.equal(create.controls['[data-tour-next]'].disabled, false);
  create.controls['[data-tour-next]'].onclick();
  await new Promise(setImmediate);
  assert.equal(create.controls['[data-tour-next]'].disabled, true);
  create.events.get('document:click')({type:'click', target:{closest:selector=>selector==='#add-project-phase'?{}:null}});
  assert.equal(create.controls['[data-tour-next]'].disabled, false);
  create.controls['[data-tour-next]'].onclick();
  await new Promise(setImmediate);
  assert.equal(create.controls['[data-tour-next]'].disabled, true);
  create.events.get('document:input')({type:'input', target:{closest:selector=>selector==='.project-phase-row:last-child .project-phase-name'?{}:null}});
  assert.equal(create.controls['[data-tour-next]'].disabled, false);
  create.controls['[data-tour-next]'].onclick();
  await new Promise(setImmediate);
  assert.equal(create.controls['[data-tour-next]'].disabled, true);
  create.events.get('document:click')({type:'click', target:{closest:selector=>selector==='#add-member'?{}:null}});
  assert.equal(create.controls['[data-tour-next]'].disabled, false);
  create.controls['[data-tour-next]'].onclick();
  await new Promise(setImmediate);
  assert.equal(create.controls['[data-tour-next]'].disabled, true);
  create.events.get('document:input')({type:'input', target:{closest:selector=>selector==='.member-input-row:last-child .member-name'?{}:null}});
  assert.equal(create.controls['[data-tour-next]'].disabled, false);
  create.controls['[data-tour-next]'].onclick();
  await new Promise(setImmediate);
  assert.equal(create.controls['[data-tour-next]'].disabled, true);
  create.events.get('document:change')({type:'change', target:{closest:selector=>selector==='input[name="modoReparto"]'?{}:null}});
  assert.equal(create.controls['[data-tour-next]'].disabled, false, 'Cualquiera de los dos modos desbloquea el paso.');
  create.controls['[data-tour-next]'].onclick();
  await new Promise(setImmediate);
  assert.equal(create.controls['[data-tour-next]'].disabled, true);
  create.events.get('document:studyflow:tour-action')({detail:{method:'POST',path:'/api/proyectos'}});
  assert.equal(create.controls['[data-tour-next]'].disabled, false);
  assert.deepEqual(create.completedSteps, [{chapter:2,spot:0},{chapter:2,spot:1},{chapter:2,spot:2},{chapter:2,spot:3},{chapter:2,spot:4},{chapter:2,spot:5},{chapter:2,spot:6},{chapter:2,spot:7},{chapter:2,spot:8}]);
  create.controls['.tour-close'].onclick();
  assert.equal(create.paused(), 1);
  assert.deepEqual(create.pauseDetails(), {chapter:2,spot:8}, 'The host can reopen the exact pending guide step.');
});

test('a discrete guided action advances without requiring another next click', async () => {
  const page = fixture({ sandbox:true, projects:[], query:'?recorrido=2&enfoque=3' });
  await page.initialize();
  assert(!page.content.innerHTML.includes('data-tour-next'));
  page.events.get('document:click')({type:'click', target:{closest:selector=>selector==='#add-project-phase'?{}:null}});
  await new Promise(setImmediate);
  assert(page.content.innerHTML.includes('Nombra la fase'));
  page.controls['.tour-close'].onclick();
});

test('previous keeps an already completed automatic step open for review', async () => {
  const page = fixture({ sandbox:true, projects:[], query:'?recorrido=2&enfoque=3' });
  await page.initialize();
  page.events.get('document:click')({type:'click', target:{closest:selector=>selector==='#add-project-phase'?{}:null}});
  await new Promise(setImmediate);
  page.controls['[data-tour-prev]'].onclick();
  await new Promise(setImmediate);
  assert(page.content.innerHTML.includes('Crea una fase'));
  assert(page.content.innerHTML.includes('Volver al paso actual'));
  page.controls['.tour-close'].onclick();
});

test('the delivery date step keeps focus on the input without illuminating the preview calendar', async () => {
  const page = fixture({ sandbox:true, projects:[], query:'?recorrido=2&enfoque=2' });
  await page.initialize();
  page.flushFrames();
  assert.equal(page.companionHalo.style.visibility, 'hidden');
  page.controls['.tour-close'].onclick();
  assert.equal(page.companionHalo.style.visibility, 'hidden');
});

test('sandbox requires two separate tasks before it unlocks the dependency diagram', async () => {
  const project = fixture({ sandbox:true, projects:[{ codigo:'prueba-1' }], query:'?recorrido=3' });
  await project.initialize();
  assert.equal(project.controls['[data-tour-next]'].disabled, true);
  project.events.get('document:studyflow:tour-action')({detail:{method:'POST',path:'/api/proyectos/prueba-1/tareas'}});
  assert.equal(project.controls['[data-tour-next]'].disabled, false);
  project.controls['[data-tour-next]'].onclick();
  await new Promise(setImmediate);
  assert.equal(project.controls['[data-tour-next]'].disabled, true, 'A second task must be created.');
  project.events.get('document:studyflow:tour-action')({detail:{method:'POST',path:'/api/proyectos/prueba-1/tareas'}});
  assert.equal(project.controls['[data-tour-next]'].disabled, false);
  assert.deepEqual(project.completedSteps, [{chapter:3,spot:0},{chapter:3,spot:1}]);
  project.controls['.tour-close'].onclick();
});

test('the second-task prompt pulses softly when it becomes visible', () => {
  const styles = fs.readFileSync(path.join(__dirname, '../src/main/resources/static/css/recorrido.css'), 'utf8');
  assert.match(source, /title: "Crea una segunda tarea"[\s\S]*pulseCard: true/);
  assert.match(styles, /\.tour-card\.tour-card--pulse \{ animation:tour-card-pulse/);
});

test('the dependency selector receives its own guided step inside the task dialog', async () => {
  const page = fixture({ sandbox:true, projects:[{ codigo:'prueba-1' }], query:'?recorrido=4&enfoque=1' });
  await page.initialize();
  assert(page.content.innerHTML.includes('Indica la dependencia'));
  assert.equal(page.controls['[data-tour-next]'].disabled, true);
  page.events.get('document:studyflow:tour-action')({detail:{method:'POST',path:'/api/tareas/2/dependencias'}});
  assert.equal(page.controls['[data-tour-next]'].disabled, false);
  page.controls['.tour-close'].onclick();
});

test('the dependency is followed by a diagram explanation that requires a voluntary next click', async () => {
  const page = fixture({ sandbox:true, projects:[{ codigo:'prueba-1' }], query:'?recorrido=4&enfoque=2' });
  await page.initialize();
  assert(page.content.innerHTML.includes('Cómo leer el diagrama'));
  assert(page.content.innerHTML.includes('sale por debajo de una tarea'));
  assert.equal(page.controls['[data-tour-next]'].disabled, false);
  page.controls['.tour-close'].onclick();
});

test('after a message, the tour explains channels and chat before opening documents', async () => {
  const page = fixture({ sandbox:true, projects:[{ codigo:'prueba-1' }], query:'?recorrido=5' });
  await page.initialize();
  page.events.get('document:studyflow:tour-action')({detail:{method:'POST',path:'/api/canales/1/mensajes'}});
  await new Promise(setImmediate);
  assert(page.content.innerHTML.includes('Tus canales'));
  page.controls['[data-tour-next]'].onclick();
  await new Promise(setImmediate);
  assert(page.content.innerHTML.includes('La conversación'));
  page.controls['[data-tour-next]'].onclick();
  await new Promise(setImmediate);
  assert(page.content.innerHTML.includes('Recursos compartidos'));
  assert(page.content.innerHTML.includes('Ver documentos y entregables'));
  page.controls['[data-tour-next]'].onclick();
  await new Promise(setImmediate);
  assert.deepEqual(page.assigned, ['/proyectos/prueba-1/entregables?recorrido=6&enfoque=0']);
});

test('finishing the sandbox offers registration through its host without pausing it', async () => {
  const page = fixture({ sandbox:true, query:'?recorrido=9' });
  await page.initialize();
  page.controls['[data-tour-next]'].onclick();
  assert.equal(page.finished(), 1);
  assert.equal(page.paused(), 0);
  assert.equal(page.layer.isConnected, false);
});
