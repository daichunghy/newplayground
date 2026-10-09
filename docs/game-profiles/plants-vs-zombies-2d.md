# Plants vs. Zombies PC: high-level reference; original replacement is Bờ Kè Sao

ID: `plants-vs-zombies-2d` (historical route) · Pilot order: 11 · Updated: 2026-10-07

**Status: official PC readme reviewed; original lane-defense candidate implemented locally; browser/device/playtest and rights gates pending.** The player-facing game is Bờ Kè Sao. Its title, art and setting are original; retaining this historical route does not establish permission to distribute under the legacy name.

## Evidence and limits

The official EA/PopCap PC readme describes a grid-based lawn-defense loop with a sun resource, placed defenses, timed attackers, waves, and loss when an attacker reaches the house. It also describes multiple stages and modes, and says later rounds add enemy/defense variety. The readme supports those broad reference characteristics; it is not permission to use the IP and is not enough to recreate exact damage values, timing, layouts, AI, or the full content set.

- [EA / PopCap — Plants vs. Zombies PC readme](https://akamai.cdn.ea.com/eadownloads/u/f/manuals/GAME-PVZ/en_US_readme.html), reviewed 2026-10-07.
- No original game executable, source code, level data, textures, character art, music, or sound was copied or used to define Bờ Kè Sao.
- Scope and deviations: `docs/games/BEACON_SHORE_RESEARCH_AND_SCOPE.md`.

## Original candidate

Bờ Kè Sao is a compact five-lane shoreline defense game. Place one of three original devices on a cell: a lamp fires along its lane, a fan slows an approaching fog shape, and a bell rings for nearby targets in that lane. Energy regenerates automatically. Four authored waves contain three abstract fog-shape types; three breaches end the run. Clear the final wave to win.

The prototype intentionally avoids the reference setting and characters: no plants, zombies, sunflowers, pea shooters, seed packets, themed stages, shovel, campaign unlocks, or copied art/audio. Values and waves are original design choices, not measurements from the reference. The historical launcher/catalog identifier is retained for compatibility, with title and distribution rights still subject to review.

## Implementation and gate

- Model/UI: `scripts/games/beacon-shore-model.js`, `scripts/games/beacon-shore.js`, `scripts/games/beacon-shore.css`.
- Original art: `assets/beacon-shore-original.svg`; old unverified `assets/pvz_cover.png` is excluded from the static artifact.
- Fifteen deterministic model tests cover placement/economy, device rules, waves, loss/win, saves and fixed-step replay. Six DOM-double UI tests cover the launcher, basic controls, storage and cleanup; those doubles are not browser acceptance.
- Real desktop/mobile browser rendering, keyboard/touch input, narrow-width focus and scrolling, full playtest, visual/audio acceptance, title review, and release-rights review remain pending.
