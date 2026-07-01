// Игра Breakout of Zelenyi: публичная турнирная таблица
// и начисление очков судьями (участники с флагом can_manage_game).
const express = require('express');
const db = require('../db');
const { requireMember, ensureGameManager } = require('../middleware/auth');

const router = express.Router();

const TEAMS_WITH_POINTS = `
  SELECT t.id, t.name, t.color,
         COALESCE(SUM(l.delta), 0) AS points
  FROM game_teams t
  LEFT JOIN game_score_log l ON l.team_id = t.id
  GROUP BY t.id
  ORDER BY points DESC, t.name`;

const LOG_ROWS = `
  SELECT l.id, l.team_id, l.delta, l.reason, l.author, l.created_at, t.name AS team_name
  FROM game_score_log l
  JOIN game_teams t ON t.id = l.team_id
  ORDER BY l.id DESC
  LIMIT ?`;

// Публично: команды с очками и последние начисления
router.get('/', (req, res) => {
  const teams = db.prepare(TEAMS_WITH_POINTS).all();
  const log = db.prepare(LOG_ROWS).all(50);
  res.json({ teams, log });
});

// Судья: начислить или снять очки
router.post('/teams/:id/points', requireMember, ensureGameManager, (req, res) => {
  const team = db.prepare('SELECT id FROM game_teams WHERE id = ?').get(req.params.id);
  if (!team) return res.status(404).json({ error: 'Команда не найдена' });

  const delta = parseInt(req.body.delta, 10);
  if (!Number.isInteger(delta) || delta === 0 || Math.abs(delta) > 1000000) {
    return res.status(400).json({ error: 'Укажите ненулевое число очков' });
  }
  const reason = String(req.body.reason || '').trim().slice(0, 200);

  const p = db
    .prepare('SELECT callsign FROM participants WHERE id = ?')
    .get(req.member.participantId);
  db.prepare(
    'INSERT INTO game_score_log (team_id, delta, reason, author, created_at) VALUES (?, ?, ?, ?, ?)'
  ).run(team.id, delta, reason, p ? p.callsign : '', new Date().toISOString());

  res.status(201).json({ ok: true });
});

module.exports = router;
