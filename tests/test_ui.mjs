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
      await verVista(p, 'valor');
      ok(await p.locator('#valor').isVisible() && !(await p.locator('#mercado').isVisible()), 'la vista «Valor» enseña «Lo que pusiste y lo que vale» y esconde el precio');
      await verVista(p, 'precio');
      ok(await p.locator('#mercado').isVisible() && !(await p.locator('#valor').isVisible()), 'la vista «Precio» es la de siempre');
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
      const var24 = (await p.innerText('#precio-24')).trim(); // la flecha es un icono SVG (sin texto): queda «−0.2% vs ayer» o «• +0.0% vs ayer»
      ok(await p.locator('#precio-24').isVisible() && /^(• )?[+−]?\d+\.\d% vs ayer$/.test(var24) && (var24.startsWith('•') || await p.locator('#precio-24 .ico').count() === 1), `variación desde ayer: «${var24}»`);
      const precioVivo = (await datos(p, '/api/precio')).precio;
      ok(await p.locator('#spd').isVisible(), 'sale la tarjeta de sats por dólar');
      eq((await p.textContent('#spd-v')).trim(), entero(1e8 / precioVivo), 'sats por dólar = 100,000,000 ÷ precio');
      ok(/^Hace \d+ días eran [\d,]+ sats: hoy son un \d+\.\d% (más|menos)\.$|^Casi igual/.test((await p.textContent('#spd-t')).trim()), 'sats por dólar: texto del mes, sin recomendar nada');
      ok((await p.getAttribute('#spd-l', 'aria-label')).startsWith('Sats por dólar en los últimos') && (await p.locator('#spd-l polyline').count()) === 1, 'sats por dólar: línea con su descripción');
      const compras = await datos(p, '/api/compras');
      const inv = compras.reduce((a, c) => a + c.monto, 0);
      ok((await p.textContent('#v-lectura')).includes(`pusiste $${entero(inv)}`), 'el gráfico de valor coincide con el cálculo');

      // Tira de 52 semanas: entra escalonada (con todos los efectos) y al tocar una semana dice sus compras.
      {
        await p.evaluate(() => document.getElementById('semanas').scrollIntoView({ block: 'center' }));
        await p.waitForTimeout(600);
        const entra = await p.evaluate(() => { const i = document.querySelectorAll('#semanas i')[5]; return { clase: document.getElementById('semanas').classList.contains('entra'), anim: getComputedStyle(i).animationName, retraso: getComputedStyle(i).animationDelay, n: document.querySelectorAll('#semanas i').length }; });
        ok(entra.clase && entra.anim === 'sem-entra' && entra.retraso !== '0s' && entra.n >= 40, `la tira de semanas entra escalonada (${entra.anim}, retraso ${entra.retraso})`);
        const conCompra = await p.locator('#semanas i.con').first().boundingBox();
        await p.mouse.click(conCompra.x + conCompra.width / 2, conCompra.y + conCompra.height / 2);
        await p.waitForTimeout(150);
        const det = (await p.textContent('#sem-det')).trim();
        ok(/^Semana del \d+ \w+ al \d+ \w+: \d+ compras?, \+[\d,]+ sats \(\$[\d,]+\)\.$/.test(det) && await p.locator('#semanas i.sel').count() === 1, `tocar una semana con compra dice sus compras: «${det}»`);
        const sinCompra = await p.locator('#semanas i:not(.con)').count() ? await p.locator('#semanas i:not(.con)').first().boundingBox() : null; // (con compras todas las semanas no hay ninguna vacía)
        if (sinCompra) {
          await p.mouse.click(sinCompra.x + sinCompra.width / 2, sinCompra.y + sinCompra.height / 2);
          await p.waitForTimeout(150);
          ok(/: sin compras\.$/.test((await p.textContent('#sem-det')).trim()), 'una semana sin compras lo dice');
        }
        await p.focus('#semanas');
        await p.keyboard.press('End');
        await p.keyboard.press('ArrowLeft');
        ok(await p.getAttribute('#sem-det', 'aria-live') === 'polite' && /^Semana del /.test(await p.textContent('#sem-det')), 'con el teclado se recorren las semanas y se anuncian');
        await p.mouse.move(5, 5);
      }
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
      await verVista(p, 'valor');
      ok(await p.locator('#valor').isVisible(), 'el lector sí ve el gráfico de valor');
      await verVista(p, 'precio');
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
        await p.click('#h-sentido button[data-sentido="a_wallet"]'); // el borrador de la hoja puede traer el sentido de antes
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
          velo: getComputedStyle(document.querySelector('.escena-velo')).display === 'none' ? 0 : Number(getComputedStyle(document.querySelector('.escena-velo')).opacity), marca: cs('.marca').animationName, ico: cs('.marca-ico path').animationName,
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

  // ---------------------------------------------------------------- se siente como app: recargar al arrastrar, hoja arrastrable, carga, avisos, tema
  {
    const srv = await servidor('nueve');
    try {
      const toque = (p, tipo, y, sel = 'body') => p.evaluate(([t, yy, q]) => {
        const el = document.querySelector(q);
        const to = new Touch({ identifier: 1, target: el, clientX: 100, clientY: yy });
        el.dispatchEvent(new TouchEvent(t, { bubbles: true, cancelable: true, touches: t === 'touchend' ? [] : [to], targetTouches: [], changedTouches: [to] }));
      }, [tipo, y, sel]);
      const { ctx, p, consola } = await entrar(navegador, srv, ADMIN, { hora: 12 });
      const pedidos = [];
      p.on('request', (q) => /\/api\/compras$/.test(q.url()) && pedidos.push(q.url()));
      const sol = () => p.evaluate(() => document.getElementById('recarga').dataset.estado || '');

      // Arrastrar para actualizar: un tirón corto no hace nada; uno largo muestra el sol «lista» y, al soltar, actualiza.
      await toque(p, 'touchstart', 100); await toque(p, 'touchmove', 160);
      eq(await sol(), 'tirando', 'recarga: tirón corto = tirando');
      await toque(p, 'touchend', 160);
      await p.waitForTimeout(300);
      eq([await sol(), pedidos.length], ['', 0], 'recarga: un tirón corto no actualiza');
      await toque(p, 'touchstart', 100, '#lienzo'); await toque(p, 'touchmove', 400, '#lienzo'); await toque(p, 'touchend', 400, '#lienzo');
      eq([await sol(), pedidos.length], ['', 0], 'recarga: arrastrar sobre el gráfico no recarga la página');
      await toque(p, 'touchstart', 100); await toque(p, 'touchmove', 330);
      eq(await sol(), 'lista', 'recarga: pasado el umbral dice «lista»');
      await toque(p, 'touchend', 330);
      await p.waitForFunction(() => document.getElementById('aviso-txt').textContent === 'Actualizado', null, { timeout: 5000 });
      ok(pedidos.length >= 1, 'recarga: al soltar vuelve a pedir las compras');
      const barra = await p.evaluate(() => [document.getElementById('aviso').dataset.temporal, getComputedStyle(document.getElementById('aviso'), '::after').animationName]);
      eq(barra, ['1', 'aviso-barra'], 'avisos temporales: llevan su barra de tiempo');
      await p.waitForTimeout(4000);
      ok(await p.evaluate(() => document.getElementById('aviso').hidden), 'avisos temporales: desaparecen solos');
      await p.waitForTimeout(500);

      // Entrada escalonada: dejó su marca en las tarjetas y ya se retiró (nada queda oculto).
      const entrada = await p.evaluate(() => ({ marcadas: document.querySelectorAll('[style*="--entra"]').length, clase: document.querySelector('.cuerpo').classList.contains('entra'),
        apagadas: [...document.querySelectorAll('.cuerpo > *:not([hidden]), .col-principal > *:not([hidden])')].filter((e) => getComputedStyle(e).opacity !== '1' && e.offsetParent).length }));
      ok(entrada.marcadas >= 3 && !entrada.clase && entrada.apagadas === 0, `entrada escalonada: marca y se retira sin dejar nada apagado (${JSON.stringify(entrada)})`);
      ok(await p.evaluate(() => document.getElementById('sk-cards').hidden && !document.querySelector('#s-valor .sk')), 'carga: las formas grises se van al llegar los datos');

      // Pulsación suave: al tener el dedo abajo el botón se hunde.
      const caja = await p.locator('#cuenta-btn').boundingBox();
      await p.mouse.move(caja.x + caja.width / 2, caja.y + caja.height / 2);
      await p.mouse.down();
      await p.waitForTimeout(250);
      ok((await p.evaluate(() => getComputedStyle(document.getElementById('cuenta-btn')).transform)).startsWith('matrix(0.97'), 'pulsación suave: el botón se hunde al tocarlo');
      await p.mouse.up();
      await p.waitForTimeout(300);

      // Tu cuenta: fundido de tema solo al cambiarlo a mano.
      ok(!(await p.evaluate(() => document.documentElement.classList.contains('tema-fundido'))), 'tema: sin fundido en la carga');
      if (!(await p.locator('#d-cuenta[open]').count())) await p.click('#cuenta-btn');
      await p.click('#dc-tema');
      ok(await p.evaluate(() => document.documentElement.classList.contains('tema-fundido')), 'tema: al cambiarlo a mano los colores se funden');
      await p.waitForTimeout(700);
      ok(!(await p.evaluate(() => document.documentElement.classList.contains('tema-fundido'))), 'tema: el fundido se retira solo');
      await p.click('#dc-tema'); await p.click('#dc-tema'); // vuelve a automático
      // Cambiar de vista dentro de «Tu cuenta» (transición nativa) deja la vista pedida y el foco donde toca.
      await p.click('button[data-cuenta="clave"]');
      await p.waitForSelector('#f-clave:not([hidden])');
      ok(await p.evaluate(() => document.activeElement?.id === 'fc-actual' && document.getElementById('dc-menu').hidden), 'cuenta: «Cambiar contraseña» muestra su vista con el foco en el campo');
      await p.keyboard.press('Escape');

      // Hoja de anotar: se cierra arrastrando el asa hacia abajo; un arrastre corto rebota y queda abierta.
      await p.waitForTimeout(300);
      await p.click('#anotar');
      await p.waitForTimeout(500);
      const asa = await p.locator('#hoja-asa').boundingBox();
      ok(asa && asa.width > 0, 'hoja: en móvil tiene asa para arrastrar');
      const cx = asa.x + asa.width / 2, cy = asa.y + asa.height / 2;
      await p.mouse.move(cx, cy); await p.mouse.down(); await p.mouse.move(cx, cy + 40, { steps: 4 });
      ok((await p.evaluate(() => document.querySelector('.hoja-panel').style.transform)).includes('translateY(40'), 'hoja: sigue al dedo mientras se arrastra');
      await p.mouse.up();
      await p.waitForTimeout(600);
      ok(!(await p.evaluate(() => document.getElementById('hoja').hidden)) && (await p.evaluate(() => document.querySelector('.hoja-panel').style.transform)) === '', 'hoja: un arrastre corto rebota y sigue abierta');
      const asa2 = await p.locator('#hoja-asa').boundingBox();
      await p.mouse.move(asa2.x + asa2.width / 2, asa2.y + 2); await p.mouse.down(); await p.mouse.move(asa2.x + asa2.width / 2, asa2.y + 260, { steps: 8 }); await p.mouse.up();
      await p.waitForFunction(() => document.getElementById('hoja').hidden, null, { timeout: 3000 });
      ok(true, 'hoja: arrastrada hacia abajo se cierra');
      eq(consola, [], `consola limpia (se siente como app): ${consola.join(' | ')}`);
      await ctx.close();

      // Formas grises mientras llegan las compras (con la respuesta retenida) y texto para lectores.
      const retenida = await entrar(navegador, srv, ADMIN, { hora: 12 });
      const p2 = await retenida.ctx.newPage();
      await p2.route('**/api/compras', async (r) => { await new Promise((x) => setTimeout(x, 1500)); await r.continue(); });
      await p2.goto(`${srv.url}/`, { waitUntil: 'commit' });
      await p2.waitForSelector('#s-valor .sk-linea', { timeout: 4000 });
      const gris = await p2.evaluate(() => ({ cards: !document.getElementById('sk-cards').hidden, sr: document.querySelector('#s-valor .sr').textContent, oculto: document.querySelector('#s-valor .sk').getAttribute('aria-hidden') }));
      eq(gris, { cards: true, sr: 'Abriendo tu libro…', oculto: 'true' }, 'carga: formas grises y «Abriendo tu libro…» para lectores');
      await p2.waitForFunction(() => document.getElementById('sk-cards').hidden, null, { timeout: 8000 });
      await retenida.ctx.close();

      // Sin movimiento no hay entrada escalonada; en modo ligero no hay cristal.
      const quieto = await entrar(navegador, srv, ADMIN, { hora: 12, reducedMotion: 'reduce' });
      eq(await quieto.p.evaluate(() => document.querySelectorAll('[style*="--entra"]').length), 0, 'entrada escalonada: con movimiento reducido no se aplica');
      await quieto.ctx.close();
      const ligero = await entrar(navegador, srv, ADMIN, { hora: 12 }, () => { Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 2 }); });
      eq(await ligero.p.evaluate(() => getComputedStyle(document.querySelector('.hoja-fondo')).backdropFilter), 'none', 'cristal: apagado en modo ligero');
      await ligero.ctx.close();
      const normal = await entrar(navegador, srv, ADMIN, { hora: 12 }, () => { Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 }); });
      ok((await normal.p.evaluate(() => getComputedStyle(document.querySelector('.hoja-fondo')).backdropFilter)).includes('blur'), 'cristal: la hoja desenfoca lo de atrás');
      await normal.ctx.close();
    } finally {
      srv.parar();
    }
  }

  // ---------------------------------------------------------------- la lista: meses, «Ver más», buscar, filtrar, ordenar, tabla, nota, borrador, copiar
  {
    const srv = await servidor('mil');
    try {
      const permisos = ['clipboard-read', 'clipboard-write'];
      const { ctx, p, consola } = await entrar(navegador, srv, ADMIN, { hora: 12, permissions: permisos });
      const filas = () => p.locator('#lista .fila').count();
      const res = () => p.evaluate(() => document.getElementById('l-res').textContent);
      const quitar = async () => { if (await p.locator('#l-limpiar').isVisible()) await p.click('#l-limpiar'); };
      const hoy = hoySV();
      const compras = await datos(p, '/api/compras');
      const traslados = await datos(p, '/api/traslados');
      const total = compras.length + traslados.length;
      await p.evaluate(() => document.getElementById('lista').scrollIntoView({ block: 'start' }));

      // Meses y «Ver más»
      const cab = await p.locator('#lista .mes-cab h3').first().innerText();
      ok(/^[A-ZÁÉÍÓÚ][a-záéíóú]+ \d{4} · \d+ (compra|compras)/.test(cab.replace(/\s+/g, ' ')), `lista: encabezado por mes con su resumen («${cab}»)`);
      eq(await filas(), 8, 'lista: arranca con las 8 más recientes');
      eq((await p.textContent('#ver-todas')).trim(), `Ver más (${(total - 8).toLocaleString('en-US')} más)`, 'lista: «Ver más» dice cuántas faltan');
      await p.click('#ver-todas');
      eq(await filas(), 33, 'lista: «Ver más» trae 25 más');
      ok(await p.evaluate(() => document.activeElement?.classList.contains('fila')), 'lista: el foco pasa a la primera fila nueva');
      ok(await p.locator('#l-ctl').isVisible(), 'lista: con muchos movimientos salen el buscador y los filtros');

      // Buscar y filtrar por tipo
      await p.fill('#l-buscar', 'caída');
      await p.waitForTimeout(150);
      const extras = compras.filter((c) => c.extra).length;
      eq(await filas(), Math.min(8, extras), 'búsqueda: sin acentos ni mayúsculas, vuelve al primer tramo');
      ok((await res()).startsWith(`${extras} de `), `búsqueda: dice cuántos de cuántos (${await res()})`);
      eq(await p.locator('#lista .fila:not(:has(.f-extra))').count(), 0, 'búsqueda: todas son compras extra');
      await p.click('#l-limpiar');
      eq([await p.inputValue('#l-buscar'), await res()], ['', ''], 'filtros: «Quitar filtros» limpia todo');
      await p.click('#l-chips button[data-f="venta"]');
      eq(await filas(), compras.filter((c) => c.tipo === 'venta').length, 'filtro: ventas y gastos');
      await p.click('#l-chips button[data-f="traslado"]');
      eq([await filas(), await p.evaluate(() => document.querySelector('#l-chips [data-f="traslado"]').getAttribute('aria-pressed'))], [traslados.length, 'true'], 'filtro: traslados');
      await p.click('#l-chips button[data-f="txid"]');
      eq(await filas(), 0, 'filtro: «Con TXID» sin ninguno dice que nada coincide');
      ok((await p.textContent('#lista .vacio')).includes('Nada coincide'), 'filtro: mensaje de que nada coincide');
      await quitar();

      // Rango de fechas y totales intactos
      const desde = new Date(Date.now() - 120 * 864e5).toISOString().slice(0, 10);
      await p.click('#l-mas summary');
      await p.fill('#l-desde', desde);
      await p.waitForTimeout(150);
      const esperadas = compras.filter((c) => c.fecha >= desde).length + traslados.filter((t) => t.fecha >= desde).length;
      while (await p.locator('#ver-todas').isVisible()) await p.click('#ver-todas');
      eq(await filas(), esperadas, `rango: desde ${desde} deja ${esperadas} movimientos`);
      const saldoAntes = await p.evaluate(() => document.querySelector('#s-sats .sr').textContent);
      eq(saldoAntes, entero(compras.reduce((a, c) => a + (c.tipo === 'venta' ? -c.sats : c.sats), 0)), 'rango: el saldo de arriba sigue siendo el de todo');
      await p.fill('#l-hasta', desde);
      await p.waitForTimeout(150);
      ok((await filas()) <= 2, 'rango: con «hasta» igual a «desde» queda un día');
      await quitar();

      // Orden: más antiguas, mayor monto (sin meses) y se recuerda
      await p.selectOption('#l-orden', 'antiguas');
      const primero = compras.map((c) => c.fecha).sort()[0];
      ok((await p.locator('#lista .mes-cab h3').first().innerText()).includes(primero.slice(0, 4)), 'orden: las más antiguas primero (empieza por el primer año)');
      await p.selectOption('#l-orden', 'monto');
      eq(await p.locator('#lista .mes-cab').count(), 0, 'orden por monto: lista plana, sin meses');
      const mayor = Math.max(...compras.map((c) => c.monto));
      ok((await p.locator('#lista .f-det').first().innerText()).includes(`$${mayor.toFixed(2)}`), 'orden: la compra de mayor monto va primero');
      await p.reload({ waitUntil: 'networkidle' });
      await p.waitForTimeout(2500);
      eq(await p.inputValue('#l-orden'), 'monto', 'orden: se recuerda en el dispositivo');
      await p.click('#l-mas summary');
      await p.selectOption('#l-orden', 'recientes');
      ok(await p.evaluate(() => localStorage.getItem('libro.lista.orden')) === null, 'orden: el de siempre borra la preferencia');

      // Nota editable en la fila (solo admin)
      await p.evaluate(() => document.getElementById('lista').scrollIntoView({ block: 'start' }));
      await p.fill('#l-buscar', 'gasto');
      await p.waitForTimeout(150);
      await p.locator('#lista .f-nota-b').first().click();
      ok(await p.evaluate(() => document.activeElement?.closest('.f-notaed') !== null), 'nota: «Editar nota» abre el campo con el foco');
      ok((await p.locator('#lista .f-notaed input').boundingBox()).width > 120, 'nota: el campo se ve (no queda recortado)');
      await p.keyboard.press('Escape');
      eq(await p.locator('#lista .f-notaed').count(), 0, 'nota: Esc cancela');
      eq(await p.evaluate(() => [...document.querySelectorAll('dialog:not([open])')].filter((d) => getComputedStyle(d).display !== 'none').map((d) => d.id)), [], 'diálogos: ninguno cerrado se ve en la página');
      await p.locator('#lista .f-nota-b').first().click();
      await p.fill('#lista .f-notaed input', 'Gasto en renta');
      await p.keyboard.press('Enter');
      await p.waitForFunction(() => document.getElementById('aviso-txt').textContent === 'Nota guardada.', null, { timeout: 5000 });
      ok((await datos(p, '/api/compras')).some((c) => c.nota === 'Gasto en renta'), 'nota: se guardó en el servidor por la ruta de edición');
      ok((await p.locator('#lista .f-det').allInnerTexts()).some((t) => t.includes('Gasto en renta')), 'nota: la fila muestra la nota nueva');
      await quitar();

      // Borrador de la hoja: lo escrito vuelve; «Empezar de cero» lo descarta; guardar lo borra
      await p.evaluate(() => window.scrollTo(0, 0));
      await p.click('#anotar');
      await p.waitForTimeout(400);
      await p.fill('#h-sats', '12345');
      await p.click('#hoja [data-cerrar].cerrar');
      await p.waitForTimeout(500);
      await p.click('#anotar');
      await p.waitForTimeout(400);
      eq([await p.inputValue('#h-sats'), await p.locator('#h-borrador').isVisible(), await p.inputValue('#h-fecha')], ['12,345', true, hoy], 'borrador: lo escrito vuelve, avisa y la fecha es la de hoy');
      await p.click('#h-borrador-no');
      await p.waitForTimeout(400);
      eq([await p.inputValue('#h-sats'), await p.locator('#h-borrador').isVisible()], ['', false], 'borrador: «Empezar de cero» lo descarta');
      await p.fill('#h-sats', '12345');
      await p.click('#guardar');
      await p.waitForFunction(() => /^Anotado/.test(document.getElementById('aviso-txt').textContent), null, { timeout: 8000 });
      await p.waitForTimeout(2500);
      await p.click('#anotar');
      await p.waitForTimeout(400);
      eq([await p.inputValue('#h-sats'), await p.locator('#h-borrador').isVisible()], ['', false], 'borrador: al guardar se borra');
      await p.keyboard.press('Escape');
      await p.waitForTimeout(500);

      // Lo recién guardado brilla cuando se ve la fila
      await p.evaluate(() => document.getElementById('lista').scrollIntoView({ block: 'center' }));
      await p.waitForSelector('#lista li.resalte', { timeout: 3000 });
      ok(true, 'resalte: la compra recién guardada brilla al verse en la lista');

      // Anular: la fila sale con su animación (queda un instante) y desaparece
      await p.locator('#lista .fila').first().click();
      await p.waitForTimeout(400);
      await p.click('#h-borrar');
      await p.click('#d-borrar button[value="si"]');
      await p.waitForSelector('#lista li.sale', { state: 'attached', timeout: 2000 });
      await p.waitForFunction(() => !document.querySelector('#lista li.sale'), null, { timeout: 3000 });
      ok(true, 'filas: al anular, la fila se va con animación y se retira sola');
      await p.waitForTimeout(500);

      // Copiar: TXID con un toque y el saldo manteniendo pulsado (sin cambiar de unidad)
      const txid = 'ab'.repeat(32);
      await p.evaluate(async (t) => { await fetch('/api/compras', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Libro': '1' }, body: JSON.stringify({ fecha: new Date().toISOString().slice(0, 10), monto: 20, sats: 25000, txid: t, tipo: 'compra' }) }); }, txid);
      await p.reload({ waitUntil: 'networkidle' });
      await p.waitForTimeout(2500);
      await p.locator('#lista .f-copiar').first().click();
      await p.waitForFunction(() => document.getElementById('aviso-txt').textContent === 'TXID copiado', null, { timeout: 3000 });
      eq(await p.evaluate(() => navigator.clipboard.readText()), txid, 'copiar: el TXID queda en el portapapeles');
      await p.evaluate(() => window.scrollTo(0, 0));
      const cs = await p.locator('#s-saldo-v').boundingBox();
      await p.mouse.move(cs.x + 40, cs.y + cs.height / 2);
      await p.mouse.down();
      await p.waitForTimeout(900);
      await p.mouse.up();
      await p.waitForFunction(() => document.getElementById('aviso-txt').textContent.startsWith('Saldo copiado'), null, { timeout: 3000 });
      const [copia, saldoTxt, unidad] = await p.evaluate(async () => [await navigator.clipboard.readText(), document.querySelector('#s-sats .sr').textContent, document.getElementById('s-unidad').textContent]);
      eq([copia, unidad], [saldoTxt.replace(/[^\d.]/g, ''), 'sats'], 'copiar: mantener pulsado el saldo copia solo los números y no cambia de unidad');
      eq(consola, [], `consola limpia (lista): ${consola.join(' | ')}`);
      await ctx.close();

      // Tabla compacta: solo en pantallas anchas
      const ancho = await entrar(navegador, srv, ADMIN, { hora: 12, viewport: { width: 1280, height: 900 }, isMobile: false, hasTouch: false, deviceScaleFactor: 1 });
      ok(await ancho.p.locator('#l-tabla').isVisible(), 'tabla: en pantalla ancha sale «Ver como tabla»');
      await ancho.p.click('#l-tabla');
      await ancho.p.waitForSelector('#d-tabla[open]');
      eq(await ancho.p.locator('#dt tbody tr').count(), 600, 'tabla: máximo 600 filas y lo dice');
      ok((await ancho.p.textContent('#dt-nota')).includes('primeros 600'), 'tabla: la nota explica el tope');
      eq(await ancho.p.locator('#dt thead th[scope="col"]').count(), 8, 'tabla: ocho columnas con encabezado');
      await ancho.p.locator('#dt .dt-edit').first().click();
      await ancho.p.waitForSelector('#hoja:not([hidden])');
      ok(!(await ancho.p.locator('#d-tabla[open]').count()), 'tabla: tocar una fecha cierra la tabla y abre la edición');
      eq(await ancho.consola, [], 'consola limpia (tabla)');
      await ancho.ctx.close();
      const movil = await entrar(navegador, srv, ADMIN, { hora: 12 });
      ok(!(await movil.p.locator('#l-tabla').isVisible()), 'tabla: en el teléfono no sale');
      await movil.ctx.close();

      // Lectores: buscan y copian, pero no editan notas
      const lector = await entrar(navegador, srv, LECTOR, { hora: 12 });
      if (await lector.p.locator('#nov-ok').isVisible()) await lector.p.click('#nov-ok');
      ok(await lector.p.locator('#l-ctl').isVisible(), 'lectores: ven el buscador y los filtros');
      eq(await lector.p.locator('#lista .f-nota-b').count(), 0, 'lectores: no editan notas');
      await lector.ctx.close();
    } finally {
      srv.parar();
    }
  }

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

  // ---------------------------------------------------------------- accesibilidad y teclado: saltar al contenido, índice, atajos, letra grande, alto contraste, foco
  {
    const srv = await servidor('anio');
    try {
      const { ctx, p, consola } = await entrar(navegador, srv, ADMIN, { hora: 12, viewport: { width: 1600, height: 900 }, isMobile: false, hasTouch: false, deviceScaleFactor: 1 });
      const html = (f) => p.evaluate(f);

      // Enlace para saltar al contenido: el primer Tab lo muestra y Enter lleva el foco al contenido principal
      await p.keyboard.press('Tab');
      eq(await html(() => document.activeElement?.className), 'saltar', 'saltar: el primer Tab cae en el enlace');
      ok((await p.locator('.saltar').boundingBox()).y >= 0, 'saltar: al enfocarlo se ve');
      await p.keyboard.press('Enter');
      eq(await html(() => document.activeElement?.id), 'principal', 'saltar: Enter deja el foco en el contenido principal');
      await p.evaluate(() => window.scrollTo(0, 0));

      // Índice de secciones: solo en pantallas muy anchas, salta a la sección y resalta la que se ve
      ok(await p.locator('#indice').isVisible(), 'índice: a 1600 px sale al lado');
      eq(await p.locator('#indice a:visible').count(), 4, 'índice: Saldo, Gráfico, Reportes y Compras');
      await p.click('#indice a[data-s="compras"]');
      await p.waitForTimeout(900);
      ok((await p.locator('#t-compras').boundingBox()).y < 200, 'índice: «Compras» lleva a esa sección');
      eq(await html(() => document.querySelector('#indice a[aria-current="true"]')?.dataset.s), 'compras', 'índice: resalta la sección que se ve');
      await p.click('#indice a[data-s="escena"]');
      await p.waitForTimeout(900);
      ok(await html(() => scrollY < 200), 'índice: «Saldo» sube');
      await p.setViewportSize({ width: 1280, height: 900 });
      ok(!(await p.locator('#indice').isVisible()), 'índice: a 1280 px no sale (no roba espacio)');
      await p.setViewportSize({ width: 1600, height: 900 });

      // Atajos de teclado
      const tema = () => html(() => document.documentElement.dataset.tema);
      const pref = () => html(() => localStorage.getItem('libro.tema'));
      await p.keyboard.press('t');
      eq(await pref(), 'claro', 'atajos: T pasa de automático a claro');
      await p.keyboard.press('t');
      eq([await pref(), await tema()], ['oscuro', 'oscuro'], 'atajos: T pasa a oscuro');
      await p.keyboard.press('t');
      eq(await pref(), null, 'atajos: T vuelve a automático');
      await p.keyboard.press('Control+t');
      await p.keyboard.press('u');
      eq((await p.textContent('#s-unidad')).trim(), 'BTC', 'atajos: U cambia la unidad del saldo');
      await p.keyboard.press('u'); await p.keyboard.press('u');
      await p.keyboard.press('/');
      eq(await html(() => document.activeElement?.id), 'l-buscar', 'atajos: / lleva al buscador de la lista');
      await p.keyboard.type('a');
      ok(await html(() => document.getElementById('hoja').hidden), 'atajos: dentro de un campo las letras no disparan nada');
      await p.fill('#l-buscar', '');
      await p.evaluate(() => document.activeElement?.blur());
      await p.keyboard.press('a');
      await p.waitForSelector('#hoja:not([hidden])', { timeout: 2000 });
      ok(true, 'atajos: A abre la hoja de anotar');
      await p.keyboard.press('t');
      eq(await pref(), null, 'atajos: con la hoja abierta no cambian nada');
      await p.keyboard.press('Escape');
      await p.waitForTimeout(500);
      await p.click('#cuenta-btn');
      ok((await p.textContent('#dc-atajos-lista')).includes('anotar'), 'atajos: la lista está en «Tu cuenta»');
      await p.click('#dc-atajos');
      await p.keyboard.press('Escape');
      await p.waitForTimeout(400);
      await p.keyboard.press('a');
      await p.waitForTimeout(400);
      ok(await html(() => document.getElementById('hoja').hidden), 'atajos: apagados en «Tu cuenta» no hacen nada');
      await p.click('#cuenta-btn'); await p.click('#dc-atajos');

      // Letra grande: normal → grande → muy grande → normal
      const letra = () => html(() => [document.documentElement.dataset.letra ?? '', getComputedStyle(document.documentElement).fontSize, getComputedStyle(document.documentElement).getPropertyValue('--toque')]);
      eq(await letra(), ['', '16px', '48px'], 'letra: normal y zonas de toque de 48 px');
      await p.click('#dc-letra');
      eq(await letra(), ['grande', '18px', '52px'], 'letra: grande (112 %) con zonas de 52 px');
      ok((await p.textContent('#dc-letra')).includes('grande'), 'letra: la etiqueta lo dice');
      await p.click('#dc-letra');
      eq(await letra(), ['muy-grande', '20px', '56px'], 'letra: muy grande (125 %) con zonas de 56 px');
      eq(await html(() => localStorage.getItem('libro.letra')), 'muy-grande', 'letra: se recuerda en el dispositivo');
      await p.click('#dc-letra');
      eq(await letra(), ['', '16px', '48px'], 'letra: vuelve a normal');
      ok(await html(() => localStorage.getItem('libro.letra') === null), 'letra: normal borra la preferencia');

      // Alto contraste: automático → alto → normal → automático
      const contraste = () => html(() => [document.documentElement.dataset.contraste ?? '', getComputedStyle(document.documentElement).getPropertyValue('--txt2').trim()]);
      eq((await contraste())[0], '', 'contraste: automático sin pedido del sistema = normal');
      await p.click('#dc-contraste');
      const alto = await contraste();
      ok(alto[0] === 'alto' && (alto[1] === '#e3e8f1' || alto[1] === '#2b251d'), `contraste: alto refuerza los colores de texto (${alto})`);
      await p.click('#dc-contraste');
      eq((await contraste())[0], '', 'contraste: «normal» lo apaga aunque el sistema lo pida');
      await p.click('#dc-contraste');
      ok((await p.textContent('#dc-contraste')).includes('automático'), 'contraste: vuelve a automático');
      await p.keyboard.press('Escape');

      // Montaña: descripción para lectores con dónde estás, campamentos y cumbre
      const desc = await html(() => document.getElementById('m-desc').textContent);
      ok(/Estás a [\d,]+ sats de altitud/.test(desc) && /(Ya pasaste \d+ de \d+ campamentos|Aún no llegas)/.test(desc) && desc.includes('Siguiente meta') && desc.includes('La cumbre es'), `montaña: descripción completa («${desc}»)`);
      eq(consola, [], `consola limpia (accesibilidad): ${consola.join(' | ')}`);
      await ctx.close();

      // El sistema pide más contraste: la app lo sigue sola
      const sis = await entrar(navegador, srv, ADMIN, { hora: 12, contrast: 'more' });
      eq(await sis.p.evaluate(() => document.documentElement.dataset.contraste), 'alto', 'contraste: sigue a `prefers-contrast: more` del sistema');
      await sis.p.click('#cuenta-btn');
      ok((await sis.p.textContent('#dc-contraste')).includes('como pide el sistema'), 'contraste: la etiqueta explica por qué');
      await sis.ctx.close();

      // Orden de tabulación y foco: de arriba abajo, siempre visible, con indicador y sin quedar bajo la mini-cabecera
      const tab = await entrar(navegador, srv, ADMIN, { hora: 12 });
      const pasos = [];
      for (let i = 0; i < 70; i++) {
        await tab.p.keyboard.press('Tab');
        const paso = await tab.p.evaluate(() => {
          const el = document.activeElement;
          if (!el || el === document.body) return null;
          const r = el.getBoundingClientRect();
          const cs = getComputedStyle(el);
          const mc = document.getElementById('minicab');
          const bajoMini = mc && getComputedStyle(mc).visibility === 'visible' && r.top < mc.getBoundingClientRect().bottom - 1 && r.bottom > mc.getBoundingClientRect().top;
          return { id: el.id || el.className || el.tagName, y: Math.round(r.top + scrollY), h: Math.round(r.height), indicador: (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0) || cs.boxShadow !== 'none', bajoMini: !!bajoMini, cerca: el.closest('dialog,.hoja') !== null, fijo: cs.position === 'fixed' || el.closest('.anotar') !== null };
        });
        if (paso?.id === 'saltar' && pasos.length) break; // dio la vuelta completa
        pasos.push(paso);
      }
      const hechos = pasos.filter(Boolean);
      ok(hechos.length > 30, `foco: se recorren ${hechos.length} elementos con Tab`);
      eq(hechos.filter((x) => x.h <= 0).map((x) => x.id), [], 'foco: todo lo que recibe el foco se ve');
      eq(hechos.filter((x) => !x.indicador).map((x) => x.id), [], 'foco: todo lo enfocado muestra su indicador');
      eq(hechos.filter((x) => x.bajoMini).map((x) => x.id), [], 'foco: nada queda debajo de la mini-cabecera');
      const fluyen = hechos.filter((x) => !x.fijo); // el botón «Anotar» flota fijo abajo: no cuenta como posición en la página
      const desorden = fluyen.slice(1).map((x, i) => [fluyen[i], x]).filter(([a, b]) => b.y < a.y - 8 && !a.cerca && !b.cerca).map(([a, b]) => `${a.id}(${a.y}) → ${b.id}(${b.y})`);
      eq(desorden, [], 'foco: el orden de tabulación sigue el orden visual, de arriba abajo');
      await tab.ctx.close();
    } finally {
      srv.parar();
    }
  }

  // ---------------------------------------------------------------- la montaña viva: humo, fogata, huellas, linterna y nieve que crece
  {
    const medir = (p) => p.evaluate(() => {
      const vis = (el) => getComputedStyle(el).display;
      const camp = [...document.querySelectorAll('.campo')];
      return {
        nieveAlto: document.querySelector('.nieve').getBBox().height,
        alcanzados: camp.filter((c) => c.classList.contains('alcanzado')).length,
        siguientes: camp.filter((c) => c.classList.contains('sig')).length,
        humoVisible: camp.filter((c) => vis(c.querySelector('.humo')) !== 'none').length,
        humoEnAlcanzados: camp.filter((c) => c.classList.contains('alcanzado')).every((c) => vis(c.querySelector('.humo')) !== 'none'),
        fogataVisible: camp.filter((c) => vis(c.querySelector('.fogata')) !== 'none').map((c) => c.classList.contains('sig')),
        huellas: document.querySelectorAll('#m-huellas circle').length,
        largo: document.getElementById('m-sendero').getTotalLength(),
        linterna: getComputedStyle(document.querySelector('.linterna')).opacity,
        huellasDisplay: vis(document.getElementById('m-huellas')),
        linternaDisplay: vis(document.querySelector('.linterna')),
      };
    });
    const alturas = {};
    for (const esc of ['hoy', 'anio', 'ballena']) {
      const srv = await servidor(esc);
      try {
        const { ctx, p, consola } = await entrar(navegador, srv, ADMIN, { hora: 22 }, () => { try { localStorage.setItem('libro.efectos', 'todos'); } catch { /* sin almacenamiento */ } });
        const m = await medir(p);
        alturas[esc] = m.nieveAlto;
        if (esc === 'anio') {
          ok(m.alcanzados >= 1 && m.siguientes === 1, `montaña: hay campamentos alcanzados (${m.alcanzados}) y uno solo es el siguiente`);
          ok(m.humoEnAlcanzados && m.humoVisible === m.alcanzados, 'montaña: el humo sale solo en los campamentos alcanzados');
          eq(m.fogataVisible, [true], 'montaña: la fogata está solo en el siguiente campamento');
          ok(m.huellas > 5 && m.huellas <= Math.ceil(m.largo / 10), `montaña: huellas a lo largo del tramo recorrido (${m.huellas})`);
          eq(m.linterna, '0.5', 'montaña: de noche «Tú» lleva su linterna');
        }
        eq(consola, [], `consola limpia (montaña viva ${esc}): ${consola.join(' | ')}`);
        await ctx.close();
      } finally {
        srv.parar();
      }
    }
    ok(alturas.hoy < alturas.anio && alturas.anio < alturas.ballena, `montaña: la nieve crece con tu avance (${Math.round(alturas.hoy)} < ${Math.round(alturas.anio)} < ${Math.round(alturas.ballena)})`);
    const srv = await servidor('anio');
    try {
      // De día no hay linterna; con efectos «esenciales» los adornos de ambiente desaparecen, pero la nieve (que son datos) sigue.
      let r = await entrar(navegador, srv, ADMIN, { hora: 12 }, () => { try { localStorage.setItem('libro.efectos', 'todos'); } catch { /* sin almacenamiento */ } });
      eq((await medir(r.p)).linterna, '0', 'montaña: de día no hay linterna');
      await r.ctx.close();
      r = await entrar(navegador, srv, ADMIN, { hora: 22 }, () => { try { localStorage.setItem('libro.efectos', 'esenciales'); } catch { /* sin almacenamiento */ } });
      const m = await medir(r.p);
      eq([m.humoVisible, m.fogataVisible.length, m.huellasDisplay, m.linternaDisplay], [0, 0, 'none', 'none'], 'montaña: con efectos esenciales no hay humo, fogata, huellas ni linterna');
      ok(m.nieveAlto > 0, 'montaña: la nieve sigue (es parte de los datos)');
      // Al subir de altitud, aparecen más huellas y la nieve crece
      await r.ctx.close();
      r = await entrar(navegador, srv, ADMIN, { hora: 22 }, () => { try { localStorage.setItem('libro.efectos', 'todos'); } catch { /* sin almacenamiento */ } });
      const antes = await medir(r.p);
      await r.p.evaluate(async () => { await fetch('/api/compras', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Libro': '1' }, body: JSON.stringify({ fecha: new Date().toISOString().slice(0, 10), monto: 3000, sats: 4_000_000, tipo: 'compra' }) }); document.dispatchEvent(new Event('visibilitychange')); });
      await r.p.waitForTimeout(4000);
      const despues = await medir(r.p);
      ok(despues.huellas > antes.huellas && despues.nieveAlto > antes.nieveAlto, `montaña: al subir aparecen más huellas (${antes.huellas} → ${despues.huellas}) y más nieve`);
      await r.ctx.close();
    } finally {
      srv.parar();
    }
  }

  // ---------------------------------------------------------------- banderas con historia, iconos por etapa y bosque (campamento 5, 2/3)
  {
    const srv = await servidor('anio');
    try {
      const { ctx, p, consola } = await entrar(navegador, srv, ADMIN, { hora: 22 }, () => { try { localStorage.setItem('libro.efectos', 'todos'); } catch { /* sin almacenamiento */ } });
      const compras = await datos(p, '/api/compras');
      const nCompras = compras.filter((c) => c.tipo !== 'venta').length;
      const info = await p.evaluate(() => {
        const bs = [...document.querySelectorAll('.m-bandera')];
        return {
          n: bs.length, campos: document.querySelectorAll('.campo').length,
          tam: bs.map((b) => { const r = b.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; }),
          nombres: bs.map((b) => b.getAttribute('aria-label')),
          dentroDelSvg: document.querySelectorAll('#montana svg button, #montana svg [tabindex]').length,
          iconos: [...document.querySelectorAll('.campo')].map((c) => [...c.querySelectorAll('.campo-ico')].map((e) => e.outerHTML).join('')),
          pinos: document.querySelectorAll('#m-bosque path').length,
          desc: document.getElementById('m-desc').textContent,
        };
      });
      ok(info.n === info.campos && info.n >= 2, `banderas: un botón por campamento (${info.n})`);
      ok(info.tam.every(([w, h]) => w >= 47.5 && h >= 47.5), `banderas: zonas de toque de 48 px (${JSON.stringify(info.tam)})`);
      ok(info.nombres.every((t) => /^(Campamento|Cumbre) .+\. (Lo alcanzaste|Ya lo pasaste|Te faltan)/.test(t)), `banderas: cada botón dice su campamento («${info.nombres[0]}»)`);
      eq(info.dentroDelSvg, 0, 'banderas: ningún control dentro del SVG (es una imagen)');
      eq(new Set(info.iconos).size, info.campos, 'iconos: cada campamento tiene su propio dibujo');
      eq(info.pinos, Math.ceil(nCompras / Math.ceil(nCompras / 60)), `bosque: un pino por compra (${info.pinos} de ${nCompras})`);
      ok(info.desc.includes(`un pino por compra (${nCompras})`), 'bosque: la descripción de la montaña lo menciona');
      // Abrir con el ratón y cerrar con «Cerrar» (el foco vuelve a la bandera)
      await p.click('.m-bandera >> nth=-1');
      let t = await p.evaluate(() => { const c = document.getElementById('m-tarjeta'); return { visible: !c.hidden && getComputedStyle(c).display !== 'none', rol: c.getAttribute('role'), txt: c.innerText, exp: document.querySelector('.m-bandera:last-of-type').getAttribute('aria-expanded'), dentro: (() => { const r = c.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && r.top >= 0; })() }; });
      ok(t.visible && t.rol === 'group' && /Lo alcanzaste el \d+ \w+ \d{4}/.test(t.txt) && t.exp === 'true' && t.dentro, `bandera: la tarjeta dice cuándo la alcanzaste («${t.txt.replace(/\n+/g, ' · ')}»)`);
      const x = await p.evaluate(() => { const b = document.querySelector('#m-tarjeta .m-tarjeta-x'); return [b.offsetWidth, b.offsetHeight]; }); // sin transformaciones: la tarjeta entra con un ligero zoom
      ok(x[0] >= 47.5 && x[1] >= 47.5, `bandera: «Cerrar» de 48 px (${x})`);
      await p.click('#m-tarjeta .m-tarjeta-x');
      eq(await p.evaluate(() => [document.getElementById('m-tarjeta').hidden, document.activeElement?.classList.contains('m-bandera')]), [true, true], 'bandera: Cerrar la oculta y devuelve el foco a la bandera');
      // Los botones van de arriba abajo (la cumbre primero, como en el orden visual). Teclado: Enter abre, Esc cierra; tocar otro sitio también cierra
      await p.focus('.m-bandera >> nth=-1');
      await p.keyboard.press('Enter');
      eq(await p.evaluate(() => document.getElementById('m-tarjeta').hidden), false, 'bandera: Enter abre la tarjeta');
      await p.keyboard.press('Escape');
      eq(await p.evaluate(() => document.getElementById('m-tarjeta').hidden), true, 'bandera: Esc la cierra');
      // Una bandera futura dice cuánto falta
      await p.click('.m-bandera >> nth=0');
      ok(/Te faltan [\d,]+ sats/.test(await p.innerText('#m-tarjeta')), 'bandera: la meta futura dice cuánto falta');
      await p.mouse.click(5, 5);
      eq(await p.evaluate(() => document.getElementById('m-tarjeta').hidden), true, 'bandera: tocar en otro sitio la cierra');
      eq(consola, [], `consola limpia (banderas): ${consola.join(' | ')}`);
      // El pino nuevo: una compra de esta sesión planta el último con una animación; la entrada no tiene bosque
      await p.waitForTimeout(6000);
      await p.click('#anotar');
      await p.fill('#h-sats', '25000');
      await p.click('#guardar');
      await p.waitForFunction((n) => document.querySelectorAll('#m-bosque path').length === Math.ceil((n + 1) / Math.ceil((n + 1) / 60)), nCompras, { timeout: 8000 });
      eq(await p.locator('#m-bosque .pino-nuevo').count(), 1, 'bosque: la compra nueva planta un pino con animación');
      await ctx.close();
    } finally {
      srv.parar();
    }
    const lector = await servidor('mil');
    try {
      const { ctx, p } = await entrar(navegador, lector, ADMIN, { hora: 12 });
      const pinos = await p.evaluate(() => document.querySelectorAll('#m-bosque path').length);
      ok(pinos > 20 && pinos <= 60, `bosque: con mil compras se agrupa (${pinos} pinos, máximo 60)`);
      await ctx.close();
    } finally {
      lector.parar();
    }
    const entrada = await servidor('hoy');
    try {
      const ctx = await navegador.newContext();
      const p = await ctx.newPage();
      await p.goto(`${entrada.url}/login`, { waitUntil: 'networkidle' });
      eq(await p.evaluate(() => [document.querySelectorAll('.m-bandera').length, document.querySelectorAll('#m-bosque').length]), [0, 0], 'la entrada no tiene banderas tocables ni bosque (sin dato personal)');
      await ctx.close();
    } finally {
      entrada.parar();
    }
  }

  // ---------------------------------------------------------------- aurora, lago, acento dorado, cometa y 1 BTC (campamento 5, 3/3)
  {
    const todos = () => { try { localStorage.setItem('libro.efectos', 'todos'); } catch { /* sin almacenamiento */ } };
    const medir = (p) => p.evaluate(() => {
      const vis = (el) => !!el && getComputedStyle(el).display !== 'none';
      const caja = (sel) => { const e = document.querySelector(sel); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; };
      const lum = (c) => { const [r, g, b] = c.match(/[\d.]+/g).slice(0, 3).map(Number).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
      const raiz = getComputedStyle(document.documentElement);
      const tmp = document.createElement('i'); document.body.append(tmp);
      const color = (v) => { tmp.style.color = raiz.getPropertyValue(v); return getComputedStyle(tmp).color; };
      const a = lum(color('--naranja-txt')), f = lum(color('--s1'));
      tmp.remove();
      return {
        cintas: document.querySelectorAll('.aurora-cinta').length,
        auroraVisible: vis(document.querySelector('.aurora')),
        lago: caja('.lago-agua'), reflejoVisible: vis(document.querySelector('.lago-luna')),
        ilum: Number(getComputedStyle(document.getElementById('montana')).getPropertyValue('--luna-ilum')),
        sendero: caja('#m-sendero'), etiquetas: [...document.querySelectorAll('#m-etiquetas text')].map((e) => { const r = e.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; }),
        acento: document.documentElement.dataset.acento, naranja: raiz.getPropertyValue('--naranja').trim(),
        contraste: (Math.max(a, f) + 0.05) / (Math.min(a, f) + 0.05), svg: caja('#montana svg'),
      };
    });
    const cruza = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
    const srv = await servidor('anio');
    try {
      let r = await entrar(navegador, srv, ADMIN, { hora: 22 }, todos);
      let m = await medir(r.p);
      ok(m.cintas === 3 && m.auroraVisible, `aurora: con racha larga y de noche se ve (${m.cintas} cintas)`);
      ok(m.lago && m.lago.w > 40 && m.reflejoVisible && m.ilum >= 0 && m.ilum <= 1, `lago: de noche refleja la luna (iluminación ${m.ilum})`);
      ok(m.lago.x >= m.svg.x && m.lago.x + m.lago.w <= m.svg.x + m.svg.w && m.lago.y + m.lago.h <= m.svg.y + m.svg.h, 'lago: cabe dentro de la escena');
      ok(m.etiquetas.every((t) => !cruza(t, m.lago)), 'lago: no tapa ninguna etiqueta de la montaña');
      eq(m.acento, 'naranja', 'acento: por debajo de 1 BTC sigue el naranja');
      await r.ctx.close();
      r = await entrar(navegador, srv, ADMIN, { hora: 12 }, todos);
      m = await medir(r.p);
      ok(!m.auroraVisible && !m.reflejoVisible && m.lago, 'aurora y reflejo de luna: solo de noche (el lago sigue de día)');
      await r.ctx.close();
      r = await entrar(navegador, srv, ADMIN, { hora: 22 }, () => { try { localStorage.setItem('libro.efectos', 'esenciales'); } catch { /* sin almacenamiento */ } });
      m = await medir(r.p);
      ok(!m.auroraVisible && m.lago, 'aurora: con efectos esenciales desaparece (es ambiente); el lago se queda');
      await r.ctx.close();
      // La vista previa de la celebración de 1 BTC: aurora por todo el cielo, lluvia de luz, tarjeta propia y, al final, acento dorado
      r = await entrar(navegador, srv, ADMIN, { hora: 22 }, todos);
      await r.p.click('#cuenta-btn');
      await r.p.click('[data-previa="epico"]');
      await r.p.waitForSelector('.aurora-epica', { timeout: 6000 });
      const ep = await r.p.evaluate(() => ({ bandas: document.querySelectorAll('.aurora-epica').length, gotas: document.querySelectorAll('.luz-gota').length, cometa: document.querySelectorAll('.cometa').length }));
      ok(ep.bandas === 3 && ep.gotas === 34 && ep.cometa === 1, `1 BTC: aurora (${ep.bandas}), lluvia de luz (${ep.gotas}) y cometa (${ep.cometa})`);
      ok(/Llegaste a la cumbre/.test(await r.p.innerText('#hito-cel')) && /1 BTC/.test(await r.p.innerText('#hito-cel')), '1 BTC: su tarjeta propia');
      eq(await r.p.evaluate(() => document.documentElement.dataset.acento), 'naranja', '1 BTC: el acento dorado espera a que acabe la celebración');
      await r.p.waitForFunction(() => document.documentElement.dataset.acento === 'oro', null, { timeout: 8000 });
      m = await medir(r.p);
      eq(m.naranja, '#f0b429', 'acento: tras llegar a 1 BTC es dorado');
      ok(m.contraste >= 4.5, `acento dorado: el texto de acento sobre las tarjetas llega a 4.5:1 (${m.contraste.toFixed(1)})`);
      await r.p.waitForFunction(() => document.documentElement.dataset.acento === 'naranja', null, { timeout: 12000 }); // la vista previa devuelve el estado real
      eq(await r.p.evaluate(() => document.querySelectorAll('.aurora-epica, .luz-gota').length), 0, '1 BTC: los efectos se retiran solos');
      await r.ctx.close();
      // El cometa: al cruzar una etapa
      r = await entrar(navegador, srv, ADMIN, { hora: 22 }, todos);
      await r.p.click('#cuenta-btn');
      await r.p.click('[data-previa="etapa"]');
      await r.p.waitForSelector('.cometa', { timeout: 6000 });
      ok(await r.p.evaluate(() => !!document.querySelector('.cometa .cometa-cola') && document.querySelectorAll('.aurora-epica').length === 0), 'cometa: una etapa lo lanza (y no la celebración de 1 BTC)');
      await r.ctx.close();
    } finally {
      srv.parar();
    }
    const bal = await servidor('ballena');
    try {
      for (const tema of ['oscuro', 'claro']) {
        const r = await entrar(navegador, bal, ADMIN, { hora: 22 }, [(t) => { try { localStorage.setItem('libro.tema', t); } catch { /* sin almacenamiento */ } }, tema]);
        await r.p.waitForTimeout(800);
        const m = await medir(r.p);
        eq(m.acento, 'oro', `acento: con más de 1 BTC es dorado (${tema})`);
        ok(m.contraste >= 4.5, `acento dorado (${tema}): texto de acento a ${m.contraste.toFixed(1)}:1 sobre las tarjetas`);
        await r.ctx.close();
      }
    } finally {
      bal.parar();
    }
    const hoy = await servidor('hoy');
    try {
      const r = await entrar(navegador, hoy, ADMIN, { hora: 22 }, todos);
      const m = await medir(r.p);
      ok(m.cintas === 0 && !m.auroraVisible, 'aurora: sin racha larga no hay aurora');
      await r.ctx.close();
      const ctx = await navegador.newContext();
      const p = await ctx.newPage();
      await p.goto(`${hoy.url}/login`, { waitUntil: 'networkidle' });
      eq(await p.evaluate(() => [document.querySelectorAll('.aurora-cinta').length, !!document.querySelector('.lago-agua'), document.documentElement.dataset.acento ?? null]), [0, true, null], 'la entrada: lago sí, sin aurora ni acento dorado (sin dato personal)');
      await ctx.close();
    } finally {
      hoy.parar();
    }
  }

  // ---------------------------------------------------------------- identidad: iconos, avatares, estados vacíos y entrada viva (campamento 6, 1/3)
  {
    const srv = await servidor('mil');
    try {
      const { ctx, p, consola } = await entrar(navegador, srv, ADMIN, { hora: 22 });
      // Una compra con TXID (en el escenario no hay ninguna) para ver «Copiar TXID» y el enlace a mempool.space
      await p.evaluate(async () => { await fetch('/api/compras', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Libro': '1' }, body: JSON.stringify({ fecha: new Date().toISOString().slice(0, 10), monto: 10, sats: 12000, tipo: 'compra', txid: 'cd'.repeat(32) }) }); });
      await p.reload({ waitUntil: 'networkidle' });
      await p.waitForTimeout(2500);
      // Las últimas 8 filas no traen de todo: se filtra por cada tipo para ver sus iconos
      const contar = async (f, sel) => { await p.click(`#l-chips button[data-f="${f}"]`); await p.waitForTimeout(300); return p.locator(`#lista ${sel}`).count(); };
      const nTras = await contar('traslado', '.f-sats .ico'), nExtra = await contar('extra', '.f-extra .ico'), nTx = await contar('txid', '.f-copiar .ico');
      const nExt = await p.locator('#lista .f-tx .ico').count(); // (queda filtrado por «Con TXID»)
      await p.click('#l-chips button[data-f="todos"]');
      const info = await p.evaluate(() => ({
        simbolos: ['traslado', 'externo', 'rayo', 'copiar', 'campana', 'lapiz', 'sube', 'baja'].map((n) => !!document.getElementById(`i-${n}`)),
        texto: document.getElementById('lista').innerText,
        avatarBtn: document.querySelector('#cuenta-btn .avatar')?.textContent,
        tonoBtn: [...(document.querySelector('#cuenta-btn .avatar')?.classList ?? [])].find((c) => /^av-\d+$/.test(c)),
        iconoAvisos: !!document.querySelector('#dc-avisos-btn .ico'),
      }));
      ok(info.simbolos.every(Boolean), 'iconos: el sprite trae todos los símbolos');
      ok(nTras > 0 && nExtra > 0 && nTx > 0 && nExt > 0, `iconos: traslados (${nTras}), compras extra (${nExtra}), copiar TXID (${nTx}) y enlace externo (${nExt}) llevan su icono`);
      ok(!/[⇄↗▲▼]/.test(info.texto), 'iconos: ya no quedan caracteres sueltos (⇄ ↗ ▲ ▼) en la lista');
      eq([info.avatarBtn, info.iconoAvisos], ['D', true], 'avatar: el botón de la cuenta lleva la inicial; el botón de avisos, su icono');
      // Cada símbolo se dibuja de verdad (el <use> resuelve): tiene caja
      ok(await p.evaluate(() => [...document.querySelectorAll('#lista .ico')].slice(0, 5).every((e) => { const r = e.getBoundingClientRect(); return r.width > 8 && r.height > 8; })), 'iconos: se dibujan con tamaño');
      // Historial: avatar por persona (el mismo nombre, siempre el mismo tono) y neutro para el servidor
      await p.click('#cuenta-btn');
      await p.waitForTimeout(500);
      const quien = await p.evaluate(() => ({ grande: !!document.querySelector('#dc-quien .avatar.grande'), txt: document.getElementById('dc-quien').innerText }));
      ok(quien.grande && /Daf3r · administrador/.test(quien.txt), `avatar: «Tu cuenta» lleva el suyo («${quien.txt.replace(/\s+/g, ' ')}»)`);
      await p.click('#dc-historial');
      await p.waitForSelector('#hist-lista li .avatar', { timeout: 5000 });
      const hist = await p.evaluate(() => [...document.querySelectorAll('#hist-lista li')].map((li) => ({ quien: li.querySelector('b')?.textContent, av: li.querySelector('.avatar')?.textContent, cls: [...(li.querySelector('.avatar')?.classList ?? [])].join(' ') })));
      const porNombre = new Map();
      for (const h of hist) porNombre.set(h.quien, new Set([...(porNombre.get(h.quien) ?? []), h.cls]));
      ok(hist.length > 0 && hist.every((h) => h.av && h.av === h.quien[0].toUpperCase()) && [...porNombre.values()].every((v) => v.size === 1), `avatar: el Historial muestra la inicial de cada persona y su tono no cambia (${hist.length} filas)`);
      eq(await p.evaluate(() => { const l = document.querySelector('#hist-lista li'); const a = l.querySelector('.avatar').getBoundingClientRect(), t = l.querySelector('time').getBoundingClientRect(); return a.right <= t.left + 1; }), true, 'avatar: queda a la izquierda del texto, sin taparlo');
      // Color del avatar con contraste suficiente para la inicial blanca
      const c = await p.evaluate(() => { const e = document.querySelector('#hist-lista .avatar'); const cs = getComputedStyle(e); return [cs.backgroundColor, cs.color]; });
      eq(consola, [], `consola limpia (identidad): ${consola.join(' | ')}`);
      void c;
      await ctx.close();
    } finally {
      srv.parar();
    }
    // Estados vacíos con dibujo: sin compras y sin histórico
    const vac = await servidor('vacio');
    try {
      const { ctx, p } = await entrar(navegador, vac, ADMIN, { hora: 22 });
      const r = await p.evaluate(() => { const i = document.querySelector('#lista .vacio.con-ilu .ilu'); const b = i?.getBoundingClientRect(); return { hay: !!i, w: b && Math.round(b.width), txt: document.querySelector('#lista .vacio')?.innerText }; });
      ok(r.hay && r.w === 64 && /Aún no hay compras/.test(r.txt), `estado vacío: la lista sin compras lleva su dibujo (${r.w}px)`);
      await ctx.close();
    } finally {
      vac.parar();
    }
    const sh = await servidor('sinhist');
    try {
      const { ctx, p } = await entrar(navegador, sh, ADMIN, { hora: 22 });
      await p.waitForSelector('#lienzo .g-vacio .ilu', { state: 'attached', timeout: 8000 });
      const r = await p.evaluate(() => { const i = document.querySelector('#lienzo .g-vacio .ilu'); const b = i?.getBoundingClientRect(); return { hay: !!i, w: b && Math.round(b.width), h: b && Math.round(b.height), sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }; });
      ok(r.hay && r.w === 64 && r.h === 64 && r.sw <= r.cw, `estado vacío: el gráfico sin histórico lleva su dibujo de 64 px y no ensancha la página (${r.w}×${r.h})`);
      await ctx.close();
    } finally {
      sh.parar();
    }
    // Entrada que reacciona: el campo enfocado marca <html> y la montaña responde
    const ent = await servidor('hoy');
    try {
      const ctx = await navegador.newContext({ ...devices['iPhone 13'] });
      const p = await ctx.newPage();
      await p.addInitScript(() => { try { localStorage.setItem('libro.hora', '22'); localStorage.setItem('libro.efectos', 'todos'); } catch { /* sin almacenamiento */ } });
      const consola = [];
      p.on('console', (m) => ['error', 'warning'].includes(m.type()) && consola.push(m.text()));
      await p.goto(`${ent.url}/login`, { waitUntil: 'networkidle' });
      const estado = () => p.evaluate(() => ({ marca: document.documentElement.dataset.entrada ?? '', halo: new DOMMatrix(getComputedStyle(document.querySelector('.luna .halo')).transform).a, banderin: getComputedStyle(document.querySelector('.campo .banderin')).fill }));
      const reposo = await estado();
      await p.focus('#l-usuario');
      await p.waitForFunction(() => new DOMMatrix(getComputedStyle(document.querySelector('.luna .halo')).transform).a > 1.2, null, { timeout: 4000 });
      const u = await estado();
      ok(u.marca === 'usuario' && u.halo > reposo.halo, `entrada: al enfocar el usuario la luna se agranda (${reposo.halo.toFixed(2)} → ${u.halo.toFixed(2)})`);
      await p.focus('#l-clave');
      // La bandera de la cumbre ya no es blanca en reposo (pulido visual: ámbar, para leerse de día): se espera a que cambie de su color de reposo.
      await p.waitForFunction((antes) => getComputedStyle(document.querySelector('.campo .banderin')).fill !== antes && document.documentElement.dataset.entrada === 'clave', reposo.banderin, { timeout: 4000 });
      const c = await estado();
      ok(c.marca === 'clave' && c.banderin !== reposo.banderin, `entrada: al enfocar la contraseña la bandera de la cumbre se alza (${reposo.banderin} → ${c.banderin})`);
      await p.evaluate(() => document.activeElement.blur());
      await p.waitForFunction(() => !document.documentElement.dataset.entrada, null, { timeout: 4000 });
      ok(true, 'entrada: al salir del formulario todo vuelve a su sitio');
      eq(consola, [], `consola limpia (entrada viva): ${consola.join(' | ')}`);
      await ctx.close();
    } finally {
      ent.parar();
    }
  }

  // ---------------------------------------------------------------- la montaña sigue a la caja (también en alto) y el índice lateral se lee
  {
    const srv = await servidor('anio');
    try {
      const ctx = await navegador.newContext({ viewport: { width: 1983, height: 967 } });
      const p = await ctx.newPage();
      await p.addInitScript(() => { try { localStorage.setItem('libro.hora', '12'); localStorage.setItem('libro.avisos.preguntado', '1'); } catch { /* sin almacenamiento */ } });
      await p.goto(`${srv.url}/login`, { waitUntil: 'networkidle' });
      await p.fill('input[autocomplete="username"]', ADMIN[0]);
      await p.fill('input[autocomplete="current-password"]', ADMIN[1]);
      await Promise.all([p.waitForURL('**/'), p.click('button[type=submit], .guardar')]);
      await p.waitForTimeout(2800);
      const medir = () => p.evaluate(() => ({ caja: Math.round(document.getElementById('montana').getBoundingClientRect().height), vb: Number(document.querySelector('#montana > svg').getAttribute('viewBox').split(' ')[3]) }));
      const antes = await medir();
      ok(Math.abs(antes.caja - antes.vb) <= 2, `montaña: el dibujo mide lo que la caja al cargar (${antes.vb} / ${antes.caja})`);
      // Cambia solo el alto de la ventana (una barra del navegador, las herramientas de desarrollo…): el dibujo se rehace
      for (const alto of [760, 1100]) {
        await p.setViewportSize({ width: 1983, height: alto });
        await p.waitForFunction(() => { const c = document.getElementById('montana').getBoundingClientRect().height; return Math.abs(Number(document.querySelector('#montana > svg').getAttribute('viewBox').split(' ')[3]) - c) <= 2; }, null, { timeout: 4000 });
        const m = await medir();
        ok(Math.abs(m.caja - m.vb) <= 2 && m.caja !== antes.caja, `montaña: al cambiar solo el alto de la ventana a ${alto} px se redibuja (${m.vb} / ${m.caja})`);
      }
      // Índice lateral: con fondo propio, legible y con su nombre de transición
      for (const tema of ['oscuro', 'claro']) {
        await p.evaluate((t) => window.libroTema.fijar(t), tema);
        await p.waitForTimeout(600);
        const ind = await p.evaluate(() => {
          const el = document.getElementById('indice'), cs = getComputedStyle(el);
          const lum = (c) => { const [r, g, b] = c.match(/[\d.]+/g).slice(0, 3).map(Number).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
          const tmp = document.createElement('i'); document.body.append(tmp);
          const fondo = (() => { tmp.style.color = getComputedStyle(document.documentElement).getPropertyValue('--s1'); return getComputedStyle(tmp).color; })();
          tmp.remove();
          const a = lum(getComputedStyle(el.querySelector('a:not([hidden])')).color), f = lum(fondo);
          return { visible: cs.display !== 'none', vt: cs.viewTransitionName, alfa: Number((/\/\s*([\d.]+)\)/.exec(cs.backgroundColor) ?? [0, 1])[1]), contraste: (Math.max(a, f) + 0.05) / (Math.min(a, f) + 0.05) };
        });
        ok(ind.visible && ind.vt === 'indice' && ind.alfa >= 0.85 && ind.contraste >= 4.5, `índice lateral (${tema}): visible, con fondo propio (${ind.alfa}) y letra a ${ind.contraste.toFixed(1)}:1 sobre él`);
      }
      await ctx.close();
      // La entrada también sigue a su caja
      const ctxL = await navegador.newContext({ viewport: { width: 1280, height: 900 } });
      const pl = await ctxL.newPage();
      await pl.goto(`${srv.url}/login`, { waitUntil: 'networkidle' });
      const h0 = await pl.evaluate(() => Number(document.querySelector('#montana > svg').getAttribute('viewBox').split(' ')[3]));
      await pl.setViewportSize({ width: 1280, height: 700 });
      await pl.waitForFunction((h) => Number(document.querySelector('#montana > svg').getAttribute('viewBox').split(' ')[3]) !== h, h0, { timeout: 4000 });
      ok(true, 'entrada: la montaña también se redibuja si cambia solo el alto');
      await ctxL.close();
    } finally {
      srv.parar();
    }
  }

  // ---------------------------------------------------------------- Tu historia, medallas y qué hay de nuevo (campamento 6, 2/3)
  {
    const srv = await servidor('anio');
    try {
      const { ctx, p, consola } = await entrar(navegador, srv, ADMIN, { hora: 22 }, () => { try { localStorage.setItem('libro.avisos.preguntado', '1'); } catch { /* sin almacenamiento */ } });
      // Una cuenta nueva no ve «Qué hay de nuevo» (no ha visto nada que haya cambiado): se marca sin avisar
      ok(!(await p.locator('#d-cambios[open]').count()), 'qué hay de nuevo: una cuenta nueva no ve el aviso');
      await p.waitForFunction(() => fetch('/api/yo').then((r) => r.json()).then((j) => /^2026-/.test(j.cambios ?? '')), null, { timeout: 5000 });
      ok(true, 'qué hay de nuevo: y queda marcado como visto en silencio');
      await p.click('#cuenta-btn');
      await p.click('#dc-historia-btn');
      await p.waitForSelector('#dc-historia:not([hidden])');
      const h = await p.evaluate(() => ({
        medallas: document.querySelectorAll('#dh-medallas .medalla').length,
        ganadas: document.querySelectorAll('#dh-medallas .medalla.ganada').length,
        bloq: document.querySelectorAll('#dh-medallas .medalla.bloq').length,
        eventos: [...document.querySelectorAll('#dh-linea .h-ev')].map((li) => ({ c: li.className, t: li.querySelector('time').dateTime })),
        primera: document.querySelector('#dh-linea .h-primera strong')?.textContent,
        hoy: document.querySelector('#dh-linea li:last-child strong')?.textContent,
        desborda: document.getElementById('d-cuenta').scrollWidth > document.getElementById('d-cuenta').clientWidth + 1,
        svgsDecor: [...document.querySelectorAll('#dc-historia svg')].every((s) => s.getAttribute('aria-hidden') === 'true'),
        textoMedalla: document.querySelector('#dh-medallas .medalla.bloq')?.innerText.replace(/\s+/g, ' '),
      }));
      ok(h.ganadas >= 3 && h.bloq >= 1 && h.bloq <= 2 && h.medallas === h.ganadas + h.bloq, `medallas: las ganadas (${h.ganadas}) y solo la siguiente de cada tipo (${h.bloq})`);
      ok(/Próxima: te faltan? \d+ (compras?|mes(es)?)/.test(h.textoMedalla), `medallas: la que falta dice cuánto («${h.textoMedalla}»)`);
      ok(h.primera === 'Tu primera compra' && h.hoy === 'Hoy' && h.eventos.length >= 8 && h.eventos.every((e, i) => i === 0 || h.eventos[i - 1].t <= e.t), `historia: de la primera compra a hoy, en orden (${h.eventos.length} eventos)`);
      ok(h.eventos.some((e) => e.c.includes('h-hito')) && h.eventos.some((e) => e.c.includes('h-constancia')), 'historia: trae campamentos y constancia');
      ok(!h.desborda && h.svgsDecor, 'historia: sin desbordes y con las medallas como decoración (el texto las dice)');
      await p.keyboard.press('Escape');
      eq(consola, [], `consola limpia (tu historia): ${consola.join(' | ')}`);
      // «Qué hay de nuevo»: con una versión vista anterior sale una vez, se cierra con «Entendido» y no vuelve
      await p.evaluate(async () => { await fetch('/api/cambios-visto', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Libro': '1' }, body: JSON.stringify({ id: '0' }) }); });
      await p.reload({ waitUntil: 'networkidle' });
      await p.waitForSelector('#d-cambios[open]', { timeout: 8000 });
      const cam = await p.evaluate(() => ({ items: document.querySelectorAll('#cam-lista li').length, titulo: document.getElementById('cam-t').textContent }));
      ok(cam.items >= 3 && cam.titulo === 'Qué hay de nuevo', `qué hay de nuevo: con una versión anterior sale con sus cambios (${cam.items})`);
      await p.click('#cam-ok');
      await p.waitForFunction(() => !document.getElementById('d-cambios').open, null, { timeout: 3000 });
      await p.waitForFunction(() => fetch('/api/yo').then((r) => r.json()).then((j) => /^2026-/.test(j.cambios ?? '')), null, { timeout: 5000 });
      await p.reload({ waitUntil: 'networkidle' });
      await p.waitForTimeout(2500);
      ok(!(await p.locator('#d-cambios[open]').count()), 'qué hay de nuevo: una vez visto no vuelve');
      await ctx.close();
      // Un lector: primero su bienvenida, después los cambios, y puede abrir «Tu historia»
      const l = await entrar(navegador, srv, LECTOR, { hora: 22 }, () => { try { localStorage.setItem('libro.avisos.preguntado', '1'); } catch { /* sin almacenamiento */ } });
      await l.p.evaluate(async () => { await fetch('/api/cambios-visto', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Libro': '1' }, body: JSON.stringify({ id: '0' }) }); });
      await l.p.reload({ waitUntil: 'networkidle' });
      await l.p.waitForSelector('#d-novedades[open]', { timeout: 8000 });
      ok(!(await l.p.evaluate(() => document.getElementById('d-cambios').open)), 'lector: la bienvenida va primero');
      await l.p.click('#nov-ok');
      await l.p.waitForSelector('#d-cambios[open]', { timeout: 5000 });
      ok(true, 'lector: tras la bienvenida salen los cambios');
      await l.p.click('#cam-ok');
      await l.p.waitForFunction(() => !document.getElementById('d-cambios').open, null, { timeout: 3000 });
      await l.p.click('#cuenta-btn');
      await l.p.click('#dc-historia-btn');
      await l.p.waitForSelector('#dh-linea .h-ev', { timeout: 4000 });
      ok(await l.p.locator('#dh-linea .h-ev').count() >= 8, 'lector: también ve «Tu historia»');
      await l.ctx.close();
    } finally {
      srv.parar();
    }
    const mil = await servidor('mil');
    try {
      const { ctx, p } = await entrar(navegador, mil, ADMIN, { hora: 22 }, () => { try { localStorage.setItem('libro.avisos.preguntado', '1'); } catch { /* sin almacenamiento */ } });
      await p.click('#cuenta-btn');
      await p.click('#dc-historia-btn');
      await p.waitForSelector('#dc-historia:not([hidden])');
      const m = await p.evaluate(() => ({ extras: document.querySelectorAll('#dh-linea .h-extra').length, mas: document.querySelector('#dh-linea .h-mas')?.textContent, ganadas: document.querySelectorAll('#dh-medallas .medalla.ganada').length, total: document.querySelectorAll('#dh-linea li').length }));
      ok(m.extras > 0 && m.extras <= 8 && /^Y \d+ compras extra más/.test(m.mas ?? ''), `historia: con muchas extra salen las 8 más recientes y se cuenta el resto (${m.extras} · «${m.mas}»)`);
      ok(m.ganadas >= 8 && m.total < 80, `historia con mil compras: ${m.ganadas} medallas y ${m.total} eventos (no crece con cada compra)`);
      await ctx.close();
    } finally {
      mil.parar();
    }
    const vac = await servidor('vacio');
    try {
      const { ctx, p } = await entrar(navegador, vac, ADMIN, { hora: 22 }, () => { try { localStorage.setItem('libro.avisos.preguntado', '1'); } catch { /* sin almacenamiento */ } });
      await p.click('#cuenta-btn');
      await p.click('#dc-historia-btn');
      await p.waitForSelector('#dc-historia:not([hidden])');
      const v = await p.evaluate(() => ({ vacio: !document.getElementById('dh-vacio').hidden && !!document.querySelector('#dh-vacio .ilu'), cuerpo: document.getElementById('dh-cuerpo').hidden, txt: document.getElementById('dh-vacio').innerText }));
      ok(v.vacio && v.cuerpo && /primera compra/.test(v.txt), 'historia: sin compras dice que empieza con la primera, con su dibujo');
      await ctx.close();
    } finally {
      vac.parar();
    }
  }

  // ---------------------------------------------------------------- modo pantalla grande, sonido al guardar y guía de estilo (campamento 6, 3/3)
  {
    const srv = await servidor('anio');
    try {
      const sinAvisos = () => { try { localStorage.setItem('libro.avisos.preguntado', '1'); } catch { /* sin almacenamiento */ } };
      // --- Modo pantalla grande (una lectora: no tiene nada que anotar)
      const l = await entrar(navegador, srv, LECTOR, { hora: 22, viewport: { width: 1280, height: 720 } }, sinAvisos);
      if (await l.p.locator('#d-novedades[open]').count()) await l.p.click('#nov-ok');
      await l.p.waitForFunction(() => !document.querySelector('dialog[open]'), null, { timeout: 5000 });
      await l.p.click('#cuenta-btn');
      await l.p.click('#dc-tv');
      await l.p.waitForFunction(() => document.documentElement.dataset.tv === '1');
      await l.p.mouse.move(400, 300);
      await l.p.waitForTimeout(700);
      const tv = await l.p.evaluate(() => {
        const vis = (sel) => { const e = document.querySelector(sel); return !!e && getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().height > 0; };
        const esc = document.querySelector('.escena').getBoundingClientRect();
        return {
          escenaAlto: Math.round(esc.height), ventana: innerHeight, cuerpo: vis('.cuerpo'), cuenta: vis('#cuenta-btn'), anotar: vis('.anotar'), minicab: vis('#minicab'), indice: vis('#indice'),
          saldo: vis('#s-sats'), precio: vis('#precio'), ultimo: document.getElementById('tv-ultimo').innerText, salir: vis('#tv-salir'), hash: location.hash,
          scroll: document.documentElement.scrollHeight <= innerHeight + 1, vb: Number(document.querySelector('#montana > svg').getAttribute('viewBox').split(' ')[3]),
          letra: getComputedStyle(document.documentElement).fontSize,
        };
      });
      ok(Math.abs(tv.escenaAlto - tv.ventana) <= 2 && Math.abs(tv.vb - tv.ventana) <= 3, `pantalla grande: la escena ocupa toda la ventana (${tv.escenaAlto} / ${tv.ventana}, dibujo ${tv.vb})`);
      ok(!tv.cuerpo && !tv.cuenta && !tv.anotar && !tv.minicab && !tv.indice && tv.saldo && tv.precio, 'pantalla grande: solo saldo, precio y montaña; sin controles ni el resto de la página');
      ok(/^Último movimiento: .+ · \+[\d,]+ sats \(\$[\d.,]+\)$/.test(tv.ultimo) && tv.hash === '#tv' && tv.scroll, `pantalla grande: último movimiento («${tv.ultimo}»), dirección #tv y sin desplazamiento`);
      ok(parseFloat(tv.letra) > 18 && tv.salir, `pantalla grande: letra más grande (${tv.letra}) y botón de salir a la vista tras mover el ratón`);
      // Los avisos y diálogos no se atraviesan en la pantalla grande (recarga: la dirección con #tv entra directo)
      await l.p.evaluate(async () => { await fetch('/api/cambios-visto', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Libro': '1' }, body: JSON.stringify({ id: '0' }) }); });
      await l.p.reload({ waitUntil: 'networkidle' });
      await l.p.waitForTimeout(3000);
      const tras = await l.p.evaluate(() => ({ tv: document.documentElement.dataset.tv, dialogo: !!document.querySelector('dialog[open]') }));
      ok(tras.tv === '1' && !tras.dialogo, 'pantalla grande: al abrir con #tv entra directo y no salen diálogos (ni bienvenida ni cambios)');
      await l.p.mouse.move(500, 350);
      await l.p.click('#tv-salir');
      const fuera = await l.p.evaluate(() => ({ tv: document.documentElement.dataset.tv ?? null, cuerpo: getComputedStyle(document.querySelector('.cuerpo')).display !== 'none', hash: location.hash }));
      ok(fuera.tv === null && fuera.cuerpo && fuera.hash === '', 'pantalla grande: «Salir» devuelve la página completa y quita #tv');
      await l.ctx.close();

      // --- Sonido al guardar: apagado por defecto, se enciende en «Tu cuenta», solo suena al guardar una compra
      const a = await entrar(navegador, srv, ADMIN, { hora: 22 }, () => { try { localStorage.setItem('libro.avisos.preguntado', '1'); } catch { /* */ } window.__osc = 0; const C = window.AudioContext ?? window.webkitAudioContext; if (C) { const f = C.prototype.createOscillator; C.prototype.createOscillator = function (...x) { window.__osc++; return f.apply(this, x); }; } });
      const guardar = async (sats) => {
        await a.p.click('#anotar');
        await a.p.fill('#h-sats', String(sats));
        await a.p.click('#guardar');
        await a.p.waitForTimeout(400);
        if (await a.p.locator('#guardar', { hasText: 'Sí, guardar así' }).count()) await a.p.click('#guardar');
        await a.p.waitForFunction(() => document.getElementById('hoja').hidden, null, { timeout: 6000 });
        await a.p.waitForTimeout(500);
      };
      const osc = () => a.p.evaluate(() => window.__osc);
      eq(await osc(), 0, 'sonido: al entrar no suena nada');
      await guardar(11111);
      eq(await osc(), 0, 'sonido: apagado por defecto, guardar una compra no suena');
      await a.p.waitForTimeout(3600);
      await a.p.click('#cuenta-btn');
      eq((await a.p.textContent('#dc-sonido')).trim(), 'Sonido al guardar: apagado', 'sonido: «Tu cuenta» dice que está apagado');
      await a.p.click('#dc-sonido');
      eq([(await a.p.textContent('#dc-sonido')).trim(), await a.p.evaluate(() => localStorage.getItem('libro.sonido'))], ['Sonido al guardar: encendido', '1'], 'sonido: se enciende y se recuerda');
      ok((await osc()) >= 2, `sonido: al encenderlo suena una muestra (${await osc()} notas)`);
      await a.p.keyboard.press('Escape');
      await a.p.waitForTimeout(300);
      const antes = await osc();
      await guardar(12222);
      const despues = await osc();
      ok(despues - antes >= 2 && despues - antes <= 4, `sonido: al guardar una compra suenan ${despues - antes} notas`);
      await a.p.waitForTimeout(3600);
      // Una venta no suena (solo las compras)
      await a.p.click('#anotar');
      await a.p.click('#h-tipo button[data-tipo="venta"]');
      await a.p.fill('#h-sats', '1000');
      await a.p.click('#guardar');
      await a.p.waitForFunction(() => document.getElementById('hoja').hidden, null, { timeout: 6000 });
      await a.p.waitForTimeout(500);
      eq(await osc(), despues, 'sonido: guardar una venta no suena');
      await a.p.waitForTimeout(3600);
      await a.p.click('#cuenta-btn');
      await a.p.click('#dc-sonido');
      eq((await a.p.textContent('#dc-sonido')).trim(), 'Sonido al guardar: apagado', 'sonido: se apaga');
      await a.ctx.close();

      // --- Guía de estilo: solo el admin; colores con contraste, iconos y sin desbordes
      const g = await entrar(navegador, srv, ADMIN, { hora: 22 }, sinAvisos);
      const resp = await g.p.goto(`${srv.url}/guia`, { waitUntil: 'networkidle' });
      ok(resp.status() === 200 && (await g.p.textContent('h1')) === 'Guía de estilo', 'guía: el admin la abre');
      for (const [tema, contraste] of [['oscuro', 'normal'], ['claro', 'normal'], ['oscuro', 'alto'], ['claro', 'alto']]) {
        await g.p.evaluate(([t, c]) => { window.libroTema.fijar(t); window.libroAcc.fijarContraste(c); }, [tema, contraste]);
        await g.p.waitForTimeout(400);
        await g.p.evaluate(() => document.querySelector('.guia-ctl .rangos button')?.click()); // repinta los colores con el estado actual
        await g.p.waitForTimeout(300);
        const c = await g.p.evaluate(() => ({ muestras: document.querySelectorAll('#guia-col li').length, malos: [...document.querySelectorAll('.guia-mal')].map((e) => e.closest('li').dataset.token), buenos: document.querySelectorAll('.guia-ok').length }));
        ok(c.muestras >= 20 && c.buenos === 6 && c.malos.length === 0, `guía (${tema}, contraste ${contraste}): ${c.muestras} colores, los 6 de texto con 4.5:1 o más${c.malos.length ? ` (mal: ${c.malos})` : ''}`);
      }
      const ic = await g.p.evaluate(() => ({ iconos: [...document.querySelectorAll('#guia-iconos .ico')].map((e) => { const r = e.getBoundingClientRect(); return r.width > 8 && r.height > 8; }), avatares: document.querySelectorAll('#guia-av .avatar').length, medallas: document.querySelectorAll('#guia-med .med').length, ilus: document.querySelectorAll('#guia-ilu .ilu').length }));
      ok(ic.iconos.length === 8 && ic.iconos.every(Boolean) && ic.avatares === 8 && ic.medallas === 4 && ic.ilus === 3, 'guía: muestra los 8 iconos, los avatares, las medallas y las ilustraciones');
      for (const w of [320, 768, 1280]) {
        await g.p.setViewportSize({ width: w, height: 800 });
        await g.p.waitForTimeout(200);
        ok(await g.p.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1), `guía: sin scroll horizontal a ${w} px`);
      }
      await g.ctx.close();
      const lec = await entrar(navegador, srv, LECTOR, { hora: 22 }, sinAvisos);
      eq((await lec.p.goto(`${srv.url}/guia`)).status(), 404, 'guía: un lector no la ve');
      await lec.ctx.close();
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
    await verVista(p, 'valor');
    ok(await p.locator('#valor').isVisible(), 'con mil compras sale el gráfico de valor');
    // Vistas nuevas: costo promedio y sats acumulados
    await verVista(p, 'costo');
    const cp = await p.evaluate(() => ({ visible: !document.getElementById('costo-prom').hidden, mercado: getComputedStyle(document.getElementById('mercado')).display, svg: !!document.querySelector('#c-lienzo .s-linea'), puntos: document.querySelectorAll('#c-lienzo .s-puntos').length,
      defecto: document.getElementById('c-lectura').textContent, mov: document.getElementById('c-mov').textContent, vista: document.querySelector('.cuerpo').dataset.vista, guardada: localStorage.getItem('libro.grafico.vista') }));
    ok(cp.visible && cp.mercado === 'none' && cp.svg && cp.vista === 'costo' && cp.guardada === 'costo', 'la vista «Costo» enseña el costo promedio y esconde el precio; se recuerda');
    ok(/^Tu costo promedio empezó en \$[\d,]+ y hoy es \$[\d,]+ \([+−]?\d+\.\d%\)\.$/.test(cp.defecto) && /^Las compras que más lo movieron: .+\(/.test(cp.mov), `costo promedio: «${cp.defecto}» · «${cp.mov.slice(0, 60)}…»`);
    const cc = await p.locator('#c-lienzo').boundingBox();
    await p.evaluate(() => document.getElementById('c-lienzo').scrollIntoView({ block: 'center' }));
    const cc2 = await p.locator('#c-lienzo').boundingBox();
    await p.mouse.move(cc2.x + cc2.width * 0.5, cc2.y + cc2.height * 0.5); await p.waitForTimeout(200);
    ok(/costo promedio \$[\d,]+/.test(await p.textContent('#c-lectura')), 'al recorrer el gráfico del costo se lee cada compra');
    await p.mouse.move(5, 5);
    await p.focus('#c-lienzo'); await p.keyboard.press('Home');
    ok(/primera compra/.test(await p.textContent('#c-sr')) && /primera compra/.test(await p.textContent('#c-lectura')), 'con el teclado (Inicio) se lee la primera compra y se anuncia');
    void cc;
    await verVista(p, 'sats');
    const sa = await p.evaluate(() => ({ visible: !document.getElementById('sats-acum').hidden, svg: !!document.querySelector('#s-lienzo .s-linea'), area: !!document.querySelector('#s-lienzo .s-area'), defecto: document.getElementById('s-lectura').textContent }));
    ok(sa.visible && sa.svg && sa.area, 'la vista «Sats» enseña la escalera de tus sats');
    eq(sa.defecto, `Hoy tienes ${entero(satsMil)} sats.`, 'la escalera dice los mismos sats que el saldo');
    await p.evaluate(() => document.getElementById('s-lienzo').scrollIntoView({ block: 'center' }));
    // Con el desplazamiento suave la caja se mueve un rato: se espera a que la página quede quieta antes de apuntar con el ratón
    await p.evaluate(() => new Promise((listo) => { let ultimo = -1, quietos = 0; const t = () => { if (scrollY === ultimo) { if (++quietos >= 5) return listo(); } else { quietos = 0; ultimo = scrollY; } requestAnimationFrame(t); }; t(); }));
    const sb = await p.locator('#s-lienzo').boundingBox();
    await p.mouse.move(sb.x + sb.width * 0.4, sb.y + sb.height * 0.5);
    await p.mouse.move(sb.x + sb.width * 0.42, sb.y + sb.height * 0.5);
    await p.waitForFunction(() => /sats · .* en total/.test(document.getElementById('s-lectura').textContent), null, { timeout: 4000 }).catch(() => {}); // sin espera fija: bajo carga tarda más
    ok(/sats · .* en total/.test(await p.textContent('#s-lectura')), 'al recorrer la escalera se lee cuánto sumó cada movimiento');
    await p.mouse.move(5, 5);
    await verVista(p, 'precio');
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

  // ---------------------------------------------------------------- iPhone: arranque, insignia del icono e icono por tema (campamento 7, 1/2)
  {
    const srv = await servidor('anio');
    try {
      const espia = () => {
        try { localStorage.setItem('libro.avisos.preguntado', '1'); } catch { /* sin almacenamiento */ }
        window.__ins = [];
        navigator.setAppBadge = (x) => { window.__ins.push(['set', x]); return Promise.resolve(); };
        navigator.clearAppBadge = () => { window.__ins.push(['clear']); return Promise.resolve(); };
      };
      // Imágenes de arranque (idea 40): doce tamaños, enlazados en la entrada y en la app, y públicos (iOS las pide sin sesión).
      const enlaces = (html) => [...html.matchAll(/<link rel="apple-touch-startup-image" href="([^"]+)" media="([^"]+)">/g)].map((m) => ({ href: m[1], media: m[2] }));
      const login = enlaces(await (await fetch(`${srv.url}/login`)).text());
      eq(login.length, 12, 'la entrada enlaza 12 imágenes de arranque');
      ok(login.every((e) => /device-width: \d+px\) and \(device-height: \d+px\) and \(-webkit-device-pixel-ratio: [23]\) and \(orientation: portrait\)/.test(e.media)), 'cada arranque lleva su media query exacta');
      for (const e of login) {
        const r = await fetch(`${srv.url}${e.href}`);
        const dim = e.href.match(/arranque-(\d+)x(\d+)\.png/);
        const png = Buffer.from(await r.arrayBuffer());
        const [w, h, d] = [Number(dim[1]), Number(dim[2]), Number(e.media.match(/pixel-ratio: (\d)/)[1])];
        ok(r.status === 200 && /image\/png/.test(r.headers.get('content-type')) && png.readUInt32BE(16) === w && png.readUInt32BE(20) === h, `${e.href} se sirve sin sesión con sus medidas`);
        ok(e.media.includes(`device-width: ${w / d}px`) && e.media.includes(`device-height: ${h / d}px`), `${e.href} corresponde a su media query`);
      }
      // Insignia (idea 41): solo el admin y solo cuando toca comprar.
      const a = await entrar(navegador, srv, ADMIN, {}, espia);
      const estado = await a.p.evaluate(() => document.getElementById('toca').dataset.estado);
      const toca = ['toca', 'ultimo'].includes(estado);
      const ult = await a.p.evaluate(() => window.__ins.at(-1));
      eq(ult, toca ? ['set', 1] : ['clear'], `la insignia sigue a «te toca» (${estado})`);
      await a.p.evaluate(async (f) => {
        await fetch('/api/compras', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Libro': '1' }, body: JSON.stringify({ fecha: f, monto: 25, sats: 30000 }) });
      }, hoySV());
      await a.p.reload({ waitUntil: 'networkidle' });
      await a.p.waitForTimeout(1500);
      eq(await a.p.evaluate(() => window.__ins.at(-1)), ['clear'], 'tras comprar hoy la insignia se quita');
      eq(await a.p.evaluate(() => document.getElementById('toca').dataset.estado), 'hecho', 'y «te toca» dice que estás al día');
      eq(a.consola, [], `consola limpia (insignia): ${a.consola.join(' | ')}`);
      await a.ctx.close();
      const l = await entrar(navegador, srv, LECTOR, {}, espia);
      ok(!(await l.p.evaluate(() => window.__ins.some((x) => x[0] === 'set'))), 'una lectora nunca recibe la insignia');
      await l.ctx.close();
      // El servicio de avisos la enciende con el recordatorio.
      const sw = await (await fetch(`${srv.url}/sw.js`)).text();
      ok(/setAppBadge\(1\)/.test(sw) && /etiqueta === 'recordatorio'/.test(sw), 'sw.js enciende la insignia solo con el recordatorio');
      // Icono por tema (idea 89): el SVG cambia de colores con el tema del sistema.
      const ctx = await navegador.newContext();
      const pg = await ctx.newPage();
      // Como favicon el SVG es una imagen (sin la CSP del documento): se dibuja en un canvas y se lee el pixel del fondo.
      const fondo = async (esquema) => {
        await pg.emulateMedia({ colorScheme: esquema });
        await pg.goto(`${srv.url}/login`);
        return pg.evaluate(() => new Promise((res, rej) => {
          const im = new Image();
          im.onload = () => { const c = document.createElement('canvas'); c.width = c.height = 32; const g = c.getContext('2d'); g.drawImage(im, 0, 0, 32, 32); res(Array.from(g.getImageData(3, 16, 1, 1).data).slice(0, 3)); };
          im.onerror = () => rej(new Error('no cargó el icono'));
          im.src = `/icon.svg?${Date.now()}`;
        }));
      };
      eq(await fondo('dark'), [14, 26, 46], 'icono oscuro con el sistema oscuro');
      eq(await fondo('light'), [251, 232, 204], 'icono claro con el sistema claro');
      await ctx.close();
    } finally {
      srv.parar();
    }
  }

  // ---------------------------------------------------------------- teléfono acostado y pantallas muy anchas (campamento 7, 2/2)
  {
    const srv = await servidor('anio');
    try {
      const sinAvisos = () => { try { localStorage.setItem('libro.avisos.preguntado', '1'); } catch { /* sin almacenamiento */ } };
      // --- Teléfono acostado (idea 64): la escena mide la pantalla, el saldo a la izquierda y la montaña a la derecha.
      for (const [w, h] of [[844, 390], [667, 375], [568, 320]]) {
        const r = await entrar(navegador, srv, ADMIN, { viewport: { width: w, height: h }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 }, sinAvisos);
        const m = await r.p.evaluate(() => {
          const b = (s) => { const e = document.querySelector(s); return e ? e.getBoundingClientRect() : null; };
          const esc = b('.escena'), saldo = b('.saldo'), yo = b('.yo'), btn = b('.anotar'), saludo = b('#saludo'), k = b('.saldo-k'), prox = b('#prox');
          return { alto: innerHeight, esc: esc.height, saldoR: saldo.right, saldoB: saldo.bottom, yoX: yo ? yo.left : null, btnT: btn.top, btnL: btn.left, btnR: btn.right,
            saludoB: saludo.bottom, kT: k.top, proxB: prox.bottom, scrollX: document.documentElement.scrollWidth > innerWidth };
        });
        ok(Math.abs(m.esc - m.alto) <= 2, `${w}×${h} acostado: la escena mide la pantalla (${m.esc} de ${m.alto})`);
        ok(m.yoX > m.saldoR, `${w}×${h}: «Tú» (x=${Math.round(m.yoX)}) queda a la derecha del saldo (${Math.round(m.saldoR)})`);
        ok(m.btnL < 60 && m.btnR < w * 0.5, `${w}×${h}: «Anotar» baja a la esquina izquierda`);
        ok(m.proxB <= m.btnT + 2, `${w}×${h}: el saldo no pisa el botón (${Math.round(m.proxB)} ≤ ${Math.round(m.btnT)})`);
        ok(m.kT >= m.saludoB - 4, `${w}×${h}: el saludo no pisa «Tu saldo»`);
        ok(!m.scrollX, `${w}×${h} acostado: sin scroll horizontal`);
        eq(r.consola, [], `consola limpia acostado ${w}×${h}: ${r.consola.join(' | ')}`);
        await r.ctx.close();
      }
      // La entrada acostada: el formulario a la izquierda, entero a la vista y con zonas de toque de 48 px.
      for (const [w, h] of [[844, 390], [568, 320]]) {
        const ctx = await navegador.newContext({ ...devices['iPhone 13'], viewport: { width: w, height: h }, isMobile: true, hasTouch: true });
        const p = await ctx.newPage();
        await p.addInitScript(() => { try { localStorage.setItem('libro.hora', '22'); } catch { /* sin almacenamiento */ } });
        await p.goto(`${srv.url}/login`, { waitUntil: 'networkidle' });
        const e = await p.evaluate(() => {
          const r = (s) => document.querySelector(s).getBoundingClientRect();
          const caja = r('.login-caja'), boton = r('.login-caja .guardar'), marca = r('.cima .marca');
          return { alto: innerHeight, cajaB: caja.bottom, cajaT: caja.top, cajaR: caja.right, botonH: boton.height, botonB: boton.bottom, marcaB: marca.bottom,
            scrollY: document.documentElement.scrollHeight > innerHeight + 1, montanaX: r('.montana').left };
        });
        ok(e.botonB <= e.alto && e.cajaT >= 0 && e.botonH >= 47.5, `entrada acostada ${w}×${h}: el botón «Entrar» se ve entero y mide ${Math.round(e.botonH)} px`);
        ok(!e.scrollY, `entrada acostada ${w}×${h}: cabe sin bajar la página`);
        ok(e.cajaT >= e.marcaB - 2, `entrada acostada ${w}×${h}: la tarjeta no tapa la marca`);
        await ctx.close();
      }
      // --- Pantallas muy anchas (idea 88): la raíz y el marco de contenido crecen; el índice no se encima al contenido.
      for (const [w, h, zoom] of [[1920, 1080, 1], [2560, 1440, 1.25], [3440, 1440, 1.5], [3840, 2160, 1.5]]) {
        const r = await entrar(navegador, srv, ADMIN, { viewport: { width: w, height: h }, isMobile: false, hasTouch: false, deviceScaleFactor: 1 }, sinAvisos);
        const m = await r.p.evaluate(() => {
          const b = (s) => document.querySelector(s).getBoundingClientRect();
          const cuerpo = b('.cuerpo'), idx = b('.indice'), saldo = document.querySelector('#s-sats .od-num').getBoundingClientRect();
          return { fs: parseFloat(getComputedStyle(document.documentElement).fontSize), cuerpoW: cuerpo.width, cuerpoL: cuerpo.left, idxR: idx.right, idxW: idx.width,
            saldoW: saldo.width, scrollX: document.documentElement.scrollWidth > innerWidth };
        });
        eq(m.fs, 16 * zoom, `${w}×${h}: la raíz vale ${16 * zoom} px`);
        ok(m.saldoW > 0, `${w}×${h}: el saldo se ve`);
        ok(!m.scrollX, `${w}×${h}: sin scroll horizontal`);
        ok(w < 1500 || m.idxR <= m.cuerpoL, `${w}×${h}: el índice (hasta ${Math.round(m.idxR)}) no se encima al contenido (desde ${Math.round(m.cuerpoL)})`);
        if (zoom > 1) ok(m.cuerpoW > 1240 * zoom * 0.9, `${w}×${h}: el contenido crece con la pantalla (${Math.round(m.cuerpoW)} px)`);
        else ok(m.cuerpoW <= 1240, `1920×1080: el contenido sigue en 1240 px como siempre (${Math.round(m.cuerpoW)})`);
        eq(r.consola, [], `consola limpia ${w}×${h}: ${r.consola.join(' | ')}`);
        await r.ctx.close();
      }
      // Con letra muy grande el zoom de la pantalla ancha se compone (125 % × 1.25).
      {
        const r = await entrar(navegador, srv, ADMIN, { viewport: { width: 2560, height: 1440 }, isMobile: false, hasTouch: false }, () => { try { localStorage.setItem('libro.letra', 'muy-grande'); localStorage.setItem('libro.avisos.preguntado', '1'); } catch { /* sin almacenamiento */ } });
        eq(await r.p.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize)), 16 * 1.5625, 'letra muy grande a 2560 px: 125 % × 1.25');
        ok(!(await r.p.evaluate(() => document.documentElement.scrollWidth > innerWidth)), 'letra muy grande a 2560 px: sin scroll horizontal');
        await r.ctx.close();
      }
    } finally {
      srv.parar();
    }
  }

  // ---------------------------------------------------------------- datos y etiquetas (campamento 8, 1/4)
  {
    const srv = await servidor('mil');
    try {
      const sinAvisos = () => { try { localStorage.setItem('libro.avisos.preguntado', '1'); } catch { /* sin almacenamiento */ } };
      const r = await entrar(navegador, srv, ADMIN, { viewport: { width: 390, height: 844 } }, sinAvisos);
      const compras = await datos(r.p, '/api/compras');
      const conBono = compras.filter((c) => c.etiquetas?.includes('bono')).length, conCumple = compras.filter((c) => c.etiquetas?.includes('cumpleaños')).length;
      ok(conBono > conCumple && conCumple > 0, `el escenario trae etiquetas (bono ${conBono}, cumpleaños ${conCumple})`);
      // El filtro de la lista
      await r.p.evaluate(() => document.getElementById('lista').scrollIntoView({ block: 'start' }));
      await r.p.click('#l-mas summary');
      ok(await r.p.locator('#l-etq-l').isVisible(), 'con etiquetas sale el selector «Etiqueta»');
      const opciones = await r.p.$$eval('#l-etq option', (os) => os.map((o) => o.textContent));
      eq(opciones, ['Todas', `bono (${conBono})`, `cumpleaños (${conCumple})`], 'el selector lista las etiquetas de más a menos usadas, con su cuenta');
      await r.p.selectOption('#l-etq', 'cumpleaños');
      await r.p.waitForTimeout(300);
      eq((await r.p.textContent('#l-res')).trim(), `${conCumple} de ${compras.length + (await datos(r.p, '/api/traslados')).length} movimientos`, 'el resumen dice cuántos coinciden');
      eq(await r.p.locator('#lista .fila').count(), Math.min(8, conCumple), 'la lista muestra solo esos movimientos');
      ok((await r.p.locator('#lista .f-et').allInnerTexts()).every((t) => t.length > 0) && await r.p.locator('#lista .f-et').count() >= conCumple, 'cada fila muestra sus etiquetas');
      await r.p.click('#l-limpiar');
      eq(await r.p.inputValue('#l-etq'), '', '«Quitar filtros» limpia también la etiqueta');
      // El buscador también las encuentra
      await r.p.fill('#l-buscar', 'CUMPLEANOS');
      await r.p.waitForTimeout(300);
      ok((await r.p.textContent('#l-res')).startsWith(`${conCumple} de`), 'el buscador encuentra la etiqueta sin acentos ni mayúsculas');
      await r.p.click('#l-limpiar');
      // Anotar con etiquetas
      await r.p.evaluate(() => scrollTo(0, 0));
      await r.p.click('#anotar');
      await r.p.waitForTimeout(400);
      await r.p.fill('#h-sats', '12345');
      await r.p.click('#h-avanzado summary');
      ok(await r.p.locator('#h-etq').isVisible(), 'la hoja tiene el campo de etiquetas en «Más detalles»');
      eq(await r.p.$$eval('#h-etq-lista option', (os) => os.map((o) => o.value)), ['bono', 'cumpleaños'], 'las que ya usaste salen como sugerencia');
      await r.p.fill('#h-etq', 'Regalo, #BONO');
      await r.p.click('#guardar');
      await r.p.waitForTimeout(1500);
      const ultima = (await datos(r.p, '/api/compras')).find((c) => c.sats === 12345);
      eq(ultima?.etiquetas, ['regalo', 'bono'], 'se guardan normalizadas (minúsculas, sin #)');
      eq(await r.p.locator('#l-etq option').count(), 4, 'la etiqueta nueva aparece en el selector');
      // Editarla: el campo viene con lo guardado y se conserva si no se toca
      await r.p.click('#lista .fila[data-id="' + ultima.id + '"]');
      await r.p.waitForTimeout(400);
      eq(await r.p.inputValue('#h-etq'), 'regalo, bono', 'al editar el campo trae las etiquetas');
      await r.p.fill('#h-etq', 'regalo');
      await r.p.click('#guardar');
      await r.p.waitForTimeout(1200);
      eq((await datos(r.p, '/api/compras')).find((c) => c.id === ultima.id).etiquetas, ['regalo'], 'editar las cambia');
      eq(r.consola, [], `consola limpia (etiquetas): ${r.consola.join(' | ')}`);
      await r.ctx.close();

      // «Tus datos» (ideas 47 y 107): solo el admin; descargas e importar traslados
      const a = await entrar(navegador, srv, ADMIN, { viewport: { width: 390, height: 844 } }, sinAvisos);
      await a.p.click('#cuenta-btn');
      ok(await a.p.locator('#dc-datos-btn').isVisible(), 'el admin ve «Tus datos»');
      await a.p.click('#dc-datos-btn');
      await a.p.waitForTimeout(400);
      ok(await a.p.locator('#dc-datos').isVisible() && !(await a.p.locator('#dc-menu').isVisible()), 'se abre la vista de datos');
      const [descarga] = await Promise.all([a.p.waitForEvent('download'), a.p.click('#dd-zip')]);
      ok(/^libro-dca-\d{4}-\d{2}-\d{2}\.zip$/.test(descarga.suggestedFilename()), `el ZIP se descarga con su nombre (${descarga.suggestedFilename()})`);
      const [descarga2] = await Promise.all([a.p.waitForEvent('download'), a.p.click('#dd-tras')]);
      ok(/^traslados-btc-/.test(descarga2.suggestedFilename()), 'el CSV de traslados se descarga');
      const antesT = (await datos(a.p, '/api/traslados')).length;
      await a.p.setInputFiles('#tras-in', { name: 't.csv', mimeType: 'text/csv', buffer: Buffer.from(`fecha,sats,sentido\n${hoySV()},1000,a_wallet\n`) });
      await a.p.waitForTimeout(1200);
      eq((await datos(a.p, '/api/traslados')).length, antesT + 1, 'importar un traslado desde la vista de datos lo guarda');
      ok(/Traslados importados: 1/.test(await a.p.textContent('#aviso')), 'y lo dice');
      eq(a.consola, [], `consola limpia (datos): ${a.consola.join(' | ')}`);
      await a.ctx.close();
      const l = await entrar(navegador, srv, LECTOR, { viewport: { width: 390, height: 844 } }, sinAvisos);
      if (await l.p.locator('#d-novedades[open]').count()) await l.p.click('#nov-ok');
      await l.p.waitForFunction(() => !document.querySelector('dialog[open]'), null, { timeout: 5000 });
      await l.p.click('#cuenta-btn');
      ok(!(await l.p.locator('#dc-datos-btn').isVisible()), 'una lectora no ve «Tus datos»');
      await l.ctx.close();
    } finally {
      srv.parar();
    }
  }

  // ---------------------------------------------------------------- estado del sistema (campamento 8, 2/4)
  {
    const srv = await servidor('anio');
    try {
      const sinAvisos = () => { try { localStorage.setItem('libro.avisos.preguntado', '1'); } catch { /* sin almacenamiento */ } };
      const a = await entrar(navegador, srv, ADMIN, { viewport: { width: 390, height: 844 } }, sinAvisos);
      // Un error de JavaScript en la página se reporta al servidor y el admin lo ve
      await a.p.evaluate(() => { setTimeout(() => { throw new Error('prueba de error en el navegador'); }, 10); });
      await a.p.waitForTimeout(1200);
      await a.p.click('#cuenta-btn');
      ok(await a.p.locator('#dc-sistema-btn').isVisible(), 'el admin ve «Estado del sistema»');
      await a.p.click('#dc-sistema-btn');
      await a.p.waitForFunction(() => !/Cargando/.test(document.getElementById('sis-res').textContent), null, { timeout: 5000 });
      ok(await a.p.locator('#dc-sistema').isVisible() && !(await a.p.locator('#dc-menu').isVisible()), 'se abre la vista');
      const filas = await a.p.$$eval('#sis-lista .sis-fila', (fs) => fs.map((f) => ({ t: f.querySelector('b').textContent, p: f.querySelector('.sis-palabra').textContent.trim(), e: f.dataset.estado })));
      eq(filas.map((f) => f.t), ['Tus cuentas', 'Último respaldo', 'Prueba de restauración', 'Servicio de avisos', 'Base de datos', 'Espacio en disco', 'Versión'], 'las filas del estado');
      ok(filas.every((f) => /^· (Bien|Revisar|Falla)$/.test(f.p)), 'cada fila dice con palabras cómo está (no solo con color)');
      eq(filas[0].e, 'ok', 'con las cuentas bien, «Tus cuentas» está bien');
      ok(/^(Todo en orden\.|\d+ cosas? por revisar\.)$/.test((await a.p.textContent('#sis-res')).trim()), 'el resumen dice cuántas cosas revisar');
      const rutas = await a.p.$$eval('#sis-met th[scope="row"]', (ths) => ths.map((t) => t.textContent));
      ok(rutas.includes('/api/compras') && !rutas.some((r) => /^\/[a-f0-9]{64}/.test(r)), `las métricas salen por ruta (${rutas.slice(0, 3).join(', ')}…)`);
      const errores = await a.p.$$eval('#sis-err .sis-fila', (fs) => fs.map((f) => f.textContent));
      ok(errores.some((t) => t.includes('prueba de error en el navegador') && t.includes('Safari · iPhone')), `el error del navegador aparece con su agente: ${errores[0]}`);
      ok(await a.p.locator('#sis-err-limpiar').isVisible(), 'y se puede limpiar la lista');
      await a.p.click('#sis-err-limpiar');
      await a.p.waitForTimeout(700);
      eq(await a.p.locator('#sis-err .sis-fila').count(), 0, 'limpiada la lista, no quedan errores');
      ok((await a.p.textContent('#sis-err')).includes('Sin errores'), 'y lo dice');
      // El estado nunca trae claves ni contenido de las compras
      const crudo = JSON.stringify(await datos(a.p, '/api/sistema'));
      ok(!/p256dh|endpoint|vapid|"hash"|scrypt/.test(crudo), 'el estado no incluye claves ni hashes');
      await a.ctx.close();
      // Una lectora: sin botón, sin acceso, y sus errores sí se reportan
      const l = await entrar(navegador, srv, LECTOR, { viewport: { width: 390, height: 844 } }, sinAvisos);
      if (await l.p.locator('#d-novedades[open]').count()) await l.p.click('#nov-ok');
      await l.p.waitForFunction(() => !document.querySelector('dialog[open]'), null, { timeout: 5000 });
      await l.p.click('#cuenta-btn');
      ok(!(await l.p.locator('#dc-sistema-btn').isVisible()), 'una lectora no ve «Estado del sistema»');
      eq(await l.p.evaluate(() => fetch('/api/sistema').then((r) => r.status)), 403, 'y la API le dice que no');
      eq(await l.p.evaluate(() => fetch('/api/errores', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Libro': '1' }, body: JSON.stringify({ pantalla: '/', mensaje: 'error de una lectora' }) }).then((r) => r.status)), 204, 'pero sus errores sí se reportan');
      await l.ctx.close();
    } finally {
      srv.parar();
    }
  }

  // ---------------------------------------------------------------- sesiones y operación (campamento 8, 3/4)
  {
    const srv = await servidor('anio');
    try {
      const sinAvisos = () => { try { localStorage.setItem('libro.avisos.preguntado', '1'); } catch { /* sin almacenamiento */ } };
      // Dos dispositivos con la misma cuenta; uno es «compartido»
      const a = await entrar(navegador, srv, ADMIN, { viewport: { width: 390, height: 844 } }, sinAvisos);
      const ctx2 = await navegador.newContext({ ...devices['iPhone 13'], viewport: { width: 390, height: 844 } });
      const p2 = await ctx2.newPage();
      await p2.addInitScript(sinAvisos);
      await p2.goto(`${srv.url}/login`, { waitUntil: 'networkidle' });
      ok(await p2.locator('#l-compartido').isVisible(), 'la entrada tiene la casilla «Este dispositivo es compartido»');
      ok(!(await p2.locator('#l-compartido').isChecked()), 'y viene sin marcar');
      await p2.fill('input[autocomplete="username"]', ADMIN[0]); await p2.fill('input[autocomplete="current-password"]', ADMIN[1]);
      await p2.locator('label.l-comp').click();
      await Promise.all([p2.waitForURL('**/'), p2.click('button[type=submit], .guardar')]);
      await p2.waitForTimeout(1500);
      await a.p.click('#cuenta-btn');
      await a.p.click('#dc-sesiones-btn');
      await a.p.waitForSelector('#ses-lista .sis-fila');
      const filas = await a.p.$$eval('#ses-lista .sis-fila', (fs) => fs.map((f) => ({ t: f.textContent, cerrar: !!f.querySelector('.ses-cerrar') })));
      eq(filas.length, 2, 'se ven las dos sesiones abiertas');
      ok(filas.filter((f) => /Este dispositivo/.test(f.t)).length === 1 && filas.filter((f) => f.cerrar).length === 1, 'la de este dispositivo no tiene botón de cerrar; la otra sí');
      ok(filas.some((f) => /compartido: se cierra solo a las/.test(f.t)), 'la compartida dice a qué hora se cierra sola');
      ok(!JSON.stringify(filas).match(/[A-Za-z0-9_-]{30,}/), 'no se ve nada parecido a un token');
      eq(await p2.evaluate(() => fetch('/api/yo').then((r) => r.status)), 200, 'la otra sesión funciona antes de cerrarla');
      await a.p.click('#ses-lista .ses-cerrar');
      await a.p.waitForFunction(() => document.querySelectorAll('#ses-lista .sis-fila').length === 1);
      eq(await p2.evaluate(() => fetch('/api/yo').then((r) => r.status)), 401, 'cerrarla desde aquí la deja sin acceso');
      ok(/Sesión cerrada/.test(await a.p.textContent('#aviso')), 'y lo dice');
      eq(a.consola, [], `consola limpia (sesiones): ${a.consola.join(' | ')}`);
      await ctx2.close();
      // Una lectora también ve y gestiona sus sesiones
      const l = await entrar(navegador, srv, LECTOR, { viewport: { width: 390, height: 844 } }, sinAvisos);
      if (await l.p.locator('#d-novedades[open]').count()) await l.p.click('#nov-ok');
      await l.p.waitForFunction(() => !document.querySelector('dialog[open]'), null, { timeout: 5000 });
      await l.p.click('#cuenta-btn'); await l.p.click('#dc-sesiones-btn');
      await l.p.waitForSelector('#ses-lista .sis-fila');
      ok(await l.p.locator('#ses-lista .sis-fila').count() >= 1, 'una lectora ve sus sesiones');
      await l.ctx.close();
      await a.ctx.close();
    } finally {
      srv.parar();
    }
    // Modo solo lectura de emergencia
    const mant = await servidor('anio', { SOLO_LECTURA: '1' });
    try {
      const sinAvisos = () => { try { localStorage.setItem('libro.avisos.preguntado', '1'); } catch { /* sin almacenamiento */ } };
      const m = await entrar(navegador, mant, ADMIN, { viewport: { width: 390, height: 844 } }, sinAvisos);
      ok(await m.p.locator('#mant').isVisible() && /Mantenimiento/.test(await m.p.textContent('#mant')), 'con SOLO_LECTURA sale el aviso de mantenimiento');
      ok(!(await m.p.locator('#anotar').isVisible()), 'y no hay botón de anotar');
      eq(await m.p.evaluate(() => fetch('/api/compras', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Libro': '1' }, body: JSON.stringify({ fecha: '2026-01-02', monto: 5, sats: 5000 }) }).then((r) => r.status)), 503, 'ninguna escritura entra');
      ok(await m.p.locator('#s-sats .sr').count() === 1 && (await m.p.locator('#s-sats .sr').textContent()).length > 0, 'pero se ve todo el libro');
      eq(m.consola.filter((c) => !/503/.test(c)), [], 'consola limpia salvo el 503 esperado');
      await m.ctx.close();
    } finally {
      mant.parar();
    }
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
    ok(!(await p.locator('#vistas').isVisible()), 'con 1 compra no hay selector de vistas (solo Precio)');
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
    ok(!(await p.locator('#vistas button[data-vista="valor"]').isVisible()), 'sin histórico no sale la vista de valor');
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
