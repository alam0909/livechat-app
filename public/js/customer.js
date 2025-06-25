let socket;
let userData = {};

function startChat() {
  const name = document.getElementById('name').value.trim();
  const company = document.getElementById('company').value.trim();
  const sid = document.getElementById('sid').value.trim();
  if (!name || !company || !sid) {
    alert("Mohon isi semua kolom!");
    return;
  }

  userData = { name, company, sid };

  document.getElementById('user-info-form').style.display = 'none';
  document.getElementById('chat-area').style.display = 'flex';

  socket = io();

  socket.emit('register', {
    userId: null,
    role: 'user',
    ...userData
  });

  socket.on('chat_message', (m) => {
    appendMsg(m);
    saveToLocal(m);
  });

  socket.on('history', msgs => {
    msgs.forEach(m => {
      appendMsg(m);
      saveToLocal(m);
    });
  });

  loadLocalChat();
}

function send() {
  const msgInput = document.getElementById('msg');
  const msg = msgInput.value.trim();
  if (!msg || !socket) return;

  const message = {
    sender: 'user',
    message: msg
  };

  socket.emit('chat_message', message);
  appendMsg(message);
  saveToLocal(message);
  msgInput.value = '';
}

function appendMsg(m) {
  const chat = document.getElementById('chat');
  const div = document.createElement('div');
  div.className = m.sender;
  div.textContent = `${m.sender === 'admin' ? 'Admin' : 'Anda'}: ${m.message}`;
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;

  // Play beep if message from admin
  if (m.sender === 'admin') {
    const beep = document.getElementById('chatBeep');
    if (beep) {
      beep.play().catch((e) => {
        console.warn('Gagal memutar beep:', e);
      });
    }
  }
}

// Simpan chat ke localStorage
function saveToLocal(m) {
  const chatData = JSON.parse(localStorage.getItem('chat_data') || '[]');
  chatData.push(m);
  localStorage.setItem('chat_data', JSON.stringify(chatData));
}

// Tampilkan kembali chat dari localStorage saat reload
function loadLocalChat() {
  const saved = JSON.parse(localStorage.getItem('chat_data') || '[]');
  saved.forEach(appendMsg);
}
