# Candidate 39: Mầm Gió

Original solo-first bubble-trap platform arcade for the NewPlayground catalog work item `bubble-bobble-khung-long-bong-bong`.

## Playable scope

- Move across three hand-authored garden rounds, jump onto leaf-and-reed terraces, and avoid the approaching Mực Rêu.
- Face a nearby threat and press X or “Thổi bọt”. A drifting trap bubble can be popped with the same action for 300 points; quick pops build a score chain.
- Trapped bubbles can hold the player as temporary platforms. Jump from them to climb, or pop one while riding it for a springing lift.
- Three lives, a short retry loop, no account, shop, unlock tree, or multiplayer menu.
- Desktop: ←/→ or A/D to move, ↑/W/Space to jump, X/Z to blow or pop, P/Esc to pause.
- Touch: hold the left/right buttons; tap Nhảy and Thổi bọt.

## Historical context and limits

The registry does not identify a specific edition, platform, or revision for this catalog entry. The research therefore uses only broad historical context; it does not treat a modern build as the target specification.

- Taito’s [Bubble Bobble 4 Friends retrospective](https://taito.co.jp/en/BB4F/console) says the original was a Taito arcade game planned, developed, and sold in 1986. It recounts the original transformed-bubble-dragon rescue premise. This is a modern official retrospective, not an original manual or an archival 1986 release record.
- HAMSTER’s [Arcade Archives Bubble Bobble page](https://www.arcadearchives.com/en/title/aca-035/) lists 1986 as the original release year and TAITO as publisher. It describes the later Arcade Archives edition, so its platform and release dates describe that re-release.

The candidate does not use the series’ named characters, story, rescue objective, stage maps, fruit rewards, sprites, marks, music, sound recordings, source code, or screenshots. Mầm Gió, Mực Rêu, all three layouts, canvas illustrations, vector cover, and synthesized sound notes are original project work. This is a small related-mechanic interpretation, not a parity claim.

The historic catalog ID/route and old title/name rights remain unresolved. The shared app now maps that route to Mầm Gió with the original cover; it does not present the candidate as an authorized sequel/remake, and the unverified old cover is excluded from the prepared artifact. The playable title and artwork are original.

## Verification status

- Deterministic model tests and DOM-double UI/input/lifecycle tests are included under `tests/`.
- Run with `node --test --test-concurrency=1 tests/bubble-trap-model.test.cjs tests/bubble-trap-ui.test.cjs`.
- The DOM double mocks canvas and audio. Real-browser rendering, keyboard/touch behavior on devices, balance, novice playtest, accessibility review, and release/title/route rights review remain pending.

## Integration handoff

The engine is exposed as `window.NP_BubbleTrap.mount(container, session, audio)` and its model as `window.NP_BubbleTrapModel`. The candidate is integrated locally through the legacy catalog ID, using the original cover and shared session lifecycle. Release, browser/device acceptance, historical title/route rights and parity remain unresolved.

Open `candidates/mam-gio-bubble-trap/index.html` through a local static server for an isolated playable preview; it loads only the candidate modules.
