export function mount(scope) {
  const { t: uiText } = scope;
  const { document, request, navigate, listen } = scope;
  "use strict";

  const tarjeta = document.querySelector("[data-flow]");
  if (!tarjeta) return;
  const escena = tarjeta.querySelector("[data-flow-color]");
  const retrato = tarjeta.querySelector("[role=img]");
  const puntos = tarjeta.querySelector("[data-flow-puntos]");
  const racha = tarjeta.querySelector("[data-flow-racha]");
  const selector = tarjeta.querySelector("[data-flow-selector]");
  const estado = tarjeta.querySelector("[data-flow-estado]");
  const reintento = tarjeta.querySelector("[data-flow-reintento]");

  async function sincronizar(guardar = false) {
    selector.disabled = true;
    reintento.hidden = true;
    estado.textContent = guardar ? uiText("flow.guardando_el_color") : uiText("index.cargando_tu_mascota");
    try {
      const respuesta = await request("/api/flow", guardar ? {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ color: selector.value }),
      } : { cache: "no-store" });
      if (respuesta.status === 401) {
        navigate("/login");
        return;
      }
      if (!respuesta.ok) throw new Error();
      const mascota = await respuesta.json();
      escena.dataset.flowColor = mascota.color;
      retrato.setAttribute("aria-label", (uiText("flow.flow_una_chispa_sonriente_de_color_0", {0: mascota.color})));
      selector.value = mascota.color;
      puntos.textContent = String(mascota.puntos);
      racha.textContent = mascota.rachaDias === 1 ? uiText("flow.1_dia") : (uiText("flow.0_dias", {0: mascota.rachaDias}));
      estado.textContent = guardar ? uiText("flow.color_guardado") : "";
      selector.disabled = false;
    } catch {
      selector.value = escena.dataset.flowColor;
      estado.textContent = guardar ? uiText("flow.no_se_pudo_confirmar_el_cambio_de_color") : uiText("flow.no_se_pudo_cargar_tu_mascota");
      reintento.hidden = false;
    }
  }

  listen(selector, "change", () => sincronizar(true));
  listen(reintento, "click", () => sincronizar());
  listen(window, "pageshow", evento => { if (evento.persisted) sincronizar(); });
  sincronizar();
}
