import { Fragment, useEffect, useState } from 'react';
import { api } from '../api';
import { ROLE_TIERS } from '../roles';
import ParticipantCard from '../components/ParticipantCard.jsx';

// Строим уровни дерева. Каждый уровень — список групп по должностям,
// каждая группа — участники этой должности. Корень сверху, ветви снизу.
// Должности вне иерархии собираются в завершающий уровень «Прочие».
function buildLevels(participants) {
  const byRole = new Map();
  for (const p of participants) {
    if (!byRole.has(p.role)) byRole.set(p.role, []);
    byRole.get(p.role).push(p);
  }

  const known = new Set();
  const levels = [];

  for (const tierRoles of ROLE_TIERS) {
    const groups = [];
    for (const role of tierRoles) {
      const members = byRole.get(role);
      if (members && members.length > 0) {
        groups.push({ role, members });
        known.add(role);
      }
    }
    if (groups.length > 0) levels.push(groups);
  }

  // Участники с должностями вне иерархии — отдельным уровнем «Прочие»
  const others = [];
  for (const [role, members] of byRole) {
    if (!known.has(role)) others.push(...members);
  }
  if (others.length > 0) levels.push([{ role: 'Прочие', members: others }]);

  return levels;
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

  const levels = buildLevels(participants);

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
          {levels.map((groups, i) => (
            <Fragment key={i}>
              {i > 0 && <div className="org-connector" aria-hidden="true" />}
              <div className="org-level">
                {groups.map((group) => (
                  <div className="org-group" key={group.role}>
                    <span className="org-tier-label">{group.role}</span>
                    <div className="org-tier-nodes">
                      {group.members.map((p) => (
                        <ParticipantCard key={p.id} participant={p} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Fragment>
          ))}
        </div>
      )}
    </div>
  );
}
