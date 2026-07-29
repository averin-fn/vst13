import { useEffect, useState } from 'react';
import { api, isMemberAuthed, clearMemberToken } from '../api';

// Вкладка Breakout of Zelenyi.
// Гость видит простой список команд с очками.
// Вошедший участник с правом can_manage_game редактирует очки прямо здесь.
const REFRESH_MS = 10000;
// Очки, при которых полоска команды заполнена целиком
const MAX_POINTS = 15000;

// Табличка квеста: гость читает, судья правит текст и награду прямо в ней.
function QuestCard({ quest, canEdit, onSave, onDelete }) {
  const [title, setTitle] = useState(quest.title);
  const [reward, setReward] = useState(quest.reward);
  const [busy, setBusy] = useState(false);

  // Подхватываем правки, пришедшие с автообновлением (свой ввод не затираем:
  // эффект срабатывает только при смене значения на сервере)
  useEffect(() => setTitle(quest.title), [quest.title]);
  useEffect(() => setReward(quest.reward), [quest.reward]);

  const dirty = title !== quest.title || reward !== quest.reward;

  const save = async () => {
    setBusy(true);
    try {
      await onSave({ title, reward });
    } finally {
      setBusy(false);
    }
  };

  if (!canEdit) {
    return (
      <div className="card game-quest">
        <div className="game-quest-title">{quest.title}</div>
        {quest.reward && <div className="game-quest-reward">{quest.reward}</div>}
      </div>
    );
  }

  return (
    <div className="card game-quest game-quest--edit">
      <textarea
        className="game-quest-input"
        rows={3}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Текст квеста"
      />
      <input
        className="game-quest-input game-quest-input--reward"
        value={reward}
        onChange={(e) => setReward(e.target.value)}
        placeholder="Награда (напр. 1500 очков)"
      />
      <div className="game-quest-actions">
        <button
          type="button"
          className="btn btn-primary btn-sm"
          disabled={!dirty || busy || !title.trim()}
          onClick={save}
        >
          {busy ? '…' : dirty ? 'Сохранить' : 'Сохранено'}
        </button>
        <button type="button" className="btn btn-danger btn-sm" onClick={onDelete}>
          Удалить
        </button>
      </div>
    </div>
  );
}

export default function Game() {
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('loading');
  const [me, setMe] = useState(null);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [busyTeam, setBusyTeam] = useState(0);
  const [qrOpen, setQrOpen] = useState(false);
  const [newQuest, setNewQuest] = useState({ title: '', reward: '' });
  const [questError, setQuestError] = useState('');

  const load = () =>
    api
      .getGame()
      .then((d) => {
        setData(d);
        setStatus('ready');
      })
      .catch(() => setStatus((s) => (s === 'loading' ? 'error' : s)));

  useEffect(() => {
    load();
    const t = setInterval(load, REFRESH_MS);
    if (isMemberAuthed()) api.getMe().then(setMe).catch(() => {});
    return () => clearInterval(t);
  }, []);

  const canJudge = !!me?.can_manage_game;
  const teams = data?.teams || [];
  const log = data?.log || [];
  const quests = data?.quests || [];

  const addQuest = async (e) => {
    e.preventDefault();
    setQuestError('');
    try {
      await api.createGameQuest(newQuest);
      setNewQuest({ title: '', reward: '' });
      await load();
    } catch (err) {
      setQuestError(err.message);
    }
  };

  const saveQuest = async (id, values) => {
    setQuestError('');
    try {
      await api.updateGameQuest(id, values);
      await load();
    } catch (err) {
      setQuestError(err.message);
    }
  };

  const removeQuest = async (q) => {
    if (!window.confirm(`Удалить квест «${q.title}»?`)) return;
    setQuestError('');
    try {
      await api.deleteGameQuest(q.id);
      await load();
    } catch (err) {
      setQuestError(err.message);
    }
  };

  const apply = async (teamId, sign) => {
    const delta = sign * Math.abs(parseInt(amount, 10) || 0);
    if (!delta) {
      setError('Укажите число очков');
      return;
    }
    setBusyTeam(teamId);
    setError('');
    try {
      await api.addGamePoints(teamId, delta, reason);
      setReason('');
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyTeam(0);
    }
  };

  return (
    <div className="page">
      <div className="game-title-row">
        <h1 className="page-title">Breakout of Zelenyi</h1>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => setQrOpen(true)}
          title="Показать QR-код страницы"
        >
          QR-код
        </button>
      </div>

      {qrOpen && (
        <div className="game-qr-overlay" onClick={() => setQrOpen(false)}>
          <div className="game-qr-card">
            <img src="/qr/breakout-scoreboard.svg" alt="QR-код страницы с очками" />
            <div className="game-qr-caption">
              Наведи камеру — счёт игры
              <span>вст13.рф/game</span>
            </div>
          </div>
        </div>
      )}

      {status === 'loading' && <p className="notice">Загрузка…</p>}
      {status === 'error' && (
        <p className="notice notice-error">Не удалось загрузить таблицу.</p>
      )}
      {status === 'ready' && teams.length === 0 && (
        <p className="notice">Команды пока не добавлены — следите за анонсами.</p>
      )}

      {canJudge && (
        <div className="card admin-form game-judge-panel">
          <div className="game-judge-head">
            <h3 className="admin-form-title">Начисление очков</h3>
            {!!me?.is_judge && (
              <div className="game-judge-me">
                <span>Судья: {me.name}</span>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    clearMemberToken();
                    setMe(null);
                  }}
                >
                  Выйти
                </button>
              </div>
            )}
          </div>
          <div className="form-grid">
            <label className="field">
              <span>Очки за действие</span>
              <input
                type="number"
                min="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="напр. 1500"
              />
            </label>
            <label className="field">
              <span>Причина (необязательно)</span>
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="напр. захват точки Б"
              />
            </label>
          </div>
          {error && <p className="notice notice-error">{error}</p>}
        </div>
      )}

      {teams.length > 0 && (
        <div className="game-board">
          {teams.map((t, i) => (
            <div key={t.id} className={`card game-team ${i === 0 ? 'game-team--leader' : ''}`}>
              <div
                className="game-team-fill"
                style={{
                  width: `${Math.min(100, Math.max(0, (t.points / MAX_POINTS) * 100))}%`,
                  background: t.color || 'var(--accent)'
                }}
              />
              <div className="game-team-place">{i + 1}</div>
              <div className="game-team-name">
                {t.color && <span className="game-team-dot" style={{ background: t.color }} />}
                {t.name}
              </div>
              <div className="game-team-points">{t.points}</div>
              {canJudge && (
                <div className="game-team-actions">
                  <button
                    className="btn btn-primary btn-sm"
                    disabled={busyTeam === t.id}
                    onClick={() => apply(t.id, 1)}
                  >
                    {Math.abs(parseInt(amount, 10) || 0) ? `+${Math.abs(parseInt(amount, 10))}` : '+'}
                  </button>
                  <button
                    className="btn btn-danger btn-sm"
                    disabled={busyTeam === t.id}
                    onClick={() => apply(t.id, -1)}
                  >
                    {Math.abs(parseInt(amount, 10) || 0) ? `−${Math.abs(parseInt(amount, 10))}` : '−'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {(quests.length > 0 || canJudge) && (
        <>
          <h2 className="game-log-title">Квесты и награды</h2>
          {questError && <p className="notice notice-error">{questError}</p>}
          <div className="game-quests">
            {quests.map((q) => (
              <QuestCard
                key={q.id}
                quest={q}
                canEdit={canJudge}
                onSave={(values) => saveQuest(q.id, values)}
                onDelete={() => removeQuest(q)}
              />
            ))}

            {canJudge && (
              <form className="card game-quest game-quest--new" onSubmit={addQuest}>
                <textarea
                  className="game-quest-input"
                  rows={3}
                  value={newQuest.title}
                  onChange={(e) => setNewQuest({ ...newQuest, title: e.target.value })}
                  placeholder="Новый квест: что нужно сделать"
                  required
                />
                <input
                  className="game-quest-input game-quest-input--reward"
                  value={newQuest.reward}
                  onChange={(e) => setNewQuest({ ...newQuest, reward: e.target.value })}
                  placeholder="Награда (напр. 1500 очков)"
                />
                <div className="game-quest-actions">
                  <button type="submit" className="btn btn-primary btn-sm">
                    Добавить квест
                  </button>
                </div>
              </form>
            )}
          </div>
          {quests.length === 0 && !canJudge && (
            <p className="notice">Квесты пока не объявлены.</p>
          )}
        </>
      )}

      {canJudge && log.length > 0 && (
        <>
          <h2 className="game-log-title">Журнал начислений</h2>
          <div className="game-log">
            {log.map((e) => (
              <div key={e.id} className="game-log-row">
                <span className={`game-log-delta ${e.delta > 0 ? 'plus' : 'minus'}`}>
                  {e.delta > 0 ? `+${e.delta}` : e.delta}
                </span>
                <span className="game-log-team">{e.team_name}</span>
                {e.reason && <span className="game-log-reason">{e.reason}</span>}
                <span className="game-log-meta">{e.author}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
