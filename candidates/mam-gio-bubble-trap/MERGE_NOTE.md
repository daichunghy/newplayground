# Candidate 39 merge note

- Branch: `codex/candidate-39-bubble-trap`
- Base: `726976609341f3daee653a1c67ef1d13f02eaccc` (`newplayground_upgrade` integration source)
- Candidate title: **Mầm Gió**
- Module API: `window.NP_BubbleTrap.mount(container, session, audio)`
- Tests: `node --test --test-concurrency=1 tests/bubble-trap-model.test.cjs tests/bubble-trap-ui.test.cjs` — 12 passing.
- Preview: serve the repository root with a static HTTP server, then open `candidates/mam-gio-bubble-trap/index.html`.

Additions are limited to the candidate engine/model/style, its tests, the standalone preview, original SVG cover, and candidate notes. No catalog/router, registry, shared operations, metadata, or asset-manifest files were changed.

The candidate is now wired locally: the legacy catalog ID routes to `launchMamGio`, the visible title is Mầm Gió, and the card uses the original SVG cover. The former cover stays in source and is excluded from the prepared artifact. This local implementation does not resolve the old title/route rights; retain the caveat and do not make a parity claim. The official sources are retrospective/re-release summaries; they do not specify the registry’s exact edition or provide tuning targets.

Browser rendering, physical keyboard/touch device QA, accessibility review, balance, and novice playtest are still pending. No publish or PR was created.
