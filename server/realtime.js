// Realtime-слой чата на WebSocket.
// Авторизация участника по member-токену (query ?token=...).
// Транслирует новые сообщения, статус «онлайн» и «печатает…».
const { WebSocketServer } = require('ws');
const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'vst13-dev-secret-change-me';

let wss = null;
const clients = new Set(); // ws.member = { participantId, username, callsign }

function setup(server) {
  wss = new WebSocketServer({ server, path: '/api/ws' });

  wss.on('connection', (ws, req) => {
    let decoded = null;
    try {
      const url = new URL(req.url, 'http://localhost');
      decoded = jwt.verify(url.searchParams.get('token') || '', SECRET);
    } catch {
      /* невалидный токен */
    }
    if (!decoded || decoded.type !== 'member') {
      ws.close(4001, 'unauthorized');
      return;
    }

    ws.member = { participantId: decoded.participantId, username: decoded.username };
    ws.isAlive = true;
    clients.add(ws);
    sendPresence();

    ws.on('message', (raw) => {
      let msg;
      try {
        msg = JSON.parse(raw);
      } catch {
        return;
      }
      if (msg.type === 'typing') {
        broadcast(
          {
            type: 'typing',
            channel: msg.channel,
            participantId: ws.member.participantId,
            callsign: msg.callsign || ''
          },
          ws
        );
      }
    });

    ws.on('pong', () => {
      ws.isAlive = true;
    });
    ws.on('close', () => {
      clients.delete(ws);
      sendPresence();
    });
  });

  // Heartbeat: отключаем «мёртвые» соединения
  const interval = setInterval(() => {
    for (const ws of clients) {
      if (!ws.isAlive) {
        ws.terminate();
        clients.delete(ws);
        continue;
      }
      ws.isAlive = false;
      try {
        ws.ping();
      } catch {
        /* игнор */
      }
    }
  }, 30000);
  wss.on('close', () => clearInterval(interval));
}

function broadcast(payload, except) {
  const data = JSON.stringify(payload);
  for (const ws of clients) {
    if (ws.readyState === 1 && ws !== except) {
      try {
        ws.send(data);
      } catch {
        /* игнор */
      }
    }
  }
}

function sendPresence() {
  const online = [...new Set([...clients].map((ws) => ws.member.participantId))];
  broadcast({ type: 'presence', online });
}

// Вызывается из роутов при новом сообщении
function emitMessage(message) {
  broadcast({ type: 'message', message });
}

module.exports = { setup, emitMessage };
