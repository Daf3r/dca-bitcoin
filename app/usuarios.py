"""Gestión de cuentas desde el servidor.

Uso (dentro del contenedor: docker compose exec app python usuarios.py ...):
  crear NOMBRE [--rol admin|lector] [--generar]
  clave NOMBRE [--generar]          cambia la contraseña y cierra sus sesiones
  desactivar NOMBRE | activar NOMBRE
  cerrar-sesiones NOMBRE
  desbloquear NOMBRE                quita el bloqueo por intentos fallidos
  listar

La contraseña se pide por teclado (nunca como argumento) o se genera con --generar.
"""
import getpass
import sys

import auth
import server


def pedir_clave(nombre: str, generar: bool) -> str:
    if generar:
        clave = auth.generar_clave()
        print(f"Contraseña generada (apúntala ahora, no se vuelve a mostrar): {clave}")
        return clave
    while True:
        clave = getpass.getpass("Contraseña: ")
        if (err := auth.validar_clave(clave, nombre)):
            print(err)
            continue
        if getpass.getpass("Repítela: ") != clave:
            print("No coinciden.")
            continue
        return clave


def main(args: list[str]) -> int:
    if not args or args[0] not in ("crear", "clave", "desactivar", "activar", "cerrar-sesiones", "desbloquear", "listar"):
        print(__doc__)
        return 2
    orden, resto = args[0], args[1:]
    generar = "--generar" in resto
    rol = resto[resto.index("--rol") + 1] if "--rol" in resto and resto.index("--rol") + 1 < len(resto) else "lector"
    nombre = next((a for i, a in enumerate(resto) if not a.startswith("--") and (i == 0 or resto[i - 1] != "--rol")), None)
    conn = server.connect()
    try:
        if orden == "listar":
            for u in conn.execute("SELECT u.nombre, u.rol, u.activo, (SELECT COUNT(*) FROM sesiones s WHERE s.usuario_id = u.id) "
                                  "AS ses FROM usuarios u ORDER BY u.nombre"):
                print(f"{u['nombre']:20} {u['rol']:7} {'activo' if u['activo'] else 'desactivado':12} sesiones: {u['ses']}")
            return 0
        if not nombre:
            print("Falta el nombre de usuario.")
            return 2
        if orden == "crear":
            auth.crear_usuario(conn, nombre, pedir_clave(nombre, generar), rol, "cli")
            print(f"Cuenta creada: {nombre} ({rol}).")
            return 0
        u = auth.buscar(conn, nombre)
        if not u:
            print("No existe esa cuenta.")
            return 1
        if orden == "clave":
            auth.cambiar_clave(conn, u["id"], pedir_clave(u["nombre"], generar), "cli")
            print("Contraseña cambiada; sus sesiones se cerraron.")
        elif orden in ("desactivar", "activar"):
            conn.execute("UPDATE usuarios SET activo = ? WHERE id = ?", (1 if orden == "activar" else 0, u["id"]))
            if orden == "desactivar":
                auth.cerrar_todas(conn, u["id"])
            auth.auditar(conn, "cli", f"cuenta_{orden}da", "usuario", u["id"], None, {"nombre": u["nombre"]})
            conn.commit()
            print(f"Cuenta {orden}da.")
        elif orden == "cerrar-sesiones":
            n = auth.cerrar_todas(conn, u["id"])
            auth.auditar(conn, "cli", "sesiones_cerradas", "usuario", u["id"], None, {"nombre": u["nombre"], "sesiones": n})
            conn.commit()
            print(f"Sesiones cerradas: {n}.")
        elif orden == "desbloquear":
            auth.acierto(conn, [auth.clave_usuario(u["nombre"])])
            auth.auditar(conn, "cli", "desbloqueo", "usuario", u["id"], None, {"nombre": u["nombre"]})
            conn.commit()
            print("Desbloqueada.")
        return 0
    except ValueError as e:
        print(e)
        return 1
    finally:
        conn.close()


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
