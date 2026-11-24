// Verificación completa a la vez (campamento 61): corre todas las pruebas del repo en paralelo, cada una en su proceso, con su propio
// servidor de pruebas (puerto y base aparte), y al final un resumen con lo que tardó cada una. Sale con error si alguna falla.
// Lo que mide rendimiento (el banco de la escena y Lighthouse) corre después, SOLO, para no falsear los fps con la máquina cargada.
//
// Uso: node tests/verificar_todo.mjs [tareas…] [-j N] [--visual DIR]
//   sin tareas: todas (revisión, API, cálculos, test_ui en UI_PARTES partes, axe en claro y oscuro, barrido rápido y por pestañas,
//   y al final banco y Lighthouse). Tareas sueltas o grupos: lib api push aleatorio tsc biome recorte ruff mypy · ui (o ui:2/6) ·
//   axe (o axe:light) · barrido · pestanas · banco · lighthouse · rapidas (las de menos de un minuto) · lentas (ui, axe y barridos).
//   -j N: cuántas a la vez (por defecto, los núcleos de la máquina). --visual DIR: también la regresión visual contra DIR.
//   UI_PARTES=6 (por defecto): en cuántas partes va test_ui. PYTHON, RUFF y MYPY: dónde están (por defecto, en el PATH).
//   ESTADOS_DIR: cada axe y barrido anota ahí los estados que revisó. TEST_API: otra orden para la prueba de la API (en el sandbox, la que simula el disco sano). Registros en REGISTROS (tests/registros/).
// Las pruebas esperan sobre todo a las animaciones (no a la CPU): por eso caben más a la vez de lo que parece, pero con la máquina muy
// cargada una espera medida puede quedarse corta; si algo falla solo en paralelo, se repite esa tarea sola antes de tocar la prueba.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.join(AQUI, '..');
const PYTHON = process.env.PYTHON || 'python3';
const UI_PARTES = Number(process.env.UI_PARTES || 6);
const REGISTROS = path.resolve(process.env.REGISTROS || path.join(AQUI, 'registros'));
const MODULOS = ['server', 'auth', 'usuarios', 'backup', 'importar', 'push', 'recorte', 'ritmo', 'avisos', 'salud'].map((m) => `app/${m}.py`);

const args = process.argv.slice(2);
const opcion = (k) => { const i = args.indexOf(k); if (i < 0) return null; const v = args[i + 1]; args.splice(i, 2); return v; };
const J = Number(opcion('-j') || os.availableParallelism?.() || os.cpus().length);
const VISUAL = opcion('--visual');

// Cada tarea: su orden, su entorno y cuánto suele tardar (segundos en serie, para empezar por las largas). `sola`: después, sin compañía.
const node = (...a) => ['node', ...a];
const T = {
  lib: { cmd: node('tests/test_lib.mjs'), dura: 20 },
  api: { cmd: process.env.TEST_API ? process.env.TEST_API.split(' ') : [PYTHON, 'tests/test_api.py'], dura: 40 },
  push: { cmd: [PYTHON, 'tests/test_push_real.py'], dura: 5 },
  aleatorio: { cmd: [PYTHON, 'tests/test_aleatorio.py'], dura: 20 },
  tsc: { cmd: ['npx', '--prefix', 'tests', 'tsc', '-p', 'tests/tsconfig.json'], dura: 15 },
  biome: { cmd: ['npx', '--prefix', 'tests', 'biome', 'check', 'app/static', 'tests'], dura: 5 },
  recorte: { cmd: node('tests/comprobar_recorte.mjs'), dura: 20 },
  ruff: { cmd: [process.env.RUFF || 'ruff', 'check', 'app', '--select', 'E9,F,B,UP,SIM', '--ignore', 'E501,SIM108,UP007'], dura: 2 },
  mypy: { cmd: [process.env.MYPY || 'mypy', ...MODULOS, '--ignore-missing-imports'], dura: 30 },
};
for (let k = 1; k <= UI_PARTES; k++) T[`ui:${k}/${UI_PARTES}`] = { cmd: node('tests/test_ui.mjs'), env: { PARTE: `${k}/${UI_PARTES}` }, dura: 3300 / UI_PARTES };
for (const e of ['light', 'dark']) T[`axe:${e}`] = { cmd: node('tests/auditoria_axe.mjs'), env: { ESQUEMA: e }, dura: 660 };
// El barrido, por grupos de escenarios (SOLO): juntos, los once de siempre. Los de letra grande (hoy, anio, mil) pesan el doble.
const GRUPOS = [['anio', 'dos', 'tres'], ['hoy', 'nueve', 'largo', 'vacio'], ['mil', 'ballena', 'sinprecio', 'sinhist']];
GRUPOS.forEach((g, i) => {
  T[`barrido:${i + 1}`] = { cmd: node('tests/barrido_ui.mjs', 'rapido'), env: { SOLO: g.join(',') }, dura: 160 };
  T[`pestanas:${i + 1}`] = { cmd: node('tests/barrido_ui.mjs', 'rapido'), env: { SOLO: g.join(','), PESTANAS: '1' }, dura: 280 };
});
if (VISUAL) T.visual = { cmd: node('tests/regresion_visual.mjs', '--comparar', VISUAL), dura: 150 };
T.banco = { cmd: node('tests/banco_rendimiento.mjs'), dura: 300, sola: true };
T.lighthouse = { cmd: node('tests/rendimiento_lighthouse.mjs'), dura: 60, sola: true };
{ // que los grupos del barrido cubren exactamente los once escenarios (si se añade uno al barrido, va también aquí)
  const todos = /const TODOS = \[([^\]]+)\]/.exec(fs.readFileSync(path.join(AQUI, 'barrido_ui.mjs'), 'utf8'))[1].match(/'[^']+'/g).map((s) => s.slice(1, -1));
  const aqui = GRUPOS.flat();
  if (aqui.length !== todos.length || todos.some((e) => !aqui.includes(e))) throw new Error(`Los grupos del barrido (${aqui}) no son los escenarios de barrido_ui.mjs (${todos})`);
}

const GRUPO = {
  rapidas: ['lib', 'api', 'push', 'aleatorio', 'tsc', 'biome', 'recorte', 'ruff', 'mypy'],
  ui: Object.keys(T).filter((k) => k.startsWith('ui:')),
  axe: ['axe:light', 'axe:dark'],
  barrido: Object.keys(T).filter((k) => k.startsWith('barrido:')),
  pestanas: Object.keys(T).filter((k) => k.startsWith('pestanas:')),
};
GRUPO.lentas = [...GRUPO.ui, ...GRUPO.axe, ...GRUPO.barrido, ...GRUPO.pestanas];
const pedidas = args.length ? args.flatMap((a) => {
  if (GRUPO[a]) return GRUPO[a];
  if (T[a]) return [a];
  const ui = /^ui:(\d+)\/(\d+)$/.exec(a); // una parte de otro reparto (p. ej. ui:2/6 con UI_PARTES=3)
  if (ui) { T[a] = { cmd: node('tests/test_ui.mjs'), env: { PARTE: `${ui[1]}/${ui[2]}` }, dura: 3300 / Number(ui[2]) }; return [a]; }
  throw new Error(`No conozco la tarea «${a}». Tareas: ${Object.keys(T).join(' ')} · grupos: ${Object.keys(GRUPO).join(' ')}`);
}) : Object.keys(T);

fs.mkdirSync(REGISTROS, { recursive: true });
if (process.env.ESTADOS_DIR) fs.mkdirSync(process.env.ESTADOS_DIR, { recursive: true });
const archivo = (n) => path.join(REGISTROS, `${n.replace(/[:/]/g, '-')}.txt`);
const resultados = [];
/** Corre una tarea con su registro; devuelve cuando acaba. */
const correr = (n) => new Promise((ok) => {
  const t = T[n], t0 = Date.now(), log = fs.openSync(archivo(n), 'w');
  // ESTADOS_DIR: axe y el barrido anotan ahí, cada tarea en su archivo, los estados que revisaron (para comparar la cobertura)
  const estados = process.env.ESTADOS_DIR ? { ESTADOS: path.join(path.resolve(process.env.ESTADOS_DIR), `${n.replace(/[:/]/g, '-')}.txt`) } : {};
  const hijo = spawn(t.cmd[0], t.cmd.slice(1), { cwd: RAIZ, env: { ...process.env, ...estados, ...t.env }, stdio: ['ignore', log, log] });
  const fin = (codigo) => {
    fs.closeSync(log);
    const s = Math.round((Date.now() - t0) / 1000);
    const lineas = fs.readFileSync(archivo(n), 'utf8').trimEnd().split('\n');
    resultados.push({ n, codigo, s, ultima: lineas.at(-1)?.slice(0, 110) ?? '' });
    console.log(`${codigo === 0 ? 'bien ' : 'FALLA'} ${n.padEnd(12)} ${String(s).padStart(5)} s  ${lineas.at(-1)?.slice(0, 90) ?? ''}`);
    if (process.env.GITHUB_ACTIONS) console.log(`::group::Registro de ${n}\n${lineas.join('\n')}\n::endgroup::`); // en el CI, el registro entero (plegado)
    ok();
  };
  hijo.on('error', (e) => { fs.writeSync(log, `\nNo se pudo correr ${t.cmd[0]}: ${e.message}\n`); fin(127); });
  hijo.on('close', (c) => fin(c ?? 1));
});

const t0 = Date.now();
const juntas = pedidas.filter((n) => !T[n].sola).sort((a, b) => T[b].dura - T[a].dura);
const solas = pedidas.filter((n) => T[n].sola);
console.log(`${juntas.length} tareas, ${Math.min(J, juntas.length)} a la vez${solas.length ? `, y después solas: ${solas.join(', ')}` : ''}. Registros en ${REGISTROS}`);
{
  const cola = [...juntas];
  await Promise.all(Array.from({ length: Math.min(J, cola.length) }, async () => { while (cola.length) await correr(cola.shift()); }));
}
for (const n of solas) await correr(n);

const total = Math.round((Date.now() - t0) / 1000);
const malas = resultados.filter((r) => r.codigo !== 0);
console.log(`\n${resultados.length} tareas en ${Math.floor(total / 60)} min ${total % 60} s (en serie habrían sido ${Math.round(resultados.reduce((a, r) => a + r.s, 0) / 60)} min).`);
const comprobaciones = resultados.map((r) => /^OK (\d+) comprobaciones de navegador/.exec(r.ultima)?.[1]).filter(Boolean).map(Number);
if (comprobaciones.length) console.log(`test_ui: ${comprobaciones.reduce((a, b) => a + b, 0)} comprobaciones en ${comprobaciones.length} partes.`);
if (malas.length) {
  console.log(`\n${malas.length} con fallos (lo último de cada registro):`);
  for (const r of malas) console.log(`\n--- ${r.n} (salida ${r.codigo}; ${archivo(r.n)})\n${fs.readFileSync(archivo(r.n), 'utf8').trimEnd().split('\n').slice(-15).join('\n')}`);
  process.exit(1);
}
console.log('Todo en verde.');
