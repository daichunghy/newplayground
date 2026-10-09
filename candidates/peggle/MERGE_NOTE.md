# Merge note: Bật Chốt

- Candidate base: `13ba516` on `codex/deep-upgrades-20261007`
- Catalog ID: `peggle-pachinko`
- Candidate engine: `scripts/games/pinball-pegs-model.js` and `scripts/games/pinball-pegs.js`; stylesheet: `scripts/games/pinball-pegs.css`.
- Tests: `tests/pinball-pegs-model.test.cjs` and `tests/pinball-pegs-ui.test.cjs`.
- Dossier: `docs/games/BAT_CHOT_RESEARCH_AND_QA.md`.
- Original cover: `assets/chot-bi-cover.svg`; an integration should register it in the shared manifest and asset register.

No shared catalog/router/manifest files are changed in this candidate commit. If integrated, add the exact catalog launcher, original cover metadata, UI-copy and route/cleanup tests, then rerun the full suite and static preflight. Browser/device, balance, accessibility and historical title/route review remain pending.
