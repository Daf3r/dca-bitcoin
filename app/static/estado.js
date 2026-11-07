import { resumen } from './lib.js';
import { sinMovimiento } from './movimiento.js';

export const $ = (id) => document.getElementById(id);
export const reducido = sinMovimiento; // sin animación (nivel «ninguno» de efectos.js, que también atiende el ajuste del sistema)

export const S = {
  compras: [], cargado: false, errorCarga: false,
  precio: null, precioTs: 0, fuente: '', viejo: false, errorPrecio: false,
  historico: [], histEstado: 'cargando', histDesde: null, rango: null,
  verTodas: false,
  traslados: [],
  usuario: null, rol: null,
};
export let R = resumen([], null);
/** R se reasigna solo desde aquí: los demás módulos la leen (enlace vivo) pero no la pueden asignar. */
export function fijarR(nuevo) { R = nuevo; }

// ------------------------------------------------------------------ API
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
  let r;
  try {
    r = await fetch(ruta, opt);
  } catch {
    // Con la sesión de Cloudflare Access vencida, fetch falla por la redirección al login.
    throw Object.assign(new Error('Sin conexión con el servidor. Si tu sesión venció, recarga la página.'), { status: 0 });
  }
  if (r.status === 204) return null;
  const j = await r.json().catch(() => null);
  if (r.status === 401) {
    location.assign('/login');
    throw Object.assign(new Error('Tu sesión venció.'), { status: 401 });
  }
  if (!r.ok) throw Object.assign(new Error(j?.error || `Error ${r.status}.`), { status: r.status, datos: j });
  return j;
}

// Hasta saber el rol, la interfaz se muestra como solo lectura.
export const esAdmin = () => S.rol === 'admin';

export const normalizar = (c) => ({ ...c, id: Number(c.id), sats: c.sats > 0 ? c.sats : Math.round((c.monto / c.precio) * 1e8) });
