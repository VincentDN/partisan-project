# Audio direction

One page. Audio supports the tone in [art-direction.md](art-direction.md): lived-in, plainspoken, never triumphant.

## Music
- **Folk and field recordings of the period**, played quietly under the demos. Default volume 0.36, on by default, one switch in every module.
- Two tracks today (`assets/audio/`, both owner-supplied): *Abdulena* and *The Duce Puts On His Uniform*. Selection and volume persist in `parp-music-v4` (`shared/sound-layer.js`).
- Autoplay is attempted on first interaction only; nothing plays before a user gesture. Music never pauses or changes on part swaps.
- New tracks join `shared/music.js` `TRACKS` **only** once they are in the asset register with a licence line (see Provenance).

## UI and handling sounds
- Handling sounds: the recorded bank in `assets/audio/foley/` (42 owner-cleared takes, ADR 0009) plays through `workbench/mech.js`; the Web Audio synthesis (same file, shared bus in `shared/sfx.js`) is the fallback while the bank loads or if it is missing.
- Under 150 ms, no pitch sweeps upward (no "reward" sounds). Quieter than the music bed.
- **No weapon-fire audio.** Firing was removed in v0.3 and stays out of scope; the demos are about building, not shooting.

## More foley (2026-27 wish list)
Fabric rustle on pose change, buckle and velcro on equipment toggles, magazine seat on attachment swap. Recorded or CC0 only (Freesound CC0, Sonniss GDC bundles with written terms); each file gets a register row first.

## Accessibility
- Every sound has a visible equivalent; nothing is information-only audio.
- Music and effects obey the single on/off control; reduced motion does not auto-start music.
- Keep peak output safe: compressor on the master bus, music capped by the volume slider.

## Provenance rules
1. No audio ships without a row in `docs/assets/register.json` (`tools/assets` register tools check it in CI).
2. Allowed: CC0, CC BY 4.0 (with credit in the design doc credits), original, owner-supplied with rights stated.
3. Generated audio is not used as final provenance.
4. Owner-supplied recordings are recorded as such; the owner confirms rights (tracked under WP-F8).
