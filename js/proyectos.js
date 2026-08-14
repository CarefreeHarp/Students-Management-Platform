(() => {
  "use strict";

  const COLORS = ["#7259e9", "#4d89f8", "#ee8a54", "#36aa8a", "#d7639d", "#5b91b4"];
  const app = window.App || {};
  let selectedFilter = "all";
  let searchTerm = "";

  const memberName = (member) => {
    if (typeof member === "string") return member;
    return member?.name || member?.username || member?.email || "Sin asignar";
  };

  const dateFromValue = (value) => {
    if (!value) return null;
    const normalized = String(value).length === 10 ? `${value}T12:00:00` : value;
    const date = new Date(normalized);
    return Number.isNaN(date.getTime()) ? null : date;
  };

  const formatDate = (value, fallback = "Sin fecha") => {
    if (!value) return fallback;
    if (typeof app.formatDate === "function") return app.formatDate(value);
    const date = dateFromValue(value);
    return date ? new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short" }).format(date) : fallback;
  };

  const getProjects = () => {
    const projects = typeof app.getProjects === "function" ? app.getProjects() : [];
    return Array.isArray(projects) ? projects : [];
  };

  const tasksOf = (project) => Array.isArray(project?.tasks) ? project.tasks : [];
  const isTaskCompleted = (task) => ["completed", "complete", "done", "completada", "terminada"].includes(String(task?.status || "").toLowerCase());

  const progressOf = (project) => {
    const numericProgress = Number(project?.progress);
    if (Number.isFinite(numericProgress)) return Math.max(0, Math.min(100, Math.round(numericProgress)));
    const tasks = tasksOf(project);
    return tasks.length ? Math.round((tasks.filter(isTaskCompleted).length / tasks.length) * 100) : 0;
  };

  const showToast = (message, type = "info") => {
    if (typeof app.showToast === "function") app.showToast(message, type);
  };

  function renderNavigation() {
    if (typeof app.renderNavigation === "function") app.renderNavigation();
  }

  function renderMemberStack(target, members) {
    target.replaceChildren();
    const visibleMembers = members.slice(0, 4);
    visibleMembers.forEach((member, index) => {
      const avatar = document.createElement("span");
      const name = memberName(member);
      avatar.className = "member-avatar";
      avatar.style.setProperty("--member-color", member?.color || COLORS[index % COLORS.length]);
      avatar.title = name;
      avatar.textContent = name.split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]).join("").toUpperCase() || "?";
      target.append(avatar);
    });
    if (members.length > visibleMembers.length) {
      const rest = document.createElement("span");
      rest.className = "member-avatar member-overflow";
      rest.title = `${members.length - visibleMembers.length} integrantes más`;
      rest.textContent = `+${members.length - visibleMembers.length}`;
      target.append(rest);
    }
  }

  function renderSummary(projects) {
    const activeProjects = projects.filter((project) => progressOf(project) < 100);
    const allTasks = projects.flatMap(tasksOf);
    document.querySelector("#total-projects").textContent = String(activeProjects.length);
    document.querySelector("#completed-tasks").textContent = String(allTasks.filter(isTaskCompleted).length);

    const next = activeProjects
      .filter((project) => dateFromValue(project.dueDate))
      .sort((a, b) => dateFromValue(a.dueDate) - dateFromValue(b.dueDate))[0];
    document.querySelector("#next-deadline").textContent = next ? formatDate(next.dueDate) : "—";
  }

  function projectMatches(project) {
    const progress = progressOf(project);
    const isCompleted = progress >= 100;
    if (selectedFilter === "active" && isCompleted) return false;
    if (selectedFilter === "completed" && !isCompleted) return false;
    if (!searchTerm) return true;
    const haystack = [project.name, project.description, ...(Array.isArray(project.members) ? project.members.map(memberName) : [])]
      .join(" ")
      .toLocaleLowerCase("es");
    return haystack.includes(searchTerm);
  }

  function renderProjects() {
    const projects = getProjects();
    const displayed = projects.filter(projectMatches);
    const grid = document.querySelector("#projects-grid");
    const countLabel = document.querySelector("#project-count-label");
    countLabel.textContent = `${displayed.length} proyecto${displayed.length === 1 ? "" : "s"}`;
    grid.replaceChildren();

    if (!displayed.length) {
      const empty = document.createElement("div");
      empty.className = "empty-projects";
      empty.innerHTML = "<div><i class=\"bi bi-folder2-open\" aria-hidden=\"true\"></i><h3>No encontramos proyectos</h3><p>Ajusta la búsqueda o crea un nuevo espacio para tu próxima entrega.</p><a class=\"button button-primary\" href=\"crear-proyecto.html\"><i class=\"bi bi-plus-lg\"></i> Crear proyecto</a></div>";
      grid.append(empty);
      return;
    }

    const template = document.querySelector("#project-card-template");
    displayed.forEach((project, index) => {
      const fragment = template.content.cloneNode(true);
      const card = fragment.querySelector(".project-card");
      const link = fragment.querySelector(".project-card-link");
      const progress = progressOf(project);
      const members = Array.isArray(project.members) ? project.members : [];
      const color = project.color || COLORS[index % COLORS.length];
      const state = progress >= 100 ? "Finalizado" : (project.stage || "En curso");

      card.style.setProperty("--card-color", color);
      if (progress >= 100) {
        card.style.setProperty("--state-bg", "#e8f8ef");
        card.style.setProperty("--state-color", "#27865a");
      }
      link.href = `proyecto.html?id=${encodeURIComponent(project.id)}`;
      link.setAttribute("aria-label", `Abrir proyecto ${project.name || "sin nombre"}`);
      fragment.querySelector(".project-name").textContent = project.name || "Proyecto sin nombre";
      fragment.querySelector(".project-description").textContent = project.description || "Sin descripción todavía.";
      fragment.querySelector(".project-state").textContent = state;
      fragment.querySelector(".project-deadline").textContent = formatDate(project.dueDate);
      fragment.querySelector(".project-task-count").textContent = `${tasksOf(project).length} tarea${tasksOf(project).length === 1 ? "" : "s"}`;
      fragment.querySelector(".project-progress-value").textContent = `${progress}%`;
      fragment.querySelector(".progress-fill").style.setProperty("--progress", `${progress}%`);
      renderMemberStack(fragment.querySelector(".member-stack"), members);
      grid.append(fragment);
    });
  }

  function bindControls() {
    document.querySelector("#project-search").addEventListener("input", (event) => {
      searchTerm = event.target.value.trim().toLocaleLowerCase("es");
      renderProjects();
    });
    document.querySelectorAll(".filter-button").forEach((button) => {
      button.addEventListener("click", () => {
        selectedFilter = button.dataset.filter || "all";
        document.querySelectorAll(".filter-button").forEach((item) => item.classList.toggle("is-active", item === button));
        renderProjects();
      });
    });
  }

  function init() {
    renderNavigation();
    const projects = getProjects();
    renderSummary(projects);
    renderProjects();
    bindControls();
    if (!projects.length) showToast("Aún no tienes proyectos. Crea el primero para empezar.");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
