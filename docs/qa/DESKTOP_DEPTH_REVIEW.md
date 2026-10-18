# Desktop game-depth batch — 18 October 2026

## Scope

The request was to leave the discovery website unchanged and improve the games themselves for desktop players, without instructional walls. This batch changes the shared game room, replaces 12 inherited wrong/shared gameplay routes with specific local mechanics, and repairs native interaction in Hàng Rong and 2048. It is **not** completion or original-release parity for all 150 games.

The homepage DOM under `#portalRoot` remains unchanged from the previous PR11 version. Shared room styling has dark, low-chrome surroundings, larger aspect-correct playfields and compact native controls. Instructions/help/related-game panels no longer occupy the game screen. Pointer cues, legal drop highlighting, visible water connections, aiming trajectories, order bubbles and in-place feedback carry onboarding inside the implemented games.

## Specific mechanisms

| Existing catalog entry | Actual implemented local scope |
| --- | --- |
| Tháp Hà Nội | Legal single-disc moves, drag/click, undo, 3–8 discs and minimum-move goal. |
| Nối ống nước | Reciprocal rotating-pipe connections, visible water reachability and solvable 5–7-wide networks. This is a rotation puzzle, not a reproduction of a timed Pipe Mania placement queue. |
| Piano Tiles | Four lanes, 50-note round, keyboard/mouse input, wrong-key and missed-tile losses. Not a licensed song campaign. |
| Dr. Mario | Dedicated 8×16 capsule bottle instead of the inherited Mario platformer route; three colours, viruses, rotation/drop, four-in-a-row removal and linked/split capsule gravity. Original level sets/timing are not claimed. |
| Solitaire | Draw-one Klondike, alternating-colour descending tableau, suit foundations, stock recycling and exact undo. |
| FreeCell | Four reserve cells and explicit run-transport capacity, foundations and undo. |
| Spider | One-suit variant, eight K-to-A runs, stock-deal constraints and undo. Not two/four-suit variants. |
| Peggle | Gravity ball, scoring pegs retained physically until shot end, orange goals and moving bucket/free-ball return. One local layout family, not the original campaign. |
| Asteroids | Thrust, inertia, rotation, wraparound, projectiles, splitting rocks, lives and waves. No ROM/arcade-parity claim. |
| Frogger | Roads, log carry, water deaths, five homes, lives and time. Local lane tuning. |
| Bubble Trouble | Real harpoon collision and bubble splitting through three sizes, gravity, lives and local stages. |
| Đập chuột | Visible first target, timed target appearances, combo/gold scoring, replay. |

Hàng Rong retains native cooking, money, ingredients, upgrades and saves. A real service bug was fixed: fractional customer IDs were truncated with `parseInt` before strict lookup. IDs are now sequential integers and read with `Number`. A real first order is immediately available. Random interruptions wait for the opening 25 seconds. Selecting a tray dish is no longer the same action as discarding it; a separate trash control is explicit. The new original SVG street scene shows actual orders and patience, highlights servable customers, and sends click/drag actions to native serving. Browser evidence checks that serving removes the dish and increases money.

2048 retains its model/undo/save contract and adds brief nonblocking tile movement. Card scenes have accurate ranks/suit pips, readable proportions and one legal-move function for click and drag. Highlighted columns accept a drop even over covered card backs; backs themselves remain non-selectable.

## Coverage limits

150 catalog entries remain. This batch contains 12 new title-specific replacements, 2 native interaction repairs and 136 entries receiving shared room treatment without a title-specific gameplay rewrite. Nine replacements remove generic fallbacks; three replace wrong aliases. **76 generic fallback entries remain**, plus other shared aliases not certified as original games. The downloadable coverage ledger distinguishes these categories.

Complete browser input rounds were demonstrated for Hanoi (3 discs/7 moves), a Pipes network and Piano's 50 notes. Pipes/Piano used read-only state to select actual inputs; no live-state setter was used. These are automated reachability checks, not human playtests or difficulty/retention measurements. Other new games have focused interactions/rules checks, not complete campaign certificates.

## Verification

Exact tested implementation commit: `1bb0aafda6a3722f0d442209dd08cf867c20e201`.
Successful real Chromium integration run: https://github.com/daichunghy/newplayground/actions/runs/39111241314

- 78/78 Node model and legacy regression tests passed.
- 61/61 existing browser check groups passed, including portal/game interactions.
- 56/56 new desktop check groups passed.
- 300/300 launch/close smoke sessions passed across all 150 catalog entries on desktop and touch-emulated mobile.
- No captured browser JavaScript errors or external network requests.
- 98 screenshots captured: 62 from existing regression and 36 from desktop-depth review.
- Desktop interaction/captures at 1440×960; additional 1366×768 desktop and 390×844 geometry checks. The last resizing checks are not physical mobile testing.

The final cleanup commit only removes temporary integration files and adds this report; the regular read-only review workflow reruns the same production code. The Actions artifacts contain the source snapshot, logs, screenshots, browser JSON and exact tested checkout.

Reproduce with `node --test tests/*.test.cjs`, then install the pinned development-only Playwright 1.56.1 browser tool and run `scripts/arcade-browser-qa.cjs` and `scripts/arcade-desktop-qa.cjs`. Both QA scripts start their own loopback static server. Production remains static vanilla HTML/CSS/JavaScript with no build step.

Browser plugin was unavailable in this conversation and local Chromium navigation was blocked by environment policy. Chromium in GitHub Actions was used for real browser evidence. No local navigation policy was bypassed.

## Provenance and references

New mechanics, card visuals and street SVG are authored in source. No commercial artwork, original game code, ROM, maps or recorded music was copied. Existing assets retain their prior manifest. The street vector layer is in `scripts/arcade-stall-scene.js`; native simulation remains in `scripts/engines.js`.

Primary GameVui pages used for interaction/rules context include https://gamevui.vn/thap-ha-noi/game and https://gamevui.vn/ban-trung/game. Search-indexed Game24h material was found at https://game24h.vn/, but direct fetches of the homepage and indexed classic-diamond game timed out or returned cache misses. No complete current Game24h visual audit is claimed.

This branch remains unmerged and undeployed. Human first-use clarity, long play sessions, full original-game comparison, every campaign, physical devices and enabled-audio listening still require acceptance. Temporary patch-integration files have been removed; the continuing review workflow is read-only.
