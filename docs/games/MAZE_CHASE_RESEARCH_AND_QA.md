# Lối sáng — original maze chase, research and QA

Updated: 2026-10-07. Legacy route ID: `pac-man`. New presentation name: **Lối sáng**.

## Delivery status

This is an original, finite three-stage maze-chase implementation for the existing route. It is **not a licensed PAC-MAN game, not a replica, and not accepted reference parity**. The legacy ID is a compatibility key only. The old launcher contained branded enemy names, familiar character treatment, frame-based timing and one repeated layout. This replacement does not use those names, sprites, maze, music or code.

Status: implemented and unit/DOM-contract tested. Browser rendering, human playability, physical-device input/audio, FPS and latency acceptance are **pending**. No build has been pushed, merged or deployed by this scoped change.

User-facing direction: enter directly into the board; a direction starts movement. No intro screen, tutorial wall, unlock system or configuration screen. Default visible text is the small title, score, hearts and stage fraction. Help is two compact lines behind `?`; full control descriptions and state announcements are nonvisual. Restart is accessible from pause, with a short confirmation; terminal runs restart in one action.

## Sources reviewed before implementation

All sources accessed 2026-10-07, evidence level **source-reviewed**, not observed-in-game or measured-on-device.

| Source | Version / authority | Evidence used | Limits |
|---|---|---|---|
| [Arcade Game Series: PAC-MAN manual](https://dlassets-ssl.xboxlive.com/public/content/467ce1a6-5f37-4556-87c4-bc141a91051f/GameManual/61e9a9f3-c73b-4241-a1b9-0eeec5f2e1f0/ru-RU/index.html) | Bandai Namco official rerelease manual, hosted by Xbox | Four-way collection, clearing a maze, danger on enemy contact, temporary power reversal, consecutive enemy rewards and bonus collectibles | Broad genre reference only. This short manual does not establish exact 1980 timings, targeting, bugs, scoring tables or full content parity. |
| [MDN requestAnimationFrame](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame) | Browser API documentation | Use timestamp-derived elapsed time; refresh rates differ and hidden tabs can suspend callbacks | Does not prove our actual FPS or latency. |
| [MDN Pointer events](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events) | Browser API documentation | Unified pointer input, cancellation, capture/release and touch-action | Physical touch and browser-specific behavior still need testing. |
| [MDN Page Visibility API](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API) | Browser API documentation | Explicitly pause when hidden instead of simulating a large resume delta | Browser lifecycle and mobile kill/reload acceptance remain pending. |
| [Red Blob Games: Introduction to A*](https://www.redblobgames.com/pathfinding/a-star/introduction.html) | Amit Patel’s own graph-search explanation | Equal-cost grid BFS and distance fields support legal shortest paths and flee scoring | Algorithm concepts informed independently written implementation; no copied code. Enemy roles below are original design, not official reference AI. |

Repository context reviewed: `AGENTS.md`, `docs/GAME_OPERATING_STRATEGY.md`, `docs/game-profiles/pac-man.md`, original `launchPacMan`, session lifecycle and the existing test harness. Research references are not asset licenses or permission to reproduce a branded game.

## Original rules and content inventory

| Area | Implemented scope |
|---|---|
| Maps | Three original authored asymmetric 19×17 garden mazes. Every floor cell is connected to the player start. Traversable cells: 165, 163, 163. Required collectibles: 160, 158, 158. Each map has four crystals, three sentry homes, one bonus location and one paired horizontal edge tunnel. |
| Avatar / opponents | Mint diamond lantern with directional detail; three angular mechanical sentries, using different colors and armor markings. Flee uses a changed face and pale material; returning uses muted material. No yellow mouth character or ghost silhouette. |
| Movement | Automatic four-way movement once a direction is selected; persistent buffered legal turns at centers, immediate position-preserving reversal mid-edge. Walls stop at centers. Only explicitly paired edge openings wrap. |
| Timing | 120 Hz fixed simulation step. Speeds in tiles/second; frame delta accumulator. Simulation clamps a single call to 250 ms; UI clamps a stalled render frame to 100 ms. Active input timelines at 30/60/120/144 Hz are regression-tested identically. Deliberately clamped long stalls do not preserve wall-clock elapsed time. |
| Player speed | 5.4, 5.65 and 5.9 tiles/second for the three stages. |
| Enemy speed | Base 3.65, 4.0 and 4.35 tiles/second by stage; role offsets +0.2, 0 and −0.15. Flee 2.7; return 8. These are original tuning choices requiring playtest. |
| AI | Three authored route plans use 2/3/5-cell interceptor leads and 5/4.5/4-second patrol windows before each 22-second cycle's chase. Three roles: direct tracker, corridor interceptor, crystal/bonus warden. Deterministic graph-distance target choice. No reverse at ordinary junctions unless needed at a dead end; power reverses active sentries. |
| Flee / return | Crystals grant 7.0, 6.3 and 5.6 active seconds by stage. Patrol timer freezes while powered. Contact captures a vulnerable sentry; it returns home harmlessly, then waits 1.5 seconds before rejoining. |
| Scoring | Small light 10; crystal 50; consecutive captures 150/300/600, then capped at 600 while the same power window continues. Bonus 250 × stage number; clear reward 500 × stage number. |
| Bonus | Appears at 35% and 70% collection thresholds. Each appearance lasts 10 active seconds. A later threshold refreshes the one shared bonus, rather than creating a second item. |
| Lives | Three initial lives; one extra life upon reaching 6000 points, at most four total. One collision removes one life. 0.7-second death transition; reset positions preserves score, consumed items and bonus state. 1.25-second spawn protection. Enemy initial release delays 0.75, 2.25 and 3.75 seconds. |
| Progression / finish | Clear all required lights and crystals to finish a stage. One-second clear transition loads the next board; choose a direction to continue. Third clear is an explicit finite win. No endless scaling or unrelated progression. |
| Input | Arrows/WASD, 44px-minimum D-pad, continuous swipe directions after a 12 CSS-pixel threshold; P pauses. Modified shortcuts and editable text targets are ignored. No Escape override of the portal’s close control. |
| Lifecycle | Blur, hidden and pagehide pause; resume is explicit and resets frame baseline. Pending gestures/turns are cleared. Ready, paused and terminal screens stop continuous RAF scheduling. All callbacks/listeners are session-owned; cleanup saves and cancels work. |
| Storage | Versioned `np_maze_chase_v1`, exact simulation state, local best and mute preference. Periodic 2-second active checkpoints plus transitions, pause and close. Strict validation; incompatible/corrupt raw data copied to a recovery key before replacement. Failed backup or a different existing backup prevents overwrite. A changed external-tab save is not overwritten. Storage errors never block play. |
| Audio / motion | Original short sine-tone choices using supplied shared synthesizer; gesture-time initialization/resume, local and global mute, optional/failed audio safe. Reduced motion removes trails, pulse, particles and clear flash. No music or downloaded audio. |
| Accessibility | Accessible icon names, canvas description, score/life/stage/progress labels, concise live transition announcements, visible focus, minimum targets. This is not a fully nonvisual playable implementation; screen-reader and physical-input acceptance remain pending. |

## Art/audio provenance

All visual elements in `maze-chase.js` and `maze-chase.css`, map data and tone choices were authored for this repository in this change. There are no external image/font/audio/CDN requests and no new binary art files requiring an asset-manifest record. No third-party sprites, traces, sampled sounds, melodies or character names are included. Calibri-first styling follows the repository standard. This records authorship and implementation provenance, not a legal clearance opinion on the portal’s separate legacy catalog branding.

## Integration contract

Owned files only:

- `scripts/games/maze-chase-model.js` — browser `window.NP_MazeChaseModel`, CommonJS export for tests
- `scripts/games/maze-chase.js` — `window.NP_MazeChase.mount(container, session, audio)`
- `scripts/games/maze-chase.css`
- `tests/maze-chase-model.test.cjs`, `tests/maze-chase-ui.test.cjs`
- This dossier

Integrator loads CSS, then the model script, then the UI script before use. Replace the old `launchPacMan` body with:

```js
return window.NP_MazeChase.mount(container, window.NP_GameSession.start(), AudioEngine);
```

Keep exact legacy registry routing. Do not retain the old branded canvas implementation as a second running engine. Mount returns `{ snapshot, pause, resume }` for contract tests; session stop remains the lifecycle owner. No shared engine, registry, index, harness, manifest or inventory changes are included in this commit. Catalog presentation/cover branding remains the integrator’s responsibility.

## Verification record

Commands:

```sh
node --check scripts/games/maze-chase-model.js
node --check scripts/games/maze-chase.js
node --test tests/maze-chase-*.test.cjs
node --test tests/*.test.cjs
node scripts/release-preflight.mjs
git diff --check
```

Focused suite: **45 maze-chase tests passed** (24 model + 21 UI contract tests). This scoped depth update adds assertions for distinct route profiles (junction density and shortest detours), staged interceptor leads, and shorter later patrol windows. Coverage includes connected maps and reciprocal tunnel edges, buffering/reversal/wall stops, refresh-rate determinism, stalled-frame clamp, single collection/scoring, power-before-contact precedence, chained captures, home return, all three AI target roles, patrol/flee timer behavior, dead-end reversal, immunity/death/loss, both bonus rules, finite three-stage clear, one-time extra life, snapshot validation and replay, 12 deterministic adversarial-input sequences, and UI input/pause/storage/audio/cleanup contracts.

Prior aggregate checkpoint: **238/238 tests passed**, and release preflight passed (150 catalog IDs, 42 registered prototypes, 108 planned) against the then-existing launcher inventory. For this scoped depth update, both models and views pass `node --check`, and the combined maze-chase / bubble-trap model and UI suites pass **61/61 tests**. No launcher, registry, catalog or shared test support file changed. These checks do not promote either game to accepted status.

The UI harness has an existing document listener from the shared bootstrap; cleanup assertions compare against that baseline rather than misreport it as a game leak. Repeat-mount coverage checks zero game RAF/timers/listeners and all removed button listeners. Canvas calls are mocked. This is structural and behavioral evidence, **not screenshots or visual QA**.

Self-review after initial implementation checked source boundaries, fixed-step movement, reversed tunnel coordinates, collision precedence, returning-sentry stop-at-home, lifecycle ownership, paused/terminal RAF activity, corrupted-save recovery, cross-tab overwrite protection, gesture-time audio and visible text. Review resulted in stopping unused RAF work, capping DPR at 2, and explicitly stopping sentries at their home center before their wait.

## Pending release gates

- Supported browser route and real rendered inspection. The previously denied localhost/socket route is not bypassed using file/data URLs, another port or another transport.
- First-time human playtest: recognition of lantern/crystals/sentries, immediate controls, turn feel, difficulty/fairness and readable loss/continue cues.
- Full natural three-stage playthrough; fixture-driven terminal tests are not a human completion recording.
- Phone portrait/landscape and tablet touch: swipe threshold, pointer cancellation/capture, browser gesture conflicts, overscroll, focus and adequate targets.
- Desktop keyboard across Chromium/Firefox/Safari, 60/120 Hz displays, foreground/background transitions, audio suspension and resume.
- Low-end device memory, measured frame times/FPS, first-action latency, download timing and long-session resource soak.
- Screen-reader, zoom/reflow, color-vision and contrast inspection on rendered output.
- Integrated exact-route smoke test and portal catalog/asset provenance review before release.

No pending gate above is marked accepted by a Node test pass. No reference-parity, device-performance or publication claim is made.

## Integration follow-up

The launcher, index, catalog presentation and original SVG cover were wired by the integrator. The legacy ID remains only for route compatibility. Old cover omitted from the prepared site. Gates remain pending.
