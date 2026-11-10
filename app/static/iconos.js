// Juego de iconos propio (campamento 6, idea 33): un solo trazo (2 px, puntas redondas, `currentColor`) para todo. Los dibujos
// viven como <symbol> en el sprite de index.html (`#i-…`); aquí solo se arma el <svg> que los usa. No importa nada de la app.
export const ICONOS = ['traslado', 'externo', 'rayo', 'copiar', 'campana', 'lapiz', 'sube', 'baja'];

/** `<svg class="ico">` que apunta al símbolo del sprite; decorativo (lo que importa va en el texto de al lado). */
export const ico = (nombre) => `<svg class="ico" aria-hidden="true" focusable="false"><use href="#i-${nombre}"/></svg>`;

// Color y avatar por persona (idea 157): la inicial sobre un círculo de uno de 36 tonos que sale del nombre (siempre el mismo).
// Los tonos son clases (`av-0`…`av-35`) porque el CSP no deja `style` en línea; el CSS fija luminosidad baja para que la
// inicial blanca llegue a 4.5:1 con cualquier tono (lo comprueba `test_lib`).
export function tonoPersona(nombre) {
  let h = 5381;
  for (const c of String(nombre ?? '')) h = ((h * 33) ^ c.codePointAt(0)) >>> 0;
  return h % 36;
}
export const inicialPersona = (nombre) => ([...String(nombre ?? '').trim()][0] ?? '?').toUpperCase();
/** Avatar de una persona; sin nombre real (el servidor o «alguien») queda gris. `grande` es para «Tu cuenta». */
export function avatar(nombre, { neutro = false, grande = false } = {}) {
  const cls = `avatar ${neutro ? 'av-n' : `av-${tonoPersona(nombre)}`}${grande ? ' grande' : ''}`;
  return `<span class="${cls}" aria-hidden="true">${neutro ? '·' : inicialPersona(nombre).replace(/[<>&"]/g, '')}</span>`;
}

// Ilustraciones de los estados vacíos (idea 34): dibujos pequeños en el estilo de la montaña, con el mismo trazo.
const ILU = {
  montana: '<path d="M6 48 22 22l9 13 7-9 20 22z"/><path d="M22 22v-9l10 4-10 4" /><path d="M4 52h56"/>',
  grafico: '<path d="M8 8v44h48"/><path d="M14 40l12-12 9 7 17-19" stroke-dasharray="3 4"/><circle cx="52" cy="16" r="2.5"/>',
  traslado: '<rect x="5" y="22" width="20" height="20" rx="4"/><rect x="39" y="22" width="20" height="20" rx="4"/><path d="M28 28h8m-3-3 3 3-3 3M36 38h-8m3-3-3 3 3 3"/>',
};
export const ilustracion = (nombre) => `<svg class="ilu" viewBox="0 0 64 64" aria-hidden="true" focusable="false">${ILU[nombre] ?? ''}</svg>`;

// Medallas de constancia (idea 38): un disco con cinta y el número dentro. `ganada` la pinta con color; sin ganar es solo el contorno.
export function medalla({ tipo, valor, ganada }) {
  const txt = tipo === 'compras' ? String(valor) : valor < 12 ? `${valor}m` : `${valor / 12}a`;
  return `<svg class="med ${tipo}${ganada ? '' : ' bloq'}" viewBox="0 0 64 76" aria-hidden="true" focusable="false"><path class="med-cinta" d="M20 48 12 72l11-5 7 8 4-26z"/><path class="med-cinta" d="M44 48l8 24-11-5-7 8-4-26z"/><circle class="med-disco" cx="32" cy="29" r="24"/><circle class="med-aro" cx="32" cy="29" r="19"/><text class="med-n${txt.length >= 4 ? ' m4' : ''}" x="32" y="35.5" text-anchor="middle">${txt}</text></svg>`;
}
