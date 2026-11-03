import {
  usd, usd0, usdSigno, pct, entero, btc, hora, hoyISO, fechaLarga, mesLargo,
  leerNumero, leerSats, completar, resumir, serie, ritmo,
} from './lib.js';
import { dibujar } from './chart.js';
import { dibujarPila, HITOS, meta } from './pila.js';

const $ = (id) => document.getElementById(id);
const reducirMovimiento = matchMedia('(prefers-reduced-motion: reduce)');

const S = {
  compras: [],
  cargado: false,
  errorCarga: false,
  precio: null,
  precioTs: 0,
  fuente: '',
  viejo: false,
  errorPrecio: false,
  editando: null,
  guardando: false,
  verTodas: false,
  fantasma: 0,
  animarPila: false,
};

const VISIBLES = 20;

// ------------------------------------------------------------------ API
async function api(metodo, ruta, cuerpo, tipo = 'application/json') {
  const opt = { method: metodo, headers: { Accept: 'application/json' }, cache: 'no-store' };
  if (cuerpo !== undefined) {
    opt.headers['Content-Type'] = tipo;
    opt.body = tipo === 'application/json' ? JSON.stringify(cuerpo) : cuerpo;
  }
  let r;
  try {
    r = await fetch(ruta, opt);
  } catch {
    // Con la sesión de Cloudflare Access vencida, fetch falla por la redirección al login.
    throw Object.assign(new Error('Sin conexión con el servidor. Si tu sesión venció, recarga la página.'), { status: 0 });
  }
  if (r.status === 204) return null;
  const j = await r.json().catch(() => null);
  if (!r.ok) throw Object.assign(new Error(j?.error || `Error ${r.status}.`), { status: r.status });
  return j;
}

const normalizar = (c) => ({ ...c, id: Number(c.id), sats: c.sats > 0 ? c.sats : Math.round((c.monto / c.precio) * 1e8) });

async function cargar() {
  try {
    const lista = await api('GET', '/api/compras');
    S.compras = lista.map(normalizar);
    S.errorCarga = false;
    avisar('');
  } catch (e) {
    S.errorCarga = true;
    avisar(`No se pudieron cargar las compras. ${e.status === 0 ? e.message : ''}`.trim(), cargar);
  }
  S.cargado = true;
  pintar();
}

async function consultarPrecio() {
  try {
    const j = await api('GET', '/api/precio');
    Object.assign(S, { precio: j.precio, precioTs: j.ts, fuente: j.fuente, viejo: j.viejo, errorPrecio: false });
  } catch {
    S.errorPrecio = true;
  }
  pintar();
}

// --------------------------------------------------------------- avisos
let avisoTimer = 0;
function avisar(texto, reintentar = null, temporal = false) {
  clearTimeout(avisoTimer);
  $('aviso-txt').textContent = texto;
  $('aviso').hidden = !texto;
  $('aviso-btn').hidden = temporal;
  $('aviso-btn').textContent = reintentar ? 'Reintentar' : 'Cerrar';
  $('aviso-btn').onclick = reintentar ?? (() => avisar(''));
  if (temporal) avisoTimer = setTimeout(() => avisar(''), 6000);
}

// ---------------------------------------------------------------- pintar
function pintar() {
  const r = resumir(S.compras, S.precio);
  pintarPrecio();
  pintarPila(r);
  pintarResumen(r);
  pintarGrafico(r);
  pintarLista(r);
  pintarForm();
}

function pintarPrecio() {
  const estado = S.precio ? (S.viejo || S.errorPrecio ? 'viejo' : 'vivo') : S.errorPrecio ? 'error' : 'cargando';
  $('cotizacion').dataset.estado = estado;
  $('precio').textContent = S.precio ? usd0(S.precio) : '—';
  $('precio-meta').textContent = {
    vivo: `${S.fuente} · ${hora(S.precioTs)}`,
    viejo: `sin actualizar desde ${hora(S.precioTs)}`,
    error: 'no disponible',
    cargando: 'consultando…',
  }[estado];
}

function tono(el, n) {
  if (n == null) delete el.dataset.tono;
  else el.dataset.tono = n >= 0 ? 'sube' : 'baja';
}

function pintarResumen(r) {
  const gan = $('r-gan');
  $('r-valor').textContent = r.valor != null ? usd(r.valor) : '—';
  if (r.ganancia != null) {
    gan.textContent = `${usdSigno(r.ganancia)} (${pct(r.ganPct)}) sin vender`;
  } else {
    gan.textContent = !S.cargado ? 'Cargando…' : !r.n ? 'Aún no hay compras.' : 'Falta el precio en vivo para calcular el valor.';
  }
  tono(gan, r.ganancia);

  $('r-inv').textContent = r.n ? usd(r.inv) : '—';
  $('r-n').textContent = r.n ? `${r.n} ${r.n === 1 ? 'compra' : 'compras'} desde ${fechaLarga(r.items[0].fecha)}` : '';
  $('r-prom').textContent = r.promedio ? usd(r.promedio) : '—';
  const sub = $('r-prom-sub');
  if (r.promedio && S.precio) {
    const d = (S.precio / r.promedio - 1) * 100;
    sub.textContent = `BTC hoy: ${pct(d)}`;
    tono(sub, d);
  } else {
    sub.textContent = '';
    tono(sub, null);
  }
}

// ------------------------------------------------------------------- pila
const plazo = (m) => (m < 1 ? 'menos de un mes' : m < 24 ? `${Math.round(m)} ${Math.round(m) === 1 ? 'mes' : 'meses'}` : `${(m / 12).toFixed(1)} años`);

function pintarPila(r) {
  const ult = r.items.at(-1);
  const fantasma = S.fantasma;
  $('p-sats').textContent = S.cargado ? entero(r.sats) : '—';
  $('p-btc').textContent = r.n ? `${btc(r.sats)} BTC${r.valor != null ? ` · valen ${usd(r.valor)}` : ''}` : '';
  const { tope, unidad, nuevos } = dibujarPila($('p-cuadricula'), { sats: r.sats, previo: ult ? r.sats - ult.sats : 0, fantasma });
  const nombre = HITOS.find(([m]) => m === tope)[1] + (tope < 1e8 ? ' sats' : '');
  $('k-fantasma').hidden = !fantasma;
  $('p-leyenda').hidden = !r.n && !fantasma;
  $('p-escala').textContent =
    `Cada cuadro, ${entero(unidad)} sats. Meta: ${nombre}, vas en ${((r.sats / tope) * 100).toFixed(1)}%.` +
    (fantasma ? ` Esta compra suma ${((fantasma / tope) * 100).toFixed(1)}%.` : '');

  $('p-hitos').innerHTML = HITOS.filter(([m]) => m <= Math.max(1e8, tope))
    .map(([m, txt]) => `<li data-estado="${r.sats >= m ? 'logrado' : m === tope ? 'meta' : 'pendiente'}">${txt}</li>`)
    .join('');

  const rt = ritmo(r.items, r.sats, tope);
  $('p-ritmo').textContent = rt
    ? `Al ritmo de los últimos 6 meses (${entero(rt.porMes)} sats/mes) llegas a ${nombre} en ${plazo(rt.meses)}.`
    : '';

  if (S.animarPila && !reducirMovimiento.matches) {
    nuevos.forEach((el, i) => {
      el.classList.add('cae');
      el.style.animationDelay = `${Math.min(i, 30) * 35}ms`;
    });
  }
  S.animarPila = false;
}

// --------------------------------------------------------------- gráfico
let G = null;
let selG = null;

function pintarGrafico(r) {
  const host = $('g-lienzo');
  const pts = serie(r, S.precio);
  $('g-nota').hidden = !pts.length;
  if (!pts.length) {
    G = null;
    host.innerHTML = `<p class="vacio">${S.cargado ? 'El gráfico aparece con tu primera compra.' : 'Cargando…'}</p>`;
    $('g-lectura').textContent = '';
    return;
  }
  if (selG != null && selG >= pts.length) selG = null;
  G = { pts, dib: dibujar(host, pts) };
  leer(selG);
}

function leer(i) {
  selG = i;
  const p = G.pts[i ?? G.pts.length - 1];
  G.dib.marcar(i);
  const fecha = p.hoy ? 'Hoy' : fechaLarga(p.fecha);
  $('g-lectura').innerHTML =
    `<span class="l-fecha">${fecha}</span>` +
    `<span class="l-inv">Invertido <b>${usd(p.inv)}</b></span>` +
    `<span class="l-val">Valor <b>${usd(p.valor)}</b></span>`;
  return `${fecha}: invertido ${usd(p.inv)}, valor ${usd(p.valor)}`;
}

function puntoCercano(ev) {
  const svg = $('g-lienzo').querySelector('svg');
  const caja = svg.getBoundingClientRect();
  const x = ((ev.clientX - caja.left) * G.dib.ancho) / caja.width;
  let mejor = 0;
  G.dib.xs.forEach((xi, i) => {
    if (Math.abs(xi - x) < Math.abs(G.dib.xs[mejor] - x)) mejor = i;
  });
  return mejor;
}

const lienzo = $('g-lienzo');
lienzo.addEventListener('pointermove', (e) => G && leer(puntoCercano(e)));
lienzo.addEventListener('pointerdown', (e) => G && leer(puntoCercano(e)));
lienzo.addEventListener('pointerleave', () => G && document.activeElement !== lienzo && leer(null));
lienzo.addEventListener('blur', () => G && leer(null));
lienzo.addEventListener('keydown', (e) => {
  if (!G) return;
  const ult = G.pts.length - 1;
  const actual = selG ?? ult;
  const sig = { ArrowLeft: actual - 1, ArrowRight: actual + 1, Home: 0, End: ult }[e.key];
  if (sig == null) return;
  e.preventDefault();
  $('g-sr').textContent = leer(Math.max(0, Math.min(ult, sig)));
});

let anchoG = 0;
new ResizeObserver(() => {
  if (lienzo.clientWidth !== anchoG) {
    anchoG = lienzo.clientWidth;
    pintarGrafico(resumir(S.compras, S.precio));
  }
}).observe(lienzo);

// ----------------------------------------------------------------- lista
function pintarLista(r) {
  const host = $('lista');
  $('csv-out').hidden = !r.n;
  if (!r.n) {
    host.innerHTML = `<p class="vacio">${
      !S.cargado ? 'Cargando compras…'
        : S.errorCarga ? 'No se pudieron cargar las compras.'
          : 'Todavía no hay compras. Registra la primera o importa un CSV.'
    }</p>`;
    return;
  }
  const enFoco = document.activeElement?.closest?.('#lista .fila')?.dataset.id;
  const meses = new Map();
  const recientes = [...r.items].reverse();
  const mostradas = S.verTodas ? recientes : recientes.slice(0, VISIBLES);
  for (const c of mostradas) {
    const k = c.fecha.slice(0, 7);
    if (!meses.has(k)) meses.set(k, []);
    meses.get(k).push(c);
  }
  let html = '';
  const totales = new Map();
  for (const c of r.items) totales.set(c.fecha.slice(0, 7), (totales.get(c.fecha.slice(0, 7)) ?? 0) + c.monto);
  for (const [mes, compras] of meses) {
    const total = totales.get(mes);
    html += `<h3 class="mes"><span>${mesLargo(compras[0].fecha)}</span><span class="cifra">${usd(total)}</span></h3><ul>`;
    for (const c of compras) {
      const v = S.precio ? (S.precio / c.precio - 1) * 100 : null;
      html +=
        `<li><button type="button" class="fila" data-id="${c.id}"${S.editando === c.id ? ' aria-current="true"' : ''}>` +
        `<span class="sr">Editar compra del </span>` +
        `<span class="f-fecha">${fechaLarga(c.fecha)}</span>` +
        `<span class="f-monto cifra">${usd(c.monto)}</span>` +
        `<span class="f-sats cifra">${entero(c.sats)} sats</span>` +
        `<span class="f-precio cifra">a ${usd0(c.precio)}</span>` +
        `<span class="f-var cifra"${v == null ? '' : ` data-tono="${v >= 0 ? 'sube' : 'baja'}"`}>${v == null ? '' : pct(v)}</span>` +
        `</button></li>`;
    }
    html += '</ul>';
  }
  if (mostradas.length < r.n) {
    html += `<button type="button" class="boton mas" id="ver-todas">Mostrar las ${r.n} compras</button>`;
  }
  host.innerHTML = html;
  if (enFoco) host.querySelector(`.fila[data-id="${enFoco}"]`)?.focus();
}

$('lista').addEventListener('click', (e) => {
  if (e.target.closest('#ver-todas')) {
    S.verTodas = true;
    pintar();
    document.querySelectorAll('#lista .fila')[VISIBLES]?.focus();
    return;
  }
  const b = e.target.closest('.fila');
  if (b) editar(Number(b.dataset.id));
});

// ------------------------------------------------------------ formulario
const F = { fecha: $('f-fecha'), monto: $('f-monto'), sats: $('f-sats'), precio: $('f-precio') };

const sumaSats = () => S.compras.reduce((a, c) => a + c.sats, 0);

const leerForm = () =>
  completar(
    { monto: leerNumero(F.monto.value), sats: leerSats(F.sats.value), precio: leerNumero(F.precio.value) },
    S.precio,
  );

function pintarCalculo() {
  const c = leerForm();
  const fantasma = !S.editando && c && !c.falta ? c.sats : 0;
  if (fantasma !== S.fantasma) {
    S.fantasma = fantasma;
    if (!S.animarPila) pintarPila(resumir(S.compras, S.precio));
  }
  $('f-calc').textContent = !c ? ''
    : c.falta ? 'Falta el precio de 1 BTC para calcular.'
      : `${usd(c.monto)} por ${entero(c.sats)} sats · 1 BTC a ${usd(c.precio)}${c.estimado ? ' (estimado con el precio actual)' : ''}` +
        (S.fantasma ? ` · suma ${((S.fantasma / meta(sumaSats())) * 100).toFixed(1)}% a tu meta` : '');
}

function error(texto = '', campo = null) {
  $('f-error').textContent = texto;
  for (const el of Object.values(F)) el.removeAttribute('aria-invalid');
  if (campo) {
    if (campo === F.precio) $('f-det').open = true;
    campo.setAttribute('aria-invalid', 'true');
    campo.focus();
  }
}

function pintarForm() {
  const ed = S.compras.find((c) => c.id === S.editando);
  $('t-form').textContent = ed ? 'Editar compra' : 'Anotar compra';
  $('f-editando').hidden = !ed;
  $('f-editando').textContent = ed ? fechaLarga(ed.fecha) : '';
  $('f-cancelar').hidden = !ed;
  $('f-borrar').hidden = !ed;
  $('f-guardar').textContent = S.guardando ? 'Guardando…' : ed ? 'Guardar cambios' : 'Guardar compra';
  $('f-guardar').setAttribute('aria-disabled', String(S.guardando));
  F.fecha.max = hoyISO();
}

function limpiarForm() {
  S.editando = null;
  F.fecha.value = hoyISO();
  F.monto.value = F.sats.value = F.precio.value = '';
  $('f-det').open = false;
  error();
  pintarCalculo();
}

function editar(id) {
  const c = S.compras.find((x) => x.id === id);
  if (!c) return;
  S.editando = id;
  F.fecha.value = c.fecha;
  F.monto.value = String(c.monto);
  F.sats.value = entero(c.sats);
  F.precio.value = '';
  $('f-det').open = false;
  error();
  pintarCalculo();
  pintar();
  $('form').scrollIntoView({ block: 'start', behavior: reducirMovimiento.matches ? 'auto' : 'smooth' });
  F.monto.focus({ preventScroll: true });
}

function terminarEdicion() {
  const id = S.editando;
  limpiarForm();
  pintar();
  document.querySelector(`#lista .fila[data-id="${id}"]`)?.focus();
}

for (const el of [F.monto, F.sats, F.precio]) el.addEventListener('input', pintarCalculo);
$('f-usar').addEventListener('click', () => {
  if (!S.precio) return error('Todavía no hay precio en vivo. Escríbelo.', F.precio);
  F.precio.value = S.precio.toFixed(2);
  pintarCalculo();
});
$('f-cancelar').addEventListener('click', terminarEdicion);

$('form').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (S.guardando) return;
  const fecha = F.fecha.value;
  const c = leerForm();
  if (!fecha) return error('Elige la fecha de la compra.', F.fecha);
  if (fecha > hoyISO()) return error('La fecha no puede ser futura.', F.fecha);
  if (!c) return error('Escribe el monto en USD y los sats que recibiste.', F.monto);
  if (c.falta) return error('Sin precio en vivo: escribe el precio de 1 BTC o los sats.', F.precio);
  error();
  S.guardando = true;
  pintarForm();
  const datos = { fecha, monto: c.monto, sats: c.sats };
  const id = S.editando;
  try {
    const guardada = normalizar(id ? await api('PUT', `/api/compras/${id}`, datos) : await api('POST', '/api/compras', datos));
    S.compras = id ? S.compras.map((x) => (x.id === id ? guardada : x)) : [...S.compras, guardada];
    S.animarPila = !id;
    limpiarForm();
    avisar(id ? 'Cambios guardados.' : 'Compra guardada.', null, true);
    S.guardando = false;
    pintar();
    if (id) document.querySelector(`#lista .fila[data-id="${id}"]`)?.focus();
    else F.monto.focus();
  } catch (err) {
    S.guardando = false;
    pintarForm();
    if (err.status === 404) {
      S.compras = S.compras.filter((x) => x.id !== id);
      limpiarForm();
      pintar();
    }
    error(err.message);
  }
});

// ----------------------------------------------------------------- borrar
const dialogo = $('d-borrar');
$('f-borrar').addEventListener('click', () => {
  const c = S.compras.find((x) => x.id === S.editando);
  if (!c) return;
  $('d-texto').textContent = `${fechaLarga(c.fecha)} · ${usd(c.monto)} · ${entero(c.sats)} sats`;
  dialogo.returnValue = '';
  dialogo.showModal();
});
dialogo.addEventListener('close', async () => {
  const id = S.editando;
  if (dialogo.returnValue !== 'si' || id == null) return;
  try {
    await api('DELETE', `/api/compras/${id}`);
    avisar('Compra borrada.', null, true);
  } catch (err) {
    if (err.status !== 404) return error(err.message);
  }
  S.compras = S.compras.filter((x) => x.id !== id);
  limpiarForm();
  pintar();
  $('t-compras').focus();
});

// -------------------------------------------------------------------- CSV
$('csv-in').addEventListener('change', async (e) => {
  const archivo = e.target.files[0];
  e.target.value = '';
  if (!archivo) return;
  try {
    const r = await api('POST', '/api/import', await archivo.text(), 'text/csv');
    await cargar();
    const omit = r.omitidas.length;
    avisar(
      `Importadas: ${r.nuevas} · repetidas: ${r.repetidas} · omitidas: ${omit}` +
        (omit ? `. ${r.omitidas.slice(0, 3).join('. ')}${omit > 3 ? '…' : ''}` : '.'),
    );
  } catch (err) {
    avisar(`No se pudo importar. ${err.message}`);
  }
});

// ---------------------------------------------------------------- arranque
limpiarForm();
pintar();
cargar();
consultarPrecio();
setInterval(() => document.visibilityState === 'visible' && consultarPrecio(), 30_000);
document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && consultarPrecio());
