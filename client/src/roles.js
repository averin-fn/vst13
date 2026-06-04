// Иерархия команды.
// Верхний уровень — командование (Командир, Замполит) + SMM-специалист
// (на том же горизонте, но в стороне). Ниже — командиры отрядов,
// под каждым командиром отряда — его солдаты (поле squad у участника).
export const TOP_ROLES = ['Командир', 'Замполит'];
export const SMM_ROLE = 'SMM-специалист';
export const SQUADS = [1, 2, 3];
export const SOLDIER_ROLE = 'Солдат';
export const RESERVE_ROLE = 'Запас';

export const squadCommanderRole = (n) => `Командир ${n} отряда`;

// Плоский список всех должностей — для выпадающего списка в админке.
export const ROLES = [
  ...TOP_ROLES,
  SMM_ROLE,
  ...SQUADS.map(squadCommanderRole),
  SOLDIER_ROLE,
  RESERVE_ROLE
];
