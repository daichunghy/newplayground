# Asteroids batch — dedicated vector loop

**Reference:** Atari Asteroids upright arcade, 1979, one-player. Sources and known version gaps: [game profile](../game-profiles/asteroids-1979-arcade.md). The Strong National Museum of Play documents the 1979 arcade game, rotation/thrust/fire/hyperspace, drifting, saucers, splitting rocks and vector display; the [TM-143 Atari manual scan](https://www.arcade-museum.com/manuals-videogames/A/asteroids_tm143.pdf) supports configurable score, saucer and control variants. Exact ROM revision and cabinet settings were not observed.

## Baseline and changed files

- Base SHA: `32e50649ad182bc89e185fd6067287602874079f`; branch `codex/crossing-games-gameplay-20261011`.
- Implementation commit: `abaad54e385c18364d6f28432c47ce347e802556` (also refines Frogger edge behavior; the original dedicated Frogger loop is in parent commit `6c644abf4dc31b9754d04da599ec5581d361d540`).
- `scripts/engines-archetypes.js`: dedicated ID dispatch, deterministic inertial flight/wrap/split/saucer/wave model, original Canvas vectors, keyboard and pointer controls, pause/restart, synthesized shared effects and local best score.
- `tests/asteroids-model.test.cjs`: nine deterministic behavior cases.
- No external image, sound or code assets were added. The asteroids, ship, saucers, starfield and shots are new vector shapes.

## Browser checks

Chromium/Playwright opened the real catalog route at 1365×900 desktop and 390×844 mobile.

- Natural fresh run: started with four large rocks, held Left+Space for 30 seconds, observed score 380, one ship left and wave 1 still active. This was a real input run; it did **not** clear the first wave.
- Separate progression check used an explicit seeded short setup with one small rock remaining, then held Space through the real keyboard event path. It reached wave-clear with score 100; pause held the transition countdown at 0.90s during a 300ms wait; resuming opened wave 2 with five large rocks. This proves the wave transition and start of the next wave, not a natural full-wave clear.
- A seeded collision scenario ran through the actual simulation to lose a ship, exhaust the last ship and show game over; Enter restarted. Restart button was also used three times.
- Saved local best score `{"score":100}`. Instrumented game-owned resources were 25 listeners/1 RAF open, 0/0 closed, 25/1 after reopen and 0/0 after closing again. No page errors.
- Mobile width matrix at 320/360/390/430 showed `innerWidth=clientWidth=scrollWidth`. At 390×844, board was 346×259 CSS pixels; a 180ms touch hold on Thrust accelerated the ship, then it coasted after release. This is emulation, not a physical phone.

## Before/after captures

Same desktop and mobile viewport sizes; “before” uses baseline SHA `32e50649...` and shows the generic fallback; “after” shows the dedicated vector board.

| View/state | Capture |
| --- | --- |
| Desktop before, 1365×900 | [before-desktop.png](asteroids-batch-20261011/before-desktop.png) |
| Desktop after, 1365×900 | [after-desktop.png](asteroids-batch-20261011/after-desktop.png) |
| Mobile before, 390×844 | [before-mobile.png](asteroids-batch-20261011/before-mobile.png) |
| Mobile after, 390×844 | [after-mobile.png](asteroids-batch-20261011/after-mobile.png) |
| Seeded wave clear / paused / wave 2 | [clear](asteroids-batch-20261011/wave-clear.png) · [paused](asteroids-batch-20261011/wave-paused.png) · [wave 2](asteroids-batch-20261011/wave-2.png) |
| Seeded ship loss / game over | [ship loss](asteroids-batch-20261011/ship-loss.png) · [game over](asteroids-batch-20261011/game-over.png) |

## Limits

The model and browser play are not a ROM-accurate recreation. Acceleration, damping, projectile cap/cadence, starting ship count, wave population/speed schedule and saucer spawn/aim timing are locally tuned. The browser version adds pause and local score persistence; hyperspace currently grants short invulnerability, unlike the original unsafe re-entry behavior. We did not compare with an original cabinet/ROM, original hardware audio, physical phones, or measure frame-time. A real natural first-wave clear and later-wave completion remain unverified.

## Repository verification

- `node --test tests/*.test.cjs`: **56/56 passed** after implementation commit `abaad54e385c18364d6f28432c47ce347e802556`.
- `node --check` passed for `app.js`, `games-data.js`, the changed engine, and the three relevant test files; `git diff --check` passed.
- No package manifest or build/lint configuration exists in the repository, so no npm build or lint command is defined.
