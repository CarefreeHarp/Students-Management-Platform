/*
 * Página de recordatorios.
 * A diferencia de las pantallas antiguas (que aún trabajan con localStorage),
 * esta consume directamente la API REST de Spring Boot.
 */
(() => {
  "use strict";

  const app = window.App || {};
  const rutas = app.ROUTES?.api || {};
  const esc = app.escapeHTML || (valor => String(valor ?? ""));

  const estado = { preferencias: null, materias: [] };

  const $ = selector => document.querySelector(selector);

  async function pedir(url, opciones) {
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

  function avisar(mensaje, tipo = "info") {
    if (typeof app.showToast === "function") app.showToast(mensaje, tipo);
  }

  function feedback(mensaje, tipo) {
    const caja = $("#preferences-feedback");
    caja.textContent = mensaje;
    caja.classList.toggle("is-visible", Boolean(mensaje));
    caja.classList.toggle("is-success", tipo === "success");
  }

  /* ------------------------------------------------------------ preferencias */

  function pintarEstadoPasarela(preferencias) {
    const caja = $("#gateway-status");
    caja.classList.remove("hidden");
    caja.classList.add("flex");
    if (preferencias.pasarelaConectada) {
      caja.className = "mb-5 flex items-start gap-3 rounded border border-success/30 bg-success-soft p-4 text-[13px] text-[var(--estado-success)]";
      caja.innerHTML = '<i class="bi bi-check-circle-fill text-lg"></i><div><strong>WhatsApp conectado.</strong> Los recordatorios se envían a tu número real.</div>';
      return;
    }
    caja.className = "mb-5 flex items-start gap-3 rounded border border-warning/30 bg-warning-soft p-4 text-[13px] text-[var(--estado-warning)]";
    caja.innerHTML = '<i class="bi bi-info-circle-fill text-lg text-warning"></i><div><strong>Modo simulación.</strong> '
      + 'La programación de avisos funciona por completo, pero los mensajes se escriben en la consola del servidor en lugar de enviarse. '
      + 'Para activar el envío real, configura <code>studyflow.whatsapp.token</code> y <code>phone-number-id</code> en application.properties.</div>';
  }

  function volcarPreferencias(preferencias) {
    estado.preferencias = preferencias;
    $("#reminders-active").checked = preferencias.activo;
    $("#whatsapp-phone").value = preferencias.telefonoWhatsapp || "";
    seleccionar("#advance-task", preferencias.minutosAntesTarea);
    seleccionar("#advance-delivery", preferencias.minutosAntesEntrega);
    seleccionar("#advance-note", preferencias.minutosAntesApunte);
    if (preferencias.silencioDesde) $("#quiet-from").value = preferencias.silencioDesde;
    if (preferencias.silencioHasta) $("#quiet-to").value = preferencias.silencioHasta;
    pintarEstadoPasarela(preferencias);
  }

  /* Añade la opción si el valor guardado no coincide con ninguna de la lista. */
  function seleccionar(selector, valor) {
    const campo = $(selector);
    if (valor == null) return;
    const existe = [...campo.options].some(opcion => Number(opcion.value) === Number(valor));
    if (!existe) {
      campo.append(new Option(`${valor} minutos antes`, String(valor)));
    }
    campo.value = String(valor);
  }

  async function guardarPreferencias(evento) {
    evento.preventDefault();
    const cuerpo = {
      activo: $("#reminders-active").checked,
      telefonoWhatsapp: $("#whatsapp-phone").value.trim(),
      minutosAntesTarea: Number($("#advance-task").value),
      minutosAntesEntrega: Number($("#advance-delivery").value),
      minutosAntesApunte: Number($("#advance-note").value),
      silencioDesde: $("#quiet-from").value,
      silencioHasta: $("#quiet-to").value
    };
    try {
      const preferencias = await pedir(rutas.preferenciasRecordatorio, { method: "PUT", body: JSON.stringify(cuerpo) });
      volcarPreferencias(preferencias);
      feedback("Configuración guardada. La agenda de avisos se recalculó.", "success");
      await cargarRecordatorios();
    } catch (error) {
      feedback(error.message, "error");
    }
  }

  /* ------------------------------------------------------------ apuntes */

  function tarjetaApunte(apunte) {
    const vencimiento = apunte.fechaLimite
      ? `<span class="inline-flex items-center gap-1.5"><i class="bi bi-calendar3"></i>${esc(apunte.fechaLimite)}</span>`
      : '<span class="text-muted-light">Sin fecha</span>';
    return `
      <article class="tarjeta-lista flex items-start gap-3 ${apunte.resuelto ? "opacity-60" : ""}">
        <button class="task-check ${apunte.resuelto ? "is-done" : ""}" type="button" data-toggle-note="${apunte.id}"
                aria-label="Marcar como resuelto"><i class="bi bi-check"></i></button>
        <div class="min-w-0 flex-1">
          <h3 class="text-sm ${apunte.resuelto ? "line-through text-muted" : ""}">${esc(apunte.titulo)}</h3>
          ${apunte.contenido ? `<p class="mt-1 text-xs text-muted">${esc(apunte.contenido)}</p>` : ""}
          <div class="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-muted">
            ${apunte.materia ? `<span class="tag bg-primary-soft text-[var(--estado-primary)]">${esc(apunte.materia)}</span>` : ""}
            ${apunte.importante ? '<span class="tag bg-danger-soft text-[var(--estado-danger)]">Prioritario</span>' : ""}
            ${vencimiento}
          </div>
        </div>
        <button class="icon-button" type="button" data-delete-note="${apunte.id}" aria-label="Eliminar apunte">
          <i class="bi bi-trash3"></i>
        </button>
      </article>`;
  }

  async function cargarApuntes() {
    const apuntes = await pedir(rutas.apuntes);
    const lista = $("#notes-list");
    lista.innerHTML = apuntes.length
      ? apuntes.map(tarjetaApunte).join("")
      : '<p class="text-[13px] text-muted">Todavía no has anotado nada. Después de cada clase, registra aquí lo importante.</p>';

    lista.querySelectorAll("[data-toggle-note]").forEach(boton => {
      boton.addEventListener("click", async () => {
        const apunte = apuntes.find(item => String(item.id) === boton.dataset.toggleNote);
        await pedir(`${rutas.apuntes}/${boton.dataset.toggleNote}/resuelto`, {
          method: "PATCH",
          body: JSON.stringify({ resuelto: !apunte.resuelto })
        });
        await Promise.all([cargarApuntes(), cargarRecordatorios()]);
      });
    });
    lista.querySelectorAll("[data-delete-note]").forEach(boton => {
      boton.addEventListener("click", async () => {
        await pedir(`${rutas.apuntes}/${boton.dataset.deleteNote}`, { method: "DELETE" });
        await Promise.all([cargarApuntes(), cargarRecordatorios()]);
      });
    });
  }

  async function crearApunte(evento) {
    evento.preventDefault();
    const titulo = $("#note-title").value.trim();
    if (!titulo) return;
    const materiaId = $("#note-subject").value;
    try {
      await pedir(rutas.apuntes, {
        method: "POST",
        body: JSON.stringify({
          titulo,
          contenido: $("#note-content").value.trim(),
          materiaId: materiaId ? Number(materiaId) : null,
          fechaLimite: $("#note-deadline").value || null,
          importante: $("#note-important").checked
        })
      });
      $("#note-form").reset();
      avisar("Apunte guardado. Si tiene fecha, ya está programado su recordatorio.", "success");
      await Promise.all([cargarApuntes(), cargarRecordatorios()]);
    } catch (error) {
      avisar(error.message, "error");
    }
  }

  /* ------------------------------------------------------------ recordatorios */

  const COLOR_ESTADO = {
    PROGRAMADO: "bg-primary-soft text-[var(--estado-primary)]",
    ENVIADO: "bg-success-soft text-[var(--estado-success)]",
    FALLIDO: "bg-danger-soft text-[var(--estado-danger)]",
    CANCELADO: "bg-[var(--chip-neutro)] text-muted"
  };

  function tarjetaRecordatorio(recordatorio) {
    return `
      <article class="tarjeta-lista flex items-start gap-3">
        <span class="grid h-9 w-9 flex-none place-items-center rounded-sm bg-primary-soft text-[var(--estado-primary)]">
          <i class="bi bi-whatsapp"></i>
        </span>
        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-2">
            <h3 class="text-sm">${esc(recordatorio.titulo)}</h3>
            <span class="tag ${COLOR_ESTADO[recordatorio.estado] || ""}">${esc(recordatorio.estado)}</span>
            <span class="tag bg-[var(--chip-neutro)] text-muted">${esc(recordatorio.tipoEtiqueta)}</span>
          </div>
          <p class="mt-1 text-xs text-muted">${esc(recordatorio.mensaje || "")}</p>
          <p class="mt-1 text-[11px] text-muted-light">
            Aviso: ${esc(recordatorio.fechaHora)}${recordatorio.proyecto ? ` · ${esc(recordatorio.proyecto)}` : ""}
          </p>
          ${recordatorio.errorEnvio ? `<p class="mt-1 text-[11px] text-danger">${esc(recordatorio.errorEnvio)}</p>` : ""}
        </div>
        ${recordatorio.estado === "PROGRAMADO" ? `
          <div class="flex flex-none gap-1">
            <button class="icon-button" type="button" data-send-now="${recordatorio.id}" aria-label="Enviar ahora"><i class="bi bi-send"></i></button>
            <button class="icon-button" type="button" data-cancel="${recordatorio.id}" aria-label="Cancelar"><i class="bi bi-x-lg"></i></button>
          </div>` : ""}
      </article>`;
  }

  async function cargarRecordatorios() {
    const recordatorios = await pedir(rutas.recordatorios);
    const pendientes = recordatorios.filter(item => item.estado === "PROGRAMADO");
    $("#scheduled-count").textContent = pendientes.length
      ? `${pendientes.length} aviso${pendientes.length === 1 ? "" : "s"} en cola.`
      : "Sin recordatorios pendientes.";

    const lista = $("#reminders-list");
    const visibles = recordatorios.filter(item => item.estado !== "CANCELADO");
    lista.innerHTML = visibles.length
      ? visibles.map(tarjetaRecordatorio).join("")
      : '<p class="text-[13px] text-muted">No hay avisos. Pulsa «Recalcular agenda» para generarlos desde tus tareas y entregas.</p>';

    lista.querySelectorAll("[data-send-now]").forEach(boton => {
      boton.addEventListener("click", async () => {
        await pedir(`${rutas.recordatorios}/${boton.dataset.sendNow}/enviar`, { method: "POST" });
        avisar("Recordatorio enviado.", "success");
        await cargarRecordatorios();
      });
    });
    lista.querySelectorAll("[data-cancel]").forEach(boton => {
      boton.addEventListener("click", async () => {
        await pedir(`${rutas.recordatorios}/${boton.dataset.cancel}`, { method: "DELETE" });
        await cargarRecordatorios();
      });
    });
  }

  /* ------------------------------------------------------------ arranque */

  async function cargarMaterias() {
    try {
      estado.materias = await pedir(rutas.materias);
      const selector = $("#note-subject");
      estado.materias.forEach(materia => selector.append(new Option(materia.nombre, String(materia.id))));
    } catch (_) {
      // Sin materias registradas el apunte se guarda igual, solo que sin asignatura.
    }
  }

  async function init() {
    if (typeof app.renderNavigation === "function") app.renderNavigation();
    $("#preferences-form").addEventListener("submit", guardarPreferencias);
    $("#note-form").addEventListener("submit", crearApunte);

    $("#reprogram").addEventListener("click", async () => {
      const resultado = await pedir(`${rutas.recordatorios}/reprogramar`, { method: "POST" });
      avisar(`Agenda recalculada: ${resultado.programados} recordatorios programados.`, "success");
      await cargarRecordatorios();
    });

    $("#test-message").addEventListener("click", async () => {
      try {
        const resultado = await pedir(`${rutas.recordatorios}/prueba`, { method: "POST" });
        avisar(resultado.mensaje, "success");
      } catch (error) {
        avisar(error.message, "error");
      }
    });

    try {
      volcarPreferencias(await pedir(rutas.preferenciasRecordatorio));
      await Promise.all([cargarMaterias(), cargarApuntes(), cargarRecordatorios()]);
    } catch (error) {
      avisar("No se pudo cargar la configuración: " + error.message, "error");
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
