# Ống Nghiệm: research, rules and QA

Reviewed 2026-10-08 UTC. Candidate build: `ong-nghiem-original-2`. Catalog ID: `dr-mario-diet-khuan`.

## Reference scope

Nintendo's hosted English instruction manual for the original 1990 NES **Dr. Mario** says to rotate falling capsules and align four or more capsule halves and viruses of the same color in horizontal or vertical lines. It documents two-colored capsule halves and removing both capsule pieces and matching viruses. Nintendo's **Dr. Mario: Miracle Cure** manual describes the shared basic objective, but that is a later edition. The NewPlayground catalog row does not identify its platform or release, so this candidate uses only the broad original loop and makes no exact edition or franchise-parity claim.

- Nintendo, [Dr. Mario (NES) instruction manual](https://www.nintendo.co.jp/clv/manuals/en/pdf/CLV-P-NAAXE_en.pdf), reviewed 2026-10-08.
- Nintendo, [Dr. Mario: Miracle Cure instruction manual](https://csassets.nintendo.com/noaext/image/private/t_KA_PDF/manual-3DS-dr-mario-miracle-cure-en?_a=DATC1RAAZAA0), reviewed 2026-10-08, used only to corroborate shared match-four rules.
- Nintendo, [Game Boy Dr. Mario product page](https://www.nintendo.com/en-gb/Games/Game-Boy/Dr-Mario-275583.html), reviewed 2026-10-08, used for a broad one-player falling-capsule loop, not the target edition.

## Chosen candidate rules

- Play a compact four-bottle, 8×16 campaign. Each bottle has a fixed germ layout and capsule queue, and replay starts from the same state. The sequence teaches a direct horizontal clear, a vertical clear, a planned unmatched-half fall, then an automatic cascade.
- Each two-part capsule falls through one-cell movement. Move left/right, rotate, soft-drop or hard-drop; two halves can have the same or different colors.
- Four or more same-color capsule halves and/or germs in a straight horizontal or vertical line clear together. Germs stay fixed; capsule halves above a cleared space fall. Chain clears resolve automatically.
- Clear every germ in a bottle to unlock the next one. A blocked spawn or exhausted authored queue with germs remaining loses; restart and replay return to the same board and queue. The unlocked bottle count is versioned in local storage; malformed data is preserved for recovery, future schemas are left intact, and read/write failures never stop play.
- No doctor/character art, medicine branding, franchise logo, score economy, timer, upgrade tree, shop, account, or additional mode.

The grid, capsule colors/shapes, germ count and layout, gravity delay, sequence length, title, interface and visual art are project choices. This is not a rebuild of Nintendo's presentation or a claim that the historic catalog item was an NES or Game Boy build.

## Original work and provenance

The name **Ống Nghiệm**, SVG cover, germs, capsule halves, board, CSS, code, and control labels were created for this candidate. Local integration adds `assets/ong-nghiem-original.svg` to the shared manifest and asset register; the isolated candidate source retains its own cover.

## Automated checks

Run with low concurrency:

```text
node --test --test-concurrency=1 tests/test-tube-model.test.cjs tests/test-tube-campaign.test.cjs tests/test-tube-ui.test.cjs
```

Result: 8 model, 3 campaign, and 6 DOM-double UI/lifecycle tests pass. Legal routes clear all four authored bottles and assert the intended horizontal, vertical, falling-half, and two-clear cascade events. Coverage also includes ordered unlocks, locked-bottle rejection, deterministic replay, save/reload, malformed/future-schema recovery, failed saves, gravity-triggered unlocks, controls, focus, and cleanup. These checks establish legal solutions, not human difficulty acceptance.

DOM doubles do not verify real rendering or device input. Browser/device, screen reader, visual contrast, motion/feel, level difficulty, novice playtest, historical route/title clearance and release acceptance remain pending.

## Lifecycle re-audit — 2026-10-08

Hidden-tab changes now cancel the gravity frame and reset its time baseline. Visibility return schedules one fresh frame only while a capsule is active, and a window-focus event cannot restart gravity while the document is hidden. Targeted `test-tube-ui.test.cjs` regressions verify hidden suspension, focus while hidden, visible resume, and no gravity frame after a terminal result; the final Ống Nghiệm UI suite passed 8/8, and the 12-game UI batch had passed 134/134 before the terminal-result guard was added. This remains DOM-double evidence, not device QA.
