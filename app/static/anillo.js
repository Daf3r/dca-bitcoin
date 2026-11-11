// Anillos y donas en SVG: arcos sobre una pista, para el avance de la etapa, dónde están tus sats y la constancia del año.
// Cada arco es un círculo con `stroke-dasharray`; la primera vez nace vacío y el CSS lo llena con una transición (sin
// movimiento, el CSS la anula y se ve lleno). El número del centro y el texto accesible los pone quien lo usa.
const NS = 'http://www.w3.org/2000/svg';
const RADIO = 42;
const CIRC = 2 * Math.PI * RADIO;

function circulo(clase) {
  const c = document.createElementNS(NS, 'circle');
  c.setAttribute('cx', '50');
  c.setAttribute('cy', '50');
  c.setAttribute('r', String(RADIO));
  c.setAttribute('class', clase);
  return c;
}

/**
 * Pinta `arcos` en `svg`: [{ clase, desde, hasta }] con fracciones de 0 a 1 de la vuelta, que empieza arriba y avanza a la
 * derecha. Se pueden volver a pintar con otros valores y los arcos se mueven suavemente.
 */
export function pintarAnillo(svg, arcos) {
  if (!svg.firstChild) {
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.setAttribute('aria-hidden', 'true');
    svg.append(circulo('an-pista'));
  }
  arcos.forEach((a, i) => {
    let c = svg.children[i + 1];
    if (!c) {
      c = circulo(`an-arco ${a.clase}`);
      c.style.setProperty('stroke-dasharray', `0 ${CIRC.toFixed(2)}`);
      svg.append(c);
      void c.getBoundingClientRect(); // que el estado vacío se pinte antes de llenarlo
    }
    const desde = Math.max(0, Math.min(1, a.desde));
    const largo = Math.max(0, Math.min(1, a.hasta) - desde) * CIRC;
    c.style.setProperty('stroke-dasharray', `${largo.toFixed(2)} ${(CIRC - largo).toFixed(2)}`);
    c.style.setProperty('stroke-dashoffset', (-desde * CIRC).toFixed(2));
  });
  while (svg.children.length > arcos.length + 1) svg.lastChild.remove(); // si hay menos arcos que antes (una wallet menos)
}
