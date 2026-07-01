import { useEffect, useState } from 'react';
import { api, isMemberAuthed, clearMemberToken } from '../api';

// Вкладка Breakout of Zelenyi.
// Гость видит простой список команд с очками.
// Вошедший участник с правом can_manage_game редактирует очки прямо здесь.
const REFRESH_MS = 10000;
// Очки, при которых полоска команды заполнена целиком
const MAX_POINTS = 15000;

export default function Game() {
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('loading');
  const [me, setMe] = useState(null);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [busyTeam, setBusyTeam] = useState(0);
  const [qrOpen, setQrOpen] = useState(false);

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
