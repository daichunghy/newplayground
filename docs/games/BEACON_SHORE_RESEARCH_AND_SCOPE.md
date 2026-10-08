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
- Model tests: `tests/beacon-shore-model.test.cjs` (19)
- UI/lifecycle tests: `tests/beacon-shore-ui.test.cjs` (6)
- Catalog route remains `plants-vs-zombies-2d` and exact engine mapping remains `launchPvZ` for compatibility.

The 2026-10-07 local run record below documents 15 model tests, 6 DOM-double UI/lifecycle tests, the full suite and preflight on the earlier tree. The current scoped iteration has its own focused results below. DOM doubles, static packaging and syntax checks do not establish real browser rendering, touch behavior, screen-reader access, difficulty fairness, measured performance or player acceptance.

Exact local run record: `docs/qa/beacon-shore-local-checks-20261007.txt`.

## 2026-10-08 wave-composition iteration

Wave 4 keeps its nine spawn ticks and total count. Its first seven arrivals now form a gust rush in lane 3; the last two arrive as a cloud in lane 2 and a mist in lane 5. The earlier waves, enemy stats, board, energy rules and UI are unchanged. Keeping the schedule clock intact lets a version-one mid-wave save resume while new arrivals follow the revised route.

The model-policy comparison is deterministic:

- One lamp in each lane (5 placements, 225 energy) loses with 22 of 27 threats cleared.
- Four lamps plus a Bell on lane 3 (5 placements, 250 energy) clears all 27 threats with all 3 lives and score 408. The Bell rings 10 times during the run.
- A route-aware lamp-only stack (6 placements, 270 energy, with its second lamp on lane 3) also clears all 27 with all 3 lives and score 408, about 248 simulation ticks sooner. The Bell plan saves a placement and 20 energy, at the cost of a slower clear; it is an alternate area-damage strategy, not a strict win over lamp stacking.
- Uniform Fan-only and Bell-only plans lose before the end, confirming that those devices support lane coverage rather than replacing damage.
- In a six-device mixed variant, putting the Fan ahead of the Bell on the rush lane produces 15 slow activations; placing it behind produces 2. Both variants clear with the same score and lives, so this is a placement-timing choice without a claimed outcome advantage.

Focused verification for this iteration: 19 model and 6 UI/lifecycle tests pass. The full repository suite and static release preflight have not been rerun on this iteration. These model and DOM-double results do not establish browser rendering, device input, accessibility, difficulty fairness or player acceptance.

## Remaining acceptance

1. Run the game in a real desktop browser and a narrow phone viewport; check board horizontal access, 44px targets, focus, reduced motion and forced-colors.
2. Repeat fast/repeated placement, insufficient-energy, pause, restart-cancel/confirm, visibility, blur, close/reopen and game switching.
3. Play the complete four-wave run with new players; tune energy, lane coverage, warning visibility, device balance and difficulty using actual feedback.
4. Re-run tests and preflight after any changes, keep the old cover excluded, and review the historical title/route for distribution before release.
