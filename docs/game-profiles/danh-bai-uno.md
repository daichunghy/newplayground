# Mattel UNO W2085: exact edition research; original replacement is Sắc Chuyền

ID: `danh-bai-uno` (historical route) · Pilot order: 12 · Updated: 2026-10-07

**Status: W2085 product page and official sheet reviewed; original candidate implemented locally; browser/device/playtest and legacy-title rights pending.** Player-facing title: Sắc Chuyền. The historical route remains only for compatibility and is not a license or claim of Mattel/UNO affiliation.

## Reference research and limits

- [Mattel W2085 product page](https://service.mattel.com/us/productDetail.aspx?prodno=W2085&siteid=27) identifies the 2010 edition and its 108-card deck, including four colored number suits and action/wild cards.
- [Mattel W2085 official instruction sheet](https://service.mattel.com/instruction_sheets/W2085.pdf), copyright 2012, specifies the selected edition: seven cards each, match by color/number/action, single draw, action effects, Wild Draw Four color restriction/challenge, last-card announcement, and accumulating score to 500. This is exact-edition evidence, not permission to use brand assets.
- The candidate deliberately does not claim to reproduce that deck, scoring or rules. It omits the original brand's name, cards, card faces, art, sound, characters and signature callout.

## Original Sắc Chuyền scope

Sắc Chuyền is a short two-seat seasonal card duel against a simple, deterministic AI. Four original suit symbols/patterns pair with numbers 1–8. Players shed cards by matching season, number or action. A colored “gió” action makes the other player draw two and lose the turn; a symbol-only “giọt sương” lets its player choose the season. Each player starts with six cards; the first empty hand wins the single round. Draw pile reshuffling is automatic. No stacking, reverse, skip, challenge, branded last-card callout, score-to-500 campaign, upgrades, accounts, ads or in-app purchases.

Values and suit art are original design choices. Four season shapes accompany the distinct palettes so color is never the only signal. The candidate is an archetype translation with documented differences, not an UNO replica or licensed adaptation.

## Implementation and gate

- Model/UI: `scripts/games/season-shed-model.js`, `scripts/games/season-shed.js`, `scripts/games/season-shed.css`.
- Original cover: `assets/season-shed-original.svg`; unverified `assets/uno_cover.png` and `assets/uno_intro.jpg` are not used and are excluded from the artifact.
- Seventeen deterministic model tests and seven DOM-double UI/lifecycle tests cover deck conservation, matching, draw/pass, wild, gust, AI, wins/loss, saves and cleanup.
- Real desktop/mobile browser rendering, responsive hand scrolling, color/shape accessibility, keyboard/touch play, pacing, and distribution-rights review remain pending.
