# Hojas de contacto: parte capturas largas en columnas y junta varias en una imagen.
# Uso: hoja.py salida alto archivo...
import os
import sys
from PIL import Image

CAP = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'cap')


def columnas(f, alto=1300):
    im = Image.open(f).convert('RGB')
    w, h = im.size
    n = -(-h // alto)
    return [im.crop((0, i * alto, w, min(h, (i + 1) * alto))) for i in range(n)]


def junta(piezas, salida, sep=12, fondo=(120, 0, 120)):
    W = sum(p.size[0] for p in piezas) + sep * (len(piezas) - 1)
    H = max(p.size[1] for p in piezas)
    o = Image.new('RGB', (W, H), fondo)
    x = 0
    for p in piezas:
        o.paste(p, (x, 0))
        x += p.size[0] + sep
    o.save(salida)


if __name__ == '__main__':
    salida, alto, *fs = sys.argv[1:]
    ps = []
    for f in fs:
        ps += columnas(os.path.join(CAP, f + '.png'), int(alto))
    junta(ps, os.path.join(CAP, salida + '.png'))
