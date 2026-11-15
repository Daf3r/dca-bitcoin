// El sello de lacre y el certificado de altitud (campamento 13B). Funciones puras: reciben datos de `lib.js` (`sellos`, `datosCertificado`) y
// devuelven un `<svg>` como texto; no tocan el DOM ni usan azar.
//
// CONTRATO (lo usan `historia.js` y `celebracion.js`; el dibujo es libre mientras se cumpla):
//  · `lacre(m, { grande })` → `<svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">` con la cifra de la etapa (`m` en sats:
//    `nombreHito(m)`) en relieve sobre la cera. Se usa pequeño en «Tu historia» (≈ 56 px) y grande en la tarjeta de celebración (≈ 110 px).
//  · `certificado(d)` → `<svg viewBox="0 0 480 340" aria-hidden="true" focusable="false">` con los datos de `lib.datosCertificado` (`d.nombre`
//    puede ser null, `d.letras`, `d.fecha`, `d.btc`, `d.lobulos`, `d.altitud`, `d.trenzas`…). **Todo texto del usuario (el nombre) va con `esc()`**.
//  · Colores solo por variables CSS (clases del bloque «Campamento 13B» de styles.css); sin estilos en línea (la CSP los bloquea);
//    animaciones solo con transform/opacity y clase `efecto-ambiente` si son adorno.
//  · Ids de `<defs>` únicos con prefijo `s-`/`c-`.
import { nombreHito } from './lib.js';

/** Escapa un texto para meterlo dentro del SVG como texto. */
export const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export function lacre(m, { grande = false } = {}) {
  return `<svg class="lacre${grande ? ' grande' : ''}" viewBox="0 0 100 100" aria-hidden="true" focusable="false"><circle class="lacre-cera" cx="50" cy="50" r="44"/><text class="lacre-cifra" x="50" y="58" text-anchor="middle">${esc(nombreHito(m))}</text></svg>`;
}

export function certificado(d) {
  return `<svg class="certificado" viewBox="0 0 480 340" aria-hidden="true" focusable="false"><rect class="cert-marco" x="10" y="10" width="460" height="320" rx="14"/>`
    + `<text class="cert-t" x="240" y="60" text-anchor="middle">Certificado de altitud</text>`
    + `<text class="cert-n" x="240" y="100" text-anchor="middle">${esc(d.nombre ?? 'Libro DCA')}</text>`
    + `<text class="cert-l" x="240" y="200" text-anchor="middle">${esc(d.letras)}</text>`
    + `<text class="cert-f" x="240" y="290" text-anchor="middle">${esc(d.fecha)}</text></svg>`;
}
