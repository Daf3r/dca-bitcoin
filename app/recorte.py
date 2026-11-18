"""Los comentarios se quedan en el código (son su documentación) y se quitan al servir (Pulido D).

Solo biblioteca estándar: lo usa `server._servir_versionado` y, sin Flask, `tests/comprobar_recorte.mjs` (`python3 app/recorte.py
app/static` imprime en JSON lo que se serviría de cada archivo), que comprueba en el CI que el recorte no cambia el código: el árbol de
TypeScript de cada `.js` y los símbolos de `styles.css` son los mismos antes y después. Las reglas son a propósito pocas y por líneas:

- `.js`: se quitan los bloques `/* … */` que ocupan líneas enteras y las líneas que, quitando la sangría, empiezan por `//`. Nunca un
  comentario al final de una línea de código: ahí haría falta entender el código (cadenas, plantillas, expresiones regulares).
- `.css`: todos los `/* … */` (ninguno vive dentro de una cadena ni de un `url()`; si un día lo hiciera, la prueba lo diría).
- `.html`: los `<!-- … -->`, menos los marcadores que lee un script (`<!-- arranque:inicio -->` y `<!-- arranque:fin -->`).

Un archivo nuevo de `app/static` queda cubierto solo (por su extensión) y su prueba también. El texto de este archivo entra en la
versión de los estáticos (`server._version`): cambiar una regla cambia `?v=` y nadie se queda con lo recortado de antes.
"""

from __future__ import annotations

import json
import os
import re
import sys

# Un bloque que ocupa líneas enteras: dentro no puede haber `*/` (si no, un `/* a */ código();` seguido de otro bloque se llevaría el código).
_BLOQUE_LINEAS = re.compile(r"^[ \t]*/\*(?:(?!\*/)[\s\S])*\*/[ \t]*(?:\n|\Z)", re.M)
_LINEA_JS = re.compile(r"^[ \t]*//[^\n]*(?:\n|\Z)", re.M)
_BLOQUE_CSS = re.compile(r"/\*[\s\S]*?\*/")
_MARCADOR_HTML = r"(?!\s*arranque:)"
_HTML_LINEAS = re.compile(r"^[ \t]*<!--" + _MARCADOR_HTML + r"(?:(?!-->)[\s\S])*-->[ \t]*(?:\n|\Z)", re.M)
_HTML = re.compile(r"<!--" + _MARCADOR_HTML + r"[\s\S]*?-->")


def sin_comentarios(texto: str, nombre: str) -> str:
    """Lo que se sirve de `nombre` (sin el `?v=`, que pone el servidor después): el mismo código sin sus comentarios."""
    ext = os.path.splitext(nombre)[1]
    if ext == ".js":
        return _LINEA_JS.sub("", _BLOQUE_LINEAS.sub("", texto))
    if ext == ".css":
        return _BLOQUE_CSS.sub("", _BLOQUE_LINEAS.sub("", texto))
    if ext == ".html":
        return _HTML.sub("", _HTML_LINEAS.sub("", texto))
    return texto


if __name__ == "__main__":
    carpeta = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), "static")
    salida = {}
    for n in sorted(os.listdir(carpeta)):
        if n.endswith((".js", ".css", ".html")):
            with open(os.path.join(carpeta, n), encoding="utf-8") as f:
                salida[n] = sin_comentarios(f.read(), n)
    json.dump(salida, sys.stdout, ensure_ascii=False)
