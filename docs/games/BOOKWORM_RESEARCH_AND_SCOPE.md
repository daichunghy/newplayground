# Mọt Sách Nối Chữ: research and scope

Research snapshot: 9 October 2026. Catalog ID: `bookworm-sau-noi-chu` (#147). This is an original, self-contained candidate that uses the catalog's connected-letter and spreading-fire premise. It is not a replica of a particular Bookworm edition.

## Research findings

- The catalog and the queued 101–150 specification describe a letter-linking puzzle with burning letters as the pressure mechanic. The official EA/PopCap games page describes the 2003 Bookworm as connecting letter tiles in the four cardinal directions, scoring larger words more highly, and watching for burning letters. [EA / PopCap: Games](https://www.ea.com/ea-studios/popcap/games)
- A 2009 Nintendo DS Bookworm manual, uploaded to Scribd, describes selecting or dragging adjacent letters, submitting a word, and new tiles falling after a valid word. It also describes the fire tile burning the tile below it and ending the game if it reaches the bottom. The manual is a platform-specific product reference hosted by a third party; it is not evidence for every edition's rules. [Bookworm for DS game manual](https://www.scribd.com/document/358205637/Bookworm-for-DS-Game-Manual)
- The project catalog explicitly calls for a hex-connected letter grid. This candidate follows that local catalog decision, even though the cited official page/manual describe orthogonal four-way adjacency. The difference is intentional and is not presented as historical fidelity.

## Candidate rules

- A round opens directly on a 6×6 odd-row-offset hex grid. The first shelf includes the guaranteed word `SHELF`; later shelves are seeded with `GARDEN` and `LIBRARY` to make each progression beat immediately understandable.
- Select a 3–7 letter path through unique adjacent tiles, then press **Ghép từ**. Taps build the route one tile at a time; pointer dragging can also trace it. The offline, finite English word list decides whether a route is accepted. An unlisted or disconnected route does not consume a turn.
- A valid word scores its length squared. Clearing the burning tile adds 8 points and resets the spark higher on the grid. Otherwise, the spark advances one hex row after every two accepted words. It burns the board by position rather than deleting letters below itself; reaching the last row loses the shelf.
- Removed letters are replaced by tiles falling from the top of their columns. If a refill ever leaves no listed word, a small fallback word is placed on the top row so the player cannot become input-locked.
- The campaign has three increasingly difficult shelves with score goals of 42, 68, and 92, and 12 accepted-word turns per shelf. Reaching a shelf goal advances immediately. The third clear wins; the spark reaching the bottom or exhausting turns loses. **Chơi lại** starts a fresh campaign.
- Keyboard players can tab through native letter buttons, use arrow keys to move focus, select letters with Enter/Space, and activate **Ghép từ**. Touch players can tap a route or trace it; the view hit-tests the position under the finger to support pointer capture.
- The game is turn-based. It has no clock, online play, hints that solve the route, profile, save file, store, or bonus-tile economy.

## Implementation and rights

- `scripts/games/bookworm-model.js` contains the deterministic board, finite offline vocabulary, hex adjacency, scoring, gravity/refill, spark pressure, three-shelf progression, and terminal states. It has no DOM or runtime dependency.
- `scripts/games/bookworm.js` exposes `window.NP_Bookworm.mount(container, session, audio?, options?)`. The wrapper loads the model first and the candidate stylesheet. All listeners are registered with the supplied `NP_GameSession`; teardown clears the mounted UI. `audio` is accepted for host compatibility but this candidate does not play audio.
- `scripts/games/bookworm.css` uses authored CSS shapes/colors only. There are no external images, fonts, audio files, runtime libraries, or network requests. Buttons and tiles have 44px minimum touch dimensions, with a compact responsive layout and reduced-motion handling.
- No source code, art, screenshots, characters, dialogue, or assets from Bookworm were copied. The board colors, interface, finite word set, stage names, score goals, and fire rules are original implementation decisions. Rights to the catalog's historical name and route remain unreviewed.

## Verification and limits

Focused Node tests in `tests/bookworm-model.test.cjs` and `tests/bookworm-ui.test.cjs` cover hex topology, word validation, no-turn invalid input, scoring, refills, dousing and fire loss, campaign win/replay, immediate mount, tap and drag selection, captured-touch hit-testing, and session teardown. Local Chromium smoke checks also passed at a 320px viewport: the 36 tiles stay within the board and a tap-by-tap word can be submitted. This is not physical-device or assistive-technology QA, does not cover browser rendering at every viewport, and does not establish dictionary coverage, balance, or historical edition parity. Those remain product review items.
