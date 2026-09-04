/*
 * Registro reducido a lo imprescindible: nombre, correo y contraseña.
 * Los datos académicos son opcionales y viajan solo si se rellenan.
 */
(() => {
  "use strict";

  const app = window.App || {};

  function feedback(mensaje, tipo) {
    const caja = document.querySelector("#register-feedback");
    caja.textContent = mensaje;
    caja.classList.toggle("is-visible", Boolean(mensaje));
    caja.classList.toggle("is-success", tipo === "success");
  }

  const valor = (selector) => document.querySelector(selector).value.trim();

  async function registrar(evento) {
    evento.preventDefault();

    const nombreCompleto = valor("#register-name");
    const correo = valor("#register-email");
    const contrasena = document.querySelector("#register-password").value;

    if (!nombreCompleto) {
      feedback("Escribe tu nombre.", "error");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
      feedback("Ingresa un correo electrónico válido.", "error");
      return;
    }
    if (contrasena.length < 6) {
      feedback("La contraseña necesita al menos 6 caracteres.", "error");
      return;
    }

    const [nombre, ...resto] = nombreCompleto.split(/\s+/);
    const cuerpo = {
      firstName: nombre,
      lastName: resto.join(" "),
      email: correo,
      password: contrasena,
      university: valor("#register-university"),
      career: valor("#register-career"),
      semester: valor("#register-semester"),
      age: valor("#register-age")
    };

    try {
      const respuesta = await fetch("/api/usuarios/registro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cuerpo)
      });
      if (!respuesta.ok) {
        const detalle = await respuesta.json().catch(() => ({}));
        throw new Error(detalle.detail || "No fue posible crear la cuenta.");
      }
      const usuario = await respuesta.json();

      // Se abre la sesión inmediatamente: registrarse y entrar es un solo paso.
      await fetch("/api/sesion/entrar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: usuario.nombreCompleto, correo: usuario.correo })
      });

      if (typeof app.saveUser === "function") {
        app.saveUser({
          firstName: usuario.nombre,
          lastName: usuario.apellido,
          name: usuario.nombreCompleto,
          email: usuario.correo,
          university: usuario.universidad,
          career: usuario.programa,
          semester: usuario.semestre,
          age: usuario.edad
        });
      }

      feedback("Cuenta creada. Entrando…", "success");
      window.setTimeout(() => window.location.assign("/"), 400);
    } catch (error) {
      feedback(error.message, "error");
    }
  }

  function init() {
    document.querySelector("#register-form").addEventListener("submit", registrar);

    document.querySelectorAll("[data-password-toggle]").forEach((boton) => {
      boton.addEventListener("click", () => {
        const campo = document.getElementById(boton.dataset.passwordToggle);
        const oculta = campo.type === "password";
        campo.type = oculta ? "text" : "password";
        boton.querySelector("i").className = `bi bi-eye${oculta ? "-slash" : ""}`;
      });
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
