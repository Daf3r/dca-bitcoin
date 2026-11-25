// Pruebas de los cálculos puros del frontend. Uso: node tests/test_lib.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {
  descripcionMontana, movimientosLista, ordenarMovimientos, filtrarMovimientos, agruparPorMes, serieCostoPromedio, masMovieron, serieSatsAcum, semanasDetalle, tramosCaida, variacionAyer, satsPorDolar, serieSatsPorDolar, usdSignoCorto, numCorto, etiquetasUsadas, partirEtiquetas,
  escalaMontana, altitud, metaSiguiente, nombreHito, textoCampamento, historia, medallas, hayAurora, acentoDe, cruzo1Btc, iluminacionLunar, textoMeses, resumen, serieGrafico, ubicar, muestrear, hoyISO, ZONA, precioDelDia, estimarMonto, mempoolUrl, extraerTxid, etapaSiguiente, etapaAnterior, etapasHasta, etapasCruzadas, novedades, avisosAlAnotar, constanciaCruzada, proximosHitosConstancia, tocaComprar, costoTrasCompra, caidaGrande, reposicion, montoHabitual, equilibrio, haceCuanto, serieValor, ticksDolares, ticksPrecio, costoVsPromedio, ubicacionSats, walletNeto, walletNetoDe, nombreWallet,
  satsEn, haceUnAnio, eco, fraccionAnio, aniosTronco, estrellasConstelacion, piedrasTorre, textoTronco, textoConstelacion, textoTorre, textoAnio, semanasManta, textoManta, textoSemanaManta, enLetras, datosCertificado, textoCertificado, sellos, textoSello, estratosMes, textoEstratos, textoEstrato, nombreSemana, sellosSemana, selloNuevo, textoSelloSemana, textoPasaporte, partitura, PASOS_HZ, textoPartitura, textoAnioPartitura, textoNota, etapasFuturas, mananaISO, diario, textoDiario, piedritasPorCompra, textoPiedritas, ultimaPiedrita, cumpleHoy, textoCumple, textoCumpleFecha, muestrasSismo, medianocheSV, tarjetaFiesta, numeroBonito, efemeride, lluviaEstrellas, aniversario, enPupusas, arbolesDe,
} from '../app/static/lib.js';
import { comprobante, diaDe, fechaEscrita, notaDeHaceUnAnio, sumarDias } from '../app/static/lib.js';
import { caminoParaLeer, etapaCelebrada, etapaConSelloAnterior, etapaDestacada, marcasDeEtapa, rangoEtapa, tramoEtapas } from '../app/static/lib.js';
import { AVISO_DIARIO, accionFirmas, diarioParaOir, fechaHablada, firmasDe, paraOir, textoFirmantes } from '../app/static/lib.js';
import { certificado, lacre } from '../app/static/arte-sellos.js';

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

// El precio de la compra (escrito por la persona): los dólares van sin redondear a centavos para que el precio que deriva el servidor
// al guardar (monto × 10⁸ / sats, con el monto a 8 decimales) sea el que se escribió. A centavos, $62,500 se vería $62,506.
{
  const P = await import('../app/static/lib.js');
  const fmt0 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  const fmt2 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
  const servidor = (monto, sats) => (Math.round(monto * 1e8) / 1e8) * 1e8 / sats; // round(monto, 8) y precio = monto × 10⁸ / sats
  eq(P.montoDePrecio(77_320, 62_500), 48.325, 'precio: 77,320 sats a $62,500 son $48.325, sin redondear');
  eq(fmt2.format(P.montoDePrecio(77_320, 62_500)), '$48.33', 'precio: y se ven $48.33');
  eq(fmt0.format(servidor(P.montoDePrecio(77_320, 62_500), 77_320)), '$62,500', 'precio: el servidor deriva $62,500 (no $62,499 ni $62,506)');
  eq(fmt0.format(servidor(P.estimarMonto(77_320, 62_500), 77_320)), '$62,506', 'precio: redondeado a centavos se apartaría $6 (por eso no se redondea)');
  // Muchos pares, incluidos sats pequeños, precios altos y productos que no son enteros: el precio derivado se aparta como mucho 1/sats
  // dólares y, con un precio entero y 2 o más sats, se ve igual al escrito.
  let peor = 0, distintos = 0;
  for (const sats of [1, 2, 3, 7, 99, 1_000, 12_345, 77_320, 333_333, 1_000_000, 123_456_789, 2_100_000_000_000]) {
    for (const precio of [0.01, 1, 63_123.45, 62_500, 77_598, 99_999.99, 1_000_000, 987_654_321.98]) {
      const monto = P.montoDePrecio(sats, precio);
      if (!(monto > 0) || monto >= P.TOPE_DINERO) continue;
      const deriv = servidor(monto, sats);
      peor = Math.max(peor, Math.abs(deriv - precio) * sats);
      if (sats >= 2 && Number.isInteger(precio) && fmt0.format(deriv) !== fmt0.format(precio)) distintos++;
    }
  }
  ok(peor <= 0.5 + 1e-6, `precio: el derivado se aparta como mucho medio dólar por sat de lo escrito (peor ${peor.toFixed(3)}/sats)`);
  eq(distintos, 0, 'precio: con un precio entero (y 2 sats o más) el comprobante lo enseña igual');
  ok(P.precioDeMonto(48.325, 77_320) === 62_500 && P.precioDeMonto(25, 0) === 0, 'precio: el precio de unos dólares y unos sats (sin sats, 0)');
  // Lo que escribe la persona: «$», comas de miles y espacios fuera; la coma decimal de un teclado en otro idioma se entiende.
  const leer = (t) => P.leerPrecio(t);
  eq(['$62,500', '62500', '62 500', ' 62,500.50 ', '62500,5', '1,234,567', '.5', '62,500.', '$ 77,598.12'].map(leer), [62500, 62500, 62500, 62500.5, 62500.5, 1234567, 0.5, 62500, 77598.12], 'precio: se limpia como el dinero');
  eq(['', '   ', '$', null, undefined].map(leer), [0, 0, 0, 0, 0], 'precio: vacío es 0 (como si no se hubiera escrito)');
  ok(['abc', '0', '0.00', '62.500', '1.2.3', '-5', '1234567890', '62500.505', '6e4'].map(leer).every(Number.isNaN), 'precio: lo que no se entiende (letras, cero, tres decimales, más de 9 cifras) no vale');
  eq(['62', '62,', '62,5', '62,50', '62,500'].map(leer), [62, 62, 62.5, 62.5, 62500], 'precio: escribiendo «62,500» cifra por cifra acaba en 62,500');
  eq([P.precioCampo(62_500), P.precioCampo(62_506.465), P.precioCampo(62_500.5), P.precioCampo(1_234_567), P.precioCampo(62_499.999_999_9)], ['62,500', '62,506.47', '62,500.50', '1,234,567', '62,500'], 'precio: en su campo con comas de miles y sin «.00»');
  eq([P.montoCampo(48.325), P.montoCampo(1234.5), P.montoCampo(0.000625), P.montoCampo(25)], ['48.33', '1234.50', '0.00', '25.00'], 'precio: los dólares calculados en su campo, a dos decimales y sin comas');
  eq(P.leerPrecio(P.precioCampo(62_506.465)), 62_506.47, 'precio: lo que se pinta en el campo se vuelve a leer igual');
  // El aviso de cifra rara y el costo promedio usan los dólares que salen del precio escrito.
  const habP = [20, 24, 25, 26, 30].map((m, i) => ({ id: i + 1, tipo: 'compra', monto: m, sats: m * 1000, fecha: `2026-10-0${i + 1}` }));
  eq(P.avisosAlAnotar(habP, { tipo: 'compra', sats: 25_000, monto: P.montoDePrecio(25_000, 100_000), fecha: '2026-10-20' }), [], 'precio: un precio normal no avisa');
  eq(P.avisosAlAnotar(habP, { tipo: 'compra', sats: 25_000, monto: P.montoDePrecio(25_000, 1_000_000), fecha: '2026-10-20' }).map((a) => a.tipo), ['atipico'], 'precio: un cero de más en el precio avisa como cifra rara');
  eq(P.avisosAlAnotar(habP, { tipo: 'compra', sats: 25_000, monto: 2.5, fecha: '2026-10-02', editando: 2 }).map((a) => a.tipo), ['atipico'], 'precio: editar solo el precio (los sats igual) a una cifra rara también avisa');
  eq(P.avisosAlAnotar(habP, { tipo: 'compra', sats: 24_000, monto: 24.004, fecha: '2026-10-02', editando: 2 }), [], 'precio: editar sin cambiar los dólares (a menos de medio centavo) no avisa');
  const antesR = { sats: 100_000, inv: 80 };
  const costo = P.costoTrasCompra(antesR, P.montoDePrecio(50_000, 62_500), 50_000);
  ok(Math.abs(costo.despues - ((80 + 31.25) * 1e8) / 150_000) < 1e-9, 'precio: el costo promedio se mueve con los dólares del precio escrito');
  // El buscador de la lista encuentra los dólares como se ven: 48.325 se ve $48.33 (con toFixed habría sido «48.32»).
  const listaP = P.movimientosLista([{ id: 1, fecha: '2026-11-10', tipo: 'compra', sats: 77_320, monto: 48.325 }, { id: 2, fecha: '2026-11-11', tipo: 'compra', sats: 30_000, monto: 25 }]);
  eq([P.filtrarMovimientos(listaP, { texto: '48.33' }).map((m) => m.id), P.filtrarMovimientos(listaP, { texto: '$25.00' }).map((m) => m.id)], [[1], [2]], 'precio: el buscador encuentra los dólares como se ven');
}

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

// Etapas (campamento 21, «etapas más cercanas»): 100k, cada 250k hasta 2.5M, cada 500k hasta 5M, cada 1M hasta 10M, y así ×10.
const ESC_1M = [1e5, 2.5e5, 5e5, 7.5e5, 1e6, 1.25e6, 1.5e6, 1.75e6, 2e6, 2.25e6, 2.5e6, 3e6, 3.5e6, 4e6, 4.5e6, 5e6, 6e6, 7e6, 8e6, 9e6, 1e7];
eq(etapasHasta(1e7), ESC_1M, 'escalera de etapas hasta 10M');
eq(etapasHasta(1e8).filter((m) => m > 1e7), [1.25e7, 1.5e7, 1.75e7, 2e7, 2.25e7, 2.5e7, 3e7, 3.5e7, 4e7, 4.5e7, 5e7, 6e7, 7e7, 8e7, 9e7, 1e8], 'la década de 10M repite la de 1M ×10');
eq([etapasHasta(1e8).length, etapasHasta(1e9).length], [37, 53], 'de 100k a 1 BTC hay 37 etapas; a 10 BTC, 53');
ok(etapasHasta(1e12).every((m, i, a) => Number.isInteger(m) && (i === 0 || m > a[i - 1])), 'la escalera es de enteros y siempre sube');
ok(etapasHasta(1e12).filter((m) => m >= 1e6).every((m, i, a) => i === 0 || (m / a[i - 1] - 1 >= 0.11 && m / a[i - 1] - 1 <= 0.25 + 1e-9)), 'desde 1M cada etapa es entre un 11 % y un 25 % más alta que la anterior');
eq([36578, 1e5, 249_999, 2.5e5, 5e5, 7.5e5, 1.2e6, 1.25e6, 2.4e6, 9_999_999, 1e8].map(etapaSiguiente), [1e5, 2.5e5, 2.5e5, 5e5, 7.5e5, 1e6, 1.25e6, 1.5e6, 2.5e6, 1e7, 1.25e8], 'siguiente etapa');
eq([0, 36578, 1e5, 3e5, 5e5, 8e5, 1.2e6, 2.4e6, 2.5e6, 9.9e6, 1e8].map(etapaAnterior), [0, 0, 1e5, 2.5e5, 5e5, 7.5e5, 1e6, 2.25e6, 2.5e6, 9e6, 1e8], 'etapa anterior');
eq([2.5e5, 5e5, 7.5e5, 1.25e6, 1.75e6, 2.25e6, 2.5e6, 5e7, 1.25e7, 1.75e7, 2.25e7, 2.5e8, 1.25e8, 2.25e8, 1e8].map(nombreHito),
  ['250k', '500k', '750k', '1.25M', '1.75M', '2.25M', '2.5M', '50M', '12.5M', '17.5M', '22.5M', '2.5 BTC', '1.25 BTC', '2.25 BTC', '1 BTC'], 'nombres de etapas (con cuartos)');
eq(etapasCruzadas(90_000, 600_000), [1e5, 2.5e5, 5e5], 'etapas cruzadas al subir');
eq(etapasCruzadas(1.2e6, 2.6e6), [1.25e6, 1.5e6, 1.75e6, 2e6, 2.25e6, 2.5e6], 'una subida grande cruza varias intermedias');
eq([etapasCruzadas(600_000, 90_000), etapasCruzadas(1e5, 1e5), etapasCruzadas(1e5, 249_999), etapasCruzadas(1.25e6 - 1, 1.25e6)], [[], [], [], [1.25e6]], 'sin etapas si no se sube o no se llega; justo en la etapa sí');
eq([1e5, 2.5e5, 5e5, 7.5e5, 1e6, 1.25e6, 2e6, 2.5e6, 3e6, 5e6, 6e6, 1e7, 2.5e7, 1e8, 2.25e8, 5e8].map(rangoEtapa),
  ['campamento', 'principal', 'principal', 'intermedia', 'campamento', 'intermedia', 'intermedia', 'principal', 'intermedia', 'principal', 'intermedia', 'campamento', 'principal', 'campamento', 'intermedia', 'principal'], 'rango de cada etapa');
eq([etapaDestacada([2.5e6, 3e6]), etapaDestacada([7.5e5, 1e6, 1.25e6]), etapaDestacada([1.25e6, 1.5e6]), etapaDestacada([]), etapaDestacada([2.5e5, 5e5])], [2.5e6, 1e6, 1.5e6, undefined, 5e5], 'la destacada: más rango y, a igual rango, la más alta');
eq([etapaCelebrada(2.4e6, 3.1e6), etapaCelebrada(1.2e6, 1.3e6), etapaCelebrada(1.3e6, 1.4e6), etapaCelebrada(9.9e6, 1.26e7)], [2.5e6, 1.25e6, undefined, 1e7], 'la que se celebra al subir');
{
  // La escalerita de «Próxima etapa»: el tramo entre la última etapa con sello y la siguiente.
  eq(tramoEtapas(1_300_000), { desde: 1e6, hasta: 2.5e6, pasos: [1.25e6, 1.5e6, 1.75e6, 2e6, 2.25e6, 2.5e6], hechas: 1 }, 'tramo: de 1M a 2.5M en seis etapas, una ya hecha');
  eq([tramoEtapas(0).pasos, tramoEtapas(600_000).pasos, tramoEtapas(2.5e6).pasos, tramoEtapas(5.5e6).hasta], [[1e5], [7.5e5, 1e6], [3e6, 3.5e6, 4e6, 4.5e6, 5e6], 1e7], 'tramo: al empezar, bajo 1M y en los demás tramos');
  // Marcas en el sendero: una cada ~19 px a lo largo de una recta vertical (como en una vuelta del zigzag).
  const marcas = etapasHasta(1e7).filter((m) => m > 1e5 && m < 1e7 && m !== 1e6).map((m, i) => ({ m, p: { x: 100, y: 600 - i * 19 } }));
  const elegidas = marcasDeEtapa(marcas, { sats: 1_300_000, campos: [{ p: { x: 100, y: 600 - 3.5 * 19 } }], tope: 20 });
  const dmin = Math.min(...elegidas.flatMap((a, i) => elegidas.slice(i + 1).map((b) => Math.hypot(a.p.x - b.p.x, a.p.y - b.p.y))));
  ok(elegidas.some((e) => e.m === 1.5e6) && dmin >= 18, `marcas: la siguiente siempre y ninguna pegada a otra (${dmin.toFixed(1)} px)`);
  ok(!elegidas.some((e) => e.m === 7.5e5), 'marcas: las intermedias de abajo (antes del último campamento) no se dibujan');
  ok(elegidas.every((e) => e.m === 1.5e6 || Math.abs(e.p.y - (600 - 3.5 * 19)) >= 22), 'marcas: ninguna pegada a un campamento (salvo la siguiente, que siempre va)');
  eq(marcasDeEtapa(marcas, { sats: 1_300_000, tope: 3 }).length, 3, 'marcas: nunca más del tope');
  const juntas = [{ m: 1.75e6, p: { x: 50, y: 50 } }, { m: 1.5e6, p: { x: 52, y: 52 } }];
  eq(marcasDeEtapa(juntas, { sats: 1_300_000 }).map((e) => e.m), [1.5e6], 'marcas: si dos quedan pegadas (en la vuelta), gana la siguiente etapa');
}
eq([etapaConSelloAnterior(0), etapaConSelloAnterior(8e5), etapaConSelloAnterior(2.4e6), etapaConSelloAnterior(3.2e6), etapaConSelloAnterior(1.2e7)], [0, 5e5, 1e6, 2.5e6, 1e7], 'la última etapa con sello (principal o campamento)');
const e1 = resumen([{ id: 1, fecha: '2026-11-01', tipo: 'compra', monto: 28.68, sats: 36578, precio: 78408 }], 77598, '2026-11-04');
eq([e1.etapa, e1.etapaPrev, e1.meta], [1e5, 0, 1e5], 'primera etapa con tu caso real');
const e2 = resumen([mov(1, '2026-01-01', 'compra', 40, 300_000)], 20000, '2026-01-05');
eq([e2.etapa, e2.etapaPrev, e2.meta], [5e5, 2.5e5, 1e6], 'con 300k: la etapa es 500k y el gran hito sigue siendo 1M');
eq(e2.camino.map((c) => [c.m, c.mayor, c.rango, !!c.fecha]), [[1e5, true, 'campamento', true], [2.5e5, false, 'principal', true], [5e5, false, 'principal', false], [1e6, true, 'campamento', false], [1e7, true, 'campamento', false], [1e8, true, 'campamento', false]], 'camino: etapas hechas, la siguiente y los hitos grandes');
// Las fechas de las etapas nuevas salen del historial (la del primer movimiento con el que el saldo llegó), también hacia atrás.
const e3 = resumen([mov(1, '2026-01-04', 'compra', 100, 700_000), mov(2, '2026-02-01', 'compra', 50, 400_000), mov(3, '2026-03-01', 'venta', 20, 200_000), mov(4, '2026-04-05', 'compra', 60, 450_000)], 20000, '2026-04-10');
eq([e3.sats, e3.etapa, e3.etapaPrev], [1_350_000, 1.5e6, 1.25e6], 'con 1.35M: la siguiente es 1.5M y la anterior 1.25M');
eq(e3.camino.filter((c) => c.fecha).map((c) => [c.m, c.fecha]), [[1e5, '2026-01-04'], [2.5e5, '2026-01-04'], [5e5, '2026-01-04'], [7.5e5, '2026-02-01'], [1e6, '2026-02-01'], [1.25e6, '2026-04-05']],
  'fechas de las etapas: la primera vez que el saldo llegó (la venta no las borra)');
const leer3 = caminoParaLeer(e3.camino);
eq([leer3.camino.map((c) => c.m), leer3.ocultas.map((c) => c.m)], [[1e5, 2.5e5, 5e5, 1e6, 1.25e6, 1.5e6, 1e7, 1e8], [7.5e5]], 'para leer: campamentos y principales, las intermedias del tramo en curso y las que faltan');
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
    // (Campamento 28) Los osos de la interfaz: duermen de 22:00 a 5:00 (aunque el velo de madrugada esté apagado) y las tardes son de 13 a 18.
    const marcas = (h) => { almacen['libro.hora'] = String(h); C.aplicar(); return [raiz.atributos.has('data-sueno'), raiz.atributos.has('data-tarde')]; };
    almacen['libro.madrugada'] = '0';
    eq([4.9, 5, 12.9, 13, 17.9, 18, 21.9, 22].map(marcas), [[true, false], [false, false], [false, false], [false, true], [false, true], [false, false], [false, false], [true, false]], 'aplicar: data-sueno de 22 a 5 (con el velo apagado) y data-tarde de 13 a 18');
    delete almacen['libro.madrugada'];
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
ok(!hayAurora(11) && hayAurora(12) && hayAurora(40), 'aurora: desde una racha de 12');
ok(acentoDe(99_999_999) === 'naranja' && acentoDe(1e8) === 'oro' && acentoDe(2.5e8) === 'oro', 'acento: dorado desde 1 BTC');
ok(cruzo1Btc(99_990_000, 1e8) && cruzo1Btc(0, 3e8) && !cruzo1Btc(1e8, 1.1e8) && !cruzo1Btc(1.2e8, 9e7) && !cruzo1Btc(5e7, 9e7), 'celebración de 1 BTC: solo al cruzar hacia arriba');
ok(iluminacionLunar(0) === 0 && Math.abs(iluminacionLunar(0.5) - 1) < 1e-9 && Math.abs(iluminacionLunar(0.25) - 0.5) < 1e-9 && iluminacionLunar(0.75) > 0.49, 'luna: iluminación 0 en nueva, 1 en llena, 0.5 en cuartos');

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
  // Campamento 21: con etapas más juntas la línea no se alarga sin fin. Campamentos y principales van cada una en su renglón; las
  // intermedias del tramo en curso también; las de tramos ya cerrados se juntan en un renglón por tramo.
  const sem = [];
  for (let w = 0; w < 120; w++) sem.push({ id: w + 1, fecha: new Date(Date.UTC(2024, 0, 1 + w * 7)).toISOString().slice(0, 10), tipo: 'compra', monto: 25, sats: 30_000, precio: 83000 });
  const Rs = resumen(sem, 80000, '2026-04-30'), hs = historia(Rs, '2026-04-30');
  eq(Rs.sats, 3_600_000, 'historia de etapas: 120 compras de 30,000 sats');
  const tit = (c) => hs.eventos.filter((e) => e.clase === c).map((e) => e.titulo);
  eq(tit('hito'), ['Campamento 100k', 'Campamento 1M'], 'historia: los campamentos, cada uno en su renglón');
  eq(tit('etapa'), ['Llegaste a 250k sats', 'Llegaste a 500k sats', 'Llegaste a 2.5M sats'], 'historia: las etapas principales, cada una en su renglón');
  eq(tit('paso'), ['Llegaste a 3M sats', 'Llegaste a 3.5M sats'], 'historia: las intermedias del tramo en curso, sueltas');
  const grupos = hs.eventos.filter((e) => e.clase === 'pasos');
  eq(grupos.map((g) => [g.titulo, g.detalle, g.pasos.map((x) => x.m)]), [['1 etapa intermedia', 'Entre 500k y 1M sats', [7.5e5]], ['5 etapas intermedias', 'Entre 1M y 2.5M sats', [1.25e6, 1.5e6, 1.75e6, 2e6, 2.25e6]]],
    'historia: las intermedias de tramos cerrados, juntas por tramo y con sus etapas');
  ok(grupos.every((g) => g.pasos.every((x) => x.fecha) && g.fecha === g.pasos.at(-1).fecha), 'historia: cada grupo va en la fecha de su última etapa y cada etapa trae la suya');
  eq(hs.etapasAgrupadas, 6, 'historia: cuántas intermedias van juntas');
  ok(hs.eventos.every((e, i) => i === 0 || hs.eventos[i - 1].fecha <= e.fecha), 'historia: con grupos sigue de más viejo a más nuevo');
  ok(historia(Rs, '2026-04-30', { libro: true }).eventos.filter((e) => e.clase === 'paso').every((e) => /^El libro llegó a /.test(e.titulo)), 'historia: las intermedias hablan del libro para quien solo mira');
  eq(sellos(Rs).map((x) => x.m), [1e5, 2.5e5, 5e5, 1e6, 2.5e6], 'sellos: solo campamentos y principales (las intermedias no llevan lacre)');
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
  const em = estrellasConstelacion(muchas, 120, 2000);
  ok(em.length === 1000 && em.every((x) => x.x >= 0 && x.x <= 1 && x.y >= 0 && x.y <= 1), 'constelación: con 1,000 compras (y el tope en 2,000) sigue dentro del círculo');
  const LC = await import('../app/static/lib.js');
  // Campamento 58: con más de 600 compras, una estrella por semana (la marca de extra por mayoría; el texto cuenta las compras)
  const ew = estrellasConstelacion(muchas.map((c, k) => ({ ...c, extra: k % 5 ? 1 : 0 })));
  ok(ew.length === 12 && ew.every((x) => x.semanal && x.n > 1 && x.desde <= x.fecha && x.fecha <= x.hasta) && ew.reduce((a, x) => a + x.n, 0) === 1000 && ew.every((x) => x.extra === (x.nExtra * 2 > x.n)), `constelación: con 1,000 compras, una estrella por semana (${ew.length})`);
  ok(/tiene 12 estrellas, una por semana con compras \(1,000 compras\)\. La más reciente es la semana del /.test(textoConstelacion(ew)) && /^Semana del .* · \d+ compras \(\d+ extra\) · \+[\d,]+ sats$/.test(LC.textoEstrella(ew[0])) && LC.textoEstrella(e[1]) === `${LC.fechaLarga(e[1].fecha)} · +${e[1].sats.toLocaleString('en-US')} sats · compra extra`, 'constelación: textos de las estrellas por semana y por compra');
  eq([estrellasConstelacion(muchas.slice(0, 600)).length, estrellasConstelacion(muchas.slice(0, 601)).length], [600, 12], 'constelación: hasta 600 compras, una estrella por compra; con 601, por semana');
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
  eq([etapasFuturas(1.2e6), etapasFuturas(2.6e6, 4)], [[1.25e6, 1.5e6, 2.5e6, 5e6, 1e7, 2.5e7], [3e6, 3.5e6, 5e6, 1e7]], 'cartas: las dos siguientes y después solo principales y campamentos (una carta puede esperar a 10M)');
  // Campamento 21: si en 14 días se cruzaron varias, el titular lleva la destacada (2.5M antes que 3M)
  const dos = resumen([{ id: 1, fecha: '2026-10-01', tipo: 'compra', sats: 2_400_000, precio: 100000, monto: 2400 }, { id: 2, fecha: '2026-11-10', tipo: 'compra', sats: 700_000, precio: 100000, monto: 700 }], 90000);
  eq([diario(dos, '2026-11-15').clase, diario(dos, '2026-11-15').titular], ['etapa', 'Llegamos a 2.5M sats'], 'diario: con varias etapas en la semana, la destacada');
  const chica = resumen([{ id: 1, fecha: '2026-10-01', tipo: 'compra', sats: 1_200_000, precio: 100000, monto: 1200 }, { id: 2, fecha: '2026-11-10', tipo: 'compra', sats: 60_000, precio: 100000, monto: 60 }], 90000);
  eq(diario(chica, '2026-11-15').titular, 'Llegamos a 1.25M sats', 'diario: una etapa intermedia también es noticia');
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
  eq([tarjetaFiesta(2.4e6, 3.1e6, 7e5).texto, tarjetaFiesta(1.2e6, 1.26e6, 6e4).titulo, tarjetaFiesta(1.2e6, 1.26e6, 6e4).texto], ['2.5M sats', 'Nueva etapa', '1.25M sats'], 'tele: la etapa destacada, también una intermedia');
}
// ------------------------------------------------------------ campamento 18: el ritual de anotar
{
  // La fecha: «Hoy · Ayer · Otro día» y escrita como aquí.
  eq([sumarDias('2026-03-01', -1), sumarDias('2024-02-28', 1), sumarDias('2026-12-31', 1), sumarDias('2026-11-15', 0)], ['2026-02-28', '2024-02-29', '2027-01-01', '2026-11-15'], 'sumarDias: cruza meses, años y el 29 de febrero');
  eq([diaDe('2026-11-15', '2026-11-15'), diaDe('2026-11-14', '2026-11-15'), diaDe('2026-11-13', '2026-11-15'), diaDe('2026-10-31', '2026-11-01'), diaDe('2026-11-16', '2026-11-15')], ['hoy', 'ayer', 'otro', 'ayer', 'otro'], 'diaDe: hoy, ayer (también entre meses) u otro día');
  eq([fechaEscrita('2026-11-15', '2026-11-16'), fechaEscrita('2025-03-08', '2026-11-16'), fechaEscrita('2026-01-01', '2026-01-01'), fechaEscrita('2026-11-15', '')],
    ['domingo 15 de noviembre', 'sábado 8 de marzo de 2025', 'jueves 1 de enero', 'domingo 15 de noviembre de 2026'], 'fechaEscrita: como aquí, con el año solo si no es el de hoy');
  // La semana en una línea: la nota de la compra de hace un año.
  const notas = [{ id: 1, fecha: '2025-11-08', tipo: 'compra', nota: 'vieja' }, { id: 2, fecha: '2025-11-10', tipo: 'compra', nota: ' Sofi perdió su primer diente ' }, { id: 3, fecha: '2025-11-12', tipo: 'compra', nota: '  ' },
    { id: 4, fecha: '2025-11-14', tipo: 'venta', nota: 'Gasto' }, { id: 5, fecha: '2025-11-16', tipo: 'compra', nota: 'después' }, { id: 6, fecha: '2025-11-16', tipo: 'compra', nota: 'la última del día' }, { id: 7, fecha: '2023-02-28', tipo: 'compra', nota: 'bisiesto' }];
  eq(notaDeHaceUnAnio(notas, '2026-11-15'), { fecha: '2025-11-10', nota: 'Sofi perdió su primer diente' }, 'nota de hace un año: la de los siete días que acaban en la misma fecha (sin espacios; ni ventas ni notas vacías)');
  eq([notaDeHaceUnAnio(notas, '2026-11-16').nota, notaDeHaceUnAnio(notas, '2026-11-08').nota, notaDeHaceUnAnio(notas, '2026-11-25'), notaDeHaceUnAnio(notas, '2024-02-29').nota, notaDeHaceUnAnio([], '2026-11-15'), notaDeHaceUnAnio(null, '2026-11-15')],
    ['la última del día', 'vieja', null, 'bisiesto', null, null], 'nota de hace un año: gana la más cercana a la fecha (y la última anotada ese día); sin nota, nada');
  const semanal = [];
  for (let k = 0; k < 60; k++) semanal.push({ id: k + 1, fecha: sumarDias('2026-11-12', -7 * k), monto: 20, sats: 25000, precio: 80000, tipo: 'compra', nota: k === 52 ? 'El primer aguacero' : '' });
  const Rn = resumen(semanal, 80000, '2026-11-15');
  eq(diario(Rn, '2026-11-15').notaAnio, { fecha: '2025-11-13', nota: 'El primer aguacero' }, 'diario: trae la nota de la compra de hace un año');
  eq(diario(resumen(semanal.map((c) => ({ ...c, nota: '' })), 80000, '2026-11-15'), '2026-11-15').notaAnio, null, 'diario: sin nota de hace un año no cita nada');
  // El comprobante de cada movimiento.
  const mov = [{ id: 1, fecha: '2026-01-05', monto: 50, sats: 60000, precio: 83333.33, tipo: 'compra' }, { id: 2, fecha: '2026-01-07', monto: 40, sats: 50000, precio: 80000, tipo: 'compra' },
    { id: 3, fecha: '2026-02-01', monto: 9, sats: 10000, precio: 90000, tipo: 'venta', nota: 'Gasto' },
    { id: 4, fecha: '2026-02-10', monto: 25, sats: 30000, precio: 83333.33, tipo: 'compra', extra: true, nota: 'cayó 20 %', etiquetas: ['bono'], txid: 'ab'.repeat(32) }];
  const items = resumen(mov, 100000, '2026-11-15').items;
  const c1 = comprobante(items, 1, { precio: 100000, hoy: '2026-11-15' }), c2 = comprobante(items, 2, { precio: 100000, hoy: '2026-11-15' }), v3 = comprobante(items, 3, { precio: 100000, hoy: '2026-11-15' }), c4 = comprobante(items, 4, { precio: 100000, hoy: '2026-11-15' });
  eq([c1.numero, c1.total, c1.antes, c1.despues, c1.etapa, c1.primeraDeSemana, c1.sello.numero], [1, 3, 0, 60000, null, true, 1], 'comprobante: la primera compra, de 0 a 60,000 sats, con el sello que nació con ella');
  eq([c2.numero, c2.antes, c2.despues, c2.etapa, c2.primeraDeSemana, c2.sello.numero, c2.q], [2, 60000, 110000, 100000, false, 1, 1], 'comprobante: la segunda cruza 100k y comparte el sello de la semana');
  eq([v3.tipo, v3.numero, v3.total, v3.antes, v3.despues, v3.sello, v3.hoy, v3.etapa, v3.nota, typeof v3.realizada], ['venta', 1, 1, 110000, 100000, null, null, null, 'Gasto', 'number'], 'comprobante: una venta baja la altitud, lleva su ganancia realizada y no tiene sello');
  eq([c4.numero, c4.antes, c4.despues, c4.meta, c4.p, c4.q, c4.extra, c4.nota, c4.etiquetas, c4.txid.length], [3, 100000, 130000, 250000, 0, 0.2, true, 'cayó 20 %', ['bono'], 64], 'comprobante: extra, nota, etiquetas y TXID; del 0 % al 20 % del camino a 250k');
  ok(Math.abs(c4.hoy.valor - 30) < 1e-9 && Math.abs(c4.hoy.variacion - (100000 / 83333.33 - 1) * 100) < 1e-9, 'comprobante: lo que valen hoy esos sats y cuánto cambió el precio desde entonces');
  eq([comprobante(items, 4, { hoy: '2026-11-15' }).hoy, comprobante(items, 99), comprobante(null, 1)], [null, null, null], 'comprobante: sin precio no hay «hoy valen»; sin el movimiento, nada');
}
// ---------------------------------------------------------------- Campamento 19: la familia
{
  // El Diario del domingo: de qué fue la semana y su titular sin cifras (el mismo que manda el servidor: ver la paridad en test_api).
  const c = (id, fecha, sats, tipo = 'compra') => ({ id, fecha, sats, monto: 10, precio: (10 * 1e8) / sats, tipo });
  const una = diario(resumen([c(1, '2025-10-01', 20000), c(2, '2026-11-12', 10000)], null, '2026-11-15'), '2026-11-15');
  eq([una.clase, una.aviso], ['una', 'Un paso más en la montaña'], 'diario: una compra en la semana');
  const varias = diario(resumen([c(1, '2025-10-01', 20000), c(2, '2026-11-10', 10000), c(3, '2026-11-14', 10000)], null, '2026-11-15'), '2026-11-15');
  eq([varias.clase, varias.aviso], ['varias', 'La montaña subió esta semana'], 'diario: varias compras en la semana');
  const etapa = diario(resumen([c(1, '2026-10-01', 90000), c(2, '2026-11-14', 15000)], null, '2026-11-15'), '2026-11-15');
  eq([etapa.clase, etapa.aviso, etapa.titular], ['etapa', 'Llegamos a una nueva etapa', 'Llegamos a 100k sats'], 'diario: una etapa en los últimos 14 días manda');
  const quieta = diario(resumen([c(1, '2026-10-01', 90000)], null, '2026-11-15'), '2026-11-15');
  eq([quieta.clase, quieta.aviso], ['tranquila', 'Semana tranquila en la montaña'], 'diario: una semana sin compras es tranquila');
  ok(Object.values(AVISO_DIARIO).every((t) => !/\d/.test(t)) && Object.keys(AVISO_DIARIO).length === 4, 'diario: el titular del aviso nunca lleva cifras');
  // Escuchar: el Diario en frases para la voz del aparato.
  eq(fechaHablada('2026-11-15'), '15 de noviembre de 2026', 'oír: la fecha se dice entera');
  eq(paraOir('La montaña subió 1,241,769 sats esta semana'), 'La montaña subió 1241769 sats esta semana', 'oír: las cifras sin comas (con voz en español se leerían como decimales)');
  eq(paraOir('Llegamos a 2.5M sats'), 'Llegamos a 2,5 millones de sats', 'oír: «2.5M» se dice «2,5 millones»');
  eq(paraOir('Llegamos a 1M sats'), 'Llegamos a 1 millón de sats', 'oír: «1M» se dice «1 millón»');
  eq(paraOir('SE REGALA vista desde el campamento 100k. Buenas condiciones'), 'Se regala vista desde el campamento 100 mil. Buenas condiciones', 'oír: los avisos en mayúsculas no se deletrean y «100k» es «100 mil»');
  eq(paraOir('15 nov 2026 · edición n.º 52 · 1 BTC y 1,000 BTC'), '15 nov 2026, edición número 52, 1 bitcoin y 1000 bitcoin', 'oír: «·» es una pausa, «n.º» es «número» y «BTC» es «bitcoin»');
  const oido = diarioParaOir(una);
  ok(oido[0] === `El Diario del Libro. Edición del ${fechaHablada(una.fecha)}, número ${una.numero}.` && oido[1] === 'Un paso más: la montaña subió 10000 sats.', `oír: la cabecera y el titular primero (${oido.slice(0, 2).join(' | ')})`);
  ok(oido.includes('Clasificados.') && oido.includes('Pronóstico de la montaña.') && oido.every((f) => /[.!?:]$/.test(f) && !/\d,\d{3}/.test(f)), 'oír: los clasificados y el pronóstico, en frases cortas que terminan en punto');
  ok(oido.indexOf('Hace un año.') > 1 && oido.some((f) => /^Hace un año el libro tenía 20000 sats/.test(f)), 'oír: con un año de historia, también «hace un año»');
  ok(diarioParaOir(una, { montana: 'La Ceiba' })[0].startsWith('El Diario del Libro, desde la montaña La Ceiba. Edición'), 'oír: con nombre, la montaña se nombra en la cabecera');
  eq(diarioParaOir(null), [], 'oír: sin Diario no hay nada que leer');
  // El libro de cumbre: quién firmó y qué invita a hacer la tarjeta.
  const f = (id, hito, quien, creado, mia = false) => ({ id, hito, quien, texto: 'x', creado, editado: null, mia });
  const todas = [f(3, 1e6, 'Papá', 30), f(1, 1e6, 'Ana', 10), f(2, 1e7, 'Ana', 20), f(4, 1e6, 'Daf3r', 40, true), f(5, 1e6, 'Mamá', 50)];
  eq(firmasDe(todas, 1e6).map((x) => x.id), [1, 3, 4, 5], 'cumbre: las firmas de un campamento, en el orden en que se firmaron');
  eq(firmasDe(null, 1e6), [], 'cumbre: sin firmas, ninguna');
  eq([textoFirmantes([]), textoFirmantes([f(1, 1e6, 'Ana', 1)]), textoFirmantes([f(1, 1e6, 'Ana', 1, true)])], ['Nadie ha firmado todavía', 'Firmó Ana', 'Firmaste tú'], 'cumbre: nadie, una persona o tú');
  eq(textoFirmantes(firmasDe(todas, 1e6).slice(0, 2)), 'Firmaron Ana y Papá', 'cumbre: dos personas');
  eq(textoFirmantes(firmasDe(todas, 1e6).slice(0, 3)), 'Firmaron tú, Ana y Papá', 'cumbre: tu firma va primero');
  eq(textoFirmantes(firmasDe(todas, 1e6)), 'Firmaron tú, Ana y 2 más', 'cumbre: con muchas, dos nombres y cuántas más (la tuya nunca se pierde en «más»)');
  eq([accionFirmas([], true), accionFirmas([f(1, 1e6, 'Ana', 1)], true), accionFirmas([f(1, 1e6, 'Ana', 1, true)], true), accionFirmas([f(1, 1e6, 'Ana', 1)], false)],
    ['Deja la primera firma', 'Firma tú también', 'Cambia tu firma', 'Léelo'], 'cumbre: lo que invita a hacer la tarjeta (sin alcanzar, solo leer)');
  // El nombre de la montaña en el certificado de altitud.
  const Rc = resumen([c(1, '2026-01-05', 1_500_000), c(2, '2026-02-05', 300_000)], null, '2026-11-15');
  const sinNombre = datosCertificado(Rc, 'Daf3r', '2026-11-15'), conNombre = datosCertificado(Rc, 'Daf3r', '2026-11-15', { montana: 'La Ceiba' });
  eq([sinNombre.montana, conNombre.montana], [null, 'La Ceiba'], 'certificado: el nombre de la montaña es opcional');
  ok(!/montaña/.test(textoCertificado(sinNombre)) && /^Certificado de altitud de Daf3r, en la montaña «La Ceiba»\. A /.test(textoCertificado(conNombre)), 'certificado: la descripción nombra la montaña');
  const svgSin = certificado(sinNombre), svgCon = certificado(conNombre);
  ok(svgSin.includes('>Se hace constar que</text>') && !svgSin.includes('montaña'), 'certificado: sin nombre, como siempre');
  ok(svgCon.includes('>En la montaña «La Ceiba», se hace constar que</text>') && !svgCon.includes('c-montana'), 'certificado: con un nombre corto, en la primera línea');
  const raro = certificado(datosCertificado(Rc, null, '2026-11-15', { montana: '<b>🙂🙂🙂🙂🙂🙂🙂🙂🙂🙂🙂🙂🙂🙂🙂🙂🙂🙂🙂🙂</b>' }));
  ok(raro.includes('class="c-pre c-montana"') && raro.includes('&lt;b&gt;') && !raro.includes('<b>') && raro.includes('>se hace constar que el</text>'), 'certificado: un nombre que no cabe va en su línea, escapado');
}
// ---------------------------------------------------------------- campamento 20: cada cosa en su sitio
{
  const L = await import('../app/static/lib.js');
  const A = await import('../app/static/arte-historia.js');
  const c = (id, fecha, sats, extra = false, tipo = 'compra', monto = 25) => ({ id, fecha, sats, monto, precio: (monto * 1e8) / sats, tipo, extra });
  // 13 · cifras largas: la forma corta habla en BTC desde 1 BTC (con comas), y «sats» por debajo
  eq([L.satsCorto(145_948_039_280), L.satsCorto(6_554_000_000), L.satsCorto(250_000_000), L.satsCorto(2_500_000)], ['1,459 BTC', '65.5 BTC', '2.5 BTC', '2.5M sats'], 'cifras: la forma corta es en BTC desde 1 BTC');
  // Voz del lector: los textos de «Tu historia» hablan del libro con `libro`
  const semanal = [];
  for (let k = 0; k < 40; k++) semanal.push(c(k + 1, new Date(Date.UTC(2025, 10, 20) + k * 7 * 864e5).toISOString().slice(0, 10), 20_000 + k * 100, k === 5));
  semanal.push(c(99, '2026-03-03', 5_000, false, 'venta', 5));
  const hoy = '2026-08-30';
  const R = resumen(semanal, 80_000, hoy);
  const yo = historia(R, hoy), lb = historia(R, hoy, { libro: true });
  ok(yo.eventos[0].titulo === 'Tu primera compra' && lb.eventos[0].titulo === 'La primera compra', 'voz: la línea de tiempo, para quien solo mira, habla de la primera compra del libro');
  ok(lb.eventos.every((e) => !/(^|\s)(Tu|tu|Llegaste)\s/.test(`${e.titulo} ${e.detalle}`)) && lb.eventos.some((e) => /^El libro llegó a /.test(e.titulo)), 'voz: sin «tu» ni «llegaste» en la historia del libro');
  const tro = aniosTronco(semanal, hoy), man = semanasManta(semanal, hoy), est = estratosMes(semanal, hoy), pt = partitura(semanal);
  const libros = [textoTronco(tro, true), textoConstelacion(estrellasConstelacion(semanal), true), textoTorre(piedrasTorre(semanal), true), textoManta(man, true), textoEstratos(est, true), textoEstrato(est[0], true), textoAnio(tro[0], true),
    textoPasaporte(sellosSemana(semanal, hoy), true), textoSelloSemana(sellosSemana(semanal, hoy)[0], true), textoPartitura(pt, true), textoAnioPartitura(pt[0], true), textoTronco([], true), textoManta({ celdas: [], anios: [] }, true)];
  const tutea = /(^|[^\p{L}])(tu|tus|tienes|cerraste|compraste)(?![\p{L}])/iu;
  eq(libros.filter((t) => tutea.test(t)), [], 'voz: los textos de los dibujos para quien solo mira no tutean');
  ok(textoTronco(tro) === textoTronco(tro, false) && /^Tu tronco tiene/.test(textoTronco(tro)), 'voz: el dueño lee lo de siempre');
  // 5a · el dibujo de hoy: mismo día, mismo dibujo; rota por día entre los que ya se ven bien
  const listos = L.dibujosListos(semanal, hoy).map((d) => d.vh);
  eq(listos, ['tronco', 'constelacion', 'torre', 'manta', 'estratos', 'partitura'], 'dibujo de hoy: con 40 compras semanales, los seis se ven bien');
  eq(L.objetoDeHoy(semanal, hoy), L.objetoDeHoy(semanal, hoy), 'dibujo de hoy: el mismo todo el día');
  const semana = Array.from({ length: 6 }, (_, k) => L.objetoDeHoy(semanal, L.sumarDias(hoy, k)).vh);
  eq(new Set(semana).size, 6, `dibujo de hoy: en seis días seguidos salen los seis (${semana.join(', ')})`);
  eq(L.dibujosListos([c(1, '2026-08-27', 36_578)], hoy).map((d) => d.vh), [], 'dibujo de hoy: con una compra, ninguno (no sale)');
  eq(L.objetoDeHoy([], hoy), null, 'dibujo de hoy: sin compras, nada');
  eq(L.dibujosListos([c(1, '2026-07-01', 10_000), c(2, '2026-07-08', 10_000), c(3, '2026-08-05', 10_000), c(4, '2026-08-12', 10_000)], hoy).map((d) => d.vh), ['tronco', 'torre', 'manta', 'partitura'], 'dibujo de hoy: con cuatro compras en dos meses, solo los que ya se ven bien (sin constelación ni estratos)');
  ok(L.DIBUJOS.every((d) => /^(El|La|Los) /.test(d.nombre)), 'dibujo de hoy: cada uno con su nombre');
  // 5b · el primer año
  eq([L.primerAnio(semanal, hoy), L.primerAnio(semanal, '2026-11-19'), L.primerAnio(semanal, '2026-11-20'), L.primerAnio([], hoy)], [true, true, false, false], 'primer año: hasta la víspera del primer aniversario');
  const t = L.mesesTronco(semanal, hoy);
  eq(t.meses.map((m) => m.mes), ['2025-11', '2025-12', '2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08'], 'primer año: una banda por mes, de la primera compra a hoy');
  eq(t.meses.reduce((a, m) => a + m.comprados, 0), semanal.filter((x) => x.tipo === 'compra').reduce((a, x) => a + x.sats, 0), 'primer año: las bandas suman todo lo comprado');
  ok(t.meses.at(-1).completo === false && t.meses.slice(0, -1).every((m) => m.completo), 'primer año: el mes en curso está abierto');
  eq(t.meses[0].saldoFin, satsEn(semanal, '2025-11-30'), 'primer año: el saldo al cerrar cada mes');
  ok(t.fr > 0.75 && t.fr < 0.8 && t.meses[3].ventas.length === 0 && t.meses[4].ventas[0].frac > 0.25 && t.meses[4].ventas[0].frac < 0.4, `primer año: la vuelta es el año del libro (${t.fr.toFixed(2)}); las marcas, en su lugar`);
  ok(/^Tu tronco está en su primer año: una banda por mes \(10\), de noviembre de 2025 a agosto de 2026\./.test(L.textoTroncoPrimer(t)) && /Hay 1 nudo/.test(L.textoTroncoPrimer(t)), 'primer año: lo que dice el tronco');
  eq(L.textoMesTronco(t.meses[0]), 'Noviembre de 2025: 2 compras · +40,100 sats · cerraste con 40,100 sats', 'primer año: un mes del tronco');
  ok(/^Agosto de 2026 \(en curso\): .* · hoy tiene [\d,]+ sats$/.test(L.textoMesTronco(t.meses.at(-1), true)), 'primer año: un mes, para quien solo mira');
  const m = L.mantaPrimerAnio(semanal, hoy);
  eq([m.cols, m.filas, m.total, m.celdas.length, m.futuras], [13, 4, 52, 41, 11], 'primer año: la manta es una pieza de 4 hileras de 13 semanas, lo tejido y lo que falta');
  ok(/^Tu manta está en su primer año: 4 hileras de 13 semanas, 41 ya tejidas \(40 con compra\) y 11 en el telar\./.test(L.textoMantaPrimer(m)), 'primer año: lo que dice la manta');
  // Los dibujos del primer año: piezas tocables con su índice, sin estilos en línea
  const svgT = A.tronco(t.meses, { primer: t, sel: 2 }), svgM = A.mantaPrimer(m, { sel: 3 });
  eq((svgT.match(/class="pieza h-anillo/g) ?? []).length, 10, 'primer año: una banda tocable por mes');
  ok(svgT.includes('data-i="2"') && !svgT.includes('data-anio') && svgT.includes('h-tronco-primer') && svgT.includes('ht-falta') && /class="pieza h-anillo ht-\w+ sel" data-i="2"/.test(svgT), 'primer año: las bandas llevan su índice, la elegida y la vuelta que falta');
  eq((svgM.match(/class="pieza celda/g) ?? []).length, 41, 'primer año: una celda tocable por semana tejida');
  ok(svgM.includes('ha-telar') && /data-i="3"/.test(svgM) && /class="pieza celda tono-\d( extra)? sel" data-i="3"/.test(svgM), 'primer año: la urdimbre del telar y la semana elegida');
  ok(![svgT, svgM].some((s) => / style=/.test(s)), 'primer año: sin estilos en línea (CSP)');
  ok(!A.tronco(tro).includes('ht-falta') && A.tronco(tro).includes('data-anio'), 'el tronco de siempre no cambia');
  // 9 · un punto por mes
  const mes = L.comprasPorMes([c(1, '2026-01-05', 30_000, false, 'compra', 30), c(2, '2026-01-20', 10_000, false, 'compra', 20), c(3, '2026-01-12', 20_000, false, 'compra', 25), c(4, '2026-02-03', 50_000, false, 'compra', 40)]);
  eq(mes.map((x) => [x.mes, x.n, x.sats, x.monto, x.fecha, x.desde, x.hasta]), [['2026-01', 3, 60_000, 75, '2026-01-12', '2026-01-05', '2026-01-20'], ['2026-02', 1, 50_000, 40, '2026-02-03', '2026-02-03', '2026-02-03']], 'un punto por mes: junta las compras de cada mes (la fecha, la de la compra del medio)');
  eq(Math.round(mes[0].precio), 125_000, 'un punto por mes: al precio que se pagó en promedio (dólares entre sats)');
  ok(mes[0].grupo && mes[0].id === 'm-2026-01' && mes[0].nombre === 'enero de 2026' && !mes[0].extra, 'un punto por mes: se sabe que es un mes y cuál');
  eq(L.UMBRAL_POR_MES, 150, 'un punto por mes: desde más de 150 compras a la vista');
}

// ---------------------------------------------------------------- Campamento 21B · la tele de la sala
{
  const L = await import('../app/static/lib.js');
  // El reloj: la hora de El Salvador (UTC−6, sin horario de verano) y cómo se dice aquí, de 12 horas
  eq(L.horaSV(Date.UTC(2026, 10, 17, 2, 5, 9)), { h: 20, m: 5, s: 9 }, 'reloj: las 02:05 UTC son las 20:05 en El Salvador');
  eq(L.horaSV(Date.UTC(2026, 10, 17, 6, 0, 0)), { h: 0, m: 0, s: 0 }, 'reloj: medianoche de El Salvador');
  eq(L.horaSV(Date.UTC(2026, 6, 1, 5, 59, 59)), { h: 23, m: 59, s: 59 }, 'reloj: sin horario de verano (julio igual que noviembre)');
  eq([L.textoReloj(0, 30), L.textoReloj(9, 5), L.textoReloj(12, 0), L.textoReloj(13, 7), L.textoReloj(23, 59)].map((t) => `${t.hora} ${t.sufijo}`),
    ['12:30 a. m.', '9:05 a. m.', '12:00 p. m.', '1:07 p. m.', '11:59 p. m.'], 'reloj: de 12 horas, con a. m. y p. m. (el mediodía es p. m., la medianoche 12 a. m.)');
  // La tele duerme de 23:00 a 5:00: los bordes
  eq([22.99, 23, 23.5, 0, 4.99, 5, 12].map((h) => L.teleDuerme(h)), [false, true, true, true, true, false, false], 'duerme: de 23:00 (incluida) a 5:00 (despierta)');
  ok(!L.teleDuerme(23.5, false) && !L.teleDuerme(2, false), 'duerme: no, si el dispositivo lo apagó');
  // El reloj dormido se corre unos píxeles cada 5 minutos
  const c0 = L.corrimientoReloj(23 * 60), c1 = L.corrimientoReloj(23 * 60 + 4), c2 = L.corrimientoReloj(23 * 60 + 5);
  eq(c0, c1, 'corrimiento: dentro de los mismos 5 minutos no se mueve');
  const paso = Math.hypot(c2.x - c0.x, c2.y - c0.y);
  ok(paso > 0 && paso <= 10, `corrimiento: cada 5 minutos se corre unos píxeles (${paso.toFixed(1)})`);
  const todos = Array.from({ length: 288 }, (_, k) => L.corrimientoReloj(k * 5));
  ok(todos.every((p) => Math.abs(p.x) <= 36 && Math.abs(p.y) <= 22) && new Set(todos.map((p) => `${p.x},${p.y}`)).size > 60, 'corrimiento: recorre un rectángulo de ±36 × ±22 px sin quedarse en pocos sitios');
  ok(todos.every((p, i) => i === 0 || Math.hypot(p.x - todos[i - 1].x, p.y - todos[i - 1].y) <= 10), 'corrimiento: nunca salta más de 10 px de una vez');
  // El marco: cada 10 minutos (a las :05, :15…), 40 s, rota de forma determinista entre los dibujos listos
  const lis = [{ vh: 'tronco' }, { vh: 'torre' }, { vh: 'manta' }];
  const a = (hh, mm, ss) => Date.UTC(2026, 10, 17, hh + 6, mm, ss); // hora de El Salvador
  ok(!L.marcoTele(a(20, 4, 59), lis).visible && L.marcoTele(a(20, 5, 0), lis).visible && L.marcoTele(a(20, 5, 39), lis).visible && !L.marcoTele(a(20, 5, 40), lis).visible, 'marco: de :05:00 a :05:40');
  ok(L.marcoTele(a(20, 15, 10), lis).visible && !L.marcoTele(a(20, 10, 0), lis).visible && !L.marcoTele(a(18, 0, 10), lis).visible, 'marco: cada 10 minutos; nunca a las 18:00 (el atardecer)');
  eq(L.marcoTele(a(20, 5, 1), lis).dibujo, L.marcoTele(a(20, 5, 30), lis).dibujo, 'marco: el mismo dibujo toda la vuelta');
  eq([5, 15, 25, 35].map((mm) => L.marcoTele(a(20, mm, 1), lis).dibujo.vh).length, 4, 'marco: una vuelta por cada 10 minutos');
  const seq = [5, 15, 25, 35].map((mm) => lis.indexOf(L.marcoTele(a(20, mm, 1), lis).dibujo));
  ok(seq.every((x, i) => i === 0 || x === (seq[i - 1] + 1) % 3), `marco: en la vuelta siguiente, el dibujo siguiente (${seq})`);
  eq(L.marcoTele(a(20, 5, 10), lis).faltaMs, 30_000, 'marco: cuánto le queda');
  eq(L.marcoTele(a(20, 5, 10), []), null, 'marco: sin dibujos listos no hay marco');
  // (Campamento D) La deriva contra el quemado: hasta 12 px, cambia a mitad del marco (:05:20) y recorre los nueve sitios en 90 minutos
  eq(L.derivaTele(a(20, 5, 19)), L.derivaTele(a(20, 0, 0)), 'deriva: no cambia antes de las :05:20');
  ok(L.marcoTele(a(20, 5, 20), lis).visible && String(L.derivaTele(a(20, 5, 20))) !== String(L.derivaTele(a(20, 5, 19))), 'deriva: cambia a las :05:20, con el marco a la vista');
  eq(L.derivaTele(a(20, 5, 20)), L.derivaTele(a(20, 15, 19)), 'deriva: se queda diez minutos');
  const sitiosD = new Set(Array.from({ length: 9 }, (_, k) => String(L.derivaTele(a(20, 5, 30) + k * 600e3))));
  ok(sitiosD.size === 9 && L.DERIVA_TELE.every(([x, y]) => Math.abs(x) <= 12 && y >= 0 && y <= 12), 'deriva: nueve sitios distintos, hasta 12 px a los lados y hacia abajo (nunca hacia arriba)');
  // Lo que enseña la tele: dormir gana; una fiesta o el atardecer ganan al marco
  const m = (o) => L.modoTele({ ahoraMs: a(20, 5, 10), hora: 20.08, listos: lis, ...o }).modo;
  eq([m({}), m({ fiesta: true }), m({ ritual: true }), m({ hora: 23.5, ahoraMs: a(23, 30, 0) }), m({ hora: 23.5, ahoraMs: a(23, 30, 0), duerme: false }), m({ hora: 23.5, ahoraMs: a(23, 30, 0), despiertaHasta: a(23, 31, 0) })],
    ['marco', 'escena', 'escena', 'duerme', 'escena', 'escena'], 'modo de la tele: marco, la fiesta gana, el atardecer gana, duerme, no duerme si se apagó o si alguien la despertó un rato');
  // Dónde va una tarjeta: el primer sitio libre, dentro de la pantalla y sin pisar obstáculos con su margen
  ok(L.chocan({ x: 0, y: 0, w: 10, h: 10 }, { x: 5, y: 5, w: 10, h: 10 }) && !L.chocan({ x: 0, y: 0, w: 10, h: 10 }, { x: 10, y: 0, w: 5, h: 5 })
    && L.chocan({ x: 0, y: 0, w: 10, h: 10 }, { x: 12, y: 0, w: 5, h: 5 }, 3), 'sitio: chocan (tocarse en el borde no cuenta; con margen sí)');
  const opts = { W: 200, H: 100, margen: 4, borde: 2 };
  const obst = [{ x: 0, y: 0, w: 60, h: 40 }];
  eq(L.sitioLibre({ w: 50, h: 20 }, [{ x: 10, y: 10 }, { x: 70, y: 10 }, { x: 10, y: 60 }], obst, opts), { x: 70, y: 10 }, 'sitio: salta lo que choca y da el primero libre');
  eq(L.sitioLibre({ w: 50, h: 20 }, [{ x: 160, y: 10, donde: 'cielo' }, { x: 100, y: 10, donde: 'cielo' }], obst, opts), { x: 100, y: 10, donde: 'cielo' }, 'sitio: no se sale de la pantalla y conserva lo que trae el candidato');
  eq(L.sitioLibre({ w: 50, h: 20 }, [{ x: 10, y: 10 }], obst, opts), null, 'sitio: si no cabe en ninguno, null (no se enseña: nunca tapa)');
  eq(L.riel(0, 0, 10, 0, { x2: 30 }), [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 20, y: 0 }, { x: 30, y: 0 }], 'riel: de un punto, en pasos, hasta el límite');
  eq(L.riel(5, 5, 0, 0), [{ x: 5, y: 5 }], 'riel: sin paso, solo el punto');
  const rej = L.rejilla(50, 50, { x1: 0, x2: 100, y1: 0, y2: 100, paso: 25 });
  ok(rej.length === 25 && rej[0].x === 50 && rej[0].y === 50 && rej.every((p, i) => i === 0 || p.d >= rej[i - 1].d), 'rejilla: de la más cercana al ancla a la más lejana');
}

// ---------------------------------------------------------------- campamento 24: medir este aparato (idea 44)
{
  const L = await import('../app/static/lib.js');
  // La prueba: baja y vuelve, suave en los extremos, siempre igual
  const D = 2532, T = L.PRUEBA_MS;
  eq([L.desplazamientoPrueba(0, T, D), L.desplazamientoPrueba(T / 2, T, D), L.desplazamientoPrueba(T, T, D), L.desplazamientoPrueba(T + 50, T, D), L.desplazamientoPrueba(-5, T, D)], [0, D, 0, 0, 0],
    'desplazamiento: arriba al empezar, abajo del todo a la mitad, arriba al acabar (y fuera de la prueba, arriba)');
  ok(L.desplazamientoPrueba(T / 4, T, D) === Math.round(D / 2) && L.desplazamientoPrueba(T / 8, T, D) < D / 4, 'desplazamiento: arranca despacio (a un octavo del tiempo va por menos de un cuarto)');
  eq(L.desplazamientoPrueba(T / 3, T, 0), 0, 'desplazamiento: sin página que bajar, no se mueve');
  eq([L.desplazamientoPrueba(T * 0.3, T, D), L.desplazamientoPrueba(T * 0.7, T, D)], [L.desplazamientoPrueba(T * 0.3, T, D), L.desplazamientoPrueba(T * 0.3, T, D)], 'desplazamiento: la vuelta es el espejo de la ida');
  // Intervalos a partir de instantes (en un arreglo preasignado, con `n`) y elegidos con `incluir`
  const t = new Float64Array(16);
  [0, 16, 33, 50, 100, 116].forEach((x, i) => { t[i] = x; });
  eq(L.intervalosDe(t, 6), [16, 17, 17, 50, 16], 'intervalos: solo los `n` primeros instantes');
  eq(L.intervalosDe(t, 6, (i) => i >= 4), [50, 16], 'intervalos: `incluir` elige por el índice del fotograma que cierra');
  // La pantalla en reposo: la mediana, que un tirón suelto no mueve
  eq(L.hzReposo([16.7, 16.6, 16.7, 16.7, 120, 16.6, 16.7]), 60, 'hz en reposo: 60 aunque haya un tirón');
  eq(L.hzReposo(Array(30).fill(8.33)), 120, 'hz en reposo: 120 (ProMotion o un monitor rápido)');
  eq(L.hzReposo(Array(30).fill(33.3)), 30, 'hz en reposo: 30 (ahorro de batería del iPhone)');
  eq(L.hzReposo([16.7, 16.7]), null, 'hz en reposo: null con muy pocos fotogramas');
  // El resumen de los fotogramas
  const fluido = L.resumenFotogramas(Array(420).fill(1000 / 60));
  eq([fluido.fps, fluido.peor, fluido.p5, fluido.tirones, fluido.fotogramas, fluido.duracion], [60, 60, 60, 0, 421, 7000], 'resumen: 60 fps parejos, sin tirones');
  const con = Array(420).fill(1000 / 60);
  for (const i of [50, 51, 52, 53, 54, 55]) con[i] = 100; // un tropiezo: seis fotogramas de 100 ms seguidos
  const r = L.resumenFotogramas(con);
  ok(r.fps < 60 && r.fps > 50, `resumen: la media baja con el tropiezo (${r.fps})`);
  ok(r.peor < 15, `resumen: el medio segundo más lento lo cuenta (${r.peor} fps)`);
  eq(r.tirones, 6, 'resumen: seis tirones (cada intervalo de más de 1.5 veces el de reposo)');
  ok(Math.abs(r.p5 - 60) < 0.1, `resumen: el 5 % más lento no se mueve por solo 6 de 420 (${r.p5})`);
  eq(L.resumenFotogramas(con, { intervalo: 1000 / 120 }).tirones, 420, 'resumen: a 120 Hz en reposo, 60 fps es perder un fotograma de cada dos');
  eq(L.resumenFotogramas([16.7]), null, 'resumen: null con menos de dos intervalos');
  eq(L.resumenFotogramas([10, 10, 10]).peor, L.resumenFotogramas([10, 10, 10]).fps, 'resumen: una prueba más corta que la ventana: el peor momento es la media');
  // El veredicto (la regla del dueño, con la cifra redondeada que se enseña)
  const ver = (fps, fps_escena = null, hz = 60) => L.veredictoFps({ fps, fps_escena, hz });
  eq([ver(60).estado, ver(55).estado, ver(54.6).estado, ver(54.4).estado, ver(50).estado, ver(49.6).estado, ver(49.4).estado],
    ['fluido', 'fluido', 'fluido', 'revisar', 'revisar', 'revisar', 'lento'], 'veredicto: desde 55 fluido, de 50 a 55 revisar, bajo 50 lento (redondeado)');
  eq([ver(59, 37).estado, ver(59, 37).fps, ver(52, 58).fps], ['lento', 37, 52], 'veredicto: cuenta lo peor de toda la prueba y del rato con la montaña a la vista');
  eq([ver(30, 30, 30).estado, ver(30, 30, 30).limitada, ver(58, 58, 60).limitada], ['revisar', true, false], 'veredicto: una pantalla limitada a 30 en reposo no dice «lento» (no se puede juzgar)');
  eq([ver(120, 118, 120).estado, ver(56, 56, 120).estado], ['fluido', 'fluido'], 'veredicto: en fotogramas por segundo de verdad (a 120 Hz, 56 sigue siendo fluido para el ojo)');
  eq([L.PALABRA_FPS.fluido, L.PALABRA_FPS.revisar, L.PALABRA_FPS.lento, L.ESTADO_FPS.lento], ['Fluido', 'Revisar', 'Lento', 'mal'], 'palabras y estados del veredicto');
  ok(/\/medir\?sin=pausa/.test(L.REGLA_LENTO) && !/compr/i.test(L.REGLA_LENTO), 'la regla de un «Lento» dice qué se revisaría y no recomienda comprar nada');
}
// ---------------------------------------------------------------- Campamento 22 · el valle vivo
{
  // El calendario del valle vive en cielo.js (script clásico): se carga con un `document` de mentira, como arriba.
  const almacen = {};
  const raiz = { dataset: {}, atributos: new Set(), toggleAttribute(k, on) { if (on) this.atributos.add(k); else this.atributos.delete(k); }, style: { setProperty() {} } };
  const ctx = { document: { documentElement: raiz, addEventListener() {}, visibilityState: 'visible' }, localStorage: { getItem: (k) => almacen[k] ?? null, setItem: (k, v) => { almacen[k] = String(v); }, removeItem: (k) => { delete almacen[k]; } }, setInterval() {}, Intl, Date, Math, Number, Object };
  ctx.window = ctx;
  vm.runInNewContext(fs.readFileSync(new URL('../app/static/cielo.js', import.meta.url), 'utf8'), ctx);
  const C = ctx.window.libroCielo;
  eq(['2026-04-30', '2026-05-01', '2026-06-30', '2026-07-01', '2026-08-14', '2026-08-15', '2026-10-31', '2026-11-01', '2026-11-30', '2026-12-01', '2027-02-10'].map(C.milpa),
    ['rastrojo', 'siembra', 'siembra', 'jilote', 'jilote', 'doblada', 'doblada', 'tapisca', 'tapisca', 'rastrojo', 'rastrojo'], 'valle: la milpa se siembra el 1 de mayo, jilotea en julio, se dobla el 15 de agosto, se tapisca en noviembre y queda el rastrojo');
  eq(['2026-11-30', '2026-12-01', '2026-12-24', '2027-01-06', '2027-01-07'].map(C.navidad), [false, true, true, true, false], 'valle: Navidad del 1 de diciembre al 6 de enero');
  eq(['2026-09-30', '2026-10-01', '2026-11-30', '2026-12-01'].map(C.piscuchas), [false, true, true, false], 'valle: piscuchas en octubre y noviembre');
  eq([4.9, 5, 6.9, 7, 17.9, 18, 19.9, 20].map(C.fogon), [false, true, true, false, false, true, true, false], 'valle: humo del fogón a las 5–7 y 18–20');
  eq([C.cohetes('2026-12-24', 23.8), C.cohetes('2026-12-24', 23.9), C.cohetes('2026-12-25', 0.2), C.cohetes('2026-12-25', 0.6), C.cohetes('2026-12-23', 23.9)], [false, true, true, false, false], 'valle: cohetes también en Nochebuena (24 dic 23:50 a 0:30)');
  eq([C.lunaLlena(0.5), C.lunaLlena(0.45), C.lunaLlena(0.44), C.lunaLlena(0.25), C.lunaLlena(0)], [true, true, false, false, false], 'valle: luna llena con el 97 % iluminado o más');
  // Con `libro.dia`, la luna es la de ese día (y la marca de luna llena la sigue): el 24 dic 2026 es luna llena; el 17 nov, cuarto creciente.
  almacen['libro.dia'] = '2026-12-24'; almacen['libro.hora'] = '23.95'; C.aplicar();
  ok(Math.abs(C.faseLunar() - 0.5) < 0.05 && raiz.atributos.has('data-luna-llena') && raiz.atributos.has('data-navidad') && raiz.atributos.has('data-cohetes') && raiz.dataset.milpa === 'rastrojo', `valle: Nochebuena de 2026 con luna llena (fase ${C.faseLunar().toFixed(3)}), Navidad y cohetes`);
  almacen['libro.dia'] = '2026-11-17'; almacen['libro.hora'] = '18.5'; C.aplicar();
  ok(Math.abs(C.faseLunar() - 0.25) < 0.04 && !raiz.atributos.has('data-luna-llena') && raiz.atributos.has('data-piscuchas') && raiz.atributos.has('data-fogon') && !raiz.atributos.has('data-navidad') && raiz.dataset.milpa === 'tapisca', 'valle: un 17 de noviembre a las 18:30, piscuchas, fogón y tapisca, sin luna llena');
  delete almacen['libro.dia']; delete almacen['libro.hora'];
  ok(Math.abs(C.faseLunar(new Date('2026-12-24T06:00:00Z')) - 0.5) < 0.01, 'valle: la fase de un instante dado no depende de `libro.dia`');

  const L = await import('../app/static/lib.js');
  const c = (fecha, tipo = 'compra') => ({ fecha, tipo, sats: 1000, monto: 1 });
  eq([L.primeraCompra([]), L.primeraCompra([c('2025-11-20'), c('2025-10-01', 'venta'), c('2026-01-02')])], [null, '2025-11-20'], 'valle: la primera compra (las ventas no cuentan)');
  eq([L.mesesDelLibro([], '2026-11-17'), L.mesesDelLibro([c('2026-11-02')], '2026-11-17'), L.mesesDelLibro([c('2025-11-20')], '2026-11-17'), L.mesesDelLibro([c('2020-01-31')], '2026-11-17')], [0, 1, 13, 83], 'valle: meses de calendario del libro, el primero y el de hoy incluidos');
  eq([0, 1, 6, 13, 60, 83].map(L.lucesDelValle), [6, 6, 6, 13, 60, 60], 'valle: una luz por mes, mínimo seis y tope sesenta');
  eq([L.aniosDelLibro([], '2026-11-17'), Math.round(L.aniosDelLibro([c('2021-11-17')], '2026-11-17') * 100) / 100], [0, 5], 'valle: años del libro desde la primera compra');
  eq([0, 0.5, 1, 1.9, 2, 4.9, 5, 12].map((a) => L.arbolDelPrimerDia(a).etapa), ['retono', 'retono', 'joven', 'joven', 'arbol', 'arbol', 'grande', 'grande'], 'valle: el árbol del primer día crece con los años (retoño, joven, árbol, grande)');
  const tams = [0, 1, 2, 3, 5, 9].map((a) => L.arbolDelPrimerDia(a).tam);
  ok(tams.every((t, i) => t >= 0.3 && t <= 1 && (!i || t >= tams[i - 1])) && tams[5] === 1, `valle: su tamaño crece sin pasarse (${tams.map((t) => t.toFixed(2)).join(', ')})`);
  eq([L.inicialesGrabadas('ADM'), L.inicialesGrabadas(''), L.fechaGrabada('2025-11-20'), L.fechaGrabada('2026-01-03'), L.fechaGrabada('x')], ['A · D · M', '', '20 · XI · 2025', '3 · I · 2026', ''], 'valle: lo que se graba en la roca');
  eq([L.ventanasEncendidas(2, 4), L.ventanasEncendidas(9, 4), L.ventanasEncendidas(0, 6), L.piscuchasDelValle(3), L.piscuchasDelValle(11)], [2, 4, 0, 3, 6], 'valle: una ventana y una piscucha por persona, hasta las que caben');
  const tv = L.textoValle({ luces: 13, arbol: { fecha: '2025-11-20', etapa: 'joven' } });
  ok(/pueblo con su iglesia/.test(tv) && /13 luces, una por mes del libro/.test(tv) && /conacaste joven, sembrado el 20 nov 2025/.test(tv) && !/\btu\b|\btus\b/i.test(tv), `valle: la frase del valle, sin tutear (${tv})`);

  // El arte del valle: funciones puras, sin estilos en línea, con sus clases propias (prefijo v-) y pocos nodos.
  const A = await import('../app/static/arte-valle.js');
  eq([A.formaValle(390, 760), A.formaValle(844, 318), A.formaValle(768, 930), A.formaValle(1440, 900)], ['tel', 'acostado', 'tab', 'esc'], 'valle: el tamaño de la escena');
  const izq = [[-23, 752], [40, 640], [95, 550], [150, 470], [200, 400], [242, 327]];
  const cresta = [[0, 560], [60, 548], [120, 566], [200, 552], [300, 570], [400, 556]];
  const sv = A.sitiosValle({ W: 390, H: 760, techo: 270, izq, der: [[242, 327], [300, 420], [360, 560], [420, 700]], cresta, bx: 55, by: 714, pts: [[55, 714], [232, 638], [120, 560], [242, 327]], lago: { cx: 335, cy: 665, rx: 62, ry: 12 }, personas: 3, meses: 13, anios: 1.2, primera: '2025-09-01' });
  const xIzq = (y) => { const s = [...izq].sort((a, b) => a[1] - b[1]); for (let i = 1; i < s.length; i++) if (y <= s[i][1]) return s[i - 1][0] + ((s[i][0] - s[i - 1][0]) * (y - s[i - 1][1])) / (s[i][1] - s[i - 1][1]); return s.at(-1)[0]; };
  ok(sv.canton.n === 2 && sv.canton.caja[2] <= xIzq(sv.canton.y) && sv.canton.caja[0] >= 0 && sv.canton.y > 270, `valle: en el teléfono, la loma lejana (antes el cantón) a la izquierda de la montaña, por debajo del saldo (${sv.canton.caja.map(Math.round)})`);
  const xDer = (y) => { const s = [[242, 327], [300, 420], [360, 560], [420, 700]]; for (let i = 1; i < s.length; i++) if (y <= s[i][1]) return s[i - 1][0] + ((s[i][0] - s[i - 1][0]) * (y - s[i - 1][1])) / (s[i][1] - s[i - 1][1]); return s.at(-1)[0]; };
  ok(sv.luces.length === 13 && sv.luces.every(([x, y]) => (x < xIzq(y) || x > xDer(y)) && y > 270), `valle: las 13 luces caen fuera de la montaña y por debajo del saldo (${sv.luces.length})`);
  ok(sv.luces.filter((l) => l[2] === 1).every(([, y]) => y > sv.canton.y - 4), 'valle: las luces del valle de cerca van sobre la loma (se dibujan con ella: no quedan tapadas)');
  ok(sv.piscuchas.length === 3 && sv.piscuchas.every(({ x, y }) => x < xIzq(y) && y > 270 + 20), 'valle: tres piscuchas a la izquierda de la montaña, por debajo del saldo');
  ok(sv.arbol && sv.arbol.x + sv.arbol.ra * 0.62 < 55 && sv.camino.fin[0] < 55, 'valle: el árbol del primer día y el camino real quedan del lado de la salida contrario al sendero');
  const piezas = [A.canton({ ...sv.canton, H: 760 }), A.milpa(sv.milpa), A.caminoReal(sv.camino), A.arbolPrimerDia({ ...sv.arbol, ...L.arbolDelPrimerDia(1.2) }), A.lucesValle(sv.luces), A.piscuchas(sv.piscuchas), A.tule({ cx: 335, cy: 665, rx: 62, ry: 12, k: 1 }), A.vidaLago({ cx: 335, cy: 665, rx: 62, ry: 12, k: 1 }), A.grabadoLuna({ x: 300, y: 600, k: 1, iniciales: 'A · D', fecha: '20 · XI · 2025' })];
  const svg = piezas.join('');
  const nodos = (svg.match(/<(?!\/)[a-zA-Z]/g) || []).length;
  ok(!/style=|<script|on[a-z]+=/i.test(svg) && (svg.match(/class="([^"]+)"/g) || []).every((x) => /class="(efecto-ambiente |copa|v-|lago-)/.test(x)), 'valle: SVG sin estilos ni scripts en línea, con clases propias (v-…)');
  ok(nodos <= 150, `valle: las piezas de arte-valle del teléfono caben en 150 nodos (${nodos}; el pueblo, en el campamento 22C)`);
  eq((A.canton({ ...sv.canton, H: 760 }).match(/<path/g) || []).length, 4, 'valle: la loma lejana son cuatro trazos (sin casas: bajaron al pueblo)');
  ok(['siembra', 'jilote', 'doblada', 'tapisca', 'rastrojo'].every((e) => A.milpa(sv.milpa).includes(`v-mp-${e}`)), 'valle: la milpa trae sus cinco etapas (el CSS enseña la del día)');
  ok(/&lt;b&gt;/.test(A.grabadoLuna({ x: 1, y: 1, k: 1, iniciales: '<b>', fecha: '' })), 'valle: lo grabado se escapa');
  eq(A.piscuchas([]).includes('v-pis-a'), false, 'valle: sin personas no hay piscuchas');
  const lad = A.sitiosLadera({ W: 390, sx: 242, sy: 327, der: [[300, 420], [360, 560], [420, 700]], nv: 57, pts: [[55, 714], [232, 638], [120, 560], [242, 327]], lago: { cx: 335, cy: 665, rx: 62, ry: 12 }, cajas: [], grabado: true, k: 1 });
  ok(lad.quebrada && lad.quebrada.pts.at(-1)[1] < 665 && Math.abs(lad.quebrada.pts.at(-1)[0] - 335) < 62, 'valle: la quebrada acaba en el lago');
  ok(!A.sitiosLadera({ W: 390, sx: 242, sy: 327, der: [[300, 420]], nv: 57, pts: [], lago: { cx: 335, cy: 665, rx: 62, ry: 12 }, grabado: false }).roca, 'valle: sin pedirlo (la entrada), no hay grabado');
}
// ---------------------------------------------------------------- Campamento 22B · el valle vivo, parte 2
{
  const almacen = {};
  const raiz = { dataset: {}, atributos: new Set(), estilo: {}, toggleAttribute(k, on) { if (on) this.atributos.add(k); else this.atributos.delete(k); }, style: { setProperty(k, v) { raiz.estilo[k] = v; } } };
  const ctx = { document: { documentElement: raiz, addEventListener() {}, visibilityState: 'visible' }, localStorage: { getItem: (k) => almacen[k] ?? null, setItem: (k, v) => { almacen[k] = String(v); }, removeItem: (k) => { delete almacen[k]; } }, setInterval() {}, Intl, Date, Math, Number, Object };
  ctx.window = ctx;
  vm.runInNewContext(fs.readFileSync(new URL('../app/static/cielo.js', import.meta.url), 'utf8'), ctx);
  const C = ctx.window.libroCielo;
  // 54 · verde de invierno y dorado de verano: la misma partición que la época, con la mezcla del 1 al 14 de mayo y de noviembre.
  const v = (f) => Math.round(C.verdor(f) * 1000) / 1000;
  eq(['2026-04-30', '2026-05-01', '2026-05-07', '2026-05-14', '2026-05-15', '2026-10-31', '2026-11-01', '2026-11-14', '2026-11-15', '2027-02-10'].map(v),
    [0, 0.067, 0.467, 0.933, 1, 1, 0.933, 0.067, 0, 0], 'valle 22B: verde de la lluviosa (1) y dorado de la seca (0), con la mezcla día a día del 1 al 14 de mayo y de noviembre');
  ok(['2026-05-01', '2026-05-14', '2026-11-01', '2026-11-14'].every((f) => C.epoca(f) === (f.slice(5, 7) === '05' ? 'lluviosa' : 'seca')), 'valle 22B: la mezcla empieza donde cambia la época (misma partición)');
  const mezcla = ['2026-05-01', '2026-05-02', '2026-05-03', '2026-05-04', '2026-05-05', '2026-05-06', '2026-05-07', '2026-05-08', '2026-05-09', '2026-05-10', '2026-05-11', '2026-05-12', '2026-05-13', '2026-05-14', '2026-05-15'].map(C.verdor);
  ok(mezcla.every((x, i) => !i || x > mezcla[i - 1]), 'valle 22B: en mayo el valle reverdece un poco cada día');
  // 55 · la neblina (53B: otro ritmo): se forma de 5:00 a 6:30, llena hasta las 7:00 y se levanta hasta las 9:00; sin día, solo la de la mañana.
  eq([4.5, 4.9, 5, 5.75, 6.5, 7, 8, 8.5, 9, 12, 17.5, 18, 20].map((h) => Math.round(C.marNiebla(h) * 100) / 100), [0, 0, 0, 0.75, 1, 1, 0.75, 0.44, 0, 0, 0, 0, 0], '53B: la neblina de la mañana se forma de 5:00 a 6:30 y se levanta de 7:00 a 9:00');
  // Al caer la tarde vuelve fina (nunca más de 0.4): en la lluviosa, de 16:30 a 18:30; en la seca, de 17:30 a 19:00 (antes de las luces del valle).
  eq([16, 16.5, 17.25, 17.5, 18.5, 19, 20].map((h) => Math.round(C.marNiebla(h, '2026-07-10') * 100) / 100), [0, 0, 0.4, 0.4, 0, 0, 0], '53B: en la lluviosa, neblina fina de 16:30 a 18:30');
  eq([16.5, 17.5, 18.25, 18.5, 19, 20, 23].map((h) => Math.round(C.marNiebla(h, '2027-02-10') * 100) / 100), [0, 0, 0.4, 0.27, 0, 0, 0], '53B: en la seca, neblina fina de 17:30 a 19:00');
  ok([19, 20, 22, 0, 3, 4.9].every((h) => ['2026-07-10', '2027-02-10', '2026-12-24'].every((f) => C.marNiebla(h, f) === 0)), '53B: de noche (las luces del valle encendidas) no hay neblina');
  { let tope = 0; for (let h = 9; h < 29; h += 0.05) for (const f of ['2026-07-10', '2027-02-10', '2026-05-07', '2026-11-07']) tope = Math.max(tope, C.marNiebla(h % 24, f)); ok(tope > 0.39 && tope <= 0.4, `53B: de las 9:00 a las 5:00 la neblina nunca pasa de fina (${tope})`); }
  // 56 · árboles en flor
  eq(['2027-01-31', '2027-02-01', '2027-02-28', '2027-03-01', '2026-03-31', '2026-04-01', '2026-04-30', '2026-05-01'].map(C.flor), ['', 'maquilishuat', 'maquilishuat', '', '', 'fuego', 'fuego', ''], 'valle 22B: el maquilishuat florece en febrero y el árbol de fuego en abril');
  // 57 y 60 · fechas de los azacuanes y de los zompopos
  eq(['2026-10-09', '2026-10-10', '2026-10-31', '2026-11-01', '2026-03-31', '2026-04-01', '2026-04-20', '2026-04-21'].map(C.azacuanes), [false, true, true, false, false, true, true, false], 'valle 22B: azacuanes del 10 al 31 de octubre y del 1 al 20 de abril');
  eq(['2026-05-14', '2026-05-15', '2026-05-21', '2026-05-22'].map(C.zompopos), [false, true, true, false], 'valle 22B: zompopos del 15 al 21 de mayo');
  // Lo que se mueve: uno a la vez, cada uno a su hora.
  eq([5, 6.9, 7, 7.5, 9.9, 10, 12, 16.4, 16.5, 17.9, 18, 21.9, 22, 2, 4.9].map((h) => C.mueve('2026-05-17', h)),
    ['torogoz', 'torogoz', 'barre', 'zompopos', 'zompopos', 'teleferico', 'teleferico', 'pelota', 'pericos', 'pericos', 'luciernagas', 'luciernagas', 'relampagos', 'relampagos', 'relampagos'], 'valle 22B: un 17 de mayo, torogoz, la que barre (37), zompopos, el teleférico (32), la pelota (37), pericos, luciérnagas y relámpagos, cada uno a su hora');
  eq([7.9, 8, 15.9, 16, 16.5, 22, 2].map((h) => C.mueve('2026-10-15', h)), ['barre', 'azacuanes', 'azacuanes', 'pelota', 'pericos', 'relampagos', 'relampagos'], 'valle 22B: un 15 de octubre, los azacuanes de día; relámpagos de madrugada (lluviosa)');
  eq([8, 12, 18, 22, 2, 5.5].map((h) => C.mueve('2027-02-10', h)), ['gallinas', 'teleferico', 'luciernagas', 'luciernagas', 'luciernagas', 'torogoz'], 'valle 22B: en la seca no hay relámpagos y las luciérnagas siguen toda la noche');
  eq([9.9, 10, 12.9, 13, 11].map((h) => C.mueve('2026-11-25', h)).concat(C.mueve('2026-10-15', 11)), ['gallinas', 'teleferico', 'teleferico', '', 'teleferico', 'azacuanes'], 'valle 32: el teleférico de 10:00 a 13:00, y los días de azacuanes, ellos');
  eq([7.5, 12].map((h) => C.mueve('2026-04-20', h)), ['barre', 'azacuanes'], 'valle 22B: en abril pasan los azacuanes (sin zompopos)');
  eq([6.9, 7, 7.9, 8, 9.9, 10, 13.9, 14, 14.9, 15, 16.4, 16.5].map((h) => C.mueve('2026-11-25', h)), ['torogoz', 'barre', 'barre', 'gallinas', 'gallinas', 'teleferico', '', 'perro', 'perro', 'pelota', 'pelota', 'pericos'], 'pueblo 34 y 37: la que barre de 7:00 a 8:00, las gallinas de 8:00 a 10:00, el perro de 14:00 a 15:00 y la pelota de 15:00 a 16:30');
  // Nunca dos a la vez: en cada media hora de todo un año, `mueve` da una sola cosa (o nada) y respeta sus fechas y horas.
  let malos = 0;
  for (let t = Date.UTC(2026, 0, 1); t < Date.UTC(2027, 0, 1); t += 864e5) {
    const f = new Date(t).toISOString().slice(0, 10);
    for (let h = 0; h < 24; h += 0.5) {
      const m = C.mueve(f, h);
      if ((m === 'zompopos' && !C.zompopos(f)) || (m === 'azacuanes' && !C.azacuanes(f)) || (m === 'relampagos' && C.epoca(f) !== 'lluviosa') || (m === 'torogoz' && C.franja(h) !== 'amanecer') || (m === 'gallinas' && (h < 8 || h >= 10)) || (m === 'perro' && (h < 14 || h >= 15)) || (m === 'barre' && (h < 7 || h >= 8)) || (m === 'pelota' && (h < 15 || h >= 16.5) && !(f.slice(5) === '12-25' && h >= 9 && h < 12)) || (['brinda', 'chispea', 'fiesta'].includes(m) && !['12-24', '12-25', '12-31', '01-01'].includes(f.slice(5)))) malos++; // (41) el 25 la pelota nueva, de 9:00 a 12:00; la fiesta, solo esas noches
    }
  }
  eq(malos, 0, 'valle 22B: lo que se mueve respeta sus fechas y horas en todo el año (el torogoz, siempre en la franja del amanecer)');
  // Lo que deja en <html>
  almacen['libro.dia'] = '2026-05-07'; almacen['libro.hora'] = '6'; C.aplicar();
  ok(raiz.atributos.has('data-mar-niebla') && raiz.estilo['--v-mar'] === '0.889' && raiz.estilo['--v-verde'] === '0.467' && raiz.dataset.mueve === 'torogoz' && !raiz.dataset.flor, `valle 22B: el 7 de mayo a las 6:00, mar de niebla, el valle a medio reverdecer y el torogoz (${JSON.stringify(raiz.estilo['--v-verde'])})`);
  almacen['libro.dia'] = '2027-02-10'; almacen['libro.hora'] = '12'; C.aplicar();
  ok(!raiz.atributos.has('data-mar-niebla') && raiz.estilo['--v-mar'] === '0.000' && raiz.estilo['--v-verde'] === '0.000' && raiz.dataset.flor === 'maquilishuat' && raiz.dataset.mueve === 'teleferico', 'valle 22B: el 10 de febrero a mediodía, sin niebla, valle dorado, el maquilishuat en flor y solo el teleférico (campamento 32) que se mueva');
  delete almacen['libro.dia']; delete almacen['libro.hora'];

  // El arte de la parte 2: funciones puras, sin estilos en línea, con clases v-…; lo que se mueve lleva `efecto-ambiente`.
  const L = await import('../app/static/lib.js');
  const A = await import('../app/static/arte-valle.js');
  const izq = [[-23, 752], [40, 640], [95, 550], [150, 470], [200, 400], [242, 327]];
  const der = [[242, 327], [300, 420], [360, 560], [420, 700]];
  const cresta = [[0, 560], [60, 548], [120, 566], [200, 552], [300, 570], [400, 556]];
  const pts = [[55, 714], [232, 638], [120, 560], [242, 327]];
  const lago = { cx: 335, cy: 665, rx: 62, ry: 12 };
  const tel = (personas) => A.sitiosValle({ W: 390, H: 760, techo: 270, izq, der, cresta, bx: 55, by: 714, pts, lago, personas, meses: 13, anios: 1.2, primera: '2025-09-01', astro: [335, 357] });
  const sv = tel(6);
  // 55 · el mar de niebla: detrás de la montaña, por debajo del saldo; dos capas, la que más se ve con su sombra.
  const mar = A.marDeNiebla({ W: 390, H: 760, canton: sv.canton, milpa: sv.milpa, k: sv.k, cresta, techo: 270 });
  // (Campamento 53A) Dos bancos suaves: un rectángulo cada uno, relleno por el CSS con el degradado; mucho más anchos que la escena.
  const rects = (svg) => [...svg.matchAll(/<rect class="v-mar ([\w-]+)" x="([-\d.]+)" y="([-\d.]+)" width="([\d.]+)" height="([\d.]+)"\/>/g)].map((m) => ({ clase: m[1], x: Number(m[2]), y: Number(m[3]), w: Number(m[4]), h: Number(m[5]) }));
  const [ma] = rects(mar.atras), [mf] = rects(mar.frente);
  ok(ma && mf && ma.y >= 270 + 24 && mf.y > sv.milpa.y + sv.milpa.h && mf.y > ma.y, `valle 22B: la neblina, por debajo del saldo y (el banco de delante, entero) de la milpa (${ma?.y} / ${mf?.y})`);
  eq([mar.atras.match(/<\w+/g), mar.frente.match(/<\w+/g), ma.clase, mf.clase], [['<rect'], ['<rect'], 'v-mar-atras', 'v-mar-frente'], '53A: un solo nodo por banco (sin bordes festoneados ni planos opacos)');
  ok([ma, mf].every((r) => r.x < -390 && r.x + r.w > 2 * 390 && r.y + r.h >= 760) && !/style=|fill=/.test(mar.atras + mar.frente), '53A: cada banco sobra a los lados (su lomo apenas se curva), llega al pie de la escena y no lleva estilo ni relleno en línea');
  // (53B) Los jirones, solo si se piden (tablet y escritorio): dos óvalos sobre el lomo del banco de atrás, nunca por encima de su tope.
  const conJ = A.marDeNiebla({ W: 390, H: 760, canton: sv.canton, milpa: sv.milpa, k: sv.k, cresta, techo: 270, jirones: true });
  const ovalos = [...conJ.atras.matchAll(/<ellipse class="v-mar v-mar-jiron" cx="([-\d.]+)" cy="([-\d.]+)" rx="([\d.]+)" ry="([\d.]+)"\/>/g)].map((m) => m.slice(1).map(Number));
  ok(ovalos.length === 2 && ovalos.every(([, cy, rx, ry]) => cy - ry >= ma.y - 0.1 && rx > ry * 4) && !/ellipse/.test(mar.atras + conJ.frente), `53B: dos jirones largos y bajos sobre el banco de atrás, por debajo de su tope (${JSON.stringify(ovalos)}); en el teléfono, ninguno`);
  // 58 · las vacas: una en el teléfono, en la orilla de afuera (aquí la izquierda: la derecha no cabe), mirando al agua y lejos del sendero.
  const dist = (px, py) => Math.min(...pts.slice(1).map(([bx2, by2], i) => { const [ax, ay] = pts[i], dx = bx2 - ax, dy = by2 - ay, t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy))); return Math.hypot(px - ax - t * dx, py - ay - t * dy); }));
  ok(sv.vacas.length === 1 && sv.vacas[0].x < lago.cx - lago.rx && sv.vacas[0].dir === 1 && dist(sv.vacas[0].x, sv.vacas[0].y - 4) > 13, `valle 22B: una vaca en el teléfono, en la orilla, mirando al agua y lejos del sendero (${JSON.stringify(sv.vacas[0])})`);
  const esc = A.vacasSitios({ W: 1440, lago: { cx: 1160, cy: 697, rx: 120, ry: 14 }, pts: [[465, 708], [860, 600], [500, 480], [890, 62]], k: 1.45, forma: 'esc', sx: 890 });
  ok(esc.length === 3 && esc.every((v) => v.x > 1160 + 120 && v.x < 1440) && esc[0].dir === -1, `valle 22B: tres vacas en escritorio, en la orilla de afuera (la que da al campo) (${esc.map((v) => Math.round(v.x))})`);
  const pot = A.potrero({ vacas: esc, k: 1.45 });
  eq([(pot.match(/<path/g) || []).length, A.potrero({ vacas: [] })], [6, ''], 'valle 22B: seis trazos para todas las vacas (de pie, echadas, sombra y garcitas); sin sitio, nada');
  // 56 · los dos árboles de aquí (desde el campamento 22C, en el pueblo), cada uno con sus trazos y sus flores caídas.
  const P = await import('../app/static/arte-pueblo.js');
  const sp = P.sitiosPueblo({ W: 390, H: 760, forma: 'tel', by: 600, bx: 55, pts: [[55, 600], [232, 540], [120, 470], [242, 327]], lago: { cx: 320, cy: 680, rx: 62, ry: 12 }, techo: 270, sol: 1 });
  const cant = P.pueblo(sp, { ventanas: 2 });
  ok(['copa v-maqui v-sin-navidad', 'copa v-fuego', 'v-flores v-flores-maqui v-sin-navidad', 'v-flores v-flores-fuego'].every((c) => cant.includes(`class="${c}"`)), 'valle 22B: el maquilishuat (el árbol de la plaza) y el árbol de fuego con sus copas y sus flores caídas');
  // 57 · las bandadas: en el teléfono el remolino va sobre el valle, a la izquierda de la montaña y por debajo del saldo; los pericos entran por la derecha.
  ok(sv.aves.aza[0] < 200 && sv.aves.aza[1] > 270 && sv.aves.aza[1] < 548 && sv.aves.peri[0] > 390 && sv.aves.dist > 390, `valle 22B: el remolino de azacuanes sobre el valle y los pericos desde el borde derecho, de lado a lado (${sv.aves.aza.map(Math.round)}, ${Math.round(sv.aves.dist)})`);
  const avE = A.avesSitios({ W: 1440, H: 774, techo: 400, cresta, forma: 'esc', k: 1.45, cima: [890, 62], astro: [1310, 170], xIzq: () => 0 });
  ok(avE.aza[0] > 890 && avE.aza[0] < 1310 && avE.peri[1] < 200 && avE.dist < 1440 - 890 + 120, `valle 22B: en escritorio, entre la cumbre y el sol, y los pericos se pierden detrás de la montaña (${avE.aza.map(Math.round)}, ${Math.round(avE.dist)})`);
  const band = A.bandadas(sv.aves), zom = A.zompopos({ milpa: sv.milpa, k: sv.k }), ray = A.relampago(A.sitioRayo(390, 760, 470));
  ok([band, zom, ray].every((t) => (t.match(/class="([^"]+)"/g) || []).every((c) => c.startsWith('class="efecto-ambiente v-'))), 'valle 22B: las bandadas, los zompopos y los relámpagos son ambiente (solo con «todos»)');
  eq([(band.match(/v-aza/g) || []).length, (band.match(/v-peri/g) || []).length, (zom.match(/<path/g) || []).length, (ray.match(/<path/g) || []).length, /url\(#m-v-rayo\)/.test(ray)], [2, 2, 2, 1, true], 'valle 22B: dos medias bandadas de cada una, dos columnas de zompopos y una nube');
  ok(A.sitioRayo(1440, 774, 294).x > 1440 / 2 && A.sitioRayo(390, 760, 470).x < 390 / 2, 'valle 22B: la tormenta, a la derecha en escritorio (a la izquierda está el saldo) y sobre el valle en el teléfono');
  // El presupuesto: todo el valle del teléfono, con seis personas (seis piscuchas y seis ventanas), más sus tres capas y el agua del lago, en 150 nodos.
  const lad = A.sitiosLadera({ W: 390, sx: 242, sy: 327, der: der.slice(1), nv: 57, pts, lago, cajas: [], grabado: true, k: 1 });
  const todo = [A.canton({ ...sv.canton, H: 760 }), A.milpa(sv.milpa), A.caminoReal(sv.camino), A.arbolPrimerDia({ ...sv.arbol, ...L.arbolDelPrimerDia(1.2) }), A.lucesValle(sv.luces, 1, 0), A.lucesValle(sv.luces, 1, 1),
    A.piscuchas(sv.piscuchas), A.tule(lago), A.vidaLago(lago), A.grabadoLuna({ x: 300, y: 600, k: 1, iniciales: 'A · D · M · J · L · R', fecha: '20 · XI · 2025' }), lad.quebrada ? A.quebrada(lad.quebrada) : '', mar.atras, mar.frente, A.potrero({ vacas: sv.vacas, k: sv.k }), band, zom, ray].join('');
  const nodos = (todo.match(/<(?!\/)[a-zA-Z]/g) || []).length + 3 + 2; // + #m-v-fondo, #m-v-pie, #m-v-ladera y el agua del lago (.lago-playa, .lago-nivel)
  ok(sv.piscuchas.length === 6 && nodos <= 150, `valle 22B: con seis personas, lo de arte-valle en el teléfono cabe en 150 nodos (${nodos}; el pueblo y sus campos tienen su presupuesto en 22C)`);
  ok(!/style=|<script|on[a-z]+=/i.test(todo) && (todo.match(/class="([^"]+)"/g) || []).every((x) => /class="(efecto-ambiente |copa|v-|vq-|lago-)/.test(x)), 'valle 22B: todo sin estilos ni scripts en línea, con clases propias');
}
// ---------------------------------------------------------------- Campamento 22C · el valle, de verdad (arte-pueblo.js)
{
  const P = await import('../app/static/arte-pueblo.js');
  const A = await import('../app/static/arte-valle.js');
  // Un teléfono de 390 × 764 con la franja del valle: la salida a 600 y el primer tramo del sendero que sube hacia la derecha.
  const pts = [[55, 600], [232, 540], [120, 470], [242, 327]];
  const lago = { cx: 320, cy: 680, rx: 62, ry: 12 };
  const muestras = [];
  for (let i = 1; i < pts.length; i++) for (let j = 0; j <= 40; j++) muestras.push([pts[i - 1][0] + ((pts[i][0] - pts[i - 1][0]) * j) / 40, pts[i - 1][1] + ((pts[i][1] - pts[i - 1][1]) * j) / 40]);
  const sp = P.sitiosPueblo({ W: 390, H: 764, forma: 'tel', by: 600, bx: 55, pts, lago, techo: 270, sol: 1 });
  const iglesia = sp.piezas.find((q) => q.tipo === 'iglesia'), casas = sp.piezas.filter((q) => q.tipo === 'casa');
  ok(iglesia && sp.plaza && casas.length >= 2 && casas.length + sp.atras.length >= 5, `pueblo: en el teléfono, la iglesia, la plaza, ${casas.length} casas delante y ${sp.atras.length} detrás`);
  // Nada del pueblo se acerca al sendero: cada pieza, con su alto, queda a 10 px o más por debajo del camino que pasa encima.
  const alto = (q) => (q.tipo === 'iglesia' ? 40 : q.tipo === 'plaza' ? 24 : 18) * sp.u * q.s;
  const ancho = (q) => (q.tipo === 'iglesia' ? 30 : q.tipo === 'plaza' ? 24 : 26) * sp.u * q.s;
  const pisa = sp.piezas.filter((q) => muestras.some(([x, y]) => x > q.x - 8 && x < q.x + ancho(q) + 8 && y > sp.yg - alto(q) - 10));
  eq(pisa.map((q) => q.tipo), [], 'pueblo: ninguna pieza se acerca al sendero');
  ok(sp.caja[1] > 270 && sp.caja[2] <= lago.cx - lago.rx + 8 && sp.yg < 764, `pueblo: por debajo del saldo y a la izquierda del lago (${sp.caja.map(Math.round)})`);
  const svg = P.pueblo(sp, { ventanas: 3 });
  const subtrazos = (t, clase) => ((t.match(new RegExp(`<path class="${clase}" d="([^"]*)"`)) || ['', ''])[1].match(/M/g) || []).length;
  eq(subtrazos(svg, 'v-luz'), 3, 'pueblo: tres personas, tres ventanas encendidas (una por persona, nunca más)');
  ok(subtrazos(P.pueblo(sp, { ventanas: 99 }), 'v-luz') === casas.length * 2 && subtrazos(P.pueblo(sp, { ventanas: 0 }), 'v-luz') === 0, 'pueblo: cada casa del frente tiene dos ventanas; sin personas, ninguna encendida (la entrada)');
  ok(!/style=|<script|on[a-z]+=|NaN/i.test(svg) && (svg.match(/class="([^"]+)"/g) || []).every((x) => /class="(efecto-ambiente |copa|v-)/.test(x)), 'pueblo: SVG sin estilos ni scripts en línea, sin NaN, con clases propias');
  ok(['v-ig-frente', 'v-ig-torre', 'v-ig-cupula', 'v-plaza', 'v-farol-poste', 'v-vecinos', 'v-navidad v-pino-nav v-pn', 'v-navidad v-belen-figuras', 'v-navidad v-foco v-foco-0', 'v-fiesta v-band v-band-0', 'v-patrias v-bandera-azul'].every((c) => svg.includes(`class="${c}`)),
    'pueblo: la iglesia, la plaza con sus faroles, el grupo de los vecinos (35), el pino y el portal (Navidad), los foquitos, las banderitas (fiestas) y la bandera (patrias)');
  eq([(svg.match(/v-hu v-hu-/g) || []).length, sp.ninos.length], [3, 6], 'pueblo: el humo de un fogón (tres bocanadas) y seis niños en la plaza (sostienen las piscuchas)');
  ok(!/v-estrella|estrella/.test(P.pinoPlaza(100, 700, 2)), 'pueblo: el pino de Navidad no lleva estrella (nada sobresale contra el cielo)');
  // Escritorio: a la izquierda de la salida, más grande.
  const se = P.sitiosPueblo({ W: 1440, H: 774, forma: 'esc', by: 708, bx: 466, pts: [[466, 708], [860, 610], [500, 480], [890, 62]], lago: null, techo: 400, sol: 1 });
  // (53B) La bruma baja del pueblo: solo en escritorio, un óvalo pintado antes que la fila de atrás, entero por encima de la terraza y dentro del pueblo.
  {
    const pe = P.pueblo(se, { ventanas: 2 }), m = pe.match(/<ellipse class="v-mar v-mar-pueblo" cx="([-\d.]+)" cy="([-\d.]+)" rx="([\d.]+)" ry="([\d.]+)"\/>/);
    const [cx, cy, rx, ry] = m ? m.slice(1).map(Number) : [];
    ok(m && pe.indexOf('v-mar-pueblo') < pe.indexOf('v-terraza') && pe.indexOf('v-mar-pueblo') > pe.indexOf('v-plaza') && cy + ry <= se.yg - P.TERRAZA * se.u + 0.1 && cx - rx >= se.x0 - 0.1 && cx + rx <= se.xFin + 0.1,
      `53B: la bruma del pueblo va detrás de las casas (antes que la fila de atrás), por encima de la terraza y sin salirse del pueblo (${m?.[0]})`);
    ok(!/v-mar/.test(P.pueblo(sp, { ventanas: 2 })) && !/v-mar/.test(P.pueblo(P.sitiosPueblo({ W: 768, H: 944, forma: 'tab', by: 780, bx: 150, pts: [[150, 780], [460, 700], [330, 620], [520, 300]], lago: null, techo: 300, sol: 1 }), { ventanas: 2 })), '53B: en el teléfono y la tablet el pueblo no lleva bruma (detrás de las casas va el sendero)');
  }
  ok(se.u > sp.u && se.caja[2] < 466 && se.piezas.filter((q) => q.tipo === 'casa').length >= 2 && se.atras.length >= 1, `pueblo: en escritorio, a la izquierda de la salida y más grande (${se.caja.map(Math.round)})`);
  // El llano, los campos, la ladera baja y el primer plano: sin NaN ni estilos, con sus clases.
  const geo = { W: 390, H: 764, forma: 'tel', by: 600, bx: 55 };
  const borde = P.bordeLlano(geo);
  ok(borde.length > 10 && borde.every(([x, y]) => Number.isFinite(x) && y > 590 && y < 620), 'llano: su borde va justo bajo la salida, de lado a lado');
  const cm = P.campos({ borde, yAbajo: sp.yg - 3, x0: -6, x1: 396, k: 1, vx: 242 });
  ok(cm.milpa && cm.milpa.w > 30 && cm.milpa.y > 600 && cm.milpa.y + cm.milpa.h <= sp.yg && !/NaN/.test(cm.svg), `campos: la milpa es una parcela de delante, entre el bosque y el pueblo (${JSON.stringify(cm.milpa)})`);
  const lb = P.laderaBaja({ W: 390, sy: 327, by: 600, L: [[242, 327], [200, 400], [95, 550], [-23, 752]], R: [[242, 327], [300, 420], [360, 560], [420, 700]], pts, cajas: [], k: 1, sol: 1 });
  const pinosLadera = [...(lb.match(/class="lb-pino-s" d="([^"]*)"/)?.[1] ?? '').matchAll(/M([\d.]+) ([\d.]+)L/g)].map((m) => [Number(m[1]), Number(m[2])]);
  ok(pinosLadera.length > 20 && pinosLadera.every(([x, y]) => muestras.every(([a, b]) => Math.hypot(a - x, b - y) > 6)), `ladera baja: ${pinosLadera.length} pinos y ninguno sobre el sendero`);
  const pp = P.primerPlano({ W: 390, H: 764, sitios: [10, 40, 80, 120, 160, 200, 240, 280, 320, 360, 380], huecos: [[0, 260]], k: 1.3, forma: 'tel' });
  const todo = [P.llano(geo), cm.svg, svg, pp, lb].join('');
  ok(!/style=|<script|on[a-z]+=|NaN/i.test(todo) && (todo.match(/class="([^"]+)"/g) || []).every((x) => /class="(efecto-ambiente |copa|v-|vll-|lb-)/.test(x)), 'valle 22C: todo sin estilos ni scripts en línea ni NaN, con clases propias');
  // El presupuesto del valle en el teléfono (campamento 22C): el pueblo, sus campos y el primer plano, más lo de arte-valle (con seis
  // personas): 300 nodos. La ladera baja y la Navidad de la subida son unos pocos trazos más (fuera del valle).
  const sv = A.sitiosValle({ W: 390, H: 764, techo: 270, izq: [[-23, 752], [40, 640], [95, 550], [150, 470], [200, 400], [242, 327]], der: [[242, 327], [300, 420], [360, 560], [420, 700]], cresta: [[0, 560], [60, 548], [120, 566], [200, 552], [300, 570], [400, 556]], bx: 55, by: 600, pts, lago, personas: 6, meses: 13, anios: 1.2, primera: '2025-09-01' });
  const restoValle = [A.canton({ ...sv.canton, H: 764 }), A.milpa(cm.milpa), A.caminoReal(sv.camino), A.arbolPrimerDia({ ...sv.arbol, etapa: 'joven', tam: 0.5 }), A.lucesValle(sv.luces, 1, 0), A.lucesValle(sv.luces, 1, 1), A.piscuchas(sv.piscuchas), A.tule(lago), A.vidaLago(lago), A.potrero({ vacas: sv.vacas, k: sv.k })].join('');
  // (35) con los vecinos del turno más cargado (la pupusera con su brasa y su luz, más los hilos de seis piscuchas).
  const V35 = await import('../app/static/arte-vecinos.js'), conV = Math.max(...['amanece', 'manana', 'mananaLibre', 'siesta', 'tarde', 'pupusas'].map((t) => (V35.svgVecinos(V35.reparto(P.lugaresPueblo(sp), t, { hilos: 6 })).match(/<path/g) || []).length)) + 2;
  const nodos = ((todo.replace(lb, '') + P.pueblo(sp, { ventanas: 6 }) + restoValle).match(/<(?!\/)[a-zA-Z]/g) || []).length - (svg.match(/<(?!\/)[a-zA-Z]/g) || []).length + conV;
  ok(nodos <= 300, `valle 22C: el valle del teléfono con seis personas cabe en 300 nodos (${nodos})`);
  ok((lb.match(/<path/g) || []).length === 7, 'valle 22C: la ladera baja son siete trazos (claros, peñas en tres tonos y pinos en tres)');
}

// Campamento 23 · Tu camino, otra vez: «Tal día como hoy» (idea 41) y la película del ascenso (idea 29)
{
  const L = await import('../app/static/lib.js');
  const c = (id, fecha, sats, tipo = 'compra') => ({ id, fecha, tipo, sats, precio: 100000, monto: sats / 1000, extra: 0 });
  // Hace dos años llegó a 250k (principal) y hace un año al campamento 1M, los dos un 17 de noviembre: gana el campamento.
  const its = [c(1, '2024-10-18', 200_000), c(2, '2024-11-17', 60_000), c(3, '2025-03-01', 660_000), c(4, '2025-11-17', 100_000), c(5, '2026-05-01', 275_000)];
  const R = resumen(its, 90000, '2026-11-17');
  const t = L.talDiaComoHoy(R.camino, '2026-11-17', '2024-10-18');
  eq(t, { m: 1e6, fecha: '2025-11-17', rango: 'campamento', anios: 1 }, 'tal día: el campamento 1M de hace un año gana a la etapa 250k de hace dos');
  eq([L.talDiaComoHoy(R.camino, '2026-11-18', '2024-10-18'), L.talDiaComoHoy(R.camino, '2025-11-17', '2024-10-18')?.m], [null, 250_000], 'tal día: otro día no hay nada; el año pasado, solo la de hace un año');
  eq(L.talDiaComoHoy(R.camino, '2026-11-17', '2024-10-18'), L.talDiaComoHoy(R.camino, '2026-11-17', '2024-10-18'), 'tal día: el mismo día, lo mismo');
  // A igual rango, la más alta: 750k (2024) y 1.25M (2025), dos intermedias.
  const inter = resumen([c(1, '2024-01-05', 700_000), c(2, '2024-11-17', 60_000), c(3, '2025-02-01', 400_000), c(4, '2025-11-17', 100_000)], 90000, '2026-11-17');
  eq(L.talDiaComoHoy(inter.camino, '2026-11-17', '2024-01-05')?.m, 1_250_000, 'tal día: a igual rango, la etapa más alta');
  // El día de la primera compra es el aniversario del libro (ya se dice aparte): sus etapas no cuentan.
  const primera = resumen([c(1, '2025-11-17', 1_000_000), c(2, '2026-02-01', 30_000)], 90000, '2026-11-17');
  eq(L.talDiaComoHoy(primera.camino, '2026-11-17', '2025-11-17'), null, 'tal día: las etapas de la primera compra no cuentan (su día ya tiene su aviso)');
  // El 29 de febrero se recuerda el 28 en los años sin 29, y el 29 en los bisiestos.
  const bis = resumen([c(1, '2024-01-10', 50_000), c(2, '2024-02-29', 60_000)], 90000, '2028-03-01');
  eq([L.talDiaComoHoy(bis.camino, '2025-02-28', '2024-01-10')?.anios, L.talDiaComoHoy(bis.camino, '2028-02-28', '2024-01-10'), L.talDiaComoHoy(bis.camino, '2028-02-29', '2024-01-10')?.anios], [1, null, 4], 'tal día: un 29 de febrero se recuerda el 28 en los años sin 29');
  eq(L.talDiaComoHoy(resumen([c(1, '2026-01-02', 50_000), c(2, '2026-11-17', 60_000)], 90000, '2026-11-17').camino, '2026-11-17', '2026-01-02'), null, 'tal día: lo de este mismo año no es «hace un año»');
  eq(L.saludoTalDia(t, 'Daf3r'), ['Daf3r, hoy hace un año llegaste a 1M sats', 'Hoy hace un año llegaste a 1M sats', 'Hoy hace un año: 1M sats'], 'tal día: las formas del saludo, de la larga a la corta');
  eq(L.saludoTalDia({ m: 2.5e8, anios: 3 }, 'Ana', true), ['Ana, hoy hace 3 años el libro llegó a 2.5 BTC', 'Hoy hace 3 años el libro llegó a 2.5 BTC', 'Hoy hace 3 años: 2.5 BTC'], 'tal día: a quien solo mira se le habla del libro, sin tutear');
  ok(L.saludoTalDia(t, 'Ana', true).every((s) => !/\b(llegaste|tu|tus|te)\b/i.test(s)), 'tal día: la voz del libro no tutea');
  eq([L.textoTalDia(t), L.textoTalDia({ m: 1_250_000, rango: 'intermedia', anios: 2 })], ['Tal día como hoy, hace un año, el libro llegó al campamento 1M.', 'Tal día como hoy, hace 2 años, el libro llegó a 1.25M sats.'], 'tal día: la línea del Diario');
  const d = diario(R, '2026-11-17');
  ok(d.talDia?.m === 1e6 && d.talDia.texto === 'Tal día como hoy, hace un año, el libro llegó al campamento 1M.' && diario(R, '2026-11-18').talDia === null, 'tal día: el Diario lo trae ese día y no otro');
  const oido = diarioParaOir(d);
  ok(oido.indexOf('Hace un año.') >= 0 && oido[oido.indexOf('Hace un año.') + 1] === 'Tal día como hoy, hace un año, el libro llegó al campamento 1 millón.', `tal día: «Escuchar» lo lee al empezar «Hace un año» (${oido.slice(3, 6).join(' | ')})`);
  ok(!/compra ahora|conviene|deberías|recomend/i.test(L.saludoTalDia(t, 'Daf3r').join(' ') + d.talDia.texto), 'tal día: informa, no presiona');

  // La película: de la primera compra a hoy, día por día.
  const mov = [c(1, '2025-01-10', 60_000), c(2, '2025-01-20', 50_000), c(3, '2025-03-01', 200_000), c(4, '2025-03-01', 20_000, 'venta'), c(5, '2025-06-15', 800_000), c(6, '2025-06-20', 30_000)];
  const Rm = resumen(mov, 90000, '2025-07-10');
  const P = L.peliculaAscenso(Rm.items, Rm.camino, '2025-07-10');
  eq([P.desde, P.dias, P.pasos.length, P.pasos.map((p) => p.d)], ['2025-01-10', 181, 5, [0, 10, 50, 156, 161]], 'película: de la primera compra a hoy, un paso por día con movimientos');
  eq(P.pasos[2], { d: 50, fecha: '2025-03-01', sats: 290_000, compras: 3 }, 'película: el día con compra y venta, el saldo al cerrar el día');
  const x0 = L.diaPelicula(P, 0);
  eq([x0.fecha, x0.sats, x0.compras, x0.evento, x0.hoy], ['2025-01-10', 60_000, 1, { tipo: 'primera' }, false], 'película: el primer día, la primera compra');
  eq([L.diaPelicula(P, 30).sats, L.diaPelicula(P, 30).evento], [110_000, null], 'película: entre compras, el saldo del último día con movimientos (y nada que contar lejos de una etapa)');
  eq(L.diaPelicula(P, 10).evento, { tipo: 'etapa', m: 100_000, rango: 'campamento' }, 'película: el día en que llegó a 100k, el campamento');
  eq(L.diaPelicula(P, 156).evento, { tipo: 'etapa', m: 1e6, rango: 'campamento' }, 'película: si cruzó varias el mismo día, la destacada (el campamento 1M, no 750k)');
  eq([L.diaPelicula(P, 160).evento?.m, L.diaPelicula(P, 156 + 10).evento], [1e6, null], 'película: lo que pasó se queda unos días (una semana) y luego se va');
  eq([L.diaPelicula(P, -5).d, L.diaPelicula(P, 1e9).d, L.diaPelicula(P, 1e9).hoy, L.diaPelicula(P, 1e9).sats], [0, 181, true, Rm.sats], 'película: acotada a su principio y a hoy, y hoy es el saldo de hoy');
  eq([L.diaDeFecha(P, '2025-06-15'), L.diaDeFecha(P, '2024-01-01'), L.diaDeFecha(P, '2030-01-01')], [156, 0, 181], 'película: el día de una fecha («Ver ese día»)');
  eq(L.textosPelicula(L.diaPelicula(P, 156)), { rotulo: 'Tu saldo el 15 jun 2025', evento: 'Llegaste al campamento 1M', lectura: '15 jun 2025: 1,090,000 sats. Llegaste al campamento 1M.' }, 'película: lo que dice un día');
  const tl = L.textosPelicula(L.diaPelicula(P, 181), true);
  eq([tl.rotulo, tl.evento, tl.lectura], ['Saldo del libro hoy', '', `Hoy, 10 jul 2025: ${Rm.sats.toLocaleString('en-US')} sats.`], 'película: hoy, en la voz del libro');
  eq([L.textosPelicula(x0).evento, L.textosPelicula(x0, true).evento, L.textosPelicula(L.diaPelicula(P, 10), true).evento], ['Tu primera compra', 'La primera compra del libro', 'El libro llegó al campamento 100k'], 'película: la voz de quien anota y la del libro');
  eq([L.peliculaAscenso([], [], '2025-07-10'), L.peliculaAscenso(null, null)], [null, null], 'película: sin movimientos no hay película');
  eq(L.PELICULA_MS, 15000, 'película: dura 15 segundos');
  // 2,000 días y 1,000 compras: buscar un día es instantáneo (búsqueda binaria).
  const mucho = resumen(Array.from({ length: 1000 }, (_, i) => c(i + 1, L.sumarDias('2020-01-01', i * 2), 25_000)), 90000, '2025-07-01');
  const Pm = L.peliculaAscenso(mucho.items, mucho.camino, '2025-07-01');
  const t0 = performance.now();
  for (let d2 = 0; d2 <= Pm.dias; d2++) L.diaPelicula(Pm, d2);
  ok(performance.now() - t0 < 200 && L.diaPelicula(Pm, Pm.dias).sats === mucho.sats, `película: ${Pm.dias} días con mil compras en ${Math.round(performance.now() - t0)} ms`);
}

// ---------------------------------------------------------------- Campamento 24 · Confianza
{
  const L = await import('../app/static/lib.js');
  // La suma por etiqueta: solo compras y ventas (las ventas restan y se nombran aparte); nunca el «saldo» de la etiqueta.
  const mv = (tipo, sats, etiquetas = ['bono'], fecha = '2026-03-01') => ({ tipo, sats, etiquetas, fecha, clave: `${tipo}${sats}`, creado: 0 });
  const comprasBono = [mv('compra', 250_000), mv('compra', 60_000)];
  eq(L.sumaEtiqueta(comprasBono), { compras: 2, ventas: 0, comprados: 310_000, vendidos: 0, neto: 310_000, texto: '310,000 sats comprados' }, 'suma por etiqueta: solo compras, «comprados»');
  eq(L.sumaEtiqueta([mv('venta', 20_000)]).texto, '20,000 sats vendidos', 'suma por etiqueta: solo ventas (o gastos), «vendidos»');
  eq(L.sumaEtiqueta([...comprasBono, mv('venta', 20_000)]).texto, 'neto +290,000 sats (310,000 comprados, 20,000 vendidos)', 'suma por etiqueta: con ventas, el neto con esa palabra y cada parte aparte');
  eq(L.sumaEtiqueta([mv('compra', 5_000), mv('venta', 15_000)]).texto, 'neto −10,000 sats (5,000 comprados, 15,000 vendidos)', 'suma por etiqueta: un neto negativo lleva su signo');
  eq(L.sumaEtiqueta([mv('compra', 7_000), mv('venta', 7_000)]).texto, 'neto 0 sats (7,000 comprados, 7,000 vendidos)', 'suma por etiqueta: neto cero, sin signo');
  eq(L.sumaEtiqueta([{ tipo: 'traslado', sats: 999_999 }, mv('compra', 1)]).comprados, 1, 'suma por etiqueta: los traslados no cuentan (no llevan etiquetas)');
  eq([L.sumaEtiqueta([]), L.sumaEtiqueta([{ tipo: 'traslado', sats: 5 }])], [null, null], 'suma por etiqueta: sin compras ni ventas, nada');
  eq(L.sumaEtiqueta([mv('compra', 25_000)]).texto, '25,000 sats comprados', 'suma por etiqueta: un solo movimiento');
  eq(L.sumaEtiqueta([mv('compra', 1_234_567_890), mv('compra', 10_000_000_000)]).texto, '11,234,567,890 sats comprados', 'suma por etiqueta: millones y más de 100 BTC, con sus comas');
  // El renglón de la lista: «12 de 140 movimientos» y, con una etiqueta elegida, su suma.
  eq(L.textoResultadosLista(2, 140, comprasBono), '2 de 140 movimientos · 310,000 sats comprados', 'resultados: con etiqueta, la suma');
  eq(L.textoResultadosLista(2, 140, null), '2 de 140 movimientos', 'resultados: sin etiqueta elegida, sin suma');
  eq(L.textoResultadosLista(0, 140, []), '0 de 140 movimientos', 'resultados: nada coincide, sin suma');
  eq(L.textoResultadosLista(1, 1, [mv('compra', 25_000)]), '1 de 1 movimiento · 25,000 sats comprados', 'resultados: un solo movimiento');
  eq(L.textoResultadosLista(12, 1040, comprasBono), '12 de 1,040 movimientos · 310,000 sats comprados', 'resultados: las cuentas con comas');
  // «Ver más» (Pulido D): cuántas trae el toque y cuántas quedan, sin repetir «más»; con las últimas, una sola pieza.
  eq(L.textoVerMas(44, 25), ['Ver 25 más', 'quedan 44'], 'ver más: trae 25 y dice cuántas quedan');
  eq(L.textoVerMas(1032, 25), ['Ver 25 más', 'quedan 1,032'], 'ver más: las que quedan, con comas');
  eq(L.textoVerMas(26, 25), ['Ver 25 más', 'quedan 26'], 'ver más: una más que el paso');
  eq(L.textoVerMas(25, 25), ['Ver los 25 que quedan'], 'ver más: justo las que trae, son las últimas');
  eq(L.textoVerMas(12, 25), ['Ver los 12 que quedan'], 'ver más: menos que el paso, nunca «Ver 25 más»');
  eq(L.textoVerMas(1, 25), ['Ver el que queda'], 'ver más: la última');
  // La ruta de la tabla de peticiones solo se parte entre tramos, nunca dentro de «/api/compras»
  eq(L.tramosRuta('/api/compras'), ['/api/compras'], 'ruta: «/api/compras» es un solo tramo');
  eq(L.tramosRuta('/api/compras/<int:cid>'), ['/api/compras', '/<int:cid>'], 'ruta: lo que sigue va aparte');
  eq(L.tramosRuta('/api/token/<token>/compras.csv'), ['/api/token', '/<token>', '/compras.csv'], 'ruta: cada trozo de más, su tramo');
  eq([L.tramosRuta('/'), L.tramosRuta('/medir'), L.tramosRuta('/api/tx/<txid>').join('')], [['/'], ['/medir'], '/api/tx/<txid>'], 'ruta: cortas, enteras; unidas, la ruta tal cual');
  // Sobre lo que de verdad filtra la lista (filtrarMovimientos): la suma solo ve lo filtrado, también con otro filtro encima
  const items = [{ id: 1, fecha: '2026-01-05', tipo: 'compra', sats: 100_000, monto: 90, etiquetas: ['bono'] }, { id: 2, fecha: '2026-02-05', tipo: 'compra', sats: 50_000, monto: 45, etiquetas: [] },
    { id: 3, fecha: '2026-03-05', tipo: 'venta', sats: 30_000, monto: 30, etiquetas: ['bono'] }, { id: 4, fecha: '2026-04-05', tipo: 'compra', sats: 70_000, monto: 60, etiquetas: ['bono', 'regalo'] }];
  const todos = movimientosLista(items, [{ id: 9, fecha: '2026-04-06', sats: 60_000, sentido: 'a_wallet' }]);
  const bono = filtrarMovimientos(todos, { etiqueta: 'bono' });
  eq([bono.length, L.textoResultadosLista(bono.length, todos.length, bono)], [3, '3 de 5 movimientos · neto +140,000 sats (170,000 comprados, 30,000 vendidos)'], 'resultados: sobre la lista filtrada de verdad (los traslados y lo sin etiqueta quedan fuera)');
  const bonoCompras = filtrarMovimientos(todos, { etiqueta: 'bono', filtro: 'compra' });
  eq(L.textoResultadosLista(bonoCompras.length, todos.length, bonoCompras), '2 de 5 movimientos · 170,000 sats comprados', 'resultados: con otro filtro encima, suma solo lo que se ve');
  // Solo informa y no tutea: es igual para quien anota y para quien solo mira; nunca habla del «saldo» de la etiqueta ni de metas.
  const frases = [L.sumaEtiqueta([...comprasBono, mv('venta', 20_000)]).texto, L.textoResultadosLista(2, 140, comprasBono)].join(' ');
  ok(!/\b(tu|tus|tienes|te)\b|saldo|quedan|meta|alcanc/i.test(frases), `resultados: sin tutear ni hablar de saldo o metas («${frases}»)`);

  // La fila de la revisión del respaldo (la regla está en el servidor; aquí, lo que dice). Nunca «Falla» ni rojo por no haber revisado.
  const rg = (o) => ({ revisado: null, dias: null, al_dia: false, encendido: false, proximo: null, toca: false, cada: 180, ...o });
  const nunca = L.textoResguardo(rg({}));
  eq([nunca.estado, nunca.palabra], ['calma', 'Sin anotar'], 'resguardo: nunca revisado es calma («Sin anotar»), no una falla');
  ok(nunca.detalle.startsWith('Última revisión: nunca.') && nunca.detalle.includes('enciende «Revisión tranquila del respaldo»'), `resguardo: nunca, y cómo pedir el recordatorio («${nunca.detalle}»)`);
  const conAviso = L.textoResguardo(rg({ encendido: true, proximo: '2027-05-16' }));
  ok(conAviso.detalle.includes('Próximo recordatorio: el 16 may 2027.') && conAviso.palabra === 'Sin anotar', `resguardo: con el aviso encendido dice cuándo llega («${conAviso.detalle}»)`);
  const hoyR = L.textoResguardo(rg({ revisado: '2026-11-17', dias: 0, al_dia: true, encendido: true, proximo: '2027-05-16' }));
  eq([hoyR.estado, hoyR.palabra, hoyR.detalle], ['ok', 'Al día', 'Última revisión: hoy. Próximo recordatorio: el 16 may 2027.'], 'resguardo: revisado hoy, al día');
  eq(L.textoResguardo(rg({ revisado: '2026-11-16', dias: 1, al_dia: true })).detalle.split('.')[0], 'Última revisión: ayer', 'resguardo: ayer');
  const al = L.textoResguardo(rg({ revisado: '2026-06-01', dias: 169, al_dia: true }));
  ok(al.estado === 'ok' && al.detalle.startsWith('Última revisión: hace 169 días (1 jun 2026).'), `resguardo: hace N días, con su fecha («${al.detalle}»)`);
  const vencido = L.textoResguardo(rg({ revisado: '2026-01-01', dias: 320, al_dia: false, encendido: true, toca: true, proximo: '2026-06-30' }));
  eq([vencido.estado, vencido.palabra], ['calma', 'Cuando puedas'], 'resguardo: pasados 180 días es «Cuando puedas», tranquilo');
  ok(vencido.detalle.includes('hace 320 días') && vencido.detalle.endsWith('El recordatorio sale hoy.'), `resguardo: el día que toca lo dice («${vencido.detalle}»)`);
  const todas = [nunca, conAviso, hoyR, al, vencido].map((x) => `${x.palabra} ${x.detalle}`).join(' ');
  ok(!/falla|urgente|peligro|debes|deberías|frase|semilla|\d+ sats/i.test(todas), 'resguardo: sin alarma, sin pedir la frase ni cifras de la wallet');
  eq(L.RESGUARDO_DIAS, 180, 'resguardo: cada 180 días');
}
// ---------------------------------------------------------------------------------------------
// Campamento 25 · Los osos polares de peluche: la regla de sitio (pura) sobre la geometría real de cuatro escenas (tests/osos_geo.json,
// sacada de la app con su montana.js) y el dibujo.
{
  const O = await import('../app/static/arte-osos.js');
  const L = await import('../app/static/lib.js');
  const GEO = JSON.parse(fs.readFileSync(new URL('./osos_geo.json', import.meta.url), 'utf8'));
  const enPol = (pts, x, y) => { let d = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, yi] = pts[i], [xj, yj] = pts[j]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) d = !d; } return d; };
  // Los vértices de cada oso salen del propio dibujo: se dibuja uno solo y se leen sus trazos.
  const puntosDe = (svg) => [...svg.matchAll(/d="([^"]+)"/g)].flatMap((m) => [...m[1].matchAll(/(-?[\d.]+) (-?[\d.]+)/g)].map((q) => [Number(q[1]), Number(q[2])]));
  for (const [nombre, g] of Object.entries(GEO)) {
    for (const [aurora, cumple] of [[false, false], [true, true]]) {
      const s = O.sitioOsos({ ...g, aurora, cumple });
      const et = `osos ${nombre}${aurora ? ' (aurora, gorrito)' : ''}`;
      ok(s && s.lista.length >= 1, `${et}: caben (${s?.lista.length} en ${s?.zona})`);
      if (!s) continue;
      eq(s.lista.map((o) => o.quien).sort(), O.OSOS.slice(0, s.lista.length).sort(), `${et}: se quedan en orden (el grande, luego el chico, luego el del mameluco)`);
      const k = g.ec * 1.1;
      let cielo = 0, senda = Infinity, encima = 0;
      const cajas = [];
      for (const o of s.lista) {
        // (Campamento 33) Los brazos de estirarse van aparte: montana.js comprueba sus puntas y, si no caben, no se estiran.
        const sinBrazos = O.osos([o], { k, aurora, cumple }).replace(/<path class="oso-brazos"[^>]*>/g, '');
        const pts = puntosDe(sinBrazos);
        const sinPie = puntosDe(sinBrazos.replace(/<path class="oso-pie"[^>]*>/, ''));
        for (const [x, y] of sinPie) if (!enPol(g.silueta, x, y - O.SALTO - 1)) cielo++;
        const bx = [Math.min(...pts.map((p) => p[0])), Math.min(...pts.map((p) => p[1])), Math.max(...pts.map((p) => p[0])), Math.max(...pts.map((p) => p[1]))];
        for (const [px, py] of g.sendero) senda = Math.min(senda, Math.hypot(Math.max(bx[0] - px, 0, px - bx[2]), Math.max(bx[1] - py, 0, py - bx[3])));
        for (const c of [g.meta, ...g.textos]) if (bx[0] < c[2] && bx[2] > c[0] && bx[1] < c[3] && bx[3] > c[1]) encima++;
        cajas.push([Math.min(...sinPie.map((p) => p[0])), Math.min(...sinPie.map((p) => p[1])), Math.max(...sinPie.map((p) => p[0])), Math.max(...sinPie.map((p) => p[1]))]);
      }
      eq(cielo, 0, `${et}: nada contra el cielo (todos los vértices, con el saltito, dentro de la montaña)`);
      ok(senda >= 11.5, `${et}: a 12 px o más del sendero (${senda.toFixed(1)})`);
      eq(encima, 0, `${et}: ni sobre la meta ni sobre el saldo o la cabecera`);
      // Se pintan de atrás adelante (el de más arriba primero): así pueden apoyarse uno en otro sin que se cruce un tono con otro.
      const orden = [...O.osos(s.lista, { k }).matchAll(/class="oso oso-(\w+)"/g)].map((m) => m[1]);
      eq(orden, [...s.lista].sort((a, b) => a.y - b.y).map((o) => o.quien), `${et}: se pintan de atrás adelante`);
      if (s.zona !== 'cumbre') ok(s.lista.every((o) => enPol(s.zona === 'nieve' ? g.nieveMin : g.nieveHoy, o.x, o.y) && enPol(g.cara, o.x, o.y)), `${et}: los pies en la nieve de la cara al sol`);
      const c = O.cajaOsos(s.lista, k, { aurora, cumple });
      ok(s.lista.every((o) => o.x >= c[0] && o.x <= c[2] && o.y >= c[1] && o.y <= c[3]) && c[1] < Math.min(...s.lista.map((o) => o.y)) - 15, `${et}: la caja los cubre con su saltito`);
    }
    eq(O.sitioOsos(g), O.sitioOsos(g), `osos ${nombre}: siempre el mismo sitio con la misma escena`);
    ok((O.sitioOsos({ ...g, trio: false })?.lista.length ?? 0) <= 2, `osos ${nombre}: sin el trío, como mucho la pareja`);
  }
  // Sin sitio no sale ninguno (y nunca uno a medias): con la cumbre tapada por una caja de texto, null.
  const g0 = GEO['anio-390x844'];
  eq(O.sitioOsos({ ...g0, textos: [[0, 0, g0.W, g0.H]] }), null, 'osos: sin sitio no sale ninguno');
  // Si no caben tres, la pareja; si no, el grande solo: acostado (844×390) la cumbre es chica y quedan dos, el grande y el chico.
  const ac = O.sitioOsos(GEO['anio-844x390']);
  eq(ac?.lista.map((o) => o.quien), ['grande', 'chico'], 'osos: acostado no caben tres y quedan el grande y el chico');
  // Y con el sitio de la derecha de la meta tapado, el grande solo (o ninguno), nunca otro distinto del grande.
  const poco = O.sitioOsos({ ...g0, textos: [...g0.textos, [g0.sx + 30 * g0.ec, 0, g0.W, g0.H], [0, 0, g0.sx - 4, g0.H]] });
  ok(!poco || (poco.lista.length < 3 && poco.lista[0].quien === 'grande'), `osos: con poco sitio quedan menos, empezando por el grande (${poco?.lista.length ?? 0})`);
  // El dibujo: sin estilos en línea ni NaN, todo con clases oso-, y pocos nodos (un grupo por oso, un trazo por tono).
  const tres = O.sitioOsos(g0).lista, k0 = g0.ec * 1.1;
  const nodos = (svg) => (svg.match(/<(g|path)\b/g) || []).length;
  const svgs = { trio: O.osos(tres, { k: k0 }), aurora: O.osos(tres, { k: k0, aurora: true }), todo: O.osos(tres, { k: k0, aurora: true, cumple: true }), uno: O.osos(tres.slice(0, 1), { k: k0 }) };
  for (const [k, svg] of Object.entries(svgs)) {
    ok(!/style=|NaN|undefined/.test(svg) && svg.startsWith('<path class="oso-pie"'), `osos (${k}): sin estilos en línea ni NaN; primero la sombra de contacto de todos`);
    ok([...svg.matchAll(/class="([^"]+)"/g)].every((m) => /^(oso oso-(grande|chico|mameluco)|oso-[a-z-]+( v-navidad)?)$/.test(m[1])), `osos (${k}): solo clases oso- (y v-navidad en las bufandas)`);
  }
  // (Campamento 33: un trazo más por oso, los brazos de estirarse.)
  ok(nodos(svgs.trio) <= 28 && nodos(svgs.aurora) <= 34 && nodos(svgs.todo) <= 35, `osos: nodos del trío ${nodos(svgs.trio)} (≤ 28), con aurora ${nodos(svgs.aurora)} (≤ 34), con gorrito ${nodos(svgs.todo)} (≤ 35)`);
  ok(nodos(svgs.uno) <= 11, `osos: el grande solo, ${nodos(svgs.uno)} nodos`);
  ok(svgs.trio.includes('oso-marino') && svgs.trio.includes('oso-cinta') && svgs.trio.includes('oso-parche') && svgs.trio.includes('oso-celeste') && svgs.trio.includes('oso-chico'), 'osos: el grande con su camiseta, su parche y su cinta; el del mameluco; el chico');
  ok(!svgs.uno.includes('oso-celeste') && !svgs.uno.includes('oso-bufanda'), 'osos: el grande solo no lleva mameluco ni bufanda de Navidad (ya tiene su cinta)');
  ok((svgs.trio.match(/oso-bufanda v-navidad/g) || []).length === 2 && !svgs.trio.includes('oso-gorro') && svgs.todo.includes('oso-gorro'), 'osos: dos bufandas de Navidad (las enseña el CSS) y el gorrito solo con cumpleaños');
  ok(!svgs.trio.includes('-arriba') && (svgs.aurora.match(/oso-hocico-arriba/g) || []).length === 3, 'osos: con aurora, cada cara también mirando arriba (el CSS enseña una)');
  ok(O.OSOS_TRIO === true && O.OSOS.join() === 'grande,chico,mameluco', 'osos: el trío está activo y el orden en que se quedan es grande, chico, mameluco');
  eq([L.textoOsos(3).includes('tres osos polares'), L.textoOsos(2).includes('dos osos'), L.textoOsos(1).includes('un oso polar'), L.textoOsos(0)], [true, true, true, ''], 'osos: la descripción dice cuántos');
  ok(![1, 2, 3].some((n) => /\btu\b|\btus\b|\bte\b/i.test(L.textoOsos(n))), 'osos: la descripción no tutea');
  // (Fase 2) La ilustración de la montaña de los estados vacíos lleva un osito al pie, en el mismo trazo (sin rellenos ni estilos en línea).
  const { ilustracion } = await import('../app/static/iconos.js');
  const ilu = ilustracion('montana');
  ok(/<circle cx="54"/.test(ilu) && !/style=|fill=|NaN/.test(ilu) && ilu.includes('aria-hidden="true"'), 'osos: la ilustración de la montaña lleva su osito, decorativo y en el mismo trazo');
  // El sello de 1 BTC lleva la cabeza del oso en vez de la montañita (las tres copias del relieve); los demás, la montañita de siempre.
  const montanitaDe = (svg) => (svg.match(/<path d="M[\d.]+ [\d.]+L/g) || []).length, osoDe = (svg) => (svg.match(/<path d="M[\d.]+ [\d.]+a/g) || []).length;
  ok(osoDe(lacre(1e8)) === 3 && montanitaDe(lacre(1e8)) === 0 && osoDe(lacre(1e8, { grande: true })) === 3, 'osos: el lacre de 1 BTC lleva la cabeza del oso en relieve');
  ok([1e5, 2.5e6, 1e7, 2.5e8, 1e9].every((m) => osoDe(lacre(m)) === 0 && montanitaDe(lacre(m)) === 3), 'osos: los demás lacres siguen con su montañita (también 2.5 y 10 BTC)');
  ok(!/NaN|undefined/.test(lacre(1e8)) && lacre(1e8).match(/<[a-z]/g).length === lacre(1e9).match(/<[a-z]/g).length, 'osos: el lacre de 1 BTC tiene los mismos nodos que los demás y sin NaN');
}

// Campamento 26 · Los osos en la interfaz: las poses son SVG decorativos y puros, sin estilos en línea, con las piezas de la cumbre.
{
  const P = await import('../app/static/arte-osos-poses.js');
  const { PARTES } = await import('../app/static/arte-osos.js');
  const nodos = (s) => (s.match(/<(svg|g|path)\b/g) || []).length;
  ok(P.NOMBRES_POSES.join() === 'lee,mochila,saludan,sobre,confundido,duerme,duermen,celebra', `poses: las ocho, en el orden de la guía (${P.NOMBRES_POSES})`);
  for (const nombre of P.NOMBRES_POSES) {
    const s = P.pose(nombre, { tam: 84 });
    const vb = s.match(/viewBox="([^"]+)"/)[1].split(' ').map(Number);
    const clases = [...s.matchAll(/<path class="([^"]+)"/g)].map((m) => m[1]);
    ok(s.startsWith(`<svg class="oso-ilu oso-pose-${nombre}" `) && s.includes('aria-hidden="true"') && s.includes('focusable="false"') && s.includes('height="84"'), `poses: ${nombre} es un <svg> decorativo con su clase y su alto`);
    ok(!/style=|fill=|NaN|undefined/.test(s) && vb.length === 4 && vb.every(Number.isFinite) && vb[2] > 0 && vb[3] > 0, `poses: ${nombre} sin estilos en línea, sin NaN y con su viewBox`);
    ok(clases.length > 0 && clases.every((c) => /^oso-[a-z-]+( v-(navidad|sueno)| se-duerme)?$/.test(c)) && clases.includes('oso-luz') && clases.includes('oso-hocico') && clases.includes('oso-suelo'), `poses: ${nombre} pinta con las clases oso-… (${new Set(clases).size} tonos)`);
    ok(nodos(s) <= 44, `poses: ${nombre}, ${nodos(s)} nodos con lo de temporada (≤ 44)`);
  }
  ok(P.pose('no-existe') === '', 'poses: un nombre que no existe no dibuja nada');
  // (Campamento 28) Lo de temporada va dibujado siempre (el CSS lo enseña); el gorrito de cumpleaños, solo si se pide.
  const despiertos = ['lee', 'mochila', 'sobre'];
  for (const nombre of P.NOMBRES_POSES) {
    const s = P.pose(nombre), c = P.pose(nombre, { cumple: true }), sin = P.pose(nombre, { plantar: false });
    const otros = (s.match(/class="oso oso-(chico|mameluco)"/g) || []).length;
    ok(s.includes('oso-gorro-nav v-navidad') && (s.match(/oso-bufanda v-navidad/g) || []).length === otros, `poses: ${nombre} en Navidad, el gorro rojo del grande y ${otros} bufandas`);
    ok(c.includes('class="oso-gorro"') && !c.includes('gorro-nav'), `poses: ${nombre} con cumpleaños, el gorrito en vez del gorro de Navidad`);
    ok(s.includes('oso-ojos-zz v-sueno') === despiertos.includes(nombre) && s.includes('oso-zz v-sueno') === despiertos.includes(nombre), `poses: ${nombre} ${despiertos.includes(nombre) ? 'se duerme' : 'no cambia'} de madrugada`);
    ok(s.includes('<g class="v-lluvia">') && s.includes('<g class="v-patrias">') && !sin.includes('v-lluvia') && !sin.includes('v-patrias'), `poses: ${nombre} con su paraguas y su banderita plantados (y sin ellos si se pide)`);
  }
  const saludan = P.pose('saludan'), brazo = saludan.match(/<g class="oso-saluda">(.*?)<\/g>/);
  ok(brazo && (saludan.match(/oso-saluda/g) || []).length === 1 && ['oso-luz', 'oso-medio', 'oso-hocico'].every((c) => brazo[1].includes(`class="${c}"`)), 'poses: en «saludan», el brazo del grande va aparte (el que se mueve), con su luz, su canto y su manita');
  ok(P.NOMBRES_POSES.filter((n) => n !== 'saludan').every((n) => !P.pose(n).includes('oso-saluda')), 'poses: solo «saludan» lleva el brazo aparte');
  // El eje del saludo en styles.css es el hombro, medido sobre la caja del brazo dibujado.
  const pts = [...brazo[1].matchAll(/(-?\d+\.\d) (-?\d+\.\d)/g)].map((m) => [Number(m[1]), Number(m[2])]);
  const xs = pts.map((q) => q[0]), ys = pts.map((q) => q[1]);
  const ox = ((P.SALUDO.de[0] - Math.min(...xs)) / (Math.max(...xs) - Math.min(...xs))) * 100, oy = ((P.SALUDO.de[1] - Math.min(...ys)) / (Math.max(...ys) - Math.min(...ys))) * 100;
  const css = fs.readFileSync(new URL('../app/static/styles.css', import.meta.url), 'utf8').match(/\.oso-saluda \{[^}]*transform-origin: ([\d.]+)% ([\d.]+)%/);
  ok(css && Math.abs(Number(css[1]) - ox) < 1.5 && Math.abs(Number(css[2]) - oy) < 1.5, `poses: el saludo gira desde el hombro (CSS ${css?.[1]}% ${css?.[2]}%, dibujo ${ox.toFixed(1)}% ${oy.toFixed(1)}%)`);
  // (Campamento 29) La cabina del teleférico: decorativa, los tres asomados (que de madrugada cierran los ojos), sin estilos en línea.
  const tel = P.teleferico({ tam: 78 });
  ok(tel.startsWith('<svg class="oso-ilu oso-pose-teleferico" ') && tel.includes('aria-hidden="true"') && !/style=|fill=|NaN/.test(tel) && nodos(tel) <= 32, `poses: la cabina del teleférico, decorativa (${nodos(tel)} nodos)`);
  ok((tel.match(/class="oso oso-(grande|chico|mameluco)"/g) || []).length === 3 && (tel.match(/oso-ojos-zz v-sueno/g) || []).length === 3 && ['oso-cabina', 'oso-ventana', 'oso-techo', 'oso-cable'].every((c) => tel.includes(`class="${c}"`)), 'poses: en la cabina van los tres, con su ventana, su techo y su cable');
  const h = P.huella({ tam: 30 });
  ok(nodos(h) === 2 && h.includes('class="oso-ilu oso-huella"') && h.includes('aria-hidden="true"') && !/style=|NaN/.test(h), 'poses: la huella es un solo trazo, decorativa');
  ok(['arco', 'elipse', 'canto', 'CAB', 'PIEZAS', 'CARA', 'ROPA'].every((k) => k in PARTES) && PARTES.PIEZAS.length > 8, 'poses: salen de las mismas piezas que los osos de la cumbre (PARTES)');
  const fuente = fs.readFileSync(new URL('../app/static/arte-osos-poses.js', import.meta.url), 'utf8');
  ok(!/\b(document|window|localStorage)\b/.test(fuente.replace(/\/\/.*$/gm, '')), 'poses: el módulo es puro (sin DOM)');
}

// Campamento 31 · «Tú» sube como oso: el osito de «Tú» (un cuarto osito, sin la ropa de los tres, con su mochila y correas naranjas).
{
  const O = await import('../app/static/arte-osos.js');
  const s = O.osoTu({ k: 1.5 }), c = O.osoTu({ k: 1.5, cumple: true }), b = O.osoTu({ k: 1, bajo: '<ellipse class="yo-punto"/>' });
  const nodos = (x) => (x.match(/<(g|path|ellipse)\b/g) || []).length;
  ok(s.includes('class="oso oso-tu"') && ['oso-mochila', 'oso-correa', 'oso-palo', 'oso-hocico', 'oso-rasgos'].every((k) => s.includes(`class="${k}"`)) && !/oso-marino|oso-cinta|oso-celeste/.test(s), 'tú: el osito lleva su mochila, sus correas y su palito, y nada de la ropa de los tres');
  ok(s.includes('oso-bufanda v-navidad') && !s.includes('oso-gorro"') && c.includes('class="oso-gorro"'), 'tú: la bufanda de Navidad va dibujada (el CSS la enseña) y el gorrito solo con cumpleaños');
  ok(/<g class="tu-festeja">.*<\/g><\/g>$/.test(s) && !/style=|NaN/.test(s) && nodos(s) <= 16, `tú: los brazos alzados en su grupo, sin estilos en línea (${nodos(s)} nodos)`);
  ok(b.indexOf('yo-punto') > b.indexOf('oso-pie') && b.indexOf('yo-punto') < b.indexOf('oso oso-tu'), 'tú: la pisada va entre la sombra y el osito');
  const pts = [...s.matchAll(/(-?\d+\.\d) (-?\d+\.\d)/g)].map((m) => [Number(m[1]) / 1.5, Number(m[2]) / 1.5]);
  ok(pts.every(([x, y]) => x >= O.CAJA_TU.x0 - 0.1 && x <= O.CAJA_TU.x1 + 0.1 && y >= O.CAJA_TU.y0 - 0.1 && y <= O.CAJA_TU.y1 + 0.1), 'tú: todo el osito (también los brazos alzados y la sombra) cabe en su caja');
}

// Campamento 33 · Los de la cumbre se estiran por la mañana: cuándo (pura) y los brazos (un trazo por oso, dentro del contorno).
{
  const L = await import('../app/static/lib.js'), O = await import('../app/static/arte-osos.js');
  eq([6.99, 7, 7 + 0.9 / 60, 7 + 1 / 60, 7 + 5 / 60, 7.5, 7 + 59 / 60, 8, 12].map(L.estiranLosOsos), [false, true, true, false, true, true, false, false, false], 'estira: de 7 a 8, el primer minuto de cada cinco');
  const s = O.osos([{ x: 0, y: 0, s: 1, quien: 'grande' }, { x: 12, y: 2, s: 0.7, quien: 'chico' }], { k: 1 });
  ok((s.match(/class="oso-brazos"/g) || []).length === 2 && !/NaN/.test(s), 'estira: un trazo de brazos alzados por oso');
  const brazos = [...s.matchAll(/class="oso-brazos" d="([^"]+)"/g)][0][1], pts = [...brazos.matchAll(/(-?\d+\.\d) (-?\d+\.\d)/g)].map((m) => [Number(m[1]) / O.K_OSO, Number(m[2]) / O.K_OSO]);
  const xs = pts.map((q) => Math.abs(q[0])), ys = pts.map((q) => q[1]), px = Math.max(...O.PUNTAS_ESTIRA.map((q) => Math.abs(q[0]))), py = Math.min(...O.PUNTAS_ESTIRA.map((q) => q[1]));
  ok(Math.max(...xs) <= px + 0.15 && Math.min(...ys) >= py - 0.15 && Math.max(...xs) > 8, `estira: los brazos salen por fuera de la cabeza (${Math.max(...xs).toFixed(1)}) y sus puntas, las que se comprueban contra la montaña, los cubren`);
}

// Pulido del pueblo: las casas no se montan unas sobre otras ni sobre la iglesia, en ningún tamaño ni con la luz de ningún lado. La fila
// de atrás va en su terraza (su fachada se ve por encima de los tejados de delante) y se pinta antes que la iglesia y que el frente.
{
  const P = await import('../app/static/arte-pueblo.js');
  const CONF = [
    { W: 320, H: 640, forma: 'tel', by: 505, bx: 45, pts: [[45, 505], [190, 455], [95, 395], [200, 275]], lago: { cx: 268, cy: 590, rx: 50, ry: 10 }, techo: 225 },
    { W: 390, H: 760, forma: 'tel', by: 600, bx: 55, pts: [[55, 600], [232, 540], [120, 470], [242, 327]], lago: { cx: 320, cy: 680, rx: 62, ry: 12 }, techo: 270 },
    { W: 768, H: 900, forma: 'tab', by: 760, bx: 150, pts: [[150, 760], [520, 650], [260, 520], [470, 330]], lago: { cx: 640, cy: 830, rx: 100, ry: 14 }, techo: 300 },
    { W: 844, H: 390, forma: 'acostado', by: 360, bx: 420, pts: [[420, 360], [600, 300], [470, 220], [560, 60]], lago: null, techo: 120 },
    { W: 1440, H: 774, forma: 'esc', by: 708, bx: 466, pts: [[466, 708], [860, 610], [500, 480], [890, 62]], lago: null, techo: 400 },
    { W: 2560, H: 1300, forma: 'esc', by: 1190, bx: 900, pts: [[900, 1190], [1500, 1000], [1000, 800], [1550, 100]], lago: null, techo: 600 },
  ];
  const cruza = (a, b) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;
  const fallos = [];
  let atras = 0;
  for (const c of CONF) for (const sol of [1, -1]) {
    const sp = P.sitiosPueblo({ ...c, sol }), u = sp.u, nom = `${c.W} ${c.forma} sol ${sol}`;
    const ig = sp.iglesia && P.cajaIglesia(sp.iglesia.x, sp.iglesia.s, u, sp.yg, sol);
    const fr = sp.piezas.filter((q) => q.tipo === 'casa').map((q) => P.cajaCasa(q.x, sp.yg, q.s, q.i, u, sol));
    const at = sp.atras.map((a) => P.cajaCasa(a.x, a.y, a.s, a.i, u, sol));
    atras += at.length;
    for (const [i, a] of at.entries()) {
      if (ig && cruza(a, ig)) fallos.push(`${nom}: la de atrás ${i} detrás de la iglesia`);
      if (at.slice(i + 1).some((b) => cruza(a, b))) fallos.push(`${nom}: dos de atrás juntas`);
      const tapa = Math.max(0, ...fr.filter((f) => a.x0 < f.x1 && a.x1 > f.x0).map((f) => Math.max(0, a.y1 - Math.max(a.ym, f.y0)) / (a.y1 - a.ym)));
      if (tapa > 0.4) fallos.push(`${nom}: la de atrás ${i} con el ${Math.round(tapa * 100)} % de la fachada tapada por un tejado de delante`);
    }
    for (const [i, a] of fr.entries()) if ((ig && cruza(a, ig)) || fr.slice(i + 1).some((b) => cruza(a, b))) fallos.push(`${nom}: la de delante ${i} se monta en otra o en la iglesia`);
    const svg = P.pueblo(sp, { ventanas: 3 });
    if (svg.indexOf('v-ig-lado') < svg.lastIndexOf('v-terraza') || (sp.atras.length && !svg.includes('v-terraza'))) fallos.push(`${nom}: la fila de atrás no se pinta antes que la iglesia`);
  }
  eq(fallos, [], `pulido del pueblo: ninguna casa sobre la iglesia ni sobre otra, la fila de atrás con su fachada a la vista y pintada antes (${atras} casas de atrás en 12 casos)`);
  const sp = P.sitiosPueblo({ ...CONF[1], sol: 1 });
  const evita = P.pueblo(sp, { evitar: [sp.xFin, sp.xFin + 30 * sp.u] }), sin = P.pueblo(sp, {});
  ok(sin.includes('copa v-fuego') && !evita.includes('copa v-fuego'), 'pulido del pueblo: si el árbol del primer día está al final de la calle, el árbol de fuego no se pone (los dos troncos parecían una persona)');
}

/** (Campamento 41) Los turnos de la Navidad entera (cielo.js: turnoFiesta). */
const NAVIDAD41 = ['nb-madruga', 'nb-compras', 'nb-tamales', 'nb-cena', 'nb-misa', 'nb-doce', 'n25-polvora', 'n25-estrena', 'n25-recalentado', 'n25-paseo', 'n25-fresca', 'f31-limpia', 'f31-estreno', 'f31-cena', 'f31-espera', 'f31-doce', 'e1-polvora', 'e1-barre', 'e1-visitas', 'e1-fresca', 'e6-guarda'];
// Campamento 35 · El Pueblo de los Osos: los turnos (cielo.js), el reparto y el dibujo de los vecinos (arte-vecinos.js).
{
  const almacen = {};
  const raiz = { dataset: {}, atributos: new Set(), estilo: {}, toggleAttribute(k, on) { if (on) this.atributos.add(k); else this.atributos.delete(k); }, style: { setProperty(k, v) { raiz.estilo[k] = v; } } };
  const avisos = [];
  const ctx = { document: { documentElement: raiz, addEventListener() {}, visibilityState: 'visible' }, localStorage: { getItem: (k) => almacen[k] ?? null, setItem: (k, v) => { almacen[k] = String(v); }, removeItem: (k) => { delete almacen[k]; } }, setInterval() {}, Intl, Date, Math, Number, Object, Event: class { constructor(t) { this.type = t; } }, dispatchEvent: (ev) => avisos.push(ev.type) };
  ctx.window = ctx;
  almacen['libro.dia'] = '2026-10-14'; almacen['libro.hora'] = '13';
  vm.runInNewContext(fs.readFileSync(new URL('../app/static/cielo.js', import.meta.url), 'utf8'), ctx);
  const C = ctx.window.libroCielo;
  const t0 = raiz.dataset.turno;
  almacen['libro.hora'] = '13.5'; C.aplicar(); almacen['libro.hora'] = '14'; C.aplicar();
  ok(t0 === 'siesta' && raiz.dataset.turno === 'tarde' && avisos.filter((x) => x === 'libro:turno').length === 1, `pueblo 35: <html data-turno> y un solo aviso «libro:turno» al cambiar de turno (${JSON.stringify(avisos)})`);
  const V = await import('../app/static/arte-vecinos.js'), P = await import('../app/static/arte-pueblo.js');
  // (Campamento 40) El día entero: antes del alba, la tortillera, la salida de la escuela, la siesta desde las 12:30, la vuelta del cantón
  // (16:00) y la fresca (20:00–22:00).
  eq([2, 4.4, 4.5, 5, 6.9, 7, 11.4, 11.5, 11.9, 12, 12.4, 12.5, 13.9, 14, 15.9, 16, 17.7, 17.75, 19.9, 20, 21.9, 22].map((h) => C.turno('2026-10-14', h)),
    ['duerme', 'duerme', 'alba', 'amanece', 'amanece', 'manana', 'manana', 'tortillas', 'tortillas', 'salida', 'salida', 'siesta', 'siesta', 'tarde', 'tarde', 'vuelta', 'vuelta', 'pupusas', 'pupusas', 'fresca', 'fresca', 'duerme'], 'pueblo 35 (40): los turnos de un miércoles de octubre');
  eq([['2026-10-17', 12.2], ['2026-10-18', 12.2], ['2026-11-25', 12.2], ['2026-09-15', 12.2]].map(([f, h]) => C.turno(f, h)), ['tortillas', 'tortillas', 'tortillas', 'tortillas'], 'pueblo 40: sin escuela (sábado, domingo, vacaciones, el 15 de septiembre) no hay salida: sigue la tortillera');
  eq([['2026-10-18', 10.5], ['2026-11-16', 9], ['2027-01-15', 9], ['2027-01-18', 9]].map(([f, h]) => C.turno(f, h)), ['mananaLibre', 'mananaLibre', 'mananaLibre', 'manana'], 'pueblo 35: el domingo (después de misa) y las vacaciones (15 nov – 15 ene), los oseznos salen desde la mañana');
  let malos = 0;
  for (let t = Date.UTC(2026, 0, 1); t < Date.UTC(2027, 0, 1); t += 864e5) {
    const f = new Date(t).toISOString().slice(0, 10), sem = new Date(t).getUTCDay();
    for (let h = 0; h < 24; h += 0.25) {
      const x = C.turno(f, h);
      const fi = C.turnoFiesta(f.slice(5), h); // (41) los días de la Navidad entera tienen su guion (y su medianoche)
      if (fi) { if (x !== fi) malos++; continue; }
      if (!['duerme', 'alba', 'amanece', 'manana', 'mananaLibre', 'tortillas', 'salida', 'siesta', 'tarde', 'vuelta', 'pupusas', 'fresca', 'misa', 'mercado', 'desfile', 'posada'].includes(x) || ((h >= 22 || h < 4.5) !== (x === 'duerme')) || ((h >= 4.5 && h < 5) !== (x === 'alba')) || (['manana', 'salida'].includes(x) && (sem === 0 || sem === 6 || C.vacaciones(f)))) malos++;
    }
  }
  eq(malos, 0, 'pueblo 35 (40): en cada cuarto de hora de un año, un turno válido; de noche nadie (de 4:30 a 5:00, solo el panadero); la escuela solo entre semana fuera de vacaciones');
  const CONF = [
    { W: 320, H: 640, forma: 'tel', by: 505, bx: 45, pts: [[45, 505], [190, 455], [95, 395], [200, 275]], lago: { cx: 268, cy: 590, rx: 50, ry: 10 }, techo: 225 },
    { W: 390, H: 760, forma: 'tel', by: 600, bx: 55, pts: [[55, 600], [232, 540], [120, 470], [242, 327]], lago: { cx: 320, cy: 680, rx: 62, ry: 12 }, techo: 270 },
    { W: 768, H: 900, forma: 'tab', by: 760, bx: 150, pts: [[150, 760], [520, 650], [260, 520], [470, 330]], lago: { cx: 640, cy: 830, rx: 100, ry: 14 }, techo: 300 },
    { W: 1440, H: 774, forma: 'esc', by: 708, bx: 466, pts: [[466, 708], [860, 610], [500, 480], [890, 62]], lago: null, techo: 400 },
    { W: 844, H: 390, forma: 'acostado', by: 360, bx: 430, pts: [[430, 360], [700, 300], [520, 230], [590, 140]], lago: null, techo: 120 },
    { W: 2560, H: 1440, forma: 'esc', by: 1318, bx: 900, pts: [[900, 1318], [1600, 1100], [980, 880], [1560, 230]], lago: null, techo: 600 },
  ];
  // (41) Con los turnos de la Navidad entera (y sin la estampa de antes, `nochebuena`).
  const TURNOS = ['duerme', 'alba', 'amanece', 'manana', 'mananaLibre', 'tortillas', 'salida', 'siesta', 'tarde', 'vuelta', 'pupusas', 'fresca', 'misa', 'mercado', 'desfile', 'posada', ...NAVIDAD41], fallos = [];
  for (const c of CONF) for (const sol of [1, -1]) {
    const lug = P.lugaresPueblo(P.sitiosPueblo({ ...c, sol }));
    for (const t of TURNOS) for (const hilos of [0, 3, 6]) {
      const l = V.reparto(lug, t, { hilos }), fig = l.filter((v) => !V.COSAS.has(v.t)), svg = V.svgVecinos(l, { sol });
      if (fig.length > V.MAX_VECINOS) fallos.push(`${c.W} ${t}: ${fig.length} figuras`);
      if (/style=|NaN/.test(svg) || !(svg.match(/class="([^"]+)"/g) || []).every((x) => /^class="v-vo-[a-z0-9]+"$/.test(x)) || (svg.match(/<path/g) || []).length > V.TONOS.length + 1) fallos.push(`${c.W} ${t}: el SVG`);
      if (l.some((v) => !V.PERSONAJES.includes(v.t) || !Number.isFinite(v.x + v.y + v.k))) fallos.push(`${c.W} ${t}: alguien sin sitio`);
      if (V.reparto(lug, t, { hilos: 0 }).length !== l.length) fallos.push(`${c.W} ${t}: los hilos cambian cuántos hay`);
      if (l.filter((v) => v.hilo).some((v) => v.t !== 'oseznoArriba')) fallos.push(`${c.W} ${t}: un hilo sin manita alzada`);
    }
  }
  eq(fallos, [], 'pueblo 35: en cada tamaño, luz y turno, ocho figuras como mucho, solo trazos `v-vo-…` (uno por tono y la sombra), todos en su sitio; las piscuchas no cambian cuántos hay');
  const lug = P.lugaresPueblo(P.sitiosPueblo({ ...CONF[1], sol: 1 })), quien = (t) => V.reparto(lug, t).map((v) => v.t);
  ok(quien('duerme').length === 0 && quien('manana').every((t) => !t.startsWith('osezno')) && quien('tarde').filter((t) => t.startsWith('osezno')).length === 5 && quien('tarde').includes('pelota'), 'pueblo 35: de noche nadie en la calle (103); entre semana por la mañana, los oseznos en la escuela; por la tarde, cinco en la plaza con su pelota (104)');
  ok(quien('pupusas').includes('pupusera') && V.luzPupusa(V.reparto(lug, 'pupusas')) && !V.luzPupusa(V.reparto(lug, 'tarde')) && quien('amanece').includes('panadero') && quien('amanece').includes('estira'), 'pueblo 35: al anochecer la pupusera con su luz (105); al amanecer, el panadero en su bicicleta y el que se estira (106)');
  const conHilos = V.reparto(lug, 'tarde', { hilos: 2 }).filter((v) => v.hilo);
  ok(conHilos.length === 2 && conHilos.every((v) => v.f === 1) && conHilos.map(V.manoDe).every(([x, y], i) => x > conHilos[i].x && y < conHilos[i].y - 2 * conHilos[i].k * V.OSEZNO), 'pueblo 35: los oseznos que sostienen las piscuchas, con la manita arriba y hacia ellas');
}

// Pulido de la iglesia y el paisaje bajo: cada casa bien construida (el tejado asienta en su pared y cubre su ancho, el hastial llega a
// la cumbrera, la puerta y las ventanas dentro de la fachada y sin pisarse, la puerta de la talla de un vecino oso, la chimenea sobre su
// tejado y más alta que la cumbrera), en todas las casas, tallas y con la luz de cada lado.
{
  const P = await import('../app/static/arte-pueblo.js');
  const dentro = ([x, y], pol) => { let c = false; for (let i = 0, j = pol.length - 1; i < pol.length; j = i++) { const [xi, yi] = pol[i], [xj, yj] = pol[j]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c; } return c; };
  const caja = (pol) => ({ x0: Math.min(...pol.map((q) => q[0])), x1: Math.max(...pol.map((q) => q[0])), y0: Math.min(...pol.map((q) => q[1])), y1: Math.max(...pol.map((q) => q[1])) });
  const fallos = [];
  for (let i = 0; i < 7; i++) for (const s of [1, 0.86, 0.72, 0.7, 0.64]) for (const sol of [1, -1]) {
    const c = P.piezasCasa(100, 500, s, i, 3, sol), k = c.k, f = caja(c.frente), t = caja(c.techo), pu = caja(c.puerta), nom = `casa ${i} al ${s} (luz ${sol})`;
    if (!(t.x0 <= f.x0 + 0.01 && t.x1 >= f.x1 - 0.01)) fallos.push(`${nom}: el tejado no cubre la pared`);
    if (Math.abs(Math.max(c.techo[0][1], c.techo[1][1]) - (f.y0 + 0.9 * k)) > 0.05) fallos.push(`${nom}: el alero no asienta en lo alto de la pared`);
    if (!(t.y0 < f.y0)) fallos.push(`${nom}: la cumbrera no queda encima de la pared`);
    if (Math.hypot(c.lado[3][0] - c.techo[2][0], c.lado[3][1] - c.techo[2][1]) > 0.05) fallos.push(`${nom}: el hastial no llega a la cumbrera`);
    if (!(pu.x0 >= f.x0 && pu.x1 <= f.x1 && Math.abs(pu.y1 - f.y1) < 0.05 && pu.y0 > f.y0)) fallos.push(`${nom}: la puerta fuera de su fachada`);
    if ((pu.y1 - pu.y0) / k < 0.85 * 6.7) fallos.push(`${nom}: la puerta mucho más baja que un vecino oso (6.7)`);
    for (const v of c.ventanas.map(caja)) if (!(v.x0 >= f.x0 && v.x1 <= f.x1 && v.y0 > f.y0 && v.y1 < f.y1) || (v.x0 < pu.x1 && v.x1 > pu.x0)) fallos.push(`${nom}: una ventana fuera de la fachada o sobre la puerta`);
    const ch = caja(c.chimenea), pie = [(c.chimenea[0][0] + c.chimenea[1][0]) / 2, (c.chimenea[0][1] + c.chimenea[1][1]) / 2 - 0.5 * k];
    if (!dentro(pie, c.techo) || !(ch.y0 < t.y0)) fallos.push(`${nom}: la chimenea no sale del tejado`);
    if (!(c.humo[1] < ch.y0 + 0.01 && c.humo[0] > ch.x0 && c.humo[0] < ch.x1)) fallos.push(`${nom}: el humo no sale de la chimenea`);
  }
  eq(fallos, [], 'pulido: las siete casas, en sus cinco tallas y con la luz de cada lado, bien construidas (tejado, hastial, puerta, ventanas, chimenea y humo)');
  // La milpa (campamento 22B): fuera del pueblo; si no cabe ni delante ni al pie del bosque, no hay milpa en ese tamaño.
  const borde = P.bordeLlano({ W: 1440, H: 774, forma: 'esc', by: 708, bx: 466 });
  const cmE = P.campos({ borde, yAbajo: 720, x0: -6, x1: 476, k: 2, vx: 890, evitar: [20, 620], ancho: 1440, techoPueblo: 610 });
  const cmL = P.campos({ borde, yAbajo: 720, x0: -6, x1: 476, k: 2, vx: 890 });
  ok(cmL.milpa && (!cmE.milpa || cmE.milpa.x + cmE.milpa.w < 20 || cmE.milpa.x > 620 || cmE.milpa.y + cmE.milpa.h < 610) && cmE.svg === cmL.svg, `pulido: la milpa no cae detrás ni debajo del pueblo, y los campos se ven igual (${JSON.stringify(cmE.milpa && [cmE.milpa.x, cmE.milpa.y].map(Math.round))})`);
  // El reloj de sol (campamento 16) no pone sus piedritas en la calle del pueblo.
  const A = await import('../app/static/arte.js');
  // (Campamento 39) Las piedritas van en dos trazos: el centro de cada una es su «M x y» más su radio «a».
  const rel = A.relojDeSol(890, 716, 1440, [20, 620]), xs = [...rel.matchAll(/M([\d.]+) [\d.]+a([\d.]+)/g)].map((m) => Number(m[1]) + Number(m[2]));
  ok(xs.length >= 6 && xs.every((x) => x < 16 || x > 624), `pulido: el reloj de sol se estrecha y no pisa la calle del pueblo (${xs.length} piedritas)`);
}

// Campamento 36 · El calendario del pueblo: la misa del domingo (con el padre), el sábado de plaza, el desfile del 15 de septiembre, los
// vecinos frente al nacimiento en Navidad y las estrellitas de Nochebuena y del 31. Cada fecha, otro reparto de los mismos osos.
{
  const almacen = {};
  const raiz = { dataset: {}, atributos: new Set(), estilo: {}, toggleAttribute() {}, style: { setProperty() {} } };
  const ctx = { document: { documentElement: raiz, addEventListener() {}, visibilityState: 'visible' }, localStorage: { getItem: (k) => almacen[k] ?? null, setItem() {}, removeItem() {} }, setInterval() {}, Intl, Date, Math, Number, Object };
  ctx.window = ctx;
  vm.runInNewContext(fs.readFileSync(new URL('../app/static/cielo.js', import.meta.url), 'utf8'), ctx);
  const C = ctx.window.libroCielo, V = await import('../app/static/arte-vecinos.js'), P = await import('../app/static/arte-pueblo.js');
  eq([['2026-10-18', 7.4], ['2026-10-18', 8], ['2026-10-18', 10], ['2026-10-17', 7], ['2026-10-17', 11.9], ['2026-10-17', 12], ['2026-09-15', 9], ['2026-09-15', 12], ['2026-12-10', 19], ['2027-01-06', 19], ['2027-01-07', 19], ['2026-12-24', 18], ['2026-12-24', 23.5], ['2026-12-25', 0.5], ['2026-12-25', 1.5], ['2026-12-31', 20], ['2027-01-01', 0.9]].map(([f, h]) => C.turno(f, h)),
    ['mananaLibre', 'misa', 'mananaLibre', 'mercado', 'mercado', 'tortillas', 'desfile', 'tortillas', 'posada', 'posada', 'pupusas', 'nb-cena', 'nb-misa', 'nb-doce', 'duerme', 'f31-cena', 'f31-doce'], 'pueblo 36: la misa del domingo, el sábado de plaza, el desfile, la posada de Navidad y (41) el guion de Nochebuena y del 31 (hasta la 1:00)');
  const lug = P.lugaresPueblo(P.sitiosPueblo({ W: 1440, H: 774, forma: 'esc', by: 708, bx: 466, pts: [[466, 708], [860, 610], [500, 480], [890, 62]], lago: null, techo: 400, sol: 1 })), quien = (t) => V.reparto(lug, t).map((v) => v.t);
  ok(quien('misa').includes('cura') && quien('misa').filter((t) => t === 'espaldas').length === 2, `pueblo 36: el domingo dos vecinos de espaldas camino de la puerta y el padre en ella (${quien('misa')})`);
  ok(quien('mercado').filter((t) => t === 'vendedora').length === 2 && !quien('mercado').includes('minutero'), 'pueblo 36: el sábado, dos vendedoras con su canasto y más vecinos (sin puestos ni el de las minutas)');
  ok(quien('desfile').includes('abanderado') && quien('desfile').includes('bombo') && /v-vo-azul/.test(V.svgVecinos(V.reparto(lug, 'desfile'))) && !/v-vo-azul/.test(V.svgVecinos(V.reparto(lug, 'tarde'))), 'pueblo 36: el 15 de septiembre, el abanderado con la azul y blanco y el del bombo (el azul, solo ese día)');
  ok(quien('nb-cena').filter((t) => t === 'oseznoLuz').length === 3 && (V.svgVecinos(V.reparto(lug, 'nb-cena')).match(/v-vo-brasa" d="([^"]*)"/)?.[1].match(/M/g) || []).length >= 3, 'pueblo 36 (41): en la cena de Nochebuena, tres oseznos con su estrellita');
  // Frente al nacimiento, con aire: la osa de espaldas no toca el portal (su techo mide 8.6 unidades a cada lado de su centro).
  for (const sol of [1, -1]) {
    const sp = P.sitiosPueblo({ W: 1440, H: 774, forma: 'esc', by: 708, bx: 466, pts: [[466, 708], [860, 610], [500, 480], [890, 62]], lago: null, techo: 400, sol }), pz = sp.piezas.find((q) => q.tipo === 'plaza');
    const k = sp.u * pz.s, w = 30 * k, xp = pz.x + w * 0.42 + w * 0.62, osa = V.reparto(P.lugaresPueblo(sp), 'posada').find((v) => v.t === 'espaldas');
    const c = V.cajaVecino(osa), aire = sol > 0 ? xp - 8.6 * 0.9 * k - c.x1 : c.x0 - (xp + 8.6 * 0.9 * k);
    ok(aire >= 2 * k, `pueblo 36: en Navidad la osa mira el nacimiento con aire (${(aire / k).toFixed(1)} unidades, luz ${sol})`);
  }
}

// Campamento 37 · El pueblo se mueve: un solo actor por turno, en su capa (la que barre por la mañana entre semana, la pelota de la tarde).
{
  const V = await import('../app/static/arte-vecinos.js'), P = await import('../app/static/arte-pueblo.js');
  const lug = P.lugaresPueblo(P.sitiosPueblo({ W: 390, H: 760, forma: 'tel', by: 600, bx: 55, pts: [[55, 600], [232, 540], [120, 470], [242, 327]], lago: { cx: 320, cy: 680, rx: 62, ry: 12 }, techo: 270, sol: 1 }));
  const actores = (t) => V.reparto(lug, t).filter((v) => v.actor).map((v) => `${v.t}:${v.actor}`);
  eq(['manana', 'tarde', 'mananaLibre', 'misa', 'pupusas', 'duerme'].map((t) => actores(t).join()), ['escoba:barre', 'pelota:pelota', '', '', '', ''], 'pueblo 37: un solo actor por turno: la que barre entre semana por la mañana y la pelota de la tarde');
}

// Campamento 38 · Lo que cambia de la app de hoy: el pescador del cayuco es un oso (120) y la descripción de la montaña dice «osos» (121).
{
  const L = await import('../app/static/lib.js'), A = await import('../app/static/arte-valle.js');
  const tv = L.textoValle({ luces: 3 }), sin = L.textoValle({ luces: 3, milpa: false });
  ok(/En el pueblo, los vecinos son osos polares\./.test(tv) && !/\b(tu|tus|tú)\b/i.test(tv) && /con su milpa/.test(tv) && !/milpa/.test(sin), 'pueblo 38: la descripción de la montaña dice que los vecinos son osos polares (sin tutear) y nombra la milpa solo si está');
  const vl = A.vidaLago({ cx: 300, cy: 600, rx: 80, ry: 12, k: 1.4 });
  ok(/class="v-cy-cuerpo v-cy-oso"/.test(vl) && /class="v-cy-cuerpo v-cy-sombrero"/.test(vl) && !/style=|NaN/.test(vl), 'pueblo 38: el pescador del cayuco es un oso con su sombrero (y de noche, como siempre, se esconde con el cayuco)');
}

// Campamento 39 · Hacer sitio 2: los cohetes solo en su hora (125), las luciérnagas más livianas (127) y el reloj de sol en dos trazos (128).
{
  const almacen = {};
  const raiz = { dataset: {}, atributos: new Set(), toggleAttribute(k, on) { if (on) this.atributos.add(k); else this.atributos.delete(k); }, style: { setProperty() {} } };
  const avisos = [];
  const ctx = { document: { documentElement: raiz, addEventListener() {}, visibilityState: 'visible' }, localStorage: { getItem: (k) => almacen[k] ?? null, setItem() {}, removeItem() {} }, setInterval() {}, Intl, Date, Math, Number, Object, Event: class { constructor(t) { this.type = t; } }, dispatchEvent: (ev) => avisos.push(ev.type) };
  ctx.window = ctx;
  almacen['libro.dia'] = '2026-12-24'; almacen['libro.hora'] = '21';
  vm.runInNewContext(fs.readFileSync(new URL('../app/static/cielo.js', import.meta.url), 'utf8'), ctx);
  const C = ctx.window.libroCielo;
  eq([['2026-12-24', 23.6], ['2026-12-24', 23.67], ['2026-12-25', 0.2], ['2026-12-25', 0.66], ['2026-12-25', 0.67], ['2026-12-31', 23.7], ['2027-01-01', 0.5], ['2026-12-30', 23.9], ['2026-12-25', 23.9]].map(([f, h]) => C.cohetesPuestos(f, h)),
    [false, true, true, true, false, true, true, false, false], 'sitio 39: los cohetes se ponen a las 23:40 del 24 y del 31 y se quitan a las 0:40');
  for (const [d, h] of [['2026-12-24', 23.5], ['2026-12-24', 23.75], ['2026-12-24', 23.9], ['2026-12-25', 0.5], ['2026-12-25', 0.75]]) { almacen['libro.dia'] = d; almacen['libro.hora'] = String(h); C.aplicar(); }
  eq(avisos.filter((x) => x === 'libro:cohetes').length, 2, 'sitio 39: un aviso «libro:cohetes» al ponerlos (23:45) y otro al quitarlos (0:45), ninguno más');
  const A = await import('../app/static/arte.js');
  const co = A.cohetes(390, 500, 1.25, 120), vacio = A.cohetes(390, 500, 1.25, 120, false);
  ok((co.match(/<(path|circle)/g) ?? []).length > 20 && !/<(path|circle)/.test(vacio) && /data-cw="390" data-cs="500" data-ck="1.25" data-ca="120"/.test(vacio), 'sitio 39: fuera de su hora el grupo de los cohetes va vacío, con sus medidas para ponerlos');
  const lu = A.luciernagas({ W: 390, H: 664 });
  ok((lu.match(/<(g|circle|path)/g) ?? []).length === 25 && (lu.match(/fill="url\(#m-lu\)"/g) ?? []).length === 12 && !/NaN|style=/.test(lu), 'sitio 39: doce luciérnagas, dos nodos cada una (el grupo que brilla y el círculo que vuela)');
  const rel = A.relojDeSol(200, 500, 390);
  ok((rel.match(/class="reloj-piedra"/g) ?? []).length === 1 && (rel.match(/class="reloj-piedra reloj-medio"/g) ?? []).length === 1 && (rel.match(/M/g) ?? []).length === 11 + 1, 'sitio 39: el reloj de sol, sus once piedritas en dos trazos');
}

// Campamento 41 · La Navidad entera: cada fecha, su guion por turnos, su franja de fiesta y su reparto (sin NaN, en cada tamaño y luz).
{
  const almacen = {};
  const raiz = { dataset: {}, atributos: new Set(), toggleAttribute() {}, style: { setProperty() {} } };
  const avisos = [];
  const ctx = { document: { documentElement: raiz, addEventListener() {}, visibilityState: 'visible' }, localStorage: { getItem: (k) => almacen[k] ?? null, setItem() {}, removeItem() {} }, setInterval() {}, Intl, Date, Math, Number, Object, Event: class { constructor(t) { this.type = t; } }, dispatchEvent: (ev) => avisos.push(ev.type) };
  ctx.window = ctx;
  almacen['libro.dia'] = '2026-12-24'; almacen['libro.hora'] = '12';
  vm.runInNewContext(fs.readFileSync(new URL('../app/static/cielo.js', import.meta.url), 'utf8'), ctx);
  const C = ctx.window.libroCielo;
  const dia = (f, hs) => hs.map((h) => C.turno(f, h));
  eq(dia('2026-12-24', [3, 4.5, 6.9, 7, 11.4, 11.5, 17.7, 17.75, 20.9, 21, 23.6, 23.67]), ['duerme', 'nb-madruga', 'nb-madruga', 'nb-compras', 'nb-compras', 'nb-tamales', 'nb-tamales', 'nb-cena', 'nb-cena', 'nb-misa', 'nb-misa', 'nb-doce'], 'fiesta 41: Nochebuena, el día entero (pan, compras, tamales, cena, misa de gallo y las doce desde las 23:40)');
  eq(dia('2026-12-25', [0.9, 1, 6.9, 7, 9, 12, 14, 17.75, 21.9, 22]), ['nb-doce', 'duerme', 'duerme', 'n25-polvora', 'n25-estrena', 'n25-recalentado', 'n25-paseo', 'n25-fresca', 'n25-fresca', 'duerme'], 'fiesta 41: Navidad (nadie hasta las 7:00; estrenos, recalentado, paseo y la fresca)');
  eq(dia('2026-12-31', [4.9, 5, 11.5, 17.75, 22.9, 23, 23.99]).concat(dia('2027-01-01', [0.5, 1, 8.9, 9, 12, 17.75, 22])), ['duerme', 'f31-limpia', 'f31-estreno', 'f31-cena', 'f31-cena', 'f31-espera', 'f31-espera', 'f31-doce', 'e1-polvora', 'e1-polvora', 'e1-barre', 'e1-visitas', 'e1-fresca', 'duerme'], 'fiesta 41: el 31 (la espera desde las 23:00) y el 1 (el abrazo de las doce y nadie hasta las 9:00)');
  eq(dia('2027-01-06', [13.9, 14, 17.7, 17.75]).concat(dia('2027-01-07', [15])), ['siesta', 'e6-guarda', 'e6-guarda', 'posada', 'tarde'], 'fiesta 41: el 6 por la tarde se guarda la Navidad; el 7 ya es un día cualquiera');
  // Que no dependa del día de la semana: un 24 y un 31 en domingo (2028) y un 24 en sábado (2033) siguen su guion, no la misa ni la plaza.
  eq([['2028-12-24', 8], ['2028-12-31', 8], ['2033-12-24', 9], ['2028-12-24', 9.5]].map(([f, h]) => C.turno(f, h)), ['nb-compras', 'f31-limpia', 'nb-compras', 'nb-compras'], 'fiesta 41: un domingo o un sábado de fiesta sigue el guion de la fiesta');
  eq([17.7, 17.75, 20.9, 21, 23.6, 23.7].map((h) => C.mueve('2026-12-24', h)).concat([0.9, 1].map((h) => C.mueve('2026-12-25', h)), [9, 11.9, 12].map((h) => C.mueve('2026-12-25', h)), [17.75, 22.9, 23].map((h) => C.mueve('2026-12-31', h)), [0.5, 1.5].map((h) => C.mueve('2027-01-01', h))),
    ['pericos', 'brinda', 'brinda', 'fiesta', 'fiesta', 'chispea', 'chispea', 'luciernagas', 'pelota', 'pelota', 'teleferico', 'brinda', 'brinda', 'fiesta', 'chispea', 'luciernagas'], 'fiesta 41 (210): la noche del 24 y del 31 es de la fiesta (brinda uno, la misa y la espera quietas, a las doce chispea un volcancito) y las luciérnagas descansan; el 25, la pelota nueva por la mañana');
  eq(['2026-12-24', '2026-12-25', '2026-12-31', '2027-01-01', '2027-01-06', '2026-12-26'].map(C.festivo), ['nochebuena', 'navidad', 'fin', 'anio', 'reyes', ''], 'fiesta 41: html[data-festivo] el día entero');
  // El reparto: en cada tamaño (teléfono, acostado, tablet, escritorio, tele) y con la luz de cada lado, la figura clave de cada turno sale.
  const V = await import('../app/static/arte-vecinos.js'), P = await import('../app/static/arte-pueblo.js');
  const CLAVE = { 'nb-madruga': 'panadero', 'nb-compras': 'escalera', 'nb-tamales': 'tamales', 'nb-cena': 'brindis', 'nb-misa': 'cura', 'nb-doce': 'abrazo', 'n25-polvora': 'polvora', 'n25-estrena': 'oseznoJuguete', 'n25-recalentado': 'sentado', 'n25-paseo': 'hombros', 'n25-fresca': 'pupusera', 'f31-limpia': 'tendedero', 'f31-estreno': 'volcancitoApagado', 'f31-cena': 'brindis', 'f31-espera': 'espaldas', 'f31-doce': 'abrazo', 'e1-polvora': 'polvora', 'e1-barre': 'escoba', 'e1-visitas': 'vecina', 'e1-fresca': 'sentado', 'e6-guarda': 'escalera' };
  const FORMAS = [
    { W: 320, H: 640, forma: 'tel', by: 505, bx: 45, pts: [[45, 505], [190, 455], [95, 395], [200, 275]], lago: { cx: 268, cy: 590, rx: 50, ry: 10 }, techo: 225 },
    { W: 390, H: 760, forma: 'tel', by: 600, bx: 55, pts: [[55, 600], [232, 540], [120, 470], [242, 327]], lago: { cx: 320, cy: 680, rx: 62, ry: 12 }, techo: 270 },
    { W: 844, H: 390, forma: 'acostado', by: 360, bx: 430, pts: [[430, 360], [700, 300], [520, 230], [590, 140]], lago: null, techo: 120 },
    { W: 768, H: 900, forma: 'tab', by: 760, bx: 150, pts: [[150, 760], [520, 650], [260, 520], [470, 330]], lago: { cx: 640, cy: 830, rx: 100, ry: 14 }, techo: 300 },
    { W: 1440, H: 774, forma: 'esc', by: 708, bx: 466, pts: [[466, 708], [860, 610], [500, 480], [890, 62]], lago: null, techo: 400 },
    { W: 2560, H: 1440, forma: 'esc', by: 1318, bx: 900, pts: [[900, 1318], [1600, 1100], [980, 880], [1560, 230]], lago: null, techo: 600 },
  ];
  const fallos = [];
  for (const c of FORMAS) for (const sol of [1, -1]) {
    const lug = P.lugaresPueblo(P.sitiosPueblo({ ...c, sol }));
    for (const [t, clave] of Object.entries(CLAVE)) {
      const l = V.reparto(lug, t), svg = V.svgVecinos(l, { sol }), actores = l.filter((v) => v.actor);
      if (!l.some((v) => v.t === clave)) fallos.push(`${c.W}/${c.forma} ${t}: falta ${clave}`);
      if (/NaN|undefined|Infinity|style=/.test(svg)) fallos.push(`${c.W} ${t}: el SVG`);
      if (actores.length > 1) fallos.push(`${c.W} ${t}: ${actores.length} actores`);
      if ((t === 'nb-cena' || t === 'f31-cena') && !l.some((v) => v.t === (c.forma === 'tel' || c.forma === 'acostado' ? 'mesaCorta' : 'mesa'))) fallos.push(`${c.W} ${t}: la mesa`);
    }
  }
  eq(fallos, [], 'fiesta 41: en cada tamaño y luz, cada turno de la Navidad con su figura clave, un solo actor y ningún NaN en sus trazos (la mesa corta en el teléfono)');
  ok(['nb-cena', 'f31-cena'].every((t) => V.reparto(P.lugaresPueblo(P.sitiosPueblo({ ...FORMAS[4], sol: 1 })), t).find((v) => v.actor)?.actor === 'brinda') && V.reparto(P.lugaresPueblo(P.sitiosPueblo({ ...FORMAS[4], sol: 1 })), 'nb-doce').find((v) => v.actor)?.actor === 'chispea', 'fiesta 41: en la cena brinda uno y a las doce chispea un volcancito (cada uno, el actor de su franja)');
}

// Campamento 51 · El director del valle: el foco del momento (223), la escalera de rareza (224), el mapa del día (225), el movimiento con
// un solo dueño (226), mañana no es igual que hoy (227), la frase del foco (228) y los ambientales (F3). Todo sale de la fecha y la hora.
{
  const raiz = { dataset: {}, atributos: new Set(), toggleAttribute(k, on) { if (on) this.atributos.add(k); else this.atributos.delete(k); }, style: { setProperty() {} } };
  const almacen = {};
  const ctx = { document: { documentElement: raiz, addEventListener() {}, visibilityState: 'visible' }, localStorage: { getItem: (k) => almacen[k] ?? null, setItem: (k, v) => { almacen[k] = String(v); }, removeItem: (k) => { delete almacen[k]; } }, setInterval() {}, Intl, Date, Math, Number, Object };
  ctx.window = ctx;
  vm.runInNewContext(fs.readFileSync(new URL('../app/static/cielo.js', import.meta.url), 'utf8'), ctx);
  const C = ctx.window.libroCielo;
  const dias = [];
  for (let t = Date.UTC(2026, 0, 1); t <= Date.UTC(2027, 11, 31); t += 864e5) dias.push(new Date(t).toISOString().slice(0, 10));
  // 224: cada foco declara su peldaño y lo que pesa; la tabla va de lo más raro a lo más común.
  const pel = C.focos.map((f) => C.rareza.indexOf(f.rareza));
  ok(C.focos.every((f) => f.id && C.rareza.includes(f.rareza) && typeof f.cuando === 'function' && typeof f.delDia === 'function' && f.pesa && f.pesa.nodos === 0) && pel.every((x, i) => !i || x <= pel[i - 1]), `director 224: cada foco con su peldaño, su cuándo y lo que pesa (0 nodos), de lo más raro a lo más común (${C.focos.map((f) => `${f.id}:${f.rareza}`).join(' ')})`);
  // 223: un foco por momento; dos raros (de mes o más) a la vez solo si el choque está declarado (manda el primero de la tabla).
  const choques = new Set(), noDecl = new Set();
  let delDiaMal = 0;
  for (const f of dias) {
    for (let q = 0; q < 96; q++) {
      const h = q / 4, raros = C.focos.filter((x) => C.rareza.indexOf(x.rareza) >= 2 && x.cuando(f, h)).map((x) => x.id);
      for (let i = 0; i < raros.length; i++) for (let j = i + 1; j < raros.length; j++) { const par = `${raros[i]}+${raros[j]}`; choques.add(par); if (!C.choques.some(([a, b]) => a === raros[i] && b === raros[j])) noDecl.add(par); }
      const fo = C.foco(f, h);
      for (const x of C.focos) if (x.cuando(f, h) && !x.delDia(h < 5 && x.id === 'luna' ? new Date(Date.parse(`${f}T12:00:00Z`) - 864e5).toISOString().slice(0, 10) : f)) delDiaMal++;
      if (fo.id !== (C.focos.find((x) => x.cuando(f, h))?.id ?? 'rutina')) delDiaMal++;
    }
  }
  eq([...noDecl], [], `director 223: en dos años, cada cuarto de hora, nunca dos focos raros a la vez sin declarar (declarados y vistos: ${[...choques].join(', ')})`);
  eq(delDiaMal, 0, 'director 223: el foco del momento es el primero de la tabla que está, y un foco que está a una hora lo está ese día');
  const nb = C.director('2026-12-24', 19), dom = C.director('2026-11-29', 8.5), mie = C.director('2026-11-25', 12), cruz = C.director('2027-05-03', 12), luna = C.director('2026-12-23', 21);
  eq([nb.foco, nb.mueve, nb.turno, dom.foco, dom.mueve, mie.foco, mie.rareza, cruz.foco], ['navidad', 'brinda', 'nb-cena', 'misa', 'gallinas', 'rutina', 'dia', 'cruz'], 'director 223: Nochebuena a las 19 es la fiesta (brinda uno), el domingo la misa (y las gallinas siguen: la misa no trae a nadie), un miércoles la rutina, el 3 de mayo la Cruz');
  ok(['luna', 'posada'].includes(luna.foco) && C.director('2026-12-24', 21).foco === 'navidad', `director 223: la noche de luna llena del 23 de diciembre de 2026 (${luna.foco}) y, el 24, manda la fiesta aunque haya luna llena`);
  // 226: el movimiento tiene un solo dueño (el foco que trae a alguien; si no, la rutina), y es lo mismo de antes en todas las franjas.
  let mueveMal = 0;
  for (const f of dias) for (let q = 0; q < 288; q++) {
    const h = q / 12, quien = C.focos.find((x) => x.mueve && x.cuando(f, h) && x.mueve(f, h) !== null);
    if (C.mueve(f, h) !== (quien ? quien.mueve(f, h) : C.mueveRutina(f, h))) mueveMal++;
  }
  eq(mueveMal, 0, 'director 226: lo que se mueve es del primer foco que trae a alguien; si ninguno, de la rutina (dos años, cada cinco minutos)');
  eq([C.mueve('2027-05-18', 8), C.mueveRutina('2027-05-18', 8), C.mueve('2026-10-20', 14.5), C.mueveRutina('2026-10-20', 14.5), C.mueve('2026-12-25', 10), C.mueve('2026-12-25', 15.5)], ['zompopos', 'gallinas', 'azacuanes', 'perro', 'pelota', 'pelota'], 'director 226: los zompopos y los azacuanes relevan a las gallinas y al perro; el 25 la pelota nueva es de la fiesta');
  // 227: mañana no es igual que hoy: ni ayer ni el mismo día de la semana pasada; cada semana (de lunes a domingo), al menos cuatro distintas.
  const r = dias.map(C.rutinaDelDia);
  let repite = 0, pocas = 0;
  for (let i = 1; i < r.length; i++) if (r[i] === r[i - 1] || (i >= 7 && r[i] === r[i - 7])) repite++;
  for (let i = dias.indexOf('2026-01-05'); i + 7 <= r.length; i += 7) if (new Set(r.slice(i, i + 7)).size < 4) pocas++;
  ok(repite === 0 && pocas === 0 && C.rutinas.every((x) => r.filter((y) => y === x).length > 90) && r.every((x) => C.rutinas.includes(x)), `director 227: la rutina del día nunca repite la de ayer ni la del mismo día de la semana pasada, cada semana trae al menos cuatro y todas salen (${C.rutinas.map((x) => `${x} ${r.filter((y) => y === x).length}`).join(', ')})`);
  ok(dias.map(C.rutinaDelDia).join() === r.join() && C.director('2026-11-29', 8.5).foco === 'misa' && C.director('2026-11-28', 9).foco === 'mercado', 'director 227: la rutina sale solo de la fecha (igual en cada llamada), y la misa y el sábado de plaza no entran en la baraja');
  // 228: la frase del foco solo en lo raro y sin «tú» ni verbos de mandar; la de la rutina, para la descripción.
  const frases = dias.map(C.fraseDelFoco).filter(Boolean), rutinas = C.rutinas.map((x) => C.fraseRutina(dias.find((f) => C.rutinaDelDia(f) === x)));
  const mandar = /\b(tu|tus|tú|te|compra|compre|comprar|abre|mira|mire|ven|entra|no te pierdas|aprovecha)\b/i;
  ok(frases.length >= 10 && frases.length <= 70 && [...frases, ...rutinas].every((t) => t.length < 110 && !mandar.test(t) && /\.$/.test(t)), `director 228: la línea de hoy cuenta lo raro (${frases.length} días en dos años) y nada manda ni tutea; seis frases de la rutina`);
  eq([C.fraseDelFoco('2026-11-25'), Boolean(C.fraseDelFoco('2026-12-24')), Boolean(C.fraseDelFoco('2026-10-10')), C.fraseDelFoco('2026-10-11'), Boolean(C.fraseDelFoco('2026-09-15'))], [null, true, true, null, true], 'director 228: un miércoles cualquiera, nada; Nochebuena, el primer día de los azacuanes (no el segundo) y el 15 de septiembre, sí');
  // F3: los ambientales, hasta tres; de noche ninguno; cada uno con lo que pesa, y el mapa del día lo reparte sin pasarse.
  let ambMal = 0;
  for (const f of dias.slice(0, 366)) for (const ancho of [false, true]) for (const tr of C.mapaDelDia(f, ancho)) {
    if (tr.capasAmb > C.maxAmbientales || tr.anim > 3 || ((tr.desde >= 20 || tr.desde < 5) && tr.ambiente.length)) ambMal++;
  }
  eq([ambMal, C.ambiente('2026-11-25', 12).join(' '), C.ambiente('2026-11-25', 6).join(' '), C.ambiente('2026-11-25', 18).join(' '), C.ambiente('2026-11-25', 21).join(' '), C.ambiente('2026-11-25', 3).join(' ')], [0, 'humo cayuco', 'humo cayuco', 'humo', '', ''], 'director F3: humo de 5 a 20 y el cayuco de 5 a 16:30, ninguno de noche, y en el mapa de un año ningún tramo pasa de tres ambientales ni de tres animaciones por capa');
  const mapa = C.mapaDelDia('2026-11-25'), mapaA = C.mapaDelDia('2026-11-25', true);
  ok(mapa[0].desde === 0 && mapa.at(-1).hasta === 24 && mapa.every((t, i) => !i || t.desde === mapa[i - 1].hasta) && mapa.find((t) => t.desde <= 12 && t.hasta > 12).capasAmb === 2 && mapaA.find((t) => t.desde <= 12 && t.hasta > 12).capasAmb === 3, 'director 225: el mapa del día cubre las 24 horas sin huecos; a mediodía, dos ambientales en el teléfono y tres en pantalla ancha (dos chimeneas)');
  // `aplicar` deja el foco y los ambientales en <html>.
  almacen['libro.dia'] = '2026-12-24'; almacen['libro.hora'] = '19'; C.aplicar();
  const a1 = { ...raiz.dataset };
  almacen['libro.dia'] = '2026-11-18'; almacen['libro.hora'] = '23'; C.aplicar();
  const a2 = { ...raiz.dataset };
  delete almacen['libro.dia']; delete almacen['libro.hora'];
  eq([a1.foco, a1.ambiente, a1.mueve, a2.foco, a2.ambiente], ['navidad', 'humo', 'brinda', `rutina-${C.rutinaDelDia('2026-11-18')}`, undefined], 'director: <html> lleva data-foco y data-ambiente (de noche, sin ambientales)');
}

// Campamento 40 · El día entero del pueblo: turnos nuevos (antes del alba, la tortillera, la salida de la escuela, la hamaca, la vuelta
// del cantón, la fresca), la carta del día (141), la fila del fin de semana (142), la ropa tendida (143), el perro (145), las sombras
// (146), las luces una a una (147) y la frase del turno (148). Nada se mueve: otro reparto de los mismos trazos.
{
  const raiz = { style: { setProperty() {} }, dataset: {}, toggleAttribute() {}, removeAttribute() {} }, almacen = {};
  const ctx = { document: { documentElement: raiz, addEventListener() {}, visibilityState: 'visible' }, localStorage: { getItem: (k) => almacen[k] ?? null, setItem() {}, removeItem() {} }, setInterval() {}, Intl, Date, Math, Number, Object };
  ctx.window = ctx;
  vm.runInNewContext(fs.readFileSync(new URL('../app/static/cielo.js', import.meta.url), 'utf8'), ctx);
  const C = ctx.window.libroCielo, V = await import('../app/static/arte-vecinos.js'), P = await import('../app/static/arte-pueblo.js'), L = await import('../app/static/lib.js');
  // La escuela: entre semana fuera de vacaciones; el 15 de septiembre, no.
  eq(['2027-02-10', '2027-02-13', '2027-02-14', '2026-11-25', '2026-09-15'].map(C.escuela), [true, false, false, false, false], 'pueblo 40: hay escuela entre semana fuera de vacaciones (y no el 15 de septiembre)');
  // 146 y 147: las sombras y las luces, por turnos.
  eq([4.9, 5, 6.9, 7, 11.4, 11.5, 13.9, 14, 15.9, 16, 17.7, 17.75, 21].map(C.sombraDelPueblo), ['', 'larga', 'larga', '', '', 'corta', 'corta', '', '', 'larga', 'larga', '', ''], 'pueblo 146: las sombras, largas al amanecer y al caer la tarde, cortas a mediodía');
  eq([12, 16.4, 16.5, 17.7, 17.75, 17.99, 18, 18.2, 18.25, 21.9, 22, 22.9, 23, 3, 4.9, 5].map((h) => C.lucesDelPueblo('2027-02-10', h)), ['', '', 'ninguna', 'ninguna', 'templo', 'templo', 'iglesia', 'iglesia', '', '', 'iglesia', 'iglesia', 'faroles', 'faroles', 'horno', ''], 'pueblo 147 (52): la iglesia (el sacristán), los faroles y las ventanas, una a una; de noche se apagan al revés; antes del alba, solo el horno');
  eq([['2026-12-24', 22.5], ['2026-12-24', 23.9], ['2026-12-25', 0.5], ['2026-12-31', 23.5], ['2027-01-01', 0.5], ['2026-12-25', 3], ['2026-12-24', 17]].map(([f, h]) => C.lucesDelPueblo(f, h)), ['', '', '', '', '', 'faroles', ''], 'pueblo 147: las noches de fiesta (la misa de gallo, la espera, las doce) el pueblo no se apaga');
  // 141: la carta del día gira: nunca la de ayer ni la del mismo día de la semana pasada; sin fecha, la 0 (el reparto de antes).
  let repite = 0;
  for (const t of ['manana', 'tortillas', 'tarde', 'pupusas', 'fresca', 'siesta', 'amanece']) for (const nn of [2, 3]) {
    const cs = Array.from({ length: 400 }, (_, i) => V.carta(new Date(Date.UTC(2026, 0, 1) + i * 864e5).toISOString().slice(0, 10), t, nn));
    for (let i = 1; i < cs.length; i++) if (cs[i] === cs[i - 1] || (i >= 7 && cs[i] === cs[i - 7])) repite++;
  }
  ok(repite === 0 && V.carta('', 'manana', 3) === 0, 'pueblo 141: la carta del día nunca repite la de ayer ni la de hace una semana; sin fecha, la de siempre');
  // En seis tamaños, con la luz de cada lado, cada turno del día, cada carta (dos semanas: todos los días de la semana) y con o sin escuela:
  // ocho figuras como mucho, sin NaN ni estilos, uno por tono, el actor de siempre y nadie encima del perro.
  const CONF = [
    { W: 320, H: 640, forma: 'tel', by: 505, bx: 45, pts: [[45, 505], [190, 455], [95, 395], [200, 275]], lago: { cx: 268, cy: 590, rx: 50, ry: 10 }, techo: 225 },
    { W: 390, H: 760, forma: 'tel', by: 600, bx: 55, pts: [[55, 600], [232, 540], [120, 470], [242, 327]], lago: { cx: 320, cy: 680, rx: 62, ry: 12 }, techo: 270 },
    { W: 768, H: 900, forma: 'tab', by: 760, bx: 150, pts: [[150, 760], [520, 650], [260, 520], [470, 330]], lago: { cx: 640, cy: 830, rx: 100, ry: 14 }, techo: 300 },
    { W: 1440, H: 774, forma: 'esc', by: 708, bx: 466, pts: [[466, 708], [860, 610], [500, 480], [890, 62]], lago: null, techo: 400 },
    { W: 844, H: 390, forma: 'acostado', by: 360, bx: 430, pts: [[430, 360], [700, 300], [520, 230], [590, 140]], lago: null, techo: 120 },
    { W: 2560, H: 1440, forma: 'esc', by: 1318, bx: 900, pts: [[900, 1318], [1600, 1100], [980, 880], [1560, 230]], lago: null, techo: 600 },
  ];
  const ACTOR = { manana: 'barre', tarde: 'pelota', vuelta: 'pelota' }, fallos = [], vistos = { tendedero: 0, tendederoJueves: 0, hamaca: 0, tortillera: 0, oseznoBolson: 0, perro: 0, finde: 0 };
  const dias = Array.from({ length: 14 }, (_, i) => new Date(Date.UTC(2027, 1, 7) + i * 864e5).toISOString().slice(0, 10)).concat(['2026-07-06', '2026-07-09', '2026-12-10']);
  for (const c of CONF) for (const sol of [1, -1]) {
    const lug = P.lugaresPueblo(P.sitiosPueblo({ ...c, sol }));
    for (const t of ['alba', 'amanece', 'manana', 'mananaLibre', 'tortillas', 'salida', 'siesta', 'tarde', 'vuelta', 'pupusas', 'posada', 'fresca']) for (const dia of dias) for (const escuela of [true, false]) {
      const l = V.reparto(lug, t, { dia, escuela, hilos: 2 }), fig = l.filter((v) => !V.COSAS.has(v.t)), svg = V.svgVecinos(l, { sol });
      const dd = `${c.W} ${sol} ${t} ${dia}`;
      if (fig.length > V.MAX_VECINOS) fallos.push(`${dd}: ${fig.length} figuras`);
      if (/style=|NaN|undefined/.test(svg) || (svg.match(/<path/g) || []).length > V.TONOS.length + 1) fallos.push(`${dd}: el SVG`);
      if (l.some((v) => !V.PERSONAJES.includes(v.t) || !Number.isFinite(v.x + v.y + v.k))) fallos.push(`${dd}: alguien sin sitio`);
      const act = l.filter((v) => v.actor).map((v) => v.actor);
      if (act.join() !== (ACTOR[t] ?? '')) fallos.push(`${dd}: actor ${act}`);
      const perros = l.filter((v) => v.t === 'perroEchado');
      if (perros.length !== (V.PERRO_TURNOS.includes(t) && lug.perro.length ? 1 : 0)) fallos.push(`${dd}: ${perros.length} perros`);
      // Nadie de pie encima del perro (bajo la hamaca va a propósito) ni de la ropa tendida.
      for (const q of l.filter((v) => (v.t === 'perroEchado' || v.t.startsWith('tendedero')))) {
        const a = V.cajaVecino(q), m = 0.35 * q.k;
        if (fig.some((v) => v.t !== 'hamaca' && (() => { const b = V.cajaVecino(v); return a.x0 < b.x1 - m && a.x1 > b.x0 + m && a.y0 < b.y1 - m && a.y1 > b.y0 + m; })())) fallos.push(`${dd}: alguien encima de ${q.t}`);
      }
      for (const k of Object.keys(vistos)) if (l.some((v) => v.t === k)) vistos[k]++;
      if (perros.length) vistos.perro++;
      if (t === 'pupusas' && fig.length >= 7) vistos.finde++;
    }
  }
  eq(fallos.slice(0, 8), [], 'pueblo 40: cada turno del día, cada carta, seis tamaños y la luz de cada lado: ocho como mucho, sin NaN, el actor de siempre y nadie encima del perro ni de la ropa');
  ok(Object.values(vistos).every((x) => x > 0), `pueblo 40: salen la tortillera, los oseznos con su bolsón, la hamaca, el perro, la ropa del lunes y la del jueves y la fila del fin de semana (${JSON.stringify(vistos)})`);
  // 143: la ropa, solo lunes y jueves; en la lluviosa se recoge al empezar la siesta.
  const lug = P.lugaresPueblo(P.sitiosPueblo({ ...CONF[3], sol: 1 })), hay = (t, dia) => V.reparto(lug, t, { dia }).some((v) => v.t.startsWith('tendedero'));
  eq([hay('manana', '2027-02-08'), hay('manana', '2027-02-11'), hay('manana', '2027-02-09'), hay('tarde', '2027-02-08'), hay('vuelta', '2027-02-08'), hay('siesta', '2026-07-06'), hay('tortillas', '2026-07-06')], [true, true, false, true, false, false, true], 'pueblo 143: la ropa tendida lunes y jueves hasta las 16:00 (en la lluviosa, hasta la siesta)');
  // 142: el viernes hay más fila que el miércoles.
  const fila = (dia) => V.reparto(lug, 'pupusas', { dia }).filter((v) => !V.COSAS.has(v.t)).length;
  ok(fila('2027-02-12') > fila('2027-02-10'), `pueblo 142: el fin de semana, más fila en las pupusas (${fila('2027-02-10')} → ${fila('2027-02-12')})`);
  // 144: la del cantón va donde se le diga (montana.js decide el sitio); sin sitio, no sale.
  const canton = [100, 200, 3, -1];
  ok(V.reparto(lug, 'amanece', { canton }).some((v) => v.canton && v.x === 100) && !V.reparto(lug, 'amanece', {}).some((v) => v.canton) && !V.reparto(lug, 'manana', { canton }).some((v) => v.canton), 'pueblo 144: la que baja del cantón, solo al amanecer y en la vuelta, y solo si tiene sitio en el camino');
  // 138: en Navidad no hay hamaca (el pino y el nacimiento ocupan la plaza): la siesta de siempre en la banca.
  ok(V.reparto(lug, 'siesta', { dia: '2027-02-10' }).some((v) => v.t === 'hamaca') && V.reparto(lug, 'siesta', { dia: '2026-12-10' }).some((v) => v.t === 'siesta'), 'pueblo 138: la hamaca, salvo en Navidad');
  // 148: la frase de cada turno, sin tutear ni mandar; los de fiesta no llevan.
  const mandar = /\b(tu|tus|tú|te|compra|compre|comprar|abre|mira|mire|ven|entra|aprovecha)\b/i, fr = Object.values(L.FRASE_TURNO);
  ok(fr.length >= 14 && fr.every((t) => t.length < 100 && !mandar.test(t) && /\.$/.test(t)) && L.textoValle({ turno: 'pupusas' }).endsWith('En el pueblo es hora de pupusas.') && !/undefined/.test(L.textoValle({ turno: 'nb-cena' })), 'pueblo 148: la descripción cuenta el turno, sin tutear');
}

// Campamento 52 · Vecinos con oficio: ocho vecinos de siempre con su color y su prenda (230), su recorrido por horas (231–234), los
// encuentros (235), el recado del día (236), las cosas de cada quien (237) y la semana de cada oficio (238). 0 nodos: los mismos tonos.
{
  const raiz = { style: { setProperty() {} }, dataset: {}, toggleAttribute() {}, removeAttribute() {} }, almacen = {};
  const ctx = { document: { documentElement: raiz, addEventListener() {}, visibilityState: 'visible' }, localStorage: { getItem: (k) => almacen[k] ?? null, setItem() {}, removeItem() {} }, setInterval() {}, Intl, Date, Math, Number, Object };
  ctx.window = ctx;
  vm.runInNewContext(fs.readFileSync(new URL('../app/static/cielo.js', import.meta.url), 'utf8'), ctx);
  const C = ctx.window.libroCielo, V = await import('../app/static/arte-vecinos.js'), P = await import('../app/static/arte-pueblo.js'), L = await import('../app/static/lib.js');
  const CONF = [
    { W: 320, H: 640, forma: 'tel', by: 505, bx: 45, pts: [[45, 505], [190, 455], [95, 395], [200, 275]], lago: { cx: 268, cy: 590, rx: 50, ry: 10 }, techo: 225 },
    { W: 390, H: 760, forma: 'tel', by: 600, bx: 55, pts: [[55, 600], [232, 540], [120, 470], [242, 327]], lago: { cx: 320, cy: 680, rx: 62, ry: 12 }, techo: 270 },
    { W: 768, H: 900, forma: 'tab', by: 760, bx: 150, pts: [[150, 760], [520, 650], [260, 520], [470, 330]], lago: { cx: 640, cy: 830, rx: 100, ry: 14 }, techo: 300 },
    { W: 1440, H: 774, forma: 'esc', by: 708, bx: 466, pts: [[466, 708], [860, 610], [500, 480], [890, 62]], lago: null, techo: 400 },
    { W: 844, H: 390, forma: 'acostado', by: 360, bx: 430, pts: [[430, 360], [700, 300], [520, 230], [590, 140]], lago: null, techo: 120 },
    { W: 2560, H: 1440, forma: 'esc', by: 1318, bx: 900, pts: [[900, 1318], [1600, 1100], [980, 880], [1560, 230]], lago: null, techo: 600 },
  ];
  const TURNOS = ['alba', 'amanece', 'manana', 'mananaLibre', 'tortillas', 'salida', 'siesta', 'tarde', 'vuelta', 'pupusas', 'posada', 'fresca', 'misa', 'mercado'];
  const HORAS = [null, 4.7, 5.2, 6, 6.9, 7.1, 8, 9.2, 9.6, 10.5, 11.8, 12.2, 13, 15, 15.5, 16.2, 16.9, 17.5, 19, 20.5, 21.5];
  const dias = Array.from({ length: 14 }, (_, i) => new Date(Date.UTC(2027, 1, 7) + i * 864e5).toISOString().slice(0, 10));
  const choque = (a, b, m) => a.x0 < b.x1 - m && a.x1 > b.x0 + m && a.y0 < b.y1 - m && a.y1 > b.y0 + m;
  // 230: cada uno con su color en todo turno, hora y día; nadie sale dos veces; solo los tonos de siempre; ocho como mucho; las cosas
  // (237) nunca encima de nadie; sin NaN.
  const fallos = [], vistos = {};
  for (const c of CONF) for (const sol of [1, -1]) {
    const lug = P.lugaresPueblo(P.sitiosPueblo({ ...c, sol }));
    for (const t of TURNOS) for (const dia of dias) for (const hora of HORAS) {
      const sem = new Date(`${dia}T12:00:00Z`).getUTCDay();
      if ((t === 'misa' && sem !== 0) || (t === 'mercado' && sem !== 6)) continue; // la misa es del domingo y la plaza del sábado
      const l = V.reparto(lug, t, { dia, hora, escuela: sem >= 1 && sem <= 5, hilos: 2 }), fig = l.filter((v) => !V.COSAS.has(v.t)), dd = `${c.W} ${sol} ${t} ${dia} ${hora}`;
      for (const v of l) vistos[v.t] = (vistos[v.t] ?? 0) + 1;
      const quienes = l.filter((v) => v.quien).map((v) => v.quien);
      if (new Set(quienes).size !== quienes.length) fallos.push(`${dd}: alguien dos veces (${quienes})`);
      for (const v of l.filter((x) => x.quien)) if (v.r !== V.VECINOS[v.quien].r) fallos.push(`${dd}: ${v.quien} con otra ropa`);
      if (fig.length > V.MAX_VECINOS) fallos.push(`${dd}: ${fig.length} figuras`);
      if (/NaN|undefined|style=/.test(V.svgVecinos(l, { sol }))) fallos.push(`${dd}: el SVG`);
      if (sem !== 4 && sem !== 0 && quienes.includes('milpero')) fallos.push(`${dd}: el milpero baja solo jueves y domingo`);
      if (sem === 1 && l.some((v) => v.t === 'panadero' || v.t === 'bicicleta')) fallos.push(`${dd}: el lunes el panadero descansa`);
      for (const q of l.filter((v) => ['bicicleta', 'comal', 'olla', 'atarraya', 'escobaSola'].includes(v.t))) {
        if (fig.some((v) => choque(V.cajaVecino(q), V.cajaVecino(v), 0.35 * q.k))) fallos.push(`${dd}: ${q.t} encima de alguien`);
      }
    }
  }
  eq(fallos.slice(0, 8), [], 'pueblo 52: en seis tamaños, catorce turnos, dos semanas y veinte horas, cada vecino con su ropa, nadie dos veces, ocho como mucho, sin NaN, el milpero jueves y domingo, el lunes sin panadero y ninguna cosa encima de nadie');
  const nuevos = ['maestra', 'maestraRamo', 'lee', 'pescador', 'pescadorSarta', 'pescadorSaluda', 'remienda', 'sacristan', 'milpero', 'milperoSaluda', 'delantal', 'delantalSaluda', 'vendedoraSaluda', 'oseznoHuacal', 'oseznoFlores', 'oseznoPollito', 'oseznoDulce', 'bicicleta', 'comal', 'olla', 'atarraya', 'escobaSola'];
  ok(nuevos.every((t) => vistos[t] > 0), `pueblo 52: sale cada personaje y cada cosa nuevos (${nuevos.filter((t) => !vistos[t])})`);
  // Todas sus piezas usan los tonos de siempre (0 nodos: un trazo por tono para todo el pueblo).
  const svgTodos = V.svgVecinos(nuevos.map((t, i) => ({ t, x: 10 + i * 12, y: 50, k: 2, r: t === 'sacristan' ? 'rasgo' : i })));
  ok((svgTodos.match(/<path/g) || []).length <= V.TONOS.length + 1 && !/undefined|NaN/.test(svgTodos), 'pueblo 52: los personajes nuevos no suman tonos (0 nodos)');
  // 231: el día del panadero, un miércoles a 1440 px.
  const lug = P.lugaresPueblo(P.sitiosPueblo({ ...CONF[3], sol: 1 })), r = (t, dia, hora) => V.reparto(lug, t, { dia, hora, escuela: C.escuela(dia) });
  const pan = (t, dia, hora) => r(t, dia, hora).find((v) => v.quien === 'panadero');
  const [a1, a2, a3] = [pan('manana', '2027-02-10', 7.6), pan('manana', '2027-02-10', 10.5), pan('tortillas', '2027-02-10', 11.8)];
  ok(pan('alba', '2027-02-10', 4.7)?.horno && V.luzPupusa(r('alba', '2027-02-10', 4.7)) && !V.luzPupusa(r('alba', '2027-02-08', 4.7)) && a1.y === lug.atrio[1][1] && a2.y === lug.plaza[4][1] && a3.t === 'sentado' && r('tortillas', '2027-02-10', 11.8).some((v) => v.t === 'bicicleta') && r('siesta', '2027-02-10', 13).some((v) => v.t === 'bicicleta'), 'pueblo 231: el panadero con su horno antes del alba (el lunes no), en el atrio por la mañana, en la plaza desde las 10:00, almorzando junto al comal a mediodía y su bicicleta en su pared');
  // 232: la maestra: los oseznos entran en fila a las 7:00, recreo a las 9:30, por la tarde corrige.
  ok(r('manana', '2027-02-10', 7.1).filter((v) => v.t === 'oseznoBolson').length >= 2 && r('manana', '2027-02-10', 7.1).some((v) => v.quien === 'maestra') && r('manana', '2027-02-10', 9.6).filter((v) => /^osezno/.test(v.t)).length >= 4 && r('manana', '2027-02-10', 8.5).filter((v) => /^osezno/.test(v.t)).length === 0, 'pueblo 232: a las 7:00 los oseznos entran en fila con la maestra; a las 9:30, recreo; el resto de la mañana, en clase');
  // 233: el pescador vuelve con su sarta a las 9:00 y la vende en la plaza desde las 10:00; las noches de luna llena no sale (CSS).
  const diaP = dias.find((d) => C.escuela(d) && ![1, 2].includes(V.carta(d, 'encuentro-m', 6))); // un día en que el encuentro no es el suyo
  const pes = (h) => r('manana', diaP, h).find((v) => v.quien === 'pescador');
  ok(!pes(8.5) && pes(9.2)?.t === 'pescadorSarta' && lug.calle.some((q) => q[1] === pes(9.2).y) && pes(10.5)?.y === lug.plaza[2][1], 'pueblo 233: el pescador, en el lago hasta las 9:00; luego por la calle con la sarta y en la plaza desde las 10:00');
  ok(/data-luna-llena\]\[data-cielo="noche"\] \.montana :is\(\.v-cayuco/.test(fs.readFileSync(new URL('../app/static/styles.css', import.meta.url), 'utf8')), 'pueblo 238: las noches de luna llena el cayuco no está');
  // 234: la puerta de la iglesia (5:30–21:00) y las luces detrás del sacristán; el lunes, sin horno.
  eq([4, 5.4, 5.5, 12, 20.9, 21, 23].map((h) => C.puertaIglesia('2027-02-10', h)), ['cerrada', 'cerrada', '', '', '', 'cerrada', 'cerrada'], 'pueblo 234: el sacristán abre la iglesia a las 5:30 y la cierra a las 21:00');
  eq([C.puertaIglesia('2026-12-24', 22), C.puertaIglesia('2026-12-31', 23.5), C.lucesDelPueblo('2027-02-08', 4.75), C.lucesDelPueblo('2027-02-10', 4.75), C.lucesDelPueblo('2027-02-10', 17.8)], ['', '', 'faroles', 'horno', 'templo'], 'pueblo 234: las noches de fiesta la puerta queda abierta; el lunes no hay horno; a las 17:45, solo la iglesia');
  ok(r('pupusas', '2027-02-10', 18).some((v) => v.quien === 'sacristan') && r('fresca', '2027-02-10', 21.5).some((v) => v.quien === 'sacristan'), 'pueblo 234: el sacristán en el atrio al encender la iglesia y al cerrarla');
  // 235: el encuentro del día nunca es el de ayer ni el del mismo día de la semana pasada (400 días).
  let rep = 0;
  for (const cual of ['m', 't']) {
    const cs = Array.from({ length: 400 }, (_, i) => V.carta(new Date(Date.UTC(2026, 0, 1) + i * 864e5).toISOString().slice(0, 10), `encuentro-${cual}`, 6));
    for (let i = 1; i < cs.length; i++) if (cs[i] === cs[i - 1] || (i >= 7 && cs[i] === cs[i - 7])) rep++;
  }
  const parejas = new Set(dias.map((d) => r('tarde', d, 15).filter((v) => v.quien).map((v) => v.quien).sort().join()));
  ok(rep === 0 && parejas.size >= 4, `pueblo 235: el encuentro no repite el de ayer ni el de la semana pasada, y cambia quién se ve (${parejas.size} tardes distintas en dos semanas)`);
  // 236: el recado: va con algo en las manos y vuelve sin él (o con un dulce); fuera de su rato, no sale; lo que lleva cambia.
  const rec = (t, dia, h) => r(t, dia, h).find((v) => v.recado);
  const llevan = new Set(dias.map((d) => rec(C.escuela(d) ? 'tarde' : 'mananaLibre', d, C.escuela(d) ? 15.2 : 8.2)?.t).filter(Boolean));
  ok(rec('tarde', '2027-02-10', 15.2) && /Huacal|Flores|Pollito/.test(rec('tarde', '2027-02-10', 15.2).t) && /^osezno(Dulce)?$/.test(rec('vuelta', '2027-02-10', 16.8)?.t ?? '') && !rec('tarde', '2027-02-10', 14.5) && !rec('vuelta', '2027-02-10', 17.2) && llevan.size >= 3, `pueblo 236: el recado del día, de ida con algo y de vuelta sin ello, solo en su rato (${[...llevan]})`);
  // 238: la semana de los oficios: el sábado tamales (y la olla); el lunes la de la tienda trae el pan.
  ok(r('tortillas', '2027-02-13', 12.1).some((v) => v.t === 'tamales') && r('siesta', '2027-02-13', 13).some((v) => v.t === 'olla') && r('amanece', '2027-02-08', 6).some((v) => v.quien === 'tienda' && v.t === 'vendedora'), 'pueblo 238: el sábado la tortillera hace tamales; el lunes la de la tienda trae el pan');
  const mandar = /\b(tu|tus|tú|te|compra|compre|comprar|abre|mira|mire|ven|entra|aprovecha)\b/i, fs52 = Object.values(L.FRASE_SEMANA).flatMap((x) => Object.values(x));
  ok(fs52.every((t) => t.length < 100 && !mandar.test(t) && /\.$/.test(t)) && /descansa/.test(L.textoValle({ turno: 'alba', sem: 1 })) && /tamales/.test(L.textoValle({ turno: 'tortillas', sem: 6 })) && /tortillas en su comal/.test(L.textoValle({ turno: 'tortillas', sem: 3 })), 'pueblo 238: la descripción cuenta la semana de los oficios, sin tutear');
}

// ---------------------------------------------------------------- campamentos 57 y 58: «Tu historia» a miles de compras
{
  const L = await import('../app/static/lib.js');
  const A = await import('../app/static/arte-historia.js');
  // Un libro realista y fijo (sin azar): ritmo regular más extras amontonadas en las «caídas», varias el mismo día, en cinco años.
  const fijo = (i) => { const s = Math.sin(i * 12.9898 + 78.233) * 43758.5453; return s - Math.floor(s); };
  const libro = (N, anios = 5) => {
    const out = [], dias = anios * 365, t0 = Date.UTC(2022, 0, 1);
    for (let k = 0; k < N; k++) {
      const extra = fijo(k) < 0.6;
      // las extra caen en diez «caídas» de dos semanas; las de siempre, repartidas
      const d = Math.min(dias - 1, extra ? Math.floor((Math.floor(fijo(k + 7) * 10) + 0.5) * (dias / 10) + fijo(k + 3) * 14) : Math.floor((k / N) * dias));
      const precio = 20_000 + 80_000 * (0.5 + 0.5 * Math.sin(d / 180));
      const monto = extra ? 25 : 12;
      out.push({ id: k + 1, fecha: new Date(t0 + d * 864e5).toISOString().slice(0, 10), tipo: 'compra', monto, sats: Math.round((monto / precio) * 1e8), precio, extra: extra ? 1 : 0 });
    }
    out.push({ id: N + 1, fecha: '2024-05-05', tipo: 'venta', sats: 1000, monto: 1, precio: 60_000, extra: 0 });
    return out.sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : a.id - b.id));
  };
  const nodos = (svg) => (svg.match(/<[a-zA-Z]/g) ?? []).length;
  const sano = (svg) => !/NaN|undefined|Infinity|null/.test(svg);
  // Las figuras de la partitura: por días hasta 60 notas (el mismo día, un acorde con su cantidad); con más, por semanas
  const c = (id, fecha, precio, extra = 0) => ({ id, fecha, tipo: 'compra', sats: 10_000, precio, extra });
  const pocas = L.partitura([c(1, '2026-03-02', 50_000), c(2, '2026-03-02', 50_000, 1), c(3, '2026-03-02', 52_000, 1), c(4, '2026-05-10', 90_000)])[0];
  const fp = L.figurasPartitura(pocas);
  eq([fp.modo, fp.figuras.length, fp.figuras[0].n, fp.figuras[0].nExtra, fp.figuras[0].extra, fp.figuras[1].n], ['dia', 2, 3, 2, true, 1], 'partitura 57: por días, varias compras el mismo día son una figura (extra por mayoría)');
  ok(L.textoFigura(fp.figuras[1]) === L.textoNota(pocas.notas[3]) && /^2 mar 2026 · 3 compras \(2 extra\) · \+30,000 sats · BTC entre \$50,000 y \$52,000$/.test(L.textoFigura(fp.figuras[0])), `partitura 57: una figura de una compra se lee como su nota; varias, con su cantidad (${L.textoFigura(fp.figuras[0])})`);
  const grande = L.partitura(libro(5000));
  const y = grande.find((a) => a.notas.length > 600);
  const fs5 = L.figurasPartitura(y);
  ok(fs5.modo === 'semana' && fs5.figuras.length <= 54 && fs5.figuras.reduce((a, f) => a + f.n, 0) === y.notas.length && fs5.figuras.every((f) => f.col >= 0 && f.col <= 53 && f.desde <= f.hasta && f.desde.startsWith(String(y.anio)) && f.hasta.startsWith(String(y.anio))), `partitura 57: más de 60 notas van por semanas (${y.notas.length} notas en ${fs5.figuras.length} figuras), cortadas al año`);
  ok(fs5.figuras.every((f) => f.pasoMin <= f.paso && f.paso <= f.pasoMax && f.extra === L.mayoriaExtra(f.nExtra, f.n)) && /^Semana del .+ · \d+ compras( \(\d+ extra\))? · \+[\d,]+ sats · BTC (a|entre) \$/.test(L.textoFigura(fs5.figuras.find((f) => f.n > 1))), 'partitura 57: cada semana trae su nota del medio, su rango y su texto');
  eq([L.figurasPartitura({ anio: 2026, notas: Array.from({ length: 60 }, (_, k) => ({ fecha: `2026-01-${String(1 + (k % 28)).padStart(2, '0')}`, precio: 1, sats: 1, extra: false, paso: 6 })) }).modo, L.figurasPartitura({ anio: 2026, notas: Array.from({ length: 61 }, () => ({ fecha: '2026-01-05', precio: 1, sats: 1, extra: false, paso: 6 })) }).modo], ['dia', 'semana'], 'partitura 57: el umbral es 60 notas');
  // 31 de diciembre de un año bisiesto y una semana que cruza el año: la semana se corta al año y no se sale de la pauta
  const bis = L.figurasPartitura({ anio: 2024, notas: [...Array.from({ length: 61 }, (_, k) => ({ fecha: '2024-12-31', precio: 1 + k, sats: 1, extra: k % 2 === 0, paso: k % 13 }))] });
  ok(bis.figuras.length === 1 && bis.figuras[0].desde === '2024-12-30' && bis.figuras[0].hasta === '2024-12-31' && bis.figuras[0].col <= 53 && bis.figuras[0].extra, `partitura 57: el 31 de diciembre bisiesto (${JSON.stringify([bis.figuras[0].desde, bis.figuras[0].hasta, bis.figuras[0].col])})`);
  const ene = L.figurasPartitura({ anio: 2027, notas: Array.from({ length: 61 }, () => ({ fecha: '2027-01-01', precio: 1, sats: 1, extra: false, paso: 6 })) });
  ok(ene.figuras[0].desde === '2027-01-01' && ene.figuras[0].col === 0 && /^Semana del 1 – 3 ene 2027/.test(L.textoFigura(ene.figuras[0])), `partitura 57: la semana del 1 de enero empieza el 1 de enero (${L.textoFigura(ene.figuras[0])})`);
  const todos = L.figurasTodos(grande);
  ok(todos.figuras.length <= grande.length * 12 && todos.figuras.every((f, i) => f.i === i && f.col >= 0 && f.col < 12 && f.fila >= 0 && f.fila < grande.length) && todos.figuras.reduce((a, f) => a + f.n, 0) === grande.reduce((a, x) => a + x.notas.length, 0), `partitura 58: todos los años, una figura por mes (${todos.figuras.length})`);
  ok(/^noviembre 2022 · \d+ compras/.test(L.textoFigura(todos.figuras.find((f) => f.anio === 2022 && f.mes === 10))) && /^De 2022 a 2026: 5,000 notas, una figura por mes en tus compras$/.test(L.textoTodos(grande)) && !/tus/.test(L.textoTodos(grande, true)), `partitura 58: los textos de todos los años (${L.textoTodos(grande)})`);
  ok(/una nota por compra \(en un año de muchas compras, una figura por semana\)/.test(L.textoPartitura(grande)) && / en \d+ semanas; BTC entre/.test(L.textoAnioPartitura(y, false, fs5)), 'partitura 57: los textos dicen cuándo va por semanas');
  // La marca de «extra» por mayoría: la manta borda la semana solo si más de la mitad fue extra; la torre cuenta cuántas
  const man = L.semanasManta([c(1, '2026-03-02', 1, 1), c(2, '2026-03-03', 1), c(3, '2026-03-04', 1), c(4, '2026-03-10', 1, 1), c(5, '2026-03-11', 1, 1)], '2026-03-20');
  eq(man.celdas.filter((x) => x.n).map((x) => [x.extra, x.nExtra, x.n]), [[true, 1, 3], [true, 2, 2]], 'manta 57: cada semana sabe cuántas fueron extra');
  ok(/1 de ellas|con una compra extra\.$/.test(L.textoSemanaManta(man.celdas[0])) && /, 2 de ellas extra\.$/.test(L.textoSemanaManta(man.celdas.find((x) => x.nExtra === 2))), 'manta 57: el texto dice cuántas fueron extra');
  const svgMan = A.manta(man);
  eq((svgMan.match(/class="pieza celda[^"]*extra/g) ?? []).length, 1, 'manta 57: la puntada solo en la semana de mayoría extra');
  const pt = L.piedrasTorre(libro(1000));
  ok(pt.every((p) => p.nExtra <= p.n && p.extra === p.nExtra > 0) && /^.+ · \d+ compras · \+[\d,]+ sats · \d+ extra$/.test(L.textoPiedra(pt.find((p) => p.nExtra))), 'torre 57: cada piedra cuenta sus extra y lo dice');
  const svgT = A.torre(pt);
  ok(/hm-veta hm-v[123]/.test(svgT) && (svgT.match(/hm-veta hm-v/g) ?? []).length === pt.filter((p) => p.nExtra).length, 'torre 57: la veta se enciende según la proporción');
  // El tronco: un nudo por mes con extras, no uno por compra
  const tro = L.aniosTronco(libro(5000), '2026-12-31');
  const nudos = (A.tronco(tro).match(/class="ht-nudo" d="([^"]*)"/)?.[1].match(/M/g) ?? []).length;
  ok(nudos <= tro.length * 12 && nudos >= 1 && L.textoTronco(tro).includes(`Hay ${nudos} nudos, uno por cada mes con compras extra (${tro.reduce((a, x) => a + x.nExtras, 0).toLocaleString('en-US')} en total).`), `tronco 57: un nudo por mes con extras (${nudos}) y el texto cuenta las ${tro.reduce((a, x) => a + x.nExtras, 0)}`);
  // El tope: ningún dibujo pasa de A.TOPE_NODOS con 1, 200, 1,000, 5,000 y 10,000 compras (cinco años), ni trae NaN
  const hoy = '2026-12-31';
  const casos = [['una', [c(1, '2026-06-01', 50_000, 1)]], ['iguales', Array.from({ length: 90 }, (_, k) => c(k + 1, `2026-${String(1 + (k % 12)).padStart(2, '0')}-0${1 + (k % 9)}`, 70_000))],
    ['todas extra', libro(800).map((x) => ({ ...x, extra: 1 }))], ['sin extra', libro(800).map((x) => ({ ...x, extra: 0 }))], ...[200, 1000, 5000, 10000].map((N) => [String(N), libro(N)])];
  const medidas = {};
  for (const [nombre, items] of casos) {
    const as = L.partitura(items);
    const dib = {
      tronco: A.tronco(L.aniosTronco(items, hoy)), constelacion: A.constelacion(L.estrellasConstelacion(items)), torre: A.torre(L.piedrasTorre(items)),
      manta: A.manta(L.semanasManta(items, hoy)), estratos: A.estratos(L.estratosMes(items, hoy)),
      partitura: Math.max(...as.map((a) => nodos(A.partitura(L.figurasPartitura(a))))), semana: Math.max(...as.map((a) => { const f = L.figurasPartitura(a); return nodos(A.partitura(f, { sel: f.figuras.length - 1 })); })),
      todos: nodos(A.partitura(L.figurasTodos(as), { sel: 0 })),
    };
    const mal = [];
    for (const [k, v] of Object.entries(dib)) {
      const n = typeof v === 'number' ? v : nodos(v);
      medidas[`${nombre}:${k}`] = n;
      if (n > A.TOPE_NODOS || (typeof v === 'string' && !sano(v))) mal.push(`${k} ${n}`);
    }
    for (const a of as) { const f = L.figurasPartitura(a); for (const s of [A.partitura(f), A.partitura(f, { sel: 0 })]) if (!sano(s)) mal.push(`partitura ${a.anio}`); }
    if (as.length && !sano(A.partitura(L.figurasTodos(as)))) mal.push('todos');
    eq(mal, [], `tope 58: con ${nombre} compras ningún dibujo pasa de ${A.TOPE_NODOS} nodos ni trae NaN (${Object.entries(medidas).filter(([k]) => k.startsWith(`${nombre}:`)).map(([k, v]) => `${k.split(':')[1]} ${v}`).join(', ')})`);
  }
  if (process.env.MEDIDAS) console.log(JSON.stringify(medidas)); // MEDIDAS=1 node tests/test_lib.mjs: los nodos de cada dibujo
  ok(medidas['10000:constelacion'] < 60 && medidas['10000:partitura'] < 200, `tope 58: con 10,000 compras la constelación y la partitura quedan pequeñas (${medidas['10000:constelacion']}, ${medidas['10000:partitura']})`);
}

// Campamento 59 · La fiesta del hito: el guion (cuatro tiempos, la escala, noche, lluvia y efectos), los cohetes, la fiesta por ver,
// el farol, el reparto de la fiesta (hasta nueve) y el arte (SVG puro, sin estilo en línea ni NaN).
{
  const L = await import('../app/static/lib.js'), V = await import('../app/static/arte-vecinos.js'), P = await import('../app/static/arte-pueblo.js'), F = await import('../app/static/arte-fiesta.js');
  eq([1e6, 1e7, 1e8, 1e5, 2.5e6, 5e6, 250_000, 500_000, 1.25e6, 750_000, 3e6].map(L.escalaFiesta),
    ['campamento', 'campamento', 'campamento', 'principal', 'principal', 'principal', 'principal', 'principal', 'intermedia', 'intermedia', 'intermedia'], 'fiesta 59: la escala (10× desde 1M; 2.5 y 5 y 100k; las demás)');
  eq(L.MS_FIESTA, { campamento: 24_000, principal: 12_000, halving: 12_000, intermedia: 6000 }, 'fiesta 59: 24 s, 12 s y 6 s (el halving, como una principal)');
  const g = L.guionFiesta('campamento', { conTu: true });
  const ques = (x) => x.pasos.map((p) => p.que);
  ok(g.ms === 24_000 && g.farol && g.pasos.every((p, i) => i === 0 || p.en >= g.pasos[i - 1].en) && g.pasos.every((p) => p.en < g.ms), 'fiesta 59: el campamento dura 24 s, en orden, todo dentro y deja el farol');
  eq(g.pasos.filter((p) => p.que === 'vecinos').map((p) => [p.en, p.cuadro]), [[0, 'salen'], [5000, 'rueda'], [10_000, 'arriba'], [16_000, 'chocolate']], 'fiesta 59: cuatro tiempos en la plaza (salen, rueda, brazos arriba, chocolate)');
  eq([g.pasos.find((p) => p.que === 'campana').toques, g.pasos.find((p) => p.que === 'faroles').n, g.pasos.find((p) => p.que === 'cohetes').n], [3, 7, 3], 'fiesta 59: en el teléfono, 3 toques, 7 farolitos y 3 cohetes');
  eq(L.guionFiesta('campamento', { ancho: 1440 }).pasos.find((p) => p.que === 'cohetes').n, 5, 'fiesta 59: en escritorio, 5 cohetes');
  ok(ques(g).includes('tu') && !ques(L.guionFiesta('campamento')).includes('tu'), 'fiesta 59: «Tú» solo para quien anota (para quien solo mira no sale)');
  const pr = L.guionFiesta('principal', { conTu: true }), iv = L.guionFiesta('intermedia', { conTu: true }), hv = L.guionFiesta('halving', { conTu: true });
  ok(pr.ms === 12_000 && pr.pasos.find((p) => p.que === 'campana').toques === 2 && pr.pasos.find((p) => p.que === 'faroles').n === 3 && pr.pasos.find((p) => p.que === 'cohetes').n === 1 && !pr.pasos.some((p) => p.cuadro === 'chocolate') && pr.farol,
    'fiesta 59: la etapa principal, 12 s: dos toques, rueda de cinco, 3 farolitos, un cohete, sin chocolate, y su farol');
  ok(iv.ms === 6000 && !iv.farol && iv.pasos.length === 3 && iv.pasos.find((p) => p.que === 'campana').toques === 1 && iv.pasos.find((p) => p.que === 'vecinos').cuadro === 'tres' && iv.pasos.find((p) => p.que === 'faroles').n === 1 && !ques(iv).some((q) => ['cohetes', 'cumbre', 'tu'].includes(q)),
    'fiesta 59: la intermedia, sobria: 6 s, un toque, tres osos con los brazos arriba y un farolito; sin cohetes, sin cumbre y sin farol');
  ok(hv.ms === 12_000 && hv.farol && !ques(hv).includes('tu') && !ques(hv).includes('cumbre') && hv.pasos.find((p) => p.que === 'faroles').n === 4 && hv.pasos.find((p) => p.que === 'cohetes').n === 1,
    'fiesta 59: el halving es fiesta del pueblo: sin «Tú» ni la cumbre aunque lo pida quien anota; 4 farolitos y un cohete');
  for (const e of ['campamento', 'principal', 'intermedia', 'halving']) {
    const noche = L.guionFiesta(e, { noche: true }), lluvia = L.guionFiesta(e, { lluvia: true }), es = L.guionFiesta(e, { efectos: 'esenciales', ancho: 1440 }), ni = L.guionFiesta(e, { efectos: 'ninguno', conTu: true });
    ok(!ques(noche).includes('vecinos') && ques(noche).includes('campana'), `fiesta 59 (${e}): de noche en el pueblo no hay nadie (la campana sí)`);
    ok(!ques(lluvia).includes('faroles'), `fiesta 59 (${e}): con lluvia, sin farolitos`);
    ok(!ques(es).includes('faroles') && es.pasos.filter((p) => p.que === 'cohetes').every((p) => p.n === 1), `fiesta 59 (${e}): con «esenciales», sin farolitos volando y un solo cohete que aparece y se apaga`);
    ok(ni.ms === 0 && ni.pasos.length === 0 && ni.farol === (e !== 'intermedia'), `fiesta 59 (${e}): con «ninguno», el estado final (el farol, si toca)`);
    ok(L.guionFiesta(e).ms <= 30_000, `fiesta 59 (${e}): 30 s como mucho`);
  }
  // Los cohetes: dentro de la escena, debajo del saldo y de la tarjeta, sobre la cumbre en escritorio y a la derecha en la tele
  for (const [W, H, tu, cumbre, techo, tv] of [[390, 760, { x: 200, y: 420 }, { x: 240, y: 330 }, 280, false], [320, 568, { x: 160, y: 330 }, { x: 200, y: 250 }, 200, false], [1440, 774, { x: 860, y: 330 }, { x: 900, y: 80 }, 0, false], [2560, 1440, { x: 1500, y: 600 }, { x: 1560, y: 230 }, 0, true]]) {
    const ps = L.palmasFiesta({ W, H, n: 5, tu, cumbre, techo, k: 1, tv });
    ok(ps.length >= 1 && ps.length <= 5 && ps.every((q) => q.y - q.r > techo + 8 && q.x - q.r > 2 && q.x + q.r < W - 2 && q.y + q.r < H - 2 && Number.isFinite(q.x + q.y + q.r)), `fiesta 59: los cohetes a ${W} px caben, bajo el saldo y la tarjeta (${ps.length})`);
    if (tv) ok(ps.every((q) => q.x > cumbre.x), 'fiesta 59: en la tele, a la derecha de la cumbre (lejos del saldo y del reloj)');
  }
  eq(L.palmasFiesta({ W: 390, H: 760, n: 3, tu: { x: 200, y: 300 }, cumbre: { x: 240, y: 200 }, techo: 900 }), [], 'fiesta 59: si no cabe ninguno bajo el saldo, no sale ninguno');
  // La fiesta por ver al abrir: la de un campamento o una etapa principal de hoy, y el halving, una vez por aparato; marcas sin cifras
  const hoy = '2026-11-25', f = { dia: hoy, hito: { meta: 1e6, rango: 'campamento', id: 41 }, halving: false };
  eq(L.fiestaPorVer(f, '', hoy), { escala: 'campamento', meta: 1e6, marca: '2026-11-25#41' }, 'fiesta 59: la familia ve la fiesta de hoy al abrir');
  ok(L.fiestaPorVer(f, '2026-11-25#41', hoy) === null && L.fiestaPorVer(f, '', '2026-11-26') === null && L.fiestaPorVer(null, '', hoy) === null, 'fiesta 59: una vez por aparato, solo hoy');
  ok(L.fiestaPorVer({ dia: hoy, hito: { meta: 1.25e6, id: 3 }, halving: false }, '', hoy) === null, 'fiesta 59: la intermedia no se repite al abrir (solo la ve quien anota)');
  eq(L.fiestaPorVer({ dia: hoy, hito: { meta: 2.5e6, id: 7 }, halving: true }, '2026-11-25#7', hoy), { escala: 'halving', meta: null, marca: '2026-11-25#halving' }, 'fiesta 59: el halving, aparte');
  ok(L.fiestaPorVer({ dia: hoy, hito: { meta: 2.5e6, id: 7 }, halving: true }, '2026-11-25#7 2026-11-25#halving', hoy) === null, 'fiesta 59: vistas las dos, nada');
  ok(!/\d{4,}#|sats/.test(L.fiestaPorVer(f, '', hoy).marca.split('#')[1]), 'fiesta 59: la marca del aparato no lleva cifras del saldo');
  ok(L.farolDelHito(f, hoy) && !L.farolDelHito(f, '2026-11-26') && !L.farolDelHito({ dia: hoy, hito: { meta: 1.5e6 } }, hoy) && L.farolDelHito({ dia: hoy, hito: null, halving: true }, hoy) && !L.farolDelHito(null, hoy),
    'fiesta 59: el farol del hito, hasta la medianoche (campamento, principal o halving; la intermedia no deja farol)');
  // El reparto de la fiesta: hasta nueve, en la plaza, con los personajes de siempre; el SVG con un trazo por tono
  ok(V.MAX_FIESTA === 9 && L.MAX_VECINOS_FIESTA === 9 && V.MAX_VECINOS === 8, 'fiesta 59: hasta nueve en la fiesta; el tope de un día cualquiera sigue en ocho');
  const fallos = [];
  for (const c of [{ W: 320, H: 640, forma: 'tel', by: 505, bx: 45, pts: [[45, 505], [190, 455], [95, 395], [200, 275]], lago: { cx: 268, cy: 590, rx: 50, ry: 10 }, techo: 225 },
    { W: 390, H: 760, forma: 'tel', by: 600, bx: 55, pts: [[55, 600], [232, 540], [120, 470], [242, 327]], lago: { cx: 320, cy: 680, rx: 62, ry: 12 }, techo: 270 },
    { W: 1440, H: 774, forma: 'esc', by: 708, bx: 466, pts: [[466, 708], [860, 610], [500, 480], [890, 62]], lago: null, techo: 400 },
    { W: 2560, H: 1440, forma: 'esc', by: 1318, bx: 900, pts: [[900, 1318], [1600, 1100], [980, 880], [1560, 230]], lago: null, techo: 600 }]) for (const sol of [1, -1]) {
    const lug = P.lugaresPueblo(P.sitiosPueblo({ ...c, sol }));
    for (const cuadro of ['salen', 'rueda', 'arriba', 'rueda5', 'arriba5', 'tres', 'chocolate']) {
      const l = V.repartoFiesta(lug, cuadro), svg = V.svgVecinos(l, { sol });
      const esperado = { salen: 4, rueda: 9, arriba: 9, rueda5: 5, arriba5: 5, tres: 3, chocolate: 6 }[cuadro];
      if (l.length !== esperado || l.length > V.MAX_FIESTA) fallos.push(`${c.W} ${cuadro}: ${l.length}`);
      if (l.some((v) => !V.PERSONAJES.includes(v.t) || !Number.isFinite(v.x + v.y + v.k))) fallos.push(`${c.W} ${cuadro}: alguien sin sitio`);
      if (/style=|NaN/.test(svg) || (svg.match(/<path/g) || []).length > V.TONOS.length + 1) fallos.push(`${c.W} ${cuadro}: el SVG`);
      const xs = lug.plaza.map((q) => q[0]), w = Math.max(...xs) - Math.min(...xs) + 30 * lug.plaza[0][2];
      if (l.some((v) => Math.abs(v.x - xs.reduce((a, x) => a + x, 0) / xs.length) > w)) fallos.push(`${c.W} ${cuadro}: lejos de la plaza`);
    }
    if (V.repartoFiesta({ ...lug, plaza: [] }, 'rueda').length) fallos.push(`${c.W}: sin plaza, alguien`);
  }
  eq(fallos, [], 'fiesta 59: el reparto de cada cuadro, a 320, 390, 1440 y 2560 px, con el sol a los dos lados');
  eq(V.repartoFiesta(P.lugaresPueblo(P.sitiosPueblo({ W: 390, H: 760, forma: 'tel', by: 600, bx: 55, pts: [[55, 600], [232, 540], [120, 470], [242, 327]], lago: null, techo: 270, sol: 1 })), 'rueda').filter((v) => v.t === 'bombo').length, 1, 'fiesta 59: el del bombo marca el paso de la rueda');
  // El arte: SVG como texto, clases fi-…, sin estilo en línea ni NaN, cajas finitas
  const piezas = [F.ondasCampana(15, 738, 2.3), F.farolitos(7, 97, 770, 2.3), F.farolitos(1, 97, 770, 1), F.palma(120, 400, 26, 2), F.palma(800, 120, 30, 5)];
  ok(piezas.every((x) => x.caja.length === 4 && x.caja.every(Number.isFinite) && x.caja[2] > 0 && x.caja[3] > 0 && !/style=|NaN|Infinity/.test(x.svg) && (x.svg.match(/class="([^"]+)"/g) || []).every((k) => /^class="fi-[a-z0-9 -]+"$/.test(k))),
    'fiesta 59: ondas, farolitos y palmas: SVG puro con su caja, sin estilo en línea ni NaN');
  ok((F.farolitos(7, 97, 770, 2.3).svg.match(/<path/g) || []).length === 3 && (F.palma(1, 1, 10, 0).svg.match(/<path/g) || []).length === 2 && (F.ondasCampana(1, 1, 1).svg.match(/<path/g) || []).length === 2, 'fiesta 59: pocos nodos (3 trazos los farolitos, 2 cada cohete y la campana)');
  eq(F.farolitos(5, 10, 10, 1), F.farolitos(5, 10, 10, 1), 'fiesta 59: los farolitos, el mismo reparto en cada aparato (azar con semilla)');
  const fh = F.farolHito(10, 40, 100, 2);
  ok(/^<g class="v-farol-hito" aria-hidden="true">/.test(fh) && (fh.match(/<path/g) || []).length === 3 && !/style=|NaN/.test(fh), 'fiesta 59: el farol del hito, tres trazos quietos y decorativo');
  // Lo que se quiere evitar: nada que hable ni recomiende (los textos de la fiesta están en celebracion.js)
  const cel = fs.readFileSync(new URL('../app/static/celebracion.js', import.meta.url), 'utf8');
  ok(!/compra ahora|deberías|te conviene|aprovecha/i.test(cel) && cel.includes("'Hoy el libro llegó a'"), 'fiesta 59: la tarjeta de quien solo mira no tutea y nada recomienda');
}

console.log(`OK ${n} comprobaciones`);
