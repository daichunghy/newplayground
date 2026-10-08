# Sắc Chuyền — official edition research and original scope

Date: 2026-10-07
Historical route: `danh-bai-uno`
Player-facing title: Sắc Chuyền
Status: local original candidate; no Mattel/UNO affiliation, license or parity claim.

## Exact reference edition

The pilot reference was fixed to **Mattel UNO W2085 (2010)**, not a mobile sequel, premium pack or house-rule variant. Its [official product page](https://service.mattel.com/us/productDetail.aspx?prodno=W2085&siteid=27) identifies the edition and 108-card composition. The official [W2085 instruction sheet](https://service.mattel.com/instruction_sheets/W2085.pdf) gives the rules: seven cards per player; a four-color 0–9 deck; match by color/number/action; draw one if unable to play; Skip, Reverse and Draw Two; Wild and a restricted/challengeable Wild Draw Four; last-card announcement; and cumulative scoring up to 500. The publicly linked W2085 sheet is the source for this scope; it is not permission to use Mattel assets or branding.

## Original replacement scope

Sắc Chuyền keeps only the broad card-shedding/matching archetype. It uses four custom seasonal suits and symbols/patterns, ranks 1–8, two copies per suit/rank, eight “gió” draw-two actions, and four “giọt sương” wild cards, for a 76-card deck. It is a short 1v1 round against a simple deterministic AI, with six cards per hand; the first player to empty their hand wins. Matching uses season, number, gust symbol or a wild card. Gust makes the opponent draw two and skip their turn. A wild dew sets the next season. The discard pile recycles automatically when needed.

Deliberate differences: no four-color 0–9 composition, seven-card deal, Draw Four/challenge, skip/reverse, stacking, named last-card shout, scoring series to 500, customizable house rules, branded symbols or card layouts. The interface uses concise labels and a single optional help disclosure. The AI sees its own hand only through the model interface and never obtains the human hand from the player-facing view.

All code, card faces, patterns, names and cover art are original. The old `uno_cover.png` and `uno_intro.jpg` are retained in source only for provenance review and excluded from the static artifact. The legacy ID and wrapper stay for catalog compatibility; review title/route distribution rights before release.

## Verification

- Model: `scripts/games/season-shed-model.js`
- Interface/session: `scripts/games/season-shed.js`, `scripts/games/season-shed.css`
- Original cover: `assets/season-shed-original.svg`
- Model/UI tests: `tests/season-shed-model.test.cjs`, `tests/season-shed-ui.test.cjs`
- Full-suite and release-preflight evidence: `docs/qa/season-shed-local-checks-20261007.txt`

DOM doubles and static packaging do not establish real browser/device compatibility, responsive card scrolling, screen-reader acceptance, fairness, measured performance or player pacing. Keep those gates pending.
