# Gold Miner 2003 PC/Flash: limited history research; original replacement is Vực Ngọc

ID: `dao-vang` (historical route) · Pilot order: 13 · Updated: 2026-10-07

**Status: original candidate implemented; exact original rules only partly verifiable; browser/device/playtest and route/title rights pending.** The player-facing title is Vực Ngọc. The historical ID is retained only for catalog compatibility.

## Reference research

- [GameRival / Margarite Entertainment on Steam](https://store.steampowered.com/app/3777060/Gold_MinerClassic_Edition/) is the developer’s current Classic Edition listing and describes it as a 2003 internet classic. The 2025 edition adds four modes, bonus rounds, upgrades, enemies and new levels; those additions are not imported as 2003 rules.
- [Jay Is Games 2004 review/walkthrough](https://jayisgames.com/review/gold-miner.php) is a contemporary independent description of the historical Flash game: a swinging claw/reel, timer and per-level value goal; heavy items take longer to haul. It is secondary evidence, not a publisher manual.
- [NuMuKi archived Gold Miner listing](https://www.numuki.com/game/gold-miner/) describes current hosted controls. This is also secondary/host information and is not treated as a definitive product manual.
- GameRival’s historic `gamerival.com` game URL is no longer accessible. No original executable, manual, source, level values, character, art or soundtrack was acquired or copied.

The record supports a broad timed tether-retrieval archetype, not enough for full measured parity. Candidate-specific differences are in `docs/games/ABYSS_RETRIEVAL_RESEARCH_AND_SCOPE.md`.

## Original candidate

Vực Ngọc replaces the prospector/mining setting with a deep-sea probe retrieving luminous pearls and sea glass. One timing action releases a tether when its line swings past a target. The line returns automatically, with sediment/large objects taking longer to retrieve. Three original sites have separate goals/timers and banked progress; no shop, dynamite, multipliers, luck items, branded treasures, gold economy or copied level layouts are included.

## Implementation and acceptance

Model/UI: `scripts/games/abyss-retrieval-model.js`, `scripts/games/abyss-retrieval.js`, `scripts/games/abyss-retrieval.css`; original cover: `assets/abyss-retrieval-original.svg`. Deterministic model and DOM-double UI tests cover simulation, routes, storage, keyboard/button launch and cleanup. Actual browser/mobile rendering, feel, tether precision and fair pacing remain to be accepted.
