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
  const { hora = 22, pestanas = false, ...opcionesContexto } = opts; // el cielo depende de la hora: las pruebas fijan una (por defecto, de noche); la mayoría prueba «Todo junto» (la página larga de siempre) y el bloque de pestañas pide `pestanas: true`
  const ctx = await browser.newContext({ ...devices['iPhone 13'], ...opcionesContexto });
  const p = await ctx.newPage();
  await p.addInitScript(([h, pes]) => { try { localStorage.setItem('libro.hora', String(h)); if (!pes) localStorage.setItem('libro.pestanas', 'todo'); } catch { /* sin almacenamiento */ } }, [hora, pestanas]);
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
  // ---------------------------------------------------------------- anotar y datos vivos: compra de siempre, deshacer, mini-cabecera, título, reconexión, actualización, ETag
  {
    const srv = await servidor('nueve');
    try {
      const { ctx, p, consola } = await entrar(navegador, srv, ADMIN, { hora: 12 });
      const aviso = () => p.evaluate(() => document.getElementById('aviso-txt').textContent);
      const esperaAviso = (re) => p.waitForFunction((r) => new RegExp(r).test(document.getElementById('aviso-txt').textContent), re.source, { timeout: 8000 });
      const nCompras = async () => (await datos(p, '/api/compras')).length;
      const inicial = await nCompras();
      const respuestas = [];
      p.on('response', (r) => /\/api\/(compras|traslados)$/.test(r.url()) && respuestas.push([r.url().split('/').pop(), r.status()]));

      // Título de la pestaña con el saldo y el precio; se apaga en «Tu cuenta»
      ok(/^[\d,]+ sats · \$[\d,]+$/.test(await p.title()), `título: saldo y precio («${await p.title()}»)`);
      await p.click('#cuenta-btn');
      await p.click('#dc-titulo');
      eq([await p.title(), await p.evaluate(() => localStorage.getItem('libro.titulo'))], ['Libro DCA', '0'], 'título: se apaga y se recuerda');
      await p.click('#dc-titulo');
      ok(/sats/.test(await p.title()), 'título: se vuelve a encender');
      await p.keyboard.press('Escape');
      await p.waitForTimeout(300);

      // Mini-cabecera: oculta arriba, a la vista al bajar, con saldo y precio; al tocarla sube
      ok(!(await p.locator('#minicab').isVisible()), 'mini-cabecera: arriba del todo no se ve');
      await p.evaluate(() => document.querySelector('.compras').scrollIntoView({ block: 'start' }));
      await p.waitForSelector('#minicab', { state: 'visible', timeout: 3000 });
      const mc = { height: await p.locator('#minicab').evaluate((el) => el.offsetHeight) }; // sin transformaciones: la franja entra deslizándose
      const txtMc = await p.locator('#minicab').innerText();
      ok(mc.height >= 44 && /sats/.test(txtMc) && /\$[\d,]+/.test(txtMc), `mini-cabecera: franja de ${Math.round(mc.height)} px con saldo y precio («${txtMc.replace(/\s+/g, ' ')}»)`);
      ok((await p.locator('#minicab').textContent()).includes('Volver arriba'), 'mini-cabecera: su nombre accesible incluye lo visible y «Volver arriba»');
      await p.click('#minicab');
      await p.waitForFunction(() => scrollY < 5, null, { timeout: 4000 });
      await p.waitForSelector('#minicab', { state: 'hidden', timeout: 3000 });
      ok(true, 'mini-cabecera: al tocarla sube y se esconde');

      // Compra de siempre: rellena una estimación y pide confirmar antes de guardarla como si fuera lo real
      await p.click('#anotar');
      await p.waitForTimeout(400);
      const btnH = p.locator('#h-habitual');
      ok(await btnH.isVisible() && /^Compra de siempre: \$\d+ ≈ [\d,]+ sats$/.test((await btnH.innerText()).trim()), `compra de siempre: botón con la estimación («${(await btnH.innerText()).trim()}»)`);
      await btnH.click();
      const est = await p.evaluate(() => ({ sats: document.getElementById('h-sats').value, marca: document.getElementById('h-sats').dataset.estimado, calc: document.getElementById('hoja-calc').textContent, fecha: document.getElementById('h-fecha').value }));
      ok(est.sats && est.marca === '1' && est.calc.startsWith('Estimación con el precio de hoy') && est.fecha === hoySV(), 'compra de siempre: sats estimados, marcados, con aviso y con la fecha de hoy');
      await p.click('#guardar');
      ok((await p.textContent('#hoja-error')).includes('estimación') && (await p.textContent('#guardar')).trim() === 'Sí, guardar así', 'compra de siempre: el primer toque pide confirmar');
      await p.fill('#h-sats', '23456');
      eq(await p.evaluate(() => document.getElementById('h-sats').dataset.estimado), '', 'compra de siempre: al escribir los sats reales ya no es estimación');
      await btnH.click();
      await p.click('#guardar');
      await p.click('#guardar'); // «Sí, guardar así»
      await esperaAviso(/^Anotado/);

      // Deshacer lo que se acaba de anotar
      ok(await p.locator('#aviso-btn').isVisible() && (await p.textContent('#aviso-btn')).trim() === 'Deshacer', 'deshacer: el aviso de guardado trae «Deshacer»');
      eq(await nCompras(), inicial + 1, 'deshacer: la compra quedó guardada');
      await p.click('#aviso-btn');
      await esperaAviso(/^Deshecho/);
      eq(await nCompras(), inicial, 'deshacer: lo anotado quedó anulado');
      await p.waitForTimeout(600);

      // Deshacer una anulación vuelve a anotar la compra con los mismos datos
      const antes = (await datos(p, '/api/compras')).at(-1);
      await p.evaluate(() => document.getElementById('lista').scrollIntoView({ block: 'start' }));
      await p.locator('#lista .fila').first().click();
      await p.waitForTimeout(400);
      await p.click('#h-borrar');
      await p.click('#d-borrar button[value="si"]');
      await esperaAviso(/anulada\. Queda en el historial/);
      eq(await nCompras(), inicial - 1, 'deshacer: la anulación se hizo');
      await p.click('#aviso-btn');
      await esperaAviso(/Vuelve a estar anotada/);
      const despues = await datos(p, '/api/compras');
      const vuelta = despues.find((c) => c.fecha === antes.fecha && c.sats === antes.sats && c.monto === antes.monto);
      ok(despues.length === inicial && vuelta, 'deshacer: la compra anulada vuelve con la misma fecha, sats y monto');
      await p.waitForTimeout(600);

      // Deshacer una corrección
      await p.locator('#lista .fila').first().click();
      await p.waitForTimeout(400);
      const satsAntes = await p.inputValue('#h-sats');
      await p.fill('#h-sats', '33333');
      await p.click('#guardar');
      await esperaAviso(/^Movimiento corregido/);
      await p.click('#aviso-btn');
      await esperaAviso(/Cambio deshecho/);
      ok((await datos(p, '/api/compras')).some((c) => entero(c.sats) === satsAntes), 'deshacer: la corrección vuelve a los sats de antes');
      await p.waitForTimeout(600);

      // Reconexión: una lectura que no llega se reintenta sola y avisa «Reconectando…» (las escrituras no se repiten)
      await p.waitForFunction(() => document.getElementById('aviso').hidden, null, { timeout: 6000 }); // el aviso anterior no se pisa
      let fallos = 0;
      await p.route('**/api/precio', (r) => (fallos++ < 2 ? r.abort() : r.continue()));
      // Se vigila el aviso con un observador (un sondeo podría perderse el instante en que sale).
      await p.evaluate(() => {
        window.__reconectando = false;
        new MutationObserver(() => { if (document.getElementById('aviso-txt').textContent === 'Reconectando…') window.__reconectando = true; })
          .observe(document.getElementById('aviso-txt'), { childList: true, characterData: true, subtree: true });
        document.dispatchEvent(new Event('visibilitychange'));
      });
      for (let i = 0; i < 60 && fallos < 3; i++) await p.waitForTimeout(250);
      await p.waitForFunction(() => document.getElementById('aviso').hidden, null, { timeout: 9000 });
      ok(await p.evaluate(() => window.__reconectando), 'reconexión: avisó «Reconectando…»');
      ok(fallos === 3, `reconexión: dos fallos y al tercero llega (${fallos} intentos) y el aviso se va solo`);
      await p.unroute('**/api/precio');

      // ETag: la segunda lectura de compras y traslados llega como 304 y la app sigue igual
      const saldoAntes = await p.evaluate(() => document.querySelector('#s-sats .sr').textContent);
      respuestas.length = 0;
      await p.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
      await p.waitForTimeout(1500);
      ok(respuestas.some(([, st]) => st === 304), `ETag: las lecturas repetidas llegan como 304 (${JSON.stringify(respuestas)})`);
      eq(await p.evaluate(() => document.querySelector('#s-sats .sr').textContent), saldoAntes, 'ETag: con 304 la pantalla queda igual');

      // Actualización automática cada minuto: una compra hecha desde otro lado aparece sola
      const satsOtra = 17777;
      await p.evaluate(async (n) => { await fetch('/api/compras', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Libro': '1' }, body: JSON.stringify({ fecha: new Date().toISOString().slice(0, 10), monto: 12, sats: n, tipo: 'compra' }) }); }, satsOtra);
      const esperado = entero(Number(saldoAntes.replace(/,/g, '')) + satsOtra);
      await p.waitForFunction((e) => document.querySelector('#s-sats .sr')?.textContent === e, esperado, { timeout: 80000 });
      ok(true, 'actualización automática: la compra de otro dispositivo apareció sola en menos de un minuto');
      // Las dos lecturas que se abortaron a propósito (reconexión) dejan su aviso en la consola; nada más.
      eq(consola.filter((c) => !/ERR_FAILED/.test(c)), [], `consola limpia (anotar y datos vivos): ${consola.join(' | ')}`);
      eq(consola.filter((c) => /ERR_FAILED/.test(c)).length, 2, 'consola: solo las dos lecturas abortadas a propósito');
      await ctx.close();
    } finally {
      srv.parar();
    }
  }

} finally {
  await navegador.close();
}
console.log(`OK ${n} comprobaciones de navegador`);
