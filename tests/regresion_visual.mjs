// Regresión visual: capturas de pantallas clave, comparadas con una referencia. Sirve para ver si un cambio estropeó
// otra pantalla sin querer. No decide qué es «bien»: enseña qué cambió y cuánto, y el humano lo revisa.
//
// Uso:
//   node tests/regresion_visual.mjs --guardar DIR              guarda las capturas como referencia
//   node tests/regresion_visual.mjs --comparar DIR [--fallar]  compara con la referencia (sale con error solo con --fallar)
// En el CI la referencia se genera en main y se guarda en la caché; en un PR se compara con ella. Los cambios visuales
// que son a propósito aparecen como diferencias: esa es la información, no un fallo.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright');
const { PNG } = require('pngjs');
const AQUI = path.dirname(fileURLToPath(import.meta.url));
const PYTHON = process.env.PYTHON || 'python3';
const ADMIN = ['Daf3r', 'clave-de-prueba-12'];
const LECTOR = ['Ana', 'lectora-de-prueba'];
const UMBRAL_PORCENTAJE = 0.4; // por encima de esto, la captura se considera «cambiada»

const args = process.argv.slice(2);
const modo = args.includes('--guardar') ? 'guardar' : args.includes('--comparar') ? 'comparar' : null;
const dirRef = args[args.indexOf(modo === 'guardar' ? '--guardar' : '--comparar') + 1];
if (!modo || !dirRef) { console.error('Uso: regresion_visual.mjs --guardar DIR | --comparar DIR [--fallar]'); process.exit(2); }
const SALIDA_DIFF = path.join(AQUI, 'regresion');

const puertoLibre = () => new Promise((res) => {
  const s = net.createServer().listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => res(port)); });
});
async function servidor(escenario) {
  const port = await puertoLibre();
  const hijo = spawn(PYTHON, [path.join(AQUI, 'servidor_prueba.py'), String(port), escenario], { stdio: 'ignore' });
  const url = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 100; i++) {
    try { if ((await fetch(`${url}/healthz`)).ok) return { url, parar: () => hijo.kill() }; } catch { /* aún no */ }
    await new Promise((r) => setTimeout(r, 200));
  }
  hijo.kill();
  throw new Error(`no arrancó el escenario ${escenario}`);
}

// Sin animaciones ni cosas que cambian solas (la edad del precio), para que dos corridas den lo mismo.
const ESTABLE = `*, *::before, *::after { animation: none !important; transition: none !important; caret-color: transparent !important; }
#precio-meta, .g-pulso, #m-fx { visibility: hidden !important; }`;

async function capturar(navegador, srv, cuenta, [w, h], esquema, acciones, nombre) {
  const ctx = await navegador.newContext({ ...devices['iPhone 13'], viewport: { width: w, height: h }, isMobile: false, hasTouch: false, colorScheme: esquema, reducedMotion: 'reduce', bypassCSP: true });
  const p = await ctx.newPage();
  await p.goto(`${srv.url}/login`, { waitUntil: 'networkidle' });
  if (cuenta) {
    await p.fill('input[autocomplete="username"]', cuenta[0]);
    await p.fill('input[autocomplete="current-password"]', cuenta[1]);
    await Promise.all([p.waitForURL('**/'), p.click('button[type=submit], .guardar')]);
    await p.waitForTimeout(3500);
  }
  await p.addStyleTag({ content: ESTABLE });
  if (acciones) await acciones(p);
  await p.waitForTimeout(400);
  const png = await p.screenshot({ fullPage: false });
  await ctx.close();
  return { nombre, png };
}

const cerrarOferta = async (p) => { if (await p.locator('#d-avisos').isVisible()) { await p.click('#da-no'); await p.waitForTimeout(300); } };
const navegador = await chromium.launch();
const anio = await servidor('anio');
const hoy = await servidor('hoy');
const tres = await servidor('tres');
const capturas = [];
try {
  for (const esquema of ['dark', 'light']) {
    capturas.push(await capturar(navegador, anio, null, [390, 844], esquema, null, `entrada-movil-${esquema}`));
    capturas.push(await capturar(navegador, anio, ADMIN, [390, 844], esquema, null, `admin-movil-${esquema}`));
    capturas.push(await capturar(navegador, anio, ADMIN, [1280, 800], esquema, null, `admin-escritorio-${esquema}`));
    capturas.push(await capturar(navegador, hoy, ADMIN, [390, 844], esquema, null, `una-compra-movil-${esquema}`));
    capturas.push(await capturar(navegador, tres, ADMIN, [768, 1024], esquema, null, `tres-compras-tablet-${esquema}`));
    capturas.push(await capturar(navegador, anio, ADMIN, [390, 844], esquema, async (p) => {
      await cerrarOferta(p);
      await p.click('#anotar'); await p.waitForTimeout(500);
    }, `hoja-anotar-movil-${esquema}`));
    capturas.push(await capturar(navegador, anio, ADMIN, [390, 844], esquema, async (p) => {
      await cerrarOferta(p);
      await p.click('#cuenta-btn'); await p.waitForTimeout(400);
    }, `tu-cuenta-movil-${esquema}`));
  }
  capturas.push(await capturar(navegador, anio, LECTOR, [390, 844], 'dark', null, 'lector-bienvenida-movil-dark'));
} finally {
  anio.parar(); hoy.parar(); tres.parar(); await navegador.close();
}

fs.mkdirSync(dirRef, { recursive: true });
if (modo === 'guardar') {
  for (const c of capturas) fs.writeFileSync(path.join(dirRef, `${c.nombre}.png`), c.png);
  console.log(`${capturas.length} capturas de referencia guardadas en ${dirRef}`);
  process.exit(0);
}

// Comparar
const { default: pixelmatch } = await import('pixelmatch');
fs.rmSync(SALIDA_DIFF, { recursive: true, force: true });
fs.mkdirSync(SALIDA_DIFF, { recursive: true });
const filas = [];
let cambiadas = 0;
for (const c of capturas) {
  const ruta = path.join(dirRef, `${c.nombre}.png`);
  if (!fs.existsSync(ruta)) { filas.push(`| ${c.nombre} | sin referencia | nueva |`); continue; }
  const a = PNG.sync.read(fs.readFileSync(ruta)), b = PNG.sync.read(c.png);
  if (a.width !== b.width || a.height !== b.height) { cambiadas++; filas.push(`| ${c.nombre} | cambió de tamaño (${a.width}×${a.height} → ${b.width}×${b.height}) | **cambió** |`); fs.writeFileSync(path.join(SALIDA_DIFF, `${c.nombre}.nueva.png`), c.png); continue; }
  const diff = new PNG({ width: a.width, height: a.height });
  const n = pixelmatch(a.data, b.data, diff.data, a.width, a.height, { threshold: 0.12 });
  const pct = (n / (a.width * a.height)) * 100;
  const cambio = pct > UMBRAL_PORCENTAJE;
  if (cambio) { cambiadas++; fs.writeFileSync(path.join(SALIDA_DIFF, `${c.nombre}.diff.png`), PNG.sync.write(diff)); fs.writeFileSync(path.join(SALIDA_DIFF, `${c.nombre}.nueva.png`), c.png); }
  filas.push(`| ${c.nombre} | ${pct.toFixed(2)} % de píxeles distintos | ${cambio ? '**cambió**' : 'igual'} |`);
}
const resumen = `### Regresión visual\n\n${cambiadas ? `**${cambiadas} de ${capturas.length} capturas cambiaron.** Si es lo que se buscaba, no hay nada que hacer; si no, revisa las imágenes de la carpeta de artefactos.` : `Las ${capturas.length} capturas son iguales a la referencia.`}\n\n| Pantalla | Diferencia | Estado |\n|---|---|---|\n${filas.join('\n')}\n`;
console.log(resumen);
if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, resumen);
process.exit(cambiadas && args.includes('--fallar') ? 1 : 0);
