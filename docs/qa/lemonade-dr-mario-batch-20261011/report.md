# Lemonade Tycoon and Dr. Mario gameplay batch — 2026-10-11

## Scope and source review

- **Branch:** `codex/lemonade-dr-mario-gameplay-20261011`.
- **Main baseline:** `32e50649ad182bc89e185fd6067287602874079f` (fetched and unchanged before this batch).
- **Stack base:** Bubble Trouble PR #7 at `418701cd0de44ffc8344ff7be74f0eef588c99db`. This batch does not edit another active branch's files.
- The before screenshots were captured from that stack base immediately before these game-specific edits; before/after desktop and mobile captures use the same 1365×900 and 390×844 viewports.
- Before editing, the open PRs and concurrent game-wave scope were reviewed. PR #5 covers Frogger/Asteroids/Galaga, #6 Piano Tiles and #7 Bubble Trouble; the checked distinct-game wave scope does not list Lemonade Tycoon or Dr. Mario. No existing PR claimed either of these changes.
- **Changed game code:** `scripts/engines-archetypes.js` adds an exact-ID Lemonade Tycoon market loop; `scripts/engines.js` adds a separate Dr. Mario capsule model/renderer; `app.js` routes `dr-mario-diet-khuan` ahead of the broad Mario platformer match.
- **Supporting files:** `tests/game-flow.test.cjs`, per-game reference profiles, `README.md`, `docs/GAMEPLAY_COMPLETENESS_AUDIT.md`, and `docs/GAME_COVERAGE.md`.

### Reference editions

- **Lemonade Tycoon:** the single-player PC edition attributed to Hexacto, circa 2002, identified through the 2009 PC gameplay guide [GameFAQs Lemonade Tycoon PC FAQ](https://gamefaqs.gamespot.com/pc/930814-lemonade-tycoon/faqs/57197), accessed 2026-10-11. It supports the visible planning loop of recipe, cup price, stock, location, weather/news, daily sales and cash. The guide is secondary evidence, and exact simulation formulas were not available.
- **Dr. Mario:** one-player North American NES edition, using Nintendo's [official English NES instruction manual](https://www.nintendo.co.jp/clv/manuals/en/pdf/CLV-P-NAAXE.pdf), accessed 2026-10-11. The manual describes rotating falling two-color capsules and clearing four or more same-color virus/capsule units horizontally or vertically.
- New Lemonade stand art and Dr. Mario bottle/capsules/virus art are Canvas primitives. No original game art, audio, code, maps, screenshots or ROM data was copied. Sounds call the repository's existing synthesized `NP_Audio` effects and follow its mute control.

## What changed

### Lemonade Tycoon

The former generic neon order-choice screen is now a ten-day business loop. Before opening, the player reads a local forecast/news event, chooses one of three locations, adjusts lemon/sugar/ice, price and advertising, and buys ingredient/cup packs. Opening the stand resolves demand against weather, news, recipe quality, price, stock and location costs; a compact report gives cups, missed demand, revenue and cash. Ice is discarded and leftover lemons spoil under local rules. Players can reach a cash target, exhaust their cash, start a new season and retain best cash in local storage.

The ten-day challenge, $40 start, $100 target, three locations, price elasticity, demand/cost/spoilage formulas and local records are this implementation's tuning. The PC version's modes, upgrades, vendor/employee systems, exact formulas and full campaign are out of scope. The game's natural browser season below is a Playwright-driven strategy using the visible UI, not a human balance study.

### Dr. Mario

Dr. Mario no longer opens the Mario platformer. The exact router branch now starts an eight-column, 16-row falling capsule bottle. Two-color capsules move/rotate/drop; horizontal or vertical runs of four or more same-color cells remove matching capsule halves and viruses. Unpaired halves fall after a split, then cascades resolve. Clearing viruses advances through five locally composed bottles; blocking the bottle mouth causes top-out. Restart, pause, score, local best score and keyboard/touch controls are included.

The initial arrangement is a locally authored one-drop tutorial. Later layouts, virus counts, timing, scoring and five-bottle cap are adaptations and are not represented as original NES patterns/settings. The browser play below clears bottle one and observes bottle two; stage-five victory and top-out are model-fixture checks, not natural full-campaign playthroughs.

## Browser play and evidence

**Browser:** headless Chromium `151.0.7922.173` on Debian; real static app on `127.0.0.1:8765`; routes opened through `window.openGameById`. Playwright controls the actual DOM/canvas game. Desktop viewport was 1365×900; mobile viewport was 390×844 with touch enabled. Seeded `Date.now()`/`Math.random()` in the desktop Lemonade run made its sequence repeatable.

### Lemonade Tycoon

- Before: the catalog entry displayed a generic neon-grid “Khách cần: Bánh nóng” order screen, with no lemonade recipe, stock, weather or cash-management UI.
- After, desktop: selected recipe by visible temperature, set price to $3.25, chose a weather-appropriate location, bought stock and used the on-screen “Mở quầy” and “Chuẩn bị ngày tiếp” controls for all ten days. It reached `10 / 10`, **won with $172.05**, and showed a **$177.15 best cash** record. “Chơi mùa mới” reset to `1 / 10`; close/reopen retained the $177.15 best record.
- Day 1 report in the repeatable run: five cups sold, $16.25 revenue, $25.85 closing cash. This documents one seeded outcome, not general balance.
- Mobile: tapped location, stock and open-day controls at 390×844; the stand scene measured 364×121 CSS pixels, the document stayed 390 pixels wide, and the day report appeared (six cups/$12 revenue in this separate mobile forecast).

### Dr. Mario

- Before: the Dr. Mario catalog entry showed a Mario platformer with coin blocks, a pipe and an enemy.
- After, desktop: verified `#dmCanvas` rather than a Mario/Tetris board; moved left/right, rotated clockwise/counterclockwise, and hard-dropped with Space. The authored bottle cleared and the game entered bottle `2 / 5` with eight viruses and 2030 points. Pause/resume worked. Restart returned to `1 / 5`; close/reopen restored best score 2030.
- Mobile: the 390×844 responsive bottle measured 301×430 CSS pixels (7:10 aspect ratio); the page had no horizontal overflow and visible action buttons measured at least 46×46. Touch taps moved, rotated, counter-rotated and dropped into bottle 2; pause/resume and restart worked.
- Model-only controlled fixture cleared bottle five to the victory state and verified top-out; it does not claim the browser was played through five bottles.

### Screenshot pairs

All before/after pairs use the same desktop or mobile viewport. The stage-two and result screens provide additional gameplay evidence.

| Game/state | Desktop | Mobile |
| --- | --- | --- |
| Lemonade before | [1365×900](./lemonade-before-desktop.png) | [390×844](./lemonade-before-mobile.png) |
| Lemonade planning after | [1365×900](./lemonade-after-desktop.png) | [390×844](./lemonade-after-mobile.png) |
| Lemonade day result / season win | [Day 1 report](./lemonade-result-desktop.png) · [Day 10 win](./lemonade-win-desktop.png) | — |
| Dr. Mario before | [1365×900](./dr-mario-before-desktop.png) | [390×844](./dr-mario-before-mobile.png) |
| Dr. Mario bottle 1 after | [1365×900](./dr-mario-after-desktop.png) | [390×844](./dr-mario-after-mobile.png) |
| Dr. Mario bottle 2 | [1365×900](./dr-mario-stage2-desktop.png) | — |

## Tests and limitations

- `node --test tests/*.test.cjs`: **87/87 passed**. New checks cover Lemonade planning/buys/day-once behavior and a deterministic 10-day model win; Dr. Mario deterministic setup, match/capsule detachment/cascade, top-out, stage 1→2, five-stage terminal victory and exact route. Existing game-flow mocks still open and close the 150 catalog entries; those mocks alone are not browser evidence.
- `node --check app.js`, `node --check scripts/engines.js`, `node --check scripts/engines-archetypes.js`, `node --check tests/game-flow.test.cjs`, and `git diff --check`: passed.
- This is a static vanilla app with no npm/build script, so no package build was available. Chromium console/page errors during the recorded browser run: none.
- Session close/reopen and model persistence were checked. No 60/90/120 Hz, frame-time/input-latency measurement, physical Android/iOS device, Safari, screen reader, or human natural-play balance study was run.
- Portfolio coverage remains incomplete: this set brings the title-specific work ledger to seven games; **143 of 150** titles still have no title-specific work in this effort. See [`GAME_COVERAGE.md`](../../GAME_COVERAGE.md).
