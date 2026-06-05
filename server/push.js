// Web Push: VAPID-ключи + отправка уведомлений подписчикам.
// Ключи берём из env (VAPID_PUBLIC/VAPID_PRIVATE/VAPID_SUBJECT),
// иначе генерируем один раз и сохраняем в server/vapid.json (вне git).
const fs = require('fs');
const path = require('path');
const webpush = require('web-push');
const db = require('./db');

const SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@vst13.local';
const KEYS_FILE = path.join(__dirname, 'vapid.json');

function loadKeys() {
  if (process.env.VAPID_PUBLIC && process.env.VAPID_PRIVATE) {
    return { publicKey: process.env.VAPID_PUBLIC, privateKey: process.env.VAPID_PRIVATE };
  }
  try {
    return JSON.parse(fs.readFileSync(KEYS_FILE, 'utf8'));
  } catch {
    const keys = webpush.generateVAPIDKeys();
    try {
      fs.writeFileSync(KEYS_FILE, JSON.stringify(keys), { mode: 0o600 });
    } catch {
      /* не критично, ключи проживут до перезапуска */
    }
    return keys;
  }
}

const keys = loadKeys();
webpush.setVapidDetails(SUBJECT, keys.publicKey, keys.privateKey);

function publicKey() {
  return keys.publicKey;
}

function saveSubscription(participantId, sub) {
  if (!sub || !sub.endpoint || !sub.keys) return;
  db.prepare(
    `INSERT INTO push_subscriptions (participant_id, endpoint, p256dh, auth, created_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(endpoint) DO UPDATE SET
       participant_id = excluded.participant_id,
       p256dh = excluded.p256dh,
       auth = excluded.auth`
  ).run(participantId, sub.endpoint, sub.keys.p256dh || '', sub.keys.auth || '', new Date().toISOString());
}

function removeSubscription(endpoint) {
  if (!endpoint) return;
  db.prepare('DELETE FROM push_subscriptions WHERE endpoint = ?').run(endpoint);
}

// Отправить уведомление участникам, КРОМЕ исключённых id (например, автор + онлайн).
async function sendToParticipants(excludeIds, payload) {
  const exclude = excludeIds instanceof Set ? excludeIds : new Set(excludeIds || []);
  const rows = db.prepare('SELECT id, participant_id, endpoint, p256dh, auth FROM push_subscriptions').all();
  const data = JSON.stringify(payload);
  await Promise.all(
    rows.map(async (r) => {
      if (exclude.has(r.participant_id)) return;
      const subscription = { endpoint: r.endpoint, keys: { p256dh: r.p256dh, auth: r.auth } };
      try {
        await webpush.sendNotification(subscription, data);
      } catch (err) {
        // Подписка протухла — удаляем
        if (err && (err.statusCode === 404 || err.statusCode === 410)) {
          db.prepare('DELETE FROM push_subscriptions WHERE id = ?').run(r.id);
        }
      }
    })
  );
}

module.exports = { publicKey, saveSubscription, removeSubscription, sendToParticipants };
