const socket = io();
const chat = document.getElementById('chat');
const inp = document.getElementById('msg');
const userList = document.getElementById('userList');
const beep = document.getElementById('chatBeep');

let currentUser = null;
const userData = {};

// === 1. Daftarkan sebagai admin ===
socket.emit('register', { userId: null, role: 'admin' });
console.log('[ADMIN] Socket registered');

// === 2. Terima info user lengkap ===
socket.on('user_info', data => {
  userData[data.user_id] = {
    name: data.name,
    company: data.company,
    sid: data.sid
  };

  const btn = document.getElementById(data.user_id);
  if (btn) {
    btn.innerHTML = `<strong>${data.name}</strong><br><small>${data.company} | SID: ${data.sid}</small>`;
  }
});

// === 3. Riwayat chat saat pilih user ===
socket.on('history', msgs => {
  if (!currentUser) {
    chat.innerHTML = '<em>Pilih user</em>';
    return;
  }
  chat.innerHTML = '';
  msgs.forEach(m => {
    appendMsg(m);
    saveToLocal(currentUser, m);
  });
});

// === 4. Terima pesan baru ===
socket.on('chat_message', m => {
  addUser(m.user_id);
  if (m.user_id === currentUser) {
    appendMsg(m);
    saveToLocal(currentUser, m);
  }
  if (m.sender === 'user') {
    beep.play().catch(() => {});
  }
});

// === 5. Riwayat chat dihapus ===
socket.on('history_deleted', info => {
  if (info.user_id === currentUser) {
    chat.innerHTML = '';
    appendSys('Riwayat telah dihapus.');
    localStorage.removeItem('chat_' + currentUser);
  }
  removeUser(info.user_id);
});

// === 6. Kirim pesan ===
function send() {
  const msg = inp.value.trim();
  if (!msg || !currentUser) return;

  const message = {
    sender: 'admin',
    user_id: currentUser,
    message: msg
  };

  socket.emit('chat_message', message);
  appendMsg(message);
  saveToLocal(currentUser, message);
  inp.value = '';
}

// === 7. Tampilkan pesan di chatbox ===
function appendMsg(m) {
  const div = document.createElement('div');
  div.className = m.sender;
  div.textContent = `${m.sender === 'admin' ? 'Anda' : 'User'}: ${m.message}`;
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
}

// === 8. Pesan sistem (italic) ===
function appendSys(txt) {
  const div = document.createElement('div');
  div.className = 'admin';
  div.style.fontStyle = 'italic';
  div.textContent = txt;
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
}

// === 9. Tambahkan user ke daftar ===
function addUser(uid) {
  if (document.getElementById(uid)) return;

  const btn = document.createElement('button');
  btn.id = uid;
  btn.className = 'user-btn';
  btn.style.marginBottom = '8px';

  const info = userData[uid];
  if (info) {
    btn.innerHTML = `<strong>${info.name}</strong><br><small>${info.company} | SID: ${info.sid}</small>`;
  } else {
    btn.textContent = 'Pengguna ' + uid.slice(-4);
  }

  btn.onclick = () => selectUser(uid);
  userList.appendChild(btn);
}

// === 10. Pilih user untuk chat ===
function selectUser(uid) {
  if (uid === currentUser) return;
  currentUser = uid;
  chat.innerHTML = '<em>Memuat riwayat chat...</em>';
  socket.emit('select_user', uid);
  loadLocalChat(uid);
}

// === 11. Hapus user dari daftar ===
function removeUser(uid) {
  document.getElementById(uid)?.remove();
  if (uid === currentUser) {
    currentUser = null;
    chat.innerHTML = '<em>Chat kosong atau user keluar.</em>';
  }
}

// === 12. Hapus riwayat chat ===
function del() {
  if (!currentUser) return;
  if (confirm('Yakin ingin menghapus semua chat user ini?')) {
    socket.emit('delete_history', currentUser);
    localStorage.removeItem('chat_' + currentUser);
    chat.innerHTML = '<em>Riwayat dihapus.</em>';
  }
}

// === 13. Simpan ke localStorage ===
function saveToLocal(uid, message) {
  const key = 'chat_' + uid;
  const messages = JSON.parse(localStorage.getItem(key) || '[]');
  messages.push(message);
  localStorage.setItem(key, JSON.stringify(messages));
}

// === 14. Muat dari localStorage ===
function loadLocalChat(uid) {
  const saved = localStorage.getItem('chat_' + uid);
  if (saved) {
    chat.innerHTML = '';
    const messages = JSON.parse(saved);
    messages.forEach(appendMsg);
  } else {
    chat.innerHTML = '<em>Belum ada chat.</em>';
  }
}
