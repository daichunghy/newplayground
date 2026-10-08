# Xếp Bài Nhện — candidate dossier

Status: candidate source based on integration commit `b48d39857eb8540faeb81d1e1e2d16d825468e3f`; locally integrated into `codex/deep-upgrades-20261007`. The candidate branch remains isolated; portal route acceptance is DOM-double only and real-browser/device checks are pending.

## Reference and selected edition

The primary digital rule references reviewed on 2026-10-08 are [MobilityWare’s Spider Help Center](https://mobilityware.helpshift.com/hc/en/11-spider/faq/586-how-do-i-play-spider-solitaire/?l=en&p=ios&s=rules) and [Arkadium Player Support](https://support.arkadium.com/en/support/solutions/articles/44001813711--spider-solitaire-how-to-play-tips-settings-scoring). They document Spider variants, the two-deck 104-card deal, ten tableau columns, a 50-card stock, descending tableau builds, same-suit movable runs, automatic removal of a complete King-to-Ace run, and row deals of one card per column. Both describe blocking a stock deal while a column is empty as a standard setting; MobilityWare separately notes an optional unrestricted-deal setting.

This candidate chooses a **one-suit, two-deck edition**: 104 spades, dealt 6/5 cards across ten columns with the top card face up, leaving five stock rows of ten. This is the Easy/1 Suit class described by Arkadium. Spades are a local presentation choice, not a claim that every one-suit Spider build uses spades. Moves build down by rank; any same-suit descending suffix can move as a group; any eligible card or group can fill an empty column; a complete K-to-A run is removed immediately. Stock deals are blocked until all ten columns are occupied.

No exact catalog build or named commercial edition was identified. This implementation makes no parity claim. It uses seeded random deals, unrestricted one-action undo across stock deals and run removal, and no scoring, clock, hint, leaderboard, winning-deal mode, or persistence. A random deal is not guaranteed to be solvable. The old Spider rules and modern digital versions can differ; this candidate follows the documented digital convention for automatic run removal and empty-column stock blocking.

## Original art and content provenance

The card faces, backs, table surface, typography, colors, and layout are rendered from project-authored HTML/CSS with Unicode rank and suit glyphs. No third-party images, sound, branded card backs, title treatments, or copied text are included. Local integration adds the original cover `assets/bai-nhen-original.svg` to the shared manifest and asset register. Player-facing copy is short Vietnamese text written for this candidate.

## Files and merge note

- `scripts/games/spider-model.js` — independent deterministic rules model.
- `scripts/games/spider.js` and `scripts/games/spider.css` — click/touch-first view with optional desktop drag and keyboard shortcuts.
- `tests/spider-model.test.cjs` and `tests/spider-ui.test.cjs` — focused rule and DOM-double tests.
- The candidate commit deliberately left shared portal wiring unchanged. Local integration now adds the exact catalog launcher, scripts/styles, title, cover, asset records, copy budget, and route/cleanup tests. Keep browser/device acceptance and release approval pending.

## Verification limits

The focused Node tests exercise the model and UI through a DOM double. They do not replace visual QA in a real browser or on touch hardware. The isolated candidate has no catalog route or cover by design, so this branch cannot verify in-app route selection, shared-shell fit, or real device gestures. Those checks belong after a reviewed integration.
