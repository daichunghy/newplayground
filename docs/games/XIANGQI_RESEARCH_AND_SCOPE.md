# Cờ Tướng candidate: research and scope

Research snapshot: 7 October 2026. This is an original Xiangqi candidate with solo play against a deterministic computer opponent by default and optional local hot-seat play. The old catalog label did not identify a historical build or a versioned game, so this work does not claim title-specific or puzzle-pack parity.

## Reference findings

- The World Xiangqi Federation publishes a 2018 English rules book. Its table of contents separates playing, competition, detailed rules, and examples. It is the governing-rule reference for the candidate's board and movement baseline, not evidence that the unidentified catalog build used every competition procedure. [World Xiangqi Rules (2018)](https://www.wxf-xiangqi.org/images/wxf-rules/2018_World_XiangQi_Rules_English2018.pdf)
- The official Asian Xiangqi Federation rules page describes its tournament rules as addressing endless move repetition and notes that the competition rules have been revised. This supports treating repetition handling as a distinct rules decision. The candidate uses a simple exact-position threefold draw and does not adjudicate perpetual check or chase. [Asian Xiangqi Federation: AXF Rules](https://www.asianxiangqi.org/English/AXFrulesEng.htm)
- The Xiangqi.com help page gives an accessible, game-specific summary of the normal piece movement: chariot rays, the horse-leg block, cannon screen capture, soldier river-crossing, the advisor/general palace, elephant eye and river limits, and facing generals. It is an independent secondary explanation; the WXF book remains the formal reference. [Xiangqi.com: Pieces and Moves](https://www.xiangqi.com/help/pieces-and-moves)
- The available catalog description and old prototype are not a selected or verified historical reference. The old code showed five named puzzles, but its rules only allowed a subset of red pieces, checked for a preset move sequence rather than legal checkmate, and included inherited artwork and long promotional text. Those puzzle positions and claims were not preserved as authored content.

## Candidate rules

- Board: standard 9-file by 10-rank point grid with the familiar river and palaces; all 32 pieces use an authored standard opening setup; Red moves first.
- Pieces: each side has one general, two advisors, two elephants, two horses, two chariots, two cannons, and five soldiers.
- Movement: generals and advisors stay in their own palace; elephants move two diagonal points, cannot cross the river, and need a clear eye; horses move in an L with a clear leg; chariots move orthogonally through empty points; cannons move orthogonally and capture an enemy only over exactly one screen; soldiers move forward, and also sideways after crossing the river.
- Legality: the generals cannot face on an open file; a player cannot make a move that leaves its own general in check. The engine detects check and ends on checkmate. Stalemate loses, following the general Xiangqi objective rather than Western-chess stalemate-to-draw behavior.
- Repetition: a position includes all piece types, sides, squares, and side to move. An exact position occurring three times is a casual draw. This deliberately small rule does not attempt the AXF/WXF competition process for perpetual-check or perpetual-chase situations.
- Play: one shared-device solo match against Black by default, or optional hot-seat play; no puzzle campaign, clock, score ladder, inventory, tutorial overlay, network service or persistence.
- Computer opponent: Red remains the first move. A deterministic, one-reply material/check search selects only from the model's legal move list. It evaluates at most 10 candidate moves and 8 opponent replies per candidate (80 leaf evaluations), so each human move has a fixed shallow-search ceiling and leaves follow-up counterplay. It does not modify the board or repetition history while searching.
- Controls: select a piece, then a highlighted legal point; pointer/touch and keyboard arrow/Enter input are implemented. Cell and mode controls stay at least 44 px wide on narrow screens, with horizontal board scrolling where needed. No drag is required.

The candidate keeps the defining Xiangqi contest while keeping the first action obvious. The displayed title is the generic Cờ Tướng name, rather than calling the new game a historical endgame trainer.

## Implementation and asset rights

- `scripts/games/xiangqi-model.js` contains the deterministic board, piece rules, check safety, ending state, repetition tracking and bounded CPU move selection.
- `scripts/games/xiangqi.js` renders 90 accessible cell buttons and owns its board listeners. The game session calls its cleanup hook on close.
- `scripts/games/xiangqi.css` draws a parchment and ink board. `assets/xiangqi-original.svg` is a project-authored geometry composition. The Chinese piece marks are Unicode text glyphs, not copied sprite art.
- The code, labels, board and SVG were written for this project. No puzzle composition, third-party art, audio, source code, screenshot, logo or game UI was copied. The inherited `co_tuong_cover.png` and `cotuong_intro.jpg` are excluded from the release artifact. Rights to the generic historical route/title still require their own review.

## Verification status

Focused model coverage is in `tests/xiangqi-model.test.cjs`; it covers the initial setup, chariot blocking/capture, horse legs, elephant eye/river, cannon screens, palace/facing generals, soldier crossing, self-check rejection, checkmate/stalemate, threefold draw/reset, and deterministic legal CPU replies including a tactical capture. `tests/xiangqi-ui.test.cjs` covers the solo default, CPU reply, optional hot-seat mode, keyboard navigation, close/reopen, and the original cover route. These tests use a DOM double and are not real-browser or physical-device acceptance. Browser layout, glyph fallback, screen-reader use, touch accuracy, rules review by Xiangqi players, and human playtest remain pending.
