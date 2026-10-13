// The map's light follows the campaign clock (WP-W4): the sun and sky dim and turn blue through dusk, the haze darkens
// at night, and dawn brings it back. The amount comes from shared/campaign/daylight.js; this only sets the lights.
import * as T from 'three';
import {daylight} from '../shared/campaign/daylight.js';

const NIGHT_SKY = new T.Color('#1c2740'),
  NIGHT_SUN = new T.Color('#9fb4e0');

/** lights: {scene, sun, hemi, renderer}. Returns apply(hour) -> true when the light changed enough to redraw. */
export function createDaylight({scene, sun, hemi, renderer}) {
  const sky = scene.background.clone(),
    sunColor = sun.color.clone(),
    base = {sun: sun.intensity, hemi: hemi.intensity, exposure: renderer.toneMappingExposure};
  let last = -1;
  return function apply(hour) {
    const d = daylight(hour);
    if (Math.abs(d - last) < 0.01) return false;
    last = d;
    scene.background.copy(NIGHT_SKY).lerp(sky, d);
    scene.fog.color.copy(scene.background);
    sun.color.copy(NIGHT_SUN).lerp(sunColor, d);
    sun.intensity = base.sun * (0.2 + 0.8 * d);
    hemi.intensity = base.hemi * (0.5 + 0.5 * d);
    renderer.toneMappingExposure = base.exposure * (0.75 + 0.25 * d);
    return true;
  };
}
