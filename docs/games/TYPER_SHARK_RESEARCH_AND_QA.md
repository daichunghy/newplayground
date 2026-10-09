# Gõ Chữ Nhanh — prototype dossier

`typer-shark` is a planned-catalog locator. Its historical title does not establish distribution rights, identify a specific release, or imply parity. The implementation uses original, procedural visuals and a short keyboard-defense loop.

## Rules

- Type the nine authored sea words in order. Correct letters score 10 points; clearing a word adds a time-left bonus.
- The active fish moves toward the reef while its word timer runs. Later waves shorten the word deadline.
- A wrong key adds a small time penalty. Letting a fish reach shore costs one of three misses; the third miss or the 90-second round limit ends the run.
- Win by clearing all three waves. Pause, resume, restart and automatic pause on blur, hidden tab or pagehide are supported.
- Desktop uses physical letters. Touch play uses a custom 26-key layout with 44px minimum targets.

The round is a small authored timing model, not a simulation of animal behavior or a recreation of an identified commercial product. Artwork is the original SVG `assets/covers/typer-shark-original.svg` plus inline SVG drawn by the renderer.

## Verification

- Focused model and UI-controller tests: `node --test tests/typer-shark-model.test.cjs tests/typer-shark-ui.test.cjs`.
- Integrated Chromium phone/desktop, viewport fit, touch-key sequence, pause/replay and cleanup checks are recorded in `docs/qa/four-games-batch-20261009.md` after integration.
- Physical keyboard/mobile hardware, novice comprehension, visual contrast and historical title rights remain unaccepted.
