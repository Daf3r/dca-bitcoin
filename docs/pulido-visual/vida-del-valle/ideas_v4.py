# Cuarta ronda (v4): la vida del valle. Lo ejecuta hacer_galeria.py después de ideas_pueblo.py. Los ids 1–123 no cambian (las
# elecciones del dueño se guardan por id); lo ya hecho en los campamentos 26–38 se marca `hecho`; lo que quedó «para después» se
# reexamina con su mismo id; lo nuevo va desde la 124, en campamentos desde el 39. Maquetas: scratchpad/vida4 (prototipo sin commitear
# sobre origin/main en /home/user/vida4-wt: personajes nuevos en arte-vecinos.js y retoques sobre la escena viva).
V4 = pathlib.Path('/tmp/claude-0/-home-user-dca-bitcoin/a4559b60-eb1b-544b-95bf-bb999d91cf6d/scratchpad/vida4')
_VS = json.loads((V4 / 'v4-svgs.json').read_text())
for _k, _v in _VS['svgs'].items():
    SVGS['v4-' + _k] = _v.replace('v-vo-', 'vo-')


def vimg(k, archivo, alt, pie, ancho=780, bajo=None, alto=False):
    """Una captura de vida4/cap. `bajo`: se queda con esa altura de abajo (las de octubre y noviembre traen los hilos de las piscuchas)."""
    ruta = V4 / 'cap' / archivo
    rec = None
    if bajo:
        w, h = Image.open(ruta).size
        rec = (0, max(0, h - bajo), w, h)
    img(k, str(ruta), alt, ancho=ancho, recorte=rec, alto=alto, pie=pie)


PROTO = 'Prototipo en la escena de main · 390 px, ampliado'
RETOQUE = 'Retoque sobre la escena de main (no es código final)'
vimg('v4-mediodia', 'mediodia-tel.png', 'Mediodía entre semana: la tortillera con su comal y su brasa, un vecino esperando y cuatro oseznos con su bolsón en la plaza.', PROTO + ' · 12:10', bajo=384)
vimg('v4-hamaca', 'hamaca-tel.png', 'La siesta: un oso en su hamaca roja con el sombrero en la cara, la abuela en su corredor y un garrobo al sol.', PROTO + ' · 13:20')
vimg('v4-fresca', 'fresca-tel.png', 'De noche, tres vecinos sentados en sus sillas en la acera y dos más platicando junto a la iglesia.', PROTO + ' · 20:30')
vimg('v4-fresca-e', 'fresca-esc.png', 'La fresca en escritorio.', 'El mismo prototipo a 1440 px', ancho=880)
vimg('v4-lluvia', 'lluvia-tel.png', 'Tarde de lluvia: dos vecinos con paraguas negro, uno con una hoja de huerta sobre la cabeza y dos oseznos saltando en un charco.', PROTO + ' · julio, 15:30')
vimg('v4-lluvia-e', 'lluvia-esc.png', 'La tarde de lluvia en escritorio.', 'El mismo prototipo a 1440 px', ancho=880)
vimg('v4-ramos', 'ramos-tel.png', 'Domingo de Ramos: los vecinos con su palma camino de la iglesia y el padre a la puerta.', PROTO + ' · Domingo de Ramos, 8:30')
vimg('v4-pinata', 'pinata-tel.png', 'Primero de octubre: la piñata colgada en la plaza, un osezno vendado con su palo y los demás alrededor.', PROTO + ' · 1 de octubre, 15:30', bajo=420)
vimg('v4-farolitos', 'farolitos-tel.png', '14 de septiembre al anochecer: cinco oseznos con su farolito encendido y un vecino con la antorcha.', PROTO + ' · 14 de septiembre, 18:35')
vimg('v4-farolitos-e', 'farolitos-esc.png', 'Los farolitos en escritorio.', 'El mismo prototipo a 1440 px', ancho=880)
vimg('v4-difuntos', 'difuntos-tel.png', 'Dos de noviembre: vecinos con flores y una corona de papel, un osezno con una flor y una velita en el corredor.', PROTO + ' · 2 de noviembre, 9:00', bajo=384)
vimg('v4-mangos', 'mangos-tel.png', 'Marzo: un osezno con una vara larga bajo el árbol de la plaza, su canasto de mangos y un garrobo cerca.', PROTO + ' · marzo, 10:00')
vimg('v4-lavar', 'lavar-tel.png', 'Lunes: un tendedero con ropa de colores y una sábana blanca delante de una casa.', PROTO + ' · lunes, 9:30')
vimg('v4-atolada', 'atolada-tel.png', 'Sábado de julio: la olla del atol con su fuego, vecinos con su huacal y oseznos con elote.', PROTO + ' · sábado de julio, 16:30')
vimg('v4-inditos', 'inditos-tel.png', '12 de diciembre: oseznos con sombrerito, cotón y pañuelo rojo frente a la iglesia, con el pino y el nacimiento de siempre.', PROTO + ' · 12 de diciembre, 9:00')
vimg('v4-abrazo', 'abrazo-tel.png', 'Año nuevo, pasada la medianoche: dos parejas de osos abrazadas y los oseznos con su estrellita.', PROTO + ' · 1 de enero, 0:10')
vimg('v4-mejenga', 'mejenga-tel.png', 'Domingo por la tarde: dos porterías de palo en la plaza y los oseznos jugando.', PROTO + ' · domingo, 15:30')
vimg('v4-gloria', 'gloria-tel.png', 'Sábado de Gloria: tres oseznos con su llanta negra de camino al lago y el pueblo casi vacío.', PROTO + ' · Sábado de Gloria, 10:00')
vimg('v4-alba', 'alba-tel.png', 'Antes de las seis: el gallo en la plaza, el panadero en su bicicleta, el que se estira y la que barre.', PROTO + ' · 5:35')
vimg('c-hoy', 'c-hoy-cumbre-tel.png', 'Los tres osos de la cumbre como están hoy, de día.', 'HOY · la cumbre a 390 px, ampliado', ancho=520)
vimg('c-espaldas', 'c-espaldas-cumbre-tel.png', 'Al atardecer, los tres osos de la cumbre de espaldas, mirando el sol que baja.', RETOQUE + ' · 17:35', ancho=520)
vimg('c-espaldas-e', 'c-espaldas-cumbre-esc.png', 'Los tres de espaldas al atardecer, en escritorio.', 'Lo mismo a 1440 px', ancho=520)
vimg('c-duermen', 'c-duermen-cumbre-esc.png', 'De madrugada, los tres osos de la cumbre con los ojos cerrados.', RETOQUE + ' · 23:10, 1440 px', ancho=520)
vimg('c-nieve', 'c-nieve-cumbre-tel.png', 'En diciembre, un oso de nieve chiquito con bufanda roja junto a los tres.', RETOQUE + ' · 20 de diciembre', ancho=520)
vimg('c-nieve-e', 'c-nieve-cumbre-esc.png', 'El oso de nieve en escritorio.', 'Lo mismo a 1440 px', ancho=520)
vimg('c-regalos', 'c-regalos-cumbre-tel.png', 'El 25 de diciembre, dos regalos a un lado de los osos y el oso de nieve al otro.', RETOQUE + ' · 25 de diciembre', ancho=520)
vimg('c-paraguas', 'c-paraguas-cumbre-tel.png', 'En una tarde de lluvia, un paraguas celeste clavado en la nieve cubre a los tres.', RETOQUE + ' · julio, 15:30', ancho=520)
vimg('t-hoy', 'c-hoy-tu-tel.png', '«Tú» como está hoy: el osito con su mochila naranja y su palito.', 'HOY · «Tú» a 390 px, ampliado', ancho=520)
vimg('t-carpa', 'c-carpa-tu-tel.png', 'De noche, en el sitio de «Tú», una carpita naranja con luz dentro y su palito clavado al lado.', RETOQUE + ' · 23:10', ancho=520)
vimg('t-carpa-e', 'c-carpa-tu-esc.png', 'La carpa de «Tú» en escritorio, de noche.', 'Lo mismo a 1440 px', ancho=520)
vimg('t-capote', 'c-capote-tu-tel.png', '«Tú» con capote y capucha amarillos en una tarde de lluvia.', RETOQUE + ' · julio, 15:30', ancho=520)
vimg('t-espaldas', 'c-espaldas-tu-tel.png', '«Tú» de espaldas al atardecer, mirando el valle.', RETOQUE + ' · 17:35', ancho=520)
vimg('t-estira', 'c-estira-tu-tel.png', '«Tú» con los brazos arriba, estirándose por la mañana.', 'La pose de festejar que ya existe, a las 7:05', ancho=520)
vimg('t-equipo', 'c-equipo-tu-tel.png', '«Tú» con un rollo de cuerda roja en la mochila y un piolet.', RETOQUE, ancho=520)

# ---------------------------------------------------------------- lo ya hecho (campamentos 26–38, PR #97, en main y en producción)
_HECHO = {}
for _ids, _c in [(range(1, 8), '26'), ((8, 9), '27'), (range(10, 15), '28'), ((15, 16, 17), '29'), (range(18, 22), '30'), ((23,), '32'), (range(33, 40), '31'),
                 ((42,), '33'), ((49, 50, 51), '34'), (range(100, 108), '35'), (range(108, 114), '36'), ((114, 115, 117), '37'), ((120, 121, 122), '38')]:
    for _n in _ids:
        _HECHO[_n] = 'Hecho en el campamento ' + _c
_HECHO.update({43: 'La reemplazó la 100 (hecha en el 35)', 44: 'La reemplazaron la 100 y el 36 (hechos)', 48: 'Es la 108 (hecha en el 36)', 52: 'Es la 104 y la 117 (hechas)', 53: 'Es la 110 (hecha en el 36)'})
_PARCIAL = {20: 'Se juntaron 27 nodos de los 69: lo demás, en la 127, 128 y 133.', 113: 'Quietas: el titilar es la 201.', 120: 'El del cayuco; el de la orilla es la 206.',
            23: 'Solo desde 1100 px.', 109: 'Era «después»: lo aprobaste y se hizo.', 50: 'Ahora cruza de 14:00 a 15:00.', 49: 'Ahora desde las 8:00.'}
for _i in I:
    if _i['n'] in _HECHO:
        _i['hecho'] = _HECHO[_i['n']]
        if _i['n'] in _PARCIAL:
            _i['parcial'] = _PARCIAL[_i['n']]
for _c in CAMPS:
    _c['ids'] = [n for n in _c['ids'] if n in _HECHO]
    _c['hecho'] = True
CAMPS[:] = [c for c in CAMPS if c['ids']]
_VIEJOS = list(CAMPS)

# ---------------------------------------------------------------- los campamentos nuevos (van primero)
NUEVOS = [
    {'id': 'c39', 'k': '39', 'camp': 'Campamento 39', 't': 'Hacer sitio 2', 'tipo': 'sitio', 'ids': [124, 125, 126, 127, 128, 129, 130, 131, 135, 132, 133, 134],
     'orden': 'Rendimiento primero: unos 96 nodos menos en el pico del año (131 el resto de Nochebuena) y unas 44 animaciones de noche menos, contados sobre la escena de hoy. Y una herramienta para ver cualquier día del año sin esperarlo.',
     'why': 'Hoy quedan 70 nodos de margen en Nochebuena y, la noche de lluvia, 1 animación en el dibujo grande y 2 en el cielo. Lo que más pesa y menos se nota: 46 estrellas con 36 animaciones, 73 nodos de luciérnagas y 35 de cohetes que solo se ven cuarenta minutos.',
     'riesgo': 'Medio. La 125 cambia una regla chica; la 126 y la 127 cambian cómo titila la noche (la regresión visual lo dirá). Los ahorros están contados, no implementados: el banco dirá la cifra real.',
     'meta': 'Navegador y pruebas · 1 PR (o dos: el banco y el almanaque primero) · sin «Qué hay de nuevo» · tu medida en el iPhone, de noche'},
    {'id': 'c40', 'k': '40', 'camp': 'Campamento 40', 't': 'El día entero del pueblo', 'tipo': 'vida', 'ids': [136, 137, 138, 139, 140, 141, 142, 143, 144, 145, 146, 147, 148],
     'orden': 'Turnos nuevos de la madrugada a la noche, variedad de un día a otro y la luz que gira. Casi todo a 0 nodos: es otro reparto de los mismos trazos.',
     'why': 'Lo más barato y lo que más se nota: medido con el prototipo, un turno nuevo no suma ni un nodo (los vecinos son siempre 8 a 11 trazos). Hoy el pueblo tiene seis momentos; con esto, doce, y ninguno igual al de ayer.',
     'riesgo': 'Bajo. Cada cambio de turno repinta una vez el dibujo grande (hoy unas seis veces al día; serían unas diez). No hay animaciones nuevas. En la entrada se ve el mismo pueblo: nada de esto depende de la familia ni de las compras.',
     'meta': 'Navegador · 1 PR · cabe hoy, sin esperar al 39 · «Qué hay de nuevo»'},
    {'id': 'c41', 'k': '41', 'camp': 'Campamento 41', 't': 'El año del pueblo', 'tipo': 'vida', 'ids': [149, 150, 151, 152, 153, 154, 155, 156, 157, 158, 159, 160, 161, 162, 163, 164],
     'orden': 'Dieciséis fechas y temporadas de aquí, de Ramos al abrazo de año nuevo. Turnos de calendario: 0 nodos casi todas.',
     'why': 'Que abrir la app un día cualquiera pueda traer una sorpresa de aquí. Son costumbres que puedo afirmar; las religiosas y la de Difuntos van marcadas para que las decida la familia.',
     'riesgo': 'Bajo en rendimiento; medio en cultura. Semana Santa necesita calcular la fecha de la Pascua (una función pura, con su prueba). A 390 px los detalles chicos (un elote, una flor) apenas se leen: se nota el conjunto.',
     'meta': 'Navegador · 1 o 2 PR · cabe hoy · pruebas con libro.dia · «Qué hay de nuevo»'},
    {'id': 'c42', 'k': '42', 'camp': 'Campamento 42', 't': 'Lluvia y verano', 'tipo': 'vida', 'ids': [165, 166, 167, 168, 169, 170, 171],
     'orden': 'El pueblo bajo la lluvia, los charcos, la canícula, el nubarrón de la tarde y el cielo de cada mes.',
     'why': 'El valle ya cambia de color con la época; falta que la gente y el cielo lo vivan. La lluvia sigue siendo de calendario (la época y la hora), nunca el clima de verdad.',
     'riesgo': 'Bajo. Unos 5 nodos en la lluviosa, que es cuando la escena pesa menos.',
     'meta': 'Navegador · 1 PR · cabe hoy · «Qué hay de nuevo»'},
    {'id': 'c43', 'k': '43', 'camp': 'Campamento 43', 't': 'Animales de aquí', 'tipo': 'vida', 'ids': [172, 173, 54, 174, 175, 176, 177, 178],
     'orden': 'El gallo, los zanates, el tecolote, los garrobos, las vacas que van y vuelven. Quietos: cambian de sitio con la hora.',
     'why': 'Los animales son el país. Van dentro de los trazos de los vecinos (mismo tono oscuro), así que no suman nodos, y ninguno se mueve: no tocan la regla de uno a la vez.',
     'riesgo': 'Bajo. A 390 px un gallo mide unos 4 px: en el teléfono se intuye, en escritorio se ve.',
     'meta': 'Navegador · 1 PR · cabe hoy'},
    {'id': 'c44', 'k': '44', 'camp': 'Campamento 44', 't': 'La luna y las estrellas', 'tipo': 'vida', 'ids': [179, 180, 181, 182, 183],
     'orden': 'El conejo en la luna llena, las estrellas de verdad de cada época y la lluvia de estrellas de diciembre.',
     'why': 'El cielo ya sigue la hora y la fase de la luna. Esto le pone lo que la gente de aquí mira: el conejo, las Siete Cabritas, el Alacrán.',
     'riesgo': 'Bajo en nodos (se recolocan estrellas que ya existen). Si se hace la 126, van en los mismos cuatro trazos.',
     'meta': 'Navegador · 1 PR · mejor después del 39 (la 126)'},
    {'id': 'c45', 'k': '45', 'camp': 'Campamento 45', 't': 'Los osos de la cumbre, con más gestos', 'tipo': 'vida', 'ids': [184, 185, 186, 187, 188, 24, 26, 189, 190, 45],
     'orden': 'Miran el atardecer de espaldas, hacen su oso de nieve en diciembre, se duermen, se tapan de la lluvia y saludan cuando «Tú» se acerca.',
     'why': 'Los tres peluches casi no cambian en todo el día. Los mejores gestos salen de esconder o enseñar piezas que ya están (la cara), así que cuestan cero.',
     'riesgo': 'Medio: el sitio de los osos costó decidirlo. Nada sale de su caja ni contra el cielo; si un gesto no cabe, ese día no sale (como hoy al estirarse).',
     'meta': 'Navegador · 1 PR · «Qué hay de nuevo»'},
    {'id': 'c46', 'k': '46', 'camp': 'Campamento 46', 't': '«Tú» con más gestos', 'tipo': 'vida', 'ids': [191, 192, 193, 194, 40, 195, 196, 197, 41, 198],
     'orden': '«Tú» acampa de noche, se pone su capote si llueve, mira el atardecer, lleva su equipo según el campamento y sus parches de constancia.',
     'why': '«Tú» es el dato más importante de la escena y hoy solo respira. Que viva el día como los demás, y que lo que lleva cuente lo que ya logró. Nunca lo que falta.',
     'riesgo': 'Medio. Todo debe caber en la caja de «Tú» (los rótulos y las tarjetas de la tele se apartan según ella). Ningún gesto aparece por no comprar: solo por la hora, la fecha o algo ya alcanzado.',
     'meta': 'Navegador · 1 PR · cabe hoy · «Qué hay de nuevo»'},
    {'id': 'c47', 'k': '47', 'camp': 'Campamento 47', 't': 'El pueblo se mueve, parte 2', 'tipo': 'vida', 'ids': [116, 199, 200, 25, 201, 202, 203, 118, 119, 204],
     'dep': 'el campamento 39: el banco (124) para todo; la 127 para el humo del fogón (202).',
     'orden': 'El panadero cruza, la hamaca se mece, la tortillera palmea, la campana del mediodía y el reloj de la torre. Uno a la vez, cada uno en su franja.',
     'why': 'Las franjas que quedaban libres (6:00–7:00, 11:30–14:00) y lo que quedó «para después» del 37 y del pulido integral.',
     'riesgo': 'Medio-alto: es lo que puede costar fotogramas. Cada gesto va en la capa chica del vecino y se mide; por debajo de 55 fps en tu iPhone, se quita.',
     'meta': 'Navegador · 1 PR · «Qué hay de nuevo» · tu medida en el iPhone en cada franja'},
    {'id': 'c48', 'k': '48', 'camp': 'Campamento 48', 't': 'Cambios grandes al paisaje', 'tipo': 'vida', 'ids': [205, 206, 207, 208, 123, 209],
     'dep': 'el campamento 39 (el banco y el presupuesto de pantallas anchas, la 131).', 'todas': False,
     'orden': 'Lo ambicioso: una plaza con kiosko y ceiba, la orilla del lago con vida, el valle por encima del velo, el cantón de la loma. Casi todo «después»: lo decides tú.',
     'why': 'Pediste ideas sin límite. Estas cambian la composición del pueblo o del valle: valen la pena, pero cada una reabre algo que ya se pulió.',
     'riesgo': 'Alto: cambian pruebas del valle (22C, pulidos del pueblo) y piden capturas nuevas en todos los tamaños. Por eso solo propongo de entrada la que no toca el teléfono.',
     'meta': 'Navegador · un PR por idea · con tu visto bueno antes de empezar'},
    {'id': 'despues', 'k': '…', 'camp': 'De rondas anteriores', 't': 'Siguen para después', 'ids': [22, 27, 28, 29, 30, 31, 32, 46, 47], 'opc': True,
     'orden': 'Lo que quedó «para después» en el v3 y no cambia de opinión. No entran salvo que las marques.',
     'why': 'Reexaminadas una por una: siguen siendo buenas y siguen sin ser urgentes. Las demás de «después» (24, 25, 26, 40, 41, 45, 54, 116, 118, 119 y 123) están arriba, en su campamento nuevo.',
     'riesgo': 'El de antes: el alto de los diálogos, el estilo de grabado y lo que solo se ve en un iPhone.',
     'meta': 'Solo si las pides'},
]
CAMPS[:] = NUEVOS + _VIEJOS

HOY, SITIO, AHORRA = 'hoy', 'sitio', 'ahorra'
DUDOSO4 = ('regla', 'Que lo diga la familia')
REGLA4 = ('regla', 'Cambia una regla')
QUIETO4 = ('barata', 'Quieto')
MUEVE4 = ('mov', 'Se mueve · en su capa')
ANCHO = ('mov', 'Solo pantallas anchas')
BANCO, ESTRELLAS, TOPE_OSOS, ANCHAS = 124, 126, 129, 131


def _sig(v):
    return ('+' if v > 0 else '−' if v < 0 else '') + str(abs(v))


def _pres(nb, otros, an, os, franja):
    cl = lambda v: 'menos' if v < 0 else 'mas' if v > 0 else ''
    s = f'<span>Nochebuena, 21:00, teléfono: <b class="{cl(nb)}">{_sig(nb)} nodos</b></span>'
    if otros:
        s += f'<span>Otros días: <b>{otros}</b></span>'
    s += f'<span>Animaciones, noche de lluvia: <b class="{cl(an)}">{_sig(an)}</b></span>'
    if os:
        s += f'<span>Osos: <b class="mas">{_sig(os)}</b></span>'
    if franja:
        s += f'<span>Franja: <b>{franja}</b></span>'
    return s


def nv(n, t, rec, c, cabe, que, donde, costo, ojo, porRec, nb=0, otros='', an=0, os=0, franja='', imgs=(), poses=(), badges=(), requiere=(), por='', como='', nbp=None, capa='principal'):
    """Una idea nueva. `nb`: nodos que suma la noche de Nochebuena en el teléfono (el peor día); `an`: animaciones a la vista de noche; `os`: nodos dentro de #m-osos."""
    idea(n, t, rec, c, costo, que, donde, por, como, ojo, porRec, imgs=imgs, poses=['v4-' + p for p in poses], badges=badges, requiere=requiere)
    I[-1].update({'cabe': cabe, 'nb': nb, 'nbp': nb if nbp is None else nbp, 'an': an, 'capa': capa, 'os': os, 'pres': _pres(nb, otros, an, os, franja)})


def reex(n, rec, cabe, porRec, nb=0, otros='', an=0, os=0, franja='', imgs=None, requiere=None, costo=None, extra_badges=()):
    """Una idea de antes que sigue abierta: mismo id, reexaminada con lo que hoy se sabe."""
    i = next(x for x in I if x['n'] == n)
    assert 'hecho' not in i, n
    i.update({'rec': rec, 'cabe': cabe, 'nb': nb, 'nbp': nb, 'an': an, 'capa': 'principal', 'os': os, 'porRec': porRec, 'pres': _pres(nb, otros, an, os, franja)})
    i['badges'] = [b for b in i['badges'] if b[0] != 'despues'] + [list(b) for b in extra_badges]
    if imgs is not None:
        i['imgs'] = list(imgs)
    if requiere is not None:
        i['requiere'] = list(requiere)
    if costo:
        i['costo'] = costo


# ================================================================ Campamento 39 · Hacer sitio 2
nv(124, 'El banco mide los días que faltan y cada fecha declara lo que pesa', 'si', 'S', AHORRA,
   'El banco de rendimiento suma dos casos: el 31 de diciembre a las 23:55 (con cohetes) y la noche de lluvia como caso duro. Y cada fecha nueva del calendario declara sus nodos en una tabla que el banco comprueba.',
   'tests/banco_rendimiento.mjs y docs/rendimiento.md. No se ve.',
   '0 nodos · unos 2 min más en el CI.',
   'Que el banco no se vuelva lento: los casos nuevos, solo lo duro (nodos y animaciones).',
   'Sin esto, sumar dieciséis fechas es ir a ciegas. Es lo primero.')
nv(125, 'Los cohetes, solo en su hora', 'si', 'S', AHORRA,
   'Los cohetes de Nochebuena y fin de año se dibujan hoy todo el día 24, 25, 31 y 1 (35 nodos) y se ven de 23:50 a 0:30. Pasan a ponerse a las 23:40 y quitarse a las 0:40.',
   'montana.js, como ya se hace con los vecinos al cambiar de turno.',
   'Contado: 35 nodos menos casi todo el día 24, 25, 31 y 1 (Nochebuena a las 21:00: de 1030 a unos 995). En la hora de los cohetes no ahorra nada: ese sigue siendo el pico.',
   'Es una excepción más a «lo de la hora no se redibuja»: un grupo que entra y sale dos veces al año. Que entren en un momento quieto, no a media animación.',
   'Deja los cohetes como el único peso de su hora, a cambio de una excepción chica.', nb=-35, nbp=0, otros='0', badges=[REGLA4])
nv(126, 'Las estrellas, en cuatro trazos', 'si', 'M', AHORRA,
   'Hoy son 46 círculos y 36 animaciones (cada estrella titila sola). Pasan a cuatro trazos, uno por ritmo: titilan por grupos de once o doce, repartidas por todo el cielo.',
   'La capa del cielo. De noche.',
   'Contado: 42 nodos menos todos los días y 32 animaciones menos cada noche: la capa del cielo pasa de 42 a 10 (su tope es 44).',
   'Que no se note «en bloque»: los cuatro grupos van mezclados por el cielo y con ritmos primos entre sí. La regresión visual de noche cambia: revisarla a ojo.',
   'El cielo va en 42 animaciones de 44. Con esto sobra sitio para lo que venga arriba (estrellas de verdad, lluvia de estrellas).', nb=-42, otros='−42', an=-32, capa='cielo')
nv(127, 'Las luciérnagas, más livianas', 'si', 'M', AHORRA,
   'Son 12 luciérnagas de 6 nodos cada una (73 en total) y 32 animaciones (48 en la lluviosa). Con 3 nodos por luciérnaga y el brillo por grupo de vuelo, se ven igual.',
   'El dibujo grande. De noche.',
   'Contado: unos 36 nodos menos todos los días y unas 12 animaciones menos cada noche en el dibujo grande (de 55 a unas 43 la noche de lluvia; su tope es 56).',
   'No es la 22 (sacarlas a su capa, que no dio ganancia): aquí son menos piezas, no otro sitio. Comparar de noche, lado a lado.',
   'El dibujo grande va en 55 animaciones de 56 la noche de lluvia: es el tope que de verdad aprieta, y queda 1. Sin esto no cabe nada nuevo que se mueva de noche en el pueblo.', nb=-36, otros='−36', an=-12)
nv(128, 'El reloj de sol y la luna, en menos trazos', 'si', 'S', AHORRA,
   'Las once piedras del reloj de sol son once elipses del mismo color; los mares de la luna, ocho trazos del mismo tono. Uno cada uno.',
   'El frente y la capa del cielo.',
   'Contado: unos 18 nodos menos todos los días.',
   'Ninguno: mismo color, misma forma. Regresión visual en 0.00 %.',
   'Barato y sin riesgo. Es lo que quedó de la 20.', nb=-18, otros='−18')
nv(129, 'El tope de los osos, de 40 a 46', 'despues', 'S', AHORRA,
   'Los osos van en 33 nodos (35 en Navidad) de un tope de 40. Con dormirse (+4) llegan a 39, y con el sombrero de marzo, a 38: caben. El paraguas, la banderita, los regalos y el oso de nieve van clavados en la nieve, fuera del grupo de los osos, así que no gastan ese tope.',
   'tests/banco_rendimiento.mjs y CLAUDE.md.',
   '0 nodos.',
   'Subir un tope es fácil; bajarlo después, no.',
   'Después: con lo propuesto no hace falta. Solo si un día quieres un gesto más que añada piezas al cuerpo de los osos.', badges=[REGLA4])
nv(130, 'El pueblo vivo, en su propia capa', 'despues', 'L', AHORRA,
   'Los vecinos y los animales de la plaza saldrían del dibujo grande a un solo SVG chico del tamaño del pueblo (unos 190×70 px en el teléfono). Un cambio de turno repintaría solo esa capa, y dentro de ella mover a un vecino sería barato.',
   'montana.js: una capa más entre el dibujo grande y el frente.',
   'Unos 0.5 MB de memoria a 3× (estimado). Quita los cinco SVG sueltos de gallinas y perro.',
   'Es rediseñar capas. Medido en el 30, sacar las luciérnagas a su capa no ganó nada: esto habría que medirlo igual antes de creérselo. El orden de pintado con los árboles y faroles del pueblo es delicado.',
   'Solo vale la pena si quieres la ronda (118) o que los vecinos caminen (204). Para lo demás no hace falta.')
nv(131, 'Un presupuesto propio para pantallas anchas', 'si', 'S', AHORRA,
   'El tope de 1100 es del teléfono. En escritorio la escena ya pesa más (medido con mil compras: 982 de día y 1089 en Nochebuena a 1440 px; 999 y 1105 a 2560) y nadie lo vigila. Un tope escrito para 1440 y 2560, medido en tu PC y en la tele.',
   'El banco y docs/rendimiento.md.',
   '0 nodos.',
   'Que el tope ancho no se use de excusa para cargar el teléfono: lo que es «solo ancho» no se dibuja debajo de 1100 px.',
   'Hay sitio de pantalla en escritorio para más vida (la orilla del lago, el cantón); falta saber cuánto aguanta.')
nv(135, 'El almanaque en la guía: ver cualquier día y hora', 'si', 'S', AHORRA,
   'En /guia (solo tú), una lista de todas las fechas y turnos del valle con un botón «verlo»: pone ese día y esa hora y abre la montaña. Hoy hay que escribir libro.dia y libro.hora a mano.',
   '/guia, solo el admin.',
   '0 nodos en la escena.',
   'Que al salir se quite: un aviso claro de «estás viendo otro día» y un botón para volver a hoy.',
   'Con dieciséis fechas nuevas, si no puedes verlas sin esperar un año no puedes aprobarlas.')
nv(132, 'Lo de la noche no se dibuja de día (y al revés)', 'despues', 'M', AHORRA,
   'Luciérnagas, estrellas, luna, aurora y Vía Láctea no se dibujarían de día (unos 155 nodos hoy; unos 75 si se hacen la 126 y la 127), ni el sol y el torogoz de noche. La escena se redibujaría al amanecer y al anochecer.',
   'montana.js: fueraDeTemporada, por hora.',
   'De día, unos 155 nodos menos. De noche, cuando más pesa, casi nada.',
   'Rompe «nada se redibuja al cambiar de hora» de verdad: dos redibujos al día con la app abierta, justo en las horas más bonitas. Ya lo descarté en el v3.',
   'Después: ahorra de día, que es cuando sobra sitio. Solo si un día el margen de día se acaba.', badges=[REGLA4])
nv(133, 'Los pinos del bosque, en dos trazos', 'despues', 'M', AHORRA,
   'Los 60 pinos son 60 trazos porque la película del ascenso los enciende uno a uno. Fuera de la película podrían ser dos trazos.',
   'El dibujo grande.',
   'Contado: unos 58 nodos menos, salvo durante la película.',
   'El 30 lo declinó a propósito. Habría dos maneras de dibujar el bosque, y la película tendría que redibujarlo al empezar.',
   'Después: es el ahorro grande que queda en reserva si hiciera falta.', nb=-58, otros='−58')
nv(134, 'Subir el tope del teléfono de 1100 a 1200', 'despues', 'S', AHORRA,
   'Mides 59 fps al deslizar con todo lo de hoy; el umbral es 55. Cada 100 nodos cuestan unos 3 a 8 ms al crear la escena (con la CPU 4× más lenta) y nada por fotograma si están quietos.',
   'CLAUDE.md y el banco.',
   '0 nodos.',
   'El tope es lo que ha mantenido la escena rápida en cada ronda. Subirlo es fácil; bajarlo después, no.',
   'No lo recomiendo: con la 125 a la 128 hay sitio de sobra sin tocarlo.', badges=[REGLA4])

# ================================================================ Campamento 40 · El día entero del pueblo
nv(136, 'La tortillera del mediodía', 'si', 'S', HOY,
   'De 11:30 a 12:30, una osa echa tortillas en su comal, con su brasa debajo, y un vecino espera las suyas.',
   'En la calle, donde de noche se pone la pupusera. Todos los días.',
   '0 nodos (medido con el prototipo: los vecinos siguen en sus trazos). Un turno nuevo.',
   'Que no se confunda con la pupusera: comal redondo sobre hornilla de barro y de día.',
   'El mediodía hoy es «casi nadie». Las tortillas del almuerzo son tan de aquí como las pupusas de la noche.', imgs=['v4-mediodia'], poses=['tortillera'], badges=[QUIETO4])
nv(137, 'La salida de la escuela', 'si', 'S', HOY,
   'Entre semana, de 12:00 a 12:30, los oseznos cruzan la plaza con su bolsón. En vacaciones (15 de noviembre a 15 de enero) no hay escuela, como ya sabe el pueblo.',
   'La plaza y la calle. De lunes a viernes.',
   '0 nodos.',
   'El bolsón a 390 px es un cuadrito de 2 px: se entiende por la hora y porque van todos juntos.',
   'Por la mañana «están en la escuela» y no se ven; falta el momento en que salen.', imgs=['v4-mediodia'], poses=['oseznoBolson'], badges=[QUIETO4])
nv(138, 'La siesta en hamaca', 'si', 'S', HOY,
   'De 12:30 a 14:00, el de la siesta ya no duerme sentado en la banca: está en su hamaca, bajo el árbol de la plaza, con el sombrero en la cara.',
   'Bajo el árbol de la plaza. Todos los días; quieta (mecerse es la 199).',
   '0 nodos: la hamaca y sus postes van en los trazos de la ropa y de lo oscuro.',
   'Que los postes no pisen al perro echado ni a las gallinas: su sitio se comprueba como el de cualquier vecino.',
   'Una hamaca dice «mediodía en El Salvador» sin una palabra.', imgs=['v4-hamaca'], poses=['hamaca'], badges=[QUIETO4])
nv(139, 'La fresca: las sillas en la acera', 'si', 'S', HOY,
   'De 20:00 a 22:00, cuando la pupusera recoge, los vecinos sacan su silla a la acera y platican. Los oseznos ya están adentro.',
   'La calle y los corredores. Todos los días.',
   '0 nodos. Un turno nuevo entre «pupusas» y «duerme».',
   'De noche los osos se ven más apagados (así está hecho): que al menos uno quede junto a un farol.',
   'Hoy de 17:45 a 22:00 el pueblo es una sola estampa. Sacar la silla a tomar el fresco es de todos los pueblos de aquí.', imgs=['v4-fresca', 'v4-fresca-e'], poses=['sentado'], badges=[QUIETO4])
nv(140, 'Antes del alba', 'si', 'S', HOY,
   'A las 4:30 el pueblo ya no está vacío: el panadero carga su canasto. A las 5:00 se suma el gallo y los demás, como hoy.',
   'La calle. Todos los días, de 4:30 a 5:00.',
   '0 nodos. El gallo es la 172.',
   'Es dentro del velo de madrugada: casi no se verá. Vale por quien abre la app a esa hora.',
   'El pan sale antes que el sol. Cuesta una línea.', imgs=['v4-alba'], badges=[QUIETO4])
nv(141, 'El pueblo nunca está igual: variedad de un día a otro', 'si', 'M', HOY,
   'Cada turno tiene dos o tres repartos parecidos y el día elige uno: hoy la vendedora está en el atrio y mañana en la plaza; un día la abuela tiene visita. Lo decide la fecha, igual para toda la familia.',
   'Todos los turnos.',
   '0 nodos.',
   'Privacidad: la semilla es solo la fecha, nunca la cuenta ni las compras. Y que las pruebas fijen el día.',
   'Es la idea que más vida da por menos: sin ella, a la semana ya se vio todo.', badges=[QUIETO4])
nv(142, 'Fin de semana de pupusas', 'si', 'S', HOY,
   'Viernes, sábado y domingo por la noche hay más fila donde la pupusera (hasta ocho osos); entre semana, dos o tres.',
   'El turno de pupusas.',
   '0 nodos.',
   'Ninguno.',
   'Cuesta una línea y distingue un martes de un sábado.', badges=[QUIETO4])
nv(143, 'Lunes y jueves, ropa tendida', 'si', 'S', HOY,
   'Dos días a la semana hay un tendedero con ropa de colores y una sábana. En la época lluviosa se recoge a la una, antes del aguacero.',
   'Delante de una casa con corredor, de 8:00 a 16:00.',
   '0 nodos: va en los trazos de la ropa.',
   'En el teléfono la calle es estrecha: si el tendedero no cabe sin tapar a nadie, ese día no sale.',
   'Recogerla antes de la lluvia es un detalle que solo nota quien es de aquí.', imgs=['v4-lavar'], poses=['tendedero'], badges=[QUIETO4])
nv(144, 'La que baja del cantón', 'si', 'M', HOY,
   'Una vendedora baja por el camino real de 5:30 a 7:00 y vuelve a subir de 16:00 a 17:30. No camina: cada vez que abres está un poco más allá, según la hora.',
   'El camino real del valle.',
   '0 nodos y 0 animaciones: es un vecino más cuya posición sale de la hora.',
   'El camino pasa cerca del sendero en algunas formas: guarda los mismos 13 px que todo lo demás, o no sale.',
   'Da la sensación de que el valle siguió andando mientras no mirabas, sin mover nada.', badges=[QUIETO4])
nv(145, 'El perro tiene su día', 'si', 'S', HOY,
   'El perro echado cambia de sitio con el turno: al sol por la mañana, junto a los oseznos por la tarde, al lado de la pupusera por la noche, esperando.',
   'La plaza y la calle.',
   '0 nodos. Su cruce de las 14:00 no cambia.',
   'Donde se echa, nadie se para: ya hay una comprobación para eso.',
   'Todo pueblo tiene un perro que es de todos.', badges=[QUIETO4])
nv(146, 'Las sombras del pueblo siguen al sol', 'si', 'M', HOY,
   'Las sombras de las casas y de la iglesia son largas al amanecer y al atardecer y cortas al mediodía. Hoy miden siempre lo mismo.',
   'El pueblo. Cambian con el turno, no cada minuto.',
   '0 nodos: son los dos trazos de sombra que ya existen.',
   'No son las «sombras de nube» descartadas: es la sombra propia de las casas. Que una sombra larga no tape la plaza.',
   'Es lo que más dice «qué hora es» en un paisaje, y hoy no lo dice.', badges=[QUIETO4])
nv(147, 'Las luces se encienden una a una', 'si', 'S', HOY,
   'Al anochecer se encienden primero los faroles, luego la iglesia y después las ventanas; y de 21:00 a 23:00 se van apagando.',
   'El pueblo, de 17:45 a 18:30 y de 21:00 a 23:00.',
   '0 nodos: solo cambia a qué hora se enseña cada luz.',
   'Las ventanas son una por persona: el número final no cambia y el orden no dice de quién es cada una.',
   'Hoy todo se enciende de golpe.', badges=[QUIETO4])
nv(148, 'La descripción cuenta el turno', 'si', 'S', HOY,
   'Para lectores de pantalla, la descripción de la montaña dice qué pasa en el pueblo: «En el pueblo es hora de pupusas», «Hoy hay piñata en la plaza».',
   'lib.js: textoValle.',
   '0 nodos.',
   'Sin tutear y sin nombres, como la frase de los osos. Una frase, no una lista.',
   'Si el pueblo tiene vida, que la tenga también para quien no lo ve.')

# ================================================================ Campamento 41 · El año del pueblo
nv(149, 'Domingo de Ramos', 'si', 'S', HOY,
   'El domingo antes de la Pascua, los vecinos van a misa con su palma.',
   'El atrio y la calle, de 7:30 a 10:00.',
   '0 nodos. Necesita la fecha de la Pascua: una función pura con su prueba (sirve también para la 150 y la 151).',
   'Sin alfombras ni procesión. Si la misa del domingo te sonó bien, esto es lo mismo con una palma.',
   'Semana Santa sin lo descartado: lo que se ve en cualquier pueblo ese domingo.', imgs=['v4-ramos'], poses=['ramos'], badges=[QUIETO4])
nv(150, 'Jueves y Viernes Santo: el pueblo en silencio', 'despues', 'S', HOY,
   'Esos dos días nadie juega en la plaza ni barre: pocos vecinos, de espaldas, frente a la iglesia, y un paño morado en la puerta.',
   'El pueblo, todo el día.',
   '+1 nodo esos dos días (el morado es un tono nuevo).',
   'Es un día de recogimiento: un peluche en un día así puede caer bien o mal según la familia.',
   'Después: es la única fecha en la que el pueblo se pondría serio. Dímelo tú.', otros='+1 (dos días)', badges=[QUIETO4, DUDOSO4])
nv(151, 'Sábado de Gloria: al lago', 'si', 'S', HOY,
   'Media plaza se fue de vacaciones: pocos vecinos en el pueblo y los oseznos van hacia el lago con su llanta inflada.',
   'La plaza, el Sábado de Gloria y el Domingo de Pascua.',
   '0 nodos.',
   'La llanta negra sobre un oso blanco se lee bien; el oso, menos. Bañistas en la orilla, solo en pantallas anchas (206).',
   'La Semana Santa de aquí también es playa, lago y llanta.', imgs=['v4-gloria'], poses=['oseznoLlanta'], badges=[QUIETO4])
nv(152, 'Temporada de mangos', 'si', 'S', HOY,
   'En marzo y abril, un osezno baja mangos con una vara larga y la vendedora lleva el canasto lleno.',
   'Bajo el árbol de la plaza, por la mañana.',
   '0 nodos.',
   'La vara es alta: se comprueba que no salga del pueblo hacia el sendero.',
   'El verano de aquí sabe a mango verde con alguashte.', imgs=['v4-mangos'], poses=['oseznoVara'], badges=[QUIETO4])
nv(153, '10 de mayo', 'si', 'S', HOY,
   'El Día de la Madre, los oseznos van por la calle con una flor en la mano.',
   'La plaza y la calle, todo el día.',
   '0 nodos.',
   'No dice nada de la familia: es el pueblo. Tampoco se ve distinto en la entrada.',
   'Aquí es el día más grande del año después de la Navidad.', poses=['oseznoFlor'], badges=[QUIETO4])
nv(154, 'La milpa con su gente', 'si', 'M', HOY,
   'Cuando la milpa cambia de etapa hay alguien trabajándola: en mayo siembran con chuzo, a mediados de agosto la doblan y en noviembre tapiscan con su matate. Por la mañana.',
   'La milpa del valle, de 6:00 a 10:00, las dos primeras semanas de cada etapa.',
   '0 nodos (van en los trazos de los vecinos).',
   'Donde la milpa no cabe (1440×900) no sale nadie. Nunca más de ocho figuras en total, contando el pueblo.',
   'La milpa ya crece sola; falta quien la siembra.', poses=['chuzo', 'matate'], badges=[QUIETO4])
nv(155, 'La atolada', 'si', 'S', HOY,
   'Los sábados de julio y agosto, cuando hay elote, una olla grande de atol con su fuego, vecinos con su huacal y oseznos con elote.',
   'La calle, de 16:00 a 18:00.',
   '0 nodos.',
   'La brasa ya existe (es la de la pupusera): no hay humo nuevo.',
   'Sigue a la milpa: cuando jilotea, hay atol.', imgs=['v4-atolada'], poses=['olla', 'huacal'], badges=[QUIETO4])
nv(156, '5 y 6 de agosto: el pueblo estrena', 'si', 'S', HOY,
   'Las fiestas del Divino Salvador, sin rueda: más gente en la plaza ya embanderada, oseznos con su elote loco y la vendedora de dulces.',
   'La plaza, de 16:00 a 22:00.',
   '0 nodos.',
   'Nada que gire ni que se parezca a una feria: solo la gente. La rueda sigue descartada.',
   'Las banderas de agosto ya se ponen; falta que alguien las celebre.', poses=['oseznoElote'], badges=[QUIETO4])
nv(157, '14 de septiembre: la antorcha y los farolitos', 'si', 'S', HOY,
   'La víspera de la Independencia: por la tarde llega un vecino con la antorcha y, al anochecer, los oseznos salen con su farolito encendido.',
   'La calle y la plaza, de 16:00 a 20:00.',
   '0 nodos (la luz va en el trazo de la brasa). Quietos.',
   'Nadie marcha ni corre. Sin escudos ni letras.',
   'El desfile del 15 ya está; la noche de farolitos es la parte que recuerdan los niños.', imgs=['v4-farolitos', 'v4-farolitos-e'], poses=['oseznoFarol', 'antorcha'], badges=[QUIETO4])
nv(158, '1 de octubre: la piñata', 'si', 'S', HOY,
   'El Día del Niño, una piñata colgada en la plaza, un osezno vendado con su palo y los demás alrededor.',
   'La plaza, de 15:00 a 17:00.',
   '0 nodos. Quieta.',
   'En el v3 descarté una piñata por los cumpleaños de la familia (diría que alguien cumple). Esta es de una fecha pública: no dice nada de nadie.',
   'Es la estampa más alegre de todas las maquetas.', imgs=['v4-pinata'], poses=['_pinata'], badges=[QUIETO4])
nv(159, '1 y 2 de noviembre: flores', 'si', 'S', HOY,
   'Vecinos con flores y coronas de papel de colores de camino a enflorar, y al anochecer del 2, una velita en cada corredor.',
   'La calle y los corredores, los dos días.',
   '0 nodos. Las velitas van en el trazo de la brasa.',
   'En el v3 lo dejé fuera: es un día de duelo para muchas familias. Lo reabro porque lo pediste. Sin cementerio, sin cruces y sin luto: flores y color, como se vive aquí.',
   'Con cuidado, es una fecha de cariño. Si a la familia le cae mal, se quita con una línea.', imgs=['v4-difuntos'], poses=['flores', 'corona'], badges=[QUIETO4, DUDOSO4])
nv(160, '12 de diciembre: los inditos', 'si', 'S', HOY,
   'El día de la Virgen de Guadalupe, los oseznos van a la iglesia vestidos de inditos: sombrerito, cotón de manta y pañuelo rojo.',
   'El atrio, por la mañana.',
   '0 nodos.',
   'Es una fecha religiosa, como la misa: si esa te gustó, esta es la versión con niños.',
   'No hay foto más salvadoreña de diciembre.', imgs=['v4-inditos'], poses=['oseznoIndito'], badges=[QUIETO4, DUDOSO4])
nv(161, 'Las posadas', 'si', 'S', HOY,
   'Del 16 al 23 de diciembre, al anochecer, un grupito con farolitos está frente a una casa. Cada noche, una casa distinta.',
   'La calle, de 18:30 a 20:00.',
   '0 nodos. Diciembre es el mes más cargado, pero esto es otro reparto.',
   'El nacimiento no se toca. Quietos: no hay procesión.',
   'El turno de diciembre ya se llama «posada»; falta la posada.', badges=[QUIETO4])
nv(162, 'El abrazo de medianoche', 'si', 'S', HOY,
   'El 31, de 0:00 a 0:30, los vecinos se abrazan de dos en dos, con los cohetes de siempre en el cielo.',
   'La calle y el atrio.',
   '0 nodos.',
   'Dura media hora al año: casi nadie lo verá, y por eso mismo.',
   'Quien abra la app a esa hora merece un abrazo.', imgs=['v4-abrazo'], poses=['abrazo'], badges=[QUIETO4])
nv(163, 'Domingo por la tarde: la mejenga', 'si', 'S', HOY,
   'Los domingos, dos porterías de palo en la plaza y los oseznos jugando con algún vecino. La pelota que bota es la de siempre.',
   'La plaza, de 15:00 a 16:30.',
   '0 nodos.',
   'Las porterías blancas se leen poco sobre la plaza clara de día.',
   'El domingo ya tiene su misa; le falta su partido.', imgs=['v4-mejenga'], badges=[QUIETO4])
nv(164, 'Luna llena: noche de plaza', 'si', 'S', HOY,
   'Las noches de luna llena, los oseznos se quedan jugando en la plaza hasta las 20:30 y hay vecinos fuera, mirando hacia la luna.',
   'La plaza, las dos o tres noches de luna llena de cada mes.',
   '0 nodos.',
   'Ninguno.',
   'La escena ya sabe cuándo hay luna llena: que el pueblo también.', badges=[QUIETO4])

# ================================================================ Campamento 42 · Lluvia y verano
nv(165, 'Tardes de lluvia: paraguas y hoja de huerta', 'si', 'S', HOY,
   'En las tardes de la época lluviosa, los vecinos salen con paraguas, uno se tapa con una hoja de huerta y los oseznos se quedan bajo el corredor.',
   'El pueblo, de mayo a octubre, de 14:00 a 17:45.',
   '0 nodos.',
   'Es lluvia de calendario (la misma regla de la llovizna de hoy), no el clima real. Con la canícula (167), esas tardes no hay paraguas.',
   'Hoy llueve sobre el volcán y en el pueblo nadie se entera.', imgs=['v4-lluvia', 'v4-lluvia-e'], poses=['paraguas', 'hojaHuerta'], badges=[QUIETO4])
nv(166, 'Después del aguacero: charcos', 'si', 'S', HOY,
   'Al escampar, de 17:45 a 18:30, dos oseznos saltan en los charcos de la plaza.',
   'La plaza, en la época lluviosa.',
   '+1 nodo en la lluviosa (los charcos); 0 en diciembre.',
   'Quietos: el salto es la pose, no una animación.',
   'Es lo primero que hace un niño cuando deja de llover.', otros='+1 (lluviosa)', poses=['oseznoSalta'], badges=[QUIETO4])
nv(167, 'La canícula', 'si', 'S', HOY,
   'Del 15 de julio al 15 de agosto las tardes no traen llovizna: cielo abierto y el pueblo en su tarde de siempre.',
   'El cielo y el pueblo.',
   '0 nodos (esos días se podan las 20 gotas).',
   'La canícula de verdad cambia cada año; estas fechas son aproximadas y fijas.',
   'Es parte del invierno de aquí y cuesta una línea.', badges=[QUIETO4])
nv(168, 'El nubarrón de la tarde', 'si', 'S', HOY,
   'En la lluviosa, desde el mediodía, un cúmulo crece detrás de los volcanes hasta la hora de la lluvia.',
   'La sierra lejana, de 12:00 a 15:00.',
   '+2 nodos en la lluviosa. Crece a saltos con la hora, sin animación.',
   'Que no tape los volcanes ni se parezca a una erupción (el Izalco humeante está descartado): es blanco y está detrás.',
   'El cielo de aquí avisa la lluvia tres horas antes.', otros='+2 (lluviosa)', badges=[QUIETO4])
nv(169, 'El cielo de cada mes', 'si', 'M', HOY,
   'Los celajes rojos de noviembre y diciembre, el azul limpio de enero y la calima de marzo y abril, con el humo lejano de las rozas en las lomas.',
   'El cielo y la sierra lejana.',
   'Los colores, 0 nodos (son variables). El humo de las rozas, +2 nodos solo en marzo y abril, quieto.',
   'Los colores del cielo son lo más afinado de la app: cambios de un 5 a un 10 %, con capturas de cada mes al lado de las de hoy.',
   'Hoy el cielo cambia con la hora pero un atardecer de abril es igual a uno de diciembre.', otros='+2 (marzo y abril)', badges=[QUIETO4])
nv(170, 'Más meses en flor', 'si', 'S', HOY,
   'El maquilishuat de febrero y el árbol de fuego de abril ya están. Se suman el cortez amarillo en marzo y las pascuas rojas en los corredores en diciembre.',
   'El árbol de la plaza y los corredores.',
   'El cortez, 0 nodos (el mismo árbol, otro color). Las pascuas, 0 (van en el trazo de la ropa roja).',
   'No es la «orilla florida» descartada: son los mismos árboles de hoy en otro mes.',
   'Dos meses más con un color que no estaba.', badges=[QUIETO4])
nv(171, 'El cerco de la luna', 'si', 'S', HOY,
   'En las noches de la época lluviosa con la luna crecida, un cerco pálido alrededor, de los que se toman por anuncio de lluvia.',
   'La luna, de mayo a octubre.',
   '0 nodos: es el halo que ya tiene, más abierto.',
   'Lo del cerco y la lluvia lo sé de oídas: confírmame que en tu casa se dice.',
   'Una creencia del campo, dibujada.', badges=[QUIETO4])

# ================================================================ Campamento 43 · Animales de aquí
nv(172, 'El gallo al alba y los zanates al atardecer', 'si', 'S', HOY,
   'De 5:00 a 6:00 hay un gallo en la plaza. De 17:30 a 18:30, tres zanates en fila en el suelo de la plaza.',
   'La plaza.',
   '0 nodos: van en el trazo oscuro de los vecinos.',
   'Quietos y mudos. No se posan en la torre ni en un tejado alto: nada contra el cielo.',
   'El zanate es el pájaro de todos los parques de aquí.', poses=['gallo', 'zanates'], badges=[QUIETO4])
nv(173, 'El tecolote', 'si', 'S', HOY,
   'De 22:00 a 4:30, cuando el pueblo duerme, un tecolote en la rama baja del árbol de la plaza, con sus dos ojos encendidos.',
   'El árbol de la plaza.',
   '0 nodos. No parpadea: sería otra animación de noche.',
   'En algunos lugares el tecolote es de mal agüero. Si a la familia no le gusta, se quita solo.',
   'De noche el pueblo queda vacío; que al menos alguien vele.', poses=['tecolote'], badges=[QUIETO4])
reex(54, 'si', HOY, 'Antes «después»: ahora cabe sin costo, porque va en los trazos de los vecinos (0 nodos, medido). De 11:00 a 14:00 en la época seca, uno o dos garrobos al sol.', imgs=['v4-mangos'], costo='0 nodos.')
nv(174, 'Las vacas van y vuelven', 'si', 'S', HOY,
   'Las vacas del potrero cambian con la hora: de pie por la mañana, echadas a la sombra al mediodía y juntas camino del corral al atardecer.',
   'El potrero junto al lago.',
   '0 nodos: las dos poses ya existen.',
   'Su sitio se comprobó contra el sendero y el lago: los sitios nuevos pasan la misma prueba.',
   'Hoy están siempre igual.', badges=[QUIETO4])
nv(175, 'La garza y el cayuco tienen horario', 'si', 'S', HOY,
   'La garza pesca en una orilla por la mañana y en la otra por la tarde. El cayuco sale al centro del lago al amanecer y de día descansa en la orilla.',
   'El lago.',
   '0 nodos.',
   'De noche el cayuco sigue siendo solo su lámpara y su reflejo.',
   'El lago es lo más quieto de la escena.', badges=[QUIETO4])
nv(176, 'La cresta roja y los pollitos de mayo', 'si', 'S', HOY,
   'Las gallinas llevan su cresta roja (hoy son siluetas) y, en mayo y junio, tres pollitos detrás.',
   'La plaza.',
   '+1 nodo todo el año (la cresta) y +1 en mayo y junio (los pollitos).',
   'Las gallinas viven en tres capas chicas cuando picotean: la cresta va con cada una.',
   'Quedó anotado en el pulido integral: con la cresta se leen mejor a 390 px.', nb=1, otros='+1 a +2', badges=[QUIETO4])
nv(177, 'El torogoz se posa', 'si', 'S', HOY,
   'Fuera de su vuelo del amanecer, el torogoz se queda posado en una rama del árbol del primer día, con su cola de raquetas colgando.',
   'El árbol del primer día, de 7:00 a 17:00.',
   '0 nodos: es el mismo dibujo, quieto y en otro sitio.',
   'Hoy vive en la capa del cielo; posado va con el árbol. No se mueve: no ocupa franja.',
   'Es el ave nacional y solo se ve dos horas al día.', badges=[QUIETO4])
nv(178, 'El venado al borde del bosque', 'si', 'S', HOY,
   'De 5:00 a 6:30, un venado cola blanca al borde del bosque. Solo en pantallas anchas.',
   'El bosque, desde 1440 px.',
   '0 nodos en el teléfono; +1 en escritorio.',
   'En el teléfono no hay dónde ponerlo sin tocar el sendero.',
   'Para quien mira la tele de la sala de madrugada.', badges=[QUIETO4, ANCHO])

# ================================================================ Campamento 44 · La luna y las estrellas
nv(179, 'El conejo en la luna', 'si', 'S', HOY,
   'En luna llena, los mares de la luna dibujan el conejo de la tradición mesoamericana.',
   'La luna llena.',
   '0 nodos: son los mismos mares, con otra forma esas noches.',
   'Sutil: a 390 px la luna mide unos 30 px. Se nota más en escritorio y en la tele.',
   'Media Mesoamérica ve un conejo ahí.', badges=[QUIETO4])
nv(180, 'Las estrellas de verdad', 'si', 'M', HOY,
   'De las 46 estrellas, unas veinte se colocan como en el cielo de aquí: las Siete Cabritas y Orión de noviembre a marzo, el Alacrán de mayo a agosto.',
   'El cielo de noche.',
   '0 nodos: se recolocan las que ya hay.',
   'Las estrellas usan su propia semilla: la forma de la montaña no se entera. Que ninguna figura quede tapada por la cumbre en el teléfono.',
   'Es el cielo que de verdad se ve desde aquí. Los nombres (Siete Cabritas, Alacrán) confírmamelos: no salen escritos en ningún lado.', badges=[QUIETO4])
nv(181, 'La lluvia de estrellas de diciembre', 'si', 'S', HOY,
   'Las noches del 13 y 14 de diciembre (las Gemínidas), la estrella fugaz que ya existe pasa más seguido, y los osos de la cumbre miran hacia arriba.',
   'El cielo y la cumbre.',
   '0 animaciones nuevas (es la misma fugaz con otro ritmo). La cara «mirando arriba» hoy solo se dibuja si hay aurora: 0 nodos sobre el peor caso medido (que ya la trae); sin aurora, +6 en los osos (de 27 a 33).',
   'Solo esas dos noches. En agosto (las Perseidas) aquí está nublado: no.',
   'Diciembre tiene el cielo más limpio del año.', badges=[QUIETO4])
nv(182, 'El lucero', 'despues', 'M', HOY,
   'Venus como lucero de la tarde o de la mañana, según toque de verdad: una estrella más grande y fija sobre el horizonte.',
   'El cielo, al atardecer o al amanecer.',
   '0 nodos.',
   'Hay que calcular cuándo es de la tarde y cuándo de la mañana (ciclo de 584 días) y probarlo contra fechas conocidas.',
   'Después: bonito, pero es una cuenta astronómica más que mantener.', badges=[QUIETO4])
nv(183, 'La luna roja de los eclipses', 'despues', 'S', HOY,
   'En los eclipses totales de luna que se ven desde aquí, la luna se pone cobriza esa noche.',
   'La luna.',
   '0 nodos: un color.',
   'Las fechas hay que sacarlas de una tabla oficial y escribirlas a mano: desde aquí no puedo verificarlas.',
   'Después: es una noche cada dos o tres años.', badges=[QUIETO4])

# ================================================================ Campamento 45 · Los osos de la cumbre
nv(184, 'Miran el atardecer, de espaldas', 'si', 'S', HOY,
   'De 17:30 a 18:15, los tres se ven de espaldas: están mirando cómo baja el sol.',
   'La cumbre, todos los días.',
   '0 nodos: se esconde la cara. Un salto, no una animación.',
   'Si el sol baja por el otro lado según la pantalla, de espaldas igual se entiende. De espaldas no hay ojos: el gorrito y la bufanda siguen.',
   'El gesto más bonito de esta ronda cuesta cero.', imgs=['c-hoy', 'c-espaldas', 'c-espaldas-e'], badges=[QUIETO4])
nv(185, 'El oso de nieve de diciembre', 'si', 'S', HOY,
   'Del 1 al 24 de diciembre, a un lado de los tres va creciendo un oso de nieve: una bola, dos, las orejas, y el 24 su bufanda roja. El 7 de enero ya no está.',
   'En la nieve, junto a los osos.',
   '+3 nodos en diciembre (fuera del grupo de los osos).',
   'Blanco sobre nieve blanca: se lee por su sombra y su bufanda. Donde los osos no caben o ceden a un rótulo, tampoco sale.',
   'Ellos están en la nieve y nunca han jugado con ella. Y crece con los días, no con las compras.', nb=3, otros='0', imgs=['c-nieve', 'c-nieve-e'], badges=[QUIETO4])
nv(186, 'Regalos el 24 y el 25', 'si', 'S', HOY,
   'Desde la medianoche del 24 y todo el 25, dos regalos junto a los osos.',
   'En la nieve.',
   '+2 nodos desde la medianoche del 24: caen justo en la hora de los cohetes, el pico del año.',
   'Colores que ya existen (el rojo de la cinta, el verde del pueblo).',
   'Aquí los regalos se abren a medianoche.', otros='+2 (25 dic)', nbp=2, imgs=['c-regalos'], badges=[QUIETO4])
nv(187, 'Tres festejos distintos', 'si', 'S', HOY,
   'Al anotar, además del saltito de siempre, a veces levantan los brazos (la pose de estirarse) o miran hacia arriba. Uno de tres, según el día.',
   'La cumbre, al guardar una compra.',
   '0 nodos sobre el peor caso medido: los brazos ya están, y la cara «mirando arriba» también cuando hay aurora (sin aurora, +6 en los osos, de 27 a 33).',
   'Dura lo mismo que el saltito. Nada si no hay compra: la cumbre nunca reclama.',
   'El saltito ya no sorprende.', badges=[('barata', 'Se mueve · al guardar')])
nv(188, 'Saludan cuando «Tú» entra en el último tramo', 'si', 'S', HOY,
   'Cuando «Tú» pasa el último campamento antes de la cima, el grande tiene el brazo levantado: lo está viendo llegar.',
   'La cumbre.',
   '0 nodos: es su brazo de estirarse.',
   'Depende de lo ya alcanzado, que nunca retrocede. No se ve en la entrada (ahí no hay «Tú»).',
   'Es el único gesto que une a los de arriba con el que sube.', badges=[QUIETO4])
reex(24, 'si', HOY, 'Antes «después». Cabe, justo: de 22:00 a 5:00, ojos cerrados y unas zetas, con los osos en 39 de 40 en Nochebuena. Va con la carpa de «Tú» (191): toda la montaña duerme.',
     nb=4, otros='+4', os=4, imgs=['c-duermen'], requiere=[], costo='+4 nodos en los osos (de 35 a 39 en Nochebuena; tope 40).')
reex(26, 'si', HOY, 'Antes «después». Un paraguas celeste clavado en la nieve en las tardes de la lluviosa: va fuera del grupo de los osos, así que no gasta su tope. En diciembre se poda (0 nodos).',
     otros='+3 (lluviosa)', imgs=['c-paraguas'], requiere=[], costo='+3 nodos en la lluviosa; 0 en Nochebuena.')
nv(189, 'Sombrero de palma en marzo y abril', 'si', 'S', HOY,
   'En los dos meses de más sol, el grande lleva sombrero de palma al mediodía.',
   'La cumbre, de 10:00 a 15:00.',
   '+1 nodo en marzo y abril.',
   'El sombrero ensancha la cabeza: se comprueba contra el cielo como el gorrito de cumpleaños.',
   'Un oso polar al sol de abril necesita sombrero.', otros='+1 (marzo y abril; los osos, 38 de 40)', badges=[QUIETO4])
nv(190, 'La banderita del 15 de septiembre', 'si', 'S', HOY,
   'Del 13 al 15 de septiembre, una banderita azul y blanca clavada junto a ellos, como la de las poses de la interfaz.',
   'En la nieve.',
   '+2 nodos esos tres días, clavada en la nieve (fuera del grupo de los osos).',
   'Baja, dentro de la montaña: nada contra el cielo.',
   'Los osos de la interfaz ya la tienen; los de la cumbre, no.', otros='+2 (tres días)', badges=[QUIETO4])
reex(45, 'despues', SITIO, 'Sigue «después»: uno que camina por la nieve necesita su capa y una ruta medida contra rótulos, sendero y cielo en cada tamaño. Es de lo más caro de todo y los gestos de arriba dan más por menos.', requiere=[BANCO])

# ================================================================ Campamento 46 · «Tú» con más gestos
nv(191, '«Tú» acampa de noche', 'si', 'M', HOY,
   'De 22:00 a 5:00, en el sitio de «Tú» hay una carpita naranja con luz dentro y su palito clavado al lado. A las 5:00 vuelve a salir.',
   'El sendero, justo donde va «Tú».',
   '+3 nodos (la carpa); la luz es la linterna que ya lleva de noche.',
   'La carpa cabe en la caja de «Tú» (medido en la maqueta); la altitud sigue siendo el dato. La pisada naranja y el rótulo «Tú» no cambian.',
   'De noche la montaña es de luces: la de «Tú» sería la más tuya.', nb=3, otros='+3', imgs=['t-hoy', 't-carpa', 't-carpa-e'], badges=[QUIETO4])
nv(192, 'Capote amarillo en la lluvia', 'si', 'S', HOY,
   'En las tardes de la época lluviosa, «Tú» sube con capote y capucha amarillos.',
   '«Tú», de mayo a octubre, de 14:00 a 17:45.',
   '+1 nodo en la lluviosa; 0 en diciembre.',
   'El naranja es lo tuyo: el capote es amarillo y la mochila sigue asomando.',
   'Llueve en el valle y «Tú» ni se inmuta.', otros='+1 (lluviosa)', imgs=['t-capote'], badges=[QUIETO4])
nv(193, '«Tú» mira el atardecer', 'si', 'S', HOY,
   'De 17:30 a 18:15, «Tú» también se ve de espaldas, con la mochila al frente: mira el valle desde donde va.',
   '«Tú», todos los días.',
   '0 nodos.',
   'Con la 184, los cuatro osos miran lo mismo a la misma hora.',
   'Para qué se sube una montaña, si no.', imgs=['t-espaldas'], badges=[QUIETO4])
nv(194, 'Se estira con los de la cumbre', 'si', 'S', HOY,
   'De 7:00 a 8:00, cuando los tres de arriba se estiran, «Tú» también levanta los brazos, un momento después.',
   '«Tú», por la mañana.',
   '0 nodos: es su pose de festejar. Solo con efectos «todos».',
   'El mismo reloj y la misma regla que los de la cumbre: a saltos, no una animación corrida.',
   'Los cuatro son de la misma familia.', imgs=['t-estira'], badges=[('barata', 'Se mueve · a saltos')])
reex(40, 'si', HOY, 'Antes «después». Pediste gestos según su avance, y este es exactamente eso: la cuerda desde 1M y el piolet desde 10M. Lo ya alcanzado nunca se pierde.',
     nb=3, otros='+3', imgs=['t-equipo'], costo='+2 a 3 nodos.')
nv(195, 'Los parches de la mochila', 'si', 'S', HOY,
   'Por cada medalla de constancia ya ganada, un parchecito de color cosido en la mochila de «Tú».',
   'La mochila de «Tú».',
   '+1 nodo (todos los parches en un trazo).',
   'Un parche ganado no se quita nunca, aunque la racha se corte. A 390 px son puntitos: se ven mejor en la tele.',
   'Cuenta lo que ya hiciste. Nunca lo que falta.', nb=1, otros='+1', badges=[QUIETO4])
nv(196, 'El día que anotas, descansa', 'si', 'S', HOY,
   'El día que guardas una compra, «Tú» pasa el resto del día sentado con su tecomate en la mano. A medianoche vuelve a su pose de siempre.',
   '«Tú», ese día.',
   '+2 nodos.',
   'Aparece con una compra y se va solo con el día. No hay pose de «hace mucho que no compras»: eso sería presionar. No se ve en la entrada.',
   'El saltito dura un segundo; esto dura el día.', nb=2, otros='+2', badges=[QUIETO4])
nv(197, 'El aniversario del primer día', 'si', 'S', HOY,
   'El día que el libro cumple años, «Tú» lleva una flor de maquilishuat en la mochila.',
   '«Tú», un día al año.',
   '+1 nodo ese día.',
   'No se ve en la entrada. La fecha es la de la primera compra, que ya usa «Tu historia».',
   'El árbol del primer día ya crece con los años; que «Tú» también lo sepa.', otros='+1 (un día)', badges=[QUIETO4])
reex(41, 'despues', HOY, 'Sigue «después»: pararse en cada campamento alarga la subida al abrir, y abrir rápido importa más. 0 nodos.')
nv(198, 'El chucho que lo acompaña', 'despues', 'L', SITIO,
   'Un perrito aguacatero sigue a «Tú» desde el pueblo: se sienta a su lado y, cuando «Tú» acampa, se echa junto a la carpa.',
   'Junto a «Tú», siempre.',
   '+6 nodos y una caja más ancha para «Tú».',
   'Ensanchar la caja de «Tú» mueve rótulos, osos y tarjetas de la tele en todos los tamaños. Es mucho riesgo para un adorno.',
   'Después: me encanta, pero toca lo más delicado de la escena.', nb=6, otros='+6', requiere=[BANCO])

# ================================================================ Campamento 47 · El pueblo se mueve, parte 2
reex(116, 'si', SITIO, 'Quedó «para después» en el 37. Ahora tiene franja: el torogoz vuela de 5:00 a 6:00 y el panadero cruza de 6:00 a 7:00, una pasada cada 40 s, en la capa del vecino que ya existe.',
     franja='6:00–7:00', requiere=[BANCO], costo='0 nodos más (la capa de la 114). El torogoz cede una hora.', extra_badges=[MUEVE4])
nv(199, 'La hamaca se mece', 'si', 'S', SITIO,
   'De 13:00 a 14:00, la hamaca de la siesta (138) se mece despacio, a saltos.',
   'Bajo el árbol de la plaza.',
   '0 nodos: la hamaca pasa a la capa del vecino. Una animación de día, en su capa.',
   'Es la única hora del día sin nada moviéndose; que siga siendo lenta (un vaivén cada 3 s). Los días de azacuanes (del 1 al 20 de abril y del 10 al 31 de octubre) vuelan ellos y la hamaca se queda quieta.',
   'La franja estaba libre y la hamaca la pide.', franja='13:00–14:00', requiere=[BANCO, 138], badges=[MUEVE4])
nv(200, 'La tortillera palmea', 'si', 'S', SITIO,
   'De 11:30 a 12:30, la tortillera (136) palmea: dos poses, un cambio cada medio segundo.',
   'En la calle.',
   '0 nodos (la capa del vecino). En pantallas anchas, la cabina del teleférico se queda quieta esa hora.',
   'El teleférico pierde una de sus tres horas. Es mudo: el palmeo solo se ve. Los días de azacuanes, quieta.',
   'Es el gesto más reconocible de un mediodía de aquí.', franja='11:30–12:30', requiere=[BANCO, 136], badges=[MUEVE4])
reex(25, 'si', SITIO, 'Quedó «para después» en el 32. Muda, como todo: a las 12:00 la campana de la torre se mece un minuto. La tortillera espera ese minuto; los días de azacuanes, la campana no se mece.',
     franja='12:00–12:01', requiere=[BANCO], costo='1 nodo pasa a su capa chica · una animación de un minuto al día.', extra_badges=[MUEVE4])
nv(201, 'Las estrellitas titilan', 'si', 'S', SITIO,
   'En Nochebuena y el 31, de 18:00 a 1:00, las tres estrellitas de los oseznos titilan (hoy están quietas).',
   'La plaza, dos noches al año.',
   '0 nodos y 1 animación de opacidad más, las dos noches con más nodos del año.',
   'Por animaciones cabe hoy (Nochebuena: 98 de 110, y el dibujo grande 42 de 56; diciembre es seco). Va aquí porque se mueve: con el banco delante y tu medida esa noche.',
   'Anotado en el pulido integral. Una estrellita que no chispea no es una estrellita.', requiere=[BANCO], badges=[('mov', 'Se mueve · ambiente')])
nv(202, 'El humo del fogón', 'si', 'S', SITIO,
   'El comal de la tortillera y la plancha de la pupusera echan un hilo de humo.',
   'La calle, de 11:30 a 12:30 y de 17:45 a 20:00.',
   '+2 nodos y 1 animación de ambiente en el dibujo grande, como el humo de la chimenea.',
   'La noche de lluvia el dibujo grande va en 55 animaciones de 56: con el humo quedaría en el tope exacto. Por eso va después de aligerar las luciérnagas (127).',
   'Anotado en el pulido integral. La brasa sin humo se ve apagada.', nb=2, otros='+2', an=1, requiere=[BANCO, 127], badges=[('mov', 'Se mueve · ambiente')])
nv(203, 'El reloj de la torre da la hora', 'si', 'S', SITIO,
   'La torre de la iglesia tiene un reloj con sus dos agujas en la hora de verdad de El Salvador.',
   'La torre, desde 768 px de ancho.',
   '+3 nodos en tablet y escritorio; 0 en el teléfono (ahí el reloj mediría 3 px). Se mueve una vez por minuto.',
   'La iglesia se pulió dos veces: el reloj va dentro de la torre, sin cambiar su forma. Mover la aguja repinta el dibujo grande una vez por minuto.',
   'En la tele de la sala sería el reloj del pueblo.', requiere=[BANCO, ANCHAS], badges=[ANCHO])
reex(118, 'despues', SITIO, 'Sigue «después»: encadenar gestos pide que cada vecino pueda salir a su capa (la 130). Con un gesto por franja, como ahora, el día ya queda lleno.', requiere=[BANCO, 130])
reex(119, 'despues', SITIO, 'Sigue «después», y con aviso: choca con una regla del valle («nada depende de si se compró»). El pueblo además sale en la entrada. Si lo quieres, es cambiar esa regla.',
     requiere=[BANCO], extra_badges=[REGLA4])
nv(204, 'Los vecinos caminan al cambiar de turno', 'despues', 'L', SITIO,
   'En el cambio de turno, los que se quedan caminarían a su sitio nuevo en vez de saltar.',
   'Todo el pueblo, unos segundos, unas diez veces al día.',
   'Hasta ocho figuras moviéndose a la vez, cada una en su capa.',
   'Rompe «uno a la vez» de frente, y casi nadie tendría la app abierta justo en el cambio.',
   'Después: es lo más caro de la ronda para algo que casi nunca se vería.', requiere=[BANCO, 130], badges=[REGLA4])

# ================================================================ Campamento 48 · Cambios grandes al paisaje
nv(205, 'Una plaza de verdad: kiosko y ceiba', 'despues', 'L', SITIO,
   'La plaza de hoy es un llano con un árbol. Un parque de aquí tiene su kiosko, su ceiba y sus bancas; los domingos, la banda (el del bombo ya existe) tocaría en el kiosko.',
   'El pueblo, en todos los tamaños.',
   'Unos +10 nodos.',
   'Cambia la composición que ya se pulió dos veces (34b y 35b), y en el teléfono la plaza mide 80 px: el kiosko le quita sitio a los oseznos.',
   'Después: es el cambio que más carácter daría al pueblo, y el que más reabre. Mejor con los turnos ya puestos, para ver cuánto sitio queda.', nb=10, otros='+10', requiere=[BANCO])
nv(206, 'La orilla del lago, con vida', 'si', 'M', SITIO,
   'En pantallas anchas: el pescador de la orilla con su caña, un oso que lanza la atarraya al amanecer y, en Semana Santa, bañistas.',
   'El lago, desde 1440 px.',
   'Unos +8 nodos, solo en escritorio y tele. 0 en el teléfono.',
   'En el teléfono no guarda los 13 px del sendero: por eso es solo ancho.',
   'Es lo que quedó de la 120. En escritorio hay sitio y el lago está vacío.', requiere=[BANCO, ANCHAS], badges=[QUIETO4, ANCHO])
nv(207, 'El valle por encima del velo', 'despues', 'L', SITIO,
   'En el teléfono acostado y a 320 px, al abrir, el borde de abajo del pueblo queda tapado por el velo del pie y por «Anotar». Subir el valle 70 a 90 px en esas formas.',
   'El valle a 844×390 y a 320×568.',
   '0 nodos.',
   'Cambia la composición del 22C y sus pruebas en esas dos formas. Al deslizar 200 px ya se ve todo.',
   'Después: quedó avisado en el pulido integral «solo con tu visto bueno». Si usas mucho el teléfono acostado, márcala.', requiere=[BANCO], badges=[REGLA4])
nv(208, 'El cantón de la loma, con su gente', 'despues', 'M', SITIO,
   'Los ranchos de la loma tendrían su propia vida: alguien en la puerta, un leñador que baja con su tercio de leña al atardecer.',
   'La loma, desde 1440 px.',
   '0 nodos (van en los trazos de los vecinos), pero a esa distancia miden 5 px.',
   'A 5 px un oso es una mancha blanca.',
   'Después: el pueblo se lee; el cantón, no. La 144 ya hace que alguien baje de allá.', requiere=[BANCO, ANCHAS], badges=[ANCHO])
reex(123, 'despues', SITIO, 'Sigue «después»: sin una tele delante no se puede juzgar. Si se hace la 131, al menos habrá un tope medido para ella.', requiere=[BANCO, ANCHAS])
nv(209, 'Un muelle en pantallas muy anchas', 'despues', 'L', SITIO,
   'Desde 1920 px, el lago tendría un muellecito con dos cayucos amarrados.',
   'El lago, en la tele y monitores grandes.',
   'Unos +12 nodos, solo ahí.',
   'A 2560 px la escena ya pasa de 1100 nodos en Nochebuena (1105).',
   'Después: primero el presupuesto ancho (131), luego se ve.', requiere=[BANCO, ANCHAS], badges=[ANCHO])

# ================================================================ lo que sigue para después, de antes
_NOTAS = {
    22: 'Sigue «después». La 127 ataca lo mismo por otro lado (menos piezas en vez de otra capa).',
    27: 'Sigue «después»: «Qué hay de nuevo» va justo de alto en 360×640.',
    28: 'Sigue «después».', 29: 'Sigue «después».', 30: 'Sigue «después».',
    31: 'Sigue «después». El aniversario en la escena es ahora la 197.',
    32: 'Sigue «después»: solo lo puedes juzgar tú, en tu iPhone.',
    46: 'Sigue «después», y sigo sin recomendarla: el nacimiento no se toca. La 112 (hecha) ya pone osos frente a él.',
    47: 'Sigue «después».',
}
for _n, _t in _NOTAS.items():
    reex(_n, 'despues', HOY if _n not in (22,) else AHORRA, _t)

# ---------------------------------------------------------------- las fiestas de los ositos (cada una, su día entero)
exec((AQUI / 'ideas_fiestas.py').read_text(), globals())
# Los campamentos nuevos, numerados en su orden final (del 39 en adelante).
for _k, _c in enumerate([c for c in CAMPS if not c.get('hecho') and not c.get('opc')]):
    _c['k'] = str(39 + _k)
    _c['camp'] = 'Campamento ' + _c['k'] + (' · Fiestas de los ositos' if _c['id'] in ('cf1', 'cf2') else '')
_K = {c['id']: c['k'] for c in CAMPS}

# ---------------------------------------------------------------- descartes de esta ronda
for _k, (_t, _p) in enumerate(FUERA):
    if _t.startswith('Osos con flores el 2 de noviembre'):
        FUERA[_k] = ('(v3) Osos con flores el 2 de noviembre', 'Reabierto en esta ronda porque lo pediste: es la 159, en versión sobria y marcada para que lo decida la familia.')
    if _t.startswith('Una piñata en la plaza el día de un cumpleaños'):
        FUERA[_k] = (_t, _p + ' La de la 158 es otra cosa: el Día del Niño, una fecha pública.')
FUERA[0:0] = [
    ('Cualquier gesto por NO comprar («Tú» sentado esperando, osos tristes, telarañas, un catalejo para ver cuánto falta)', 'Presiona. Los gestos nuevos salen por la hora, la fecha, una compra recién guardada o algo ya alcanzado; nunca por una ausencia.'),
    ('Días grises o temporales por sorteo', 'O es el clima real (descartado) o es inventarlo. La lluvia sigue siendo de calendario: la época y la hora.'),
    ('Procesiones, el Santo Entierro, un cementerio con cruces', 'Semana Santa y Difuntos, solo desde la gente del pueblo: palmas, flores y silencio. Lo solemne no se dibuja con peluches.'),
    ('El paletero, el sorbetero o cualquier vendedor con carretón', 'Se parece a la carreta descartada, como el de las minutas.'),
    ('Un bus, un pick-up o una moto', 'Vehículos: descartados con la carreta.'),
    ('Una fogata o una piscucha de los osos en la cumbre', 'Brillaría o volaría contra el cielo: nada sobresale.'),
    ('La luz azul de una tele en una ventana', 'Las ventanas son una por persona de la familia: una que parpadea parecería decir algo de alguien.'),
    ('Un pez que salta a la hora de la siesta', 'De 13:00 a 14:00 solo la hamaca. Esa hora quieta es parte del día.'),
    ('La quema del diablo, Halloween, los Reyes Magos', 'No son costumbres de aquí que pueda afirmar.'),
    ('La Selecta o los partidos', 'No hay calendario fijo y sería traer datos de fuera.'),
    ('La chiltota, el colibrí, las chicharras', 'A este tamaño no se leen, y las chicharras son un sonido.'),
    ('Campanas, pregones o gallos que suenen', 'Los sonidos del paisaje están descartados: todo esto es mudo.'),
    ('Que el tecolote parpadee o el gallo aletee', 'Serían animales moviéndose fuera de su turno: quietos.'),
]

# ---------------------------------------------------------------- textos de cabecera
RESUMEN[:] = [
    'Todo lo del v3 que aprobaste está hecho y en producción (campamentos 26 a 38). Aquí van 99 ideas nuevas y 20 de «para después» reexaminadas, en doce campamentos, del 39 al 50.',
    'Las fiestas de los ositos (campamentos 41 y 42): cada fecha dura todo su día, con un guion de turnos de la madrugada a la medianoche y su momento grande. Nochebuena, Navidad, el 31 y el 1, el 6 de enero, Semana Santa, el 10 de mayo, el Día del Padre, agosto, la Independencia, el Día del Niño, Difuntos, el 12 de diciembre y los dos cumpleaños.',
    'Lo mejor es casi gratis: un turno nuevo del pueblo no suma ni un nodo (medido: Nochebuena con su guion entero pesa lo mismo que hoy). Por eso el día normal pasa de seis momentos a doce y cada fiesta tiene siete, sin gastar presupuesto.',
    'El presupuesto de hoy es justo: 1030 nodos de 1100 en Nochebuena y, la noche de lluvia, el dibujo grande en 55 animaciones de 56. «Hacer sitio 2» (39) libera unos 96 nodos en el pico del año y unas 44 animaciones de noche. Están contados sobre la escena de hoy, no implementados.',
    'Los osos de la cumbre y «Tú» ganan gestos según la hora y la fecha: miran el atardecer de espaldas, «Tú» acampa de noche, el oso de nieve crece en diciembre. Ningún gesto aparece por no comprar.',
    'Lo que se mueve de nuevo (panadero, hamaca, tortillera, campana, humo) va después del 39, uno a la vez y con tu medida en el iPhone. Lo ambicioso (kiosko, valle más alto, vecinos que caminan) está, con su costo, en «después».',
    'Marcadas para que las decida la familia: Viernes Santo (150), Difuntos (159), los inditos (160), la misa de gallo (dentro de la 211) y el tecolote (173).',
]
LEADPLAN = ('Cada campamento es un PR aparte con la definición de terminado completa. Del 40 al 48 casi todo cabe en el presupuesto de hoy y no depende del 39; '
            'el 49 y el 50 sí. Si quieres las fiestas de diciembre este año, el 41 puede ir primero: cabe hoy.')
NOTA = ('<b>Lo que necesito de ti:</b> los números que no quieres (o los de «después» que sí), con el texto de la barra de abajo. '
        'Las maquetas del pueblo son un prototipo corriendo en la app de verdad; las de la cumbre y «Tú», retoques sobre la escena real. Nada de esto está en tu app. '
        'Los ahorros del 39 están contados, no implementados. Y lo de siempre: el iPhone, Safari y la tele solo los puedes ver tú.')

# ---------------------------------------------------------------- el presupuesto, los personajes y la agenda
BASE = {'nb': 1030, 'an': 102, 'principal': 55, 'cielo': 42, 'osos': 35, 'ideaTopeOsos': TOPE_OSOS}
V4D = {
    'lead': ('La ronda anterior ya está en tu app. Esta es la siguiente: que el valle, el pueblo, los osos y «Tú» vivan el día, la semana y el año de El Salvador. '
             'Cada idea dice si cabe en el presupuesto de hoy o si pide antes hacer sitio, y la barra de abajo va sumando lo que elijas. '
             'Primero el resumen y el presupuesto; después los dibujos, la agenda y las ideas una por una.'),
    'base': BASE,
    'pres': {
        'lead': ('Medido hoy sobre main con el banco del proyecto (teléfono de 390×664, mil compras). De día sobra sitio. Lo que aprieta es la noche: Nochebuena en nodos y, en animaciones, '
                 'no el total sino cada capa: el banco falla si una sola se pasa.'),
        'semaforo': [
            ('70', 'nodos libres en Nochebuena', 'Escena del teléfono: <b>1030 de 1100</b>. Un día normal, 926 (174 libres).'),
            ('1', 'animación libre en el dibujo grande', 'Noche de lluvia: <b>55 de 56</b> (en total, 102 de 110). En Nochebuena, 42 de 56.'),
            ('2', 'animaciones libres en el cielo', 'Todas las noches: <b>42 de 44</b>. Y en el frente, en Nochebuena, 14 de 16.'),
            ('5', 'nodos libres en los osos', 'Los tres de la cumbre: <b>33 a 35 de 40</b>. El valle, 190 a 221 de 300: no aprieta.'),
        ],
        'bloques': [
            {'t': 'Dónde están los nodos hoy (Nochebuena, 21:00)', 'p': 'Contado por mí en la escena viva, con efectos «esenciales» (mi corte da 1023 en total; el banco, 1030). Lo que propone el 39 está en negrita.',
             'cab': ['Pieza', 'Nodos', 'Se ve', 'Qué propongo'],
             'filas': [['El pueblo y el pie del valle', '125', 'Siempre', 'Nada: aquí va la vida nueva, a 0 nodos'],
                       ['<b>Luciérnagas</b>', '73', 'De noche', '<b>127</b>: unos 36 menos'],
                       ['Campamentos (rótulos, faroles, Navidad)', '65', 'Siempre', 'Nada'],
                       ['El lago (con las monedas)', '64', 'Siempre', 'Nada'],
                       ['El bosque (60 pinos)', '60', 'Siempre', '133, en reserva: unos 58 menos'],
                       ['<b>Estrellas</b>', '46', 'De noche', '<b>126</b>: 42 menos y 32 animaciones menos'],
                       ['<b>Cohetes</b>', '35', '23:50–0:30', '<b>125</b>: 35 menos hasta las 23:40'],
                       ['Los osos de la cumbre', '35', 'Siempre', 'Dormirse (24): +4, hasta 39 de 40'],
                       ['La luna', '29', 'De noche', '<b>128</b>: 8 menos'],
                       ['Papel picado', '28', '20–26 dic', 'Nada'],
                       ['«Tú»', '24', 'Siempre', 'Nada'],
                       ['<b>El reloj de sol</b>', '14', 'De día', '<b>128</b>: 10 menos']]},
            {'t': 'Cómo quedaría', 'p': 'Estimado: lo medido hoy más lo que suma o ahorra cada idea propuesta («sí»). El banco dará la cifra real al implementar.',
             'cab': ['Momento (teléfono)', 'Hoy', 'Solo con lo que «cabe hoy»', 'Con el 39 hecho', 'Con todo lo propuesto', 'Tope'],
             'filas': []},  # se rellena abajo, con las sumas
            {'t': 'En pantallas anchas (hoy nadie lo vigila)', 'p': 'Medido con mil compras. Es la razón de la 131.',
             'cab': ['Ancho', 'Día normal', 'Nochebuena'],
             'filas': [['1440 px', '982', '1089'], ['2560 px', '999', '<b>1105</b>']]},
        ],
    },
    'per': {
        'lead': ('Son personajes de prueba hechos con las mismas piezas del módulo de los vecinos (cuerpo, cabeza, sombrero, canasto): un prototipo sin pulir, no dibujos aparte. '
                 'Sirven para ver si la idea se lee. Todos caben en los trazos que el pueblo ya tiene: por eso no suman nodos.'),
        'nota': 'El mismo pueblo y las mismas casas de hoy: solo cambia quién está. Nadie se mueve en estas estampas. En tu iPhone cada oso mide la cuarta parte que aquí, con el triple de puntos.',
        'lista': [('tortillera', 'La tortillera', 'Idea 136'), ('oseznoBolson', 'Con su bolsón', '137'), ('hamaca', 'La hamaca', '138 y 199'), ('sentado', 'En su silla', '139'),
                  ('tendedero', 'El tendedero', '143'), ('ramos', 'Con su palma', '149'), ('oseznoLlanta', 'Con su llanta', '151'), ('oseznoVara', 'Bajando mangos', '152'),
                  ('oseznoFlor', 'Con una flor', '153'), ('chuzo', 'Sembrando', '154'), ('matate', 'Tapiscando', '154'), ('olla', 'La del atol', '155'),
                  ('huacal', 'Con su huacal', '155'), ('oseznoElote', 'Elote loco', '156'), ('oseznoFarol', 'El farolito', '157 y 161'), ('antorcha', 'La antorcha', '157'),
                  ('_pinata', 'La piñata', '158'), ('flores', 'Con flores', '159'), ('corona', 'Corona de papel', '159'), ('oseznoIndito', 'De indito', '160'),
                  ('abrazo', 'El abrazo', '162'), ('paraguas', 'Con paraguas', '165'), ('hojaHuerta', 'Hoja de huerta', '165'), ('oseznoSalta', 'En el charco', '166'),
                  ('tamales', 'Los tamales', '211'), ('mesa', 'La cena', '211 y 213'), ('brindis', 'El brindis', '211 y 213'), ('regalo', 'Con un regalo', '211'), ('volcancito', 'El volcancito', '211'), ('oseznoJuguete', 'Estrenando', '212'), ('hombros', 'En hombros', '212 y 219'), ('polvora', 'Pólvora quemada', '212 y 214'), ('escalera', 'En la escalera', '215 y 158'), ('guitarra', 'Las mañanitas', '153'),
                  ('gallo', 'El gallo', '172'), ('zanates', 'Los zanates', '172'), ('tecolote', 'El tecolote', '173'), ('garrobo', 'El garrobo', '54')],
        'dia': ['v4-alba', 'v4-mediodia', 'v4-hamaca', 'v4-fresca', 'v4-lavar', 'v4-lluvia', 'v4-ramos', 'v4-gloria', 'v4-mangos', 'v4-atolada', 'v4-farolitos', 'v4-pinata',
                'v4-difuntos', 'v4-inditos', 'v4-abrazo', 'v4-mejenga'],
    },
    'fiestas': FIESTAS,
    'agenda': {
        'lead': ('Lo que ya existe y lo que se propone, juntos. En el valle sigue habiendo una sola cosa en movimiento a la vez: cada gesto nuevo tiene su franja y ninguna se pisa. Los días de azacuanes (del 1 al 20 de abril y del 10 al 31 de octubre) vuelan ellos de 8:00 a 16:00 y todo lo demás de esas horas se queda quieto, como hoy. '
                 'Lo que está en negrita es nuevo.'),
        'dia': {'cab': ['Hora', 'Quién está (quietos)', 'Qué se mueve (uno a la vez)', 'La cumbre y «Tú»'],
                'filas': [
                    ['22:00–4:30', 'Nadie. <b>El tecolote (173)</b>', 'Luciérnagas; relámpagos en la lluviosa', '<b>Duermen (24)</b>; <b>«Tú» en su carpa (191)</b>'],
                    ['4:30–5:00', '<b>El panadero carga (140)</b>', '—', 'Duermen'],
                    ['5:00–6:00', 'El que se estira, la que barre, <b>el gallo (172)</b>, <b>la que baja del cantón (144)</b>, <b>el venado (178)</b>', 'El torogoz', '—'],
                    ['6:00–7:00', 'Lo mismo', '<b>El panadero cruza (116)</b>', '—'],
                    ['7:00–8:00', 'La mañana (sábado, plaza; domingo, misa)', 'La que barre', 'Se estiran; <b>«Tú» también (194)</b>'],
                    ['8:00–10:00', 'Lo mismo; <b>ropa tendida lunes y jueves (143)</b>; <b>la milpa con su gente (154)</b>', 'Las gallinas (zompopos y azacuanes, sus días)', '—'],
                    ['10:00–11:30', 'Lo mismo', 'El teleférico (solo desde 1100 px)', '<b>Sombrero en marzo y abril (189)</b>'],
                    ['11:30–12:30', '<b>La tortillera (136)</b>; <b>la salida de la escuela (137)</b>; <b>garrobos (54)</b>', '<b>La tortillera palmea (200)</b>; a las 12:00, <b>la campana (25)</b>', '—'],
                    ['12:30–13:00', '<b>La hamaca (138)</b>', 'El teleférico', '—'],
                    ['13:00–14:00', 'La siesta', '<b>La hamaca se mece (199)</b>', '—'],
                    ['14:00–15:00', 'La tarde: oseznos, abuela. <b>Con lluvia, paraguas (165)</b>', 'El perro cruza', '<b>Paraguas (26) y capote (192)</b> en la lluviosa'],
                    ['15:00–16:30', 'Lo mismo; <b>domingo, la mejenga (163)</b>', 'La pelota', '—'],
                    ['16:30–17:45', 'Lo mismo; <b>la del cantón vuelve (144)</b>', 'Los pericos', '<b>De espaldas desde las 17:30 (184, 193)</b>'],
                    ['17:45–20:00', 'Pupusas (<b>más fila el fin de semana, 142</b>); <b>charcos (166)</b>; <b>zanates (172)</b>; <b>luces una a una (147)</b>', 'Luciérnagas; <b>humo del fogón (202)</b>', 'De espaldas hasta las 18:15'],
                    ['20:00–22:00', '<b>La fresca (139)</b>; <b>luna llena, plaza (164)</b>', 'Luciérnagas', '—'],
                ]},
        'anio': {'cab': ['Cuándo', 'Ya está', 'Se propone'],
                 'filas': [
                     ['<b>Días de fiesta</b>', 'Nochebuena y el 31 desde las 18:00; el desfile del 15 de septiembre; el 3 de mayo', '<b>Cada fiesta, su día entero con guion propio</b>: ver «Fiestas de los ositos» (campamentos 41 y 42)'],
                     ['Enero', 'Navidad hasta el 6; vacaciones hasta el 15', '<b>El abrazo del 1 (162)</b>; cielo limpio (169)'],
                     ['Febrero', 'El maquilishuat en flor', '—'],
                     ['Marzo', '—', '<b>Mangos (152)</b>; cortez amarillo (170); calima y rozas (169); sombrero (189)'],
                     ['Semana Santa', '—', '<b>Ramos (149)</b>; Jueves y Viernes Santo (150, después); <b>Sábado de Gloria (151)</b>'],
                     ['Abril', 'El árbol de fuego; azacuanes del 1 al 20', 'Lo de marzo'],
                     ['Mayo', 'La siembra; el 3, la cruz; zompopos del 15 al 21; empieza la lluvia', '<b>El 10, flores (153)</b>; sembradores (154); pollitos (176); <b>paraguas (165)</b>'],
                     ['Junio', 'Lluvia', 'Paraguas, charcos (166), nubarrón (168), cerco de la luna (171)'],
                     ['Julio', 'La milpa jilotea', '<b>Atolada los sábados (155)</b>; canícula desde el 15 (167)'],
                     ['Agosto', 'Agostinas del 1 al 6; la dobla el 15', '<b>El 5 y el 6, el pueblo estrena (156)</b>; la dobla con su gente (154)'],
                     ['Septiembre', 'Patrias del 13 al 15; el desfile', '<b>El 14, antorcha y farolitos (157)</b>; banderita en la cumbre (190)'],
                     ['Octubre', 'Piscuchas; azacuanes del 10 al 31', '<b>El 1, la piñata (158)</b>'],
                     ['Noviembre', 'La tapisca; piscuchas; vacaciones desde el 15', '<b>El 1 y el 2, flores (159)</b>; tapiscadores (154); celajes (169)'],
                     ['Diciembre', 'Navidad desde el 1; nacimiento; Nochebuena y el 31', '<b>Oso de nieve (185)</b>; <b>el 12, inditos (160)</b>; Gemínidas (181); <b>posadas del 16 al 23 (161)</b>; regalos (186)'],
                     ['Cada semana', 'Sábado de plaza; domingo de misa', '<b>Lunes y jueves, ropa tendida (143)</b>; fin de semana de pupusas (142); <b>domingo, mejenga (163)</b>'],
                     ['Cada mes', 'Las fases de la luna', '<b>Luna llena: el conejo (179) y noche de plaza (164)</b>'],
                 ]},
    },
}

# ---------------------------------------------------------------- las cuentas: «cabe hoy» es acumulado, y con todo lo propuesto tampoco se pasa
_ab = [i for i in I if 'hecho' not in i]
_hechas = {i['n'] for i in I if 'hecho' in i}
for i in _ab:  # lo que una idea abierta necesitaba y ya está hecho, ya no es un requisito
    i['requiere'] = [r for r in i['requiere'] if r not in _hechas]
assert all('cabe' in i for i in _ab), [i['n'] for i in _ab if 'cabe' not in i]
_si = [i for i in _ab if i['rec'] == 'si']
_hoy = [i for i in _si if i['cabe'] == HOY]
_ah = [i for i in _si if i['cabe'] == AHORRA]
S = lambda L, k: sum(i.get(k, 0) for i in L)
CAPA = lambda L, c: sum(i.get('an', 0) for i in L if i.get('capa') == c)
assert S(_hoy, 'nbp') <= 40 and S(_hoy, 'an') == 0 and BASE['osos'] + S(_hoy, 'os') <= 40, (S(_hoy, 'nbp'), S(_hoy, 'an'), S(_hoy, 'os'))
assert BASE['nb'] + S(_si, 'nbp') <= 1100 and BASE['an'] + S(_si, 'an') <= 110 and BASE['osos'] + S(_si, 'os') <= 40
assert BASE['principal'] + CAPA(_si, 'principal') <= 56 and BASE['cielo'] + CAPA(_si, 'cielo') <= 44  # el banco falla por capa
for i in _ab:  # lo que pide hacer sitio lo dice con un requisito, y lo requerido existe y está abierto
    for r in i['requiere']:
        assert any(x['n'] == r and 'hecho' not in x for x in I), (i['n'], r)
    if i['cabe'] == SITIO:
        assert i['requiere'], i['n']
    if i.get('an', 0) > 0:  # nada que sume animaciones de noche al dibujo grande entra sin la 127
        assert 127 in i['requiere'], i['n']
FIESTAS['costo']['filas'] = [
    ['Nochebuena a las 21:00, como está hoy', '972 nodos; los vecinos, 9 trazos'],
    ['Nochebuena con cada uno de los seis turnos del guion', '<b>972 a 973 nodos</b>; los vecinos, 9 a 10 trazos: <b>0 a +1</b>'],
    ['El 25 y el 31, con sus turnos', '971 y 944 a 945: igual que hoy esos días'],
    ['Lo único que suma nodos en las fiestas', 'El oso de nieve (+3, diciembre), los regalos (+2, desde las 0:00 del 25) y el pastel de un cumpleaños (+2 a +3, ese día)'],
    ['El pico del año (24 y 31, de 23:50 a 0:30)', f'Hoy 1030 de 1100 (mil compras). Con lo que cabe hoy, {BASE["nb"] + S(_hoy, "nbp")}; con todo lo propuesto, {BASE["nb"] + S(_si, "nbp")}'],
    ['Animaciones en la noche del 24', 'Hoy 98 de 110 (dibujo grande, 42 de 56). Con la franja de fiesta (210), sin luciérnagas: unas 68, y el dibujo grande en unas 12'],
    ['Cambios de turno ese día', 'Siete repintados del dibujo grande en 24 horas (un día normal, seis)'],
]
V4D['pres']['bloques'][1]['filas'] = [
    ['Nochebuena, 21:00 · nodos', '1030', f'{BASE["nb"] + S(_hoy, "nb")}', f'{BASE["nb"] + S(_ah, "nb")}', f'{BASE["nb"] + S(_si, "nb")}', '1100'],
    ['<b>Nochebuena, 23:50 a 0:30 · nodos (el pico: con cohetes y regalos)</b>', '<b>1030</b>', f'<b>{BASE["nb"] + S(_hoy, "nbp")}</b>', f'<b>{BASE["nb"] + S(_ah, "nbp")}</b>', f'<b>{BASE["nb"] + S(_si, "nbp")}</b>', '1100'],
    ['Día normal · nodos', '926', f'{926 + S(_hoy, "nbp")}', f'{926 + S(_ah, "nbp")}', f'{926 + S(_si, "nbp")}', '1100'],
    ['Noche de lluvia · animaciones en total', '102', f'{BASE["an"] + S(_hoy, "an")}', f'{BASE["an"] + S(_ah, "an")}', f'{BASE["an"] + S(_si, "an")}', '110'],
    ['<b>Noche de lluvia · en el dibujo grande</b>', '<b>55</b>', '<b>55</b>', f'<b>{BASE["principal"] + CAPA(_ah, "principal")}</b>', f'<b>{BASE["principal"] + CAPA(_si, "principal")}</b>', '56'],
    ['Noche · en el cielo', '42', '42', f'{BASE["cielo"] + CAPA(_ah, "cielo")}', f'{BASE["cielo"] + CAPA(_si, "cielo")}', '44'],
    ['Los osos · nodos (Nochebuena)', '35', f'{BASE["osos"] + S(_hoy, "os")}', '35', f'<b>{BASE["osos"] + S(_si, "os")}</b>', '40'],
]
print('v4:', len([i for i in _ab if i['n'] >= 124]), 'nuevas,', len([i for i in _ab if i['n'] < 124]), 'reexaminadas,', len(I) - len(_ab), 'hechas · sí', len(_si), '· caben hoy', len(_hoy),
      '· pico', BASE['nb'] + S(_hoy, 'nbp'), '→', BASE['nb'] + S(_si, 'nbp'), '· 21h', BASE['nb'] + S(_si, 'nb'), '· anim', BASE['an'] + S(_si, 'an'), 'principal', BASE['principal'] + CAPA(_si, 'principal'), 'cielo', BASE['cielo'] + CAPA(_si, 'cielo'), '· osos', BASE['osos'] + S(_si, 'os'))
