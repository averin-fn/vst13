const fs = require('fs');
const http = require('http');
const path = require('path');
const express = require('express');
const cors = require('cors');

require('./db'); // инициализация БД и сид-данных

const app = express();

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/participants', require('./routes/participants'));
app.use('/api/events', require('./routes/events'));
app.use('/api/feedback', require('./routes/feedback'));
app.use('/api/workshop', require('./routes/workshop'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/member', require('./routes/member'));
app.use('/api/game', require('./routes/game'));
app.use('/api/admin', require('./routes/admin'));

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// В продакшене отдаём собранный клиент (client/dist), если он есть.
// SPA-фолбэк: все не-API маршруты возвращают index.html (react-router).
const clientDist = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get(/^\/(?!api\/|uploads\/).*/, (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

const PORT = process.env.PORT || 4100;
const server = http.createServer(app);
require('./realtime').setup(server); // WebSocket на /api/ws
server.listen(PORT, () => {
  console.log(`Сервер запущен на http://localhost:${PORT}`);
});
