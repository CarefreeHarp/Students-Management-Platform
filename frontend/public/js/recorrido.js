/* Interactive, non-modal spotlight: the real interface stays usable. */
export function mount(scope) {
  const { t: uiText } = scope;
  const { document, listen, later, animate, app: App } = scope;
  async function init() {
    const params = new URLSearchParams(location.search);
    const bridge = window.SandboxBridge;
    const chapter = Number(params.get("recorrido"));
    if (
      !Number.isInteger(chapter) ||
      chapter < 1 ||
      chapter > (bridge ? 9 : 7) ||
      !document.querySelector("#main-nav") ||
      (bridge && !bridge.tourActive)
    )
      return;
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const esc = App.escapeHTML;
    let project = bridge?.projectCode?.() || null;
    if (!project) {
      try {
        project = (await App.api("/api/proyectos"))[0]?.codigo;
      } catch (_) {
        /* Empty/offline accounts still have a tour. */
      }
    }
    const projectUrl = project
      ? `/proyectos/${encodeURIComponent(project)}`
      : "/proyectos";
    const regularChapters = [
      {
        url: "/panel",
        label: uiText("main.inicio"),
        spots: [
          {
            title: uiText("crear_horario.tu_semana"),
            text: uiText("recorrido.tus_tareas_organizadas_por_dia_abre_una_para"),
            target: ".calendar-shell",
            mobile:
              ".dashboard-agenda-day:has(.dashboard-agenda-task), .dashboard-agenda-day",
            landscape: ".calendar-actions",
            fallback: ".dashboard-overview > .panel",
          },
          {
            title: uiText("recorrido.lo_que_sigue"),
            text: uiText("recorrido.pendientes_y_progreso_de_cada_proyecto_en_un"),
            target: ".overview-project",
            fallback: ".project-overview",
          },
        ],
      },
      {
        url: "/proyectos",
        label: uiText("perfil.proyectos"),
        spots: [
          {
            title: uiText("landing.tus_proyectos"),
            text: project
              ? uiText("recorrido.abre_una_tarjeta_para_trabajar_con_tu_equipo")
              : uiText("recorrido.aqui_apareceran_los_proyectos_que_crees"),
            target: ".project-card",
            fallback: "#projects-grid",
            advanceLink: projectUrl,
          },
        ],
      },
      {
        url: projectUrl,
        label: uiText("recorrido.tu_proyecto"),
        spots: [
          {
            title: project ? uiText("recorrido.la_conversacion_cerca") : uiText("recorrido.tu_primer_proyecto"),
            text: project
              ? uiText("recorrido.entra_a_los_canales_de_este_proyecto")
              : uiText("recorrido.crea_un_proyecto_para_reunir_tareas_y_equipo"),
            target: ".project-channels-link",
            fallback: ".page-heading",
            advanceLink: project ? `${projectUrl}/canales` : null,
          },
        ],
      },
      {
        url: project ? `${projectUrl}/canales` : "/proyectos",
        label: uiText("canales.canales"),
        spots: project
          ? [
              {
                title: uiText("recorrido.cada_tema_su_canal"),
                text: uiText("recorrido.cambia_de_conversacion_sin_salir_del_proyecto"),
                target: "#channel-list",
                fallback: ".page-heading",
              },
              {
                title: uiText("recorrido.habla_con_tu_equipo"),
                text: uiText("recorrido.escribe_un_mensaje_o_comparte_un_archivo"),
                target: "#message-form",
                fallback: ".page-heading",
              },
            ]
          : [
              {
                title: uiText("recorrido.conversaciones_por_proyecto"),
                text: uiText("recorrido.cuando_crees_un_proyecto_sus_canales_apareceran_dentro"),
                target: ".page-heading",
              },
            ],
      },
      {
        url: "/horarios",
        label: uiText("main.horarios"),
        spots: [
          {
            title: uiText("recorrido.prueba_tus_horarios"),
            text: uiText("recorrido.anade_una_materia_con_sus_opciones_de_dias"),
            target: "#subject-editor",
          },
          {
            title: uiText("recorrido.a_tu_ritmo"),
            text: uiText("recorrido.elige_tus_pausas_y_horas_favoritas_la_ia"),
            target: ".schedule-preferences",
            mobile: "#schedule-preferences-title",
          },
        ],
      },
      {
        url: "/recordatorios",
        label: uiText("recordatorios.recordatorios"),
        spots: [
          {
            title: uiText("recorrido.que_no_se_te_pase"),
            text: uiText("recorrido.crea_un_aviso_y_decide_cuanto_antes_quieres"),
            target: "#open-reminder",
          },
          {
            title: uiText("recorrido.tus_tiempos_habituales"),
            text: uiText("recorrido.define_una_anticipacion_para_tareas_entregas_y_clases"),
            target: "#open-preferences",
          },
        ],
      },
      {
        url: "/panel",
        label: uiText("recorrido.todo_listo"),
        spots: [
          {
            title: uiText("recorrido.todo_listo"),
            text: uiText("recorrido.puedes_repetir_el_recorrido_desde_tu_perfil"),
            target: ".profile-trigger",
          },
        ],
      },
    ];
    const chapters = bridge
      ? [
          {
            url: "/panel",
            label: uiText("main.inicio"),
            spots: [
              {
                title: uiText("recorrido.este_espacio_es_tuyo"),
                text: uiText("recorrido.el_inicio_reune_tu_agenda_y_el_avance"),
                target: 'a[href="/proyectos/nuevo"]',
                fallback: ".page-heading",
                required: {
                  event: "click",
                  selector: 'a[href="/proyectos/nuevo"]',
                },
              },
            ],
          },
          {
            url: "/proyectos/nuevo",
            label: uiText("recorrido.crear"),
            spots: [
              {
                title: uiText("recorrido.nombra_tu_proyecto"),
                text: uiText("recorrido.el_nombre_identifica_este_espacio_de_trabajo_por"),
                target: "label.form-field:has(#project-name)",
                fallback: "#create-project-form",
                required: { event: "input", selector: "#project-name" },
              },
              {
                title: uiText("recorrido.describe_el_objetivo"),
                text: uiText("recorrido.describe_el_objetivo_y_el_alcance_por_ejemplo"),
                target: "label.form-field:has(#project-description)",
                fallback: "#create-project-form",
                required: { event: "input", selector: "#project-description" },
              },
              {
                title: uiText("recorrido.indica_la_entrega"),
                text: uiText("recorrido.esta_es_la_fecha_final_del_proyecto_las"),
                target: "label.form-field:has(#project-due-date)",
                fallback: "#create-project-form",
                required: { event: "change", selector: "#project-due-date" },
              },
              {
                title: uiText("recorrido.crea_una_fase"),
                text: uiText("recorrido.las_fases_agrupan_el_trabajo_por_momentos_como"),
                target: "#add-project-phase",
                fallback: "#project-phases-editor",
                required: { event: "click", selector: "#add-project-phase" },
                autoAdvance: true,
              },
              {
                title: uiText("recorrido.nombra_la_fase"),
                text: uiText("recorrido.pon_un_nombre_que_describa_el_momento_del"),
                target: ".project-phase-row:last-child .project-phase-name",
                fallback: "#project-phases-editor",
                required: {
                  event: "input",
                  selector: ".project-phase-row:last-child .project-phase-name",
                },
              },
              {
                title: uiText("recorrido.invita_a_tu_equipo"),
                text: uiText("recorrido.el_equipo_permite_asignar_responsables_y_saber_quien"),
                target: "#add-member",
                fallback: "#members-title",
                required: { event: "click", selector: "#add-member" },
                autoAdvance: true,
              },
              {
                title: uiText("recorrido.identifica_al_integrante"),
                text: uiText("recorrido.usa_un_nombre_o_identificador_para_reconocer_a"),
                target: ".member-input-row:last-child .member-name",
                fallback: "#members-title",
                required: {
                  event: "input",
                  selector: ".member-input-row:last-child .member-name",
                },
              },
              {
                title: uiText("recorrido.elige_como_colaborar"),
                text: uiText("recorrido.en_tareas_asignadas_eliges_responsable_al_crearlas_en"),
                target: ".reparto-create",
                fallback: "#work-mode-title",
                required: {
                  event: "change",
                  selector: 'input[name="modoReparto"]',
                },
                autoAdvance: true,
              },
              {
                title: uiText("recorrido.crea_tu_proyecto"),
                text: uiText("recorrido.al_crearlo_se_abre_su_espacio_de_trabajo"),
                target: '#create-project-form button[type="submit"]',
                fallback: "#create-project-form",
                required: {
                  event: "api",
                  method: "POST",
                  path: /^\/api\/proyectos$/,
                },
                autoAdvance: true,
              },
            ],
          },
          {
            url: projectUrl,
            label: uiText("landing.proyecto"),
            spots: [
              {
                title: uiText("recorrido.crea_la_tarea_inicial"),
                text: uiText("recorrido.una_tarea_representa_trabajo_concreto_como_entrevistar_usuarios"),
                target: "[data-new-task]",
                fallback: ".page-heading",
                required: {
                  event: "api",
                  method: "POST",
                  path: /^\/api\/proyectos\/[^/]+\/tareas$/,
                },
                autoAdvance: true,
              },
              {
                title: uiText("recorrido.crea_una_segunda_tarea"),
                text: uiText("recorrido.crea_otra_tarea_por_ejemplo_sintetizar_entrevistas_luego"),
                pulseCard: true,
                target: "[data-new-task]",
                fallback: ".page-heading",
                required: {
                  event: "api",
                  method: "POST",
                  path: /^\/api\/proyectos\/[^/]+\/tareas$/,
                },
                autoAdvance: true,
              },
            ],
          },
          {
            url: project ? `${projectUrl}/fases` : "/proyectos",
            label: uiText("recorrido.fases"),
            spots: [
              {
                title: uiText("recorrido.abre_la_segunda_tarea"),
                text: uiText("recorrido.al_abrir_una_tarea_puedes_actualizar_su_titulo"),
                target: "#diagram",
                fallback: ".branch-panel, .page-heading",
                required: {
                  event: "click",
                  selector: "#diagram [data-task]",
                },
                autoAdvance: true,
              },
              {
                title: uiText("recorrido.indica_la_dependencia"),
                text: uiText("recorrido.selecciona_la_primera_tarea_como_requisito_de_esta"),
                target: "#task-dependency",
                fallback: "#task-dialog",
                required: {
                  event: "api",
                  method: "POST",
                  path: /^\/api\/tareas\/\d+\/dependencias$/,
                },
                autoAdvance: true,
              },
              {
                title: uiText("recorrido.como_leer_el_diagrama"),
                text: uiText("recorrido.las_lineas_bajan_desde_la_tarea_que_debe"),
                target: "#diagram",
                fallback: ".branch-panel, .page-heading",
                guideOnly: true,
                wideCard: true,
              },
              {
                title: uiText("recorrido.todas_las_piezas_del_diagrama"),
                text: uiText("recorrido.este_arbol_muestra_fases_tareas_responsables_estados_y"),
                target: "#diagram",
                fallback: "#diagram, .branch-panel",
                seedDiagram: true,
                guideOnly: true,
                wideCard: true,
              },
            ],
          },
          {
            url: project ? `${projectUrl}/canales` : "/proyectos",
            label: uiText("canales.canales"),
            spots: [
              {
                title: uiText("recorrido.envia_un_mensaje"),
                text: uiText("recorrido.los_canales_ordenan_conversaciones_dentro_de_cada_proyecto"),
                target: "#message-form",
                fallback: "#channel-list",
                required: {
                  event: "api",
                  method: "POST",
                  path: /^\/api\/canales\/\d+\/mensajes$/,
                },
                autoAdvance: true,
              },
              {
                title: uiText("recorrido.tus_canales"),
                text: uiText("recorrido.esta_lista_reune_las_conversaciones_del_proyecto_elige"),
                target: ".channels-sidebar",
                fallback: "#channel-list, .page-heading",
              },
              {
                title: uiText("recorrido.la_conversacion"),
                text: uiText("recorrido.aqui_ves_los_mensajes_del_canal_que_seleccionaste"),
                target: ".channel-conversation",
                fallback: "#messages, #message-form",
              },
              {
                title: uiText("recorrido.recursos_compartidos"),
                text: uiText("recorrido.en_este_lado_aparecen_imagenes_documentos_y_el"),
                target: ".channel-resources",
                fallback: "#documents, .channel-conversation",
                nextLabel: uiText("recorrido.ver_documentos_y_entregables"),
              },
            ],
          },
          {
            url: project ? `${projectUrl}/entregables` : "/proyectos",
            label: uiText("canales.documentos"),
            spots: [
              {
                title: uiText("recorrido.registra_un_documento"),
                text: uiText("recorrido.los_entregables_son_evidencias_finales_o_parciales_del"),
                target: "#new-deliverable",
                fallback: ".page-heading",
                required: {
                  event: "api",
                  method: "POST",
                  path: /^\/api\/proyectos\/[^/]+\/entregables$/,
                },
                autoAdvance: true,
              },
              {
                title: uiText("recorrido.asi_quedo_tu_documento"),
                text: uiText("recorrido.aqui_quedan_visibles_los_documentos_y_enlaces_entregados"),
                target: "#deliverables .deliverable-card",
                fallback: "#deliverables",
              },
            ],
          },
          {
            url: "/horarios",
            label: uiText("main.horarios"),
            spots: [
              {
                title: uiText("recorrido.anade_una_materia"),
                text: uiText("recorrido.aqui_registras_materias_y_todas_sus_opciones_de"),
                target: "#subject-editor",
                required: { event: "local", path: "/horarios/materia" },
                autoAdvance: true,
              },
              {
                title: uiText("recorrido.elige_tu_ritmo"),
                text: uiText("recorrido.estas_preferencias_sirven_para_comparar_opciones_de_materias"),
                target: ".schedule-preferences",
                mobile: "#schedule-preferences-title",
                required: {
                  event: "change",
                  selector: "#schedule-preferences input",
                },
                autoAdvance: true,
              },
            ],
          },
          {
            url: "/recordatorios",
            label: uiText("recordatorios.recordatorios"),
            spots: [
              {
                title: uiText("recorrido.crea_un_aviso"),
                text: uiText("recorrido.un_recordatorio_avisa_sobre_algo_puntual_como_una"),
                target: "#open-reminder",
                required: {
                  event: "api",
                  method: "POST",
                  path: /^\/api\/recordatorios$/,
                },
                autoAdvance: true,
              },
              {
                title: uiText("recorrido.ajusta_tus_tiempos"),
                text: uiText("recorrido.esta_configuracion_define_tus_avisos_habituales_por_tipo"),
                target: "#open-preferences",
                required: {
                  event: "api",
                  method: "PUT",
                  path: /^\/api\/recordatorios\/preferencias$/,
                },
                autoAdvance: true,
              },
            ],
          },
          {
            url: "/panel",
            label: uiText("recorrido.listo"),
            spots: [
              {
                title: uiText("recorrido.ahora_si_tu_propio_flow"),
                text: uiText("recorrido.ya_viste_como_se_conectan_proyectos_tareas_dependencias"),
                target: ".project-overview",
                fallback: ".page-heading",
              },
            ],
          },
        ]
      : regularChapters;
    const current = chapters[chapter - 1];
    let spotIndex = Math.trunc(
      Math.min(
        current.spots.length - 1,
        Math.max(0, Number(params.get("enfoque")) || 0),
      ),
    );
    let target = null,
      companion = null,
      closed = false,
      frame = 0,
      cancelWait = null,
      generation = 0,
      position = null,
      destination = null,
      moving = false,
      shown = false,
      stepComplete =
        !current.spots[spotIndex].required ||
        Boolean(bridge?.isTourStepComplete?.(chapter, spotIndex));
    const timers = new Map();
    const wait = (duration) =>
      motion.matches
        ? Promise.resolve()
        : new Promise((resolve) => {
            const timer = later(() => {
              timers.delete(timer);
              resolve();
            }, duration);
            timers.set(timer, resolve);
          });
    const originalFocus = document.activeElement;
    const layer = document.createElement("div");
    layer.className = "tour-layer";
    layer.innerHTML =
      (`<div class="tour-blocker tour-blocker-top" aria-hidden="true"></div><div class="tour-blocker tour-blocker-right" aria-hidden="true"></div><div class="tour-blocker tour-blocker-bottom" aria-hidden="true"></div><div class="tour-blocker tour-blocker-left" aria-hidden="true"></div><div class="tour-spotlight" aria-hidden="true"></div><div class="tour-companion-halo" aria-hidden="true"></div><section class="tour-card" aria-label="${uiText("main.recorrido_guiado")}" aria-describedby="tour-description"><div class="tour-card-content"></div></section>`);
    document.body.append(layer);
    const spotlight = layer.querySelector(".tour-spotlight"),
      companionHalo = layer.querySelector(".tour-companion-halo"),
      card = layer.querySelector(".tour-card"),
      content = layer.querySelector(".tour-card-content"),
      blockers = [...layer.querySelectorAll(".tour-blocker")];
    let layerDialog = null;
    const resizeObserver = new ResizeObserver(scheduleLayout);
    scope.onDestroy(() => close(false, true));
    resizeObserver.observe(card);
    // Native dialogs live in the browser's top layer, above any normal fixed
    // element. When a guided action is inside one, move the existing tour layer
    // into that same dialog so both the text card and its spotlight remain visible.
    function mountLayerForTarget() {
      const dialog = target?.closest?.("dialog[open]") || null;
      if (dialog === layerDialog) return;
      (dialog || document.body).append(layer);
      layerDialog = dialog;
    }
    function visible(selector) {
      return selector
        ?.split(",")
        .map((s) => document.querySelector(s.trim()))
        .find(
          (el) =>
            el &&
            el.getBoundingClientRect().width > 0 &&
            el.getBoundingClientRect().height > 0,
        );
    }
    function includeFieldLabel(element) {
      if (!element?.matches?.("input, select, textarea")) return element;
      return element.closest?.("label.form-field, .form-field") || element;
    }
    function findTarget() {
      const spot = current.spots[spotIndex];
      return includeFieldLabel(
        visible(
          innerHeight < 560 && innerWidth >= 720 ? spot.landscape : null,
        ) ||
          visible(innerWidth <= 620 ? spot.mobile : null) ||
          visible(spot.target),
      );
    }
    function updateCompanion() {
      companion = visible(current.spots[spotIndex].companion);
      if (!companion) companionHalo.style.visibility = "hidden";
    }
    function updateCompanionHalo(width, height, offsetX, offsetY) {
      if (!companion) return;
      const rect = companion.getBoundingClientRect(),
        padding = 8;
      const left = Math.max(offsetX, rect.left - padding);
      const top = Math.max(offsetY, rect.top - padding);
      const right = Math.min(offsetX + width, rect.right + padding);
      const bottom = Math.min(offsetY + height, rect.bottom + padding);
      const visible = right > left && bottom > top;
      companionHalo.style.visibility = visible ? "visible" : "hidden";
      if (!visible) return;
      Object.assign(companionHalo.style, {
        left: `${left}px`,
        top: `${top}px`,
        width: `${right - left}px`,
        height: `${bottom - top}px`,
      });
    }
    function updateInteractionBlockers(rect, width, height, offsetX, offsetY) {
      if (blockers.length !== 4) return;
      const viewLeft = offsetX,
        viewTop = offsetY,
        viewRight = offsetX + width,
        viewBottom = offsetY + height,
        padding = 2;
      const left = rect
          ? Math.max(viewLeft, Math.min(viewRight, rect.left - padding))
          : viewLeft,
        top = rect
          ? Math.max(viewTop, Math.min(viewBottom, rect.top - padding))
          : viewTop,
        right = rect
          ? Math.max(left, Math.min(viewRight, rect.right + padding))
          : viewLeft,
        bottom = rect
          ? Math.max(top, Math.min(viewBottom, rect.bottom + padding))
          : viewTop;
      const set = (node, x, y, w, h) => {
        Object.assign(node.style, {
          left: `${x}px`,
          top: `${y}px`,
          width: `${Math.max(0, w)}px`,
          height: `${Math.max(0, h)}px`,
        });
      };
      set(blockers[0], viewLeft, viewTop, width, top - viewTop);
      set(blockers[1], right, top, viewRight - right, bottom - top);
      set(blockers[2], viewLeft, bottom, width, viewBottom - bottom);
      set(blockers[3], viewLeft, top, left - viewLeft, bottom - top);
    }
    function actionMatches(requirement, event) {
      if (!requirement) return false;
      if (requirement.event === "api" || requirement.event === "local") {
        const detail = event.detail || {};
        return (
          detail.method === requirement.method &&
          requirement.path.test(detail.path || "")
        );
      }
      if (event.type !== requirement.event) return false;
      return Boolean(event.target?.closest?.(requirement.selector));
    }
    function completeStep(event) {
      const spot = current.spots[spotIndex],
        completedIndex = spotIndex,
        requirement = spot.required;
      if (closed || stepComplete || !actionMatches(requirement, event)) return;
      stepComplete = true;
      bridge?.completeTourStep?.(chapter, spotIndex);
      const nextButton = content.querySelector("[data-tour-next]");
      if (nextButton) {
        nextButton.disabled = false;
        nextButton.removeAttribute("aria-describedby");
      }
      if (spot.autoAdvance) {
        wait(240).then(() => {
          if (
            !closed &&
            !moving &&
            stepComplete &&
            spotIndex === completedIndex
          )
            next();
        });
      }
    }
    function waitForTarget() {
      cancelWait?.();
      return new Promise((resolve) => {
        const existing = findTarget();
        if (existing) {
          resolve(existing);
          return;
        }
        let observer,
          timer,
          finished = false;
        const finish = (value) => {
          if (finished) return;
          finished = true;
          observer?.disconnect();
          clearTimeout(timer);
          if (cancelWait === cancel) cancelWait = null;
          resolve(value);
        };
        const cancel = () => finish(null);
        const fallback = () =>
          visible(current.spots[spotIndex].fallback) ||
          visible(".page-heading") ||
          document.querySelector("main");
        cancelWait = cancel;
        observer = new MutationObserver(() => {
          const found = findTarget();
          if (found) finish(found);
        });
        const root = document.body;
        if (!root) {
          finish(fallback());
          return;
        }
        observer.observe(root, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ["open", "hidden", "class", "style"],
        });
        timer = later(() => finish(fallback()), 2500);
      });
    }
    function layout() {
      const viewport = window.visualViewport;
      const width = viewport?.width || innerWidth,
        height = viewport?.height || innerHeight;
      const offsetX = viewport?.offsetLeft || 0,
        offsetY = viewport?.offsetTop || 0,
        margin = 12;
      const preferred = findTarget();
      if (preferred && preferred !== target) {
        if (target) resizeObserver.unobserve(target);
        target = preferred;
        resizeObserver.observe(target);
        mountLayerForTarget();
      }
      const rect = target?.getBoundingClientRect();
      updateCompanionHalo(width, height, offsetX, offsetY);
      const compact = width < 720;
      const guideOnly = Boolean(current.spots[spotIndex].guideOnly);
      const wideCard = Boolean(current.spots[spotIndex].wideCard);
      const pulseCard = Boolean(current.spots[spotIndex].pulseCard);
      const guideSide = guideOnly && width >= 920 && height >= 560;
      const leftLimit = offsetX + margin,
        rightLimit = offsetX + width - margin,
        topLimit = offsetY + margin,
        bottomLimit = offsetY + height - margin;
      card.classList.toggle("tour-card--wide", wideCard);
      card.classList.toggle("tour-card--pulse", pulseCard);
      // Diagram explanations need enough measure to remain readable. They use
      // a fixed side card on desktop instead of shrinking to a narrow gutter.
      const preferredCardWidth =
        guideSide && wideCard
          ? 528
          : guideSide
            ? 394
            : wideCard
              ? 528
              : height < 560 && width >= 720
                ? 408
                : 442;
      const cardWidth = Math.min(
        preferredCardWidth,
        Math.max(1, width - margin * 2),
      );
      card.style.width = `${cardWidth}px`;
      card.style.maxHeight = `${Math.max(1, height - margin * 2)}px`;
      const cardHeight = Math.min(
        card.offsetHeight,
        Math.max(1, height - margin * 2),
      );
      const clamp = (value, min, max) =>
        Math.max(min, Math.min(value, Math.max(min, max)));
      const intersects =
        rect &&
        rect.right > leftLimit &&
        rect.left < rightLimit &&
        rect.bottom > topLimit &&
        rect.top < bottomLimit;
      if (!intersects) {
        // Scrolling away must never draw a window of light over unrelated UI.
        spotlight.style.visibility = "hidden";
        destination = null;
        position = null;
        card.style.left = `${clamp(rightLimit - cardWidth, leftLimit, rightLimit - cardWidth)}px`;
        card.style.top = `${clamp(bottomLimit - cardHeight, topLimit, bottomLimit - cardHeight)}px`;
        card.dataset.placement = "detached";
        updateInteractionBlockers(null, width, height, offsetX, offsetY);
        return;
      }
      updateInteractionBlockers(rect, width, height, offsetX, offsetY);
      // Keep padding symmetric. Near an edge, clamping only one side shifts the
      // halo away from the focused button instead of keeping it centered.
      const focusMargin = 4;
      const horizontalPadding = Math.max(
        0,
        Math.min(
          8,
          rect.left - (offsetX + focusMargin),
          offsetX + width - focusMargin - rect.right,
        ),
      );
      const verticalPadding = Math.max(
        0,
        Math.min(
          8,
          rect.top - (offsetY + focusMargin),
          offsetY + height - focusMargin - rect.bottom,
        ),
      );
      let left = rect.left - horizontalPadding,
        top = rect.top - verticalPadding;
      let right = rect.right + horizontalPadding,
        bottom = rect.bottom + verticalPadding;
      let cardX, cardY, placement;
      if (guideSide) {
        // A guide-only step deliberately leaves a large diagram usable. Pin its
        // card to the viewport edge instead of centering it over the target.
        // This keeps the heading, legend and branches readable while preserving
        // the blockers' interaction hole around the real diagram.
        const nav = document.querySelector("#main-nav");
        const navRect = nav?.getBoundingClientRect?.();
        const navIsPinned =
          nav && ["fixed", "sticky"].includes(getComputedStyle(nav).position);
        const headerBottom =
          navIsPinned &&
          navRect &&
          navRect.bottom > offsetY &&
          navRect.top < offsetY + height
            ? navRect.bottom
            : offsetY;
        cardX = rightLimit - cardWidth;
        cardY = Math.max(topLimit, headerBottom + 16);
        placement = "guide-side";
      } else if (guideOnly) {
        // Narrow and short screens retain a compact, reachable bottom dock.
        cardX = offsetX + (width - cardWidth) / 2;
        cardY = bottomLimit - cardHeight;
        placement = "guide-bottom";
      } else if (!compact && rightLimit - right >= cardWidth + 20) {
        cardX = right + 20;
        cardY = Math.max(topLimit, Math.min(top, bottomLimit - cardHeight));
        placement = "right";
      } else if (!compact && left - leftLimit >= cardWidth + 20) {
        cardX = left - cardWidth - 20;
        cardY = Math.max(topLimit, Math.min(top, bottomLimit - cardHeight));
        placement = "left";
      } else {
        cardX =
          offsetX +
          Math.max(
            margin,
            Math.min(
              width - cardWidth - margin,
              (left + right - cardWidth) / 2 - offsetX,
            ),
          );
        if (top - topLimit >= cardHeight + 20) {
          cardY = top - cardHeight - 20;
          placement = "above";
        } else {
          cardY = Math.min(bottom + 20, bottomLimit - cardHeight);
          placement = "below";
          bottom = Math.min(bottom, cardY - 16);
        }
      }
      cardX = clamp(cardX, leftLimit, rightLimit - cardWidth);
      cardY = clamp(cardY, topLimit, bottomLimit - cardHeight);
      const focusVisible = right > left && bottom > top;
      // The full example diagram is intentionally larger than a normal control.
      // Keeping a spotlight around it would obscure the very dependency tree this
      // step is meant to explain, so this guide uses the card glow by itself.
      spotlight.style.visibility =
        focusVisible && !guideOnly ? "visible" : "hidden";
      // Keep the focused element centered while the halo grows or moves.
      // Animating from the top-left made short buttons look offset mid-transition.
      destination = focusVisible
        ? {
            x: (left + right) / 2,
            y: (top + bottom) / 2,
            w: right - left,
            h: bottom - top,
          }
        : null;
      if (!focusVisible) position = null;
      card.style.left = `${Math.round(cardX)}px`;
      card.style.top = `${Math.round(cardY)}px`;
      card.dataset.placement = placement;
    }
    let lastFrameTime = 0;
    function draw(timestamp) {
      frame = 0;
      if (closed) return;
      layout();
      if (!destination) return;
      const elapsed =
        Number.isFinite(timestamp) && lastFrameTime
          ? Math.min(50, Math.max(1, timestamp - lastFrameTime))
          : 1000 / 60;
      lastFrameTime = Number.isFinite(timestamp) ? timestamp : 0;
      const easing = 1 - Math.pow(1 - 0.075, elapsed / (1000 / 60));
      if (!position)
        position = {
          x: destination.x + destination.w / 2,
          y: destination.y + destination.h / 2,
          w: 0,
          h: 0,
        };
      let distance = 0;
      for (const key of ["x", uiText("recorrido.y"), "w", "h"]) {
        const gap = destination[key] - position[key];
        distance += Math.abs(gap);
        position[key] =
          motion.matches || Math.abs(gap) < 0.35
            ? destination[key]
            : position[key] + gap * easing;
      }
      spotlight.style.transform = `translate3d(${position.x - position.w / 2}px,${position.y - position.h / 2}px,0)`;
      spotlight.style.width = `${position.w}px`;
      spotlight.style.height = `${position.h}px`;
      if (distance > 1) frame = animate(draw);
    }
    function scheduleLayout() {
      if (!closed && !frame) {
        lastFrameTime = 0;
        frame = animate(draw);
      }
    }
    async function prepareRealDiagram(spot) {
      if (
        !spot.seedDiagram ||
        !bridge ||
        params.get("arbol") === "real" ||
        bridge.isTourDiagramPrepared?.(project) ||
        typeof bridge.prepareTourDiagram !== "function"
      )
        return false;
      try {
        const prepared = await bridge.prepareTourDiagram(project);
        if (!prepared?.codigo) return false;
        // Inside the sandbox iframe, location.pathname is /sandbox/vista. The
        // host only accepts app routes, so reload through the prepared project's
        // real route rather than forwarding the iframe URL or its internal
        // `ruta` query.
        const query = new URLSearchParams({
          recorrido: String(chapter),
          enfoque: String(spotIndex),
          arbol: "real",
        });
        const route = `/proyectos/${encodeURIComponent(prepared.codigo)}/fases`;
        await bridge.navigate(`${route}?${query.toString()}`);
        return true;
      } catch (error) {
        // The preceding guided steps already guarantee two tasks. This keeps a
        // manually resumed tour usable if its temporary state was interrupted.
        console.warn("No se pudo preparar el diagrama del recorrido.", error);
        return false;
      }
    }
    async function showSpot(reviewingCompletedAutoStep = false) {
      const version = ++generation,
        spot = current.spots[spotIndex];
      if (await prepareRealDiagram(spot)) return;
      card.style.boxShadow = spot.guideOnly
        ? "0 18px 60px #0b081e44, 0 0 24px rgb(168 151 255 / .28)"
        : "";
      params.delete("revisar");
      params.set("enfoque", String(spotIndex));
      history.replaceState(
        null,
        "",
        `${location.pathname}?${params}${location.hash}`,
      );
      if (shown) {
        moving = true;
        content.classList.add("is-changing");
        await wait(180);
        if (closed || version !== generation) return;
      }
      stepComplete =
        !spot.required ||
        Boolean(bridge?.isTourStepComplete?.(chapter, spotIndex));
      updateCompanion();
      const nextControl =
        spot.autoAdvance && !reviewingCompletedAutoStep
          ? ""
          : `<button type="button" class="btn btn-primary" data-tour-next ${spot.required && !stepComplete ? 'disabled aria-label="Completa la acción indicada para continuar"' : ""}>${reviewingCompletedAutoStep ? uiText("recorrido.volver_al_paso_actual") : spot.nextLabel || (chapter === chapters.length ? uiText("recorrido.terminar") : uiText("admin.siguiente"))}</button>`;
      content.innerHTML = (`<button type="button" class="tour-close" aria-label="${uiText("recorrido.salir_del_recorrido")}"><span aria-hidden="true">×</span></button><h2 tabindex="-1">${esc(spot.title)}</h2><p id="tour-description">${esc(spot.text)}</p><nav class="${spot.autoAdvance ? "is-auto" : ""}" aria-label="${uiText("recorrido.pasos_del_recorrido")}"><button type="button" class="btn btn-secondary" data-tour-prev ${chapter === 1 && spotIndex === 0 ? "disabled" : ""}>${uiText("admin.anterior")}</button>${nextControl}</nav>`);
      content.querySelector(".tour-close").onclick = close;
      content.querySelector("[data-tour-prev]").onclick = previous;
      const nextButton = content.querySelector("[data-tour-next]");
      if (nextButton) nextButton.onclick = next;
      const found = await waitForTarget();
      if (closed || version !== generation) return;
      target = found;
      mountLayerForTarget();
      resizeObserver.disconnect();
      resizeObserver.observe(card);
      if (target) resizeObserver.observe(target);
      const rect = target?.getBoundingClientRect(),
        nav = document.querySelector("#main-nav");
      const navHeight =
        nav && ["fixed", "sticky"].includes(getComputedStyle(nav).position)
          ? nav.offsetHeight
          : 0;
      if (
        rect &&
        (rect.top < navHeight + 18 ||
          rect.bottom >
            innerHeight - Math.min(card.offsetHeight + 60, innerHeight * 0.48))
      ) {
        window.scrollTo({
          top: Math.max(0, scrollY + rect.top - navHeight - 28),
          behavior: motion.matches ? "instant" : "smooth",
        });
      }
      moving = true;
      content.querySelector("[data-tour-prev]").disabled = true;
      if (nextButton) nextButton.disabled = true;
      card.classList.add("is-ready");
      scheduleLayout();
      await wait(shown ? 260 : 120);
      if (closed || version !== generation) return;
      content.classList.remove("is-changing");
      content.querySelector("h2").focus({ preventScroll: true });
      shown = true;
      await wait(660);
      if (closed || version !== generation) return;
      moving = false;
      content.querySelector("[data-tour-prev]").disabled =
        chapter === 1 && spotIndex === 0;
      if (nextButton) nextButton.disabled = !stepComplete;
      if (spot.autoAdvance && stepComplete && !reviewingCompletedAutoStep)
        next();
    }
    async function go(index, focus = 0, reviewingCompletedAutoStep = false) {
      if (index === chapter - 1) {
        spotIndex = focus;
        showSpot();
        return;
      }
      if (moving || closed || !stepComplete) return;
      moving = true;
      layer.classList.add("is-leaving");
      await wait(420);
      if (closed) return;
      const url = `${chapters[index].url}?recorrido=${index + 1}&enfoque=${focus}${reviewingCompletedAutoStep ? "&revisar=1" : ""}`;
      if (bridge) {
        // Inform the host when a voluntary final explanation is accepted. Such
        // spots have no required UI action, yet they must still unlock the
        // next workspace (for example, after reading the complete diagram).
        if (index === chapter) bridge.completeTourStep?.(chapter, spotIndex);
        bridge.navigate(url);
      }
      else scope.navigate(url);
    }
    function next() {
      if (moving || closed || !stepComplete) return;
      if (spotIndex < current.spots.length - 1) {
        spotIndex++;
        showSpot();
      } else if (chapter < chapters.length) go(chapter);
      else {
        if (bridge) bridge.finishTour();
        close(false);
      }
    }
    function previous() {
      if (moving || closed) return;
      if (spotIndex > 0) {
        spotIndex--;
        const prior = current.spots[spotIndex];
        showSpot(
          Boolean(
            prior.autoAdvance &&
            bridge?.isTourStepComplete?.(chapter, spotIndex),
          ),
        );
      } else if (chapter > 1) {
        const priorChapter = chapters[chapter - 2],
          priorFocus = priorChapter.spots.length - 1,
          prior = priorChapter.spots[priorFocus];
        go(
          chapter - 2,
          priorFocus,
          Boolean(
            prior.autoAdvance &&
            bridge?.isTourStepComplete?.(chapter - 1, priorFocus),
          ),
        );
      }
    }
    function followLink(event) {
      const anchor = event.target.closest("a[href]");
      if (
        !anchor ||
        event.defaultPrevented ||
        !target?.contains(anchor) ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const expected = current.spots[spotIndex].advanceLink;
      if (expected && new URL(anchor.href).pathname === expected) {
        event.preventDefault();
        go(chapter);
      }
    }
    function allowsTourInteraction(event) {
      if (card.contains(event.target) || target?.contains(event.target))
        return true;
      const dialog = document.querySelector("dialog[open]");
      return Boolean(dialog?.contains(event.target));
    }
    function blockOutsideHighlight(event) {
      if (closed || allowsTourInteraction(event)) return;
      event.preventDefault?.();
      event.stopImmediatePropagation?.();
    }
    function onKey(event) {
      if (event.key === "Escape" && !document.querySelector("dialog[open]"))
        close();
      if (event.key !== "Tab" || document.querySelector("dialog[open]")) return;
      const selector =
        'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),summary,[tabindex]:not([tabindex="-1"])';
      const focusable = [
        ...card.querySelectorAll(selector),
        ...(target ? target.querySelectorAll(selector) : []),
      ].filter((node, index, all) => all.indexOf(node) === index);
      if (!focusable.length) return;
      const currentFocus = document.activeElement;
      const at = focusable.indexOf(currentFocus);
      if (at === -1 || (!event.shiftKey && at === focusable.length - 1)) {
        event.preventDefault();
        focusable[0].focus();
      } else if (event.shiftKey && at === 0) {
        event.preventDefault();
        focusable.at(-1).focus();
      }
    }
    function close(pause = true, leaving = false) {
      if (closed) return;
      closed = true;
      generation++;
      cancelAnimationFrame(frame);
      cancelWait?.();
      resizeObserver.disconnect();
      timers.forEach((resolve, timer) => {
        clearTimeout(timer);
        resolve();
      });
      timers.clear();
      if (bridge && pause !== false) bridge.pauseTour(chapter, spotIndex);
      companionHalo.style.visibility = "hidden";
      window.removeEventListener("scroll", scheduleLayout, true);
      window.removeEventListener("resize", scheduleLayout);
      window.removeEventListener("studyflow:pause-tour", close);
      document.removeEventListener("studyflow:tour-action", completeStep);
      document.removeEventListener("click", completeStep, true);
      document.removeEventListener("input", completeStep, true);
      document.removeEventListener("change", completeStep, true);
      window.visualViewport?.removeEventListener("resize", scheduleLayout);
      window.visualViewport?.removeEventListener("scroll", scheduleLayout);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("click", followLink);
      for (const type of [
        "pointerdown",
        "mousedown",
        "touchstart",
        "click",
        "dblclick",
        "contextmenu",
        "input",
        "change",
      ])
        document.removeEventListener(type, blockOutsideHighlight, true);
      layer.remove();
      if (leaving) return;
      params.delete("recorrido");
      params.delete("enfoque");
      const remaining = params.toString();
      history.replaceState(
        null,
        "",
        location.pathname + (remaining ? `?${remaining}` : "") + location.hash,
      );
      const focusable =
        "a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),summary,[tabindex]";
      const restore =
        originalFocus?.isConnected && originalFocus !== document.body
          ? originalFocus
          : target?.isConnected
            ? target.matches(focusable)
              ? target
              : target.querySelector(focusable) || target
            : document.querySelector("main");
      if (restore) {
        const temporary = !restore.matches(focusable);
        if (temporary) restore.setAttribute("tabindex", "-1");
        restore.focus({ preventScroll: true });
        if (temporary) restore.removeAttribute("tabindex");
      }
    }
    listen(window, "scroll", scheduleLayout, {
      passive: true,
      capture: true,
    });
    listen(window, "resize", scheduleLayout, { passive: true });
    listen(window, "studyflow:pause-tour", close);
    document.addEventListener("studyflow:tour-action", completeStep);
    document.addEventListener("click", completeStep, true);
    document.addEventListener("input", completeStep, true);
    document.addEventListener("change", completeStep, true);
    listen(window.visualViewport, "resize", scheduleLayout);
    listen(window.visualViewport, "scroll", scheduleLayout);
    document.addEventListener("keydown", onKey);
    document.addEventListener("click", followLink);
    for (const type of [
      "pointerdown",
      "mousedown",
      "touchstart",
      "click",
      "dblclick",
      "contextmenu",
      "input",
      "change",
    ])
      document.addEventListener(type, blockOutsideHighlight, true);
    await showSpot(params.get("revisar") === "1");
  }
  return init();
}
