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
