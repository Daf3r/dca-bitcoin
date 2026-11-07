// Rendimiento y buenas prácticas con Lighthouse sobre la entrada y la app (con sesión), contra el servidor de pruebas.
// Avisa si un cambio hace la app más lenta, menos accesible o con malas prácticas. Los umbrales son holgados a propósito:
// Lighthouse varía un poco entre corridas, y lo que importa es detectar una caída fuerte, no un par de puntos.
// Uso: node tests/rendimiento_lighthouse.mjs   (PYTHON=ruta/python si Flask no está en python3)
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const AQUI = path.dirname(fileURLToPath(import.meta.url));
const PYTHON = process.env.PYTHON || 'python3';
const LIGHTHOUSE = path.join(AQUI, 'node_modules', 'lighthouse', 'cli', 'index.js');
const UMBRALES = { performance: 0.7, accessibility: 0.95, 'best-practices': 0.9 };

const puertoLibre = () => new Promise((res) => {
  const s = net.createServer().listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => res(port)); });
});
const port = await puertoLibre();
const hijo = spawn(PYTHON, [path.join(AQUI, 'servidor_prueba.py'), String(port), 'anio'], { stdio: 'ignore' });
const url = `http://127.0.0.1:${port}`;
let listo = false;
for (let i = 0; i < 100 && !listo; i++) {
  try { listo = (await fetch(`${url}/healthz`)).ok; } catch { await new Promise((r) => setTimeout(r, 200)); }
}
if (!listo) { hijo.kill(); throw new Error('no arrancó el servidor de pruebas'); }

let fallos = 0;
try {
  // Sesión del admin: se manda como cabecera porque Lighthouse no inicia sesión por sí solo.
  const r = await fetch(`${url}/api/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Libro': '1' },
    body: JSON.stringify({ usuario: 'Daf3r', clave: 'clave-de-prueba-12' }),
  });
  const cookie = (r.headers.get('set-cookie') ?? '').split(';')[0];
  if (!cookie.startsWith('__Host-sesion=')) throw new Error('no se pudo iniciar sesión para Lighthouse');

  for (const [nombre, ruta, cabeceras] of [['la entrada', '/login', {}], ['la app', '/', { Cookie: cookie }]]) {
    const salida = path.join(os.tmpdir(), `lh-${process.pid}-${nombre.replace(/\W/g, '')}.json`);
    const p = spawnSync(process.execPath, [LIGHTHOUSE, `${url}${ruta}`, '--quiet', '--output=json', `--output-path=${salida}`,
      `--only-categories=${Object.keys(UMBRALES).join(',')}`, '--form-factor=mobile',
      `--extra-headers=${JSON.stringify(cabeceras)}`, '--chrome-flags=--headless=new --no-sandbox --disable-gpu'],
    { env: { ...process.env, CHROME_PATH: chromium.executablePath() }, encoding: 'utf8', timeout: 240000 });
    if (p.status !== 0 || !fs.existsSync(salida)) { console.log(`Lighthouse falló en ${nombre}: ${(p.stderr || p.stdout || '').slice(0, 400)}`); fallos++; continue; }
    const lh = JSON.parse(fs.readFileSync(salida, 'utf8'));
    for (const [cat, minimo] of Object.entries(UMBRALES)) {
      const puntos = lh.categories[cat].score;
      const ok = puntos >= minimo;
      if (!ok) fallos++;
      console.log(`${ok ? 'ok ' : 'MAL'} ${nombre}: ${cat} ${Math.round(puntos * 100)} (mínimo ${Math.round(minimo * 100)})`);
      if (!ok) {
        const peores = Object.values(lh.audits).filter((a) => a.score !== null && a.score < 0.9 && a.scoreDisplayMode !== 'informative' && a.scoreDisplayMode !== 'notApplicable'
          && lh.categories[cat].auditRefs.some((x) => x.id === a.id)).slice(0, 4);
        for (const a of peores) console.log(`      · ${a.title}`);
      }
    }
    fs.rmSync(salida, { force: true });
  }
} finally {
  hijo.kill();
}
if (fallos) { console.log(`\n${fallos} comprobaciones por debajo del mínimo.`); process.exit(1); }
console.log('\nLighthouse: todo por encima de los mínimos.');
