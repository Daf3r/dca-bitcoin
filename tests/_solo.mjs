// Prueba de navegador (Playwright + Chromium) contra el servidor de pruebas, sin red.
// Uso: node tests/test_ui.mjs   (necesita `playwright` con Chromium instalado y Flask: PYTHON=ruta/python si no es python3)
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright');
const AQUI = path.dirname(fileURLToPath(import.meta.url));
const PYTHON = process.env.PYTHON || 'python3';
const ADMIN = ['Daf3r', 'clave-de-prueba-12'];
const LECTOR = ['Ana', 'lectora-de-prueba'];
let n = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); n++; };
const eq = (a, b, msg) => { assert.deepEqual(a, b, msg); n++; };
const entero = (x) => Math.round(x).toLocaleString('en-US');
// «Hoy» es el de El Salvador, como en la app (el día UTC cambia a las 18:00 allí).
const hoySV = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/El_Salvador' }).format(new Date());

const puertoLibre = () => new Promise((res) => {
  const s = net.createServer().listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => res(port)); });
});

/** Arranca el servidor de pruebas con un escenario y espera a que responda. */
async function servidor(escenario, env = {}) {
  const port = await puertoLibre();
  const hijo = spawn(PYTHON, [path.join(AQUI, 'servidor_prueba.py'), String(port), escenario], { stdio: ['ignore', 'ignore', 'pipe'], env: { ...process.env, ...env } });
  let err = '';
  hijo.stderr.on('data', (d) => { err += d; });
  const url = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 100; i++) {
    try { if ((await fetch(`${url}/healthz`)).ok) return { url, parar: () => hijo.kill() }; } catch { /* aún no */ }
    await new Promise((r) => setTimeout(r, 200));
  }
  hijo.kill();
  throw new Error(`El servidor de pruebas (${escenario}) no arrancó:\n${err.slice(-800)}`);
}

/** Abre una página, entra con la cuenta dada y espera a que cargue. Recoge errores de consola. */
async function entrar(browser, srv, [usuario, clave], opts = {}, init = null) {
  const { hora = 22, ...opcionesContexto } = opts; // el cielo depende de la hora: las pruebas fijan una (por defecto, de noche)
  const ctx = await browser.newContext({ ...devices['iPhone 13'], ...opcionesContexto });
  const p = await ctx.newPage();
  await p.addInitScript((h) => { try { localStorage.setItem('libro.hora', String(h)); } catch { /* sin almacenamiento */ } }, hora);
  if (init) await (Array.isArray(init) ? p.addInitScript(init[0], init[1]) : p.addInitScript(init));
  const consola = [];
  p.on('console', (m) => ['error', 'warning'].includes(m.type()) && consola.push(m.text()));
  p.on('pageerror', (e) => consola.push(`pageerror ${e.message}`));
  await p.goto(`${srv.url}/login`, { waitUntil: 'networkidle' });
  await p.fill('input[autocomplete="username"]', usuario);
  await p.fill('input[autocomplete="current-password"]', clave);
  await Promise.all([p.waitForURL('**/'), p.click('button[type=submit], .guardar')]);
  await p.waitForTimeout(2800);
  return { ctx, p, consola };
}
const verVista = async (p, v) => { await p.click(`#vistas button[data-vista="${v}"]`); await p.waitForTimeout(400); };
const datos = (p, ruta) => p.evaluate((r) => fetch(r).then((x) => x.json()), ruta);
const saldo = (p) => p.evaluate(() => {
  const el = document.querySelector('#s-sats .od-num');
  const r = el.getBoundingClientRect();
  return { txt: document.querySelector('#s-sats .sr').textContent, w: Math.round(r.width), h: Math.round(r.height), unidad: document.getElementById('s-unidad').textContent, sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth };
});

const navegador = await chromium.launch();
try {
  // ---------------------------------------------------------------- avisos push (el envío real a Apple o Google no se prueba aquí)
  const avisos = await servidor('hoy');
  try {
    // Un navegador de mentira con push: suscribirse devuelve un dispositivo propio; lo demás (clave, suscripción, categorías) es real.
    const conPush = (cfg) => {
      const est = { sub: false };
      if (cfg?.brave) navigator.brave = { isBrave: async () => true };
      const ep = `https://fcm.googleapis.com/fcm/send/ui-${Math.random().toString(36).slice(2)}`;
      const sub = { endpoint: ep, options: {}, unsubscribe: async () => { est.sub = false; return true; },
        toJSON: () => ({ endpoint: ep, keys: { p256dh: `B${'x'.repeat(86)}`, auth: 'a'.repeat(22) } }) };
      const reg = { pushManager: { getSubscription: async () => (est.sub ? sub : null), subscribe: async () => { if (cfg?.falla) { const e = new Error('Registration failed - push service error'); e.name = 'AbortError'; throw e; } est.sub = true; return sub; } }, unregister: async () => true };
      Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: { getRegistration: async () => reg, register: async () => reg, ready: Promise.resolve(reg) } });
      Object.defineProperty(Notification, 'permission', { configurable: true, get: () => (est.permiso ?? 'default') });
      Notification.requestPermission = async () => { est.permiso = 'granted'; return 'granted'; };
    };
    const abrirAvisos = async (p) => {
      if (await p.locator('#nov-ok').isVisible()) { await p.click('#nov-ok'); await p.waitForTimeout(400); } // la bienvenida del lector
      await p.waitForTimeout(700);
      if (await p.locator('#d-avisos').isVisible()) { await p.click('#da-no'); await p.waitForTimeout(300); } // la oferta de avisos de esta visita
      await p.click('#cuenta-btn');
      await p.waitForTimeout(250);
      await p.click('#dc-avisos-btn');
      await p.waitForTimeout(500);
    };
    for (const [cuenta, quien, esperadas] of [[ADMIN, 'admin', ['recordatorio', 'txid', 'respaldo', 'caida', 'wallet']], [LECTOR, 'lector', ['movimiento', 'hito']]]) {
      const { ctx, p, consola } = await entrar(navegador, avisos, cuenta, {}, conPush);
      await abrirAvisos(p);
      ok(await p.locator('#dc-avisos').isVisible() && !(await p.locator('#dc-menu').isVisible()), `${quien}: se abre la vista de avisos`);
      eq((await p.textContent('#av-estado')).trim(), 'Los avisos están apagados en este dispositivo.', `${quien}: empieza apagado`);
      ok((await p.textContent('#av-interruptor')).includes('Activar') && !(await p.locator('#av-lista').isVisible()), `${quien}: ofrece activar y no muestra casillas`);
      await p.click('#av-interruptor');
      await p.waitForTimeout(900);
      eq((await p.textContent('#av-estado')).trim(), 'Los avisos están activados en este dispositivo.', `${quien}: se activa`);
      eq(await p.$$eval('#av-lista input', (xs) => xs.map((x) => x.dataset.cat)), esperadas, `${quien}: solo ve sus categorías`);
      ok((await p.$$eval('#av-lista input', (xs) => xs.map((x) => x.checked))).length === esperadas.length, `${quien}: casillas`);
      ok((await p.textContent('#av-interruptor')).includes('Desactivar'), `${quien}: ahora ofrece desactivar`);
      // Cambiar una categoría se guarda en el servidor y sobrevive a cerrar y abrir la vista.
      const cat = esperadas[esperadas.length - 1];
      const antes = await p.isChecked(`#av-lista input[data-cat="${cat}"]`);
      await p.click(`#av-lista input[data-cat="${cat}"]`);
      await p.waitForTimeout(400);
      await p.click('#dc-avisos [data-cuenta="volver"]');
      await p.click('#dc-avisos-btn');
      await p.waitForTimeout(500);
      eq(await p.isChecked(`#av-lista input[data-cat="${cat}"]`), !antes, `${quien}: la preferencia se guardó`);
      // Horario propio: se muestra el de siempre, se cambia, se valida en el servidor (vuelve a lo guardado) y se recuerda.
      ok(await p.locator('#av-horario').isVisible(), `${quien}: con los avisos activados sale el horario`);
      eq(await p.$$eval('#av-desde, #av-hasta, #av-rec', (xs) => xs.map((x) => x.value)), ['8', '21', '9'], `${quien}: empieza con el horario de siempre`);
      eq(await p.locator('#av-rec-l').isVisible(), quien === 'admin', `${quien}: el recordatorio de compra solo lo ve el admin`);
      await p.selectOption('#av-desde', '6');
      await p.waitForTimeout(400);
      await p.click('#dc-avisos [data-cuenta="volver"]');
      await p.click('#dc-avisos-btn');
      await p.waitForTimeout(500);
      eq(await p.inputValue('#av-desde'), '6', `${quien}: el horario se guardó y se recuerda`);
      await p.selectOption('#av-hasta', '7');
      await p.waitForTimeout(500);
      ok((await p.textContent('#av-error')).includes('al menos 2 horas'), `${quien}: una ventana de menos de 2 horas se rechaza con su motivo («${(await p.textContent('#av-error')).trim()}»)`);
      eq(await p.inputValue('#av-hasta'), '21', `${quien}: y el campo vuelve a lo guardado`);
      if (quien === 'admin') {
        await p.selectOption('#av-desde', '12');
        await p.waitForTimeout(400);
        eq(await p.inputValue('#av-rec'), '12', `${quien}: si el recordatorio queda antes de la ventana, se acomoda solo`);
      }
      await p.selectOption('#av-desde', '8');
      await p.waitForTimeout(300);
      // Campamento 9: aviso de prueba (los dos) y monto de «retirar a tu wallet» (solo admin)
      ok(await p.locator('#av-prueba-btn').isVisible(), `${quien}: con los avisos activados sale «Enviarme un aviso de prueba»`);
      await p.click('#av-prueba-btn');
      await p.waitForFunction(() => { const t = document.getElementById('av-prueba-res').textContent; return t && t !== 'Enviando…'; }, null, { timeout: 20000 });
      const res1 = (await p.textContent('#av-prueba-res')).trim();
      ok(res1.length > 20 && !(await p.locator('#av-prueba-btn').isDisabled()), `${quien}: la prueba dice qué pasó («${res1.slice(0, 60)}…») y el botón vuelve`);
      await p.click('#av-prueba-btn');
      await p.waitForFunction(() => document.getElementById('av-prueba-res').textContent.includes('Espera'), null, { timeout: 5000 });
      ok((await p.textContent('#av-prueba-res')).includes('segundos'), `${quien}: pedir otra enseguida dice cuánto esperar`);
      eq(await p.locator('#av-wallet').isVisible(), quien === 'admin', `${quien}: el monto de «retirar a tu wallet» solo lo ve el admin (con la categoría encendida)`);
      if (quien === 'admin') {
        ok((await p.textContent('#av-w-ayuda')).includes('Elige un monto'), 'admin: sin monto, la ayuda pide elegir uno');
        await p.fill('#av-w-monto', '1500000');
        await p.press('#av-w-monto', 'Tab');
        await p.waitForTimeout(500);
        eq(await p.inputValue('#av-w-monto'), '1,500,000', 'admin: el monto se guarda y se ve con comas');
        ok((await p.textContent('#av-w-ayuda')).includes('1,500,000'), 'admin: la ayuda repite el monto');
        await p.fill('#av-w-monto', 'mucho');
        await p.press('#av-w-monto', 'Tab');
        await p.waitForTimeout(300);
        ok((await p.textContent('#av-error')).includes('solo números') && (await p.inputValue('#av-w-monto')) === '1,500,000', 'admin: un monto que no es número se rechaza y vuelve a lo guardado');
        await p.click('#dc-avisos [data-cuenta="volver"]');
        await p.click('#dc-avisos-btn');
        await p.waitForTimeout(500);
        eq(await p.inputValue('#av-w-monto'), '1,500,000', 'admin: el monto se recuerda');
        ok(await p.locator('#av-w-monto').evaluate((el) => el.getBoundingClientRect().height >= 47.5), 'admin: el campo del monto mide 48 px');
        await p.click('#av-lista input[data-cat="wallet"]');
        await p.waitForTimeout(400);
        ok(!(await p.locator('#av-wallet').isVisible()), 'admin: apagar la categoría esconde el monto');
        await p.click('#av-lista input[data-cat="wallet"]');
        await p.waitForTimeout(400);
        eq(await p.inputValue('#av-w-monto'), '1,500,000', 'admin: y al volver a encenderla el monto sigue ahí');
      }
      // Desactivar borra el dispositivo del servidor.
      await p.click('#av-interruptor');
      await p.waitForTimeout(700);
      eq((await p.textContent('#av-estado')).trim(), 'Los avisos están apagados en este dispositivo.', `${quien}: se desactiva`);
      ok(!(await p.locator('#av-lista').isVisible()), `${quien}: sin casillas al apagar`);
      eq((await p.textContent('#av-error')).trim(), '', `${quien}: sin errores`);
      // El 400 es el horario inválido que se probó a propósito (una ventana de una hora).
      eq(consola.filter((c) => !/400 \(BAD REQUEST\)|429/.test(c)), [], `${quien}: consola limpia con los avisos: ${consola.join(' | ')}`);
      await ctx.close();
    }
    // El botón «Anotar compra» del recordatorio abre la app en #anotar (o le manda un mensaje si ya estaba abierta): solo el admin llega a la hoja.
    for (const [cuenta, quien] of [[ADMIN, 'admin'], [LECTOR, 'lector']]) {
      const { ctx, p } = await entrar(navegador, avisos, cuenta);
      if (await p.locator('#nov-ok').isVisible()) { await p.click('#nov-ok'); await p.waitForTimeout(400); }
      await p.waitForTimeout(500);
      if (await p.locator('#d-avisos').isVisible()) { await p.click('#da-no'); await p.waitForTimeout(300); }
      await p.evaluate(() => { location.hash = '#anotar'; });
      await p.waitForTimeout(1200);
      eq(await p.evaluate(() => !document.getElementById('hoja').hidden), quien === 'admin', `${quien}: #anotar ${quien === 'admin' ? 'abre' : 'no abre'} la hoja de anotar`);
      eq(await p.evaluate(() => location.hash), '', `${quien}: y quita #anotar de la dirección`);
      if (quien === 'admin') {
        await p.keyboard.press('Escape');
        await p.waitForTimeout(400);
        await p.evaluate(() => navigator.serviceWorker?.dispatchEvent?.(new MessageEvent('message', { data: { tipo: 'anotar' } })));
        await p.waitForTimeout(800);
        ok(await p.evaluate(() => !document.getElementById('hoja').hidden), 'admin: el mensaje del service worker también abre la hoja');
      }
      await ctx.close();
    }
    // Varias wallets (idea 156): crear una al anotar un traslado, elegir entre ellas, validar por wallet, ver el reparto y archivarla
    {
      const wal = await servidor('hoy');
      try {
        const { ctx, p, consola } = await entrar(navegador, wal, ADMIN);
        if (await p.locator('#d-avisos').isVisible()) { await p.click('#da-no'); await p.waitForTimeout(300); }
        const saldoT = (await datos(p, '/api/compras')).reduce((a, c) => a + (c.tipo === 'venta' ? -c.sats : c.sats), 0);
        const parte = Math.floor(saldoT / 4);
        await p.waitForTimeout(6000);
        await p.click('#anotar');
        await p.waitForTimeout(400);
        await p.click('#h-tipo button[data-tipo="traslado"]');
        ok(await p.locator('#h-wallet-mas').isVisible() && !(await p.locator('#h-wallet').isVisible()), 'sin más wallets, la hoja ofrece «Usar otra wallet…» y no un selector');
        await p.click('#h-wallet-mas');
        ok(await p.locator('#h-wallet-nueva').isVisible(), 'al pedirla sale el campo del nombre');
        await p.fill('#h-sats', String(parte));
        ok(await p.locator('#guardar').isDisabled(), 'sin nombre no se puede guardar el traslado a la wallet nueva');
        await p.fill('#h-wallet-nueva', 'Ledger');
        ok(/Ledger/.test(await p.textContent('#hoja-calc')) && !(await p.locator('#guardar').isDisabled()), 'con el nombre, la hoja habla de «Ledger»');
        ok(await p.locator('#h-wallet-nueva').evaluate((el) => el.getBoundingClientRect().height >= 47.5), 'el campo del nombre mide 48 px');
        await p.click('#guardar');
        await p.waitForTimeout(1800);
        const ws = await datos(p, '/api/wallets');
        const tl = await datos(p, '/api/traslados');
        eq([ws.length, ws[0]?.nombre, tl.length, tl[0]?.wallet_id === ws[0]?.id], [1, 'Ledger', 1, true], 'se creó la wallet y el traslado va a ella');
        ok(/Ledger/.test(await p.innerText('#ub-dona-text, #ub-lista').catch(() => '')) || /Ledger/.test(await p.innerText('#ubicacion')), 'la tarjeta de dónde están tus sats nombra la wallet');
        ok(/en Ledger/.test(await p.getAttribute('#ub-dona', 'aria-label')), 'y su texto accesible también');
        ok(/«Ledger»/.test(await p.innerText('#lista .fila[data-tras]')), 'la lista dice a qué wallet fue el traslado');
        // Con una wallet extra aparece el selector; cada wallet se valida por separado
        await p.waitForTimeout(6000);
        await p.click('#anotar');
        await p.waitForTimeout(400);
        await p.click('#h-tipo button[data-tipo="traslado"]');
        eq(await p.$$eval('#h-wallet option', (os) => os.map((o) => o.textContent)), ['Mi wallet', 'Ledger', 'Otra wallet nueva…'], 'el selector ofrece la principal, Ledger y «Otra wallet nueva…»');
        await p.click('#h-sentido button[data-sentido="a_exchange"]');
        await p.fill('#h-sats', '1');
        ok(/No tienes tantos sats en tu wallet/.test(await p.textContent('#hoja-calc')) && await p.locator('#guardar').isDisabled(), 'de «Mi wallet» no se puede sacar lo que no tiene, aunque Ledger sí tenga');
        await p.selectOption('#h-wallet', { label: 'Ledger' });
        await p.fill('#h-sats', String(parte + 1));
        ok(/No tienes tantos sats en «Ledger»/.test(await p.textContent('#hoja-calc')) && await p.locator('#guardar').isDisabled(), 'ni de Ledger más de lo que tiene, con su nombre');
        await p.fill('#h-sats', String(Math.floor(parte / 2)));
        ok(!(await p.locator('#guardar').isDisabled()), 'lo que sí tiene se puede sacar');
        await p.keyboard.press('Escape');
        await p.waitForTimeout(400);
        // Un traslado a la principal: la dona reparte entre las dos
        await p.waitForTimeout(6000);
        await p.click('#anotar');
        await p.waitForTimeout(400);
        await p.click('#h-tipo button[data-tipo="traslado"]');
        await p.fill('#h-sats', String(parte));
        await p.click('#guardar');
        await p.waitForTimeout(1800);
        eq(await p.$$eval('#ubicacion .ub-lista > div', (ds) => ds.map((d) => d.querySelector('dt').textContent.trim())), ['Mi wallet', 'Ledger', 'En el exchange'], 'la leyenda tiene una fila por wallet y una del exchange');
        eq(await p.locator('#ub-dona-svg circle').count(), 3, 'la dona tiene un arco por wallet (más la pista)');
        // «Tus datos»: archivar solo si está vacía
        await p.click('#cuenta-btn');
        await p.waitForTimeout(250);
        await p.click('#dc-datos-btn');
        await p.waitForTimeout(500);
        ok(await p.locator('#dd-wallets').isVisible() && (await p.textContent('#dd-wallets-lista')).includes('Ledger'), 'en «Tus datos» salen las wallets');
        ok(await p.locator('#dd-wallets-lista .ses-cerrar').isDisabled(), 'con sats no se puede archivar');
        await p.evaluate(async ({ sats, id }) => {
          await fetch('/api/traslados', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Libro': '1' }, body: JSON.stringify({ fecha: new Date().toISOString().slice(0, 10), sats, sentido: 'a_exchange', wallet_id: id }) });
        }, { sats: parte, id: ws[0].id });
        await p.click('#dc-datos [data-cuenta="volver"]');
        await p.click('#dc-datos-btn').catch(() => {});
        await p.reload({ waitUntil: 'networkidle' });
        await p.waitForTimeout(3200);
        await p.click('#cuenta-btn');
        await p.waitForTimeout(250);
        await p.click('#dc-datos-btn');
        await p.waitForTimeout(500);
        ok(!(await p.locator('#dd-wallets-lista .ses-cerrar').isDisabled()), 'vacía, sí se puede archivar');
        await p.click('#dd-wallets-lista .ses-cerrar');
        await p.waitForTimeout(700);
        ok((await p.textContent('#dd-wallets-lista')).includes('archivadas') && (await datos(p, '/api/wallets'))[0].archivada === true, 'se archiva y el servidor lo confirma');
        eq(consola.filter((c) => !/400|409/.test(c)), [], `consola limpia con varias wallets: ${consola.join(' | ')}`);
        await ctx.close();
      } finally {
        wal.parar();
      }
    }
    // Enlace de solo lectura para hojas de cálculo (idea 159): solo el admin; el token se ve una vez; revocar lo apaga.
    {
      const { ctx, p, consola } = await entrar(navegador, avisos, ADMIN, { permissions: ['clipboard-read', 'clipboard-write'] });
      if (await p.locator('#d-avisos').isVisible()) { await p.click('#da-no'); await p.waitForTimeout(300); }
      await p.click('#cuenta-btn');
      await p.waitForTimeout(250);
      ok(await p.locator('#dc-enlaces-btn').isVisible(), 'admin: «Tu cuenta» ofrece el enlace para la hoja de cálculo');
      await p.click('#dc-enlaces-btn');
      await p.waitForTimeout(500);
      ok(await p.locator('#dc-enlaces').isVisible() && (await p.textContent('#en-cupo')).includes('0 de 5'), 'admin: se abre la vista y dice 0 de 5');
      ok((await p.textContent('#dc-enlaces')).includes('Es como una llave'), 'admin: la advertencia de la llave está a la vista');
      await p.click('#en-crear');
      await p.waitForTimeout(300);
      ok((await p.textContent('#en-error')).includes('nombre'), 'admin: sin nombre no crea y lo dice');
      await p.fill('#en-nombre', 'Mi hoja');
      await p.click('#en-crear');
      await p.waitForSelector('#en-nuevo:not([hidden])', { timeout: 5000 });
      const url = await p.inputValue('#en-nuevo input[aria-label="Enlace de compras"]');
      ok(/\/api\/token\/[\w-]{40,}\/compras\.csv$/.test(url), `admin: se muestra el enlace completo («${url.slice(0, 50)}…»)`);
      ok((await p.textContent('#en-nuevo')).includes('no se vuelve a mostrar') && (await p.textContent('#en-lista')).includes('Mi hoja') && (await p.textContent('#en-cupo')).includes('1 de 5'), 'admin: avisa que es la única vez y aparece en la lista');
      ok(await p.locator('#en-nuevo .ses-cerrar').first().evaluate((b) => b.getBoundingClientRect().height >= 47.5), 'admin: «Copiar» mide 48 px');
      await p.click('#en-nuevo .ses-cerrar >> nth=0');
      await p.waitForTimeout(400);
      eq(await p.evaluate(() => navigator.clipboard.readText()), url, 'admin: «Copiar» deja el enlace en el portapapeles');
      // Quien tenga el enlace lee el CSV sin sesión (otra pestaña sin cookies)
      const ctx2 = await navegador.newContext();
      const r2 = await ctx2.request.get(url);
      ok(r2.status() === 200 && (await r2.text()).startsWith('fecha,monto_usd'), 'el enlace da el CSV sin iniciar sesión');
      await p.click('#en-lista .ses-cerrar');
      await p.waitForTimeout(600);
      ok((await p.textContent('#en-lista')).includes('Revocado') && (await p.textContent('#en-cupo')).includes('0 de 5'), 'admin: revocar lo marca como revocado');
      eq((await ctx2.request.get(url)).status(), 404, 'el enlace revocado ya no funciona');
      await ctx2.close();
      eq(consola.filter((c) => !/404/.test(c)), [], `consola limpia con los enlaces: ${consola.join(' | ')}`);
      await ctx.close();
    }
    {
      const { ctx, p } = await entrar(navegador, avisos, LECTOR);
      if (await p.locator('#nov-ok').isVisible()) { await p.click('#nov-ok'); await p.waitForTimeout(400); }
      await p.click('#cuenta-btn');
      await p.waitForTimeout(250);
      ok(!(await p.locator('#dc-enlaces-btn').isVisible()), 'lector: no ve el enlace para la hoja de cálculo');
      await ctx.close();
    }
    // Al entrar se ofrece activar los avisos, una sola vez por dispositivo; el permiso se pide en el toque del botón.
    {
      const { ctx, p } = await entrar(navegador, avisos, ADMIN, {}, conPush);
      await p.waitForSelector('#d-avisos[open]', { timeout: 8000 });
      ok((await p.textContent('#da-texto')).includes('recordamos comprar'), 'admin: la oferta habla de recordatorios');
      ok(await p.evaluate(() => Notification.permission) === 'default', 'no se pidió el permiso por su cuenta: espera al toque');
      await p.click('#da-no');
      await p.waitForTimeout(300);
      ok(!(await p.locator('#d-avisos').isVisible()), 'admin: «Ahora no» cierra la oferta');
      await p.reload({ waitUntil: 'networkidle' });
      await p.waitForTimeout(3500);
      ok(!(await p.locator('#d-avisos').isVisible()), 'admin: después de decir que no, no se vuelve a ofrecer en ese dispositivo');
      await ctx.close();
    }
    const fresco = await servidor('hoy'); // un lector que entra por primera vez (el servidor anterior ya le marcó su bienvenida)
    try {
      const { ctx, p, consola } = await entrar(navegador, fresco, LECTOR, {}, conPush);
      ok(await p.locator('#d-novedades').isVisible() && !(await p.locator('#d-avisos').isVisible()), 'lector: primero su bienvenida, no la oferta');
      await p.click('#nov-ok');
      await p.waitForSelector('#d-avisos[open]', { timeout: 6000 });
      ok((await p.textContent('#da-texto')).includes('una compra, una venta o un gasto'), 'lector: la oferta habla de movimientos');
      await p.click('#da-si');
      await p.waitForTimeout(1200);
      ok(!(await p.locator('#d-avisos').isVisible()), 'lector: al activar se cierra la oferta');
      ok((await p.textContent('#aviso-txt')).includes('Avisos activados'), 'lector: confirma que quedaron activados');
      await p.click('#cuenta-btn');
      await p.waitForTimeout(250);
      await p.click('#dc-avisos-btn');
      await p.waitForTimeout(600);
      eq((await p.textContent('#av-estado')).trim(), 'Los avisos están activados en este dispositivo.', 'lector: «Tu cuenta» los muestra activados');
      eq(consola, [], `lector: consola limpia con la oferta: ${consola.join(' | ')}`);
      await ctx.close();
    } finally {
      fresco.parar();
    }
    // Si el navegador no puede suscribirse (Brave lo trae apagado), se explica en español y qué hacer.
    for (const [cfg, esperado, nombre] of [[{ falla: true, brave: true }, 'brave://settings/privacy', 'Brave'], [{ falla: true }, 'no pudo conectarse con su servicio de avisos', 'otro navegador']]) {
      const { ctx, p } = await entrar(navegador, avisos, ADMIN, {}, [conPush, cfg]);
      await p.waitForSelector('#d-avisos[open]', { timeout: 8000 });
      await p.click('#da-si');
      await p.waitForTimeout(900);
      const txt = (await p.textContent('#da-error')).trim();
      ok(txt.includes(esperado) && !/Registration failed/.test(txt), `${nombre}: explica el fallo en español: «${txt.slice(0, 70)}…»`);
      ok(await p.locator('#d-avisos').isVisible() && await p.locator('#da-si').isEnabled(), `${nombre}: la tarjeta sigue abierta para reintentar`);
      await ctx.close();
    }
    // Sin soporte o con el permiso bloqueado (como en este Chromium sin interfaz) no se ofrece nada que no va a funcionar.
    {
      const { ctx, p } = await entrar(navegador, avisos, ADMIN, {});
      await p.waitForTimeout(1500);
      ok(!(await p.locator('#d-avisos').isVisible()), 'con el permiso bloqueado no se ofrece');
      await ctx.close();
    }
    // Un navegador sin push (o iPhone sin instalar) lo explica y no ofrece nada que no va a funcionar.

    const sin = await entrar(navegador, avisos, ADMIN, {}, () => { delete window.PushManager; });
    await abrirAvisos(sin.p);
    ok((await sin.p.textContent('#av-motivo')).includes('Añadir a pantalla de inicio') && !(await sin.p.locator('#av-interruptor').isVisible()),
      'iPhone sin instalar: explica cómo instalar y no ofrece el botón');
    eq(sin.consola, [], 'sin push: consola limpia');
    await sin.ctx.close();
  } finally {
    avisos.parar();
  }

} finally {
  await navegador.close();
}
console.log(`OK ${n} comprobaciones de navegador`);
