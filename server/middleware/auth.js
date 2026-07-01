const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'vst13-dev-secret-change-me';

function signAdmin(payload) {
  return jwt.sign({ ...payload, type: 'admin' }, SECRET, { expiresIn: '7d' });
}

function signMember(payload) {
  return jwt.sign({ ...payload, type: 'member' }, SECRET, { expiresIn: '7d' });
}

function decodeFromHeader(req) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return null;
  try {
    return jwt.verify(token, SECRET);
  } catch {
    return null;
  }
}

function requireAuth(req, res, next) {
  const decoded = decodeFromHeader(req);
  if (!decoded || decoded.type !== 'admin') {
    return res.status(401).json({ error: 'Требуется авторизация администратора' });
  }
  req.admin = decoded;
  next();
}

function requireMember(req, res, next) {
  const decoded = decodeFromHeader(req);
  if (!decoded || decoded.type !== 'member') {
    return res.status(401).json({ error: 'Требуется вход в личный кабинет' });
  }
  req.member = decoded;
  next();
}

// Проверка флага can_manage_events. Использовать в цепочке после requireMember.
function ensureEventManager(req, res, next) {
  if (!req.member) return res.status(401).json({ error: 'Требуется вход' });
  // eslint-disable-next-line global-require
  const db = require('../db');
  const row = db
    .prepare('SELECT can_manage_events FROM participants WHERE id = ?')
    .get(req.member.participantId);
  if (!row || !row.can_manage_events) {
    return res.status(403).json({ error: 'Нет прав на управление мероприятиями' });
  }
  next();
}

// Проверка флага can_manage_acts (доступ к актам мастерской).
function ensureActsManager(req, res, next) {
  if (!req.member) return res.status(401).json({ error: 'Требуется вход' });
  // eslint-disable-next-line global-require
  const db = require('../db');
  const row = db
    .prepare('SELECT can_manage_acts FROM participants WHERE id = ?')
    .get(req.member.participantId);
  if (!row || !row.can_manage_acts) {
    return res.status(403).json({ error: 'Нет доступа к актам' });
  }
  next();
}

// Проверка флага can_manage_game (судья Breakout of Zelenyi).
function ensureGameManager(req, res, next) {
  if (!req.member) return res.status(401).json({ error: 'Требуется вход' });
  // eslint-disable-next-line global-require
  const db = require('../db');
  const row = db
    .prepare('SELECT can_manage_game FROM participants WHERE id = ?')
    .get(req.member.participantId);
  if (!row || !row.can_manage_game) {
    return res.status(403).json({ error: 'Нет прав на начисление очков' });
  }
  next();
}

module.exports = {
  signAdmin,
  signMember,
  requireAuth,
  requireMember,
  ensureEventManager,
  ensureActsManager,
  ensureGameManager
};
