"""Prototipos estáticos de «Tu historia» a miles (campamentos 57/58). Mismos datos que la app (datosN.json)."""
import json, math, pathlib, datetime as dt, statistics
AQUI = pathlib.Path(__file__).parent
MES = 'ene feb mar abr may jun jul ago sep oct nov dic'.split()
def cargar(n):
    cs = [c for c in json.loads((AQUI / f'datos{n}.json').read_text()) if c['tipo'] != 'venta' and c['precio'] > 0]
    cs.sort(key=lambda c: (c['fecha'], c['id']))
    logs = [math.log(c['precio']) for c in cs]; lo, hi = min(logs), max(logs)
    for c, l in zip(cs, logs):
        c['paso'] = round((l - lo) / (hi - lo) * 12) if hi > lo else 6
        c['d'] = dt.date.fromisoformat(c['fecha'])
    return cs
f1 = lambda v: f'{v:.1f}'.rstrip('0').rstrip('.')
X0, X1, SIS, PP = 34, 308, 60, 3.1
def elipse(x, y, rx, ry):
    return f'M{f1(x-rx)} {f1(y)}a{f1(rx)} {f1(ry)} 0 1 0 {f1(2*rx)} 0a{f1(rx)} {f1(ry)} 0 1 0 {f1(-2*rx)} 0Z'
def pauta(S, alto_extra=0, etiquetas=None):
    H = 20 + S * SIS + alto_extra
    yc = lambda j: 14 + SIS / 2 + j * SIS
    yN = lambda j, p: yc(j) - (p - 6) * PP
    s = f'<svg class="pp" viewBox="0 0 320 {H}" role="img" aria-label="Prototipo de la partitura"><rect class="pp-papel" x="1" y="1" width="318" height="{H-2}" rx="9"/>'
    lin = ''.join(f'M12 {f1(yN(j,p))}H{X1}' for j in range(S) for p in (2, 4, 6, 8, 10))
    bar = ''.join(f'M12 {f1(yN(j,10))}V{f1(yN(j,2))}M{X1} {f1(yN(j,10))}V{f1(yN(j,2))}' for j in range(S))
    s += f'<path class="pp-linea" d="{lin}"/><path class="pp-barra" d="{bar}"/>'
    for j in range(S):  # la clave de montaña, sencilla
        x, y = 15, yc(j)
        s += f'<path class="pp-clave" d="M{x} {f1(y+9)}L{x+7} {f1(y-9)}L{x+14} {f1(y+9)}Z"/><path class="pp-nieve" d="M{x+4.6} {f1(y-3)}L{x+7} {f1(y-9)}L{x+9.4} {f1(y-3)}L{x+7} {f1(y-1)}Z"/>'
        if etiquetas: s += f'<text class="pp-eti" x="{X1}" y="{f1(yN(j,10)-6.5)}" text-anchor="end">{etiquetas[j]}</text>'
    return s, H, yN
def figura(x, yN, j, grupo, cuenta_min=5, rmax=5.2):
    """Una figura resumen: la barra del rango de precios, la cabeza en la mediana (más grande con más compras), naranja si la mayoría fue extra."""
    ps = [c['paso'] for c in grupo]; n = len(grupo); ex = sum(1 for c in grupo if c['extra'])
    med = statistics.median_low(ps); r = min(rmax, 2.5 + 0.85 * math.sqrt(n - 1))
    cls = 'ex' if ex * 2 > n else 'no'
    out = {'rango': '', 'no': '', 'ex': '', 'num': ''}
    if max(ps) > min(ps): out['rango'] = f'M{f1(x)} {f1(yN(j,max(ps)))}V{f1(yN(j,min(ps)))}'
    out[cls] = elipse(x, yN(j, med), r, r * 0.74)
    if n >= cuenta_min: out['num'] = f'<text class="pp-num" x="{f1(x)}" y="{f1(yN(j,0)+7.5)}" text-anchor="middle">{n}</text>'
    return out
def junta(figs):
    k = {a: ''.join(f[a] for f in figs) for a in ('rango', 'no', 'ex', 'num')}
    return f'<path class="pp-rango" d="{k["rango"]}"/><path class="pp-cab" d="{k["no"]}"/><path class="pp-cab pp-ex" d="{k["ex"]}"/>{k["num"]}'
def silencio(x, y): return f'M{f1(x-2.2)} {f1(y)}h4.4'
def por_semana(cs, anio):
    """El año por semanas: 4 sistemas de 13 semanas (un trimestre cada uno); nunca más de 52 figuras."""
    s, H, yN = pauta(4, etiquetas=['ene · feb · mar', 'abr · may · jun', 'jul · ago · sep', 'oct · nov · dic'])
    sem = {}
    for c in cs:
        if c['d'].year == anio: sem.setdefault(min(51, (c['d'].timetuple().tm_yday - 1) // 7), []).append(c)
    figs, sil, toques = [], '', ''
    ancho = (X1 - X0 - 8) / 13
    ult = max(sem) if sem else 0
    for w in range(52):
        j, k = divmod(w, 13); x = X0 + 4 + (k + 0.5) * ancho
        if w in sem: figs.append(figura(x, yN, j, sem[w]))
        elif w < ult: sil += silencio(x, yN(j, 6))
        if w <= ult: toques += f'<rect class="pp-toque" x="{f1(x-ancho/2)}" y="{f1(yN(j,13))}" width="{f1(ancho)}" height="{f1(16*PP)}"/>'
    wsel = max(sem, key=lambda w: len(sem[w]))
    j, k = divmod(wsel, 13); x = X0 + 4 + (k + 0.5) * ancho
    s += f'<rect class="pp-sel" x="{f1(x-ancho/2)}" y="{f1(yN(j,12.6))}" width="{f1(ancho)}" height="{f1(15.4*PP)}" rx="4"/>'
    s += junta(figs) + f'<path class="pp-sil" d="{sil}"/><g class="pp-toques">{toques}</g></svg>'
    n = sum(len(v) for v in sem.values())
    return s, {'notas': n, 'figuras': len(figs), 'nodos': s.count('<') - s.count('</'), 'sel': sem[wsel], 'semanas': len(sem)}
def por_nota(cs, anio):
    """Pocas notas (hasta 60): una por compra, repartidas por cantidad (no por calendario); las del mismo día, una sola cabeza con ×n."""
    del_anio = [c for c in cs if c['d'].year == anio]
    dias = {}
    for c in del_anio: dias.setdefault(c['fecha'], []).append(c)
    ds = sorted(dias); S = max(1, math.ceil(len(ds) / 16)); por = math.ceil(len(ds) / S)
    s, H, yN = pauta(S)
    cab = {'no': '', 'ex': ''}; pl = ''; num = ''; aro = ''; toq = ''
    pocas_extra = sum(c['extra'] for c in del_anio) * 2 <= len(del_anio)
    for i, f in enumerate(ds):
        j, k = divmod(i, por); ancho = (X1 - X0 - 8) / por; x = X0 + 4 + (k + 0.5) * ancho
        g = dias[f]; p = g[0]['paso']; y = yN(j, p); ex = sum(c['extra'] for c in g) * 2 > len(g)
        cab['ex' if ex else 'no'] += elipse(x, y, 3.9, 2.9)
        ab = p >= 6; sx = -3.4 if ab else 3.4
        pl += f'M{f1(x+sx)} {f1(y)}V{f1(y + (10.5 if ab else -10.5))}'
        if len(g) > 1: num += f'<text class="pp-num" x="{f1(x)}" y="{f1(yN(j,0)+7.5)}" text-anchor="middle">×{len(g)}</text>'
        toq += f'<rect class="pp-toque" x="{f1(x-ancho/2)}" y="{f1(yN(j,13))}" width="{f1(ancho)}" height="{f1(16*PP)}"/>'
    s += f'<path class="pp-plica" d="{pl}"/><path class="pp-cab" d="{cab["no"]}"/><path class="pp-cab pp-ex" d="{cab["ex"]}"/>{num}<g class="pp-toques">{toq}</g></svg>'
    return s, {'notas': len(del_anio), 'figuras': len(ds), 'nodos': s.count('<') - s.count('</'), 'sistemas': S}
def todos(cs):
    """Todos los años de un vistazo: una pauta por año y una figura por mes (72 en seis años)."""
    anios = sorted({c['d'].year for c in cs})
    s, H, yN = pauta(len(anios), etiquetas=[str(a) for a in anios])
    figs = []; sil = ''
    ancho = (X1 - X0 - 8) / 12
    for j, a in enumerate(anios):
        for m in range(12):
            g = [c for c in cs if c['d'].year == a and c['d'].month == m + 1]; x = X0 + 4 + (m + 0.5) * ancho
            if g: figs.append(figura(x, yN, j, g, cuenta_min=1, rmax=6))
            elif (a, m) > (cs[0]['d'].year, cs[0]['d'].month - 1) and (a, m) < (cs[-1]['d'].year, cs[-1]['d'].month - 1): sil += silencio(x, yN(j, 6))
    s += junta(figs) + f'<path class="pp-sil" d="{sil}"/></svg>'
    return s, {'figuras': len(figs), 'nodos': s.count('<') - s.count('</') + len(anios), 'anios': len(anios)}
def semana(g):
    """El detalle al tocar una semana: sus siete días; cada día, una cabeza con su cantidad."""
    s, H, yN = pauta(1, alto_extra=8)
    lun = dt.date(g[0]['d'].year, 1, 1) + dt.timedelta(days=7 * ((g[0]['d'].timetuple().tm_yday - 1) // 7)); ancho = (X1 - X0 - 8) / 7
    figs = []; dias = ''
    for k in range(7):
        d = lun + dt.timedelta(days=k); x = X0 + 4 + (k + 0.5) * ancho; gg = [c for c in g if c['d'] == d]
        dias += f'<text class="pp-eti" x="{f1(x)}" y="{H-5}" text-anchor="middle">{"LMMJVSD"[d.weekday()]} {d.day}</text>'
        if gg: figs.append(figura(x, yN, 0, gg, cuenta_min=2, rmax=5.6))
    return s + junta(figs) + dias + '</svg>', lun
def constelacion(cs):
    """Una estrella por semana (no por compra): más grande con más sats; dorada si la mayoría fue extra."""
    sem = {}
    for c in cs: sem.setdefault((c['d'] - dt.timedelta(days=c['d'].weekday())), []).append(c)
    ks = sorted(sem); mx = max(sum(c['sats'] for c in v) for v in sem.values())
    a = {'no': '', 'ex': ''}
    for i, k in enumerate(ks):
        r = 8 + 136 * math.sqrt((i + 0.5) / len(ks)); t = i * 2.39996
        x, y = 160 + r * math.cos(t), 160 + r * math.sin(t); g = sem[k]
        rr = 1.1 + 3.4 * math.sqrt(sum(c['sats'] for c in g) / mx)
        a['ex' if sum(c['extra'] for c in g) * 2 > len(g) else 'no'] += elipse(x, y, rr, rr)
    s = f'<svg class="pc" viewBox="0 0 320 320" role="img" aria-label="Prototipo de la constelación"><circle class="pc-cielo" cx="160" cy="160" r="156"/><path class="pc-no" d="{a["no"]}"/><path class="pc-ex" d="{a["ex"]}"/></svg>'
    return s, {'estrellas': len(ks), 'nodos': 4}
if __name__ == '__main__':
    for n in (200, 1000, 5000):
        cs = cargar(n); print(n, por_semana(cs, 2026)[1]['figuras'], por_semana(cs, 2026)[1]['nodos'], todos(cs)[1], constelacion(cs)[1], por_nota(cs, 2024 if n == 200 else 2026)[1] if n == 200 else '')
