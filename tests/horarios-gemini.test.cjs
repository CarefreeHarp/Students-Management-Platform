const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const resources = path.join(__dirname, '../src/main/resources');
const script = fs.readFileSync(path.join(resources, 'static/js/crear-horario.js'), 'utf8');
const template = fs.readFileSync(path.join(resources, 'templates/crear-horario.html'), 'utf8');
const sesion = (day, start, end) => ({day, start, end});
const materias = [
  {id: 'algebra', name: 'Álgebra', credits: 4, options: [
    {id: 'a', sessions: [sesion('lunes', '08:00', '10:00')]},
    {id: 'b', sessions: [sesion('martes', '14:00', '16:00'), sesion('jueves', '14:00', '16:00')]},
  ]},
  {id: 'otra', name: 'Excluida', credits: 3, options: [{id: 'c', sessions: [sesion('lunes', '07:00', '08:00')]}]},
];
const alternativa = {
  id: 31, tipo: 'gemini', nombre: 'Tardes', descripcion: 'Dos <clases>', seleccionado: false, totalCreditos: 4, omitidas: [],
  materias: [{nombre: 'Álgebra', creditos: 4, indiceColor: 0, opcion: 2, bloques: [
    {dia: 'martes', horaInicio: '14:00', horaFin: '16:00'}, {dia: 'jueves', horaInicio: '14:00', horaFin: '16:00'},
  ]}],
};

async function abrir(responder, sandbox = false) {
  const elementos = new Map();
  for (const [, id] of template.matchAll(/\bid="([^"]+)"/g)) {
    if (sandbox && id === 'generate-schedules') continue;
    elementos.set(id, {
      eventos: {}, style: {setProperty() {}}, classList: {toggle() {}}, reset() {},
      addEventListener(tipo, accion) { this.eventos[tipo] = accion; },
    });
  }
  const radios = {
    day: ['any', 'early', 'late'].map(value => ({value})),
    breaks: ['any', 'short', 'long'].map(value => ({value})),
  };
  const grupo = selector => selector.includes('schedule-day-preference') ? radios.day : radios.breaks;
  const document = {
    readyState: 'complete',
    getElementById: id => elementos.get(id),
    querySelectorAll: grupo,
    querySelector: selector => grupo(selector).find(input => input.checked),
  };
  const datos = new Map([
    ['studyflow.schedule.subjects.v2', JSON.stringify(materias)],
    ['studyflow.schedule.choices.v2', JSON.stringify({algebra: 'a', otra: ''})],
    ['studyflow.schedule.preferences', JSON.stringify({day: 'late', breaks: 'short', moreCredits: true})],
  ]);
  const localStorage = {getItem: key => datos.get(key) ?? null, setItem: (key, value) => datos.set(key, value)};
  const llamadas = [];
  async function fetch(url, opts = {}) {
    llamadas.push({url, method: opts.method || 'GET', body: opts.body && JSON.parse(opts.body)});
    const [status, data] = await responder(url, opts);
    return {status, ok: status === 200, json: async () => structuredClone(data)};
  }
  vm.runInNewContext(script, {document, window: {localStorage}, fetch});
  await new Promise(resolve => setImmediate(resolve));
  return {elemento: id => elementos.get(id), llamadas};
}

test('Horarios envía todas las secciones incluidas y dibuja la combinación de Gemini en Tu semana', async () => {
  const {elemento, llamadas} = await abrir(url => [200, url.endsWith('/generar') ? [alternativa] : []]);
  await elemento('generate-schedules').eventos.click();
  const envio = llamadas[1];
  assert.equal(envio.url, '/api/horarios/generar');
  assert.equal(envio.method, 'POST');
  assert.deepEqual(envio.body.preferencias, {jornada: 'late', pausas: 'short', masCreditos: true});
  assert.deepEqual(envio.body.materias.map(m => m.nombre), ['Álgebra']);
  assert.deepEqual(envio.body.materias[0].opciones[1].map(b => b.dia), ['martes', 'jueves']);
  assert.match(elemento('draft-calendar').innerHTML, /Álgebra, opción 2, Jueves/);
  assert.match(elemento('schedule-alternatives').innerHTML, /Dos &lt;clases&gt;/);
  await elemento('save-schedule').eventos.click();
  assert.deepEqual(llamadas.slice(-1).map(l => [l.url, l.method]), [['/api/horarios/31/seleccionar', 'PATCH']]);
  assert.equal(elemento('save-schedule').textContent, 'Guardado en tu cuenta');
  elemento('return-to-draft').eventos.click();
  assert.match(elemento('draft-calendar').innerHTML, /Álgebra, Lunes/);
});

test('un fallo del proveedor conserva el horario elegido y permite reintentar', async () => {
  const {elemento} = await abrir(url => url.endsWith('/generar') ? [429, {detail: 'Cuota agotada'}]
    : [200, [{...alternativa, seleccionado: true}]]);
  await elemento('generate-schedules').eventos.click();
  assert.equal(elemento('schedule-ai-status').textContent, 'Cuota agotada');
  assert.equal(elemento('generate-schedules').disabled, false);
  assert.equal(elemento('save-schedule').textContent, 'Guardado en tu cuenta');
  assert.match(elemento('draft-calendar').innerHTML, /Álgebra, opción 2, Jueves/);
});

test('el recorrido público usa el editor manual sin contactar la API', async () => {
  const {llamadas, elemento} = await abrir(() => assert.fail('Llamada desde el recorrido'), true);
  assert.deepEqual(llamadas, []);
  assert.match(elemento('draft-calendar').innerHTML, /Álgebra, Lunes/);
});
