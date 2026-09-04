/*
 * Espacio de trabajo de un proyecto.
 *
 * Lee y escribe contra la API REST. Antes usaba localStorage, donde los
 * proyectos de ejemplo tenían identificadores propios ("proy-cogni") que no
 * coincidían con los códigos de la base ("cognitiva"): al abrir un proyecto por
 * su URL no se encontraba nada y la página se quedaba cargando para siempre.
 */
(() => {
  "use strict";

  const app = window.App || {};
  const esc = app.escapeHTML || ((valor) => String(valor ?? ""));
  const codigo = document.body.dataset.projectId
    || decodeURIComponent(window.location.pathname.split("/").filter(Boolean).pop() || "");

  const COLOR_ESTADO = {
    "sin-empezar": "bg-[#f0f2f7] text-[#788196]",
    "en-proceso": "bg-primary-soft text-primary",
    "en-revision": "bg-warning-soft text-[#8a5a12]",
    "terminada": "bg-success-soft text-success"
  };
  /* Bandas horarias del calendario del proyecto. */
  const BANDAS = ["08:00", "10:00", "12:00", "14:00", "16:00"];
  const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

  const estado = { proyecto: null, filtro: "all" };
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
      throw new Error(detalle.detail || detalle.message || `Error ${respuesta.status}`);
    }
    return respuesta.status === 204 ? null : respuesta.json();
  }

  const avisar = (mensaje, tipo = "info") => {
    if (typeof app.showToast === "function") app.showToast(mensaje, tipo);
  };

  const iniciales = (nombre) => String(nombre || "?").trim().split(/\s+/).slice(0, 2)
    .map((parte) => parte[0]).join("").toUpperCase();

  function fechaCorta(iso) {
    if (!iso) return "Sin fecha";
    const fecha = new Date(`${iso}T12:00:00`);
    return Number.isNaN(fecha.getTime())
      ? iso
      : new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short" }).format(fecha).replace(".", "");
  }

  function diasRestantes(iso) {
    if (!iso) return "";
    const dias = Math.ceil((new Date(`${iso}T12:00:00`) - new Date()) / 86400000);
    if (dias < 0) return `Hace ${Math.abs(dias)} día${Math.abs(dias) === 1 ? "" : "s"}`;
    if (dias === 0) return "Es hoy";
    return `Faltan ${dias} día${dias === 1 ? "" : "s"}`;
  }

  /* ------------------------------------------------------------ cabecera */

  function pintarCabecera(proyecto) {
    $(".project-color-mark").style.background = proyecto.color || "#5b5ce2";
    $(".project-stage-label").textContent = proyecto.etapaActual || "En curso";
    $(".detail-project-name").textContent = proyecto.nombre;
    $(".detail-project-description").textContent = proyecto.descripcion || "Sin descripción todavía.";

    $(".detail-progress-value").textContent = `${proyecto.progreso}%`;
    $(".progress-fill").style.setProperty("--progress", `${proyecto.progreso}%`);
    const terminadas = proyecto.tareas.filter((tarea) => tarea.estado === "terminada").length;
    $(".progress-caption").textContent =
      `${terminadas} de ${proyecto.tareas.length} tarea${proyecto.tareas.length === 1 ? "" : "s"} terminada${terminadas === 1 ? "" : "s"}`;

    $(".detail-due-date").textContent = fechaCorta(proyecto.fechaEntrega);
    $(".detail-days-left").textContent = diasRestantes(proyecto.fechaEntrega);

    $(".detail-member-stack").innerHTML = proyecto.integrantes.map((integrante) =>
      `<span class="member-avatar" style="--member-color:${esc(integrante.color)}" title="${esc(integrante.nombre)}">${esc(integrante.iniciales || iniciales(integrante.nombre))}</span>`
    ).join("");
  }

  /* ------------------------------------------------------------ calendario */

  /** Lunes de la semana donde cae la primera tarea, o la de hoy si no hay. */
  function inicioSemana(proyecto) {
    const fechas = proyecto.tareas.map((tarea) => tarea.fechaLimite).filter(Boolean).sort();
    const referencia = fechas.length ? new Date(`${fechas[0]}T12:00:00`) : new Date();
    const desplazamiento = (referencia.getDay() + 6) % 7;
    referencia.setDate(referencia.getDate() - desplazamiento);
    return referencia;
  }

  function pintarCalendario(proyecto) {
    const contenedor = $("#detail-calendar");
    const lunes = inicioSemana(proyecto);
    const dias = Array.from({ length: 7 }, (_, i) => {
      const fecha = new Date(lunes);
      fecha.setDate(lunes.getDate() + i);
      return fecha;
    });
    const iso = (fecha) => fecha.toISOString().slice(0, 10);
    const hoy = iso(new Date());

    let html = '<div class="calendar-corner"></div>';
    dias.forEach((fecha, i) => {
      html += `<div class="calendar-day-head${iso(fecha) === hoy ? " is-today" : ""}">${DIAS[i]}<strong>${fecha.getDate()}</strong></div>`;
    });

    BANDAS.forEach((banda, indiceBanda) => {
      const siguiente = BANDAS[indiceBanda + 1] || "23:59";
      html += `<div class="calendar-time-label">${banda}</div>`;
      dias.forEach((fecha) => {
        const dia = iso(fecha);
        const enBanda = proyecto.tareas.filter((tarea) => {
          if (tarea.fechaLimite !== dia) return false;
          const hora = tarea.horaLimite || "09:00";
          return hora >= banda && hora < siguiente;
        });
        const esEntrega = proyecto.fechaEntrega === dia && indiceBanda === 0;
        html += `<div class="calendar-cell${esEntrega ? " is-due-date" : ""}">
          ${esEntrega ? '<span class="calendar-due-marker"><i class="bi bi-flag"></i> Entrega</span>' : ""}
          ${enBanda.map((tarea) => tarjetaCalendario(tarea)).join("")}
        </div>`;
      });
    });

    contenedor.innerHTML = html;

    $("#calendar-member-legend").innerHTML = proyecto.integrantes.map((integrante) =>
      `<span><i class="legend-member-dot" style="--legend-color:${esc(integrante.color)}"></i> ${esc(integrante.nombre)}</span>`
    ).join("");
  }

  function tarjetaCalendario(tarea) {
    return `<button class="calendar-task" type="button" data-task="${tarea.id}"
              style="--task-color:${esc(tarea.colorResponsable || "#5b5ce2")}">
        ${esc(tarea.titulo)}
        <span class="task-popover">
          <strong>${esc(tarea.titulo)}</strong>
          <span><i class="bi bi-person"></i> ${esc(tarea.responsable || "Sin responsable")}</span>
          <span><i class="bi bi-calendar3"></i> ${esc(fechaCorta(tarea.fechaLimite))} · ${esc(tarea.horaLimite || "09:00")}</span>
          <span><i class="bi bi-flag"></i> ${esc(tarea.estadoEtiqueta)}</span>
        </span>
      </button>`;
  }

  /* ------------------------------------------------------------ tareas */

  function pintarTareas(proyecto) {
    const contenedor = $("#project-tasks");
    const visibles = proyecto.tareas.filter((tarea) =>
      estado.filtro === "all" || tarea.estado === estado.filtro);

    if (!visibles.length) {
      contenedor.innerHTML = `<div class="empty-tasks"><div>
          <i class="bi bi-list-check text-2xl text-primary"></i>
          <h3>No hay tareas que mostrar</h3>
          <p>Cambia el filtro o crea una tarea nueva.</p>
        </div></div>`;
      return;
    }

    const plantilla = $("#task-card-template");
    contenedor.replaceChildren();

    visibles.forEach((tarea) => {
      const fragmento = plantilla.content.cloneNode(true);
      const tarjeta = fragmento.querySelector(".task-card");
      tarjeta.dataset.taskId = tarea.id;
      tarjeta.classList.toggle("is-completed", tarea.estado === "terminada");

      const chip = fragmento.querySelector(".task-status");
      chip.textContent = tarea.estadoEtiqueta;
      (COLOR_ESTADO[tarea.estado] || "").split(" ").filter(Boolean)
        .forEach((clase) => chip.classList.add(clase));

      fragmento.querySelector(".task-title").textContent = tarea.titulo;
      fragmento.querySelector(".task-description").textContent = tarea.descripcion || "Sin descripción.";
      fragmento.querySelector(".task-stage").textContent = tarea.etapa || "Sin etapa";
      fragmento.querySelector(".task-date time").textContent = fechaCorta(tarea.fechaLimite);

      // El color va en la tarjeta, no solo en el punto: pinta también el
      // borde izquierdo, que es lo que permite reconocer de quién es de un vistazo.
      const color = tarea.colorResponsable || "#c9cfe0";
      tarjeta.style.setProperty("--assignee-color", color);
      const responsable = fragmento.querySelector(".task-assignee");
      responsable.querySelector(".assignee-dot").style.setProperty("--assignee-color", color);
      responsable.querySelector("span").textContent = tarea.responsable || "Sin responsable";

      fragmento.querySelector(".task-check")
        .addEventListener("click", () => alternarTerminada(tarea));
      fragmento.querySelector(".task-menu-button")
        .addEventListener("click", () => abrirDialogoTarea(tarea.id));

      contenedor.append(fragmento);
    });
  }

  async function alternarTerminada(tarea) {
    const nuevo = tarea.estado === "terminada" ? "sin-empezar" : "terminada";
    try {
      await pedir(`/api/tareas/${tarea.id}/estado`, {
        method: "PATCH",
        body: JSON.stringify({ estado: nuevo })
      });
      await cargar();
    } catch (error) {
      avisar(error.message, "error");
    }
  }

  /* ------------------------------------------------------------ diálogos */

  function opcionesResponsable(select, seleccionado) {
    select.innerHTML = '<option value="">Sin asignar</option>'
      + estado.proyecto.integrantes.map((integrante) =>
          `<option value="${esc(integrante.nombre)}"${integrante.nombre === seleccionado ? " selected" : ""}>${esc(integrante.nombre)}</option>`
        ).join("");
  }

  function abrirDialogoTarea(tareaId) {
    const tarea = tareaId ? estado.proyecto.tareas.find((item) => item.id === tareaId) : null;

    $("#task-dialog-kicker").textContent = tarea ? "Editar tarea" : "Nueva tarea";
    $("#task-dialog-title").textContent = tarea ? tarea.titulo : "Añadir tarea";
    $("#editing-task-id").value = tarea ? tarea.id : "";
    $("#task-title-input").value = tarea ? tarea.titulo : "";
    $("#task-description-input").value = tarea ? tarea.descripcion || "" : "";
    $("#task-date-input").value = tarea ? tarea.fechaLimite || "" : "";
    $("#task-stage-input").value = tarea ? tarea.etapa || "Planeación" : "Planeación";
    $("#task-status-input").value = tarea ? tarea.estado : "sin-empezar";
    opcionesResponsable($("#task-assignee-input"), tarea ? tarea.responsable : "");
    $("#task-dialog").showModal();
  }

  async function guardarTarea(evento) {
    evento.preventDefault();
    const titulo = $("#task-title-input").value.trim();
    if (!titulo) {
      avisar("La tarea necesita un nombre.", "error");
      return;
    }
    const cuerpo = {
      titulo,
      descripcion: $("#task-description-input").value.trim(),
      responsable: $("#task-assignee-input").value || null,
      etapa: $("#task-stage-input").value,
      fechaLimite: $("#task-date-input").value || null,
      horaLimite: "09:00",
      estado: $("#task-status-input").value
    };
    const id = $("#editing-task-id").value;

    try {
      if (id) {
        await pedir(`/api/tareas/${id}`, { method: "PUT", body: JSON.stringify(cuerpo) });
      } else {
        await pedir(`/api/proyectos/${codigo}/tareas`, { method: "POST", body: JSON.stringify(cuerpo) });
      }
      $("#task-dialog").close();
      await cargar();
      avisar(id ? "Tarea actualizada." : "Tarea creada.", "success");
    } catch (error) {
      avisar(error.message, "error");
    }
  }

  function filaIntegrante(integrante = {}) {
    const plantilla = $("#dialog-member-row-template");
    const fila = plantilla.content.firstElementChild.cloneNode(true);
    fila.querySelector(".member-row-avatar").textContent = iniciales(integrante.nombre) || "?";
    fila.querySelector(".dialog-member-name").value = integrante.nombre || "";
    fila.querySelector(".dialog-member-contact").value = integrante.contacto || "";
    fila.querySelector(".dialog-member-name").addEventListener("input", (evento) => {
      fila.querySelector(".member-row-avatar").textContent = iniciales(evento.target.value) || "?";
    });
    fila.querySelector(".remove-dialog-member").addEventListener("click", () => fila.remove());
    $("#dialog-members-list").append(fila);
  }

  function abrirDialogoEquipo() {
    $("#dialog-members-list").replaceChildren();
    // El líder es el propietario y no se edita desde aquí.
    estado.proyecto.integrantes
      .filter((integrante) => integrante.rol !== "LIDER")
      .forEach(filaIntegrante);
    $("#members-dialog").showModal();
  }

  async function guardarEquipo(evento) {
    evento.preventDefault();
    const integrantes = [...$("#dialog-members-list").querySelectorAll(".dialog-member-row")]
      .map((fila) => ({
        nombre: fila.querySelector(".dialog-member-name").value.trim(),
        contacto: fila.querySelector(".dialog-member-contact").value.trim()
      }))
      .filter((integrante) => integrante.nombre);

    try {
      await pedir(`/api/proyectos/${codigo}/integrantes`, {
        method: "PUT",
        body: JSON.stringify(integrantes)
      });
      $("#members-dialog").close();
      await cargar();
      avisar("Equipo actualizado.", "success");
    } catch (error) {
      avisar(error.message, "error");
    }
  }

  /* ------------------------------------------------------------ carga */

  function enlazarDetalle() {
    document.querySelectorAll("[data-new-task]").forEach((boton) =>
      boton.addEventListener("click", () => abrirDialogoTarea(null)));
    $("[data-manage-members]").addEventListener("click", abrirDialogoEquipo);
    $("#task-status-filter").addEventListener("change", (evento) => {
      estado.filtro = evento.target.value;
      pintarTareas(estado.proyecto);
    });
    $("#detail-calendar").addEventListener("click", (evento) => {
      const boton = evento.target.closest("[data-task]");
      if (boton) abrirDialogoTarea(Number(boton.dataset.task));
    });
  }

  async function cargar() {
    const proyecto = await pedir(`/api/proyectos/${codigo}`);
    estado.proyecto = proyecto;

    const contenido = $("#project-content");
    const primeraVez = !contenido.querySelector(".detail-project-name");
    if (primeraVez) {
      contenido.replaceChildren($("#project-detail-template").content.cloneNode(true));
      enlazarDetalle();
      $("#task-status-filter").value = estado.filtro;
    }

    pintarCabecera(proyecto);
    pintarCalendario(proyecto);
    pintarTareas(proyecto);
  }

  async function init() {
    if (typeof app.renderNavigation === "function") app.renderNavigation();

    $("#task-form").addEventListener("submit", guardarTarea);
    $("#members-form").addEventListener("submit", guardarEquipo);
    $("#dialog-add-member").addEventListener("click", () => filaIntegrante());
    document.querySelectorAll("[data-close-dialog]").forEach((boton) =>
      boton.addEventListener("click", () => boton.closest("dialog").close()));

    try {
      await cargar();
    } catch (error) {
      $("#project-content").innerHTML = `<section class="empty-tasks"><div>
          <i class="bi bi-folder-x text-2xl text-danger"></i>
          <h3>No encontramos este proyecto</h3>
          <p>${esc(error.message)}</p>
          <a class="btn btn-primary mt-3" href="/proyectos">Volver a proyectos</a>
        </div></section>`;
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
