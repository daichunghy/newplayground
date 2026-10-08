# Mạch Gió — Flappy Bird research and original candidate scope

Date: 2026-10-07
Catalog ID: `flappy-bird`
Candidate title: **Mạch Gió**
Status: original review candidate in PR #2. It does not claim to be a Flappy Bird product, an authorized remake, or a complete recreation.

## Reference and evidence level

The comparison target is the original .GEARS smartphone game, initially released on iOS on May 24, 2013; the exact store build and later platform patches are not identified or available in this task. The catalog ID names a game family; it does not settle the reference build. The 2024 revival is a separate release with additional modes and content; it is outside this candidate's scope.

Source review:

- [David Kushner's Rolling Stone interview with creator Dong Nguyen](https://davidkushner.com/article/the-flight-of-the-birdman/) (March 11, 2014), especially the account of tap-anywhere input, bird and pipe obstacle course, gravity tuning, and the decision not to add gameplay elements as the run progresses.
- [WIRED's contemporary report](https://www.wired.com/2014/02/flappy-bird/) (February 12, 2014), which describes tap to rise, release to descend, pipe-gap navigation, and one point per cleared pipe.
- [GamesRadar's report on the 2024 revival and Nguyen's public clarification](https://www.gamesradar.com/games/action/flappy-birds-og-creator-clarifies-he-didnt-sell-anything-to-the-blockchain-pushing-flappy-bird-foundation-thats-reviving-the-infamous-mobile-icon-i-also-dont-support-crypto/), for keeping the later revival distinct from the original target.

The contemporary interview supports this broad loop: tap to flap upward against gravity, pass between vertical obstacle pairs, earn a point for a cleared pair, and end a run after a collision. It also describes a sparse design with no new obstacle types added over time. This is source-reviewed evidence only. No original build, manual, footage measured frame-by-frame, or device input timing was used here.

The sources do **not** establish authoritative numeric gravity, flap impulse, scrolling speed, pipe width, gap size, height randomization, collision tolerance, or exact scoring frame. The candidate's values are authored tuning choices, not measured reference values; do not call them pixel-perfect or parity values. The catalog name also does not establish rights to distribute the historical title or any original game material.

## Initial one-run candidate scope (superseded by the 2026-10-08 campaign iteration)

Mạch Gió keeps the recognizable one-input lift-and-gap timing loop in a new visual setting. A small faceted glider falls under constant gravity; pointer/tap or Space gives it an upward impulse. Stepped stone gates scroll left, and a fixed, deterministic eight-center pattern gives each gate a visible gap. Passing one gate scores one point.

Candidate tuning in `scripts/games/flappy-bird-model.js`:

| Setting | Candidate value | Status |
|---|---:|---|
| Simulation step | 60 ticks/second | Implemented; browser timing not measured |
| Gravity | 0.31 world units/tick² | Authored candidate value; not sourced from reference |
| Flap impulse | −5.05 world units/tick | Authored candidate value; not sourced from reference |
| Gate width | 40 world units | Authored candidate value; not sourced from reference |
| Gap height | 116 world units | Authored candidate value; not sourced from reference |
| Gate speed | 2.55 world units/tick | Authored candidate value; not sourced from reference |
| Lives | 3 attempts | Deliberate candidate deviation |

A collision with a gate or either playfield boundary spends one of three attempts. Remaining attempts restart the gate pattern and player position while keeping the score; the last collision ends the run. The replay button resets the score and starts a new flight in one action. The reference game's source-reviewed loop ends on the first collision, so the extra lives and retained score are explicit scope differences. The candidate uses fixed gate heights instead of an unverified randomized distribution.

The artwork is drawn from original geometric primitives: a faceted amber glider, stepped teal gates, and a dusk sky. `assets/flappy-bird-original.svg` is a new cover. No reference sprites, pipe art, backgrounds, music, or sound effects are included. No audio is played. The original cover is registered in the shared asset manifest. The provenance of any legacy cover art remains unverified and it is not used by this candidate.

## Input and state

| Action | Input | Behavior |
|---|---|---|
| Flap/start | Canvas tap or pointer press; Space | Starts from ready or gives one upward impulse during flight |
| Pause/resume | P or pause button | Stops/restarts the animation frame loop |
| Replay | One button press after game over; pointer/Space also starts a fresh run | Resets score and attempts |

At the initial one-run checkpoint, the model was deterministic and fixed-step with no campaign, unlock, power-up, persistent progress, or audio system. A compact HUD shows score, attempts remaining, and the next gate number. Responsive canvas scaling, focus/visibility cleanup, pause, and replay are implemented; device behavior still needs browser acceptance.

## Rights and acceptance gates

All candidate code, drawing, styling, and cover geometry are original. No code or art was copied from a public clone. The legacy `flappy-bird` catalog ID and historical title still need title/route rights review before release. The original candidate is wired to the retained catalog route on the review branch; no live release is included. The old branded title is replaced in visible metadata with Mạch Gió; rights to the historical catalog ID and route remain unresolved.

Automated model and DOM-double tests cover gravity, impulse, deterministic stepping, scoring, collision, lives, replay, controls, pause, and cleanup. They are not browser/device playtests. Still pending: real desktop and mobile browser rendering, tap/Space feel, canvas scaling and accessibility checks, frame pacing/input latency, balance with new players, original-build comparison, and rights/title review. Do not label the candidate accepted or reference-complete until those checks have evidence.


## Three-stage campaign iteration — 2026-10-08

Mạch Gió now keeps the one-input lift-and-gap loop across three authored stages. Each route has four gates, a named setting and its own sky/stone palette; later stages narrow the gaps and increase scroll speed. Gate centers create a distinct slalom in each route. No new obstacle types, powers or controls were added.

| Route | Gap | Speed | Gate centers | Clear goal |
|---|---:|---:|---|---:|
| Ngõ sớm | 116 | 2.55 | 164, 190, 158, 198 | 4 gates |
| Bờ kênh | 108 | 2.75 | 166, 188, 160, 192 | 4 gates |
| Mái phố | 100 | 3.00 | 155, 165, 185, 188 | 4 gates |

A clear earns one to three stars from the tries remaining, unlocks the next route and records each stage's best stars. Three collisions are allowed per stage; route positions reset after a collision while already-earned gates stay scored. Players can select an unlocked stage, retry it, replay the final route, and resume their unlocked route/best stars after reopening. Midair physics are not saved.

The original 60 Hz gravity and flap values remain candidate tuning, not reference measurements. A deterministic model witness launches with one flap and then flaps every 32 simulation ticks; it clears all three stages from a fresh stage start. `tests/flappy-bird-model.test.cjs` checks that witness, stage geometry, score-once, retries, stars, unlock/replay and progress restore. `tests/flappy-bird-ui.test.cjs` covers route selection, stored progress, pause, retry, save failure and cleanup; DOM/Canvas doubles are not browser QA.

The campaign browser smoke is in `tests/browser/portal.spec.cjs`. The previous PR browser run is not evidence for this code. Current local verification is 10 model + 5 UI tests, plus route/copy integration checks; real browser/device, human balance, original-build comparison and historical title/route rights remain pending.
