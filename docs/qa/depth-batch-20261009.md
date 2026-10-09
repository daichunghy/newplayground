# Deep gameplay batch — 2026-10-09

## Scope and baseline play

The active branch started at `d18f7c0f425df540201ee6e0eb026cd855c3ebe2`; PR #2 was a draft and its remote tip matched. Before editing, both selected games were played in local Chromium at 320px touch and 1280px desktop widths. Each baseline round was won with real pointer/touch input, pause/resume and restart; the page had no horizontal overflow or browser errors.

- **Đập Chuột Chũi:** caught all 12 targets; the nine 65px mobile holes and 101px desktop holes accepted touch/click input.
- **Tìm Điểm Khác Biệt:** found all five coastal differences from both comparison images, then paused and restarted. The paired SVGs loaded and the images stacked on mobile.

These were chosen because one was a single repeated reflex sequence and the other had only one comparison scene. Both already had working win/loss loops, so the improvements extend their play instead of replacing it.

## Implemented

- **Đập Chuột Chũi:** kept the 12-target, three-miss round. Every fourth target is now gold, has a shorter response window (860/800/740ms), and awards a 200-point bonus. A clean three-hit streak raises the score multiplier up to ×3; a miss breaks the streak. The compact HUD exposes the multiplier, and the gold target has distinct art/feedback.
- **Tìm Điểm Khác Biệt:** added original `Vườn mưa` and `Chợ hoa` SVG pairs after `Bờ biển`. A course now has 15 differences across three scenes, a shared 2:30 clock, five misses, progress carry-over, and automatic scene changes. The 320px HUD now keeps the scene count, score, timer and misses on one line.
- **Xây Cầu:** added an original three-level truss builder. Players connect adjacent deck/top joints; a linear elastic pin-jointed solver tests truck loads by solving joint displacement and member tension/compression, with deflection and force limits. Levels have 4/5/6 spans and 8/10/12 braces. A failed bridge returns to build mode; undo, pause and replay are available.
- **Giao Báo:** added an original 16-second, three-lane route with six mailbox windows, cars and dogs. Lane changes and timed throws use large touch buttons or arrow/A-D and Space keys. Three missed addresses or collisions end the route.

The two new games are routed by their exact catalog IDs. Their SVG covers and all scene art are project-authored and listed in both asset registers. Release acceptance remains pending; `release_ready` is false.

## Verification

- Baseline Chromium play before edits: both selected games, 320px mobile touch and 1280px desktop; pass, with no page or console errors.
- Focused model/DOM tests: `node --test tests/bridge-builder-model.test.cjs tests/bridge-builder-ui.test.cjs tests/paperboy-model.test.cjs tests/paperboy-ui.test.cjs tests/spot-difference-model.test.cjs tests/spot-difference-ui.test.cjs tests/mole-tap-model.test.cjs tests/mole-tap-ui.test.cjs` — **32/32 pass**.
- Full Node suite: `node --test --test-concurrency=1 tests/*.test.cjs` — **1304/1304 pass**.
- Focused Chromium: Xây Cầu and Giao Báo on mobile/desktop, plus updated Spot Difference and Mole Tap tests — **3/3 pass**. The test completed a real mobile bridge build/test and a touch delivery; desktop Giao Báo accepted Space.
- Screenshot inspection: [Chuột Chũi vàng](depth-batch-20261009/mole-gold-mobile.png), [Vườn mưa](depth-batch-20261009/spot-garden-mobile.png), [Xây Cầu](depth-batch-20261009/bridge-builder-mobile.png), [Giao Báo](depth-batch-20261009/paperboy-mobile.png).
- Full Chromium suite against the current source: `playwright test --config=/tmp/newplayground-current-source.config.cjs` — **41/41 pass (2.4m)**. This includes all 65 registry routes opening/closing, 320px touch checks, the complete 3-scene Spot Difference course, Mole Tap win/replay, and the new Bridge Builder and Paperboy interactions.

## Remaining limits

No physical-device latency/balance test, novice comprehension study, assistive-technology acceptance, structural-engineering validation, or name/title-rights review was performed. The bridge solver is an intentionally small linear truss model for arcade play, not engineering advice. These limits keep both new candidates and the adjusted existing games unreleased.
