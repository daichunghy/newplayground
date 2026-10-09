# Gió Ngang — research and original scope

Date: 2026-10-07. Historical catalog ID: `gunny-2d`. This candidate uses original rules presentation, code, terrain and art. It does not claim to be a licensed Gunny build or an exact recreation.

## Reference evidence

- [Gunny PC — Cách bắn](https://gunnypc.vnggames.com/thuvien/tieu-hoc/cach-ban.html), official VNG/7Road guide, reviewed 2026-10-07. The guide describes moving with left/right, changing angle with up/down, and holding Space to build shot power before release. This is a current Gunny PC guide; it does not identify or verify the historical `gunny-2d` catalog build.
- [Gunny PC — Chiến đấu](https://gunnypc.vnggames.com/huong-dan/cap-2/chien-dau.html), official guide, reviewed 2026-10-07. It describes creating a match room and choosing free-for-all or guild battle, including single/team matching. This confirms that the current reference is a multiplayer service, not the single-player candidate below.

No target-specific historic build, rulebook, terrain list, weapon/item table, progression, or recorded playthrough was located. The reference research is therefore limited to high-level aiming, movement, charging and match structure. Do not infer exact old-edition rules from the current service.

## Original candidate

`wind-duel-1` is a short, deterministic, single-player coordinate-artillery duel. Use the angle and power controls to send a projectile across a generated hillside. Wind bends each shot, gravity pulls it down, and impacts reshape the ground. Move a little between turns; land three hits to win before the opposing cart does. The CPU selects a reproducible shot from the same public terrain and wind conditions.

The authored candidate intentionally changes the current reference: one human versus one CPU replaces room-based multiplayer; an angle slider and rising power meter with hold/release firing keep the basic aim-and-charge loop, while a direct click/Enter fires at the default power for accessible activation. Original carts, terrain and a three-hit score replace unverified characters, weapons, levels and items. It omits guilds, teams, accounts, purchases, inventory, powerups and long progression. These choices are candidate design, not facts about the historical title.

## Rights and assets

- Canvas drawing, rules code, CSS and `assets/wind-duel-original.svg` were authored for this repository. The cover has no external image source. The project license is MIT.
- No VNG/7Road source code, art, character names, maps, sound, fonts, weapon names, screenshots or stage layouts are included.
- The historical route/catalog label remains unresolved for distribution. The unverified `assets/gunny_cover.png` is excluded from the prepared site artifact. No trademark or licensing permission is asserted.

## Local verification

- `node --test tests/wind-duel-model.test.cjs tests/wind-duel-ui.test.cjs`: 20 pass after fixing a return-turn loop in the UI test and adding the hold-to-charge/release interaction.
- The model tests cover seeded terrain/wind, movement bounds, aim/power locks, projectile arc, direct and blast damage, terrain deformation, player and CPU turns, win/loss, fixed-step determinism and invalid inputs.
- DOM/event-double coverage checks the historical route opens the original game, angle and visible charge meter, pointer and keyboard hold/release, accessible direct-click fire, pointer cancel, turn lock, pause/resume/restart, blur and close cleanup, help disclosure and cover exclusion.
- These are automated tests, not real-browser rendering, accessibility audit, touch-device QA, sound review or human playtest. Those acceptance gates remain pending.
