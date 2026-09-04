(() => {
  "use strict";

  const STORAGE_KEY = "atempo.subjects";
  const SELECTED_SCHEDULE_KEY = "atempo.selectedSchedule";
  const CALENDAR_START = 7 * 60;
  const CALENDAR_END = 19 * 60;
  const DAYS = [
    { id: "lunes", label: "Lunes", short: "Lun" },
    { id: "martes", label: "Martes", short: "Mar" },
    { id: "miercoles", label: "Miércoles", short: "Mié" },
    { id: "jueves", label: "Jueves", short: "Jue" },
    { id: "viernes", label: "Viernes", short: "Vie" },
  ];

  const seedSubjects = [
    {
      id: "seed-arquitectura",
      name: "Arquitectura de software",
      day: "martes",
      start: "08:00",
      end: "10:00",
      professor: "Prof. Andrea Torres",
      credits: 3,
    },
    {
      id: "seed-bases",
      name: "Bases de datos",
      day: "lunes",
      start: "10:00",
      end: "12:00",
      professor: "Prof. Daniel Gil",
      credits: 3,
    },
    {
      id: "seed-gestion",
      name: "Gestión de proyectos",
      day: "jueves",
      start: "14:00",
      end: "16:00",
      professor: "Prof. Valentina Ríos",
      credits: 2,
    },
  ];

  let subjects = [];
  let generatedSchedules = [];
  let selectedScheduleId = null;

  const getById = (id) => document.getElementById(id);

  function createId() {
    if (window.App && typeof window.App.uid === "function") {
      return window.App.uid();
    }

    return `subject-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function escapeHTML(value) {
    if (window.App && typeof window.App.escapeHTML === "function") {
      return window.App.escapeHTML(String(value));
    }

    const element = document.createElement("div");
    element.textContent = String(value);
    return element.innerHTML;
  }

  function showToast(message, tone = "info") {
    if (window.App && typeof window.App.showToast === "function") {
      window.App.showToast(message, tone);
      return;
    }

    // Fallback for standalone preview while the shared application script is not loaded.
    window.alert(message);
  }

  function timeToMinutes(time) {
    const [hours, minutes] = String(time).split(":").map(Number);
    if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return NaN;
    return hours * 60 + minutes;
  }

  function minutesToTime(totalMinutes) {
    const clamped = Math.max(CALENDAR_START, Math.min(CALENDAR_END, totalMinutes));
    const hours = Math.floor(clamped / 60);
    const minutes = clamped % 60;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  }

  function formatTime(time) {
    return String(time).replace(/^0/, "");
  }

  function colorIndex(subject) {
    const source = `${subject.id || ""}${subject.name || ""}`;
    let hash = 0;
    for (let index = 0; index < source.length; index += 1) {
      hash = (hash * 31 + source.charCodeAt(index)) | 0;
    }
    return Math.abs(hash) % 6;
  }

  function getDayLabel(day) {
    return DAYS.find((item) => item.id === day)?.label || day;
  }

  function normalizeSubject(subject) {
    if (!subject || typeof subject !== "object") return null;

    const day = DAYS.some((item) => item.id === subject.day) ? subject.day : null;
    const start = timeToMinutes(subject.start);
    const end = timeToMinutes(subject.end);
    const name = String(subject.name || "").trim().slice(0, 80);

    if (!name || !day || !Number.isFinite(start) || !Number.isFinite(end) || start >= end) {
      return null;
    }

    return {
      id: String(subject.id || createId()),
      name,
      day,
      start: minutesToTime(start),
      end: minutesToTime(end),
      professor: String(subject.professor || "").trim().slice(0, 70),
      credits: Number.isFinite(Number(subject.credits)) && Number(subject.credits) > 0 ? Number(subject.credits) : 0,
    };
  }

  function loadSubjects() {
    try {
      const savedSubjects = JSON.parse(window.localStorage.getItem(STORAGE_KEY));
      if (Array.isArray(savedSubjects)) {
        return savedSubjects.map(normalizeSubject).filter(Boolean);
      }
    } catch (error) {
      // Invalid local data should not prevent the schedule page from being usable.
    }

    return seedSubjects.map((subject) => ({ ...subject }));
  }

  function persistSubjects() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(subjects));
    } catch (error) {
      // Storage can be unavailable in private/embedded contexts; the in-memory view still works.
    }
  }

  function resetGeneratedSchedules() {
    generatedSchedules = [];
    selectedScheduleId = null;
    getById("ai-results").hidden = true;
    getById("save-schedule").disabled = true;
  }

  function creditsTotal(courses) {
    return courses.reduce((total, course) => total + (Number(course.credits) || 0), 0);
  }

  function courseCountLabel(courses) {
    return `${courses.length} ${courses.length === 1 ? "materia" : "materias"}`;
  }

  function renderSubjectList() {
    const list = getById("subject-list");
    const count = getById("subject-count");
    count.textContent = subjects.length;

    if (!subjects.length) {
      list.innerHTML = '<p class="subjects-empty">Todavía no registras materias. Añade la primera para empezar a crear tu horario.</p>';
      return;
    }

    list.innerHTML = subjects
      .map((subject) => {
        const color = colorIndex(subject);
        const credits = subject.credits ? ` · ${subject.credits} cr.` : "";
        return `
          <article class="subject-item schedule-color-${color}">
            <span class="subject-item__marker" aria-hidden="true"></span>
            <div class="subject-item__content">
              <div class="subject-item__name" title="${escapeHTML(subject.name)}">${escapeHTML(subject.name)}</div>
              <div class="subject-item__meta">
                <span>${escapeHTML(getDayLabel(subject.day))}</span>
                <span>${formatTime(subject.start)}–${formatTime(subject.end)}${escapeHTML(credits)}</span>
              </div>
            </div>
            <button class="subject-remove" type="button" data-remove-subject="${escapeHTML(subject.id)}" aria-label="Eliminar ${escapeHTML(subject.name)}" title="Eliminar materia">
              <i class="bi bi-trash3"></i>
            </button>
          </article>`;
      })
      .join("");
  }

  function eventMarkup(subject, compact = false) {
    const start = timeToMinutes(subject.start);
    const end = timeToMinutes(subject.end);
    const safeStart = Math.max(CALENDAR_START, start);
    const safeEnd = Math.min(CALENDAR_END, end);

    if (safeEnd <= CALENDAR_START || safeStart >= CALENDAR_END || safeEnd <= safeStart) return "";

    const top = ((safeStart - CALENDAR_START) / (CALENDAR_END - CALENDAR_START)) * 100;
    const height = ((safeEnd - safeStart) / (CALENDAR_END - CALENDAR_START)) * 100;
    const color = colorIndex(subject);
    const label = `${subject.name}, ${getDayLabel(subject.day)}, ${subject.start} a ${subject.end}${subject.professor ? `, ${subject.professor}` : ""}`;

    if (compact) {
      return `<span class="schedule-mini-event schedule-color-${color}" style="top:${top}%;height:${Math.max(height, 4)}%" title="${escapeHTML(label)}"></span>`;
    }

    return `
      <article class="schedule-event schedule-color-${color}" style="top:${top}%;height:calc(${height}% - 5px)" title="${escapeHTML(label)}" aria-label="${escapeHTML(label)}">
        <span class="schedule-event__name">${escapeHTML(subject.name)}</span>
        <span class="schedule-event__time">${formatTime(subject.start)} – ${formatTime(subject.end)}</span>
      </article>`;
  }

  function renderCalendar(courses, calendarTitle = "Tu semana actual") {
    const calendar = getById("draft-calendar");
    const caption = getById("draft-calendar-caption");
    const dayHeaders = DAYS.map(
      (day) => `<div class="schedule-calendar__day-name"><span>${day.short}</span>${day.label}</div>`,
    ).join("");

    const timeLabels = [];
    for (let hour = 7; hour <= 19; hour += 1) {
      const position = ((hour * 60 - CALENDAR_START) / (CALENDAR_END - CALENDAR_START)) * 100;
      const lastClass = hour === 19 ? " schedule-time-label--last" : "";
      timeLabels.push(`<span class="schedule-time-label${lastClass}" style="top:${position}%">${String(hour).padStart(2, "0")}:00</span>`);
    }

    const dayColumns = DAYS.map((day) => {
      const classes = courses.filter((course) => course.day === day.id).map((course) => eventMarkup(course)).join("");
      const emptyMessage = !courses.length && day.id === "miercoles" ? '<p class="schedule-calendar__empty">Tu horario aparecerá aquí.</p>' : "";
      return `<div class="schedule-calendar__day ${day.id === "miercoles" ? "schedule-calendar__day--today" : ""}" data-day="${day.id}">${classes}${emptyMessage}</div>`;
    }).join("");

    calendar.innerHTML = `
      <div class="schedule-calendar__header-time">Hora</div>
      ${dayHeaders}
      <div class="schedule-calendar__time-axis">${timeLabels.join("")}</div>
      ${dayColumns}`;

    getById("draft-calendar-title").textContent = calendarTitle;
    caption.textContent = courses.length
      ? `${courseCountLabel(courses)} distribuidas durante la semana.`
      : "Añade materias para visualizar tu horario.";
    getById("draft-credit-count").textContent = `${creditsTotal(courses)} ${creditsTotal(courses) === 1 ? "crédito" : "créditos"}`;
  }

  function renderDraft() {
    renderSubjectList();
    renderCalendar(subjects);
  }

  /*
   * Las alternativas SELECCIONAN materias, nunca las mueven de hora.
   * La versión anterior recolocaba las clases a horas inventadas: un horario
   * no se puede reubicar, la hora la fija la universidad. Lo único que puede
   * variar es qué materias entran en cada propuesta y cuáles se descartan por
   * chocar entre sí.
   */

  /** Dos materias chocan si comparten día y sus franjas se solapan. */
  function chocan(primera, segunda) {
    return primera.day === segunda.day
      && timeToMinutes(primera.start) < timeToMinutes(segunda.end)
      && timeToMinutes(segunda.start) < timeToMinutes(primera.end);
  }

  /** Recorre las materias en el orden dado y descarta las que chocan con las ya elegidas. */
  function seleccionarSinChoques(ordenadas) {
    const elegidas = [];
    ordenadas.forEach((materia) => {
      if (!elegidas.some((elegida) => chocan(elegida, materia))) {
        elegidas.push({ ...materia });
      }
    });
    return elegidas;
  }

  /** Orden de registro: intenta conservar todo lo que el estudiante añadió. */
  function createBalancedCourses() {
    return seleccionarSinChoques(subjects);
  }

  /** Da preferencia a las materias que empiezan temprano. */
  function createMorningCourses() {
    return seleccionarSinChoques(
      [...subjects].sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start)));
  }

  /** Da preferencia a las materias con más créditos. */
  function createCompactCourses() {
    return seleccionarSinChoques(
      [...subjects].sort((a, b) => (Number(b.credits) || 0) - (Number(a.credits) || 0)));
  }

  /** Porcentaje de materias registradas que la propuesta consigue incluir. */
  function cobertura(courses) {
    return subjects.length ? Math.round((courses.length / subjects.length) * 100) : 0;
  }

  function longestGap(courses) {
    let maximum = 0;
    DAYS.forEach((day) => {
      const items = courses
        .filter((course) => course.day === day.id)
        .sort((first, second) => timeToMinutes(first.start) - timeToMinutes(second.start));
      for (let index = 1; index < items.length; index += 1) {
        const gap = timeToMinutes(items[index].start) - timeToMinutes(items[index - 1].end);
        maximum = Math.max(maximum, gap);
      }
    });
    return maximum;
  }

  function completionTime(courses) {
    const latest = courses.reduce((result, course) => Math.max(result, timeToMinutes(course.end)), CALENDAR_START);
    return minutesToTime(latest);
  }

  function generateSchedules() {
    const balanced = createBalancedCourses();
    const morning = createMorningCourses();
    const compact = createCompactCourses();

    generatedSchedules = [
      {
        id: "balanced",
        type: "Recomendada",
        name: "Todo lo que registraste",
        description: `Mantiene tus materias en su horario real. Incluye ${balanced.length} de ${subjects.length}.`,
        score: cobertura(balanced),
        courses: balanced,
      },
      {
        id: "morning",
        type: "Alternativa",
        name: "Empezar temprano",
        description: `Ante un choque, se queda con la materia que empieza antes. Incluye ${morning.length} de ${subjects.length}.`,
        score: cobertura(morning),
        courses: morning,
      },
      {
        id: "compact",
        type: "Alternativa",
        name: "Más créditos",
        description: `Ante un choque, se queda con la materia de más créditos. Incluye ${compact.length} de ${subjects.length}.`,
        score: cobertura(compact),
        courses: compact,
      },
    ];
    selectedScheduleId = generatedSchedules[0].id;
  }

  function miniCalendarMarkup(courses) {
    return DAYS.map((day) => {
      const events = courses.filter((course) => course.day === day.id).map((course) => eventMarkup(course, true)).join("");
      return `<span class="schedule-mini-day" aria-label="${day.label}">${events}</span>`;
    }).join("");
  }

  function renderScheduleOptions() {
    const options = getById("schedule-options");
    options.innerHTML = generatedSchedules
      .map((schedule) => {
        const selected = schedule.id === selectedScheduleId;
        const longestPause = longestGap(schedule.courses);
        const pauseLabel = longestPause ? `${Math.round(longestPause / 60 * 10) / 10} h pausa máx.` : "Sin pausas largas";
        return `
          <button class="schedule-option${selected ? " is-selected" : ""}" type="button" data-schedule-option="${schedule.id}" aria-pressed="${selected}" role="listitem">
            <i class="bi bi-check-circle-fill schedule-option__selected" aria-hidden="true"></i>
            <div class="schedule-option__top">
              <div>
                <p class="schedule-option__type">${escapeHTML(schedule.type)}</p>
                <h3 class="schedule-option__name">${escapeHTML(schedule.name)}</h3>
              </div>
              <span class="schedule-option__score" title="Afinidad estimada">${schedule.score}%</span>
            </div>
            <p class="schedule-option__description">${escapeHTML(schedule.description)}</p>
            <div class="schedule-mini-week" aria-hidden="true">${miniCalendarMarkup(schedule.courses)}</div>
            <div class="schedule-option__metrics">
              <span><i class="bi bi-clock"></i> Hasta ${formatTime(completionTime(schedule.courses))}</span>
              <span><i class="bi bi-cup-hot"></i> ${pauseLabel}</span>
            </div>
          </button>`;
      })
      .join("");
  }

  function selectSchedule(scheduleId) {
    const selected = generatedSchedules.find((schedule) => schedule.id === scheduleId);
    if (!selected) return;

    selectedScheduleId = selected.id;
    renderScheduleOptions();
    renderCalendar(selected.courses, selected.name);
    getById("save-schedule").disabled = false;
  }

  function showError(message) {
    const error = getById("subject-form-error");
    error.textContent = message;
    error.hidden = false;
  }

  function clearError() {
    const error = getById("subject-form-error");
    error.textContent = "";
    error.hidden = true;
  }

  function handleSubjectSubmit(event) {
    event.preventDefault();
    clearError();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const start = timeToMinutes(formData.get("start"));
    const end = timeToMinutes(formData.get("end"));
    const name = String(formData.get("name") || "").trim();

    if (!name) {
      showError("Escribe el nombre de la materia.");
      getById("subject-name").focus();
      return;
    }

    if (!Number.isFinite(start) || !Number.isFinite(end) || start >= end) {
      showError("La hora de finalización debe ser posterior a la hora de inicio.");
      getById("subject-end").focus();
      return;
    }

    if (start < CALENDAR_START || end > CALENDAR_END) {
      showError("Por ahora el calendario admite clases entre las 07:00 y las 19:00.");
      return;
    }

    const subject = normalizeSubject({
      id: createId(),
      name,
      day: formData.get("day"),
      start: formData.get("start"),
      end: formData.get("end"),
      professor: formData.get("professor"),
      credits: formData.get("credits"),
    });

    if (!subject) {
      showError("Revisa la información de la materia e inténtalo de nuevo.");
      return;
    }

    subjects.push(subject);
    persistSubjects();
    resetGeneratedSchedules();
    renderDraft();
    form.reset();
    getById("subject-start").value = "08:00";
    getById("subject-end").value = "10:00";
    getById("subject-name").focus();
    showToast("Materia añadida al horario.", "success");
  }

  function handleRemoveSubject(event) {
    const removeButton = event.target.closest("[data-remove-subject]");
    if (!removeButton) return;

    subjects = subjects.filter((subject) => subject.id !== removeButton.dataset.removeSubject);
    persistSubjects();
    resetGeneratedSchedules();
    renderDraft();
    showToast("Materia eliminada del horario.", "info");
  }

  function handleClearSubjects() {
    if (!subjects.length) return;
    subjects = [];
    persistSubjects();
    resetGeneratedSchedules();
    renderDraft();
    showToast("Se eliminaron las materias registradas.", "info");
  }

  function handleGenerateSchedules() {
    if (!subjects.length) {
      showToast("Añade al menos una materia antes de generar alternativas.", "warning");
      getById("subject-name").focus();
      return;
    }

    generateSchedules();
    getById("ai-results").hidden = false;
    getById("ai-results-summary").textContent = `Analizamos ${courseCountLabel(subjects)} y preparamos tres formas de organizar tu semana.`;
    selectSchedule(selectedScheduleId);
    getById("ai-results").scrollIntoView({ behavior: "smooth", block: "nearest" });
    showToast("La IA preparó 3 alternativas de horario.", "success");
  }

  function handleOptionSelection(event) {
    const option = event.target.closest("[data-schedule-option]");
    if (option) selectSchedule(option.dataset.scheduleOption);
  }

  function saveSelectedSchedule() {
    const selected = generatedSchedules.find((schedule) => schedule.id === selectedScheduleId);
    if (!selected) return;

    try {
      window.localStorage.setItem(
        SELECTED_SCHEDULE_KEY,
        JSON.stringify({ ...selected, savedAt: new Date().toISOString() }),
      );
      showToast(`Guardaste la opción “${selected.name}”.`, "success");
    } catch (error) {
      showToast("No fue posible guardar el horario en este navegador.", "warning");
    }
  }

  function initialisePage() {
    if (window.App && typeof window.App.renderNavigation === "function") {
      window.App.renderNavigation();
    }

    subjects = loadSubjects();
    getById("subject-form").addEventListener("submit", handleSubjectSubmit);
    getById("subject-list").addEventListener("click", handleRemoveSubject);
    getById("clear-subjects").addEventListener("click", handleClearSubjects);
    getById("generate-schedules").addEventListener("click", handleGenerateSchedules);
    getById("schedule-options").addEventListener("click", handleOptionSelection);
    getById("save-schedule").addEventListener("click", saveSelectedSchedule);
    renderDraft();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialisePage);
  } else {
    initialisePage();
  }
})();
