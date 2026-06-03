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

# 1. Бэкап SQLite-базы (если уже создана) + временная копия для восстановления.
# data.db не версионируется, поэтому git reset --hard удалит её из рабочей папки —
# сохраняем во временный файл и возвращаем после reset, чтобы не потерять данные.
KEEP_DB=""
if [ -f server/data.db ]; then
  mkdir -p "$BACKUP_DIR"
  cp server/data.db "$BACKUP_DIR/data-$(date +%Y%m%dT%H%M%S).db"
  find "$BACKUP_DIR" -name 'data-*.db' -mtime "+$BACKUP_KEEP_DAYS" -delete
  KEEP_DB="$(mktemp)"
  cp server/data.db "$KEEP_DB"
  echo "==> Бэкап БД сделан"
fi

# 2. Свежий код.
echo "==> git pull"
git fetch origin
git reset --hard origin/master

# 2.1 Возвращаем живую БД, если reset её удалил.
if [ -n "$KEEP_DB" ]; then
  if [ ! -f server/data.db ]; then
    cp "$KEEP_DB" server/data.db
    echo "==> Восстановлена БД после reset"
  fi
  rm -f "$KEEP_DB"
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
