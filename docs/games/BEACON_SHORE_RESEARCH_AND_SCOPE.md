# Bờ Kè Sao — reference research and original scope

Date: 2026-10-07
Historical catalog route: `plants-vs-zombies-2d`
Player-facing title: Bờ Kè Sao
Status: local original candidate; not accepted, released, or a claim of reference parity.

## Reference research

The official [EA / PopCap PC readme](https://akamai.cdn.ea.com/eadownloads/u/f/manuals/GAME-PVZ/en_US_readme.html) describes the broad PC loop: defend a home from staged attackers on a row/column lawn, collect and spend a resource, place defenses, and respond to waves that become more demanding. It describes failure when an attacker reaches the house, multiple lawn conditions and modes, and mouse controls for collecting the resource and placing defenses. It does not grant permission to use the game’s title, characters, art, music, or code.

The source is enough to identify the archetype and target edition. This candidate does not reproduce its distinctive plants, zombies, seed packets, resource art, characters, maps, wave tables, game modes or progression. Exact reference damage, cadence, health, and level data are not inferred from the readme.

## Original gameplay scope

Bờ Kè Sao is an original lighthouse-and-shoreline defense game. The player immediately sees five lanes of seven cells and selects a device to place on an empty cell. Three devices have small, distinct jobs: the lamp fires into its own lane, the fan slows one fog threat, and the bell damages nearby threats in that lane. Energy recovers automatically; no collectible taps, inventory, manual harvest, or upgrade menus are required. Three breaches end the run. Four fixed waves must be cleared to win.

Three original fog-shape types have different speeds and toughness. Lane-targeted defense creates a simple placement choice without a large menu or text tutorial. Values, routes and units are design-authored, not reference measurements. Pause, restart confirmation, local continuation, and corrupt/future/quota-save safeguards are included.

No copied characters, plant names, zombie silhouettes, branded objects, art, sound, music, or font assets. The new SVG cover is authored in-repository; all game visuals are simple geometric/typographic forms. `pvz_cover.png` remains in source for provenance review but is not used by the candidate and is omitted from the static artifact.

## Files and verification

- Model: `scripts/games/beacon-shore-model.js`
- UI/session: `scripts/games/beacon-shore.js`, `scripts/games/beacon-shore.css`
- Original cover: `assets/beacon-shore-original.svg`
- Model tests: `tests/beacon-shore-model.test.cjs` (15)
- UI/lifecycle tests: `tests/beacon-shore-ui.test.cjs` (6)
- Catalog route remains `plants-vs-zombies-2d` and exact engine mapping remains `launchPvZ` for compatibility.

All 15 model tests and 6 DOM-double UI/lifecycle tests pass. The full suite and preflight pass on this local candidate tree; rerun them after further changes. DOM doubles, static packaging and syntax checks do not establish real browser rendering, touch behavior, screen-reader access, difficulty fairness, measured performance or player acceptance.

Exact local run record: `docs/qa/beacon-shore-local-checks-20261007.txt`.

## Remaining acceptance

1. Run the game in a real desktop browser and a narrow phone viewport; check board horizontal access, 44px targets, focus, reduced motion and forced-colors.
2. Repeat fast/repeated placement, insufficient-energy, pause, restart-cancel/confirm, visibility, blur, close/reopen and game switching.
3. Play the complete four-wave run with new players; tune energy, lane coverage, warning visibility, device balance and difficulty using actual feedback.
4. Re-run tests and preflight after any changes, keep the old cover excluded, and review the historical title/route for distribution before release.
