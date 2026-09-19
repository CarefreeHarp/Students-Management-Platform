const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { construirRamas } = require('../src/main/resources/static/js/fases.js');

const task = (id, dependencias = []) => ({ id, titulo: `Tarea ${id}`, dependencias });
const stage = (...tareas) => ({ nombre: 'Etapa', tareas });

test('empty phases have a stable empty layout', () => {
  const layout = construirRamas([stage()]);
  assert.deepEqual(layout.tareas, []);
  assert.deepEqual(layout.conexiones, []);
  assert.equal(layout.carriles, 1);
  assert.equal(layout.ciclo, false);
});

test('dependencies override stage order and always point downward', () => {
  const layout = construirRamas([stage(task(3, [2])), stage(task(1), task(2, [1]))]);
  assert.deepEqual(layout.tareas.map(t => t.id), [1, 2, 3]);
  assert.deepEqual(layout.conexiones, [{ desde: 1, hasta: 2 }, { desde: 2, hasta: 3 }]);
  assert.equal(layout.carriles, 1);
});

test('forks create separate lanes and both dependencies survive a merge', () => {
  const layout = construirRamas([stage(task(1), task(2, [1]), task(3, [1]), task(4, [2, 3]))]);
  assert.equal(layout.carriles, 2);
  assert.notEqual(layout.tareas.find(t => t.id === 2).carril, layout.tareas.find(t => t.id === 3).carril);
  assert.deepEqual(layout.conexiones.filter(c => c.hasta === 4), [{ desde: 2, hasta: 4 }, { desde: 3, hasta: 4 }]);
});

test('independent tasks do not get fictitious dependency lines', () => {
  const layout = construirRamas([stage(task(1), task(2), task(3))]);
  assert.deepEqual(layout.conexiones, []);
  assert.equal(layout.carriles, 1);
});

test('unknown and repeated dependencies cannot lose tasks or duplicate edges', () => {
  const layout = construirRamas([stage(task(1), task(2, [1, 1, 99]))]);
  assert.equal(layout.tareas.length, 2);
  assert.deepEqual(layout.conexiones, [{ desde: 1, hasta: 2 }]);
  assert.equal(layout.ciclo, false);
});

test('legacy cycles stay visible with a warning and no upward edges', () => {
  const layout = construirRamas([stage(task(1, [2]), task(2, [1]))]);
  assert.equal(layout.ciclo, true);
  assert.equal(layout.tareas.length, 2);
  const indexes = new Map(layout.tareas.map((t, i) => [t.id, i]));
  assert.ok(layout.conexiones.every(c => indexes.get(c.desde) < indexes.get(c.hasta)));
});

test('layout is deterministic and does not mutate the API payload', () => {
  const input = [stage(task(1), task(2, [1]), task(3, [1]), task(4, [2, 3]))];
  const before = JSON.stringify(input);
  assert.deepEqual(construirRamas(input), construirRamas(input));
  assert.equal(JSON.stringify(input), before);
});

test('dependency branches communicate direction through their top-to-bottom layout, not arrow heads', () => {
  const source = fs.readFileSync(path.join(__dirname, '../src/main/resources/static/js/fases.js'), 'utf8');
  assert.doesNotMatch(source, /marker-end=/);
  assert.doesNotMatch(source, /branch-node-arrow-/);
});

test('each dependency has a usable hover target that isolates its related tasks', () => {
  const source = fs.readFileSync(path.join(__dirname, '../src/main/resources/static/js/fases.js'), 'utf8');
  const styles = fs.readFileSync(path.join(__dirname, '../src/main/resources/static/css/fases-ramas.css'), 'utf8');
  assert.match(source, /branch-edge-hit/);
  assert.match(source, /enfocarRelacion/);
  assert.match(styles, /\.branch-edge-hit[^}]*stroke-width:\s*18/);
  assert.match(styles, /\.branch-diagram\.has-focus \.branch-task \{ opacity:\s*\.28/);
});

test('diagram layers keep phase decoration, relationships, nodes and details in that order', () => {
  const source = fs.readFileSync(path.join(__dirname, '../src/main/resources/static/js/fases.js'), 'utf8');
  const styles = fs.readFileSync(path.join(__dirname, '../src/main/resources/static/css/fases-ramas.css'), 'utf8');
  assert.match(source, /enfocarConjunto\(new Set\(\[id\]\)\)/);
  assert.match(styles, /\.branch-phase-group::before \{[^}]*z-index: 1/);
  assert.match(styles, /\.branch-svg \{[^}]*z-index: 2/);
  assert.match(styles, /\.branch-row \{[^}]*z-index: 3/);
  assert.match(styles, /\.branch-node-detail \{ position: absolute; z-index: 5/);
});
