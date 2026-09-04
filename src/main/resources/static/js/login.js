/*
 * Acceso a StudyFlow.
 * El camino principal es el acceso rápido: con el nombre basta. El formulario
 * de correo y contraseña queda plegado para quien ya tenía cuenta.
 */
(() => {
  "use strict";

  const app = window.App || {};

  function feedback(mensaje, tipo) {
    const caja = document.querySelector("#login-feedback");
    caja.textContent = mensaje;
    caja.classList.toggle("is-visible", Boolean(mensaje));
    caja.classList.toggle("is-success", tipo === "success");
  }

  async function pedir(url, cuerpo) {
    const respuesta = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cuerpo)
    });
    if (!respuesta.ok) {
      const detalle = await respuesta.json().catch(() => ({}));
      throw new Error(detalle.detail || detalle.message || "No fue posible entrar.");
    }
    return respuesta.json();
  }

  /** Acceso rápido: crea la cuenta si no existe y abre la sesión. */
  async function entrar(evento) {
    evento.preventDefault();
    const nombre = document.querySelector("#quick-name").value.trim();
    if (!nombre) {
      feedback("Escribe tu nombre para entrar.", "error");
      return;
    }
    try {
      const usuario = await pedir("/api/sesion/entrar", {
        nombre,
        correo: document.querySelector("#quick-email").value.trim()
      });
      // Se guarda también en la capa local para las pantallas que aún la usan.
      if (typeof app.saveUser === "function") {
        app.saveUser({
          firstName: usuario.nombre,
          lastName: usuario.apellido,
          name: usuario.nombreCompleto,
          email: usuario.correo
        });
      }
      feedback(`¡Hola, ${usuario.nombre}! Entrando…`, "success");
      window.setTimeout(() => window.location.assign("/"), 350);
    } catch (error) {
      feedback(error.message, "error");
    }
  }

  /** Acceso clásico para quien se registró con contraseña. */
  async function acceder(evento) {
    evento.preventDefault();
    try {
      const resultado = await pedir("/api/sesion/acceder", {
        correo: document.querySelector("#login-email").value.trim(),
        contrasena: document.querySelector("#login-password").value
      });
      if (!resultado.acceso) {
        feedback(resultado.mensaje || "Correo o contraseña incorrectos.", "error");
        return;
      }
      feedback("Sesión iniciada.", "success");
      window.setTimeout(() => window.location.assign("/"), 350);
    } catch (error) {
      feedback(error.message, "error");
    }
  }

  /** Entra con la cuenta sembrada, la que tiene los proyectos de ejemplo. */
  async function explorarEjemplo() {
    try {
      const usuario = await pedir("/api/sesion/demostracion", {});
      feedback(`Entrando como ${usuario.nombreCompleto}…`, "success");
      window.setTimeout(() => window.location.assign("/"), 350);
    } catch (error) {
      feedback(error.message, "error");
    }
  }

  function init() {
    document.querySelector("#quick-form").addEventListener("submit", entrar);
    document.querySelector("#password-form").addEventListener("submit", acceder);
    document.querySelector("#demo-button").addEventListener("click", explorarEjemplo);

    // Mostrar u ocultar la contraseña.
    document.querySelectorAll("[data-password-toggle]").forEach((boton) => {
      boton.addEventListener("click", () => {
        const campo = document.getElementById(boton.dataset.passwordToggle);
        const oculta = campo.type === "password";
        campo.type = oculta ? "text" : "password";
        boton.querySelector("i").className = `bi bi-eye${oculta ? "-slash" : ""}`;
      });
    });

    // Los accesos sociales todavía no hacen OAuth: se avisa en lugar de fingir.
    document.querySelectorAll("[data-provider]").forEach((boton) => {
      boton.addEventListener("click", () => {
        feedback(`El acceso con ${boton.dataset.provider} aún no está conectado. Entra con tu nombre.`, "error");
      });
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
