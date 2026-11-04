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
async function entrar(browser, srv, [usuario, clave], opts = {}) {
  const ctx = await browser.newContext({ ...devices['iPhone 13'], ...opts });
  const p = await ctx.newPage();
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
      const hoy = new Date().toISOString().slice(0, 10);
      const usadas = new Set(compras.map((c) => c.fecha));
      const libre = (() => { for (let d = new Date(); ; d.setDate(d.getDate() - 1)) { const f = d.toISOString().slice(0, 10); if (!usadas.has(f)) return f; } })();
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
      const r = await p.evaluate(() => fetch('/api/compras', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Libro': '1' }, body: '{}' }).then((x) => x.status));
      eq(r, 403, 'el servidor rechaza escribir a un lector');
      // El 403 de arriba es la prueba de que el servidor rechaza al lector: es lo esperado; nada más debe salir.
      eq(consola.filter((c) => !/403/.test(c)), [], `consola limpia (lector): ${consola.join(' | ')}`);
      await ctx.close();
    }
  } finally {
    anio.parar();
  }

  // ---------------------------------------------------------------- una sola compra
  const una = await servidor('hoy');
  try {
    const { ctx, p, consola } = await entrar(navegador, una, ADMIN);
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
