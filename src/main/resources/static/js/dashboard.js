(() => {
  "use strict";

  const app = window.App || {};
  const esc = app.escapeHTML || ((valor) => String(valor ?? ""));
  const DIAS = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"];
  const DIAS_CORTOS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
  const CLASE = "#6956b8";
  const TIPOS = { clase: "Clase", tarea: "Tarea", entregable: "Entregable", proyecto: "Entrega de proyecto" };

  let proyectos = [];
  let agenda = { horario: null, entregables: [] };
  /* Semanas de desplazamiento respecto a la que toca por defecto. */
  let desplazamiento = 0;
  const $ = (selector) => document.querySelector(selector);

  async function pedir(url, opciones = {}) {
    const respuesta = await fetch(url, { headers: { "Content-Type": "application/json" }, ...opciones });
    // Sesión perdida o caducada: se vuelve al acceso en lugar de fallar a medias.
    if (respuesta.status === 401) {
      app.navigate("/login");
      throw new Error("Tu sesión terminó. Vuelve a entrar.");
    }
    if (!respuesta.ok) {
      const detalle = await respuesta.json().catch(() => ({}));
      throw new Error(detalle.detail || `Error ${respuesta.status}`);
    }
    return respuesta.status === 204 ? null : respuesta.json();
  }

  const iso = (fecha) => [fecha.getFullYear(), ...[fecha.getMonth() + 1, fecha.getDate()]
    .map((valor) => String(valor).padStart(2, "0"))].join("-");
  const fechaLarga = new Intl.DateTimeFormat("es-CO", { weekday: "long", day: "numeric", month: "short" });
  const fechaSemana = new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short", year: "numeric" });
  const horaCorta = (hora) => hora ? hora.slice(0, 5) : "";
  const urlProyecto = (proyecto) => `/proyectos/${encodeURIComponent(proyecto.codigo)}`;

  function todasLasTareas() {
    return proyectos.flatMap((proyecto) => proyecto.tareas.map((tarea) => ({ ...tarea, proyecto })));
  }

  function semanaActual() {
    const lunes = new Date();
    lunes.setHours(12, 0, 0, 0);
    lunes.setDate(lunes.getDate() - ((lunes.getDay() + 6) % 7) + desplazamiento * 7);
    return DIAS.map((_, indice) => {
      const fecha = new Date(lunes);
      fecha.setDate(lunes.getDate() + indice);
      return fecha;
    });
  }

  function clasesGuardadas() {
    if (window.SandboxBridge) {
      try {
        const guardado = JSON.parse(window.localStorage.getItem("atempo.selectedSchedule"));
        return (guardado?.courses || []).map(c => ({ titulo: c.name, dia: c.day, hora: c.start, fin: c.end }));
      } catch (_) {
        return [];
      }
    }
    return (agenda.horario?.materias || []).flatMap(materia => materia.bloques.map(bloque => ({
      titulo: materia.nombre, dia: bloque.dia, hora: bloque.horaInicio, fin: bloque.horaFin, detalle: bloque.aula,
    })));
  }

  function eventosDeSemana(dias) {
    const fechas = dias.map(iso);
    const porCodigo = new Map(proyectos.map(p => [p.codigo, p]));
    const clases = clasesGuardadas().map(clase => ({
      ...clase, tipo: "clase", fecha: fechas[DIAS.indexOf(clase.dia)], href: "/horarios", color: CLASE,
    }));
    const tareas = todasLasTareas().filter(t => t.fechaLimite).map(t => ({
      tipo: "tarea", titulo: t.titulo, fecha: t.fechaLimite, hora: horaCorta(t.horaLimite),
      href: urlProyecto(t.proyecto), proyecto: t.proyecto.nombre, color: t.proyecto.color,
      detalle: t.responsable, estado: t.estadoEtiqueta, terminada: t.estado === "terminada",
    }));
    const entregas = agenda.entregables.filter(e => porCodigo.has(e.proyectoCodigo)).map(e => {
      const proyecto = porCodigo.get(e.proyectoCodigo);
      return {
        tipo: "entregable", titulo: e.titulo, fecha: e.fecha, hora: horaCorta(e.hora),
        href: `${urlProyecto(proyecto)}/entregables#entregable-${encodeURIComponent(e.id)}`,
        proyecto: proyecto.nombre, color: proyecto.color, estado: e.estado,
      };
    });
    const cierres = proyectos.filter(p => p.fechaEntrega).map(p => ({
      tipo: "proyecto", titulo: p.nombre, fecha: p.fechaEntrega, href: urlProyecto(p), color: p.color,
    }));
    return [...clases, ...tareas, ...entregas, ...cierres].filter(e => fechas.includes(e.fecha));
  }

  function pintarEvento(evento, movil = false) {
    const horario = evento.hora ? [evento.hora, evento.fin].filter(Boolean).join("–") : "Todo el día";
    const descripcion = [TIPOS[evento.tipo], horario, evento.proyecto, evento.detalle, evento.estado].filter(Boolean).join(" · ");
    const etiqueta = evento.tipo === "proyecto" ? TIPOS.proyecto : [TIPOS[evento.tipo], horario].join(" · ");
    const color = /^#[a-f0-9]{6}$/i.test(evento.color || "") ? evento.color : "#5b5ce2";
    const clase = movil ? "dashboard-agenda-task" : "calendar-event";
    return `<a class="${clase}${evento.terminada ? " esta-terminada" : ""}" href="${esc(evento.href)}"
      data-tipo="${evento.tipo}" data-detalle="${esc(descripcion)}" style="--event-color:${color}"
      aria-label="${esc(evento.titulo + ' · ' + descripcion)}">
      ${movil ? `<strong>${esc(evento.titulo)}</strong><span>${esc(descripcion)}</span>`
        : `${esc(evento.titulo)}<small>${esc(etiqueta)}</small>`}
    </a>`;
  }

  function enlazarDetalle(enlace) {
    let detalle;
    function ocultar() {
      detalle?.remove();
      detalle = null;
    }
    function mostrar() {
      ocultar();
      detalle = document.createElement("div");
      detalle.className = "calendar-popover";
      detalle.setAttribute("aria-hidden", "true");
      detalle.textContent = enlace.dataset.detalle;
      document.body.append(detalle);
      const marco = enlace.getBoundingClientRect();
      detalle.style.left = `${Math.max(8, Math.min(marco.left, window.innerWidth - detalle.offsetWidth - 8))}px`;
      detalle.style.top = `${Math.max(8, Math.min(marco.bottom + 8, window.innerHeight - detalle.offsetHeight - 8))}px`;
    }
    enlace.addEventListener("mouseenter", mostrar);
    enlace.addEventListener("focus", mostrar);
    enlace.addEventListener("mouseleave", ocultar);
    enlace.addEventListener("blur", ocultar);
  }

  function pintarCalendario() {
    const dias = semanaActual();
    const hoy = iso(new Date());
    const porDia = new Map(dias.map(fecha => [iso(fecha), []]));
    eventosDeSemana(dias).forEach(evento => porDia.get(evento.fecha).push(evento));
    porDia.forEach(eventos => eventos.sort((a, b) => (a.hora || "").localeCompare(b.hora || "")
      || a.titulo.localeCompare(b.titulo, "es")));

    const encabezado = `<div class="calendar-toolbar">
        <h3>${fechaSemana.formatRange(dias[0], dias.at(-1))}</h3>
        <div class="calendar-actions">
          <button class="calendar-button" type="button" data-semana="-1" aria-label="Semana anterior"><i class="bi bi-chevron-left" aria-hidden="true"></i></button>
          <button class="calendar-button w-auto px-2 text-[11px] font-bold" type="button" data-semana="0">Hoy</button>
          <button class="calendar-button" type="button" data-semana="1" aria-label="Semana siguiente"><i class="bi bi-chevron-right" aria-hidden="true"></i></button>
        </div>
      </div>`;

    let rejilla = '<div class="calendar-grid agenda-unificada-grid"><div class="calendar-corner"></div>';
    dias.forEach((fecha, i) => {
      rejilla += `<div class="calendar-day-head${iso(fecha) === hoy ? " today" : ""}">${DIAS_CORTOS[i]}<strong>${fecha.getDate()}</strong></div>`;
    });
    const horas = [...porDia.values()].flat().filter(e => e.hora)
      .map(e => Number(e.hora.slice(0, 2)));
    const primera = Math.min(8, ...horas);
    const ultima = Math.max(16, ...horas);
    const bandas = Array.from({ length: Math.floor((ultima - primera) / 2) + 1 },
      (_, i) => `${String(primera + i * 2).padStart(2, "0")}:00`);
    ["", ...bandas].forEach((banda, indice) => {
      const siguiente = bandas[indice] || "24:00";
      rejilla += `<div class="calendar-hour">${banda || "Todo el día"}</div>`;
      porDia.forEach(eventos => {
        const enBanda = eventos.filter(e => banda ? e.hora >= banda && e.hora < siguiente : !e.hora);
        rejilla += `<div class="calendar-slot">${enBanda.map(e => pintarEvento(e)).join("")}</div>`;
      });
    });
    rejilla += "</div>";

    const lista = dias.map(fecha => {
      const dia = iso(fecha);
      const eventos = porDia.get(dia);
      const titulo = fechaLarga.format(fecha);
      return `<section class="dashboard-agenda-day${dia === hoy ? " is-today" : ""}" aria-label="${esc(titulo)}">
        <h3>${esc(titulo)}${dia === hoy ? " · Hoy" : ""}</h3>
        ${eventos.length ? `<ul>${eventos.map(e => `<li>${pintarEvento(e, true)}</li>`).join("")}</ul>`
          : '<p class="dashboard-agenda-empty">Sin eventos.</p>'}
      </section>`;
    }).join("");

    const calendario = $("#dashboard-calendar");
    document.querySelectorAll(".calendar-popover").forEach(detalle => detalle.remove());
    calendario.innerHTML = `<div class="calendar-shell">${encabezado}
      <div class="week-calendar" tabindex="0" role="region" aria-label="Calendario semanal desplazable">${rejilla}</div>
      <div class="dashboard-agenda" aria-label="Agenda de la semana">${lista}</div></div>`;
    calendario.querySelectorAll(".calendar-event").forEach(enlazarDetalle);
    calendario.querySelectorAll("[data-semana]").forEach(boton => {
      boton.addEventListener("click", () => {
        const paso = Number(boton.dataset.semana);
        desplazamiento = paso === 0 ? 0 : desplazamiento + paso;
        pintarCalendario();
        calendario.querySelector(`[data-semana="${paso}"]`).focus();
      });
    });
  }

  function pintarResumen(tareas) {
    const pendientes = tareas.filter((tarea) => tarea.estado !== "terminada");
    $("#pending-count").textContent =
      `${pendientes.length} tarea${pendientes.length === 1 ? " pendiente" : "s pendientes"}`;

    $("#project-legend").innerHTML = proyectos.slice(0, 4).map((proyecto) =>
      `<span class="legend-item"><i class="legend-dot" style="--legend-color:${esc(proyecto.color)}"></i>${esc(proyecto.nombre)}</span>`
    ).join("");

    const activos = proyectos.filter((proyecto) => proyecto.progreso < 100);
    $("#project-snapshot-list").innerHTML = activos.map((proyecto) => {
      const porHacer = proyecto.tareas.filter((tarea) => tarea.estado !== "terminada")
        .sort((a, b) => (a.fechaLimite || "9999").localeCompare(b.fechaLimite || "9999"));
      const progreso = Math.max(0, Math.min(100, Number(proyecto.progreso) || 0));
      const url = `/proyectos/${encodeURIComponent(proyecto.codigo)}`;
      return `<article class="overview-project">
        <div class="overview-project-heading">
          <a href="${url}">${esc(proyecto.nombre)}</a>
          <strong>${progreso}%</strong>
        </div>
        <div class="progress-track" role="progressbar" aria-label="Avance de ${esc(proyecto.nombre)}" aria-valuenow="${progreso}" aria-valuemin="0" aria-valuemax="100"><span class="progress-fill" style="--progress:${progreso}%"></span></div>
        <p class="overview-pending-label">${porHacer.length ? `${porHacer.length} tarea${porHacer.length === 1 ? " pendiente" : "s pendientes"}` : "Aún no hay tareas pendientes"}</p>
        ${porHacer.length ? `<ul class="overview-pending-tasks">${porHacer.slice(0, 2).map((tarea) => `<li><a href="${url}">${esc(tarea.titulo)}</a></li>`).join("")}</ul>` : ""}
        ${porHacer.length > 2 ? `<a class="overview-more" href="${url}">Ver ${porHacer.length - 2} pendiente${porHacer.length - 2 === 1 ? " más" : "s más"} <i class="bi bi-arrow-right" aria-hidden="true"></i></a>` : ""}
      </article>`;
    }).join("") || (proyectos.length
      ? '<p class="text-muted">Tus proyectos están al día.</p><a class="text-action" href="/proyectos">Ver proyectos finalizados <i class="bi bi-arrow-right" aria-hidden="true"></i></a>'
      : '<p class="text-muted">Todavía no tienes proyectos. Crea uno para organizar tus tareas.</p><a class="text-action" href="/proyectos/nuevo">Crear proyecto <i class="bi bi-arrow-right" aria-hidden="true"></i></a>');
  }

  async function cargar() {
    const [proyectosCargados, agendaCargada] = await Promise.allSettled([pedir("/api/proyectos"), pedir("/api/agenda")]);
    if (proyectosCargados.status === "rejected") throw proyectosCargados.reason;
    proyectos = proyectosCargados.value;
    if (agendaCargada.status === "fulfilled") agenda = agendaCargada.value;
    const estado = $("#dashboard-agenda-status");
    if (agendaCargada.status === "rejected") estado.textContent = "Por ahora se muestran las tareas y las fechas de proyecto.";
    pintarResumen(todasLasTareas());
    pintarCalendario();
  }

  async function init() {
    if (typeof app.renderNavigation === "function") app.renderNavigation();
    $("#dashboard-date").textContent = new Intl.DateTimeFormat("es-CO",
      { weekday: "long", day: "numeric", month: "long" }).format(new Date());

    try {
      const sesion = await pedir("/api/sesion/actual");
      document.querySelectorAll("[data-user-first-name]").forEach((nodo) => {
        nodo.textContent = sesion.usuario.nombre;
      });
      await cargar();
    } catch (error) {
      $("#pending-count").textContent = "No se pudieron cargar los pendientes.";
      $("#dashboard-calendar").innerHTML =
        `<p class="text-[13px] text-danger">No se pudo cargar la agenda. ${esc(error.message)}</p>`;
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
