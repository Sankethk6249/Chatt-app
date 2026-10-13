const authScreen = document.getElementById('auth-screen');
const chatScreen = document.getElementById('chat-screen');
const authTitle = document.getElementById('auth-title');
const authBtn = document.getElementById('auth-btn');
const toggleText = document.getElementById('toggle-text');
const toggleLink = document.getElementById('toggle-link');
const authError = document.getElementById('auth-error');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const messagesEl = document.getElementById('messages');
const chatForm = document.getElementById('chat-form');
const messageInput = document.getElementById('message-input');
const meEl = document.getElementById('me');
const onlineCount = document.getElementById('online-count');
const logoutBtn = document.getElementById('logout-btn');

let mode = 'login';
let token = localStorage.getItem('token');
let myName = localStorage.getItem('username');
let ws;

toggleLink.addEventListener('click', (e) => {
  e.preventDefault();
  mode = mode === 'login' ? 'register' : 'login';
  authTitle.textContent = mode === 'login' ? 'Login' : 'Register';
  authBtn.textContent = mode === 'login' ? 'Login' : 'Register';
  toggleText.textContent = mode === 'login' ? 'No account?' : 'Already have an account?';
  toggleLink.textContent = mode === 'login' ? 'Register' : 'Login';
  authError.textContent = '';
});

authBtn.addEventListener('click', async () => {
  authError.textContent = '';
  try {
    const res = await fetch(`/api/auth/${mode}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: usernameInput.value.trim(),
        password: passwordInput.value,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Something went wrong');

    token = data.token;
    myName = data.username;
    localStorage.setItem('token', token);
    localStorage.setItem('username', myName);
    startChat();
  } catch (err) {
    authError.textContent = err.message;
  }
});

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function addMessage({ username, text, createdAt }) {
  const div = document.createElement('div');
  div.className = 'msg' + (username === myName ? ' mine' : '');

  const meta = document.createElement('div');
  meta.className = 'meta';
  meta.textContent = `${username} • ${formatTime(createdAt)}`;

  const body = document.createElement('div');
  body.textContent = text; // textContent prevents XSS

  div.append(meta, body);
  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

async function loadHistory() {
  const res = await fetch('/api/messages', { headers: { Authorization: `Bearer ${token}` } });
  if (res.status === 401) return logout();
  const history = await res.json();
  messagesEl.innerHTML = '';
  history.forEach(addMessage);
}

function connectSocket() {
  const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
  ws = new WebSocket(`${protocol}://${location.host}?token=${token}`);

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === 'message') addMessage(data);
    if (data.type === 'online') onlineCount.textContent = `${data.users.length} online`;
  };

  ws.onclose = (event) => {
    if (event.code === 4001) return logout();
    if (token) setTimeout(connectSocket, 2000); // auto-reconnect
  };
}

async function startChat() {
  authScreen.classList.add('hidden');
  chatScreen.classList.remove('hidden');
  meEl.textContent = myName;
  await loadHistory();
  connectSocket();
}

chatForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = messageInput.value.trim();
  if (!text || !ws || ws.readyState !== WebSocket.OPEN) return;
  ws.send(JSON.stringify({ text }));
  messageInput.value = '';
});

function logout() {
  token = null;
  localStorage.removeItem('token');
  localStorage.removeItem('username');
  if (ws) ws.close();
  chatScreen.classList.add('hidden');
  authScreen.classList.remove('hidden');
}

logoutBtn.addEventListener('click', logout);

if (token) startChat();