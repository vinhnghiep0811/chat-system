#!/bin/sh
set -e

echo "Waiting for database via DATABASE_URL (psycopg2)..."

python - <<'PY'
import os, time
import psycopg2
from urllib.parse import urlparse, unquote

db_url = os.environ.get("DATABASE_URL")
if not db_url:
    raise SystemExit("DATABASE_URL is not set")

u = urlparse(db_url)
print("RAW DATABASE_URL:", db_url.replace(u.password or "", "***"))
print("PARSED -> user:", u.username, "| host:", u.hostname, "| port:", u.port, "| db:", (u.path or "").lstrip("/"))

last_err=None
for i in range(5):
    try:
        conn = psycopg2.connect(db_url, connect_timeout=5)
        conn.close()
        print("Database is up!")
        raise SystemExit(0)
    except Exception as e:
        last_err=e
        print(f"DB connect failed (try {i+1}/5): {type(e).__name__}: {e}")
        time.sleep(1)
raise SystemExit(f"Database not reachable. Last error: {last_err}")
PY

python manage.py migrate --noinput

# Nếu docker-compose truyền command (vd daphne), ưu tiên chạy command đó
if [ "$#" -gt 0 ]; then
  exec "$@"
fi
echo "Checking ASGI import..."
python -c "import config.asgi; print('ASGI import OK')"

echo "Starting Daphne..."
daphne -v 2 -b 0.0.0.0 -p "${PORT:-8000}" config.asgi:application