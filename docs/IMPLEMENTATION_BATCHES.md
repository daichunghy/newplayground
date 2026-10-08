# Nâng cấp sâu toàn bộ 150 game: các lô triển khai

Ngày: 08/10/2026. Phạm vi hiện hành theo yêu cầu người dùng: hoàn thiện từng game trong danh mục 150, cho phép làm song song bằng các worktree riêng. Mục tiêu 500 là chiến lược sau; không thêm clone để tăng số. Chưa được duyệt push/merge/deploy cho lô cải thiện mới.

## Chứng cứ và cổng chất lượng

Minesweeper ms1 có checkpoint 78b598d: 101 kiểm tra tự động pass, browser/device còn pending, package được giữ riêng. Tiếp tục triển khai 2048/Line98/Hàng Rong song song theo chỉ đạo mới; không coi game trước chưa device-QA là lý do dừng mọi implementation. Mỗi game vẫn có cổng riêng: nguồn luật và bản tham chiếu, scope/content, model, input/render, asset rights, save/lifecycle, automation, browser/device/playtest, duyệt release. Không đánh dấu accepted chỉ vì qua unit test.

- Integration: `codex/deep-upgrades-20261007`; 2048 do integrator phụ trách.
- Line98: worktree/branch riêng; chỉ model/view/CSS/tests/dossier/assets của game.
- Hàng Rong: worktree/branch riêng; chỉ modules/tests/dossier/assets của game.
- Integrator sở hữu router wrappers, index, shared CSS, manifest, inventory/backlog và full-suite regression.
- Một worker chỉ có một game implementation đang mở. Giải phóng slot sau khi bàn giao commit; game tiếp theo theo danh sách dưới. Không triển khai placeholder hoặc gọi engine khác làm một game mới.
- Tiến độ cục bộ hiện tại: 150 catalog / 50 prototypes / 100 cần gameplay riêng / 0 accepted scope / 0 complete reference parity.

## Thứ tự và lô

P1A là 4 vòng chơi đầu, P1B là timing/collision, P1C là nội dung/progression. P2 xử lý 30 prototype còn lại; chia tối đa 3 game độc lập đang triển khai. P3 nghiên cứu và xây 100 engine còn thiếu theo work_order, ưu tiên luật/content rõ và quyền giải quyết được. Mọi game brand/campaign phức tạp phải khóa scope và quyền trước, không giả đạt parity bằng một màn đơn giản.

### P1A

- 1. `do-min-minesweeper` — Dò Mìn (Minesweeper): candidate ms1 adds a tentative `?` mark through right-click or touch/keyboard mode; it does not affect the mine counter and remains revealable/chordable. Existing save schema restores; 90 paired model/UI tests pass for this targeted update. Device and real-browser acceptance pending; classic mine placement remains unchanged.
- 2. `tro-choi-2048` — Trò Chơi 2048: candidate g2048-1, automated tests pass, device pending
- 3. `line-98` — Line 98 Cổ Điển: candidate l98-1 integrated, 38 focused tests pass; device pending
- 4. `hang-rong` — Hàng Rong: candidate hr3-simple integrated, 35 focused tests pass; device pending

### P1B

- 5. `xep-gach-tetris` — Xếp Khối: original fb1 integrated, 27 focused tests pass; device pending
- 6. `pac-man` — Lối Sáng: original mc1 integrated, 45 focused tests pass; device pending
- 7. `zuma-ech-ban-ngoc` — Đường Ngọc: original Marble Trail mt1 integrated, 50 focused tests pass; device pending
- 8. `dat-bom-bomberman` — Bom Vườn original candidate on `codex/deep-upgrades-20261007`; 14 model + 9 DOM/Canvas-double tests pass, browser/device/playtest pending; no commercial parity claim

### P1C

- 9. `mario-co-dien` — Vòm Mây original platformer candidate on `codex/deep-upgrades-20261007`; 11 model + 9 DOM/Canvas-double tests pass; browser/device and playtest gates pending; no Nintendo-parity claim
- 10. `diner-dash` — **Tiệm Lá Trà** original service-loop candidate integrated locally; 9 model + 6 DOM-double UI tests pass; browser/device/pacing/playtest and rights/title review pending; no reference-parity claim
- 11. `plants-vs-zombies-2d` — **Bờ Kè Sao** original four-wave lane defense; the final wave now concentrates seven Gusts into one lane, with Cloud/Mist on separate lanes, while keeping all nine arrival times. A five-device Lamp+Bell placement clears 27/27 with 3 lives/408 score for 250 energy; a route-aware six-Lamp stack reaches the same result at 270 energy but ~248 ticks faster. Single Lamp-per-lane fails at 22/27; this creates a Bell AoE alternative without making it a mandatory upgrade. Nineteen model + six DOM-double UI tests pass, including policy controls and old mid-wave save resume; real browser/device, human balance and legacy-title rights pending; no PopCap-parity claim
- 12. `danh-bai-uno` — **Sắc Chuyền** original 1v1 seasonal card duel locally integrated; 17 deterministic model + 7 DOM-double UI tests pass; browser/device/playtest and legacy-title rights pending; no Mattel/UNO parity claim

### P2

- 13. `dao-vang` — **Vực Ngọc** original deep-sea tether arcade candidate integrated locally; 11 deterministic model + 5 DOM-double UI tests pass; browser/device/feel/playtest and historical title rights remain pending; no Gold Miner parity claim
- 14. `ban-trung-khung-long` — **Mảnh Sao** original star-fragment shooter candidate `sm1`; 13 model + 6 DOM-double UI tests pass; official EA high-level loop reviewed, detailed reference rules unavailable; browser/device/playtest and legacy route/title rights pending; no Dynomite parity claim
- 15. `kim-cuong-bejeweled` — **Kính Khảm** original stained-glass match-three candidate `kk1`; 10 model + 6 DOM-double UI tests pass; official Bejeweled 3 PC product page and publisher overview reviewed, detailed PC rules unavailable; browser/device/playtest and legacy route/title rights pending; no parity claim
- 16. `ban-xe-tang-1990` — **Xe Săn Bụi** original core-defense rover candidate `sr1`; 10 model + 6 DOM-double UI tests pass; official Nintendo Battle City Famicom 1985 manual/pages reviewed, exact Tank 1990 variant unverified; browser/device/playtest and legacy route/title rights pending; no parity claim
- 17. `nong-trai-vui-ve` — Vườn Nắng original crop-growth candidate (`sg1`); 11 model + 6 DOM-double UI + 1 compact-route test pass; historical rules are only partially sourced, browser/device/balance/playtest pending, no parity claim
- 18. `gunny-2d` — **Gió Ngang** original coordinate-artillery candidate (`wind-duel-1`); 13 model + 7 DOM-double UI tests pass; current official controls guide reviewed, historical build unverified; browser/device/balance/playtest and route/title rights pending; no parity claim
- 19. `nuoi-ca-nemo` — **Bể Sao** original 60-second care/defense round now advances through three earned reef zones with 2/3/3 pearl quotas. Later reefs make visitors tougher and sooner while fish swim faster; feeding remains instant, pearls auto-collect, and defense is still tap-to-zap, with no store or currency. Nine model + six DOM-double UI tests pass, including a complete eight-pearl win by pointer-fed play, quota gates and all visitor profiles; Chromium campaign smoke is pending on the next review-branch run. EA/PopCap broad loop sources reviewed, historical catalog edition remains unknown; device balance, novice playtest and historic route/title rights pending; no parity claim
- 20. `co-caro` — **Cờ Caro** original local hot-seat candidate (`caro-candidate-1`); 7 model + 4 DOM-double UI tests pass; official RIF rules and Vietnamese product variants compared, historic variant unresolved; browser/device/playtest and exact-route rights framing pending; no parity claim
- 21. `co-tuong` — **Cờ Tướng** original hot-seat candidate integrated locally; 11 model + 5 DOM-double UI tests pass; browser/device/playtest and catalog-era rules/title parity pending
- 22. `ban-bi-ve` — **Bắn Bi Ve** original regional ring-flick candidate integrated locally; 8 model + 14 DOM-double UI/lifecycle tests pass; real browser/device, accessibility and playtest remain pending
- 23. `o-an-quan` — **Ô Ăn Quan** original local hot-seat candidate integrated locally; 11 model + 4 DOM-double UI/lifecycle tests pass; regional rules and catalog-era version vary; browser/device/accessibility/playtest pending
- 24. `ran-san-moi-snake` — **Rắn Săn Mồi** original grid Snake candidate integrated locally; 7 model + 5 DOM-double UI/lifecycle tests pass; 6110 reference researched, exact build/tuning unknown; browser/device/accessibility/playtest pending; legacy title/route rights unresolved
- 25. `feeding-frenzy` — **Cá Lớn Nuốt Cá Bé** original three-zone grow-by-eating round now has responsive swimming: velocity ramps to the same 178 px/s cap, arcs through turns, and brakes briefly after release; keyup/pointer cancel stop steering without snapping the fish to an abrupt halt. Fourteen model + eight DOM-double UI/lifecycle tests pass, including save compatibility and trajectory equivalence across frame partitions. A Chromium smoke now measures acceleration and post-release coasting through actual keyboard input; current-head CI/device feel and human balance remain pending. EA broad-loop sources reviewed; catalog title/route rights remain pending; no parity claim
- 26. `flappy-bird` — **Mạch Gió** original one-button flight candidate integrated locally; 11 focused model/UI tests pass; sources reviewed, exact physics unknown, three-life deviation documented; browser/device/playtest and legacy title/route rights pending; no parity claim
- 27. `chem-hoa-qua` — **Vườn Bật Nảy** original swipe-slicing candidate now advances through three authored timed courses: slow fruit groups, crosswind/sway, then a faster denser course with more bombs; stage names are shown and announced, while the 60-second round, three-miss limit, swipe controls, and pause/retry loop remain. Six model + four DOM-double UI/lifecycle tests pass, including stage boundaries, course pressure, and HUD updates; a Chromium smoke covers the second-course transition and is pending on the next PR head. Official support mode overview reviewed, exact catalog edition/tuning unknown; physical device, novice playtest, accessibility and historical title/route rights pending; no parity claim
- 28. `pha-gach-dx-ball` — **Phá Gạch** original paddle-and-ball candidate integrated locally; 14 focused model/UI tests pass; generic Breakout loop sourced, DX-Ball editions/rights are unresolved; browser/device/playtest pending; no DX-Ball parity claim
- 29. `day-thung-sokoban` — **Đẩy Thùng** expanded to six authored push-only rooms: the final set adds separated goals, a pinched route, and a three-crate delivery with a narrow passage. Every room has an executable BFS witness; sequential wins unlock rooms and save best moves, while versioned local snapshots preserve the current board and undo history. Eight model + twelve DOM-double UI/lifecycle tests pass, including corrupted/future saves and denied storage; a Chromium keyboard smoke clears all six rooms and is pending on the next review-branch run. Generic classic rules sourced; physical-device layout, novice difficulty, human playtest and title/route rights pending; no parity claim
- 30. `pong-1972` — **Bóng Bàn Cổ Điển** original solo-first candidate with optional local 2P; the capped CPU tracks the current ball until it enters the final 37% of the court, then predicts a reflected crossing, preserving time for return-angle counterplay. Sixteen focused model/UI tests pass, including wall-bounce prediction and a deterministic player policy that wins by aiming returns; museum sources document broad loop/history, exact cabinet variant unknown; browser/device/physical multi-touch, human balance and rights pending; no exact parity claim
- 31. `ban-ga-vu-tru` — **Tuyến Sáng** original three-wave solo shooter; waves require 3/5/7 targets, speed up enemy motion/fire/spawns, pause between clears and give a short shield; the final 15th target clears the campaign. Six model + six DOM-double UI/lifecycle tests pass; an actual Chromium wave-transition smoke is in the review update; catalog edition and title/route rights remain unresolved; no franchise parity claim.
- 32. `lat-the-tri-nho` — **Nối Hình** six-stage campaign with 64 certified board/witness templates per layout, indexed same-seed retry/new-deal/replay and versioned local progress; player stage opens do constant-time template lookup, while a bounded memoized solver remains for offline pool generation and stuck-only reshuffle; 9 model + 11 DOM-double UI/lifecycle tests pass, including all 384 embedded witnesses, seed-varied solver fallbacks, work limits, unlocks, malformed/future save recovery and pair-count-preserving reshuffle; 500-seed/layout desktop Node benchmark and DOM-double mount latency recorded; mobile/browser QA, novice playtest and title/route rights review pending; no parity claim
- 33. `boom-online-bnb` — **Đấu Trường Bọt Nước** original local arena candidate integrated; 11 model + 8 DOM-double UI/lifecycle tests pass, including bubble traps, one rescue pin, chain bursts and safe bot escape; Nexon bubble-rescue notices and separate Konami maze-battle manuals reviewed with version caveats; browser/device, balance, human playtest and historical title/route rights pending; no parity claim
- 34. `audition-nhip-dieu` — **Nhịp Mây** original three-song rhythm set: 108 BPM steady phrases, 116 BPM half-beat notes, then a 124 BPM denser off-beat finale; every four-beat phrase ends with Space. Per-song stars, combined score, one-tap continuation and set replay retain the same four-lane controls. Six model + seven DOM-double UI/lifecycle tests pass, including full clears, all three transitions and replay; PlayPark Piano Mode/Beat Rush guides reviewed, exact catalog edition/chart unknown; browser/device/audio timing, novice playtest and title/route rights pending; no parity claim
- 35. `road-rash-dua-xe-moto` — **Đua Gió** has three original short courses with increasing curve, hazard count and rival pace; top-three qualification, sequential unlock/replay and saved best place/time. A combat-depth pass makes later rivals more competitive and a missed side-check costs up to 2.5 m/s. In the deterministic model, careful no-attack steering places 1st/2nd/3rd; timed combat improves the last course to 2nd, while reckless swings cost 0.116–0.126 s per route. All 25 focused model/DOM-double tests pass, including policy comparison, 30–144 Hz behavior, rising hazard pressure, live-place HUD, keyboard/touch input, progress save/resume after wins/losses, live reduced-motion preference and cleanup. Original canvas bikes lean into turns, hazards are visible ahead, and impact feedback respects reduced motion; 1991 North American Genesis manual reviewed with version differences documented. Real browser/device, human balance, screen-reader QA and historical title/route rights remain pending; no parity claim
- 36. `rockman-mega-man` — **Mầm Chớp** original three-stage garden campaign integrated locally: patrol/sentry basics, timed vent routes, then a telegraphed guardian with a locked final gate; sequential unlock/replay, three checkpoints per stage and versioned local saves; 15 model + 14 DOM-double UI/lifecycle tests pass, including all ground-gap jumps, six-tick jump buffering/coyote grace, guardian cycle/gate, save recovery, manual/automatic pause, shared-mute sound cues, reduced-motion preference and input cancellation; Capcom Town Mega Man 4 English page reviewed for broad movement/jump/attack/charge context, exact catalog edition unknown; browser/device, difficulty, screen-reader playtest and historical title/route rights pending; no parity claim
- 37. `duck-hunt-ban-vit` — **Mục Tiêu Bay** original five-flight gallery with named path patterns, an amber warning before later direction changes, and the same pointer/keyboard/touch aiming controls; every fresh play/retry gets a new nonzero flight seed while explicitly seeded model runs remain deterministic. Six model + six DOM-double UI/lifecycle tests pass; a Chromium smoke for the fourth-flight warning is added; US 1985 NES booklet/Game A and Nintendo product summary reviewed, exact region/revision unknown; physical pointer/touch, accessibility and human playtest pending; no light-gun, dog, clay or franchise-content parity claim
- 38. `street-fighter-2-doi-khang` — **Nảy Lửa** original solo-first fighter integrated locally; ordinary fresh matches now vary CPU choices while explicit model seeds remain repeatable; 7 model + 5 DOM-double UI/input/lifecycle tests pass, including hidden-tab/window-blur loop pause, cleared held input and terminal RAF cessation; exact-route, original-cover and concise-copy gates; official Capcom Town English home-console page reviewed for broad controls/history, exact catalog edition and tuning unverified; browser/device, balance, human playtest and historic title/route rights pending; no parity claim
- 39. `bubble-bobble-khung-long-bong-bong` — **Mầm Gió** original three-round bubble-trap platform arcade integrated locally; 8 model + 5 DOM-double UI/input/lifecycle tests pass, including exact-route/cover; Taito retrospective and HAMSTER re-release page reviewed with edition caveats; browser/device, accessibility, balance, novice playtest and historic title/route rights pending; no parity claim
- 40. `age-of-war-thoi-dai-chien-tranh` — **Ranh Giới Mây** original three-bridge garden campaign; second bridge sends shield → heavy → ranged waves, and the Bọ Sỏi → Nỏ Hạt → Mầm Khiên player cycle clears in under 60s while each single-unit baseline fails to clear within 90s; final bridge adds stronger repeated Bọ Sỏi pressure answered by Nỏ Hạt; unlock/replay and best clear times save locally; malformed saves are copied to a recovery key, future-schema saves remain untouched, and storage-write failure does not block a win; 14 model + 8 DOM-double tests pass, including rival roster fidelity, all three counter rules, clear/lose time bounds, mixed-vs-single policy, a shield-only final-stage failure, save/reload progression, keyboard, pause and cleanup; creator-authored Newgrounds page reviewed for broad 2007 RTS context, remastered mobile edition kept separate; exact historic build, browser/device, human balance, accessibility, novice playtest and historic title/route rights pending; no parity claim
- 41. `bloxorz-khoi-da-lan` — **Khối Đá Lăn** original 10-stage rolling-block campaign with rising solver-verified shortest routes, sequential unlock/replay and locally saved best moves; 7 deterministic model + 6 DOM-double UI/input/lifecycle tests pass, including per-stage BFS reachability, footprint/reversal properties and progress recovery; Shockwave and Coolmath official-host pages reviewed for broad rules, exact catalog edition unverified; browser/device, accessibility, human difficulty playtest and title/route rights pending; no parity claim
- 42. `raft-wars-ban-sung-phao` — **Đấu Phao Bãi Cạn** original one-screen solo artillery duel integrated locally; 10 model + 8 DOM-double UI/input/lifecycle tests pass, plus exact-route/copy/compact-UI gates; official developer site reviewed for the 2007 original and version splits, exact gameplay build/rules still unverified; browser/device, playtest and historic title/route rights pending; no parity claim

### P3-discovery

- 43. `xep-bai-solitaire` — **Bảy Cột** original Draw-One Klondike candidate integrated locally; 8 deterministic model + 4 DOM-double UI/input/cleanup tests pass, including full-deal win, one stock recycle and recovery; Bicycle and Solitaire.com rule pages reviewed, Draw-One/one-recycle choice explicitly differs from Bicycle's Draw-Three example; historic catalog edition, browser/device/accessibility/playtest and title/route rights pending; no parity claim
- 44. `xep-bai-freecell` — **Bốn Ô** original Classic FreeCell candidate integrated locally; 6 deterministic model + 3 DOM-double UI/input/cleanup tests pass, including legal supermove capacity and full-foundation win; Freecell.com rule pages reviewed with edition and foundation-return caveats; historic catalog edition, browser/device/accessibility/playtest and title/route rights pending; no parity claim
- 45. `xep-bai-nhen-spider` — **Bài Nhện** one-suit, 104-card candidate now has an optional legal-move hint that prioritizes exposing a hidden card, highlights source and destination, and recommends stock only when no tableau move exists; it does not play automatically or guarantee a solvable deal. Nine model + six DOM-double UI/route/copy tests pass; MobilityWare/Arkadium primary digital rules reviewed; exact catalog edition, real browser/device, screen-reader playtest, and historic title/route rights pending; no parity claim.
- 46. `arkanoid-dap-gach` — **Vệ Tinh Giữ Quỹ Đạo** original three-round paddle/ball campaign with three distinct authored field silhouettes and capsule lanes, silver bricks that take two hits, and gold blockers that rebound; serve cues identify each field. Fourteen model/view-double tests pass for layout uniqueness, varied capsule routes, serve reset, win/loss, replay and candidate/integration parity; 1987 NES manual scope documented, exact catalog build and real browser/device/audio/accessibility/balance/playtest and title rights pending; no parity claim.
- 47. `puzzle-bobble-khung-long` — **Bi Vòm** original six-stage bubble-shooter campaign with authored layouts, fixed queues, recovery shots, local best/progress and deterministic replay; latest depth iteration adds a six-shot three-single puzzle and a mixed-geometry final board whose witness banks twice, clears the support anchor to drop three bubbles, then pairs a lone target; 8 model + 3 campaign/save + 5 DOM-double UI/lifecycle tests pass, plus 66 route-flow/minimal-play checks; Taito official pages reviewed; browser/device/touch/difficulty/playtest and title/route rights pending; no franchise parity claim.
- 48. `dr-mario-diet-khuan` — **Ống Nghiệm** original four-bottle 8×16 capsule campaign; 8 model + 3 campaign + 6 DOM-double UI/lifecycle tests pass, with legal routes for horizontal/vertical clears, planned falling-half and automatic two-clear cascade, sequential unlock/replay and safe save recovery; Nintendo 1990 NES manual reviewed with edition limits; legal solutions do not establish human difficulty; browser/device/accessibility/playtest and historic title/route rights pending; no franchise parity claim.
- 49. `peggle-pachinko` — **Bật Chốt** five original authored peg boards with 16/16/15/20/27 orange targets, shrinking 10/10/9/9/8 ball budgets and a faster moving return bucket; clearing a board unlocks the next, and replay records best score/fewest shots. A deterministic half-degree aim search witnesses all five clears within budget. Twelve model + seven DOM-double UI/lifecycle tests pass; real browser/device physics feel, human difficulty and historical title/route rights remain pending; no Peggle-character or layout parity claim.
- 50. `lemonade-tycoon` — **Quầy Nước Chanh** original five-day recipe/price campaign with distinct weather orders and goals 100/110/115/120/125; clear unlocks the next shift, each day saves its best-profit run and deterministic seed for replay; a weather-matched policy wins 433–492/500 seeded runs per day, and a bounded five-second action search finds a winning plan for all 185 sampled baseline losses; 11 model + 8 DOM-double save/UI/lifecycle tests pass; browser/device, human balance, accessibility and historical title/route rights pending; no parity claim.
- 51. `pizza-frenzy` — Pizza Frenzy Giao Bánh: queued; research trước implementation
- 52. `heavy-weapon` — Heavy Weapon Xe Tăng: queued; research trước implementation
- 53. `typer-shark` — Typer Shark Luyện Gõ: queued; research trước implementation
- 54. `chuzzle` — Chuzzle Sinh Vật Lông: queued; research trước implementation
- 55. `lua-va-nuoc` — Lửa & Nước (Fireboy & Watergirl): queued; research trước implementation
- 56. `nguoi-tuyet-snow-bros` — Người Tuyết (Snow Bros): queued; research trước implementation
- 57. `angry-birds-mini` — Bắn Chim Angry Birds: queued; research trước implementation
- 58. `cut-the-rope` — Cắt Dây Cho Ếch Om Nom: queued; research trước implementation
- 59. `ban-ruoi-galaga` — Bắn Ruồi (Galaga): queued; research trước implementation
- 60. `noi-ong-nuoc-pipemania` — Nối Ống Nước Pipemania: queued; research trước implementation
- 61. `pinball-3d-space-cadet` — Pinball 3D Space Cadet: queued; research trước implementation
- 62. `dap-chuot-chui` — Đập Chuột Chũi Whac-A-Mole: queued; research trước implementation
- 63. `xay-cau-bridge-builder` — Xây Cầu Vật Lý (Bridge Builder): queued; research trước implementation
- 64. `truc-thang-heli-attack` — Trực Thăng Bắn Súng (Heli Attack): queued; research trước implementation
- 65. `thu-thanh-bloons-td` — Thủ Thành Khỉ Ném Phi Tiêu: queued; research trước implementation
- 66. `contra-2d` — Contra 2D Cổ Điển: queued; research trước implementation
- 67. `bong-bong-nuoc-bubble-trouble` — Bắn Bong Bóng Nước (Bubble Trouble): queued; research trước implementation
- 68. `crossy-road` — Băng Qua Đường (Crossy Road): queued; research trước implementation
- 69. `sonic-chay-nhanh` — Nhím Sonic Chạy Nhanh: queued; research trước implementation
- 70. `dua-xe-nam-mario-kart` — Đua Xe Nấm Mini: queued; research trước implementation
- 71. `rambo-lun-metal-slug` — Rambo Lùn (Metal Slug Mini): queued; research trước implementation
- 72. `excitebike-dua-xe-dia-hinh` — Đua Xe Đạp Địa Hình (Excitebike): queued; research trước implementation
- 73. `circus-charlie-xiec` — Xiếc Khỉ Nhảy Lửa (Circus Charlie): queued; research trước implementation
- 74. `kung-fu-master` — Kung Fu Thiếu Lâm Tự: queued; research trước implementation
- 75. `nem-lon-truong-lang` — Ném Lon Trường Làng: queued; research trước implementation
- 76. `tat-lon-via-he` — Tạt Lon Vỉa Hè: queued; research trước implementation
- 77. `rong-den-mortal-kombat` — Rồng Đen 2D Mini: queued; research trước implementation
- 78. `co-ca-ngua` — Cờ Cá Ngựa Việt Nam: queued; research trước implementation
- 79. `co-ty-phu-monopoly` — Cờ Tỷ Phú Mini: queued; research trước implementation
- 80. `ai-la-trieu-phu` — Ai Là Triệu Phú Mini: queued; research trước implementation
- 81. `duo-hinh-bat-chu` — Đoán Hình Bắt Chữ: queued; research trước implementation
- 82. `tim-diem-khac-biet` — Tìm Điểm Khác Biệt: queued; research trước implementation
- 83. `thap-ha-noi-tower` — Tháp Hà Nội Cổ Điển: queued; research trước implementation
- 84. `piano-tiles-phim-nhac` — Phím Nhạc Rơi (Piano Tiles): queued; research trước implementation
- 85. `among-us-impostor` — Ai Là Kẻ Giả Mạo? (Among Us): queued; research trước implementation
- 86. `skribbl-ve-doan-chu` — Vẽ Hình Đoán Chữ (Skribbl): queued; research trước implementation
- 87. `bi-lac-ban-go` — Bi Lắc Bàn Gỗ (Foosball): queued; research trước implementation
- 88. `keo-co-doi-khang` — Kéo Co Đối Kháng: queued; research trước implementation
- 89. `khoi-rubik-mini` — Khối Rubik 2x2 Mini: queued; research trước implementation
- 90. `ninja-cuu-me` — Ninja Cứu Mẹ (Legend of Kage): queued; research trước implementation
- 91. `bomberman-93-arena` — Đấu Trường Bomberman 4 Người: queued; research trước implementation
- 92. `dua-xe-micro-machines` — Đua Xe Đồ Chơi (Micro Machines): queued; research trước implementation
- 93. `sky-garden-khu-vuon-tren-may` — Khu Vườn Trên Mây: queued; research trước implementation
- 94. `dao-rong-dragon-island` — Ấp Trứng Đảo Rồng: queued; research trước implementation
- 95. `tien-len-mien-nam` — Tiến Lên Miền Nam Cổ Điển: queued; research trước implementation
- 96. `phi-tieu-bong-bong` — Phi Tiêu Nổ Bóng Bay: queued; research trước implementation
- 97. `gap-thu-bong-dien-tu` — Gắp Thú Bông Điện Tử: queued; research trước implementation
- 98. `tam-cuc-co-dien` — Tổ Tôm Tam Cúc: queued; research trước implementation
- 99. `nem-vong-co-chai` — Ném Vòng Cổ Chai: queued; research trước implementation
- 100. `lac-bau-cua-tom-ca` — Lắc Bầu Cua Tôm Cá: queued; research trước implementation
- 101. `chay-tron-canh-sat-subway` — Chạy Trên Đường Ray (Subway Runner): queued; research trước implementation
- 102. `nguoi-que-ban-cung` — Người Que Bắn Cung (Stickman Archer): queued; research trước implementation
- 103. `dau-vat-hai-nguoi` — Đấu Vật Hai Người (Wrestle Jump): queued; research trước implementation
- 104. `thoi-bong-xa-phong` — Thổi Bong Bóng Xà Phòng: queued; research trước implementation
- 105. `tiem-banh-ngot-ba-baker` — Tiệm Bánh Ngọt Cupcake: queued; research trước implementation
- 106. `dap-ruoi-ban-tay` — Đập Ruồi Bàn Tay Vàng: queued; research trước implementation
- 107. `xe-dap-giao-bao` — Cậu Bé Giao Báo (Paperboy): queued; research trước implementation
- 108. `dau-truong-xe-dung` — Xe Đụng Hội Chợ: queued; research trước implementation
- 109. `gap-chu-cho-qua-duong` — Dắt Cún Qua Đường: queued; research trước implementation
- 110. `tiem-sach-cu-pho-co` — Tiệm Sách Cũ Phố Cổ: queued; research trước implementation
- 111. `adventure-island-dao-hoang` — Đảo Phiêu Lưu (Adventure Island): queued; research trước implementation
- 112. `prince-of-persia-1989` — Hoàng Tử Ba Tư Cổ Điển: queued; research trước implementation
- 113. `papa-pizzeria-tiem-banh-pizza` — Tiệm Bánh Pizza Của Papa: queued; research trước implementation
- 114. `stick-war-chien-tranh-nguoi-que` — Chiến Tranh Người Que (Stick War): queued; research trước implementation
- 115. `defend-your-castle-thu-thanh-nguoi-que` — Bảo Vệ Lâu Đài (Defend Your Castle): queued; research trước implementation
- 116. `donkey-kong-1981` — Vượn Khổng Lồ Ném Thùng: queued; research trước implementation
- 117. `dig-dug-dao-dat-bom-quai` — Đào Hầm Bơm Bong Bóng (Dig Dug): queued; research trước implementation
- 118. `pooyan-lon-me-ban-bong` — Heo Mẹ Bắn Nỏ (Pooyan): queued; research trước implementation
- 119. `yie-ar-kung-fu-vo-dai` — Đấu Võ Đường Thiếu Lâm: queued; research trước implementation
- 120. `asteroids-tau-ban-thien-thach` — Phi Thuyền Bắn Thiên Thạch: queued; research trước implementation
- 121. `frogger-ech-bang-qua-duong` — Chú Ếch Sang Sông (Frogger): queued; research trước implementation
- 122. `elevator-action-diep-vien-thang-may` — Điệp Viên Thang Máy: queued; research trước implementation
- 123. `double-dragon-hiep-si-rong-doi` — Rồng Đôi Song Thủ: queued; research trước implementation
- 124. `golden-axe-riu-vang` — Rìu Vàng Cổ Đại (Golden Axe): queued; research trước implementation
- 125. `cadillacs-dinosaurs-bo-doi` — Bộ Đội Khủng Long: queued; research trước implementation
- 126. `snowcraft-nem-tuyet-3v3` — Ném Tuyết Tuổi Thơ (Snowcraft): queued; research trước implementation
- 127. `bowman-nguoi-que-ban-cung` — Xạ Thủ Căn Gió Bowman: queued; research trước implementation
- 128. `line-rider-truot-tuyet-vat-ly` — Bút Vẽ Trượt Ván (Line Rider): queued; research trước implementation
- 129. `boulder-dash-tho-dao-ngoc` — Thợ Đào Ngọc Hầm Đá: queued; research trước implementation
- 130. `moorhuhn-ban-ga-dam-lay` — Thợ Săn Gà Rừng (Moorhuhn): queued; research trước implementation
- 131. `gun-mayhem-dau-sung-loan-da` — Đấu Súng Loạn Đả Sàn Rơi: queued; research trước implementation
- 132. `electric-man-2-vo-thuat-nguoi-que` — Người Que Ma Trận: queued; research trước implementation
- 133. `fancy-pants-chay-nhay-quan-cam` — Chàng Quần Cam Lướt Gió: queued; research trước implementation
- 134. `impossible-quiz-do-vui-xoan-nao` — Đố Mẹo Xoắn Não: queued; research trước implementation
- 135. `centipede-ban-sau-ret` — Bắn Sâu Rết Nấm Rừng: queued; research trước implementation
- 136. `qbert-nhay-khoi-lap-phuong` — Nhảy Bậc Kim Tự Tháp: queued; research trước implementation
- 137. `1942-khong-chien-thai-binh-duong` — Không Chiến Thái Bình Dương: queued; research trước implementation
- 138. `shinobi-ninja-phi-tieu` — Nhẫn Giả Cứu Con Tin: queued; research trước implementation
- 139. `chip-dale-soc-chuot-cuu-ho` — Sóc Chuột Cứu Hộ Đội: queued; research trước implementation
- 140. `tiny-toon-tho-buster-phieu-luu` — Thỏ Nhanh Nhẹn Tiny Toon: queued; research trước implementation
- 141. `balloon-fight-dap-bong-bay` — Đập Bóng Bay Tầng Không: queued; research trước implementation
- 142. `ice-climber-dap-bang-leo-nui` — Đập Băng Leo Đỉnh Núi: queued; research trước implementation
- 143. `mappy-chuot-canh-sat-nhay-bat` — Chuột Cảnh Sát Đệm Lò Xo: queued; research trước implementation
- 144. `twinbee-ban-chuong-bay` — Bắn Chuông Mây Biến Màu: queued; research trước implementation
- 145. `worms-armageddon-giun-chien-tranh` — Giun Đất Bộc Phá (Worms 2D): queued; research trước implementation
- 146. `digger-xe-ui-dao-ham` — Xe Ủi Đào Vàng Hầm Ngầm: queued; research trước implementation
- 147. `bookworm-sau-noi-chu` — Mọt Sách Nối Chữ (Bookworm): queued; research trước implementation
- 148. `atomix-ghep-phan-tu-hoa-hoc` — Ghép Phân Tử Hóa Học: queued; research trước implementation
- 149. `icy-tower-thap-bang-nhay-cao` — Tháp Băng Nhảy Cực Hạn: queued; research trước implementation
- 150. `hamsterball-lan-cau-hamster` — Lăn Cầu Chuột Hamster: queued; research trước implementation

## Candidate Cờ Tướng — 07/10/2026

Đã thay demo năm puzzle một bên chưa kiểm tra luật bằng ứng viên Cờ Tướng nguyên bản: bàn 9×10 đủ 32 quân, hai người chơi chung máy, Đỏ đi trước, chọn quân rồi điểm đích. Engine kiểm tra bảy loại quân, cung và sông, mã cản, mắt tượng, pháo qua một màn, tướng đối mặt, cấm tự chiếu, chiếu bí và bí nước. Vị trí lặp chính xác ba lần xử hòa theo một quy tắc casual; không nhận thực thi đầy đủ AXF/WXF về đuổi/chiếu lặp. Luật nền tham khảo WXF Rules 2018; trang AXF giúp khóa quyết định về luật lặp; Xiangqi.com chỉ là diễn giải thứ cấp. Nhãn lịch sử không định danh được bản Cờ Tướng Tàn Cuộc và không có claim parity. Không AI, campaign puzzle, đồng hồ, bảng điểm hay kinh tế. 11 model + 5 DOM-double UI tests pass. Bàn và cover vector tự vẽ; `co_tuong_cover.png` và `cotuong_intro.jpg` loại khỏi artifact. Nghiệm thu browser/device/glyph/screen reader/playtest và quyền tên route cũ còn pending.

## Candidate Bắn Bi Ve — 07/10/2026

Đã thay mô phỏng cũ bằng một biến thể bi lồ búng trong vòng: 2–4 người thay phiên kéo/thả bi cái, lấy mục tiêu ra khỏi vòng để ghi điểm; trúng thì giữ lượt, trượt thì chuyền. Ván kết thúc khi vòng trống; hòa điểm được chia thắng. SGGP ghi nhận biến thể theo vùng và mô tả vòng, đường bắn và cách búng; VnExpress đối chiếu vòng thưởng bi; một bài Tạp chí Văn Hóa & Phát Triển phân biệt thêm bi lỗ/bi hào, nên phạt bi lỗ và thưởng gấp đôi không được trộn vào luật này. 8 model + 13 DOM-double UI/lifecycle tests pass. Canvas và SVG tự vẽ; `ban_bi_cover.png` và `banbi_intro.jpg` bị loại khỏi artifact. Historic build, browser/device/touch/accessibility/balance/playtest còn pending.

## Candidate Ô Ăn Quan — 07/10/2026

Đã thay game cũ một người/máy bằng một candidate hai người chơi chung máy. Bàn 12 ô; mười ô dân đặt năm sỏi, hai ô quan; chọn ô rồi rải thuận/ngược chiều. Ô dân có sỏi được rải tiếp; gặp ô quan đang còn thì dừng; một khoảng trống nối với ô kế có quân thì bắt quân và tiếp chuỗi. Hết lượt nếu bên mình trống thì tự bù năm sỏi khi đủ điểm, nếu thiếu thì thua; khi hai quan hết thì thu quân và so điểm. Nghiên cứu so sánh entry của Cục Du lịch (chỉ xem được snippet), cổng giáo dục mầm non Hà Nội và bộ luật default của sản phẩm Ô Ăn Quan Online; biến thể địa phương/bản catalog không rõ, không tuyên bố parity. Dân còn sót ở ô quan cuối ván được gán cho phía sở hữu ô Quan đó như một edge case của candidate. 11 model + 4 DOM-double UI tests pass. SVG cover và bàn vẽ mới; `o_an_quan_cover.png` bị loại khỏi artifact. QA browser/device/assistive tech/playtest và quyền route/tên cũ còn pending.

