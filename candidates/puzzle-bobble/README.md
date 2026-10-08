# Bi Vòm candidate

Bi Vòm is a project-authored bubble shooter for the catalog slot `puzzle-bobble-khung-long`. Its six short stages use original fixed boards and shot queues; aim, shoot, match three, and drop unsupported groups. Later stages add denser layouts and support branches. Pointer/touch and keyboard inputs share the same rules model, and cleared stages can be replayed.

Best scores and sequential unlock progress use a versioned local save. Corrupt saves are backed up, future-schema saves are preserved, and storage failures leave the current session playable. This is an original campaign with no franchise-parity claim.

The [research and QA dossier](../../docs/games/BI_VOM_RESEARCH_AND_QA.md) records the selected scope, official Taito sources, original-art provenance, six witness runs and remaining human acceptance gates. Open this page from the repo's static server. Automated model, campaign and DOM-double tests run with `node --test --test-concurrency=1 tests/bubble-dome-model.test.cjs tests/bubble-dome-campaign.test.cjs tests/bubble-dome-ui.test.cjs`.
