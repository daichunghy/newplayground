# Pac-Man batch QA — 2026-10-12

## Build and reference

- Branch: `codex/pacman-gameplay-20261012`, based on Snow Bros PR #9 head `e56bf05a2a79e4984a92863fd9ce397efd631585`.
- Repository main baseline observed before edits: `32e50649ad182bc89e185fd6067287602874079f`.
- Pinned gameplay reference: Namco's 1980 PAC-MAN/PuckMan history ([Bandai Namco](https://en.bandainamcoent.eu/pac-man)); core dots, corner power pellets, temporary frightened ghosts, life loss and next-level reset were cross-checked against a licensed arcade-classics instruction sheet ([Basic Fun PDF](https://www.basicfun.com/wp-content/uploads/2023/03/9530_ArcadeClassics_Pacman4C_Instructions_CustomerService.pdf)). This is an original maze-chase adaptation, not an exact cabinet recreation.
- New maze, vector drawing and effects are generated in the project. No ROM, commercial maze, proprietary sprite, screenshot or recorded audio is included.

## What changed

- Replaced the generic Pac-Man route with an original 19×20 maze-chase model: buffered/reversible grid controls, tunnel wrap, four pathfinding ghost personalities, frightened mode, score/lives/extra life, terminal loss, retry and repeatable level progression.
- Added a distinct Pac-Man visual treatment and 19:20 board, compact score/level/dot/life HUD, desktop side controls and mobile D-pad/swipe controls.
- Added best-score/best-level persistence with a storage-failure guard, pause-on-hidden-tab behavior and game-session cleanup.
- Browser-driven balance adjustment after repeated real-input routes lost late in level 1: ghost release is staggered by 1.75 seconds, starting ghost speed is 88 px/s (rising by 3 per level, cap 116), and level-1 frightened time is 7.5 seconds. These are adaptation values; no cabinet timing is claimed.
- Files: `scripts/engines-classics.js`, Pac-Man-scoped selectors in `style.css`, `tests/pac-man-model.test.cjs`, Pac-Man router case in `tests/game-flow.test.cjs`, `docs/game-profiles/pac-man-arcade.md`, and the isolated manual fixture runner `transition-fixture.cjs`.

## Browser checks

Browser: Chromium 151.0.7922.173, headless. Errors below count both `pageerror` and browser console errors.

| Check | Setup and result | Evidence |
| --- | --- | --- |
| Before/after desktop | Same 1365×900 viewport; opened through the real catalog router. The prior generic screen had a wide, small playfield and clipped controls; the new tall board fills its 19:20 area with the D-pad visible beside it. No page/console errors. | [`before-desktop.png`](./screenshots/before-desktop.png), [`after-desktop.png`](./screenshots/after-desktop.png) |
| Before/after mobile | 390×844 viewport. The board and four 48px controls fit the visible game surface, with the D-pad stacked below the maze. No clipping was visible in the captured game surface. | [`before-mobile.png`](./screenshots/before-mobile.png), [`after-mobile.png`](./screenshots/after-mobile.png) |
| Touch input | 390×844 Chromium mobile/touch emulation; tapped the legal initial Down D-pad button. The real game score advanced to 40 over 1.4s, indicating movement through dots. | [`after-touch-mobile.png`](./screenshots/after-touch-mobile.png) |
| Natural controller campaign | Read-only clone chose routes; real Arrow-key events drove the game through the catalog route. Frightened ghosts rendered after a power pellet. After the opening ghost-release/speed tuning, the route collected 181/183 dots and then reached “HẾT LƯỢT” at 2,170 points with 2 dots left. The clone score and HUD score matched; no page/console errors. This is automated play and it did not naturally clear the level. | [`power-run.png`](./screenshots/power-run.png), [`campaign-terminal.png`](./screenshots/campaign-terminal.png) |
| Browser level transition with isolated fixture | `transition-fixture.cjs` intercepts only the QA page's engine script response and installs a one-use level-1 state with one reachable dot, score 1,270 and 2 lives. It then opens Pac-Man through `openGameById('pac-man')`, sends the real Arrow-key input, and lets the actual engine consume the last dot and advance. At level 2, browser DOM and live state show score 1,280, 2 lives, 183 refilled dots, four reset ghosts at spawn, ghost speed 91 (level 1 speed 88), and saved best level 2. No state is mutated after the fixture is installed. | [`transition-fixture-start.png`](./screenshots/transition-fixture-start.png), [`level-2-start-fixture.png`](./screenshots/level-2-start-fixture.png) |
| Game over and retry | The natural campaign's real game-over overlay showed “HẾT LƯỢT”; pressing its button returned score to 0, lives to 3 and level to 1 while retaining the local record. | [`campaign-terminal.png`](./screenshots/campaign-terminal.png); counters recorded by the browser runner |
| Persistence | On mobile emulation, after the touch run the game was closed and reopened in the same browser context. The 40-point record remained visible. | [`after-touch-mobile.png`](./screenshots/after-touch-mobile.png) |
| Close/reopen cleanup and persistence | After the fixture-backed level-2 state, closing the game stopped its simulation clock (the sampled clock was identical before close and after a 250ms wait). Reopening through the router began a fresh level-1 game at score 0, 3 lives and 183 dots; record 1,280 and best level 2 persisted. No page/console errors. | [`reopened-after-level-fixture.png`](./screenshots/reopened-after-level-fixture.png); raw values asserted in `transition-fixture.cjs` |
| Pause/restart | Router integration browser-harness test and desktop smoke exercised pause/resume and restart. | `tests/game-flow.test.cjs` |

The fixture-backed test proves the actual router's browser transition and reset contract; it is **not** a natural full-level completion or a human playtest. The unassisted deterministic controller still lost two dots short of level clear. Treat ordinary full-campaign playability as a remaining game-feel check.

## Automated checks

- `node --test tests/*.test.cjs`: **110 passed, 0 failed**.
- `node --check scripts/engines-classics.js`, `node --check app.js`, and `git diff --check`: passed.
- No package manifest, build script, lint script or catalog validator exists in this checkout, so none is claimed.
- Model tests verify connected maze/tunnel constraints, 60/120Hz travel equivalence, dot and power scoring/timing, legal ghost path, life loss/game over/retry, level transition/refill, and bounded later-level speed.

## Remaining limits

- A natural/less-assisted first-level playthrough is still missing; the state-fixture transition test must not be represented as a natural campaign clear.
- No physical iOS/Android Safari or Android browser test, accessibility study, long-session performance profile, or audible/headphone audio validation.
- Maze layout, speed tuning, ghost mode schedule/personality details, fruit bonuses and audio are adapted rather than cabinet-accurate. See the [game profile](../../game-profiles/pac-man-arcade.md).
