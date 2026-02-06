#!/bin/sh
set -e

echo "Waiting for postgres..."
while ! nc -z "$POSTGRES_HOST" "$POSTGRES_PORT"; do
  sleep 0.2
done
echo "Postgres is up!"

python manage.py migrate --noinput

# Nếu docker-compose truyền command (vd daphne), ưu tiên chạy command đó
if [ "$#" -gt 0 ]; then
  exec "$@"
fi

# Mặc định chạy ASGI server (WebSocket OK)
exec daphne -b 0.0.0.0 -p 8000 config.asgi:application
