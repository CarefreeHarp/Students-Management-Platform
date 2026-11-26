(() => {
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
    estado.textContent = guardar ? "Guardando el color…" : "Cargando tu mascota…";
    try {
      const respuesta = await fetch("/api/flow", guardar ? {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ color: selector.value }),
      } : { cache: "no-store" });
      if (respuesta.status === 401) {
        window.App.navigate("/login");
        return;
      }
      if (!respuesta.ok) throw new Error();
      const mascota = await respuesta.json();
      escena.dataset.flowColor = mascota.color;
      retrato.setAttribute("aria-label", `Flow, una chispa sonriente de color ${mascota.color}`);
      selector.value = mascota.color;
      puntos.textContent = String(mascota.puntos);
      racha.textContent = mascota.rachaDias === 1 ? "1 día" : `${mascota.rachaDias} días`;
      estado.textContent = guardar ? "Color guardado." : "";
      selector.disabled = false;
    } catch {
      selector.value = escena.dataset.flowColor;
      estado.textContent = guardar ? "No se pudo confirmar el cambio de color." : "No se pudo cargar tu mascota.";
      reintento.hidden = false;
    }
  }

  selector.addEventListener("change", () => sincronizar(true));
  reintento.addEventListener("click", () => sincronizar());
  window.addEventListener("pageshow", evento => { if (evento.persisted) sincronizar(); });
  sincronizar();
})();
