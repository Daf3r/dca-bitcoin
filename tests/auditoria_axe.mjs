// Auditoría de accesibilidad con axe-core (WCAG 2.1 A y AA más buenas prácticas) sobre los estados principales de la app,
// en claro y oscuro, contra el servidor de pruebas (sin red). Sale con error si hay alguna violación.
// Uso: node tests/auditoria_axe.mjs   (PYTHON=ruta/python si Flask no está en python3)
//      ESQUEMA=light (o dark) node tests/auditoria_axe.mjs   (solo uno de los dos esquemas: el CI y tests/verificar_todo.sh corren los
//      dos a la vez, cada uno en su proceso; juntos revisan exactamente los mismos estados que sin ESQUEMA)
//      ESTADOS=archivo   (escribe ahí cada estado revisado y sus diálogos abiertos, uno por línea: para comparar dos corridas)
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// (Campamento 63) En el teléfono los tipos y «Fechas y orden» de la lista van bajo «Filtros»: se abren antes de tocarlos (en escritorio no hace falta).
const abrirFiltros = async (p) => { if (await p.locator('#l-filtros').isVisible() && (await p.getAttribute('#l-filtros', 'aria-expanded')) !== 'true') await p.click('#l-filtros'); };
const abrirFechas = async (p) => { await abrirFiltros(p); if ((await p.getAttribute('#l-mas', 'aria-expanded')) !== 'true') await p.click('#l-mas'); };
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
async function servidor(escenario, env = {}) {
  // (Campamento 61) Como en test_ui: si el puerto lo ocupó otra prueba que corre a la vez, otro puerto; y /healthz debe ser de este.
  for (let intento = 0; intento < 3; intento++) {
    const port = await puertoLibre(), id = randomUUID();
    const hijo = spawn(PYTHON, [path.join(AQUI, 'servidor_prueba.py'), String(port), escenario], { stdio: 'ignore', env: { ...process.env, ...env, PRUEBA_ID: id } });
    const url = `http://127.0.0.1:${port}`;
    for (let i = 0; i < 200 && hijo.exitCode === null; i++) {
      try { const r = await fetch(`${url}/healthz`); if (r.ok && r.headers.get('x-prueba-id') === id) return { url, parar: () => hijo.kill() }; } catch { /* aún no */ }
      await new Promise((r) => setTimeout(r, 100));
    }
    hijo.kill();
  }
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
  if (process.env.ESTADOS) { // el estado y qué diálogos tenía abiertos: así se ve que dos corridas revisaron lo mismo
    const abiertos = await p.evaluate(() => [...document.querySelectorAll('dialog[open]')].map((d) => d.id).join(',')).catch(() => '?');
    fs.appendFileSync(process.env.ESTADOS, `${estado}\t${abiertos}\n`);
  }
  for (const v of r.violations) {
    hallazgos.push(`[${v.impact}] ${v.id} en «${estado}»: ${v.help} → ${v.nodes.slice(0, 2).map((n) => n.target.join(' ')).join(' | ')}`);
  }
}
const cerrarOferta = async (p) => { if (await p.locator('#d-avisos').isVisible()) { await p.click('#da-no'); await p.waitForTimeout(300); } };

const ESQUEMAS = process.env.ESQUEMA ? [process.env.ESQUEMA] : ['light', 'dark'];
if (!ESQUEMAS.every((e) => ['light', 'dark'].includes(e))) throw new Error(`ESQUEMA=${process.env.ESQUEMA}: se espera light o dark`);
const navegador = await chromium.launch();
const anio = await servidor('anio');
const hoy = await servidor('hoy');
const ballena = await servidor('ballena');
const mil = await servidor('mil'); // con etiquetas
const taldia = await servidor('taldia'); // (campamento 23) hoy hace un año llegó al campamento 1M
try {
  for (const esquema of ESQUEMAS) {
    const nuevo = async (srv, cuenta, init = null, hora = esquema === 'light' ? 12 : 22) => {
      const ctx = await navegador.newContext({ ...devices['iPhone 13'], colorScheme: esquema, bypassCSP: true });
      const p = await ctx.newPage();
      await p.addInitScript((h) => { try { localStorage.setItem('libro.hora', String(h)); localStorage.setItem('libro.pestanas', 'todo'); } catch { /* sin almacenamiento */ } }, hora);
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
    { // (Campamento 26) Los osos en la interfaz: la bienvenida de la lectora con los tres saludando y la lista sin compras con el grande
      const l = await nuevo(anio, LECTOR);
      await l.p.waitForSelector('#d-novedades[open]', { timeout: 8000 }).catch(() => {});
      await auditar(l.p, `bienvenida con los osos (lectora) ${esquema}`);
      await l.ctx.close();
      const vac = await servidor('vacio');
      try {
        const a = await nuevo(vac, ADMIN);
        for (let k = 0; k < 3 && await a.p.locator('dialog[open]').count(); k++) { await a.p.keyboard.press('Escape'); await a.p.waitForTimeout(300); }
        await auditar(a.p, `sin compras, con el grande leyendo ${esquema}`);
        await a.ctx.close();
      } finally {
        vac.parar();
      }
      const sl = await servidor('anio', { SOLO_LECTURA: '1' });
      try { // (Campamento 27) el aviso de mantenimiento con el grande dormido
        const m = await nuevo(sl, ADMIN);
        for (let k = 0; k < 3 && await m.p.locator('dialog[open]').count(); k++) { await m.p.keyboard.press('Escape'); await m.p.waitForTimeout(300); }
        await auditar(m.p, `mantenimiento con el grande dormido ${esquema}`);
        await m.ctx.close();
      } finally {
        sl.parar();
      }
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
      await abrirFechas(p); await p.fill('#l-buscar', '2'); await abrirFiltros(p); await p.click('#l-chips button[data-f="compra"]'); await p.waitForTimeout(300);
      await auditar(p, `lista con búsqueda y filtros ${esquema}`);
      await p.click('#l-limpiar'); await p.click('#l-mas');
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
      // El precio de la compra: escrito, con los dólares calculados (y al revés); se vacía para no dejar borrador
      await p.fill('#h-sats', '77320'); await p.fill('#h-precio', '62,500'); await p.waitForTimeout(250);
      await auditar(p, `hoja con el precio escrito y los dólares calculados ${esquema}`);
      await p.fill('#h-usd', '50'); await p.waitForTimeout(250);
      await auditar(p, `hoja con los dólares escritos y el precio calculado ${esquema}`);
      await p.fill('#h-usd', ''); await p.fill('#h-sats', ''); await p.waitForTimeout(150);
      for (const tipo of ['venta', 'traslado']) {
        await p.click(`#h-tipo button[data-tipo="${tipo}"]`); await p.waitForTimeout(200);
        await auditar(p, `hoja de ${tipo} ${esquema}`);
      }
      await p.keyboard.press('Escape'); await p.waitForTimeout(400);
      // Campamento 18: la hoja con «Qué cambia con esta compra» abierto y «Otro día», y el comprobante de un movimiento
      await p.click('#anotar'); await p.waitForTimeout(400);
      await p.click('#h-tipo button[data-tipo="compra"]');
      await p.fill('#h-sats', '30000'); await p.evaluate(() => { document.getElementById('h-cambia').open = true; }); await p.click('#h-dia-otro'); await p.waitForTimeout(300);
      await auditar(p, `hoja con lo que cambia y otro día ${esquema}`);
      await p.fill('#h-sats', '');
      for (let k = 0; k < 3 && await p.locator('#hoja.abierta').count(); k++) { await p.keyboard.press('Escape'); await p.waitForTimeout(400); }
      await p.evaluate(() => document.querySelector('#lista .fila').click()); await p.waitForTimeout(600);
      await auditar(p, `comprobante de una compra ${esquema}`);
      await p.click('#cp-cerrar'); await p.waitForTimeout(300);
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
      // campamento 9: con «Retirar a tu wallet» encendida (monto y aviso de prueba) y con la prueba contestada
      await p.click('#av-lista input[data-cat="wallet"]'); await p.waitForTimeout(400);
      await p.fill('#av-w-monto', '1500000'); await p.press('#av-w-monto', 'Tab'); await p.waitForTimeout(400);
      await auditar(p, `avisos con monto de wallet ${esquema}`);
      await p.click('#av-prueba-btn');
      await p.waitForFunction(() => { const t = document.getElementById('av-prueba-res').textContent; return t && t !== 'Enviando…'; }, null, { timeout: 20000 });
      await auditar(p, `aviso de prueba contestado ${esquema}`);
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
      await p.fill('#h-sats', '77320'); await p.click('#h-avanzado summary'); await p.fill('#h-precio', '62,500'); await p.waitForTimeout(250);
      await auditar(p, `alto contraste: hoja con el precio escrito y los dólares calculados ${esquema}`);
      await p.fill('#h-precio', ''); await p.fill('#h-sats', ''); await p.waitForTimeout(150);
      await p.keyboard.press('Escape'); await p.waitForTimeout(400);
      await p.click('#cuenta-btn'); await p.waitForTimeout(300);
      await auditar(p, `alto contraste: cuenta ${esquema}`);
      await ctx.close();
    }
    { // (Campamento 62) «Tu cuenta»: la cabecera pegada, el plegado abierto, una vista de dentro con «‹ Tu cuenta»; en escritorio, las dos
      // columnas y «Anotar compra» al final de la barra (por pestañas), también al bajar.
      const { ctx, p } = await nuevo(anio, ADMIN, conPush);
      await cerrarOferta(p);
      await p.click('#cuenta-btn'); await p.waitForTimeout(300);
      await auditar(p, `62 cuenta con el plegado cerrado ${esquema}`);
      await p.click('#dc-mas > summary'); await p.evaluate(() => { document.getElementById('d-cuenta').scrollTop = 500; }); await p.waitForTimeout(300);
      await auditar(p, `62 cuenta con el plegado abierto, a media bajada ${esquema}`);
      await p.click('#dc-sesiones-btn'); await p.waitForTimeout(600);
      await auditar(p, `62 vista de dentro con «‹ Tu cuenta» ${esquema}`);
      await ctx.close();
      const ctx2 = await navegador.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: esquema, bypassCSP: true });
      const e = await ctx2.newPage();
      await e.addInitScript((h) => { try { localStorage.setItem('libro.hora', String(h)); localStorage.setItem('libro.avisos.preguntado', '1'); } catch { /* sin almacenamiento */ } }, esquema === 'light' ? 12 : 22);
      await entrar(e, anio.url, ADMIN);
      for (let k = 0; k < 3 && await e.locator('dialog[open]').count(); k++) { await e.keyboard.press('Escape'); await e.waitForTimeout(300); }
      await e.click('#pestanas [data-pestana="movimientos"]'); await e.waitForTimeout(500);
      await e.evaluate(() => scrollTo(0, document.getElementById('compras').getBoundingClientRect().top + scrollY + 600)); await e.waitForTimeout(400);
      await auditar(e, `62 escritorio: «Anotar» en la barra, bajando por la lista ${esquema}`);
      await e.click('#cuenta-btn'); await e.waitForTimeout(400);
      await auditar(e, `62 escritorio: «Tu cuenta» en dos columnas ${esquema}`);
      await ctx2.close();
    }
    { // «Tus datos» (descargas e importar traslados) y la lista con una etiqueta elegida (escenario con etiquetas)
      const { ctx, p } = await nuevo(anio, ADMIN, conPush);
      await cerrarOferta(p);
      await p.click('#cuenta-btn'); await p.waitForTimeout(300);
      await p.click('#dc-datos-btn'); await p.waitForTimeout(700);
      await auditar(p, `tus datos ${esquema}`);
      await p.click('#dc-volver'); await p.waitForTimeout(400);
      await p.evaluate(() => { setTimeout(() => { throw new Error('error de prueba'); }, 10); }); await p.waitForTimeout(900); // para que la vista tenga un error que mostrar
      await p.click('#dc-sistema-btn'); await p.waitForFunction(() => !/Cargando/.test(document.getElementById('sis-res').textContent)); await p.waitForTimeout(500);
      await auditar(p, `estado del sistema ${esquema}`);
      await p.click('#dc-volver'); await p.waitForTimeout(400);
      await p.click('#dc-sesiones-btn'); await p.waitForSelector('#ses-lista .sis-fila'); await p.waitForTimeout(400);
      await auditar(p, `sesiones abiertas ${esquema}`);
      await p.click('#dc-volver'); await p.waitForTimeout(400);
      await p.click('#dc-enlaces-btn'); await p.waitForTimeout(500);
      await auditar(p, `enlace para la hoja de cálculo ${esquema}`);
      await p.fill('#en-nombre', 'Mi hoja'); await p.click('#en-crear'); await p.waitForSelector('#en-nuevo:not([hidden])'); await p.waitForTimeout(500);
      await auditar(p, `enlace para la hoja de cálculo, recién creado ${esquema}`);
      await ctx.close();
      const m = await nuevo(mil, ADMIN, conPush);
      await cerrarOferta(m.p);
      await m.p.evaluate(() => document.getElementById('lista').scrollIntoView({ block: 'start' }));
      await abrirFechas(m.p); await m.p.selectOption('#l-etq', 'bono'); await m.p.waitForTimeout(300);
      await auditar(m.p, `lista con una etiqueta elegida ${esquema}`);
      await m.p.click('#anotar'); await m.p.waitForTimeout(500);
      await m.p.click('#h-avanzado summary'); await m.p.fill('#h-etq', 'regalo, bono'); await m.p.waitForTimeout(200);
      await auditar(m.p, `hoja con etiquetas ${esquema}`);
      await m.ctx.close();
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
    { // «Tu historia» en dibujos (13C): pasaporte, estratos, partitura (con una nota elegida) y la piedra de un campamento
      const { ctx, p } = await nuevo(anio, ADMIN, conPush);
      await cerrarOferta(p);
      await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(400);
      const n = await p.locator('.m-bandera').count();
      for (let k = n - 1; k >= 0; k--) { await p.locator('.m-bandera').nth(k).click({ force: true }); await p.waitForTimeout(900); if (await p.locator('#m-tarjeta.con-piedra').count()) break; }
      await auditar(p, `petroglifo de un campamento ${esquema}`);
      await p.keyboard.press('Escape'); await p.waitForTimeout(300);
      await p.click('#cuenta-btn'); await p.waitForTimeout(300);
      await p.click('#dc-historia-btn'); await p.waitForTimeout(700);
      await auditar(p, `pasaporte de semanas ${esquema}`);
      for (const v of ['estratos', 'partitura']) {
        await p.click(`#dh-vistas [data-vh="${v}"]`); await p.waitForTimeout(400);
        await p.locator('#dh-lienzo .pieza').nth(2).click({ force: true }); await p.waitForTimeout(250);
        await auditar(p, `${v} con una pieza elegida ${esquema}`);
      }
      await ctx.close();
    }
    { // las pestañas (14): barra y cada pestaña (por defecto la app se audita en «todo junto»; aquí se quita esa preferencia)
      const { ctx, p } = await nuevo(anio, ADMIN, () => { try { localStorage.removeItem('libro.pestanas'); } catch { /* sin almacenamiento */ } });
      await cerrarOferta(p);
      for (const t of ['resumen', 'graficos', 'historia', 'movimientos']) {
        await p.click(`#pestanas [data-pestana="${t}"]`); await p.waitForTimeout(700);
        await auditar(p, `pestaña ${t} ${esquema}`);
      }
      await p.click('#pestanas [data-pestana="historia"]'); await p.waitForTimeout(400);
      await p.click('#dh-vistas [data-vh="estratos"]'); await p.waitForTimeout(400);
      await auditar(p, `pestaña historia con estratos ${esquema}`);
      await ctx.close();
    }
    { // el Diario, las cartas y los mensajes de las banderas (15A): dueño con datos sembrados y una lectora
      const { ctx, p } = await nuevo(anio, ADMIN, conPush);
      await cerrarOferta(p);
      await p.evaluate(async () => {
        const h = { 'Content-Type': 'application/json', 'X-Libro': '1' };
        const compras = await (await fetch('/api/compras')).json();
        const saldo = compras.reduce((a, c) => a + (c.tipo === 'venta' ? -c.sats : c.sats), 0);
        const pot = [1e5, 1e6, 1e7, 1e8, 1e9];
        const abajo = pot.filter((x) => x <= saldo).at(-1), arriba = pot.find((x) => x > saldo);
        await fetch(`/api/mensajes/${abajo}`, { method: 'PUT', headers: h, body: JSON.stringify({ texto: 'Para mis hijos: sigan subiendo, paso a paso.' }) });
        await fetch(`/api/mensajes/${arriba}`, { method: 'PUT', headers: h, body: JSON.stringify({ texto: 'Cuando llegues aquí, mira atrás y sonríe.' }) });
        await fetch('/api/capsulas', { method: 'POST', headers: h, body: JSON.stringify({ texto: 'Hasta pronto.', abre_sats: arriba }) });
        window.__abajo = abajo;
      });
      await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(2500);
      await cerrarOferta(p);
      await auditar(p, `diario y cartas (dueño) ${esquema}`);
      await p.click('#cap-lista button[data-leer]'); await p.waitForTimeout(700);
      await auditar(p, `carta abierta ${esquema}`);
      await p.click('#carta-ok'); await p.waitForTimeout(300);
      await p.click('#cap-nueva'); await p.waitForTimeout(500);
      await p.fill('#cap-texto', 'Querida familia: si leen esto, llegamos.');
      await auditar(p, `escribir una carta ${esquema}`);
      await p.click('#cap-cancelar'); await p.waitForTimeout(300);
      await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(400);
      const bandera = p.locator('.m-bandera').first();
      await bandera.click({ force: true }); await p.waitForTimeout(800);
      await auditar(p, `tarjeta de campamento con mensaje ${esquema}`);
      await p.click('#m-escribir'); await p.waitForTimeout(500);
      await auditar(p, `escribir un mensaje ${esquema}`);
      await ctx.close();
    }
    { // piedritas, cumpleaños y la tele (15B): lectora con una piedrita y su cumpleaños hoy; el dueño con su línea de la última piedrita
      const { ctx, p } = await nuevo(anio, LECTOR, conPush);
      await cerrarOferta(p);
      await p.click('#nov-ok', { timeout: 4000 }).catch(() => {}); await p.waitForTimeout(400); // la bienvenida de la lectora
      const md = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/El_Salvador' }).format(new Date()).slice(5);
      await p.evaluate(async (md) => {
        const h = { 'Content-Type': 'application/json', 'X-Libro': '1' };
        const compras = await (await fetch('/api/compras')).json();
        const c = compras.filter((x) => x.tipo === 'compra').at(-1);
        await fetch(`/api/piedritas/${c.id}`, { method: 'POST', headers: h });
        await fetch('/api/yo/cumple', { method: 'PUT', headers: h, body: JSON.stringify({ cumple: md }) });
      }, md);
      await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(2500);
      await cerrarOferta(p);
      await p.click('#nov-ok', { timeout: 3000 }).catch(() => {}); await p.waitForTimeout(400);
      await auditar(p, `movimientos con una piedrita y farol de cumpleaños (lectora) ${esquema}`);
      await p.click('#cuenta-btn'); await p.waitForTimeout(300);
      await p.click('#dc-cumple'); await p.waitForTimeout(600);
      await auditar(p, `mi cumpleaños ${esquema}`);
      await p.keyboard.press('Escape'); await p.waitForTimeout(300);
      await p.evaluate(() => { location.hash = '#tv'; }); await p.waitForTimeout(1200);
      await p.evaluate(() => { const f = document.getElementById('tv-fiesta'); document.getElementById('tvf-k').textContent = 'Compra nueva'; document.getElementById('tvf-txt').textContent = '+25,000 sats'; document.getElementById('tvf-sub').textContent = 'La montaña sube un paso más'; f.hidden = false; f.classList.add('va'); });
      await p.waitForTimeout(900);
      await auditar(p, `tele con la fiesta ${esquema}`);
      await ctx.close();
      const a = await nuevo(anio, ADMIN, conPush);
      await cerrarOferta(a.p);
      await auditar(a.p, `resumen del dueño con la última piedrita ${esquema}`);
      await a.ctx.close();
    }
    { // campamento 19: «Escuchar el Diario» (pulsado) con el nombre de la montaña, el libro de cumbre (lectora y dueño), el cuadro del nombre y la tele
      // Voces de mentira (el navegador de pruebas no trae ninguna): una en español del aparato, que «habla» un rato largo.
      const conVoces = () => {
        try { localStorage.setItem('libro.avisos.preguntado', '1'); } catch { /* sin almacenamiento */ }
        const s = new EventTarget();
        Object.assign(s, { speaking: false, pending: false, paused: false, getVoices: () => [{ name: 'Paulina', lang: 'es-MX', localService: true, default: false, voiceURI: 'p' }],
          speak() { s.speaking = true; }, cancel() { s.speaking = false; }, pause() {}, resume() {} });
        Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: s });
        window.SpeechSynthesisUtterance = class { constructor(t) { this.text = t; } };
      };
      const h = { 'Content-Type': 'application/json', 'X-Libro': '1' };
      const l = await nuevo(anio, LECTOR, conVoces);
      await l.p.click('#nov-ok', { timeout: 4000 }).catch(() => {}); await l.p.waitForTimeout(400);
      const abajo = await l.p.evaluate(async (hh) => {
        const saldo = (await (await fetch('/api/compras')).json()).reduce((a, c) => a + (c.tipo === 'venta' ? -c.sats : c.sats), 0);
        const m = [1e5, 1e6, 1e7, 1e8, 1e9].filter((x) => x <= saldo).at(-1);
        await fetch(`/api/firmas/${m}`, { method: 'PUT', headers: hh, body: JSON.stringify({ texto: 'Qué orgullo, hijo. Sigue así, paso a paso.' }) });
        return m;
      }, h);
      await l.p.reload({ waitUntil: 'networkidle' }); await l.p.waitForTimeout(2500);
      await l.p.click('#nov-ok', { timeout: 3000 }).catch(() => {}); await l.p.waitForTimeout(300);
      await l.p.evaluate(() => window.scrollTo(0, 0)); await l.p.waitForTimeout(300);
      await l.p.locator(`.m-bandera[data-m="${abajo}"]`).click({ force: true }); await l.p.waitForTimeout(900);
      await auditar(l.p, `tarjeta de campamento con su libro de cumbre (lectora) ${esquema}`);
      await l.p.click('#m-firmas'); await l.p.waitForTimeout(700);
      await auditar(l.p, `libro de cumbre con la firma propia (lectora) ${esquema}`);
      await l.ctx.close();
      const { ctx, p } = await nuevo(anio, ADMIN, conVoces);
      await cerrarOferta(p);
      await p.evaluate(async (hh) => { await fetch('/api/montana', { method: 'PUT', headers: hh, body: JSON.stringify({ nombre: 'La Ceiba' }) }); }, h);
      await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(2500);
      await cerrarOferta(p);
      await p.click('#dia-oir'); await p.waitForTimeout(300);
      await auditar(p, `Diario leyéndose en voz alta, con el nombre de la montaña ${esquema}`);
      await p.click('#dia-oir'); await p.waitForTimeout(200);
      await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(300);
      await p.locator(`.m-bandera[data-m="${abajo}"]`).click({ force: true }); await p.waitForTimeout(800);
      await p.click('#m-firmas'); await p.waitForTimeout(700);
      await p.locator('#fi-lista .fi-quitar').first().click(); await p.waitForTimeout(300);
      await auditar(p, `libro de cumbre del dueño, quitando una firma (Sí, quitar) ${esquema}`);
      await p.keyboard.press('Escape'); await p.waitForTimeout(300);
      await p.keyboard.press('Escape'); await p.waitForTimeout(300);
      await p.click('#cuenta-btn'); await p.waitForTimeout(300);
      await p.click('#dc-montana'); await p.waitForTimeout(600);
      await auditar(p, `el nombre de la montaña ${esquema}`);
      await p.keyboard.press('Escape'); await p.waitForTimeout(300);
      await p.evaluate(() => { location.hash = '#tv'; }); await p.waitForTimeout(1200);
      await auditar(p, `tele con el nombre de la montaña ${esquema}`);
      await ctx.close();
    }
    { // campamento 20: «Tu cuenta» por grupos y «Probar la celebración»; el dock (dueño, lectora, letra muy grande y acostado); la historia
      // con el dibujo de hoy y las secciones abiertas; el tronco y la manta del primer año; un punto por mes con un mes fijado
      const conPestanas = (extra = []) => [(ex) => { try { localStorage.removeItem('libro.pestanas'); localStorage.setItem('libro.avisos.preguntado', '1'); for (const [k, v] of ex) localStorage.setItem(k, v); } catch { /* sin almacenamiento */ } }, extra];
      const abrir = async (srv, cuenta, init, vp = null) => {
        const ctx = await navegador.newContext({ ...devices['iPhone 13'], ...(vp ? { viewport: vp, isMobile: false } : {}), colorScheme: esquema, bypassCSP: true });
        const p = await ctx.newPage();
        await p.addInitScript((h) => { try { localStorage.setItem('libro.hora', String(h)); } catch { /* sin almacenamiento */ } }, esquema === 'light' ? 12 : 22);
        await p.addInitScript(init[0], init[1]);
        await entrar(p, srv.url, cuenta);
        for (let k = 0; k < 3 && await p.locator('dialog[open]').count(); k++) { await p.keyboard.press('Escape'); await p.waitForTimeout(300); }
        return { ctx, p };
      };
      let { ctx, p } = await abrir(anio, ADMIN, conPestanas());
      await p.click('#cuenta-btn'); await p.waitForTimeout(400);
      await auditar(p, `«Tu cuenta» por grupos (dueño) ${esquema}`);
      await p.click('#dc-sistema-btn'); await p.waitForTimeout(900);
      await p.locator('#dc-previa').scrollIntoViewIfNeeded();
      await auditar(p, `Estado del sistema con «Probar la celebración» ${esquema}`);
      await p.keyboard.press('Escape'); await p.waitForTimeout(300);
      await auditar(p, `el dock con «Anotar» (dueño) ${esquema}`);
      await p.click('#pestanas [data-pestana="historia"]'); await p.waitForTimeout(800);
      await auditar(p, `historia: el dibujo de hoy y las secciones plegadas ${esquema}`);
      await p.evaluate(() => { for (const d of document.querySelectorAll('#historia details.dh-sec')) d.open = true; }); await p.waitForTimeout(300);
      await auditar(p, `historia: las secciones abiertas ${esquema}`);
      await ctx.close();
      ({ ctx, p } = await abrir(anio, LECTOR, conPestanas()));
      await p.click('#cuenta-btn'); await p.waitForTimeout(400);
      await auditar(p, `«Tu cuenta» por grupos (lectora) ${esquema}`);
      await p.keyboard.press('Escape'); await p.waitForTimeout(300);
      await auditar(p, `el dock sin «Anotar» (lectora) ${esquema}`);
      await ctx.close();
      ({ ctx, p } = await abrir(anio, ADMIN, conPestanas([['libro.letra', 'muy-grande']])));
      await p.click('#pestanas [data-pestana="graficos"]'); await p.waitForTimeout(700);
      await auditar(p, `el dock compacto con letra muy grande ${esquema}`);
      await ctx.close();
      ({ ctx, p } = await abrir(anio, ADMIN, conPestanas(), { width: 844, height: 390 }));
      await auditar(p, `el dock acostado ${esquema}`);
      await ctx.close();
      // El primer año: tronco por meses (con una banda elegida) y la manta en el telar (escenario «nueve»)
      const nueve = await servidor('nueve');
      try {
        ({ ctx, p } = await abrir(nueve, ADMIN, conPestanas([['libro.historia.vista', 'tronco']])));
        await p.click('#pestanas [data-pestana="historia"]'); await p.waitForTimeout(700);
        await p.locator('#dh-lienzo .pieza').first().click({ force: true }); await p.waitForTimeout(250);
        await auditar(p, `tronco del primer año ${esquema}`);
        await p.click('#dh-vistas [data-vh="manta"]'); await p.waitForTimeout(400);
        await p.locator('#dh-lienzo .pieza').nth(2).click({ force: true }); await p.waitForTimeout(250);
        await auditar(p, `manta del primer año ${esquema}`);
        await ctx.close();
      } finally { nueve.parar(); }
      // Un punto por mes (mil compras con «Todo»), con un mes fijado
      ({ ctx, p } = await abrir(mil, ADMIN, conPestanas([['libro.pestana', 'graficos']])));
      await p.click('#rangos button[data-r="0"]'); await p.waitForTimeout(700);
      await p.evaluate(() => document.getElementById('lienzo').scrollIntoView({ block: 'center' })); await p.waitForTimeout(500);
      const pc = await p.evaluate(() => { const svg = document.querySelector('#lienzo svg'), m = /^M([\d.]+) ([\d.]+)a([\d.]+)/.exec(svg.querySelector('.g-compras').getAttribute('d')), r = svg.getBoundingClientRect(); return { x: r.left + Number(m[1]) + Number(m[3]), y: r.top + Number(m[2]) }; });
      await p.mouse.click(pc.x, pc.y); await p.waitForTimeout(300);
      await auditar(p, `un punto por mes, con un mes fijado ${esquema}`);
      await ctx.close();
    }
    { // campamento 21: «Próxima etapa» con la escalerita del tramo (dueño y lectora), la tarjeta ligera de una etapa intermedia y «Tu
      // historia» con las etapas intermedias juntas y un tramo abierto (libro largo)
      const abrir = async (srv, cuenta, extra = []) => {
        const ctx = await navegador.newContext({ ...devices['iPhone 13'], colorScheme: esquema, bypassCSP: true });
        const p = await ctx.newPage();
        await p.addInitScript(([h, ex]) => { try { localStorage.setItem('libro.hora', String(h)); localStorage.setItem('libro.avisos.preguntado', '1'); for (const [k, v] of ex) localStorage.setItem(k, v); } catch { /* sin almacenamiento */ } }, [esquema === 'light' ? 12 : 22, extra]);
        await entrar(p, srv.url, cuenta);
        for (let k = 0; k < 3 && await p.locator('dialog[open]').count(); k++) { await p.keyboard.press('Escape'); await p.waitForTimeout(300); }
        return { ctx, p };
      };
      let { ctx, p } = await abrir(anio, ADMIN, [['libro.efectos', 'esenciales']]);
      await p.locator('#t-pasos').scrollIntoViewIfNeeded(); await p.waitForTimeout(300);
      await auditar(p, `«Próxima etapa» con su tramo (dueño) ${esquema}`);
      await p.evaluate(() => window.scrollTo(0, 0));
      await p.click('#cuenta-btn'); await p.click('#dc-sistema-btn'); await p.waitForTimeout(400);
      await p.click('[data-previa="paso"]');
      await p.waitForFunction(() => !document.getElementById('hito-cel').hidden, null, { timeout: 12000 }); await p.waitForTimeout(500);
      await auditar(p, `celebración ligera de una etapa intermedia ${esquema}`);
      await ctx.close();
      ({ ctx, p } = await abrir(anio, LECTOR));
      await p.locator('#t-pasos').scrollIntoViewIfNeeded(); await p.waitForTimeout(300);
      await auditar(p, `«Próxima etapa» con su tramo (lectora) ${esquema}`);
      await ctx.close();
      const largo = await servidor('largo');
      try {
        ({ ctx, p } = await abrir(largo, ADMIN, [['libro.pestana', 'historia']]));
        await p.evaluate(() => { document.getElementById('dh-sec-linea').open = true; document.querySelector('#dh-linea .h-pasos details')?.setAttribute('open', ''); }); await p.waitForTimeout(300);
        await p.locator('#dh-linea .h-pasos').first().scrollIntoViewIfNeeded();
        await auditar(p, `historia con las etapas intermedias juntas y un tramo abierto ${esquema}`);
        await ctx.close();
      } finally { largo.parar(); }
    }
    { // campamento 21B: la tele de la sala a 1920×1080 (con reloj, sismógrafo y la fiesta en su sitio) y la tele dormida
      const tele = async (hora) => {
        const ctx = await navegador.newContext({ viewport: { width: 1920, height: 1080 }, colorScheme: esquema, bypassCSP: true });
        const p = await ctx.newPage();
        await p.addInitScript((h) => { try { localStorage.setItem('libro.hora', String(h)); localStorage.setItem('libro.avisos.preguntado', '1'); } catch { /* sin almacenamiento */ } }, hora);
        await entrar(p, anio.url, LECTOR);
        await p.evaluate(() => { location.hash = '#tv'; }); await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(3200);
        return { ctx, p };
      };
      const tvMod = (p, js) => p.evaluate(new Function(`return (async () => { const tv = await import(document.querySelector('link[rel=modulepreload][href^="/tv.js"]').href); const est = await import(document.querySelector('link[rel=modulepreload][href^="/estado.js"]').href); ${js} })()`));
      let { ctx, p } = await tele(esquema === 'light' ? 12 : 20);
      await tvMod(p, 'for (const k of [1, 2]) { est.S.precio = 77000 + k * 150; est.S.precioTs = Date.now() + k; tv.pintarTV(); }'); await p.waitForTimeout(800);
      await auditar(p, `tele de la sala con reloj y sismógrafo ${esquema}`);
      await tvMod(p, 'tv.fiestaTV(990000, 1211769, 221769);'); await p.waitForTimeout(1500);
      await auditar(p, `tele de la sala con la fiesta en su sitio ${esquema}`);
      await ctx.close();
      ({ ctx, p } = await tele(23.5));
      await auditar(p, `tele dormida ${esquema}`);
      await ctx.close();
      // El marco de la historia: el reloj de la página (solo `Date`) se adelanta hasta la ventana del marco (las :05, :15…)
      ctx = await navegador.newContext({ viewport: { width: 1920, height: 1080 }, colorScheme: esquema, bypassCSP: true });
      p = await ctx.newPage();
      await p.addInitScript((h) => {
        try { localStorage.setItem('libro.hora', String(h)); localStorage.setItem('libro.avisos.preguntado', '1'); } catch { /* sin almacenamiento */ }
        const D = Date, real = D.now(), d = Math.floor((real - 300000) / 600000) * 600000 + 304000 - real;
        class F extends D { constructor(...a) { if (a.length) super(...a); else super(D.now() + d); } static now() { return D.now() + d; } }
        globalThis.Date = F;
      }, esquema === 'light' ? 12 : 20);
      await entrar(p, anio.url, LECTOR);
      await p.evaluate(() => { location.hash = '#tv'; }); await p.reload({ waitUntil: 'networkidle' });
      await p.waitForFunction(() => !document.getElementById('tv-marco').hidden && getComputedStyle(document.getElementById('tv-marco')).opacity === '1', null, { timeout: 15000 });
      await auditar(p, `tele con el marco de la historia ${esquema}`);
      await ctx.close();
      // Conectar una tele (el dueño, con el código a la vista) y la entrada con «Entrar con un código» (con un error)
      ({ ctx, p } = await nuevo(anio, ADMIN, conPush));
      await cerrarOferta(p);
      await p.click('#cuenta-btn'); await p.waitForTimeout(300);
      await p.click('#dc-sesiones-btn'); await p.waitForTimeout(900);
      await auditar(p, `conectar una tele ${esquema}`);
      await p.click('#tc-crear'); await p.waitForTimeout(600);
      await auditar(p, `conectar una tele con el código a la vista ${esquema}`);
      await ctx.close();
      ({ ctx, p } = await nuevo(anio, null));
      await p.goto(`${anio.url}/login#codigo`, { waitUntil: 'networkidle' }); await p.waitForTimeout(400);
      await auditar(p, `entrar con un código ${esquema}`);
      await p.keyboard.type('12345678'); await p.keyboard.press('Enter'); await p.waitForTimeout(700);
      await auditar(p, `entrar con un código, con un error ${esquema}`);
      await ctx.close();
    }
    // campamento 22: el valle vivo (de noche con sus luces, Nochebuena con luna llena y su grabado, piscuchas de octubre), teléfono y escritorio
    for (const [nombre, dia, hora, vp] of [['valle de noche', '2026-07-10', 20, null], ['Nochebuena con luna llena', '2026-12-24', 23.95, null], ['piscuchas y fogón', '2026-10-20', 18.5, null], ['valle de día en escritorio', '2026-07-10', 12, { width: 1440, height: 900 }], ['Nochebuena en escritorio', '2026-12-24', 23.95, { width: 1440, height: 900 }]]) {
      const ctx = await navegador.newContext({ ...(vp ? { viewport: vp } : devices['iPhone 13']), colorScheme: esquema, bypassCSP: true });
      const p = await ctx.newPage();
      await p.addInitScript(([h, d]) => { try { localStorage.setItem('libro.hora', String(h)); localStorage.setItem('libro.dia', d); localStorage.setItem('libro.pestanas', 'todo'); localStorage.setItem('libro.efectos', 'todos'); localStorage.setItem('libro.avisos.preguntado', '1'); } catch { /* sin almacenamiento */ } }, [hora, dia]);
      await entrar(p, anio.url, ADMIN); await cerrarOferta(p);
      for (let k = 0; k < 3 && await p.locator('dialog[open]').count(); k++) { await p.keyboard.press('Escape'); await p.waitForTimeout(300); }
      await auditar(p, `${nombre} ${esquema}`);
      await ctx.close();
    }
    // campamento 22B: el valle vivo, parte 2 (mar de niebla, azacuanes, pericos, zompopos, relámpagos, árboles en flor y vacas echadas)
    for (const [nombre, dia, hora, vp] of [['mar de niebla', '2026-10-15', 6, null], ['azacuanes', '2026-10-15', 12, null], ['pericos', '2026-10-15', 17, null], ['zompopos y el valle reverdeciendo', '2026-05-17', 8.5, null],
      ['relámpagos lejanos', '2026-08-10', 23, null], ['maquilishuat en flor y valle dorado', '2027-02-10', 12, null], ['mar de niebla en escritorio', '2026-10-15', 6.5, { width: 1440, height: 900 }], ['árbol de fuego y vacas en escritorio', '2026-04-20', 12, { width: 1440, height: 900 }]]) {
      const ctx = await navegador.newContext({ ...(vp ? { viewport: vp } : devices['iPhone 13']), colorScheme: esquema, bypassCSP: true });
      const p = await ctx.newPage();
      await p.addInitScript(([h, d]) => { try { localStorage.setItem('libro.hora', String(h)); localStorage.setItem('libro.dia', d); localStorage.setItem('libro.pestanas', 'todo'); localStorage.setItem('libro.efectos', 'todos'); localStorage.setItem('libro.avisos.preguntado', '1'); localStorage.setItem('libro.madrugada', '0'); } catch { /* sin almacenamiento */ } }, [hora, dia]);
      await entrar(p, anio.url, ADMIN); await cerrarOferta(p);
      for (let k = 0; k < 3 && await p.locator('dialog[open]').count(); k++) { await p.keyboard.press('Escape'); await p.waitForTimeout(300); }
      await auditar(p, `22B ${nombre} ${esquema}`);
      await ctx.close();
    }
    { // campamento 22C: el valle, de verdad (el pueblo delante y la Navidad en toda la montaña), en el teléfono, con letra muy grande, acostado, en escritorio y la entrada
      for (const [nombre, dia, hora, vp, letra] of [['Nochebuena en el teléfono', '2026-12-24', 21, { width: 390, height: 844 }, ''], ['Navidad de día con letra muy grande', '2026-12-10', 12, { width: 320, height: 568 }, 'muy-grande'],
        ['Navidad acostado', '2026-12-24', 21, { width: 844, height: 390 }, ''], ['fiestas patrias en la plaza', '2026-09-15', 12, null, ''], ['el pueblo de noche en escritorio', '2027-01-03', 20, { width: 1440, height: 900 }, '']]) {
        const ctx = await navegador.newContext({ ...(vp ? { viewport: vp, isMobile: vp.width < 700, hasTouch: vp.width < 1100 } : devices['iPhone 13']), colorScheme: esquema, bypassCSP: true });
        const p = await ctx.newPage();
        await p.addInitScript(([h, d, l]) => { try { localStorage.setItem('libro.hora', String(h)); localStorage.setItem('libro.dia', d); localStorage.setItem('libro.pestanas', 'todo'); localStorage.setItem('libro.efectos', 'todos'); localStorage.setItem('libro.avisos.preguntado', '1'); localStorage.setItem('libro.madrugada', '0'); if (l) localStorage.setItem('libro.letra', l); } catch { /* sin almacenamiento */ } }, [hora, dia, letra]);
        await entrar(p, anio.url, ADMIN); await cerrarOferta(p);
        for (let k = 0; k < 3 && await p.locator('dialog[open]').count(); k++) { await p.keyboard.press('Escape'); await p.waitForTimeout(300); }
        await auditar(p, `22C ${nombre} ${esquema}`);
        await ctx.close();
      }
      const ctx = await navegador.newContext({ ...devices['iPhone 13'], colorScheme: esquema });
      const p = await ctx.newPage();
      await p.addInitScript(() => { try { localStorage.setItem('libro.hora', '21'); localStorage.setItem('libro.dia', '2026-12-24'); } catch { /* sin almacenamiento */ } });
      await p.goto(`${anio.url}/login`, { waitUntil: 'networkidle' }); await p.waitForTimeout(600);
      await auditar(p, `22C la entrada en Nochebuena ${esquema}`);
      await ctx.close();
    }
    { // campamento 23: tal día como hoy (saludo y Diario) y la película del ascenso (corriendo, «Ver ese día», «ninguno» con letra muy grande, acostado)
      const abrir = async (srv, cuenta, extra = {}, vp = null) => {
        const ctx = await navegador.newContext({ ...(vp ? { viewport: vp, isMobile: vp.width < 700, hasTouch: vp.width < 1100 } : devices['iPhone 13']), colorScheme: esquema, bypassCSP: true });
        const p = await ctx.newPage();
        await p.addInitScript(([h, x]) => { try { localStorage.setItem('libro.hora', String(h)); localStorage.setItem('libro.avisos.preguntado', '1'); localStorage.setItem('libro.madrugada', '0'); for (const [k, v] of Object.entries(x)) localStorage.setItem(k, v); } catch { /* sin almacenamiento */ } }, [esquema === 'light' ? 12 : 20, extra]);
        await entrar(p, srv.url, cuenta); await cerrarOferta(p);
        for (let k = 0; k < 3 && await p.locator('dialog[open]').count(); k++) { await p.keyboard.press('Escape'); await p.waitForTimeout(300); }
        return { ctx, p };
      };
      let { ctx, p } = await abrir(taldia, ADMIN, { 'libro.pestana': 'resumen' });
      await p.click('#dia-abrir'); await p.waitForTimeout(400);
      await auditar(p, `23 tal día como hoy: saludo y Diario ${esquema}`);
      await ctx.close();
      ({ ctx, p } = await abrir(anio, ADMIN, { 'libro.pestana': 'historia', 'libro.efectos': 'todos' }));
      await auditar(p, `23 «Tu historia» con la película ${esquema}`);
      await p.click('#dh-peli-ver'); await p.waitForTimeout(5000);
      await auditar(p, `23 la película corriendo ${esquema}`);
      await p.waitForTimeout(11500);
      await auditar(p, `23 la película al acabar ${esquema}`);
      await ctx.close();
      ({ ctx, p } = await abrir(mil, LECTOR, { 'libro.pestana': 'historia', 'libro.historia.abiertas': 'linea' }));
      await p.evaluate(() => { for (const d of document.querySelectorAll('#dh-linea .h-pasos details')) d.open = true; });
      await auditar(p, `23 lectora: «Ver ese día» en la línea ${esquema}`);
      await p.locator('#dh-linea .h-ver').nth(2).click(); await p.waitForTimeout(900);
      await auditar(p, `23 lectora: la película detenida en un día ${esquema}`);
      await ctx.close();
      ({ ctx, p } = await abrir(anio, ADMIN, { 'libro.pestana': 'historia', 'libro.efectos': 'ninguno', 'libro.letra': 'muy-grande', 'libro.contraste': 'alto' }, { width: 320, height: 568 }));
      await p.click('#dh-peli-ver'); await p.waitForTimeout(900);
      await auditar(p, `23 la película con «ninguno», letra muy grande y alto contraste a 320 ${esquema}`);
      await ctx.close();
      ({ ctx, p } = await abrir(anio, ADMIN, { 'libro.pestana': 'historia' }, { width: 844, height: 390 }));
      await p.click('#dh-peli-ver'); await p.waitForTimeout(3000);
      await auditar(p, `23 la película acostada ${esquema}`);
      await ctx.close();
    }
    { // campamento 24: medir este aparato (antes de la prueba, durante, con el resultado) y las medidas en «Estado del sistema»
      const { ctx, p } = await nuevo(anio, ADMIN, conPush);
      await cerrarOferta(p);
      await p.goto(`${anio.url}/medir`, { waitUntil: 'load' });
      await p.waitForSelector('#d-medir[open]', { timeout: 30000 }); await p.waitForTimeout(400);
      await auditar(p, `medir este aparato ${esquema}`);
      await p.click('#me-empezar'); await p.waitForTimeout(4500);
      await auditar(p, `medir este aparato, durante la prueba ${esquema}`);
      await p.waitForSelector('#d-medir[open]', { timeout: 20000 }); await p.waitForTimeout(400);
      await auditar(p, `medir este aparato, con el resultado ${esquema}`);
      // Una de cada veredicto (Lento con su regla, Revisar, la pantalla limitada) y más de cinco, para que salgan las anteriores plegadas
      for (const c of [{ fps: 56, fps_escena: 47 }, { fps: 30, fps_escena: 30, hz: 30 }, { fps: 53, fps_escena: 54 }, { fps: 59 }, { fps: 58 }]) {
        await p.evaluate((x) => fetch('/api/medidas', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Libro': '1' },
          body: JSON.stringify({ saldo_ms: 900, red_ms: 80, fps_escena: 58, fps_peor: 50, fps_p5: 55, tirones: 1, hz: 60, duracion_ms: 7000, recorrido: 2400, efectos: 'todos', ligero: false, tema: 'oscuro', ancho: 390, alto: 844, dpr: 3, memoria: null, nucleos: 6, instalada: true, carga: 'navegar', ...x }) }), c);
      }
      await p.click('#me-sistema');
      await p.waitForFunction(() => document.querySelectorAll('#sis-med .sis-fila, #sis-med-resto .sis-fila').length === 6, null, { timeout: 8000 });
      await p.click('#sis-med-mas > summary'); await p.waitForTimeout(300);
      await auditar(p, `medidas de los aparatos ${esquema}`);
      await p.click('#sis-med-borrar'); await p.waitForTimeout(200);
      await auditar(p, `borrar las medidas, segundo toque ${esquema}`);
      await p.click('#sis-med-borrar'); await p.waitForFunction(() => /Aún no hay medidas/.test(document.getElementById('sis-med').textContent), null, { timeout: 5000 });
      await auditar(p, `medidas de los aparatos, vacía ${esquema}`);
      await ctx.close();
    }
    { // campamento 24 · confianza: la revisión del respaldo (sin anotar, al día, pasados 180 días), su categoría de avisos y la suma por etiqueta
      const { ctx, p } = await nuevo(mil, ADMIN, conPush);
      await cerrarOferta(p);
      const sistema = async () => {
        await p.evaluate(() => document.getElementById('sis-rg').replaceChildren());
        await p.click('#dc-sistema-btn');
        await p.waitForFunction(() => !/Cargando/.test(document.getElementById('sis-res').textContent) && document.querySelector('#sis-rg .sis-fila'), null, { timeout: 8000 });
        await p.evaluate(() => document.getElementById('sis-revisado').scrollIntoView({ block: 'center' })); await p.waitForTimeout(300);
      };
      await p.click('#cuenta-btn'); await p.waitForTimeout(300);
      await sistema();
      await auditar(p, `24 revisión del respaldo sin anotar ${esquema}`);
      await p.click('#sis-revisado'); await p.waitForFunction(() => /notado/.test(document.getElementById('sis-rg-res').textContent), null, { timeout: 5000 });
      await auditar(p, `24 revisión del respaldo al día, recién anotada ${esquema}`);
      await p.route('**/api/sistema', async (route) => {
        const r = await route.fetch(); const j = await r.json();
        j.resguardo = { revisado: '2026-01-05', dias: 320, cada: 180, al_dia: false, encendido: true, proximo: '2027-05-10', toca: false };
        await route.fulfill({ response: r, json: j });
      });
      await p.click('#dc-volver'); await p.waitForTimeout(300);
      await sistema();
      await auditar(p, `24 revisión del respaldo pasados 180 días ${esquema}`);
      await p.unroute('**/api/sistema');
      await p.click('#dc-volver'); await p.waitForTimeout(300);
      await p.click('#dc-avisos-btn'); await p.waitForTimeout(500);
      await p.click('#av-interruptor'); await p.waitForTimeout(900);
      await p.click('#av-lista input[data-cat="resguardo"]'); await p.waitForTimeout(400);
      await auditar(p, `24 avisos con la revisión del respaldo encendida ${esquema}`);
      await p.keyboard.press('Escape'); await p.waitForTimeout(400);
      await p.evaluate(() => fetch('/api/compras', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Libro': '1' },
        body: JSON.stringify({ fecha: new Intl.DateTimeFormat('en-CA', { timeZone: 'America/El_Salvador' }).format(new Date()), monto: 3, sats: 4321, tipo: 'venta', etiquetas: ['bono'] }) }));
      await ctx.close();
      // La suma por etiqueta con su neto, a 320 px con letra muy grande (dueño) y a 390 (quien solo mira)
      for (const [cuenta, vp, letra] of [[ADMIN, { width: 320, height: 568 }, 'muy-grande'], [LECTOR, null, null]]) {
        const ctx2 = await navegador.newContext({ ...devices['iPhone 13'], ...(vp ? { viewport: vp } : {}), colorScheme: esquema, bypassCSP: true });
        const q = await ctx2.newPage();
        await q.addInitScript(([h, l]) => { try { localStorage.setItem('libro.hora', String(h)); localStorage.setItem('libro.pestanas', 'todo'); localStorage.setItem('libro.avisos.preguntado', '1'); if (l) localStorage.setItem('libro.letra', l); } catch { /* */ } }, [esquema === 'light' ? 12 : 22, letra]);
        await entrar(q, mil.url, cuenta);
        for (let k = 0; k < 3 && await q.locator('dialog[open]').count(); k++) { await q.keyboard.press('Escape'); await q.waitForTimeout(300); }
        await q.evaluate(() => document.getElementById('lista').scrollIntoView({ block: 'start' }));
        await abrirFechas(q); await q.selectOption('#l-etq', 'bono'); await q.waitForTimeout(400);
        await auditar(q, `24 lista con la suma de una etiqueta (${cuenta === ADMIN ? 'dueño, 320 px, letra muy grande' : 'quien solo mira'}) ${esquema}`);
        await ctx2.close();
      }
    }
    { // campamento 25: los osos de peluche en la cumbre (de día y de noche con la aurora, en Navidad con bufanda, el gorrito de un cumpleaños, dando su saltito, en la película, en la tele y en la entrada), el sello de 1 BTC con la cara del oso y «Qué hay de nuevo»
      const abrir = async (srv, cuenta, extra = {}, vp = null) => {
        const ctx = await navegador.newContext({ ...(vp ? { viewport: vp, isMobile: vp.width < 700, hasTouch: vp.width < 1100 } : devices['iPhone 13']), colorScheme: esquema, bypassCSP: true });
        const p = await ctx.newPage();
        await p.addInitScript((x) => { try { localStorage.setItem('libro.avisos.preguntado', '1'); localStorage.setItem('libro.madrugada', '0'); for (const [k, v] of Object.entries(x)) localStorage.setItem(k, v); } catch { /* sin almacenamiento */ } }, { 'libro.hora': esquema === 'light' ? '12' : '20', 'libro.dia': '2026-11-25', 'libro.efectos': 'todos', ...extra });
        await entrar(p, srv.url, cuenta); await cerrarOferta(p);
        for (let k = 0; k < 3 && await p.locator('dialog[open]').count(); k++) { await p.keyboard.press('Escape'); await p.waitForTimeout(300); }
        return { ctx, p };
      };
      let { ctx, p } = await abrir(anio, ADMIN);
      await auditar(p, `25 los osos en la cumbre (dueño, por pestañas) ${esquema}`);
      await p.evaluate(() => { const o = document.querySelector('#m-osos.osos'); o.classList.add('salta'); for (const e of o.querySelectorAll('.oso')) { e.style.animationPlayState = 'paused'; e.style.animationDelay = '-0.43s'; } });
      await auditar(p, `25 los osos a medio saltito ${esquema}`);
      await p.evaluate(() => fetch('/api/yo/cumple', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-Libro': '1' }, body: JSON.stringify({ cumple: '11-25' }) }));
      await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(2500);
      for (let k = 0; k < 3 && await p.locator('dialog[open]').count(); k++) { await p.keyboard.press('Escape'); await p.waitForTimeout(300); }
      await auditar(p, `25 el gorrito de un cumpleaños ${esquema}`);
      await p.evaluate(() => fetch('/api/yo/cumple', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-Libro': '1' }, body: JSON.stringify({ cumple: '' }) }));
      await p.evaluate(() => fetch('/api/cambios-visto', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Libro': '1' }, body: JSON.stringify({ id: '2026-12-e' }) }));
      await p.reload({ waitUntil: 'networkidle' }); await p.waitForSelector('#d-cambios[open]', { timeout: 8000 }); await p.waitForTimeout(400);
      await auditar(p, `25 «Qué hay de nuevo» con los osos ${esquema}`);
      await ctx.close();
      ({ ctx, p } = await abrir(anio, LECTOR, { 'libro.dia': '2026-12-24', 'libro.hora': esquema === 'light' ? '12' : '21' }, { width: 320, height: 568 }));
      await auditar(p, `25 Navidad: los osos con bufanda (lectora, 320 px) ${esquema}`);
      await ctx.close();
      ({ ctx, p } = await abrir(anio, ADMIN, { 'libro.pestana': 'historia' }));
      await p.click('#dh-peli-ver'); await p.waitForTimeout(9000);
      await auditar(p, `25 la película con los osos ${esquema}`);
      await ctx.close();
      ({ ctx, p } = await abrir(ballena, ADMIN, { 'libro.pestana': 'historia', 'libro.historia.abiertas': 'sellos' }, { width: 1440, height: 900 }));
      await auditar(p, `25 «Tu historia» con el sello de 1 BTC (la cara del oso) ${esquema}`);
      await p.evaluate(() => window.scrollTo(0, 0));
      await p.click('#cuenta-btn'); await p.click('#dc-sistema-btn'); await p.waitForTimeout(500);
      await p.click('[data-previa="epico"]');
      await p.waitForFunction(() => !document.getElementById('hito-cel').hidden, null, { timeout: 12000 }); await p.waitForTimeout(600);
      await auditar(p, `25 la celebración de 1 BTC (los osos dan su saltito) ${esquema}`);
      await ctx.close();
      ({ ctx, p } = await abrir(anio, LECTOR, {}, { width: 1920, height: 1080 }));
      await p.goto(`${anio.url}/#tv`, { waitUntil: 'networkidle' }); await p.waitForTimeout(3000);
      await auditar(p, `25 la tele con los osos ${esquema}`);
      await ctx.close();
      ctx = await navegador.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: esquema });
      p = await ctx.newPage();
      await p.addInitScript((h) => { try { localStorage.setItem('libro.hora', h); localStorage.setItem('libro.dia', '2026-12-24'); } catch { /* sin almacenamiento */ } }, esquema === 'light' ? '12' : '20');
      await p.goto(`${anio.url}/login`, { waitUntil: 'networkidle' }); await p.waitForTimeout(800);
      await auditar(p, `25 la entrada con los osos ${esquema}`);
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
      await p.addInitScript((h) => { try { localStorage.setItem('libro.hora', String(h)); localStorage.setItem('libro.pestanas', 'todo'); } catch { /* sin almacenamiento */ } }, esquema === 'light' ? 12 : 22);
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
      await p.addInitScript((h) => { try { localStorage.setItem('libro.hora', String(h)); localStorage.setItem('libro.pestanas', 'todo'); } catch { /* sin almacenamiento */ } }, esquema === 'light' ? 12 : 22);
      await entrar(p, anio.url, ADMIN);
      await cerrarOferta(p);
      await auditar(p, `índice lateral (pantalla ancha) ${esquema}`);
      await ctx.close();
    }
    // teléfono acostado (app y entrada) y monitor ultra ancho
    for (const [nombre, w, h, ruta] of [['app acostada 844×390', 844, 390, null], ['entrada acostada 568×320', 568, 320, '/login'], ['pantalla ultra ancha 3440×1440', 3440, 1440, null]]) {
      const ctx = await navegador.newContext({ viewport: { width: w, height: h }, colorScheme: esquema, bypassCSP: true });
      const p = await ctx.newPage();
      await p.addInitScript((hh) => { try { localStorage.setItem('libro.hora', String(hh)); localStorage.setItem('libro.pestanas', 'todo'); localStorage.setItem('libro.avisos.preguntado', '1'); } catch { /* sin almacenamiento */ } }, esquema === 'light' ? 12 : 22);
      if (ruta) { await p.goto(`${anio.url}${ruta}`, { waitUntil: 'networkidle' }); await p.waitForTimeout(800); }
      else { await entrar(p, anio.url, ADMIN); await cerrarOferta(p); }
      await auditar(p, `${nombre} ${esquema}`);
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
  anio.parar(); hoy.parar(); ballena.parar(); mil.parar(); taldia.parar(); await navegador.close();
}
console.log(`${estados} estados revisados con axe${process.env.ESQUEMA ? ` (solo ${process.env.ESQUEMA})` : ''}.`);
if (hallazgos.length) {
  console.log(`\n${hallazgos.length} violaciones:`);
  for (const h of hallazgos) console.log(`  - ${h}`);
  process.exit(1);
}
console.log('Sin violaciones.');
