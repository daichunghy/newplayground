# Ô Ăn Quan candidate: research and scope

Research snapshot: 7 October 2026. This is an original two-player local candidate with one explicit casual ruleset. The catalog entry does not identify a particular historical app, edition, or full recorded playthrough, so this work does not claim exact historical parity.

## Research findings

- The Vietnam National Authority of Tourism's folk-games entry describes the familiar 10 small fields, two larger end pits, five pebbles per small field, choosing a field and sowing around the board, and capturing after a gap. The live page timed out when opened during this review; only its search-indexed content was available, so it was used as a discovery source rather than a fully checked rule transcript. [Vietnam Tourism: Ô ăn quan](https://vietnamtourism.vn/index.php/about/items/2295)
- A Hanoi kindergarten's public education portal describes 50 small stones and two larger Quan markers, a 10-field rectangular board, five fields per player's side, sowing one at a time in either direction, capturing over an empty field, continuing a chain, and refilling an empty side. It says play ends when both Quan are captured. This is a teaching description with local variants and debt examples, not one universal competition rulebook. [MN Tuổi Thần Tiên, Hanoi: Ô ăn quan](https://mntuoithantien.hanoi.edu.vn/goc-thu-gian/tro-choi-dan-gian-o-an-quan/ctmb/20126/136197)
- Ô Ăn Quan Online publishes a detailed ruleset used by that specific product. It labels the default and the separate “Lật bàn” and “Quan Già” variants, explains relay sowing, the occupied-Quan stopping rule, empty-gap captures, a five-point refill, and final scoring. Its rules are a product-specific contemporary reference, not evidence that every traditional or catalog-era version used them. The candidate adopts a compact subset of that product's documented default and lists its own small simplifications below. [Ô Ăn Quan Online: Full Rules](https://oanquan.online/luat-choi-o-an-quan)

## Selected candidate rules

- Solo is the immediately playable default: Red is the human and Black is the deterministic CPU. A compact toggle enables local hot-seat play. Red moves first; no first-player coin toss is shown.
- The board follows a 12-pit ring: 10 citizen fields and two end Quan pits. Each field starts with five dân stones; each Quan begins with one Quan marker worth ten points. A Quan pit may also accumulate ordinary dân stones.
- On a turn, choose any nonempty citizen field on your own side and one direction around the ring. Sow one dân into each following pit. If the next pit after sowing contains dân and is not an active Quan, pick it up and relay-sow in the same direction. If the next pit is an active Quan, the turn stops; Quan are never lifted for relay sowing.
- If the pit immediately after the last stone is empty, capture all stones in the pit after that. A Quan marker in the target is captured too and adds ten points. Continue capturing while the next gap/occupied-pit pattern repeats. Then the turn passes.
- If a player's five fields are empty at the start of their turn, five points are automatically spent to place one dân in each field. Fewer than five points causes a forfeit. This follows the chosen product reference's no-debt version of refill; the Hanoi teaching page also describes negotiated debt, which this candidate excludes.
- The match ends when both Quan markers are captured. Remaining field dân are scored to their side. Any dân still in a former Quan pit is assigned to that Quan pit's authored side owner so no stones disappear. Highest score wins; tied scores draw.
- The CPU is Black in solo mode. It searches every legal field-and-direction move, simulates each through the same sow, relay, capture, refill, forfeit, Quan-ending and sweep rules as a human move, and uses a deterministic two-ply minimax with alpha-beta pruning. Its fixed depth caps the ordinary search at 10 × 10 replies; the score values secured points most, then field ownership, Quan control and mobility. This is a compact casual opponent, not a deep strategy engine.
- No 3–4 player table, room creation, online clock, resign flow, “Lật bàn”, “Quan Già”, stakes, debt, scoring ladder, or shop.
- Controls: tap/click one of your nonempty fields, then choose clockwise or counter-clockwise sowing. Keyboard users can Tab to the same native buttons and press Enter/Space.

The chosen set preserves the recognizable sow/relay/capture contest and reduces visible rules to a short control cue. End scoring of stones left in a Quan pit is an explicit candidate choice because the cited summaries do not fully specify that edge case. Regional rules and historical versions remain unresolved.

## Implementation and asset rights

- `scripts/games/o-an-quan-model.js` is a deterministic 12-pit rules model. It preserves a 70-point total through sowing, capture, refill, Quan scoring, final sweep and forfeit; the CPU search clones and plays through this same model.
- `scripts/games/o-an-quan.js` renders ten accessible field buttons, two read-only Quan pits, scores, two direction controls, and a local hot-seat toggle. Solo starts with Red and hands Black's reply to the CPU. A short status message reports the CPU's field, direction and capture result. The view removes owned markup/listeners on session close.
- `scripts/games/o-an-quan.css` uses an original parchment/wood color treatment. `assets/o-an-quan-original.svg` is a separate project-authored geometric cover. Neither copies the inherited game's imagery or presentation. The older `o_an_quan_cover.png` is excluded from the release artifact.
- No external code, art, audio, screenshots, logos, or wording from the playable product was copied. The underlying folk-game rules are a cultural design reference, not exclusive content. Rights to the historic route and product name still require their own review.

## Verification status

Focused tests are in `tests/o-an-quan-model.test.cjs` and `tests/o-an-quan-ui.test.cjs`. They cover the 70-point opening, both sow directions, relay sowing, stopping at an active Quan, gap capture, Quan value, chained capture, invalid/opponent turns, automatic refill/forfeit, final sweep and tie/win, deterministic legal CPU replies, both play modes, restart, catalog launch, and close/reopen cleanup. DOM-double tests do not establish real-browser rendering, mobile fit, physical touch, assistive-technology use, human feel or balance. Those acceptance gates remain pending.
