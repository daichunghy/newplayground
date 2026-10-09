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
- Turns: solo is the simple default; the human uses X and the deterministic CPU uses O. A local hot-seat toggle lets two players share the device. X moves first in either mode.
- Placement: any empty intersection; placed marks never move or disappear during a game.
- Win: a straight run of five or more same-player marks wins horizontally, vertically, or diagonally. The rule checks the full contiguous run through the last mark; a six-or-more overline is a win, with no foul loss.
- End cells: blocked ends do not change the five-in-a-row result; five marks win even when both ends touch the opponent. Board edges do not add a separate block rule.
- Other rules: no captures, forbidden moves, opening protocol, clock, scoring, undo, hint, network play, or persistence. A full board without five in a row is a draw. A completed game offers one “Ván mới” action.

The playable casual default now treats any contiguous run of five or more as a win. A six-mark overline, including one made by bridging two shorter runs, wins for the player who placed it; it never causes a foul loss. This differs from the exact-five Renju/Gomoku example above and from the candidate's earlier local build. It remains one explicit casual choice, not a claim of exact historic or tournament Caro parity.

## Play surface

The board opens immediately in solo mode: X is the human and O is a deterministic CPU that takes an immediate win, blocks an immediate opponent win when possible, then scores nearby five-cell patterns with a center-distance tie-break. It only considers empty intersections within two spaces of existing marks. It searches no deeper than one-ply tactics, so it is a fair casual opponent rather than a strong Gomoku engine. A compact toggle enables local hot-seat play. Pointer/touch places a mark; arrow keys move the single roving keyboard target, and Enter places a mark. The view uses CSS and text marks only. It contains no copied boards, branding, characters, sprites, or sounds. It does not add economy, unlocks, tutorial panels, or a long help page.

## Candidate API and integration contract

- Load `scripts/games/caro-candidate-model.js` first. It exposes `window.NP_CaroCandidateModel` and CommonJS exports: `SIZE`, `TARGET`, `EMPTY`, `X`, `O`, and `create()`.
- `create()` returns `place(row, col)`, `reset()`, `view()`, and `serialize()`. `place` returns `false` for invalid, occupied, or ended-game moves; successful moves return `true`.
- Load `scripts/games/caro-candidate.js` after the model. `window.NP_CaroCandidate.mount(container, { model })` mounts the view and returns `{ model, render(), destroy() }`. The view owns only its markup and local button listeners. An integrating launcher should call `destroy()` from its session cleanup hook.
- Include `scripts/games/caro-candidate.css` with the game surface. No registry or shared loader wiring was changed in this candidate branch.

## Rights and asset provenance

The model, interaction markup, and CSS in this candidate are newly authored. No external art/audio or historic game assets are included. Asset payload: 0 bytes; 0 added binary assets. The three candidate source files and tests are local project code, not licensed third-party content. Existing `assets/caro_cover.png` was not read, modified, or referenced.

## Verification status

Focused checks are in `tests/caro-candidate-model.test.cjs` and `tests/caro-candidate-ui.test.cjs`. They cover initial state, turn alternation, invalid/occupied moves, all four win directions, blocked-end behavior, six-mark overline wins, immediate CPU wins and blocks, legal CPU moves, both play modes, a full-board draw, keyboard navigation, terminal state, restart, and view cleanup. Automated DOM checks are not browser/device acceptance. No browser layout, touch-device, screen-reader, timing, or performance acceptance is claimed. Integration, release-preflight, and catalog/registry wiring remain for the integration branch.
