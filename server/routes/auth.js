const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { signAdmin } = require('../middleware/auth');

const router = express.Router();

router.post('/login', (req, res) => {
  const username = (req.body.username || '').trim();
  const password = req.body.password || '';

  const admin = db.prepare('SELECT * FROM admins WHERE username = ?').get(username);
  if (!admin || !bcrypt.compareSync(password, admin.password_hash)) {
    return res.status(401).json({ error: 'Неверный логин или пароль' });
  }

  const token = signAdmin({ id: admin.id, username: admin.username });
  res.json({ token, username: admin.username });
});

module.exports = router;
