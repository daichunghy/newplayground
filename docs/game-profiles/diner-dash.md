# Diner Dash PC/Windows: reference notes; original replacement is Tiệm Lá Trà

ID: `diner-dash` (historical route) · Pilot order: 10 · Updated: 2026-10-07

**Status: one official product-description page reviewed; original candidate implemented, not accepted for release or reference parity.** The player-facing catalog title is Tiệm Lá Trà. The historical catalog ID and launcher wrapper remain for compatibility; naming/distribution rights still need review.

## Evidence and limits

The official Shockwave product page identifies a Windows downloadable edition and describes mouse-directed restaurant tasks: seat customers, clear dishes, take and deliver food orders. It lists Quick Play/Career, 50 levels and 5 restaurants. It does not establish the detailed queue, timing, scoring, customer, recipe, collision, level-layout or save rules. No manual, full playthrough, code, art, fonts or audio were reviewed or copied. The page is a broad edition reference, not permission or proof of parity.

- [Shockwave — Diner Dash product page](https://www.shockwave.com/gamelanding/dinerdash), reviewed 2026-10-07
- Detailed source notes: `docs/games/TEA_SERVICE_RESEARCH_AND_SCOPE.md`

## Original candidate scope

Tiệm Lá Trà is a compact original three-shift service game. Select a waiting party and seat them at a table that fits; take the order; wait for the FIFO kitchen to prepare it; pick up and serve the correct table; then let the meal finish. Points and table turnover are automatic, so no one needs to bill customers or clean each table manually. Party size, recipe, patience, table capacity, shift timer and a three-departure limit create the timing choices. Three authored shifts use 15 arrivals, three original recipes and targets of 320, 480 and 640 points. The active shift and best score have a validated local save.

The candidate deliberately excludes branded characters or dialogue, color-match seating, two-hand carrying, manual cash handling, inventory/stock, shop/upgrades, level/campaign recreation, ads, in-app purchases, and copied music or graphics. It does not claim to reproduce the 50-level/five-restaurant reference product.

## Candidate implementation and evidence

Model/UI modules: `scripts/games/tea-service-model.js`, `scripts/games/tea-service.js`, and `scripts/games/tea-service.css`; original cover: `assets/tea-service-original.svg`. Nine deterministic model tests and six DOM-double UI/lifecycle tests pass. Browser/device acceptance, actual pacing/feel, accessibility rendering, and playtest remain pending. The doubles are not a real-browser check.

Acceptance still requires a full playthrough of all shifts, desktop and mobile browser checks, repeated pause/restart/close/reopen flows, storage quota/corruption recovery, touch/input latency and playtest. Complete the distribution-rights/title gate before release.
