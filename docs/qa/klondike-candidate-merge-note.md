# Klondike candidate merge note

Candidate branch: `codex/klondike-candidate-20261008`  
Base: `6e94e26390fbdea9accb0ce1669317c9a9e700f7` (`newplayground_upgrade`)  
Catalog ID: `xep-bai-solitaire`  
Candidate files:

- `scripts/games/klondike-model.js`
- `scripts/games/klondike.js`
- `scripts/games/klondike.css`
- `tests/klondike-model.test.cjs`
- `tests/klondike-ui.test.cjs`
- `docs/games/KLONDIKE_RESEARCH_AND_QA.md`
- `docs/qa/klondike-candidate-merge-note.md`

The local integration keeps the historical catalog ID but displays the original title Bảy Cột. The exact registry maps it to `launchBaiBayCot`; a new project-authored cover is recorded in the manifest and the existing asset register. The chosen Draw-One/one-recycle variant is explicitly documented and the historical catalog build remains unverified.

The local integration loads the model, UI, CSS and exact-ID wrapper in the established script order. The deck uses authored CSS and an original SVG cover. Retain the Draw-One/one-recycle scope and edition/parity caveat in the game dossier and operations inventory. The historical route/title rights remain open; no public push or deployment has happened.

The serial candidate test command passed 12/12 model and DOM-double tests. Browser/device rendering, touch behavior, accessibility review, and playtest remain pending. Do not infer release readiness from the candidate test pass.
