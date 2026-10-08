# Cá Lớn Nuốt Cá Bé — research and original scope

Date: 2026-10-07. Catalog ID: `feeding-frenzy`. The source-era build is not identified, so this candidate documents the broad arcade loop and does not claim exact-edition parity.

## Reference evidence

- [EA — Feeding Frenzy](https://www.ea.com/games/feeding-frenzy/feeding-frenzy), official product page reviewed 2026-10-07. EA describes playing as one of five sea animals, eating smaller fish, and growing larger. The page references an Xbox 2006 release; that is not evidence of the catalog game's edition or exact rules.
- [EA — Feeding Frenzy 2](https://www.ea.com/games/feeding-frenzy/feeding-frenzy-2), official product page reviewed 2026-10-07. This is a distinct sequel and only corroborates the broad smaller-prey/larger-predator arcade pattern.
- [EA/PopCap — Feeding Frenzy Xbox manual](https://static-www.ec.popcap.com/support.popcap.com/sites/support.popcap.com/files/XBox_Vol1_manual.pdf), official publisher-hosted manual. Its controls and special features are specific to an Xbox edition; this candidate does not adopt them or imply PC compatibility.

No verified catalog build, level sequence, exact fish tiers, tuning, or target platform manual was found. The chosen controls, short score goal, lives and timer below are candidate design choices rather than historical settings.

## Original candidate

The initial candidate was one quick ocean round: steer one fish, eat only smaller fish, grow after every four prey, and avoid larger predators. Score twelve prey to win; three predator hits or ninety seconds ends the round. Use held arrow/WASD keys or hold and steer with pointer/touch. It had no dash, meter, shop, power-up, collectible, account or progression systems. That progression-free version is superseded by the three-zone iteration below.

Fish motion and collisions use a deterministic seeded model with bounded fixed time steps. Canvas scenery and shapes are project-authored. The target values are tuning defaults, not claims about EA's game.

## Rights and assets

- `scripts/games/feeding-frenzy.js`, its model and CSS, and `assets/feeding-frenzy-original.svg` were created for this repository under the project MIT license.
- No third-party fish art, character, screenshot, level, code, font, music or sound file is included. Small collision tones use the existing Web Audio synthesis helper.
- The legacy cover `assets/ca_lon_nuot_ca_be_cover.png` has unverified provenance and is excluded from the prepared site artifact. The catalog route/title remains subject to rights review.

## Local checks

- Baseline checks for the superseded version were 10 tests (6 deterministic model + 4 DOM/event-double UI/lifecycle). The current focused local suite has 14 tests (8 model + 6 DOM/event-double UI/lifecycle).
- Local model tests cover determinism/reset, growth, prey-size rules, win/loss/timeout, safe bounds and validated snapshot restore. UI tests cover the catalog route, pointer and keyboard movement, pause/restart/blur/close cleanup, interrupted save/resume, corrupt saves, storage denial, canvas instructions and touch targets.
- The canvas is a drawing double in local unit tests. Browser/device rendering, touch hardware, screen-reader review, balancing and human playtest remain pending until the updated CI run and real-user checks.

## Three-zone campaign iteration — 2026-10-08

- A 12-fish round is split into three named zones, with progress at 4 and 8 prey. The player still grows every four prey. Reaching a new zone changes its ocean palette and prey cadence, then raises the predator cap from one to two and finally three. These are original candidate rules, not claims about an unidentified edition.
- The 90-second and three-hit round ends remain. Stage and score are derived together and validated in version-2 snapshots. Saves resume paused; malformed or older saves are preserved as a backup rather than silently overwritten. Storage denial leaves play available and shows a short notice.
- Growth clamps the player back inside the tank before serializing, preventing edge-of-screen growth from making a save invalid. The UI splits accepted 100–160 ms frame gaps into model-safe steps and pauses after longer gaps.
- A Chromium smoke exercises resuming a saved second-zone run, pause, close and reopen. It supplements model and DOM-double tests; it does not establish mobile hardware performance, screen-reader acceptance, difficulty balance or human playability.
- Game code, shape artwork and sound synthesis are project-authored. The old route/title still needs review. No edition-specific parity is claimed.

## Swimming response pass — 2026-10-08

The prior model assigned the requested direction directly to the player at 178 px/s on every step. A 100 ms right input therefore moved 17.8 px immediately; a direction change applied at once; releasing input set velocity to zero with no coasting. The new model keeps the same 178 px/s cap and makes player motion a deterministic, bounded velocity change. It uses 1,450 px/s² acceleration from rest, 1,750 px/s² while turning or reversing, and 1,950 px/s² braking after release. The existing v2 save already stores `player.vx` and `player.vy`, so the snapshot schema and storage key remain unchanged.

Representative isolated-model trajectories (no fish or collisions; 680×420 canvas):

| Maneuver | Direct-velocity baseline | New motion |
| --- | --- | --- |
| Hold right for 100 ms | 17.8 px; already at 178 px/s | 7.25 px; reaches 145 px/s, then reaches cruise after 123 ms total |
| Hold right for 300 ms | 53.4 px | 42.47 px; reaches the same 178 px/s cap |
| Release from 178 px/s | Stops at once | Travels 8.12 px and stops within 91 ms |
| Turn from full right to full up | Heading changes at once | Sweeps an arc; reaches the new heading in about 144 ms |
| Reverse from full right to full left | Reverses at once | Cancels forward speed before reversing; reaches full left speed in about 203 ms |

Boundary and interruption behavior was checked at all four tank edges: outward velocity is removed when the player reaches a wall, and opposite input moves back into the tank from rest. Keyboard keyup and pointer cancellation clear their held targets; the UI also pauses and clears inputs on window blur. Deterministic player trajectories with the same input changes differ by less than 1e-8 px across 100 ms and 60 Hz step partitions. This partition check isolates player movement with fish removed; browser-device feel and human playtesting still need review.

Compatibility checks construct an old-format v2 save with the previous full-speed velocity, restore it, apply the new release brake, serialize it again, and restore that partial-brake state. The existing key and v2 schema are retained; recovered games remain paused until the player continues, then their saved momentum decays with no key or pointer held. Focused verification: `node --test tests/feeding-frenzy-model.test.cjs tests/feeding-frenzy-ui.test.cjs` (22 passed).
