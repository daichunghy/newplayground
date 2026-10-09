# Ống Nghiệm candidate

Ống Nghiệm is an original instant-play falling-capsule puzzle for `dr-mario-diet-khuan`. Move and rotate the two-color pieces, make lines of four, and clear the germs.

The [research and QA dossier](../../docs/games/ONG_NGHIEM_RESEARCH_AND_QA.md) cites Nintendo's official NES manual, records the chosen rules and rights boundary, and separates automated checks from pending browser/device playtests. The candidate branch remains unwired; its code is integrated locally through the exact catalog route on the integration branch.

Open this page through the repository's static server. Focused tests run with `node --test --test-concurrency=1 tests/test-tube-model.test.cjs tests/test-tube-ui.test.cjs`.
