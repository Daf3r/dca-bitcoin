// ¿El recorte de comentarios al servir (app/recorte.py) deja el código igual? Corre en el CI (trabajo `javascript`), sin Flask:
// `python3 app/recorte.py app/static` da lo que se serviría de cada archivo y aquí se compara con el original.
// - Cada `.js`: el árbol de TypeScript, impreso sin comentarios, es idéntico (y el recortado no tiene errores de sintaxis). Así se sabe
//   que no se tocó ninguna cadena, plantilla ni expresión regular, ni cambió dónde se cortan las sentencias.
// - Cada `.css`: la misma secuencia de símbolos (cadenas, `url(…)`, palabras, signos y espacios), para que quitar un comentario nunca
//   pegue dos palabras (`0/**/auto` → `0auto`) ni corte una cadena que tuviera un `/*` dentro.
// (Lo de `.html` lo compara tests/test_api.py con el analizador de HTML de Python, y que el servidor sirve exactamente esto, también.)
// Uso: node tests/comprobar_recorte.mjs   (PYTHON=ruta si no es python3)
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const AQUI = path.dirname(fileURLToPath(import.meta.url));
const ESTATICOS = process.env.ESTATICOS || path.join(AQUI, '..', 'app', 'static'); // otra carpeta, para probar la prueba
const r = spawnSync(process.env.PYTHON || 'python3', [path.join(AQUI, '..', 'app', 'recorte.py'), ESTATICOS], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
if (r.status !== 0) throw new Error(`recorte.py falló: ${r.stderr}`);
const servido = JSON.parse(r.stdout);

const arbol = (nombre, src) => {
  const sf = ts.createSourceFile(nombre, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  return { errores: sf.parseDiagnostics.length, txt: ts.createPrinter({ removeComments: true }).printFile(sf) };
};

/** Los símbolos de una hoja de estilos, sin sus comentarios y con cada tramo de espacios como uno solo. */
const simbolos = (css) => {
  const out = [];
  const pon = (t) => { if (!(t === ' ' && (!out.length || out.at(-1) === ' '))) out.push(t); }; // los espacios del principio no cuentan
  let i = 0;
  while (i < css.length) {
    const c = css[i];
    if (css.startsWith('/*', i)) { const f = css.indexOf('*/', i + 2); if (f < 0) throw new Error('comentario sin cerrar'); i = f + 2; continue; }
    if (/\s/.test(c)) { while (i < css.length && /\s/.test(css[i])) i++; pon(' '); continue; }
    if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < css.length && css[j] !== c) { if (css[j] === '\\') j++; if (css[j] === '\n') throw new Error('cadena sin cerrar'); j++; }
      pon(css.slice(i, j + 1)); i = j + 1; continue;
    }
    const url = /^url\(\s*(?!["'])/i.exec(css.slice(i, i + 12));
    if (url) { const f = css.indexOf(')', i); pon(css.slice(i, f + 1)); i = f + 1; continue; }
    if (/[\w\-.%#@!\\\u0080-￿]/.test(c)) {
      let j = i;
      while (j < css.length && /[\w\-.%#@!\\\u0080-￿]/.test(css[j])) { if (css[j] === '\\') j++; j++; }
      pon(css.slice(i, j)); i = j; continue;
    }
    pon(c); i++;
  }
  return out;
};

const malos = [];
const peso = { js: [0, 0, 0, 0], css: [0, 0, 0, 0] };
const nombres = Object.keys(servido).filter((n) => n.endsWith('.js') || n.endsWith('.css'));
for (const n of nombres) {
  const original = readFileSync(path.join(ESTATICOS, n), 'utf8');
  const limpio = servido[n];
  const tipo = n.endsWith('.js') ? 'js' : 'css';
  if (tipo === 'js') {
    const a = arbol(n, original), b = arbol(n, limpio);
    if (a.errores || b.errores) malos.push(`${n}: errores de sintaxis (${a.errores} antes, ${b.errores} después)`);
    else if (a.txt !== b.txt) {
      const k = [...a.txt].findIndex((ch, i) => ch !== b.txt[i]);
      malos.push(`${n}: el árbol cambia cerca de «${a.txt.slice(Math.max(0, k - 60), k + 40).replace(/\n/g, '⏎')}»`);
    }
    if (/^[ \t]*\/\//m.test(limpio)) malos.push(`${n}: aún trae líneas que empiezan por //`);
  } else {
    const leer = (css, cual) => { try { return simbolos(css).join('\u241f'); } catch (e) { malos.push(`${n} (${cual}): ${e.message}`); return cual; } };
    const a = leer(original, 'original'), b = leer(limpio, 'recortado');
    if (a !== b) {
      const k = [...a].findIndex((ch, i) => ch !== b[i]);
      malos.push(`${n}: cambian los símbolos cerca de «${a.slice(Math.max(0, k - 60), k + 40).replace(/\u241f/g, '·')}»`);
    }
    if (limpio.includes('/*')) malos.push(`${n}: aún trae un /*`);
  }
  const p = peso[tipo];
  p[0] += original.length; p[1] += limpio.length; p[2] += gzipSync(original, { level: 9 }).length; p[3] += gzipSync(limpio, { level: 9 }).length;
}
const kb = (x) => `${(x / 1024).toFixed(1)} KB`;
for (const [t, [a, b, c, d]] of Object.entries(peso)) console.log(`${t}: ${kb(a)} → ${kb(b)} (gzip ${kb(c)} → ${kb(d)})`);
if (nombres.filter((n) => n.endsWith('.js')).length < 40 || !nombres.includes('styles.css')) malos.push(`faltan archivos (${nombres.length})`);
if (malos.length) {
  console.error(`El recorte cambia el código:\n- ${malos.join('\n- ')}`);
  process.exit(1);
}
console.log(`OK: ${nombres.length} archivos (${nombres.filter((n) => n.endsWith('.js')).length} .js y styles.css) iguales sin sus comentarios`);
