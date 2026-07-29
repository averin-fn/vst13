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

const QUEST_ROWS = 'SELECT id, title, reward FROM game_quests ORDER BY id';

// Публично: команды с очками, последние начисления и список квестов
router.get('/', (req, res) => {
  const teams = db.prepare(TEAMS_WITH_POINTS).all();
  const log = db.prepare(LOG_ROWS).all(50);
  const quests = db.prepare(QUEST_ROWS).all();
  res.json({ teams, log, quests });
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

/* ---------- Квесты и награды (заполняют судьи) ---------- */
// Текст квеста и награды — свободные строки, ограничиваем только длину.
function questFields(body) {
  return {
    title: String(body.title || '').trim().slice(0, 300),
    reward: String(body.reward || '').trim().slice(0, 200)
  };
}

router.post('/quests', requireMember, ensureGameManager, (req, res) => {
  const { title, reward } = questFields(req.body);
  if (!title) return res.status(400).json({ error: 'Укажите текст квеста' });
  const info = db
    .prepare('INSERT INTO game_quests (title, reward, created_at) VALUES (?, ?, ?)')
    .run(title, reward, new Date().toISOString());
  res.status(201).json({ id: Number(info.lastInsertRowid) });
});

router.put('/quests/:id', requireMember, ensureGameManager, (req, res) => {
  const { title, reward } = questFields(req.body);
  if (!title) return res.status(400).json({ error: 'Укажите текст квеста' });
  const info = db
    .prepare('UPDATE game_quests SET title = ?, reward = ? WHERE id = ?')
    .run(title, reward, req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Квест не найден' });
  res.json({ ok: true });
});

router.delete('/quests/:id', requireMember, ensureGameManager, (req, res) => {
  const info = db.prepare('DELETE FROM game_quests WHERE id = ?').run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Квест не найден' });
  res.json({ ok: true });
});

module.exports = router;
