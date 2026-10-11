# Bubble Trouble — one-player harpoon arcade

**Reference:** [Bubble Trouble on CrazyGames](https://www.crazygames.com/game/bubble-trouble-cpy), developer Kreso Cvitanovic, HTML5 browser release listed as September 2025; landscape orientation. Listing accessed 2026-10-11. This profile follows its one-player mode. The listing identifies left/right arrows and Space, a straight-up spike gun, bouncing bubbles that split into smaller/faster targets, losing a life on contact, and clearing the screen to progress.

## Scope and implementation

The catalog ID `bong-bong-nuoc-bubble-trouble` now opens a separate 900×560 landscape playfield instead of the shared reflex target canvas. The player steers along the floor and fires one rising harpoon line. Large bubbles split into two medium bubbles, then four smaller bubbles; the smaller sizes move faster. The player has three lives and brief hit protection after contact. Clearing every bubble advances through a ten-stage local mini-campaign; losing the last life ends the run. Pause, retry, keyboard input, pointer/touch steering and a local score/best-stage record are supported.

The canvas uses original vector-drawn bubbles, a small coat-wearing hunter, and a subdued night-city backdrop. The muted warm HUD and bright size-coded bubbles separate score/control information from danger. The playfield keeps a 45:28 landscape ratio; on narrow screens the full board remains visible and touch buttons stay at least 44px high. No reference sprites, screenshots, sound recordings, level maps or code are included.

## Deliberate deviations and unverified details

The CrazyGames listing does not publish its level maps, exact starting bubble count, score values, gravity, velocity, hitbox, harpoon cooldown, total lives or exact campaign length. Those are local design choices here: one large bubble on stage one, progressively more large bubbles, ten stages, three lives, local points by bubble size and procedural timing. No two-player mode, power-ups or the reference's complete stage set is implemented. The listing's general claim of increasingly difficult levels is the progression reference; this adaptation does not claim to reproduce its exact campaign.

Touch steering maps a drag to horizontal position while holding fires; dedicated held left/right/fire buttons support one-handed taps. Bubble geometry and all vector art are procedural and local. Audio cues reuse the project's existing optional synthesized arcade sounds; they are not recordings from the reference. Best score and furthest stage are stored locally, but an in-progress stage is not resumed.

## Evidence

Browser interaction, loss/retry, stage-one completion and stage-two entry are recorded in [`../qa/bubble-trouble-batch-20261011.md`](../qa/bubble-trouble-batch-20261011.md). Source rules were read from the listing; this run did not compare each level against the hosted reference build. Human difficulty testing and physical mobile devices remain open.
