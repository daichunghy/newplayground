# Đua Gió: reference research, scope, and implementation notes

Research date: 2026-10-08 UTC. The deeper-campaign iteration is on `codex/dua-gio-campaign-20261008`, based on local checkpoint `9558fd75a9c5b75166bf0e8d58ea1e81e7f4b0d8`.

**Status: original three-race cup implemented locally.** It keeps the instant race start and adds three authored courses, rising rival pace/hazard density, sequential qualification, replay, place records and a small local progress save. A visual-feel pass now follows the OS reduced-motion preference, including live changes: road bends/dashes no longer scroll decoratively, rider banking and impact rings are suppressed, and hazards still approach as required for play. The pause control announces its current state; driving buttons retain 48px targets and stage selectors are 44px tall. Focused model/UI-double tests pass. Real-browser/device playtesting, balance review, screen-reader checks and release review remain open. This is not a licensed game or a claim of exact historical parity.

## Reference version and evidence

The selected reference is **the 1991 Electronic Arts Road Rash for the North American Sega Genesis/Mega Drive**, using its three-button Genesis manual. This identifies a specific platform/manual instead of blending rules across the 1991 original, 1992 sequel, and later ports.

| Source | Use and limit |
| --- | --- |
| [North American Genesis manual scan, Road Rash (©1991 EA)](https://segaretro.org/images/9/99/Road_Rash_MD_US_Manual.pdf), especially pp. 9–19 | Primary historical rules source. The manual describes the 15-rider field, steering/acceleration/braking, nearest-rider attack, kick/backhand inputs, club timing, racer stamina and bike damage, finish qualification, crash recovery, track hazards, police, winnings, and bike purchases. The linked copy is a scan hosted by a preservation site, not an EA-hosted file. |
| [EA: A Tribute to Racing Games](https://www.ea.com/amp/news/firemonkeys-drawing-club) | Publisher-authored retrospective identifies the original as first published in 1991 and broadly characterizes motorcycle racing and biker combat. It does not supply detailed rules. |
| [Road Rash II Genesis manual](https://segaretro.org/images/b/b0/Road_Rash_2_MD_US_Manual.pdf) | Cross-check only. The sequel has details such as chains and nitro and a later qualification threshold; these are not assigned to the selected original. |
| [Road Rash 3DO manual](https://www.digitpress.com/library/manuals/3do/road_rash.pdf) | Cross-check only. This later 3DO version uses a top-three advancement threshold, illustrating why the unqualified catalog phrase “1991/1995” is ambiguous. |
| [MobyGames Genesis release record](https://www.mobygames.com/game/353/road-rash/) | Secondary corroboration for the Genesis release record and single-player/alternating multiplayer context. The manual remains the rules source. |

The repository's older master spec groups “1991/1995” and the backlog names the title as “Road Rash,” but neither pins a target build. The Genesis manual is copyright-dated 1991 and is the selected comparison target. I did not establish what exact release or port the “1995” reference intended, and did not treat it as a rule source. The 1991 manual's advancement rule is **4th or better** in a 15-rider race; later sources use different thresholds. The candidate uses four riders, so it needs a narrower, explicitly original win rule.

No executable or live historical build was played or frame-measured. Numeric tuning below is authored for this candidate, not copied or measured from the reference. No copyrighted game assets, text, maps, sounds, code, screenshots, logos, characters, or named opponents were used.

## Candidate rules and controls

- One player and three computer riders race on three short original roads: Bãi Cát (720 m, five hazards), Đèo Mây (780 m, seven hazards), and Dốc Đỏ (840 m, eight hazards). Each route has a different road curve, palette, hazard sequence and faster rival pace. The motorcycle is already moving at launch; there is no title card or countdown.
- Hold Up / W / Ga to accelerate. Hold Down / S / Phanh to brake. Hold Left / A or Right / D to steer. Space or the Tạt button triggers one side-check.
- The side-check selects the nearest eligible rider within 24 m and 0.34 lane units. A hit slows that rider for 1.45 seconds; each attempt has a 0.72-second cooldown. A miss has no damage or resource cost.
- Hazards have authored lanes and distances, and render ahead of the bike. Crossing one in its lane costs one impact and slows the player; the third impact ends that race. The course lengths, hazard positions and hit boxes are authored choices.
- Finishing in the first three qualifies for the next route; arriving fourth or taking three impacts loses the race. The HUD shows current place and remaining impacts. There are no upgrades, currency or bike-selection menus.
- Pause stops the animation loop. Window blur, hidden-tab, and page-hide events pause and clear held controls. The next unlocked route, best place and fastest completed time per course save locally; the active race itself does not resume. Players can replay any unlocked course.

## Selected reference loop and deliberate departures

| 1991 Genesis manual | Đua Gió candidate |
| --- | --- |
| Race a 15-rider field; place 4th or better to qualify on each of five tracks, across five levels. | Three original courses with four total riders; first three qualify. This compressed cup retains route-to-route progression without copying track layouts or a franchise campaign. |
| Accelerate, brake, steer, and attack the nearest adjacent racer. Punch, kick, backhand, and a timed club grab are described. | One original side-check action. It temporarily slows a nearby rival; it does not knock riders off, steal a club, or model rider stamina. |
| Separate racer stamina and bike-damage meters; falls, run-back time, motor officers, fines, winnings, and bike purchases create campaign risk/progression. | Each short race has a three-impact limit and finish placement; a top-three result unlocks the next course. There is no run-back, police, fine, money, bike selection, upgrade tree or online mode. |
| Road traffic and surface/debris hazards vary across multiple named tracks. | Five, seven and eight static, previewed traffic/barrier placements across three original roads. No copied track layout or named location. |
| Original-era view, characters, music, names, and audiovisual presentation. | Project-authored canvas geometry, dune/mist/ember palettes, increasingly curved scenery, generic unbranded bikes, hills, cars and barriers; no third-party art or audio. |

The title **Đua Gió**, art, three track curves, opponent pacing, hazard placements, movement constants, attack range/cooldown/effect, four-rider field and top-three rule are new design decisions. The manual supports the broad race-plus-close-combat loop, not these exact values. The manual's 4th-place qualification becomes top-three in a four-rider cup as a deliberate, compressed design choice. The design keeps the recognizable race-and-melee rhythm without sequel-only chains/nitro or a progression economy.

## Files, tests, and remaining checks

Owned game-specific files only:

- `scripts/games/road-duel-model.js` — fixed-step deterministic model, three course datasets, rivals, road hazards, live/finish ranking, cup unlocks, best-place/time records and local progress validation.
- `scripts/games/road-duel.js` — responsive canvas view with hand-drawn original bike shapes, a perspective road, visible hazards ahead, player lean and impact feedback; concise place/course/time HUD; held keyboard/pointer controls; course replay/selection; safe local progress recovery; pause; reduced-motion rendering; and teardown.
- `scripts/games/road-duel.css` — responsive original game styling.
- `tests/road-duel-model.test.cjs` — deterministic controls, melee, collisions, finish/win/loss/replay.
- `tests/road-duel-ui.test.cjs` — DOM-double immediate launch, input, pause/resume, visibility, live reduced-motion preference changes, replay, and repeated lifecycle cleanup.

Verification run in the local campaign worktree:

- `node --check scripts/games/road-duel-model.js` — passed.
- `node --check scripts/games/road-duel.js` — passed.
- `node --test --test-concurrency=1 tests/road-duel-*.test.cjs` — **23 passed** (14 model, 9 DOM/session-double). Determinism was compared on all three courses across 30, 60, 120 and 144 Hz render rates. A deterministic steering-only route qualifies all courses without impact; a full-throttle/no-steering run gets one impact and first place on Bãi Cát at 22.697 s, two impacts and second place on Đèo Mây at 24.996 s, then takes three impacts and loses on Dốc Đỏ at 662/840 m. The same full-throttle, steering-only policy clears the three routes without impacts in 22.215, 24.034 and 25.852 s, taking first place each time. Best times persist beside each course's best place. This model comparison shows that steering improves the result under these authored settings; it does not establish human difficulty balance. Cup tests cover top-three unlock, replay, live place, best place/time saves after finishes and loss records. The UI input flow races a full route, replays a cleared course, saves the next unlocked route and resumes there; corrupt progress is backed up and unknown future saves are preserved in the UI harness. Reduced-motion tests cover the live preference, static decorative road motion and disabled banking/impact animation; they do not replace browser/device visual testing.

Not verified: real browser rendering, keyboard focus in the portal modal, touch behavior on a physical device, performance/frame pacing outside deterministic doubles, visual legibility at small sizes, screen-reader behavior, and human balance/playability. The full shared suite and static release preflight have not been rerun for this campaign change. No publishing, push, or deployment was performed.

## Integration handoff

The base checkpoint already loads `window.NP_RoadDuelModel` before the view, links `road-duel.css`, and routes the legacy `road-rash-dua-xe-moto` ID to **Đua Gió** through the shared session lifecycle. This branch changes the game module, its tests and research/operations evidence, and bumps the stylesheet/model/view cache query to `20261008_rd4`. The original SVG cover replaces the unverified branded cover in the game map, and the old image is excluded from the prepared static artifact. Historical title/route rights are still unverified; browser/device play has not been performed. This is a local branch with no push or publication.
