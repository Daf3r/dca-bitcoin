import { ICONOS, avatar, ico, ilustracion, medalla } from './iconos.js';

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
const OTROS = ['--naranja', '--naranja-osc', '--linea'];
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
  $('guia-vacio').innerHTML = `${ilustracion('montana')}Un estado vacío, con su dibujo y una frase amable.`;
}

pintarControles();
pintarColores();
pintarIconos();
