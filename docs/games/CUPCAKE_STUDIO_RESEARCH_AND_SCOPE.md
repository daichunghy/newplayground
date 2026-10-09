# Tiệm Bánh Ngọt Cupcake — research and scope

Research checked 2026-10-09. Planned catalog row: `tiem-banh-ngot-ba-baker` (work order 112); it has no dedicated engine and its source list is blank. This note records an original candidate, not a claim to reproduce a particular historical build.

## Evidence and limits

- Flipline's official *Papa's Cupcakeria* info page describes four stations (order, batter, bake, build), including frosting and decorations, and identifies mouse controls. The official phone/tablet page says the controls were reworked for mobile. These are evidence that cupcake order/decorating is an established game loop, not evidence about the catalog row's unknown source build or its exact rules: [official game info](https://i.flipline.com/games/papascupcakeria/info.html), [official mobile/tablet listing](https://www.flipline.com/games/papascupcakeria/index.html).
- The prototype intentionally narrows that broad genre to one instant-play decorating station. It does not use the four-station time-management, progression, characters, recipes, unlocks, or visual identity documented for that commercial game. No assets, screenshots, code, audio, customer names, or layouts were borrowed; the cupcake and tray are CSS shapes with authored short recipes.
- W3C's Target Size understanding document recommends custom pointer targets at least 44 by 44 CSS pixels, particularly where repeated sequential actions are involved. This informed 44px minimum work-surface slots and 48px tool/action controls: [W3C Target Size](https://www.w3.org/WAI/WCAG21/Understanding/target-size).
- Source limitation: the backlog supplies no competitor URL, edition, source build, or rights conclusion for this row. The one official commercial reference above only supports the broad genre observation. Historical title/route rights and actual device playtests remain unverified.

## Designed loop

1. Start directly in a three-order shop shift. The order card shows a customer's name, requested icing, and a 3×3 topping arrangement.
2. Choose one of three icing colors, choose one of four topping marks or the eraser, then tap cells on the cupcake. A 3×3 keyboard focus loop and number/letter shortcuts support desktop use.
3. Compare against a live match count (2 points for icing, one per cell including intentional blank cells), undo the latest decoration change, clear the cake, or submit.
4. Each submitted order awards 0–3 stars according to its 11-point match. The next card begins immediately. Finish three orders; 6 of 9 stars wins, otherwise the shift ends with a replay path. The recipes, totals, and threshold are fixed and deterministic so a run can be tested and replayed without save state.

This is a short pattern-copying game with no timer, purchases, inventory, account, unlock grind, or persistent profile. The customer names and recipes are newly authored. Feedback is local and immediate; no hidden penalty is applied before delivery.

## Controls, lifecycle, and accessibility

- Touch/mouse: select a color/tool, tap one of nine cells, undo, clear, submit, pause, restart.
- Keyboard: `1–3` icing, `A–D` topping, `X` eraser, `U` undo, `P` pause, arrow keys move among cells; native buttons retain Enter/Space activation.
- Small-screen layout uses a single reflowing column; each cell has a 44px minimum and independent tools/actions are at least 48px. Visible labels and selected states complement hue. Recipe has a spoken 3×3 text summary; live state and delivery feedback use a polite status region.
- Pause/resume, visibility/blur interruption, submit-to-win/loss, replay, undo/clear, and session cleanup are model-owned or session-bound. There are no clocks, animation frames, audio contexts, or external assets to leak.

## Acceptance and open validation

- Automated model tests cover exact-match scoring, star grades, three-order win/loss, undo/clear, invalid/end-state input, pause/resume, and deterministic restart.
- DOM-double tests cover initial recipe rendering, touch/click decoration, keyboard shortcuts/focus movement, scoring feedback, win/loss, pause/visibility, reset, and repeated mount/cleanup.
- Responsive values are asserted from the authored stylesheet; actual layout, contrast on physical screens, and thumb comfort still need browser/device review. No performance or balance claim is made from DOM doubles. Playtest should check whether 3×3 copying is calm and legible at 320px, whether 6-star threshold feels fair, and whether low-score loss is encouraging rather than punitive.
- Monetization fit remains untested. No ad/reward is part of this candidate. Do not infer product, art, title, or route rights clearance from this prototype.

## Integration contract

Load `scripts/games/cupcake-studio-model.js` before `scripts/games/cupcake-studio.js`, and load `scripts/games/cupcake-studio.css` with the other game styles. The controller exports `window.NP_CupcakeStudio.mount(container, session)`, requires `window.NP_CupcakeStudioModel` and the existing game-session API, and returns `{ getModel, destroy }`. The model exports CommonJS and `NP_CupcakeStudioModel` APIs including `create()` and its constants. A separate registry launcher can call `NP_CupcakeStudio.mount(container, NP_GameSession.start())`; this implementation does not edit registry/catalog files.
