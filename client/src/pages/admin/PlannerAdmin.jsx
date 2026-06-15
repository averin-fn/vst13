import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../../api';

const uid = () => Math.random().toString(36).slice(2, 9);

export default function PlannerAdmin() {
  const [participants, setParticipants] = useState([]);
  const [extras, setExtras] = useState([]); // вручную добавленные люди (нет в участниках)
  const [groups, setGroups] = useState([]);
  const [title, setTitle] = useState(''); // название игры
  const [status, setStatus] = useState('loading');
  const [saved, setSaved] = useState(true);
  const [selected, setSelected] = useState(null); // id бойца для тап-переноса
  const [newGroup, setNewGroup] = useState('');
  const [newPerson, setNewPerson] = useState(''); // позывной ручного бойца
  const [publishing, setPublishing] = useState(false);
  const [publishMsg, setPublishMsg] = useState('');
  const saveTimer = useRef(null);
  const firstLoad = useRef(true);

  // Загрузка участников + доски
  useEffect(() => {
    Promise.all([api.getParticipants(), api.getPlanner()])
      .then(([people, board]) => {
        setParticipants(people);
        setTitle(board.title || '');
        const extraList = (board.extras || []).filter((x) => x && x.id);
        setExtras(extraList);
        const valid = new Set([...people.map((p) => p.id), ...extraList.map((x) => x.id)]);
        // чистим устаревшие id (удалённые бойцы)
        const clean = (board.groups || []).map((g) => ({
          id: g.id || uid(),
          name: g.name || 'Группа',
          members: (g.members || []).filter((x) => valid.has(x)),
          subgroups: (g.subgroups || []).map((s) => ({
            id: s.id || uid(),
            name: s.name || 'Подгруппа',
            members: (s.members || []).filter((x) => valid.has(x))
          }))
        }));
        setGroups(clean);
        setStatus('ready');
      })
      .catch(() => setStatus('error'));
  }, []);

  // Автосохранение при изменениях (с задержкой)
  useEffect(() => {
    if (firstLoad.current) {
      firstLoad.current = false;
      return;
    }
    setSaved(false);
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      api.savePlanner({ title, groups, extras }).then(() => setSaved(true)).catch(() => {});
    }, 600);
    return () => clearTimeout(saveTimer.current);
  }, [title, groups, extras]);

  // Все люди на доске: зарегистрированные участники + добавленные вручную
  const people = useMemo(() => [...participants, ...extras], [participants, extras]);

  const byId = useMemo(() => {
    const m = new Map();
    people.forEach((p) => m.set(p.id, p));
    return m;
  }, [people]);

  const placed = useMemo(() => {
    const s = new Set();
    groups.forEach((g) => {
      g.members.forEach((id) => s.add(id));
      g.subgroups.forEach((sg) => sg.members.forEach((id) => s.add(id)));
    });
    return s;
  }, [groups]);

  const pool = people.filter((p) => !placed.has(p.id));

  // Переместить бойца в цель: 'pool' | {groupId} | {groupId, subId}
  const moveMember = (memberId, target) => {
    setGroups((prev) => {
      // убрать отовсюду
      let next = prev.map((g) => ({
        ...g,
        members: g.members.filter((x) => x !== memberId),
        subgroups: g.subgroups.map((s) => ({ ...s, members: s.members.filter((x) => x !== memberId) }))
      }));
      if (target !== 'pool') {
        next = next.map((g) => {
          if (g.id !== target.groupId) return g;
          if (target.subId) {
            return {
              ...g,
              subgroups: g.subgroups.map((s) =>
                s.id === target.subId ? { ...s, members: [...s.members, memberId] } : s
              )
            };
          }
          return { ...g, members: [...g.members, memberId] };
        });
      }
      return next;
    });
  };

  // Клик: выбрать бойца, затем клик по цели — перенести
  const onChipClick = (memberId) => {
    setSelected((cur) => (cur === memberId ? null : memberId));
  };
  const onZoneClick = (target) => {
    if (selected == null) return;
    moveMember(selected, target);
    setSelected(null);
  };

  // Drag-and-drop
  const onDragStart = (e, memberId) => {
    e.dataTransfer.setData('text/plain', String(memberId));
    e.dataTransfer.effectAllowed = 'move';
  };
  // id участника — число, ручного бойца — строка вида "x_abc"
  const parseId = (raw) => (/^x_/.test(raw) ? raw : Number(raw));
  const onDrop = (e, target) => {
    e.preventDefault();
    const raw = e.dataTransfer.getData('text/plain');
    if (!raw) return;
    const id = parseId(raw);
    if (id) moveMember(id, target);
  };
  const allowDrop = (e) => e.preventDefault();

  // Управление группами/подгруппами
  const addGroup = () => {
    const name = newGroup.trim() || `Группа ${groups.length + 1}`;
    setGroups([...groups, { id: uid(), name, members: [], subgroups: [] }]);
    setNewGroup('');
  };
  const renameGroup = (gid) => {
    const g = groups.find((x) => x.id === gid);
    const name = window.prompt('Название группы', g?.name || '');
    if (name == null) return;
    setGroups(groups.map((x) => (x.id === gid ? { ...x, name: name.trim() || x.name } : x)));
  };
  const removeGroup = (gid) => {
    if (!window.confirm('Удалить группу? Бойцы вернутся в общий список.')) return;
    setGroups(groups.filter((x) => x.id !== gid));
  };
  const addSubgroup = (gid) => {
    setGroups(
      groups.map((g) =>
        g.id === gid
          ? { ...g, subgroups: [...g.subgroups, { id: uid(), name: `Подгруппа ${g.subgroups.length + 1}`, members: [] }] }
          : g
      )
    );
  };
  const renameSubgroup = (gid, sid) => {
    const g = groups.find((x) => x.id === gid);
    const s = g?.subgroups.find((x) => x.id === sid);
    const name = window.prompt('Название подгруппы', s?.name || '');
    if (name == null) return;
    setGroups(
      groups.map((x) =>
        x.id === gid
          ? { ...x, subgroups: x.subgroups.map((y) => (y.id === sid ? { ...y, name: name.trim() || y.name } : y)) }
          : x
      )
    );
  };
  const removeSubgroup = (gid, sid) => {
    setGroups(
      groups.map((x) =>
        x.id === gid ? { ...x, subgroups: x.subgroups.filter((y) => y.id !== sid) } : x
      )
    );
  };

  // Добавить бойца вручную (гость / из другой команды) в «Не распределены»
  const addPerson = () => {
    const callsign = newPerson.trim();
    if (!callsign) return;
    setExtras([...extras, { id: `x_${uid()}`, callsign, name: callsign, manual: true }]);
    setNewPerson('');
  };
  // Удалить ручного бойца с доски целиком (из пула и из всех групп)
  const removePerson = (memberId) => {
    setExtras(extras.filter((x) => x.id !== memberId));
    setGroups((prev) =>
      prev.map((g) => ({
        ...g,
        members: g.members.filter((x) => x !== memberId),
        subgroups: g.subgroups.map((s) => ({ ...s, members: s.members.filter((x) => x !== memberId) }))
      }))
    );
    if (selected === memberId) setSelected(null);
  };

  // Текст расстановки для описания мероприятия
  const buildRoster = () => {
    const name = (id) => {
      const p = byId.get(id);
      return p ? `«${p.callsign}»` : null;
    };
    const lines = [];
    groups.forEach((g) => {
      lines.push(g.name);
      const mem = g.members.map(name).filter(Boolean);
      if (mem.length) lines.push(`— ${mem.join(', ')}`);
      g.subgroups.forEach((s) => {
        const sm = s.members.map(name).filter(Boolean);
        lines.push(`  ${s.name}: ${sm.length ? sm.join(', ') : '—'}`);
      });
      lines.push('');
    });
    return lines.join('\n').trim();
  };

  // Опубликовать расстановку как мероприятие
  const publish = async () => {
    const t = title.trim();
    if (!t) {
      setPublishMsg('Сначала укажите название игры');
      return;
    }
    if (!window.confirm(`Опубликовать «${t}» в раздел «Мероприятия»?`)) return;
    setPublishMsg('');
    setPublishing(true);
    try {
      await api.createEvent({
        title: t,
        date: '',
        location: '',
        description: buildRoster(),
        image: ''
      });
      setPublishMsg('Опубликовано в «Мероприятия» ✓ Дату и детали можно дополнить там.');
    } catch (err) {
      setPublishMsg(err.message || 'Не удалось опубликовать');
    } finally {
      setPublishing(false);
    }
  };

  const Chip = ({ id }) => {
    const p = byId.get(id);
    if (!p) return null;
    const isManual = typeof id === 'string';
    return (
      <span
        className={`plan-chip ${selected === id ? 'selected' : ''} ${isManual ? 'plan-chip-manual' : ''}`}
        draggable
        onDragStart={(e) => onDragStart(e, id)}
        onClick={(e) => {
          e.stopPropagation();
          onChipClick(id);
        }}
        title={isManual ? `${p.name} (добавлен вручную)` : p.name}
      >
        «{p.callsign}»
        {isManual && (
          <button
            type="button"
            className="plan-chip-del"
            onClick={(e) => {
              e.stopPropagation();
              removePerson(id);
            }}
            title="Убрать бойца"
          >
            ✕
          </button>
        )}
      </span>
    );
  };

  if (status === 'loading') return <p className="notice">Загрузка…</p>;
  if (status === 'error') return <p className="notice notice-error">Не удалось загрузить планировщик.</p>;

  return (
    <div className="admin-page">
      <h1 className="page-title">Планировщик</h1>
      <p className="page-subtitle">
        Расставьте команду по группам и подгруппам. Перетаскивайте бойцов мышью или
        нажмите на бойца, затем на нужную группу. {saved ? 'Сохранено ✓' : 'Сохранение…'}
      </p>

      <div className="plan-toolbar">
        <input
          className="plan-title-input"
          value={title}
          onChange={(e) => { setTitle(e.target.value); setPublishMsg(''); }}
          placeholder="Название игры"
          maxLength={200}
        />
        <button
          type="button"
          className="btn btn-primary"
          onClick={publish}
          disabled={publishing || !title.trim()}
        >
          {publishing ? 'Публикация…' : 'Опубликовать в мероприятия'}
        </button>
      </div>
      {publishMsg && (
        <p className={`notice ${publishMsg.includes('✓') ? 'notice-success' : 'notice-error'}`}>
          {publishMsg}
        </p>
      )}

      <div className="planner">
        {/* Пул нераспределённых */}
        <div
          className="plan-pool"
          onDrop={(e) => onDrop(e, 'pool')}
          onDragOver={allowDrop}
          onClick={() => onZoneClick('pool')}
        >
          <div className="plan-pool-head">Не распределены ({pool.length})</div>
          <div className="plan-chips">
            {pool.map((p) => (
              <Chip key={p.id} id={p.id} />
            ))}
            {pool.length === 0 && <span className="plan-empty">Все распределены</span>}
          </div>
          <div className="plan-add-person" onClick={(e) => e.stopPropagation()}>
            <input
              value={newPerson}
              onChange={(e) => setNewPerson(e.target.value)}
              placeholder="Позывной бойца"
              onKeyDown={(e) => e.key === 'Enter' && addPerson()}
            />
            <button type="button" className="btn btn-primary btn-sm" onClick={addPerson}>
              + Боец
            </button>
          </div>
        </div>

        {/* Группы */}
        <div className="plan-board">
          {groups.map((g) => (
            <div key={g.id} className="plan-group">
              <div
                className="plan-group-head"
                onDrop={(e) => onDrop(e, { groupId: g.id })}
                onDragOver={allowDrop}
                onClick={() => onZoneClick({ groupId: g.id })}
              >
                <span className="plan-group-name" onClick={(e) => { e.stopPropagation(); renameGroup(g.id); }}>
                  {g.name}
                </span>
                <span className="plan-group-tools">
                  <button type="button" onClick={(e) => { e.stopPropagation(); addSubgroup(g.id); }}>+ подгруппа</button>
                  <button type="button" className="plan-del" onClick={(e) => { e.stopPropagation(); removeGroup(g.id); }}>✕</button>
                </span>
              </div>

              <div
                className="plan-chips plan-group-drop"
                onDrop={(e) => onDrop(e, { groupId: g.id })}
                onDragOver={allowDrop}
                onClick={() => onZoneClick({ groupId: g.id })}
              >
                {g.members.map((id) => (
                  <Chip key={id} id={id} />
                ))}
                {g.members.length === 0 && g.subgroups.length === 0 && (
                  <span className="plan-empty">Перетащите сюда бойцов</span>
                )}
              </div>

              {g.subgroups.map((s) => (
                <div key={s.id} className="plan-subgroup">
                  <div
                    className="plan-subgroup-head"
                    onDrop={(e) => onDrop(e, { groupId: g.id, subId: s.id })}
                    onDragOver={allowDrop}
                    onClick={() => onZoneClick({ groupId: g.id, subId: s.id })}
                  >
                    <span onClick={(e) => { e.stopPropagation(); renameSubgroup(g.id, s.id); }}>{s.name}</span>
                    <button type="button" className="plan-del" onClick={(e) => { e.stopPropagation(); removeSubgroup(g.id, s.id); }}>✕</button>
                  </div>
                  <div
                    className="plan-chips"
                    onDrop={(e) => onDrop(e, { groupId: g.id, subId: s.id })}
                    onDragOver={allowDrop}
                    onClick={() => onZoneClick({ groupId: g.id, subId: s.id })}
                  >
                    {s.members.map((id) => (
                      <Chip key={id} id={id} />
                    ))}
                    {s.members.length === 0 && <span className="plan-empty">—</span>}
                  </div>
                </div>
              ))}
            </div>
          ))}

          <div className="plan-add-group">
            <input
              value={newGroup}
              onChange={(e) => setNewGroup(e.target.value)}
              placeholder="Название группы"
              onKeyDown={(e) => e.key === 'Enter' && addGroup()}
            />
            <button type="button" className="btn btn-primary btn-sm" onClick={addGroup}>
              + Группа
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
