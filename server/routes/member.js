const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const {
  signAdmin,
  signMember,
  requireMember,
  ensureEventManager,
  ensureActsManager
} = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

const ME_COLS =
  'id, name, callsign, role, bio, photo, model_url, joined_date, username, can_manage_events, is_admin, can_manage_acts';

/* ---------- Авторизация ---------- */
router.post('/login', (req, res) => {
  const username = (req.body.username || '').trim();
  const password = req.body.password || '';
  if (!username || !password) {
    return res.status(400).json({ error: 'Укажите логин и пароль' });
  }
  const p = db
    .prepare("SELECT * FROM participants WHERE username = ? AND username IS NOT NULL AND username <> ''")
    .get(username);
  if (!p || !p.password_hash || !bcrypt.compareSync(password, p.password_hash)) {
    return res.status(401).json({ error: 'Неверный логин или пароль' });
  }
  const token = signMember({ participantId: p.id, username: p.username });
  res.json({ token, callsign: p.callsign, name: p.name });
});

/* ---------- Профиль ---------- */
router.get('/me', requireMember, (req, res) => {
  const p = db.prepare(`SELECT ${ME_COLS} FROM participants WHERE id = ?`).get(req.member.participantId);
  if (!p) return res.status(404).json({ error: 'Профиль не найден' });
  res.json(p);
});

const EDITABLE = ['bio', 'photo', 'model_url'];

router.put('/me', requireMember, (req, res) => {
  const data = {};
  for (const f of EDITABLE) {
    if (f in req.body) data[f] = String(req.body[f] ?? '');
  }
  if (Object.keys(data).length === 0) return res.json({ ok: true });

  const sets = Object.keys(data).map((k) => `${k} = ?`).join(', ');
  const values = [...Object.values(data), req.member.participantId];
  const info = db.prepare(`UPDATE participants SET ${sets} WHERE id = ?`).run(...values);
  if (info.changes === 0) return res.status(404).json({ error: 'Профиль не найден' });
  res.json({ ok: true });
});

router.post('/upload', requireMember, (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'Файл не получен' });
    res.status(201).json({ url: `/uploads/${req.file.filename}` });
  });
});

/* ---------- Смена пароля ---------- */
router.post('/password', requireMember, (req, res) => {
  const current = req.body.currentPassword || '';
  const next = req.body.newPassword || '';
  if (!current || !next) return res.status(400).json({ error: 'Заполните оба поля' });
  if (next.length < 4) return res.status(400).json({ error: 'Новый пароль слишком короткий (минимум 4 символа)' });

  const row = db
    .prepare('SELECT password_hash FROM participants WHERE id = ?')
    .get(req.member.participantId);
  if (!row || !row.password_hash || !bcrypt.compareSync(current, row.password_hash)) {
    return res.status(401).json({ error: 'Неверный текущий пароль' });
  }
  const hash = bcrypt.hashSync(next, 10);
  db.prepare('UPDATE participants SET password_hash = ? WHERE id = ?').run(hash, req.member.participantId);
  res.json({ ok: true });
});

/* ---------- Доступ в админ-панель ---------- */
// Участник с флагом is_admin может получить админ-токен прямо из кабинета,
// не вводя отдельные учётные данные. Существующая админка работает как прежде.
router.post('/admin-token', requireMember, (req, res) => {
  const row = db
    .prepare('SELECT id, username, is_admin FROM participants WHERE id = ?')
    .get(req.member.participantId);
  if (!row || !row.is_admin) {
    return res.status(403).json({ error: 'Нет прав администратора' });
  }
  const token = signAdmin({ participantId: row.id, username: row.username });
  res.json({ token });
});

/* ---------- Общий чат ---------- */
const ALLOWED_CHANNELS = ['general', 'tactics', 'gear', 'games'];

function normalizeChannel(value) {
  const ch = String(value || 'general').toLowerCase();
  return ALLOWED_CHANNELS.includes(ch) ? ch : 'general';
}

const CHAT_COLS = `m.id, m.channel, m.message, m.created_at, m.participant_id,
  m.attachment_url, m.attachment_type, m.attachment_name, p.callsign, p.name`;

// Разрешённый набор реакций
const ALLOWED_REACTIONS = ['👍', '❤️', '😂', '🔥', '👏', '😮', '🫡', '✅'];

// Реакции для набора сообщений: { messageId -> [{ emoji, count, by:[participantId] }] }
function reactionsForMessages(ids) {
  const map = new Map();
  if (!ids.length) return map;
  const placeholders = ids.map(() => '?').join(',');
  const rows = db
    .prepare(
      `SELECT message_id, emoji, participant_id FROM chat_reactions
       WHERE message_id IN (${placeholders})
       ORDER BY id ASC`
    )
    .all(...ids);
  for (const r of rows) {
    if (!map.has(r.message_id)) map.set(r.message_id, new Map());
    const byEmoji = map.get(r.message_id);
    if (!byEmoji.has(r.emoji)) byEmoji.set(r.emoji, []);
    byEmoji.get(r.emoji).push(r.participant_id);
  }
  const out = new Map();
  for (const [mid, byEmoji] of map) {
    out.set(
      mid,
      [...byEmoji.entries()].map(([emoji, by]) => ({ emoji, count: by.length, by }))
    );
  }
  return out;
}

router.get('/chat', requireMember, (req, res) => {
  const channel = normalizeChannel(req.query.channel);
  const rows = db
    .prepare(
      `SELECT ${CHAT_COLS}
       FROM chat_messages m
       JOIN participants p ON p.id = m.participant_id
       WHERE m.channel = ? AND m.id > ?
       ORDER BY m.id ASC
       LIMIT 200`
    )
    .all(channel, Number(req.query.since || 0));
  const rmap = reactionsForMessages(rows.map((r) => r.id));
  for (const row of rows) row.reactions = rmap.get(row.id) || [];
  res.json(rows);
});

// Поставить/снять реакцию (переключатель)
router.post('/chat/:id/reactions', requireMember, (req, res) => {
  const messageId = Number(req.params.id);
  const emoji = String(req.body.emoji || '');
  if (!ALLOWED_REACTIONS.includes(emoji)) {
    return res.status(400).json({ error: 'Недопустимая реакция' });
  }
  const msg = db.prepare('SELECT id FROM chat_messages WHERE id = ?').get(messageId);
  if (!msg) return res.status(404).json({ error: 'Сообщение не найдено' });

  const existing = db
    .prepare('SELECT id FROM chat_reactions WHERE message_id = ? AND participant_id = ? AND emoji = ?')
    .get(messageId, req.member.participantId, emoji);
  if (existing) {
    db.prepare('DELETE FROM chat_reactions WHERE id = ?').run(existing.id);
  } else {
    db.prepare(
      'INSERT INTO chat_reactions (message_id, participant_id, emoji, created_at) VALUES (?, ?, ?, ?)'
    ).run(messageId, req.member.participantId, emoji, new Date().toISOString());
  }

  const reactions = reactionsForMessages([messageId]).get(messageId) || [];
  // eslint-disable-next-line global-require
  require('../realtime').emitReaction(messageId, reactions);
  res.json({ reactions });
});

// Достаём вложение из тела: только наши /uploads, тип image|file
function pickAttachment(body) {
  const a = body && body.attachment;
  if (!a || typeof a.url !== 'string') return { url: '', type: '', name: '' };
  const url = a.url.startsWith('/uploads/') ? a.url : '';
  if (!url) return { url: '', type: '', name: '' };
  const type = a.type === 'image' ? 'image' : 'file';
  const name = String(a.name || '').slice(0, 200);
  return { url, type, name };
}

router.post('/chat', requireMember, (req, res) => {
  const message = String(req.body.message || '').trim();
  const att = pickAttachment(req.body);
  if (!message && !att.url) return res.status(400).json({ error: 'Пустое сообщение' });
  if (message.length > 1000) return res.status(400).json({ error: 'Слишком длинное сообщение' });
  const channel = normalizeChannel(req.body.channel);
  const info = db
    .prepare(
      `INSERT INTO chat_messages
       (participant_id, channel, message, created_at, attachment_url, attachment_type, attachment_name)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(req.member.participantId, channel, message, new Date().toISOString(), att.url, att.type, att.name);
  const id = Number(info.lastInsertRowid);

  // Мгновенная рассылка через WebSocket
  const row = db
    .prepare(
      `SELECT ${CHAT_COLS}
       FROM chat_messages m JOIN participants p ON p.id = m.participant_id
       WHERE m.id = ?`
    )
    .get(id);
  // eslint-disable-next-line global-require
  const realtime = require('../realtime');
  realtime.emitMessage(row);

  // Пуш — всем, кроме автора и тех, кто сейчас онлайн в чате
  // eslint-disable-next-line global-require
  const push = require('../push');
  const exclude = realtime.onlineIds();
  exclude.add(req.member.participantId);
  const chLabel = { general: 'Общий', tactics: 'Тактика', gear: 'Снаряжение', games: 'Игры' }[channel] || channel;
  const body = message || (att.type === 'image' ? '📷 Фото' : '📎 Файл');
  push.sendToParticipants(exclude, {
    title: `«${row.callsign}» в #${chLabel}`,
    body: body.slice(0, 120),
    url: '/cabinet/chat',
    tag: `chat-${channel}`
  }).catch(() => {});

  res.status(201).json({ id });
});

// Сколько непрочитанных сообщений у участника
// (свои сообщения не считаем; учитываем все каналы)
router.get('/chat/unread', requireMember, (req, res) => {
  const row = db
    .prepare(
      `SELECT COUNT(*) AS count
       FROM chat_messages m
       WHERE m.participant_id <> ?
         AND m.id > COALESCE(
           (SELECT r.last_read_id FROM chat_reads r
            WHERE r.participant_id = ? AND r.channel = m.channel),
           0)`
    )
    .get(req.member.participantId, req.member.participantId);
  res.json({ unread: row.count });
});

// Пометить канал прочитанным до lastId
router.post('/chat/mark-read', requireMember, (req, res) => {
  const channel = normalizeChannel(req.body.channel);
  const lastId = Number(req.body.lastId) || 0;
  db.prepare(
    `INSERT INTO chat_reads (participant_id, channel, last_read_id, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(participant_id, channel) DO UPDATE SET
       last_read_id = MAX(last_read_id, excluded.last_read_id),
       updated_at = excluded.updated_at`
  ).run(req.member.participantId, channel, lastId, new Date().toISOString());
  res.json({ ok: true });
});

/* ---------- Пуш-уведомления ---------- */
router.get('/push/key', requireMember, (req, res) => {
  // eslint-disable-next-line global-require
  res.json({ key: require('../push').publicKey() });
});

router.post('/push/subscribe', requireMember, (req, res) => {
  // eslint-disable-next-line global-require
  require('../push').saveSubscription(req.member.participantId, req.body.subscription);
  res.status(201).json({ ok: true });
});

router.post('/push/unsubscribe', requireMember, (req, res) => {
  // eslint-disable-next-line global-require
  require('../push').removeSubscription(req.body.endpoint);
  res.json({ ok: true });
});

/* ---------- RSVP на мероприятия ---------- */
router.get('/rsvps', requireMember, (req, res) => {
  const rows = db
    .prepare(
      `SELECT e.id, e.title, e.date, e.location, e.description, e.image,
              r.status AS my_status
       FROM events e
       LEFT JOIN event_rsvps r ON r.event_id = e.id AND r.participant_id = ?
       ORDER BY e.date`
    )
    .all(req.member.participantId);
  res.json(rows);
});

const RSVP_STATUSES = ['yes', 'no'];

router.put('/rsvps/:eventId', requireMember, (req, res) => {
  const status = String(req.body.status || '').toLowerCase();
  if (!RSVP_STATUSES.includes(status)) {
    return res.status(400).json({ error: 'Недопустимый статус' });
  }
  const ev = db.prepare('SELECT id FROM events WHERE id = ?').get(req.params.eventId);
  if (!ev) return res.status(404).json({ error: 'Мероприятие не найдено' });
  db.prepare(
    `INSERT INTO event_rsvps (event_id, participant_id, status, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(event_id, participant_id) DO UPDATE
       SET status = excluded.status, updated_at = excluded.updated_at`
  ).run(req.params.eventId, req.member.participantId, status, new Date().toISOString());
  res.json({ ok: true });
});

router.delete('/rsvps/:eventId', requireMember, (req, res) => {
  db.prepare('DELETE FROM event_rsvps WHERE event_id = ? AND participant_id = ?').run(
    req.params.eventId,
    req.member.participantId
  );
  res.json({ ok: true });
});

/* ---------- Управление мероприятиями (только для назначенных админом) ---------- */
const EVENT_FIELDS = ['title', 'date', 'location', 'description', 'image'];

function pickEvent(body) {
  const out = {};
  for (const f of EVENT_FIELDS) out[f] = body[f] != null ? String(body[f]) : '';
  return out;
}

router.post('/events', requireMember, ensureEventManager, (req, res) => {
  const data = pickEvent(req.body);
  if (!data.title) return res.status(400).json({ error: 'Укажите название мероприятия' });
  const info = db
    .prepare('INSERT INTO events (title, date, location, description, image) VALUES (?, ?, ?, ?, ?)')
    .run(data.title, data.date, data.location, data.description, data.image);
  const id = Number(info.lastInsertRowid);
  // Оповещаем всех, кроме автора
  // eslint-disable-next-line global-require
  require('../push').notifyNewEvent({ ...data, id }, [req.member.participantId]).catch(() => {});
  res.status(201).json({ id });
});

router.put('/events/:id', requireMember, ensureEventManager, (req, res) => {
  const data = pickEvent(req.body);
  const info = db
    .prepare('UPDATE events SET title = ?, date = ?, location = ?, description = ?, image = ? WHERE id = ?')
    .run(data.title, data.date, data.location, data.description, data.image, req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Мероприятие не найдено' });
  res.json({ ok: true });
});

router.delete('/events/:id', requireMember, ensureEventManager, (req, res) => {
  const info = db.prepare('DELETE FROM events WHERE id = ?').run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Мероприятие не найдено' });
  res.json({ ok: true });
});

/* ---------- Правила (только для участников) ---------- */
router.get('/rules', requireMember, (req, res) => {
  const rows = db.prepare('SELECT slug, title, content FROM rules').all();
  res.json(rows);
});

/* ---------- Акты выполненных работ (мастер) ---------- */
function parseAct(row) {
  let items = [];
  let photos = [];
  try { items = JSON.parse(row.items || '[]'); } catch { items = []; }
  try { photos = JSON.parse(row.photos || '[]'); } catch { photos = []; }
  return { ...row, items, photos };
}

router.get('/acts', requireMember, ensureActsManager, (req, res) => {
  const rows = db.prepare('SELECT * FROM repair_acts ORDER BY id DESC').all();
  res.json(rows.map(parseAct));
});

router.post('/acts', requireMember, ensureActsManager, (req, res) => {
  const client = String(req.body.client || '').trim();
  const device = String(req.body.device || '').trim();
  const note = String(req.body.note || '').trim();
  const items = Array.isArray(req.body.items)
    ? req.body.items
        .map((it) => ({ text: String(it.text || '').trim(), done: !!it.done }))
        .filter((it) => it.text)
    : [];
  const photos = Array.isArray(req.body.photos)
    ? req.body.photos.filter((u) => typeof u === 'string' && u.startsWith('/uploads/'))
    : [];
  if (!device && !client && items.length === 0) {
    return res.status(400).json({ error: 'Заполните хотя бы привод и пункты ремонта' });
  }
  const total = items.filter((it) => it.done).length;
  const info = db
    .prepare(
      `INSERT INTO repair_acts (client, device, items, photos, note, total, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(client, device, JSON.stringify(items), JSON.stringify(photos), note, total, new Date().toISOString());
  res.status(201).json({ id: Number(info.lastInsertRowid) });
});

router.delete('/acts/:id', requireMember, ensureActsManager, (req, res) => {
  const info = db.prepare('DELETE FROM repair_acts WHERE id = ?').run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Акт не найден' });
  res.json({ ok: true });
});

// Скачать акт в Word (.docx)
router.get('/acts/:id/docx', requireMember, ensureActsManager, async (req, res) => {
  const row = db.prepare('SELECT * FROM repair_acts WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Акт не найден' });
  try {
    // eslint-disable-next-line global-require
    const { buildActDocx } = require('../acts-docx');
    const buf = await buildActDocx(parseAct(row));
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );
    res.setHeader('Content-Disposition', `attachment; filename="act-${row.id}.docx"`);
    res.send(buf);
  } catch (err) {
    res.status(500).json({ error: 'Не удалось сформировать документ' });
  }
});

module.exports = router;
