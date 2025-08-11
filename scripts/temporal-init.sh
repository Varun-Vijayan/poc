#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")"/.. && pwd)"
cd "$ROOT"

ADMIN_TOOLS_IMG="temporalio/admin-tools:1.24.2-tctl-1.18.1-cli-0.13.0"
NETWORK="temporal-network"

info(){ printf "\033[1;34m[INFO]\033[0m %s\n" "$*"; }
warn(){ printf "\033[1;33m[WARN]\033[0m %s\n" "$*"; }
die(){ printf "\033[1;31m[ERR ]\033[0m %s\n" "$*"; exit 1; }

command -v docker >/dev/null || die "Docker not found"
docker compose version >/dev/null || die "Docker Compose not found"

# Ensure certs and JWT exist (for mTLS + JWT)
if [[ ! -f certs/ca.pem || ! -f certs/worker-client.pem || ! -f certs/worker-client-key.pem ]]; then
  info "Generating SSL certificates..."
  node src/auth/generate-ssl-certificates.js
fi
if [[ ! -f src/auth/admin-token.jwt ]]; then
  info "Generating admin JWT..."
  node src/auth/generate-jwt.js
fi

info "Pulling images..."
docker compose pull

info "Starting Postgres..."
docker compose up -d postgresql

info "Waiting for Postgres..."
until docker compose exec -T postgresql pg_isready -h localhost -p 5432 -U temporal >/dev/null 2>&1; do
  sleep 1
done

# Ensure visibility DB exists (idempotent)
if ! docker compose exec -T postgresql psql -U temporal -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='temporal_visibility'" | grep -q 1; then
  info "Creating temporal_visibility database..."
  docker compose exec -T postgresql psql -U temporal -d postgres -c "CREATE DATABASE temporal_visibility OWNER temporal;"
fi

# Schema init (postgres12 + v12 paths) - idempotent
info "Applying Temporal core schema (setup)..."
docker run --rm --network "$NETWORK" --entrypoint temporal-sql-tool "$ADMIN_TOOLS_IMG" \
  --plugin postgres12 --ep postgresql --port 5432 --u temporal --pw temporal --db temporal setup-schema -v 0.0 || true

info "Applying Temporal core schema (update v12/temporal/versioned)..."
docker run --rm --network "$NETWORK" --entrypoint temporal-sql-tool "$ADMIN_TOOLS_IMG" \
  --plugin postgres12 --ep postgresql --port 5432 --u temporal --pw temporal --db temporal \
  update-schema -d /etc/temporal/schema/postgresql/v12/temporal/versioned

info "Applying Visibility schema (setup)..."
docker run --rm --network "$NETWORK" --entrypoint temporal-sql-tool "$ADMIN_TOOLS_IMG" \
  --plugin postgres12 --ep postgresql --port 5432 --u temporal --pw temporal --db temporal_visibility setup-schema -v 0.0 || true

info "Applying Visibility schema (update v12/visibility/versioned)..."
docker run --rm --network "$NETWORK" --entrypoint temporal-sql-tool "$ADMIN_TOOLS_IMG" \
  --plugin postgres12 --ep postgresql --port 5432 --u temporal --pw temporal --db temporal_visibility \
  update-schema -d /etc/temporal/schema/postgresql/v12/visibility/versioned

info "Starting Temporal server..."
docker compose up -d temporal

info "Waiting for Temporal gRPC..."
until docker compose exec -T temporal sh -lc 'nc -z 127.0.0.1 7233' >/dev/null 2>&1; do
  sleep 1
done

info "Starting Temporal Web..."
docker compose up -d temporal-web || warn "Temporal Web start failed; check TLS env/volumes in docker-compose.yml."

# Create default namespace via mTLS + JWT (idempotent)
if [[ -f src/temporal/create-namespace-ssl.ts ]]; then
  info "Creating 'default' namespace..."
  TEMPORAL_ADDRESS=localhost:7233 npx ts-node --transpile-only src/temporal/create-namespace-ssl.ts || warn "Namespace may already exist."
else
  warn "src/temporal/create-namespace-ssl.ts not found; skipping namespace creation."
fi

info "All set."
echo "Temporal gRPC:      localhost:7233"
echo "Temporal Web (UI):  http://localhost:8234"
echo "Start workers in new terminals:"
echo "  TEMPORAL_ADDRESS=localhost:7233 npm run temporal:worker1:ssl"
echo "  TEMPORAL_ADDRESS=localhost:7233 npm run temporal:worker2:ssl"
echo "  TEMPORAL_ADDRESS=localhost:7233 npm run temporal:worker3:ssl"
