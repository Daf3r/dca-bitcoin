// Cifras secundarias con su forma corta para teléfonos muy pequeños (≤ 359 px de ancho), sin medir nada en JS.
// Se escriben las dos formas y el CSS (`.c-l` / `.c-c`) muestra una u otra; la que no se ve no existe para los lectores de pantalla.
// OJO: `textContent` trae las dos; para lo visible, `innerText`. El saldo grande nunca se abrevia: esto es solo para cifras secundarias.

/** Añade a `padre` el texto `largo` y su forma `corto`. */
export function dual(padre, largo, corto) {
  const l = document.createElement('span');
  l.className = 'c-l';
  l.textContent = largo;
  const c = document.createElement('span');
  c.className = 'c-c';
  c.textContent = corto;
  padre.append(l, c);
  return padre;
}

const NS = 'http://www.w3.org/2000/svg';
/**
 * Una línea pequeña (sparkline) junto a una cifra: la forma de los últimos valores, con un punto en el último. Devuelve un
 * `<svg class="mini">` con su descripción, o null si hay menos de 8 valores (una línea de pocos puntos no dice nada).
 */
export function miniLinea(valores, descripcion) {
  if (!valores || valores.length < 8) return null;
  const mn = Math.min(...valores), mx = Math.max(...valores), rango = mx - mn || 1;
  const pts = valores.map((v, i) => [(i / (valores.length - 1)) * 100, 18 - ((v - mn) / rango) * 16]);
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'mini');
  svg.setAttribute('viewBox', '0 -1 100 22');
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', descripcion);
  const poly = document.createElementNS(NS, 'polyline');
  poly.setAttribute('points', pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' '));
  const punto = document.createElementNS(NS, 'circle');
  punto.setAttribute('cx', pts.at(-1)[0].toFixed(1));
  punto.setAttribute('cy', pts.at(-1)[1].toFixed(1));
  punto.setAttribute('r', '3.2');
  svg.append(poly, punto);
  return svg;
}
