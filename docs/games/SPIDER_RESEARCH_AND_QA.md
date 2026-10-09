# Bài Nhện one-suit candidate: rules and QA

Reviewed: 2026-10-09 UTC  
Candidate: one-suit Spider Solitaire  
Catalog ID: `xep-bai-nhen-spider`

## Variant and rule references

The catalog does not identify a publisher, edition, or number of suits. This candidate is **one-suit Spider** and makes no parity claim for an unidentified historical build. The rules follow the standard one-suit Spider archetype: two decks/104 cards, ten tableau columns, 50 stock cards in five rows, movable same-suit descending runs, any card on an empty column, and eight completed King-to-Ace runs to win.

- [Tripledot Games Spider Solitaire FAQ](https://www.tripledotstudios.com/spidersolitairefaq), reviewed 2026-10-09. It documents the two-deck/104-card setup, ten columns with 54 cards dealt, five stock rows, same-suit completed runs, stock restriction while a column is empty, and the eight-run win condition.
- [Spider Palace: How to Play Spider Solitaire](https://www.spider-palace.com/how-to-play-spider/), reviewed 2026-10-09. It documents one-suit play, the 54/50 layout, descending sequences, which same-suit runs may move together, empty-column placement, and stock-row dealing.

The candidate deals six cards to the first four columns and five to the remaining six; only the top card is face up. A stock action adds one card to each column and is unavailable while a column is empty. Completed runs are removed automatically. Undo and Restart are available; there is no timer or score.

## Gameplay and behavior coverage

- `scripts/games/spider-model.js` owns deal, movement, stock, completion, stuck, undo, and restart behavior.
- `tests/spider-model.test.cjs` covers deck/deal counts, accepted and rejected runs, stock restrictions, hints, completed-run removal, and exhausted-stock stuck state. The deterministic stuck recovery case uses seed `526`, deals five stock rows, checks that hints stop, undoes the fifth row, deals again, then restarts to the exact opening deal.
- `tests/spider-ui.test.cjs` covers mounted play, hint selection, stock/undo/restart controls, and cleanup.
- `tests/browser/portal.spec.cjs` exercises the live route on a 320px touch viewport: pan the ten-column board, follow a legal hint with a real tap, and verify Undo becomes available.

Focused model and UI tests run with:

```sh
node --test --test-concurrency=1 tests/spider-model.test.cjs tests/spider-ui.test.cjs
```

## Limits

This is a one-suit local candidate, not a solver-certified deal set or exact match for a named commercial edition. Deterministic model fixtures prove rule transitions; they do not establish that every random deal is solvable or replace human playtesting on physical phones and assistive technology.
