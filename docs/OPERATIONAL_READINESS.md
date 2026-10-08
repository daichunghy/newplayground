# Bàn giao chuẩn bị vận hành — 08/10/2026

## Latest local checkpoint — 08/10/2026

- Current catalog: 150 IDs; exact registry has 50 original/local prototypes and 100 entries without dedicated engines. Bài Nhện, Vệ Tinh Giữ Quỹ Đạo, Bi Vòm, Ống Nghiệm, Bật Chốt and Quầy Nước Chanh are still prototypes, not accepted replicas.
- Full Node suite `node --test --test-concurrency=1` passed 989/989. Static release preflight passed: 150 catalog / 50 prototypes / 100 planned / 133 declared assets / 1,395,812 source JavaScript bytes / 19,868,424 source asset bytes. `git diff --check` passed.
- The local branch now includes original candidates for work items 38–50. Real-browser/device, visual acceptance, human playtests, and historical title/route rights remain pending. No public push, PR or deployment was performed; live site remains unchanged.

## Đã thực hiện

- Nghiên cứu bổ sung tài liệu Poki/CrazyGames về chất lượng, playtest, phát hành và quảng cáo; đưa vào chiến lược sản xuất 500 game.
- Registry exact-ID: hiện có 50 launcher riêng trong 150 mục. Bỏ generic shooter ghi đè và các ánh xạ khác cơ chế theo substring.
- Runtime quản lý scheduling, global listener, cleanup hook và cleanup bổ sung; error-launch dọn session. UI phân biệt prototype/planned, random chỉ chọn launcher sẵn có.
- Sửa ngưỡng tăng tiến Hàng Rong; đồng bộ giai đoạn trong save cũ và kiểm tra một phần dữ liệu save.
- Safe storage khi localStorage bị chặn; cleanup hiệu ứng rung có thể bị ngắt lúc đóng.
- Inventory/backlog 150 game; 12 hồ sơ pilot; template luật/content/items/input/art/performance; evidence ledger giữ qua sync.
- Asset register 179 file: 133 có manifest, 46 chưa có record. 133 đường dẫn khai báo đều tồn tại; chưa xác minh lại quyền của mọi source.
- Runbook, event contract và kiến trúc phản ánh mã. Bảo lưu proposal kiến trúc cũ riêng.
- CI preflight cho PR; main/manual deploy artifact chỉ chứa site. Giữ riêng checkpoint bảy game; nhánh tích hợp cục bộ có các candidate game nguyên bản; chưa có public PR, merge hoặc triển khai live.

## Kiểm tra tĩnh đã chạy

```text
python3 scripts/sync_game_operations.py
node scripts/release-preflight.mjs --prepare
git diff --check
```

Kết quả static ở checkpoint này: 150 ID duy nhất; JSON catalog và cache nhúng đồng nhất; 50 mapping có định nghĩa launcher trong source; inventory đầy đủ/đồng nhất; JavaScript được tham chiếu hợp lệ về cú pháp; 133 file asset được khai báo; không lỗi whitespace trong diff. Artifact ở `.pages-site`.

Kích thước đo trên source ở checkpoint tích hợp cục bộ mới nhất: JavaScript 1.395.812 bytes; assets 19.868.424 bytes. Chưa đo transfer nén, cold-load, FPS hoặc input latency.

## Còn cần nghiệm thu trước vận hành lô cải thiện

1. Chơi thực tế launcher/close/switch/reopen/restart, listener/RAF/timer và các tương tác của 49 prototype trên trình duyệt.
2. Hoàn thiện P1A: Dò Mìn, 2048, Line 98, Hàng Rong; đối chiếu luật, progression/items, save và thiết bị theo từng hồ sơ.
3. Rà reference version và inventory nội dung cho các game tiếp theo; 100 mục còn cần gameplay riêng.
4. Bổ sung/đối chiếu asset source/license, art direction và chất lượng hình ảnh của lô.
5. Phân công owner/capacity, triển khai telemetry state transitions rồi thu playtest/funnel; không dùng modal-open làm gameplay-start.
6. Monetization thử sau khi có vòng chơi ổn; SDK/collector/dashboard quảng cáo chưa được triển khai trong đợt này.

Lần rà docs/registry ban đầu chỉ kiểm tra tĩnh. Full-suite và preflight mới nhất được ghi ở candidate section phía dưới. Không có game được chứng nhận replica hoàn chỉnh; browser/device/feel/playtest và các quyền phát hành vẫn pending. Preflight tĩnh và artifact không tự thay thế chứng cứ nghiệm thu.

Thực hiện theo `GAME_OPERATING_STRATEGY.md` và `GAME_OPERATIONS_RUNBOOK.md`. Khi thay đổi mã tiếp, ghi chứng cứ theo build mới và cập nhật lại số liệu bàn giao.

## Bổ sung checkpoint P1A ngày07/10/2026

Bốn ứng viên Dò Mìn ms1,2048 g2048-1,Line98 NP Classic1,Hàng Rong hr3 đã tích hợp cục bộ vào branch `codex/deep-upgrades-20261007`. Chạy193 nhóm test của phạm vi P1A+portal; tất cả pass. Các nhóm còn chứa kiểm tra nhiều vector/seed/economy; không quy đổi thành số game hoặc thiết bị đã nghiệm thu. Source preflight/artifact pass. Chưa push/merge/deploy; browser/device/playtest vẫn pending. Catalog150/prototype42/planned108/accepted0 không đổi.

Minesweeper checkpoint78b598d và package đã gửi được giữ riêng. Những module thử nghiệm P1B chưa tích hợp không được tính là game hoàn thành. Source/rights/QA và khác biệt có chủ ý nằm trong dossiers `docs/games/`.

## Candidate Bom Vườn — 07/10/2026

Đã thêm game nguyên bản cho ID lịch sử `dat-bom-bomberman` vào nhánh tích hợp cục bộ `codex/deep-upgrades-20261007`: model 5 màn, touch/keyboard, save/retry, artwork vector riêng và bỏ cover/intro cũ chưa rõ quyền khỏi artifact. 14 test model + 9 test UI bằng DOM/Canvas doubles; full suite 348/348 và preflight pass. Không có public preview, browser/device/playtest acceptance hoặc parity claim; các cổng đó vẫn pending.

Artifact `.pages-site` local đã được dựng và kiểm tra có `garden-bombs-original.svg` cùng launcher Bom Vườn; hai file cũ `dat_bom_cover.png` và `datbom_intro.jpg` không được đóng gói. Đây là kiểm tra đóng gói tĩnh, không phải mở trên trình duyệt.

## Candidate Vòm Mây — 07/10/2026

Đã thêm prototype platformer nguyên bản cho ID lịch sử `mario-co-dien`: nhân vật diều giấy, ba chặng mây, gió đẩy, chuông gió và cổng mở theo mục tiêu. Không dùng tên/nhân vật/level/sprite/âm thanh của Nintendo; cover cũ `mario_cover.png` bị loại khỏi artifact. 11 test model + 9 test UI bằng DOM/Canvas doubles pass; full suite 370/370 và preflight pass. Browser/device/feel/parity chưa được chấp nhận.

## Candidate Tiệm Lá Trà — 07/10/2026

Đã thay route lịch sử `diner-dash` bằng game dịch vụ nguyên bản Tiệm Lá Trà: chọn nhóm khách, xếp bàn đúng sức chứa, nhận đơn, bếp FIFO và giao món đúng bàn; điểm và lượt bàn kế tiếp tự động sau bữa. Ba ca có lịch khách/điểm mục tiêu riêng. Chín test deterministic model và sáu test UI/lifecycle bằng DOM doubles pass; tổng suite 386/386 pass. Preflight static pass: 150 mục catalog, 42 prototype mappings, 108 planned; JavaScript 1,102,597 bytes; asset register 140 files (94 manifest, 46 chưa có record); source asset size 19,752,549 bytes. Artifact `.pages-site` được dựng local. Không dùng character/art/music của thương hiệu tham chiếu; `diner_dash_cover.png` và `diner_intro.jpg` bị loại khỏi artifact. Browser/device/playtest/pacing và quyền tên/route vẫn pending; chưa có parity/release claim.

## Kiểm tra lô tích hợp gần nhất — 07/10/2026

Full Node regression suite: 450/450 pass; `node scripts/release-preflight.mjs --prepare`: pass. Đây là kiểm tra model/DOM doubles, source/asset consistency và static build, không phải browser/device acceptance. Các candidate vẫn chưa được public preview, merge hay triển khai live.

## Candidate Bờ Kè Sao — 07/10/2026

Đã thay route lịch sử `plants-vs-zombies-2d` bằng lane-defense nguyên bản Bờ Kè Sao: năm hành lang, ba khí cụ tự động (đèn bắn, quạt làm chậm, chuông gây vùng), năng lượng tự hồi, bốn làn sóng và ba lượt lọt. Không cần nhặt tài nguyên, thu hoạch, nâng cấp hay bảng luật dài. EA/PopCap PC readme được dùng để xác nhận archetype lưới/làn, tài nguyên và sóng; game mới không dùng cây, zombie, tên, màn, art hay nhạc của nguồn. Mười lăm model tests và sáu DOM-double UI/lifecycle tests pass; full suite 408/408 pass. Preflight pass: 150 catalog / 42 prototype / 108 planned, 95 manifest files, JavaScript 1,092,799 bytes, assets 19,755,732 bytes. Artifact có `beacon-shore-original.svg`, bỏ `pvz_cover.png` và không còn code prototype dùng nội dung Plants vs. Zombies trong `engines-classics.js`. Chưa có browser/device/playtest/parity/rights acceptance; chưa public, merge hay deploy.

## Candidate Sắc Chuyền — 07/10/2026

Đã thay route lịch sử `danh-bai-uno` bằng card-duel nguyên bản Sắc Chuyền: 76 lá, bốn bộ mùa có biểu tượng/pattern riêng, số 1–8, lá gió rút hai và lá sương đổi mùa; một người chơi đấu một AI đơn giản trong một ván. Deck có save/replay và reshuffle; không có tên/logo/layout/màu lá Mattel, lời gọi UNO, stacking, Reverse/Skip/Draw Four/challenge hoặc chuỗi điểm 500. Đối chiếu đúng Mattel W2085 (2010), gồm trang sản phẩm và sheet W2085.pdf chính thức; scope và các khác biệt được ghi ở dossier. Mười bảy model tests + bảy DOM-double UI/lifecycle tests pass; full suite 433/433. Preflight: 150 catalog / 42 prototype / 108 planned, 96 manifest assets, JavaScript 1,097,971 bytes, assets 19,760,454 bytes. Artifact có `season-shed-original.svg`, bỏ `uno_cover.png`/`uno_intro.jpg`, và không còn engine cũ mang nội dung UNO trong `engines-popcap.js`. Browser/device/accessibility/playtest và quyền phát hành route/tên cũ vẫn pending; chưa public, merge hay deploy.

## Candidate Vực Ngọc — 07/10/2026

Đã thay route lịch sử `dao-vang` bằng game thu hồi vật sáng dưới biển sâu Vực Ngọc: một nút thả tether theo con lắc; dây tự bắt vật phát sáng và tự cuộn lại, vật nặng kéo chậm hơn. Ba làn có mục tiêu/thời gian riêng, điểm được cộng khi vật về tới thiết bị; không có thợ mỏ, vàng, thuốc nổ, cửa hàng, sức mạnh mua bán hoặc level art cũ. Edition research cố định là GameRival Gold Miner (2003 PC/Flash): GameRival’s Steam page xác nhận nguồn gốc nhưng mô tả bản Classic Edition mới có mode/nâng cấp/thù địch bổ sung; bài Jay Is Games năm 2004 là nguồn lịch sử thứ cấp cho loop kéo vật/trọng lượng/time goal; site GameRival cũ không truy cập được. Mười một model tests + năm DOM-double UI/lifecycle tests pass; full suite 450/450. Preflight: 150 catalog / 42 prototype / 108 planned; 97 manifest assets; JavaScript 1,090,244 bytes; assets 19,763,783 bytes. Artifact có `abyss-retrieval-original.svg`, bỏ `dao_vang_cover.png`/`daovang_intro.jpg`, và engine cũ Gold Miner đã gỡ khỏi `engines.js`. Browser/device/feel/playtest và quyền phát hành route/tên cũ vẫn pending; chưa public, merge hay deploy.

## Candidate Mảnh Sao — 07/10/2026

Đã thay route lịch sử `ban-trung-khung-long` bằng ứng viên nguyên bản Mảnh Sao `sm1`: ba sân tinh thể, ngắm/bắn, cụm ba ký hiệu trở lên, mảnh rời rơi, bốn lượt trượt đẩy một hàng triều; hình cover SVG do project tạo, bản thử mở trực tiếp. Trang chính thức EA cho Dynomite! chỉ xác nhận loop khớp ba trứng cùng màu bằng ná và mối đe dọa Mama Brontosaurus; không có đủ manual/thông số/level inventory để xác lập edition hoặc tuyên bố parity. Không dùng art, nhân vật, âm thanh hay layout EA; route ID lịch sử vẫn giữ quyền tên chưa xác nhận và game hiển thị title Mảnh Sao. Mười ba test model + sáu DOM-double UI/lifecycle pass; full suite 470/470. Preflight: 150 catalog / 42 prototype / 108 planned; 98 manifest assets; JavaScript 1,073,960 bytes; assets 19,765,869 bytes. Artifact có `starlight-match-original.svg`, loại `ban_trung_cover.png` và `bantrung_intro.jpg`; old Dinosaur-specific game engine and unused theme cue removed. Chưa chạy browser/device/accessibility audit/playtest; không có public preview/PR, merge hay deploy.


## Candidate Kính Khảm — 07/10/2026

Đã thay route lịch sử `kim-cuong-bejeweled` bằng ứng viên match-three nguyên bản Kính Khảm `kk1`: bàn 6×6, 5 hình mảnh kính, ba ô cửa với mục tiêu 45/60/75 mảnh; 30 lượt đổi hợp lệ mỗi cửa; nước không khớp hoàn tác, nước khớp tự xóa, rơi và bù cột/cascade. Không có ngọc đặc biệt, power-up, shop, tài khoản hoặc thanh toán; cover vector tự tạo, title hiển thị Kính Khảm. EA xác nhận edition Bejeweled 3 PC (7/12/2010) và mô tả match-three cấp cao; trang PC không ghi chi tiết luật; manual PopCap gặp qua search index là bản Nintendo DS và PDF trả 403, không dùng làm parity PC. Mười model tests + sáu DOM-double UI tests pass; full suite 487/487. Preflight: 150/42/108; 99 manifest assets; JavaScript 1,080,172 bytes; assets 19,767,831 bytes. Artifact chứa `mosaic-window-original.svg` và loại `kim_cuong_cover.png`. Chưa nghiệm thu browser/mobile, input, accessibility, playtest, quyền tên/route hoặc triển khai live.


## Candidate Xe Săn Bụi — 07/10/2026

Đã thay route lịch sử `ban-xe-tang-1990` bằng game lưới-rover Xe Săn Bụi `sr1`, giữ mục tiêu bảo vệ một lõi tín hiệu nguyên bản: 3 bãi, 4/5/6 drone tìm lõi ba lớp, mỗi lượt lái/bắn cho patrol tiến một ô. Đạn thẳng bị đá chặn; hạ drone cộng điểm. Không sao chép headquarters/đại bàng, co-op, construction, special targets, upgrade, map hoặc art Battle City; minh hoạ và cover tự tạo. Manual Nintendo chính thức là Battle City Famicom 1985; nhãn Tank 1990 chưa xác định được cartridge/ROM, nên không tuyên bố parity. Mười model tests + sáu DOM-double UI tests pass; full suite 504/504. Preflight: 150/42/108; 100 manifest assets; JS 1,072,271 bytes; assets 19,770,116 bytes. Artifact chứa `scrap-rover-original.svg` và loại `xe_tang_1990_cover.png`. Browser/mobile/device QA, playtest, quyền title/route vẫn pending; không có public preview/PR, merge hoặc deploy.


## Candidate Vườn Nắng — 07/10/2026

Đã thay route `nong-trai-vui-ve` bằng Vườn Nắng `sg1`: chạm luống để gieo một trong ba hạt; cây lớn đồng thời và nông sản chín tự vào giỏ. Một ca 45 giây, chín luống và mục tiêu 108; không có shop, tiền, kho, nâng cấp hay tiến trình thời gian thực. Nguồn về đúng Zing Me chỉ là bài báo thứ cấp 2011; nguồn FarmVille chính thức mô tả một game khác, nên luật cụ thể của bản lịch sử vẫn chưa rõ. Mười một model tests + sáu UI tests bằng DOM doubles + một kiểm tra route nhỏ pass. Không dùng nhân vật/art/music của Zing/Zynga; `nong_trai_cover.png` loại khỏi artifact. Browser/device/balance/playtest và quyền route/title vẫn pending.

## Candidate Gió Ngang — 07/10/2026

Đã thay route `gunny-2d` bằng Gió Ngang `wind-duel-1`: đấu pháo nguyên bản một người với CPU, chỉnh góc và giữ/thả để canh lực theo gió, đất đổi hình sau cú nổ và hạ ba tim để thắng. Hướng dẫn Gunny PC chính thức hiện tại xác nhận di chuyển, chỉnh góc và giữ/thả để canh lực; không xác định được edition lịch sử `gunny-2d`, nên không nhận parity. Code, xe pháo, địa hình và cover tự tạo; `gunny_cover.png` bị loại khỏi artifact. Mười ba model + bảy UI test bằng DOM/event doubles pass; lỗi vòng lặp test chờ lượt máy đã được sửa. Full suite mới nhất 543/543 pass. Preflight tĩnh pass: 150 catalog / 42 prototype / 108 planned; 102 asset-manifest records; JavaScript 1.031.919 bytes; assets 19.777.153 bytes. Không chạy browser/device/audio/accessibility/playtest; chưa có public preview, PR, merge hoặc deploy.


## Candidate Bể Sao — 07/10/2026

Đã thay route lịch sử `nuoi-ca-nemo` bằng Bể Sao `sea-garden-1`: thả mồi để cá bơi tới ăn và lớn lên; mỗi hai bữa tạo ngọc tự thu; chạm sinh vật lạ ba lần để đuổi trước khi chúng cắn cá. Một bể ba cá, mục tiêu tám ngọc trong 60 giây; không có xu, shop, nâng cấp, trứng, thú cưng hay chiến dịch. EA và PopCap/EA chính thức xác nhận vòng lớn: chăm/cho cá ăn, nhận phần thưởng và chống sinh vật lạ; trang Shockwave chính thức hiện chỉ đọc được qua kết quả tìm kiếm. Nhãn lịch sử không xác định Standard 2004 hay Deluxe 2006, không nhận parity. Tám model + năm DOM/event-double UI test pass. Full suite `node --test --test-concurrency=1 tests/*.test.cjs` pass 557/557; preflight pass: 150 catalog / 42 prototypes / 108 planned, 103 asset-manifest records, JavaScript 1.031.919 bytes, assets 19.777.153 bytes. Artifact có `sea-garden-original.svg` và loại `nuoi_ca_cover.png`. Browser/device/audio/accessibility/balance/playtest cùng route/title rights vẫn pending; chưa có public preview, PR, merge hoặc deploy.


## Candidate Cờ Caro — 07/10/2026

Đã thay Caro đối kháng với máy bằng ứng viên nguyên bản Cờ Caro `caro-candidate-1`: hai người chơi chung bàn 15×15, X đi trước; hàng đúng năm thắng theo ngang/dọc/chéo; chặn hai đầu không đổi kết quả; nước nối thành sáu mà không tạo foul loss; bàn đầy không có năm thì hòa. Không có bot, undo, đồng hồ, mở đầu Renju, điểm số hay mở khóa. Nghiên cứu chỉ rõ RIF Gomoku là một bộ luật chính thức tham khảo, còn Caro tiếng Việt qua các app có biến thể; chưa xác định edition lịch sử nên không nhận parity. Mô hình/CSS/HTML do project viết, không dùng art/audio ngoài; `caro_cover.png` loại khỏi artifact. Bảy model + bốn DOM-double UI test pass; browser/device/touch/accessibility/playtest và quyền route cũ còn pending.


## Kiểm tra tích hợp mới nhất — 07/10/2026

Full Node suite `node --test --test-concurrency=1 tests/*.test.cjs`: 625/625 pass. `scripts/release-preflight.mjs --prepare`, JavaScript syntax, JSON validity and `git diff --check` pass. Static result: 150 catalog / 42 prototypes / 108 planned; 106 asset records; 1.040.134 JavaScript bytes; 19.786.444 source asset bytes. Prepared local artifact includes Bể Sao, Cờ Caro, Cờ Tướng, Bắn Bi Ve and Ô Ăn Quan candidates, with original SVG covers and without inherited Cờ Tướng/Bắn Bi Ve cover or intro art. No real browser/device acceptance, public preview, PR, merge or deployment is included in this checkpoint.


## Candidate Cờ Tướng — 07/10/2026

Đã thay demo puzzle một bên chỉ đi một số quân bằng Cờ Tướng hot-seat nguyên bản: 9×10, 32 quân, đầy đủ bảy loại di chuyển và luật cung/sông/mã cản/mắt tượng/pháo qua đúng một màn/tướng đối mặt/cấm tự chiếu. Chiếu bí và bí nước đều kết thúc ván; chính xác cùng vị trí ba lần hòa theo quy tắc casual, không nhận triển khai toàn bộ luật AXF/WXF về chiếu hoặc đuổi lặp. WXF Rules 2018 và trang AXF được tra cứu; luật sản phẩm lịch sử/edition chưa xác định. 11 model + 5 UI DOM-double tests pass. Full suite 585/585 pass; preflight static pass: catalog150/prototype42/planned108, 104 asset records, JS 1.025.135 bytes, source assets 19.780.111 bytes. Artifact có `xiangqi-original.svg`; `co_tuong_cover.png` và `cotuong_intro.jpg` vắng mặt. Browser/device/glyph/screen-reader/playtest, quyền tên route và parity vẫn pending; chưa public, PR, merge hay deploy.


## Candidate Bắn Bi Ve — 07/10/2026

Đã tích hợp biến thể bắn bi lồ chơi quanh vòng theo một lời kể khu vực của SGGP; VnExpress đối chiếu vòng và động tác bắn; bài Tạp chí Văn Hóa & Phát Triển tách riêng bi lỗ và bi hào nên không đưa luật phạt/thưởng riêng các biến thể đó vào. Bàn có 2–4 người cùng máy; búng bi cái, hất mục tiêu ra khỏi vòng để ghi điểm; trúng thì giữ lượt, trượt thì chuyền. Quy tắc chuyền lượt/điểm được ghi rõ là lựa chọn thiết kế candidate vì nguồn không thống nhất hết. 8 model + 14 DOM-double UI/lifecycle tests pass, gồm catalog open/close. Full suite 607/607 pass; preflight tĩnh pass: 150/42/108, 105 asset records, JavaScript 1.038.655 bytes, source assets 19.783.126 bytes. Artifact có `marble-ring-original.svg`, loại `ban_bi_cover.png` và `banbi_intro.jpg`. Biến thể lịch sử/edition không xác định; browser/mobile/touch/accessibility/balance/playtest và quyền tên route cũ còn pending; chưa public, PR, merge hay deploy.


## Candidate Ô Ăn Quan — 07/10/2026

Đã thay route cũ một người/máy bằng game hai người tại chỗ: 10 ô dân, 2 ô quan, rải một vòng theo một trong hai chiều, relay sowing, capture qua ô trống và chuỗi bắt; tự bù năm dân khi bên đang đi trống nếu đủ điểm, thiếu thì thua; hai Quan hết thì thu dân và so điểm. Nguồn Cục Du lịch được index nhưng trang timeout, cổng giáo dục mầm non Hà Nội mô tả một cách chơi có biến thể/đề xuất nợ, sản phẩm Ô Ăn Quan Online công bố một bộ luật riêng với các mode khác. Candidate khóa bộ default hai người, không chọn Lật bàn/Quan Già/ba người/đồng hồ. 11 model + 4 DOM-double UI/lifecycle tests pass. Full suite 625/625; release preflight pass: 150/42/108, 106 asset records, JS1.040.134 bytes, source assets 19.786.444 bytes. Artifact có `o-an-quan-original.svg`, loại `o_an_quan_cover.png`. Không claim exact historic parity; browser/mobile/accessibility/playtest và quyền route/title pending.


## Candidate Cá Lớn Nuốt Cá Bé — 07/10/2026

Đã thay demo cũ bằng một lượt chơi ngắn: điều khiển cá ăn cá nhỏ hơn để lớn dần, né cá lớn; ăn 12 con để thắng, hết 3 lượt va chạm hoặc hết 90 giây thì kết thúc. Dùng phím mũi tên/WASD hoặc giữ rê chuột/ngón tay; không có dash, thanh frenzy, shop, power-up hay chiến dịch. EA xác nhận vòng tăng trưởng ăn cá nhỏ; trang Xbox 2006 và tài liệu Xbox không xác định bản trên danh mục, không claim parity. 6 model + 4 DOM-double UI/lifecycle tests pass; full suite hiện tại 728/728 pass, preflight tĩnh 150/42/108, 114 asset records, JavaScript 1.113.392 bytes, source assets 19.810.082 bytes. Nghệ thuật SVG/canvas do dự án tạo; loại cover cũ `ca_lon_nuot_ca_be_cover.png` chưa rõ quyền khỏi artifact. Browser/device/accessibility/balance/playtest và quyền title/route vẫn pending.


## Candidate Rắn Săn Mồi — 07/10/2026

Đã tích hợp game rắn ô lưới nguyên bản: ăn hạt để dài và tăng điểm; đụng tường hoặc thân thì kết thúc. Điều khiển bằng phím hoặc nút hướng chạm; có tạm dừng, chơi lại và lưu kỷ lục. Hướng tham chiếu là Snake một người trên Nokia 6110 từ hướng dẫn 1998, không dùng luật chướng ngại của Snake II; chưa rõ chính xác bản/tuning. 7 model + 5 DOM-double UI/lifecycle tests pass. Art/UI do dự án tạo; badge Nokia được bỏ, cover SVG gốc được manifest hóa, cover cũ `snake_cover.png` loại khỏi artifact. Kiểm tra tích hợp cùng full suite 728/728; preflight tĩnh 150/42/108, 114 asset records, JavaScript 1.113.392 bytes, source assets 19.810.082 bytes. Quyền title/route, browser/device/accessibility/playtest còn pending.


## Candidate Mạch Gió — 07/10/2026

Đã tích hợp game bay một nút: chạm/nhấn Space tạo một nhịp nâng, thả ra thì rơi; qua khe đá được một điểm. Ba va chạm kết thúc lượt cuối; ba mạng và giữ điểm qua va chạm là khác biệt được ghi rõ so với vòng tham chiếu một va chạm. Nguồn phỏng vấn người tạo và báo cáo đương thời xác nhận vòng chơi rộng, không cho biết các thông số vật lý; tuning hiện tại do dự án tự chọn. 11 focused tests pass. Art/CSS/SVG do dự án tạo và cover đã vào manifest. Kiểm tra tích hợp cùng full suite 728/728; preflight tĩnh 150/42/108, 114 asset records, JavaScript 1.113.392 bytes, source assets 19.810.082 bytes. Browser/device/accessibility/feel/playtest và quyền ID/title/route vẫn pending.


## Candidate Vườn Bật Nảy — 08/10/2026

Đã tích hợp game vuốt quả bay lấy điểm, né cầu đen; ba quả lọt hoặc chém phải cầu thì kết thúc lượt. Lượt chạy 60 giây; bộ đếm điểm, thời gian và số quả hụt hiển thị gọn. Phím mũi tên định tâm, Space chém ngắn; vuốt chuột/chạm là cách chơi chính. Halfbrick Support mô tả các mode Classic và Arcade riêng; bản trên danh mục chưa xác định, thông số hiện tại là lựa chọn thiết kế. 5 model + 3 DOM-double UI/lifecycle tests pass; full suite 728/728 pass, preflight tĩnh 150/42/108, 114 asset records, JavaScript 1.113.392 bytes, source assets 19.810.082 bytes. Nguồn ảnh là SVG tự tạo; cover đã ghi vào manifest. Browser/device/accessibility/feel/playtest cùng quyền title/route còn pending.


## Candidate Phá Gạch — 08/10/2026

Đã tích hợp game bóng và thanh đỡ: phóng bóng, giữ nó trong bàn, phá các hình gạch do candidate tự tạo để sang màn; mỗi viên ghi 10 điểm, có ba lượt. Bàn và tốc độ tiếp tục theo công thức nguyên bản; không dùng power-up, multiball, laser, bảng, nhạc, mã nguồn hay ảnh của DX-Ball. Atari xác nhận vòng paddle-and-ball chung; tài liệu DX-Ball 1.07 được host bên thứ ba, còn trang nhà phát triển ghi bản 1.09, nên không xác định chính xác edition của danh mục. Điều khoản readme không cho sửa/đóng gói thương mại bản gốc; quyền reuse asset/mã/bảng chưa rõ. 14 focused model/UI tests pass; full suite 728/728 pass, preflight tĩnh 150/42/108, 114 asset records, JavaScript 1.113.392 bytes, source assets 19.810.082 bytes. Cover SVG tự tạo đã vào manifest; tên hiển thị là Phá Gạch, không claim parity. Browser/device/audio/accessibility/playtest và clearance trademark còn pending.


## Candidate Đẩy Thùng — 08/10/2026

Đã tích hợp ba phòng puzzle lưới nguyên bản: đẩy từng thùng vào đúng ô, không thể kéo; bế tắc thì hoàn tác hoặc chơi lại. Dùng phím mũi tên/WASD, bấm ô, vuốt hoặc d-pad chạm. Sokoban Online và University of Alberta xác nhận luật push-only chung; edition trong danh mục không rõ. Không dùng bản đồ, artwork, logo hay đoạn hướng dẫn lịch sử. 7 model + 10 DOM-double UI/lifecycle tests pass; full suite 728/728 và preflight tĩnh pass: 150/42/108, 114 asset records, JavaScript 1.113.392 bytes, source assets 19.810.082 bytes. Cover SVG tự tạo đã vào manifest. Browser/device/accessibility/playtest và quyền title/route còn pending.


## Candidate Bóng Bàn Cổ Điển — 08/10/2026

Đã đổi mặc định sang một người đấu máy CPU đơn giản; có nút chuyển nhanh sang hai người cùng máy. Mỗi bên điều khiển một vợt, đỡ bóng đưa qua phía kia; đạt bảy điểm thắng. Solo dùng mũi tên/W/S và AI có tốc độ phản hồi giới hạn thấp hơn người chơi; 2P dùng W/S bên trái, mũi tên bên phải, kéo bàn hoặc nút chạm. Computer History Museum và Strong Museum hỗ trợ vòng paddle-ball chung và lịch sử năm 1972, nhưng bản trên danh mục không xác định chính xác cabinet/edition; bảy điểm, nhịp giao bóng và tuning là lựa chọn thiết kế. Art/SVG do dự án tạo, âm thanh synth tại chỗ; cover đã vào manifest. 10 focused model/UI tests pass; full suite 728/728, preflight tĩnh 150/42/108, 114 asset records, JavaScript 1.113.392 bytes, source assets 19.810.082 bytes. Browser/device/multi-touch/audio/accessibility/playtest và quyền title/route còn pending.


## Candidate Xếp Bài Bốn Ô — 08/10/2026

Đã tích hợp FreeCell với bộ bài 52 lá chia ngửa thành tám cột, bốn ô trống và bốn nền; xếp giảm dần xen màu, dùng khả năng chuyền dãy theo ô/cột trống và đưa đủ bài lên nền để thắng. Bản tham chiếu là hướng dẫn Classic FreeCell của Freecell.com, không xác định edition trong catalog; không claim parity. Bộ luật chọn rõ không trả bài khỏi nền, cột trống nhận quân bất kỳ, deal ngẫu nhiên không được solver xác minh. Bàn, CSS và cover SVG tự tạo. 6 model + 3 DOM-double UI tests; full suite 911/911. Browser/device/accessibility/playtest và quyền tên route lịch sử còn pending.

## Candidate Tuyến Sáng — 08/10/2026

Đã mở rộng **Tuyến Sáng** thành campaign ba chặng: Mạch Sương cần 3 mục tiêu, Vành Lục 5, Lõi Rạng 7; mục tiêu bay và tia bắn tăng tốc theo chặng. Mỗi chặng đã qua có khoảng nghỉ 1,5 giây, xóa đạn đối phương và cấp khiên ngắn; hạ mục tiêu thứ 15 thắng, còn sống tới 60 giây là kết quả riêng. Giữ điều khiển lái/bắn solo và hình học tự tạo; không thêm menu chọn mode. CI5 có nhiều edition/format nhưng danh mục không chỉ phiên bản; nguồn Bandai Namco chỉ dùng cho vòng shooter chung. 6 model + 6 DOM-double UI/lifecycle tests pass; Chromium smoke mới được thêm để kiểm tra vào chặng hai, đang chờ CI. Browser/device/accessibility/balance/playtest cùng quyền title/route còn pending.

## Candidate Bài Nhện — 08/10/2026

Đã tích hợp Bài Nhện solo một chất: hai bộ 52 lá, mười cột chia 6/5 lá, năm hàng stock, tám dãy cùng chất từ K xuống A tự dọn. Stock chỉ chia khi cả mười cột có bài; run chuyển cùng chất; undo/restart/new deal. Candidate chọn biến thể one-suit/Easy, không biết edition trong catalog và không claim parity. MobilityWare và Arkadium support rules là nguồn vận hành sơ cấp cho các sản phẩm của họ. 7 model + 3 DOM-double UI/route/copy tests pass; cover SVG mới đã vào manifest. Browser/device/drag/touch/screen-reader/playtest và quyền tên/route còn pending.

## Candidate Vệ Tinh Giữ Quỹ Đạo — 08/10/2026

Đã tích hợp paddle-ball ba vòng, ba lượt, tường màu một hit, bạc hai hit, tường vàng chặn bóng; mỗi vòng có một tường thả capsule nở paddle trong tám giây. Luật tường bạc/vàng lấy từ manual NES Arkanoid 1987; hiệu ứng tám giây, layout và carrier là lựa chọn candidate, không claim parity với entry chưa rõ phiên bản. Art và cover đều tự tạo; optional sound là synth. 8 model + 4 DOM/canvas-double tests pass; local Chromium không khởi động (`socket() EPERM`), nên browser/device/audio/accessibility/balance QA chưa thực hiện. Quyền title/route còn pending.

## Candidate Bi Vòm — 08/10/2026

Đã tích hợp bubble shooter một bảng: ngắm/bắn, dội tường, ghép cụm 3+ cùng màu và làm rơi phần không còn nối với trần; dọn bảng trong 32 lượt. Hình khối đi kèm màu; Taito Journey/Everybubble official pages đối chiếu match-three, dội tường và bubble-shooter genre. Bản catalog không chỉ edition, không claim franchise parity. Cover và art vector do dự án tạo. 8 model + 4 DOM-double UI/lifecycle tests pass; browser/device/touch/accessibility/difficulty/playtest và quyền title/route pending.

## Candidate Ống Nghiệm — 08/10/2026

Đã thêm campaign bốn chai 8×16 nguyên bản trên cùng luật nang: ghép ngang, ghép dọc, nửa không khớp rơi có chủ đích rồi combo tự dọn. Queue cố định theo chai; lần lượt mở khóa/chơi lại; save versioned và phục hồi save lỗi/future schema, lỗi đọc/ghi không chặn chơi. 8 model + 3 campaign + 6 DOM-double UI/lifecycle tests pass; route tests chứng minh lời giải hợp lệ và cơ chế, không xác nhận độ khó cho người. Nintendo NES Dr. Mario manual 1990 chỉ hỗ trợ luật match-four rộng; catalog edition không rõ, không claim parity. Tên, chai, mầm, viên và cover do dự án tạo. Browser/device/screen-reader/visual/feel/balance/playtest và quyền route/title còn pending.

## Candidate Bật Chốt — 08/10/2026

Đã tích hợp một bàn peg puzzle: 54 chốt, 25 chốt cam cần dọn, mười bi; bắn bi nảy qua chốt xanh/cam và tường, khay di động bắt bi để lấy lại lượt. Chốt đã chạm sáng đến khi bi kết thúc lượt, không chấm lại khi va chạm lần nữa. EA official Peggle pages và manual PopCap trên host chính thức được tra cứu cho loop rộng/chốt orange/Free Ball Bucket; số lượng chốt, physics, điểm và luật xóa ở cuối shot là lựa chọn candidate, không claim parity. Art/cover vector tự tạo. 9 model + 3 DOM-double UI/lifecycle tests pass; browser/device/physics feel/balance/accessibility/playtest và quyền title/route còn pending.

## P1A quality follow-up — 08/10/2026

Static review found that Minesweeper exposed live cell objects through `view()`. The model now returns detached cell copies; a regression test mutates the returned array and cells to verify gameplay state remains unchanged. The Hàng Rong service header now exposes both order progress and the minimum shift quota, for example `Giao 0/8 · cần 5`, so the pass target is visible without adding a setup or inventory screen. 2048 and Line 98 already return detached board state and have mutation-isolation tests. Focused P1A model/UI suite passed 182/182; full repository suite passed 977/977. These remain DOM/model checks; real browser/device/playtest acceptance is still pending.
