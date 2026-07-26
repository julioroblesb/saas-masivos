#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

if [[ "$#" -ne 1 ]]; then
  echo "Usage: $0 /absolute/path/to/backup-directory" >&2
  exit 1
fi

backup_dir="$(realpath -- "$1")"
[[ -d "${backup_dir}" ]] || {
  echo "Backup directory does not exist" >&2
  exit 1
}

for command in age docker sha256sum tar; do
  command -v "${command}" >/dev/null || {
    echo "${command} is required" >&2
    exit 1
  }
done

temporary_dir="$(mktemp -d)"
container_name="evolution-restore-drill-$(date +%s)"
cleanup() {
  docker rm -f "${container_name}" >/dev/null 2>&1 || true
  rm -rf -- "${temporary_dir}"
}
trap cleanup EXIT

(
  cd -- "${backup_dir}"
  sha256sum --check SHA256SUMS
)

age --decrypt --output "${temporary_dir}/postgres.dump" \
  "${backup_dir}/postgres.dump.age"
age --decrypt --output "${temporary_dir}/instances.tar.gz" \
  "${backup_dir}/instances.tar.gz.age"
tar -tzf "${temporary_dir}/instances.tar.gz" >/dev/null

docker run --detach --name "${container_name}" \
  --env POSTGRES_PASSWORD=restore-drill-only \
  --env POSTGRES_DB=evolution_restore \
  postgres:15.13-alpine >/dev/null

for _ in $(seq 1 30); do
  if docker exec "${container_name}" \
    pg_isready -U postgres -d evolution_restore >/dev/null 2>&1; then
    break
  fi
  sleep 2
done

docker exec -i "${container_name}" \
  pg_restore \
    --username postgres \
    --dbname evolution_restore \
    --no-owner \
    --no-privileges \
  < "${temporary_dir}/postgres.dump"

docker exec "${container_name}" \
  psql -U postgres -d evolution_restore -v ON_ERROR_STOP=1 \
  -c "select current_database(), count(*) as tables from pg_tables where schemaname = 'public';"

echo "Restore drill passed for ${backup_dir}"
