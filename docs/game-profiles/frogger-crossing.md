# Frogger — crossing-game batch profile

**Status:** Prototype/model-tested and browser-played through stage 2 in the stated scope; not accepted as a faithful recreation of a pinned arcade or console edition.

## Reference and evidence

- [PixelatedArcade Frogger overview](https://pixelatedarcade.com/games/frogger/), accessed 2026-10-11. This secondary description supports traffic lanes, a river with moving platforms, five home slots and a timer/life loop.
- This effort did not select an exact ROM/build, cabinet difficulty, regional variant, or platform-specific release. It did not measure original lane speeds, hitboxes, scoring or timer constants. These must be researched before making a fidelity claim.

## Current implementation observations

- Local board: 11 columns × 11 rows; four car lanes, a safe center strip, four river lanes and five target homes.
- Input: arrow/WASD single-cell hops; touch buttons and a board swipe; key/button resolves the logical hop immediately and a 95ms visual arc follows.
- Rules: cars and unsupported water lose a life, logs carry the frog, home slots award score, all five advance the stage, timer expiry loses a life. Increasing stage adjusts lane speed and time.
- HUD: stage, score, lives, home progress and timer; the canvas occupies the main modal area. Original vector shapes are used.
- Progress record stores best score and stage in localStorage. Pause freezes the intermission; restart resets the run.

The model's local dimensions, speed curve, timer, score and animation are project choices, not original measured values. Original screenshots/art/code/audio were not copied; references support behavior only.

## Browser evidence and remaining work

Chromium automation opened the real routed game, filled all five homes in stage 1, paused/resumed during the stage-clear transition, observed stage 2, caused one water death with a real key press, restarted three times, closed/reopened, and measured 17 game-session listeners/one RAF while open and zero after closing. Evidence and limitations are in [`../qa/crossing-gameplay-batch-20261011.md`](../qa/crossing-gameplay-batch-20261011.md).

Exact edition and source comparison remain open. Physical iOS/Android devices, original controls/speeds, accessibility tooling and device performance were not assessed.
