// Local lightweight inventory silhouettes: distinct equipment categories without loading a demo or asset catalogue.
const paths = {
  weapon: 'M4 17h18v-3h6v3h14v4H24l-3 9h-5l2-9h-6l-4 5H4z',
  magazine: 'M17 5h13v17l-5 15-12-4 4-13z M20 9h6M20 14h6M19 20h6',
  ammo: 'M19 35V13l5-9 5 9v22z M19 27h10',
  meds: 'M9 8h30v28H9z M21 14h6v6h6v6h-6v6h-6v-6h-6v-6h6z',
  headwear: 'M8 27v-7a16 16 0 0 1 32 0v7H8z M12 27v7h6v-7',
  armor: 'M13 5l7 3h8l7-3 6 12-6 4v16H13V21l-6-4z M17 16h14v16H17z',
  grenade: 'M19 6h10v7l5 7v12l-7 6h-6l-7-6V20l5-7z M29 8h8v12',
  rig: 'M13 5l7 3h8l7-3 4 30H9z M14 19h8v10h-8z M26 19h8v10h-8z',
  backpack: 'M15 10V7h18v3 M10 13h28v24H10z M16 25h16v8H16z',
  item: 'M9 12l15-7 15 7v22l-15 7-15-7z M9 12l15 8 15-8M24 20v21',
};
const cache = new Map();
export function inventoryIcon(kind) {
  if (!cache.has(kind))
    cache.set(
      kind,
      'data:image/svg+xml,' +
        encodeURIComponent(
          `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path d="${paths[kind] || paths.item}" fill="#c0c9ac" fill-opacity=".6" stroke="#e3e6d8" stroke-width="1.5" stroke-linejoin="round"/></svg>`,
        ),
    );
  return cache.get(kind);
}
