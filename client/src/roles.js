// Иерархия команды.
// Верхний уровень — командование, ниже — командиры отрядов,
// под каждым командиром отряда — его солдаты (поле squad у участника).
export const TOP_ROLES = ['Командир', 'Замполит'];
export const SQUADS = [1, 2, 3];
export const SOLDIER_ROLE = 'Солдат';

export const squadCommanderRole = (n) => `Командир ${n} отряда`;

// Плоский список всех должностей — для выпадающего списка в админке.
export const ROLES = [...TOP_ROLES, ...SQUADS.map(squadCommanderRole), SOLDIER_ROLE];
