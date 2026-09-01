(function () {
  "use strict";

  const USER_KEY = "studyflow_user";
  const SESSION_KEY = "studyflow_session";

  function safeWrite(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch (error) {
      // La interfaz conserva el flujo de demostración incluso sin almacenamiento disponible.
    }
  }

  function persistUser(user) {
    safeWrite(USER_KEY, JSON.stringify(user));
    safeWrite(SESSION_KEY, "true");

    try {
      if (window.App && typeof window.App.saveUser === "function") {
        window.App.saveUser(user);
      }
    } catch (error) {
      // La persistencia local ya dejó el perfil disponible para las otras vistas.
    }
  }

  function setFeedback(message, type) {
    const feedback = document.getElementById("register-feedback");
    if (!feedback) return;
    feedback.textContent = message;
    feedback.classList.toggle("is-visible", Boolean(message));
    feedback.classList.toggle("is-success", type === "success");
  }

  function notify(message, type) {
    try {
      if (window.App && typeof window.App.showToast === "function") {
        window.App.showToast(message, type);
      }
    } catch (error) {
      // El texto de ayuda bajo el formulario actúa como alternativa.
    }
  }

  function setUpPasswordToggles() {
    document.querySelectorAll("[data-password-toggle]").forEach((button) => {
      button.addEventListener("click", () => {
        const input = document.getElementById(button.dataset.passwordToggle);
        if (!input) return;
        const isHidden = input.type === "password";
        input.type = isHidden ? "text" : "password";
        button.setAttribute("aria-label", isHidden ? "Ocultar contraseña" : "Mostrar contraseña");
        button.innerHTML = `<i class="bi bi-eye${isHidden ? "-slash" : ""}" aria-hidden="true"></i>`;
      });
    });
  }

  function setUpDemoLinks() {
    document.querySelectorAll("[data-demo-action]").forEach((link) => {
      link.addEventListener("click", (event) => {
        event.preventDefault();
        const message = "Los términos y la política se conectarán cuando la aplicación cuente con servicios legales publicados.";
        setFeedback(message, "success");
        notify(message, "info");
      });
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("register-form");
    if (!form) return;

    setUpPasswordToggles();
    setUpDemoLinks();

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const formData = new FormData(form);
      const firstName = String(formData.get("firstName") || "").trim();
      const lastName = String(formData.get("lastName") || "").trim();
      const email = String(formData.get("email") || "").trim().toLowerCase();
      const password = String(formData.get("password") || "");
      const passwordConfirmation = String(formData.get("passwordConfirmation") || "");
      const university = String(formData.get("university") || "").trim();
      const career = String(formData.get("career") || "").trim();
      const age = String(formData.get("age") || "").trim();
      const semester = String(formData.get("semester") || "").trim();

      if (!firstName || !lastName || !university || !career || !age || !semester) {
        setFeedback("Completa los datos personales y académicos para continuar.", "error");
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setFeedback("Ingresa un correo electrónico válido.", "error");
        return;
      }
      if (password.length < 6) {
        setFeedback("Crea una contraseña de al menos 6 caracteres.", "error");
        return;
      }
      if (password !== passwordConfirmation) {
        setFeedback("Las contraseñas no coinciden.", "error");
        return;
      }
      if (!formData.get("terms")) {
        setFeedback("Debes aceptar los términos para crear tu cuenta.", "error");
        return;
      }

      const user = {
        id: `user-${Date.now()}`,
        firstName,
        lastName,
        name: `${firstName} ${lastName}`,
        email,
        university,
        career,
        semester,
        age,
        description: "Listo para organizar un gran semestre.",
        avatar: "",
        provider: "Correo electrónico",
        joinedAt: new Date().toISOString()
      };

      persistUser(user);
      const message = "¡Tu cuenta está lista! Preparando tu calendario…";
      setFeedback(message, "success");
      notify(message, "success");
      window.setTimeout(() => window.location.assign("/"), 480);
    });
  });
})();
