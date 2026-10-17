# Arcade redesign — 18 October 2026

## What this change is

A working vanilla-JavaScript redesign of the discovery portal and shared game room, with game-specific presentation adapters. This is not a claim that 150 separate original game engines have been rebuilt. Main and the existing engine PRs are unchanged until this branch is reviewed and merged.

The old large marketing hero, neon stickers, repeated catalog sections and unrelated external photo fallback are replaced by a compact, illustration-first library. The light palette uses warm off-white, forest green and restrained terracotta; dark mode is available. The type stack starts with Calibri and falls back to locally available system fonts. No font downloads or third-party UI framework are added.

## Implemented portal and return-to-play features

- All 150 catalog entries remain discoverable. The initial grid renders 24 cards and adds 24 on demand. Desktop has six columns, with four/three/two-column responsive layouts.
- Vietnamese search works with or without accents, including đ. Search intersects category, favorite and recent filters.
- Existing `np_favorites` data is retained. A separate `np_recent_v2` history stores at most 12 validated IDs; recent means recently opened, not a promise of restoring an unfinished round.
- Curated opening choices use real implemented routes rather than fabricated popularity or player counts. A random button selects from those choices.
- Cards have separate keyboard-accessible launch and favorite buttons. Saving a favorite does not launch the game. The portal tolerates blocked or malformed storage.
- Ten games expose their existing, real personal-record values on cards when a positive record exists. No simulated leaderboards, daily streak pressure or invented achievements are used.
- Game links use `#play/<catalog-id>`. They work from a fresh page and can be copied from the room. Clipboard/fullscreen failures have visible fallbacks.
- Mobile has navigation for discovery, search, recent games and favorites.

## Game room and individual presentation

The room has one scrolling surface. It no longer extends beyond narrow screens. Background content becomes inert while playing, focus stays in the dialog, Escape closes the room, and focus returns to the launch control. Keyboard use in the room toolbar does not also move or fire inside the game. Native game controls retain their bindings.

Canvases keep their actual aspect ratios and collision coordinate systems. The presentation layer never rewrites canvas colours through filters or changes simulation coordinates. Actual game art remains owned by each engine.

There are 19 explicit title/objective/help/art profiles. Other entries get category-level presentation. Representative per-game changes include:

| Game | Presentation change |
| --- | --- |
| 2048 | Warm compact board; all four columns fit a phone; readable score and undo/new-game controls. |
| Hàng Rong | Legible stage/progress header, smaller street scene, desktop customer/cooking columns, stacked mobile workspace. Existing cooking, inventory and save controls are preserved. |
| Dò mìn | Distinct covered/revealed/flag/mine states, labelled counters, difficulty control, cell zoom and accessible horizontal pan controls. |
| Line 98 | Reflowed score/next-ball/actions area; optional larger board and pan controls instead of squeezing all controls onto one line. |
| Caro | Responsive options/actions and a larger optional 720px board with pan controls. |
| Tetris | Height-constrained portrait board, preserved next/hold panels and native pause/drop/restart controls. |
| Snake | Aspect-correct board, calmer HUD and named direction controls. |
| Pong / DX-Ball | Larger desktop playfields without stretching the ball or changing pointer mapping. |
| Sokoban | Softer board frame with original legal movement/undo/stage controls. |
| Flappy / Boom / Bắn trứng | Responsive playfields, less bulky surrounding chrome, retained native start/pause/action/replay controls. |

The shared room also supplies short objectives, collapsed help, favorites, sound controls and related games. It deliberately does not introduce a universal reset button: such a button could destroy a management game's persistent progress. Native replay and pause are used only where the engine supports them.

## Honest catalog status

The baseline README describes 64 specifically routed entries and 86 entries routed through the archetype launcher. Those counts are not counts of unique complete engines. Existing aliases still share mechanics. `typer-shark` uses a dedicated override behind that launcher, so the new presentation explicitly labels 85 other generic-route entries as experimental genre versions.

The label is shown both on their catalog cards and before the playfield. For example, preserving the inherited `dr-mario` to Mario route does not make it an authentic Dr. Mario implementation. Replacing these aliases with dedicated mechanics is a separate gameplay task. Existing open PRs #1–#10 were not silently merged or overwritten by this redesign.

## Implementation map

- `index.html`: accessible portal and room markup; deferred entry scripts.
- `arcade.css`: shared tokens, library layouts and per-game room styles.
- `arcade-polish.css`: board-specific refinements and zoom/pan visuals.
- `scripts/arcade-core.js`: pure profiles, route classification, search, safe library helpers and original SVG covers.
- `scripts/arcade-portal.js`: portal and room controller, routing and session cleanup.
- `scripts/arcade-polish.js`: scoped read-only record and board-size adapters.
- `tests/arcade-core.test.cjs`: 11 new tests including all-150 route parity with the baseline dispatcher.
- `scripts/arcade-browser-qa.cjs`: browser smoke, geometry, interaction and persistence checks.

`app.js` remains as a legacy reference and routing parity fixture, but is not loaded as a second live portal. Engine PRs that change only engine files can be reviewed independently; changes to navigation or dispatch must be integrated into the new entry point rather than assuming old `app.js` still drives the page.

Observers associated with a playfield are disconnected on close/switch. Game resources continue to be owned by `NP_GameSession`. Storage keys for game boards, cooking/inventory, existing best scores and native progress are not renamed or cleared by the redesign.

## Visual references and asset provenance

GameVui's primary site, https://gamevui.vn/, was inspected for search, image-based discovery, category navigation and recently played access. Those interaction patterns were adapted, not its logos, screenshots or artwork. The original `game.24h.com.vn` endpoint could not be opened successfully in this review; no claim of a full current Game24h audit is made.

All new covers are hand-authored SVG code in `arcade-core.js`, delivered locally as data URIs. They are stylized board illustrations, not screenshots of completed play sessions. Existing engine assets and their licenses remain unchanged; see `assets/ASSET_MANIFEST.json`. There are no new stock-photo fallbacks, tracking services or paid API calls.

## Reproduce validation

From the repository root:

```sh
node --test tests/*.test.cjs
python3 -m http.server 8000
```

Open `http://localhost:8000/` in a browser. For the browser suite, stop any process using port 8765 and run:

```sh
npm install --prefix /tmp/arcade-tools --no-save --package-lock=false playwright@1.56.1
node /tmp/arcade-tools/node_modules/playwright/cli.js install --with-deps chromium
NODE_PATH=/tmp/arcade-tools/node_modules NP_QA_OUTPUT=/tmp/arcade-review node scripts/arcade-browser-qa.cjs
```

The read-only GitHub Actions review saves test logs, exact tested checkout SHA, browser JSON reports, screenshots and source under the `arcade-design-review` artifact. It does not deploy the branch.

Coverage is intentionally distinguished: 150 launch/close smoke checks on desktop plus 150 on touch-emulated mobile; detailed interaction checks for 13 representative games; additional 320px geometry checks; search, pagination, favorite persistence, dialog focus, real records, dark mode, blocked-storage portal/2048 and fresh deep links. Smoke success is not a completed campaign, balance assessment or proof that every button in all 150 entries is correct.

## Remaining validation and product work

Physical iPhone/Safari, Firefox, long sessions, every level and multiplayer behavior are not certified by Chromium emulation. Some existing engines still assume writable localStorage; the portal itself and 2048 have explicit blocked-storage checks, not a blanket guarantee for every legacy engine. Canvas-drawn visual effects are engine-owned; reduced-motion styling here primarily covers interface transitions.

This branch improves the path from discovery to play and back, but actual replay-rate improvement needs observation with players. No retention uplift is claimed without user-testing evidence. Dedicated mechanics, genuinely distinct art and level progression for generic entries remain the largest product gap.
