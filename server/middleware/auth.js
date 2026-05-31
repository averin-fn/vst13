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

module.exports = { signAdmin, signMember, requireAuth, requireMember };
