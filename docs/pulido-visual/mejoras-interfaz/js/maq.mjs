// Maquetas de las propuestas 300–315: la app de verdad, con un parche de CSS o de DOM encima (solo en esta página de pruebas).
// Cada maqueta saca «antes» (la app tal cual) y «después» (con el parche). Las medidas van a cap/maquetas.json.
import fs from 'node:fs';
import { chromium, servidor, abrir, OUT } from './comun.mjs';
const SOLO = process.argv[2] ? process.argv[2].split(',') : null;
const b = await chromium.launch();
const srv = await servidor('anio');
const M = {};
const n = (id, w, s) => `${OUT}/m-${id}-${w}-${s}.png`;
const css = (p, t) => p.addStyleTag({ content: t });
const quita = (p) => p.evaluate(() => document.activeElement?.blur());
const tab = async (p, t) => { await p.click(`#pestanas button[data-pestana="${t}"]`); await p.waitForTimeout(700); await quita(p); };
const cierra = async (p) => { for (let k = 0; k < 4 && await p.locator('dialog[open]').count(); k++) { await p.keyboard.press('Escape'); await p.waitForTimeout(250); } };
const ver = async (p, sel, dy = 0) => { await p.evaluate(([s, d]) => { const e = document.querySelector(s); scrollTo(0, e.getBoundingClientRect().top + scrollY - d); }, [sel, dy]); await p.waitForTimeout(350); };
const foto = (p, id, w, s, clip) => p.screenshot({ path: n(id, w, s), ...(clip ? { clip } : {}) });
const caja = (p, sel, m = 8) => p.evaluate(([s, m]) => { const q = document.querySelector(s).getBoundingClientRect(); return { x: Math.max(0, q.left - m), y: Math.max(0, q.top - m), width: Math.min(innerWidth, q.width + 2 * m), height: Math.min(innerHeight - Math.max(0, q.top - m), q.height + 2 * m) }; }, [sel, m]);
async function maq(id, anchos, fn) {
  if (SOLO && !SOLO.includes(String(id))) return;
  for (const w of anchos) {
    const tema = w === 1440 ? 'oscuro' : 'oscuro';
    const { ctx, p, consola } = await abrir(b, srv, { w, tema, dpr: 2, efectos: 'todos', hora: 20 });
    try { await fn(p, w); } catch (e) { console.log('FALLO', id, w, e.message.split('\n')[0]); }
    if (consola.length) console.log(id, w, consola[0]);
    await ctx.close();
  }
  console.log('hecha', id);
}
const lumSrc = `(c) => { const m = c.match(/[\\d.]+/g).map(Number); const f = (v) => { v = (c.startsWith('color(') ? v * 255 : v) / 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(m[0]) + 0.7152 * f(m[1]) + 0.0722 * f(m[2]); }`;

// ---- 300 · «Tu cuenta» se cierra desde arriba
const CAB = `.mq-cab { position: sticky; top: calc(-1 * var(--mq-pad)); z-index: 3; display: flex; align-items: center; justify-content: space-between; gap: 12px; margin: calc(-1 * var(--mq-pad)) calc(-1 * var(--mq-pad)) 8px; padding: 10px var(--mq-pad) 8px; background: var(--s1); box-shadow: 0 1px 0 var(--s3); }
.mq-cab h2 { margin: 0; } .mq-cab button { min-height: 48px; padding: 0 18px; border: 0; border-radius: 999px; background: var(--s2); color: var(--txt); font: 600 1rem var(--sans); }
.d-cuenta .dc-lista button[data-cuenta="cerrar"] { display: none; }`;
const ponCab = (p) => p.evaluate(() => { const d = document.querySelector('#d-cuenta'), m = document.querySelector('#dc-menu'), h = document.querySelector('#dc-t'); d.style.setProperty('--mq-pad', getComputedStyle(d).paddingTop); const c = document.createElement('div'); c.className = 'mq-cab'; m.prepend(c); c.append(h); const x = document.createElement('button'); x.type = 'button'; x.textContent = 'Cerrar'; c.append(x); });
await maq(300, [390, 1440], async (p, w) => {
  await p.click('#cuenta-btn'); await p.waitForTimeout(600);
  await p.evaluate(() => { document.querySelector('#d-cuenta').scrollTop = 520; }); await p.waitForTimeout(250);
  await foto(p, 300, w, 'antes');
  await css(p, CAB); await ponCab(p);
  await p.evaluate(() => { document.querySelector('#d-cuenta').scrollTop = 520; }); await p.waitForTimeout(250);
  await foto(p, 300, w, 'despues');
});

// ---- 301 · «Este dispositivo» en dos niveles; en escritorio, dos columnas
const MAS = ['dc-contraste', 'dc-ganancia', 'dc-madrugada', 'dc-tv', 'dc-tv-duerme', 'dc-titulo', 'dc-sonido'];
await maq(301, [390, 1440], async (p, w) => {
  await p.click('#cuenta-btn'); await p.waitForTimeout(600);
  await foto(p, 301, w, 'antes');
  const antes = await p.evaluate(() => { const d = document.querySelector('#d-cuenta'); return [d.scrollHeight, d.clientHeight]; });
  await css(p, CAB + `
.mq-mas { display: grid; gap: 6px; } .mq-mas > summary { list-style: none; display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 48px; padding: 0 16px; border-radius: 16px; color: var(--txt2); font: 600 1rem var(--sans); cursor: pointer; box-shadow: inset 0 0 0 1.5px var(--s3); }
.mq-mas > summary::-webkit-details-marker { display: none; } .mq-mas > summary small { font: 600 0.875rem var(--sans); color: var(--txt3); }
.mq-mas > summary::after { content: ""; width: 8px; height: 8px; border-right: 2px solid currentColor; border-bottom: 2px solid currentColor; transform: rotate(45deg); margin: -4px 4px 0 auto; } .mq-mas > summary small { margin-left: 0; }
.mq-dos { width: min(54rem, calc(100vw - 32px)) !important; } .mq-dos .dc-lista { grid-template-columns: 1fr 1fr; column-gap: 28px; align-items: start; } .mq-col { display: grid; gap: 6px; align-content: start; } .mq-col > .dc-grupo:first-child { margin-top: 2px; }`);
  await ponCab(p);
  await p.evaluate(([ids, w]) => {
    const l = document.querySelector('.dc-lista');
    if (w < 900) {
      const d = document.createElement('details'); d.className = 'mq-mas'; const s = document.createElement('summary'); s.innerHTML = 'Más ajustes de este aparato <small>7</small>'; d.append(s);
      document.querySelector('#dc-g-admin').before(d); for (const id of ids) d.append(document.getElementById(id));
    } else {
      document.querySelector('#d-cuenta').classList.add('mq-dos');
      const a = document.createElement('div'), c = document.createElement('div'); a.className = c.className = 'mq-col';
      const hijos = [...l.children]; const iD = hijos.indexOf(document.querySelector('#dc-g-disp')), iA = hijos.indexOf(document.querySelector('#dc-g-admin'));
      hijos.forEach((e, i) => (i >= iD && i < iA ? c : a).append(e)); l.append(a, c);
    }
  }, [MAS, w]);
  await p.waitForTimeout(300);
  await foto(p, 301, w, 'despues');
  M[`301-${w}`] = { antes, despues: await p.evaluate(() => { const d = document.querySelector('#d-cuenta'); return [d.scrollHeight, d.clientHeight]; }) };
});

// ---- 302 · El valor de cada ajuste, en tinta y en su renglón
await maq(302, [390, 320, 1440], async (p, w) => {
  await p.click('#cuenta-btn'); await p.waitForTimeout(600);
  await p.evaluate(() => { document.querySelector('#d-cuenta').scrollTop = 250; }); await p.waitForTimeout(200);
  await foto(p, 302, w, 'antes');
  const antes = await p.evaluate(() => [...document.querySelectorAll('.dc-lista button')].filter((x) => x.checkVisibility() && x.getBoundingClientRect().height > 60).length);
  await css(p, `.dc-v { padding: 0 !important; background: none !important; color: var(--txt2) !important; font-weight: 600 !important; white-space: nowrap; flex: none !important; }
.d-cuenta .dc-lista button:has(.dc-v) { flex-wrap: nowrap !important; } .d-cuenta .dc-lista button .dc-k { min-width: 0; text-align: left; }`);
  await p.evaluate(() => { for (const k of document.querySelectorAll('.dc-k')) { if (/madrugada/.test(k.textContent)) k.textContent = 'Modo madrugada'; if (/Título de la pestaña/.test(k.textContent)) k.textContent = 'Título de la pestaña'; } for (const v of document.querySelectorAll('.dc-v')) { if (v.textContent === 'con saldo y precio') v.textContent = 'saldo y precio'; } });
  await p.waitForTimeout(200);
  await foto(p, 302, w, 'despues');
  M[`302-${w}`] = { dosRenglonesAntes: antes, despues: await p.evaluate(() => [...document.querySelectorAll('.dc-lista button')].filter((x) => x.checkVisibility() && x.getBoundingClientRect().height > 60).map((x) => x.textContent.slice(0, 30))) };
});

// ---- 303 · El dock: «Movimientos» cabe
await maq(303, [390], async (p, w) => {
  await tab(p, 'movimientos'); await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(300);
  const c = await caja(p, '#pestanas', 10);
  await foto(p, 303, w, 'antes', c);
  M['303-antes'] = await p.evaluate(() => [...document.querySelectorAll('#pestanas .pe-txt')].map((t) => [t.textContent, t.clientWidth, t.scrollWidth, getComputedStyle(t).overflow, getComputedStyle(t).textOverflow]));
  M['303-rejilla'] = await p.evaluate(() => { const cs = getComputedStyle(document.querySelector('#pestanas')); return [cs.display, cs.gridTemplateColumns, cs.padding, cs.gap]; });
  await css(p, `#pestanas button { padding-inline: 0 !important; } #pestanas .pe-txt { max-width: none !important; overflow: visible !important; letter-spacing: -0.01em; }
#pestanas { grid-template-columns: 1fr 1fr 78px 61px 78px !important; }`);
  await p.waitForTimeout(250);
  await foto(p, 303, w, 'despues', c);
  M['303-centro'] = await p.evaluate(() => { const a = document.querySelector('#anotar').getBoundingClientRect(), d = document.querySelector('#pestanas').getBoundingClientRect(); const hueco = [...document.querySelectorAll('#pestanas button')].map((x) => x.getBoundingClientRect()); return { anotar: a.left + a.width / 2, dock: d.left + d.width / 2, huecoIzq: hueco[1].right, huecoDer: hueco[2].left }; });
  M['303-despues'] = await p.evaluate(() => [...document.querySelectorAll('#pestanas button')].map((t) => { const q = t.getBoundingClientRect(), s = t.querySelector('.pe-txt'); return [t.textContent.trim(), Math.round(q.width), s ? s.scrollWidth : 0]; }));
});

// ---- 304 · Escritorio: «Anotar compra» siempre en el mismo sitio (al final de la barra)
await maq(304, [1440], async (p, w) => {
  const franja = async (s) => { await ver(p, '#pestanas', 24); await foto(p, 304, w, s, { x: 0, y: 0, width: 1440, height: 330 }); };
  await tab(p, 'resumen'); await franja('antes-resumen');
  await tab(p, 'movimientos'); await franja('antes-movimientos');
  await css(p, `.mq-barra { grid-column: 1 / -1; display: flex; align-items: center; gap: 14px; position: sticky; top: 56px; z-index: 6; } .mq-barra #pestanas { flex: 1; margin: 0 !important; position: relative !important; top: auto !important; }
.mq-barra #anotar { position: static !important; transform: none !important; margin: 0 !important; flex: none; inset: auto !important; }`);
  await p.evaluate(() => { const pe = document.querySelector('#pestanas'), a = document.querySelector('#anotar'); const d = document.createElement('div'); d.className = 'mq-barra'; pe.before(d); d.append(pe, a); });
  await p.waitForTimeout(300);
  await tab(p, 'resumen'); await franja('despues-resumen');
  await tab(p, 'movimientos'); await franja('despues-movimientos');
});

// ---- 305 · La hoja: ayudas de un renglón
await maq(305, [390, 1440], async (p, w) => {
  await p.click('#anotar'); await p.waitForTimeout(700);
  await p.fill('#h-sats', '30000'); await p.evaluate(() => { document.querySelector('#h-avanzado').open = true; }); await p.waitForTimeout(300);
  const baja = () => p.evaluate(() => { const h = document.querySelector('#hoja'); const sc = [h, ...h.querySelectorAll('*')].find((e) => e.scrollHeight > e.clientHeight + 8 && /auto|scroll/.test(getComputedStyle(e).overflowY)); if (sc) sc.scrollTop = 300; return sc ? [sc.scrollHeight, sc.clientHeight] : null; });
  const antes = await baja(); await p.waitForTimeout(250);
  await foto(p, 305, w, 'antes');
  M[`305-${w}`] = { antes, palabrasAntes: await p.evaluate(() => [...document.querySelectorAll('#hoja p, #hoja small')].filter((e) => e.checkVisibility() && e.textContent.trim().length > 40).map((e) => e.textContent.trim())) };
  await p.evaluate(() => {
    const T = [[/^Opcional\. Queda como nota/, 'La ve la familia; en un año el Diario la recuerda.'], [/^Escribe los dólares o el precio/, 'Escribe uno y el otro se calcula. Vacíos: el precio de ese día.'], [/^Sirve para comprobar/, 'Para comprobarla en la cadena. Lightning o dentro del exchange: no hay.'], [/^Las extra se muestran aparte/, 'Va aparte: no cuenta para el ritmo ni cubre la semana.'], [/^Hasta 5, separadas/, 'Hasta 5, con comas. Filtran la lista.']];
    for (const e of document.querySelectorAll('#hoja p, #hoja small, #hoja span')) { if (e.children.length) continue; for (const [r, t] of T) if (r.test(e.textContent.trim())) e.textContent = t; }
    for (const e of document.querySelectorAll('#hoja label, #hoja span, #hoja summary')) for (const c of e.childNodes) if (c.nodeType === 3 && / \(opcional\)/.test(c.data)) c.data = c.data.replace(' (opcional)', '');
    for (const c of document.querySelector('#h-avanzado > summary').querySelectorAll('*')) if (!c.children.length && /Más detalles/.test(c.textContent)) c.textContent = 'Más detalles (todo opcional): dólares o precio, TXID y compra extra';
  });
  const despues = await baja(); await p.waitForTimeout(250);
  await foto(p, 305, w, 'despues');
  M[`305-${w}`].despues = despues;
  M[`305-${w}`].palabrasDespues = await p.evaluate(() => [...document.querySelectorAll('#hoja p, #hoja small')].filter((e) => e.checkVisibility() && e.textContent.trim().length > 30).map((e) => e.textContent.trim()));
});

// ---- 306 · «Guardar» apagado dice qué falta
await maq(306, [390, 1440], async (p, w) => {
  await p.click('#anotar'); await p.waitForTimeout(700);
  const c = await caja(p, '#guardar', 14);
  await foto(p, 306, w, 'antes', c);
  if (w === 390) M['306'] = await p.evaluate((lumSrc) => { const lum = eval(lumSrc); const g = document.querySelector('#guardar'); const cs = getComputedStyle(g); const mez = (a, b, t) => a.map((v, i) => v * t + b[i] * (1 - t)); const rgb = (c) => c.match(/[\d.]+/g).slice(0, 3).map(Number); const pan = rgb(getComputedStyle(g.closest('.hoja-bot') ?? g.parentElement).backgroundColor); const fondoPanel = pan.every((v) => v === 0) ? [16, 23, 42] : pan; const f = mez(rgb(cs.backgroundColor), fondoPanel, 0.4), t = mez(rgb(cs.color), fondoPanel, 0.4); const L = (c) => lum(`rgb(${c.join(',')})`); const a = L(f), b2 = L(t); return { fondo: f.map(Math.round), texto: t.map(Math.round), contraste: +((Math.max(a, b2) + 0.05) / (Math.min(a, b2) + 0.05)).toFixed(2) }; }, lumSrc);
  await css(p, `.guardar:disabled { opacity: 1 !important; background: none !important; color: var(--txt2) !important; box-shadow: inset 0 0 0 1.5px var(--s3); font-weight: 600 !important; }`);
  await p.evaluate(() => { document.querySelector('#guardar').textContent = 'Escribe los sats para guardar'; });
  await p.waitForTimeout(200);
  await foto(p, 306, w, 'despues', c);
});

// ---- 307 · La lista: buscar y filtrar en una fila
await maq(307, [390, 1440], async (p, w) => {
  await tab(p, 'movimientos'); await ver(p, '#t-compras', w < 900 ? 70 : 110);
  await foto(p, 307, w, 'antes');
  const med = () => p.evaluate(() => Math.round(document.querySelector('#lista li[data-clave]').getBoundingClientRect().top - document.querySelector('#t-compras').getBoundingClientRect().top));
  const antes = await med();
  await css(p, `.mq-f1 { display: flex; gap: 8px; align-items: center; } .mq-f1 .l-busca { flex: 1; min-width: 0; }
.mq-filtros { flex: none; min-height: 48px; padding: 0 16px; border-radius: 999px; border: 1.5px solid var(--s3); background: none; color: var(--txt); font: 650 0.9375rem var(--sans); display: inline-flex; align-items: center; gap: 8px; }
.mq-filtros::after { content: ""; width: 7px; height: 7px; border-right: 2px solid currentColor; border-bottom: 2px solid currentColor; transform: rotate(45deg); margin-top: -4px; }
.mq-plegado { display: none !important; }
@media (min-width: 900px) { .mq-f1 .l-busca { flex: 0 1 300px; } .mq-f1 .l-chips { flex-wrap: nowrap; } .mq-f1 .l-mas summary { padding: 0 6px; white-space: nowrap; } }`);
  await p.evaluate((w) => { const c = document.querySelector('#l-ctl'), bq = c.querySelector('.l-busca'), ch = document.querySelector('#l-chips'), mas = document.querySelector('#l-mas'); const f = document.createElement('div'); f.className = 'mq-f1'; c.prepend(f); f.append(bq);
    if (w < 900) { const bt = document.createElement('button'); bt.type = 'button'; bt.className = 'mq-filtros'; bt.textContent = 'Filtros'; f.append(bt); ch.classList.add('mq-plegado'); mas.classList.add('mq-plegado'); }
    else { f.append(ch, mas); } }, w);
  await p.waitForTimeout(300); await ver(p, '#t-compras', w < 900 ? 70 : 110);
  await foto(p, 307, w, 'despues');
  M[`307-${w}`] = { tituloAFilaAntes: antes, despues: await med() };
});

// ---- 308 · Escritorio: la lista con sus columnas juntas
await maq(308, [1440], async (p, w) => {
  await tab(p, 'movimientos'); await ver(p, '#l-col', 60);
  await foto(p, 308, w, 'antes');
  M['308'] = await p.evaluate(() => { const li = document.querySelector('#lista li[data-clave]'); const q = li.getBoundingClientRect(); const xs = [...li.querySelectorAll('*')].filter((e) => !e.children.length && e.textContent.trim() && e.checkVisibility() && !e.closest('.sr')).map((e) => e.getBoundingClientRect()); const izq = xs.filter((r) => r.left < q.left + q.width / 2), der = xs.filter((r) => r.left >= q.left + q.width / 2); return { fila: Math.round(q.width), hueco: Math.round(Math.min(...der.map((r) => r.left)) - Math.max(...izq.map((r) => r.right))) }; });
  await css(p, `#lista, #l-col, #ver-todas, #compras .mes-cab { max-width: 620px; } #l-col { margin-left: 0; }`);
  await p.waitForTimeout(300); await ver(p, '#l-col', 60);
  await foto(p, 308, w, 'despues');
});

// ---- 309 · Un solo botón secundario y un solo enlace
const SEC = `#ub-anotar, #res-historia, #ver-todas, #com-anotar, #dh-hoy-ver, #dh-peli-ver, .capsulas .cap-lista .enlace, #cap-lista button.enlace { min-height: 48px !important; padding: 0 20px !important; border: 0 !important; border-radius: 999px !important; background: none !important; box-shadow: inset 0 0 0 1.5px var(--naranja) !important; color: var(--txt) !important; font: 650 1rem var(--sans) !important; text-decoration: none !important; width: auto !important; display: inline-flex !important; align-items: center; justify-content: center; gap: 8px; }
#caida-ocultar, #cap-nueva, #l-tabla, #g-ampliar, #l-mas > summary, #dh-cert { color: var(--txt) !important; font: 600 0.9375rem var(--sans) !important; text-decoration: underline !important; text-decoration-color: var(--naranja) !important; text-underline-offset: 5px; text-decoration-thickness: 1.5px !important; background: none !important; }`;
await maq(309, [390, 1440], async (p, w) => {
  await p.evaluate(() => { localStorage.setItem('libro.pestanas', 'todo'); }); await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(2200); await cierra(p); await quita(p);
  const piezas = ['#caida', '#res-medallas', '#ubicacion', '#capsulas', '#ver-todas'];
  const tira = async (s) => { for (const [i, sel] of piezas.entries()) { const e = p.locator(sel); if (!(await e.count()) || !(await e.isVisible())) continue; await e.scrollIntoViewIfNeeded(); await p.waitForTimeout(200); await e.screenshot({ path: n(309, w, `${s}-${i}`) }); } };
  await tira('antes'); await css(p, SEC); await p.waitForTimeout(300); await tira('despues');
});

// ---- 310 · Una sola tarjeta (radio, relleno y título)
await maq(310, [390, 1440], async (p, w) => {
  await ver(p, '#tramo', w < 900 ? 16 : 140); await foto(p, 310, w, 'antes');
  await css(p, `#tramo, #ubicacion, #res-medallas, #capsulas, #spd, .rep-ganancia, #rep-ganancia { border-radius: 20px !important; padding: 20px !important; }
#principal :is(#ubicacion, #res-medallas, #capsulas, .rep) :is(h2, h3) { font: 600 1.25rem/1.25 var(--serif) !important; }
#tramo .tr-k { font: 600 1.25rem/1.25 var(--serif) !important; color: var(--txt) !important; }`);
  await p.waitForTimeout(300); await ver(p, '#tramo', w < 900 ? 16 : 140); await foto(p, 310, w, 'despues');
  for (const s of ['antes', 'despues']) { /* segunda vista: medallas y constancia */ }
});

// ---- 311 · Cuatro tamaños de letra en vez de siete
await maq(311, [390, 1440], async (p, w) => {
  await ver(p, '#res-medallas', w < 900 ? 16 : 140); await foto(p, 311, w, 'antes');
  M[`311-${w}`] = { antes: await p.evaluate(() => document.documentElement.scrollHeight) };
  await p.evaluate(() => { const mapa = { 14: 13, 16: 15, 18: 17 }; for (const e of document.querySelectorAll('#principal *')) { if (e.closest('svg') || e.matches('input, select, textarea, h2, h3')) continue; const f = Math.round(parseFloat(getComputedStyle(e).fontSize)); if (mapa[f] && [...e.childNodes].some((c) => c.nodeType === 3 && c.data.trim())) e.style.fontSize = `${mapa[f] / 16}rem`; } });
  await p.waitForTimeout(300); await ver(p, '#res-medallas', w < 900 ? 16 : 140); await foto(p, 311, w, 'despues');
  M[`311-${w}`].despues = await p.evaluate(() => document.documentElement.scrollHeight);
});

// ---- 312 · Lo que está vacío ocupa un renglón
await maq(312, [390, 1440], async (p, w) => {
  await ver(p, '#ubicacion', w < 900 ? 120 : 200);
  const c0 = await caja(p, '#ubicacion', 14); await foto(p, 312, w, 'antes', c0);
  M[`312-${w}`] = { antes: await p.evaluate(() => Math.round(document.querySelector('#ubicacion').getBoundingClientRect().height)), tarjetas: await p.evaluate(() => [...document.querySelectorAll('#principal [data-p="resumen"]')].filter((e) => e.checkVisibility()).map((e) => [e.id, Math.round(e.getBoundingClientRect().height)])), total: await p.evaluate(() => document.documentElement.scrollHeight) };
  await css(p, `#ubicacion.mq-linea { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 6px 8px 6px 20px !important; border-radius: 16px !important; background: none !important; box-shadow: inset 0 0 0 1.5px var(--s3) !important; }
#ubicacion.mq-linea h2 { font: 600 1rem var(--sans) !important; margin: 0; color: var(--txt2); } #ubicacion.mq-linea .ub-pista { display: none; }
#ubicacion.mq-linea #ub-anotar { border: 0 !important; background: none !important; min-height: 48px; padding: 0 12px !important; margin: 0 !important; color: var(--txt) !important; font: 600 0.9375rem var(--sans) !important; text-decoration: underline; text-decoration-color: var(--naranja); text-underline-offset: 5px; white-space: nowrap; }`);
  await p.evaluate(() => { const u = document.querySelector('#ubicacion'); u.classList.add('mq-linea'); u.querySelector('h2').textContent = '¿Ya sacaste sats del exchange?'; });
  await p.waitForTimeout(300); await ver(p, '#ubicacion', w < 900 ? 120 : 200);
  const c1 = await caja(p, '#ubicacion', 14); await foto(p, 312, w, 'despues', c1);
  M[`312-${w}`].despues = await p.evaluate(() => Math.round(document.querySelector('#ubicacion').getBoundingClientRect().height));
});

// ---- 313 · Gráficos en el teléfono: el rango y «Ampliar», en la misma fila
await maq(313, [390, 320], async (p, w) => {
  await tab(p, 'graficos'); await ver(p, '#vistas', 16); await foto(p, 313, w, 'antes');
  const med = () => p.evaluate(() => Math.round(document.querySelector('#lienzo').getBoundingClientRect().top - document.querySelector('#vistas').getBoundingClientRect().top));
  const antes = await med();
  await css(p, `.g-opciones { justify-content: space-between !important; align-items: center; margin: 6px 0 2px !important; flex-wrap: nowrap !important; } .g-opciones #rangos { margin: 0; }
#mercado .sec-cab { margin-bottom: 4px; } #g-ampliar { color: var(--txt) !important; text-decoration: underline; text-decoration-color: var(--naranja); text-underline-offset: 5px; font-size: 0.9375rem !important; }`);
  await p.evaluate(() => { document.querySelector('.g-opciones').prepend(document.querySelector('#rangos')); });
  await p.waitForTimeout(400); await ver(p, '#vistas', 16); await foto(p, 313, w, 'despues');
  M[`313-${w}`] = { selectorAGraficoAntes: antes, despues: await med(), desborde: await p.evaluate(() => document.documentElement.scrollWidth - innerWidth) };
});

// ---- 314 · Los campos se distinguen de su fondo (filo de 3:1)
for (const [tema, w314] of [['oscuro', 390], ['claro', 390], ['oscuro', 1440]]) {
  if (SOLO && !SOLO.includes('314')) break;
  const { ctx, p } = await abrir(b, srv, { w: w314, tema, dpr: 2, efectos: 'todos' });
  await p.click('#anotar'); await p.waitForTimeout(700);
  await p.evaluate(() => { document.querySelector('#h-avanzado').open = true; const h = document.querySelector('#hoja'); const sc = [h, ...h.querySelectorAll('*')].find((e) => e.scrollHeight > e.clientHeight + 8 && /auto|scroll/.test(getComputedStyle(e).overflowY)); if (sc) sc.scrollTop = 330; }); await p.waitForTimeout(300);
  await foto(p, 314, `${w314}-${tema}`, 'antes');
  const medir = () => p.evaluate((lumSrc) => { const lum = eval(lumSrc); const rgb = (e, prop) => getComputedStyle(e)[prop]; const i = document.querySelector('#h-nota'); let f = i.parentElement; while (f && /rgba\(0, 0, 0, 0\)|transparent/.test(rgb(f, 'backgroundColor'))) f = f.parentElement; const c = (a, b2) => { const x = lum(a), y = lum(b2); return +((Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)).toFixed(2); }; const cs = getComputedStyle(i); return { campo: cs.backgroundColor, panel: rgb(f, 'backgroundColor'), borde: cs.borderTopWidth, sombra: cs.boxShadow.slice(0, 60), campoVsPanel: c(cs.backgroundColor, rgb(f, 'backgroundColor')) }; }, lumSrc);
  M[`314-${tema}-${w314}`] = { antes: await medir() };
  await css(p, `#hoja :is(input:not([type="checkbox"]), select, textarea), .l-busca input, .l-mas-c :is(input, select) { box-shadow: inset 0 0 0 1.5px color-mix(in srgb, var(--txt3) 80%, var(--s1)) !important; }`);
  await p.waitForTimeout(250);
  await foto(p, 314, `${w314}-${tema}`, 'despues');
  M[`314-${tema}-${w314}`].filo = await p.evaluate((lumSrc) => { const lum = eval(lumSrc); const d = document.createElement('i'); d.style.cssText = 'color: color-mix(in srgb, var(--txt3) 80%, var(--s1))'; document.querySelector('#hoja').append(d); const f = getComputedStyle(d).color; d.style.color = 'var(--s1)'; const s1 = getComputedStyle(d).color; d.style.color = 'var(--s2)'; const s2 = getComputedStyle(d).color; d.remove(); const c = (a, b2) => { const x = lum(a), y = lum(b2); return +((Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)).toFixed(2); }; return { filo: f, vsS1: c(f, s1), vsS2: c(f, s2) }; }, lumSrc);
  await ctx.close(); console.log('hecha 314', tema);
}

// ---- 315 · La entrada: medir si «Entrar» queda a la vista
if (!SOLO || SOLO.includes('315')) {
  for (const [w, h] of [[390, 844], [390, 664], [360, 640], [320, 568], [1440, 900]]) {
    const { ctx, p } = await abrir(b, srv, { w, h, tema: 'oscuro', dpr: 2, soloLogin: true, efectos: 'todos' });
    await p.waitForTimeout(1000);
    M[`315-${w}x${h}`] = await p.evaluate(() => { const bt = document.querySelector('button[type=submit]').getBoundingClientRect(); const cod = [...document.querySelectorAll('button, a')].find((e) => /código/.test(e.textContent)); return { entrarFin: Math.round(bt.bottom), alto: innerHeight, codigoFin: cod ? Math.round(cod.getBoundingClientRect().bottom) : null, desliza: document.documentElement.scrollHeight - innerHeight }; });
    await foto(p, 315, `${w}x${h}`, 'antes');
    if (w < 900) { await css(p, '.pag-login .escena { height: 40svh !important; min-height: 220px !important; }'); await p.waitForTimeout(900); await foto(p, 315, `${w}x${h}`, 'despues'); M[`315-${w}x${h}`].despues = await p.evaluate(() => { const bt = document.querySelector('button[type=submit]').getBoundingClientRect(); return { entrarFin: Math.round(bt.bottom), desliza: document.documentElement.scrollHeight - innerHeight }; }); }
    await ctx.close();
  }
  console.log('hecha 315');
}
const previo = fs.existsSync(`${OUT}/maquetas.json`) ? JSON.parse(fs.readFileSync(`${OUT}/maquetas.json`, 'utf8')) : {};
fs.writeFileSync(`${OUT}/maquetas.json`, JSON.stringify({ ...previo, ...M }, null, 1));
srv.parar(); await b.close(); console.log('ok');
