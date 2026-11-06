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
async function servidor(escenario) {
  const port = await puertoLibre();
  const hijo = spawn(PYTHON, [path.join(AQUI, 'servidor_prueba.py'), String(port), escenario], { stdio: ['ignore', 'ignore', 'pipe'] });
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
  const ctx = await browser.newContext({ ...devices['iPhone 13'], ...opts });
  const p = await ctx.newPage();
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
const datos = (p, ruta) => p.evaluate((r) => fetch(r).then((x) => x.json()), ruta);
const saldo = (p) => p.evaluate(() => {
  const el = document.querySelector('#s-sats .cg-vivo');
  const r = el.getBoundingClientRect();
  return { txt: el.textContent, w: Math.round(r.width), h: Math.round(r.height), unidad: document.getElementById('s-unidad').textContent, sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth };
});

const navegador = await chromium.launch();
try {
  // ---------------------------------------------------------------- un año de compras
  const anio = await servidor('anio');
  try {
    // El saldo se ve, con la cifra real, en sats y en BTC, sin scroll horizontal, en varios anchos.
    for (const [w, h] of [[320, 640], [375, 812], [768, 1024], [1280, 800], [2560, 1300]]) {
      const { ctx, p, consola } = await entrar(navegador, anio, ADMIN, { viewport: { width: w, height: h }, isMobile: false, hasTouch: false });
      const sats = (await datos(p, '/api/compras')).reduce((a, c) => a + (c.tipo === 'venta' ? -c.sats : c.sats), 0);
      let s = await saldo(p);
      eq(s.txt, entero(sats), `saldo real a ${w} px`);
      ok(s.w > 0 && s.h > 0, `saldo visible a ${w} px`);
      await p.click('#s-saldo-v');
      await p.waitForTimeout(150);
      s = await saldo(p);
      eq([s.txt, s.unidad], [(sats / 1e8).toFixed(8), 'BTC'], `saldo en BTC a ${w} px`);
      ok(s.sw <= s.cw, `sin scroll horizontal a ${w} px`);
      eq(consola, [], `consola limpia a ${w} px: ${consola.join(' | ')}`);
      await ctx.close();
    }

    // Admin en móvil: lo que debe verse con un año de compras.
    {
      const { ctx, p, consola } = await entrar(navegador, anio, ADMIN);
      ok(await p.locator('#valor').isVisible(), 'sale «Lo que pusiste y lo que vale»');
      ok(await p.locator('#toca').isVisible(), 'sale «te toca comprar»');
      ok(/^Para estar en cero, BTC debe subir/.test((await p.textContent('#g-equilibrio')).trim()), 'línea del equilibrio');
      ok(/^Coinbase · (ahora mismo|hace \d+ s)$/.test((await p.textContent('#precio-meta')).trim()), 'precio con «hace X s»');
      const compras = await datos(p, '/api/compras');
      const inv = compras.reduce((a, c) => a + c.monto, 0);
      ok((await p.textContent('#v-lectura')).includes(`pusiste $${entero(inv)}`), 'el gráfico de valor coincide con el cálculo');

      // Tu costo contra el precio promedio del período: la cifra sale del histórico y del precio vivo.
      {
        const vivo = (await datos(p, '/api/precio')).precio;
        const desde = compras[0].fecha;
        const hist = (await datos(p, `/api/historico?desde=${desde}`)).precios.filter(([f]) => f >= desde).map(([f, c]) => [f, c]);
        const hoyIso = hoySV();
        if (hist.at(-1)[0] >= hoyIso) hist[hist.length - 1] = [hist.at(-1)[0], vivo];
        else hist.push([hoyIso, vivo]);
        const media = hist.reduce((a, [, c]) => a + c, 0) / hist.length;
        const costo = (compras.reduce((a, c) => a + c.monto, 0) * 1e8) / compras.reduce((a, c) => a + c.sats, 0);
        const esperado = (costo / media - 1) * 100;
        const txt = (await p.textContent('#v-vs')).trim();
        const m = /un ([\d.]+)% por (debajo|encima)/.exec(txt);
        ok(!!m && Math.abs((m[2] === 'debajo' ? -1 : 1) * Number(m[1]) - esperado) < 0.15, `costo contra promedio del período: «${txt.slice(0, 90)}…» (esperado ${esperado.toFixed(1)} %)`);
      }

      // Tema: automático → claro → oscuro → automático.
      await p.click('#cuenta-btn');
      await p.waitForTimeout(250);
      const tema = () => p.evaluate(() => document.documentElement.dataset.tema);
      const inicial = await tema();
      await p.click('#dc-tema');
      eq([await tema(), (await p.textContent('#dc-tema')).trim()], ['claro', 'Tema: claro'], 'tema claro a mano');
      await p.click('#dc-tema');
      eq(await tema(), 'oscuro', 'tema oscuro a mano');
      await p.click('#dc-tema');
      eq([await tema(), (await p.textContent('#dc-tema')).trim()], [inicial, 'Tema: automático'], 'vuelve a automático');
      await p.keyboard.press('Escape');
      await p.waitForTimeout(250);

      // Una compra normal se guarda al primer toque y celebra sin romper nada.
      const precio = (await datos(p, '/api/precio')).precio;
      const mediana = [...compras.map((c) => c.monto)].sort((a, b) => a - b)[Math.floor(compras.length / 2)];
      const satsDe = (d) => Math.round((d / precio) * 1e8);
      const hoy = hoySV();
      const usadas = new Set(compras.map((c) => c.fecha));
      const libre = (() => { for (let d = new Date(`${hoySV()}T12:00:00Z`); ; d.setDate(d.getDate() - 1)) { const f = d.toISOString().slice(0, 10); if (!usadas.has(f)) return f; } })();
      await p.click('#anotar');
      await p.waitForTimeout(400);
      await p.fill('#h-sats', String(satsDe(mediana)));
      await p.fill('#h-fecha', libre);
      ok(await p.locator('#hoja-calc .costo').count() === 1, 'la hoja dice cómo mueve el costo promedio');
      await p.click('#guardar');
      await p.waitForTimeout(1500);
      eq((await datos(p, '/api/compras')).length, compras.length + 1, 'compra normal: se guarda al primer toque');

      // Una cifra 12 veces mayor avisa y exige el segundo toque.
      await p.waitForTimeout(6000);
      const libre2 = (() => { for (let d = new Date(libre); ; d.setDate(d.getDate() - 1)) { const f = d.toISOString().slice(0, 10); if (!usadas.has(f) && f !== libre) return f; } })();
      await p.click('#anotar');
      await p.waitForTimeout(400);
      await p.fill('#h-sats', String(satsDe(mediana * 12)));
      await p.fill('#h-fecha', libre2);
      await p.click('#guardar');
      await p.waitForTimeout(250);
      ok(/veces más que tu compra habitual/.test(await p.textContent('#hoja-error')), 'avisa de la cifra rara');
      eq((await p.textContent('#guardar')).trim(), 'Sí, guardar así', 'el botón pide confirmar');
      eq((await datos(p, '/api/compras')).length, compras.length + 1, 'el primer toque no guarda');
      await p.click('#guardar');
      await p.waitForTimeout(1500);
      eq((await datos(p, '/api/compras')).length, compras.length + 2, 'el segundo toque guarda');
      // Compra extra con nota: no avisa de la cifra rara, se guarda marcada y se ve aparte en la lista.
      await p.waitForTimeout(6000);
      const libre3 = (() => { for (let d = new Date(libre2); ; d.setDate(d.getDate() - 1)) { const f = d.toISOString().slice(0, 10); if (!usadas.has(f) && f !== libre && f !== libre2) return f; } })();
      await p.click('#anotar');
      await p.waitForTimeout(400);
      await p.fill('#h-sats', String(satsDe(mediana * 12)));
      await p.fill('#h-fecha', libre3);
      await p.click('#h-avanzado summary');
      await p.check('#h-extra');
      await p.fill('#h-nota-c', 'cayó 20 %');
      await p.click('#guardar');
      await p.waitForTimeout(1500);
      const tras = await datos(p, '/api/compras');
      eq(tras.length, compras.length + 3, 'la extra se guarda al primer toque, sin aviso de cifra rara');
      const guardada = tras.find((c) => c.fecha === libre3);
      eq([guardada.extra, guardada.nota], [true, 'cayó 20 %'], 'se guarda marcada como extra y con su nota');
      ok((await p.locator('#lista .fila .f-extra').count()) >= 1, 'la lista muestra la etiqueta «Extra»');
      // Dónde están tus sats: un traslado sin comisión y otro con comisión (que se anota también como gasto).
      await p.waitForTimeout(6000);
      ok(await p.locator('#ub-pista').isVisible() && await p.locator('#ub-anotar').isVisible(), 'sin traslados, el admin ve la pista para anotar el primero');
      ok(!(await p.locator('#ub-datos').isVisible()), 'sin traslados no hay barra');
      const antesT = await datos(p, '/api/compras');
      await p.click('#ub-anotar');
      await p.waitForTimeout(500);
      eq((await p.getAttribute('#h-tipo button[data-tipo="traslado"]', 'aria-pressed')), 'true', 'el botón de la pista abre la hoja en «Traslado»');
      eq(await p.locator('#h-avanzado [data-no-traslado]').evaluateAll((els) => els.every((el) => el.hidden)), true, 'los dólares no aplican a un traslado: se ocultan');
      await p.fill('#h-sats', '300000');
      ok(/Quedarán 300,000 sats en tu wallet/.test(await p.textContent('#hoja-calc')), 'la hoja dice cuántos sats quedarán en la wallet');
      await p.click('#guardar');
      await p.waitForTimeout(1500);
      eq((await datos(p, '/api/traslados')).length, 1, 'el traslado se guarda');
      eq((await datos(p, '/api/compras')).length, antesT.length, 'un traslado sin comisión no crea ningún gasto');
      ok(await p.locator('#ub-datos').isVisible(), 'con un traslado sale la barra');
      ok(/300,000 sats · \d+%/.test(await p.textContent('#ub-w')), 'la tarjeta dice cuánto hay en la wallet');
      ok((await p.locator('#lista .fila[data-tras]').count()) === 1, 'la lista muestra el traslado');
      // Sobrepasar lo que tienes en total se rechaza en la hoja
      await p.waitForTimeout(6000);
      await p.click('#anotar');
      await p.waitForTimeout(400);
      await p.click('#h-tipo button[data-tipo="traslado"]');
      await p.fill('#h-sats', '999999999');
      ok(/No tienes tantos sats/.test(await p.textContent('#hoja-calc')) && await p.locator('#guardar').isDisabled(), 'no deja trasladar más de lo que tienes');
      // Con comisión: se guarda el traslado y, además, un gasto «Comisión de retiro»
      await p.fill('#h-sats', '100000');
      await p.click('#h-avanzado summary');
      await p.fill('#h-comision', '300');
      await p.click('#guardar');
      await p.waitForTimeout(2000);
      const trasAhora = await datos(p, '/api/traslados');
      const comprasAhora = await datos(p, '/api/compras');
      eq(trasAhora.length, 2, 'el segundo traslado se guarda');
      const gasto = comprasAhora.find((c) => c.tipo === 'venta' && c.nota === 'Comisión de retiro');
      ok(!!gasto && gasto.sats === 300, 'la comisión se anotó como gasto de 300 sats');
      eq(comprasAhora.length, antesT.length + 1, 'solo se creó ese gasto');
      // Anular un traslado desde la lista
      await p.waitForTimeout(6000);
      await p.locator('#lista .fila[data-tras]').first().click();
      await p.waitForTimeout(400);
      ok(/¿Anular este traslado\?/.test(await p.textContent('#d-titulo')), 'tocar un traslado ofrece anularlo');
      await p.click('#d-borrar button[value="si"]');
      await p.waitForTimeout(1500);
      eq((await datos(p, '/api/traslados')).length, 1, 'el traslado anulado desaparece');
      eq(consola, [], `consola limpia (admin): ${consola.join(' | ')}`);
      void hoy;
      await ctx.close();
    }

    // Lector: ve el libro pero no puede escribir; la primera vez recibe «Así va el libro».
    {
      const { ctx, p, consola } = await entrar(navegador, anio, LECTOR);
      ok(await p.locator('#d-novedades[open]').count() === 1, 'el lector ve la bienvenida');
      await p.click('#nov-ok');
      await p.waitForTimeout(400);
      ok(!(await p.locator('#anotar').isVisible()), 'el lector no ve «Anotar compra»');
      ok(!(await p.locator('#toca').isVisible()), 'el lector no ve «te toca comprar»');
      ok(await p.locator('#valor').isVisible(), 'el lector sí ve el gráfico de valor');
      ok(await p.locator('#ub-datos').isVisible() && !(await p.locator('#ub-anotar').isVisible()), 'el lector ve dónde están los sats pero no el botón de anotar');
      eq(await p.locator('#lista .fila[data-tras]').evaluate((el) => el.tagName), 'DIV', 'el traslado es solo lectura para el lector (no es un botón)');
      const r = await p.evaluate(() => fetch('/api/compras', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Libro': '1' }, body: '{}' }).then((x) => x.status));
      eq(r, 403, 'el servidor rechaza escribir a un lector');
      // El 403 de arriba es la prueba de que el servidor rechaza al lector: es lo esperado; nada más debe salir.
      eq(consola.filter((c) => !/403/.test(c)), [], `consola limpia (lector): ${consola.join(' | ')}`);
      await ctx.close();
    }
  } finally {
    anio.parar();
  }

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
    for (const [cuenta, quien, esperadas] of [[ADMIN, 'admin', ['recordatorio', 'txid', 'respaldo']], [LECTOR, 'lector', ['movimiento', 'hito']]]) {
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
      // Desactivar borra el dispositivo del servidor.
      await p.click('#av-interruptor');
      await p.waitForTimeout(700);
      eq((await p.textContent('#av-estado')).trim(), 'Los avisos están apagados en este dispositivo.', `${quien}: se desactiva`);
      ok(!(await p.locator('#av-lista').isVisible()), `${quien}: sin casillas al apagar`);
      eq((await p.textContent('#av-error')).trim(), '', `${quien}: sin errores`);
      eq(consola, [], `${quien}: consola limpia con los avisos: ${consola.join(' | ')}`);
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

  // ---------------------------------------------------------------- una sola compra
  const una = await servidor('hoy');
  try {
    const { ctx, p, consola } = await entrar(navegador, una, ADMIN);
    // La etiqueta «Tu primera compra» no pisa la línea del precio (se coloca donde haya sitio).
    await p.waitForSelector('.g-nota text', { timeout: 12000 }); // el gráfico sale cuando termina de cargar el histórico
    const roces = await p.evaluate(() => {
      const t = document.querySelector('.g-nota text'), l = document.querySelector('.g-linea');
      if (!t || !l) return -1;
      const bb = t.getBBox(), total = l.getTotalLength();
      let n = 0;
      for (let i = 0; i <= total; i += 2) { const q = l.getPointAtLength(i); if (q.x >= bb.x - 2 && q.x <= bb.x + bb.width + 2 && q.y >= bb.y - 2 && q.y <= bb.y + bb.height + 2) n++; }
      return n;
    });
    eq(roces, 0, 'la etiqueta de la compra no roza la línea del precio');
    ok(!(await p.locator('#valor').isVisible()), 'con 1 compra no sale el gráfico de valor (pide 3)');
    ok(await p.locator('#comienzo').isVisible(), 'con 1 compra sale «Siguiente paso»');
    eq(consola, [], `consola limpia (1 compra): ${consola.join(' | ')}`);
    await ctx.close();
  } finally {
    una.parar();
  }

  // ---------------------------------------------------------------- sin histórico de precios
  const sinhist = await servidor('sinhist');
  try {
    const { ctx, p, consola } = await entrar(navegador, sinhist, ADMIN);
    ok(!(await p.locator('#valor').isVisible()), 'sin histórico no sale el gráfico de valor');
    const s = await saldo(p);
    ok(s.w > 0 && s.txt.length > 0, 'el saldo se ve aunque falle el histórico');
    // El 503 del histórico es lo esperado en este escenario; cualquier otro mensaje no.
    eq(consola.filter((c) => !/503/.test(c)), [], 'sin errores raros sin histórico');
    await ctx.close();
  } finally {
    sinhist.parar();
  }
} finally {
  await navegador.close();
}
console.log(`OK ${n} comprobaciones de navegador`);
