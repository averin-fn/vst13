const express = require('express');
const db = require('../db');

const router = express.Router();

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM events ORDER BY date').all();
  res.json(rows);
});

// Публичная статистика голосования по мероприятию
router.get('/:id/rsvps', (req, res) => {
  const rows = db
    .prepare(
      `SELECT p.id, p.callsign, p.name, r.status
       FROM event_rsvps r
       JOIN participants p ON p.id = r.participant_id
       WHERE r.event_id = ?
       ORDER BY CASE r.status WHEN 'yes' THEN 0 WHEN 'maybe' THEN 1 ELSE 2 END, p.callsign`
    )
    .all(req.params.id);
  res.json(rows);
});

module.exports = router;
