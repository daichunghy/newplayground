# Xếp Bài Bốn Ô candidate: scope, sources, and QA

Reviewed: 2026-10-08 UTC
Candidate build: `freecell-candidate-1`
Catalog ID: `xep-bai-freecell`

## Edition boundary

The catalog entry identifies the game only as “Xếp Bài FreeCell”; it supplies no publisher, platform, release, build number, numbered deal, or movement variant. This candidate uses the operator-authored **Classic FreeCell** rules published by Freecell.com as the rule reference. The rules pages do not expose a version/build identifier, so the scope is that published rule set as reviewed on 2026-10-08, not an exact software-build match. The candidate makes no parity claim for Microsoft FreeCell, another named implementation, or an unidentified catalog edition.

## Primary rule sources

- Freecell.com, [“FreeCell Rules”](https://freecell.com/guides/freecell-rules), reviewed 2026-10-08. The game's operator documents the 52-card deck, 8 face-up columns split 7/6, four one-card cells, four suit foundations, descending alternating-color tableau, any-card empty columns, foundation goal, stuck state, and differences among variants.
- Freecell.com, [“How Many Cards Can You Move in FreeCell?”](https://freecell.com/guides/freecell-moving-multiple-cards), reviewed 2026-10-08. The operator defines the common capacity as `(empty free cells + 1) × 2^(usable empty columns)` and explicitly excludes an empty destination column from the temporary-column multiplier. It explains that a supermove represents a sequence of single-card transfers.

These are primary sources for Freecell.com's own Classic FreeCell guide/game. They do not identify a Microsoft edition or the NewPlayground catalog's historical reference.

## Chosen rules and implementation

- Deal one standard 52-card deck face up across eight tableau columns: seven cards in each of the first four, six in each of the last four. All cards are visible immediately; there is no stock or waste pile.
- Use four free cells with one card per cell and four suit foundations that build from Ace through King.
- Build tableau runs down one rank at a time with alternating red and black. A selected run must already be in that order. A single exposed card can move to an open cell; a cell card can move to a legal tableau position or foundation.
- Empty tableau columns accept any card or a valid run; this candidate has no Kings-only restriction. Foundation cards cannot be moved back to the tableau. That is an explicit implementation choice because FreeCell implementations differ on foundation return; Undo remains available.
- A sequence can move only when its length is within `(empty cells + 1) × 2^(empty usable columns)`. When the destination column is empty, exclude that destination from the exponent. The source is occupied at the start and is not counted. A permitted supermove is one atomic model action and increments the logical move count once; the UI does not display a score or move counter.
- Win when all 52 cards reach the four foundations. If no legal move remains, the board reports “stuck”; Undo, Restart, and New Deal remain available.
- The standalone page opens a fixed seeded deal (`bon-o-viet-20261008`) without a menu. New Deal chooses a fresh random seed; Restart restores the original deal. Random deals are not solver-checked, so the candidate does not claim every deal is solvable.
- No timer, scoring system, hints, auto-foundation, account, save, unlock, currency, shop, or ad flow is included.

## Original presentation and provenance

The Vietnamese title is **Bốn Ô**. The felt table, slot treatment, responsive layout, card faces, and UI code are authored for this project. Card ranks and standard suit glyphs are text; `assets/bon-o-original.svg` is an original cover recorded in the asset manifest. There are no borrowed logos, branded illustrations, screenshots, external fonts, card images, or third-party runtime dependencies.

## Automated checks

Run at concurrency 1:

```text
node --test --test-concurrency=1 tests/freecell-model.test.cjs tests/freecell-ui.test.cjs
```

Result: 9 passed, 0 failed. Model tests cover seeded deal invariants, valid/invalid tableau sequences, cell capacity, legal and rejected supermoves, the empty-destination capacity rule, permissive empty columns, foundation order, a complete deterministic win, undo, and restart. DOM-double tests cover immediate rendering of 52 face-up cards and all board zones, click selection and moves, focus restoration, keyboard Undo/Escape, Restart/New Deal, and cleanup removing listeners and making stale actions inert.

## Remaining QA and claims

This is a locally integrated prototype, not an accepted release. No real-browser rendering, mobile device, screen reader, human playtest, contrast audit, input-latency measurement, or public preview was performed. The standalone page remains available for isolated inspection. No exact-version or catalog-parity claim is made.
