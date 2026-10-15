// How a fighter looks (WP-W17): their class's outfit (band/troops.js `look`), then what they actually wear from their
// kit on top: a helmet in the Head slot, a vest or plates in the Body slot. The mission sprites, the Look panel and
// the campaign map's band figure all dress a fighter by this. Pure, no DOM.
import {TROOPS} from '../../band/troops.js';

/** What each wearable puts on the paper doll (by catalogue slug); anything else worn on the head is a cap. */
const WORN = {
  'ssh-68-steel-helmet': {hat: 'SimpleHelmet', hatColor: '#4f553e'},
  '6b47-helmet': {hat: 'AdvancedHelmet', hatColor: '#4a503c'},
  'flak-vest': {shell: 'FlakVest', shellColor: '#5f6a4a'},
  'plate-carrier': {shell: 'PlateArmor', shellColor: '#4c5240'},
};
const CAP = {hat: 'Tuque', hatColor: '#4a5236'};

/** The paper-doll look of class `cls` (its outfit), or {} for none. */
export const classLook = cls => ({...(TROOPS[cls]?.look || {})});

/** What a kit's Head and Body slots put on: {hat?, shell?, ...colours}. */
export function wornLook(kit) {
  const out = {};
  const head = kit?.headwear?.slug,
    body = kit?.armor?.slug;
  if (head) Object.assign(out, WORN[head] || CAP);
  if (body && WORN[body]) Object.assign(out, WORN[body]);
  return out;
}

/** Which look fields what is worn decides (the Look panel shows them as worn, not chosen). */
export const wornFields = kit => Object.keys(wornLook(kit)).filter(k => k === 'hat' || k === 'shell');
