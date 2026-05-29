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
app.use('/api/settings', require('./routes/settings'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Сервер запущен на http://localhost:${PORT}`);
});
