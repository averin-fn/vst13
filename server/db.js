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
    password_hash TEXT NOT NULL DEFAULT ''
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
`);

// Значения настроек по умолчанию
db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)').run('header_image', '');

// Миграция: добавляем колонки для аккаунтов участников в старых БД
try { db.exec('ALTER TABLE participants ADD COLUMN username TEXT'); } catch { /* колонка уже есть */ }
try { db.exec("ALTER TABLE participants ADD COLUMN password_hash TEXT NOT NULL DEFAULT ''"); } catch { /* колонка уже есть */ }
db.exec(
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_participants_username
   ON participants(username) WHERE username IS NOT NULL AND username <> ''`
);

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
    ['Дмитрий Соколов', 'Гром', 'Штурмовик',
      'Передовая линия штурма, специалист по ближнему бою и зачистке помещений.',
      '', '', '2018-06-15'],
    ['Ирина Волкова', 'Сова', 'Снайпер',
      'Точный выстрел и терпение. Отвечает за разведку и прикрытие на дальней дистанции.',
      '', '', '2019-09-10'],
    ['Сергей Кузнецов', 'Медик', 'Медик',
      'Поддержка команды, эвакуация и «оживление» бойцов по правилам мероприятий.',
      '', '', '2020-01-20']
  ];
  for (const row of seed) insert.run(...row);
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
