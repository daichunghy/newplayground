# Orbit pinball prototype: research and QA

## Scope and identity

`pinball-3d-space-cadet` is the catalog locator for this original browser prototype. The historic title is used only to identify the requested catalog slot. The title treatment, table art, layout, field geometry, target arrangement, code, and soundless play loop here were authored for NewPlayground. Rights clearance and any claim of parity with the historic game remain unverified; no source assets, branded artwork, or copied table layout were used.

The play surface is a responsive SVG scene backed by a deterministic JavaScript model. It is deliberately two dimensional and lightweight so it can run without a graphics or physics dependency.

## Rules and physics

- One launched ball is active at a time. The player has three balls; crossing the lower drain costs one and serves the next from the launcher lane.
- Gravity, wall responses, bumpers, six one-time targets, and both flippers run in fixed 1/120-second steps. Frame deltas are capped before simulation.
- Three upper bumpers and three lower relay plates light when contacted. Each unique target adds its authored score; bumpers can award a smaller repeat-hit score. Lighting all six targets wins immediately. Draining all three balls first loses.
- Flippers are simplified line-segment contacts with a stronger upward impulse while held. They do not model coil timing, table tilt, 3D spin, material restitution, or calibrated real-machine geometry. That keeps the rules small and outcomes repeatable; it is not a real-world pinball simulation.

## Controls and lifecycle

- Launch: Launch button or Space.
- Left flipper: hold the left touch button, Left Arrow, or A.
- Right flipper: hold the right touch button, Right Arrow, or D.
- Pause/resume: pause button or P. Restart: restart button or R.
- Touch controls are at least 44 CSS pixels high. Keyboard, touch, and pointer input operate the same model.
- The game owns its animation frame and listeners through `NP_GameSession`; hidden-tab, pagehide, and window blur interruptions pause play and require explicit resume.

## QA record

Focused automated checks are `tests/orbit-pinball-model.test.cjs` and `tests/orbit-pinball-ui.test.cjs`. They cover deterministic launch and gravity, fixed-step chunking, bumper and plate scoring/rebound, target-based victory, flipper contacts, three-ball drain/loss, pause/restart, touch and keyboard controls, interruption behavior, and session cleanup. The focused Node run passed all 12 checks, and `node --check` passed for both game scripts. These DOM doubles do not verify browser rendering or physical device input.

The standalone cover is `assets/covers/orbit-pinball-original.svg`. It was created for this prototype and does not establish rights or visual parity for the catalog locator.
