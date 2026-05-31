const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { signMember, requireMember } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

const ME_COLS = 'id, name, callsign, role, bio, photo, model_url, joined_date, username';

/* ---------- Авторизация ---------- */
router.post('/login', (req, res) => {
  const username = (req.body.username || '').trim();
  const password = req.body.password || '';
  if (!username || !password) {
    return res.status(400).json({ error: 'Укажите логин и пароль' });
  }
  const p = db
    .prepare("SELECT * FROM participants WHERE username = ? AND username IS NOT NULL AND username <> ''")
    .get(username);
  if (!p || !p.password_hash || !bcrypt.compareSync(password, p.password_hash)) {
    return res.status(401).json({ error: 'Неверный логин или пароль' });
  }
  const token = signMember({ participantId: p.id, username: p.username });
  res.json({ token, callsign: p.callsign, name: p.name });
});

/* ---------- Профиль ---------- */
router.get('/me', requireMember, (req, res) => {
  const p = db.prepare(`SELECT ${ME_COLS} FROM participants WHERE id = ?`).get(req.member.participantId);
  if (!p) return res.status(404).json({ error: 'Профиль не найден' });
  res.json(p);
});

const EDITABLE = ['bio', 'photo', 'model_url'];

router.put('/me', requireMember, (req, res) => {
  const data = {};
  for (const f of EDITABLE) {
    if (f in req.body) data[f] = String(req.body[f] ?? '');
  }
  if (Object.keys(data).length === 0) return res.json({ ok: true });

  const sets = Object.keys(data).map((k) => `${k} = ?`).join(', ');
  const values = [...Object.values(data), req.member.participantId];
  const info = db.prepare(`UPDATE participants SET ${sets} WHERE id = ?`).run(...values);
  if (info.changes === 0) return res.status(404).json({ error: 'Профиль не найден' });
  res.json({ ok: true });
});

router.post('/upload', requireMember, (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'Файл не получен' });
    res.status(201).json({ url: `/uploads/${req.file.filename}` });
  });
});

/* ---------- Смена пароля ---------- */
router.post('/password', requireMember, (req, res) => {
  const current = req.body.currentPassword || '';
  const next = req.body.newPassword || '';
  if (!current || !next) return res.status(400).json({ error: 'Заполните оба поля' });
  if (next.length < 4) return res.status(400).json({ error: 'Новый пароль слишком короткий (минимум 4 символа)' });

  const row = db
    .prepare('SELECT password_hash FROM participants WHERE id = ?')
    .get(req.member.participantId);
  if (!row || !row.password_hash || !bcrypt.compareSync(current, row.password_hash)) {
    return res.status(401).json({ error: 'Неверный текущий пароль' });
  }
  const hash = bcrypt.hashSync(next, 10);
  db.prepare('UPDATE participants SET password_hash = ? WHERE id = ?').run(hash, req.member.participantId);
  res.json({ ok: true });
});

/* ---------- Общий чат ---------- */
router.get('/chat', requireMember, (req, res) => {
  // Берём последние 200 сообщений и возвращаем в порядке возрастания.
  const rows = db
    .prepare(
      `SELECT m.id, m.message, m.created_at, m.participant_id, p.callsign, p.name
       FROM chat_messages m
       JOIN participants p ON p.id = m.participant_id
       WHERE m.id > ?
       ORDER BY m.id ASC
       LIMIT 200`
    )
    .all(Number(req.query.since || 0));
  res.json(rows);
});

router.post('/chat', requireMember, (req, res) => {
  const message = String(req.body.message || '').trim();
  if (!message) return res.status(400).json({ error: 'Пустое сообщение' });
  if (message.length > 1000) return res.status(400).json({ error: 'Слишком длинное сообщение' });
  const info = db
    .prepare('INSERT INTO chat_messages (participant_id, message, created_at) VALUES (?, ?, ?)')
    .run(req.member.participantId, message, new Date().toISOString());
  res.status(201).json({ id: Number(info.lastInsertRowid) });
});

/* ---------- RSVP на мероприятия ---------- */
router.get('/rsvps', requireMember, (req, res) => {
  const rows = db
    .prepare(
      `SELECT e.id, e.title, e.date, e.location, e.description, e.image,
              r.status AS my_status
       FROM events e
       LEFT JOIN event_rsvps r ON r.event_id = e.id AND r.participant_id = ?
       ORDER BY e.date`
    )
    .all(req.member.participantId);
  res.json(rows);
});

const RSVP_STATUSES = ['yes', 'no', 'maybe'];

router.put('/rsvps/:eventId', requireMember, (req, res) => {
  const status = String(req.body.status || '').toLowerCase();
  if (!RSVP_STATUSES.includes(status)) {
    return res.status(400).json({ error: 'Недопустимый статус' });
  }
  const ev = db.prepare('SELECT id FROM events WHERE id = ?').get(req.params.eventId);
  if (!ev) return res.status(404).json({ error: 'Мероприятие не найдено' });
  db.prepare(
    `INSERT INTO event_rsvps (event_id, participant_id, status, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(event_id, participant_id) DO UPDATE
       SET status = excluded.status, updated_at = excluded.updated_at`
  ).run(req.params.eventId, req.member.participantId, status, new Date().toISOString());
  res.json({ ok: true });
});

router.delete('/rsvps/:eventId', requireMember, (req, res) => {
  db.prepare('DELETE FROM event_rsvps WHERE event_id = ? AND participant_id = ?').run(
    req.params.eventId,
    req.member.participantId
  );
  res.json({ ok: true });
});

module.exports = router;
