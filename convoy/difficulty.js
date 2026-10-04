// Partisan Tactical difficulty: a few multipliers the simulation reads (convoy/sim.js) and the XP it pays out.
//   taken  damage the rebels take        spread  the army's aim (lower is deadlier)
//   react  the army's reaction time      xp      experience earned at the debrief
//   loot   how many items a mission yields   rarity  how much rarer they lean
export const DIFFICULTY = {
  easy: {
    label: 'Easy',
    taken: 0.6,
    spread: 1.4,
    react: 1.5,
    xp: 0.75,
    loot: 0.8,
    rarity: 0.85,
    text: 'Rebels take less damage; the army is slow and shoots wide.',
  },
  normal: {label: 'Normal', taken: 1, spread: 1, react: 1, xp: 1, loot: 1, rarity: 1, text: 'As designed.'},
  hard: {
    label: 'Hard',
    taken: 1.35,
    spread: 0.8,
    react: 0.75,
    xp: 1.25,
    loot: 1.2,
    rarity: 1.25,
    text: 'The army reacts fast and shoots straight. More XP.',
  },
  brutal: {
    label: 'Brutal',
    taken: 1.8,
    spread: 0.6,
    react: 0.5,
    xp: 1.6,
    loot: 1.4,
    rarity: 1.5,
    text: 'Two hits and you are down. Much more XP.',
  },
};
export const DEFAULT_DIFFICULTY = 'normal';
export const difficulty = id => DIFFICULTY[id] || DIFFICULTY[DEFAULT_DIFFICULTY];
