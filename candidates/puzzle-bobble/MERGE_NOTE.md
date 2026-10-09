# Merge note: Bi Vòm

- Candidate base: integration commit `b48d398`
- Catalog ID: `puzzle-bobble-khung-long`
- The candidate commit left the exact launcher and catalog metadata untouched; local integration now adds both.
- Candidate engine: `scripts/games/bubble-dome-model.js` and `scripts/games/bubble-dome.js`; stylesheet: `scripts/games/bubble-dome.css`.
- Candidate tests: `tests/bubble-dome-model.test.cjs` and `tests/bubble-dome-ui.test.cjs`.
- Candidate dossier: `docs/games/BI_VOM_RESEARCH_AND_QA.md`.
- Original SVG cover: `candidates/puzzle-bobble/assets/bi-vom-cover.svg`; integration must move/register this asset with provenance in the shared manifest and operations register.

Focused automated checks pass 12/12. Local integration adds exact-ID routing, script/style loading, copy gate and asset record. Real-browser/device QA and historical title/route rights remain open; do not claim franchise parity.
