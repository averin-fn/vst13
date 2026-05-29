const express = require('express');
const db = require('../db');

const router = express.Router();

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM participants ORDER BY id').all();
  res.json(rows);
});

router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM participants WHERE id = ?').get(req.params.id);
  if (!row) {
    return res.status(404).json({ error: 'Участник не найден' });
  }
  res.json(row);
});

module.exports = router;
