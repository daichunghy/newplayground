# Contra — NES North American release (1988)

## Reference and scope

- **Pinned reference:** Konami's *Contra* NES release for North America, 1988 (`NES-CT-USA`); solo play. The scan of the original [instruction booklet](https://www.digitpress.com/library/manuals/nes/Contra.pdf) is the edition identifier. Konami's [Contra Anniversary Collection title page](https://www.konami.com/games/50th/ac/contra/asia/en/) separately lists the 1988 NES port and characterizes the franchise as run-and-gun; its description of side, vertical and pseudo-3D camera changes describes the **1987 arcade original**, not the NES edition. Sources checked 2026-10-11.
- **Implemented scope:** an original three-area, side-scrolling run-and-gun browser adaptation using the catalog ID `contra-2d`. It does not reproduce the NES campaign, bosses, map geometry, weapon drops or enemy placements. All characters, terrain and effects are procedural shapes.

## Play model in this build

- **Goal and loop:** run across an area, jump over fire, crouch and aim, shoot stationed turrets and moving troopers, then destroy the large machine at the area end. The boss ends each area and opens the next; area 3 is the local win state.
- **Failure and restart:** a hit removes one of three lives and briefly protects the player. Zero lives ends the run. The `LẠI` button or `R` restarts at area 1. Pause uses `P`/Escape or `DỪNG`.
- **Movement and fire:** arrows or WASD move/aim, `↓` crouches and lowers the shot, `↑` aims high, Space jumps, and held `X`/`J` fires. Desktop buttons and Pointer Events use the same held-input model. This adaptation uses a constant-height jump and a shorter three-area campaign.
- **Stage change:** stage 2 unlocks a three-shot spread pattern in this local build; stage 3 increases boss health again. This is a progression rule chosen for the browser adaptation, not an exact NES weapon/drop table.
- **Screen and HUD:** wide 16:9 side view, parallax terrain, ground, compact score/area/lives/record at top; screen camera follows the runner. Boss health appears above its original geometric silhouette. Mobile keeps the same view and puts large controls below it.
- **Timing/AI:** simulation advances by capped elapsed seconds. Troopers close in at walking speed; turrets and boss fire aimed projectiles on cooldowns. No measured-device FPS or original cabinet timing is claimed.
- **Persistence and lifecycle:** only best score and best area are stored under `np_contra_slice_record_v1`; each launch owns its listeners and animation frame through `NP_GameSession`, with cleanup on close/replacement. Browser storage failures are caught.

## Deliberate gaps

This build is a model of run-and-gun movement, shooting, aimed enemy fire, three health-limited areas and restart, not a full Contra port. It omits the NES title/select flow, two-player co-op, weapon capsules, the original 8-stage order and scenery, the waterfall/vertical and base/corridor camera stages, original enemy/boss behavior, extra-life scoring, exact hitboxes, difficulty settings and the Konami code. The model is not evidence of mechanical parity with the NES cartridge.
