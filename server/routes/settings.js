const express = require('express');
const db = require('../db');

const router = express.Router();

// Публичные настройки сайта (например, фото шапки)
router.get('/', (req, res) => {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const obj = {};
  for (const r of rows) obj[r.key] = r.value;
  res.json(obj);
});

module.exports = router;
