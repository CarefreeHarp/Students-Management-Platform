/*
 * Listado de proyectos. Consume la API REST, de modo que los códigos de los
 * proyectos coinciden con los de la base y los enlaces abren el proyecto real.
 */
(() => {
  "use strict";

  const app = window.App || {};
  const esc = app.escapeHTML || ((valor) => String(valor ?? ""));

  let proyectos = [];
  let filtro = "all";
  let busqueda = "";

  const $ = (selector) => document.querySelector(selector);

  async function pedir(url) {
    const respuesta = await fetch(url, { headers: { "Content-Type": "application/json" } });
    // Sesión perdida o caducada: se vuelve al acceso en lugar de fallar a medias.
    if (respuesta.status === 401) {
      app.navigate("/login");
      throw new Error("Tu sesión terminó. Vuelve a entrar.");
    }
    if (!respuesta.ok) {
      const detalle = await respuesta.json().catch(() => ({}));
      throw new Error(detalle.detail || `Error ${respuesta.status}`);
    }
    return respuesta.json();
  }

  function entregaRelativa(iso) {
    if (!iso) return "Entrega sin definir";
    const fecha = new Date(`${iso}T00:00:00`);
    if (Number.isNaN(fecha.getTime())) return "Entrega sin definir";
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const dias = Math.round((fecha - hoy) / 86400000);
    if (dias < 0) return `Entrega vencida hace ${Math.abs(dias)} día${dias === -1 ? "" : "s"}`;
    if (dias === 0) return "La entrega es hoy";
    return `Entrega: ${dias === 1 ? "falta 1 día" : `faltan ${dias} días`}`;
  }

  function coincide(proyecto) {
    const terminado = proyecto.progreso >= 100;
    if (filtro === "active" && terminado) return false;
    if (filtro === "completed" && !terminado) return false;
    if (!busqueda) return true;
    return [proyecto.nombre, proyecto.descripcion,
            ...proyecto.integrantes.map((integrante) => integrante.nombre)]
      .join(" ").toLocaleLowerCase("es").includes(busqueda);
  }

  function pintarResumen() {
    const activos = proyectos.filter((proyecto) => proyecto.progreso < 100);
    $("#total-projects").textContent =
      `${activos.length} proyecto${activos.length === 1 ? " activo" : "s activos"}`;
  }

  function pintarProyectos() {
    const visibles = proyectos.filter(coincide);
    const rejilla = $("#projects-grid");

    $("#project-count-label").textContent =
      `${visibles.length} proyecto${visibles.length === 1 ? "" : "s"}`;

    if (!visibles.length) {
      // Se distingue "no hay nada" de "el filtro no encuentra nada": una cuenta
      // recién creada no participa en ningún proyecto, y eso confunde si no se
      // explica.
      const cuentaVacia = !proyectos.length && !busqueda && filtro === "all";
      rejilla.innerHTML = cuentaVacia
        ? `<div class="empty-projects"><div>
             <i class="bi bi-folder2-open text-2xl text-primary"></i>
             <h3>Tu cuenta todavía no tiene proyectos</h3>
             <p>Crea tu primer proyecto o descubre cómo funciona StudyFlow con un recorrido guiado.</p>
             <div class="mt-3 flex flex-wrap justify-center gap-2.5">
               <a class="btn btn-primary" href="/proyectos/nuevo"><i class="bi bi-plus-lg"></i> Crear proyecto</a>
               <a class="btn btn-secondary" href="/sandbox">
                 <i class="bi bi-play-circle"></i> Iniciar recorrido guiado
               </a>
             </div>
           </div></div>`
        : `<div class="empty-projects"><div>
             <i class="bi bi-search text-2xl text-primary"></i>
             <h3>Ningún proyecto coincide</h3>
             <p>Ajusta la búsqueda o cambia el filtro.</p>
           </div></div>`;

      return;
    }

    const plantilla = $("#project-card-template");
    rejilla.replaceChildren();

    visibles.forEach((proyecto) => {
      const fragmento = plantilla.content.cloneNode(true);
      const tarjeta = fragmento.querySelector(".project-card");
      const enlace = fragmento.querySelector(".project-card-link");

      tarjeta.style.setProperty("--card-color", proyecto.color || "#5b5ce2");
      enlace.href = `/proyectos/${encodeURIComponent(proyecto.codigo)}`;
      enlace.setAttribute("aria-label", `Abrir proyecto ${proyecto.nombre}`);

      fragmento.querySelector(".project-name").textContent = proyecto.nombre;
      fragmento.querySelector(".project-description").textContent =
        proyecto.descripcion || "Sin descripción todavía.";
      fragmento.querySelector(".project-state").textContent =
        proyecto.progreso >= 100 ? "Finalizado" : proyecto.etapaActual || "En curso";
      const entrega = fragmento.querySelector(".project-deadline");
      entrega.textContent = entregaRelativa(proyecto.fechaEntrega);
      if (proyecto.fechaEntrega) {
        entrega.dateTime = proyecto.fechaEntrega;
        entrega.title = `Fecha de entrega: ${proyecto.fechaEntrega}`;
      }
      const pendientes = proyecto.tareas.filter((tarea) => tarea.estado !== "terminada").length;
      fragmento.querySelector(".project-task-count").textContent =
        `${pendientes} pendiente${pendientes === 1 ? "" : "s"}`;
      fragmento.querySelector(".project-progress-value").textContent = `${proyecto.progreso}%`;
      fragmento.querySelector(".progress-fill").style.setProperty("--progress", `${proyecto.progreso}%`);

      fragmento.querySelector(".member-stack").innerHTML = proyecto.integrantes.slice(0, 4)
        .map((integrante) =>
          `<span class="member-avatar" style="--member-color:${esc(integrante.color)}" title="${esc(integrante.nombre)}">${esc(integrante.iniciales || "?")}</span>`)
        .join("")
        + (proyecto.integrantes.length > 4
            ? `<span class="member-avatar member-overflow">+${proyecto.integrantes.length - 4}</span>`
            : "");

      rejilla.append(fragmento);
    });
  }

  async function init() {
    if (typeof app.renderNavigation === "function") app.renderNavigation();

    $("#project-search").addEventListener("input", (evento) => {
      busqueda = evento.target.value.trim().toLocaleLowerCase("es");
      pintarProyectos();
    });
    document.querySelectorAll(".filter-button").forEach((boton) => {
      boton.addEventListener("click", () => {
        filtro = boton.dataset.filter || "all";
        document.querySelectorAll(".filter-button")
          .forEach((otro) => otro.classList.toggle("is-active", otro === boton));
        pintarProyectos();
      });
    });

    try {
      proyectos = await pedir("/api/proyectos");
      pintarResumen();
      pintarProyectos();
    } catch (error) {
      $("#total-projects").textContent = "No se pudo cargar el resumen.";
      $("#projects-grid").innerHTML =
        `<div class="empty-projects"><div><p class="text-danger">No se pudieron cargar los proyectos.</p><p>${esc(error.message)}</p></div></div>`;
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
