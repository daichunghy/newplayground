# P1A production gap review

Updated 2026-10-08 against the local integration checkpoint c6793ea086f89f87590b3504095b6d189c7053c5. This review separates implemented mechanics from evidence needed before calling a game production-ready.

## Current evidence

- The catalog has 150 IDs, 50 exact launchers, and 100 planned entries. The 50 launchers are still prototypes; none has an accepted release scope or complete-reference-parity claim.
- The four P1A model and controller/UI-double suites pass 182/182 tests locally. These checks cover deterministic rules, save validation, input cancellation, session cleanup, and many edge cases.
- A PR-only, read-only Chromium workflow is prepared locally. It has not been pushed or run. The attempted owned-local preview reached net::ERR_BLOCKED_BY_CLIENT before the Python server logged a request, so real-browser, device, and human-playtest results remain unavailable.
- All eight release gates remain pending for each P1A game: reference parity, content, controls, visual/audio, device QA, save recovery, playtest, and distribution rights.

The tests support confidence in code contracts. They do not prove rendered layout, actual touch behavior, accessibility-tree quality, input latency, performance, player comprehension, or legal permission to publish.

## Game-by-game gaps

| Game | Implemented scope and local evidence | Concrete production gap |
|---|---|---|
| Dò Mìn | Four presets (including a separately named phone board); safe first opening; flag, chord, win/loss, pause, stats, resume, and recovery. Model/UI tests cover board boundaries, invalid flags/chords, corrupted saves, and repeated restart cleanup. | The opening browser smoke only clicked one safe cell. The added end-to-end scenario covers active-save resume, a deterministic final-safe-cell win, and restart, but is unrun. Physical touch/pan, narrow expert-board navigation, screen reader and zoom remain unverified. First-click safety is not a no-guess guarantee, and the selected scope intentionally does not claim one. |
| 2048 | Pinned original source reference; complete 4×4 merge/spawn/score/win/continue/loss loop, validated resume/best-save, keyboard/swipe/D-pad, and reduced-motion behavior. Model tests compare 5,184 line/direction cases plus 4,000 full-board cases against independent oracles. | Browser smoke previously checked only a legal D-pad move. A deterministic merge-to-2048, continue, and full-page reload scenario is now added but unrun. Real touch thresholds, zoom/scroll interaction, animation/input feel, and save behavior under actual browser storage errors still need browser/device review. |
| Line 98 | Explicit NP Classic 1 variant: 9×9, seven colors, shortest four-way paths, four-axis clears, documented scoring, preview, one-step Undo, and save recovery. | This is a documented independent variant, not exact parity with an unidentified catalog edition. Browser smoke previously stopped after ball selection. The added scenario performs a real reachable move and Undo but is unrun. Narrow-screen board panning, color-plus-shape recognition, reduced motion, and novice comprehension need device/player review. |
| Hàng Rong | Original instant-play stall loop: cook then serve, automatic ready-dish collection and stock support, staged menus, five districts, pause, and versioned save recovery. 35 focused model/UI-double checks cover service, progression, replay, and lifecycle. | There is no confirmed historical/commercial reference edition; this is original game design. Browser smoke previously checked only cook-button response. The added scenario waits for an actual cook completion and serves the first customer but is unrun. Real-player shift balance, progression pacing, and touch layout at 320px remain unknown; deterministic simulation speed is not evidence of human progression time. |

## Ordered acceptance work

1. **Run the prepared Chromium suite on an authorized preview.** Require the 50 route open/close loop, all four P1A gameplay scenarios, console/request checks, and 320/360/768/1280 width checks to pass. If the supported browser still blocks the preview, keep this gate pending and record the exact error.
2. **Test on actual devices.** At minimum, one current iPhone/Safari and one Android/Chrome, plus keyboard-only desktop. Exercise touch cancellation, scroll/pinch, restart/close/reopen, reduced motion, first audio interaction, and storage-denied recovery. Record device, OS, browser, build, steps, and evidence.
3. **Run focused playtests.** Have new and experienced players attempt one complete loop per game without spoken coaching. Record time-to-first-action, confusion points, completion/retry, and whether the result feels fair. Adjust only where observed; do not add setup screens or management chores without evidence.
4. **Resolve release rights and naming.** Keep original artwork/code provenance attached to each package. Confirm rights for every route/title and included asset before any production listing or distribution. A local MIT code license does not grant rights to third-party game names or editions.
5. **Update evidence per exact commit.** Only change a release gate from pending with recorded, repeatable evidence. Re-run affected tests after code or scope changes; do not infer browser/device acceptance from the Node suite.

## Local browser scenario added

tests/browser/portal.spec.cjs now supplements the route and responsive smoke checks with:

- Minesweeper: restore a valid pocket save, resume, reveal the last safe cell, verify win, then restart.
- 2048: merge 1024 + 1024, continue, reload the page, and verify the active state remains playable.
- Line 98: select a ball, move to a reachable cell, then Undo.
- Hàng Rong: cook the deterministic first order, wait for automatic tray collection, then serve its customer.

The fixture logic was checked against the pure game models. The browser scenarios themselves are not yet run; no screenshots or runtime acceptance are claimed.

## Local Chromium update — 2026-10-09

This update supersedes the earlier “unrun” status for the covered browser scenarios above. Against the prepared static site, Playwright 1.63.0 with Chromium 151 passed all 21 browser tests: every one of the 51 registered routes opened and closed, the four P1A play loops ran, viewport and mobile-emulation checks passed, and the error/request monitors stayed clear. A new 320px scenario confirms Dò Mìn's larger board and Line 98 both expose a 44px pan button only when the board overflows; it scrolls between both edges and disappears when the content fits. Node regression passed 1,146/1,146 tests, and release preflight still reports 150 catalog IDs, 51 prototypes and 99 planned.

This is local Chromium and emulated touch evidence. Physical iOS/Android, screen-reader output, novice-player comprehension, performance on target hardware, reference parity, and rights review remain pending. GitHub Actions will re-run checks after the PR update is pushed.
