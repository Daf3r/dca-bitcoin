// Revisión de daltonismo (manual): guarda capturas de la app como las verían quienes tienen protanopía, deuteranopía o tritanopía
// (matrices de Machado et al. 2009, severidad 1.0) y en escala de grises, para comprobar que nada depende solo del color.
// Uso: node tests/daltonismo.mjs [carpeta]   (PYTHON=ruta/python si Flask no está en python3). Es una revisión a ojo: no falla.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright');
const AQUI = path.dirname(fileURLToPath(import.meta.url));
const SALIDA = process.argv[2] || path.join(AQUI, 'daltonismo');
fs.mkdirSync(SALIDA, { recursive: true });
const MATRICES = {
  protanopia: '0.152286 1.052583 -0.204868 0 0  0.114503 0.786281 0.099216 0 0  -0.003882 -0.048116 1.051998 0 0  0 0 0 1 0',
  deuteranopia: '0.367322 0.860646 -0.227968 0 0  0.280085 0.672501 0.047413 0 0  -0.011820 0.042940 0.968881 0 0  0 0 0 1 0',
  tritanopia: '1.255528 -0.076749 -0.178779 0 0  -0.078411 0.930809 0.147602 0 0  0.004733 0.691367 0.303900 0 0  0 0 0 1 0',
  grises: '0.2126 0.7152 0.0722 0 0  0.2126 0.7152 0.0722 0 0  0.2126 0.7152 0.0722 0 0  0 0 0 1 0',
};
const port = await new Promise((r) => { const s = net.createServer().listen(0, '127.0.0.1', () => { const { port: p } = s.address(); s.close(() => r(p)); }); });
const hijo = spawn(process.env.PYTHON || 'python3', [path.join(AQUI, 'servidor_prueba.py'), String(port), 'anio'], { stdio: 'ignore' });
const url = `http://127.0.0.1:${port}`;
for (let i = 0; i < 100; i++) { try { if ((await fetch(`${url}/healthz`)).ok) break; } catch { await new Promise((r) => setTimeout(r, 200)); } }
const nav = await chromium.launch();
try {
  const ctx = await nav.newContext({ ...devices['iPhone 13'], bypassCSP: true, deviceScaleFactor: 1 });
  await ctx.addInitScript(() => { localStorage.setItem('libro.hora', '12'); localStorage.setItem('libro.avisos.preguntado', '1'); });
  const p = await ctx.newPage();
  await p.goto(`${url}/login`, { waitUntil: 'networkidle' });
  await p.fill('input[autocomplete="username"]', 'Daf3r'); await p.fill('input[autocomplete="current-password"]', 'clave-de-prueba-12');
  await Promise.all([p.waitForURL('**/'), p.click('button[type=submit], .guardar')]);
  await p.waitForTimeout(3500);
  const filtro = async (m) => p.evaluate((mat) => {
    document.getElementById('sim-daltonismo')?.remove();
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.id = 'sim-daltonismo'; svg.setAttribute('width', '0'); svg.setAttribute('height', '0'); svg.style.position = 'absolute';
    svg.innerHTML = `<filter id="sim-f" color-interpolation-filters="linearRGB"><feColorMatrix type="matrix" values="${mat}"/></filter>`;
    document.body.append(svg);
    document.documentElement.style.filter = 'url(#sim-f)';
  }, m);
  const estados = [['saldo', () => scrollTo(0, 0)], ['grafico', () => document.getElementById('mercado').scrollIntoView({ block: 'start' })], ['lista', () => document.querySelector('.compras').scrollIntoView({ block: 'start' })]];
  for (const [nombre, mat] of Object.entries(MATRICES)) {
    await filtro(mat);
    for (const [estado, ir] of estados) {
      await p.evaluate(ir);
      await p.waitForTimeout(600);
      await p.screenshot({ path: path.join(SALIDA, `${estado}-${nombre}.png`) });
    }
  }
  console.log(`Capturas en ${SALIDA}`);
} finally {
  await nav.close();
  hijo.kill();
}
