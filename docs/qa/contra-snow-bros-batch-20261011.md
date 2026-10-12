# Contra and Snow Bros gameplay batch — 2026-10-11

## Scope and baseline

- Main baseline: `32e50649ad182bc89e185fd6067287602874079f` (verified unchanged on origin/main before work).
- Batch base: `23822fc17e5232405e18c18a6ab0b1c0f5cba7ef` (`codex/lemonade-dr-mario-gameplay-20261011`, draft PR #8; remote head matched before branching).
- Working branch: `codex/contra-snow-bros-gameplay-20261011`.
- Concurrent scope check: neither `contra-2d` nor `nguoi-tuyet-snow-bros` is reserved in `feat/twenty-distinct-games-20261011`; open PRs #1–#4 were inspected. Their shared router/engine work is separate; this batch keeps integration inside the existing archetype launcher.
- Selected IDs: `contra-2d`, `nguoi-tuyet-snow-bros`.
- Intended changed scope: `scripts/engines-archetypes.js`, model tests, per-game research profiles, this QA report and before/after screenshots, `docs/GAME_COVERAGE.md`, and README status.

## Reference scope

- Contra: NES North American release (1988), solo mode; scanned `NES-CT-USA` instruction booklet and Konami's Contra collection page. The collection page describes Contra as run-and-gun and lists side/vertical scrolling and pseudo-3D stages in the 1987 arcade original, while identifying the NES release separately. The implementation target is explicitly a local three-stage side-scrolling run-and-gun slice, not the full NES campaign or every stage camera.
- Snow Bros.: Toaplan/Tatsujin arcade original (1990), one player; the rights-holder's curated title page documents 8-way movement, shot/kick, jump, snow accumulation to freeze foes, rolling snowballs, stage-clear, timed pumpkin threat, lives and 50 stages. The implementation target is an original five-stage browser adaptation; the 50-stage arcade campaign is outside scope.
- All visuals/audio are procedural or synthesized by the existing app; no proprietary sprites, screenshots, maps, code, or audio are included.

## Implementation and verification log

### Code and source scope

- Changed engine: `scripts/engines-archetypes.js`; exact ID branches call separate launchers without editing the shared app router or replacing other engines.
- Added model tests: `tests/contra-snow-bros-model.test.cjs`; extended launcher/lifecycle coverage in `tests/game-flow.test.cjs`.
- Added research: `docs/game-profiles/contra-nes.md` and `docs/game-profiles/snow-bros-arcade.md`.
- Updated inventory: `README.md`, `docs/GAME_COVERAGE.md` and `docs/GAMEPLAY_COMPLETENESS_AUDIT.md`.
- New art and feedback use canvas primitives and existing app audio calls. No external image, font or audio asset was added.

### Model and static checks

- `node --test tests/contra-snow-bros-model.test.cjs tests/game-flow.test.cjs`: **58/58 passed** after the final model change.
- Final full-suite after the timer, upward-throw and QA coverage changes: `node --test tests/*.test.cjs`, **102/102 passed**; Snow/Contra model plus flow tests: **58/58 passed**.
- Syntax checks passed: `node --check app.js`, `scripts/engines-archetypes.js`, `scripts/engines.js`, `tests/game-flow.test.cjs` and `tests/contra-snow-bros-model.test.cjs`. `git diff --check` passed. This static repo has no `package.json` build/lint script.

### Browser playthrough

- **Browser:** Playwright driving Chromium 151.0.7922.173, headless Linux; the Browser plugin was unavailable in this runtime, so direct Playwright was used. A static HTTP server served the current worktree. Both titles were opened through `window.openGameById()` and their exact model canvas was found; neither rendered the shared `#arcCanvas` fallback.
- **Contra, desktop 1365×900:** a first unplanned Right + X run lost all three lives before the area-3 boss, showing the controller was rushing into fire. A second state-guided controller selected the nearest live target and jumped when visible enemy shots were on a collision path. It used actual held Arrow/Space/X keyboard events and a read-only cloned state probe; it cleared all 18 authored enemies and all three bosses, ending `won` at area 3 with score 5,060, all 3 lives, and zero page/console errors in 26.3 seconds. The browser saved [area 1](./contra-snow-bros-batch-20261011/screenshots/contra-campaign/area-1-start.png), [area 2](./contra-snow-bros-batch-20261011/screenshots/contra-campaign/area-2-start.png), [area 3](./contra-snow-bros-batch-20261011/screenshots/contra-campaign/area-3-start.png), and [victory](./contra-snow-bros-batch-20261011/screenshots/contra-campaign/terminal.png) at the same viewport.
- **Snow Bros, desktop 1365×900:** after tuning the upward throw to 0.74 radians (~42°), a state-guided controller used actual held Space/arrow/X keyboard events, with a read-only live-state clone for aiming/routing. It froze elevated enemies from a safe lower lane, then jumped to kick the frozen balls. The final run cleared all five authored waves, ending `won` at 5/5 with score **3,440**, all **3 lives**, `state.elapsed` **98.1s** and **145.1s wall time**, with zero page/console errors. The wall time includes controller polling and headless browser scheduling; the game clock is capped at 50ms per frame. This is automated-input evidence, not human play. The stage-three browser capture shows the raised platforms as thin floating shelves with open space below. The model tests verify both one-way platform traversal and the steeper arc reaching the center ledge from the floor. Captures include [wave 1](./contra-snow-bros-batch-20261011/screenshots/snow-campaign/stage-1-start.png), [wave 2](./contra-snow-bros-batch-20261011/screenshots/snow-campaign/stage-2-start.png), [wave 3](./contra-snow-bros-batch-20261011/screenshots/snow-campaign/stage-3-start.png), [wave 4](./contra-snow-bros-batch-20261011/screenshots/snow-campaign/stage-4-start.png), [wave 5](./contra-snow-bros-batch-20261011/screenshots/snow-campaign/stage-5-start.png), and the [fresh terminal victory](./contra-snow-bros-batch-20261011/screenshots/snow-campaign/five-wave-victory-20261012.png). Earlier interaction checks remain: an idle run lost all lives; `LẠI` restored wave 1 and 3 lives; record persisted after close/reopen; three extra open/close cycles left no current session.
- **Mobile emulation 390×844 with touch:** after the presentation pass, both games accepted touchscreen pause, resume and restart; probes confirmed the phases `paused` → `playing` → restarted `playing`. No horizontal overflow; action controls measured 88.8×48px for Contra and 88×48px for Snow Bros. Contra's board measured 364×205 at 16:9 and Snow Bros 364×324 at 9:8. The current [Contra mobile capture](./contra-snow-bros-batch-20261011/screenshots/contra-campaign/mobile-after-ui.png) and [Snow Bros mobile capture](./contra-snow-bros-batch-20261011/screenshots/snow-campaign/mobile-after-ui.png) show the 48px controls. Browser page/console errors: zero. This is emulated touch, not physical-device QA.
- **Desktop geometry:** Contra uses a 960×540 (16:9) board at 1365×900. Snow Bros uses a 620×551 (9:8) board at that viewport; all seven control buttons and the status line fit inside the modal.
- **72-second timer visibility check:** the fresh [mobile capture](./contra-snow-bros-batch-20261011/screenshots/snow-campaign/mobile-after-ui.png) shows `72s` on a 390×844 viewport, a 364×324 (9:8) board, no horizontal overflow, and touch controls at 88×48px; zero page/console errors. The desktop wave-start capture also shows the aligned timer row with 72 seconds at wave start.
- **Screenshots:** `screenshots/contra-before-desktop.png`, `contra-after-desktop.png`, `contra-area-clear-desktop.png`, `contra-play-desktop.png`, `contra-before-mobile.png`, `contra-after-mobile.png`; corresponding `snow-bros-*` before/after desktop and mobile, plus `snow-bros-play-desktop.png` and `snow-bros-loss-desktop.png`. Before and after captures use the same viewport per device.
- **Performance observation:** before the earlier modal fix, the shared modal's 6px backdrop blur coincided with 66.8ms median animation-frame spacing in a fallback modal; turning that blur off produced 16.7ms median in the same browser. Both new games disable that backdrop effect only while open. The post-blur-removal 90-frame samples were 16.7ms median / 33.3ms p95 for both canvases; the later presentation pass adds no per-frame work. This is a local headless scheduling sample, not a physical-device FPS guarantee.
- **Presentation and gameplay pass:** Snow Bros retains thin floating ledges with visible open space beneath them. After the first 33° trajectory repeatedly missed center-platform targets when they moved, the upward arc was tuned to 42° and a deterministic regression test was added for a central-ledge hit from the floor. Both games use 48px minimum mobile buttons, prevent selection/callout while holding touch controls, expose a visible canvas keyboard-focus ring, and remove pressed-button transform motion when reduced motion is requested. The Snow Bros projectile trajectory changed; other changes in this presentation pass are CSS/input-presentation changes.

### Remaining limits

- Both browser campaigns were state-guided QA, not human playtests. The Contra adaptation has three horizontal areas and does not reproduce the NES stage order/camera changes. Snow Bros covers five authored waves rather than all 50 arcade stages. Physical mobile, Safari and assistive-technology testing remain outside this batch.
- The 3-area/5-wave adaptations are not full NES/arcade campaigns. See each profile for exact omitted rules, assets, camera modes, power-ups and content. No original physical console, cabinet, iOS/Android device, Safari or assistive-technology test was available.
- No deployment, merge, external service or paid service was used.
