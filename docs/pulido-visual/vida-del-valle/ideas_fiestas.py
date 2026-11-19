# «Fiestas de los ositos» (pedido del dueño a media ronda): cada fecha festiva es un DÍA ENTERO con su guion por turnos (de la madrugada
# a la medianoche), no una franja corta. Lo ejecuta ideas_v4.py antes de las cuentas. Reutiliza el sistema de turnos del Pueblo de los
# Osos (35–37): un turno es otro reparto de los mismos trazos, 0 nodos. Maquetas: el prototipo corriendo en la escena de main.
FPIE = 'Prototipo en la escena de main · 390 px, ampliado'


def fimg(k, archivo, alt, pie, **kw):
    vimg(k, archivo, alt, pie + ' · prototipo, 390 px ampliado' if pie else FPIE, **kw)


fimg('f-nb0', 'f-nb0-hoy-tel.png', 'Nochebuena como está hoy, a las 21:00: oseznos con estrellitas, vecinos y el nacimiento.', None)
IMGS['f-nb0']['pie'] = 'HOY · Nochebuena a las 21:00 (ya hecho)'
fimg('f-nb1', 'f-nb1-tel.png', 'Nochebuena al amanecer: el panadero con el canasto lleno, la que barre, el gallo y la primera vendedora.', '24 dic · 5:35')
fimg('f-nb2', 'f-nb2-tel.png', 'Nochebuena por la mañana: dos vendedoras, vecinos con sus compras, uno en una escalera poniendo adornos y oseznos ayudando.', '24 dic · 9:00')
fimg('f-nb3', 'f-nb3-tel.png', 'Nochebuena por la tarde: la olla de los tamales con su fuego, vecinas alrededor, una con un regalo y los oseznos jugando.', '24 dic · 15:00')
fimg('f-nb4', 'f-nb4-tel.png', 'Nochebuena al anochecer: una mesa larga en la calle, dos osos brindando y oseznos con estrellitas.', '24 dic · 19:10')
fimg('f-nb5', 'f-nb5-tel.png', 'Nochebuena de noche: los vecinos de espaldas camino de la iglesia, con el padre a la puerta.', '24 dic · 22:30')
fimg('f-nb6', 'f-nb6-tel.png', 'Medianoche de Nochebuena: abrazos, un regalo, volcancitos encendidos en la plaza y oseznos con los brazos arriba.', '24 dic · 23:57')
vimg('f-nb4-e', 'f-nb4-esc.png', 'La cena de Nochebuena en escritorio.', 'El mismo prototipo a 1440 px · 19:10', ancho=880)
vimg('f-nb6-e', 'f-nb6-esc.png', 'La medianoche de Nochebuena en escritorio.', 'El mismo prototipo a 1440 px · 23:57', ancho=880)
vimg('f-nb6-t', 'f-nb6-tel-entera.png', 'El teléfono entero a medianoche de Nochebuena: los cohetes sobre la montaña y el pueblo celebrando.', '390×844 · tamaño real · 23:57', ancho=520, alto=True)
fimg('f-n25a', 'f-n25a-tel.png', 'El 25 temprano: el pueblo duerme, hay restos de pólvora en la calle y solo una vecina barre.', '25 dic · 7:30')
fimg('f-n25b', 'f-n25b-tel.png', 'El 25 por la mañana: los oseznos estrenan sus carritos en la plaza y los mayores miran sentados.', '25 dic · 10:00')
fimg('f-n25c', 'f-n25c-tel.png', 'El 25 por la tarde: un papá oso con su osezno en hombros, familias de paseo y visita al nacimiento.', '25 dic · 16:00')
fimg('f-n25d', 'f-n25d-tel.png', 'El 25 de noche: las sillas en la acera.', '25 dic · 20:30')
vimg('f-n25b-e', 'f-n25b-esc.png', 'La mañana del 25 en escritorio.', 'El mismo prototipo a 1440 px · 10:00', ancho=880)
fimg('f-31a', 'f-31a-tel.png', 'El 31 por la mañana: dos vecinas barren, ropa tendida y la vendedora.', '31 dic · 9:00')
fimg('f-31b', 'f-31b-tel.png', 'El 31 al anochecer: la mesa de la cena, osos brindando y oseznos con estrellitas.', '31 dic · 19:30')
fimg('f-31c', 'f-31c-tel.png', 'El 31 a las 23:35: todo el pueblo de espaldas, mirando la torre de la iglesia, esperando las doce.', '31 dic · 23:35')
fimg('f-31d', 'f-31d-tel.png', 'Año nuevo, 0:05: abrazos de dos en dos y oseznos con estrellitas.', '1 ene · 0:05')
vimg('f-31c-e', 'f-31c-esc.png', 'La espera de las doce en escritorio.', 'El mismo prototipo a 1440 px · 23:35', ancho=880)
vimg('f-31d-t', 'f-31d-tel-entera.png', 'El teléfono entero pasada la medianoche del 31: cohetes en el cielo y abrazos en el pueblo.', '390×844 · tamaño real · 0:05', ancho=520, alto=True)
fimg('f-1a', 'f-1a-tel.png', 'El 1 de enero por la mañana: pólvora en la calle y una sola vecina barriendo.', '1 ene · 8:30')
fimg('f-madre1', 'f-madre1-tel.png', '10 de mayo al amanecer: un oso con guitarra y dos oseznos con flores frente a una casa.', '10 may · 5:40')
fimg('f-madre2', 'f-madre2-tel.png', '10 de mayo a mediodía: la mesa puesta en la calle, flores y oseznos con su flor.', '10 may · 12:30')
fimg('f-padre', 'f-padre-tel.png', '17 de junio por la tarde: papás oso con su osezno en hombros y jugando pelota.', '17 jun · 16:00')
fimg('f-nino1', 'f-nino1-tel.png', '1 de octubre por la mañana: un vecino en una escalera cuelga la piñata mientras los oseznos miran.', '1 oct · 9:30', bajo=420)
fimg('f-dif2', 'f-dif2-tel.png', '2 de noviembre al anochecer: una velita encendida frente a cada casa.', '2 nov · 18:50', bajo=384)
fimg('f-s14', 'f-s14a-tel.png', '14 de septiembre por la tarde: llega la antorcha y los oseznos ya tienen su farolito.', '14 sep · 16:30')
fimg('f-s15', 'f-s15-hoy-tel.png', 'El desfile del 15 de septiembre, como está hoy.', None)
IMGS['f-s15']['pie'] = 'HOY · 15 de septiembre a las 9:00 (ya hecho)'

# ---------------------------------------------------------------- los campamentos de fiestas (van tras el 40) y el del año, sin las fechas
_c41 = next(c for c in CAMPS if c['id'] == 'c41')
_c41.update({'t': 'Las temporadas del pueblo', 'ids': [152, 154, 155, 161, 163, 164],
             'orden': 'Lo que no es un día sino una temporada o una costumbre: los mangos, la milpa con su gente, la atolada, las posadas, la mejenga del domingo y la luna llena.',
             'why': 'Entre fiesta y fiesta el año también pasa. Son turnos de calendario, 0 nodos.',
             'riesgo': 'Bajo. A 390 px los detalles chicos (un elote, una vara) apenas se leen: se nota el conjunto.'})
_F1 = {'id': 'cf1', 'k': 'F1', 'camp': 'Fiestas de los ositos', 't': 'La Navidad entera: 24, 25, 31, 1 y 6', 'tipo': 'vida', 'ids': [210, 211, 212, 213, 162, 214, 215, 216, 217, 218],
       'orden': 'Cada fiesta dura todo su día: un guion de siete turnos, de la madrugada a la medianoche, con su momento grande. Nochebuena, Navidad, el 31, el 1 y el 6 de enero.',
       'why': 'Lo que pediste: que los ositos tengan eventos. Hoy Nochebuena es una sola estampa de 18:00 a 1:00; con esto, el pueblo madruga, compra, hace tamales, cena, va a misa y se abraza a las doce. Y los de la cumbre, «Tú» y los animales viven el mismo día.',
       'riesgo': 'Medio, y solo por las fechas: son las noches con más nodos del año. Los turnos no suman nodos (medido); lo que suma son los regalos y el oso de nieve (5 nodos). La franja de fiesta (210) además quita las luciérnagas esas dos noches.',
       'meta': 'Navegador · 1 PR · cabe hoy · pruebas con libro.dia y libro.hora en cada turno · «Qué hay de nuevo» · que esté antes de diciembre'}
_F2 = {'id': 'cf2', 'k': 'F2', 'camp': 'Fiestas de los ositos', 't': 'El resto del año', 'tipo': 'vida', 'ids': [149, 150, 151, 153, 219, 156, 157, 220, 158, 159, 160, 221, 222],
       'orden': 'Semana Santa, el 10 de mayo, el Día del Padre, agosto, la Independencia, el Día del Niño, Difuntos, el 12 de diciembre y los dos cumpleaños. Cada una, su día entero.',
       'why': 'Las fechas de aquí que puedo afirmar, cada una con su guion. Las religiosas y Difuntos van marcadas para que las decida la familia.',
       'riesgo': 'Bajo en rendimiento. Medio en cultura, y en privacidad con los cumpleaños: esos van solo en la cumbre y con «Tú», nunca en el pueblo ni en la entrada.',
       'meta': 'Navegador · 1 o 2 PR · cabe hoy · Semana Santa necesita la fecha de la Pascua (función pura, con su prueba)'}
_i40 = next(k for k, c in enumerate(CAMPS) if c['id'] == 'c40')
CAMPS[_i40 + 1:_i40 + 1] = [_F1, _F2]

FIESTA = ('si', 'Día entero')

# ================================================================ Fiestas · la Navidad entera
nv(210, 'Un día de fiesta es un guion entero (y su franja de movimiento)', 'si', 'M', HOY,
   'El calendario gana «días de fiesta»: ese día los turnos normales se cambian por los de la fiesta, de la madrugada a la medianoche. Y en la franja de lo que se mueve, la noche del 24 y del 31 es de la fiesta: las luciérnagas descansan y se mueve un solo actor por turno.',
   'cielo.js: turno y mueve; arte-vecinos.js: reparto. Lo de otra fecha no se dibuja ese día (ya es así desde el 30).',
   '0 nodos. Esas dos noches, unas 32 animaciones menos en el dibujo grande (las luciérnagas), a cambio de 1 a 3 de la fiesta.',
   'Uno a la vez sigue valiendo: el actor de cada turno está en la tabla de cada fiesta. Los cohetes son ambiente, como hoy. Cada turno de cada fiesta lleva su prueba con libro.dia y libro.hora.',
   'Es la pieza que hace posibles todas las demás fiestas, y de paso alivia las dos noches más pesadas del año.', badges=[FIESTA])
nv(211, 'Nochebuena, el día entero', 'si', 'M', HOY,
   'Siete turnos: el pan de madrugada; las compras de la mañana y los adornos; los tamales de la tarde; la cena en la calle y el brindis; la misa de gallo; y a las doce, abrazos, regalos y volcancitos. Hoy es una sola estampa desde las 18:00.',
   'El pueblo, todo el 24 de diciembre. El guion completo, con su tira de maquetas, está en «Fiestas de los ositos».',
   '0 nodos: medido, el pueblo con el guion puesto pesa lo mismo que hoy. Las estrellitas de los oseznos ya existen.',
   'La mesa de la cena ocupa la calle: en el teléfono va la versión corta (se comprueba como cualquier vecino). La misa de gallo es religiosa, como la del domingo que ya aprobaste. El nacimiento no se toca.',
   'Es la noche más importante del año aquí. Merece el día entero.', imgs=['f-nb4', 'f-nb4-e', 'f-nb6-t'], poses=['tamales', 'mesa', 'brindis', 'regalo', 'volcancito'], badges=[FIESTA])
nv(212, 'Navidad, el 25: estrenos, paseo y descanso', 'si', 'S', HOY,
   'El pueblo amanece tarde, con pólvora en la calle y una vecina barriendo. A media mañana los oseznos estrenan sus juguetes en la plaza; por la tarde, familias de paseo y visita al nacimiento; de noche, las sillas en la acera.',
   'El pueblo, todo el 25 de diciembre.',
   '0 nodos.',
   'Los juguetes a 390 px son un rectángulo rojo con ruedas: se entiende por el día. Nadie madruga: hasta las 9:00 casi no hay nadie, a propósito.',
   'El 25 aquí es el día de salir a la calle con lo que trajo el Niño.', imgs=['f-n25b', 'f-n25b-e'], poses=['oseznoJuguete', 'hombros', 'polvora'], badges=[FIESTA])
nv(213, 'El 31: el último día del año', 'si', 'M', HOY,
   'Por la mañana se barre y se limpia la casa; por la tarde, estreno y preparativos; cena y brindis al anochecer; y desde las 23:00 todo el pueblo sale a la plaza a esperar las doce, mirando la torre. A las 0:00, el abrazo (162) y los cohetes de siempre.',
   'El pueblo, todo el 31 de diciembre, hasta la 1:00 del 1.',
   '0 nodos. La espera no lleva números ni letras: se ve en que todos miran al mismo sitio.',
   'Una cuenta regresiva con cifras sería texto en la escena: no. Si se hace el reloj de la torre (203), en pantallas anchas marca de verdad las doce.',
   'La cuenta regresiva sin un solo número: todos de espaldas, y luego todos abrazados.', imgs=['f-31c', 'f-31c-e', 'f-31d-t'], badges=[FIESTA])
nv(214, 'El 1 de enero: el pueblo duerme', 'si', 'S', HOY,
   'Hasta las 9:00 no hay nadie: pólvora en la calle y el perro. Luego, una vecina barre; por la tarde, visitas de casa en casa, y de noche, la fresca.',
   'El pueblo, todo el 1 de enero.',
   '0 nodos.',
   'Ninguno.',
   'Después de la fiesta, el silencio también es parte.', imgs=['f-1a'], badges=[FIESTA])
nv(215, 'El 6 de enero: se guarda la Navidad', 'si', 'S', HOY,
   'El último día del pino y del nacimiento: por la tarde, un vecino en su escalera baja los focos y los oseznos ayudan. El 7 ya no están.',
   'El pueblo, el 6 de enero, de 14:00 a 17:45.',
   '0 nodos.',
   'Aquí el Día de Reyes casi no se celebra: por eso es la despedida de la Navidad y no una fiesta de Reyes.',
   'Hoy la Navidad desaparece de un día para otro. Que alguien la guarde.', poses=['escalera'], badges=[FIESTA])
nv(216, 'Los de la cumbre viven la Navidad', 'si', 'S', HOY,
   'El 24: terminan su oso de nieve (185) y al anochecer miran hacia el pueblo; a las doce, brazos arriba y aparecen los regalos (186). El 25 duermen hasta las 9:00 (los ojos cerrados de la 24) y los regalos ya están abiertos. El 31, a las 23:50, miran al cielo. El 1 de enero, duermen hasta las 9:00.',
   'La cumbre, del 24 de diciembre al 1 de enero.',
   '0 nodos más que la 24, la 185 y la 186: son las mismas poses a otras horas.',
   'Si no eliges la 24 (dormirse), el 25 y el 1 amanecen como siempre. Nada sale de su sitio.',
   'Los tres son los peluches de la familia: que su Navidad se parezca a la de la casa.', imgs=['c-regalos', 'c-duermen'], badges=[FIESTA])
nv(217, '«Tú» en las fiestas', 'si', 'S', HOY,
   'En Nochebuena y el 31 «Tú» no acampa hasta la 1:00: a las doce está de pie, con los brazos arriba, mirando los cohetes. El 25 y el 1 su carpa sigue puesta hasta las 9:00.',
   '«Tú», esas cuatro fechas.',
   '0 nodos más que la carpa (191): es su pose de festejar.',
   'Sin la 191, «Tú» solo levanta los brazos a las doce.',
   'Quien abre la app a medianoche para ver los cohetes merece que «Tú» también los vea.', imgs=['t-estira', 't-carpa'], badges=[FIESTA])
nv(218, 'Los animales en las fiestas', 'si', 'S', HOY,
   'Con los cohetes, el perro se mete bajo la banca y las gallinas no se ven. El 25 y el 1 por la mañana el perro es el único despierto. En el Día del Niño, el perro está junto a la piñata, esperando.',
   'La plaza.',
   '0 nodos: cambian de sitio.',
   'Con los cohetes el perro no cruza ni se mueve: quieto, escondido.',
   'Todo el que tiene perro sabe dónde está a las doce del 31.', badges=[FIESTA])

# ================================================================ Fiestas · el resto del año
nv(219, '17 de junio: el Día del Padre', 'si', 'S', HOY,
   'Por la mañana, el pueblo de siempre; por la tarde, papás oso con su osezno en hombros y un partido de padres e hijos en la plaza. De noche, pupusas con más fila.',
   'El pueblo, todo el 17 de junio.',
   '0 nodos.',
   'Es época de lluvia: si esa tarde toca llovizna, juegan igual (son osos).',
   'El osezno en hombros es de lo que mejor se lee en las maquetas.', imgs=['f-padre'], poses=['hombros'], badges=[FIESTA])
nv(220, 'El 15 de septiembre, el día entero', 'si', 'S', HOY,
   'El desfile de la mañana ya existe. Se suma el resto: al amanecer se cuelgan las últimas banderitas; a mediodía, la plaza llena y elotes locos; por la tarde, el abanderado guarda la bandera con cuidado; de noche, la fresca con la plaza todavía embanderada.',
   'El pueblo, todo el 15 de septiembre (la víspera es la 157).',
   '0 nodos (el azul de la bandera ya suma 1 ese día).',
   'La bandera nunca en el suelo ni doblada de cualquier forma: el abanderado la lleva en alto hasta que sale de la plaza.',
   'Hoy a las 12:00 el desfile se acaba y el pueblo vuelve a un jueves cualquiera.', imgs=['f-s15', 'f-s14'], badges=[FIESTA])
nv(221, 'El cumpleaños de la montaña', 'si', 'S', HOY,
   'El día que el libro cumple años (la fecha de la primera compra), los de la cumbre amanecen con un pastel y una velita, y a las 12:00 levantan los brazos. «Tú» lleva su flor (197). El árbol del primer día, una cinta.',
   'La cumbre, «Tú» y el árbol del primer día. No en el pueblo ni en la entrada.',
   '+3 nodos ese día (el pastel y la velita, fuera del grupo de los osos; la cinta).',
   'La fecha es un dato de la familia: por eso no la celebra el pueblo, que también se ve en la entrada.',
   'Es la única fiesta que es solo de esta montaña.', otros='+3 (un día)', badges=[FIESTA])
nv(222, 'Un cumpleaños de la familia, el día entero', 'si', 'S', HOY,
   'El gorrito ya existe. Se suma el día: por la mañana, un regalo junto a los osos; por la tarde, el pastel con su velita; al anochecer, la velita encendida; a medianoche se va todo.',
   'La cumbre. Nunca en el pueblo ni en la entrada.',
   '+2 nodos ese día (un regalo o el pastel, según la hora).',
   'No dice de quién es ni cuántos cumple: una velita, siempre una. No se ve en la entrada.',
   'Hoy el gorrito está igual todo el día.', otros='+2 (ese día)', badges=[FIESTA])

# Las fechas que ya estaban en la ronda pasan a día entero: mismo id, guion completo.
_DIA = {
    149: ('Semana Santa: el Domingo de Ramos', 'El Domingo de Ramos entero: al amanecer, un vecino corta palmas; de 7:30 a 10:00 todos van a misa con la suya; el resto del día, la palma queda en la puerta de cada casa.', 'El pueblo, todo el Domingo de Ramos.'),
    151: ('Semana Santa: Sábado de Gloria y Pascua', 'El Sábado de Gloria entero: de mañana los oseznos van al lago con su llanta y el pueblo queda medio vacío; a mediodía, la abuela sola en su corredor; al atardecer vuelven todos, y de noche hay más fila en las pupusas. El Domingo de Pascua, igual.', 'El pueblo y el camino del lago, los dos días.'),
    153: ('10 de mayo: el Día de la Madre', 'El día entero: a las 5:30, las mañanitas (un oso con guitarra y los oseznos con flores frente a una casa); a media mañana, oseznos con su flor por la calle; a mediodía, la mesa puesta en la calle; por la tarde, la abuela con visita y flores en su corredor.', 'El pueblo, todo el 10 de mayo.'),
    156: ('5 y 6 de agosto: el pueblo estrena', 'Los dos días enteros, sin rueda: por la mañana, el pueblo adornándose y la misa del 6; a mediodía, almuerzo en la calle; por la tarde, oseznos con elote loco y la vendedora de dulces; de noche, la plaza llena.', 'El pueblo, el 5 y el 6 de agosto.'),
    157: ('14 de septiembre: la antorcha y los farolitos', 'La víspera entera: por la mañana, los oseznos hacen sus farolitos en la plaza; a las 16:00 llega un vecino con la antorcha; al anochecer, todos los oseznos con su farolito encendido; de noche, la fresca.', 'El pueblo, todo el 14 de septiembre.'),
    158: ('1 de octubre: el Día del Niño', 'El día entero: por la mañana, un vecino en su escalera cuelga la piñata; a mediodía no hay escuela y la plaza ya está llena; a las 15:00, el osezno vendado y todos alrededor; al anochecer, la piñata ya no está y los oseznos se reparten los dulces.', 'El pueblo, todo el 1 de octubre.'),
    159: ('1 y 2 de noviembre: flores', 'Los dos días enteros: de mañana, vecinos con flores y coronas de papel de camino a enflorar; a mediodía, el pueblo medio vacío; por la tarde vuelven; al anochecer del 2, una velita frente a cada casa.', 'El pueblo, el 1 y el 2 de noviembre.'),
    160: ('12 de diciembre: los inditos', 'El día entero: de mañana, los oseznos van a la iglesia vestidos de inditos; a mediodía se quedan jugando así en la plaza; por la tarde, de vuelta a casa con su canastito.', 'El pueblo, todo el 12 de diciembre.'),
    162: ('El abrazo de las doce', 'El momento grande del 31 (213): de 0:00 a 1:00 los vecinos se abrazan de dos en dos, con los cohetes de siempre en el cielo y los oseznos con su estrellita. En Nochebuena, lo mismo.', 'La calle y el atrio, pasada la medianoche del 24 y del 31.'),
}
for _n, (_t, _que, _donde) in _DIA.items():
    _i = next(x for x in I if x['n'] == _n)
    _i.update({'t': _t, 'que': _que, 'donde': _donde})
    _i['badges'] = [list(FIESTA)] + [b for b in _i['badges'] if b[1] != 'Quieto']
next(x for x in I if x['n'] == 153)['imgs'] = ['f-madre1', 'f-madre2']
next(x for x in I if x['n'] == 153)['poses'] = ['v4-guitarra', 'v4-oseznoFlor']
next(x for x in I if x['n'] == 158)['imgs'] = ['f-nino1', 'v4-pinata']
next(x for x in I if x['n'] == 159)['imgs'] = ['v4-difuntos', 'f-dif2']
next(x for x in I if x['n'] == 162)['imgs'] = ['f-31d', 'f-nb6']

# ---------------------------------------------------------------- la sección: cada fiesta, su tira de turnos y su guion
_CAB = ['Turno', 'En el pueblo', 'La cumbre y «Tú»', 'Animales', 'Se mueve (uno a la vez)']
FIESTAS = {
    'lead': ('Cada fiesta dura todo su día. El pueblo cambia de turno como siempre (otro reparto de los mismos trazos: 0 nodos), pero ese día los turnos son los de la fiesta, con algo distinto de la madrugada a la medianoche y un momento grande. '
             'Las tiras son el prototipo corriendo en la app de verdad, en su fecha y a su hora; lo que dice «HOY» ya existe. Lo de otra fecha no se dibuja ese día.'),
    'costo': {'t': 'Lo que cuesta un día de fiesta', 'p': 'Medido con el prototipo en la escena de main (un año de compras, 390×844, efectos «todos»).',
              'cab': ['Qué', 'Medido o contado'],
              'filas': []},
    'lista': [
        {'id': 'nochebuena', 't': 'Nochebuena', 'fecha': '24 de diciembre', 'ideas': '211, 216, 217 y 218 (con 185, 186, 162 y 201)',
         'tira': ['f-nb1', 'f-nb2', 'f-nb3', 'f-nb4', 'f-nb5', 'f-nb6'], 'extra': ['f-nb0', 'f-nb4-e', 'f-nb6-e'], 'alto': ['f-nb6-t'],
         'filas': [
             ['Madrugada · 4:30–7:00', 'El panadero sale con el canasto lleno; la que barre; la primera vendedora', 'Duermen (24); «Tú» en su carpa (191)', 'El gallo (172)', 'El torogoz; el panadero (116)'],
             ['Mañana · 7:00–11:30', 'Mercado grande: dos vendedoras, vecinos con sus compras, uno en la escalera con los últimos adornos, oseznos ayudando', 'Le ponen la bufanda a su oso de nieve (185)', 'Gallinas y perro, como siempre', 'La que barre; las gallinas'],
             ['Mediodía y tarde · 11:30–17:45', 'Los tamales: la olla con su fuego, vecinas alrededor, alguien llega con un regalo, oseznos jugando', '—', 'El perro junto a la olla', 'La pelota de los oseznos'],
             ['Anochecer · 17:45–21:00', 'La cena en la calle: mesa larga, brindis, oseznos con estrellitas (ya hecho)', 'De espaldas, mirando el pueblo', '—', '<b>Un oso que brinda</b> (a saltos); las estrellitas (201)'],
             ['Noche · 21:00–23:40', 'Misa de gallo: todos de espaldas camino de la iglesia, el padre a la puerta', 'Miran hacia el pueblo', '—', 'Nada: el pueblo va a misa'],
             ['<b>Medianoche · 23:40–1:00</b>', '<b>Abrazos, regalos, volcancitos en la plaza</b> y los cohetes de siempre', '<b>Brazos arriba; aparecen los regalos (186)</b>; «Tú» de pie, mirando', 'El perro, bajo la banca (218)', 'Los cohetes (ambiente); <b>un volcancito chispea</b>'],
             ['Después · 1:00–5:00', 'Nadie', 'Duermen', 'El tecolote (173)', '—'],
         ],
         'peor': 'El peor momento del día y del año: de 23:50 a 0:30 (cohetes, 35 nodos, más los regalos, 2). Hoy son 1030 nodos; con todo lo propuesto, unos 955 de 1100. En animaciones, con la franja de fiesta (210) las luciérnagas no están: el dibujo grande baja de 42 a unas 12.'},
        {'id': 'navidad', 't': 'Navidad', 'fecha': '25 de diciembre', 'ideas': '212, 216, 217 y 218',
         'tira': ['f-n25a', 'f-n25b', 'f-n25c', 'f-n25d'], 'extra': ['f-n25b-e'], 'alto': [],
         'filas': [
             ['Madrugada · 1:00–9:00', 'Nadie hasta las 7:00; luego, pólvora en la calle y una vecina que barre', 'Duermen hasta las 9:00, con los regalos al lado', 'Solo el perro', 'El torogoz, a su hora'],
             ['<b>Mañana · 9:00–12:00</b>', '<b>Los oseznos estrenan juguetes en la plaza</b>; los mayores, sentados mirando', 'Despiertan: los regalos, abiertos', 'Las gallinas', 'La pelota nueva (la franja de la pelota, adelantada ese día)'],
             ['Mediodía · 12:00–14:00', 'El recalentado: la mesa otra vez, más chica; la hamaca', '—', 'El perro bajo la mesa', 'La hamaca (199)'],
             ['Tarde · 14:00–17:45', 'Paseo: familias, un osezno en hombros, visita al nacimiento', 'De espaldas al atardecer (184)', '—', 'El perro cruza'],
             ['Noche · 17:45–22:00', 'Las sillas en la acera (139); pupusas, poca fila', '—', '—', 'Luciérnagas'],
         ],
         'peor': 'Un día liviano: sin cohetes dibujados después de la 1:00 si se hace la 125. Lo más cargado es la noche, igual que cualquier noche de diciembre (unos 995 nodos hoy sin cohetes).'},
        {'id': 'finde', 't': 'Fin de año y Año Nuevo', 'fecha': '31 de diciembre y 1 de enero', 'ideas': '213, 162, 214, 216, 217 y 218',
         'tira': ['f-31a', 'f-31b', 'f-31c', 'f-31d', 'f-1a'], 'extra': ['f-31c-e'], 'alto': ['f-31d-t'],
         'filas': [
             ['Mañana del 31 · 5:00–11:30', 'Se barre y se limpia la casa: dos escobas, ropa tendida, la vendedora', '—', 'Como siempre', 'La que barre'],
             ['Tarde · 11:30–17:45', 'Estreno: los vecinos con su ropa nueva; los oseznos preparan sus volcancitos (apagados)', '—', '—', 'La pelota'],
             ['Anochecer · 17:45–23:00', 'Cena y brindis; oseznos con estrellitas (ya hecho)', 'De espaldas, mirando el pueblo', '—', 'Un oso que brinda'],
             ['<b>La espera · 23:00–0:00</b>', '<b>Todo el pueblo en la plaza, de espaldas, mirando la torre</b>', 'Miran al cielo', 'El perro ya se escondió', 'Nada: todos quietos, esperando'],
             ['<b>Las doce · 0:00–1:00</b>', '<b>El abrazo (162)</b>, volcancitos y cohetes', '<b>Brazos arriba</b>; «Tú» también', 'Bajo la banca', 'Los cohetes (ambiente); un volcancito'],
             ['El 1 · 1:00–9:00', 'Nadie; pólvora en la calle', 'Duermen hasta las 9:00', 'Solo el perro', '—'],
             ['El 1 · 9:00–22:00', 'Una vecina barre; por la tarde, visitas de casa en casa; de noche, la fresca', 'Como siempre', '—', 'Lo de un día normal'],
         ],
         'peor': 'Igual que Nochebuena: de 23:50 a 0:30. La espera de las 23:00 es el momento con menos movimiento del año, a propósito: todo quieto antes de las doce.'},
        {'id': 'madre', 't': 'Día de la Madre', 'fecha': '10 de mayo', 'ideas': '153',
         'tira': ['f-madre1', 'f-madre2'], 'extra': [], 'alto': [],
         'filas': [
             ['<b>Amanecer · 5:30–7:00</b>', '<b>Las mañanitas</b>: un oso con guitarra y los oseznos con flores frente a una casa', 'Se estiran', 'El gallo', 'El torogoz (la guitarra, quieta)'],
             ['Mañana · 7:00–11:30', 'Oseznos con su flor por la calle; la vendedora lleva flores en el canasto', '—', '—', 'Lo de siempre'],
             ['Mediodía · 11:30–14:00', 'La mesa puesta en la calle, con flores', '—', '—', 'Nada'],
             ['Tarde y noche', 'La abuela con visita y flores en su corredor; pupusas con más fila', 'De espaldas al atardecer', '—', 'Lo de siempre'],
         ],
         'peor': 'Ninguno: mayo es de los meses con más margen (unos 920 nodos).'},
        {'id': 'padre', 't': 'Día del Padre', 'fecha': '17 de junio', 'ideas': '219',
         'tira': ['f-padre'], 'extra': [], 'alto': [],
         'filas': [
             ['Mañana', 'El pueblo de siempre', '—', '—', 'Lo de siempre'],
             ['<b>Tarde · 14:00–17:45</b>', '<b>Oseznos en hombros</b> y partido de padres e hijos', 'Paraguas si llueve (26)', '—', 'La pelota'],
             ['Noche', 'Pupusas con más fila', '—', '—', 'Luciérnagas'],
         ],
         'peor': 'Ninguno.'},
        {'id': 'patrias', 't': 'La Independencia', 'fecha': '14 y 15 de septiembre', 'ideas': '157 y 220 (el desfile ya existe)',
         'tira': ['f-s14', 'v4-farolitos', 'f-s15'], 'extra': ['v4-farolitos-e'], 'alto': [],
         'filas': [
             ['14 · mañana', 'Los oseznos hacen sus farolitos en la plaza', '—', '—', 'Lo de siempre'],
             ['14 · 16:00–17:45', 'Llega la antorcha', 'Banderita en la nieve (190)', '—', 'Los pericos'],
             ['<b>14 · anochecer</b>', '<b>Los farolitos encendidos</b>', 'De espaldas', '—', 'Luciérnagas'],
             ['15 · amanecer', 'Se cuelgan las últimas banderitas', 'Se estiran', 'El gallo', 'El torogoz'],
             ['<b>15 · 7:00–12:00</b>', '<b>El desfile (ya hecho)</b>: abanderado y bombo', '—', '—', 'Nadie marcha: quietos'],
             ['15 · tarde y noche', 'Plaza llena y elotes locos; el abanderado guarda la bandera; la fresca, embanderada', '—', '—', 'Lo de siempre'],
         ],
         'peor': 'Ninguno: septiembre ronda los 920 nodos.'},
        {'id': 'nino', 't': 'Día del Niño', 'fecha': '1 de octubre', 'ideas': '158 y 218',
         'tira': ['f-nino1', 'v4-pinata'], 'extra': [], 'alto': [],
         'filas': [
             ['Mañana · 7:00–11:30', 'Un vecino en su escalera cuelga la piñata; los oseznos miran', '—', 'El perro, debajo, esperando', 'La que barre'],
             ['Mediodía', 'No hay escuela: la plaza ya está llena', '—', '—', 'Nada'],
             ['<b>Tarde · 15:00–17:00</b>', '<b>La piñata</b>: el vendado con su palo y todos alrededor', '—', 'El perro, atento', '<b>La piñata se mece</b> (en lugar de la pelota)'],
             ['Anochecer', 'Ya no hay piñata: los oseznos se reparten los dulces', '—', '—', 'Luciérnagas'],
         ],
         'peor': 'Octubre trae las piscuchas (8 nodos) y los azacuanes: los días de azacuanes vuelan ellos y la piñata no se mece.'},
        {'id': 'difuntos', 't': 'Difuntos', 'fecha': '1 y 2 de noviembre', 'ideas': '159 (que lo diga la familia)',
         'tira': ['v4-difuntos', 'f-dif2'], 'extra': [], 'alto': [],
         'filas': [
             ['Mañana', 'Vecinos con flores y coronas de papel, de camino a enflorar', '—', '—', 'Lo de siempre, menos la pelota'],
             ['Mediodía', 'El pueblo medio vacío', '—', '—', 'Nada'],
             ['Tarde', 'Vuelven; la abuela, con visita', 'De espaldas al atardecer', '—', '—'],
             ['<b>Anochecer del 2</b>', '<b>Una velita frente a cada casa</b>', '—', '—', 'Nada: esa noche, quieto'],
         ],
         'peor': 'Ninguno.'},
        {'id': 'santa', 't': 'Semana Santa', 'fecha': 'De Ramos a Pascua (fecha movible)', 'ideas': '149, 150 (después) y 151',
         'tira': ['v4-ramos', 'v4-gloria'], 'extra': [], 'alto': [],
         'filas': [
             ['<b>Domingo de Ramos</b>', '<b>Misa con palmas</b>; después, la palma en cada puerta', '—', '—', 'Lo de un domingo'],
             ['Lunes a miércoles', 'El pueblo de siempre, sin escuela: oseznos todo el día', '—', '—', 'Lo de siempre'],
             ['Jueves y Viernes', 'En silencio (150, «después»): pocos, de espaldas, sin pelota', '—', '—', 'Nada'],
             ['<b>Sábado y Domingo</b>', '<b>Al lago con la llanta</b>; el pueblo medio vacío y, de noche, lleno', 'Sombrero (189)', '—', 'Lo de siempre'],
         ],
         'peor': 'Ninguno: marzo y abril rondan los 920 nodos.'},
        {'id': 'cumples', 't': 'Los dos cumpleaños', 'fecha': 'El de la montaña y los de la familia', 'ideas': '221 y 222 (con 197)',
         'tira': [], 'extra': [], 'alto': [],
         'filas': [
             ['Mañana', 'Nada: el pueblo no lo sabe (se ve en la entrada)', 'Un regalo junto a los osos; el gorrito (ya hecho)', '—', '—'],
             ['Mediodía', '—', 'El de la montaña: brazos arriba a las 12:00; «Tú» con su flor (197)', '—', '—'],
             ['Tarde', '—', 'El pastel con su velita', '—', '—'],
             ['Anochecer', '—', 'La velita, encendida', '—', '—'],
         ],
         'peor': 'Si el cumpleaños cae en Nochebuena, son 2 nodos más en el pico: caben.'},
    ],
}
