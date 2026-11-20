// Banco de rendimiento de la escena (campamento 30, idea 18): mide solo y falla si algo empeora. Abre la app en el teléfono (390×664,
// Safari con sus barras) con mil compras en los momentos más cargados del año y cuenta, por capa, lo que pesa la escena.
//   Lo duro (hace fallar): los nodos de la escena (tope 1100), del valle (300) y de los osos (40), con efectos «esenciales» como la
//   prueba de siempre; y las animaciones que corren A LA VISTA en cada capa, con efectos «todos», frente al presupuesto escrito en
//   docs/rendimiento.md («Presupuesto»). Lo que cuenta Chromium bajo display: none no se cuenta (WebKit lo para).
//   Lo blando (solo informa, mediana de 3): el tiempo de crear la escena con la CPU 4× más lenta y los fotogramas por segundo en
//   reposo con la montaña a la vista (Chromium, CPU 4×). Varían de máquina a máquina: el iPhone de verdad lo mide «Medir este aparato».
// Uso: node tests/banco_rendimiento.mjs [--rapido]   (PYTHON=ruta/python si Flask no está en python3; BANCO_JSON=ruta guarda la tabla)
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { ADMIN, entornoCuentas } from './cuentas_temporales.mjs';

const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright');
const AQUI = path.dirname(fileURLToPath(import.meta.url));
const PYTHON = process.env.PYTHON || 'python3';
const RAPIDO = process.argv.includes('--rapido');

/** Los topes de nodos (CLAUDE.md, «Escena y arte») y el presupuesto de animaciones a la vista por capa (docs/rendimiento.md). */
export const TOPES = { escena: 1100, valle: 300, osos: 40 };
export const PRESUPUESTO = { principal: 56, frente: 16, 'par-cielo': 44, 'par-lejos': 22, 'par-medio': 4, propia: 3, total: 110 };
/** Los momentos que se miden: el día y la noche de siempre, la noche más cargada (Nochebuena) y la época lluviosa. */
const CASOS = [
  ['día normal', '2026-11-25', 12], ['noche normal', '2026-11-25', 21], ['Nochebuena', '2026-12-24', 21],
  ['cena del 24', '2026-12-24', 19], ['doce del 24', '2026-12-24', 23.95],
  ['Navidad', '2026-12-25', 0.1], ['espera del 31', '2026-12-31', 23.9], ['Año Nuevo', '2027-01-01', 0.1],
  ['tarde de lluvia', '2026-07-10', 15], ['noche de lluvia', '2026-07-10', 21],
];

const puertoLibre = () => new Promise((res) => { const s = net.createServer().listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => res(port)); }); });
async function servidor(escenario) {
  const port = await puertoLibre();
  const hijo = spawn(PYTHON, [path.join(AQUI, 'escenario_temporal.py'), String(port), escenario], { stdio: 'ignore', env: { ...process.env, ...entornoCuentas } });
  const url = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 100; i++) {
    try { if ((await fetch(`${url}/healthz`)).ok) return { url, parar: () => hijo.kill() }; } catch { /* aún no */ }
    await new Promise((r) => setTimeout(r, 200));
  }
  hijo.kill();
  throw new Error(`no arrancó el escenario ${escenario}`);
}

async function abrir(navegador, srv, dia, hora, efectos) {
  const ctx = await navegador.newContext({ ...devices['iPhone 13'], viewport: { width: 390, height: 664 } });
  const p = await ctx.newPage();
  await p.addInitScript(([d, h, e]) => { try { localStorage.setItem('libro.dia', d); localStorage.setItem('libro.hora', String(h)); localStorage.setItem('libro.efectos', e); localStorage.setItem('libro.avisos.preguntado', '1'); localStorage.setItem('libro.pestanas', 'todo'); localStorage.setItem('libro.madrugada', '0'); } catch { /* sin almacenamiento */ } }, [dia, hora, efectos]);
  await p.goto(`${srv.url}/login`, { waitUntil: 'networkidle' });
  await p.fill('input[autocomplete="username"]', ADMIN[0]);
  await p.fill('input[autocomplete="current-password"]', ADMIN[1]);
  await Promise.all([p.waitForURL('**/'), p.click('button[type=submit], .guardar')]);
  await p.waitForTimeout(4000); // la subida de «Tú», las letras y los osos ya en su sitio
  for (let k = 0; k < 4 && await p.locator('dialog[open]').count(); k++) { await p.keyboard.press('Escape'); await p.waitForTimeout(300); }
  await p.evaluate(() => window.scrollTo(0, 0));
  return { ctx, p };
}

/** Nodos (como los cuenta test_ui) y animaciones a la vista por capa. */
const medir = (p) => p.evaluate(() => {
  const host = document.getElementById('montana');
  const valle = [...host.querySelectorAll('svg *')].filter((e) => !e.closest('defs') && (e.closest('[id^="m-v-"]') || [...e.classList].some((c) => c.startsWith('v-')) || e.matches('.lago-playa, .lago-nivel'))).length;
  const osos = host.querySelector('#m-osos') ? host.querySelector('#m-osos').querySelectorAll('*').length + 1 : 0;
  const escondido = (e) => { for (let x = e; x && x !== host; x = x.parentElement) if (getComputedStyle(x).display === 'none') return true; return false; };
  const anim = {};
  for (const a of document.getAnimations()) {
    const t = a.effect?.target;
    if (!t || !host.contains(t) || a.playState !== 'running' || escondido(t) || Number(getComputedStyle(t).opacity) === 0) continue;
    const svg = t.closest('svg'), c = svg?.getAttribute('class') ?? '';
    const capa = !svg || svg.parentElement !== host ? 'propia' : /\bfrente\b/.test(c) ? 'frente' : (c.match(/par-\w+/)?.[0] ?? (svg === host.querySelector(':scope > svg') ? 'principal' : 'propia'));
    anim[capa] = (anim[capa] ?? 0) + 1;
  }
  return { escena: host.querySelectorAll('*').length, valle, osos, anim };
});

/** Lo blando: crear la escena (CPU 4×) y fotogramas en reposo con la montaña a la vista (CPU 4×), mediana de 3. */
async function blando(ctx, p) {
  const cdp = await ctx.newCDPSession(p);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  const r = await p.evaluate(async () => {
    const host = document.getElementById('montana'), html = host.innerHTML;
    const crear = () => { const d = document.createElement('div'); d.className = 'montana'; d.style.cssText = 'position:absolute;left:-9999px;width:390px;height:600px'; document.body.append(d); const t0 = performance.now(); for (let k = 0; k < 5; k++) { d.innerHTML = html; d.getBoundingClientRect(); } const ms = (performance.now() - t0) / 5; d.remove(); return ms; };
    const fps = () => new Promise((res) => { const t = []; const f = (x) => { t.push(x); if (x - t[0] < 2000) requestAnimationFrame(f); else res((t.length - 1) / ((t.at(-1) - t[0]) / 1000)); }; requestAnimationFrame(f); });
    const med = (xs) => xs.sort((a, b) => a - b)[1];
    const c = [crear(), crear(), crear()], f = [await fps(), await fps(), await fps()];
    return { crearMs: Math.round(med(c) * 10) / 10, fps: Math.round(med(f) * 10) / 10 };
  });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  return r;
}

const navegador = await chromium.launch();
const srv = await servidor('mil');
const filas = [], fallos = [];
try {
  for (const [nombre, dia, hora] of CASOS) {
    let { ctx, p } = await abrir(navegador, srv, dia, hora, 'esenciales');
    const n = await medir(p);
    await ctx.close();
    ({ ctx, p } = await abrir(navegador, srv, dia, hora, 'todos'));
    const t = await medir(p);
    const b = RAPIDO ? {} : await blando(ctx, p);
    await ctx.close();
    const total = Object.values(t.anim).reduce((a, x) => a + x, 0);
    filas.push({ caso: nombre, escena: n.escena, valle: n.valle, osos: n.osos, escenaTodos: t.escena, animaciones: t.anim, total, ...b });
    for (const k of ['escena', 'valle', 'osos']) if (n[k] > TOPES[k]) fallos.push(`${nombre}: ${k} ${n[k]} > ${TOPES[k]}`);
    for (const [capa, x] of Object.entries(t.anim)) if (x > (PRESUPUESTO[capa] ?? PRESUPUESTO.propia)) fallos.push(`${nombre}: ${x} animaciones a la vista en «${capa}» > ${PRESUPUESTO[capa] ?? PRESUPUESTO.propia}`);
    if (total > PRESUPUESTO.total) fallos.push(`${nombre}: ${total} animaciones a la vista > ${PRESUPUESTO.total}`);
  }
} finally {
  srv.parar();
  await navegador.close();
}
console.log('caso               escena  valle  osos  (con «todos»)  animaciones a la vista por capa                     crear (4×)  fps (4×)');
for (const f of filas) {
  const capas = Object.entries(f.animaciones).map(([k, v]) => `${k} ${v}`).join(' · ');
  console.log(`${f.caso.padEnd(18)} ${String(f.escena).padStart(6)} ${String(f.valle).padStart(6)} ${String(f.osos).padStart(5)} ${String(f.escenaTodos).padStart(14)}  ${`${f.total}: ${capas}`.padEnd(50)} ${f.crearMs != null ? `${f.crearMs} ms`.padStart(10) : ''} ${f.fps != null ? String(f.fps).padStart(9) : ''}`);
}
if (process.env.BANCO_JSON) fs.writeFileSync(process.env.BANCO_JSON, JSON.stringify(filas, null, 1));
if (fallos.length) {
  console.log(`\nFALLA (${fallos.length}):\n- ${fallos.join('\n- ')}`);
  process.exit(1);
}
console.log('\nOK: dentro de los topes de nodos y del presupuesto de animaciones.');
