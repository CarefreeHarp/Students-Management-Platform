/*
 * Canales de un proyecto.
 * Barra lateral de canales, conversación con reacciones y archivos adjuntos,
 * más las secciones de imágenes y documentos del canal activo.
 */
(() => {
  "use strict";

  const app = window.App || {};
  const esc = app.escapeHTML || ((valor) => String(valor ?? ""));
  const proyecto = document.body.dataset.projectId;
  const EMOJIS = ["👍", "🎉", "❤️", "🚀", "👀", "✅", "😅", "🔥"];

  const estado = { canales: [], activo: null, archivoPendiente: null };
  const $ = (selector) => document.querySelector(selector);

  async function pedir(url, opciones = {}) {
    const esFormulario = opciones.body instanceof FormData;
    const respuesta = await fetch(url, {
      headers: esFormulario ? {} : { "Content-Type": "application/json" },
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

  /* ------------------------------------------------------------ barra lateral */

  function pintarCanales() {
    $("#channel-list").innerHTML = estado.canales.map((canal) => `
      <button class="flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-[13px] font-semibold transition-colors
                     ${canal.id === estado.activo?.id ? "bg-primary-soft text-[var(--estado-primary)]" : "text-muted hover:bg-primary-soft hover:text-[var(--estado-primary)]"}"
              type="button" data-channel="${canal.id}">
        <span class="text-muted-light">#</span>
        <span class="min-w-0 flex-1 truncate">${esc(canal.slug)}</span>
        ${canal.totalMensajes ? `<span class="text-[10px] text-muted-light">${canal.totalMensajes}</span>` : ""}
      </button>`).join("");

    $("#channel-list").querySelectorAll("[data-channel]").forEach((boton) => {
      boton.addEventListener("click", () => abrirCanal(Number(boton.dataset.channel)));
    });
  }

  /* ------------------------------------------------------------ mensajes */

  function burbujaReacciones(mensaje) {
    const existentes = mensaje.reacciones.map((reaccion) => `
      <button class="inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[11px] transition-colors
                     ${reaccion.propia ? "border-primary bg-primary-soft text-[var(--estado-primary)]" : "border-line bg-[var(--superficie)] text-muted hover:border-primary"}"
              type="button" data-react="${mensaje.id}" data-emoji="${esc(reaccion.emoji)}"
              title="${esc(reaccion.personas.join(", "))}">
        <span>${esc(reaccion.emoji)}</span><span>${reaccion.total}</span>
      </button>`).join("");

    return `<div class="mt-1.5 flex flex-wrap items-center gap-1">
        ${existentes}
        <button class="grid h-6 w-6 place-items-center rounded-full border border-line bg-[var(--superficie)] text-[11px] text-muted hover:border-primary hover:text-primary"
                type="button" data-open-picker="${mensaje.id}" aria-label="Añadir reacción">
          <i class="bi bi-emoji-smile"></i>
        </button>
      </div>`;
  }

  function burbujaAdjuntos(mensaje) {
    if (!mensaje.adjuntos.length) return "";
    return `<div class="mt-2 grid gap-1.5">${mensaje.adjuntos.map((archivo) => archivo.esImagen
      ? `<a href="${archivo.url}" target="_blank" rel="noopener">
           <img src="${archivo.url}" alt="${esc(archivo.nombre)}" class="max-h-52 rounded-sm border border-line object-cover">
         </a>`
      : `<a href="${archivo.url}" class="inline-flex items-center gap-2 rounded-sm border border-line bg-[var(--superficie)] px-2.5 py-1.5 text-xs hover:border-primary"
            target="_blank" rel="noopener">
           <i class="bi bi-file-earmark-arrow-down text-primary"></i>
           <span class="min-w-0 flex-1 truncate">${esc(archivo.nombre)}</span>
           <span class="text-muted-light">${esc(archivo.tamano)}</span>
         </a>`).join("")}</div>`;
  }

  function burbuja(mensaje) {
    if (mensaje.generadoPorIa) {
      return `<div class="self-center w-full max-w-[85%] rounded-sm border border-primary/20 bg-primary-soft/60 p-3 text-xs text-[var(--estado-primary)]">
          <strong class="mb-1 block"><i class="bi bi-stars"></i> Asistente</strong>${esc(mensaje.contenido)}
        </div>`;
    }
    return `
      <div class="flex max-w-[88%] items-start gap-2.5 ${mensaje.propio ? "flex-row-reverse self-end" : "self-start"}">
        <span class="member-avatar ml-0 flex-none" style="--member-color:${esc(mensaje.autorColor)}"
              title="${esc(mensaje.autorNombre)}">${esc(mensaje.iniciales)}</span>
        <div class="min-w-0">
          <div class="rounded-sm border border-line ${mensaje.propio ? "bg-primary-soft" : "bg-[var(--superficie)]"} px-3 py-2">
            <p class="mb-0.5 text-[11px] font-extrabold ${mensaje.propio ? "text-primary" : "text-muted"}">
              ${esc(mensaje.autorNombre)} · ${esc(mensaje.fechaEnvio)}
            </p>
            <p class="whitespace-pre-wrap break-words text-[13px]">${esc(mensaje.contenido)}</p>
            ${burbujaAdjuntos(mensaje)}
          </div>
          ${burbujaReacciones(mensaje)}
        </div>
      </div>`;
  }

  function pintarMensajes(mensajes) {
    const caja = $("#messages");
    caja.innerHTML = mensajes.length
      ? mensajes.map(burbuja).join("")
      : '<p class="m-auto text-center text-[13px] text-muted">Aún no hay mensajes en este canal.</p>';
    caja.scrollTop = caja.scrollHeight;

    caja.querySelectorAll("[data-react]").forEach((boton) => {
      boton.addEventListener("click", () => reaccionar(Number(boton.dataset.react), boton.dataset.emoji));
    });
    caja.querySelectorAll("[data-open-picker]").forEach((boton) => {
      boton.addEventListener("click", (evento) => abrirSelector(evento, Number(boton.dataset.openPicker)));
    });
  }

  /* ------------------------------------------------------------ reacciones */

  function abrirSelector(evento, mensajeId) {
    const selector = $("#emoji-picker");
    selector.innerHTML = EMOJIS.map((emoji) =>
      `<button class="grid h-8 w-8 place-items-center rounded-lg text-lg hover:bg-primary-soft" type="button" data-emoji="${emoji}">${emoji}</button>`
    ).join("");
    selector.classList.remove("hidden");
    selector.classList.add("flex");

    const rect = evento.currentTarget.getBoundingClientRect();
    selector.style.left = `${Math.min(window.innerWidth - 300, rect.left)}px`;
    selector.style.top = `${Math.max(8, rect.top - 48)}px`;

    selector.querySelectorAll("[data-emoji]").forEach((boton) => {
      boton.addEventListener("click", () => {
        cerrarSelector();
        reaccionar(mensajeId, boton.dataset.emoji);
      });
    });
  }

  function cerrarSelector() {
    const selector = $("#emoji-picker");
    selector.classList.add("hidden");
    selector.classList.remove("flex");
  }

  async function reaccionar(mensajeId, emoji) {
    try {
      await pedir(`/api/mensajes/${mensajeId}/reacciones`, {
        method: "POST",
        body: JSON.stringify({ emoji })
      });
      await abrirCanal(estado.activo.id);
    } catch (error) {
      avisar(error.message, "error");
    }
  }

  /* ------------------------------------------------------------ archivos */

  function pintarArchivos(archivos) {
    const imagenes = archivos.filter((archivo) => archivo.esImagen);
    const documentos = archivos.filter((archivo) => !archivo.esImagen);

    $("#image-count").textContent = String(imagenes.length);
    $("#doc-count").textContent = String(documentos.length);

    $("#gallery").innerHTML = imagenes.length
      ? imagenes.map((imagen) => `
          <a href="${imagen.url}" target="_blank" rel="noopener" title="${esc(imagen.nombre)}">
            <img src="${imagen.url}" alt="${esc(imagen.nombre)}"
                 class="aspect-square w-full rounded-md border border-line object-cover transition-transform hover:scale-105">
          </a>`).join("")
      : '<p class="col-span-3 text-[13px] text-muted">Sin imágenes todavía.</p>';

    $("#documents").innerHTML = documentos.length
      ? documentos.map((documento) => `
          <a href="${documento.url}" target="_blank" rel="noopener"
             class="flex items-center gap-2 rounded-sm border border-line bg-[var(--superficie)] p-2 text-xs hover:border-primary">
            <i class="bi bi-file-earmark-text text-lg text-primary"></i>
            <span class="min-w-0 flex-1">
              <span class="block truncate font-bold">${esc(documento.nombre)}</span>
              <span class="text-muted-light">${esc(documento.tamano)} · ${esc(documento.subidoPor)}</span>
            </span>
          </a>`).join("")
      : '<p class="text-[13px] text-muted">Sin documentos todavía.</p>';
  }

  /* ------------------------------------------------------------ resumen */

  function pintarResumen(resumen) {
    const caja = $("#summary-body");
    if (!resumen) {
      caja.innerHTML = '<p class="text-[13px] text-muted">Pulsa «Resumir» cuando haya conversación.</p>';
      return;
    }
    $("#summary-model").textContent = resumen.modelo;
    const puntos = (resumen.puntosClave || []).length
      ? `<ul class="mt-2.5 grid gap-1.5 text-xs text-muted">${resumen.puntosClave
          .map((punto) => `<li class="flex gap-1.5"><i class="bi bi-dot text-primary"></i><span>${esc(punto)}</span></li>`)
          .join("")}</ul>`
      : "";
    caja.innerHTML = `<p class="whitespace-pre-wrap text-[13px]">${esc(resumen.contenido)}</p>${puntos}
      <p class="mt-2.5 text-[11px] text-muted-light">${resumen.mensajesResumidos} mensajes · ${esc(resumen.fechaGeneracion)}</p>`;
  }

  /* ------------------------------------------------------------ carga */

  async function abrirCanal(canalId) {
    const canal = await pedir(`/api/canales/${canalId}`);
    estado.activo = canal;

    $("#channel-title").textContent = `#${canal.slug}`;
    $("#channel-description").textContent = canal.descripcion || "";
    $("#message-input").placeholder = `Escribe en #${canal.slug}…`;
    $("#delete-channel").hidden = !canal.borrable;

    pintarMensajes(canal.mensajes);
    pintarResumen(canal.ultimoResumen);
    pintarArchivos(await pedir(`/api/canales/${canalId}/archivos`));

    // Refresca los contadores de la barra lateral.
    estado.canales = await pedir(`/api/proyectos/${proyecto}/canales`);
    pintarCanales();
  }

  async function enviar(evento) {
    evento.preventDefault();
    const campo = $("#message-input");
    const contenido = campo.value.trim();
    if (!contenido && !estado.archivoPendiente) return;
    if (!estado.activo) {
      avisar("Crea un canal antes de escribir.", "error");
      return;
    }

    try {
      const mensaje = await pedir(`/api/canales/${estado.activo.id}/mensajes`, {
        method: "POST",
        body: JSON.stringify({ contenido: contenido || estado.archivoPendiente.name })
      });

      if (estado.archivoPendiente) {
        const formulario = new FormData();
        formulario.append("archivo", estado.archivoPendiente);
        formulario.append("mensajeId", String(mensaje.id));
        await pedir(`/api/canales/${estado.activo.id}/archivos?mensajeId=${mensaje.id}`, {
          method: "POST",
          body: formulario
        });
        limpiarArchivo();
      }

      campo.value = "";
      await abrirCanal(estado.activo.id);
    } catch (error) {
      avisar(error.message, "error");
    }
  }

  function limpiarArchivo() {
    estado.archivoPendiente = null;
    $("#file-input").value = "";
    const caja = $("#pending-file");
    caja.classList.add("hidden");
    caja.classList.remove("flex");
  }

  async function crearCanal(evento) {
    evento.preventDefault();
    const feedback = $("#channel-feedback");
    try {
      const canal = await pedir(`/api/proyectos/${proyecto}/canales`, {
        method: "POST",
        body: JSON.stringify({
          nombre: $("#channel-name").value.trim(),
          descripcion: $("#channel-description-input").value.trim(),
          tareaId: $("#channel-task").value ? Number($("#channel-task").value) : null
        })
      });
      $("#channel-dialog").close();
      $("#channel-form").reset();
      feedback.classList.remove("is-visible");
      await abrirCanal(canal.id);
      avisar(`Canal #${canal.slug} creado.`, "success");
    } catch (error) {
      feedback.textContent = error.message;
      feedback.classList.add("is-visible");
    }
  }

  /* Enlaza todos los controles. Se hace antes de pedir datos: si el proyecto
     todavía no tiene canales, los botones deben seguir funcionando —
     especialmente el de crear el primero. */
  function enlazarControles() {
    if (typeof app.renderNavigation === "function") app.renderNavigation();
    $("#back-to-project").href = `/proyectos/${proyecto}`;

    $("#message-form").addEventListener("submit", enviar);
    $("#message-input").addEventListener("keydown", (evento) => {
      if (evento.key === "Enter" && !evento.shiftKey) {
        evento.preventDefault();
        $("#message-form").requestSubmit();
      }
    });

    $("#file-input").addEventListener("change", (evento) => {
      const [archivo] = evento.target.files || [];
      if (!archivo) return;
      estado.archivoPendiente = archivo;
      const caja = $("#pending-file");
      caja.classList.remove("hidden");
      caja.classList.add("flex");
      caja.innerHTML = `<i class="bi bi-paperclip"></i><span class="flex-1 truncate">${esc(archivo.name)}</span>
        <button class="icon-button h-6 w-6" type="button" id="clear-file" aria-label="Quitar archivo"><i class="bi bi-x"></i></button>`;
      $("#clear-file").addEventListener("click", limpiarArchivo);
    });

    $("#summarize").addEventListener("click", async () => {
      if (!estado.activo) return;
      try {
        pintarResumen(await pedir(`/api/canales/${estado.activo.id}/resumen`, { method: "POST" }));
        avisar("Resumen generado.", "success");
      } catch (error) {
        avisar(error.message, "error");
      }
    });

    $("#delete-channel").addEventListener("click", async () => {
      if (!estado.activo) return;
      if (!window.confirm(`¿Eliminar el canal #${estado.activo.slug} y sus mensajes?`)) return;
      await pedir(`/api/canales/${estado.activo.id}`, { method: "DELETE" });
      estado.canales = await pedir(`/api/proyectos/${proyecto}/canales`);
      if (estado.canales.length) await abrirCanal(estado.canales[0].id);
      else mostrarSinCanales();
    });

    const dialogo = $("#channel-dialog");
    $("#new-channel").addEventListener("click", () => dialogo.showModal());
    dialogo.querySelectorAll("[data-close-dialog]").forEach((boton) =>
      boton.addEventListener("click", () => dialogo.close()));
    $("#channel-form").addEventListener("submit", crearCanal);
    $("#channel-name").addEventListener("input", (evento) => {
      $("#slug-preview").textContent = `#${aSlug(evento.target.value) || "canal"}`;
    });

    // Cerrar el selector de emoji al pulsar fuera.
    document.addEventListener("click", (evento) => {
      if (!evento.target.closest("#emoji-picker") && !evento.target.closest("[data-open-picker]")) {
        cerrarSelector();
      }
    });
  }

  /** Mismo criterio que TextoUtil.aSlug en el servidor. */
  function aSlug(texto) {
    return String(texto || "").trim().toLowerCase()
      .normalize("NFD").replace(/\p{Diacritic}/gu, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function mostrarSinCanales() {
    estado.activo = null;
    $("#channel-title").textContent = "Sin canales";
    $("#channel-description").textContent = "";
    $("#delete-channel").hidden = true;
    $("#channel-list").innerHTML =
      '<p class="px-2 py-1.5 text-xs text-muted">Ninguno todavía.</p>';
    $("#messages").innerHTML = `<div class="m-auto grid max-w-[36ch] gap-3 text-center">
        <i class="bi bi-chat-square-dots text-3xl text-primary"></i>
        <p class="text-[13px] text-muted">Este proyecto aún no tiene canales. Crea el primero para empezar a conversar.</p>
        <button class="btn btn-primary mx-auto" type="button" id="first-channel">
          <i class="bi bi-plus-lg"></i> Crear el primer canal
        </button>
      </div>`;
    $("#first-channel").addEventListener("click", () => $("#channel-dialog").showModal());
    pintarArchivos([]);
    pintarResumen(null);
  }

  async function init() {
    enlazarControles();

    try {
      estado.canales = await pedir(`/api/proyectos/${proyecto}/canales`);

      const detalle = await pedir(`/api/proyectos/${proyecto}`);
      $("#project-label").textContent = detalle.nombre;
      $("#channel-task").innerHTML = '<option value="">Sin tarea</option>'
        + detalle.tareas.map((tarea) => `<option value="${tarea.id}">${esc(tarea.titulo)}</option>`).join("");

      if (!estado.canales.length) {
        mostrarSinCanales();
        return;
      }

      // Abre el canal indicado en la URL (?canal=slug) o el primero de la lista.
      const solicitado = new URLSearchParams(window.location.search).get("canal");
      const inicial = estado.canales.find((canal) => canal.slug === solicitado) || estado.canales[0];
      await abrirCanal(inicial.id);
    } catch (error) {
      avisar("No se pudieron cargar los canales: " + error.message, "error");
      $("#messages").innerHTML =
        `<p class="m-auto text-center text-[13px] text-danger">No se pudieron cargar los canales.<br>${esc(error.message)}</p>`;
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
