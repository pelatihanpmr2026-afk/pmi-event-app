#!/bin/sh
# Backup otomatis harian database + uploads di VPS.
# - Menyimpan maksimal KEEP backup terbaru, sisanya dihapus otomatis.
# - Dijalankan lewat cron user `deploy` (lihat OPERATIONS.md bagian backup otomatis).
# - Kredensial MySQL dibaca dari /home/deploy/.my.cnf (chmod 600), BUKAN dari argumen.
set -eu

APP_DIR="/home/deploy/pmi-event-app"
BACKUP_DIR="/home/deploy/backups"
MYCNF="/home/deploy/.my.cnf"
DB_NAME="pmi_event"
KEEP=7
STAMP="$(date +%F)"

mkdir -p "$BACKUP_DIR"

mysqldump --defaults-extra-file="$MYCNF" --no-tablespaces --single-transaction \
  "$DB_NAME" | gzip > "$BACKUP_DIR/db_${STAMP}.sql.gz"

tar -czf "$BACKUP_DIR/uploads_${STAMP}.tar.gz" -C "$APP_DIR" storage/uploads

# Rotasi: hapus file lama di luar KEEP terbaru.
# shellcheck disable=SC2012
ls -t "$BACKUP_DIR"/db_*.sql.gz 2>/dev/null | tail -n +$((KEEP + 1)) | xargs -r rm -f
# shellcheck disable=SC2012
ls -t "$BACKUP_DIR"/uploads_*.tar.gz 2>/dev/null | tail -n +$((KEEP + 1)) | xargs -r rm -f

echo "[$(date '+%F %T')] backup OK: db_${STAMP}.sql.gz + uploads_${STAMP}.tar.gz"
