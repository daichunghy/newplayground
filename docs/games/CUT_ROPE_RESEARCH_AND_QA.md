# Cắt Dây — research notes and QA

## Scope and reference boundary

The catalog title **“Cắt Dây Cho Ếch Om Nom”** is used only as a catalog locator for the planned rope-cutting puzzle. It does not establish a license, permission to use a third-party character or mark, or evidence that this prototype matches any historical release. This implementation is an original, small-scope physics puzzle with a leaf frog, wrapped candy, garden scenery, level layouts, and interface art drawn in code or authored as local SVG.

The backlog describes cutting a gravity-driven tether, collecting three stars, and feeding a receiver. This prototype follows that high-level mechanic and makes its own three short stages. No external images, sounds, fonts, or runtime packages are loaded.

## Rules and controls

- A candy begins on a pendulum tether. Gravity advances the swing while the rope length stays fixed.
- Swipe across any visible rope segment to sever it. The candy then follows a ballistic arc.
- Collect the three stars by passing close to them; each is worth 100 points.
- Catching the candy awards 100, 130, or 170 stage points. Collecting all three stars adds a 250-point bonus.
- A spike or a fall beyond the play area ends the attempt. Restart keeps earlier completed stages and clears points earned on the current attempt.
- Pause freezes the simulation. The game also pauses on window blur, page hide, and hidden-tab changes.
- Touch/mouse: drag across the rope. Keyboard: Space cuts, P or Escape pauses. A 48px “Cắt dây” button provides an accessible non-swipe action; pause and restart controls are also 44px or larger.

## Authored stages

| Stage | Layout intent | Additional challenge |
| --- | --- | --- |
| Hiên Nắng | First right-to-left pendulum; stars trace the forgiving drop arc toward a low receiver. | No hazard; teaches release timing. |
| Cầu Lau | Mirrored left-to-right swing with a higher receiver. | A spike bed penalizes a badly aimed release. |
| Vườn Trăng | Longer right-to-left arc and a slightly heavier feel. | Edge spikes and a narrower useful release window. |

The model uses a fixed 360×540 world and a 1/120-second fixed simulation step. Its public view returns copies of stage geometry and state so the renderer cannot mutate the rules.

## QA evidence

Focused checks live in `tests/cut-rope-model.test.cjs` and `tests/cut-rope-ui.test.cjs`. They cover authored stage data, tether length and swing, rope-segment cutting, ballistic release, star and receiver scoring, a missed-release loss, pause/resume/restart/advance, keyboard and pointer input, hidden-tab/pagehide interruption, and session cleanup.

Manual browser QA should confirm that:

1. Each rope can be cut with a short swipe and with the keyboard/button fallback.
2. Star contact, spikes, receiver capture, and level-end overlays are visually legible at narrow and wide viewport sizes.
3. A hidden tab pauses, returning resumes only after an explicit action, and closing the game removes its animation and input handlers.
4. Reduced-motion settings do not hide state or disable input; the simulation remains deterministic and independent of animation frame frequency.

## Known limits

This is a compact three-stage prototype rather than a level editor or a historical recreation. Rope pieces are visible cut targets along one constrained tether; there are no animated bubble lifts, movable ropes, save data, sound effects, or undo. The original artwork and stage geometry are intentionally independent. No visual browser run has been performed as part of this implementation task.
