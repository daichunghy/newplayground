# Vòm Mây: research, original scope and candidate

2026-10-07. Historical catalog ID `mario-co-dien`; the replacement is an original cloud platformer, not a licensed or parity claim for Super Mario Bros. The reference was selected as a research point only.

## Direct sources and limits

- [Nintendo UK — Super Mario Bros. (NES)](https://www.nintendo.com/en-gb/Games/NES/Super-Mario-Bros-803853.html), read 2026-10-07. Nintendo identifies the NES title as an action/platformer and describes running and jumping across platforms. Its page does not establish exact acceleration, collision boxes, level maps, power-up timing, or jump-frame values.
- [Nintendo — Iwata Asks, original Super Mario Bros. developers](https://www.nintendo.com/en-gb/Iwata-Asks/Super-Mario-Bros-25th-Anniversary/Vol-5-Original-Super-Mario-Developers/1-Using-the-D-pad-to-Jump/1-Using-the-D-pad-to-Jump-212727.html), read 2026-10-07. The official historical interview discusses early experiments with jump input and two movement speeds. These comments describe development exploration; they are not measurements of the shipping game's physics.
- [Nintendo Support — how to view NES Classic manuals](https://en-americas-support.nintendo.com/app/answers/detail/a_id/17352/p/866/c/898), read 2026-10-07. It points to Nintendo's manual viewer. The viewer exposed a language-selection shell in this research pass, not the individual Super Mario Bros. booklet pages. Detailed manual rules remain unreviewed.

No Nintendo code, art, level layouts, characters, fonts, sound effects, or music are copied. No image-search or third-party asset was used. The game's name, character, route geometry, collectible, hazards, and sound design are original project content.

## Existing implementation findings

The previous `launchMario` prototype used a short generic platform route with recognizable pipes, question/brick blocks, Goomba-like enemies, coin rewards, a flagpole and the `mario` BGM key. It was not a full Super Mario Bros. level inventory or evidence of measured NES parity. The replacement uses a unique theme and route design rather than extending those recognizable references.

## Original scope locked before implementation

Working title **Vòm Mây**. A small paper-kite spirit travels through three original cloud routes. Move, jump with variable hold height, ride visible wind currents, collect three wind chimes per route, avoid patrolling wind-mites and reach the wind arch. Each chime banks one gust charge. While airborne, spend a charge for a once-per-flight lift and short facing-direction push; landing refreshes that flight lock, and a lost life returns to the start/checkpoint without refunding a spent charge. One checkpoint sits on each route; the last arch ends the campaign. Left/right/jump plus a touch-first gust button, pause and restart are exposed. There is no character select, currency, shop, persistent item inventory, copied pipe/block/coin art, or tutorial gate.

Routes use original, hand-authored platform coordinates and wind zones. The simple HUD shows route, bells, remaining gust charges, lives and score. Art is Canvas geometry plus one in-repository vector cover. Chimes are optional oscillator tones. Exact physics numbers are design parameters for this candidate, not values measured from Nintendo's build. Coyote-time, destructible terrain, bosses and commercial progression are intentionally excluded.

## Tests required before integration

Jump press/hold/release and buffered input; horizontal acceleration/braking; platform side/landing/head collisions; authored gap traversal; wind impulses; unique bell collection, charge spending and once-per-flight gust reset on landing; locked/open gate; checkpoint; enemy contact/invulnerability; falling/lives/retry; three-stage progression; fixed-step partition determinism; save validation/recovery and legacy save compatibility; pointer/keyboard ownership/cancel; pause/restart/close/reopen; offline controls and reduced-motion/forced-colors. DOM/Canvas doubles do not replace browser/device or playtest acceptance.

## Candidate acceptance checkpoint

Current branch: `codex/quality-depth-integration-20261009`. The deterministic model, original routes, compact UI and touch/keyboard/lifecycle handling include chime-powered gust charges; all 13 focused model tests and 10 DOM/Canvas-double UI tests pass. Browser/device/playtest, measured game-feel, public preview, distribution review of the trademarked historical catalog ID, and all parity gates remain pending. The catalog surface is labeled Vòm Mây rather than suggesting an official Nintendo game.
