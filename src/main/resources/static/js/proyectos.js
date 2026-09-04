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
      window.location.assign("/login");
      throw new Error("Tu sesión terminó. Vuelve a entrar.");
    }
    if (!respuesta.ok) {
      const detalle = await respuesta.json().catch(() => ({}));
      throw new Error(detalle.detail || `Error ${respuesta.status}`);
    }
    return respuesta.json();
  }

  function fechaCorta(iso) {
    if (!iso) return "Sin fecha";
    const fecha = new Date(`${iso}T12:00:00`);
    return Number.isNaN(fecha.getTime())
      ? iso
      : new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short" }).format(fecha).replace(".", "");
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
    const tareas = proyectos.flatMap((proyecto) => proyecto.tareas);

    $("#total-projects").textContent = String(activos.length);
    $("#completed-tasks").textContent =
      String(tareas.filter((tarea) => tarea.estado === "terminada").length);

    const proxima = activos
      .filter((proyecto) => proyecto.fechaEntrega)
      .sort((a, b) => a.fechaEntrega.localeCompare(b.fechaEntrega))[0];
    $("#next-deadline").textContent = proxima ? fechaCorta(proxima.fechaEntrega) : "—";
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
             <p>Crea el primero, o entra con la cuenta de ejemplo si quieres ver la
                aplicación con proyectos, canales y tareas ya cargados.</p>
             <div class="mt-3 flex flex-wrap justify-center gap-2.5">
               <a class="btn btn-primary" href="/proyectos/nuevo"><i class="bi bi-plus-lg"></i> Crear proyecto</a>
               <button class="btn btn-secondary" type="button" id="ver-ejemplo">
                 <i class="bi bi-box-seam"></i> Ver datos de ejemplo
               </button>
             </div>
           </div></div>`
        : `<div class="empty-projects"><div>
             <i class="bi bi-search text-2xl text-primary"></i>
             <h3>Ningún proyecto coincide</h3>
             <p>Ajusta la búsqueda o cambia el filtro.</p>
           </div></div>`;

      document.querySelector("#ver-ejemplo")?.addEventListener("click", async () => {
        await fetch("/api/sesion/demostracion", { method: "POST" });
        window.location.reload();
      });
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
      fragmento.querySelector(".project-deadline").textContent = fechaCorta(proyecto.fechaEntrega);
      fragmento.querySelector(".project-task-count").textContent =
        `${proyecto.tareas.length} tarea${proyecto.tareas.length === 1 ? "" : "s"}`;
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
      $("#projects-grid").innerHTML =
        `<div class="empty-projects"><div><p class="text-danger">No se pudieron cargar los proyectos.</p><p>${esc(error.message)}</p></div></div>`;
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
