# Ghép Phân Tử — original puzzle prototype

Catalog ID: `atomix-ghep-phan-tu-hoa-hoc`. The planned catalog rule is specific: select an atom, push it in one of four directions, let it glide until a wall/obstacle stops it, and assemble the exact water molecule. The local catalog already uses the descriptive Vietnamese title **Ghép Phân Tử Hóa Học**. This prototype keeps that title in the UI. The older catalog slug remains an internal route; no historical edition, artwork or product-name parity is claimed.

## Delivered loop

Select one of two H atoms or the O atom. Move it up, down, left or right; the atom stops before the board edge, a stone cell, or another atom. Fit H₂O into the three marked cells. There are four original 6×6 stages with different starting positions and obstacles. Each has a BFS-verified shortest path of 6, 8, 10 or 12 glides. The rules do not add a timer or an arbitrary move limit. Undo, pause, stage restart, next stage and a new campaign are included.

Touch/click selects an atom and the four 46px arrow buttons move it. Tab/Enter/Space selects the focusable atom buttons; arrow keys or WASD glide the selected atom. A hidden page or window blur pauses the board and requires explicit resume. Closing the catalog modal removes all controls and state DOM.

## Original visual scope and rights

Walls, molecule markers and atoms are CSS-drawn shapes with the generic H/O symbols. No third-party illustration, chemical diagram, screenshot, font, sound or code was copied; there are no outbound asset requests. The displayed name is descriptive Vietnamese and contains no product/character mark. The inherited catalog ID is used only for routing. No historical version or distribution-rights clearance is claimed.

## Verification and remaining limits

`tests/atom-glide-model.test.cjs` replays a verified solution for each board and checks collision stopping, blocked input, invalid choices, undo, restart, pause, next-stage and terminal behavior. `tests/atom-glide-ui.test.cjs` checks selection, keyboard, directional buttons, campaign, interruption and session teardown. Browser phone/desktop input, viewport, win/replay and session results are recorded in `docs/qa/atom-glide-playtest-20261009.md`.

Human clarity and difficulty, physical-device/Safari input, screen-reader behavior, and title/route rights review remain pending. This is an original four-stage prototype, not a certified recreation.
