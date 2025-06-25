const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');

// Gunakan PORT dari env (Railway, Fly.io)
const PORT = process.env.PORT || 3000;

// 1. Sajikan semua file statis dari public/
app.use(express.static(path.join(__dirname, 'public')));

// 2. Arahkan route '/' ke customer.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'customer.html'));
});

let admins = new Set();
let chats = {};    // { user_id: [ { sender, message } ] }
let userInfo = {}; // { user_id: { name, company, sid } }

io.on('connection', (socket) => {
  let userId = null;
  let role = null;

  socket.on('register', (data) => {
    role = data.role;
    userId = data.userId || socket.id;

    if (role === 'admin') {
      admins.add(socket);
      console.log(`[ADMIN] Admin terhubung`);

      for (const uid in userInfo) {
        socket.emit('user_info', { user_id: uid, ...userInfo[uid] });
      }

    } else if (role === 'user') {
      userId = socket.id;
      userInfo[userId] = {
        name: data.name,
        company: data.company,
        sid: data.sid
      };
      chats[userId] = chats[userId] || [];

      console.log(`[USER] ${data.name} (${userId}) terhubung`);

      for (let admin of admins) {
        admin.emit('user_info', {
          user_id: userId,
          name: data.name,
          company: data.company,
          sid: data.sid
        });
      }

      // Pesan sambutan otomatis
      const welcome = 'Selamat datang di customer service Road Maintenance. Ada yang bisa kami bantu?';
      chats[userId].push({ sender: 'admin', message: welcome });
      socket.emit('chat_message', { sender: 'admin', message: welcome });

      if (admins.size === 0) {
        const msg = "Saat ini admin sedang offline. Kami akan membalas secepatnya.";
        chats[userId].push({ sender: 'admin', message: msg });
        socket.emit('chat_message', { sender: 'admin', message: msg });
      }
    }
  });

  socket.on('chat_message', (data) => {
    if (!userId || !data.message) return;

    const msg = {
      sender: data.sender,
      message: data.message,
      user_id: data.user_id || userId
    };

    chats[msg.user_id] = chats[msg.user_id] || [];
    chats[msg.user_id].push(msg);

    if (role === 'user') {
      for (let admin of admins) {
        admin.emit('chat_message', msg);
      }
    }

    if (role === 'admin') {
      const target = io.sockets.sockets.get(msg.user_id);
      if (target) {
        target.emit('chat_message', msg);
      }
    }
  });

  socket.on('select_user', (uid) => {
    if (role === 'admin') {
      socket.emit('history', chats[uid] || []);
    }
  });

  socket.on('delete_history', (uid) => {
    if (role === 'admin') {
      delete chats[uid];

      const target = io.sockets.sockets.get(uid);
      if (target) {
        target.emit('history_deleted', { user_id: uid });
      }
      for (let admin of admins) {
        admin.emit('history_deleted', { user_id: uid });
      }
    }
  });

  socket.on('disconnect', () => {
    if (role === 'admin') {
      admins.delete(socket);
      console.log('[ADMIN] Admin disconnect');
    } else if (role === 'user') {
      console.log(`[USER] ${userId} disconnect`);
    }
  });
});

// Fallback 404 jika file/rute tidak ada
app.use((req, res) => {
  res.status(404).send('Not found');
});

http.listen(PORT, () => {
  console.log(`💬 Live chat running on port ${PORT}`);
});
