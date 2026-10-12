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
- Files: `scripts/engines-classics.js`, Pac-Man-scoped selectors in `style.css`, `tests/pac-man-model.test.cjs`, Pac-Man router case in `tests/game-flow.test.cjs`, and `docs/game-profiles/pac-man-arcade.md`.

## Browser checks

Browser: Chromium 151.0.7922.173, headless. Errors below count both `pageerror` and browser console errors.

| Check | Setup and result | Evidence |
| --- | --- | --- |
| Before/after desktop | Same 1365×900 viewport; opened through the real catalog router. The prior generic screen had a wide, small playfield and clipped controls; the new tall board fills its 19:20 area with the D-pad visible beside it. No page/console errors. | [`before-desktop.png`](./screenshots/before-desktop.png), [`after-desktop.png`](./screenshots/after-desktop.png) |
| Before/after mobile | 390×844 viewport. The board and four 48px controls fit the visible game surface, with the D-pad stacked below the maze. No clipping was visible in the captured game surface. | [`before-mobile.png`](./screenshots/before-mobile.png), [`after-mobile.png`](./screenshots/after-mobile.png) |
| Touch input | 390×844 Chromium mobile/touch emulation; tapped the legal initial Down D-pad button. The real game score advanced to 40 over 1.4s, indicating movement through dots. | [`after-touch-mobile.png`](./screenshots/after-touch-mobile.png) |
| Power state and campaign | Opened `pac-man` from the actual route and sent browser Arrow-key events. A read-only cloned model chose routes; it did not write to the game state. Frightened ghosts were rendered after a power pellet. The campaign later reached game over at 810 points with 106 pellets still present; **it did not clear level 1 or demonstrate a browser level transition**. No page/console errors. | [`power-run.png`](./screenshots/power-run.png), [`campaign-terminal.png`](./screenshots/campaign-terminal.png) |
| Game over and retry | The campaign's real game-over overlay showed “HẾT LƯỢT”; pressing its button returned score to 0, lives to 3 and level to 1. The 810-point local record remained. | [`campaign-terminal.png`](./screenshots/campaign-terminal.png); restart counters recorded by the browser script |
| Persistence | On mobile emulation, after the touch run the game was closed and reopened in the same browser context. The 40-point record remained visible. | [`after-touch-mobile.png`](./screenshots/after-touch-mobile.png) |
| Pause/restart/close | Router integration browser-harness test and desktop smoke exercised pause/resume, restart and close; lifecycle harness found no remaining session resources. | `tests/game-flow.test.cjs` |

The controller campaign is a real-input browser check, not a human playtest. It proved pellet collection, power rendering, game over and retry but failed to reach stage progression. Treat browser progression as outstanding; the deterministic model test separately verifies dot-clear and level-2 refill.

## Automated checks

- `node --test tests/*.test.cjs`: **110 passed, 0 failed**.
- `node --check scripts/engines-classics.js`, `node --check app.js`, and `git diff --check`: passed.
- No package manifest, build script, lint script or catalog validator exists in this checkout, so none is claimed.
- Model tests verify connected maze/tunnel constraints, 60/120Hz travel equivalence, dot and power scoring/timing, legal ghost path, life loss/game over/retry, level transition/refill, and bounded later-level speed.

## Remaining limits

- Browser-play a complete first level and capture the level-2 transition; the automated route lost all three lives with 106 pellets remaining.
- No physical iOS/Android Safari or Android browser test, accessibility study, long-session performance profile, or audible/headphone audio validation.
- Maze layout, speed tuning, ghost mode schedule/personality details, fruit bonuses and audio are adapted rather than cabinet-accurate. See the [game profile](../../game-profiles/pac-man-arcade.md).
