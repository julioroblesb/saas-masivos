#!/usr/bin/env bash
set -Eeuo pipefail

temperature_file="$(find /sys/class/thermal -name temp -type f 2>/dev/null | head -n 1 || true)"
battery_capacity_file="$(find /sys/class/power_supply -name capacity -type f 2>/dev/null | head -n 1 || true)"
temperature_celsius="null"
battery_percent="null"

if [[ -n "${temperature_file}" ]]; then
  temperature_celsius="$(awk '{ printf "%.1f", $1 / 1000 }' "${temperature_file}")"
fi
if [[ -n "${battery_capacity_file}" ]]; then
  battery_percent="$(cat -- "${battery_capacity_file}")"
fi

memory_used_mb="$(free -m | awk '/^Mem:/ { print $3 }')"
memory_total_mb="$(free -m | awk '/^Mem:/ { print $2 }')"
disk_used_percent="$(df -P / | awk 'NR == 2 { gsub("%", "", $5); print $5 }')"
load_average="$(cut -d ' ' -f 1 /proc/loadavg)"
unhealthy_containers="$(docker ps --filter health=unhealthy --format '{{.Names}}' | paste -sd, -)"

printf '{"timestamp":"%s","load_1m":%s,"memory_used_mb":%s,"memory_total_mb":%s,"disk_used_percent":%s,"temperature_celsius":%s,"battery_percent":%s,"unhealthy_containers":"%s"}\n' \
  "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  "${load_average}" \
  "${memory_used_mb}" \
  "${memory_total_mb}" \
  "${disk_used_percent}" \
  "${temperature_celsius}" \
  "${battery_percent}" \
  "${unhealthy_containers}"
