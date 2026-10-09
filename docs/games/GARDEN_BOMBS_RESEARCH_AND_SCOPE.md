# Bom Vườn: research, original scope and candidate

2026-10-07. Historical catalog ID `dat-bom-bomberman`; no licensed Bomberman or BnB claim. This is an original garden-defense game with limited research-informed mechanics. The local candidate is integrated on `codex/deep-upgrades-20261007`; the exact seven-game review checkpoint remains available at `codex/review-7games-aab7af6`. There is no public preview or release. Browser/device/playtest and release remain pending.

## Sources and limits

- [Konami, Bomberman ’93 manual](https://dds.konami.com/games/manual/pcemini/en_Bomber93.pdf), publisher-hosted English PDF, opened 2026-10-07. Search-index excerpt supports destructible obstacles, item discovery, capacity/range/speed increases, enemy diversity and a normal-mode campaign. The PDF tool recognized ten pages, but did not expose readable screenshot pixels in this session; unseen pages have not been reviewed. Exact fuse, blast propagation, enemy timings, scoring and map rules are not inferred from missing material.
- [Konami, Super Bomberman R controls](https://eu-support.konami.com/hc/en-gb/articles/9658177864855-How-do-you-control-Super-Bomberman-R-on-a-Nintendo-Switch), current support text read 2026-10-07: four-way movement and a place-bomb action; advanced throw/kick/punch controls belong to that different edition. They are not automatically imported into this project.
- [Konami, Super Bomberman R](https://eu-support.konami.com/hc/en-gb/articles/9648724483991-Super-Bomberman-R), publisher page distinguishes story/battle modes. It does not establish parity with Bomberman ’93 or rights to reuse presentation.
- [MDN Pointer Events](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events), [Page Visibility API](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API), [requestAnimationFrame](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame): lifecycle/input references previously read for this upgrade series. Real gesture and timing behavior must still be device-tested.

No external artwork, maps, characters, music, fonts or code will be copied. All new rendering uses project-authored Canvas/SVG and optional oscillator sounds. Existing datbom cover/intro and character/BGM references are unverified and will be removed from this launcher's distribution path when replaced.

## Existing implementation findings

The current 1,000-line launcher mixes Bomberman route naming with four named BnB characters, water entrapment, rescue needles, turtle power-ups, branded intro imagery, character selection and seven HUD counters. It has no isolated rule/save tests and timing values mix frames with delta-time. This is both a scope mismatch and contrary to the updated simple-play direction. Do not describe that source as faithful to either commercial game.

## Original design locked before implementation

Working title **Bom Vườn**. Original gardening robot, crates, small mechanical pests and firework bursts. One solo loop: move → place a charge → escape its cross → clear pests → use the visible exit. Only a direction pad and one action, with pause/restart icons. Fresh rounds begin immediately; optional help is one sentence. No character selection, currencies, inventory menus, needle/entrapment, equipment or tutorial panels.

- Five original, compact tile arenas, authored rather than copying commercial layouts. Floor connectivity and a safe two-turn opening escape are verified per map. No random unescapable spawn. Each round has a finite clear/exit objective; the last exit wins the campaign.
- One charge initially, range two cells, fixed fuse and explicit short blast lifetime. Solid walls stop rays before entry; crates are destroyed and stop the ray; bombs trigger once in the same chain resolution and stop that ray. All rays in one simultaneous event inspect the same obstacle snapshot so array order cannot make a blast pass through freshly destroyed crates.
- A character may leave a bomb placed under it but cannot re-enter its tile. No bomb overlap. Capacity releases exactly once upon detonation. A placed bomb's range is frozen at placement.
- A few guaranteed upgrades (capacity/range) appear from designated crates and use simple icons. No random paid/retry/loot mechanics. Freshly revealed items survive their revealing blast but an existing item hit by a later explosion is removed. Caps remain small and documented.
- Two original enemy behaviors: deterministic corridor patrol and periodic shortest-path pursuit, with distinct shapes. All movement and contact use one fixed-step simulation, no diagonal clipping or tunneling. Death takes priority over exit completion on the same step; terminal snapshots cannot mutate.
- Player movement has immediate first-step response and repeat while held. Continuous visual interpolation does not change collision outcomes. Requested turns are buffered for the next valid tile boundary; release/cancel clears only that input owner. Space is edge-triggered, independent of OS repeat. D-pad pointer gestures and keyboard have equivalent actions.
- Safe save includes seed, arena index, grid, bombs, flames, actors and clocks; future/invalid saves are preserved/recovered before replacement. Active rounds reopen paused. Visibility/blur/long-frame gaps pause rather than simulate unattended deaths. Full session cleanup is required.

Exact numbers, scoring, enemy pacing and map layouts will be project design choices recorded with implementation, not claims measured from a commercial reference. No full commercial parity or 150-game completion claim follows from this module.

## Tests required before integration

Blast walls/crates; obstacle-snapshot simultaneity; chain recursion/deduplication; capacity/range; own-bomb exit/re-entry; item reveal/destroy; spawn/escape/connectivity; enemy movement/no clipping; last-enemy + death/exit ordering; five-stage progression/rewards; frame partition equivalence; save validation/restore; key/pointer ownership/cancel; pause/restart/close/reopen and sound cleanup. Browser/mobile/game-feel acceptance remains separate from Node/DOM/Canvas doubles.

## Candidate implementation checkpoint

- Original Canvas board, garden robot, pests, crates, gate, flame and two upgrade icons; no external art/audio/font/code. Static render still needs browser review for small-screen contrast and visual legibility.
- Five compact authored stages. Keyboard arrows/WASD/Space, held touch d-pad and place action, pause/restart, reversible restart confirmation, stage continuation, retry, and local-save recovery are implemented.
- Local checks: 14 deterministic rules/save tests and 9 DOM/Canvas input/lifecycle tests pass. Full local suite passes 348 tests; release preflight passes 150 catalog IDs, 42 prototypes and 108 planned records. These checks do not establish browser/device playability, correct behavior on real pointer hardware, or player acceptance.
- The implementation is integrated on the local candidate branch; the seven-game checkpoint is preserved separately. No public ref or PR exists for this candidate; it has not been deployed or declared accepted.

### Remaining acceptance evidence

1. Open the public review build on desktop and a narrow mobile viewport; verify the board scales, tiles/pests/flames remain distinguishable, buttons stay reachable, and help/restart overlays do not hide controls.
2. Play all five stages, including an intentional chain blast, a death/retry, a gate unlock and a campaign win. Repeat open/close/switch/reopen and check that no input, RAF, or sound leaks into another game.
3. Test touch drag/release/cancel, simultaneous keyboard and touch ownership, tab/blur/long-frame pause, local-save restoration, and reduced-motion / forced-colors.
4. Record browser/device build and exact observations. Keep every release gate pending until evidence is observed; this candidate is not a Bomberman or BnB parity claim.
