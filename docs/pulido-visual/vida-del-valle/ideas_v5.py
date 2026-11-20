# Quinta ronda (v5): el valle habitado. Lo ejecuta hacer_galeria.py después de ideas_v4.py (que ya ejecutó ideas_fiestas.py).
# Los ids 1–222 no cambian (las elecciones del dueño se guardan por id). Tres cosas nuevas:
#   mejora(n, …)  una idea de antes sube de nivel: mismo id, misma recomendación, texto nuevo y la nota «qué cambió»;
#   funde(n, en)  una idea floja o repetida se funde en otra mejor: el id se queda, marcado «fundida en N», y sale de la elección;
#   n5(…)         ideas nuevas desde la 223, en campamentos nuevos (51–56) o sumadas a los de antes.
# Maquetas: scratchpad/vida5 (prototipo sin commitear sobre origin/main en /home/user/vida5-wt: prototipo-vida5.patch).
V5 = pathlib.Path('/tmp/claude-0/-home-user-dca-bitcoin/a4559b60-eb1b-544b-95bf-bb999d91cf6d/scratchpad/vida5')
P5 = 'Prototipo v5 en la escena de main · 390 px, ampliado'
R5 = 'Retoque sobre la escena de main (no es código final)'


def v5img(k, archivo, alt, pie, ancho=700, bajo=None, alto=False):
    ruta = V5 / 'cap' / archivo
    rec = None
    if bajo:
        w, h = Image.open(ruta).size
        rec = (0, max(0, h - bajo), w, h)
    img(k, str(ruta), alt, ancho=ancho, recorte=rec, alto=alto, pie=pie)


v5img('s-pan1', 's-pan1-tel.png', 'Antes de las seis: el panadero sale de su casa en bicicleta, con el canasto atrás; el gallo y la que barre.', P5 + ' · 5:35')
v5img('s-pan2', 's-pan2-tel.png', 'A las siete y media, el mismo panadero está en el atrio de la iglesia, junto a la vendedora.', P5 + ' · 7:25')
v5img('s-pan3', 's-pan3-tel.png', 'A las diez, el panadero reparte en la plaza y dos oseznos se le acercan.', P5 + ' · 10:00')
v5img('s-pan4', 's-pan4-tel.png', 'A mediodía, el panadero ha dejado la bicicleta junto al comal de la tortillera: almuerzan.', P5 + ' · 12:10')
v5img('s-globo1', 's-globo1-tel.png', 'Domingo: un oso con sombrero y un racimo de globos de colores en la plaza; un osezno lleva uno rojo.', P5 + ' · domingo, 16:00')
v5img('s-globo2', 's-globo2-tel.png', 'Lunes: el globo rojo amaneció enredado en el maquilishuat de la plaza y tres oseznos lo miran con el brazo arriba.', P5 + ' · lunes, 16:00')
v5img('c-globo', 'c-globo-cumbre-tel.png', 'Martes: el globo rojo está en la cumbre, atado a una piedra en la nieve junto a los tres osos.', R5 + ' · martes, 10:00', ancho=520)
v5img('c-globo-e', 'c-globo-cumbre-esc.png', 'El globo en la cumbre, en escritorio.', 'Lo mismo a 1440 px', ancho=520)
v5img('s-circo1', 's-circo1-tel.png', 'Llega el circo: la lona roja y blanca tendida en la plaza, un oso en zancos con gorro de pico y un vecino en su escalera.', P5 + ' · día 1, 9:30')
v5img('s-circo2', 's-circo2-tel.png', 'La carpa a rayas ya está levantada bajo los faroles: el malabarista, el de los zancos y los vecinos que llegan.', P5 + ' · día 3, 18:20')
v5img('s-circo2-e', 's-circo2-esc.png', 'La función del circo en escritorio.', 'El mismo prototipo a 1440 px', ancho=880)
v5img('s-foto', 's-foto-tel.png', 'El fotógrafo de la plaza con su cámara de cajón en trípode y un osezno montado en el caballito de madera.', P5 + ' · domingo, 10:30')
v5img('s-boda', 's-boda-tel.png', 'Una boda: los novios a la puerta de la iglesia, el padre, vecinos echando arroz y uno con guitarra.', P5 + ' · sábado, 16:30')
v5img('s-boda-e', 's-boda-esc.png', 'La boda en escritorio.', 'El mismo prototipo a 1440 px', ancho=880)
v5img('s-cuentos', 's-cuentos-tel.png', 'Noche de luna llena: la abuela en la plaza y cinco oseznos sentados en el suelo a su alrededor.', P5 + ' · luna llena, 20:10')
v5img('s-cuentos-e', 's-cuentos-esc.png', 'La noche de cuentos en escritorio.', 'El mismo prototipo a 1440 px', ancho=880)
v5img('s-confeti', 's-confeti-tel.png', 'La mañana después de la piñata: papelitos de colores en la plaza, la que barre y un osezno buscando dulces.', P5 + ' · 2 de octubre, 7:30', bajo=384)
v5img('s-charco3', 's-charco3-tel.png', 'Al escampar: tres charcos en la plaza y dos oseznos saltando en ellos.', P5 + ' · julio, 17:50')
v5img('s-charco2', 's-charco2-tel.png', 'Tres cuartos de hora después quedan dos charcos, más chicos, y un solo osezno.', P5 + ' · 18:30')
v5img('s-charco1', 's-charco1-tel.png', 'Ya de noche queda un charquito.', P5 + ' · 19:35')
v5img('s-bebe1', 's-bebe1-tel.png', 'Día 1: delante de una casa, un tendedero lleno de pañales blancos y una camisita amarilla.', P5 + ' · día 1')
v5img('s-bebe2', 's-bebe2-tel.png', 'Día 2: tres vecinas llegan de visita con una olla, flores y un huacal.', P5 + ' · día 2')
v5img('s-bebe3', 's-bebe3-tel.png', 'Día 3: la vecina sale al corredor con el osezno en brazos, envuelto en su manta, y los vecinos lo miran.', P5 + ' · día 3')
v5img('s-feria', 's-feria-tel.png', 'La feria de agosto: dos puestos con toldo a rayas, el de los globos, un osezno con algodón de azúcar y un malabarista.', P5 + ' · 5 de agosto, 16:30')
v5img('s-feria-e', 's-feria-esc.png', 'La feria en escritorio.', 'El mismo prototipo a 1440 px', ancho=880)
v5img('s-paletero', 's-paletero-tel.png', 'Un domingo de marzo: el paletero a pie, con su hielera blanca al hombro y una paleta en la mano, y tres oseznos alrededor.', P5 + ' · domingo de marzo, 14:35')
v5img('s-ramada1', 's-ramada1-tel.png', 'Jueves: cuatro horcones clavados en la plaza y las palmas apiladas al lado.', P5 + ' · jueves')
v5img('s-ramada2', 's-ramada2-tel.png', 'Viernes: la ramada ya tiene su techo de palma y un vecino en la escalera lo termina.', P5 + ' · viernes')
v5img('s-ramada3', 's-ramada3-tel.png', 'Sábado: bajo la ramada con banderines, la olla del atol, los huacales, un oso con guitarra y los oseznos con elote.', P5 + ' · sábado, 16:30')
v5img('c-tazas', 'c-tazas-cumbre-tel.png', 'En la cumbre, tres tacitas humeantes de colores en la nieve, al lado de los tres osos.', R5, ancho=520)
v5img('s-circo-entera', 's-circo2-tel-entera.png', 'La pantalla entera del teléfono con el circo en el pueblo: la carpa es lo único distinto y se encuentra a la primera.', 'La pantalla entera a 390×844: un solo foco', ancho=520, alto=True)

_por = {i['n']: i for i in I}
SISTEMA = ('mov', 'Sistema')
HISTORIA = ('barata', 'Historia de varios días')
RARO = ('reex', 'Raro: se ve pocas veces')
MEMORIA = ('barata', 'Memoria del día')
RITMO = ('si', 'Por algo alcanzado, nunca por una ausencia')
REABRE = ('regla', 'Reabre un descarte de la v4')
V5N = 223


def mejora(n, mej, t=None, que=None, imgs=None, **otros):
    i = _por[n]
    assert 'hecho' not in i and n < V5N, n
    if t:
        i['t'] = t
    if que:
        i['que'] = que
    if imgs is not None:
        i['imgs'] = list(imgs) + [k for k in i['imgs'] if k not in imgs]
    i['mej'] = mej
    i.update(otros)


def funde(n, en, por):
    i = _por[n]
    assert 'hecho' not in i and n < V5N, n
    i['fundida'] = en
    for k in ('nbp', 'an', 'os'):  # lo que pesaba pasa a la idea que la absorbe
        _por[en][k] = _por[en].get(k, 0) + i.get(k, 0)
    i['fundidaPor'] = por


def n5(n, t, rec, c, cabe, que, donde, costo, ojo, porRec, camp, **kw):
    nv(n, t, rec, c, cabe, que, donde, costo, ojo, porRec, **kw)
    _por[n] = I[-1]
    I[-1]['poses'] = []
    next(x for x in CAMPS if x['id'] == camp)['ids'].append(n)


# ================================================================ campamentos nuevos (51–56); el 39 sigue primero y el 41 es la Navidad
_N5 = [
    {'id': 'c51', 'k': '51', 'camp': 'Campamento 51', 't': 'El director del valle', 'tipo': 'vida', 'ids': [],
     'orden': 'El principio hecho código: un solo foco de vida por momento, la escalera de rareza y el mapa de rutinas. Sin esto, todo lo demás es ruido.',
     'why': 'Hasta la v4 cada idea tenía su hora y su fecha por separado. Con más de doscientas, hace falta alguien que decida qué se ve hoy y qué espera a mañana: una sola función que, con la fecha y la hora, elige el foco del momento y deja lo demás quieto y discreto.',
     'riesgo': 'Bajo en la escena (0 nodos, 0 animaciones: solo decide). Medio en pruebas: es una tabla grande y hay que probarla con un año entero de fechas para que nunca salgan dos cosas raras juntas.',
     'meta': 'Navegador y pruebas · 1 commit · va después del 40 y antes del 52–55, que dependen de él · sin «Qué hay de nuevo» (no se ve por sí solo)'},
    {'id': 'c52', 'k': '52', 'camp': 'Campamento 52', 't': 'Vecinos con oficio: vidas que se cruzan', 'tipo': 'vida', 'ids': [],
     'dep': 'el campamento 51 (el director reparte quién está dónde) y el 40 (los turnos del día).',
     'orden': 'Ocho vecinos de siempre, reconocibles, cada uno con su recorrido por horas. No caminan: cada vez que abres están un poco más allá. 0 nodos.',
     'why': 'Un pueblo se siente habitado cuando reconoces a su gente. Hoy los osos son figurantes que cambian con el turno; con oficio y recorrido, el panadero de las 5:30 es el mismo que ves a las 10:00 en la plaza y a mediodía con la tortillera.',
     'riesgo': 'Bajo: medido contra el mismo día y hora sin prototipo, de 0 a +1 nodos. El riesgo es de diseño: que un vecino no se parezca a nadie de la familia (ninguno lleva nombre y las ventanas no se tocan).',
     'meta': 'Navegador · 1 commit · «Qué hay de nuevo»'},
    {'id': 'c53', 'k': '53', 'camp': 'Campamento 53', 't': 'Historias de varios días', 'tipo': 'vida', 'ids': [],
     'dep': 'el campamento 51 (una historia a la vez, nunca en semana de fiesta).',
     'orden': 'Cosas que empiezan un día y terminan otro: se levanta una ramada, nace un osezno, un globo se escapa y llega a la cumbre, llega el circo. Se notan si abres varios días.',
     'why': 'Es lo que más cambia cómo se siente abrir la app: ayer había cuatro horcones y hoy ya tienen techo. Cada capítulo es un turno más (0 nodos) y todo sale de la fecha: igual para toda la familia, así que se puede comentar en casa.',
     'riesgo': 'Bajo en rendimiento. Medio en calendario: ninguna historia cae en una fiesta ni depende de si alguien abrió la app. El motor no lee los cumpleaños: no sabe nada de la familia.',
     'meta': 'Navegador · 1 commit (o dos: el motor y luego las historias) · «Qué hay de nuevo»'},
    {'id': 'c54', 'k': '54', 'camp': 'Campamento 54', 't': 'La memoria del día', 'tipo': 'vida', 'ids': [],
     'dep': 'el campamento 40 (los turnos) y, para las fiestas, el 41 y el 42.',
     'orden': 'Lo que pasó deja rastro: confeti la mañana después de la piñata, charcos que se van secando, las sillas de la fresca vacías de madrugada, la pelota donde quedó.',
     'why': 'Un lugar vivo no se reinicia en cada turno. Si a las 18:00 hubo charcos, a las 19:30 queda uno. Es barato (el rastro sustituye a algo, no se suma) y hace que el día se sienta continuo.',
     'riesgo': 'Bajo: son variantes de trazos que ya existen. Que el rastro no parezca basura: pocos trazos, y alguien lo barre a una hora fija.',
     'meta': 'Navegador · 1 commit · «Qué hay de nuevo»'},
    {'id': 'c55', 'k': '55', 'camp': 'Campamento 55', 't': 'Encuentros raros y visitas de fuera', 'tipo': 'vida', 'ids': [],
     'dep': 'el campamento 51 (la escalera de rareza: nunca dos el mismo día, nunca en fiesta).',
     'orden': 'Lo que se ve pocas veces y por eso se recuerda: el de los globos, el fotógrafo con su caballito, una boda, el cine en una sábana, un viajero, el telescopio de luna nueva.',
     'why': '«Lo común es discreto, lo raro es memorable.» Una vez al mes pasa algo que no habías visto. No hay álbum, ni contador, ni aviso: si lo viste, lo viste.',
     'riesgo': 'Bajo en rendimiento (un turno especial: 0 nodos, medido). Medio en gusto: cada visita debe ser de aquí. Las que no puedo afirmar van marcadas para que las diga la familia.',
     'meta': 'Navegador · 1 commit · «Qué hay de nuevo» sin decir cuándo salen (la gracia es encontrarlas)'},
    {'id': 'c56', 'k': '56', 'camp': 'Campamento 56', 't': 'La cumbre y «Tú», a tu ritmo', 'tipo': 'vida', 'ids': [],
     'dep': 'los campamentos 47 y 48 (los gestos de la cumbre y de «Tú»).',
     'orden': 'Un solo objeto a la vez junto a los osos, el chocolate del día que cruzas una etapa, la semana de la cumbre y la regla de oro, con su prueba: ningún gesto sale por no comprar.',
     'why': 'Los gestos de arriba son los únicos que pueden mirar tus compras, y solo en un sentido: por algo que hiciste o alcanzaste. Aquí se ordenan (junto a los osos, medido, solo cabe un objeto en el teléfono) y se blinda la regla con una prueba automática.',
     'riesgo': 'Medio: el sitio junto a los osos es estrecho. En las maquetas a 390 px el globo y la tercera taza quedan en el borde de la nieve; al implementar van delante de los osos. Un objeto a la vez, chico: nada sobresale.',
     'meta': 'Navegador y pruebas · 1 commit · «Qué hay de nuevo»'},
]
_id = next(k for k, c in enumerate(CAMPS) if c['id'] == 'despues')
CAMPS[_id:_id] = _N5

# ================================================================ 51 · El director del valle
n5(223, 'Un solo foco por momento: el director del valle', 'si', 'M', HOY,
   'Una sola función, con la fecha y la hora, decide qué es lo que hoy vale la pena mirar: el foco. Manda en este orden: la fiesta del día, una visita o un encuentro raro, el capítulo de una historia, y si no hay nada de eso, la rutina de un vecino. Todo lo demás está, pero quieto y sin llamar la atención.',
   'Todo el valle, todo el año. No se ve por sí mismo: se nota en que cada vez que abres hay UNA cosa que encontrar, no seis.',
   '0 nodos y 0 animaciones: no dibuja, reparte. Es una tabla en lib.js (pura, con su prueba) que leen cielo.js y el reparto de vecinos.',
   'Que la tabla no se vuelva inmanejable: cada idea se declara en una línea (cuándo, rareza, qué pesa) y una prueba recorre los 365 días comprobando que nunca hay dos focos a la vez.',
   'Es el principio de diseño hecho código. Sin él, sumar las ideas del 52 al 55 daría un valle ruidoso.',
   'c51', badges=[SISTEMA], imgs=['s-circo-entera'],
   por='Con más de doscientas ideas aprobadas, el riesgo ya no es que falte vida sino que se pise: la tortillera, el circo y la piñata el mismo día. El director garantiza «un solo foco de vida por momento».',
   como='`lib.focoDelValle(fecha, hora)` devuelve { foco, rareza, turno, mueve }. Función pura de la fecha: igual en todos los aparatos y sin guardar nada.')
n5(224, 'La escalera de rareza', 'si', 'S', HOY,
   'Cada cosa del valle tiene un peldaño: de cada día (las rutinas), de cada semana (ropa tendida, mejenga, plaza), de cada mes (una visita, una historia), de cada año (las fiestas, el circo, la boda) y de una vez en años (un eclipse, la obra que queda). Cuanto más raro, más grande puede ser; lo de cada día, chico y callado.',
   'Es la regla con la que el director elige y con la que se diseña cada idea nueva.',
   '0 nodos. Un campo «rareza» por idea en la tabla del director.',
   'Que lo raro no sea tan raro que nadie lo vea: con una visita y una historia al mes, quien abre dos veces por semana encuentra algo nuevo casi cada semana.',
   'Ordena todo lo aprobado y lo nuevo con una sola pregunta: ¿cada cuánto pasa?',
   'c51', badges=[SISTEMA],
   por='«Lo común es discreto, lo raro es memorable.» Si la piñata saliera cada sábado dejaría de ser la piñata.')
n5(225, 'El mapa de rutinas reparte el presupuesto', 'si', 'S', HOY,
   'Una sola tabla (hora × lugar del valle) dice quién ocupa cada sitio en cada franja y cuánto pesa: nodos, animaciones y quién tiene el movimiento. Si una idea nueva quiere un sitio ocupado, tiene que decir a quién releva. El banco de rendimiento lee esa tabla y falla si una franja se pasa.',
   'En /guia (solo tú), junto al almanaque de la 135: el mapa del día con sus cifras.',
   '0 nodos en la escena. Es documentación viva y una prueba.',
   'Mantenerla al día: por eso la lee el banco; si alguien añade algo sin declararlo, el banco falla.',
   'Es la forma de que quepa más vida: turnos que reemplazan en vez de sumar, y la vida repartida en el tiempo.',
   'c51', badges=[SISTEMA], requiere=[],
   por='Un turno nuevo cuesta 0 nodos porque rehace el mismo grupo de vecinos. El mapa convierte ese truco en regla: en el pueblo nada se suma, todo se releva.')
n5(226, 'El movimiento también tiene un solo dueño', 'si', 'S', SITIO,
   'La regla de «uno en movimiento a la vez» pasa a manos del director: el día que hay una visita o un momento grande, el que se mueve es alguien de ese foco (el malabarista del circo, el arroz de la boda) y el de la rutina (la pelota, la que barre) descansa esa franja.',
   'Las franjas de movimiento de siempre. No cambia la regla: la hace explícita y la reparte.',
   '0 nodos, 0 animaciones de más: el actor del foco usa la capa del actor que ya existe (campamento 37) y releva al de la rutina.',
   'Cada actor nuevo es una animación de transform u opacity en la capa pequeña, medida con el banco. Si el día más cargado baja de 55 fps, ese actor se queda quieto.',
   'Sin esto, lo raro saldría siempre quieto mientras la pelota de todos los días bota al lado: el ojo se iría a lo común.',
   'c51', badges=[SISTEMA, MUEVE4], requiere=[BANCO], franja='la de la rutina, que cede',
   por='Es la 210 (la franja de fiesta) generalizada a visitas e historias.')
n5(227, 'Mañana no es igual que hoy', 'si', 'S', HOY,
   'La regla de no repetir: el foco de hoy no puede ser el de ayer ni el del mismo día de la semana pasada, y en cada semana hay al menos cuatro focos distintos. Los días sin nada especial, el director elige entre las rutinas de los vecinos por turno: hoy toca fijarse en el pescador, mañana en la maestra.',
   'Todos los días sin fiesta.',
   '0 nodos. Una baraja con semilla por semana.',
   'Que la variedad no rompa las costumbres fijas: la misa del domingo y el sábado de plaza no entran en la baraja.',
   'Es lo que hace que abrir la app cada día tenga algo distinto que mirar, sin añadir ni un dibujo.',
   'c51', badges=[SISTEMA],
   por='Amplía la 141 (variedad de un día a otro) de «otro reparto» a «otro protagonista».')
n5(228, 'La línea de hoy puede contar el foco', 'si', 'S', HOY,
   'Cuando «lo del día» no tiene nada que decir, puede contar el foco con una frase corta y sin verbos de mandar: «Hoy llegó el circo al valle», «El globo amaneció en el maquilishuat». También la usa la descripción para lectores de pantalla (148).',
   'Donde ya sale «lo del día» (campamento 11) y en la descripción de la montaña. Nunca en la entrada ni en un aviso push.',
   '0 nodos. Unas ochenta frases cortas.',
   'Nada que suene a consejo o a invitación a comprar; nada sobre personas. Lo de siempre de «lo del día» manda: el foco solo ocupa el hueco.',
   'Ayuda a encontrar lo raro a quien no lo vio a la primera, y da el valle a quien no ve.',
   'c51', badges=[SISTEMA],
   por='La app informa: también puede informar de lo que pasa en su propio paisaje. Sin avisos: avisar «hoy hay circo» sería empujar a abrir.')
n5(229, 'Los de la cumbre se asoman a mirar lo que pasa abajo', 'despues', 'M', SITIO,
   'El día que hay algo grande en el valle (el circo, la boda, la feria), los tres de la cumbre están inclinados, mirando hacia abajo. No hablan: señalan con la mirada dónde está el foco.',
   'La cumbre, solo los días de foco raro, de día.',
   'Una pose más de cabeza (inclinada): unos 4 nodos dentro de los osos, que van en 35 de 40 y llegan a 39 con dormirse. No cabe sin la 129 (subir el tope de 40 a 46).',
   'No es «te esperan» ni mira cuánto falta: miran el pueblo. Aun así, moverles la cabeza toca lo que costó decidir en el campamento 25.',
   'Une la cumbre con el valle con un gesto mínimo, pero exige cambiar el tope de los osos: lo decides tú marcando la 129.',
   'c51', badges=[REGLA4], requiere=[TOPE_OSOS], os=4,
   por='Es el único puente entre los peluches de la familia y la vida del pueblo sin que bajen (descartado) ni hablen.')

# ================================================================ 52 · Vecinos con oficio
n5(230, 'Ocho vecinos de siempre, cada uno con su prenda', 'si', 'M', HOY,
   'El pueblo deja de tener figurantes y pasa a tener gente: el panadero (bicicleta y camisa roja), la tortillera que de noche es la pupusera (delantal), la maestra (un libro bajo el brazo), el pescador (sombrero y atarraya), el sacristán (de oscuro, con sus llaves), la de la tienda (canasto), el milpero (chuzo y sombrero) y la abuela del corredor. Cada uno conserva su color y su prenda en todos los turnos.',
   'Todo el pueblo, todos los días.',
   '0 a +1 nodos, medido contra el mismo día sin prototipo (todos los vecinos van en un trazo por tono). Cambia que el color de la ropa lo fija la persona y no el turno.',
   'Ninguno lleva nombre ni representa a nadie de la familia; el número de osos sigue dependiendo solo de la pantalla; las ventanas, que son de las personas con cuenta, no se tocan.',
   'Reconocer a alguien es lo que convierte un decorado en un pueblo.',
   'c52', badges=[SISTEMA, QUIETO4], imgs=['s-pan1', 's-pan2'],
   por='Hoy un oso de camisa roja es el panadero a las 5:30 y un campesino cualquiera a las 9:00. Con prenda fija, lo sigues con la vista durante el día.')
n5(231, 'El día del panadero', 'si', 'S', HOY,
   'A las 4:30 su horno es la única luz del pueblo; a las 5:30 sale en la bicicleta con el canasto lleno; a las 7:30 está en el atrio; a las 10:00 reparte en la plaza y los oseznos se le acercan; a mediodía deja la bicicleta junto al comal y almuerza con la tortillera; de 13:00 a 14:00 la bicicleta está recostada en su pared; por la noche hace fila en las pupusas.',
   'El pueblo, de 4:30 a 21:00. No pedalea: cada vez que abres está en el sitio de esa hora (salvo su cruce de las 7:00, la 116).',
   '0 nodos: es el mismo dibujo en otro sitio. Medido en las cuatro horas de la maqueta: 853, 853, 852 y 854 nodos; el mismo día sin prototipo, 853, 861, 861 y 853.',
   'Que su recorrido no tape el foco del día: en fiesta, el panadero hace lo de la fiesta.',
   'Es la demostración de todo el sistema, y la más barata.',
   'c52', badges=[QUIETO4], imgs=['s-pan1', 's-pan2', 's-pan3', 's-pan4'],
   por='Junta la 140 (antes del alba) y la 116 (cruza la calle) en una vida entera.')
n5(232, 'La maestra y su escuela', 'si', 'S', HOY,
   'A las 6:45 la maestra abre; a las 7:00 los oseznos entran en fila con su bolsón; a las 9:30 hay recreo y la plaza se llena veinte minutos; a las 12:00 es la salida (137); por la tarde corrige cuadernos en su corredor. En vacaciones lee en la hamaca. El viernes sale con un ramo: se lo dieron los oseznos.',
   'Entre semana, del 16 de enero al 14 de noviembre. La escuela es una de las casas de hoy: no se dibuja un edificio nuevo.',
   '0 nodos: turnos y una pose (con libro).',
   'El recreo es el momento en que más oseznos hay: nunca más de los ocho de siempre.',
   'Da razón de ser a los oseznos con bolsón de la 137 y un ritmo a la mañana.',
   'c52', badges=[QUIETO4])
n5(233, 'El pescador: del lago a la plaza', 'si', 'S', HOY,
   'Al alba está en su cayuco en el centro del lago (175); a las 9:00 vuelve por la calle con una sarta de pescado; a las 10:00 la vende en la plaza; por la tarde remienda la atarraya sentado en su corredor, con la red tendida al lado; las noches de cuarto creciente sale otra vez, con un farolito en el cayuco.',
   'El lago y el pueblo. El farolito de noche, solo en pantallas anchas (ahí se ve el lago entero).',
   '0 nodos de día. El farolito: 1 nodo de noche en pantallas anchas.',
   'El cayuco con farol es una luz más de noche: quieta, sin titilar.',
   'Une el lago con el pueblo: hoy son dos postales separadas.',
   'c52', badges=[QUIETO4], nb=0, otros='+1 de noche en pantallas anchas',
   por='La garza y el cayuco con horario (175) y el pescador de la orilla (206) pasan a ser una misma persona con su día.')
n5(234, 'El sacristán abre, toca y cierra', 'si', 'S', HOY,
   'A las 5:30 abre la puerta de la iglesia (el vano pasa de oscuro a claro); a las 12:00 es quien está junto a la torre cuando la campana se mece (25); al anochecer enciende la luz de la iglesia (147) y a las 21:00 cierra. Los domingos barre el atrio antes de misa.',
   'El atrio y la iglesia.',
   '0 nodos: la puerta es una clase que cambia de tono.',
   'No sube a la torre (quedaría contra el cielo) ni toca nada que suene: todo es mudo.',
   'Da un porqué a cosas que ya pasan solas: la campana y las luces.',
   'c52', badges=[QUIETO4],
   por='En la v4 descarté al farolero por no poder afirmar la costumbre. El sacristán sí es de aquí y hace el mismo papel: alguien enciende el pueblo.')
n5(235, 'Encuentros: cuando dos recorridos se cruzan', 'si', 'M', HOY,
   'A ciertas horas dos vecinos coinciden y se nota: el panadero y la tortillera almuerzan juntos; la maestra se sienta un rato con la abuela; el pescador deja un pescado en el corredor del sacristán; el milpero y el panadero se saludan con el brazo. Cada día, un encuentro distinto de una baraja de doce.',
   'El pueblo, una vez por la mañana y otra por la tarde.',
   '0 nodos. Dos poses nuevas hechas con piezas que ya existen (saludo con el brazo, sentados uno frente a otro).',
   'Dos osos juntos no se montan uno sobre otro (la regla de roce ya existe) y no «hablan»: no hay globos ni gestos de boca.',
   'Es lo que el título promete: vidas que se cruzan, no ocho recorridos sueltos.',
   'c52', badges=[QUIETO4], imgs=['s-pan4'])
n5(236, 'El recado del día', 'si', 'S', HOY,
   'Cada día un osezno lleva algo de una casa a otra, y lo ves según la hora: sale con un huacal tapado, a media calle, llegando al otro corredor, y de vuelta con las manos vacías (o con un dulce). Un día son tortillas, otro flores, otro un pollito en una caja.',
   'La calle del pueblo, de 8:00 a 11:00 o de 15:00 a 17:00, según el día.',
   '0 nodos: un osezno de los de siempre con otro objeto en la mano.',
   'Es chico: tiene que leerse a 390 px. Los objetos, de tres o cuatro trazos y de color vivo.',
   'Una historia de un día, mínima, que cambia a diario.',
   'c52', badges=[QUIETO4])
n5(237, 'Las cosas de cada quien', 'si', 'S', HOY,
   'La casa de cada vecino se reconoce por lo suyo, no por sus ventanas: la bicicleta recostada en la pared del panadero cuando está dentro, la atarraya tendida en el corredor del pescador, el comal fuera de la casa de la tortillera, la escoba junto a la puerta de la que barre.',
   'Las casas del pueblo. El objeto está cuando su dueño está en casa.',
   '0 nodos: son piezas del mismo grupo de vecinos, sin pie.',
   'Las ventanas encendidas cuentan a las personas con cuenta: aquí no se toca ni una. Solo objetos fuera, en la pared o el corredor.',
   'Hace que «no está» también se lea: la bicicleta no está, el panadero anda repartiendo.',
   'c52', badges=[QUIETO4])
n5(238, 'La semana de cada oficio', 'si', 'S', HOY,
   'Los oficios tienen semana: el lunes el panadero descansa (no hay bicicleta y la vendedora trae el pan en su canasto); el pescador no sale con luna llena; la tortillera hace tamales los sábados (la olla en vez del comal); el milpero baja al pueblo solo jueves y domingo.',
   'El pueblo, según el día de la semana y la luna.',
   '0 nodos.',
   'Que una ausencia no parezca un fallo: siempre hay algo en su lugar.',
   'Sin esto, ocho rutinas idénticas cada día serían un reloj, no un pueblo.',
   'c52', badges=[QUIETO4])

# ================================================================ 53 · Historias de varios días
n5(239, 'El motor de las historias', 'si', 'M', HOY,
   'Un calendario de capítulos: cada historia dice en qué fechas ocurre y qué se ve cada día. Solo hay una historia a la vez, ninguna cae en semana de fiesta y entre una y otra hay al menos cinco días tranquilos. Unas diez o doce al año. Las historias lentas (el nido, la milpa, la gallina) van de fondo durante semanas y no cuentan como foco.',
   'El valle entero. Es la pieza que usan las ideas 240 a 248.',
   '0 nodos: una tabla y su prueba (ningún día del año con dos historias ni con historia y fiesta).',
   'Todo sale de la fecha: no avanza «si entras», no guarda nada en el aparato y no lee los cumpleaños ni nada de la familia. Si alguien no abre la app esos días, se la pierde, y no pasa nada.',
   'Es lo que da ganas de volver mañana sin pedirlo.',
   'c53', badges=[SISTEMA, HISTORIA],
   por='Las «pequeñas historias de tres días»: el valle cambia de un día para otro y se nota al abrir.')
n5(240, 'La ramada de la atolada', 'si', 'S', HOY,
   'El jueves aparecen cuatro horcones en la plaza y las palmas apiladas; el viernes la ramada ya tiene techo y un vecino lo termina desde su escalera; el sábado, debajo, la atolada (155) con banderines, guitarra y elotes; el domingo quedan los horcones solos y el lunes ya no hay nada.',
   'La plaza, dos veces al año: un sábado de julio y uno de agosto, con la atolada.',
   '0 nodos (medido el sábado: 855; el mismo sábado sin prototipo, 856). La ramada es una pieza sin pie del grupo de los vecinos.',
   'La ramada es lo más alto que se pone en la plaza: en la maqueta queda bajo la copa del árbol, no contra el cielo.',
   'La atolada ya estaba aprobada; ahora se ve venir y deja rastro.',
   'c53', badges=[HISTORIA, QUIETO4], imgs=['s-ramada1', 's-ramada2', 's-ramada3'])
n5(241, 'Nace un osezno en el pueblo', 'si', 'S', HOY,
   'Día 1: delante de una casa amanece un tendedero lleno de pañales. Día 2: llegan las vecinas de visita con una olla, flores y un huacal. Día 3: la vecina sale al corredor con el osezno en brazos, envuelto en su manta, y medio pueblo se asoma. Desde entonces, algunas tardes se la ve con él.',
   'Una casa del pueblo, una vez al año, en una fecha fija del calendario (marzo).',
   '0 nodos (medido: 852 y 853; el mismo día sin prototipo, 860).',
   'La fecha es del calendario del valle, no de la familia: el motor no conoce los cumpleaños, y esto nunca sale en la cumbre ni en la entrada. Es un osezno del pueblo, sin nombre.',
   'La historia más tierna con el costo más bajo: tres turnos.',
   'c53', badges=[HISTORIA, QUIETO4], imgs=['s-bebe1', 's-bebe2', 's-bebe3'])
n5(242, 'El globo que se escapa', 'si', 'S', HOY,
   'Domingo: el de los globos está en la plaza y un osezno se lleva uno rojo. Lunes: el globo amaneció enredado en el árbol de la plaza y los oseznos lo miran desde abajo. Martes: está en la cumbre, atado a una piedra junto a los tres osos. Miércoles: ya no está.',
   'La plaza dos días y la cumbre uno. Dos veces al año.',
   'En el pueblo, 0 nodos (medido: 855 y 853; sin prototipo, 855). En la cumbre, 3 nodos ese día, fuera del grupo de los osos.',
   'En la maqueta a 1440 px el globo queda dentro de la nieve; a 390 px queda justo en el borde, casi contra el cielo. Al implementar va delante de los osos, no a su derecha, o no sale en el teléfono. Ocupa el único sitio libre junto a los osos: ese día no hay otro objeto (267).',
   'Une el valle con la cumbre con una historia que se entiende sin una palabra.',
   'c53', badges=[HISTORIA, QUIETO4], imgs=['s-globo1', 's-globo2', 'c-globo', 'c-globo-e'], otros='+3 un día, en la cumbre',
   por='Es la primera idea en que algo del pueblo llega arriba: los osos de la familia no bajan, pero el valle puede subirles un regalo.')
n5(243, 'La casa que se pinta', 'si', 'M', HOY,
   'Cada febrero una casa del pueblo cambia de color en tres días: el primero, la escalera y los botes; el segundo, media pared ya es del color nuevo; el tercero, entera, y dos vecinos la miran. El color se queda todo el año.',
   'Una casa distinta cada año, la primera semana de febrero.',
   '+1 trazo los dos días de obra (la media pared); después, 0: la casa solo cambia de clase de color.',
   'Los colores son los de la paleta del pueblo (cal, añil, ocre, rosa viejo). No hay maqueta: las paredes de un color van en un solo trazo y pintar media casa pide partirlo.',
   'El pueblo del año que viene no será idéntico al de este.',
   'c53', badges=[HISTORIA, QUIETO4], nb=0, otros='+1 dos días de febrero')
n5(244, 'Llega el circo', 'si', 'M', HOY,
   'Cinco días de enero, en vacaciones. Día 1: la lona tendida en la plaza y un oso en zancos que ya anda probando. Día 2: la carpa a rayas, levantada. Días 3 y 4: función al anochecer, con el malabarista fuera y los vecinos llegando con los oseznos en hombros. Día 5: se fueron; queda el redondel de aserrín hasta que lo barren.',
   'La plaza, del 8 al 12 de enero (todavía son vacaciones y ya pasó la Navidad). Sin animales y sin rueda.',
   '0 nodos (medido: 852; los mismos días sin prototipo, 860 y 854). Si el malabarista se mueve, es el actor de esa franja (226).',
   'La carpa es grande para la plaza: en la maqueta queda entre los dos faroles y bajo el árbol. Hay que componerla bien a 320 px.',
   'Es la visita grande del año: cinco días con algo distinto cada uno.',
   'c53', badges=[HISTORIA, RARO], imgs=['s-circo1', 's-circo2', 's-circo2-e', 's-circo-entera'])
n5(245, 'El cayuco nuevo', 'si', 'S', HOY,
   'Seis días en la orilla del lago: las costillas del cayuco sobre dos troncos, luego el casco, luego la pintura, y el último día los vecinos lo empujan al agua. Desde entonces hay dos cayucos en el lago.',
   'La orilla del lago, en pantallas anchas. En el teléfono solo se ve el final: un segundo cayuco.',
   '2 a 3 nodos durante la obra y 2 para siempre (el segundo cayuco), en pantallas anchas.',
   'Exige el presupuesto de pantallas anchas (131). En el teléfono, el segundo cayuco solo si cabe en el lago que se ve.',
   'Una historia para quien mira en escritorio o en la tele, donde el lago tiene sitio.',
   'c53', badges=[HISTORIA, ANCHO], requiere=[ANCHAS], otros='+2 en pantallas anchas')
n5(246, 'El nido del torogoz', 'si', 'S', HOY,
   'De marzo a junio el torogoz deja de estar solo. Primero va y viene al mismo barranco (posado en la misma rama, 177); semanas después son dos; y unos días de junio, tres en fila en la rama: el pichón. Luego vuelve a ser uno hasta el año siguiente.',
   'El árbol del primer día y el barranco, durante semanas: la historia lenta del año.',
   '1 a 2 nodos más cuando hay dos o tres posados.',
   'Dato por confirmar contigo: que el torogoz anida en túneles en los paredones y cría entre marzo y junio.',
   'No todas las historias duran tres días: esta se nota de un mes a otro.',
   'c53', badges=[HISTORIA, QUIETO4], nb=0, otros='+2 en junio')
n5(247, 'El mural de la escuela', 'si', 'S', HOY,
   'Una semana de octubre los oseznos pintan una pared: el lunes solo hay botes y brochas; cada día aparece algo más (un sol, un volcán, el torogoz), y el viernes posan delante. El mural se queda hasta el octubre siguiente, cuando lo cambian.',
   'La pared lateral de una casa del pueblo, la tercera semana de octubre (ninguna fiesta cerca).',
   '+1 trazo para siempre (el mural, de tres colores planos).',
   'A 390 px el mural mide unos 10 px: tres manchas de color y nada más. Sin letras.',
   'Algo hecho por los oseznos que se queda a la vista todo el año.',
   'c53', badges=[HISTORIA, QUIETO4], nb=1)
n5(248, 'Cada año deja algo', 'si', 'M', HOY,
   'Las historias no se borran del todo: el segundo cayuco, la casa repintada, el mural, una banca nueva en la plaza. El valle del tercer año no es el del primero. Lo decide el año del calendario, igual para todos.',
   'Todo el valle, de un año para otro.',
   'Un tope escrito: como mucho 12 nodos acumulados por obras; al llegar, la obra más vieja se «gasta» y deja sitio.',
   'Que no sea una deuda que crece: por eso el tope y por eso lo vigila el banco.',
   'El libro es de largo plazo; su paisaje también puede serlo.',
   'c53', badges=[SISTEMA], nb=4,
   por='El saldo crece con los años. Que el pueblo también tenga años es coherente con lo que es la app.')

# ================================================================ 54 · La memoria del día
n5(249, 'Lo que quedó de ayer', 'si', 'S', HOY,
   'La mañana después de cada fiesta el pueblo amanece con su rastro: papelitos de la piñata el 2 de octubre, arroz en el atrio tras una boda, farolitos apagados el 15 de septiembre, pétalos el lunes de Pascua. A las 7:00 alguien barre, y a las 9:00 ya no queda nada.',
   'La plaza y el atrio, de 5:00 a 9:00, el día siguiente a una fiesta o visita.',
   '0 nodos (medido: 864; el mismo día sin prototipo, 870).',
   'Que no parezca abandono: pocos trazos, colores de fiesta, y siempre alguien recogiendo.',
   'Hace que la fiesta de ayer haya pasado de verdad.',
   'c54', badges=[MEMORIA, QUIETO4], imgs=['s-confeti'],
   por='La 214 (la pólvora del 1 de enero) ya lo hace una vez; esto lo vuelve costumbre.')
n5(250, 'Charcos que se secan', 'si', 'S', HOY,
   'Al escampar hay tres charcos en la plaza y dos oseznos saltando; a las 18:30 quedan dos, más chicos, y un solo osezno; a las 19:30, un charquito; a las 21:00, ninguno. Si llovió fuerte (junio y septiembre), duran una hora más.',
   'La plaza, las tardes de la época lluviosa, de 17:45 a 21:00.',
   '0 nodos (medido: 854 y 856; sin prototipo, 856).',
   'El tono del charco tiene que leerse de día y de noche sin parecer una sombra.',
   'La lluvia deja de terminar de golpe.',
   'c54', badges=[MEMORIA, QUIETO4], imgs=['s-charco3', 's-charco2', 's-charco1'],
   por='Sustituye a la 166 (charcos de 17:45 a 18:30), que se funde aquí.')
n5(251, 'Huellas en la nieve', 'si', 'S', HOY,
   'Cuando los de la cumbre se estiran a las 7:00, dejan pisadas en la nieve a su alrededor. A media mañana el sol las ha borrado. En diciembre, alrededor del oso de nieve (185) hay más.',
   'La cumbre, de 7:00 a 10:00.',
   '1 nodo (un trazo de puntos), fuera del grupo de los osos.',
   'Dentro de la nieve, junto a ellos, sin acercarse al borde: nada contra el cielo.',
   'Los osos también hicieron algo antes de que abrieras.',
   'c54', badges=[MEMORIA, QUIETO4], nb=0, otros='+1 de 7:00 a 10:00')
n5(252, 'Las sillas se quedan', 'si', 'S', HOY,
   'Después de la fresca (139) la gente se va a dormir, pero las sillas se quedan en la acera toda la madrugada. El primero que se levanta las mete. Lo mismo la mesa de Nochebuena: sigue puesta, vacía, hasta la mañana del 25.',
   'La calle, de 22:00 a 5:00.',
   '0 nodos: el turno «duerme» deja de estar vacío.',
   'De madrugada el pueblo duerme: sillas quietas, sin nadie.',
   'El pueblo dormido deja de ser un pueblo vacío.',
   'c54', badges=[MEMORIA, QUIETO4])
n5(253, 'El día se acumula', 'si', 'S', HOY,
   'Lo que se llena y se vacía: el canasto del panadero sale lleno y a mediodía va casi vacío; la pila de tortillas crece hasta las 12:30; el canasto de mangos se llena durante la mañana; la leña junto al fogón de la pupusera baja durante la noche.',
   'El pueblo, a lo largo del día.',
   '0 nodos: dos o tres variantes de cada objeto.',
   'Diferencias pequeñas, que se noten al comparar dos horas pero no griten.',
   'El detalle para quien mira dos veces al día.',
   'c54', badges=[MEMORIA, QUIETO4])
n5(254, 'La pelota olvidada', 'si', 'S', HOY,
   'A las 16:30 los oseznos se van y la pelota se queda donde cayó. Ahí sigue de noche, bajo el farol, y de madrugada. A las 7:00 un osezno la recoge de camino a la escuela.',
   'La plaza, de 16:30 a 7:00.',
   '0 nodos: es la pelota de siempre, que no desaparece.',
   'De noche va quieta. Los días de lluvia se la llevan.',
   'Un detalle mínimo que cuenta que ahí hubo juego.',
   'c54', badges=[MEMORIA, QUIETO4])
n5(255, 'El chucho se acuerda', 'si', 'S', HOY,
   'El perro duerme donde hubo comida o cariño: la madrugada después de las pupusas amanece junto al puesto; después de la fresca, bajo la silla de la abuela; tras el circo, en el redondel de aserrín.',
   'El pueblo, de 22:00 a 6:00.',
   '0 nodos: el perro de siempre, en otro sitio.',
   'Nunca sobre el sendero ni contra el cielo.',
   'El perro pasa a ser el hilo que une lo que pasó ayer con hoy.',
   'c54', badges=[MEMORIA, QUIETO4],
   por='Completa la 145 (el perro tiene su día) por la noche.')

# ================================================================ 55 · Encuentros raros y visitas de fuera
n5(256, 'Las visitas se anuncian y dejan rastro', 'si', 'S', HOY,
   'Toda visita tiene tres actos: la víspera (algo la anuncia: la lona, los horcones), el día, y el rastro (aserrín, arroz, papelitos). Así, aunque no abras el día exacto, te enteras de que pasó algo.',
   'Regla para todas las visitas del 53 y el 55.',
   '0 nodos.',
   'Que el anuncio no sea un cartel con letras: objetos.',
   'Lo raro se vuelve encontrable sin avisos.',
   'c55', badges=[SISTEMA])
n5(257, 'El de los globos', 'si', 'S', HOY,
   'Un domingo al mes, por la tarde, un oso con sombrero y un racimo de globos de colores en la plaza. Un osezno ya lleva el suyo.',
   'La plaza, un domingo al mes, de 15:00 a 17:30.',
   '0 nodos (medido: 855; sin prototipo, 855).',
   'Los globos son lo más alto de la plaza esa tarde: bajo la copa del árbol.',
   'Color y alegría con una sola figura.',
   'c55', badges=[RARO, QUIETO4], imgs=['s-globo1'])
n5(258, 'El fotógrafo de la plaza', 'si', 'S', HOY,
   'Un domingo cada dos meses, un fotógrafo con su cámara de cajón en trípode y su caballito de madera. Un osezno posa montado y otro espera su turno con su mamá.',
   'La plaza, de 9:00 a 12:00.',
   '0 nodos (medido: 851; sin prototipo, 852).',
   'Que el caballito se lea: en la maqueta es chico; pide un color más vivo.',
   'Una estampa de parque de pueblo que muchos recuerdan.',
   'c55', badges=[RARO, QUIETO4, DUDOSO4], imgs=['s-foto'],
   por='Para que lo diga la familia: si en los parques de aquí el fotógrafo del caballito es tan de antes como creo.')
n5(259, 'Una boda', 'si', 'S', HOY,
   'Un sábado al año, a las 16:30, los novios salen de la iglesia: ella de blanco, él de oscuro, el padre en la puerta, dos vecinas echando arroz y uno con guitarra. A la mañana siguiente hay arroz en el atrio (249).',
   'El atrio, un sábado de febrero.',
   '0 nodos (medido: 853; sin prototipo, 855).',
   'Los novios son del pueblo: sin nombres y sin fecha de nadie.',
   'El encuentro del año: quien lo ve, lo cuenta.',
   'c55', badges=[RARO, QUIETO4], imgs=['s-boda', 's-boda-e'])
n5(260, 'El paletero, a pie', 'si', 'S', HOY,
   'Los domingos de marzo y abril, a la hora del calor, un paletero cruza la plaza a pie, con su hielera al hombro y una paleta en la mano. Los oseznos lo rodean.',
   'La plaza, de 14:00 a 15:30. Sin carretón y sin campana.',
   '0 nodos (medido: 853; sin prototipo, 854).',
   'En la v4 dejé fuera al paletero con carretón por parecerse a la carreta descartada. Esta versión va a pie. Si aun así te recuerda a la carreta, no la marques.',
   'Marzo y abril son los meses de más sol: el paletero es su visita natural.',
   'c55', badges=[RARO, QUIETO4, REABRE], imgs=['s-paletero'])
n5(261, 'El cine en una sábana', 'si', 'M', HOY,
   'Una noche de verano al mes, alguien cuelga una sábana blanca entre dos postes en la plaza y los vecinos se sientan en sus sillas, de espaldas a nosotros, a mirar. Una luz cálida da en la sábana. No se ve qué pasan.',
   'La plaza, un sábado al mes de noviembre a abril, de 19:30 a 21:30.',
   '0 nodos: la sábana del tendedero, los sentados y los de espaldas ya existen.',
   'La luz en la sábana es un trazo quieto, sin parpadeo. No es la tele en una ventana (descartada): es en la plaza y de todos.',
   'Todo el pueblo junto, de noche, hecho con piezas que ya hay.',
   'c55', badges=[RARO, QUIETO4, DUDOSO4],
   por='Para que lo diga la familia: el cine ambulante de pueblo, ¿les suena de aquí?')
n5(262, 'El viajero', 'si', 'S', HOY,
   'Una vez al mes, un oso de fuera, con sombrero y un maletín, pasa el día en el pueblo: por la mañana llega por el camino real, a mediodía come tortillas donde la tortillera, por la tarde mira la iglesia de espaldas, y al anochecer se va por el otro lado.',
   'El pueblo, de 8:00 a 18:00, un día entre semana.',
   '0 nodos.',
   'Tiene que distinguirse de los vecinos: su maletín y un color de ropa que nadie más lleva.',
   'Una historia de un solo día contada en cuatro sitios.',
   'c55', badges=[RARO, QUIETO4])
n5(263, 'El telescopio de luna nueva', 'si', 'S', HOY,
   'La noche de luna nueva, la más oscura, un vecino saca un telescopio a la plaza y los oseznos hacen fila para mirar. Esa noche hay más estrellas a la vista.',
   'La plaza, la noche de luna nueva, de 19:30 a 21:00.',
   '0 nodos en el pueblo. Las estrellas de más ya existen (se enseñan todas).',
   'El telescopio apunta al cielo, no a la cumbre ni a «cuánto falta».',
   'Da un papel a la luna nueva, que hoy es la noche en que no pasa nada.',
   'c55', badges=[RARO, QUIETO4])
n5(264, 'Los raros de la madrugada', 'si', 'S', HOY,
   'Quien abre de madrugada a veces ve algo: el tecolote en su rama (173), un cusuco parado a media calle, un tacuazín en el borde de un tejado. Una noche de cada cuatro, y nunca dos a la vez.',
   'El pueblo, de 23:00 a 4:30.',
   '0 nodos: ocupan el sitio del tecolote.',
   'Quietos, como todo de noche. El tacuazín va en un tejado que tiene loma detrás, no cielo.',
   'La madrugada pasa a tener sus propios secretos.',
   'c55', badges=[RARO, QUIETO4])
n5(265, 'El primer aguacero', 'si', 'S', HOY,
   'El primer día de lluvia del año (mediados de mayo), a las 15:00, medio pueblo está en la calle mirando hacia arriba: los oseznos con los brazos en alto, la abuela en su corredor, y la ropa del tendedero recogida a medias.',
   'El pueblo, una tarde al año.',
   '0 nodos.',
   'La fecha es del calendario (la misma cada año), no del clima real, que está descartado.',
   'Es el día que todo el país espera: merece su momento.',
   'c55', badges=[RARO, QUIETO4])
n5(266, 'Los historiantes', 'despues', 'M', HOY,
   'El día de la fiesta de agosto, cuatro osos con capa y corona de espejos y listones, formados frente a la iglesia: la danza de los historiantes.',
   'El atrio, el 6 de agosto por la mañana.',
   '0 nodos.',
   'No estoy seguro de que sea de tu zona ni de dibujarla bien a este tamaño.',
   'Es muy de aquí, pero prefiero que lo diga la familia antes de proponerla en firme.',
   'c55', badges=[RARO, QUIETO4, DUDOSO4])

# ================================================================ 56 · La cumbre y «Tú», a tu ritmo
n5(267, 'El baúl de la cumbre: un solo objeto a la vez', 'si', 'M', HOY,
   'Junto a los tres osos hay un único sitio, y cada día lo ocupa una sola cosa: el oso de nieve en diciembre (185), los regalos el 25 (186), el paraguas en las tardes de lluvia (26), el sombrero de marzo, la banderita de septiembre, el globo que llegó (242), las tazas del día de etapa (268) o nada. Si coinciden dos, manda la más rara.',
   'La cumbre, a la derecha de los osos.',
   'Como mucho 3 a 5 nodos, fuera del grupo de los osos, y nunca dos objetos a la vez: el peor día pesa lo que el oso de nieve de hoy.',
   'Medido a 390 px: a la derecha de los osos la nieve se acaba enseguida. En las maquetas, la tercera taza y el globo quedan en el borde, y un canasto ya quedaba contra el cielo. El sitio del teléfono tiene que ser delante de los osos (como el oso de nieve), chico y pegado a ellos.',
   'Ordena siete ideas aprobadas que, juntas, no cabían.',
   'c56', badges=[SISTEMA, QUIETO4], imgs=['c-globo', 'c-tazas'],
   por='Aquí se funden la 189 (sombrero) y la 190 (banderita), que eran «un objeto más según la fecha».')
n5(268, 'Chocolate el día que cruzas una etapa', 'si', 'S', HOY,
   'El día que una compra cruza una etapa, además del festejo de siempre, los tres pasan el resto del día con tres tacitas humeantes en la nieve. A medianoche ya no están.',
   'La cumbre, el día de la etapa, hasta la medianoche.',
   '3 nodos ese día (las tazas, en un trazo por color), en el sitio del baúl.',
   'Sale por algo alcanzado; los demás días no falta nada: no hay tazas vacías ni mesa puesta esperando. En la maqueta a 390 px la tercera taza toca el borde de la nieve: hay que juntarlas delante de los osos.',
   'Alarga la alegría de una etapa más allá de los segundos de la celebración.',
   'c56', badges=[RITMO, QUIETO4], imgs=['c-tazas'], otros='+3 el día de una etapa')
n5(269, 'El cordel de banderines de «Tú»', 'si', 'S', HOY,
   'Cuando «Tú» acampa (191), entre la carpa y el palito hay un cordel con banderines: uno por cada 25 compras anotadas en el libro, hasta doce. Nunca baja.',
   'El sitio de «Tú», de 22:00 a 5:00.',
   '1 nodo (todos los banderines en un trazo).',
   'Cuenta compras hechas, no rachas: una pausa de meses no quita nada. No va en la entrada.',
   'Lo acumulado se ve, y solo crece.',
   'c56', badges=[RITMO, QUIETO4], nb=1)
n5(270, 'La regla de oro, con su prueba', 'si', 'S', HOY,
   'Una prueba automática que protege lo más importante: la escena de alguien que lleva sesenta días sin anotar es idéntica a la de alguien que anotó ayer, salvo lo alcanzado (dónde va «Tú», sus parches, sus banderines). Ningún gesto sale por una ausencia, y una venta o un traslado no producen ninguno.',
   'En test_lib y test_ui. No se ve.',
   '0 nodos.',
   'Ninguno: es un seguro.',
   'Con más gestos ligados a las compras, la regla necesita un guardián que no dependa de acordarse.',
   'c56', badges=[SISTEMA],
   por='La app informa y nunca recomienda. Los osos no esperan, no se aburren y no regañan.')
n5(271, 'La semana de la cumbre', 'si', 'S', HOY,
   'Los días que el baúl está libre, los tres tienen su costumbre: el lunes un libro abierto en la nieve, el miércoles unas cartas, el viernes un termo, el domingo unos binoculares apuntando al pueblo. Un objeto chico, el mismo sitio.',
   'La cumbre, de día, cuando no hay objeto de fecha.',
   '2 a 3 nodos, en el sitio del baúl (reemplaza, no suma).',
   'Los binoculares miran al pueblo, nunca a «Tú» ni a lo que falta.',
   'Los osos de la familia también tienen días, no solo fechas.',
   'c56', badges=[QUIETO4], otros='+3 de día')
n5(272, 'Las noches de «Tú»', 'si', 'S', HOY,
   'La carpa de «Tú» (191) no es igual cada noche: el lunes hay una silueta leyendo dentro; el jueves, sus calcetines tendidos en el cordel; con luna llena, «Tú» está fuera, sentado, mirándola; con lluvia, la carpa cerrada y el capote colgado del palito.',
   'El sitio de «Tú», de 22:00 a 5:00.',
   '0 a 2 nodos sobre la carpa (variantes, una a la vez).',
   'Quieto. La luz de la carpa está siempre: no dice si anotaste o no.',
   'La noche es cuando más se abre la app después del trabajo: que tenga variedad.',
   'c56', badges=[QUIETO4], nb=2)

# ================================================================ sumadas a campamentos de antes
n5(273, 'El gato de los tejados', 'si', 'S', HOY,
   'Un gato que cada día está en un sitio distinto: en un tejado, sobre un muro, bajo la hamaca, en la banca, junto al comal. Nunca en una ventana. No se toca ni da nada: está, y encontrarlo es cosa tuya.',
   'El pueblo, todo el día; de noche, hecho un ovillo.',
   '0 nodos: una pieza chica del grupo de los vecinos.',
   'No es un juego: sin contador ni premio («todo se puede tocar» y el cuaderno de avistamientos están descartados). En un tejado, solo donde hay loma detrás.',
   'La novedad diaria más barata posible: una pregunta muda, «¿dónde está hoy?».',
   'c43', badges=[QUIETO4])
n5(274, 'La luna manda en el pueblo', 'si', 'S', HOY,
   'Cada fase tiene su noche: con luna llena, cuentos en la plaza (164) y el pescador no sale; en cuarto creciente, el farolito en el cayuco (233); con luna nueva, el telescopio (263) y más estrellas; en menguante, la noche tranquila de siempre.',
   'El pueblo y el lago, de noche.',
   '0 nodos: reparte ideas que ya están.',
   'La luna es la de verdad (ya lo es): solo se le hace caso.',
   'La luna ya se dibuja bien; ahora además significa algo.',
   'c44', badges=[SISTEMA, QUIETO4])
n5(275, 'Dos focos en pantallas anchas', 'despues', 'L', SITIO,
   'En escritorio y en la tele el valle es tan ancho que el pueblo y el lago quedan lejos uno del otro. Ahí podría haber dos cosas en movimiento a la vez: una en el pueblo y otra en el lago o en la loma.',
   'Solo desde 1100 px.',
   'Una animación más a la vista en pantallas anchas.',
   'Cambia la regla de «uno en movimiento a la vez» (22B) para pantallas anchas. No toca el iPhone. Exige el banco (124) y el presupuesto de pantallas anchas (131).',
   'Es la forma honesta de dar más vida a la tele de la sala, pero es una regla tuya: lo decides tú.',
   'c48', badges=[REGLA4, ANCHO], requiere=[BANCO, ANCHAS])

# ================================================================ mejoras de ideas de antes (mismo id, misma recomendación)
mejora(140, 'Pasa a ser el primer acto del día del panadero (231): a las 4:30 no solo carga el canasto; la luz de su horno es la única encendida del pueblo.',
       t='Antes del alba: el horno del panadero', imgs=['s-pan1'])
mejora(141, 'Ya no es solo «otro reparto»: son tres barajas (quién, dónde y con quién) que elige el director (223), con la regla de no repetir (227). Aquí entra la fila de pupusas del fin de semana (142, fundida).',
       t='El pueblo nunca está igual: tres barajas',
       que='Cada turno se arma con tres barajas: quién está (de los ocho vecinos), dónde y con quién se cruza. El día elige una carta de cada una, así que hoy la vendedora está en el atrio con la maestra y mañana en la plaza con el pescador. El fin de semana, la fila de las pupusas llega a ocho. Lo decide la fecha: igual para todos.')
funde(142, 141, 'Era «más de lo mismo» (más osos en la fila). Queda como una carta de la baraja del fin de semana.')
mejora(143, 'El tendedero pasa a contar la semana: no es siempre la misma ropa.',
       t='El tendedero cuenta la semana',
       que='Lunes y jueves hay ropa tendida, y no siempre la misma: el lunes, sábanas; el jueves, los uniformes de la escuela; después de una fiesta, los manteles; la semana que nace el osezno, pañales (241). En la lluviosa se recoge a la una, antes del aguacero, y el día del primer aguacero se queda a medias (265).')
mejora(144, 'Es el modelo de los recorridos del 52: se queda como una vecina más con su día, y gana un porqué (baja a vender lo de su huerta y sube con lo que compró).')
mejora(145, 'El perro deja de ser un adorno que cambia de sitio: acompaña a alguien distinto cada día y de noche duerme donde hubo fiesta (255).',
       t='El chucho del pueblo',
       que='El perro tiene su vida: por la mañana sigue al panadero un trecho, espera a los oseznos a la salida de la escuela, duerme la siesta bajo la hamaca y por la noche se sienta junto a la pupusera, esperando. Cada día acompaña a un vecino distinto.')
mejora(147, 'Las luces ya no se encienden solas: van detrás del sacristán (234), que empieza por la iglesia.')
mejora(152, 'Gana memoria del día (253): el canasto se va llenando durante la mañana, y a mediodía el osezno está sentado comiéndose un mango.')
mejora(154, 'Pasa a ser una historia de capítulos (239) que dura medio año: roza, siembra, primera hoja, elote (y con él la atolada), dobla, tapisca, y al final las vacas en el rastrojo.',
       t='La milpa de este año, por capítulos')
mejora(155, 'La atolada ahora se ve venir: la ramada se levanta el jueves y el viernes (240).', imgs=['s-ramada3'])
mejora(156, 'La fiesta de agosto gana su feria, sin rueda: puestos con toldo a rayas, el de los globos, algodón de azúcar y un malabarista. Hay maqueta.',
       t='5 y 6 de agosto: el pueblo estrena, con su feria', imgs=['s-feria', 's-feria-e'])
mejora(158, 'Deja rastro: la mañana del 2 de octubre hay papelitos en la plaza y alguien barre (249).', imgs=['s-confeti'])
mejora(161, 'Las posadas dejan memoria: la casa visitada conserva su farolito encendido las noches siguientes, así que el 23 hay ocho casas con farol.',
       t='Las posadas, casa por casa',
       que='Del 16 al 23 de diciembre, al anochecer, un grupito con farolitos está frente a una casa: cada noche, una distinta. La casa visitada se queda con un farolito encendido en la puerta, y el 23 ya son ocho.')
mejora(163, 'Al terminar, la pelota se queda en la plaza hasta el lunes (254).')
mejora(164, 'La noche de luna llena gana su porqué: la abuela saca su silla a la plaza y los oseznos se sientan en el suelo a su alrededor. Hay maqueta. Nadie habla: se ve la rueda.',
       t='Luna llena: noche de cuentos', imgs=['s-cuentos', 's-cuentos-e'],
       que='Las noches de luna llena, la abuela saca su silla a la plaza y los oseznos se sientan en el suelo, en rueda, hasta las 20:30. Dos vecinos miran desde sus sillas. Sin globos de texto ni gestos de boca: se entiende por la rueda.')
funde(166, 250, 'Los charcos de 17:45 a 18:30 pasan a ser charcos que se secan hasta las 21:00, con maqueta.')
mejora(167, 'La canícula ya no es «no pasa nada»: son las semanas en que el pueblo saca a secar.',
       t='La canícula: petates al sol',
       que='Del 15 de julio al 15 de agosto las tardes no traen lluvia. El pueblo lo aprovecha: delante de dos casas hay petates con maíz y frijol secándose al sol, y la ropa se queda tendida hasta la tarde.')
mejora(172, 'Pasa a ser el reloj de los animales: un solo sitio en la plaza que ocupa el animal de cada hora (gallo, garrobo, zanates, tecolote). Reemplaza, no suma. Aquí se funde la 54.',
       t='El reloj de los animales',
       que='En la plaza hay un sitio para el animal de la hora: el gallo de 5:00 a 6:00, un garrobo al sol a mediodía en la época seca, tres zanates en fila al atardecer y, algunas noches, el tecolote. Si sabes leerlo, te dice la hora.')
funde(54, 172, 'El garrobo del mediodía es una de las horas del reloj de los animales.')
mejora(173, 'Deja de estar todas las noches: sale una de cada cuatro (264), y nunca con luna llena. Lo raro se recuerda más.')
mejora(175, 'La garza sigue con su horario; el cayuco pasa a ser el del pescador, con su día (233).')
mejora(176, 'Se vuelve historia (239): tres semanas de mayo hay una gallina echada, quieta, en el mismo rincón; luego salen los pollitos, que cada semana son un poco más grandes, y en julio ya son tres gallinas más.',
       t='La gallina echada y sus pollitos')
mejora(178, 'El venado pasa a ser raro: una madrugada de cada cinco.')
mejora(181, 'Esas dos noches «Tú» está fuera de la carpa, sentado, mirando hacia arriba (272).')
mejora(185, 'Es ya una historia de 24 días. Ahora ocupa el sitio del baúl (267) y tiene huellas alrededor (251).')
funde(186, 216, 'Los regalos del 24 y el 25 ya estaban dentro de la 216 (los de la cumbre viven la Navidad).')
mejora(187, 'Los tres festejos dejan de salir al azar: van en proporción a lo que pasó, como la celebración. Compra normal, el saltito; etapa, brazos arriba y chocolate (268); campamento, los tres mirando arriba.',
       t='Tres festejos, en proporción')
funde(189, 267, 'El sombrero de marzo es uno de los objetos del baúl de la cumbre.')
funde(190, 267, 'La banderita de septiembre es uno de los objetos del baúl de la cumbre.')
mejora(191, 'La carpa gana variedad de una noche a otra (272) y su cordel de banderines (269).')
mejora(193, 'Si «Tú» ya va por el último tramo, miran el atardecer los cuatro en la misma dirección.')
mejora(196, 'Queda cubierta por la regla de oro (270): el descanso sale por la compra de hoy, y un día sin compra no enseña nada distinto.')
funde(197, 221, 'La flor del aniversario ya estaba dentro de la 221 (el cumpleaños de la montaña).')
mejora(118, 'Con el director (223), la ronda es el paso siguiente natural: el movimiento pasaría de un actor a otro dentro de una misma visita. Sigue en «después» porque cambia una regla.')
mejora(130, 'Con los campamentos 52 a 55 esta capa gana valor: cada cambio de turno, capítulo o visita repintaría un dibujo de 190×70 px en vez del grande. Si eliges muchas ideas del 52 al 55, márcala.')
mejora(204, 'Con los recorridos del 52, caminar sería unir dos sitios que ya existen. Sigue en «después»: cambia una regla y es lo más caro de todo.')
mejora(206, 'El pescador de la orilla es el mismo del 233, y la orilla gana una obra: el cayuco nuevo (245).')

# ================================================================ lo que descarto de esta ronda
FUERA[0:0] = [
    ('(v5) Un álbum, un contador o una medalla por ver los encuentros raros', 'Es el cuaderno de avistamientos, descartado. Si lo viste, lo viste.'),
    ('(v5) Un aviso push «hoy hay circo en el valle»', 'Empuja a abrir la app. El valle se encuentra, no se anuncia.'),
    ('(v5) Historias que solo avanzan si entras, o que recuerdan dónde te quedaste', 'Sería guardar datos en el aparato y premiar el abrir. Todo sale de la fecha.'),
    ('(v5) Los osos ponen la mesa el día que «te toca» comprar, o una luz que solo se enciende si anotaste', 'Una espera o una ausencia a la vista presiona. Los gestos salen por algo hecho o alcanzado (270).'),
    ('(v5) Vecinos con nombre, o uno por cada persona de la familia', 'Dirían quién es quién. Los oficios no son de nadie.'),
    ('(v5) Luces en las ventanas que sigan a los vecinos', 'Las ventanas cuentan a las personas con cuenta. Los vecinos se reconocen por sus cosas fuera de casa (237).'),
    ('(v5) El farolero', 'Sigue fuera, como en la v4. Su papel lo hace el sacristán (234).'),
    ('(v5) Una rueda en la feria o en el circo, o animales de circo', 'La rueda está descartada, y un pueblo de osos con un circo de animales sería raro.'),
    ('(v5) Temporales de tres días o neblina por sorteo para dar variedad', 'El clima es de calendario; lo de sorteo ya se descartó en la v4.'),
    ('(v5) El panadero sube pan a la cumbre', 'Medido en la maqueta: un canasto junto a los osos queda contra el cielo a 390 px, y subir pisa el sendero.'),
    ('(v5) Tocar al gato o a los vecinos', '«Todo se puede tocar» está descartado. Todo es para mirar.'),
]

# ================================================================ cabecera, principio, sistemas y cuentas
PRINCIPIO = [
    ('Un solo foco de vida por momento', 'Cada vez que abres hay una cosa que encontrar: la fiesta, la visita, el capítulo de hoy o un vecino en su rutina. Lo demás acompaña, quieto.'),
    ('Lo común es discreto, lo raro es memorable', 'Lo de todos los días es chico y callado. Lo que pasa una vez al mes o al año puede ser grande, porque casi nunca está.'),
    ('Todo sale de la fecha y la hora', 'Nada depende de si abriste ni de si compraste, y nada se guarda en el aparato. Toda la familia ve lo mismo el mismo día.'),
    ('Reemplazar, no sumar', 'En el pueblo cada cosa nueva releva a otra en el mismo grupo de trazos. La vida se reparte en el tiempo, no se apila.'),
    ('El valle tiene memoria', 'Lo que pasó deja rastro unas horas o unos días, y cada año deja algo. Hoy viene de ayer.'),
    ('Arriba, solo por lo alcanzado', 'Los de la cumbre y «Tú» pueden mirar tus compras solo para celebrar algo hecho. Nunca esperan, nunca regañan, nunca hablan.'),
]
SEMANA = {
    'cab': ['Día', 'Lo que encuentras al abrir (el foco)', 'Lo demás, discreto'],
    'filas': [
        ['Domingo', '<b>El de los globos</b> en la plaza; un osezno se lleva uno rojo (257)', 'Misa por la mañana, mejenga por la tarde'],
        ['Lunes', '<b>El globo amaneció en el maquilishuat</b> (242)', 'Sábanas tendidas; el panadero descansa'],
        ['Martes', '<b>El globo llegó a la cumbre</b>, atado junto a los tres (242)', 'El pueblo de siempre; el gato en el tejado azul'],
        ['Miércoles', 'Nada raro: hoy toca fijarse en <b>el panadero</b> y su recorrido (231)', 'La pelota quedó en la plaza desde ayer'],
        ['Jueves', 'Hoy, <b>el recado</b>: un osezno cruza la calle con un pollito en una caja (236)', 'Uniformes tendidos; el milpero baja al pueblo'],
        ['Viernes', '<b>La maestra</b> sale de la escuela con un ramo (232)', 'Más fila en las pupusas'],
        ['Sábado', 'Sábado de plaza: <b>el pescador</b> vende su sarta (233)', 'La tortillera hace tamales. La historia siguiente empieza en cinco días'],
    ],
}
ESCALERA = {
    'cab': ['Cada cuánto', 'Qué', 'Cómo se ve', 'Cuánto pesa'],
    'filas': [
        ['Cada día', 'Los recorridos de los ocho vecinos, el recado, el gato, el reloj de los animales, lo que se llena y se vacía', 'Chico y quieto', '0 nodos'],
        ['Cada semana', 'El tendedero, la mejenga, la plaza del sábado, la semana de cada oficio y de la cumbre', 'Un cambio que se nota al comparar', '0 a 3 nodos'],
        ['Cada mes', 'Una visita (globos, fotógrafo, viajero, cine, telescopio) y una historia de 3 a 6 días', 'Un foco claro en la plaza', '0 nodos en el pueblo'],
        ['Cada año', 'Las fiestas, el circo, la boda, el primer aguacero, el osezno, la casa pintada, el nido del torogoz', 'Lo más grande: puede llenar la plaza', '0 a 3 nodos esos días'],
        ['Una vez en años', 'Lo que cada año deja (248), el eclipse (183)', 'Se queda', 'Tope de 12 nodos acumulados'],
    ],
}
SISTEMAS = [
    {'id': 'director', 't': 'El director del valle', 'ideas': '223 a 229', 'camp': 'c51',
     'p': 'Una función decide el foco del momento con la fecha y la hora. Prioridad: fiesta, visita, historia, rutina. Nunca dos cosas raras a la vez; el movimiento también es de uno solo.',
     'tiras': [['s-circo-entera']], 'costo': '0 nodos, 0 animaciones'},
    {'id': 'vecinos', 't': 'Vidas que se cruzan', 'ideas': '230 a 238', 'camp': 'c52',
     'p': 'Ocho vecinos con oficio, prenda y recorrido. El mismo panadero, a cuatro horas del mismo día:',
     'tiras': [['s-pan1', 's-pan2', 's-pan3', 's-pan4']], 'costo': '0 a +1 nodos contra el mismo día sin prototipo'},
    {'id': 'historias', 't': 'Historias de varios días', 'ideas': '239 a 248', 'camp': 'c53',
     'p': 'Capítulos por fecha, una historia a la vez. Arriba, nace un osezno (tres días); abajo, la ramada de la atolada (jueves, viernes y sábado):',
     'tiras': [['s-bebe1', 's-bebe2', 's-bebe3'], ['s-ramada1', 's-ramada2', 's-ramada3']], 'costo': '0 nodos por capítulo (medido: 852 a 855; sin prototipo, 855 a 860)'},
    {'id': 'globo', 't': 'Del valle a la cumbre', 'ideas': '242 y 267', 'camp': 'c53',
     'p': 'El globo que se escapa: domingo en la plaza, lunes en el árbol, martes arriba. Los osos de la familia no bajan; el valle les sube algo.',
     'tiras': [['s-globo1', 's-globo2', 'c-globo']], 'costo': '0 nodos en el pueblo; 3 un día en la cumbre'},
    {'id': 'memoria', 't': 'La memoria del día', 'ideas': '249 a 255', 'camp': 'c54',
     'p': 'Lo que pasó deja rastro. Los charcos de las 17:50, las 18:30 y las 19:35, y la mañana después de la piñata:',
     'tiras': [['s-charco3', 's-charco2', 's-charco1'], ['s-confeti']], 'costo': '0 nodos'},
    {'id': 'raros', 't': 'Encuentros raros y visitas', 'ideas': '256 a 266 y 244', 'camp': 'c55',
     'p': 'Una vez al mes, algo que no habías visto. Sin álbum ni avisos.',
     'tiras': [['s-circo2', 's-boda', 's-foto'], ['s-paletero', 's-cuentos', 's-feria']], 'costo': '0 nodos (medido: 851 a 855; sin prototipo, 852 a 855. La feria, 887 con y sin prototipo)'},
    {'id': 'cumbre', 't': 'La cumbre y «Tú», a tu ritmo', 'ideas': '267 a 272', 'camp': 'c56',
     'p': 'Un solo objeto a la vez junto a los osos, y solo por algo alcanzado. Las tazas del día que cruzas una etapa:',
     'tiras': [['c-tazas', 'c-globo-e']], 'costo': '3 a 5 nodos, nunca dos objetos a la vez'},
]

_ab5 = [i for i in I if 'hecho' not in i and 'fundida' not in i]
_fund = [i for i in I if 'fundida' in i]
_nuevas = [i for i in I if i['n'] >= V5N]
_mej = [i for i in I if 'mej' in i]
for i in _fund:  # una fundida apunta a una idea abierta, y nadie la requiere
    assert _por[i['fundida']] in _ab5, i['n']
    assert not any(i['n'] in x['requiere'] for x in _ab5), i['n']
# las cuentas, otra vez, sin las fundidas
_si5 = [i for i in _ab5 if i['rec'] == 'si']
_hoy5 = [i for i in _si5 if i['cabe'] == HOY]
assert S(_hoy5, 'an') == 0 and BASE['osos'] + S(_si5, 'os') <= 40, (S(_hoy5, 'an'), S(_si5, 'os'))
assert BASE['nb'] + S(_hoy5, 'nbp') <= 1100 and BASE['nb'] + S(_si5, 'nbp') <= 1100, (S(_hoy5, 'nbp'), S(_si5, 'nbp'))
for i in _ab5:
    for r in i['requiere']:
        assert _por[r] in _ab5, (i['n'], r)
    if i['cabe'] == SITIO:
        assert i['requiere'], i['n']
assert [i['n'] for i in _nuevas] == list(range(V5N, V5N + len(_nuevas)))

RESUMEN[:] = [
    f'Lo que aprobaste en la v4 sigue aquí, con los mismos números. La v5 no añade «más ositos haciendo cosas»: añade {len(SISTEMAS) - 1} sistemas que hacen que el valle parezca habitado, {len(_nuevas)} ideas nuevas (223 a {V5N + len(_nuevas) - 1}), {len(_mej)} ideas de antes mejoradas y {len(_fund)} fundidas en otras mejores.',
    'El principio: un solo foco de vida por momento; lo común es discreto y lo raro, memorable. Un «director» (campamento 51) decide con la fecha y la hora qué se ve hoy, para que cada día haya algo distinto que mirar sin que el valle sea ruido.',
    'Vecinos con oficio (52): ocho osos reconocibles con su recorrido por horas. El panadero de las 5:30 es el mismo de la plaza a las 10:00. Medido contra el mismo día sin prototipo: entre 0 y 1 nodo de más.',
    'Historias de varios días (53) y memoria (54): nace un osezno, se levanta una ramada, un globo se escapa y llega a la cumbre, llega el circo; los charcos se secan y la piñata deja papelitos. Todo sale de la fecha: nada se guarda ni depende de abrir o comprar.',
    'Encuentros raros (55): una vez al mes, el de los globos, el fotógrafo con su caballito, el cine en una sábana, un viajero; una vez al año, una boda. Sin álbum, sin contador y sin avisos.',
    'La cumbre y «Tú» (56): un solo objeto a la vez junto a los osos (medido: no cabe más en el teléfono) y gestos solo por algo alcanzado, con una prueba automática que impide cualquier gesto por no comprar.',
    f'Costo honesto: casi todo es un turno o un capítulo más (0 nodos). Con todo lo propuesto, el pico de Nochebuena queda en {BASE["nb"] + S(_si5, "nbp")} de 1100 nodos, y de noche no se suma ninguna animación. Cambian una regla, y van en «después»: la 229 (tope de los osos) y la 275 (dos focos en pantallas anchas).',
]
LEADPLAN = ('El 39 sigue primero y el 41 (la Navidad) tiene fecha. Lo nuevo va del 51 al 56. El 51 (el director) conviene hacerlo justo después del 40, '
            'porque ordena todo lo demás; del 52 al 55 dependen de él y casi no cuestan nodos. Una sola rama, un commit por campamento.')
NOTA = ('<b>Lo que necesito de ti:</b> como en la v4, los números que no quieres (o los de «después» que sí), con el texto de la barra de abajo. Tu elección anterior sigue guardada: los ids no cambiaron. '
        'Las maquetas nuevas son un prototipo corriendo en la app de verdad (personajes hechos con las piezas de los vecinos) y dos retoques en la cumbre; no es código final. '
        'Marcadas para que las diga la familia: el fotógrafo del caballito (258), el cine en una sábana (261) y los historiantes (266). '
        'Por confirmar: cuándo anida el torogoz (246). Y lo de siempre: el iPhone, Safari y la tele solo los puedes ver tú.')
# el presupuesto de la v4, con la columna de la v5
_num = lambda s: int(re.sub(r'<[^>]+>', '', s))
_b = V4D['pres']['bloques'][1]
_b['cab'] = _b['cab'][:-1] + ['Con todo lo de la v5', _b['cab'][-1]]
_suma5 = {'nodos': S(_nuevas_si := [i for i in _si5 if i['n'] >= V5N], 'nbp'), 'os': S(_nuevas_si, 'os'), 'an': S(_nuevas_si, 'an')}
for _f in _b['filas']:
    _v = _num(_f[4]) + (_suma5['nodos'] if 'nodos' in _f[0] and 'osos' not in _f[0].lower() else _suma5['os'] if 'osos' in _f[0].lower() else _suma5['an'] if 'total' in _f[0] else 0)
    _f.insert(5, f'<b>{_v}</b>')
_b['p'] += f' La columna de la v5 suma lo que pesan sus ideas nuevas propuestas (+{_suma5["nodos"]} nodos de noche: el mural, las obras que quedan, los banderines y la carpa de «Tú»; 0 animaciones; 0 en los osos).'
assert _num(_b['filas'][1][5]) == BASE['nb'] + S(_si5, 'nbp'), (_b['filas'][1], BASE['nb'] + S(_si5, 'nbp'))
V5D = {
    'medida': ('Cada sistema es una forma de vivir, no una escena suelta. Las imágenes son un prototipo corriendo en tu app, en su fecha y a su hora. '
               'Cómo medí: cada maqueta contra el mismo día y la misma hora sin prototipo (un año de compras, 390×844). La diferencia va de −9 a +1 nodos; '
               'las bajas son turnos de prototipo que no llevan al actor en movimiento de esa franja, así que al implementar cuenta 0 a +1.'),
    'lead': ('Aprobaste todo lo de la v4 y pediste más: un valle muchísimo más vivo. Esta versión no añade más de lo mismo. Añade formas de vivir: vecinos que reconoces y que tienen su día, '
             'historias que empiezan hoy y terminan pasado mañana, cosas que dejan rastro, y encuentros que pasan una vez al mes. Y un principio para que tanta vida no se vuelva ruido.'),
    'principio': [list(x) for x in PRINCIPIO], 'semana': SEMANA, 'escalera': ESCALERA, 'sistemas': SISTEMAS,
    'cuenta': {'nuevas': len(_nuevas), 'mejoradas': len(_mej), 'fundidas': len(_fund), 'desde': V5N},
    'ambiciosas': [
        ['229', 'Los de la cumbre se asoman', 'Cambia una regla: sube el tope de los osos de 40 a 46 (129)', '+4 nodos en los osos', 'Bajo'],
        ['275', 'Dos focos en pantallas anchas', 'Cambia una regla: «uno en movimiento a la vez», solo desde 1100 px', '+1 animación a la vista', 'Ninguno en el iPhone; medio en la tele'],
        ['226', 'El movimiento del foco', 'Exige Hacer sitio 2 (el banco, 124)', '0: el actor releva al de la rutina', 'Medio: hay que medirlo en tu iPhone'],
        ['245', 'El cayuco nuevo', 'Exige Hacer sitio 2 (presupuesto de pantallas anchas, 131)', '+2 nodos en pantallas anchas', 'Ninguno en el iPhone'],
        ['130', 'El pueblo en su propia capa', 'Exige Hacer sitio 2; es la pieza grande si eliges mucho del 52 al 55', '0 nodos; cambia qué se repinta', 'Medio: toca cómo se arma la escena'],
        ['204', 'Los vecinos caminan', 'Cambia una regla y exige la 130', 'Varias animaciones seguidas', 'Alto: lo más caro de todo'],
        ['248', 'Cada año deja algo', 'Regla nueva: un tope de 12 nodos acumulados por obras', '+2 a +4 nodos por año', 'Bajo, si el banco lo vigila'],
    ],
}
