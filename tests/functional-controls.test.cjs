const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = (...parts) => fs.readFileSync(path.join(__dirname, '..', ...parts), 'utf8');
const projectTemplate = read('src/main/resources/templates/crear-proyecto.html');
const projectScript = read('src/main/resources/static/js/crear-proyecto.js');
const sandboxScript = read('src/main/resources/static/js/sandbox.js');
const scheduleTemplate = read('src/main/resources/templates/crear-horario.html');
const scheduleScript = read('src/main/resources/static/js/crear-horario.js');
const workspaceTemplate = read('src/main/resources/templates/proyecto.html');
const workspaceScript = read('src/main/resources/static/js/proyecto.js');
const refinements = read('src/main/resources/static/css/refinamientos.css');

test('the project helper is an editable template, not a pretend AI action', () => {
  assert.match(projectTemplate, /id="apply-project-template"/);
  assert.match(projectTemplate, /Usar plantilla<\/button>/);
  assert.doesNotMatch(projectTemplate, /Rellenar con IA|ai-fill-button/);
  assert.match(projectScript, /function applyProjectTemplate\(\)/);
  assert.match(projectScript, /#apply-project-template"\)\.addEventListener\("click", applyProjectTemplate\)/);
  assert.doesNotMatch(projectTemplate, /Etapa inicial|id="project-stage"/);
  assert.doesNotMatch(projectScript, /etapaInicial:|#project-stage/);
  assert.match(projectScript, /Plantilla aplicada\. Puedes editar todos los datos/);
});

test('the initial project calendar does not expose disabled fake navigation', () => {
  assert.match(projectTemplate, /mini-calendar-header--static/);
  assert.doesNotMatch(projectTemplate, /aria-label="Mes (anterior|siguiente)"/);
  assert.match(projectTemplate, /id="preview-month" aria-live="polite"/);
});

test('the sandbox unlocks the project workspace after the current create-project tour step', () => {
  assert.match(sandboxScript, /finalSpotByChapter=\[0,8,1,3,0,1,1,1,0\]/);
  assert.match(sandboxScript, /destinationChapter===chapter\+1&&completedTourSteps\.has/);
});

test('task validation errors stay in the dialog as a red alert instead of repeated toasts', () => {
  assert.match(workspaceTemplate, /id="task-form-error" class="task-form-error" role="alert"/);
  assert.match(workspaceScript, /function mostrarErrorTarea\(mensaje\)/);
  assert.match(workspaceScript, /mostrarErrorTarea\(error\.message\)/);
  assert.match(refinements, /\.task-form-error\{[^}]*var\(--estado-danger\)/);
});

test('schedule preferences persist through a real save action without claiming AI generation', () => {
  assert.match(scheduleTemplate, /id="save-schedule-preferences"/);
  assert.match(scheduleTemplate, /Guardar preferencias<\/button>/);
  assert.doesNotMatch(scheduleTemplate, /Generar horarios con IA|Próximamente|generate-schedules/);
  assert.match(scheduleScript, /function savePreferences\(/);
  assert.match(scheduleScript, /writeStorage\(PREFERENCES_KEY, readPreferences\(\)\)/);
  assert.match(scheduleScript, /getById\("save-schedule-preferences"\)\.addEventListener\("click", \(\) => savePreferences\(\{ announce: true \}\)\)/);
});
