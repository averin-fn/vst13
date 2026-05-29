const BASE = '/api';
const TOKEN_KEY = 'vst13_token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}
export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}
export function isAuthed() {
  return !!getToken();
}

async function request(path, options = {}) {
  const { auth, body, headers, ...rest } = options;
  const finalHeaders = { ...(headers || {}) };

  // FormData отправляем как есть (браузер сам выставит Content-Type с boundary)
  const isForm = body instanceof FormData;
  if (body && !isForm) finalHeaders['Content-Type'] = 'application/json';
  if (auth) {
    const token = getToken();
    if (token) finalHeaders['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(BASE + path, { ...rest, headers: finalHeaders, body });

  if (res.status === 401 && auth) clearToken();

  if (!res.ok) {
    let message = 'Ошибка запроса';
    try {
      const data = await res.json();
      message = data.error || message;
    } catch {
      /* пустой ответ */
    }
    throw new Error(message);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  // ---- публичные ----
  getParticipants: () => request('/participants'),
  getParticipant: (id) => request(`/participants/${id}`),
  getEvents: () => request('/events'),
  getSettings: () => request('/settings'),
  sendFeedback: (payload) => request('/feedback', { method: 'POST', body: JSON.stringify(payload) }),

  // ---- авторизация ----
  login: (username, password) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),

  // ---- админ: участники ----
  createParticipant: (data) =>
    request('/admin/participants', { method: 'POST', auth: true, body: JSON.stringify(data) }),
  updateParticipant: (id, data) =>
    request(`/admin/participants/${id}`, { method: 'PUT', auth: true, body: JSON.stringify(data) }),
  deleteParticipant: (id) =>
    request(`/admin/participants/${id}`, { method: 'DELETE', auth: true }),

  // ---- админ: мероприятия ----
  createEvent: (data) =>
    request('/admin/events', { method: 'POST', auth: true, body: JSON.stringify(data) }),
  updateEvent: (id, data) =>
    request(`/admin/events/${id}`, { method: 'PUT', auth: true, body: JSON.stringify(data) }),
  deleteEvent: (id) => request(`/admin/events/${id}`, { method: 'DELETE', auth: true }),

  // ---- админ: обратная связь ----
  getFeedback: () => request('/admin/feedback', { auth: true }),
  deleteFeedback: (id) => request(`/admin/feedback/${id}`, { method: 'DELETE', auth: true }),

  // ---- админ: настройки сайта ----
  updateSettings: (data) =>
    request('/admin/settings', { method: 'PUT', auth: true, body: JSON.stringify(data) }),

  // ---- загрузка файлов ----
  upload: (file) => {
    const fd = new FormData();
    fd.append('file', file);
    return request('/admin/upload', { method: 'POST', auth: true, body: fd });
  }
};
