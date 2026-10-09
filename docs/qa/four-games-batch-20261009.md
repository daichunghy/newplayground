# Four-game identity and gameplay review — 2026-10-09

The four playable prototypes now have original NewPlayground titles, characters, and art. Their historical catalog IDs, launch routes, and global mount APIs remain stable for saved links and migration compatibility. Former product marks do not appear as game titles, badges, or character art. These are original small-scope prototypes; the IDs do not imply license or release parity.

## Current identities

- **Mầm Măm** (`cut-the-rope`): an upright one-eyed pitcher-seed catches the loose seed. The three authored rope-swing stages retain stars, hazards, receivers, score, win/loss, pause, restart, and keyboard/touch cuts.
- **Cú Sao Gác Đèn** (`pinball-3d-space-cadet`): an original owl lamp keeper appears on a hand-drawn two-dimensional table. Light six targets with two held flippers and three balls; keyboard and held touch share the same fixed-step physics.
- **Đốm Biển** (`typer-shark`): an original bioluminescent sea slug carries nine words through three short waves, with per-word and round deadlines, scoring, three misses, pause, and replay. A 26-key touch keyboard complements physical keys.
- **Sắc Bậc** (`qbert-nhay-khoi-lap-phuong`): a faceted prism lights 28 steps across three color-shifted boards while avoiding abstract patrol signals. Four diagonal moves, six lives, a campaign clock, pause, and replay remain.

Cover and in-game illustrations use local SVG, Canvas, CSS, and DOM geometry. The asset manifest and operations register record project-authored art; no external image, sprite, font, or game-runtime dependency is used by these four games.

## Gameplay and edge-case corrections

- **Mầm Măm:** replaced the frog-and-wrapped-candy silhouettes with the seed-pod catcher and leafy seed. Added swept target checks so a fast seed cannot pass through a star, spike, or catch zone between simulation steps. Pointer IDs must match before a drag cuts a rope; pointer cancellation safely clears the gesture.
- **Cú Sao Gác Đèn:** made dead-center bumper collisions resolve with a stable outward rebound, enforced the ball-speed cap when restoring state, and verified held-flipper release, pause focus, scoring, final-target win, and last-ball loss.
- **Đốm Biển:** a long animation-frame gap now processes every elapsed word deadline; misses no longer count as completed words; a wrong key at a deadline no longer adds a phantom millisecond. Adjusted the shared clock to a playable 75-second window.
- **Sắc Bậc:** default-seed patrol movement now matches explicit seed `1`. Patrol contact on tile 28 resolves before the level reward; a cue explains the safe hop after respawn. Added the missing visible cue for that final-tile hit.

Earlier in this batch, **Dò Mìn** gained a logic-only safe hint that waits for the player to open the cell, and **2048** gained deterministic one-step Undo with backwards-compatible v1 save restore.

## Verification

- Full local Node suite: `node --test --test-concurrency=1 tests/*.test.cjs` — **1,372 passed, 0 failed**.
- Full repository Playwright suite — **44/44 passed** in local Chromium (including all 69 registered routes and the four-game real-input regression at mobile and desktop widths). This runner used the installed `/usr/bin/chromium` through a temporary config because the workspace has no Playwright-managed browser binary.
- Focused game suites: Mầm Măm **14/14**, Cú Sao Gác Đèn **15/15**, Đốm Biển **13/13**, Sắc Bậc **18/18**. Script syntax checks passed for all eight game model/view files and the exact-launcher file.
- Real Chromium game checks used the actual app route at 320px mobile and 1280px desktop. Mầm Măm completed all three stages with three stars, recorded spike loss and a touch-pointer cut, and cleaned up its session. Cú Sao Gác Đèn verified held touch/mouse flippers, launch, bumper rebound, six-light win, last-ball loss, pause/resume/restart, and session cleanup; a 1,004ms desktop sample advanced 113 fixed ticks. Đốm Biển tested the on-screen keyboard and physical keys, win/loss, pause/resume/restart, viewport fit, and frame cleanup. Sắc Bậc completed all three levels in 98 mobile taps and also checked falls, patrol loss, pause, keyboard, and restart. All four reported no horizontal overflow or page errors, and visible controls met the 44px minimum.
- `node scripts/release-preflight.mjs --prepare` — passed with **150 catalog entries, 69 prototype routes, 81 planned entries, and 150 declared assets**. This is static consistency/syntax validation, not game-rule or title-rights certification.
- `git diff --check` — clean.
- The current 320×800 app panels were captured and visually reviewed: [Mầm Măm](four-games-rebrand-20261009/mam-mam-mobile.png), [Cú Sao Gác Đèn](four-games-rebrand-20261009/cu-sao-mobile.png), [Đốm Biển](four-games-rebrand-20261009/dom-bien-mobile.png), and [Sắc Bậc](four-games-rebrand-20261009/sac-bac-mobile.png).
- The first GitHub browser run on `074aeb4e131c88006d976a154bdc6d922bb50f49` caught an invalid pre-existing 2048 Undo fixture: a one-tile save fails the model's minimum-two-tile validation. The fixture now uses two mergeable tiles and asserts the restored starting board. After that correction, local Chromium passed **44/44** and the full Node suite passed **1,372/1,372**.
- GitHub Actions at `aa8368b89b7ff00ada796cd15f89b51e055d5c01`: [prepare — pass](https://github.com/daichunghy/newplayground/actions/runs/37938425999) and [Chromium smoke — pass](https://github.com/daichunghy/newplayground/actions/runs/37938425941). Deployment remains skipped while the PR is a draft.

## Limits

Touch checks used Chromium emulation, not physical phones or tablets. Extended player balance, assistive-technology behavior, and distribution rights for display names remain unverified. Đốm Biển currently uses English ASCII target words and has no audio. Mầm Măm has no save data, sound, or level editor. Pinball is a simplified two-dimensional model, not calibrated to a physical machine.
