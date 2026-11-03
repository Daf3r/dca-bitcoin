import {
  usd, usd0, usdSigno, pct, entero, btc, hora, hoyISO, aFecha, fechaLarga, fechaCorta, mesLargo,
  leerNumero, leerSats, completar, resumir, serie, ritmo, meta, nombreMeta, etiquetaSats,
} from './lib.js';
import { dibujar } from './chart.js';

const $ = (id) => document.getElementById(id);
const reducirMovimiento = matchMedia('(prefers-reduced-motion: reduce)');
const LINEAS = 12;

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
  sellar: false,
};

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
    S.compras = (await api('GET', '/api/compras')).map(normalizar);
    S.errorCarga = false;
    avisar('');
  } catch (e) {
    S.errorCarga = true;
    avisar(`No se pudo abrir la libreta. ${e.status === 0 ? e.message : ''}`.trim(), cargar);
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
  pintarSaldo(r);
  pintarDatos(r);
  pintarLista(r);
  pintarGrafico(r);
  pintarForm();
}

function pintarPrecio() {
  const estado = S.precio ? (S.viejo || S.errorPrecio ? 'viejo' : 'vivo') : S.errorPrecio ? 'error' : 'cargando';
  $('cotizacion').dataset.estado = estado;
  $('precio').textContent = S.precio ? usd0(S.precio) : '—';
  $('precio-meta').textContent = {
    vivo: `${S.fuente}, ${hora(S.precioTs)}`,
    viejo: `sin actualizar desde las ${hora(S.precioTs)}`,
    error: 'no disponible',
    cargando: 'consultando…',
  }[estado];
}

const tono = (n) => (n >= 0 ? 'sube' : 'baja');

function ajustarCifra(el, texto) {
  el.textContent = texto;
  el.style.setProperty('--caracteres', String(Math.max(texto.length, 5)));
}

function pintarSaldo(r) {
  const listo = S.cargado && !(S.errorCarga && !r.n);
  ajustarCifra($('p-sats'), listo ? entero(r.sats) : '—');

  const linea = $('r-valor-linea');
  if (!S.cargado) linea.textContent = 'Abriendo la libreta…';
  else if (!listo) linea.textContent = 'No se pudo abrir la libreta.';
  else if (!r.n) linea.textContent = 'La libreta está en blanco. Anota tu primera compra y empieza la cuenta.';
  else if (r.valor == null) linea.textContent = `Invertiste ${usd(r.inv)}. El valor aparece cuando vuelva el precio en vivo.`;
  else {
    linea.innerHTML =
      `Hoy valen <b class="cifra">${usd(r.valor)}</b>. ` +
      `<span class="cifra" data-tono="${tono(r.ganancia)}">${usdSigno(r.ganancia)} (${pct(r.ganPct)})</span> ` +
      `sobre ${usd(r.inv)} invertidos.`;
  }

  $('p-camino').hidden = !listo;
  if (!listo) return;
  const tope = meta(r.sats);
  const avance = r.sats / tope;
  const extra = Math.min(S.fantasma, tope - r.sats) / tope;
  pintarRegla(tope, avance, extra);
  $('p-escala').textContent =
    (r.n ? `Te faltan ${entero(tope - r.sats)} sats para ${nombreMeta(tope)}.` : 'Primera meta: un millón de sats.') +
    (S.fantasma ? ` Esta compra te acerca un ${(extra * 100).toFixed(1)}% más.` : '');
  const rt = ritmo(r.items, r.sats, tope);
  $('p-ritmo').textContent = rt ? `A tu ritmo de los últimos 6 meses (${entero(rt.porMes)} sats al mes), llegas en ${plazo(rt.meses)}.` : '';
}

const plazo = (m) => (m < 1 ? 'menos de un mes' : m < 24 ? `${Math.round(m)} ${Math.round(m) === 1 ? 'mes' : 'meses'}` : `${(m / 12).toFixed(1)} años`);

function pintarRegla(tope, avance, extra) {
  const host = $('p-regla');
  if (!host.firstChild) {
    host.innerHTML =
      '<div class="r-pista"><span class="r-lleno"></span><span class="r-fantasma"></span>' +
      Array.from({ length: 9 }, (_, i) => `<span class="r-tic${i === 4 ? ' r-medio' : ''}"></span>`).join('') +
      '</div><div class="r-etiquetas"><span>0</span><span class="r-mitad"></span><span class="r-fin"></span></div>';
    host.querySelectorAll('.r-tic').forEach((t, i) => { t.style.left = `${(i + 1) * 10}%`; });
  }
  const lleno = host.querySelector('.r-lleno');
  const fantasma = host.querySelector('.r-fantasma');
  // Un mínimo visible: con 36k de 1M sats la barra no debe parecer vacía.
  lleno.style.width = `${avance > 0 ? Math.max(avance * 100, 0.8) : 0}%`;
  fantasma.style.left = lleno.style.width;
  fantasma.style.width = `${extra * 100}%`;
  host.querySelector('.r-mitad').textContent = etiquetaSats(tope / 2);
  host.querySelector('.r-fin').textContent = etiquetaSats(tope);
}

const haceDias = (fecha) => {
  const d = Math.round((aFecha(hoyISO()) - aFecha(fecha)) / 864e5);
  return d <= 0 ? 'hoy' : d === 1 ? 'ayer' : `hace ${d} días`;
};

function pintarDatos(r) {
  $('r-datos').hidden = !r.n;
  if (!r.n) return;
  ajustarCifra($('r-prom'), usd(r.promedio));
  const sub = $('r-prom-sub');
  if (S.precio) {
    const d = (S.precio / r.promedio - 1) * 100;
    sub.textContent = Math.abs(d) < 0.05 ? 'igual al precio de hoy' : `BTC hoy está ${Math.abs(d).toFixed(1)}% ${d > 0 ? 'por encima' : 'por debajo'}`;
    sub.dataset.tono = tono(d);
  } else {
    sub.textContent = '';
    delete sub.dataset.tono;
  }
  ajustarCifra($('r-inv'), usd(r.inv));
  $('r-n').textContent = `en ${r.n} ${r.n === 1 ? 'compra' : 'compras'}`;
  ajustarCifra($('p-btc'), btc(r.sats));
  $('r-ultima').textContent = `última compra ${haceDias(r.items.at(-1).fecha)}`;
}

// --------------------------------------------------------------- libreta
function pintarLista(r) {
  const host = $('lista');
  $('csv-out').hidden = !r.n;
  if (!r.n) {
    host.innerHTML = `<p class="vacio">${
      !S.cargado ? 'Abriendo la libreta…'
        : S.errorCarga ? 'No se pudo abrir la libreta.'
          : 'Aún no hay líneas. La primera se escribe aquí abajo, o importa un CSV.'
    }</p>`;
    return;
  }
  const enFoco = document.activeElement?.closest?.('#lista .fila')?.dataset.id;
  const desde = S.verTodas ? 0 : Math.max(0, r.n - LINEAS);
  const visibles = r.items.slice(desde);
  const totales = new Map();
  for (const c of r.items) {
    const k = c.fecha.slice(0, 7);
    const t = totales.get(k) ?? { usd: 0, n: 0 };
    totales.set(k, { usd: t.usd + c.monto, n: t.n + 1 });
  }
  const ultima = r.items.at(-1).id;
  let html = desde ? `<button type="button" class="enlace anteriores" id="ver-todas">Ver las ${desde} líneas anteriores</button>` : '';
  let mes = '';
  for (const c of visibles) {
    const k = c.fecha.slice(0, 7);
    if (k !== mes) {
      if (mes) html += '</ul>';
      const t = totales.get(k);
      html += `<h3 class="mes"><span>${mesLargo(c.fecha)}</span><span class="cifra">${usd(t.usd)} en ${t.n} ${t.n === 1 ? 'compra' : 'compras'}</span></h3><ul>`;
      mes = k;
    }
    const v = S.precio ? (S.precio / c.precio - 1) * 100 : null;
    html +=
      `<li><button type="button" class="fila" data-id="${c.id}"${S.editando === c.id ? ' aria-current="true"' : ''}` +
      (v == null ? '' : ` title="Desde entonces BTC ${pct(v)}"`) + '>' +
      `<span class="sr">Corregir la línea del </span>` +
      `<span class="f-fecha">${fechaCorta(c.fecha)}</span>` +
      `<span class="f-monto cifra">${usd(c.monto)}</span>` +
      `<span class="f-precio cifra">a ${usd0(c.precio)}</span>` +
      `<span class="f-sats cifra">+${entero(c.sats)}</span>` +
      `<span class="f-saldo cifra"><span class="f-k">saldo </span>${entero(c.satsAcum)}</span>` +
      `</button>` +
      (c.id === ultima ? `<span class="sello${S.sellar ? ' golpe' : ''}" aria-hidden="true"><span>anotado</span><b>${fechaLarga(c.fecha)}</b></span>` : '') +
      `</li>`;
  }
  host.innerHTML = html + '</ul>';
  if (reducirMovimiento.matches) host.querySelector('.golpe')?.classList.remove('golpe');
  S.sellar = false;
  if (enFoco) host.querySelector(`.fila[data-id="${enFoco}"]`)?.focus();
}

$('lista').addEventListener('click', (e) => {
  if (e.target.closest('#ver-todas')) {
    S.verTodas = true;
    pintar();
    $('lista').querySelector('.fila')?.focus();
    return;
  }
  const b = e.target.closest('.fila');
  if (b) editar(Number(b.dataset.id));
});

// --------------------------------------------------------------- gráfico
let G = null;
let selG = null;

function pintarGrafico(r) {
  const host = $('g-lienzo');
  const pts = serie(r, S.precio);
  // Con menos de tres puntos la curva es una raya: mejor decirlo que dibujarla.
  const pocos = pts.length < 3;
  host.hidden = pocos;
  $('g-lectura').hidden = pocos;
  $('g-nota').textContent = !r.n
    ? 'Aquí verás cómo crece lo invertido frente a lo que vale.'
    : pocos
      ? 'La curva aparece desde la tercera compra; con menos puntos solo sería una raya.'
      : 'El valor usa el precio de cada compra y, al final, el actual. Entre compras la línea es una aproximación.';
  if (pocos) {
    G = null;
    host.innerHTML = '';
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
  const caja = $('g-lienzo').querySelector('svg').getBoundingClientRect();
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
  if (lienzo.clientWidth && lienzo.clientWidth !== anchoG) {
    anchoG = lienzo.clientWidth;
    pintarGrafico(resumir(S.compras, S.precio));
  }
}).observe(lienzo);

// ------------------------------------------------------------ formulario
const F = { fecha: $('f-fecha'), monto: $('f-monto'), sats: $('f-sats'), precio: $('f-precio') };

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
    pintarSaldo(resumir(S.compras, S.precio));
  }
  const saldo = S.compras.reduce((a, x) => a + x.sats, 0);
  $('f-calc').textContent = !c ? ''
    : c.falta ? 'Falta el precio de 1 BTC para calcular.'
      : `1 BTC a ${usd(c.precio)}${c.estimado ? ', estimado con el precio actual' : ''}.` +
        (fantasma ? ` Nuevo saldo: ${entero(saldo + fantasma)} sats.` : '');
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
  $('t-form').textContent = ed ? 'Corrigiendo la línea' : S.compras.length ? 'Siguiente línea' : 'Primera línea';
  $('f-editando').hidden = !ed;
  $('f-editando').textContent = ed ? `del ${fechaLarga(ed.fecha)}` : '';
  $('form').classList.toggle('corrigiendo', !!ed);
  $('f-cancelar').hidden = !ed;
  $('f-borrar').hidden = !ed;
  $('f-guardar').textContent = S.guardando ? 'Anotando…' : ed ? 'Guardar cambios' : 'Anotar';
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
  $('form').scrollIntoView({ block: 'center', behavior: reducirMovimiento.matches ? 'auto' : 'smooth' });
  F.monto.focus({ preventScroll: true });
}

for (const el of [F.monto, F.sats, F.precio]) el.addEventListener('input', pintarCalculo);
$('f-usar').addEventListener('click', () => {
  if (!S.precio) return error('Todavía no hay precio en vivo. Escríbelo.', F.precio);
  F.precio.value = S.precio.toFixed(2);
  pintarCalculo();
});
$('f-cancelar').addEventListener('click', () => {
  const id = S.editando;
  limpiarForm();
  pintar();
  document.querySelector(`#lista .fila[data-id="${id}"]`)?.focus();
});

$('form').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (S.guardando) return;
  const fecha = F.fecha.value;
  const c = leerForm();
  if (!fecha) return error('Elige la fecha de la compra.', F.fecha);
  if (fecha > hoyISO()) return error('La fecha no puede ser futura.', F.fecha);
  if (!c) return error('Escribe cuánto pagaste en USD y los sats que recibiste.', F.monto);
  if (c.falta) return error('Sin precio en vivo: escribe el precio de 1 BTC o los sats.', F.precio);
  error();
  S.guardando = true;
  pintarForm();
  const datos = { fecha, monto: c.monto, sats: c.sats };
  const id = S.editando;
  try {
    const guardada = normalizar(id ? await api('PUT', `/api/compras/${id}`, datos) : await api('POST', '/api/compras', datos));
    S.compras = id ? S.compras.map((x) => (x.id === id ? guardada : x)) : [...S.compras, guardada];
    S.sellar = !id;
    S.guardando = false;
    limpiarForm();
    avisar(id ? 'Línea corregida.' : 'Compra anotada.', null, true);
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
    avisar('Línea borrada.', null, true);
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
