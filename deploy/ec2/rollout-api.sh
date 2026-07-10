#!/usr/bin/env bash
# Run on EC2 from ~/exam-hunt (same directory as docker-compose.yml).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

if docker compose version >/dev/null 2>&1; then
  COMPOSE=(docker compose)
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE=(docker-compose)
else
  echo "Docker Compose not found (install plugin or docker-compose)." >&2
  exit 1
fi

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
if ! "${COMPOSE[@]}" pull api; then
  echo "ERROR: docker pull failed — GHCR package is private; re-login on EC2:" >&2
  echo "  echo YOUR_GITHUB_PAT | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin" >&2
  exit 1
fi

echo "Restarting API (recreate to pick up .env changes)..."
"${COMPOSE[@]}" up -d api --force-recreate

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
