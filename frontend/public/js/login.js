/* Public entry chooser. Trying the app never opens or creates an account. */
export function mount(scope) {
  const { t: uiText } = scope;
  const { document, request } = scope;
  const correo = document.createElement("input");
  correo.type = "email";
  correo.required = true;

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
    document.querySelector("#entry-title").textContent = visible ? uiText("login.que_bueno_verte") : uiText("login.encuentra_tu_flow");
    document.querySelector("#entry-description").textContent = visible ? uiText("login.entra_a_tu_espacio") : uiText("login.conocelo_primero_hazlo_tuyo_cuando_quieras");
    feedback("");
    if (moveFocus) document.querySelector(visible ? "#login-email" : "#show-signin").focus();
  }

  async function signIn(event) {
    event.preventDefault();
    const emailInput = document.querySelector("#login-email");
    const passwordInput = document.querySelector("#login-password");
    const submit = document.querySelector("#signin-submit");
    if (submit.disabled) return;
    const usuario = emailInput.value.trim();
    const admin = usuario === "admin";
    correo.value = usuario;
    const usuarioValido = admin || correo.checkValidity();
    if (!usuarioValido || !passwordInput.value) {
      feedback(uiText("login.escribe_un_correo_valido_y_tu_contrasena"), "error");
      (!usuarioValido ? emailInput : passwordInput).focus();
      return;
    }
    submit.disabled = true;
    submit.setAttribute("aria-busy", "true");
    feedback("");
    try {
      if (admin) {
        const acceso = scope.loginAdmin(usuario, passwordInput.value);
        passwordInput.value = "";
        await acceso;
        scope.navigate("/admin");
        return;
      }
      const response = await request("/api/sesion/acceder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correo: usuario, contrasena: passwordInput.value })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.detail || result.mensaje || result.message || uiText("login.no_fue_posible_ingresar_intentalo_de_nuevo"));
      if (!result.acceso) throw new Error(result.mensaje || uiText("login.correo_o_contrasena_incorrectos"));
      feedback(uiText("login.sesion_iniciada"), "success");
      const volver = new URLSearchParams(location.search).get("volver") || "/panel";
      scope.navigate(volver === "/invitacion" ? volver + location.hash : volver);
    } catch (error) {
      if (scope.signal?.aborted) return;
      feedback(error.message, "error");
      submit.disabled = false;
      submit.removeAttribute("aria-busy");
    }
  }

  function init() {
    const volverPlan = new URLSearchParams(location.search).get("volver") || "";
    if (/^\/planes\/confirmar\/(mensual|semestral|vitalicio)$/.test(volverPlan)) {
      document.querySelector('a[href="/registro"]')?.setAttribute("href", "/registro?volver=" + encodeURIComponent(volverPlan));
    }
    document.querySelector("#show-signin").addEventListener("click", () => showSignIn(true));
    document.querySelector("#hide-signin").addEventListener("click", () => showSignIn(false));
    document.querySelector("#password-form").addEventListener("submit", signIn);
    const demoContainer = document.querySelector("#cuentas-demo");
    if (demoContainer) {
      request("/api/sesion/cuentas-demo").then(response => response.ok ? response.json() : []).then(cuentas => {
        if (!Array.isArray(cuentas) || cuentas.length !== 2) return;
        demoContainer.querySelectorAll("[data-demo]").forEach(button => {
          button.addEventListener("click", () => {
            const cuenta = cuentas[Number(button.dataset.demo)];
            if (!cuenta) return;
            document.querySelector("#login-email").value = cuenta.correo;
            document.querySelector("#login-password").value = cuenta.contrasena;
            feedback("");
            document.querySelector("#signin-submit").focus();
          });
        });
        demoContainer.hidden = false;
      }).catch(() => {});
    }
    document.querySelectorAll("[data-password-toggle]").forEach((button) => {
      button.addEventListener("click", () => {
        const field = document.getElementById(button.dataset.passwordToggle);
        const reveal = field.type === "password";
        field.type = reveal ? "text" : "password";
        button.querySelector("i").className = `bi bi-eye${reveal ? "-slash" : ""}`;
        button.setAttribute("aria-label", reveal ? uiText("login.ocultar_contrasena") : uiText("login.mostrar_contrasena"));
        button.setAttribute("aria-pressed", String(reveal));
      });
    });
    if (new URLSearchParams(window.location.search).get("acceso") === "cuenta") showSignIn(true, false);
  }

  init();
}
