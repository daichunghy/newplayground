# Mục Tiêu Bay — provenance and QA

## Reference and version scope

- Reference checked: the US NES instruction booklet, ©1985, for the original Duck Hunt Game Pak. A scan is hosted by [The NES Files](https://www.nesfiles.com/NES/Duckhunt/Duckhunt.pdf), rather than by Nintendo. Its Game A section describes one duck at a time, three shots, a short flight window, ten ducks per round, and a pass line that rises in later rounds. Game B has two ducks at once; Game C is clay shooting.
- [Nintendo UK’s Duck Hunt product page](https://www.nintendo.com/en-gb/Games/NES/Duck-Hunt-946955.html) separately summarizes Game A/B/C and notes the Wii Remote-era Wii U release. This page is publisher-authored, but is not the 1985 booklet and mixes NES and Wii U product information. Nintendo’s [NES Classic manual help page](https://en-americas-support.nintendo.com/app/answers/detail/a_id/17352/p/866/c/898) points owners to the Classic Edition’s online manual portal; it does not establish that its presentation or timing matches every cartridge region.
- Version ambiguity: the detailed round/pass-line facts here are taken from a US booklet scan. Region, cartridge revision, and later Wii U/Classic presentations may differ. The prototype avoids claiming to reproduce a specific revision or the Zapper’s light-sensing behavior.

## Original design choices

- Player title: **Mục Tiêu Bay**. The playable target is a made-from-shapes marsh bird, not a copied sprite. The sky, hills, plants, sun, reticle, colors, and animation are generated with Canvas paths; there are no imported images, sounds, maps, screenshots, or third-party libraries.
- Scope: one immediately playable five-flight gallery. Each target travels for 3.2 seconds and allows up to three shots; a hit scores 100, while using all shots or letting the target escape records a miss. The round always ends after five targets and can be replayed. These timings, scoring, count, movement, and graphics are prototype decisions, not claims about the NES game.
- Controls: pointer movement aims, pointer/touch press shoots at the pressed position, arrow keys/WASD move the reticle, Space/Enter fires, and visible 46-pixel touch buttons provide aim and fire. Pause, hidden-tab/blur pausing, and lifecycle cleanup are included.
- The design intentionally contains no hunting dog, laugh, clay mode, second player, power-ups, campaign, currency, original title/logo, original in-game copy, or game audio. The mechanics are described in new short Vietnamese text.

## Five-flight course iteration — 8 October 2026

- The quick five-target gallery remains five flights with three shots and a 3.2-second window. Each flight now has a named authored path: Quét Ngang, Cánh Cao, Lượn Cỏ, Đảo Gió, Gió Cuối. Vertical arcs, lateral drift, speed, and the fourth/fifth flight reversal distinguish the aiming decisions while keeping the same pointer/keyboard/touch controls.
- The later direction change is telegraphed with an amber ring 700 ms ahead and announced to assistive technology. A new flight label is also provided in the canvas label and visible scene.
- This is candidate-authored variety, not Duck Hunt round parity. No light-gun behavior, targets, sprites, or maps from an edition are copied.

## Fresh replay patterns — 8 October 2026

- The rules model remains reproducible when callers provide a seed. The mounted game now generates a fresh seed on entry and on each retry, so the random starting side, height, and movement phase produce a different five-flight pattern instead of replaying the model's fixed default sequence every time.
- This adds replay variety without changing the five-flight loop, shot count, timing, or authored course profiles. The UI test injects two known seeds and verifies a retry starts with the second one; model tests continue to verify same-seed determinism.

## QA record

Run from the repository root:

```sh
node --test --test-concurrency=1 tests/ban-vit-bay-model.test.cjs tests/ban-vit-bay-ui.test.cjs
python3 -m http.server 8080
```

Open `http://localhost:8080/ban-vit-bay-preview.html` for the standalone playable preview.

The focused suite has 12 model/UI tests. Deterministic checks cover seeded motion, aim bounds, hit/score, shot limits, timeouts, course variation, round completion, pause, and invalid time steps. DOM/lifecycle doubles check immediate start, pointer/touch/keyboard inputs, accessible labels and touch sizes, pause and visibility/blur recovery, finish/retry with a fresh seed, and session cleanup.

An actual Chromium smoke has been added for the named fourth flight and its telegraphed turn; its current result will be reported separately. This remains distinct from touch-hardware latency, accessibility review, and human playtest.
