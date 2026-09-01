(() => {
  "use strict";

  const COLORS = ["#7259e9", "#4d89f8", "#ee8a54", "#36aa8a", "#d7639d", "#5b91b4"];
  const app = window.App || {};
  const state = { memberIndex: 0, taskIndex: 0 };

  const uid = () => typeof app.uid === "function" ? app.uid() : `item-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const showToast = (message, type = "info") => typeof app.showToast === "function" && app.showToast(message, type);
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

  function renderNavigation() {
    if (typeof app.renderNavigation === "function") app.renderNavigation();
  }

  function memberRows() {
    return [...document.querySelectorAll(".member-input-row")];
  }

  function taskRows() {
    return [...document.querySelectorAll(".task-input-row")];
  }

  function currentMembers() {
    return memberRows().map((row, index) => ({
      id: row.dataset.memberId || `member-${index}`,
      name: row.querySelector(".member-name").value.trim(),
      contact: row.querySelector(".member-contact").value.trim(),
      color: row.dataset.color || COLORS[index % COLORS.length]
    })).filter((member) => member.name);
  }

  function updateMemberChoices() {
    const members = currentMembers();
    taskRows().forEach((row) => {
      const select = row.querySelector(".task-assignee");
      const previous = select.value;
      select.replaceChildren(new Option("Asignar después", ""));
      members.forEach((member) => select.add(new Option(member.name, member.id)));
      select.value = [...select.options].some((option) => option.value === previous) ? previous : "";
    });
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
    updateMemberChoices();
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

  function addTask(task = {}) {
    const template = document.querySelector("#task-row-template");
    const row = template.content.firstElementChild.cloneNode(true);
    row.dataset.taskId = task.id || uid();
    state.taskIndex += 1;
    row.querySelector(".task-name").value = task.title || task.name || "";
    row.querySelector(".task-date").value = task.dueDate || task.date || "";
    row.querySelector(".remove-task").addEventListener("click", () => {
      if (taskRows().length === 1) {
        showToast("Añade al menos una tarea inicial o usa la IA.", "warning");
        return;
      }
      row.remove();
      renderCalendar();
    });
    row.querySelectorAll("input, select").forEach((field) => field.addEventListener("input", renderCalendar));
    document.querySelector("#tasks-list").append(row);
    updateMemberChoices();
    const assignee = task.assigneeId || task.assignee || "";
    const matchingOption = [...row.querySelector(".task-assignee").options].find((option) => option.value === assignee || option.text === assignee);
    if (matchingOption) row.querySelector(".task-assignee").value = matchingOption.value;
    renderCalendar();
  }

  function currentTasks() {
    const members = currentMembers();
    return taskRows().map((row) => {
      const assigneeId = row.querySelector(".task-assignee").value;
      const assignee = members.find((member) => member.id === assigneeId);
      return {
        id: row.dataset.taskId || uid(),
        title: row.querySelector(".task-name").value.trim(),
        assignee: assignee?.name || "Sin asignar",
        assigneeId: assignee?.id || "",
        dueDate: row.querySelector(".task-date").value,
        status: "pending",
        stage: document.querySelector("#project-stage").value || "Planeación"
      };
    }).filter((task) => task.title);
  }

  function renderCalendar() {
    const calendar = document.querySelector("#planning-calendar");
    const taskCounter = document.querySelector("#preview-task-number");
    const monthName = document.querySelector("#preview-month");
    const tasks = currentTasks();
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

  function fillWithAI() {
    const name = document.querySelector("#project-name");
    const description = document.querySelector("#project-description");
    const dueDate = document.querySelector("#project-due-date");
    const stage = document.querySelector("#project-stage");
    if (!name.value.trim()) name.value = "Propuesta de solución para campus inteligente";
    if (!description.value.trim()) description.value = "Diseñar una solución centrada en estudiantes que responda al reto del curso, con investigación, prototipo y una presentación final clara.";
    if (!dueDate.value) dueDate.value = addDays(today(), 21);
    stage.value = "Planeación";

    if (currentMembers().length < 2) {
      addMember({ name: "Sofía Ramírez", contact: "sofia.r@universidad.edu" });
      addMember({ name: "Mateo López", contact: "mateo.l@universidad.edu" });
    }
    const generatedTasks = [
      ["Investigar necesidades y referentes", 2, 0, "Investigación"],
      ["Definir alcance y propuesta de valor", 6, 1, "Planeación"],
      ["Diseñar el prototipo inicial", 12, 2, "Diseño"],
      ["Preparar entrega y presentación", 19, 0, "Entrega"]
    ];
    document.querySelector("#tasks-list").replaceChildren();
    generatedTasks.forEach(([title, days, memberIndex, taskStage]) => {
      const members = currentMembers();
      addTask({ title, dueDate: addDays(today(), days), assigneeId: members[memberIndex % members.length]?.id, stage: taskStage });
    });
    const hint = document.querySelector("#ai-hint");
    hint.classList.add("is-filled");
    hint.querySelector("p").textContent = "La IA preparó una ruta inicial. Puedes editarla antes de crear el proyecto.";
    renderCalendar();
    showToast("Plan inicial generado con IA. Revísalo y ajústalo a tu equipo.", "success");
  }

  function updateProjectProgress(project) {
    if (typeof app.updateProjectProgress === "function") {
      const result = app.updateProjectProgress(project);
      if (typeof result === "number") project.progress = result;
      return;
    }
    project.progress = 0;
  }

  function createProject(event) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    const members = currentMembers();
    const tasks = currentTasks();
    if (!members.length) {
      showToast("Añade al menos un integrante.", "warning");
      return;
    }
    if (!tasks.length) {
      showToast("Añade por lo menos una tarea inicial.", "warning");
      return;
    }
    const project = {
      id: uid(),
      name: document.querySelector("#project-name").value.trim(),
      description: document.querySelector("#project-description").value.trim(),
      dueDate: document.querySelector("#project-due-date").value,
      stage: document.querySelector("#project-stage").value,
      color: COLORS[getProjects().length % COLORS.length],
      members,
      tasks,
      progress: 0,
      createdAt: new Date().toISOString()
    };
    updateProjectProgress(project);
    saveProjects([...getProjects(), project]);
    showToast("Proyecto creado. Tu planificación inicial ya está lista.", "success");
    window.location.assign(`/proyectos/${encodeURIComponent(project.id)}`);
  }

  function init() {
    renderNavigation();
    document.querySelector("#project-due-date").min = today();
    document.querySelector("#project-due-date").addEventListener("input", renderCalendar);
    document.querySelector("#project-stage").addEventListener("input", renderCalendar);
    document.querySelector("#add-member").addEventListener("click", () => addMember());
    document.querySelector("#add-task").addEventListener("click", () => addTask());
    document.querySelector("#ai-fill-button").addEventListener("click", fillWithAI);
    document.querySelector("#create-project-form").addEventListener("submit", createProject);
    addMember({ name: "Tú" });
    addTask();
    renderCalendar();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
