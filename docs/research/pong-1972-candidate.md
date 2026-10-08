# Bóng Bàn Cổ Điển — local candidate

## Scope

This opens as a one-player table-tennis match against a simple, capped-speed CPU; a one-tap mode button starts a local two-player match on the same device. Two vertical paddles return a moving ball; a point goes to the opponent when the ball passes a player. A short match ends at seven points. There is no account, tournament, campaign, or economy.

The candidate uses a fixed 120 Hz simulation with an accumulated elapsed-time interface. Model rules are separate from the canvas view. In solo mode, the human uses W/S or arrow keys and the CPU controls the opposite paddle. The local two-player option uses W/S on the left and arrow keys on the right. Both modes support drag and touch buttons, pause/restart, optional synthesized tones, focus-visible states, and session cleanup.

## Historical framing and uncertainty

The Computer History Museum dates Atari's Pong announcement to November 29, 1972 and describes the core loop as paddles moving up and down to deflect a ball and keep it from passing a goal. The Strong National Museum of Play says Pong was not the first electronic game, notes that the Magnavox Odyssey already had a similar tennis game, and distinguishes the coin-operated arcade prototype from Atari's 1975 home version. So the label “1972” is a useful catalog reference for Atari's arcade release, while “Pong” should not imply that electronic table tennis began with Atari or that this candidate reproduces one exact cabinet revision.

This candidate is an original Pong-inspired arcade interpretation. The seven-point set, solo-vs-CPU default, CPU response speed, local 2P option, serve delay, paddle colors, scoring, controls, tones, and visual treatment are design choices for a short modern match; the sources do not establish them as exact 1972 settings.

Sources:

- Computer History Museum, [Atari Announces Pong Game](https://www.computerhistory.org/tdih/november/29/)
- Strong National Museum of Play, [Pong](https://www.museumofplay.org/games/pong/)

## Originality and asset notes

- The model, rendering, CSS, cover illustration, and synthesized sound treatment are authored for this candidate.
- The cover uses abstract court geometry and generic paddle shapes. It contains no Atari marks, copied game screenshot, cabinet design, or borrowed font file.
- The rules are a general paddle-and-ball mechanic. No third-party game code or art was used.
- No external asset, runtime package, or network request is required.

## Local verification and acceptance boundary

Thirteen focused model and DOM-double checks cover solo and local 2P modes, capped CPU tracking, bounded movement, deterministic stepping, serves, wall and paddle contact, points, match end, pause/resume/restart, keyboard and touch inputs, sound unlock, and session cleanup. These checks do not render pixels in a real browser. Browser behavior, visual fit at device sizes, multi-touch handling on physical devices, and any publication or rights review remain for the catalog integration/acceptance pass.


## Local catalog integration

The original candidate is wired under the retained `pong-1972` route with the generic visible title Bóng Bàn Cổ Điển and a project-authored cover registered in `ASSET_MANIFEST.json`. Ten focused model and DOM-double checks pass; route and concise-copy gates are part of the integration suite. These checks do not substitute for a real browser or physical-device review. Trademark/title and route rights remain open.


## Solo-first local integration

The catalog route now opens solo-versus-CPU by default; a compact mode button switches to local two-player and starts a fresh match. The solo CPU follows returning balls with a capped 235 px/s response against the human paddle speed of 470 px/s and a small dead zone. This keeps the game immediately usable by visitors who arrive alone. The new default and optional 2P mode are candidate choices, not claims about Atari cabinet rules.

The 2026-10-08 lifecycle audit keeps both responsive touch-arrow breakpoints at 44px minimum width, matching the shared touch-target guidance. The focused Pong UI regression checks both mobile breakpoint rules.
