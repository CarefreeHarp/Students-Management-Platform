(function () {
  "use strict";

  const USER_KEY = "studyflow_user";
  const PROJECTS_KEY = "studyflow_projects";
  const COLOR_PALETTE = ["#6757dd", "#21b7bd", "#ee985b", "#d26795", "#4f9ee9"];
  const DEFAULT_USER = {
    id: "demo-user",
    firstName: "Valentina",
    lastName: "Gómez",
    name: "Valentina Gómez",
    email: "valentina.gomez@universidad.edu",
    university: "Universidad Central",
    career: "Ingeniería de Sistemas",
    semester: "6",
    age: "20",
    description: "Construyendo soluciones que hacen la vida universitaria más simple.",
    avatar: "",
    provider: "Correo electrónico",
    joinedAt: "2026-08-01T12:00:00.000Z"
  };
  const DEMO_PROJECTS = [
    { id: "campus-verde", name: "Campus Verde", dueDate: "2026-08-22", members: ["VG", "JM", "LC", "AM"], progress: 72, color: "#6757dd" },
    { id: "rediseño-app", name: "Rediseño de la app de biblioteca", dueDate: "2026-08-28", members: ["VG", "SR", "MP"], progress: 45, color: "#21b7bd" },
    { id: "investigacion-ux", name: "Investigación UX", dueDate: "2026-09-04", members: ["VG", "AN"], progress: 28, color: "#ee985b" }
  ];

  function safeParse(value) {
    try {
      return value ? JSON.parse(value) : null;
    } catch (error) {
      return null;
    }
  }

  function safeGet(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (error) {
      return null;
    }
  }

  function safeSet(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch (error) {
      // Sin almacenamiento, los cambios continúan durante la sesión de la página.
    }
  }

  function getUser() {
    let appUser = null;
    try {
      if (window.App && typeof window.App.getUser === "function") {
        appUser = window.App.getUser();
      }
    } catch (error) {
      appUser = null;
    }
    const storedUser = safeParse(safeGet(USER_KEY));
    const user = { ...DEFAULT_USER, ...(storedUser || {}), ...(appUser || {}) };
    user.career = user.career || user.program || DEFAULT_USER.career;
    return user;
  }

  function saveUser(user) {
    safeSet(USER_KEY, JSON.stringify(user));
    try {
      if (window.App && typeof window.App.saveUser === "function") {
        window.App.saveUser(user);
      }
    } catch (error) {
      // studyflow_user conserva una copia compatible para una futura API.
    }
  }

  function esc(value) {
    return String(value ?? "").replace(/[&<>'\"]/g, (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#039;",
      "\"": "&quot;"
    })[character]);
  }

  function initials(user) {
    const source = user.name || `${user.firstName || ""} ${user.lastName || ""}`;
    return source
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("") || "AF";
  }

  function avatarFallback(user) {
    const label = initials(user);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160"><defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#f1ad7b"/><stop offset="1" stop-color="#9b5d98"/></linearGradient></defs><rect width="160" height="160" fill="url(#g)"/><circle cx="80" cy="61" r="31" fill="#f7c7a8"/><path d="M35 150c5-38 23-56 45-56s40 18 45 56" fill="#394d81"/><path d="M48 59c1-28 18-42 35-42 23 0 35 18 34 45-14-9-29-14-49-10z" fill="#3b2945"/><text x="80" y="145" text-anchor="middle" font-family="Arial, sans-serif" font-size="15" font-weight="700" fill="#fff">${label}</text></svg>`;
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  }

  function setAvatar(image, user) {
    if (!image) return;
    const fallback = avatarFallback(user);
    image.src = user.avatar || fallback;
    image.onerror = () => {
      image.onerror = null;
      image.src = fallback;
    };
  }

  function formatDate(value) {
    if (!value) return "Sin fecha definida";
    const parsed = new Date(`${value}T12:00:00`);
    if (Number.isNaN(parsed.getTime())) return String(value);
    return new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short" }).format(parsed).replace(".", "");
  }

  function formatJoined(value) {
    const date = new Date(value || DEFAULT_USER.joinedAt);
    if (Number.isNaN(date.getTime())) return "Este semestre";
    const result = new Intl.DateTimeFormat("es-CO", { month: "long", year: "numeric" }).format(date);
    return result.charAt(0).toUpperCase() + result.slice(1);
  }

  function normaliseProject(project, index) {
    const rawProgress = Number(project.progress ?? project.avance ?? project.porcentajeAvance ?? 0);
    const members = project.members || project.integrantes || project.participants || [];
    return {
      id: project.id || project.slug || `proyecto-${index + 1}`,
      name: project.name || project.nombre || "Proyecto sin nombre",
      dueDate: project.dueDate || project.fechaEntrega || project.deliveryDate || "",
      members: Array.isArray(members) ? members : String(members).split(",").map((member) => member.trim()).filter(Boolean),
      progress: Math.max(0, Math.min(100, Number.isFinite(rawProgress) ? rawProgress : 0)),
      color: /^#[0-9a-f]{6}$/i.test(project.color || "") ? project.color : COLOR_PALETTE[index % COLOR_PALETTE.length]
    };
  }

  function getProjects() {
    let externalProjects = null;
    try {
      if (window.App && typeof window.App.getProjects === "function") {
        externalProjects = window.App.getProjects();
      }
    } catch (error) {
      externalProjects = null;
    }

    const storageCandidates = [PROJECTS_KEY, "studentOrganizerProjects", "proyectos"];
    const storedProjects = storageCandidates
      .map((key) => safeParse(safeGet(key)))
      .find((projects) => Array.isArray(projects));
    const source = Array.isArray(externalProjects) ? externalProjects : (storedProjects || DEMO_PROJECTS);
    return source.map(normaliseProject);
  }

  function renderProfile(user) {
    document.querySelectorAll("[data-profile]").forEach((element) => {
      const property = element.dataset.profile;
      if (property === "projects-count") return;
      if (property === "joined") {
        element.textContent = formatJoined(user.joinedAt);
        return;
      }
      element.textContent = user[property] ?? "";
    });
    setAvatar(document.getElementById("profile-avatar"), user);
  }

  function renderProjects(projects) {
    const container = document.getElementById("profile-projects");
    const projectCounter = document.querySelector('[data-profile="projects-count"]');
    if (projectCounter) projectCounter.textContent = String(projects.length);
    if (!container) return;

    if (!projects.length) {
      container.innerHTML = '<div class="profile-empty">Aún no participas en proyectos. <a href="/proyectos/nuevo">Crea el primero</a>.</div>';
      return;
    }

    container.innerHTML = projects.slice(0, 3).map((project) => `
      <a class="profile-project-card" href="/proyectos/${encodeURIComponent(project.id)}" style="--project-color: ${project.color}; --progress: ${project.progress}%">
        <div class="project-card-top"><span class="project-tag"><span class="project-dot"></span>${project.members.length || 1} integrante${project.members.length === 1 ? "" : "s"}</span><i class="bi bi-arrow-up-right project-card-menu" aria-hidden="true"></i></div>
        <h3>${esc(project.name)}</h3>
        <p class="project-deadline"><i class="bi bi-calendar3" aria-hidden="true"></i> Entrega: ${esc(formatDate(project.dueDate))}</p>
        <div class="project-progress-row"><span>Avance general</span><strong>${project.progress}%</strong></div>
        <div class="project-progress" aria-label="Avance de ${esc(project.name)}: ${project.progress}%"><span></span></div>
      </a>
    `).join("");
  }

  function fillEditForm(user) {
    const fields = {
      "edit-first-name": user.firstName || (user.name || "").split(" ")[0],
      "edit-last-name": user.lastName || (user.name || "").split(" ").slice(1).join(" "),
      "edit-email": user.email,
      "edit-description": user.description,
      "edit-university": user.university,
      "edit-career": user.career,
      "edit-semester": user.semester,
      "edit-age": user.age
    };
    Object.entries(fields).forEach(([id, value]) => {
      const field = document.getElementById(id);
      if (field) field.value = value || "";
    });
    setAvatar(document.getElementById("edit-profile-avatar"), user);
    updateDescriptionCounter();
  }

  function updateDescriptionCounter() {
    const input = document.getElementById("edit-description");
    const counter = document.getElementById("description-count");
    if (input && counter) counter.textContent = String(input.value.length);
  }

  /** Resalta en rojo los campos indicados y limpia el resto. */
  function marcarCampos(ids) {
    const todos = ["edit-first-name", "edit-last-name", "edit-email", "edit-university",
                   "edit-career", "edit-semester", "edit-age"];
    todos.forEach((id) => {
      const campo = document.getElementById(id);
      if (!campo) return;
      const falla = ids.includes(id);
      campo.classList.toggle("campo-con-error", falla);
      campo.setAttribute("aria-invalid", falla ? "true" : "false");
    });
  }

  function setEditFeedback(message, type) {
    const feedback = document.getElementById("edit-profile-feedback");
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
      // El formulario conserva una confirmación dentro de la página.
    }
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("No fue posible leer la imagen."));
      reader.readAsDataURL(file);
    });
  }

  function setupEditForm(user) {
    const form = document.getElementById("edit-profile-form");
    if (!form) return;
    fillEditForm(user);

    const description = document.getElementById("edit-description");
    if (description) description.addEventListener("input", updateDescriptionCounter);

    const avatarInput = document.getElementById("avatar-file");
    if (avatarInput) {
      avatarInput.addEventListener("change", async () => {
        const [file] = avatarInput.files || [];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) {
          setEditFeedback("Elige una imagen de máximo 2 MB.", "error");
          avatarInput.value = "";
          return;
        }
        if (!/^image\/(png|jpeg|webp)$/.test(file.type)) {
          setEditFeedback("Usa una imagen PNG, JPG o WEBP.", "error");
          avatarInput.value = "";
          return;
        }
        try {
          const avatar = await readFileAsDataUrl(file);
          const preview = document.getElementById("edit-profile-avatar");
          if (preview) preview.src = avatar;
          form.dataset.pendingAvatar = avatar;
          setEditFeedback("La nueva foto se guardará cuando confirmes los cambios.", "success");
        } catch (error) {
          setEditFeedback("No fue posible cargar esa imagen. Intenta de nuevo.", "error");
        }
      });
    }

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const formData = new FormData(form);
      const firstName = String(formData.get("firstName") || "").trim();
      const lastName = String(formData.get("lastName") || "").trim();
      const email = String(formData.get("email") || "").trim().toLowerCase();
      const university = String(formData.get("university") || "").trim();
      const career = String(formData.get("career") || "").trim();
      const semester = String(formData.get("semester") || "").trim();
      const age = String(formData.get("age") || "").trim();

      // Se nombran los campos que faltan y se marcan en el formulario: decir
      // solo "completa los campos requeridos" obliga a buscarlos a ojo.
      const faltantes = [
        ["edit-first-name", "Nombre", firstName],
        ["edit-last-name", "Apellido", lastName],
        ["edit-university", "Universidad", university],
        ["edit-career", "Programa", career],
        ["edit-semester", "Semestre", semester],
        ["edit-age", "Edad", age]
      ].filter(([, , valor]) => !valor);

      marcarCampos(faltantes.map(([id]) => id));

      if (faltantes.length) {
        const nombres = faltantes.map(([, etiqueta]) => etiqueta);
        const lista = nombres.length === 1
          ? nombres[0]
          : `${nombres.slice(0, -1).join(", ")} y ${nombres[nombres.length - 1]}`;
        setEditFeedback(
          `Falta ${nombres.length === 1 ? "el campo" : "rellenar"} ${lista}.`, "error");
        document.getElementById(faltantes[0][0])?.focus();
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        marcarCampos(["edit-email"]);
        setEditFeedback("El correo no tiene un formato válido. Debe parecerse a nombre@universidad.edu.", "error");
        document.getElementById("edit-email")?.focus();
        return;
      }
      marcarCampos([]);

      const updatedUser = {
        ...user,
        firstName,
        lastName,
        name: `${firstName} ${lastName}`,
        email,
        description: String(formData.get("description") || "").trim(),
        university,
        career,
        semester,
        age,
        avatar: form.dataset.pendingAvatar || user.avatar || ""
      };
      saveUser(updatedUser);
      const message = "Cambios guardados. Tu perfil ya está actualizado.";
      setEditFeedback(message, "success");
      notify(message, "success");
      window.setTimeout(() => window.location.assign("/perfil"), 450);
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    try {
      if (window.App && typeof window.App.requireAuth === "function") {
        window.App.requireAuth();
      }
      if (window.App && typeof window.App.renderNavigation === "function") {
        window.App.renderNavigation();
      }
    } catch (error) {
      // Las vistas incluyen una navegación estática para la demostración local.
    }

    const user = getUser();
    if (document.getElementById("profile-name")) {
      renderProfile(user);
      renderProjects(getProjects());
    }
    setupEditForm(user);
  });
})();
