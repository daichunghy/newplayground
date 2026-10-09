# Rắn Săn Mồi: research and candidate scope

Updated 7 October 2026. Catalog ID: `ran-san-moi-snake`. Candidate build: `garden-snake-1`, branch `codex/ran-san-moi-snake-candidate-20261007`, initially developed on a separate work branch from integration checkpoint `d85e52faccdb0f3142461ff87c6f9f3197afcaba`, then integrated locally as an original, rights-conscious Snake candidate. It is not a replica claim.

## Reference and evidence

Selected recognizable reference: the single-player Snake supplied with the Nokia 6110, documented in Nokia's 1998 English user guide. The guide's game instructions say to feed the snake goodies; its tail length raises the score; collision with its tail or the surrounding wall ends the game. It also identifies directional keypad input and a pause/continue flow. The scan is hosted by a third-party manual archive, while the guide itself identifies Nokia Mobile Phones as its 1998 copyright holder. Read pages 50–51 of the guide; no manual text, screen art, code, sounds or device imagery is included in this candidate.

- [Nokia 6110 User's Guide, 1998 scan (PDF)](https://altehandys.de/downloads/man-no-6110.pdf) — primary rules source; third-party hosting, pages 50–51.
- [Yle Elävä arkisto: history of the mobile Snake](https://yle.fi/a/20-174095) — Finnish public broadcaster; reports that Taneli Armanto made the mobile version, first shipped on the Nokia 6110 in 1997, and distinguishes later Snake II features such as barriers.
- [Taneli Armanto, creator's account of Nokia Snake](https://taneliarmanto.com/nokia-snake) — primary creator account describing his Nokia 6110 implementation and its historical context. Used for identification only; the site is not an asset or code source.

Evidence level is `source-reviewed` as of 7 October 2026. No original game binary/firmware, complete playthrough, frame capture, measured handset timing, or input-to-display latency was available for this work. The chosen reference is the 6110 single-player edition, not Snake II, a later Nokia handset variant, or a modern browser remake.

## What remains unidentified

The available sources do not identify the exact binary/build or localization shipped on a particular 6110 handset; board dimensions and cell size; initial length and placement; the exact food appearance, spawn algorithm, points per item, or collision/edge timing; speed settings and their values; whether the board can be filled or what happens then; and the title screen, animation, sound, or complete key mapping. These details remain `pending`; no values below are attributed to Nokia's game. Rights to reuse the historical title, Nokia marks, device trade dress, original code, screenshots, sprites and sounds are not established by the cited history/manual. The shared catalog badge and tagline were changed to generic candidate wording; exact historical title and route rights remain unresolved.

## Candidate chosen

One player, endless turn-grid movement, short start: the board is visible immediately and the first directional input starts a run. On an 18 × 14 garden board, steer a three-segment snake, eat a seed-fruit for 10 points and one added segment, and avoid the walls and your own body. A non-eating move may enter the cell the tail vacates on that move. The run ends on wall/self collision; filling every cell is a candidate win state. Food spawns only in a free cell. There is no wraparound, power-up, shop, upgrade, campaign, multiplayer, or long tutorial.

The candidate's compact board, green garden treatment, rounded snake, seed-fruit, score rules, starting length, win-on-fill result and pacing are new design choices. Tile movement begins at 180 ms and speeds up by 14 ms after each five foods, to a 90 ms floor. The candidate adds this pacing for short rounds; the reference source does not verify those values. It shows score, length, best score and pace live. Best score is stored locally under a new game-specific key; the active run is not saved.

Keyboard arrows/WASD and four large touch direction buttons are supported. A two-turn queue preserves quick cornering; reverse turns are rejected. Pause/resume and new-round controls are local and immediate. Blur, hidden-tab and pagehide events pause the run and require deliberate resume. The static board and controls avoid a dependency on sound or external files.

## Art and rights provenance

The title in the play surface is `Rắn Săn Mồi`; `VƯỜN UỐN LƯỢN` identifies this candidate's original garden direction. Board cells, snake segments, eyes and fruit are CSS geometry authored for this project. The separate catalog cover is an original SVG composition. There is no borrowed handset frame, green monochrome-screen simulation, Nokia mark or Nokia screenshot. The provenance-unverified legacy `assets/snake_cover.png` is excluded from the prepared artifact. Both the SVG card art and the CSS-drawn play surface are listed as project-authored work in the asset manifest. This record does not resolve rights to the catalog's legacy badge, tagline, historical title, or any future artwork.

## State and lifecycle

`ready → running → lost | won` is the model state machine. The RAF view uses a fixed movement accumulator independent of render frequency, caps catch-up after an interruption, and is owned by `NP_GameSession`. Pausing is view state over a running model. The model is deterministic for a given seed, keeps random food on empty cells, and exposes validated initial-state fixtures for focused tests. `localStorage` stores only the high score; corrupt, unavailable, or quota-limited storage does not block play. Every global listener and animation frame is session-owned and removed on close.

## Acceptance still required

Automated model and DOM-double checks pass; they are not browser acceptance. Shared exact-ID route/CSS wiring and regression checks are complete locally. Still pending: visual review at 320/360/390/768 px and desktop; real keyboard/touch use and resize; screen reader, high contrast and zoom; browser frame pacing and input latency; interruption/close/reopen checks in a real browser; a short new-player playtest and pace tuning; title/route rights review. Do not mark this candidate accepted or reference-complete before those gates.
