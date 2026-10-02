# 0010 · The shell, the opening scene and the Nokia index on the table

**Status** accepted · 2026-10-01

**Context.** The owner asked for the old workbench scene back as the way into the site, for the music to continue through the whole site, for a shared top bar with the music player folded in, and for the Nokia index to read as a phone lying on the workbench table.

**Decision.**
1. `index.html` is a thin **shell**: one full-screen frame that owns the sound layer (`shared/sound-layer.js`) and shows every other page. Pages find the layer through `window.parent`, so navigation never restarts the music. The shell keeps its address in step with the frame (`?p=<page>#<hash>`); `shared/frame.js` sends a page opened on its own into the shell (skipped for automated browsers and `?standalone`). Outbound links leave the frame.
2. `intro/` is the opening scene, restored from the earlier workbench: the table, the rifle from your saved build, the old radio tuning in, the FIA flag, with one button bottom left (Customize this weapon). The code-built operator is replaced by the two IK arms from Bench Lab. The room is `shared/bench-scene.js`; the radio and camp mix is `shared/bench-audio.js` (`sound.scene('bench')`).
3. `menu/` is the Nokia index. The LCD stays real HTML and is laid exactly over the phone's screen in a WebGL close-up of the table with `shared/homography.js` (a matrix3d recomputed on resize and pointer parallax).
4. `shared/topbar.js` is the top bar of every page: a strip of Nokia LCD with INDEX and DESIGN DOC buttons and the music player (on/off, track, volume). It replaces each page's header and music section.

**Consequences.** Deep links keep working (the shell reproduces them). Pages must not assume they are top-level. The shell is the only page that can create the sound layer first, so tests that open pages directly get their own layer.
