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
const datos = (p, ruta) => p.evaluate((r) => fetch(r).then((x) => x.json()), ruta);
const saldo = (p) => p.evaluate(() => {
  const el = document.querySelector('#s-sats .od-num');
  const r = el.getBoundingClientRect();
  return { txt: document.querySelector('#s-sats .sr').textContent, w: Math.round(r.width), h: Math.round(r.height), unidad: document.getElementById('s-unidad').textContent, sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth };
});

const navegador = await chromium.launch();
try {
  // ---------------------------------------------------------------- un año de compras
  const anio = await servidor('anio');
  try {
    // El saldo se ve, con la cifra real, en sats y en BTC, sin scroll horizontal, en varios anchos.
    for (const [w, h] of [[320, 568], [320, 640], [390, 560], [375, 812], [768, 1024], [1280, 800], [2560, 1300]]) {
      const { ctx, p, consola } = await entrar(navegador, anio, ADMIN, { viewport: { width: w, height: h }, isMobile: false, hasTouch: false });
      const sats = (await datos(p, '/api/compras')).reduce((a, c) => a + (c.tipo === 'venta' ? -c.sats : c.sats), 0);
      let s = await saldo(p);
      eq(s.txt, entero(sats), `saldo real a ${w} px`);
      ok(s.w > 0 && s.h > 0, `saldo visible a ${w} px`);
      // El saludo y «Tu saldo» no se pisan (en pantallas bajas el saldo sube y es fácil que choquen).
      const cajas = await p.evaluate(() => ({ saludoAbajo: document.getElementById('saludo').getBoundingClientRect().bottom, saldoArriba: document.getElementById('t-saldo').getBoundingClientRect().top }));
      ok(cajas.saludoAbajo <= cajas.saldoArriba + 1, `el saludo no pisa «Tu saldo» a ${w}×${h} (${cajas.saludoAbajo.toFixed(0)} ≤ ${cajas.saldoArriba.toFixed(0)})`);
      await p.click('#s-saldo-v');
      await p.waitForTimeout(150);
      s = await saldo(p);
      eq([s.txt, s.unidad], [(sats / 1e8).toFixed(8), 'BTC'], `saldo en BTC a ${w} px`);
      ok(s.sw <= s.cw, `sin scroll horizontal a ${w} px`);
      // Tercera vista: dólares, al precio en vivo (el valor que ya dice la línea de abajo).
      const valorDeAbajo = (await p.innerText('#s-valor')).match(/valen\s+(\$[\d,]+\.\d\d)/)?.[1];
      await p.click('#s-saldo-v');
      await p.waitForTimeout(150);
      s = await saldo(p);
      eq([s.txt, s.unidad.trim()], [valorDeAbajo, 'USD'], `saldo en dólares a ${w} px`);
      ok(s.w > 0 && s.h > 0 && s.sw <= s.cw, `saldo en dólares visible y sin scroll horizontal a ${w} px`);
      ok(/ sats/.test(await p.innerText('#s-valor')) && !/valen/.test(await p.innerText('#s-valor')), `en dólares, la línea de abajo dice los sats a ${w} px`);
      await p.click('#s-saldo-v');
      await p.waitForTimeout(150);
      eq((await saldo(p)).txt, entero(sats), `el ciclo vuelve a sats a ${w} px`);
      // Cifras secundarias: a 320 px salen en forma corta; desde 360 px, enteras.
      const falta = (await p.innerText('#t-falta')).trim();
      ok(w < 360 ? /^faltan [\d.]+[KM]?$/.test(falta) && !falta.includes(',') : /^faltan [\d,]+$/.test(falta), `«${falta}» a ${w} px`);
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
      // Tarjetas: anillo de la etapa, indicador del costo, mini línea, cifras curiosas, línea de próxima compra y anillo de constancia.
      {
        const compras = await datos(p, '/api/compras');
        const pcTramo = await p.evaluate(() => ({ txt: document.getElementById('t-pct').textContent, label: document.getElementById('t-anillo').getAttribute('aria-label'),
          arco: getComputedStyle(document.querySelector('#t-anillo-svg .an-arco')).strokeDasharray, barra: !!document.querySelector('.tr-barra') }));
        ok(/^\d+%$|^<1%$/.test(pcTramo.txt) && /^Vas en \d+\.\d% del camino a /.test(pcTramo.label) && !pcTramo.barra, `anillo de la etapa: ${pcTramo.txt} · «${pcTramo.label}»`);
        const ind = await p.evaluate(() => ({ vis: !document.getElementById('g-indicador').hidden, left: document.getElementById('ind-hoy').style.left, label: document.getElementById('g-indicador').getAttribute('aria-label'),
          t1: document.getElementById('ind-costo-t').textContent, t2: document.getElementById('ind-hoy-t').textContent }));
        ok(ind.vis && /^\d+(\.\d)?%$/.test(ind.left) && /por (debajo de|encima de) tu costo promedio/.test(ind.label) && /^Tu costo promedio · \$/.test(ind.t1) && /^Hoy · \$/.test(ind.t2), `indicador del costo: ${ind.left} · ${ind.t2}`);
        ok(await p.locator('#s-valor svg.mini polyline').count() === 1 && (await p.getAttribute('#s-valor svg.mini', 'aria-label')).startsWith('Valor de tu saldo en los últimos'), 'mini línea del valor junto a la ganancia');
        const dias = Math.round((Date.parse(`${hoySV()}T00:00:00Z`) - Date.parse(`${compras[0].fecha}T00:00:00Z`)) / 864e5);
        const cur = (await p.innerText('#curiosas')).replace(/\s+/g, ' ');
        ok(cur.includes(`${dias.toLocaleString('en-US')} días desde tu primera compra`) && /Tu saldo suma en promedio [\d,]+ sats por día/.test(cur), `cifras curiosas: «${cur.slice(0, 80)}»`);
        const prox = (await p.textContent('#prox')).trim();
        ok(/^Última compra: (hoy|ayer|hace \d+ días)( · próxima(, en \d+ días|: (hoy|mañana) es el último día))?$/.test(prox), `línea de próxima compra: «${prox}»`);
        const altoProx = await p.evaluate(() => document.getElementById('prox').getBoundingClientRect().height);
        ok(altoProx < 26, `la línea de próxima compra cabe en una línea (${altoProx.toFixed(0)} px)`);
        const an = await p.evaluate(() => ({ n: document.getElementById('const-n').textContent, de: document.getElementById('const-de').textContent, label: document.getElementById('const-anillo').getAttribute('aria-label') }));
        ok(/^\d+$/.test(an.n) && /^de \d+$/.test(an.de) && /^Compraste en \d+ de (las últimas 52 semanas|tus \d+ semanas)$/.test(an.label), `anillo de constancia: ${an.n} ${an.de}`);
      }
      // Variación desde ayer junto al precio, y la tarjeta de sats por dólar con su línea del mes.
      const var24 = (await p.textContent('#precio-24')).trim();
      ok(await p.locator('#precio-24').isVisible() && /^[▲▼•] [+−]?\d+\.\d% vs ayer$/.test(var24), `variación desde ayer: «${var24}»`);
      const precioVivo = (await datos(p, '/api/precio')).precio;
      ok(await p.locator('#spd').isVisible(), 'sale la tarjeta de sats por dólar');
      eq((await p.textContent('#spd-v')).trim(), entero(1e8 / precioVivo), 'sats por dólar = 100,000,000 ÷ precio');
      ok(/^Hace \d+ días eran [\d,]+ sats: hoy son un \d+\.\d% (más|menos)\.$|^Casi igual/.test((await p.textContent('#spd-t')).trim()), 'sats por dólar: texto del mes, sin recomendar nada');
      ok((await p.getAttribute('#spd-l', 'aria-label')).startsWith('Sats por dólar en los últimos') && (await p.locator('#spd-l polyline').count()) === 1, 'sats por dólar: línea con su descripción');
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
      // Efectos: automático → todos → esenciales → ninguno → automático, y el estado queda en `html[data-efectos]`.
      // (el diálogo de «Tu cuenta» sigue abierto del bloque del tema)
      const efectos = () => p.evaluate(() => document.documentElement.dataset.efectos);
      const autoEsperado = await p.evaluate(() => (window.libroEfectos.ligero() ? 'esenciales' : 'todos'));
      eq(await efectos(), autoEsperado, 'efectos en automático según el teléfono');
      for (const [nivel, etiqueta] of [['todos', 'Efectos: todos'], ['esenciales', 'Efectos: esenciales'], ['ninguno', 'Efectos: ninguno']]) {
        await p.click('#dc-efectos');
        eq([await efectos(), (await p.textContent('#dc-efectos')).trim()], [nivel, etiqueta], `efectos a mano: ${nivel}`);
      }
      eq(await p.evaluate(() => localStorage.getItem('libro.efectos')), 'ninguno', 'efectos: se recuerda en el dispositivo');
      await p.click('#dc-efectos');
      eq(await efectos(), autoEsperado, 'efectos: vuelve a automático');
      ok(await p.evaluate(() => localStorage.getItem('libro.efectos')) === null, 'efectos: automático borra la preferencia');
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
      ok(await p.locator('#ub-datos').isVisible(), 'con un traslado sale la dona');
      eq(await p.evaluate(() => [/^\d+%$/.test(document.getElementById('ub-pct').textContent), /de tus sats en tu wallet y \d+% en el exchange/.test(document.getElementById('ub-dona').getAttribute('aria-label')), document.querySelectorAll('#ub-dona-svg circle').length]), [true, true, 2], 'dona de wallet y exchange con su texto accesible');
      ok(/300,000 sats · \d+%/.test(await p.innerText('#ub-w')), 'la tarjeta dice cuánto hay en la wallet');
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
      eq((await p.textContent('#prox')).trim(), '', 'el lector no ve la línea de última y próxima compra');
      ok(await p.locator('#t-anillo').isVisible() && await p.locator('#g-indicador').isVisible() && await p.locator('#rep-curiosas').isVisible(), 'el lector sí ve el anillo, el indicador del costo y las cifras curiosas');
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
    for (const [cuenta, quien, esperadas] of [[ADMIN, 'admin', ['recordatorio', 'txid', 'respaldo', 'caida']], [LECTOR, 'lector', ['movimiento', 'hito']]]) {
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

  // ---------------------------------------------------------------- efectos: sistema, modo ligero y pausa
  {
    const srv = await servidor('anio');
    try {
      const fuerte = () => { Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 }); };
      const debil = () => { Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 2 }); };
      const nivel = (p) => p.evaluate(() => document.documentElement.dataset.efectos);
      // Una animación de prueba: si el nivel es «ninguno», el CSS la anula; si no, corre.
      const anima = (p) => p.evaluate(() => {
        const el = document.createElement('div');
        el.style.animation = 'barrido 5s linear infinite';
        document.querySelector('.escena').append(el);
        const s = getComputedStyle(el);
        const r = { nombre: s.animationName, estado: s.animationPlayState };
        el.remove();
        return r;
      });
      // Sistema con movimiento reducido: ninguno (como siempre); una elección a mano «todos» manda sobre el sistema.
      let r = await entrar(navegador, srv, ADMIN, { reducedMotion: 'reduce' }, fuerte);
      eq([await nivel(r.p), (await anima(r.p)).nombre], ['ninguno', 'none'], 'efectos: movimiento reducido del sistema = ninguno y sin animaciones');
      await r.p.evaluate(() => window.libroEfectos.fijar('todos'));
      eq([await nivel(r.p), (await anima(r.p)).nombre], ['todos', 'barrido'], 'efectos: elegir «todos» a mano manda sobre el sistema');
      await r.p.evaluate(() => window.libroEfectos.fijar('auto'));
      await r.p.click('#cuenta-btn'); await r.p.waitForTimeout(250);
      ok((await r.p.textContent('#dc-efectos')).includes('sin movimiento'), 'efectos: la etiqueta explica por qué (sin movimiento)');
      await r.ctx.close();

      // Teléfono modesto: esenciales automáticos, con la marca de modo ligero; a mano se puede corregir.
      r = await entrar(navegador, srv, ADMIN, { reducedMotion: 'no-preference' }, debil);
      eq(await r.p.evaluate(() => [document.documentElement.dataset.efectos, document.documentElement.dataset.ligero]), ['esenciales', '1'], 'efectos: teléfono modesto = esenciales (modo ligero)');
      eq((await anima(r.p)).nombre, 'barrido', 'efectos: los esenciales conservan las animaciones de las acciones');
      await r.p.click('#cuenta-btn'); await r.p.waitForTimeout(250);
      ok((await r.p.textContent('#dc-efectos')).includes('modo ligero'), 'efectos: la etiqueta dice «modo ligero»');
      await r.p.click('#dc-efectos');
      eq(await nivel(r.p), 'todos', 'efectos: se puede corregir a «todos» a mano');
      await r.p.evaluate(() => window.libroEfectos.fijar('auto'));
      await r.ctx.close();

      // Pausa: con la pestaña oculta, o con la escena fuera de la pantalla, las animaciones se detienen y luego retoman.
      r = await entrar(navegador, srv, ADMIN, { reducedMotion: 'no-preference' }, fuerte);
      eq((await anima(r.p)).estado, 'running', 'efectos: a la vista, la animación corre');
      await r.p.evaluate(() => {
        Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
        document.dispatchEvent(new Event('visibilitychange'));
      });
      eq((await anima(r.p)).estado, 'paused', 'efectos: con la pestaña oculta se pausa');
      await r.p.evaluate(() => {
        Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
        document.dispatchEvent(new Event('visibilitychange'));
      });
      eq((await anima(r.p)).estado, 'running', 'efectos: al volver, retoma');
      await r.p.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await r.p.waitForTimeout(500);
      eq(await r.p.evaluate(() => document.documentElement.dataset.escenaFuera), '1', 'efectos: con la escena fuera de la pantalla se pausa');
      eq((await anima(r.p)).estado, 'paused', 'efectos: la animación de la escena queda en pausa');
      await r.p.evaluate(() => window.scrollTo(0, 0));
      await r.p.waitForTimeout(500);
      eq((await anima(r.p)).estado, 'running', 'efectos: al volver a la escena, retoma');
      eq(r.consola, [], 'efectos: consola limpia');
      await r.ctx.close();
    } finally {
      srv.parar();
    }
  }

  // ---------------------------------------------------------------- el cielo según la hora
  {
    const srv = await servidor('anio');
    try {
      const FRANJAS = [[2, 'noche', 'Buenas noches', 'clara'], [6, 'amanecer', 'Buenos días', 'oscura'], [12, 'dia', 'Buenas tardes', 'oscura'], [17.5, 'atardecer', 'Buenas tardes', 'clara']];
      for (const [hora, franja, saludo, tinta] of FRANJAS) {
        const r = await entrar(navegador, srv, ADMIN, { hora, viewport: { width: 390, height: 844 }, isMobile: false, hasTouch: false });
        const est = await r.p.evaluate(() => {
          const cs = (sel) => getComputedStyle(document.querySelector(sel));
          const vis = (sel) => cs(sel).display !== 'none';
          return { franja: document.documentElement.dataset.cielo, tinta: document.documentElement.dataset.tinta, saludo: document.getElementById('saludo').textContent,
            sol: vis('.sol'), luna: vis('.luna'), fondo: cs('.cielo-0').fill, texto: cs('#t-saldo').color, estrellas: Number(cs('.estrella').opacity),
            brillo: !!document.querySelector('.brillo-cima'), sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth };
        });
        eq([est.franja, est.tinta], [franja, tinta], `cielo ${hora} h: franja y tinta`);
        eq(est.saludo, `${saludo}, Daf3r`, `cielo ${hora} h: saludo`);
        eq([est.sol, est.luna], franja === 'noche' ? [false, true] : [true, false], `cielo ${hora} h: ${franja === 'noche' ? 'luna' : 'sol'}`);
        ok(franja === 'noche' ? est.estrellas > 0.5 : franja === 'atardecer' ? est.estrellas > 0 && est.estrellas < 0.5 : est.estrellas === 0, `cielo ${hora} h: estrellas ${est.estrellas}`);
        ok(est.brillo, `cielo ${hora} h: brillo detrás de la cumbre meta`);
        ok(est.sw <= est.cw, `cielo ${hora} h: sin scroll horizontal`);
        const sat = await saldo(r.p);
        ok(sat.w > 100 && /\d/.test(sat.txt), `cielo ${hora} h: el saldo se ve (${sat.w} px)`);
        eq(r.consola, [], `cielo ${hora} h: consola limpia`);
        await r.ctx.close();
      }
      // La entrada también cambia con la hora y no muestra nada personal (ni saludo ni nombre).
      for (const [hora, franja] of [[2, 'noche'], [12, 'dia']]) {
        const ctx = await navegador.newContext({ ...devices['iPhone 13'] });
        const p = await ctx.newPage();
        await p.addInitScript((h) => localStorage.setItem('libro.hora', String(h)), hora);
        await p.goto(`${srv.url}/login`, { waitUntil: 'networkidle' });
        eq(await p.evaluate(() => [document.documentElement.dataset.cielo, !!document.getElementById('saludo')]), [franja, false], `entrada ${hora} h: cielo ${franja} y sin saludo`);
        await ctx.close();
      }
      // Estrellas que titilan: solo con todos los efectos (con esenciales siguen ahí, quietas).
      {
        const r = await entrar(navegador, srv, ADMIN, { hora: 2 });
        const anim = () => r.p.evaluate(() => ({ t1: getComputedStyle(document.querySelector('.estrella.t1')).animationName, t0: getComputedStyle(document.querySelector('.estrella.t0')).animationName,
          fugaz: getComputedStyle(document.querySelector('.fugaz')).animationName }));
        await r.p.evaluate(() => window.libroEfectos.fijar('todos'));
        eq(await anim(), { t1: 'titila', t0: 'none', fugaz: 'fugaz' }, 'estrellas: con todos los efectos titilan y pasa una fugaz');
        await r.p.evaluate(() => window.libroEfectos.fijar('esenciales'));
        eq(await anim(), { t1: 'none', t0: 'none', fugaz: 'none' }, 'estrellas: con esenciales quedan quietas');
        eq(await r.p.evaluate(() => Number(getComputedStyle(document.querySelector('.estrella')).opacity) > 0.5), true, 'estrellas: siguen visibles aunque quietas');
        await r.ctx.close();
      }
    } finally {
      srv.parar();
    }
  }

  // ---------------------------------------------------------------- atmósfera: parallax, nubes, niebla, aves, desenfoque, velo y logo
  {
    const srv = await servidor('anio');
    try {
      const fuerte = () => { Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 }); };
      const debil = () => { Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 2 }); };
      const estado = (p) => p.evaluate(() => {
        const cs = (s) => getComputedStyle(document.querySelector(s));
        return { cielo: cs('.par-cielo').transform, lejos: cs('.par-lejos').transform, medio: cs('.par-medio').transform, filtro: cs('.lejos').filter,
          nube: cs('.nube.n1').display, nubeAnim: cs('.nube.n1').animationName, niebla: cs('.niebla').display, ave: cs('.ave').animationName, aveDisplay: cs('.ave').display,
          velo: getComputedStyle(document.querySelector('.escena'), '::after').content === 'none' ? 0 : Number(getComputedStyle(document.querySelector('.escena'), '::after').opacity), marca: cs('.marca').animationName, ico: cs('.marca-ico path').animationName,
          sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth };
      });
      // Todos los efectos, de día y en un teléfono potente
      let r = await entrar(navegador, srv, ADMIN, { hora: 12, viewport: { width: 1280, height: 800 }, isMobile: false, hasTouch: false }, fuerte);
      let e = await estado(r.p);
      ok(e.cielo !== 'none' && e.lejos !== 'none' && e.medio !== 'none', 'atmósfera: con todos los efectos las tres capas llevan parallax');
      ok(/url/.test(e.filtro), `atmósfera: desenfoque de la sierra lejana (${e.filtro})`);
      eq([e.nube, e.nubeAnim, e.niebla], ['inline', 'nube', 'inline'], 'atmósfera: nubes que cruzan y niebla presentes');
      eq(e.ave, 'none', 'atmósfera: de día no cruzan aves');
      eq(e.velo, 0, 'atmósfera: arriba del todo el velo del scroll es 0');
      const antes = await r.p.evaluate(() => getComputedStyle(document.querySelector('.par-cielo')).transform);
      await r.p.evaluate(() => window.scrollTo(0, 400));
      await r.p.waitForTimeout(700);
      e = await estado(r.p);
      ok(e.cielo !== antes && e.velo > 0.1 && e.velo <= 0.7, `atmósfera: al bajar, el cielo se mueve y el velo sube (${e.velo})`);
      await r.p.evaluate(() => window.scrollTo(0, 0));
      await r.p.mouse.move(60, 200);
      await r.p.waitForTimeout(600);
      const izq = (await estado(r.p)).lejos;
      await r.p.mouse.move(1220, 200);
      await r.p.waitForTimeout(600);
      const der = (await estado(r.p)).lejos;
      ok(izq !== der, `atmósfera: el puntero mueve las capas (${izq} → ${der})`);
      eq(e.marca, 'marca-entra', 'atmósfera: el logo entra al abrir');
      ok(e.sw <= e.cw, 'atmósfera: sin scroll horizontal');
      await r.ctx.close();

      // Al amanecer sí cruzan aves
      r = await entrar(navegador, srv, ADMIN, { hora: 6 }, fuerte);
      e = await estado(r.p);
      eq(e.ave, 'ave', 'atmósfera: al amanecer cruzan aves');
      await r.ctx.close();

      // Esenciales: sin adornos (nubes, niebla, aves ni logo animado), sin parallax ni desenfoque ni velo
      r = await entrar(navegador, srv, ADMIN, { hora: 6 }, fuerte);
      await r.p.evaluate(() => window.libroEfectos.fijar('esenciales'));
      await r.p.evaluate(() => window.scrollTo(0, 300));
      await r.p.waitForTimeout(500);
      e = await estado(r.p);
      eq([e.cielo, e.lejos, e.medio, e.filtro], ['none', 'none', 'none', 'none'], 'atmósfera: con esenciales no hay parallax ni desenfoque');
      eq([e.nube, e.niebla, e.aveDisplay], ['none', 'none', 'none'], 'atmósfera: con esenciales no hay nubes, niebla ni aves');
      eq([e.velo, e.marca, e.ico], [0, 'none', 'none'], 'atmósfera: con esenciales no hay velo ni logo animado');
      await r.ctx.close();

      // Modo ligero (teléfono modesto): nada de desenfoque ni de ambiente
      r = await entrar(navegador, srv, ADMIN, { hora: 12 }, debil);
      e = await estado(r.p);
      eq([e.filtro, e.nube, e.niebla], ['none', 'none', 'none'], 'atmósfera: en modo ligero no hay desenfoque ni nubes ni niebla');
      eq(r.consola, [], 'atmósfera: consola limpia');
      await r.ctx.close();
    } finally {
      srv.parar();
    }
  }

  // ---------------------------------------------------------------- mil compras (la app después de mucho uso)
  const mil = await servidor('mil');
  try {
    const { ctx, p, consola } = await entrar(navegador, mil, ADMIN);
    const compras = await datos(p, '/api/compras');
    ok(compras.length >= 1000, `el escenario trae mil compras o más (${compras.length})`);
    const satsMil = compras.reduce((a, c) => a + (c.tipo === 'venta' ? -c.sats : c.sats), 0);
    const sm = await saldo(p);
    eq(sm.txt, entero(satsMil), 'con mil compras el saldo es el real');
    ok(sm.w > 0 && sm.h > 0, 'con mil compras el saldo se ve');
    const nodos = await p.evaluate(() => document.getElementsByTagName('*').length);
    ok(nodos < 3000, `el DOM no crece con las compras (${nodos} nodos)`);
    await p.waitForSelector('.g-linea', { timeout: 15000 });
    ok(await p.locator('#valor').isVisible(), 'con mil compras sale el gráfico de valor');
    // Dibujo del precio: anillos de extras, máximo de 30 días (hay gran caída), degradado, zona entre precio y costo, bandas y leyenda.
    await p.click('#rangos button[data-r="0"]');
    await p.waitForTimeout(700);
    const dib = await p.evaluate(() => {
      const q = (s) => document.querySelectorAll(`#lienzo ${s}`).length;
      const ley = (c) => !document.querySelector(`.mercado .leyenda ${c}`).hidden;
      return { extras: q('.g-extras'), max: q('.g-max'), maxTxt: document.querySelector('#lienzo .g-max-t')?.textContent, trend: q('#g-trend stop'), zonaG: q('.g-zona-g'), zonaP: q('.g-zona-p'),
        bandas: q('.g-banda'), stroke: getComputedStyle(document.querySelector('#lienzo .g-linea')).stroke, leyX: ley('.k-x'), leyG: ley('.k-g'), leyL: ley('.k-l'), leyM: ley('.k-m'), leyB: ley('.k-b') };
    });
    ok(dib.extras === 1 && dib.leyX, 'con compras extra el gráfico las rodea con un anillo y la leyenda lo explica');
    ok(dib.max === 1 && /^Máx\. 30 días \$[\d,]+$/.test(dib.maxTxt) && dib.leyM, `con gran caída, el máximo de 30 días ${dib.maxTxt}`);
    ok(dib.trend === 13 && /url\(/.test(dib.stroke), 'la línea usa el degradado de tendencia');
    ok(dib.zonaG === 1 && dib.zonaP === 1 && dib.leyG && dib.leyL, 'zona entre el precio y tu costo: lisa a favor, a rayas en contra');
    ok(dib.bandas >= 1 && dib.leyB, `bandas de caída fuerte (${dib.bandas})`);
    // Al cambiar de rango el dibujo anterior se desvanece y se retira solo; sin cambio de rango no hay transición.
    await p.click('#rangos button[data-r="182"]');
    await p.waitForTimeout(80);
    ok(await p.locator('#lienzo .g-sale').count() === 1 && await p.locator('#lienzo .g-entra').count() === 1, 'al cambiar de rango se funde el dibujo anterior con el nuevo');
    await p.waitForTimeout(700);
    ok(await p.locator('#lienzo .g-sale').count() === 0 && await p.locator('#lienzo svg').count() === 1, 'el dibujo anterior se retira solo');
    await p.evaluate(() => window.libroEfectos.fijar('ninguno'));
    await p.click('#rangos button[data-r="365"]');
    await p.waitForTimeout(80);
    ok(await p.locator('#lienzo .g-sale').count() === 0, 'sin movimiento no hay fundido');
    await p.evaluate(() => window.libroEfectos.fijar('auto'));
    // ---- Leer el gráfico: tarjeta flotante, tocar una compra, teclado, leyenda interactiva, escala logarítmica y pantalla completa.
    await p.click('#rangos button[data-r="182"]');
    await p.evaluate(() => document.getElementById('lienzo').scrollIntoView({ block: 'center' })); // el ratón solo actúa dentro de la pantalla
    await p.waitForTimeout(700);
    const caja = async (sel) => p.evaluate((s) => { const r = document.querySelector(s).getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; }, sel);
    // Dónde está (en pantalla) la primera compra dibujada: el primer subtrazado de `.g-compras` empieza en (cx − r, cy).
    const primeraCompra = async (host = '#lienzo') => p.evaluate((h) => {
      const svg = document.querySelector(`${h} svg`), d = svg.querySelector('.g-compras').getAttribute('d');
      const m = /^M([\d.]+) ([\d.]+)a([\d.]+)/.exec(d), r = svg.getBoundingClientRect();
      return { x: r.left + Number(m[1]) + Number(m[3]), y: r.top + Number(m[2]) };
    }, host);
    let lc = await caja('#lienzo');
    await p.mouse.move(lc.x + lc.w * 0.5, lc.y + lc.h * 0.5);
    await p.waitForTimeout(150);
    const flot = await p.evaluate(() => { const t = document.getElementById('g-tarjeta'); return { vis: !t.hidden, modo: t.dataset.modo, txt: t.innerText, eventos: getComputedStyle(t).pointerEvents, oculta: t.getAttribute('aria-hidden') }; });
    ok(flot.vis && flot.modo === 'lectura' && /BTC \$[\d,]+/.test(flot.txt) && flot.eventos === 'none' && flot.oculta === 'true', `tarjeta flotante al recorrer el gráfico: «${flot.txt.replace(/\s+/g, ' ').slice(0, 60)}»`);
    await p.mouse.move(5, 5);
    await p.waitForTimeout(150);
    ok(await p.evaluate(() => document.getElementById('g-tarjeta').hidden), 'al salir del gráfico la tarjeta se va');
    // Tocar una compra la fija, con sus datos, «Editar» (admin) y «Cerrar»
    const pc = await primeraCompra();
    await p.mouse.click(pc.x, pc.y);
    await p.waitForTimeout(200);
    const fija = await p.evaluate(() => { const t = document.getElementById('g-tarjeta'); return { vis: !t.hidden, modo: t.dataset.modo, role: t.getAttribute('role'), txt: t.innerText.replace(/\s+/g, ' '), editar: !t.querySelector('.gt-editar').hidden, sr: document.getElementById('g-sr').textContent }; });
    ok(fija.vis && fija.modo === 'fija' && fija.role === 'group' && /^(Compra|Compra extra|Venta o gasto) · /.test(fija.txt) && /[+−][\d,]+ sats/.test(fija.txt) && fija.editar, `tocar un punto fija su compra: «${fija.txt.slice(0, 90)}»`);
    ok(fija.sr.length > 20, 'y se anuncia a los lectores de pantalla');
    const botones = await p.evaluate(() => [...document.querySelectorAll('#g-tarjeta .gt-acciones button:not([hidden])')].map((b) => { const r = b.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; }));
    ok(botones.length === 2 && botones.every(([w, h]) => w >= 44 && h >= 44), `Editar y Cerrar con zona de toque de 44 px (${JSON.stringify(botones)})`);
    // Cerrar con el botón, con Esc, y tocando en otro sitio
    await p.click('#g-tarjeta .gt-cerrar');
    ok(await p.evaluate(() => document.getElementById('g-tarjeta').hidden), '«Cerrar» quita la tarjeta fija');
    await p.mouse.click(pc.x, pc.y); await p.waitForTimeout(150);
    await p.keyboard.press('Escape'); await p.waitForTimeout(150);
    ok(await p.evaluate(() => document.getElementById('g-tarjeta').hidden), 'Esc quita la tarjeta fija');
    await p.mouse.click(pc.x, pc.y); await p.waitForTimeout(150);
    lc = await caja('#lienzo');
    await p.mouse.click(lc.x + lc.w - 3, lc.y + 8); await p.waitForTimeout(150);
    ok(await p.evaluate(() => document.getElementById('g-tarjeta').hidden), 'tocar en otro sitio del gráfico quita la tarjeta fija');
    // «Editar» abre esa compra en la hoja
    await p.mouse.click(pc.x, pc.y); await p.waitForTimeout(150);
    await p.click('#g-tarjeta .gt-editar');
    await p.waitForTimeout(500);
    ok(await p.evaluate(() => document.getElementById('hoja').hidden === false && /Editar/i.test(document.getElementById('h-titulo')?.textContent ?? 'Editar')), '«Editar» abre la compra en la hoja');
    await p.keyboard.press('Escape'); await p.waitForTimeout(500);
    // Con teclado: flechas para recorrer y Intro para fijar la compra de ese día (si la hay)
    await p.focus('#lienzo');
    await p.keyboard.press('End');
    let fijadaTeclado = false;
    for (let k = 0; k < 120 && !fijadaTeclado; k++) {
      await p.keyboard.press('ArrowLeft');
      await p.keyboard.press('Enter');
      fijadaTeclado = await p.evaluate(() => document.getElementById('g-tarjeta').dataset.modo === 'fija');
    }
    ok(fijadaTeclado, 'con el teclado: flechas para recorrer e Intro para fijar la compra de ese día');
    await p.keyboard.press('Escape'); await p.waitForTimeout(100);
    // Leyenda interactiva: ocultar series y que siempre quede una a la vista
    const oculto = (cls) => p.evaluate((c) => getComputedStyle(document.querySelector(`#lienzo ${c}`)).display === 'none', cls);
    await p.click('.leyenda button[data-serie="compras"]');
    eq([await p.getAttribute('.leyenda button[data-serie="compras"]', 'aria-pressed'), await oculto('.g-compras'), await p.evaluate(() => document.getElementById('lienzo').dataset.ocultas)], ['false', true, 'compras'], 'la leyenda oculta las compras');
    await p.click('.leyenda button[data-serie="precio"]');
    eq([await oculto('.g-linea'), await oculto('.g-prom-tag')], [true, false], 'y también el precio, pero el costo sigue a la vista');
    await p.click('.leyenda button[data-serie="costo"]');
    eq([await p.getAttribute('.leyenda button[data-serie="costo"]', 'aria-pressed'), await oculto('.g-prom-tag')], ['true', false], 'la última línea no se puede ocultar: siempre queda al menos una');
    ok(await p.evaluate(() => (localStorage.getItem('libro.grafico.ocultas') ?? '').split(',').sort().join()) === 'compras,precio', 'lo oculto se recuerda en el dispositivo');
    const alto = await p.evaluate(() => [...document.querySelectorAll('.leyenda button:not([hidden])')].every((b) => b.getBoundingClientRect().height >= 44));
    ok(alto, 'los botones de la leyenda miden al menos 44 px');
    await p.click('.leyenda button[data-serie="precio"]');
    await p.click('.leyenda button[data-serie="compras"]');
    eq(await p.evaluate(() => document.getElementById('lienzo').dataset.ocultas), '', 'volver a tocar los muestra otra vez');
    // Escala logarítmica: solo con «Todo»
    ok(await p.locator('#g-log').isHidden(), 'la escala logarítmica no se ofrece con 6M');
    await p.click('#rangos button[data-r="0"]'); await p.waitForTimeout(500);
    const yLineal = await p.evaluate(() => document.querySelector('#lienzo .g-linea').getAttribute('d').slice(0, 60));
    ok(await p.locator('#g-log').isVisible() && await p.locator('#lienzo .g-escala').count() === 0, 'con «Todo» se ofrece la escala logarítmica (apagada)');
    await p.click('#g-log'); await p.waitForTimeout(500);
    const yLog = await p.evaluate(() => document.querySelector('#lienzo .g-linea').getAttribute('d').slice(0, 60));
    ok(yLineal !== yLog && await p.getAttribute('#g-log', 'aria-pressed') === 'true' && (await p.textContent('#lienzo .g-escala')) === 'Escala logarítmica', 'la escala logarítmica cambia el dibujo y lo dice con una etiqueta');
    eq(await p.evaluate(() => localStorage.getItem('libro.grafico.log')), '1', 'y se recuerda');
    await p.click('#g-log'); await p.waitForTimeout(300);
    ok(await p.locator('#lienzo .g-escala').count() === 0, 'se vuelve a lineal');
    // Pantalla completa
    await p.click('#g-ampliar'); await p.waitForTimeout(700);
    const pant = await p.evaluate(() => { const d = document.getElementById('d-grafico'), l = document.getElementById('dg-lienzo'), s = l.querySelector('svg'); return { abierto: d.open, w: d.getBoundingClientRect().width, vw: innerWidth, hs: s ? s.getBoundingClientRect().height : 0, hl: l.clientHeight, linea: !!l.querySelector('.g-linea') }; });
    ok(pant.abierto && Math.abs(pant.w - pant.vw) < 2 && pant.linea && pant.hs > 300 && Math.abs(pant.hs - pant.hl) < 4, `el gráfico a pantalla completa ocupa el alto disponible (${Math.round(pant.hs)} px de ${pant.hl})`);
    const cerrar = await caja('#dg-cerrar');
    ok(cerrar.w >= 44 && cerrar.h >= 44, `el botón de cerrar es grande (${Math.round(cerrar.w)}×${Math.round(cerrar.h)})`);
    const pcg = await primeraCompra('#dg-lienzo');
    await p.mouse.click(pcg.x, pcg.y); await p.waitForTimeout(200);
    ok(await p.evaluate(() => document.getElementById('dg-tarjeta').dataset.modo === 'fija'), 'a pantalla completa también se puede tocar una compra');
    await p.click('#dg-rangos button[data-r="365"]'); await p.waitForTimeout(500);
    eq(await p.getAttribute('#rangos button[data-r="365"]', 'aria-pressed'), 'true', 'el rango se cambia también desde la pantalla completa');
    await p.keyboard.press('Escape'); await p.waitForTimeout(100);
    await p.keyboard.press('Escape'); await p.waitForTimeout(300);
    ok(await p.evaluate(() => !document.getElementById('d-grafico').open), 'Esc cierra la pantalla completa');
    await p.click('#g-ampliar'); await p.waitForTimeout(400);
    await p.click('#dg-cerrar'); await p.waitForTimeout(300);
    ok(await p.evaluate(() => !document.getElementById('d-grafico').open), 'el botón Cerrar también');
    eq(consola.filter((c) => !/503/.test(c)), [], `con mil compras la consola queda limpia: ${consola.join(' | ')}`);
    await ctx.close();
    // El lector ve el gráfico con sus bandas y zonas, pero no el máximo de 30 días (va con la tarjeta de gran caída, que es del admin).
    const lec = await entrar(navegador, mil, LECTOR);
    await lec.p.waitForSelector('#lienzo .g-linea', { timeout: 15000 });
    if (await lec.p.locator('#nov-ok').isVisible()) { await lec.p.click('#nov-ok'); await lec.p.waitForTimeout(400); } // la bienvenida del lector
    await lec.p.click('#rangos button[data-r="0"]');
    await lec.p.waitForTimeout(500);
    eq(await lec.p.evaluate(() => [document.querySelectorAll('#lienzo .g-max').length, document.querySelectorAll('#lienzo .g-banda').length > 0, document.querySelectorAll('#lienzo .g-extras').length]), [0, true, 1], 'el lector no ve el máximo de 30 días pero sí las bandas y los anillos');
    await lec.ctx.close();
  } finally {
    mil.parar();
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
