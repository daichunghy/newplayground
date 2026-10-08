# Khối Đá Lăn — original candidate `kdl1`

Updated 8 October 2026. Candidate for catalog route `bloxorz-khoi-da-lan`, batch item 41. The player-facing title is **Khối Đá Lăn**. The historical catalog label is retained only as route context; permission to distribute under that name or route has not been established. This candidate does not claim Bloxorz parity or endorsement.

## Source and version record

| Source | Version/date evidence | Use and limits |
|---|---|---|
| [Shockwave: Bloxorz game listing](https://www.shockwave.com/gamelanding/bloxorz) | Official host listing, accessed 8 October 2026. Credits the game to DxInteractive. It describes arrow-key movement, a square-hole goal, avoiding the edge, and a 33-level scope with switches and bridges. No executable build/version is identified on the listing. | Source-reviewed for the broad rolling-block puzzle loop and attribution only. The candidate does not reproduce the source’s levels, switch symbols, tile art, UI, text, audio, or code. |
| [Coolmath Games: Bloxorz instructions](https://www.coolmathgames.com/0-bloxorz/1-strategy-games-01.html) | Official host player-instructions page, accessed 8 October 2026; page metadata lists an update on 16 July 2026 and developer Damien Clarke. No binary/build identifier is stated. | Cross-check for the broad distinction between standing/lying footprints, edge falls, and a standing block entering the target. The candidate does not reproduce its marked switches, fragile-tile symbols, teleport mechanic, passcodes, levels, or instructions. |

The selected catalog edition is unresolved. There was no direct source-game playthrough, executable inspection, or device measurement for this candidate. Evidence status is `source-reviewed`; it is not `observed-in-game`, `measured-on-device`, or `implemented-and-accepted` against a reference.

## Original scope

- A deterministic grid model rolls one block in four directions. Upright blocks occupy one cell; horizontal and vertical poses occupy two adjacent cells.
- Every occupied cell must be a stone tile, a safe stone bridge, or the goal tile. If any part leaves supported floor, the block falls back to the current level start; the move and fall are counted and the move can be undone.
- The goal is completed only when the block is upright on the marked hole. Lying across the goal does not finish the puzzle.
- Ten hand-authored layouts with a rising solver-verified shortest route: **Mầm Rêu** (3 moves), **Bậc Mây** (5), **Vành Sao** (12), **Cổng Rêu** (15), **Hốc Sương** (17), **Đá Lượn** (18), **Vệt Trăng** (19), **Bờ Đá** (20), **Mạch Nước** (22), and **Đỉnh Mây** (23). Their row maps and dimensions are authored for this candidate and are not transcribed from a source game.
- Keyboard arrows and large on-screen direction buttons act immediately. `Z` or Hoàn tác undoes one move. Chơi lại resets the current level. Completing a stage unlocks the next; any unlocked stage can be replayed. The per-stage shortest route is shown as a compact move target, and a personal best move count is retained locally.
- Saved progress contains only the unlocked stage count and best move counts. Missing, malformed, or unavailable local storage starts a fresh campaign and does not block play.
- Original tile/block treatment is drawn in `scripts/games/khoi-da-lan.css`; there are no external images, fonts, audio, or downloaded assets.

## Verification

Focused tests: 7 deterministic model tests and 6 DOM-double UI/input/lifecycle tests pass with `node --test --test-concurrency=1 tests/khoi-da-lan-model.test.cjs tests/khoi-da-lan-ui.test.cjs`. A breadth-first search verifies that every stage has a route whose length matches its authored target. Deterministic transition properties check legal footprints and reversal in all three orientations. Campaign tests cover sequential unlocks, replay, best-score retention, storage recovery/failure, falls, undo, and restart.

The model test uses breadth-first search to confirm each authored layout has a route to its upright goal, then plays that route through the model. UI doubles check board labels, target/gap/bridge rendering, keyboard and button inputs, falls, undo, restart, direct level selection, next-level behavior, and inert stale events after cleanup.

No real-browser, mobile-device, touch-hardware, screen-reader, visual-layout, or player-acceptance QA was run. Solver difficulty has not been validated with human players. No public preview, PR, integration merge, or deployment is part of this candidate.

## Integration and rights gate

The local integration loads `scripts/games/khoi-da-lan-model.js` before the engine wrappers and loads the view/CSS with the app. The exact `bloxorz-khoi-da-lan` route maps to `launchKhoiDaLan`; the old Bloxorz launcher is removed. The inherited `assets/bloxorz_cover.jpg` remains in source with unknown provenance and is excluded from the prepared release artifact.

Before a public release, review the legacy catalog route/name. No source-game code, map, level, symbol set, or graphic was copied into this candidate. This local integration does not establish browser/device acceptance or title/route rights.
