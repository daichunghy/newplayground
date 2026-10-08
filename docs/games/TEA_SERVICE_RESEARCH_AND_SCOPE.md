# Tiệm Lá Trà — research and original scope

Date: 2026-10-07
Catalog route retained for compatibility: `diner-dash`
Player-facing name: Tiệm Lá Trà
Status: locally integrated original candidate; not accepted, released, or a claim of reference parity.

## Reference research

The official Shockwave listing for the original Windows downloadable Diner Dash edition describes seating customers, clearing dishes, taking and delivering food orders, and mouse-directed tasks. It lists Quick Play and Career modes, 50 levels, and 5 restaurants; it identifies PlayFirst as publisher and gameLab as developer. This is product-description evidence only. It does not specify the detailed simulation, score rules, queue/patience model, table capacities, restaurant layouts, customer types, recipes, progression rewards, or save schema, so this candidate does not claim to reproduce those details.

- [Shockwave — Diner Dash product page](https://www.shockwave.com/gamelanding/dinerdash), reviewed 2026-10-07.
- A search found an official PlayStation Portable manual for the separate Diner Dash: Sizzle & Serve edition. It was not used to define this Windows route: the edition differs, and the manual page could not be opened for inspection in this environment.
- No original game executable, manual for this Windows edition, gameplay recording, source code, artwork, typeface, character, music, or sound was used or copied.

The historical catalog ID remains `diner-dash` as a routing identifier. The player-facing title and art are original. This does not resolve naming, trademark, or distribution rights; that review remains required before release.

## Original candidate scope

Tiệm Lá Trà is a small, self-contained cozy tea-shop time-management game. Each shift schedules a handful of groups. The player selects a group, chooses a table with enough seats, takes its order, waits for a FIFO kitchen ticket, picks up the ready dish, and delivers it to the matching table. At the end of the meal, points are added and the table becomes available automatically. Patience, meal time, the shift clock, three-seat table capacity, and a departure limit create the timing choices without adding manual billing, stock, or upgrades.

The candidate contains three authored shifts, 15 arrival events, three original recipes, a fixed-step deterministic model, local continuation/best-score storage with corrupt/future-save preservation, pause/reopen, new-shift confirmation, retry, and score targets of 320/480/640 points. It uses only original vector cover art and simple interface shapes. There are no copied branded characters, dialogue, music, levels, or graphics; no ads, purchases, accounts, or paid services.

Deliberate differences from the reference description include discrete tap-to-act controls instead of directing an avatar with mouse movement, a FIFO kitchen rather than authored restaurant task sequences, only three original shifts rather than 50 levels/five restaurants, and no career upgrades or character-specific systems. Payment/points and table turnover are automatic. The page is a design benchmark, not evidence of permission or parity.

## Implementation and verification

- Model: `scripts/games/tea-service-model.js`
- UI and session: `scripts/games/tea-service.js`, `scripts/games/tea-service.css`
- Original cover: `assets/tea-service-original.svg`
- Catalog route and title: `data/games.json`, `games-data.js`, `app.js`
- Rights/provenance register: `assets/ASSET_MANIFEST.json`, `docs/ASSET_OPERATIONS_REGISTER.csv`
- Model tests: `tests/tea-service-model.test.cjs` (9)
- UI/lifecycle tests: `tests/tea-service-ui.test.cjs` (6)

Focused tests and the repository suite pass (386/386). `scripts/release-preflight.mjs --prepare` builds `.pages-site`; its checks are static consistency/syntax and packaging only. DOM doubles do not verify real browser rendering, device input, screen-reader behavior, or player feel.

## Still required

1. Review whether the legacy ID/title association is appropriate for distribution; retain original player-facing name and art unless rights are clarified.
2. Open a real browser preview and test desktop + narrow touch layout, hit targets, focus/state announcements, pause/reopen, restart cancel/confirm, blur/visibility, and close/switch cleanup.
3. Play all three shifts and tune real pacing, clarity, accessibility, and difficulty with playtest evidence.
4. Re-run full tests/preflight after changes and update the QA ledger for the exact candidate commit.
5. Keep the game a prototype until the reference edition, rights, content, device, and acceptance gates are independently satisfied.
