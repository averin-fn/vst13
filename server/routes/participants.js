const express = require('express');
const db = require('../db');

const router = express.Router();

const PUBLIC_COLS =
  'id, name, callsign, role, bio, photo, model_url, joined_date, squad';

// Судейские аккаунты игры (is_judge) — не участники команды, в состав не попадают
router.get('/', (req, res) => {
  const rows = db.prepare(`SELECT ${PUBLIC_COLS} FROM participants WHERE is_judge = 0 ORDER BY id`).all();
  res.json(rows);
});

router.get('/:id', (req, res) => {
  const row = db
    .prepare(`SELECT ${PUBLIC_COLS} FROM participants WHERE id = ? AND is_judge = 0`)
    .get(req.params.id);
  if (!row) {
    return res.status(404).json({ error: 'Участник не найден' });
  }
  res.json(row);
});

module.exports = router;
