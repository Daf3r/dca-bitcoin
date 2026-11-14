// Icono de la pestaña con la luna real del día (las ocho fases) y, con 1 BTC o más, la cumbre dorada. Son archivos fijos
// (`scripts/generar-favicons.mjs`): la CSP solo permite imágenes de 'self', así que no se puede armar el icono con datos en línea.
// `pintar` lo llama en cada pintado; solo toca el enlace si cambia.
export function pintarFavicon(sats) {
  const enlace = document.querySelector('link[rel="icon"]');
  const fase = window.libroCielo?.faseLunar?.();
  if (!enlace || typeof fase !== 'number') return;
  const nombre = `/icon-${sats >= 1e8 ? 'oro' : 'luna'}-${Math.round(fase * 8) % 8}.svg`;
  if (enlace.getAttribute('href') !== nombre) enlace.setAttribute('href', nombre);
}
