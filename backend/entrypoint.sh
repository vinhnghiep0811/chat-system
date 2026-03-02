#!/bin/sh
set -e

echo "Waiting for database via DATABASE_URL (psycopg2)..."

python - <<'PY'
import os, time
import psycopg2
from urllib.parse import urlparse

db_url = os.environ.get("DATABASE_URL")
if not db_url:
    raise SystemExit("DATABASE_URL is not set")

u = urlparse(db_url)
print(f"DB host={u.hostname} port={u.port or 5432} db={u.path.lstrip('/') or 'postgres'}")

last_err = None
for i in range(30):
    try:
        conn = psycopg2.connect(db_url, connect_timeout=5)
        conn.close()
        print("Database is up!")
        raise SystemExit(0)
    except Exception as e:
        last_err = e
        print(f"DB connect failed (try {i+1}/30): {type(e).__name__}: {e}")
        time.sleep(1)

raise SystemExit(f"Database not reachable. Last error: {last_err}")
PY

python manage.py migrate --noinput

# Nếu docker-compose truyền command (vd daphne), ưu tiên chạy command đó
if [ "$#" -gt 0 ]; then
  exec "$@"
fi

# Render cần lắng nghe đúng PORT mà nó cấp
exec daphne -b 0.0.0.0 -p "${PORT:-8000}" config.asgi:application