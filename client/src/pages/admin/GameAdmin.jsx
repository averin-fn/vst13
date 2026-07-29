import { useEffect, useState } from 'react';
import { api } from '../../api';

// Админка игры Breakout of Zelenyi: команды, очки, квесты, судьи, журнал.
const EMPTY = { name: '', color: '#8e9b62' };

const EMPTY_JUDGE = { name: '', username: '', password: '' };
const EMPTY_QUEST = { title: '', reward: '' };

export default function GameAdmin() {
  const [data, setData] = useState({ teams: [], log: [], quests: [] });
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [points, setPoints] = useState({}); // teamId -> строка с числом
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [judges, setJudges] = useState([]);
  const [judgeForm, setJudgeForm] = useState(EMPTY_JUDGE);
  const [judgeError, setJudgeError] = useState('');
  const [judgeBusy, setJudgeBusy] = useState(false);
  const [questForm, setQuestForm] = useState(EMPTY_QUEST);
  const [questEditingId, setQuestEditingId] = useState(null);
  const [questError, setQuestError] = useState('');

  const load = () => api.getGame().then(setData).catch(() => {});
  const loadJudges = () => api.getGameJudges().then(setJudges).catch(() => {});

  useEffect(() => {
    load();
    loadJudges();
  }, []);

  const saveJudge = async (e) => {
    e.preventDefault();
    setJudgeBusy(true);
    setJudgeError('');
    try {
      await api.createGameJudge(judgeForm);
      setJudgeForm(EMPTY_JUDGE);
      await loadJudges();
    } catch (err) {
      setJudgeError(err.message);
    } finally {
      setJudgeBusy(false);
    }
  };

  const removeJudge = async (j) => {
    if (!window.confirm(`Удалить судью «${j.name}»?`)) return;
    try {
      await api.deleteGameJudge(j.id);
      await loadJudges();
    } catch (err) {
      setJudgeError(err.message);
    }
  };

  const saveQuest = async (e) => {
    e.preventDefault();
    setQuestError('');
    try {
      if (questEditingId) await api.adminUpdateGameQuest(questEditingId, questForm);
      else await api.adminCreateGameQuest(questForm);
      setQuestForm(EMPTY_QUEST);
      setQuestEditingId(null);
      await load();
    } catch (err) {
      setQuestError(err.message);
    }
  };

  const removeQuest = async (q) => {
    if (!window.confirm(`Удалить квест «${q.title}»?`)) return;
    try {
      await api.adminDeleteGameQuest(q.id);
      if (questEditingId === q.id) {
        setQuestForm(EMPTY_QUEST);
        setQuestEditingId(null);
      }
      await load();
    } catch (err) {
      setQuestError(err.message);
    }
  };

  const startCreate = () => {
    setForm(EMPTY);
    setEditingId(null);
    setError('');
  };

  const startEdit = (t) => {
    setForm({ name: t.name, color: t.color || '#8e9b62' });
    setEditingId(t.id);
    setError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (editingId) await api.updateGameTeam(editingId, form);
      else await api.createGameTeam(form);
      await load();
      startCreate();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (t) => {
    if (!window.confirm(`Удалить команду «${t.name}» вместе с её очками?`)) return;
    try {
      await api.deleteGameTeam(t.id);
      if (editingId === t.id) startCreate();
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const addPoints = async (t, sign) => {
    const delta = sign * Math.abs(parseInt(points[t.id], 10) || 0);
    if (!delta) {
      setError('Укажите число очков');
      return;
    }
    setError('');
    try {
      await api.adminAddGamePoints(t.id, delta, reason);
      setReason('');
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const removeLogEntry = async (e) => {
    if (!window.confirm('Удалить запись журнала? Очки команды пересчитаются.')) return;
    try {
      await api.deleteGameLogEntry(e.id);
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="admin-page">
      <h1 className="page-title">Breakout of Zelenyi</h1>
      <p className="page-subtitle">
        Команды игры и их очки. Судьи регистрируются ниже — судейский аккаунт видит только
        вкладку игры и начисление очков, остальной сайт для него как для гостя.
      </p>

      <form className="card admin-form" onSubmit={save}>
        <h3 className="admin-form-title">
          {editingId ? 'Редактирование команды' : 'Новая команда'}
        </h3>
        <div className="form-grid">
          <label className="field">
            <span>Название *</span>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </label>
          <label className="field">
            <span>Цвет</span>
            <input
              type="color"
              value={form.color}
              onChange={(e) => setForm({ ...form, color: e.target.value })}
            />
          </label>
        </div>
        {error && <p className="notice notice-error">{error}</p>}
        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? 'Сохранение…' : editingId ? 'Сохранить' : 'Добавить'}
          </button>
          {editingId && (
            <button type="button" className="btn btn-ghost" onClick={startCreate}>
              Отмена
            </button>
          )}
        </div>
      </form>

      <label className="field">
        <span>Причина начисления (подставится к следующей операции)</span>
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="напр. выполнение сценарной задачи"
        />
      </label>

      <div className="admin-list">
        {data.teams.map((t) => (
          <div key={t.id} className={`admin-row ${editingId === t.id ? 'editing' : ''}`}>
            <div className="admin-row-main">
              <strong>
                {t.color && <span className="game-team-dot" style={{ background: t.color }} />}
                {t.name}
              </strong>
              <span className="admin-row-sub">Очков: {t.points}</span>
            </div>
            <div className="admin-row-actions">
              <input
                type="number"
                className="game-points-input"
                placeholder="очки"
                value={points[t.id] || ''}
                onChange={(e) => setPoints({ ...points, [t.id]: e.target.value })}
              />
              <button className="btn btn-primary btn-sm" onClick={() => addPoints(t, 1)}>
                +
              </button>
              <button className="btn btn-danger btn-sm" onClick={() => addPoints(t, -1)}>
                −
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => startEdit(t)}>
                Изменить
              </button>
              <button className="btn btn-danger btn-sm" onClick={() => remove(t)}>
                Удалить
              </button>
            </div>
          </div>
        ))}
        {data.teams.length === 0 && <p className="notice">Команд пока нет.</p>}
      </div>

      <h2 className="game-log-title">Квесты и награды</h2>
      <form className="card admin-form" onSubmit={saveQuest}>
        <label className="field">
          <span>Текст квеста *</span>
          <textarea
            rows={2}
            value={questForm.title}
            onChange={(e) => setQuestForm({ ...questForm, title: e.target.value })}
            required
          />
        </label>
        <label className="field">
          <span>Награда</span>
          <input
            value={questForm.reward}
            onChange={(e) => setQuestForm({ ...questForm, reward: e.target.value })}
            placeholder="напр. 1500 очков"
          />
        </label>
        {questError && <p className="notice notice-error">{questError}</p>}
        <div className="form-actions">
          <button type="submit" className="btn btn-primary">
            {questEditingId ? 'Сохранить' : 'Добавить квест'}
          </button>
          {questEditingId && (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setQuestForm(EMPTY_QUEST);
                setQuestEditingId(null);
              }}
            >
              Отмена
            </button>
          )}
        </div>
      </form>
      <div className="admin-list">
        {(data.quests || []).map((q) => (
          <div key={q.id} className={`admin-row ${questEditingId === q.id ? 'editing' : ''}`}>
            <div className="admin-row-main">
              <strong>{q.title}</strong>
              <span className="admin-row-sub">{q.reward || 'награда не указана'}</span>
            </div>
            <div className="admin-row-actions">
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setQuestForm({ title: q.title, reward: q.reward });
                  setQuestEditingId(q.id);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              >
                Изменить
              </button>
              <button className="btn btn-danger btn-sm" onClick={() => removeQuest(q)}>
                Удалить
              </button>
            </div>
          </div>
        ))}
        {(data.quests || []).length === 0 && <p className="notice">Квестов пока нет.</p>}
      </div>

      <h2 className="game-log-title">Судьи</h2>
      <form className="card admin-form" onSubmit={saveJudge}>
        <div className="form-grid">
          <label className="field">
            <span>Имя / позывной *</span>
            <input
              value={judgeForm.name}
              onChange={(e) => setJudgeForm({ ...judgeForm, name: e.target.value })}
              required
            />
          </label>
          <label className="field">
            <span>Логин *</span>
            <input
              value={judgeForm.username}
              onChange={(e) => setJudgeForm({ ...judgeForm, username: e.target.value })}
              autoComplete="off"
              required
            />
          </label>
          <label className="field">
            <span>Пароль *</span>
            <input
              type="password"
              value={judgeForm.password}
              onChange={(e) => setJudgeForm({ ...judgeForm, password: e.target.value })}
              autoComplete="new-password"
              required
            />
          </label>
        </div>
        {judgeError && <p className="notice notice-error">{judgeError}</p>}
        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={judgeBusy}>
            {judgeBusy ? 'Сохранение…' : 'Зарегистрировать судью'}
          </button>
        </div>
      </form>
      <div className="admin-list">
        {judges.map((j) => (
          <div key={j.id} className="admin-row">
            <div className="admin-row-main">
              <strong>{j.name}</strong>
              <span className="admin-row-sub">логин: {j.username}</span>
            </div>
            <div className="admin-row-actions">
              <button className="btn btn-danger btn-sm" onClick={() => removeJudge(j)}>
                Удалить
              </button>
            </div>
          </div>
        ))}
        {judges.length === 0 && <p className="notice">Судей пока нет.</p>}
      </div>

      {data.log.length > 0 && (
        <>
          <h2 className="game-log-title">Журнал начислений</h2>
          <div className="game-log">
            {data.log.map((e) => (
              <div key={e.id} className="game-log-row">
                <span className={`game-log-delta ${e.delta > 0 ? 'plus' : 'minus'}`}>
                  {e.delta > 0 ? `+${e.delta}` : e.delta}
                </span>
                <span className="game-log-team">{e.team_name}</span>
                {e.reason && <span className="game-log-reason">{e.reason}</span>}
                <span className="game-log-meta">{e.author}</span>
                <button
                  className="btn btn-danger btn-sm"
                  title="Удалить запись"
                  onClick={() => removeLogEntry(e)}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
