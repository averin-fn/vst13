const path = require('path');
const fs = require('fs');
const express = require('express');
const multer = require('multer');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Все маршруты ниже требуют авторизации
router.use(requireAuth);

/* ---------------- Участники ---------------- */
const PARTICIPANT_FIELDS = ['name', 'callsign', 'role', 'bio', 'photo', 'model_url', 'joined_date'];

function pick(body, fields) {
  const out = {};
  for (const f of fields) out[f] = body[f] != null ? String(body[f]) : '';
  return out;
}

router.post('/participants', (req, res) => {
  const data = pick(req.body, PARTICIPANT_FIELDS);
  if (!data.name || !data.callsign || !data.role) {
    return res.status(400).json({ error: 'Заполните имя, позывной и роль' });
  }
  const info = db
    .prepare(
      `INSERT INTO participants (name, callsign, role, bio, photo, model_url, joined_date)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(data.name, data.callsign, data.role, data.bio, data.photo, data.model_url, data.joined_date);
  res.status(201).json({ id: Number(info.lastInsertRowid) });
});

router.put('/participants/:id', (req, res) => {
  const data = pick(req.body, PARTICIPANT_FIELDS);
  const info = db
    .prepare(
      `UPDATE participants
       SET name = ?, callsign = ?, role = ?, bio = ?, photo = ?, model_url = ?, joined_date = ?
       WHERE id = ?`
    )
    .run(data.name, data.callsign, data.role, data.bio, data.photo, data.model_url, data.joined_date, req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Участник не найден' });
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
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const ALLOWED_EXT = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.glb', '.gltf'];

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, unique);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_EXT.includes(ext)) return cb(null, true);
    cb(new Error('Недопустимый тип файла'));
  }
});

router.post('/upload', (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'Файл не получен' });
    res.status(201).json({ url: `/uploads/${req.file.filename}` });
  });
});

module.exports = router;
