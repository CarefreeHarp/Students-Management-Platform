/* StudyFlow: capa temporal de datos. Sustituible por servicios/API en una futura etapa. */
export function mount(scope) {
  const { t: uiText, StudyFlowLanguage } = scope;
  const { document, listen, request, later, animate } = scope;

  const KEYS = {
    user: 'studyflow_user',
    projects: 'studyflow_projects',
    session: 'studyflow_session'
  };

  /*
   * Modo claro / oscuro.
   *
   * La clase .dark en <html> ya la pone un script síncrono de la cabecera, para
   * que no haya fogonazo blanco al cargar. Aquí solo se atiende el interruptor
   * y se recuerda la elección. Mientras no se elija nada se sigue al sistema, y
   * si el sistema cambia la página cambia con él.
   */
  const Tema = {
    CLAVE: 'studyflow-tema',

    esOscuro() {
      return document.documentElement.classList.contains('dark');
    },

    aplicar(oscuro, recordar) {
      document.documentElement.classList.toggle('dark', oscuro);
      if (recordar) {
        try {
          localStorage.setItem(this.CLAVE, oscuro ? 'oscuro' : 'claro');
        } catch (error) {
          /* Sin almacenamiento el cambio vale solo para esta pestaña. */
        }
      }
      this.pintarBotones();
    },

    pintarBotones() {
      const oscuro = this.esOscuro();
      document.querySelectorAll('[data-action="tema"]').forEach((boton) => {
        const icono = boton.querySelector('i');
        if (icono) icono.className = oscuro ? 'bi bi-sun-fill' : 'bi bi-moon-stars-fill';
        boton.setAttribute('aria-pressed', String(oscuro));
        boton.title = oscuro ? uiText("sandbox.cambiar_a_modo_claro") : uiText("main.cambiar_a_modo_oscuro");
      });
    },

    enlazarBoton(boton) {
      if (!boton) return;
      boton.addEventListener('click', () => this.aplicar(!this.esOscuro(), true));
      this.pintarBotones();
    },

    seguirAlSistema() {
      if (!window.matchMedia) return;
      listen(window.matchMedia('(prefers-color-scheme: dark)'), 'change', (evento) => {
        let elegido = null;
        try {
          elegido = localStorage.getItem(this.CLAVE);
        } catch (error) { /* sin almacenamiento, se sigue al sistema */ }
        if (!elegido) this.aplicar(evento.matches, false);
      });
    }
  };

  Tema.seguirAlSistema();
  listen(window, 'studyflow:tema-cambiar', (event) => {
    if (typeof event.detail?.oscuro === 'boolean') Tema.aplicar(event.detail.oscuro, true);
  });

  /* Rutas servidas por la capa Controlador de Spring MVC. Centralizarlas aquí
     evita enlaces sueltos y facilita cambiar el enrutado en un solo punto. */
  const ROUTES = {
    dashboard: '/panel',
    login: '/login',
    registro: '/registro',
    perfil: '/perfil',
    editarPerfil: '/perfil/editar',
    proyectos: '/proyectos',
    nuevoProyecto: '/proyectos/nuevo',
    proyecto: id => `/proyectos/${encodeURIComponent(id)}`,
    horarios: '/horarios',
    recordatorios: '/recordatorios',
    chats: '/chats',
    chat: id => `/chats/${encodeURIComponent(id)}`,
    api: {
      proyectos: '/api/proyectos',
      proyecto: id => `/api/proyectos/${encodeURIComponent(id)}`,
      tareas: id => `/api/proyectos/${encodeURIComponent(id)}/tareas`,
      usuario: '/api/usuarios/actual',
      sesion: '/api/sesion/actual',
      salir: '/api/sesion/salir',
      materias: '/api/materias',
      preferenciasRecordatorio: '/api/recordatorios/preferencias',
      recordatorios: '/api/recordatorios',
      apuntes: '/api/apuntes',
      chats: '/api/chats',
      chat: id => `/api/chats/${encodeURIComponent(id)}`,
      organizadorPlan: '/api/organizador/plan',
      organizadorEstado: '/api/organizador/estado'
    }
  };

  /* Punto único de acceso al backend. Hoy la interfaz trabaja con localStorage;
     cuando la API REST se conecte, basta con cambiar las funciones get/save. */
  async function api(path, options = {}) {
    const response = await request(path, {
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      ...options
    });
    if (!response.ok) throw new Error((uiText("main.error_0_al_llamar_a_1", {0: response.status, 1: path})));
    return response.status === 204 ? null : response.json();
  }

  const defaultUser = {
    firstName: uiText("index.estudiante"), lastName: '', name: uiText("index.estudiante"), email: '', age: '',
    university: '', career: '', semester: '', description: '', avatar: ''
  };

  function read(key, fallback) {
    try { const stored = localStorage.getItem(key); return stored ? JSON.parse(stored) : fallback; }
    catch (_) { return fallback; }
  }
  function write(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
  function uid(prefix = 'item') { return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`; }
  function normalizarPerfil(user) {
    return { id: user.id, firstName: user.nombre, lastName: user.apellido, name: user.nombreCompleto,
      email: user.correo, university: user.universidad, career: user.programa, semester: user.semestre,
      age: user.edad, description: user.descripcion, avatar: user.avatarUrl, joinedAt: user.fechaRegistro };
  }
  function normalizeUser(user) {
    const result = { ...defaultUser, ...(user || {}) };
    result.name = user?.name || `${result.firstName || ''} ${result.lastName || ''}`.trim() || defaultUser.name;
    return result;
  }
  let currentUser = scope.user ? normalizarPerfil(scope.user) : null;
  function getUser() { return normalizeUser(currentUser || (scope.sandbox ? read(KEYS.user, defaultUser) : defaultUser)); }
  function saveUser(user) {
    currentUser = normalizeUser(user);
    if (scope.sandbox) write(KEYS.user, currentUser);
  }
  function getProjects() {
    const projects = scope.sandbox ? read(KEYS.projects, null) : null;
    return Array.isArray(projects) ? projects : [];
  }
  function saveProjects(projects) { if (scope.sandbox) write(KEYS.projects, projects); }
  function navigate(url) { return scope.navigate(url); }
  function getProject(id) { return getProjects().find(project => project.id === id); }
  function updateProjectProgress(project) {
    const tasks = project.tasks || [];
    project.progress = tasks.length ? Math.round(tasks.filter(task => task.status === 'done').length / tasks.length * 100) : 0;
    return project.progress;
  }
  function getProgress(project) {
    if (typeof project.progress === 'number') return project.progress;
    return updateProjectProgress(project);
  }
  function escapeHTML(value) {
    return String(value ?? '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
  }
  function formatDate(date, options = { day: 'numeric', month: 'short' }) {
    if (!date) return uiText("fases.sin_fecha");
    const parsed = new Date(`${date}T12:00:00`);
    if (Number.isNaN(parsed.getTime())) return date;
    return new Intl.DateTimeFormat(StudyFlowLanguage.locale(), options).format(parsed).replace('.', '');
  }
  /* Etiquetas de estado. Se admiten los cuatro estados actuales y los nombres
     antiguos, porque las pantallas que aún leen localStorage guardan los viejos. */
  function statusLabel(status) {
    return ({
      'sin-empezar': uiText("fases.sin_empezar"), 'en-proceso': uiText("fases.en_proceso"),
      'en-revision': uiText("entregables.en_revision_2"), 'terminada': uiText("fases.terminada"),
      pending: uiText("fases.sin_empezar"), progress: uiText("fases.en_proceso"), 'in-progress': uiText("fases.en_proceso"),
      done: uiText("fases.terminada"), completed: uiText("fases.terminada"), late: uiText("main.atrasada")
    })[status] || uiText("fases.sin_empezar");
  }
  function statusClass(status) { return `status-${status || 'sin-empezar'}`; }
  function initials(name) { return String(name || '?').trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase(); }
  function memberFor(project, name) { return (project.members || []).find(member => (typeof member === 'string' ? member : member.name) === name); }
  function avatarMarkup(user = getUser(), className = 'avatar') {
    const label = escapeHTML(initials(user.name || `${user.firstName} ${user.lastName}`));
    return `<span class="${className}" aria-label="${escapeHTML(user.name)}">${user.avatar ? `<img src="${escapeHTML(user.avatar)}" alt="">` : label}</span>`;
  }
  function relative(path) { return path; }
  function renderNavigation() {
    const holder = document.getElementById('main-nav');
    if (!holder) return;
    const page = document.body.dataset.page || '';
    const user = getUser();
    const active = value => page === value ? 'active' : '';
    holder.className = 'app-nav';
    holder.innerHTML = (`
      <div class="nav-inner">
        <a class="brand" href="/panel" aria-label="${uiText("main.studyflow_ir_al_inicio")}"><img class="brand-logo" src="/assets/img/studyflow-isotipo.png" width="40" height="40" alt="">StudyFlow</a>
        <button class="mobile-nav-toggle" type="button" aria-label="${uiText("main.abrir_navegacion")}" aria-expanded="false"><i class="bi bi-list"></i></button>
        <span class="nav-separador" aria-hidden="true"></span>
        <nav class="nav-links" aria-label="${uiText("catalogo_planes.navegacion_principal")}">
          <a class="nav-link ${active('dashboard')}" href="/panel"><i class="bi bi-grid-1x2"></i> <span>${uiText("main.inicio")}</span></a>
          <a class="nav-link ${['projects', 'project', "canales", 'fases', 'entregables', 'crear-proyecto'].includes(page) ? 'active' : ''}" href="/proyectos"><i class="bi bi-kanban"></i> <span>${uiText("perfil.proyectos")}</span></a>
          <a class="nav-link ${active('schedule')}" href="/horarios"><i class="bi bi-calendar3"></i> <span>${uiText("main.horarios")}</span></a>
          <a class="nav-link ${active('recordatorios')}" href="/recordatorios"><i class="bi bi-bell"></i> <span>${uiText("recordatorios.recordatorios")}</span></a>
        </nav>
        <span class="nav-separador" aria-hidden="true"></span>
        <div class="nav-actions">
          <button class="tema-boton" type="button" data-action="tema" aria-label="${uiText("login.cambiar_entre_modo_claro_y_oscuro")}">
            <i class="bi" aria-hidden="true"></i>
          </button>
          <a class="btn btn-primary btn-sm" href="/proyectos/nuevo"><i class="bi bi-plus-lg"></i> <span>${uiText("landing.proyecto")}</span></a>
          <div class="profile-menu">
            <button class="profile-trigger" type="button" aria-label="${uiText("main.abrir_menu_de_perfil")}" aria-expanded="false">${avatarMarkup(user, 'nav-avatar')}<i class="bi bi-chevron-down"></i></button>
            <div class="profile-dropdown">
              <a href="/perfil"><i class="bi bi-person-circle"></i>${" " + uiText("main.ver_mi_perfil")}</a>
              <a href="/perfil/editar"><i class="bi bi-sliders"></i>${" " + uiText("perfil.editar_perfil")}</a>
              <a href="/planes"><i class="bi bi-stars"></i>${" " + uiText("perfil.planes_y_precios")}</a>
              <a href="/mi-plan"><i class="bi bi-card-checklist"></i>${" " + uiText("main.mi_plan")}</a>
              <a href="/panel?recorrido=1"><i class="bi bi-question-circle"></i>${" " + uiText("main.recorrido_guiado")}</a>
              <a href="/login" data-action="sign-out"><i class="bi bi-box-arrow-right"></i>${" " + uiText("admin.cerrar_sesion")}</a>
            </div>
          </div>
        </div>
      </div>`);
    const menuButton = holder.querySelector('.mobile-nav-toggle');
    const links = holder.querySelector('.nav-links');
    holder.querySelectorAll('.nav-link').forEach(link => {
      link.setAttribute('aria-label', link.textContent.trim());
      link.querySelector('i')?.setAttribute('aria-hidden', 'true');
      if (link.classList.contains('active')) link.setAttribute('aria-current', 'page');
    });
    menuButton?.addEventListener('click', () => {
      const opened = links.classList.toggle('open');
      menuButton.setAttribute('aria-expanded', String(opened));
      if (opened) {
        holder.querySelector('.profile-menu')?.classList.remove('is-open');
        holder.querySelector('.profile-trigger')?.setAttribute('aria-expanded', 'false');
      }
    });
    holder.querySelector('.profile-trigger')?.addEventListener('click', event => {
      const trigger = event.currentTarget;
      const opened = trigger.getAttribute('aria-expanded') !== 'true';
      trigger.setAttribute('aria-expanded', String(opened));
      trigger.closest('.profile-menu').classList.toggle('is-open', opened);
      if (opened) {
        holder.querySelector('.nav-links')?.classList.remove('open');
        menuButton?.setAttribute('aria-expanded', 'false');
      }
    });
    /*
     * Cerrar sesión tiene que cerrarla también en el servidor. Antes solo
     * limpiaba localStorage: la sesión seguía abierta y, al volver a entrar,
     * la aplicación continuaba actuando en nombre de la persona anterior.
     */
    holder.querySelector('[data-action="sign-out"]')?.addEventListener('click', async event => {
      event.preventDefault();
      try {
        await scope.logout();
        navigate(ROUTES.login);
      } catch (_) {
        showToast(uiText("main.no_se_pudo_cerrar_sesion_intentalo_de_nuevo"), 'error');
      }
    });
    Tema.pintarBotones();
  }
  function showToast(title, message = '') {
    const tone = ['success', 'error', 'warning', 'info'].includes(message) ? message : 'success';
    if (['success', 'error', 'warning', 'info'].includes(message)) message = '';
    let stack = document.querySelector('.toast-stack');
    if (!stack) { stack = document.createElement('div'); stack.className = 'toast-stack'; scope.root.append(stack); }
    const toast = document.createElement('div');
    toast.className = 'toast';
    const icon = tone === 'error' || tone === 'warning' ? 'exclamation-circle' : tone === 'info' ? 'info-circle' : 'check2-circle';
    toast.setAttribute('role', tone === 'error' ? 'alert' : 'status');
    toast.innerHTML = `<i class="bi bi-${icon}" aria-hidden="true"></i><div><strong>${escapeHTML(title)}</strong>${message ? `<span>${escapeHTML(message)}</span>` : ''}</div>`;
    stack.append(toast);
    later(() => { toast.classList.add('out'); later(() => toast.remove(), 260); }, 3500);
  }
  function showModal(content) {
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.innerHTML = content;
    const close = () => backdrop.remove();
    backdrop.addEventListener('click', event => { if (event.target === backdrop) close(); });
    backdrop.querySelectorAll('[data-close-modal]').forEach(button => button.addEventListener('click', close));
    scope.root.append(backdrop);
    backdrop.querySelector('input, select, textarea, button')?.focus();
    return { element: backdrop, close };
  }
  function requireAuth() { return true; }

  scope.app = {
    KEYS, ROUTES, api, navigate, uid, getUser, saveUser, getProjects,
    saveProjects, getProject, updateProjectProgress, getProgress, escapeHTML, formatDate,
    statusLabel, statusClass, initials, memberFor, avatarMarkup, renderNavigation, showToast,
    showModal, requireAuth, relative, normalizarPerfil
  };

  /*
   * Cierra cualquier <dialog> al pulsar fuera de su contenido. El elemento
   * ocupa toda la pantalla con el fondo incluido, así que un clic cuyo destino
   * sea el propio diálogo (y no algo dentro de él) cae en esa zona. Escape ya
   * lo cierra de forma nativa.
   */
  function habilitarCierreAlPulsarFuera() {
    document.querySelectorAll('dialog').forEach(dialogo => {
      dialogo.addEventListener('click', evento => {
        if (evento.target === dialogo) dialogo.close();
      });
    });
  }

  {
    // La barra se dibuja primero: su botón de tema tiene que existir ya en el
    // DOM cuando se busquen todos para enlazarlos.
    if (document.getElementById('main-nav')) renderNavigation();
    // Se enlazan todos, no solo el de la barra: acceso, registro y la guía de
    // estilo no tienen barra superior y llevan el suyo suelto.
    Tema.pintarBotones();
    document.addEventListener('click', event => {
      if (event.target.closest('[data-action="tema"]')) Tema.aplicar(!Tema.esOscuro(), true);
      if (!event.target.closest('.profile-menu')) {
        document.querySelectorAll('.profile-menu.is-open').forEach(menu => {
          menu.classList.remove('is-open');
          menu.querySelector('.profile-trigger')?.setAttribute('aria-expanded', 'false');
        });
      }
    });
    document.addEventListener('keydown', event => {
      if (event.key !== 'Escape') return;
      document.querySelectorAll('.profile-menu.is-open').forEach(menu => {
        menu.classList.remove('is-open');
        const trigger = menu.querySelector('.profile-trigger');
        trigger?.setAttribute('aria-expanded', 'false'); trigger?.focus();
      });
    });
    listen(scope.root, 'studyflow:download-error', () => showToast(uiText("main.no_se_pudo_descargar_el_archivo"), 'error'));
    habilitarCierreAlPulsarFuera();
  }
}
