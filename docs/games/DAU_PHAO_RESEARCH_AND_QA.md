# Đấu Phao Bãi Cạn — scope and QA

Updated 2026-10-08. The playable title is original. The catalog ID `raft-wars-ban-sung-phao` remains as routing metadata; it does not establish a license or claim of equivalence.

## Reference research

The official [Raft Wars home](https://raft-wars.com/) says the original Flash game released after summer 2007. It lists the current HTML5 game, a sequel, the Classic Flash original, and a separate multiplayer game. The [official contact page](https://raft-wars.com/contact) identifies Martijn Kunst as the original developer/producer and Bubblebox SL as publisher of the classic games.

Those pages establish history, ownership contacts and version distinctions. Their overview does not document exact turn rules, projectile tuning, character health, falling, levels or weapons. No exact historical build was played for this candidate. The catalog description of angle/power artillery is used only as the initial design brief, not as verified evidence for the 2007 game's detailed rules. No parity claim is made.

## Candidate scope

**Đấu Phao Bãi Cạn** is an original, one-screen, solo-first turn-based duel. The player adjusts a launch angle with up/down keys or compact touch buttons, then holds Space or Bắn to fill a visible power bar and releases to launch. A fixed-step model draws a ballistic arc. Direct hits remove one heart and push the opposing character; a close splash can push without removing a heart. Each side begins with three hearts. Falling beyond the small raft or losing all hearts ends the duel. The CPU returns fire automatically. Pause, resume, replay and input cancellation are supported.

The candidate intentionally contains one encounter, one projectile type and one fighter per side. It has no treasure story, named characters, weapons shop, currency, campaign, upgrades or multiplayer mode. These are scope choices and must not be read as an inventory of the historical game's contents.

## Art and rights

Canvas characters, boats, sea and effects are procedural, and `assets/dau-phao-original.svg` is original project-authored cover art. No Simon, copied pirate characters, branded art, screenshots, levels, sounds or code are included. The cover is recorded in the asset manifest. The historical catalog title/route and any associated trademark use still require review; the route ID is retained only for local lookup.

## Automated checks

- `node --test --test-concurrency=1 tests/raft-duel-model.test.cjs tests/raft-duel-ui.test.cjs` — 18 focused checks passed.
- The model checks charge limits/cancellation, aim bounds, direct-hit damage and pushback, splash displacement, automatic CPU return, knock-off, snapshot validation and deterministic stepping.
- DOM-double checks cover the exact catalog route and original cover, visible-copy budget, keyboard and touch inputs, synthetic-click suppression, pause/resume/restart, blur/hidden-tab behavior, repeated open/close and session cleanup.
- `node scripts/release-preflight.mjs` validates catalog, script, manifest and asset consistency only. DOM doubles do not establish browser rendering, real touch/keyboard behavior or input latency.

## Still pending

Pin and inspect an exact original Flash build before documenting historical rule parity. Test trajectory feel, CPU fairness, narrow/mobile layout, keyboard focus and pointer cancellation in a real browser and on touch hardware; run a short human playtest. Verify the historic title/route rights before release. The current work is a local integration checkpoint; no public push or deployment has been performed.
