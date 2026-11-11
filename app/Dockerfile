# Imagen base fijada por huella digital: cada construcción usa exactamente lo mismo. Dependabot propone actualizarla cada mes.
FROM python:3.12-slim@sha256:4840d514c583a4d3d8cad3940e68dee6f0f6f3635c12fcd0a3d74c21a5b93a54
ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1
RUN useradd --uid 1000 --no-create-home --shell /usr/sbin/nologin app
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY server.py auth.py usuarios.py backup.py importar.py push.py ritmo.py avisos.py salud.py ./
COPY static ./static
USER app
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=4s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/healthz', timeout=3)"
# Sin registro de accesos de gunicorn: cada petición la registra la app misma, en JSON y sin IP ni datos (server.cerrar_peticion).
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "--workers", "2", "--threads", "4", "server:app"]
