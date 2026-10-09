# Thổi Bong Bóng Xà Phòng — design and QA dossier

**Catalog ID:** `thoi-bong-xa-phong`
**Current readiness:** Integrated playable prototype with model and Chromium interaction coverage. Physical-device playtest, human clarity/balance review, accessibility acceptance, and release review remain open. This is not production-ready.
**Scope:** One short ascent course with three fixed openings. Each attempt starts fresh and can be replayed.

## Core loop

Hold **Thổi** (or Space) to add pressure. The bubble grows and rises faster while held. Releasing lets pressure leak away, shrinking the bubble and reducing lift. Hold left/right (or arrow keys / A-D) to steer. Cross all three fixed openings, then reach the garden porch. Contact with the thorn edge, sustained overinflation, or the 24-second timer ends the run. A safely crossed opening scores 150 points; the finish adds a time and gentle-pressure bonus.

The model makes the causal relation explicit: bubble radius is `22 + charge × 18`, charge rises at `0.43/s` while held and leaks at `0.23/s` after release, and upward speed is `12 + charge × 110` logical pixels per second. Holding at or above 96% charge for 0.26 seconds pops the bubble. These values are game tuning, not a real-fluid simulation. The changing air meter and drawn bubble radius expose pressure while play is happening; the gaps are fixed and their edges are drawn as thorns.

## Distinctness review

The name shares a bubble motif with catalog prototypes, but the interaction and state loop are different:

| Comparison | Existing loop | This game's loop |
| --- | --- | --- |
| Bubble Dome | Aim/fire colored projectiles, match clusters, clear the ceiling | The player is the rising bubble; maintain an air state and steer through fixed vertical openings |
| Bubble Trap | Run/jump as a platform character, fire bubbles to trap and pop enemies | No enemies or shots; held breath continuously changes radius and vertical lift |
| Flappy Bird | Tap a fixed upward impulse while the world and gate pairs scroll horizontally | Sustained pressure changes size and lift; release leaks that state; the player steers laterally through stationary windows |
| Sea Garden | Feed fish, collect pearls, defend the aquarium | No caretaking, economy, fish, or defense; it is a single skill course with immediate collision feedback |
| Line Rider (this batch) | Draw a track, then ride its slope physics | No drawing or authored path; fixed gaps are traversed using a pressure control |
| Dắt Cún Qua Đường (this batch) | Time a discrete crossing to a traffic signal | Continuous lift/size and steering are the core controls, not signal timing |

This comparison is based on the checked-in models `scripts/games/bubble-dome-model.js`, `bubble-trap-model.js`, `flappy-bird-model.js`, `sea-garden-model.js`, `line-rider-model.js`, and `dog-crossing-model.js`. It also separates the action from direct-tap reflex games: releasing the main input changes an ongoing pressure state rather than triggering one scored action.

## Research and design assumptions

- MIT BLOSSOMS' physics lesson describes surface tension, minimum-area bubble shapes, and the colors in soap bubbles. This informed the iridescent highlight treatment and the choice to show the bubble changing shape/size, but its classroom physics is not presented as gameplay law: [The Science of Soap Bubbles](https://web.mit.edu/blossoms/videos/lessons/science_soap_bubbles/).
- The flight equations, safe windows, time limit, score values, overpressure rule, and controls are original design assumptions. Charge and leakage are abstract controls that make a one-touch action observable. They should not be used to teach quantitative bubble physics.
- All art is newly authored for this prototype in Canvas and [`thoi-bong-xa-phong.svg`](../../assets/covers/thoi-bong-xa-phong.svg). No external images, sound, game code, character names, or downloaded assets are used.

## QA evidence and remaining work

- `tests/soap-bubble-garden-model.test.cjs` covers a deterministic successful route and score, thorn collision, overpressure loss, charge decay, pause/resume freeze, restart, timeout, and invalid time-step handling (5/5 pass).
- An isolated real-Chromium mount check passed at 320px touch emulation and 1280px desktop: no horizontal overflow, 56px blow target, held touch/mouse inflates, pause/resume works, keyboard-guided course win displays the win overlay, replay resets, and cleanup removes the game DOM. The game is registered under its exact catalog ID, has its own original cover and asset-manifest entry, and passes the checked-in portal test at 320px touch and 1280px desktop. The test holds touch controls to complete all three gates and win on mobile, completes the same route with keyboard input on desktop, pauses/resumes, restarts, checks overflow and closes the session. Chromium emulation does not substitute for physical-device or human acceptance.
- Physical touch ergonomics, screen-reader usability, reduced-motion/device performance, and rights clearance for the catalog title have not been accepted. Do not mark release-ready until those checks are complete.
