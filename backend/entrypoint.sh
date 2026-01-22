#!/bin/sh
set -e

echo "Waiting for postgres..."
while ! nc -z "$POSTGRES_HOST" "$POSTGRES_PORT"; do
  sleep 0.2
done
echo "Postgres is up!"

python manage.py migrate --noinput

exec gunicorn config.wsgi:application --bind 0.0.0.0:8000
