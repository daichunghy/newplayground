# Nảy Lửa — scope, sources, and QA

## Reference and research boundary

- Historical catalog route: `street-fighter-2-doi-khang`. The catalog label is a reference pointer, not the displayed game title.
- Source checked on 2026-10-08: [Capcom Town — Street Fighter II: The World Warrior](https://captown.capcom.com/en/classic_games/23). Capcom describes its English home-console edition, lists directional movement/guard and punch/kick controls, and summarizes a large cast with distinct attacks and special moves. The page says the game first appeared in arcades in 1991 and reached home consoles the following year.
- The catalog does not identify an exact region, cabinet/home-console edition, or revision. The official page’s manual link was located, but detailed frame timing, damage, round rules, combo behavior, and AI were not measured or independently verified. This candidate does not claim edition parity.
- Background rights reading: [U.S. Copyright Office FAQ](https://www.copyright.gov/help/faq/faq-general.html) distinguishes ideas/methods of operation from expressive works; [USPTO trademark basics](https://www.uspto.gov/trademarks/basics/what-trademark) explains that a mark identifies goods/services; [USPTO federal search guidance](https://www.uspto.gov/trademarks/search/federal-trademark-searching) notes that a database search is only one part of clearance and does not guarantee a registration outcome. These references are general U.S. guidance, not legal advice or a clearance opinion.

## Original candidate

- Display title: **Nảy Lửa**. Cast: Linh and Bảo. Move names: **Chớp Đòn** (quick punch), **Quét Mây** (longer kick), and **Vân Bộ** (telegraphed dash-palm). These names and designs have not been searched or cleared as trademarks.
- Immediate solo play against a same-health CPU; a button switches to local two-player. First to two rounds wins, with a 45-second round clock, health bars, movement, jump, held guard, light punch, kick, a readable special-move windup, and replay.
- The animation loop stops at a completed match, and window blur or hidden-tab transitions clear held keys/touch and stop animation until focus/visibility returns. Replay and mode changes start one loop.
- P1: A/D move, W jump, hold S to guard, J punch, K kick, L Vân Bộ. P2: arrows move/jump/guard, 1/2/3 attack. Touch buttons mirror P1 actions; local two-player is keyboard-only.
- Ordinary new matches use a fresh random seed for CPU choices; an explicit model seed remains repeatable for tests and reproducible runs. CPU approach, attack/guard probabilities, fighter health, and round rules are unchanged. This is a basic candidate policy, not a measured balance result.
- The rooftop, skyline, fighters, costumes, poses, HUD, effects, and colors are newly drawn with Canvas 2D vector paths. Short tones are synthesized with Web Audio after input; there are no imported sprites, screenshots, music, recordings, third-party game code, or external assets.
- This bounded build does not implement a tournament roster, character selection, multiple stages, crouching/low attacks, combo buffering, dizzy/stun, long campaign, network play, remappable controls, or platform-specific controller support.

## Rights and release caveats

- The build contains no Capcom character names, marks, artwork, sprites, stage compositions, screenshots, audio, source code, or move names. It uses only a broad one-on-one fighting loop as product context and replaces the historic presentation with an independently authored cast, move set, and rooftop scene. The original cover is recorded in the asset manifest; the unverified legacy cover is excluded from the prepared static artifact.
- The historic string remains in the technical catalog ID and registry route so the isolated candidate can launch through the existing shell. The in-game title is **Nảy Lửa**. Before public release, review whether the legacy ID, catalog metadata, and any search result exposure should be renamed. No trademark database search, jurisdiction-specific legal review, or permission/license review was performed.
- No claim is made that generic mechanics, names, marks, or the candidate title are legally cleared in every territory. A similarity/clearance review remains a release gate.

## Verification

Run from the repository root:

```sh
node --check scripts/engines-retro50.js
node --test --test-concurrency=1 tests/street-duel-model.test.cjs tests/street-duel-ui.test.cjs
```

The model tests cover explicit-seed repeatability, varying default seeds on fresh models, movement, jump, attack startup/hit timing, guard chip damage, draw/intermission, a two-round match, and replay reset. DOM-double tests cover the exact historic route, immediate CPU default, HUD and touch controls, keyboard/touch input, local 2P toggle, hidden-tab/window-blur stop and resume, terminal animation-loop stop, replay starting one loop, close/reopen, and release of animation/input listeners. Canvas drawing and Web Audio are mocked/unavailable in these tests.

**Browser/device QA is pending.** A headless Chromium/Playwright check was attempted, but the browser process aborted before opening a page because its process-singleton socket call was denied by the execution sandbox (`socket() failed: Operation not permitted`). No real browser layout/render result was collected. No touch device, controller, screen-reader, performance, or human balance/playtest evidence was collected. The DOM double does not establish that the game feels fair or that its visuals scale well on a device.

## Merge note

The local integration keeps the legacy `street-fighter-2-doi-khang` route but displays Nảy Lửa and uses `assets/nay-lua-original.svg`. The old cover is kept in source pending provenance review and excluded from the release artifact. Automated checks verify that the hidden live region announces combat events rather than repeating text on every animation frame. This remains a local checkpoint with browser/device and title/route rights gates open; no public push or deployment has been performed.
