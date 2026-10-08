# Merge note: Ống Nghiệm

- Candidate base: integration commit `b48d398`
- Catalog ID: `dr-mario-diet-khuan`
- Exact launcher, catalog and shared app files were not changed in the candidate commit; local integration adds that wiring separately.
- Candidate engine: `scripts/games/test-tube-model.js` and `scripts/games/test-tube.js`; stylesheet: `scripts/games/test-tube.css`.
- Candidate tests: `tests/test-tube-model.test.cjs` and `tests/test-tube-ui.test.cjs`.
- Research dossier: `docs/games/ONG_NGHIEM_RESEARCH_AND_QA.md`.
- Original cover: `candidates/ong-nghiem/assets/ong-nghiem-cover.svg`; if integrated, move/register it with provenance in the shared manifest and asset register.

Focused candidate tests pass 12/12. Local integration adds the exact-ID wrapper, script/style loading, concise-copy and asset-manifest records. Browser/device/accessibility/playtest, historical route/title clearance and exact edition parity remain pending.
