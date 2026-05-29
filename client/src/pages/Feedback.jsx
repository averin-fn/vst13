import { useState } from 'react';
import { api } from '../api';

const EMPTY = { name: '', contact: '', message: '' };

export default function Feedback() {
  const [form, setForm] = useState(EMPTY);
  const [status, setStatus] = useState('idle'); // idle | sending | sent | error
  const [error, setError] = useState('');

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    setStatus('sending');
    setError('');
    try {
      await api.sendFeedback(form);
      setForm(EMPTY);
      setStatus('sent');
    } catch (err) {
      setError(err.message);
      setStatus('error');
    }
  };

  return (
    <div className="page">
      <h1 className="page-title">Обратная связь</h1>
      <p className="page-subtitle">
        Хотите вступить в команду или задать вопрос? Напишите нам.
      </p>

      <form className="feedback-form card" onSubmit={onSubmit}>
        <label className="field">
          <span>Имя *</span>
          <input
            type="text"
            value={form.name}
            onChange={update('name')}
            required
            placeholder="Как к вам обращаться"
          />
        </label>

        <label className="field">
          <span>Контакт</span>
          <input
            type="text"
            value={form.contact}
            onChange={update('contact')}
            placeholder="Телефон, e-mail или ник в мессенджере"
          />
        </label>

        <label className="field">
          <span>Сообщение *</span>
          <textarea
            rows={5}
            value={form.message}
            onChange={update('message')}
            required
            placeholder="Ваш вопрос или сообщение"
          />
        </label>

        <button type="submit" className="btn btn-primary" disabled={status === 'sending'}>
          {status === 'sending' ? 'Отправка…' : 'Отправить'}
        </button>

        {status === 'sent' && (
          <p className="notice notice-success">Сообщение отправлено. Спасибо!</p>
        )}
        {status === 'error' && <p className="notice notice-error">{error}</p>}
      </form>
    </div>
  );
}
