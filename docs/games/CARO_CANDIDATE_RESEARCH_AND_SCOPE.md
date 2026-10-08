# Cờ Caro candidate: research and scope

Research snapshot: 7 October 2026. This is an original, small five-in-a-row candidate for NewPlayground. It is not certified as an exact recreation of a particular Vietnamese paper-game or app ruleset.

## Research findings

- A 15×15 board and five-in-a-row contest are a recognizable baseline. The Renju International Federation (RIF) publishes formal Gomoku rules specifying 15×15 and an uninterrupted line of exactly five; a line of six or more does not win under those rules. These rules are evidence for one formal Gomoku baseline, not a national standard for every casual game called Caro. [RIF International Rules of Gomoku](https://www.renju.net/gomokurules/) · [RIF official documents index](https://www.renju.net/documents/)
- A Vietnamese Caro site also describes 15×15 as one popular board size, while noting other sizes are played. [Cờ Caro VN, “Cờ Caro 2 người 15x15”](https://cocarovn.com/co-caro-2-nguoi-15x15/) (posted 23 Nov 2024; updated 10 Sep 2025).
- Digital products disagree about line endings and overlines. A Vietnamese Gomoku/Caro/Renju app describes a Caro mode where a five blocked at both ends does not win but an overline does; another product labels its default “Vietnamese caro” as exact-five, no win for six-plus, and no win when blocked at both ends. These are product-specific rules descriptions, not proof of a single universal standard. [Vietnam-based app listing](https://play.google.com/store/apps/details?hl=en_NZ&id=com.vndynapp.carochess) · [Gomoku - Caro support FAQ](https://caro-landing-ivory.vercel.app/en/support)
- Renju is a separate formal rule family. RIF rules include asymmetric restrictions for Black such as overline, double-four, and defined double-three cases. This candidate does not implement those rules. [RIF International Rules of Renju](https://www.renju.net/rifrules/)
- Existing NewPlayground catalog material names a 15×15 Caro board, but its descriptive entries are not a selected, versioned game reference. No historical board, app build, or in-game playthrough was established for this candidate.

## Selected candidate rules

- Board: fixed 15 rows × 15 columns of empty intersections.
- Turns: two local players share the device; X moves first, then X and O alternate one mark at a time.
- Placement: any empty intersection; placed marks never move or disappear during a game.
- Win: a maximal straight run of exactly five same-player marks wins horizontally, vertically, or diagonally. The rule checks the full contiguous run through the last mark, so a run of six or more is an overline and does not win. An overline does not trigger a foul loss; play continues.
- End cells: blocked ends do not change the exact-five result; a five wins even when both ends touch the opponent. Board edges do not add a separate block rule.
- Other rules: no captures, forbidden moves, opening protocol, clock, scoring, undo, hint, bot, network play, or persistence. A full board without an exact five is a draw. A completed game offers one “Ván mới” action.

This deliberately chooses one compact ruleset where blocked-end behavior differs from some digital Caro descriptions. It keeps the five-in-a-row contest and makes the variant visible in one short sentence. A move that bridges two shorter runs into six leaves the game active, with no automatic win or foul loss. It must not be labeled as exact historic or tournament Caro parity.

## Play surface

The board opens immediately, with X/O turn status and one-line controls. Pointer/touch places a mark; arrow keys move the single roving keyboard target, and Enter places a mark. The view uses CSS and text marks only. It contains no copied boards, branding, characters, sprites, or sounds. It does not add economy, unlocks, tutorial panels, or a long help page.

## Candidate API and integration contract

- Load `scripts/games/caro-candidate-model.js` first. It exposes `window.NP_CaroCandidateModel` and CommonJS exports: `SIZE`, `TARGET`, `EMPTY`, `X`, `O`, and `create()`.
- `create()` returns `place(row, col)`, `reset()`, `view()`, and `serialize()`. `place` returns `false` for invalid, occupied, or ended-game moves; successful moves return `true`.
- Load `scripts/games/caro-candidate.js` after the model. `window.NP_CaroCandidate.mount(container, { model })` mounts the view and returns `{ model, render(), destroy() }`. The view owns only its markup and local button listeners. An integrating launcher should call `destroy()` from its session cleanup hook.
- Include `scripts/games/caro-candidate.css` with the game surface. No registry or shared loader wiring was changed in this candidate branch.

## Rights and asset provenance

The model, interaction markup, and CSS in this candidate are newly authored. No external art/audio or historic game assets are included. Asset payload: 0 bytes; 0 added binary assets. The three candidate source files and tests are local project code, not licensed third-party content. Existing `assets/caro_cover.png` was not read, modified, or referenced.

## Verification status

Focused checks are in `tests/caro-candidate-model.test.cjs` and `tests/caro-candidate-ui.test.cjs`. They cover initial state, turn alternation, invalid/occupied moves, all four win directions, blocked-end behavior, the gap-bridging six-mark overline with continued play, a full-board draw, keyboard navigation, terminal state, restart, and view cleanup. Automated DOM checks are not browser/device acceptance. No browser layout, touch-device, screen-reader, timing, or performance acceptance is claimed. Integration, release-preflight, and catalog/registry wiring remain for the integration branch.
