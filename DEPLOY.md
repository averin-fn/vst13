# Деплой vst13

Деплой: **git pull на сервере + systemd**, а клиент собирается в **GitHub Actions**
(на сервере не хватает RAM для `vite build`). При пуше в `master` workflow:
1. собирает `client/dist` в CI,
2. копирует его на сервер по scp,
3. по SSH запускает [`scripts/deploy.sh`](scripts/deploy.sh) — бэкап БД, git pull,
   зависимости сервера, рестарт сервиса.

Express в продакшене сам отдаёт собранный клиент (`client/dist`) и API на одном порту
(`4100`), поэтому отдельный nginx нужен только для HTTPS.

> ⚠️ Бэкенд использует встроенный модуль `node:sqlite` → на сервере нужен **Node.js 22+**.

## Настройка сервера (один раз)

### 1. Node 22 + git

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs git
```

### 2. Клонирование

```bash
sudo git clone <repo-url> /opt/vst13
```

`/opt/vst13` — путь приложения (захардкожен в workflow). Сервис по умолчанию
запускается от root; отдельный пользователь не обязателен.

### 3. Секреты (вне репозитория)

Файл `/opt/vst13/.env` (используется в [server/middleware/auth.js](server/middleware/auth.js#L3) и [server/db.js](server/db.js#L124)):

```bash
sudo tee /opt/vst13/.env >/dev/null <<EOF
JWT_SECRET=$(openssl rand -hex 32)
ADMIN_USER=admin
ADMIN_PASSWORD=надёжный_пароль
EOF
sudo chmod 600 /opt/vst13/.env
```

> `ADMIN_*` задают учётку администратора при первом создании БД. Если БД уже есть —
> пароль меняется через личный кабинет.

### 4. systemd-сервис

```bash
sudo cp /opt/vst13/scripts/vst13.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now vst13
```

### 5. Рестарт без пароля (только если деплоите по SSH НЕ под root)

Если `SSH_USER` = `root`, этот шаг не нужен. Иначе разрешите пользователю рестарт:

```bash
echo '<ssh-user> ALL=(root) NOPASSWD: /usr/bin/systemctl restart vst13' \
  | sudo tee /etc/sudoers.d/vst13
```

### 6. Первый деплой

Клиент собирается в GitHub Actions, поэтому первый `client/dist` приедет на сервер
при первом прогоне workflow (см. раздел ниже) — запустите его пушем в `master` или
вручную через **Actions → Deploy → Run workflow**.

Сервер при этом установит зависимости и поднимет сервис через [`scripts/deploy.sh`](scripts/deploy.sh).
После успешного прогона открыть `http://<сервер>:4100`.

> Запускать `deploy.sh` на сервере вручную не нужно — он не собирает клиент,
> а только обновляет серверную часть и перезапускает сервис.

### 7. (Опционально) nginx + HTTPS

```bash
sudo apt-get install -y nginx certbot python3-certbot-nginx
sudo cp /opt/vst13/scripts/nginx.conf.example /etc/nginx/sites-available/vst13
sudo nano /etc/nginx/sites-available/vst13   # заменить server_name
sudo ln -s /etc/nginx/sites-available/vst13 /etc/nginx/sites-enabled/vst13
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d example.com
```

## GitHub Actions (один раз)

**Settings → Secrets and variables → Actions** — добавить секреты:

| Секрет            | Описание                              | Пример           |
|-------------------|---------------------------------------|------------------|
| `SSH_HOST`        | адрес сервера                          | `203.0.113.10`   |
| `SSH_PORT`        | SSH-порт                               | `22`             |
| `SSH_USER`        | SSH-пользователь                       | `vst13`          |
| `SSH_PRIVATE_KEY` | приватный ключ (без пароля, целиком)   | `-----BEGIN ...` |

> Путь до приложения (`/opt/vst13`) захардкожен в workflow. Если разворачиваете в другую
> папку — поправьте `script:` в [.github/workflows/deploy.yml](.github/workflows/deploy.yml).

Публичный ключ пары добавить в `/opt/vst13/.ssh/authorized_keys` пользователю `vst13`.

После этого любой пуш в `master` (или **Actions → Deploy → Run workflow**) разворачивает изменения.

## Обслуживание

```bash
sudo systemctl status vst13          # состояние
sudo journalctl -u vst13 -f          # логи
curl http://localhost:4100/api/health   # {"status":"ok"}
```

### Бэкап / восстановление

`deploy.sh` делает бэкап `server/data.db` в `server/backups/` перед каждым обновлением
(хранятся 30 дней, см. `BACKUP_KEEP_DAYS`). Восстановление:

```bash
sudo systemctl stop vst13
sudo -u vst13 cp /opt/vst13/server/backups/data-XXXXXXXX.db /opt/vst13/server/data.db
sudo systemctl start vst13
```

## Откат

Откатить код и развернуть предыдущий коммит:

```bash
git revert <bad-commit> && git push   # запустит деплой
```

БД и загрузки (`server/uploads/`) деплой не трогает.

## Частые проблемы

- **`node:sqlite` падает** — на сервере Node < 22 (`node -v`).
- **Деплой не может рестартнуть сервис** — нет правила в `/etc/sudoers.d/vst13`.
- **Permission denied (publickey)** — публичный ключ не в `authorized_keys` пользователя `vst13`.
