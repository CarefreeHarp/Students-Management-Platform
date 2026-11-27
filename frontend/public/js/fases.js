/*
 * Diagrama de fases del proyecto.
 * Ramas verticales por dependencia, reparto configurable y los
 * cuatro estados: sin empezar, en proceso, en revisión y terminada.
 */
/** Stable topological task order and reusable Git-style branch lanes. */
export function construirRamas(fases) {
  const tareas = fases.flatMap((fase, faseIndice) => (fase.tareas || []).map((tarea, indice) => ({
    ...tarea, faseIndice, indice, faseNombre: fase.nombre,
    dependencias: [...new Set(tarea.dependencias || [])], bloqueantes: tarea.bloqueantes || []
  })));
  const porId = new Map(tareas.map((tarea) => [tarea.id, tarea]));
  const hijas = new Map(tareas.map((tarea) => [tarea.id, []]));
  const pendientes = new Map();
  tareas.forEach((tarea) => {
    const validas = tarea.dependencias.filter((id) => porId.has(id) && id !== tarea.id);
    pendientes.set(tarea.id, validas.length);
    validas.forEach((id) => hijas.get(id).push(tarea.id));
  });
  const comparar = (a, b) => a.faseIndice - b.faseIndice || a.indice - b.indice;
  const listas = tareas.filter((tarea) => pendientes.get(tarea.id) === 0).sort(comparar);
  const ordenadas = [];
  while (listas.length) {
    const tarea = listas.shift();
    ordenadas.push(tarea);
    hijas.get(tarea.id).forEach((id) => {
      pendientes.set(id, pendientes.get(id) - 1);
      if (pendientes.get(id) === 0) listas.push(porId.get(id));
    });
    listas.sort(comparar);
  }
  const ciclo = ordenadas.length !== tareas.length;
  const visitadas = new Set(ordenadas.map((tarea) => tarea.id));
  // Corrupt legacy data must never make a task disappear from the interface.
  ordenadas.push(...tareas.filter((tarea) => !visitadas.has(tarea.id)).sort(comparar));
  const carriles = [];
  const asignados = new Map();
  const indicePorId = new Map(ordenadas.map((tarea, indice) => [tarea.id, indice]));
  const libre = () => {
    const indice = carriles.findIndex((id) => id == null);
    return indice < 0 ? carriles.length : indice;
  };
  ordenadas.forEach((tarea) => {
    const carril = asignados.has(tarea.id) ? asignados.get(tarea.id) : libre();
    tarea.carril = carril;
    carriles[carril] = null;
    hijas.get(tarea.id).filter((id) => indicePorId.get(id) > indicePorId.get(tarea.id)).forEach((id) => {
      if (asignados.has(id)) return;
      const siguiente = libre();
      asignados.set(id, siguiente);
      carriles[siguiente] = id;
    });
  });
  const conexiones = ordenadas.flatMap((tarea) => tarea.dependencias
    .filter((id) => porId.has(id) && indicePorId.get(id) < indicePorId.get(tarea.id))
    .map((id) => ({ desde: id, hasta: tarea.id })));
  return { tareas: ordenadas, conexiones, carriles: Math.max(1, ...ordenadas.map((tarea) => tarea.carril + 1)), ciclo };
}


export function mount(scope) {
  const { t: uiText } = scope;
  const { document, listen, request, later, animate } = scope;
  const app = scope.app || {};
  const esc = app.escapeHTML || ((valor) => String(valor ?? ""));
  const proyecto = document.body.dataset.projectId;

  const COLOR_ESTADO = {
    "sin-empezar": "bg-[var(--chip-neutro)] text-muted",
    "en-proceso": "bg-primary-soft text-[var(--estado-primary)]",
    "en-revision": "bg-warning-soft text-[var(--estado-warning)]",
    "terminada": "bg-success-soft text-[var(--estado-success)]"
  };

  /* Un color por etapa, en el orden en que avanzan las fases del proyecto. */
  const COLOR_FASE = ["#5b5ce2", "#19a7bd", "#36aa8a", "#f2ae3d", "#d7639d", "#5b91b4"];

  const estado = {
    diagrama: null, proyecto: null, tareaActiva: null, ramas: null, distribucion: null,
    fasesEditor: [], fasePredeterminada: null, siguienteFaseTemporal: 0
  };
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

  /* ------------------------------------------------------------ diagrama */

  /**
   * Turns the stable topological order into compact, phase-separated levels.
   * A level only contains tasks that can be read in parallel; a child is always
   * below each of its known parents. This gives the real project diagram the
   * same tree vocabulary people see in the guided explanation, rather than
   * maintaining a separate, non-interactive example.
   */
  function construirDistribucion(ramas, fases) {
    const profundidad = new Map();
    ramas.tareas.forEach((tarea) => {
      const padres = tarea.dependencias
        .map((id) => profundidad.get(id))
        .filter((nivel) => Number.isFinite(nivel));
      profundidad.set(tarea.id, padres.length ? Math.max(...padres) + 1 : 0);
    });

    const posiciones = new Map();
    const fasesConNiveles = [];
    let siguienteNivel = 0;
    (fases || []).forEach((fase, faseIndice) => {
      const tareasFase = ramas.tareas.filter((tarea) => tarea.faseIndice === faseIndice);
      if (!tareasFase.length) {
        fasesConNiveles.push({ fase, faseIndice, niveles: [] });
        return;
      }

      // Each phase starts after the preceding phase, while preserving every
      // dependency depth inside the phase itself.
      const minimo = Math.min(...tareasFase.map((tarea) => profundidad.get(tarea.id) || 0));
      const maximo = Math.max(...tareasFase.map((tarea) => profundidad.get(tarea.id) || 0));
      const desplazamiento = Math.max(0, siguienteNivel - minimo);
      const porNivel = new Map();
      tareasFase.forEach((tarea) => {
        const nivel = (profundidad.get(tarea.id) || 0) + desplazamiento;
        posiciones.set(tarea.id, { nivel, faseIndice });
        if (!porNivel.has(nivel)) porNivel.set(nivel, []);
        porNivel.get(nivel).push(tarea);
      });
      siguienteNivel = maximo + desplazamiento + 1;
      fasesConNiveles.push({
        fase,
        faseIndice,
        niveles: [...porNivel.entries()]
          .sort(([a], [b]) => a - b)
          .map(([nivel, tareas]) => ({ nivel, tareas }))
      });
    });

    // Within each level, place children near the average position of their
    // parents. It substantially reduces crossing branches without imposing a
    // fake order on independent work.
    const ordenHorizontal = new Map();
    fasesConNiveles.forEach(({ niveles }) => niveles.forEach(({ tareas }) => {
      const ordenadas = [...tareas].sort((a, b) => {
        const centroPadres = (tarea) => {
          const padres = tarea.dependencias
            .map((id) => ordenHorizontal.get(id))
            .filter((orden) => Number.isFinite(orden));
          return padres.length ? padres.reduce((suma, orden) => suma + orden, 0) / padres.length : tarea.indice;
        };
        return centroPadres(a) - centroPadres(b) || a.indice - b.indice;
      });
      ordenadas.forEach((tarea, indice) => {
        const posicion = posiciones.get(tarea.id);
        posicion.columna = indice + 1;
        posicion.columnas = ordenadas.length;
        ordenHorizontal.set(tarea.id, (indice + 1) / (ordenadas.length + 1));
      });
      tareas.splice(0, tareas.length, ...ordenadas);
    }));

    return { posiciones, fasesConNiveles };
  }

  function detalleTarea(tarea) {
    const bloqueada = tarea.bloqueantes.length > 0;
    const responsable = tarea.responsable
      ? tarea.responsable
      : (estado.diagrama.modoReparto === "libre" && !bloqueada ? uiText("fases.disponible_para_tomar") : uiText("entregables.sin_responsable"));
    const dependencias = tarea.dependencias
      .map((id) => estado.ramas.tareas.find((item) => item.id === id)?.titulo)
      .filter(Boolean);
    const dependenciaTexto = dependencias.length ? dependencias.join(", ") : uiText("fases.sin_dependencias");
    const bloqueo = bloqueada ? (`<span class="branch-node-detail-blocked"><i class="bi bi-lock" aria-hidden="true"></i>${" " + uiText("fases.espera_0", {0: esc(tarea.bloqueantes.join(", "))})}</span>`) : "";

    return (`
      <span class="branch-node-detail" id="branch-node-detail-${tarea.id}" role="tooltip">
        <span class="branch-node-detail-phase" style="--branch-color:${COLOR_FASE[tarea.faseIndice % COLOR_FASE.length]}">${esc(tarea.faseNombre)}</span>
        <strong>${esc(tarea.titulo)}</strong>
        <span class="branch-node-detail-grid">
          <span><b>${uiText("entregables.estado")}</b>${esc(app.statusLabel(tarea.estado))}</span>
          <span><b>${uiText("proyecto.responsable")}</b>${esc(responsable)}</span>
          <span><b>${uiText("fases.fecha_limite")}</b>${esc(tarea.fechaLimite || uiText("fases.sin_fecha"))}</span>
          <span><b>${uiText("fases.depende_de")}</b>${esc(dependenciaTexto)}</span>
        </span>
        ${bloqueo}
        <span class="branch-node-detail-action">${uiText("fases.haz_clic_para_editar_esta_tarea_y_sus")}</span>
      </span>`);
  }

  function tarjetaTarea(tarea) {
    const color = COLOR_FASE[tarea.faseIndice % COLOR_FASE.length];
    return (`
      <button class="branch-task branch-node${tarea.estado === "terminada" ? " is-complete" : ""}"
              style="--branch-color:${color}" type="button" data-task="${tarea.id}"
              data-state="${esc(tarea.estado)}" aria-describedby="branch-node-detail-${tarea.id}"
              aria-label="${uiText("fases.abrir_tarea_5", {5: esc(tarea.titulo)})}">
        <span class="branch-node-status" aria-hidden="true"></span>
        <span class="branch-node-name">${esc(tarea.titulo)}</span>
        ${detalleTarea(tarea)}
      </button>`);
  }

  function pintarNivel(nivel) {
    return `<div class="branch-level" data-level="${nivel.nivel}" style="--branch-columns:${nivel.tareas.length}">
      ${nivel.tareas.map((tarea) => {
        const posicion = estado.distribucion.posiciones.get(tarea.id);
        return `<div class="branch-row" data-level="${posicion.nivel}" style="--branch-column:${posicion.columna};--branch-columns:${posicion.columnas}">${tarjetaTarea(tarea)}</div>`;
      }).join("")}
    </div>`;
  }

  function pintarFase({ fase, faseIndice, niveles }) {
    const color = COLOR_FASE[faseIndice % COLOR_FASE.length];
    const cantidad = (fase.tareas || []).length;
    return (`<section class="branch-phase-group${cantidad ? "" : " is-empty"}" data-phase="${faseIndice}" style="--branch-color:${color}">
      <header class="branch-phase-divider">
        <span class="branch-phase-number">${uiText("fases.fase_3", {3: String(faseIndice + 1).padStart(2, "0")})}</span>
        <strong>${esc(fase.nombre)}</strong>
        <small>${cantidad ? `${cantidad} ${cantidad === 1 ? uiText("fases.tarea_2") : uiText("fases.tareas")}` : uiText("fases.sin_tareas")}</small>
      </header>
      ${niveles.length ? `<div class="branch-phase-levels">${niveles.map(pintarNivel).join("")}</div>` : ""}
    </section>`);
  }

  function pintarDiagrama(diagrama) {
    const fases = diagrama.fases || [];
    estado.ramas = construirRamas(fases);
    estado.distribucion = construirDistribucion(estado.ramas, fases);
    $("#phase-legend").innerHTML = fases.map((fase, indice) => `<span style="--branch-color:${COLOR_FASE[indice % COLOR_FASE.length]}"><i></i>${esc(fase.nombre)}<small>${(fase.tareas || []).length}</small></span>`).join("");
    const contenedor = $("#diagram");
    contenedor.innerHTML = estado.ramas.tareas.length
      ? (`${estado.ramas.ciclo ? (`<p class="branch-cycle-warning">${uiText("fases.hay_dependencias_circulares_que_revisar_abre_las_tareas")}</p>`) : ""}<svg class="branch-svg" aria-hidden="true"></svg><div class="branch-tree" aria-label="${uiText("fases.diagrama_de_fases_y_tareas")}">${estado.distribucion.fasesConNiveles.map(pintarFase).join("")}</div>`)
      : (`<p class="branch-empty">${uiText("fases.todavia_no_hay_tareas_anade_la_primera_desde")}</p>`);

    contenedor.querySelectorAll("[data-task]").forEach((boton) => {
      boton.addEventListener("click", () => abrirTarea(Number(boton.dataset.task)));
      boton.addEventListener("mouseenter", () => enfocarRama(Number(boton.dataset.task)));
      boton.addEventListener("focus", () => enfocarRama(Number(boton.dataset.task)));
      boton.addEventListener("mouseleave", () => enfocarRama(null));
      boton.addEventListener("blur", () => enfocarRama(null));
    });
    dibujarConexiones();
    contenedor.querySelectorAll(".branch-edge-hit").forEach((relacion) => {
      relacion.addEventListener("mouseenter", () => enfocarRelacion(relacion));
      relacion.addEventListener("mouseleave", () => enfocarRama(null));
    });
  }

  function idsRelacion(elemento) {
    return new Set((elemento?.dataset.related || `${elemento?.dataset.from || ""} ${elemento?.dataset.to || ""}`)
      .split(/[\s,]+/)
      .map(Number)
      .filter(Number.isFinite));
  }

  function enfocarConjunto(ids) {
    const contenedor = $("#diagram");
    contenedor.classList.toggle("has-focus", ids.size > 0);
    contenedor.querySelectorAll(".branch-edge").forEach((linea) => {
      const relacionados = idsRelacion(linea);
      linea.classList.toggle("is-related", [...relacionados].some((id) => ids.has(id)));
    });
    contenedor.querySelectorAll(".branch-task").forEach((tarea) => {
      tarea.classList.toggle("is-related", ids.has(Number(tarea.dataset.task)));
    });
    // The detail card belongs to the task row.  Raise that row as well as the
    // button so siblings never paint text over the card in browsers without
    // support for the CSS :has() selector.
    contenedor.querySelectorAll(".branch-row").forEach((fila) => {
      const tarea = fila.querySelector("[data-task]");
      fila.classList.toggle("is-focused", ids.has(Number(tarea?.dataset.task)));
    });
    contenedor.querySelectorAll(".branch-phase-group").forEach((fase) => {
      fase.classList.toggle("has-focused-node", Boolean(fase.querySelector(".branch-row.is-focused")));
    });
  }

  function enfocarRama(id) {
    if (id === null) return enfocarConjunto(new Set());
    // Hovering a task must never make its neighbours look selected. The task
    // itself is the only highlighted node; its incoming/outgoing lines remain
    // visible because each relation still carries that task's id.
    enfocarConjunto(new Set([id]));
  }

  function enfocarRelacion(relacion) {
    enfocarConjunto(idsRelacion(relacion));
  }

  function dibujarConexiones() {
    const contenedor = $("#diagram");
    const svg = contenedor.querySelector("svg");
    if (!svg || !estado.ramas || !estado.distribucion) return;

    const base = contenedor.getBoundingClientRect();
    // Tooltips are absolutely positioned but still contribute to scrollHeight
    // in some browsers.  Using that invisible overflow as the SVG viewBox
    // height vertically scales every branch, making arrows stop above their
    // task.  The SVG must share the visible diagram's exact coordinate space.
    const ancho = Math.max(1, contenedor.clientWidth);
    const alto = Math.max(1, contenedor.clientHeight);
    const coordenadas = new Map();
    const limitesNivel = new Map();

    estado.ramas.tareas.forEach((tarea) => {
      const nodo = contenedor.querySelector(`[data-task="${tarea.id}"]`);
      const posicion = estado.distribucion.posiciones.get(tarea.id);
      if (!nodo || !posicion) return;
      const rect = nodo.getBoundingClientRect();
      const izquierda = rect.left - base.left + contenedor.scrollLeft;
      const arriba = rect.top - base.top + contenedor.scrollTop;
      const coordenada = {
        x: izquierda + rect.width / 2,
        arriba,
        abajo: arriba + rect.height,
        izquierda,
        derecha: izquierda + rect.width,
        nivel: posicion.nivel,
        tarea
      };
      coordenadas.set(tarea.id, coordenada);
      const limite = limitesNivel.get(posicion.nivel) || { arriba: coordenada.arriba, abajo: coordenada.abajo };
      limite.arriba = Math.min(limite.arriba, coordenada.arriba);
      limite.abajo = Math.max(limite.abajo, coordenada.abajo);
      limitesNivel.set(posicion.nivel, limite);
    });

    const valores = [...coordenadas.values()];
    if (!valores.length) return;
    const bordeIzquierdo = Math.min(...valores.map((punto) => punto.izquierda));
    const bordeDerecho = Math.max(...valores.map((punto) => punto.derecha));
    const margenCarril = 30;
    let carrilIzquierdo = 0;
    let carrilDerecho = 0;

    const conexionLarga = (origen, destino, indice) => {
      const salida = (limitesNivel.get(origen.nivel)?.abajo || origen.abajo) + 18;
      const llegada = (limitesNivel.get(destino.nivel)?.arriba || destino.arriba) - 18;
      const promedio = (origen.x + destino.x) / 2;
      const usaIzquierda = promedio <= ancho / 2;
      const carril = usaIzquierda
        ? Math.max(12, bordeIzquierdo - margenCarril - (carrilIzquierdo++ % 3) * 14)
        : Math.min(ancho - 12, bordeDerecho + margenCarril + (carrilDerecho++ % 3) * 14);
      return `M ${origen.x} ${origen.abajo} V ${salida} H ${carril} V ${llegada} H ${destino.x} V ${destino.arriba}`;
    };

    const etiquetaRelacion = (ids) => [...new Set(ids)].join(" ");
    const bordeAgrupado = (origen, destino, indice) => {
      const distanciaNivel = destino.nivel - origen.nivel;
      if (distanciaNivel === 1 && destino.arriba > origen.abajo) {
        const flexion = Math.max(18, Math.min(70, (destino.arriba - origen.abajo) / 2));
        return `M ${origen.x} ${origen.abajo} C ${origen.x} ${origen.abajo + flexion}, ${destino.x} ${destino.arriba - flexion}, ${destino.x} ${destino.arriba}`;
      }
      return conexionLarga(origen, destino, indice);
    };

    /*
     * Several siblings can have the exact same prerequisite set. Drawing one
     * diagonal for every pair makes a six-edge fan for the common two-roots /
     * three-children case. Collapse that visual fan into a merge junction and
     * a later branch junction. The underlying task dependencies do not change;
     * this only makes their shared path legible.
     */
    const grupos = new Map();
    estado.ramas.tareas.forEach((tarea) => {
      const destino = coordenadas.get(tarea.id);
      const padres = [...new Set(tarea.dependencias)]
        .map((id) => coordenadas.get(id))
        .filter(Boolean);
      if (!destino || padres.length < 2) return;
      const nivelOrigen = padres[0].nivel;
      const esAdyacente = padres.every((padre) => padre.nivel === nivelOrigen)
        && destino.nivel === nivelOrigen + 1
        && destino.arriba > (limitesNivel.get(nivelOrigen)?.abajo || padres[0].abajo);
      if (!esAdyacente) return;
      const idsPadres = padres.map((padre) => padre.tarea.id).sort((a, b) => a - b);
      const clave = `${destino.nivel}:${idsPadres.join(",")}`;
      if (!grupos.has(clave)) grupos.set(clave, { padres, destinos: [] });
      grupos.get(clave).destinos.push(destino);
    });

    const conexionesAgrupadas = new Set();
    const caminosAgrupados = [...grupos.values()].flatMap(({ padres, destinos }) => {
      const idsPadres = padres.map((padre) => padre.tarea.id);
      const idsDestinos = destinos.map((destino) => destino.tarea.id);
      idsPadres.forEach((desde) => idsDestinos.forEach((hasta) => conexionesAgrupadas.add(`${desde}:${hasta}`)));

      const nivelOrigen = padres[0].nivel;
      const nivelDestino = destinos[0].nivel;
      const limiteOrigen = limitesNivel.get(nivelOrigen);
      const limiteDestino = limitesNivel.get(nivelDestino);
      const centroPadres = padres.reduce((suma, padre) => suma + padre.x, 0) / padres.length;
      const centroDestinos = destinos.reduce((suma, destino) => suma + destino.x, 0) / destinos.length;
      const troncoX = (centroPadres + centroDestinos) / 2;
      const alturaDisponible = limiteDestino.arriba - limiteOrigen.abajo;
      const unionY = limiteOrigen.abajo + Math.max(18, Math.min(44, alturaDisponible * 0.32));
      const tieneRamas = destinos.length > 1;
      const bifurcacionY = tieneRamas
        ? limiteDestino.arriba - Math.max(18, Math.min(44, alturaDisponible * 0.28))
        : unionY;
      const color = COLOR_FASE[padres[0].tarea.faseIndice % COLOR_FASE.length];
      const relacionados = etiquetaRelacion([...idsPadres, ...idsDestinos]);
      const entradas = padres.map((padre) => `<path class="branch-edge branch-edge--merge" data-from="${padre.tarea.id}" data-to="${idsDestinos.join(",")}" data-related="${relacionados}" stroke="${color}" d="M ${padre.x} ${padre.abajo} C ${padre.x} ${unionY - 14}, ${troncoX} ${unionY - 18}, ${troncoX} ${unionY}"/>`);
      const tronco = tieneRamas
        ? `<path class="branch-edge branch-edge--trunk" data-from="${idsPadres.join(",")}" data-to="${idsDestinos.join(",")}" data-related="${relacionados}" stroke="${color}" d="M ${troncoX} ${unionY} V ${bifurcacionY}"/>`
        : "";
      const salidas = destinos.map((destino) => `<path class="branch-edge branch-edge--branch" data-from="${idsPadres.join(",")}" data-to="${destino.tarea.id}" data-related="${relacionados}" stroke="${color}" d="M ${troncoX} ${bifurcacionY} C ${troncoX} ${bifurcacionY + 14}, ${destino.x} ${destino.arriba - 18}, ${destino.x} ${destino.arriba}"/>`);
      return [...entradas, tronco, ...salidas,
        `<circle class="branch-junction branch-junction--merge" data-related="${relacionados}" cx="${troncoX}" cy="${unionY}" r="5" fill="transparent" stroke="${color}"/>`,
        tieneRamas ? `<circle class="branch-junction branch-junction--branch" data-related="${relacionados}" cx="${troncoX}" cy="${bifurcacionY}" r="5" fill="transparent" stroke="${color}"/>` : ""
      ];
    }).join("");

    const caminosIndividuales = estado.ramas.conexiones.flatMap(({ desde, hasta }, indice) => {
      if (conexionesAgrupadas.has(`${desde}:${hasta}`)) return [];
      const origen = coordenadas.get(desde);
      const destino = coordenadas.get(hasta);
      if (!origen || !destino) return [];
      const d = bordeAgrupado(origen, destino, indice);
      const color = COLOR_FASE[origen.tarea.faseIndice % COLOR_FASE.length];
      return [`<path class="branch-edge" data-from="${desde}" data-to="${hasta}" data-related="${etiquetaRelacion([desde, hasta])}" stroke="${color}" d="${d}"/>`];
    }).join("");

    svg.setAttribute("viewBox", `0 0 ${ancho} ${alto}`);
    svg.innerHTML = `${caminosAgrupados}${caminosIndividuales}`;
    // The visible line remains deliberately thin. Its transparent twin offers
    // a generous hover target so a dependency can be inspected precisely.
    svg.querySelectorAll(".branch-edge").forEach((linea) => {
      const zona = linea.cloneNode(false);
      zona.classList.remove("branch-edge");
      zona.classList.add("branch-edge-hit");
      zona.setAttribute("stroke", "transparent");
      zona.setAttribute("aria-hidden", "true");
      linea.insertAdjacentElement("afterend", zona);
    });
  }

  function pintarReparto(diagrama) {
    const libre = diagrama.modoReparto === "libre";
    $("#available-section").hidden = !libre;
    $("#reparto-description").textContent = libre
      ? uiText("fases.eleccion_libre_cada_integrante_toma_una_tarea_cuando")
      : uiText("fases.tareas_asignadas_cada_tarea_tiene_el_responsable_que");
    $("#configure-reparto").hidden = diagrama.puedeConfigurarReparto === false;
    const opcion = document.querySelector(`#reparto-settings [value="${libre ? "libre" : "asignado"}"]`);
    if (opcion) opcion.checked = true;
  }

  function pintarDisponibles(tareas) {
    $("#available-count").textContent = String(tareas.length);
    $("#available-list").innerHTML = tareas.length
      ? tareas.map((tarea) => (`
          <article class="tarjeta-lista flex items-center gap-3">
            <div class="min-w-0 flex-1">
              <h3 class="text-sm">${esc(tarea.titulo)}</h3>
              <p class="mt-0.5 text-[11px] text-muted">${esc(tarea.etapa)}${tarea.fechaLimite ? (" " + uiText("fases.vence_0", {0: esc(tarea.fechaLimite)})) : ""}</p>
            </div>
            <button class="btn btn-sm btn-primary" type="button" data-claim="${tarea.id}">
              <i class="bi bi-hand-index"></i>${" " + uiText("fases.tomarla") + "\n            "}</button>
          </article>`)).join("")
      : (`<p class="text-[13px] text-muted">${uiText("fases.no_hay_tareas_libres_o_estan_todas_asignadas")}</p>`);

    $("#available-list").querySelectorAll("[data-claim]").forEach((boton) => {
      boton.addEventListener("click", () => reclamar(Number(boton.dataset.claim)));
    });
  }

  /* ------------------------------------------------------ gestionar fases */

  function abrirGestorFases() {
    const fases = (estado.diagrama?.fases || []).filter((fase) => fase.id != null);
    if (!fases.length) {
      avisar(uiText("fases.el_proyecto_necesita_al_menos_una_fase_antes"), "error");
      return;
    }
    estado.fasesEditor = fases.map((fase) => ({
      id: fase.id,
      clave: `existente-${fase.id}`,
      nombre: fase.nombre,
      tareas: (fase.tareas || []).length
    }));
    const actual = String(estado.proyecto?.etapaActual || "").toLocaleLowerCase("es");
    const faseActual = estado.fasesEditor.find((fase) => fase.nombre.toLocaleLowerCase("es") === actual);
    estado.fasePredeterminada = (faseActual || estado.fasesEditor[0]).clave;
    $("#phase-feedback").classList.remove("is-visible");
    pintarEditorFases();
    const dialogo = $("#phase-dialog");
    if (!dialogo.open) dialogo.showModal();
  }

  function errorFases(mensaje) {
    const caja = $("#phase-feedback");
    caja.textContent = mensaje;
    caja.classList.add("is-visible");
  }

  function pintarEditorFases() {
    const lista = $("#phase-editor-list");
    const selector = $("#default-phase");
    lista.innerHTML = estado.fasesEditor.map((fase, indice) => (`
      <div class="flex items-center gap-2 rounded-[10px] border border-[var(--borde)] p-2" data-phase-key="${esc(fase.clave)}">
        <span class="tag bg-primary-soft text-[var(--estado-primary)]" aria-hidden="true">${String(indice + 1).padStart(2, "0")}</span>
        <label class="form-field min-w-0 flex-1"><span class="sr-only">${uiText("fases.nombre_de_la_fase_2", {2: indice + 1})}</span>
          <input data-phase-name="${esc(fase.clave)}" value="${esc(fase.nombre)}" placeholder="${uiText("crear_proyecto.nombre_de_la_fase")}">
        </label>
        <span class="text-[11px] text-muted">${fase.tareas} ${fase.tareas === 1 ? uiText("fases.tarea_2") : uiText("fases.tareas")}</span>
        <button class="icon-button" type="button" data-phase-up="${esc(fase.clave)}" aria-label="${uiText("fases.subir_fase")}" ${indice === 0 ? "disabled" : ""}><i class="bi bi-arrow-up"></i></button>
        <button class="icon-button" type="button" data-phase-down="${esc(fase.clave)}" aria-label="${uiText("fases.bajar_fase")}" ${indice === estado.fasesEditor.length - 1 ? "disabled" : ""}><i class="bi bi-arrow-down"></i></button>
        <button class="icon-button" type="button" data-phase-remove="${esc(fase.clave)}" aria-label="${uiText("crear_proyecto.eliminar_fase")}"><i class="bi bi-x-lg"></i></button>
      </div>`)).join("");
    selector.innerHTML = estado.fasesEditor.map((fase) =>
      `<option value="${esc(fase.clave)}">${esc(fase.nombre || uiText("fases.fase_sin_nombre"))}</option>`
    ).join("");
    if (!estado.fasesEditor.some((fase) => fase.clave === estado.fasePredeterminada)) {
      estado.fasePredeterminada = estado.fasesEditor[0]?.clave || null;
    }
    selector.value = estado.fasePredeterminada || "";

    lista.querySelectorAll("[data-phase-name]").forEach((entrada) => {
      entrada.addEventListener("input", (evento) => {
        const fase = estado.fasesEditor.find((item) => item.clave === evento.currentTarget.dataset.phaseName);
        if (!fase) return;
        fase.nombre = evento.currentTarget.value;
        const opcion = selector.querySelector(`option[value="${CSS.escape(fase.clave)}"]`);
        if (opcion) opcion.textContent = fase.nombre || uiText("fases.fase_sin_nombre");
      });
    });
    lista.querySelectorAll("[data-phase-up], [data-phase-down]").forEach((boton) => {
      boton.addEventListener("click", () => {
        const clave = boton.dataset.phaseUp || boton.dataset.phaseDown;
        const origen = estado.fasesEditor.findIndex((fase) => fase.clave === clave);
        const destino = origen + (boton.dataset.phaseUp ? -1 : 1);
        if (origen < 0 || destino < 0 || destino >= estado.fasesEditor.length) return;
        [estado.fasesEditor[origen], estado.fasesEditor[destino]] = [estado.fasesEditor[destino], estado.fasesEditor[origen]];
        pintarEditorFases();
      });
    });
    lista.querySelectorAll("[data-phase-remove]").forEach((boton) => {
      boton.addEventListener("click", () => {
        const indice = estado.fasesEditor.findIndex((fase) => fase.clave === boton.dataset.phaseRemove);
        const fase = estado.fasesEditor[indice];
        if (!fase) return;
        if (estado.fasesEditor.length === 1) {
          errorFases(uiText("fases.el_proyecto_debe_conservar_al_menos_una_fase"));
          return;
        }
        if (fase.tareas > 0) {
          errorFases((uiText("fases.no_puedes_eliminar_0_porque_todavia_tiene_1", {0: fase.nombre, 1: fase.tareas, 2: fase.tareas === 1 ? uiText("fases.tarea_2") : uiText("fases.tareas")})));
          return;
        }
        estado.fasesEditor.splice(indice, 1);
        if (estado.fasePredeterminada === fase.clave) estado.fasePredeterminada = estado.fasesEditor[0].clave;
        pintarEditorFases();
      });
    });
    selector.addEventListener("change", () => { estado.fasePredeterminada = selector.value; });
  }

  async function guardarFases(evento) {
    evento.preventDefault();
    const indiceActual = estado.fasesEditor.findIndex((fase) => fase.clave === estado.fasePredeterminada);
    if (indiceActual < 0) {
      errorFases(uiText("fases.elige_una_fase_predeterminada_valida"));
      return;
    }
    const boton = evento.currentTarget.querySelector('[type="submit"]');
    boton.disabled = true;
    $("#phase-feedback").classList.remove("is-visible");
    try {
      await pedir(`/api/proyectos/${proyecto}/fases`, {
        method: "PUT",
        body: JSON.stringify({
          fases: estado.fasesEditor.map((fase) => ({ id: fase.id, nombre: fase.nombre })),
          etapaActualIndice: indiceActual
        })
      });
      await cargar();
      $("#phase-dialog").close();
      avisar(uiText("fases.fases_actualizadas"), "success");
    } catch (error) {
      errorFases(error.message);
    } finally {
      boton.disabled = false;
    }
  }

  function pintarGestionFases(diagrama) {
    const boton = $("#configure-phases");
    boton.hidden = diagrama.puedeConfigurarFases === false;
  }

  /* ------------------------------------------------------------ acciones */

  async function cargar() {
    const [diagrama, detalleProyecto] = await Promise.all([
      pedir(`/api/proyectos/${proyecto}/fases`),
      pedir(`/api/proyectos/${proyecto}`)
    ]);
    estado.diagrama = diagrama;
    estado.proyecto = detalleProyecto;
    $("#project-label").textContent = estado.diagrama.proyectoNombre;
    pintarDiagrama(estado.diagrama);
    pintarReparto(estado.diagrama);
    pintarDisponibles(estado.diagrama.disponibles || []);
    pintarGestionFases(estado.diagrama);
  }

  async function reclamar(tareaId) {
    try {
      await pedir(`/api/tareas/${tareaId}/reclamar`, { method: "POST" });
      avisar(uiText("fases.tarea_asignada_a_por_ella"), "success");
      await cargar();
    } catch (error) {
      avisar(error.message, "error");
    }
  }

  /** Todas las tareas del diagrama en una sola lista. */
  function todasLasTareas() {
    return estado.diagrama.fases.flatMap((fase) => fase.tareas);
  }

  function opcionesResponsable(seleccionado) {
    const integrantes = estado.proyecto?.integrantes || [];
    $("#task-assignee-input").innerHTML = (`<option value="">${uiText("fases.sin_asignar")}</option>`)
      + integrantes.map((integrante) =>
        `<option value="${esc(integrante.nombre)}"${integrante.nombre === seleccionado ? " selected" : ""}>${esc(integrante.nombre)}</option>`
      ).join("");
  }

  function opcionesEtapa(seleccionada) {
    const etapas = estado.proyecto?.etapas || estado.diagrama.fases.map((fase) => fase.nombre);
    $("#task-stage-input").innerHTML = etapas.map((etapa) =>
      `<option value="${esc(etapa)}"${etapa === seleccionada ? " selected" : ""}>${esc(etapa)}</option>`
    ).join("");
  }

  function mostrarResultado(tarea = null) {
    const vaATerminar = $("#task-state-input").value === "terminada";
    $("#task-result-section").hidden = !vaATerminar;
    const enlace = $("#task-result-file-link");
    enlace.hidden = !vaATerminar || !tarea?.archivoResultadoUrl;
    if (vaATerminar && tarea?.archivoResultadoUrl) {
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

  function abrirTarea(tareaId) {
    const tarea = todasLasTareas().find((item) => item.id === tareaId);
    if (!tarea) return;
    estado.tareaActiva = tarea;

    $("#task-dialog-kicker").textContent = uiText("fases.editar_tarea");
    $("#task-dialog-title").textContent = tarea.titulo;
    $("#editing-task-id").value = tarea.id;
    $("#task-title-input").value = tarea.titulo;
    $("#task-description-input").value = tarea.descripcion || "";
    $("#task-date-input").value = tarea.fechaLimite || "";
    $("#task-state-input").value = tarea.estado;
    $("#task-result-input").value = tarea.resultadoTexto || "";
    $("#task-result-file").value = "";
    opcionesResponsable(tarea.responsable);
    opcionesEtapa(tarea.etapa);
    mostrarResultado(tarea);
    const libre = estado.diagrama.modoReparto === "libre";
    $("#release-task").hidden = !libre || !tarea.responsable;
    $("#task-feedback").classList.remove("is-visible");

    /*
     * Una tarea libre pero bloqueada no se puede tomar. Se explica aquí, antes
     * de pulsar: dejar el botón activo para responder luego con un error obliga
     * a intentarlo para descubrir el motivo.
     */
    const bloqueada = tarea.bloqueantes.length > 0;
    const tomar = $("#claim-task");
    tomar.hidden = !libre || Boolean(tarea.responsable);
    tomar.disabled = bloqueada;
    tomar.innerHTML = bloqueada
      ? (`<i class="bi bi-lock-fill"></i>${" " + uiText("fases.bloqueada")}`)
      : (`<i class="bi bi-hand-index"></i>${" " + uiText("fases.tomar_esta_tarea")}`);

    const aviso = $("#task-blocked");
    if (bloqueada) {
      aviso.hidden = false;
      aviso.textContent = tarea.responsable
        ? (uiText("fases.depende_de_0", {0: tarea.bloqueantes.join(", ")}))
        : (uiText("fases.no_se_puede_tomar_todavia_antes_hay_que", {0: tarea.bloqueantes.join(", ")}));
    } else {
      aviso.hidden = true;
    }

    // Candidatas a dependencia: cualquier otra tarea que no lo sea ya.
    const candidatas = todasLasTareas()
      .filter((item) => item.id !== tarea.id && !tarea.dependencias.includes(item.id));
    $("#task-dependency").innerHTML = candidatas.length
      ? (`<option value="">${uiText("fases.elige_una_tarea")}</option>`) + candidatas.map((item) => `<option value="${item.id}">${esc(item.titulo)}</option>`).join("")
      : (`<option value="">${uiText("fases.no_hay_tareas_disponibles")}</option>`);

    const dependencias = tarea.dependencias
      .map((id) => todasLasTareas().find((item) => item.id === id))
      .filter(Boolean);
    $("#dependency-list").innerHTML = dependencias.length
      ? dependencias.map((dependencia) => (`
          <span class="tag bg-[var(--chip-neutro)] text-muted">
            ${esc(dependencia.titulo)}
            <button type="button" data-remove-dep="${dependencia.id}" aria-label="${uiText("fases.quitar_dependencia")}"><i class="bi bi-x"></i></button>
          </span>`)).join("")
      : (`<span class="text-[11px] text-muted-light">${uiText("fases.sin_dependencias_2")}</span>`);

    $("#dependency-list").querySelectorAll("[data-remove-dep]").forEach((boton) => {
      boton.addEventListener("click", async () => {
        try {
          await pedir(`/api/tareas/${tarea.id}/dependencias/${boton.dataset.removeDep}`, { method: "DELETE" });
          await cargar();
          abrirTarea(tarea.id);
        } catch (error) { errorTarea(error.message); }
      });
    });

    const dialogo = $("#task-dialog");
    if (!dialogo.open) dialogo.showModal();
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
    $("#configure-reparto").addEventListener("click", () => {
      const abierto = $("#reparto-settings").hidden;
      $("#reparto-settings").hidden = !abierto;
      $("#configure-reparto").setAttribute("aria-expanded", String(abierto));
    });
    $("#configure-phases").addEventListener("click", abrirGestorFases);
    $("#add-phase").addEventListener("click", () => {
      const nueva = { id: null, clave: `nueva-${++estado.siguienteFaseTemporal}`, nombre: "", tareas: 0 };
      estado.fasesEditor.push(nueva);
      pintarEditorFases();
      document.querySelector(`[data-phase-name="${CSS.escape(nueva.clave)}"]`)?.focus();
    });
    $("#phase-form").addEventListener("submit", guardarFases);
    $("#phase-dialog").querySelectorAll("[data-close-phase-dialog]").forEach((boton) =>
      boton.addEventListener("click", () => $("#phase-dialog").close()));
    $("#reparto-settings").addEventListener("submit", async (evento) => {
      evento.preventDefault();
      const boton = evento.currentTarget.querySelector('[type="submit"]');
      const mensaje = $("#reparto-feedback");
      boton.disabled = true;
      mensaje.classList.remove("is-visible");
      try {
        await pedir(`/api/proyectos/${proyecto}/reparto`, { method: "PATCH", body: JSON.stringify({ modoReparto: document.querySelector('#reparto-settings input:checked').value }) });
        await cargar();
        $("#reparto-settings").hidden = true;
        $("#configure-reparto").setAttribute("aria-expanded", "false");
        avisar(uiText("fases.modo_de_reparto_actualizado"), "success");
      } catch (error) {
        mensaje.textContent = error.message;
        mensaje.classList.add("is-visible");
      } finally { boton.disabled = false; }
    });
    let frame = 0;
    const redibujar = () => {
      cancelAnimationFrame(frame);
      frame = animate(dibujarConexiones);
    };
    if (typeof ResizeObserver === "function") {
      const observer = new ResizeObserver(redibujar);
      observer.observe($("#diagram"));
      scope.onDestroy(() => observer.disconnect());
    }
    else listen(window, "resize", redibujar);
    document.fonts?.ready.then(redibujar);

    const dialogo = $("#task-dialog");
    dialogo.querySelectorAll("[data-close-dialog]").forEach((boton) =>
      boton.addEventListener("click", () => dialogo.close()));

    $("#task-form").addEventListener("submit", async (evento) => {
      evento.preventDefault();
      const tarea = estado.tareaActiva;
      if (!tarea) return;
      const quiereTerminar = $("#task-state-input").value === "terminada";
      const resultado = $("#task-result-input").value.trim();
      const archivo = $("#task-result-file").files[0];
      if (quiereTerminar && !resultado && !archivo && !tarea.tieneResultado) {
        errorTarea(uiText("fases.para_terminar_la_tarea_debes_escribir_un_resultado"));
        return;
      }
      try {
        await pedir(`/api/tareas/${tarea.id}`, {
          method: "PUT",
          body: JSON.stringify({
            titulo: $("#task-title-input").value,
            descripcion: $("#task-description-input").value,
            responsable: $("#task-assignee-input").value || null,
            etapa: $("#task-stage-input").value,
            fechaLimite: $("#task-date-input").value || null,
            horaLimite: "09:00",
            estado: quiereTerminar && !tarea.tieneResultado ? tarea.estado : $("#task-state-input").value
          })
        });
        if (quiereTerminar && (!tarea.tieneResultado || resultado || archivo)) {
          await completarConResultado(tarea.id, resultado, archivo);
        }
        await cargar();
        dialogo.close();
        avisar(uiText("fases.tarea_actualizada"), "success");
      } catch (error) {
        errorTarea(error.message);
      }
    });

    $("#task-state-input").addEventListener("change", () => mostrarResultado(estado.tareaActiva));

    $("#task-dependency").addEventListener("change", async (evento) => {
      const seleccion = evento.target.value;
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
        avisar(uiText("fases.tarea_asignada"), "success");
      } catch (error) {
        errorTarea(error.message);
      }
    });

    $("#release-task").addEventListener("click", async () => {
      try {
        await pedir(`/api/tareas/${estado.tareaActiva.id}/liberar`, { method: "POST" });
        await cargar();
        dialogo.close();
        avisar(uiText("fases.tarea_liberada_vuelve_a_estar_disponible"), "success");
      } catch (error) { errorTarea(error.message); }
    });

    try {
      await cargar();
    } catch (error) {
      avisar((uiText("fases.no_se_pudo_cargar_el_diagrama") + " ") + error.message, "error");
    }
  }

  init();
}
