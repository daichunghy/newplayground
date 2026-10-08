# Super Mario Bros. NES: high-level reference; original replacement is Vòm Mây

ID: `mario-co-dien` (historical route) · Pilot order: 9 · Updated: 2026-10-07

**Status: official high-level sources reviewed; original platformer candidate implemented; parity and distribution acceptance pending.** The user-facing title is Vòm Mây. Historical catalog ID/launcher compatibility remains; title and distribution rights require review.

## Evidence and limits

- [Nintendo UK — Super Mario Bros. (NES)](https://www.nintendo.com/en-gb/Games/NES/Super-Mario-Bros-803853.html), reviewed 2026-10-07: identifies the action/platformer and running/jumping premise; not exact physics or level data.
- [Nintendo — Iwata Asks, original developers](https://www.nintendo.com/en-gb/Iwata-Asks/Super-Mario-Bros-25th-Anniversary/Vol-5-Original-Super-Mario-Developers/1-Using-the-D-pad-to-Jump/1-Using-the-D-pad-to-Jump-212727.html), reviewed 2026-10-07: discusses early jump-input experiments; it is not a measurement of the shipped build.
- [Nintendo Support — NES Classic manual viewer](https://en-americas-support.nintendo.com/app/answers/detail/a_id/17352/p/866/c/898), reviewed 2026-10-07: the individual booklet pages were not available in this research pass.

The reference research does not establish exact acceleration, collision boxes, maps, power-up timing, enemy behavior, or jump-frame values. See `docs/games/VOM_MAY_RESEARCH_AND_SCOPE.md` for the source notes and candidate-specific deviations. No source code, art, characters, levels, fonts, or sound effects are copied.

## Original candidate

Vòm Mây is a short original cloud platformer starring a paper-kite spirit across three authored routes. Move, vary jump height by holding, ride visible wind currents, collect wind chimes, avoid wind-mites, and reach each wind arch. Each route has one checkpoint; falls and contact cost a life. It has no copied pipe/block/coin/flagpole content, character select, shop, inventory, or Nintendo music. Physics values are design choices, not reverse-engineered reference measurements.

## Implementation and gate

Model, UI, and stylesheet: `scripts/games/cloud-canopy-model.js`, `scripts/games/cloud-canopy.js`, `scripts/games/cloud-canopy.css`; authored cover: `assets/cloud-canopy-original.svg`. Eleven model and nine DOM/Canvas-double UI tests pass. Browser/device, playtest, measured feel, parity and release naming gates remain pending.
