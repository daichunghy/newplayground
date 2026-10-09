# Kệ Sách Ký Ức — research and scope

- **Internal catalog key:** `tiem-sach-cu-pho-co`
- **Visible title:** Kệ Sách Ký Ức
- **Game type:** original clue-driven ordering puzzle

## Original play loop

Each short stage shows a row of fictional books and a small set of relation clues. Read the clues, select a book, then shift it one place left or right until every clue is true. A stage clears when its clues match; three authored stages form the campaign. Each stage has a visible move budget (8, 12, and 16 adjacent shifts). Using the last shift without satisfying the clues loses. Players may pause or restart at any point; there is no timer.

This is a constraint puzzle, not color sorting: spine colors and sigils are decoration and do not encode the answer. It does not form words from letters or use a letter grid. The move is an adjacent book shift, while the goal is to deduce a unique linear order from positional, before, immediate-neighbor, and between clues. The last two stages combine clue types so one clue alone does not disclose the row.

## Authored boards and answerability

The fictional titles and clue sets are authored for this game. They do not refer to real books, authors, publishers, stores, or existing covers. Each stage's clue solver enumerates every permutation of its five, six, or seven books and confirms that exactly one order satisfies all clues. Starts are deterministic adjacent-swap scrambles from that answer; the scramble length (5, 7, or 9) is lower than the move cap. Reversing those adjacent swaps is a constructive solution witness. Replay uses the same seed and returns to the same campaign.

| Stage | Books | Clue forms | Move cap |
| --- | ---: | --- | ---: |
| Góc Đèn | 5 | between, immediate neighbor, final position | 8 |
| Bến Mưa | 6 | first position, immediate neighbor, before, fifth and final positions | 12 |
| Ngăn Trăng | 7 | first and fourth positions, between, before, two immediate-neighbor clues | 16 |

The stage answers stay in the model for generation and tests. The UI exposes the current fictional titles, clue text, stage, move count, and remaining budget, but not the answer order.

## Original presentation and lifecycle

The board uses a paper-and-wood shelf, CSS-only book spines, and original decorative sigils. No imported images, logos, brand names, or commercial book-cover art are included. Tap/click a book and use the large left/right controls to move it by one slot; Enter/Space selects a focused book, and arrow keys navigate or shift the selection. All touch targets are at least 44px. Pause, window blur, hidden-tab changes, route cleanup, restart, stage clear, win, and move-budget loss are handled in the standalone view/model. `NP_GameSession` owns DOM listeners and teardown.

The backlog has no authoritative rules source for the listed used-book-shop concept. This implementation therefore defines its own authored ordering rules and does not claim historical or commercial-game parity. It is a casual original puzzle.

## Acceptance checks

- Each authored clue set has exactly one solution, equal to its authored target order.
- Seeded scrambles are reproducible, non-solved, and solvable within their move budgets.
- Legal moves shift exactly one selected book by one adjacent slot; edge and terminal moves are rejected.
- Clearing stages advances through the campaign; the last clear wins; move exhaustion loses; restart/replay resets the same seed.
- UI tests cover selection, touch controls, keyboard use, pause/resume, page-visibility pause, stage advance, win, loss, replay, and session cleanup. The integrated Chromium browser suite (`tests/browser/portal.spec.cjs`) opened/closed all registered routes and played a live book move at a 320px viewport; all 33 browser tests passed. Emulated viewport checks do not establish physical-device input feel, assistive-technology support, novice difficulty, or distribution rights.

No external rules source is used: the game loop and clue semantics are original to this implementation.
