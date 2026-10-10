# Three original mini-game engines — implementation notes (2026-10-10)

This branch is intentionally isolated from concurrent layout and game-engine review branches.

## Scope

- `nem-vong-co-chai` — original ring toss. Horizontal pointer drag or left/right arrows, release/Space to throw; rings land when alignment error is under 32 logical pixels. Five independently targetable bottles, limited attempts, scored hits and escalating stage win threshold.
- `phi-tieu-bong-bong` — moving balloon target range. Tap a moving balloon to throw a dart. A miss consumes an attempt, successful hits persist for the stage, and later stages raise target speed and count.
- `ai-la-trieu-phu` — original short multiple-choice knowledge game, not a reproduction of any television format. Touch an option or use number keys 1–4; immediate correct/wrong highlight; three lives; stage targets escalate.

## Design research

- Ring toss basic objective and short turns: https://acpentertainment.com/resources/carnival-game-rules/
- Ring toss browser interaction and aim clarity: https://baddygames.com/games/ring-toss/
- Balloon dart objective and throw budget: https://www.htfbw.com/games-cards/Games/74930.shtml

These are gameplay references, not copied game assets. All displayed shapes, bottle drawings, rings and moving balloons are procedural Canvas paths created for this branch. No third-party media, audio, font file, package or paid asset was added. The previously generated six showcase images were **not** included as assets and must not be presented as in-game screenshots.

## Integration

The only shared file changed is `index.html`, which inserts `scripts/original-games-batch.js` after the existing engines but before `app.js`. The wrapper intercepts **only** three exact catalog IDs, forwarding every other entry to the existing `launchRetroArcade`. Each game owns its DOM subtree and uses `NP_GameSession.start()` for requestAnimationFrame, event listeners and deferred callbacks. Game controls remain scoped to its container.

## Verification gates

`tests/original-games-batch.test.cjs` includes mock DOM/Canvas logic checks for launch, ring win/next level, dart defeat/retry, quiz defeat/restart and pause/resume. Run locally:

```sh
node --check scripts/original-games-batch.js
node --test tests/original-games-batch.test.cjs
node --test tests/game-flow.test.cjs
python3 -m http.server 8080
```

Then verify each ID in a real browser and on mobile: stage win/loss, restart, touch and keyboard handling, CSS scaling at 320px, console and asset loading, switching between engines, home-return cleanup and FPS traces. This access session could validate JavaScript parsing but **could not run local Node or browser**, so these acceptance gates are pending. Do not merge or label release-ready without them.

## Known limits

The small quiz pool repeats at higher levels, the ring toss has an intentionally simplified alignment model rather than full 3D flight, the graphics are deliberately lightweight, and user-facing animations/audio and comprehensive accessibility checks remain open. This is a reviewable implementation batch, not production acceptance.
