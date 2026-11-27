/*
 * Espacio de trabajo de un proyecto.
 *
 * Lee y escribe contra la API REST. Antes usaba localStorage, donde los
 * proyectos de ejemplo tenían identificadores propios ("proy-cogni") que no
 * coincidían con los códigos de la base ("cognitiva"): al abrir un proyecto por
 * su URL no se encontraba nada y la página se quedaba cargando para siempre.
 */
export function mount(scope) {
  const { t: uiText, StudyFlowLanguage } = scope;
  const { document, listen, request, later, animate } = scope;

  const app = scope.app || {};
  const esc = app.escapeHTML || ((valor) => String(valor ?? ""));
  const codigo = document.body.dataset.projectId
    || decodeURIComponent(window.location.pathname.split("/").filter(Boolean).pop() || "");

  const COLOR_ESTADO = {
    "sin-empezar": "bg-[var(--chip-neutro)] text-muted",
    "en-proceso": "bg-primary-soft text-[var(--estado-primary)]",
    "en-revision": "bg-warning-soft text-[var(--estado-warning)]",
    "terminada": "bg-success-soft text-[var(--estado-success)]"
  };
  /* Bandas horarias del calendario del proyecto. */
  const BANDAS = ["08:00", "10:00", "12:00", "14:00", "16:00"];
  const DIAS = [uiText("crear_horario.lun"), uiText("crear_horario.mar"), uiText("crear_horario.mie"), uiText("crear_horario.jue"), uiText("crear_horario.vie"), uiText("crear_horario.sab"), uiText("crear_horario.dom")];

  const estado = { proyecto: null, filtro: "all" };
  const $ = (selector) => document.querySelector(selector);

  async function pedir(url, opciones = {}) {
    const esFormulario = opciones.body instanceof FormData;
    const respuesta = await request(url, {
      ...opciones,
      headers: { ...(esFormulario ? {} : { "Content-Type": "application/json" }), ...(opciones.headers || {}) }
    });
    // Sesión perdida o caducada: se vuelve al acceso en lugar de fallar a medias.
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

  const avisar = (mensaje, tipo = "info") => {
    if (typeof app.showToast === "function") app.showToast(mensaje, tipo);
  };

  function limpiarErrorTarea() {
    const aviso = $("#task-form-error");
    if (!aviso) return;
    aviso.hidden = true;
    aviso.textContent = "";
  }

  function mostrarErrorTarea(mensaje) {
    const aviso = $("#task-form-error");
    if (!aviso) return avisar(mensaje, "error");
    aviso.textContent = mensaje;
    aviso.hidden = false;
  }

  const iniciales = (nombre) => String(nombre || "?").trim().split(/\s+/).slice(0, 2)
    .map((parte) => parte[0]).join("").toUpperCase();

  function fechaCorta(iso) {
    if (!iso) return uiText("fases.sin_fecha");
    const fecha = new Date(`${iso}T12:00:00`);
    return Number.isNaN(fecha.getTime())
      ? iso
      : new Intl.DateTimeFormat(StudyFlowLanguage.locale(), { day: "numeric", month: "short" }).format(fecha).replace(".", "");
  }

  function diasRestantes(iso) {
    if (!iso) return "";
    const fecha = new Date(`${iso}T00:00:00`);
    if (Number.isNaN(fecha.getTime())) return "";
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const dias = Math.round((fecha - hoy) / 86400000);
    if (dias < 0) return (uiText("proyecto.vencio_hace_0_dia_1", {0: Math.abs(dias), 1: Math.abs(dias) === 1 ? "" : "s"}));
    if (dias === 0) return uiText("proyecto.es_hoy");
    return dias === 1 ? uiText("proyecto.falta_1_dia") : (uiText("proyecto.faltan_0_dias", {0: dias}));
  }

  /* ------------------------------------------------------------ cabecera */

  function pintarCabecera(proyecto) {
    $("[data-manage-members]").hidden = !scope.sandbox && proyecto.propietarioId !== scope.user?.id;
    $(".project-color-mark").style.background = proyecto.color || "#5b5ce2";
    $(".project-stage-label").textContent = proyecto.etapaActual || uiText("proyectos.en_curso");
    $(".detail-project-name").textContent = proyecto.nombre;
    $(".detail-project-description").textContent = proyecto.descripcion || uiText("proyecto.sin_descripcion_todavia");

    $(".detail-progress-value").textContent = `${proyecto.progreso}%`;
    $(".progress-fill").style.setProperty("--progress", `${proyecto.progreso}%`);
    const terminadas = proyecto.tareas.filter((tarea) => tarea.estado === "terminada").length;
    $(".progress-caption").textContent =
      (uiText("proyecto.0_de_1_tarea_2_terminada_3", {0: terminadas, 1: proyecto.tareas.length, 2: proyecto.tareas.length === 1 ? "" : "s", 3: terminadas === 1 ? "" : "s"}));

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
          ${esEntrega ? (`<span class="calendar-due-marker"><i class="bi bi-flag"></i>${" " + uiText("proyecto.entrega")}</span>`) : ""}
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
          <span><i class="bi bi-person"></i> ${esc(tarea.responsable || uiText("entregables.sin_responsable"))}</span>
          <span><i class="bi bi-calendar3"></i> ${esc(fechaCorta(tarea.fechaLimite))} · ${esc(tarea.horaLimite || "09:00")}</span>
          <span><i class="bi bi-flag"></i> ${esc(app.statusLabel(tarea.estado))}</span>
        </span>
      </button>`;
  }

  /* ------------------------------------------------------------ tareas */

  function pintarTareas(proyecto) {
    const contenedor = $("#project-tasks");
    const visibles = proyecto.tareas.filter((tarea) =>
      estado.filtro === "all" || tarea.estado === estado.filtro);

    if (!visibles.length) {
      contenedor.innerHTML = (`<div class="empty-tasks"><div>
          <i class="bi bi-list-check text-2xl text-primary"></i>
          <h3>${uiText("proyecto.no_hay_tareas_que_mostrar")}</h3>
          <p>${uiText("proyecto.cambia_el_filtro_o_crea_una_tarea_nueva")}</p>
        </div></div>`);
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
      chip.textContent = app.statusLabel(tarea.estado);
      (COLOR_ESTADO[tarea.estado] || "").split(" ").filter(Boolean)
        .forEach((clase) => chip.classList.add(clase));

      fragmento.querySelector(".task-title").textContent = tarea.titulo;
      fragmento.querySelector(".task-description").textContent = tarea.descripcion || uiText("proyecto.sin_descripcion");
      fragmento.querySelector(".task-stage").textContent = tarea.etapa || uiText("proyecto.sin_etapa");
      fragmento.querySelector(".task-date time").textContent = fechaCorta(tarea.fechaLimite);

      // El color va en la tarjeta, no solo en el punto: pinta también el
      // borde izquierdo, que es lo que permite reconocer de quién es de un vistazo.
      const color = tarea.colorResponsable || "#c9cfe0";
      tarjeta.style.setProperty("--assignee-color", color);
      const responsable = fragmento.querySelector(".task-assignee");
      responsable.querySelector(".assignee-dot").style.setProperty("--assignee-color", color);
      responsable.querySelector("span").textContent = tarea.responsable || uiText("entregables.sin_responsable");

      fragmento.querySelector(".task-check")
        .addEventListener("click", () => alternarTerminada(tarea));
      fragmento.querySelector(".task-menu-button")
        .addEventListener("click", () => abrirDialogoTarea(tarea.id));

      contenedor.append(fragmento);
    });
  }

  async function alternarTerminada(tarea) {
    if (tarea.estado !== "terminada") {
      abrirDialogoTarea(tarea.id, true);
      return;
    }
    try {
      await pedir(`/api/tareas/${tarea.id}/estado`, {
        method: "PATCH",
        body: JSON.stringify({ estado: "sin-empezar" })
      });
      await cargar();
    } catch (error) {
      avisar(error.message, "error");
    }
  }

  /* ------------------------------------------------------------ diálogos */

  function opcionesResponsable(select, seleccionado) {
    select.innerHTML = (`<option value="">${uiText("fases.sin_asignar")}</option>`)
      + estado.proyecto.integrantes.map((integrante) =>
          `<option value="${esc(integrante.nombre)}"${integrante.nombre === seleccionado ? " selected" : ""}>${esc(integrante.nombre)}</option>`
        ).join("");
  }

  function opcionesEtapa(seleccionada) {
    $("#task-stage-input").innerHTML = estado.proyecto.etapas.map((etapa) =>
      `<option value="${esc(etapa)}"${etapa === seleccionada ? " selected" : ""}>${esc(etapa)}</option>`
    ).join("");
  }

  function mostrarResultado(tarea = null) {
    const vaATerminar = $("#task-status-input").value === "terminada";
    const seccion = $("#task-result-section");
    seccion.hidden = !vaATerminar;
    if (!vaATerminar) return;
    const enlace = $("#task-result-file-link");
    enlace.hidden = !tarea?.archivoResultadoUrl;
    if (tarea?.archivoResultadoUrl) {
      enlace.href = tarea.archivoResultadoUrl;
      enlace.querySelector("span").textContent = tarea.archivoResultadoNombre || uiText("fases.archivo_de_resultado");
    }
  }

  async function completarConResultado(tareaId, resultado, archivo) {
    const datos = new FormData();
    if (resultado) datos.append("resultado", resultado);
    if (archivo) datos.append("archivo", archivo);
    return pedir(`/api/tareas/${tareaId}/completar`, { method: "PATCH", body: datos });
  }

  function abrirDialogoTarea(tareaId, marcarComoTerminada = false) {
    const tarea = tareaId ? estado.proyecto.tareas.find((item) => item.id === tareaId) : null;

    limpiarErrorTarea();
    $("#task-dialog-kicker").textContent = tarea ? uiText("fases.editar_tarea") : uiText("proyecto.nueva_tarea");
    $("#task-dialog-title").textContent = tarea ? tarea.titulo : uiText("proyecto.anadir_tarea");
    $("#editing-task-id").value = tarea ? tarea.id : "";
    $("#task-title-input").value = tarea ? tarea.titulo : "";
    $("#task-description-input").value = tarea ? tarea.descripcion || "" : "";
    $("#task-date-input").value = tarea ? tarea.fechaLimite || "" : "";
    $("#task-status-input").value = marcarComoTerminada ? "terminada" : (tarea ? tarea.estado : "sin-empezar");
    $("#task-result-input").value = tarea ? tarea.resultadoTexto || "" : "";
    $("#task-result-file").value = "";
    opcionesResponsable($("#task-assignee-input"), tarea ? tarea.responsable : "");
    opcionesEtapa(tarea ? tarea.etapa : estado.proyecto.etapaActual);
    mostrarResultado(tarea);
    $("#task-dialog").showModal();
  }

  async function guardarTarea(evento) {
    evento.preventDefault();
    limpiarErrorTarea();
    const titulo = $("#task-title-input").value.trim();
    if (!titulo) {
      mostrarErrorTarea(uiText("proyecto.la_tarea_necesita_un_nombre"));
      return;
    }
    const quiereTerminar = $("#task-status-input").value === "terminada";
    const resultado = $("#task-result-input").value.trim();
    const archivo = $("#task-result-file").files[0];
    const tareaPrevia = $("#editing-task-id").value
      ? estado.proyecto.tareas.find((item) => item.id === Number($("#editing-task-id").value))
      : null;
    if (quiereTerminar && !resultado && !archivo && !tareaPrevia?.tieneResultado) {
      mostrarErrorTarea(uiText("fases.para_terminar_la_tarea_debes_escribir_un_resultado"));
      return;
    }
    const cuerpo = {
      titulo,
      descripcion: $("#task-description-input").value.trim(),
      responsable: $("#task-assignee-input").value || null,
      etapa: $("#task-stage-input").value,
      fechaLimite: $("#task-date-input").value || null,
      horaLimite: "09:00",
      estado: quiereTerminar && !tareaPrevia?.tieneResultado
        ? tareaPrevia?.estado || "sin-empezar"
        : $("#task-status-input").value
    };
    const id = $("#editing-task-id").value;

    try {
      let guardada;
      if (id) {
        guardada = await pedir(`/api/tareas/${id}`, { method: "PUT", body: JSON.stringify(cuerpo) });
      } else {
        guardada = await pedir(`/api/proyectos/${codigo}/tareas`, { method: "POST", body: JSON.stringify(cuerpo) });
      }
      if (quiereTerminar && (!tareaPrevia?.tieneResultado || resultado || archivo)) {
        await completarConResultado(guardada.id, resultado, archivo);
      }
      $("#task-dialog").close();
      await cargar();
      avisar(id ? uiText("fases.tarea_actualizada") : uiText("proyecto.tarea_creada"), "success");
    } catch (error) {
      mostrarErrorTarea(error.message);
    }
  }

  function filaIntegrante(integrante = {}) {
    const plantilla = $("#dialog-member-row-template");
    const fila = plantilla.content.firstElementChild.cloneNode(true);
    fila.querySelector(".member-row-avatar").textContent = iniciales(integrante.nombre) || "?";
    if (integrante.id) fila.dataset.memberId = integrante.id;
    const invitar = fila.querySelector("[data-invitar]");
    if (!scope.sandbox && integrante.id && !integrante.vinculado) {
      invitar.hidden = false;
      invitar.addEventListener("click", async () => {
        invitar.disabled = true;
        try {
          const { token } = await pedir(`/api/proyectos/${encodeURIComponent(codigo)}/integrantes/${integrante.id}/invitacion`,
            { method: "POST" });
          const link = `${location.origin}/invitacion#${token}`;
          try {
            await navigator.clipboard.writeText(link);
            avisar(uiText("proyecto.enlace_de_invitacion_copiado"), "success");
          } catch (_) {
            window.prompt(uiText("proyecto.copia_el_enlace_de_invitacion"), link);
          }
        } catch (error) {
          avisar(error.message, "error");
        } finally {
          invitar.disabled = false;
        }
      });
    }
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
        id: fila.dataset.memberId ? Number(fila.dataset.memberId) : null,
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
      avisar(uiText("proyecto.equipo_actualizado"), "success");
    } catch (error) {
      avisar(error.message, "error");
    }
  }

  /* ------------------------------------------------------------ carga */

  function enlazarDetalle() {
    document.querySelectorAll("[data-project-section]").forEach((enlace) => {
      enlace.href = `/proyectos/${encodeURIComponent(codigo)}/${enlace.dataset.projectSection}`;
    });
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
    $("#task-status-input").addEventListener("change", () => mostrarResultado(
      estado.proyecto.tareas.find((item) => item.id === Number($("#editing-task-id").value))
    ));
    $("#members-form").addEventListener("submit", guardarEquipo);
    $("#dialog-add-member").addEventListener("click", () => filaIntegrante());
    document.querySelectorAll("[data-close-dialog]").forEach((boton) =>
      boton.addEventListener("click", () => boton.closest("dialog").close()));

    try {
      await cargar();
    } catch (error) {
      $("#project-content").innerHTML = (`<section class="empty-tasks"><div>
          <i class="bi bi-folder-x text-2xl text-danger"></i>
          <h3>${uiText("proyecto.no_encontramos_este_proyecto")}</h3>
          <p>${esc(error.message)}</p>
          <a class="btn btn-primary mt-3" href="/proyectos">${uiText("crear_proyecto.volver_a_proyectos")}</a>
        </div></section>`);
    }
  }

  init();
}
