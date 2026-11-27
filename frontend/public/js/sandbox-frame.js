import { createPageScope } from './page-scope.js';
import { mount as mountCommon } from './main.js';
import { mount as mountTour } from './recorrido.js';
import pantallas from '/sandbox/pantallas.js';

const paginas = {
  '/panel': ['index', 'dashboard', 'dashboard'],
  '/proyectos': ['proyectos', 'projects', 'proyectos'],
  '/proyectos/nuevo': ['crear-proyecto', 'crear-proyecto', 'crear-proyecto'],
  '/perfil': ['perfil', 'perfil', 'perfil'],
  '/perfil/editar': ['editar-perfil', 'perfil', 'perfil'],
  '/horarios': ['crear-horario', 'schedule', 'crear-horario'],
  '/recordatorios': ['recordatorios', 'recordatorios', 'recordatorios']
};
const secciones = {
  proyecto: ["proyecto", 'project', "proyecto"],
  fases: ['fases', 'fases', 'fases'],
  canales: ["canales", "canales", "canales"],
  entregables: ['entregables', 'entregables', 'entregables']
};

function obtenerHost() {
  try {
    return window.parent !== window ? window.parent.StudyFlowSandbox : null;
  } catch (_) { return null; }
}

async function iniciar() {
  const host = obtenerHost();
  if (!host?.request || !host.storage || !host.sessionStorage) {
    window.location.replace('/sandbox');
    return;
  }

  const language = host.language;
  const { t: uiText } = language;
  document.documentElement.lang = language.actual();
  document.title = uiText("sandbox.titulo");
  Object.defineProperty(window, 'localStorage', { value: host.storage });
  Object.defineProperty(window, 'sessionStorage', { value: host.sessionStorage });
  Object.defineProperty(window, 'fetch', {
    value: async () => { throw new Error(uiText("sandbox_frame.red_deshabilitada_en_el_tour")); }
  });
  window.SandboxBridge = host;
  document.documentElement.classList.toggle('dark', host.storage.getItem('studyflow-tema') !== 'claro');

  const ruta = new URLSearchParams(location.search).get('ruta') || '/panel';
  const project = ruta.match(/^\/proyectos\/([a-zA-Z0-9_-]+)(?:\/(fases|canales|entregables))?$/);
  const route = paginas[ruta] || (project && secciones[project[2] || "proyecto"]);
  if (!route) {
    host.navigate('/panel');
    return;
  }
  const [plantilla, pagina, script] = route;
  document.body.dataset.page = pagina;
  if (project) document.body.dataset.projectId = project[1];
  const markup = pantallas[plantilla].replace(/{{ t\('([\w.]+)'\) }}/g, (_, key) =>
    uiText(key).replace(/[&<>"']/g, ch => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[ch])));
  document.body.innerHTML = markup;
  const status = document.getElementById('schedule-storage-status');
  if (status) status.textContent = uiText("sandbox_frame.el_borrador_es_temporal_se_borra_al_salir");

  const scope = createPageScope(document.body, {
    language,
    sandbox: true,
    navigate: host.navigate,
    logout: async () => {},
    request: async (input, options = {}) => {
      const url = new URL(input, location.origin);
      if (url.origin !== location.origin || !url.pathname.startsWith('/api/')) {
        throw new Error(uiText("sandbox_frame.red_deshabilitada_en_el_tour"));
      }
      const reply = await host.request(url.pathname + url.search, options);
      if (reply.status < 400) {
        document.dispatchEvent(new CustomEvent('studyflow:tour-action', {
          detail: { method: String(options.method || 'GET').toUpperCase(), path: url.pathname, status: reply.status }
        }));
      }
      return new Response(reply.status === 204 ? null : JSON.stringify(reply.data),
        { status: reply.status, headers: { 'Content-Type': 'application/json' } });
    }
  });

  document.addEventListener('click', event => {
    const link = event.target.closest('a[href]');
    if (!link || event.defaultPrevented) return;
    const url = new URL(link.href);
    if (url.protocol === 'blob:') return;
    if (url.origin === location.origin && url.pathname === location.pathname && url.hash) return;
    event.preventDefault();
    if (url.origin === location.origin) host.navigate(url.pathname + url.search + url.hash);
  });
  document.addEventListener('submit', event => { if (!event.defaultPrevented) event.preventDefault(); });

  const behavior = await import('/js/' + script + '.js');
  mountCommon(scope);
  behavior.mount(scope);
  mountTour(scope);
}

iniciar().catch(() => window.location.replace('/sandbox'));
