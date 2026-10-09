# Đẩy Thùng Sokoban — candidate dossier

## Catalog fit and edition uncertainty

The catalog labels this entry “Đẩy Thùng Sokoban” and describes pushing crates to goals while avoiding dead corners. It does not identify a publisher, platform, release, rule variant, or reference edition. This candidate implements the familiar classic single-player rules and does not claim parity with any particular historical game or store release.

## Mechanics reference

- [Sokoban Online — How to Play](https://www.sokobanonline.com/help/how-to-play) describes its classic puzzle rules: move in four directions, push one box at a time, never pull, and finish when every box is on a goal. Modern variants add objects and matching box types; those are outside this candidate’s scope.
- [University of Alberta — Rules of the Game](https://webdocs.cs.ualberta.ca/~games/Sokoban/thegame.html) summarizes the push-only rule and why a wrong push can make a position unsolvable.

The candidate uses the shared classic rule set only. It has four-direction grid movement, single-box pushes into empty floor, no pulling, blocked movement through walls or boxes, win detection when all goals contain boxes, undo, and restart. A legal walk or push counts as one move; pushes are also counted separately for feedback.

## Original material and progression

All six compact layouts in `scripts/games/day-thung-sokoban-model.js` were authored for this candidate; no legacy maps are reused. The first three teach an open aisle, a two-crate order choice, and a corner push. The next rooms add separated goals, a pinched route, and a final three-crate delivery with a narrow passage. Breadth-first witnesses in the model tests show each room is solvable; they verify reachability, not human difficulty.

Winning a room unlocks the next one and records its best move count. The board, undo history, unlock, and records are saved locally after valid moves, with recovery that leaves malformed or future-version saves untouched. Replay starts the campaign over from room one; the current room resumes after close/reopen.

The Vietnamese interface starts immediately. Keyboard, touch direction buttons, direct cell taps, and swipes share one deterministic model. The status line shows move/push counts, best moves, and concise storage recovery feedback.

The vector cover and CSS figures are project-created; no legacy maps, branded logos, or third-party art are included.

## Verification and acceptance limits

- Focused tests cover all six witness routes, one-box and multi-box pushes, dead-end/wall rejection, undo after a win, sequential unlocks, best-move records, save/restore including undo history, malformed/future save handling, storage denial fallback, and UI lifecycle.
- A Chromium test uses real keyboard input to clear all six rooms and verify final restart. Its result is pending on the next review-branch run.
- Physical-device layout, novice difficulty, human playtest, and review against any intended catalog reference edition remain open.
