# Sắc Bậc — research and QA dossier

## Prototype scope

Sắc Bậc is a turn-based pyramid hopping puzzle. Move a small faceted prism across four diagonal directions to light all 28 steps on each of three color-shifted boards. A campaign-wide three-minute clock and six lives bound a run. Leaving any board edge or touching a patrol costs one life; clearing a board restores one life up to the cap. Patrol collision resolves before level completion, so the final tile does not erase a hit.

Patrols follow deterministic four-step loops at distinct rhythms. Their movement advances on valid or falling moves, making their current tile and rhythm relevant to route choice. A newly lit step awards 100 points, every hop awards 10, and clear bonuses reward finishing the campaign. Seeded patrol direction makes a run reproducible.

The user-facing name is **Sắc Bậc**. The existing catalog ID, launcher, route, and `NP_QbertPyramid` API remain stable so saved links and integration do not need migration.

## Controls and session behavior

- Touch and mouse: four on-screen diagonal buttons, each at least 48 × 48 CSS pixels.
- Keyboard: arrows map to the same four directions; Q/E/Z/C mirror the buttons; P pauses or resumes. Repeated keydown events are ignored.
- Pause and restart stay above the board. A hidden tab, window blur, or `pagehide` pauses play; resuming returns keyboard focus to the pause control.
- `NP_GameSession` owns the clock and listeners. Cleanup clears the clock and game DOM; the session removes its registered input listeners.

## Artwork and provenance

The actual game cover is `assets/covers/qbert-pyramid-original.svg`, hand-authored SVG geometry. The in-game prism and patrol markers are CSS polygons and gradients in `scripts/games/qbert-pyramid.css`; the pyramid cells and HUD are local DOM/CSS. There are no linked or downloaded character images, sprite sheets, fonts, sounds, or runtime asset dependencies in this game. The previous round, face-like hero and eyed patrol marker have been replaced by a faceted asymmetric crystal and abstract zigzag signals. The name and visuals make no claim of affiliation with an existing game.

## QA evidence

The 18 focused tests cover seven-row geometry and legal neighbors; default and explicit seed agreement; scoring and revisits; deterministic patrol rhythm; player/patrol contact; top and bottom edge falls; respawn grace; six-life terminal loss; a collision on the final tile and the recovery cue; the timer boundary; pause/resume/restart; all arrow and Q/E/Z/C keys; touch controls; three-level victory; collision and time-loss overlays; page visibility interruption; and idempotent session cleanup. UI tests also check the original title and geometry-only character styling.

Commands:

```sh
node --test tests/qbert-pyramid-model.test.cjs tests/qbert-pyramid-ui.test.cjs
node --check scripts/games/qbert-pyramid-model.js
node --check scripts/games/qbert-pyramid.js
```

Result: 18 focused tests pass; both game scripts pass `node --check`; `git diff --check` is clean. The browser smoke was run locally and is summarized below, separate from the repository unit-test harness.

Local Chromium review through the app: at 320 × 800 with touch, the stable catalog route opened as Sắc Bậc, accepted touch and keyboard input, froze its clock during a 1.1-second pause, registered an edge fall and six patrol hits, then completed all three levels with 98 real button taps. At 1280 × 900, keyboard, mouse, pause/resume, restart, and all six visible controls were checked. Both sizes had no horizontal overflow; visible buttons measured at least 44 × 44 CSS pixels; session close returned `NP_GameSession.getCurrent()` to `null`; no page errors occurred. This was a browser smoke run, not a dedicated CPU profile or real-device playtest.
