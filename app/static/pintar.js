import { escalaFiesta, MS_FIESTA, aFecha, acentoDe, aniosDelLibro, aniversario, btc, cumpleHoy, eco, efemeride, enPupusas, lluviaEstrellas, numeroBonito, TEXTO_BONITO, cruzo1Btc, entero, etapaAnterior, etapaCelebrada, hayAurora, haceCuanto, hoyISO, hora, llevaTu, mesesDelLibro, nombreHito, primeraCompra, pct, rangoEtapa, resumen, numCorto, tramoEtapas, satsCorto, serieValor, tocaComprar, usd, usd0, usdSigno, usdSignoCorto, variacionAyer } from './lib.js';
import { pintarAnillo } from './anillo.js';
import { avisar } from './avisar.js';
import { pintarFavicon } from './favicon.js';
import { ico } from './iconos.js';
import { pintarInsignia } from './insignia.js';
import { enMedir } from './medir.js';
import { peliculaAbierta } from './pelicula.js';
import { pintarTV } from './tv.js';
import { dual, miniLinea, pegado } from './cifras.js';
import { dibujarMontana, subir } from './montana.js';
import { enFiesta, terminarFiesta } from './fiesta.js';
import { farolEncendido } from './celebracion.js';
import { pintarOdometro } from './odometro.js';
import { ofrecerAvisos, pintarSaludo } from './cuenta.js';
import { $, R, S, esAdmin, fijarR, quienAnota, reducido, vozLibro } from './estado.js';
import { actualizarIndice } from './indice.js';
import { pintarLista, pintarUltimaPiedrita } from './lista.js';
import { pintarMercado, pintarSatsDolar, pintarValor, pintarVistas } from './mercado.js';
import { pintarNovedades } from './novedades.js';
import { pintarMedallasResumen, refrescarHistoria } from './historia.js';
import { pintarDiario } from './diario.js';
import { pintarCapsulas } from './capsulas.js';
import { historiaVisible } from './pestanas.js';
import { pintarCaida, pintarComienzo, pintarEquilibrio, pintarReportes, pintarToca, pintarUbicacion } from './reportes.js';

// ---------------------------------------------------------------- pintar
export function pintar({ montana = false, animar = false, desde = null, festejo = null } = {}) {
  fijarR(resumen(S.compras, S.precio));
  $('sk-cards').hidden = S.cargado; // las formas grises de carga se van cuando llegan los datos
  pintarVoz();
  revisarValle();
  pintarPrecio();
  pintarSaldo(desde);
  if (montana) pintarMontana(animar, desde, festejo);
  if (!acentoRetenido) pintarAcento();
  pintarFavicon(R?.sats ?? 0);
  pintarToca();
  pintarCaida();
  pintarTramo();
  pintarSatsDolar();
  pintarMercado();
  pintarValor();
  pintarVistas();
  pintarEquilibrio();
  pintarLista();
  pintarUltimaPiedrita();
  pintarUbicacion();
  pintarReportes();
  pintarComienzo();
  pintarMedallasResumen();
  pintarDiario();
  pintarCapsulas();
  if (historiaVisible()) refrescarHistoria();
  pintarNovedades();
  pintarSaludo(undefined, { forzar: false }); // (campamento 23) un día como hoy, el saludo lo recuerda: solo mide si cambió
  pintarDelDia();
  ofrecerAvisos();
  pintarMinicab();
  pintarTitulo();
  pintarInsignia();
  actualizarIndice();
  pintarTV();
}

// Título de la pestaña con el saldo y el precio («121,567 sats · $75,928»): útil en la computadora con otra pestaña a la vista.
// Con una pantalla compartida el saldo quedaría a la vista, así que se puede apagar en «Tu cuenta» (por dispositivo).
const CLAVE_TITULO = 'libro.titulo';
export const tituloConSaldo = () => { try { return localStorage.getItem(CLAVE_TITULO) !== '0'; } catch { return true; } };
export function fijarTituloConSaldo(si) {
  try { if (si) localStorage.removeItem(CLAVE_TITULO); else localStorage.setItem(CLAVE_TITULO, '0'); } catch { /* vale para esta visita */ }
  pintarTitulo();
}
export function pintarTitulo() {
  const hay = S.cargado && R.n && !(S.errorCarga && !R.n);
  document.title = tituloConSaldo() && hay ? `${entero(R.sats)} sats · ${S.precio ? usd0(S.precio) : 'Libro DCA'}` : 'Libro DCA';
}
/** El texto de la mini-cabecera: el saldo en la unidad que elegiste y el precio de BTC. */
export function pintarMinicab() {
  const u = unidadVista();
  const hay = S.cargado && R.n && !(S.errorCarga && !R.n);
  const saldo = hay ? `${fmtUnidad[u](valorSaldo(u))} ${ETIQUETA_UNIDAD[u]}` : '';
  const precio = S.precio ? usd0(S.precio) : '';
  $('minicab-saldo').textContent = saldo;
  $('minicab-precio').textContent = precio;
  // Altímetro: una regla diminuta entre la etapa anterior y la siguiente, con tu punto (el mismo avance que el anillo de «Próxima etapa»).
  const alt = $('minicab-alt');
  alt.hidden = !hay;
  if (hay) {
    const a = etapaAnterior(R.sats), b = R.etapa;
    alt.style.setProperty('--p', String(Math.max(0, Math.min(1, b > a ? (R.sats - a) / (b - a) : 0)).toFixed(3)));
  }
}

export function pintarPrecio() {
  const estado = S.precio ? (S.viejo || S.errorPrecio ? 'viejo' : 'vivo') : S.errorPrecio ? 'error' : 'cargando';
  $('cotizacion').dataset.estado = estado;
  $('precio').textContent = S.precio ? usd0(S.precio) : '—';
  $('precio-meta').textContent = {
    vivo: `${S.fuente} · ${haceCuanto(S.precioTs)}`,
    viejo: `sin actualizar desde las ${hora(S.precioTs)}`,
    error: 'El mensajero no ha llegado',
    cargando: 'consultando…',
  }[estado];
  // «Coinbase · hace 12 s»: el separador y la hora en sus piezas (el texto no cambia) para que en 320 px vaya «Coinbase» arriba y la
  // hora abajo, sin un «·» colgando al final de la línea.
  if (estado === 'vivo') {
    const fuente = document.createElement('span'), sep = document.createElement('span'), hace = document.createElement('span');
    fuente.className = 'cot-fuente'; fuente.textContent = S.fuente;
    sep.className = 'cot-sep'; sep.textContent = ' · ';
    hace.className = 'cot-hace'; hace.textContent = haceCuanto(S.precioTs);
    $('precio-meta').replaceChildren(fuente, sep, hace);
  }
  // Sin precio, en el hueco de la cifra planea el mensajero (un zopilote): decorativo; el texto de abajo lo dice todo y el «—» sigue ahí para los lectores.
  if (estado === 'error') $('precio').innerHTML = `${ico('zopilote')}<span class="sr">—</span>`;
  // Cuánto subió o bajó desde el cierre de ayer (con menos de 3 días de histórico, no se muestra).
  const v = S.precio && estado !== 'error' ? variacionAyer(S.historico, S.precio) : null;
  const el24 = $('precio-24');
  el24.hidden = !v;
  if (v) {
    const plano = Math.abs(v.pct) < 0.05; // casi igual: sin flecha ni color
    el24.innerHTML = `${plano ? '•' : `${ico(v.pct > 0 ? 'sube' : 'baja')}<span class="sr">${v.pct > 0 ? 'sube' : 'baja'}</span>`} ${pct(v.pct)} vs ayer`;
    el24.dataset.tono = plano ? '' : v.pct > 0 ? 'sube' : 'baja';
  }
}

/**
 * Saldo grande: un odómetro (odometro.js) con cifras tabulares; nada se mide en JS. La cifra final reserva el ancho de cada
 * dígito en flujo normal, así que el saldo nunca queda invisible. Si la animación no puede correr (movimiento reducido,
 * pestaña oculta), se ve la cifra final directamente.
 */
function pintarCifraGrande(el, desde, hasta, ms = 1400, fmt = entero) {
  const final = fmt(hasta);
  // Caracteres en ancho de dígito tabular: dígito = 1, separador ≈ 0.31 (0.18 em / 0.575 em).
  el.style.setProperty('--n', (final.replace(/\D/g, '').length + final.replace(/\d/g, '').length * 0.31).toFixed(2));
  el.style.setProperty('--a', anchoCifra(final).toFixed(3)); // lo que mide en em (campamento 20: el CSS le deja sitio a la unidad)
  pintarOdometro(el, desde, hasta, fmt, { ms });
}
// Lo que mide cada carácter de la cifra grande en em (Bricolage 300 con su `letter-spacing`; en el saldo los dígitos son
// proporcionales: el «1» es estrecho). Es una tabla, no una medida de la página: con ella el CSS sabe cuánto ocupa la cifra final.
const ANCHO_CIFRA = { 0: 0.608, 1: 0.25, 2: 0.536, 3: 0.557, 4: 0.56, 5: 0.549, 6: 0.595, 7: 0.478, 8: 0.601, 9: 0.588, ',': 0.097, '.': 0.154, $: 0.576 };
export const anchoCifra = (t) => [...t].reduce((a, c) => a + (ANCHO_CIFRA[c] ?? 0.62), 0);
// Lo que mide la unidad (con su «⇄», y el punto «en vivo» en dólares), en em de su propia letra.
const ANCHO_UNIDAD = { sats: 2.45, btc: 2.67, usd: 3.36 };

// El saldo se puede ver en sats, en BTC o en dólares (toque en la cifra, en ese orden); se recuerda por dispositivo.
// En dólares es lo que vale hoy y cambia con el precio en vivo; sin precio se queda en sats.
const CLAVE_UNIDAD = 'libro.unidad';
const UNIDADES = ['sats', 'btc', 'usd'];
const leerUnidad = () => { try { const u = localStorage.getItem(CLAVE_UNIDAD); return UNIDADES.includes(u) ? u : 'sats'; } catch { return 'sats'; } };
let unidad = leerUnidad();
/** La unidad que se ve de verdad: «usd» necesita precio. */
const unidadVista = () => (unidad === 'usd' && R.valor == null ? 'sats' : unidad);
const fmtUnidad = { sats: entero, btc, usd };
const valorSaldo = (u) => (u === 'usd' ? R.valor : R.sats);
const NOMBRE_SIGUIENTE = { sats: 'BTC', btc: 'dólares', usd: 'sats' };
const ETIQUETA_UNIDAD = { sats: 'sats', btc: 'BTC', usd: 'USD' };
let mostrado = null; // lo que muestra la cifra grande, en la unidad `unidadPintada`
let unidadPintada = null;
let valorMostrado = null; // el valor en dólares de la línea de abajo
function etiquetaUnidad() {
  const u = unidadVista();
  $('s-unidad').textContent = ETIQUETA_UNIDAD[u];
  $('s-unidad').dataset.vivo = u === 'usd' ? '1' : ''; // el punto «en vivo»: el valor sigue al precio
  $('s-saldo-v').style.setProperty('--u-em', String(ANCHO_UNIDAD[u]));
  $('s-saldo-ayuda').textContent = `${vozLibro() ? 'Saldo del libro' : 'Tu saldo'}${u === 'usd' ? ' en dólares, al precio en vivo' : ''}. Toca para verlo en ${NOMBRE_SIGUIENTE[u]}.`;
}
// Huevo de pascua (idea 28): siete toques seguidos en el saldo y el libro dice cuántas pupusas son (a $0.75, solo es una cuenta curiosa).
let toquesSeguidos = 0, ultimoToque = 0;
function contarToque() {
  const ahora = Date.now();
  toquesSeguidos = ahora - ultimoToque < 1500 ? toquesSeguidos + 1 : 1;
  ultimoToque = ahora;
  if (toquesSeguidos < 7) return;
  toquesSeguidos = 0;
  const n = R.valor != null ? enPupusas(R.valor) : null;
  if (n != null) avisar(`${vozLibro() ? 'El saldo del libro' : 'Tu saldo'} equivale a unas ${entero(n)} pupusas, a $0.75 cada una.`, null, true, { ms: 5000 });
}
function alternarUnidad() {
  contarToque();
  let sig = UNIDADES[(UNIDADES.indexOf(unidad) + 1) % UNIDADES.length];
  if (sig === 'usd' && R.valor == null) sig = 'sats'; // sin precio no hay dólares
  unidad = sig;
  try { localStorage.setItem(CLAVE_UNIDAD, unidad); } catch { /* sin almacenamiento: vale para esta visita */ }
  if (S.cargado && !(S.errorCarga && !R.n)) {
    const u = unidadVista();
    pintarCifraGrande($('s-sats'), null, valorSaldo(u), 0, fmtUnidad[u]);
    mostrado = valorSaldo(u);
    unidadPintada = u;
    pintarMinicab();
    pintarLinea();
  }
  etiquetaUnidad();
  pintarBonito();
}
$('s-saldo-v').addEventListener('click', alternarUnidad);
$('s-saldo-v').addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); alternarUnidad(); } });
function pintarSaldo(desde) {
  const el = $('s-sats');
  if (!S.cargado) return;
  if (S.errorCarga && !R.n) {
    el.textContent = '—';
    mostrado = null;
    unidadPintada = null;
    $('s-valor').textContent = vozLibro() ? 'No se pudieron cargar las compras.' : 'No se pudieron cargar tus compras.';
    return;
  }
  const u = unidadVista();
  const valor = valorSaldo(u);
  if (mostrado !== valor || unidadPintada !== u) {
    if (mostrado === null) { pintarCifraGrande(el, 0, valor, 2000, fmtUnidad[u]); marcarSaldo(); } // la primera vez, sube desde cero
    else if (unidadPintada !== u) pintarCifraGrande(el, null, valor, 0, fmtUnidad[u]); // cambió la unidad: sin conteo
    else pintarCifraGrande(el, (u === 'sats' ? desde : null) ?? mostrado, valor, u === 'usd' ? 900 : 1400, fmtUnidad[u]);
    mostrado = valor;
    unidadPintada = u;
  }
  etiquetaUnidad();
  pintarBonito();
  pintarLinea();
  pintarProx();
  pintarDatosEscena();
}
/**
 * (Campamento 24) Una marca en la línea de tiempo de la página cuando el saldo ya está pintado con su cifra real (el conteo del odómetro
 * empieza ahí, con cualquier nivel de efectos): «Medir este aparato» la lee. Una vez por carga; el fotograma siguiente al pintado.
 */
let saldoMarcado = false;
function marcarSaldo() {
  if (saldoMarcado) return;
  saldoMarcado = true;
  requestAnimationFrame(() => setTimeout(() => { try { performance.mark('libro:saldo'); } catch { /* sin la API: no hay medida */ } }, 0));
}
/**
 * Lo del día, una sola vez por día y por dispositivo (ideas 6, 42 y 43): el aniversario de tu primera compra, o una efeméride
 * bitcoiner, o una lluvia de estrellas real. Es un aviso temporal; nunca recomienda nada. Para probar otro día:
 * `localStorage` `libro.dia` = AAAA-MM-DD (como `libro.hora` con el cielo).
 */
let delDiaHecho = false;
const almanaqueActivo = () => { try { return localStorage.getItem('libro.almanaque') === '1'; } catch { return false; } };
export const diaVista = () => { try { return localStorage.getItem('libro.dia') || hoyISO(); } catch { return hoyISO(); } };
/** (Campamento 28) Si hoy cumple años alguien de la familia: el grande de los dibujos de la interfaz estrena su gorrito (no dice de quién). */
export const cumpleDeHoy = () => cumpleHoy(S.cumples ?? [], diaVista()).length > 0;
function pintarDelDia() {
  if (delDiaHecho || !S.cargado || S.errorCarga || document.documentElement.hasAttribute('data-tv') || enMedir()) return;
  delDiaHecho = true;
  const hoy = diaVista();
  let txt = null;
  const an = aniversario(S.compras, hoy);
  if (an) {
    const cuanto = an.anios === 1 ? '1 año' : `${an.anios} años`;
    txt = esAdmin() ? `Hoy hace ${cuanto} que empezaste a subir.` : `Hoy se cumple ${an.anios === 1 ? 'un año' : `${an.anios} años`} de la primera compra del libro.`;
  } else {
    const lluvia = lluviaEstrellas(hoy);
    txt = efemeride(hoy)?.texto ?? (lluvia ? `Noche de ${lluvia.nombre}: hoy se ven más estrellas fugaces.` : null);
  }
  // (Campamento 51, idea 228) Si lo del día no tiene nada que decir, puede contar el foco del valle, solo si es raro (cielo.js:
  // `fraseDelFoco`: una fiesta, el primer día de los zompopos o de los azacuanes, la luna llena). Los días de rutina, nada: lo común es
  // callado. Tampoco si se entró desde el almanaque de la guía (ya lo dice su aviso). Nunca en la entrada ni en un aviso push.
  if (!txt && !almanaqueActivo()) txt = window.libroCielo?.fraseDelFoco?.(hoy) ?? null;
  if (!txt) return;
  try { if (localStorage.getItem('libro.delDia') === hoy) return; localStorage.setItem('libro.delDia', hoy); } catch { /* sin almacenamiento: sale en cada visita */ }
  avisar(txt, null, true, { ms: 6000 });
}

/** «Número bonito» (idea 41): solo con el saldo en sats y mientras el número lo sea. */
function pintarBonito() {
  const razon = unidadVista() === 'sats' && R.nCompras ? numeroBonito(R.sats) : null;
  const chip = $('s-bonito');
  chip.hidden = !razon;
  chip.textContent = razon ? TEXTO_BONITO[razon] : '';
  document.querySelector('.saldo').toggleAttribute('data-bonito', Boolean(razon));
}

/** La línea bajo el saldo: lo que valen tus sats (con su propio odómetro) y la ganancia, con formas cortas en pantallas muy pequeñas. */
export function pintarLinea() {
  const linea = $('s-valor');
  const libro = vozLibro(); // a quien solo mira se le habla del libro, no de «ti» (campamento 17)
  if (!R.n) { linea.textContent = libro ? 'La montaña espera: el libro aún no tiene compras.' : 'Tu montaña te espera. Anota tu primera compra para empezar a subir.'; return; }
  // Saldo en cero tras vender todo (idea 50): estás en el campamento base y el bosque sigue en pie.
  if (R.sats === 0 && R.nCompras) { linea.textContent = libro ? 'El libro volvió al campamento base. Sus pinos siguen aquí.' : 'Volviste al campamento base. Tus pinos siguen aquí.'; return; }
  if (R.valor == null) { linea.textContent = `${btc(R.sats)} BTC · ${libro ? 'se invirtieron' : 'invertiste'} ${usd(R.inv)}`; return; }
  // (Campamento 20) El renglón va en piezas que no se parten por dentro: «valen $X», «· píldora» y «· ya realizaste $Y». El CSS
  // (`.saldo-d:has(> .sd-v)`) las acomoda en una fila que se envuelve y esconde el «·» de la pieza que empieza un renglón: nada queda
  // colgando y el monto nunca se separa de su texto. El `textContent` de `#s-valor` es el mismo de siempre.
  const pieza = (clase) => { const e = document.createElement('span'); e.className = clase; return e; };
  const sep = () => { const i = document.createElement('i'); i.className = 'sd-sep'; i.textContent = ' · '; return i; };
  const v = pieza('sd-v');
  const b = document.createElement('b');
  if (unidadVista() === 'usd') {
    b.textContent = `${entero(R.sats)} sats`; // el saldo grande ya dice cuánto vale: aquí, cuántos sats son
    v.append(b);
  } else {
    pintarOdometro(b, valorMostrado != null && valorMostrado !== R.valor ? valorMostrado : null, R.valor, usd, { ms: 900 });
    v.append('valen ', b);
  }
  linea.replaceChildren(v);
  valorMostrado = R.valor;
  const gan = document.createElement('span');
  gan.dataset.tono = R.gan >= 0 ? 'sube' : 'baja';
  dual(gan, usdSigno(R.gan), usdSignoCorto(R.gan));
  if (R.pct != null) gan.append(` (${pct(R.pct)})`);
  // Tinta neutra (campamento 17): la flechita y el signo dicen si va arriba o abajo; el color es opcional («Tu cuenta»).
  if (Math.abs(R.gan) >= 0.005) gan.insertAdjacentHTML('afterbegin', ico(R.gan > 0 ? 'sube' : 'baja'));
  // La ganancia y su mini línea van juntas en una píldora (`.sd-gan`); en el teléfono bajan a su propia línea (el «·» se esconde).
  const grupo = pieza('sd-gan');
  grupo.append(gan);
  const g = pieza('sd-g');
  g.append(sep(), grupo);
  linea.append(g);
  // Lo realizado solo se enseña si pesa algo: una comisión de red de unos sats (un «gasto») deja −$0.01 y eso en la cabecera solo confunde.
  // La tarjeta «Ganancia» y el Historial siguen diciendo la cifra exacta.
  if (R.nVentas && Math.abs(R.realizada) >= 1) {
    const real = document.createElement('span');
    real.dataset.tono = R.realizada >= 0 ? 'sube' : 'baja';
    dual(real, usdSigno(R.realizada), usdSignoCorto(R.realizada));
    const t = pieza('sd-rt'); // «ya realizaste −$0.01»: el monto va siempre pegado a su texto
    t.append(libro ? 'ya se realizaron ' : 'ya realizaste ', real);
    const r = pieza('sd-r');
    r.append(sep(), t);
    linea.append(r);
  }
  // Mini línea del valor de tu saldo en los últimos 30 días (solo con histórico; en pantallas muy pequeñas se oculta).
  if (R.nCompras >= 3 && S.histEstado === 'ok' && S.precio) {
    const serie = serieValor(R.items, S.historico, S.precio, hoyISO()).slice(-30);
    const mini = miniLinea(serie.map((d) => d.valor), serie.length ? `Valor ${libro ? 'del saldo' : 'de tu saldo'} en los últimos ${serie.length} días: de ${usd0(serie[0].valor)} a ${usd0(serie.at(-1).valor)}` : '');
    if (mini) grupo.append(mini);
  }
}

/** «Última compra: hace 3 días · próxima, en 8 días» (solo admin, con 3 compras o más; la próxima es el último día que mantiene tu racha). */
function pintarProx() {
  const el = $('prox');
  // Quien solo mira no tiene «próxima compra»: en ese renglón (que ya tenía su sitio reservado) se dice de quién es el libro.
  if (S.cargado && S.rol && vozLibro()) { const q = quienAnota(); el.textContent = R.n ? `Lo anota ${q ?? 'quien lleva el libro'}` : ''; return; }
  const toca = S.cargado && esAdmin() && R.nCompras >= 3 ? tocaComprar(R) : null;
  const ultima = toca ? R.items.filter((c) => c.tipo !== 'venta').at(-1) : null;
  if (!ultima) { el.textContent = ''; return; }
  const dias = Math.max(0, Math.round((aFecha(hoyISO()) - aFecha(ultima.fecha)) / 864e5));
  let txt = `Última compra: ${dias === 0 ? 'hoy' : dias === 1 ? 'ayer' : `hace ${dias} días`}`;
  if (toca.estado !== 'perdida') {
    const faltan = ((7 - aFecha(hoyISO()).getDay()) % 7) + 7 * R.venceSemanas; // hasta el domingo que mantiene la racha
    txt += faltan === 0 ? ' · próxima: hoy es el último día' : faltan === 1 ? ' · próxima: mañana es el último día' : ` · próxima, en ${faltan} días`;
  }
  pegado(el, txt); // «en 6 días» no se parte (campamento 20)
}

/**
 * Bajo el saldo, en pantallas anchas (el CSS los oculta en las demás): tu costo promedio, tu racha y cuántas compras llevas.
 * Solo datos que ya están en los reportes, para que esa zona del cielo no quede vacía. Desde 3 compras.
 */
function pintarDatosEscena() {
  const dl = $('esc-datos');
  if (!S.cargado || !(R.nCompras >= 3)) { dl.hidden = true; return; }
  const filas = [
    ...(R.promedio > 0 ? [['Costo promedio', usd0(R.promedio)]] : []),
    ['Racha', `${entero(R.racha)} ${R.paso === 2 ? (R.racha === 1 ? 'quincena' : 'quincenas') : R.racha === 1 ? 'semana' : 'semanas'}`],
    ['Compras', entero(R.nCompras)],
  ];
  dl.replaceChildren(...filas.map(([k, v]) => {
    const d = document.createElement('div');
    const dt = document.createElement('dt'), dd = document.createElement('dd');
    dt.textContent = k;
    dd.textContent = v;
    d.append(dt, dd);
    return d;
  }));
  dl.hidden = false;
}

let anchoMontana = 0, altoMontana = 0;
let vozMontana = false; // con qué voz se dibujó la montaña («Tú» o «Vamos aquí»)
// (Campamento 22) Con qué familia se dibujó el valle (ventanas, piscuchas, iniciales): si la cuenta llega después que las compras, se rehace.
let familiaMontana = '';
const firmaFamilia = () => `${S.familia?.personas ?? 0}:${S.familia?.iniciales ?? ''}`;
let revisionValle = 0;
function revisarValle() {
  if (!S.cargado || !anchoMontana || familiaMontana === firmaFamilia()) return;
  // Si «Tú» está subiendo (o hay celebración), se espera a que acabe: rehacer la escena a medias cortaría la animación.
  clearTimeout(revisionValle);
  revisionValle = setTimeout(() => { if (familiaMontana !== firmaFamilia()) pintarMontana(false); }, Math.max(0, ocupadaHasta - performance.now()));
}
/**
 * La voz de la página (campamento 17): a quien solo mira se le habla «del libro» y no de «tu» saldo. Los textos fijos de la página
 * llevan su otra forma en `data-libro` (y `data-libro-aria` para su `aria-label`); aquí se elige cuál se ve. El dueño ve lo de siempre.
 */
let vozPintada = null;
export function pintarVoz() {
  const libro = vozLibro();
  if (vozPintada === libro) return;
  vozPintada = libro;
  for (const el of document.querySelectorAll('[data-libro]')) {
    el.dataset.yo ??= el.textContent;
    el.textContent = libro ? el.dataset.libro : el.dataset.yo;
  }
  for (const el of document.querySelectorAll('[data-libro-aria]')) {
    el.dataset.yoAria ??= el.getAttribute('aria-label') ?? '';
    el.setAttribute('aria-label', libro ? el.dataset.libroAria : el.dataset.yoAria);
  }
  document.documentElement.dataset.voz = libro ? 'libro' : 'yo';
  // Si la montaña ya estaba dibujada con la otra voz (la cuenta llegó después que las compras), se rehace el rótulo del punto.
  if (S.cargado && vozMontana !== libro && anchoMontana) { clearTimeout(redibujo); redibujo = setTimeout(() => pintarMontana(false), Math.max(0, ocupadaHasta - performance.now())); } // (59) tras la subida o la fiesta
}
pintarVoz(); // con la pista del dispositivo, antes de que llegue la cuenta

// Idea 32: desde 1 BTC el acento de la app es dorado (variables de color en el CSS, `html[data-acento="oro"]`). Con la celebración
// de 1 BTC en marcha se retiene el cambio hasta que acabe.
let acentoRetenido = false;
export function pintarAcento() {
  document.documentElement.dataset.acento = acentoDe(R.sats);
}
// Una etapa que sea potencia de 10 desde 1M (1M, 10M, 1 BTC…) es un hito grande.
export const esHito = (m) => m >= 1e6 && Math.abs(Math.log10(m) - Math.round(Math.log10(m))) < 1e-9;
// (39b · El tempo) La subida al anotar responde a tu dedo: sigue en 1.4 s (decidido con el dueño, no 2.4); lo que la acompaña se alargó.
export const MS_SUBIDA = 1400;

export function pintarMontana(animar, desde, festejo = null) {
  // (Campamento 23) Con la película del ascenso abierta, la escena de la página está vacía (una sola escena en el documento: ver
  // pelicula.js) y no se dibuja; al cerrarla, la película la vuelve a dibujar a la medida de ahora.
  if (peliculaAbierta()) return;
  if (enFiesta()) terminarFiesta(); // (59) redibujar lleva la fiesta en marcha a su estado final (no se corta a medias)
  const host = $('montana');
  anchoMontana = host.clientWidth;
  altoMontana = host.clientHeight;
  const inicio = animar ? 0 : desde ?? R.sats;
  const techo = bajoSaldo() - host.getBoundingClientRect().top;
  techoDibujado = techo;
  const fechas = Object.fromEntries(R.camino.map((h) => [h.m, h.fecha]));
  // Cuánto se reserva al pie para el botón flotante: lo dice el CSS (`--pie` en `.escena`; menos cuando la escena deja la franja
  // de abajo a las pestañas y el botón ya no flota sobre ella). Una lectura de estilo por dibujo.
  const pie = Number.parseFloat(getComputedStyle(host).getPropertyValue('--pie')) || 104;
  vozMontana = vozLibro();
  familiaMontana = firmaFamilia();
  dibujarMontana(host, { pie, libro: vozMontana, sats: R.sats, meta: R.meta, etapa: R.etapa, inicio, techo, fechas, compras: R.nCompras, ventas: R.nVentas, plantar: Boolean(festejo), tocable: true, mensajes: S.mensajes, puedeEscribir: esAdmin(), firmas: S.firmas, cumples: cumpleHoy(S.cumples, diaVista()), aurora: hayAurora(R.racha), eco: eco(S.compras, R.sats), aniv: Boolean(aniversario(S.compras, diaVista())), lluvia: lluviaEstrellas(diaVista())?.fuerza ?? 0, memoria: R.sats <= 0 ? Math.max(0, ...R.items.map((c) => c.satsAcum ?? 0)) : 0, personas: S.familia?.personas ?? 0, iniciales: S.familia?.iniciales ?? '', primera: primeraCompra(S.compras), meses: mesesDelLibro(S.compras, diaVista()), anios: aniosDelLibro(S.compras, diaVista()), farolHito: farolEncendido(), lleva: llevaTu(R, diaVista(), { libro: vozMontana }) });
  let f = null;
  if (festejo && R.sats > festejo.antes) {
    // La celebración va en proporción (campamento 21): una etapa intermedia sube como una compra (su marca se enciende al pasar y la
    // tarjeta es breve); una principal planta su bandera con cometa; un campamento desde 1M trae el amanecer; 1 BTC, lo épico.
    const m = etapaCelebrada(festejo.antes, R.sats);
    f = { delta: festejo.delta, etapa: m, nivel: cruzo1Btc(festejo.antes, R.sats) ? 'epico' : !m || rangoEtapa(m) === 'intermedia' ? 'compra' : esHito(m) ? 'hito' : 'etapa' };
    // El acento dorado llega cuando acaba la celebración de 1 BTC, no antes.
    if (f.nivel === 'epico') { acentoRetenido = true; setTimeout(() => { acentoRetenido = false; pintarAcento(); }, reducido() ? 0 : MS_SUBIDA + 3000); }
  }
  const ms = animar ? 2400 : f ? MS_SUBIDA : 1600;
  // La subida y su celebración no se cortan (39b: la de 1 BTC dura unos 9 s después de llegar).
  // (59) Y la fiesta del hito, si la hay (hasta 24 s después de llegar).
  const fiestaMs = festejo?.fiesta && f?.etapa === festejo.fiesta.meta ? MS_FIESTA[escalaFiesta(f.etapa)] : 0;
  ocupadaHasta = performance.now() + (inicio !== R.sats ? ms : 0) + Math.max(f?.nivel === 'epico' ? 11_000 : f ? 7000 : 0, fiestaMs);
  if (inicio !== R.sats) subir(inicio, R.sats, ms, f, animar);
}
// (Campamento 20) Si el bloque del saldo crece después de dibujar la montaña (llega el precio y «ya realizaste» baja a su renglón, otra
// letra…), la cumbre quedaría bajo el texto: se redibuja, cuando acaba la subida si estaba subiendo. Si encoge no hace falta.
let techoDibujado = 0, ocupadaHasta = 0, redibujo = 0;
/** Dónde acaba el bloque del saldo, sin la deriva de la tele (campamento D: se corre ±12 px y eso no debe redibujar la montaña). */
function bajoSaldo() {
  return document.querySelector('.saldo').getBoundingClientRect().bottom - (Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--tv-dy')) || 0);
}
/** (59) La fiesta del hito ocupa la escena `ms` más: los redibujos que esperan (el saldo que crece, la familia, la voz) esperan también. */
export function ocuparEscena(ms) { ocupadaHasta = Math.max(ocupadaHasta, performance.now() + ms); }
new ResizeObserver(() => {
  if (!S.cargado || !anchoMontana) return;
  const techo = bajoSaldo() - $('montana').getBoundingClientRect().top;
  if (techo <= techoDibujado + 4) return;
  clearTimeout(redibujo);
  redibujo = setTimeout(() => pintarMontana(false), Math.max(0, ocupadaHasta - performance.now()));
}).observe(document.querySelector('.saldo'));
new ResizeObserver(() => {
  // Se redibuja si cambia el ancho **o el alto** (una barra del navegador que aparece, las herramientas de desarrollo, un cambio de
  // ventana): el SVG se dibuja a la medida de la caja y, si solo cambiara el alto, se vería cortado y con una franja de cielo.
  const m = $('montana');
  if (S.cargado && (m.clientWidth !== anchoMontana || Math.abs(m.clientHeight - altoMontana) > 2)) pintarMontana(false);
}).observe($('montana'));

/** Avance de 0 a 1 entre la etapa anterior y la siguiente. */
export const progresoEtapa = () => (R.sats - R.etapaPrev) / (R.etapa - R.etapaPrev);

function pintarTramo() {
  $('tramo').hidden = !S.cargado || (S.errorCarga && !R.n);
  const prog = progresoEtapa();
  const meta = R.etapa >= 1e8 ? nombreHito(R.etapa) : `${nombreHito(R.etapa)} sats`;
  $('t-meta').textContent = meta;
  $('t-meta').style.setProperty('--n', String(meta.length)); // la meta va en un renglón: con muchos caracteres, la letra baja (CSS)
  const falta = $('t-falta');
  falta.textContent = 'faltan ';
  dual(falta, entero(R.etapa - R.sats), R.etapa - R.sats >= 1e8 ? satsCorto(R.etapa - R.sats) : numCorto(R.etapa - R.sats)); // «6.5B» sería ambiguo: en BTC
  const p = Math.max(0, Math.min(1, prog));
  requestAnimationFrame(() => pintarAnillo($('t-anillo-svg'), [{ clase: 'an-naranja', desde: 0, hasta: p }]));
  $('t-pct').textContent = `${p > 0 && p < 0.01 ? '<1' : Math.floor(p * 100)}%`;
  $('t-anillo').setAttribute('aria-label', `${vozLibro() ? 'El libro va' : 'Vas'} en ${(p * 100).toFixed(1)}% del camino a ${nombreHito(R.etapa)}${R.etapa >= 1e8 ? '' : ' sats'}`);
  // La escalerita del tramo (campamento 21): las etapas entre la última con sello y la siguiente; la que sigue se llena con el avance.
  const tr = tramoEtapas(R.sats), esc = $('t-esc');
  $('t-pasos').hidden = !R.n || tr.pasos.length < 2;
  if (!$('t-pasos').hidden) {
    if (esc.children.length !== tr.pasos.length) esc.replaceChildren(...tr.pasos.map(() => document.createElement('i')));
    esc.style.setProperty('--n', String(tr.pasos.length));
    [...esc.children].forEach((el, i) => { el.className = i < tr.hechas ? 'hecha' : i === tr.hechas ? 'sig' : ''; el.style.setProperty('--p', i === tr.hechas ? p.toFixed(3) : '0'); });
    pegado($('t-pasos-t'), `Etapa ${tr.hechas + 1} de ${tr.pasos.length} del tramo de ${nombreHito(tr.desde)} a ${nombreHito(tr.hasta)}${tr.hasta >= 1e8 ? '' : ' sats'}`);
  }
  pegado($('t-ritmo'), R.proyeccion
    ? `Al ritmo de los últimos 6 meses${R.nExtra ? `, sin contar ${vozLibro() ? 'las' : 'tus'} compras extra,` : ''} (${entero(R.satsMes)} sats al mes) ${vozLibro() ? 'se llega' : 'llegas'} en ${plazo(R.proyeccion)}.`
    : R.n ? `${vozLibro() ? 'El libro va' : 'Vas'} en ${(prog * 100).toFixed(1)}% de este tramo.` : 'La primera etapa está en 100k sats.');
}
export const plazo = (m) => (m < 1 ? 'menos de un mes' : `${Math.round(m)} ${Math.round(m) === 1 ? 'mes' : 'meses'}`);
