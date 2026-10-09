# Bi Vòm: research, rules and QA

Reviewed 2026-10-08 UTC. Candidate build: `bi-vom-campaign-2`. Catalog ID: `puzzle-bobble-khung-long`.

## Reference scope

The catalog title does not identify a platform, release, mode or edition. Taito's official **Puzzle Bobble Journey** page describes shooting bubbles to match three or more, clearing stage goals, wall-bounce shots, and combo clears. Its **Puzzle Bobble Everybubble!** page identifies the current product as an action puzzle/bubble shooter. These are primary operator sources for the products named on those pages, not evidence that the historic NewPlayground entry came from either build:

- Taito, [Puzzle Bobble Journey](https://www.taito.co.jp/en/mob/0000001593), reviewed 2026-10-08.
- Taito, [Puzzle Bobble Everybubble!](https://www.taito.co.jp/en/PBEverybubble), reviewed 2026-10-08.

No exact historic edition was located and this candidate makes no character, stage, story, soundtrack, or build-parity claim.

## Chosen candidate rules

- A six-stage original campaign starts directly on authored staggered boards with four original bubble symbols. Each stage has its own fixed queue, distinct layout and retry path. Later boards add denser color groups, support branches that fall when their anchor group is cleared, single-bubble targets that must be paired before the next same-color shot completes a match, and a layered board where wall-bank shots can clear a pair behind its support.
- Aim with pointer/touch or the left/right keys. A shot travels upward, reflects at the side walls and attaches at first contact. Space or the Bắn button fires; a board tap chooses an aim and fires in one action.
- Three or more connected bubbles of the shot color pop. Any bubbles no longer connected to the ceiling fall away. Each stage has recovery shots; clear the board before its queue runs out. Chơi lại restores the same stage, and completed stages remain available for replay while the next stage unlocks in order.
- Shape marks accompany color, so the groups remain distinguishable without color vision. A score rewards popped bubbles, fallen groups and unused shots. The browser keeps a versioned local best/progress record; malformed records are preserved as a recovery copy, newer schemas are left untouched, and storage failures leave the current session playable.

The wall rebound and match-three rules follow Taito's broad description. The authored layouts, four-symbol palette, stage queues, scoring, deterministic replay and grid contact rule are project choices. We did not copy named characters, title art, levels, UI text, screenshots, music or code.

## Authored boards and witness checks

`scripts/games/bubble-dome-campaign.js` contains six fixed boards, names, short clues, shot queues and shot-angle witnesses. `tests/bubble-dome-campaign.test.cjs` replays every witness through the rules model, checks each intermediate bubble count, proves the blue/mint support branch falls in stage 3, checks that stage 5's three singles need six shots, and verifies stage 6 banks twice before clearing its support to drop a three-bubble branch. Witnesses clear in 1, 2, 2, 4, 6 and 4 shots; the queues contain 3, 4, 5, 8, 8 and 6 shots. Stages 5 and 6 are a content-depth iteration; these deterministic paths establish solvability, not enjoyable or fair human difficulty.

## Original work and provenance

The Bi Vòm name, bubble and board treatment, SVG cover, symbols, colors, interface and source code were created for this candidate. The same four distinct shapes are drawn on the moving bubble and board. Local integration wires the exact catalog route and adds `assets/bi-vom-original.svg` to the shared asset manifest and register; the isolated candidate source retains its own cover.

## Automated checks

Run at low test concurrency:

```text
node --test --test-concurrency=1 tests/bubble-dome-model.test.cjs tests/bubble-dome-campaign.test.cjs tests/bubble-dome-ui.test.cjs
```

Result: 8 model tests, 3 campaign/progress tests and 6 DOM-double lifecycle/input tests pass. Coverage includes deterministic setup, reciprocal staggered neighbors, collision attachment, cluster removal, detached-bubble removal, bounded wall reflection, shot exhaustion, restart, invalid inputs, all six solvability witnesses, single-bubble pairing progress, two measured wall rebounds, the anchor-drop decision, progression/save edge cases, stage selection, pointer/key controls, blur/focus, hidden-tab visibility and resource cleanup.

Route-flow and minimal-play integration checks pass 66/66 at test concurrency 1. The 2026-10-08 lifecycle audit adds a hidden-tab regression: projectile frames stop on `visibilitychange` and restart only after visibility returns. Campaign stage selectors now meet the 44px touch target. Static `node scripts/release-preflight.mjs` passes: 150 catalog IDs, 50 prototypes, 100 planned, 133 declared asset files, 1,563,716 source JavaScript bytes and 19,868,424 asset bytes. This check does not build or visually verify the static site. `git diff --check` passes.

DOM doubles do not verify real rendering. Browser/device/touch, screen-reader, motion/feel, difficulty and novice-playtest acceptance remain pending, as do historical title/route clearance and final public distribution review.
