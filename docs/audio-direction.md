# Audio direction

One page. Audio supports the tone in [art-direction.md](art-direction.md): lived-in, plainspoken, never triumphant.

## Music
- **Folk and field recordings of the period**, played quietly under the demos. Default volume 0.36, on by default, one switch in every module.
- Two tracks today (`assets/audio/`, both owner-supplied): *Abdulena* and *The Duce Puts On His Uniform*. Selection and volume persist in `parp-music-v4` (`shared/sound-layer.js`).
- Autoplay is attempted on first interaction only; nothing plays before a user gesture. Music never pauses or changes on part swaps.
- New tracks join `shared/music.js` `TRACKS` **only** once they are in the asset register with a licence line (see Provenance).

## The chiptune cover
- *The Duce Puts On His Uniform* has a chiptune cover (`assets/audio/duce-chiptune.mp3`) made by `tools/audio/chiptune-duce.py`: the recording is analysed for its beat times, key, melody, bass and chords, and the tune is written out again on the recording's own beat grid for two pulse channels, a triangle bass and a noise drum channel. The result is rendered to the recording's length, loudness and onset timing (calibrated to within a few milliseconds). No audio from the recording is kept.
- The Nokia index asks the player for the cover. The player runs both versions in lockstep (`shared/music.js`: drift measured every 250 ms and corrected with rate nudges, a seek only if it ever slips by a quarter of a second) and crossfades with an equal-power curve; leaving the index fades back. `npm run test:audio` checks the lock and the handover.
- It is an automated transcription from an old recording: wrong notes are likely in places. Re-run the script after improving the analysis; the owner's ear is the acceptance test (see `docs/vincent-todo.md`).

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

## Provenance rules
1. No audio ships without a row in `docs/assets/register.json` (`tools/assets` register tools check it in CI).
2. Allowed: CC0, CC BY 4.0 (with credit in the design doc credits), original, owner-supplied with rights stated.
3. Generated audio is not used as final provenance.
4. Owner-supplied recordings are recorded as such; the owner confirms rights (tracked under WP-F8).
