# NewPlayground 2026-10-10: six-original-game batch — research, architecture, quality gates

Working branch \`feat-newplayground-games-oct10\`, stacked draft PR #3 against \`codex/quality-depth-integration-20261008\`.

This is a **scope decision for independent original browser games**, not a claim to reproduce a commercial title, its exact audiovisuals, monetization, proprietary content or difficulty curves. Existing catalog IDs remain unchanged to avoid router churn. Read AGENTS.md for the project-wide architecture and asset policy.

## Concurrency and boundaries

Before implementation the current main branch was behind PR #2, which already owned 70 playable routes and many shared files. Existing routes such as Minesweeper, the original Arkanoid, rhythm Audition, Dog Crossing, Bridge Builder, Pinball, Word puzzle and many others were therefore **excluded**. Only previously unregistered planned catalog IDs are adopted. Original source implementation is in game-specific \`scripts/games/*.js\`, with a small shared batch CSS file and launcher bridge. Integration touches the registry, catalog/cache, index includes, cover map, asset register, and operations ledger. No changes were made to PR #2's games or site-wide design.

## Game A — Phím Sao (\`piano-tiles-phim-nhac\`)

**Reference used for the general interaction, not copied:** an official Piano Tiles listing, https://play.google.com/store/apps/details?id=com.kooapps.pianotilesgp (accessed 2026-10-10). A time-window input design is a NewPlayground-specific variation, with separate notes in four lanes, which is intentionally distinct from a claim of a faithful piano-tiles reproduction.

Loop: a deterministic 36-note chart across three increasingly fast stages. Players press A/S/D/F or tap one of four big buttons or directly tap a lane near the timing line. A note has ±290ms timing tolerance (perfect under 100ms), score and combo; wrong timing, wrong lane, or expired note costs a heart. Three lost hearts end the run; clearing 36 notes wins. Pause freezes the model; restart creates the same known intro and score 0. Notes are rendered onto a dedicated code-only Canvas and synthetic short notes are optional Web Audio oscillator output. Input keys are held by the managed session, all animation frames and optional audio shut down on close.

UX: timing line near bottom, four colored lanes, clearly separated touch targets, 1-sentence hint on ready card and secondary details control. Four lane keys support small screens without hover.

## Game B — Móc Quà (\`gap-thu-bong-dien-tu\`)

**Background source:** mechanical arcade crane operating descriptions in https://patents.google.com/patent/US6921076B1/en (accessed 2026-10-10). Rules, art, hit testing and timing here are original.

Loop: move crane on one horizontal rail, tap GẮP to descend, grip, rise and automatically deliver a gift to a tray. The player has five tries to recover all three items from one shelf. Three successive shelves shrink hit targets; a complete course wins. Running out of attempts loses. Each prize is taken only when its distance from the claw center lies within the stated target radius plus five original units; misses cost attempts. Scores include bonuses for accuracy of attempts and stage. Controls are large left/right buttons, keyboard arrows with space/enter to grab, and touch/mouse targeting directly on the machine. All motions are deterministic and frame-delta limited.

Original bears, toy machine, glass booth, crane hook, and feedback are drawn programmatically and not licensed commercial art.

## Game C — Đào Ngọc (\`boulder-dash-tho-dao-ngoc\`)

**Reference used for core puzzle concerns:** Boulder Dash official landing page https://boulder-dash.com/ (accessed 2026-10-10). The three local caves, graphics, symbols, turn-based gravity, scoring, movement cap and end conditions are intentionally original and limited-scope, not the historical real-time title or its content.

Loop: dig adjacent dirt and collect all gems; opening a cave exit requires all gems, then progression moves to the next of three author-written layouts. Each successful step advances simple falling-rock gravity once; a stone may slide diagonally when both its side cell and landing are empty. A falling stone onto the avatar loses the run. Wall collisions do not consume a step. A per-cave movement cap also enforces loss. Pushing a stone is only legal horizontally into a free cell. Supports arrows/WASD, swipe in the main canvas, adjacent-cell taps, plus 4 large direction buttons. No external sprites, audio, images or dependencies.

### Shared acceptance

- All three are still **prototype / release_ready=false**. Historic title/rights, physical phone QA, human comfort/difficulty balance, accessibility and production FPS acceptance are separate gates.
- Each game owns its own HTML subtree, Canvas and model instance. When the route changes, \`NP_GameSession\` releases listeners and RAF. No global engine or site-wide CSS has been rewritten.
- Static source includes a code-only Canvas fallback so no game depends on external fonts or artwork loading.
- Original SVG covers under \`assets/covers/\` are declared as newly authored project files in \`assets/ASSET_MANIFEST.json\`, MIT license per project; only general gameplay ideas were observed elsewhere.
- The earlier generated full-screen mockups were *concept references*, not assets shipped with these actual implementations. This report does not use them as QA screenshots.

### Reproduction and testing

\`\`\`bash
python3 -m http.server 8080
node --test tests/*.test.cjs
node scripts/release-preflight.mjs --prepare
\`\`\`

Interactive browser tests are in \`tests/browser/new-six.spec.cjs\`. A branch-scoped, nondeploying Chromium workflow in \`.github/workflows/isolated-game-batch-qa.yml\` runs the existing portal browser test suite plus three-game input/sequence tests. Real-world hardware, human playtesting, and FPS measurement require additional review; do not infer them from unit/CI results.
