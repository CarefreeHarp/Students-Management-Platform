export function mount(scope) {
  const { t: uiText } = scope;
  const { document, listen, request, later, animate } = scope;

  const accountSuffix = scope.user ? `.${scope.user.id}` : "";
  const STORAGE_KEY = "studyflow.schedule.subjects.v2" + accountSuffix;
  const CHOICES_KEY = "studyflow.schedule.choices.v2" + accountSuffix;
  const PREFERENCES_KEY = "studyflow.schedule.preferences" + accountSuffix;
  const SELECTED_SCHEDULE_KEY = "atempo.selectedSchedule" + accountSuffix;
  const CALENDAR_START = 6 * 60;
  const CALENDAR_END = 22 * 60;
  const DAYS = [
    { id: "lunes", label: uiText("crear_horario.lunes"), short: uiText("crear_horario.lun") },
    { id: "martes", label: uiText("crear_horario.martes"), short: uiText("crear_horario.mar") },
    { id: "miercoles", label: uiText("crear_horario.miercoles"), short: uiText("crear_horario.mie") },
    { id: "jueves", label: uiText("crear_horario.jueves"), short: uiText("crear_horario.jue") },
    { id: "viernes", label: uiText("crear_horario.viernes"), short: uiText("crear_horario.vie") },
    { id: "sabado", label: uiText("crear_horario.sabado"), short: uiText("crear_horario.sab") },
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
  let alternatives = [];
  let preview = null;
  let busy = false;
  let draftRevision = 0;
  const getById = (id) => document.getElementById(id);
  const createId = () => scope.app?.uid?.() || `subject-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const dayLabel = (id) => DAYS.find((day) => day.id === id)?.label || id;
  const escapeHTML = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  const showToast = (message, tone = "info") => scope.app?.showToast?.(message, tone);

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
      getById("schedule-storage-status").textContent = uiText("crear_horario.no_se_pudo_guardar_en_este_navegador_conserva");
      return false;
    }
  }

  async function loadSubjects() {
    const saved = readStorage(STORAGE_KEY, null);
    if (Array.isArray(saved)) return saved.map(normalizeSubject).filter(Boolean);
    if (scope.user) {
      try {
        const response = await request("/api/materias");
        if (response.ok) {
          const courses = (await response.json()).map(course => normalizeSubject({
            id: `materia-${course.id}`,
            name: course.nombre,
            credits: course.creditos,
            options: [{
              id: `materia-${course.id}-horario`,
              sessions: course.bloques.map(block => ({
                day: block.dia,
                start: block.horaInicio,
                end: block.horaFin
              }))
            }]
          })).filter(Boolean);
          if (courses.length) return courses;
        }
      } catch (_) {
        // El editor permite seguir trabajando con los ejemplos si la API no responde.
      }
    } else {
      const legacy = readStorage("atempo.subjects", null);
      if (Array.isArray(legacy)) return legacy.map(normalizeSubject).filter(Boolean);
    }
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
      return (`<article class="schedule-subject-card">
        <div class="schedule-row">
          <h3>${escapeHTML(subject.name)}${subject.example ? (` <span class="schedule-example-label">${uiText("crear_horario.ejemplo")}</span>`) : ""}</h3>
          <span class="schedule-muted schedule-small">${uiText("crear_horario.2_cr", {2: subject.credits})}</span>
        </div>
        <div class="schedule-subject-controls">
          <label class="sr-only" for="subject-choice-${index}">${uiText("crear_horario.opcion_de_4", {4: escapeHTML(subject.name)})}</label>
          <select id="subject-choice-${index}" data-subject-choice="${escapeHTML(subject.id)}">
            <option value=""${selected ? "" : " selected"}>${uiText("crear_horario.no_incluir_por_ahora")}</option>
            ${subject.options.map((option, optionIndex) => (`<option value="${escapeHTML(option.id)}"${option.id === selected?.id ? " selected" : ""}>${uiText("crear_horario.opcion_2_3_4", {2: optionIndex + 1, 3: option.sessions.length, 4: option.sessions.length === 1 ? uiText("horarios.clase") : uiText("horarios.clases")})}</option>`)).join("")}
          </select>
          <button class="btn btn-ghost btn-sm" type="button" data-edit-subject="${escapeHTML(subject.id)}" aria-label="${uiText("crear_horario.editar_10", {10: escapeHTML(subject.name)})}" title="${uiText("crear_horario.editar_materia")}"><i class="bi bi-pencil" aria-hidden="true"></i></button>
          <button class="btn btn-ghost btn-sm" type="button" data-remove-subject="${escapeHTML(subject.id)}" aria-label="${uiText("crear_horario.eliminar_12", {12: escapeHTML(subject.name)})}" title="${uiText("crear_horario.eliminar_materia")}"><i class="bi bi-trash3" aria-hidden="true"></i></button>
        </div>
        <p class="schedule-subject-sessions">${selected ? selected.sessions.map((session) => `${dayLabel(session.day)} ${session.start}–${session.end}`).join("<br>") : uiText("crear_horario.esta_materia_no_aparece_en_la_vista_previa")}</p>
      </article>`);
    }).join("") : (`<p class="schedule-muted schedule-small">${uiText("crear_horario.anade_una_materia_o_carga_ejemplos_para_explorar")}</p>`);
  }

  function renderCalendar() {
    const included = preview ? preview.materias : selectedSubjects();
    const sessions = preview ? included.flatMap((materia) => materia.bloques.map((bloque) => ({
      name: materia.nombre, day: bloque.dia, start: bloque.horaInicio, end: bloque.horaFin,
      color: materia.indiceColor, section: materia.opcion,
    }))) : selectedSessions();
    const conflicts = getConflicts(sessions);
    const days = sessions.some((s) => s.day === "domingo") ? [...DAYS, {id: "domingo", label: uiText("crear_horario.domingo"), short: uiText("crear_horario.dom")}] : DAYS;
    const firstHour = Math.floor(Math.min(CALENDAR_START, ...sessions.map((s) => timeToMinutes(s.start))) / 60);
    const lastHour = Math.ceil(Math.max(CALENDAR_END, ...sessions.map((s) => timeToMinutes(s.end))) / 60);
    const span = lastHour - firstHour;
    const hours = Array.from({ length: span + 1 }, (_, index) => index + firstHour);
    const calendar = getById("draft-calendar");
    calendar.style.setProperty("--dias", days.length);
    calendar.style.setProperty("--hora", `${100 / span}%`);
    calendar.innerHTML = (`<div class="schedule-calendar__header-time">${uiText("crear_horario.hora")}</div>
      ${days.map((day) => `<div class="schedule-calendar__day-name"><span>${day.short}</span>${day.label}</div>`).join("")}
      <div class="schedule-calendar__time-axis">${hours.map((hour) => `<span class="schedule-time-label${hour === lastHour ? " schedule-time-label--last" : ""}" style="top:${(hour - firstHour) / span * 100}%">${String(hour).padStart(2, "0")}:00</span>`).join("")}</div>
      ${days.map((day) => `<div class="schedule-calendar__day" data-day="${day.id}">${sessions.filter((session) => session.day === day.id).map((session) => {
        const top = (timeToMinutes(session.start) / 60 - firstHour) / span * 100;
        const height = (timeToMinutes(session.end) - timeToMinutes(session.start)) / (span * 60) * 100;
        const color = session.color ?? subjects.findIndex((subject) => subject.id === session.subjectId) % 6;
        const label = `${session.name}${session.section ? (uiText("crear_horario.opcion") + " ") + session.section : ""}, ${day.label}, ${session.start} a ${session.end}`;
        return `<article class="schedule-event schedule-color-${color}" style="top:${top}%;height:calc(${height}% - 3px)" title="${escapeHTML(label)}" aria-label="${escapeHTML(label)}"><span class="schedule-event__name">${escapeHTML(session.name)}</span><span class="schedule-event__time">${session.start}–${session.end}${session.section ? (" " + uiText("crear_horario.op") + " ") + session.section : ""}</span></article>`;
      }).join("")}</div>`).join("")}`);
    const caption = (uiText("crear_horario.0_1_2_3_por_semana", {0: included.length, 1: included.length === 1 ? uiText("horarios.materia") : uiText("crear_horario.materias"), 2: sessions.length, 3: sessions.length === 1 ? uiText("horarios.clase") : uiText("horarios.clases")}));
    getById("draft-calendar-caption").textContent = included.length ? (preview ? `${preview.nombre} · ${caption}` : caption) : uiText("crear_horario.selecciona_una_opcion_de_cada_materia_para_verla");
    const credits = preview ? preview.totalCreditos : included.reduce((total, subject) => total + subject.credits, 0);
    getById("draft-credit-count").textContent = `${credits} ${credits === 1 ? uiText("crear_horario.credito") : uiText("crear_horario.creditos_2")}`;
    getById("schedule-conflicts").hidden = !conflicts.length;
    getById("schedule-conflicts").textContent = (uiText("crear_horario.hay_cruces_de_horario_0_elige_otra_opcion", {0: conflicts.join("; ")}));
    getById("schedule-preview-source").textContent = preview?.tipo === "gemini" ? (uiText("crear_horario.gemini_0", {0: preview.nombre}))
      : preview ? uiText("crear_horario.horario_manual_de_tu_cuenta") : uiText("crear_horario.vista_previa_de_las_opciones_que_elegiste");
    getById("return-to-draft").hidden = !preview;
    getById("save-schedule").textContent = preview?.seleccionado ? uiText("crear_horario.guardado_en_tu_cuenta") : uiText("crear_horario.guardar_horario");
    getById("save-schedule").disabled = busy || !included.length || Boolean(conflicts.length) || Boolean(preview?.seleccionado);
  }

  function renderDraft() {
    draftRevision++;
    preview = null;
    ensureChoices();
    renderSubjectList();
    renderAlternatives();
    renderCalendar();
  }

  function newOption() {
    return { id: createId(), sessions: [{ day: "lunes", start: "08:00", end: "10:00" }] };
  }

  function renderEditor() {
    getById("subject-options").innerHTML = editorOptions.map((option, optionIndex) => (`<fieldset class="schedule-option-editor">
      <legend>${uiText("crear_horario.opcion_0", {0: optionIndex + 1})}</legend>
      ${option.sessions.map((session, sessionIndex) => {
        const prefix = `session-${optionIndex}-${sessionIndex}`;
        return (`<div class="schedule-session-editor" data-option-index="${optionIndex}" data-session-index="${sessionIndex}">
          <div class="form-field schedule-session-day"><label for="${prefix}-day">${uiText("crear_horario.dia")}</label><select id="${prefix}-day" data-session-field="day">${DAYS.map((day) => `<option value="${day.id}"${session.day === day.id ? " selected" : ""}>${day.label}</option>`).join("")}</select></div>
          <div class="form-field"><label for="${prefix}-start">${uiText("crear_horario.desde")}</label><input id="${prefix}-start" type="time" min="06:00" max="22:00" value="${escapeHTML(session.start)}" data-session-field="start" required></div>
          <div class="form-field"><label for="${prefix}-end">${uiText("crear_horario.hasta")}</label><input id="${prefix}-end" type="time" min="06:00" max="22:00" value="${escapeHTML(session.end)}" data-session-field="end" required></div>
          ${option.sessions.length > 1 ? (`<button class="schedule-remove-session text-action" type="button" data-remove-session="${sessionIndex}" data-option="${optionIndex}" aria-label="${uiText("crear_horario.quitar_clase_2_de_opcion_3", {2: sessionIndex + 1, 3: optionIndex + 1})}">${uiText("crear_horario.quitar_clase")}</button>`) : ""}
        </div>`);
      }).join("")}
      <div class="schedule-row"><button class="text-action schedule-small" type="button" data-add-session="${optionIndex}">${uiText("crear_horario.anadir_dia_o_franja")}</button>${editorOptions.length > 1 ? (`<button class="text-action schedule-small" type="button" data-remove-option="${optionIndex}">${uiText("crear_horario.quitar_opcion")}</button>`) : ""}</div>
    </fieldset>`)).join("");
  }

  function resetEditor(close = true) {
    editingId = null;
    getById("subject-form").reset();
    getById("subject-editor-title").innerHTML = (`<i class="bi bi-plus-lg" aria-hidden="true"></i>${" " + uiText("crear_horario.anadir_materia")}`);
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
    if (!name) { showError(uiText("crear_horario.escribe_el_nombre_de_la_materia")); getById("subject-name").focus(); return; }
    if (!Number.isInteger(credits) || credits < 1 || credits > 30) { showError(uiText("crear_horario.indica_entre_1_y_30_creditos")); return; }
    for (const [index, option] of editorOptions.entries()) {
      if (option.sessions.some((session) => !normalizeSession(session))) { showError((uiText("crear_horario.revisa_la_opcion_0_cada_clase_debe_empezar", {0: index + 1}))); return; }
      if (option.sessions.some((session, sessionIndex) => option.sessions.slice(sessionIndex + 1).some((other) => overlap(session, other)))) { showError((uiText("crear_horario.las_clases_de_la_opcion_0_se_cruzan", {0: index + 1}))); return; }
    }
    const subject = normalizeSubject({ id: editingId || createId(), name, credits, options: editorOptions });
    if (editingId) subjects = subjects.map((entry) => entry.id === editingId ? subject : entry);
    else subjects.push(subject);
    renderDraft();
    persistDraft();
    resetEditor();
    document.dispatchEvent(new CustomEvent("studyflow:tour-action", { detail: { method: "LOCAL", path: "/horarios/materia" } }));
    showToast(uiText("crear_horario.materia_guardada_con_sus_opciones_de_horario"), "success");
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
      getById("subject-editor-title").textContent = uiText("crear_horario.editar_materia");
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
      status.textContent = uiText("crear_horario.preferencias_guardadas_en_este_navegador");
      if (announce) showToast(uiText("crear_horario.preferencias_de_horario_guardadas"), "success");
    } else {
      status.textContent = uiText("crear_horario.no_se_pudieron_guardar_las_preferencias_en_este");
      if (announce) showToast(uiText("crear_horario.no_se_pudieron_guardar_las_preferencias"), "warning");
    }
    return saved;
  }

  function renderAlternatives() {
    const button = getById("generate-schedules");
    if (!button) return;
    button.disabled = busy || !selectedSubjects().length;
    getById("schedule-alternatives").innerHTML = alternatives.map((a) => `
      <button type="button" class="schedule-alternative" data-preview-schedule="${a.id}" aria-pressed="${a.id === preview?.id}">
        <strong>${escapeHTML(a.nombre)}</strong>
        <span class="schedule-small">${escapeHTML(a.descripcion)}</span>
        <span class="schedule-muted schedule-small">${a.materias.length} ${a.materias.length === 1 ? uiText("horarios.materia") : uiText("crear_horario.materias")} · ${a.totalCreditos} ${a.totalCreditos === 1 ? uiText("crear_horario.credito") : uiText("crear_horario.creditos_2")}${a.seleccionado ? (" " + uiText("crear_horario.guardado")) : ""}</span>
        ${a.omitidas.length ? (`<span class="schedule-small">${uiText("crear_horario.0_1_fuera_por_cruce", {0: a.omitidas.map(escapeHTML).join(", "), 1: a.omitidas.length === 1 ? "queda" : "quedan"})}</span>`) : ""}
      </button>`).join("");
  }

  function aiStatus(message, error = false) {
    const status = getById("schedule-ai-status");
    status.textContent = message;
    status.classList.toggle("schedule-error", error);
  }

  async function scheduleApi(path, options = {}) {
    const response = await request("/api/horarios" + path, options);
    if (response.status === 401) throw new Error(uiText("crear_horario.tu_sesion_termino_vuelve_a_iniciar_sesion_para"));
    if (!response.ok) {
      const problem = await response.json().catch(() => ({}));
      throw new Error(problem.detail || problem.message || uiText("crear_horario.no_se_pudo_completar_la_operacion_intenta_de"));
    }
    return response.json();
  }

  function setBusy(value) {
    busy = value;
    renderAlternatives();
    renderCalendar();
  }

  async function loadAlternatives() {
    const revision = draftRevision;
    setBusy(true);
    try {
      const saved = await scheduleApi("");
      // Las versiones anteriores marcaban como IA sus propuestas simuladas.
      alternatives = saved.filter((a) => a.tipo === "gemini");
      if (revision === draftRevision) preview = saved.find((a) => a.seleccionado && ["gemini", "manual"].includes(a.tipo)) || alternatives[0] || null;
    } catch (error) {
      aiStatus(error.message, true);
    } finally {
      setBusy(false);
    }
  }

  async function generateSchedules() {
    const included = selectedSubjects();
    if (busy || !included.length) return;
    const revision = draftRevision;
    const preferences = readPreferences();
    const request = {
      materias: included.map((subject) => materiaParaApi(subject, subject.options)),
      preferencias: { jornada: preferences.day, pausas: preferences.breaks, masCreditos: preferences.moreCredits },
    };
    setBusy(true);
    aiStatus(uiText("crear_horario.gemini_esta_comparando_tus_secciones"));
    try {
      const generated = await scheduleApi("/generar", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(request),
      });
      const saved = alternatives.find((a) => a.seleccionado && !generated.some((g) => g.id === a.id));
      alternatives = saved ? [...generated, saved] : generated;
      if (revision === draftRevision) preview = generated[0];
      aiStatus(revision !== draftRevision ? uiText("crear_horario.ya_estan_las_alternativas_para_el_borrador_anterior")
        : generated.length === 1 ? uiText("crear_horario.hay_una_alternativa_ya_puedes_verla_en_tu")
        : (uiText("crear_horario.hay_0_alternativas_elige_una_para_verla_en", {0: generated.length})));
    } catch (error) {
      aiStatus(error.message, true);
    } finally {
      setBusy(false);
    }
  }

  async function saveGeneratedSchedule() {
    if (busy || !preview || preview.seleccionado) return;
    const id = preview.id;
    setBusy(true);
    try {
      await scheduleApi(`/${id}/seleccionar`, { method: "PATCH" });
      alternatives.forEach((a) => { a.seleccionado = a.id === id; });
      aiStatus(uiText("crear_horario.horario_guardado_en_tu_cuenta"));
    } catch (error) {
      aiStatus(error.message, true);
    } finally {
      setBusy(false);
    }
  }

  function materiaParaApi(subject, options) {
    return {
      nombre: subject.name, creditos: subject.credits,
      opciones: options.map((option) => option.sessions.map((s) => ({
        dia: s.day, horaInicio: s.start, horaFin: s.end,
      }))),
    };
  }

  async function saveSelectedSchedule() {
    if (preview) return saveGeneratedSchedule();
    const courses = selectedSessions();
    if (busy || !courses.length || getConflicts(courses).length) return;
    const selected = { id: "manual", name: uiText("index.mi_horario"), courses, subjects: selectedSubjects(), choices, preferences: readPreferences(), savedAt: new Date().toISOString() };
    if (getById("generate-schedules")) {
      const revision = draftRevision;
      const materias = selected.subjects.map((subject) => materiaParaApi(subject,
        subject.options.filter((option) => option.id === selected.choices[subject.id])));
      setBusy(true);
      try {
        const saved = await scheduleApi("/seleccionado", {
          method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ materias }),
        });
        alternatives.forEach((a) => { a.seleccionado = false; });
        if (revision === draftRevision) preview = saved;
        showToast(uiText("crear_horario.horario_guardado_en_tu_cuenta_y_en_la"), "success");
      } catch (error) {
        showToast(error.message, "error");
        return;
      } finally {
        setBusy(false);
      }
    }
    if (writeStorage(SELECTED_SCHEDULE_KEY, selected)) {
      getById("restore-schedule").disabled = false;
      if (!getById("generate-schedules")) showToast(uiText("crear_horario.horario_guardado_en_este_navegador"), "success");
    } else showToast(uiText("crear_horario.no_se_pudo_guardar_el_horario_en_este"), "warning");
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
    if (!saved) { showToast(uiText("crear_horario.todavia_no_hay_un_horario_guardado_para_recuperar"), "info"); return; }
    const different = JSON.stringify(subjects) !== JSON.stringify(saved.subjects)
      || subjects.some((subject) => choices[subject.id] !== saved.choices[subject.id])
      || JSON.stringify(readPreferences()) !== JSON.stringify(saved.preferences);
    if (subjects.length && different && !window.confirm(uiText("crear_horario.reemplazar_el_borrador_actual_por_tu_horario_guardado"))) return;
    subjects = saved.subjects;
    choices = saved.choices;
    loadPreferences(saved.preferences);
    resetEditor();
    renderDraft();
    persistDraft();
    writeStorage(PREFERENCES_KEY, readPreferences());
    showToast(uiText("crear_horario.horario_guardado_recuperado"), "success");
  }

  async function initialisePage() {
    subjects = await loadSubjects();
    if (scope.signal.aborted) return;
    const savedChoices = readStorage(CHOICES_KEY, {});
    choices = savedChoices && typeof savedChoices === "object" && !Array.isArray(savedChoices) ? savedChoices : {};
    resetEditor();
    renderDraft();
    loadPreferences();
    getById("schedule-preference-status").textContent = uiText("crear_horario.las_preferencias_se_guardan_con_tu_horario");
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
      if (!subjects.length || !window.confirm(uiText("crear_horario.quitar_todas_las_materias_del_borrador_el_horario"))) return;
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
      showToast(uiText("crear_horario.ejemplos_de_salud_economia_derecho_diseno_e_investigacion"), "success");
    });
    getById("schedule-preferences").addEventListener("change", () => {
      draftRevision++;
      savePreferences();
    });
    getById("save-schedule-preferences").addEventListener("click", () => savePreferences({ announce: true }));
    getById("save-schedule").addEventListener("click", saveSelectedSchedule);
    getById("return-to-draft").addEventListener("click", renderDraft);
    getById("restore-schedule").disabled = !readSavedSchedule();
    getById("restore-schedule").addEventListener("click", restoreSavedSchedule);
    if (getById("generate-schedules")) {
      getById("generate-schedules").addEventListener("click", generateSchedules);
      getById("schedule-alternatives").addEventListener("click", (event) => {
        const button = event.target.closest("[data-preview-schedule]");
        if (!button) return;
        draftRevision++;
        preview = alternatives.find((a) => String(a.id) === button.dataset.previewSchedule);
        renderCalendar();
        renderAlternatives();
        getById("schedule-alternatives").querySelector('[aria-pressed="true"]')?.focus();
      });
      loadAlternatives();
    }
  }

  initialisePage();
}
