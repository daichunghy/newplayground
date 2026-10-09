# Batch-four game delivery — 2026-10-09

These additions are playable prototypes. The catalog titles are identifiers; none of the implementations claims parity with an unreviewed commercial release or is release-certified.

## Playable additions

- **Cắt Dây Cho Ếch Om Nom** (`cut-the-rope`): three authored rope-and-candy stages with pendulum timing, swipe/button cuts, stars, hazards, receiver targets, score, win/loss, pause and replay.
- **Pinball 3D Space Cadet** (`pinball-3d-space-cadet`): original orbit table, six scoring targets, three balls, held flippers, launch, pause and restart. Keyboard and touch controls share one fixed-step physics model.
- **Typer Shark Luyện Gõ** (`typer-shark`): nine authored words over three waves, word and round deadlines, score, three misses, pause and replay. Supports physical letters and a 26-key on-screen keyboard with 44px minimum controls.
- **Nhảy Bậc Kim Tự Tháp** (`qbert-nhay-khoi-lap-phuong`): three 28-tile levels, four diagonal hops, turn-based patrol hazards, lives, timer, score, pause and replay. Four 48px touch directions complement Q/E/Z/C and arrow-key input.

Each game has separate model, view and scoped CSS files, an exact launcher, original cover art, focused model/UI tests and a research/QA dossier. Game sessions release their animation, timer and input handlers on close.

## Existing game improvements

- **Dò Mìn:** the new hint analyzes visible clue constraints, including pairwise subset deductions. It highlights a square only when those clues prove it safe, never guesses and never opens the square automatically. The player still makes the move.
- **2048:** one-step undo restores the prior board, score and move count and reuses the recorded random draws for an exact replay. Version 2 saves support undo; version 1 saves still restore. A move that creates a terminal result can be undone.

## Catalog and art records

The exact registry now routes 69 prototypes; 81 of the 150 catalog entries remain informational planned entries. The four new covers have manifest and operations-register records. The operational inventory and research backlog were regenerated from the exact registry.

## Verification

- `node --test --test-concurrency=1 tests/*.test.cjs` — **1,354 passed, 0 failed**.
- `playwright test --config=/tmp/newplayground-current-source.config.cjs` — **44 passed** against local Chromium. Coverage includes all 69 routes opening/closing; the four new games taking real mobile and desktop input at 320px and 1280px; pause, restart and session cleanup; Minesweeper hint-without-auto-open; and 2048 undo.
- `node scripts/release-preflight.mjs --prepare` — static consistency passed with 150 catalog entries, 69 prototypes and 81 planned entries. This checks source syntax, exact launcher mappings, loaded files, asset manifest paths and the prepared static artifact; it does not certify game rules or asset title rights.
- `git diff --check` — clean.
- Local Chromium screenshots of the new mobile game panels were inspected at 320px after the responsive pass. This is an emulator check, not a physical-device or human playtest.

## Still open

No physical touchscreen, novice comprehension, long-session performance or human difficulty study was run. Fixed-step determinism and browser lifecycle tests are evidence for correctness, not device performance measurements. The catalog's historical names and release rights still require their separate review; the new art is project-authored original SVG.
