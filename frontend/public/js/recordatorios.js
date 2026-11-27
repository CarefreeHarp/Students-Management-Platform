/* Avisos personales y estándares de recordatorios por WhatsApp. */
export function mount(scope) {
  const { t: uiText, StudyFlowLanguage } = scope;
  const { document, listen, request, later, animate } = scope;
  const app = scope.app || {};
  const rutas = { recordatorios: "/api/recordatorios", preferenciasRecordatorio: "/api/recordatorios/preferencias", apuntes: "/api/apuntes", ...app.ROUTES?.api };
  const esc = app.escapeHTML || (valor => String(valor ?? "").replace(/[&<>"']/g, letra => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[letra]));
  const $ = selector => document.querySelector(selector);
  const estado = { preferencias: null };

  async function pedir(url, opciones) {
    const respuesta = await request(url, { headers: { "Content-Type": "application/json" }, ...opciones });
    if (respuesta.status === 401) {
      app.navigate("/login");
      throw new Error(uiText("canales.tu_sesion_termino_vuelve_a_entrar"));
    }
    if (!respuesta.ok) {
      const detalle = await respuesta.json().catch(() => ({}));
      throw new Error(detalle.detail || detalle.message || (uiText("canales.error_0", {0: respuesta.status})));
    }
    return respuesta.status === 204 ? null : respuesta.json();
  }

  function avisar(mensaje, tipo = "info") { app.showToast?.(mensaje, tipo); }

  function feedback(selector, mensaje, tipo = "error") {
    const caja = $(selector);
    caja.textContent = mensaje;
    caja.classList.toggle("is-visible", Boolean(mensaje));
    caja.classList.toggle("is-success", tipo === "success");
  }

  async function mientrasGuarda(boton, accion) {
    if (boton.disabled) return;
    boton.disabled = true;
    try { await accion(); } finally { boton.disabled = false; }
  }

  function seleccionar(selector, valor) {
    const campo = $(selector);
    if (valor == null) return;
    if (![...campo.options].some(opcion => Number(opcion.value) === Number(valor))) {
      campo.append(new Option((uiText("recordatorios.0_minutos_antes", {0: valor})), String(valor)));
    }
    campo.value = String(valor);
  }

  function volcarPreferencias(preferencias) {
    estado.preferencias = preferencias;
    $("#reminders-active").checked = preferencias.activo;
    $("#whatsapp-phone").value = preferencias.telefonoWhatsapp || "";
    seleccionar("#advance-task", preferencias.minutosAntesTarea);
    seleccionar("#advance-delivery", preferencias.minutosAntesEntrega);
    seleccionar("#advance-note", preferencias.minutosAntesApunte);
    $("#gateway-status").textContent = !preferencias.activo
      ? uiText("recordatorios.los_avisos_estan_desactivados_puedes_activarlos_en_configurar")
      : !preferencias.pasarelaConectada
        ? uiText("recordatorios.modo_demo")
        : preferencias.telefonoWhatsapp
          ? uiText("recordatorios.numero_conectado", {0: preferencias.telefonoWhatsapp})
          : uiText("recordatorios.configura_numero");
    $("#reminder-destination").textContent = preferencias.telefonoWhatsapp
      ? uiText("recordatorios.numero_destino", {0: preferencias.telefonoWhatsapp})
      : uiText("recordatorios.anade_tu_numero_en_configurar_recordatorios_para_poder");
  }

  async function guardarPreferencias(evento) {
    evento.preventDefault();
    const form = evento.currentTarget;
    if (!form.reportValidity()) return;
    await mientrasGuarda(form.querySelector('[type="submit"]'), async () => {
      try {
        const preferencias = await pedir(rutas.preferenciasRecordatorio, {
          method: "PUT",
          body: JSON.stringify({
            activo: $("#reminders-active").checked,
            telefonoWhatsapp: $("#whatsapp-phone").value.trim(),
            minutosAntesTarea: Number($("#advance-task").value),
            minutosAntesEntrega: Number($("#advance-delivery").value),
            minutosAntesApunte: Number($("#advance-note").value),
            silencioDesde: "", silencioHasta: ""
          })
        });
        volcarPreferencias(preferencias);
        $("#preferences-dialog").close();
        avisar(uiText("recordatorios.configuracion_guardada"), "success");
        await cargarRecordatorios();
      } catch (error) { feedback("#preferences-feedback", error.message); }
    });
  }

  function antelacion() { return Number($("#reminder-advance").value) * Number($("#reminder-unit").value); }

  function fechaVencimiento() {
    return $("#reminder-date").value && $("#reminder-time").value
      ? (uiText("recordatorios.0_t_1_00", {0: $("#reminder-date").value, 1: $("#reminder-time").value})) : "";
  }

  function actualizarPrevisualizacion() {
    const fecha = fechaVencimiento();
    const minutos = antelacion();
    const aviso = fecha ? new Date(new Date(fecha).getTime() - minutos * 60000) : null;
    $("#reminder-preview").textContent = aviso && Number.isFinite(aviso.getTime())
      ? (uiText("recordatorios.recibiras_el_aviso_el_0", {0: aviso.toLocaleString(StudyFlowLanguage.locale(), { dateStyle: "medium", timeStyle: "short" })}))
      : uiText("recordatorios.elige_fecha_y_hora_para_ver_cuando_recibiras");
  }

  async function crearRecordatorio(evento) {
    evento.preventDefault();
    const form = evento.currentTarget;
    if (!form.reportValidity()) return;
    const titulo = $("#reminder-title").value.trim();
    const minutos = antelacion();
    const vencimiento = fechaVencimiento();
    if (!titulo) { feedback("#reminder-feedback", uiText("recordatorios.escribe_que_necesitas_recordar")); return; }
    if (!Number.isInteger(minutos) || minutos < 0 || minutos > 43200) {
      feedback("#reminder-feedback", uiText("recordatorios.la_antelacion_debe_estar_entre_0_minutos_y")); return;
    }
    if (new Date(vencimiento).getTime() - minutos * 60000 <= Date.now()) {
      feedback("#reminder-feedback", uiText("recordatorios.la_hora_del_aviso_ya_paso_reduce_la")); return;
    }
    await mientrasGuarda(form.querySelector('[type="submit"]'), async () => {
      try {
        await pedir(rutas.recordatorios, { method: "POST", body: JSON.stringify({
          titulo, mensaje: $("#reminder-message").value.trim(), fechaVencimiento: vencimiento, minutosAntes: minutos
        }) });
        $("#reminder-dialog").close();
        form.reset();
        actualizarPrevisualizacion();
        avisar(uiText("recordatorios.recordatorio_programado"), "success");
        await cargarRecordatorios();
      } catch (error) { feedback("#reminder-feedback", error.message); }
    });
  }

  function tarjetaRecordatorio(recordatorio) {
    const programado = recordatorio.estado === "PROGRAMADO";
    const etiquetas = { ENVIADO: uiText("recordatorios.enviado"), FALLIDO: uiText("recordatorios.no_se_pudo_enviar"), CANCELADO: uiText("recordatorios.cancelado") };
    return (`<article class="tarjeta-lista flex items-start gap-3">
      <span class="text-muted"><i class="bi bi-whatsapp" aria-hidden="true"></i></span>
      <div class="min-w-0 flex-1">
        <h3 class="text-sm">${esc(recordatorio.titulo)}</h3>
        <p class="mt-1 text-[13px] text-muted">${uiText("recordatorios.aviso_1_2", {1: esc(recordatorio.fechaHora), 2: recordatorio.proyecto ? ` · ${esc(recordatorio.proyecto)}` : ""})}</p>
        ${recordatorio.fechaVencimiento ? (`<p class="mt-1 text-xs text-muted">${uiText("recordatorios.vence_0", {0: esc(recordatorio.fechaVencimiento)})}</p>`) : ""}
        ${!programado ? `<p class="mt-1 text-xs text-muted">${esc(etiquetas[recordatorio.estado] || recordatorio.estado)}</p>` : ""}
        ${recordatorio.mensaje ? (`<details class="mt-2 text-xs text-muted"><summary>${uiText("recordatorios.ver_detalle")}</summary><p class="mt-2 break-words">${esc(recordatorio.mensaje)}</p></details>`) : ""}
        ${recordatorio.errorEnvio ? `<p class="mt-1 text-xs text-danger">${esc(recordatorio.errorEnvio)}</p>` : ""}
      </div>
      ${programado ? (`<button class="icon-button" type="button" data-cancel="${recordatorio.id}" aria-label="${uiText("recordatorios.cancelar_recordatorio_1", {1: esc(recordatorio.titulo)})}" title="${uiText("recordatorios.cancelar_recordatorio")}"><i class="bi bi-x-lg" aria-hidden="true"></i></button>`) : ""}
    </article>`);
  }

  async function cargarRecordatorios() {
    const recordatorios = await pedir(rutas.recordatorios);
    const pendientes = recordatorios.filter(item => item.estado === "PROGRAMADO");
    const historial = recordatorios.filter(item => item.estado !== "PROGRAMADO" && item.estado !== "CANCELADO");
    $("#scheduled-count").textContent = pendientes.length ? (uiText("recordatorios.0_aviso_1_programado_2", {0: pendientes.length, 1: pendientes.length === 1 ? "" : "s", 2: pendientes.length === 1 ? "" : "s"})) : uiText("recordatorios.no_tienes_avisos_pendientes");
    $("#reminders-list").innerHTML = pendientes.length ? pendientes.map(tarjetaRecordatorio).join("")
      : (`<p class="text-sm text-muted">${uiText("recordatorios.anade_un_recordatorio_o_configura_los_avisos_de")}</p>`);
    $("#reminder-history").hidden = !historial.length;
    $("#reminders-history-list").innerHTML = historial.map(tarjetaRecordatorio).join("");
    $("#reminders-list").querySelectorAll("[data-cancel]").forEach(boton => boton.addEventListener("click", async () => {
      await mientrasGuarda(boton, async () => {
        try {
          await pedir(`${rutas.recordatorios}/${boton.dataset.cancel}`, { method: "DELETE" });
          avisar(uiText("recordatorios.recordatorio_cancelado"));
          await cargarRecordatorios();
        } catch (error) { avisar(error.message, "error"); }
      });
    }));
  }

  async function cargarApuntes() {
    const apuntes = await pedir(rutas.apuntes);
    $("#class-notes").hidden = !apuntes.length;
    $("#notes-list").innerHTML = apuntes.map(apunte => `<article class="tarjeta-lista flex items-start gap-3">
      <button class="task-check ${apunte.resuelto ? "is-done" : ""}" type="button" data-toggle-note="${apunte.id}"
        aria-label="${apunte.resuelto ? uiText("recordatorios.marcar_como_pendiente") : uiText("recordatorios.marcar_como_resuelto")}: ${esc(apunte.titulo)}"><i class="bi bi-check" aria-hidden="true"></i></button>
      <div><h3 class="text-sm ${apunte.resuelto ? "line-through text-muted" : ""}">${esc(apunte.titulo)}</h3>
      <p class="mt-1 text-xs text-muted">${esc(apunte.materia || uiText("recordatorios.pendiente_de_clase"))}${apunte.fechaLimite ? ` · ${esc(apunte.fechaLimite)}` : ""}</p></div>
    </article>`).join("");
    $("#notes-list").querySelectorAll("[data-toggle-note]").forEach(boton => boton.addEventListener("click", async () => {
      await mientrasGuarda(boton, async () => {
        try {
          const apunte = apuntes.find(item => String(item.id) === boton.dataset.toggleNote);
          await pedir(`${rutas.apuntes}/${apunte.id}/resuelto`, { method: "PATCH", body: JSON.stringify({ resuelto: !apunte.resuelto }) });
          await Promise.all([cargarApuntes(), cargarRecordatorios()]);
        } catch (error) { avisar(error.message, "error"); }
      });
    }));
  }

  async function init() {
    app.renderNavigation?.();
    $("#preferences-form").addEventListener("submit", guardarPreferencias);
    $("#reminder-form").addEventListener("submit", crearRecordatorio);
    $("#reminder-form").addEventListener("input", actualizarPrevisualizacion);
    $("#open-reminder").addEventListener("click", () => {
      feedback("#reminder-feedback", "");
      const hoy = new Date();
      $("#reminder-date").min = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(hoy.getDate()).padStart(2, "0")}`;
      $("#reminder-dialog").showModal();
    });
    $("#open-preferences").addEventListener("click", () => {
      if (estado.preferencias) volcarPreferencias(estado.preferencias);
      feedback("#preferences-feedback", "");
      $("#preferences-dialog").showModal();
    });
    document.querySelectorAll("[data-close-dialog]").forEach(boton => boton.addEventListener("click", () => boton.closest("dialog").close()));
    $("#reprogram").addEventListener("click", evento => mientrasGuarda(evento.currentTarget, async () => {
      try {
        await pedir(`${rutas.recordatorios}/reprogramar`, { method: "POST" });
        await cargarRecordatorios();
        avisar(uiText("recordatorios.avisos_actualizados_desde_tus_pendientes"), "success");
      } catch (error) { avisar(error.message, "error"); }
    }));
    $("#test-message").addEventListener("click", evento => mientrasGuarda(evento.currentTarget, async () => {
      if (!estado.preferencias
          || $("#whatsapp-phone").value.trim() !== (estado.preferencias.telefonoWhatsapp || "")
          || $("#reminders-active").checked !== estado.preferencias.activo) {
        feedback("#preferences-feedback", uiText("recordatorios.guarda_la_configuracion_antes_de_enviar_la_prueba"));
        return;
      }
      try {
        const resultado = await pedir(`${rutas.recordatorios}/prueba`, { method: "POST" });
        feedback("#preferences-feedback", resultado.mensaje, "success");
      } catch (error) { feedback("#preferences-feedback", error.message); }
    }));
    try {
      volcarPreferencias(await pedir(rutas.preferenciasRecordatorio));
      await Promise.all([cargarApuntes(), cargarRecordatorios()]);
    } catch (error) {
      $("#gateway-status").textContent = (uiText("recordatorios.no_se_pudieron_cargar_los_recordatorios_0", {0: error.message}));
      $("#scheduled-count").textContent = uiText("recordatorios.vuelve_a_cargar_la_pagina_para_intentarlo_de");
    }
  }
  init();
}
