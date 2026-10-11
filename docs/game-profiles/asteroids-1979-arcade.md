# Asteroids — Atari upright arcade (1979), one-player baseline

**Status:** Dedicated prototype, deterministic model-tested and browser-played through seeded wave progression, loss, touch and lifecycle checks. A natural full-wave clear was not achieved, so this is not accepted as a recreation. This identifies the arcade title and single-player baseline; the exact ROM revision, cabinet DIP settings and original frame constants have not been established.

## Reference and evidence

- The Strong National Museum of Play, [Asteroids](https://www.museumofplay.org/games/asteroids/), published 2024-03-13; accessed 2026-10-11. Its history entry documents the 1979 arcade context, five controls, drifting movement, hyperspace, occasional saucers, splitting boulders and vector display.
- Atari, *Asteroids Operation, Maintenance and Service Manual*, TM-143 scan: [arcade-museum PDF](https://www.arcade-museum.com/manuals-videogames/A/asteroids_tm143.pdf), consulted 2026-10-11. This is an original technical manual scan; the manual identifies configurable game variations. A public OCR transcription of Atari's 1979 Atari 2600 manual at [AtariAge](https://atariage.com/manual_html_page.php?SoftwareID=828) helps confirm controls, wrap and score values, but it is a different platform and is not treated as the arcade ruleset.
- No ROM, game code, screenshot, cabinet art, sound recording or vector list was imported. Reference research describes behavior only.

## Observed reference behavior and implementation scope

| Topic | Reference baseline | Current NewPlayground implementation |
| --- | --- | --- |
| Objective and loop | Rotate and thrust through a moving asteroid field; fire; large rocks split into smaller/faster ones; survive, clear a field, continue to the next | Dedicated ship/rock loop with three rock sizes and waves; continuous play until ships run out |
| Playfield and HUD | Full-field vector space; score and remaining ships are prominent; objects wrap at the boundaries | 960×720 canvas (4:3 is a project choice; original cabinet ratio not measured), edge-copy rendering; compact score/wave/ship/high-score strip |
| Controls | Left/right rotate, thrust, fire and (in variants) hyperspace | Arrow keys/A-D rotate, Up/W thrust, Space fires, Shift hyperspace; matching pointer hold buttons |
| Scoring/progression | Arcade manual documents large/medium/small rock values 20/50/100 and configurable bonus-ship thresholds; later fields get harder | Rock values 20/50/100; one extra ship each 10,000 points; wave count/speed increase using a deterministic local rule |
| Opponent/hazard | Occasional flying saucer; manual and difficulty settings vary its behavior and when it appears | Two original vector saucer silhouettes with aiming shots, on a local timer. Exact arcade spawn thresholds/aim logic are not claimed |
| Failure/retry | Ship collision/hostile fire loses a ship; last ship ends the run | Three initial ships; collision/hyperspace hazards can cost a ship; Enter or Restart starts a fresh run |
| Pause/persistence | Cabinet has no software pause; arcade high-score table uses initials | Added browser pause for usability; local best score persists. No initials or cabinet score cap |

The present build is a mechanics-focused prototype, not a frame-accurate simulation. Acceleration, damping, projectile cadence/cap, starting ships, wave population and saucer schedule/aim are local tuned values, not measured original constants. Hyperspace currently grants brief invulnerability, so its re-entry risk differs from the cabinet. These deviations need playfeel comparison and further adjustment.

## Art, sound and rights

Asteroids, ship, saucers, stars, bullets, status and transitions are drawn with new Canvas paths/colors in `scripts/engines-archetypes.js`. Sounds call the project's existing synthesized `NP_Audio` effects. These are original project representations; the arcade reference is not permission to reproduce Atari vector artwork or recordings. No external assets were added in this batch.

## QA remaining

- The natural fresh browser run held Left+Space for 30 seconds but did not clear wave 1 (score 380, one ship left). The separate short progression check used a seeded setup with one small rock remaining and a real Space hold to clear wave 1; it then opened wave 2 with five large rocks. This proves the transition and next-wave start, not a natural full-wave clear.
- Browser emulation held the Thrust touch control and verified acceleration/coasting, but physical-device behavior is untested. Same-size before/after desktop and mobile screenshots are in [`../qa/asteroids-batch-20261011/`](../qa/asteroids-batch-20261011/).
- Compare motion, wrap edges, rock split/scoring, saucer, ship loss, sounds and keyboard repeat against a pinned cabinet/ROM baseline. Current values are locally tuned. No original cabinet, hardware audio comparison, physical phone or frame-rate benchmark has been run.
