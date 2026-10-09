# Cú Sao Gác Đèn: research and QA

## Identity and artwork

The user-facing title is **Cú Sao Gác Đèn**. Its stable catalog locator remains `pinball-3d-space-cadet` so existing links and saved IDs continue to resolve; the locator is not shown in the game UI. Cú Sao is an original owl-like lamp keeper created for NewPlayground, shown in the inline game SVG and the cover.

The table and cover were authored as SVG paths, circles, gradients, and text in this repository. They contain no linked raster files, external image URLs, sprites, font downloads, or copied table image. The renderer draws the ball, bumpers, plates, rails, flippers, and mascot from code-native SVG. No third-party artwork or source imagery is used. This is an original two-dimensional design, not an attempt to recreate a named commercial table.

## Rules and physics

- Launch one ball at a time. The player starts with three balls; crossing the lower drain costs one and serves the next from the launcher lane.
- Gravity, wall responses, three upper bumpers, three lower relay plates, and both flippers run in fixed 1/120-second steps. Frame deltas and ball speed are capped.
- Each of the six distinct lamps scores once. Bumpers can award a smaller repeat-hit score. Lighting every lamp wins; draining all three balls loses.
- Flippers use authored line-segment contacts and a stronger upward impulse while held. The simplified model has no coil timing, table tilt, 3D spin, material calibration, or real-machine geometry.
- Degenerate bumper-center contact uses a stable outward normal, and restored state velocities are limited to the same speed cap as live play.

## Controls and lifecycle

- Launch: **Phóng** or Space.
- Left flipper: hold **Trái**, Left Arrow, or A.
- Right flipper: hold **Phải**, Right Arrow, or D.
- Pause/resume: **II / >** or P. Restart: **↻** or R.
- Touch flippers release on pointer-up, pointer-cancel, pointer-leave, lost capture, blur, interruption, or restart. The touch buttons are at least 48 CSS pixels high.
- At 320-pixel widths, the table and HUD compact so the controls fit on-screen; the touch buttons expose their held state to assistive technology.
- The animation loop and event listeners belong to `NP_GameSession`. Hidden-tab, pagehide, and window-blur interruptions pause the game; returning requires an explicit resume.

## QA record

Focused automated checks are `tests/orbit-pinball-model.test.cjs` and `tests/orbit-pinball-ui.test.cjs`; the focused Node run passed **15/15**. They cover deterministic launch and gravity, fixed-step chunking, all bumper/plate contacts, center-overlap collision, target scoring and victory, flipper hit/release, three-ball drain/loss, inconsistent restored states, velocity limits, pause/restart, pointer and keyboard input, interruptions, and session cleanup. Both game scripts pass `node --check`.

Chromium was also exercised against the integrated route in **320×800 mobile** and **1280×900 desktop** contexts. The page fit each viewport width; all five game buttons measured at least 46×46 CSS pixels. A held touch activated the flipper and touch-end released it. Space launch, arrow-key hold/release, pause/resume, keyboard restart, and closing the game session passed at both sizes. A seeded browser collision lit a bumper for 500 points and showed the rebound; seeded final-target and last-ball drain states displayed the win and loss overlays. The frame loop advanced 113 fixed simulation steps during a 1,004 ms desktop sample, with no browser page errors. Closing the game removed its session DOM; the UI harness also confirmed its listeners and animation frames were cleaned up.

The art audit found only authored SVG primitives and no external images or linked artwork. Chromium and model simulations verify interaction and boundary behavior; physical devices, extended play sessions, and user testing remain unverified.
