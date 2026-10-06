// Medicine in the grid inventory (TAC-C-11): bandages and medkits from the catalogue heal from a pool of points
// (an AI-2 holds 100 and gives up to 50 a use; an army bandage two uses of 15). An item keeps what is left in it
// (`left`) and is used up when that reaches nothing. Pure.

/** Use `item` on someone missing `need` hit points: {healed, gone, why}. healed 0: nothing done (why says so). */
export function useMed(cat, item, need) {
  const d = cat.def(item.slug);
  if (d.kind !== 'meds' || !d.charges) return {healed: 0, gone: false, why: `${d.short} is not medicine.`};
  if (need <= 0) return {healed: 0, gone: false, why: 'Not hurt.'};
  const left = item.left ?? d.charges;
  const healed = Math.min(d.heal, left, Math.ceil(need));
  item.left = left - healed;
  return {healed, gone: item.left <= 0, why: `${d.short}: ${healed} healed.`};
}
