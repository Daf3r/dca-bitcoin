"""Ejecuta el escenario de navegador con las claves efímeras que eligió el proceso de pruebas."""
import os
import runpy
import sys
from pathlib import Path
from unittest.mock import patch

directorio = Path(__file__).resolve().parent
sys.path.insert(0, str(directorio.parent / "app"))
import auth  # noqa: E402

claves = {"admin": os.environ.pop("PRUEBA_ADMIN"), "lector": os.environ.pop("PRUEBA_LECTOR")}
crear = auth.crear_usuario


def crear_cuenta_de_escenario(conn, nombre, clave, rol, autor):
    if autor == "prueba" and rol in claves:
        clave = claves.pop(rol)
    return crear(conn, nombre, clave, rol, autor)


with patch.object(auth, "crear_usuario", crear_cuenta_de_escenario):
    runpy.run_path(str(directorio / "servidor_prueba.py"), run_name="__main__")
