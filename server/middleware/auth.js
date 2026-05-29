const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'vst13-dev-secret-change-me';

function sign(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: '7d' });
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: 'Требуется авторизация' });
  }
  try {
    req.admin = jwt.verify(token, SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Недействительный токен' });
  }
}

module.exports = { sign, requireAuth };
