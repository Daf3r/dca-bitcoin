import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import net from 'node:net';
const require = createRequire('/home/user/dca-bitcoin/tests/package.json');
export const { chromium } = require('playwright');
export const WT = '/home/user/dca-bitcoin/.claude/worktrees/agent-a1169d6b778d77cee';
export const S = '/tmp/claude-0/-home-user-dca-bitcoin/a4559b60-eb1b-544b-95bf-bb999d91cf6d/scratchpad';
export const OUT = `${S}/ui-fable/cap`;
export const PY = `${S}/venv/bin/python`;
const puertoLibre = () => new Promise((res) => { const s = net.createServer().listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => res(port)); }); });
export async function servidor(escenario, env = {}) {
  const port = await puertoLibre();
  const hijo = spawn(PY, [`${WT}/tests/servidor_prueba.py`, String(port), escenario], { stdio: ['ignore', 'ignore', 'pipe'], env: { ...process.env, LIMITE_ESCRITURAS: '1000000', FECHA_PRUEBA: '2026-11-24', ...env } });
  let err = ''; hijo.stderr.on('data', (d) => { err += d; });
  const url = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 400; i++) { try { if ((await fetch(`${url}/healthz`)).ok) return { url, parar: () => hijo.kill(), err: () => err }; } catch {} await new Promise((r) => setTimeout(r, 250)); }
  hijo.kill(); throw new Error(err.slice(-800));
}
export const ALTOS = { 320: 568, 390: 844, 768: 1024, 1440: 900, 2560: 1440 };
export async function abrir(browser, srv, o = {}) {
  const movil = o.w < 1100;
  const ctx = await browser.newContext({ bypassCSP: true, viewport: { width: o.w, height: o.h ?? ALTOS[o.w] }, deviceScaleFactor: o.dpr ?? 1, isMobile: movil && o.w < 900, hasTouch: movil, colorScheme: o.tema === 'claro' ? 'light' : 'dark' });
  const p = await ctx.newPage();
  await p.addInitScript((o) => { try {
    localStorage.setItem('libro.hora', String(o.hora ?? (o.tema === 'claro' ? 12 : 20)));
    localStorage.setItem('libro.efectos', o.efectos ?? 'ninguno');
    localStorage.setItem('libro.avisos.preguntado', '1');
    localStorage.setItem('libro.madrugada', '0');
    if (o.tema) localStorage.setItem('libro.tema', o.tema === 'claro' ? 'light' : 'dark');
    if (o.pestana) localStorage.setItem('libro.pestana', o.pestana);
    for (const [k, v] of Object.entries(o.ls ?? {})) localStorage.setItem(k, v);
  } catch {} }, o);
  const consola = [];
  p.on('pageerror', (e) => consola.push(`pageerror ${e.message}`));
  await p.goto(`${srv.url}/login`, { waitUntil: 'networkidle' });
  if (o.soloLogin) return { ctx, p, consola };
  const [u, c] = o.lector ? ['Ana', 'lectora-de-prueba'] : ['Daf3r', 'clave-de-prueba-12'];
  await p.fill('input[autocomplete="username"]', u);
  await p.fill('input[autocomplete="current-password"]', c);
  await Promise.all([p.waitForURL('**/'), p.click('button[type=submit]')]);
  await p.waitForTimeout(o.espera ?? 2500);
  if (!o.dialogos) for (let k = 0; k < 4 && await p.locator('dialog[open]').count(); k++) { await p.keyboard.press('Escape'); await p.waitForTimeout(300); }
  await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(300);
  return { ctx, p, consola };
}
