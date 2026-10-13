// Day and night on the campaign map (WP-W4): how light it is at an hour, and how far the band sees. Full day from
// 07:00 to 18:00, dark from 21:00 to 05:00, dawn and dusk between. Sight drops from 160 map units by day to 60 at
// night; enemies further away than that show no nameplate. Pure, no DOM.

export const SIGHT_DAY = 160,
  SIGHT_NIGHT = 60;

const smooth = t => t * t * (3 - 2 * t);

/** 1 in full day, 0 in full night, eased through dawn (05-07) and dusk (18-21). */
export function daylight(hour) {
  const h = ((hour % 24) + 24) % 24;
  if (h >= 7 && h < 18) return 1;
  if (h >= 21 || h < 5) return 0;
  return smooth(h < 12 ? (h - 5) / 2 : 1 - (h - 18) / 3);
}

/** How far the band sees at `hour`, in map units. */
export const sightRange = hour => SIGHT_NIGHT + (SIGHT_DAY - SIGHT_NIGHT) * daylight(hour);
