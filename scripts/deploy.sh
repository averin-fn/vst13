#!/usr/bin/env bash
# Обновление приложения на сервере: бэкап БД -> git pull -> зависимости -> сборка -> рестарт.
# Запускается на сервере (вручную или из GitHub Actions по SSH).
set -euo pipefail

# Корень приложения = папка на уровень выше этого скрипта.
APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SERVICE_NAME="${SERVICE_NAME:-vst13}"
BACKUP_DIR="$APP_DIR/server/backups"
BACKUP_KEEP_DAYS="${BACKUP_KEEP_DAYS:-30}"

cd "$APP_DIR"

# 1. Бэкап SQLite-базы + сохранение «живой» базы для восстановления после reset.
# data.db версионируется, поэтому git reset --hard затёр бы серверные данные.
# Сохраняем data.db вместе с WAL/SHM (согласованный комплект) и возвращаем после
# reset — чтобы правки, сделанные через админку на сервере, не терялись.
KEEP_DIR=""
if [ -f server/data.db ]; then
  mkdir -p "$BACKUP_DIR"
  cp server/data.db "$BACKUP_DIR/data-$(date +%Y%m%dT%H%M%S).db"
  find "$BACKUP_DIR" -name 'data-*.db' -mtime "+$BACKUP_KEEP_DAYS" -delete
  KEEP_DIR="$(mktemp -d)"
  cp server/data.db "$KEEP_DIR/" 2>/dev/null || true
  cp server/data.db-wal "$KEEP_DIR/" 2>/dev/null || true
  cp server/data.db-shm "$KEEP_DIR/" 2>/dev/null || true
  echo "==> Бэкап БД сделан"
fi

# 2. Свежий код.
echo "==> git pull"
git fetch origin
git reset --hard origin/master

# 2.1 Возвращаем «живую» базу поверх версии из репозитория.
if [ -n "$KEEP_DIR" ]; then
  cp "$KEEP_DIR/data.db" server/data.db 2>/dev/null || true
  cp "$KEEP_DIR/data.db-wal" server/data.db-wal 2>/dev/null || true
  cp "$KEEP_DIR/data.db-shm" server/data.db-shm 2>/dev/null || true
  rm -rf "$KEEP_DIR"
  echo "==> Серверная БД сохранена"
fi

# 3. Зависимости сервера.
# Клиент (client/dist) собирается в GitHub Actions и копируется по scp,
# чтобы не нагружать сервер сборкой.
echo "==> Установка зависимостей сервера"
( cd server && npm install --omit=dev )

# 4. Рестарт сервиса.
echo "==> Рестарт $SERVICE_NAME"
sudo systemctl restart "$SERVICE_NAME"

echo "==> Готово"
