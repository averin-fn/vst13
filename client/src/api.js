const BASE = '/api';
const TOKEN_KEY = 'vst13_token';
const MEMBER_TOKEN_KEY = 'vst13_member_token';

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

export function getMemberToken() {
  return localStorage.getItem(MEMBER_TOKEN_KEY);
}
export function setMemberToken(token) {
  localStorage.setItem(MEMBER_TOKEN_KEY, token);
}
export function clearMemberToken() {
  localStorage.removeItem(MEMBER_TOKEN_KEY);
}
export function isMemberAuthed() {
  return !!getMemberToken();
}

async function request(path, options = {}) {
  const { auth, memberAuth, body, headers, ...rest } = options;
  const finalHeaders = { ...(headers || {}) };

  // FormData отправляем как есть (браузер сам выставит Content-Type с boundary)
  const isForm = body instanceof FormData;
  if (body && !isForm) finalHeaders['Content-Type'] = 'application/json';
  if (auth) {
    const token = getToken();
    if (token) finalHeaders['Authorization'] = `Bearer ${token}`;
  } else if (memberAuth) {
    const token = getMemberToken();
    if (token) finalHeaders['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(BASE + path, { ...rest, headers: finalHeaders, body });

  if (res.status === 401) {
    if (auth) clearToken();
    if (memberAuth) clearMemberToken();
  }

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
  getEventVotes: (id) => request(`/events/${id}/rsvps`),
  getSettings: () => request('/settings'),
  sendFeedback: (payload) => request('/feedback', { method: 'POST', body: JSON.stringify(payload) }),

  // ---- авторизация (админ) ----
  login: (username, password) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),

  // ---- админ: участники ----
  getAdminParticipant: (id) => request(`/admin/participants/${id}`, { auth: true }),
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

  // ---- админ: загрузка файлов ----
  upload: (file) => {
    const fd = new FormData();
    fd.append('file', file);
    return request('/admin/upload', { method: 'POST', auth: true, body: fd });
  },

  // ---- личный кабинет участника ----
  memberLogin: (username, password) =>
    request('/member/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  getMe: () => request('/member/me', { memberAuth: true }),
  updateMe: (data) =>
    request('/member/me', { method: 'PUT', memberAuth: true, body: JSON.stringify(data) }),
  memberUpload: (file) => {
    const fd = new FormData();
    fd.append('file', file);
    return request('/member/upload', { method: 'POST', memberAuth: true, body: fd });
  },

  // чат
  getChat: (channel = 'general', since = 0) =>
    request(`/member/chat?channel=${encodeURIComponent(channel)}&since=${since}`, { memberAuth: true }),
  sendChatMessage: (channel, message) =>
    request('/member/chat', {
      method: 'POST',
      memberAuth: true,
      body: JSON.stringify({ channel, message })
    }),

  // RSVP
  getMyRsvps: () => request('/member/rsvps', { memberAuth: true }),
  setMyRsvp: (eventId, status) =>
    request(`/member/rsvps/${eventId}`, { method: 'PUT', memberAuth: true, body: JSON.stringify({ status }) }),
  clearMyRsvp: (eventId) =>
    request(`/member/rsvps/${eventId}`, { method: 'DELETE', memberAuth: true }),

  // смена пароля
  changeMyPassword: (currentPassword, newPassword) =>
    request('/member/password', {
      method: 'POST',
      memberAuth: true,
      body: JSON.stringify({ currentPassword, newPassword })
    }),

  // админ: RSVP по мероприятию
  getEventRsvps: (id) => request(`/admin/events/${id}/rsvps`, { auth: true })
};
