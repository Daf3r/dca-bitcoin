import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import net from 'node:net';
const require = createRequire('/home/user/diseno-wt/tests/package.json');
export const { chromium } = require('playwright');
export const WT = '/home/user/diseno-wt';
export const S = '/tmp/claude-0/-home-user-dca-bitcoin/a4559b60-eb1b-544b-95bf-bb999d91cf6d/scratchpad';
export const OUT = `${S}/diseno/cap`;
export const PY = `${S}/venv/bin/python`;
const puertoLibre = () => new Promise((res) => { const s = net.createServer().listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => res(port)); }); });
export async function servidor(escenario, env = {}, archivo = 'servidor_prueba.py') {
  const port = await puertoLibre();
  const hijo = spawn(PY, [`${WT}/tests/${archivo}`, String(port), escenario], { stdio: ['ignore', 'ignore', 'pipe'], env: { ...process.env, LIMITE_ESCRITURAS: '1000000', FECHA_PRUEBA: '2026-11-24', ...env } });
  let err = ''; hijo.stderr.on('data', (d) => { err += d; });
  const url = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 400; i++) { try { if ((await fetch(`${url}/healthz`)).ok) return { url, parar: () => hijo.kill(), err: () => err }; } catch {} await new Promise((r) => setTimeout(r, 250)); }
  hijo.kill(); throw new Error(err.slice(-800));
}
export async function abrir(browser, srv, o = {}) {
  const movil = o.w < 1100;
  const ctx = await browser.newContext({ viewport: { width: o.w, height: o.h }, deviceScaleFactor: o.dpr ?? 1, isMobile: movil && o.w < 900, hasTouch: movil, colorScheme: o.tema === 'claro' ? 'light' : 'dark' });
  const p = await ctx.newPage();
  await p.addInitScript((o) => { try {
    localStorage.setItem('libro.hora', String(o.hora ?? 12));
    localStorage.setItem('libro.efectos', o.efectos ?? 'todos');
    localStorage.setItem('libro.avisos.preguntado', '1');
    localStorage.setItem('libro.madrugada', '0');
    if (o.tema) localStorage.setItem('libro.tema', o.tema === 'claro' ? 'light' : 'dark');
    if (o.dia) localStorage.setItem('libro.dia', o.dia);
    for (const [k, v] of Object.entries(o.ls ?? {})) localStorage.setItem(k, v);
  } catch {} }, o);
  const consola = [];
  p.on('console', (m) => m.type() === 'error' && consola.push(m.text()));
  p.on('pageerror', (e) => consola.push(`pageerror ${e.message}`));
  await p.goto(`${srv.url}/login`, { waitUntil: 'networkidle' });
  await p.fill('input[autocomplete="username"]', 'Daf3r');
  await p.fill('input[autocomplete="current-password"]', 'clave-de-prueba-12');
  const t0 = Date.now();
  await Promise.all([p.waitForURL('**/'), p.click('button[type=submit], .guardar')]);
  await p.waitForFunction(() => document.querySelectorAll('#lista li:not(.vacio)').length > 0, null, { timeout: 60000 }).catch(() => {});
  const tCarga = Date.now() - t0;
  await p.waitForTimeout(o.espera ?? 2500);
  for (let k = 0; k < 4 && await p.locator('dialog[open]').count(); k++) { await p.keyboard.press('Escape'); await p.waitForTimeout(300); }
  await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(400);
  return { ctx, p, consola, tCarga };
}
