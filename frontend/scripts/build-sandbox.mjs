import { mkdir, readFile, writeFile } from 'node:fs/promises';

// Las pantallas del tour comparten las plantillas de Angular. Se cargan como un
// módulo local porque el marco bloquea las conexiones de red con connect-src.
const names = ['index', 'proyectos', 'crear-proyecto', 'proyecto', 'fases', 'canales',
  'entregables', 'crear-horario', 'recordatorios', 'perfil', 'editar-perfil'];
const entries = await Promise.all(names.map(async name =>
  [name, await readFile(new URL(`../src/app/pages/${name}.html`, import.meta.url), 'utf8')]));
const output = new URL('../.sandbox-generated/', import.meta.url);
await mkdir(output, { recursive: true });
await writeFile(new URL('pantallas.js', output), `export default ${JSON.stringify(Object.fromEntries(entries))};\n`);
