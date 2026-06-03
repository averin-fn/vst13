import { Link } from 'react-router-dom';

export default function ParticipantCard({ participant }) {
  const { id, name, callsign, role, photo } = participant;
  return (
    <Link to={`/participants/${id}`} className="card participant-card">
      <div className="participant-photo">
        {photo ? (
          <img src={photo} alt={name} />
        ) : (
          <span className="participant-photo-placeholder">{callsign?.[0] || '?'}</span>
        )}
      </div>
      <div className="participant-card-body">
        <h3 className="participant-callsign">«{callsign}»</h3>
        <span className="participant-name">{name}</span>
        <span className="participant-role">{role}</span>
      </div>
      <span className="card-cta">Подробнее →</span>
    </Link>
  );
}
