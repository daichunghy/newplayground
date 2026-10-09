# Interactive game playtest — 9 October 2026

## Setup

Local Chromium 151, 390 × 844 mobile viewport with touch emulation, and the locally prepared static site. The guided routes and random Bookworm board were seeded where repeatability mattered. This is browser-based playtesting, not physical-device acceptance.

## Playthroughs

1. **Vực Ngọc — swing and retrieve:** resumed an in-progress probe aimed at nearby sea glass, launched with a tap, and reeled it in for 240 points. Tested both cancel and confirm on restart; cancel preserved the session and confirm restored stage 1 at zero score. [Retrieved glass](gameplay-playtest-20261009/01-vuc-ngoc-haul.png)
2. **Cờ Tướng — legal move and opponent reply:** tapped a Red soldier and a highlighted legal point; Black replied, and New Game restored Red's opening. A browser-only focus bug was found and fixed: `NodeList` has no `.find()`. The 9-file board is 405px wide in a 314px viewport, so an edge requires horizontal panning. Both the left and right board views were inspected. [After the exchange](gameplay-playtest-20261009/02-co-tuong-left.png) · [Right edge after pan](gameplay-playtest-20261009/03-co-tuong-right-edge.png)
3. **Bờ Kè Sao — defend and recover:** placed a 45-energy lamp by touch; it stopped an enemy for 12 points. Pause/resume held the round, and confirmed restart removed the tower and reset wave/score. A separate no-defense run reached the loss screen and Replay reset it. [Scoring lamp](gameplay-playtest-20261009/04-bo-ke-sao-score.png) · [Round loss and replay](gameplay-playtest-20261009/05-bo-ke-sao-loss.png)
4. **Mọt Sách Nối Chữ — valid word, fire, and terminal states:** `SHELF` scored 25; `SUPER` crossed the burning tile, scored 33, and cleared the shelf. The shelf transition previously hid the fire message; the status now reports both. Seeded play reached campaign win in five turns; a separate safe-word route reached loss in eleven turns. Cancelling a touch-style drag left a visible, editable route that could be cleared, and later taps still worked. [Fire and shelf feedback](gameplay-playtest-20261009/06-bookworm-fire-clear.png) · [Campaign win](gameplay-playtest-20261009/07-bookworm-win.png) · [Fire loss](gameplay-playtest-20261009/08-bookworm-loss.png)

## Findings and verification

- Fixed Cờ Tướng focus restoration for real-browser `NodeList` values; added a Playwright interaction regression for legal selection, CPU reply, focus retention, and restart.
- Fixed Mọt Sách's shelf-clear message to include fire feedback; added regressions for that copy and interrupted-drag recovery.
- The complete Node suite passed **1,166/1,166** tests. The complete Chromium suite passed **25/25** tests. The release preflight prepared **150 catalog games, 52 prototypes, and 98 planned entries**.
- The scripted interactive run completed with no page errors, console errors, or local requests failing.

Remaining acceptance: physical iOS/Android touch, assistive technology, novice-player comprehension and balance, Xiangqi review by players, dictionary/content review, and historical-title or distribution-rights review. The game screenshots document this local run only; they do not substitute for those checks.
