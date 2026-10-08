# Bốn Ô — FreeCell candidate

This isolated candidate builds the planned catalog entry `xep-bai-freecell` as an original Vietnamese card-table game. Open [`index.html`](./index.html) from the repository's static server for an immediate, pre-dealt game.

The rules model, renderer, and table styling are project-authored in `scripts/games/freecell-model.js`, `scripts/games/freecell.js`, and `scripts/games/freecell.css`. See [the research and QA dossier](../../docs/games/FREECELL_RESEARCH_AND_QA.md) for the selected Classic FreeCell rule source, movement limits, edition boundaries, and unverified stages.

The isolated candidate was based on integration commit `fbc03af5551b0aefcfec7b2e41501a35b884ef6c`; its candidate branch remains unchanged. The current local integration has wired the catalog route, original cover, script loading, and game session. Integration tests and release preflight are recorded in [the research and QA dossier](../../docs/games/FREECELL_RESEARCH_AND_QA.md). Browser/device acceptance and historical edition parity remain unverified. See the [merge note](./MERGE_NOTE.md) for the original candidate scope.
