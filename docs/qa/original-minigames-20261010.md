# Original mini-game depth pass — 11 October 2026

## Scope and ownership

This work remains on `codex/original-minigames-20261010` / draft PR #4, separately from quality PR #2 and new-games PR #3. Only the **existing three catalog IDs** are intercepted by `scripts/original-games-batch.js`. The old launcher handles every other game. No game ID, metadata, global router, styles or engine has been replaced.

## Changed mechanics

### Ném Vòng Cổ Chai — `nem-vong-co-chai`

- The ring now flies on a visible 660 ms arc; the player picks an aim position with pointer down/drag/release or canvas-focused arrows and Space.
- Five bottles in alternating rows. Wind is explicitly shown, with lateral offset added at landing; later rounds introduce moving bottle targets, requiring a lead.
- Collision checks ring landing distance to the current bottle position, not merely pointer coordinates. Accurate throws score more, a streak multiplier rewards consecutive hits, and misses break the streak.
- A finite throw budget, stage-specific win threshold and defeat/retry state. The budget and thresholds rise independently until capped. Any failed-stage partial score is rolled back to the stage checkpoint; otherwise, repeated retry could inflate total score.

### Phi Tiêu Bóng Bay — `phi-tieu-bong-bong`

- Shots are projectiles with travel time, not immediate tap-to-delete; hit resolution happens against the **moving** balloon position at impact.
- Three flight patterns, progressive movement speed, varied targets (regular, bonus gold, shielded requiring two darts), throttled spawning and caps on simultaneous balloons.
- Limited ammunition, countdown, combo scoring, stage target and retry. Empty shots consume ammunition; an already-flying dart cannot be spammed.
- Precise pointer coordinates are translated to a 720×460 logical court. On narrow screens, hit-slop expands to preserve touch usability rather than shrinking targets in CSS pixels.
- Keyboard arrows + Space are supported when the canvas has focus.

### Đấu Trí — `ai-la-trieu-phu`

- This is an **original knowledge quiz** with its own writing and presentation; no licensed game show graphics or branding are included.
- Thirty non-repeating questions per full three-stage run, drawn from three pools of twelve progressively more challenging facts.
- Three lives, stage timer 25 → 21 → 17 seconds per question, answer feedback, streak bonus and increasing score awards. A timeout counts as wrong.
- Two one-time lifelines, 50/50 and Skip. Hidden wrong choices cannot be submitted.
- Semantic HTML answer buttons with minimum touch height. Keyboard 1–4 operates when the game board has focus; a completed third stage ends in a finish state, not an infinite looping quiz.

## Game feel / visual and technical decisions

- All game imagery (bottles, rings, carnival targets, particles, progress, aim reticle) is drawn from original Canvas paths; no purchased, scraped or trademarked third-party artwork, sound, web fonts or dependencies were introduced.
- Game HUD uses scoped, in-game CSS with Calibri fallback. Additional instructions sit behind a help button, and playfields remain the visual priority.
- `NP_GameSession.start()` owns every listener and `requestAnimationFrame`; a `ResizeObserver` is disconnected on cleanup, pointer cancel and keyboard focus loss are handled, and hidden tabs/blur pause play.
- Canvas fits the CSS display size and device pixel ratio (capped at 2). On resize, redraw uses normalized 720×460 world coordinates.
- Existing assets and image-generation mockups are **not** in this implementation. Generated visuals previously shown in conversation are design concepts, not test screenshots.

## Sources / asset rights

Rules were studied as broad mechanic references, not taken as code or assets:
- Ring toss objective — https://acpentertainment.com/resources/carnival-game-rules/
- Classic ring-toss arcade concept — https://baddygames.com/games/ring-toss/
- Balloon-dart carnival concept — https://www.htfbw.com/games-cards/Games/74930.shtml

Artwork and code in this branch are originally authored; covered by the repository licensing policy. No external art licenses to track.

## Tests executed

Local Node 22 in the workspace, on the revised game file:
- `node --check scripts/original-games-batch.js` — **pass**.
- `node --test tests/original-games-*.test.cjs` — **22/22 pass**. Includes rule outcomes, projectile in-flight guard, difficulty, question pool integrity, streak and timer, accessibility-oriented DOM-button creation, pointer/keyboard and session cleanup using a fake DOM/Canvas.
- The fixture was attempted in installed Chromium with Playwright. The browser blocks all navigation including `http://127.0.0.1` with `net::ERR_BLOCKED_BY_ADMINISTRATOR` because of a managed `URLBlocklist`. Therefore **no live-browser run or screenshot was obtained**, and FPS/console/mobile/browser-device validation remains open.
- GitHub Actions review workflow `.github/workflows/original-games-review.yml` additionally checks the repository's real `tests/game-flow.test.cjs` and syntax once run. Do not infer it passed until GitHub's result confirms that.

## Release gates still required

1. Run a full game each on desktop Chromium, mobile Chrome and Safari. Verify stage 1–3 and campaign ending, wins and losses, help, reset, pause and replay.
2. Test at 320px, 390px and wide desktop; keyboard and touch including interrupted gestures; rotation/orientation; real-device hit sizes.
3. Switch across all three and unrelated games repeatedly. Confirm no leaked listeners, timers, RAF or audio, no overlay/scroll and no stale DOM.
4. Check browser console, asset-loading failures, and measured frame times (60 Hz target, not claimed).
5. Human balance testing of ring aiming/wind, dart target speed and time budget, question readability and difficulty.
6. Review the title `ai-la-trieu-phu` separately before public release, since the catalog ID invokes a recognizable TV-show term, even though the UI title is generic `Đấu trí`.

**Acceptance status: implementation and deterministic mock tests passed; production and mobile-browser acceptance pending. Do not merge or deploy.**
