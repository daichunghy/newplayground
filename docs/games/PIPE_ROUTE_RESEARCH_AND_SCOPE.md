# Nối Ống Nước — original pipe-routing prototype

Catalog route: `noi-ong-nuoc-pipemania`. The catalog supplied the broad rule “rotate pipe sections before water pressure empties”; it does not identify a specific edition or define the board, stages, valve behavior, scoring or pressure timing. The game therefore uses a descriptive Vietnamese title and makes no historical-version parity claim. The legacy suffix appears only in the internal route key; the product-name suffix is not shown in game UI.

## Delivered loop

Rotate straight and elbow segments on a 5×5 grid to carry water from **Vòi** at the left edge to **Bể** on the right. Water follows only reciprocal connections. A dry/incorrect join or off-board outlet is shown as a leak; repeated joins show a loop. Three distinct authored routes increase route length and reduce pressure time from 60 to 55 to 50 seconds. Twenty-five rotatable sections keep the intended route from being the only visible line. Reach the outlet before pressure reaches zero. Undo restores one rotation; pause freezes the clock; restart repeats the same scrambled layout; completing the campaign opens a new seeded layout.

Touch/click or Enter/Space rotates a focused tile clockwise. Arrow keys move focus around the grid; A/D rotates counterclockwise/clockwise. The tile labels expose row, column, pipe type, open directions and wet/leak state to assistive technology. Each tile has at least a 44px hit box at the tested 320px/390px mobile widths. Closing the modal releases all DOM, intervals and listeners; losing window focus pauses the clock.

## Original visuals and rights scope

The pipes are hand-authored inline SVG strokes with project CSS colors and cell geometry. There are no downloaded game assets, logos, branded pipe characters, sound effects, external fonts or runtime dependencies. The Vietnamese title **Nối Ống Nước** is descriptive. This is a generic original candidate, not a certified recreation. The inherited catalog ID and any associated title/trademark/distribution rights remain unreviewed; no third-party reference image or source code was used.

## Verification and remaining limits

`tests/pipe-route-model.test.cjs` covers deterministic boards, three solved witness routes, reciprocal flow, rotation, undo, pause, pressure loss, restart and new-game seed behavior. `tests/pipe-route-ui.test.cjs` covers tile rendering, keyboard/touch actions, pause, timer recovery, retry and session teardown. Local Chromium touch/keyboard, all-stage routing and phone/desktop size evidence is in `docs/qa/pipe-route-playtest-20261009.md`.

Novice puzzle legibility and the 60/55/50-second tuning need human playtests. Physical-device latency, browser/screen-reader behavior, keyboard navigation with assistive technology and catalog-route/title rights are pending. The three current layouts are a bounded first campaign rather than an open-ended level generator.
