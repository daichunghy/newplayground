# Mầm Măm — gameplay notes and QA

## Identity and provenance

The stable catalog ID and route remain `cut-the-rope`; the NewPlayground display title is **Mầm Măm**. Its catcher is Mầm, a purple seed-pod spirit with a leafy crest, inset eyes, and a bowl-shaped mouth. The moving object is a speckled seed with two leaflets. Both are drawn from original Canvas paths and a locally authored SVG cover. The game loads no third-party character art, image, sound, font, CDN asset, or runtime package.

## Rules and controls

- A seed swings from a tether under gravity. Swipe across a visible rope segment to release it.
- Collect three stars (100 points each) and land the seed in Mầm's catch zone for a stage bonus. All three stars add another 250 points.
- Spike contact or a fall beyond the garden ends the attempt. Restart preserves earlier stage points and clears the current attempt's award.
- Pause freezes the simulation. Blur, page hide, and hidden-tab changes pause automatically.
- Touch and mouse use the same pointer swipe. Space and the 48px “Cắt dây” control offer a no-swipe action; P or Escape pauses. The 44px pause and replay controls remain available by touch.

## Authored stages

| Stage | Layout intent | Additional challenge |
| --- | --- | --- |
| Hiên Nắng | Right-to-left swing; stars follow a forgiving route to the lower target. | No hazard; teaches timing. |
| Cầu Lau | Mirrored swing toward a higher target. | Spike bed punishes an early release. |
| Vườn Trăng | Longer swing and a narrower landing window. | Edge spikes challenge release timing. |

The rules use a fixed 360×540 world and a 1/120-second fixed step. Target contacts are swept along each step, so a moving seed cannot skip through a star, spike, or catch zone between updates. Public view data is copied before the renderer reads it.

## QA evidence

`tests/cut-rope-model.test.cjs` covers stage setup, fixed-step tether behavior, line-to-rope cutting, swept-circle geometry, star/receiver/hazard outcomes, scoring, miss and restart, pause, and replay. `tests/cut-rope-ui.test.cjs` covers touch pointer gestures, button and keyboard inputs, mismatched multi-touch pointer IDs, pointer cancellation, pause/resume, hidden-tab and page-hide handling, level advance, and session cleanup.

Chromium browser verification against the local static app passed at 320×800 and 1280×800. Both sizes had no horizontal overflow and no browser-console errors. At 320px the arena rendered at 218×327px; pause/replay were 44×44px and cut was 94×48px. The browser run paused/resumed/restarted, used Space to clear the first stage with all three stars, used a deliberately mistimed release to hit the second-stage spike, cut with a touch pointer swipe, and closed the game with its session stopped. At desktop, the Space-key clear, pause/replay, no-overflow check, and session teardown passed.

## Limits

This is a compact three-stage prototype. It has no save data, sound, undo, movable ropes, or level editor. The cut is tested against the visible rope; there is no separate blade or rope-to-rope collision simulation. The authored Canvas/SVG art is local and original; external asset sourcing is not part of the runtime.
