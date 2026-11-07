// Auditoría de accesibilidad con axe-core (WCAG 2.1 A y AA más buenas prácticas) sobre los estados principales de la app,
// en claro y oscuro, contra el servidor de pruebas (sin red). Sale con error si hay alguna violación.
// Uso: node tests/auditoria_axe.mjs   (PYTHON=ruta/python si Flask no está en python3)
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright');
const AQUI = path.dirname(fileURLToPath(import.meta.url));
const PYTHON = process.env.PYTHON || 'python3';
const AXE = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const ADMIN = ['Daf3r', 'clave-de-prueba-12'];
const LECTOR = ['Ana', 'lectora-de-prueba'];

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

/** Un navegador con push de mentira: suscribirse devuelve un dispositivo propio (para ver la vista de avisos activada). */
const conPush = () => {
  const est = { sub: false, permiso: 'default' };
  const ep = `https://fcm.googleapis.com/fcm/send/axe-${Math.random().toString(36).slice(2)}`;
  const sub = { endpoint: ep, options: {}, unsubscribe: async () => { est.sub = false; return true; },
    toJSON: () => ({ endpoint: ep, keys: { p256dh: `B${'x'.repeat(86)}`, auth: 'a'.repeat(22) } }) };
  const reg = { pushManager: { getSubscription: async () => (est.sub ? sub : null), subscribe: async () => { est.sub = true; return sub; } }, unregister: async () => true };
  Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: { getRegistration: async () => reg, register: async () => reg, ready: Promise.resolve(reg) } });
  Object.defineProperty(Notification, 'permission', { configurable: true, get: () => est.permiso });
  Notification.requestPermission = async () => { est.permiso = 'granted'; return 'granted'; };
};

async function entrar(p, url, [usuario, clave]) {
  await p.goto(`${url}/login`, { waitUntil: 'networkidle' });
  await p.fill('input[autocomplete="username"]', usuario);
  await p.fill('input[autocomplete="current-password"]', clave);
  await Promise.all([p.waitForURL('**/'), p.click('button[type=submit], .guardar')]);
  await p.waitForTimeout(3000);
}

const hallazgos = [];
let estados = 0;
async function auditar(p, estado) {
  await p.evaluate(AXE);
  const r = await p.evaluate(() => axe.run(document, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'] }, resultTypes: ['violations'],
  }));
  estados++;
  for (const v of r.violations) {
    hallazgos.push(`[${v.impact}] ${v.id} en «${estado}»: ${v.help} → ${v.nodes.slice(0, 2).map((n) => n.target.join(' ')).join(' | ')}`);
  }
}
const cerrarOferta = async (p) => { if (await p.locator('#d-avisos').isVisible()) { await p.click('#da-no'); await p.waitForTimeout(300); } };

const navegador = await chromium.launch();
const anio = await servidor('anio');
const hoy = await servidor('hoy');
try {
  for (const esquema of ['light', 'dark']) {
    const nuevo = async (srv, cuenta, init = null) => {
      const ctx = await navegador.newContext({ ...devices['iPhone 13'], colorScheme: esquema, bypassCSP: true });
      const p = await ctx.newPage();
      if (init) await p.addInitScript(init);
      if (cuenta) await entrar(p, srv.url, cuenta);
      return { ctx, p };
    };
    { // entrada
      const { ctx, p } = await nuevo(anio, null);
      await p.goto(`${anio.url}/login`, { waitUntil: 'networkidle' });
      await auditar(p, `entrada ${esquema}`);
      await ctx.close();
    }
    { // admin con un año de compras: página, hoja (tres tipos), cuenta y avisos
      const { ctx, p } = await nuevo(anio, ADMIN, conPush);
      await cerrarOferta(p);
      await auditar(p, `admin ${esquema}`);
      await p.click('#anotar'); await p.waitForTimeout(500);
      await auditar(p, `hoja de compra ${esquema}`);
      await p.click('#h-avanzado summary'); await p.waitForTimeout(200);
      await auditar(p, `hoja de compra con detalles ${esquema}`);
      for (const tipo of ['venta', 'traslado']) {
        await p.click(`#h-tipo button[data-tipo="${tipo}"]`); await p.waitForTimeout(200);
        await auditar(p, `hoja de ${tipo} ${esquema}`);
      }
      await p.keyboard.press('Escape'); await p.waitForTimeout(400);
      await p.click('#cuenta-btn'); await p.waitForTimeout(300);
      await auditar(p, `cuenta ${esquema}`);
      await p.click('#dc-avisos-btn'); await p.waitForTimeout(500);
      await auditar(p, `avisos apagados ${esquema}`);
      await p.click('#av-interruptor'); await p.waitForTimeout(900);
      await auditar(p, `avisos activados ${esquema}`);
      await ctx.close();
    }
    { // la oferta de avisos al entrar
      const { ctx, p } = await nuevo(hoy, ADMIN, conPush);
      await p.waitForSelector('#d-avisos[open]', { timeout: 8000 });
      await auditar(p, `oferta de avisos ${esquema}`);
      await p.click('#da-no'); await p.waitForTimeout(300);
      await auditar(p, `admin con una compra ${esquema}`);
      await ctx.close();
    }
    { // lector: bienvenida y app
      const { ctx, p } = await nuevo(anio, LECTOR);
      await auditar(p, `lector, bienvenida ${esquema}`);
      await p.click('#nov-ok', { timeout: 4000 }).catch(() => {});
      await p.waitForTimeout(400);
      await auditar(p, `lector ${esquema}`);
      await ctx.close();
    }
  }
} finally {
  anio.parar(); hoy.parar(); await navegador.close();
}
console.log(`${estados} estados revisados con axe.`);
if (hallazgos.length) {
  console.log(`\n${hallazgos.length} violaciones:`);
  for (const h of hallazgos) console.log(`  - ${h}`);
  process.exit(1);
}
console.log('Sin violaciones.');
