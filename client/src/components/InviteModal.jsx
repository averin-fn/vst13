import { useEffect, useState } from 'react';

const EMPTY = { callsign: '', location: '', datetime: '', link: '' };

function formatDateTime(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export default function InviteModal({ open, onClose }) {
  const [form, setForm] = useState(EMPTY);
  const [copied, setCopied] = useState(false);

  // Сброс при открытии/закрытии
  useEffect(() => {
    if (!open) {
      setForm(EMPTY);
      setCopied(false);
    }
  }, [open]);

  // Закрытие по Escape
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const update = (field) => (e) => {
    setForm({ ...form, [field]: e.target.value });
    setCopied(false);
  };

  const buildText = () => {
    const lines = ['Приглашение на игру — ВСТ13'];
    if (form.callsign) lines.push(`Позывной: ${form.callsign}`);
    if (form.location) lines.push(`Дислокация: ${form.location}`);
    if (form.datetime) lines.push(`Дата и время: ${formatDateTime(form.datetime)}`);
    if (form.link) lines.push(`Ссылка: ${form.link}`);
    return lines.join('\n');
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(buildText());
    } catch {
      /* буфер может быть недоступен — всё равно показываем подтверждение */
    }
    setCopied(true);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="modal-head">
          <h3>Пригласить на игру</h3>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Закрыть">
            ×
          </button>
        </div>

        <div className="modal-body">
          <label className="field">
            <span>Позывной</span>
            <input value={form.callsign} onChange={update('callsign')} placeholder="Кого приглашаете" />
          </label>
          <label className="field">
            <span>Дислокация</span>
            <input value={form.location} onChange={update('location')} placeholder="Полигон, адрес" />
          </label>
          <label className="field">
            <span>Дата и время</span>
            <input type="datetime-local" value={form.datetime} onChange={update('datetime')} />
          </label>
          <label className="field">
            <span>Ссылка</span>
            <input type="url" value={form.link} onChange={update('link')} placeholder="https://..." />
          </label>
        </div>

        <div className="modal-actions">
          <button type="button" className="btn btn-primary" onClick={copy}>
            {copied ? 'Скопировано ✓' : 'Скопировать приглашение'}
          </button>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}
