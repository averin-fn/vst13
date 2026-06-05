import { useEffect, useRef, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { api, getMemberToken } from '../../api';
import { pushStatus, enablePush, disablePush } from '../../push';

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
  const [online, setOnline] = useState([]);
  const [typing, setTyping] = useState('');
  const [pendingAtt, setPendingAtt] = useState(null); // { url, type, name }
  const [attaching, setAttaching] = useState(false);
  const [push, setPush] = useState('off'); // unsupported|denied|on|off|busy

  const fileInputRef = useRef(null);
  const scrollRef = useRef(null);
  const lastIdRef = useRef(0);
  const channelRef = useRef(channel);
  const inputRef = useRef(null);
  const wsRef = useRef(null);
  const typingTimer = useRef(null);
  const lastTypingSent = useRef(0);
  const meRef = useRef(me);
  meRef.current = me;

  // Добавить новые сообщения (с дедупликацией и обновлением курсора)
  const addMessages = (incoming) => {
    if (!incoming.length) return;
    const maxId = incoming[incoming.length - 1].id;
    if (maxId > lastIdRef.current) lastIdRef.current = maxId;
    setMessages((prev) => {
      const ids = new Set(prev.map((m) => m.id));
      const fresh = incoming.filter((m) => !ids.has(m.id));
      return fresh.length ? [...prev, ...fresh] : prev;
    });
  };

  // Подгрузка истории (старт канала + запасной поллинг)
  const refresh = async () => {
    const ch = channelRef.current;
    try {
      const newer = await api.getChat(ch, lastIdRef.current);
      if (channelRef.current !== ch) return;
      addMessages(newer);
    } catch {
      /* временно потеряли связь — не паникуем */
    }
  };

  // Полный сброс при смене канала + запасной поллинг (на случай обрыва WS)
  useEffect(() => {
    channelRef.current = channel;
    lastIdRef.current = 0;
    setMessages([]);
    setTyping('');
    setError('');
    refresh();
    const t = setInterval(refresh, 15000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel]);

  // WebSocket: мгновенные сообщения, онлайн, «печатает…»
  useEffect(() => {
    let closedByUs = false;
    let reconnectTimer = null;

    const connect = () => {
      const token = getMemberToken();
      if (!token) return;
      const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
      const ws = new WebSocket(`${proto}://${window.location.host}/api/ws?token=${encodeURIComponent(token)}`);
      wsRef.current = ws;

      ws.onmessage = (ev) => {
        let data;
        try {
          data = JSON.parse(ev.data);
        } catch {
          return;
        }
        if (data.type === 'message') {
          const msg = data.message;
          if (msg.channel === channelRef.current) {
            addMessages([msg]);
          } else if (msg.participant_id !== meRef.current?.id) {
            refreshUnread && refreshUnread();
          }
        } else if (data.type === 'presence') {
          setOnline(data.online || []);
        } else if (data.type === 'typing') {
          if (data.channel === channelRef.current && data.participantId !== meRef.current?.id) {
            setTyping(data.callsign || 'кто-то');
            clearTimeout(typingTimer.current);
            typingTimer.current = setTimeout(() => setTyping(''), 2500);
          }
        }
      };

      ws.onclose = () => {
        if (!closedByUs) reconnectTimer = setTimeout(connect, 2500);
      };
    };

    connect();
    return () => {
      closedByUs = true;
      clearTimeout(reconnectTimer);
      clearTimeout(typingTimer.current);
      if (wsRef.current) wsRef.current.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const onDraftChange = (e) => {
    setDraft(e.target.value);
    // Отправляем «печатает…» не чаще раза в 2с
    const now = Date.now();
    if (wsRef.current?.readyState === 1 && now - lastTypingSent.current > 2000) {
      lastTypingSent.current = now;
      wsRef.current.send(
        JSON.stringify({ type: 'typing', channel: channelRef.current, callsign: me?.callsign || '' })
      );
    }
  };

  const pickFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError('');
    setAttaching(true);
    try {
      const { url } = await api.memberUpload(file);
      const type = file.type.startsWith('image/') ? 'image' : 'file';
      setPendingAtt({ url, type, name: file.name });
    } catch (err) {
      setError(err.message || 'Не удалось загрузить файл');
    } finally {
      setAttaching(false);
    }
  };

  const send = async (e) => {
    e.preventDefault();
    const text = draft.trim();
    if ((!text && !pendingAtt) || sending) return;
    setSending(true);
    setError('');
    const att = pendingAtt;
    setDraft('');
    setPendingAtt(null);
    try {
      await api.sendChatMessage(channel, text, att);
    } catch (err) {
      setError(err.message);
      setDraft(text);
      setPendingAtt(att);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  // Статус уведомлений при открытии
  useEffect(() => {
    pushStatus().then(setPush);
  }, []);

  const togglePush = async () => {
    if (push === 'unsupported' || push === 'denied' || push === 'busy') return;
    setPush('busy');
    try {
      if (await pushStatusIsOn()) {
        await disablePush();
        setPush('off');
      } else {
        await enablePush();
        setPush('on');
      }
    } catch (err) {
      setError(err.message || 'Не удалось включить уведомления');
      setPush(await pushStatus());
    }
  };
  const pushStatusIsOn = async () => (await pushStatus()) === 'on';

  const onlineCount = online.length;

  return (
    <div className="admin-page">
      <h1 className="page-title">Чат команды</h1>
      <p className="page-subtitle">
        Сообщения видны только зарегистрированным участникам.
        {onlineCount > 0 && (
          <span className="chat-online"> • {onlineCount} в сети</span>
        )}
      </p>

      {push !== 'unsupported' && (
        <button
          type="button"
          className={`chat-push-btn ${push === 'on' ? 'on' : ''}`}
          onClick={togglePush}
          disabled={push === 'denied' || push === 'busy'}
          title="Уведомления о новых сообщениях"
        >
          {push === 'on' && '🔔 Уведомления включены'}
          {push === 'off' && '🔕 Включить уведомления'}
          {push === 'busy' && '…'}
          {push === 'denied' && '🔕 Уведомления заблокированы в браузере'}
        </button>
      )}

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
                  {m.message && <div className="chat-msg-body">{m.message}</div>}
                  {m.attachment_url &&
                    (m.attachment_type === 'image' ? (
                      <a
                        href={m.attachment_url}
                        target="_blank"
                        rel="noreferrer"
                        className="chat-att-image"
                      >
                        <img src={m.attachment_url} alt={m.attachment_name || 'изображение'} />
                      </a>
                    ) : (
                      <a
                        href={m.attachment_url}
                        target="_blank"
                        rel="noreferrer"
                        download
                        className="chat-att-file"
                      >
                        📎 {m.attachment_name || 'файл'}
                      </a>
                    ))}
                </div>
              );
            })}
          </div>

          <div className="chat-typing">{typing ? `«${typing}» печатает…` : ''}</div>

          {pendingAtt && (
            <div className="chat-att-pending">
              {pendingAtt.type === 'image' ? (
                <img src={pendingAtt.url} alt="" />
              ) : (
                <span className="chat-att-pending-name">📎 {pendingAtt.name}</span>
              )}
              <button type="button" onClick={() => setPendingAtt(null)} aria-label="Убрать">
                ✕
              </button>
            </div>
          )}

          <form className="chat-form" onSubmit={send}>
            <input type="file" ref={fileInputRef} onChange={pickFile} hidden />
            <button
              type="button"
              className="chat-attach-btn"
              onClick={() => fileInputRef.current?.click()}
              disabled={attaching}
              title="Прикрепить файл или фото"
            >
              {attaching ? '…' : '📎'}
            </button>
            <input
              ref={inputRef}
              type="text"
              value={draft}
              onChange={onDraftChange}
              placeholder={`Сообщение в #${CHANNELS.find((c) => c.id === channel)?.label || channel}…`}
              maxLength={1000}
              autoFocus
            />
            <button
              type="submit"
              className="btn btn-primary"
              disabled={sending || (!draft.trim() && !pendingAtt)}
            >
              {sending ? '…' : 'Отправить'}
            </button>
          </form>

          {error && <p className="notice notice-error">{error}</p>}
        </div>
      </div>
    </div>
  );
}
