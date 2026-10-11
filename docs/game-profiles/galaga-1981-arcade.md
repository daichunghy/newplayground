# Galaga — Namco arcade, 1981

**Reference scope:** One-player Galaga on the 1981 Namco arcade board, based on Bandai Namco's official history/gameplay page. The arcade ROM revision, DIP/cabinet settings, exact stage formation tables, scoring table and event timings are not pinned. This profile does not cover the NES or later compilation ports.

## Sources and observed mechanics

- Bandai Namco Entertainment, [Galaga history and official how-to-play](https://galaga.com/en/history/galaga.php), accessed 2026-10-11. It identifies the 1981 arcade release and Namco board, left/right stick movement, fire button, a two-shot on-screen limit, an entering formation of about 40 units per stage, Boss/Guard/Grunt classes, changing flight/attack patterns, and the Boss Galaga tractor beam. Destroying a boss that holds a captured fighter recovers that fighter and enables a larger Dual Fighter with double firepower. The page mentions Challenging Stages but does not state their interval or exact scoring.
- Galaga creator Shigeru Yokoyama, [30th anniversary interview transcript](https://shmuplations.com/galaga/), originally published by the Galaga 30th Anniversary site in 2011; accessed 2026-10-11. This is a secondary-hosted transcript of the creator interview; it supports the design intention behind rescuing a captured fighter for dual firepower. It is not used as a source for cabinet timings.
- [Galaga arcade parts and operating manual scan](https://www.arcade-museum.com/manuals-videogames/G/Galaga.pdf), accessed 2026-10-11. Original machine manual scan hosted by the International Arcade Museum; consulted for machine context. The official Bandai Namco page is used for the player-facing rules above.

## Implemented prototype and known deviations

The catalog ID `ban-ruoi-galaga` now uses a title-specific portrait fixed-shooter loop: a 40-unit three-rank formation (2 Boss, 8 Guard, 30 Grunt), lateral movement, a two-projectile cap, enemy entry paths, diving attacks and incoming shots. Boss capture consumes one ship; destroying the carrier rescues the fighter and restores it into Dual Fighter, with paired fire. The loop also has lives, stage progression, game over/restart, pause, touch buttons, pointer movement and a locally saved high score. Ship and enemy art are newly drawn geometric vectors. No original Galaga sprite, cabinet art, audio or formation asset is included.

The official source gives an approximate 40-unit formation but not the implemented exact rank composition. Exact enemy colors and silhouettes, score values, stock/bonus thresholds, attack patterns/cadence, beam timing, and the challenge-stage schedule are local choices. The prototype schedules its challenge waves at levels 3, 7, 11, etc.; this is not claimed as the arcade schedule. The touch buttons, pointer movement, pause and local record are browser adaptations. This is a mechanics prototype, not a ROM-accurate recreation claim.

## Recorded acceptance and remaining checks

The browser run and deterministic model evidence are in [`../qa/galaga-batch-20261011.md`](../qa/galaga-batch-20261011.md). Natural input defeated several enemies but did not clear a formation. The stage-clear/next-stage, capture/rescue, and game-over paths were separately verified with seeded states; seeded checks are not reported as natural campaign play. Exact formations, dive timing, scoring, capture behavior and challenge cadence still need comparison with a pinned board/ROM. Physical device performance, assistive technology and frame-time benchmarking remain untested.
