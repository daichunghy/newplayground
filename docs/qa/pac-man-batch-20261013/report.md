# Pac-Man playability follow-up — 2026-10-13

## Scope and reference

- This follow-up continues the existing Pac-Man draft PR #10 on branch `codex/pacman-gameplay-20261012`, stacked on PR #9. It does not create a second PR.
- Core objective and corner power-pellet rules are cross-checked against the licensed arcade instruction sheet linked in the [game profile](../../game-profiles/pac-man-arcade.md). Scatter/chase intervals, mode reversals, frightened timer behavior and the frightened player speed boost are cross-checked against [The Pac-Man Dossier, pages 11–13](https://cs.au.dk/~ocaprani/GameAI/PacMan/The%20Pac-Man%20Dossier.pdf).
- The project retains its original generated 19×20 maze and vector-drawn art. No proprietary maze, ROM, sprites, screenshot or recorded audio was added.

## Gameplay changes

- Added arcade-style scatter/chase windows and target corners. Level 1 uses 7/20, 7/20, 5/20 and 5/20 second scatter/chase periods before a lasting chase. Later levels use the documented longer third chase and shorter fourth scatter interval. The mode timer pauses while frightened; mode changes and a newly eaten power pellet reverse ghosts.
- Added the early-level player speed boost while frightened (12.5% on level 1 and 5.6% on levels 2–4), matching the documented relative speed relationship while retaining this adaptation's pixel units.
- Reduced adaptation ghost speed from 60 to 48 px/s at level 1; it rises by 2 per level and caps at 90. Release remains staggered at 3 seconds, then every 2.25 seconds. This was tuned after real-input controller runs repeatedly reached the final 8–34 dots but lost all lives.
- Cached the static maze layer and removed the full-page modal backdrop blur while Pac-Man is open. A two-second Chromium sample improved from 24.5 FPS (p50 33.4ms) to 59.1 FPS (p50 16.7ms, p95 16.8ms).
- The adaptation still uses its own maze, timing units, target heuristics and score values. It is not a cabinet-perfect reproduction.

## Browser evidence

The run uses Chromium through the real catalog router (`openGameById('pac-man')`) at 1365×900. A test-only script patch exposes a copied read-only state snapshot; the route planner never writes game state. It sends actual Arrow-key events. This is an automated controller playthrough, not a human playtest.

| Check | Result | Evidence |
| --- | --- | --- |
| Natural level 1 clear | Cleared all 183 dots and entered level 2 after 76.9 seconds. HUD/model score was 2,790, 1 life remained and level 2 refilled to 183 dots. The route sent 105 keyboard moves. No state fixture was installed. Other exploratory controller runs lost late in the maze; this successful automated route proves a natural state progression is reachable, not that the controller wins reliably or that a human playtest passed. | [`natural-desktop-start.png`](./screenshots/natural-desktop-start.png), [`natural-desktop-end.png`](./screenshots/natural-desktop-end.png), `natural-campaign.cjs` |
| Offline after load | With Chromium network emulation offline, the game clock advanced from 77.16 to 78.50 seconds; the open client game continued. Only the local server origin was requested during the run. | Assertions and raw values in `natural-campaign.cjs` output |
| Pause and restart | Pause held the simulation clock for 300ms; resume worked. Restart from level 2 reset score to 0, lives to 3, level to 1 and dots to 183, while retaining the 2,830 local best record. | Assertions in `natural-campaign.cjs` |
| Session cleanup and reopen | Closing the game held the old simulation clock at 0.1332 before and after a 250ms wait. Reopening through the router created a fresh level-1 game; the best record remained visible at 2,830. | Assertions in `natural-campaign.cjs` |
| Touch and responsive board | Chromium mobile emulation at 390×844: canvas measured 342.7×360.9 px, D-pad buttons measured at least 46.4×46.4 px, and tapping Down applied movement. | [`natural-mobile-start.png`](./screenshots/natural-mobile-start.png), assertions in `natural-campaign.cjs` |
| Browser errors and network origins | 0 page/console errors; requests were limited to `http://127.0.0.1:8792`. | `natural-campaign.cjs` output |
| Canvas performance | After the final Pac-Man draw-cache and backdrop CSS changes, a separate two-second desktop sample measured 59.1 FPS (124 frames, p50 16.7ms, p95 16.8ms). The natural-campaign sample after restart measured 58.6 FPS (128 frames, p50 16.7ms, p95 16.8ms). | `natural-campaign.cjs`; separate two-second Chromium RAF sample |
| Fixture-backed transition regression | The separate one-dot fixture still passes: actual keyboard input consumes the final dot, advances to level 2, resets ghosts at 50 px/s, persists the best record, then verifies close/reopen. This proves the transition wiring, not natural play. | [`transition-fixture.cjs`](./transition-fixture.cjs), [`level-2-start-fixture.png`](./screenshots/level-2-start-fixture.png) |

The run also checks desktop and mobile visuals against the project guidelines. The board remains the dominant surface, HUD counters stay visible, touch targets exceed 44px, and the D-pad is visible beside the desktop board and below the mobile board.

## Automated checks

- `node --test tests/*.test.cjs`: **113 passed, 0 failed**.
- `node --check scripts/engines-classics.js`, `node --check app.js`, all three QA script syntax checks and `git diff --check`: passed.
- The deterministic model tests and fixture-backed browser test are listed separately from the automated natural browser campaign; none is described as a human playtest.

## Remaining limits

- Only level 1 was naturally cleared. Level 2 was confirmed at its normal start state; a full level-2 playthrough was not run.
- The automated controller is not a substitute for a human playtest. No physical iOS/Android device, Safari, accessibility study or audible/headphone test was performed.
- Frame-rate results are short local Chromium samples, not a long-session performance benchmark.
