# Bể Sao — research and original scope

Date: 2026-10-07. Historical catalog ID: `nuoi-ca-nemo`; its label does not establish an exact source edition. The visible candidate is an original, short aquarium care-and-defense game. It does not claim to be licensed Insaniquarium content or an exact recreation.

## Reference evidence

- [EA — Insaniquarium](https://www.ea.com/games/insaniquarium/insaniquarium), official PC product page reviewed 2026-10-07. EA describes feeding fish and fighting aliens; it lists a Standard PC edition dated 2004.
- [PopCap / EA — Insaniquarium Deluxe on Steam](https://store.steampowered.com/app/3320/Insaniquarium_Deluxe/), official publisher store listing reviewed 2026-10-07. It identifies the Deluxe PC edition and lists 30 August 2006. The overview says fish reward coins/jewels, money buys tank upgrades or egg parts, pets can feed fish/collect rewards/protect against aliens.
- [Shockwave — Insaniquarium](https://www.shockwave.com/gamelanding/insaniquarium), official distributor page. Its indexed help text describes clicking to drop food, collect coins and buy items; the page timed out when opened in this research pass, so this input detail is limited to the indexed page text.

The catalog label does not distinguish the 2004 EA Standard listing, 2006 Steam Deluxe listing, or another release. No target-specific original manual, complete mode/level inventory or measured playthrough was reviewed. The candidate borrows only the broad aquarium-care and alien-defense archetype, not a verified set of historical rules.

## Original candidate

`sea-garden-1` keeps a single 60-second round and eight-pearl goal, split across three earned reef zones: **Rạn Nông**, **Rạn Sâu**, and **Vịnh Ngọc**. The pearl quotas are 2, 3 and 3. A new zone opens only after the current quota is automatically collected, so the player must engage with feeding to reach the later reefs. Tap water to drop food; nearby fish swim over, eat and grow. Every second meal produces a pearl that floats up and adds to the goal. Visitors gain health and arrive sooner in later zones, while fish movement speeds up slightly. Tap a visitor repeatedly to clear it before it nips a fish. Each fish survives two nips; losing all fish or reaching the timer ends the round.

The quotas add a clear short progression and the zones add a modest pressure ramp within the same care/feed/defend loop. There is no store, currency, purchase, or setup screen.

This candidate removes the reference's store, money, food upgrades, fish purchases, egg pieces, pets, mode selection and long level progression. The one interaction changes by target: empty water drops food; tapping a visitor zaps it. Keyboard Space drops food in the tank or zaps the nearest visitor. These are original design choices intended to preserve the care/feed/defend rhythm without reproducing the full economy. They are not claims about the historical game's tuning.

## Rights and assets

- Canvas fish, food, pearls, visitors, rules, CSS and `assets/sea-garden-original.svg` were made for this repository. The cover is original vector artwork; no external image, music, font or sprite source was used. The project license is MIT.
- No Pixar/Nemo character, PopCap/EA character or alien, source screenshot, code, level, music, art or interface is included.
- The legacy catalog route contains a historic third-party name; its rights are not asserted. The visible title is Bể Sao and the provenance-unverified `assets/nuoi_ca_cover.png` is excluded from the prepared site artifact.

## Local checks

- `node --test --test-concurrency=1 tests/sea-garden-model.test.cjs tests/sea-garden-ui.test.cjs`: 15 pass (9 model, 6 DOM/event-double UI).
- Model coverage includes deterministic fish/food behavior, pearl auto-collection, quota-gated reef transitions, all three alien threat profiles, a complete eight-pearl win, loss, bounds and frame partitioning. UI coverage checks the exact catalog route, pointer-fed completion across all three zones, pointer zapping, Space input, pause/restart/blur/close cleanup, optional help and touch target size.
- Canvas/audio are mocked. Real browser rendering, touch hardware, accessibility, sound quality, balance and human playtest acceptance remain pending.
