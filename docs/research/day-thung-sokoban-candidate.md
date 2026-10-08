# Đẩy Thùng — candidate dossier

## Catalog fit and edition uncertainty

The catalog historically labeled this entry “Đẩy Thùng Sokoban” and described pushing crates toward goals. The local card and play surface use the generic original title Đẩy Thùng. The entry does not identify a publisher, platform, release, rule variant, or reference edition. This candidate therefore implements the familiar classic single-player rules and does not claim parity with any particular historical game or store release.

## Mechanics reference

- [Sokoban Online — How to Play](https://www.sokobanonline.com/help/how-to-play) describes its classic puzzle rules: move in four directions, push one box at a time, never pull, and finish when every box is on a goal. Its modern variants add objects and matching box types; those are outside this candidate’s scope.
- [University of Alberta — Rules of the Game](https://webdocs.cs.ualberta.ca/~games/Sokoban/thegame.html) summarizes the push-only rule and why a wrong push can make a position unsolvable.

The candidate uses the shared classic rule set only. It has four-direction grid movement, single-box pushes into empty floor, no pulling, blocked movement through walls or boxes, win detection when all goals contain boxes, undo, and restart. A legal walk or push counts as one move; pushes are also counted separately for feedback.

## Original material

The three short layouts in `scripts/games/day-thung-sokoban-model.js` were authored for this candidate. They introduce an open aisle, two crates with a simple order choice, and a two-direction push around a corner. The vector cover and CSS figures are original procedural shapes; no legacy maps, branded logos, or third-party art are included.

The interface is in Vietnamese and keeps the board dominant. It starts immediately on the first puzzle. Keyboard, touch direction buttons, direct cell taps, and swipes share one deterministic model. The status live region reports the move/push count and completion; restarting or advancing clears the prior puzzle history.

## Acceptance limits

This original candidate is wired locally through the existing catalog route. Seven model and ten DOM-double UI/lifecycle checks pass; these include shared route launch and cleanup but are not browser/device acceptance. Its SVG cover is registered in the shared asset manifest. Visual browser review and confirmation against the intended catalog reference edition remain open.
