#!/bin/bash
set -a
source /opt/.env
set +a
cd /opt/gds-os/apps/api
# Production is HTTPS-only; session cookies must never travel over HTTP.
export COOKIE_SECURE=true
exec /opt/gds-os/apps/api/venv/bin/uvicorn gds_api.main:app --host 127.0.0.1 --port 8000 --workers 1
