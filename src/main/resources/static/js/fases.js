/*
 * Diagrama de fases del proyecto.
 * Columnas por etapa, dependencias entre tareas, reparto voluntario y los
 * cuatro estados: sin empezar, en proceso, en revisión y terminada.
 */
(() => {
  "use strict";

  const app = window.App || {};
  const esc = app.escapeHTML || ((valor) => String(valor ?? ""));
  const proyecto = document.body.dataset.projectId;

  const COLOR_ESTADO = {
    "sin-empezar": "bg-[#f0f2f7] text-[#788196]",
    "en-proceso": "bg-primary-soft text-primary",
    "en-revision": "bg-warning-soft text-[#8a5a12]",
    "terminada": "bg-success-soft text-success"
  };

  /* Un color por etapa, en el orden en que avanzan las fases del proyecto. */
  const COLOR_FASE = ["#5b5ce2", "#19a7bd", "#36aa8a", "#f2ae3d", "#d7639d", "#5b91b4"];

  const estado = { diagrama: null, tareaActiva: null };
  const $ = (selector) => document.querySelector(selector);

  async function pedir(url, opciones = {}) {
    const respuesta = await fetch(url, {
      headers: { "Content-Type": "application/json" },
      ...opciones
    });
    // Sesión perdida o caducada: se vuelve al acceso en lugar de fallar a medias.
    if (respuesta.status === 401) {
      window.location.assign("/login");
      throw new Error("Tu sesión terminó. Vuelve a entrar.");
    }
    if (!respuesta.ok) {
      const detalle = await respuesta.json().catch(() => ({}));
      throw new Error(detalle.detail || detalle.message || `Error ${respuesta.status}`);
    }
    return respuesta.status === 204 ? null : respuesta.json();
  }

  const avisar = (mensaje, tipo = "info") => {
    if (typeof app.showToast === "function") app.showToast(mensaje, tipo);
  };

  /* ------------------------------------------------------------ diagrama */

  function tarjetaTarea(tarea) {
    const bloqueada = tarea.bloqueantes.length > 0;
    const responsable = tarea.responsable
      ? `<span class="inline-flex items-center gap-1.5 text-[11px] font-bold">
           <i class="inline-block h-2 w-2 rounded-full" style="background:${esc(tarea.colorResponsable || "#5b5ce2")}"></i>
           ${esc(tarea.responsable)}
         </span>`
      : '<span class="text-[11px] text-muted-light">Sin responsable</span>';

    return `
      <button class="tarea-nodo${bloqueada ? " esta-bloqueada" : ""}"
              style="--color-tarea:${esc(tarea.colorResponsable || "#8a95aa")}"
              type="button" data-task="${tarea.id}">
        <div class="flex items-start justify-between gap-1.5">
          <span class="text-[13px] font-bold leading-tight">${esc(tarea.titulo)}</span>
          ${bloqueada ? '<i class="bi bi-lock-fill flex-none text-xs text-muted-light" title="Bloqueada"></i>' : ""}
        </div>
        <span class="tag ${COLOR_ESTADO[tarea.estado] || ""} w-fit">${esc(tarea.estadoEtiqueta)}</span>
        ${responsable}
        ${bloqueada
          ? `<span class="text-[10px] text-muted-light">Depende de: ${esc(tarea.bloqueantes.join(", "))}</span>`
          : ""}
      </button>`;
  }

  function pintarDiagrama(diagrama) {
    $("#diagram").innerHTML = diagrama.fases.map((fase, indice) => `
      <div class="flex items-start gap-4">
        <div class="fase-columna" style="--color-fase:${COLOR_FASE[indice % COLOR_FASE.length]}">
          <div class="fase-cabecera">
            <span class="fase-numero">${indice + 1}</span>
            <h3 class="text-sm">${esc(fase.nombre)}</h3>
            <span class="fase-total">${fase.tareas.length}</span>
          </div>
          <div class="grid gap-2">
            ${fase.tareas.length
              ? fase.tareas.map(tarjetaTarea).join("")
              : '<p class="fase-vacia">Sin tareas</p>'}
          </div>
        </div>
        ${indice < diagrama.fases.length - 1
          ? '<i class="bi bi-arrow-right fase-flecha" aria-hidden="true"></i>'
          : ""}
      </div>`).join("");

    $("#diagram").querySelectorAll("[data-task]").forEach((boton) => {
      boton.addEventListener("click", () => abrirTarea(Number(boton.dataset.task)));
    });
  }

  function pintarDisponibles(tareas) {
    $("#available-count").textContent = String(tareas.length);
    $("#available-list").innerHTML = tareas.length
      ? tareas.map((tarea) => `
          <article class="tarjeta-lista flex items-center gap-3">
            <div class="min-w-0 flex-1">
              <h3 class="text-sm">${esc(tarea.titulo)}</h3>
              <p class="mt-0.5 text-[11px] text-muted">${esc(tarea.etapa)}${tarea.fechaLimite ? ` · vence ${esc(tarea.fechaLimite)}` : ""}</p>
            </div>
            <button class="btn btn-sm btn-primary" type="button" data-claim="${tarea.id}">
              <i class="bi bi-hand-index"></i> Tomarla
            </button>
          </article>`).join("")
      : '<p class="text-[13px] text-muted">No hay tareas libres: o están todas asignadas, o esperan a que terminen sus dependencias.</p>';

    $("#available-list").querySelectorAll("[data-claim]").forEach((boton) => {
      boton.addEventListener("click", () => reclamar(Number(boton.dataset.claim)));
    });
  }

  /* ------------------------------------------------------------ acciones */

  async function cargar() {
    estado.diagrama = await pedir(`/api/proyectos/${proyecto}/fases`);
    $("#project-label").textContent = estado.diagrama.proyectoNombre;
    pintarDiagrama(estado.diagrama);
    pintarDisponibles(estado.diagrama.disponibles);
  }

  async function reclamar(tareaId) {
    try {
      await pedir(`/api/tareas/${tareaId}/reclamar`, { method: "POST" });
      avisar("Tarea asignada. ¡A por ella!", "success");
      await cargar();
    } catch (error) {
      avisar(error.message, "error");
    }
  }

  /** Todas las tareas del diagrama en una sola lista. */
  function todasLasTareas() {
    return estado.diagrama.fases.flatMap((fase) => fase.tareas);
  }

  function abrirTarea(tareaId) {
    const tarea = todasLasTareas().find((item) => item.id === tareaId);
    if (!tarea) return;
    estado.tareaActiva = tarea;

    $("#task-title").textContent = tarea.titulo;
    $("#task-stage").textContent = tarea.etapa;
    $("#task-description").textContent = tarea.descripcion || "Sin descripción.";
    $("#task-state").value = tarea.estado;
    $("#release-task").hidden = !tarea.responsable;
    $("#task-feedback").classList.remove("is-visible");

    /*
     * Una tarea libre pero bloqueada no se puede tomar. Se explica aquí, antes
     * de pulsar: dejar el botón activo para responder luego con un error obliga
     * a intentarlo para descubrir el motivo.
     */
    const bloqueada = tarea.bloqueantes.length > 0;
    const tomar = $("#claim-task");
    tomar.hidden = Boolean(tarea.responsable);
    tomar.disabled = bloqueada;
    tomar.innerHTML = bloqueada
      ? '<i class="bi bi-lock-fill"></i> Bloqueada'
      : '<i class="bi bi-hand-index"></i> Tomar esta tarea';

    const aviso = $("#task-blocked");
    if (bloqueada) {
      aviso.hidden = false;
      aviso.textContent = tarea.responsable
        ? `Depende de: ${tarea.bloqueantes.join(", ")}.`
        : `No se puede tomar todavía. Antes hay que terminar: ${tarea.bloqueantes.join(", ")}.`;
    } else {
      aviso.hidden = true;
    }

    // Candidatas a dependencia: cualquier otra tarea que no lo sea ya.
    const candidatas = todasLasTareas()
      .filter((item) => item.id !== tarea.id && !tarea.dependencias.includes(item.id));
    $("#task-dependency").innerHTML = candidatas.length
      ? candidatas.map((item) => `<option value="${item.id}">${esc(item.titulo)}</option>`).join("")
      : '<option value="">No hay tareas disponibles</option>';

    const dependencias = tarea.dependencias
      .map((id) => todasLasTareas().find((item) => item.id === id))
      .filter(Boolean);
    $("#dependency-list").innerHTML = dependencias.length
      ? dependencias.map((dependencia) => `
          <span class="tag bg-[#f4f5fa] text-[#5c6883]">
            ${esc(dependencia.titulo)}
            <button type="button" data-remove-dep="${dependencia.id}" aria-label="Quitar dependencia"><i class="bi bi-x"></i></button>
          </span>`).join("")
      : '<span class="text-[11px] text-muted-light">Sin dependencias.</span>';

    $("#dependency-list").querySelectorAll("[data-remove-dep]").forEach((boton) => {
      boton.addEventListener("click", async () => {
        await pedir(`/api/tareas/${tarea.id}/dependencias/${boton.dataset.removeDep}`, { method: "DELETE" });
        await cargar();
        abrirTarea(tarea.id);
      });
    });

    $("#task-dialog").showModal();
  }

  function errorTarea(mensaje) {
    const caja = $("#task-feedback");
    caja.textContent = mensaje;
    caja.classList.add("is-visible");
  }

  async function init() {
    if (typeof app.renderNavigation === "function") app.renderNavigation();
    $("#back-to-project").href = `/proyectos/${proyecto}`;
    $("#link-deliverables").href = `/proyectos/${proyecto}/entregables`;

    const dialogo = $("#task-dialog");
    dialogo.querySelectorAll("[data-close-dialog]").forEach((boton) =>
      boton.addEventListener("click", () => dialogo.close()));

    $("#task-state").addEventListener("change", async (evento) => {
      try {
        await pedir(`/api/tareas/${estado.tareaActiva.id}/estado`, {
          method: "PATCH",
          body: JSON.stringify({ estado: evento.target.value })
        });
        await cargar();
        avisar("Estado actualizado.", "success");
        dialogo.close();
      } catch (error) {
        errorTarea(error.message);
      }
    });

    $("#add-dependency").addEventListener("click", async () => {
      const seleccion = $("#task-dependency").value;
      if (!seleccion) return;
      try {
        await pedir(`/api/tareas/${estado.tareaActiva.id}/dependencias`, {
          method: "POST",
          body: JSON.stringify({ dependeDe: Number(seleccion) })
        });
        const id = estado.tareaActiva.id;
        await cargar();
        abrirTarea(id);
      } catch (error) {
        errorTarea(error.message);
      }
    });

    $("#claim-task").addEventListener("click", async () => {
      try {
        await pedir(`/api/tareas/${estado.tareaActiva.id}/reclamar`, { method: "POST" });
        await cargar();
        dialogo.close();
        avisar("Tarea asignada.", "success");
      } catch (error) {
        errorTarea(error.message);
      }
    });

    $("#release-task").addEventListener("click", async () => {
      await pedir(`/api/tareas/${estado.tareaActiva.id}/liberar`, { method: "POST" });
      await cargar();
      dialogo.close();
      avisar("Tarea liberada: vuelve a estar disponible.", "success");
    });

    try {
      await cargar();
    } catch (error) {
      avisar("No se pudo cargar el diagrama: " + error.message, "error");
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
