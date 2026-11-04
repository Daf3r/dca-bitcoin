// Pruebas de los cálculos puros del frontend. Uso: node tests/test_lib.mjs
import assert from 'node:assert/strict';
import {
  escalaMontana, altitud, metaSiguiente, nombreHito, textoMeses, resumen, serieGrafico, ubicar, muestrear, hoyISO, ZONA, precioDelDia, estimarMonto, mempoolUrl, extraerTxid, etapaSiguiente, etapaAnterior, etapasHasta, etapasCruzadas, novedades, avisosAlAnotar,
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

// Dólares estimados de una compra anotada solo con sats
const cierres = [['2026-10-29', 70000], ['2026-10-30', 71000], ['2026-11-01', 72000]];
eq(precioDelDia('2026-11-04', cierres, 77598, '2026-11-04'), { precio: 77598, fuente: 'vivo' }, 'hoy usa el precio en vivo');
eq(precioDelDia('2026-10-30', cierres, 77598, '2026-11-04'), { precio: 71000, fuente: 'cierre', dia: '2026-10-30' }, 'día pasado: su cierre');
eq(precioDelDia('2026-10-31', cierres, 77598, '2026-11-04'), { precio: 71000, fuente: 'cierre', dia: '2026-10-30' }, 'sin vela ese día: la anterior');
eq(precioDelDia('2026-11-03', cierres, 77598, '2026-11-04'), { precio: 72000, fuente: 'cierre', dia: '2026-11-01' }, 'después de la última vela: la última');
eq(precioDelDia('2026-01-01', cierres, 77598, '2026-11-04'), { precio: 77598, fuente: 'hoy' }, 'antes del histórico: precio de hoy, marcado');
eq(precioDelDia('2026-01-01', [], null, '2026-11-04'), null, 'sin nada, null');
eq(precioDelDia('2026-11-04', cierres, null, '2026-11-04'), null, 'hoy sin precio en vivo, null');
eq(estimarMonto(32_500, 76_923), 25, '32,500 sats a 76,923 son $25.00');
eq(estimarMonto(36_578, 77_598), 28.38, 'redondeo a centavos');
eq(estimarMonto(1, 50_000), 0.01, 'mínimo un centavo');

// Ritmo quincenal: la racha no se rompe entre compras separadas por dos semanas
const cada = (inicio, dias, veces) => Array.from({ length: veces }, (_, k) => ({
  id: k + 1, fecha: new Date(Date.UTC(...inicio) + k * dias * 864e5).toISOString().slice(0, 10), monto: 25, sats: 32500, precio: 76923,
}));
const quin = resumen(cada([2026, 8, 7], 14, 6), 77598, '2026-11-12');
eq(quin.paso, 2, 'cada 14 días: ritmo quincenal');
eq(resumen(cada([2026, 9, 1], 7, 6), 77598, '2026-11-12').paso, 1, 'cada 7 días: ritmo semanal');
eq(resumen(cada([2026, 9, 1], 14, 3), 77598, '2026-11-12').paso, 1, 'con menos de 4 compras: semanal');
const ultimaQ = cada([2026, 8, 7], 14, 6).at(-1).fecha;
const hoyQ = new Date(Date.parse(ultimaQ) + 10 * 864e5).toISOString().slice(0, 10); // 10 días después, aún dentro de la quincena
const q1 = resumen(cada([2026, 8, 7], 14, 6), 77598, hoyQ);
eq([q1.paso, q1.racha, q1.mejorRacha], [2, 6, 6], 'quincenal: la racha sigue viva 10 días después de la última compra');
const hoyRota = new Date(Date.parse(ultimaQ) + 24 * 864e5).toISOString().slice(0, 10);
eq(resumen(cada([2026, 8, 7], 14, 6), 77598, hoyRota).racha, 0, 'quincenal: 24 días sin comprar rompe la racha');
const mismoRitmoSemanal = resumen(cada([2026, 8, 7], 7, 6), 77598, new Date(Date.parse(cada([2026, 8, 7], 7, 6).at(-1).fecha) + 17 * 864e5).toISOString().slice(0, 10));
eq(mismoRitmoSemanal.racha, 0, 'semanal: 17 días sin comprar sí rompe la racha');
ok(q1.venceSemanas >= 0, 'quincenal: vence en una semana futura o esta');

// TXID y enlace a mempool.space
const TXV = '0123456789abcdef'.repeat(4);
eq(mempoolUrl(TXV), `https://mempool.space/tx/${TXV}`, 'enlace con TXID válido');
eq([mempoolUrl(null), mempoolUrl(''), mempoolUrl('abc'), mempoolUrl(TXV.toUpperCase()), mempoolUrl(TXV + 'a'), mempoolUrl('"><script>')], [null, null, null, null, null, null], 'sin enlace si no es un TXID válido');
eq(extraerTxid(`https://mempool.space/es/tx/${TXV}?mode=details`), TXV, 'saca el TXID de un enlace');
eq(extraerTxid('  ' + TXV.toUpperCase() + ' '), TXV, 'minúsculas y sin espacios');
eq(extraerTxid('https://mempool.space/'), 'https://mempool.space/', 'enlace sin TXID queda igual para que el servidor lo rechace');
eq(extraerTxid(null), '', 'nulo es vacío');

// Ventas y gastos: costo promedio ponderado, sin impuestos
const mov = (id, fecha, tipo, monto, sats) => ({ id, fecha, tipo, monto, sats, precio: (monto * 1e8) / sats });
const cerca = (a, b, msg) => ok(Math.abs(a - b) < 1e-9, `${msg}: ${a} vs ${b}`);
const v1 = resumen([mov(1, '2026-01-01', 'compra', 100, 1_000_000), mov(2, '2026-02-01', 'venta', 40, 250_000)], 20000, '2026-03-01');
eq([v1.sats, v1.nCompras, v1.nVentas, v1.n], [750_000, 1, 1, 2], 'saldo y conteos con una venta');
cerca(v1.realizada, 15, 'ganancia realizada = 40 - 25 de costo'); cerca(v1.inv, 75, 'costo base restante');
cerca(v1.promedio, 10000, 'el costo promedio no cambia al vender'); cerca(v1.gan, 75, 'no realizada = 150 - 75'); cerca(v1.total, 90, 'total');
cerca(v1.comprado, 100, 'comprado'); cerca(v1.vendido, 40, 'vendido'); eq(v1.items[1].realizada, 15, 'la venta lleva su ganancia');
const v2 = resumen([mov(1, '2026-01-01', 'compra', 100, 1_000_000), mov(2, '2026-02-01', 'venta', 40, 250_000), mov(3, '2026-03-01', 'venta', 200, 750_000)], 20000, '2026-04-01');
eq([v2.sats, v2.inv, v2.promedio, v2.gan], [0, 0, null, 0], 'vender todo deja el saldo y el costo en cero');
cerca(v2.realizada, 140, 'realizada acumulada (15 + 125)'); cerca(v2.total, 140, 'total tras vender todo');
// una compra posterior parte de cero: el costo promedio no arrastra lo vendido
const v3 = resumen([mov(1, '2026-01-01', 'compra', 100, 1_000_000), mov(2, '2026-02-01', 'venta', 100, 1_000_000), mov(3, '2026-03-01', 'compra', 50, 500_000)], 20000, '2026-04-01');
cerca(v3.promedio, 10000, 'tras vender todo, el promedio vuelve a empezar'); eq(v3.sats, 500_000, 'saldo tras recomprar');
// mismo día: las compras van antes que las ventas aunque la venta tenga id menor
const v4 = resumen([mov(1, '2026-01-01', 'venta', 5, 500), mov(2, '2026-01-01', 'compra', 10, 1000)], 20000, '2026-01-02');
cerca(v4.realizada, 0, 'misma fecha: la venta usa la compra del día'); eq(v4.items.map((x) => x.tipo), ['compra', 'venta'], 'orden dentro del día');
// hitos: la fecha del hito se conserva aunque después se venda
const v5 = resumen([mov(1, '2026-01-01', 'compra', 200, 2_000_000), mov(2, '2026-02-01', 'venta', 150, 1_500_000)], 20000, '2026-03-01');
eq([v5.sats, v5.meta, v5.hitos.find((h) => h.m === 1e6).fecha], [500_000, 1e6, '2026-01-01'], 'hito 1M conserva su fecha tras vender');
// el ritmo y la racha cuentan solo las compras
const quincena = (k) => mov(k + 1, new Date(Date.UTC(2026, 7, 7) + k * 14 * 864e5).toISOString().slice(0, 10), 'compra', 25, 32500);
const mezcla = [...Array.from({ length: 6 }, (_, k) => quincena(k)), mov(50, '2026-08-14', 'venta', 5, 1000), mov(51, '2026-09-04', 'venta', 5, 1000)];
const rm = resumen(mezcla, 77598, '2026-11-02');
eq([rm.paso, rm.nCompras, rm.nVentas], [2, 6, 2], 'las ventas no cambian el ritmo quincenal');
// proyección: con ventas que superan lo comprado en 6 meses, no hay proyección
const sinRitmo = resumen([mov(1, '2026-08-01', 'compra', 10, 100_000), mov(2, '2026-08-08', 'compra', 10, 100_000), mov(3, '2026-08-15', 'compra', 10, 100_000), mov(4, '2026-08-20', 'venta', 35, 350_000), mov(5, '2025-01-01', 'compra', 100, 1_000_000)], 20000, '2026-09-01');
eq([sinRitmo.satsMes, sinRitmo.proyeccion], [null, null], 'ritmo neto negativo: sin proyección');

// Etapas intermedias: 100k, 250k, 500k, 1M, 2.5M, 5M, 10M…
eq(etapasHasta(1e7), [1e5, 2.5e5, 5e5, 1e6, 2.5e6, 5e6, 1e7], 'escalera de etapas');
eq([36578, 1e5, 249_999, 2.5e5, 5e5, 9_999_999, 1e8].map(etapaSiguiente), [1e5, 2.5e5, 2.5e5, 5e5, 1e6, 1e7, 2.5e8], 'siguiente etapa');
eq([0, 36578, 1e5, 3e5, 5e5, 2.4e6, 1e8].map(etapaAnterior), [0, 0, 1e5, 2.5e5, 5e5, 1e6, 1e8], 'etapa anterior');
eq([nombreHito(2.5e5), nombreHito(5e5), nombreHito(2.5e6), nombreHito(5e7), nombreHito(2.5e8), nombreHito(1e8)], ['250k', '500k', '2.5M', '50M', '2.5 BTC', '1 BTC'], 'nombres de etapas');
eq(etapasCruzadas(90_000, 600_000), [1e5, 2.5e5, 5e5], 'etapas cruzadas al subir');
eq([etapasCruzadas(600_000, 90_000), etapasCruzadas(1e5, 1e5), etapasCruzadas(1e5, 249_999)], [[], [], []], 'sin etapas si no se sube o no se llega');
const e1 = resumen([{ id: 1, fecha: '2026-11-01', tipo: 'compra', monto: 28.68, sats: 36578, precio: 78408 }], 77598, '2026-11-04');
eq([e1.etapa, e1.etapaPrev, e1.meta], [1e5, 0, 1e5], 'primera etapa con tu caso real');
const e2 = resumen([mov(1, '2026-01-01', 'compra', 40, 300_000)], 20000, '2026-01-05');
eq([e2.etapa, e2.etapaPrev, e2.meta], [5e5, 2.5e5, 1e6], 'con 300k: la etapa es 500k y el gran hito sigue siendo 1M');
eq(e2.camino.map((c) => [c.m, c.mayor, !!c.fecha]), [[1e5, true, true], [2.5e5, false, true], [5e5, false, false], [1e6, true, false], [1e7, true, false], [1e8, true, false]], 'camino: etapas hechas, la siguiente y los hitos grandes');
eq(e2.hitos.map((h) => h.m), [1e5, 1e6, 1e7, 1e8], 'los hitos de la montaña siguen siendo potencias de 10');

// Novedades al abrir la web (solo movimientos creados después de la última visita)
const DIA = 864e5, AHORA = Date.UTC(2026, 10, 4, 12);
const nv = (id, dias, tipo = 'compra') => ({ id, fecha: '2026-11-01', tipo, monto: 25, sats: 32_000, creado: AHORA - dias * DIA });
const lote = [nv(1, 20), nv(2, 13), nv(3, 6), nv(4, 1, 'venta')];
eq(novedades([], 0, AHORA), null, 'sin movimientos no hay nada que contar');
const n1 = novedades(lote, AHORA - 7 * DIA, AHORA);
eq([n1.primera, n1.dias, n1.nuevos.map((c) => c.id), n1.compras, n1.ventas], [false, 7, [3, 4], 1, 1], 'solo lo creado después de la última visita');
eq(novedades(lote, AHORA - 0.5 * DIA, AHORA), null, 'sin nada nuevo no se muestra');
const n2 = novedades(lote, null, AHORA);
eq([n2.primera, n2.dias, n2.nuevos.map((c) => c.id)], [true, null, [2, 3, 4]], 'primera visita: los tres últimos como bienvenida');
const muchos = Array.from({ length: 8 }, (_, k) => nv(k + 1, 3));
const n3 = novedades(muchos, AHORA - 10 * DIA, AHORA);
eq([n3.nuevos.length, n3.masNuevos, n3.nuevos[0].id], [5, 3, 4], 'más de cinco: se enseñan las cinco últimas y se cuenta el resto');
eq(novedades(lote, AHORA - 0.2 * DIA, AHORA + 0.2 * DIA), null, 'hace menos de un día sin novedades: nada');
eq(novedades([nv(1, 0.1)], AHORA - 1 * DIA, AHORA).dias, 1, 'días desde la visita, redondeando hacia abajo');

// Avisos al anotar: dedo gordo y compra repetida el mismo día
const hab = [20000, 24000, 25000, 26000, 30000].map((s, i) => ({ id: i + 1, tipo: 'compra', sats: s, fecha: `2026-10-0${i + 1}` }));
eq(avisosAlAnotar(hab, { tipo: 'compra', sats: 25000, fecha: '2026-10-20' }), [], 'una compra normal no avisa');
eq(avisosAlAnotar(hab, { tipo: 'compra', sats: 250000, fecha: '2026-10-20' }), [{ tipo: 'atipico', sentido: 'mas', veces: 10, mediana: 25000 }], '10 veces más: avisa');
eq(avisosAlAnotar(hab, { tipo: 'compra', sats: 249999, fecha: '2026-10-20' }), [], 'justo por debajo de 10 veces: no avisa');
eq(avisosAlAnotar(hab, { tipo: 'compra', sats: 2500, fecha: '2026-10-20' }), [{ tipo: 'atipico', sentido: 'menos', veces: 10, mediana: 25000 }], 'una décima parte: avisa');
eq(avisosAlAnotar(hab.slice(0, 3), { tipo: 'compra', sats: 9e6, fecha: '2026-10-20' }), [], 'con menos de 4 compras no hay referencia');
eq(avisosAlAnotar(hab, { tipo: 'venta', sats: 9e6, fecha: '2026-10-20' }), [], 'las ventas no avisan');
eq(avisosAlAnotar(hab, { tipo: 'compra', sats: 25000, fecha: '2026-10-03' }), [{ tipo: 'duplicado', n: 1, sats: 25000 }], 'otra compra el mismo día: avisa');
eq(avisosAlAnotar(hab, { tipo: 'compra', sats: 250000, fecha: '2026-10-03' }).map((a) => a.tipo), ['atipico', 'duplicado'], 'pueden salir los dos');
eq(avisosAlAnotar([...hab, { id: 9, tipo: 'venta', sats: 1000, fecha: '2026-10-20' }], { tipo: 'compra', sats: 25000, fecha: '2026-10-20' }), [], 'una venta el mismo día no cuenta como compra repetida');
eq(avisosAlAnotar(hab, { tipo: 'compra', sats: 24000, fecha: '2026-10-02', editando: 2 }), [], 'editar sin cambiar nada: no avisa de duplicado');
const rara = [...hab, { id: 7, tipo: 'compra', sats: 900000, fecha: '2026-10-07' }];
eq(avisosAlAnotar(rara, { tipo: 'compra', sats: 900000, fecha: '2026-10-07', editando: 7 }), [], 'editar una compra rara sin tocar los sats: no insiste');
eq(avisosAlAnotar(rara, { tipo: 'compra', sats: 950000, fecha: '2026-10-07', editando: 7 }).map((a) => a.tipo), ['atipico'], 'si cambias los sats a otra cifra rara: avisa');
eq(avisosAlAnotar(hab, { tipo: 'compra', sats: 0, fecha: '2026-10-20' }), [], 'sin sats no hay avisos');

console.log(`OK ${n} comprobaciones`);
