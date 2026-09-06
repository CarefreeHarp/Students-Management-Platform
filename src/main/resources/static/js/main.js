/* StudyFlow: capa temporal de datos. Sustituible por servicios/API en una futura etapa. */
(function () {
  'use strict';

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
        boton.title = oscuro ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro';
      });
    },

    enlazarBoton(boton) {
      if (!boton) return;
      boton.addEventListener('click', () => this.aplicar(!this.esOscuro(), true));
      this.pintarBotones();
    },

    seguirAlSistema() {
      if (!window.matchMedia) return;
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (evento) => {
        let elegido = null;
        try {
          elegido = localStorage.getItem(this.CLAVE);
        } catch (error) { /* sin almacenamiento, se sigue al sistema */ }
        if (!elegido) this.aplicar(evento.matches, false);
      });
    }
  };

  Tema.seguirAlSistema();

  /* Rutas servidas por la capa Controlador de Spring MVC. Centralizarlas aquí
     evita enlaces sueltos y facilita cambiar el enrutado en un solo punto. */
  const ROUTES = {
    dashboard: '/',
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
      demostracion: '/api/sesion/demostracion',
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
    const response = await fetch(path, {
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      ...options
    });
    if (!response.ok) throw new Error(`Error ${response.status} al llamar a ${path}`);
    return response.status === 204 ? null : response.json();
  }

  const demoUser = {
    firstName: 'Valentina', lastName: 'Rojas', name: 'Valentina Rojas',
    email: 'valentina.rojas@universidad.edu.co', age: '21',
    university: 'Universidad Nacional de Colombia', career: 'Ingeniería de Sistemas',
    semester: '6.º semestre', description: 'Diseño soluciones que hacen más fácil aprender, colaborar y crear.',
    avatar: ''
  };

  const demoProjects = [
    {
      id: 'proy-cogni', name: 'Cognitiva', description: 'Aplicación para visualizar hábitos de estudio y bienestar universitario.',
      dueDate: '2026-08-21', color: '#5b5ce2', stage: 'Desarrollo',
      members: [
        { name: 'Valentina Rojas', initials: 'VR', color: '#5b5ce2' },
        { name: 'Mateo Díaz', initials: 'MD', color: '#e2779b' },
        { name: 'Sara Gómez', initials: 'SG', color: '#2ca89b' }
      ],
      tasks: [
        { id: 'cog-1', title: 'Diseñar flujo de onboarding', description: 'Definir las pantallas y mensajes de bienvenida.', assignee: 'Valentina Rojas', dueDate: '2026-08-13', time: '09:00', status: 'progress', stage: 'Diseño' },
        { id: 'cog-2', title: 'Entrevistas a estudiantes', description: 'Sintetizar hallazgos de las entrevistas realizadas.', assignee: 'Mateo Díaz', dueDate: '2026-08-14', time: '11:00', status: 'pending', stage: 'Investigación' },
        { id: 'cog-3', title: 'Prototipo de analítica', description: 'Crear primera versión del tablero de hábitos.', assignee: 'Sara Gómez', dueDate: '2026-08-15', time: '14:00', status: 'pending', stage: 'Desarrollo' },
        { id: 'cog-4', title: 'Presentación de avance', description: 'Preparar demo y narrativa para la revisión.', assignee: 'Valentina Rojas', dueDate: '2026-08-19', time: '10:00', status: 'done', stage: 'Entrega' }
      ]
    },
    {
      id: 'proy-redes', name: 'Redes inteligentes', description: 'Propuesta de optimización para una red de sensores del campus.',
      dueDate: '2026-08-28', color: '#1ba7ba', stage: 'Investigación',
      members: [
        { name: 'Valentina Rojas', initials: 'VR', color: '#5b5ce2' },
        { name: 'Daniela Ruiz', initials: 'DR', color: '#f0a33f' }
      ],
      tasks: [
        { id: 'red-1', title: 'Mapa de actores', description: 'Identificar usuarios, áreas y responsables involucrados.', assignee: 'Daniela Ruiz', dueDate: '2026-08-13', time: '13:00', status: 'progress', stage: 'Investigación' },
        { id: 'red-2', title: 'Modelo de datos', description: 'Definir entidades y métricas del sistema de sensores.', assignee: 'Valentina Rojas', dueDate: '2026-08-16', time: '08:00', status: 'pending', stage: 'Planeación' },
        { id: 'red-3', title: 'Revisar bibliografía', description: 'Organizar fuentes y referencias principales.', assignee: 'Valentina Rojas', dueDate: '2026-08-18', time: '15:00', status: 'done', stage: 'Investigación' }
      ]
    },
    {
      id: 'proy-ux', name: 'Laboratorio UX', description: 'Rediseño colaborativo de la experiencia de préstamo de equipos.',
      dueDate: '2026-09-04', color: '#dc7194', stage: 'Planeación',
      members: [
        { name: 'Valentina Rojas', initials: 'VR', color: '#5b5ce2' },
        { name: 'Nicolás Vega', initials: 'NV', color: '#7c76d9' },
        { name: 'Sara Gómez', initials: 'SG', color: '#2ca89b' }
      ],
      tasks: [
        { id: 'ux-1', title: 'Auditoría de interfaz', description: 'Registrar hallazgos de accesibilidad y experiencia.', assignee: 'Nicolás Vega', dueDate: '2026-08-17', time: '10:00', status: 'pending', stage: 'Diagnóstico' },
        { id: 'ux-2', title: 'Organizar pruebas de uso', description: 'Convocar estudiantes y preparar guion de pruebas.', assignee: 'Sara Gómez', dueDate: '2026-08-20', time: '14:00', status: 'pending', stage: 'Investigación' }
      ]
    }
  ];

  function clone(data) { return JSON.parse(JSON.stringify(data)); }
  function read(key, fallback) {
    try { const stored = localStorage.getItem(key); return stored ? JSON.parse(stored) : fallback; }
    catch (_) { return fallback; }
  }
  function write(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
  function uid(prefix = 'item') { return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`; }
  function normalizeUser(user) {
    const result = { ...demoUser, ...(user || {}) };
    result.name = result.name || `${result.firstName || ''} ${result.lastName || ''}`.trim() || demoUser.name;
    return result;
  }
  function getUser() { return normalizeUser(read(KEYS.user, demoUser)); }
  function saveUser(user) { write(KEYS.user, normalizeUser(user)); }
  function getProjects() {
    const projects = read(KEYS.projects, null);
    return Array.isArray(projects) && projects.length ? projects : clone(demoProjects);
  }
  function saveProjects(projects) { write(KEYS.projects, projects); }
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
    if (!date) return 'Sin fecha';
    const parsed = new Date(`${date}T12:00:00`);
    if (Number.isNaN(parsed.getTime())) return date;
    return new Intl.DateTimeFormat('es-CO', options).format(parsed).replace('.', '');
  }
  /* Etiquetas de estado. Se admiten los cuatro estados actuales y los nombres
     antiguos, porque las pantallas que aún leen localStorage guardan los viejos. */
  function statusLabel(status) {
    return ({
      'sin-empezar': 'Sin empezar', 'en-proceso': 'En proceso',
      'en-revision': 'En revisión', 'terminada': 'Terminada',
      pending: 'Sin empezar', progress: 'En proceso', 'in-progress': 'En proceso',
      done: 'Terminada', completed: 'Terminada', late: 'Atrasada'
    })[status] || 'Sin empezar';
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
    holder.innerHTML = `
      <div class="nav-inner">
        <a class="brand" href="/panel" aria-label="StudyFlow, ir al inicio"><span class="brand-mark"><i class="bi bi-lightning-charge-fill"></i></span>StudyFlow</a>
        <button class="mobile-nav-toggle" type="button" aria-label="Abrir navegación" aria-expanded="false"><i class="bi bi-list"></i></button>
        <span class="nav-separador" aria-hidden="true"></span>
        <nav class="nav-links" aria-label="Navegación principal">
          <a class="nav-link ${active('dashboard')}" href="/panel"><i class="bi bi-grid-1x2"></i> <span>Inicio</span></a>
          <a class="nav-link ${active('projects') || active('project') ? 'active' : ''}" href="/proyectos"><i class="bi bi-kanban"></i> <span>Proyectos</span></a>
          <a class="nav-link ${active('schedule')}" href="/horarios"><i class="bi bi-calendar3"></i> <span>Horarios</span></a>
          <a class="nav-link ${active('chats') || active('canales') ? 'active' : ''}" href="/chats"><i class="bi bi-chat-dots"></i> <span>Canales</span></a>
          <a class="nav-link ${active('recordatorios')}" href="/recordatorios"><i class="bi bi-bell"></i> <span>Recordatorios</span></a>
        </nav>
        <span class="nav-separador" aria-hidden="true"></span>
        <div class="nav-actions">
          <button class="tema-boton" type="button" data-action="tema" aria-label="Cambiar entre modo claro y oscuro">
            <i class="bi" aria-hidden="true"></i>
          </button>
          <a class="btn btn-primary btn-sm" href="/proyectos/nuevo"><i class="bi bi-plus-lg"></i> <span>Proyecto</span></a>
          <div class="profile-menu">
            <button class="profile-trigger" type="button" aria-label="Abrir menú de perfil">${avatarMarkup(user, 'nav-avatar')}<i class="bi bi-chevron-down"></i></button>
            <div class="profile-dropdown">
              <a href="/perfil"><i class="bi bi-person-circle"></i> Ver mi perfil</a>
              <a href="/perfil/editar"><i class="bi bi-sliders"></i> Editar perfil</a>
              <a href="/login" data-action="sign-out"><i class="bi bi-box-arrow-right"></i> Cerrar sesión</a>
            </div>
          </div>
        </div>
      </div>`;
    const menuButton = holder.querySelector('.mobile-nav-toggle');
    const links = holder.querySelector('.nav-links');
    menuButton?.addEventListener('click', () => {
      const opened = links.classList.toggle('open');
      menuButton.setAttribute('aria-expanded', String(opened));
    });
    /*
     * Cerrar sesión tiene que cerrarla también en el servidor. Antes solo
     * limpiaba localStorage: la sesión seguía abierta y, al volver a entrar,
     * la aplicación continuaba actuando en nombre de la persona anterior.
     */
    holder.querySelector('[data-action="sign-out"]')?.addEventListener('click', async event => {
      event.preventDefault();
      localStorage.removeItem(KEYS.session);
      try {
        await fetch(ROUTES.api.salir, { method: 'POST' });
      } catch (_) {
        // Aunque falle la llamada, se lleva a la pantalla de acceso.
      }
      window.location.assign(ROUTES.login);
    });
  }
  function showToast(title, message = '') {
    let stack = document.querySelector('.toast-stack');
    if (!stack) { stack = document.createElement('div'); stack.className = 'toast-stack'; document.body.append(stack); }
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<i class="bi bi-check2-circle"></i><div><strong>${escapeHTML(title)}</strong>${message ? `<span>${escapeHTML(message)}</span>` : ''}</div>`;
    stack.append(toast);
    setTimeout(() => { toast.classList.add('out'); setTimeout(() => toast.remove(), 260); }, 3500);
  }
  function showModal(content) {
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.innerHTML = content;
    const close = () => backdrop.remove();
    backdrop.addEventListener('click', event => { if (event.target === backdrop) close(); });
    backdrop.querySelectorAll('[data-close-modal]').forEach(button => button.addEventListener('click', close));
    document.body.append(backdrop);
    backdrop.querySelector('input, select, textarea, button')?.focus();
    return { element: backdrop, close };
  }
  function requireAuth() { return true; }
  function resetDemoData() { localStorage.removeItem(KEYS.projects); localStorage.removeItem(KEYS.user); }

  window.App = {
    KEYS, ROUTES, api, demoProjects: clone(demoProjects), demoUser: clone(demoUser), uid, getUser, saveUser, getProjects,
    saveProjects, getProject, updateProjectProgress, getProgress, escapeHTML, formatDate,
    statusLabel, statusClass, initials, memberFor, avatarMarkup, renderNavigation, showToast,
    showModal, requireAuth, resetDemoData, relative
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

  document.addEventListener('DOMContentLoaded', () => {
    // La barra se dibuja primero: su botón de tema tiene que existir ya en el
    // DOM cuando se busquen todos para enlazarlos.
    if (document.getElementById('main-nav')) renderNavigation();
    // Se enlazan todos, no solo el de la barra: acceso, registro y la guía de
    // estilo no tienen barra superior y llevan el suyo suelto.
    document.querySelectorAll('[data-action="tema"]').forEach((boton) => Tema.enlazarBoton(boton));
    habilitarCierreAlPulsarFuera();
  });
})();
