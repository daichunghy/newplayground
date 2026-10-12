# Bubble Trouble gameplay batch — 2026-10-11

## Scope and baseline

- **Main baseline SHA:** `32e50649ad182bc89e185fd6067287602874079f` (`origin/main` checked before editing).
- **Stack base:** Piano Tiles branch `codex/piano-tiles-gameplay-20261011`, SHA `f0840354dde5bda0fbaf7e81988942d0251a757c`; that branch is PR #6 and still open. The main ref remained at the recorded baseline during this batch.
- **Working branch:** `codex/bubble-trouble-gameplay-20261011`.
- **Catalog entry:** `bong-bong-nuoc-bubble-trouble` / Bắn Bong Bóng Nước (Bubble Trouble).
- **Code and evidence:** `scripts/engines-archetypes.js`, `tests/bubble-trouble-model.test.cjs`, `tests/game-flow.test.cjs`, README, gameplay audit, coverage ledger, [profile](../game-profiles/bubble-trouble-classic.md), and this report/screenshots.
- **Router:** exact-ID dispatch runs the new loop through the existing `NP_Archetypes.launch` call from `launchRetroArcade`. `app.js` and the shared canvas fallback are unchanged.

## Research boundary

The selected reference is the developer-attributed 2025 HTML5 [Bubble Trouble listing on CrazyGames](https://www.crazygames.com/game/bubble-trouble-cpy), rechecked 2026-10-12. The listing documents landscape orientation, one-player left/right and Space controls, a straight-up spike gun, bubbles splitting into smaller/faster targets, contact costing a life, and clearing the field to proceed. It also lists separate Player 2 controls; this adaptation's declared scope remains one player. It does not publish this build's exact physics, maps, starting count, score scale, life count or campaign length. This implementation uses its own vector art and ten locally composed stages; it does not copy reference media/code or claim its full stage set.

## Implementation

The dedicated model runs the harpoon, bubble splitting, rebounds, player hitboxes, lives and temporary hit protection, score, stage clear/transition, final win and game-over states separately from rendering. The renderer draws a horizontal 900×560 board, three bubble sizes, a small hunter, the floor line and original night-city silhouettes. Controls are keyboard arrows/A-D and held Space, pointer steering on the board, and held touch buttons. It pauses on request, retries from stage one, records best score/furthest stage in local storage, and uses the project's optional procedural arcade audio cues.

Starting with one large bubble makes stage one a learnable on-ramp. Later stages add initial bubbles; children move faster as they split. Stage counts, speed, gravity, score values, three starting lives with stage/score bonuses up to five, and the ten-stage finish are local adaptation choices. Co-op, power-ups and the complete 2025 reference campaign are outside scope.

## Browser play and checks

Browser used: Playwright driving system Chromium 151.0.7922.173 (`/usr/bin/chromium`), headless, served from this branch's static files. The Browser plugin was not available in this runtime. These are simulated viewports, not physical phones.

- Opened the catalog item through `window.openGameById('bong-bong-nuoc-bubble-trouble')` and verified the Bubble Trouble canvas appears rather than `#arcCanvas`.
- At **1365×900**, the landscape board measured **948×590 px**. At **390×844**, it measured **364×227 px**; at **320×640**, **296×184 px**. Both mobile sizes had no horizontal overflow. After the UI pass, all touch/control buttons measured **48 px** high: about 70px wide at 390px viewport and 56px wide at 320px. The [refined desktop](./bubble-trouble-batch-20261011/after-desktop-refined.png), [390×844](./bubble-trouble-batch-20261011/after-mobile-refined.png) and [320×640](./bubble-trouble-batch-20261011/after-mobile-320-refined.png) captures show the board and controls after the final presentation changes.
- Keyboard focus is moved from the modal close button to the game canvas after mount. ArrowRight moved the hunter; holding Space rendered the rising harpoon. Pause/resume and restart worked. Restart returned score/stage/lives to 0/1/3.
- A second browser campaign used a **read-only JSON clone of the live state** to choose aiming and safe-lane positions, then sent real held pointer input through the canvas. It did not mutate game state or invoke model helpers. The replay reached all ten stages and terminal `won` in **227.6 seconds**, scoring **21,875** with **4 lives** remaining; there were **zero page or console errors**. It reached the five-life cap during play and lost lives to collisions before earning them back. That score matches the model's perfect-hit ceiling, but unlike the model test, this campaign ran through the browser's real pointer and animation loop. See [stage 2](./bubble-trouble-batch-20261011/browser-campaign/stage-2.png), [stage 5](./bubble-trouble-batch-20261011/browser-campaign/stage-5.png), [stage 10](./bubble-trouble-batch-20261011/browser-campaign/stage-10.png), and the [victory screen](./bubble-trouble-batch-20261011/browser-campaign/victory.png). This is a state-guided automated playthrough, not a human difficulty assessment.
- A separate state-guided browser helper followed a descending bubble using actual arrow-key input to test player contact. The game reached **0 lives**, showed game over, and the **retry restored 3 lives on stage one**; see [loss](./bubble-trouble-batch-20261011/loss-screen.png) and [retry](./bubble-trouble-batch-20261011/retry-screen.png). This is an automated rule-path check, not a human difficulty assessment.
- An added deterministic model harness also checks a perfect-aim campaign through all ten stages and terminal victory. It validates campaign arithmetic and stage-transition reachability separately from the browser playthrough.
- On touch-enabled Playwright contexts at 390×844 and 320×640, the board stayed within the viewport, buttons measured 48px high, and page/console errors remained at zero. Real touch taps produced `pointerType: touch`; pause, resume and restart returned the expected model phases and 0/1/3 reset. Close removed the canvas and left `NP_GameSession.getCurrent()` null.
- A synthetic `visibilitychange` test (overriding `document.hidden`) observed the active phase and one RAF become `paused` with zero pending RAFs, then one RAF on visibility return; manual resume restored `playing`. Opening another headless tab did not make Chromium set `document.hidden`, so native tab/app backgrounding was not verified. Keyboard traversal focused the canvas with a visible 3px outline. With reduced motion emulated, the pressed-button transform computed to `none`. The active game backdrop also computes to `backdrop-filter:none`.
- No browser page errors occurred in the recorded runs. Headless render cadence was not measured reliably; no FPS or input-latency result is claimed.

## Before/after screenshots

Captured at identical **1365×900** and **390×844** viewports. Before images were served from the checked main SHA above; original after images from this working branch. The later [desktop presentation capture](./bubble-trouble-batch-20261011/after-desktop-refined.png), [mobile presentation capture](./bubble-trouble-batch-20261011/after-mobile-refined.png) and [320px narrow capture](./bubble-trouble-batch-20261011/after-mobile-320-refined.png) were taken after the 48px/touch/reduced-motion changes.

| Main SHA, generic reflex canvas | Working branch, dedicated harpoon game |
| --- | --- |
| ![Before desktop](./bubble-trouble-batch-20261011/before-desktop.png) | ![After desktop](./bubble-trouble-batch-20261011/after-desktop.png) |
| ![Before mobile](./bubble-trouble-batch-20261011/before-mobile.png) | ![After mobile](./bubble-trouble-batch-20261011/after-mobile.png) |

At the old route the canvas showed one timed circular target and crosshair, not the game's split-bubble loop. The desktop screenshot also shows that this batch removes the reflex template's extra in-canvas title and progress bar. The mobile screenshot shows the board and touch controls without the previous generic canvas's horizontal overflow.

## Test status and remaining gaps

After the life/progression and presentation changes, `node --test tests/*.test.cjs` passed **85/85 tests**. The ten Bubble Trouble-specific cases cover starting lives, stage and score life bonuses/cap, rate-limited fire, split size/speed, wall/floor rebound, lives/invulnerability/game over, stage transition/final victory, the full ten-stage perfect-aim model campaign, shared keyboard/pointer horizontal clamping and dedicated routing. The game-flow suite checks one-engine dispatch, open/render/close and generic archetype count. `node --check` passed for the changed engine and test file; `git diff --check` passed. This repository has no build script or separate catalog validator; the full game-flow suite opens and closes all 150 catalog entries.

Still unverified: human difficulty balance, physical Android/iOS devices, assistive technology, audible sound with browser audio enabled, frame-time under load, and level-by-level comparison against the hosted reference. The full ten-stage browser result was state-guided and should not be treated as human playtest evidence.
