# Independent 20-game implementation scope — 2026-10-11

Working branch: `feat/twenty-distinct-games-20261011`. Source baseline: main `75f745c8dcb17253fa5751c8d8302930e57f4826`. This branch must not merge or deploy itself.

## Coordination

PRs #1–#4 and their current branches were inspected before selection. Their games are excluded. Main currently exposes many catalog entries through shared archetypes; replacing one of those with an independent model is not a claim that its historical commercial title has been reproduced. Stable catalog IDs are retained, with original visible identities, levels and artwork. Assets from the referenced commercial games are not copied.

Only `app.js` (exact-route priority, exact-ID metadata/cover lookup) and `index.html` (stylesheet and script includes) require shared integration edits. Game code, scoped styles, assets, tests and evidence stay under the `new-wave` namespace. Do not refactor the global router or overwrite concurrent engines.

## Reserved catalog IDs and distinct core interactions

Batch 1
- `asteroids-tau-ban-thien-thach`: inertial toroidal ship flight and fragmenting rocks.
- `frogger-ech-bang-qua-duong`: discrete road timing, moving river supports and five individual homes.
- `hamsterball-lan-cau-hamster`: continuous marble inertia, braking, narrow courses and checkpoints.

Batch 2
- `bong-bong-nuoc-bubble-trouble`: vertical harpoons splitting gravity-driven bouncing spheres.
- `lua-va-nuoc`: alternating two characters with complementary hazards and cooperative mechanisms.
- `excitebike-dua-xe-dia-hinh`: throttle, heat and airborne bicycle balance over authored terrain.

Batch 3
- `co-ca-ngua`: dice, deployment, capture and exact home entry against a local opponent.
- `tien-len-mien-nam`: legal card combinations, passing, trick control and hand shedding.
- `pizza-frenzy`: dispatch and delivery routing with kitchen capacity and customer deadlines.

Batch 4
- `defend-your-castle-thu-thanh-nguoi-que`: grab-and-throw physics against advancing waves.
- `snowcraft-nem-tuyet-3v3`: small-squad movement, cover and charged snowball exchanges.
- `mappy-chuot-canh-sat-nhay-bat`: trampoline-floor timing, doors and paired-object collection.

Batch 5
- `chuzzle`: cyclic whole-row/column matching rather than adjacent-tile swapping.
- `centipede-ban-sau-ret`: segmented enemies, obstacle-driven descent and constrained player movement.
- `balloon-fight-dap-bong-bay`: flapping buoyancy and altitude-dependent balloon duels.

Batch 6
- `dig-dug-dao-dat-bom-quai`: digging tunnels, sustained inflation and falling-rock threats.
- `dau-truong-xe-dung`: steering and collision-angle vehicle arena combat.
- `co-ty-phu-monopoly`: a finite original purchase/rent/development economy.

Batch 7
- `papa-pizzeria-tiem-banh-pizza`: topping placement, baking and cutting quality, not delivery routing.
- `icy-tower-thap-bang-nhay-cao`: momentum jumps, wall rebounds and a rising vertical course.

## Status at this coordination commit

The first three are implemented in the isolated local working copy, with 51/51 combined Node tests passing. Whole campaigns were played through actual Chromium keyboard or pointer handlers, followed by losses, retry and restart checks. Six local smoke passes cover standalone and portal routes, pause/help, 320px resize and cleanup. Source injection was required because sandbox navigation to localhost is blocked. This does not verify real HTTP origin/cache behavior or physical iOS/Android input. The implementation and reproducible tests are being committed separately; this document alone does not constitute delivery or acceptance of any game.

The remaining 17 are reserved implementation candidates, not completed games. Advance only after each three-game batch has its own gameplay evidence. All counts in subsequent QA reports must distinguish authored models, browser-tested campaigns, and production acceptance. No 60 fps claim is made without measured frame samples.
