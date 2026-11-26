// Capturas de la revisión visual de partida (26 nov 2026) para Fable: la escena en 8 momentos a 390, 1440 y 1920 px, en claro y oscuro. Uso: node capturas.mjs <raíz del repo (con tests/node_modules)> <carpeta de salida> [solo=texto]
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import net from 'node:net';
import path from 'node:path';
import fs from 'node:fs';

const RAIZ = process.argv[2], SALIDA = process.argv[3], SOLO = process.argv[4] ?? '';
const require = createRequire(path.join(RAIZ, 'tests', 'x.js'));
const { chromium } = require('playwright');
fs.mkdirSync(SALIDA, { recursive: true });
const MOMENTOS = [
  ['amanecer', '2026-12-02', 6], ['mediodia', '2026-12-02', 12], ['atardecer', '2026-12-02', 17.75], ['noche', '2026-12-02', 21.5],
  ['lluvia', '2026-07-10', 15.5], ['nochebuena', '2026-12-24', 21], ['desfile', '2026-09-15', 10], ['milpa', '2026-11-04', 8.5],
].filter(([n]) => !SOLO || n.includes(SOLO));
const TAMANOS = (process.env.TAM ? [JSON.parse(process.env.TAM)] : [[390, 844], [1440, 900], [1920, 1080]]);
const puerto = () => new Promise((res) => { const s = net.createServer().listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => res(port)); }); });
const port = await puerto();
const srv = spawn('python3', [path.join(RAIZ, 'tests', 'servidor_prueba.py'), String(port), 'anio'], { stdio: 'ignore', env: { ...process.env, FECHA_PRUEBA: '2026-11-20' } });
const url = `http://127.0.0.1:${port}`;
for (let i = 0; i < 100; i++) { try { if ((await fetch(`${url}/healthz`)).ok) break; } catch { /* aún no */ } await new Promise((r) => setTimeout(r, 200)); }
const nav = await chromium.launch();
try {
  for (const [w, h] of TAMANOS) for (const tema of ['claro', 'oscuro']) for (const ef of ['todos']) {
    const ctx = await nav.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: w < 900, hasTouch: w < 900 });
    const p = await ctx.newPage();
    await p.addInitScript(([tm, e, d0]) => { localStorage.setItem('libro.tema', tm); localStorage.setItem('libro.efectos', e); localStorage.setItem('libro.pestanas', 'todo'); localStorage.setItem('libro.avisos.preguntado', '1'); localStorage.setItem('libro.madrugada', '0'); localStorage.setItem('libro.hora', '10.5'); localStorage.setItem('libro.dia', d0); }, [tema, ef, MOMENTOS[0][1]]);
    await p.goto(`${url}/login`, { waitUntil: 'load' });
    await p.fill('input[autocomplete="username"]', 'Daf3r');
    await p.fill('input[autocomplete="current-password"]', 'clave-de-prueba-12');
    await Promise.all([p.waitForURL('**/'), p.click('button[type=submit], .guardar')]);
    await p.waitForTimeout(3000);
    for (let k = 0; k < 3 && await p.locator('dialog[open]').count(); k++) { await p.keyboard.press('Escape'); await p.waitForTimeout(300); }
    for (const [n, d, hr] of MOMENTOS) {
      await p.evaluate(([dd, hh]) => { localStorage.setItem('libro.dia', dd); localStorage.setItem('libro.hora', String(hh)); window.libroCielo.aplicar(); window.scrollTo(0, 0); }, [d, hr]);
      await p.waitForTimeout(1800);
      // Que el pueblo no quede bajo «Anotar compra»: se baja lo justo para verlo entero sobre el dock.
      await p.evaluate(() => { const r = document.querySelector('#montana .v-pueblo')?.getBoundingClientRect(); if (r) window.scrollTo(0, Math.max(0, r.bottom + window.scrollY - window.innerHeight + 190)); });
      await p.waitForTimeout(300);
      const base = `${n}-${w}-${tema}-${ef}`;
      await p.screenshot({ path: path.join(SALIDA, `${base}.png`) });
      // El pueblo de cerca: la caja de los vecinos (y de la milpa), con aire.
      const caja = await p.evaluate(() => {
        const host = document.getElementById('montana'), cajas = [...host.querySelectorAll('.v-vecinos, .v-campos .v-mp-suelo, .v-pueblo')].map((e) => e.getBoundingClientRect()).filter((r) => r.width > 0);
        if (!cajas.length) return null;
        const x0 = Math.min(...cajas.map((r) => r.left)), y0 = Math.min(...cajas.map((r) => r.top)), x1 = Math.max(...cajas.map((r) => r.right)), y1 = Math.max(...cajas.map((r) => r.bottom));
        return { x: Math.max(0, x0 - 20) + window.scrollX, y: Math.max(0, y0 - 30) + window.scrollY, width: Math.min(window.innerWidth, x1 + 20) - Math.max(0, x0 - 20), height: y1 - y0 + 50 };
      });
      // Para el recorte del pueblo, sin «Anotar compra» encima (solo en la captura).
      await p.evaluate(() => { for (const e of document.querySelectorAll('#anotar, .dock, nav.dock')) e.style.visibility = 'hidden'; });
      if (caja && caja.width > 10 && caja.height > 10) await p.screenshot({ path: path.join(SALIDA, `${base}-pueblo.png`), clip: caja, fullPage: true });
      await p.evaluate(() => { for (const e of document.querySelectorAll('#anotar, .dock, nav.dock')) e.style.visibility = ''; });
    }
    await ctx.close();
  }
} finally { await nav.close(); srv.kill(); }
console.log('listo', SALIDA);
