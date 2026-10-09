# Bút Vẽ Trượt Ván — research and QA

Updated 2026-10-09. Status: original draw-and-ride prototype; desktop/mobile Chromium smoke coverage exists, while device and human acceptance remain open.

## Research and scope

The planned catalog item had no active launcher. A registry review found no existing game where a player draws a continuous route and then watches a rider move along it under slope and momentum. The official [Line Rider site](https://www.linerider.com/) describes the core toy as drawing a track for a sledder to ride. This prototype borrows only that broad genre mechanic; it does not claim physics, content, tool, or feature parity with Line Rider.

This build is a short, fixed start-to-flag challenge rather than an open-ended track sandbox. The player draws one connected line, tries to shape slopes that carry the rider to the flag, and can collect three rings along the route. It has no editing tools, loop/decorative line types, jumps, music sync, multiple riders, export, sharing, or persistent tracks.

## Round and controls

- Drag from the green start dot to the flag on mouse or touch. The line must contain at least three points, span at least 440 logical units, end near the flag, and stay within the ink budget.
- **Thả trượt** starts a 16-second ride. Gravity along each segment's slope changes speed; friction reduces it. Touch the three fixed gold rings for 80 points apiece.
- Reverse velocity is classified by its magnitude, so a fast rollback does not get mislabeled as a low-speed stall; the uphill regression now ends with **Ván trượt ngược**. Reaching the flag wins and adds 100 points plus a time bonus. Rolling back, stalling, or exhausting the timer loses. **Xóa nét** clears a draft; **↻** resets the round; **Ⅱ** / P pauses. Focus loss and hidden-page events pause the simulation.
- Model and art are project-authored. Canvas draws the original rider, landscape, track, rings, and flag; a separate original SVG supplies the catalog cover. No Line Rider marks, character designs, code, or external assets are included.

## Verification

- `node --test tests/line-rider-model.test.cjs` — 5 model tests cover track validation, slope-driven movement, all three rings and finish scoring, pause/resume/restart, invalid elapsed time, and timeout. The short timer is configurable in the pure model solely to test the timeout branch deterministically; the player-facing round remains 16 seconds.
- `tests/browser/portal.spec.cjs` — full browser suite: 40/40 passed, including every registered route. A 320px touch regression draws a steep hill, confirms rollback loss text, and closes the session; the cross-device play case also completes the flat track and confirms pause/resume, finish score, responsive fit and teardown.
- Chromium is a browser simulation, not a physical device or novice playtest. Physics is intentionally a lightweight fixed-step segment follower; its behavior is not an emulation of Line Rider's bespoke engine. Accessibility, motion feel, performance on low-end phones, and catalog-title distribution rights remain unaccepted.

## Release gates

`data/game-quality-evidence.json` records the official genre reference and current prototype evidence. Visual/content acceptance, device QA, human playtest, and distribution approval remain pending. `release_ready` remains false.
