# Dắt Cún Qua Đường — research and QA

Updated 2026-10-09. Status: original prototype; desktop/mobile Chromium smoke coverage exists, while device and human acceptance remain open.

## Research and scope

The catalog title was planned without an engine. A registry review found no active game built around a fixed pedestrian signal and a timed crossing. The closest genre references are explicitly different: Hasbro's Game.com *Frogger* manual describes directional hopping through multiple traffic and river hazards toward home bays, with lives and a timer; Apple's *Crossy Road* listing describes an endless hopper across roads, railroads, and rivers. This prototype is a finite one-crosswalk timing game, not a grid hopper, river crossing, endless run, or reproduction of either reference.

- [Hasbro Frogger Game.com manual](https://www.hasbro.com/common/instruct/FROGGER.PDF) — genre context: traffic timing, collision/life failure, destination, and timer.
- [Apple App Store: Crossy Road](https://apps.apple.com/us/app/crossy-road/id924373886) — product description confirms its endless multi-hazard scope, which this game does not use.

## Round and controls

- Five dogs wait on a safe sidewalk. The round begins immediately with a 20-second clock and a green pedestrian signal.
- Tap **Dẫn cún qua** or press Space once to send the next dog. A dog that enters on green reaches safety even if the light changes during the crossing animation.
- Pressing while red costs one of three mistakes and breaks the score combo. Three red attempts or the timer ending is a loss; saving all five is a win.
- A paced-first-play walkthrough (0.8s to read, one red mistake, then 0.7s reaction per green) wins in about 14.92s and leaves about 5.08s. The timer was shortened from 28s to 20s to keep the round finite without making a cautious first run fail.
- Each safe crossing awards 100 points. Consecutive safe entries add 25 points each, capped at a +100 combo bonus; the final crossing adds the remaining-time bonus.
- Tap **Ⅱ** or press P to pause. The round also pauses when the window loses focus or the document becomes hidden. Restart resets dogs, score, clock, and misses.

The scene is a single fixed crosswalk with original Canvas dogs, traffic, signal and sidewalk; it deliberately avoids the scrolling lanes and hopping grid that distinguish the benchmark games. The cover is a project-authored SVG. No borrowed game code, logos, character art, or audio are used.

## Verification

- `node --test tests/dog-crossing-model.test.cjs` — 6 model tests cover start, safe crossing, signal cadence during crossing, red-light loss, full-round win/scoring, pause/resume, timeout and restart.
- `tests/browser/portal.spec.cjs` — full browser suite: 40/40 passed, including every registered route. It includes a 320px touch regression where three red attempts show the loss state and a cross-device play case exercising safe crossing, pause/resume, restart, touch-sized controls, overflow and session teardown.
- Automated browser coverage is not physical iOS/Android testing, assistive-technology acceptance, or a novice playtest. Motion feel, color contrast in sunlight, sound, and the catalog title's distribution rights remain unaccepted.

## Release gates

`data/game-quality-evidence.json` records the prototype and research sources. Reference parity, human playtest, device QA and distribution approval remain pending; this is not a Frogger or Crossy Road replica claim and is not marked release-ready.
