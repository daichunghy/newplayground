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

## QA record

Run from the repository root:

```sh
node --test tests/ban-vit-bay-model.test.cjs tests/ban-vit-bay-ui.test.cjs
python3 -m http.server 8080
```

Open `http://localhost:8080/ban-vit-bay-preview.html` for the standalone playable preview.

Result on 2026-10-08: **10 passed, 0 failed**. The deterministic model checks seeded motion, aim bounds, hit/score, shot limits, timeouts, round completion, pause, and invalid time steps. DOM/lifecycle doubles check immediate start, pointer/touch/keyboard inputs, accessible labels and touch sizes, pause and visibility/blur recovery, finish/retry, and session cleanup.

This is source-level model/DOM QA. No real browser/device visual, pointer-latency, or touch-hardware run was performed. The work is an independent candidate module; it is not yet connected to the shared app shell or catalog.
