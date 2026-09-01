(function () {
  "use strict";

  const USER_KEY = "studyflow_user";
  const SESSION_KEY = "studyflow_session";

  function safeRead(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (error) {
      return null;
    }
  }

  function safeWrite(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch (error) {
      // El modo de demostración continúa aunque el navegador bloquee localStorage.
    }
  }

  function getStoredUser() {
    try {
      if (window.App && typeof window.App.getUser === "function") {
        const appUser = window.App.getUser();
        if (appUser) return appUser;
      }
    } catch (error) {
      // El respaldo local permite que esta vista funcione por sí sola.
    }

    try {
      const rawUser = safeRead(USER_KEY);
      return rawUser ? JSON.parse(rawUser) : null;
    } catch (error) {
      return null;
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
      // main.js puede usar una estrategia de persistencia distinta sin bloquear el acceso.
    }
  }

  function makeUserFromEmail(email, currentUser) {
    const localPart = email.split("@")[0].replace(/[._-]+/g, " ").trim();
    const proposedName = localPart
      .split(" ")
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ") || "Estudiante";

    return {
      id: currentUser && currentUser.id ? currentUser.id : `user-${Date.now()}`,
      firstName: currentUser && currentUser.firstName ? currentUser.firstName : proposedName.split(" ")[0],
      lastName: currentUser && currentUser.lastName ? currentUser.lastName : "",
      name: currentUser && (currentUser.name || currentUser.nombre) ? (currentUser.name || currentUser.nombre) : proposedName,
      email,
      university: (currentUser && currentUser.university) || "Mi universidad",
      career: (currentUser && (currentUser.career || currentUser.program)) || "Mi programa académico",
      semester: (currentUser && currentUser.semester) || "1",
      age: (currentUser && currentUser.age) || "",
      description: (currentUser && currentUser.description) || "Listo para organizar un gran semestre.",
      avatar: (currentUser && currentUser.avatar) || "",
      provider: "Correo electrónico",
      joinedAt: (currentUser && currentUser.joinedAt) || new Date().toISOString()
    };
  }

  function setFeedback(message, type) {
    const feedback = document.getElementById("login-feedback");
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
      // El mensaje del formulario sigue disponible como respaldo visual.
    }
  }

  function goToDashboard() {
    window.setTimeout(() => {
      window.location.assign("/");
    }, 420);
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

  function setUpRecoveryLink() {
    const recoveryLink = document.querySelector('[data-demo-action="recover"]');
    if (!recoveryLink) return;
    recoveryLink.addEventListener("click", (event) => {
      event.preventDefault();
      const email = document.getElementById("login-email").value.trim();
      const message = email
        ? `En una aplicación conectada enviaríamos un enlace de recuperación a ${email}.`
        : "Escribe tu correo y te ayudaremos a recuperar el acceso cuando conectemos el servicio.";
      setFeedback(message, "success");
      notify(message, "info");
    });
  }

  function setUpSocialLogin() {
    document.querySelectorAll("[data-provider]").forEach((button) => {
      button.addEventListener("click", () => {
        const provider = button.dataset.provider;
        const existingUser = getStoredUser();
        const user = existingUser || {
          id: `user-${Date.now()}`,
          firstName: "Valentina",
          lastName: "Gómez",
          name: "Valentina Gómez",
          email: `estudiante@${provider.toLowerCase()}.demo`,
          university: "Universidad Central",
          career: "Ingeniería de Sistemas",
          semester: "6",
          age: "20",
          description: "Construyendo soluciones que hacen la vida universitaria más simple.",
          avatar: "",
          provider,
          joinedAt: new Date().toISOString()
        };
        user.provider = provider;
        persistUser(user);
        const message = `Inicio con ${provider} simulado. Preparando tu espacio…`;
        setFeedback(message, "success");
        notify(message, "success");
        goToDashboard();
      });
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("login-form");
    if (!form) return;

    setUpPasswordToggles();
    setUpRecoveryLink();
    setUpSocialLogin();

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const email = document.getElementById("login-email").value.trim().toLowerCase();
      const password = document.getElementById("login-password").value;

      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setFeedback("Ingresa un correo electrónico válido.", "error");
        return;
      }

      if (password.length < 4) {
        setFeedback("La contraseña debe tener al menos 4 caracteres.", "error");
        return;
      }

      const user = makeUserFromEmail(email, getStoredUser());
      persistUser(user);
      const message = "¡Todo listo! Redirigiéndote a tu calendario.";
      setFeedback(message, "success");
      notify(message, "success");
      goToDashboard();
    });
  });
})();
