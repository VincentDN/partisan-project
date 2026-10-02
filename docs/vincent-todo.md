# Vincent to-do

Things only the project owner can do. Agents cannot, or must not, do these. The full list of every packet is in [master-roadmap.md](master-roadmap.md); the agent hand-off is [agent-ops/STATE.md](agent-ops/STATE.md).

## Do first
- [x] **WP-F8, enable Pages.** Settings > Pages > Source: GitHub Actions. The deploy workflow is already on `main`.
- [ ] **WP-F10, check the live site** (deploys are green; I cannot open github.io from the sandbox) once Pages is on: open `https://vincentdn.github.io/partisan-project/` and tell an agent if any link or asset is broken.

## Unblocks the weapon work
- [ ] **Network access for agents** (or do WP-A1 yourself). The sandbox blocks the model sites. To let an agent download weapons, edit the cloud environment's network access and allow: `kenney.nl`, `quaternius.com`, `poly.pizza`, `opengameart.org`, `itch.io` and their download CDNs. Sketchfab needs a login, so those stay manual.
- [ ] **Foley archive.** Download `foley-cuts-unshipped.zip` from the `archive/foley-cuts` branch (https://github.com/VincentDN/partisan-project/tree/archive/foley-cuts), then delete the branch.
- [ ] **WP-A1, CC0 packs.** Download the weapon packs listed in `docs/assets/REGISTER.md` into `assets-incoming/`. This unblocks WP-A2 to A5 (real attachments) and A9 to A18 (more weapons).
- [ ] **WP-A15, SIG Spear.** Decide: buy a model, or ship a placeholder.
- [ ] **WP-A18, Bren and Chauchat.** Confirm which sources are acceptable.

## Creative decisions
- [ ] **WP-D1, setting canon.** Yantis / WW2044 prologue, or the modern low-poly operator look? This unblocks WP-D2 (design doc expansion) and WP-D3 (faction insignia and flags).
- [ ] **WP-C3, Recon sign-off.** Compare the Recon operator against `docs/moodboard/recon-hero-pose.jpg` and say what to change.

- [ ] **WP-X1, Bench Lab look.** Open `bench/`, fit a few parts and tell an agent what looks wrong (hand poses, camera, tray). Mark which handling sounds you like.


## Whenever convenient
- [ ] **WP-Q6, manual accessibility pass.** Screen reader (NVDA or VoiceOver), 200 % zoom, high-contrast mode, a real phone.

- RPK (WP-A14) is a data-only kitbash on the AK-74M mesh (45-round mag, compensator, angled grip). A real long-barrel mesh needs a Blender pass.
- Design doc (WP-D2) fiction-dependent parts are provisional until setting canon (WP-D1) is decided.
- The v1.0.0 tag is yours to create after the release checklist (docs/engineering/release-checklist.md).
- Credits and licences: pages point to the GitHub docs or vincent@kaisercatcinema.com.

- **Sketchfab token**: it is not visible to the session that was running when you added it (secrets reach new sessions). In a new session run `node tools/assets/sketchfab-fetch.mjs` to download all 39 chosen models (`tools/assets/sketchfab-sources.json`). They cover every procedural attachment, the G3, M16, Mk14, SIG Spear, StG 44, PPSh-41, Bren, Chauchat, the RPK, the environment kit, Recon props and the convoy vehicles.
