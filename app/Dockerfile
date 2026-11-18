# Imagen base fijada por huella digital: cada construcción usa exactamente lo mismo. Dependabot propone actualizarla cada mes.
# (python:3.12-slim = 3.12.16-slim-trixie, el índice publicado el 8 nov 2026; comprobado el 18 nov 2026)
FROM python:3.12-slim@sha256:5e2bdb1b0d542d5039cffb8181c65930093949194a65c365dfb1b0fe13a4fa5b
ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1
RUN useradd --uid 1000 --no-create-home --shell /usr/sbin/nologin app
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY server.py auth.py usuarios.py backup.py importar.py push.py recorte.py ritmo.py avisos.py salud.py ./
COPY static ./static
# El commit desplegado (README, «Actualizar»): va al final para no invalidar las capas de pip. Vacío si no se pasa.
ARG VERSION_GIT=
ENV VERSION_GIT=$VERSION_GIT
USER app
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=4s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/healthz', timeout=3)"
# Sin registro de accesos de gunicorn: cada petición la registra la app misma, en JSON y sin IP ni datos (server.cerrar_peticion).
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "--workers", "2", "--threads", "4", "server:app"]
