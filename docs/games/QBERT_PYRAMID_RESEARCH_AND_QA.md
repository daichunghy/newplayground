# Nhảy Bậc Kim Tự Tháp — research and QA dossier

## Prototype scope

This is an original, self-contained take on a turn-based pyramid-hopping puzzle. The player moves along four diagonal directions on a seven-row triangle, lights each of its 28 tiles, and completes three color-themed levels. A campaign-wide three-minute clock and six lives bound each run. Falling off the board or meeting a patrol costs one life; finishing a level grants one life back, up to the cap.

Patrols follow authored four-tile loops at distinct, deterministic rhythms. The loops add a positional hazard that can be read and avoided. A newly lit tile gives 100 points, every hop gives 10, and level/finish bonuses reward completing the campaign. The model accepts a seed for reproducible patrol direction and exposes the board, player, patrols, progress, score, lives, time, and terminal state through `view()`.

## Controls and session behavior

- Touch: four on-screen diagonal buttons, each at least 48 × 48 CSS pixels.
- Keyboard: left/right arrows hop down-left/down-right; up/down arrows hop up-left/up-right; Q/E/Z/C mirror the four on-screen buttons; P pauses or resumes.
- Pause and restart buttons remain available above the board. A hidden tab, window blur, or `pagehide` pauses play and requires an explicit resume.
- The supplied `NP_GameSession` owns the timer and event listeners. Its cleanup callback removes the game DOM and stops the clock.

## Originality and rights boundary

The cover and in-game board use CSS, DOM, and hand-authored SVG geometry only. No external assets, licensed character art, game code, or downloads are used. The historical title is a research reference only: its existence does not prove rights to reuse a name, character, art, or code, and it does not establish parity with any historical release. This prototype makes no claim of official affiliation or exact ruleset fidelity.

## QA evidence

Focused model and UI tests cover the 28-cell geometry, diagonal movement and scoring, deterministic patrol steps, collisions, falling, three-level victory, both loss paths, pause/resume, visibility/pagehide interruption, touch and keyboard controls, overlays, restart, and session cleanup.

Commands run:

```sh
node --test tests/qbert-pyramid-model.test.cjs tests/qbert-pyramid-ui.test.cjs
node --check scripts/games/qbert-pyramid-model.js
node --check scripts/games/qbert-pyramid.js
```

Result: 11 focused tests pass; both game scripts pass `node --check`. The UI tests use the repository's mock DOM harness; this dossier does not claim a manual device/browser visual QA pass.
