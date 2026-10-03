# Partisan workbench — animation and sound roadmap

**Revision:** 29 September 2026 · **Status:** development paused; work-in-progress checkpoint, not a finished release.

**Baseline:** [VincentDN/vincentdenil-site, main at a6545cc](https://github.com/VincentDN/vincentdenil-site/tree/a6545cc). This was the inspected Partisan baseline. The implementation checkout was subsequently fetched and fast-forwarded to **87567c3** on 29 September 2026. Later upstream changes affected the crane demo, docs and TinyShell, without overlapping this bench implementation.


## Experience split — 30 September 2026

The default product flow is **original workbench opener → Full Customiser**. Ordinary editing stays in the Full Customiser. All new bench editing, hand/action animations and the P1–P6 development described here belong exclusively to the opt-in **Load Advanced animations test** experience, available from the opener and the Full Customiser. The six video stills remain references for that experiment.

The test lives at [Advanced animations test](../ak15-workbench-intro/?view=advanced), with its scene in `advanced.html` and renderer in `advanced-workbench.js`. Use `advanced.html?review=1` for checkpoint authoring. The basic opener uses the restored `bench.html` and `workbench.js`; it does not load the test's action/hand modules. Future animation work should stay in the advanced route unless explicitly promoted.

## Implementation checkpoint — 29 September 2026

The six reference stills and analysis below remain the reference study. Development has now begun across all phases; **implementation coverage is not the same as passing each phase's exit gate**.

| Phase | Working in the local prototype | Still required for the exit gate |
|---|---|---|
| P0 | Current repository integrated, six timestamped reference stills, existing sample source discrepancy documented | Audition and trace every active audio take; approve the final pose sheet |
| P1 | Shared rifle loading/slot operations, shared appearance, loadout validation, one-commit timeline, rollback, Skip, cancellation and deterministic review checkpoints | Broader failure and repeated-load testing |
| P2 | Persistent bench with inspection/set-down and staged outgoing/incoming optic objects; camera and hand targets | Judge and polish continuous motion at all contact checkpoints |
| P3 | Palm-space wrist solve, articulated fingers/thumbs, contact error readout in review mode | Per-option grip profiles, anatomical silhouette refinement, wrist blending and collision review |
| P4 | Event-driven sample/synth voices, obsolete-cue suppression, cancellation, handling controls, music ducking | Listening review, exact cue envelopes/selection, source clearance and mix verification |
| P5 | Both rifles, all seven slot families, rail moves, in-place stock adjustment, Quick changes and Skip | Verify every model/option extreme and tune each family beyond the common transfer framework |
| P6 | Responsive panel, keyboard controls, reduced-motion skip, saved builds/finishes, viewer return links, capped pixel ratio | Physical-device performance/memory profiling, full input and accessibility audit |

Validation so far: ten automated tests pass. Browser checks passed for all seven attachment families using Skip, optic rollback before commit, switching between both rifles, customiser loading and camouflage/wear-preserving return navigation. The authoring mode at `advanced.html?review=1` pauses at 30%, 38%, 50%, 70% or 82% for repeatable stills. Its palm error metric measures rig reach, not intersections or anatomical realism. No frame-rate or audio-fidelity target is claimed as achieved.

Development paused at the user's request on 30 September 2026. This work-in-progress checkpoint includes the latest remote main changes through ff628f3. The remaining visual, sound and device acceptance gates are not complete. The next priority is contact and sound review, not declaring the breadth of prototype options production-ready.

## 1. Intended experience

The player should feel that their operator is working on a physical object at a lived-in resistance workshop. Inspecting, setting down, changing a part and picking the rifle up should form one coherent interaction. Hands explain the action, weight explains the movement, and sound confirms contact.

Keep the project's existing low-poly style, Altis/FIA setting, radio, camp ambience and configurable AK models. Translate the reference's staging and physical logic into that style. Photorealistic characters, a new weapon roster and a full gameplay simulation are outside this roadmap.

The first deliverable should be one complete, repeatable interaction with the AK-74M: inspect → set down → swap an optic → inspect the result. This exercises the camera, support hand, working hand, loose part, attachment system and audio together. Generalize only after that interaction looks convincing.

## 2. What changed on main

| Area | Verified baseline | Consequence for this plan |
|---|---|---|
| Locations | Customiser moved inside `3d/partisan-project/ak15-workbench-intro/ak15-weapon-customiser/` | All new module references and links must use the nested location. |
| Entry point | Workbench `index.html` is an iframe shell; `bench.html` contains the scene | Preserve the shell and its direct-link behavior while adding bench interaction. |
| Music continuity | `sound-layer.js` persists in the parent window; the radio/camp mix crossfades to the viewer mix | Extend the existing sound layer, rather than introducing another music player. |
| Atmosphere | Valve radio, animated FIA cloth, camp voices/fire/wind, radio tuning | Already present; polish around animation readability, not another atmosphere build. |
| Track defaults | “The Duce Puts On His Uniform”; v3 preferences, default volume 0.36 | Earlier assumptions about Abdulena as the default are obsolete. Preserve saved preferences. |
| Handling audio | `mech.js` loads a 42-take shortlist, with procedural synthesis as fallback | Remaining work is synchronization, sample auditioning, cancellation and mix consistency. |
| Rotation | Recent sound polish removed rotation rattle | Do not reintroduce a sound on every pointer movement or camera orbit. |
| Other screens | Operator/Field code remains, but normal mode access is parked; `?screens=all` enables it for development | Reuse their rig/IK utilities without re-exposing these screens as part of this work. |
| Navigation | Earlier standalone AK pages no longer redirect according to the current README | Preserve current routes; do not describe legacy redirects as active. |

The broad `PARTISAN-ROADMAP.md` and older customiser roadmap contain historical statements. This document is the current workbench-specific plan, not a claim that all earlier roadmap items remain outstanding.

## 3. Reference evidence and limits

Source: **LunarGaming, “The Last of Us Part 2 Remastered — All Weapon Upgrade Animations (All Guns)”**, [YouTube video](https://www.youtube.com/watch?v=sibhkC6dDJs), published 17 January 2024, duration approximately 16:48. Game imagery: Naughty Dog / Sony Interactive Entertainment. Captures below are reference material, not original Partisan art or runtime textures.

These are selected paused browser captures, cropped to the video image, not a complete frame-by-frame study. Times are recorded player positions, rounded in captions. Still images establish poses, composition and object placement; they do not establish exact velocities, action duration, force or audio timing. The animation durations later in this document are proposed starting values.

The video audio has not been listened to in this analysis. Current sound behavior is assessed from code and repository metadata. Sound texture, source separation and perceptual synchronization remain listening-review tasks. Acoustic classifications in the existing cue sheet are useful candidates, not proof that a sound matches a particular visible action.

### R1 — Supported inspection · 00:11.31

![R1: Rifle held diagonally above the bench with hands at separated support points](references/01-supported-inspection.png)

**Observed:** The rifle occupies a strong diagonal, lifted off the table. The hands support different regions; the sling hangs below. Props remain secondary to the rifle.

**Apply:** Author a lifted inspection pose with two explicit contacts, a bounded rotation range and a small torso response. The support hand should follow its local contact on the rifle, not an arbitrary point in world space. A hanging sling is a later visual enhancement, not a prerequisite for the first interaction.

### R2 — Working posture and occlusion · 00:30

![R2: Shoulder and extended arm partly obscure a rifle on the bench](references/02-shoulder-occlusion.png)

**Observed:** The operator leans into the work. Shoulder and upper arm occupy much of the near side of the frame and obscure some of the object.

**Apply:** Use upper-body involvement to sell effort, but establish an occlusion limit for our interface. Move the camera or elbow target when the active mount disappears behind a shoulder. This is a cautionary reference as well as a pose reference.

### R3 — Released hand and hanging sling · 00:45

![R3: One hand supports the rifle while the other is clear of it](references/03-release-and-secondary-motion.png)

**Observed:** One hand is clear of the rifle while the other remains in contact; the sling extends well below the object.

**Apply:** Give hands separate contact/release intervals. Add open, cupped and gripping hand poses, with a short wrist follow-through after release. The single frame does not prove the sling's motion curve; any follow-through in Partisan must be authored and reviewed.

### R4 — Loose part has a place · 01:15

![R4: A detached magazine lies separately on the workbench](references/04-part-on-table.png)

**Observed:** A detached magazine occupies a distinct, readable area of the table beside the work.

**Apply:** Define a parts tray region and stable resting transforms. An outgoing part should travel there, remain visible during the action, then be cleared at an intentional transition. Avoid replacement parts appearing from nowhere or intersecting the table.

### R5 — Rifle, hand and menu coexist · 08:38.08

![R5: Semi-auto rifle on the bench, magazine beside it, with an upgrade menu](references/05-rifle-inspection.png)

**Observed:** Rifle, detached magazine and near hand are visible together. The upgrade menu occupies the upper-right portion of the frame.

**Apply:** Reserve separate screen regions for the rifle's active work area and the option panel. Maintain readable contact points while the panel is open. Inspect and upgrade selection should feel like states of one scene.

### R6 — Clear working surface · 08:58.08

![R6: Semi-auto rifle and loose magazine laid out under focused bench lighting](references/06-clear-work-area.png)

**Observed:** The working surface provides contrast beneath the receiver and a clear area beside the rifle. The sling, magazine and power strip have distinct silhouettes.

**Apply:** Establish bench-local anchors, spacing and lighting before adding complex hand choreography. In our scene, the FIA cloth should remain recognizable but must not hide the active part or cause contact-depth ambiguity.

### Further reference study

Prioritize the [semi-auto rifle chapter, 07:58–09:46](https://www.youtube.com/watch?v=sibhkC6dDJs&t=478s) for broad AK-like staging, followed by the [bolt-action chapter, 00:00–02:11](https://www.youtube.com/watch?v=sibhkC6dDJs&t=0s) for handling composition. Use the other chapters to compare hand roles and pacing, not as interchangeable mechanism animations. The existing audio README identifies candidate semi-auto upgrade areas around 500, 520, 538 and 556 seconds; those labels still require sequence-level verification.

For each chosen action, record: start/end frame, hand contacts, contact changes, object supports, camera movement, occlusion and perceived sound onsets. Capture approach/contact/release frames rather than relying on a single attractive pose. Keep measured evidence separate from our chosen animation timing.

## 4. Gap assessment against the code

| Capability | Present today | Required next |
|---|---|---|
| Bench pose | Procedural operator, breathing, head turn, rifle tilt and two-bone arm IK | Authored lift, set-down, reach, manipulate and recover tracks |
| Hand fidelity | Rigid palm and thumb geometry in `operator.js` | Wrist orientation targets and articulated or poseable fingers |
| Rifle placement | `placeRifle()` uses fractional length-based contacts | Per-rifle named contact frames and collision/support anchors |
| Part changes | `applySlot()` applies state, then tweens new parts over 0.4 s | Outgoing/incoming part staging and transactional commit points |
| Start interaction | `begin()` invokes `mech.charge()` while the camera pushes in and fades | Visible action that justifies its cue, or a handling cue appropriate to the visible action |
| Sound fitting | Option buttons call `mech.fit()`; sample banks schedule their own sequences | Animation events own timing; audio functions accept the event time and action lifetime |
| Sample playback | Bank actions choose samples, often using `at()` and sample duration | Preserve scheduling parameters across sample/synth paths; support stopping pending sounds |
| Scene continuity | Audio survives iframe navigation; visual scene is still replaced | Bench customization view that keeps the working context on screen |
| State persistence | Viewer hashes, saved audio preferences, shell URL mirroring | Clear pending/committed build state during actions and deterministic skip/cancel behavior |

The priority is contact choreography. More camera shake, louder clicks or additional idle noise will not compensate for a hand missing a part or an object changing before it is touched.

## 5. Architecture and boundaries

Retain Three.js and the no-build delivery model initially. No bundler migration is required simply to add an animation controller. Keep the current shell and nested customiser URL valid throughout the work.

**Stage 1:** Keep the existing viewer as a reliable fallback. Extract reusable loadout and rifle-mount operations from DOM-heavy viewer functions. Build a bench interaction controller using those operations. Do not import all of `viewer.js` into `workbench.js`, because it initializes its own scene and expects its own DOM.

**Stage 2:** Let the bench host the customization panel and the same loadout model. Keep the standalone customiser as an inspection/debug route until parity is verified. Only consider visual-navigation consolidation after sharing, refresh and Back behavior remain correct.

Proposed module responsibilities, relative to the workbench folder:

| Module | Responsibility |
|---|---|
| `workbench.js` | Scene assembly, frame loop, input routing; delegates animation |
| `bench-actions.js` (new) | Action states, scheduling, skip/cancel, event dispatch |
| `bench-poses.js` (new) | Reusable poses and keyframe tracks for rifle, torso, hands and camera |
| `bench-contacts.js` (new) | Bench anchors, per-rifle contacts, wrist orientation, support constraints |
| `ak15-weapon-customiser/loadout.js` (new) | Validated build state and serialization, extracted incrementally |
| `ak15-weapon-customiser/rifle-instance.js` (new) | Normalization, slots, visible parts, temporary presentation objects |
| Existing `models.js` / `attachments.js` | Per-rifle overrides and attachment animation metadata |
| Existing `mech.js` / `sfx.js` | Event-driven sample or synth playback, gain and voice lifetime |
| Existing `../sound-layer.js` | Music/ambience continuity and temporary mix ducking |

These are proposed boundaries, not files already implemented. Extract one working path at a time; preserve existing call sites through adapters during migration.

### State and action contract

Use explicit states: `benchIdle`, `lifting`, `inspecting`, `settingDown`, `working`, `recovering`. Loading/error state sits outside this action flow. Each action has an ID, duration, tracks, contacts, events, a commit marker and a cleanup function.

Store committed loadout separately from pending selection. On selection, validate compatibility and prepare the incoming part. Preview stats may display the pending result with a clear label; share links and persisted build state stay committed until the action reaches its commit marker. A failed asset load leaves the previous committed build usable.

During work, permit camera look only within a safe bounded range. Initially disable conflicting build operations and show a brief “Fitting…” state rather than buffering a long queue. Skip completes the requested valid build instantly, without replaying all omitted sounds. Cancel before commit restores the old build; cancel after commit preserves the new build and restores a stable pose. A rifle switch or navigation uses the same cleanup path.

Use monotonic time for action progress. Fire each event once when its marker is crossed, including under a slow frame. Interpolation uses clamped normalized time and quaternion rotation interpolation. Keep one owner for each animated transform so idle motion, IK, camera controls and an action do not overwrite one another.

## 6. First complete interaction

**Target:** AK-74M, default operator proportions, one compatible optic replacement. Timing below is an initial design target, not measured from TLOU II.

| Beat | Proposed time | Visible action | Event / state |
|---|---|---|---|
| Inspect | User-controlled | Rifle raised, both hands support it | Quiet, bounded look; no orbit-triggered rattle |
| Prepare | 0.00–0.25 s | Small anticipatory weight shift; working hand adjusts | Capture current transforms; lock competing controls |
| Set down | 0.25–0.90 s | Rifle descends along an arc, slowing before support contact | Surface-contact event at actual support, then restrained settling |
| Reach | 0.90–1.45 s | One hand stabilizes the rifle; the other approaches the optic | Blend hand from rifle space to part/tool space |
| Remove | 1.45–2.20 s | Outgoing optic moves clear and is placed in its tray region | Release and tray-contact events; old state still recoverable |
| Fit | 2.20–3.10 s | Incoming optic approaches, aligns and seats | Contact-driven slide/click; commit the new loadout once seated |
| Verify | 3.10–3.45 s | Brief hand check and release | No gratuitous mechanical action unrelated to this part |
| Recover | 3.45–4.20 s | Both hands reacquire support and lift to inspection | Restore controls and finish status |

The default full sequence should be skippable and have a fast mode for repeated tweaking. Reduced motion should apply the result with a short static transition and a single appropriate confirmation cue. Do not force a four-second ceremony for every colour swatch or 10 mm rail step.

**Acceptance:** Ten repeated swaps complete without drift, duplicates, floating parts or stale sounds. At approach, contact, commit and recovery checkpoints, the relevant hand and part remain visible. Skip, cancel, reset, direct hash restore and a second rifle switch all end with consistent geometry, stats and URL state.

## 7. Hands, support and physical weight

First add explicit palm orientation alongside position. The existing `solveArm()` places the arm toward a target but does not by itself guarantee a natural wrist or finger wrap. Author palm normal, forward axis and elbow pole in a stable coordinate frame. Blend contact changes; never snap a wrist between unrelated orientations.

Add poseable fingers in the existing low-poly style: open, support/cup, grip and pinch poses are sufficient for the first pass. A simple articulated procedural hand can prove the workflow. A skinned replacement becomes worthwhile if close shots expose rigid joints or repeated pose transitions look mechanical. Keep the wrist attachment compatible with current sleeve/glove variants.

Define contacts in weapon-local, part-local, tool-local or bench-local space. A held part follows a hand attachment; a seated part follows its slot; a resting part follows a bench anchor. Change parentage while preserving world transforms. Use separate temporary presentation objects so animating an outgoing part does not corrupt the committed rifle instance or its shared materials.

For each rifle, author a small set of support points and conservative bounds. The bench cloth changes the visual surface height: use a stable support approximation rather than making the rifle follow every cloth vertex. Keep fingertips outside solid surfaces and allow an approach clearance before contact.

Weight should come from delayed upper-body response, curved paths, deceleration before contact, and a short settling phase. Scale these modestly by illustrative build mass; avoid exaggerated bouncing. Give the support arm a stable elbow plane. Reduce idle breathing influence while fine work is underway.

Optional secondary motion comes last: a lightweight sling rig, sleeve response, tiny part settling and head-follow. None should move a locked hand off its contact target.

## 8. Expand by action family

| Family | Distinct visual treatment | Reuse and limits |
|---|---|---|
| Optic / side attachment | Stabilize, reach, lift or slide, align, seat, release | Shared rail action with per-part clearances; do not assume every option uses the same fastening motion |
| Foregrip | Reorient rifle to expose the underside, then work | Separate support contact so the supporting hand does not occupy the destination |
| Magazine | Clear, move to tray, bring replacement, seat | Adapt to curved, extended and drum silhouettes; game presentation rather than real maintenance instruction |
| Stock pose | Operate the existing hinge/slide and settle | Keep folding, collapsing and replacement as separate operations |
| Muzzle attachment | Present the muzzle area and move the attachment along its axis | Stylized turn/seat motion only where visually supported by the model |
| Pistol grip | Bench-supported rifle and close working-hand pose | Needs access/clearance checks; later than optics |
| Finish / camo | Brief inspection or immediate material transition | No fake disassembly for a palette change |
| Wear | Immediate preview, optional restrained wipe/inspection | Avoid repetitive scraping audio while dragging a slider |
| Rifle switch | Put current rifle away; bring the next into the same presentation frame | Asset load completes before old scene ownership is released |

Add metadata such as action family, work pose, contact profile, tray bounds and cue set to the existing registries. Author exceptions in data, not a growing chain of weapon-name conditions. Unsupported actions fall back to a short neutral transition with a correct final state.

## 9. Audio integration and review

### Build on the existing system

The sound work on main is valuable and should remain. Keep the seven-class shortlist, synthesis fallback, persistent music and radio/camp crossfade. Add explicit timing and lifetime control to mechanical playback.

Currently, sampled bank actions tend to call `at()` internally and compose durations from whichever sample was selected. The synthesized functions expose some timing/panning arguments that their sample counterparts do not consistently honor. Unify those contracts before synchronizing animation; otherwise changing a sample can silently change the action's rhythm.

Proposed event payload: action ID, cue ID, audio-clock time, intensity, material, screen pan and optional duration. Playback returns handles for pending/active voices. Cancellation stops or quickly fades those voices; a hidden tab, navigation or skip must not produce an old burst of sound on return.

Map animation events to small audio units: grip contact, surface contact, release, short slide, seating click and tool contact. Split long recordings when their internal action sequence does not match the animation. Use a seeded take sequence for QA, modest variation during normal use, and no immediate repetition when alternatives exist.

### Mix and control

Keep music preference volume separate from temporary ducking. A handling action may reduce music by a proposed 3–6 dB, with a roughly 60–120 ms attack and 300–600 ms recovery; audition these values rather than treating them as reference measurements. Never persist a ducked volume as the user's setting.

Provide clear music, ambience and handling levels, plus an overall mute. Verify how the existing music toggle relates to the separate SFX context before promising that it mutes everything. Keep quiet tactile cues audible without making small parts sound heavier than the rifle. Route sample and synth alternatives through comparable room coloration and level control.

### Sample quality and provenance

Audition the shortlist against the intended actions. Existing `sfx/README.txt` explicitly says classification was acoustic rather than listening-based, and mentions UI-suspect cuts and source-video chapter times. Conversely, `mech.js` labels the shipped bank “CC0 foley.” That is a documentation/provenance discrepancy, not a verified licence conclusion. Resolve it with source attribution for the actual deployed files; preserve the distinction between local reference recordings and distributable production assets.

For each accepted take, record source, permitted use, cue role, trim points, loudness, unwanted background content and alternate takes. Replace unsuitable or unverified production cues with original/cleared recordings while retaining the same event interface. The reference screenshots in this roadmap remain documentary material and are not part of the game's texture or sound bank.

## 10. Camera, UI and atmosphere

Use three camera states: shoulder overview, inspection, and working close-up. Each needs authored framing for both rifles and the largest supported attachments. Blend from the actual current camera pose, never from an assumed default. Fix near-plane clipping and shoulder occlusion before adding depth of field or camera shake.

Keep the active contact in the central usable area and reserve space for the menu. On small screens, use a compact bottom panel with a stable action view; a narrow viewport must not push the hands off-screen. Keep frame-relative look input bounded during work and restore free inspection only after recovery.

The lamp should establish form, with enough fill to read fingers and matte dark parts. Preserve the existing radio and FIA cloth, but lower their visual prominence during close work. Maintain a clear parts tray zone. Do not add bloom, particles or stronger flicker until silhouettes, contacts and exposure already read well.

Show pending action, completion and errors in a polite status region. Buttons retain descriptive labels and focus visibility. Keyboard and gamepad activation must not leak into the hidden or parked screens. A visible Skip control should have equivalent keyboard access.

## 11. Phases, dependencies and effort

Estimates are planning ranges for focused engineering/animation work, not calendar commitments. Art creation, sound sourcing and review can add time. The critical path is shared state → contact-aware timeline → complete optic interaction → hand polish → broader action coverage.

| Phase | Deliverable | Dependency | Estimate | Exit gate |
|---|---|---|---|---|
| P0: baseline and reference | Current route/state map, approved pose sheet, sound shortlist audit | Current main | 0.5–1 day | No stale paths or duplicate “already built” tasks |
| P1: reusable state and timeline | Shared rifle operations, action controller, event markers, skip/cancel | P0 | 2–3 days | Deterministic final state across interruption cases |
| P2: complete optic interaction | Lift, set down, reach, swap, recover on AK-74M | P1 | 3–5 days | One convincing interaction with existing coarse hands |
| P3: hand/contact quality | Wrist targets, finger poses, both rifle contact profiles | P2 | 2–4 days | No conspicuous sliding, wrist flips or penetration in authored views |
| P4: synchronized sound | Timed/cancellable sample and synth playback, mix controls | P1; final tuning after P3 | 1–2 days | Cues agree with visible contacts and stop correctly |
| P5: action coverage | Remaining families, per-rifle exceptions, repeat-action fast mode | P3–P4 | 3–5 days | Declared support matrix passes without fallback surprises |
| P6: integration and polish | Bench panel parity, links, mobile, accessibility, performance | P5 | 2–3 days | Release checklist below passes |

Approximate complete scope: **13.5–23 focused days**, excluding externally produced assets. A useful first review build is P0–P2, approximately **5.5–9 days**. Reduce scope by stopping after one complete action, not by building superficial animations for every slot.

## 12. Implementation backlog

### P0 / P1 — foundation

- [ ] Record baseline screenshots of current bench and viewer on both rifles.
- [ ] Extract loadout validation/serialization without changing normal outputs.
- [x] Extract rifle instance ownership and slot mounting without importing viewer UI.
- [ ] Define contact frames and bench support/tray anchors.
- [x] Implement action progression, commit, rollback, skip and disposal.
- [x] Make event crossing deterministic under slow frames and replay.
- [ ] Resolve sample/synth scheduling contract and source metadata discrepancy.

### P2 / P3 — visible work

- [ ] Author inspection and resting poses; test support points against cloth/table.
- [x] Build one optic interaction with outgoing and incoming presentation objects.
- [ ] Add wrist orientation blending and stable elbow poles.
- [ ] Add four hand pose families and appropriate thumb opposition.
- [ ] Add AK-15K contact overrides and largest-attachment clearance cases.
- [ ] Capture before/contact/after checkpoints for visual review.

### P4 / P5 — sound and coverage

- [x] Drive contact sounds from animation markers rather than option button clicks.
- [ ] Add voice cancellation, muted startup and failed-load fallback coverage.
- [ ] Audition each shortlisted take and remove unsuitable UI/ambient contamination from active choices.
- [ ] Add family-specific actions in the order listed above.
- [ ] Implement quiet fast paths for repeated changes, rail steps and finishes.
- [x] Preserve the deliberate removal of orbit-triggered rattle.

### P6 — release readiness

- [x] Integrate the bench panel and maintain standalone viewer access.
- [ ] Verify shell refresh, share links, Back, direct nested route and storage failures.
- [x] Add compact mobile layout, keyboard access, reduced-motion skip and status announcements.
- [ ] Profile before adding cosmetic effects; cap pixel ratio/shadow cost where needed.
- [x] Update README/status entries, index navigation and asset credits.

## 13. Acceptance and test matrix

| Dimension | Required coverage |
|---|---|
| Models and builds | Both rifles; default, folded stock, no optic, large scope, extended magazine, drum, extreme supported rail offsets |
| Operator proportions | Default first, then supported short/tall and narrow/wide extremes; glove and sleeve variants used at the bench |
| Action lifecycle | Start, repeated click, invalid selection, skip each beat, cancel before/after commit, reset, rifle switch, navigation |
| State | Geometry, stats, selection and hash agree after completion; pending states never leak into saved links |
| Audio | First gesture, mute, volume zero, loaded samples, synthesis fallback, partial failed bank, cancellation, hidden tab/resume |
| Navigation | Shell bench → customiser → Back; `?view=customiser` plus hash; standalone nested page; copied link after mutation |
| Input/accessibility | Pointer, touch, keyboard, gamepad; reduced motion; visible focus; understandable busy/error feedback |
| Visual checks | Contact points, elbows, wrists, table support, part tray, camera clipping, shoulder/menu occlusion |
| Performance | Desktop and representative mid-range phone; cold/warm load; repeated actions and asset switches; stable memory |

Proposed targets: steady 60 fps desktop and 30 fps on the selected mobile test device, with frame-time percentiles and device/browser recorded. Treat these as acceptance goals, not measured current performance. Reuse vectors in the frame loop and avoid per-frame material/geometry creation. Preload only the next likely assets and a small cue bank after user interaction.

For synchronization, target visible impacts and cue onsets within approximately one rendered frame, allowing for measured device audio latency. Record a combined video/audio review when possible; separate frame screenshots cannot certify this. Test at reduced frame rate to ensure no duplicated marker events or long catch-up sound bursts.

Extend the existing smoke test for state transitions and event counts. Keep visual contact review separate: a passing JavaScript test does not prove that a grip looks believable. Parked Operator/Field coverage should use its explicit development mode and should not silently expand the default product scope.

## 14. Risks, choices and definition of done

| Risk / choice | Default approach |
|---|---|
| Rig fidelity dominates close-ups | Prototype with procedural fingers; upgrade the hand asset only after judging the first interaction |
| Refactoring breaks the functional viewer | Extract shared operations behind adapters; keep existing routes and fallback available |
| One generic action fits every attachment poorly | Data-driven action families with per-model exceptions and a neutral fallback |
| Sound outlasts or precedes its action | Explicit timestamps, transient markers and cancellable playback handles |
| Long animation makes customization tedious | First-time full sequence, repeat-action fast mode, Skip and reduced-motion behavior |
| Existing audio source labels conflict | Trace the actual active manifest files before calling them production-cleared |
| Main continues changing | Re-fetch before implementation; re-check changes to the modules listed in §5 |

A workbench release is done when the chosen support matrix has believable contacts, correctly timed audio, safe interruption behavior, preserved saved builds and current navigation, accessible controls and measured acceptable performance. No claim of TLOU II fidelity is required: the result should be coherent and tactile within Partisan's own art direction.

Current next development task: **review and polish the optic interaction at the contact checkpoints**, then verify the broader family support matrix. The state/timeline foundation and broad prototype coverage now exist, but this does not waive the original visual and audio exit gates.

## 15. Source and maintenance notes

Code inspected at the pinned revision: workbench `README.md`, `index.html`, `bench.html`, `workbench.js`; project `sound-layer.js`; nested customiser `README.md`, `viewer.js`, `operator.js`, `field.js`, `models.js`, `attachments.js`, `mech.js`, `sfx.js`, the sample manifest and `sfx/README.txt`; existing broad roadmaps and smoke-test structure.

This document complements the externally referenced `vdn-roadmap/extras/tlouii-style-modding-roadmap.md`; that external document was not refreshed in this pass. It does not supersede that file's uninspected contents. Reconcile the two when implementation starts.

Reference images: six documentary screenshots from the linked video, with original in-video marks preserved. Captures R1–R4 were taken during the earlier review; R5–R6 were added after updating main. Screenshot cropping removes unrelated YouTube page content; no visual details were generated or retouched. The roadmap's proposed timings, effort ranges and acceptance thresholds are design decisions, not measurements of the reference game.
