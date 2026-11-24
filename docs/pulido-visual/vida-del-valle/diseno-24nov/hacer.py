"""Arma el artifact «Celebración, nodo, miles, tele, precio y tempo» (diseño, 24 nov 2026). Sale a diseno-celebracion-nodo-miles.html."""
import base64, io, json, pathlib, collections, html
from PIL import Image
import protoC
AQUI = pathlib.Path(__file__).parent
CAP = AQUI / 'cap'
FONTS = pathlib.Path('/home/user/diseno-wt/app/static/fonts')
PL = (AQUI.parent / 'osos/poses/plantilla.html').read_text().split('\n')
CSS = '\n'.join(PL[3:280])  # el estilo de las rondas anteriores, tal cual
fuente = lambda n: 'data:font/woff2;base64,' + base64.b64encode((FONTS / n).read_bytes()).decode()

def img(archivo, alt, pie=None, ancho=780, recorte=None, q=66):
    im = Image.open(CAP / archivo).convert('RGB')
    if recorte: im = im.crop(recorte)
    if im.width > ancho: im = im.resize((ancho, round(im.height * ancho / im.width)), Image.LANCZOS)
    b = io.BytesIO(); im.save(b, 'WEBP', quality=q, method=6)
    src = 'data:image/webp;base64,' + base64.b64encode(b.getvalue()).decode()
    cap = f'<figcaption>{pie}</figcaption>' if pie else ''
    return f'<figure><img src="{src}" width="{im.width}" height="{im.height}" alt="{html.escape(alt)}" loading="lazy">{cap}</figure>'

PROPS = []
def prop(pid, titulo, rec, badges, costo, filas, medios='', clase=''):
    PROPS.append((pid, titulo, rec))
    bs = ''.join(f'<span class="badge {c}">{t}</span>' for c, t in badges)
    recb = {'si': '<span class="badge si">Recomendada</span>', 'despues': '<span class="badge despues">Después</span>', 'no': '<span class="badge regla">No la haría</span>'}[rec]
    dl = ''.join(f'<dt>{k}</dt><dd{" class=que" if i == 0 else ""}>{v}</dd>' for i, (k, v) in enumerate(filas))
    radios = ''.join(f'<label><input type="radio" name="e-{pid}" value="{v}"{" checked" if v == rec else ""}> {t}</label>' for v, t in (('si', 'Sí'), ('despues', 'Después'), ('no', 'No')))
    return (f'<article class="card {clase}" id="p-{pid}" data-id="{pid}" data-rec="{rec}"><div class="row"><span class="grande">{pid}</span>{recb}{bs}<span class="costo">{costo}</span></div>'
            f'<h4>{titulo}</h4>{medios}<dl>{dl}</dl><fieldset class="tri"><legend class="sr">Mi elección para {pid}</legend>{radios}</fieldset></article>')
def tabla(cab, filas):
    return '<div class="tabla"><table><thead><tr>' + ''.join(f'<th>{c}</th>' for c in cab) + '</tr></thead><tbody>' + ''.join('<tr>' + ''.join(f'<td>{c}</td>' for c in f) + '</tr>' for f in filas) + '</tbody></table></div>'
QUIETO, MUEVE, REGLA, SITIO, DATO = ('barata', 'Barato'), ('mov', 'Se mueve · en su capa'), ('regla', 'Cambia una regla'), ('sitio', 'Pide «Hacer sitio»'), ('hoy', 'Medido')
TEL = lambda f: (0, 0, 780, 1688)

# ============================================================ A · la celebración
A_tira = '<div class="tira4">' + ''.join(img(f'a-390-tarde-{c}.png', alt, pie, ancho=390) for c, alt, pie in [
    ('f1', 'Teléfono: la campana de la iglesia suena y los primeros osos salen a la plaza', '<b>1 · Anuncio</b> (0–5 s). La campana se mece: tres ondas. Los vecinos salen.'),
    ('f2', 'Teléfono: los osos hacen una rueda en la plaza y suben los primeros farolitos', '<b>2 · La plaza</b> (5–10 s). Rueda de osos al paso del bombo; los farolitos despegan.'),
    ('f3', 'Teléfono: cohetes a los lados de la montaña, la tarjeta de nuevo hito y los farolitos a media ladera', '<b>3 · Clímax</b> (10–16 s). Cohetes a los lados de «Tú», brazos arriba en la cumbre y en la plaza.'),
    ('f4', 'Teléfono: los farolitos llegan a la cumbre y en la plaza hay chocolate; queda un farol encendido', '<b>4 · Cierre</b> (16–24 s). Chocolate en la plaza, los farolitos se pierden arriba; queda el farol del hito.')]) + '</div>'
A = f'''
<section class="sec" id="A" aria-labelledby="t-A">
 <div><p class="eyebrow">A · campamento 59 · «una celebración de verdad, no solo brincar»</p><h2 id="t-A">La fiesta del hito</h2></div>
 <p class="lead">Una secuencia con principio, clímax y final que ocurre <b>una sola vez</b>, cuando la compra que acabas de anotar cruza un campamento o una etapa. Va montada sobre lo que ya existe («Tú» sube, la bandera, la tarjeta, los brazos arriba): no lo reemplaza, lo acompaña. Sin texto nuevo: los osos no hablan y nada dice qué hacer.</p>
 {A_tira}
 <p class="sis-pie">Maquetas sobre la app de verdad (escenario <code>medio</code>, 18:42, «Probar la celebración → hito»): los osos son los de <code>arte-vecinos.js</code>, puestos donde irían. <b>Farolitos, cohetes, ondas y el farol del hito son arte propuesto</b> (falta dibujar la olla de chocolate y las tazas: aquí hace de chocolatera la pupusera).</p>
 <div class="vp-dia">{img('a-1440-tarde-f3.png', 'Escritorio: cinco palmas de cohetes sobre la cumbre, farolitos subiendo por la ladera, la rueda de osos con los brazos arriba', '1440 · clímax al atardecer: en escritorio los cohetes van sobre la cumbre', ancho=1100)}{img('a-1440-dia-f3.png', 'Escritorio de día en tema claro: la misma fiesta con los colores de mediodía', '1440 · a mediodía, tema claro', ancho=1100)}</div>
 <div class="tira4">{img('a-390-dia-f3.png', 'Teléfono de día, tema claro: clímax', '390 · de día, tema claro', ancho=390)}{img('a-390-tarde-pri.png', 'Teléfono: etapa principal, un cohete y tres farolitos', '390 · etapa <b>principal</b> (12 s): 1 cohete, 3 farolitos', ancho=390)}{img('a-390-tarde-int.png', 'Teléfono: etapa intermedia, un toque de campana, tres osos y un farolito', '390 · etapa <b>intermedia</b> (6 s): 1 toque, 3 osos, 1 farolito', ancho=390)}{img('a-320-tarde-f3.png', 'Teléfono pequeño de 320 px: clímax', '320×568 · la tarjeta tapa la cumbre: los cohetes van solo a los flancos', ancho=320)}</div>
 <div class="vp-dia">{img('a-2560-tarde-f3.png', 'Monitor de 2560 px: clímax', '2560×1440 · misma composición; la escena no crece más allá de su tope', ancho=1200, recorte=(0, 0, 2560, 900))}</div>
 {tabla(['Escala', 'Dura', 'Campana', 'Plaza', 'Farolitos', 'Cohetes', 'Cumbre y «Tú»', 'Queda después'], [
   ['<b>Campamento</b> (10×: 1M, 10M, 1 BTC…)', '<span class="num-d">24 s</span>', '3 toques', 'Salen 8 como mucho (el tope del pueblo): siete en la rueda y el del bombo; brazos arriba, chocolate', '7', '5 palmas (3 en teléfono)', 'Los tres osos y «Tú» brazos arriba (ya existe); en 1 BTC, además la aurora de hoy', 'El farol del hito hasta la medianoche'],
   ['<b>Etapa principal</b> (2.5 y 5 de cada potencia, y 100k)', '<span class="num-d">12 s</span>', '2 toques', 'Rueda de 5 y brazos arriba (sin chocolate)', '3', '1 palma', '«Tú» brazos arriba (ya existe)', 'El farol del hito hasta la medianoche'],
   ['<b>Etapa intermedia</b> (reabre lo decidido en el 21: «ligera, que no empalague»)', '<span class="num-d">6 s</span>', '1 toque', '3 osos levantan los brazos', '1', '—', 'Como hoy (la marca se enciende)', 'Nada'],
 ])}
 <div class="cards">
 {prop('A1', 'El guion en cuatro tiempos, a escala del hito', 'si', [MUEVE, REGLA], '+22 nodos solo mientras dura', [
   ('Qué', 'Anuncio → plaza → clímax → cierre, con las tres escalas de la tabla. Si una compra cruza varias, se celebra <b>la destacada</b> (<code>lib.etapaCelebrada</code>, la regla de hoy: campamento &gt; principal &gt; intermedia), una sola fiesta.'),
   ('Cómo convive', 'La línea de tiempo cuelga de la de hoy: «Tú» sube (1.4 s), bandera, anillos y tarjeta como ahora; la campana empieza al plantar la bandera. La tarjeta dura lo mismo o algo más (ver F). En el teléfono el aviso de «guardado» tapa la plaza unos segundos: por eso allí el clímax es <b>cielo y cumbre</b>, y la plaza es acompañamiento. <b>Cualquier toque o desplazamiento la salta al estado final</b>; nunca bloquea nada.'),
   ('Costo', 'Vecinos: <b>0 nodos</b> y nunca más de ocho (en la maqueta hay nueve: sobra uno) (se rehace <code>.v-vecinos</code>, tres veces: sale, rueda, chocolate; el baile es a saltos, dos poses). Farolitos: <b>una sola capa</b> <code>&lt;svg&gt;</code> con 3 trazos que sube con <code>transform</code> (+4). Cohetes: una capa, 2 trazos por palma (+11; en Navidad se reusan los que ya están). Ondas +4, farol +3. Total <b>+22 nodos durante 24 s</b>: 948 un día normal y 1,052 en Nochebuena, bajo el tope de 1,100. Animaciones: 3 capas nuevas, 1–2 cada una (tope «capa propia: 3»).'),
   ('Riesgo iPhone', 'Bajo si lo ambiental se pausa mientras dura (ver A3). Hay que medirlo en la noche de lluvia (102 de 110 animaciones): allí la fiesta va sin farolitos. <b>Sin probar aquí</b>: iPhone real.'),
 ])}
 {prop('A2', 'Nunca dos veces: la marca vive en el servidor', 'si', [QUIETO], 'Migración 19', [
   ('Qué', 'Hoy la celebración sale solo en la sesión que anota la compra, pero nada recuerda que ya se celebró: si vendes y vuelves a cruzar 1M, se repetiría. Propongo una tabla <code>etapas_celebradas(meta, fecha)</code>, escrita en la misma transacción que la compra. Si la meta ya está, la fiesta no sale (queda la tarjeta de siempre).'),
   ('Quién la ve', 'Entera: quien anota y la tele, si está encendida (ya recibe la «fiesta» de cada compra). La familia que abre más tarde ese día ve el <b>farol del hito</b> encendido, no la secuencia. No se guarda quién la vio (privacidad).'),
   ('Probar', '«Probar la celebración» gana tres botones (campamento, principal, intermedia) que usan el mismo código y no escriben la marca.'),
 ])}
 {prop('A3', 'Excepción acotada a dos reglas del valle', 'si', [REGLA], 'Cambia CLAUDE.md', [
   ('«Uno a la vez»', 'La fiesta <b>es</b> el actor: <code>data-mueve="fiesta"</code> desplaza al de la franja mientras dura. Dentro de ella se permiten <b>hasta 2 capas moviéndose a la vez</b> (farolitos y cohetes en el clímax), <b>30 s como máximo</b> y <b>una vez por compra</b>. Lo ambiental (luciérnagas, estrellas) se pausa esos segundos.'),
   ('«Nada depende de si se compró»', 'Esta sí depende: de cruzar un hito. Queda acotado al momento y al farol hasta medianoche; no deja nada permanente y <b>no existe lo contrario</b>: el valle nunca se ve peor por no comprar.'),
   ('«Nunca según las cuentas»', 'El pueblo de osos se decidió «ocho como mucho y nunca según las cuentas» (35). La fiesta respeta los ocho, pero <b>sí reacciona a tu libro</b>: es la tercera excepción, igual de acotada (solo en la fiesta de un hito).'),
   ('Lo que no es', 'Las campanas son solo visuales («sonidos del paisaje» sigue descartado; suena, si está activado, el sonido de etapa de hoy). La rueda es un baile de osos tomados de la mano, no la «rueda de agosto» descartada.'),
 ])}
 {prop('A4', 'Versiones de noche, de lluvia y con menos efectos', 'si', [QUIETO], '0 nodos más', [
   ('De noche (22–5)', 'En el pueblo de noche no hay nadie (regla del 35) y se respeta: las <b>ventanas se encienden una a una</b>, los farolitos suben solos de la plaza y hay cohetes. Bajo el velo de madrugada, igual.'),
   ('Con lluvia', 'Sin farolitos: campana, ventanas y los osos bajo el alero.'),
   ('«Esenciales»', 'Tres cuadros quietos a saltos (salen · brazos arriba · chocolate), una palma que aparece y se apaga con opacidad, y la tarjeta. Sin farolitos volando.'),
   ('«Ninguno» / movimiento reducido', 'El estado final de golpe: la tarjeta y el farol del hito encendido. Como hoy.'),
 ])}
 {prop('A5', 'El farol del hito: la fiesta deja una luz hasta la medianoche', 'si', [QUIETO], '+3 nodos ese día', [
   ('Qué', 'Un farolito colgado en la plaza el resto del día. Es la «memoria del día» del campamento 54 aplicada a lo tuyo: quien entra después sabe que hoy pasó algo, sin texto.'),
   ('Ojo', 'Se añade a <code>fueraDeTemporada</code> (solo existe ese día). No lleva cifra ni nombre.'),
 ])}
 {prop('A6', 'La fiesta en la tele', 'si', [MUEVE], 'Igual que A1', [
   ('Qué', 'La misma secuencia, compuesta para la tele: los cohetes <b>a la derecha de la cumbre</b>, lejos de la columna del saldo y del reloj (la regla «el saldo de la tele nunca toca la montaña» no se toca), y los farolitos pegados a la ladera. Maqueta en la sección D.'),
 ])}
 </div>
</section>'''

# ============================================================ B · el nodo
RED = lambda cls='': f'''<div class="mock {cls}"><p class="mk-k">Pulso de la red <span class="mk-f">tu nodo</span></p>
 <p class="mk-g"><b>976,431</b><span>bloque · hace 4 min</span></p>
 <div class="mk-r"><div><small>Comisiones (sat/vB)</small><b>3 · 5 · 9</b><small>en ~1 h · ~30 min · siguiente bloque</small></div><div><small>Ajuste de dificultad</small><b>en ~6 días</b><small>bloque 977,760 · va +1.8 %</small></div><div><small>Halving</small><b>faltan 73,569 bloques</b><small>hacia abril de 2028</small></div></div></div>'''
B = f'''
<section class="sec" id="B" aria-labelledby="t-B">
 <div><p class="eyebrow">B · campamento 60 · tu Bitcoin Core y tu mempool.space</p><h2 id="t-B">El nodo: un dato tranquilo y una campana</h2></div>
 <p class="lead">Un bloque llega cada ~10 minutos: <b>144 al día</b>. Eso decide todo: lo común tiene que ser casi invisible, y lo raro, memorable. Nada de esto opina («comisiones bajas» no se dice: se dan tres números).</p>
 {tabla(['Qué pasa en la red', 'Cada cuánto', 'Qué hace el valle', 'Costo'], [
   ['Un bloque cualquiera', '~10 min (144 al día)', 'La campana de la torre se mece <b>una vez</b>: una onda, 4 s. Solo con la página a la vista y arriba; de 22 a 5, nada. Sin ponerse al día: lo que no viste, no se repite.', '+2 nodos durante 4 s'],
   ['Múltiplo de 1,000', '~cada 7 días', 'Tres ondas y <b>un farolito</b> sube de la plaza', '+6 durante 14 s'],
   ['Ajuste de dificultad (cada 2,016)', '~cada 14 días', 'El osito sacristán sale a la puerta de la torre (una pose, a saltos)', '0 (turno de vecinos)'],
   ['Halving (bloque 1,050,000)', 'hacia abril de 2028', 'Fiesta mediana del pueblo: rueda, 4 farolitos, 1 cohete. <b>Sin «Tú» ni los brazos de la cumbre</b>: no es un hito tuyo', 'Como A1 «principal»'],
   ['Bloque 1,000,000', '<b>una sola vez</b>, hacia mayo de 2027', '«La noche del millón»: diez farolitos, uno por cada 100,000', 'Como A1'],
 ])}
 <p class="sis-pie">Fechas estimadas con 144 bloques al día desde el halving de abril de 2024 (bloque 840,000); la altura de la maqueta es inventada. El dato real lo da tu nodo.</p>
 <div class="mocks"><div><p class="lbl">Teléfono · pestaña Gráficos</p>{RED('tel')}</div><div><p class="lbl">Escritorio · columna lateral</p>{RED('esc')}</div></div>
 <div class="mocks"><div><p class="lbl">Bajo el precio, siempre a la vista (opcional)</p><div class="mock linea"><span>1 BTC <b>$77,598</b></span><small>▾ −0.2 % vs ayer</small><small>bloque 976,431 · hace 4 min</small></div></div><div><p class="lbl">Si el nodo no responde</p><div class="mock linea"><span class="mk-k">Pulso de la red</span><small>Sin conexión con tu nodo. Último dato: bloque 976,431, hace 2 h.</small></div></div></div>
 <div class="vp-dia">{img('b-390-comun.png', 'Teléfono: una onda sobre el campanario', '390 · bloque común: una onda en la torre (ampliado)', ancho=560, recorte=(0, 1180, 560, 1500))}{img('b-390-mil.png', 'Teléfono: tres ondas y un farolito que sube', '390 · múltiplo de 1,000: tres ondas y un farolito', ancho=560, recorte=(0, 1100, 560, 1500))}{img('b-1440-halving.png', 'Escritorio: los osos en rueda y farolitos por el halving', '1440 · halving: la fiesta del pueblo, sin «Tú»', ancho=900, recorte=(0, 330, 900, 800))}</div>
 <div class="cards">
 {prop('B1', '«Pulso de la red»: una tarjeta, no un tablero', 'si', [QUIETO], '0 nodos de escena', [
   ('Qué', 'Altura y hace cuánto llegó el bloque; tres comisiones con su plazo; el próximo ajuste; el halving. En el teléfono, en <b>Gráficos</b>; en escritorio, en la columna lateral; en la tele, una línea. Opcional: la altura bajo el precio.'),
   ('Cómo', '<code>/api/red</code> (lectura, caché de 60 s en el servidor, pasa por <code>_get_json</code>); el navegador solo habla con el servidor. Se consulta con el mismo intervalo del precio y solo con la página visible. A quien solo mira dice «el nodo del libro» (<code>data-libro</code>).'),
   ('Riesgo', 'Que las comisiones se lean como señal: por eso van los tres números con su plazo y ningún adjetivo ni color. Prueba: el texto de la tarjeta no contiene «bajo», «alto», «buen», «barato».'),
 ])}
 {prop('B2', 'La campana del bloque (lo común, discreto)', 'si', [MUEVE], '+2 nodos, 4 s', [
   ('Qué', 'La campana se mece una vez y suelta una onda. Sin osito mensajero: 144 veces al día sería ruido.'),
   ('Regla de nunca ruido', 'Cede ante todo: si hay fiesta, actor de franja en su momento o la página no está arriba, no ocurre. Máximo un gesto cada 10 min aunque lleguen dos bloques seguidos. Solo con «todos»; con «esenciales» y «ninguno», nada (el dato está en la tarjeta).'),
   ('Costo', 'La campana ya es un trazo propio (<code>v-ig-campana</code>); la onda va en una capa pequeña. Cuenta como «capa propia» (1 animación).'),
 ])}
 {prop('B3', 'Los bloques raros: 1,000, ajuste, halving y el millón', 'si', [MUEVE], 'Ver tabla', [
   ('Qué', 'Cuatro gestos, cada uno más raro y más grande que el anterior (tabla de arriba). El del millón ocurre una vez en la vida de la app.'),
   ('Ojo', 'Si coincide con una fiesta tuya o del calendario, manda la tuya. Si la app estaba cerrada, no se repite después: a lo sumo el farol queda encendido ese día.'),
 ])}
 {prop('B4', 'Verificar el TXID con tu nodo (<code>MEMPOOL_URL</code>)', 'si', [QUIETO], 'Servidor', [
   ('Qué', 'Lo del plan: una variable de entorno y <code>/api/tx</code> pregunta a tu mempool.space por WireGuard. Sin la variable, todo como hoy. Es lo más valioso del nodo: ningún tercero ve tus transacciones.'),
   ('Sin probar aquí', 'Tu casa, el túnel y tu instancia: se prueba desde el Vultr con <code>curl</code>.'),
 ])}
 {prop('B5', 'Osito mensajero con cada bloque · osito que cuenta bloques', 'no', [], '—', [
   ('Por qué no', 'Un actor que cruza cada 10 minutos rompe «un solo foco de vida» y compite con los turnos. La pizarra con la cuenta sería texto ilegible en el teléfono. La campana dice lo mismo con dos nodos.'),
 ])}
 {prop('B6', 'Distintivos coleccionables por bloque', 'no', [], '—', [
   ('Por qué no', 'Es el «cuaderno de avistamientos» que descartaste, con otro nombre, y premia tener la app abierta. Si lo quieres retomar, la versión defendible es un solo sello: «el millón» en «Tu historia», sin colección.'),
 ])}
 </div>
</section>'''

# ============================================================ C · miles
M = json.loads((AQUI / 'medidasC.json').read_text())
def fila_m(n):
    r = M[f'{n}@390']
    v = lambda k: f"{r[k]['nodos']:,} · {r[k]['ms'][1]} ms"
    return [f'<b>{n:,}</b>', f"{r['tCarga']} ms", f"{r['app']['escena']}", v('partitura'), v('constelacion'), v('tronco'), v('torre'), v('manta'), v('estratos'), f"{r['heapMB']} MB"]
c200, c1000, c5000 = protoC.cargar(200), protoC.cargar(1000), protoC.cargar(5000)
pn, pn_i = protoC.por_nota(c200, 2024)
ps1, ps1_i = protoC.por_semana(c1000, 2026)
ps5, ps5_i = protoC.por_semana(c5000, 2026)
pt5, pt5_i = protoC.todos(c5000)
sel = ps5_i['sel']; psem, lun = protoC.semana(sel)
pcon, pcon_i = protoC.constelacion(c5000)
ex_sel = sum(1 for c in sel if c['extra'])
C = f'''
<section class="sec" id="C" aria-labelledby="t-C">
 <div><p class="eyebrow">C · campamentos 57 y 58 · datos realistas</p><h2 id="t-C">«Tu historia» con miles de compras</h2></div>
 <p class="lead">Generé un libro realista (escenario temporal <code>miles</code>, sin commitear): 200, 1,000, 5,000 y 10,000 compras en 3–5 años, ritmo regular con rachas y cuatro huecos, <b>63 % de compras extra amontonadas en las caídas</b> (varias el mismo día), ventas y traslados. Y medí la app real con él.</p>
 {tabla(['Compras', 'Carga', 'Escena', 'Partitura', 'Constelación', 'Tronco', 'Piedras', 'Manta', 'Estratos', 'Memoria JS'], [fila_m(n) for n in (200, 1000, 5000, 10000)])}
 <p class="sis-pie">Teléfono 390×844, Chromium sin freno de CPU: <b>nodos · tiempo de pintado</b> del año en curso. A 1440 px salen las mismas cifras. <b>Lo que escala bien</b>: piedras (40), manta (una pieza por semana), estratos (una por mes), tronco (un anillo por año), la línea (46 entradas), el pasaporte (24 y «Ver más»), la lista (pagina: 9–10 filas en el DOM), los gráficos (90 nodos, un punto por mes), la escena (933–989 nodos, bajo el tope) y la película (918 nodos, abre en ~100 ms). <b>Lo que no</b>: la partitura y la constelación, que dibujan un elemento por compra sin tope; y la marca de «extra» en casi todos, que deja de informar cuando las extras son mayoría.</p>
 <div class="tira4">{img('c-5000-390-partitura.png', 'La partitura actual con 1,034 notas en el año: bandas sólidas ilegibles', '<b>Hoy · partitura</b>, 1,034 notas en 2026: bloques sólidos; 1,057 nodos', ancho=390)}{img('c-1000-390-partitura.png', 'La partitura actual con 209 notas: aros naranjas solapados', '<b>Hoy · partitura</b>, 209 notas: ya se rompe', ancho=390)}{img('c-5000-390-constelacion.png', 'La constelación actual con 5,000 estrellas: una mancha', '<b>Hoy · constelación</b>, 5,000 estrellas: una mancha; 5,041 nodos', ancho=390)}{img('c-5000-390-tronco.png', 'El tronco actual con 3,139 nudos', '<b>Hoy · tronco</b>: 3,139 nudos de «extra» alrededor de los anillos', ancho=390)}</div>
 <h3>La partitura, en tres alturas</h3>
 <div class="protos">
  <figure class="proto"><div class="pp-marco">{pt5}</div><figcaption><b>1 · Todos los años</b> (5,000 compras): una pauta por año, una figura por mes. La barra es el rango de precios del mes; la cabeza, su mediana; el tamaño y el número, cuántas compras; <span class="pp-pista ex"></span> naranja si la mayoría fueron extra; una rayita es un mes en silencio. <b>{pt5_i['figuras']} figuras, {pt5_i['nodos']} nodos.</b> Se entiende sin tocar nada.</figcaption></figure>
  <figure class="proto"><div class="pp-marco">{ps5}</div><figcaption><b>2 · Un año por semanas</b> (2026 con {ps5_i['notas']:,} notas): cuatro pautas de trece semanas. Nunca más de 52 figuras ni de 52 zonas de toque, que son columnas enteras y no se tapan. <b>{ps5_i['nodos']} nodos</b> en vez de 1,057. La semana elegida va resaltada.</figcaption></figure>
  <figure class="proto"><div class="pp-marco">{psem}</div><figcaption><b>3 · La semana, al tocarla</b> (la que empieza el {lun.day} de {protoC.MES[lun.month-1]}): sus siete días; el mismo día es un «acorde» con su cantidad. Debajo, el texto de siempre: «{len(sel)} compras ({ex_sel} extra) · +{sum(c['sats'] for c in sel):,} sats · BTC entre ${min(c['precio'] for c in sel):,.0f} y ${max(c['precio'] for c in sel):,.0f}» y un botón <b>Ver estas compras</b> que lleva a la lista filtrada.</figcaption></figure>
  <figure class="proto"><div class="pp-marco">{ps1}</div><figcaption><b>Con 1,000 compras</b> (2026: {ps1_i['notas']} notas): la misma vista por semanas. {ps1_i['nodos']} nodos.</figcaption></figure>
  <figure class="proto"><div class="pp-marco">{pn}</div><figcaption><b>Con pocas</b> (200 compras; 2024: {pn_i['notas']} notas): una cabeza por día de compra, repartidas <b>por cantidad</b> y no por calendario; varias el mismo día llevan «×n». {pn_i['nodos']} nodos.</figcaption></figure>
  <figure class="proto"><div class="pp-marco oscuro">{pcon}</div><figcaption><b>Constelación por semanas</b> (5,000 compras): {pcon_i['estrellas']} estrellas en dos trazos; más grande con más sats, dorada si la mayoría fue extra. El toque elige la más cercana por cuenta, sin un nodo por estrella.</figcaption></figure>
 </div>
 <div class="cards">
 {prop('C1', 'La partitura por alturas: años → semanas → la semana', 'si', [DATO], 'De 2,273 a ≤115 nodos', [
   ('Qué', 'Hasta 60 notas en el año, una por día de compra (como hoy, pero repartidas por cantidad y con «×n» para el mismo día). Con más, <b>una figura por semana</b>. Arriba, una vista nueva «Todos» con una figura por mes. El detalle se abre al tocar.'),
   ('Tocar y oír', 'Las zonas son columnas de pauta completa (21 px de ancho a 320, 26 a 390): no llegan a 48 px, así que <b>la selección se mueve también con dos botones ‹ › de 48 px</b> junto al texto, y con las flechas del teclado. «Tocar este año» suena una nota por semana (como mucho 52): con 2,250 notas hoy duraría minutos.'),
   ('Lo que cambia', '<code>lib.partitura</code> gana el agregado (con su prueba) y la frase «una nota por compra» pasa a «por semana» cuando toca. Las clases <code>h-…</code>/<code>hp-…</code> se conservan. El marco de la tele usa la vista «Todos».'),
 ])}
 {prop('C2', 'La marca de «extra» por mayoría, en todos los dibujos', 'si', [QUIETO], '0 nodos', [
   ('Qué', 'Con 63 % de extras, marcar «alguna es extra» lo marca todo. Regla única: una pieza se marca si <b>más de la mitad</b> de lo que junta es extra. Partitura: la cabeza naranja, sin aros. Piedras: la veta de cobre con la intensidad de la proporción. Manta: la × solo en semanas de mayoría extra. Estratos: como mucho 3 vetas de cuarzo por capa. Tronco: un nudo por mes con extras (12 por anillo, no 3,139).'),
   ('Ojo', 'Los textos que cuentan («hay 3,139 nudos») siguen diciendo la cifra real.'),
 ])}
 {prop('C3', 'La constelación por semanas a partir de 600 estrellas', 'si', [DATO], 'De 10,041 a ~40 nodos', [
   ('Qué', 'Por debajo de 600, una estrella por compra como hoy. Por encima, una por semana. Un solo vigía de toques que busca la estrella más cercana (hoy cada estrella es un nodo tocable: 10,041 nodos y 205 ms con 10,000 compras).'),
 ])}
 {prop('C4', 'Topes escritos y un escenario permanente', 'si', [SITIO], 'Pruebas', [
   ('Qué', 'El escenario <code>miles</code> entra en <code>tests/servidor_prueba.py</code> y el banco suma una regla: <b>ningún dibujo de «Tu historia» pasa de 400 nodos</b> con 5,000 compras. Capturas de las siete vistas a 320, 390, 1440 y 3840.'),
 ])}
 {prop('C5', 'La carga: <code>/api/compras</code> pesa 1.8 MB con 10,000', 'despues', [DATO], 'Servidor', [
   ('Qué', 'Medido: 36 KB (200), 179 KB (1,000), 897 KB (5,000) y 1.8 MB (10,000), <b>sin comprimir en el servidor de pruebas</b> (la app comprime los estáticos, no la API). En producción Cloudflare seguramente lo comprime: hay que mirarlo. Si no, gzip en la API (ya hay ETag: la segunda carga no baja nada).'),
   ('Por qué después', 'Con 5,000 la app carga en 0.6–0.7 s aquí. No aprieta todavía; se decide con la cabecera real de producción.'),
 ])}
 </div>
</section>'''

# ============================================================ D · la tele
D = f'''
<section class="sec" id="D" aria-labelledby="t-D">
 <div><p class="eyebrow">D · la tele de la sala · 1080p y 4K</p><h2 id="t-D">El modo TV con miles de compras</h2></div>
 <p class="lead">Con 5,000 compras y 299 millones de sats la tele aguanta: 1,016 nodos, el saldo no toca la montaña. Lo que encontré es otra cosa: de lejos se lee el saldo y poco más, a 3840 px el cuadro no crece, y hay una duda seria de compatibilidad.</p>
 <div class="vp-dia">{img('tv-miles5000-1920-12.png', 'La tele hoy a 1920×1080 con 299 millones de sats', '<b>Hoy · 1920×1080</b> · 5,000 compras', ancho=1200)}{img('tv-miles5000-3840-12.png', 'La tele hoy a 3840×2160: el cuadro queda pequeño', '<b>Hoy · 3840×2160 de CSS</b> (un PC a 100 % en una tele 4K): todo queda pequeño', ancho=1200)}</div>
 {tabla(['Medido en la tele', '1920×1080', '3840×2160'], [
   ['Cifra del saldo (9 cifras / 6 cifras)', '87 px / 129 px', '130 px'], ['Reloj · precio de BTC', '41 px · 33 px', '57 px · 46 px'],
   ['Último movimiento · «valen»', '29 px · 28 px', '40 px · 39 px'], ['<b>Rótulos de la montaña</b> (1M, 1 BTC, «Vamos aquí»)', '<b>16 px y 14 px</b> (1.5 % del alto)', '<b>16 px y 14 px</b> (0.7 %)'],
   ['Nodos de la escena · animaciones de día / de noche', '1,016 · 19 / 89', '1,085 · 20'],
   ['Fotogramas en el sandbox (sin GPU) de día / de noche', '21 / 17 fps', '—'],
 ])}
 <p class="sis-pie">Para leer a 3–4 m la regla habitual de interfaces de tele es no bajar de ~24 px a 1080p (2.2 % del alto). El saldo, el reloj y las tarjetas cumplen; los rótulos de la montaña no. Los 21 y 17 fps son del sandbox, que pinta sin GPU: <b>no predicen tu tele</b>, pero una tele modesta se parece más a eso que a un iPhone.</p>
 <div class="vp-dia">{img('d-prop-1920.png', 'Propuesta para la tele a 1920: rótulos más grandes, pueblo más grande, menos datos, una línea del último bloque', '<b>Propuesta · 1920×1080</b>: rótulos ×1.6, el pueblo ×1.55, sin «Coinbase · hace 8 s» ni «ya se realizaron», y la línea del bloque', ancho=1200)}{img('d-prop-3840.png', 'Propuesta para la tele a 3840: el mismo cuadro al doble', '<b>Propuesta · 3840×2160</b>: el mismo cuadro de 1080p al doble, nítido', ancho=1200)}{img('d-fiesta-1920.png', 'La fiesta del hito en la tele: cohetes a la derecha de la cumbre', '<b>La fiesta en la tele</b>: cohetes a la derecha de la cumbre, farolitos pegados a la ladera', ancho=1200)}{img('tv-medio-1920-20.png', 'La tele hoy de noche', 'Hoy · de noche: 89 animaciones (32 estrellas y 16 luciérnagas con dos cada una)', ancho=1200)}</div>
 <p class="sis-pie">Las propuestas son maquetas sobre la tele real (se escalan el pueblo y los rótulos y se esconden dos datos). La píldora de «Vamos aquí» no crece con su texto en la maqueta: en la implementación sí.</p>
 <div class="cards">
 {prop('D1', 'La tele se compone a 1080p y se escala entera', 'si', [QUIETO], 'Solo CSS', [
   ('Qué', 'Por encima de 1920 px de ancho, el cuadro de la tele es el de 1080p multiplicado (×1.33 a 2560, ×2 a 3840), no una escena con más aire. La mayoría de las teles 4K ya informan 1920 px de CSS; esto arregla el PC conectado a una tele.'),
   ('Regla', '«El saldo nunca toca la montaña» se cumple sola: es el mismo cuadro ya probado.'),
 ])}
 {prop('D2', 'Rótulos legibles de lejos y dos datos menos', 'si', [QUIETO], '0 nodos', [
   ('Qué', 'Rótulos de la montaña y «Vamos aquí» a ≥ 26 px en 1080p. Fuera de la tele: «Coinbase · hace 8 s», «ya se realizaron…» y el minigráfico junto a la ganancia (a 3 m son ruido). Se quedan: saldo, «valen», la ganancia, el último movimiento, el reloj y el precio.'),
   ('Ojo', 'Los rótulos más grandes hay que pasarlos por el raleo de marcas (<code>lib.marcasDeEtapa</code>) y por la prueba del saldo contra la montaña.'),
 ])}
 {prop('D3', 'El valle de la tele merece su propia composición (el «T3»)', 'si', [SITIO], '0 nodos', [
   ('Qué', 'Sí, pero acotada: el <b>mismo arte</b>, con el pueblo a ×1.5 y su sitio propio. A 1920 los osos miden hoy ~19 px; a ×1.5, ~30 px: se ven desde el sofá. No se toca la forma de la montaña ni se dibuja nada nuevo.'),
   ('Riesgo', 'El pueblo más grande roza el arranque del sendero: hay que recolocarlo unos píxeles a la izquierda y comprobar solapes (<code>cajaCasa</code>, <code>cajaIglesia</code>).'),
 ])}
 {prop('D4', 'Presupuesto propio de la tele: 24 animaciones', 'si', [SITIO], 'De 89 a ≤24 de noche', [
   ('Qué', 'A 3 m el titilar de cada estrella no se distingue. En la tele: las estrellas en 3 grupos, las luciérnagas en 2 capas que derivan, y un tope de <b>24 animaciones a la vista</b> a cualquier hora (el teléfono tiene 110). Objetivo: 30 fps estables.'),
   ('Cómo se sabe', '«Medir este aparato» abierto en la tele. <b>Sin probar aquí</b>: una tele de verdad.'),
 ])}
 {prop('D5', 'Horas encendida: que nada se queme', 'si', [QUIETO], '0 nodos', [
   ('Qué', 'Hoy el saldo, el reloj y las tarjetas no se mueven en todo el día. Propongo: (1) una <b>deriva de ±12 px</b> de las tarjetas cada 10 minutos, hecha mientras el marco de «Tu historia» tapa la pantalla (no se ve el salto); (2) tras 30 min sin compra, las tarjetas bajan a 85 % de opacidad; (3) el reposo de 23 a 5 se queda como está.'),
   ('Ojo', 'La deriva mueve un solo elemento HTML con <code>transform</code>. La prueba del saldo contra la montaña se corre en las cuatro esquinas de la deriva.'),
 ])}
 {prop('D6', 'Cómo reacciona la tele a lo que pasa', 'si', [MUEVE], 'Ver A, B y E', [
   ('Hito', 'La fiesta de A, compuesta a la derecha (maqueta de arriba). La tarjeta grande de la tele ya existe.'),
   ('Bloque', 'Una línea «Último bloque · hace 4 min» bajo el último movimiento y la campana. Solo si el nodo está configurado.'),
   ('Cumpleaños y Navidad', 'Lo que ya hace la escena (gorrito, luciérnagas, Navidad): sin nombres ni datos de nadie. No añado nada.'),
   ('Precio', 'Los estados de E, iguales que en el teléfono.'),
 ])}
 {prop('D7', 'Antes de todo: ¿en qué aparato corre la tele?', 'si', [DATO], 'Pregunta', [
   ('Hallazgo', 'El CSS usa <code>color-mix()</code> 363 veces. Eso pide Chromium 111 o Safari 16.2. Hasta donde sé, los navegadores de las teles LG (webOS 24) y Samsung (Tizen 8) de 2024 van en Chromium 108 o menos: <b>ahí la app saldría sin colores o no arrancaría</b>. No lo puedo confirmar desde aquí.'),
   ('Qué hacer', 'Dime qué usas (el navegador de la tele, un Chromecast o Fire TV, un mini PC). Si es el navegador de la tele, lo primero es abrir <code>/medir</code> allí. No propongo reescribir el CSS para teles viejas sin ese dato.'),
 ])}
 </div>
</section>'''

# ============================================================ E · el precio
E_ = f'''
<section class="sec" id="E" aria-labelledby="t-E">
 <div><p class="eyebrow">E · campamento 59 · emociones del valle</p><h2 id="t-E">Cuando el precio baja o sube</h2></div>
 <p class="lead">El principio: <b>el valle nunca se ve peor por el precio</b>. Si baja, el pueblo se arropa; si sube, sale al aire libre. Los dos estados son agradables y ninguno es mejor que el otro. No se festeja el precio: los brazos arriba, los cohetes y los farolitos son solo para lo tuyo.</p>
 {tabla(['Estado', 'Entra cuando', 'Qué se ve', 'Días al año (simulado)', 'Racha más larga'], [
   ['<b>Calma</b> (lo normal)', 'Nada de lo de abajo', 'El valle de siempre, con sus turnos', '305 (84 %)', '141 días'],
   ['<b>Fresco</b>', 'Semana ≤ −8 %', 'Los vecinos llevan bufanda; humea una chimenea', '13', '6'],
   ['<b>Abrigo</b>', '≥ 22 % bajo el máximo de 30 días o semana ≤ −15 %', 'Bufandas, chocolate en la plaza, tres chimeneas, un farolito de más al anochecer', '10', '29 → tope de 7'],
   ['<b>Manta</b>', '≥ 35 % bajo el máximo de 30 días', 'Lo de «Abrigo» y los tres osos de la cumbre juntos bajo una manta de añil', '3', '16 → tope de 3'],
   ['<b>Aire libre</b>', 'Semana ≥ +8 %', 'Ropa tendida, dos piscuchas más, la que barre', '30', '12 → tope de 7'],
   ['<b>Plaza</b>', 'Semana ≥ +15 %', 'Lo de «Aire libre» y los vecinos de paseo en la plaza, los oseznos con la pelota', '4', '7'],
 ])}
 <p class="sis-pie"><b>Los umbrales salen de una cuenta, no de un gusto.</b> Mi primera escala (día −3 %/−7 %/−15 %, 15 % bajo el máximo, «nuevo máximo de 30 días») daba, sobre los seis años de precios simulados del servidor de pruebas, «Plaza» el 19 % de los días y un «Abrigo» de 45 días seguidos: ruido y pesadumbre. Con esta (la semana y la distancia al máximo; el cambio de un solo día no cuenta) hay calma el 84 % de los días. Los precios de prueba son más suaves que el mercado real: <b>antes de implementar hay que repetir la cuenta con el histórico de verdad</b> que guarda la app. Si coinciden una caída y una subida (rebote dentro de una caída grande), manda la semana, que es lo más reciente.</p>
 <div class="vp-dia">{''.join(img(f'e-390-{e}.png', alt, pie, ancho=560, recorte=(0, 1240, 560, 1500)) for e, alt, pie in [('calma', 'El pueblo en calma', '390 · <b>Calma</b> (ampliado ×2)'), ('fresco', 'Vecinos con bufanda y una chimenea con humo', '390 · <b>Fresco</b>: bufandas y un humo'), ('abrigo', 'Chocolate en la plaza, tres chimeneas con humo y un farolito', '390 · <b>Abrigo</b>: chocolate, tres humos, un farolito'), ('aire', 'Ropa tendida, piscuchas y vecinos de paseo', '390 · <b>Aire libre</b>: ropa tendida, piscuchas, paseo')])}{img('e-390-manta.png', 'Los tres osos de la cumbre bajo una manta de añil', '390 · <b>Manta</b>: los tres de la cumbre, juntos', ancho=420, recorte=(330, 560, 650, 820))}</div>
 <div class="vp-dia">{img('e-1440-abrigo.png', 'Escritorio: el pueblo en estado abrigo', '1440 · <b>Abrigo</b>', ancho=900, recorte=(0, 400, 900, 800))}{img('e-1440-aire.png', 'Escritorio: el pueblo en estado aire libre', '1440 · <b>Aire libre</b>', ancho=900, recorte=(0, 400, 900, 800))}</div>
 <p class="sis-pie">Maquetas sobre la app real (16:00). Las bufandas, el humo, el farolito, la manta y la ropa tendida son arte propuesto. En el teléfono el cambio es pequeño a propósito: se nota si miras el pueblo, no te lo grita.</p>
 <div class="cards">
 {prop('E1', 'La escala y cuándo vuelve la calma', 'si', [QUIETO], 'Sin llamadas nuevas', [
   ('Cómo se sabe', 'Con lo que la app ya tiene: <code>/api/precio</code> y el histórico diario. Dos medidas: los 7 días y la distancia al máximo de 30 días (<code>lib.caidaGrande</code>, la de la «gran caída», que avisa desde 15 %: el valle espera a 22 %).'),
   ('Sin parpadeos', 'El estado solo cambia <b>al cambiar de turno</b> (unas seis veces al día, cuando los vecinos ya se rehacen). Para salir hay que volver un tercio hacia dentro del umbral.'),
   ('Topes', '«Manta» dura como mucho 3 días seguidos; «Abrigo» y «Aire libre», 7. Después vuelve la calma aunque el precio siga igual, y no regresa hasta que la medida salga y vuelva a entrar. Un mercado bajista de meses no deja al pueblo arropado meses.'),
   ('Mercado lateral', 'No pasa nada, y eso está bien: lo normal es discreto.'),
 ])}
 {prop('E2', 'Las caídas: Fresco y Abrigo', 'si', [QUIETO], '+1 trazo · +2 humos', [
   ('Qué', 'Compañía, no tristeza: bufandas, chocolate, chimeneas. Sin texto, sin rojo. <b>El cielo no se toca</b>: sigue la hora y la luna reales. No haría «cielo más recogido»: un cielo que oscurece con el precio ya es alarma.'),
   ('Costo', 'La bufanda es un tono más en los vecinos (+1 trazo). El humo son 1–3 animaciones lentas de día (hoy hay 11–13 de 110). De noche no hay vecinos: quedan las ventanas y el humo quieto. La chocolatera es un personaje nuevo (0 nodos: es un turno).'),
 ])}
 {prop('E3', 'La caída fuerte: los tres osos bajo la manta', 'si', [QUIETO], '+2 nodos (osos: 37 de 40)', [
   ('Qué', 'El gesto raro: los osos de la cumbre se juntan bajo una manta. No tiemblan ni lloran: están juntos. «Tú» no cambia.'),
   ('Riesgo', 'Es el estado que más se puede leer como «esto va mal». Lo defiendo porque es tierno y raro, pero es el primero que quitaría si dudas.'),
 ])}
 {prop('E4', 'Las subidas: Aire libre y Plaza', 'si', [QUIETO], '+8 nodos de día', [
   ('Qué', 'Ropa tendida, piscuchas, paseo. <b>Sin</b> brazos arriba, cohetes, farolitos ni campana: eso es de tus hitos.'),
   ('Riesgo', 'Que parezca fiesta por el precio. Por eso es vida cotidiana y no celebración, y pesa lo mismo que «Fresco».'),
 ])}
 {prop('E5', 'Quién manda cuando coinciden', 'si', [REGLA], 'Regla escrita', [
   ('Orden', 'Fiesta del calendario → fiesta de un hito tuyo → turno especial (misa, sábado de plaza) → <b>estado del precio</b> → turno normal. El estado del precio es vestuario y utilería del turno que toque, no un actor: no rompe «uno a la vez».'),
   ('Regla que se toca', '«Nada depende de si se compró» sigue intacta (esto depende del precio, que es real, como la hora o la luna).'),
 ])}
 {prop('E6', 'La prueba de que nada aconseja', 'si', [QUIETO], 'Pruebas', [
   ('Qué', 'Tres comprobaciones automáticas por estado: (1) <b>el texto de la página es idéntico</b> al de «Calma», también la descripción de la montaña (ningún estado añade palabras); (2) no aparece ninguna pieza de celebración (<code>tu-festeja</code>, <code>oseznoArriba</code>, cohetes, farolitos); (3) los colores nuevos salen de una lista fija sin rojos de alarma. Y una prueba de vocabulario sobre <code>CAMBIOS</code>: sin «compra», «vende», «momento», «oportunidad», «barato», «caro».'),
 ])}
 {prop('E7', 'Un interruptor: «El valle sigue al precio»', 'si', [QUIETO], 'Preferencia', [
   ('Qué', 'En «Tu cuenta», por dispositivo, encendido de fábrica. Si a alguien de la familia le incomoda, lo apaga y ve siempre «Calma». Con «esenciales» los estados se ven quietos; con «ninguno», también (son poses, no movimiento).'),
 ])}
 </div>
</section>'''

# ============================================================ F · el tempo
T = json.loads((AQUI / 'tempo.json').read_text())
def hist(v): 
    c = collections.Counter('<1 s' if d < 1 else '1–3 s' if d < 3 else '3–10 s' if d < 10 else '>10 s' for d in v); return [c.get(k, 0) for k in ('<1 s', '1–3 s', '3–10 s', '>10 s')]
inf = hist([a[0] for a in T['anims'] if a[1] and a[0] > 0 and a[2] != '?']); una = hist([a[0] for a in T['anims'] if not a[1] and a[0] > 0 and a[2] != '?']); tr = hist([t[0] for t in T['trans']])
def barras(nombre, h):
    mx = max(inf + una + tr)
    return f'<div class="hg"><b>{nombre}</b>' + ''.join(f'<div class="hg-f"><span>{k}</span><i data-w="{100*v/mx:.0f}"></i><em>{v}</em></div>' for k, v in zip(('<1 s', '1–3 s', '3–10 s', '>10 s'), h)) + '</div>'
AUD = json.loads((AQUI / 'audF.json').read_text())
def horas(w, pred):
    return sum(0.5 for h, r in AUD[w].items() if pred(float(h), r))
ACT = {'torogoz', 'gallinas', 'perro', 'pelota', 'barre', 'teleferico', 'pericos', 'azacuanes', 'zompopos'}
def actor_visible(w):
    def p(h, r):
        ns = {a['n'] for a in r['an'] if a['vis']}
        return bool(ns & {'ave', 'toro-ondula', 'gallina-pica', 'perro-cruza', 'vo-bota', 'vo-barre', 'tele-va', 'v-peri-pasa', 'v-aza-pasa'})
    return p
a390, a1440 = horas('390', actor_visible('390')), horas('1440', actor_visible('1440'))
dia = lambda f: (lambda h, r: 6 <= h < 18 and f(h, r))
d390, d1440 = horas('390', dia(actor_visible('390'))), horas('1440', dia(actor_visible('1440')))
luc = horas('390', lambda h, r: any(a['n'].startswith('lu-') for a in r['an']))
V = json.loads((AQUI / 'vec.json').read_text())
def oso(t, cls=''):
    v = V[t]; return f'<svg class="vo {cls}" viewBox="{v["x0"]:.1f} {v["y0"]:.1f} {v["w"]:.1f} {v["h"]:.1f}" aria-hidden="true">{v["svg"]}</svg>'
def demo(nombre, antes, despues, cuerpo):
    return f'<div class="dm"><p class="dm-t"><b>{nombre}</b></p><div class="dm-2"><div class="dm-e hoy"><span class="dm-k">Hoy · {antes}</span>{cuerpo}</div><div class="dm-e nuevo"><span class="dm-k">Propuesta · {despues}</span>{cuerpo}</div></div></div>'
DEMOS = (demo('El humo de una chimenea', '6.6 s', '16 s, tres bocanadas', '<div class="d-casa"></div><i class="d-humo h1"></i><i class="d-humo h2"></i><i class="d-humo h3"></i>')
  + demo('La bandera del campamento', '2.6 s', '5.2 s', '<div class="d-mastil"></div><div class="d-bandera"></div>')
  + demo('«Tú» sube al anotar', '1.4 s, paso de 0.32 s', '2.4 s, paso de 0.55 s', f'<div class="d-anda"><div class="d-paso">{oso("vecino")}</div></div><div class="d-suelo"></div>')
  + demo('El saludo', '1.2 s', '3.2 s, con vaivén y pausa', f'<div class="d-saluda">{oso("osezno", "a")}{oso("oseznoArriba", "b")}</div><div class="d-suelo"></div>')
  + demo('La pelota de los oseznos', 'el mismo bote cada 1.2 s', 'una jugada de 9 s con principio y final', f'<div class="d-ninos">{oso("osezno")}{oso("osezno", "esp")}<i class="d-bola"></i></div><div class="d-suelo"></div>'))
F = f'''
<section class="sec" id="F" aria-labelledby="t-F">
 <div><p class="eyebrow">F · viveza · un tema de ritmo, no de casos sueltos</p><h2 id="t-F">El tempo de la app</h2></div>
 <p class="lead">Tienes razón y se puede medir. La app es un paisaje contemplativo, pero <b>más de la mitad de sus animaciones de una sola vez duran menos de un segundo</b>, los personajes se mueven con ritmo de interfaz (0.3–1.2 s) y, de día en el teléfono, hay cuatro horas seguidas sin un solo actor. Alargar es casi gratis: lo caro es sumar elementos.</p>
 <div class="hgs">{barras(f'Animaciones de una vez ({sum(una)})', una)}{barras(f'Animaciones en bucle ({sum(inf)})', inf)}{barras('Transiciones (46)', tr)}</div>
 <p class="sis-pie">Contado sobre <code>styles.css</code>: 125 <code>@keyframes</code> y 46 transiciones; las animaciones se cuentan por declaración con nombre (los retoques de duración por <code>:nth-child</code> quedan fuera). Las de menos de 1 s incluyen la interfaz (diálogos, filas, foco), que debe seguir rápida; pero también el paso de «Tú» (0.32 s), el salto de los osos (0.9 s), el banderín (0.6–0.8 s) o el lacre (0.62 s).</p>
 <h3>Qué se mueve hoy, hora por hora</h3>
 {tabla(['Lo que se mueve', 'Cuándo', 'Dura (ciclo)', 'Tamaño a 390 / 1440', 'Por qué casi no se nota'], [
   ['3 nubes · 2 nieblas', 'Todo el día', '170–230 s · 80–110 s', '133 px · ancho entero', 'Tan lentas que parecen quietas (~2 px/s)'],
   ['Onda del lago · 2 piscuchas · farol del campamento · «Tú» respira', 'Todo el día', '7 s · 4.6 y 6.3 s · 5.2 s · 2.4 s', '45 · 35 · 32 · 26 px', 'Pequeñas, y «Tú» respira a ritmo de jadeo'],
   ['Humo del pueblo (3)', 'Amanecer y atardecer: 4 h', '6.6 s', '15 / 25 px', 'Solo dos franjas; de día no hay humo'],
   ['Torogoz', '5:00–7:00', '52 s el vuelo, 1.9 s el aleteo', '59 px', 'A esa hora casi nadie mira'],
   ['La que barre', '7:00–8:00 (según el código; el día medido no salió)', '1.2 s', '~17 / 25 px', 'Una hora; gesto de 1.2 s en bucle'],
   ['Gallinas (3)', '8:00–10:00', '2.4 s', '<b>8 / 11 px</b>', 'Ocho píxeles'],
   ['Teleférico', '10:00–13:00, <b>solo desde 1100 px</b>', '240 s', '— / 19 px', 'El teléfono no lo tiene'],
   ['Perro', '14:00–15:00', '22 s (cruza y se echa)', '17 / 25 px', 'Una hora al día. Es la única acción con principio y final'],
   ['Pelota de los oseznos', '15:00–16:30', '1.2 s', '17 / 25 px', 'El mismo bote, idéntico, 4,500 veces'],
   ['Luciérnagas (16, con dos animaciones cada una) y estrellas (32)', '18:00–5:00', '5–13 s', '14 px · 3 px', 'Aquí sí hay vida: 78–83 animaciones'],
   ['Osos de la cumbre se estiran', '7:00–8:00, cada 5 min (según el código)', '~2 s', '~34 px', '2 s de cada 300'],
 ])}
 <div class="stats"><div class="stat"><b>{a390:.1f} h</b><span>de 24 con un actor a la vista en el teléfono</span></div><div class="stat"><b>{d390:.1f} h de 12</b><span>de día (6–18) en el teléfono: {100*d390/12:.0f} %</span></div><div class="stat"><b>{d1440:.1f} h de 12</b><span>de día en escritorio: {100*d1440/12:.0f} %</span></div><div class="stat"><b>0</b><span>actores en el teléfono de 10:00 a 14:00</span></div><div class="stat"><b>11–14 / 78–83</b><span>animaciones de día / de noche (tope 110)</span></div></div>
 <p class="sis-pie">Medido en la página real cada media hora de un día normal de noviembre (<code>libro.hora</code>, efectos «todos», 390×844 y 1440×900; pericos, azacuanes y zompopos son de otras fechas). Técnicamente siempre hay algo moviéndose (las nubes): el 100 % no dice nada. Lo que cuenta es el actor. Al deslizar, la pausa lo detiene todo y eso está bien. <b>Diagnóstico</b>: (1) de día el presupuesto está vacío, 13 de 110; (2) los actores viven en franjas de 1–2 h y miden 8–25 px; (3) lo continuo es demasiado lento o demasiado pequeño para verse; (4) el teléfono recibe menos; (5) los gestos de personaje duran lo que una transición de botón.</p>
 <h3>Hoy contra la propuesta</h3>
 <div class="dms" id="dms">{DEMOS}</div>
 <p class="sis-pie"><button class="btn" type="button" id="dm-pausa" aria-pressed="false">Pausar las demostraciones</button> Son esquemas para comparar el ritmo, con los osos del pueblo de verdad; no son el arte final. Con movimiento reducido no se mueven.</p>
 {tabla(['Animación', 'Hoy', 'Propuesta', 'Familia'], [
   ['«Tú» anda (paso) · la subida entera', '0.32 s · 1.4 s', '<b>0.55 s · 2.4 s</b>', 'gesto'], ['«Tú» y el eco respiran', '2.4 s · 5 s', '<b>4.8 s · 8 s</b>', 'ambiente'],
   ['Los osos saltan · saludan · se estiran', '0.9 · 1.2 · ~2 s', '<b>1.8 · 3.2 · 6 s</b>', 'acción'], ['Banderín: izar · ondear', '0.8 s · 2.6 s', '<b>1.6 s · 5.2 s</b>', 'gesto · ambiente'],
   ['Papel picado', '3.4 s', '<b>6.5 s</b>', 'ambiente'], ['Humo del pueblo · humo del farol', '6.6 s · 5.2 s', '<b>16 s · 9 s</b>', 'ambiente'],
   ['Piscuchas', '4.6 y 6.3 s', '<b>9 y 13 s</b>', 'ambiente'], ['Onda del lago · brillo del lago', '7 s · 5 s', '<b>12 s · 9 s</b>', 'ambiente'],
   ['Gallina pica · la que barre', '2.4 s · 1.2 s', '<b>3.6 s con pausa · 2.8 s</b>', 'acción'], ['Pelota', '1.2 s en bucle', '<b>jugada de 9 s</b>', 'acción'],
   ['Remo del pescador', '2.6 s', '<b>4.2 s</b>', 'acción'], ['Cohete: sube y estalla · chispa', '3.4 s · 1.25 s', '<b>5.5 s · 2.2 s</b>', 'fiesta'],
   ['Tarjeta de hito: ligera · etapa · campamento', '1.7 · 2.0 · 2.6 s', '<b>2.6 · 3.5 · 4.5 s</b> (se cierra con un toque)', 'celebración'], ['Lacre que cae · destello', '0.62 · 0.7 s', '<b>1.1 · 1.4 s</b>', 'celebración'],
   ['Anillos · brasas · el cielo respira', '1.4 · 1.2 · 2.0 s', '<b>2.4 · 2.0 · 4.0 s</b>', 'celebración'], ['Cometa · luz de la cima · aurora épica', '1.9 · 2.8 · 6 s', '<b>3.2 · 4.5 · 9 s</b>', 'celebración'],
   ['La escena al abrir: fundido · asienta · enciende', '0.45 · 1.2 · 1.6 s', '<b>0.9 · 2.0 · 2.6 s</b>', 'entrada'], ['Moneda al lago', '1.6–1.7 s', '<b>2.6 s</b>', 'gesto'],
   ['Nubes', '170–230 s', '<b>110–150 s</b> (que se note que pasan)', 'ambiente'], ['Aleteo del torogoz · llama · luciérnagas · estrellas · niebla · perro · teleférico', '1.9 s · 1.1 s · 5–13 s · 4–8 s · 80–110 s · 22 s · 240 s', '<b>Igual</b>: ya están en su tempo', '—'],
   ['<b>No se alargan</b>: diálogos (0.24 s), filas de la lista (0.3–0.35 s), cambio de gráfico (0.28–0.35 s), el campo que se agita (0.42 s), la pestaña (0.32 s), la nota que suena (0.42 s), cargando, foco y pulsado', '&lt; 0.5 s', '<b>Igual</b>: responden a tu dedo', 'interfaz'],
 ])}
 <div class="cards">
 {prop('F1', 'Tres tempos con nombre, en variables', 'si', [QUIETO], '0 nodos · 0 animaciones', [
   ('Qué', '<code>--t-gesto</code> 1.2–2.5 s (un personaje hace algo corto), <code>--t-accion</code> 4–10 s (algo con principio y final), <code>--t-ambiente</code> 12–60 s (lo que respira). Curvas suaves de entrada y salida; pausa dentro del ciclo en lugar de repetir pegado. La interfaz conserva su tempo rápido. La tabla de arriba es el cambio completo.'),
   ('Costo', 'Ninguno en nodos ni en animaciones a la vista: los mismos elementos, más despacio. Una animación más lenta no pinta más. La pausa al deslizar no cambia. <b>Único cuidado</b>: las celebraciones más largas mantienen sus capas activas más segundos; por eso se saltan con un toque.'),
   ('Niveles', '«Esenciales» conserva lo que acompaña una acción, al tempo nuevo. «Ninguno»: el estado final, como hoy. <code>MS_SUBIDA</code> y las esperas de «Probar la celebración» se alargan a la par.'),
   ('Riesgo', 'Que anotar se sienta lento. Por eso la subida pasa a 2.4 s y no más, y el comprobante no espera a que termine. Hay que tocarlo con el dedo: lo decides tú en el iPhone.'),
 ])}
 {prop('F2', 'Acciones con principio y final en vez de bucles cortos', 'si', [MUEVE], '0 nodos', [
   ('Qué', 'La pelota deja de botar igual 4,500 veces: bota tres veces cada vez más bajo, rueda, un osezno la recoge, pausa. La gallina pica dos veces y levanta la cabeza. La que barre da tres pasadas y descansa. Los osos se estiran en 6 s. Mismos <code>&lt;svg&gt;</code> pequeños, mismos nodos: cambian los fotogramas clave.'),
 ])}
 {prop('F3', 'Viveza continua de día: un actor y hasta tres ambientales', 'si', [REGLA, SITIO], '+3 animaciones de día', [
   ('La excepción', '«Uno a la vez» se queda para los <b>actores</b>. Se añade una clase nueva, <b>ambiental</b>: como mucho tres a la vez, ciclo ≥ 12 s, recorrido ≤ 20 px, sin cruzar la escena, cada uno en su capa pequeña o como elemento HTML, solo <code>transform</code>/<code>opacity</code>.'),
   ('Cuáles', 'Humo en una o dos chimeneas todo el día (hoy solo 4 h). La ropa tendida o las banderitas, que se mecen. El cayuco del lago, a la deriva también de día. Con eso el pueblo nunca está quieto del todo.'),
   ('Costo medido', 'De día hay 11–14 animaciones de 110. En el teléfono (390, CPU 4× más lenta) añadir 6 y 12 capas pequeñas lentas no movió los 60 fps. En escritorio a 2× el sandbox, que pinta sin GPU, ya va a 31–35 fps <b>hoy</b> y bajó a 20 con 6 capas: no es concluyente, pero dice que en pantallas grandes cada capa cuesta por píxel. Por eso son tres y pequeñas, y por eso va detrás de «Hacer sitio 2» y del banco A/B.'),
 ])}
 {prop('F4', 'El teléfono de 10:00 a 14:00 tiene su propio actor', 'si', [MUEVE], '0 nodos nuevos', [
   ('Qué', 'En escritorio esa franja es del teleférico; en el teléfono está vacía. Propongo que allí sea del lago: el pescador rema y recoge la red (acción de 10 s cada minuto). Ya está dibujado; hoy solo se mueve al amanecer.'),
 ])}
 {prop('F5', 'Lo que sube con «Hacer sitio 2» y con el director', 'despues', [SITIO], 'Campamentos 39 y 51', [
   ('Qué', 'El vaivén de los árboles en grupos y más actores simultáneos <b>no</b> entran ahora: mover un <code>&lt;g&gt;</code> del dibujo grande repinta todo en Safari, y los pinos son cientos de nodos. Necesitan que el 39 los pase a su capa. El director (51) es quien debe repartir ambientales y actores por hora; hasta entonces, la lista fija de F3.'),
 ])}
 </div>
</section>'''

# ============================================================ cierre
SITIO_T = tabla(['Propuesta', 'Qué exige antes', 'Regla que cambia'], [
  ['A1, A3 · la fiesta', 'El director (51) para <code>data-mueve="fiesta"</code>; dibujar farolitos, olla y tazas; caso «fiesta en noche de lluvia» en el banco', '«Uno a la vez» (hasta 2 capas, 30 s, una vez por compra) y «nada depende de si se compró» (solo el momento y el farol)'],
  ['A2 · no repetir', 'Migración 19 con su prueba', '—'],
  ['B1–B4 · el nodo', 'Tu mempool.space y el túnel; <code>/api/red</code>; el diagrama del README', '—'],
  ['C1–C4 · miles', 'Nada: se puede hacer ya, después del 41', 'La frase «una nota por compra» de la partitura'],
  ['D1–D5 · la tele', 'Saber el aparato (D7); recolocar el pueblo de la tele', 'Presupuesto nuevo: 24 animaciones en la tele'],
  ['E · el precio', 'Dibujar bufanda, manta, chocolatera y ropa tendida; las pruebas de E6', 'Orden de mando escrito (E5)'],
  ['F1, F2 · el tempo', 'Nada: solo duraciones', '—'],
  ['F3 · ambientales', '«Hacer sitio 2» (39) y banco A/B; tu medida en el iPhone', '«Uno a la vez»: un actor y hasta tres ambientales'],
])
REABRE = ''.join(f'<li><b>{k}</b> {v}</li>' for k, v in [
  ('Valle (22, 22B): «uno en movimiento a la vez» y «nada depende de si se compró».', 'A3 y F3 piden excepciones acotadas.'),
  ('Pueblo de osos (35): «ocho como mucho y nunca según las cuentas».', 'La fiesta respeta los ocho pero reacciona a un hito (A3).'),
  ('Etapas (21): la intermedia es ligera a propósito.', 'A le añade 6 s de gesto en el pueblo; si prefieres dejarla como está, marca «no» y la fiesta queda para principales y campamentos.'),
  ('Etapas (21) y «Tú» (31): duraciones de la tarjeta y del andar.', 'F1 las alarga.'),
  ('Tele (21B, pulido A): qué enseña la tele.', 'D2 quita dos datos y agranda los rótulos; D3 mueve el pueblo; D5 mueve las tarjetas. La regla del saldo contra la montaña no se toca.'),
  ('Partitura (13C): «una nota por compra».', 'C1 la agrega por semana a partir de 60 notas.'),
  ('Descartes que rozo y no retomo:', '«sonidos del paisaje» (las campanas son mudas), «cuaderno de avistamientos» (B6, no), «clima real» (E no toca el cielo), «rueda de agosto» (la rueda es un baile).'),
])
DUDAS = ''.join(f'<li><b>{k}</b> {v}</li>' for k, v in [
  ('¿Qué aparato mueve la tele?', 'Si es el navegador de una tele anterior a 2025, puede que la app no cargue bien (D7). Es lo primero que necesito saber de D.'),
  ('¿La manta de los tres osos sí o no?', 'Es el gesto más tierno de E y también el que más se acerca a «esto va mal» (E3).'),
  ('¿2.4 s para que «Tú» suba al anotar?', 'Hoy es 1.4 s. Es el único alargue que tocas con el dedo cada semana (F1).'),
  ('¿La familia ve la fiesta entera?', 'Propongo que no: quien anota y la tele sí; los demás, el farol del hito (A2).'),
  ('¿El halving se celebra?', 'No es un hito tuyo. Lo propongo como fiesta del pueblo, sin «Tú» (B3).'),
  ('¿«Tocar este año» por semanas?', 'Con miles de notas ya no puede sonar una por compra (C1).'),
])
RESUMEN = ''.join(f'<li>{t}</li>' for t in [
  '<b>A · La fiesta del hito</b>: campana, plaza, farolitos, cohetes y chocolate en 24 s (12 y 6 para las etapas), una vez por hito y con marca en el servidor. +22 nodos solo mientras dura.',
  '<b>B · El nodo</b>: una tarjeta «Pulso de la red» y la campana de la torre con cada bloque; lo raro (1,000, ajuste, halving, el bloque un millón) tiene su gesto. Sin ositos mensajeros ni colecciones.',
  '<b>C · Miles de compras</b>: todo aguanta menos la partitura (2,273 nodos) y la constelación (10,041). Pasan a figuras por semana y por mes, con el detalle al tocar: menos de 120 nodos.',
  '<b>D · La tele</b>: componerla a 1080p y escalarla, rótulos legibles, el pueblo más grande, 24 animaciones como tope y deriva contra el quemado. Antes: saber en qué aparato corre.',
  '<b>E · El precio</b>: si baja, el pueblo se arropa; si sube, sale al aire libre. Nunca se ve peor, nunca festeja el precio, nunca cambia un texto.',
  '<b>F · El tempo</b>: tres escalas de duración. Casi todo lo ambiental, de personajes y de fiesta dura el doble; la interfaz, igual. Cuesta cero nodos.',
])

EXTRA_CSS = '''
.tira4 { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 170px), 1fr)); gap: 10px; align-items: start; }
.tira4 figure, .protos figure { margin: 0; border-radius: 12px; overflow: hidden; border: 1px solid var(--line); background: var(--s1); }
.tira4 img { display: block; width: 100%; height: auto; } .tira4 figcaption, .protos figcaption { font-size: 0.78rem; color: var(--muted); padding: 7px 10px; background: var(--s2); }
.tira4 figcaption b, .vp-dia figcaption b, .protos figcaption b { color: var(--fg); }
.vp-dia { grid-template-columns: repeat(auto-fit, minmax(min(100%, 300px), 1fr)); align-items: start; }
.tri { border: 0; border-top: 1px solid var(--line); margin: 0; padding: 10px 0 0; display: flex; gap: 8px; flex-wrap: wrap; }
.tri label { display: inline-flex; align-items: center; gap: 8px; min-height: 44px; padding: 0 14px; border: 1.5px solid var(--line); border-radius: 999px; font-weight: 600; font-size: 0.9rem; cursor: pointer; background: var(--s1); }
.tri input { width: 18px; height: 18px; accent-color: var(--accent); margin: 0; }
.tri label:has(input:checked) { border-color: var(--accent); background: var(--s2); }
.card[data-estado="no"] { opacity: 0.66; } .card[data-estado="si"] { border-color: var(--accent); }
.cards { grid-template-columns: repeat(auto-fill, minmax(min(100%, 330px), 1fr)); }
table { min-width: 560px; }
.protos { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 300px), 1fr)); gap: 14px; align-items: start; }
.pp-marco { padding: 10px; background: #0b1119; } .pp-marco svg { display: block; width: 100%; height: auto; }
.pp-papel { fill: #f6edd8; } .pp-linea { fill: none; stroke: #a8997e; stroke-width: 0.6; } .pp-barra { fill: none; stroke: #6f6150; stroke-width: 0.9; }
.pp-clave { fill: #3a3027; } .pp-nieve { fill: #fffdf6; } .pp-rango { fill: none; stroke: #6f6150; stroke-width: 1.1; stroke-linecap: round; } .pp-plica { fill: none; stroke: #2b2118; stroke-width: 0.9; }
.pp-cab { fill: #2b2118; } .pp-cab.pp-ex { fill: #e8730a; } .pp-sil { fill: none; stroke: #a8997e; stroke-width: 1.6; stroke-linecap: round; }
.pp-num { font: 700 7.5px var(--sans); fill: #4a3d30; } .pp-eti { font: 600 6.6px var(--sans); fill: #7d6f5c; letter-spacing: 0.04em; }
.pp-toque { fill: transparent; } .pp-toque:hover { fill: rgb(232 115 10 / 0.12); } .pp-sel { fill: rgb(232 115 10 / 0.16); stroke: #e8730a; stroke-width: 0.9; }
.pp-pista { display: inline-block; width: 0.85em; height: 0.62em; border-radius: 50%; background: #e8730a; vertical-align: baseline; }
.pc-cielo { fill: #0f1a33; } .pc-no { fill: #f4ead0; } .pc-ex { fill: #ffb347; }
.mocks { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 300px), 1fr)); gap: 16px; align-items: start; }
.mocks > div { min-width: 0; display: grid; gap: 6px; } .mocks .lbl { min-width: 0; }
.mock { background: var(--s1); border: 1px solid var(--line); border-radius: 18px; padding: 16px; display: grid; gap: 10px; min-width: 0; }
.mock.tel { max-width: 358px; } .mk-k { font: 700 0.72rem var(--sans); letter-spacing: 0.1em; text-transform: uppercase; color: var(--faint); display: flex; justify-content: space-between; gap: 8px; }
.mk-f { color: var(--muted); text-transform: none; letter-spacing: 0; font-weight: 600; }
.mk-g { display: flex; gap: 10px; align-items: baseline; flex-wrap: wrap; } .mk-g b { font: 600 2rem/1 var(--serif); } .mk-g span { color: var(--muted); font-size: 0.9rem; }
.mk-r { display: grid; gap: 10px; grid-template-columns: repeat(auto-fit, minmax(min(100%, 130px), 1fr)); border-top: 1px solid var(--line); padding-top: 10px; }
.mk-r div { display: grid; gap: 1px; min-width: 0; } .mk-r b { font: 600 1.02rem var(--serif); } .mk-r small, .mock.linea small { font-size: 0.76rem; color: var(--muted); }
.mock.linea { max-width: 358px; gap: 2px; padding: 12px 16px; } .mock.linea b { font-family: var(--serif); }
.hgs { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 240px), 1fr)); gap: 12px; }
.hg { background: var(--s1); border: 1px solid var(--line); border-radius: 14px; padding: 12px 14px; display: grid; gap: 6px; } .hg > b { font: 600 0.98rem var(--serif); }
.hg-f { display: grid; grid-template-columns: 4.2em 1fr 2.4em; gap: 8px; align-items: center; font-size: 0.82rem; color: var(--muted); }
.hg-f i { height: 10px; border-radius: 3px; background: var(--accent); width: var(--w); min-width: 2px; } .hg-f em { font-style: normal; font-weight: 700; color: var(--fg); text-align: right; }
.dms { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 300px), 1fr)); gap: 12px; }
.dm { background: var(--s1); border: 1px solid var(--line); border-radius: 16px; padding: 12px; display: grid; gap: 8px; min-width: 0; } .dm-t b { font: 600 1rem var(--serif); }
.dm-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.dm-e { position: relative; height: 128px; border-radius: 10px; overflow: hidden; background: linear-gradient(#9fc3d8 0 72%, #8f8468 72%); min-width: 0; }
.dm-k { position: absolute; left: 6px; top: 5px; right: 6px; font: 700 0.66rem/1.2 var(--sans); color: #1d2a33; z-index: 2; }
.vo { position: absolute; bottom: 22px; width: 34px; height: auto; overflow: visible; }
.vo .v-vo-pelo, .vo .v-vo-pelo2 { fill: #fffdf8; } .vo .v-vo-som { fill: #c5ccd8; } .vo .v-vo-r0 { fill: #2e8b62; } .vo .v-vo-r1 { fill: #c8452f; } .vo .v-vo-r2 { fill: #e3a92a; }
.vo .v-vo-palma { fill: #d8b56a; } .vo .v-vo-rasgo { fill: #1f1713; } .vo .v-vo-brasa { fill: #e8742c; } .vo .v-vo-pie { fill: #3a3326; fill-opacity: 0.3; }
.d-suelo { position: absolute; left: 0; right: 0; bottom: 0; height: 28%; }
.d-casa { position: absolute; left: 50%; bottom: 28%; width: 46px; height: 30px; margin-left: -23px; background: #d9cdb4; border-top: 12px solid #a34a34; }
.d-casa::after { content: ""; position: absolute; left: 30px; top: -24px; width: 7px; height: 14px; background: #7a5a48; }
.d-humo { position: absolute; left: calc(50% + 6px); bottom: 74px; width: 10px; height: 10px; border-radius: 50%; background: #f4f0e6; opacity: 0; animation: d-humo var(--d) ease-out infinite; }
.hoy .d-humo { --d: 6.6s; } .hoy .d-humo.h2, .hoy .d-humo.h3 { display: none; } .nuevo .d-humo { --d: 16s; } .nuevo .h2 { animation-delay: -5.3s; } .nuevo .h3 { animation-delay: -10.6s; }
@keyframes d-humo { 0% { transform: translate(0, 0) scale(0.6); opacity: 0; } 15% { opacity: 0.8; } 100% { transform: translate(14px, -44px) scale(2); opacity: 0; } }
.d-mastil { position: absolute; left: 44%; bottom: 28%; width: 3px; height: 62px; background: #5a4a3a; }
.d-bandera { position: absolute; left: calc(44% + 3px); bottom: calc(28% + 40px); width: 34px; height: 20px; background: #ff9228; clip-path: polygon(0 0, 100% 18%, 78% 50%, 100% 82%, 0 100%); transform-origin: 0 50%; animation: d-ondea var(--d) ease-in-out infinite alternate; }
.hoy .d-bandera { --d: 1.3s; } .nuevo .d-bandera { --d: 2.6s; }
@keyframes d-ondea { from { transform: skewY(-9deg) scaleX(1); } to { transform: skewY(9deg) scaleX(0.9); } }
.d-anda { position: absolute; left: 8px; bottom: 0; width: 34px; height: 100%; animation: d-anda var(--d) ease-in-out infinite; } .d-paso { position: absolute; inset: 0; animation: d-paso var(--p) steps(2, jump-none) infinite alternate; }
.d-anda .vo { left: 0; } .hoy .d-anda { --d: 4.4s; --p: 0.16s; animation-name: d-anda-a; } .nuevo .d-anda { --d: 5.4s; --p: 0.275s; animation-name: d-anda-b; }
@keyframes d-anda-a { 0%, 5% { transform: translateX(0); } 37%, 92% { transform: translateX(var(--rec, 84px)); } 100% { transform: translateX(0); } }
@keyframes d-anda-b { 0%, 4% { transform: translateX(0); } 48%, 94% { transform: translateX(var(--rec, 84px)); } 100% { transform: translateX(0); } }
@keyframes d-paso { from { transform: translateY(0) rotate(-2deg); } to { transform: translateY(-2.5px) rotate(2deg); } }
.d-saluda { position: absolute; left: 50%; bottom: 0; width: 30px; height: 100%; margin-left: -15px; } .d-saluda .vo { left: 0; width: 30px; }
.hoy .d-saluda .a { animation: d-sal-a 4.2s steps(1) infinite; } .hoy .d-saluda .b { animation: d-sal-b 4.2s steps(1) infinite; }
.nuevo .d-saluda .a { animation: d-sal-a2 7s steps(1) infinite; } .nuevo .d-saluda .b { animation: d-sal-b2 7s ease-in-out infinite; transform-origin: 50% 100%; }
@keyframes d-sal-a { 0%, 28% { opacity: 0; } 29%, 100% { opacity: 1; } } @keyframes d-sal-b { 0%, 28% { opacity: 1; } 29%, 100% { opacity: 0; } }
@keyframes d-sal-a2 { 0%, 46% { opacity: 0; } 47%, 100% { opacity: 1; } }
@keyframes d-sal-b2 { 0% { opacity: 1; transform: rotate(0); } 12% { transform: rotate(-7deg); } 24% { transform: rotate(7deg); } 36% { transform: rotate(-5deg); } 46% { opacity: 1; transform: rotate(0); } 47%, 100% { opacity: 0; } }
.d-ninos { position: absolute; inset: 0; } .d-ninos .vo { width: 26px; left: 22%; } .d-ninos .vo.esp { left: auto; right: 22%; transform: scaleX(-1); }
.d-bola { position: absolute; left: calc(50% - 5px); bottom: 24px; width: 10px; height: 10px; border-radius: 50%; background: #c8452f; }
.hoy .d-bola { animation: d-bota 0.6s cubic-bezier(0.3, 0, 0.7, 1) infinite alternate; } @keyframes d-bota { from { transform: translateY(0); } to { transform: translateY(-34px); } }
.nuevo .d-bola { animation: d-jugada 9s linear infinite; }
@keyframes d-jugada { 0% { transform: translate(-22px, -8px); animation-timing-function: ease-out; } 7% { transform: translate(-10px, -40px); animation-timing-function: ease-in; } 14% { transform: translate(2px, 0); animation-timing-function: ease-out; } 20% { transform: translate(9px, -24px); animation-timing-function: ease-in; } 26% { transform: translate(16px, 0); animation-timing-function: ease-out; } 30% { transform: translate(20px, -11px); animation-timing-function: ease-in; } 34% { transform: translate(24px, 0); } 48% { transform: translate(34px, 0); } 62% { transform: translate(34px, 0); } 70% { transform: translate(26px, -8px); } 84% { transform: translate(-22px, -8px); } 100% { transform: translate(-22px, -8px); } }
.dms.pausa * { animation-play-state: paused !important; }
h3 { margin-top: 6px; }
@media (prefers-reduced-motion: reduce) { .d-humo { opacity: 0.7; } }
'''
JS = r'''
const CLAVE = 'diseno-cnm-v1';
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
  document.getElementById('costos').textContent = nc ? `Cambiaste ${nc} respecto a lo propuesto: ${Object.entries(cambios).map(([k, v]) => `${k} → ${nombre[v].toLowerCase()}`).join(', ')}` : 'Tal como lo propongo. Cambia lo que quieras en cada tarjeta.';
  document.getElementById('salida').value = `Mi elección (diseño A–F: celebración, nodo, miles, tele, precio y tempo · 24 nov 2026)\nSÍ: ${por.si.join(', ') || '—'}\nDESPUÉS: ${por.despues.join(', ') || '—'}\nNO: ${por.no.join(', ') || '—'}\n${nc ? 'Cambios respecto a lo propuesto: ' + Object.entries(cambios).map(([k, v]) => `${k} → ${nombre[v].toLowerCase()}`).join(', ') : 'Sin cambios respecto a lo propuesto.'}\nNotas: `;
}
for (const c of props) { const v = guardado[c.dataset.id]; if (v && nombre[v]) { const r = c.querySelector(`input[value="${v}"]`); if (r) r.checked = true; } c.addEventListener('change', pintar); }
document.getElementById('limpiar').addEventListener('click', () => { for (const c of props) c.querySelector(`input[value="${c.dataset.rec}"]`).checked = true; pintar(); });
document.getElementById('copiar').addEventListener('click', async () => {
  const t = document.getElementById('salida').value, m = document.getElementById('copiado');
  try { await navigator.clipboard.writeText(t); m.textContent = 'Copiado. Pégalo en el chat.'; }
  catch (e) { document.getElementById('extra').open = true; const s = document.getElementById('salida'); s.focus(); s.select(); m.textContent = 'No pude copiar solo: el texto está seleccionado abajo.'; }
});
document.getElementById('dm-pausa').addEventListener('click', (e) => { const p = document.getElementById('dms').classList.toggle('pausa'); e.currentTarget.setAttribute('aria-pressed', String(p)); e.currentTarget.textContent = p ? 'Reanudar las demostraciones' : 'Pausar las demostraciones'; });
for (const i of document.querySelectorAll('.hg-f i[data-w]')) i.style.setProperty('--w', i.dataset.w + '%');
pintar();
'''
INDICE = ''.join(f'<a href="#{i}">{t}</a>' for i, t in [('A', 'A · La fiesta del hito'), ('B', 'B · El nodo'), ('C', 'C · Miles de compras'), ('D', 'D · La tele'), ('E', 'E · El precio'), ('F', 'F · El tempo'), ('sitio', 'Qué exige y qué cambia'), ('reabre', 'Lo que reabre'), ('dudas', 'Dudas para ti')])
cuerpo = A + B + C + D + E_ + F
n_si = sum(1 for p in PROPS if p[2] == 'si')
DOC = f'''<title>Fiesta, nodo y tempo</title>
<meta name="claude:viewport-fit-sides" content="cover">
<style>
{CSS.replace('__FRAUNCES__', fuente('fraunces.woff2')).replace('__BRICOLAGE__', fuente('bricolage.woff2')).replace('/*__CSS_POSES__*/', '')}
{EXTRA_CSS}
</style>
<div class="wrap">
 <header class="top">
  <p class="eyebrow">Libro DCA · diseño antes de implementar · 24 nov 2026</p>
  <h1>La fiesta, el nodo, los miles, la tele, el precio y el tempo</h1>
  <p class="lead">Seis cosas que pediste pensar antes de tocarlas. Todo son propuestas: nada de esto está en el repo. Las maquetas están hechas sobre la app de verdad; lo que es arte nuevo lo digo en cada una. Marca sí, después o no en cada tarjeta y copia tu elección abajo.</p>
  <div class="stats"><div class="stat"><b>{len(PROPS)}</b><span>propuestas</span></div><div class="stat"><b>{n_si}</b><span>recomendadas</span></div><div class="stat"><b>+22</b><span>nodos, solo durante la fiesta</span></div><div class="stat"><b>0</b><span>nodos para el tempo</span></div><div class="stat"><b>10,041 → ~40</b><span>nodos de la constelación con 10,000 compras</span></div></div>
  <div class="resumen" aria-labelledby="t-res"><p class="eyebrow" id="t-res">En corto</p><ol>{RESUMEN}</ol></div>
  <nav aria-label="Índice" class="indice">{INDICE}</nav>
 </header>
 {cuerpo}
 <section class="sec" id="sitio" aria-labelledby="t-sitio"><div><p class="eyebrow">Con honestidad</p><h2 id="t-sitio">Qué exige trabajo previo y qué regla cambia</h2></div>{SITIO_T}
  <p class="nota"><b>Sin probar aquí:</b> un iPhone real, Safari, una tele de verdad, tu nodo y el túnel. Los fotogramas por segundo de pantallas grandes en el sandbox no valen como medida (pinta sin GPU). Todo lo que toca la escena se mide con el banco contra <code>main</code> y con «Medir este aparato» en tu teléfono antes de darlo por bueno: el umbral sigue en 55 fps.</p></section>
 <section class="sec" id="reabre" aria-labelledby="t-reabre"><div><p class="eyebrow">Dicho claro, como pediste</p><h2 id="t-reabre">Decisiones que esto reabre</h2></div><ul class="fuera">{REABRE}</ul>
  <p class="nota"><b>Lo que no hice:</b> no corrí el banco ni «Medir este aparato» (no hay nada implementado que medir: los nodos de la fiesta, del nodo y del precio son <b>cuentas de la maqueta</b>, no de código); no capturé las vistas actuales de «Tu historia» a 320 ni a 3840; no medí el libro de cumbre ni «tal día como hoy» con miles (se ven y abren, sin cifra); la pausa al deslizar no la medí, la doy por lo que dice el código; y la tabla del tempo no separa cada animación por nivel de efectos.</p></section>
 <section class="sec" id="dudas" aria-labelledby="t-dudas"><div><p class="eyebrow">Lo que solo decides tú</p><h2 id="t-dudas">Dudas para ti</h2></div><ul class="fuera">{DUDAS}</ul></section>
</div>
<div class="barra" role="region" aria-label="Mi elección"><div class="in">
 <div class="fila"><div class="res"><span id="resumen-sel"></span><small id="costos"></small></div><button class="btn" id="limpiar" type="button">Volver a lo propuesto</button><button class="btn pri" id="copiar" type="button">Copiar mi elección</button></div>
 <details id="extra"><summary>Ver el texto para pegar</summary><textarea id="salida" readonly aria-label="Texto de mi elección para pegar en el chat"></textarea></details>
 <p class="copiado" id="copiado" role="status"></p>
</div></div>
<script>{JS}</script>
'''
out = AQUI / 'diseno-celebracion-nodo-miles.html'
out.write_text(DOC)
print(out, round(len(DOC) / 1048576, 2), 'MB', len(PROPS), 'propuestas', 'actor 390', a390, d390, 'actor 1440', a1440, d1440, 'luc', luc)
