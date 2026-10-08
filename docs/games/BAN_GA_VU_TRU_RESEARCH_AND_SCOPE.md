# Tuyến Sáng — reference research and original scope

Reviewed 8 October 2026. This original candidate is integrated locally under catalog ID `ban-ga-vu-tru`, developed from integration checkpoint `b928d39c9ff7cfe5735efb8aa094ea3215ad5f86`. It is not an edition-accurate remake or a claim of affiliation.

## Reference research and edition uncertainty

- [InterAction studios — Chicken Invaders 5](https://www.interactionstudios.com/chickeninvaders5.php), official developer page reviewed 8 October 2026. It describes a large, long-form release with cooperative play, many enemy appearances, 120 waves, multiple systems, weapons, bonuses and bosses. This page identifies CI5 specifically; it does not establish which edition the catalog entry intends.
- [Steam — Chicken Invaders 5 announcements](https://steamcommunity.com/app/353090/announcements/), official game announcements reviewed 8 October 2026. The 9 January 2025 announcement distinguishes the original game from a separate Episode launch option, with remastered 16:9 graphics, reworked weapons, a new engine, seasonal content and Endless mode. The original format remains available. “Chicken Invaders” alone therefore does not identify a single build or ruleset.
- [Bandai Namco — Galaxian history and how to play](https://galaga.com/en/history/galaxian.php), official publisher page reviewed 8 October 2026. Its broad arcade-shooter loop is left/right movement, firing at approaching formations, avoiding hits, earning score, clearing a short stage, and losing when the ship's lives are gone. This is used only to ground the genre loop, not to copy a specific encounter or visual design.

The catalog entry is titled “Bắn Gà Vũ Trụ (Chicken Invaders)” and summarizes a ship dodging falling eggs and collecting drumsticks to strengthen shots. It does not name a version, edition, platform build, or reference link. No exact version can be selected from the available brief. The candidate consequently preserves only the generic move, shoot, dodge and score loop. It makes no claims about parity with any Chicken Invaders release.

## Original candidate scope

`Tuyến Sáng` is a one-player, 60-second arcade run. Move the ship left and right, hold fire to send a simple beam, and avoid slowly drifting faceted lights and aimed orange bolts. Clearing a drifter adds 100 points. Three hull hits end the run; reaching zero seconds completes it. Pause and replay are available throughout. The interface starts in play immediately.

The release scope deliberately omits multiplayer, chickens, eggs, food collectibles, weapon levels, pickups, named enemies, scripted waves, bosses, levels, cutscenes and a campaign. These are original prototype decisions, not descriptions of the unverified source edition.

## Originality, assets and rights status

- Rules, canvas illustrations, CSS and `assets/ban_ga_vu_tru_original.svg` were authored for this candidate. The cover is original vector art. No external art, image, screenshot, music, sound, logo, font or code was used.
- The visible game title and all enemy labels are original. Its project-authored SVG cover is registered in the shared asset manifest. It contains no Chicken Invaders characters, enemy designs, wave names, level layouts, music, logos or source code.
- The catalog title/route and third-party brand rights have not been reviewed or accepted. Distribution-rights acceptance remains pending; this candidate does not assert a license or affiliation.

## Focused local checks

- `node --test --test-concurrency=1 tests/ban-ga-vu-tru-model.test.cjs tests/ban-ga-vu-tru-ui.test.cjs`: 9 passed (5 deterministic model tests and 4 DOM/event-double UI lifecycle tests).
- `node --check scripts/games/ban-ga-vu-tru-model.js` and `node --check scripts/games/ban-ga-vu-tru.js`: passed.
- The SVG cover parses as valid XML; `git diff --check` passes.
- The exact catalog route and original cover are wired locally. The DOM and Canvas doubles are not browser QA. No real browser, touch device, accessibility audit, balance review or human playtest was completed. Browser/device acceptance remains pending.
