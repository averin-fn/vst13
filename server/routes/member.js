const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { signMember, requireMember } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

const ME_COLS = 'id, name, callsign, role, bio, photo, model_url, joined_date, username';

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

router.get('/me', requireMember, (req, res) => {
  const p = db.prepare(`SELECT ${ME_COLS} FROM participants WHERE id = ?`).get(req.member.participantId);
  if (!p) return res.status(404).json({ error: 'Профиль не найден' });
  res.json(p);
});

// Участник может редактировать только «личные» поля.
// Позывной, имя, роль, дату вступления и логин/пароль меняет администратор.
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

module.exports = router;
