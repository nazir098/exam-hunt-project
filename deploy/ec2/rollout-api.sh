#!/usr/bin/env bash
# Run on EC2 from ~/exam-hunt (same directory as docker-compose.yml).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

if [[ ! -f .env ]]; then
  echo "Missing .env — copy from .env.example and fill in secrets first." >&2
  exit 1
fi

if ! grep -q '^GOOGLE_AUTH_ENABLED=true' .env; then
  echo "WARN: GOOGLE_AUTH_ENABLED is not true in .env — Google sign-in will stay hidden." >&2
  echo "      Add:" >&2
  echo "        GOOGLE_AUTH_ENABLED=true" >&2
  echo "        GOOGLE_CLIENT_ID=<your-web-client-id>.apps.googleusercontent.com" >&2
fi

echo "Pulling latest API image from GHCR..."
docker compose pull api

echo "Restarting API..."
docker compose up -d api

echo "Waiting for health..."
for _ in $(seq 1 30); do
  if curl -fsS http://127.0.0.1:8081/actuator/health >/dev/null 2>&1; then
    break
  fi
  sleep 2
done

echo ""
echo "Deployment info:"
curl -fsS http://127.0.0.1:8081/actuator/info || true
echo ""
echo "Google auth status:"
curl -fsS http://127.0.0.1:8081/api/auth/google/status || echo "(endpoint missing — image still too old)"
echo ""
