# Xe Săn Bụi — research and scope

Updated 7 October 2026. Candidate `sr1` replaces the historical `ban-xe-tang-1990` route with an original grid-rover defense game. The catalog's “Tank 1990” label does not identify a verified cartridge or ROM variant, so it is not treated as a precise reference edition.

## Official reference reviewed

- [Nintendo — Battle City Famicom Virtual Console manual](https://www.nintendo.co.jp/data/software/manual/man_FCTJ_00.pdf), official Japanese manual, reviewed 7 October 2026. The manual identifies the restored Famicom work and credits 1985; it describes the 1P/2P modes, stages, field obstacles, power-up targets, four enemy types, and construction mode.
- [Nintendo — Battle City overview](https://www.nintendo.co.jp/wii/vc/vc_bc/vc_bc_01.html) identifies the 9 September 1985 release and describes maneuvering a tank, defeating enemies and protecting headquarters. It also describes two-player co-op and stage construction.
- [Nintendo — stage rules](https://www.nintendo.co.jp/wii/vc/vc_bc/vc_bc_02.html) says the stage clears after the set enemy count is defeated and HQ destruction is a loss condition.
- [Nintendo — terrain/enemy and special-target notes](https://www.nintendo.co.jp/wii/vc/vc_bc/vc_bc_06.html) describes terrain with distinct behavior, four enemy types, and temporary special-target effects.

The official reference is Battle City Famicom (1985), not a verified “Tank 1990” cartridge/ROM. These sources establish the historical core loop; they do not authorize copying its art, maps, audio, code, title, or signature items. This candidate explicitly does not claim commercial parity.

## Original candidate scope

- Three authored 9×9 stone arenas with 4, 5 and 6 patrol drones.
- Protect a central signal core with three integrity. Drones use a simple shortest-path search toward the core; each breach removes one integrity.
- Move one grid cell per arrow/D-pad action; facing follows direction. Fire travels in a straight line until stone or a drone blocks it.
- Destroy all drones before the core is breached three times or 36 actions are spent. Score carries to the next arena.
- One player only, with an immediate first arena, compact D-pad/fire controls, and no co-op, construction mode, power-up targets, tank-upgrade ladder, shops or payments.
- Project-authored rover, abstract drone, arena layout, procedural Canvas rendering and SVG cover. No Nintendo/Namco art or music is used.

These are NewPlayground design choices. The player-facing title is Xe Săn Bụi; the old catalog ID remains only for exact routing, and permission to distribute under the historical name/route is not asserted.

## Verification and remaining gates

- `node --test tests/scrap-rover-model.test.cjs tests/scrap-rover-ui.test.cjs`: 9 model + 6 DOM-double UI tests; rerun after integration.
- Model coverage includes arena structure, movement, blocked shots, direct hits, drone pathing, core breaches, clear/loss/win, retry, saves and corrupted state.
- UI coverage checks instant play, D-pad/keyboard, Space/button fire, pause/reopen/restart, storage recovery and cleanup. Canvas/event doubles are not a real-browser rendering check.
- Browser/mobile visuals, actual controls and latency, accessibility, challenge balance, human playtest, exact Tank 1990 variant, and historical route/title rights remain pending.
