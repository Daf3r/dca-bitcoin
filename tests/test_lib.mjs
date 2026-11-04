// Pruebas de los cálculos puros del frontend. Uso: node tests/test_lib.mjs
import assert from 'node:assert/strict';
import {
  escalaMontana, altitud, metaSiguiente, nombreHito, textoMeses, resumen, serieGrafico, ubicar, muestrear, hoyISO, ZONA,
} from '../app/static/lib.js';

let n = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); n++; };
const eq = (a, b, msg) => { assert.deepEqual(a, b, msg); n++; };

// Escala de hitos de la montaña
eq(metaSiguiente(36578), 1e5, 'meta con una compra');
eq(metaSiguiente(1e5), 1e6, 'al cruzar 100k la meta pasa a 1M');
eq(escalaMontana(36578).campos, [1e5, 1e6, 1e7, 1e8], 'hoy en escritorio');
eq(escalaMontana(36578, 3).campos, [1e5, 1e6, 1e8], 'hoy en móvil: siguiente meta, otro y cumbre');
eq(escalaMontana(1_058_553, 3).campos, [1e6, 1e7, 1e8], '1M: último alcanzado, siguiente y cumbre');
eq(escalaMontana(16_735_348).campos, [1e5, 1e6, 1e7, 1e8], '16.7M en escritorio');
eq(escalaMontana(16_735_348, 3).campos, [1e6, 1e7, 1e8], '16.7M en móvil');
const ballena = escalaMontana(2.05e10);
eq([ballena.cima, ballena.campos], [1e11, [1e8, 1e9, 1e10, 1e11]], 'más de 200 BTC: cumbre 1,000 BTC');
eq(escalaMontana(2.05e10, 3).campos, [1e9, 1e10, 1e11], 'más de 200 BTC en móvil');
eq(nombreHito(1e11), '1,000 BTC', 'nombre de 1,000 BTC');
ok(altitud(36578, escalaMontana(36578)) > 0 && altitud(36578, escalaMontana(36578)) < 0.25, 'altitud baja al empezar');
eq(altitud(1e8, escalaMontana(5e7)), 1, 'la cumbre es altitud 1');
eq(altitud(0, escalaMontana(0)), 0, 'sin sats, al pie');

// «Hoy» en la zona de la app, no en la del navegador
const esperado = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/El_Salvador' }).format(new Date());
eq([ZONA, hoyISO()], ['America/El_Salvador', esperado], 'hoy es el de El Salvador');
ok(/^\d{4}-\d{2}-\d{2}$/.test(hoyISO()), 'formato AAAA-MM-DD');

// Textos
eq([textoMeses(0), textoMeses(1), textoMeses(5)], ['en el primer mes', 'al mes de empezar', 'a los 5 meses'], 'singular y plural');

// Resumen: compras semanales con un hueco
const semanal = [];
for (let i = 0; i < 20; i++) {
  if (i === 6) continue; // una semana sin comprar
  const d = new Date(Date.UTC(2026, 6, 6 + i * 7));
  semanal.push({ id: i + 1, fecha: d.toISOString().slice(0, 10), monto: 20, sats: 25000, precio: 80000 });
}
const r = resumen(semanal, 77000, '2026-11-18');
eq(r.racha, 13, 'racha actual desde la semana pasada');
eq(r.mejorRacha, 13, 'mejor racha');
eq(r.hitos[0].fecha, '2026-07-27', 'fecha del hito de 100k (cuarta compra)');
eq(r.hitos[0].meses, 0, 'cruzado el primer mes');
eq(r.ultimas52.filter(Boolean).length, 19, 'semanas con compra en las últimas 52');
ok(r.proyeccion > 0 && r.proyeccion <= 60, 'proyección a la siguiente meta');
eq(resumen(semanal.slice(0, 2), 77000, '2026-11-18').proyeccion, null, 'sin proyección con pocas compras');
eq(resumen([{ id: 1, fecha: '2026-11-15', monto: 1, sats: 1300, precio: 76923 }], 77000, '2026-11-18').proyeccion, null, 'sin proyección con ritmo pobre');
const una = resumen([{ id: 1, fecha: '2026-10-31', monto: 28.68, sats: 36578, precio: 78407.79 }], 77598.24, '2026-11-03');
eq([una.racha, una.meta, Math.round(una.valor * 100) / 100], [1, 1e5, 28.38], 'el estado real del dueño');
eq(resumen([], null).valor, null, 'sin compras ni precio');


// Racha semanal (lunes a domingo, hora local)
const semanales = (desde, n, salto = []) => Array.from({ length: n }, (_, i) => i).filter((i) => !salto.includes(i)).map((i) => {
  const d = new Date(Date.UTC(...desde) + i * 7 * 864e5);
  return { id: i + 1, fecha: d.toISOString().slice(0, 10), monto: 10, sats: 12000, precio: 83000 };
});
// Cambio de año: lunes 15-dic-2025 a lunes 12-ene-2026, hoy miércoles 14-ene-2026.
const anioNuevo = resumen(semanales([2025, 11, 15], 5), 80000, '2026-01-14');
eq([anioNuevo.racha, anioNuevo.semanaEnCurso], [5, true], 'la racha cruza el cambio de año');
// Semana actual vacía: última compra el lunes pasado; hoy es domingo de la semana siguiente.
const vacia = resumen(semanales([2026, 9, 5], 4), 80000, '2026-11-08');
eq([vacia.racha, vacia.semanaEnCurso], [4, false], 'semana en curso sin compra no rompe la racha');
// Y si pasa una semana completa sin comprar, sí se rompe.
eq(resumen(semanales([2026, 9, 5], 4), 80000, '2026-11-09').racha, 0, 'semana completa sin compra rompe la racha');
// Hueco de una semana a mitad: cuenta solo lo posterior; la mejor racha recuerda lo anterior.
const hueco = resumen(semanales([2026, 6, 6], 12, [5]), 80000, '2026-09-23');
eq([hueco.racha, hueco.mejorRacha], [6, 6], 'hueco de una semana');
const hueco2 = resumen(semanales([2026, 6, 6], 12, [8]), 80000, '2026-09-23');
eq([hueco2.racha, hueco2.mejorRacha], [3, 8], 'mejor racha anterior al hueco');
// Primera compra hace menos de 52 semanas.
const corta = resumen(semanales([2026, 8, 7], 10), 80000, '2026-11-11');
eq([corta.racha, corta.ultimas52.filter(Boolean).length, corta.semanasDesdePrimera], [10, 10, 10], 'historia corta');
// El caso del bug: 52 semanas seguidas y la semana en curso aún sin compra.
const bug = resumen(semanales([2025, 10, 3], 52), 80000, '2026-11-04');
eq([bug.racha, bug.ultimas52.filter(Boolean).length], [52, 52], 'racha de 52 = 52 de 52 semanas en la ventana');
// Invariante: la racha (hasta 52) nunca supera las semanas con compra de la ventana.
for (const [desde, n, salto, hoy] of [[[2025, 10, 3], 52, [], '2026-11-04'], [[2024, 0, 1], 120, [30, 77], '2026-04-22'], [[2026, 9, 5], 4, [], '2026-11-08'], [[2025, 11, 15], 5, [2], '2026-01-14']]) {
  const x = resumen(semanales(desde, n, salto), 80000, hoy);
  ok(Math.min(x.racha, 52) <= x.ultimas52.filter(Boolean).length, `invariante racha ≤ semanas de la ventana (${hoy})`);
}

// Gráfico: el último punto es el precio en vivo; las velas son UTC
const velas = [['2026-11-01', 76000], ['2026-11-02', 76500], ['2026-11-03', 77000]];
eq(serieGrafico(velas, 77598, '2026-11-03').at(-1), { fecha: '2026-11-03', p: 77598, vivo: true }, 'vivo reemplaza la vela de hoy');
eq(serieGrafico(velas.slice(0, 2), 77598, '2026-11-03').length, 3, 'vivo se añade si falta la vela de hoy');
eq(serieGrafico([...velas, ['2026-11-04', 77100]], 77598, '2026-11-03').at(-1).p, 77598, 'vela UTC de mañana: también se sustituye');
const s = serieGrafico(velas, 77598, '2026-11-03');
eq(ubicar('2026-11-04', s), 2, 'compra de noche local (día UTC siguiente) se acota a la última vela');
eq(ubicar('2026-10-01', s), -1, 'compra antes del histórico');
eq(ubicar('2026-11-02', s), 1, 'compra en un día con vela');

// Decimación
const larga = Array.from({ length: 2200 }, (_, i) => ({ fecha: `d${String(i).padStart(5, '0')}`, p: 100 + Math.sin(i / 9) * 50 + (i === 1234 ? 900 : 0) }));
const m = muestrear(larga, 300);
ok(m.length <= 601 && m.length >= 300, `decima a ~2n puntos (${m.length})`);
ok(m.some((x) => x.p > 900), 'conserva el pico');
eq(m.at(-1), larga.at(-1), 'conserva el último punto');

console.log(`OK ${n} comprobaciones`);
