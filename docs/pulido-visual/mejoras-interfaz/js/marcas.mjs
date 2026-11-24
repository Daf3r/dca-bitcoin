// Capturas marcadas para la auditoría: la app tal cual, con un recuadro rosa y un número sobre lo que se señala.
import { chromium, servidor, abrir, OUT } from './comun.mjs';
const b = await chromium.launch();
const srv = await servidor('anio');
const n = (s) => `${OUT}/x-${s}.png`;
const cierra = async (p) => { for (let k = 0; k < 4 && await p.locator('dialog[open]').count(); k++) { await p.keyboard.press('Escape'); await p.waitForTimeout(250); } };
const tab = async (p, t) => { await p.click(`#pestanas button[data-pestana="${t}"]`); await p.waitForTimeout(700); await p.evaluate(() => document.activeElement?.blur()); };
// marca(p, [[selector o función, número], …]): recuadros fijos sobre la página (en la capa superior si hay un diálogo abierto)
const marca = (p, lista) => p.evaluate((lista) => {
  for (const e of document.querySelectorAll('.mq-marca')) e.remove();
  const host = document.querySelector('dialog[open]') ?? document.body;
  for (const [sel, num, todos] of lista) {
    const els = todos ? [...document.querySelectorAll(sel)] : [document.querySelector(sel)];
    for (const el of els) {
      if (!el || !el.checkVisibility()) continue;
      const q = el.getBoundingClientRect(); if (q.bottom < 0 || q.top > innerHeight) continue;
      const m = document.createElement('div'); m.className = 'mq-marca';
      m.style.cssText = `position: fixed; z-index: 99999; left: ${q.left - 4}px; top: ${q.top - 4}px; width: ${q.width + 8}px; height: ${q.height + 8}px; border: 2.5px solid #ff3d8b; border-radius: 10px; pointer-events: none; box-sizing: border-box;`;
      const t = document.createElement('b'); t.textContent = num;
      t.style.cssText = 'position: absolute; right: -9px; top: -11px; min-width: 22px; height: 22px; padding: 0 5px; border-radius: 11px; background: #ff3d8b; color: #fff; font: 700 13px/22px system-ui, sans-serif; text-align: center; box-sizing: border-box;';
      m.append(t); host.append(m);
    }
  }
}, lista);
const A = (o) => abrir(b, srv, { tema: 'oscuro', dpr: 2, efectos: 'todos', hora: 20, ...o });

{ // 1 · «Tu cuenta» en el teléfono: arriba y al final
  const { ctx, p } = await A({ w: 390 });
  await p.click('#cuenta-btn'); await p.waitForTimeout(600);
  await p.evaluate(() => { for (const f of document.querySelectorAll('.dc-lista button')) if (f.checkVisibility() && f.getBoundingClientRect().height > 60) f.dataset.mq = '1'; });
  await marca(p, [['.dc-lista button[data-mq]', '2', true], ['#dc-tema .dc-v', '3']]);
  await p.screenshot({ path: n('cuenta-390-a') });
  await p.evaluate(() => { document.querySelector('#d-cuenta').scrollTop = 99999; }); await p.waitForTimeout(250);
  await marca(p, [['.dc-lista button[data-cuenta="cerrar"]', '1'], ['.dc-lista button[data-mq]', '2', true]]);
  await p.screenshot({ path: n('cuenta-390-b') });
  await ctx.close();
}
{ // 2 · Escritorio: «Anotar compra» cambia de sitio y pisa la lista al bajar
  const { ctx, p } = await A({ w: 1440 });
  for (const t of ['resumen', 'historia', 'movimientos']) { await tab(p, t); await p.evaluate(() => { const e = document.querySelector('#pestanas'); scrollTo(0, e.getBoundingClientRect().top + scrollY - 24); }); await p.waitForTimeout(300); await marca(p, [['#anotar', '4']]); await p.screenshot({ path: n(`anotar-1440-${t}`), clip: { x: 0, y: 0, width: 1440, height: 300 } }); }
  await p.evaluate(() => { const e = document.querySelector('#lista li[data-clave]'); scrollTo(0, e.getBoundingClientRect().top + scrollY - 130); }); await p.waitForTimeout(350);
  await marca(p, [['#anotar', '5']]); await p.screenshot({ path: n('anotar-1440-pisa'), clip: { x: 0, y: 0, width: 1440, height: 420 } });
  console.log('anotar pisa:', await p.evaluate(() => { const a = document.querySelector('#anotar').getBoundingClientRect(); return [...document.querySelectorAll('#lista li[data-clave]')].filter((l) => { const q = l.getBoundingClientRect(); return q.top < a.bottom && q.bottom > a.top && q.left < a.right && q.right > a.left; }).length; }));
  await ctx.close();
}
{ // 3 · El dock y 4 · la lista
  const { ctx, p } = await A({ w: 390 });
  await tab(p, 'movimientos'); await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(300);
  await marca(p, [['#pestanas button[data-pestana="movimientos"] .pe-txt', '6']]);
  const q = await p.evaluate(() => { const r = document.querySelector('#pestanas').getBoundingClientRect(); return { x: 0, y: r.top - 22, width: innerWidth, height: r.height + 36 }; });
  await p.screenshot({ path: n('dock-390'), clip: q });
  await p.evaluate(() => { const e = document.querySelector('#t-compras'); scrollTo(0, e.getBoundingClientRect().top + scrollY - 70); }); await p.waitForTimeout(350);
  await marca(p, [['#l-ctl', '7']]); await p.screenshot({ path: n('lista-390') });
  await tab(p, 'graficos'); await p.evaluate(() => { const e = document.querySelector('#vistas'); scrollTo(0, e.getBoundingClientRect().top + scrollY - 60); }); await p.waitForTimeout(350);
  await marca(p, [['#vistas', '8'], ['#rangos', '8'], ['#g-ampliar', '9']]); await p.screenshot({ path: n('graficos-390') });
  await ctx.close();
}
{ // 5 · La hoja
  const { ctx, p } = await A({ w: 390 });
  await p.click('#anotar'); await p.waitForTimeout(700);
  await marca(p, [['#guardar', '10']]); await p.screenshot({ path: n('hoja-390-a') });
  await p.evaluate(() => { document.querySelector('#h-avanzado').open = true; const h = document.querySelector('#hoja'); const sc = [h, ...h.querySelectorAll('*')].find((e) => e.scrollHeight > e.clientHeight + 8 && /auto|scroll/.test(getComputedStyle(e).overflowY)); if (sc) sc.scrollTop = 330; for (const e of h.querySelectorAll('p')) if (e.checkVisibility() && e.textContent.trim().length > 40) e.dataset.mq = '1'; }); await p.waitForTimeout(300);
  await marca(p, [['#hoja p[data-mq]', '11', true], ['#h-usd', '12']]); await p.screenshot({ path: n('hoja-390-b') });
  await ctx.close();
}
{ // 6 · La entrada
  const { ctx, p } = await A({ w: 390, soloLogin: true }); await p.waitForTimeout(1000);
  await marca(p, [['button[type=submit]', '13']]); await p.screenshot({ path: n('login-390') }); await ctx.close();
}
{ // 7 · Resumen: tarjetas y títulos
  const { ctx, p } = await A({ w: 390 });
  await p.evaluate(() => { const e = document.querySelector('#tramo'); scrollTo(0, e.getBoundingClientRect().top + scrollY - 20); }); await p.waitForTimeout(300);
  await marca(p, [['#tramo .tr-k', '14'], ['#t-diario', '14'], ['#t-res-med', '14']]); await p.screenshot({ path: n('resumen-390') });
  await ctx.close();
}
srv.parar(); await b.close(); console.log('ok');
