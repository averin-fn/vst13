const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const bcrypt = require('bcryptjs');

const db = new DatabaseSync(path.join(__dirname, 'data.db'));
db.exec('PRAGMA journal_mode = WAL;');

db.exec(`
  CREATE TABLE IF NOT EXISTS participants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    callsign TEXT NOT NULL,
    role TEXT NOT NULL,
    bio TEXT NOT NULL DEFAULT '',
    photo TEXT NOT NULL DEFAULT '',
    model_url TEXT NOT NULL DEFAULT '',
    joined_date TEXT NOT NULL DEFAULT '',
    username TEXT,
    password_hash TEXT NOT NULL DEFAULT '',
    can_manage_events INTEGER NOT NULL DEFAULT 0,
    is_admin INTEGER NOT NULL DEFAULT 0,
    squad INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    date TEXT NOT NULL DEFAULT '',
    location TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    image TEXT NOT NULL DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    contact TEXT NOT NULL DEFAULT '',
    message TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS chat_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    participant_id INTEGER NOT NULL,
    channel TEXT NOT NULL DEFAULT 'general',
    message TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (participant_id) REFERENCES participants(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS event_rsvps (
    event_id INTEGER NOT NULL,
    participant_id INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'yes',
    updated_at TEXT NOT NULL,
    PRIMARY KEY (event_id, participant_id),
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY (participant_id) REFERENCES participants(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS rules (
    slug TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS chat_reads (
    participant_id INTEGER NOT NULL,
    channel TEXT NOT NULL DEFAULT 'general',
    last_read_id INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (participant_id, channel),
    FOREIGN KEY (participant_id) REFERENCES participants(id) ON DELETE CASCADE
  );
`);

// Сид трёх разделов правил (без перезаписи, если уже что-то записано)
const rulesSeed = [
  ['general', 'Основные правила', 'Здесь будут общие правила страйкбола: техника безопасности, поведение на полигоне, скорости приводов и т.д.\n\nКонтент редактируется в админ-панели.'],
  ['team', 'Правила команды', 'Внутренние правила команды ВСТ13: дисциплина, иерархия, взаимодействие на полигоне, ответственность.\n\nКонтент редактируется в админ-панели.'],
  ['equipment', 'Экипировка', 'Требования к экипировке: обязательная (защита глаз, маркеры/повязки, аптечка), рекомендованная (тактическое снаряжение, форма, обувь).\n\nКонтент редактируется в админ-панели.']
];
const rulesInsert = db.prepare('INSERT OR IGNORE INTO rules (slug, title, content) VALUES (?, ?, ?)');
for (const row of rulesSeed) rulesInsert.run(...row);

// Значения настроек по умолчанию
db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)').run('header_image', '');

// Миграция: добавляем колонки для аккаунтов участников в старых БД
try { db.exec('ALTER TABLE participants ADD COLUMN username TEXT'); } catch { /* колонка уже есть */ }
try { db.exec("ALTER TABLE participants ADD COLUMN password_hash TEXT NOT NULL DEFAULT ''"); } catch { /* колонка уже есть */ }
db.exec(
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_participants_username
   ON participants(username) WHERE username IS NOT NULL AND username <> ''`
);

// Миграция: добавляем колонку channel в чат, по умолчанию 'general'
try { db.exec("ALTER TABLE chat_messages ADD COLUMN channel TEXT NOT NULL DEFAULT 'general'"); } catch { /* колонка уже есть */ }

// Миграция: право участника управлять мероприятиями (0/1)
try { db.exec('ALTER TABLE participants ADD COLUMN can_manage_events INTEGER NOT NULL DEFAULT 0'); } catch { /* колонка уже есть */ }

// Миграция: участник является администратором (0/1) — даёт доступ в админ-панель из кабинета
try { db.exec('ALTER TABLE participants ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0'); } catch { /* колонка уже есть */ }

// Миграция: номер отряда солдата (1..3; 0 — не назначен)
try { db.exec('ALTER TABLE participants ADD COLUMN squad INTEGER NOT NULL DEFAULT 0'); } catch { /* колонка уже есть */ }

// Миграция: доступ к разделу «Акты» мастерской (0/1)
try { db.exec('ALTER TABLE participants ADD COLUMN can_manage_acts INTEGER NOT NULL DEFAULT 0'); } catch { /* колонка уже есть */ }

// Миграция: вложение к сообщению чата (картинка/файл)
try { db.exec("ALTER TABLE chat_messages ADD COLUMN attachment_url TEXT NOT NULL DEFAULT ''"); } catch { /* колонка уже есть */ }
try { db.exec("ALTER TABLE chat_messages ADD COLUMN attachment_type TEXT NOT NULL DEFAULT ''"); } catch { /* колонка уже есть */ }
try { db.exec("ALTER TABLE chat_messages ADD COLUMN attachment_name TEXT NOT NULL DEFAULT ''"); } catch { /* колонка уже есть */ }

// Миграция: ответ на сообщение (id родительского сообщения; 0 — обычное сообщение)
try { db.exec('ALTER TABLE chat_messages ADD COLUMN reply_to_id INTEGER NOT NULL DEFAULT 0'); } catch { /* колонка уже есть */ }

// Миграция: расстановка команды (снимок из планировщика) для мероприятия, JSON-строка
try { db.exec("ALTER TABLE events ADD COLUMN roster TEXT NOT NULL DEFAULT ''"); } catch { /* колонка уже есть */ }

// Подписки на пуш-уведомления (Web Push)
db.exec(`
  CREATE TABLE IF NOT EXISTS push_subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    participant_id INTEGER NOT NULL,
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL DEFAULT '',
    auth TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    FOREIGN KEY (participant_id) REFERENCES participants(id) ON DELETE CASCADE
  );
`);

// Реакции на сообщения чата (эмодзи)
db.exec(`
  CREATE TABLE IF NOT EXISTS chat_reactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    message_id INTEGER NOT NULL,
    participant_id INTEGER NOT NULL,
    emoji TEXT NOT NULL,
    created_at TEXT NOT NULL,
    UNIQUE(message_id, participant_id, emoji),
    FOREIGN KEY (message_id) REFERENCES chat_messages(id) ON DELETE CASCADE,
    FOREIGN KEY (participant_id) REFERENCES participants(id) ON DELETE CASCADE
  );
`);

// Мастерская: заявки на ремонт и галерея готовых работ
db.exec(`
  CREATE TABLE IF NOT EXISTS repair_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    contact TEXT NOT NULL DEFAULT '',
    message TEXT NOT NULL,
    photo TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS workshop_works (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    image TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS repair_acts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client TEXT NOT NULL DEFAULT '',
    device TEXT NOT NULL DEFAULT '',
    items TEXT NOT NULL DEFAULT '[]',
    photos TEXT NOT NULL DEFAULT '[]',
    note TEXT NOT NULL DEFAULT '',
    total INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );
`);

// Миграция: фото к заявке на ремонт (для уже созданной таблицы)
try { db.exec("ALTER TABLE repair_requests ADD COLUMN photo TEXT NOT NULL DEFAULT ''"); } catch { /* колонка уже есть */ }

// Дефолтный администратор при первом запуске.
// Логин/пароль можно задать через переменные окружения ADMIN_USER / ADMIN_PASSWORD.
const adminsCount = db.prepare('SELECT COUNT(*) AS c FROM admins').get().c;
if (adminsCount === 0) {
  const username = process.env.ADMIN_USER || 'admin';
  const password = process.env.ADMIN_PASSWORD || 'admin';
  const hash = bcrypt.hashSync(password, 10);
  db.prepare('INSERT INTO admins (username, password_hash) VALUES (?, ?)').run(username, hash);
  console.log(`Создан администратор по умолчанию: ${username} / ${password}`);
}

// Сид-данные при первом запуске
const participantsCount = db.prepare('SELECT COUNT(*) AS c FROM participants').get().c;
if (participantsCount === 0) {
  const insert = db.prepare(`
    INSERT INTO participants (name, callsign, role, bio, photo, model_url, joined_date)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const seed = [
    ['Алексей Морозов', 'Ворон', 'Командир',
      'Основатель команды, отвечает за тактику и координацию на полигоне. Играет с 2014 года.',
      '', '', '2016-03-01'],
    ['Дмитрий Соколов', 'Гром', 'Замполит',
      'Передовая линия штурма, специалист по ближнему бою и зачистке помещений.',
      '', '', '2018-06-15'],
    ['Ирина Волкова', 'Сова', 'Командир 1 отряда',
      'Точный выстрел и терпение. Отвечает за разведку и прикрытие на дальней дистанции.',
      '', '', '2019-09-10'],
    ['Сергей Кузнецов', 'Медик', 'Солдат',
      'Поддержка команды, эвакуация и «оживление» бойцов по правилам мероприятий.',
      '', '', '2020-01-20']
  ];
  for (const row of seed) insert.run(...row);
  // Солдат «Медик» — в 1 отряд (демонстрация структуры дерева)
  db.prepare("UPDATE participants SET squad = 1 WHERE callsign = 'Медик'").run();
}

const eventsCount = db.prepare('SELECT COUNT(*) AS c FROM events').get().c;
if (eventsCount === 0) {
  const insert = db.prepare(`
    INSERT INTO events (title, date, location, description, image)
    VALUES (?, ?, ?, ?, ?)
  `);
  const seed = [
    ['Тактическая игра «Рубеж»', '2026-06-14', 'Полигон «Северный лес»',
      'Двухсторонняя игра на захват точек. Сбор в 9:00, брифинг в 9:30.', ''],
    ['Ночной штурм', '2026-07-05', 'Заброшенная база, г. Подольск',
      'Ночной сценарий с использованием ПНВ и фонарей. Обязателен красный отбойник.', ''],
    ['Открытая тренировка для новичков', '2026-05-31', 'Полигон «Северный лес»',
      'Знакомство с командой, основы тактики и обращения с приводом. Снаряжение можно взять напрокат.', '']
  ];
  for (const row of seed) insert.run(...row);
}

module.exports = db;
