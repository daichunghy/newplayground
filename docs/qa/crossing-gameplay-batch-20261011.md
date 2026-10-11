# Crossing-gameplay batch — Frogger

**Reference:** [PixelatedArcade Frogger overview](https://pixelatedarcade.com/games/frogger/), accessed 2026-10-11. Secondary source only; no exact ROM, regional edition, cabinet setting or original timing constants were pinned. See [`docs/game-profiles/frogger-crossing.md`](../game-profiles/frogger-crossing.md) for the known scope and gaps.

## Baseline and changes

- Base SHA: `32e50649ad182bc89e185fd6067287602874079f` (`origin/main` at batch start).
- Branch: `codex/crossing-games-gameplay-20261011`; gameplay commit is recorded separately from the documentation commit.
- The dedicated Frogger loop is in parent commit `6c644abf4dc31b9754d04da599ec5581d361d540`; shared wrapping, edge behavior and hop-tween refinement are in `abaad54e385c18364d6f28432c47ce347e802556`.
- Changed Frogger rules/rendering and deterministic cases in `scripts/engines-archetypes.js` and `tests/frogger-model.test.cjs`; changed the shared mobile header sizing in `style.css` after reproducing the root layout overflow.
- At 390px viewport before the CSS fix: `innerWidth=519`, `clientWidth=390`, `scrollWidth=519`. The header search/actions intrinsic minimum width expanded the layout viewport; the Frogger modal had masked it. The header now allows those elements to shrink. At 320, 360, 390 and 430px after the fix, `innerWidth`, `clientWidth` and `scrollWidth` are equal.

## Implemented change

The Frogger board uses one 660px wrap period for drawing and collision/carry logic. A frog is carried by log collision copies across the visual edge and loses a life only after leaving the board. Hops still resolve logically immediately; a 95ms eased arc provides visual lift. No proprietary art, screenshots, code or sound were copied; the playfield is drawn from project-created vector shapes.

## Browser play record

- Browser: headless Chromium via Playwright; desktop viewport 1365×900. Mobile screenshots use a 390×844 emulated viewport.
- Opened through the real `openGameById` router. Used real Arrow keys with a route planner recalculated from the current game state to fill all five homes. Result: stage 1 clear, score 1352, three lives, all five home slots filled.
- Paused while the stage-clear transition was active. `transitionRemaining` stayed at 0.75s across a 350ms wait; resume advanced to stage 2.
- Restarted to a fresh stage 1, navigated to the median, then used an actual ArrowUp key while the model had an unsupported water landing. One life was lost with event `Rơi xuống nước`.
- Restarted three times; score, stage and lives reset each time. Local record was `{"score":1352,"stage":2}`.
- Instrumented game-owned `NP_GameSession` resources: open = 17 listeners/1 RAF; after close = 0/0; reopened = 17/1; after closing again = 0/0. No page errors.

## Screenshots

All captures are headless Chromium. Before/after pairs use 1365×900 desktop and 390×844 mobile viewports.

| View | Before | After |
| --- | --- | --- |
| Desktop | [before-frogger-desktop.png](crossing-gameplay-batch-20261011/before-frogger-desktop.png) | [after-frogger-desktop.png](crossing-gameplay-batch-20261011/after-frogger-desktop.png) |
| Mobile | [before-frogger-mobile.png](crossing-gameplay-batch-20261011/before-frogger-mobile.png) | [after-frogger-mobile.png](crossing-gameplay-batch-20261011/after-frogger-mobile.png) |

Additional browser states: [all five homes](crossing-gameplay-batch-20261011/stage-clear.png), [paused during transition](crossing-gameplay-batch-20261011/stage-clear-paused.png), [stage 2](crossing-gameplay-batch-20261011/stage-2.png), and [water loss](crossing-gameplay-batch-20261011/water-death.png).

## Verification and limits

- Focused Frogger model suite: **9/9**. This verifies the modeled wrap edges, log carry, collision, stage and hop timing; it is not a playtest.
- `node --test tests/*.test.cjs`: **56/56 passed** after implementation commit `abaad54e385c18364d6f28432c47ce347e802556`. `node --check` passed for `app.js`, `games-data.js`, the changed engine, and the three relevant test files; `git diff --check` passed.
- No package manifest or build/lint configuration exists in the repository, so no npm build or lint command is defined.
- Android/iOS physical devices, assistive technology, original cabinet controls/timing and performance benchmarks were not tested. The exact edition remains unpinned; this is not acceptance as a faithful historical recreation.
