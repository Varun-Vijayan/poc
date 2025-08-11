#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")"/.. && pwd)"
cd "$ROOT"

info(){ printf "\033[1;34m[INFO]\033[0m %s\n" "$*"; }
warn(){ printf "\033[1;33m[WARN]\033[0m %s\n" "$*"; }
die(){ printf "\033[1;31m[ERR ]\033[0m %s\n" "$*"; exit 1; }

command -v docker >/dev/null || die "Docker not found"
docker compose version >/dev/null || die "Docker Compose not found"

# Ensure certs/JWT still present
[[ -f certs/ca.pem && -f certs/worker-client.pem && -f certs/worker-client-key.pem ]] || die "Missing certs in ./certs"
[[ -f src/auth/admin-token.jwt ]] || die "Missing admin token ./src/auth/admin-token.jwt"

info "Starting Postgres, Temporal, and Web..."
docker compose up -d postgresql temporal temporal-web

info "Waiting for Temporal gRPC..."
until docker compose exec -T temporal sh -lc 'nc -z 127.0.0.1 7233' >/dev/null 2>&1; do
  sleep 1
done

# Ensure namespace exists (safe if already exists)
if [[ -f src/temporal/create-namespace-ssl.ts ]]; then
  info "Ensuring 'default' namespace exists..."
  TEMPORAL_ADDRESS=localhost:7233 npx ts-node --transpile-only src/temporal/create-namespace-ssl.ts || true
fi

info "Ready."
echo "Temporal gRPC:      localhost:7233"
echo "Temporal Web (UI):  http://localhost:8234"
echo "Start workers in new terminals:"
echo "  TEMPORAL_ADDRESS=localhost:7233 npm run temporal:worker1:ssl"
echo "  TEMPORAL_ADDRESS=localhost:7233 npm run temporal:worker2:ssl"
echo "  TEMPORAL_ADDRESS=localhost:7233 npm run temporal:worker3:ssl"
