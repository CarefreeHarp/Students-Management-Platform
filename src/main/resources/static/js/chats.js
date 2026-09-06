/* Listado de canales agrupados por proyecto. */
(() => {
  "use strict";

  const app = window.App || {};
  const esc = app.escapeHTML || ((valor) => String(valor ?? ""));

  async function pedir(url) {
    const respuesta = await fetch(url, { headers: { "Content-Type": "application/json" } });
    // Sesión perdida o caducada: se vuelve al acceso en lugar de fallar a medias.
    if (respuesta.status === 401) {
      window.location.assign("/login");
      throw new Error("Tu sesión terminó. Vuelve a entrar.");
    }
    if (!respuesta.ok) throw new Error(`Error ${respuesta.status}`);
    return respuesta.json();
  }

  function tarjetaProyecto(proyecto, canales) {
    const lista = canales.map((canal) => `
      <a class="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[13px] font-semibold text-muted transition-colors hover:bg-primary-soft hover:text-[var(--estado-primary)]"
         href="/proyectos/${esc(proyecto.codigo)}/canales?canal=${esc(canal.slug)}">
        <span class="text-muted-light">#</span>
        <span class="min-w-0 flex-1 truncate">${esc(canal.slug)}</span>
        <span class="text-[11px] text-muted-light">${canal.totalMensajes}</span>
      </a>`).join("");

    return `
      <article class="project-card" style="--card-color:${esc(proyecto.color || "#5b5ce2")}">
        <div class="project-card-topline">
          <span class="project-color-dot"></span>
          <span class="project-state">${canales.length} canal${canales.length === 1 ? "" : "es"}</span>
        </div>
        <h3 class="project-name">${esc(proyecto.nombre)}</h3>
        <div class="mt-2.5 grid gap-0.5">${lista}</div>
        <div class="project-card-footer">
          <a class="open-project" href="/proyectos/${esc(proyecto.codigo)}/canales">Abrir espacio <i class="bi bi-arrow-right"></i></a>
        </div>
      </article>`;
  }

  async function init() {
    if (typeof app.renderNavigation === "function") app.renderNavigation();

    const [proyectos, canales] = await Promise.all([
      pedir("/api/proyectos"),
      pedir("/api/canales")
    ]);

    // Se agrupan los canales por el proyecto al que pertenecen.
    const porProyecto = new Map();
    canales.forEach((canal) => {
      if (!canal.proyectoCodigo) return;
      if (!porProyecto.has(canal.proyectoCodigo)) porProyecto.set(canal.proyectoCodigo, []);
      porProyecto.get(canal.proyectoCodigo).push(canal);
    });

    const conCanales = proyectos.filter((proyecto) => porProyecto.has(proyecto.codigo));
    document.querySelector("#chat-count").textContent =
      `${canales.length} canal${canales.length === 1 ? "" : "es"} en ${conCanales.length} proyecto${conCanales.length === 1 ? "" : "s"}`;

    document.querySelector("#chats-grid").innerHTML = conCanales.length
      ? conCanales.map((proyecto) => tarjetaProyecto(proyecto, porProyecto.get(proyecto.codigo))).join("")
      : `<div class="empty-projects"><div>
           <i class="bi bi-chat-square-dots text-2xl text-primary"></i>
           <h3>Todavía no hay canales</h3>
           <p>Cada proyecto nuevo arranca con su canal #general. Crea un proyecto para empezar.</p>
           <a class="btn btn-primary mt-3" href="/proyectos/nuevo"><i class="bi bi-plus-lg"></i> Crear proyecto</a>
         </div></div>`;
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
