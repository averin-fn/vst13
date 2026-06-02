const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

// Все маршруты ниже требуют авторизации администратора
router.use(requireAuth);

/* ---------------- Участники ---------------- */
const PARTICIPANT_FIELDS = ['name', 'callsign', 'role', 'bio', 'photo', 'model_url', 'joined_date'];
const PARTICIPANT_ADMIN_COLS =
  'id, name, callsign, role, bio, photo, model_url, joined_date, username, can_manage_events';

function pick(body, fields) {
  const out = {};
  for (const f of fields) out[f] = body[f] != null ? String(body[f]) : '';
  return out;
}

// Подготовить значения username/password_hash из тела запроса.
// На POST: либо оба пустые (без аккаунта), либо оба заполнены.
// На PUT: username опционально (если строка передана — устанавливаем, '' = убрать аккаунт),
//         password опционально (если непустой — обновляем хэш).
function deriveAuthFields(body, mode) {
  const username = body.username != null ? String(body.username).trim() : undefined;
  const password = body.password != null ? String(body.password) : '';

  if (mode === 'create') {
    if (!username && !password) return { username: null, password_hash: '' };
    if (!username || !password) {
      const err = new Error('Для аккаунта укажите и логин, и пароль');
      err.status = 400;
      throw err;
    }
    return { username, password_hash: bcrypt.hashSync(password, 10) };
  }
  // mode === 'update'
  const out = {};
  if (username !== undefined) {
    // Пустая строка — убрать аккаунт (заодно очистим пароль)
    out.username = username === '' ? null : username;
    if (username === '') out.password_hash = '';
  }
  if (password) {
    out.password_hash = bcrypt.hashSync(password, 10);
  }
  return out;
}

router.get('/participants/:id', (req, res) => {
  const row = db
    .prepare(`SELECT ${PARTICIPANT_ADMIN_COLS} FROM participants WHERE id = ?`)
    .get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Участник не найден' });
  res.json(row);
});

router.post('/participants', (req, res) => {
  const data = pick(req.body, PARTICIPANT_FIELDS);
  if (!data.name || !data.callsign || !data.role) {
    return res.status(400).json({ error: 'Заполните имя, позывной и роль' });
  }
  let auth;
  try {
    auth = deriveAuthFields(req.body, 'create');
  } catch (err) {
    return res.status(err.status || 400).json({ error: err.message });
  }
  const canManage = req.body.can_manage_events ? 1 : 0;
  try {
    const info = db
      .prepare(
        `INSERT INTO participants (name, callsign, role, bio, photo, model_url, joined_date, username, password_hash, can_manage_events)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        data.name,
        data.callsign,
        data.role,
        data.bio,
        data.photo,
        data.model_url,
        data.joined_date,
        auth.username,
        auth.password_hash,
        canManage
      );
    res.status(201).json({ id: Number(info.lastInsertRowid) });
  } catch (err) {
    if (/UNIQUE/i.test(err.message)) {
      return res.status(409).json({ error: 'Такой логин уже занят' });
    }
    throw err;
  }
});

router.put('/participants/:id', (req, res) => {
  const data = pick(req.body, PARTICIPANT_FIELDS);
  let auth;
  try {
    auth = deriveAuthFields(req.body, 'update');
  } catch (err) {
    return res.status(err.status || 400).json({ error: err.message });
  }
  // Сначала обновляем основные поля
  const info = db
    .prepare(
      `UPDATE participants
       SET name = ?, callsign = ?, role = ?, bio = ?, photo = ?, model_url = ?, joined_date = ?
       WHERE id = ?`
    )
    .run(
      data.name,
      data.callsign,
      data.role,
      data.bio,
      data.photo,
      data.model_url,
      data.joined_date,
      req.params.id
    );
  if (info.changes === 0) return res.status(404).json({ error: 'Участник не найден' });

  // Затем — поля аккаунта, если они в запросе
  try {
    if ('username' in auth) {
      db.prepare('UPDATE participants SET username = ? WHERE id = ?').run(auth.username, req.params.id);
    }
    if ('password_hash' in auth) {
      db.prepare('UPDATE participants SET password_hash = ? WHERE id = ?').run(
        auth.password_hash,
        req.params.id
      );
    }
  } catch (err) {
    if (/UNIQUE/i.test(err.message)) {
      return res.status(409).json({ error: 'Такой логин уже занят' });
    }
    throw err;
  }
  // Право управлять мероприятиями
  if ('can_manage_events' in req.body) {
    db.prepare('UPDATE participants SET can_manage_events = ? WHERE id = ?').run(
      req.body.can_manage_events ? 1 : 0,
      req.params.id
    );
  }
  res.json({ ok: true });
});

router.delete('/participants/:id', (req, res) => {
  const info = db.prepare('DELETE FROM participants WHERE id = ?').run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Участник не найден' });
  res.json({ ok: true });
});

/* ---------------- Мероприятия ---------------- */
const EVENT_FIELDS = ['title', 'date', 'location', 'description', 'image'];

router.post('/events', (req, res) => {
  const data = pick(req.body, EVENT_FIELDS);
  if (!data.title) return res.status(400).json({ error: 'Укажите название мероприятия' });
  const info = db
    .prepare('INSERT INTO events (title, date, location, description, image) VALUES (?, ?, ?, ?, ?)')
    .run(data.title, data.date, data.location, data.description, data.image);
  res.status(201).json({ id: Number(info.lastInsertRowid) });
});

router.put('/events/:id', (req, res) => {
  const data = pick(req.body, EVENT_FIELDS);
  const info = db
    .prepare('UPDATE events SET title = ?, date = ?, location = ?, description = ?, image = ? WHERE id = ?')
    .run(data.title, data.date, data.location, data.description, data.image, req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Мероприятие не найдено' });
  res.json({ ok: true });
});

router.delete('/events/:id', (req, res) => {
  const info = db.prepare('DELETE FROM events WHERE id = ?').run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Мероприятие не найдено' });
  res.json({ ok: true });
});

// Кто отметился по конкретному мероприятию (для админа)
router.get('/events/:id/rsvps', (req, res) => {
  const rows = db
    .prepare(
      `SELECT p.id, p.name, p.callsign, p.role, r.status, r.updated_at
       FROM event_rsvps r
       JOIN participants p ON p.id = r.participant_id
       WHERE r.event_id = ?
       ORDER BY CASE r.status WHEN 'yes' THEN 0 WHEN 'maybe' THEN 1 ELSE 2 END, p.callsign`
    )
    .all(req.params.id);
  res.json(rows);
});

/* ---------------- Обратная связь ---------------- */
router.get('/feedback', (req, res) => {
  const rows = db.prepare('SELECT * FROM feedback ORDER BY datetime(created_at) DESC').all();
  res.json(rows);
});

router.delete('/feedback/:id', (req, res) => {
  const info = db.prepare('DELETE FROM feedback WHERE id = ?').run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Сообщение не найдено' });
  res.json({ ok: true });
});

/* ---------------- Настройки сайта ---------------- */
const ALLOWED_SETTINGS = ['header_image'];

router.put('/settings', (req, res) => {
  const body = req.body || {};
  const upsert = db.prepare(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  );
  for (const key of ALLOWED_SETTINGS) {
    if (key in body) upsert.run(key, String(body[key] ?? ''));
  }
  res.json({ ok: true });
});

/* ---------------- Загрузка файлов ---------------- */
router.post('/upload', (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'Файл не получен' });
    res.status(201).json({ url: `/uploads/${req.file.filename}` });
  });
});

module.exports = router;
