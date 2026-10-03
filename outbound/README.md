# Outbound

Files prepared for the owner to download. Not built or deployed.

- `weapon-sounds-package.zip`: every extracted weapon handling sound. Contents:
  - the takes the site plays
  - the unshipped cuts and review reels
  - the cue-sheet analysis
  - the TLOU2 workbench reference image
- `duce-chiptune.mp3`: the deprecated chiptune cover of *The Duce Puts On His Uniform* (no longer used on the site).
- `sketchfab-download.py`: one standalone file (Python 3, no packages) that downloads all 39 chosen Sketchfab models. Run `python3 sketchfab-download.py`, paste your token when asked (hidden), and the models land in `sketchfab-models/` (or `inbound/sketchfab/` if run inside a clone). Rebuild it with `node tools/assets/build-outbound-downloader.mjs` after changing the model list.
