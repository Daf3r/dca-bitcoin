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
const ballena = await servidor('ballena');
try {
  for (const esquema of ['light', 'dark']) {
    const nuevo = async (srv, cuenta, init = null, hora = esquema === 'light' ? 12 : 22) => {
      const ctx = await navegador.newContext({ ...devices['iPhone 13'], colorScheme: esquema, bypassCSP: true });
      const p = await ctx.newPage();
      await p.addInitScript((h) => { try { localStorage.setItem('libro.hora', String(h)); } catch { /* sin almacenamiento */ } }, hora);
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
    // El cielo cambia con la hora: la entrada y la app se revisan en cada franja y a mitad de las dos mezclas de claro a oscuro.
    for (const hora of [2, 5, 6, 12, 16.5, 17.5]) {
      let r = await nuevo(anio, null, null, hora);
      await r.p.goto(`${anio.url}/login`, { waitUntil: 'networkidle' });
      await auditar(r.p, `entrada ${esquema} a las ${hora}`);
      await r.ctx.close();
      r = await nuevo(anio, ADMIN, conPush, hora);
      await cerrarOferta(r.p);
      await auditar(r.p, `admin ${esquema} a las ${hora}`);
      await r.ctx.close();
    }
    { // admin con un año de compras: página, hoja (tres tipos), cuenta y avisos
      const { ctx, p } = await nuevo(anio, ADMIN, conPush);
      await cerrarOferta(p);
      await auditar(p, `admin ${esquema}`);
      // Las vistas del gráfico (Valor, Costo, Sats) y la tira de semanas con una semana marcada
      for (const v of ['valor', 'costo', 'sats']) {
        await p.click(`#vistas button[data-vista="${v}"]`); await p.waitForTimeout(500);
        await auditar(p, `vista ${v} ${esquema}`);
      }
      await p.click('#vistas button[data-vista="precio"]'); await p.waitForTimeout(400);
      await p.evaluate(() => document.getElementById('semanas').scrollIntoView({ block: 'center' }));
      const sem = await p.locator('#semanas i').first().boundingBox();
      await p.mouse.click(sem.x + sem.width / 2, sem.y + sem.height / 2); await p.waitForTimeout(300);
      await auditar(p, `tira de semanas con una semana marcada ${esquema}`);
      // La montaña: una bandera tocada con su tarjeta (botones fuera del SVG, tarjeta con «Cerrar»)
      await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(300);
      await p.click('.m-bandera >> nth=0'); await p.waitForTimeout(400);
      await auditar(p, `montaña con una bandera abierta ${esquema}`);
      await p.keyboard.press('Escape');
      // La mini-cabecera fija (al bajar, con el saldo y el precio)
      await p.evaluate(() => document.querySelector('.compras').scrollIntoView({ block: 'start' })); await p.waitForTimeout(500);
      await auditar(p, `mini-cabecera a la vista ${esquema}`);
      // La lista: controles de búsqueda y filtros abiertos, con una búsqueda activa
      await p.evaluate(() => document.getElementById('lista').scrollIntoView({ block: 'start' }));
      await p.click('#l-mas summary'); await p.fill('#l-buscar', '2'); await p.click('#l-chips button[data-f="compra"]'); await p.waitForTimeout(300);
      await auditar(p, `lista con búsqueda y filtros ${esquema}`);
      await p.click('#l-limpiar'); await p.click('#l-mas summary');
      // El gráfico: con una compra fijada (tarjeta con Editar y Cerrar), con la escala logarítmica y a pantalla completa
      await p.evaluate(() => document.getElementById('lienzo').scrollIntoView({ block: 'center' }));
      await p.waitForTimeout(700);
      const pc = await p.evaluate(() => { const svg = document.querySelector('#lienzo svg'), m = /^M([\d.]+) ([\d.]+)a([\d.]+)/.exec(svg.querySelector('.g-compras').getAttribute('d')), r = svg.getBoundingClientRect(); return { x: r.left + Number(m[1]) + Number(m[3]), y: r.top + Number(m[2]) }; });
      await p.mouse.click(pc.x, pc.y); await p.waitForTimeout(300);
      await auditar(p, `gráfico con una compra fijada ${esquema}`);
      await p.keyboard.press('Escape');
      await p.click('#rangos button[data-r="0"]'); await p.waitForTimeout(400);
      await p.click('#g-log'); await p.waitForTimeout(400);
      await auditar(p, `gráfico en escala logarítmica ${esquema}`);
      await p.click('#g-ampliar'); await p.waitForTimeout(700);
      await auditar(p, `gráfico a pantalla completa ${esquema}`);
      await p.click('#dg-cerrar'); await p.waitForTimeout(400);
      await p.evaluate(() => scrollTo(0, 0));
      await p.click('#anotar'); await p.waitForTimeout(500);
      await auditar(p, `hoja de compra ${esquema}`);
      await p.click('#h-avanzado summary'); await p.waitForTimeout(200);
      await auditar(p, `hoja de compra con detalles ${esquema}`);
      for (const tipo of ['venta', 'traslado']) {
        await p.click(`#h-tipo button[data-tipo="${tipo}"]`); await p.waitForTimeout(200);
        await auditar(p, `hoja de ${tipo} ${esquema}`);
      }
      await p.keyboard.press('Escape'); await p.waitForTimeout(400);
      // «Compra de siempre»: sats estimados, con su aviso
      await p.click('#anotar'); await p.waitForTimeout(400);
      await p.click('#h-habitual'); await p.waitForTimeout(300);
      await auditar(p, `hoja con la compra de siempre estimada ${esquema}`);
      await p.keyboard.press('Escape'); await p.waitForTimeout(500);
      await p.click('#anotar'); await p.waitForTimeout(300); await p.click('#h-borrador-no'); await p.waitForTimeout(300);
      await p.keyboard.press('Escape'); await p.waitForTimeout(400);
      // El borrador: se escribe a medias, se cierra y al abrir otra vez avisa que lo recuperó
      await p.click('#anotar'); await p.waitForTimeout(400);
      await p.fill('#h-sats', '1500');
      await p.keyboard.press('Escape'); await p.waitForTimeout(500);
      await p.click('#anotar'); await p.waitForTimeout(400);
      await auditar(p, `hoja con borrador recuperado ${esquema}`);
      await p.click('#h-borrador-no'); await p.waitForTimeout(300);
      await p.keyboard.press('Escape'); await p.waitForTimeout(400);
      await p.click('#cuenta-btn'); await p.waitForTimeout(300);
      await auditar(p, `cuenta ${esquema}`);
      await p.click('#dc-avisos-btn'); await p.waitForTimeout(500);
      await auditar(p, `avisos apagados ${esquema}`);
      await p.click('#av-interruptor'); await p.waitForTimeout(900);
      await auditar(p, `avisos activados ${esquema}`);
      await ctx.close();
    }
    { // alto contraste y letra muy grande: la app, la hoja y «Tu cuenta» (axe además mide el contraste de los colores reforzados)
      const { ctx, p } = await nuevo(anio, ADMIN, conPush);
      await cerrarOferta(p);
      await p.evaluate(() => { localStorage.setItem('libro.contraste', 'alto'); localStorage.setItem('libro.letra', 'muy-grande'); });
      await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(3000); await cerrarOferta(p);
      await auditar(p, `alto contraste y letra muy grande ${esquema}`);
      await p.evaluate(() => document.querySelector('.compras').scrollIntoView({ block: 'start' })); await p.waitForTimeout(500);
      await auditar(p, `alto contraste: lista y mini-cabecera ${esquema}`);
      await p.evaluate(() => scrollTo(0, 0));
      await p.click('#anotar'); await p.waitForTimeout(500);
      await auditar(p, `alto contraste: hoja ${esquema}`);
      await p.keyboard.press('Escape'); await p.waitForTimeout(400);
      await p.click('#cuenta-btn'); await p.waitForTimeout(300);
      await auditar(p, `alto contraste: cuenta ${esquema}`);
      await ctx.close();
    }
    { // «Tu historia» (medallas y línea de tiempo) y «Qué hay de nuevo»
      const { ctx, p } = await nuevo(anio, ADMIN, conPush);
      await cerrarOferta(p);
      await p.click('#cuenta-btn'); await p.waitForTimeout(300);
      await p.click('#dc-historia-btn'); await p.waitForTimeout(700);
      await auditar(p, `tu historia ${esquema}`);
      await p.keyboard.press('Escape'); await p.waitForTimeout(300);
      await p.evaluate(async () => { await fetch('/api/cambios-visto', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Libro': '1' }, body: JSON.stringify({ id: '0' }) }); });
      await p.reload({ waitUntil: 'networkidle' }); await p.waitForSelector('#d-cambios[open]', { timeout: 8000 }); await p.waitForTimeout(400);
      await auditar(p, `qué hay de nuevo ${esquema}`);
      await p.click('#cam-ok'); await p.waitForFunction(() => fetch('/api/yo').then((r) => r.json()).then((j) => j.cambios !== '0'), null, { timeout: 5000 }); // queda visto: los demás estados no lo ven
      await ctx.close();
    }
    { // la guía de estilo (solo admin) y el modo pantalla grande
      const { ctx, p } = await nuevo(anio, ADMIN, conPush);
      await cerrarOferta(p);
      await p.goto(`${anio.url}/guia`, { waitUntil: 'networkidle' }); await p.waitForTimeout(500);
      await auditar(p, `guía de estilo ${esquema}`);
      await p.goto(`${anio.url}/#tv`, { waitUntil: 'networkidle' }); await p.waitForTimeout(3000);
      await auditar(p, `pantalla grande ${esquema}`);
      await p.mouse.move(300, 300); await p.waitForTimeout(500);
      await auditar(p, `pantalla grande con el botón de salir ${esquema}`);
      await ctx.close();
    }
    { // el enlace para saltar al contenido, enfocado
      const { ctx, p } = await nuevo(anio, ADMIN, conPush);
      await cerrarOferta(p);
      await p.keyboard.press('Tab'); await p.waitForTimeout(200);
      await auditar(p, `enlace para saltar al contenido ${esquema}`);
      await ctx.close();
    }
    { // la tabla de movimientos (solo en pantalla ancha)
      const ctx = await navegador.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: esquema, bypassCSP: true });
      const p = await ctx.newPage();
      await p.addInitScript((h) => { try { localStorage.setItem('libro.hora', String(h)); } catch { /* sin almacenamiento */ } }, esquema === 'light' ? 12 : 22);
      await entrar(p, anio.url, ADMIN);
      await p.click('#l-tabla'); await p.waitForSelector('#d-tabla[open]'); await p.waitForTimeout(300);
      await auditar(p, `tabla de movimientos ${esquema}`);
      await ctx.close();
    }
    { // más de 1 BTC: acento dorado en la app y su vista de cuenta
      const { ctx, p } = await nuevo(ballena, ADMIN, conPush);
      await cerrarOferta(p);
      await auditar(p, `acento dorado (más de 1 BTC) ${esquema}`);
      await p.click('#anotar'); await p.waitForTimeout(500);
      await auditar(p, `hoja con acento dorado ${esquema}`);
      await ctx.close();
    }
    { // pantalla muy ancha: el índice lateral
      const ctx = await navegador.newContext({ viewport: { width: 1700, height: 900 }, colorScheme: esquema, bypassCSP: true });
      const p = await ctx.newPage();
      await p.addInitScript((h) => { try { localStorage.setItem('libro.hora', String(h)); } catch { /* sin almacenamiento */ } }, esquema === 'light' ? 12 : 22);
      await entrar(p, anio.url, ADMIN);
      await cerrarOferta(p);
      await auditar(p, `índice lateral (pantalla ancha) ${esquema}`);
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
  anio.parar(); hoy.parar(); ballena.parar(); await navegador.close();
}
console.log(`${estados} estados revisados con axe.`);
if (hallazgos.length) {
  console.log(`\n${hallazgos.length} violaciones:`);
  for (const h of hallazgos) console.log(`  - ${h}`);
  process.exit(1);
}
console.log('Sin violaciones.');
