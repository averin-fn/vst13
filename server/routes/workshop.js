const express = require('express');
const db = require('../db');
const upload = require('../middleware/upload');

const router = express.Router();

// Галерея готовых работ (публично)
router.get('/works', (req, res) => {
  const rows = db
    .prepare('SELECT id, title, description, image, created_at FROM workshop_works ORDER BY id DESC')
    .all();
  res.json(rows);
});

// Публичная загрузка фото к заявке (только изображения, лимит 15 МБ)
router.post('/upload', (req, res) => {
  upload.image.single('file')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'Файл не получен' });
    res.status(201).json({ url: `/uploads/${req.file.filename}` });
  });
});

// Заявка на ремонт (публично)
router.post('/repair', (req, res) => {
  const name = (req.body.name || '').trim();
  const contact = (req.body.contact || '').trim();
  const message = (req.body.message || '').trim();
  const photoRaw = (req.body.photo || '').trim();
  const photo = photoRaw.startsWith('/uploads/') ? photoRaw : '';
  if (!name || !message) {
    return res.status(400).json({ error: 'Укажите имя и что нужно отремонтировать' });
  }
  if (message.length > 2000) {
    return res.status(400).json({ error: 'Слишком длинное описание' });
  }
  const info = db
    .prepare('INSERT INTO repair_requests (name, contact, message, photo, created_at) VALUES (?, ?, ?, ?, ?)')
    .run(name, contact, message, photo, new Date().toISOString());
  res.status(201).json({ id: Number(info.lastInsertRowid) });
});

module.exports = router;
