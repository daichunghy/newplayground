# P1A gameplay-depth review: assigned 25-game subset

Reviewed 8 October 2026 at local integration snapshot `51b81de0af1d51fd46a4ee6bbbef8bf09f467c2c`. This review checks the playable loops implemented for the 25 catalog routes assigned to this subset. It does not claim parity with any commercial or historical edition.

## Findings

All 25 routes already have a complete, replayable core loop within their documented NewPlayground candidate scope. The implementation and focused regression coverage support keeping these loops as they are; I found no reproducible gameplay defect or evidence-backed depth gap that warranted changing mechanics. Several games deliberately implement original variants or short-session scopes, so a full reference-game feature list would be a different project.

| Catalog route | Implemented core loop reviewed | Evidence |
|---|---|---|
| `do-min-minesweeper` | First-click-safe reveal, flags, chord, win/loss, restart and save recovery; later same-pass update adds tentative `?` marks that remain revealable/chordable | `scripts/games/minesweeper-model.js`; model/UI tests |
| `tro-choi-2048` | Slide, merge once per move, spawn, score, continue after target and loss | `scripts/games/game2048-model.js`; model/UI tests |
| `line-98` | Reachable move, line clear, score/preview, one-step Undo and terminal board | `scripts/games/line98-model.js`; model/UI tests |
| `hang-rong` | Prepare stock, serve customers, finish a shift, progress/retry and restore | `scripts/games/hangrong-model.js`; model/UI tests |
| `xep-gach-tetris` | Seven-bag pieces, movement/rotation, drop/lock, line clears and sprint/endless results | `scripts/games/falling-blocks-model.js`; model/input/UI tests |
| `pac-man` | Navigate connected mazes, collect items, use power, evade sentries, advance three stages | `scripts/games/maze-chase-model.js`; model/UI tests |
| `zuma-ech-ban-ngoc` | Aim/fire, resolve marble contact, clear connected chains/cascades and finish route quotas | `scripts/games/marble-trail-model.js`; model/UI tests |
| `dat-bom-bomberman` | Place timed bombs, read blast lanes, survive/chains, reach exits and retry stages | `scripts/games/garden-bombs-model.js`; model/UI tests |
| `mario-co-dien` | Run/jump across platforms, avoid enemies/falls, collect bells, checkpoint and clear stages | `scripts/games/cloud-canopy-model.js`; model/UI tests |
| `diner-dash` | Seat a fitting party, take order, cook, pick up, serve, score and progress shifts | `scripts/games/tea-service-model.js`; model/UI tests |
| `plants-vs-zombies-2d` | Place lane defenders, earn energy, stop scheduled waves, manage breaches and win/lose | `scripts/games/beacon-shore-model.js`; model/UI tests |
| `danh-bai-uno` | Draw/play legal cards, choose wild suit, resolve action cards, play deterministic opponent, finish round | `scripts/games/season-shed-model.js`; model/UI tests |
| `dao-vang` | Swing/release the hook, capture/reel objects, meet quotas, bank score and progress/retry sites | `scripts/games/abyss-retrieval-model.js`; model/UI tests |
| `ban-trung-khung-long` | Aim/fire, clear connected matching bubbles, manage pressure and progress routes | `scripts/games/starlight-match-model.js`; model/UI tests |
| `kim-cuong-bejeweled` | Swap adjacent gems, resolve matches/cascades and meet finite stage targets | `scripts/games/mosaic-match-model.js`; model/UI tests |
| `ban-xe-tang-1990` | Navigate grid arenas, aim/fire through unobstructed lines, stop drones, protect core and advance zones | `scripts/games/scrap-rover-model.js`; model/UI tests |
| `nong-trai-vui-ve` | Choose seed, plant plots, grow and automatically harvest toward a timed goal | `scripts/games/sun-garden-model.js`; model/UI tests |
| `gunny-2d` | Move, adjust angle, charge/fire under wind, deform terrain, trade shots with CPU and finish duel | `scripts/games/wind-duel-model.js`; model/UI tests |
| `nuoi-ca-nemo` | Feed fish, collect generated pearls, defend them from aliens, and earn three reef zones with 2/3/3 quotas; later visitors have more health and arrive sooner within the 60-second round | `scripts/games/sea-garden-model.js`; model/UI tests |
| `co-caro` | Alternate placements, detect exact-five lines/draws and restart a local match | `scripts/games/caro-candidate-model.js`; model/UI tests |
| `co-tuong` | Generate legal Xiangqi moves, enforce check, detect mate/stalemate/repetition and restart | `scripts/games/xiangqi-model.js`; model/UI tests |
| `ban-bi-ve` | Flick a striker, resolve collisions/captures, grant extra shots and settle 2–4 player results | `scripts/games/ban-bi-ve-model.js`; model/UI tests |
| `o-an-quan` | Sow/relay, capture stones/Quan, refill or forfeit empty sides, settle final score | `scripts/games/o-an-quan-model.js`; model/UI tests |
| `feeding-frenzy` | Eat smaller fish, grow through reef stages, avoid predators and win/lose on lives or time | `scripts/games/feeding-frenzy-model.js`; model/UI tests |
| `ran-san-moi-snake` | Steer, eat/grow, accelerate, avoid walls/self and finish a full-board run | `scripts/games/ran-san-moi-snake-model.js`; model/UI tests |

## Verification and limits

The exact subset's paired model and UI-double suites passed in one local run: `612/612` tests, `0` failures. Command:

```sh
node --test tests/{minesweeper,game2048,line98,hangrong,falling-blocks,maze-chase,marble-trail,garden-bombs,tea-service,season-shed,abyss-retrieval,starlight-match,mosaic-match,scrap-rover,wind-duel,sea-garden,sun-garden,cloud-canopy,beacon-shore,caro-candidate,xiangqi,ban-bi-ve,o-an-quan,feeding-frenzy,ran-san-moi-snake}-{model,ui}.test.cjs
```

These tests exercise model rules and controller/lifecycle behavior with local test doubles. They do not establish real-browser rendering, device/touch behavior, screen-reader output, human balance, release rights, or exact-edition parity. Those acceptance limits remain as recorded in the game-specific dossiers and `docs/qa/P1A_PRODUCTION_GAP_REVIEW_20261008.md`.

## Later same-pass improvements

After the `51b81de` review snapshot, Dò Mìn gained the classic tentative-mark state via right-click or touch/keyboard mode; its previous save schema still restores and `?` does not block reveal or chord. Its paired model/UI suites passed `90/90` targeted tests. Bể Sao retained the same 60-second feed/defend loop but now escalates across three authored reef zones; its focused model/UI suites passed `15/15`. Real browser/device and human acceptance remain separate gates.
