# Vực Ngọc — reference notes and original scope

Date: 2026-10-07
Historical catalog route: `dao-vang`
Player-facing title: Vực Ngọc
Status: original local candidate; no Gold Miner affiliation or parity claim.

## Source and edition limits

The historical target is **Gold Miner by GameRival (2003 PC/Flash)**. The official [GameRival / Margarite Entertainment Steam page](https://store.steampowered.com/app/3777060/Gold_MinerClassic_Edition/) describes its 2025 Classic Edition as bringing back the 2003 internet classic, but the current edition adds four modes, bonus rounds, upgrades, enemies and new levels. The old GameRival site link is no longer accessible from this environment; the 2025 listing is not treated as documentation for every 2003 detail.

The [2004 Jay Is Games review/walkthrough](https://jayisgames.com/review/gold-miner.php) gives contemporaneous secondary evidence for the older Flash loop: a swinging claw/reel; a timed value goal per level; larger/heavier items take longer to haul. [NuMuKi’s hosted listing](https://www.numuki.com/game/gold-miner/) provides current archive controls, but it is also a secondary host page, not an official rule manual. These sources only justify a broad timing/retrieval archetype; exact physics, level contents, values and progression are not established here.

## Original candidate design

Vực Ngọc changes the setting to deep-sea exploration: a small remote probe swings a tether over a seabed, and the player releases it when the angle reaches luminous salvage. Pearls and sea glass score more; heavy sediment returns more slowly. Misses return automatically. Clear three original sites with rising point targets before each timer expires.

Three routes contain authored objects and one distinct target each. Score is awarded only on retrieval, carries between cleared sites, and current-site progress is discarded on retry. There is no miner character, western/cowboy setting, gold, claw sprite, bag, diamond, dynamite, shop, upgrade, lucky item, power potion, brand phrase, borrowed music or copied level layout. Values, tether speeds and item weights are original game-design choices, not reverse-engineered reference measurements.

Controls are intentionally brief: tap/click **Thả dây** (or Space) once when the swinging line points toward an item; a hit returns automatically. One round has no manual purchase, resupply, inventory selection, or multi-action setup. Pause, resume, reversible restart and local save/recovery are included.

## Implementation and evidence

- Model: `scripts/games/abyss-retrieval-model.js`
- Interface/session: `scripts/games/abyss-retrieval.js`, `scripts/games/abyss-retrieval.css`
- Original art: `assets/abyss-retrieval-original.svg`
- Test files: `tests/abyss-retrieval-model.test.cjs` (11) and `tests/abyss-retrieval-ui.test.cjs` (5)
- Exact run evidence: `docs/qa/abyss-retrieval-local-checks-20261007.txt`
- Unverified old images `dao_vang_cover.png` and `daovang_intro.jpg` remain in source only for provenance review and are excluded from the static site package.

Model, DOM-double and static packaging results are recorded in `docs/qa/abyss-retrieval-local-checks-20261007.txt`. They do not establish real browser rendering, touch input feel, accessibility, line-hit fairness, performance or player acceptance.

## Remaining gates

1. Open a real desktop browser and narrow phone viewport; inspect the authored art, button focus/keyboard input, touch target, resized canvas and pause/restart behavior.
2. Play all three routes; tune swing rate, hit tolerance, item value/weight, quota and timer with player feedback.
3. Re-run full tests/preflight after changes; keep old unverified art excluded.
4. Review title/route and distribution rights before any release.
