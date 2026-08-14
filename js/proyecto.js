(() => {
  "use strict";

  const COLORS = ["#7259e9", "#4d89f8", "#ee8a54", "#36aa8a", "#d7639d", "#5b91b4"];
  const app = window.App || {};
  const state = { project: null, taskFilter: "all" };

  const uid = () => typeof app.uid === "function" ? app.uid() : `item-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const showToast = (message, type = "info") => typeof app.showToast === "function" && app.showToast(message, type);
  const getProjects = () => {
    const projects = typeof app.getProjects === "function" ? app.getProjects() : [];
    return Array.isArray(projects) ? projects : [];
  };
  const saveProjects = (projects) => {
    if (typeof app.saveProjects === "function") app.saveProjects(projects);
    else localStorage.setItem("studyflow_projects", JSON.stringify(projects));
  };
  const dateFromValue = (value) => {
    if (!value) return null;
    const date = new Date(`${String(value).slice(0, 10)}T12:00:00`);
    return Number.isNaN(date.getTime()) ? null : date;
  };
  const dateKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  const todayKey = () => dateKey(new Date());
  const initials = (name) => String(name || "?").trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "?";
  const formatDate = (value, fallback = "Sin fecha") => {
    if (!value) return fallback;
    if (typeof app.formatDate === "function") return app.formatDate(value);
    const date = dateFromValue(value);
    return date ? new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short", year: "numeric" }).format(date) : fallback;
  };

  const canonicalStatus = (status) => {
    const value = String(status || "pending").toLowerCase();
    if (["completed", "complete", "done", "completada", "terminada"].includes(value)) return "completed";
    if (["in-progress", "in_progress", "progress", "doing", "en curso"].includes(value)) return "in-progress";
    return "pending";
  };
  const isTaskCompleted = (task) => canonicalStatus(task?.status) === "completed";
  const tasksOf = (project) => Array.isArray(project?.tasks) ? project.tasks : [];

  function normalizeMembers(project) {
    const source = Array.isArray(project.members) ? project.members : [];
    project.members = source.map((member, index) => {
      if (typeof member === "string") {
        return { id: `member-${project.id || "project"}-${index}`, name: member, color: COLORS[index % COLORS.length] };
      }
      return {
        ...member,
        id: member?.id || `member-${project.id || "project"}-${index}`,
        name: member?.name || member?.username || member?.email || "Sin nombre",
        color: member?.color || COLORS[index % COLORS.length]
      };
    });
    return project.members;
  }

  function prepareProject(project) {
    if (!project) return null;
    normalizeMembers(project);
    project.tasks = tasksOf(project).map((task, index) => ({
      ...task,
      id: task?.id || `task-${project.id || "project"}-${index}`,
      title: task?.title || task?.name || "Tarea sin título",
      status: canonicalStatus(task?.status),
      stage: task?.stage || "Planeación"
    }));
    return project;
  }

  function projectProgress(project) {
    const saved = Number(project?.progress);
    if (Number.isFinite(saved)) return Math.max(0, Math.min(100, Math.round(saved)));
    const tasks = tasksOf(project);
    return tasks.length ? Math.round((tasks.filter(isTaskCompleted).length / tasks.length) * 100) : 0;
  }

  function updateProjectProgress(project) {
    if (typeof app.updateProjectProgress === "function") {
      const result = app.updateProjectProgress(project);
      if (typeof result === "number") project.progress = result;
    }
    if (!Number.isFinite(Number(project.progress))) {
      const tasks = tasksOf(project);
      project.progress = tasks.length ? Math.round((tasks.filter(isTaskCompleted).length / tasks.length) * 100) : 0;
    }
  }

  function getAssignee(task, project) {
    const members = normalizeMembers(project);
    const raw = task?.assignee;
    if (raw && typeof raw === "object") {
      const matching = members.find((member) => member.id === raw.id || member.name === raw.name);
      if (matching) return matching;
      return { name: raw.name || raw.username || "Sin asignar", color: raw.color || "#a5abbc" };
    }
    const matching = members.find((member) => member.id === task?.assigneeId || member.name === raw || member.email === raw);
    return matching || { name: raw || "Sin asignar", color: "#a5abbc" };
  }

  function statusPresentation(status) {
    const normalized = canonicalStatus(status);
    const defaults = {
      pending: { label: "Pendiente", background: "#f2f3f7", color: "#737a91" },
      "in-progress": { label: "En curso", background: "#eaf2ff", color: "#3976d5" },
      completed: { label: "Completada", background: "#e8f8ef", color: "#27865a" }
    };
    const statusClass = typeof app.statusClass === "function" ? app.statusClass(normalized) : `status-${normalized}`;
    const label = typeof app.statusLabel === "function" ? app.statusLabel(normalized) : defaults[normalized].label;
    return { normalized, label, className: statusClass, ...defaults[normalized] };
  }

  function renderNavigation() {
    if (typeof app.renderNavigation === "function") app.renderNavigation();
  }

  function renderMemberStack(target, members, limit = 5) {
    target.replaceChildren();
    members.slice(0, limit).forEach((member) => {
      const avatar = document.createElement("span");
      avatar.className = "member-avatar";
      avatar.style.setProperty("--member-color", member.color || "#a5abbc");
      avatar.title = member.name;
      avatar.textContent = initials(member.name);
      target.append(avatar);
    });
    if (members.length > limit) {
      const remaining = document.createElement("span");
      remaining.className = "member-avatar member-overflow";
      remaining.textContent = `+${members.length - limit}`;
      target.append(remaining);
    }
  }

  function daysLeft(dueDate) {
    const due = dateFromValue(dueDate);
    if (!due) return "Sin fecha programada";
    const current = dateFromValue(todayKey());
    const diff = Math.round((due - current) / 86400000);
    if (diff < 0) return `${Math.abs(diff)} día${Math.abs(diff) === 1 ? "" : "s"} de retraso`;
    if (diff === 0) return "Entrega hoy";
    return `Faltan ${diff} día${diff === 1 ? "" : "s"}`;
  }

  function calendarStart(project) {
    const current = dateFromValue(todayKey());
    const dates = tasksOf(project).map((task) => dateFromValue(task.dueDate)).filter(Boolean).sort((a, b) => a - b);
    const next = dates.find((date) => date >= current) || dates[0] || dateFromValue(project.dueDate) || current;
    const start = new Date(next);
    const weekday = (start.getDay() + 6) % 7;
    start.setDate(start.getDate() - weekday);
    return start;
  }

  function makeCalendarTask(task, project) {
    const assignee = getAssignee(task, project);
    const status = statusPresentation(task.status);
    const node = document.createElement("button");
    node.type = "button";
    node.className = "calendar-task";
    node.dataset.taskId = task.id;
    node.style.setProperty("--task-color", assignee.color || "#a5abbc");
    node.textContent = task.title;
    node.setAttribute("aria-label", `Abrir detalles de la tarea ${task.title}`);

    const popover = document.createElement("span");
    popover.className = "task-popover";
    const title = document.createElement("strong");
    title.textContent = task.title;
    const projectName = document.createElement("span");
    projectName.textContent = project.name || "Proyecto";
    const person = document.createElement("span");
    person.textContent = `${assignee.name} · ${status.label}`;
    const date = document.createElement("span");
    date.textContent = formatDate(task.dueDate);
    const edit = document.createElement("span");
    edit.className = "calendar-quick-edit";
    edit.textContent = "Editar tarea";
    popover.append(title, projectName, person, date, edit);
    node.append(popover);
    node.addEventListener("click", () => openTaskDialog(task.id));
    return node;
  }

  function renderCalendar(project) {
    const container = document.querySelector("#detail-calendar");
    const start = calendarStart(project);
    const days = Array.from({ length: 7 }, (_, index) => {
      const day = new Date(start);
      day.setDate(start.getDate() + index);
      return day;
    });
    const slots = ["09:00", "12:00", "15:00"];
    container.replaceChildren();
    const corner = document.createElement("div");
    corner.className = "calendar-corner";
    container.append(corner);
    days.forEach((day) => {
      const header = document.createElement("div");
      header.className = "calendar-day-head";
      if (dateKey(day) === todayKey()) header.classList.add("is-today");
      const weekday = document.createElement("span");
      weekday.textContent = new Intl.DateTimeFormat("es-CO", { weekday: "short" }).format(day).replace(".", "");
      const dayNumber = document.createElement("strong");
      dayNumber.textContent = String(day.getDate());
      header.append(weekday, dayNumber);
      container.append(header);
    });
    slots.forEach((slot, row) => {
      const label = document.createElement("div");
      label.className = "calendar-time-label";
      label.textContent = slot;
      container.append(label);
      days.forEach((day) => {
        const cell = document.createElement("div");
        cell.className = "calendar-cell";
        const key = dateKey(day);
        if (key === project.dueDate) {
          cell.classList.add("is-due-date");
          if (row === 0) {
            const due = document.createElement("span");
            due.className = "calendar-due-marker";
            due.innerHTML = "<i class=\"bi bi-flag\" aria-hidden=\"true\"></i> Entrega";
            cell.append(due);
          }
        }
        tasksOf(project).filter((task, taskIndex) => task.dueDate === key && taskIndex % slots.length === row).forEach((task) => cell.append(makeCalendarTask(task, project)));
        container.append(cell);
      });
    });

    const legend = document.querySelector("#calendar-member-legend");
    legend.replaceChildren();
    normalizeMembers(project).forEach((member) => {
      const item = document.createElement("span");
      const dot = document.createElement("i");
      dot.className = "legend-member-dot";
      dot.style.setProperty("--legend-color", member.color);
      const name = document.createElement("span");
      name.textContent = member.name;
      item.append(dot, name);
      legend.append(item);
    });
  }

  function renderTasks(project) {
    const container = document.querySelector("#project-tasks");
    const tasks = tasksOf(project).filter((task) => state.taskFilter === "all" || canonicalStatus(task.status) === state.taskFilter);
    container.replaceChildren();
    if (!tasks.length) {
      const empty = document.createElement("div");
      empty.className = "empty-tasks";
      empty.innerHTML = "<i class=\"bi bi-clipboard-plus\" aria-hidden=\"true\"></i><p>No hay tareas en esta vista.</p><button type=\"button\" class=\"button button-secondary\" data-empty-new-task>Crear una tarea</button>";
      empty.querySelector("button").addEventListener("click", () => openTaskDialog());
      container.append(empty);
      return;
    }
    const template = document.querySelector("#task-card-template");
    tasks.forEach((task) => {
      const fragment = template.content.cloneNode(true);
      const card = fragment.querySelector(".task-card");
      const status = statusPresentation(task.status);
      const assignee = getAssignee(task, project);
      card.dataset.taskId = task.id;
      card.style.setProperty("--task-color", assignee.color || "#a5abbc");
      card.classList.toggle("is-completed", status.normalized === "completed");
      const statusElement = fragment.querySelector(".task-status");
      statusElement.textContent = status.label;
      if (status.className) statusElement.classList.add(status.className);
      statusElement.style.setProperty("--status-bg", status.background);
      statusElement.style.setProperty("--status-color", status.color);
      fragment.querySelector(".task-title").textContent = task.title;
      fragment.querySelector(".task-description").textContent = task.description || "Sin detalles adicionales.";
      fragment.querySelector(".task-stage").textContent = task.stage || "Planeación";
      fragment.querySelector(".task-date time").textContent = formatDate(task.dueDate);
      fragment.querySelector(".task-assignee > span").textContent = assignee.name;
      fragment.querySelector(".assignee-dot").style.setProperty("--task-color", assignee.color || "#a5abbc");
      const fileName = fragment.querySelector(".file-name");
      fileName.textContent = task.fileName || "Adjuntar";
      fragment.querySelector(".task-check").addEventListener("click", () => toggleTaskCompleted(task.id));
      fragment.querySelector(".task-menu-button").addEventListener("click", () => openTaskDialog(task.id));
      fragment.querySelector(".task-file-input").addEventListener("change", (event) => saveTaskFile(task.id, event.target.files?.[0]));
      container.append(fragment);
    });
  }

  function bindDetailControls() {
    document.querySelectorAll("[data-new-task]").forEach((button) => button.addEventListener("click", () => openTaskDialog()));
    document.querySelector("[data-manage-members]").addEventListener("click", openMembersDialog);
    document.querySelector("#task-status-filter").value = state.taskFilter;
    document.querySelector("#task-status-filter").addEventListener("change", (event) => {
      state.taskFilter = event.target.value;
      renderTasks(state.project);
    });
  }

  function renderProject() {
    const target = document.querySelector("#project-content");
    const project = state.project;
    if (!project) {
      target.innerHTML = "<section class=\"empty-tasks\"><i class=\"bi bi-folder-x\" aria-hidden=\"true\"></i><h1>Proyecto no encontrado</h1><p>Puede que se haya eliminado o que el enlace ya no sea válido.</p><a class=\"button button-primary\" href=\"proyectos.html\">Volver a proyectos</a></section>";
      return;
    }
    const fragment = document.querySelector("#project-detail-template").content.cloneNode(true);
    const color = project.color || COLORS[0];
    const progress = projectProgress(project);
    const completed = tasksOf(project).filter(isTaskCompleted).length;
    document.title = `${project.name || "Proyecto"} · Atempo`;
    fragment.querySelector(".project-header").style.setProperty("--project-color", color);
    fragment.querySelector(".detail-project-name").textContent = project.name || "Proyecto sin nombre";
    fragment.querySelector(".detail-project-description").textContent = project.description || "Sin descripción todavía.";
    fragment.querySelector(".project-stage-label").textContent = project.stage || "Espacio de trabajo";
    fragment.querySelector(".project-color-mark").style.setProperty("--project-color", color);
    fragment.querySelector(".detail-progress-value").textContent = `${progress}%`;
    fragment.querySelector(".progress-fill").style.setProperty("--progress", `${progress}%`);
    fragment.querySelector(".progress-fill").style.setProperty("--project-color", color);
    fragment.querySelector(".progress-caption").textContent = `${completed} de ${tasksOf(project).length} tareas completadas`;
    fragment.querySelector(".detail-due-date").textContent = formatDate(project.dueDate);
    fragment.querySelector(".detail-days-left").textContent = daysLeft(project.dueDate);
    renderMemberStack(fragment.querySelector(".detail-member-stack"), normalizeMembers(project));
    target.replaceChildren(fragment);
    renderCalendar(project);
    renderTasks(project);
    bindDetailControls();
  }

  function persistProject() {
    const projects = getProjects();
    const index = projects.findIndex((project) => String(project.id) === String(state.project.id));
    if (index >= 0) projects[index] = state.project;
    else projects.push(state.project);
    saveProjects(projects);
  }

  function findTask(id) {
    return tasksOf(state.project).find((task) => String(task.id) === String(id));
  }

  function toggleTaskCompleted(id) {
    const task = findTask(id);
    if (!task) return;
    task.status = isTaskCompleted(task) ? "in-progress" : "completed";
    updateProjectProgress(state.project);
    persistProject();
    renderProject();
    showToast(isTaskCompleted(task) ? "Tarea marcada como completada." : "Tarea reabierta.", "success");
  }

  function saveTaskFile(id, file) {
    if (!file) return;
    const task = findTask(id);
    if (!task) return;
    task.fileName = file.name;
    persistProject();
    renderTasks(state.project);
    showToast(`Archivo “${file.name}” asociado a la tarea.`, "success");
  }

  function openDialog(dialog) {
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  }

  function closeDialog(dialog) {
    if (typeof dialog.close === "function") dialog.close();
    else dialog.removeAttribute("open");
  }

  function fillAssigneeOptions(select, selected = "") {
    select.replaceChildren(new Option("Sin asignar", ""));
    normalizeMembers(state.project).forEach((member) => select.add(new Option(member.name, member.id)));
    const matching = [...select.options].find((option) => option.value === selected || option.text === selected);
    if (matching) select.value = matching.value;
  }

  function openTaskDialog(taskId) {
    const dialog = document.querySelector("#task-dialog");
    const form = document.querySelector("#task-form");
    const task = taskId ? findTask(taskId) : null;
    form.reset();
    document.querySelector("#editing-task-id").value = task?.id || "";
    document.querySelector("#task-dialog-kicker").textContent = task ? "Editar tarea" : "Nueva tarea";
    document.querySelector("#task-dialog-title").textContent = task ? "Actualiza la tarea" : "Añade una tarea";
    document.querySelector("#task-title-input").value = task?.title || "";
    document.querySelector("#task-description-input").value = task?.description || "";
    fillAssigneeOptions(document.querySelector("#task-assignee-input"), task?.assigneeId || task?.assignee || "");
    document.querySelector("#task-date-input").value = task?.dueDate || state.project.dueDate || "";
    document.querySelector("#task-stage-input").value = task?.stage || state.project.stage || "Planeación";
    document.querySelector("#task-status-input").value = canonicalStatus(task?.status);
    openDialog(dialog);
    window.setTimeout(() => document.querySelector("#task-title-input").focus(), 40);
  }

  function saveTaskFromDialog(event) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    const taskId = document.querySelector("#editing-task-id").value;
    const selectedMember = normalizeMembers(state.project).find((member) => member.id === document.querySelector("#task-assignee-input").value);
    const payload = {
      id: taskId || uid(),
      title: document.querySelector("#task-title-input").value.trim(),
      description: document.querySelector("#task-description-input").value.trim(),
      assignee: selectedMember?.name || "Sin asignar",
      assigneeId: selectedMember?.id || "",
      dueDate: document.querySelector("#task-date-input").value,
      stage: document.querySelector("#task-stage-input").value,
      status: canonicalStatus(document.querySelector("#task-status-input").value)
    };
    const existingIndex = tasksOf(state.project).findIndex((task) => String(task.id) === String(taskId));
    if (existingIndex >= 0) state.project.tasks[existingIndex] = { ...state.project.tasks[existingIndex], ...payload };
    else state.project.tasks.push(payload);
    updateProjectProgress(state.project);
    persistProject();
    closeDialog(document.querySelector("#task-dialog"));
    renderProject();
    showToast(existingIndex >= 0 ? "Tarea actualizada." : "Nueva tarea creada.", "success");
  }

  function addDialogMember(member = {}) {
    const fragment = document.querySelector("#dialog-member-row-template").content.cloneNode(true);
    const row = fragment.querySelector(".dialog-member-row");
    const existingRows = document.querySelectorAll(".dialog-member-row").length;
    row.dataset.memberId = member.id || uid();
    row.dataset.color = member.color || COLORS[existingRows % COLORS.length];
    const avatar = fragment.querySelector(".member-row-avatar");
    const nameInput = fragment.querySelector(".dialog-member-name");
    const contactInput = fragment.querySelector(".dialog-member-contact");
    nameInput.value = member.name || "";
    contactInput.value = member.contact || member.email || "";
    const paint = () => {
      avatar.style.setProperty("--member-color", row.dataset.color);
      avatar.textContent = initials(nameInput.value);
    };
    nameInput.addEventListener("input", paint);
    fragment.querySelector(".remove-dialog-member").addEventListener("click", () => {
      if (document.querySelectorAll(".dialog-member-row").length === 1) {
        showToast("El proyecto necesita al menos un integrante.", "warning");
        return;
      }
      row.remove();
    });
    document.querySelector("#dialog-members-list").append(fragment);
    paint();
  }

  function openMembersDialog() {
    const list = document.querySelector("#dialog-members-list");
    list.replaceChildren();
    normalizeMembers(state.project).forEach(addDialogMember);
    openDialog(document.querySelector("#members-dialog"));
  }

  function saveMembersFromDialog(event) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    const members = [...document.querySelectorAll(".dialog-member-row")].map((row, index) => ({
      id: row.dataset.memberId || uid(),
      color: row.dataset.color || COLORS[index % COLORS.length],
      name: row.querySelector(".dialog-member-name").value.trim(),
      contact: row.querySelector(".dialog-member-contact").value.trim()
    })).filter((member) => member.name);
    if (!members.length) {
      showToast("Conserva al menos un integrante.", "warning");
      return;
    }
    state.project.members = members;
    state.project.tasks.forEach((task) => {
      const retained = members.find((member) => member.id === task.assigneeId || member.name === task.assignee);
      if (!retained) {
        task.assignee = "Sin asignar";
        task.assigneeId = "";
      } else {
        task.assignee = retained.name;
        task.assigneeId = retained.id;
      }
    });
    persistProject();
    closeDialog(document.querySelector("#members-dialog"));
    renderProject();
    showToast("Equipo actualizado.", "success");
  }

  function bindDialogs() {
    document.querySelectorAll("[data-close-dialog]").forEach((button) => button.addEventListener("click", () => closeDialog(button.closest("dialog"))));
    document.querySelector("#task-form").addEventListener("submit", saveTaskFromDialog);
    document.querySelector("#members-form").addEventListener("submit", saveMembersFromDialog);
    document.querySelector("#dialog-add-member").addEventListener("click", () => addDialogMember());
  }

  function loadProject() {
    const requestedId = new URLSearchParams(window.location.search).get("id");
    let project = requestedId && typeof app.getProject === "function" ? app.getProject(requestedId) : null;
    if (!project) {
      const projects = getProjects();
      project = requestedId ? projects.find((item) => String(item.id) === String(requestedId)) : projects[0];
    }
    state.project = prepareProject(project);
  }

  function init() {
    renderNavigation();
    bindDialogs();
    loadProject();
    renderProject();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
