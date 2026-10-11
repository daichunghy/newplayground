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

- `node --test tests/contra-snow-bros-model.test.cjs tests/game-flow.test.cjs`: **55/55 passed** after the final model change (11 new deterministic tests plus the updated catalog/lifecycle suite).
- Final full-suite after the last CSS change: `node --test tests/*.test.cjs`, **99/99 passed**.
- Syntax checks passed: `node --check app.js`, `scripts/engines-archetypes.js`, `scripts/engines.js`, `tests/game-flow.test.cjs` and `tests/contra-snow-bros-model.test.cjs`. `git diff --check` passed.

### Browser playthrough

- **Browser:** Chromium 151.0.7922.173, headless Linux; static HTTP server on the current worktree. Both titles were opened through `window.openGameById()` and their exact model canvas was found; neither rendered the shared `#arcCanvas` fallback.
- **Contra, desktop 1365×900:** held Right + X for 18 seconds on the actual keyboard event path. The run destroyed area 1's boss, reached area 2 with 2 lives and score 2320, then restart returned to area 1 with 3 lives. Score 2320 remained in the record field after closing/reopening; the old game session was null after close. Pause/resume button was also toggled.
- **Snow Bros, desktop 1365×900:** held Right + X for 5 seconds; the live run converted/kicked snowballs, cleared wave 1 and reached wave 2 with score 800 and 3 lives. A separate 17-second idle run lost all lives; `LẠI` restored wave 1 and 3 lives. A 5-second scoring run stored a 300-point record; after close the session was null, reopen restored that record, and three more open/close cycles each left no current session.
- **Mobile emulation 390×844 with touch:** both games accepted touchscreen taps on pause/resume, action and restart. No horizontal overflow; all visible targets measured at least 88×46px after responsive layout; the Contra board measured 364×205 at 16:9 and Snow Bros 364×324 at 9:8. Browser page errors: zero. This is emulated touch, not physical-device QA.
- **Desktop geometry:** Contra uses a 960×540 (16:9) board at 1365×900. Snow Bros uses a 620×551 (9:8) board at that viewport; all seven control buttons and the status line fit inside the modal.
- **Final timer visibility check:** after aligning the numeric seconds above the timer strip, Chromium measured the `52s` label inside the 16px clock row on both viewports (desktop label 16×11px; mobile 16×11px). The desktop board stayed 620×551 with controls/status ending at y=807/832 of 900; mobile board stayed 364×324 with controls/status ending at y=543/566 of 844. Both final screenshots were recaptured; no page errors.
- **Screenshots:** `screenshots/contra-before-desktop.png`, `contra-after-desktop.png`, `contra-area-clear-desktop.png`, `contra-play-desktop.png`, `contra-before-mobile.png`, `contra-after-mobile.png`; corresponding `snow-bros-*` before/after desktop and mobile, plus `snow-bros-play-desktop.png` and `snow-bros-loss-desktop.png`. Before and after captures use the same viewport per device.
- **Performance observation:** before the fix, the shared modal's 6px backdrop blur coincided with 66.8ms median animation-frame spacing in a fallback modal; turning that blur off produced 16.7ms median in the same browser. Both new games now disable that expensive backdrop effect only while their game is open. Final 90-frame samples were 16.7ms median / 33.3ms p95 for both canvases. This is a local headless scheduling sample, not a physical-device FPS guarantee.

### Remaining limits

- The browser run cleared Contra area 1 and entered area 2, but did not clear all three areas or reach the terminal win/loss state in Contra. Its deterministic model covers game over and the complete three-area transition. Snow Bros browser evidence covers wave 1→2 and a real game over/restart, not the full five-wave win. Model tests cover the complete local five-wave sequence.
- The 3-area/5-wave adaptations are not full NES/arcade campaigns. See each profile for exact omitted rules, assets, camera modes, power-ups and content. No original physical console, cabinet, iOS/Android device, Safari, assistive-technology or human playtest was available.
- No deployment, merge, external service or paid service was used.
