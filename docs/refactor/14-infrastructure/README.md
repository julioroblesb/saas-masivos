# Etapa 14: infraestructura y recuperación

## Arquitectura de costo cero

- Next.js conserva el despliegue existente y dispone de una imagen OCI portable.
- Evolution API `v2.3.7`, PostgreSQL `15.13` y Redis `7.4.2` quedan fijados.
- El puerto de Evolution escucha únicamente en `127.0.0.1`; Cloudflare Tunnel o
  Tailscale son la única entrada remota.
- Los tres contenedores tienen healthcheck, reinicio automático, límites de
  memoria/CPU, parada ordenada y rotación de logs.
- No se añade ningún SaaS, addon ni licencia de pago.

## Instalación

```bash
sudo install -d -m 0700 /etc/saas-masivos
sudo cp infra/evolution/.env.example /etc/saas-masivos/evolution.env
sudo chmod 0600 /etc/saas-masivos/evolution.env
# Editar valores sin copiarlos a Git.
docker compose \
  --env-file /etc/saas-masivos/evolution.env \
  -f infra/evolution/compose.yaml config
docker compose \
  --env-file /etc/saas-masivos/evolution.env \
  -f infra/evolution/compose.yaml up -d
```

## Perímetro

1. UFW: política entrante `deny`; permitir SSH únicamente por `tailscale0`.
2. No abrir `8080/tcp` en UFW ni en el router.
3. Cloudflare Tunnel apunta a `http://127.0.0.1:8080`.
4. Cloudflare Access exige el service token que ya consume el backend.
5. La API rechaza peticiones sin `apikey`, incluso desde la red privada.

Antes de aplicar reglas UFW se mantiene una segunda sesión SSH abierta para no
bloquear el servidor. La configuración del túnel y sus secretos permanece fuera
del repositorio.

## Backup y restauración

`backup.sh` genera un dump custom de PostgreSQL y un archivo de las sesiones,
los cifra con `age`, crea checksums SHA-256 y conserva 14 días por defecto.
`restore-drill.sh` verifica checksums, descifra en un directorio temporal,
valida el archivo de sesiones y restaura PostgreSQL en un contenedor aislado.

Instalación del timer:

```bash
sudo cp infra/evolution/systemd/saas-masivos-backup.* /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now saas-masivos-backup.timer
sudo systemctl start saas-masivos-backup.service
sudo journalctl -u saas-masivos-backup.service --since today
```

La clave privada de `age` se guarda fuera del servidor principal. Un backup no
se considera válido hasta ejecutar:

```bash
sudo -E infra/evolution/scripts/restore-drill.sh \
  /var/backups/saas-masivos/evolution/<timestamp>
```

## Reinicio, red y actualización

Después de reiniciar:

```bash
docker compose -f infra/evolution/compose.yaml ps
curl --fail http://127.0.0.1:8080/
systemctl is-active docker cloudflared tailscaled
```

Al cambiar de red no se modifica Evolution: se confirma Tailscale, luego el
túnel y finalmente el healthcheck. Para actualizar, se cambia una versión en
Git, se toma backup, se prueba restauración, se hace `docker compose pull` y
`up -d`; el rollback vuelve al tag anterior sin tocar volúmenes.

## Monitoreo

`monitor-host.sh` emite una línea JSON con carga, RAM, disco, temperatura,
batería y contenedores no saludables. Puede ejecutarse cada minuto con systemd
o cron y alertar localmente cuando disco supere 80 %, RAM 85 %, temperatura
80 °C, batería 20 % o exista un contenedor no saludable.

## Estado de verificación

Los archivos y el build standalone se validan en el repositorio. El host
doméstico no es accesible desde este entorno (SSH/Tailscale sin conectividad),
por lo que el `compose up`, backup cifrado y restore drill deben ejecutarse en
ese host antes de afirmar recuperación real. Este límite no se oculta ni se
reemplaza por una captura.
