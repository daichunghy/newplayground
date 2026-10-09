# Khối Sắc — research and scope

- **Internal catalog key:** `khoi-rubik-mini`
- **Display name:** Khối Sắc
- **Game type:** original casual rotating-block pattern puzzle

## Original play loop

Khối Sắc uses a legal 2×2×2 outer-face-turn state model as the control system for an original pattern-routing campaign. The goal is **not** to restore six uniform faces. Each short stage shows an authored signal motif on a subset of faces. Turn any of the six faces to arrange the requested sticker patterns; the other faces may remain mixed. Three stages ask for one, two, then three face motifs. Each stage has a displayed move budget (10, 15, 20 turns), and the whole run has a two-minute clock. Matching the last motif wins; exhausting a stage budget or the campaign clock loses. Replay restarts the same seeded campaign.

Stage targets are fixed patterns derived from short legal turn sequences. Each face row below is ordered top-left, top-right, bottom-left, bottom-right; the letters identify the colors of the six reference faces. Start sequences are seeded and have 4, 6, and 8 turns respectively. The constructive route that reverses the start sequence and applies the target sequence is an answerability witness; the listed move budget leaves extra turns beyond that route.

| Stage | Motif target | Move budget |
| --- | --- | ---: |
| 1 · Đốm Sáng | U: `U U / U R` | 10 |
| 2 · Cầu Sáng | U: `U U / U R`; F: `R D / L F` | 15 |
| 3 · Vệt Quỹ Đạo | U: `D R / L D`; F: `U L / U F`; R: `B B / R F` | 20 |

The board uses six independently labeled face windows rather than a conventional cube net. The palette and geometric sticker marks are original CSS; there are no third-party images, logos, copied art, or imported puzzle layouts. Keyboard `U D F B R L` turns a face clockwise; holding Shift applies the inverse turn. The twelve touch buttons provide the same turns with at least 44px targets. `P` or Escape pauses. The model freezes while paused.

## Model and lifecycle

The model stores 24 stickers on eight corner positions. Every sticker tracks its original face color, integer 3D position, and outward normal. A face turn rotates both the position and normal of the four corners in that outer layer, so turns remain legal and reachable from the solved state. It supports clockwise, counter-clockwise, and half turns; deterministic seeded start sequences make every replay reproducible. Stage target patterns are built from legal turn sequences and are checked independently of full-cube solved state.

The UI schedules only one animation frame at a time for the campaign clock. `NP_GameSession` owns its frame, keyboard and lifecycle listeners, and teardown callback. Pause, loss, win, visibility changes, and route cleanup stop or suspend updates; closing the game removes its DOM and listeners.

## WCA material used

The [WCA Regulations](https://www.worldcubeassociation.org/regulations/) are the only external rules source consulted. The implementation borrows only the general face-turn convention from Article 12a1: outer faces `F`, `B`, `R`, `L`, `U`, and `D` turn clockwise by 90°, with prime notation for the inverse and `2` for a half turn. Article 3a3 and 3d2 inform the use of one uniform, distinct color per face in the reference solved state. The game uses its own palette and labels.

This is a casual original puzzle, not official competition software. Its campaign starts are deterministic seeded teaching states, not official WCA random-state scrambles; they do not claim WCA scramble distribution, minimum distance, timing, judging, or results compliance. In particular, the WCA’s competition scramble rules require official scramble generation and a 2×2×2 state at least four moves from solved (Article 4b and 4b3b). Those competition requirements are not represented by this game.

## Acceptance checks

- All six clockwise turns have correct inverse turns; four quarter-turns return to the same state; half-turns equal two quarter-turns.
- Seeded stages are repeatable, remain in the legal 2×2×2 state space, and do not start with the target pattern already matched.
- Each stage has an explicit target, face subset, and move cap. Tests apply a constructive route from each seeded start to the requested pattern and confirm it fits the cap.
- Matching all three motifs wins; campaign timeout and move exhaustion lose; restart/replay returns to the same first stage and start state.
- UI tests cover all face controls, keyboard turns, pause/resume, document visibility, terminal overlays, replay, and `NP_GameSession` cleanup.

## Source reviewed

- World Cube Association, [WCA Regulations](https://www.worldcubeassociation.org/regulations/) (current page consulted 2026-10-09): Article 3a3 and 3d2 for distinct uniform face colors; Article 12a1a–c for face turn direction and turn size; Article 4b and 4b3b only to draw the boundary between this casual seeded campaign and official competition scrambles.
