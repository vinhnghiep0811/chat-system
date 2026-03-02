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

for i in range(60):
    try:
        conn = psycopg2.connect(db_url, connect_timeout=3)
        conn.close()
        print("Database is up!")
        break
    except Exception as e:
        time.sleep(1)
else:
    raise SystemExit("Database not reachable after 60s")
PY

python manage.py migrate --noinput

# Nếu docker-compose truyền command (vd daphne), ưu tiên chạy command đó
if [ "$#" -gt 0 ]; then
  exec "$@"
fi

# Render cần lắng nghe đúng PORT mà nó cấp
exec daphne -b 0.0.0.0 -p "${PORT:-8000}" config.asgi:application