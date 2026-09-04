/*
 * Panel principal. Consume la API REST: el calendario muestra las tareas reales
 * de todos los proyectos y al pulsarlas abre el proyecto correspondiente.
 */
(() => {
  "use strict";

  const app = window.App || {};
  const esc = app.escapeHTML || ((valor) => String(valor ?? ""));
  const BANDAS = ["08:00", "10:00", "12:00", "14:00", "16:00"];
  const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie"];

  let proyectos = [];
  /* Semanas de desplazamiento respecto a la que toca por defecto. */
  let desplazamiento = 0;
  const $ = (selector) => document.querySelector(selector);

  async function pedir(url, opciones = {}) {
    const respuesta = await fetch(url, { headers: { "Content-Type": "application/json" }, ...opciones });
    // Sesión perdida o caducada: se vuelve al acceso en lugar de fallar a medias.
    if (respuesta.status === 401) {
      window.location.assign("/login");
      throw new Error("Tu sesión terminó. Vuelve a entrar.");
    }
    if (!respuesta.ok) {
      const detalle = await respuesta.json().catch(() => ({}));
      throw new Error(detalle.detail || `Error ${respuesta.status}`);
    }
    return respuesta.status === 204 ? null : respuesta.json();
  }

  const iso = (fecha) => fecha.toISOString().slice(0, 10);

  function fechaCorta(valor) {
    if (!valor) return "Sin fecha";
    const fecha = new Date(`${valor}T12:00:00`);
    return Number.isNaN(fecha.getTime())
      ? valor
      : new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short" }).format(fecha).replace(".", "");
  }

  /** Todas las tareas, cada una con el proyecto al que pertenece. */
  function todasLasTareas() {
    return proyectos.flatMap((proyecto) =>
      proyecto.tareas.map((tarea) => ({ ...tarea, proyecto })));
  }

  /** Lunes de la semana con más carga; si no hay tareas, la de hoy. */
  function inicioSemana(tareas) {
    const pendientes = tareas.filter((tarea) => tarea.fechaLimite && tarea.estado !== "terminada")
      .map((tarea) => tarea.fechaLimite).sort();
    const referencia = pendientes.length ? new Date(`${pendientes[0]}T12:00:00`) : new Date();
    referencia.setDate(referencia.getDate() - ((referencia.getDay() + 6) % 7) + desplazamiento * 7);
    return referencia;
  }

  function pintarCalendario(tareas) {
    const lunes = inicioSemana(tareas);
    const dias = Array.from({ length: 5 }, (_, i) => {
      const fecha = new Date(lunes);
      fecha.setDate(lunes.getDate() + i);
      return fecha;
    });
    const hoy = iso(new Date());

    const encabezado = `<div class="calendar-toolbar">
        <h2>Semana del ${dias[0].getDate()} al ${dias[4].getDate()} de ${new Intl.DateTimeFormat("es-CO", { month: "long" }).format(dias[4])}</h2>
        <div class="calendar-actions">
          <button class="calendar-button" type="button" data-semana="-1" aria-label="Semana anterior"><i class="bi bi-chevron-left"></i></button>
          ${desplazamiento !== 0 ? '<button class="calendar-button w-auto px-2 text-[11px] font-bold" type="button" data-semana="0">Hoy</button>' : ""}
          <button class="calendar-button" type="button" data-semana="1" aria-label="Semana siguiente"><i class="bi bi-chevron-right"></i></button>
        </div>
      </div>`;

    let rejilla = '<div class="calendar-grid"><div class="calendar-corner"></div>';
    dias.forEach((fecha, i) => {
      rejilla += `<div class="calendar-day-head${iso(fecha) === hoy ? " today" : ""}">${DIAS[i]}<strong>${fecha.getDate()}</strong></div>`;
    });

    BANDAS.forEach((banda, indice) => {
      const siguiente = BANDAS[indice + 1] || "23:59";
      rejilla += `<div class="calendar-hour">${banda}</div>`;
      dias.forEach((fecha) => {
        const dia = iso(fecha);
        const enBanda = tareas.filter((tarea) => {
          if (tarea.fechaLimite !== dia) return false;
          const hora = tarea.horaLimite || "09:00";
          return hora >= banda && hora < siguiente;
        });
        rejilla += `<div class="calendar-slot">${enBanda.map(evento).join("")}</div>`;
      });
    });
    rejilla += "</div>";

    $("#dashboard-calendar").innerHTML =
      `<div class="calendar-shell">${encabezado}<div class="week-calendar">${rejilla}</div></div>`;

    $("#dashboard-calendar").querySelectorAll(".calendar-event").forEach(enlazarVentana);

    // Navegación entre semanas: una tarea terminada deja de ser lo próximo,
    // pero sigue en su fecha, así que hay que poder moverse por el calendario.
    $("#dashboard-calendar").querySelectorAll("[data-semana]").forEach((boton) => {
      boton.addEventListener("click", () => {
        const paso = Number(boton.dataset.semana);
        desplazamiento = paso === 0 ? 0 : desplazamiento + paso;
        pintarCalendario(todasLasTareas());
      });
    });
  }

  function evento(tarea) {
    const datos = encodeURIComponent(JSON.stringify({
      titulo: tarea.titulo,
      proyecto: tarea.proyecto.nombre,
      responsable: tarea.responsable,
      fecha: tarea.fechaLimite,
      estado: tarea.estadoEtiqueta
    }));
    const terminada = tarea.estado === "terminada" ? " esta-terminada" : "";
    return `<a class="calendar-event${terminada}" href="/proyectos/${encodeURIComponent(tarea.proyecto.codigo)}"
              data-task="${datos}" style="--event-color:${esc(tarea.proyecto.color || "#5b5ce2")}">
        ${esc(tarea.titulo)}<small>${esc(tarea.proyecto.nombre)}</small>
      </a>`;
  }

  /** Ventana flotante al pasar el ratón o al enfocar con el teclado. */
  function enlazarVentana(elemento) {
    let ventana;
    const mostrar = () => {
      const tarea = JSON.parse(decodeURIComponent(elemento.dataset.task));
      ventana = document.createElement("div");
      ventana.className = "calendar-popover";
      ventana.innerHTML = `<strong>${esc(tarea.titulo)}</strong>
        <p><i class="bi bi-kanban"></i>${esc(tarea.proyecto)}</p>
        <p><i class="bi bi-person"></i>${esc(tarea.responsable || "Sin responsable")}</p>
        <p><i class="bi bi-calendar3"></i>${esc(fechaCorta(tarea.fecha))} · ${esc(tarea.estado)}</p>`;
      document.body.append(ventana);

      const marco = elemento.getBoundingClientRect();
      const izquierda = Math.min(window.innerWidth - 250, Math.max(12, marco.left));
      const arriba = marco.bottom + 8 > window.innerHeight - 120
        ? marco.top - ventana.offsetHeight - 8
        : marco.bottom + 8;
      ventana.style.left = `${izquierda}px`;
      ventana.style.top = `${Math.max(8, arriba)}px`;
    };
    const ocultar = () => { ventana?.remove(); ventana = null; };

    elemento.addEventListener("mouseenter", mostrar);
    elemento.addEventListener("mouseleave", ocultar);
    elemento.addEventListener("focus", mostrar);
    elemento.addEventListener("blur", ocultar);
  }

  function pintarResumen(tareas) {
    const pendientes = tareas.filter((tarea) => tarea.estado !== "terminada");
    const terminadas = tareas.length - pendientes.length;
    const porcentaje = tareas.length ? Math.round((terminadas / tareas.length) * 100) : 0;

    $("#pending-count").textContent =
      `${pendientes.length} tarea${pendientes.length === 1 ? "" : "s"} pendientes`;
    $("#completion-score").textContent = `${porcentaje}%`;
    $("#completion-progress").style.setProperty("--progress", `${porcentaje}%`);
    $("#completion-caption").textContent = porcentaje >= 60
      ? "¡Vas muy bien esta semana!"
      : "Cada pequeña tarea cuenta.";

    $("#project-legend").innerHTML = proyectos.slice(0, 4).map((proyecto) =>
      `<span class="legend-item"><i class="legend-dot" style="--legend-color:${esc(proyecto.color)}"></i>${esc(proyecto.nombre)}</span>`
    ).join("");

    $("#upcoming-tasks").innerHTML = pendientes
      .filter((tarea) => tarea.fechaLimite)
      .sort((a, b) => a.fechaLimite.localeCompare(b.fechaLimite))
      .slice(0, 4)
      .map((tarea) => `<div class="upcoming-task">
          <i class="upcoming-color" style="--task-color:${esc(tarea.proyecto.color)}"></i>
          <div>
            <a href="/proyectos/${encodeURIComponent(tarea.proyecto.codigo)}">${esc(tarea.titulo)}</a>
            <span>${esc(tarea.proyecto.nombre)} · ${esc(fechaCorta(tarea.fechaLimite))}</span>
          </div>
        </div>`).join("") || '<p class="muted">No hay tareas próximas.</p>';

    $("#project-snapshot-list").innerHTML = proyectos.slice(0, 3).map((proyecto) =>
      `<div class="snapshot-row">
        <i class="snapshot-line" style="--project-color:${esc(proyecto.color)}"></i>
        <div>
          <a href="/proyectos/${encodeURIComponent(proyecto.codigo)}">${esc(proyecto.nombre)}</a>
          <small>Entrega ${esc(fechaCorta(proyecto.fechaEntrega))}</small>
        </div>
        <span class="snapshot-percent">${proyecto.progreso}%</span>
      </div>`).join("") || '<p class="muted">Crea tu primer proyecto.</p>';
  }

  /** Formulario para registrar una tarea terminada con su nota de avance. */
  function abrirFormularioCierre() {
    const pendientes = todasLasTareas().filter((tarea) => tarea.estado !== "terminada");
    if (!pendientes.length) {
      if (typeof app.showToast === "function") {
        app.showToast("Todo al día", "No tienes tareas pendientes para marcar.");
      }
      return;
    }

    const modal = app.showModal(`<section class="modal" role="dialog" aria-modal="true" aria-labelledby="complete-modal-title">
        <div class="modal-header">
          <h2 id="complete-modal-title">Registrar tarea terminada</h2>
          <button class="modal-close" type="button" data-close-modal aria-label="Cerrar"><i class="bi bi-x-lg"></i></button>
        </div>
        <form id="complete-task-form">
          <div class="modal-body">
            <div class="form-group">
              <label for="completed-task">¿Qué tarea terminaste?</label>
              <select id="completed-task" required>
                ${pendientes.map((tarea) =>
                  `<option value="${tarea.id}">${esc(tarea.titulo)} — ${esc(tarea.proyecto.nombre)}</option>`).join("")}
              </select>
            </div>
            <div class="form-group" style="margin-top:14px">
              <label for="complete-note">Nota de avance <span class="muted">(opcional)</span></label>
              <textarea id="complete-note" placeholder="¿Qué quedó listo?"></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" type="button" data-close-modal>Cancelar</button>
            <button class="btn btn-primary" type="submit"><i class="bi bi-check2"></i> Marcar terminada</button>
          </div>
        </form>
      </section>`);

    modal.element.querySelector("#complete-task-form").addEventListener("submit", async (evento) => {
      evento.preventDefault();
      const id = modal.element.querySelector("#completed-task").value;
      const nota = modal.element.querySelector("#complete-note").value.trim();
      try {
        await pedir(`/api/tareas/${id}/completar`, {
          method: "PATCH",
          body: JSON.stringify({ nota })
        });
        modal.close();
        await cargar();
        if (typeof app.showToast === "function") app.showToast("¡Avance registrado!");
      } catch (error) {
        if (typeof app.showToast === "function") app.showToast(error.message, "error");
      }
    });
  }

  async function cargar() {
    proyectos = await pedir("/api/proyectos");
    const tareas = todasLasTareas();
    pintarResumen(tareas);
    pintarCalendario(tareas);
  }

  async function init() {
    if (typeof app.renderNavigation === "function") app.renderNavigation();

    $("#dashboard-date").textContent = new Intl.DateTimeFormat("es-CO",
      { weekday: "long", day: "numeric", month: "long" }).format(new Date());

    $("#open-complete-task").addEventListener("click", abrirFormularioCierre);

    try {
      const sesion = await pedir("/api/sesion/actual");
      document.querySelectorAll("[data-user-first-name]").forEach((nodo) => {
        nodo.textContent = sesion.usuario.nombre;
      });
      await cargar();
    } catch (error) {
      $("#dashboard-calendar").innerHTML =
        `<p class="text-[13px] text-danger">No se pudo cargar la agenda: ${esc(error.message)}</p>`;
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
