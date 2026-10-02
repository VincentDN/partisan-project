# Audio direction

One page. Audio supports the tone in [art-direction.md](art-direction.md): lived-in, plainspoken, never triumphant.

## Music
- **Folk and field recordings of the period**, played quietly under the demos. Default volume 0.36, on by default, one switch in every module.
- Two tracks today (`assets/audio/`, both owner-supplied): *Abdulena* and *The Duce Puts On His Uniform*. Selection and volume persist in `parp-music-v4` (`shared/sound-layer.js`).
- Autoplay is attempted on first interaction only; nothing plays before a user gesture. Music never pauses or changes on part swaps.
- New tracks join `shared/music.js` `TRACKS` **only** once they are in the asset register with a licence line (see Provenance).

## The chiptune cover (deprecated)

Retired from the Nokia index: it did not hold up in use. The rendered file is in `outbound/` and the generator stays in `tools/audio/chiptune-duce.py` for a later attempt; the player no longer has a cover mode.

## UI and handling sounds
- Handling sounds: the recorded bank in `assets/audio/foley/` (42 owner-cleared takes, ADR 0009) plays through `workbench/mech.js`; the Web Audio synthesis (same file, shared bus in `shared/sfx.js`) is the fallback while the bank loads or if it is missing.
- Under 150 ms; the Nokia index blips are 50% louder than the first mix (`shared/ui-sounds.js`).
- **No weapon-fire audio.** Firing was removed in v0.3 and stays out of scope; the demos are about building, not shooting.

## More foley (2026-27 wish list)
Fabric rustle on pose change, buckle and velcro on equipment toggles, magazine seat on attachment swap. Recorded or CC0 only (Freesound CC0, Sonniss GDC bundles with written terms); each file gets a register row first.

## Accessibility
- Every sound has a visible equivalent; nothing is information-only audio.
- Music and effects obey the single on/off control; reduced motion does not auto-start music.
- Keep peak output safe: compressor on the master bus, music capped by the volume slider.

## Provenance
Not tracked here: credits and licences are covered by the GitHub documentation (express instruction in AGENTS.md).
