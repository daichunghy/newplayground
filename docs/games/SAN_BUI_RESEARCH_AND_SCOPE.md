# Sân Bụi: research and scope

Research snapshot: 9 October 2026. Catalog ID: `nem-lon-truong-lang`. Player-facing title: **Sân Bụi**. This is a short, original digital aiming game inspired by an outdoor can-toss activity. Its objectives and physics are NewPlayground rules, not a claim about the standard rules of the folk game.

## Physical reference

Trường Mầm non Tân An Hội 3's 2018 educational page describes stacking milk cans in a pyramid, marking a line a fixed distance away, giving each team three small balls, and winning by toppling more cans with those throws. It says a throw is not counted if the player's foot touches the line. This is one school description of an outdoor activity, not a universal rulebook. [Trường Mầm non Tân An Hội 3: Trò chơi dân gian: Ném lon](https://mnthitrancuchi3.hcm.edu.vn/gia-dinh-nha-truong-xa-hoi/tro-choi-dan-gian-nem-lon/ctmb/19825/315090)

The digital scene keeps the recognizable aiming-at-a-can-pyramid premise and a marked throwing line. It uses one player, staged targets, adjustable launch angle and force, and modeled collisions. The player does not move, so the physical foot-foul rule is not part of the digital rules. There is no opponent or multiplayer team comparison.

## Digital candidate rules

- The round opens immediately at **Vạt nắng**. The 6-can triangular stack needs 3 cans toppled within 3 throws.
- Two harder stages follow: **Góc sân** uses 10 cans and needs 6; **Cuối sân** uses 15 cans and needs 10. The campaign wins on clearing all three objectives and loses when the throw limit expires below the current goal.
- Before each throw, set angle from 10° to 70° and force from 35% to 100%. Keyboard arrows adjust angle and force; Space throws. Touch users can tap the aim buttons, change sliders, tap the court to set an angle, and press the large throw button.
- A fixed-step 2D simulation moves the ball under gravity. Impacts activate cans; moving cans can bump others, then settle against the ground with friction. A can counts once it moves far enough from its place in the stack. A miss still spends a throw.
- The stack's slight horizontal offset and tin colors are deterministic from the round seed. **Chơi lại** begins a new three-stage campaign. Pause freezes the current flight or settling state; a hidden tab or window blur opens the same pause screen and never auto-resumes.
- The historical activity is a reference for physical inspiration only. Throw counts, objectives, digital scoring, the staged progression, and simplified physics are specific to this candidate.

## Implementation and rights

- `scripts/games/san-bui-model.js` owns seeded stack generation, bounded aiming/force, ball and can state, collision impulses, fixed-step gravity, throw limits, pause/resume, and campaign outcomes. It has no DOM or canvas dependency.
- `scripts/games/san-bui.js` exposes `window.NP_SanBui.mount(container, session, audio?, options?)`. A future wrapper should load the model first and this view next, then include the candidate stylesheet. Animation frames and listeners belong to the supplied `NP_GameSession`; teardown cancels the active loop and removes the mounted view.
- `scripts/games/san-bui.css` uses original gradients and CSS layout. Canvas scenery and cans are drawn from geometric shapes; no external images, audio, fonts, or runtime dependencies are used. Controls have at least 44px target dimensions, adapt to narrow layouts, and honor reduced motion.
- The player-facing game is called **Sân Bụi**. It does not use the historical product name, source code, logos, copied illustrations, or screenshots. Rights to distribute a game under the historical catalog route or name remain unresolved.

## Verification and limits

`tests/san-bui-model.test.cjs` and `tests/san-bui-ui.test.cjs` cover deterministic stacks, angle/force bounds, trajectory changes, ball-to-can impacts, chain toppling, stage progression, win/loss, pause and resume, fixed-step determinism, direct canvas aim, keyboard and touch controls, replay, and `NP_GameSession` cleanup. DOM-double tests do not establish real-device physics feel, assistive-technology behavior, or browser layout at all viewport sizes; those remain review items.
