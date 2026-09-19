(() => {
  "use strict";

  const COLORS = ["#7259e9", "#4d89f8", "#ee8a54", "#36aa8a", "#d7639d", "#5b91b4"];
  const DEFAULT_PHASE = "Planeación";
  const app = window.App || {};
  const state = { memberIndex: 0 };

  const uid = () => typeof app.uid === "function" ? app.uid() : `item-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const showToast = (message, type = "info") => typeof app.showToast === "function" && app.showToast(message, type);
  const projectFieldIds = { nombre: "project-name", descripcion: "project-description", fechaEntrega: "project-due-date", modoReparto: "project-assignment-mode" };
  const getProjects = () => typeof app.getProjects === "function" && Array.isArray(app.getProjects()) ? app.getProjects() : [];
  const saveProjects = (projects) => {
    if (typeof app.saveProjects === "function") app.saveProjects(projects);
    else localStorage.setItem("studyflow_projects", JSON.stringify(projects));
  };
  const today = () => new Date().toISOString().slice(0, 10);
  const addDays = (value, days) => {
    const date = new Date(`${value}T12:00:00`);
    date.setDate(date.getDate() + days);
    return date.toISOString().slice(0, 10);
  };
  const initials = (name) => String(name || "?").trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "?";
  const dateFromValue = (value) => {
    const date = value ? new Date(`${String(value).slice(0, 10)}T12:00:00`) : null;
    return date && !Number.isNaN(date.getTime()) ? date : null;
  };

  function clearProjectErrors() {
    document.querySelectorAll("[data-field-error]").forEach((message) => {
      message.textContent = "";
      message.classList.remove("is-visible");
    });
    Object.values(projectFieldIds).forEach((id) => document.querySelector(`#${id}`)?.removeAttribute("aria-invalid"));
  }

  function showProjectErrors(payload) {
    clearProjectErrors();
    const errors = payload?.errores && typeof payload.errores === "object" ? payload.errores : {};
    let firstField = null;
    Object.entries(errors).forEach(([field, message]) => {
      const errorNode = document.querySelector(`[data-field-error="${field}"]`);
      const input = document.querySelector(`#${projectFieldIds[field]}`);
      if (!errorNode || !input) return;
      errorNode.textContent = String(message);
      errorNode.classList.add("is-visible");
      input.setAttribute("aria-invalid", "true");
      firstField ||= input;
    });
    firstField?.focus({ preventScroll: false });
    return Boolean(firstField);
  }

  function renderNavigation() {
    if (typeof app.renderNavigation === "function") app.renderNavigation();
  }

  function memberRows() {
    return [...document.querySelectorAll(".member-input-row")];
  }

  function phaseRows() {
    return [...document.querySelectorAll(".project-phase-row")];
  }

  function currentPhases() {
    const seen = new Set();
    return phaseRows().map((row) => row.querySelector(".project-phase-name").value.trim())
      .filter((name) => name && !seen.has(name.toLocaleLowerCase("es")) && (seen.add(name.toLocaleLowerCase("es")), true));
  }

  function addProjectPhase(name = "") {
    const template = document.querySelector("#project-phase-row-template");
    const row = template.content.firstElementChild.cloneNode(true);
    const input = row.querySelector(".project-phase-name");
    input.value = name;
    input.addEventListener("input", renderCalendar);
    row.querySelector(".remove-project-phase").addEventListener("click", () => {
      if (phaseRows().length === 1) {
        showToast("El proyecto necesita al menos una fase.", "warning");
        return;
      }
      row.remove();
      renderCalendar();
    });
    document.querySelector("#project-phases").append(row);
    renderCalendar();
    return row;
  }

  function currentMembers() {
    return memberRows().map((row, index) => ({
      id: row.dataset.memberId || `member-${index}`,
      name: row.querySelector(".member-name").value.trim(),
      contact: row.querySelector(".member-contact").value.trim(),
      color: row.dataset.color || COLORS[index % COLORS.length]
    })).filter((member) => member.name);
  }

  function assignmentMode() {
    return document.querySelector('input[name="modoReparto"]:checked')?.value || null;
  }

  function updateAssignmentMode() {
    const libre = assignmentMode() === "libre";
    const hint = document.querySelector("#reparto-create-hint");
    if (!hint) return;
    hint.textContent = libre
      ? "Las tareas empiezan libres. Se pueden tomar cuando sus dependencias estén terminadas."
      : assignmentMode() === "asignado"
        ? "Puedes asignar ahora o después, y cambiar el modo desde el diagrama de fases."
        : "Elige cómo se repartirán las tareas antes de crear el proyecto.";
  }

  function updateMemberAvatars() {
    memberRows().forEach((row, index) => {
      const input = row.querySelector(".member-name");
      const avatar = row.querySelector(".member-row-avatar");
      const color = row.dataset.color || COLORS[index % COLORS.length];
      row.dataset.color = color;
      avatar.style.setProperty("--member-color", color);
      avatar.textContent = initials(input.value);
    });
  }

  function addMember(member = {}) {
    const template = document.querySelector("#member-row-template");
    const row = template.content.firstElementChild.cloneNode(true);
    row.dataset.memberId = member.id || uid();
    row.dataset.color = member.color || COLORS[state.memberIndex % COLORS.length];
    state.memberIndex += 1;
    row.querySelector(".member-name").value = member.name || "";
    row.querySelector(".member-contact").value = member.contact || member.email || "";
    row.querySelector(".remove-member").addEventListener("click", () => {
      if (memberRows().length === 1) {
        showToast("El proyecto necesita al menos un integrante.", "warning");
        return;
      }
      row.remove();
      updateMemberAvatars();
      renderCalendar();
    });
    row.querySelector(".member-name").addEventListener("input", () => {
      updateMemberAvatars();
      renderCalendar();
    });
    row.querySelector(".member-contact").addEventListener("input", renderCalendar);
    document.querySelector("#members-list").append(row);
    updateMemberAvatars();
  }

  function renderCalendar() {
    const calendar = document.querySelector("#planning-calendar");
    const taskCounter = document.querySelector("#preview-task-number");
    const monthName = document.querySelector("#preview-month");
    const tasks = [];
    const dueDate = document.querySelector("#project-due-date").value;
    const dates = [...tasks.map((task) => dateFromValue(task.dueDate)).filter(Boolean), dateFromValue(dueDate)].filter(Boolean);
    const anchor = dates.sort((a, b) => a - b)[0] || new Date(`${today()}T12:00:00`);
    const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1, 12);
    const daysInMonth = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0).getDate();
    const offset = (first.getDay() + 6) % 7;
    monthName.textContent = new Intl.DateTimeFormat("es-CO", { month: "long", year: "numeric" }).format(first);
    taskCounter.textContent = `${tasks.length} tarea${tasks.length === 1 ? "" : "s"}`;
    calendar.replaceChildren();

    for (let blank = 0; blank < offset; blank += 1) {
      const node = document.createElement("span");
      node.className = "calendar-day is-empty";
      calendar.append(node);
    }
    const currentDate = today();
    for (let day = 1; day <= daysInMonth; day += 1) {
      const dateValue = `${first.getFullYear()}-${String(first.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const cell = document.createElement("div");
      cell.className = "calendar-day";
      if (dateValue === currentDate) cell.classList.add("is-today");
      if (dateValue === dueDate) cell.classList.add("is-due");
      const number = document.createElement("span");
      number.className = "calendar-day-number";
      number.textContent = String(day);
      cell.append(number);
      tasks.filter((task) => task.dueDate === dateValue).slice(0, 2).forEach((task, index) => {
        const marker = document.createElement("i");
        marker.className = "calendar-task-marker";
        const member = currentMembers().find((item) => item.id === task.assigneeId);
        marker.style.setProperty("--marker-color", member?.color || COLORS[index % COLORS.length]);
        marker.title = task.title;
        cell.append(marker);
      });
      calendar.append(cell);
    }
  }

  function previewDeliveryDate() {
    const calendar = document.querySelector("#planning-calendar");
    const preview = calendar?.closest("aside");
    if (!calendar || !preview) return;
    preview.classList.remove("is-date-previewing");
    void preview.offsetWidth;
    preview.classList.add("is-date-previewing");
  }

  function applyProjectTemplate() {
    const name = document.querySelector("#project-name");
    const description = document.querySelector("#project-description");
    const dueDate = document.querySelector("#project-due-date");
    if (!name.value.trim()) name.value = "Propuesta de solución para campus inteligente";
    if (!description.value.trim()) description.value = "Diseñar una solución centrada en estudiantes que responda al reto del curso, con investigación, prototipo y una presentación final clara.";
    if (!dueDate.value) dueDate.value = addDays(today(), 21);
    if (!currentPhases().length) addProjectPhase(DEFAULT_PHASE);
    if (currentMembers().length < 2) {
      addMember({ name: "Sofía Ramírez", contact: "sofia.r@universidad.edu" });
      addMember({ name: "Mateo López", contact: "mateo.l@universidad.edu" });
    }
    const hint = document.querySelector("#project-template-hint");
    hint.classList.add("is-filled");
    hint.querySelector("p").textContent = "Plantilla aplicada. Puedes editar todos los datos antes de crear el proyecto.";
    renderCalendar();
    showToast("Plantilla aplicada. Revisa y edita los datos antes de crear el proyecto.", "success");
  }

  function updateProjectProgress(project) {
    if (typeof app.updateProjectProgress === "function") {
      const result = app.updateProjectProgress(project);
      if (typeof result === "number") project.progress = result;
      return;
    }
    project.progress = 0;
  }

  /*
   * Crea el proyecto en el servidor. Antes se guardaba solo en localStorage y
   * la redirección apuntaba a un identificador que la base no conocía: la
   * página del proyecto se quedaba cargando. Ahora se usa el código que
   * devuelve la API, que es el mismo que aparece en la URL.
   */
  async function createProject(event) {
    event.preventDefault();
    const form = event.currentTarget;
    clearProjectErrors();
    const members = currentMembers();
    const tasks = [];

    const boton = form.querySelector("button[type='submit']");
    const textoOriginal = boton.innerHTML;
    boton.disabled = true;
    boton.innerHTML = '<i class="bi bi-hourglass-split"></i> Creando…';

    try {
      const respuesta = await fetch("/api/proyectos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: document.querySelector("#project-name").value.trim(),
          descripcion: document.querySelector("#project-description").value.trim(),
          fechaEntrega: document.querySelector("#project-due-date").value || null,
          etapas: currentPhases(),
          modoReparto: assignmentMode(),
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          // El primer integrante es siempre quien crea: el servidor lo añade solo.
          integrantes: members.slice(1).map((member) => ({
            nombre: member.name,
            contacto: member.contact || null
          })),
          tareas: tasks.map((task) => ({
            titulo: task.title,
            descripcion: null,
            responsable: task.assignee === "Sin asignar" ? null : task.assignee,
            etapa: task.stage,
            fechaLimite: task.dueDate || null,
            horaLimite: "09:00",
            estado: "sin-empezar"
          }))
        })
      });

      if (!respuesta.ok) {
        const detalle = await respuesta.json().catch(() => ({}));
        const error = new Error(detalle.detail || detalle.mensaje || detalle.message || "No se pudo crear el proyecto.");
        error.shownInForm = showProjectErrors(detalle);
        throw error;
      }
      const proyecto = await respuesta.json();
      showToast("Proyecto creado. Abriendo su espacio de trabajo…", "success");
      app.navigate(`/proyectos/${encodeURIComponent(proyecto.codigo)}`);
    } catch (error) {
      if (!error.shownInForm) showToast(error.message, "error");
      boton.disabled = false;
      boton.innerHTML = textoOriginal;
    }
  }

  function init() {
    renderNavigation();
    const dueDate = document.querySelector("#project-due-date");
    const updateDeliveryPreview = () => { renderCalendar(); previewDeliveryDate(); };
    dueDate.addEventListener("input", updateDeliveryPreview);
    dueDate.addEventListener("change", updateDeliveryPreview);
    document.querySelectorAll('input[name="modoReparto"]').forEach((radio) => radio.addEventListener("change", () => {
      updateAssignmentMode();
      renderCalendar();
    }));
    document.querySelector("#add-member").addEventListener("click", () => addMember());
    document.querySelector("#add-project-phase").addEventListener("click", () => addProjectPhase());
    document.querySelector("#apply-project-template").addEventListener("click", applyProjectTemplate);
    document.querySelector("#create-project-form").addEventListener("submit", createProject);
    Object.values(projectFieldIds).forEach((id) => {
      const field = document.querySelector(`#${id}`);
      field.addEventListener("input", clearProjectErrors);
      field.addEventListener("change", clearProjectErrors);
    });
    addMember({ name: "Tú" });
    addProjectPhase(DEFAULT_PHASE);
    updateAssignmentMode();
    renderCalendar();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
