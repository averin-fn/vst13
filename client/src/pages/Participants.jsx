import { Fragment, useEffect, useState } from 'react';
import { api } from '../api';
import { ROLES } from '../roles';
import ParticipantCard from '../components/ParticipantCard.jsx';

// Группируем участников по должностям в порядке иерархии.
// Известные должности идут сверху вниз (корень → ветви),
// все прочие роли собираются в завершающий уровень «Прочие».
function buildTiers(participants) {
  const tiers = ROLES.map((role) => ({ role, members: [] }));
  const others = [];

  for (const p of participants) {
    const idx = ROLES.indexOf(p.role);
    if (idx === -1) others.push(p);
    else tiers[idx].members.push(p);
  }

  const result = tiers.filter((t) => t.members.length > 0);
  if (others.length > 0) result.push({ role: 'Прочие', members: others });
  return result;
}

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

  const tiers = buildTiers(participants);

  return (
    <div className="page">
      <h1 className="page-title">Участники</h1>
      <p className="page-subtitle">
        Структура команды по должностям. Выберите бойца, чтобы увидеть досье и 3D-модель.
      </p>

      {status === 'loading' && <p className="notice">Загрузка…</p>}
      {status === 'error' && (
        <p className="notice notice-error">Не удалось загрузить состав команды.</p>
      )}
      {status === 'ready' && participants.length === 0 && (
        <p className="notice">Список участников пока пуст.</p>
      )}

      {status === 'ready' && participants.length > 0 && (
        <div className="org-tree">
          {tiers.map((tier, i) => (
            <Fragment key={tier.role}>
              {i > 0 && <div className="org-connector" aria-hidden="true" />}
              <div className="org-tier">
                <span className="org-tier-label">{tier.role}</span>
                <div className="org-tier-nodes">
                  {tier.members.map((p) => (
                    <ParticipantCard key={p.id} participant={p} />
                  ))}
                </div>
              </div>
            </Fragment>
          ))}
        </div>
      )}
    </div>
  );
}
