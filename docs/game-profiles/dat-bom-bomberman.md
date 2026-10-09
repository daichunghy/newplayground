# Bomberman-style reference: original candidate is Bom Vườn

ID: `dat-bom-bomberman` · Pilot order: 8 · Updated: 2026-10-07

**Status: desk research partial; original solo candidate implemented, browser/device/playtest pending.** This is not a commercial Bomberman parity or multiplayer claim.

## Evidence and limits

The [Konami Bomberman '93 PC Engine Mini manual](https://dds.konami.com/games/manual/pcemini/en_Bomber93.pdf) was reviewed as a solo-grid reference. It supports the broad bomb-placement/action loop; its complete campaign and hardware behavior are not replicated here. No commercial art, tiles, characters, levels, fonts, or sound are copied. The exact candidate rules and deviations are in `docs/games/GARDEN_BOMBS_RESEARCH_AND_SCOPE.md`.

## Original candidate

Bom Vườn is a compact single-player garden puzzle: place a timed seed-bomb, move through a small destructible grid, read the danger lane, chain blasts, collect a limited seed upgrade, and reach the exit. The candidate keeps explicit blast rules, one-life restart and a short authored campaign. It excludes multiplayer, copied level layouts/characters, stores, ads, and paid progression. It is designed as an original game informed by a mechanic category, not a full franchise remake.

## Implementation and gate

Candidate engine: `scripts/games/garden-bombs.js`; original vector cover: `assets/garden-bombs-original.svg`. Fourteen model and nine DOM/Canvas-double tests pass. Real-browser/device and playtest acceptance remain pending. No claim of commercial parity is made.
