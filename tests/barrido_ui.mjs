// Barrido visual y de diseño (manual, tarda varios minutos; no corre en el CI).
// Recorre los escenarios del servidor de pruebas en varios tamaños, en claro y oscuro, y comprueba en cada uno:
// consola limpia, sin scroll horizontal, saldo visible con su cifra, nada del contenido fuera de la pantalla y
// zonas de toque de al menos 44 px. Guarda capturas de lo que falla en tests/barrido/ (ignorado por git).
// Uso: node tests/barrido_ui.mjs [rapido]   (PYTHON=ruta/python si Flask no está en python3)
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const AQUI = path.dirname(fileURLToPath(import.meta.url));
const PYTHON = process.env.PYTHON || 'python3';
const SALIDA = path.join(AQUI, 'barrido');
fs.mkdirSync(SALIDA, { recursive: true });

const ESCENARIOS = ['hoy', 'dos', 'tres', 'nueve', 'anio', 'largo', 'ballena', 'mil', 'vacio', 'sinprecio', 'sinhist'];
const ANCHOS_TODOS = [[320, 640], [375, 812], [768, 1024], [1024, 768], [1280, 800], [1920, 1080], [2560, 1300]];
const ANCHOS_BREVE = [[320, 640], [768, 1024], [1280, 800]];
const rapido = process.argv.includes('rapido');

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

/** Lo que se mide dentro de la página una vez cargada. */
const medir = () => {
  const vw = document.documentElement.clientWidth;
  const out = { scrollX: document.documentElement.scrollWidth > vw, saldo: null, fuera: [], toque: [] };
  const s = document.querySelector('#s-sats .od-num');
  if (s) { const r = s.getBoundingClientRect(); out.saldo = { txt: document.querySelector('#s-sats .sr').textContent, w: Math.round(r.width), h: Math.round(r.height) }; }
  const visible = (el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none'; };
  // Contenido del cuerpo que se sale por la derecha o por la izquierda (los SVG de las escenas y gráficos se recortan a propósito).
  for (const el of document.querySelectorAll('.cuerpo *')) {
    if (el.closest('svg') || el.closest('.lienzo') || !visible(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.right > vw + 1 || r.left < -1) out.fuera.push(`${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}${el.className && typeof el.className === 'string' ? '.' + el.className.split(' ')[0] : ''}`);
  }
  // Zonas de toque: botones, resúmenes y enlaces propios de la interfaz (no los enlaces dentro de un texto corrido).
  for (const el of document.querySelectorAll('button, summary, a.f-tx, a.enlace, label.enlace, input[type=checkbox]')) {
    if (!visible(el) || el.closest('dialog:not([open])') || el.closest('.sr')) continue;
    const r = el.getBoundingClientRect();
    if (Math.min(r.width, r.height) < 43.5) out.toque.push(`${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}${el.className && typeof el.className === 'string' ? '.' + el.className.split(' ')[0] : ''} ${Math.round(r.width)}×${Math.round(r.height)}`);
  }
  return out;
};

const fallos = [];
let revisados = 0;
const navegador = await chromium.launch();
try {
  for (const esc of ESCENARIOS) {
    const srv = await servidor(esc);
    try {
      const anchos = rapido || esc !== 'anio' ? ANCHOS_BREVE : ANCHOS_TODOS;
      for (const [w, h] of anchos) {
        for (const esquema of ['light', 'dark']) {
          const ctx = await navegador.newContext({ viewport: { width: w, height: h }, colorScheme: esquema });
          const p = await ctx.newPage();
          await p.addInitScript((hh) => { try { localStorage.setItem('libro.hora', String(hh)); } catch { /* sin almacenamiento */ } }, esquema === 'light' ? 6 : 22);
          const consola = [];
          p.on('console', (m) => ['error', 'warning'].includes(m.type()) && consola.push(m.text()));
          p.on('pageerror', (e) => consola.push(`pageerror ${e.message}`));
          await p.goto(`${srv.url}/login`, { waitUntil: 'networkidle' });
          await p.fill('input[autocomplete="username"]', 'Daf3r');
          await p.fill('input[autocomplete="current-password"]', 'clave-de-prueba-12');
          await Promise.all([p.waitForURL('**/'), p.click('button[type=submit], .guardar')]);
          await p.waitForTimeout(3000);
          const m = await p.evaluate(medir);
          const etiqueta = `${esc} ${w}×${h} ${esquema}`;
          const problemas = [];
          const ruido = esc === 'sinhist' ? /503/ : esc === 'sinprecio' ? /503/ : /$^/; // lo esperado en esos escenarios
          const raros = consola.filter((c) => !ruido.test(c));
          if (raros.length) problemas.push(`consola: ${raros[0].slice(0, 120)}`);
          if (m.scrollX) problemas.push('scroll horizontal');
          if (!m.saldo || m.saldo.w <= 0 || m.saldo.h <= 0 || !m.saldo.txt) problemas.push(`saldo no visible (${JSON.stringify(m.saldo)})`);
          if (m.fuera.length) problemas.push(`fuera de la pantalla: ${[...new Set(m.fuera)].slice(0, 4).join(', ')}`);
          if (m.toque.length) problemas.push(`zona de toque pequeña: ${[...new Set(m.toque)].slice(0, 4).join('; ')}`);
          revisados++;
          if (problemas.length) {
            fallos.push(`${etiqueta}: ${problemas.join(' | ')}`);
            await p.screenshot({ path: path.join(SALIDA, `${etiqueta.replace(/[ ×]/g, '_')}.png`), fullPage: false });
          }
          await ctx.close();
        }
      }
    } finally {
      srv.parar();
    }
    process.stdout.write(`${esc} ✔  `);
  }
} finally {
  await navegador.close();
}
console.log(`\n\n${revisados} combinaciones revisadas.`);
if (fallos.length) {
  console.log(`\n${fallos.length} con problemas:`);
  for (const f of fallos) console.log(`  - ${f}`);
  process.exit(1);
}
console.log('Todo en orden.');
