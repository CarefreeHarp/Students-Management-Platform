/* Listado de canales agrupados por proyecto. */
export function mount(scope) {
  const { t: uiText } = scope;
  const { document, listen, request, later, animate } = scope;

  const app = scope.app || {};
  const esc = app.escapeHTML || ((valor) => String(valor ?? ""));

  async function pedir(url) {
    const respuesta = await request(url, { headers: { "Content-Type": "application/json" } });
    // Sesión perdida o caducada: se vuelve al acceso en lugar de fallar a medias.
    if (respuesta.status === 401) {
      app.navigate("/login");
      throw new Error(uiText("canales.tu_sesion_termino_vuelve_a_entrar"));
    }
    if (!respuesta.ok) throw new Error((uiText("canales.error_0", {0: respuesta.status})));
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

    return (`
      <article class="project-card" style="--card-color:${esc(proyecto.color || "#5b5ce2")}">
        <div class="project-card-topline">
          <span class="project-color-dot"></span>
          <span class="project-state">${uiText("chats.1_canal_2", {1: canales.length, 2: canales.length === 1 ? "" : "es"})}</span>
        </div>
        <h3 class="project-name">${esc(proyecto.nombre)}</h3>
        <div class="mt-2.5 grid gap-0.5">${lista}</div>
        <div class="project-card-footer">
          <a class="open-project" href="/proyectos/${esc(proyecto.codigo)}/canales">${uiText("chats.abrir_espacio") + " "}<i class="bi bi-arrow-right"></i></a>
        </div>
      </article>`);
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
      (uiText("chats.0_canal_1_en_2_proyecto_3", {0: canales.length, 1: canales.length === 1 ? "" : "es", 2: conCanales.length, 3: conCanales.length === 1 ? "" : "s"}));

    document.querySelector("#chats-grid").innerHTML = conCanales.length
      ? conCanales.map((proyecto) => tarjetaProyecto(proyecto, porProyecto.get(proyecto.codigo))).join("")
      : (`<div class="empty-projects"><div>
           <i class="bi bi-chat-square-dots text-2xl text-primary"></i>
           <h3>${uiText("chats.todavia_no_hay_canales")}</h3>
           <p>${uiText("chats.cada_proyecto_nuevo_arranca_con_su_canal_general")}</p>
           <a class="btn btn-primary mt-3" href="/proyectos/nuevo"><i class="bi bi-plus-lg"></i>${" " + uiText("proyectos.crear_proyecto")}</a>
         </div></div>`);
  }

  init();
}
