import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

// Las pantallas del tour comparten las plantillas de Angular. Se cargan como un
// módulo local porque el marco bloquea las conexiones de red con connect-src.
const names = ['index', 'proyectos', 'crear-proyecto', 'proyecto', 'fases', 'canales',
  'entregables', 'crear-horario', 'recordatorios', 'perfil', 'editar-perfil'];
const entries = await Promise.all(names.map(async name =>
  [name, await readFile(new URL(`../src/app/pages/${name}.html`, import.meta.url), 'utf8')]));
const output = new URL('../.sandbox-generated/', import.meta.url);
await mkdir(output, { recursive: true });
await writeFile(new URL('pantallas.js', output), `export default ${JSON.stringify(Object.fromEntries(entries))};\n`);

// Public behavior modules and their sandbox imports must update as one unit.
const source = new URL('../public/js/', import.meta.url);
const modules = await Promise.all((await readdir(source)).filter(name => name.endsWith('.js')).sort()
  .map(async name => [name, await readFile(new URL(name, source))]));
const frame = await readFile(new URL('../public/sandbox/vista.html', import.meta.url), 'utf8');
const templates = await readFile(new URL('pantallas.js', output));
const hash = createHash('sha256').update(frame).update(templates);
for (const [name, content] of modules) hash.update(name).update(content);
const version = hash.digest('hex').slice(0, 16);
const assets = new URL(version + '/', output);
await Promise.all(['js/', 'sandbox/'].map(dir => mkdir(new URL(dir, assets), { recursive: true })));
await Promise.all(modules.map(([name, content]) => writeFile(new URL('js/' + name, assets), content)));
await writeFile(new URL('sandbox/pantallas.js', assets), templates);
await writeFile(new URL('sandbox/vista.html', assets), frame.replace('src="/js/sandbox-frame.js"', 'src="../js/sandbox-frame.js"'));
await writeFile(new URL('version.json', output), JSON.stringify({version}));
