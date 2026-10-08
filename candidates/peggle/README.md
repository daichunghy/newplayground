# Bật Chốt candidate

Bật Chốt is an original one-board ball-and-peg puzzle for catalog slot `peggle-pachinko`: aim, bounce through the board, clear the orange targets, and try to land in the moving bucket for another ball.

The [research and QA dossier](../../docs/games/BAT_CHOT_RESEARCH_AND_QA.md) records official EA/PopCap sources, edition limits, original-art provenance and what still needs browser/device review. This candidate does not use franchise characters, powers, level layouts, sound or artwork.

Open the standalone page through a static server. Focused model and DOM-double tests run with `node --test --test-concurrency=1 tests/pinball-pegs-model.test.cjs tests/pinball-pegs-ui.test.cjs`.
