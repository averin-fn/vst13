const express = require('express');
const db = require('../db');

const router = express.Router();

router.post('/', (req, res) => {
  const name = (req.body.name || '').trim();
  const contact = (req.body.contact || '').trim();
  const message = (req.body.message || '').trim();

  if (!name || !message) {
    return res.status(400).json({ error: 'Укажите имя и сообщение' });
  }

  const info = db
    .prepare('INSERT INTO feedback (name, contact, message, created_at) VALUES (?, ?, ?, ?)')
    .run(name, contact, message, new Date().toISOString());

  res.status(201).json({ id: Number(info.lastInsertRowid) });
});

module.exports = router;
