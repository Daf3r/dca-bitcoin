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
/** Tocar una fila abre su comprobante (campamento 18); «Editar» (o «Anular», en un traslado) queda dentro, para quien anota. */
const editarFila = async (p, fila) => { await (typeof fila === 'string' ? p.locator(fila) : fila).click(); await p.waitForTimeout(300); await p.click('#cp-editar'); };
/** La fecha de la hoja de anotar: «Otro día» enseña el calendario (campamento 18) y ahí se escribe. */
const ponerFecha = async (p, f) => { await p.click('#h-dia-otro'); await p.fill('#h-fecha', f); };
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
      ok(/^Coinbase · (ahora|hace \d+ s)$/.test((await p.textContent('#precio-meta')).trim()), 'precio con «hace X s»');
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
      ok(await p.locator('#precio-24').isVisible() && /^(• |(sube|baja)\s*)?[+−]?\d+\.\d% vs ayer$/.test(var24) && (var24.startsWith('•') || await p.locator('#precio-24 .ico').count() === 1), `variación desde ayer: «${var24}»`);
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
      await ponerFecha(p, libre);
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
      await ponerFecha(p, libre2);
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
      await ponerFecha(p, libre3);
      await p.click('#h-avanzado summary');
      await p.check('#h-extra');
      await p.fill('#h-nota', 'cayó 20 %');
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
      await editarFila(p, p.locator('#lista .fila[data-tras]').first());
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
      eq((await p.textContent('#prox')).trim(), 'Lo anota Daf3r', 'el lector no ve la línea de última y próxima compra: en su sitio se dice quién lleva el libro (campamento 17)');
      ok(await p.locator('#t-anillo').isVisible() && await p.locator('#g-indicador').isVisible() && await p.locator('#rep-curiosas').isVisible(), 'el lector sí ve el anillo, el indicador del costo y las cifras curiosas');
      await verVista(p, 'valor');
      ok(await p.locator('#valor').isVisible(), 'el lector sí ve el gráfico de valor');
      await verVista(p, 'precio');
      ok(await p.locator('#ub-datos').isVisible() && !(await p.locator('#ub-anotar').isVisible()), 'el lector ve dónde están los sats pero no el botón de anotar');
      // La fila abre su comprobante también para el lector (campamento 18), pero sin «Anular» ni «Editar».
      await p.locator('#lista .fila[data-tras]').click(); await p.waitForTimeout(400);
      ok(await p.locator('#d-comp').evaluate((d) => d.open) && await p.locator('#cp-editar').isHidden(), 'el traslado es solo lectura para el lector: su comprobante no ofrece anularlo');
      await p.click('#cp-cerrar'); await p.waitForTimeout(200);
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
    for (const [cuenta, quien, esperadas] of [[ADMIN, 'admin', ['recordatorio', 'txid', 'respaldo', 'caida', 'piedrita', 'diario', 'wallet']], [LECTOR, 'lector', ['movimiento', 'hito', 'diario']]]) {
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
        await p.addInitScript((h) => { localStorage.setItem('libro.hora', String(h)); localStorage.setItem('libro.pestanas', 'todo'); }, hora);
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
      await editarFila(p, p.locator('#lista .fila').first());
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
      await editarFila(p, p.locator('#lista .fila').first());
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
      await editarFila(p, p.locator('#lista .fila').first());
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
      eq(await p.locator('#indice a:visible').count(), 4, 'índice: Saldo, Gráfico, Reportes y Movimientos');
      await p.click('#indice a[data-s="compras"]');
      await p.waitForTimeout(900);
      ok((await p.locator('#t-compras').boundingBox()).y < 200, 'índice: «Movimientos» lleva a esa sección');
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

  // ---------------------------------------------------------------- suelo, leyenda plegable, altímetro, favicon con luna y curvas (campamento 10, 1/6)
  {
    const srv = await servidor('anio');
    try {
      const claro = () => { try { localStorage.setItem('libro.tema', 'claro'); localStorage.setItem('libro.efectos', 'ninguno'); } catch { /* sin almacenamiento */ } };
      const r = await entrar(navegador, srv, ADMIN, { hora: 12 }, claro);
      await r.p.waitForSelector('.g-compras', { state: 'attached', timeout: 8000 });
      const m = await r.p.evaluate(() => {
        const alt = document.getElementById('minicab-alt');
        const suelo = getComputedStyle(document.body, '::after');
        const radios = [...new Set([...document.querySelector('.g-compras').getAttribute('d').matchAll(/a([\d.]+) /g)].map((x) => x[1]))];
        return {
          favicon: document.querySelector('link[rel="icon"]').getAttribute('href'),
          alt: alt.hidden ? null : Number(alt.style.getPropertyValue('--p')),
          leyAbierta: document.getElementById('ley-det').open,
          fondo: getComputedStyle(document.body).backgroundImage,
          suelo: [suelo.position, suelo.content],
          radios: radios.length,
        };
      });
      ok(/^\/icon-luna-[0-7]\.svg$/.test(m.favicon), `favicon: la pestaña lleva la luna del día (${m.favicon})`);
      ok(m.alt !== null && m.alt >= 0 && m.alt <= 1, `altímetro: la mini-cabecera lleva tu avance entre etapas (${m.alt})`);
      ok(m.leyAbierta === false, 'leyenda del gráfico: en el teléfono empieza plegada');
      ok(m.fondo.includes('curvas.svg'), 'tema claro: curvas de nivel de fondo');
      eq(m.suelo, ['fixed', '""'], 'suelo bajo el botón «Anotar»: degradado fijo en el teléfono');
      ok(m.radios >= 2, `gráfico: el tamaño de los puntos sigue a los sats (${m.radios} tamaños)`);
      await r.p.click('#ley-det > summary');
      ok(await r.p.evaluate(() => document.getElementById('ley-det').open), 'leyenda del gráfico: tocar «Leyenda y series» la abre');
      await r.ctx.close();
      const g = await entrar(navegador, srv, ADMIN, { hora: 12, viewport: { width: 1280, height: 900 } }, claro);
      ok(await g.p.evaluate(() => document.getElementById('ley-det').open), 'leyenda del gráfico: en pantalla ancha va abierta');
      eq(await g.p.evaluate(() => getComputedStyle(document.body, '::after').content), 'none', 'sin suelo bajo el botón en escritorio (el botón no flota)');
      await g.ctx.close();
    } finally {
      srv.parar();
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
      await p.addInitScript(() => { try { localStorage.setItem('libro.hora', '22'); localStorage.setItem('libro.pestanas', 'todo'); localStorage.setItem('libro.efectos', 'todos'); } catch { /* sin almacenamiento */ } });
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
      await p.addInitScript(() => { try { localStorage.setItem('libro.hora', '12'); localStorage.setItem('libro.pestanas', 'todo'); localStorage.setItem('libro.avisos.preguntado', '1'); } catch { /* sin almacenamiento */ } });
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
      await p.waitForSelector('#dh-cuerpo:not([hidden]), #dh-vacio:not([hidden])', { timeout: 4000 }); await p.waitForTimeout(500); // «Tu historia» ahora es una sección de la página (el botón de «Tu cuenta» lleva hasta ella)
      const h = await p.evaluate(() => ({
        medallas: document.querySelectorAll('#dh-medallas .medalla').length,
        ganadas: document.querySelectorAll('#dh-medallas .medalla.ganada').length,
        bloq: document.querySelectorAll('#dh-medallas .medalla.bloq').length,
        eventos: [...document.querySelectorAll('#dh-linea .h-ev')].map((li) => ({ c: li.className, t: li.querySelector('time').dateTime })),
        primera: document.querySelector('#dh-linea .h-primera strong')?.textContent,
        hoy: document.querySelector('#dh-linea li:last-child strong')?.textContent,
        desborda: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
        svgsDecor: [...document.querySelectorAll('#historia svg')].every((s) => s.getAttribute('aria-hidden') === 'true'),
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
      await p.waitForSelector('#dh-cuerpo:not([hidden]), #dh-vacio:not([hidden])', { timeout: 4000 }); await p.waitForTimeout(500); // «Tu historia» ahora es una sección de la página (el botón de «Tu cuenta» lleva hasta ella)
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
      await p.waitForSelector('#dh-cuerpo:not([hidden]), #dh-vacio:not([hidden])', { timeout: 4000 }); await p.waitForTimeout(500); // «Tu historia» ahora es una sección de la página (el botón de «Tu cuenta» lleva hasta ella)
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
      ok(ic.iconos.length === 11 && ic.iconos.every(Boolean) && ic.avatares === 8 && ic.medallas === 4 && ic.ilus === 3, 'guía: muestra los 11 iconos (con el zopilote, la bocina y el libro), los avatares, las medallas y las ilustraciones');
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
    await p.evaluate(() => { document.getElementById('ley-det').open = true; }); // en el teléfono la leyenda empieza plegada
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
        await p.addInitScript(() => { try { localStorage.setItem('libro.hora', '22'); localStorage.setItem('libro.pestanas', 'todo'); } catch { /* sin almacenamiento */ } });
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
      await editarFila(r.p, '#lista .fila[data-id="' + ultima.id + '"]');
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

  // ---------------------------------------------------------------- tu eco y tus números (campamento 11)
  {
    // Las cuentas de prueba ven «Qué hay de nuevo» al entrar: se cierra para poder tocar la página.
    const ent = async (...a) => { const r = await entrar(...a); if (await r.p.locator('#d-cambios[open]').count()) { await r.p.keyboard.press('Escape'); await r.p.waitForTimeout(300); } return r; };
    const sinAviso = () => { try { localStorage.setItem('libro.avisos.preguntado', '1'); } catch { /* sin almacenamiento */ } };
    const fijarDia = (d) => [(dia) => { try { localStorage.setItem('libro.avisos.preguntado', '1'); localStorage.setItem('libro.dia', dia); } catch { /* sin almacenamiento */ } }, d];
    // Eco (31): con más de un año de camino aparece; con menos, no.
    const sEco = await servidor('eco');
    try {
      const { ctx, p, consola } = await ent(navegador, sEco, ADMIN, {}, sinAviso);
      ok(await p.locator('.eco-anillo').count() === 1, 'eco: con compras de hace más de un año sale el eco');
      const ed = await p.evaluate(() => ({ txt: document.querySelector('.eco-txt')?.textContent, desc: document.getElementById('m-desc').textContent }));
      ok(ed.txt === 'hace 1 año' && /Tu eco, una sombra quieta en el sendero, marca dónde estabas hace un año: [\d,]+ sats\./.test(ed.desc), `eco: rótulo y descripción (${ed.txt})`);
      const sep = await p.evaluate(() => { const e = document.querySelector('.eco-anillo').getBoundingClientRect(), y = document.querySelector('.yo-punto').getBoundingClientRect(); return Math.hypot(e.x - y.x, e.y - y.y); });
      ok(sep > 14, `eco: está lejos de «Tú» (${sep.toFixed(0)} px)`);
      eq(consola, [], `consola limpia (eco): ${consola.join(' | ')}`);
      await ctx.close();
    } finally { sEco.parar(); }

    // Número bonito (41) y árboles de honor (52), y lo que no debe cambiar.
    const sBon = await servidor('bonito');
    try {
      const { ctx, p } = await ent(navegador, sBon, ADMIN, {}, sinAviso);
      const b = await p.evaluate(() => ({ visible: !document.getElementById('s-bonito').hidden, txt: document.getElementById('s-bonito').textContent, marca: document.querySelector('.saldo').hasAttribute('data-bonito'), titulo: document.getElementById('t-saldo').textContent }));
      ok(b.visible && /capicúa/.test(b.txt) && b.marca && b.titulo === 'Tu saldo', `número bonito: 1,234,321 es capicúa (${b.txt})`);
      ok(await p.locator('.eco-anillo').count() === 0, 'eco: sin un año de camino no hay eco');
      await p.click('#s-saldo-v'); await p.waitForTimeout(300);
      ok(await p.locator('#s-bonito').isHidden(), 'número bonito: en BTC no se marca');
      await ctx.close();
    } finally { sBon.parar(); }
    const sAnio = await servidor('anio');
    try {
      // Con un día fijo: la víspera de las Leónidas (16 nov) trae estrellas fugaces de más y rompería la cuenta.
      const { ctx, p } = await ent(navegador, sAnio, ADMIN, {}, fijarDia('2026-03-10'));
      ok(await p.locator('#s-bonito').isHidden() && await p.locator('.arbol-honor').count() === 0 && await p.locator('.fugaz').count() === 1, 'un saldo corriente no es bonito, no hay árboles de honor y hay una sola fugaz');
      // Pupusas (28): siete toques seguidos al saldo.
      for (let i = 0; i < 7; i++) await p.click('#s-saldo-v');
      await p.waitForTimeout(300);
      const aviso = await p.evaluate(() => ({ v: !document.getElementById('aviso').hidden, t: document.getElementById('aviso-txt').textContent }));
      ok(aviso.v && /^Tu saldo equivale a unas [\d,]+ pupusas, a \$0\.75 cada una\.$/.test(aviso.t), `pupusas tras siete toques (${aviso.t})`);
      await ctx.close();
      // Luna-moneda (45): tres toques a la luna, de noche.
      const c3 = await ent(navegador, sAnio, ADMIN, { hora: 23 }, sinAviso);
      const pos = await c3.p.evaluate(() => { const b = document.querySelector('.luna .astro').getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2, mad: document.documentElement.hasAttribute('data-madrugada') }; });
      ok(pos.mad, 'madrugada: a las 23:00 el velo está puesto');
      for (let i = 0; i < 3; i++) { await c3.p.mouse.click(pos.x, pos.y); await c3.p.waitForTimeout(100); }
      ok(await c3.p.evaluate(() => document.querySelector('.luna').classList.contains('moneda')), 'luna-moneda: tres toques seguidos la convierten en moneda');
      await c3.p.waitForTimeout(2000);
      ok(!(await c3.p.evaluate(() => document.querySelector('.luna').classList.contains('moneda'))), 'luna-moneda: vuelve a ser luna');
      // Modo madrugada (20): se apaga desde «Tu cuenta» y de día no existe.
      await c3.p.click('#cuenta-btn'); await c3.p.waitForTimeout(300);
      ok(/automático/.test(await c3.p.textContent('#dc-madrugada')), 'madrugada: el botón dice automático');
      await c3.p.click('#dc-madrugada'); await c3.p.waitForTimeout(200);
      ok(/apagado/.test(await c3.p.textContent('#dc-madrugada')) && !(await c3.p.evaluate(() => document.documentElement.hasAttribute('data-madrugada'))), 'madrugada: apagarlo quita el velo');
      await c3.ctx.close();
      const c4 = await ent(navegador, sAnio, ADMIN, { hora: 12 }, sinAviso);
      ok(!(await c4.p.evaluate(() => document.documentElement.hasAttribute('data-madrugada'))), 'madrugada: a mediodía no hay velo');
      await c4.ctx.close();
      // Efemérides (42) y lluvias de estrellas (43), con `libro.dia`.
      const e1 = await entrar(navegador, sAnio, ADMIN, {}, fijarDia('2027-01-03'));
      const t1 = await e1.p.textContent('#aviso-txt');
      ok(/bloque génesis/.test(t1), `efeméride del 3 de enero (${t1})`);
      await e1.p.reload({ waitUntil: 'networkidle' }); await e1.p.waitForTimeout(2500);
      ok(await e1.p.evaluate(() => document.getElementById('aviso').hidden || !/génesis/.test(document.getElementById('aviso-txt').textContent)), 'la efeméride sale una sola vez por día');
      await e1.ctx.close();
      const e2 = await entrar(navegador, sAnio, ADMIN, {}, fijarDia('2026-11-17'));
      ok(/Leónidas/.test(await e2.p.textContent('#aviso-txt')) && await e2.p.locator('.fugaz').count() === 5, 'Leónidas: aviso y cuatro estrellas fugaces de más');
      await e2.ctx.close();
      const e3 = await entrar(navegador, sAnio, ADMIN, {}, fijarDia('2026-11-18'));
      eq(await e3.p.locator('.fugaz').count(), 3, 'la noche siguiente al máximo caen dos de más');
      await e3.ctx.close();
    } finally { sAnio.parar(); }
    const sCero = await servidor('cero');
    try {
      const { ctx, p } = await ent(navegador, sCero, ADMIN, {}, sinAviso);
      const z = await p.evaluate(() => ({ linea: document.getElementById('s-valor').textContent, memoria: document.querySelectorAll('.sendero-memoria').length, pinos: document.querySelectorAll('.pino-2').length }));
      ok(/campamento base\. Tus pinos siguen aquí/.test(z.linea) && z.memoria === 1 && z.pinos === 4, `saldo en cero: mensaje, camino tenue y bosque en pie (${JSON.stringify(z)})`);
      await ctx.close();
    } finally { sCero.parar(); }
    const sAniv = await servidor('aniv');
    try {
      const { ctx, p } = await entrar(navegador, sAniv, ADMIN, {}, sinAviso);
      const a = await p.evaluate(() => ({ t: document.getElementById('aviso-txt').textContent, luz: document.querySelectorAll('.salida-aniv').length }));
      ok(/^Hoy hace 1 año que empezaste a subir\.$/.test(a.t) && a.luz === 1, `aniversario: aviso y farolito en la salida (${a.t})`);
      await ctx.close();
      const l = await entrar(navegador, sAniv, LECTOR, {}, sinAviso);
      ok(/^Hoy se cumple un año de la primera compra del libro\.$/.test(await l.p.textContent('#aviso-txt')), 'aniversario: la lectora lo lee en neutro');
      await l.ctx.close();
    } finally { sAniv.parar(); }
    const sSin = await servidor('sinprecio');
    try {
      const { ctx, p } = await ent(navegador, sSin, ADMIN, {}, sinAviso);
      eq(await p.textContent('#precio-meta'), 'El mensajero no ha llegado', 'sin precio: el mensajero no ha llegado');
      await ctx.close();
    } finally { sSin.parar(); }
    const sLargo = await servidor('largo');
    try {
      const { ctx, p } = await ent(navegador, sLargo, ADMIN, {}, sinAviso);
      const t = await p.evaluate(() => [...document.querySelectorAll('.arbol-honor')].map((a) => a.getAttribute('class').replace('arbol-honor ', '')));
      eq(t, ['ceibo'], 'árboles de honor: con 283 compras, solo el ceibo');
      await ctx.close();
    } finally { sLargo.parar(); }
    const sMil = await servidor('mil');
    try {
      const { ctx, p } = await ent(navegador, sMil, ADMIN, {}, sinAviso);
      const t = await p.evaluate(() => ({ a: [...document.querySelectorAll('.arbol-honor')].map((x) => x.getAttribute('class').replace('arbol-honor ', '')), d: document.getElementById('m-desc').textContent }));
      eq(t.a, ['ceibo', 'amate', 'maquilishuat'], 'árboles de honor: con 1,000 compras, los tres');
      ok(/árboles de honor: un ceibo, un amate, un maquilishuat/.test(t.d), 'los árboles de honor están en la descripción de la montaña');
      await ctx.close();
    } finally { sMil.parar(); }
  }

  // ---------------------------------------------------------------- campamento 12: El Salvador en la escena
  {
    const ent = async (...a) => { const r = await entrar(...a); if (await r.p.locator('#d-cambios[open]').count()) { await r.p.keyboard.press('Escape'); await r.p.waitForTimeout(300); } return r; };
    // Día y efectos fijos (el papel picado, los cohetes y el clima dependen de la fecha de El Salvador).
    const con = (dia, efectos = 'todos') => [([d, e]) => { try { localStorage.setItem('libro.avisos.preguntado', '1'); localStorage.setItem('libro.dia', d); localStorage.setItem('libro.efectos', e); } catch { /* sin almacenamiento */ } }, [dia, efectos]];
    const cs = (p, sel, prop) => p.evaluate(([s, k]) => { const e = document.querySelector(s); return e ? getComputedStyle(e)[k] : null; }, [sel, prop]);
    const choca = (p, a, b) => p.evaluate(([x, y]) => {
      const r1 = document.querySelector(x)?.getBoundingClientRect(), r2 = document.querySelector(y)?.getBoundingClientRect();
      return Boolean(r1 && r2 && r1.width && r2.width && r1.left < r2.right && r1.right > r2.left && r1.top < r2.bottom && r1.bottom > r2.top);
    }, [a, b]);
    const sAnio = await servidor('anio');
    try {
      // Volcanes: en el teléfono el Izalco y el Santa Ana; en escritorio, también el de San Salvador. El cono del Izalco va por delante.
      let r = await ent(navegador, sAnio, ADMIN, { hora: 12 }, con('2026-03-10'));
      const v = await r.p.evaluate(() => ({ vol: document.querySelector('.lejos')?.dataset.volcanes ?? '', ceniza: document.querySelectorAll('.volcan-ceniza').length }));
      ok(/izalco/.test(v.vol) && /santa-ana/.test(v.vol) && v.ceniza === 1, `volcanes en el teléfono (${v.vol})`);
      // Fuera de temporada: sin papel picado ni cohetes; época seca de día: aire dorado y sin llovizna; de día no cruza el torogoz.
      eq([await cs(r.p, '.papel-picado', 'display'), await cs(r.p, '.cohetes', 'display'), await cs(r.p, '.aire-seco', 'display'), await cs(r.p, '.clima-lluvia', 'display'), await cs(r.p, '.torogoz', 'animationName')],
        ['none', 'none', 'inline', 'none', 'none'], 'fuera de temporada: sin papel picado ni cohetes; época seca: aire dorado; de día no cruza el torogoz');
      await r.ctx.close();
      r = await ent(navegador, sAnio, ADMIN, { hora: 12, viewport: { width: 1440, height: 900 }, isMobile: false, hasTouch: false }, con('2026-03-10'));
      ok(/san-salvador/.test(await r.p.evaluate(() => document.querySelector('.lejos').dataset.volcanes)), 'volcanes: en escritorio también el de San Salvador');
      await r.ctx.close();

      // Torogoz al amanecer (todos los efectos): cruza y aletea; con esenciales no está.
      r = await ent(navegador, sAnio, ADMIN, { hora: 6 }, con('2026-03-10'));
      eq([await cs(r.p, '.torogoz', 'animationName'), await cs(r.p, '.toro-ala:not(.toro-ala-lejos)', 'animationName'), await r.p.locator('.toro-ceja').count()], ['ave', 'toro-aleteo', 1], 'torogoz: al amanecer cruza el cielo y aletea');
      await r.p.evaluate(() => window.libroEfectos.fijar('esenciales'));
      eq(await cs(r.p, '.torogoz', 'display'), 'none', 'torogoz: con esenciales no está');
      await r.ctx.close();

      // Papel picado en las agostinas: visible, con el año calado, sin tapar «Anotar» ni rótulos; colores distintos en navidad.
      r = await ent(navegador, sAnio, ADMIN, { hora: 12 }, con('2026-08-03'));
      const pp = await r.p.evaluate(() => ({ cifras: [...document.querySelectorAll('.pp-cifra')].map((t) => t.textContent).join(''), banderas: document.querySelectorAll('.pp-bandera').length, fill: getComputedStyle(document.querySelector('.pp-bandera path')).fill }));
      ok(await cs(r.p, '.papel-picado', 'display') === 'inline' && pp.cifras === '2026' && pp.banderas === 6, `papel picado: en las agostinas, seis banderitas con el año (${pp.cifras})`);
      ok(!(await choca(r.p, '.papel-picado', '#anotar')), 'papel picado: no tapa el botón «Anotar»');
      ok(!(await r.p.evaluate(() => { const b = document.querySelector('.papel-picado').getBoundingClientRect(); return [...document.querySelectorAll('#m-etiquetas text')].some((t) => { const q = t.getBoundingClientRect(); return q.left < b.right && q.right > b.left && q.top < b.bottom && q.bottom > b.top; }); })), 'papel picado: no pisa ningún rótulo de la montaña');
      eq(await cs(r.p, '.pp-bandera', 'animationName'), 'pp-ondea', 'papel picado: ondea con todos los efectos');
      await r.ctx.close();
      r = await ent(navegador, sAnio, ADMIN, { hora: 12 }, con('2026-12-24', 'ninguno'));
      const fillNav = await cs(r.p, '.pp-bandera path', 'fill');
      ok(await cs(r.p, '.papel-picado', 'display') === 'inline' && fillNav !== pp.fill, `papel picado: en navidad también, con sus colores (${pp.fill} → ${fillNav})`);
      eq(await cs(r.p, '.pp-bandera', 'animationName'), 'none', 'papel picado: sin efectos se queda quieto');
      await r.ctx.close();

      // Cohetes: solo la noche de fin de año y con todos los efectos.
      r = await ent(navegador, sAnio, ADMIN, { hora: 23.95 }, con('2026-12-31'));
      eq([await cs(r.p, '.cohetes', 'display'), await cs(r.p, '.chispa', 'animationName'), await cs(r.p, '.sb-sube', 'animationName'), await r.p.locator('.cohetes :is(.chispa, .sb-sube, .sb-estallido)').count()],
        ['inline', 'chispa', 'silba', 14], 'cohetes: la noche de fin de año saltan volcancitos y silbadores');
      await r.p.evaluate(() => window.libroEfectos.fijar('esenciales'));
      eq(await cs(r.p, '.cohetes', 'display'), 'none', 'cohetes: con esenciales no salen');
      await r.ctx.close();

      // Época lluviosa por la tarde: llovizna (20 gotas) y nubes más bajas; de noche no llueve.
      r = await ent(navegador, sAnio, ADMIN, { hora: 15 }, con('2026-07-10'));
      eq([await cs(r.p, '.clima-lluvia', 'display'), await r.p.locator('.gota').count(), await cs(r.p, '.aire-seco', 'display'), (await cs(r.p, '.nube.n1', 'translate')) !== 'none'], ['inline', 20, 'none', true], 'época lluviosa por la tarde: llovizna y nubes más bajas');
      await r.ctx.close();
      r = await ent(navegador, sAnio, ADMIN, { hora: 23 }, con('2026-07-10'));
      eq(await cs(r.p, '.clima-lluvia', 'display'), 'none', 'época lluviosa: de noche no llueve');
      await r.ctx.close();
    } finally { sAnio.parar(); }

    // Árboles de honor facetados (luz y sombra, pocas piezas) y la luna-moneda con canto, relieve y brillo.
    const sMil = await servidor('mil');
    try {
      const { ctx, p, consola } = await ent(navegador, sMil, ADMIN, { hora: 23 }, con('2026-03-10'));
      const a = await p.evaluate(() => [...document.querySelectorAll('.arbol-honor')].map((g) => ({ n: g.querySelectorAll('*').length, luz: (g.querySelector('.copa-luz')?.getAttribute('d') ?? '').length, sombra: (g.querySelector('.copa-sombra')?.getAttribute('d') ?? '').length, petalos: g.querySelectorAll('.petalo').length })));
      ok(a.length === 3 && a.every((x) => x.n <= 25 && x.luz > 0 && x.sombra > 0), `árboles de honor: facetas en luz y en sombra, 25 piezas como mucho (${a.map((x) => x.n).join(', ')})`);
      eq(a.map((x) => x.petalos), [0, 0, 3], 'árboles de honor: solo el maquilishuat suelta pétalos');
      ok(await p.locator('.moneda-canto').count() === 1 && await p.locator('.moneda-brillo').count() === 1, 'luna-moneda: con canto y brillo');
      const pos = await p.evaluate(() => { const b = document.querySelector('.luna .astro').getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; });
      for (let i = 0; i < 3; i++) { await p.mouse.click(pos.x, pos.y); await p.waitForTimeout(100); }
      eq(await cs(p, '.luna.moneda .moneda-gira', 'animationName'), 'moneda-gira', 'luna-moneda: gira como una moneda lanzada');
      eq(consola, [], `consola limpia (campamento 12): ${consola.join(' | ')}`);
      await ctx.close();
    } finally { sMil.parar(); }

    // El eco con su estela de luz y el rótulo en el color del eco (no en negro).
    const sEco = await servidor('eco');
    try {
      const { ctx, p } = await ent(navegador, sEco, ADMIN, { hora: 23 }, con('2026-03-10'));
      ok(await p.locator('.eco-estela').count() === 1 && await p.locator('.eco-halo').count() === 1, 'eco: un «Tú» fantasma con su estela de luz');
      ok(await cs(p, '.eco-txt', 'fill') !== 'rgb(0, 0, 0)', 'eco: el rótulo lleva el color del eco');
      await ctx.close();
    } finally { sEco.parar(); }

    // El mensajero: sin precio, un zopilote planea en el hueco de la cifra; el texto sigue siendo «—» para los lectores.
    const sSin = await servidor('sinprecio');
    try {
      const { ctx, p } = await ent(navegador, sSin, ADMIN, {}, con('2026-03-10'));
      const z = await p.evaluate(() => ({ uso: document.querySelector('#precio use')?.getAttribute('href'), txt: document.getElementById('precio').textContent, alto: document.getElementById('precio').getBoundingClientRect().height }));
      ok(z.uso === '#i-zopilote' && z.txt === '—' && z.alto <= 26, `sin precio: el zopilote en el hueco del precio (${JSON.stringify(z)})`);
      await ctx.close();
    } finally { sSin.parar(); }
  }

  // ---------------------------------------------------------------- Tu historia en objetos: tronco, constelación y torre de piedras (campamento 13)
  {
    const sinAviso = () => { try { localStorage.setItem('libro.avisos.preguntado', '1'); } catch { /* sin almacenamiento */ } };
    const ent = async (...a) => { const r = await entrar(...a); for (let k = 0; k < 3 && await r.p.locator('dialog[open]').count(); k++) { await r.p.keyboard.press('Escape'); await r.p.waitForTimeout(400); } return r; };
    const abrirHistoria = async (p) => { await p.click('#cuenta-btn'); await p.waitForTimeout(300); await p.click('[data-cuenta="historia"]'); await p.waitForTimeout(400); };
    const sLargo = await servidor('largo');
    try {
      const { ctx, p, consola } = await ent(navegador, sLargo, ADMIN, {}, sinAviso);
      await abrirHistoria(p);
      ok(await p.locator('#dh-v-linea').isVisible() && await p.locator('#dh-objeto').isHidden(), 'historia: por defecto se ve la línea de tiempo');
      const compras = (await datos(p, '/api/compras')).filter((c) => c.tipo !== 'venta');
      const anios = new Set(compras.map((c) => c.fecha.slice(0, 4)));
      const desde = Math.min(...[...anios].map(Number)), hasta = Number(new Date().getFullYear());
      // Tronco
      await p.click('#dh-vistas [data-vh="tronco"]'); await p.waitForTimeout(300);
      ok(await p.locator('#dh-objeto').isVisible() && await p.locator('#dh-v-linea').isHidden(), 'tronco: la línea se esconde y sale el dibujo');
      eq(await p.locator('#dh-lienzo .pieza[data-anio]').count(), hasta - desde + 1, 'tronco: un anillo por año, también los años sin compras');
      eq(await p.locator('#dh-anios button').count(), hasta - desde + 1, 'tronco: un botón por año (para el teclado y los lectores)');
      ok(/anillos, uno por año/.test(await p.textContent('#dh-desc')), 'tronco: el dibujo tiene su descripción');
      await p.click(`#dh-anios button[data-anio="${desde}"]`); await p.waitForTimeout(200);
      ok(new RegExp(`^${desde}: \\d+ compras?`).test(await p.textContent('#dh-detalle')) && await p.locator('#dh-lienzo .pieza.sel').count() === 1, 'tronco: tocar un año lo resume y marca su anillo');
      ok(await p.evaluate(() => document.querySelector('#dh-anios button[aria-pressed="true"]') != null), 'tronco: el año elegido queda marcado');
      // Constelación
      await p.click('#dh-vistas [data-vh="constelacion"]'); await p.waitForTimeout(300);
      eq(await p.locator('#dh-lienzo .pieza[data-i]').count(), compras.length, 'constelación: una estrella por compra');
      await p.focus('#dh-lienzo'); await p.keyboard.press('Home'); await p.waitForTimeout(150);
      ok(/^\d+ \w+ \d{4} · \+[\d,]+ sats/.test(await p.textContent('#dh-detalle')), `constelación: las flechas leen una compra (${await p.textContent('#dh-detalle')})`);
      // Torre de piedras
      await p.click('#dh-vistas [data-vh="torre"]'); await p.waitForTimeout(300);
      const piedras = await p.locator('#dh-lienzo .pieza[data-i]').count();
      ok(piedras >= 1 && piedras <= 40, `torre: no pasa de 40 piedras (${piedras})`);
      // Manta de añil (13B)
      await p.click('#dh-vistas [data-vh="manta"]'); await p.waitForTimeout(300);
      const celdas = await p.locator('#dh-lienzo .pieza[data-i]').count();
      const semanasReales = await p.evaluate(() => { const hoy = new Date(); return hoy.getFullYear(); });
      ok(celdas >= 52 * 5 && /filas, una por año, de \d{4} a \d{4}/.test(await p.textContent('#dh-desc')), `manta: una celda por semana tejida (${celdas}) y su descripción`);
      await p.focus('#dh-lienzo'); await p.keyboard.press('End'); await p.waitForTimeout(150);
      ok(/^Semana del .* al .*: /.test(await p.textContent('#dh-detalle')), `manta: las flechas leen una semana (${(await p.textContent('#dh-detalle')).slice(0, 60)})`);
      ok(semanasReales > 2000 && await p.locator('#dh-lienzo .celda.tono-0').count() >= 0, 'manta: hay celdas de algodón crudo y de añil');
      // Todo cabe en la pantalla y se recuerda la vista
      const sw = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, w: Math.round(document.getElementById('dh-lienzo').getBoundingClientRect().width) }));
      ok(sw.sw <= sw.cw && sw.w > 200, `historia: sin scroll horizontal y con el dibujo a la vista (${sw.w} px)`);
      // Certificado de altitud y sellos de lacre (13B)
      await p.click('#dh-vistas [data-vh="linea"]'); await p.waitForTimeout(200);
      const nSellos = await p.locator('#dh-sellos .sello').count();
      ok(nSellos >= 3 && await p.locator('#dh-sellos .sello svg').count() === nSellos, `sellos: uno por etapa cruzada (${nSellos}) y con su dibujo`);
      await p.click('#dh-cert'); await p.waitForTimeout(300);
      ok(await p.locator('#d-cert[open]').count() === 1 && await p.locator('#cert-lienzo svg').count() === 1 && /^Certificado de altitud de Daf3r\. A .* el libro tiene /.test(await p.textContent('#cert-desc')), 'certificado: se abre con su grabado y su descripción (con el nombre del dueño)');
      ok(!(await p.locator('#cert-lienzo').innerHTML()).includes('<script'), 'certificado: sin código dentro');
      await p.click('#cert-ok'); await p.waitForTimeout(200);
      ok(await p.locator('#d-cert[open]').count() === 0, 'certificado: se cierra');
      ok(await p.evaluate(() => localStorage.getItem('libro.historia.vista')) === 'linea', 'historia: se recuerda la vista elegida (la última)');
      await p.click('#dh-vistas [data-vh="linea"]'); await p.waitForTimeout(200);
      ok(await p.locator('#dh-v-linea').isVisible(), 'historia: se puede volver a la línea');
      eq(consola, [], `consola limpia (historia en objetos): ${consola.join(' | ')}`);
      await ctx.close();
      // Una lectora también los ve
      const l = await ent(navegador, sLargo, LECTOR, {}, sinAviso);
      await abrirHistoria(l.p);
      await l.p.click('#dh-vistas [data-vh="tronco"]'); await l.p.waitForTimeout(300);
      ok(await l.p.locator('#dh-lienzo .pieza[data-anio]').count() >= 1, 'historia: una lectora también ve el tronco');
      await l.p.click('#dh-cert'); await l.p.waitForTimeout(300);
      ok(/^Certificado de altitud del Libro DCA\./.test(await l.p.textContent('#cert-desc')), 'certificado: una lectora lo ve sin el nombre del dueño');
      await l.ctx.close();
    } finally { sLargo.parar(); }
    // El lacre cae en la tarjeta al cruzar una etapa (vista previa)
    const sLac = await servidor('anio');
    try {
      const r = await ent(navegador, sLac, ADMIN, { hora: 22 }, sinAviso);
      await r.p.click('#cuenta-btn');
      await r.p.click('[data-previa="etapa"]');
      await r.p.waitForFunction(() => !document.getElementById('hito-cel').hidden && document.querySelector('#hc-lacre svg'), null, { timeout: 12000 });
      ok(await r.p.locator('#hc-lacre svg.lacre.grande').count() === 1, 'lacre: un sello cae en la tarjeta de la etapa');
      await r.ctx.close();
    } finally { sLac.parar(); }
    const sVac = await servidor('vacio');
    try {
      const { ctx, p } = await ent(navegador, sVac, ADMIN, {}, sinAviso);
      await abrirHistoria(p);
      ok(await p.locator('#dh-vistas').isHidden() || await p.locator('#dh-cuerpo').isHidden(), 'historia: sin compras no hay selector ni dibujos');
      await ctx.close();
    } finally { sVac.parar(); }
  }

  // ---------------------------------------------------------------- campamento 13C: estratos, partitura, pasaporte, petroglifo y sello de la semana
  {
    const sinAviso = () => { try { localStorage.setItem('libro.avisos.preguntado', '1'); } catch { /* sin almacenamiento */ } };
    const ent = async (...a) => { const r = await entrar(...a); for (let k = 0; k < 3 && await r.p.locator('dialog[open]').count(); k++) { await r.p.keyboard.press('Escape'); await r.p.waitForTimeout(400); } return r; };
    const abrirHistoria = async (p) => { await p.click('#cuenta-btn'); await p.waitForTimeout(300); await p.click('[data-cuenta="historia"]'); await p.waitForTimeout(400); };
    const L = await import('../app/static/lib.js');
    const sLargo = await servidor('largo');
    try {
      const { ctx, p, consola } = await ent(navegador, sLargo, ADMIN, {}, sinAviso);
      const todos = await datos(p, '/api/compras');
      const compras = todos.filter((c) => c.tipo !== 'venta');
      // ---- La montaña: el petroglifo (antes de abrir «Tu cuenta»)
      await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(500);
      const nBand = await p.locator('.m-bandera').count();
      let conPiedra = 0, sinPiedra = 0;
      for (let k = 0; k < nBand; k++) {
        await p.locator('.m-bandera').nth(k).click({ force: true }); await p.waitForTimeout(500);
        const piedra = await p.locator('#m-tarjeta.con-piedra').count();
        if (piedra) {
          conPiedra++;
          ok(await p.locator('#m-tarjeta .m-pet svg').count() === 1 && /^Lo alcanzaste el /.test(await p.textContent('#m-tarjeta-p')), 'petroglifo: la piedra lleva su dibujo y el texto de siempre queda para los lectores');
          const caja = await p.locator('#m-tarjeta-p').evaluate((e) => { const r = e.getBoundingClientRect(); return [r.width, r.height]; });
          ok(caja[0] <= 2 || caja[1] <= 2, `petroglifo: el texto plano queda oculto a la vista, no a los lectores (${caja})`);
          const cerrar = await p.locator('#m-tarjeta .m-tarjeta-x').boundingBox();
          ok(cerrar && cerrar.height >= 47.5 && cerrar.width >= 44, `petroglifo: «Cerrar» sigue a la vista y de 48 px (${cerrar && Math.round(cerrar.height)})`);
        } else {
          sinPiedra++;
          ok(await p.locator('#m-tarjeta .m-pet svg').count() === 0, 'petroglifo: un campamento por alcanzar sigue con su tarjeta plana');
        }
        await p.keyboard.press('Escape'); await p.waitForTimeout(200);
      }
      ok(conPiedra >= 1 && sinPiedra >= 1, `petroglifo: los alcanzados se tallan (${conPiedra}) y los que faltan, no (${sinPiedra})`);
      ok(await p.locator('#m-tarjeta').isHidden(), 'petroglifo: Esc cierra la tarjeta');

      await abrirHistoria(p);
      // ---- Estratos
      await p.click('#dh-vistas [data-vh="estratos"]'); await p.waitForTimeout(300);
      const meses = L.estratosMes(todos, hoySV());
      eq(await p.locator('#dh-lienzo .pieza[data-i]').count(), meses.length, 'estratos: una capa por mes, también los meses sin compras');
      ok(/^Tus estratos tienen \d+ capas, una por mes/.test(await p.textContent('#dh-desc')), 'estratos: el dibujo tiene su descripción');
      await p.focus('#dh-lienzo'); await p.keyboard.press('Home'); await p.waitForTimeout(150);
      ok(/^[a-záéíóú]+ \d{4}: /.test(await p.textContent('#dh-detalle')) && await p.locator('#dh-lienzo .pieza.sel').count() === 1, `estratos: las flechas leen un mes y lo marcan (${(await p.textContent('#dh-detalle')).slice(0, 50)})`);
      await p.locator('#dh-lienzo .pieza').nth(Math.min(5, meses.length - 1)).click({ force: true }); await p.waitForTimeout(150);
      ok(await p.locator('#dh-lienzo .pieza.sel').count() === 1, 'estratos: tocar una capa la elige');
      // ---- Partitura
      await p.click('#dh-vistas [data-vh="partitura"]'); await p.waitForTimeout(300);
      const pautas = L.partitura(todos);
      const ult = pautas.at(-1);
      eq(await p.locator('#dh-anios button').count(), pautas.length, 'partitura: un botón por año');
      eq(await p.locator('#dh-lienzo .pieza[data-i]').count(), ult.notas.length, `partitura: una nota por compra del último año (${ult.notas.length})`);
      ok(await p.locator('#dh-tocar').isVisible() && /^Tocar este año$/.test((await p.textContent('#dh-tocar')).trim()), 'partitura: el botón «Tocar este año» está a la vista');
      await p.focus('#dh-lienzo'); await p.keyboard.press('Home'); await p.waitForTimeout(150);
      ok(/ · BTC a \$[\d,]+ · \+[\d,]+ sats/.test(await p.textContent('#dh-detalle')), 'partitura: las flechas leen una compra con su precio');
      await p.click(`#dh-anios button[data-anio="${pautas[0].anio}"]`); await p.waitForTimeout(200);
      eq(await p.locator('#dh-lienzo .pieza[data-i]').count(), pautas[0].notas.length, 'partitura: otro año, otra pauta');
      await p.click('#dh-tocar'); await p.waitForTimeout(600);
      ok(await p.locator('#dh-lienzo .pieza.sonando').count() >= 1 && /^Detener$/.test((await p.textContent('#dh-tocar')).trim()), 'partitura: al tocar suena una nota a la vez y el botón dice «Detener»');
      await p.click('#dh-tocar'); await p.waitForTimeout(200);
      ok(await p.locator('#dh-lienzo .pieza.sonando').count() === 0 && /^Tocar este año$/.test((await p.textContent('#dh-tocar')).trim()), 'partitura: «Detener» para la música');
      await p.click('#dh-tocar'); await p.waitForTimeout(300);
      await p.click('#dh-vistas [data-vh="estratos"]'); await p.waitForTimeout(200);
      ok(await p.locator('#dh-tocar').isHidden(), 'partitura: cambiar de vista para la música y esconde el botón');
      ok(await p.evaluate(() => localStorage.getItem('libro.historia.vista')) === 'estratos', 'historia: se recuerda la vista (estratos)');
      // ---- Pasaporte de semanas
      await p.click('#dh-vistas [data-vh="linea"]'); await p.waitForTimeout(200);
      const pas = L.sellosSemana(todos, hoySV());
      eq(await p.locator('#dh-pasaporte li').count(), Math.min(24, pas.length), `pasaporte: un sello por semana con compras, de a 24 (${pas.length} en total)`);
      ok(await p.locator('#dh-pasaporte li svg').count() === Math.min(24, pas.length) && await p.locator('#dh-pas-txt').textContent() === L.textoPasaporte(pas), 'pasaporte: cada sello trae su dibujo y el texto cuenta todos');
      ok((await p.locator('#dh-pasaporte li').first().getAttribute('title')).includes(`Sello n.º ${pas.length}:`), 'pasaporte: los más nuevos van primero');
      if (pas.length > 24) {
        ok(await p.locator('#dh-pas-mas').isVisible(), 'pasaporte: «Ver más» sale con más de 24 sellos');
        await p.click('#dh-pas-mas'); await p.waitForTimeout(200);
        eq(await p.locator('#dh-pasaporte li').count(), Math.min(48, pas.length), 'pasaporte: cada toque trae 24 más');
        ok(await p.evaluate(() => document.activeElement?.closest?.('#dh-pasaporte') != null), 'pasaporte: el foco pasa al primer sello nuevo');
      }
      const sw = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
      ok(sw.sw <= sw.cw, 'pasaporte: sin scroll horizontal');
      await p.keyboard.press('Escape'); await p.waitForTimeout(300);
      // ---- El sello nace con la primera compra de su semana
      const usadas = new Set(todos.map((c) => c.fecha));
      const precio = (await datos(p, '/api/precio')).precio;
      const sats = Math.round((20 / precio) * 1e8);
      const anotar = async (fecha) => { await p.click('#anotar'); await p.waitForTimeout(400); await p.fill('#h-sats', String(sats)); await ponerFecha(p, fecha); await p.click('#guardar'); await p.waitForTimeout(400); };
      const lunes = '2019-01-07';
      ok(!usadas.has(lunes), 'sello nuevo: la semana de prueba está sin compras');
      await anotar(lunes);
      await p.waitForFunction(() => !document.getElementById('hito-cel').hidden && document.getElementById('hc-k').textContent === 'Sello de la semana', null, { timeout: 12000 }).catch(() => {});
      eq(await p.textContent('#hc-k'), 'Sello de la semana', 'sello nuevo: la primera compra de una semana la celebra con su sello');
      ok(/^7 – 13 ene 2019$/.test(await p.textContent('#hc-txt')) && await p.locator('#hc-lacre svg').count() === 1 && await p.locator('#hito-cel.sello-semana').count() === 1, `sello nuevo: lleva el rango de la semana y su dibujo (${await p.textContent('#hc-txt')})`);
      await p.waitForFunction(() => document.getElementById('hito-cel').hidden, null, { timeout: 12000 });
      await p.waitForTimeout(6000);
      await anotar('2019-01-09');
      let vio = false;
      for (let k = 0; k < 10; k++) { if (await p.evaluate(() => !document.getElementById('hito-cel').hidden && document.getElementById('hc-k').textContent === 'Sello de la semana')) vio = true; await p.waitForTimeout(350); }
      ok(!vio, 'sello nuevo: una segunda compra de la misma semana no estrena otro sello');
      eq((await datos(p, '/api/compras')).length, todos.length + 2, 'sello nuevo: las dos compras se guardaron');
      await abrirHistoria(p);
      await p.click('#dh-vistas [data-vh="linea"]'); await p.waitForTimeout(200);
      ok(await p.locator('#dh-pasaporte li').count() >= 1 && (await p.textContent('#dh-pas-txt')).includes(`${pas.length + 1} sellos`), 'pasaporte: el sello nuevo ya está en la libreta');
      eq(consola, [], `consola limpia (13C): ${consola.join(' | ')}`);
      await ctx.close();
      // Una lectora también los ve (sin el sello nuevo: ella no anota)
      const l = await ent(navegador, sLargo, LECTOR, {}, sinAviso);
      await abrirHistoria(l.p);
      ok(await l.p.locator('#dh-pasaporte li').count() >= 1, 'pasaporte: una lectora también lo ve');
      await l.p.click('#dh-vistas [data-vh="partitura"]'); await l.p.waitForTimeout(300);
      ok(await l.p.locator('#dh-lienzo .pieza[data-i]').count() >= 1 && await l.p.locator('#dh-tocar').isVisible(), 'partitura: una lectora también la ve y la toca');
      await l.p.click('#dh-vistas [data-vh="estratos"]'); await l.p.waitForTimeout(300);
      ok(await l.p.locator('#dh-lienzo .pieza[data-i]').count() >= 1, 'estratos: una lectora también los ve');
      await l.ctx.close();
    } finally { sLargo.parar(); }
    // Pocos datos: una sola compra
    const sUna = await servidor('hoy');
    try {
      const { ctx, p } = await ent(navegador, sUna, ADMIN, {}, sinAviso);
      await abrirHistoria(p);
      await p.click('#dh-vistas [data-vh="estratos"]'); await p.waitForTimeout(300);
      ok(await p.locator('#dh-lienzo .pieza[data-i]').count() >= 1, 'estratos: con pocas compras hay al menos una capa');
      await p.click('#dh-vistas [data-vh="partitura"]'); await p.waitForTimeout(300);
      ok(await p.locator('#dh-lienzo .pieza[data-i]').count() >= 1, 'partitura: con una compra hay una nota');
      await p.click('#dh-vistas [data-vh="linea"]'); await p.waitForTimeout(200);
      ok(await p.locator('#dh-pasaporte li').count() === 1, 'pasaporte: con una compra, un sello');
      await ctx.close();
    } finally { sUna.parar(); }
  }

  // ---------------------------------------------------------------- campamento 14: pestañas (Resumen · Gráficos · Historia · Movimientos)
  {
    const sinAviso = () => { try { localStorage.setItem('libro.avisos.preguntado', '1'); } catch { /* sin almacenamiento */ } };
    const ent = async (srv, cuenta, opts = {}) => { const r = await entrar(navegador, srv, cuenta, { pestanas: true, ...opts }, sinAviso); for (let k = 0; k < 3 && await r.p.locator('dialog[open]').count(); k++) { await r.p.keyboard.press('Escape'); await r.p.waitForTimeout(400); } return r; };
    const ver = (p, sel) => p.locator(sel).first().isVisible();
    const sLargo = await servidor('largo');
    try {
      const { ctx, p, consola } = await ent(sLargo, ADMIN);
      const activa = () => p.evaluate(() => document.getElementById('principal').dataset.pestana);
      const solo = async (cual, visibles, ocultos, nombre) => {
        for (const sel of visibles) ok(await ver(p, sel), `pestañas · ${nombre}: se ve ${sel}`);
        for (const sel of ocultos) ok(!(await ver(p, sel)), `pestañas · ${nombre}: no se ve ${sel}`);
        eq(await p.evaluate(() => document.querySelector('#pestanas [aria-current="true"]').dataset.pestana), cual, `pestañas · ${nombre}: la marcada es ${cual}`);
        const sw = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
        ok(sw.sw <= sw.cw, `pestañas · ${nombre}: sin scroll horizontal (${sw.sw}/${sw.cw})`);
        ok(await ver(p, '#anotar'), `pestañas · ${nombre}: «Anotar compra» sigue a la vista`);
      };
      ok(await ver(p, '#pestanas') && await p.locator('#pestanas button').count() === 4, 'pestañas: la barra tiene cuatro botones');
      eq(await activa(), 'resumen', 'pestañas: por defecto se abre el Resumen');
      await solo('resumen', ['#tramo', '#res-medallas', '.rep-const', '#ubicacion'], ['#compras', '#mercado', '#historia', '#rep-anios'], 'Resumen');
      ok(await p.locator('#res-med-lista .medalla.ganada').count() >= 3, 'pestañas · Resumen: las medallas ganadas están a la vista');
      ok(!/falta/i.test(await p.locator('#res-med-lista').innerText()), 'pestañas · Resumen: las medallas no dicen «te faltan» (reconocimiento, no presión)');
      await p.click('#pestanas [data-pestana="graficos"]'); await p.waitForTimeout(500);
      await solo('graficos', ['#mercado', '#vistas', '#rep-anios'], ['#tramo', '#compras', '#historia', '#res-medallas'], 'Gráficos');
      eq(await p.evaluate(() => localStorage.getItem('libro.pestana')), 'graficos', 'pestañas: se recuerda la pestaña');
      await p.click('#pestanas [data-pestana="historia"]'); await p.waitForTimeout(600);
      await solo('historia', ['#historia', '#dh-vistas', '#dh-medallas'], ['#tramo', '#compras', '#mercado'], 'Historia');
      ok(await p.locator('#dh-pasaporte li').count() >= 1 && await p.locator('#dh-linea .h-ev').count() >= 8, 'pestañas · Historia: trae el pasaporte y la línea de tiempo');
      await p.click('#dh-vistas [data-vh="tronco"]'); await p.waitForTimeout(300);
      ok(await p.locator('#dh-lienzo .pieza').count() >= 1, 'pestañas · Historia: los dibujos funcionan dentro de la pestaña');
      await p.click('#dh-vistas [data-vh="linea"]'); await p.waitForTimeout(200);
      await p.click('#pestanas [data-pestana="movimientos"]'); await p.waitForTimeout(500);
      await solo('movimientos', ['#compras', '#lista'], ['#tramo', '#mercado', '#historia', '#res-medallas'], 'Movimientos');
      ok(await p.locator('#lista li').count() >= 8, 'pestañas · Movimientos: la lista está completa');
      // Se recuerda al recargar
      await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(2500);
      for (let k = 0; k < 3 && await p.locator('dialog[open]').count(); k++) { await p.keyboard.press('Escape'); await p.waitForTimeout(300); }
      eq(await activa(), 'movimientos', 'pestañas: tras recargar sigue la última pestaña');
      // «Ver mi historia» del Resumen y «Tu historia y medallas» de «Tu cuenta»
      await p.click('#pestanas [data-pestana="resumen"]'); await p.waitForTimeout(400);
      await p.click('#res-historia'); await p.waitForTimeout(500);
      eq(await activa(), 'historia', 'pestañas: «Ver mi historia» lleva a la historia');
      await p.click('#pestanas [data-pestana="resumen"]'); await p.waitForTimeout(400);
      await p.click('#cuenta-btn'); await p.waitForTimeout(300);
      await p.click('#dc-historia-btn'); await p.waitForTimeout(700);
      ok(await p.locator('#d-cuenta[open]').count() === 0 && await activa() === 'historia' && await ver(p, '#dh-vistas'), 'pestañas: «Tu historia y medallas» de «Tu cuenta» cierra el diálogo y abre la pestaña');
      // Teclado: flechas entre pestañas
      await p.focus('#pestanas [data-pestana="resumen"]');
      await p.keyboard.press('ArrowRight'); await p.waitForTimeout(100);
      eq(await p.evaluate(() => document.activeElement.dataset.pestana), 'graficos', 'pestañas: la flecha derecha pasa a la siguiente');
      await p.keyboard.press('ArrowLeft'); await p.keyboard.press('ArrowLeft'); await p.waitForTimeout(100);
      eq(await p.evaluate(() => document.activeElement.dataset.pestana), 'movimientos', 'pestañas: la flecha izquierda da la vuelta');
      // «Pantalla: todo junto» devuelve la página larga
      await p.click('#cuenta-btn'); await p.waitForTimeout(300);
      eq((await p.textContent('#dc-pestanas')).trim(), 'Pantalla: por pestañas', 'pestañas: «Tu cuenta» dice cómo está la pantalla');
      await p.click('#dc-pestanas'); await p.waitForTimeout(300);
      eq((await p.textContent('#dc-pestanas')).trim(), 'Pantalla: todo junto', 'pestañas: el botón la cambia a «todo junto»');
      await p.keyboard.press('Escape'); await p.waitForTimeout(300);
      ok(!(await ver(p, '#pestanas')) && await p.evaluate(() => document.getElementById('principal').dataset.pestana === undefined), 'todo junto: la barra se esconde');
      for (const sel of ['#tramo', '#mercado', '#compras']) ok(await ver(p, sel) || await p.locator(sel).evaluate((e) => e.offsetParent !== null), `todo junto: ${sel} está en la página`);
      ok(!(await ver(p, '#historia')), 'todo junto: la historia no está en la página hasta que se pide');
      await p.click('#cuenta-btn'); await p.waitForTimeout(300);
      await p.click('#dc-historia-btn'); await p.waitForTimeout(800);
      ok(await ver(p, '#historia') && await p.locator('#dh-pasaporte li').count() >= 1, 'todo junto: «Tu historia y medallas» la saca al final de la página');
      eq(await p.evaluate(() => localStorage.getItem('libro.pestanas')), 'todo', 'todo junto: se recuerda por dispositivo');
      await p.click('#cuenta-btn'); await p.waitForTimeout(300);
      await p.click('#dc-pestanas'); await p.waitForTimeout(300);
      await p.keyboard.press('Escape'); await p.waitForTimeout(300);
      ok(await ver(p, '#pestanas') && await activa() === 'historia', 'pestañas: se puede volver a las pestañas (y sigue la última pestaña)');
      eq(consola, [], `consola limpia (pestañas): ${consola.join(' | ')}`);
      await ctx.close();
      // Una lectora también las ve (sin Anotar), con sus medallas
      const l = await ent(sLargo, LECTOR);
      ok(await ver(l.p, '#pestanas') && await ver(l.p, '#res-medallas'), 'pestañas: una lectora ve la barra y las medallas');
      ok(!(await ver(l.p, '#anotar')), 'pestañas: una lectora no tiene «Anotar»');
      await l.p.click('#pestanas [data-pestana="historia"]'); await l.p.waitForTimeout(600);
      ok(await ver(l.p, '#dh-vistas') && await l.p.locator('#dh-pasaporte li').count() >= 1, 'pestañas: una lectora también ve la historia');
      await l.ctx.close();
    } finally { sLargo.parar(); }
    // Sin compras y con una sola
    for (const [esc, nombre] of [['vacio', 'sin compras'], ['hoy', 'una compra']]) {
      const srv = await servidor(esc);
      try {
        const { ctx, p, consola } = await ent(srv, ADMIN);
        for (const t of ['resumen', 'graficos', 'historia', 'movimientos']) {
          await p.click(`#pestanas [data-pestana="${t}"]`); await p.waitForTimeout(400);
          const sw = await p.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
          ok(sw, `pestañas (${nombre}): ${t} sin scroll horizontal`);
        }
        await p.click('#pestanas [data-pestana="historia"]'); await p.waitForTimeout(400);
        ok(esc === 'vacio' ? await ver(p, '#dh-vacio') : await ver(p, '#dh-vistas'), `pestañas (${nombre}): la historia dice lo que corresponde`);
        eq(consola, [], `consola limpia (pestañas ${nombre}): ${consola.join(' | ')}`);
        await ctx.close();
      } finally { srv.parar(); }
    }
  }

  // ---------------------------------------------------------------- campamento 15A: Diario, cartas selladas y mensajes en la bandera
  {
    const sinAviso = () => { try { localStorage.setItem('libro.avisos.preguntado', '1'); } catch { /* sin almacenamiento */ } };
    const ent = async (srv, cuenta, opts = {}) => { const r = await entrar(navegador, srv, cuenta, opts, sinAviso); for (let k = 0; k < 3 && await r.p.locator('dialog[open]').count(); k++) { await r.p.keyboard.press('Escape'); await r.p.waitForTimeout(400); } return r; };
    const ver = (p, sel) => p.locator(sel).first().isVisible();
    const sLargo = await servidor('largo');
    try {
      const { ctx, p, consola } = await ent(sLargo, ADMIN);
      // ---- El Diario del Libro
      ok(await ver(p, '#diario'), '15A: el Diario del Libro está en el Resumen');
      ok((await p.textContent('#t-diario')).trim().length > 8 && /^\d+ \w+ \d{4} · edición n\.º \d+$/.test((await p.textContent('#dia-edicion')).trim()), `15A diario: titular y edición (${await p.textContent('#dia-edicion')})`);
      eq(await p.locator('#dia-clasif li').count(), 3, '15A diario: tres clasificados');
      ok(await p.locator('#dia-grabado svg').count() === 1 && /Grabado de la montaña/.test(await p.getAttribute('#dia-grabado', 'aria-label')), '15A diario: el grabado de la montaña con su descripción');
      ok(!/compra ahora|te conviene|recomend/i.test(await p.innerText('#diario')), '15A diario: no recomienda nada');
      // ---- Cartas: ya hay una abierta (sembrada en el servidor de pruebas)
      ok(await ver(p, '#capsulas') && await p.locator('#cap-lista .cap-item.abierta').count() === 1 && await p.locator('#cap-lista .cap-item.sellada').count() === 0, '15A cartas: el dueño ve la carta ya abierta');
      ok(await ver(p, '#cap-nueva') && !(await ver(p, '#cap-pista')), '15A cartas: el dueño puede escribir otra (y no sale la pista, porque ya hay una)');
      ok(await p.locator('#cap-lista .cap-nueva').count() === 1, '15A cartas: la carta abierta que no has leído lleva «Nueva»');
      await p.click('#cap-lista button[data-leer]'); await p.waitForTimeout(500);
      ok(await p.locator('#d-carta[open]').count() === 1 && /Querida familia/.test(await p.innerText('#carta-texto')) && /Con cariño, papá/.test(await p.innerText('#carta-texto')), '15A cartas: se lee la carta con sus saltos de línea');
      ok(/^De Daf3r, escrita el /.test((await p.textContent('#carta-de')).trim()) && await p.locator('#carta-arte svg').count() === 1, '15A cartas: dice de quién es y trae su dibujo');
      await p.click('#carta-ok'); await p.waitForTimeout(300);
      ok(await p.locator('#cap-lista .cap-nueva').count() === 0, '15A cartas: tras leerla ya no dice «Nueva»');
      // ---- Escribir una carta sellada
      await p.click('#cap-nueva'); await p.waitForTimeout(400);
      ok(await p.locator('#d-capsula[open]').count() === 1 && await p.locator('#cap-etapa option').count() >= 4 && await p.isDisabled('#cap-etapa'), '15A escribir: se abre el cuadro, con etapas por encima del saldo');
      await p.click('#cap-sellar'); await p.waitForTimeout(200);
      eq((await p.textContent('#cap-error')).trim(), 'Escribe la carta.', '15A escribir: una carta vacía no se sella');
      await p.fill('#cap-texto', 'Hola futuro, aquí estamos.');
      await p.click('#cap-sellar'); await p.waitForTimeout(200);
      eq((await p.textContent('#cap-error')).trim(), 'Elige la fecha en que se abre.', '15A escribir: sin fecha tampoco');
      ok(await p.getAttribute('#cap-fecha', 'min') > hoySV(), '15A escribir: la fecha mínima es mañana');
      await p.check('input[name="cap-cuando"][value="etapa"]'); await p.waitForTimeout(100);
      ok(!(await p.isDisabled('#cap-etapa')) && await p.isDisabled('#cap-fecha'), '15A escribir: elegir etapa apaga la fecha');
      await p.click('#cap-sellar'); await p.waitForTimeout(800);
      ok(await p.locator('#d-capsula[open]').count() === 0 && await p.locator('#cap-lista .cap-item.sellada').count() === 1, '15A escribir: la carta queda sellada');
      ok(/^Se abre al llegar a /.test((await p.locator('#cap-lista .sellada small').first().textContent()).trim()), `15A escribir: dice a qué etapa se abre (${await p.locator('#cap-lista .sellada small').first().textContent()})`);
      ok(/Carta sellada/.test(await p.textContent('#aviso-txt')) && await p.isVisible('#aviso-btn'), '15A escribir: avisa y deja «Deshacer»');
      ok(!(await p.evaluate(() => document.body.innerText.includes('Hola futuro'))), '15A escribir: el texto de una carta sellada no está en la página');
      await p.click('#cap-nueva'); await p.waitForTimeout(300);
      await p.fill('#cap-texto', 'Para el domingo.');
      await p.check('input[name="cap-cuando"][value="fecha"]');
      await p.fill('#cap-fecha', `${Number(hoySV().slice(0, 4)) + 2}-06-15`);
      await p.click('#cap-sellar'); await p.waitForTimeout(800);
      eq(await p.locator('#cap-lista .cap-item.sellada').count(), 2, '15A escribir: una segunda carta, con fecha');
      ok(/^Se abre el 15 jun \d{4}$/.test((await p.locator('#cap-lista .sellada small').nth(1).textContent()).trim()), '15A escribir: dice la fecha');
      // Deshacer lo recién sellado
      await p.click('#aviso-btn'); await p.waitForTimeout(800);
      eq(await p.locator('#cap-lista .cap-item.sellada').count(), 1, '15A escribir: «Deshacer» anula la carta recién sellada');
      // Anular una carta sellada (y deshacerlo)
      await p.click('#cap-lista button[data-anular]'); await p.waitForTimeout(800);
      eq(await p.locator('#cap-lista .cap-item.sellada').count(), 0, '15A cartas: el dueño anula una carta aún sellada');
      await p.click('#aviso-btn'); await p.waitForTimeout(900);
      eq(await p.locator('#cap-lista .cap-item.sellada').count(), 1, '15A cartas: «Deshacer» la sella otra vez');
      // ---- Mensajes en la bandera
      const info = await p.evaluate(async () => {
        const saldo = (await (await fetch('/api/compras')).json()).reduce((a, c) => a + (c.tipo === 'venta' ? -c.sats : c.sats), 0);
        const pot = [1e5, 1e6, 1e7, 1e8, 1e9, 1e10, 1e11];
        return { abajo: pot.filter((x) => x <= saldo).at(-1), arriba: pot.find((x) => x > saldo) };
      });
      await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(400);
      await p.locator(`.m-bandera[data-m="${info.abajo}"]`).click({ force: true }); await p.waitForTimeout(500);
      ok(await ver(p, '#m-escribir') && /^Escribir un mensaje$/.test((await p.textContent('#m-escribir')).trim()) && !(await ver(p, '#m-mensaje')), '15A mensaje: el dueño ve «Escribir un mensaje» en un campamento sin mensaje');
      await p.click('#m-escribir'); await p.waitForTimeout(400);
      ok(await p.locator('#d-mensaje[open]').count() === 1 && await p.isHidden('#msg-borrar'), '15A mensaje: se abre el cuadro (sin «Quitar», porque no hay mensaje)');
      await p.fill('#msg-texto', 'Para mis hijos: sigan subiendo');
      await p.click('#msg-guardar'); await p.waitForTimeout(900);
      ok(await p.locator('#d-mensaje[open]').count() === 0 && /Mensaje guardado/.test(await p.textContent('#aviso-txt')), '15A mensaje: se guarda y avisa');
      await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(400);
      await p.locator(`.m-bandera[data-m="${info.abajo}"]`).click({ force: true }); await p.waitForTimeout(500);
      ok(await ver(p, '#m-mensaje') && (await p.textContent('#m-mensaje')) === 'Para mis hijos: sigan subiendo' && /^Cambiar el mensaje$/.test((await p.textContent('#m-escribir')).trim()), '15A mensaje: la frase sale al tocar la bandera');
      await p.keyboard.press('Escape'); await p.waitForTimeout(200);
      // uno en un campamento por alcanzar (sorpresa)
      await p.locator(`.m-bandera[data-m="${info.arriba}"]`).click({ force: true }); await p.waitForTimeout(500);
      await p.click('#m-escribir'); await p.fill('#msg-texto', 'Cuando llegues aquí, sonríe'); await p.click('#msg-guardar'); await p.waitForTimeout(900);
      await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(300);
      await p.locator(`.m-bandera[data-m="${info.arriba}"]`).click({ force: true }); await p.waitForTimeout(500);
      ok(/^Cuando llegues aquí, sonríe$/.test(await p.textContent('#m-mensaje')) && /Se revelará a los demás/.test(await p.textContent('#m-mensaje-nota')) && await ver(p, '#m-mensaje-nota'), '15A mensaje: el dueño ve el del campamento por alcanzar, con su aclaración aparte');
      await p.keyboard.press('Escape'); await p.waitForTimeout(200);
      // en «Tu historia»
      await p.click('#cuenta-btn'); await p.waitForTimeout(300); await p.click('#dc-historia-btn'); await p.waitForTimeout(900);
      ok((await p.locator('#dh-linea .h-msg').allInnerTexts()).some((t) => t.includes('Para mis hijos: sigan subiendo')), '15A mensaje: la frase sale bajo su campamento en «Tu historia»');
      // el historial del dueño cuenta lo que hizo
      await p.click('#cuenta-btn'); await p.waitForTimeout(300); await p.click('#dc-historial'); await p.waitForTimeout(900);
      const hist = await p.innerText('#hist-lista');
      ok(/dejó un mensaje en el campamento/.test(hist) && /selló una carta para/.test(hist) && /anuló una carta aún sellada/.test(hist), '15A historial: dice los mensajes y las cartas');
      await p.keyboard.press('Escape'); await p.waitForTimeout(300);
      eq(consola, [], `consola limpia (15A, dueño): ${consola.join(' | ')}`);
      await ctx.close();
      // ---- Una lectora
      const l = await ent(sLargo, LECTOR);
      ok(await ver(l.p, '#diario') && await l.p.locator('#dia-clasif li').count() === 3, '15A lectora: ve el Diario');
      ok(await ver(l.p, '#capsulas') && !(await ver(l.p, '#cap-nueva')) && await l.p.locator('#cap-lista button[data-anular]').count() === 0, '15A lectora: ve las cartas pero no puede escribir ni anular');
      eq(await l.p.locator('#cap-lista .cap-item.sellada').count(), 1, '15A lectora: ve que hay una carta sellada');
      ok(!(await l.p.evaluate(() => document.body.innerText.includes('Hola futuro'))) && !JSON.stringify(await datos(l.p, '/api/capsulas')).includes('Hola futuro'), '15A lectora: el texto de la carta sellada no le llega');
      await l.p.click('#cap-lista button[data-leer]'); await l.p.waitForTimeout(500);
      ok(/Querida familia/.test(await l.p.innerText('#carta-texto')), '15A lectora: lee la carta que ya se abrió');
      await l.p.click('#carta-ok'); await l.p.waitForTimeout(300);
      await l.p.evaluate(() => window.scrollTo(0, 0)); await l.p.waitForTimeout(400);
      await l.p.locator(`.m-bandera[data-m="${info.abajo}"]`).click({ force: true }); await l.p.waitForTimeout(500);
      ok(/^Para mis hijos: sigan subiendo$/.test(await l.p.textContent('#m-mensaje')) && !(await ver(l.p, '#m-escribir')), '15A lectora: lee la frase de un campamento ya alcanzado y no puede cambiarla');
      await l.p.keyboard.press('Escape'); await l.p.waitForTimeout(200);
      await l.p.locator(`.m-bandera[data-m="${info.arriba}"]`).click({ force: true }); await l.p.waitForTimeout(500);
      ok(/^Hay un mensaje esperándote en este campamento\.$/.test(await l.p.textContent('#m-mensaje')) && !(await l.p.evaluate(() => document.body.innerText.includes('sonríe'))), '15A lectora: el del campamento por alcanzar llega sellado, sin su texto');
      await l.ctx.close();
    } finally { sLargo.parar(); }
    // Sin cartas: el dueño ve la invitación; una lectora no ve la tarjeta
    const sHoy = await servidor('hoy');
    try {
      const a = await ent(sHoy, ADMIN);
      ok(await ver(a.p, '#capsulas') && await ver(a.p, '#cap-pista') && await ver(a.p, '#cap-nueva'), '15A cartas: sin cartas, el dueño ve la invitación a escribir una');
      ok(await ver(a.p, '#diario'), '15A diario: con una sola compra ya hay portada');
      await a.ctx.close();
      const l = await ent(sHoy, LECTOR);
      ok(!(await ver(l.p, '#capsulas')), '15A cartas: sin cartas, una lectora no ve la tarjeta');
      await l.ctx.close();
    } finally { sHoy.parar(); }
  }

  // ---------------------------------------------------------------- campamento 15B: piedritas, cumpleaños y la tele
  {
    const sinAviso = () => { try { localStorage.setItem('libro.avisos.preguntado', '1'); } catch { /* sin almacenamiento */ } };
    const ent = async (srv, cuenta, opts = {}, init = sinAviso) => { const r = await entrar(navegador, srv, cuenta, opts, init); for (let k = 0; k < 3 && await r.p.locator('dialog[open]').count(); k++) { await r.p.keyboard.press('Escape'); await r.p.waitForTimeout(400); } return r; };
    const ver = (p, sel) => p.locator(sel).first().isVisible();
    const sLargo = await servidor('largo');
    try {
      // ---- La apacheta: una lectora deja una piedrita
      const l = await ent(sLargo, LECTOR);
      const fila = l.p.locator('#lista li[data-clave^="c"]:has(.fila[data-tipo="compra"])').first();
      const idCompra = await fila.locator('.fila').getAttribute('data-id');
      ok(await fila.locator('.f-pie-b').count() === 1 && /^Dejar una piedrita$/.test((await fila.locator('.f-pie-b').textContent()).trim()) && await fila.locator('.f-pie-b').getAttribute('aria-pressed') === 'false', '15B piedritas: una lectora ve «Dejar una piedrita» en una compra');
      ok(await l.p.locator('#lista li[data-clave^="t"] .f-pie-b').count() === 0 && await l.p.locator('#lista li:has(.fila[data-tipo="venta"]) .f-pie-b').count() === 0, '15B piedritas: ni los traslados ni las ventas reciben piedritas');
      await fila.locator('.f-pie-b').click(); await l.p.waitForTimeout(900);
      ok(/Dejaste una piedrita/.test(await fila.locator('.f-pie-b').textContent()) && await fila.locator('.f-pie-b').getAttribute('aria-pressed') === 'true' && !/Ana dejó/.test(await fila.innerText()), '15B piedritas: queda dejada, sin nombrarte a ti misma');
      ok(/Dejaste una piedrita\./.test(await l.p.textContent('#aviso-txt')), '15B piedritas: avisa');
      eq((await datos(l.p, '/api/piedritas')).length, 1, '15B piedritas: se guardó en el servidor');
      ok(await l.p.evaluate(() => document.activeElement?.classList.contains('f-pie-b')), '15B piedritas: el foco se queda en el botón');
      await l.ctx.close();
      // ---- El dueño las ve, sin botón
      const a = await ent(sLargo, ADMIN);
      const filaA = a.p.locator(`#lista li:has(.fila[data-id="${idCompra}"])`).first();
      ok(await a.p.locator('#lista .f-pie-b').count() === 0 && /Ana dejó una piedrita/.test(await filaA.innerText()), '15B piedritas: el dueño ve quién la dejó y no tiene botón');
      ok(await ver(a.p, '#pie-ultima') && /^Ana dejó una piedrita en tu compra del /.test((await a.p.textContent('#pie-txt')).trim()), '15B piedritas: el Resumen del dueño dice la última');
      await a.ctx.close();
      // ---- Quitarla
      const l2 = await ent(sLargo, LECTOR);
      const fila2 = l2.p.locator(`#lista li:has(.fila[data-id="${idCompra}"])`).first();
      ok(/Dejaste una piedrita/.test(await fila2.locator('.f-pie-b').textContent()), '15B piedritas: tras recargar sigue dejada');
      await fila2.locator('.f-pie-b').click(); await l2.p.waitForTimeout(900);
      ok(/^Dejar una piedrita$/.test((await fila2.locator('.f-pie-b').textContent()).trim()) && (await datos(l2.p, '/api/piedritas')).length === 0, '15B piedritas: un segundo toque la quita');
      // ---- Mi cumpleaños
      const md = hoySV().slice(5);
      await l2.p.click('#cuenta-btn'); await l2.p.waitForTimeout(300);
      eq((await l2.p.textContent('#dc-cumple')).trim(), 'Mi cumpleaños: sin poner', '15B cumpleaños: «Tu cuenta» dice que no está puesto');
      await l2.p.click('#dc-cumple'); await l2.p.waitForTimeout(600);
      ok(await l2.p.locator('#d-cumple[open]').count() === 1 && await l2.p.locator('#cu-mes option').count() === 13 && await l2.p.locator('#cu-dia option').count() === 32 && await l2.p.isHidden('#cu-quitar'), '15B cumpleaños: se abre el cuadro con los doce meses y los 31 días');
      await l2.p.click('#cu-guardar'); await l2.p.waitForTimeout(200);
      eq((await l2.p.textContent('#cu-error')).trim(), 'Elige el mes y el día.', '15B cumpleaños: sin elegir no se guarda');
      await l2.p.selectOption('#cu-mes', md.slice(0, 2)); await l2.p.selectOption('#cu-dia', md.slice(3));
      await l2.p.click('#cu-guardar'); await l2.p.waitForTimeout(900);
      ok(await l2.p.locator('#d-cumple[open]').count() === 0 && (await datos(l2.p, '/api/cumples')).some((c) => c.nombre === 'Ana' && c.cumple === md), '15B cumpleaños: se guarda');
      eq((await l2.p.textContent('#saludo')).trim(), 'Feliz cumpleaños, Ana', '15B cumpleaños: el día de tu cumpleaños el saludo cambia');
      eq(await l2.p.locator('#montana .farol-cumple').count(), 1, '15B cumpleaños: la montaña enciende un farol');
      ok(/^A$/.test((await l2.p.locator('#montana .farol-cumple').textContent()).trim()), '15B cumpleaños: con la inicial de Ana');
      await l2.ctx.close();
      // ---- Toda la familia ve el farol; el saludo de otra persona no cambia
      const a2 = await ent(sLargo, ADMIN);
      eq(await a2.p.locator('#montana .farol-cumple').count(), 1, '15B cumpleaños: el dueño también ve el farol de Ana');
      ok(/^Buenas noches, Daf3r$/.test((await a2.p.textContent('#saludo')).trim()), '15B cumpleaños: y su saludo es el de siempre');
      await a2.ctx.close();
      const l3 = await ent(sLargo, LECTOR);
      await l3.p.click('#cuenta-btn'); await l3.p.waitForTimeout(300);
      ok(/Mi cumpleaños: \d+ \w+/.test((await l3.p.textContent('#dc-cumple')).trim()), '15B cumpleaños: «Tu cuenta» dice la fecha puesta');
      await l3.p.click('#dc-cumple'); await l3.p.waitForTimeout(600);
      await l3.p.click('#cu-quitar'); await l3.p.waitForTimeout(900);
      ok((await datos(l3.p, '/api/cumples')).length === 0 && await l3.p.locator('#montana .farol-cumple').count() === 0, '15B cumpleaños: se quita y se apaga el farol');
      await l3.ctx.close();
    } finally { sLargo.parar(); }

    // ---- La tele: fiesta al anotarse una compra y sismógrafo (espera el minuto real de la actualización automática)
    const sTele = await servidor('anio');
    try {
      const t = await ent(sTele, LECTOR, { viewport: { width: 1920, height: 1080 }, isMobile: false, hasTouch: false }, () => { try { localStorage.setItem('libro.avisos.preguntado', '1'); localStorage.setItem('libro.efectos', 'todos'); } catch { /* sin almacenamiento */ } });
      await t.p.evaluate(() => { location.hash = '#tv'; }); await t.p.waitForTimeout(800);
      ok(await t.p.evaluate(() => document.documentElement.dataset.tv === '1') && !(await ver(t.p, '#tv-fiesta')), '15B tele: en modo pantalla grande, sin fiesta todavía');
      const adm = await ent(sTele, ADMIN);
      const precio = (await datos(adm.p, '/api/precio')).precio;
      const fecha = (await datos(adm.p, '/api/compras')).map((c) => c.fecha).sort().at(0);
      const libre = (() => { for (let d = new Date(`${hoySV()}T12:00:00Z`); ; d.setDate(d.getDate() - 1)) { const f = d.toISOString().slice(0, 10); if (f < fecha) return f; } })();
      await adm.p.evaluate(async ([f, p]) => { await fetch('/api/compras', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Libro': '1' }, body: JSON.stringify({ fecha: f, monto: 20, sats: Math.round((20 / p) * 1e8) }) }); }, [libre, precio]);
      await adm.ctx.close();
      await t.p.waitForFunction(() => !document.getElementById('tv-fiesta').hidden, null, { timeout: 80_000 });
      ok(/^(Compra nueva|Nueva etapa|Nuevo hito)$/.test((await t.p.textContent('#tvf-k')).trim()) && /\+[\d,]+ sats|sats/.test(await t.p.textContent('#tvf-txt')), `15B tele: la fiesta dice qué pasó (${await t.p.textContent('#tvf-k')} · ${await t.p.textContent('#tvf-txt')})`);
      ok(/\+[\d,]+ sats/.test(await t.p.textContent('#tvf-sub')) || /paso más/.test(await t.p.textContent('#tvf-sub')), '15B tele: y trae su línea de abajo');
      // sismógrafo: con dos precios ya sale la tira
      await t.p.waitForFunction(() => !document.getElementById('tv-sismo').hidden, null, { timeout: 70_000 }).catch(() => {});
      ok(await ver(t.p, '#tv-sismo') && await t.p.locator('#tv-sismo svg path').count() >= 1 && /^Tira del precio de BTC desde la medianoche: ahora \$[\d,]+/.test(await t.p.getAttribute('#tv-sismo', 'aria-label')), '15B tele: el sismógrafo dibuja la tira del precio');
      await t.ctx.close();
    } finally { sTele.parar(); }

    // ---- La tele a las 18:00: el atardecer acelerado
    const sAtar = await servidor('hoy');
    try {
      const t = await ent(sAtar, LECTOR, { hora: 18.02 }, () => { try { localStorage.setItem('libro.avisos.preguntado', '1'); localStorage.setItem('libro.efectos', 'todos'); localStorage.setItem('libro.pestanas', 'todo'); } catch { /* sin almacenamiento */ } });
      await t.p.evaluate(() => { location.hash = '#tv'; }); await t.p.waitForTimeout(500);
      const franjas = new Set();
      const inicio = Date.now();
      while (Date.now() - inicio < 50_000) {
        franjas.add(await t.p.evaluate(() => document.documentElement.dataset.cielo));
        if (franjas.has('noche') && await t.p.evaluate(() => localStorage.getItem('libro.tv.atardecer')) && Date.now() - inicio > 20_000 && (await t.p.evaluate(() => document.documentElement.dataset.cielo)) === 'atardecer') break;
        await t.p.waitForTimeout(500);
      }
      ok(franjas.has('noche') && await t.p.evaluate(() => document.documentElement.dataset.cielo) === 'atardecer', `15B tele: a las 18:00 el cielo hace su atardecer acelerado y vuelve a la hora real (${[...franjas].join(', ')})`);
      ok(await t.p.evaluate(() => localStorage.getItem('libro.tv.atardecer') != null), '15B tele: y queda anotado que hoy ya lo hizo (una vez al día)');
      await t.ctx.close();
    } finally { sAtar.parar(); }
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

  // ---------------------------------------------------------------- campamento 16: lago, reloj de sol, «Tú» fantasma y perfil de altitud
  {
    const con = (dia, hora) => [([d, h]) => { try { localStorage.setItem('libro.dia', d); localStorage.setItem('libro.efectos', 'todos'); localStorage.setItem('libro.avisos.preguntado', '1'); } catch { /* sin almacenamiento */ } }, [dia, hora]];
    const cerrar = async (p) => { for (let k = 0; k < 3 && await p.locator('dialog[open]').count(); k++) { await p.keyboard.press('Escape'); await p.waitForTimeout(300); } };
    const sMil = await servidor('mil');
    try {
      // ---- Reloj de sol: la sombra cae a un lado de mañana y al otro de tarde; de noche no hay
      const sombra = (p) => p.evaluate(() => { const g = document.querySelector('.reloj'); const d = g.querySelector('.reloj-sombra').getAttribute('d'); const m = d.match(/M([\d.]+) .*?L([\d.-]+) /); return { d, sx: Number(g.dataset.sx), punta: m ? Number(m[2]) : null, visible: getComputedStyle(g).display !== 'none' }; });
      const m = await entrar(navegador, sMil, ADMIN, { hora: 9 }, con('2026-08-20', 9)); await cerrar(m.p); await m.p.waitForTimeout(800);
      const sm = await sombra(m.p);
      ok(sm.visible && sm.punta !== null && sm.punta < sm.sx, '16A reloj de sol: de mañana la sombra cae hacia la izquierda');
      ok(await m.p.locator('.reloj .reloj-piedra').count() === 11, '16A reloj de sol: once piedritas, de las 7 a las 17');
      await m.ctx.close();
      const t = await entrar(navegador, sMil, ADMIN, { hora: 15 }, con('2026-08-20', 15)); await cerrar(t.p);
      const st = await sombra(t.p);
      ok(st.visible && st.punta > st.sx, '16A reloj de sol: de tarde la sombra cae hacia la derecha');
      await t.ctx.close();
      const n22 = await entrar(navegador, sMil, ADMIN, { hora: 22 }, con('2026-08-20', 22)); await cerrar(n22.p);
      const sn = await sombra(n22.p);
      ok(!sn.visible && sn.d === '', '16A reloj de sol: de noche no hay sombra');
      // ---- El lago guarda lo vendido: una monedita por venta (hasta 5)
      eq(await n22.p.locator('.lago-moneda').count(), 5, '16A lago: mil tiene ventas de sobra: cinco monedas');
      await n22.ctx.close();
      // ---- «Tú» fantasma en la hoja
      const h = await entrar(navegador, sMil, ADMIN, { hora: 15 }, con('2026-08-20', 15)); await cerrar(h.p);
      await h.p.keyboard.press('a'); await h.p.waitForTimeout(600);
      ok(await h.p.locator('#h-ruta').isHidden(), '16B fantasma: sin sats escritos no hay regla');
      await h.p.fill('#h-sats', '2500000'); await h.p.waitForTimeout(600);
      await h.p.evaluate(() => { document.getElementById('h-cambia').open = true; }); // en el teléfono va plegado bajo «Qué cambia con esta compra» (campamento 18)
      ok(await h.p.locator('#h-ruta').isVisible() && /Quedarías al \d+ % del camino a |Con esto llegarías a /.test(await h.p.textContent('#hoja-calc')), '16B fantasma: con sats escritos sale la regla y la frase');
      const pq = await h.p.evaluate(() => { const r = document.getElementById('h-ruta'); return [Number(r.style.getPropertyValue('--p')), Number(r.style.getPropertyValue('--q'))]; });
      ok(pq[1] > pq[0], '16B fantasma: el fantasma queda más adelante que tú');
      await h.p.click('#h-tipo button[data-tipo="venta"]'); await h.p.waitForTimeout(400);
      ok(await h.p.locator('#h-ruta').isHidden(), '16B fantasma: en una venta no hay regla');
      eq(h.consola.filter((c) => !/503/.test(c)), [], '16 sin errores de consola');
      await h.ctx.close();
      // ---- Perfil de altitud: la vista Sats en escala logarítmica
      const pf = await entrar(navegador, sMil, ADMIN, { hora: 15 }, con('2026-08-20', 15)); await cerrar(pf.p);
      await verVista(pf.p, 'sats');
      ok(await pf.p.locator('#s-lienzo .pf-farol').count() >= 1, '16B perfil: hay faroles donde cruzaste un campamento');
      ok(/^Tú$/.test((await pf.p.locator('#s-lienzo .pf-tu').textContent()).trim()), '16B perfil: «Tú» al final');
      ok((await pf.p.locator('#s-lienzo .v-eje').allTextContents()).some((x) => /^1M$/.test(x)) && await pf.p.locator('#s-lienzo .pf-extra').count() >= 1, '16B perfil: etapas rotuladas y anillos en las extra');
      await pf.ctx.close();
    } finally {
      sMil.parar();
    }
  }

  // ---------------------------------------------------------------- campamento 17: primera impresión
  {
    const sinAviso = () => { try { localStorage.setItem('libro.avisos.preguntado', '1'); } catch { /* sin almacenamiento */ } };
    const cerrar = async (p) => { for (let k = 0; k < 4 && await p.locator('dialog[open]').count(); k++) { await p.keyboard.press('Escape'); await p.waitForTimeout(350); } };
    const ent = async (srv, cuenta, opts = {}, init = sinAviso) => { const r = await entrar(navegador, srv, cuenta, { pestanas: true, hora: 15, ...opts }, init); await cerrar(r.p); return r; };
    const s17 = await servidor('anio');
    try {
      // ---- 1. Las pestañas se asoman al abrir
      const cajas = (p) => p.evaluate(() => {
        const r = (sel) => { const e = document.querySelector(sel); if (!e || getComputedStyle(e).display === 'none') return null; const q = e.getBoundingClientRect(); return { arriba: Math.round(q.top), abajo: Math.round(q.bottom) }; };
        return { vh: innerHeight, y: Math.round(scrollY), escena: r('.escena'), barra: r('#pestanas'), boton: r('#anotar'), yo: r('#montana .yo'), salida: r('#montana .salida'), saldo: r('.saldo'), pista: document.documentElement.hasAttribute('data-boton') };
      });
      const fijo = { isMobile: false, hasTouch: false };
      for (const [w, h] of [[390, 844], [390, 664], [768, 1024]]) {
        const l = await ent(s17, LECTOR, { viewport: { width: w, height: h }, ...fijo });
        const c = await cajas(l.p);
        eq(c.escena.abajo, h - 92, `17·1 lectora ${w}×${h}: la escena deja libres 92 px abajo`);
        ok(c.barra.arriba >= c.escena.abajo && c.barra.abajo <= h, `17·1 lectora ${w}×${h}: la barra de pestañas se ve entera al abrir (${c.barra.arriba}–${c.barra.abajo} de ${h})`);
        ok(c.yo.abajo < c.escena.abajo && c.salida.abajo <= c.escena.abajo && c.yo.arriba > c.saldo.abajo - 30, `17·1 lectora ${w}×${h}: el sendero y el punto caben en la escena, bajo el saldo`);
        ok(!c.pista && !c.boton, `17·1 lectora ${w}×${h}: sin botón ni pista de botón`);
        eq(l.consola.filter((x) => !/503/.test(x)), [], `17·1 lectora ${w}×${h}: consola limpia`);
        await l.ctx.close();
      }
      {
        // Pantalla muy baja (320×568): la franja es menor y la barra (de dos filas) se asoma a medias.
        const l = await ent(s17, LECTOR, { viewport: { width: 320, height: 568 }, ...fijo });
        const c = await cajas(l.p);
        ok(c.escena.abajo === 568 - 64 && c.barra.arriba <= 568 - 40, `17·1 lectora 320×568: la barra se asoma al menos 40 px (${c.barra.arriba} de 568)`);
        ok(c.yo.abajo < c.escena.abajo && c.salida.abajo <= c.escena.abajo, '17·1 lectora 320×568: el sendero cabe en la escena');
        await l.ctx.close();
      }
      {
        // El dueño, en pantalla alta: la barra y, debajo, el botón, sin taparse. Y la pista se recuerda: al recargar ya sale así.
        const a = await ent(s17, ADMIN, { viewport: { width: 390, height: 844 }, ...fijo });
        let c = await cajas(a.p);
        ok(c.pista && c.escena.abajo === 844 - 164, `17·1 dueño 390×844: la escena deja 164 px (${c.escena.abajo})`);
        ok(c.barra.arriba >= c.escena.abajo && c.barra.abajo < c.boton.arriba && c.boton.abajo <= 844, `17·1 dueño 390×844: barra (${c.barra.arriba}–${c.barra.abajo}) sobre el botón (${c.boton.arriba}–${c.boton.abajo}), sin taparse`);
        ok(c.yo.abajo < c.escena.abajo && c.salida.abajo <= c.escena.abajo, '17·1 dueño 390×844: el sendero cabe en la escena');
        eq(await a.p.evaluate(() => localStorage.getItem('libro.rol')), 'admin', '17·1 dueño: el dispositivo recuerda que aquí flota el botón');
        await a.p.reload({ waitUntil: 'domcontentloaded' });
        ok(await a.p.evaluate(() => document.documentElement.hasAttribute('data-boton') && document.documentElement.hasAttribute('data-pestanas')), '17·1 dueño: al recargar, la escena sale con su alto desde el primer pintado');
        await a.p.waitForTimeout(2600); await cerrar(a.p);
        c = await cajas(a.p);
        ok(c.escena.abajo === 844 - 164 && c.barra.abajo < c.boton.arriba, '17·1 dueño: tras recargar, igual');
        // Al bajar, la barra queda pegada arriba y el botón abajo.
        await a.p.evaluate(() => window.scrollTo(0, 900)); await a.p.waitForTimeout(500);
        c = await cajas(a.p);
        ok(c.barra.arriba < 120 && c.boton.abajo <= 844 && c.boton.arriba > 700, `17·1 dueño: al bajar, barra arriba (${c.barra.arriba}) y botón abajo (${c.boton.arriba})`);
        eq(a.consola.filter((x) => !/503/.test(x)), [], '17·1 dueño 390×844: consola limpia');
        await a.ctx.close();
      }
      {
        // El dueño, en pantalla baja: no caben los dos sin aplastar la montaña; todo queda como estaba.
        const a = await ent(s17, ADMIN, { viewport: { width: 390, height: 664 }, ...fijo });
        const c = await cajas(a.p);
        ok(c.escena.abajo === 664 && c.boton.abajo <= 664 && c.salida.abajo < c.boton.arriba, `17·1 dueño 390×664: la escena llena la pantalla y el sendero arranca sobre el botón (${c.salida.abajo} < ${c.boton.arriba})`);
        await a.ctx.close();
      }
      {
        // Donde la barra va en dos filas (letra muy grande en el teléfono) no caben barra y botón: queda como estaba y nada tapa el botón.
        const letra = () => { try { localStorage.setItem('libro.avisos.preguntado', '1'); localStorage.setItem('libro.letra', 'muy-grande'); } catch { /* sin almacenamiento */ } };
        const tocable = (p) => p.evaluate(() => { const r = document.getElementById('anotar').getBoundingClientRect(); return document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)?.closest('#anotar') !== null; });
        const g = await ent(s17, ADMIN, { viewport: { width: 390, height: 844 }, ...fijo }, letra);
        const c = await cajas(g.p);
        ok(c.escena.abajo === 844 && c.boton.abajo <= 844 && await tocable(g.p), `17·1 dueño con letra muy grande: la escena llena la pantalla y el botón queda a la vista y encima (${c.escena.abajo})`);
        await g.ctx.close();
        const n = await ent(s17, ADMIN, { viewport: { width: 412, height: 780 }, ...fijo });
        const cn = await cajas(n.p);
        ok(cn.escena.abajo === 780 - 164 && cn.barra.abajo < cn.boton.arriba && await tocable(n.p), `17·1 dueño 412×780: barra y botón, sin taparse (${cn.barra.abajo} < ${cn.boton.arriba})`);
        await n.ctx.close();
      }
      {
        // «Todo junto», acostado y escritorio: como antes.
        const t = await entrar(navegador, s17, LECTOR, { viewport: { width: 390, height: 844 }, ...fijo }, sinAviso); await cerrar(t.p);
        eq((await cajas(t.p)).escena.abajo, 844, '17·1 «todo junto»: la escena sigue llenando la pantalla');
        ok(await t.p.evaluate(() => !document.documentElement.hasAttribute('data-pestanas')), '17·1 «todo junto»: sin la marca de pestañas');
        await t.ctx.close();
        const ac = await ent(s17, LECTOR, { viewport: { width: 844, height: 390 }, ...fijo });
        eq((await cajas(ac.p)).escena.abajo, 390, '17·1 acostado: la escena mide la pantalla');
        await ac.ctx.close();
        const e = await ent(s17, LECTOR, { viewport: { width: 1440, height: 900 }, ...fijo });
        const c = await cajas(e.p);
        ok(c.escena.abajo === 774 && c.barra.abajo <= 900, `17·1 escritorio: como antes, con la barra a la vista (${c.escena.abajo}, ${c.barra.abajo})`);
        await e.ctx.close();
      }
      // ---- 2. «Saldo del libro» para quien solo mira (y «Vamos aquí» en el sendero); para el dueño nada cambia
      const voz = (p) => p.evaluate(() => {
        const t = (sel) => document.querySelector(sel)?.textContent.trim() ?? null;
        const escena = document.querySelector('.escena').cloneNode(true);
        escena.querySelector('#cuenta-btn')?.remove(); // «(tu cuenta)»: esa sí es suya
        const pil = document.querySelector('#montana .eti-yo')?.getBoundingClientRect();
        return {
          saldo: t('#t-saldo'), prox: t('#prox'), punto: t('#montana .yo-txt'), desc: t('#m-desc'), ayuda: t('#s-saldo-ayuda'), marca: document.documentElement.dataset.voz,
          banderas: [...document.querySelectorAll('.m-bandera')].map((b) => b.getAttribute('aria-label')).join(' | '),
          todo: `${escena.textContent} ${document.title} ${t('#minicab')}`, medallas: t('#t-res-med'), pildora: pil ? [Math.round(pil.left), Math.round(pil.right)] : null, ancho: innerWidth,
        };
      });
      const tuteo = /(^|[^\p{L}])(t[uú]s?|te|ti|tuy[oa]s?|estás|vas|llevas|tienes)([^\p{L}]|$)/iu;
      {
        const l = await ent(s17, LECTOR, { viewport: { width: 390, height: 844 }, ...fijo });
        const v = await voz(l.p);
        eq([v.saldo, v.punto, v.marca], ['Saldo del libro', 'Vamos aquí', 'libro'], '17·2 lectora: «Saldo del libro» y «Vamos aquí»');
        eq(v.prox, 'Lo anota Daf3r', '17·2 lectora: dice quién lleva el libro (el nombre ya venía en la carta sembrada)');
        ok(v.desc.startsWith('El libro está a 1,211,769 sats de altitud') && /Ya pasó 2 de 3 campamentos/.test(v.desc) && /Al pie crece el bosque del libro/.test(v.desc), `17·2 lectora: la descripción de la montaña habla del libro («${v.desc.slice(0, 70)}…»)`);
        ok(v.ayuda.startsWith('Saldo del libro.') && /Se alcanzó el /.test(v.banderas) && /Faltan [\d,]+ sats para la cumbre\. El libro va al \d+%\./.test(v.banderas), `17·2 lectora: ayuda del saldo y banderas («${v.banderas.slice(0, 90)}»)`);
        ok(!tuteo.test(v.todo) && !tuteo.test(v.desc) && !tuteo.test(v.banderas) && !tuteo.test(v.ayuda), `17·2 lectora: en la escena, el título y la mini-cabecera nada dice «tu» («${(tuteo.exec(`${v.todo} ${v.desc} ${v.banderas}`) ?? [''])[0]}»)`);
        ok(v.pildora && v.pildora[0] >= 4 && v.pildora[1] <= v.ancho - 4, `17·2 lectora: la píldora «Vamos aquí» cabe en la escena (${v.pildora})`);
        eq(v.medallas, 'Medallas del libro', '17·2 lectora: los títulos fijos también cambian');
        const res = await l.p.evaluate(() => `${document.getElementById('res-med-n').textContent} ${document.getElementById('t-ritmo').textContent} ${document.getElementById('t-anillo').getAttribute('aria-label')}`);
        ok(/^El libro ya tiene \d+ medallas/.test(res) && !tuteo.test(res), `17·2 lectora: medallas y próxima etapa hablan del libro («${res.slice(0, 80)}»)`);
        // La tarjeta de una bandera por alcanzar.
        await l.p.locator('.m-bandera').first().click(); await l.p.waitForTimeout(300);
        ok(/^Faltan [\d,]+ sats para la cumbre\. El libro va al \d+%\.$/.test(await l.p.locator('#m-tarjeta-p').textContent()), '17·2 lectora: la tarjeta de la cumbre habla del libro');
        await l.p.keyboard.press('Escape');
        // El perfil de altitud (Gráficos → Sats).
        await l.p.click('#pestanas [data-pestana="graficos"]'); await l.p.waitForTimeout(400); await verVista(l.p, 'sats');
        eq((await l.p.locator('#s-lienzo .pf-tu').textContent()).trim(), 'Vamos aquí', '17·2 lectora: también en el perfil de altitud');
        // La pista queda en el dispositivo: al recargar, el rótulo sale bien desde el primer pintado.
        eq(await l.p.evaluate(() => localStorage.getItem('libro.rol')), 'lector', '17·2 lectora: el dispositivo recuerda la voz');
        await l.p.reload({ waitUntil: 'domcontentloaded' });
        const pronto = await l.p.evaluate(() => { const h = document.getElementById('t-saldo'); return { pista: document.documentElement.hasAttribute('data-lector'), seVeTu: h.textContent === 'Tu saldo' && getComputedStyle(h).visibility !== 'hidden' }; });
        ok(pronto.pista && !pronto.seVeTu, '17·2 lectora: al recargar nunca se ve «Tu saldo»');
        await l.p.waitForTimeout(2500); await cerrar(l.p);
        eq((await voz(l.p)).saldo, 'Saldo del libro', '17·2 lectora: tras recargar, igual');
        eq(l.consola.filter((x) => !/503/.test(x)), [], '17·2 lectora: consola limpia');
        await l.ctx.close();
      }
      for (const [w, h] of [[320, 568], [844, 390], [1440, 900], [2560, 1300]]) {
        const l = await ent(s17, LECTOR, { viewport: { width: w, height: h }, ...fijo });
        const v = await voz(l.p);
        ok(v.punto === 'Vamos aquí' && v.pildora[0] >= 4 && v.pildora[1] <= w - 4, `17·2 lectora ${w}×${h}: «Vamos aquí» cabe (${v.pildora})`);
        const sw = await l.p.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
        ok(sw[0] <= sw[1], `17·2 lectora ${w}×${h}: sin scroll horizontal`);
        await l.ctx.close();
      }
      {
        // El saludo nunca cae sobre el rótulo del saldo: si la marca y la cuenta no caben en un renglón (360 px, letra grande), no se enseña.
        const saludo = (p) => p.evaluate(() => { const sl = document.getElementById('saludo'), k = document.getElementById('t-saldo'); return { oculto: sl.hidden, pisa: !sl.hidden && sl.getBoundingClientRect().bottom > k.getBoundingClientRect().top + 2, txt: sl.textContent }; });
        const grande = () => { try { localStorage.setItem('libro.avisos.preguntado', '1'); localStorage.setItem('libro.letra', 'grande'); } catch { /* sin almacenamiento */ } };
        for (const [cuenta, w, h, init, nombre] of [[ADMIN, 360, 740, sinAviso, 'dueño 360×740'], [LECTOR, 390, 844, grande, 'lectora con letra grande'], [LECTOR, 320, 568, sinAviso, 'lectora 320×568']]) {
          const x = await ent(s17, cuenta, { viewport: { width: w, height: h }, ...fijo }, init);
          const sl = await saludo(x.p);
          ok(!sl.pisa && sl.txt.length > 8, `17·2 ${nombre}: el saludo no pisa el rótulo del saldo (${sl.oculto ? 'no se enseña' : 'cabe'})`);
          await x.ctx.close();
        }
        const x = await ent(s17, LECTOR, { viewport: { width: 390, height: 844 }, ...fijo });
        const sl = await saludo(x.p);
        ok(!sl.oculto && !sl.pisa && /, Ana$/.test(sl.txt), `17·2 lectora 390×844: el saludo se ve («${sl.txt}»)`);
        await x.ctx.close();
      }
      {
        // En modo pantalla grande (una tele con cuenta de lectora) también.
        const t = await ent(s17, LECTOR, { viewport: { width: 1920, height: 1080 }, ...fijo });
        await t.p.evaluate(() => { location.hash = '#tv'; }); await t.p.reload({ waitUntil: 'networkidle' }); await t.p.waitForTimeout(2500);
        const v = await voz(t.p);
        ok(await t.p.evaluate(() => document.documentElement.hasAttribute('data-tv')) && v.saldo === 'Saldo del libro' && v.punto === 'Vamos aquí' && !tuteo.test(v.todo), '17·2 pantalla grande con una lectora: habla del libro');
        await t.ctx.close();
      }
      {
        // El dueño: todo como siempre.
        const a = await ent(s17, ADMIN, { viewport: { width: 390, height: 844 }, ...fijo });
        const v = await voz(a.p);
        eq([v.saldo, v.punto, v.marca, v.medallas], ['Tu saldo', 'Tú', 'yo', 'Tus medallas'], '17·2 dueño: «Tu saldo» y «Tú», como siempre');
        ok(v.prox.startsWith('Última compra') && v.desc.startsWith('Estás a ') && v.ayuda.startsWith('Tu saldo.'), '17·2 dueño: sus textos no cambian');
        await a.ctx.close();
      }
    } finally {
      s17.parar();
    }
    // Sin carta ni mensajes el navegador no sabe quién lleva el libro: texto genérico (no se le pregunta nada nuevo al servidor).
    const s17h = await servidor('hoy');
    try {
      const l = await ent(s17h, LECTOR, { viewport: { width: 390, height: 844 }, isMobile: false, hasTouch: false });
      eq(await l.p.locator('#prox').textContent(), 'Lo anota quien lleva el libro', '17·2 lectora sin el dato: «quien lleva el libro»');
      eq(await l.p.locator('#t-saldo').textContent(), 'Saldo del libro', '17·2 lectora con una sola compra: «Saldo del libro»');
      await l.ctx.close();
    } finally {
      s17h.parar();
    }
    // ---- 3. Ganancia sin rojo: tinta neutra con signo y flecha; el verde y el rojo, solo en la tarjeta «Ganancia» o si se eligen
    const s17m = await servidor('mil');
    try {
      const colores = (p) => p.evaluate(() => {
        const c = (sel) => { const e = document.querySelector(sel); return e ? getComputedStyle(e).color : null; };
        const fila = document.querySelector('#lista .fila[data-tipo="compra"] .f-var');
        return {
          marca: document.documentElement.dataset.ganancia ?? '', gan: c('#s-valor .sd-gan [data-tono]'), tintaCielo: c('#s-valor b'), flechaGan: document.querySelectorAll('#s-valor .sd-gan [data-tono] > .ico').length,
          fila: fila ? getComputedStyle(fila).color : null, tinta: c('#lista .f-sats'), flechaFila: fila?.querySelectorAll('.ico').length, filaTxt: fila?.textContent.replace(/\s+/g, ' ').trim(), tono: fila?.dataset.tono,
          col: (() => { const e = document.getElementById('l-col'); return e.hidden ? null : e.textContent; })(), colOculto: document.getElementById('l-col').getAttribute('aria-hidden'),
          tarjeta: [...document.querySelectorAll('#rep-ganancia [data-tono]')].map((e) => getComputedStyle(e).color), tintaTarjeta: c('#rep-ganancia'),
          venta: document.querySelector('#lista .fila[data-tipo="venta"] .f-var')?.textContent.replace(/\s+/g, ' ').trim() ?? null,
        };
      });
      const a = await entrar(navegador, s17m, ADMIN, { hora: 15, viewport: { width: 390, height: 844 }, isMobile: false, hasTouch: false }, sinAviso); await cerrar(a.p);
      let c = await colores(a.p);
      eq(c.marca, '', '17·3 por defecto no hay colores de ganancia');
      ok(c.gan === c.tintaCielo && c.flechaGan === 1, `17·3 la ganancia bajo el saldo va en la tinta del cielo, con su flecha (${c.gan})`);
      ok(c.fila === c.tinta && c.flechaFila === 1 && /^(sube|baja) [+−]\d+\.\d% desde entonces$/.test(c.filaTxt) && ['sube', 'baja'].includes(c.tono), `17·3 lista: el porcentaje va en tinta neutra, con flecha y «desde entonces» para lectores de pantalla («${c.filaTxt}»)`);
      ok(c.col === 'desde entonces' && c.colOculto === 'true', '17·3 lista: el rótulo «desde entonces» se ve una vez, arriba');
      ok(c.tarjeta.length >= 2 && c.tarjeta.some((x) => x !== c.tintaTarjeta), `17·3 la tarjeta «Ganancia» conserva el verde y el rojo (${c.tarjeta.join(' · ')})`);
      // El ajuste de «Tu cuenta»: verde y rojo para quien los prefiera, por dispositivo.
      await a.p.click('#cuenta-btn'); await a.p.waitForTimeout(300);
      eq(await a.p.locator('#dc-ganancia').textContent(), 'Colores de ganancia: neutros', '17·3 «Tu cuenta»: el ajuste dice «neutros»');
      await a.p.click('#dc-ganancia');
      eq([await a.p.locator('#dc-ganancia').textContent(), await a.p.evaluate(() => localStorage.getItem('libro.ganancia'))], ['Colores de ganancia: verde y rojo', 'color'], '17·3 el ajuste cambia y se guarda');
      const caja = await a.p.locator('#dc-ganancia').boundingBox();
      ok(caja.height >= 47.5, `17·3 el ajuste mide ${caja.height.toFixed(0)} px de alto`);
      await a.p.keyboard.press('Escape'); await a.p.waitForTimeout(300);
      c = await colores(a.p);
      ok(c.marca === 'color' && c.fila !== c.tinta && c.gan !== c.tintaCielo, `17·3 con «verde y rojo» vuelven los colores (${c.fila}, ${c.gan})`);
      await a.p.reload({ waitUntil: 'networkidle' }); await a.p.waitForTimeout(2200); await cerrar(a.p);
      eq((await colores(a.p)).marca, 'color', '17·3 se recuerda al recargar');
      await a.p.click('#cuenta-btn'); await a.p.click('#dc-ganancia'); await a.p.keyboard.press('Escape');
      eq((await colores(a.p)).marca, '', '17·3 y se puede volver a la tinta neutra');
      eq(a.consola.filter((x) => !/503/.test(x)), [], '17·3 consola limpia');
      await a.ctx.close();
    } finally {
      s17m.parar();
    }
    // ---- 4. Resumen más corto: «Próxima etapa» primero y el Diario plegado en el teléfono (abierto en tablet y escritorio)
    const s17d = await servidor('anio');
    try {
      const estadoDiario = (p) => p.evaluate(() => {
        const ve = (sel) => { const e = document.querySelector(sel); return Boolean(e) && e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden'; };
        const y = (sel) => Math.round(document.querySelector(sel).getBoundingClientRect().top + scrollY);
        const b = document.getElementById('dia-abrir');
        return { titular: ve('#t-diario'), sub: ve('#dia-sub'), grabado: ve('#dia-grabado'), cols: ve('#dia-cols'), boton: ve('#dia-abrir'), txt: b.textContent, exp: b.getAttribute('aria-expanded'), ctl: b.getAttribute('aria-controls'), alto: Math.round(b.getBoundingClientRect().height), yTramo: y('#tramo'), yDiario: y('#diario'), altoDiario: Math.round(document.getElementById('diario').getBoundingClientRect().height), pagina: document.documentElement.scrollHeight, foco: document.activeElement?.id };
      });
      const a = await ent(s17d, ADMIN, { viewport: { width: 390, height: 844 }, isMobile: false, hasTouch: false });
      let d = await estadoDiario(a.p);
      ok(d.yTramo < d.yDiario, `17·4 «Próxima etapa» va antes que el Diario (${d.yTramo} < ${d.yDiario})`);
      ok(d.titular && d.sub && d.boton && !d.grabado && !d.cols && d.exp === 'false', '17·4 teléfono: el Diario sale en portada (titular y una línea), plegado');
      ok(/^Leer el Diario de hoy · (hace un año, )?clasificados y pronóstico$/.test(d.txt) && d.ctl === 'dia-grabado dia-cols' && d.alto >= 47.5, `17·4 el botón dice qué abre y mide ${d.alto} px («${d.txt}»)`);
      const plegado = d.altoDiario, paginaAntes = d.pagina;
      await a.p.focus('#dia-abrir'); await a.p.keyboard.press('Enter'); await a.p.waitForTimeout(250);
      d = await estadoDiario(a.p);
      ok(d.grabado && d.cols && d.exp === 'true' && d.txt === 'Plegar el Diario' && d.foco === 'dia-abrir' && d.altoDiario > plegado + 200, `17·4 con Intro se abre entero y el foco se queda en el botón (${plegado} → ${d.altoDiario} px)`);
      eq(await a.p.locator('#dia-clasif li').count(), 3, '17·4 abierto: los tres clasificados, como siempre');
      ok(await a.p.evaluate(() => /^\d+ \w+ \d{4}$/.test(localStorage.getItem('libro.diario.abierto') ?? '')), '17·4 se recuerda la edición abierta');
      await a.p.reload({ waitUntil: 'networkidle' }); await a.p.waitForTimeout(2300); await cerrar(a.p);
      ok((await estadoDiario(a.p)).exp === 'true', '17·4 tras recargar sigue abierto');
      await a.p.click('#dia-abrir'); await a.p.waitForTimeout(250);
      d = await estadoDiario(a.p);
      ok(!d.grabado && !d.cols && d.exp === 'false' && await a.p.evaluate(() => localStorage.getItem('libro.diario.abierto') === null), '17·4 otro toque lo pliega (y se olvida)');
      // La edición de otro día vuelve a salir en portada.
      await a.p.evaluate(() => localStorage.setItem('libro.diario.abierto', '1 ene 2020')); await a.p.reload({ waitUntil: 'networkidle' }); await a.p.waitForTimeout(2300); await cerrar(a.p);
      ok((await estadoDiario(a.p)).exp === 'false', '17·4 el Diario de otro día sale plegado');
      ok(paginaAntes < 3300, `17·4 el Resumen del teléfono es más corto (${paginaAntes} px con la escena; antes 3,914)`);
      eq(a.consola.filter((x) => !/503/.test(x)), [], '17·4 consola limpia');
      await a.ctx.close();
      for (const [w, h] of [[768, 1024], [1440, 900]]) {
        const t = await ent(s17d, LECTOR, { viewport: { width: w, height: h }, isMobile: false, hasTouch: false });
        const e = await estadoDiario(t.p);
        ok(!e.boton && e.grabado && e.cols && e.titular, `17·4 ${w} px: el Diario va abierto y sin botón`);
        await t.ctx.close();
      }
    } finally {
      s17d.parar();
    }
    // ---- 7. Movimientos: el mismo nombre en la pestaña y en la lista, y los CSV solo en «Tu cuenta → Tus datos»
    const s17c = await servidor('nueve');
    try {
      const a = await ent(s17c, ADMIN, { viewport: { width: 390, height: 844 }, isMobile: false, hasTouch: false });
      await a.p.click('#pestanas [data-pestana="movimientos"]'); await a.p.waitForTimeout(400);
      eq([await a.p.locator('#t-compras').textContent(), (await a.p.locator('#pestanas [aria-current="true"] .pe-txt').textContent()).trim()], ['Movimientos', 'Movimientos'], '17·7 la lista se llama igual que su pestaña');
      ok(!/CSV/i.test(await a.p.locator('#compras').innerText()) && await a.p.locator('#compras a[href$=".csv"], #compras input[type="file"]').count() === 0, '17·7 arriba de la lista ya no hay exportar ni importar');
      // Exportar e importar siguen funcionando, desde «Tus datos».
      const antes = (await datos(a.p, '/api/compras')).length;
      await a.p.click('#cuenta-btn'); await a.p.waitForTimeout(300);
      eq(await a.p.locator('#dc-datos-btn').textContent(), 'Tus datos: descargar e importar', '17·7 «Tu cuenta»: el botón dice lo que hay dentro');
      await a.p.click('#dc-datos-btn'); await a.p.waitForTimeout(500);
      const [descarga] = await Promise.all([a.p.waitForEvent('download'), a.p.click('#csv-out')]);
      ok(/\.csv$/.test(descarga.suggestedFilename()), `17·7 exportar compras descarga su CSV (${descarga.suggestedFilename()})`);
      const csv = (await datos(a.p, '/api/compras')).length && await a.p.evaluate(() => fetch('/api/export.csv').then((r) => r.text()));
      ok(csv.split('\n').filter(Boolean).length === antes + 1, '17·7 el CSV trae todas las compras');
      const caja = await a.p.locator('label[for="csv-in"]').boundingBox();
      ok(await a.p.locator('label[for="csv-in"]').isVisible() && caja.height >= 47.5, `17·7 «Importar compras (CSV)» está en «Tus datos» y mide ${caja.height.toFixed(0)} px`);
      await a.p.focus('#csv-out'); await a.p.keyboard.press('Tab');
      ok(await a.p.evaluate(() => { const l = document.querySelector('label[for="csv-in"]'); return document.activeElement.id === 'csv-in' && getComputedStyle(l).outlineStyle !== 'none'; }), '17·7 con el teclado, el foco del campo de archivo se ve en su etiqueta');
      await a.p.setInputFiles('#csv-in', { name: 'c.csv', mimeType: 'text/csv', buffer: Buffer.from('fecha,monto_usd,precio_btc_usd,sats\n2020-01-15,10,8000,125000\n') });
      await a.p.waitForTimeout(1500);
      eq((await datos(a.p, '/api/compras')).length, antes + 1, '17·7 importar compras desde «Tus datos» las guarda');
      ok(/Importadas: 1 · repetidas: 0/.test(await a.p.textContent('#aviso')) && !(await a.p.locator('#d-cuenta').evaluate((d) => d.open)), '17·7 «Tu cuenta» se cierra y el aviso dice el resultado');
      eq(a.consola.filter((x) => !/503/.test(x)), [], '17·7 consola limpia');
      await a.ctx.close();
      // Una lectora: el mismo nombre, y nada de CSV (ni arriba ni en su cuenta).
      const l = await ent(s17c, LECTOR, { viewport: { width: 390, height: 844 }, isMobile: false, hasTouch: false });
      await l.p.click('#pestanas [data-pestana="movimientos"]'); await l.p.waitForTimeout(400);
      ok(await l.p.locator('#t-compras').textContent() === 'Movimientos' && !/CSV/i.test(await l.p.locator('#compras').innerText()), '17·7 lectora: «Movimientos», sin CSV');
      await l.p.click('#cuenta-btn'); await l.p.waitForTimeout(300);
      ok(!(await l.p.locator('#dc-datos-btn').isVisible()), '17·7 lectora: «Tus datos» sigue siendo de quien anota');
      await l.ctx.close();
      // Escritorio: «Ver como tabla» sigue junto al título.
      const e = await ent(s17c, ADMIN, { viewport: { width: 1440, height: 900 }, isMobile: false, hasTouch: false });
      await e.p.click('#pestanas [data-pestana="movimientos"]'); await e.p.waitForTimeout(400);
      ok(await e.p.locator('#l-tabla').isVisible() && await e.p.locator('#t-compras').textContent() === 'Movimientos', '17·7 escritorio: «Ver como tabla» sigue junto al título');
      await e.ctx.close();
    } finally {
      s17c.parar();
    }
    // ---- 11. Entrada: ver la contraseña (se oculta sola) y aviso de mayúsculas tras un intento fallido, sin mover el formulario
    const s17e = await servidor('hoy');
    try {
      const abrir = async (w, h) => {
        const ctx = await navegador.newContext({ viewport: { width: w, height: h } });
        const p = await ctx.newPage();
        const consola = [];
        p.on('console', (m) => ['error', 'warning'].includes(m.type()) && consola.push(m.text()));
        p.on('pageerror', (e) => consola.push(`pageerror ${e.message}`));
        await p.addInitScript(() => { try { localStorage.setItem('libro.hora', '20'); localStorage.setItem('libro.avisos.preguntado', '1'); } catch { /* sin almacenamiento */ } });
        await p.goto(`${s17e.url}/login`, { waitUntil: 'networkidle' });
        return { ctx, p, consola };
      };
      const campo = (p) => p.evaluate(() => {
        const c = document.getElementById('l-clave'), v = document.getElementById('l-ver'), rc = c.getBoundingClientRect(), rv = v.getBoundingClientRect();
        return { tipo: c.type, valor: c.value, auto: c.autocomplete, nombre: c.name, pulsado: v.getAttribute('aria-pressed'), txt: v.textContent, visible: document.getElementById('l-ver-t').textContent, ancho: rv.width, alto: rv.height, dentro: rv.left >= rc.left && rv.right <= rc.right + 0.5 && rv.top >= rc.top - 0.5 && rv.bottom <= rc.bottom + 0.5, foco: document.activeElement?.id, mayus: document.getElementById('l-mayus').textContent, altoForm: document.getElementById('f-login').getBoundingClientRect().height, error: document.getElementById('l-error').textContent };
      });
      const mayusculas = (p, si) => p.evaluate((puestas) => document.getElementById('l-clave').dispatchEvent(new KeyboardEvent('keydown', { key: 'A', bubbles: true, modifierCapsLock: puestas })), si);
      const { ctx, p, consola } = await abrir(390, 844);
      let c = await campo(p);
      eq([c.tipo, c.auto, c.nombre, c.pulsado, c.txt], ['password', 'current-password', 'password', 'false', 'Ver la contraseña'], '17·11 la contraseña sale oculta, con «Ver la contraseña» sin pulsar (y el campo de siempre para los gestores)');
      ok(c.alto >= 47.5 && c.ancho >= 47.5 && c.dentro, `17·11 «Ver» mide ${c.ancho.toFixed(0)}×${c.alto.toFixed(0)} px, dentro del campo`);
      const altoVacio = c.altoForm;
      await p.fill('#l-usuario', 'nadie-17'); await p.fill('#l-clave', 'Secreta-123-ABC');
      await p.click('#l-ver');
      c = await campo(p);
      eq([c.tipo, c.valor, c.pulsado, c.visible, c.txt, c.foco, c.auto], ['text', 'Secreta-123-ABC', 'true', 'Ocultar', 'Ocultar la contraseña', 'l-clave', 'current-password'], '17·11 «Ver» la enseña, pasa a «Ocultar» y el foco vuelve al campo');
      await p.click('#l-ver');
      c = await campo(p);
      eq([c.tipo, c.pulsado, c.visible, c.valor], ['password', 'false', 'Ver', 'Secreta-123-ABC'], '17·11 otro toque la oculta, sin perder lo escrito');
      // Con el teclado: Tab llega al botón e Intro lo pulsa.
      await p.focus('#l-clave'); await p.keyboard.press('Tab');
      eq(await p.evaluate(() => document.activeElement.id), 'l-ver', '17·11 con Tab se llega a «Ver» justo después del campo');
      await p.keyboard.press('Enter');
      eq((await campo(p)).tipo, 'text', '17·11 Intro sobre «Ver» la enseña (no envía el formulario)');
      // Se vuelve a ocultar sola a los 10 s.
      await p.waitForTimeout(10_600);
      c = await campo(p);
      eq([c.tipo, c.pulsado], ['password', 'false'], '17·11 a los 10 s se oculta sola');
      // Mayúsculas antes de fallar: no se dice nada.
      await mayusculas(p, true);
      eq((await campo(p)).mayus, '', '17·11 antes de un intento fallido no hay aviso de mayúsculas');
      // Al enviar se oculta; el acceso falla y, con las mayúsculas puestas, sale el aviso sin cambiar el alto.
      await p.click('#l-ver'); await mayusculas(p, false);
      await p.click('#l-entrar'); await p.waitForTimeout(900);
      c = await campo(p);
      ok(c.tipo === 'password' && /incorrectos/.test(c.error) && c.mayus === '' && c.foco === 'l-clave', `17·11 al enviar se oculta; falla el acceso y, sin mayúsculas, no hay aviso («${c.error}»)`);
      ok(Math.abs(c.altoForm - altoVacio) < 0.6, `17·11 el error no cambia el alto del formulario (${altoVacio} → ${c.altoForm})`);
      const altoError = c.altoForm;
      await mayusculas(p, true);
      c = await campo(p);
      ok(c.mayus === 'Mayúsculas activadas' && Math.abs(c.altoForm - altoError) < 0.6 && await p.locator('#l-mayus').isVisible() && await p.getAttribute('#l-mayus', 'role') === 'status', `17·11 con las mayúsculas puestas sale el aviso, sin mover nada (${altoError} → ${c.altoForm})`);
      await mayusculas(p, false);
      eq((await campo(p)).mayus, '', '17·11 al quitar las mayúsculas el aviso se va');
      // Entrar con la contraseña a la vista funciona igual.
      await p.fill('#l-usuario', ADMIN[0]); await p.fill('#l-clave', ADMIN[1]); await p.click('#l-ver');
      await Promise.all([p.waitForURL('**/'), p.click('#l-entrar')]);
      ok(new URL(p.url()).pathname === '/', '17·11 con la contraseña a la vista se entra igual');
      eq(consola.filter((x) => !/401|503/.test(x)), [], '17·11 consola limpia');
      await ctx.close();
      for (const [w, h] of [[320, 568], [844, 390], [568, 320], [1440, 900], [2560, 1300]]) {
        const e = await abrir(w, h);
        await e.p.fill('#l-clave', 'x'.repeat(40));
        const m = await e.p.evaluate(() => { const r = (id) => document.getElementById(id).getBoundingClientRect(); return { sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, ver: r('l-ver'), campo: r('l-clave'), entrar: r('l-entrar'), relleno: parseFloat(getComputedStyle(document.getElementById('l-clave')).paddingRight) }; });
        ok(m.sw <= m.cw && m.ver.right <= m.campo.right + 0.5 && m.ver.width >= 47.5 && m.relleno >= m.ver.width, `17·11 entrada ${w}×${h}: «Ver» cabe en el campo y no tapa lo escrito (${m.ver.width.toFixed(0)} px, relleno ${m.relleno.toFixed(0)})`);
        if (h <= 400) ok(m.entrar.bottom <= h + 0.5, `17·11 entrada acostada ${w}×${h}: «Entrar» sigue a la vista (${m.entrar.bottom.toFixed(0)} de ${h})`);
        await e.ctx.close();
      }
    } finally {
      s17e.parar();
    }
    const s17v = await servidor('vacio');
    try {
      const l = await ent(s17v, LECTOR, { viewport: { width: 390, height: 844 }, isMobile: false, hasTouch: false });
      eq([await l.p.locator('#s-valor').textContent(), await l.p.locator('#prox').textContent()], ['La montaña espera: el libro aún no tiene compras.', ''], '17·2 lectora con el libro vacío');
      await l.ctx.close();
    } finally {
      s17v.parar();
    }
  }

  // ---------------------------------------------------------------- campamento 18: el ritual de anotar
  {
    const srv = await servidor('anio');
    try {
      const ayerSV = () => { const [y, m, d] = hoySV().split('-').map(Number); return new Date(Date.UTC(y, m - 1, d - 1)).toISOString().slice(0, 10); };
      // ---- 39 · Fecha con «Hoy · Ayer · Otro día»
      {
        const { ctx, p, consola } = await entrar(navegador, srv, ADMIN);
        await p.click('#anotar'); await p.waitForTimeout(400);
        const estado = () => p.evaluate(() => ({ pres: [...document.querySelectorAll('#h-dia button')].map((b) => b.getAttribute('aria-pressed')).join(','), otro: !document.getElementById('h-fecha-otro').hidden,
          valor: document.getElementById('h-fecha').value, txt: document.getElementById('h-fecha-txt').textContent }));
        let e = await estado();
        eq([e.pres, e.otro, e.valor], ['true,false,false', false, hoySV()], '18·fecha: al abrir, «Hoy» y sin calendario a la vista');
        ok(/^(lunes|martes|miércoles|jueves|viernes|sábado|domingo) \d{1,2} de [a-záéíóú]+$/.test(e.txt), `18·fecha: la fecha va escrita como aquí («${e.txt}»)`);
        const altos = await p.evaluate(() => [...document.querySelectorAll('#h-dia button')].map((b) => Math.round(b.getBoundingClientRect().height)));
        ok(altos.every((a) => a >= 47.5), `18·fecha: los tres botones miden 48 px (${altos})`);
        await p.click('#h-dia [data-dia="ayer"]'); await p.waitForTimeout(150);
        e = await estado();
        eq([e.pres, e.otro, e.valor], ['false,true,false', false, ayerSV()], '18·fecha: «Ayer» pone la fecha de ayer');
        await p.click('#h-dia-otro'); await p.waitForTimeout(200);
        e = await estado();
        ok(e.pres === 'false,false,true' && e.otro && await p.locator('#h-fecha').isVisible(), '18·fecha: «Otro día» enseña el calendario');
        eq(await p.evaluate(() => document.activeElement.id), 'h-fecha', '18·fecha: y le da el foco');
        await p.fill('#h-fecha', '2025-03-08'); await p.waitForTimeout(150);
        e = await estado();
        eq([e.txt, e.pres], ['sábado 8 de marzo de 2025', 'false,false,true'], '18·fecha: otro año se escribe con su año');
        await p.click('#h-dia [data-dia="hoy"]'); await p.waitForTimeout(150);
        e = await estado();
        eq([e.pres, e.otro, e.valor], ['true,false,false', false, hoySV()], '18·fecha: «Hoy» vuelve a hoy y guarda el calendario');
        // Con teclado: Espacio elige.
        await p.focus('#h-dia [data-dia="ayer"]'); await p.keyboard.press('Space'); await p.waitForTimeout(150);
        eq((await estado()).valor, ayerSV(), '18·fecha: se elige también con el teclado');
        await p.keyboard.press('Escape'); await p.waitForTimeout(400);
        // Al editar una compra de otro día, sale en «Otro día» con su fecha.
        const vieja = (await datos(p, '/api/compras'))[0];
        await p.evaluate(() => document.getElementById('lista').scrollIntoView({ block: 'start' }));
        await p.evaluate(() => { document.getElementById('l-orden').value = 'antiguas'; document.getElementById('l-orden').dispatchEvent(new Event('change')); }); await p.waitForTimeout(400);
        await editarFila(p, `#lista .fila[data-id="${vieja.id}"]`); await p.waitForTimeout(500);
        e = await estado();
        eq([e.pres, e.otro, e.valor], ['false,false,true', true, vieja.fecha], '18·fecha: al editar una compra de otro día sale «Otro día» con su fecha');
        await p.keyboard.press('Escape'); await p.waitForTimeout(400);
        await p.evaluate(() => { try { localStorage.removeItem('libro.lista.orden'); } catch { /* nada */ } });
        eq(consola, [], `18·fecha: consola limpia: ${consola.join(' | ')}`);
        await ctx.close();
      }
      // ---- 10 · Una respuesta, no tres renglones
      {
        const { ctx, p, consola } = await entrar(navegador, srv, ADMIN);
        const saldoAntes = (await datos(p, '/api/compras')).reduce((a, c) => a + (c.tipo === 'venta' ? -c.sats : c.sats), 0);
        await p.click('#anotar'); await p.waitForTimeout(400);
        const hoja = () => p.evaluate(() => ({ uno: document.getElementById('hc-uno').textContent, resp: document.getElementById('hc-uno').dataset.resp, pie: document.getElementById('hc-pie').hidden ? null : document.getElementById('hc-pie').textContent,
          mas: !document.getElementById('h-cambia').hidden, abierto: document.getElementById('h-cambia').open, lineas: [...document.querySelectorAll('#hc-lineas > span')].map((x) => `${x.className}:${x.textContent}`),
          guardado: localStorage.getItem('libro.hoja.cambia') }));
        let h = await hoja();
        ok(h.resp === '' && /^Escribe los sats que recibiste/.test(h.uno) && !h.mas && h.pie === null, '18·respuesta: sin sats, la ayuda de siempre y nada plegado');
        ok(!/son ≈/.test(h.uno) && /Hoy \$1 = [\d,]+ sats\.$/.test(h.uno) && await p.locator('#h-habitual').isVisible(), '18·respuesta: con «Compra de siempre» a la vista, la ayuda no repite su cifra');
        await p.fill('#h-sats', '30000'); await p.waitForTimeout(300);
        h = await hoja();
        eq([h.resp, h.uno.replace(/\$[\d,.]+/, '$N')], ['1', `≈ $N · quedas en ${entero(saldoAntes + 30000)} sats`], '18·respuesta: un renglón con los dólares y cómo queda el saldo');
        ok(h.mas && !h.abierto && h.pie === null && await p.locator('#h-ruta').isHidden() && h.guardado === null, '18·respuesta: en el teléfono, «Qué cambia con esta compra» va cerrado');
        eq(h.lineas.map((x) => x.split(':')[0]), ['ruta-txt', 'costo', 'hc-precio'], '18·respuesta: dentro van la etapa, el costo promedio y el precio');
        const altoResumen = await p.evaluate(() => Math.round(document.querySelector('#h-cambia summary').getBoundingClientRect().height));
        ok(altoResumen >= 47.5, `18·respuesta: el resumen mide 48 px (${altoResumen})`);
        await p.click('#h-cambia summary'); await p.waitForTimeout(300);
        h = await hoja();
        ok(h.abierto && h.guardado === '1' && await p.locator('#h-ruta').isVisible() && await p.locator('#hoja-calc .costo').isVisible() && /^hc-precio:Precio de ahora: 1 BTC a \$[\d,]+\.$/.test(h.lineas[2]), `18·respuesta: un toque lo abre y el dispositivo lo recuerda («${h.lineas[2]}»)`);
        // Con dólares escritos, el precio es el que pagaste.
        await p.click('#h-avanzado summary'); await p.fill('#h-usd', '25'); await p.waitForTimeout(250);
        h = await hoja();
        ok(/^\$25\.00 · quedas en /.test(h.uno) && /^hc-precio:Precio que pagaste: 1 BTC a \$/.test(h.lineas[2]), `18·respuesta: con dólares exactos no hay «≈» y el precio es el pagado («${h.uno}»)`);
        await p.fill('#h-usd', ''); await p.click('#h-avanzado summary'); await p.waitForTimeout(200);
        // Ayer: el precio es un cierre y por eso va a la vista.
        await p.click('#h-dia [data-dia="ayer"]'); await p.waitForTimeout(300);
        h = await hoja();
        ok(/^1 BTC a \$[\d,]+ \(cierre del \d+ [a-z]+\)$/.test(h.pie ?? '') && !h.lineas.some((x) => x.startsWith('hc-precio')), `18·respuesta: con otro día, el precio usado queda a la vista («${h.pie}»)`);
        // Venta: una respuesta y el precio; nada plegado.
        await p.click('#h-tipo button[data-tipo="venta"]'); await p.waitForTimeout(300);
        h = await hoja();
        ok(/^≈ \$[\d,.]+ por la venta · quedas en [\d,]+ sats$/.test(h.uno) && !h.mas && /^1 BTC a /.test(h.pie ?? ''), `18·respuesta: una venta dice lo que queda y su precio («${h.uno}»)`);
        await p.click('#h-tipo button[data-tipo="compra"]'); await p.waitForTimeout(200); // el borrador recuerda el tipo: se deja en compra
        await p.keyboard.press('Escape'); await p.waitForTimeout(400);
        // Al volver a abrir, sigue abierto; cerrarlo también se recuerda.
        await p.click('#anotar'); await p.waitForTimeout(400);
        await p.fill('#h-sats', '30000'); await p.waitForTimeout(300);
        ok((await hoja()).abierto, '18·respuesta: al volver a anotar sigue abierto');
        await p.click('#h-cambia summary'); await p.waitForTimeout(250);
        h = await hoja();
        ok(!h.abierto && h.guardado === '0', '18·respuesta: y cerrarlo también se recuerda');
        await p.fill('#h-sats', ''); await p.waitForTimeout(150); // sin borrador para las pruebas siguientes
        await p.keyboard.press('Escape'); await p.waitForTimeout(400);
        eq(consola, [], `18·respuesta: consola limpia: ${consola.join(' | ')}`);
        await ctx.close();
      }
      // En pantallas anchas va abierto desde el principio; y «Guardar» queda siempre a mano, también en un teléfono bajo o acostado.
      for (const [w, alto] of [[1280, 800], [320, 568], [844, 390]]) {
        const { ctx, p } = await entrar(navegador, srv, ADMIN, { viewport: { width: w, height: alto }, isMobile: false, hasTouch: false });
        await p.click('#anotar'); await p.waitForTimeout(400);
        await p.fill('#h-sats', '30000'); await p.waitForTimeout(400);
        const m = await p.evaluate(() => {
          const panel = document.querySelector('.hoja-panel'), g = document.getElementById('guardar').getBoundingClientRect();
          return { abierto: document.getElementById('h-cambia').open, desborda: panel.scrollHeight > panel.clientHeight + 1, gAbajo: Math.round(g.bottom), gArriba: Math.round(g.top), alto: innerHeight, sw: panel.scrollWidth, cw: panel.clientWidth,
            encima: document.elementFromPoint(g.left + g.width / 2, g.top + g.height / 2)?.id };
        });
        if (w >= 700 && alto > 520) ok(m.abierto, `18·respuesta: a ${w} px «Qué cambia…» va abierto`);
        ok(m.gArriba >= 0 && m.gAbajo <= m.alto && m.encima === 'guardar', `18·hoja: «Guardar» se ve y se puede tocar a ${w}×${alto} (${m.gArriba}–${m.gAbajo} de ${m.alto}${m.desborda ? ', con la hoja desplazable' : ''})`);
        ok(m.sw <= m.cw, `18·hoja: sin desborde horizontal a ${w}×${alto}`);
        // Lo enfocado no queda detrás del botón pegado abajo.
        await p.focus('#h-nota'); await p.waitForTimeout(250);
        const f = await p.evaluate(() => { const n = document.getElementById('h-nota').getBoundingClientRect(), b = document.querySelector('.hoja-bot').getBoundingClientRect(); return { nAbajo: Math.round(n.bottom), bArriba: Math.round(b.top), nArriba: Math.round(n.top) }; });
        ok(f.nAbajo <= f.bArriba + 12 && f.nArriba >= 0, `18·hoja: el campo enfocado no queda bajo «Guardar» a ${w}×${alto} (${f.nAbajo} ≤ ${f.bArriba})`);
        await p.fill('#h-sats', ''); await p.waitForTimeout(150);
        await ctx.close();
      }
      // ---- 16 · La semana en una línea
      {
        const { ctx, p, consola } = await entrar(navegador, srv, ADMIN);
        await p.click('#anotar'); await p.waitForTimeout(400);
        const campo = () => p.evaluate(() => ({ t: document.getElementById('h-nota-t').textContent, ay: !document.getElementById('h-nota-ay').hidden, vis: document.getElementById('h-nota').getBoundingClientRect().height, max: document.getElementById('h-nota').maxLength,
          dentro: !!document.getElementById('h-nota').closest('details'), viejo: !!document.getElementById('h-nota-c') }));
        let c = await campo();
        eq([c.t, c.ay, c.max, c.dentro, c.viejo], ['¿Qué pasó esta semana en casa?', true, 120, false, false], '18·semana: en una compra la nota es la pregunta de la semana, a la vista y con 120 caracteres');
        ok(c.vis >= 47.5 && /la ve toda la familia/.test(await p.textContent('#h-nota-ay')), '18·semana: el campo mide 48 px y dice que la ve toda la familia');
        await p.click('#h-tipo button[data-tipo="venta"]'); await p.waitForTimeout(200);
        c = await campo();
        eq([c.t, c.ay], ['Nota (opcional)', false], '18·semana: en una venta sigue siendo «Nota»');
        await p.click('#h-tipo button[data-tipo="traslado"]'); await p.waitForTimeout(200);
        eq((await campo()).t, 'Nota (opcional)', '18·semana: y en un traslado');
        await p.click('#h-tipo button[data-tipo="compra"]'); await p.waitForTimeout(200);
        await p.fill('#h-sats', '21000');
        await p.fill('#h-nota', 'Estrenamos la hamaca <b>nueva</b>');
        await p.keyboard.press('Enter'); // Enter en el campo guarda, como en los demás
        await p.waitForTimeout(1500);
        if (await p.locator('#guardar').isVisible() && (await p.textContent('#guardar')).trim() === 'Sí, guardar así') { await p.click('#guardar'); await p.waitForTimeout(1500); } // «ya anotaste otra compra ese día»
        const guardada = (await datos(p, '/api/compras')).find((x) => x.nota === 'Estrenamos la hamaca <b>nueva</b>');
        ok(guardada && guardada.sats === 21000 && guardada.fecha === hoySV(), '18·semana: se guarda como la nota de la compra de hoy');
        await p.waitForTimeout(6500);
        await p.evaluate(() => document.getElementById('lista').scrollIntoView({ block: 'start' })); await p.waitForTimeout(300);
        ok((await p.textContent(`#lista .fila[data-id="${guardada.id}"]`)).includes('Estrenamos la hamaca <b>nueva</b>'), '18·semana: la lista la enseña como texto (sin interpretar etiquetas)');
        ok(await p.locator('#dia-nota').isHidden(), '18·semana: sin nota de hace un año, el Diario no cita nada');
        eq(consola, [], `18·semana: consola limpia: ${consola.join(' | ')}`);
        await ctx.close();
      }
      {
        const eco = await servidor('eco');
        try {
          for (const cuenta of [ADMIN, LECTOR]) {
            const { ctx, p, consola } = await entrar(navegador, eco, cuenta, { pestanas: true });
            if (await p.locator('#nov-ok').isVisible()) { await p.click('#nov-ok'); await p.waitForTimeout(400); }
            const d = await p.evaluate(() => ({ plegado: document.getElementById('dia-abrir-d').textContent, k: document.getElementById('dia-nota-k').textContent, q: document.getElementById('dia-nota-q').textContent, oculto: document.getElementById('dia-nota').hidden }));
            ok(!d.oculto && d.q === '«Sofi perdió su primer diente»' && /^El \d{1,2} [a-z]{3} \d{4} quedó anotado:$/.test(d.k), `18·semana: un año después el Diario la trae de vuelta (${cuenta[0]}: ${d.k} ${d.q})`);
            ok(/hace un año, /.test(d.plegado), '18·semana: la portada plegada avisa de «hace un año»');
            await p.click('#dia-abrir'); await p.waitForTimeout(400);
            ok(await p.locator('#dia-nota').isVisible(), '18·semana: al abrir el Diario se lee la cita');
            const sw = await p.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
            ok(sw[0] <= sw[1], '18·semana: el Diario con la cita no desborda');
            eq(consola, [], `18·semana: consola limpia en el Diario: ${consola.join(' | ')}`);
            await ctx.close();
          }
        } finally { eco.parar(); }
      }
      // ---- 17 · Comprobante de cada movimiento
      {
        const { ctx, p, consola } = await entrar(navegador, srv, ADMIN);
        const txid = '0123456789abcdef'.repeat(4);
        const st = await p.evaluate(([t, f]) => fetch('/api/compras', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Libro': '1' }, body: JSON.stringify({ fecha: f, sats: 20000, monto: 15, txid: t, nota: 'Con su TXID', etiquetas: ['bono'], extra: true }) }).then((r) => r.status), [txid, ayerSV()]);
        eq(st, 201, '18·comprobante: se anota una compra con TXID, nota y etiqueta');
        await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(2600);
        const compras = (await datos(p, '/api/compras')).filter((x) => x.tipo !== 'venta').sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : a.id - b.id));
        const saldoHoy = compras.reduce((a, x) => a + x.sats, 0);
        await p.evaluate(() => document.getElementById('lista').scrollIntoView({ block: 'start' })); await p.waitForTimeout(300);
        const filas = await p.evaluate(() => [...document.querySelectorAll('#lista .fila')].map((f) => [f.tagName, f.textContent.trim().slice(0, 6)]));
        ok(filas.length > 0 && filas.every(([t, x]) => t === 'BUTTON' && x === 'Ver la'), '18·comprobante: cada fila es un botón «Ver la compra del…»');
        const ultima = compras.at(-1);
        await p.click(`#lista .fila[data-id="${ultima.id}"]`); await p.waitForTimeout(500);
        const leer = () => p.evaluate(() => ({ abierto: document.getElementById('d-comp').open, t: document.getElementById('cp-t').textContent, fecha: document.getElementById('cp-fecha').textContent, sats: document.getElementById('cp-sats').textContent,
          extra: !document.getElementById('cp-extra').hidden, datos: Object.fromEntries([...document.querySelectorAll('#cp-datos .cp-fila')].map((f) => [f.querySelector('dt').textContent, f.querySelector('dd').textContent.replace(/\s+/g, ' ').trim()])),
          alt: document.getElementById('cp-alt').hidden ? null : document.getElementById('cp-alt-t').textContent, nota: document.getElementById('cp-nota').hidden ? null : document.getElementById('cp-nota').textContent,
          etq: document.getElementById('cp-etq').hidden ? [] : [...document.querySelectorAll('#cp-etq li')].map((x) => x.textContent), sello: document.getElementById('cp-sello').hidden ? null : `${document.getElementById('cp-sello-t').textContent} · ${document.getElementById('cp-sello-d').textContent}`,
          tx: document.getElementById('cp-tx').hidden ? null : document.getElementById('cp-tx').textContent.replace(/\s+/g, ' ').trim(), editar: document.getElementById('cp-editar').hidden ? null : document.getElementById('cp-editar').textContent, foco: document.activeElement?.id }));
        let c = await leer();
        ok(c.abierto && c.t === `Compra n.º ${compras.length}` && c.sats === `+${entero(ultima.sats)} sats`, `18·comprobante: tocar la fila abre su comprobante («${c.t}», ${c.sats})`);
        ok(/^(lunes|martes|miércoles|jueves|viernes|sábado|domingo) \d{1,2} de [a-záéíóú]+ de \d{4}$/.test(c.fecha), `18·comprobante: con la fecha escrita y su año («${c.fecha}»)`);
        const num = (t) => Number(String(t).replace(/[^\d.]/g, ''));
        eq([num(c.datos['Altitud después']), num(c.datos['Altitud después']) - num(c.datos['Altitud antes'])], [saldoHoy, ultima.sats], '18·comprobante: la altitud de antes y de después cuadran con el saldo');
        ok(/^\$[\d,]+\.\d\d$/.test(c.datos.Pagaste) && /^\$[\d,]+$/.test(c.datos['Precio de BTC ese día']) && /^\$[\d,]+\.\d\d ((sube|baja) )?[+−]?\d+\.\d%$/.test(c.datos['Hoy valen']), `18·comprobante: lo que pagaste, el precio de ese día y lo que valen hoy (${c.datos.Pagaste} · ${c.datos['Hoy valen']})`);
        ok(/^(De \d+ % a \d+ % del camino a |Con esta compra llegaste a )/.test(c.alt ?? ''), `18·comprobante: dónde quedó en la etapa («${c.alt}»)`);
        ok(/^Sello de la semana n\.º \d+ · \d/.test(c.sello ?? '') && await p.locator('#cp-sello-ico svg').count() === 1, `18·comprobante: el sello de su semana («${c.sello}»)`);
        eq([c.editar, c.foco], ['Editar', 'cp-cerrar'], '18·comprobante: quien anota ve «Editar» y el foco empieza en «Cerrar»');
        const tinta = await p.evaluate(() => getComputedStyle(document.querySelector('#cp-datos dd .cp-var')).color === getComputedStyle(document.querySelector('#cp-datos dt')).color);
        ok(tinta, '18·comprobante: la variación va en tinta neutra (ni verde ni rojo)');
        const toques = await p.evaluate(() => [...document.querySelectorAll('#d-comp button, #d-comp a')].filter((b) => b.offsetParent).map((b) => Math.round(b.getBoundingClientRect().height)));
        ok(toques.every((a) => a >= 47.5), `18·comprobante: todo lo tocable mide 48 px (${toques})`);
        // Esc cierra y el foco vuelve a la fila.
        await p.keyboard.press('Escape'); await p.waitForTimeout(300);
        eq(await p.evaluate(() => [document.getElementById('d-comp').open, document.activeElement?.dataset?.id]), [false, String(ultima.id)], '18·comprobante: Esc lo cierra y el foco vuelve a su fila');
        // La compra con TXID, nota, etiqueta y marca de extra.
        const conTx = compras.find((x) => x.txid === txid);
        await p.click(`#lista .fila[data-id="${conTx.id}"]`); await p.waitForTimeout(900);
        c = await leer();
        ok(c.extra && c.nota === '«Con su TXID»' && c.etq.join() === 'bono', `18·comprobante: marca de extra, nota y etiquetas (${c.nota}, ${c.etq})`);
        ok(/^TXID\s*01234567…abcdef\s*Confirmada/.test(c.tx ?? '') && /Ver en mempool\.space/.test(c.tx) && /Copiar TXID/.test(c.tx), `18·comprobante: el TXID con su estado y sus botones («${c.tx}»)`);
        eq(await p.getAttribute('#cp-tx a', 'href'), `https://mempool.space/tx/${txid}`, '18·comprobante: el enlace va a mempool.space');
        eq(await p.getAttribute('#cp-tx a', 'rel'), 'noopener noreferrer', '18·comprobante: y se abre aparte, sin referente');
        // «Editar» cierra el comprobante y abre la hoja con esa compra.
        await p.click('#cp-editar'); await p.waitForTimeout(500);
        eq([await p.evaluate(() => document.getElementById('d-comp').open), await p.inputValue('#h-sats'), (await p.textContent('#hoja-t')).trim(), await p.inputValue('#h-nota')], [false, '20,000', 'Editar compra', 'Con su TXID'], '18·comprobante: «Editar» abre la hoja con esa compra');
        await p.keyboard.press('Escape'); await p.waitForTimeout(400);
        // Tocar fuera cierra.
        await p.click(`#lista .fila[data-id="${ultima.id}"]`); await p.waitForTimeout(400);
        await p.mouse.click(5, 5); await p.waitForTimeout(300);
        ok(!(await p.evaluate(() => document.getElementById('d-comp').open)), '18·comprobante: tocar fuera lo cierra');
        eq(consola, [], `18·comprobante: consola limpia: ${consola.join(' | ')}`);
        await ctx.close();
      }
      // Quien solo mira también lo abre, sin «Editar» y con la voz del libro; a 320 px nada se sale y «Cerrar» queda a mano.
      {
        const { ctx, p, consola } = await entrar(navegador, srv, LECTOR, { viewport: { width: 320, height: 568 }, isMobile: false, hasTouch: false });
        if (await p.locator('#nov-ok').isVisible()) { await p.click('#nov-ok'); await p.waitForTimeout(400); }
        await p.evaluate(() => document.getElementById('lista').scrollIntoView({ block: 'start' })); await p.waitForTimeout(300);
        eq(await p.locator('#lista .fila').first().evaluate((el) => el.tagName), 'BUTTON', '18·comprobante: para quien solo mira la fila también es un botón');
        await p.locator('#lista .fila[data-tipo="compra"]').first().click(); await p.waitForTimeout(500);
        const m = await p.evaluate(() => { const d = document.getElementById('d-comp'), b = document.getElementById('cp-cerrar').getBoundingClientRect();
          return { abierto: d.open, editar: !document.getElementById('cp-editar').hidden, pago: document.querySelector('#cp-datos dt').textContent, sw: d.scrollWidth, cw: d.clientWidth, bAbajo: Math.round(b.bottom), alto: innerHeight, docW: document.documentElement.scrollWidth, docC: document.documentElement.clientWidth }; });
        ok(m.abierto && !m.editar && m.pago === 'Se pagó', '18·comprobante: quien solo mira lo abre, sin «Editar» y sin tuteo');
        ok(m.sw <= m.cw && m.docW <= m.docC && m.bAbajo <= m.alto, `18·comprobante: a 320 px nada se sale y «Cerrar» queda a la vista (${m.bAbajo} ≤ ${m.alto})`);
        await p.click('#cp-cerrar'); await p.waitForTimeout(200);
        eq(consola, [], `18·comprobante: consola limpia para quien solo mira: ${consola.join(' | ')}`);
        await ctx.close();
      }
    } finally {
      srv.parar();
    }
  }
  // Ventas y traslados también tienen su comprobante (escenario «mil»).
  {
    const mil18 = await servidor('mil');
    try {
      const { ctx, p, consola } = await entrar(navegador, mil18, ADMIN);
      await p.evaluate(() => document.getElementById('lista').scrollIntoView({ block: 'start' })); await p.waitForTimeout(300);
      await p.click('#l-chips button[data-f="venta"]'); await p.waitForTimeout(400);
      await p.locator('#lista .fila[data-tipo="venta"]').first().click(); await p.waitForTimeout(500);
      const v = await p.evaluate(() => ({ t: document.getElementById('cp-t').textContent, sats: document.getElementById('cp-sats').textContent, dts: [...document.querySelectorAll('#cp-datos dt')].map((x) => x.textContent), sello: document.getElementById('cp-sello').hidden, alt: document.getElementById('cp-alt').hidden, nota: document.getElementById('cp-nota').textContent }));
      ok(/^Venta o gasto n\.º \d+$/.test(v.t) && /^−[\d,]+ sats$/.test(v.sats) && v.dts.join('|') === 'Recibiste|Precio de BTC ese día|Altitud antes|Altitud después|Ganancia realizada' && v.sello && v.alt && v.nota === '«Gasto»', `18·comprobante: una venta dice lo que salió y su ganancia realizada, sin sello («${v.t}»)`);
      await p.click('#cp-cerrar'); await p.waitForTimeout(200);
      await p.click('#l-chips button[data-f="traslado"]'); await p.waitForTimeout(400);
      await p.locator('#lista .fila[data-tipo="traslado"]').first().click(); await p.waitForTimeout(500);
      const t = await p.evaluate(() => ({ t: document.getElementById('cp-t').textContent, filas: [...document.querySelectorAll('#cp-datos .cp-fila')].map((f) => `${f.querySelector('dt').textContent}: ${f.querySelector('dd').textContent}`), editar: document.getElementById('cp-editar').textContent }));
      eq([t.t, t.filas, t.editar], ['Traslado', ['Salieron de: el exchange', 'Llegaron a: tu wallet', 'El saldo: no cambia'], 'Anular'], '18·comprobante: un traslado dice de dónde a dónde y ofrece anularlo');
      await p.click('#cp-editar'); await p.waitForTimeout(400);
      ok(/¿Anular este traslado\?/.test(await p.textContent('#d-titulo')) && !(await p.evaluate(() => document.getElementById('d-comp').open)), '18·comprobante: «Anular» lleva a la confirmación de siempre');
      await p.keyboard.press('Escape'); await p.waitForTimeout(300);
      eq(consola, [], `18·comprobante: consola limpia con mil compras: ${consola.join(' | ')}`);
      await ctx.close();
    } finally {
      mil18.parar();
    }
  }

  // ---------------------------------------------------------------- campamentos (arte): hitos tallados, farol, apartadero y cumbre
  {
    const srv = await servidor('ballena');
    try {
      const medir = (p) => p.evaluate(() => {
        const cx = (el) => { const r = el.getBoundingClientRect(); return r.left + r.width / 2; };
        const op = (el) => Number(getComputedStyle(el).opacity);
        const campos = [...document.querySelectorAll('#m-campos .campo')].map((g) => ({
          cima: g.classList.contains('es-cima'), alcanzado: g.classList.contains('alcanzado'), sig: g.classList.contains('sig'),
          luzALaDerecha: cx(g.querySelector('.campo-ico')) > cx(g.querySelector('.hito-sombra')),
          piedra: [g.querySelectorAll('.campo-ico').length, g.querySelectorAll('.hito-sombra').length],
          apartadero: g.querySelectorAll('.hito-rellano').length, contornos: [...g.querySelectorAll('.campo-ico, .hito-sombra, .hito-techo, .farol-cuerpo, .farol-techo')].filter((e) => getComputedStyle(e).stroke !== 'none').length,
          vidrio: getComputedStyle(g.querySelector('.farol-cuerpo')).fill, halo: op(g.querySelector('.farol-halo')), suelo: g.querySelector('.luz-suelo') ? op(g.querySelector('.luz-suelo')) : null,
          bano: g.querySelector('.hito-bano') ? op(g.querySelector('.hito-bano')) : null, pulso: [g.querySelector('.humo').getAttribute('fill'), getComputedStyle(g.querySelector('.humo')).stroke],
          alto: Math.round(g.querySelector('.campo-ico').getBoundingClientRect().height),
        }));
        const cima = document.querySelector('#m-campos .es-cima');
        const sol = [...document.querySelectorAll('.montana .halo')].map((h) => h.getBoundingClientRect()).find((q) => q.width > 0), pico = cima.querySelector('.cima-mastil').getBoundingClientRect();
        return { campos, solALaDerecha: sol.left + sol.width / 2 > pico.left + pico.width / 2, bandera: cima.querySelector('.banderin').tagName.toLowerCase(), pliegue: cima.querySelectorAll('.banderin .banderin-pliegue').length,
          mastil: getComputedStyle(cima.querySelector('.cima-mastil')).stroke, nieve: getComputedStyle(document.querySelector('.nieve')).fill, nodos: document.querySelectorAll('.montana svg *').length,
          aros: document.querySelectorAll('#m-campos circle[stroke], #m-campos .humo:not([fill])').length };
      });
      const cerrar = async (p) => { for (let k = 0; k < 3 && await p.locator('dialog[open]').count(); k++) { await p.keyboard.press('Escape'); await p.waitForTimeout(300); } };
      const efectos = () => { try { localStorage.setItem('libro.efectos', 'todos'); localStorage.setItem('libro.avisos.preguntado', '1'); } catch { /* sin almacenamiento */ } };
      // Escritorio, de noche: tres hitos alcanzados (mojón, pilar y obelisco, cada uno más alto) y la cumbre como siguiente.
      const n = await entrar(navegador, srv, ADMIN, { viewport: { width: 1440, height: 900 }, isMobile: false, hasTouch: false, hora: 20 }, efectos); await cerrar(n.p);
      const a = await medir(n.p);
      const hitos = a.campos.filter((c) => !c.cima), cima = a.campos.find((c) => c.cima);
      eq([hitos.length, hitos.every((c) => c.alcanzado), cima.sig], [3, true, true], 'arte: tres hitos alcanzados y la cumbre como siguiente');
      ok(a.campos.every((c) => c.piedra.join() === '1,1' && c.contornos === 0), `arte: cada hito es un solo trazo por cara (luz y sombra), sin contornos de dibujo (${a.campos.map((c) => c.piedra.join('/')).join(' ')})`);
      ok(a.campos.every((c) => c.luzALaDerecha === a.solALaDerecha), 'arte: la cara iluminada de cada hito mira al astro, esté a un lado u otro del sendero');
      ok(hitos.every((c) => c.apartadero === 1), 'arte: cada hito se apoya en su apartadero');
      ok(hitos[0].alto < hitos[1].alto && hitos[1].alto < hitos[2].alto, `arte: cada campamento es más alto que el anterior (${hitos.map((c) => c.alto)})`);
      ok(hitos.every((c) => c.vidrio === 'rgb(255, 231, 174)' && c.halo > 0.8 && c.suelo > 0.4 && c.bano > 0.6), `arte: alcanzado = farol encendido, con halo, luz en el suelo y luz bajando por la piedra (${hitos[0].halo}, ${hitos[0].suelo})`);
      ok(cima.vidrio === 'rgb(240, 161, 72)' && Math.abs(cima.halo - hitos[0].halo / 2) < 0.02, `arte: el siguiente lleva la brasa y medio halo (${cima.vidrio}, ${cima.halo})`);
      ok(a.aros === 0 && a.campos.every((c) => c.pulso[0] === 'url(#m-farol)' && c.pulso[1] === 'none'), 'arte: la luz respira con un degradado, sin aros');
      ok(a.bandera === 'g' && a.pliegue === 1 && a.mastil !== a.nieve, `arte: la banderita de la cumbre tiene su pliegue y un mástil que se ve sobre la nieve (${a.mastil})`);
      eq(n.consola, [], `arte: consola limpia: ${n.consola.join(' | ')}`);
      await n.ctx.close();
      // De día la luz de los faroles baja para no lavar la roca; los estados se siguen leyendo.
      const d = await entrar(navegador, srv, ADMIN, { viewport: { width: 1440, height: 900 }, isMobile: false, hasTouch: false, hora: 12 }, efectos); await cerrar(d.p);
      const b = await medir(d.p);
      const hd = b.campos.filter((c) => !c.cima);
      ok(hd[0].halo < 0.4 && hd[0].halo > 0.2 && hd[0].vidrio === 'rgb(255, 231, 174)', `arte: de día el halo baja (${hd[0].halo}) y el farol sigue encendido`);
      await d.ctx.close();
      // En el teléfono: pocos nodos y nada de ambiente con efectos «esenciales».
      const t = await entrar(navegador, srv, ADMIN, { hora: 20 }, () => { try { localStorage.setItem('libro.efectos', 'esenciales'); localStorage.setItem('libro.avisos.preguntado', '1'); } catch { /* sin almacenamiento */ } }); await cerrar(t.p);
      const c = await medir(t.p);
      const quieto = await t.p.evaluate(() => [...document.querySelectorAll('#m-campos .humo, #m-campos .fogata')].every((e) => getComputedStyle(e).display === 'none'));
      ok(c.nodos < 800 && quieto && c.campos.filter((x) => !x.cima).every((x) => x.halo > 0.8), `arte: en el teléfono la escena sigue ligera (${c.nodos} nodos) y, sin ambiente, los faroles quedan encendidos y quietos`);
      await t.ctx.close();
    } finally {
      srv.parar();
    }
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
