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
  getEventVotes: (id) => request(`/events/${id}/rsvps`, { memberAuth: true }),
  getSettings: () => request('/settings'),
  sendFeedback: (payload) => request('/feedback', { method: 'POST', body: JSON.stringify(payload) }),

  // ---- мастерская ----
  getWorks: () => request('/workshop/works'),
  sendRepair: (payload) => request('/workshop/repair', { method: 'POST', body: JSON.stringify(payload) }),
  uploadRepairPhoto: (file) => {
    const fd = new FormData();
    fd.append('file', file);
    return request('/workshop/upload', { method: 'POST', body: fd });
  },

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
  setEventRoster: (id, roster) =>
    request(`/admin/events/${id}/roster`, { method: 'PUT', auth: true, body: JSON.stringify({ roster }) }),

  // ---- админ: обратная связь ----
  getFeedback: () => request('/admin/feedback', { auth: true }),
  deleteFeedback: (id) => request(`/admin/feedback/${id}`, { method: 'DELETE', auth: true }),

  // ---- админ: мастерская ----
  getRepairRequests: () => request('/admin/repair', { auth: true }),
  deleteRepairRequest: (id) => request(`/admin/repair/${id}`, { method: 'DELETE', auth: true }),
  createWork: (data) =>
    request('/admin/workshop/works', { method: 'POST', auth: true, body: JSON.stringify(data) }),
  deleteWork: (id) => request(`/admin/workshop/works/${id}`, { method: 'DELETE', auth: true }),

  // ---- админ: планировщик ----
  getPlanner: () => request('/admin/planner', { auth: true }),
  savePlanner: (board) =>
    request('/admin/planner', { method: 'PUT', auth: true, body: JSON.stringify(board) }),

  // ---- админ: настройки сайта ----
  updateSettings: (data) =>
    request('/admin/settings', { method: 'PUT', auth: true, body: JSON.stringify(data) }),

  // ---- админ: смена пароля ----
  changeAdminPassword: (currentPassword, newPassword) =>
    request('/admin/change-password', {
      method: 'POST',
      auth: true,
      body: JSON.stringify({ currentPassword, newPassword })
    }),

  // ---- админ: загрузка файлов ----
  upload: (file) => {
    const fd = new FormData();
    fd.append('file', file);
    return request('/admin/upload', { method: 'POST', auth: true, body: fd });
  },

  // ---- админ: экспорт базы (скачивание SQLite-файла) ----
  exportDb: async () => {
    const token = getToken();
    const res = await fetch(BASE + '/admin/export', {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    if (res.status === 401) {
      clearToken();
      throw new Error('Требуется авторизация администратора');
    }
    if (!res.ok) throw new Error('Не удалось экспортировать базу');
    const blob = await res.blob();
    const cd = res.headers.get('Content-Disposition') || '';
    const m = /filename="?([^"]+)"?/.exec(cd);
    return { blob, filename: m ? m[1] : 'vst13-backup.db' };
  },

  // ---- личный кабинет участника ----
  memberLogin: (username, password) =>
    request('/member/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  getMe: () => request('/member/me', { memberAuth: true }),
  // Участник-админ получает админ-токен прямо из кабинета
  getAdminToken: () => request('/member/admin-token', { method: 'POST', memberAuth: true }),
  updateMe: (data) =>
    request('/member/me', { method: 'PUT', memberAuth: true, body: JSON.stringify(data) }),
  memberUpload: (file) => {
    const fd = new FormData();
    fd.append('file', file);
    return request('/member/upload', { method: 'POST', memberAuth: true, body: fd });
  },

  // управление мероприятиями (для участников с правом)
  memberCreateEvent: (data) =>
    request('/member/events', { method: 'POST', memberAuth: true, body: JSON.stringify(data) }),
  memberUpdateEvent: (id, data) =>
    request(`/member/events/${id}`, { method: 'PUT', memberAuth: true, body: JSON.stringify(data) }),
  memberDeleteEvent: (id) =>
    request(`/member/events/${id}`, { method: 'DELETE', memberAuth: true }),

  // правила (только для участников)
  getRules: () => request('/member/rules', { memberAuth: true }),

  // админ: редактирование правил
  getAdminRules: () => request('/admin/rules', { auth: true }),
  updateRule: (slug, content) =>
    request(`/admin/rules/${slug}`, { method: 'PUT', auth: true, body: JSON.stringify({ content }) }),

  // чат
  getChat: (channel = 'general', since = 0) =>
    request(`/member/chat?channel=${encodeURIComponent(channel)}&since=${since}`, { memberAuth: true }),
  sendChatMessage: (channel, message, attachment = null, replyTo = 0) =>
    request('/member/chat', {
      method: 'POST',
      memberAuth: true,
      body: JSON.stringify({ channel, message, attachment, replyTo })
    }),
  toggleReaction: (messageId, emoji) =>
    request(`/member/chat/${messageId}/reactions`, {
      method: 'POST',
      memberAuth: true,
      body: JSON.stringify({ emoji })
    }),
  getUnreadChat: () => request('/member/chat/unread', { memberAuth: true }),
  markChatRead: (channel, lastId) =>
    request('/member/chat/mark-read', {
      method: 'POST',
      memberAuth: true,
      body: JSON.stringify({ channel, lastId })
    }),

  // пуш-уведомления
  getPushKey: () => request('/member/push/key', { memberAuth: true }),
  subscribePush: (subscription) =>
    request('/member/push/subscribe', {
      method: 'POST',
      memberAuth: true,
      body: JSON.stringify({ subscription })
    }),
  unsubscribePush: (endpoint) =>
    request('/member/push/unsubscribe', {
      method: 'POST',
      memberAuth: true,
      body: JSON.stringify({ endpoint })
    }),

  // ---- акты выполненных работ (мастер) ----
  getActs: () => request('/member/acts', { memberAuth: true }),
  createAct: (data) =>
    request('/member/acts', { method: 'POST', memberAuth: true, body: JSON.stringify(data) }),
  deleteAct: (id) => request(`/member/acts/${id}`, { method: 'DELETE', memberAuth: true }),
  downloadActDocx: async (id) => {
    const token = getMemberToken();
    const res = await fetch(`${BASE}/member/acts/${id}/docx`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    if (!res.ok) throw new Error('Не удалось сформировать документ');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Акт-${id}.docx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },

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
