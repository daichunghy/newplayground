# Piano Tiles batch — Classic 50-key loop

**Reference:** The chosen scope is the Classic 50-black-tile mode described by the [App Store record for Don't Tap The White Tile! HD](https://apps.apple.com/us/app/dont-tap-the-white-tile-hd/id861890667); related rule summary and edition limits are in the [game profile](../game-profiles/piano-tiles-classic.md).

## Baseline and changed files

- Main baseline SHA: `32e50649ad182bc89e185fd6067287602874079f`. Implementation started from PR #5 head `8b4a8b9b247bba08239245183975944485a36c86`, after checking open PRs; this branch is stacked on `codex/crossing-games-gameplay-20261011` so its draft PR can contain only the Piano Tiles diff.
- Branch: `codex/piano-tiles-gameplay-20261011`.
- `scripts/engines-archetypes.js`: exact-ID four-lane Classic loop, falling rows, 50-note target, white-tile/missed-tile loss, faster pace every eight hits, four synthesized note tones, local score/time records, pause/restart, touch/pointer and D/F/J/K input.
- `tests/piano-tiles-model.test.cjs`: seeded deterministic start, hit, difficulty, white-key loss, missed-note, spawn and completion coverage.
- `tests/game-flow.test.cjs`: the generic fallback count drops from 83 to 82; confirms the title-specific board and pause/restart/cleanup path.
- README, the coverage ledger and router audit record the count change. The game profile and this report pin reference scope and limitations.
- No external game art, music or code was added. Tile graphics are rendered as simple original Canvas rectangles; note sounds use synthesized sine tones.

## Chromium checks

Headless Chromium opened the real `piano-tiles-phim-nhac` catalog route. The baseline server used `main` SHA `32e50649...`; the changed server used this branch. A QA-only response hook exposed the in-memory model to the harness; that probe is not in the repository.

- The baseline route rendered the shared reflex canvas with a circular target, reticle, lives and a generic stage objective. At a 390px mobile viewport it expanded the layout width to 519px, clipping the board and controls. The changed route rendered a portrait black/white tile board, a compact score/time/best row and two labeled controls.
- On the real input path, one desktop mouse tap and one D/F/J/K keyboard press earned two notes. Pause held elapsed time at 0.42 seconds during a 350ms wait. A stable seeded white-cell click ended the run with reason `white`; a separate seeded near-floor row ended with reason `missed`. Restart returned to 0/50.
- For full progression, the test harness read the current black-tile location but did not edit game state; it sent real mouse clicks to the canvas until the live game reached 50/50. The result was `won`, elapsed/best time `28.6165s`, and local record `{"score":50,"fastest":28.6165}`. This is a state-guided automated input run, not a human difficulty playtest.
- On mobile emulation, an actual touch tap on a visible black tile earned one note. At 320/360/390/430 CSS px, `innerWidth`, `clientWidth` and `scrollWidth` matched; board sizes were respectively 296×480, 335×544, 364×592 and 372×604 CSS px.
- Desktop board at 1365×900 measured about 388×630 CSS px and controls/status fit inside the modal. No desktop or mobile page errors occurred.
- Game-owned session resources: 4 listeners and 1 RAF while open; 0/0 after close; 4/1 after reopen; 0/0 after re-closing. Local score and fastest completion persist in `localStorage`.

## Screenshots

Before/after browser captures use the same 1365×900 desktop viewport; the mobile pair uses 390×844. The full 50-tile automated clear used a 1280×900 desktop viewport.

| View/state | Capture |
| --- | --- |
| Desktop before / after | [before-desktop.png](piano-tiles-batch-20261011/before-desktop.png) · [after-desktop.png](piano-tiles-batch-20261011/after-desktop.png) |
| Mobile before / after | [before-mobile.png](piano-tiles-batch-20261011/before-mobile.png) · [after-mobile.png](piano-tiles-batch-20261011/after-mobile.png) |
| Paused / white-tile loss / 50-key clear | [paused](piano-tiles-batch-20261011/paused.png) · [white loss](piano-tiles-batch-20261011/white-tile-loss.png) · [state-guided full clear](piano-tiles-batch-20261011/natural-50-clear.png) |

## Verification and limits

- `node --test tests/piano-tiles-model.test.cjs tests/game-flow.test.cjs`: **46/46 passed**.
- `node --check` passed for `scripts/engines-archetypes.js`, `tests/piano-tiles-model.test.cjs` and `tests/game-flow.test.cjs`.
- Natural human speed/difficulty, exact timing/lane behavior against the selected app build, physical iOS/Android, assistive technology and frame-time performance remain untested. This batch verifies the chosen rules variant, not every mode sold under Piano Tiles names.
- No CI check is configured on the parent draft branch; CI status for this stacked branch will be checked after push.
