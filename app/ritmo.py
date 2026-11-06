"""Reglas del libro que el servidor necesita para los avisos (el frontend las tiene en `static/lib.js`).

Son las mismas reglas, escritas otra vez en Python porque un aviso sale cuando la app está cerrada: ritmo (semanal o
quincenal), racha, «te toca comprar», etapas y constancia. `tests/test_api.py` compara estas funciones con `lib.js`
para que no se separen.
"""
from __future__ import annotations

import math
from datetime import date, datetime, timedelta, timezone
from typing import Any

# El Salvador no usa horario de verano: un desfase fijo evita depender de la base de zonas horarias del sistema.
ZONA = timezone(timedelta(hours=-6))

_SEMANA0 = date(2000, 1, 3)  # un lunes


def hoy_sv(ahora: datetime | None = None) -> date:
    return (ahora or datetime.now(ZONA)).astimezone(ZONA).date()


def semana(f: date) -> int:
    return (f - _SEMANA0).days // 7


def _fechas(fechas: list[str]) -> list[date]:
    return sorted(date.fromisoformat(f) for f in fechas)


def paso_semanas(fechas: list[date]) -> int:
    """1 si compras cada semana (o con menos de 10 días entre compras), 2 si cada quincena. Una fecha por semana."""
    por_semana: dict[int, date] = {}
    for f in sorted(fechas):
        por_semana.setdefault(semana(f), f)
    ultimas = list(por_semana.values())[-9:]
    if len(ultimas) < 4:
        return 1
    d = sorted((b - a).days for a, b in zip(ultimas, ultimas[1:], strict=False))
    return 2 if d[len(d) >> 1] >= 10 else 1


def toca_comprar(fechas_compras: list[str], hoy: date) -> dict[str, Any] | None:
    """`lib.tocaComprar`: estado según tu ritmo, o None con menos de 3 compras.

    Estados: hecho · aldia · toca · ultimo (es domingo) · perdida. `racha` y `paso` van con el resultado.
    """
    fechas = _fechas(fechas_compras)
    if len(fechas) < 3:
        return None
    por_semana = sorted({semana(f) for f in fechas})
    paso = paso_semanas(fechas)
    actual = semana(hoy)
    corrida, previa = 0, None
    for s in por_semana:
        corrida = corrida + 1 if previa is not None and s - previa <= paso else 1
        previa = s
    assert previa is not None
    racha = corrida if actual - previa <= paso else 0
    d = actual - previa  # semanas desde tu última compra (0 = esta semana)
    if d <= 0:
        estado = "hecho"
    elif d < paso:
        estado = "aldia"
    elif d == paso:
        estado = "ultimo" if hoy.weekday() == 6 else "toca"
    else:
        estado = "perdida"
    return {"estado": estado, "racha": racha, "paso": paso, "dias_restantes": 6 - hoy.weekday()}


# Desde cuántos días antes de que venza el periodo se recuerda (viernes, sábado y domingo).
RECORDAR_DESDE_DIAS = 2


def recordatorio(fechas_compras: list[str], hoy: date) -> dict[str, Any] | None:
    """El aviso de «se te acaba el periodo» de hoy, o None si no toca avisar (ya compraste, aún falta o ya se perdió)."""
    t = toca_comprar(fechas_compras, hoy)
    if not t or t["estado"] not in ("toca", "ultimo") or t["dias_restantes"] > RECORDAR_DESDE_DIAS:
        return None
    return t


def texto_recordatorio(t: dict[str, Any]) -> str:
    unidad = "semanas" if t["paso"] == 1 else "quincenas"
    racha = f" Mantén tu racha de {t['racha']} {unidad}." if t["racha"] > 1 else ""
    if t["estado"] == "ultimo":
        return f"Hoy vence tu {'semana' if t['paso'] == 1 else 'quincena'} para comprar.{racha}"
    if t["dias_restantes"] == 1:
        return f"Mañana domingo vence tu {'semana' if t['paso'] == 1 else 'quincena'} para comprar.{racha}"
    return f"Te quedan {t['dias_restantes']} días para comprar este periodo.{racha}"


# ------------------------------------------------------------------ etapas y constancia
def etapas_hasta(tope: int) -> list[int]:
    """Etapas (1, 2.5 y 5 de cada potencia de 10 desde 100k) hasta `tope` sats, como `lib.etapasHasta`."""
    out: list[int] = []
    d = 10**5
    while d <= tope:
        out += [m for m in (d, d * 5 // 2, d * 5) if m <= tope]
        d *= 10
    return out


def etapas_cruzadas(desde: int, hasta: int) -> list[int]:
    return [m for m in etapas_hasta(max(hasta, 10**5)) if desde < m <= hasta] if hasta > desde else []


def es_hito_grande(m: int) -> bool:
    return m >= 10**5 and str(m).strip("0") == "1"


def _num(n: float) -> str:
    return f"{int(n):,}" if float(n).is_integer() else f"{n:.1f}"


def nombre_hito(m: int) -> str:
    if m >= 10**8:
        return f"{_num(m / 1e8)} BTC"
    if m >= 10**6:
        return f"{_num(m / 1e6)}M sats"
    return f"{_num(m / 1e3)}k sats"


HITOS_COMPRAS = (10, 25, 50, 100, 200, 300, 500, 750, 1000)
HITOS_MESES = (6, 12, 24, 36, 60, 120)


def nombre_hito_meses(m: int) -> str:
    return f"{m} meses" if m < 12 else "1 año" if m == 12 else f"{m // 12} años"


def _meses_entre(a: str, b: str) -> int:
    ay, am, ad = (int(x) for x in a.split("-"))
    by, bm, bd = (int(x) for x in b.split("-"))
    return max(0, (by - ay) * 12 + (bm - am) - (1 if bd < ad else 0))


def _medidas(fechas: list[str]) -> tuple[int, str | None, int]:
    f = sorted(fechas)
    return len(f), (f[0] if f else None), (_meses_entre(f[0], f[-1]) if f else 0)


def constancia_cruzada(antes: list[str], despues: list[str]) -> list[tuple[str, int]]:
    """`lib.constanciaCruzada` con las fechas de las compras (sin ventas) antes y después de la nueva."""
    na, pa, ma = _medidas(antes)
    nd, pd, md = _medidas(despues)
    out: list[tuple[str, int]] = []
    out += [("compras", h) for h in HITOS_COMPRAS if na < h <= nd]
    if na > 0 and pa == pd:
        out += [("tiempo", m) for m in HITOS_MESES if ma < m <= md]
    return out


# ------------------------------------------------------------------ gran caída
def redondear(x: float) -> int:
    """`Math.round` de JavaScript (la mitad hacia arriba), para dar lo mismo que `lib.js`."""
    return math.floor(x + 0.5)


def caida_grande(cierres: list[tuple[str, float]], vivo: float, hoy: date, dias: int = 30, umbral: float = 15.0) -> dict[str, Any] | None:
    """`lib.caidaGrande`: el precio vivo frente al máximo de los últimos `dias` días (cierres diarios y el vivo).

    None si no hay caída de `umbral` % o más, o si hay menos de 5 cierres en la ventana.
    """
    if not vivo > 0:
        return None
    desde = (hoy - timedelta(days=dias)).isoformat()
    ventana = [c for f, c in cierres if f >= desde and c > 0]
    if len(ventana) < 5:
        return None
    maximo = max(vivo, *ventana)
    caida = math.floor((1 - vivo / maximo) * 1000 + 0.5) / 10  # a una décima: el umbral queda exacto
    return {"max": maximo, "caida": caida, "dias": dias} if caida >= umbral else None


# Un movimiento: (fecha, id, tipo, monto, sats, extra)
Movimiento = tuple[str, int, str, float, int, int]


def _orden(movs: list[Movimiento]) -> list[Movimiento]:
    return sorted(movs, key=lambda m: (m[0], m[2] == "venta", m[1]))


def invertido_y_sats(movs: list[Movimiento]) -> tuple[float, int]:
    """Invertido neto y saldo en sats (costo promedio ponderado: al vender, el costo base baja en proporción)."""
    inv, sats = 0.0, 0
    for _f, _i, tipo, monto, s, _e in _orden(movs):
        if tipo == "venta":
            base = min(inv, inv / sats * s) if sats > 0 else 0.0
            inv -= base
            sats -= s
            if sats <= 0:
                inv, sats = 0.0, 0
        else:
            inv += monto
            sats += s
    return inv, sats


def monto_habitual(movs: list[Movimiento]) -> int | None:
    """`lib.montoHabitual`: mediana en dólares de tus últimas 12 compras habituales (sin extra); None con menos de 3."""
    habituales = [m for m in _orden(movs) if m[2] != "venta" and not m[5] and m[3] > 0]
    ultimos = sorted(m[3] for m in habituales[-12:])
    if len(ultimos) < 3:
        return None
    mid = len(ultimos) >> 1
    monto = redondear(ultimos[mid] if len(ultimos) % 2 else (ultimos[mid - 1] + ultimos[mid]) / 2)
    return monto if monto >= 1 else None


def reposicion(movs: list[Movimiento], vivo: float) -> dict[str, float] | None:
    """`lib.reposicion`: qué haría con tu costo promedio una compra como las tuyas al precio vivo (solo información)."""
    monto = monto_habitual(movs)
    inv, sats = invertido_y_sats(movs)
    if not monto or not vivo > 0 or not (sats > 0 and inv > 0):
        return None
    nuevos = redondear(monto / vivo * 1e8)
    if nuevos <= 0:
        return None
    antes = inv * 1e8 / sats
    despues = (inv + monto) * 1e8 / (sats + nuevos)
    return {"monto": monto, "antes": antes, "despues": despues}


def _usd0(x: float) -> str:
    return f"${redondear(x):,}"


def texto_caida(c: dict[str, Any], r: dict[str, float] | None) -> str:
    """El mismo texto de la tarjeta «Gran caída»: información, sin recomendar comprar."""
    txt = f"BTC está {redondear(c['caida'])}% por debajo de su máximo de los últimos {c['dias']} días."
    if r:
        txt += (f" Si decides reponer con una compra como las tuyas ({_usd0(r['monto'])}), tu costo promedio "
                f"{'bajaría' if r['despues'] < r['antes'] else 'subiría'} de {_usd0(r['antes'])} a {_usd0(r['despues'])}. Es opcional.")
    return txt

