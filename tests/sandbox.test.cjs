const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createSandboxStore } = require('../src/main/resources/static/js/sandbox-store.js');

const call = (store, path, method = 'GET', body) => store.request(path, { method, body: body === undefined ? undefined : JSON.stringify(body) });
const complete = (store, taskId, resultado) => {
  const body = new FormData();
  if (resultado) body.append('resultado', resultado);
  return store.request(`/api/tareas/${taskId}/completar`, { method: 'PATCH', body });
};
const project = async (store, modoReparto = 'libre', tareas = []) => {
  const reply = await call(store, '/api/proyectos', 'POST', { nombre: 'Proyecto de prueba', descripcion: 'Contexto de prueba', fechaEntrega: '2026-12-15', modoReparto, tareas });
  assert.equal(reply.status, 200);
  return reply.data;
};
const task = (titulo) => ({ titulo, estado: 'sin-empezar', etapa: 'Planeación' });

test('starts empty with a generic visitor and memory-only storage', async () => {
  const store = createSandboxStore();
  assert.deepEqual((await call(store, '/api/proyectos')).data, []);
  assert.deepEqual((await call(store, '/api/recordatorios')).data, []);
  assert.deepEqual((await call(store, '/api/materias')).data, []);
  assert.equal((await call(store, '/api/sesion/actual')).data.usuario.nombre, 'Visitante');
  assert.equal(store.storage.getItem('studyflow_projects'), '[]');
  assert.equal(store.storage.getItem('studyflow.schedule.subjects.v2'), '[]');
  assert.equal(store.projectCode(), null);
});

test('keeps the tone selected before entering the tour inside temporary storage', () => {
  const store = createSandboxStore('claro');
  assert.equal(store.storage.getItem('studyflow-tema'), 'claro');
  store.setTheme('oscuro');
  assert.equal(store.storage.getItem('studyflow-tema'), 'oscuro');
});

test('rejects a project due today with the same field error as the backend', async () => {
  const today = new Date();
  const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const reply = await call(createSandboxStore(), '/api/proyectos', 'POST', {
    nombre: 'Fecha inválida', descripcion: 'Validar una fecha vencida',
    fechaEntrega: date, etapaInicial: 'Planeación'
  });
  assert.equal(reply.status, 400);
  assert.equal(reply.data.errores.fechaEntrega, 'La fecha de entrega debe ser posterior a la fecha actual.');
});

test('separate visits cannot see each other’s projects or storage', async () => {
  const a = createSandboxStore(), b = createSandboxStore();
  await project(a);
  a.storage.setItem('private-draft', 'solo-a');
  assert.equal((await call(a, '/api/proyectos')).data.length, 1);
  assert.deepEqual((await call(b, '/api/proyectos')).data, []);
  assert.equal(b.storage.getItem('private-draft'), null);
});

test('creates projects and tasks with compatible canonical state and owner', async () => {
  const store = createSandboxStore();
  const p = await project(store, 'libre', [task('Investigar')]);
  assert.equal(p.integrantes[0].nombre, 'Visitante');
  assert.equal(p.tareas[0].estado, 'sin-empezar');
  assert.equal(p.tareas[0].estadoEtiqueta, 'Sin empezar');
  const created = await call(store, `/api/proyectos/${p.codigo}/tareas`, 'POST', task('Diseñar'));
  assert.equal(created.data.titulo, 'Diseñar');
  assert.equal((await call(store, `/api/proyectos/${p.codigo}`)).data.tareas.length, 2);
  assert.equal(JSON.parse(store.storage.getItem('studyflow_projects'))[0].codigo, p.codigo);
  assert.equal(store.projectCode(), p.codigo);
});

test('a task deadline cannot exceed its project delivery date when creating or editing it', async () => {
  const store = createSandboxStore();
  const p = await project(store, 'asignado', [task('Alcance')]);
  const invalidCreation = await call(store, `/api/proyectos/${p.codigo}/tareas`, 'POST', {
    ...task('Fuera del proyecto'), fechaLimite: '2026-12-16'
  });
  assert.equal(invalidCreation.status, 400);
  assert.match(invalidCreation.data.mensaje, /no puede ser posterior a la fecha de entrega/);
  assert.match(invalidCreation.data.mensaje, /15\/12\/2026/);

  const invalidEdition = await call(store, `/api/tareas/${p.tareas[0].id}`, 'PUT', {
    ...p.tareas[0], fechaLimite: '2026-12-16'
  });
  assert.equal(invalidEdition.status, 400);
  assert.match(invalidEdition.data.mensaje, /no puede ser posterior a la fecha de entrega/);
  assert.match(invalidEdition.data.mensaje, /15\/12\/2026/);
});

test('projects retain only the phases configured during creation', async () => {
  const store = createSandboxStore();
  const reply = await call(store, '/api/proyectos', 'POST', {
    nombre: 'Proyecto con fases propias', descripcion: 'Prueba de configuración', fechaEntrega: '2026-12-15',
    etapas: ['Exploración', 'Prototipo', 'Exploración'], modoReparto: 'asignado'
  });
  assert.equal(reply.status, 200);
  assert.deepEqual(reply.data.etapas, ['Exploración', 'Prototipo']);
  assert.equal(reply.data.etapaActual, 'Exploración');
  const taskInDefaultStage = await call(store, `/api/proyectos/${reply.data.codigo}/tareas`, 'POST', { titulo: 'Primer prototipo' });
  assert.equal(taskInDefaultStage.data.etapa, 'Exploración');
});

test('phase management really creates, renames and orders phases without orphaning tasks', async () => {
  const store = createSandboxStore();
  const created = await call(store, '/api/proyectos', 'POST', {
    nombre: 'Fases editables', descripcion: 'Comprobar cambios posteriores', fechaEntrega: '2026-12-15',
    etapas: ['Planeación', 'Diseño'], etapaInicial: 'Planeación', modoReparto: 'asignado', tareas: [task('Descubrir necesidad')]
  });
  const p = created.data;
  const initial = (await call(store, `/api/proyectos/${p.codigo}/fases`)).data;
  const planning = initial.fases.find(fase => fase.nombre === 'Planeación');
  const design = initial.fases.find(fase => fase.nombre === 'Diseño');

  const updated = await call(store, `/api/proyectos/${p.codigo}/fases`, 'PUT', {
    fases: [
      { id: design.id, nombre: 'Diseño UX' },
      { id: planning.id, nombre: 'Descubrimiento' },
      { id: null, nombre: 'Validación' }
    ],
    etapaActualIndice: 2
  });
  assert.equal(updated.status, 200);
  assert.deepEqual(updated.data.etapas, ['Diseño UX', 'Descubrimiento', 'Validación']);
  assert.equal(updated.data.etapaActual, 'Validación');
  assert.equal(updated.data.tareas[0].etapa, 'Descubrimiento', 'Renaming keeps the task in the same phase entity.');

  const afterRename = (await call(store, `/api/proyectos/${p.codigo}/fases`)).data;
  assert.deepEqual(afterRename.fases.map(fase => fase.nombre), ['Diseño UX', 'Descubrimiento', 'Validación']);
  const rejectDelete = await call(store, `/api/proyectos/${p.codigo}/fases`, 'PUT', {
    fases: afterRename.fases
      .filter(fase => fase.nombre !== 'Descubrimiento')
      .map(fase => ({ id: fase.id, nombre: fase.nombre })),
    etapaActualIndice: 0
  });
  assert.equal(rejectDelete.status, 400);
  assert.match(rejectDelete.data.mensaje, /Mueve esas tareas/i);

  const taskToMove = (await call(store, `/api/proyectos/${p.codigo}`)).data.tareas[0];
  await call(store, `/api/tareas/${taskToMove.id}`, 'PUT', { ...taskToMove, etapa: 'Diseño UX' });
  const removable = await call(store, `/api/proyectos/${p.codigo}/fases`, 'PUT', {
    fases: afterRename.fases
      .filter(fase => fase.nombre !== 'Descubrimiento')
      .map(fase => ({ id: fase.id, nombre: fase.nombre })),
    etapaActualIndice: 0
  });
  assert.equal(removable.status, 200);
  assert.deepEqual(removable.data.etapas, ['Diseño UX', 'Validación']);
  assert.equal(removable.data.tareas[0].etapa, 'Diseño UX');
});

test('the complete guided diagram is a real, editable RAM dependency graph', async () => {
  const store = createSandboxStore();
  const p = await project(store, 'asignado', [
    { ...task('Investigar necesidad'), fechaLimite: '2026-10-01' },
    { ...task('Definir criterios'), fechaLimite: '2026-10-02' }
  ]);
  assert.equal(store.isTourDiagramPrepared(p.codigo), false);
  // The previous guided action creates a simple link; preparing the complete
  // tree turns these two tasks into the two independent roots of a real graph.
  await call(store, `/api/tareas/${p.tareas[1].id}/dependencias`, 'POST', { dependeDe: p.tareas[0].id });
  const seeded = store.prepareTourDiagram(p.codigo);
  assert.equal(seeded.tareas.length, 9);
  assert.deepEqual(['Planeación', 'Diseño', 'Implementación', 'Revisión'].every(phase => seeded.etapas.includes(phase)), true);
  const byTitle = title => seeded.tareas.find(item => item.titulo === title);
  const roots = seeded.tareas.filter(item => ['Investigar necesidad', 'Definir criterios'].includes(item.titulo));
  assert.deepEqual(roots.map(item => item.dependencias), [[], []]);
  const design = [byTitle('Mapear experiencia'), byTitle('Diseñar flujo'), byTitle('Definir arquitectura')];
  design.forEach(item => assert.deepEqual(item.dependencias, roots.map(root => root.id)));
  const implementation = [byTitle('Construir pantalla'), byTitle('Integrar contenido'), byTitle('Preparar pruebas')];
  assert.deepEqual(byTitle('Presentar resultados').dependencias, implementation.map(item => item.id));
  seeded.tareas.forEach(item => item.dependencias.forEach(dependencyId => {
    const dependency = seeded.tareas.find(candidate => candidate.id === dependencyId);
    assert.ok(new Date(`${dependency.fechaLimite}T12:00:00`) <= new Date(`${item.fechaLimite}T12:00:00`));
  }));
  const finalTask = byTitle('Presentar resultados');
  const updated = await call(store, `/api/tareas/${finalTask.id}`, 'PUT', {
    ...finalTask, titulo: 'Presentar resultados ajustados', responsable: 'Laura'
  });
  assert.equal(updated.status, 200);
  assert.equal(updated.data.titulo, 'Presentar resultados ajustados');
  assert.equal(updated.data.responsable, 'Laura');
  assert.equal(store.isTourDiagramPrepared(p.codigo), true);
  assert.equal(store.prepareTourDiagram(p.codigo).tareas.length, 9, 'Preparing again must not duplicate the interactive tasks.');
});

test('responses are copies rather than mutable references to RAM data', async () => {
  const store = createSandboxStore();
  const p = await project(store, 'libre', [task('Original')]);
  p.tareas[0].titulo = 'Intento de mutación';
  assert.equal((await call(store, `/api/proyectos/${p.codigo}`)).data.tareas[0].titulo, 'Original');
});

test('free claims wait for completed dependencies and cannot be claimed twice', async () => {
  const store = createSandboxStore();
  const p = await project(store, 'libre', [task('Investigar'), task('Diseñar')]);
  const [first, second] = p.tareas;
  await call(store, `/api/tareas/${second.id}/dependencias`, 'POST', { dependeDe: first.id });
  assert.equal((await call(store, `/api/tareas/${second.id}/reclamar`, 'POST')).status, 400);
  let diagram = (await call(store, `/api/proyectos/${p.codigo}/fases`)).data;
  assert.deepEqual(diagram.disponibles.map(t => t.id), [first.id]);
  assert.equal((await call(store, `/api/tareas/${first.id}/estado`, 'PATCH', { estado: 'terminada' })).status, 400);
  assert.equal((await complete(store, first.id, 'Investigación terminada')).status, 200);
  const claimed=(await call(store, `/api/tareas/${second.id}/reclamar`, 'POST')).data;
  assert.equal(claimed.responsable, 'Visitante');
  assert.equal(claimed.estado, 'en-proceso');
  assert.equal((await call(store, `/api/tareas/${second.id}/reclamar`, 'POST')).status, 400);
  assert.equal((await call(store, `/api/tareas/${first.id}/reclamar`, 'POST')).status, 400);
  assert.equal((await call(store, `/api/proyectos/${p.codigo}`)).data.progreso, 50);
});

test('dependency cycles, self-dependencies and cross-project links are rejected', async () => {
  const store = createSandboxStore();
  const p = await project(store, 'libre', [task('A'), task('B'), task('C')]);
  const [a, b, c] = p.tareas;
  await call(store, `/api/tareas/${b.id}/dependencias`, 'POST', { dependeDe: a.id });
  await call(store, `/api/tareas/${c.id}/dependencias`, 'POST', { dependeDe: b.id });
  assert.equal((await call(store, `/api/tareas/${a.id}/dependencias`, 'POST', { dependeDe: c.id })).status, 400);
  assert.equal((await call(store, `/api/tareas/${a.id}/dependencias`, 'POST', { dependeDe: a.id })).status, 400);
  const other = await project(store, 'libre', [task('Ajena')]);
  assert.equal((await call(store, `/api/tareas/${a.id}/dependencias`, 'POST', { dependeDe: other.tareas[0].id })).status, 400);
});

test('a dependency cannot have a later due date than the task that waits for it', async () => {
  const store = createSandboxStore();
  const p = await project(store, 'asignado', [
    { ...task('Preparar entrega'), fechaLimite: '2026-10-10' },
    { ...task('Investigación tardía'), fechaLimite: '2026-10-18' },
  ]);
  const [waitingTask, lateDependency] = p.tareas;
  const reply = await call(store, `/api/tareas/${waitingTask.id}/dependencias`, 'POST', { dependeDe: lateDependency.id });
  assert.equal(reply.status, 400);
  assert.match(reply.data.mensaje, /Verifica las fechas/);
  assert.match(reply.data.mensaje, /debe vencer antes/);
});

test('editing a task keeps both its assigned person and dependency dates consistent', async () => {
  const store = createSandboxStore();
  const p = await project(store, 'asignado', [
    { ...task('Investigación'), fechaLimite: '2026-10-10', responsable: 'Visitante' },
    { ...task('Diseño'), fechaLimite: '2026-10-15' },
  ]);
  const [research, design] = p.tareas;
  await call(store, `/api/tareas/${design.id}/dependencias`, 'POST', { dependeDe: research.id });
  const invalid = await call(store, `/api/tareas/${research.id}`, 'PUT', {
    ...research, fechaLimite: '2026-10-20', responsable: null,
  });
  assert.equal(invalid.status, 400);
  assert.match(invalid.data.mensaje, /Verifica las fechas/);
  const updated = await call(store, `/api/tareas/${research.id}`, 'PUT', {
    ...research, titulo: 'Investigación ajustada', fechaLimite: '2026-10-10', responsable: null,
  });
  assert.equal(updated.status, 200);
  assert.equal(updated.data.titulo, 'Investigación ajustada');
  assert.equal(updated.data.responsable, null);
});

test('assignment modes validate at creation and editing and preserve owners', async () => {
  const store = createSandboxStore();
  assert.equal((await call(store, '/api/proyectos', 'POST', { nombre: 'Inválido', modoReparto: 'desconocido' })).status, 400);
  assert.equal((await call(store, '/api/proyectos', 'POST', { nombre: 'Sin reparto' })).status, 400);
  const p = await project(store, 'asignado', [task('A')]);
  const id = p.tareas[0].id;
  assert.equal((await call(store, `/api/tareas/${id}/reclamar`, 'POST')).status, 400);
  assert.equal((await call(store, `/api/proyectos/${p.codigo}/reparto`, 'PATCH', { modoReparto: 'otro' })).status, 400);
  await call(store, `/api/proyectos/${p.codigo}/reparto`, 'PATCH', { modoReparto: 'libre' });
  await call(store, `/api/tareas/${id}/reclamar`, 'POST');
  await call(store, `/api/proyectos/${p.codigo}/reparto`, 'PATCH', { modoReparto: 'asignado' });
  assert.equal((await call(store, `/api/proyectos/${p.codigo}`)).data.tareas[0].responsable, 'Visitante');
  assert.equal((await call(store, `/api/tareas/${id}/liberar`, 'POST')).status, 400);
  assert.deepEqual((await call(store, `/api/proyectos/${p.codigo}/fases`)).data.disponibles, []);
});

test('tasks only accept stages that belong to their project', async () => {
  const store = createSandboxStore();
  const p = await project(store, 'asignado', [task('Inicio')]);
  const invalid = await call(store, `/api/proyectos/${p.codigo}/tareas`, 'POST', {
    ...task('Tarea ajena'), etapa: 'Validación inexistente'
  });
  assert.equal(invalid.status, 400);
  assert.match(invalid.data.mensaje, /no pertenece a este proyecto/i);
  assert.equal((await call(store, `/api/proyectos/${p.codigo}`)).data.tareas.length, 1);
});

test('personal reminders use PROGRAMADO and retain their lead time when defaults change', async () => {
  const store = createSandboxStore();
  const due = new Date(Date.now() + 86400000).toISOString();
  const r = await call(store, '/api/recordatorios', 'POST', { titulo: 'Exposición', fechaVencimiento: due, minutosAntes: 120 });
  assert.equal(r.data.estado, 'PROGRAMADO');
  const parseDate = text => {const [day,month,year,hour,minute]=text.split(/[\/ :]/).map(Number);return new Date(year,month-1,day,hour,minute);};
  assert.equal(parseDate(r.data.fechaVencimiento) - parseDate(r.data.fechaHora), 120 * 60000);
  await call(store, '/api/recordatorios/preferencias', 'PUT', { activo: true, minutosAntesTarea: 15, pasarelaConectada: true });
  assert.equal((await call(store, '/api/recordatorios')).data[0].fechaHora, r.data.fechaHora);
  assert.equal((await call(store, '/api/recordatorios/preferencias')).data.pasarelaConectada, false);
  assert.match((await call(store, '/api/recordatorios/prueba', 'POST')).data.mensaje, /No se envió/);
  await call(store, `/api/recordatorios/${r.data.id}`, 'DELETE');
  assert.equal((await call(store, '/api/recordatorios')).data[0].estado, 'CANCELADO');
});

test('invalid personal reminder dates and lead times are rejected', async () => {
  const store = createSandboxStore();
  for (const body of [
    { titulo: 'Pasado', fechaVencimiento: '2000-01-01T10:00', minutosAntes: 0 },
    { titulo: 'Fecha inválida', fechaVencimiento: 'nunca', minutosAntes: 0 },
    { titulo: 'Antelación inválida', fechaVencimiento: new Date(Date.now() + 86400000).toISOString(), minutosAntes: -1 }
  ]) assert.equal((await call(store, '/api/recordatorios', 'POST', body)).status, 400);
});

test('channels start empty and support messages and textual reaction toggles', async () => {
  const store = createSandboxStore();
  const p = await project(store);
  const general = (await call(store, `/api/proyectos/${p.codigo}/canales`)).data[0];
  assert.deepEqual(general.mensajes, []);
  assert.equal(general.slug, 'general');
  assert.equal(general.borrable, false);
  const message = (await call(store, `/api/canales/${general.id}/mensajes`, 'POST', { contenido: 'Probando' })).data;
  const reacted = (await call(store, `/api/mensajes/${message.id}/reacciones`, 'POST', { emoji: 'hecho' })).data;
  assert.deepEqual(reacted.reacciones[0], { emoji: 'hecho', total: 1, propia: true, personas: ['Visitante'] });
  assert.deepEqual((await call(store, `/api/mensajes/${message.id}/reacciones`, 'POST', { emoji: 'hecho' })).data.reacciones, []);
  assert.equal((await call(store, `/api/mensajes/${message.id}/reacciones`, 'POST', { emoji: 'invalida' })).status, 400);
  const channel = await call(store, `/api/proyectos/${p.codigo}/canales`, 'POST', { nombre: 'Investigación' });
  assert.equal(channel.data.proyectoCodigo, p.codigo);
});

test('channel summaries are generated locally, saved, and available in the sandbox', async () => {
  const store = createSandboxStore();
  const p = await project(store);
  const channel = (await call(store, `/api/proyectos/${p.codigo}/canales`)).data[0];

  const empty = await call(store, `/api/canales/${channel.id}/resumen`, 'POST');
  assert.equal(empty.status, 400);
  assert.match(empty.data.mensaje, /no tiene mensajes/i);

  await call(store, `/api/canales/${channel.id}/mensajes`, 'POST', {
    contenido: 'Quedamos en revisar el informe antes de la entrega.'
  });
  await call(store, `/api/canales/${channel.id}/mensajes`, 'POST', {
    contenido: 'Necesito confirmar la fecha de la presentación.'
  });
  const summary = await call(store, `/api/canales/${channel.id}/resumen`, 'POST');
  assert.equal(summary.status, 200);
  assert.equal(summary.data.modelo, 'Local');
  assert.equal(summary.data.mensajesResumidos, 2);
  assert.match(summary.data.contenido, /revisar el informe/i);
  assert.equal(summary.data.puntosClave.length, 2);

  const refreshed = await call(store, `/api/canales/${channel.id}`);
  assert.equal(refreshed.data.ultimoResumen.id, summary.data.id);
  const history = await call(store, `/api/canales/${channel.id}/resumenes`);
  assert.deepEqual(history.data.map(item => item.id), [summary.data.id]);
});

test('destroy clears projects, messages, reminders and transient storage', async () => {
  const store = createSandboxStore();
  await project(store, 'libre', [task('Temporal')]);
  store.storage.setItem('draft', 'contenido');
  store.sessionStorage.setItem('tour', '5');
  store.destroy();
  assert.equal(store.storage.length, 0);
  assert.equal(store.sessionStorage.length, 0);
  assert.equal(store.projectCode(), null);
  assert.deepEqual((await call(store, '/api/proyectos')).data, []);
  assert.deepEqual((await call(createSandboxStore(), '/api/proyectos')).data, []);
});

test('unsupported endpoints and wrong methods fail closed without a network fallback', async () => {
  const store = createSandboxStore();
  const p = await project(store, 'libre', [task('A')]);
  for (const [path, method] of [
    ['/api/real-database', 'POST'], ['/api/sesion/demostracion', 'POST'],
    [`/api/tareas/${p.tareas[0].id}/inventada`, 'POST'], [`/api/tareas/${p.tareas[0].id}/reclamar`, 'GET'],
    [`/api/proyectos/${p.codigo}/fases`, 'DELETE'], ['/api/proyectos', 'DELETE'],
    ['https://example.test/api/proyectos', 'GET']
  ]) assert.equal((await call(store, path, method)).status, 404, `${method} ${path}`);
});

test('AI actions explicitly report unavailable instead of simulating success', async () => {
  const store = createSandboxStore();
  assert.equal((await call(store, '/api/organizador/estado')).data.disponible, false);
  assert.equal((await call(store, '/api/organizador/plan', 'POST', {})).status, 503);
});

test('deliverables expose backend-compatible types, icons and review states', async () => {
  const store = createSandboxStore();
  const p = await project(store);
  const item = (await call(store, `/api/proyectos/${p.codigo}/entregables`, 'POST', {
    nombre: 'Prototipo', url: 'https://example.test/prototipo', tipo: 'DISENO', estado: 'BORRADOR'
  })).data;
  assert.equal(item.estado, 'BORRADOR');
  assert.equal(item.tipoEtiqueta, 'Diseño');
  assert.equal(item.icono, 'bi-palette');
  const changed = (await call(store, `/api/entregables/${item.id}/estado`, 'PATCH', { estado: 'EN_REVISION' })).data;
  assert.equal(changed.estadoEtiqueta, 'En revisión');
  await call(store, `/api/entregables/${item.id}`, 'DELETE');
  assert.deepEqual((await call(store, `/api/proyectos/${p.codigo}/entregables`)).data, []);
});

test('attachments remain blobs and use file DTO fields needed by channel views', async () => {
  const store = createSandboxStore();
  const p = await project(store);
  const channel = (await call(store, `/api/proyectos/${p.codigo}/canales`)).data[0];
  const message = (await call(store, `/api/canales/${channel.id}/mensajes`, 'POST', { contenido: 'Archivo de prueba' })).data;
  const file = new Blob(['contenido de prueba'], { type: 'text/plain' });
  Object.defineProperty(file, 'name', { value: 'notas.txt' });
  const body = { get: key => key === 'archivo' ? file : String(message.id) };
  const uploaded = await store.request(`/api/canales/${channel.id}/archivos?mensajeId=${message.id}`, { method: 'POST', body });
  assert.equal(uploaded.status, 200);
  assert.equal(uploaded.data.subidoPor, 'Visitante');
  assert.equal(uploaded.data.canal, 'General');
  assert.match(uploaded.data.url, /^blob:/);
  const refreshed = (await call(store, `/api/canales/${channel.id}`)).data;
  assert.equal(refreshed.mensajes[0].adjuntos[0].id, uploaded.data.id);
  await call(store, `/api/archivos/${uploaded.data.id}`, 'DELETE');
  assert.deepEqual((await call(store, `/api/canales/${channel.id}/archivos`)).data, []);
  store.destroy();
});
