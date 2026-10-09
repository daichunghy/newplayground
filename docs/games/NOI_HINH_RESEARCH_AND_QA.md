# Nối Hình candidate: research and QA

## Scope

This is a local original candidate for catalog ID `lat-the-tri-nho`. The catalog label suggests a familiar tile-connect game, but its exact edition, publisher, board, rules, and artwork could not be identified from the available catalog record. This candidate is named **Nối Hình** and is not presented as an exact recreation.

## General rule references

- [Tile Connect rules and tips](https://paiduika.com/en/match/lianliankan), sections “How to play” and “Rules & variants” (visited 2026-10-08): equal symbols clear when an orthogonal path travels through empty cells and turns at most twice. This page describes a one-cell empty lane around the outside edge.
- [Onet Connect rules](https://goodwebtools.com/tools/onet/), “How to use” and FAQ (visited 2026-10-08): independently describes equal pictures, empty-space paths, a two-turn limit, and an optional outside route.

Those are third-party descriptions of the general Connect / Onet family. Their timers, board sizes, scoring, hints, shuffles, animations, and other edition-specific features are not used as evidence for the unknown catalog edition.

## Candidate rules and design

- The board opens immediately on stage 1. A six-stage campaign uses 3×4, 4×4, 4×5, masked 4×5, rotated 5×4, and masked 5×5 layouts. Each layout has 64 seeded certified deals. The last board has 24 active cells and twelve pairs; the layout keeps every cell at least 44px wide at the 308px board minimum.
- Select two identical shapes to clear them. A route may use horizontal or vertical segments only, may cross empty cells only, and may turn no more than twice. A one-cell empty lane outside the board is allowed.
- When identical shapes have no valid route, the first selection stays active. Choosing a different shape replaces the selection.
- A match clears exactly two tiles. There is no gravity, timer, score, alternate mode, hint, or booster. Stages unlock in order and cleared stages can be replayed.
- Stage opens select an entry from the per-stage certified deal pool by saved deal index; the synchronous player path does not run the solver. `scripts/generate-noi-hinh-deals.cjs` builds the pool offline with a memoized solver, accepts only full-clear witnesses, and verifies every certificate before writing the data file. Its solver explores at most 4,096 remaining-pair states and 18,000 route-work units per candidate; it tries at most two candidates within an overall 32,000-work limit, then uses a seeded adjacent-pair certificate and verifies that witness.
- “Chơi lại” retries the same pool index. “Bàn mới” advances the saved per-stage index to select another deterministic deal. The version-3 local campaign save stores the current board, seed, pool index, selection, undo history and unlocks. Invalid saves are copied to a recovery key; a future save version is left untouched and never overwritten.
- If a move leaves no legal link, the game offers undo and a player-triggered reshuffle. Reshuffle is available only in that state, keeps the exact remaining symbol-pair counts, and accepts the replacement only after a full-clear witness is verified.
- Mouse and touch use the same tap/click selection. Keyboard arrows move focus through the grid, Enter or Space activates a native button, Escape clears a selection, and P pauses/resumes.
- Pausing on window blur, tab change, or page exit is reversible. The game owns listeners through `NP_GameSession` and removes its markup and host class on cleanup.
- The twelve tile glyphs and `assets/noi-hinh-original.svg` cover are hand-authored project SVG shapes. No third-party characters, names, logos, tile art, board layouts, screenshots, music, or source code are included.

## Verification

- `node --test tests/noi-hinh-model.test.cjs`
- `node --test tests/noi-hinh-ui.test.cjs`
- `node --check scripts/games/noi-hinh-model.js`
- `node --check scripts/games/noi-hinh.js`
- `node scripts/generate-noi-hinh-deals.cjs`
- `node scripts/benchmark-noi-hinh-generation.cjs --samples=500`

The model suite verifies all 384 embedded stage deals, deterministic indexed replay, witness clearing, solver and generation work limits, seed-varied fallback certificates, two-turn/outside-lane paths, selection/match/undo, malformed/future saves, stuck recovery and pair-count preservation. The DOM-double suite checks stage sizing, save/resume, retry versus new indexed deal, sequential unlock and replay, malformed/future save handling, reshuffle controls, keyboard, pause, blur/tab behavior and lifecycle cleanup. These checks do not establish visual quality in a real browser, responsive behavior on devices, screen-reader quality, actual touch targets, or input feel.

### Synchronous deal latency (desktop Node evidence)

The benchmark ran on this executor with Node v24.19.0, Linux x86_64 kernel 6.18.44, AMD EPYC 9V74 80-Core Processor (9 logical CPUs available). Exact command: `node scripts/benchmark-noi-hinh-generation.cjs --samples=500`. It warmed each layout with 30 entries, timed 500 indexed template selections and 500 offline solver deals per layout, then verified each witness. The initial UI measurement used 100 mounts in the repository DOM double; it includes synchronous stage-1 creation and rendering, but is not browser rendering evidence.

| Stage | Layout | Certified template lookup p50 / p95 / max (ms) | Pool | Distinct selected in 500 seeds |
|---|---:|---:|---:|---:|
| 1 | 3×4 | 0.002 / 0.004 / 0.034 | 64 | 64 |
| 2 | 4×4 | 0.001 / 0.003 / 0.081 | 64 | 64 |
| 3 | 4×5 | 0.001 / 0.003 / 0.042 | 64 | 64 |
| 4 | masked 4×5 | 0.002 / 0.005 / 0.114 | 64 | 64 |
| 5 | 5×4 | 0.003 / 0.005 / 0.064 | 64 | 64 |
| 6 | masked 5×5 | 0.003 / 0.007 / 0.056 | 64 | 64 |

| Stage | Offline solver / reshuffle p50 / p95 / max (ms) | Work p50 / p95 / max | Fallback rate | Distinct fallback boards |
|---|---:|---:|---:|---:|
| 1 | 0.151 / 0.422 / 1.383 | 531 / 1,470 / 2,205 | 7.2% | 36 / 36 |
| 2 | 0.300 / 0.785 / 6.007 | 1,112 / 2,368 / 6,107 | 10.0% | 50 / 50 |
| 3 | 0.524 / 1.549 / 4.742 | 2,027 / 6,284 / 18,030 | 20.0% | 100 / 100 |
| 4 | 0.416 / 1.163 / 3.109 | 1,686 / 4,907 / 12,076 | 13.0% | 65 / 65 |
| 5 | 0.512 / 1.260 / 5.594 | 2,045 / 5,041 / 19,657 | 19.0% | 95 / 95 |
| 6 | 0.802 / 1.632 / 5.680 | 3,154 / 6,466 / 20,595 | 16.0% | 80 / 80 |

Initial UI mount in the DOM double measured 0.741 / 1.571 / 6.287 ms (p50 / p95 / max). All 384 pool entries and all 3,000 offline solver deals passed witness verification. Each stage selected all 64 pool entries across 500 indexes; every fallback seed produced a distinct fallback board. The player path uses constant-size template selection (one lookup-work unit); the 32,000-work dynamic solver cap applies only to offline pool generation and reshuffle. Mobile latency, browser rendering and actual touch responsiveness remain unmeasured.

## Open gates

- Identify the exact intended edition and compare its rule set before claiming fidelity to `lat-the-tri-nho`.
- Review title and asset rights before publication. This candidate contains only newly authored generic shapes and code, but this note is not a legal clearance.
- Browser and device visual QA remains unperformed by design. Six-stage progression is a local product choice, not evidence of the unknown catalog edition's stages or shuffle rules.
