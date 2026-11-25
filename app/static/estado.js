import { resumen } from './lib.js';
import { sinMovimiento } from './movimiento.js';

export const $ = (id) => document.getElementById(id);
export const reducido = sinMovimiento; // sin animación (nivel «ninguno» de efectos.js, que también atiende el ajuste del sistema)

export const S = {
  compras: [], cargado: false, errorCarga: false,
  precio: null, precioTs: 0, fuente: '', viejo: false, errorPrecio: false,
  historico: [], histEstado: 'cargando', histDesde: null, rango: null,
  traslados: [],
  wallets: [], // las wallets además de la principal (idea 156)
  piedritas: [], // las piedritas de los lectores en las compras (15B): { compra_id, quien, creado }
  cumples: [], // los cumpleaños que puso la familia (15B): { nombre, cumple: 'MM-DD' }
  cumple: null, // el tuyo
  mensajes: [], // las frases de las banderas (15A): { hito, texto, sellado, por }
  firmas: [], // el libro de cumbre (19): { id, hito, quien, texto, creado, editado, mia }
  montana: null, // el nombre de la montaña (19), si quien anota le puso uno
  fiesta: null, // (59) la fiesta de hoy (`/api/fiesta`): { dia, hito: { meta, rango, id } | null, halving }
  capsulas: [], // las cartas selladas (15A): { id, abre_fecha, abre_sats, abierta, texto (solo si ya se abrió o eres el dueño), … }
  usuario: null, rol: null,
  familia: null, // el valle (22): { personas, iniciales } de las cuentas activas (llega con /api/yo)
};
export let R = resumen([], null);
/** R se reasigna solo desde aquí: los demás módulos la leen (enlace vivo) pero no la pueden asignar. */
export function fijarR(nuevo) { R = nuevo; }

// ------------------------------------------------------------------ API
// Las lecturas grandes (compras, traslados, histórico) guardan en memoria su ETag y su cuerpo: al volver a pedirlas se manda
// `If-None-Match` y, si no cambiaron, el servidor contesta 304 sin cuerpo. La API sigue en `no-store`: esto es solo de esta página.
const CON_ETAG = /^\/api\/(compras|traslados|historico)(\?|$)/;
const guardadas = new Map();
// Si el servidor se reinicia (o Caddy no lo alcanza) una lectura se reintenta sola unos segundos antes de rendirse; las escrituras no
// se repiten nunca (podrían duplicarse). Una página de error de Caddy o de Cloudflare no es JSON: un 503 de la app sí lo es y no se reintenta.
const ESPERAS_MS = [800, 1600, 3200, 6400];
const avisarRed = (estado) => window.dispatchEvent(new CustomEvent('libro:red', { detail: { estado } }));
const caido = (r) => [502, 503, 504].includes(r.status) && !(r.headers.get('content-type') ?? '').includes('json');

/**
 * Único punto de salida hacia el servidor. Si algún día la app tiene login propio,
 * aquí se trata el 401 (redirigir o pedir la contraseña) para toda la app.
 */
export async function api(ruta, { metodo = 'GET', cuerpo, tipo = 'application/json' } = {}) {
  // X-Libro obliga a un preflight CORS: otra web no puede escribir aquí aunque tengas sesión.
  const opt = { method: metodo, headers: { Accept: 'application/json', 'X-Libro': '1' }, cache: 'no-store' };
  if (cuerpo !== undefined) {
    opt.headers['Content-Type'] = tipo;
    opt.body = tipo === 'application/json' ? JSON.stringify(cuerpo) : cuerpo;
  }
  const leyendo = metodo === 'GET';
  const previa = leyendo && CON_ETAG.test(ruta) ? guardadas.get(ruta) : null;
  if (previa) opt.headers['If-None-Match'] = previa.etag;
  let r;
  for (let i = 0; ; i++) {
    let cayo = false;
    try {
      r = await fetch(ruta, opt);
      cayo = caido(r);
    } catch {
      cayo = true;
    }
    if (!cayo) { if (i > 0) avisarRed('ok'); break; }
    if (!leyendo || i >= ESPERAS_MS.length) {
      if (i > 0) avisarRed('fallo');
      throw Object.assign(new Error('No hay conexión con el servidor. Revisa el internet y vuelve a intentarlo.'), { status: 0 });
    }
    if (i === 0) avisarRed('reintentando');
    await new Promise((ok) => setTimeout(ok, ESPERAS_MS[i]));
  }
  if (r.status === 304 && previa) return previa.json;
  if (r.status === 204) return null;
  const j = await r.json().catch(() => null);
  if (r.status === 401) {
    location.assign('/login');
    throw Object.assign(new Error('Tu sesión venció.'), { status: 401 });
  }
  if (!r.ok) throw Object.assign(new Error(j?.error || `Error ${r.status}.`), { status: r.status, datos: j });
  const etag = r.headers.get('ETag');
  if (leyendo && etag && CON_ETAG.test(ruta)) guardadas.set(ruta, { etag, json: j });
  return j;
}

// Hasta saber el rol, la interfaz se muestra como solo lectura.
export const esAdmin = () => S.rol === 'admin';
/**
 * ¿Se habla «del libro» y no de «ti»? (campamento 17) Sí para quien solo mira: el saldo no es suyo ni el punto del sendero es él.
 * Mientras no llega la cuenta vale la pista del dispositivo (`html[data-lector]`, efectos.js) para que el rótulo no cambie al cargar.
 */
export const vozLibro = () => (S.rol ? S.rol !== 'admin' : document.documentElement.hasAttribute('data-lector'));
/**
 * Quién lleva el libro, si el navegador ya lo sabe: sale de las cartas y de los mensajes de las banderas (solo los escribe quien
 * anota). No se le pregunta nada nuevo al servidor: sin ese dato, quien lo use dice «quien lleva el libro».
 */
export const quienAnota = () => S.capsulas?.findLast?.((c) => c.autor)?.autor ?? S.mensajes?.findLast?.((m) => m.por)?.por ?? null;

export const normalizar = (c) => ({ ...c, id: Number(c.id), sats: c.sats > 0 ? c.sats : Math.round((c.monto / c.precio) * 1e8) });
