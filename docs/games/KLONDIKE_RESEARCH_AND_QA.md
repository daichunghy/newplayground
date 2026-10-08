# Xếp Bài Klondike candidate: scope, sources, and QA

Date reviewed: 2026-10-08 UTC  
Candidate build: `klondike-candidate-1`  
Catalog ID: `xep-bai-solitaire`

## Decision and edition limit

The catalog names Klondike, but it does not identify a publisher, platform, region, release year, draw mode, scoring system, or stock-pass rule. This candidate therefore implements one self-contained Klondike variant. It does not claim parity with an unidentified catalog build, Microsoft Solitaire, Bicycle's printed rule page, Solitaire.com, or another named product.

Chosen variant: **Draw-One with one stock recycle**. The stock has 24 cards after the seven-column deal. Turn one card at a time onto the waste. When the stock empties, the waste may be turned back into the stock once, preserving its draw order. The second pass ends when the stock empties again. If no card placement is then available, the game reports a no-moves loss; Undo and Restart recover the player. A no-placement prompt during a pass still allows a stock draw or the single recycle.

The one-recycle limit is an explicit candidate rule choice. It is not attributed to either source below. No scoring, timer, hint, persistent save, campaign, currency, unlock, tutorial gate, or auto-solve is included.

## Source review

- Bicycle Cards, “Klondike,” `https://bicyclecards.com/how-to-play/klondike` (reviewed 2026-10-08). This publisher-authored rules page confirms a standard 52-card pack; four foundations from Ace through King; the 1–7, 28-card tableau deal; opposite-color descending tableau placement; exposing the next face-down card; King-only empty columns; and drawing from stock to waste. Its example uses groups of three, so it is evidence for the broad rules and a Draw-Three edition, not the selected Draw-One stock rule or the unidentified catalog edition.
- Solitaire.com, “Klondike Solitaire,” `https://solitaire.com/klondike-solitaire/` (reviewed 2026-10-08). This operator-authored game guide confirms the four areas, 52-card/7-column deal, foundations, descending alternate-color tableau, King-only empty column, waste plays, and the site's Turn 1 and Turn 3 options. The page also describes scoring and assists, which this candidate omits. It does not establish the historic catalog edition or the candidate's single-recycle limit.

## Implemented candidate scope

- A deterministic 52-card model with explicit seed support; seven piles receive 1 through 7 cards, top card face up, plus 24-card stock.
- Four suit foundations build Ace through King. The tableau accepts descending, opposite-color runs. Any valid exposed run can move as a unit. A newly exposed card turns face up. Only a King can enter an empty column. A foundation top card can return to a tableau.
- Draw-One stock, waste, one recycle, full-state Undo, same-deal Restart, and random New Deal.
- Win detection after all 52 cards reach foundations; no-placement status while stock/recycle actions remain; terminal loss after the selected pass limit; Undo/Restart recovery.
- Tap/click source then destination, mouse drag-and-drop, keyboard focus through card and empty-pile controls, `Z` for Undo, and `Escape` to clear selection.
- Immediate playable deal with concise controls. No account, tutorial screen, timer, currency, or unlock menu.

## Source and asset provenance

All candidate JavaScript and CSS in this change are project-authored. Card faces use text rank labels and standard Unicode suit glyphs; the card backs, felt, slot marks, shadows, and responsive layout are generated with CSS. `assets/bay-cot-original.svg` is a project-authored card-table cover recorded in the asset manifest. There are no copied logos, branded illustrations, screenshots, source code, or audio files. The page uses the repository's Calibri/Inter/system font stack and loads no external font or runtime.

## Automated checks

Command run at concurrency 1:

```text
node --test --test-concurrency=1 tests/klondike-model.test.cjs tests/klondike-ui.test.cjs
```

Result: 12 tests passed, 0 failed. The deterministic model tests cover deck/deal invariants, tableau sequencing, covered-card rejection, foundation rules, stock order/recycle/undo, no-placement recovery, a no-moves loss and restart, and a complete deterministic win. The DOM-double tests cover immediate mount, seven rendered columns, click/tap moves, keyboard Undo, stock and restart controls, drag-and-drop, and cleanup making stale input inert.

## QA limits and release status

This is a locally integrated prototype, not a release-ready game. No real browser, public preview, mobile device, screen reader, human playtest, input-latency, rendering, touch, or contrast review was performed. DOM doubles verify event/controller wiring, not browser layout or assistive-technology behavior. The historical catalog edition and its title/route rights remain unverified. The candidate makes no full-product parity claim.
