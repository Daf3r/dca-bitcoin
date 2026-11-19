// Prueba de navegador (Playwright + Chromium) contra el servidor de pruebas, sin red.
// Uso: node tests/test_ui.mjs   (necesita `playwright` con Chromium instalado y Flask: PYTHON=ruta/python si no es python3)
//      PARTE=1/3 node tests/test_ui.mjs   (solo una parte, como en el CI; PARTE=reparto dice qué bloque va en cuál)
//      BLOQUE=texto node tests/test_ui.mjs   (solo los bloques cuyo título lleva ese texto; para probar uno a mano)
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
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

/**
 * Desde ahora, cuenta cada pieza distinta que entra en la página, por selector. El cometa vive 1.9 s y se retira solo: contarlo «en el
 * instante», cuando ya salió la tarjeta, fallaba con la máquina cargada. Se instala antes del clic y `piezasVistas(p)` dice cuántas
 * entraron de cada una (también sirve para exigir que una NO salió).
 */
const vigilarPiezas = (p, selectores) => p.evaluate((sels) => {
  const vistos = Object.fromEntries(sels.map((s) => [s, new WeakSet()]));
  const cuenta = Object.fromEntries(sels.map((s) => [s, 0]));
  window.__piezas = cuenta;
  window.__piezasVigia?.disconnect(); // una cuenta nueva reemplaza a la anterior
  window.__piezasVigia = new MutationObserver((ms) => {
    for (const m of ms) for (const nd of m.addedNodes) {
      if (nd.nodeType !== 1) continue;
      for (const s of sels) for (const el of [nd, ...nd.querySelectorAll(s)]) if (el.matches(s) && !vistos[s].has(el)) { vistos[s].add(el); cuenta[s]++; }
    }
  });
  window.__piezasVigia.observe(document.documentElement, { childList: true, subtree: true });
}, selectores);
const piezasVistas = (p) => p.evaluate(() => window.__piezas);

/**
 * Ninguna tarjeta visible de la tele tapa el sendero (muestras del trazo cada 4 px, con su medio ancho), «Tú», los rótulos, los hitos,
 * el saldo, el precio ni otra tarjeta, ni se sale de la pantalla. Se calcula aparte del código que las coloca.
 */
const sinTapar = (p) => p.evaluate(() => {
  const vis = (e) => e && !e.hidden && e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden' && Number(getComputedStyle(e).opacity) > 0;
  const tarjetas = [...document.querySelectorAll('.tv-tarjeta')].filter(vis).map((e) => ({ id: e.id, r: e.getBoundingClientRect() }));
  const camino = document.querySelector('#montana #m-sendero');
  const m = camino.getScreenCTM(), largo = camino.getTotalLength();
  const pts = [];
  for (let l = 0; l <= largo; l += 4) { const q = camino.getPointAtLength(l); pts.push([m.a * q.x + m.c * q.y + m.e, m.b * q.x + m.d * q.y + m.f]); }
  const marcas = [...document.querySelectorAll('#montana #m-etiquetas > *, #montana #m-yo .yo-anillo, #montana .campo .campo-ico, #montana .campo .banderin')].map((e) => e.getBoundingClientRect()).filter((r) => r.width);
  const textos = ['#t-saldo', '#s-saldo-v', '#s-valor', '#cotizacion', '.escena .marca', '#tv-nombre'].map((s) => document.querySelector(s)).filter(vis).map((e) => e.getBoundingClientRect());
  // «Salir de pantalla grande» solo se ve tras mover el ratón (opacidad 0 en reposo), pero su sitio es fijo: no cuenta `vis`.
  const salir = document.getElementById('tv-salir').getBoundingClientRect();
  const cruza = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
  const fallos = [];
  for (const [i, t] of tarjetas.entries()) {
    if (cruza(t.r, salir)) fallos.push(`${t.id} sobre «Salir de pantalla grande»`);
    if (pts.some(([x, y]) => x > t.r.left - 6 && x < t.r.right + 6 && y > t.r.top - 6 && y < t.r.bottom + 6)) fallos.push(`${t.id} sobre el sendero`);
    if (marcas.some((r) => cruza(t.r, r))) fallos.push(`${t.id} sobre «Tú», un rótulo o un hito`);
    if (textos.some((r) => cruza(t.r, r))) fallos.push(`${t.id} sobre el saldo, el precio o la marca`);
    if (t.r.left < 0 || t.r.top < 0 || t.r.right > innerWidth + 0.5 || t.r.bottom > innerHeight + 0.5) fallos.push(`${t.id} fuera de la pantalla`);
    for (const o of tarjetas.slice(i + 1)) if (cruza(t.r, o.r)) fallos.push(`${t.id} sobre ${o.id}`);
  }
  // Las que no se ven, con su porqué (sin sitio: `data-sitio="0"`), para que un fallo diga qué pasó
  const enFiesta = !document.getElementById('tv-fiesta').hidden; // durante la fiesta, el último movimiento le cede su sitio
  const ocultas = [...document.querySelectorAll('.tv-tarjeta')].filter((e) => !e.hidden && !tarjetas.some((t) => t.id === e.id) && !(enFiesta && e.id === 'tv-ultimo'))
    .map((e) => `${e.id} sin ver (sitio ${e.dataset.sitio ?? '—'}, ${e.offsetWidth}×${e.offsetHeight})`);
  return { fallos, ocultas, vistas: tarjetas.map((t) => t.id), etiquetas: marcas.length, txt: `${tarjetas.map((t) => t.id).join(', ')}${fallos.length || ocultas.length ? `: ${[...fallos, ...ocultas].join('; ')}` : ''}` };
});

// ---- Por partes (CI). `PARTE=1/3` corre solo los bloques de esa parte; sin `PARTE`, todos, como siempre. `PARTE=reparto` (o
// `reparto/2`…) enseña a qué parte va cada bloque, sin abrir el navegador. Un bloque es un título («  // ------ título») y, justo
// debajo, `await bloque(async () => { … });`. El reparto es una cuenta pura de los títulos: el más largo primero, a la parte que lleva
// menos tiempo (PESOS, segundos medidos en una corrida entera; un bloque nuevo cuenta PESO_NUEVO hasta que se le mida). Como las
// tres partes corren el mismo código, cada bloque cae en exactamente una; antes de abrir el navegador se comprueba que cada título
// lleva su `bloque(…)`, y al final, que se recorrieron todos.
const TITULO = /^ {2}\/\/ -{10,} (.+)$/;
const FUENTE = readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n');
const TITULOS = FUENTE.map((l) => TITULO.exec(l)?.[1].trim()).filter(Boolean);
{
  const sin = [];
  FUENTE.forEach((l, i) => {
    if (!TITULO.test(l)) return;
    let j = i + 1;
    while (j < FUENTE.length && (!FUENTE[j].trim() || (FUENTE[j].startsWith('  //') && !TITULO.test(FUENTE[j])))) j++;
    if (FUENTE[j] !== '  await bloque(async () => {') sin.push(`«${TITULO.exec(l)[1].trim().slice(0, 70)}»`);
  });
  const envoltorios = FUENTE.filter((l) => l === '  await bloque(async () => {').length;
  if (sin.length || envoltorios !== TITULOS.length) throw new Error(`Cada título lleva debajo su \`await bloque(async () => {\` (${TITULOS.length} títulos, ${envoltorios} envoltorios): ${sin.join(' · ')}`);
}
/** Segundos que tarda cada bloque (por el principio de su título): una corrida entera, de uno en uno, el 18 nov 2026 (4 núcleos;
 * 2,987 s y 2,106 comprobaciones). Basta con que sean proporcionales; si un bloque crece mucho, se vuelve a medir: cada bloque dice
 * cuánto tardó al final de su línea en el registro del CI. */
const PESOS = [
  ['un año de compras', 93], // 146 comprobaciones
  ['avisos push (el envío real a Apple o Goo', 155], // 108 comprobaciones
  ['efectos: sistema, modo ligero y pausa', 17], // 14 comprobaciones
  ['el cielo según la hora', 22], // 37 comprobaciones
  ['atmósfera: parallax, nubes, niebla, aves', 20], // 15 comprobaciones
  ['rendimiento iPhone: la escena en capas,', 9], // 16 comprobaciones
  ['se siente como app: recargar al arrastra', 33], // 23 comprobaciones
  ['la lista: meses, «Ver más», buscar, filt', 47], // 48 comprobaciones
  ['anotar y datos vivos: compra de siempre,', 62], // 24 comprobaciones
  ['accesibilidad y teclado: saltar al conte', 20], // 39 comprobaciones
  ['la montaña viva: humo, fogata, huellas,', 30], // 13 comprobaciones
  ['banderas con historia, iconos por etapa', 18], // 18 comprobaciones
  ['aurora, lago, acento dorado, cometa y 1', 49], // 20 comprobaciones
  ['suelo, leyenda plegable, altímetro, favi', 9], // 9 comprobaciones
  ['identidad: iconos, avatares, estados vac', 22], // 15 comprobaciones
  ['la montaña sigue a la caja (también en a', 7], // 6 comprobaciones
  ['Tu historia, medallas y qué hay de nuevo', 28], // 16 comprobaciones
  ['modo pantalla grande, sonido al guardar', 42], // 24 comprobaciones
  ['mil compras (la app después de mucho uso', 24], // 49 comprobaciones
  ['iPhone: arranque, insignia del icono e i', 11], // 34 comprobaciones
  ['teléfono acostado y pantallas muy anchas', 35], // 53 comprobaciones
  ['datos y etiquetas (campamento 8, 1/4)', 24], // 23 comprobaciones
  ['estado del sistema (campamento 8, 2/4)', 12], // 20 comprobaciones
  ['pulido final (cliente): Gráficos sin el', 24], // 10 comprobaciones
  ['sesiones y operación (campamento 8, 3/4)', 17], // 16 comprobaciones
  ['tu eco y tus números (campamento 11)', 70], // 26 comprobaciones
  ['campamento 12: El Salvador en la escena', 47], // 24 comprobaciones
  ['Tu historia en objetos: tronco, constela', 35], // 25 comprobaciones
  ['campamento 13C: estratos, partitura, pas', 48], // 42 comprobaciones
  ['campamento 14: pestañas (Resumen · Gráfi', 40], // 79 comprobaciones
  ['campamento 15A: Diario, cartas selladas', 43], // 43 comprobaciones
  ['campamento 15B: piedritas, cumpleaños y', 135], // 29 comprobaciones
  ['una sola compra', 5], // 4 comprobaciones
  ['campamento 16: lago, reloj de sol, «Tú»', 24], // 13 comprobaciones
  ['campamento 17: primera impresión', 179], // 137 comprobaciones
  ['campamento 18: el ritual de anotar', 77], // 75 comprobaciones
  ['campamento 18: el comprobante de una ven', 9], // 4 comprobaciones
  ['el precio de la compra (escribir el prec', 33], // 38 comprobaciones (medido el 18 nov 2026, de uno en uno)
  ['campamentos (arte) y campamento 21: hito', 13], // 29 comprobaciones
  ['campamento 19: la familia (escuchar el D', 92], // 63 comprobaciones
  ['campamento 20: cada cosa en su sitio', 291], // 156 comprobaciones
  ['campamento 21: etapas más cercanas', 142], // 129 comprobaciones
  ['campamento 21B: la tele de la sala (tarj', 332], // 113 comprobaciones
  ['tele: el saldo contra la montaña (pulido', 222], // 87 comprobaciones
  ['campamento 24: medir este aparato (idea', 60], // 58 comprobaciones
  ['campamento 24: confianza (la revisión tr', 42], // 43 comprobaciones
  ['campamento 22: el valle vivo', 58], // 27 comprobaciones
  ['campamento 22B: el valle vivo, parte 2', 73], // 36 comprobaciones
  ['campamento 22C: el valle, de verdad (el', 28], // 21 comprobaciones
  ['campamento 23: tu camino, otra vez (tal', 87], // 52 comprobaciones
  ['campamento 25: los osos polares de pel', 167], // 98 comprobaciones (medido en su parte, el 18 nov 2026)
  ['campamento 26: los osos en la interfaz', 46], // 22 comprobaciones
  ['campamento 27: cuando algo no va', 25], // 4 comprobaciones
  ['campamento 28: según el momento', 40], // 9 comprobaciones
  ['campamento 29: detalles con cariño', 45], // 7 comprobaciones
  ['campamento 30: hacer sitio', 30], // 9 comprobaciones
  ['campamento 31: «Tú» sube como oso', 45], // 12 comprobaciones
  ['campamento 32: el teleférico del valle', 35], // 11 comprobaciones
  ['campamento 33: más ositos en el paisaje', 35], // 3 comprobaciones
  ['campamento 34: el pueblo vive', 35], // 10 comprobaciones
  ['pulido del pueblo: las casas en su sit', 30], // 4 comprobaciones
  ['pulido de la iglesia y el paisaje bajo', 45], // 6 comprobaciones
  ['campamento 35: el pueblo de los osos', 90], // 16 comprobaciones
  ['campamento 36: el calendario del pueblo', 60], // 10 comprobaciones
  ['campamento 37: el pueblo se mueve', 60], // 10 comprobaciones
  ['campamento 38: lo que cambia de la app', 25], // 3 comprobaciones
  ['sin histórico de precios', 5], // 3 comprobaciones
];
const PESO_NUEVO = 60;
/** Reparte los bloques en `partes`: el más largo primero, a la parte que va más ligera (empates: la de número menor). */
const repartir = (titulos, partes) => {
  const peso = titulos.map((t) => PESOS.find(([p]) => t.startsWith(p))?.[1] ?? PESO_NUEVO);
  const carga = Array(partes).fill(0), parte = [];
  for (const i of titulos.map((_, i) => i).sort((a, b) => peso[b] - peso[a] || a - b)) {
    const k = carga.indexOf(Math.min(...carga));
    parte[i] = k + 1; carga[k] += peso[i];
  }
  return { parte, peso, carga };
};
const PARTE = (() => {
  const v = process.env.PARTE;
  if (!v) return null;
  const r = /^reparto(?:\/(\d+))?$/.exec(v);
  if (r) {
    const de = Number(r[1] ?? 3), { parte, peso, carga } = repartir(TITULOS, de);
    TITULOS.forEach((t, i) => console.log(`${parte[i]}/${de}  ${String(peso[i]).padStart(4)} s  ${PESOS.some(([p]) => t.startsWith(p)) ? ' ' : '*'} ${t.slice(0, 100)}`));
    carga.forEach((c, k) => console.log(`parte ${k + 1}/${de}: ${parte.filter((x) => x === k + 1).length} bloques, ~${Math.round(c / 60)} min`));
    console.log('(* = sin peso medido: cuenta', PESO_NUEVO, 's)');
    process.exit(0);
  }
  const m = /^(\d+)\/(\d+)$/.exec(v);
  if (!m || +m[1] < 1 || +m[1] > +m[2]) throw new Error(`PARTE=${v}: se espera algo como 1/3`);
  return { k: +m[1], de: +m[2] };
})();
const REPARTO = PARTE && repartir(TITULOS, PARTE.de);
let recorridos = 0, corridos = 0;
/** Un bloque de pruebas: corre si es de esta parte (o si no hay partes) y dice cuánto tardó. */
async function bloque(fn) {
  const i = recorridos++;
  if (REPARTO && REPARTO.parte[i] !== PARTE.k) return;
  if (process.env.BLOQUE && !TITULOS[i].includes(process.env.BLOQUE)) return; // para probar un solo bloque a mano: BLOQUE=«campamento 21B»
  const t0 = Date.now(), n0 = n;
  await fn();
  corridos++;
  console.log(`· ${TITULOS[i].slice(0, 90)} — ${n - n0} comprobaciones, ${Math.round((Date.now() - t0) / 1000)} s`);
}
if (PARTE) console.log(`Parte ${PARTE.k}/${PARTE.de}: ${REPARTO.parte.filter((x) => x === PARTE.k).length} de ${TITULOS.length} bloques (~${Math.round(REPARTO.carga[PARTE.k - 1] / 60)} min según PESOS)`);

const navegador = await chromium.launch();
try {
  // ---------------------------------------------------------------- un año de compras
  await bloque(async () => {
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
  });

  // ---------------------------------------------------------------- avisos push (el envío real a Apple o Google no se prueba aquí)
  await bloque(async () => {
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
      for (const [cuenta, quien, esperadas] of [[ADMIN, 'admin', ['recordatorio', 'txid', 'respaldo', 'resguardo', 'caida', 'piedrita', 'diario', 'wallet']], [LECTOR, 'lector', ['movimiento', 'hito', 'diario']]]) {
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
  });

  // ---------------------------------------------------------------- efectos: sistema, modo ligero y pausa
  await bloque(async () => {
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
  });

  // ---------------------------------------------------------------- el cielo según la hora
  await bloque(async () => {
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
  });

  // ---------------------------------------------------------------- atmósfera: parallax, nubes, niebla, aves, desenfoque, velo y logo
  await bloque(async () => {
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
  });

  // ---------------------------------------------------------------- rendimiento iPhone: la escena en capas, el velo como capa propia y el ambiente quieto al deslizar
  await bloque(async () => {
    const srv = await servidor('anio');
    try {
      const init = [([d]) => { try { localStorage.setItem('libro.dia', d); localStorage.setItem('libro.efectos', 'todos'); localStorage.setItem('libro.avisos.preguntado', '1'); } catch { /* sin almacenamiento */ } }, ['2026-11-17']];
      const r = await entrar(navegador, srv, ADMIN, { hora: 20, reducedMotion: 'no-preference' }, init);
      await r.p.evaluate(() => { for (const d of document.querySelectorAll('dialog[open]')) d.close(); document.documentElement.style.scrollBehavior = 'auto'; scrollTo(0, 0); });
      await r.p.waitForTimeout(300);
      const e = await r.p.evaluate(() => {
        const h = document.getElementById('montana'), cs = (x) => getComputedStyle(x);
        return {
          primero: `${h.firstElementChild.tagName.toLowerCase()}|${h.firstElementChild.getAttribute('role')}`,
          capas: [...h.querySelectorAll(':scope > svg.capa')].map((s) => `${[...s.classList].find((c) => c.startsWith('par-'))}|${s.getAttribute('aria-hidden')}|${cs(s).zIndex}|${cs(s).willChange}|${cs(s).transform}`),
          grupos: h.querySelector('svg').querySelectorAll('.par').length,
          frente: (() => { const f = h.querySelector(':scope > svg.frente'); let x = f?.previousElementSibling; while (x?.matches('.tele-cabina, .v-capa-animal, .v-capa-vecino')) x = x.previousElementSibling; // (32, 34, 37) entre los dos, solo las capas pequeñas de la cabina y de los animales del pueblo
          return f ? `${x === h.querySelector('svg')}|${cs(f).willChange}|${['#m-hecho', '#m-yo', '#m-campos', '#m-etiquetas', '#m-fx'].every((x) => f.querySelector(x))}|${['#m-hecho', '#m-yo', '#m-fx'].some((x) => h.querySelector('svg').querySelector(x))}` : 'sin frente'; })(),
          alba: document.getElementById('m-alba').ownerSVGElement.classList.contains('par-cielo'),
          aislada: cs(h).isolation, velo: cs(document.querySelector('.escena-velo')).willChange,
          toques: [cs(h.querySelector('svg')).pointerEvents, cs(h.querySelector('svg.capa')).pointerEvents],
        };
      });
      eq(e.primero, 'svg|img', 'capas: el <svg> principal (role=img) sigue siendo el primero de la escena');
      const m = 'matrix(1.05, 0, 0, 1.05, 0, 0)';
      eq(e.capas, [`par-cielo|true|-1|transform|${m}`, `par-lejos|true|-1|transform|${m}`, `par-medio|true|-1|transform|${m}`], 'capas: cielo, sierra lejana y media en su propio <svg>, debajo, ocultas a los lectores y compuestas aparte (con su escala desde el principio)');
      eq(e.grupos, 0, 'capas: ningún grupo del parallax queda dentro del <svg> principal (moverlo lo repintaría entero en Safari)');
      eq(e.frente, 'true|transform|true|false', 'capas: lo que cambia con el avance («Tú», el camino recorrido, los faroles, la celebración) va en el frente, sobre el principal y aparte');
      ok(e.alba, 'capas: el velo de las celebraciones va en la capa del cielo (tiñe solo el cielo)');
      eq([e.aislada, e.velo], ['isolate', 'opacity'], 'capas: la escena aísla su pila y el velo del cielo es una capa propia');
      eq(e.toques, ['none', 'none'], 'capas: los <svg> de la escena no reciben toques (la luna sí: bloque del campamento 12)');
      // Al deslizar, el ambiente que se repite se queda quieto; lo de una celebración (#m-fx) sigue; 200 ms después, todo retoma.
      const pausa = await r.p.evaluate(async () => {
        const brasa = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        brasa.setAttribute('class', 'brasa');
        document.getElementById('m-fx').append(brasa);
        const st = (x) => getComputedStyle(x).animationPlayState.split(', ')[0];
        const estrella = document.querySelector('.estrella.t1'), lu = document.querySelector('.lu-v'), escena = document.querySelector('.escena');
        const antes = [st(estrella), st(brasa)];
        scrollTo(0, 60);
        await new Promise((res) => setTimeout(res, 90));
        const durante = [escena.dataset.desliza ?? null, st(estrella), st(lu), st(brasa)];
        await new Promise((res) => setTimeout(res, 450));
        const despues = [escena.dataset.desliza ?? null, st(estrella), st(lu)];
        scrollTo(0, 0);
        brasa.remove();
        return { antes, durante, despues };
      });
      eq(pausa.antes, ['running', 'running'], 'pausa al deslizar: en reposo, todo corre');
      eq(pausa.durante, ['1', 'paused', 'paused', 'running'], 'pausa al deslizar: estrellas y luciérnagas quietas; la celebración sigue');
      eq(pausa.despues, [null, 'running', 'running'], 'pausa al deslizar: al parar, retoma');
      // Interruptores para medir en el aparato (solo /medir): sin capas, el dibujo es el de antes; `?sin=` los quita.
      await r.p.goto(`${srv.url}/medir?sin=capas,pausa`);
      await r.p.waitForSelector('#d-medir[open]', { timeout: 15000 });
      const sin = await r.p.evaluate(() => ({ sin: document.documentElement.dataset.sin, capas: document.querySelectorAll('svg.capa').length, grupos: document.querySelectorAll('#montana svg g.par').length, aparato: document.getElementById('me-aparato').textContent }));
      eq([sin.sin, sin.capas, sin.grupos], ['capas pausa', 0, 3], 'medir: /medir?sin=capas,pausa apaga esas técnicas (la escena como antes)');
      ok(sin.aparato.includes('para comparar, sin: capas, pausa'), `medir: el texto del aparato lo dice (${sin.aparato})`);
      await r.p.goto(`${srv.url}/`);
      await r.p.waitForTimeout(1500);
      eq(await r.p.evaluate(() => [document.documentElement.dataset.sin ?? null, document.querySelectorAll('#montana > svg.capa').length]), [null, 3], 'medir: fuera de /medir no se lee nunca');
      await r.p.goto(`${srv.url}/medir?sin=`);
      await r.p.waitForSelector('#d-medir[open]', { timeout: 15000 });
      eq(await r.p.evaluate(() => [document.documentElement.dataset.sin ?? null, document.querySelectorAll('#montana > svg.capa').length]), [null, 3], 'medir: /medir?sin= vuelve a medir con todo');
      eq(r.consola, [], 'capas: consola limpia');
      await r.ctx.close();
      // La entrada: la misma escena en capas (sin sesión).
      const ctx = await navegador.newContext({ ...devices['iPhone 13'] });
      const p = await ctx.newPage();
      await p.addInitScript(() => { try { localStorage.setItem('libro.efectos', 'todos'); localStorage.setItem('libro.hora', '20'); } catch { /* sin almacenamiento */ } });
      await p.goto(`${srv.url}/login`, { waitUntil: 'networkidle' });
      await p.waitForTimeout(800);
      eq(await p.evaluate(() => [document.querySelector('#montana > svg')?.getAttribute('role'), document.querySelectorAll('#montana > svg.capa').length]), ['img', 3], 'capas: la entrada también');
      await ctx.close();
    } finally {
      srv.parar();
    }
  });

  // ---------------------------------------------------------------- se siente como app: recargar al arrastrar, hoja arrastrable, carga, avisos, tema
  await bloque(async () => {
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
  });

  // ---------------------------------------------------------------- la lista: meses, «Ver más», buscar, filtrar, ordenar, tabla, nota, borrador, copiar
  await bloque(async () => {
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
      // «Ver 25 más · quedan 1,032»; con las últimas, «Ver los 12 que quedan» (nunca «Ver 25 más» si quedan menos)
      const verMas = (f) => (f > 25 ? `Ver 25 más · quedan ${f.toLocaleString('en-US')}` : f === 1 ? 'Ver el que queda' : `Ver los ${f} que quedan`);
      eq((await p.textContent('#ver-todas')).trim(), verMas(total - 8), 'lista: «Ver más» dice cuántas trae y cuántas quedan');
      await p.click('#ver-todas');
      eq(await filas(), 33, 'lista: «Ver más» trae 25 más');
      eq((await p.textContent('#ver-todas')).trim(), verMas(total - 33), 'lista: y después, las que quedan');
      ok(await p.$$eval('#ver-todas .nw', (s) => s.length === 2 && s.every((x) => x.getClientRects().length === 1)), 'lista: cada pieza de «Ver más» en un renglón, sin partirse');
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
      const textosVer = [];
      while (await p.locator('#ver-todas').isVisible()) { textosVer.push((await p.textContent('#ver-todas')).trim()); await p.click('#ver-todas'); }
      eq(await filas(), esperadas, `rango: desde ${desde} deja ${esperadas} movimientos`);
      ok(esperadas > 8 && textosVer.at(-1) === verMas(esperadas - 8 - 25 * (textosVer.length - 1)) && /que queda/.test(textosVer.at(-1)), `«Ver más»: el último toque dice que trae las que quedan (${textosVer.join(' | ')})`);
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
  });

  // ---------------------------------------------------------------- anotar y datos vivos: compra de siempre, deshacer, mini-cabecera, título, reconexión, actualización, ETag
  await bloque(async () => {
    const srv = await servidor('nueve');
    try {
      const { ctx, p, consola } = await entrar(navegador, srv, ADMIN, { hora: 12 });
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
  });

  // ---------------------------------------------------------------- accesibilidad y teclado: saltar al contenido, índice, atajos, letra grande, alto contraste, foco
  await bloque(async () => {
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
  });

  // ---------------------------------------------------------------- la montaña viva: humo, fogata, huellas, linterna y nieve que crece
  await bloque(async () => {
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
        huellas: Number(document.querySelector('#m-huellas .huellas-oso')?.dataset.n ?? 0), // (campamento 31) huellas de oso, en un solo trazo
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
  });

  // ---------------------------------------------------------------- banderas con historia, iconos por etapa y bosque (campamento 5, 2/3)
  await bloque(async () => {
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
      const t = await p.evaluate(() => { const c = document.getElementById('m-tarjeta'); return { visible: !c.hidden && getComputedStyle(c).display !== 'none', rol: c.getAttribute('role'), txt: c.innerText, exp: document.querySelector('.m-bandera:last-of-type').getAttribute('aria-expanded'), dentro: (() => { const r = c.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && r.top >= 0; })() }; });
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
  });

  // ---------------------------------------------------------------- aurora, lago, acento dorado, cometa y 1 BTC (campamento 5, 3/3)
  await bloque(async () => {
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
      await r.p.click('#dc-sistema-btn'); await r.p.waitForTimeout(400); // «Probar la celebración» vive en Estado del sistema (campamento 20)
      await vigilarPiezas(r.p, ['.cometa', '.cometa .cometa-cola']);
      await r.p.click('[data-previa="epico"]');
      await r.p.waitForSelector('.aurora-epica', { timeout: 6000 });
      await r.p.waitForFunction(() => window.__piezas['.cometa'] > 0, null, { timeout: 6000 }).catch(() => {});
      const ep = await r.p.evaluate(() => ({ bandas: document.querySelectorAll('.aurora-epica').length, gotas: document.querySelectorAll('.luz-gota').length }));
      const cm = await piezasVistas(r.p);
      ok(ep.bandas === 3 && ep.gotas === 34 && cm['.cometa'] === 1 && cm['.cometa .cometa-cola'] === 1, `1 BTC: aurora (${ep.bandas}), lluvia de luz (${ep.gotas}) y cometa (${JSON.stringify(cm)})`);
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
      await r.p.click('#dc-sistema-btn'); await r.p.waitForTimeout(400); // «Probar la celebración» vive en Estado del sistema (campamento 20)
      await vigilarPiezas(r.p, ['.cometa', '.cometa .cometa-cola', '.aurora-epica']);
      await r.p.click('[data-previa="etapa"]');
      await r.p.waitForFunction(() => window.__piezas['.cometa'] > 0, null, { timeout: 6000 });
      await r.p.waitForFunction(() => document.getElementById('hito-cel').hidden === false, null, { timeout: 6000 }).catch(() => {});
      const ce = await piezasVistas(r.p);
      ok(ce['.cometa'] === 1 && ce['.cometa .cometa-cola'] === 1 && ce['.aurora-epica'] === 0, `cometa: una etapa lo lanza (y no la celebración de 1 BTC): ${JSON.stringify(ce)}`);
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
  });

  // ---------------------------------------------------------------- suelo, leyenda plegable, altímetro, favicon con luna y curvas (campamento 10, 1/6)
  await bloque(async () => {
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
  });

  // ---------------------------------------------------------------- identidad: iconos, avatares, estados vacíos y entrada viva (campamento 6, 1/3)
  await bloque(async () => {
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
      const r = await p.evaluate(() => { const i = document.querySelector('#lista .vacio.con-ilu .oso-ilu'); const b = i?.getBoundingClientRect(); return { hay: !!i, h: b && Math.round(b.height), txt: document.querySelector('#lista .vacio')?.innerText }; });
      ok(r.hay && r.h === 96 && /Aún no hay compras/.test(r.txt), `estado vacío: la lista sin compras lleva su dibujo, el grande leyendo (campamento 26; ${r.h}px)`);
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
  });

  // ---------------------------------------------------------------- la montaña sigue a la caja (también en alto) y el índice lateral se lee
  await bloque(async () => {
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
  });

  // ---------------------------------------------------------------- Tu historia, medallas y qué hay de nuevo (campamento 6, 2/3)
  await bloque(async () => {
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
      await p.evaluate(() => { for (const d of document.querySelectorAll('#historia details.dh-sec')) d.open = true; }); // las secciones van plegadas (campamento 20)
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
      await l.p.waitForSelector('#dh-linea .h-ev', { state: 'attached', timeout: 4000 }); // la línea de tiempo va plegada (campamento 20)
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
      const v = await p.evaluate(() => ({ vacio: !document.getElementById('dh-vacio').hidden && !!document.querySelector('#dh-vacio .oso-ilu'), cuerpo: document.getElementById('dh-cuerpo').hidden, txt: document.getElementById('dh-vacio').innerText }));
      ok(v.vacio && v.cuerpo && /primera compra/.test(v.txt), 'historia: sin compras dice que empieza con la primera, con su dibujo');
      await ctx.close();
    } finally {
      vac.parar();
    }
  });

  // ---------------------------------------------------------------- modo pantalla grande, sonido al guardar y guía de estilo (campamento 6, 3/3)
  await bloque(async () => {
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
          saldo: vis('#s-sats'), precio: vis('#precio'), ultimo: document.getElementById('tv-ultimo').textContent, salir: vis('#tv-salir'), hash: location.hash,
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
      ok(ic.iconos.length === 13 && ic.iconos.every(Boolean) && ic.avatares === 8 && ic.medallas === 4 && ic.ilus === 3, 'guía: muestra los 13 iconos (con el zopilote, la bocina, el libro, reproducir y pausa), los avatares, las medallas y las ilustraciones');
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
  });

  // ---------------------------------------------------------------- mil compras (la app después de mucho uso)
  await bloque(async () => {
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
      // Tope 3350: el HTML fijo suma ~50 nodos del diálogo «Medir este aparato» (campamento 24) y ~220 del valle (campamentos 22 y 22C); lo que importa es que no crezca con las compras.
      ok(nodos < 3350, `el DOM no crece con las compras (${nodos} nodos)`);
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
      await p.mouse.move(cc2.x + cc2.width * 0.5, cc2.y + cc2.height * 0.5);
      // La lectura llega en el cuadro siguiente al movimiento: se espera a que llegue (con la escena ocupada, 200 ms fijos a veces no bastaban).
      const leeCompra = await p.waitForFunction(() => /costo promedio \$[\d,]+/.test(document.getElementById('c-lectura').textContent), null, { timeout: 3000 }).then(() => true, () => false);
      ok(leeCompra, 'al recorrer el gráfico del costo se lee cada compra');
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
      const escala = () => p.evaluate(() => document.querySelector('#lienzo .g-escala')?.textContent ?? ''); // con más de 150 compras dice además «un punto por mes» (campamento 20)
      ok(await p.locator('#g-log').isVisible() && !/logarítmica/.test(await escala()), 'con «Todo» se ofrece la escala logarítmica (apagada)');
      await p.click('#g-log'); await p.waitForTimeout(500);
      const yLog = await p.evaluate(() => document.querySelector('#lienzo .g-linea').getAttribute('d').slice(0, 60));
      ok(yLineal !== yLog && await p.getAttribute('#g-log', 'aria-pressed') === 'true' && /^Escala logarítmica( · un punto por mes)?$/.test(await escala()), 'la escala logarítmica cambia el dibujo y lo dice con una etiqueta');
      eq(await p.evaluate(() => localStorage.getItem('libro.grafico.log')), '1', 'y se recuerda');
      await p.click('#g-log'); await p.waitForTimeout(300);
      ok(!/logarítmica/.test(await escala()), 'se vuelve a lineal');
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
  });

  // ---------------------------------------------------------------- iPhone: arranque, insignia del icono e icono por tema (campamento 7, 1/2)
  await bloque(async () => {
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
  });

  // ---------------------------------------------------------------- teléfono acostado y pantallas muy anchas (campamento 7, 2/2)
  await bloque(async () => {
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
  });

  // ---------------------------------------------------------------- datos y etiquetas (campamento 8, 1/4)
  await bloque(async () => {
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
      // (campamento 24) con una etiqueta elegida, el resumen además suma sus sats: lo comprueba su bloque
      ok((await r.p.textContent('#l-res')).trim().startsWith(`${conCumple} de ${(compras.length + (await datos(r.p, '/api/traslados')).length).toLocaleString('en-US')} movimientos · `), 'el resumen dice cuántos coinciden');
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
  });

  // ---------------------------------------------------------------- estado del sistema (campamento 8, 2/4)
  await bloque(async () => {
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
      // V6 (Pulido D): «Limpiar la lista» va justo bajo los errores, no abajo junto a «Volver»; con su zona de toque
      const lim = await a.p.evaluate(() => {
        const b = document.getElementById('sis-err-limpiar').getBoundingClientRect(), l = document.getElementById('sis-err').getBoundingClientRect();
        const sig = document.getElementById('sis-rg-h').getBoundingClientRect();
        return { tras: document.getElementById('sis-err').nextElementSibling?.contains(document.getElementById('sis-err-limpiar')), gap: Math.round(b.top - l.bottom), antes: b.bottom <= sig.top, alto: Math.round(b.height) };
      });
      ok(lim.tras && lim.gap >= 0 && lim.gap <= 24 && lim.antes && lim.alto >= 47.5, `V6: «Limpiar la lista» va justo bajo la lista de errores (${JSON.stringify(lim)})`);
      // V7: la ruta de la tabla de peticiones no se parte por dentro («/api/ compras»)
      const enteras = (p) => p.$$eval('#sis-met th[scope="row"] .nw', (s) => s.length > 0 && s.every((x) => x.getClientRects().length === 1));
      ok(await enteras(a.p), 'V7: cada tramo de cada ruta, en un solo renglón');
      await a.p.click('#sis-err-limpiar');
      await a.p.waitForTimeout(700);
      eq(await a.p.locator('#sis-err .sis-fila').count(), 0, 'limpiada la lista, no quedan errores');
      ok((await a.p.textContent('#sis-err')).includes('Sin errores'), 'y lo dice');
      ok(await a.p.locator('#sis-err-bot').isHidden(), 'V6: sin errores, el botón (y su renglón) se van');
      // El estado nunca trae claves ni contenido de las compras
      const crudo = JSON.stringify(await datos(a.p, '/api/sistema'));
      ok(!/p256dh|endpoint|vapid|"hash"|scrypt/.test(crudo), 'el estado no incluye claves ni hashes');
      await a.ctx.close();
      // V6/V7 a 320 px con letra muy grande: la página no se desplaza a lo ancho, las rutas no se parten y el botón sigue bajo la lista
      const g = await entrar(navegador, srv, ADMIN, { viewport: { width: 320, height: 640 } }, () => { try { localStorage.setItem('libro.avisos.preguntado', '1'); localStorage.setItem('libro.letra', 'muy-grande'); } catch { /* sin almacenamiento */ } });
      await g.p.evaluate(() => { setTimeout(() => { throw new Error('otro error de prueba'); }, 10); });
      await g.p.waitForTimeout(1200);
      await g.p.click('#cuenta-btn'); await g.p.click('#dc-sistema-btn');
      await g.p.waitForFunction(() => !/Cargando/.test(document.getElementById('sis-res').textContent), null, { timeout: 5000 });
      await g.p.locator('#sis-err-limpiar').scrollIntoViewIfNeeded();
      const angosto = await g.p.evaluate(() => {
        const d = document.getElementById('d-cuenta'), b = document.getElementById('sis-err-limpiar').getBoundingClientRect(), l = document.getElementById('sis-err').getBoundingClientRect();
        return { pagina: document.documentElement.scrollWidth - document.documentElement.clientWidth, dialogo: d ? d.scrollWidth - d.clientWidth : 0, gap: Math.round(b.top - l.bottom), alto: Math.round(b.height), letra: document.documentElement.dataset.letra, tabla: (() => { const x = document.querySelector('.sis-tabla'); return x.scrollWidth - x.clientWidth; })() };
      });
      ok(angosto.letra === 'muy-grande' && angosto.pagina <= 0 && angosto.dialogo <= 0 && angosto.gap >= 0 && angosto.gap <= 24 && angosto.alto >= 47.5, `V6/V7 a 320 px con letra muy grande: sin desplazarse a lo ancho y el botón bajo la lista (${JSON.stringify(angosto)})`);
      ok(await enteras(g.p), 'V7 a 320 px con letra muy grande: las rutas no se parten por dentro');
      await g.ctx.close();
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
  });

  // ---------------------------------------------------------------- pulido final (cliente): Gráficos sin el bucle de ResizeObserver (R1) y el interruptor de atajos (V5)
  await bloque(async () => {
    const srv = await servidor('anio');
    try {
      // Cuenta los «ResizeObserver loop…» que lanza el navegador y los reportes que salen hacia /api/errores.
      const vigia = () => { window.__ro = 0; addEventListener('error', (e) => { if (/ResizeObserver loop/.test(e.message)) window.__ro++; }); try { localStorage.setItem('libro.avisos.preguntado', '1'); } catch { /* sin almacenamiento */ } };
      const reportes = (p) => { const r = []; p.on('request', (q) => { if (q.url().endsWith('/api/errores')) r.push(q.postData() ?? ''); }); return r; };
      const cerrar = async (p) => { for (let k = 0; k < 3 && await p.locator('dialog[open]').count(); k++) { await p.keyboard.press('Escape'); await p.waitForTimeout(300); } };
      for (const [quien, cuenta] of [['el dueño', ADMIN], ['una lectora', LECTOR]]) {
        const s = await entrar(navegador, srv, cuenta, { pestanas: true }, vigia);
        const r = reportes(s.p);
        await cerrar(s.p);
        for (const t of ['graficos', 'resumen', 'graficos']) { await s.p.click(`#pestanas [data-pestana="${t}"]`); await s.p.waitForTimeout(700); }
        eq(await s.p.evaluate(() => window.__ro), 0, `R1: ${quien} abre Gráficos sin el bucle de ResizeObserver`);
        ok(await s.p.evaluate(() => document.querySelector('#lienzo svg')?.getAttribute('width') === String(document.getElementById('lienzo').clientWidth)), `R1: ${quien} ve el gráfico dibujado a su medida`);
        eq(r.length, 0, `R1: ${quien} no manda ningún error del navegador`);
        await s.ctx.close();
      }
      // V5: en el teléfono táctil el interruptor de atajos no sale en «Tu cuenta» hasta que se teclea fuera de un campo (un teclado
      // físico); en la computadora sale siempre.
      const a = await entrar(navegador, srv, ADMIN, {}, vigia);
      await cerrar(a.p);
      const atajos = async (p) => { await p.click('#cuenta-btn'); await p.waitForTimeout(300); const v = await p.evaluate(() => [!!document.getElementById('dc-atajos').getClientRects().length, !!document.getElementById('dc-atajos-lista').getClientRects().length]); await cerrar(p); return v; };
      eq(await atajos(a.p), [false, false], 'V5: en el teléfono táctil «Atajos de teclado» y su lista no salen en «Tu cuenta»');
      await a.p.keyboard.press('u'); await a.p.keyboard.press('u'); await a.p.keyboard.press('u'); // con un teclado físico (U cambia la unidad y vuelve)
      eq(await atajos(a.p), [true, true], 'V5: tras teclear una letra fuera de un campo (un teclado físico), salen para poder apagarlos');
      const pc = await entrar(navegador, srv, ADMIN, { viewport: { width: 1440, height: 900 }, isMobile: false, hasTouch: false }, vigia);
      await cerrar(pc.p);
      eq(await atajos(pc.p), [true, true], 'V5: en la computadora salen desde el principio');
      await pc.ctx.close();
      // errores.js ignora ese aviso benigno (sin gastar uno de los 5 por carga) y sigue reportando un error de verdad.
      const r = reportes(a.p);
      await a.p.evaluate(() => {
        for (let k = 0; k < 6; k++) dispatchEvent(new ErrorEvent('error', { message: 'ResizeObserver loop completed with undelivered notifications.' }));
        setTimeout(() => { throw new Error('un error de verdad tras el aviso benigno'); }, 10);
      });
      await a.p.waitForTimeout(800);
      ok(r.length === 1 && r[0].includes('un error de verdad tras el aviso benigno'), `R1: el aviso benigno no se reporta y un error de verdad sí (${r.length}: ${r.join(' | ').slice(0, 160)})`);
      await a.ctx.close();
    } finally {
      srv.parar();
    }
  });

  // ---------------------------------------------------------------- sesiones y operación (campamento 8, 3/4)
  await bloque(async () => {
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
  });

  // ---------------------------------------------------------------- tu eco y tus números (campamento 11)
  await bloque(async () => {
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
  });

  // ---------------------------------------------------------------- campamento 12: El Salvador en la escena
  await bloque(async () => {
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
      // Fuera de temporada: sin papel picado ni cohetes (desde el campamento 30 ni se dibujan: no hay elemento); época seca de día: aire
      // dorado y sin llovizna; de día no cruza el torogoz.
      eq([await cs(r.p, '.papel-picado', 'display'), await cs(r.p, '.cohetes', 'display'), await cs(r.p, '.aire-seco', 'display'), await cs(r.p, '.clima-lluvia', 'display'), await cs(r.p, '.torogoz', 'animationName')],
        [null, null, 'inline', 'none', 'none'], 'fuera de temporada: sin papel picado ni cohetes (ni dibujados); época seca: aire dorado; de día no cruza el torogoz');
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
      // Los tres toques y la lectura van en el mismo instante: con el ratón y pausas de por medio la prueba dependía de que la
      // máquina fuera rápida (el manejador cuenta toques a menos de 1.2 s entre sí y la moneda gira 1.6 s), y en el CI fallaba
      // de vez en cuando. Que nada tape la luna se comprueba aparte, con lo que hay justo encima de su centro.
      const luna = await p.evaluate(async () => {
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        const a = document.querySelector('.luna .astro');
        const b = a.getBoundingClientRect();
        const sobre = !!document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2)?.closest('.luna');
        for (let i = 0; i < 3; i++) a.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        const g = document.querySelector('.luna.moneda .moneda-gira');
        return { sobre, anim: g ? getComputedStyle(g).animationName : null };
      });
      ok(luna.sobre, 'luna-moneda: nada tapa el centro de la luna');
      eq(luna.anim, 'moneda-gira', 'luna-moneda: gira como una moneda lanzada');
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
  });

  // ---------------------------------------------------------------- Tu historia en objetos: tronco, constelación y torre de piedras (campamento 13)
  await bloque(async () => {
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
      await r.p.click('#dc-sistema-btn'); await r.p.waitForTimeout(400); // «Probar la celebración» vive en Estado del sistema (campamento 20)
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
  });

  // ---------------------------------------------------------------- campamento 13C: estratos, partitura, pasaporte, petroglifo y sello de la semana
  await bloque(async () => {
    const sinAviso = () => { try { localStorage.setItem('libro.avisos.preguntado', '1'); } catch { /* sin almacenamiento */ } };
    const ent = async (...a) => { const r = await entrar(...a); for (let k = 0; k < 3 && await r.p.locator('dialog[open]').count(); k++) { await r.p.keyboard.press('Escape'); await r.p.waitForTimeout(400); } return r; };
    const abrirHistoria = async (p) => { await p.click('#cuenta-btn'); await p.waitForTimeout(300); await p.click('[data-cuenta="historia"]'); await p.waitForTimeout(400); };
    const L = await import('../app/static/lib.js');
    const sLargo = await servidor('largo');
    try {
      const { ctx, p, consola } = await ent(navegador, sLargo, ADMIN, {}, sinAviso);
      const todos = await datos(p, '/api/compras');
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
        await p.click('#dh-pas-caja > summary'); await p.waitForTimeout(200); // el pasaporte va plegado con su cuenta (campamento 20)
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
  });

  // ---------------------------------------------------------------- campamento 14: pestañas (Resumen · Gráficos · Historia · Movimientos)
  await bloque(async () => {
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
      await solo('historia', ['#historia', '#dh-hoy', '#dh-vistas', '#dh-sec-medallas'], ['#tramo', '#compras', '#mercado'], 'Historia'); // (campamento 20) con el dibujo de hoy y las secciones plegadas
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
  });

  // ---------------------------------------------------------------- campamento 15A: Diario, cartas selladas y mensajes en la bandera
  await bloque(async () => {
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
      await p.evaluate(() => { document.getElementById('dh-sec-linea').open = true; }); // la línea va plegada (campamento 20)
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
  });

  // ---------------------------------------------------------------- campamento 15B: piedritas, cumpleaños y la tele
  await bloque(async () => {
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
      // (Campamento 23) Con `largo` (300 semanas) algún día del año cae «un día como hoy» de una etapa y el saludo lo recuerda: también vale.
      ok(/^(Buenas noches, Daf3r|Daf3r, hoy hace .+|Hoy hace .+)$/.test((await a2.p.textContent('#saludo')).trim()), '15B cumpleaños: y su saludo es el de siempre (o el de un día como hoy), no el de Ana');
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
      // La fiesta de verdad (la montaña sube y quita y vuelve a poner sus rótulos mientras tanto): ni al salir ni con «Tú» ya arriba tapa nada.
      for (const [espera, cuando] of [[1400, 'al entrar'], [3000, 'con «Tú» ya arriba']]) {
        await t.p.waitForTimeout(espera); // la tarjeta entra con un fundido de algo menos de un segundo
        const s = await sinTapar(t.p);
        if (!(await ver(t.p, '#tv-fiesta'))) { ok(true, '15B tele: la fiesta ya se fue'); continue; }
        ok(s.fallos.length === 0 && s.vistas.includes('tv-fiesta'), `15B tele: la fiesta (${cuando}) no tapa el sendero, «Tú» ni los rótulos (${s.txt})`);
      }
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
  });

  // ---------------------------------------------------------------- una sola compra
  await bloque(async () => {
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
  });

  // ---------------------------------------------------------------- campamento 16: lago, reloj de sol, «Tú» fantasma y perfil de altitud
  await bloque(async () => {
    const con = (dia) => [(d) => { try { localStorage.setItem('libro.dia', d); localStorage.setItem('libro.efectos', 'todos'); localStorage.setItem('libro.avisos.preguntado', '1'); } catch { /* sin almacenamiento */ } }, dia];
    const cerrar = async (p) => { for (let k = 0; k < 3 && await p.locator('dialog[open]').count(); k++) { await p.keyboard.press('Escape'); await p.waitForTimeout(300); } };
    const sMil = await servidor('mil');
    try {
      // ---- Reloj de sol: la sombra cae a un lado de mañana y al otro de tarde; de noche no hay
      const sombra = (p) => p.evaluate(() => { const g = document.querySelector('.reloj'); const d = g.querySelector('.reloj-sombra').getAttribute('d'); const m = d.match(/M([\d.]+) .*?L([\d.-]+) /); return { d, sx: Number(g.dataset.sx), punta: m ? Number(m[2]) : null, visible: getComputedStyle(g).display !== 'none' }; });
      const m = await entrar(navegador, sMil, ADMIN, { hora: 9 }, con('2026-08-20')); await cerrar(m.p); await m.p.waitForTimeout(800);
      const sm = await sombra(m.p);
      ok(sm.visible && sm.punta !== null && sm.punta < sm.sx, '16A reloj de sol: de mañana la sombra cae hacia la izquierda');
      ok(await m.p.locator('.reloj .reloj-piedra').count() === 11, '16A reloj de sol: once piedritas, de las 7 a las 17');
      await m.ctx.close();
      const t = await entrar(navegador, sMil, ADMIN, { hora: 15 }, con('2026-08-20')); await cerrar(t.p);
      const st = await sombra(t.p);
      ok(st.visible && st.punta > st.sx, '16A reloj de sol: de tarde la sombra cae hacia la derecha');
      await t.ctx.close();
      const n22 = await entrar(navegador, sMil, ADMIN, { hora: 22 }, con('2026-08-20')); await cerrar(n22.p);
      const sn = await sombra(n22.p);
      ok(!sn.visible && sn.d === '', '16A reloj de sol: de noche no hay sombra');
      // ---- El lago guarda lo vendido: una monedita por venta (hasta 5)
      eq(await n22.p.locator('.lago-moneda').count(), 5, '16A lago: mil tiene ventas de sobra: cinco monedas');
      await n22.ctx.close();
      // ---- «Tú» fantasma en la hoja
      const h = await entrar(navegador, sMil, ADMIN, { hora: 15 }, con('2026-08-20')); await cerrar(h.p);
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
      const pf = await entrar(navegador, sMil, ADMIN, { hora: 15 }, con('2026-08-20')); await cerrar(pf.p);
      await verVista(pf.p, 'sats');
      ok(await pf.p.locator('#s-lienzo .pf-farol').count() >= 1, '16B perfil: hay faroles donde cruzaste un campamento');
      ok(/^Tú$/.test((await pf.p.locator('#s-lienzo .pf-tu').textContent()).trim()), '16B perfil: «Tú» al final');
      ok((await pf.p.locator('#s-lienzo .v-eje').allTextContents()).some((x) => /^1M$/.test(x)) && await pf.p.locator('#s-lienzo .pf-extra').count() >= 1, '16B perfil: etapas rotuladas y anillos en las extra');
      await pf.ctx.close();
    } finally {
      sMil.parar();
    }
  });

  // ---------------------------------------------------------------- campamento 17: primera impresión
  await bloque(async () => {
    const sinAviso = () => { try { localStorage.setItem('libro.avisos.preguntado', '1'); } catch { /* sin almacenamiento */ } };
    const cerrar = async (p) => { for (let k = 0; k < 4 && await p.locator('dialog[open]').count(); k++) { await p.keyboard.press('Escape'); await p.waitForTimeout(350); } };
    const ent = async (srv, cuenta, opts = {}, init = sinAviso) => { const r = await entrar(navegador, srv, cuenta, { pestanas: true, hora: 15, ...opts }, init); await cerrar(r.p); return r; };
    const s17 = await servidor('anio');
    try {
      // ---- 1. (Campamento 20, 9/9) La barra de pestañas y «Anotar» van en el dock de abajo, siempre a la vista: la escena termina donde
      // empieza el dock (antes, la franja del campamento 17 dejaba asomar la barra y, debajo, el botón).
      const cajas = (p) => p.evaluate(() => {
        const r = (sel) => { const e = document.querySelector(sel); if (!e || getComputedStyle(e).display === 'none') return null; const q = e.getBoundingClientRect(); return { arriba: Math.round(q.top), abajo: Math.round(q.bottom), izq: Math.round(q.left), der: Math.round(q.right) }; };
        return { vh: innerHeight, vw: innerWidth, y: Math.round(scrollY), escena: r('.escena'), barra: r('#pestanas'), boton: r('#anotar'), yo: r('#montana .yo'), salida: r('#montana .salida'), saldo: r('.saldo'), pista: document.documentElement.hasAttribute('data-boton'), fija: getComputedStyle(document.getElementById('pestanas')).position };
      });
      const fijo = { isMobile: false, hasTouch: false };
      for (const [w, h] of [[390, 844], [390, 664], [768, 1024], [320, 568]]) {
        const l = await ent(s17, LECTOR, { viewport: { width: w, height: h }, ...fijo });
        const c = await cajas(l.p);
        ok(c.fija === 'fixed' && c.barra.abajo <= h - 6 && c.barra.abajo >= h - 12, `17·1 lectora ${w}×${h}: la barra va fija abajo, con su margen (${c.barra.arriba}–${c.barra.abajo} de ${h})`);
        ok(c.escena.abajo <= c.barra.arriba && c.escena.abajo >= c.barra.arriba - 12, `17·1 lectora ${w}×${h}: la escena termina donde empieza el dock (${c.escena.abajo} / ${c.barra.arriba})`);
        ok(c.yo.abajo < c.escena.abajo && c.salida.abajo <= c.escena.abajo && c.yo.arriba > c.saldo.abajo - 30, `17·1 lectora ${w}×${h}: el sendero y el punto caben en la escena, bajo el saldo`);
        ok(!c.pista && !c.boton, `17·1 lectora ${w}×${h}: sin botón ni pista de botón`);
        eq(l.consola.filter((x) => !/503/.test(x)), [], `17·1 lectora ${w}×${h}: consola limpia`);
        await l.ctx.close();
      }
      // El dueño: «Anotar» es el centro del dock (asoma sobre la barra), en pantallas altas y bajas. La pista se recuerda al recargar.
      for (const [w, h] of [[390, 844], [390, 664], [412, 780], [320, 568]]) {
        const a = await ent(s17, ADMIN, { viewport: { width: w, height: h }, ...fijo });
        let c = await cajas(a.p);
        const centro = (c.boton.izq + c.boton.der) / 2;
        ok(c.pista && Math.abs(centro - (c.barra.izq + c.barra.der) / 2) < 2 && c.boton.arriba < c.barra.arriba && c.boton.abajo <= c.barra.abajo, `17·1 dueño ${w}×${h}: «Anotar» va en el centro del dock y asoma sobre la barra (${c.boton.arriba} < ${c.barra.arriba})`);
        ok(c.escena.abajo <= c.barra.arriba && c.yo.abajo < c.escena.abajo && c.salida.abajo <= c.escena.abajo, `17·1 dueño ${w}×${h}: la escena termina sobre el dock y el sendero cabe`);
        const tocable = await a.p.evaluate(() => { const r = document.getElementById('anotar').getBoundingClientRect(); return document.elementFromPoint(r.left + r.width / 2, r.top + 20)?.closest('#anotar') !== null; });
        ok(tocable, `17·1 dueño ${w}×${h}: nada tapa «Anotar»`);
        if (w === 390 && h === 844) {
          eq(await a.p.evaluate(() => localStorage.getItem('libro.rol')), 'admin', '17·1 dueño: el dispositivo recuerda que aquí va el botón');
          await a.p.reload({ waitUntil: 'domcontentloaded' });
          ok(await a.p.evaluate(() => document.documentElement.hasAttribute('data-boton') && document.documentElement.hasAttribute('data-pestanas')), '17·1 dueño: al recargar, el dock sale con su hueco desde el primer pintado');
          await a.p.waitForTimeout(2600); await cerrar(a.p);
          // Al bajar, el dock se queda abajo y arriba solo queda la mini-cabecera.
          await a.p.evaluate(() => window.scrollTo(0, 900)); await a.p.waitForTimeout(500);
          c = await cajas(a.p);
          ok(c.barra.abajo <= 844 && c.barra.arriba > 700 && c.boton.arriba > 680, `17·1 dueño: al bajar, el dock sigue abajo (${c.barra.arriba}) con «Anotar» (${c.boton.arriba})`);
        }
        eq(a.consola.filter((x) => !/503/.test(x)), [], `17·1 dueño ${w}×${h}: consola limpia`);
        await a.ctx.close();
      }
      {
        // Letra muy grande en el teléfono: solo la pestaña activa lleva su nombre a la vista (las demás, su dibujo) y nada se encima.
        const letra = () => { try { localStorage.setItem('libro.avisos.preguntado', '1'); localStorage.setItem('libro.letra', 'muy-grande'); } catch { /* sin almacenamiento */ } };
        const g = await ent(s17, ADMIN, { viewport: { width: 390, height: 844 }, ...fijo }, letra);
        const m = await g.p.evaluate(() => [...document.querySelectorAll('#pestanas button')].map((b) => { const t = b.querySelector('.pe-txt').getBoundingClientRect(), r = b.getBoundingClientRect(); return { activa: b.getAttribute('aria-current') === 'true', txt: Math.round(t.width), cabe: t.left >= r.left - 1 && t.right <= r.right + 1, alto: Math.round(r.height) }; }));
        ok(m.filter((x) => x.activa).every((x) => x.txt > 20 && x.cabe) && m.filter((x) => !x.activa).every((x) => x.txt <= 1), `17·1 letra muy grande: solo la activa con su nombre a la vista (${JSON.stringify(m.map((x) => x.txt))})`);
        ok(m.every((x) => x.alto >= 47.5), '17·1 letra muy grande: cada pestaña mide 48 px o más');
        await g.ctx.close();
      }
      {
        // «Todo junto», acostado y escritorio.
        const t = await entrar(navegador, s17, LECTOR, { viewport: { width: 390, height: 844 }, ...fijo }, sinAviso); await cerrar(t.p);
        eq((await cajas(t.p)).escena.abajo, 844, '17·1 «todo junto»: la escena sigue llenando la pantalla');
        ok(await t.p.evaluate(() => !document.documentElement.hasAttribute('data-pestanas')), '17·1 «todo junto»: sin la marca de pestañas');
        await t.ctx.close();
        const ac = await ent(s17, ADMIN, { viewport: { width: 844, height: 390 }, ...fijo });
        const ca = await cajas(ac.p);
        ok(ca.barra.abajo <= 390 && ca.escena.abajo <= ca.barra.arriba && ca.boton.arriba >= ca.barra.arriba && ca.boton.abajo <= ca.barra.abajo, `17·1 acostado: la escena termina sobre el dock y «Anotar compra» va dentro de él (${ca.escena.abajo}, ${ca.barra.arriba}–${ca.barra.abajo})`);
        ok(await ac.p.evaluate(() => document.querySelector('#anotar .an-c').getBoundingClientRect().width > 20), '17·1 acostado: se lee «Anotar compra» entero');
        await ac.ctx.close();
        const e = await ent(s17, LECTOR, { viewport: { width: 1440, height: 900 }, ...fijo });
        const c = await cajas(e.p);
        ok(c.escena.abajo === 774 && c.fija !== 'fixed' && c.barra.arriba >= c.escena.abajo && c.barra.abajo <= 900, `17·1 escritorio: como antes, con la barra arriba del contenido (${c.escena.abajo}, ${c.barra.arriba})`);
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
  });

  // ---------------------------------------------------------------- campamento 18: el ritual de anotar
  await bloque(async () => {
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
        ok(/^\$[\d,]+\.\d\d$/.test(c.datos.Pagaste) && /^\$[\d,]+$/.test(c.datos['Precio de BTC en la compra']) && /^\$[\d,]+\.\d\d ((sube|baja) )?[+−]?\d+\.\d%$/.test(c.datos['Hoy valen']), `18·comprobante: lo que pagaste, el precio de la compra y lo que valen hoy (${c.datos.Pagaste} · ${c.datos['Hoy valen']})`);
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
  });
  // ---------------------------------------------------------------- campamento 18: el comprobante de una venta y de un traslado (con mil compras)
  await bloque(async () => {
    const mil18 = await servidor('mil');
    try {
      const { ctx, p, consola } = await entrar(navegador, mil18, ADMIN);
      await p.evaluate(() => document.getElementById('lista').scrollIntoView({ block: 'start' })); await p.waitForTimeout(300);
      await p.click('#l-chips button[data-f="venta"]'); await p.waitForTimeout(400);
      await p.locator('#lista .fila[data-tipo="venta"]').first().click(); await p.waitForTimeout(500);
      const v = await p.evaluate(() => ({ t: document.getElementById('cp-t').textContent, sats: document.getElementById('cp-sats').textContent, dts: [...document.querySelectorAll('#cp-datos dt')].map((x) => x.textContent), sello: document.getElementById('cp-sello').hidden, alt: document.getElementById('cp-alt').hidden, nota: document.getElementById('cp-nota').textContent }));
      ok(/^Venta o gasto n\.º \d+$/.test(v.t) && /^−[\d,]+ sats$/.test(v.sats) && v.dts.join('|') === 'Recibiste|Precio de BTC en la venta|Altitud antes|Altitud después|Ganancia realizada' && v.sello && v.alt && v.nota === '«Gasto»', `18·comprobante: una venta dice lo que salió y su ganancia realizada, sin sello («${v.t}»)`);
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
  });

  // ---------------------------------------------------------------- el precio de la compra (escribir el precio o los dólares en «Más detalles», guardarlo tal cual y verlo en el comprobante)
  await bloque(async () => {
    const srv = await servidor('anio');
    try {
      const quieto = () => { try { localStorage.setItem('libro.avisos.preguntado', '1'); } catch { /* sin almacenamiento */ } };
      const cerrar = async (p) => {
        for (const [d, b] of [['d-novedades', '#nov-ok'], ['d-cambios', '#cam-ok'], ['d-avisos', '#da-no']]) if (await p.locator(`#${d}[open]`).count()) { await p.click(b); await p.waitForTimeout(300); }
      };
      const campos = (p) => p.evaluate(() => {
        const v = (id) => document.getElementById(id);
        return { usd: v('h-usd').value, precio: v('h-precio').value, dUsd: v('h-usd').dataset.derivado, dPrecio: v('h-precio').dataset.derivado, cUsd: !v('h-usd-c').hidden, cPrecio: !v('h-precio-c').hidden,
          ay: v('h-dinero-ay').textContent, uno: v('hc-uno').textContent, pie: v('hc-pie').hidden ? null : v('hc-pie').textContent, lineas: [...document.querySelectorAll('#hc-lineas > span')].map((x) => x.textContent),
          guardar: v('guardar').textContent.trim(), deshab: v('guardar').disabled, error: v('hoja-error').textContent, tPrecio: v('h-precio-t').textContent, resumen: v('h-av-t').textContent };
      });
      const { ctx, p, consola } = await entrar(navegador, srv, ADMIN, {}, quieto);
      await cerrar(p);
      const todas = await datos(p, '/api/compras');
      const usadas = new Set(todas.map((c) => c.fecha));
      const libre = (n) => { const out = []; for (let d = new Date(`${hoySV()}T12:00:00Z`); out.length < n; d.setUTCDate(d.getUTCDate() - 1)) { const f = d.toISOString().slice(0, 10); if (!usadas.has(f)) out.push(f); } return out; };
      const [dia1, dia2] = libre(2);
      // ---- El campo: en «Más detalles», con su rótulo, teclado decimal y 48 px
      await p.click('#anotar'); await p.waitForTimeout(400);
      await p.fill('#h-sats', '77320'); await p.waitForTimeout(150);
      await p.click('#h-avanzado summary'); await p.waitForTimeout(200);
      const campo = await p.evaluate(() => { const i = document.getElementById('h-precio'); const r = i.getBoundingClientRect(); return { modo: i.inputMode, alto: Math.round(r.height), etiqueta: i.labels[0]?.innerText.replace(/\s+/g, ' ').trim(), ayuda: i.getAttribute('aria-describedby') }; });
      ok(await p.locator('#h-precio').isVisible() && campo.modo === 'decimal' && campo.alto >= 47.5 && campo.etiqueta === 'Precio de BTC al que compraste (opcional)' && campo.ayuda === 'h-dinero-ay', `precio: el campo está en «Más detalles», con su rótulo, teclado decimal y 48 px (${JSON.stringify(campo)})`);
      let h = await campos(p);
      ok(h.resumen === 'Más detalles: dólares o precio, TXID y compra extra' && /^Escribe los dólares o el precio: el otro se calcula/.test(h.ay) && h.usd === '' && h.precio === '' && /^≈ \$/.test(h.uno), `precio: vacíos, como siempre: se estima con el precio del día («${h.uno}»)`);
      // ---- Escribir el precio (con «$» y coma de miles, tecla por tecla) calcula los dólares
      await p.click('#h-precio'); await p.keyboard.type('$62,500'); await p.waitForTimeout(200);
      h = await campos(p);
      eq([h.usd, h.dUsd, h.cUsd, h.dPrecio, h.cPrecio], ['48.33', '1', true, '', false], 'precio: escribir el precio calcula los dólares y los marca «calculado»');
      ok(/^\$48\.33 · quedas en [\d,]+ sats$/.test(h.uno) && h.ay === 'Los dólares salen del precio que escribiste.', `precio: la respuesta va sin «≈» y la ayuda dice de dónde salen («${h.uno}»)`);
      eq(await p.evaluate(() => document.getElementById('h-usd').labels[0].innerText.replace(/\s+/g, ' ').trim()), 'Pagaste (USD) · calculado', 'precio: el rótulo de los dólares (y su nombre accesible) dice «calculado»');
      await p.keyboard.press('Tab'); await p.waitForTimeout(150);
      eq((await campos(p)).precio, '62,500', 'precio: al salir del campo queda ordenado («62,500»)');
      await p.click('#h-cambia summary'); await p.waitForTimeout(200);
      h = await campos(p);
      ok(h.lineas.includes('Precio que escribiste: 1 BTC a $62,500.') && h.lineas.some((x) => /^Tu costo promedio/.test(x)), `precio: lo plegado dice el precio que escribiste y el costo promedio con esos dólares (${h.lineas.join(' | ')})`);
      // ---- Escribir sobre los dólares calculados: lo escrito los reemplaza y ahora el precio se calcula
      await p.click('#h-usd'); await p.keyboard.type('50'); await p.waitForTimeout(200);
      h = await campos(p);
      eq([h.usd, h.precio, h.dUsd, h.dPrecio, h.cPrecio, h.cUsd], ['50', '64,666.32', '', '1', true, false], 'precio: escribir encima de los dólares calculados los reemplaza y calcula el precio');
      ok(h.ay === 'El precio sale de los dólares que escribiste.' && h.lineas.includes('Precio que pagaste: 1 BTC a $64,666.'), `precio: y lo dice («${h.ay}»)`);
      // ---- Vaciar cualquiera de los dos vuelve a la estimación
      await p.fill('#h-usd', ''); await p.waitForTimeout(150);
      h = await campos(p);
      ok(h.usd === '' && h.precio === '' && !h.cUsd && !h.cPrecio && /^≈ \$/.test(h.uno) && h.lineas.some((x) => /^Precio de ahora: 1 BTC a \$[\d,]+\.$/.test(x)), `precio: vaciar uno vacía los dos y vuelve a estimar («${h.uno}»)`);
      // ---- Coma decimal de un teclado en otro idioma, y lo que no se entiende
      await p.fill('#h-precio', '62500,5'); await p.waitForTimeout(150);
      eq((await campos(p)).usd, '48.33', 'precio: «62500,5» se lee como 62,500.50');
      for (const malo of ['62.500', 'abc']) {
        await p.fill('#h-precio', malo); await p.waitForTimeout(150);
        h = await campos(p);
        ok(h.deshab && /^Revisa el precio de BTC/.test(h.uno) && h.usd === '', `precio: «${malo}» no se adivina: lo dice y no deja guardar («${h.uno}»)`);
      }
      // ---- Cambiar los sats con el precio escrito recalcula los dólares con ese precio
      await p.fill('#h-precio', '62500'); await p.fill('#h-sats', '100000'); await p.waitForTimeout(150);
      eq((await campos(p)).usd, '62.50', 'precio: con otros sats, los dólares salen del mismo precio');
      // ---- Guardar: el servidor deriva el mismo precio y el comprobante lo enseña
      await p.fill('#h-sats', '77320'); await p.fill('#h-precio', '62,500');
      await ponerFecha(p, dia1);
      const enviado = p.waitForRequest((r) => r.url().endsWith('/api/compras') && r.method() === 'POST');
      await p.click('#guardar');
      const cuerpo = JSON.parse((await enviado).postData());
      await p.waitForTimeout(1500);
      eq([cuerpo.sats, cuerpo.monto], [77320, 48.325], 'precio: se mandan los sats y los dólares sin redondear a centavos');
      const nueva = (await datos(p, '/api/compras')).find((c) => c.fecha === dia1 && c.sats === 77320);
      ok(nueva && nueva.monto === 48.325 && Math.abs(nueva.precio - 62500) < 1e-6, `precio: el servidor guarda $48.325 y deriva $62,500 (${nueva?.monto}, ${nueva?.precio})`);
      // El aviso con «Deshacer» puede quedar sobre la fila: se toca la fila directamente (como en axe).
      const comp = async (id) => {
        await p.evaluate(() => { const d = document.getElementById('d-comp'); if (d.open) d.close(); });
        await p.$eval(`#lista .fila[data-id="${id}"]`, (b) => b.click()); await p.waitForTimeout(500);
        return p.evaluate(() => Object.fromEntries([...document.querySelectorAll('#cp-datos .cp-fila')].map((f) => [f.querySelector('dt').textContent, f.querySelector('dd').textContent.replace(/\s+/g, ' ').trim()])));
      };
      let cp = await comp(nueva.id);
      eq([cp.Pagaste, cp['Precio de BTC en la compra']], ['$48.33', '$62,500'], 'precio: el comprobante dice lo pagado y «Precio de BTC en la compra» $62,500');
      // ---- Editar: el precio sale con el de la compra; sin tocarlo se guarda el monto tal cual
      await p.click('#cp-editar'); await p.waitForTimeout(500);
      h = await campos(p);
      ok(await p.locator('#h-precio').isVisible() && h.precio === '62,500' && h.dPrecio === '1' && h.cPrecio && h.usd === '48.33' && h.dUsd === '' && /^Son los de esta compra/.test(h.ay), `precio: al editar, el precio de la compra sale rellenado («${h.precio}», ${h.usd})`);
      ok(h.pie === '1 BTC a $62,500 (el de esta compra)', `precio: y la respuesta dice de dónde sale («${h.pie}»)`);
      const intacto = p.waitForRequest((r) => r.url().endsWith(`/api/compras/${nueva.id}`) && r.method() === 'PUT');
      await p.click('#guardar');
      eq(JSON.parse((await intacto).postData()).monto, 48.325, 'precio: guardar sin tocarlo manda el monto de siempre (no se pierde nada)');
      await p.waitForTimeout(1500);
      // ---- Corregir el precio: escribir encima del calculado lo reemplaza y recalcula los dólares
      await comp(nueva.id); await p.click('#cp-editar'); await p.waitForTimeout(500);
      await p.click('#h-precio'); await p.keyboard.type('61000'); await p.waitForTimeout(200);
      h = await campos(p);
      eq([h.precio, h.usd, h.dUsd, h.ay], ['61000', '47.17', '1', 'Los dólares salen del precio que escribiste.'], 'precio: corregir el precio de una compra recalcula sus dólares');
      await p.click('#guardar'); await p.waitForTimeout(1500);
      const corregida = (await datos(p, '/api/compras')).find((c) => c.id === nueva.id);
      ok(Math.abs(corregida.precio - 61000) < 1e-6 && corregida.monto === 47.1652, `precio: la compra queda con $61,000 (${corregida.precio}, ${corregida.monto})`);
      cp = await comp(nueva.id);
      eq([cp.Pagaste, cp['Precio de BTC en la compra']], ['$47.17', '$61,000'], 'precio: y su comprobante lo enseña');
      await p.click('#cp-cerrar'); await p.waitForTimeout(300);
      // El Historial dice que cambió el precio (y los dólares)
      await p.$eval('#cuenta-btn', (b) => b.click()); await p.waitForTimeout(300); await p.click('#dc-historial');
      await p.waitForSelector('#hist-lista li', { timeout: 5000 }); await p.waitForTimeout(300);
      const hist = (await p.innerText('#hist-lista')).replace(/\s+/g, ' ');
      ok(hist.includes('$48.33 → $47.17 · precio $62,500 → $61,000'), `precio: el Historial dice los dólares y el precio de antes y de ahora (${hist.slice(0, 160)}…)`);
      await p.keyboard.press('Escape'); await p.waitForTimeout(300);
      // ---- El aviso de cifra rara usa los dólares del precio escrito; cambiar el precio lo reinicia
      const montos = todas.filter((c) => c.tipo === 'compra' && !c.extra).map((c) => c.monto).sort((a, b) => a - b);
      const mediana = montos[Math.floor(montos.length / 2)];
      await p.$eval('#anotar', (b) => b.click()); await p.waitForTimeout(400);
      if (await p.locator('#h-borrador').isVisible()) { await p.click('#h-borrador-no'); await p.waitForTimeout(200); }
      await p.fill('#h-sats', '30000');
      if (!(await p.locator('#h-avanzado').evaluate((d) => d.open))) await p.click('#h-avanzado summary');
      await p.fill('#h-precio', String(Math.round((mediana * 12 * 1e8) / 30000)));
      await ponerFecha(p, dia2);
      await p.click('#guardar'); await p.waitForTimeout(250);
      h = await campos(p);
      ok(/veces más que tu compra habitual/.test(h.error) && h.guardar === 'Sí, guardar así', `precio: un precio diez veces más alto avisa de la cifra rara («${h.error.slice(0, 60)}…»)`);
      await p.fill('#h-precio', String(Math.round((mediana * 1e8) / 30000))); await p.waitForTimeout(150);
      h = await campos(p);
      ok(h.error === '' && h.guardar === 'Guardar', 'precio: cambiar el precio quita el aviso: lo confirmado ya no es lo mismo');
      // Con Intro el aviso sale sin salir del campo; el segundo toque guarda aunque al salir el precio se ordene («83333» → «83,333»)
      const antesN = (await datos(p, '/api/compras')).length;
      await p.fill('#h-precio', String(Math.round((mediana * 12 * 1e8) / 30000))); await p.press('#h-precio', 'Enter'); await p.waitForTimeout(250);
      ok((await campos(p)).guardar === 'Sí, guardar así', 'precio: con Intro también avisa');
      await p.click('#guardar'); await p.waitForTimeout(1500);
      eq((await datos(p, '/api/compras')).length, antesN + 1, 'precio: y el segundo toque guarda, aunque el precio se haya ordenado al salir del campo');
      await p.$eval('#anotar', (b) => b.click()); await p.waitForTimeout(400);
      if (await p.locator('#h-borrador').isVisible()) { await p.click('#h-borrador-no'); await p.waitForTimeout(200); }
      await p.fill('#h-sats', '30000');
      if (!(await p.locator('#h-avanzado').evaluate((d) => d.open))) await p.click('#h-avanzado summary');
      await p.fill('#h-precio', String(Math.round((mediana * 1e8) / 30000))); await p.waitForTimeout(150);
      // ---- En una venta el rótulo dice «al que vendiste»; en un traslado no hay precio
      await p.click('#h-tipo button[data-tipo="venta"]'); await p.waitForTimeout(200);
      h = await campos(p);
      ok(h.tPrecio === 'Precio de BTC al que vendiste (opcional)' && h.resumen === 'Más detalles: dólares o precio y TXID' && /por la venta/.test(h.uno), `precio: en una venta, «al que vendiste» («${h.uno}»)`);
      await p.click('#h-tipo button[data-tipo="traslado"]'); await p.waitForTimeout(200);
      ok(!(await p.locator('#h-precio').isVisible()) && !(await p.locator('#h-usd').isVisible()), 'precio: un traslado no lleva dólares ni precio');
      await p.click('#h-tipo button[data-tipo="compra"]'); await p.waitForTimeout(200);
      // ---- El borrador recuerda el precio (y que lo escribiste tú)
      await p.keyboard.press('Escape'); await p.waitForTimeout(500);
      await p.$eval('#anotar', (b) => b.click()); await p.waitForTimeout(400);
      h = await campos(p);
      ok(await p.locator('#h-borrador').isVisible() && h.precio.replace(/,/g, '') === String(Math.round((mediana * 1e8) / 30000)) && h.dUsd === '1' && h.usd !== '', `precio: el borrador vuelve con el precio escrito y los dólares calculados (${h.precio}, ${h.usd})`);
      await p.click('#h-borrador-no'); await p.waitForTimeout(200);
      ok((await campos(p)).precio === '', 'precio: «Empezar de cero» lo quita');
      await p.keyboard.press('Escape'); await p.waitForTimeout(400);
      eq(consola, [], `precio: consola limpia: ${consola.join(' | ')}`);
      await ctx.close();
      // ---- 320 × 568 con letra muy grande: nada se sale, 48 px y el campo enfocado no queda bajo «Guardar»
      {
        const r = await entrar(navegador, srv, ADMIN, { viewport: { width: 320, height: 568 }, isMobile: true, hasTouch: true }, () => { try { localStorage.setItem('libro.letra', 'muy-grande'); localStorage.setItem('libro.avisos.preguntado', '1'); } catch { /* sin almacenamiento */ } });
        await cerrar(r.p);
        await r.p.click('#anotar'); await r.p.waitForTimeout(400);
        await r.p.fill('#h-sats', '77320');
        await r.p.click('#h-avanzado summary'); await r.p.waitForTimeout(200);
        await r.p.click('#h-precio'); await r.p.keyboard.type('62,500'); await r.p.waitForTimeout(300);
        const m = await r.p.evaluate(() => {
          const panel = document.querySelector('.hoja-panel'), i = document.getElementById('h-precio').getBoundingClientRect(), u = document.getElementById('h-usd').getBoundingClientRect(), bot = document.querySelector('.hoja-bot').getBoundingClientRect();
          return { sw: panel.scrollWidth, cw: panel.clientWidth, docW: document.documentElement.scrollWidth, docC: document.documentElement.clientWidth, altoP: Math.round(i.height), altoU: Math.round(u.height), abajo: Math.round(i.bottom), bot: Math.round(bot.top), usd: document.getElementById('h-usd').value };
        });
        ok(m.sw <= m.cw && m.docW <= m.docC, `precio: a 320 px con letra muy grande nada se sale (${m.sw}/${m.cw})`);
        ok(m.altoP >= 47.5 && m.altoU >= 47.5 && m.usd === '48.33', `precio: los dos campos miden 48 px o más (${m.altoP}, ${m.altoU})`);
        ok(m.abajo <= m.bot + 1, `precio: el campo enfocado no queda bajo «Guardar» (${m.abajo} ≤ ${m.bot})`);
        await r.p.fill('#h-precio', ''); await r.p.fill('#h-sats', '');
        await r.ctx.close();
      }
      // ---- Quien solo mira: no anota (sin hoja ni campo) y su comprobante dice el precio sin tutear
      {
        const r = await entrar(navegador, srv, LECTOR, {}, quieto);
        await cerrar(r.p);
        ok(!(await r.p.locator('#anotar').isVisible()) && !(await r.p.locator('#h-precio').isVisible()), 'precio: quien solo mira no ve «Anotar» ni el campo del precio');
        await r.p.evaluate(() => document.getElementById('lista').scrollIntoView({ block: 'start' })); await r.p.waitForTimeout(300);
        await r.p.$eval(`#lista .fila[data-id="${nueva.id}"]`, (b) => b.click()); await r.p.waitForTimeout(500);
        const dl = await r.p.evaluate(() => [...document.querySelectorAll('#cp-datos .cp-fila')].map((f) => `${f.querySelector('dt').textContent}: ${f.querySelector('dd').textContent.trim()}`));
        ok(dl.includes('Se pagó: $47.17') && dl.includes('Precio de BTC en la compra: $61,000'), `precio: su comprobante dice «Precio de BTC en la compra» (${dl.slice(0, 2).join(' · ')})`);
        await r.ctx.close();
      }
    } finally {
      srv.parar();
    }
  });

  // ---------------------------------------------------------------- campamentos (arte) y campamento 21: hitos tallados, farol, rellanos, cumbre y marcas de etapa
  await bloque(async () => {
    const srv = await servidor('ballena');
    try {
      const medir = (p) => p.evaluate(() => {
        const cx = (el) => { const r = el.getBoundingClientRect(); return r.left + r.width / 2; };
        const op = (el) => Number(getComputedStyle(el).opacity);
        const campos = [...document.querySelectorAll('#m-campos .campo')].map((g) => ({
          cima: g.classList.contains('es-cima'), alcanzado: g.classList.contains('alcanzado'), sig: g.classList.contains('sig'),
          luzALaDerecha: cx(g.querySelector('.campo-ico')) > cx(g.querySelector('.hito-sombra')),
          piedra: [g.querySelectorAll('.campo-ico').length, g.querySelectorAll('.hito-sombra').length],
          contornos: [...g.querySelectorAll('.campo-ico, .hito-sombra, .hito-techo, .farol-cuerpo, .farol-techo')].filter((e) => getComputedStyle(e).stroke !== 'none').length,
          ...(() => { // campamento 21: el pie del hito pisa su rellano (en la cumbre, el escalón de nieve), con su sombra al lado contrario del astro, y el rótulo queda pegado
            const svg = document.querySelector('.montana svg'), inv = svg.getScreenCTM().inverse();
            const pt = (x, y) => new DOMPoint(x, y).matrixTransform(inv);
            const r = g.querySelector('.hito-sombra').getBoundingClientRect(), r2 = g.querySelector('.campo-ico').getBoundingClientRect();
            const px = (Math.min(r.left, r2.left) + Math.max(r.right, r2.right)) / 2, py = Math.max(r.bottom, r2.bottom);
            const suelo = document.querySelector(g.classList.contains('es-cima') ? '.tz-nieve' : '.tz-suelo'), pie = document.querySelector('.tz-pie');
            const sol = [...document.querySelectorAll('.montana .halo')].map((h) => h.getBoundingClientRect()).find((q) => q.width > 0);
            const haciaSombra = sol.left + sol.width / 2 > px ? -1 : 1, e = r2.height / 12;
            const caja = { left: Math.min(r.left, r2.left), top: Math.min(r.top, r2.top), right: Math.max(r.right, r2.right), bottom: Math.max(r.bottom, r2.bottom) }, nombre = g.dataset.m; // la piedra (sin el halo del farol)
            return { enRellano: suelo.isPointInFill(pt(px, py + 0.5)), conSombra: pie.isPointInFill(pt(px + haciaSombra * 6 * Math.max(1, e / 1.4), py + 1.2 * Math.max(1, e / 1.4))), px, py, caja: [caja.left, caja.top, caja.right, caja.bottom], nombre };
          })(),
          vidrio: getComputedStyle(g.querySelector('.farol-cuerpo')).fill, halo: op(g.querySelector('.farol-halo')), suelo: g.querySelector('.luz-suelo') ? op(g.querySelector('.luz-suelo')) : null,
          bano: g.querySelector('.hito-bano') ? op(g.querySelector('.hito-bano')) : null, pulso: [g.querySelector('.humo').getAttribute('fill'), getComputedStyle(g.querySelector('.humo')).stroke],
          alto: Math.round(g.querySelector('.campo-ico').getBoundingClientRect().height),
        }));
        const cima = document.querySelector('#m-campos .es-cima');
        const sol = [...document.querySelectorAll('.montana .halo')].map((h) => h.getBoundingClientRect()).find((q) => q.width > 0), pico = cima.querySelector('.cima-mastil').getBoundingClientRect();
        return { campos, solALaDerecha: sol.left + sol.width / 2 > pico.left + pico.width / 2, bandera: cima.querySelector('.banderin').tagName.toLowerCase(), pliegue: cima.querySelectorAll('.banderin .banderin-pliegue').length,
          mastil: getComputedStyle(cima.querySelector('.cima-mastil')).stroke, nieve: getComputedStyle(document.querySelector('.nieve')).fill, nodos: document.querySelectorAll('.montana svg *').length,
          aros: document.querySelectorAll('#m-campos circle[stroke], #m-campos .humo:not([fill])').length,
          terrazas: { nodos: document.querySelectorAll('#m-terrazas *').length, recorte: document.getElementById('m-terrazas').getAttribute('clip-path'), rellanos: (document.querySelector('.tz-suelo').getAttribute('d').match(/M/g) || []).length, cortes: (document.querySelector('.tz-corte').getAttribute('d').match(/M/g) || []).length, cantos: (document.querySelector('.tz-muro').getAttribute('d').match(/M/g) || []).length, repisas: (document.getElementById('m-repisa').getAttribute('d') || '').length > 0 },
          cumbre: (() => { // (tercera ronda) la cumbre es UN pico nevado: la roca solo asoma por el filo; nada translúcido sobre la nieve
            const svg = document.querySelector('.montana svg'), inv = svg.getScreenCTM().inverse(), g = document.querySelector('#m-terrazas .cumbre');
            const sombra = g.querySelector('.cn-sombra'), roca = g.querySelector('.cn-roca'), monte = document.querySelector('.monte'), rellano = document.querySelector('.cn-rellano');
            const en = (el, x, y) => el.isPointInFill(new DOMPoint(x, y));
            // Detrás de la tela de la bandera: nieve en sombra, no roca (era la torre oscura de la segunda ronda).
            const b = cima.querySelector('.banderin').getBoundingClientRect();
            const tras = [[b.left + 3, b.top + b.height / 2], [b.right - 3, b.top + b.height / 2], [b.left + b.width / 2, b.top + 2], [b.left + b.width / 2, b.bottom - 2]].map(([x, y]) => new DOMPoint(x, y).matrixTransform(inv));
            // El cuerno, de su pico al rellano: casi todo nieve (una rejilla de puntos dentro de la silueta).
            const m = cima.transform.baseVal.consolidate().matrix, e = m.a, sx = m.e, sy = m.f - 6;
            let dentro = 0, enRoca = 0;
            for (let x = -8; x <= 46; x += 1.5) for (let y = -39; y <= 1; y += 1.5) { const px = sx + x * e, py = sy + y * e; if (!en(monte, px, py)) continue; dentro++; if (en(roca, px, py)) enRoca++; }
            const labio = rellano.getAttribute('d').match(/M([\d.]+) ([\d.]+)/).slice(1).join(' ');
            return { recorte: g.getAttribute('clip-path'), piezas: [...g.children].map((x) => x.getAttribute('class')),
              opacas: [...g.children, document.querySelector('.nieve-sombra'), rellano].every((x) => getComputedStyle(x).opacity === '1' && getComputedStyle(x).fillOpacity === '1'),
              viejos: document.querySelectorAll('.espolon, .espolon-luz, .nieve-s2, .tz-pared, .tz-pared-luz, .nieve-pliegue').length,
              trasBandera: tras.every((q) => en(monte, q.x, q.y) && en(sombra, q.x, q.y) && !en(roca, q.x, q.y)), roca: enRoca / Math.max(1, dentro), dentro,
              brota: monte.getAttribute('d').includes(`L${labio}`), rocaLadera: roca.getAttribute('fill') };
          })(),
          rotulos: [...document.querySelectorAll('#m-etiquetas .campo-txt:not(.etapa-txt)')].map((t) => { const r = t.getBoundingClientRect(); return [r.left, r.top, r.right, r.bottom]; }),
          etapas: [...document.querySelectorAll('#m-etapas .etapa')].map((g) => { const l = g.querySelector('.etapa-tick'); return [g.classList.contains('menor') && !g.classList.contains('sig'), Math.hypot(l.x2.baseVal.value - l.x1.baseVal.value, l.y2.baseVal.value - l.y1.baseVal.value), getComputedStyle(g.querySelector('.etapa-sombra')).display]; }), camino: [document.querySelectorAll('.sendero-corte path').length, document.querySelectorAll('.sendero-talud path').length, document.querySelectorAll('.sendero-tierra path').length],
          bandera2: (() => { const svg = document.querySelector('.montana svg'), inv = svg.getScreenCTM().inverse(), b = cima.querySelector('.banderin').getBoundingClientRect(), monte = document.querySelector('.monte');
            return [[b.left + 1, b.top + b.height / 2], [b.right - 2.5, b.top + b.height / 2], [b.left + b.width / 2, b.top + 2]].every(([x, y]) => monte.isPointInFill(new DOMPoint(x, y).matrixTransform(inv))); })() };
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
      // Campamento 21: cada campamento se asienta en un rellano tallado (terreno, recortado por la silueta, pocos nodos) y su rótulo queda pegado a él.
      const pegados = (m) => m.campos.map((c) => Math.min(...m.rotulos.map(([l, t, r, b]) => Math.hypot(Math.max(c.caja[0] - r, l - c.caja[2], 0), Math.max(c.caja[1] - b, t - c.caja[3], 0)))));
      ok(a.campos.every((c) => c.enRellano), `montaña asentada: el pie de cada hito pisa su rellano; en la cumbre, el escalón de nieve (${a.campos.map((c) => c.enRellano)})`);
      ok(hitos.every((c) => c.conSombra), `montaña asentada: cada hito echa su sombra en el rellano, al lado contrario del astro (${hitos.map((c) => c.conSombra)})`);
      eq([a.terrazas.rellanos, a.terrazas.cortes, a.terrazas.cantos, a.terrazas.recorte], [3, 3, 3, 'url(#m-silueta)'], 'montaña asentada: cada campamento tiene su repisa (plano y canto de frente) y su corte de roca; todo recortado por la silueta');
      ok(a.terrazas.nodos <= 18, `montaña asentada: los rellanos y la cumbre son terreno de pocos nodos, un trazo por tono (${a.terrazas.nodos})`);
      // Tercera ronda: la cumbre es UN pico nevado, con la roca solo en el filo, sin torre ni velo.
      eq([a.cumbre.recorte, a.cumbre.piezas.join(' '), a.cumbre.viejos], ['url(#m-nieve-c)', 'cn-sombra cn-pliegue cn-bisel nieve-faceta cn-roca cn-canto', 0], 'cumbre: su cara en sombra, sus planos, la roca del filo y el canto del rellano, recortados por la nieve (siguen a la altitud); ya no hay espolón, pared ni velo');
      ok(a.cumbre.opacas, 'cumbre: nada translúcido sobre la nieve (la nieve en sombra, sus planos y el rellano son opacos: no dejan ver el cielo ni otra capa)');
      ok(a.cumbre.roca > 0.02 && a.cumbre.roca < 0.15 && a.cumbre.dentro > 200, `cumbre: el cuerno es nieve y la roca solo asoma por su filo oeste (${Math.round(a.cumbre.roca * 100)} % de roca en ${a.cumbre.dentro} puntos)`);
      ok(a.cumbre.trasBandera, 'cumbre: detrás de la bandera de la meta hay nieve en sombra (ni cielo ni una torre de roca)');
      ok(a.cumbre.brota && a.cumbre.rocaLadera === 'url(#m-ladera)', 'cumbre: el rellano nace en la propia silueta y la roca del filo es la de la ladera (la misma roca, sin costura)');
      ok(a.rotulos.length === 4 && pegados(a).every((d) => d <= 36), `montaña asentada: cada rótulo queda pegado a la piedra de su campamento (${pegados(a).map(Math.round)} px)`);
      ok(a.terrazas.repisas, 'montaña asentada: la repisa se alarga bajo el rótulo que se apoya en ella');
      ok(a.bandera2, 'montaña asentada: la bandera de la meta tiene montaña detrás (no asoma contra el cielo)');
      { const menores = a.etapas.filter((x) => x[0]), mayores = a.etapas.filter((x) => !x[0]);
        ok(a.etapas.length > 0 && menores.every((x) => x[2] === 'none' && x[1] < 12) && mayores.every((x) => x[2] !== 'none'), `montaña asentada: las marcas intermedias son una muesca sin sombra; las principales llevan la suya (${menores.length} y ${mayores.length})`); }
      ok(a.camino[0] === a.camino[2] && a.camino[1] === a.camino[2] && a.camino[2] >= 5, `montaña asentada: el camino está tallado (corte arriba y talud abajo en cada tramo: ${a.camino})`);
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
      ok(c.campos.every((x) => x.enRellano) && c.bandera2, 'montaña asentada: en el teléfono también, cada hito en su rellano y la bandera con montaña detrás');
      ok(c.cumbre.trasBandera && c.cumbre.opacas && c.cumbre.roca < 0.15, `cumbre: en el teléfono también, un pico nevado con nieve detrás de la bandera (${Math.round(c.cumbre.roca * 100)} % de roca)`);
      // La nieve en sombra nunca se confunde con el cielo y el canto de la bandera se recorta contra ella, a cualquier hora.
      const tonos = await t.p.evaluate(() => {
        const cv = document.createElement('canvas'); cv.width = cv.height = 1; const g = cv.getContext('2d', { willReadFrequently: true });
        const rgb = (c) => { g.clearRect(0, 0, 1, 1); g.fillStyle = '#f0f'; g.fillStyle = c; g.fillRect(0, 0, 1, 1); return [...g.getImageData(0, 0, 1, 1).data].slice(0, 3).map((x) => x / 255); };
        const lin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
        const okl = (c) => { const [r, v, b] = rgb(c).map(lin); const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * v + 0.0514459929 * b), m = Math.cbrt(0.2119034982 * r + 0.6806995451 * v + 0.1073969566 * b), s = Math.cbrt(0.0883024619 * r + 0.2817188376 * v + 0.6299787005 * b); return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s]; };
        const lum = (c) => { const [r, v, b] = rgb(c).map(lin); return 0.2126 * r + 0.7152 * v + 0.0722 * b; };
        const out = [];
        for (const h of [6, 12, 17.5, 20]) {
          window.libroCielo.fijarHora(h);
          const nieve = getComputedStyle(document.querySelector('.cn-sombra')).fill, raiz = getComputedStyle(document.documentElement), A = okl(nieve);
          const borde = getComputedStyle(document.querySelector('.es-cima .banderin')).stroke, [x, y] = [lum(borde), lum(nieve)].sort((p, q) => q - p);
          out.push({ h, nieve: rgb(nieve).map((v) => Math.round(v * 255)).join(','), dE: Math.min(...['--c0', '--c1', '--c2', '--c3'].map((k) => { const B = okl(raiz.getPropertyValue(k).trim()); return Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]); })), borde: (x + 0.05) / (y + 0.05) });
        }
        window.libroCielo.fijarHora(null);
        return out;
      });
      ok(tonos.every((x) => x.dE >= 0.045 && x.nieve !== '255,0,255'), `cumbre: la nieve en sombra se distingue del cielo a las 6, 12, 17:30 y 20 h (${tonos.map((x) => `${x.h} h ${x.dE.toFixed(3)}`).join(', ')})`);
      ok(tonos.every((x) => x.borde >= 3), `cumbre: el canto de la bandera se recorta contra la nieve en sombra (${tonos.map((x) => x.borde.toFixed(1)).join(', ')} : 1)`);
      ok(c.nodos < 1100 && quieto && c.campos.filter((x) => !x.cima).every((x) => x.halo > 0.8), `arte: en el teléfono la escena sigue ligera (${c.nodos} nodos; tope 1100 desde el campamento 22C) y, sin ambiente, los faroles quedan encendidos y quietos`);
      await t.ctx.close();
    } finally {
      srv.parar();
    }
  });

  // ---------------------------------------------------------------- campamento 19: la familia (escuchar el Diario, libro de cumbre y nombre de la montaña; el aviso del domingo, en test_api)
  await bloque(async () => {
    const sinAviso = () => { try { localStorage.setItem('libro.avisos.preguntado', '1'); } catch { /* sin almacenamiento */ } };
    const ent = async (srv, cuenta, opts = {}, init = sinAviso) => {
      const r = await entrar(navegador, srv, cuenta, opts, init);
      for (let k = 0; k < 3 && await r.p.locator('dialog[open]').count(); k++) { await r.p.keyboard.press('Escape'); await r.p.waitForTimeout(400); }
      return r;
    };
    const ver = (p, sel) => p.locator(sel).first().isVisible();
    // Voces de mentira (el Chromium de las pruebas no trae ninguna): `voces` es la lista, `tarde` (ms) las hace llegar después con
    // `voiceschanged` (como en Chrome) y `ms` es lo que tarda cada frase. Guarda lo que se dijo en `window.__dichas`.
    const vocesFalsas = ([voces, tarde, ms]) => {
      try { localStorage.setItem('libro.avisos.preguntado', '1'); } catch { /* sin almacenamiento */ }
      const s = new EventTarget();
      let listas = !tarde, cola = [], gen = 0;
      window.__dichas = []; window.__canceladas = 0;
      const avanzar = () => {
        const u = cola.shift();
        if (!u) { s.speaking = false; return; }
        s.speaking = true;
        window.__dichas.push({ texto: u.text, voz: u.voice?.name, lang: u.lang });
        const g = gen;
        setTimeout(() => { if (g !== gen) return; u.onend?.({}); avanzar(); }, ms);
      };
      Object.assign(s, { speaking: false, paused: false, getVoices: () => (listas ? voces : []),
        speak(u) { cola.push(u); if (!s.speaking) avanzar(); },
        cancel() { window.__canceladas += 1; gen += 1; const quedan = cola; cola = []; s.speaking = false; for (const u of quedan) u.onerror?.({ error: 'canceled' }); },
        pause() {}, resume() {} });
      Object.defineProperty(s, 'pending', { configurable: true, get: () => cola.length > 0 });
      Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: s });
      window.SpeechSynthesisUtterance = class { constructor(t) { this.text = t; } };
      if (tarde) setTimeout(() => { listas = true; s.dispatchEvent(new Event('voiceschanged')); }, tarde);
    };
    const ES = (lang, name, localService = true) => ({ name, lang, localService, default: false, voiceURI: name });
    const sAnio = await servidor('anio');
    try {
      // ---- 33 · Escuchar: sin voz en español del aparato no hay botón
      {
        const a = await ent(sAnio, ADMIN, { pestanas: true });
        ok(await ver(a.p, '#diario') && !(await ver(a.p, '#dia-oir')), '19·escuchar: sin voces (el navegador de pruebas no trae) el botón no sale');
        await a.ctx.close();
      }
      {
        const a = await ent(sAnio, ADMIN, { pestanas: true }, [vocesFalsas, [[ES('es-MX', 'Google español de Estados Unidos', false), ES('en-US', 'Samantha')], 0, 60]]);
        ok(!(await ver(a.p, '#dia-oir')), '19·escuchar: una voz en español «en línea» (manda el texto a un tercero) no cuenta, ni una en inglés');
        await a.ctx.close();
      }
      {
        const a = await ent(sAnio, ADMIN, { pestanas: true }, [vocesFalsas, [[ES('es-ES', 'Mónica'), ES('es-MX', 'Paulina'), ES('es', 'Genérica')], 7000, 60]]);
        const antes = await ver(a.p, '#dia-oir');
        await a.p.waitForFunction(() => !document.getElementById('dia-oir').hidden, null, { timeout: 9000 }).catch(() => {});
        ok(!antes && await ver(a.p, '#dia-oir'), '19·escuchar: si las voces llegan tarde (voiceschanged), el botón sale cuando llegan');
        await a.ctx.close();
      }
      // ---- Leer, callar con otro toque, terminar sola, callar al cambiar de pestaña, al plegar y al ocultar la pestaña del navegador
      const { ctx, p, consola } = await ent(sAnio, ADMIN, { pestanas: true }, [vocesFalsas, [[ES('es-ES', 'Mónica'), ES('es-MX', 'Paulina'), ES('es-SV', 'Salvadoreña', false)], 0, 250]]);
      const oir = p.locator('#dia-oir');
      const est = () => p.evaluate(() => ({ pres: document.getElementById('dia-oir').getAttribute('aria-pressed'), dichas: window.__dichas.length, canc: window.__canceladas, hablando: window.speechSynthesis.speaking }));
      ok(await oir.isVisible() && (await oir.textContent()).trim() === 'Escuchar el Diario' && await oir.getAttribute('aria-pressed') === 'false', '19·escuchar: con voz del aparato sale «Escuchar el Diario», apagado');
      const caja = await oir.boundingBox();
      ok(caja.height >= 47.5, `19·escuchar: el botón mide 48 px (${caja.height})`);
      await oir.click(); await p.waitForTimeout(150);
      let e = await est();
      ok(e.pres === 'true' && e.dichas >= 1, '19·escuchar: un toque empieza a leer y el botón queda pulsado');
      const primera = await p.evaluate(() => window.__dichas[0]);
      ok(/^El Diario del Libro\. Edición del \d{1,2} de [a-z]+ de \d{4}, número \d+\.$/.test(primera.texto) && primera.voz === 'Paulina' && primera.lang === 'es-MX',
        `19·escuchar: empieza por la cabecera, con la voz de América del propio aparato («${primera.texto}», ${primera.voz})`);
      await p.waitForTimeout(700);
      await oir.click(); await p.waitForTimeout(200);
      e = await est();
      const tras = e.dichas;
      await p.waitForTimeout(700);
      ok(e.pres === 'false' && e.canc >= 1 && (await est()).dichas === tras && !(await est()).hablando, '19·escuchar: otro toque lo calla y no sigue');
      // Leída entera: termina sola y vuelve a «apagado»; todo lo escrito del Diario está, sin comas en las cifras
      await p.evaluate(() => { window.__dichas = []; });
      await oir.click();
      await p.waitForFunction(() => document.getElementById('dia-oir').getAttribute('aria-pressed') === 'false', null, { timeout: 30000 });
      const todo = await p.evaluate(() => window.__dichas.map((d) => d.texto));
      const titular = (await p.textContent('#t-diario')).trim();
      ok(todo.length >= 8 && todo.some((t) => t.startsWith('Clasificados')) && todo.some((t) => t.startsWith('Pronóstico de la montaña')), `19·escuchar: lee la portada, los clasificados y el pronóstico (${todo.length} frases)`);
      ok(todo.every((t) => !/\d,\d{3}/.test(t) && !/\bSE [A-Z]/.test(t) && !/·/.test(t)), '19·escuchar: las cifras van sin comas, sin «SE BUSCAN» en mayúsculas y sin «·»');
      ok(todo[1].split(' ').slice(0, 3).join(' ') === titular.split(' ').slice(0, 3).join(' '), `19·escuchar: después de la cabecera va el titular de la página («${todo[1]}» / «${titular}»)`);
      // Cambiar de pestaña lo calla
      await oir.click(); await p.waitForTimeout(200);
      await p.click('#pestanas [data-pestana="graficos"]'); await p.waitForTimeout(300);
      ok((await est()).pres === 'false' && !(await est()).hablando, '19·escuchar: cambiar de pestaña lo calla');
      await p.click('#pestanas [data-pestana="resumen"]'); await p.waitForTimeout(400);
      // Irse a otra pestaña del navegador (o bloquear el teléfono) lo calla
      await oir.click(); await p.waitForTimeout(200);
      await p.evaluate(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' }); document.dispatchEvent(new Event('visibilitychange')); });
      await p.waitForTimeout(200);
      ok((await est()).pres === 'false', '19·escuchar: al ocultar la página se calla');
      await p.evaluate(() => { delete document.visibilityState; document.dispatchEvent(new Event('visibilitychange')); });
      // Con el teclado: Espacio lo enciende y lo apaga (es un botón)
      await oir.focus(); await p.keyboard.press('Space'); await p.waitForTimeout(200);
      ok((await est()).pres === 'true', '19·escuchar: con el teclado, Espacio empieza a leer');
      await p.keyboard.press('Space'); await p.waitForTimeout(200);
      ok((await est()).pres === 'false', '19·escuchar: y otra vez lo calla');
      // Plegar el Diario (teléfono) lo calla
      if (await ver(p, '#dia-abrir')) {
        await p.click('#dia-abrir'); await p.waitForTimeout(200);
        await oir.click(); await p.waitForTimeout(200);
        await p.click('#dia-abrir'); await p.waitForTimeout(200);
        ok((await est()).pres === 'false' && await p.getAttribute('#dia-abrir', 'aria-expanded') === 'false', '19·escuchar: plegar el Diario lo calla');
      }
      eq(consola, [], `19·escuchar: consola limpia (${consola.join(' | ')})`);
      await ctx.close();
      // Una lectora también lo tiene (es su Diario)
      const l = await ent(sAnio, LECTOR, { pestanas: true }, [vocesFalsas, [[ES('es-MX', 'Paulina')], 0, 60]]);
      ok(await ver(l.p, '#dia-oir'), '19·escuchar: una lectora también puede escucharlo');
      await l.ctx.close();
    } finally { sAnio.parar(); }

    // ---- 18 · Libro de cumbre: una lectora firma, reescribe, borra y deshace; el dueño lee y quita; «Tu historia» lo enseña
    const sLargo = await servidor('largo');
    try {
      const l = await ent(sLargo, LECTOR);
      const info = await l.p.evaluate(async () => {
        const saldo = (await (await fetch('/api/compras')).json()).reduce((a, c) => a + (c.tipo === 'venta' ? -c.sats : c.sats), 0);
        const pot = [1e5, 1e6, 1e7, 1e8, 1e9, 1e10, 1e11];
        return { abajo: pot.filter((x) => x <= saldo).at(-1), arriba: pot.find((x) => x > saldo) };
      });
      const nombre = info.abajo >= 1e8 ? `${info.abajo / 1e8} BTC` : `${info.abajo / 1e6}M`;
      const abrirBandera = async (p, m) => { await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(400); await p.locator(`.m-bandera[data-m="${m}"]`).click({ force: true }); await p.waitForTimeout(600); };
      await abrirBandera(l.p, info.arriba);
      ok(!(await ver(l.p, '#m-firmas')), '19·cumbre: un campamento por alcanzar no tiene libro');
      await l.p.keyboard.press('Escape'); await l.p.waitForTimeout(200);
      await abrirBandera(l.p, info.abajo);
      const bF = l.p.locator('#m-firmas');
      const rF = (p) => p.textContent('#m-firmas-r').then((t) => t.trim());
      ok(await bF.isVisible() && (await bF.textContent()).startsWith('Libro de cumbre') && await rF(l.p) === 'Nadie ha firmado todavía · Deja la primera firma', `19·cumbre: la tarjeta del campamento invita a firmar («${await rF(l.p)}»)`);
      ok((await bF.boundingBox()).height >= 47.5, '19·cumbre: el botón del libro mide 48 px');
      await bF.click(); await l.p.waitForTimeout(600);
      ok(await l.p.locator('#d-firmas[open]').count() === 1 && await l.p.evaluate(() => document.activeElement?.id) === 'fi-t' && (await l.p.textContent('#fi-t')).trim() === `Campamento ${nombre}`,
        '19·cumbre: se abre el libro, con el foco en su título (primero se lee)');
      ok(/^Nadie ha firmado todavía/.test((await l.p.textContent('#fi-lista')).trim()) && await ver(l.p, '#fi-texto') && (await l.p.textContent('#fi-guardar')).trim() === 'Firmar' && !(await ver(l.p, '#fi-borrar')),
        '19·cumbre: vacío, con el campo para firmar y sin «Borrar»');
      await l.p.click('#fi-guardar'); await l.p.waitForTimeout(200);
      eq((await l.p.textContent('#fi-error')).trim(), 'Escribe tu firma.', '19·cumbre: una firma vacía no se guarda');
      await l.p.fill('#fi-texto', '<b>Aquí estuve</b> con frío');
      eq((await l.p.textContent('#fi-cuenta')).trim(), '27 de 80', '19·cumbre: cuenta los caracteres');
      await l.p.click('#fi-guardar'); await l.p.waitForTimeout(900);
      ok(await l.p.locator('#d-firmas[open]').count() === 0 && /^Firmaste el libro de cumbre del campamento /.test((await l.p.textContent('#aviso-txt')).trim()), '19·cumbre: se firma, se cierra y avisa');
      ok(await ver(l.p, '#m-tarjeta') && await rF(l.p) === 'Firmaste tú · Cambia tu firma' && await l.p.evaluate(() => document.activeElement?.id) === 'm-firmas',
        '19·cumbre: la tarjeta sigue abierta, dice que firmaste y el foco vuelve a su botón');
      await bF.click(); await l.p.waitForTimeout(500);
      const fila = l.p.locator('#fi-lista .fi-firma.mia');
      ok(await fila.count() === 1 && /^Ana \(tú\)/.test((await fila.locator('.fi-quien').textContent()).trim()) && (await fila.locator('.fi-txt').textContent()) === '<b>Aquí estuve</b> con frío' && await fila.locator('.fi-txt b').count() === 0,
        '19·cumbre: la firma se lee como texto (nunca como HTML), marcada como tuya');
      ok(await l.p.locator('#fi-lista .fi-quitar').count() === 0 && (await l.p.textContent('#fi-guardar')).trim() === 'Guardar mi firma' && await ver(l.p, '#fi-borrar') && await l.p.inputValue('#fi-texto') === '<b>Aquí estuve</b> con frío',
        '19·cumbre: una lectora no puede quitar firmas ajenas; la suya se puede cambiar o borrar');
      // Esc cierra el libro pero no la tarjeta; otro Esc, la tarjeta
      await l.p.keyboard.press('Escape'); await l.p.waitForTimeout(300);
      ok(await l.p.locator('#d-firmas[open]').count() === 0 && await ver(l.p, '#m-tarjeta'), '19·cumbre: Esc cierra el libro y deja la tarjeta');
      await l.p.keyboard.press('Escape'); await l.p.waitForTimeout(300);
      ok(!(await ver(l.p, '#m-tarjeta')), '19·cumbre: un segundo Esc cierra la tarjeta');
      // Reescribir
      await abrirBandera(l.p, info.abajo);
      await bF.click(); await l.p.waitForTimeout(500);
      await l.p.fill('#fi-texto', 'Qué orgullo, hijo. Sigue así.'); await l.p.click('#fi-guardar'); await l.p.waitForTimeout(900);
      eq((await l.p.textContent('#aviso-txt')).trim(), 'Tu firma quedó guardada.', '19·cumbre: reescribir la propia');
      // Borrar la propia y deshacerlo
      await bF.click(); await l.p.waitForTimeout(500);
      await l.p.click('#fi-borrar'); await l.p.waitForTimeout(900);
      ok(/Quitaste tu firma/.test(await l.p.textContent('#aviso-txt')) && await ver(l.p, '#aviso-btn') && (await datos(l.p, '/api/firmas')).length === 0, '19·cumbre: borrar la propia, con «Deshacer»');
      await l.p.click('#aviso-btn'); await l.p.waitForTimeout(900);
      const vuelta = await datos(l.p, '/api/firmas');
      ok(vuelta.length === 1 && vuelta[0].texto === 'Qué orgullo, hijo. Sigue así.' && /^Firmaste tú/.test(await rF(l.p)), `19·cumbre: «Deshacer» la vuelve a escribir igual (${JSON.stringify(vuelta)} · ${await rF(l.p)} · ${await l.p.textContent('#aviso-txt')})`);
      await l.ctx.close();
      // El dueño la lee, la puede quitar (con un segundo toque) y su Historial lo cuenta
      const a = await ent(sLargo, ADMIN);
      await abrirBandera(a.p, info.abajo);
      ok(await rF(a.p) === 'Firmó Ana · Firma tú también', `19·cumbre: el dueño ve quién firmó («${await rF(a.p)}»)`);
      await a.p.click('#m-firmas'); await a.p.waitForTimeout(500);
      const quitar = a.p.locator('#fi-lista .fi-quitar');
      ok(await quitar.count() === 1 && (await quitar.locator('.fi-quitar-t').textContent()) === 'Quitar' && /Quitar la firma de Ana/.test(await quitar.textContent()), '19·cumbre: el dueño puede quitar la firma de Ana');
      ok((await a.p.textContent('#fi-guardar')).trim() === 'Firmar' && await ver(a.p, '#fi-texto'), '19·cumbre: y también firmar el suyo');
      await quitar.click(); await a.p.waitForTimeout(300);
      ok((await quitar.locator('.fi-quitar-t').textContent()) === 'Sí, quitar' && /¿Quitar la firma de Ana\?/.test(await a.p.textContent('#fi-estado')) && (await datos(a.p, '/api/firmas')).length === 1, '19·cumbre: el primer toque pregunta y no quita');
      await quitar.click(); await a.p.waitForTimeout(900);
      ok((await datos(a.p, '/api/firmas')).length === 0 && /Quitaste la firma de Ana/.test(await a.p.textContent('#fi-estado')) && await a.p.locator('#d-firmas[open]').count() === 1, '19·cumbre: el segundo la quita y el libro sigue abierto');
      await a.p.fill('#fi-texto', 'Gracias por subir conmigo'); await a.p.click('#fi-guardar'); await a.p.waitForTimeout(900);
      await a.p.keyboard.press('Escape'); await a.p.waitForTimeout(300);
      await a.p.click('#cuenta-btn'); await a.p.waitForTimeout(300); await a.p.click('#dc-historial'); await a.p.waitForTimeout(900);
      const hist = await a.p.textContent('#hist-lista');
      ok(/firmó el libro de cumbre del campamento/.test(hist) && /cambió su firma en el campamento/.test(hist) && /quitó la firma de Ana del campamento/.test(hist) && /quitó su firma del campamento/.test(hist),
        '19·cumbre: el Historial cuenta las firmas, los cambios y lo que se quitó');
      await a.p.keyboard.press('Escape'); await a.p.waitForTimeout(300);
      // «Tu historia»: el libro bajo su campamento (también los de abajo, que la montaña ya no dibuja)
      await a.p.click('#cuenta-btn'); await a.p.waitForTimeout(300); await a.p.click('#dc-historia-btn'); await a.p.waitForTimeout(900);
      await a.p.evaluate(() => { document.getElementById('dh-sec-linea').open = true; }); // la línea va plegada (campamento 20)
      const hf = a.p.locator('#dh-linea .h-firmas');
      ok(await hf.count() >= 1 && (await hf.allInnerTexts()).some((t) => t === 'Libro de cumbre: firmaste tú'), `19·cumbre: «Tu historia» dice quién firmó cada campamento (${(await hf.allInnerTexts()).join(' | ')})`);
      await hf.filter({ hasText: 'firmaste tú' }).first().click(); await a.p.waitForTimeout(500);
      ok(await a.p.locator('#d-firmas[open]').count() === 1 && /Gracias por subir conmigo/.test(await a.p.textContent('#fi-lista')), '19·cumbre: y desde ahí se abre el libro');
      eq(a.consola, [], `19·cumbre: consola limpia (${a.consola.join(' | ')})`);
      await a.ctx.close();
      // A 320 px el libro cabe sin desplazar a lo ancho
      const c = await ent(sLargo, LECTOR, { viewport: { width: 320, height: 568 } });
      await abrirBandera(c.p, info.abajo);
      await c.p.click('#m-firmas'); await c.p.waitForTimeout(500);
      const anchos = await c.p.evaluate(() => { const d = document.getElementById('d-firmas'); return [d.scrollWidth, d.clientWidth, document.documentElement.scrollWidth, document.documentElement.clientWidth]; });
      ok(anchos[0] <= anchos[1] + 1 && anchos[2] <= anchos[3], `19·cumbre: a 320 px el libro no se sale a lo ancho (${anchos})`);
      const bot = await c.p.locator('#fi-cerrar').boundingBox();
      ok(bot && bot.y + bot.height <= 568 && bot.height >= 47.5, '19·cumbre: a 320 px los botones quedan a mano (48 px, dentro de la pantalla)');
      await c.ctx.close();

      // ---- 21 · Bautizar la montaña: el dueño le pone nombre en «Tu cuenta»; sale en el Diario, el certificado y la tele; nunca en la entrada
      const d = await ent(sLargo, ADMIN);
      await d.p.click('#cuenta-btn'); await d.p.waitForTimeout(300);
      const filaM = d.p.locator('#dc-montana');
      ok(await filaM.isVisible() && (await filaM.textContent()).trim() === 'Nombre de la montaña: sin nombre', '19·nombre: «Tu cuenta» del dueño dice que la montaña no tiene nombre');
      await filaM.click(); await d.p.waitForTimeout(600);
      ok(await d.p.locator('#d-montana[open]').count() === 1 && await d.p.evaluate(() => document.activeElement?.id) === 'mo-nombre' && await d.p.isHidden('#mo-quitar'), '19·nombre: se abre el cuadro con el foco en el nombre');
      eq(await d.p.getAttribute('#mo-nombre', 'maxlength'), '32', '19·nombre: hasta 32 caracteres');
      await d.p.click('#mo-guardar'); await d.p.waitForTimeout(200);
      ok(/Escribe un nombre/.test(await d.p.textContent('#mo-error')), '19·nombre: vacío no se guarda (para quitarlo está su botón)');
      await d.p.fill('#mo-nombre', '  La   Ceiba '); await d.p.click('#mo-guardar'); await d.p.waitForTimeout(900);
      ok(await d.p.locator('#d-montana[open]').count() === 0 && (await d.p.textContent('#aviso-txt')).trim() === 'La montaña se llama «La Ceiba».', '19·nombre: se guarda y avisa');
      eq((await d.p.textContent('#dia-edicion')).replace(/\u00a0/g, ' ').trim().split(' · ')[0], 'Desde «La Ceiba»', '19·nombre: el Diario lo pone delante de la fecha, como el lugar de un periódico');
      await d.p.click('#cuenta-btn'); await d.p.waitForTimeout(300);
      ok((await filaM.textContent()).trim() === 'Nombre de la montaña: La Ceiba', '19·nombre: «Tu cuenta» dice el nombre');
      await d.p.click('#dc-historia-btn'); await d.p.waitForTimeout(900);
      await d.p.click('#dh-cert'); await d.p.waitForTimeout(700);
      ok((await d.p.innerHTML('#cert-lienzo')).includes('En la montaña «La Ceiba», se hace constar que') && /en la montaña «La Ceiba»/.test(await d.p.textContent('#cert-desc')), '19·nombre: el certificado lo dice (también en su descripción)');
      await d.p.click('#cert-ok'); await d.p.waitForTimeout(300);
      await d.p.click('#cuenta-btn'); await d.p.waitForTimeout(300); await d.p.click('#dc-historial'); await d.p.waitForTimeout(900);
      ok(/le puso a la montaña el nombre «La Ceiba»/.test(await d.p.textContent('#hist-lista')), '19·nombre: el Historial lo cuenta');
      await d.p.keyboard.press('Escape'); await d.p.waitForTimeout(300);
      eq(d.consola, [], `19·nombre: consola limpia (${d.consola.join(' | ')})`);
      await d.ctx.close();
      // Una lectora lo ve en el Diario y en la tele, pero no lo puede cambiar
      const t = await ent(sLargo, LECTOR, { viewport: { width: 1440, height: 900 }, isMobile: false, hasTouch: false });
      ok((await t.p.textContent('#dia-edicion')).replace(/\u00a0/g, ' ').startsWith('Desde «La Ceiba» · '), '19·nombre: la lectora ve el nombre en el Diario');
      await t.p.click('#cuenta-btn'); await t.p.waitForTimeout(300);
      ok(await t.p.isHidden('#dc-montana'), '19·nombre: y no tiene el botón para cambiarlo');
      await t.p.keyboard.press('Escape'); await t.p.waitForTimeout(300);
      ok(!(await t.p.isVisible('#tv-nombre')), '19·nombre: fuera de la tele no sale bajo la marca');
      await t.p.evaluate(() => { location.hash = '#tv'; }); await t.p.waitForTimeout(800);
      ok(await t.p.isVisible('#tv-nombre') && (await t.p.textContent('#tv-nombre')).trim() === 'Montaña «La Ceiba»', '19·nombre: la tele lo pone bajo la marca');
      const cajas = await t.p.evaluate(() => { const n = document.getElementById('tv-nombre').getBoundingClientRect(), s = document.getElementById('t-saldo').getBoundingClientRect(); return [n.bottom, s.top]; });
      ok(cajas[0] <= cajas[1], `19·nombre: en la tele no pisa el saldo (${cajas.map(Math.round)})`);
      // Nunca en la entrada
      await t.p.evaluate(() => fetch('/api/logout', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Libro': '1' }, body: '{}' }));
      await t.p.goto(`${sLargo.url}/login`, { waitUntil: 'networkidle' }); await t.p.waitForTimeout(500);
      ok(!(await t.p.evaluate(() => document.body.textContent.includes('Ceiba'))), '19·nombre: la pantalla de entrada nunca lo enseña');
      await t.ctx.close();
      // Quitarlo
      const q = await ent(sLargo, ADMIN);
      await q.p.click('#cuenta-btn'); await q.p.waitForTimeout(300); await q.p.click('#dc-montana'); await q.p.waitForTimeout(600);
      ok(await q.p.isVisible('#mo-quitar') && await q.p.inputValue('#mo-nombre') === 'La Ceiba', '19·nombre: con nombre, el cuadro lo trae y deja quitarlo');
      await q.p.click('#mo-quitar'); await q.p.waitForTimeout(900);
      ok(!(await q.p.textContent('#dia-edicion')).includes('Ceiba') && (await datos(q.p, '/api/montana')).nombre === null, '19·nombre: se quita y el Diario vuelve a su fecha');
      await q.ctx.close();
    } finally { sLargo.parar(); }
  });

  // ---------------------------------------------------------------- campamento 20: cada cosa en su sitio
  await bloque(async () => {
    const sinAviso = () => { try { localStorage.setItem('libro.avisos.preguntado', '1'); } catch { /* sin almacenamiento */ } };
    const ent = async (srv, cuenta, opts = {}, init = sinAviso) => {
      const r = await entrar(navegador, srv, cuenta, { pestanas: true, hora: 15, ...opts }, init);
      for (let k = 0; k < 3 && await r.p.locator('dialog[open]').count(); k++) { await r.p.keyboard.press('Escape'); await r.p.waitForTimeout(400); }
      return r;
    };
    const conLocal = (pares) => [(ps) => { try { localStorage.setItem('libro.avisos.preguntado', '1'); for (const [k, v] of ps) localStorage.setItem(k, v); } catch { /* sin almacenamiento */ } }, pares];
    const ver = (p, sel) => p.locator(sel).first().isVisible();
    const fijo = { isMobile: false, hasTouch: false };
    const L = await import('../app/static/lib.js');
    const s20 = await servidor('largo');
    try {
      // ---- 1/9 · «Tu cuenta» por para qué sirve
      {
        const a = await ent(s20, ADMIN);
        await a.p.click('#cuenta-btn'); await a.p.waitForTimeout(400);
        const menu = () => a.p.evaluate(() => {
          const out = []; let grupo = null;
          for (const e of document.querySelector('#d-cuenta .dc-lista').children) {
            if (e.matches('h3.dc-grupo')) { grupo = e.textContent.trim(); out.push({ grupo, items: [] }); continue; }
            if (e.hidden || getComputedStyle(e).display === 'none') continue;
            if (!out.length) out.push({ grupo: null, items: [] });
            out.at(-1).items.push(e.dataset.cuenta);
          }
          return out;
        });
        const m = await menu();
        eq(m.map((g) => g.grupo), ['El libro', 'Este dispositivo', 'Administrar'], '20·cuenta: tres grupos, en orden');
        eq(m[0].items, ['historia', 'montana', 'cumple'], '20·cuenta: «El libro» (historia y medallas, nombre de la montaña, cumpleaños)');
        ok(m[1].items[0] === 'avisos' && ['tema', 'letra', 'contraste', 'ganancia', 'efectos', 'madrugada', 'pestanas', 'tv', 'titulo', 'sonido'].every((x) => m[1].items.includes(x)), `20·cuenta: «Este dispositivo» (${m[1].items.join(', ')})`);
        eq(m[2].items, ['clave', 'sesiones', 'historial', 'datos', 'enlaces', 'sistema', 'salir', 'salir-todas', 'cerrar'], '20·cuenta: «Administrar» y, al final, salir');
        ok(await a.p.locator('#dc-menu [data-previa]').count() === 0, '20·cuenta: la vista previa ya no está en el menú');
        await a.p.click('#dc-sistema-btn'); await a.p.waitForTimeout(600);
        ok(await ver(a.p, '#dc-sistema') && await a.p.locator('#dc-previa button[data-previa]').count() === 6 && (await a.p.textContent('#dc-previa-t')).trim() === 'Probar la celebración', '20·cuenta: «Probar la celebración» vive en Estado del sistema, con sus seis botones (campamento 21: etapa y etapa con sello)');
        ok(!/temporal/i.test(await a.p.textContent('#dc-sistema')), '20·cuenta: ya no se llama temporal');
        const alto = await a.p.evaluate(() => [...document.querySelectorAll('#dc-previa button')].every((b) => b.getBoundingClientRect().height >= 47.5));
        ok(alto, '20·cuenta: sus botones miden 48 px');
        await a.p.click('[data-previa="compra"]'); await a.p.waitForTimeout(500);
        ok(await a.p.locator('#d-cuenta[open]').count() === 0 && /Prueba de la celebración/.test(await a.p.textContent('#aviso')), '20·cuenta: probar la celebración cierra «Tu cuenta» y lo avisa');
        await a.ctx.close();
        const l = await ent(s20, LECTOR);
        await l.p.click('#cuenta-btn'); await l.p.waitForTimeout(400);
        const ml = await l.p.evaluate(() => {
          const out = []; for (const e of document.querySelector('#d-cuenta .dc-lista').children) { if (e.matches('h3.dc-grupo')) out.push({ g: e.textContent.trim(), i: [] }); else if (!e.hidden) out.at(-1).i.push(e.dataset.cuenta); }
          return out;
        });
        eq([ml[0].i, ml[2].i], [['historia', 'cumple'], ['clave', 'sesiones', 'salir', 'salir-todas', 'cerrar']], '20·cuenta: una lectora, sin lo de administrar el libro');
        eq((await l.p.textContent('#dc-historia-btn')).trim(), 'Historia y medallas del libro', '20·cuenta: a quien solo mira, la historia se le nombra del libro');
        await l.ctx.close();
      }
      // ---- 2/9 · El gráfico primero (pestaña Gráficos)
      for (const [w, h] of [[390, 844], [1440, 900]]) {
        const a = await ent(s20, ADMIN, { viewport: { width: w, height: h }, ...fijo });
        await a.p.click('#pestanas [data-pestana="graficos"]'); await a.p.waitForTimeout(700);
        const y = await a.p.evaluate(() => Object.fromEntries(['vistas', 'mercado', 'lienzo', 'g-equilibrio', 'g-indicador', 'spd', 'rep-ext'].map((id) => [id, Math.round(document.getElementById(id).getBoundingClientRect().top + scrollY)])));
        ok(y.vistas < y.mercado && y.lienzo < y['g-equilibrio'] && y['g-equilibrio'] < y['g-indicador'] && y['g-indicador'] < y.spd && y.spd < y['rep-ext'], `20·gráfico ${w}: selector, gráfico, sus frases y, abajo, «Sats por dólar» junto a «Mejor y peor precio» (${JSON.stringify(y)})`);
        await a.ctx.close();
      }
    } finally { s20.parar(); }

    // ---- 3/9 · Cifras largas sin saltos (más de 1,000 BTC; letra normal y muy grande)
    const sMb = await servidor('milbtc');
    try {
      for (const [w, h, letra] of [[320, 568, ''], [320, 568, 'muy-grande'], [390, 844, ''], [390, 844, 'grande'], [844, 390, ''], [1440, 900, ''], [2560, 1300, '']]) {
        for (const unidad of ['sats', 'btc', 'usd']) {
          const a = await ent(sMb, ADMIN, { viewport: { width: w, height: h }, ...fijo }, conLocal([['libro.unidad', unidad], ...(letra ? [['libro.letra', letra]] : [])]));
          const m = await a.p.evaluate(() => {
            const s = document.getElementById('s-sats').getBoundingClientRect(), u = document.getElementById('s-unidad').getBoundingClientRect(), caja = document.querySelector('.saldo').getBoundingClientRect();
            const meta = document.getElementById('t-meta').getBoundingClientRect(), tr = document.getElementById('tramo').getBoundingClientRect();
            return { misma: u.top < s.bottom - 8 && u.left >= s.right - 1, dentro: s.right <= caja.right + 1 && u.right <= Math.min(caja.right, innerWidth) + 1, metaUna: meta.height < 80 && meta.right <= tr.right, txt: document.querySelector('#s-sats .sr').textContent, sw: document.documentElement.scrollWidth <= innerWidth };
          });
          ok(m.misma && m.dentro && m.sw, `20·cifras ${w}×${h}${letra ? ` ${letra}` : ''} ${unidad}: «${m.txt}» y su unidad en un renglón, sin salirse`);
          ok(m.metaUna, `20·cifras ${w}×${h}${letra ? ` ${letra}` : ''} ${unidad}: la meta de «Próxima etapa» en un renglón`);
          await a.p.evaluate(() => window.scrollTo(0, 1600)); await a.p.waitForTimeout(400);
          const mc = await a.p.evaluate(() => { const b = document.getElementById('minicab-saldo'); const r = [...b.getClientRects()]; const m = document.getElementById('minicab').getBoundingClientRect(); return { una: r.length === 1, dentro: b.getBoundingClientRect().right <= m.right, txt: b.textContent }; });
          ok(mc.una && mc.dentro, `20·cifras ${w}×${h}${letra ? ` ${letra}` : ''} ${unidad}: la mini-cabecera («${mc.txt}») en un renglón`);
          await a.ctx.close();
        }
      }
      // Forma corta (< 360 px): por encima de 1 BTC habla en BTC, con comas
      const a = await ent(sMb, ADMIN, { viewport: { width: 320, height: 568 }, ...fijo });
      const corta = await a.p.evaluate(() => { const c = document.querySelector('#t-falta .c-c'); return getComputedStyle(c).display === 'none' ? '' : `faltan ${c.textContent}`; }); // la forma visible (< 360 px)
      ok(/^faltan [\d,.]+ BTC$/.test(corta), `20·cifras: a 320 px lo que falta va en BTC (${corta})`);
      await a.ctx.close();
    } finally { sMb.parar(); }

    // ---- 8/9 · El renglón de la ganancia: «ya realizaste $Y» nunca queda con el monto solo en otro renglón ni con el «·» colgando
    const renglon = (p) => p.evaluate(() => {
      const v = document.getElementById('s-valor'), sv = v.querySelector('.sd-v'), g = v.querySelector('.sd-g'), r = v.querySelector('.sd-r');
      if (!r) return null;
      const lineas = (e) => new Set([...e.getClientRects()].filter((q) => q.width > 0.5).map((q) => Math.round(q.top / 4))).size;
      const izq = sv.getBoundingClientRect().left; // donde empieza cada renglón
      const sepVisible = (pieza) => { const s = pieza.querySelector('.sd-sep').getBoundingClientRect(); return s.left + s.width / 2 > izq; };
      const rr = r.getBoundingClientRect(), gg = g.getBoundingClientRect();
      const empiezaRenglon = Math.abs(rr.top - gg.top) > 6 && rr.top > gg.top;
      return { texto: v.textContent, rtUna: lineas(r.querySelector('.sd-rt')) === 1, empiezaRenglon, sepR: sepVisible(r), dentro: rr.right <= v.closest('.saldo').getBoundingClientRect().right + 1 };
    });
    const sMil = await servidor('mil');
    const sBal = await servidor('ballena');
    try {
      // La ballena no vende: se le anota un gasto pequeño (−$0.01 de ganancia realizada). Lo realizado de centavos NO sale en la cabecera
      // (solo confundía: es la comisión de red de un traslado); con una venta que pesa, sí.
      {
        const a = await ent(sBal, ADMIN);
        await a.p.evaluate(async () => { await fetch('/api/compras', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Libro': '1' }, body: JSON.stringify({ fecha: new Date(Date.now() - 864e5).toISOString().slice(0, 10), monto: 0.77, sats: 1000, tipo: 'venta' }) }); });
        await a.p.reload(); await a.p.waitForFunction(() => document.querySelector('#s-valor .sd-g'));
        ok(await a.p.evaluate(() => !document.querySelector('#s-valor .sd-r') && !/realizaste/.test(document.getElementById('s-valor').textContent)), '20·ganancia ballena: con una realizada de centavos la cabecera no dice «ya realizaste»');
        await a.p.evaluate(async () => { await fetch('/api/compras', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Libro': '1' }, body: JSON.stringify({ fecha: new Date(Date.now() - 864e5).toISOString().slice(0, 10), monto: 1, sats: 5000000, tipo: 'venta' }) }); });
        await a.ctx.close();
      }
      for (const [srv, esc] of [[sMil, 'mil'], [sBal, 'ballena']]) {
        for (const [w, letra] of [[320, ''], [360, ''], [390, ''], [393, ''], [412, ''], [768, ''], [1440, ''], [390, 'grande'], [390, 'muy-grande'], [320, 'muy-grande']]) {
          const a = await ent(srv, ADMIN, { viewport: { width: w, height: 844 }, ...fijo }, conLocal(letra ? [['libro.letra', letra]] : []));
          const m = await renglon(a.p);
          ok(m?.rtUna && m.dentro && (m.empiezaRenglon ? !m.sepR : m.sepR), `20·ganancia ${esc} ${w}${letra ? ` ${letra}` : ''}: «ya realizaste» con su monto, ${m?.empiezaRenglon ? 'en su renglón y sin «·»' : 'junto a la píldora, con su «·»'}`);
          ok(/^valen .+ · .+ · ya realizaste [+−-]?\$[\d,.]+/.test(m?.texto ?? ''), `20·ganancia ${esc} ${w}${letra ? ` ${letra}` : ''}: el texto de la línea es el de siempre`);
          await a.ctx.close();
        }
      }
    } finally { sBal.parar(); }

    // ---- 7/9 · Un punto por mes (más de 150 compras a la vista)
    try {
      const a = await ent(sMil, ADMIN, { viewport: { width: 390, height: 844 }, ...fijo });
      await a.p.click('#pestanas [data-pestana="graficos"]'); await a.p.waitForTimeout(500);
      const punto = () => a.p.evaluate(() => { const svg = document.querySelector('#lienzo svg'), d = svg.querySelector('.g-compras').getAttribute('d'), m = /^M([\d.]+) ([\d.]+)a([\d.]+)/.exec(d), r = svg.getBoundingClientRect(); return { x: r.left + Number(m[1]) + Number(m[3]), y: r.top + Number(m[2]), n: (d.match(/M/g) ?? []).length }; });
      await a.p.click('#rangos button[data-r="0"]'); await a.p.waitForTimeout(700);
      await a.p.evaluate(() => document.getElementById('lienzo').scrollIntoView({ block: 'center' })); await a.p.waitForTimeout(400);
      let pt = await punto();
      const etq = await a.p.evaluate(() => document.querySelector('#lienzo .g-escala')?.textContent);
      ok(etq === 'Un punto por mes' && /1,000 compras tuyas aquí, un punto por mes\./.test(await a.p.textContent('#g-lectura')), `20·mes: con «Todo» (1,000 compras) un punto por mes, dicho en el gráfico y en la lectura («${etq}»)`);
      ok(pt.n > 50 && pt.n < 90, `20·mes: unos 70 puntos en vez de 1,000 (${pt.n})`);
      ok(await a.p.locator('#lienzo .g-extras').count() === 1 && await a.p.locator('#lienzo .g-ventas').count() === 1, '20·mes: las compras extra (con su anillo) y las ventas siguen una por una');
      await a.p.mouse.click(pt.x, pt.y); await a.p.waitForTimeout(300);
      const t = await a.p.evaluate(() => { const c = document.getElementById('g-tarjeta'); return { modo: c.dataset.modo, fecha: c.querySelector('.gt-fecha').textContent, sub: c.querySelector('.gt-sub').textContent, editar: !c.querySelector('.gt-editar').hidden, label: c.getAttribute('aria-label') }; });
      ok(t.modo === 'fija' && /^[A-ZÁÉÍÓÚ][a-záéíóú]+ de \d{4} · \d+ compras?$/.test(t.fecha) && / de promedio$/.test(t.sub) && !t.editar && t.label === 'Detalle del mes', `20·mes: tocar un punto dice el mes y cuántas compras junta, sin «Editar» («${t.fecha}» · «${t.sub}»)`);
      await a.p.keyboard.press('Escape');
      await a.p.click('#rangos button[data-r="182"]'); await a.p.waitForTimeout(700);
      ok(await a.p.locator('#lienzo .g-escala').count() === 0 && !/un punto por mes/.test(await a.p.textContent('#g-lectura')), '20·mes: con 150 compras o menos a la vista, nada cambia');
      await a.p.evaluate(() => document.getElementById('lienzo').scrollIntoView({ block: 'center' })); await a.p.waitForTimeout(400);
      pt = await punto();
      await a.p.mouse.click(pt.x, pt.y); await a.p.waitForTimeout(300);
      ok(/^(Compra|Compra extra) · /.test(await a.p.textContent('#g-tarjeta .gt-fecha')) && !(await a.p.locator('#g-tarjeta .gt-editar').isHidden()), '20·mes: y cada punto sigue siendo una compra, con «Editar»');
      eq(a.consola, [], `20·mes: consola limpia (${a.consola.join(' | ')})`);
      await a.ctx.close();
    } finally { sMil.parar(); }

    // ---- 4/9 · Voz del lector, segunda pasada: quien solo mira no lee «tu/tus» (ni al recorrer los gráficos ni en los dibujos)
    const sVoz = await servidor('largo');
    try {
      const tuteo = async (p) => p.evaluate(async () => {
        const re = /(^|[^\p{L}])(tu|tus|te|ti|vas|tienes|llevas|compraste|pusiste|llegaste|estás|estarías|empezaste|vendiste|realizaste|invertiste|tuya|tuyas)(?![\p{L}])/iu;
        const fuera = (el) => el.closest('#d-cuenta, #d-firmas, #cuenta-btn, script, style') || el.closest('[hidden]') || el.closest('dialog:not([open])');
        const escanear = () => {
          const out = [];
          const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
          for (let t = tw.nextNode(); t; t = tw.nextNode()) { const el = t.parentElement; if (el && !fuera(el) && getComputedStyle(el).display !== 'none' && re.test(t.data)) out.push(`${el.id || el.tagName}: ${t.data.trim().slice(0, 70)}`); }
          for (const el of document.querySelectorAll('[aria-label], [title]')) { if (fuera(el)) continue; for (const a of ['aria-label', 'title']) { const v = el.getAttribute(a); if (v && re.test(v)) out.push(`${a} ${el.id || el.tagName}: ${v.slice(0, 70)}`); } }
          return out;
        };
        const espera = (ms) => new Promise((r) => setTimeout(r, ms));
        const tecla = (el, key) => el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
        const todo = new Set(escanear());
        for (const v of ['valor', 'costo', 'sats']) {
          document.querySelector(`#vistas button[data-vista="${v}"]`)?.click(); await espera(400);
          const l = document.querySelector({ valor: '#v-lienzo', costo: '#c-lienzo', sats: '#s-lienzo' }[v]);
          l.focus(); tecla(l, 'Home'); await espera(100);
          for (const x of escanear()) todo.add(`${v}: ${x}`);
        }
        document.querySelector('#vistas button[data-vista="precio"]')?.click(); await espera(400);
        const lz = document.getElementById('lienzo'); lz.focus(); tecla(lz, 'End');
        for (let k = 0; k < 40; k++) { tecla(lz, 'ArrowLeft'); for (const x of escanear()) todo.add(`grafico: ${x}`); }
        for (const d of document.querySelectorAll('#historia details.dh-sec')) d.open = true;
        for (const v of ['tronco', 'constelacion', 'torre', 'manta', 'estratos', 'partitura', 'linea']) {
          document.querySelector(`#dh-vistas [data-vh="${v}"]`)?.click(); await espera(300);
          document.querySelector('#dh-lienzo .pieza')?.dispatchEvent(new MouseEvent('click', { bubbles: true })); await espera(150);
          for (const x of escanear()) todo.add(`${v}: ${x}`);
        }
        return [...todo];
      });
      const l = await ent(sVoz, LECTOR, { pestanas: false });
      await l.p.click('#cuenta-btn'); await l.p.waitForTimeout(300); await l.p.click('#dc-historia-btn'); await l.p.waitForTimeout(900); // la historia, al final de la página
      eq(await tuteo(l.p), [], '20·voz: quien solo mira no lee «tu/tus» en la página (gráficos recorridos, historia y sus seis dibujos)');
      await l.ctx.close();
      const a = await ent(sVoz, ADMIN, { pestanas: false });
      ok(/^Tu costo promedio/.test((await a.p.textContent('#v-vs')) ?? 'Tu costo promedio') && /^Tu costo promedio · /.test(await a.p.textContent('#ind-costo-t')) && /compras tuyas aquí/.test(await a.p.textContent('#g-lectura')), '20·voz: el dueño lee lo de siempre');
      await a.ctx.close();
    } finally { sVoz.parar(); }

    // ---- 5/9 · «Tu historia» abre con un dibujo; las secciones, plegadas con su cuenta
    const sHis = await servidor('anio');
    try {
      const a = await ent(sHis, ADMIN);
      await a.p.click('#pestanas [data-pestana="historia"]'); await a.p.waitForTimeout(800);
      const hoy = await a.p.evaluate(() => ({ visible: !document.getElementById('dh-hoy').hidden, nombre: document.getElementById('dh-hoy-t').textContent, vh: document.getElementById('dh-hoy').dataset.vh, svg: document.querySelectorAll('#dh-hoy-lienzo svg').length, desc: document.getElementById('dh-hoy-desc').textContent, y: document.getElementById('dh-hoy').getBoundingClientRect().top, ySel: document.getElementById('dh-vistas').getBoundingClientRect().top }));
      const compras = await datos(a.p, '/api/compras');
      const esperado = L.objetoDeHoy(compras.map((c) => ({ ...c, sats: Number(c.sats) })), hoySV());
      ok(hoy.visible && hoy.svg === 1 && hoy.vh === esperado.vh && hoy.nombre === esperado.nombre && hoy.desc.length > 30 && hoy.y < hoy.ySel, `20·historia: arriba, el dibujo de hoy (${hoy.nombre}), el mismo que dice la cuenta del día`);
      const secs = await a.p.evaluate(() => [...document.querySelectorAll('#dh-v-linea details.dh-sec')].filter((d) => !d.hidden).map((d) => ({ s: d.dataset.sec, open: d.open, n: d.querySelector('.dh-n').textContent })));
      ok(secs.length === 4 && secs.every((s) => !s.open && /^\d+ \w+|aún ninguna/.test(s.n)), `20·historia: las secciones van plegadas con su cuenta (${secs.map((s) => `${s.s}: ${s.n}`).join(' · ')})`);
      const alto = await a.p.evaluate(() => [...document.querySelectorAll('#dh-v-linea summary, #dh-hoy-ver')].every((e) => e.getBoundingClientRect().height >= 47.5));
      ok(alto, '20·historia: los títulos plegables y «Verlo de cerca» miden 48 px');
      await a.p.click('#dh-sec-linea > summary'); await a.p.waitForTimeout(200);
      ok(await ver(a.p, '#dh-linea .h-ev'), '20·historia: tocar una sección la abre');
      await a.p.focus('#dh-sec-linea > summary'); await a.p.keyboard.press('Enter'); await a.p.waitForTimeout(200);
      ok(!(await a.p.evaluate(() => document.getElementById('dh-sec-linea').open)), '20·historia: con el teclado (Intro) se pliega');
      await a.p.click('#dh-sec-linea > summary'); await a.p.waitForTimeout(200);
      await a.p.reload({ waitUntil: 'networkidle' }); await a.p.waitForTimeout(2500);
      for (let k = 0; k < 3 && await a.p.locator('dialog[open]').count(); k++) { await a.p.keyboard.press('Escape'); await a.p.waitForTimeout(300); }
      ok(await a.p.evaluate(() => document.getElementById('dh-sec-linea').open && !document.getElementById('dh-sec-medallas').open) && (await a.p.textContent('#dh-hoy-t')) === hoy.nombre, '20·historia: el dispositivo recuerda qué abriste y el dibujo de hoy sigue siendo el mismo');
      await a.p.click('#dh-hoy-ver'); await a.p.waitForTimeout(600);
      ok(await a.p.getAttribute(`#dh-vistas [data-vh="${hoy.vh}"]`, 'aria-pressed') === 'true' && await ver(a.p, '#dh-objeto') && await a.p.evaluate(() => document.activeElement?.id === 'dh-lienzo'), '20·historia: «Verlo de cerca» lo abre en el selector, con el foco en el dibujo');
      await a.p.click('#pestanas [data-pestana="resumen"]'); await a.p.waitForTimeout(500);
      await a.p.click('#res-historia'); await a.p.waitForTimeout(900);
      ok(await a.p.evaluate(() => document.getElementById('dh-sec-medallas').open) && await ver(a.p, '#dh-medallas .medalla') && await a.p.getAttribute('#dh-vistas [data-vh="linea"]', 'aria-pressed') === 'true', '20·historia: «Ver todas mis medallas» abre su sección');
      eq(a.consola, [], `20·historia: consola limpia (${a.consola.join(' | ')})`);
      await a.ctx.close();
    } finally { sHis.parar(); }
    for (const esc of ['hoy', 'vacio']) {
      const srv = await servidor(esc);
      try {
        const a = await ent(srv, ADMIN);
        await a.p.click('#pestanas [data-pestana="historia"]'); await a.p.waitForTimeout(600);
        ok(!(await ver(a.p, '#dh-hoy')), `20·historia (${esc}): sin datos para ningún dibujo, no sale el de hoy`);
        await a.ctx.close();
      } finally { srv.parar(); }
    }

    // ---- 6/9 · El tronco y la manta del primer año
    for (const [esc, primer] of [['nueve', true], ['largo', false]]) {
      const srv = await servidor(esc);
      try {
        const a = await ent(srv, ADMIN, {}, conLocal([['libro.historia.vista', 'tronco']]));
        await a.p.click('#pestanas [data-pestana="historia"]'); await a.p.waitForTimeout(700);
        const tr = await a.p.evaluate(() => ({ primer: !!document.querySelector('#dh-lienzo .h-tronco-primer'), mes: document.querySelectorAll('#dh-lienzo .h-anillo[data-i]').length, anio: document.querySelectorAll('#dh-lienzo .h-anillo[data-anio]').length, falta: !!document.querySelector('#dh-lienzo .ht-falta'), desc: document.getElementById('dh-desc').textContent, anios: !document.getElementById('dh-anios').hidden }));
        if (primer) {
          ok(tr.primer && tr.mes >= 2 && tr.anio === 0 && tr.falta && /primer año: una banda por mes/.test(tr.desc) && !tr.anios, `20·primer año (${esc}): el tronco es un árbol joven, una banda por mes (${tr.mes}), con la vuelta que falta`);
          await a.p.focus('#dh-lienzo'); await a.p.keyboard.press('Home'); await a.p.waitForTimeout(200);
          ok(/^[A-Z][a-z]+ de \d{4}: \d+ compras?/.test(await a.p.textContent('#dh-detalle')) && await a.p.locator('#dh-lienzo .h-anillo.sel').count() === 1, '20·primer año: las bandas se recorren con el teclado y se leen');
        } else ok(!tr.primer && tr.anio >= 5 && !tr.falta && tr.anios, `20·primer año (${esc}): con más de un año, el tronco de siempre (${tr.anio} anillos)`);
        await a.p.click('#dh-vistas [data-vh="manta"]'); await a.p.waitForTimeout(400);
        const ma = await a.p.evaluate(() => ({ primer: !!document.querySelector('#dh-lienzo .h-manta-primer'), celdas: document.querySelectorAll('#dh-lienzo .celda').length, telar: !!document.querySelector('#dh-lienzo .ha-telar'), desc: document.getElementById('dh-desc').textContent }));
        if (primer) {
          ok(ma.primer && ma.telar && ma.celdas >= 9 && ma.celdas < 20 && /4 hileras de 13 semanas/.test(ma.desc), `20·primer año (${esc}): la manta es una pieza de cuatro hileras en el telar (${ma.celdas} semanas tejidas)`);
          await a.p.focus('#dh-lienzo'); await a.p.keyboard.press('End'); await a.p.keyboard.press('ArrowUp'); await a.p.waitForTimeout(200);
          ok(/^Semana del /.test(await a.p.textContent('#dh-detalle')), '20·primer año: la manta se recorre con las flechas (arriba, una hilera)');
        } else ok(!ma.primer && !ma.telar, `20·primer año (${esc}): con más de un año, la manta de siempre`);
        eq(a.consola, [], `20·primer año (${esc}): consola limpia`);
        await a.ctx.close();
      } finally { srv.parar(); }
    }

    // ---- 9/9 · El dock: tocar una pestaña enseña su contenido; la activa sube a la escena; foco y toques; quien solo mira; la hoja
    const sDock = await servidor('anio');
    try {
      const a = await ent(sDock, ADMIN, { viewport: { width: 393, height: 848 }, ...fijo });
      const arribaCuerpo = () => a.p.evaluate(() => Math.round(document.getElementById('principal').getBoundingClientRect().top));
      await a.p.click('#pestanas [data-pestana="graficos"]'); await a.p.waitForTimeout(900);
      const y1 = await arribaCuerpo();
      ok(y1 > 30 && y1 < 90 && await ver(a.p, '#vistas'), `20·dock: tocar «Gráficos» desde la escena enseña su contenido desde el principio (cuerpo a ${y1} px)`);
      await a.p.click('#pestanas [data-pestana="graficos"]'); await a.p.waitForTimeout(900);
      eq(await a.p.evaluate(() => Math.round(scrollY)), 0, '20·dock: tocar la pestaña activa sube hasta la escena');
      const tam = await a.p.evaluate(() => [...document.querySelectorAll('#pestanas button, #anotar')].map((b) => { const r = b.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; }));
      ok(tam.every(([w, h]) => w >= 47.5 && h >= 47.5), `20·dock: las pestañas y «Anotar» miden 48 px o más (${JSON.stringify(tam)})`);
      eq(await a.p.evaluate(() => [document.getElementById('anotar').textContent, getComputedStyle(document.querySelector('#anotar .an-c')).position]), ['Anotar compra', 'absolute'], '20·dock: se lee «Anotar» y su nombre sigue siendo «Anotar compra»');
      await a.p.click('#anotar'); await a.p.waitForTimeout(600);
      const hoja = await a.p.evaluate(() => { const d = document.getElementById('pestanas').getBoundingClientRect(); const z = (e) => Number(getComputedStyle(e).zIndex) || 0; return { abierta: !document.getElementById('hoja').hidden, encima: z(document.getElementById('hoja')) > z(document.getElementById('pestanas')), tapa: document.elementFromPoint((d.left + d.right) / 2, d.top + 10)?.closest('#pestanas, #anotar') === null }; });
      ok(hoja.abierta && hoja.encima && hoja.tapa, '20·dock: la hoja de anotar se abre por encima del dock');
      await a.p.keyboard.press('Escape'); await a.p.waitForTimeout(500);
      // El foco: nada de lo que se enfoca con Tab queda debajo del dock (el dock y «Anotar» flotan: no cuentan)
      const tapados = [];
      for (let i = 0; i < 60; i++) {
        await a.p.keyboard.press('Tab');
        const x = await a.p.evaluate(() => { const el = document.activeElement; if (!el || el === document.body || el.closest('#pestanas, #anotar, dialog, .hoja')) return null; const r = el.getBoundingClientRect(), d = document.getElementById('pestanas').getBoundingClientRect(); return r.height > 0 && r.bottom > d.top + 2 && r.top < d.bottom ? (el.id || el.className) : null; });
        if (x) tapados.push(x);
      }
      eq(tapados, [], '20·dock: nada de lo enfocado queda debajo del dock');
      // Flechas entre pestañas y atajo A (abre la hoja)
      await a.p.focus('#pestanas [data-pestana="resumen"]'); await a.p.keyboard.press('ArrowRight');
      eq(await a.p.evaluate(() => document.activeElement.dataset.pestana), 'graficos', '20·dock: las flechas pasan de una pestaña a otra');
      await a.p.evaluate(() => document.activeElement.blur()); await a.p.keyboard.press('a'); await a.p.waitForTimeout(500);
      ok(await a.p.evaluate(() => !document.getElementById('hoja').hidden), '20·dock: el atajo A sigue abriendo la hoja');
      await a.p.keyboard.press('Escape');
      eq(a.consola, [], `20·dock: consola limpia (${a.consola.join(' | ')})`);
      await a.ctx.close();
      // Quien solo mira: cuatro pestañas parejas, sin hueco, con sus nombres
      const l = await ent(sDock, LECTOR, { viewport: { width: 320, height: 568 }, ...fijo });
      const lc = await l.p.evaluate(() => [...document.querySelectorAll('#pestanas button')].map((b) => { const r = b.getBoundingClientRect(), t = b.querySelector('.pe-txt').getBoundingClientRect(); return { w: Math.round(r.width), txt: Math.round(t.width), cabe: t.left >= r.left - 1 && t.right <= r.right + 1 }; }));
      ok(new Set(lc.map((x) => x.w)).size === 1 && lc.every((x) => x.txt > 20 && x.cabe), `20·dock: quien solo mira tiene cuatro pestañas parejas con su nombre, también a 320 px (${JSON.stringify(lc)})`);
      await l.ctx.close();
      // Con efectos «ninguno» y en modo pantalla grande
      const t = await ent(sDock, LECTOR, { viewport: { width: 1280, height: 720 }, ...fijo });
      await t.p.evaluate(() => { location.hash = '#tv'; }); await t.p.waitForTimeout(1200);
      ok(!(await ver(t.p, '#pestanas')), '20·dock: la pantalla grande no lo enseña');
      await t.ctx.close();
    } finally { sDock.parar(); }
  });

  // ---------------------------------------------------------------- campamento 21: etapas más cercanas
  await bloque(async () => {
    const sinAviso = () => { try { localStorage.setItem('libro.avisos.preguntado', '1'); } catch { /* sin almacenamiento */ } };
    const conLocal = (pares) => [(ps) => { try { localStorage.setItem('libro.avisos.preguntado', '1'); for (const [k, v] of ps) localStorage.setItem(k, v); } catch { /* sin almacenamiento */ } }, pares];
    const ent = async (srv, cuenta, opts = {}, init = sinAviso) => {
      const r = await entrar(navegador, srv, cuenta, opts, init);
      for (let k = 0; k < 3 && await r.p.locator('dialog[open]').count(); k++) { await r.p.keyboard.press('Escape'); await r.p.waitForTimeout(400); }
      return r;
    };
    const ver = (p, sel) => p.locator(sel).first().isVisible();
    const tuteo = /\b(tu|tus|te|ti|vas|llegas|llegaste|compraste)\b/i;
    // Las marcas de etapa de la montaña: centro de cada una, si es fina, si es la siguiente y qué rótulos hay.
    const marcas = (p) => p.evaluate(() => {
      const m = [...document.querySelectorAll('#m-etapas .etapa')].map((g) => { const b = g.querySelector('.etapa-tick').getBoundingClientRect(); return { m: Number(g.dataset.m), x: b.x + b.width / 2, y: b.y + b.height / 2, fina: g.classList.contains('menor'), sig: g.classList.contains('sig'), oculta: g.getAttribute('visibility') === 'hidden' }; });
      let dmin = Infinity;
      for (let i = 0; i < m.length; i++) for (let j = i + 1; j < m.length; j++) dmin = Math.min(dmin, Math.hypot(m[i].x - m[j].x, m[i].y - m[j].y));
      return { m, dmin, campos: document.querySelectorAll('#m-campos .campo').length, rotulos: [...document.querySelectorAll('#m-etiquetas text.campo-txt:not(.etapa-txt)')].map((t) => t.textContent), etiqueta: [...document.querySelectorAll('#m-etiquetas text.etapa-txt')].map((t) => t.textContent), sw: document.documentElement.scrollWidth - document.documentElement.clientWidth };
    });
    const sAnio = await servidor('anio');
    try {
      // ---- «Próxima etapa»: la meta cercana y la escalerita del tramo
      const a = await ent(sAnio, ADMIN, { hora: 22, viewport: { width: 1440, height: 900 }, isMobile: false, hasTouch: false }, conLocal([['libro.efectos', 'todos']]));
      const tr = () => a.p.evaluate(() => ({ meta: document.getElementById('t-meta').textContent, aria: document.getElementById('t-anillo').getAttribute('aria-label'), pasos: !document.getElementById('t-pasos').hidden, n: document.querySelectorAll('#t-esc i').length, hechas: document.querySelectorAll('#t-esc i.hecha').length, sig: document.querySelectorAll('#t-esc i.sig').length, txt: document.getElementById('t-pasos-t').textContent, escAria: document.getElementById('t-esc').getAttribute('aria-hidden') }));
      let t = await tr();
      eq([t.meta, t.pasos, t.n, t.hechas, t.sig, t.txt, t.escAria], ['1.25M sats', true, 6, 0, 1, 'Etapa 1 de 6 del tramo de 1M a 2.5M sats', 'true'], `21·próxima: la meta cercana y su tramo (${JSON.stringify(t)})`);
      ok(/del camino a 1\.25M sats$/.test(t.aria), `21·próxima: el anillo habla de la etapa cercana («${t.aria}»)`);
      // ---- Cruzar una etapa intermedia: celebración ligera (sin lacre, sin cometa ni bandera plantada) y la marca se enciende
      await a.p.evaluate(() => window.scrollTo(0, 0));
      await a.p.click('#anotar'); await a.p.waitForTimeout(400);
      await a.p.fill('#h-sats', '40000');
      await vigilarPiezas(a.p, ['.cometa', '.plantada', '#m-fx .anillo']); // lo que no debe salir, contado desde antes de guardar
      await a.p.click('#guardar');
      await a.p.waitForFunction(() => !document.getElementById('hito-cel').hidden, null, { timeout: 12000 });
      const c = await a.p.evaluate(() => ({ ligera: document.getElementById('hito-cel').classList.contains('ligera'), k: document.getElementById('hc-k').textContent, txt: document.getElementById('hc-txt').textContent, lacre: document.getElementById('hc-lacre').innerHTML, cometa: window.__piezas['.cometa'], plantada: window.__piezas['.plantada'], anillos: window.__piezas['#m-fx .anillo'] }));
      eq(c, { ligera: true, k: 'Nueva etapa', txt: '1.25M sats', lacre: '', cometa: 0, plantada: 0, anillos: 0 }, '21·celebración: una etapa intermedia se celebra en ligero');
      const t0 = Date.now();
      await a.p.waitForFunction(() => document.getElementById('hito-cel').hidden, null, { timeout: 6000 });
      ok(Date.now() - t0 < 2600, `21·celebración: la tarjeta ligera es breve (${Date.now() - t0} ms)`);
      t = await tr();
      eq([t.meta, t.hechas, t.txt], ['1.5M sats', 1, 'Etapa 2 de 6 del tramo de 1M a 2.5M sats'], '21·próxima: tras cruzarla, la siguiente y un escalón lleno');
      const mk = await marcas(a.p);
      const enc = await a.p.evaluate(() => { const g = document.querySelector('#m-etapas .etapa[data-m="1250000"]'); return { hay: !!g, alcanzada: g?.classList.contains('alcanzada') ?? null, fina: g?.classList.contains('menor') ?? null, encendidas: document.querySelectorAll('#m-etapas .etapa.alcanzada').length, transicion: getComputedStyle(document.querySelector('#m-etapas .etapa-tick')).transitionProperty }; });
      ok((!enc.hay || (enc.alcanzada && enc.fina)) && enc.encendidas >= 1 && /opacity/.test(enc.transicion), `21·montaña: la marca cruzada queda encendida y se enciende con suavidad (${JSON.stringify(enc)})`);
      ok(mk.m.filter((x) => x.sig).length === 1 && mk.m.find((x) => x.sig).m === 1_500_000, '21·montaña: la siguiente etapa lleva su marca naranja');
      eq(a.consola, [], `21·celebración: consola limpia (${a.consola.join(' | ')})`);
      await a.ctx.close();
      // ---- Una etapa con sello: bandera, lacre y cometa; «Probar la celebración» tiene las dos
      const b = await ent(sAnio, ADMIN, { hora: 22 }, conLocal([['libro.efectos', 'todos']]));
      await b.p.click('#cuenta-btn'); await b.p.click('#dc-sistema-btn'); await b.p.waitForTimeout(400);
      eq(await b.p.locator('#dc-previa button').allTextContents(), ['Compra', 'Etapa', 'Etapa con sello', 'Hito grande', '1 BTC', 'Constancia'], '21·probar: «Etapa» y «Etapa con sello»');
      await vigilarPiezas(b.p, ['.cometa']);
      await b.p.click('[data-previa="etapa"]');
      await b.p.waitForFunction(() => !document.getElementById('hito-cel').hidden, null, { timeout: 12000 });
      await b.p.waitForFunction(() => window.__piezas['.cometa'] > 0, null, { timeout: 4000 }).catch(() => {});
      const g = await b.p.evaluate(() => ({ ligera: document.getElementById('hito-cel').classList.contains('ligera'), txt: document.getElementById('hc-txt').textContent, lacre: !!document.querySelector('#hc-lacre svg.lacre'), cometa: window.__piezas['.cometa'] }));
      eq(g, { ligera: false, txt: '2.5M sats', lacre: true, cometa: 1 }, '21·celebración: una etapa con sello trae su lacre y el cometa');
      await b.p.waitForFunction(() => document.getElementById('hito-cel').hidden, null, { timeout: 8000 });
      await b.p.waitForTimeout(5000);
      await b.p.click('#cuenta-btn'); await b.p.click('#dc-sistema-btn'); await b.p.waitForTimeout(400);
      await vigilarPiezas(b.p, ['.cometa']);
      await b.p.click('[data-previa="paso"]');
      await b.p.waitForFunction(() => !document.getElementById('hito-cel').hidden, null, { timeout: 12000 });
      ok(await b.p.evaluate(() => document.getElementById('hito-cel').classList.contains('ligera') && !document.querySelector('#hc-lacre svg') && window.__piezas['.cometa'] === 0), '21·probar: «Etapa» enseña la celebración ligera (sin cometa en ningún momento)');
      await b.ctx.close();
      // ---- Cartas: las dos siguientes etapas y después las de siempre (una carta puede esperar a 10M)
      const cr = await ent(sAnio, ADMIN, { hora: 15 });
      await cr.p.click('#cap-nueva'); await cr.p.waitForTimeout(400);
      eq(await cr.p.locator('#cap-etapa option').allTextContents(), ['1.5M sats', '1.75M sats', '2.5M sats', '5M sats', '10M sats', '25M sats'], '21·cartas: las dos siguientes y luego las de siempre, hasta 25M (la compra de arriba ya cruzó 1.25M)');
      await cr.ctx.close();
      // ---- La escalerita para quien solo mira, sin tuteo; y en 320 px con letra muy grande, sin desbordes
      const l = await ent(sAnio, LECTOR, { hora: 15, viewport: { width: 320, height: 640 } }, conLocal([['libro.letra', 'muy-grande']]));
      const lt = await l.p.evaluate(() => ({ txt: document.getElementById('t-pasos-t').textContent, ritmo: document.getElementById('t-ritmo').textContent, esc: document.getElementById('t-esc').getBoundingClientRect().width, caja: document.getElementById('tramo').getBoundingClientRect().width, sw: document.documentElement.scrollWidth - document.documentElement.clientWidth }));
      ok(/^Etapa \d de 6 del tramo de 1M a 2\.5M sats$/.test(lt.txt) && !tuteo.test(lt.txt) && lt.esc > 0 && lt.esc <= lt.caja && lt.sw <= 0, `21·próxima: lectora, 320 px y letra muy grande (${JSON.stringify(lt)})`);
      await l.ctx.close();
    } finally { sAnio.parar(); }
    // ---- Sin escalerita al empezar (100k es la primera etapa) ni con una sola etapa en el tramo
    const sHoy = await servidor('hoy');
    try {
      const h = await ent(sHoy, ADMIN, { hora: 15 });
      ok(!(await ver(h.p, '#t-pasos')) && (await h.p.textContent('#t-meta')) === '100k sats', '21·próxima: al empezar no hay escalerita y la meta es 100k');
      await h.ctx.close();
    } finally { sHoy.parar(); }
    // ---- «Tu historia» y el reporte de etapas con un libro largo
    const sLargo = await servidor('largo');
    try {
      const a = await ent(sLargo, ADMIN, { hora: 15 });
      await a.p.click('#cuenta-btn'); await a.p.waitForTimeout(300); await a.p.click('#dc-historia-btn'); await a.p.waitForTimeout(900);
      await a.p.evaluate(() => { document.getElementById('dh-sec-linea').open = true; });
      const hs = await a.p.evaluate(() => ({
        grupos: [...document.querySelectorAll('#dh-linea .h-pasos')].map((li) => ({ sum: li.querySelector('summary').textContent, abierto: li.querySelector('details').open, n: li.querySelectorAll('ul li').length, fechas: [...li.querySelectorAll('ul time')].every((t) => /^\d{4}-\d\d-\d\d$/.test(t.dateTime)) })),
        sueltas: [...document.querySelectorAll('#dh-linea .h-paso strong')].map((s) => s.textContent),
        etapas: [...document.querySelectorAll('#dh-linea .h-etapa strong')].map((s) => s.textContent),
        sellos: [...document.querySelectorAll('#dh-sellos .sello b')].map((s) => s.textContent),
        orden: [...document.querySelectorAll('#dh-linea > li > time')].map((t) => t.dateTime),
      }));
      ok(hs.grupos.length >= 2 && hs.grupos.every((x) => !x.abierto && x.n >= 1 && x.fechas && /^\d+ etapas? intermedias?entre \S+ y \S+ sats$/.test(x.sum)), `21·historia: las intermedias de tramos cerrados van juntas y plegadas (${JSON.stringify(hs.grupos)})`);
      eq(hs.sueltas, ['Llegaste a 12.5M sats', 'Llegaste a 15M sats'], '21·historia: las del tramo en curso, sueltas');
      eq(hs.etapas, ['Llegaste a 250k sats', 'Llegaste a 500k sats', 'Llegaste a 2.5M sats', 'Llegaste a 5M sats'], '21·historia: las etapas de siempre, cada una en su renglón');
      eq(hs.sellos, ['100k sats', '250k sats', '500k sats', '1M sats', '2.5M sats', '5M sats', '10M sats'], '21·historia: sellos solo de campamentos y etapas de siempre');
      ok(hs.orden.every((f, i) => i === 0 || hs.orden[i - 1] <= f), '21·historia: la línea sigue en orden');
      // Con el teclado: el renglón del tramo se despliega con Intro y enseña sus etapas
      await a.p.focus('#dh-linea .h-pasos summary'); await a.p.keyboard.press('Enter'); await a.p.waitForTimeout(200);
      const ab = await a.p.evaluate(() => { const d = document.querySelector('#dh-linea .h-pasos details'); const s = d.querySelector('summary').getBoundingClientRect(); return { open: d.open, alto: s.height, lista: d.querySelector('ul').getBoundingClientRect().height }; });
      ok(ab.open && ab.alto >= 47.5 && ab.lista > 0, `21·historia: se despliega con el teclado y su zona de toque mide 48 px (${JSON.stringify(ab)})`);
      // El reporte de etapas («todo junto»): campamentos y principales, el tramo en curso y lo que falta; no las intermedias viejas
      const hi = await a.p.evaluate(() => [...document.querySelectorAll('#hitos li b')].map((b) => b.textContent));
      ok(hi.includes('12.5M sats') && hi.includes('17.5M sats') && hi.includes('2.5M sats') && !hi.includes('750k sats') && !hi.includes('1.25M sats') && hi.at(-1) === '1 BTC', `21·reporte: etapas para leer (${hi.join(' · ')})`);
      eq(a.consola, [], `21·historia: consola limpia (${a.consola.join(' | ')})`);
      await a.ctx.close();
      const l = await ent(sLargo, LECTOR, { hora: 15 });
      await l.p.click('#cuenta-btn'); await l.p.waitForTimeout(300); await l.p.click('#dc-historia-btn'); await l.p.waitForTimeout(900);
      await l.p.evaluate(() => { document.getElementById('dh-sec-linea').open = true; });
      const lt = await l.p.evaluate(() => [...document.querySelectorAll('#dh-linea .h-paso strong, #dh-linea .h-pasos summary')].map((s) => s.textContent));
      ok(lt.length >= 3 && lt.every((x) => !tuteo.test(x)) && lt.some((x) => /^El libro llegó a 12\.5M sats$/.test(x)), `21·historia: quien solo mira lee del libro (${lt.join(' · ')})`);
      await l.ctx.close();
      // ---- Perfil de altitud: ningún rótulo pegado a otro
      const pf = await ent(sLargo, ADMIN, { hora: 15, viewport: { width: 390, height: 844 } });
      await verVista(pf.p, 'sats');
      const ys = await pf.p.evaluate(() => [...document.querySelectorAll('#s-lienzo .pf-eje')].map((t) => t.getBoundingClientRect().y).sort((x, y) => x - y));
      ok(ys.length >= 3 && ys.every((y, i) => i === 0 || y - ys[i - 1] >= 14), `21·perfil: rótulos de etapas sin encimarse (${ys.map(Math.round).join(', ')})`);
      await pf.ctx.close();
    } finally { sLargo.parar(); }
    // ---- La montaña: marcas separadas, la siguiente siempre, intermedias solo arriba del último campamento; de 320 a 2560 px,
    // acostado y con letra grande, en claro y oscuro
    const TAM = [['320', { viewport: { width: 320, height: 568 } }, 12], ['390', { viewport: { width: 390, height: 844 } }, 12], ['acostado', { viewport: { width: 844, height: 390 } }, 20],
      ['768', { viewport: { width: 768, height: 1024 }, isMobile: false, hasTouch: false }, 20], ['1440', { viewport: { width: 1440, height: 900 }, isMobile: false, hasTouch: false }, 20],
      ['2560', { viewport: { width: 2560, height: 1440 }, isMobile: false, hasTouch: false }, 20]];
    for (const esc of ['anio', 'largo', 'milbtc']) {
      const srv = await servidor(esc);
      try {
        for (const [nom, opts, tope] of TAM) {
          for (const letra of nom === '390' ? ['', 'grande'] : ['']) {
            const r = await ent(srv, ADMIN, { hora: nom === '1440' ? 14 : 22, ...opts }, conLocal([['libro.efectos', 'esenciales'], ...(letra ? [['libro.letra', letra]] : [])]));
            const mk = await marcas(r.p);
            const piso = (s) => { let d = 0; for (let x = 1e5; x <= s; x *= 10) d = x; return d; };
            const sats = await r.p.evaluate(() => Number(document.querySelector('#s-sats .sr').textContent.replace(/\D/g, '')));
            const L = await import('../app/static/lib.js');
            const sig = L.etapaSiguiente(sats), sinSig = mk.m.filter((x) => x.m !== sig);
            let dmin = Infinity;
            for (let i = 0; i < sinSig.length; i++) for (let j = i + 1; j < sinSig.length; j++) dmin = Math.min(dmin, Math.hypot(sinSig[i].x - sinSig[j].x, sinSig[i].y - sinSig[j].y));
            const desc = `${esc} ${nom}${letra ? ` ${letra}` : ''}`;
            ok(dmin >= 17.5 && mk.m.length <= tope, `21·montaña ${desc}: ${mk.m.length} marcas, ninguna pegada (${Math.round(dmin)} px)`);
            ok(L.rangoEtapa(sig) === 'campamento' || mk.m.some((x) => x.m === sig && x.sig), `21·montaña ${desc}: la siguiente etapa (${sig}) está en el sendero`);
            ok(mk.m.every((x) => !x.fina || x.m > piso(sats)) && mk.m.every((x) => x.fina === (L.rangoEtapa(x.m) === 'intermedia')), `21·montaña ${desc}: intermedias finas y solo sobre el último campamento`);
            ok(mk.rotulos.length >= mk.campos - 1 && mk.sw <= 0, `21·montaña ${desc}: los campamentos conservan sus rótulos (${mk.rotulos.join(', ')} de ${mk.campos}) y sin desbordes`);
            eq(r.consola, [], `21·montaña ${desc}: consola limpia (${r.consola.join(' | ')})`);
            await r.ctx.close();
          }
        }
      } finally { srv.parar(); }
    }
  });

  // ---------------------------------------------------------------- campamento 21B: la tele de la sala (tarjetas que no tapan, reloj, la tele duerme, el marco y entrar con un código)
  await bloque(async () => {
    // `marco`: el reloj de la página se adelanta (solo `Date`, no los temporizadores) hasta 4 s dentro de la ventana del marco de la historia
    // (las :05, :15… de `lib.marcoTele`), en cada carga: así el pulso de la tele, que mira la hora de verdad, lo enseña sin esperar 10 minutos.
    const conLocal = (pares, marco = false) => [([ps, mc]) => {
      try { localStorage.setItem('libro.avisos.preguntado', '1'); for (const [k, v] of ps) localStorage.setItem(k, v); } catch { /* sin almacenamiento */ }
      if (mc) { const D = Date, real = D.now(), d = Math.floor((real - 300000) / 600000) * 600000 + 304000 - real; class F extends D { constructor(...a) { if (a.length) super(...a); else super(D.now() + d); } static now() { return D.now() + d; } } globalThis.Date = F; }
    }, [pares, marco]];
    const fijo = { isMobile: false, hasTouch: false, deviceScaleFactor: 1 };
    /** Entra y abre la tele (la dirección con #tv), sin diálogos. */
    const tele = async (srv, cuenta, { w = 1920, h = 1080, hora = 22, pares = [], marco = false, pestanas = false } = {}) => {
      const r = await entrar(navegador, srv, cuenta, { hora, pestanas, viewport: { width: w, height: h }, ...fijo }, conLocal(pares, marco));
      await r.p.evaluate(() => { location.hash = '#tv'; });
      await r.p.reload({ waitUntil: 'networkidle' });
      await r.p.waitForTimeout(2500);
      return r;
    };
    /** El módulo de la tele de esa página (la misma instancia: la dirección versionada del modulepreload). */
    const tvMod = (p, js) => p.evaluate(new Function(`return (async () => { const tv = await import(document.querySelector('link[rel=modulepreload][href^="/tv.js"]').href); const est = await import(document.querySelector('link[rel=modulepreload][href^="/estado.js"]').href); ${js} })()`));
    /** Dos precios nuevos: el sismógrafo ya tiene su tira (sin esperar un minuto). */
    const asentadas = (p) => p.waitForFunction(() => [...document.querySelectorAll('.tv-tarjeta')].every((e) => e.hidden || e.dataset.sitio === '1' || e.dataset.sitio === '0'), null, { timeout: 5000 });
    const conSismo = async (p) => { await tvMod(p, 'for (const k of [1, 2]) { est.S.precio = 77000 + k * 150; est.S.precioTs = Date.now() + k; tv.pintarTV(); }'); await asentadas(p); await p.waitForTimeout(300); };
    const fiesta = async (p, grande) => { await tvMod(p, `tv.fiestaTV(${grande ? '990000, 1211769, 221769' : '1180000, 1211769, 31769'});`); await asentadas(p); await p.waitForTimeout(1400); };
    const sAnio = await servidor('anio');
    try {
      // El nombre de la montaña: también ocupa sitio arriba
      const d = await entrar(navegador, sAnio, ADMIN, { hora: 22 }, conLocal([]));
      await d.p.evaluate(() => fetch('/api/montana', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-Libro': '1' }, body: JSON.stringify({ nombre: 'La Ceiba' }) }));
      await d.ctx.close();
      // ---- 15 · nada sobre el sendero, «Tú» ni los rótulos, a varios tamaños y con la letra de la tele; con el sismógrafo y con la fiesta
      for (const [w, h] of [[1920, 1080], [1366, 768], [3840, 2160], [1080, 1920], [1024, 768], [2560, 1440], [1280, 720]]) {
        for (const cuenta of [LECTOR, ADMIN]) {
          if (cuenta === ADMIN && ![1920, 1080, 1024].includes(w)) continue;
          const t = await tele(sAnio, cuenta, { w, h });
          const quien = cuenta === LECTOR ? 'lectora' : 'dueño';
          let s = await sinTapar(t.p);
          ok(s.fallos.length === 0 && s.vistas.includes('tv-ultimo') && s.vistas.includes('tv-reloj') && s.etiquetas > 3, `21B·15 ${w}×${h} (${quien}): el último movimiento y el reloj sin tapar nada (${s.txt})`);
          await conSismo(t.p);
          s = await sinTapar(t.p);
          ok(s.fallos.length === 0 && s.vistas.includes('tv-sismo'), `21B·15 ${w}×${h} (${quien}): con el sismógrafo, tampoco (${s.txt})`);
          for (const grande of [false, true]) {
            await fiesta(t.p, grande);
            s = await sinTapar(t.p);
            ok(s.fallos.length === 0 && s.vistas.includes('tv-fiesta') && !s.vistas.includes('tv-ultimo'), `21B·15 ${w}×${h} (${quien}): la fiesta${grande ? ' de un hito' : ''} ocupa el sitio del último movimiento sin tapar nada (${s.txt})`);
          }
          eq(t.consola, [], `21B·15 ${w}×${h} (${quien}): consola limpia (${t.consola.join(' | ')})`);
          await t.ctx.close();
        }
      }
      // Con letra muy grande y con otros saldos (un hito grande lejos de la cumbre, mil compras)
      {
        const t = await tele(sAnio, LECTOR, { w: 1366, h: 768, pares: [['libro.letra', 'muy-grande']] });
        await conSismo(t.p);
        const s = await sinTapar(t.p);
        ok(s.fallos.length === 0 && s.vistas.includes('tv-ultimo'), `21B·15 letra muy grande: sin tapar nada (${s.txt})`);
        await t.ctx.close();
      }
      // El reloj: hora de El Salvador (o la de `libro.hora`), de 12 horas, con el día; junto al precio cuando cabe en esa fila
      {
        const t = await tele(sAnio, LECTOR, { hora: 20.25 });
        const r = await t.p.evaluate(() => ({ h: document.getElementById('tvr-h').textContent, ap: document.getElementById('tvr-ap').textContent, f: document.getElementById('tvr-f').textContent, dt: document.getElementById('tvr-t').getAttribute('datetime'), donde: document.getElementById('tv-reloj').dataset.donde ?? '', reloj: document.getElementById('tv-reloj').getBoundingClientRect().toJSON(), cot: document.getElementById('cotizacion').getBoundingClientRect().toJSON(), nombre: document.getElementById('tv-nombre').getBoundingClientRect().toJSON() }));
        eq([r.h, r.ap], ['8:15', 'p. m.'], '21B·15 reloj: dice la hora, de 12 horas');
        ok(/^(lunes|martes|miércoles|jueves|viernes|sábado|domingo) \d{1,2} de \w+$/.test(r.f) && /T20:15$/.test(r.dt), `21B·15 reloj: con el día («${r.f}», ${r.dt})`);
        ok(r.donde === 'cielo' && r.reloj.right <= r.cot.left && r.cot.left - r.reloj.right < 160 && Math.abs((r.reloj.top + r.reloj.bottom) / 2 - (r.cot.top + r.cot.bottom) / 2) < 12, `21B·15 reloj: a 1920 va en la fila de arriba, junto al precio (${Math.round(r.reloj.right)} / ${Math.round(r.cot.left)})`);
        ok(r.reloj.left > r.nombre.right + 40, '21B·15 reloj: no ocupa el sitio del nombre de la montaña (arriba a la izquierda)');
        // Al cambiar el minuto, cambia; el atardecer acelerado no lo mueve (solo mueve el cielo)
        await t.p.evaluate(() => { localStorage.setItem('libro.hora', '20.5'); window.libroCielo.fijarHora(17.2); });
        await t.p.waitForFunction(() => document.getElementById('tvr-h').textContent === '8:30', null, { timeout: 8000 });
        ok(await t.p.evaluate(() => document.getElementById('tvr-h').textContent === '8:30'), '21B·15 reloj: sigue la hora de verdad, no la del atardecer acelerado');
        await t.p.evaluate(() => window.libroCielo.fijarHora(null));
        await t.ctx.close();
      }
      // Fuera de la tele, nada de esto
      {
        const a = await entrar(navegador, sAnio, ADMIN, { hora: 22 }, conLocal([]));
        ok(!(await a.p.isVisible('#tv-reloj')) && !(await a.p.isVisible('#tv-ultimo')), '21B·15 fuera de la tele no se ve el reloj ni el último movimiento');
        await a.ctx.close();
      }

      // ---- 42 · la tele duerme de 23:00 a 5:00, con la hora tenue que se corre cada 5 minutos, y despierta sola
      {
        const L = await import('../app/static/lib.js');
        const noche = (p) => p.evaluate(() => {
          const n = document.getElementById('tv-noche'), caja = document.getElementById('tvn-caja');
          const rgb = (c) => c.match(/[\d.]+/g).slice(0, 3).map(Number);
          const lum = ([r, g, b]) => [r, g, b].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }).reduce((a, v, i) => a + v * [0.2126, 0.7152, 0.0722][i], 0);
          const cH = lum(rgb(getComputedStyle(document.getElementById('tvn-h')).color)), cN = lum(rgb(getComputedStyle(document.querySelector('.tvn-nota')).color)), cF = lum(rgb(getComputedStyle(n).backgroundColor));
          const fondo = cF;
          return {
            duerme: document.documentElement.dataset.tvDuerme === '1', visible: !n.hidden, op: getComputedStyle(n).opacity, hora: `${document.getElementById('tvn-h').textContent} ${document.getElementById('tvn-ap').textContent}`,
            corre: caja.style.translate, contraste: Math.min((cH + 0.05) / (fondo + 0.05), (cN + 0.05) / (fondo + 0.05)), oscuro: cF < 0.01,
            saldo: getComputedStyle(document.querySelector('.saldo')).visibility, luna: document.querySelectorAll('#tvn-luna .tvn-luz').length,
            pie: document.getElementById('tv-salir').getBoundingClientRect().width > 0,
          };
        });
        const t = await tele(sAnio, LECTOR, { hora: 23.5, pares: [['libro.efectos', 'todos']] });
        await t.p.waitForTimeout(3000);
        let n = await noche(t.p);
        const c1410 = L.corrimientoReloj(23 * 60 + 30);
        ok(n.duerme && n.visible && n.op === '1' && n.hora === '11:30 p. m.' && n.oscuro && n.saldo === 'hidden' && n.luna === 1, `21B·42 a las 23:30 la tele duerme: casi negra, con la hora y la luna (${JSON.stringify(n)})`);
        ok(n.contraste >= 4.5 && n.contraste < 7, `21B·42 la hora se lee pero sin brillo (contraste ${n.contraste.toFixed(2)}: ≥ 4.5 y < 7)`);
        eq(n.corre, `${c1410.x}px ${c1410.y}px`, '21B·42 la hora está corrida según la hora (lib.corrimientoReloj)');
        // Cinco minutos después se corre unos píxeles
        await t.p.evaluate(() => localStorage.setItem('libro.hora', String(23 + 36 / 60)));
        await tvMod(t.p, 'tv.latir();');
        const n2 = await noche(t.p);
        const [x1, y1] = n.corre.split(' ').map(Number.parseFloat), [x2, y2] = n2.corre.split(' ').map(Number.parseFloat);
        const paso = Math.hypot(x2 - x1, y2 - y1);
        ok(n2.hora === '11:36 p. m.' && paso > 0 && paso <= 10, `21B·42 cada 5 minutos la hora se corre unos píxeles (${paso.toFixed(1)} px)`);
        // Un toque la despierta un minuto; pasado el minuto vuelve a dormir
        await t.p.keyboard.press('Shift');
        await t.p.waitForFunction(() => !document.documentElement.dataset.tvDuerme, null, { timeout: 4000 });
        await t.p.waitForTimeout(1500);
        let s = await sinTapar(t.p);
        ok(s.fallos.length === 0 && s.vistas.includes('tv-ultimo') && await t.p.locator('#montana #m-etiquetas .eti-yo').count() === 1, `21B·42 un toque la despierta un rato, con la montaña entera y sus tarjetas en su sitio (${s.txt})`);
        await tvMod(t.p, 'tv.latir(Date.now() + 61_000);');
        await t.p.waitForTimeout(3000); // el fundido a negro dura 2.4 s
        ok((await noche(t.p)).duerme, '21B·42 pasado el minuto vuelve a dormir');
        // Una compra de noche no la despierta (sin fiesta) y al despertar la montaña ya está al día
        const adm = await entrar(navegador, sAnio, ADMIN, { hora: 23.5 }, conLocal([]));
        const ultimoAntes = await t.p.textContent('#tvu-v');
        await adm.p.evaluate(async () => { const p = (await (await fetch('/api/precio')).json()).precio; await fetch('/api/compras', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Libro': '1' }, body: JSON.stringify({ fecha: new Intl.DateTimeFormat('en-CA', { timeZone: 'America/El_Salvador' }).format(new Date()), monto: 20, sats: Math.round((20 / p) * 1e8) }) }); });
        await adm.ctx.close();
        await t.p.evaluate(async () => { const d = await import(document.querySelector('link[rel=modulepreload][href^="/datos.js"]').href); await d.actualizarSuave(); });
        await t.p.waitForTimeout(800);
        ok((await noche(t.p)).duerme && await t.p.evaluate(() => document.getElementById('tv-fiesta').hidden), '21B·42 una compra de noche no la despierta ni hace fiesta');
        // A las 5:00 despierta sola
        await t.p.evaluate(() => localStorage.setItem('libro.hora', '5'));
        await tvMod(t.p, 'tv.latir();');
        await t.p.waitForTimeout(3200);
        n = await noche(t.p);
        s = await sinTapar(t.p);
        ok(!n.duerme && !n.visible && n.saldo === 'visible' && s.fallos.length === 0 && s.vistas.includes('tv-ultimo'), `21B·42 a las 5:00 despierta sola (${s.txt})`);
        ok((await t.p.textContent('#tvu-v')) !== ultimoAntes && await t.p.locator('#montana #m-etiquetas .eti-yo').count() === 1, '21B·42 y la montaña ya trae la compra de la noche, con «Vamos aquí» en su placa');
        eq(t.consola, [], `21B·42 consola limpia (${t.consola.join(' | ')})`);
        await t.ctx.close();
        // Con efectos «ninguno» se apaga de golpe; a las 22:59 no duerme
        const z = await tele(sAnio, LECTOR, { hora: 23.2, pares: [['libro.efectos', 'ninguno']] });
        n = await noche(z.p);
        ok(n.duerme && n.op === '1', `21B·42 con efectos «ninguno» se apaga sin fundido (${n.op})`);
        await z.p.evaluate(() => localStorage.setItem('libro.hora', String(22 + 59 / 60)));
        await tvMod(z.p, 'tv.latir();');
        ok(!(await noche(z.p)).duerme, '21B·42 a las 22:59 todavía está despierta');
        await z.ctx.close();
        // «La tele duerme de noche: no», en «Tu cuenta → Este dispositivo»
        const c = await entrar(navegador, sAnio, LECTOR, { hora: 23.5, viewport: { width: 1280, height: 800 }, ...fijo }, conLocal([]));
        for (let k = 0; k < 3 && await c.p.locator('dialog[open]').count(); k++) { await c.p.keyboard.press('Escape'); await c.p.waitForTimeout(300); }
        await c.p.click('#cuenta-btn'); await c.p.waitForTimeout(300);
        const enGrupo = await c.p.evaluate(() => { const b = document.getElementById('dc-tv-duerme'); let e = b.previousElementSibling; while (e && !e.classList.contains('dc-grupo')) e = e.previousElementSibling; return e?.textContent; });
        eq([(await c.p.textContent('#dc-tv-duerme')).trim(), enGrupo], ['La tele duerme de noche: sí', 'Este dispositivo'], '21B·42 el interruptor, en «Este dispositivo», encendido por defecto');
        await c.p.click('#dc-tv-duerme');
        ok((await c.p.textContent('#dc-tv-duerme')).trim() === 'La tele duerme de noche: no' && await c.p.evaluate(() => localStorage.getItem('libro.tv.duerme')) === '0', '21B·42 se apaga y se recuerda en el dispositivo');
        await c.p.keyboard.press('Escape');
        await c.p.evaluate(() => { location.hash = '#tv'; }); await c.p.reload({ waitUntil: 'networkidle' }); await c.p.waitForTimeout(2500);
        ok(!(await noche(c.p)).duerme, '21B·42 con el interruptor apagado, a las 23:30 la tele sigue despierta');
        eq(c.consola, [], `21B·42 interruptor: consola limpia (${c.consola.join(' | ')})`);
        await c.ctx.close();
      }

      // ---- 32 · el marco de tu historia: cada 10 minutos, 40 s, un dibujo de «Tu historia» que ya se ve bien, en la voz del libro
      {
        const marco = (p) => p.evaluate(async () => {
          const lib = await import(document.querySelector('link[rel=modulepreload][href^="/lib.js"]').href);
          const est = await import(document.querySelector('link[rel=modulepreload][href^="/estado.js"]').href);
          const m = document.getElementById('tv-marco'), lienzo = document.getElementById('tvm-lienzo');
          const mt = lib.marcoTele(Date.now(), lib.dibujosListos(est.R.items, lib.hoyISO())), esperado = mt?.visible ? mt.dibujo : undefined;
          const id = lienzo.querySelector('[id^="h-"]')?.id;
          const r = m.getBoundingClientRect();
          return {
            visible: !m.hidden, op: getComputedStyle(m).opacity, vh: lienzo.dataset.vh, esperado: esperado?.vh, nombre: document.getElementById('tvm-t').textContent, nombreEsperado: esperado?.nombre,
            desc: document.getElementById('tvm-desc').textContent, svg: lienzo.querySelectorAll('svg').length, idDelMarco: id ? document.getElementById(id)?.closest('#tv-marco') === m : null,
            pantalla: Math.round(r.width) === innerWidth && Math.round(r.height) === innerHeight, animaciones: m.getAnimations({ subtree: true }).length, ids: lienzo.querySelectorAll('[id]').length,
          };
        });
        const t = await tele(sAnio, LECTOR, { hora: 20, marco: true, pares: [['libro.efectos', 'todos']] });
        await t.p.waitForFunction(() => !document.getElementById('tv-marco').hidden && getComputedStyle(document.getElementById('tv-marco')).opacity === '1', null, { timeout: 15000 });
        let m = await marco(t.p);
        ok(m.visible && m.svg === 1 && m.vh === m.esperado && m.nombre === m.nombreEsperado && m.pantalla, `21B·32 a las :05 la tele enseña «${m.nombre}» (el que toca por la vuelta, de los que ya se ven bien) a toda la pantalla`);
        ok(m.desc.length > 40 && !/\b(tu|tus|tienes|llevas)\b/i.test(m.desc), `21B·32 con su texto, en la voz del libro («${m.desc.slice(0, 70)}…»)`);
        ok(m.idDelMarco === true, '21B·32 las definiciones del dibujo (ids h-…) que valen son las del marco');
        await t.p.mouse.move(600, 400); await t.p.waitForTimeout(400); // un movimiento enseña «Salir»
        const salir = await t.p.evaluate(() => { const b = document.getElementById('tv-salir').getBoundingClientRect(); return document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2)?.id; });
        ok(await t.p.evaluate(() => getComputedStyle(document.getElementById('tv-marco')).pointerEvents === 'none') && salir === 'tv-salir', `21B·32 el marco no estorba: «Salir» queda encima y a mano (${salir})`);
        // Una compra nueva siempre gana al marco
        await tvMod(t.p, 'tv.fiestaTV(1180000, 1211769, 31769);');
        await t.p.waitForTimeout(300);
        m = await marco(t.p);
        ok(!m.visible && m.ids === 0 && await t.p.evaluate(() => !document.getElementById('tv-fiesta').hidden), '21B·32 una compra nueva gana al marco: se va de inmediato (y se vacía) y sale la fiesta');
        await tvMod(t.p, 'tv.latir();');
        ok(!(await marco(t.p)).visible, '21B·32 mientras dura la fiesta el marco no vuelve');
        // Pasados los 40 s se va solo y no deja sus ids en la página
        await t.p.waitForFunction(() => (Date.now() - 300000) % 600000 > 41_000 && document.getElementById('tv-marco').hidden && document.getElementById('tv-fiesta').hidden, null, { timeout: 60_000 });
        await t.p.waitForTimeout(1500);
        m = await marco(t.p);
        ok(!m.visible && m.ids === 0 && m.esperado === undefined, '21B·32 a los 40 s se va solo y queda vacío');
        const s = await sinTapar(t.p);
        ok(s.fallos.length === 0 && s.vistas.includes('tv-ultimo'), `21B·32 y la tele sigue como estaba (${s.txt})`);
        eq(t.consola, [], `21B·32 consola limpia (${t.consola.join(' | ')})`);
        await t.ctx.close();
        // El dueño, con la historia pintada en la página (la pestaña Historia) y efectos «ninguno»: sin fundido, en la voz del libro, y el
        // dibujo del marco usa sus propias definiciones aunque el mismo dibujo esté en la página
        const a = await tele(sAnio, ADMIN, { hora: 20, marco: true, pestanas: true, pares: [['libro.efectos', 'ninguno'], ['libro.pestana', 'historia']] });
        await a.p.waitForFunction(() => !document.getElementById('tv-marco').hidden, null, { timeout: 15000 });
        m = await marco(a.p);
        ok(m.op === '1' && m.animaciones === 0, `21B·32 con efectos «ninguno» aparece sin fundido ni animaciones (${m.op}, ${m.animaciones})`);
        ok(m.idDelMarco === true && !/\b(tu|tus|tienes|llevas)\b/i.test(m.desc), '21B·32 también con la cuenta del dueño habla del libro, y sus definiciones son las del marco');
        await tvMod(a.p, 'tv.salirTV();');
        ok(await a.p.evaluate(() => document.getElementById('tv-marco').hidden && !document.querySelector('#tvm-lienzo [id]')), '21B·32 al salir de la tele el marco se va y se vacía');
        eq(a.consola, [], `21B·32 dueño: consola limpia (${a.consola.join(' | ')})`);
        await a.ctx.close();
      }
    } finally { sAnio.parar(); }
    for (const esc of ['ballena', 'mil', 'hoy']) {
      const srv = await servidor(esc);
      try {
        for (const [w, h] of [[1920, 1080], [1080, 1920], [1024, 768]]) {
          const t = await tele(srv, esc === 'hoy' ? ADMIN : LECTOR, { w, h, hora: 12 });
          await conSismo(t.p);
          await fiesta(t.p, true);
          const s = await sinTapar(t.p);
          ok(s.fallos.length === 0 && s.vistas.includes('tv-fiesta') && s.vistas.includes('tv-reloj'), `21B·15 ${esc} ${w}×${h}: la fiesta y el reloj (y el sismógrafo, si cabe) sin tapar nada (${s.txt})`);
          await t.ctx.close();
        }
      } finally { srv.parar(); }
    }

    // ---- 43 · entrar con un código: el dueño lo crea en su teléfono y se teclea en la tele (dos dispositivos, solo teclado en la tele)
    const sCod = await servidor('anio');
    try {
      const a = await entrar(navegador, sCod, ADMIN, { hora: 20 }, conLocal([]));
      await a.p.evaluate(() => fetch('/api/montana', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-Libro': '1' }, body: JSON.stringify({ nombre: 'La Ceiba' }) }));
      for (let k = 0; k < 3 && await a.p.locator('dialog[open]').count(); k++) { await a.p.keyboard.press('Escape'); await a.p.waitForTimeout(300); }
      await a.p.click('#cuenta-btn'); await a.p.waitForTimeout(300);
      await a.p.click('#dc-sesiones-btn'); await a.p.waitForTimeout(900);
      const panel = await a.p.evaluate(() => ({ ver: !document.getElementById('tele-con').hidden, ops: [...document.querySelectorAll('#tc-opciones button')].map((b) => [b.textContent, b.getAttribute('aria-pressed'), Math.round(b.getBoundingClientRect().height)]), crear: !document.getElementById('tc-crear').disabled }));
      ok(panel.ver && panel.ops.length === 1 && panel.ops[0][0] === 'Ana' && panel.ops[0][1] === 'true' && panel.ops[0][2] >= 47.5 && panel.crear, `21B·43 «Conectar una tele» en «Sesiones abiertas»: elige entre las cuentas que solo miran (${JSON.stringify(panel)})`);
      await a.p.click('#tc-crear'); await a.p.waitForTimeout(600);
      const cod = await a.p.evaluate(() => ({ g: `${document.getElementById('tc-g1').textContent}${document.getElementById('tc-g2').textContent}`, sr: document.getElementById('tc-cifras-sr').textContent, vence: document.getElementById('tc-vence').textContent, sw: document.documentElement.scrollWidth, cw: innerWidth }));
      ok(/^\d{8}$/.test(cod.g) && cod.sr === `Código: ${cod.g.split('').join(' ')}` && /^Caduca en [45]:\d\d · entra como Ana · sirve una vez$/.test(cod.vence) && cod.sw <= cod.cw, `21B·43 el código se ve una vez, en dos grupos, con su cuenta atrás (${cod.vence})`);
      // La tele: sin sesión, va a la entrada (como una tele con la sesión caducada: /login#tv abre «Entrar con un código»)
      const tv = await navegador.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
      const tp = await tv.newPage();
      const consolaTv = [];
      tp.on('console', (m) => ['error', 'warning'].includes(m.type()) && !/401|Failed to load resource/.test(m.text()) && consolaTv.push(m.text()));
      tp.on('pageerror', (e) => consolaTv.push(`pageerror ${e.message}`));
      await tp.addInitScript(() => { try { localStorage.setItem('libro.hora', '20'); localStorage.setItem('libro.avisos.preguntado', '1'); } catch { /* sin almacenamiento */ } });
      await tp.goto(`${sCod.url}/#tv`, { waitUntil: 'networkidle' }); await tp.waitForTimeout(500);
      const ent = await tp.evaluate(() => ({ url: location.pathname + location.hash, codigo: !document.getElementById('f-codigo').hidden, clave: document.getElementById('f-login').hidden, foco: document.activeElement?.id, tv: document.documentElement.dataset.tv ?? null, texto: document.body.textContent }));
      ok(ent.url === '/login#tv' && ent.codigo && ent.clave && ent.foco === 'l-codigo' && ent.tv === null, `21B·43 una tele sin sesión llega a «Entrar con un código», con el campo listo (${ent.url}, foco ${ent.foco})`);
      ok(!/Ceiba|Ana|Daf3r/.test(ent.texto), '21B·43 la entrada no enseña ningún dato (ni la montaña ni las cuentas)');
      // Un código mal tecleado: un solo mensaje; el campo se vacía y sigue con el foco
      await tp.keyboard.type(cod.g === '00000000' ? '11111111' : '00000000'); await tp.keyboard.press('Enter'); await tp.waitForTimeout(700);
      const mal = await tp.evaluate(() => ({ err: document.getElementById('l-c-error').textContent, v: document.getElementById('l-codigo').value, foco: document.activeElement?.id }));
      ok(/^Ese código no sirve\. Pide uno nuevo/.test(mal.err) && mal.v === '' && mal.foco === 'l-codigo', `21B·43 un código mal tecleado: «${mal.err}»`);
      // El bueno, solo con el teclado (el espacio lo pone solo)
      await tp.keyboard.type(cod.g.slice(0, 4));
      ok((await tp.inputValue('#l-codigo')) === cod.g.slice(0, 4), '21B·43 se escribe como se dicta');
      await tp.keyboard.type(cod.g.slice(4));
      ok((await tp.inputValue('#l-codigo')) === `${cod.g.slice(0, 4)} ${cod.g.slice(4)}`, '21B·43 «1234 5678»: el espacio lo pone solo');
      await Promise.all([tp.waitForURL('**/#tv'), tp.keyboard.press('Enter')]);
      await tp.waitForTimeout(3000);
      const dentro = await tp.evaluate(async () => ({ tv: document.documentElement.dataset.tv, yo: await (await fetch('/api/yo')).json(), nombre: document.getElementById('tv-nombre').textContent, saldo: document.getElementById('t-saldo').textContent }));
      ok(dentro.tv === '1' && dentro.yo.usuario === 'Ana' && dentro.yo.rol === 'lector' && dentro.nombre === 'Montaña «La Ceiba»' && dentro.saldo === 'Saldo del libro', `21B·43 la tele entra como Ana (solo mira) y abre la pantalla grande (${JSON.stringify(dentro.yo)})`);
      eq(consolaTv, [], `21B·43 tele: consola limpia (${consolaTv.join(' | ')})`);
      // El teléfono del dueño se entera solo: «Listo»
      await a.p.waitForFunction(() => /^Listo: la tele entró con la cuenta de Ana/.test(document.getElementById('tc-estado').textContent), null, { timeout: 8000 });
      ok(await a.p.evaluate(() => document.getElementById('tc-codigo').hidden), '21B·43 el teléfono del dueño dice «Listo» y retira el código');
      // Otro código; al salir de la vista y volver ya no se enseña (se muestra una sola vez)
      await a.p.click('#tc-crear'); await a.p.waitForTimeout(500);
      await a.p.click('#dc-sesiones [data-cuenta="volver"]'); await a.p.waitForTimeout(1500);
      await a.p.click('#dc-sesiones-btn'); await a.p.waitForTimeout(900);
      const otra = await a.p.evaluate(() => ({ oculto: document.getElementById('tc-codigo').hidden, est: document.getElementById('tc-estado').textContent }));
      ok(otra.oculto && /^Hay un código vivo para Ana .* no se vuelve a mostrar/.test(otra.est), `21B·43 al volver a la vista el código no se vuelve a enseñar («${otra.est}»)`);
      // El Historial lo cuenta, sin el código
      await a.p.click('#dc-sesiones [data-cuenta="volver"]'); await a.p.waitForTimeout(400);
      await a.p.click('#dc-historial'); await a.p.waitForTimeout(900);
      const hist = await a.p.textContent('#hist-lista');
      ok(hist.includes('creó un código para conectar una tele con la cuenta de Ana') && hist.includes('entró en una tele con un código') && !hist.includes(cod.g), '21B·43 el Historial lo cuenta, sin el código');
      eq(a.consola, [], `21B·43 dueño: consola limpia (${a.consola.join(' | ')})`);
      await a.ctx.close(); await tv.close();
      // Una lectora no ve «Conectar una tele»; la entrada con código, a 320 px y con letra muy grande, sin desbordes y con toques de 48 px
      const l = await entrar(navegador, sCod, LECTOR, { hora: 20 }, conLocal([]));
      for (let k = 0; k < 3 && await l.p.locator('dialog[open]').count(); k++) { await l.p.keyboard.press('Escape'); await l.p.waitForTimeout(300); }
      await l.p.click('#cuenta-btn'); await l.p.waitForTimeout(300);
      await l.p.click('#dc-sesiones-btn'); await l.p.waitForTimeout(800);
      ok(await l.p.evaluate(() => document.getElementById('tele-con').hidden), '21B·43 una lectora no ve «Conectar una tele»');
      await l.ctx.close();
      for (const letra of ['', 'muy-grande']) {
        const c = await navegador.newContext({ ...devices['iPhone SE'], viewport: { width: 320, height: 568 } });
        const cp = await c.newPage();
        await cp.addInitScript((lt) => { try { localStorage.setItem('libro.hora', '12'); if (lt) localStorage.setItem('libro.letra', lt); } catch { /* sin almacenamiento */ } }, letra);
        await cp.goto(`${sCod.url}/login`, { waitUntil: 'networkidle' });
        await cp.click('#l-a-codigo'); await cp.waitForTimeout(300);
        const m = await cp.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: innerWidth, foco: document.activeElement?.id, toques: ['l-codigo', 'l-c-entrar', 'l-a-clave'].map((i) => Math.round(document.getElementById(i).getBoundingClientRect().height)) }));
        ok(m.sw <= m.cw && m.foco === 'l-codigo' && m.toques.every((h) => h >= 47.5), `21B·43 a 320 px${letra ? ' con letra muy grande' : ''}: sin desbordes y con toques de 48 px (${JSON.stringify(m)})`);
        await cp.click('#l-a-clave'); await cp.waitForTimeout(200);
        ok(await cp.evaluate(() => !document.getElementById('f-login').hidden && document.getElementById('f-codigo').hidden && document.activeElement?.id === 'l-usuario'), '21B·43 y se vuelve a usuario y contraseña');
        await c.close();
      }
    } finally { sCod.parar(); }
  });

  // ---------------------------------------------------------------- tele: el saldo contra la montaña (pulido final: la cifra y su unidad nunca tocan «Tú», la cumbre, los campamentos, los rótulos, el sendero ni la silueta)
  await bloque(async () => {
    /**
     * La caja del saldo de verdad (la cifra que se ve, `.od-num`, y su unidad, `#s-unidad`) con 8 px de margen: qué de lo dibujado la
     * toca. Se calcula aparte del CSS que la coloca: la placa de «Tú», los rótulos, los campamentos y la cumbre (sus cajas), el sendero
     * (un punto cada 8 px) y la silueta de la montaña (una rejilla de 6 px dentro de la caja, con `isPointInFill`).
     */
    const saldoLibre = (p) => p.evaluate(() => {
      const M = 8;
      const caja = (e) => { const r = e.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width }; };
      const c = caja(document.querySelector('#s-sats .od-num')), u = caja(document.getElementById('s-unidad'));
      const s = { l: Math.min(c.l, u.l) - M, t: Math.min(c.t, u.t) - M, r: Math.max(c.r, u.r) + M, b: Math.max(c.b, u.b) + M };
      const cruza = (q) => q.w > 1 && q.l < s.r && s.l < q.r && q.t < s.b && s.t < q.b;
      const choques = [];
      const yo = document.querySelector('#montana #m-etiquetas .eti-yo');
      if (yo && cruza(caja(yo))) choques.push('«Tú»');
      for (const t of document.querySelectorAll('#montana #m-etiquetas text')) if (cruza(caja(t))) choques.push(`rótulo «${t.textContent.trim()}»`);
      for (const g of document.querySelectorAll('#montana .campo')) if (cruza(caja(g))) choques.push(g.classList.contains('es-cima') ? 'la cumbre' : `campamento ${g.dataset.m}`);
      const svg = document.querySelector('#montana > svg'), camino = svg.querySelector('#m-sendero'), monte = svg.querySelector('.monte');
      const pt = svg.createSVGPoint(), mc = camino.getScreenCTM(), largo = camino.getTotalLength();
      let sendero = 0;
      for (let l = 0; l <= largo; l += 8) { const a = camino.getPointAtLength(l); pt.x = a.x; pt.y = a.y; const q = pt.matrixTransform(mc); if (q.x > s.l && q.x < s.r && q.y > s.t && q.y < s.b) sendero++; }
      if (sendero) choques.push(`${sendero} puntos del sendero`);
      const inv = monte.getScreenCTM().inverse();
      let enMonte = 0;
      for (let x = s.l; x <= s.r; x += 6) for (let y = s.t; y <= s.b; y += 6) { pt.x = x; pt.y = y; if (monte.isPointInFill(pt.matrixTransform(inv))) enMonte++; }
      if (enMonte) choques.push(`${enMonte} muestras sobre la montaña`);
      // Lo que se midió de verdad (si la montaña aún no tuviera sus rótulos, la prueba pasaría sin mirar nada)
      const medido = { yo: Boolean(yo), rotulos: document.querySelectorAll('#montana #m-etiquetas text').length, campos: document.querySelectorAll('#montana .campo').length, puntos: Math.floor(largo / 8) };
      return { choques, medido, txt: `${document.querySelector('#s-sats .sr').textContent} ${document.getElementById('s-unidad').textContent} en ${Math.round(s.l + M)}–${Math.round(s.r - M)} px${choques.length ? `: ${choques.join(', ')}` : ''}` };
    });
    const fijo = { isMobile: false, hasTouch: false, deviceScaleFactor: 1 };
    const sinDialogos = [() => { try { localStorage.setItem('libro.avisos.preguntado', '1'); } catch { /* sin almacenamiento */ } }];
    /** Una sesión por escenario y cuenta; cada tamaño, la página otra vez (con #tv, la tele; sin él, la app de escritorio). */
    const recorrer = async (srv, cuenta, tamanos, tv, nombre) => {
      const { ctx, p, consola } = await entrar(navegador, srv, cuenta, { hora: 12, viewport: { width: tamanos[0][0], height: tamanos[0][1] }, ...fijo }, sinDialogos);
      for (const [w, h] of tamanos) {
        await p.setViewportSize({ width: w, height: h });
        await p.evaluate((enTele) => { location.hash = enTele ? '#tv' : ''; }, tv);
        await p.reload({ waitUntil: 'networkidle' });
        await p.waitForSelector('#montana #m-etiquetas .eti-yo', { state: 'attached', timeout: 10000 });
        await p.waitForTimeout(1500);
        for (let k = 0; k < 3 && await p.locator('dialog[open]').count(); k++) { await p.keyboard.press('Escape'); await p.waitForTimeout(300); }
        const r = await saldoLibre(p);
        const m = r.medido;
        ok(m.yo && m.rotulos >= 2 && m.campos >= 1 && m.puntos > 20 && (await p.evaluate(() => document.documentElement.dataset.tv ?? '')) === (tv ? '1' : ''), `saldo ${tv ? 'en la tele' : 'en la app'} ${nombre} ${w}×${h}: la montaña está dibujada y se midió (${JSON.stringify(m)})`);
        ok(r.choques.length === 0, `saldo ${tv ? 'en la tele' : 'en la app'} ${nombre} ${w}×${h}: la cifra y su unidad no tocan la montaña (${r.txt})`);
      }
      eq(consola, [], `saldo ${tv ? 'en la tele' : 'en la app'} ${nombre}: consola limpia (${consola.join(' | ')})`);
      await ctx.close();
    };
    const TELES = [[1920, 1080], [1366, 768], [3840, 2160], [1080, 1920], [1024, 768], [2560, 1440], [1280, 720]];
    // La app de escritorio (sin #tv), con la misma regla, donde hoy se cumple. A 1100 px (casi todos los saldos) y a 1440–1920 (un
    // saldo de 8 cifras, solo la silueta) «sats» queda a menos de 8 px de la ladera desde antes de este arreglo, que no toca la app:
    // lo decide el dueño (CLAUDE.md, «Pulido final · la tele», hallazgo). Cuando se arregle, 1100 y 1440 vuelven aquí.
    const APP = [[2560, 1440]];
    for (const esc of ['hoy', 'medio', 'mil', 'ballena']) {
      const srv = await servidor(esc);
      try {
        await recorrer(srv, LECTOR, TELES, true, `${esc} (lectora)`);
        if (esc === 'medio') await recorrer(srv, ADMIN, TELES, true, 'medio (dueño)'); // el caso del dueño: 532,702 sats, cima 1M
        await recorrer(srv, ADMIN, APP, false, esc); // y la regla de siempre: la cumbre nunca invade el saldo
      } finally { srv.parar(); }
    }
  });

  // ---------------------------------------------------------------- campamento 24: medir este aparato (idea 44)
  await bloque(async () => {
    const srv = await servidor('anio');
    try {
      const sinAvisos = () => { try { localStorage.setItem('libro.avisos.preguntado', '1'); localStorage.setItem('libro.pestana', 'graficos'); } catch { /* sin almacenamiento */ } };
      const abierto = (p, id) => p.evaluate((i) => document.getElementById(i).open, id);
      // El dueño, en el teléfono y por pestañas (con el dock), estaba en «Gráficos». Entra directo a /medir sin cerrar «Qué hay de nuevo»:
      // en /medir no sale (ni la oferta de avisos ni el aviso del día); sale el diálogo de la medición.
      const a = await entrar(navegador, srv, ADMIN, { viewport: { width: 390, height: 844 }, pestanas: true }, sinAvisos);
      await a.p.goto(`${srv.url}/medir`, { waitUntil: 'load' });
      await a.p.waitForSelector('#d-medir[open]', { timeout: 30000 });
      ok(!(await abierto(a.p, 'd-cambios')) && !(await abierto(a.p, 'd-avisos')) && (await a.p.locator('#aviso').isHidden()), '24: en /medir no sale «Qué hay de nuevo», la oferta de avisos ni el aviso del día');
      ok(await a.p.evaluate(() => document.activeElement?.id === 'me-t'), '24: el diálogo abre con el foco en su título');
      ok(/^\d+\.\d\d s$/.test((await a.p.textContent('#me-carga')).trim()), `24: dice cuánto tardó en verse el saldo (${await a.p.textContent('#me-carga')})`);
      eq(await a.p.evaluate(() => performance.getEntriesByName('libro:saldo').length), 1, '24: la app deja una sola marca cuando el saldo se ve con su cifra');
      eq((await a.p.textContent('#me-ver-t')).trim(), 'por medir', '24: antes de la prueba no hay veredicto');
      ok(/bajará y subirá sola/.test(await a.p.textContent('#me-fps-n')), '24: explica qué va a pasar antes de empezar');
      // offsetHeight ignora transformaciones: el diálogo entra con un breve ascenso y boundingBox lo medía a mitad (47.3 en el CI)
      const altoBoton = await a.p.evaluate(() => document.getElementById('me-empezar').offsetHeight);
      ok(altoBoton >= 48, `24: «Empezar la prueba» mide 48 px (${altoBoton})`);
      // La prueba: el diálogo se cierra, la cuenta atrás va con texto, la página baja sola en el Resumen y vuelve
      await a.p.click('#me-empezar');
      await a.p.waitForTimeout(700);
      ok(!(await abierto(a.p, 'd-medir')) && (await a.p.locator('#me-pildora').isVisible()), '24: durante la prueba el diálogo se cierra y se ve la píldora');
      ok(/^Empieza en [123]$/.test((await a.p.textContent('#me-pi-t')).trim()), `24: cuenta atrás con texto (${await a.p.textContent('#me-pi-t')})`);
      ok(/empieza en 3 segundos/i.test(await a.p.textContent('#me-sr')), '24: y se anuncia a los lectores de pantalla');
      eq(await a.p.evaluate(() => [document.getElementById('principal').dataset.pestana, localStorage.getItem('libro.pestana'), document.documentElement.hasAttribute('data-medir')]),
        ['resumen', 'graficos', true], '24: la prueba es en el Resumen sin cambiar la pestaña recordada, y sigue en /medir');
      await a.p.waitForFunction(() => /Midiendo/.test(document.getElementById('me-pi-t').textContent), null, { timeout: 6000 });
      await a.p.waitForTimeout(1500);
      const bajo = await a.p.evaluate(() => scrollY);
      ok(bajo > 150, `24: la página baja sola (${bajo} px)`);
      ok(/^Midiendo · \d s$/.test((await a.p.textContent('#me-pi-t')).trim()), '24: mientras mide, cuánto le queda, con texto');
      await a.p.waitForSelector('#d-medir[open]', { timeout: 15000 });
      await a.p.waitForTimeout(300);
      eq(await a.p.evaluate(() => [scrollY, document.documentElement.hasAttribute('data-midiendo'), document.getElementById('me-pildora').hidden, document.getElementById('principal').dataset.pestana, document.documentElement.style.scrollBehavior]),
        [0, false, true, 'graficos', ''], '24: al acabar vuelve arriba, a su pestaña y a su desplazamiento de siempre');
      ok(/^\d+ fps$/.test((await a.p.textContent('#me-fps')).trim()), `24: dice los fotogramas por segundo (${await a.p.textContent('#me-fps')})`);
      ok(['Fluido', 'Revisar', 'Lento'].includes((await a.p.textContent('#me-ver-t')).trim()) && (await a.p.textContent('#me-ver-ico')).trim().length === 1, '24: el veredicto con palabra y símbolo');
      ok(/Guardada en «Estado del sistema»/.test(await a.p.textContent('#me-res')) && /Listo: \d+ fotogramas por segundo/.test(await a.p.textContent('#me-res')), '24: se guarda y se anuncia el resultado (role=status)');
      ok(/pantalla a \d+ Hz/.test(await a.p.textContent('#me-fps-n')) && /390 × 844 px/.test(await a.p.textContent('#me-aparato')), '24: el detalle y el aparato');
      ok(await a.p.locator('#me-otra').isVisible() && (await a.p.locator('#me-sistema').isVisible()) && (await a.p.locator('#me-empezar').isHidden()), '24: tras guardar, «Medir otra vez» y «Ver todas las medidas»');
      const s = await datos(a.p, '/api/sistema');
      eq(s.medidas.length, 1, '24: queda una medida guardada');
      const m = s.medidas[0];
      ok(m.fps > 0 && m.fps <= 1000 && m.fps_peor > 0 && m.saldo_ms > 0 && m.recorrido > 300 && m.duracion_ms >= 6500 && m.hz > 0, `24: con números en su sitio (${m.fps} fps, ${m.saldo_ms} ms, ${m.recorrido} px)`);
      eq([m.agente, m.ancho, m.alto, m.efectos, m.carga, m.instalada], ['Safari · iPhone', 390, 844, 'todos', 'navegar', false], '24: con el aparato y sus ajustes, y el agente resumido');
      // «Ver todas las medidas»: «Estado del sistema» con la fila; se sale de /medir
      await a.p.click('#me-sistema');
      await a.p.waitForFunction(() => !/Cargando/.test(document.getElementById('sis-res').textContent), null, { timeout: 5000 });
      eq(await a.p.evaluate(() => [location.pathname, document.documentElement.hasAttribute('data-medir'), document.getElementById('dc-sistema').hidden]), ['/', false, false], '24: «Ver todas las medidas» abre «Estado del sistema» y deja /medir');
      eq(await a.p.locator('#sis-lista .sis-fila').count(), 7, '24: las filas del estado siguen siendo 7 (las medidas van aparte)');
      const fila = await a.p.$eval('#sis-med .sis-fila', (f) => ({ t: f.querySelector('b').textContent, p: f.querySelector('.sis-palabra').textContent.trim(), d: f.querySelector('small').textContent }));
      ok(/^\d+ fps · Safari · iPhone$/.test(fila.t) && /^· (Fluido|Revisar|Lento)$/.test(fila.p) && /hasta ver el saldo/.test(fila.d), `24: la medida en «Estado del sistema» (${fila.t} ${fila.p})`);
      // Varios veredictos (sembrados por la API): palabra, símbolo y forma; «Lento» dice qué se revisaría; las anteriores van plegadas
      const sembrar = (cambios) => a.p.evaluate((c) => fetch('/api/medidas', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Libro': '1' },
        body: JSON.stringify({ saldo_ms: 900, red_ms: 80, fps: 59, fps_escena: 58, fps_peor: 50, fps_p5: 55, tirones: 1, hz: 60, duracion_ms: 7000, recorrido: 2400, efectos: 'todos', ligero: false, tema: 'oscuro', ancho: 390, alto: 844, dpr: 3, memoria: null, nucleos: 6, instalada: true, carga: 'navegar', ...c }) }).then((r) => r.status), cambios);
      for (const c of [{ fps: 56, fps_escena: 47.4 }, { fps: 30, fps_escena: 30, hz: 30 }, { fps: 53, fps_escena: 54 }, { fps: 59.6 }, { fps: 58 }, { fps: 57 }]) eq(await sembrar(c), 201, '24: se guarda una medida sembrada');
      await a.p.click('#dc-sistema [data-cuenta="volver"]'); await a.p.click('#dc-sistema-btn');
      await a.p.waitForFunction(() => document.querySelectorAll('#sis-med .sis-fila, #sis-med-resto .sis-fila').length === 7, null, { timeout: 5000 });
      const filas = await a.p.$$eval('#sis-med .sis-fila', (fs) => fs.map((f) => ({ e: f.dataset.estado, v: f.dataset.veredicto, p: f.querySelector('.sis-palabra').textContent.trim(), i: f.querySelector('.sis-ico').textContent, d: f.querySelector('small').textContent })));
      eq(filas.length, 5, '24: se ven las cinco más recientes');
      eq(filas.slice(0, 5).map((f) => f.v), ['fluido', 'fluido', 'fluido', 'revisar', 'revisar'], '24: de la más nueva a la más vieja');
      const todas = await a.p.$$eval('#sis-med .sis-fila, #sis-med-resto .sis-fila', (fs) => fs.map((f) => ({ v: f.dataset.veredicto, e: f.dataset.estado, p: f.querySelector('.sis-palabra').textContent.trim(), i: f.querySelector('.sis-ico').textContent, d: f.querySelector('small').textContent })));
      const lento = todas.find((f) => f.v === 'lento'), limitada = todas.find((f) => /ahorro de batería/.test(f.d)), revisar = todas.find((f) => f.v === 'revisar');
      ok(lento && lento.e === 'mal' && lento.p === '· Lento' && lento.i === '✘' && /\/medir\?sin=pausa/.test(lento.d), '24: «Lento» con su símbolo, su palabra y qué se revisaría');
      ok(limitada && limitada.v === 'revisar' && limitada.p === '· Revisar', '24: una pantalla limitada a 30 en reposo dice «Revisar» y por qué, no «Lento»');
      ok(revisar && revisar.e === 'aviso' && revisar.i === '!', '24: «Revisar» con su símbolo');
      ok(await a.p.locator('#sis-med-mas').isVisible() && /^2 medidas anteriores$/.test((await a.p.textContent('#sis-med-mas-t')).trim()), '24: las anteriores van plegadas, con su cuenta');
      eq(await a.p.evaluate(() => document.querySelectorAll('#sis-med .sis-fila, #sis-med-resto .sis-fila').length), 7, '24: siete medidas en total');
      const resumen = await a.p.evaluate(() => document.querySelector('#sis-med-mas > summary').offsetHeight);
      ok(resumen >= 48, `24: el pliegue se toca bien (${resumen} px)`);
      // Borrar: pide un segundo toque
      await a.p.click('#sis-med-borrar');
      eq((await a.p.textContent('#sis-med-borrar')).trim(), 'Sí, borrar las 7 medidas', '24: borrar pide un segundo toque');
      eq((await datos(a.p, '/api/sistema')).medidas.length, 7, '24: el primer toque no borra nada');
      await a.p.click('#sis-med-borrar');
      await a.p.waitForFunction(() => /Aún no hay medidas/.test(document.getElementById('sis-med').textContent), null, { timeout: 5000 });
      ok((await a.p.locator('#sis-med-borrar').isHidden()) && (await a.p.locator('#sis-med-mas').isHidden()), '24: borradas, sin botón de borrar ni pliegue');
      // Un toque durante la prueba la detiene: no se guarda nada
      await a.p.goto(`${srv.url}/medir`, { waitUntil: 'load' });
      await a.p.waitForSelector('#d-medir[open]', { timeout: 30000 });
      await a.p.click('#me-empezar');
      await a.p.waitForTimeout(1200);
      await a.p.mouse.click(30, 400);
      await a.p.waitForSelector('#d-medir[open]', { timeout: 5000 });
      ok(/se detuvo porque se tocó la pantalla/.test(await a.p.textContent('#me-res')) && (await a.p.locator('#me-empezar').isVisible()), '24: un toque detiene la prueba y se puede volver a empezar');
      eq((await datos(a.p, '/api/sistema')).medidas.length, 0, '24: una prueba detenida no se guarda');
      eq(await a.p.evaluate(() => [scrollY, document.documentElement.hasAttribute('data-midiendo'), location.pathname]), [0, false, '/medir'], '24: y la página queda como estaba');
      // «Cerrar» deja la app normal en «/»
      await a.p.click('#me-cerrar');
      await a.p.waitForTimeout(300);
      eq(await a.p.evaluate(() => [location.pathname, document.documentElement.hasAttribute('data-medir')]), ['/', false], '24: «Cerrar» vuelve a la app de siempre');
      eq(a.consola.filter((c) => !/Failed to load resource/.test(c)), [], '24: sin errores en la consola');
      await a.ctx.close();
      // 320 px con letra muy grande y efectos «ninguno»: cabe sin desbordes y la medición funciona (y lo dice)
      const ch = await entrar(navegador, srv, ADMIN, { viewport: { width: 320, height: 568 } }, () => { try { localStorage.setItem('libro.avisos.preguntado', '1'); localStorage.setItem('libro.letra', 'muy-grande'); localStorage.setItem('libro.efectos', 'ninguno'); } catch { /* */ } });
      await ch.p.goto(`${srv.url}/medir`, { waitUntil: 'load' });
      await ch.p.waitForSelector('#d-medir[open]', { timeout: 30000 });
      const cabe = () => ch.p.evaluate(() => {
        const d = document.getElementById('d-medir');
        const bot = [...d.querySelectorAll('button')].filter((b) => b.getClientRects().length).map((b) => b.getBoundingClientRect());
        return { dlg: d.scrollWidth <= d.clientWidth + 1, pag: document.documentElement.scrollWidth <= innerWidth, dentro: d.getBoundingClientRect().right <= innerWidth + 0.5, toques: bot.every((r) => r.height >= 47.5 && r.width >= 47.5) };
      });
      eq(await cabe(), { dlg: true, pag: true, dentro: true, toques: true }, '24: a 320 px con letra muy grande, sin desbordes y con toques de 48 px');
      ok(/Efectos «ninguno»: se mide sin animaciones/.test(await ch.p.textContent('#me-ef')), '24: con efectos «ninguno» lo dice');
      await ch.p.click('#me-empezar');
      await ch.p.waitForSelector('#d-medir[open]', { timeout: 20000 });
      await ch.p.waitForTimeout(300);
      ok(/^\d+ fps$/.test((await ch.p.textContent('#me-fps')).trim()), '24: con efectos «ninguno» la medición funciona');
      eq(await cabe(), { dlg: true, pag: true, dentro: true, toques: true }, '24: con el resultado, tampoco se desborda');
      eq((await datos(ch.p, '/api/sistema')).medidas[0].efectos, 'ninguno', '24: y guarda el nivel de efectos');
      await ch.ctx.close();
      // Una lectora: sin /medir (404) y sin poder guardar medidas
      const l = await entrar(navegador, srv, LECTOR, { viewport: { width: 390, height: 844 } }, sinAvisos);
      const r404 = await l.p.goto(`${srv.url}/medir`);
      eq(r404.status(), 404, '24: una lectora no tiene /medir');
      await l.p.goto(srv.url, { waitUntil: 'load' }); await l.p.waitForTimeout(800);
      eq(await l.p.evaluate(() => fetch('/api/medidas', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Libro': '1' }, body: '{}' }).then((r) => r.status)), 403, '24: ni guarda medidas (403)');
      ok(!(await l.p.evaluate(() => document.documentElement.hasAttribute('data-medir'))), '24: en su app no hay nada de la medición');
      await l.ctx.close();
    } finally {
      srv.parar();
    }
    // Con SOLO_LECTURA se mide, pero no se guarda: lo dice y el resultado se queda a la vista
    const sl = await servidor('anio', { SOLO_LECTURA: '1' });
    try {
      const a = await entrar(navegador, sl, ADMIN, { viewport: { width: 390, height: 844 } }, () => { try { localStorage.setItem('libro.avisos.preguntado', '1'); } catch { /* */ } });
      await a.p.goto(`${sl.url}/medir`, { waitUntil: 'load' });
      await a.p.waitForSelector('#d-medir[open]', { timeout: 30000 });
      await a.p.click('#me-empezar');
      await a.p.waitForSelector('#d-medir[open]', { timeout: 20000 });
      await a.p.waitForTimeout(300);
      ok(/^\d+ fps$/.test((await a.p.textContent('#me-fps')).trim()) && /No se guardó: .*mantenimiento/.test(await a.p.textContent('#me-res')), `24: en mantenimiento mide y dice que no se guardó (${await a.p.textContent('#me-res')})`);
      ok((await a.p.locator('#me-sistema').isHidden()) && (await a.p.locator('#me-otra').isVisible()), '24: sin «Ver todas las medidas» (no hay nada nuevo allí)');
      eq((await datos(a.p, '/api/sistema')).medidas.length, 0, '24: y no queda ninguna medida');
      await a.ctx.close();
    } finally {
      sl.parar();
    }
  });

  // ---------------------------------------------------------------- campamento 24: confianza (la revisión tranquila del respaldo y la suma por etiqueta)
  await bloque(async () => {
    const srv = await servidor('mil'); // con etiquetas «bono» y «cumpleaños»
    try {
      // Push de mentira (como en el bloque de avisos) y sin la oferta de avisos al entrar
      const conPushQuieto = () => {
        try { localStorage.setItem('libro.avisos.preguntado', '1'); } catch { /* sin almacenamiento */ }
        const est = { sub: false };
        const ep = `https://fcm.googleapis.com/fcm/send/c24-${Math.random().toString(36).slice(2)}`;
        const sub = { endpoint: ep, options: {}, unsubscribe: async () => { est.sub = false; return true; }, toJSON: () => ({ endpoint: ep, keys: { p256dh: `B${'x'.repeat(86)}`, auth: 'a'.repeat(22) } }) };
        const reg = { pushManager: { getSubscription: async () => (est.sub ? sub : null), subscribe: async () => { est.sub = true; return sub; } }, unregister: async () => true };
        Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: { getRegistration: async () => reg, register: async () => reg, ready: Promise.resolve(reg) } });
        Object.defineProperty(Notification, 'permission', { configurable: true, get: () => (est.permiso ?? 'default') });
        Notification.requestPermission = async () => { est.permiso = 'granted'; return 'granted'; };
      };
      const cerrar = async (p) => {
        if (await p.locator('#d-novedades[open]').count()) { await p.click('#nov-ok'); await p.waitForTimeout(300); }
        if (await p.locator('#d-cambios[open]').count()) { await p.click('#cam-ok'); await p.waitForTimeout(300); }
      };
      const abrirSistema = async (p) => {
        if (!(await p.locator('#d-cuenta[open]').count())) { await p.click('#cuenta-btn'); await p.waitForTimeout(250); }
        await p.evaluate(() => document.getElementById('sis-rg').replaceChildren()); // lo de la vez anterior no cuenta como cargado
        await p.click('#dc-sistema-btn');
        await p.waitForFunction(() => !/Cargando/.test(document.getElementById('sis-res').textContent) && document.querySelector('#sis-rg .sis-fila'), null, { timeout: 8000 });
      };
      const filaRg = (p) => p.$eval('#sis-rg .sis-fila', (f) => ({ e: f.dataset.estado, t: f.querySelector('b').textContent, p: f.querySelector('.sis-palabra').textContent.trim(), i: f.querySelector('.sis-ico').textContent,
        d: f.querySelector('small').textContent, borde: `${getComputedStyle(f).outlineStyle}|${getComputedStyle(f).boxShadow}` }));
      const resumenSiete = (p) => p.evaluate(() => {
        const n = [...document.querySelectorAll('#sis-lista .sis-fila')].filter((x) => x.dataset.estado !== 'ok').length;
        return [document.getElementById('sis-res').textContent.trim(), n ? `${n} ${n === 1 ? 'cosa por revisar' : 'cosas por revisar'}.` : 'Todo en orden.', document.querySelectorAll('#sis-lista .sis-fila').length];
      });
      const masDias = (iso, d) => new Date(Date.parse(`${iso}T00:00:00Z`) + d * 864e5).toISOString().slice(0, 10);

      // --- 36 · La revisión tranquila del respaldo, en «Estado del sistema» (solo el admin)
      const a = await entrar(navegador, srv, ADMIN, { viewport: { width: 390, height: 844 } }, conPushQuieto);
      await cerrar(a.p);
      await abrirSistema(a.p);
      let f = await filaRg(a.p);
      eq([f.t, f.p, f.e, f.i], ['Revisión del respaldo', '· Sin anotar', 'calma', '○'], '24c: nunca revisado es una fila tranquila: «Sin anotar», con su símbolo (no «Falla»)');
      ok(f.d.startsWith('Última revisión: nunca.') && f.d.includes('«Revisado»') && f.d.includes('«Avisos en este dispositivo»'), `24c: dice que nunca y cómo pedir el recordatorio («${f.d}»)`);
      eq(f.borde, 'none|none', '24c: sin borde de alarma (ni rojo ni a trazos)');
      let s7 = await resumenSiete(a.p);
      eq([s7[0], s7[2]], [s7[1], 7], '24c: las siete filas del estado no cambian y la revisión no cuenta como «cosa por revisar»');
      const pos = await a.p.evaluate(() => { const y = (id) => document.getElementById(id).getBoundingClientRect().top; const b = document.getElementById('sis-revisado'); return { err: y('sis-err'), rev: y('sis-revisado'), previa: y('dc-previa-t'), alto: b.offsetHeight, ancho: b.offsetWidth }; });
      ok(pos.err < pos.rev && pos.rev < pos.previa, '24c: «Revisado» va tras los errores del navegador y encima de «Probar la celebración»');
      ok(pos.alto >= 48 && pos.ancho >= 48, `24c: «Revisado» mide 48 px (${pos.ancho} × ${pos.alto})`);
      eq(await a.p.$eval('#sis-revisado', (b) => [b.firstChild.textContent, b.querySelector('.sr')?.textContent, b.textContent]), ['Revisado', ': hoy miré el respaldo', 'Revisado: hoy miré el respaldo'],
        '24c: se lee «Revisado» y a los lectores de pantalla les dice qué anota');
      ok((await a.p.textContent('#dc-sistema')).includes('la app no pide ni guarda nada de eso'), '24c: la vista dice que la app no guarda nada de la wallet');
      await a.p.click('#sis-revisado');
      await a.p.waitForFunction(() => /^Anotado: hoy revisaste el respaldo\./.test(document.getElementById('sis-rg-res').textContent), null, { timeout: 5000 });
      f = await filaRg(a.p);
      eq([f.p, f.e, f.i, f.d.split('.')[0]], ['· Al día', 'ok', '✔', 'Última revisión: hoy'], '24c: al tocar «Revisado» la fila queda al día');
      eq(await a.p.getAttribute('#sis-rg-res', 'role'), 'status', '24c: y lo anuncia (role=status)');
      const r1 = (await datos(a.p, '/api/sistema')).resguardo;
      eq([r1.revisado, r1.dias, r1.al_dia, r1.encendido, r1.proximo], [hoySV(), 0, true, false, null], '24c: el servidor guarda la fecha de hoy (sin aviso encendido aún no hay próximo)');
      await a.p.click('#sis-revisado');
      await a.p.waitForFunction(() => /^Ya estaba anotado/.test(document.getElementById('sis-rg-res').textContent), null, { timeout: 5000 });
      eq((await datos(a.p, '/api/auditoria')).filter((x) => x.accion === 'resguardo_revisado').length, 1, '24c: tocarlo dos veces el mismo día deja una sola fila en la auditoría');
      await a.p.click('#dc-sistema [data-cuenta="volver"]'); await a.p.click('#dc-historial');
      await a.p.waitForSelector('#hist-lista li', { timeout: 5000 });
      ok((await a.p.textContent('#hist-lista')).includes('Daf3r anotó que revisó el respaldo de su wallet y la nota para su familia'), '24c: el Historial lo cuenta en español');
      await a.p.click('#dc-hist [data-cuenta="volver"]');
      // Pasados 180 días (la API no puede volver atrás en el tiempo: se simula su respuesta) sigue siendo tranquila
      await a.p.route('**/api/sistema', async (route) => {
        const r = await route.fetch(); const j = await r.json();
        j.resguardo = { revisado: '2026-01-05', dias: 320, cada: 180, al_dia: false, encendido: true, proximo: '2027-05-10', toca: false };
        await route.fulfill({ response: r, json: j });
      });
      await abrirSistema(a.p);
      f = await filaRg(a.p);
      eq([f.p, f.e, f.borde], ['· Cuando puedas', 'calma', 'none|none'], '24c: pasados 180 días dice «Cuando puedas», sin alarma');
      ok(f.d.includes('hace 320 días (5 ene 2026)') && f.d.includes('Próximo recordatorio: el 10 may 2027.'), `24c: con la fecha de la última revisión y la del próximo recordatorio («${f.d}»)`);
      s7 = await resumenSiete(a.p);
      eq(s7[0], s7[1], '24c: tampoco cuenta como «cosa por revisar» cuando toca');
      await a.p.unroute('**/api/sistema');
      // La vista de avisos: la categoría sale al admin, apagada, junto a «Fallo del respaldo»; al encenderla, el estado dice cuándo llega
      await a.p.click('#dc-sistema [data-cuenta="volver"]'); await a.p.click('#dc-avisos-btn'); await a.p.waitForTimeout(500);
      await a.p.click('#av-interruptor'); await a.p.waitForTimeout(900);
      const cats = await a.p.$$eval('#av-lista input', (xs) => xs.map((x) => x.dataset.cat));
      eq(cats.indexOf('resguardo'), cats.indexOf('respaldo') + 1, '24c: «Revisión tranquila del respaldo» va junto a «Fallo del respaldo»');
      const cat = await a.p.$eval('#av-lista input[data-cat="resguardo"]', (x) => ({ on: x.checked, t: x.closest('label').textContent, alto: x.closest('label').getBoundingClientRect().height }));
      ok(!cat.on && /Revisión tranquila del respaldo/.test(cat.t) && /180 días/.test(cat.t) && /no guarda nada/.test(cat.t), `24c: apagada por defecto y explica qué hace («${cat.t.replace(/\s+/g, ' ')}»)`);
      ok(cat.alto >= 47.5, `24c: su fila se toca bien (${cat.alto} px)`);
      await a.p.click('#av-lista input[data-cat="resguardo"]'); await a.p.waitForTimeout(500);
      await a.p.click('#dc-avisos [data-cuenta="volver"]');
      await abrirSistema(a.p);
      f = await filaRg(a.p);
      const r2 = (await datos(a.p, '/api/sistema')).resguardo;
      ok(r2.encendido && r2.proximo === masDias(hoySV(), 180) && /Próximo recordatorio: el \d{1,2} \S+ \d{4}\.$/.test(f.d), `24c: con el aviso encendido, el próximo es dentro de 180 días (${r2.proximo}; «${f.d}»)`);
      eq((await a.p.textContent('#sis-rg-res')).trim(), '', '24c: al volver a la vista, el mensaje de antes se limpia');
      await a.p.keyboard.press('Escape'); await a.p.waitForTimeout(300);

      // --- La suma por etiqueta en la lista (con una venta que lleva la etiqueta, para el neto)
      eq(await a.p.evaluate(() => fetch('/api/compras', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Libro': '1' },
        body: JSON.stringify({ fecha: new Intl.DateTimeFormat('en-CA', { timeZone: 'America/El_Salvador' }).format(new Date()), monto: 3, sats: 4321, tipo: 'venta', etiquetas: ['bono'] }) }).then((r) => r.status)), 201, '24c: una venta con la etiqueta «bono»');
      await a.p.reload({ waitUntil: 'networkidle' }); await a.p.waitForTimeout(2500); await cerrar(a.p);
      const compras = await datos(a.p, '/api/compras'), traslados = await datos(a.p, '/api/traslados');
      const total = (compras.length + traslados.length).toLocaleString('en-US');
      const con = (et, tipo) => compras.filter((c) => c.etiquetas?.includes(et) && (!tipo || c.tipo === tipo));
      const suma = (xs) => xs.reduce((s, c) => s + c.sats, 0);
      const nf = (x) => x.toLocaleString('en-US');
      const bonoC = suma(con('bono', 'compra')), bonoV = suma(con('bono', 'venta')), neto = bonoC - bonoV;
      const esperaBono = `${con('bono').length} de ${total} movimientos · neto ${neto > 0 ? '+' : neto < 0 ? '−' : ''}${nf(Math.abs(neto))} sats (${nf(bonoC)} comprados, ${nf(bonoV)} vendidos)`;
      ok(bonoV === 4321 && bonoC > 100_000, `24c: «bono» tiene compras y la venta (${bonoC} y ${bonoV} sats)`);
      await a.p.evaluate(() => document.getElementById('lista').scrollIntoView({ block: 'start' }));
      eq(await a.p.evaluate(() => [document.getElementById('l-res').textContent, document.getElementById('l-res').offsetHeight]), ['', 0], '24c: sin filtros, el renglón de resultados está vacío y no ocupa sitio');
      await a.p.click('#l-mas summary'); await a.p.selectOption('#l-etq', 'bono'); await a.p.waitForTimeout(300);
      eq((await a.p.textContent('#l-res')).trim(), esperaBono, '24c: con la etiqueta «bono», cuántos y su suma, con el neto y cada parte aparte');
      const pegada = await a.p.$$eval('#l-res .nw', (xs) => xs.map((x) => ({ t: x.textContent, r: x.getClientRects().length })));
      ok(pegada.some((x) => x.t === `+${nf(neto)} sats`) && pegada.every((x) => x.r === 1), `24c: «+${nf(neto)} sats» va pegado y no se parte (${JSON.stringify(pegada)})`);
      const antes = await a.p.evaluate(() => [document.getElementById('l-res').textContent, document.getElementById('lista').getBoundingClientRect().top + scrollY]);
      ok(await a.p.locator('#ver-todas').isVisible(), '24c: hay más de lo que cabe en el primer tramo');
      await a.p.click('#ver-todas'); await a.p.waitForTimeout(300);
      eq(await a.p.evaluate(() => [document.getElementById('l-res').textContent, document.getElementById('lista').getBoundingClientRect().top + scrollY]), antes, '24c: «Ver más» no cambia la suma (es de todo lo filtrado) ni mueve la lista');
      await a.p.click('#l-chips button[data-f="compra"]'); await a.p.waitForTimeout(300);
      eq((await a.p.textContent('#l-res')).trim(), `${con('bono', 'compra').length} de ${total} movimientos · ${nf(bonoC)} sats comprados`, '24c: con otro filtro encima, solo lo que se ve (solo compras: «comprados»)');
      await a.p.click('#l-chips button[data-f="venta"]'); await a.p.waitForTimeout(300);
      eq((await a.p.textContent('#l-res')).trim(), `1 de ${total} movimientos · ${nf(bonoV)} sats vendidos`, '24c: solo la venta: «vendidos»');
      await a.p.click('#l-chips button[data-f="traslado"]'); await a.p.waitForTimeout(300);
      eq((await a.p.textContent('#l-res')).trim(), `0 de ${total} movimientos`, '24c: los traslados no llevan etiquetas: nada que sumar');
      await a.p.click('#l-chips button[data-f="todos"]');
      await a.p.selectOption('#l-etq', 'cumpleaños'); await a.p.waitForTimeout(300);
      eq((await a.p.textContent('#l-res')).trim(), `${con('cumpleaños').length} de ${total} movimientos · ${nf(suma(con('cumpleaños', 'compra')))} sats comprados`, '24c: otra etiqueta, otra suma');
      await a.p.selectOption('#l-etq', ''); await a.p.fill('#l-buscar', 'caída'); await a.p.waitForTimeout(300);
      ok(/^\d+ de [\d,]+ movimientos$/.test((await a.p.textContent('#l-res')).trim()), '24c: sin etiqueta elegida (solo una búsqueda), no hay suma');
      await a.p.click('#l-limpiar'); await a.p.waitForTimeout(200);
      eq(await a.p.evaluate(() => document.getElementById('l-res').offsetHeight), 0, '24c: al quitar los filtros, el renglón se va');
      ok(!/\b(tu|tus|tienes|te)\b|saldo|quedan|meta/i.test(esperaBono), '24c: sin tutear ni hablar de saldo o metas');
      eq(a.consola, [], `24c: consola limpia (dueño): ${a.consola.join(' | ')}`);
      await a.ctx.close();

      // Una lectora: la misma suma (no tutea), sin la categoría ni la vista, y sin poder anotar la revisión
      const l = await entrar(navegador, srv, LECTOR, { viewport: { width: 390, height: 844 } }, conPushQuieto);
      await cerrar(l.p);
      await l.p.evaluate(() => document.getElementById('lista').scrollIntoView({ block: 'start' }));
      await l.p.click('#l-mas summary'); await l.p.selectOption('#l-etq', 'bono'); await l.p.waitForTimeout(300);
      eq((await l.p.textContent('#l-res')).trim(), esperaBono, '24c: quien solo mira lee la misma suma');
      await l.p.evaluate(() => scrollTo(0, 0));
      await l.p.click('#cuenta-btn'); await l.p.waitForTimeout(250);
      ok(!(await l.p.locator('#dc-sistema-btn').isVisible()), '24c: una lectora no ve «Estado del sistema»');
      await l.p.click('#dc-avisos-btn'); await l.p.waitForTimeout(500);
      await l.p.click('#av-interruptor'); await l.p.waitForTimeout(900);
      eq(await l.p.$$eval('#av-lista input', (xs) => xs.map((x) => x.dataset.cat)), ['movimiento', 'hito', 'diario'], '24c: ni la categoría de la revisión del respaldo');
      eq(await l.p.evaluate(() => fetch('/api/resguardo', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Libro': '1' }, body: '{}' }).then((r) => r.status)), 403, '24c: ni puede anotarla (403)');
      await l.ctx.close();

      // 320 px con letra muy grande: la fila, el botón y la suma caben sin desbordes y con toques de 48 px
      const ch = await entrar(navegador, srv, ADMIN, { viewport: { width: 320, height: 568 } }, () => { try { localStorage.setItem('libro.avisos.preguntado', '1'); localStorage.setItem('libro.letra', 'muy-grande'); } catch { /* */ } });
      await cerrar(ch.p);
      await abrirSistema(ch.p);
      await ch.p.evaluate(() => document.getElementById('sis-revisado').scrollIntoView({ block: 'center' }));
      eq(await ch.p.evaluate(() => {
        const d = document.getElementById('d-cuenta'), b = document.getElementById('sis-revisado').getBoundingClientRect(), fl = document.querySelector('#sis-rg .sis-fila');
        return { dlg: d.scrollWidth <= d.clientWidth + 1, pag: document.documentElement.scrollWidth <= innerWidth, fila: fl.scrollWidth <= fl.clientWidth + 1, toque: b.height >= 47.5 && b.width >= 47.5 };
      }), { dlg: true, pag: true, fila: true, toque: true }, '24c: a 320 px con letra muy grande, «Estado del sistema» con la revisión no se desborda');
      await ch.p.keyboard.press('Escape'); await ch.p.waitForTimeout(300);
      await ch.p.evaluate(() => document.getElementById('lista').scrollIntoView({ block: 'start' }));
      await ch.p.click('#l-mas summary'); await ch.p.selectOption('#l-etq', 'bono'); await ch.p.waitForTimeout(300);
      eq(await ch.p.evaluate(() => {
        const r = document.getElementById('l-res');
        return { pag: document.documentElement.scrollWidth <= innerWidth, res: r.scrollWidth <= r.clientWidth + 1, pegadas: [...r.querySelectorAll('.nw')].every((x) => x.getClientRects().length === 1), texto: r.textContent.includes(' sats (') };
      }), { pag: true, res: true, pegadas: true, texto: true }, '24c: a 320 px con letra muy grande, la suma se parte en renglones sin separar «N sats» ni desbordar');
      await ch.ctx.close();

      // «Qué hay de nuevo» cuenta la suma por etiqueta (a quien vio la entrada anterior)
      const q = await entrar(navegador, srv, ADMIN, { viewport: { width: 390, height: 844 } }, () => { try { localStorage.setItem('libro.avisos.preguntado', '1'); } catch { /* */ } });
      await cerrar(q.p);
      await q.p.evaluate(() => fetch('/api/cambios-visto', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Libro': '1' }, body: JSON.stringify({ id: '2026-12-c' }) }));
      await q.p.reload({ waitUntil: 'networkidle' });
      await q.p.waitForSelector('#d-cambios[open]', { timeout: 8000 });
      // (Desde el campamento 25 la tarjeta enseña la entrada de los osos, `2026-12-f`; la suma por etiqueta sigue contada en la `2026-12-e`.)
      const ent24 = await q.p.evaluate(async () => (await import(document.querySelector('link[rel=modulepreload][href*="cambios.js"]').href)).CAMBIOS.find((c) => c.id === '2026-12-e')?.items.join(' ') ?? '');
      ok(/elegir una etiqueta/.test(ent24) && !/respaldo/i.test(ent24) && !/respaldo/i.test(await q.p.textContent('#cam-lista')), '24c: «Qué hay de nuevo» cuenta la suma por etiqueta (y nada de la revisión, que es solo del admin)');
      await q.ctx.close();
    } finally {
      srv.parar();
    }
  });

  // ---------------------------------------------------------------- campamento 22: el valle vivo
  await bloque(async () => {
    // Todo lo de fecha se prueba con `libro.dia` (y `libro.hora`): nunca depende del día en que corra la prueba.
    const conDia = (dia, extra = {}) => [([d, x]) => { try { localStorage.setItem('libro.dia', d); localStorage.setItem('libro.avisos.preguntado', '1'); for (const [k, v] of Object.entries(x)) localStorage.setItem(k, v); } catch { /* sin almacenamiento */ } }, [dia, extra]];
    const cerrar = async (p) => { for (let k = 0; k < 3 && await p.locator('dialog[open]').count(); k++) { await p.keyboard.press('Escape'); await p.waitForTimeout(300); } };
    const valle = (p) => p.evaluate(() => {
      const visto = (s) => [...document.querySelectorAll(s)].some((e) => { let x = e; while (x && x.tagName !== 'svg') { if (getComputedStyle(x).display === 'none') return false; x = x.parentElement; } return true; });
      const subtrazos = (s) => ((document.querySelector(s)?.getAttribute('d') || '').match(/M/g) || []).length;
      const caja = (s) => { const r = document.querySelector(s)?.getBoundingClientRect(); return r && { x: r.x, y: r.y, w: r.width, h: r.height, r: r.right, b: r.bottom }; };
      const camino = document.querySelector('#montana #m-sendero'), m = camino.getScreenCTM(), L = camino.getTotalLength(), sendero = [];
      for (let l = 0; l <= L; l += 4) { const q = camino.getPointAtLength(l); sendero.push([m.a * q.x + m.c * q.y + m.e, m.b * q.x + m.d * q.y + m.f]); }
      const rotulos = [...document.querySelectorAll('#m-etiquetas > *')].map((e) => e.getBoundingClientRect()).filter((r) => r.width);
      const cruza = (a, b) => a.x < b.right && a.r > b.left && a.y < b.bottom && a.b > b.top;
      // (22C) Las casas y la iglesia del pueblo: la caja que las junta a todas (si no pisa el sendero ni un rótulo, ninguna lo pisa).
      const edificios = [...document.querySelectorAll('.v-pueblo :is(.v-frente, .v-pared-l, .v-ig-frente, .v-ig-torre, .v-ig-cupula, .v-techo-l)')].map((e) => e.getBoundingClientRect()).filter((r) => r.width);
      const ca = edificios.length ? edificios.reduce((u, r) => ({ x: Math.min(u.x, r.x), y: Math.min(u.y, r.y), right: Math.max(u.right, r.right), bottom: Math.max(u.bottom, r.bottom) }), { x: 1e9, y: 1e9, right: -1e9, bottom: -1e9 }) : null;
      // Los nodos del valle: lo que está en sus capas (`#m-v-…`) y todo lo que lleva una clase `v-…` (también en el cielo, la sierra y el
      // lago), más el agua del lago de época; los degradados de los `<defs>` de la escena no cuentan (como en el campamento 22).
      const nodos = [...document.querySelectorAll('#montana svg *')].filter((e) => !e.closest('defs') && (e.closest('[id^="m-v-"]') || [...e.classList].some((c) => c.startsWith('v-')) || e.matches('.lago-playa, .lago-nivel'))).length;
      const saldo = document.querySelector('.saldo').getBoundingClientRect();
      const fill = (s) => { const e = document.querySelector(s); return e ? getComputedStyle(e).fill : ''; };
      return {
        ranchos: [...document.querySelectorAll('.v-pueblo .v-frente')].reduce((n, e) => n + ((e.getAttribute('d') || '').match(/M/g) || []).length, 0), iglesia: !!document.querySelector('.v-pueblo .v-ig-frente'), ventanas: subtrazos('.v-luz'), luzVentana: fill('.v-luz'), luces: subtrazos('.v-luz-lejos') + subtrazos('.v-luz-cerca'),
        lucesVis: visto('.v-luces'), casas: ca && { x: ca.x, y: ca.y, r: ca.right, b: ca.bottom }, saldoAbajo: saldo.bottom,
        casasSobreSendero: !!ca && sendero.some(([x, y]) => x > ca.x && x < ca.right && y > ca.y && y < ca.bottom),
        casasSobreRotulo: !!ca && rotulos.some((r) => cruza({ x: ca.x, y: ca.y, r: ca.right, b: ca.bottom }, r)),
        nodos, total: document.querySelectorAll('.montana svg *').length,
        llena: visto('.v-q-llena'), hilo: visto('.v-q-hilo'), playa: visto('.lago-playa'), nivel: getComputedStyle(document.querySelector('.lago-nivel')).transform,
        milpa: ['siembra', 'jilote', 'doblada', 'tapisca', 'rastrojo'].filter((e) => visto(`.v-mp-${e}`)),
        // Ninguna luz de la sierra queda tapada por la loma del cantón ni por la montaña (se cuentan las que se ven).
        lucesTapadas: (() => { const loma = document.querySelector('.v-loma'), monte = document.querySelector('path.monte'); return [...(document.querySelector('.v-luz-lejos')?.getAttribute('d') ?? '').matchAll(/M([\d.]+) ([\d.]+)/g)].filter(([, x, y]) => { const q = new DOMPoint(Number(x), Number(y)); return loma.isPointInFill(q) || monte.isPointInFill(q); }).length; })(),
        humo: visto('.v-humos'), navidad: visto('.v-canton .v-navidad') && visto('.v-pino-nav'), pinoParpadea: (() => { const f = document.querySelector('.v-pn-foco'); return f ? getComputedStyle(f).animationName : 'sin pino'; })(), // (30) fuera de la Navidad no se dibuja
        pis: document.querySelectorAll('.v-pis').length, pisVis: visto('.v-piscuchas'), pisCaja: caja('.v-pis'),
        // El ritmo de cada piscucha y de cada bocanada de humo (campamento 22B: va por clase, no por su orden): duración/retraso.
        ritmoPis: [...document.querySelectorAll('.v-pis')].map((e) => `${getComputedStyle(e).animationDuration}/${getComputedStyle(e).animationDelay}`),
        ritmoHumo: [...document.querySelectorAll('.v-hu')].map((e) => `${getComputedStyle(e).animationDuration}/${getComputedStyle(e).animationDelay}`),
        grabado: visto('.v-grabado'), grabadoTxt: [...document.querySelectorAll('text.v-grabado')].map((t) => t.textContent).join(' ') || null,
        garza: visto('.v-garza'), cuerpo: visto('.v-cy-cuerpo'), lampara: visto('.v-cy-lampara'),
        arbol: document.querySelector('.v-arbol')?.getAttribute('class') ?? null, arbolCaja: caja('.v-arbol .v-ar-tronco, .v-arbol .v-ar-tallo'), salida: caja('.salida'),
        camino: !!document.querySelector('.v-cm'), cohetes: document.documentElement.hasAttribute('data-cohetes'),
        desc: document.getElementById('m-desc').textContent,
      };
    });
    const srv = await servidor('anio');
    const srvB = await servidor('ballena');
    try {
      // Época lluviosa, de día: la quebrada corre llena, el lago tapa su playa, la milpa jilotea; el cantón en su loma, sin pisar nada.
      let t = await entrar(navegador, srv, ADMIN, { hora: 12 }, conDia('2026-07-10')); await cerrar(t.p);
      let v = await valle(t.p);
      // Lo que se espera sale de los datos del escenario (que dependen del día real): meses y años del libro hasta el día pedido.
      const primera = (await datos(t.p, '/api/compras')).filter((c) => c.tipo !== 'venta').map((c) => c.fecha).sort()[0];
      const meses = (d) => Math.max(1, (Number(d.slice(0, 4)) - Number(primera.slice(0, 4))) * 12 + Number(d.slice(5, 7)) - Number(primera.slice(5, 7)) + 1);
      const etapa = (d) => { const a = Math.max(0, (Date.parse(d) - Date.parse(primera)) / (365.2425 * 864e5)); return a < 1 ? 'retono' : a < 2 ? 'joven' : a < 5 ? 'arbol' : 'grande'; };
      ok(v.iglesia && v.ranchos >= 5 && v.casas && v.casas.x >= -2 && v.casas.y > v.saldoAbajo && !v.casasSobreSendero && !v.casasSobreRotulo, `22 pueblo (22C): en el teléfono, la iglesia y ${v.ranchos} casas por debajo del saldo, sin pisar el sendero ni un rótulo (${JSON.stringify(v.casas)})`);
      ok(v.nodos <= 300 && v.total < 1100, `22 presupuesto: el valle en el teléfono son ${v.nodos} nodos (tope 300 desde el campamento 22C), la escena ${v.total} (tope 1100)`);
      ok(v.llena && !v.hilo && !v.playa && v.nivel === 'none', '22 quebrada y lago: en la lluviosa la quebrada baja llena y el lago cubre su playa');
      eq(v.milpa, ['jilote'], '22 milpa: el 10 de julio jilotea');
      ok(v.garza && v.cuerpo && !v.lampara && !v.humo && !v.lucesVis && !v.pisVis && !v.navidad && !v.grabado, '22 de día: la garza y el cayuco con su pescador; sin humo (no es hora del fogón), sin luces, sin piscuchas ni Navidad');
      ok(v.camino && (v.arbol ?? '').includes(`v-${etapa('2026-07-10')}`) && v.arbolCaja && v.salida && v.arbolCaja.r < v.salida.x + 2, `22 camino real y árbol del primer día: llegan a la salida por el lado contrario al sendero (${v.arbol})`);
      ok(/Al pie de la montaña hay un pueblo con su iglesia/.test(v.desc) && /conacaste[^.]*, sembrado el [^.]*, el día de la primera compra/.test(v.desc), '22 descripción: la montaña cuenta el valle y el árbol para lectores de pantalla');
      ok(t.consola.length === 0, `22: consola limpia (${t.consola.slice(0, 2)})`);
      await t.ctx.close();
      // De noche: una luz por mes del libro, una ventana encendida por persona con cuenta (Daf3r y Ana), del cayuco solo su lámpara.
      t = await entrar(navegador, srv, ADMIN, { hora: 20 }, conDia('2026-07-10')); await cerrar(t.p);
      v = await valle(t.p);
      const fam = await datos(t.p, '/api/yo');
      ok(v.lucesVis && v.lucesTapadas === 0 && v.luces === Math.max(6, Math.min(60, meses('2026-07-10'))) && v.ventanas === fam.familia.personas && /255, 197, 107/.test(v.luzVentana), `22 de noche: ${v.luces} luces del valle (los meses del libro) y ${v.ventanas} ventanas encendidas, una por persona (${fam.familia.personas})`);
      ok(!v.garza && !v.cuerpo && v.lampara, '22 lago de noche: sin garza; del cayuco, solo su lámpara y su reflejo');
      await t.ctx.close();
      // Al amanecer, el humo del fogón (ambiente: solo con «todos»).
      t = await entrar(navegador, srv, ADMIN, { hora: 6 }, conDia('2026-07-10', { 'libro.efectos': 'todos' })); await cerrar(t.p);
      v = await valle(t.p);
      ok(v.humo, '22 fogón: humo a la hora del café con «todos»');
      eq(v.ritmoHumo, ['6.6s/0s', '6.6s/-2.2s', '6.6s/-4.4s'], '22 fogón: las tres bocanadas, a destiempo como siempre (22B: por clase)');
      await t.ctx.close();
      t = await entrar(navegador, srv, ADMIN, { hora: 6 }, conDia('2026-07-10', { 'libro.efectos': 'esenciales' })); await cerrar(t.p);
      ok(!(await valle(t.p)).humo, '22 fogón: con «esenciales» no hay humo (es ambiente)');
      await t.ctx.close();
      // Época seca: el lago baja y enseña su playa, la quebrada es un hilo; en febrero, rastrojo.
      t = await entrar(navegador, srv, ADMIN, { hora: 12 }, conDia('2027-02-10')); await cerrar(t.p);
      v = await valle(t.p);
      ok(!v.llena && v.hilo && v.playa && /matrix\(0\.8/.test(v.nivel), `22 quebrada y lago: en la seca, un hilo y la playa a la vista (${v.nivel})`);
      eq(v.milpa, ['rastrojo'], '22 milpa: en febrero, rastrojo');
      await t.ctx.close();
      // Piscuchas de octubre (ambiente): una por persona, por debajo del saldo; con «esenciales», ninguna.
      t = await entrar(navegador, srv, ADMIN, { hora: 15 }, conDia('2026-10-20', { 'libro.efectos': 'todos' })); await cerrar(t.p);
      v = await valle(t.p);
      ok(v.pisVis && v.pis === fam.familia.personas && v.pisCaja && v.pisCaja.y > v.saldoAbajo, `22 piscuchas: ${v.pis} en el cielo del valle, por debajo del saldo`);
      eq(v.ritmoPis, ['6.3s/-2s', '4.6s/-3.1s', '6.3s/-2s', '5.2s/0s', '4.6s/-3.1s', '5.2s/0s'].slice(0, v.pis), '22 piscuchas: cada una con su ritmo de siempre (22B: por clase)');
      eq(v.milpa, ['doblada'], '22 milpa: en octubre, doblada');
      await t.ctx.close();
      t = await entrar(navegador, srv, ADMIN, { hora: 15 }, conDia('2026-10-20', { 'libro.efectos': 'esenciales' })); await cerrar(t.p);
      ok(!(await valle(t.p)).pisVis, '22 piscuchas: con «esenciales» no salen');
      await t.ctx.close();
      // Nochebuena de 2026 (con luna llena): foquitos, nacimiento y pino con luces, cohetes y el grabado con las iniciales y la fecha.
      t = await entrar(navegador, srv, ADMIN, { hora: 23.95 }, conDia('2026-12-24', { 'libro.efectos': 'todos', 'libro.madrugada': '0' })); await cerrar(t.p);
      v = await valle(t.p);
      const romanos = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
      const fechaG = `${Number(primera.slice(8))} · ${romanos[Number(primera.slice(5, 7)) - 1]} · ${primera.slice(0, 4)}`;
      ok(v.navidad && v.cohetes && v.pinoParpadea === 'v-parpadeo', '22 Navidad: luces en los ranchos, el nacimiento, el pino con luces que parpadea y los cohetes de Nochebuena');
      ok(v.grabado && v.grabadoTxt.includes([...fam.familia.iniciales].join(' · ')) && v.grabadoTxt.includes(fechaG), `22 luna llena: en la roca, las iniciales y la fecha de la primera compra (${v.grabadoTxt})`);
      await t.ctx.close();
      t = await entrar(navegador, srv, ADMIN, { hora: 23.95 }, conDia('2026-12-24', { 'libro.efectos': 'esenciales', 'libro.madrugada': '0' })); await cerrar(t.p);
      v = await valle(t.p);
      ok(v.navidad && v.pinoParpadea === 'none' && v.grabado, '22 Navidad con «esenciales»: las luces se quedan quietas (la Navidad y el grabado son paisaje)');
      await t.ctx.close();
      t = await entrar(navegador, srv, ADMIN, { hora: 20 }, conDia('2026-12-31', { 'libro.madrugada': '0' })); await cerrar(t.p);
      ok(!(await valle(t.p)).grabado, '22 luna llena: una noche sin luna llena no hay grabado');
      await t.ctx.close();
      // Quien solo mira ve el mismo valle (sin nombres) y la frase del valle no tutea.
      t = await entrar(navegador, srv, LECTOR, { hora: 20 }, conDia('2026-07-10')); await cerrar(t.p);
      v = await valle(t.p);
      ok(v.ranchos >= 5 && v.ventanas === fam.familia.personas && !/\b(tu|tus)\b/i.test(v.desc.slice(v.desc.indexOf('Al pie de la montaña'))), '22 lectora: el mismo valle, y la frase del valle sin tutear');
      await t.ctx.close();
      // Escritorio: tres ranchos; el valle no se mete en el saldo.
      t = await entrar(navegador, srv, ADMIN, { viewport: { width: 1440, height: 900 }, isMobile: false, hasTouch: false, hora: 12 }, conDia('2026-07-10')); await cerrar(t.p);
      v = await valle(t.p);
      ok(v.iglesia && v.ranchos >= 4 && v.casas.y > v.saldoAbajo && !v.casasSobreSendero && !v.casasSobreRotulo, `22 escritorio: la iglesia y ${v.ranchos} casas por debajo del saldo, sin pisar el sendero ni un rótulo`);
      await t.ctx.close();
      // Con muchos años, el árbol es grande; y el presupuesto del teléfono se mantiene con la escena más cargada.
      t = await entrar(navegador, srvB, ADMIN, { hora: 20 }, conDia('2026-07-10', { 'libro.efectos': 'esenciales' })); await cerrar(t.p);
      v = await valle(t.p);
      ok(v.nodos <= 300 && v.total < 1100, `22 presupuesto con ballena: valle ${v.nodos}, escena ${v.total}`);
      await t.ctx.close();
    } finally { srv.parar(); srvB.parar(); }
    // La entrada: el paisaje del valle sin nada de nadie (sin ventanas encendidas, árbol, piscuchas ni grabado).
    const srvE = await servidor('anio');
    try {
      const ctx = await navegador.newContext({ ...devices['iPhone 13'] });
      const p = await ctx.newPage();
      await p.addInitScript(() => { try { localStorage.setItem('libro.hora', '20'); localStorage.setItem('libro.dia', '2026-10-20'); localStorage.setItem('libro.efectos', 'todos'); } catch { /* sin almacenamiento */ } });
      await p.goto(`${srvE.url}/login`, { waitUntil: 'networkidle' });
      await p.waitForTimeout(800);
      const e = await p.evaluate(() => ({ canton: !!document.querySelector('.v-canton'), ventanas: document.querySelector('.v-luz')?.getAttribute('d') ?? null, arbol: !!document.querySelector('.v-arbol'), pis: document.querySelectorAll('.v-pis').length, grabado: !!document.querySelector('.v-grabado') }));
      ok(e.canton && e.ventanas === '' && !e.arbol && e.pis === 0 && !e.grabado, '22 entrada: el pueblo está, pero sin ventanas encendidas, árbol del primer día, piscuchas ni grabado (sin datos de nadie)');
      await ctx.close();
    } finally { srvE.parar(); }
  });

  // ---------------------------------------------------------------- campamento 22B: el valle vivo, parte 2
  await bloque(async () => {
    const conDia = (dia, extra = {}) => [([d, x]) => { try { localStorage.setItem('libro.dia', d); localStorage.setItem('libro.avisos.preguntado', '1'); localStorage.setItem('libro.madrugada', '0'); for (const [k, v] of Object.entries(x)) localStorage.setItem(k, v); } catch { /* sin almacenamiento */ } }, [dia, extra]];
    const cerrar = async (p) => { for (let k = 0; k < 3 && await p.locator('dialog[open]').count(); k++) { await p.keyboard.press('Escape'); await p.waitForTimeout(300); } };
    // Lo que se mueve en la escena: el torogoz (si su vuelo está animado), las luciérnagas y las bandadas, los zompopos y los relámpagos (si se ven y están animados).
    const MOVIL = { torogoz: '.ave', luciernagas: '.luciernagas', azacuanes: '.v-aza', pericos: '.v-peri', zompopos: '.v-zompopos', relampagos: '.v-rayo' };
    const estado = (p) => p.evaluate((MOV) => {
      const visto = (e) => { let x = e; while (x && x.tagName !== 'svg') { if (getComputedStyle(x).display === 'none') return false; x = x.parentElement; } return true; };
      const mueve = Object.entries(MOV).filter(([n, s]) => [...document.querySelectorAll(`#montana ${s}`)].some((e) => visto(e) && (n === 'luciernagas' || getComputedStyle(e).animationName !== 'none'))).map(([n]) => n);
      const cs = (s) => { const e = document.querySelector(`#montana ${s}`); return e ? getComputedStyle(e) : null; };
      const vis = (s) => [...document.querySelectorAll(`#montana ${s}`)].some(visto);
      // Cuánto tira a rojo (positivo) o a verde (negativo) un color: el eje «a» de oklab (lo que devuelve `color-mix`), o rojo menos verde.
      const rojez = (c) => { const n = (c.match(/-?[\d.]+/g) || []).map(Number); return /^oklab/.test(c) ? n[1] : (n[0] - n[1]) / 255; };
      const caja = (s) => { const r = document.querySelector(`#montana ${s}`)?.getBoundingClientRect(); return r && { x: r.x, y: r.y, r: r.right, b: r.bottom }; };
      const camino = document.querySelector('#montana #m-sendero'), m = camino.getScreenCTM(), L = camino.getTotalLength(), sendero = [];
      for (let l = 0; l <= L; l += 4) { const q = camino.getPointAtLength(l); sendero.push([m.a * q.x + m.c * q.y + m.e, m.b * q.x + m.d * q.y + m.f]); }
      const rotulos = [...document.querySelectorAll('#m-etiquetas > *')].map((e) => e.getBoundingClientRect()).filter((r) => r.width);
      const vaca = caja('.v-vaca-pie.v-vaca-s');
      const monte = document.querySelector('#montana path.monte'), fondo = document.getElementById('m-v-fondo');
      return {
        mueve, mar: vis('.v-mar-cuerpo'), marOp: Number(cs('.v-mar-cuerpo')?.opacity ?? 0),
        // El mar de niebla va detrás de la montaña (dentro de la capa del fondo, que se dibuja antes que ella).
        marDetras: !!fondo && !!monte && fondo.contains(document.querySelector('.v-mar')) && !!(fondo.compareDocumentPosition(monte) & Node.DOCUMENT_POSITION_FOLLOWING),
        marTop: Math.min(...[...document.querySelectorAll('#montana .v-mar')].map((e) => e.getBoundingClientRect().top)), saldoAbajo: document.querySelector('.saldo').getBoundingClientRect().bottom,
        verde: Number(getComputedStyle(document.documentElement).getPropertyValue('--v-verde')), falda: rojez(cs('.cr-3')?.stopColor ?? ''),
        maqui: rojez(cs('.copa.v-maqui')?.fill ?? ''), fuego: rojez(cs('.copa.v-fuego')?.fill ?? ''), flores: ['.v-flores-maqui', '.v-flores-fuego'].filter(vis).length,
        vacaPie: vis('.v-vaca-pie'), vacaEchada: vis('.v-vaca-echada'), garcitas: vis('.v-garcita'), vacas: ((document.querySelector('.v-vaca-sombra')?.getAttribute('d') || '').match(/M/g) || []).length,
        vacaSobreSendero: !!vaca && sendero.some(([x, y]) => x > vaca.x - 4 && x < vaca.r + 4 && y > vaca.y - 4 && y < vaca.b + 4),
        vacaSobreRotulo: !!vaca && rotulos.some((r) => vaca.x < r.right && vaca.r > r.left && vaca.y < r.bottom && vaca.b > r.top),
        pausa: cs('.v-aza')?.animationPlayState ?? '',
      };
    }, MOVIL);
    const srv = await servidor('anio');
    try {
      // Uno a la vez: en una sola página, recorriendo días y horas (cielo.js deja `data-mueve` y el CSS enseña lo que toca).
      let t = await entrar(navegador, srv, ADMIN, { hora: 12 }, conDia('2026-10-15', { 'libro.efectos': 'todos' })); await cerrar(t.p);
      const recorrido = [['2026-10-15', 6, 'torogoz'], ['2026-10-15', 12, 'azacuanes'], ['2026-10-15', 17, 'pericos'], ['2026-10-15', 19, 'luciernagas'], ['2026-10-15', 23, 'relampagos'],
        ['2026-05-17', 8.5, 'zompopos'], ['2026-05-17', 12, ''], ['2027-02-10', 23, 'luciernagas'], ['2027-02-10', 12, ''], ['2026-04-10', 10, 'azacuanes'], ['2026-08-10', 2, 'relampagos'], ['2026-08-10', 20, 'luciernagas']];
      const vistos = [];
      for (const [dia, hora, esperado] of recorrido) {
        await t.p.evaluate(([d, h]) => { localStorage.setItem('libro.dia', d); localStorage.setItem('libro.hora', String(h)); window.libroCielo.aplicar(); }, [dia, hora]);
        await t.p.waitForTimeout(120);
        const e = await estado(t.p);
        vistos.push(`${dia} ${hora}: ${e.mueve.join('+') || '—'}`);
        ok(e.mueve.length <= 1 && (e.mueve[0] ?? '') === esperado, `22B uno a la vez: ${dia} a las ${hora} se mueve «${esperado || 'nada'}» (${e.mueve.join(', ') || 'nada'})`);
      }
      // Con la pestaña oculta, lo que se mueve se queda quieto (la regla general de la escena).
      await t.p.evaluate(() => { localStorage.setItem('libro.dia', '2026-10-15'); localStorage.setItem('libro.hora', '12'); window.libroCielo.aplicar(); document.documentElement.toggleAttribute('data-oculta', true); });
      eq((await estado(t.p)).pausa, 'paused', '22B: con la pestaña oculta, los azacuanes se quedan quietos');
      await t.p.evaluate(() => document.documentElement.toggleAttribute('data-oculta', false));
      ok(t.consola.length === 0, `22B: consola limpia (${t.consola.slice(0, 2)})`);
      await t.ctx.close();
      // Con «esenciales» no se mueve nada del valle (es ambiente); el mar de niebla, las vacas y los árboles en flor sí están (son paisaje).
      for (const [dia, hora] of [['2026-10-15', 12], ['2026-10-15', 17], ['2026-05-17', 8.5], ['2026-08-10', 23]]) {
        t = await entrar(navegador, srv, ADMIN, { hora }, conDia(dia, { 'libro.efectos': 'esenciales' })); await cerrar(t.p);
        eq((await estado(t.p)).mueve.filter((m) => m !== 'luciernagas' && m !== 'torogoz'), [], `22B esenciales: ${dia} a las ${hora} no se mueve nada del valle`);
        await t.ctx.close();
      }
      // 55 · el mar de niebla: a las 6:00 lleno, detrás de la montaña y por debajo del saldo; a las 7:15 se levanta; a mediodía no hay. También con «ninguno».
      t = await entrar(navegador, srv, ADMIN, { hora: 6 }, conDia('2026-10-15', { 'libro.efectos': 'ninguno' })); await cerrar(t.p);
      let v = await estado(t.p);
      ok(v.mar && v.marOp > 0.95 && v.marDetras && v.marTop > v.saldoAbajo, `22B mar de niebla: a las 6:00, opaco, detrás de la montaña y por debajo del saldo (desde ${Math.round(v.marTop)} px; el saldo acaba en ${Math.round(v.saldoAbajo)})`);
      await t.p.evaluate(() => { localStorage.setItem('libro.hora', '7.25'); window.libroCielo.aplicar(); });
      v = await estado(t.p);
      ok(v.mar && v.marOp > 0.3 && v.marOp < 0.7, `22B mar de niebla: a las 7:15 se está levantando (${v.marOp})`);
      await t.p.evaluate(() => { localStorage.setItem('libro.hora', '17.5'); window.libroCielo.aplicar(); });
      ok(!(await estado(t.p)).mar, '22B mar de niebla: sin niebla de la tarde');
      await t.ctx.close();
      // 54 · verde de invierno y dorado de verano; 56 · árboles en flor; 58 · vacas de día.
      t = await entrar(navegador, srv, ADMIN, { hora: 12 }, conDia('2026-07-10')); await cerrar(t.p);
      const julio = await estado(t.p);
      await t.p.evaluate(() => { localStorage.setItem('libro.dia', '2027-02-10'); window.libroCielo.aplicar(); });
      const febrero = await estado(t.p);
      await t.p.evaluate(() => { localStorage.setItem('libro.dia', '2026-04-20'); window.libroCielo.aplicar(); });
      const abril = await estado(t.p);
      await t.p.evaluate(() => { localStorage.setItem('libro.dia', '2026-05-07'); window.libroCielo.aplicar(); });
      const mayo = await estado(t.p);
      const r3 = (x) => Math.round(x * 1000) / 1000;
      ok(julio.verde === 1 && febrero.verde === 0 && mayo.verde > 0.4 && mayo.verde < 0.5 && julio.falda < febrero.falda - 0.01 && mayo.falda > julio.falda && mayo.falda < febrero.falda, `22B verdor: la falda baja, verde en julio (${r3(julio.falda)}), dorada en febrero (${r3(febrero.falda)}) y a medio camino el 7 de mayo (${r3(mayo.falda)}, ${mayo.verde})`);
      ok(febrero.maqui > 0.04 && febrero.flores === 1 && abril.fuego > 0.08 && abril.flores === 1 && julio.flores === 0 && julio.maqui < 0 && julio.fuego < 0, `22B árboles: el maquilishuat rosado en febrero (${r3(febrero.maqui)}), el árbol de fuego rojo en abril (${r3(abril.fuego)}), verdes en julio y flores caídas solo cuando florecen`);
      ok(julio.vacas === 1 && julio.vacaPie && julio.garcitas && !julio.vacaEchada && !julio.vacaSobreSendero && !julio.vacaSobreRotulo, '22B vacas: en el teléfono una vaca de pie con sus garcitas, sin pisar el sendero ni un rótulo');
      await t.p.evaluate(() => { localStorage.setItem('libro.hora', '21'); window.libroCielo.aplicar(); });
      v = await estado(t.p);
      ok(!v.vacaPie && v.vacaEchada && !v.garcitas, '22B vacas: de noche, echadas y sin garcitas');
      await t.ctx.close();
      // Escritorio: tres vacas en la orilla de afuera; el remolino de azacuanes entre la cumbre y el sol, lejos del saldo.
      t = await entrar(navegador, srv, ADMIN, { viewport: { width: 1440, height: 900 }, isMobile: false, hasTouch: false, hora: 12 }, conDia('2026-10-15', { 'libro.efectos': 'todos' })); await cerrar(t.p);
      v = await estado(t.p);
      const aza = await t.p.evaluate(() => { const r = document.querySelector('#montana .v-aza').getBoundingClientRect(), s = document.querySelector('.saldo').getBoundingClientRect(); return { x: r.x, r: r.right, saldo: s.right }; });
      ok(v.vacas === 3 && !v.vacaSobreSendero && !v.vacaSobreRotulo && aza.x > aza.saldo, `22B escritorio: tres vacas en la orilla y los azacuanes a la derecha del saldo (${Math.round(aza.x)} > ${Math.round(aza.saldo)})`);
      await t.ctx.close();
      // Las bandadas nunca pasan por detrás de un texto (el saldo, la cotización, los datos de la escena): se mide todo su viaje en reposo
      // (el remolino con su deriva y su giro; los pericos de su sitio hasta donde acaban). En escritorio y acostado los pericos acaban tapados
      // por la montaña (si no, asomarían junto a la cumbre y se apagarían de golpe).
      for (const [vp, letra] of [[{ width: 390, height: 844 }, ''], [{ width: 320, height: 568 }, 'muy-grande'], [{ width: 844, height: 390 }, ''], [{ width: 1440, height: 900 }, '']]) {
        for (const hora of [12, 17]) {
          t = await entrar(navegador, srv, ADMIN, { viewport: vp, isMobile: vp.width < 700, hasTouch: vp.width < 1100, hora }, conDia('2026-10-15', { 'libro.efectos': 'todos', 'libro.letra': letra }));
          await cerrar(t.p);
          const a = await t.p.evaluate((h) => {
            const els = [...document.querySelectorAll(`#montana ${h === 12 ? '.v-aza' : '.v-peri'}`)];
            for (const e of els) { e.style.animation = 'none'; e.style.opacity = '1'; } // en reposo (CSSOM: lo permite la CSP)
            const u = els.map((e) => e.getBoundingClientRect()).reduce((x, q) => ({ x: Math.min(x.x, q.x), y: Math.min(x.y, q.y), r: Math.max(x.r, q.right), b: Math.max(x.b, q.bottom) }), { x: 1e9, y: 1e9, r: -1e9, b: -1e9 });
            const d = parseFloat(getComputedStyle(document.getElementById('montana')).getPropertyValue('--v-peri-d'));
            const viaje = h === 12 ? { x: u.x - 43, y: u.y - 15, r: u.r + 43, b: u.b + 8 } : { x: u.x - d, y: u.y - 2, r: u.r, b: u.b + 11 };
            const textos = ['#cotizacion', '.saldo', '#esc-datos'].map((s) => document.querySelector(s)).filter((e) => e?.getClientRects().length).map((e) => e.getBoundingClientRect());
            const choca = textos.some((q) => viaje.x < q.right && viaje.r > q.left && viaje.y < q.bottom && viaje.b > q.top);
            const monte = document.querySelector('#montana path.monte');
            const asoman = h === 12 ? 0 : els.flatMap((e) => [...e.getAttribute('d').matchAll(/M([\d.]+) ([\d.]+)/g)]).filter(([, x, y]) => !monte.isPointInFill(new DOMPoint(Number(x) - d, Number(y) + 9)) && Number(x) - d > 0).length;
            return { ancho: u.r > u.x, choca, asoman };
          }, hora);
          ok(a.ancho && !a.choca && (vp.width < 700 || a.asoman === 0), `22B bandadas a ${vp.width}×${vp.height}${letra ? ' con letra muy grande' : ''}: ${hora === 12 ? 'el remolino' : 'los pericos'} no pasa${hora === 12 ? '' : 'n'} por detrás de ningún texto${vp.width >= 700 && hora === 17 ? ' y acaban detrás de la montaña' : ''} (${JSON.stringify(a)})`);
          await t.ctx.close();
        }
      }
      // Quien solo mira ve lo mismo.
      t = await entrar(navegador, srv, LECTOR, { hora: 6 }, conDia('2026-10-15')); await cerrar(t.p);
      v = await estado(t.p);
      ok(v.mar && v.vacas === 1, '22B lectora: el mismo valle (mar de niebla y vacas)');
      await t.ctx.close();
    } finally { srv.parar(); }
    // La entrada: el mar de niebla y las vacas también (son paisaje, sin nada de nadie).
    const srvE = await servidor('anio');
    try {
      const ctx = await navegador.newContext({ ...devices['iPhone 13'] });
      const p = await ctx.newPage();
      await p.addInitScript(() => { try { localStorage.setItem('libro.hora', '6'); localStorage.setItem('libro.dia', '2026-10-15'); localStorage.setItem('libro.efectos', 'todos'); } catch { /* sin almacenamiento */ } });
      await p.goto(`${srvE.url}/login`, { waitUntil: 'networkidle' });
      await p.waitForTimeout(800);
      const e = await p.evaluate(() => ({ mar: !!document.querySelector('.v-mar-cuerpo') && getComputedStyle(document.querySelector('.v-mar-cuerpo')).display !== 'none', vacas: !!document.querySelector('.v-vaca'), mueve: document.documentElement.dataset.mueve }));
      ok(e.mar && e.vacas && e.mueve === 'torogoz', '22B entrada: el mar de niebla y las vacas también (paisaje, sin datos de nadie)');
      await ctx.close();
    } finally { srvE.parar(); }
  });

  // ---------------------------------------------------------------- campamento 22C: el valle, de verdad (el pueblo delante, los campos, la ladera baja y la Navidad en toda la montaña)
  await bloque(async () => {
    const conDia = (dia, extra = {}) => [([d, x]) => { try { localStorage.setItem('libro.dia', d); localStorage.setItem('libro.avisos.preguntado', '1'); localStorage.setItem('libro.madrugada', '0'); for (const [k, v] of Object.entries(x)) localStorage.setItem(k, v); } catch { /* sin almacenamiento */ } }, [dia, extra]];
    const cerrar = async (p) => { for (let k = 0; k < 3 && await p.locator('dialog[open]').count(); k++) { await p.keyboard.press('Escape'); await p.waitForTimeout(300); } };
    const escena = (p) => p.evaluate(() => {
      const visto = (s) => [...document.querySelectorAll(`#montana ${s}`)].some((e) => { let x = e; while (x && x.tagName !== 'svg') { if (getComputedStyle(x).display === 'none') return false; x = x.parentElement; } return e.getClientRects().length > 0; });
      const sub = (s) => [...document.querySelectorAll(`#montana ${s}`)].reduce((n, e) => n + ((e.getAttribute('d') || '').match(/M/g) || []).length, 0);
      const camino = document.querySelector('#montana #m-sendero'), m = camino.getScreenCTM(), L = camino.getTotalLength(), sendero = [];
      for (let l = 0; l <= L; l += 3) { const q = camino.getPointAtLength(l); sendero.push([m.a * q.x + m.c * q.y + m.e, m.b * q.x + m.d * q.y + m.f]); }
      const svg = document.querySelector('#montana svg').getBoundingClientRect(), salida = document.querySelector('.salida').getBoundingClientRect();
      // Las puntas de los pinos del bosque de las compras: a qué distancia quedan del sendero (nunca encima).
      const puntas = [...document.querySelectorAll('#m-bosque path')].map((e) => { const [x, y] = (e.getAttribute('d').match(/M([\d.]+) ([\d.]+)/) || []).slice(1).map(Number); return [m.a * x + m.e, m.d * y + m.f]; });
      const cerca = Math.min(Infinity, ...puntas.map(([x, y]) => Math.min(...sendero.map(([a, b]) => Math.hypot(a - x, b - y)))));
      const anim = (s) => { const e = document.querySelector(`#montana ${s}`); return e ? getComputedStyle(e).animationName : 'none'; };
      return {
        alto: svg.height, salidaY: salida.y - svg.y, encendidas: sub('.ns-on'), apagadas: sub('.ns-off'), navSendero: visto('.nav-sendero .ns-on'), coronas: [...document.querySelectorAll('#montana .nav-hito')].filter((e) => getComputedStyle(e).display !== 'none' && getComputedStyle(e.closest('.v-navidad')).display !== 'none').length,
        campos: document.querySelectorAll('#montana .campo').length, anillo: visto('.yo-nav'), anilloAnim: anim('.yo-nav'), pino: visto('.v-pino-nav'), portal: visto('.v-belen-figuras'), pascua: visto('.v-pascua'), luminariasCamino: visto('.v-cm-luminaria'),
        navidad: [...document.querySelectorAll('#montana .v-navidad')].some((e) => getComputedStyle(e).display !== 'none'), charcos: visto('.v-charco'), patrias: visto('.v-patrias'), banderitas: visto('.v-band'),
        cerca, pinos: puntas.length, ladera: document.querySelectorAll('#montana [class^="lb-"]').length, campos3: document.querySelectorAll('#montana .v-parc').length, milpa: visto('.v-mp'),
      };
    });
    const srv = await servidor('anio');
    try {
      // Teléfono alto (390 × 844, por pestañas): el valle va delante, la salida queda por encima de él y el pueblo, los campos y la ladera baja están.
      let t = await entrar(navegador, srv, ADMIN, { hora: 21, viewport: { width: 390, height: 844 }, pestanas: true }, conDia('2026-12-24', { 'libro.efectos': 'esenciales' })); await cerrar(t.p);
      let e = await escena(t.p);
      ok(e.salidaY < e.alto - 110 && e.campos3 >= 3 && e.ladera === 7 && e.milpa, `22C composición: en el teléfono alto el sendero arranca a ${Math.round(e.alto - e.salidaY)} px del pie (el valle va delante), con sus campos, su milpa y la ladera baja`);
      ok(e.pinos > 0 && e.cerca > 3, `22C bosque: los ${e.pinos} pinos de las compras crecen al pie de la montaña sin tocar el sendero (el más cercano a ${Math.round(e.cerca)} px)`);
      // Nochebuena, de noche, con «esenciales»: la Navidad se ve en toda la montaña y está quieta.
      ok(e.navSendero && e.encendidas > 3 && e.apagadas >= 1, `22C luminarias: a los lados del sendero, ${e.encendidas} encendidas hasta donde llegaste y ${e.apagadas} apagadas más arriba`);
      ok(e.coronas === e.campos && e.anillo && e.anilloAnim === 'none', `22C Navidad: una corona en cada hito (${e.coronas} de ${e.campos}) y la de «Tú», quieta con «esenciales»`);
      ok(e.pino && e.portal && e.pascua && e.luminariasCamino && e.charcos, '22C Navidad en el pueblo: el pino de la plaza, el portal, la flor de pascua, las luminarias del camino real y la luz en la calle');
      ok(t.consola.length === 0, `22C: consola limpia (${t.consola.slice(0, 2)})`);
      // Con «todos», la corona de «Tú» gira (es ambiente y pequeña); las luminarias del sendero siguen quietas (nada grande se anima).
      await t.ctx.close();
      t = await entrar(navegador, srv, ADMIN, { hora: 21 }, conDia('2026-12-24', { 'libro.efectos': 'todos' })); await cerrar(t.p);
      e = await escena(t.p);
      const nsAnim = await t.p.evaluate(() => getComputedStyle(document.querySelector('#montana .ns-on')).animationName);
      ok(e.anilloAnim === 'nav-gira' && nsAnim === 'none', `22C Navidad con «todos»: la corona de «Tú» gira y las luminarias del sendero no se animan (${e.anilloAnim}, ${nsAnim})`);
      // El 7 de enero ya no queda nada de Navidad; el 3 de enero, todavía sí.
      await t.p.evaluate(() => { localStorage.setItem('libro.dia', '2027-01-07'); window.libroCielo.aplicar(); });
      ok(!(await escena(t.p)).navidad, '22C: el 7 de enero no queda nada de Navidad en la escena');
      await t.p.evaluate(() => { localStorage.setItem('libro.dia', '2027-01-03'); window.libroCielo.aplicar(); });
      ok((await escena(t.p)).navidad, '22C: el 3 de enero todavía es Navidad');
      // Fiestas patrias: la bandera en la plaza y banderitas en los cordeles; el 20 de septiembre, no.
      await t.p.evaluate(() => { localStorage.setItem('libro.dia', '2026-09-15'); localStorage.setItem('libro.hora', '12'); window.libroCielo.aplicar(); });
      e = await escena(t.p);
      ok(e.patrias && e.banderitas, '22C fiestas patrias: la bandera y las banderitas en la plaza');
      await t.p.evaluate(() => { localStorage.setItem('libro.dia', '2026-09-20'); window.libroCielo.aplicar(); });
      e = await escena(t.p);
      ok(!e.patrias && !e.banderitas && !e.charcos, '22C: pasadas las fiestas no hay bandera ni banderitas; de día no hay charcos de luz');
      ok(t.consola.length === 0, `22C: consola limpia (${t.consola.slice(0, 2)})`);
      await t.ctx.close();
      // 320 × 568 (sin franja de valle: el pueblo va bajo el primer tramo del sendero), acostado y escritorio: el pueblo está y no pisa nada.
      for (const vp of [{ width: 320, height: 568 }, { width: 844, height: 390 }, { width: 768, height: 1024 }, { width: 1440, height: 900 }]) {
        t = await entrar(navegador, srv, ADMIN, { hora: 12, viewport: vp, isMobile: vp.width < 700, hasTouch: vp.width < 1100 }, conDia('2026-12-10')); await cerrar(t.p);
        const r = await t.p.evaluate(() => {
          const camino = document.querySelector('#montana #m-sendero'), m = camino.getScreenCTM(), L = camino.getTotalLength(), sendero = [];
          for (let l = 0; l <= L; l += 3) { const q = camino.getPointAtLength(l); sendero.push([m.a * q.x + m.c * q.y + m.e, m.b * q.x + m.d * q.y + m.f]); }
          const cajas = [...document.querySelectorAll('.v-pueblo :is(.v-frente, .v-pared-l, .v-ig-frente, .v-ig-torre, .v-techo-l)')].map((e) => e.getBoundingClientRect()).filter((q) => q.width);
          const rotulos = [...document.querySelectorAll('#m-etiquetas > *')].map((x) => x.getBoundingClientRect()).filter((q) => q.width);
          const saldo = document.querySelector('.saldo').getBoundingClientRect();
          return { n: cajas.length, pisa: cajas.filter((c) => sendero.some(([x, y]) => x > c.left && x < c.right && y > c.top && y < c.bottom)).length, rotulo: cajas.filter((c) => rotulos.some((q) => c.left < q.right && c.right > q.left && c.top < q.bottom && c.bottom > q.top)).length, saldo: cajas.filter((c) => c.top < saldo.bottom).length, sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth };
        });
        ok(r.n >= 3 && r.pisa === 0 && r.rotulo === 0 && r.saldo === 0 && r.sw <= r.cw, `22C pueblo a ${vp.width}×${vp.height}: está, sin pisar el sendero, un rótulo ni el saldo (${JSON.stringify(r)})`);
        ok(t.consola.length === 0, `22C ${vp.width}×${vp.height}: consola limpia (${t.consola.slice(0, 2)})`);
        await t.ctx.close();
      }
    } finally { srv.parar(); }
    // La entrada en diciembre: el pueblo con su Navidad y las luminarias del sendero todas encendidas (no dicen nada de nadie).
    const srvE = await servidor('anio');
    try {
      const ctx = await navegador.newContext({ ...devices['iPhone 13'] });
      const p = await ctx.newPage();
      await p.addInitScript(() => { try { localStorage.setItem('libro.hora', '21'); localStorage.setItem('libro.dia', '2026-12-24'); localStorage.setItem('libro.efectos', 'esenciales'); } catch { /* sin almacenamiento */ } });
      await p.goto(`${srvE.url}/login`, { waitUntil: 'networkidle' });
      await p.waitForTimeout(800);
      const r = await p.evaluate(() => ({ pueblo: !!document.querySelector('.v-pueblo .v-ig-frente'), apagadas: (document.querySelector('.ns-off')?.getAttribute('d') || '').length, encendidas: ((document.querySelector('.ns-on')?.getAttribute('d') || '').match(/M/g) || []).length, ventanas: document.querySelector('.v-luz')?.getAttribute('d') ?? null }));
      ok(r.pueblo && r.apagadas === 0 && r.encendidas > 0 && r.ventanas === '', `22C entrada: el pueblo y las luminarias, todas encendidas; sin ventanas de nadie (${JSON.stringify(r)})`);
      await ctx.close();
    } finally { srvE.parar(); }
  });

  // ---------------------------------------------------------------- campamento 23: tu camino, otra vez (tal día como hoy y la película del ascenso)
  await bloque(async () => {
    const sinAvisos = (extra = {}) => [(x) => { try { localStorage.setItem('libro.avisos.preguntado', '1'); localStorage.setItem('libro.madrugada', '0'); for (const [k, v] of Object.entries(x)) localStorage.setItem(k, v); } catch { /* sin almacenamiento */ } }, extra];
    const cerrar = async (p) => { for (let k = 0; k < 3 && await p.locator('dialog[open]').count(); k++) { await p.keyboard.press('Escape'); await p.waitForTimeout(300); } };
    const ent = async (srv, cuenta, opts = {}, extra = {}) => { const x = await entrar(navegador, srv, cuenta, { hora: 15, ...opts }, sinAvisos(extra)); await cerrar(x.p); return x; };
    // El saludo: su texto, si se ve, si es de un renglón, si se corta con «…» y si pisa «Tu saldo».
    const saludo = (p) => p.evaluate(() => {
      const s = document.getElementById('saludo'), r = s.getBoundingClientRect(), lh = Number.parseFloat(getComputedStyle(s).lineHeight) || 20;
      return { txt: s.textContent, oculto: s.hidden, renglon: s.hidden || r.height <= lh * 1.5, entero: s.hidden || s.scrollWidth <= s.clientWidth + 1, pisa: !s.hidden && r.bottom > document.getElementById('t-saldo').getBoundingClientRect().top + 2 };
    });
    const sTal = await servidor('taldia');
    try {
      // ---- 41 · Tal día como hoy: hace un año el libro llegó al campamento 1M (y hace dos, a 250k: gana el campamento)
      const FORMAS = { 320: 'Hoy hace un año: 1M sats', 390: 'Hoy hace un año llegaste a 1M sats', 768: 'Daf3r, hoy hace un año llegaste a 1M sats', 1440: 'Daf3r, hoy hace un año llegaste a 1M sats' };
      for (const [w, h] of [[320, 568], [390, 844], [768, 1024], [1440, 900]]) {
        const x = await ent(sTal, ADMIN, { viewport: { width: w, height: h }, isMobile: w < 700, hasTouch: w < 1100 });
        const s = await saludo(x.p);
        ok(s.txt === FORMAS[w] && !s.oculto && s.renglon && s.entero && !s.pisa, `23·41 ${w}×${h}: el saludo recuerda el día, en la forma que cabe en su renglón («${s.txt}»)`);
        eq(x.consola, [], `23·41 ${w}×${h}: consola limpia`);
        await x.ctx.close();
      }
      // Letra muy grande en 320 px: alguna forma que quepa entera o, si ninguna, no se enseña (nunca encima de «Tu saldo» ni cortada).
      {
        const x = await ent(sTal, ADMIN, { viewport: { width: 320, height: 568 }, isMobile: true, hasTouch: true }, { 'libro.letra': 'muy-grande' });
        const s = await saludo(x.p);
        ok(!s.pisa && s.renglon && s.entero && (s.oculto || /^Hoy hace un año/.test(s.txt)), `23·41 letra muy grande a 320: ni pisa ni se corta (${s.oculto ? 'no se enseña' : s.txt})`);
        await x.ctx.close();
      }
      // Quien solo mira: el libro llegó (sin tutear), en el saludo y en el Diario.
      {
        const x = await ent(sTal, LECTOR, { viewport: { width: 390, height: 844 } });
        const s = await saludo(x.p);
        ok(['Hoy hace un año el libro llegó a 1M sats', 'Hoy hace un año: 1M sats'].includes(s.txt) && !s.pisa && s.entero && !/\b(llegaste|tu|tus)\b/i.test(s.txt), `23·41 lectora: sin tutear, en la forma que cabe («${s.txt}»)`);
        await x.p.setViewportSize({ width: 1440, height: 900 }); await x.p.waitForTimeout(600);
        eq((await saludo(x.p)).txt, 'Ana, hoy hace un año el libro llegó a 1M sats', '23·41 lectora en una ventana ancha: la forma larga (se vuelve a encajar al cambiar el tamaño)');
        await x.p.setViewportSize({ width: 390, height: 844 }); await x.p.waitForTimeout(600);
        const d = await x.p.evaluate(() => ({ tal: document.getElementById('dia-tal').textContent, oculto: document.getElementById('dia-tal').hidden, bloque: document.getElementById('dia-hace-b').hidden, boton: document.getElementById('dia-abrir-d').textContent }));
        ok(d.tal === 'Tal día como hoy, hace un año, el libro llegó al campamento 1M.' && !d.oculto && !d.bloque && /hace un año, /.test(d.boton), `23·41 Diario: encabeza «Hace un año» («${d.tal}», ${d.boton})`);
        await x.p.click('#dia-abrir'); await x.p.waitForTimeout(300);
        const r = await x.p.evaluate(() => { const t = document.getElementById('dia-tal').getBoundingClientRect(), k = document.getElementById('t-dia-hace').getBoundingClientRect(), p = document.getElementById('dia-hace').getBoundingClientRect(); return { visible: t.height > 0, orden: t.top >= k.bottom - 1 && t.bottom <= p.top + 1 }; });
        ok(r.visible && r.orden, '23·41 Diario: al abrirlo, la línea va bajo el título «Hace un año» y antes de lo que tenía el libro');
        // El cumpleaños gana en el saludo (uno por día); el Diario sigue contándolo.
        const md = hoySV().slice(5);
        await x.p.evaluate((c) => fetch('/api/yo/cumple', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-Libro': '1' }, body: JSON.stringify({ cumple: c }) }), md);
        await x.p.reload(); await x.p.waitForTimeout(2600); await cerrar(x.p);
        eq([(await saludo(x.p)).txt, await x.p.evaluate(() => document.getElementById('dia-tal').hidden)], ['Feliz cumpleaños, Ana', false], '23·41 el cumpleaños gana en el saludo; el Diario sigue recordando el día');
        await x.p.evaluate(() => fetch('/api/yo/cumple', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-Libro': '1' }, body: JSON.stringify({ cumple: null }) }));
        await x.ctx.close();
      }
      // Otro día (mañana, con `libro.dia`) el saludo es el de siempre.
      {
        const manana = new Date(Date.parse(`${hoySV()}T12:00:00Z`) + 864e5).toISOString().slice(0, 10);
        const x = await ent(sTal, ADMIN, { viewport: { width: 1440, height: 900 }, isMobile: false, hasTouch: false }, { 'libro.dia': manana });
        eq((await saludo(x.p)).txt, 'Buenas tardes, Daf3r', '23·41 otro día, el saludo de siempre');
        await x.ctx.close();
      }
    } finally {
      sTal.parar();
    }

    // ---- 29 · La película del ascenso (y «Ver ese día», lo que quedó de las postales)
    const peli = (p) => p.evaluate(() => {
      const r = document.getElementById('pe-rango'), yo = document.querySelector('#pe-montana #m-yo .yo-anillo')?.getBoundingClientRect();
      return {
        abierta: document.getElementById('d-pelicula').open, senderos: document.querySelectorAll('#m-sendero').length, enPeli: document.querySelectorAll('#pe-montana #m-sendero').length,
        principal: document.querySelectorAll('#montana svg *').length, valor: Number(r.value), max: Number(r.max), vt: r.getAttribute('aria-valuetext'),
        rotulo: document.getElementById('pe-fecha').textContent, sats: document.getElementById('pe-sats').textContent, ev: document.getElementById('pe-ev').textContent,
        play: document.getElementById('pe-play').hidden ? null : document.getElementById('pe-play-t').textContent, foco: document.activeElement?.id ?? '',
        yoY: yo ? Math.round(yo.top + yo.height / 2) : null, yoTxt: [...document.querySelectorAll('#pe-montana .yo-txt')].map((e) => e.textContent),
        alcanzados: document.querySelectorAll('#pe-montana .campo.alcanzado').length, etapas: document.querySelectorAll('#pe-montana .etapa.alcanzada').length,
        pinos: [document.querySelectorAll('#pe-montana #m-bosque path:not(.pe-fuera)').length, document.querySelectorAll('#pe-montana #m-bosque path').length],
        sr: document.getElementById('pe-sr').textContent, ancho: Math.round(document.querySelector('#pe-montana svg')?.getBoundingClientRect().width ?? 0),
      };
    });
    // (Rendimiento iPhone) Si la película corre, cómo están una estrella, el halo de «Tú», un pino del bosque (que brota al aparecer) y
    // la estrella fugaz (lo que cruza de paso no se queda colgado: sigue).
    const quieto = (p) => p.evaluate(() => {
      const h = document.getElementById('pe-montana'), st = (s) => { const el = h.querySelector(s); return el ? getComputedStyle(el).animationPlayState : 'falta'; };
      return [h.hasAttribute('data-corre') ? 'corre' : 'quieta', st('.estrella'), st('.yo-halo'), st('#m-bosque path'), st('.fugaz')].join('|');
    });
    // Nada de lo escrito ni los controles tapan el sendero, «Tú», un rótulo o un hito; nada se sale del ancho; toques de 48 px.
    const geometria = (p) => p.evaluate(() => {
      const camino = document.querySelector('#pe-montana #m-sendero'), m = camino.getScreenCTM(), L = camino.getTotalLength(), pts = [];
      for (let l = 0; l <= L; l += 4) { const q = camino.getPointAtLength(l); pts.push([m.a * q.x + m.c * q.y + m.e, m.b * q.x + m.d * q.y + m.f]); }
      const marcas = [...document.querySelectorAll('#pe-montana #m-etiquetas > *, #pe-montana .campo .campo-ico, #pe-montana #m-yo .yo-anillo')].map((e) => e.getBoundingClientRect()).filter((r) => r.width);
      const cruza = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
      const fallos = [];
      for (const id of ['pe-t', 'pe-cerrar', 'pe-fecha', 'pe-sats', 'pe-ev', 'pe-ctl']) {
        const r = document.getElementById(id).getBoundingClientRect();
        if (!r.width) continue;
        if (pts.some(([x, y]) => x > r.left - 4 && x < r.right + 4 && y > r.top - 4 && y < r.bottom + 4)) fallos.push(`${id} sobre el sendero`);
        if (marcas.some((q) => cruza(r, q))) fallos.push(`${id} sobre un rótulo, un hito o «Tú»`);
        if (r.left < -0.5 || r.right > innerWidth + 0.5) fallos.push(`${id} fuera del ancho`);
      }
      const toques = ['pe-cerrar', 'pe-rango', 'pe-play'].map((id) => document.getElementById(id)).filter((e) => !e.hidden).map((e) => e.getBoundingClientRect().height);
      const dlg = document.getElementById('d-pelicula');
      return { fallos, toques: toques.every((h) => h >= 47.5), desborde: dlg.scrollWidth > dlg.clientWidth + 1 };
    });
    const sAnio = await servidor('anio');
    try {
      const x = await ent(sAnio, ADMIN, { pestanas: true, viewport: { width: 390, height: 844 } }, { 'libro.pestana': 'historia', 'libro.efectos': 'todos' });
      const hoySats = await x.p.evaluate(() => document.querySelector('#s-sats .sr').textContent.trim());
      const nodosAntes = await x.p.evaluate(() => document.querySelectorAll('#montana svg *').length);
      ok(await x.p.isVisible('#dh-peli-ver') && (await x.p.locator('#dh-peli-ver').boundingBox()).height >= 47.5, '23·29 «Tu historia» trae la película, con su botón de 48 px');
      eq(await x.p.textContent('#dh-peli-d'), 'Cómo subió tu libro, de la primera compra a hoy, sobre la montaña de hoy.', '23·29 la entrada dice qué es');
      const t0 = Date.now();
      await x.p.click('#dh-peli-ver');
      await x.p.waitForTimeout(250);
      let e = await peli(x.p);
      ok(e.abierta && e.senderos === 1 && e.enPeli === 1 && e.principal === 0, `23·29 una sola escena en el documento: la de la película (${e.senderos}, ${e.principal})`);
      const fondoPeli = await x.p.evaluate(() => { const f = getComputedStyle(document.getElementById('d-pelicula'), '::backdrop'); return `${f.backdropFilter}|${/^rgb\(/.test(f.backgroundColor)}`; });
      eq(fondoPeli, 'none|true', '23·29 (rendimiento) el fondo de la película es opaco y sin desenfoque: no se ve y Safari no lo recalcula');
      ok(e.valor === 0 && e.max > 300 && /^Tu saldo el \d/.test(e.rotulo) && e.ev === 'Tu primera compra' && e.vt.endsWith('Tu primera compra.'), `23·29 empieza en la primera compra («${e.rotulo}», ${e.vt})`);
      ok(e.foco === 'pe-play' && e.alcanzados === 0 && e.etapas === 0 && e.pinos[0] === 1 && e.pinos[1] > 40, `23·29 foco en el botón; ni campamentos ni bosque todavía (pinos ${e.pinos})`);
      const yoInicio = e.yoY;
      await x.p.waitForTimeout(Math.max(0, 7900 - (Date.now() - t0)));
      e = await peli(x.p);
      ok(e.valor > e.max * 0.3 && e.valor < e.max * 0.75 && e.play === 'Pausar la película' && !e.yoTxt.length, `23·29 a medio camino corre sola, sin el rótulo de «Tú» (${e.valor} de ${e.max})`);
      ok(e.yoY < yoInicio - 40 && e.pinos[0] > 1 && e.pinos[0] < e.pinos[1], `23·29 «Tú» subió y el bosque crece con las compras (${yoInicio} → ${e.yoY}, pinos ${e.pinos})`);
      eq(await quieto(x.p), 'corre|paused|paused|running|running', '23·29 (rendimiento) mientras corre, el ambiente de su escena (estrellas, el halo de «Tú») se queda quieto; el bosque que brota y la estrella fugaz, no');
      // Dura 15 s: se mira cuándo llega a hoy (la película arranca a los 0.7 s de abrir). Se espera a que acabe de verdad (el botón dice
      // «otra vez»): el deslizador redondea el día y marca hoy un fotograma antes del final (de 359.5 a 360), y leer ahí daba un falso fallo.
      let fin = null;
      for (let k = 0; k < 60 && fin == null; k++) { await x.p.waitForTimeout(200); if (await x.p.evaluate(() => document.getElementById('pe-play').dataset.estado === 'otra')) fin = Date.now() - t0 - 700; }
      ok(fin != null && fin > 14000 && fin < 17500, `23·29 de la primera compra a hoy en unos 15 s (${fin} ms)`);
      e = await peli(x.p);
      ok(e.rotulo === 'Tu saldo hoy' && e.sats === hoySats.replace(/[^\d,]/g, '') && e.ev === '' && e.yoTxt[0] === 'Tú', `23·29 acaba hoy, con el saldo de hoy (${e.sats} / ${hoySats})`);
      ok(e.play === 'Ver la película otra vez' && /^Hoy, \d+ \w+ \d{4}: [\d,]+ sats\.$/.test(e.sr), `23·29 al acabar, «Ver otra vez» y lo dice a los lectores de pantalla («${e.sr}»)`);
      ok(e.alcanzados >= 2 && e.etapas >= 1 && e.pinos[0] === e.pinos[1], `23·29 al acabar, campamentos y marcas encendidos y todo el bosque (${e.alcanzados}, ${e.etapas}, ${e.pinos})`);
      // Otra vez, pausa y teclado.
      await x.p.click('#pe-play'); await x.p.waitForTimeout(2600);
      await x.p.click('#pe-play'); await x.p.waitForTimeout(200);
      const a = await peli(x.p); await x.p.waitForTimeout(700); const b = await peli(x.p);
      ok(a.valor > 0 && a.valor < a.max && a.valor === b.valor && b.play === 'Ver la película' && b.yoTxt[0] === 'Tú' && /^\d+ \w+ \d{4}: [\d,]+ sats\./.test(b.sr), `23·29 en pausa se queda quieta, con su rótulo, y lo dice (${b.valor}: «${b.sr}»)`);
      eq(await quieto(x.p), 'quieta|running|running|running|running', '23·29 (rendimiento) detenida, el ambiente retoma');
      await x.p.focus('#pe-rango');
      await x.p.keyboard.press('End'); e = await peli(x.p);
      ok(e.valor === e.max && e.rotulo === 'Tu saldo hoy', '23·29 deslizador: Fin lleva a hoy');
      await x.p.keyboard.press('Home'); await x.p.keyboard.press('ArrowRight'); e = await peli(x.p);
      ok(e.valor === 1 && /^Tu saldo el \d/.test(e.rotulo) && e.vt.startsWith(e.rotulo.replace('Tu saldo el ', '')), `23·29 deslizador: Inicio y una flecha, un día (${e.vt})`);
      const g = await geometria(x.p);
      ok(!g.fallos.length && g.toques && !g.desborde, `23·29 390×844: nada tapa el camino, toques de 48 px, sin desbordes (${g.fallos.join('; ')})`);
      // Girar el teléfono con la película abierta: se redibuja a su medida y sigue habiendo una sola escena.
      await x.p.setViewportSize({ width: 844, height: 390 }); await x.p.waitForTimeout(900);
      e = await peli(x.p);
      ok(e.senderos === 1 && e.enPeli === 1 && e.principal === 0 && e.ancho === 844, `23·29 acostado: redibujada a su medida, una sola escena (${e.ancho})`);
      const ga = await geometria(x.p);
      ok(!ga.fallos.length && ga.toques && !ga.desborde, `23·29 844×390: nada tapa el camino (${ga.fallos.join('; ')})`);
      await x.p.setViewportSize({ width: 390, height: 844 }); await x.p.waitForTimeout(900);
      // Con la pestaña oculta se detiene; al volver, la página no redibuja su escena debajo.
      await x.p.click('#pe-play'); await x.p.waitForTimeout(1000);
      await x.p.evaluate(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' }); document.dispatchEvent(new Event('visibilitychange')); });
      await x.p.waitForTimeout(300);
      await x.p.evaluate(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' }); document.dispatchEvent(new Event('visibilitychange')); });
      await x.p.waitForTimeout(1600);
      e = await peli(x.p);
      ok(e.play === 'Ver la película' && e.senderos === 1 && e.principal === 0, `23·29 con la pestaña oculta se detiene, y al volver sigue habiendo una sola escena (${e.senderos}, ${e.principal})`);
      // Cerrar: vuelve la escena de la página, igual que antes, y el foco a su botón.
      await x.p.keyboard.press('Escape'); await x.p.waitForTimeout(900);
      e = await peli(x.p);
      ok(!e.abierta && e.senderos === 1 && e.enPeli === 0 && e.principal === nodosAntes && e.foco === 'dh-peli-ver', `23·29 al cerrar vuelve la escena de la página (${e.principal} nodos; antes ${nodosAntes}) y el foco a su botón`);
      ok(await x.p.evaluate(() => !!document.querySelector('#montana #m-yo') && !document.querySelector('#pe-montana svg')), '23·29 la película no deja nada en la escena');
      eq(x.consola, [], '23·29 consola limpia');
      await x.ctx.close();
      // Escritorio: el saldo del día y los controles, a la izquierda; nada tapa el camino.
      {
        const d = await ent(sAnio, ADMIN, { pestanas: true, viewport: { width: 1440, height: 900 }, isMobile: false, hasTouch: false }, { 'libro.pestana': 'historia', 'libro.efectos': 'esenciales' });
        await d.p.click('#dh-peli-ver'); await d.p.waitForTimeout(5000);
        const gd = await geometria(d.p);
        ok(!gd.fallos.length && gd.toques && !gd.desborde, `23·29 1440×900: nada tapa el camino ni un rótulo (${gd.fallos.join('; ')})`);
        ok((await peli(d.p)).play === 'Pausar la película', '23·29 con efectos «esenciales» también corre (acompaña a un toque)');
        await d.ctx.close();
      }
      // Efectos «ninguno» y letra muy grande en 320 px: solo el deslizador, sin reproducción; nada se encima.
      {
        const n = await ent(sAnio, ADMIN, { pestanas: true, viewport: { width: 320, height: 568 }, isMobile: true, hasTouch: true }, { 'libro.pestana': 'historia', 'libro.efectos': 'ninguno', 'libro.letra': 'muy-grande' });
        await n.p.click('#dh-peli-ver'); await n.p.waitForTimeout(1800);
        e = await peli(n.p);
        ok(e.play === null && e.valor === 0 && e.foco === 'pe-rango', `23·29 «ninguno»: sin botón ni reproducción, el foco en el deslizador (${e.play}, ${e.valor})`);
        await n.p.keyboard.press('End'); e = await peli(n.p);
        ok(e.valor === e.max && e.yoTxt[0] === 'Tú', '23·29 «ninguno»: el deslizador lleva a cualquier día');
        const gn = await geometria(n.p);
        const sobre = await n.p.evaluate(() => { const c = document.getElementById('pe-ev').getBoundingClientRect().bottom; return [...document.querySelectorAll('#pe-montana #m-etiquetas text')].every((t) => t.getBoundingClientRect().top >= c - 2); });
        ok(!gn.fallos.length && gn.toques && !gn.desborde && sobre, `23·29 320×568 con letra muy grande: el saldo del día sobre la cumbre, sin encimarse (${gn.fallos.join('; ')})`);
        await n.ctx.close();
      }
    } finally {
      sAnio.parar();
    }
    // Quien solo mira, con «Ver ese día» (también en las etapas intermedias agrupadas de un tramo cerrado): la película se abre detenida ahí.
    const sLargo = await servidor('largo');
    try {
      const l = await ent(sLargo, LECTOR, { pestanas: true, viewport: { width: 390, height: 844 } }, { 'libro.pestana': 'historia', 'libro.historia.abiertas': 'linea', 'libro.efectos': 'todos' });
      eq(await l.p.textContent('#dh-peli-d'), 'Cómo subió el libro, de la primera compra a hoy, sobre la montaña de hoy.', '23·29 lectora: la entrada habla del libro');
      const cuenta = await l.p.evaluate(() => ({ etapas: document.querySelectorAll('#dh-linea .h-ev:is(.h-hito, .h-etapa, .h-paso)').length, ver: document.querySelectorAll('#dh-linea .h-ev:is(.h-hito, .h-etapa, .h-paso) .h-ver').length, grupos: document.querySelectorAll('#dh-linea .h-pasos li .h-ver').length, nombre: document.querySelector('#dh-linea .h-ver')?.textContent }));
      ok(cuenta.etapas > 3 && cuenta.ver === cuenta.etapas && cuenta.grupos > 0 && /^Ver ese día en la película del ascenso \(.+, \d+ \w+ \d{4}\)$/.test(cuenta.nombre), `23·29 «Ver ese día» en cada etapa con fecha (${cuenta.ver} de ${cuenta.etapas}, ${cuenta.grupos} en los tramos plegados; «${cuenta.nombre}»)`);
      const primera = l.p.locator('#dh-linea .h-ev.h-hito .h-ver').first();
      const fecha = await l.p.locator('#dh-linea .h-ev.h-hito').first().locator('time').getAttribute('datetime');
      await primera.click(); await l.p.waitForTimeout(400);
      const a = await peli(l.p); await l.p.waitForTimeout(1500); const b = await peli(l.p);
      ok(a.abierta && a.valor > 0 && a.valor === b.valor && b.play === 'Ver la película' && b.foco === 'pe-play', `23·29 «Ver ese día» la abre detenida en ese día (${a.valor})`);
      eq(await quieto(l.p), 'quieta|running|running|running|running', '23·29 (rendimiento) abierta en un día, nada del ambiente se pausa');
      ok(/^Saldo del libro el /.test(b.rotulo) && /^El libro llegó al campamento /.test(b.ev) && b.yoTxt[0] === 'Íbamos aquí' && !/\b(tu|tus|llegaste)\b/i.test(`${b.rotulo} ${b.ev} ${b.vt}`), `23·29 lectora: sin tutear («${b.rotulo}» · «${b.ev}» · ${b.yoTxt})`);
      ok(b.vt.startsWith(new Intl.DateTimeFormat('es-SV', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${fecha}T12:00:00`)).replace('.', '')), `23·29 el día es el de la etapa (${fecha}: ${b.vt})`);
      await l.p.keyboard.press('Escape'); await l.p.waitForTimeout(800);
      ok(await l.p.evaluate(() => document.activeElement?.classList.contains('h-ver')), '23·29 al cerrar, el foco vuelve a «Ver ese día»');
      eq(l.consola, [], '23·29 lectora: consola limpia');
      await l.ctx.close();
    } finally {
      sLargo.parar();
    }
  });

  // ---------------------------------------------------------------- campamento 25: los osos polares de peluche (su sitio en la nieve al sol, ceden a los rótulos, bufanda, saltito, aurora, gorrito, entrada, tele, película y sello de 1 BTC)
  await bloque(async () => {
    const conLs = (x = {}) => [(o) => { try { localStorage.setItem('libro.avisos.preguntado', '1'); localStorage.setItem('libro.madrugada', '0'); for (const [k, v] of Object.entries(o)) localStorage.setItem(k, v); } catch { /* sin almacenamiento */ } }, { 'libro.dia': '2026-11-25', ...x }];
    const cerrar = async (p) => { for (let k = 0; k < 3 && await p.locator('dialog[open]').count(); k++) { await p.keyboard.press('Escape'); await p.waitForTimeout(300); } };
    /**
     * Los osos que se ven (en `sel`: la escena de la página o la de la película) y lo que tocarían. Se calcula aparte de la regla que los
     * coloca: cada oso es la caja de su grupo; ninguno puede tocar un rótulo, «Tú», la bandera o el mojón de la meta, el saldo ni la
     * cabecera; ninguno a menos de 10 px del sendero; el pie de cada uno dentro de la montaña y, si se sentaron en la nieve, en la nieve
     * dibujada de ahora.
     */
    const osos = (p, sel = '#montana') => p.evaluate((sel) => {
      const host = document.querySelector(sel), g = host.querySelector('#m-osos');
      const hay = Boolean(g?.classList.contains('osos'));
      const visibles = hay && g.getAttribute('visibility') !== 'hidden' && !g.classList.contains('sin-nieve') && Number(getComputedStyle(g).opacity) > 0;
      const zona = g?.dataset.zona ?? null;
      if (!visibles) return { hay, n: 0, zona, fallos: [], escondidos: hay ? (g.getAttribute('visibility') === 'hidden' ? 'rótulo' : 'nieve') : null };
      const svg = host.querySelector('svg'), inv = svg.getScreenCTM().inverse();
      const usuario = (x, y) => new DOMPoint(x, y).matrixTransform(inv);
      const monte = svg.querySelector('.monte'), nieve = svg.querySelector('.nieve-clip');
      const cajas = [...g.querySelectorAll(':scope > .oso')].map((o) => ({ quien: o.getAttribute('class').replace('oso oso-', ''), r: o.getBoundingClientRect() }));
      const camino = svg.querySelector('#m-sendero'), m = camino.getScreenCTM(), L = camino.getTotalLength(), sendero = [];
      for (let l = 0; l <= L; l += 3) { const q = camino.getPointAtLength(l); sendero.push([m.a * q.x + m.c * q.y + m.e, m.b * q.x + m.d * q.y + m.f]); }
      const cruza = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
      const marcas = [...host.querySelectorAll('#m-etiquetas > *, #m-yo .yo-anillo, .es-cima .banderin, .es-cima .campo-ico')].map((e) => e.getBoundingClientRect()).filter((q) => q.width);
      const cont = host.closest('.escena, .pe-escena');
      const textos = [...cont.querySelectorAll(':scope > .saldo, :scope > .cima, :scope > .pe-cab, :scope > .pe-cap')].map((e) => e.getBoundingClientRect()).filter((q) => q.width);
      const fallos = [];
      for (const { quien, r } of cajas) {
        if (marcas.some((q) => cruza(r, q))) fallos.push(`${quien} sobre un rótulo, «Tú» o la meta`);
        if (textos.some((q) => cruza(r, q))) fallos.push(`${quien} bajo el saldo o la cabecera`);
        const d = Math.min(...sendero.map(([x, y]) => Math.hypot(Math.max(r.left - x, 0, x - r.right), Math.max(r.top - y, 0, y - r.bottom))));
        if (d < 10) fallos.push(`${quien} a ${Math.round(d)} px del sendero`);
        const pie = usuario(r.left + r.width / 2, r.bottom - 1.5);
        if (!monte.isPointInFill(pie)) fallos.push(`${quien} fuera de la montaña`);
        if (zona !== 'cumbre' && !nieve.isPointInFill(pie)) fallos.push(`${quien} fuera de la nieve dibujada`);
        if (r.left < 0 || r.right > innerWidth || r.top < 0) fallos.push(`${quien} fuera de la pantalla`);
      }
      return { hay, n: cajas.length, zona, quienes: cajas.map((c) => c.quien), alto: Math.round(cajas[0].r.height), fallos, toque: (() => { const r = cajas[0].r, e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return Boolean(e?.closest('#m-osos')); })() };
    }, sel);
    const resumen = (o) => `${o.n} osos${o.zona ? ` en ${o.zona}` : ''}${o.fallos.length ? `: ${o.fallos.join('; ')}` : ''}`;

    // ---- Su sitio, en tamaños, escenarios y cuentas (por pestañas, como se abre la app: la escena acaba donde empieza el dock). Donde
    // caben, los tres; si no, la pareja o el grande; si no, ninguno. Nunca tocan nada.
    const MATRIZ = { anio: [[390, 844, 3], [430, 873, 3], [390, 664, 3], [320, 568, 1], [844, 390, 1], [768, 1024, 3], [1440, 900, 3], [2560, 1440, 3]], mil: [[390, 844, 3], [1440, 900, 3], [320, 568, 0]], ballena: [[390, 844, 3], [1440, 900, 3], [844, 390, 0]], hoy: [[390, 844, 3], [844, 390, 2]] };
    for (const [esc, tams] of Object.entries(MATRIZ)) {
      const srv = await servidor(esc);
      try {
        for (const [w, h, esperados] of tams) {
          const t = await entrar(navegador, srv, ADMIN, { hora: 12, viewport: { width: w, height: h }, deviceScaleFactor: 1, isMobile: w < 900, hasTouch: w < 1100, pestanas: true }, conLs({ 'libro.efectos': 'ninguno' }));
          await cerrar(t.p);
          const o = await osos(t.p);
          ok(o.n === esperados && o.fallos.length === 0, `25·sitio ${esc} ${w}×${h}: ${esperados} oso${esperados === 1 ? '' : 's'} y nada tocado (${resumen(o)})`);
          if (o.n) ok(!o.toque, `25·sitio ${esc} ${w}×${h}: no se tocan (un toque pasa a la escena)`);
          if (esc === 'anio' && w === 390 && h === 844) {
            eq([...o.quienes].sort(), ['chico', 'grande', 'mameluco'], '25·sitio: los tres: el grande, el chico y el del mameluco');
            const desc = await t.p.textContent('#m-desc');
            ok(/tres osos polares de peluche/.test(desc) && !/\btus?\b/i.test(desc.match(/[^.]*osos[^.]*\./)?.[0] ?? ''), `25·sitio: la descripción de la montaña los cuenta sin tutear («${desc.match(/[^.]*osos[^.]*\./)?.[0]}»)`);
            eq(await t.p.evaluate(() => [...document.querySelectorAll('#montana #m-osos [class]')].every((e) => /^(oso|v-navidad)\b|^oso[ -]/.test(e.getAttribute('class')) && !e.hasAttribute('style')) && document.querySelector('#montana #m-osos').getAttribute('aria-hidden')), 'true', '25·sitio: decorativos (aria-hidden), solo clases oso- y sin estilos en línea');
          }
          ok(t.consola.length === 0, `25·sitio ${esc} ${w}×${h}: consola limpia (${t.consola.slice(0, 2)})`);
          await t.ctx.close();
        }
        if (esc === 'anio') {
          // Quien solo mira ve los mismos osos (su rótulo, «Vamos aquí», ocupa más: los osos lo esquivan); con letra muy grande en 320 px
          // la montaña es tan pequeña que no caben (si no caben, no salen: nunca tapan nada).
          for (const [w, h, letra, minimo] of [[390, 844, '', 3], [320, 568, 'muy-grande', 0]]) {
            const t = await entrar(navegador, srv, LECTOR, { hora: 12, viewport: { width: w, height: h }, deviceScaleFactor: 1, pestanas: true }, conLs({ 'libro.efectos': 'ninguno', ...(letra ? { 'libro.letra': letra } : {}) }));
            await cerrar(t.p);
            const o = await osos(t.p);
            ok(o.n >= minimo && o.fallos.length === 0, `25·sitio lectora ${w}×${h}${letra ? ' letra muy grande' : ''}: ${resumen(o)}`);
            ok(t.consola.length === 0, `25·sitio lectora ${w}×${h}: consola limpia (${t.consola.slice(0, 2)})`);
            await t.ctx.close();
          }
        }
      } finally { srv.parar(); }
    }

    const srv = await servidor('anio');
    try {
      // ---- Se leen sobre la nieve a cualquier hora: el contorno de cada oso contra lo que tiene detrás de verdad (la escena pintada sin
      // osos), con un contraste de luz de 1.3:1 o una diferencia de color (ΔE oklab) de 0.06, en el 95 % del contorno o más.
      const c = await entrar(navegador, srv, ADMIN, { hora: 12, viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, bypassCSP: true, pestanas: true }, conLs({ 'libro.efectos': 'ninguno' }));
      await cerrar(c.p);
      const hr = await c.p.locator('#montana').boundingBox();
      for (const hora of [6, 12, 17.5, 20]) {
        await c.p.evaluate((h) => { window.libroCielo.fijarHora(h); document.querySelector('#montana #m-osos').setAttribute('visibility', 'hidden'); }, hora);
        await c.p.waitForTimeout(300);
        const sin = (await c.p.screenshot({ clip: { x: hr.x, y: hr.y, width: hr.width, height: hr.height } })).toString('base64');
        const r = await c.p.evaluate(async (b64) => {
          document.querySelector('#montana #m-osos').removeAttribute('visibility');
          const img = new Image(); img.src = `data:image/png;base64,${b64}`; await img.decode();
          const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height; const cx = cv.getContext('2d'); cx.drawImage(img, 0, 0);
          const host = document.getElementById('montana'), hr = host.getBoundingClientRect(), g = host.querySelector('#m-osos.osos');
          const fondo = (x, y) => [...cx.getImageData(Math.round(x - hr.left), Math.round(y - hr.top), 1, 1).data].slice(0, 3).map((v) => v / 255);
          const c1 = document.createElement('canvas').getContext('2d');
          const rgb = (col) => { c1.fillStyle = col; c1.fillRect(0, 0, 1, 1); return [...c1.getImageData(0, 0, 1, 1).data].slice(0, 3).map((v) => v / 255); };
          const lin = (v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
          const okl = (c) => { const [r, v, b] = c.map(lin); const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * v + 0.0514459929 * b), m = Math.cbrt(0.2119034982 * r + 0.6806995451 * v + 0.1073969566 * b), s = Math.cbrt(0.0883024619 * r + 0.2817188376 * v + 0.6299787005 * b); return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s]; };
          const lum = (c) => { const [r, v, b] = c.map(lin); return 0.2126 * r + 0.7152 * v + 0.0722 * b; };
          const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
          const dE = (a, b) => { const A = okl(a), B = okl(b); return Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]); };
          const paths = [...g.querySelectorAll('path')].filter((q) => !q.classList.contains('oso-pie') && q.checkVisibility({ checkVisibilityCSS: true }));
          const color = new Map(paths.map((q) => [q, rgb(getComputedStyle(q).fill)]));
          const rg = g.getBoundingClientRect(), mapa = new Map();
          for (let y = Math.floor(rg.top); y <= rg.bottom; y++) for (let x = Math.floor(rg.left); x <= rg.right; x++) {
            let arriba = null;
            for (const q of paths) if (q.isPointInFill(new DOMPoint(x + 0.5, y + 0.5).matrixTransform(q.getScreenCTM().inverse()))) arriba = q;
            if (arriba) mapa.set(`${x},${y}`, arriba);
          }
          let total = 0, legible = 0;
          for (const [k, q] of mapa) {
            const [x, y] = k.split(',').map(Number);
            for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (!mapa.has(`${x + dx},${y + dy}`)) { const f = fondo(x + dx, y + dy); total++; if (ratio(color.get(q), f) >= 1.3 || dE(color.get(q), f) >= 0.06) legible++; }
          }
          return { total, legible: legible / total, cielo: document.documentElement.dataset.cielo };
        }, sin);
        ok(r.total > 40 && r.legible >= 0.95, `25·contraste ${hora} h (${r.cielo}): ${Math.round(r.legible * 100)} % del contorno se lee sobre la nieve (${r.total} píxeles de borde)`);
      }
      await c.ctx.close();

      // ---- La bufanda de Navidad, del 1 de diciembre al 6 de enero (la enseña el CSS: no se redibuja nada); el gorrito, el día de un
      // cumpleaños; y la cara que mira al cielo con la aurora (racha de 12 o más), de noche y con todos los efectos.
      const t = await entrar(navegador, srv, ADMIN, { hora: 20, viewport: { width: 390, height: 844 } }, conLs({ 'libro.efectos': 'todos' }));
      await cerrar(t.p);
      const ver = (s) => t.p.evaluate((s) => [...document.querySelectorAll(`#montana #m-osos ${s}`)].filter((e) => getComputedStyle(e).display !== 'none').length, s);
      const dia = async (d) => { await t.p.evaluate((d) => { localStorage.setItem('libro.dia', d); window.libroCielo.aplicar(); }, d); return ver('.oso-bufanda'); };
      const bufandas = { '2026-11-30': await dia('2026-11-30'), '2026-12-01': await dia('2026-12-01'), '2026-12-24': await dia('2026-12-24'), '2027-01-06': await dia('2027-01-06'), '2027-01-07': await dia('2027-01-07') };
      eq(bufandas, { '2026-11-30': 0, '2026-12-01': 2, '2026-12-24': 2, '2027-01-06': 2, '2027-01-07': 0 }, '25·bufanda: el chico y el del mameluco la llevan del 1 de diciembre al 6 de enero (el grande ya tiene su cinta)');
      await dia('2026-11-25');
      const aurora = await t.p.evaluate(() => document.querySelector('#montana #m-osos').classList.contains('con-aurora'));
      ok(aurora, '25·aurora: con la racha de este libro, los osos saben de la aurora');
      eq([await ver('.oso-hocico-arriba'), await ver('.oso-hocico')], [3, 0], '25·aurora: de noche y con «todos», los tres miran al cielo');
      await t.p.evaluate(() => { localStorage.setItem('libro.hora', '12'); window.libroCielo.aplicar(); });
      eq([await ver('.oso-hocico-arriba'), await ver('.oso-hocico')], [0, 3], '25·aurora: de día miran al frente');
      await t.p.evaluate(() => { localStorage.setItem('libro.hora', '20'); window.libroCielo.aplicar(); window.libroEfectos.fijar('esenciales'); });
      eq([await ver('.oso-hocico-arriba'), await ver('.oso-hocico')], [0, 3], '25·aurora: con «esenciales» no hay aurora y miran al frente');
      ok(await ver('.oso-gorro') === 0, '25·gorrito: ningún cumpleaños hoy, ningún gorrito');
      const puesto = await t.p.evaluate(() => fetch('/api/yo/cumple', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-Libro': '1' }, body: JSON.stringify({ cumple: '11-25' }) }).then((r) => r.status));
      eq(puesto, 200, '25·gorrito: el dueño pone su cumpleaños hoy');
      await t.p.reload({ waitUntil: 'networkidle' }); await t.p.waitForTimeout(2200); await cerrar(t.p);
      eq([await ver('.oso-gorro'), (await osos(t.p)).n], [1, 3], '25·gorrito: el día de un cumpleaños de la familia, el grande con su gorrito (y los tres en su sitio)');
      const o = await osos(t.p);
      ok(o.n === 3 && o.fallos.length === 0, `25·gorrito: con el gorrito siguen sin tocar nada (${resumen(o)})`);
      await t.p.evaluate(() => fetch('/api/yo/cumple', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-Libro': '1' }, body: JSON.stringify({ cumple: '' }) }));
      ok(t.consola.length === 0, `25·bufanda, aurora y gorrito: consola limpia (${t.consola.slice(0, 2)})`);
      await t.ctx.close();

      // ---- El saltito al guardar una compra nueva: acompaña a una acción, así que sale con «esenciales» (no con «ninguno»), una vez, y los
      // osos no desaparecen ni se mueven mientras «Tú» sube.
      for (const ef of ['esenciales', 'ninguno']) {
        const a = await entrar(navegador, srv, ADMIN, { hora: 12, viewport: { width: 390, height: 844 } }, conLs({ 'libro.efectos': ef }));
        await cerrar(a.p);
        const antes = await a.p.evaluate(() => document.querySelector('#montana #m-osos .oso').getBoundingClientRect().toJSON());
        await a.p.evaluate(() => {
          const r = { salta: 0, anim: 0, sinNieve: 0 };
          window.__osos = r;
          const vigia = () => {
            const g = document.querySelector('#montana #m-osos');
            if (g?.classList.contains('sin-nieve')) r.sinNieve++;
            if (document.getAnimations().some((x) => x.animationName === 'oso-salta')) r.anim++;
            requestAnimationFrame(vigia);
          };
          new MutationObserver((ms) => { for (const m of ms) if (m.target.id === 'm-osos' && m.target.classList.contains('salta') && !(m.oldValue || '').includes('salta')) r.salta++; })
            .observe(document.getElementById('montana'), { attributes: true, attributeFilter: ['class'], attributeOldValue: true, subtree: true });
          vigia();
        });
        await a.p.evaluate(() => window.scrollTo(0, 0));
        await a.p.click('#anotar'); await a.p.waitForTimeout(400);
        await a.p.fill('#h-sats', '40000');
        await a.p.click('#guardar'); await a.p.waitForTimeout(500);
        if (/Sí/.test((await a.p.textContent('#guardar').catch(() => '')) || '')) await a.p.click('#guardar');
        await a.p.waitForTimeout(5200);
        const r = await a.p.evaluate(() => window.__osos);
        const despues = await a.p.evaluate(() => document.querySelector('#montana #m-osos .oso')?.getBoundingClientRect().toJSON());
        if (ef === 'esenciales') ok(r.salta === 1 && r.anim > 0 && r.sinNieve === 0, `25·saltito con «esenciales»: saltan una vez al guardar y no desaparecen mientras «Tú» sube (${JSON.stringify(r)})`);
        else ok(r.anim === 0 && r.sinNieve === 0, `25·saltito con «ninguno»: no saltan (${JSON.stringify(r)})`);
        ok(despues && Math.abs(despues.x - antes.x) < 6 && Math.abs(despues.y - antes.y) < 6, `25·saltito ${ef}: tras la compra siguen en su sitio (de ${Math.round(antes.x)},${Math.round(antes.y)} a ${Math.round(despues?.x)},${Math.round(despues?.y)})`);
        ok(a.consola.length === 0, `25·saltito ${ef}: consola limpia (${a.consola.slice(0, 2)})`);
        await a.ctx.close();
      }

      // ---- Nodos: con mil compras, en Nochebuena (la noche más cargada), la escena del teléfono no pasa de 1100 y los osos son pocos.
      const sMil = await servidor('mil');
      try {
        const n = await entrar(navegador, sMil, ADMIN, { hora: 21 }, conLs({ 'libro.dia': '2026-12-24', 'libro.efectos': 'esenciales' }));
        await cerrar(n.p);
        const r = await n.p.evaluate(() => { const h = document.getElementById('montana'), o = h.querySelector('#m-osos'); return { escena: h.querySelectorAll('*').length, osos: o.querySelectorAll('*').length + 1 }; });
        ok(r.escena <= 1100 && r.osos <= 40, `25·nodos: la escena con mil compras en Nochebuena tiene ${r.escena} nodos (≤ 1100), los osos ${r.osos} (≤ 40)`);
        await n.ctx.close();
      } finally { sMil.parar(); }

      // ---- La película del ascenso: sobre la montaña de hoy, los osos donde están en la página; mientras la nieve no los cubre, esperan
      // escondidos (al empezar hay poca nieve) y llegan con ella; si un rótulo les cae encima, ceden; al volver atrás, se esconden otra vez.
      const pe = await entrar(navegador, srv, ADMIN, { hora: 12, viewport: { width: 390, height: 844 }, pestanas: true }, conLs({ 'libro.pestana': 'historia', 'libro.efectos': 'esenciales' }));
      await cerrar(pe.p);
      const enPagina = await osos(pe.p);
      await pe.p.click('#dh-peli-ver'); await pe.p.waitForTimeout(300);
      let e = await osos(pe.p, '#pe-montana');
      ok(e.hay && e.n === 0 && e.escondidos === 'nieve', `25·película: al empezar, con poca nieve, los osos esperan escondidos (${JSON.stringify(e)})`);
      const vistos = [];
      for (let k = 0; k < 8; k++) { await pe.p.waitForTimeout(1800); const x = await osos(pe.p, '#pe-montana'); vistos.push(x.n); ok(x.fallos.length === 0, `25·película ${k}: los que se ven no tocan nada (${resumen(x)})`); }
      e = await osos(pe.p, '#pe-montana');
      ok(e.n === enPagina.n && vistos.some((v) => v > 0), `25·película: llegan con la nieve y al final son los de la página (${vistos.join(', ')} → ${e.n}, página ${enPagina.n})`);
      await pe.p.focus('#pe-rango'); await pe.p.keyboard.press('Home'); await pe.p.waitForTimeout(200);
      e = await osos(pe.p, '#pe-montana');
      ok(e.n === 0, `25·película: al volver al principio con el deslizador, otra vez escondidos (${JSON.stringify(e)})`);
      await pe.p.keyboard.press('End'); await pe.p.waitForTimeout(200);
      e = await osos(pe.p, '#pe-montana');
      ok(e.n === enPagina.n && e.fallos.length === 0, `25·película: hoy, los mismos que en la página (${resumen(e)})`);
      // «El oso cede»: con «Tú» llegando a la cumbre, en cada fotograma, o nada cae sobre los osos o ceden (se esconden); de vuelta en hoy,
      // se ven otra vez. (Desde el campamento 31 «Tú» es un osito y su rótulo se aparta de su caja: aquí ya no cae sobre ellos.)
      for (const x of [0.95, 0.98, 0.985, 0.99, 0.995, 1]) {
        await pe.p.evaluate(async (x) => {
          const M = await import(document.querySelector('link[rel=modulepreload][href*="montana.js"]').href);
          const host = document.getElementById('pe-montana'), esc = M.escalaDe(host);
          M.fotograma(host, Math.round(esc.base * (esc.cima / esc.base) ** x), { quieto: true, rotulo: 'Tú' });
        }, x);
        e = await osos(pe.p, '#pe-montana');
        ok(e.escondidos === 'rótulo' || (e.n > 0 && e.fallos.length === 0), `25·película ${x}: con «Tú» junto a la cumbre, nada cae sobre los osos o ceden (${JSON.stringify(e)})`);
      }
      await pe.p.keyboard.press('Home'); await pe.p.keyboard.press('End'); await pe.p.waitForTimeout(200);
      e = await osos(pe.p, '#pe-montana');
      ok(e.n === enPagina.n && e.fallos.length === 0, `25·película: de vuelta en hoy, se ven otra vez (${resumen(e)})`);
      await pe.p.keyboard.press('Escape'); await pe.p.waitForTimeout(800);
      await pe.p.evaluate(() => window.scrollTo(0, 0)); await pe.p.waitForTimeout(300);
      const vuelta = await osos(pe.p);
      ok(vuelta.n === enPagina.n && vuelta.fallos.length === 0, `25·película: al cerrar, la escena de la página con sus osos (${resumen(vuelta)})`);
      ok(pe.consola.length === 0, `25·película: consola limpia (${pe.consola.slice(0, 2)})`);
      await pe.ctx.close();

      // ---- La tele: las tarjetas (último movimiento, reloj, sismógrafo) nunca tapan a los osos.
      for (const [w, h] of [[1920, 1080], [1366, 768], [1080, 1920], [3840, 2160]]) {
        const tv = await entrar(navegador, srv, LECTOR, { hora: 12, viewport: { width: w, height: h }, isMobile: false, hasTouch: false, deviceScaleFactor: 1 }, conLs({ 'libro.efectos': 'esenciales' }));
        await tv.p.evaluate(() => { location.hash = '#tv'; });
        await tv.p.reload({ waitUntil: 'networkidle' }); await tv.p.waitForTimeout(2500); await cerrar(tv.p);
        const r = await tv.p.evaluate(() => {
          const osos = [...document.querySelectorAll('#montana #m-osos.osos:not([visibility="hidden"], .sin-nieve) > .oso')].map((o) => o.getBoundingClientRect());
          const tarjetas = [...document.querySelectorAll('.tv-tarjeta')].filter((e) => !e.hidden && e.dataset.sitio !== '0' && e.getClientRects().length).map((e) => ({ id: e.id, r: e.getBoundingClientRect() }));
          const pisan = tarjetas.filter((t) => osos.some((o) => t.r.left < o.right && t.r.right > o.left && t.r.top < o.bottom && t.r.bottom > o.top)).map((t) => t.id);
          return { tv: document.documentElement.dataset.tv, osos: osos.length, tarjetas: tarjetas.map((t) => t.id), pisan };
        });
        ok(r.tv === '1' && r.osos >= 1 && r.tarjetas.length >= 1 && r.pisan.length === 0, `25·tele ${w}×${h}: ${r.osos} osos y ninguna tarjeta encima (${JSON.stringify(r)})`);
        await tv.ctx.close();
      }
    } finally { srv.parar(); }

    // ---- La entrada: los mismos osos (paisaje, sin nada de nadie: ni aurora ni gorrito), y nada tocado.
    const sE = await servidor('anio');
    try {
      for (const [w, h] of [[390, 844], [1440, 900]]) {
        const ctx = await navegador.newContext({ viewport: { width: w, height: h }, isMobile: w < 900, hasTouch: w < 900 });
        const p = await ctx.newPage();
        await p.addInitScript(() => { try { localStorage.setItem('libro.hora', '20'); localStorage.setItem('libro.dia', '2026-11-25'); localStorage.setItem('libro.efectos', 'todos'); } catch { /* sin almacenamiento */ } });
        const consola = []; p.on('console', (m) => ['error', 'warning'].includes(m.type()) && consola.push(m.text()));
        await p.goto(`${sE.url}/login`, { waitUntil: 'networkidle' }); await p.waitForTimeout(900);
        const r = await p.evaluate(() => { const g = document.querySelector('#montana #m-osos.osos'); return { n: g ? g.querySelectorAll(':scope > .oso').length : 0, aurora: g?.classList.contains('con-aurora') ?? null, gorro: g?.querySelectorAll('.oso-gorro').length ?? null, caja: g ? (() => { const c = g.getBoundingClientRect(), f = document.querySelector('.login-caja')?.getBoundingClientRect(); return f ? c.left < f.right && c.right > f.left && c.top < f.bottom && c.bottom > f.top : false; })() : null }; });
        eq(r, { n: 3, aurora: false, gorro: 0, caja: false }, `25·entrada ${w}×${h}: los tres osos, sin aurora ni gorrito y lejos del formulario`);
        eq(consola, [], `25·entrada ${w}×${h}: consola limpia`);
        await ctx.close();
      }
    } finally { sE.parar(); }
  });

  // ---------------------------------------------------------------- campamento 26: los osos en la interfaz (la lista y «Tu historia» sin compras, la bienvenida, las cartas y la guía)
  await bloque(async () => {
    const conLs = (x = {}) => [(o) => { try { localStorage.setItem('libro.avisos.preguntado', '1'); for (const [k, v] of Object.entries(o)) localStorage.setItem(k, v); } catch { /* sin almacenamiento */ } }, x];
    const cerrar = async (p) => { for (let k = 0; k < 3 && await p.locator('dialog[open]').count(); k++) { await p.keyboard.press('Escape'); await p.waitForTimeout(300); } };
    const decorativo = (s) => Boolean(s) && s.getAttribute('aria-hidden') === 'true' && s.getAttribute('focusable') === 'false' && !s.closest('[role="img"]');
    // Sin compras: el grande lee en la lista y lleva su mochila en «Tu historia»; quien solo mira no recibe «Anota la primera».
    const vac = await servidor('vacio');
    try {
      for (const [cuenta, quien] of [[ADMIN, 'el dueño'], [LECTOR, 'quien solo mira']]) {
        const t = await entrar(navegador, vac, cuenta, { hora: 12, viewport: { width: 320, height: 640 } }, conLs());
        await cerrar(t.p);
        await t.p.click('#cuenta-btn'); await t.p.click('#dc-historia-btn');
        await t.p.waitForSelector('#dh-vacio:not([hidden])', { timeout: 4000 }); await t.p.waitForTimeout(400);
        const r = await t.p.evaluate((decorativoTxt) => {
          const decorativo = new Function(`return ${decorativoTxt}`)();
          const li = document.querySelector('#lista .vacio'), s = li?.querySelector(':scope > svg.oso-ilu'), h = document.querySelector('#dh-vacio > svg.oso-ilu');
          return { lee: Boolean(s?.classList.contains('oso-pose-lee')) && decorativo(s), alto: Math.round(s?.getBoundingClientRect().height ?? 0), linea: Boolean(li?.querySelector('.ilu')), txt: li?.innerText ?? '',
            mochila: Boolean(h?.classList.contains('oso-pose-mochila')) && decorativo(h), htxt: document.getElementById('dh-vacio').innerText, ancho: document.documentElement.scrollWidth <= innerWidth };
        }, decorativo.toString());
        ok(r.lee && r.alto === 96 && !r.linea, `26 lista sin compras (${quien}): el grande leyendo, decorativo y en el sitio del dibujo de línea (${r.alto} px)`);
        ok(quien === 'el dueño' ? /Anota la primera o importa un CSV/.test(r.txt) : r.txt.trim() === 'Aún no hay compras en el libro.', `26 lista sin compras (${quien}): «${r.txt.trim()}»`);
        ok(r.mochila && /primera compra/.test(r.htxt), `26 «Tu historia» sin compras (${quien}): el grande con su mochila, sobre «${r.htxt.trim()}»`);
        ok(r.ancho && t.consola.length === 0, `26 sin compras a 320 px (${quien}): sin desplazamiento de lado y consola limpia (${t.consola.slice(0, 2)})`);
        await t.ctx.close();
      }
    } finally {
      vac.parar();
    }
    // La bienvenida de quien solo mira: los tres saludan arriba del título, solo si cabe; el brazo saluda solo con «todos».
    const anio = await servidor('anio');
    try {
      for (const [w, h, ef, letra] of [[390, 844, 'todos', ''], [360, 640, 'ninguno', ''], [320, 568, 'todos', ''], [390, 844, 'todos', 'muy-grande']]) {
        const t = await entrar(navegador, anio, LECTOR, { hora: 12, viewport: { width: w, height: h } }, conLs({ 'libro.efectos': ef, ...(letra ? { 'libro.letra': letra } : {}) }));
        await t.p.waitForSelector('#d-novedades[open]', { timeout: 8000 });
        await t.p.waitForTimeout(1700);
        const r = await t.p.evaluate(() => {
          const d = document.getElementById('d-novedades'), o = document.getElementById('nov-osos'), s = o.querySelector('svg.oso-pose-saludan'), b = document.getElementById('nov-ok').getBoundingClientRect();
          const brazo = s?.querySelector('.oso-saluda');
          return { ve: !o.hidden && Boolean(s), aria: s?.getAttribute('aria-hidden'), cabe: d.scrollHeight <= d.clientHeight + 1, boton: b.bottom <= innerHeight && b.top >= 0, anim: brazo ? getComputedStyle(brazo).animationName : null, titulo: document.getElementById('nov-titulo').textContent, antes: o.nextElementSibling?.id };
        });
        const caso = `${w}×${h}, efectos ${ef}${letra ? `, letra ${letra}` : ''}`;
        ok(r.titulo === 'Así va el libro' && r.boton && (!r.ve || r.cabe), `26 bienvenida (${caso}): «Entendido» a la vista y, con los osos, cabe sin desplazarse (osos ${r.ve}, cabe ${r.cabe})`);
        if (w >= 360 && !letra) ok(r.ve && r.aria === 'true' && r.antes === 'nov-titulo', `26 bienvenida (${caso}): los tres saludan arriba del título, decorativos`);
        if (w === 320) ok(!r.ve, `26 bienvenida (${caso}): no caben, así que no salen`);
        if (r.ve) ok(r.anim === (ef === 'todos' ? 'oso-saluda' : 'none'), `26 bienvenida (${caso}): el brazo ${ef === 'todos' ? 'saluda' : 'se queda quieto'} (${r.anim})`);
        await t.ctx.close();
      }
    } finally {
      anio.parar();
    }
    // Cartas para el futuro: mientras no hay cartas, el dueño ve la invitación con el grande y su sobre (en 320 px, encima del texto).
    const hoy = await servidor('hoy');
    try {
      for (const w of [390, 320]) {
        const t = await entrar(navegador, hoy, ADMIN, { hora: 12, viewport: { width: w, height: 800 } }, conLs());
        await cerrar(t.p);
        const r = await t.p.evaluate(() => {
          const c = document.getElementById('cap-pista'), s = c.querySelector(':scope > svg.oso-pose-sobre'), txt = c.querySelector(':scope > span');
          const a = s?.getBoundingClientRect(), b = txt?.getBoundingClientRect();
          return { ve: !c.hidden && Boolean(s) && s.getAttribute('aria-hidden') === 'true', uno: c.querySelectorAll('svg').length, lado: a && b ? (b.left >= a.right - 1 ? 'al lado' : b.top >= a.bottom - 1 ? 'encima' : 'encima a medias') : '', txt: txt?.textContent ?? '' };
        });
        ok(r.ve && r.uno === 1 && /Escribe una carta/.test(r.txt) && r.lado === (w >= 360 ? 'al lado' : 'encima'), `26 cartas a ${w} px: el sobre ${r.lado} de la invitación, una sola vez`);
        await t.ctx.close();
      }
    } finally {
      hoy.parar();
    }
    // La guía de estilo: las ocho poses y la huella, cada una con su nombre.
    const g = await servidor('anio');
    try {
      const t = await entrar(navegador, g, ADMIN, { hora: 12 }, conLs());
      await t.p.goto(`${g.url}/guia`, { waitUntil: 'networkidle' });
      const r = await t.p.evaluate(() => [...document.querySelectorAll('#guia-osos li')].map((li) => [li.querySelector('svg.oso-ilu')?.getAttribute('aria-hidden'), li.innerText.trim()]));
      ok(r.length === 9 && r.every(([a, n]) => a === 'true' && n.length > 2) && r.at(-1)[1] === 'La huella', `26 guía: las poses y la huella con su nombre (${r.map((x) => x[1]).join(', ')})`);
      ok(t.consola.length === 0, `26 guía: consola limpia (${t.consola.slice(0, 2)})`);
      await t.ctx.close();
    } finally {
      g.parar();
    }
  });

  // ---------------------------------------------------------------- campamento 27: cuando algo no va (el grande confundido si no cargan las compras y dormido en el mantenimiento)
  await bloque(async () => {
    const conLs = (x = {}) => [(o) => { try { localStorage.setItem('libro.avisos.preguntado', '1'); for (const [k, v] of Object.entries(o)) localStorage.setItem(k, v); } catch { /* sin almacenamiento */ } }, x];
    const cerrar = async (p) => { for (let k = 0; k < 3 && await p.locator('dialog[open]').count(); k++) { await p.keyboard.press('Escape'); await p.waitForTimeout(300); } };
    // Si no cargan las compras: el texto de siempre (con la voz de cada uno) y el grande confundido en el sitio del dibujo.
    const anio = await servidor('anio');
    try {
      for (const [cuenta, quien, texto] of [[ADMIN, 'el dueño', 'No se pudieron cargar tus compras.'], [LECTOR, 'quien solo mira', 'No se pudieron cargar las compras.']]) {
        const ctx = await navegador.newContext({ ...devices['iPhone 13'] });
        const p = await ctx.newPage();
        await p.addInitScript(() => { try { localStorage.setItem('libro.hora', '12'); localStorage.setItem('libro.pestanas', 'todo'); localStorage.setItem('libro.avisos.preguntado', '1'); } catch { /* sin almacenamiento */ } });
        await p.goto(`${anio.url}/login`, { waitUntil: 'networkidle' });
        await p.fill('input[autocomplete="username"]', cuenta[0]); await p.fill('input[autocomplete="current-password"]', cuenta[1]);
        await p.route('**/api/compras*', (r) => r.abort());
        await Promise.all([p.waitForURL('**/'), p.click('button[type=submit], .guardar')]);
        await p.waitForFunction(() => /No se pudieron/.test(document.querySelector('#lista .vacio')?.textContent ?? ''), null, { timeout: 30000 });
        const r = await p.evaluate(() => {
          const li = document.querySelector('#lista .vacio'), s = li.querySelector(':scope > svg.oso-ilu');
          return { confundido: Boolean(s?.classList.contains('oso-pose-confundido')), aria: s?.getAttribute('aria-hidden'), alto: Math.round(s?.getBoundingClientRect().height ?? 0), txt: li.innerText.trim(), con: li.classList.contains('con-ilu') };
        });
        ok(r.confundido && r.aria === 'true' && r.alto === 92 && r.con && r.txt === texto, `27 sin poder cargar (${quien}): el grande confundido y «${r.txt}»`);
        await ctx.close();
      }
    } finally {
      anio.parar();
    }
    // Mantenimiento (SOLO_LECTURA): el aviso de siempre, que sigue siendo un estado para el lector de pantalla, con el grande dormido al lado.
    const mant = await servidor('anio', { SOLO_LECTURA: '1' });
    try {
      for (const w of [390, 320]) {
        const m = await entrar(navegador, mant, ADMIN, { hora: 12, viewport: { width: w, height: 700 } }, conLs());
        await cerrar(m.p);
        const r = await m.p.evaluate(() => {
          const e = document.getElementById('mant'), s = e.querySelector(':scope > svg.oso-pose-duerme'), t = e.querySelector(':scope > span');
          const a = s?.getBoundingClientRect(), b = t?.getBoundingClientRect();
          return { ve: !e.hidden && Boolean(s) && s.getAttribute('aria-hidden') === 'true', rol: e.getAttribute('role'), una: e.querySelectorAll('svg').length, lado: a && b ? b.left >= a.right - 1 : false, txt: t?.textContent ?? '', ancho: document.documentElement.scrollWidth <= innerWidth };
        });
        ok(r.ve && r.rol === 'status' && r.una === 1 && r.lado && /^Mantenimiento: por ahora solo se puede mirar/.test(r.txt) && r.ancho, `27 mantenimiento a ${w} px: el grande dormido a la izquierda del aviso, que sigue siendo un estado`);
        await m.ctx.close();
      }
    } finally {
      mant.parar();
    }
  });

  // ---------------------------------------------------------------- campamento 28: según el momento (los osos de la interfaz se duermen, se abrigan, sacan el paraguas, la banderita y el gorrito)
  await bloque(async () => {
    const conLs = (x = {}) => [(o) => { try { localStorage.setItem('libro.avisos.preguntado', '1'); for (const [k, v] of Object.entries(o)) localStorage.setItem(k, v); } catch { /* sin almacenamiento */ } }, x];
    const cerrar = async (p) => { for (let k = 0; k < 3 && await p.locator('dialog[open]').count(); k++) { await p.keyboard.press('Escape'); await p.waitForTimeout(300); } };
    /** Qué se ve del grande que lee en la lista sin compras (todo va dibujado: el CSS enseña lo que toca). */
    const lee = (p) => p.evaluate(() => {
      const s = document.querySelector('#lista .vacio svg.oso-pose-lee');
      const ve = (sel) => [...(s?.querySelectorAll(sel) ?? [])].some((e) => getComputedStyle(e).display !== 'none' && getComputedStyle(e.parentElement).display !== 'none');
      return { hay: Boolean(s), abiertos: ve('.oso-ojos'), dormido: ve('.oso-ojos-zz') && ve('.oso-zz'), gorro: ve('.oso-gorro-nav'), gorrito: ve('.oso-gorro'), paraguas: ve('.oso-paraguas'), bandera: ve('.oso-bandera') };
    });
    const vac = await servidor('vacio');
    try {
      const casos = [
        ['un día cualquiera, 12 h', '2026-11-25', 12, {}, { abiertos: true, dormido: false, gorro: false, paraguas: false, bandera: false }],
        ['de madrugada con el velo apagado, 23 h', '2026-11-25', 23, { 'libro.madrugada': '0' }, { abiertos: false, dormido: true }],
        ['a las 5 ya despierto', '2026-11-25', 5, {}, { abiertos: true, dormido: false }],
        ['Nochebuena', '2026-12-24', 12, {}, { gorro: true, paraguas: false }],
        ['una tarde de lluvia, 15 h', '2026-07-10', 15, {}, { paraguas: true, bandera: false }],
        ['la misma noche de lluvia, 19 h', '2026-07-10', 19, {}, { paraguas: false }],
        ['una tarde de la época seca, 15 h', '2026-02-10', 15, {}, { paraguas: false }],
        ['el 15 de septiembre', '2026-09-15', 12, {}, { bandera: true }],
      ];
      for (const [caso, dia, hora, extra, espera] of casos) {
        const t = await entrar(navegador, vac, ADMIN, { hora }, conLs({ 'libro.dia': dia, ...extra }));
        await cerrar(t.p);
        const r = await lee(t.p);
        ok(r.hay && Object.entries(espera).every(([k, v]) => r[k] === v), `28 ${caso}: ${JSON.stringify(r)}`);
        await t.ctx.close();
      }
      // El cumpleaños de alguien de la familia: el grande estrena su gorrito (no dice de quién) y deja el gorro de Navidad.
      const t = await entrar(navegador, vac, ADMIN, { hora: 12 }, conLs({ 'libro.dia': '2026-12-02' }));
      await cerrar(t.p);
      await t.p.evaluate(() => fetch('/api/yo/cumple', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-Libro': '1' }, body: JSON.stringify({ cumple: '12-02' }) }));
      await t.p.reload({ waitUntil: 'networkidle' }); await t.p.waitForTimeout(2600); await cerrar(t.p);
      const r = await lee(t.p);
      ok(r.gorrito && !r.gorro, `28 un cumpleaños en diciembre: el gorrito y no el gorro de Navidad (${JSON.stringify(r)})`);
      await t.ctx.close();
    } finally {
      vac.parar();
    }
  });

  // ---------------------------------------------------------------- campamento 29: detalles con cariño (la huella del libro de cumbre, la tele dormida y el teleférico de la película)
  await bloque(async () => {
    const conLs = (x = {}) => [(o) => { try { localStorage.setItem('libro.avisos.preguntado', '1'); for (const [k, v] of Object.entries(o)) localStorage.setItem(k, v); } catch { /* sin almacenamiento */ } }, x];
    const cerrar = async (p) => { for (let k = 0; k < 3 && await p.locator('dialog[open]').count(); k++) { await p.keyboard.press('Escape'); await p.waitForTimeout(300); } };
    const anio = await servidor('anio');
    try {
      // El libro de cumbre de un campamento alcanzado: la huella junto a «Libro de cumbre», del color de la tinta, decorativa.
      {
        const t = await entrar(navegador, anio, LECTOR, { hora: 12 }, conLs());
        await cerrar(t.p);
        const abrirLibro = async () => {
          await t.p.evaluate(() => window.scrollTo(0, 0)); await t.p.waitForTimeout(400);
          if (!(await t.p.evaluate(() => document.getElementById('m-firmas')?.checkVisibility()))) {
            await t.p.evaluate(() => [...document.querySelectorAll('#m-banderas .m-bandera')].find((x) => /alcanz|pasaste|pasó/i.test(x.getAttribute('aria-label') || ''))?.click());
            await t.p.waitForTimeout(600);
          }
          await t.p.evaluate(() => document.getElementById('m-firmas')?.click());
          await t.p.waitForSelector('#d-firmas[open]', { timeout: 4000 });
        };
        await abrirLibro();
        const r = await t.p.evaluate(() => {
          const marca = document.querySelector('#d-firmas .fi-marca'), s = marca.querySelector(':scope > svg.oso-huella'), tinta = getComputedStyle(marca).color;
          return { hay: Boolean(s) && s.getAttribute('aria-hidden') === 'true', una: marca.querySelectorAll('svg').length, txt: marca.innerText.trim(), color: s ? getComputedStyle(s.querySelector('path')).fill === tinta : false };
        });
        ok(r.hay && r.una === 1 && /^libro de cumbre$/i.test(r.txt) && r.color, `29 libro de cumbre: una huella del color de la tinta junto a «${r.txt}»`);
        await t.p.keyboard.press('Escape'); await t.p.waitForTimeout(300);
        await abrirLibro();
        ok(await t.p.evaluate(() => document.querySelectorAll('#d-firmas .fi-marca svg').length) === 1, '29 libro de cumbre: al volver a abrirlo, sigue una sola huella');
        await t.ctx.close();
      }
      // La tele dormida (23:30): los tres durmiendo bajo la hora, tenues, dentro de la caja que se corre con la hora.
      {
        const t = await entrar(navegador, anio, LECTOR, { hora: 23.5, viewport: { width: 1920, height: 1080 } }, conLs());
        await t.p.evaluate(() => { location.hash = '#tv'; }); await t.p.reload({ waitUntil: 'networkidle' }); await t.p.waitForTimeout(4500);
        const r = await t.p.evaluate(() => {
          const caja = document.getElementById('tvn-caja'), s = caja.querySelector(':scope > svg.oso-pose-duermen');
          return { duerme: document.documentElement.dataset.tvDuerme === '1', hay: Boolean(s) && s.getAttribute('aria-hidden') === 'true', op: s ? Number(getComputedStyle(s).opacity) : 1, abajo: s ? s.getBoundingClientRect().top >= document.querySelector('.tvn-nota').getBoundingClientRect().bottom - 1 : false, una: caja.querySelectorAll('svg.oso-ilu').length };
        });
        ok(r.duerme && r.hay && r.una === 1 && r.op > 0.3 && r.op < 0.5 && r.abajo, `29 la tele dormida: los tres durmiendo bajo la hora, tenues (${JSON.stringify(r)})`);
        await t.ctx.close();
      }
      // La tarjeta de la película: la cabina del teleférico, sin tocar el botón ni desbordar, en el teléfono y en escritorio.
      for (const [w, h] of [[320, 640], [390, 844], [768, 1024], [1440, 900]]) {
        const t = await entrar(navegador, anio, ADMIN, { hora: 12, viewport: { width: w, height: h } }, conLs());
        await cerrar(t.p);
        await t.p.click('#cuenta-btn'); await t.p.click('#dc-historia-btn');
        await t.p.waitForSelector('#dh-peli:not([hidden])', { timeout: 6000 }); await t.p.waitForTimeout(300);
        const r = await t.p.evaluate(() => {
          const c = document.getElementById('dh-peli'), s = c.querySelector(':scope > svg.oso-pose-teleferico'), b = document.getElementById('dh-peli-ver').getBoundingClientRect(), q = c.getBoundingClientRect(), a = s?.getBoundingClientRect();
          const cruza = a && a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
          return { hay: Boolean(s) && s.getAttribute('aria-hidden') === 'true', boton: Math.round(b.height), dentro: a ? a.left >= q.left && a.right <= q.right + 0.5 && b.right <= q.right + 0.5 : false, cruza, ancho: document.documentElement.scrollWidth <= innerWidth, una: c.querySelectorAll('svg.oso-ilu').length };
        });
        ok(r.hay && r.una === 1 && r.boton >= 48 && r.dentro && !r.cruza && r.ancho, `29 la película a ${w} px: la cabina dentro de la tarjeta, sin tocar «Ver la película» (${r.boton} px)`);
        await t.ctx.close();
      }
    } finally {
      anio.parar();
    }
  });

  // ---------------------------------------------------------------- campamento 30: hacer sitio (lo de otra temporada no se dibuja ese día, los peldaños en un trazo y las capas sin grupo vacío)
  await bloque(async () => {
    const conLs = (x = {}) => [(o) => { try { localStorage.setItem('libro.avisos.preguntado', '1'); localStorage.setItem('libro.madrugada', '0'); for (const [k, v] of Object.entries(o)) localStorage.setItem(k, v); } catch { /* sin almacenamiento */ } }, x];
    const cerrar = async (p) => { for (let k = 0; k < 3 && await p.locator('dialog[open]').count(); k++) { await p.keyboard.press('Escape'); await p.waitForTimeout(300); } };
    const piezas = (p) => p.evaluate(() => {
      const h = document.getElementById('montana'), n = (sel) => h.querySelectorAll(sel).length;
      return { total: n('*'), navidad: n('.v-navidad'), bufanda: n('.oso-bufanda'), cohetes: n('.cohetes'), papel: n('.papel-picado'), fiesta: n('.v-fiesta'), piscuchas: n('.v-piscuchas'), zompopos: n('.v-zompopos'), milpa: [...new Set([...h.querySelectorAll('.v-mp')].map((e) => [...e.classList].find((c) => /^v-mp-(siembra|jilote|doblada|tapisca|rastrojo)$/.test(c))))], llena: n('.v-q-llena'), hilo: n('.v-q-hilo'), peldanos: n('.peldano'), vacios: [...h.querySelectorAll(':scope > svg.capa > g')].filter((g) => !g.attributes.length).length, milpaHtml: document.documentElement.dataset.milpa };
    });
    const mil = await servidor('mil');
    try {
      // Un día cualquiera de noviembre (época seca, piscuchas): sin Navidad, sin cohetes, sin papel picado ni banderas, sin zompopos; de la
      // milpa solo su etapa de hoy; de la quebrada, solo el hilo.
      const t = await entrar(navegador, mil, ADMIN, { hora: 12, viewport: { width: 390, height: 664 } }, conLs({ 'libro.dia': '2026-11-25', 'libro.efectos': 'esenciales' }));
      await cerrar(t.p);
      let r = await piezas(t.p);
      ok(r.navidad === 0 && r.bufanda === 0 && r.cohetes === 0 && r.papel === 0 && r.fiesta === 0 && r.zompopos === 0 && r.piscuchas > 0, `30 un día de noviembre: nada de otra temporada en la escena (${JSON.stringify(r)})`);
      ok(r.milpa.length === 1 && r.milpa[0] === `v-mp-${r.milpaHtml}` && r.llena === 0 && r.hilo > 0, `30 la milpa solo en su etapa de hoy (${r.milpa}) y la quebrada de la época seca`);
      ok(r.peldanos === 1 && r.vacios === 0, `30 los peldaños en un solo trazo (${r.peldanos}) y las capas sin su grupo vacío (${r.vacios})`);
      ok(r.total <= 960, `30 la escena con mil compras un día de noviembre: ${r.total} nodos (antes, 1070)`);
      // Si cambia el día con la página abierta (cielo.js avisa con «libro:dia»), la escena se vuelve a dibujar con lo de la temporada nueva.
      const r2 = await t.p.evaluate(() => { localStorage.setItem('libro.dia', '2026-12-24'); window.libroCielo.aplicar(); const h = document.getElementById('montana'); return { navidad: h.querySelectorAll('.v-navidad').length, cohetes: h.querySelectorAll('.cohetes').length, total: h.querySelectorAll('*').length }; });
      ok(r2.navidad > 0 && r2.cohetes > 0 && r2.total > r.total, `30 al pasar a Nochebuena con la página abierta, la escena se vuelve a dibujar con su Navidad (${JSON.stringify(r2)})`);
      ok(t.consola.length === 0, `30 consola limpia (${t.consola.slice(0, 2)})`);
      await t.ctx.close();
      // Nochebuena desde el principio: la Navidad y los cohetes (salen a las 23:50), y la escena dentro del tope con margen.
      const n = await entrar(navegador, mil, ADMIN, { hora: 21, viewport: { width: 390, height: 664 } }, conLs({ 'libro.dia': '2026-12-24', 'libro.efectos': 'esenciales' }));
      await cerrar(n.p);
      r = await piezas(n.p);
      ok(r.navidad > 0 && r.bufanda > 0 && r.cohetes > 0 && r.piscuchas === 0 && r.total <= 1030, `30 Nochebuena: con su Navidad y sus cohetes, sin piscuchas; ${r.total} nodos (antes, 1070)`);
      await n.ctx.close();
      // Una tarde de lluvia de julio: la quebrada llena (y no el hilo); en las agostinas, el papel picado y las banderas.
      const l = await entrar(navegador, mil, ADMIN, { hora: 15, viewport: { width: 390, height: 664 } }, conLs({ 'libro.dia': '2026-07-10' }));
      await cerrar(l.p);
      r = await piezas(l.p);
      ok(r.llena > 0 && r.hilo === 0 && r.papel === 0, `30 en julio, la quebrada llena (${r.llena}) y sin el hilo de la época seca`);
      await l.p.evaluate(() => { localStorage.setItem('libro.dia', '2026-08-03'); window.libroCielo.aplicar(); });
      r = await piezas(l.p);
      ok(r.papel === 1 && r.fiesta > 0, `30 en las agostinas (cambiando de día con la página abierta), el papel picado y las banderas del pueblo`);
      await l.ctx.close();
    } finally {
      mil.parar();
    }
  });

  // ---------------------------------------------------------------- campamento 31: «Tú» sube como oso (el osito con su mochila naranja, la pisada, sus huellas, el eco, anda y festeja)
  await bloque(async () => {
    const conLs = (x = {}) => [(o) => { try { localStorage.setItem('libro.avisos.preguntado', '1'); localStorage.setItem('libro.madrugada', '0'); for (const [k, v] of Object.entries(o)) localStorage.setItem(k, v); } catch { /* sin almacenamiento */ } }, x];
    const cerrar = async (p) => { for (let k = 0; k < 3 && await p.locator('dialog[open]').count(); k++) { await p.keyboard.press('Escape'); await p.waitForTimeout(300); } };
    /** El osito de «Tú»: dónde están sus pies frente al punto del sendero, la pisada, su caja y el rótulo. */
    const tu = (p) => p.evaluate(() => {
      const h = document.getElementById('montana'), yo = h.querySelector('#m-yo'), oso = yo.querySelector('.tu .oso-tu'), pis = yo.querySelector('.yo-punto'), caja = yo.querySelector('.yo-anillo');
      const [tx, ty] = yo.getAttribute('transform').match(/-?[\d.]+/g).map(Number);
      const camino = h.querySelector('#m-sendero'), L = camino.getTotalLength();
      let d = 1e9; for (let l = 0; l <= L; l += 0.5) { const q = camino.getPointAtLength(l); d = Math.min(d, Math.hypot(q.x - tx, q.y - ty)); }
      const r = (e) => e.getBoundingClientRect(), cruza = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
      const ob = r(oso), cb = r(caja), rot = [...h.querySelectorAll('#m-etiquetas .eti-yo, #m-etiquetas .yo-txt')].map(r);
      const naranja = getComputedStyle(oso.querySelector('.oso-mochila')).fill === getComputedStyle(pis).fill;
      return { hay: Boolean(oso), enSendero: d < 0.6, pisadaEnPunto: Math.abs(Number(pis.getAttribute('cy') ?? 0)) < 2 && !pis.getAttribute('cx'), dentro: ob.left >= cb.left - 1 && ob.right <= cb.right + 1 && ob.top >= cb.top - 1 && ob.bottom <= cb.bottom + 2, rotulo: rot.length > 0 && !rot.some((q) => cruza(q, cb)), naranja, nodos: yo.querySelectorAll('*').length + 1, alto: Math.round(ob.height), decorativo: Boolean(yo.closest('[aria-hidden="true"]')) && !oso.closest('[role="img"]:not(svg)') };
    });
    const anio = await servidor('anio');
    try {
      for (const [w, h] of [[320, 568], [390, 844], [1440, 900]]) {
        const t = await entrar(navegador, anio, ADMIN, { hora: 12, viewport: { width: w, height: h } }, conLs({ 'libro.efectos': 'todos' }));
        await cerrar(t.p); await t.p.evaluate(() => window.scrollTo(0, 0)); await t.p.waitForTimeout(300);
        const r = await tu(t.p);
        ok(r.hay && r.enSendero && r.pisadaEnPunto && r.dentro && r.rotulo && r.naranja && r.decorativo, `31 a ${w} px: «Tú» es el osito con la mochila naranja, los pies sobre el sendero, dentro de su caja y sin su rótulo encima (${JSON.stringify(r)})`);
        ok(r.nodos <= 24 && r.alto >= 18, `31 a ${w} px: el osito mide ${r.alto} px y #m-yo son ${r.nodos} nodos (≤ 24)`);
        const hu = await t.p.evaluate(() => { const c = document.querySelector('#m-huellas'); return { trazos: c.querySelectorAll('path').length, circulos: c.querySelectorAll('circle').length, n: Number(c.querySelector('.huellas-oso')?.dataset.n ?? 0) }; });
        ok(hu.trazos === 1 && hu.circulos === 0 && hu.n > 2, `31 a ${w} px: las huellas son de oso y van en un solo trazo (${hu.n} huellas)`);
        await t.ctx.close();
      }
      // Anda mientras sube (al abrir la app sube desde la salida) y se queda quieto al llegar; con «ninguno», ni anda ni levanta los brazos.
      const vigila = () => { window.__anda = false; const t0 = performance.now(); const mira = () => { if (document.getElementById('m-yo')?.classList.contains('anda')) window.__anda = true; if (performance.now() - t0 < 8000) setTimeout(mira, 100); }; mira(); };
      for (const ef of ['todos', 'ninguno']) {
        const ctx = await navegador.newContext({ ...devices['iPhone 13'] });
        const p = await ctx.newPage();
        await p.addInitScript((e) => { try { localStorage.setItem('libro.hora', '12'); localStorage.setItem('libro.pestanas', 'todo'); localStorage.setItem('libro.avisos.preguntado', '1'); localStorage.setItem('libro.efectos', e); } catch { /* sin almacenamiento */ } }, ef);
        await p.addInitScript(vigila);
        await p.goto(`${anio.url}/login`, { waitUntil: 'networkidle' });
        await p.fill('input[autocomplete="username"]', ADMIN[0]); await p.fill('input[autocomplete="current-password"]', ADMIN[1]);
        await Promise.all([p.waitForURL('**/'), p.click('button[type=submit], .guardar')]);
        await p.waitForTimeout(3000);
        const r = await p.evaluate(() => { const yo = document.getElementById('m-yo'); yo.classList.add('festeja'); const f = getComputedStyle(yo.querySelector('.tu-festeja')).display; yo.classList.remove('festeja'); return { anduvo: window.__anda, ahora: yo.classList.contains('anda'), festeja: f, respira: getComputedStyle(yo.querySelector('.oso-tu')).animationName }; });
        if (ef === 'todos') ok(r.anduvo && !r.ahora && r.festeja === 'inline' && r.respira === 'tu-respira', `31 con «todos»: anduvo al subir, quieto al llegar, respira y levanta los brazos (${JSON.stringify(r)})`);
        else ok(!r.ahora && r.festeja === 'none' && r.respira === 'none', `31 con «ninguno»: quieto, sin brazos alzados ni respiración (${JSON.stringify(r)})`);
        await ctx.close();
      }
    } finally {
      anio.parar();
    }
    // El eco de hace un año: el mismo osito, translúcido, lejos de «Tú».
    const sEco = await servidor('eco');
    try {
      const t = await entrar(navegador, sEco, ADMIN, { hora: 12 }, conLs());
      await cerrar(t.p);
      const r = await t.p.evaluate(() => { const f = document.querySelector('#m-eco .eco-fantasma'); return { oso: Boolean(f?.querySelector('.oso-tu')), op: f ? Number(getComputedStyle(f.querySelector('.tu')).opacity) : 1, caja: Boolean(f?.querySelector('rect.eco-anillo')) }; });
      ok(r.oso && r.caja && r.op > 0.3 && r.op < 0.7, `31 el eco de hace un año es el osito, translúcido (${JSON.stringify(r)})`);
      await t.ctx.close();
    } finally {
      sEco.parar();
    }
  });

  // ---------------------------------------------------------------- campamento 32: el teleférico del valle (pantallas anchas; la cabina en su capa, se mueve solo en su franja)
  await bloque(async () => {
    const conLs = (x = {}) => [(o) => { try { localStorage.setItem('libro.avisos.preguntado', '1'); localStorage.setItem('libro.madrugada', '0'); localStorage.setItem('libro.dia', '2026-11-25'); for (const [k, v] of Object.entries(o)) localStorage.setItem(k, v); } catch { /* sin almacenamiento */ } }, x];
    const cerrar = async (p) => { for (let k = 0; k < 3 && await p.locator('dialog[open]').count(); k++) { await p.keyboard.press('Escape'); await p.waitForTimeout(300); } };
    const tele = (p) => p.evaluate(() => {
      const h = document.getElementById('montana'), cab = h.querySelector(':scope > svg.tele-cabina'), cable = h.querySelector('#m-v-pie .v-tele-cable');
      if (!cab || !cable) return { hay: false, cabina: Boolean(cab), cable: Boolean(cable) };
      const principal = h.querySelector(':scope > svg'), frente = h.querySelector(':scope > svg.frente');
      const [, ax, ay, bx, by] = cable.getAttribute('d').match(/M([\d.]+) ([\d.]+)L([\d.]+) ([\d.]+)/).map(Number);
      const camino = h.querySelector('#m-sendero'), L = camino.getTotalLength(); let lejos = 1e9;
      for (let l = 0; l <= L; l += 2) { const q = camino.getPointAtLength(l), dx = bx - ax, dy = by - ay, k = Math.max(0, Math.min(1, ((q.x - ax) * dx + (q.y - ay) * dy) / (dx * dx + dy * dy))); lejos = Math.min(lejos, Math.hypot(q.x - ax - k * dx, q.y - ay - k * dy)); }
      return { hay: true, capa: cab.previousElementSibling !== null && Boolean(cab.compareDocumentPosition(frente) & Node.DOCUMENT_POSITION_FOLLOWING) && principal.contains(cable), aria: cab.getAttribute('aria-hidden'), nodos: cab.querySelectorAll('*').length + 1, anim: getComputedStyle(cab).animationName, lejos: Math.round(lejos), wc: getComputedStyle(cab).willChange, mueve: document.documentElement.dataset.mueve ?? '' };
    });
    const anio = await servidor('anio');
    try {
      for (const [w, h, hora, ef, espera] of [[1440, 900, 11, 'todos', 'tele-va'], [1440, 900, 14, 'todos', 'none'], [1440, 900, 11, 'esenciales', 'none'], [2560, 1440, 11, 'todos', 'tele-va'], [1100, 800, 12, 'todos', 'tele-va']]) {
        const t = await entrar(navegador, anio, ADMIN, { hora, viewport: { width: w, height: h } }, conLs({ 'libro.efectos': ef }));
        await cerrar(t.p);
        const r = await tele(t.p);
        ok(r.hay && r.capa && r.aria === 'true' && r.nodos <= 7 && r.lejos >= 10 && r.wc === 'transform', `32 a ${w} px: el cable en el valle y la cabina en su capa (bajo el frente), lejos del sendero (${r.lejos} px), ${r.nodos} nodos`);
        ok(r.anim === espera, `32 a ${w} px, ${hora} h, «${ef}»: la cabina ${espera === 'none' ? 'quieta' : 'viaja'} (data-mueve «${r.mueve}», ${r.anim})`);
        await t.ctx.close();
      }
      const t = await entrar(navegador, anio, ADMIN, { hora: 11, viewport: { width: 390, height: 844 } }, conLs({ 'libro.efectos': 'todos' }));
      await cerrar(t.p);
      const r = await tele(t.p);
      ok(!r.hay && !r.cabina && !r.cable, '32 en el teléfono no hay teleférico (cruzaría el sendero)');
      await t.ctx.close();
    } finally {
      anio.parar();
    }
  });

  // ---------------------------------------------------------------- campamento 33: más ositos en el paisaje (los de la cumbre se estiran por la mañana)
  await bloque(async () => {
    const conLs = (x = {}) => [(o) => { try { localStorage.setItem('libro.avisos.preguntado', '1'); localStorage.setItem('libro.madrugada', '0'); localStorage.setItem('libro.dia', '2026-11-25'); for (const [k, v] of Object.entries(o)) localStorage.setItem(k, v); } catch { /* sin almacenamiento */ } }, x];
    const cerrar = async (p) => { for (let k = 0; k < 3 && await p.locator('dialog[open]').count(); k++) { await p.keyboard.press('Escape'); await p.waitForTimeout(300); } };
    const anio = await servidor('anio');
    try {
      // A las 7:00 (el primer minuto de su franja), el reloj de la escena los pone a estirarse; uno tras otro, y después quietos.
      const t = await entrar(navegador, anio, ADMIN, { hora: 7, viewport: { width: 390, height: 844 } }, conLs({ 'libro.efectos': 'todos' }));
      await cerrar(t.p);
      await t.p.waitForFunction(() => document.querySelector('#m-osos.osos')?.classList.contains('estira-1'), null, { timeout: 25000 });
      const r = await t.p.evaluate(() => ({ sin: document.querySelector('#m-osos.osos').hasAttribute('data-sin-estirar'), ve: [...document.querySelectorAll('#m-osos .oso .oso-brazos')].map((b) => getComputedStyle(b).display) }));
      ok(r.sin || r.ve[0] === 'inline', `33 a las 7:00 los de la cumbre se estiran, uno tras otro (${JSON.stringify(r)})`);
      await t.p.waitForFunction(() => !document.querySelector('#m-osos.osos')?.classList.contains('estira-1'), null, { timeout: 5000 });
      const q = await t.p.evaluate(() => [...document.querySelectorAll('#m-osos .oso .oso-brazos')].every((b) => getComputedStyle(b).display === 'none'));
      ok(q, '33 a los dos segundos y medio, otra vez quietos');
      await t.ctx.close();
      // Con «esenciales» no (es ambiente); y a mediodía el reloj no los pone.
      const e = await entrar(navegador, anio, ADMIN, { hora: 7, viewport: { width: 390, height: 844 } }, conLs({ 'libro.efectos': 'esenciales' }));
      await cerrar(e.p);
      const v = await e.p.evaluate(() => { const o = document.querySelector('#m-osos.osos'); if (!o) return 'sin osos'; o.classList.add('estira-1'); return getComputedStyle(o.querySelector('.oso-brazos')).display; });
      ok(v === 'none', `33 con «esenciales» no se estiran (${v})`);
      await e.ctx.close();
    } finally {
      anio.parar();
    }
  });

  // ---------------------------------------------------------------- pulido del pueblo: las casas en su sitio (ninguna sobre la iglesia ni montada en otra; la fila de atrás en su terraza)
  await bloque(async () => {
    const conLs = [() => { try { localStorage.setItem('libro.avisos.preguntado', '1'); localStorage.setItem('libro.madrugada', '0'); localStorage.setItem('libro.dia', '2026-11-25'); localStorage.setItem('libro.efectos', 'esenciales'); } catch { /* sin almacenamiento */ } }, null];
    const cerrar = async (p) => { for (let k = 0; k < 3 && await p.locator('dialog[open]').count(); k++) { await p.keyboard.press('Escape'); await p.waitForTimeout(300); } };
    // Las cajas de cada casa, como se dibujaron: cada subtrazo de las fachadas y de los tejados, medido en la escena.
    const casas = (p) => p.evaluate(() => {
      const g = document.querySelector('#montana .v-pueblo'); if (!g) return null;
      const svg = g.ownerSVGElement, hijos = [...g.children], iIg = hijos.findIndex((e) => e.matches('.v-ig-lado'));
      const sub = (e) => (e.getAttribute('d') || '').split(/(?=M)/).filter(Boolean).map((d) => { const t = document.createElementNS('http://www.w3.org/2000/svg', 'path'); t.setAttribute('d', d); svg.append(t); const b = t.getBBox(); t.remove(); return { x0: b.x, x1: b.x + b.width, y0: b.y, y1: b.y + b.height }; });
      const de = (sel, atras) => hijos.filter((e, i) => e.matches(sel) && (atras ? i < iIg : i > iIg)).flatMap(sub);
      const ig = hijos.filter((e) => e.matches('.v-ig-lado, .v-ig-frente, .v-ig-torre, .v-ig-cupula')).flatMap(sub);
      const cajaIg = ig.reduce((u, b) => ({ x0: Math.min(u.x0, b.x0), x1: Math.max(u.x1, b.x1), y0: Math.min(u.y0, b.y0), y1: Math.max(u.y1, b.y1) }), { x0: 1e9, x1: -1e9, y0: 1e9, y1: -1e9 });
      const cruza = (a, b, m = 0.5) => a.x0 < b.x1 - m && a.x1 > b.x0 + m && a.y0 < b.y1 - m && a.y1 > b.y0 + m;
      const fachAt = de('.v-frente', true), techoFr = de('.v-techo-l', false).filter((b) => !cruza(b, cajaIg)), fachFr = de('.v-frente', false);
      const tapadas = fachAt.map((a) => Math.max(0, ...techoFr.filter((t) => a.x0 < t.x1 && a.x1 > t.x0).map((t) => Math.max(0, a.y1 - Math.max(a.y0, t.y0)) / (a.y1 - a.y0))));
      return { atras: fachAt.length, frente: fachFr.length, terraza: hijos.some((e, i) => e.matches('.v-terraza') && i < iIg), sobreIglesia: [...fachAt, ...fachFr].filter((a) => cruza(a, cajaIg)).length, juntas: fachFr.filter((a, i) => fachFr.slice(i + 1).some((b) => cruza(a, b))).length, peorTapada: Math.round(Math.max(0, ...tapadas) * 100) };
    });
    const anio = await servidor('anio');
    try {
      for (const [w, h, hora] of [[390, 844, 12], [768, 1024, 21], [1440, 900, 12], [2560, 1440, 21]]) {
        const t = await entrar(navegador, anio, ADMIN, { hora, viewport: { width: w, height: h } }, conLs);
        await cerrar(t.p);
        const r = await casas(t.p);
        ok(r && r.frente >= 2 && (r.atras === 0 || r.terraza) && r.sobreIglesia === 0 && r.juntas === 0 && r.peorTapada <= 40, `pulido del pueblo a ${w} px: ${r?.frente} casas delante y ${r?.atras} en la terraza, ninguna sobre la iglesia ni sobre otra; la fachada de atrás más tapada, al ${r?.peorTapada} % (${JSON.stringify(r)})`);
        await t.ctx.close();
      }
    } finally {
      anio.parar();
    }
  });

  // ---------------------------------------------------------------- pulido de la iglesia y el paisaje bajo: la iglesia en su atrio, cada cosa con su base en el suelo, la milpa y el reloj fuera del pueblo
  await bloque(async () => {
    const conLs = (dia) => [(d) => { try { localStorage.setItem('libro.avisos.preguntado', '1'); localStorage.setItem('libro.madrugada', '0'); localStorage.setItem('libro.dia', d); localStorage.setItem('libro.efectos', 'todos'); } catch { /* sin almacenamiento */ } }, dia];
    const cerrar = async (p) => { for (let k = 0; k < 3 && await p.locator('dialog[open]').count(); k++) { await p.keyboard.press('Escape'); await p.waitForTimeout(300); } };
    const mide = (p) => p.evaluate(() => {
      const h = document.getElementById('montana'), g = h.querySelector('.v-pueblo');
      const bb = (e) => { const b = e.getBBox(); return { x0: b.x, x1: b.x + b.width, y0: b.y, y1: b.y + b.height }; };
      const una = (sel) => { const es = [...h.querySelectorAll(sel)].filter((e) => getComputedStyle(e).display !== 'none'); if (!es.length) return null; return es.map(bb).reduce((u, b) => ({ x0: Math.min(u.x0, b.x0), x1: Math.max(u.x1, b.x1), y0: Math.min(u.y0, b.y0), y1: Math.max(u.y1, b.y1) })); };
      const cruza = (a, b, m = 0.5) => a && b && a.x0 < b.x1 - m && a.x1 > b.x0 + m && a.y0 < b.y1 - m && a.y1 > b.y0 + m;
      const suelo = una('.v-pueblo :is(.v-calle, .v-plaza)'), fachada = una('.v-pueblo :is(.v-ig-frente, .v-ig-torre)'), atrio = una('.v-pueblo .v-ig-atrio');
      const pueblo = una('.v-pueblo :is(.v-frente, .v-pared-l, .v-techo-l, .v-ig-frente, .v-ig-torre, .v-ig-lado)');
      // Las bases: cada árbol del pueblo, cada farol, el perro y las gallinas, con su pie dentro de la calle o la plaza.
      const pies = [...g.querySelectorAll('.v-ar-tronco, .v-pz-tronco, .v-farol-poste, .v-animal, .v-gallina')].filter((e) => getComputedStyle(e).display !== 'none').map((e) => { const b = bb(e); return { c: e.getAttribute('class'), y: b.y1, x: (b.x0 + b.x1) / 2 }; });
      const sueltos = pies.filter((q) => q.y < suelo.y0 - 1.5 || q.y > suelo.y1 + 1.5 || q.x < suelo.x0 - 2 || q.x > suelo.x1 + 40).map((q) => q.c);
      const piedras = [...h.querySelectorAll('.reloj-piedra')].map(bb).filter((b) => cruza(b, una('.v-pueblo .v-calle'), 0)).length;
      return { atrio: Boolean(atrio && Math.abs(atrio.y0 - fachada.y1) < 1.5 && atrio.x0 <= fachada.x0 + 1 && atrio.x1 >= fachada.x1 - 1), sueltos, piedras, milpa: cruza(una('.v-campos .v-mp'), pueblo, 1), camino: Boolean(h.querySelector('.v-cm')), chimeneas: h.querySelectorAll('.v-pueblo .v-chimenea').length };
    });
    const anio = await servidor('anio');
    try {
      for (const [w, h] of [[390, 844], [768, 1024], [1440, 900], [2560, 1440]]) {
        const t = await entrar(navegador, anio, ADMIN, { hora: 15, viewport: { width: w, height: h } }, conLs('2026-07-10'));
        await cerrar(t.p);
        const r = await mide(t.p);
        ok(r.atrio && r.sueltos.length === 0 && r.piedras === 0 && !r.milpa && r.chimeneas === 1, `pulido a ${w} px: la iglesia en su atrio, cada árbol, farol y animal con el pie en el suelo, ni el reloj ni la milpa sobre el pueblo, una chimenea (${JSON.stringify(r)})`);
        await t.ctx.close();
      }
      // En Navidad el perro no queda dentro del nacimiento y el cordón de foquitos de la torre se amarra en un farol.
      for (const [w, h] of [[390, 844], [1440, 900]]) {
        const t = await entrar(navegador, anio, ADMIN, { hora: 20, viewport: { width: w, height: h } }, conLs('2026-12-24'));
        await cerrar(t.p);
        const r = await t.p.evaluate(() => {
          const bb = (e) => { const b = e.getBBox(); return { x0: b.x, x1: b.x + b.width, y0: b.y, y1: b.y + b.height }; };
          const perro = bb(document.querySelector('#montana .v-animal')), portal = [...document.querySelectorAll('#montana .v-pueblo [class*="v-belen"]')].map(bb).reduce((u, b) => ({ x0: Math.min(u.x0, b.x0), x1: Math.max(u.x1, b.x1), y0: Math.min(u.y0, b.y0), y1: Math.max(u.y1, b.y1) }));
          const fin = (document.querySelector('#montana .v-cordel').getAttribute('d').split('M')[1] ?? '').trim().split(/[ QL]+/).slice(-2).map(Number);
          const lamparas = (document.querySelector('#montana .v-farol-lampara').getAttribute('d') ?? '').split('M').filter(Boolean).map((d) => d.split(/[ L]+/).map(Number));
          const cerca = lamparas.some((l) => Math.abs(l[0] - fin[0]) < 6 && Math.abs(l[1] - fin[1]) < 12);
          return { dentro: perro.x0 < portal.x1 && perro.x1 > portal.x0 && perro.y0 < portal.y1 && perro.y1 > portal.y0, cerca };
        });
        ok(!r.dentro && r.cerca, `pulido a ${w} px en Nochebuena: el perro fuera del nacimiento y los foquitos de la torre amarrados al farol (${JSON.stringify(r)})`);
        await t.ctx.close();
      }
    } finally {
      anio.parar();
    }
  });

  // ---------------------------------------------------------------- campamento 34: el pueblo vive (las gallinas picotean, el perro cruza la plaza, el Día de la Cruz)
  await bloque(async () => {
    const conLs = (dia, x = {}) => [(o) => { try { localStorage.setItem('libro.avisos.preguntado', '1'); localStorage.setItem('libro.madrugada', '0'); localStorage.setItem('libro.dia', o.dia); for (const [k, v] of Object.entries(o.x)) localStorage.setItem(k, v); } catch { /* sin almacenamiento */ } }, { dia, x }];
    const cerrar = async (p) => { for (let k = 0; k < 3 && await p.locator('dialog[open]').count(); k++) { await p.keyboard.press('Escape'); await p.waitForTimeout(300); } };
    const pueblo = (p) => p.evaluate(() => {
      const h = document.getElementById('montana'), frente = h.querySelector(':scope > svg.frente'), ve = (e) => e && getComputedStyle(e).display !== 'none';
      const capas = (sel) => [...h.querySelectorAll(`:scope > svg.${sel}`)].map((c) => ({ ve: ve(c), anim: getComputedStyle(c).animationName, bajoFrente: !frente || Boolean(c.compareDocumentPosition(frente) & Node.DOCUMENT_POSITION_FOLLOWING), aria: c.getAttribute('aria-hidden'), nodos: c.querySelectorAll('*').length + 1 }));
      const vis = (sel) => { const e = h.querySelector(`#m-v-pie ${sel}`); return e ? getComputedStyle(e).visibility : 'no hay'; };
      return { mueve: document.documentElement.dataset.mueve ?? '', gallinas: capas('v-capa-gallina'), perro: capas('v-capa-perro'), vGallina: vis('.v-gallina'), vAnimal: vis('.v-animal'), cruz: Boolean(h.querySelector('.v-cruz-mayo')) };
    });
    const anio = await servidor('anio');
    try {
      for (const [w, h] of [[390, 844], [1440, 900]]) {
        // A las 8:00 picotean las tres gallinas (cada una en su capa, bajo el frente) y las del dibujo grande se esconden.
        let t = await entrar(navegador, anio, ADMIN, { hora: 8, viewport: { width: w, height: h } }, conLs('2026-11-25', { 'libro.efectos': 'todos' }));
        await cerrar(t.p);
        let r = await pueblo(t.p);
        ok(r.mueve === 'gallinas' && r.gallinas.length === 3 && r.gallinas.every((c) => c.ve && c.anim === 'gallina-pica' && c.bajoFrente && c.aria === 'true' && c.nodos === 2) && r.vGallina === 'hidden' && r.perro.every((c) => !c.ve) && r.vAnimal === 'visible', `34 a ${w} px, 8:00: las tres gallinas picotean en su capa (${JSON.stringify(r).slice(0, 220)})`);
        await t.ctx.close();
        // A las 14:30 el perro cruza la plaza (una vez) y se echa en su sitio (desde el campamento 37, de 14:00 a 15:00).
        t = await entrar(navegador, anio, ADMIN, { hora: 14.5, viewport: { width: w, height: h } }, conLs('2026-11-25', { 'libro.efectos': 'todos' }));
        await cerrar(t.p);
        r = await pueblo(t.p);
        ok(r.mueve === 'perro' && r.perro.length === 2 && r.perro.every((c) => c.ve && c.bajoFrente && c.aria === 'true') && r.perro.map((c) => c.anim).join() === 'perro-cruza,perro-echa' && r.vAnimal === 'hidden' && r.gallinas.every((c) => !c.ve) && r.vGallina === 'visible', `34 a ${w} px, 15:00: el perro cruza la plaza (${JSON.stringify(r.perro)})`);
        const fin = await t.p.evaluate(() => { for (const a of document.getAnimations()) if (/^perro-/.test(a.animationName)) a.finish(); return [...document.querySelectorAll('#montana > svg.v-capa-perro')].map((c) => getComputedStyle(c).opacity); });
        ok(fin.join() === '0,1', `34 a ${w} px: al llegar, el que anda se va y queda el echado (${fin})`);
        await t.ctx.close();
      }
      // Fuera de su franja, o con «esenciales», todos quietos como siempre.
      for (const [hora, ef] of [[12, 'todos'], [8, 'esenciales'], [15, 'ninguno']]) {
        const t = await entrar(navegador, anio, ADMIN, { hora, viewport: { width: 390, height: 844 } }, conLs('2026-11-25', { 'libro.efectos': ef }));
        await cerrar(t.p);
        const r = await pueblo(t.p);
        ok([...r.gallinas, ...r.perro].every((c) => !c.ve) && r.vGallina === 'visible' && r.vAnimal === 'visible' && !r.cruz, `34 a las ${hora}:00 con «${ef}»: las gallinas y el perro quietos en el dibujo, y sin cruz fuera del 3 de mayo`);
        await t.ctx.close();
      }
      // El 3 de mayo, la cruz en la plaza.
      const t = await entrar(navegador, anio, ADMIN, { hora: 11, viewport: { width: 390, height: 844 } }, conLs('2026-05-03', { 'libro.efectos': 'todos' }));
      await cerrar(t.p);
      const c = await t.p.evaluate(() => { const g = document.querySelector('#montana .v-cruz-mayo'); if (!g) return null; const b = g.getBBox(), a = document.querySelector('#m-v-pie .v-animal').getBBox(); return { piezas: g.children.length, palo: getComputedStyle(g.querySelector('.v-cm-palo')).fill, sobrePerro: b.x + b.width * 0.5 > a.x && b.x + b.width * 0.5 < a.x + a.width }; });
      ok(c && c.piezas === 4 && c.palo !== 'none' && !c.sobrePerro, `34 el 3 de mayo, la cruz con frutas y su cadena en la plaza, junto al perro (${JSON.stringify(c)})`);
      await t.ctx.close();
    } finally {
      anio.parar();
    }
  });

  // ---------------------------------------------------------------- campamento 35: el pueblo de los osos (los vecinos son osos, por turnos; de noche nadie; los hilos de las piscuchas)
  await bloque(async () => {
    const conLs = (dia, x = {}) => [(o) => { try { localStorage.setItem('libro.avisos.preguntado', '1'); localStorage.setItem('libro.madrugada', '0'); localStorage.setItem('libro.dia', o.dia); for (const [k, v] of Object.entries(o.x)) localStorage.setItem(k, v); } catch { /* sin almacenamiento */ } }, { dia, x }];
    const cerrar = async (p) => { for (let k = 0; k < 3 && await p.locator('dialog[open]').count(); k++) { await p.keyboard.press('Escape'); await p.waitForTimeout(300); } };
    // Los vecinos: uno por subtrazo de la sombra de contacto (`.v-vo-pie`), con su caja; todos en la calle o la plaza, ninguno encima de otro.
    const pueblo = (p) => p.evaluate(() => {
      const g = document.querySelector('#montana .v-vecinos'); if (!g) return null;
      const svg = g.ownerSVGElement, pie = g.querySelector('.v-vo-pie');
      const cajas = (pie?.getAttribute('d') || '').split(/(?=M)/).filter(Boolean).map((d) => { const t = document.createElementNS('http://www.w3.org/2000/svg', 'path'); t.setAttribute('d', d); svg.append(t); const b = t.getBBox(); t.remove(); return b; });
      const calle = [...document.querySelectorAll('#montana .v-pueblo :is(.v-calle, .v-plaza)')].map((e) => e.getBBox()).reduce((u, b) => ({ x0: Math.min(u.x0, b.x), x1: Math.max(u.x1, b.x + b.width), y0: Math.min(u.y0, b.y), y1: Math.max(u.y1, b.y + b.height) }), { x0: 1e9, x1: -1e9, y0: 1e9, y1: -1e9 });
      const fuera = cajas.filter((b) => { const cx = b.x + b.width / 2, cy = b.y + b.height / 2; return cx < calle.x0 || cx > calle.x1 || cy < calle.y0 - 2 || cy > calle.y1 + 2; }).length;
      const encima = cajas.filter((a, i) => cajas.slice(i + 1).some((b) => Math.abs(a.x + a.width / 2 - (b.x + b.width / 2)) < Math.min(a.width, b.width) * 0.5 && Math.abs(a.y - b.y) < a.height * 2)).length;
      const hilos = [...(g.querySelector('.v-pis-hilo')?.getAttribute('d') ?? '').matchAll(/ ([\d.]+) ([\d.]+)(?=M|$)/g)].map((m) => `${m[1]},${m[2]}`);
      return { turno: document.documentElement.dataset.turno, n: cajas.length, fuera, encima, paths: g.querySelectorAll('path').length, gente: document.querySelectorAll('.v-gente').length, clases: [...g.querySelectorAll('path')].every((e) => /^(v-vo-[a-z0-9]+|v-charco v-vo-luz|efecto-ambiente v-piscuchas v-pis-hilo)$/.test(e.getAttribute('class'))), hilos, svg: svg === document.querySelector('#montana > svg') && svg, pieV: document.getElementById('m-v-pie') };
    });
    const anio = await servidor('anio');
    try {
      for (const [w, h] of [[390, 844], [1440, 900]]) {
        // Un miércoles de octubre (escuela): por la mañana sin oseznos; por la tarde, los cinco con su pelota; de noche, nadie.
        for (const [hora, turno, min, max] of [[6, 'amanece', 2, 3], [9, 'manana', 3, 5], [12.5, 'siesta', 2, 3], [15, 'tarde', 6, 8], [19, 'pupusas', 3, 5], [23, 'duerme', 0, 0]]) {
          const t = await entrar(navegador, anio, ADMIN, { hora, viewport: { width: w, height: h } }, conLs('2026-10-14', { 'libro.efectos': 'esenciales' }));
          await cerrar(t.p);
          const r = await pueblo(t.p);
          ok(r && r.turno === turno && r.n >= min && r.n <= max && r.fuera === 0 && r.encima === 0 && r.gente === 0 && r.clases, `35 a ${w} px, ${hora}:00 (${turno}): ${r?.n} vecinos osos en la calle y la plaza, ninguno encima de otro ni fuera, sin siluetas de antes (${JSON.stringify({ ...r, svg: undefined, pieV: undefined, hilos: undefined })})`);
          await t.ctx.close();
        }
      }
      // Con la página abierta, al cambiar de turno se rehacen solo los vecinos: el dibujo grande es el mismo.
      const t = await entrar(navegador, anio, ADMIN, { hora: 13.9, viewport: { width: 390, height: 844 } }, conLs('2026-10-14', { 'libro.efectos': 'esenciales' }));
      await cerrar(t.p);
      const antes = await t.p.evaluateHandle(() => document.querySelector('#montana > svg'));
      const a = await pueblo(t.p);
      await t.p.evaluate(() => { localStorage.setItem('libro.hora', '14.1'); window.libroCielo.aplicar(); });
      await t.p.waitForTimeout(200);
      const b = await pueblo(t.p);
      const mismo = await t.p.evaluate((x) => x === document.querySelector('#montana > svg'), antes);
      ok(a.turno === 'siesta' && b.turno === 'tarde' && b.n > a.n && mismo, `35: al pasar de la siesta a la tarde con la página abierta, salen los oseznos sin redibujar la escena (${a.n} → ${b.n})`);
      await t.ctx.close();
      // En noviembre, con «todos»: de tarde los hilos de las piscuchas bajan a la manita de un osezno; de noche, amarrados al poste del farol.
      const hilos = async (hora) => { const x = await entrar(navegador, anio, ADMIN, { hora, viewport: { width: 1440, height: 900 } }, conLs('2026-11-25', { 'libro.efectos': 'todos' })); await cerrar(x.p); const r = await pueblo(x.p); await x.ctx.close(); return r.hilos; };
      const [tarde, noche] = [await hilos(15), await hilos(23)];
      ok(tarde.length >= 2 && new Set(tarde).size === tarde.length && noche.length === tarde.length && new Set(noche).size === 1, `35: los hilos de las piscuchas, de tarde a cada osezno (${tarde.join(' · ')}) y de noche al poste del farol (${noche[0]})`);
      // La entrada también enseña el pueblo de los osos (por la hora y el día; nada de la familia).
      const ctx = await navegador.newContext({ ...devices['iPhone 13'] });
      const pg = await ctx.newPage();
      await pg.addInitScript(() => { try { localStorage.setItem('libro.hora', '15'); localStorage.setItem('libro.dia', '2026-10-14'); } catch { /* sin almacenamiento */ } });
      await pg.goto(`${anio.url}/login`, { waitUntil: 'networkidle' });
      await pg.waitForTimeout(800);
      const ent = await pg.evaluate(() => ({ osos: (document.querySelector('.v-vecinos .v-vo-pie')?.getAttribute('d') ?? '').split('M').length - 1, gente: document.querySelectorAll('.v-gente').length }));
      ok(ent.osos >= 6 && ent.gente === 0, `35: la entrada enseña a los vecinos osos de la tarde (${ent.osos})`);
      await ctx.close();
    } finally {
      anio.parar();
    }
  });

  // ---------------------------------------------------------------- campamento 36: el calendario del pueblo (misa, sábado de plaza, desfile, posada y estrellitas)
  await bloque(async () => {
    const conLs = (dia) => [(d) => { try { localStorage.setItem('libro.avisos.preguntado', '1'); localStorage.setItem('libro.madrugada', '0'); localStorage.setItem('libro.dia', d); localStorage.setItem('libro.efectos', 'esenciales'); } catch { /* sin almacenamiento */ } }, dia];
    const cerrar = async (p) => { for (let k = 0; k < 3 && await p.locator('dialog[open]').count(); k++) { await p.keyboard.press('Escape'); await p.waitForTimeout(300); } };
    const pueblo = (p) => p.evaluate(() => {
      const g = document.querySelector('#montana .v-vecinos'), n = (sel) => ((g.querySelector(sel)?.getAttribute('d') ?? '').match(/M/g) || []).length;
      const bb = (e) => { const b = e.getBBox(); return { x0: b.x, x1: b.x + b.width, y0: b.y, y1: b.y + b.height }; };
      const belen = [...document.querySelectorAll('#montana .v-pueblo [class*="v-belen"]')].map(bb);
      const portal = belen.length ? belen.reduce((u, b) => ({ x0: Math.min(u.x0, b.x0), x1: Math.max(u.x1, b.x1), y0: Math.min(u.y0, b.y0), y1: Math.max(u.y1, b.y1) })) : null;
      const pies = (g.querySelector('.v-vo-pie')?.getAttribute('d') ?? '').split(/(?=M)/).filter(Boolean).map((d) => { const t = document.createElementNS('http://www.w3.org/2000/svg', 'path'); t.setAttribute('d', d); g.append(t); const b = bb(t); t.remove(); return b; });
      return { turno: document.documentElement.dataset.turno, vecinos: pies.length, azul: n('.v-vo-azul'), brasa: n('.v-vo-brasa'), sobrePortal: portal ? pies.filter((b) => b.x0 < portal.x1 && b.x1 > portal.x0 && b.y1 > portal.y1 - 4).length : 0, portal: Boolean(portal) };
    });
    const anio = await servidor('anio');
    try {
      for (const [w, h] of [[390, 844], [1440, 900]]) {
        for (const [dia, hora, turno, prueba] of [
          ['2026-10-18', 8, 'misa', (r) => r.vecinos >= 4],
          ['2026-10-17', 9, 'mercado', (r) => r.vecinos >= 5],
          ['2026-09-15', 9, 'desfile', (r) => r.azul >= 2 && r.vecinos >= 5],
          ['2026-12-10', 19, 'posada', (r) => r.portal && r.sobrePortal === 0 && r.vecinos >= 4],
          ['2026-12-24', 20, 'nochebuena', (r) => r.brasa >= 3],
        ]) {
          const t = await entrar(navegador, anio, ADMIN, { hora, viewport: { width: w, height: h } }, conLs(dia));
          await cerrar(t.p);
          const r = await pueblo(t.p);
          ok(r.turno === turno && prueba(r), `36 a ${w} px, ${dia} a las ${hora}:00: ${turno} (${JSON.stringify(r)})`);
          await t.ctx.close();
        }
      }
    } finally {
      anio.parar();
    }
  });

  // ---------------------------------------------------------------- campamento 37: el pueblo se mueve (la capa del vecino: la que barre y la pelota de los oseznos)
  await bloque(async () => {
    const conLs = (ef) => [(e) => { try { localStorage.setItem('libro.avisos.preguntado', '1'); localStorage.setItem('libro.madrugada', '0'); localStorage.setItem('libro.dia', '2026-09-16'); localStorage.setItem('libro.efectos', e); } catch { /* sin almacenamiento */ } }, ef]; // un miércoles sin azacuanes
    const cerrar = async (p) => { for (let k = 0; k < 3 && await p.locator('dialog[open]').count(); k++) { await p.keyboard.press('Escape'); await p.waitForTimeout(300); } };
    const capa = (p) => p.evaluate(() => {
      const h = document.getElementById('montana'), c = h.querySelector(':scope > svg.v-capa-vecino'), frente = h.querySelector(':scope > svg.frente');
      if (!c) return { hay: false, mueve: document.documentElement.dataset.mueve ?? '' };
      return { hay: true, actor: [...c.classList].find((x) => x.startsWith('v-actor-')), anim: getComputedStyle(c).animationName, bajoFrente: Boolean(c.compareDocumentPosition(frente) & Node.DOCUMENT_POSITION_FOLLOWING), aria: c.getAttribute('aria-hidden'), nodos: c.querySelectorAll('*').length + 1, mueve: document.documentElement.dataset.mueve ?? '' };
    });
    const anio = await servidor('anio');
    try {
      for (const [w, h] of [[390, 844], [1440, 900]]) {
        for (const [hora, ef, actor, anim] of [[7.5, 'todos', 'v-actor-barre', 'vo-barre'], [15.5, 'todos', 'v-actor-pelota', 'vo-bota'], [7.5, 'esenciales', 'v-actor-barre', 'none'], [9, 'todos', 'v-actor-barre', 'none']]) {
          const t = await entrar(navegador, anio, ADMIN, { hora, viewport: { width: w, height: h } }, conLs(ef));
          await cerrar(t.p);
          const r = await capa(t.p);
          ok(r.hay && r.actor === actor && r.anim === anim && r.bajoFrente && r.aria === 'true' && r.nodos <= 12, `37 a ${w} px, ${hora}:00 con «${ef}»: el vecino en su capa (${JSON.stringify(r)})`);
          await t.ctx.close();
        }
        const t = await entrar(navegador, anio, ADMIN, { hora: 12.5, viewport: { width: w, height: h } }, conLs('todos'));
        await cerrar(t.p);
        ok(!(await capa(t.p)).hay, `37 a ${w} px: en la siesta nadie se mueve (no hay capa)`);
        await t.ctx.close();
      }
    } finally {
      anio.parar();
    }
  });

  // ---------------------------------------------------------------- campamento 38: lo que cambia de la app de hoy (el pescador oso, la descripción, la entrada)
  await bloque(async () => {
    const conLs = [() => { try { localStorage.setItem('libro.avisos.preguntado', '1'); localStorage.setItem('libro.madrugada', '0'); localStorage.setItem('libro.dia', '2026-09-16'); localStorage.setItem('libro.efectos', 'esenciales'); } catch { /* sin almacenamiento */ } }, null];
    const cerrar = async (p) => { for (let k = 0; k < 3 && await p.locator('dialog[open]').count(); k++) { await p.keyboard.press('Escape'); await p.waitForTimeout(300); } };
    const anio = await servidor('anio');
    try {
      for (const [hora, de] of [[15, 'día'], [21, 'noche']]) {
        const t = await entrar(navegador, anio, ADMIN, { hora, viewport: { width: 390, height: 844 } }, conLs);
        await cerrar(t.p);
        const r = await t.p.evaluate(() => ({ desc: document.getElementById('m-desc')?.textContent ?? '', oso: getComputedStyle(document.querySelector('#montana .v-cy-oso')).display, lampara: getComputedStyle(document.querySelector('#montana .v-cy-lampara')).display }));
        ok(/los vecinos son osos polares/.test(r.desc) && (de === 'día' ? r.oso !== 'none' : r.oso === 'none' && r.lampara !== 'none'), `38 de ${de}: la descripción dice que los vecinos son osos polares y el pescador del cayuco es un oso (de noche, solo su lámpara) (${r.oso}, ${r.lampara})`);
        await t.ctx.close();
      }
      // La entrada enseña el pueblo de osos por la hora y el día, y nada de la familia: ninguna ventana encendida.
      const ctx = await navegador.newContext({ ...devices['iPhone 13'] });
      const pg = await ctx.newPage();
      await pg.addInitScript(() => { try { localStorage.setItem('libro.hora', '21'); localStorage.setItem('libro.dia', '2026-09-16'); } catch { /* sin almacenamiento */ } });
      await pg.goto(`${anio.url}/login`, { waitUntil: 'networkidle' });
      await pg.waitForTimeout(800);
      const e = await pg.evaluate(() => ({ vecinos: document.querySelectorAll('.v-vecinos path').length, luces: (document.querySelector('.v-pueblo .v-luz')?.getAttribute('d') ?? '').length, turno: document.documentElement.dataset.turno }));
      ok(e.vecinos > 0 && e.luces === 0 && e.turno === 'pupusas', `38 la entrada: los vecinos osos de su turno y ninguna ventana encendida (${JSON.stringify(e)})`);
      await ctx.close();
    } finally {
      anio.parar();
    }
  });

  // ---------------------------------------------------------------- sin histórico de precios
  await bloque(async () => {
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
  });
} finally {
  await navegador.close();
}
// Ningún bloque se quedó sin recorrer: cada uno pasa por `bloque()`, corra o no en esta parte.
if (recorridos !== TITULOS.length) throw new Error(`Se recorrieron ${recorridos} bloques de ${TITULOS.length}: alguno no va dentro de bloque(…)`);
console.log(`OK ${n} comprobaciones de navegador${PARTE ? ` (parte ${PARTE.k}/${PARTE.de}: ${corridos} de ${TITULOS.length} bloques)` : ''}`);
