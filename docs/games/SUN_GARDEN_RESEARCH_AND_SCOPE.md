# Vườn Nắng: research, scope and implementation notes

Updated 2026-10-07. Catalog route: `nong-trai-vui-ve`. Build candidate: `sg1`. This is an original NewPlayground game, not an accepted recreation of Zing Me's Nông Trại Vui Vẻ.

## What the sources establish

- The contemporary Vietnamese gaming article [GameK, “Game nông trại vẫn chứng tỏ sức hút trên mạng xã hội Việt” (2011)](https://gamek.vn/internet/game-nong-trai-van-chung-to-suc-hut-tren-mang-xa-hoi-viet-20110723112321323.chn) reports that Zing Me launched Nông Trại Vui Vẻ around mid-2009 and compares its broad genre to FarmVille and Barn Buddy. This is secondary historical reporting, not an official rulebook.
- Zynga's [2019 FarmVille anniversary notice](https://www.zynga.com/blog/zyngas-original-hit-game-farmville-marks-10-year-anniversary-milestone/) says that the separate Facebook FarmVille launched in 2009 and describes growing virtual crops and building farms together in real time. Zynga's [history page](https://www.zynga.com/about/our-story/) gives FarmVille's June 19, 2009 launch date. These are primary sources for FarmVille only, not for the Zing Me game.
- An official Zing Me manual, an identifiable original client/build, and verifiable exact-edition rules or input timings were not located. Do not infer that FarmVille 2/3 instructions or fan recollections prove Zing Me rules. Timing, crop values, board size, scoring and loss conditions below are original design choices, not recovered reference data.

## Chosen playable scope

One immediately playable, 45-second garden shift. Nine soil plots; select one of three seeds and tap an empty plot to sow. Plants grow concurrently in real time; ripe produce is automatically collected. The one goal is to harvest 108 pieces before sunset. A flower matures in 7 seconds for 3 pieces, a berry in 5 seconds for 2, and a bean in 3 seconds for 1. Faster crops are easy to turn around; slower crops reward a larger harvest. At 108 the shift wins; at sunset it ends and the player can immediately replay.

Core loop retained: choose a crop → plant → wait for growth → harvest. Automatic collection keeps the familiar farming rhythm while removing a separate cleanup task. The one-line on-play instruction and 44px+ seed/plot buttons keep the first action clear. Keyboard users can focus and activate the same native buttons. Leaving the tab or window pauses the shift.

The exact 9-plot board, crops, timers, yields, 45-second day, quota and original art are deliberately authored for this candidate. It has no crop shop, inventory, cash, upgrade ladder, level gate, construction, social neighbors, crop theft, pets, pests or long off-screen wait. It does not claim the original game's larger social/sandbox scope or commercial parity.

## Implementation and evidence

- The deterministic model owns crop timers, yield, score, sunset and outcomes. UI time advances from a fixed RAF loop and is paused on blur/visibility loss.
- Original NewPlayground SVG cover and CSS board; system emoji render crop markers; brief synthesized tones only. No copied Zing, Zynga or third-party image/music files. The legacy `nong_trai_cover.png` remains in source for provenance review but is excluded from the prepared Pages artifact.
- No run save is needed for a 45-second standalone shift; no localStorage data is read or written. Closing/reopening starts a fresh shift. Close cleanup and direct restart are tested with runtime doubles.
- Eleven pure-model groups, six DOM-double UI groups, and one compact-start route check pass. These automate deterministic rules and mock DOM lifecycle only; they are not evidence of real browser rendering, device touch, audio playback, performance, screen-reader behavior or human playability.

## Acceptance gates still open

| Gate | Status | Evidence or next check |
|---|---|---|
| Target-version parity | Pending | Exact historical build/manual not established; this candidate intentionally does not assert parity. |
| Content/balance | Pending | One shift is implemented; balance still needs natural desktop/mobile playthrough. |
| Controls/lifecycle | Pending | Native button, blur-pause and cleanup tests pass on doubles; verify real mouse, keyboard, touch, pause and close/reopen. |
| Visual/audio | Pending | Original SVG/CSS and synthesized cues; inspect actual rendering, contrast, small-screen fit and mute behavior in a browser. |
| Device/performance | Pending | No device or real-browser measurements have been run. |
| Save/recovery | Pending | No mid-run save by design; confirm that fresh-run behavior is the right release scope. |
| Playtest | Pending | No human playtest conducted; measure whether crop trade-off and target are obvious/fair. |
| Distribution rights | Pending | New authored source/art are under repository MIT terms; legacy catalog route/ID rights remain unverified. |
