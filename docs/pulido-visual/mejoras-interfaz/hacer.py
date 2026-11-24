"""Arma «Mejoras de la interfaz» (auditoría y propuestas 300–317, 24 nov 2026). Sale a propuestas-interfaz.html.

Uso: python3 hacer.py [carpeta de capturas PNG]
Las capturas salen de js/marcas.mjs (auditoría, x-…) y js/maq.mjs (maquetas, m-…). La primera vez se leen los PNG de esa
carpeta y se guardan comprimidos en cap/*.webp; después basta con los webp de cap/ (así se rehace solo con el repo).
El estilo (y las dos letras) es el del diseño A–F: se toma tal cual de vida-del-valle/diseno-24nov.
"""
import base64
import html
import io
import json
import pathlib
import sys

from PIL import Image

AQUI = pathlib.Path(__file__).parent
PNG = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else AQUI / 'png'
WEBP = AQUI / 'cap'
ANTERIOR = AQUI.parent / 'vida-del-valle/diseno-24nov/diseno-celebracion-nodo-miles.html'
MED = json.loads((AQUI / 'medidas.json').read_text())
MAQ = json.loads((AQUI / 'maquetas.json').read_text())
EXTRA = json.loads((AQUI / 'extra.json').read_text())


def estilo_base():
    s = ANTERIOR.read_text()
    return s[s.index('<style>') + 7:s.index('</style>')]


def img(archivo, alt, pie=None, ancho=560, recorte=None, q=64, clase=''):
    """Una figura con la captura embebida. `recorte` va en píxeles de la captura (que está al doble)."""
    destino = WEBP / (f'{archivo}.webp' if not recorte else f'{archivo}-r{recorte[1]}-{recorte[3]}.webp')
    origen = PNG / f'{archivo}.png'
    if origen.exists():
        im = Image.open(origen).convert('RGB')
        if recorte:
            im = im.crop(recorte)
        if im.width > ancho:
            im = im.resize((ancho, round(im.height * ancho / im.width)), Image.LANCZOS)
        im.save(destino, 'WEBP', quality=q, method=6)
    im = Image.open(destino)
    src = 'data:image/webp;base64,' + base64.b64encode(destino.read_bytes()).decode()
    cap = f'<figcaption>{pie}</figcaption>' if pie else ''
    c = f' class="{clase}"' if clase else ''
    return f'<figure{c}><img src="{src}" width="{im.width}" height="{im.height}" alt="{html.escape(alt)}" loading="lazy">{cap}</figure>'


def par(pid, w, que, antes='antes', despues='despues', ancho=None, recorte=None, pie_a='', pie_d=''):
    """Antes y después de una maqueta, lado a lado."""
    ancho = ancho or (460 if w in (390, 320) else 1100)
    a = img(f'm-{pid}-{w}-{antes}', f'Hoy, a {w} px: {que}', f'<b>Hoy</b> · {w} px{pie_a}', ancho, recorte)
    d = img(f'm-{pid}-{w}-{despues}', f'Propuesta, a {w} px: {que}', f'<b>Propuesta</b> · {w} px{pie_d}', ancho, recorte)
    clase = 'par' if w in (390, 320) else 'par ancho'
    return f'<div class="{clase}">{a}{d}</div>'


PROPS = []


def prop(pid, titulo, rec, badges, costo, filas, medios=''):
    PROPS.append((pid, titulo, rec))
    bs = ''.join(f'<span class="badge {c}">{t}</span>' for c, t in badges)
    recb = {'si': '<span class="badge si">Recomendada</span>', 'despues': '<span class="badge despues">Después</span>', 'no': '<span class="badge regla">No la haría</span>'}[rec]
    dl = ''.join(f'<dt>{k}</dt><dd{" class=que" if i == 0 else ""}>{v}</dd>' for i, (k, v) in enumerate(filas))
    radios = ''.join(f'<label><input type="radio" name="e-{pid}" value="{v}"{" checked" if v == rec else ""}> {t}</label>' for v, t in (('si', 'Sí'), ('despues', 'Después'), ('no', 'No')))
    return (f'<article class="card" id="p-{pid}" data-id="{pid}" data-rec="{rec}"><div class="row"><span class="grande">{pid}</span>{recb}{bs}<span class="costo">{costo}</span></div>'
            f'<h4>{titulo}</h4>{medios}<dl>{dl}</dl><fieldset class="tri"><legend class="sr">Mi elección para {pid}</legend>{radios}</fieldset></article>')


def seccion(sid, ceja, titulo, lead, cuerpo):
    return f'<section class="sec" id="{sid}" aria-labelledby="t-{sid}"><div><p class="eyebrow">{ceja}</p><h2 id="t-{sid}">{titulo}</h2></div><p class="lead">{lead}</p>{cuerpo}</section>'


def tabla(cab, filas):
    th = ''.join(f'<th scope="col">{c}</th>' for c in cab)
    tr = ''.join('<tr>' + ''.join(f'<td>{c}</td>' for c in f) + '</tr>' for f in filas)
    return f'<div class="tabla"><table><thead><tr>{th}</tr></thead><tbody>{tr}</tbody></table></div>'


# ---------------------------------------------------------------- medidas que cita el texto
m390, m320, m1440 = MED['390'], MED['320'], MED['1440']
cu = m390['cuenta']
letras = sorted(float(k) for k in m390['letras']['resumen'])
entre = [int(x) for x in letras if 12 <= x <= 18]
A = dict(
    filas=cu['filas'], cont=cu['contenido'], vis=cu['visible'], cerrar=cu['cerrarTop'][0],
    cont320=m320['cuenta']['contenido'], vis320=m320['cuenta']['visible'], dos320=len(m320['cuenta']['dosRenglones']), dos390=len(cu['dosRenglones']),
    disp=dict(cu['grupos'])['Este dispositivo'],
    c301=MAQ['301-390'], c301e=MAQ['301-1440'],
    lista=MAQ['307-390'], listae=MAQ['307-1440'],
    graf=MAQ['313-390'], ub=MAQ['312-390'], ube=MAQ['312-1440'],
    h305=MAQ['305-390'], g306=MAQ['306']['contraste'],
    f314o=MAQ['314-oscuro-390'], f314c=MAQ['314-claro-390'],
    pisa=EXTRA['anotarPisa'], nar_o=EXTRA['naranja-oscuro']['naranjaVsS1'], nar_c=EXTRA['naranja-claro']['naranjaVsS1'],
    guia=EXTRA['guia-oscuro']['si'], r390=sorted({g for g, _ in EXTRA['ritmo-390']['resumen']}), r1440=sorted({g for g, _ in EXTRA['ritmo-1440']['resumen']}),
    e844=MAQ['315-390x844'], e664=MAQ['315-390x664'], e640=MAQ['315-360x640'], e568=MAQ['315-320x568'],
    l311=MAQ['311-390'],
    ax=[m1440['anotar_resumen'][0], m1440['anotar_historia'][0], m1440['anotar_movimientos'][0]],
)
palabras_antes = sum(len(t.split()) for t in A['h305']['palabrasAntes'])
palabras_despues = sum(len(t.split()) for t in A['h305']['palabrasDespues'] if not t.startswith('≈'))

# ---------------------------------------------------------------- auditoría
R2 = 2  # las capturas van al doble
AUD = f'''
<div class="aud">
 <article class="hall"><h3>«Tu cuenta»: el menú más largo de la app</h3>
  <div class="par">{img('x-cuenta-390-a', 'Tu cuenta en el teléfono, al abrir: filas partidas en dos renglones marcadas con un 2 y la píldora naranja del valor con un 3', '<b>Al abrir</b> · 390×844', 460)}{img('x-cuenta-390-b', 'Tu cuenta en el teléfono, al final: el botón Cerrar marcado con un 1', '<b>Al final, dos pantallas después</b>', 460)}</div>
  <ul><li><b class="n">1</b> <b>«Cerrar» está al final</b>: en la posición {A['cerrar']} px de {A['cont']} (la pantalla enseña {A['vis']}). En un iPhone no hay tecla atrás y tocar fuera no cierra (lo probé): hay que bajar dos pantallas; a 320×568, {A['cont320'] / A['vis320']:.1f} pantallas.</li>
  <li><b class="n">2</b> <b>{A['filas']} filas</b> para el dueño, {A['disp']} en «Este dispositivo». Con 390 px, {A['dos390']} filas se parten en dos renglones; con 320 px, {A['dos320']}.</li>
  <li><b class="n">3</b> <b>El valor de cada ajuste va en una píldora de color</b> (naranja en oscuro, ámbar en claro; doce a la vez). El naranja es el color de «lo que puedes hacer» y de lo tuyo: aquí solo dice «automático».</li></ul></article>

 <article class="hall"><h3>Escritorio: «Anotar compra» cambia de sitio y pisa la lista</h3>
  <div class="pila">{img('x-anotar-1440-resumen', 'Escritorio, Resumen: el botón Anotar compra en la columna derecha', '<b>Resumen y Gráficos</b>: a la derecha (x = ' + str(A['ax'][0]) + ')', 1000)}{img('x-anotar-1440-historia', 'Escritorio, Historia: el botón más a la derecha', '<b>Historia</b>: más a la derecha (x = ' + str(A['ax'][1]) + ')', 1000)}{img('x-anotar-1440-movimientos', 'Escritorio, Movimientos: el botón a la izquierda, encima del título', '<b>Movimientos</b>: a la izquierda, sobre el título (x = ' + str(A['ax'][2]) + ')', 1000)}{img('x-anotar-1440-pisa', 'Escritorio, Movimientos al bajar: el botón tapa la primera fila de la lista', '<b>Al bajar en Movimientos</b>: el botón se queda pegado y tapa la fecha y los sats de una fila', 1000)}</div>
  <ul><li><b class="n">4</b> <b>Tres sitios distintos</b> según la pestaña. La acción principal debería estar siempre donde la mano ya sabe.</li>
  <li><b class="n">5</b> <b>Al deslizar la lista, el botón tapa una fila</b>: con la lista abierta entera, en {A['pisa']['conTextoTapado']} de {A['pisa']['posiciones']} posiciones del desplazamiento medidas hay texto de una fila debajo del botón. En el teléfono no pasa (allí es el dock, con su suelo).</li></ul></article>

 <article class="hall"><h3>La lista y los gráficos: mucho control antes del contenido</h3>
  <div class="par">{img('x-lista-390', 'Movimientos en el teléfono: el bloque de buscar, seis chips y Fechas y orden marcado con un 7', '<b>Movimientos</b> · 390 px', 460)}{img('x-graficos-390', 'Gráficos en el teléfono: dos selectores iguales marcados con 8 y Ampliar con 9', '<b>Gráficos</b> · 390 px', 460)}</div>
  <ul><li><b class="n">7</b> Del título «Movimientos» a la primera fila hay <b>{A['lista']['tituloAFilaAntes']} px</b>: buscar, seis chips en dos filas y «Fechas y orden». Casi nunca se filtra; siempre se paga.</li>
  <li><b class="n">8</b> <b>Dos selectores idénticos</b> uno sobre otro (qué gráfico y qué rango), con el título en medio: del selector al dibujo, {A['graf']['selectorAGraficoAntes']} px.</li>
  <li><b class="n">9</b> «Ampliar» es un texto gris de 13 px solo en su renglón: no parece un botón y gasta 48 px de alto.</li></ul></article>

 <article class="hall"><h3>El dock, la hoja y la entrada</h3>
  <div class="pila corta">{img('x-dock-390', 'El dock a 390 px: la palabra Movimientos se sale de su píldora', '<b>Dock</b> · 390 px', 560)}</div><div class="pila corta">{img('x-hoja-390-a', 'La hoja recién abierta: el botón Guardar apagado, marcado con un 10', '<b>«Guardar» apagado</b>', 560, (0, 1480, 780, 1688))}</div><div class="par">{img('x-hoja-390-b', 'La hoja de anotar con Más detalles abierto: cinco párrafos de ayuda marcados con 11 y un campo con 12', '<b>Hoja, «Más detalles»</b>', 460, (0, 0, 780, 1500))}{img('x-login-390', 'La entrada en un teléfono de 390 por 844: el botón Entrar queda cortado por abajo', '<b>Entrada</b> · 390×844', 460)}</div>
  <ul><li><b class="n">6</b> <b>«Movimientos» no cabe en su casilla</b>: el texto mide 74 px y la casilla 67; se sale de la píldora activa por los dos lados.</li>
  <li><b class="n">10</b> «Guardar» apagado es el mismo naranja al 40 %: su letra queda a <b>{A['g306']}:1</b> y no dice qué falta.</li>
  <li><b class="n">11</b> Con «Más detalles» abierto hay <b>{len(A['h305']['palabrasAntes'])} párrafos de ayuda ({palabras_antes} palabras)</b> y «(opcional)» tres veces: la hoja mide {A['h305']['antes'][0]} px.</li>
  <li><b class="n">12</b> <b>Los campos no tienen filo</b>: su relleno contra el panel está a {A['f314o']['antes']['campoVsPanel']}:1 en oscuro y {A['f314c']['antes']['campoVsPanel']}:1 en claro. Se distinguen por el texto de ejemplo, no por su forma.</li>
  <li><b class="n">13</b> En la entrada, <b>«Entrar» termina {A['e844']['entrarFin'] - A['e844']['alto']} px bajo el borde</b> en 390×844 y {A['e664']['entrarFin'] - A['e664']['alto']} px en 390×664 (Safari con sus barras). «Entrar con un código» queda más abajo aún.</li></ul></article>

 <article class="hall"><h3>El Resumen: nueve botones, nueve formas; tres radios, tres títulos</h3>
  <div class="par">{img('x-resumen-390', 'El Resumen en el teléfono: tres títulos de tarjeta de tamaños distintos marcados con 14', '<b>Resumen</b> · 390 px', 460)}<div class="pila">{img('m-309-390-antes-0', 'Ocultar hoy, enlace subrayado de 14 px', None, 460)}{img('m-309-390-antes-1', 'Ver todas mis medallas, botón de filo naranja de 2 px y fondo tintado, a todo el ancho', None, 460, (0, 1150, 1400, 1500))}{img('m-309-390-antes-2', 'Anotar un traslado, botón de filo naranja de 1 px', None, 460, (0, 560, 1400, 860))}{img('m-309-390-antes-4', 'Ver 25 más, botón de filo gris', '<b>Cuatro de los nueve</b>', 460)}</div></div>
  <ul><li><b class="n">14</b> <b>Títulos de tarjeta a 20, 22 y 24 px</b> («Dónde están tus sats», «Constancia», «Tus medallas»), radios de 24, 18 y 8 px y tres rellenos distintos (18·20, 20·20, 14·16).</li>
  <li><b>Nueve botones secundarios, nueve aspectos</b> (medido por fondo, filo, radio, tamaño y alto): filo naranja de 1 px, de 2 px con fondo, filo gris, subrayado de 14 y de 16 px, texto gris de 13, texto naranja sin subrayar…</li>
  <li><b>Siete tamaños de letra entre 12 y 18 px</b> en una pantalla ({', '.join(str(x) for x in entre)}); quince en total.</li>
  <li>El Resumen mide <b>{A['ub']['total']} px</b> en el teléfono (cuatro pantallas). «Dónde están tus sats», sin traslados, ocupa {A['ub']['antes']} px para decir una pregunta.</li></ul></article>

 <article class="hall bien"><h3>Lo que revisé y está bien (no lo toco)</h3>
  <ul><li><b>Contraste del texto</b>: la guía (<code>/guia</code>) mide {A['guia']} tonos de texto sobre <code>--s1</code> y los {A['guia']} salen ✓, en claro y en oscuro.</li>
  <li><b>Ritmo vertical entre tarjetas</b>: ya es parejo: {' y '.join(str(x) for x in A['r390'])} px en el teléfono y {' o '.join(str(x) for x in A['r1440'])} px en escritorio. Lo desigual está <i>dentro</i> de las tarjetas (310), no entre ellas.</li>
  <li><b>Letra pequeña</b>: solo dos textos a 11 px («de 52» en el anillo y «desde entonces»); nada por debajo.</li>
  <li><b>Toques</b>: los chips, las pestañas y los botones medidos tienen 48 px o más.</li>
  <li><b>La voz del lector</b> en la escena y «Tu cuenta» (Ana ve «Saldo del libro», «Historia y medallas del libro»), el dock de una sola pieza, el comprobante, la bitácora y los estados vacíos con el oso: no les cambiaría nada.</li>
  <li><b>La tele</b> (la abrí a 1440): su único control es «Salir de pantalla grande»; nada de esto la toca. También miré 768 px (usa el dock, como el teléfono) y 2560 px (la misma columna, centrada): sin hallazgos propios.</li></ul></article>
</div>'''

# ---------------------------------------------------------------- propuestas
SIN_VOZ = 'No toca ningún texto del saldo.'
P = {}
P[300] = prop(300, '«Tu cuenta» se cierra desde arriba', 'si', [('barata', 'pequeña'), ('mej', 'teléfono y escritorio')], 'index.html · cuenta.js · CSS', [
    ('Qué cambia', 'El título «Tu cuenta» y un botón <b>«Cerrar»</b> quedan pegados arriba mientras bajas. El «Cerrar» del final se quita. Las vistas de dentro (Avisos, Tus datos, Sesiones, Estado del sistema, Historial) usan el mismo sitio para <b>«‹ Tu cuenta»</b>, en vez de un «Volver» al final.'),
    ('Por qué', f'Hoy para cerrar hay que bajar {A["cont"] - A["vis"]} px en un iPhone (y tocar fuera no cierra). La hoja de anotar, la película y la tabla ya cierran arriba a la derecha: sería el mismo gesto en todas.'),
    ('Costo y riesgo', 'Una fila pegajosa dentro del diálogo (<code>position: sticky</code>, fondo opaco, sin desenfoque). 0 nodos en la escena, 0 animaciones. Las pruebas que cierran con <code>[data-cuenta="cerrar"]</code> siguen valiendo si el botón conserva el atributo.'),
    ('Accesibilidad', 'El botón mide 48 px; el foco inicial pasa a él (hoy cae en la primera fila). Con letra muy grande el título y el botón caben en un renglón a 320 px (hay que comprobarlo al hacerlo).'),
    ('Mi recomendación', '<b>Sí.</b> Es el arreglo más barato de todos y el que más se nota en el teléfono.')],
    par(300, 390, 'Tu cuenta a mitad del desplazamiento, con Cerrar siempre arriba') + par(300, 1440, 'Tu cuenta en escritorio'))

P[301] = prop(301, '«Este dispositivo» en dos niveles (y dos columnas en escritorio)', 'si', [('mov', 'toca lo decidido en el 20'), ('mej', 'teléfono y escritorio')], 'index.html · CSS · pruebas', [
    ('Qué cambia', 'En el teléfono, de los doce ajustes quedan a la vista cinco (avisos, tema, tamaño de letra, efectos y pantalla) y los otros siete van bajo <b>«Más ajustes de este aparato»</b>, que recuerda si lo dejaste abierto. En escritorio no se pliega nada: el diálogo se ensancha a <b>dos columnas</b> («El libro» y «Administrar» a la izquierda, «Este dispositivo» a la derecha).'),
    ('Por qué', f'El menú pasa de {A["c301"]["antes"][0]} a {A["c301"]["despues"][0]} px en el teléfono y de {A["c301e"]["antes"][0]} a {A["c301e"]["despues"][0]} px en escritorio (la ventana enseña {A["c301e"]["antes"][1]}): casi todo sin deslizar. Los siete plegados se tocan una vez en la vida (contraste, colores de ganancia, madrugada, pantalla grande, la tele duerme, título y sonido). <b>«Atajos de teclado» no se pliega</b>: cuando sale en un teléfono (con teclado físico) tiene que estar a la vista (WCAG 2.1.4, decidido en el pulido final).'),
    ('Costo y riesgo', 'Un <code>&lt;details&gt;</code> y una rejilla. <b>Los tres grupos y su orden no cambian</b> (eso se decidió en el campamento 20); solo se pliega dentro de uno. Riesgo: las pruebas que tocan esos siete botones tendrán que abrir antes el plegado (como ya se hace con <code>#ley-det</code>).'),
    ('Accesibilidad', 'El resumen del plegado es un control nativo de 48 px con su estado; el orden de tabulación no cambia. A 320 px y con letra muy grande es donde más ayuda.'),
    ('Mi recomendación', '<b>Sí.</b> Si prefieres ver siempre los doce, quédate solo con las dos columnas de escritorio.')],
    par(301, 390, 'Tu cuenta con Más ajustes de este aparato plegado') + par(301, 1440, 'Tu cuenta en dos columnas'))

P[302] = prop(302, 'El valor de cada ajuste, en tinta y en su renglón', 'si', [('cambia', 'cambia mi rediseño anterior'), ('barata', 'pequeña')], 'CSS · cuenta.js (2 textos)', [
    ('Qué cambia', 'El valor («automático», «neutros», «apagado») deja la píldora naranja y pasa a <b>texto en tinta suave a la derecha</b>, sin partirse nunca a otro renglón. Dos etiquetas se acortan: «Modo madrugada» (sus horas, «22:00 a 5:00», pasan al valor cuando está encendido) y el valor «saldo y precio».'),
    ('Por qué', f'Fui yo quien puso el valor en naranja en el rediseño anterior, y me equivoqué con mi propia regla: el color es para la acción y lo tuyo, y aquí hay doce píldoras de color que no hacen nada. En tinta, la mirada va a la etiqueta. Las filas partidas a 390 px pasan de {MAQ["302-390"]["dosRenglonesAntes"]} a {len(MAQ["302-390"]["despues"])}.'),
    ('Costo y riesgo', 'Tres reglas de CSS. A 320 px las etiquetas largas siguen ocupando dos renglones (no caben), pero el valor ya no cae solo debajo. <code>textContent</code> sigue siendo «Tema: automático»: las pruebas no cambian salvo las dos etiquetas.'),
    ('Accesibilidad', '<code>--txt2</code> sobre la fila pasa el 4.5:1 (la guía lo marca ✓). Nada cambia para el lector de pantalla.'),
    ('Mi recomendación', '<b>Sí.</b> Contradice lo que hice en el rediseño; por eso lo marco.')],
    par(302, 390, 'Los ajustes con su valor en tinta a la derecha') + par(302, 320, 'Los ajustes a 320 px') + par(302, 1440, 'Los ajustes en escritorio'))

P[303] = prop(303, 'En el dock, «Movimientos» cabe', 'si', [('barata', 'mínima'), ('mej', 'solo teléfono')], 'CSS (una regla)', [
    ('Qué cambia', 'Las cinco columnas del dock dejan de ser iguales: la de «Movimientos» gana 9 px que cede «Historia», su vecina (69 · 69 · 78 · 61 · 78). Nada más.'),
    ('Por qué', 'Hoy la palabra (74 px) se sale de su casilla (67 px) y, cuando es la activa, rebasa su píldora por los dos lados. Se ve en tu iPhone cada vez que abres la lista.'),
    ('Costo y riesgo', 'Una línea en el bloque del dock. Los dos lados siguen sumando lo mismo, así que «Anotar» queda en el centro exacto (medido en la maqueta: botón y barra centrados en x = 195). «Historia» mide 44 px y le sobra sitio en 61. En escritorio no cambia.'),
    ('Accesibilidad', 'Las casillas miden 54 px de alto y 61 o más de ancho.'),
    ('Mi recomendación', '<b>Sí.</b> La alternativa (317: llamarla «Lista») no la haría.')],
    f'<div class="par bajo">{img("m-303-390-antes", "El dock hoy: Movimientos se sale de su píldora", "<b>Hoy</b> · 390 px", 560)}{img("m-303-390-despues", "El dock propuesto: Movimientos dentro de su píldora", "<b>Propuesta</b> · 390 px", 560)}</div>')

P[304] = prop(304, 'Escritorio: «Anotar compra» al final de la barra de pestañas', 'si', [('mej', 'solo escritorio'), ('hecho', 'arregla un fallo')], 'index.html · CSS · pestanas.js', [
    ('Qué cambia', 'Desde 1100 px, el botón deja la columna de la derecha y se pone <b>al final de la barra de pestañas</b>, pegado con ella al bajar. Es el dock del teléfono puesto en horizontal: navegación y acción, una sola pieza, siempre en el mismo sitio.'),
    ('Por qué', f'Hoy está en tres sitios según la pestaña (x = {A["ax"][0]}, {A["ax"][1]} y {A["ax"][2]}) y, al deslizar la lista, <b>tapa una fila</b> ({A["pisa"]["conTextoTapado"]} de {A["pisa"]["posiciones"]} posiciones medidas). En la barra no tapa nada.'),
    ('Costo y riesgo', 'El botón cambia de padre solo en escritorio (o la barra pasa a ser una rejilla de dos columnas). Riesgo medio: las pruebas de «montaña y caja» y las del foco miden dónde está el botón en 1440 y 2560. No reabre el dock del teléfono (decidido en el 20): lo extiende.'),
    ('Accesibilidad', 'El orden de tabulación mejora: pestañas y, enseguida, la acción. El atajo «A» no cambia.'),
    ('Mi recomendación', '<b>Sí.</b> Es la única de la lista que arregla algo roto de verdad.')],
    f'<div class="pila">{img("m-304-1440-despues-resumen", "Escritorio, Resumen: Anotar compra al final de la barra de pestañas", "<b>Propuesta</b> · Resumen · 1440 px (el «antes» está en la auditoría)", 1100)}{img("m-304-1440-despues-movimientos", "Escritorio, Movimientos: el botón en el mismo sitio", "<b>Propuesta</b> · Movimientos: el mismo sitio. En el teléfono no cambia nada.", 1100)}</div>')

P[305] = prop(305, 'La hoja: ayudas de un renglón', 'si', [('mov', 'toca un texto del 24'), ('barata', 'solo textos')], 'index.html · hoja.js (textos)', [
    ('Qué cambia', 'Cada ayuda de la hoja cabe en un renglón y «(opcional)» se dice una vez, en el título del plegado: «Más detalles (todo opcional)». Ejemplos: «La ve la familia; en un año el Diario la recuerda.» · «Escribe uno y el otro se calcula. Vacíos: el precio de ese día.» · «Va aparte: no cuenta para el ritmo ni cubre la semana.»'),
    ('Por qué', f'Con «Más detalles» abierto hay {palabras_antes} palabras de ayuda; quedan {palabras_despues}. La hoja baja de {A["h305"]["antes"][0]} a {A["h305"]["despues"][0]} px. Es poco alto, pero se lee de un vistazo. No añade nada: quita.'),
    ('Costo y riesgo', 'Solo textos. La ayuda de dólares y precio la fijó el campamento 24 («el que escribes manda»): el sentido se conserva, pero el texto exacto lo decides tú. Las pruebas que buscan esas frases cambian con ellas.'),
    ('Accesibilidad', 'Menos texto que leer en voz alta antes de llegar a «Guardar». Los <code>aria-describedby</code> no cambian.'),
    ('Voz del lector', 'La hoja solo la ve quien anota. ' + SIN_VOZ),
    ('Mi recomendación', '<b>Sí</b>, pero revisa tú las frases: son tu voz.')],
    par(305, 390, 'La hoja con Más detalles abierto y ayudas de un renglón') + par(305, 1440, 'La hoja en escritorio'))

P[306] = prop(306, '«Guardar» apagado dice qué falta', 'si', [('barata', 'pequeña'), ('mej', 'teléfono y escritorio')], 'hoja.js · CSS', [
    ('Qué cambia', 'Mientras no hay sats escritos, el botón es un contorno en tinta que dice <b>«Escribe los sats para guardar»</b> (en un traslado: «Escribe los sats y la wallet»). Al completar lo mínimo se vuelve el naranja de siempre con «Guardar».'),
    ('Por qué', f'Hoy es el naranja al 40 %: un marrón con la letra a {A["g306"]}:1 que parece un botón roto. El naranja relleno queda reservado para cuando de verdad se puede guardar.'),
    ('Costo y riesgo', 'Un texto que cambia con el estado y una regla de CSS. Las pruebas leen «Guardar» en el botón habilitado, que no cambia.'),
    ('Accesibilidad', 'El botón sigue <code>disabled</code>; su texto ya pasa de 4.5:1. El lector de pantalla oye qué falta.'),
    ('Voz del lector', 'Solo quien anota. ' + SIN_VOZ),
    ('Mi recomendación', '<b>Sí.</b>')],
    f'<div class="par bajo">{img("m-306-390-antes", "Guardar apagado hoy: naranja al 40 por ciento", "<b>Hoy</b> · 390 px", 560)}{img("m-306-390-despues", "Propuesta: contorno con el texto Escribe los sats para guardar", "<b>Propuesta</b> · 390 px", 560)}</div>'
    f'<div class="par bajo">{img("m-306-1440-antes", "Guardar apagado hoy en escritorio", "<b>Hoy</b> · 1440 px", 560)}{img("m-306-1440-despues", "Propuesta en escritorio", "<b>Propuesta</b> · 1440 px", 560)}</div>')

P[307] = prop(307, 'La lista: buscar y filtrar en una fila', 'si', [('mej', 'teléfono y escritorio')], 'index.html · lista.js · CSS · pruebas', [
    ('Qué cambia', 'En el teléfono, el buscador y un botón <b>«Filtros»</b> en la misma fila; los seis chips y «Fechas y orden» se abren al tocarlo (y se quedan abiertos mientras haya un filtro puesto, con «Quitar filtros» a la vista). En escritorio caben todos en una fila: buscador, chips y «Fechas y orden».'),
    ('Por qué', f'La primera fila sube de {A["lista"]["tituloAFilaAntes"]} a {A["lista"]["despues"]} px bajo el título en el teléfono ({A["listae"]["tituloAFilaAntes"]} → {A["listae"]["despues"]} en escritorio): dos movimientos más a la vista sin deslizar.'),
    ('Costo y riesgo', 'Un plegado más. Riesgo: filtrar cuesta un toque más en el teléfono, y las pruebas que tocan los chips tendrán que abrir «Filtros» antes. El atajo «/» sigue llevando al buscador.'),
    ('Accesibilidad', '«Filtros» lleva <code>aria-expanded</code> y, con un filtro activo, lo dice («Filtros: compras»). 48 px.'),
    ('Mi recomendación', '<b>Sí</b>, si filtras poco. Si usas los chips cada semana, deja el teléfono como está y haz solo la fila de escritorio.')],
    par(307, 390, 'Movimientos con buscar y Filtros en una fila') + par(307, 1440, 'Movimientos en escritorio con todo en una fila'))

P[308] = prop(308, 'Escritorio: la fila de la lista, más junta', 'despues', [('mej', 'solo escritorio')], 'CSS', [
    ('Qué cambia', 'La lista se limita a unos 620 px de ancho: la fecha, los sats y el «desde entonces» de cada fila quedan a un golpe de vista.'),
    ('Por qué', 'Hoy la fila mide 896 px y el porcentaje está a medio metro de su compra: el ojo cruza un vacío para unirlos.'),
    ('Costo y riesgo', 'Una regla. Pero deja libre la mitad derecha de la pantalla y no sé aún qué pondría ahí sin inventar algo (la suma por etiqueta ya está en el resumen de filtros; «la lista al lado» está descartada). «Ver como tabla» ya resuelve quien quiere columnas.'),
    ('Accesibilidad', 'Sin cambios.'),
    ('Mi recomendación', '<b>Después.</b> Es mejora, pero pequeña, y el hueco que deja pide una idea que no tengo.')],
    f'<div class="pila">{img("m-308-1440-antes", "La lista en escritorio hoy: el porcentaje lejos de su fila", "<b>Hoy</b> · 1440 px", 1100, (0, 280, 2880, 1560))}{img("m-308-1440-despues", "La lista más estrecha: el porcentaje cerca", "<b>Propuesta</b> · en el teléfono no cambia", 1100, (0, 280, 2880, 1560))}</div>')

P[309] = prop(309, 'Tres niveles de botón, y nada más', 'si', [('cambia', 'amplía una regla'), ('mej', 'toda la app')], 'CSS · guía', [
    ('Qué cambia', 'La regla de los controles gana dos renglones. <b>Acción</b>: naranja relleno (como hoy, solo «Anotar» y «Guardar»). <b>Secundario</b>: píldora de 48 px con filo naranja de 1.5 px, fondo transparente, tinta, 16 px (anotar un traslado, ver mis medallas, ver la película, leer la carta, ver más). <b>Enlace</b>: tinta de 15 px con subrayado naranja (ocultar hoy, escribir una carta, ampliar, fechas y orden, ver como tabla, certificado).'),
    ('Por qué', 'Hoy hay nueve aspectos para nueve botones. Con tres clases, un botón nuevo ya sabe cómo vestirse.'),
    ('Costo y riesgo', 'Dos clases (<code>.secundario</code>, <code>.enlace</code>, que ya existe) y quitar unas nueve reglas sueltas. Riesgo bajo: tamaños de toque iguales; cambian unos píxeles de alto en dos tarjetas. La regla de CLAUDE.md «Un solo lenguaje para los controles» se amplía; no se contradice.'),
    ('Accesibilidad', 'Todos a 48 px. El botón se reconoce por su texto en tinta, no solo por el filo: el naranja sobre <code>--s1</code> está a {A["nar_o"]}:1 en oscuro pero a {A["nar_c"]}:1 en claro (igual que los botones de hoy). Si quieres 3:1 también en claro, el filo usaría <code>--naranja-txt</code>. El subrayado no depende del color.'),
    ('Mi recomendación', '<b>Sí.</b> Es la que deja la app más ordenada para lo que venga.')],
    '<div class="par">' + '<div class="pila">' + img('m-309-390-antes-1', 'Tus medallas hoy, con su botón a todo el ancho y fondo tintado', '<b>Hoy</b> · 390 px', 460, (0, 1080, 1400, 1500)) + img('m-309-390-antes-2', 'Dónde están tus sats hoy', None, 460, (0, 520, 1400, 900)) + img('m-309-390-antes-3', 'Cartas hoy', None, 460) + img('m-309-390-antes-4', 'Ver 25 más hoy, filo gris', None, 460) + '</div><div class="pila">' + img('m-309-390-despues-1', 'Tus medallas con el botón secundario', '<b>Propuesta</b> · 390 px', 460, (0, 1080, 1400, 1500)) + img('m-309-390-despues-2', 'Dónde están tus sats con el botón secundario', None, 460, (0, 520, 1400, 900)) + img('m-309-390-despues-3', 'Cartas con el botón secundario', None, 460) + img('m-309-390-despues-4', 'Ver 25 más con el botón secundario', None, 460) + '</div></div>'
    + '<div class="par">' + img('m-309-1440-antes-1', 'Tus medallas en escritorio hoy', '<b>Hoy</b> · 1440 px', 460) + img('m-309-1440-despues-1', 'Tus medallas en escritorio con el botón secundario', '<b>Propuesta</b> · 1440 px', 460) + '</div>')

P[310] = prop(310, 'Una sola tarjeta: mismo radio, mismo relleno, mismo título', 'si', [('mej', 'toda la app')], 'CSS · guía', [
    ('Qué cambia', 'Tres variables (<code>--tarjeta-radio: 20px</code>, <code>--tarjeta-relleno: 20px</code>, título de tarjeta: Fraunces 20 px) que usan todas las tarjetas del Resumen y de Gráficos. «Próxima etapa» pasa a tener título como las demás. El Diario sigue siendo un periódico (esquinas casi rectas): es la excepción a propósito.'),
    ('Por qué', 'Hoy conviven radios de 24, 18 y 8 px, tres rellenos y títulos a 20, 22 y 24 px. No se nota de una en una; se nota en que la pantalla no «respira» igual.'),
    ('Costo y riesgo', 'Tocar unas ocho reglas. Riesgo medio-bajo: la regresión visual cambiará en todas las capturas del Resumen (es lo esperado) y hay pruebas que miden altos de tarjeta.'),
    ('Accesibilidad', 'Sin cambios: los títulos siguen siendo <code>h2</code>/<code>h3</code>; solo se iguala su tamaño.'),
    ('Voz del lector', 'No cambia textos; «Próxima etapa» ya es neutro.'),
    ('Mi recomendación', '<b>Sí</b>, junto con la 309 y la 316.')],
    par(310, 390, 'El Resumen con tarjetas iguales') + par(310, 1440, 'El Resumen en escritorio con tarjetas iguales'))

P[311] = prop(311, 'Cuatro tamaños de letra en vez de siete', 'despues', [('regla', 'riesgo alto')], 'CSS (4,663 líneas) · pruebas', [
    ('Qué cambia', 'El texto corriente usa solo 12 (rótulos), 13 (secundario), 15 (cuerpo) y 17 px (énfasis), como variables; los títulos, 20 y 24. Los campos se quedan en 16 px (si bajan, el iPhone hace zoom al enfocarlos).'),
    ('Por qué', f'Hoy hay siete tamaños entre 12 y 18 px en una sola pantalla. Con cuatro, la jerarquía se decide una vez.'),
    ('Costo y riesgo', f'Es la más cara: cientos de declaraciones en el CSS y muchas pruebas que miden cajas. Y, siendo honesto, <b>casi no se ve</b>: la maqueta cambia el alto del Resumen de {A["l311"]["antes"]} a {A["l311"]["despues"]} px y poco más.'),
    ('Accesibilidad', 'Los tres tamaños de letra de «Tu cuenta» siguen escalando todo (son rem).'),
    ('Mi recomendación', '<b>Después.</b> Es deuda de mantenimiento, no una mejora que vayas a sentir. Mejor: usar la escala solo en lo nuevo y dejar que lo viejo se acerque cuando se toque.')],
    par(311, 390, 'El Resumen con cuatro tamaños de letra') + par(311, 1440, 'El Resumen en escritorio con cuatro tamaños de letra'))

P[312] = prop(312, 'Lo que aún no tiene nada ocupa un renglón', 'si', [('barata', 'pequeña'), ('mej', 'quita alto del Resumen')], 'index.html · reportes.js · CSS', [
    ('Qué cambia', 'Mientras no hay traslados, «Dónde están tus sats» deja de ser una tarjeta con título, dibujo, párrafo y botón, y es <b>un renglón</b>: «¿Ya sacaste sats del exchange?» y el enlace «Anotar un traslado». Con el primer traslado vuelve la tarjeta con su rueda, como hoy.'),
    ('Por qué', f'Ahorra {A["ub"]["antes"] - A["ub"]["despues"]} px en el teléfono ({A["ub"]["antes"]} → {A["ub"]["despues"]}) de una pantalla que mide {A["ub"]["total"]}. Y una tarjeta vacía con título promete un contenido que no hay.'),
    ('Costo y riesgo', 'Una clase según haya o no traslados. No toco las cartas (su oso con el sobre se decidió en el 26) ni la lista vacía.'),
    ('Accesibilidad', 'El renglón conserva su <code>h2</code> (para el índice de títulos) y el enlace mide 48 px.'),
    ('Voz del lector', 'La pregunta solo la ve quien anota; una lectora no ve la tarjeta hasta que hay traslados (como hoy).'),
    ('Mi recomendación', '<b>Sí.</b>')],
    f'<div class="par">{img("m-312-390-antes", "Dónde están tus sats hoy: una tarjeta entera", "<b>Hoy</b> · 390 px", 460)}{img("m-312-390-despues", "Propuesta: un renglón con la pregunta y el enlace", "<b>Propuesta</b> · 390 px", 460)}</div>'
    f'<div class="par">{img("m-312-1440-antes", "La tarjeta en escritorio hoy", "<b>Hoy</b> · 1440 px", 460)}{img("m-312-1440-despues", "El renglón en escritorio", "<b>Propuesta</b> · 1440 px", 460)}</div>')

P[313] = prop(313, 'Gráficos en el teléfono: el rango y «Ampliar», en la misma fila', 'si', [('mej', 'solo teléfono')], 'index.html · CSS', [
    ('Qué cambia', 'En el teléfono el orden pasa a ser: qué gráfico, el título, <b>la lectura</b> («BTC $77,598 hoy…») y, pegada al dibujo, una fila con <b>el rango a la izquierda y «Ampliar» a la derecha</b> (ya como enlace de la 309). En escritorio el rango sigue junto al título, como hoy.'),
    ('Por qué', f'El dibujo sube {A["graf"]["selectorAGraficoAntes"] - A["graf"]["despues"]} px ({A["graf"]["selectorAGraficoAntes"]} → {A["graf"]["despues"]}) y los dos selectores iguales dejan de ir uno sobre otro: el de arriba elige el gráfico, el que toca el dibujo elige cuánto tiempo.'),
    ('Costo y riesgo', 'Mover un nodo (o <code>order</code> en CSS, cuidando que el orden de tabulación siga al visual). La lectura sigue arriba como titular (decidido en el 20). Cabe a 320 px sin desbordes (medido).'),
    ('Accesibilidad', 'Los dos controles conservan su grupo y su nombre; «Ampliar» gana tamaño de letra (13 → 15 px).'),
    ('Mi recomendación', '<b>Sí.</b>')],
    par(313, 390, 'Gráficos con el rango y Ampliar en una fila sobre el dibujo') + par(313, 320, 'Gráficos a 320 px'))

P[314] = prop(314, 'Los campos se distinguen de su fondo (claro, oscuro y alto contraste)', 'si', [('hecho', 'accesibilidad'), ('mej', 'los dos temas')], 'CSS · guía', [
    ('Qué cambia', 'Todo campo donde se escribe (la hoja, el buscador, las fechas de la lista, los diálogos) lleva un <b>filo de 1.5 px</b> de un tono nuevo, <code>--campo-filo</code> (el <code>--txt3</code> al 80 % sobre <code>--s1</code>), en los dos temas; con contraste alto, <code>--txt2</code>.'),
    ('Por qué', f'Hoy el campo es un relleno a {A["f314o"]["antes"]["campoVsPanel"]}:1 del panel en oscuro y {A["f314c"]["antes"]["campoVsPanel"]}:1 en claro, sin filo: con sol en la pantalla, la hoja parece una lista de textos. El filo propuesto queda a {A["f314o"]["filo"]["vsS1"]}:1 en oscuro y {A["f314c"]["filo"]["vsS1"]}:1 en claro (WCAG pide 3:1 para el contorno de un control). axe no mide esto: por eso el CI está en verde.'),
    ('Costo y riesgo', 'Una variable y una regla (<code>box-shadow: inset</code>, no cambia medidas). Se añade a la guía con su contraste.'),
    ('Accesibilidad', 'Es el motivo. El foco (naranja, 2 px por fuera) no cambia y se sigue distinguiendo del filo.'),
    ('Mi recomendación', '<b>Sí.</b> Es lo único de contraste que encontré, y vale para claro y oscuro.')],
    f'<div class="par">{img("m-314-390-oscuro-antes", "La hoja en oscuro hoy: campos sin filo", "<b>Hoy</b> · oscuro", 460)}{img("m-314-390-oscuro-despues", "La hoja en oscuro con filo en los campos", "<b>Propuesta</b> · oscuro", 460)}</div>'
    f'<div class="par">{img("m-314-390-claro-antes", "La hoja en claro hoy", "<b>Hoy</b> · claro", 460)}{img("m-314-390-claro-despues", "La hoja en claro con filo en los campos", "<b>Propuesta</b> · claro", 460)}</div>'
    f'<div class="par ancho">{img("m-314-1440-oscuro-antes", "La hoja en escritorio hoy", "<b>Hoy</b> · 1440 px", 1100)}{img("m-314-1440-oscuro-despues", "La hoja en escritorio con filo en los campos", "<b>Propuesta</b> · 1440 px", 1100)}</div>')

P[315] = prop(315, 'La entrada: «Entrar» a la vista sin deslizar', 'despues', [('regla', 'necesita tu iPhone')], 'CSS · login.js', [
    ('Qué cambia', 'En el teléfono la escena de la entrada baja de 54 a 40 % del alto, para que el formulario entero, con «Entrar», quepa en la primera pantalla.'),
    ('Por qué', f'Hoy «Entrar» termina {A["e844"]["entrarFin"] - A["e844"]["alto"]} px bajo el borde en 390×844. Con 40 % cabe ahí ({A["e844"]["despues"]["entrarFin"]} de 844), pero en 390×664 aún le faltan {A["e664"]["despues"]["entrarFin"] - 664} px y en 320×568, {A["e568"]["despues"]["entrarFin"] - 568}: en pantallas bajas haría falta además apretar el formulario.'),
    ('Costo y riesgo', 'El 54 % se eligió para que la montaña llene lo visible: con 40 % la cumbre queda más justa (se ve en la maqueta) y habría que reencuadrarla. Y casi siempre entras con el gestor de contraseñas y el teclado abierto, que ya sube el formulario.'),
    ('Accesibilidad', 'Sin cambios.'),
    ('Mi recomendación', '<b>Después</b>, y solo si en tu iPhone, con las barras de Safari, de verdad tienes que deslizar para tocar «Entrar». Aquí no lo puedo ver.')],
    f'<div class="par">{img("m-315-390x844-antes", "La entrada hoy: Entrar cortado por abajo", "<b>Hoy</b> · 390×844", 460)}{img("m-315-390x844-despues", "La entrada con la escena al 40 por ciento: Entrar y Entrar con un código a la vista", "<b>Propuesta</b> · 390×844 · en escritorio no cambia", 460)}</div>')

P[316] = prop(316, 'La guía de estilo enseña las piezas nuevas', 'si', [('barata', 'pequeña'), ('sitio', 'solo admin')], 'guia.html · guia.js', [
    ('Qué cambia', 'En <code>/guia</code>, la sección «Botones y controles» enseña los tres niveles (309) con su nombre de clase, «Tarjetas y avisos» la tarjeta única (310) y un campo con su filo y su contraste medido (314). Si entra la 311, la escala de letra.'),
    ('Por qué', 'La guía es la herramienta para mantener la app: si lo nuevo no está ahí, dentro de tres campamentos vuelve a haber nueve botones.'),
    ('Costo y riesgo', 'Bajo. Sin maqueta: es una página que solo ves tú. No lleva entrada en «Qué hay de nuevo».'),
    ('Accesibilidad', 'La guía ya pasa axe; los ejemplos nuevos también deben.'),
    ('Mi recomendación', '<b>Sí</b>, con cada una de las que entren.')])

P[317] = prop(317, 'Llamar «Lista» a la pestaña «Movimientos»', 'no', [('cambia', 'deshace lo del 17')], 'index.html · pruebas', [
    ('Qué cambia', 'La alternativa a la 303: una palabra más corta para que quepa en el dock.'),
    ('Por qué no', 'En el campamento 17 se igualaron a propósito el título de la lista, la pestaña y el índice («Movimientos»). «Lista» no dice de qué, y la 303 lo arregla con una regla de CSS sin tocar una palabra.'),
    ('Mi recomendación', '<b>No.</b> La pongo para que veas que la pensé.')])


def cards(*ids):
    return '<div class="cards una">' + ''.join(P[i] for i in ids) + '</div>'


SECCIONES = ''.join([
    seccion('aud', 'Primero, lo que hay · medido sobre la app de verdad', 'Auditoría', 'Abrí la app de pruebas (escenario de un año, 52 compras) como Daf3r y como Ana, a 320, 390, 768, 1440 y 2560 px, en claro y oscuro, con contraste alto y letra muy grande, sin compras y sin histórico de precios, más la entrada, la guía y la tele. Los números rosas son lo que señalo; cada cifra está medida en la página, no a ojo.', AUD),
    seccion('nav', 'Campamento 62 · menús y navegación', 'Los menús', 'Lo que pediste: «los menús en general». Cinco cambios que no añaden nada a la pantalla: acortan, ordenan y arreglan.', cards(300, 301, 302, 303, 304, 317)),
    seccion('anotar', 'Campamento 63 · anotar y la lista', 'Anotar y buscar', 'La hoja y la lista son lo que usas cada semana. Aquí todo es quitar: palabras, filas de controles y una duda («¿por qué no guarda?»).', cards(305, 306, 314, 307, 308)),
    seccion('material', 'Campamento 64 · un solo material', 'Botones, tarjetas y letra', 'La regla de los controles ordenó pestañas y selectores. Faltaba lo demás: el botón que no es «la acción», la tarjeta y los tamaños de letra.', cards(309, 310, 312, 313, 316, 311)),
    seccion('entrada', 'Aparte · la entrada', 'La entrada', 'Una sola cosa, y con dudas.', cards(315)),
])

ORDEN = '''<section class="sec" id="orden" aria-labelledby="t-orden"><div><p class="eyebrow">Cómo lo haría</p><h2 id="t-orden">Orden recomendado</h2></div>
<div class="fases">
 <article class="fase vida"><header><p class="camp">Campamento 62 · primero</p><h3>Menús que se cierran y se leen</h3></header><ul><li><span class="n">300</span> «Tu cuenta» se cierra desde arriba</li><li><span class="n">301</span> «Este dispositivo» en dos niveles</li><li><span class="n">302</span> El valor en tinta</li><li><span class="n">303</span> «Movimientos» cabe en el dock</li><li><span class="n">304</span> «Anotar» en la barra (escritorio)</li></ul><p class="why">Es lo que pediste y lo que más se toca. La 304 arregla un fallo visible.</p><p class="riesgo"><b>Riesgo:</b> bajo, salvo la 304 (pruebas que miden el botón en escritorio).</p></article>
 <article class="fase sitio"><header><p class="camp">Campamento 63 · después</p><h3>Anotar y buscar</h3></header><ul><li><span class="n">314</span> Campos con filo</li><li><span class="n">306</span> «Guardar» dice qué falta</li><li><span class="n">305</span> Ayudas de un renglón</li><li><span class="n">307</span> Buscar y filtrar en una fila</li></ul><p class="why">Todo en la hoja y la lista: se prueba junto y se revisa con una sola compra de prueba en tu iPhone.</p><p class="riesgo"><b>Riesgo:</b> bajo; la 307 cambia pruebas de la lista.</p></article>
 <article class="fase"><header><p class="camp">Campamento 64 · al final</p><h3>Un solo material</h3></header><ul><li><span class="n">309</span> Tres niveles de botón</li><li><span class="n">310</span> Una sola tarjeta</li><li><span class="n">312</span> Lo vacío, en un renglón</li><li><span class="n">313</span> Rango y «Ampliar» en una fila</li><li><span class="n">316</span> La guía al día</li></ul><p class="why">Cambia la regresión visual de casi todas las capturas: mejor de una vez y al final, cuando lo demás ya está quieto.</p><p class="riesgo"><b>Riesgo:</b> medio (muchas capturas cambian, a propósito).</p></article>
 <article class="fase opc"><header><p class="camp">Si sobra, o nunca</p><h3>Lo que dejaría</h3></header><ul><li><span class="n">308</span> La lista más junta en escritorio <span class="d">después</span></li><li><span class="n">311</span> Cuatro tamaños de letra <span class="d">después</span></li><li><span class="n">315</span> La entrada <span class="d">con tu iPhone</span></li><li><span class="n">317</span> «Lista» <span class="d">no</span></li></ul><p class="why">La 311 cuesta más de lo que se ve. La 315 depende de algo que solo ves tú.</p></article>
</div>
<p class="sis-pie"><b>Ninguna añade peso</b>: cero nodos en la escena, cero animaciones nuevas, sin desenfoques ni <code>backdrop-filter</code>, sin librerías. Es CSS y HTML: el Lighthouse móvil no debería moverse (se mide igual, antes y después). Cada campamento lleva su entrada en «Qué hay de nuevo» y su documento.</p></section>'''

REGLAS = '''<section class="sec" id="reglas" aria-labelledby="t-reglas"><div><p class="eyebrow">Para que no haya sorpresas</p><h2 id="t-reglas">Lo que cambia una regla, y lo que no propongo</h2></div>
<ul class="fuera">
 <li><b>309 amplía «Un solo lenguaje para los controles»</b> (CLAUDE.md): añade el botón secundario y el enlace. No toca el naranja relleno, la píldora con rayita ni la píldora de tinta.</li>
 <li><b>302 contradice mi rediseño anterior</b> (16-pulido-2: «el valor resaltado a la derecha»): el valor pasa de píldora naranja a tinta.</li>
 <li><b>301 toca lo decidido en el campamento 20</b> sin reabrirlo: los tres grupos y su orden siguen; solo se pliega dentro de «Este dispositivo».</li>
 <li><b>305 reescribe una ayuda del campamento 24</b> (dólares y precio): mismo sentido, menos palabras.</li>
 <li><b>No propongo</b> (está descartado o decidido): tarjetas para los gráficos, otra forma de dock o un «Anotar» que se encoge, la lista al lado en tablet, una mini ayuda o glosario, ocultar cifras, compartir resumen, osos en la hoja o en la entrada, colores de alarma, cambiar los dígitos del saldo. Tampoco toco la montaña, el valle ni la tele.</li>
</ul></section>'''

NOVI = f'''<section class="sec" id="novi" aria-labelledby="t-novi"><div><p class="eyebrow">Con honestidad</p><h2 id="t-novi">Lo que no pude ver</h2></div>
<ul class="fuera">
 <li><b>iPhone real y Safari</b>: todo está visto en Chromium. En especial: la fila pegajosa de la 300 dentro de un <code>&lt;dialog&gt;</code> en iOS, el dock de la 303 con la zona segura, y la entrada (315) con las barras de Safari.</li>
 <li><b>Las maquetas son la app con un parche de CSS encima</b>, no código terminado: no pasaron <code>test_ui</code>, axe ni el barrido. Las hice a 390 y 1440 (y 320 donde aprieta) en oscuro; en claro solo la 314. Con contraste alto, letra muy grande, 768 y 2560 px audité lo de hoy, no las propuestas.</li>
 <li><b>Lo que ve Ana</b> lo audité (está bien), pero las maquetas son todas con tu cuenta.</li>
 <li><b>El encuadre de la montaña en la 315</b> hay que rehacerlo al implementarla; la maqueta solo baja el alto de la escena.</li>
 <li><b>La tele</b> la abrí una vez (1440 px, de noche) para confirmar que no tiene controles; no la audité a fondo.</li>
</ul></section>'''

CSS_EXTRA = '''
.cards.una { grid-template-columns: minmax(0, 1fr); }
.card { padding: 18px; gap: 12px; }
.card h4 { font-size: 1.28rem; }
.par { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; align-items: start; max-width: 620px; }
.par.ancho, .par.bajo { max-width: none; }
.par.tres { grid-template-columns: repeat(3, minmax(0, 1fr)); max-width: 900px; }
.pila { display: grid; gap: 8px; min-width: 0; align-content: start; }
.pila.corta { max-width: 620px; }
.par figure, .pila figure, .aud figure { margin: 0; border-radius: 12px; overflow: hidden; border: 1px solid var(--line); background: #0b1119; min-width: 0; }
.par img, .pila img, .aud img { display: block; width: 100%; height: auto; }
.par figcaption, .pila figcaption, .aud figcaption { font-size: 0.74rem; color: var(--muted); padding: 5px 9px; background: var(--s2); }
.par figcaption b, .pila figcaption b { color: var(--fg); }
@media (max-width: 760px) { .par.ancho, .par.bajo { grid-template-columns: minmax(0, 1fr); } }
@media (max-width: 520px) { .par, .par.tres { grid-template-columns: minmax(0, 1fr); max-width: 380px; } }
.card > .par, .card > .pila { margin-block: 2px; }
.aud { display: grid; gap: 16px; }
.hall { background: var(--s1); border: 1px solid var(--line); border-radius: 18px; padding: 18px; display: grid; gap: 12px; min-width: 0; }
.hall.bien { border-color: color-mix(in srgb, var(--ok) 50%, var(--line)); }
.hall ul { margin: 0; padding: 0; list-style: none; display: grid; gap: 8px; }
.hall li { font-size: 0.93rem; color: var(--muted); }
.hall li b { color: var(--fg); }
.hall li b.n { display: inline-block; min-width: 22px; height: 22px; padding: 0 5px; border-radius: 11px; background: #ff3d8b; color: #fff; font: 700 0.78rem/22px var(--sans); text-align: center; margin-right: 4px; }
.card dd b { color: var(--fg); }
'''


def pagina():
    si = [p for p in PROPS if p[2] == 'si']
    stats = ''.join(f'<div class="stat"><b>{b}</b><span>{s}</span></div>' for b, s in [
        (len(PROPS), 'propuestas (300–317)'), (len(si), 'recomendadas'), (f'{A["cont"] - A["vis"]} px', 'hay que bajar hoy para cerrar «Tu cuenta»'), ('9 → 3', 'formas de botón'), ('0', 'nodos y animaciones nuevas')])
    resumen = ('<li><b>Los menús</b> (62): «Tu cuenta» se cierra desde arriba, se acorta a la mitad y deja el naranja para lo que se toca; «Movimientos» cabe en el dock; en escritorio «Anotar compra» deja de cambiar de sitio y de tapar la lista.</li>'
               '<li><b>Anotar y buscar</b> (63): campos con filo, un «Guardar» que dice qué falta, ayudas de un renglón y los filtros de la lista en una fila.</li>'
               '<li><b>Un solo material</b> (64): tres niveles de botón, una sola tarjeta, lo vacío en un renglón, y la guía al día.</li>'
               '<li><b>Lo que dejaría</b>: la escala de letra (cara y casi invisible), la lista de escritorio y la entrada (necesita tu iPhone).</li>')
    indice = ''.join(f'<a href="#{i}">{t}</a>' for i, t in [('aud', 'Auditoría'), ('nav', '62 · Los menús'), ('anotar', '63 · Anotar y buscar'), ('material', '64 · Un solo material'), ('entrada', 'La entrada'), ('orden', 'Orden'), ('reglas', 'Reglas'), ('novi', 'Lo que no vi')])
    cab = f'''<header class="top"><p class="eyebrow">Libro DCA · diseño antes de implementar · 24 nov 2026</p>
<h1>La interfaz: menús, hoja, lista y tarjetas</h1>
<p class="lead">Me pediste mejorar «la vista como tal, además del paisaje: los menús en general». Esto es una auditoría de lo que hay y dieciocho propuestas; <b>nada está en el repo</b>. Las maquetas son la app de verdad con un parche encima. No añado ninguna pantalla ni alargo el uso diario: casi todo es quitar o igualar. Marca sí, después o no en cada tarjeta y copia tu elección abajo.</p>
<div class="stats">{stats}</div>
<div class="resumen" aria-labelledby="t-res"><p class="eyebrow" id="t-res">En corto</p><ol>{resumen}</ol></div>
<nav aria-label="Índice" class="indice">{indice}</nav></header>'''
    barra = '''<div class="barra" role="region" aria-label="Mi elección"><div class="in">
 <div class="fila"><div class="res"><span id="resumen-sel"></span><small id="costos"></small></div><button class="btn" id="limpiar" type="button">Volver a lo propuesto</button><button class="btn pri" id="copiar" type="button">Copiar mi elección</button></div>
 <details id="extra"><summary>Ver el texto para pegar</summary><textarea id="salida" readonly aria-label="Texto de mi elección para pegar en el chat"></textarea></details>
 <p class="copiado" id="copiado" role="status"></p>
</div></div>'''
    js = '''
const CLAVE = 'diseno-interfaz-v1';
const props = [...document.querySelectorAll('.card[data-id]')];
const nombre = { si: 'Sí', despues: 'Después', no: 'No' };
let guardado = {};
try { guardado = JSON.parse(localStorage.getItem(CLAVE) || '{}') || {}; } catch (e) {}
function leer() { const o = {}; for (const c of props) { const r = c.querySelector('input:checked'); o[c.dataset.id] = r ? r.value : c.dataset.rec; } return o; }
function pintar() {
  const o = leer(), cambios = {};
  for (const c of props) { c.dataset.estado = o[c.dataset.id]; if (o[c.dataset.id] !== c.dataset.rec) cambios[c.dataset.id] = o[c.dataset.id]; }
  try { localStorage.setItem(CLAVE, JSON.stringify(cambios)); } catch (e) {}
  const por = { si: [], despues: [], no: [] }; for (const [k, v] of Object.entries(o)) por[v].push(k);
  document.getElementById('resumen-sel').textContent = `${por.si.length} sí · ${por.despues.length} después · ${por.no.length} no`;
  const nc = Object.keys(cambios).length;
  const lista = Object.entries(cambios).map(([k, v]) => `${k} → ${nombre[v].toLowerCase()}`).join(', ');
  document.getElementById('costos').textContent = nc ? `Cambiaste ${nc} respecto a lo propuesto: ${lista}` : 'Tal como lo propongo. Cambia lo que quieras en cada tarjeta.';
  document.getElementById('salida').value = `Mi elección (mejoras de la interfaz, propuestas 300–317 · 24 nov 2026)\\nSÍ: ${por.si.join(', ') || '—'}\\nDESPUÉS: ${por.despues.join(', ') || '—'}\\nNO: ${por.no.join(', ') || '—'}\\n${nc ? 'Cambios respecto a lo propuesto: ' + lista : 'Sin cambios respecto a lo propuesto.'}\\nNotas: `;
}
for (const c of props) { const v = guardado[c.dataset.id]; if (v && nombre[v]) { const r = c.querySelector(`input[value="${v}"]`); if (r) r.checked = true; } c.addEventListener('change', pintar); }
document.getElementById('limpiar').addEventListener('click', () => { for (const c of props) c.querySelector(`input[value="${c.dataset.rec}"]`).checked = true; pintar(); });
document.getElementById('copiar').addEventListener('click', async () => {
  const t = document.getElementById('salida').value, m = document.getElementById('copiado');
  try { await navigator.clipboard.writeText(t); m.textContent = 'Copiado. Pégalo en el chat.'; }
  catch (e) { document.getElementById('extra').open = true; const s = document.getElementById('salida'); s.focus(); s.select(); m.textContent = 'No pude copiar solo: el texto está seleccionado abajo.'; }
});
pintar();
'''
    return (f'<!doctype html>\n<html lang="es">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>Mejoras de la interfaz</title>\n'
            f'<meta name="claude:viewport-fit-sides" content="cover">\n<style>{estilo_base()}{CSS_EXTRA}</style>\n</head>\n<body>\n<div class="wrap">{cab}{SECCIONES}{ORDEN}{REGLAS}{NOVI}</div>\n{barra}\n<script>{js}</script>\n</body>\n</html>\n')


if __name__ == '__main__':
    WEBP.mkdir(exist_ok=True)
    salida = AQUI / 'propuestas-interfaz.html'
    salida.write_text(pagina())
    print(salida, f'{salida.stat().st_size / 1e6:.2f} MB', len(PROPS), 'propuestas')
