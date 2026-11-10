// Pruebas de los cálculos puros del frontend. Uso: node tests/test_lib.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {
  descripcionMontana, movimientosLista, ordenarMovimientos, filtrarMovimientos, agruparPorMes, serieCostoPromedio, masMovieron, serieSatsAcum, semanasDetalle, tramosCaida, variacionAyer, satsPorDolar, serieSatsPorDolar, usdSignoCorto, numCorto,
  escalaMontana, altitud, metaSiguiente, nombreHito, textoMeses, resumen, serieGrafico, ubicar, muestrear, hoyISO, ZONA, precioDelDia, estimarMonto, mempoolUrl, extraerTxid, etapaSiguiente, etapaAnterior, etapasHasta, etapasCruzadas, novedades, avisosAlAnotar, constanciaCruzada, proximosHitosConstancia, tocaComprar, costoTrasCompra, caidaGrande, reposicion, montoHabitual, equilibrio, haceCuanto, serieValor, ticksDolares, costoVsPromedio, ubicacionSats, walletNeto,
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

// Avisos al anotar: dedo gordo (en dólares) y compra repetida el mismo día
const hab = [20, 24, 25, 26, 30].map((m, i) => ({ id: i + 1, tipo: 'compra', monto: m, sats: m * 1000, fecha: `2026-10-0${i + 1}` }));
const av = (o) => avisosAlAnotar(hab, { tipo: 'compra', fecha: '2026-10-20', ...o });
eq(av({ sats: 25000, monto: 25 }), [], 'una compra normal no avisa');
eq(av({ sats: 50000, monto: 50 }), [], '$50 con una mediana de $25 no avisa (solo 2 veces)');
eq(av({ sats: 100000, monto: 100 }), [], '$100 tampoco (4 veces)');
eq(av({ sats: 250000, monto: 250 }), [{ tipo: 'atipico', sentido: 'mas', veces: 10, mediana: 25 }], '$250: 10 veces más, avisa');
eq(av({ sats: 249000, monto: 249 }), [], 'justo por debajo de 10 veces: no avisa');
eq(av({ sats: 2500, monto: 2.5 }), [{ tipo: 'atipico', sentido: 'menos', veces: 10, mediana: 25 }], '$2.50: una décima parte, avisa');
eq(av({ sats: 3200, monto: 25 }), [], 'mismos dólares con BTC 10 veces más caro: no avisa (por eso se compara en dólares)');
eq(av({ sats: 25000 }), [], 'sin monto estimado no se evalúa lo atípico');
eq(avisosAlAnotar(hab.slice(0, 3), { tipo: 'compra', sats: 9e6, monto: 9000, fecha: '2026-10-20' }), [], 'con menos de 4 compras no hay referencia');
eq(avisosAlAnotar(hab, { tipo: 'venta', sats: 9e6, monto: 9000, fecha: '2026-10-20' }), [], 'las ventas no avisan');
eq(av({ sats: 25000, monto: 25, fecha: '2026-10-03' }), [{ tipo: 'duplicado', n: 1, sats: 25000 }], 'otra compra el mismo día: avisa');
eq(av({ sats: 250000, monto: 250, fecha: '2026-10-03' }).map((a) => a.tipo), ['atipico', 'duplicado'], 'pueden salir los dos');
eq(avisosAlAnotar([...hab, { id: 9, tipo: 'venta', monto: 10, sats: 1000, fecha: '2026-10-20' }], { tipo: 'compra', sats: 25000, monto: 25, fecha: '2026-10-20' }), [], 'una venta el mismo día no cuenta como compra repetida');
eq(avisosAlAnotar(hab, { tipo: 'compra', sats: 24000, monto: 24, fecha: '2026-10-02', editando: 2 }), [], 'editar sin cambiar nada: no avisa de duplicado');
const rara = [...hab, { id: 7, tipo: 'compra', monto: 900, sats: 900000, fecha: '2026-10-07' }];
eq(avisosAlAnotar(rara, { tipo: 'compra', sats: 900000, monto: 900, fecha: '2026-10-07', editando: 7 }), [], 'editar una compra rara sin tocar los sats: no insiste');
eq(avisosAlAnotar(rara, { tipo: 'compra', sats: 950000, monto: 950, fecha: '2026-10-07', editando: 7 }).map((a) => a.tipo), ['atipico'], 'si cambias los sats a otra cifra rara: avisa');
eq(av({ sats: 0, monto: 0 }), [], 'sin sats no hay avisos');

// Constancia: hitos por cantidad y por tiempo, y progreso hacia el siguiente
const cc = (n) => Array.from({ length: n }, (_, i) => ({ id: i + 1, tipo: 'compra', fecha: new Date(Date.UTC(2026, 0, 5 + i * 7)).toISOString().slice(0, 10) }));
const nueva = (fecha) => ({ id: 999, tipo: 'compra', fecha });
eq(constanciaCruzada(cc(9), [...cc(9), nueva('2026-03-12')]), [{ tipo: 'compras', valor: 10 }], 'la décima compra cruza el hito 10');
eq(constanciaCruzada(cc(10), [...cc(10), nueva('2026-03-19')]), [], 'la 11.ª no cruza nada');
eq(constanciaCruzada(cc(24), [...cc(24), nueva('2026-07-06')]).map((h) => h.valor), [25, 6], 'puede cruzar cantidad y tiempo a la vez (25 compras y 6 meses)');
eq(constanciaCruzada(cc(5), [...cc(5), nueva('2026-07-10')]), [{ tipo: 'tiempo', valor: 6 }], 'una compra tras un hueco largo cruza 6 meses');
eq(constanciaCruzada(cc(6), [...cc(6), nueva('2025-01-01')]).filter((h) => h.tipo === 'tiempo'), [], 'una compra atrasada que cambia la primera fecha no celebra tiempo');
eq(constanciaCruzada([], [nueva('2026-01-05')]), [], 'la primera compra no celebra nada');
eq(constanciaCruzada([...cc(9), { id: 50, tipo: 'venta', fecha: '2026-03-01' }], [...cc(9), { id: 50, tipo: 'venta', fecha: '2026-03-01' }, { id: 51, tipo: 'venta', fecha: '2026-03-02' }]), [], 'las ventas no cuentan');
const px = proximosHitosConstancia(cc(22), '2026-06-10');
eq([px.n, px.meses, px.compras, px.tiempo], [22, 5, { valor: 25, faltan: 3 }, { valor: 6, faltan: 1 }], 'faltan 3 compras para 25 y 1 mes para 6');
eq(proximosHitosConstancia(cc(1001), '2036-01-01').compras, null, 'sin más hitos de cantidad');
eq(resumen(cc(22).map((c) => ({ ...c, monto: 20, sats: 25000, precio: 80000 })), null, '2026-06-10').constancia.compras, { valor: 25, faltan: 3 }, 'resumen expone la constancia');

// «Te toca comprar» según el ritmo: semanal con compras de lunes a miércoles
const sem = (k, dia = 0) => new Date(Date.UTC(2026, 5, 1 + k * 7 + dia)).toISOString().slice(0, 10); // lunes 1 jun 2026 + semanas
const compSem = (ks) => ks.map((k, i) => ({ id: i + 1, tipo: 'compra', fecha: sem(k, 1), monto: 25, sats: 30000, precio: 83000 }));
const compSemFechas = (fs) => fs.map((f, i) => ({ id: i + 1, tipo: 'compra', fecha: f, monto: 25, sats: 30000, precio: 83000 }));
const estado = (items, hoy) => tocaComprar(resumen(items, null, hoy), hoy);
const base = compSem([0, 1, 2, 3, 4, 5]); // última compra: martes de la semana 5 (= 7 jul)
eq(estado(base, sem(5, 3))?.estado, 'hecho', 'ya compraste esta semana');
eq(estado(base, sem(6, 2))?.estado, 'toca', 'la semana siguiente toca (miércoles)');
eq(estado(base, sem(6, 2))?.racha, 6, 'toca con tu racha de 6');
eq(estado(base, sem(6, 6))?.estado, 'ultimo', 'domingo: último día');
eq(estado(base, sem(7, 1))?.estado, 'perdida', 'dos semanas sin comprar: la racha se reinició');
eq(tocaComprar(resumen(compSem([0, 1]), null, sem(2, 2)), sem(2, 2)), null, 'con menos de 3 compras no hay aviso');
const quince = compSem([0, 2, 4, 6, 8]); // quincenal
eq(estado(quince, sem(8, 3))?.estado, 'hecho', 'quincenal: compraste esta semana');
eq(estado(quince, sem(9, 2)), { estado: 'aldia', vence: 1 }, 'quincenal: la semana siguiente vas al día, vence en 1');
eq(estado(quince, sem(10, 2))?.estado, 'toca', 'quincenal: a las 2 semanas toca');
eq(estado(quince, sem(11, 2))?.estado, 'perdida', 'quincenal: a las 3 semanas se reinició');

// Compras extra por una caída del precio: no deben cambiar el ritmo ni romper la racha
const fq = (k, dia = 1) => sem(k, dia);
const qBase = [0, 2, 4, 6, 8].map((k) => fq(k));
const extras3 = [...qBase, fq(7, 0), fq(7, 3), fq(7, 5)];
const Rx = resumen(compSemFechas(extras3), null, fq(10, 2));
eq([Rx.paso, Rx.racha, tocaComprar(Rx, fq(10, 2)).estado], [2, 6, 'toca'], 'quincenal con 3 compras extra en una semana de caída: sigue quincenal y la racha viva');
const Rx1 = resumen(compSemFechas([...qBase, fq(7, 3)]), null, fq(9, 2));
eq([Rx1.paso, Rx1.racha, tocaComprar(Rx1, fq(9, 2)).estado], [2, 6, 'aldia'], 'una compra extra entre medias suma a la racha y no cambia el ritmo');
const Rs = resumen(compSemFechas([...[0, 1, 2, 3, 4, 5].map((k) => fq(k)), fq(5, 4)]), null, fq(6, 2));
eq([Rs.paso, Rs.racha], [1, 6], 'semanal con dos compras en una semana: la semana cuenta una vez');

// Efecto de una compra en el costo promedio (comprar barato lo baja)
const Rc = resumen([{ id: 1, tipo: 'compra', fecha: '2026-10-01', monto: 100, sats: 100000, precio: 100000 }], null, '2026-10-05');
const barato = costoTrasCompra(Rc, 50, 200000); // $50 por 200k sats = $25,000 el BTC
eq([Math.round(barato.antes), Math.round(barato.despues), Math.round(barato.cambio)], [100000, 50000, -50], 'comprar barato baja el costo promedio');
const caro = costoTrasCompra(Rc, 100, 50000); // $100 por 50k sats = $200,000 el BTC
ok(caro.despues > caro.antes && caro.cambio > 0, 'comprar caro lo sube');
eq(costoTrasCompra(resumen([], null, '2026-10-05'), 25, 30000), null, 'sin compras previas no hay costo anterior');
eq(costoTrasCompra(Rc, 0, 100), null, 'sin monto no se calcula');
const Rsin = resumen([{ id: 1, tipo: 'compra', fecha: '2026-10-01', monto: 100, sats: 100000, precio: 100000 }, { id: 2, tipo: 'venta', fecha: '2026-10-02', monto: 90, sats: 100000, precio: 90000 }], null, '2026-10-05');
eq(costoTrasCompra(Rsin, 25, 30000), null, 'tras vender todo, la siguiente compra parte de cero');

// Gran caída (opcional) y qué haría reponer
const dia = (k) => new Date(Date.UTC(2026, 9, 31) - k * 864e5).toISOString().slice(0, 10); // 31 oct hacia atrás
const hist = (precios) => precios.map((p, i) => [dia(precios.length - 1 - i), p]); // el último es 31 oct
const plano = hist(Array(20).fill(100000));
eq(caidaGrande(plano, 80000, '2026-10-31')?.caida, 20, 'precio 20 % bajo el máximo de 30 días: gran caída');
eq(caidaGrande(plano, 85000, '2026-10-31')?.caida, 15, 'justo 15 %: cuenta');
eq(caidaGrande(plano, 86000, '2026-10-31'), null, '14 %: no es gran caída');
eq(caidaGrande(plano, 120000, '2026-10-31'), null, 'por encima del máximo: nada');
eq(caidaGrande([[dia(40), 200000], ...plano], 90000, '2026-10-31'), null, 'un máximo de hace más de 30 días no cuenta');
eq(caidaGrande(plano.slice(0, 3), 50000, '2026-10-31'), null, 'con histórico demasiado corto no se afirma nada');
eq(caidaGrande(plano, null, '2026-10-31'), null, 'sin precio vivo: nada');
const cuatro = [20, 25, 30, 25].map((m, i) => ({ id: i + 1, tipo: 'compra', fecha: `2026-10-0${i + 1}`, monto: m, sats: Math.round((m / 100000) * 1e8), precio: 100000 }));
const Rr = resumen(cuatro, null, '2026-10-31');
const rep = reposicion(Rr, 70000); // mediana $25 al precio vivo $70,000
eq([rep.monto, rep.despues < rep.antes, Math.round(rep.antes)], [25, true, 100000], 'reponer con una compra como las tuyas baja el costo promedio si el precio cayó');
eq(reposicion(resumen(cuatro.slice(0, 2), null, '2026-10-31'), 70000), null, 'con menos de 3 compras no hay referencia');
eq(reposicion(Rr, 0), null, 'sin precio no hay reposición');

// Monto habitual, precio de equilibrio y «hace X»
eq(montoHabitual(Rr.items), 25, 'monto habitual = mediana de tus compras ($20, 25, 30, 25)');
eq(montoHabitual(Rr.items.slice(0, 2)), null, 'con menos de 3 compras no hay monto habitual');
const Re = resumen([{ id: 1, tipo: 'compra', fecha: '2026-10-01', monto: 100, sats: 100000, precio: 100000 }], null, '2026-10-05');
const qe1 = equilibrio(Re, 80000);
eq([Math.round(qe1.precio), Math.round(qe1.cambio * 10) / 10, qe1.enGanancia], [100000, 25, false], 'sin ventas el equilibrio es el costo promedio: con BTC a 80,000 hay que subir 25 %');
const qe2 = equilibrio(Re, 125000);
eq([qe2.enGanancia, Math.round(qe2.cambio)], [true, -20], 'en ganancia: BTC podría bajar 20 % hasta el equilibrio');
const Rv = resumen([{ id: 1, tipo: 'compra', fecha: '2026-10-01', monto: 100, sats: 100000, precio: 100000 }, { id: 2, tipo: 'venta', fecha: '2026-10-02', monto: 60, sats: 50000, precio: 120000 }], null, '2026-10-05');
const qe3 = equilibrio(Rv, 90000); // realizada = 60 - 50 = 10; base = (inv neto 50) - 10 = 40 por 50,000 sats → $80,000
eq(Math.round(qe3.precio), 80000, 'con ventas, lo realizado baja el equilibrio');
eq(equilibrio(resumen([{ id: 1, tipo: 'compra', fecha: '2026-10-01', monto: 100, sats: 100000, precio: 100000 }, { id: 2, tipo: 'venta', fecha: '2026-10-02', monto: 100, sats: 50000, precio: 200000 }], null, '2026-10-05'), 90000), null, 'si lo vendido ya cubre lo invertido no hay equilibrio');
eq(equilibrio(resumen([], null, '2026-10-05'), 90000), null, 'sin compras no hay equilibrio');
eq([haceCuanto(1000, 3000), haceCuanto(0, 12000), haceCuanto(0, 59000), haceCuanto(0, 60000), haceCuanto(0, 150000), haceCuanto(0, 3 * 3600e3)], ['ahora mismo', 'hace 12 s', 'hace 59 s', 'hace 1 min', 'hace 2 min', 'hace 3 h'], 'hace cuánto se actualizó el precio');

// Serie «lo que pusiste y lo que vale»
const dv = (k) => new Date(Date.UTC(2026, 9, 1 + k)).toISOString().slice(0, 10); // 1 oct + k días
const histV = Array.from({ length: 10 }, (_, k) => [dv(k), 100000 + k * 1000]); // 1 oct (100,000) a 10 oct (109,000)
const movs = [
  { id: 1, tipo: 'compra', fecha: dv(2), monto: 100, sats: 100000 },
  { id: 2, tipo: 'compra', fecha: dv(5), monto: 100, sats: 100000 },
];
const Rv2 = resumen(movs, null, dv(10));
const sv = serieValor(Rv2.items, histV, 120000, dv(10));
eq(sv[0].fecha, dv(2), 'la serie empieza el día de tu primera compra, no antes');
eq([sv[0].inv, sv[0].sats], [100, 100000], 'primer punto: invertido $100 y 100,000 sats');
eq(Math.round(sv[0].valor * 100) / 100, 102, 'valor = sats × precio del día (100,000 sats a $102,000 = $102)');
const dia5 = sv.find((x) => x.fecha === dv(5));
eq([dia5.inv, dia5.sats], [200, 200000], 'el día de la segunda compra ya cuenta (mismo día)');
eq(sv.at(-1).vivo, true, 'el último punto usa el precio vivo');
eq(Math.round(sv.at(-1).valor), 240, '200,000 sats a $120,000 vivo = $240');
eq(sv.every((x) => x.p === x.valor), true, 'cada punto lleva p = valor para decimar');
eq(serieValor([], histV, 120000, dv(10)), [], 'sin movimientos no hay serie');
const movsV = [...movs, { id: 3, tipo: 'venta', fecha: dv(7), monto: 150, sats: 100000 }];
const svv = serieValor(resumen(movsV, null, dv(10)).items, histV, 120000, dv(10));
eq([svv.find((x) => x.fecha === dv(8)).sats, Math.round(svv.find((x) => x.fecha === dv(8)).inv)], [100000, 100], 'tras vender la mitad el saldo y el invertido neto bajan a la mitad');

// Escala en dólares del gráfico de valor: marcas redondas
eq(ticksDolares(1100), [500, 1000], 'hasta $1,100: marcas en $500 y $1,000');
eq(ticksDolares(24), [10, 20], 'hasta $24: $10 y $20');
eq(ticksDolares(95), [50], 'hasta $95: solo $50 (la de $100 no cabe)');
eq(ticksDolares(3000), [1000, 2000], 'hasta $3,000: $1,000 y $2,000');
eq(ticksDolares(1.1e6), [500000, 1000000], 'hasta $1.1M: $500,000 y $1,000,000');
eq(ticksDolares(0), [], 'sin máximo no hay marcas');
ok(ticksDolares(1234).length >= 1 && ticksDolares(1234).length <= 3 && ticksDolares(1234).every((v) => v < 1234), 'nunca más de 3 marcas y siempre dentro del gráfico');

// Compra extra (por una caída): no desvía lo habitual
const rutina = [20, 25, 30, 25, 25].map((m, i) => ({ id: i + 1, tipo: 'compra', fecha: `2026-10-0${i + 1}`, monto: m, sats: m * 1000, precio: 100000 }));
const conExtra = [...rutina, { id: 9, tipo: 'compra', fecha: '2026-10-09', monto: 400, sats: 800000, precio: 50000, extra: true }];
const Rex = resumen(conExtra, null, '2026-10-12');
eq(montoHabitual(Rex.items), 25, 'la compra habitual ignora la extra de $400');
const muchasExtra = [...rutina, ...Array.from({ length: 6 }, (_, i) => ({ id: 20 + i, tipo: 'compra', fecha: `2026-10-1${i}`, monto: 400, sats: 800000, precio: 50000, extra: true }))];
eq(montoHabitual(resumen(muchasExtra, null, '2026-10-20').items), 25, 'aunque haya muchas extra, lo habitual sigue siendo $25');
eq(montoHabitual(resumen(muchasExtra.map((c) => ({ ...c, extra: false })), null, '2026-10-20').items), 400, 'sin la marca, esas compras sí desviarían lo habitual');
eq([Rex.nExtra, Rex.nHabituales, Rex.satsHabituales], [1, 5, 125000], 'se cuentan las extra y lo habitual');
eq(avisosAlAnotar(conExtra, { tipo: 'compra', sats: 25000, monto: 25, fecha: '2026-10-20' }), [], 'con una extra en el historial, una compra normal no avisa');
eq(avisosAlAnotar(conExtra, { tipo: 'compra', sats: 250000, monto: 250, fecha: '2026-10-20' }).map((a) => a.tipo), ['atipico'], 'una normal 10 veces mayor sigue avisando');
eq(avisosAlAnotar(conExtra, { tipo: 'compra', sats: 250000, monto: 250, fecha: '2026-10-20', extra: true }), [], 'si la marcas como extra, no avisa de la cifra rara');
eq(avisosAlAnotar(rutina, { tipo: 'compra', sats: 25000, monto: 25, fecha: '2026-10-03', extra: true }), [], 'una extra el mismo día de otra compra no avisa de repetida');
eq(avisosAlAnotar([...rutina, { id: 9, tipo: 'compra', fecha: '2026-10-20', monto: 400, sats: 1, extra: true }], { tipo: 'compra', sats: 25000, monto: 25, fecha: '2026-10-20' }), [], 'una compra normal el día de una extra no avisa de repetida');
// Proyección: el ritmo mensual no cuenta las extra
const ritmoSin = resumen(rutina.map((c, i) => ({ ...c, fecha: `2026-0${6 + (i % 5)}-15`, id: i + 1 })), null, '2026-10-20').satsMes;
const ritmoCon = resumen([...rutina.map((c, i) => ({ ...c, fecha: `2026-0${6 + (i % 5)}-15`, id: i + 1 })), { id: 99, tipo: 'compra', fecha: '2026-10-10', monto: 5000, sats: 9e6, precio: 50000, extra: true }], null, '2026-10-20').satsMes;
eq(ritmoCon, ritmoSin, 'una compra extra enorme no cambia el ritmo de la proyección');

// Tu costo promedio contra el precio promedio del período
const dd = (k) => new Date(Date.UTC(2026, 0, 1 + k)).toISOString().slice(0, 10); // 1 ene + k días
const histCV = Array.from({ length: 40 }, (_, k) => [dd(k), k < 20 ? 100000 : 50000]); // 20 días a 100k y 20 a 50k → promedio 75k
const comprasCV = [{ id: 1, tipo: 'compra', fecha: dd(0), monto: 100, sats: 100000 }, { id: 2, tipo: 'compra', fecha: dd(10), monto: 100, sats: 100000 }, { id: 3, tipo: 'compra', fecha: dd(25), monto: 100, sats: 200000 }];
const Rcv = resumen(comprasCV, null, dd(39)); // $300 por 400,000 sats → costo $75,000
const cv = costoVsPromedio(Rcv, histCV, null, dd(39));
eq([Math.round(cv.costo), Math.round(cv.promedio), Math.round(cv.cambio * 10) / 10, cv.dias], [75000, 75000, 0, 40], 'costo igual al promedio del período: cambio 0');
const comprasBarato = [{ id: 1, tipo: 'compra', fecha: dd(0), monto: 100, sats: 100000 }, { id: 2, tipo: 'compra', fecha: dd(10), monto: 100, sats: 100000 }, { id: 3, tipo: 'compra', fecha: dd(25), monto: 300, sats: 600000 }];
const cvB = costoVsPromedio(resumen(comprasBarato, null, dd(39)), histCV, null, dd(39)); // $500 por 800,000 sats → $62,500
ok(cvB.cambio < 0 && Math.abs(cvB.cambio - (62500 / 75000 - 1) * 100) < 1e-9, 'comprar más cuando el precio estaba bajo deja el costo por debajo del promedio');
const cvV = costoVsPromedio(Rcv, histCV, 150000, dd(39)); // el precio vivo sustituye al último cierre
ok(cvV.promedio > cv.promedio, 'el precio vivo entra en el promedio del período');
eq(costoVsPromedio(resumen(comprasCV.slice(0, 2), null, dd(39)), histCV, null, dd(39)), null, 'con menos de 3 compras no se muestra');
eq(costoVsPromedio(Rcv, histCV.slice(0, 10), null, dd(9)), null, 'con menos de 14 días de histórico no se muestra');
eq(costoVsPromedio(Rcv, [], null, dd(39)), null, 'sin histórico no se muestra');

// Dónde están tus sats: traslados entre el exchange y la wallet
const tr = (sats, sentido = 'a_wallet') => ({ sats, sentido });
eq(ubicacionSats([], 1000), { wallet: 0, exchange: 1000, pctWallet: 0, hay: false }, 'sin traslados todo se considera en el exchange');
const u1 = ubicacionSats([tr(600)], 1000);
eq([u1.wallet, u1.exchange, u1.pctWallet, u1.hay], [600, 400, 60, true], 'un traslado a la wallet');
eq(ubicacionSats([tr(600), tr(200, 'a_exchange')], 1000).wallet, 400, 'lo que vuelve al exchange baja la wallet');
eq(ubicacionSats([tr(600), tr(200)], 1000).wallet, 800, 'varios traslados suman');
const u2 = ubicacionSats([tr(1500)], 1000);
eq([u2.wallet, u2.exchange, u2.pctWallet], [1000, 0, 100], 'la wallet nunca supera el saldo (si vendiste lo que quedaba en el exchange, se recorta)');
eq(ubicacionSats([tr(100, 'a_exchange')], 1000).wallet, 0, 'la wallet nunca es negativa');
eq(ubicacionSats([tr(600)], 0).pctWallet, 0, 'con saldo cero no se divide');
eq([walletNeto([tr(5), tr(2, 'a_exchange')]), walletNeto(null)], [3, 0], 'walletNeto suma con signo y tolera null');

// El cielo según la hora (cielo.js es un script clásico: se carga en un contexto con un `document` de mentira)
{
  const estilos = {};
  const almacen = {};
  const ctx = {
    document: { documentElement: { dataset: {}, style: { setProperty: (k, v) => { estilos[k] = v; } } }, addEventListener() {}, visibilityState: 'visible' },
    localStorage: { getItem: (k) => almacen[k] ?? null }, setInterval() {}, Intl, Date, Math, Number, Object,
  };
  ctx.window = ctx;
  vm.runInNewContext(fs.readFileSync(new URL('../app/static/cielo.js', import.meta.url), 'utf8'), ctx);
  const C = ctx.window.libroCielo;
  eq(['2', '4.9', '5', '6.9', '7', '12', '16.4', '16.5', '18.9', '19', '23.9'].map((h) => C.franja(Number(h))),
    ['noche', 'noche', 'amanecer', 'amanecer', 'dia', 'dia', 'dia', 'atardecer', 'atardecer', 'noche', 'noche'], 'franjas del cielo por hora');
  // Un instante fijo: 2026-11-07 12:00 UTC = 06:00 en El Salvador
  eq(C.hora(new Date('2026-11-07T12:00:00Z')), 6, 'hora de El Salvador (UTC−6, sin horario de verano)');
  eq(C.hora(new Date('2026-11-07T05:30:00Z')), 23.5, 'la hora cruza el día hacia atrás');
  almacen['libro.hora'] = '14.5';
  eq(C.hora(), 14.5, 'libro.hora fuerza la hora (para probar)');
  delete almacen['libro.hora'];
  // Colores: en el centro de cada franja salen exactamente los de su paleta; a medio camino son una mezcla
  const hexRgb = (h) => `rgb(${[1, 3, 5].map((i) => Number.parseInt(h.slice(i, i + 2), 16)).join(' ')})`;
  eq(C.colores(2)['--c0'], hexRgb('#0a1322'), 'noche: arriba del cielo');
  eq(C.colores(6)['--c0'], hexRgb('#fbe8cc'), 'amanecer: arriba del cielo');
  eq(C.colores(12)['--c0'], hexRgb('#7fb8ea'), 'día: arriba del cielo');
  eq(C.colores(17.5)['--c0'], hexRgb('#241b4a'), 'atardecer: arriba del cielo');
  const medio = C.colores(5)['--c0'];
  ok(medio !== hexRgb('#0a1322') && medio !== hexRgb('#fbe8cc'), 'a las 5:00 el cielo es una mezcla entre noche y amanecer');
  eq([C.colores(2)['--estrellas'], C.colores(12)['--estrellas']], ['0.75', '0.00'], 'las estrellas solo de noche');
  // Tinta de los textos: clara sobre cielo oscuro, oscura sobre cielo claro
  eq([2, 6, 12, 17.5, 21].map((h) => C.tinta(h)), ['clara', 'oscura', 'oscura', 'clara', 'clara'], 'tinta del texto por franja');
  // Contraste del texto con las tres bandas de arriba (donde va el saldo), a lo largo de todo el día
  const lum = (rgb) => {
    const [r, g, b] = rgb.match(/\d+/g).slice(0, 3).map((x) => { const v = Number(x) / 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const contraste = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  // Con el cielo en reposo el contraste es siempre ≥ 4.5; solo a mitad de las dos mezclas de claro a oscuro (hacia las 5:00 y las
  // 16:30) baja unos minutos, y ahí ayuda el halo del texto. Se cuenta cuántos minutos del día pasa.
  let peorFirme = 99, bajo45 = 0, bajo3 = 0;
  for (let h = 0; h < 24; h += 0.05) {
    const col = C.colores(h), ti = C.tintas[C.tinta(h)];
    const pura = Object.values(C.paletas).some((p) => p.c.every((x, i) => col[`--c${i}`] === hexRgb(x)));
    let peor = 99;
    for (const banda of ['--c0', '--c1', '--c2']) peor = Math.min(peor, contraste(hexRgb(ti.txt), col[banda]), contraste(hexRgb(ti.txt2), col[banda]));
    if (pura) peorFirme = Math.min(peorFirme, peor);
    if (peor < 4.5) bajo45 += 0.05;
    if (peor < 3) bajo3 += 0.05;
  }
  ok(peorFirme >= 4.5, `texto legible (≥ 4.5:1) con el cielo en reposo: peor ${peorFirme.toFixed(2)}`);
  ok(bajo45 <= 0.6 && bajo3 <= 0.25, `solo unos minutos de crepúsculo bajo 4.5:1 (${(bajo45 * 60).toFixed(0)} min) y bajo 3:1 (${(bajo3 * 60).toFixed(0)} min)`);
  // Luna: fase real
  const cerca = (a, b, tol) => Math.abs(((a - b + 1.5) % 1) - 0.5) < tol;
  ok(cerca(C.faseLunar(new Date('2025-11-20T06:47:00Z')), 0, 0.03), 'luna nueva del 20 nov 2025');
  ok(cerca(C.faseLunar(new Date('2025-12-04T23:14:00Z')), 0.5, 0.03), 'luna llena del 4 dic 2025');
  ok(cerca(C.faseLunar(new Date('2025-11-28T00:00:00Z')), 0.25, 0.04), 'cuarto creciente hacia el 28 nov 2025');
  const f = C.faseLunar(new Date('2030-03-15T12:00:00Z'));
  ok(f >= 0 && f < 1, 'la fase siempre está entre 0 y 1');
  // Saludo
  eq([4, 5, 11.9, 12, 18.9, 19, 23].map((h) => C.saludo(h)),
    ['Buenas noches', 'Buenos días', 'Buenos días', 'Buenas tardes', 'Buenas tardes', 'Buenas noches', 'Buenas noches'], 'saludo según la hora');
}

// Variación desde ayer, sats por dólar y formas compactas
{
  const h = [['2026-11-03', 100000], ['2026-11-04', 101000], ['2026-11-05', 99000], ['2026-11-06', 100000]];
  const v = variacionAyer(h, 101000, '2026-11-07');
  eq([Math.round(v.pct * 1e6) / 1e6, v.cierre, v.fecha], [1, 100000, '2026-11-06'], 'variación desde el cierre de ayer');
  eq(variacionAyer(h, 101000, '2026-11-06').fecha, '2026-11-05', 'si hoy ya tiene vela, ayer es la anterior');
  eq(variacionAyer(h.slice(0, 2), 101000, '2026-11-07'), null, 'con menos de 3 cierres no se muestra');
  eq(variacionAyer(h, null, '2026-11-07'), null, 'sin precio no hay variación');
  eq(variacionAyer(h, 101000, '2026-11-03'), null, 'sin ningún cierre anterior no hay variación');
  eq(Math.round(satsPorDolar(77598)), 1289, '$77,598 por BTC son 1,289 sats por dólar');
  eq(satsPorDolar(0), null, 'sin precio no hay sats por dólar');
  const largo = Array.from({ length: 40 }, (_, i) => [new Date(Date.UTC(2026, 9, 1 + i)).toISOString().slice(0, 10), 100000 + i * 100]);
  const serie = serieSatsPorDolar(largo, 105000, 30, '2026-11-20');
  eq([serie.length, serie.at(-1).fecha, Math.round(serie.at(-1).spd)], [31, '2026-11-20', Math.round(1e8 / 105000)], '30 días más el precio vivo');
  eq(serieSatsPorDolar(largo.slice(0, 10), 105000, 30, '2026-11-20'), null, 'con menos de 14 cierres no hay serie');
  eq([usdSignoCorto(-78.77), usdSignoCorto(921.4), usdSignoCorto(1234.5), usdSignoCorto(1623456), usdSignoCorto(0)], ['−$79', '+$921', '+$1.2K', '+$1.6M', '$0'], 'dólares compactos con signo');
  eq([numCorto(1187072), numCorto(21500), numCorto(999)], ['1.2M', '21.5K', '999'], 'sats compactos');
}

// Tramos de gran caída (para las bandas del gráfico): la misma regla que la tarjeta
{
  const dia = (i) => new Date(Date.UTC(2026, 0, 1 + i)).toISOString().slice(0, 10);
  const serie = (ps) => ps.map((p, i) => ({ fecha: dia(i), p }));
  // 10 días a 100, 5 días a 80 (−20 %), luego otra vez 100
  const a = tramosCaida(serie([...Array(10).fill(100), ...Array(5).fill(80), ...Array(5).fill(100)]));
  eq(a, [{ desde: dia(10), hasta: dia(14) }], 'un tramo de gran caída entre el día 10 y el 14');
  // Exactamente −15 % cuenta; −14.9 % no
  eq(tramosCaida(serie([...Array(5).fill(100), 85, 85, 85])).length, 1, 'justo 15 % bajo el máximo ya es gran caída');
  eq(tramosCaida(serie([...Array(5).fill(100), 85.1, 85.1, 85.1])), [], '14.9 % no lo es');
  // Un solo día de caída es ruido: no se marca
  eq(tramosCaida(serie([...Array(5).fill(100), 70, 100, 100])), [], 'un tramo de un solo día se descarta');
  // El máximo se olvida a los 30 días: una bajada lenta no es gran caída
  eq(tramosCaida(serie(Array.from({ length: 120 }, (_, i) => 200 - i * 0.3))), [], 'una bajada lenta (−0.15 % por día) nunca pasa del 15 % en 30 días');
  ok(tramosCaida(serie(Array.from({ length: 120 }, (_, i) => 200 - i))).length === 1, 'pero una bajada de 1 por día (−0.5 % diario) sí supera el 15 % en 30 días');
  // Una caída que dura más de 30 días deja de serlo cuando el máximo viejo sale de la ventana
  const larga = tramosCaida(serie([...Array(5).fill(100), ...Array(60).fill(80)]));
  eq([larga.length, larga[0].desde, larga[0].hasta < dia(64)], [1, dia(5), true], 'a los 30 días el máximo viejo sale de la ventana y el tramo termina');
}

// Vistas del gráfico: costo promedio, sats acumulados y semanas
const aFechaTest = (f) => Date.parse(`${f}T00:00:00Z`);
{
  const compra = (fecha, monto, sats, extra = {}) => ({ fecha, monto, sats, ...extra });
  const R0 = resumen([
    { id: 1, fecha: '2026-01-05', monto: 100, sats: 200000, tipo: 'compra' },
    { id: 2, fecha: '2026-01-12', monto: 100, sats: 100000, tipo: 'compra' },
    { id: 3, fecha: '2026-01-19', monto: 50, sats: 100000, tipo: 'compra' },
    { id: 4, fecha: '2026-01-20', monto: 60, sats: 100000, tipo: 'venta' },
    { id: 5, fecha: '2026-02-02', monto: 30, sats: 100000, tipo: 'compra' },
  ].map((c) => ({ precio: (c.monto * 1e8) / c.sats, ...c })), 60000);
  const sc = serieCostoPromedio(R0.items);
  eq(sc.length, 4, 'un punto por compra (la venta no mueve el costo)');
  ok(Math.abs(sc[0].costo - 50000) < 1e-6 && sc[0].cambio === null, 'el primer costo es el precio de la primera compra');
  ok(Math.abs(sc[1].costo - 66666.67) < 0.01 && sc[1].cambio > 0 && sc[1].pct > 33, 'una compra más cara sube el costo promedio');
  ok(Math.abs(sc.at(-1).costo - R0.promedio) < 1e-6, 'el último costo es el de resumen (paridad con lib.resumen)');
  eq(masMovieron(sc, 2).map((p) => p.id), [2, 5], 'las compras que más lo movieron (la 2 lo subió 33 %, la 5 lo bajó 13 %)');
  const ss = serieSatsAcum(R0.items, '2026-03-01');
  eq([ss.length, ss.at(-1).hoy, ss.at(-1).sats, ss[3].delta, ss[2].sats], [6, true, R0.sats, -100000, 400000], 'sats acumulados: la venta baja la escalera y se añade un punto hoy');
  eq(serieSatsAcum(R0.items, '2026-02-02').length, 5, 'si el último movimiento es de hoy no se repite el punto');
  eq(serieSatsAcum([], '2026-03-01'), [], 'sin movimientos no hay escalera');
  // Semanas: el monto de cada semana coincide con R.ultimas52 y hay sats y fechas
  const R1 = resumen(Array.from({ length: 30 }, (_, i) => ({ id: i + 1, fecha: new Date(Date.UTC(2026, 0, 5 + i * 7)).toISOString().slice(0, 10), monto: 10 + i, sats: 20000 + i, precio: 50000, tipo: 'compra' })), 60000);
  const sd = semanasDetalle(R1.items, R1.semanaRef);
  eq([sd.length, sd.map((s) => s.monto)], [52, R1.ultimas52], 'semanasDetalle: 52 semanas con los mismos montos que R.ultimas52');
  ok(sd.every((s) => aFechaTest(s.hasta) - aFechaTest(s.desde) === 6 * 864e5 && new Date(`${s.desde}T00:00:00Z`).getUTCDay() === 1), 'cada semana va de lunes a domingo');
  eq(sd.filter((s) => s.compras.length).length, R1.semanasConCompra, 'las semanas con compras son las que cuenta resumen');
  void compra;
}

// ---- La lista de movimientos: buscar, filtrar, ordenar y agrupar por mes
{
  const items = [
    { id: 1, fecha: '2026-09-28', creado: 1, sats: 30000, monto: 20, tipo: 'compra', nota: '', txid: '' },
    { id: 2, fecha: '2026-10-05', creado: 2, sats: 40000, monto: 30, tipo: 'compra', nota: 'Quincena de octubre', txid: 'a'.repeat(64) },
    { id: 3, fecha: '2026-10-05', creado: 5, sats: 90000, monto: 70, tipo: 'compra', nota: 'por la caída', extra: 1, txid: '' },
    { id: 4, fecha: '2026-10-20', creado: 4, sats: 15000, monto: 12, tipo: 'venta', nota: 'gasté en renta', txid: '' },
    { id: 5, fecha: '2026-11-02', creado: 6, sats: 25000, monto: 19, tipo: 'compra', nota: '', txid: '' },
  ];
  const tras = [{ id: 1, fecha: '2026-10-21', creado: 7, sats: 80000, sentido: 'a_wallet', nota: 'a mi Ledger', txid: '' }];
  const m = movimientosLista(items, tras);
  eq(m.map((x) => x.clave), ['c5', 't1', 'c4', 'c3', 'c2', 'c1'], 'lista: lo más reciente primero; a igual fecha, lo último que anotaste');
  eq(ordenarMovimientos(m, 'antiguas').map((x) => x.clave), ['c1', 'c2', 'c3', 'c4', 't1', 'c5'], 'orden: más antiguas primero (a igual fecha, lo primero que anotaste)');
  eq(ordenarMovimientos(m, 'monto').map((x) => x.clave), ['c3', 'c2', 'c1', 'c5', 'c4', 't1'], 'orden: por monto en dólares, el traslado (sin monto) al final');
  eq(ordenarMovimientos(m, 'sats').map((x) => x.clave).slice(0, 3), ['c3', 't1', 'c2'], 'orden: por sats');
  const claves = (f) => filtrarMovimientos(m, f).map((x) => x.clave);
  eq(claves({ filtro: 'compra' }), ['c5', 'c3', 'c2', 'c1'], 'filtro: compras');
  eq(claves({ filtro: 'venta' }), ['c4'], 'filtro: ventas y gastos');
  eq(claves({ filtro: 'traslado' }), ['t1'], 'filtro: traslados');
  eq(claves({ filtro: 'extra' }), ['c3'], 'filtro: compras extra');
  eq(claves({ filtro: 'txid' }), ['c2'], 'filtro: con TXID');
  eq(claves({ texto: 'CAÍDA' }), ['c3'], 'búsqueda: sin acentos ni mayúsculas');
  eq(claves({ texto: 'octubre' }), ['t1', 'c4', 'c3', 'c2'], 'búsqueda: por el nombre del mes');
  eq(claves({ texto: '90,000' }), ['c3'], 'búsqueda: sats con comas');
  eq(claves({ texto: 'renta gaste' }), ['c4'], 'búsqueda: todas las palabras deben aparecer');
  eq(claves({ texto: 'gasto' }), ['c4'], 'búsqueda: «gasto» encuentra las ventas');
  eq(claves({ texto: 'ledger' }), ['t1'], 'búsqueda: la nota de un traslado');
  eq(claves({ texto: 'aaaaaaaa' }), ['c2'], 'búsqueda: por TXID');
  eq(claves({ desde: '2026-10-05', hasta: '2026-10-20' }), ['c4', 'c3', 'c2'], 'rango: inclusivo en ambos extremos');
  eq(claves({ desde: '2026-11-01' }), ['c5'], 'rango: solo desde');
  eq(claves({ hasta: '2026-09-30' }), ['c1'], 'rango: solo hasta');
  eq(claves({ filtro: 'compra', desde: '2026-10-01', hasta: '2026-10-31', texto: 'quincena' }), ['c2'], 'filtros combinados');
  eq(claves({ texto: 'zzz' }), [], 'sin coincidencias');
  const g = agruparPorMes(m);
  eq(g.map((x) => [x.etiqueta, x.resumen]), [['Noviembre 2026', '1 compra'], ['Octubre 2026', '2 compras · 1 venta · 1 traslado'], ['Septiembre 2026', '1 compra']], 'meses: etiqueta y resumen de cada uno');
  eq(agruparPorMes(ordenarMovimientos(m, 'antiguas')).map((x) => x.mes), ['2026-09', '2026-10', '2026-11'], 'meses: respetan el orden dado');
  eq(agruparPorMes([]), [], 'sin movimientos no hay meses');
}

// ---- Descripción de la montaña para lectores de pantalla
{
  const d1 = descripcionMontana(36578, 100000, [1e5, 1e6, 1e8], 1e8);
  ok(d1.includes('36,578 sats') && d1.includes('Aún no llegas al primer campamento (100k)') && d1.includes('Siguiente meta: 100k, al 36 %') && d1.includes('te faltan 63,422 sats') && d1.includes('La cumbre es 1 BTC'), `montaña: antes del primer campamento («${d1}»)`);
  const d2 = descripcionMontana(1_211_769, 2_500_000, [1e5, 1e6, 1e8], 1e8);
  ok(d2.includes('Ya pasaste 2 de 3 campamentos (el último, 1M)') && d2.includes('Siguiente meta: 2.5M, al 48 %') && d2.includes('te faltan 1,288,231 sats'), `montaña: pasó dos campamentos («${d2}»)`);
  ok(descripcionMontana(5, 100000, [1e5], 1e8).includes('al 0.0 %'), 'montaña: con muy pocos sats el porcentaje lleva decimal');
}

console.log(`OK ${n} comprobaciones`);
