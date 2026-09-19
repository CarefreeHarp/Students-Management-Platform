/* Public entry chooser. Trying the app never opens or creates an account. */
(() => {
  "use strict";

  function feedback(message, type) {
    const box = document.querySelector("#login-feedback");
    box.textContent = message;
    box.classList.toggle("is-visible", Boolean(message));
    box.classList.toggle("is-success", type === "success");
  }

  function showSignIn(visible, moveFocus = true) {
    document.querySelector("#entry-options").hidden = visible;
    document.querySelector("#signin-panel").hidden = !visible;
    document.querySelector("#show-signin").setAttribute("aria-expanded", String(visible));
    document.querySelector("#entry-title").textContent = visible ? "Qué bueno verte." : "Encuentra tu flow.";
    document.querySelector("#entry-description").textContent = visible ? "Entra a tu espacio." : "Conócelo primero. Hazlo tuyo cuando quieras.";
    feedback("");
    if (moveFocus) document.querySelector(visible ? "#login-email" : "#show-signin").focus();
  }

  async function signIn(event) {
    event.preventDefault();
    const emailInput = document.querySelector("#login-email");
    const passwordInput = document.querySelector("#login-password");
    const submit = document.querySelector("#signin-submit");
    if (submit.disabled) return;
    if (!emailInput.checkValidity() || !passwordInput.value) {
      feedback("Escribe un correo válido y tu contraseña.", "error");
      (!emailInput.checkValidity() ? emailInput : passwordInput).focus();
      return;
    }
    submit.disabled = true;
    submit.setAttribute("aria-busy", "true");
    feedback("");
    try {
      const response = await fetch("/api/sesion/acceder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correo: emailInput.value.trim(), contrasena: passwordInput.value })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.detail || result.message || "No fue posible ingresar. Inténtalo de nuevo.");
      if (!result.acceso) throw new Error(result.mensaje || "Correo o contraseña incorrectos.");
      feedback("Sesión iniciada.", "success");
      window.location.assign("/panel");
    } catch (error) {
      feedback(error.message, "error");
      submit.disabled = false;
      submit.removeAttribute("aria-busy");
    }
  }

  function init() {
    document.querySelector("#show-signin").addEventListener("click", () => showSignIn(true));
    document.querySelector("#hide-signin").addEventListener("click", () => showSignIn(false));
    document.querySelector("#password-form").addEventListener("submit", signIn);
    document.querySelectorAll("[data-password-toggle]").forEach((button) => {
      button.addEventListener("click", () => {
        const field = document.getElementById(button.dataset.passwordToggle);
        const reveal = field.type === "password";
        field.type = reveal ? "text" : "password";
        button.querySelector("i").className = `bi bi-eye${reveal ? "-slash" : ""}`;
        button.setAttribute("aria-label", reveal ? "Ocultar contraseña" : "Mostrar contraseña");
        button.setAttribute("aria-pressed", String(reveal));
      });
    });
    if (new URLSearchParams(window.location.search).get("acceso") === "cuenta") showSignIn(true, false);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
