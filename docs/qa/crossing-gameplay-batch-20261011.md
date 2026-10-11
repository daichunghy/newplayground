# Crossing game batch — 2026-10-11

## Scope

- Base SHA: `32e50649ad182bc89e185fd6067287602874079f` (`origin/main` at checkout).
- Branch: `codex/crossing-games-gameplay-20261011`.
- Game changed: `frogger-ech-bang-qua-duong` only.
- Implementation scope: `scripts/engines-archetypes.js`; deterministic model tests in `tests/frogger-model.test.cjs`; catalog-completeness update in `docs/GAMEPLAY_COMPLETENESS_AUDIT.md`; this report and four browser screenshots in this directory.
- The working tree was clean before the batch. Existing app routing and global styles were left intact.

## Gameplay and art direction

The Frogger loop now has a 11-by-11 crossing: four traffic lanes, a safe median, four river lanes with moving logs, and five target slots. The player moves one cell per hop, scores for new forward progress, loses lives to traffic, water or the timer, and clears a stage by reaching all five slots. Later stages shorten the timer and increase lane speed. Scores and highest stage persist locally; pause, restart, keyboard, touch buttons and canvas swipe/tap are supported.

The rules were cross-checked against the broad Frogger description in [PixelatedArcade's game overview](https://pixelatedarcade.com/games/frogger). The overview supports the crossing, traffic, river-platform, five-home and timed-life structure; it does not establish an exact historical version or timing. This implementation uses original canvas-drawn shapes and does not copy game assets.

## Browser evidence

The screenshots were captured from the local app in headless Chromium at 1365×900 and 390×844. “Before” shows the previous generic grid/runner treatment; “after” shows the dedicated crossing board and compact controls.

| View | Before | After |
| --- | --- | --- |
| Desktop | [before-frogger-desktop.png](crossing-gameplay-batch-20261011/before-frogger-desktop.png) | [after-frogger-desktop.png](crossing-gameplay-batch-20261011/after-frogger-desktop.png) |
| Mobile viewport | [before-frogger-mobile.png](crossing-gameplay-batch-20261011/before-frogger-mobile.png) | [after-frogger-mobile.png](crossing-gameplay-batch-20261011/after-frogger-mobile.png) |

Chromium interaction checks: desktop ArrowUp and an emulated mobile touch tap each scored 10 without losing a life; a CDP touch swipe on the board advanced once more to 20. Pause/resume updated its action label; restart returned score to zero; the saved best score was `{"score":10,"stage":1}`; closing the game restored the modal's prior inline geometry; no page errors occurred. In the 390px mobile context, the clamped game modal was 390px wide, the board was about 372px wide, and all six controls measured about 57.8×48px.

The existing page shell has an unrelated horizontal layout overflow in this mobile emulation (`innerWidth=519`, `clientWidth=390`, `scrollWidth=519`). While Frogger is open, its modal is clamped to the 390px client viewport and the original modal inline geometry is restored on close. Physical iOS/Android devices and assistive technology were not tested.

## Verification

- `node --test tests/frogger-model.test.cjs`: 6/6 passed.
- `node --test tests/*.test.cjs`: 44/44 passed, including all 6 Frogger model tests and 38 existing flow/regression tests. After tightening the extra-life cap case, the 6 Frogger model tests were rerun and passed again.
- Browser checks above passed in Chromium desktop and mobile emulation.
- Syntax checks passed for `app.js`, `games-data.js`, all `scripts/*.js`, and the Frogger model test. Catalog consistency passed: 150 unique IDs and Frogger's ID is present. No build or lint script is defined in this vanilla JS project.
- These checks cover Frogger and router/lifecycle regressions; they do not represent playtesting or completion of the remaining catalog games.
