/*
 * Registro de documentos y entregables del proyecto.
 * Guarda el enlace donde vive cada parte del trabajo, con responsable y estado.
 */
(() => {
  "use strict";

  const app = window.App || {};
  const esc = app.escapeHTML || ((valor) => String(valor ?? ""));
  const proyecto = document.body.dataset.projectId;

  const COLOR_ESTADO = {
    BORRADOR: "bg-[#f0f2f7] text-[#788196]",
    EN_REVISION: "bg-warning-soft text-[#8a5a12]",
    FINAL: "bg-success-soft text-success"
  };

  const $ = (selector) => document.querySelector(selector);
  let entregables = [];

  async function pedir(url, opciones = {}) {
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

  const avisar = (mensaje, tipo = "info") => {
    if (typeof app.showToast === "function") app.showToast(mensaje, tipo);
  };

  function tarjeta(entregable) {
    const responsable = entregable.responsable
      ? `<span class="inline-flex items-center gap-1.5">
           <i class="inline-block h-2 w-2 rounded-full" style="background:${esc(entregable.colorResponsable || "#5b5ce2")}"></i>
           ${esc(entregable.responsable)}
         </span>`
      : '<span class="text-muted-light">Sin responsable</span>';

    const color = entregable.colorResponsable || "#5b5ce2";
    return `
      <article class="tarjeta-lista tarjeta-borde-color flex items-start gap-3" style="--borde:${esc(color)}">
        <span class="grid h-11 w-11 flex-none place-items-center rounded-sm bg-primary-soft text-lg text-primary">
          <i class="bi ${esc(entregable.icono)}"></i>
        </span>
        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-2">
            <a class="text-[15px] font-bold hover:text-primary" href="${esc(entregable.url)}" target="_blank" rel="noopener">
              ${esc(entregable.nombre)} <i class="bi bi-box-arrow-up-right text-xs"></i>
            </a>
            <span class="tag ${COLOR_ESTADO[entregable.estado] || ""}">${esc(entregable.estadoEtiqueta)}</span>
            <span class="tag bg-[#f4f5fa] text-[#5c6883]">${esc(entregable.tipoEtiqueta)}</span>
          </div>
          ${entregable.descripcion ? `<p class="mt-1 text-[13px] text-muted">${esc(entregable.descripcion)}</p>` : ""}
          <p class="mt-1.5 truncate text-[11px] text-muted-light">${esc(entregable.url)}</p>
          <div class="mt-1.5 flex flex-wrap items-center gap-3 text-[11px] text-muted">
            ${responsable}
            ${entregable.tarea ? `<span><i class="bi bi-list-check"></i> ${esc(entregable.tarea)}</span>` : ""}
            <span><i class="bi bi-calendar3"></i> ${esc(entregable.fechaRegistro)}</span>
          </div>
        </div>
        <div class="flex flex-none gap-1">
          <select class="min-h-0 w-auto px-1.5 py-1 text-[11px]" data-state="${entregable.id}" aria-label="Cambiar estado">
            <option value="BORRADOR" ${entregable.estado === "BORRADOR" ? "selected" : ""}>Borrador</option>
            <option value="EN_REVISION" ${entregable.estado === "EN_REVISION" ? "selected" : ""}>En revisión</option>
            <option value="FINAL" ${entregable.estado === "FINAL" ? "selected" : ""}>Final</option>
          </select>
          <button class="icon-button" type="button" data-edit="${entregable.id}" aria-label="Editar"><i class="bi bi-pencil"></i></button>
          <button class="icon-button" type="button" data-delete="${entregable.id}" aria-label="Eliminar"><i class="bi bi-trash3"></i></button>
        </div>
      </article>`;
  }

  async function cargar() {
    entregables = await pedir(`/api/proyectos/${proyecto}/entregables`);

    $("#total-deliverables").textContent = String(entregables.length);
    $("#in-review").textContent = String(entregables.filter((item) => item.estado === "EN_REVISION").length);
    $("#finals").textContent = String(entregables.filter((item) => item.estado === "FINAL").length);

    $("#deliverables").innerHTML = entregables.length
      ? entregables.map(tarjeta).join("")
      : `<div class="empty-projects"><div>
           <i class="bi bi-folder2-open text-2xl text-primary"></i>
           <h3>Aún no hay documentos</h3>
           <p>Registra el enlace del informe, la presentación o el repositorio para tenerlos todos a mano.</p>
         </div></div>`;

    $("#deliverables").querySelectorAll("[data-state]").forEach((selector) => {
      selector.addEventListener("change", async () => {
        await pedir(`/api/entregables/${selector.dataset.state}/estado`, {
          method: "PATCH",
          body: JSON.stringify({ estado: selector.value })
        });
        await cargar();
      });
    });
    $("#deliverables").querySelectorAll("[data-edit]").forEach((boton) => {
      boton.addEventListener("click", () => abrirFormulario(Number(boton.dataset.edit)));
    });
    $("#deliverables").querySelectorAll("[data-delete]").forEach((boton) => {
      boton.addEventListener("click", async () => {
        if (!window.confirm("¿Quitar este documento del registro?")) return;
        await pedir(`/api/entregables/${boton.dataset.delete}`, { method: "DELETE" });
        await cargar();
      });
    });
  }

  function abrirFormulario(id) {
    const entregable = id ? entregables.find((item) => item.id === id) : null;
    $("#dialog-title").textContent = entregable ? "Editar documento" : "Registrar documento";
    $("#deliverable-id").value = entregable ? entregable.id : "";
    $("#deliverable-url").value = entregable ? entregable.url : "";
    $("#deliverable-name").value = entregable ? entregable.nombre : "";
    $("#deliverable-description").value = entregable ? entregable.descripcion || "" : "";
    $("#deliverable-type").value = entregable ? entregable.tipo : "";
    $("#deliverable-state").value = entregable ? entregable.estado : "BORRADOR";
    $("#deliverable-owner").value = entregable && entregable.responsable ? entregable.responsable : "";
    $("#deliverable-feedback").classList.remove("is-visible");
    $("#deliverable-dialog").showModal();
  }

  async function guardar(evento) {
    evento.preventDefault();
    const feedback = $("#deliverable-feedback");
    const id = $("#deliverable-id").value;
    const cuerpo = {
      nombre: $("#deliverable-name").value.trim(),
      descripcion: $("#deliverable-description").value.trim(),
      url: $("#deliverable-url").value.trim(),
      tipo: $("#deliverable-type").value || null,
      estado: $("#deliverable-state").value,
      responsable: $("#deliverable-owner").value || null
    };

    if (!cuerpo.nombre || !cuerpo.url) {
      feedback.textContent = "El nombre y el enlace son obligatorios.";
      feedback.classList.add("is-visible");
      return;
    }

    try {
      if (id) {
        await pedir(`/api/entregables/${id}`, { method: "PUT", body: JSON.stringify(cuerpo) });
      } else {
        await pedir(`/api/proyectos/${proyecto}/entregables`, { method: "POST", body: JSON.stringify(cuerpo) });
      }
      $("#deliverable-dialog").close();
      $("#deliverable-form").reset();
      await cargar();
      avisar("Registro actualizado.", "success");
    } catch (error) {
      feedback.textContent = error.message;
      feedback.classList.add("is-visible");
    }
  }

  async function init() {
    if (typeof app.renderNavigation === "function") app.renderNavigation();
    $("#back-to-project").href = `/proyectos/${proyecto}`;
    $("#link-phases").href = `/proyectos/${proyecto}/fases`;

    const detalle = await pedir(`/api/proyectos/${proyecto}`);
    $("#project-label").textContent = detalle.nombre;
    $("#deliverable-owner").innerHTML = '<option value="">Sin asignar</option>'
      + detalle.integrantes.map((integrante) =>
          `<option value="${esc(integrante.nombre)}">${esc(integrante.nombre)}</option>`).join("");

    const dialogo = $("#deliverable-dialog");
    $("#new-deliverable").addEventListener("click", () => abrirFormulario(null));
    dialogo.querySelectorAll("[data-close-dialog]").forEach((boton) =>
      boton.addEventListener("click", () => dialogo.close()));
    $("#deliverable-form").addEventListener("submit", guardar);

    // Al pegar un enlace se propone el nombre si aún está vacío.
    $("#deliverable-url").addEventListener("blur", () => {
      const nombre = $("#deliverable-name");
      if (nombre.value.trim()) return;
      try {
        const url = new URL($("#deliverable-url").value);
        nombre.value = url.hostname.replace("www.", "");
      } catch (_) {
        // Un enlace incompleto no debe interrumpir la escritura.
      }
    });

    await cargar();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
