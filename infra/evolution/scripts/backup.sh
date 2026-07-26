#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
stack_dir="$(cd -- "${script_dir}/.." && pwd)"
backup_root="$(realpath -m -- "${BACKUP_ROOT:-/var/backups/saas-masivos/evolution}")"
retention_days="${BACKUP_RETENTION_DAYS:-14}"
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
destination="${backup_root}/${timestamp}"

if [[ "${backup_root}" == "/" || "${backup_root}" == "/var" || "${backup_root}" == "/var/backups" ]]; then
  echo "BACKUP_ROOT is too broad" >&2
  exit 1
fi

if [[ -z "${BACKUP_AGE_RECIPIENT:-}" ]]; then
  echo "BACKUP_AGE_RECIPIENT is required" >&2
  exit 1
fi

for command in age docker sha256sum tar; do
  command -v "${command}" >/dev/null || {
    echo "${command} is required" >&2
    exit 1
  }
done

mkdir -p -- "${destination}"
database_dump="${destination}/postgres.dump"
instances_archive="${destination}/instances.tar.gz"

docker compose --project-directory "${stack_dir}" exec -T postgres \
  pg_dump \
    --username "${EVOLUTION_POSTGRES_USERNAME}" \
    --dbname "${EVOLUTION_POSTGRES_DATABASE}" \
    --format custom \
    --no-owner \
    --no-privileges \
  > "${database_dump}"

docker run --rm \
  --volume saas_masivos_evolution_instances:/source:ro \
  --volume "${destination}:/backup" \
  alpine:3.20.3 \
  tar -C /source -czf /backup/instances.tar.gz .

age --recipient "${BACKUP_AGE_RECIPIENT}" \
  --output "${database_dump}.age" "${database_dump}"
age --recipient "${BACKUP_AGE_RECIPIENT}" \
  --output "${instances_archive}.age" "${instances_archive}"

rm -- "${database_dump}" "${instances_archive}"
(
  cd -- "${destination}"
  sha256sum postgres.dump.age instances.tar.gz.age > SHA256SUMS
)

find "${backup_root}" -mindepth 1 -maxdepth 1 -type d \
  -mtime "+${retention_days}" -print -exec rm -rf -- {} +

echo "Encrypted backup completed: ${destination}"
