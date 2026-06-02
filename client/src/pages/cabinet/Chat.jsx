import { useEffect, useRef, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { api } from '../../api';

const CHANNELS = [
  { id: 'general', label: 'Общий' },
  { id: 'tactics', label: 'Тактика' },
  { id: 'gear', label: 'Снаряжение' },
  { id: 'games', label: 'Игры' }
];

function formatTime(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export default function CabinetChat() {
  const { me, refreshUnread } = useOutletContext();
  const [channel, setChannel] = useState('general');
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const scrollRef = useRef(null);
  const lastIdRef = useRef(0);
  const channelRef = useRef(channel);

  // Подгружаем новые сообщения текущего канала
  const refresh = async () => {
    const ch = channelRef.current;
    try {
      const newer = await api.getChat(ch, lastIdRef.current);
      // На случай быстрого переключения канала во время запроса
      if (channelRef.current !== ch) return;
      if (newer.length === 0) return;
      const maxId = newer[newer.length - 1].id;
      if (maxId > lastIdRef.current) lastIdRef.current = maxId;
      setMessages((prev) => {
        const ids = new Set(prev.map((m) => m.id));
        const fresh = newer.filter((m) => !ids.has(m.id));
        return fresh.length ? [...prev, ...fresh] : prev;
      });
    } catch {
      /* временно потеряли связь — не паникуем */
    }
  };

  // Полный сброс при смене канала + поллинг каждые 5с
  useEffect(() => {
    channelRef.current = channel;
    lastIdRef.current = 0;
    setMessages([]);
    setError('');
    refresh();
    const t = setInterval(refresh, 5000);
    return () => clearInterval(t);
  }, [channel]);

  // Прокрутка вниз при появлении новых сообщений
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  // Помечаем канал прочитанным до последнего видимого сообщения
  useEffect(() => {
    if (messages.length === 0) return;
    const lastId = messages[messages.length - 1].id;
    api
      .markChatRead(channel, lastId)
      .then(() => refreshUnread && refreshUnread())
      .catch(() => {});
  }, [messages, channel, refreshUnread]);

  const send = async (e) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    setError('');
    try {
      await api.sendChatMessage(channel, text);
      setDraft('');
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="admin-page">
      <h1 className="page-title">Чат команды</h1>
      <p className="page-subtitle">Сообщения видны только зарегистрированным участникам.</p>

      <div className="chat-layout">
        <div className="chat-channels">
          {CHANNELS.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`chat-channel ${channel === c.id ? 'active' : ''}`}
              onClick={() => setChannel(c.id)}
            >
              # {c.label}
            </button>
          ))}
        </div>

        <div className="chat-main">
          <div className="chat" ref={scrollRef}>
            {messages.length === 0 && (
              <p className="chat-empty">В этом канале пока пусто — напишите первое сообщение.</p>
            )}
            {messages.map((m) => {
              const own = me && m.participant_id === me.id;
              return (
                <div key={m.id} className={`chat-msg ${own ? 'chat-msg-own' : ''}`}>
                  <div className="chat-msg-head">
                    <span className="chat-msg-callsign">«{m.callsign}»</span>
                    <span className="chat-msg-name">{m.name}</span>
                    <span className="chat-msg-time">{formatTime(m.created_at)}</span>
                  </div>
                  <div className="chat-msg-body">{m.message}</div>
                </div>
              );
            })}
          </div>

          <form className="chat-form" onSubmit={send}>
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={`Сообщение в #${CHANNELS.find((c) => c.id === channel)?.label || channel}…`}
              maxLength={1000}
              disabled={sending}
            />
            <button type="submit" className="btn btn-primary" disabled={sending || !draft.trim()}>
              {sending ? '…' : 'Отправить'}
            </button>
          </form>

          {error && <p className="notice notice-error">{error}</p>}
        </div>
      </div>
    </div>
  );
}
