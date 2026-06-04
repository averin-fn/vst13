import { useEffect, useRef, useState } from 'react';
import { api } from '../api';
import { TOP_ROLES, SQUADS, SOLDIER_ROLE, squadCommanderRole } from '../roles';
import ParticipantCard from '../components/ParticipantCard.jsx';

// Прокручиваемое/перетаскиваемое «поле» для дерева: тащим мышью (drag-to-pan),
// на тач-устройствах работает обычная прокрутка. Клик по карточке не срабатывает,
// если это было перетаскивание.
function OrgViewport({ children }) {
  const ref = useRef(null);
  const st = useRef({ down: false, moved: false, x: 0, y: 0, left: 0, top: 0 });

  // При открытии центрируем поле по горизонтали — чтобы сразу было видно
  // корень (командование), а не пустой угол.
  useEffect(() => {
    const el = ref.current;
    if (el) el.scrollLeft = Math.max(0, (el.scrollWidth - el.clientWidth) / 2);
  }, []);

  const onMouseDown = (e) => {
    const el = ref.current;
    st.current = {
      down: true, moved: false,
      x: e.clientX, y: e.clientY,
      left: el.scrollLeft, top: el.scrollTop
    };
    el.classList.add('grabbing');
  };
  const onMouseMove = (e) => {
    const s = st.current;
    if (!s.down) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) s.moved = true;
    ref.current.scrollLeft = s.left - dx;
    ref.current.scrollTop = s.top - dy;
  };
  const end = () => {
    st.current.down = false;
    if (ref.current) ref.current.classList.remove('grabbing');
  };
  const onClickCapture = (e) => {
    if (st.current.moved) {
      e.preventDefault();
      e.stopPropagation();
      st.current.moved = false;
    }
  };

  return (
    <div
      ref={ref}
      className="org-viewport"
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={end}
      onMouseLeave={end}
      onClickCapture={onClickCapture}
    >
      {children}
    </div>
  );
}

// Раскладываем участников по структуре дерева:
//  - top: командование (Командир, Замполит)
//  - squads: отряды (командир отряда + его солдаты)
//  - others: должности/солдаты вне структуры — отдельным блоком, чтобы никто не пропал
function buildTree(participants) {
  const assigned = new Set();

  const top = TOP_ROLES.map((role) => {
    const members = participants.filter((p) => p.role === role);
    members.forEach((p) => assigned.add(p.id));
    return { role, members };
  }).filter((g) => g.members.length > 0);

  const squads = SQUADS.map((n) => {
    const commanderRole = squadCommanderRole(n);
    const commanders = participants.filter((p) => p.role === commanderRole);
    const soldiers = participants.filter(
      (p) => p.role === SOLDIER_ROLE && Number(p.squad) === n
    );
    [...commanders, ...soldiers].forEach((p) => assigned.add(p.id));
    return { n, commanderRole, commanders, soldiers };
  }).filter((s) => s.commanders.length > 0 || s.soldiers.length > 0);

  const others = participants.filter((p) => !assigned.has(p.id));

  return { top, squads, others };
}

function Group({ role, members }) {
  return (
    <div className="org-group">
      <span className="org-tier-label">{role}</span>
      <div className="org-tier-nodes">
        {members.map((p) => (
          <ParticipantCard key={p.id} participant={p} />
        ))}
      </div>
    </div>
  );
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

  const { top, squads, others } = buildTree(participants);

  return (
    <div className="page">
      <h1 className="page-title">Участники</h1>
      <p className="page-subtitle">
        Структура команды по отрядам. Тяните поле, чтобы осмотреться, и выберите бойца для досье.
      </p>

      {status === 'loading' && <p className="notice">Загрузка…</p>}
      {status === 'error' && (
        <p className="notice notice-error">Не удалось загрузить состав команды.</p>
      )}
      {status === 'ready' && participants.length === 0 && (
        <p className="notice">Список участников пока пуст.</p>
      )}

      {status === 'ready' && participants.length > 0 && (
        <OrgViewport>
        <div className="org-tree">
          {top.length > 0 && (
            <div className="org-level">
              {top.map((g) => (
                <Group key={g.role} role={g.role} members={g.members} />
              ))}
            </div>
          )}

          {squads.length > 0 && (
            <>
              {top.length > 0 && <div className="org-connector" aria-hidden="true" />}
              <div className="org-squads">
                {squads.map((squad) => (
                  <div className="org-squad" key={squad.n}>
                    <Group role={squad.commanderRole} members={squad.commanders} />
                    {squad.soldiers.length > 0 && (
                      <div
                        className={
                          squad.soldiers.length === 1 ? 'org-children single' : 'org-children'
                        }
                      >
                        {squad.soldiers.map((p) => (
                          <div className="org-child" key={p.id}>
                            <ParticipantCard participant={p} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          {others.length > 0 && (
            <>
              <div className="org-connector" aria-hidden="true" />
              <div className="org-level">
                <Group role="Без отряда / прочие" members={others} />
              </div>
            </>
          )}
        </div>
        </OrgViewport>
      )}
    </div>
  );
}
