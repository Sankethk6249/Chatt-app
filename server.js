require('dotenv').config();
const http = require('http');
const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { WebSocketServer, WebSocket } = require('ws');

const authRoutes = require('./routes/auth');
const messageRoutes = require('./routes/messages');
const Message = require('./models/Message');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/auth', authRoutes);
app.use('/api/messages', messageRoutes);

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

function broadcast(data) {
  const payload = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) client.send(payload);
  });
}

function broadcastOnlineUsers() {
  const users = [...wss.clients]
    .filter((c) => c.readyState === WebSocket.OPEN && c.username)
    .map((c) => c.username);
  broadcast({ type: 'online', users: [...new Set(users)] });
}

wss.on('connection', (ws, req) => {
  // Authenticate using JWT passed as ?token=...
  const url = new URL(req.url, 'http://localhost');
  const token = url.searchParams.get('token');

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    ws.username = decoded.username;
  } catch (err) {
    ws.close(4001, 'Unauthorized');
    return;
  }

  broadcastOnlineUsers();

  ws.on('message', async (raw) => {
    try {
      const data = JSON.parse(raw);
      const text = String(data.text || '').trim();
      if (!text) return;

      const msg = await Message.create({
        username: ws.username,
        text: text.slice(0, 1000),
      });

      broadcast({
        type: 'message',
        username: msg.username,
        text: msg.text,
        createdAt: msg.createdAt,
      });
    } catch (err) {
      console.error('Message error:', err.message);
    }
  });

  ws.on('close', broadcastOnlineUsers);
});

const PORT = process.env.PORT || 3000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');
    server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error('MongoDB connection failed:', err.message);
    process.exit(1);
  });