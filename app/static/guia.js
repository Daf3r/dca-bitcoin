import { ICONOS, avatar, ico, ilustracion, medalla } from './iconos.js';
import { NOMBRES_POSES, huella, pose } from './arte-osos-poses.js';

// Guía de estilo viva (idea 90; ver guia.html). Arma los ejemplos con los mismos módulos y estilos de la app.
const $ = (id) => document.getElementById(id);

// --- Controles de estado: tema, efectos, letra y contraste (lo que cambia cómo se ve todo)
const CTL = [
  ['Tema', () => window.libroTema.preferencia(), (v) => window.libroTema.fijar(v), ['auto', 'claro', 'oscuro']],
  ['Efectos', () => window.libroEfectos.preferencia(), (v) => window.libroEfectos.fijar(v), ['auto', 'todos', 'esenciales', 'ninguno']],
  ['Letra', () => window.libroAcc.letra(), (v) => window.libroAcc.fijarLetra(v), ['normal', 'grande', 'muy-grande']],
  ['Contraste', () => window.libroAcc.contraste(), (v) => window.libroAcc.fijarContraste(v), ['auto', 'alto', 'normal']],
];
function pintarControles() {
  const caja = $('guia-ctl');
  caja.textContent = '';
  for (const [nombre, leer, fijar, valores] of CTL) {
    const g = document.createElement('div');
    g.className = 'rangos';
    g.setAttribute('role', 'group');
    g.setAttribute('aria-label', nombre);
    const actual = leer() || 'normal'; // la letra normal se guarda como vacío
    for (const v of valores) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = `${nombre}: ${v}`;
      b.setAttribute('aria-pressed', String(v === actual));
      b.addEventListener('click', () => { fijar(nombre === 'Letra' && v === 'normal' ? '' : v); pintarControles(); setTimeout(pintarColores, 80); });
      g.append(b);
    }
    caja.append(g);
  }
}

// --- Colores: cada token con su valor y el contraste del texto sobre la tarjeta (--s1)
const FONDOS = ['--fondo', '--s1', '--s2', '--s3', '--c0', '--c1', '--c2', '--c3', '--c4', '--monte', '--nieve'];
const TEXTOS = ['--txt', '--txt2', '--txt3', '--naranja-txt', '--sube', '--baja'];
const OTROS = ['--naranja', '--naranja-osc', '--linea', '--w1', '--w2', '--w3', '--w4', '--w5']; // --w1…5: las wallets extra
// Filos (campamento 63): el contorno de los campos donde se escribe, con 3:1 o más contra el panel (--s1) y contra su relleno (--s2).
const FILOS = ['--campo-filo'];
function lum(c) {
  const [r, g, b] = c.match(/[\d.]+/g).slice(0, 3).map(Number).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function pintarColores() {
  const raiz = getComputedStyle(document.documentElement);
  const sonda = document.createElement('i');
  document.body.append(sonda);
  const rgb = (v) => { sonda.style.color = raiz.getPropertyValue(v); return getComputedStyle(sonda).color; };
  const fondo = rgb('--s1');
  const lista = $('guia-col');
  lista.textContent = '';
  const nuevo = (token, extra) => {
    const li = document.createElement('li');
    li.dataset.token = token;
    const m = document.createElement('i');
    m.className = 'guia-muestra';
    m.dataset.token = token;
    m.style.background = `var(${token})`;
    const t = document.createElement('div');
    const n = document.createElement('b');
    n.textContent = token;
    const v = document.createElement('small');
    v.textContent = rgb(token);
    t.append(n, v);
    if (extra) t.append(extra);
    li.append(m, t);
    lista.append(li);
  };
  for (const tk of FONDOS) nuevo(tk);
  for (const tk of OTROS) nuevo(tk);
  for (const tk of FILOS) {
    const a = lum(rgb(tk)), r = Math.min(...['--s1', '--s2'].map((f) => { const b = lum(rgb(f)); return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05); }));
    const e = document.createElement('small');
    e.className = r >= 3 ? 'guia-ok-filo' : 'guia-mal';
    e.dataset.contraste = r.toFixed(2);
    e.textContent = `${r.toFixed(1)}:1 sobre el panel y el campo ${r >= 3 ? '✓' : '✗ bajo 3'}`;
    nuevo(tk, e);
  }
  for (const tk of TEXTOS) {
    const a = lum(rgb(tk)), f = lum(fondo), r = (Math.max(a, f) + 0.05) / (Math.min(a, f) + 0.05);
    const e = document.createElement('small');
    e.className = r >= 4.5 ? 'guia-ok' : 'guia-mal';
    e.dataset.contraste = r.toFixed(2);
    e.textContent = `${r.toFixed(1)}:1 ${r >= 4.5 ? '✓' : '✗ bajo 4.5'}`;
    nuevo(tk, e);
  }
  sonda.remove();
}

// --- Iconos, avatares, medallas e ilustraciones (los mismos de la app)
function pintarIconos() {
  const ul = $('guia-iconos');
  for (const n of ICONOS) {
    const li = document.createElement('li');
    li.innerHTML = ico(n);
    const t = document.createElement('small');
    t.textContent = n;
    li.append(t);
    ul.append(li);
  }
  $('guia-av').innerHTML = ['Daf3r', 'Ana', 'Mamá', 'Papá', 'Luis', 'Sofía'].map((n) => avatar(n)).join('') + avatar('Servidor', { neutro: true }) + avatar('Daf3r', { grande: true });
  $('guia-med').innerHTML = [
    { tipo: 'compras', valor: 10, ganada: true, titulo: '10 compras' }, { tipo: 'compras', valor: 100, ganada: false, titulo: '100 compras' },
    { tipo: 'tiempo', valor: 6, ganada: true, titulo: '6 meses' }, { tipo: 'tiempo', valor: 12, ganada: false, titulo: '1 año' },
  ].map((m) => `<li class="medalla ${m.ganada ? 'ganada' : 'bloq'}">${medalla(m)}<b>${m.titulo}</b><small>${m.ganada ? 'ganada' : 'próxima'}</small></li>`).join('');
  $('guia-ilu').innerHTML = ['montana', 'grafico', 'traslado'].map((n) => ilustracion(n)).join('');
  $('guia-vacio').innerHTML = `${pose('lee')}Un estado vacío, con su dibujo y una frase amable.`;
}

// --- Los osos de la interfaz (campamento 26): cada pose en su tarjeta, con su nombre, y la huella
const NOMBRE_POSE = { lee: 'Lee', mochila: 'Con su mochila', saludan: 'Los tres saludan', sobre: 'Con un sobre', confundido: 'Confundido', duerme: 'Duerme', duermen: 'Los tres duermen', celebra: 'Celebra' };
function pintarOsos() {
  const ul = $('guia-osos');
  for (const [svg, nombre] of [...NOMBRES_POSES.map((n) => [pose(n, { tam: 88 }), NOMBRE_POSE[n] ?? n]), [huella({ tam: 40 }), 'La huella']]) {
    const li = document.createElement('li');
    li.innerHTML = svg;
    const t = document.createElement('small');
    t.textContent = nombre;
    li.append(t);
    ul.append(li);
  }
}

// --- (Campamento 39, idea 135) El almanaque del valle: cada fecha con sus turnos (cielo.js: `turno` y `mueve`), cada uno con su «Ver», que
// pone ese día y esa hora (`libro.dia`, `libro.hora`) y abre la montaña. `libro.almanaque` hace que la app avise y ofrezca volver a hoy.
export const FECHAS_ALMANAQUE = [
  ['Un miércoles cualquiera', '2026-11-25'], ['Un sábado (de plaza)', '2026-11-28'], ['Un domingo (de misa)', '2026-11-29'],
  ['Un día de lluvia (julio)', '2026-07-10'], ['Zompopos de mayo', '2027-05-18'], ['Día de la Cruz', '2027-05-03'], ['Agostinas', '2027-08-05'],
  ['15 de septiembre', '2027-09-15'], ['Azacuanes y piscuchas (octubre)', '2026-10-20'], ['Navidad en el pueblo (1 dic)', '2026-12-01'],
  ['Nochebuena', '2026-12-24'], ['Navidad', '2026-12-25'], ['31 de diciembre', '2026-12-31'], ['1 de enero', '2027-01-01'], ['6 de enero', '2027-01-06'],
];
const hhmm = (h) => { const m = Math.round(h * 60); return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`; };
/**
 * Los tramos de un día: cada vez que cambia el turno del pueblo o lo que se mueve, de cinco en cinco minutos (el 41 cambia a las 23:40).
 * (Campamento 51, idea 225) Con el director, el mapa del día (`mapaDelDia`): también el foco, los ambientales y lo que pesa cada tramo.
 */
export function tramosDelDia(C, dia) {
  if (C.mapaDelDia) return C.mapaDelDia(dia, window.innerWidth >= 1100);
  const t = [];
  for (let q = 0; q < 288; q++) {
    const h = q / 12, clave = `${C.turno(dia, h)}|${C.mueve(dia, h)}`;
    if (!t.length || t.at(-1).clave !== clave) t.push({ clave, desde: h, turno: C.turno(dia, h), mueve: C.mueve(dia, h) });
  }
  return t.map((x, i) => ({ ...x, hasta: t[i + 1]?.desde ?? 24 }));
}
function pintarAlmanaque() {
  const caja = $('guia-almanaque'), C = window.libroCielo;
  if (!caja || !C?.turno) return;
  for (const [nombre, dia] of FECHAS_ALMANAQUE) {
    const det = document.createElement('details');
    const sum = document.createElement('summary');
    sum.textContent = `${nombre} · ${dia}`;
    const ul = document.createElement('ul');
    for (const tr of tramosDelDia(C, dia)) {
      const li = document.createElement('li');
      const txt = document.createElement('span');
      const foco = tr.foco ? ` · foco: ${tr.foco === 'rutina' ? `rutina (${tr.rutina})` : tr.foco}` : '';
      const amb = tr.ambiente?.length ? ` · ambiente: ${tr.ambiente.join(', ')}` : '';
      const peso = tr.capas != null ? ` · capas pequeñas: ${tr.capas} (hasta ${tr.anim} animaciones por capa)` : '';
      txt.textContent = `${hhmm(tr.desde)}–${hhmm(tr.hasta)} · ${tr.turno}${tr.mueve ? ` · se mueve: ${tr.mueve}` : ''}${foco}${amb}${peso}`;
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'enlace';
      b.textContent = 'Ver';
      b.setAttribute('aria-label', `Ver ${nombre} a las ${hhmm(tr.desde + Math.min(0.5, (tr.hasta - tr.desde) / 2))}`);
      b.addEventListener('click', () => {
        try { localStorage.setItem('libro.dia', dia); localStorage.setItem('libro.hora', String(tr.desde + Math.min(0.5, (tr.hasta - tr.desde) / 2))); localStorage.setItem('libro.almanaque', '1'); } catch { /* sin almacenamiento */ }
        location.href = '/';
      });
      li.append(txt, b);
      ul.append(li);
    }
    det.append(sum, ul);
    caja.append(det);
  }
}

pintarControles();
pintarAlmanaque();
pintarColores();
pintarIconos();
pintarOsos();
