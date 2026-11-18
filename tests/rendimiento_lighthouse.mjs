// Rendimiento y buenas prácticas con Lighthouse sobre la entrada y la app (con sesión), contra el servidor de pruebas.
// Avisa si un cambio hace la app más lenta, menos accesible o con malas prácticas. Los umbrales son holgados a propósito:
// Lighthouse varía un poco entre corridas, y lo que importa es detectar una caída fuerte, no un par de puntos.
// La app se mide tres veces y decide la mediana de cada categoría (lo que recomienda Lighthouse: una sola corrida en un corredor
// compartido puede salir varios puntos abajo por el ruido del TBT); la entrada, estable, una vez.
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
const CORRIDAS = { 'la entrada': 1, 'la app': 3 };

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

/** La mediana (con 3 corridas, la del medio; con 1, esa). */
const mediana = (xs) => { const o = [...xs].sort((a, b) => a - b); return o.length % 2 ? o[(o.length - 1) / 2] : (o[o.length / 2 - 1] + o[o.length / 2]) / 2; };

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
    const correr = () => spawnSync(process.execPath, [LIGHTHOUSE, `${url}${ruta}`, '--quiet', '--output=json', `--output-path=${salida}`,
      `--only-categories=${Object.keys(UMBRALES).join(',')}`, '--form-factor=mobile',
      `--extra-headers=${JSON.stringify(cabeceras)}`, '--chrome-flags=--headless=new --no-sandbox --disable-gpu'],
    { env: { ...process.env, CHROME_PATH: chromium.executablePath() }, encoding: 'utf8', timeout: 240000 });
    const informes = [];
    let roto = false;
    for (let k = 1; k <= CORRIDAS[nombre] && !roto; k++) {
      fs.rmSync(salida, { force: true });
      // En los corredores del CI Chrome a veces no logra grabar la traza de la carga (NO_NAVSTART) antes de medir nada: no es un
      // resultado de la página. Se reintenta esa corrida hasta 3 veces solo por ese error; cualquier otro fallo cuenta de inmediato.
      let p = correr();
      for (let intento = 1; intento < 3 && p.status !== 0 && /NO_NAVSTART/.test(`${p.stderr}${p.stdout}`); intento++) {
        console.log(`Lighthouse no pudo grabar la carga de ${nombre} (NO_NAVSTART); reintento ${intento}`);
        p = correr();
      }
      if (p.status !== 0 || !fs.existsSync(salida)) { console.log(`Lighthouse falló en ${nombre} (corrida ${k}): ${(p.stderr || p.stdout || '').slice(0, 400)}`); fallos++; roto = true; continue; }
      informes.push(JSON.parse(fs.readFileSync(salida, 'utf8')));
    }
    fs.rmSync(salida, { force: true });
    if (roto) continue;
    for (const [cat, minimo] of Object.entries(UMBRALES)) {
      const puntos = informes.map((lh) => lh.categories[cat].score);
      const med = mediana(puntos);
      const ok = med >= minimo;
      if (!ok) fallos++;
      const detalle = puntos.length > 1 ? `mediana ${Math.round(med * 100)} de ${puntos.map((x) => Math.round(x * 100)).join(' · ')}` : `${Math.round(med * 100)}`;
      console.log(`${ok ? 'ok ' : 'MAL'} ${nombre}: ${cat} ${detalle} (mínimo ${Math.round(minimo * 100)})`);
      if (!ok) {
        // Lo que más resta, en la corrida que dio la mediana
        const lh = informes[puntos.indexOf(puntos.reduce((a, x) => (Math.abs(x - med) < Math.abs(a - med) ? x : a)))];
        const peores = Object.values(lh.audits).filter((a) => a.score !== null && a.score < 0.9 && a.scoreDisplayMode !== 'informative' && a.scoreDisplayMode !== 'notApplicable'
          && lh.categories[cat].auditRefs.some((x) => x.id === a.id)).slice(0, 4);
        for (const a of peores) console.log(`      · ${a.title}`);
      }
    }
  }
} finally {
  hijo.kill();
}
if (fallos) { console.log(`\n${fallos} comprobaciones por debajo del mínimo.`); process.exit(1); }
console.log('\nLighthouse: todo por encima de los mínimos.');
