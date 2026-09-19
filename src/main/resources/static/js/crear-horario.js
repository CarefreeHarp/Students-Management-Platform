(() => {
  "use strict";

  const STORAGE_KEY = "studyflow.schedule.subjects.v2";
  const CHOICES_KEY = "studyflow.schedule.choices.v2";
  const PREFERENCES_KEY = "studyflow.schedule.preferences";
  const SELECTED_SCHEDULE_KEY = "atempo.selectedSchedule";
  const CALENDAR_START = 6 * 60;
  const CALENDAR_END = 22 * 60;
  const DAYS = [
    { id: "lunes", label: "Lunes", short: "Lun" },
    { id: "martes", label: "Martes", short: "Mar" },
    { id: "miercoles", label: "Miércoles", short: "Mié" },
    { id: "jueves", label: "Jueves", short: "Jue" },
    { id: "viernes", label: "Viernes", short: "Vie" },
    { id: "sabado", label: "Sábado", short: "Sáb" },
  ];

  const exampleSubjects = [
    { id: "example-anatomia", name: "Anatomía humana", credits: 4, example: true, options: [
      { id: "anatomia-a", sessions: [{ day: "lunes", start: "08:00", end: "10:00" }, { day: "miercoles", start: "08:00", end: "10:00" }] },
      { id: "anatomia-b", sessions: [{ day: "martes", start: "15:00", end: "17:00" }, { day: "jueves", start: "15:00", end: "17:00" }] },
    ] },
    { id: "example-economia", name: "Microeconomía", credits: 3, example: true, options: [
      { id: "economia-a", sessions: [{ day: "martes", start: "10:00", end: "12:00" }, { day: "jueves", start: "10:00", end: "12:00" }] },
      { id: "economia-b", sessions: [{ day: "lunes", start: "14:00", end: "16:00" }, { day: "miercoles", start: "14:00", end: "16:00" }] },
    ] },
    { id: "example-derecho", name: "Argumentación jurídica", credits: 3, example: true, options: [
      { id: "derecho-a", sessions: [{ day: "martes", start: "08:00", end: "10:00" }, { day: "jueves", start: "08:00", end: "10:00" }] },
      { id: "derecho-b", sessions: [{ day: "viernes", start: "13:00", end: "17:00" }] },
    ] },
    { id: "example-diseno", name: "Taller de diseño gráfico", credits: 3, example: true, options: [
      { id: "diseno-a", sessions: [{ day: "lunes", start: "10:00", end: "12:00" }, { day: "miercoles", start: "10:00", end: "12:00" }] },
      { id: "diseno-b", sessions: [{ day: "viernes", start: "08:00", end: "12:00" }] },
    ] },
    { id: "example-investigacion", name: "Métodos de investigación", credits: 2, example: true, options: [
      { id: "investigacion-a", sessions: [{ day: "viernes", start: "08:00", end: "10:00" }] },
      { id: "investigacion-b", sessions: [{ day: "martes", start: "17:00", end: "19:00" }] },
    ] },
    { id: "example-estadistica", name: "Estadística aplicada", credits: 3, example: true, options: [
      { id: "estadistica-a", sessions: [{ day: "viernes", start: "10:00", end: "12:00" }] },
      { id: "estadistica-b", sessions: [{ day: "lunes", start: "18:00", end: "19:30" }, { day: "miercoles", start: "18:00", end: "19:30" }] },
    ] },
  ];

  let subjects = [];
  let choices = {};
  let editingId = null;
  let editorOptions = [];
  const getById = (id) => document.getElementById(id);
  const createId = () => window.App?.uid?.() || `subject-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const dayLabel = (id) => DAYS.find((day) => day.id === id)?.label || id;
  const escapeHTML = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  const showToast = (message, tone = "info") => window.App?.showToast?.(message, tone);

  function timeToMinutes(time) {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(String(time))) return NaN;
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
  }

  function normalizeSession(session) {
    if (!session || !DAYS.some((day) => day.id === session.day)) return null;
    const start = timeToMinutes(session.start);
    const end = timeToMinutes(session.end);
    if (!Number.isFinite(start) || !Number.isFinite(end) || start < CALENDAR_START || end > CALENDAR_END || start >= end) return null;
    return { day: session.day, start: session.start, end: session.end };
  }

  function normalizeSubject(subject) {
    if (!subject || typeof subject !== "object") return null;
    const name = String(subject.name || "").trim().slice(0, 80);
    const rawOptions = Array.isArray(subject.options) ? subject.options : [{ sessions: [subject] }];
    const options = rawOptions.map((option) => {
      if (!option || !Array.isArray(option.sessions) || !option.sessions.length) return null;
      const sessions = option.sessions.map(normalizeSession);
      if (sessions.some((session) => !session)) return null;
      return { id: String(option.id || createId()), sessions };
    }).filter(Boolean);
    const credits = Number(subject.credits);
    if (!name || !options.length) return null;
    return { id: String(subject.id || createId()), name, credits: Number.isInteger(credits) && credits > 0 && credits <= 30 ? credits : 3, example: subject.example === true, options };
  }

  function readStorage(key, fallback) {
    try {
      const value = window.localStorage.getItem(key);
      return value === null ? fallback : JSON.parse(value);
    } catch (_) {
      return fallback;
    }
  }

  function writeStorage(key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (_) {
      getById("schedule-storage-status").textContent = "No se pudo guardar en este navegador. Conserva esta pestaña abierta para mantener el borrador.";
      return false;
    }
  }

  function loadSubjects() {
    const saved = readStorage(STORAGE_KEY, null);
    if (Array.isArray(saved)) return saved.map(normalizeSubject).filter(Boolean);
    const legacy = readStorage("atempo.subjects", null);
    if (Array.isArray(legacy)) return legacy.map(normalizeSubject).filter(Boolean);
    return exampleSubjects.map(normalizeSubject);
  }

  function persistDraft() {
    writeStorage(STORAGE_KEY, subjects);
    writeStorage(CHOICES_KEY, choices);
  }

  function ensureChoices() {
    const next = {};
    subjects.forEach((subject) => {
      next[subject.id] = choices[subject.id] === "" ? "" : subject.options.some((option) => option.id === choices[subject.id]) ? choices[subject.id] : subject.options[0].id;
    });
    choices = next;
  }

  function selectedSubjects() {
    return subjects.filter((subject) => subject.options.some((option) => option.id === choices[subject.id]));
  }

  function selectedSessions() {
    return selectedSubjects().flatMap((subject) => {
      const option = subject.options.find((entry) => entry.id === choices[subject.id]);
      return option.sessions.map((session, index) => ({ ...session, id: `${subject.id}-${index}`, subjectId: subject.id, name: subject.name, credits: index === 0 ? subject.credits : 0 }));
    });
  }

  function overlap(first, second) {
    return first.day === second.day && timeToMinutes(first.start) < timeToMinutes(second.end) && timeToMinutes(second.start) < timeToMinutes(first.end);
  }

  function getConflicts(sessions) {
    const conflicts = [];
    sessions.forEach((first, index) => {
      sessions.slice(index + 1).forEach((second) => {
        if (overlap(first, second)) conflicts.push(`${first.name} y ${second.name} (${dayLabel(first.day).toLowerCase()})`);
      });
    });
    return [...new Set(conflicts)];
  }

  function renderSubjectList() {
    getById("subject-count").textContent = subjects.length;
    getById("clear-subjects").disabled = !subjects.length;
    getById("subject-list").innerHTML = subjects.length ? subjects.map((subject, index) => {
      const selected = subject.options.find((option) => option.id === choices[subject.id]);
      return `<article class="schedule-subject-card">
        <div class="schedule-row">
          <h3>${escapeHTML(subject.name)}${subject.example ? ' <span class="schedule-example-label">Ejemplo</span>' : ""}</h3>
          <span class="schedule-muted schedule-small">${subject.credits} cr.</span>
        </div>
        <div class="schedule-subject-controls">
          <label class="sr-only" for="subject-choice-${index}">Opción de ${escapeHTML(subject.name)}</label>
          <select id="subject-choice-${index}" data-subject-choice="${escapeHTML(subject.id)}">
            <option value=""${selected ? "" : " selected"}>No incluir por ahora</option>
            ${subject.options.map((option, optionIndex) => `<option value="${escapeHTML(option.id)}"${option.id === selected?.id ? " selected" : ""}>Opción ${optionIndex + 1} · ${option.sessions.length} ${option.sessions.length === 1 ? "clase" : "clases"}</option>`).join("")}
          </select>
          <button class="btn btn-ghost btn-sm" type="button" data-edit-subject="${escapeHTML(subject.id)}" aria-label="Editar ${escapeHTML(subject.name)}" title="Editar materia"><i class="bi bi-pencil" aria-hidden="true"></i></button>
          <button class="btn btn-ghost btn-sm" type="button" data-remove-subject="${escapeHTML(subject.id)}" aria-label="Eliminar ${escapeHTML(subject.name)}" title="Eliminar materia"><i class="bi bi-trash3" aria-hidden="true"></i></button>
        </div>
        <p class="schedule-subject-sessions">${selected ? selected.sessions.map((session) => `${dayLabel(session.day)} ${session.start}–${session.end}`).join("<br>") : "Esta materia no aparece en la vista previa."}</p>
      </article>`;
    }).join("") : '<p class="schedule-muted schedule-small">Añade una materia o carga ejemplos para explorar el planificador.</p>';
  }

  function renderCalendar() {
    const sessions = selectedSessions();
    const included = selectedSubjects();
    const conflicts = getConflicts(sessions);
    const hours = Array.from({ length: 17 }, (_, index) => index + 6);
    getById("draft-calendar").innerHTML = `<div class="schedule-calendar__header-time">Hora</div>
      ${DAYS.map((day) => `<div class="schedule-calendar__day-name"><span>${day.short}</span>${day.label}</div>`).join("")}
      <div class="schedule-calendar__time-axis">${hours.map((hour) => `<span class="schedule-time-label${hour === 22 ? " schedule-time-label--last" : ""}" style="top:${(hour - 6) / 16 * 100}%">${String(hour).padStart(2, "0")}:00</span>`).join("")}</div>
      ${DAYS.map((day) => `<div class="schedule-calendar__day" data-day="${day.id}">${sessions.filter((session) => session.day === day.id).map((session) => {
        const top = (timeToMinutes(session.start) - CALENDAR_START) / (CALENDAR_END - CALENDAR_START) * 100;
        const height = (timeToMinutes(session.end) - timeToMinutes(session.start)) / (CALENDAR_END - CALENDAR_START) * 100;
        const color = subjects.findIndex((subject) => subject.id === session.subjectId) % 6;
        const label = `${session.name}, ${day.label}, ${session.start} a ${session.end}`;
        return `<article class="schedule-event schedule-color-${color}" style="top:${top}%;height:calc(${height}% - 3px)" title="${escapeHTML(label)}" aria-label="${escapeHTML(label)}"><span class="schedule-event__name">${escapeHTML(session.name)}</span><span class="schedule-event__time">${session.start}–${session.end}</span></article>`;
      }).join("")}</div>`).join("")}`;
    getById("draft-calendar-caption").textContent = included.length ? `${included.length} ${included.length === 1 ? "materia seleccionada" : "materias seleccionadas"} · ${sessions.length} clases por semana` : "Selecciona una opción de cada materia para verla aquí.";
    const credits = included.reduce((total, subject) => total + subject.credits, 0);
    getById("draft-credit-count").textContent = `${credits} ${credits === 1 ? "crédito" : "créditos"}`;
    getById("schedule-conflicts").hidden = !conflicts.length;
    getById("schedule-conflicts").textContent = `Hay cruces de horario: ${conflicts.join("; ")}. Elige otra opción o excluye una materia para guardar.`;
    getById("save-schedule").disabled = !included.length || Boolean(conflicts.length);
  }

  function renderDraft() {
    ensureChoices();
    renderSubjectList();
    renderCalendar();
  }

  function newOption() {
    return { id: createId(), sessions: [{ day: "lunes", start: "08:00", end: "10:00" }] };
  }

  function renderEditor() {
    getById("subject-options").innerHTML = editorOptions.map((option, optionIndex) => `<fieldset class="schedule-option-editor">
      <legend>Opción ${optionIndex + 1}</legend>
      ${option.sessions.map((session, sessionIndex) => {
        const prefix = `session-${optionIndex}-${sessionIndex}`;
        return `<div class="schedule-session-editor" data-option-index="${optionIndex}" data-session-index="${sessionIndex}">
          <div class="form-field schedule-session-day"><label for="${prefix}-day">Día</label><select id="${prefix}-day" data-session-field="day">${DAYS.map((day) => `<option value="${day.id}"${session.day === day.id ? " selected" : ""}>${day.label}</option>`).join("")}</select></div>
          <div class="form-field"><label for="${prefix}-start">Desde</label><input id="${prefix}-start" type="time" min="06:00" max="22:00" value="${escapeHTML(session.start)}" data-session-field="start" required></div>
          <div class="form-field"><label for="${prefix}-end">Hasta</label><input id="${prefix}-end" type="time" min="06:00" max="22:00" value="${escapeHTML(session.end)}" data-session-field="end" required></div>
          ${option.sessions.length > 1 ? `<button class="schedule-remove-session text-action" type="button" data-remove-session="${sessionIndex}" data-option="${optionIndex}" aria-label="Quitar clase ${sessionIndex + 1} de opción ${optionIndex + 1}">Quitar clase</button>` : ""}
        </div>`;
      }).join("")}
      <div class="schedule-row"><button class="text-action schedule-small" type="button" data-add-session="${optionIndex}">+ Añadir día o franja</button>${editorOptions.length > 1 ? `<button class="text-action schedule-small" type="button" data-remove-option="${optionIndex}">Quitar opción</button>` : ""}</div>
    </fieldset>`).join("");
  }

  function resetEditor(close = true) {
    editingId = null;
    getById("subject-form").reset();
    getById("subject-editor-title").innerHTML = '<i class="bi bi-plus-lg" aria-hidden="true"></i> Añadir materia';
    getById("subject-form-error").hidden = true;
    editorOptions = [newOption()];
    renderEditor();
    if (close) getById("subject-editor").open = false;
  }

  function showError(message) {
    getById("subject-form-error").textContent = message;
    getById("subject-form-error").hidden = false;
  }

  function handleSubjectSubmit(event) {
    event.preventDefault();
    const name = getById("subject-name").value.trim();
    const credits = Number(getById("subject-credits").value);
    if (!name) { showError("Escribe el nombre de la materia."); getById("subject-name").focus(); return; }
    if (!Number.isInteger(credits) || credits < 1 || credits > 30) { showError("Indica entre 1 y 30 créditos."); return; }
    for (const [index, option] of editorOptions.entries()) {
      if (option.sessions.some((session) => !normalizeSession(session))) { showError(`Revisa la opción ${index + 1}: cada clase debe empezar antes de terminar, entre las 06:00 y las 22:00.`); return; }
      if (option.sessions.some((session, sessionIndex) => option.sessions.slice(sessionIndex + 1).some((other) => overlap(session, other)))) { showError(`Las clases de la opción ${index + 1} se cruzan. Si son alternativas, sepáralas en opciones diferentes.`); return; }
    }
    const subject = normalizeSubject({ id: editingId || createId(), name, credits, options: editorOptions });
    if (editingId) subjects = subjects.map((entry) => entry.id === editingId ? subject : entry);
    else subjects.push(subject);
    renderDraft();
    persistDraft();
    resetEditor();
    document.dispatchEvent(new CustomEvent("studyflow:tour-action", { detail: { method: "LOCAL", path: "/horarios/materia" } }));
    showToast("Materia guardada con sus opciones de horario.", "success");
  }

  function handleEditorInput(event) {
    const field = event.target.dataset.sessionField;
    if (!field) return;
    const row = event.target.closest("[data-option-index]");
    editorOptions[Number(row.dataset.optionIndex)].sessions[Number(row.dataset.sessionIndex)][field] = event.target.value;
  }

  function handleEditorClick(event) {
    const add = event.target.closest("[data-add-session]");
    const remove = event.target.closest("[data-remove-session]");
    const removeOption = event.target.closest("[data-remove-option]");
    if (add) {
      const option = editorOptions[Number(add.dataset.addSession)];
      const last = option.sessions[option.sessions.length - 1];
      const nextDay = DAYS[(DAYS.findIndex((day) => day.id === last.day) + 1) % DAYS.length].id;
      option.sessions.push({ ...last, day: nextDay });
    } else if (remove) editorOptions[Number(remove.dataset.option)].sessions.splice(Number(remove.dataset.removeSession), 1);
    else if (removeOption) editorOptions.splice(Number(removeOption.dataset.removeOption), 1);
    else return;
    renderEditor();
  }

  function handleSubjectClick(event) {
    const edit = event.target.closest("[data-edit-subject]");
    const remove = event.target.closest("[data-remove-subject]");
    if (edit) {
      const subject = subjects.find((entry) => entry.id === edit.dataset.editSubject);
      editingId = subject.id;
      getById("subject-name").value = subject.name;
      getById("subject-credits").value = subject.credits;
      editorOptions = subject.options.map((option) => ({ ...option, sessions: option.sessions.map((session) => ({ ...session })) }));
      getById("subject-editor-title").textContent = "Editar materia";
      getById("subject-form-error").hidden = true;
      renderEditor();
      getById("subject-editor").open = true;
      getById("subject-name").focus();
    } else if (remove) {
      subjects = subjects.filter((subject) => subject.id !== remove.dataset.removeSubject);
      if (editingId === remove.dataset.removeSubject) resetEditor();
      renderDraft();
      persistDraft();
    }
  }

  function loadPreferences(preferences = readStorage(PREFERENCES_KEY, {}) || {}) {
    document.querySelectorAll('[name="schedule-day-preference"]').forEach((input) => { input.checked = input.value === (["early", "late"].includes(preferences.day) ? preferences.day : "any"); });
    document.querySelectorAll('[name="schedule-break-preference"]').forEach((input) => { input.checked = input.value === (["short", "long"].includes(preferences.breaks) ? preferences.breaks : "any"); });
    getById("schedule-more-credits").checked = preferences.moreCredits === true;
  }

  function readPreferences() {
    return { day: document.querySelector('[name="schedule-day-preference"]:checked').value, breaks: document.querySelector('[name="schedule-break-preference"]:checked').value, moreCredits: getById("schedule-more-credits").checked };
  }

  function savePreferences({ announce = false } = {}) {
    const saved = writeStorage(PREFERENCES_KEY, readPreferences());
    const status = getById("schedule-preference-status");
    if (saved) {
      status.textContent = "Preferencias guardadas en este navegador.";
      if (announce) showToast("Preferencias de horario guardadas.", "success");
    } else {
      status.textContent = "No se pudieron guardar las preferencias en este navegador.";
      if (announce) showToast("No se pudieron guardar las preferencias.", "warning");
    }
    return saved;
  }

  function saveSelectedSchedule() {
    const courses = selectedSessions();
    if (!courses.length || getConflicts(courses).length) return;
    const selected = { id: "manual", name: "Mi horario", courses, subjects: selectedSubjects(), choices, preferences: readPreferences(), savedAt: new Date().toISOString() };
    if (writeStorage(SELECTED_SCHEDULE_KEY, selected)) {
      getById("restore-schedule").disabled = false;
      showToast("Horario guardado en este navegador.", "success");
    } else showToast("No se pudo guardar el horario en este navegador.", "warning");
  }

  function readSavedSchedule() {
    const saved = readStorage(SELECTED_SCHEDULE_KEY, null);
    if (!saved || typeof saved !== "object") return null;
    const savedSubjects = Array.isArray(saved.subjects) ? saved.subjects : saved.courses;
    if (!Array.isArray(savedSubjects)) return null;
    const restoredSubjects = savedSubjects.map(normalizeSubject).filter(Boolean);
    if (!restoredSubjects.length) return null;
    const restoredChoices = {};
    restoredSubjects.forEach((subject) => {
      restoredChoices[subject.id] = subject.options.some((option) => option.id === saved.choices?.[subject.id]) ? saved.choices[subject.id] : subject.options[0].id;
    });
    return { subjects: restoredSubjects, choices: restoredChoices, preferences: saved.preferences || { day: "any", breaks: "any", moreCredits: false } };
  }

  function restoreSavedSchedule() {
    const saved = readSavedSchedule();
    if (!saved) { showToast("Todavía no hay un horario guardado para recuperar.", "info"); return; }
    const different = JSON.stringify(subjects) !== JSON.stringify(saved.subjects)
      || subjects.some((subject) => choices[subject.id] !== saved.choices[subject.id])
      || JSON.stringify(readPreferences()) !== JSON.stringify(saved.preferences);
    if (subjects.length && different && !window.confirm("¿Reemplazar el borrador actual por tu horario guardado? También se recuperarán sus preferencias.")) return;
    subjects = saved.subjects;
    choices = saved.choices;
    loadPreferences(saved.preferences);
    resetEditor();
    renderDraft();
    persistDraft();
    writeStorage(PREFERENCES_KEY, readPreferences());
    showToast("Horario guardado recuperado.", "success");
  }

  function initialisePage() {
    subjects = loadSubjects();
    const savedChoices = readStorage(CHOICES_KEY, {});
    choices = savedChoices && typeof savedChoices === "object" && !Array.isArray(savedChoices) ? savedChoices : {};
    resetEditor();
    renderDraft();
    loadPreferences();
    getById("schedule-preference-status").textContent = "Las preferencias se guardan con tu horario.";
    getById("subject-form").addEventListener("submit", handleSubjectSubmit);
    getById("subject-options").addEventListener("input", handleEditorInput);
    getById("subject-options").addEventListener("change", handleEditorInput);
    getById("subject-options").addEventListener("click", handleEditorClick);
    getById("add-subject-option").addEventListener("click", () => { editorOptions.push(newOption()); renderEditor(); });
    getById("cancel-subject-edit").addEventListener("click", () => resetEditor());
    getById("subject-list").addEventListener("click", handleSubjectClick);
    getById("subject-list").addEventListener("change", (event) => {
      const id = event.target.dataset.subjectChoice;
      if (!id) return;
      choices[id] = event.target.value;
      renderDraft();
      persistDraft();
      document.querySelectorAll("[data-subject-choice]").forEach((select) => { if (select.dataset.subjectChoice === id) select.focus(); });
    });
    getById("clear-subjects").addEventListener("click", () => {
      if (!subjects.length || !window.confirm("¿Quitar todas las materias del borrador? El horario guardado se conservará.")) return;
      subjects = [];
      choices = {};
      resetEditor();
      renderDraft();
      persistDraft();
    });
    getById("load-subject-examples").addEventListener("click", () => {
      const names = new Set(subjects.map((subject) => subject.name.toLocaleLowerCase("es")));
      exampleSubjects.forEach((example) => { if (!names.has(example.name.toLocaleLowerCase("es")) && !subjects.some((subject) => subject.id === example.id)) subjects.push(normalizeSubject(example)); });
      renderDraft();
      persistDraft();
      showToast("Ejemplos de salud, economía, derecho, diseño e investigación disponibles.", "success");
    });
    getById("schedule-preferences").addEventListener("change", () => savePreferences());
    getById("save-schedule-preferences").addEventListener("click", () => savePreferences({ announce: true }));
    getById("save-schedule").addEventListener("click", saveSelectedSchedule);
    getById("restore-schedule").disabled = !readSavedSchedule();
    getById("restore-schedule").addEventListener("click", restoreSavedSchedule);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initialisePage);
  else initialisePage();
})();
