// Pruebas de los cálculos puros del frontend. Uso: node tests/test_lib.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {
  descripcionMontana, movimientosLista, ordenarMovimientos, filtrarMovimientos, agruparPorMes, serieCostoPromedio, masMovieron, serieSatsAcum, semanasDetalle, tramosCaida, variacionAyer, satsPorDolar, serieSatsPorDolar, usdSignoCorto, numCorto, etiquetasUsadas, partirEtiquetas,
  escalaMontana, altitud, metaSiguiente, nombreHito, textoCampamento, historia, medallas, hayAurora, acentoDe, cruzo1Btc, iluminacionLunar, textoMeses, resumen, serieGrafico, ubicar, muestrear, hoyISO, ZONA, precioDelDia, estimarMonto, mempoolUrl, extraerTxid, etapaSiguiente, etapaAnterior, etapasHasta, etapasCruzadas, novedades, avisosAlAnotar, constanciaCruzada, proximosHitosConstancia, tocaComprar, costoTrasCompra, caidaGrande, reposicion, montoHabitual, equilibrio, haceCuanto, serieValor, ticksDolares, ticksPrecio, costoVsPromedio, ubicacionSats, walletNeto, walletNetoDe, nombreWallet,
  satsEn, haceUnAnio, eco, fraccionAnio, aniosTronco, estrellasConstelacion, piedrasTorre, textoTronco, textoConstelacion, textoTorre, textoAnio, semanasManta, textoManta, textoSemanaManta, enLetras, datosCertificado, textoCertificado, sellos, textoSello, estratosMes, textoEstratos, textoEstrato, nombreSemana, sellosSemana, selloNuevo, textoSelloSemana, textoPasaporte, partitura, PASOS_HZ, textoPartitura, textoAnioPartitura, textoNota, textoApertura, etapasFuturas, mananaISO, diario, textoDiario, piedritasPorCompra, textoPiedritas, ultimaPiedrita, cumpleHoy, textoCumple, textoCumpleFecha, muestrasSismo, medianocheSV, tarjetaFiesta, numeroBonito, efemeride, lluviaEstrellas, aniversario, enPupusas, arbolesDe,
} from '../app/static/lib.js';

let n = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); n++; };
const eq = (a, b, msg) => { assert.deepEqual(a, b, msg); n++; };

// Escala de hitos de la montaña
eq(metaSiguiente(36578), 1e5, 'meta con una compra');
eq(metaSiguiente(1e5), 1e6, 'al cruzar 100k la meta pasa a 1M');
// Cimas progresivas: la cumbre es la siguiente potencia de 10, no siempre 1 BTC.
eq([escalaMontana(36578).cima, escalaMontana(36578).campos], [1e5, [1e5]], 'con 36,578 sats la cima es 100k');
eq(escalaMontana(36578, 3).campos, [1e5], 'con 36,578 sats en móvil: solo la cima');
eq([escalaMontana(1_058_553, 3).cima, escalaMontana(1_058_553, 3).campos], [1e7, [1e5, 1e6, 1e7]], '1M: la cima es 10M y se ven los campamentos de abajo');
eq([escalaMontana(1_211_769).cima, escalaMontana(99_999_999).cima, escalaMontana(1e8).cima], [1e7, 1e8, 1e9], 'la cima sube al cruzar cada potencia de 10 (y 1 BTC no es el techo)');
ok(altitud(1_211_769, escalaMontana(1_211_769)) < 0.8 && altitud(99_999_999, escalaMontana(99_999_999)) > 0.999, 'cerca de la cima la altitud se acerca a 1');
eq(escalaMontana(16_735_348).campos, [1e5, 1e6, 1e7, 1e8], '16.7M en escritorio');
eq(escalaMontana(16_735_348, 3).campos, [1e6, 1e7, 1e8], '16.7M en móvil');
const ballena = escalaMontana(2.05e10);
eq([ballena.cima, ballena.campos], [1e11, [1e8, 1e9, 1e10, 1e11]], 'más de 200 BTC: cumbre 1,000 BTC');
eq(escalaMontana(2.05e10, 3).campos, [1e9, 1e10, 1e11], 'más de 200 BTC en móvil');
eq(nombreHito(1e11), '1,000 BTC', 'nombre de 1,000 BTC');
ok(altitud(36578, escalaMontana(36578)) > 0.4 && altitud(36578, escalaMontana(36578)) < 0.7, 'con 36,578 sats vas a media subida de la primera cima (100k)');
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

// Una compra marcada como extra NO cubre la semana: la racha, el ritmo y «te toca» miran solo las habituales
const extraEn = (fs, extras) => fs.map((f, i) => ({ id: i + 1, tipo: 'compra', fecha: f, monto: 25, sats: 30000, precio: 83000, extra: extras.includes(f) }));
const habSem = [0, 1, 2, 3, 4, 5].map((k) => sem(k, 1));
const viernes6 = sem(6, 4);
const Re1 = resumen(extraEn([...habSem, viernes6], [viernes6]), null, viernes6);
eq([Re1.racha, tocaComprar(Re1, viernes6).estado], [6, 'toca'], 'una extra esta semana no la cubre: sigue tocando y la racha no sube');
const Re2 = resumen(extraEn([...habSem, viernes6], []), null, viernes6);
eq([Re2.racha, tocaComprar(Re2, viernes6).estado], [7, 'hecho'], 'la misma compra sin marcar como extra sí cuenta (7 semanas, al día)');
const Re3 = resumen(extraEn([...habSem, sem(5, 3)], [sem(5, 3)]), null, sem(5, 4));
eq([Re3.racha, Re3.nCompras, Re3.nExtra], [6, 7, 1], 'una extra en una semana que ya tenías no cambia la racha, y sigue contando como compra');

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
eq([haceCuanto(1000, 3000), haceCuanto(0, 12000), haceCuanto(0, 59000), haceCuanto(0, 60000), haceCuanto(0, 150000), haceCuanto(0, 3 * 3600e3)], ['ahora', 'hace 12 s', 'hace 59 s', 'hace 1 min', 'hace 2 min', 'hace 3 h'], 'hace cuánto se actualizó el precio');

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
eq(ticksPrecio(60000, 100000), [60000, 80000, 100000], 'precio de 60k a 100k: marcas cada 20k');
eq(ticksPrecio(70500, 91700), [80000, 90000], 'precio de 70.5k a 91.7k: 80k y 90k');
eq(ticksPrecio(100, 100000, true), [100, 1000, 10000, 100000], 'escala log: potencias de 10 si hay demasiadas');
eq(ticksPrecio(5, 90, true), [5, 10, 20, 50], 'escala log corta: 1, 2 y 5 de cada potencia');
eq(ticksPrecio(10, 5), [], 'rango invertido: sin marcas');
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
eq(ubicacionSats([], 1000), { wallet: 0, exchange: 1000, pctWallet: 0, hay: false, partes: [] }, 'sin traslados todo se considera en el exchange');
const u1 = ubicacionSats([tr(600)], 1000);
eq([u1.wallet, u1.exchange, u1.pctWallet, u1.hay], [600, 400, 60, true], 'un traslado a la wallet');
eq(ubicacionSats([tr(600), tr(200, 'a_exchange')], 1000).wallet, 400, 'lo que vuelve al exchange baja la wallet');
eq(ubicacionSats([tr(600), tr(200)], 1000).wallet, 800, 'varios traslados suman');
const u2 = ubicacionSats([tr(1500)], 1000);
eq([u2.wallet, u2.exchange, u2.pctWallet], [1000, 0, 100], 'la wallet nunca supera el saldo (si vendiste lo que quedaba en el exchange, se recorta)');
eq(ubicacionSats([tr(100, 'a_exchange')], 1000).wallet, 0, 'la wallet nunca es negativa');
eq(ubicacionSats([tr(600)], 0).pctWallet, 0, 'con saldo cero no se divide');
eq([walletNeto([tr(5), tr(2, 'a_exchange')]), walletNeto(null)], [3, 0], 'walletNeto suma con signo y tolera null');
// Varias wallets (idea 156): cada una cuenta lo suyo, nunca negativo, y entre todas nunca más que el saldo
const trw = (sats, wallet_id = null, sentido = 'a_wallet') => ({ sats, sentido, wallet_id });
const lw = [{ id: 7, nombre: 'Ledger' }, { id: 9, nombre: 'Trezor' }];
const uw = ubicacionSats([trw(500), trw(300, 7), trw(100, 9), trw(50, 7, 'a_exchange')], 2000, lw);
eq([uw.wallet, uw.exchange, uw.pctWallet, uw.partes.map((p) => [p.id, p.nombre, p.sats])], [850, 1150, 42.5, [[0, 'Mi wallet', 500], [7, 'Ledger', 250], [9, 'Trezor', 100]]], 'cada wallet con su nombre y sus sats; la principal primero');
eq(ubicacionSats([trw(600), trw(400, 7)], 700, lw).partes.map((p) => p.sats), [600, 100], 'si el total pasa del saldo, se recorta en orden (la principal primero)');
eq(ubicacionSats([trw(100, 7, 'a_exchange'), trw(80)], 1000, lw).partes.map((p) => p.sats), [80, 0], 'una wallet en negativo cuenta cero (no resta a las demás)');
eq([walletNetoDe([trw(10), trw(4, 7), trw(1, 7, 'a_exchange')], 7), walletNetoDe([trw(10), trw(4, 7)], 0), walletNetoDe([trw(10)], null)], [3, 10, 10], 'walletNetoDe separa por wallet (0 y null son la principal)');
eq([nombreWallet(lw, 7), nombreWallet(lw, 0), nombreWallet(lw, null), nombreWallet(lw, 99), nombreWallet(null, 3)], ['Ledger', 'Mi wallet', 'Mi wallet', 'otra wallet', 'otra wallet'], 'nombreWallet: la principal, una conocida y una que ya no está');
eq(ubicacionSats([tr(600)], 1000).partes, [{ id: 0, nombre: 'Mi wallet', sats: 600 }], 'sin wallets extra, una sola parte: la principal');

// El cielo según la hora (cielo.js es un script clásico: se carga en un contexto con un `document` de mentira)
{
  const estilos = {};
  const almacen = {};
  const ctx = {
    document: { documentElement: { dataset: {}, atributos: new Set(), toggleAttribute(k, on) { if (on) this.atributos.add(k); else this.atributos.delete(k); }, style: { setProperty: (k, v) => { estilos[k] = v; } } }, addEventListener() {}, visibilityState: 'visible' },
    localStorage: { getItem: (k) => almacen[k] ?? null, setItem: (k, v) => { almacen[k] = String(v); }, removeItem: (k) => { delete almacen[k]; } }, setInterval() {}, Intl, Date, Math, Number, Object,
  };
  ctx.window = ctx;
  vm.runInNewContext(fs.readFileSync(new URL('../app/static/cielo.js', import.meta.url), 'utf8'), ctx);
  const C = ctx.window.libroCielo;
  eq(['2', '4.9', '5', '6.9', '7', '12', '16.4', '16.5', '18.9', '19', '23.9'].map((h) => C.franja(Number(h))),
    ['noche', 'noche', 'amanecer', 'amanecer', 'dia', 'dia', 'dia', 'atardecer', 'atardecer', 'noche', 'noche'], 'franjas del cielo por hora');
  // Un instante fijo: 2026-11-07 12:00 UTC = 06:00 en El Salvador
  eq(C.hora(new Date('2026-11-07T12:00:00Z')), 6, 'hora de El Salvador (UTC−6, sin horario de verano)');
  eq(C.hora(new Date('2026-11-07T05:30:00Z')), 23.5, 'la hora cruza el día hacia atrás');
  // Fiestas, época y cohetes (campamento 12): por fecha de El Salvador, con `libro.dia` para probar
  {
    const raiz = ctx.document.documentElement;
    eq(['2026-07-31', '2026-08-01', '2026-08-06', '2026-08-07', '2026-09-12', '2026-09-13', '2026-09-15', '2026-09-16', '2026-12-19', '2026-12-20', '2026-12-26', '2026-12-27'].map(C.fiesta),
      ['', 'agostinas', 'agostinas', '', '', 'patrias', 'patrias', '', '', 'navidad', 'navidad', ''], 'fiestas: agostinas, patrias y navidad');
    eq(['2026-04-30', '2026-05-01', '2026-10-31', '2026-11-01', '2027-01-15'].map(C.epoca), ['seca', 'lluviosa', 'lluviosa', 'seca', 'seca'], 'época: lluviosa de mayo a octubre');
    eq([C.cohetes('2026-12-31', 23.8), C.cohetes('2026-12-31', 23.84), C.cohetes('2027-01-01', 0.2), C.cohetes('2027-01-01', 0.5), C.cohetes('2026-12-30', 23.9), C.cohetes('2026-12-31', 12)], [false, true, true, false, false, false], 'cohetes: 23:50 del 31 a 0:30 del 1');
    eq(C.dia(new Date('2026-11-07T05:30:00Z')), '2026-11-06', 'el día cruza hacia atrás como la hora (UTC−6)');
    almacen['libro.dia'] = '2026-09-14'; almacen['libro.hora'] = '12'; C.aplicar();
    eq([raiz.dataset.fiesta, raiz.dataset.epoca, raiz.atributos.has('data-cohetes')], ['patrias', 'lluviosa', false], 'aplicar: deja la fiesta y la época en html');
    almacen['libro.dia'] = '2026-12-31'; almacen['libro.hora'] = '23.9'; C.aplicar();
    eq([raiz.dataset.fiesta, raiz.dataset.epoca, raiz.atributos.has('data-cohetes')], [undefined, 'seca', true], 'aplicar: cohetes a fin de año y sin fiesta');
    delete almacen['libro.dia']; delete almacen['libro.hora'];
  }
  // Modo madrugada (idea 20): de 22:00 a 5:00, y se apaga con `libro.madrugada` = 0
  {
    const raiz = ctx.document.documentElement;
    delete almacen['libro.hora'];
    const en = (h) => { almacen['libro.hora'] = String(h); C.aplicar(); return raiz.atributos.has('data-madrugada'); };
    eq([en(21.9), en(22), en(23.5), en(2), en(4.9), en(5), en(12)], [false, true, true, true, true, false, false], 'madrugada: de 22:00 a 5:00');
    C.fijarMadrugada(false);
    eq([en(23), C.madrugadaPref()], [false, false], 'madrugada: apagada a mano no se pone');
    C.fijarMadrugada(true);
    eq([en(23), C.madrugadaPref()], [true, true], 'madrugada: al volver a automático se pone');
    delete almacen['libro.hora'];
  }
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
  // Etiquetas (idea 56): se buscan, se filtran y se cuentan
  const conEtq = movimientosLista([
    { id: 1, fecha: '2026-09-01', creado: 1, sats: 10000, monto: 8, tipo: 'compra', nota: '', txid: '', etiquetas: ['cumpleaños', 'bono'] },
    { id: 2, fecha: '2026-09-02', creado: 2, sats: 10000, monto: 8, tipo: 'compra', nota: '', txid: '', etiquetas: ['bono'] },
    { id: 3, fecha: '2026-09-03', creado: 3, sats: 10000, monto: 8, tipo: 'venta', nota: '', txid: '' },
  ]);
  const cl = (f) => filtrarMovimientos(conEtq, f).map((x) => x.clave);
  eq(cl({ etiqueta: 'bono' }), ['c2', 'c1'], 'filtro por etiqueta');
  eq(cl({ etiqueta: 'cumpleaños' }), ['c1'], 'filtro por otra etiqueta');
  eq(cl({ etiqueta: 'nada' }), [], 'una etiqueta que nadie usa no trae nada');
  eq(cl({ texto: 'CUMPLEANOS' }), ['c1'], 'la búsqueda también encuentra las etiquetas (sin acentos ni mayúsculas)');
  eq(cl({ etiqueta: 'bono', filtro: 'venta' }), [], 'la etiqueta se combina con los otros filtros');
  eq(etiquetasUsadas([{ etiquetas: ['b', 'a'] }, { etiquetas: ['b'] }, {}]), [{ nombre: 'b', n: 2 }, { nombre: 'a', n: 1 }], 'las etiquetas usadas, de más a menos frecuentes');
  eq(partirEtiquetas(' Cumpleaños, #BONO ;  bono ,, dca  mensual '), ['cumpleaños', 'bono', 'dca mensual'], 'lo escrito se parte, en minúsculas, sin # ni repetidas');
  eq(partirEtiquetas(''), [], 'vacío: sin etiquetas');
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

// Tarjeta de una bandera (idea 72)
{
  const a = textoCampamento(1e6, 1211769, '2026-09-04');
  ok(a.alcanzado && a.titulo === 'Campamento 1M' && /^Lo alcanzaste el 4 sep/.test(a.texto), `bandera alcanzada: «${a.texto}»`);
  ok(textoCampamento(1e6, 1211769, null).texto === 'Ya lo pasaste.', 'bandera alcanzada sin fecha conocida');
  const f = textoCampamento(1e8, 1211769, null, true);
  ok(!f.alcanzado && f.titulo === 'Cumbre · 1 BTC' && f.texto === 'Te faltan 98,788,231 sats para la cumbre. Vas al 1%.', `bandera futura: «${f.texto}»`);
  ok(textoCampamento(1e7, 9999999, null).texto.endsWith('Vas al 99%.'), 'bandera futura: nunca dice 100% sin haberla alcanzado');
  // Campamento 17: a quien solo mira se le habla del libro (nunca «tú», «te» ni «tu»).
  const tuteo = /\b(t[uú]s?|te|estás|vas|pasaste|llegas|alcanzaste)\b/i;
  const al = textoCampamento(1e6, 1211769, '2026-09-04', false, true), fl = textoCampamento(1e8, 1211769, null, true, true);
  ok(al.texto === 'Se alcanzó el 4 sept 2026.' && textoCampamento(1e6, 1211769, null, false, true).texto === 'Ya quedó atrás.', `bandera para quien solo mira: «${al.texto}»`);
  ok(fl.texto === 'Faltan 98,788,231 sats para la cumbre. El libro va al 1%.' && fl.titulo === f.titulo, `cumbre para quien solo mira: «${fl.texto}»`);
  const dl = descripcionMontana(1_211_769, 2_500_000, [1e5, 1e6, 1e8], 1e8, true), dl0 = descripcionMontana(5, 100000, [1e5], 1e8, true);
  ok(dl.startsWith('El libro está a 1,211,769 sats de altitud') && dl.includes('Ya pasó 2 de 3 campamentos') && dl.includes('; faltan 1,288,231 sats.') && dl0.includes('Aún no llega al primer campamento'), `montaña para quien solo mira: «${dl.slice(0, 60)}…»`);
  ok(![al.texto, fl.texto, dl, dl0].some((t) => tuteo.test(t)) && tuteo.test(descripcionMontana(1_211_769, 2_500_000, [1e5, 1e6, 1e8], 1e8)), 'para quien solo mira no hay tuteo (y el dueño conserva el suyo)');
}

// Aurora, acento dorado, celebración de 1 BTC y lago (campamento 5, 3/3)
{
  ok(!hayAurora(11) && hayAurora(12) && hayAurora(40), 'aurora: desde una racha de 12');
  ok(acentoDe(99_999_999) === 'naranja' && acentoDe(1e8) === 'oro' && acentoDe(2.5e8) === 'oro', 'acento: dorado desde 1 BTC');
  ok(cruzo1Btc(99_990_000, 1e8) && cruzo1Btc(0, 3e8) && !cruzo1Btc(1e8, 1.1e8) && !cruzo1Btc(1.2e8, 9e7) && !cruzo1Btc(5e7, 9e7), 'celebración de 1 BTC: solo al cruzar hacia arriba');
  ok(iluminacionLunar(0) === 0 && Math.abs(iluminacionLunar(0.5) - 1) < 1e-9 && Math.abs(iluminacionLunar(0.25) - 0.5) < 1e-9 && iluminacionLunar(0.75) > 0.49, 'luna: iluminación 0 en nueva, 1 en llena, 0.5 en cuartos');
}

// «Tu historia» y medallas (campamento 6, ideas 37 y 38)
{
  // 30 semanas de compras de lunes a martes (la semana 12 se salta) para tener una racha rota y una mejor racha con fechas
  const cs = []; let id = 1;
  for (let w = 0; w < 30; w++) {
    if (w === 12) continue;
    const d = new Date(Date.UTC(2025, 0, 6 + w * 7)); // lunes
    const f = d.toISOString().slice(0, 10);
    const esExtra = w === 5 || w === 20 || w === 25;
    // La extra va ademas de la compra de la semana: una extra sola no cubre la semana (no cuenta para la racha).
    if (esExtra) cs.push({ id: id++, fecha: new Date(Date.UTC(2025, 0, 6 + w * 7 + 2)).toISOString().slice(0, 10), tipo: 'compra', monto: 20, sats: 25_000, precio: 80000, extra: true, nota: w === 5 ? 'caída' : '' });
    cs.push({ id: id++, fecha: f, tipo: 'compra', monto: 20, sats: 25_000, precio: 80000, extra: false, nota: '' });
  }
  const hoyH = '2025-08-15';
  const Rh = resumen(cs, 80000, hoyH);
  ok(Rh.mejorRacha >= 4 && Rh.mejorRachaDesde && Rh.mejorRachaHasta && Rh.mejorRachaDesde <= Rh.mejorRachaHasta, `mejor racha con fechas (${Rh.mejorRacha}: ${Rh.mejorRachaDesde} → ${Rh.mejorRachaHasta})`);
  eq(Rh.mejorRacha, 17, 'mejor racha: 17 semanas seguidas tras el salto');
  const { eventos, extrasOcultas } = historia(Rh, hoyH);
  eq(eventos[0].clase, 'primera', 'la historia empieza con la primera compra');
  eq(eventos.at(-1).clase, 'hoy', 'y acaba con hoy');
  ok(eventos.every((e, i) => i === 0 || eventos[i - 1].fecha <= e.fecha), 'los eventos van de más viejo a más nuevo');
  ok(eventos.some((e) => e.clase === 'racha') && eventos.some((e) => e.clase === 'constancia' && e.titulo === '10 compras') && eventos.some((e) => e.titulo === '6 meses comprando'), 'trae racha, 10 compras y 6 meses');
  eq(eventos.filter((e) => e.clase === 'extra').length, 3, 'las compras extra salen una por una');
  eq(extrasOcultas, 0, 'sin extras ocultas con pocas');
  eq(historia(Rh, hoyH, { maxExtras: 1 }).extrasOcultas, 2, 'con tope de extras, el resto se cuenta');
  ok(eventos.find((e) => e.clase === 'extra' && e.detalle.includes('caída')), 'la nota de la compra extra va en su detalle');
  eq(historia(resumen([], null)).eventos, [], 'sin compras no hay historia');
  const md = medallas(Rh, hoyH);
  eq(md.filter((m) => m.ganada && m.tipo === 'compras').map((m) => m.valor), [10, 25], 'medallas de compras ganadas: 10 y 25');
  eq(md.filter((m) => !m.ganada).map((m) => `${m.tipo}${m.valor}:${m.falta}`), ['compras50:' + (50 - cs.length), 'tiempo12:' + 5], 'solo la siguiente de cada tipo, con lo que falta');
  eq(md.filter((m) => m.ganada && m.tipo === 'tiempo').map((m) => [m.valor, m.fecha]), [[6, '2025-07-06']], 'medalla de 6 meses con su fecha');
  eq(medallas(resumen([], null)), [], 'sin compras no hay medallas');
  // Fin de mes: 6 meses desde el 31 de agosto es el 28 de febrero
  const fm = historia(resumen([{ id: 1, fecha: '2025-08-31', tipo: 'compra', monto: 1, sats: 1000, precio: 1e5 }], 1e5, '2026-03-05'), '2026-03-05').eventos;
  ok(fm.some((e) => e.titulo === '6 meses comprando' && e.fecha === '2026-02-28'), 'seis meses desde el 31 de agosto caen el 28 de febrero');
}

// Color y avatar por persona (campamento 6, idea 157)
{
  const { tonoPersona, inicialPersona, avatar } = await import('../app/static/iconos.js');
  const t1 = tonoPersona('Daf3r'), t2 = tonoPersona(`Daf${3}r`);
  ok(t1 === t2 && tonoPersona('Ana') >= 0 && tonoPersona('Ana') < 36, 'avatar: el tono sale del nombre y es siempre el mismo');
  ok(new Set(['Daf3r', 'Ana', 'Mamá', 'Papá', 'Luis', 'Sofía', 'Carlos', 'María'].map(tonoPersona)).size >= 5, 'avatar: nombres distintos suelen tener tonos distintos');
  ok(inicialPersona('daf3r') === 'D' && inicialPersona('  ana') === 'A' && inicialPersona('') === '?' && inicialPersona('éric') === 'É', 'avatar: la inicial va en mayúscula');
  ok(!avatar('<b>x</b>').includes('<b>x'), 'avatar: la inicial nunca se interpreta como HTML');
  // Contraste de la inicial blanca sobre hsl(tono, 52%, 28%) para los 36 tonos: mínimo 4.5:1
  const lum = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const hsl = (h, s, l) => { s /= 100; l /= 100; const k = (n) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l), f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1))); return [f(0) * 255, f(8) * 255, f(4) * 255]; };
  let peor = 99;
  for (let i = 0; i < 36; i++) peor = Math.min(peor, 1.05 / (lum(hsl(i * 10, 52, 28)) + 0.05));
  ok(peor >= 4.5, `avatar: la inicial blanca llega a 4.5:1 con los 36 tonos (peor ${peor.toFixed(2)})`);
}

// Campamento 11 · tu eco y tus números
{
  const mov = [
    { id: 1, fecha: '2025-06-01', tipo: 'compra', sats: 10000 },
    { id: 2, fecha: '2025-12-01', tipo: 'compra', sats: 20000 },
    { id: 3, fecha: '2026-03-01', tipo: 'venta', sats: 5000 },
    { id: 4, fecha: '2026-09-01', tipo: 'compra', sats: 15000 },
  ];
  eq([satsEn(mov, '2025-05-31'), satsEn(mov, '2025-06-01'), satsEn(mov, '2026-03-01'), satsEn(mov, '2026-12-31')], [0, 10000, 25000, 40000], 'satsEn: saldo al final de cada fecha, con ventas');
  eq([haceUnAnio('2026-11-14'), haceUnAnio('2028-02-29')], ['2025-11-14', '2027-02-28'], 'haceUnAnio: el 29 de febrero cae el 28');
  eq(eco(mov, 40000, '2026-11-14'), { fecha: '2025-11-14', sats: 10000, subiste: 30000 }, 'eco: dónde estabas hace un año y cuánto subiste');
  eq(eco(mov, 40000, '2026-05-01'), null, 'eco: si la primera compra es de hace menos de un año no hay eco');
  eq(eco([], 0, '2026-11-14'), null, 'eco: sin compras no hay eco');
  eq(eco(mov, 40000, '2026-06-01'), { fecha: '2025-06-01', sats: 10000, subiste: 30000 }, 'eco: el día exacto del año cuenta');
  eq([numeroBonito(1234321), numeroBonito(777777), numeroBonito(123456), numeroBonito(2100000), numeroBonito(21000000)], ['capicúa', 'repetido', 'escalera', '21', '21'], 'número bonito: capicúa, repetido, escalera y 21');
  eq([numeroBonito(121567), numeroBonito(0), numeroBonito(77), numeroBonito(999), numeroBonito(1000), numeroBonito(12321)], [null, null, null, null, null, 'capicúa'], 'número bonito: lo corriente y lo muy corto no cuentan');
  eq([efemeride('2027-01-03')?.clave, efemeride('2026-05-22')?.clave, efemeride('2026-11-14')], ['01-03', '05-22', null], 'efeméride por día del año');
  eq([lluviaEstrellas('2026-11-17'), lluviaEstrellas('2026-11-18'), lluviaEstrellas('2026-12-14')?.nombre, lluviaEstrellas('2026-08-12')?.nombre, lluviaEstrellas('2026-11-20')], [{ nombre: 'Leónidas', fuerza: 1 }, { nombre: 'Leónidas', fuerza: 0.5 }, 'Gemínidas', 'Perseidas', null], 'lluvias de estrellas reales');
  eq([aniversario(mov, '2026-06-01'), aniversario(mov, '2026-06-02'), aniversario(mov, '2025-06-01'), aniversario(mov, '2027-06-01')], [{ anios: 1 }, null, null, { anios: 2 }], 'aniversario de la primera compra');
  eq([enPupusas(921.15), enPupusas(0), enPupusas(0.5)], [1228, null, 0], 'pupusas a $0.75');
  eq([arbolesDe(99), arbolesDe(100), arbolesDe(500), arbolesDe(1000)], [[], ['ceibo'], ['ceibo', 'amate'], ['ceibo', 'amate', 'maquilishuat']], 'árboles de honor por compra');
}

// Campamento 13 · el tronco, la constelación y la torre de piedras
{
  const mov = [
    { id: 1, fecha: '2024-03-01', tipo: 'compra', sats: 10000, extra: 0 },
    { id: 2, fecha: '2024-12-31', tipo: 'compra', sats: 30000, extra: 1 },
    { id: 3, fecha: '2026-02-01', tipo: 'compra', sats: 20000, extra: 0 },
    { id: 4, fecha: '2026-06-15', tipo: 'venta', sats: 5000, extra: 0 },
    { id: 5, fecha: '2026-09-01', tipo: 'compra', sats: 40000, extra: 0 },
  ];
  eq([fraccionAnio('2026-01-01'), fraccionAnio('2026-12-31') > 0.99, fraccionAnio('2024-07-02') > 0.49 && fraccionAnio('2024-07-02') < 0.51], [0, true, true], 'fraccionAnio: día del año entre 0 y 1');
  const t = aniosTronco(mov, '2026-11-15');
  eq(t.map((y) => y.anio), [2024, 2025, 2026], 'tronco: un anillo por año, también el año sin compras');
  eq(t.map((y) => [y.comprados, y.nCompras, y.nExtras, y.nVentas, y.vendidos, y.completo]), [[40000, 2, 1, 0, 0, true], [0, 0, 0, 0, 0, true], [60000, 2, 0, 1, 5000, false]], 'tronco: sats, compras, nudos, grietas y si el año cerró');
  eq(t.map((y) => y.saldoFin), [40000, 40000, 95000], 'tronco: lo que tenías al cerrar cada año (y hoy)');
  ok(t[0].extras[0].frac > 0.99 && t[2].ventas[0].frac > 0.4 && t[2].ventas[0].frac < 0.5, 'tronco: la posición de cada nudo y de cada grieta dentro del año');
  eq(aniosTronco([], '2026-11-15'), [], 'tronco: sin compras no hay anillos');
  eq(aniosTronco([{ id: 1, fecha: '2026-11-01', tipo: 'compra', sats: 5, extra: 0 }], '2026-11-15').length, 1, 'tronco: con una compra, un anillo');
  ok(/3 anillos, uno por año, de 2024 a 2026\. El más ancho es 2026, con 60,000 sats\. Hay 1 nudo/.test(textoTronco(t)), `tronco: texto para lectores (${textoTronco(t)})`);
  ok(/^2024: 2 compras · \+40,000 sats · 1 extra · cerraste 40,000 sats$/.test(textoAnio(t[0])) && /^2026 \(en curso\): 2 compras · \+60,000 sats · 1 venta \(−5,000 sats\) · tienes 95,000 sats$/.test(textoAnio(t[2])), 'tronco: resumen de un año');

  const e = estrellasConstelacion(mov);
  eq([e.length, e.map((x) => x.anio)], [4, [2024, 2024, 2026, 2026]], 'constelación: una estrella por compra (las ventas no cuentan)');
  ok(e.every((x) => x.x >= 0 && x.x <= 1 && x.y >= 0 && x.y <= 1 && x.mag >= 0.15 && x.mag <= 1), 'constelación: todo cae dentro del círculo unidad y el brillo está acotado');
  eq(JSON.stringify(estrellasConstelacion(mov)), JSON.stringify(e), 'constelación: siempre sale igual (sin azar)');
  const muchas = Array.from({ length: 1000 }, (_, k) => ({ id: k + 1, fecha: `2025-${String(1 + (k % 12)).padStart(2, '0')}-10`, tipo: 'compra', sats: 1000 + k, extra: 0 }));
  const em = estrellasConstelacion(muchas);
  ok(em.length === 1000 && em.every((x) => x.x >= 0 && x.x <= 1 && x.y >= 0 && x.y <= 1), 'constelación: con 1,000 compras sigue dentro del círculo');
  eq(estrellasConstelacion([]), [], 'constelación: sin compras no hay estrellas');
  ok(/4 estrellas, una por compra\. La más reciente es la del/.test(textoConstelacion(e)), 'constelación: texto para lectores');

  const p = piedrasTorre(mov);
  eq([p.length, p.map((x) => x.n), p.map((x) => x.extra)], [4, [1, 1, 1, 1], [false, true, false, false]], 'torre: una piedra por compra, de la más vieja a la más nueva');
  ok(p[3].tam === 1 && p.every((x) => x.tam >= 0.35 && x.tam <= 1), 'torre: la de más sats es la más grande y ninguna es diminuta');
  const pm = piedrasTorre(muchas);
  eq([pm.length, pm.reduce((a, x) => a + x.n, 0), pm[0].n], [40, 1000, 25], 'torre: con 1,000 compras cada piedra junta 25 y no se pierde ninguna');
  ok(/Tu torre de piedras tiene 4 piedras, una por compra/.test(textoTorre(p)) && /Tu torre de piedras tiene 40 piedras, que juntan 1000 compras/.test(textoTorre(pm)), 'torre: texto para lectores');
  eq(piedrasTorre([]), [], 'torre: sin compras no hay piedras');
}

// Campamento 13B · la manta, el certificado y los sellos
{
  const L = (n) => enLetras(n);
  eq([L(0), L(1), L(15), L(21), L(30), L(31), L(99), L(100), L(101), L(121)], ['cero', 'un', 'quince', 'veintiún', 'treinta', 'treinta y un', 'noventa y nueve', 'cien', 'ciento un', 'ciento veintiún'], 'letras: hasta el ciento veintiuno, con «un» antes de la cosa contada');
  eq([L(1000), L(1001), L(1234), L(21000), L(100000), L(121567), L(999999)], ['mil', 'mil un', 'mil doscientos treinta y cuatro', 'veintiún mil', 'cien mil', 'ciento veintiún mil quinientos sesenta y siete', 'novecientos noventa y nueve mil novecientos noventa y nueve'], 'letras: los miles');
  eq([L(1000000), L(2000000), L(1211769), L(21000000), L(100000000), L(1000000000), L(2100000000000000 / 1e3)], ['un millón', 'dos millones', 'un millón doscientos once mil setecientos sesenta y nueve', 'veintiún millones', 'cien millones', 'mil millones', 'dos billones cien mil millones'], 'letras: millones, mil millones y billones');
  eq([L(16), L(22), L(23), L(26), L(40), L(500), L(700), L(900)], ['dieciséis', 'veintidós', 'veintitrés', 'veintiséis', 'cuarenta', 'quinientos', 'setecientos', 'novecientos'], 'letras: acentos y centenas');

  const mov = [
    { id: 1, fecha: '2025-12-29', tipo: 'compra', sats: 10000, extra: 0 }, // lunes de la semana que cierra 2025 y abre 2026 (su jueves es 1 ene 2026)
    { id: 2, fecha: '2026-01-07', tipo: 'compra', sats: 30000, extra: 1 },
    { id: 3, fecha: '2026-01-08', tipo: 'compra', sats: 20000, extra: 0 },
    { id: 4, fecha: '2026-03-02', tipo: 'venta', sats: 5000, extra: 0 },
    { id: 5, fecha: '2026-03-04', tipo: 'compra', sats: 5000, extra: 0 },
  ];
  const m = semanasManta(mov, '2026-03-12');
  eq(m.anios.map((a) => a.anio), [2026], 'manta: la semana del 29 dic al 4 ene cuenta en 2026 (su jueves es de 2026)');
  eq([m.celdas.length, m.semanasConCompra, m.celdas[0].desde, m.celdas.at(-1).hasta], [11, 3, '2025-12-29', '2026-03-15'], 'manta: de la semana de la primera compra a la de hoy');
  eq(m.celdas.map((c) => c.n), [1, 2, 0, 0, 0, 0, 0, 0, 0, 1, 0], 'manta: cuántas compras cayeron cada semana (la venta no cuenta)');
  eq(m.celdas.map((c) => c.tono), [3, 4, 0, 0, 0, 0, 0, 0, 0, 1, 0], 'manta: las semanas sin compras son algodón crudo (tono 0) y la de más sats la más oscura');
  ok(m.celdas.filter((c) => c.n).every((c) => c.tono >= 1 && c.tono <= 4) && m.celdas.filter((c) => c.n).some((c) => c.tono === 4), 'manta: las semanas con compra van del añil claro al oscuro');
  ok(m.celdas[1].extra && !m.celdas[0].extra, 'manta: la semana con una compra extra lo dice');
  ok(m.anios[0].semanas.some((c) => c.futura) && m.anios[0].semanas.every((c) => c.antes === (c.idx < m.celdas[0].idx)) && m.anios[0].enCurso, 'manta: las semanas que faltan del año son los flecos');
  eq(semanasManta([], '2026-03-12').celdas, [], 'manta: sin compras no hay tejido');
  const dos = semanasManta([{ id: 1, fecha: '2024-06-05', tipo: 'compra', sats: 100, extra: 0 }, { id: 2, fecha: '2026-03-04', tipo: 'compra', sats: 100, extra: 0 }], '2026-03-12');
  eq([dos.anios.map((a) => a.anio), dos.anios[1].sats, dos.anios[1].semanasConCompra, dos.anios[1].nCompras], [[2024, 2025, 2026], 0, 0, 0], 'manta: un año sin compras es una fila de algodón crudo');
  ok(dos.anios.every((a) => a.semanas.length === 52 || a.semanas.length === 53), 'manta: cada fila tiene 52 o 53 semanas');
  ok(/3 filas, una por año, de 2024 a 2026, y \d+ semanas tejidas, 2 con compra/.test(textoManta(dos)) && /^Semana del .* al .*: sin compras\.$/.test(textoSemanaManta(m.celdas[2])) && /1 compra, \+10,000 sats\.$/.test(textoSemanaManta(m.celdas[0])) && /con una compra extra\.$/.test(textoSemanaManta(m.celdas[1])), 'manta: textos para lectores');

  const R = { sats: 1234567, nCompras: 60, racha: 15, items: mov, camino: [{ m: 100000, mayor: true, fecha: '2025-12-29' }, { m: 250000, mayor: false, fecha: '2026-01-08' }, { m: 500000, mayor: false, fecha: null }] };
  const d = datosCertificado(R, 'Daf3r', '2026-11-15');
  eq([d.letras, d.nombre, d.lobulos, d.trenzas, d.nCompras, d.btc], ['Un millón doscientos treinta y cuatro mil quinientos sesenta y siete sats', 'Daf3r', 48, 12, 60, '0.01234567'], 'certificado: saldo en letras, lóbulos y trenzas acotados');
  ok(d.altitud > 0 && d.altitud < 1 && datosCertificado({ ...R, sats: 1 }, null).letras === 'Un sat' && datosCertificado({ ...R, sats: 1 }, null).nombre === null && datosCertificado({ sats: 0, nCompras: 0 }, 'A').lobulos === 3, 'certificado: altitud entre 0 y 1, «un sat» y sin nombre para quien no es dueña');
  eq(JSON.stringify(datosCertificado(R, 'Daf3r', '2026-11-15')), JSON.stringify(d), 'certificado: siempre sale igual');
  ok(/^Certificado de altitud de Daf3r\. A .* el libro tiene Un millón/.test(textoCertificado(d)) && /^Certificado de altitud del Libro DCA\./.test(textoCertificado(datosCertificado(R, null))), 'certificado: texto para lectores');
  const ss = sellos(R);
  eq(ss.map((x) => [x.m, x.nombre, x.grande, x.fecha]), [[100000, '100k', true, '2025-12-29'], [250000, '250k', false, '2026-01-08']], 'sellos: solo las etapas que ya cruzaste');
  eq([textoSello(ss[0]), sellos({}).length], ['Sello de 100k sats, cruzado el ' + textoSello(ss[0]).split('cruzado el ')[1], 0], 'sellos: su texto y sin camino no hay sellos');
}

// Campamento 13C · estratos, pasaporte de semanas y partitura
{
  const it = [
    { id: 1, fecha: '2026-01-05', tipo: 'compra', sats: 20000, precio: 100000, extra: 0 },
    { id: 2, fecha: '2026-01-07', tipo: 'compra', sats: 10000, precio: 50000, extra: 0 },
    { id: 3, fecha: '2026-03-20', tipo: 'venta', sats: 5000, precio: 80000, extra: 0 },
    { id: 4, fecha: '2026-11-10', tipo: 'compra', sats: 30000, precio: 100000, extra: 1 },
  ];
  const e = estratosMes(it, '2026-11-15');
  eq([e.length, e[0].mes, e.at(-1).mes, e.at(-1).enCurso, e[0].enCurso], [11, '2026-01', '2026-11', true, false], 'estratos: una capa por mes, de la primera compra a hoy (los meses sin compras cuentan)');
  eq([e[0].espesor, e[1].espesor, e[10].espesor, e[1].nCompras], [1, 0, 1, 0], 'estratos: el espesor es lo comprado frente al mejor mes; un mes sin compras queda en cero (capa delgada, no hueco)');
  eq([e[2].erosion, e[2].vendidos, e[2].nVentas, e[0].erosion], [1, 5000, 1, 0], 'estratos: una venta en un mes sin compras desgasta la capa por completo; sin ventas, nada');
  eq([e[10].nExtras, e[10].satsExtra, e[0].nExtras], [1, 30000, 0], 'estratos: las compras extra son las vetas de cuarzo');
  eq([e[0].saldoFin, e[2].saldoFin, e[10].saldoFin], [30000, 25000, 55000], 'estratos: el saldo al cerrar cada mes');
  eq(estratosMes([], '2026-11-15'), [], 'estratos: sin compras no hay capas');
  const una = estratosMes([{ id: 1, fecha: '2026-11-02', tipo: 'compra', sats: 100, precio: 1, extra: 0 }], '2026-11-15');
  eq([una.length, una[0].espesor, una[0].erosion], [1, 1, 0], 'estratos: con una sola compra hay una sola capa');
  const largo = estratosMes([{ id: 1, fecha: '2024-12-30', tipo: 'compra', sats: 100, precio: 1, extra: 0 }], '2026-02-01');
  eq([largo.length, largo[1].mes, largo[2].mes], [15, '2025-01', '2025-02'], 'estratos: cruza el fin de año sin saltarse meses');
  ok(/^Tus estratos tienen 11 capas, una por mes, de enero 2026 a noviembre 2026; 2 con compras\./.test(textoEstratos(e)) && textoEstratos([]) === 'Tus estratos empiezan con tu primera compra.', 'estratos: el texto general');
  ok(/^enero 2026: 2 compras, \+30,000 sats · cerraste con 30,000 sats$/.test(textoEstrato(e[0])) && /^marzo 2026: sin compras · 1 venta \(−5,000 sats\) · cerraste con 25,000 sats$/.test(textoEstrato(e[2])) && /noviembre 2026 \(en curso\): 1 compra, \+30,000 sats · 1 extra \(\+30,000 sats\) · tienes 55,000 sats$/.test(textoEstrato(e[10])), 'estratos: el texto de un mes');

  eq([nombreSemana('2026-11-09', '2026-11-15'), nombreSemana('2026-11-30', '2026-12-06'), nombreSemana('2026-12-28', '2027-01-03')], ['9 – 15 nov 2026', '30 nov – 6 dic 2026', '28 dic – 3 ene 2027'], 'pasaporte: el nombre de una semana (con su mes o dos)');
  const ss = sellosSemana(it, '2026-11-15');
  eq(ss.map((x) => [x.numero, x.desde, x.n, x.sats, x.extra, x.saldo]), [[1, '2026-01-05', 2, 30000, false, 30000], [2, '2026-11-09', 1, 30000, true, 55000]], 'pasaporte: un sello por semana con compras, con su saldo al cerrarla (las semanas sin compras no cuentan)');
  ok(ss.every((x) => x.altitud >= 0 && x.altitud <= 1) && ss[1].altitud > ss[0].altitud, 'pasaporte: la altitud va de 0 a 1 y sube con el saldo');
  eq(sellosSemana([], '2026-11-15'), [], 'pasaporte: sin compras no hay sellos');
  eq(sellosSemana([{ id: 1, fecha: '2026-03-20', tipo: 'venta', sats: 5, precio: 1 }], '2026-11-15'), [], 'pasaporte: una venta sola no es un sello');
  eq([selloNuevo(it, '2026-11-10', '2026-11-15')?.numero, selloNuevo(it, '2026-01-06', '2026-11-15'), selloNuevo(it, '2026-06-01', '2026-11-15')], [2, null, null], 'sello nuevo: solo si es la primera compra de su semana');
  eq(sellosSemana(it, '2026-11-15').at(-1).saldo, 55000, 'pasaporte: la semana en curso cierra con el saldo de hoy');
  ok(/^Sello n\.º 2: semana del 9 – 15 nov 2026, 1 compra, \+30,000 sats; al cerrar la semana tenías 55,000 sats$/.test(textoSelloSemana(ss[1])) && textoPasaporte(ss) === 'Tu pasaporte tiene 2 sellos, uno por cada semana en que compraste.' && textoPasaporte([]) === 'Tu pasaporte empieza con tu primera compra.' && /1 sello,/.test(textoPasaporte([ss[0]])), 'pasaporte: los textos');

  const p = partitura(it);
  eq([p.length, p[0].anio, p[0].notas.length, p[0].min, p[0].max], [1, 2026, 3, 50000, 100000], 'partitura: una pauta por año con una nota por compra (las ventas no suenan)');
  eq(p[0].notas.map((x) => x.paso), [12, 0, 12], 'partitura: más caro = más agudo (escala logarítmica entre el mínimo y el máximo de todo)');
  eq([p[0].notas[2].extra, p[0].notas[0].i, p[0].notas[2].i], [true, 0, 2], 'partitura: la nota lleva si fue extra y su índice');
  ok(p[0].notas[0].frac < p[0].notas[2].frac && p[0].notas.every((x) => x.frac >= 0 && x.frac <= 1), 'partitura: el lugar en el año va de 0 a 1 y crece con la fecha');
  eq(partitura([{ id: 1, fecha: '2026-01-05', tipo: 'compra', sats: 1, precio: 70000 }, { id: 2, fecha: '2026-02-05', tipo: 'compra', sats: 1, precio: 70000 }])[0].notas.map((x) => x.paso), [6, 6], 'partitura: con precios iguales las notas van a la mitad');
  const dosAnios = partitura([{ id: 1, fecha: '2025-06-01', tipo: 'compra', sats: 1, precio: 100 }, { id: 2, fecha: '2026-06-01', tipo: 'compra', sats: 1, precio: 10000 }]);
  eq([dosAnios.map((a) => a.anio), dosAnios[0].notas[0].paso, dosAnios[1].notas[0].paso], [[2025, 2026], 0, 12], 'partitura: la misma escala para todos los años, para compararlos');
  eq(partitura([]), [], 'partitura: sin compras no hay pautas');
  ok(partitura(it).every((a) => a.notas.every((x) => x.paso >= 0 && x.paso <= 12 && Number.isInteger(x.paso))) && PASOS_HZ.length === 13 && PASOS_HZ.every((h, i) => i === 0 || h > PASOS_HZ[i - 1]), 'partitura: trece pasos, de 0 a 12, y sus notas suben');
  eq(JSON.stringify(partitura(it)), JSON.stringify(partitura(it)), 'partitura: siempre sale igual');
  ok(/^Tu partitura tiene 1 pauta, una por año, y una nota por compra/.test(textoPartitura(p)) && textoPartitura([]) === 'Tu partitura empieza con tu primera compra.' && /^2026: 3 notas; BTC entre \$50,000 y \$100,000/.test(textoAnioPartitura(p[0])) && /\+30,000 sats · compra extra$/.test(textoNota(p[0].notas[2])), 'partitura: los textos');
}

// Campamento 15A · el Diario del Libro y las cartas selladas
{
  const it = [
    { id: 1, fecha: '2025-10-01', tipo: 'compra', sats: 20000, precio: 100000, monto: 20, extra: 0 },
    { id: 2, fecha: '2026-03-02', tipo: 'compra', sats: 30000, precio: 100000, monto: 30, extra: 0 },
    { id: 3, fecha: '2026-11-12', tipo: 'compra', sats: 40000, precio: 100000, monto: 40, extra: 0 },
  ];
  const R = resumen(it, 90000);
  const d = diario(R, '2026-11-15');
  ok(d && d.edicion === '15 nov 2026' && d.numero > 1 && d.altitud > 0 && d.altitud < 1, 'diario: edición, número y altitud');
  ok(/^Un paso más: la montaña subió 40,000 sats$/.test(d.titular) && /Una compra en los últimos siete días/.test(d.sub), 'diario: el titular cuenta lo de la semana');
  eq(d.clasificados.length, 3, 'diario: tres clasificados');
  ok(d.clasificados.some((c) => /^SE BUSCAN 10,000 sats para llegar a 100k sats\. Sin prisa/.test(c)), 'diario: un clasificado dice cuánto falta, sin presión («sin prisa»)');
  ok(!/compra ahora|conviene|recomend|precio/i.test(`${d.pronostico} ${d.clasificados.join(' ')} ${d.titular}`), 'diario: no recomienda ni habla del precio');
  ok(/Es el clima, no un consejo/.test(d.pronostico), 'diario: el pronóstico es del clima de la montaña');
  eq(JSON.stringify(diario(R, '2026-11-15')), JSON.stringify(d), 'diario: el mismo día sale igual');
  const tranquila = diario(R, '2026-12-20');
  ok(/^Semana tranquila en la montaña$/.test(tranquila.titular) && /Nadie se apura/.test(tranquila.sub), 'diario: sin compras en la semana, una semana tranquila (sin reproche)');
  ok(d.haceUnAnio && /^Hace un año el libro tenía 20,000 sats\. Hoy tiene 90,000: 70,000 más\.$/.test(d.haceUnAnio.texto), `diario: «hace un año» (${d.haceUnAnio?.texto})`);
  eq(diario(resumen(it.slice(2), 90000), '2026-11-15').haceUnAnio, null, 'diario: sin un año de historia no hay «hace un año»');
  eq(diario(resumen([], null), '2026-11-15'), null, 'diario: sin compras no hay portada');
  const grande = resumen([{ id: 1, fecha: '2026-11-14', tipo: 'compra', sats: 120000, precio: 100000, monto: 120, extra: 0 }], 90000);
  ok(/^Llegamos a 100k sats$/.test(diario(grande, '2026-11-15').titular), 'diario: una etapa reciente es el titular');
  ok(/^El Diario del Libro, edición del 15 nov 2026\. Un paso más/.test(textoDiario(d)), 'diario: el texto para lectores');
  eq([etapasFuturas(50000, 3), etapasFuturas(100000, 2), mananaISO('2026-12-31'), mananaISO('2026-02-28')], [[100000, 250000, 500000], [250000, 500000], '2027-01-01', '2026-03-01'], 'cartas: las etapas de arriba y la fecha de mañana');
}

// Campamento 15B · piedritas, cumpleaños y la tele
{
  const pie = [{ compra_id: 1, quien: 'Mamá', creado: 100 }, { compra_id: 1, quien: 'Papá', creado: 120 }, { compra_id: 2, quien: 'Mamá', creado: 200 }, { compra_id: 1, quien: 'Ana', creado: 300 }, { compra_id: 9, quien: 'Luz', creado: 400 }];
  const g = piedritasPorCompra(pie);
  eq([g.get(1).map((x) => x.quien), g.get(2).length, g.get(3)], [['Mamá', 'Papá', 'Ana'], 1, undefined], 'piedritas: agrupadas por compra, en orden');
  eq([textoPiedritas(g.get(2)), textoPiedritas(g.get(1).slice(0, 2)), textoPiedritas(g.get(1)), textoPiedritas([])], ['Mamá dejó una piedrita', 'Mamá y Papá dejaron una piedrita', 'Mamá, Papá y 1 más dejaron una piedrita', ''], 'piedritas: el texto según cuántas');
  const compras = [{ id: 1, fecha: '2026-11-01', tipo: 'compra' }, { id: 2, fecha: '2026-11-08', tipo: 'compra' }, { id: 9, fecha: '2026-11-09', tipo: 'venta' }];
  eq(ultimaPiedrita(pie, compras), { quien: 'Ana', fecha: '2026-11-01', creado: 300 }, 'piedritas: la última sobre una compra vigente (una venta no cuenta)');
  eq(ultimaPiedrita([], compras), null, 'piedritas: sin piedritas no hay última');
  const cum = [{ nombre: 'Ana', cumple: '03-14' }, { nombre: 'ñandú', cumple: '03-14' }, { nombre: 'Luz', cumple: '02-29' }];
  eq([cumpleHoy(cum, '2026-03-14').map((x) => x.inicial), cumpleHoy(cum, '2026-03-15'), cumpleHoy(cum, '2024-02-29').map((x) => x.nombre), cumpleHoy(cum, '2026-02-28').map((x) => x.nombre), cumpleHoy(cum, '2026-03-01')], [['A', 'Ñ'], [], ['Luz'], ['Luz'], []], 'cumpleaños: quién cumple hoy (el 29 de febrero, el 28 en años sin 29), con su inicial');
  eq([textoCumple('Ana'), textoCumpleFecha('03-14'), textoCumpleFecha(null)], ['Feliz cumpleaños, Ana', '14 mar', ''], 'cumpleaños: los textos');
  const t0 = Date.UTC(2026, 10, 15, 18, 0);
  const mu = [{ t: t0 - 7 * 3600e3, p: 70000 }, { t: t0 - 3 * 3600e3, p: 71000 }, { t: t0 - 3600e3, p: 69000 }, { t: t0, p: 70000 }];
  const sis = muestrasSismo(mu, t0);
  eq([sis.puntos.length, sis.min, sis.max, sis.ultima, sis.puntos.at(-1).x, sis.puntos[0].y], [3, 69000, 71000, 70000, 1, 1], 'sismógrafo: solo la ventana de 6 horas, escalada al mínimo y máximo de la tira');
  eq(muestrasSismo([], t0).puntos, [], 'sismógrafo: sin muestras no hay tira');
  eq(muestrasSismo([{ t: t0, p: 5 }], t0).puntos[0].y, 0.5, 'sismógrafo: con un solo precio la aguja va a la mitad');
  const largo = Array.from({ length: 1000 }, (_, i) => ({ t: t0 - 3600e3 + i * 3.6e3, p: 70000 + (i % 50) }));
  ok(muestrasSismo(largo, t0, { max: 100 }).puntos.length <= 101, 'sismógrafo: nunca más puntos de los que se piden');
  eq(muestrasSismo(mu, t0, { desdeMs: t0 - 2 * 3600e3 }).puntos.length, 2, 'sismógrafo: a medianoche la tira se arranca (solo cuenta desde ahí)');
  eq([new Date(medianocheSV(Date.UTC(2026, 10, 15, 3, 0))).toISOString(), new Date(medianocheSV(Date.UTC(2026, 10, 15, 5, 59))).toISOString(), new Date(medianocheSV(Date.UTC(2026, 10, 15, 6, 0))).toISOString()], ['2026-11-14T06:00:00.000Z', '2026-11-14T06:00:00.000Z', '2026-11-15T06:00:00.000Z'], 'sismógrafo: la medianoche de El Salvador');
  eq(tarjetaFiesta(90000, 95000, 5000), { titulo: 'Compra nueva', texto: '+5,000 sats', sub: 'La montaña sube un paso más', grande: false }, 'tele: una compra normal');
  eq(tarjetaFiesta(90000, 120000, 30000), { titulo: 'Nueva etapa', texto: '100k sats', sub: '+30,000 sats', grande: false }, 'tele: una etapa');
  eq(tarjetaFiesta(900000, 1100000, 200000).titulo, 'Nuevo hito', 'tele: un hito grande');
}
console.log(`OK ${n} comprobaciones`);
