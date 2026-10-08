# Kính Khảm — research and scope

Updated 7 October 2026. Candidate `kk1` replaces the historical `kim-cuong-bejeweled` route with an original match-three puzzle about completing three stained-glass windows. It is a prototype, not a completed Bejeweled recreation or a claim of parity.

## Reference sources and limits

- [EA — Bejeweled 3](https://www.ea.com/games/bejeweled/bejeweled-3), official product page reviewed 7 October 2026. It identifies the PC edition and gives its release date as 7 December 2010. The page shows several modes but does not explain their complete rules, board layout, score, turn rejection, cascade logic, or special-piece behavior.
- [EA — Bejeweled 3 match-three overview](https://www.ea.com/it-it/news/origin-offre-la-ditta-bejeweled-3-gratis), official publisher article dated 17 September 2014. It describes Bejeweled 3 at a high level as a match-three game and mentions eight modes; it is not a detailed rules manual.
- [PopCap-hosted Bejeweled 3 Nintendo DS guide (PDF)](https://static-www.ec.popcap.com/support.popcap.com/sites/support.popcap.com/files/BEJ3_11_00983_DS_Manual.pdf). Search-index text describes swapping a tile with an orthogonally adjacent tile and matching three alike. Opening the PDF returned 403 in this research pass; it is a Nintendo DS guide and is not used to assert PC-specific controls or exact PC rules.

The exact PC ruleset could not be verified from a PC manual or playable build. This dossier therefore does not blend the DS guide's edition-specific instructions into a PC parity claim. No copied levels, UI, characters, logos, special pieces, sound, palette, or source assets are used.

## Original candidate scope

- 6×6 board made from five original icon shapes; the first window uses four game colors and later windows use five.
- Three authored windows with goals of 45, 60, and 75 matched fragments. Each offers up to 30 successful swaps.
- Tap/click two adjacent tiles; a swap that does not form a line of three or more reverts and spends no move.
- Matched horizontal and vertical runs clear together. Empty spaces fall and refill from above; cascades resolve immediately.
- Matching progress, score, window changes, restart, save, and retry are automatic. There are no boosts, shop, currency, account, purchases, or upgrade menu.
- Original project-authored SVG and tile symbols; no EA/PopCap artwork or branded audio.

These mechanics, values, and stage layouts are NewPlayground design choices, not measurements from the reference. The player-facing title is Kính Khảm. The old catalog ID remains for exact routing only; permission to use the historic title/route is not asserted.

## Verification and remaining gates

- `node --test tests/mosaic-match-model.test.cjs tests/mosaic-match-ui.test.cjs`: 10 model + 6 DOM-double UI tests; rerun after integration.
- Model checks initial-board playability, swap rollback, cascades, gravity, scoring, stage goals, save/restore, retry, and deterministic progression.
- UI tests check instant start, adjacent swap, keyboard focus, pause, restart cancel/confirm, storage recovery, and cleanup. These are event/DOM doubles, not a real-browser layout check.
- Browser/mobile rendering, input latency, screen-reader and contrast review, full playtest, detailed PC rules, and historical route/title rights remain pending.
