# Mầm Gió — scope and QA

Updated 2026-10-08. The visible game is original. The catalog ID `bubble-bobble-khung-long-bong-bong` remains routing metadata and does not establish permission or claim parity.

## Historical context

The official [Taito Bubble Bobble 4 Friends retrospective](https://taito.co.jp/en/BB4F/console) describes the original as a 1986 Taito arcade game and recounts its transformed-bubble-dragon rescue premise. HAMSTER’s [Arcade Archives entry](https://www.arcadearchives.com/en/title/aca-035/) independently lists 1986 as the original release year and identifies TAITO as publisher, while describing a separate later re-release. These are official retrospective/re-release sources, not an original manual or a full description of the catalog’s exact edition. No precise target build was selected or inspected; this is not a parity claim.

## Candidate scope

**Mầm Gió** is an original, solo-first platform arcade with three short garden rounds. Walk and jump across leaf platforms. Breathe a nearby Mực Rêu into a bubble, then touch the trapped bubble again to pop it for points. A trapped bubble can briefly lift the player like a platform; popping one while riding it launches Mầm upward and toward the current facing, carrying the player across a gap unless they steer against it. Three lives, score chains, pause and replay are included. Each authored wave now mixes three deterministic movement patterns: pacers hold their patrol, stalkers turn toward Mầm on the same terrace, and sprinters pursue from farther away with a short speed edge. Later gardens introduce more sprinters and more enemies; small head marks distinguish the active pursuer roles.

Controls are arrows/A-D or touch buttons to move, Up/W/Space to jump, and X/Z or Thổi bọt to trap/pop. The game starts immediately and has no shop, unlock tree, multiplayer setup or long visible instructions. Its original protagonist, moss creatures, garden layouts, Canvas art, synthesized tones and cover are not copies of Taito characters, stages, sprites or sounds.

## Rights and assets

The playable build contains no Bubble Bobble character or marks, copied story, rescue objective, stage maps, fruit rewards, sprites, music, sound recordings, screenshots or code. `assets/mam-gio-original.svg` is project-authored and recorded in the asset manifest. The historical catalog title/route and any associated trademark use remain unverified; `assets/bubble_bobble_cover.jpg` stays in source pending provenance review and is excluded from the prepared artifact.

## Automated checks

- `node --test tests/bubble-trap-model.test.cjs tests/bubble-trap-ui.test.cjs` — focused model and lifecycle regressions pass, including the directional ride-pop launch.
- Model checks cover fixed-step consistency, bubble travel/trapping/popping, score chains, temporary bubble platforms/lifts, the facing-directed spring carry, deterministic round outcomes, distinct wave decisions, reachability of each terrace with the authored jump arc, round transition and terminal states.
- DOM-double checks cover immediate play, touch/keyboard input, pause/visibility/replay, cleanup and the exact catalog route/cover.
- DOM doubles mock Canvas and audio; they do not establish real browser layout, touch behavior, accessibility, balance or playability.

## Still pending

Verify the exact historical catalog edition and its level/rule details before making parity claims. Test the stage art, jump/bubble timing, keyboard focus, touch input and synthesized audio in real browsers and on devices; conduct an accessibility and novice playtest. Review legacy title/route rights before public release. The current game remains a local integration checkpoint; no public push or deployment has been performed.
