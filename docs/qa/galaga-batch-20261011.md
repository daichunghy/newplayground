# Galaga batch — title-specific fixed shooter

**Reference:** One-player Namco arcade Galaga (1981). Research and version limits are in the [game profile](../game-profiles/galaga-1981-arcade.md). The official [Bandai Namco gameplay page](https://galaga.com/en/history/galaga.php) documents lateral movement, firing, a two-shot limit, an approximately 40-enemy entry formation, Boss/Guard/Grunt classes, attacks, tractor-beam capture and Dual Fighter rescue. Exact ROM revision/settings were not pinned.

## Baseline and changed files

- Baseline SHA: `4f4bfbc00aebae9fa8a76c6584d590e2bf3e27a4` (the latest branch commit before this batch); `origin/main` at batch start: `32e50649ad182bc89e185fd6067287602874079f`.
- Branch: `codex/crossing-games-gameplay-20261011`; this work remains isolated from the open router rewrite in PR #1.
- `scripts/engines-archetypes.js`: deterministic Galaga model and title-only dispatch; original vector formation and portrait board; two-shot cap, class HP/scoring, diving attacks, incoming aimed fire, Boss capture/rescue and Dual Fighter, challenge waves, stage/life progression, pause, restart and local best score.
- `app.js`: route `ban-ruoi-galaga` to the existing RetroArcade dispatcher and keep Chicken Invaders IDs on `launchChickenInvaders`.
- `tests/galaga-model.test.cjs`: deterministic mechanics, progression, capture/rescue, scoring and route coverage.
- `tests/game-flow.test.cjs`: exact Galaga/Chicken route separation and dedicated-loop lifecycle checks.
- `docs/qa/galaga-batch-20261011/`: before/after browser captures and seeded state captures.
- No third-party image/audio/code assets were added. All ships and enemies are newly drawn vector shapes.

## Browser play record

Chromium/Playwright used the real catalog route at 1365×900 desktop and 390×844 mobile. A separate baseline server used SHA `32e50649...`.

- Baseline screenshot shows Galaga opening the Chicken Invaders canvas, with chicken sprites and a Nuke control. After the route split, the same catalog ID opens the portrait Galaga board and formation.
- Natural keyboard run: held Space and moved left/right for about 12 seconds after launch. It reached score 360, kept all three lives, and defeated 5 of 40 enemies; the run did **not** clear the formation.
- Seeded progression check: left one grunt alive, then used the real Space input to clear it. Pause held the 1.3 second stage transition. To account for headless-browser RAF throttling, the QA-only probe shortened that seeded transition to 0.04 seconds; the next 40-enemy stage then opened. This verifies the transition path, not a natural clear.
- Seeded tractor-beam check: a Boss captured the fighter and consumed a life. Real Space input destroyed the carrier; the game restored the fighter, entered Dual Fighter, and returned the stock to three ships. Rescue status is retained when that Boss is also the wave's last enemy.
- Seeded loss exhausted the last life and displayed game over. Enter restarted the run; the restart button reset lives three times. Local best score persisted as `{"score":360}`.
- Mobile widths 320, 360, 390 and 430 CSS px had no horizontal document overflow. At 390px the board measured 364×473 CSS px; a held touch Right control moved the ship from x=300 to x≈404.
- Instrumented game session: 22 listeners and 1 RAF while open; 0 listeners/RAF after close; 22/1 after reopen; 0/0 after closing again. No desktop or mobile page errors.

## Screenshots

All are headless Chromium. Before/after pairs use the same 1365×900 desktop and 390×844 mobile viewports. The captures wait for the formation to finish entering.

| View/state | Capture |
| --- | --- |
| Desktop before / after | [before-desktop.png](galaga-batch-20261011/before-desktop.png) · [after-desktop.png](galaga-batch-20261011/after-desktop.png) |
| Mobile before / after | [before-mobile.png](galaga-batch-20261011/before-mobile.png) · [after-mobile.png](galaga-batch-20261011/after-mobile.png) |
| Seeded wave clear / paused / stage 2 | [clear](galaga-batch-20261011/wave-clear.png) · [paused](galaga-batch-20261011/wave-paused.png) · [stage 2](galaga-batch-20261011/stage-2.png) |
| Seeded capture / rescued Dual Fighter / game over | [capture](galaga-batch-20261011/tractor-capture.png) · [Dual Fighter](galaga-batch-20261011/dual-fighter.png) · [game over](galaga-batch-20261011/game-over.png) |

## Verification and limits

- `node --test tests/galaga-model.test.cjs tests/game-flow.test.cjs`: **49 tests** after the final rescue-status regression case (the combined test files include the repository flow cases).
- `node --check` passed for `app.js`, `scripts/engines-archetypes.js`, `tests/game-flow.test.cjs` and `tests/galaga-model.test.cjs`.
- Exact arcade formation tables, scoring/bonus thresholds, timing and challenge cadence were not compared against a pinned ROM/board. The local score values, enemy palette, attacks, cadence and challenge schedule are prototype tuning. A natural first-wave clear was not observed. Physical Android/iOS devices, assistive technology and frame-time performance were not tested.
- The global game modal still contributes its shared header controls; this batch simplified the Galaga HUD and replaced its decorative Nuke button with four direct controls rather than redesigning the shared modal.
