import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api';
import ModelViewer from '../components/ModelViewer.jsx';

export default function ParticipantDetail() {
  const { id } = useParams();
  const [participant, setParticipant] = useState(null);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    setStatus('loading');
    api
      .getParticipant(id)
      .then((data) => {
        setParticipant(data);
        setStatus('ready');
      })
      .catch(() => setStatus('error'));
  }, [id]);

  if (status === 'loading') return <p className="notice">Загрузка…</p>;
  if (status === 'error') {
    return (
      <div className="page">
        <p className="notice notice-error">Участник не найден.</p>
        <Link to="/participants" className="btn btn-ghost">
          ← К списку участников
        </Link>
      </div>
    );
  }

  return (
    <div className="page">
      <Link to="/participants" className="back-link">
        ← К списку участников
      </Link>

      <div className="detail">
        <div className="detail-model">
          <ModelViewer modelUrl={participant.model_url} />
        </div>

        <div className="detail-info">
          <span className="participant-callsign">«{participant.callsign}»</span>
          <h1 className="detail-name">{participant.name}</h1>
          <span className="participant-role detail-role">{participant.role}</span>

          {participant.joined_date && (
            <p className="detail-meta">В команде с: {participant.joined_date}</p>
          )}

          <h3 className="detail-section-title">Досье</h3>
          <p className="detail-bio">{participant.bio || 'Информация пока не заполнена.'}</p>
        </div>

        <div className="detail-photo">
          {participant.photo ? (
            <img src={participant.photo} alt={participant.name} />
          ) : (
            <span className="participant-photo-placeholder">
              {participant.callsign?.[0] || '?'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
