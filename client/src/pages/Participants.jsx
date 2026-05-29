import { useEffect, useState } from 'react';
import { api } from '../api';
import ParticipantCard from '../components/ParticipantCard.jsx';

export default function Participants() {
  const [participants, setParticipants] = useState([]);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    api
      .getParticipants()
      .then((data) => {
        setParticipants(data);
        setStatus('ready');
      })
      .catch(() => setStatus('error'));
  }, []);

  return (
    <div className="page">
      <h1 className="page-title">Участники</h1>
      <p className="page-subtitle">
        Выберите бойца, чтобы увидеть досье и 3D-модель снаряжения.
      </p>

      {status === 'loading' && <p className="notice">Загрузка…</p>}
      {status === 'error' && (
        <p className="notice notice-error">Не удалось загрузить состав команды.</p>
      )}
      {status === 'ready' && participants.length === 0 && (
        <p className="notice">Список участников пока пуст.</p>
      )}

      {status === 'ready' && participants.length > 0 && (
        <div className="grid">
          {participants.map((p) => (
            <ParticipantCard key={p.id} participant={p} />
          ))}
        </div>
      )}
    </div>
  );
}
