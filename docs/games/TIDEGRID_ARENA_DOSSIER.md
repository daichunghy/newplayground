# Đấu Trường Bọt Nước — candidate dossier

Updated 2026-10-08. This is an original, local water-bubble arena candidate for the historical `boom-online-bnb` route. It is not a BnB, Bomberman, or commercial-version parity claim. The integration/catalog files remain unchanged.

## Version and rule sources

The catalog description names “Boom Online (BnB)” and a 1–4 player water-balloon/trap/rescue loop, but does not identify a platform, region, release, mode, or exact ruleset. First-party Nexon material we found concerns Korean PC Crazy Arcade/BnB: its [2024 Crazy Arcade update](https://m.ca.nexon.com/News/Notice/Content/144984?page=1&selectType=All&strCategory=patch) describes a special Normal Mode preset where a trapped character uses a needle for a temporary effect; a [2011 BnB patch notice](https://m.ca.nexon.com/news/notice/content/83708?page=21&selecttype=all&strcategory=inspection) describes a pet rescuing its owner from a water balloon. Those notices support the bubble-trap and needle-rescue motif, not the full base rules. They do not establish that BnB M or every historical edition behaves the same way.

For the broad maze-battle structure, Konami’s [Bomberman ’93 manual](https://dds.konami.com/games/manual/pcemini/en_Bomber93.pdf) describes four-way movement, bomb placement, smashable obstacles, power items, and a battle mode where the lone survivor wins. Konami notes that a digitized original manual may include features or controls not supported by the [PC Engine Mini product](https://www.konami.com/games/pcemini/lineup/jp/en/). Konami’s separate [Super Bomberman Random Match controls](https://www.konami.com/games/bomberman/online/manual/en/switch/index.html) and [Standard battle rules](https://www.konami.com/games/bomberman/online/manual/en/switch/page04.html) describe movement, bomb placement, and last-player/team-standing. These are different titles from BnB. The sources do not establish this candidate’s timing, arena, fuse, range, or exact burst geometry.

## Original rules selected for this candidate

- A fresh match begins on a hand-authored 13 × 11 tile board: one player against three deterministic local rivals. Arrow keys/WASD move; Space drops a charge; E uses the player’s single rescue pin. Touch controls mirror those actions.
- Each actor can have one active charge at a time, with a fixed two-cell range; another can be placed after it bursts. It bursts after 90 × 20 ms ticks (1.8 seconds) in a cardinal cross. The cross includes and removes the first breakable crate; a solid block stops it before entry. A burst can trigger a nearby charge, and all charges in one chain resolve against the same obstacle snapshot.
- A burst catches an untrapped actor inside a short-lived water bubble for 100 × 20 ms ticks (2 seconds). A later burst pops the bubble; otherwise it pops at the end of the countdown. The player can spend one pin to escape. Local rivals automatically spend their one pin with 55 ticks remaining.
- The last untrapped actor wins; a player caught without a pin loses when the bubble pops. If no actor survives, the result is a draw. There is no match timer, shrinking boundary, item shop, upgrade menu, team mode, or network play.

The exact timing, two-cell range, capacity, map, rival movement, and pin timing are project choices for a short original variant. The cross-burst and obstacle rules are explicit implementation choices; they are not claimed as universal rules from either franchise. The route name is retained only as an integration key.

## Asset provenance

The title, board layout, characters, UI, and art are original to this candidate. The board, water charges, bursts, bubbles, and four small pilots are drawn with Canvas 2D primitives; the interface is authored CSS. There are no downloaded images, borrowed characters, copied levels, logos, sound recordings, external fonts, or third-party game code. The visual font stack follows the repository’s Calibri standard.

## Verification and remaining QA

Focused model and DOM/Canvas-double checks: 18 passing tests with Node’s test concurrency set to 1. They cover safe spawn routes, discrete movement and input release, charge limits, cross/ray blocking, crate removal, simultaneous and chained bursts, bubble trap/rescue/pop, AI escape from a cross-lane threat, save validation, pause/replay, pointer cancellation, and session cleanup. The candidate is not wired into the app in this worktree by design.

No real-browser or physical mobile playtest has been run. Board scaling, pointer capture on touch hardware, keyboard focus in the full app, visual contrast at narrow widths, AI fairness, and human play duration still need browser/device review after integration. These checks do not establish exact BnB or Bomberman parity.
