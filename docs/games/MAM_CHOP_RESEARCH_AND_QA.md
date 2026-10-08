# Mầm Chớp — research and QA dossier

Updated 2026-10-08. This is an original Vietnamese side-scrolling shooter candidate for the historical `rockman-mega-man` route. It is not a remake or edition-parity claim; the historical edition and title/route rights remain unknown.

## Reference edition and sources

The comparison point is Capcom Town’s English-language, home-console listing for **Mega Man 4**. Its [official game page](https://captown.capcom.com/en/classic_games/46) maps the web controls to movement, jump and attack, and describes a charge shot made by holding the shot button. The page explicitly says its game details are based on the English version and links the original manual. This is first-party evidence for the edition’s broad action loop and charge mechanic; the page does not provide a complete transcription of movement physics, damage values, checkpoints or stage layouts. The page’s web emulator controls are treated as that presentation’s mapping, not as canonical console bindings.

The browser page is Capcom Town’s later playable presentation, not the original hardware UI. Its A/B and keyboard mapping are platform-specific defaults, not treated here as canonical console bindings. The candidate uses arrow keys/A-D, Space and Z because they suit a browser keyboard and touch buttons. No screenshots or game assets were used as visual references.

## Rules and campaign scope

This iteration is an original three-stage campaign with one shared move/jump/seed loop:

| Stage | Experience | Main pressure |
| --- | --- | --- |
| Vườn Hoang | Learn ground routes, patrol timing, and the charged shot | Stone crawlers and a flower sentry with a visible 30-tick warning |
| Mương Sương | Change the ground rhythm and add safe elevated routes | Three timed vents, five crawlers, two sentries, and three checkpoints |
| Nhà Kính Vỡ | Combine platform routes and vent timing before a final gate encounter | Two vents, five crawlers, and the amber guardian |

- Tap fire for one small seed. Hold for 36 simulation ticks (720 ms) to fire one larger seed for two damage. A charged shot fires once at full charge; releasing does not duplicate it. Jump taps buffer for six ticks before landing, and a six-tick coyote window accepts a late press after leaving a ledge; both windows are transient and reset safely after load.
- The player has four hearts. A hit grants 74 ticks of brief protection. Falling costs one heart and returns to the latest checkpoint; zero hearts ends the run. Each stage has three authored checkpoint positions.
- Vents show a 30- or 32-tick warning before their 38- or 42-tick active interval. The sentries warn for 30 ticks before firing.
- The amber guardian begins a 44-tick warning, fires a three-seed fan, then exposes its core for 105 ticks. Its shell rejects shots while closed; the six-heart guardian keeps the exit blocked until defeated. It rests before its next cycle.
- Clearing a gate unlocks only the next stage. Players can replay any unlocked stage, and local versioned progress stores the current stage/checkpoint, unlock, and each stage's best tick count. Restore clears held inputs. Corrupt saves are copied to a recovery key; newer save versions are kept untouched.

The layouts, timings, damage, velocities, enemy patterns, checkpoints and visual language are original implementation choices, not measured Mega Man 4 rules. This iteration does not attempt to reproduce weapon selection, collectible weapons, item drops, score, passwords or life-stock systems. It makes no content or edition-parity claim.

## Original assets and boundaries

All in-game art is drawn with Canvas 2D shapes and gradients: a leaf-topped seedling, animated stone crawler legs, a flower sentry, guardian, seed projectiles, terrain, plants and a dusk greenhouse landscape. The stage is new geometry. UI, Vietnamese text and CSS are authored for this candidate. There are no downloaded sprites, screenshots, logos, music, borrowed game code or external fonts. The player-visible UI does not use the source franchise’s names or character designs.

## Verification and remaining QA

Focused Node tests use deterministic model stepping and the repository’s mocked DOM/Canvas lifecycle harness: 15 model and 14 DOM/lifecycle checks pass. They cover every authored ground gap with a simulated jump/landing, buffered and coyote jumps, campaign unlock/replay, vent warnings and respawn, guardian telegraph/weak-point/locked exit/defeat, local save restore and corruption handling, pause/resume and blur/hidden-tab auto-pause, held-input cancellation, keyboard and pointer input, reduced-motion rendering, muted/unmuted sound cues, short-lived status announcements, and session teardown. The view uses the shared sound mute control, honors `prefers-reduced-motion` for decorative pulses, provides 48px pause/restart and 52px action buttons, and has visible keyboard focus rings. These tests do not verify visual rendering in a real browser, touch hardware, sound output, assistive technology, difficulty balance or exact source-game parity.

The standalone preview is `candidates/mam-chop/index.html`; it uses the same original model/view files as the shared app. The route is wired as `Mầm Chớp` under the historical catalog ID, whose exact title/edition rights remain unverified. Targeted tests pass locally; difficulty tuning, browser/device visual and touch QA, screen-reader behavior, and player playtesting remain pending. This is a deeper local campaign iteration, not a finished production acceptance.
