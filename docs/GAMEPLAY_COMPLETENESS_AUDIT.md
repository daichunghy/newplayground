# Kiểm kê gameplay NewPlayground — 10/10/2026

Tài liệu này phân biệt **game mở được**, **có vòng chơi và tiến trình**, và **tái hiện đầy đủ luật đặc trưng**. Không dùng việc mở canvas thành công để suy diễn game đã hoàn thiện.

- Danh mục trong `data/games.json`: **150** tựa.
- Định tuyến sang engine chuyên biệt: **64** tựa (có thể chia sẻ cùng một engine, cần kiểm thử riêng từng biến thể).
- Định tuyến sang 7 archetype đang chơi được nhưng **chưa đúng toàn bộ luật gốc**: **86** tựa.
- Kiểm thử mô phỏng đã đạt màn 2 ở 7 archetype. Điều này **không xác nhận** toàn bộ chiến dịch của từng game chuyên biệt có thể hoàn thành, hoặc gameplay đã trung thành với tên game.
- `tests/game-flow.test.cjs` kiểm tra 150 lượt mở, đóng, cleanup và các kịch bản qua màn minh họa; cần bổ sung test theo đặc tả riêng và QA trên máy thật.
- Cần QA thủ công với chuột, bàn phím, Android Chrome và iPhone Safari; kiểm tra 60/90/120 Hz, màn cuối, khởi động lại, lưu trữ, cảm ứng đa điểm.

## 7 chế độ fallback

| Chế độ | Số tựa fallback | Tiến trình |
| --- | ---: | --- |
| `shooter` | 11 | Vượt mục tiêu màn → tăng khó → mở màn tiếp; có thua, chơi lại và lưu màn cao nhất |
| `runner` | 19 | Vượt mục tiêu màn → tăng khó → mở màn tiếp; có thua, chơi lại và lưu màn cao nhất |
| `reflex` | 11 | Vượt mục tiêu màn → tăng khó → mở màn tiếp; có thua, chơi lại và lưu màn cao nhất |
| `puzzle` | 16 | Vượt mục tiêu màn → tăng khó → mở màn tiếp; có thua, chơi lại và lưu màn cao nhất |
| `management` | 5 | Vượt mục tiêu màn → tăng khó → mở màn tiếp; có thua, chơi lại và lưu màn cao nhất |
| `quiz` | 7 | Vượt mục tiêu màn → tăng khó → mở màn tiếp; có thua, chơi lại và lưu màn cao nhất |
| `duel` | 17 | Vượt mục tiêu màn → tăng khó → mở màn tiếp; có thua, chơi lại và lưu màn cao nhất |

**Hạn chế quan trọng**: Game được gắn nhãn `launchRetroArcade` chỉ là trò chơi mini theo thể loại tương ứng, chưa phải bản tái dựng đầy đủ hệ thống nhân vật, nhiệm vụ, vật phẩm, luật và cấp độ riêng của tựa game được đặt tên. Các mục này không nên được đánh dấu là “đã hoàn thành gameplay gốc” trong backlog.

## Ma trận định tuyến kiểm kê từ code

| STT | ID | Game | Engine được gọi | Chế độ fallback |
| ---: | --- | --- | --- | --- |
| 1 | `hang-rong` | Hàng Rong | `launchHangRong` | — |
| 2 | `dao-vang` | Đào Vàng | `launchDaoVang` | — |
| 3 | `ban-trung-khung-long` | Bắn Trứng Khủng Long | `launchBanTrung` | — |
| 4 | `kim-cuong-bejeweled` | Kim Cương (Bejeweled) | `launchKimCuong` | — |
| 5 | `line-98` | Line 98 Cổ Điển | `launchLine98` | — |
| 6 | `dat-bom-bomberman` | Đặt Bom (Bomberman) | `launchDatBom` | — |
| 7 | `ban-xe-tang-1990` | Bắn Xe Tăng 1990 | `launchXeTang1990` | — |
| 8 | `nong-trai-vui-ve` | Nông Trại Vui Vẻ | `launchNongTrai` | — |
| 9 | `gunny-2d` | Gunny 2D Tọa Độ | `launchGunny` | — |
| 10 | `nuoi-ca-nemo` | Nuôi Cá Nemo (Insaniquarium) | `launchNuoiCaNemo` | — |
| 11 | `diner-dash` | Diner Dash (Phục Vụ Bàn) | `launchDinerDash` | — |
| 12 | `zuma-ech-ban-ngoc` | Zuma Ếch Bắn Ngọc | `launchZuma` | — |
| 13 | `co-caro` | Cờ Caro Việt Nam | `launchCaro` | — |
| 14 | `co-tuong` | Cờ Tướng Tàn Cuộc | `launchCoTuong` | — |
| 15 | `ban-bi-ve` | Bắn Bi Ve Tuổi Thơ | `launchBanBiVe` | — |
| 16 | `o-an-quan` | Ô Ăn Quan | `launchOAnQuan` | — |
| 17 | `do-min-minesweeper` | Dò Mìn (Minesweeper) | `launchDoMin` | — |
| 18 | `xep-gach-tetris` | Xếp Gạch (Tetris) | `launchTetris` | — |
| 19 | `pac-man` | Pac-Man Ăn Đậu | `launchPacMan` | — |
| 20 | `ran-san-moi-snake` | Rắn Săn Mồi (Snake) | `launchSnake` | — |
| 21 | `plants-vs-zombies-2d` | Plants vs Zombies 2D | `launchPvZ` | — |
| 22 | `feeding-frenzy` | Cá Lớn Nuốt Cá Bé | `launchFeedingFrenzy` | — |
| 23 | `peggle-pachinko` | Peggle Bắn Bi | `launchDXBall` | — |
| 24 | `lemonade-tycoon` | Lemonade Tycoon | `launchRetroArcade` | `management` |
| 25 | `pizza-frenzy` | Pizza Frenzy Giao Bánh | `launchRetroArcade` | `management` |
| 26 | `heavy-weapon` | Heavy Weapon Xe Tăng | `launchXeTang1990` | — |
| 27 | `typer-shark` | Typer Shark Luyện Gõ | `launchRetroArcade` | `quiz` |
| 28 | `chuzzle` | Chuzzle Sinh Vật Lông | `launchKimCuong` | — |
| 29 | `flappy-bird` | Flappy Bird | `launchFlappyBird` | — |
| 30 | `chem-hoa-qua` | Chém Hoa Quả (Fruit Ninja) | `launchFruitNinja` | — |
| 31 | `lua-va-nuoc` | Lửa & Nước (Fireboy & Watergirl) | `launchRetroArcade` | `puzzle` |
| 32 | `mario-co-dien` | Super Mario Cổ Điển | `launchMario` | — |
| 33 | `nguoi-tuyet-snow-bros` | Người Tuyết (Snow Bros) | `launchRetroArcade` | `shooter` |
| 34 | `angry-birds-mini` | Bắn Chim Angry Birds | `launchGunny` | — |
| 35 | `cut-the-rope` | Cắt Dây Cho Ếch Om Nom | `launchRetroArcade` | `puzzle` |
| 36 | `ban-ruoi-galaga` | Bắn Ruồi (Galaga) | `launchChickenInvaders` | — |
| 37 | `pha-gach-dx-ball` | Phá Gạch DX-Ball | `launchDXBall` | — |
| 38 | `day-thung-sokoban` | Đẩy Thùng Sokoban | `launchSokoban` | — |
| 39 | `noi-ong-nuoc-pipemania` | Nối Ống Nước Pipemania | `launchRetroArcade` | `puzzle` |
| 40 | `tro-choi-2048` | Trò Chơi 2048 | `launchGame2048` | — |
| 41 | `xep-bai-nhen-spider` | Xếp Bài Nhện (Spider Solitaire) | `launchRetroArcade` | `puzzle` |
| 42 | `xep-bai-solitaire` | Xếp Bài Solitaire (Klondike) | `launchRetroArcade` | `puzzle` |
| 43 | `xep-bai-freecell` | Xếp Bài FreeCell | `launchRetroArcade` | `puzzle` |
| 44 | `pinball-3d-space-cadet` | Pinball 3D Space Cadet | `launchRetroArcade` | `shooter` |
| 45 | `danh-bai-uno` | Đánh Bài Đổi Màu (Uno) | `launchDanhBaiUno` | — |
| 46 | `dap-chuot-chui` | Đập Chuột Chũi Whac-A-Mole | `launchRetroArcade` | `reflex` |
| 47 | `xay-cau-bridge-builder` | Xây Cầu Vật Lý (Bridge Builder) | `launchRetroArcade` | `puzzle` |
| 48 | `truc-thang-heli-attack` | Trực Thăng Bắn Súng (Heli Attack) | `launchRetroArcade` | `runner` |
| 49 | `thu-thanh-bloons-td` | Thủ Thành Khỉ Ném Phi Tiêu | `launchPvZ` | — |
| 50 | `contra-2d` | Contra 2D Cổ Điển | `launchRetroArcade` | `shooter` |
| 51 | `bong-bong-nuoc-bubble-trouble` | Bắn Bong Bóng Nước (Bubble Trouble) | `launchRetroArcade` | `reflex` |
| 52 | `crossy-road` | Băng Qua Đường (Crossy Road) | `launchRetroArcade` | `runner` |
| 53 | `sonic-chay-nhanh` | Nhím Sonic Chạy Nhanh | `launchMario` | — |
| 54 | `dua-xe-nam-mario-kart` | Đua Xe Nấm Mini | `launchMario` | — |
| 55 | `pong-1972` | Bóng Bàn Cổ Điển (Pong) | `launchPong` | — |
| 56 | `rambo-lun-metal-slug` | Rambo Lùn (Metal Slug Mini) | `launchRetroArcade` | `shooter` |
| 57 | `excitebike-dua-xe-dia-hinh` | Đua Xe Đạp Địa Hình (Excitebike) | `launchRetroArcade` | `runner` |
| 58 | `dr-mario-diet-khuan` | Bác Sĩ Diệt Khuẩn (Dr. Mario) | `launchMario` | — |
| 59 | `circus-charlie-xiec` | Xiếc Khỉ Nhảy Lửa (Circus Charlie) | `launchRetroArcade` | `runner` |
| 60 | `kung-fu-master` | Kung Fu Thiếu Lâm Tự | `launchRetroArcade` | `duel` |
| 61 | `nem-lon-truong-lang` | Ném Lon Trường Làng | `launchRetroArcade` | `reflex` |
| 62 | `tat-lon-via-he` | Tạt Lon Vỉa Hè | `launchRetroArcade` | `reflex` |
| 63 | `ban-ga-vu-tru` | Bắn Gà Vũ Trụ (Chicken Invaders) | `launchChickenInvaders` | — |
| 64 | `rong-den-mortal-kombat` | Rồng Đen 2D Mini | `launchRetroArcade` | `duel` |
| 65 | `co-ca-ngua` | Cờ Cá Ngựa Việt Nam | `launchRetroArcade` | `duel` |
| 66 | `co-ty-phu-monopoly` | Cờ Tỷ Phú Mini | `launchRetroArcade` | `duel` |
| 67 | `ai-la-trieu-phu` | Ai Là Triệu Phú Mini | `launchRetroArcade` | `quiz` |
| 68 | `duo-hinh-bat-chu` | Đoán Hình Bắt Chữ | `launchRetroArcade` | `quiz` |
| 69 | `tim-diem-khac-biet` | Tìm Điểm Khác Biệt | `launchRetroArcade` | `puzzle` |
| 70 | `thap-ha-noi-tower` | Tháp Hà Nội Cổ Điển | `launchSokoban` | — |
| 71 | `piano-tiles-phim-nhac` | Phím Nhạc Rơi (Piano Tiles) | `launchRetroArcade` | `reflex` |
| 72 | `among-us-impostor` | Ai Là Kẻ Giả Mạo? (Among Us) | `launchRetroArcade` | `quiz` |
| 73 | `skribbl-ve-doan-chu` | Vẽ Hình Đoán Chữ (Skribbl) | `launchRetroArcade` | `quiz` |
| 74 | `bi-lac-ban-go` | Bi Lắc Bàn Gỗ (Foosball) | `launchPong` | — |
| 75 | `keo-co-doi-khang` | Kéo Co Đối Kháng | `launchRetroArcade` | `duel` |
| 76 | `lat-the-tri-nho` | Pikachu 2003 Cổ Điển | `launchPikachu` | — |
| 77 | `khoi-rubik-mini` | Khối Rubik 2x2 Mini | `launchRetroArcade` | `puzzle` |
| 78 | `ninja-cuu-me` | Ninja Cứu Mẹ (Legend of Kage) | `launchRetroArcade` | `shooter` |
| 79 | `bomberman-93-arena` | Đấu Trường Bomberman 4 Người | `launchDatBom` | — |
| 80 | `dua-xe-micro-machines` | Đua Xe Đồ Chơi (Micro Machines) | `launchRetroArcade` | `runner` |
| 81 | `puzzle-bobble-khung-long` | Khủng Long Bắn Bóng (Puzzle Bobble) | `launchBanTrung` | — |
| 82 | `arkanoid-dap-gach` | Arkanoid Đập Gạch Không Gian | `launchDXBall` | — |
| 83 | `sky-garden-khu-vuon-tren-may` | Khu Vườn Trên Mây | `launchNongTrai` | — |
| 84 | `dao-rong-dragon-island` | Ấp Trứng Đảo Rồng | `launchNuoiCaNemo` | — |
| 85 | `tien-len-mien-nam` | Tiến Lên Miền Nam Cổ Điển | `launchRetroArcade` | `duel` |
| 86 | `phi-tieu-bong-bong` | Phi Tiêu Nổ Bóng Bay | `launchRetroArcade` | `reflex` |
| 87 | `gap-thu-bong-dien-tu` | Gắp Thú Bông Điện Tử | `launchRetroArcade` | `shooter` |
| 88 | `tam-cuc-co-dien` | Tổ Tôm Tam Cúc | `launchRetroArcade` | `duel` |
| 89 | `nem-vong-co-chai` | Ném Vòng Cổ Chai | `launchRetroArcade` | `reflex` |
| 90 | `lac-bau-cua-tom-ca` | Lắc Bầu Cua Tôm Cá | `launchRetroArcade` | `duel` |
| 91 | `chay-tron-canh-sat-subway` | Chạy Trên Đường Ray (Subway Runner) | `launchMario` | — |
| 92 | `nguoi-que-ban-cung` | Người Que Bắn Cung (Stickman Archer) | `launchGunny` | — |
| 93 | `dau-vat-hai-nguoi` | Đấu Vật Hai Người (Wrestle Jump) | `launchRetroArcade` | `duel` |
| 94 | `thoi-bong-xa-phong` | Thổi Bong Bóng Xà Phòng | `launchRetroArcade` | `puzzle` |
| 95 | `tiem-banh-ngot-ba-baker` | Tiệm Bánh Ngọt Cupcake | `launchRetroArcade` | `management` |
| 96 | `dap-ruoi-ban-tay` | Đập Ruồi Bàn Tay Vàng | `launchRetroArcade` | `reflex` |
| 97 | `xe-dap-giao-bao` | Cậu Bé Giao Báo (Paperboy) | `launchRetroArcade` | `runner` |
| 98 | `dau-truong-xe-dung` | Xe Đụng Hội Chợ | `launchRetroArcade` | `runner` |
| 99 | `gap-chu-cho-qua-duong` | Dắt Cún Qua Đường | `launchRetroArcade` | `puzzle` |
| 100 | `tiem-sach-cu-pho-co` | Tiệm Sách Cũ Phố Cổ | `launchRetroArcade` | `management` |
| 101 | `boom-online-bnb` | Boom Online (BnB) | `NP_Retro50Engines` | — |
| 102 | `audition-nhip-dieu` | Audition 4 Phím Space | `NP_Retro50Engines` | — |
| 103 | `road-rash-dua-xe-moto` | Đua Xe Quái Xế (Road Rash) | `NP_Retro50Engines` | — |
| 104 | `rockman-mega-man` | Người Máy Xanh (Mega Man) | `NP_Retro50Engines` | — |
| 105 | `duck-hunt-ban-vit` | Bắn Vịt Cỏ 8-Bit (Duck Hunt) | `NP_Retro50Engines` | — |
| 106 | `adventure-island-dao-hoang` | Đảo Phiêu Lưu (Adventure Island) | `launchRetroArcade` | `runner` |
| 107 | `street-fighter-2-doi-khang` | Đấu Sĩ Đường Phố (Street Fighter II) | `NP_Retro50Engines` | — |
| 108 | `prince-of-persia-1989` | Hoàng Tử Ba Tư Cổ Điển | `launchRetroArcade` | `runner` |
| 109 | `bubble-bobble-khung-long-bong-bong` | Khủng Long Nhả Bóng (Bubble Bobble) | `NP_Retro50Engines` | — |
| 110 | `age-of-war-thoi-dai-chien-tranh` | Thời Đại Chiến Tranh (Age of War) | `NP_Retro50Engines` | — |
| 111 | `bloxorz-khoi-da-lan` | Khối Đá Lăn Bloxorz | `NP_Retro50Engines` | — |
| 112 | `raft-wars-ban-sung-phao` | Bắn Phao Raft Wars | `NP_Retro50Engines` | — |
| 113 | `papa-pizzeria-tiem-banh-pizza` | Tiệm Bánh Pizza Của Papa | `launchRetroArcade` | `management` |
| 114 | `stick-war-chien-tranh-nguoi-que` | Chiến Tranh Người Que (Stick War) | `launchRetroArcade` | `duel` |
| 115 | `defend-your-castle-thu-thanh-nguoi-que` | Bảo Vệ Lâu Đài (Defend Your Castle) | `launchPvZ` | — |
| 116 | `donkey-kong-1981` | Vượn Khổng Lồ Ném Thùng | `launchRetroArcade` | `runner` |
| 117 | `dig-dug-dao-dat-bom-quai` | Đào Hầm Bơm Bong Bóng (Dig Dug) | `launchDatBom` | — |
| 118 | `pooyan-lon-me-ban-bong` | Heo Mẹ Bắn Nỏ (Pooyan) | `launchRetroArcade` | `reflex` |
| 119 | `yie-ar-kung-fu-vo-dai` | Đấu Võ Đường Thiếu Lâm | `launchRetroArcade` | `duel` |
| 120 | `asteroids-tau-ban-thien-thach` | Phi Thuyền Bắn Thiên Thạch | `launchRetroArcade` | `shooter` |
| 121 | `frogger-ech-bang-qua-duong` | Chú Ếch Sang Sông (Frogger) | `launchRetroArcade` | `runner` |
| 122 | `elevator-action-diep-vien-thang-may` | Điệp Viên Thang Máy | `launchRetroArcade` | `runner` |
| 123 | `double-dragon-hiep-si-rong-doi` | Rồng Đôi Song Thủ | `launchRetroArcade` | `duel` |
| 124 | `golden-axe-riu-vang` | Rìu Vàng Cổ Đại (Golden Axe) | `launchRetroArcade` | `duel` |
| 125 | `cadillacs-dinosaurs-bo-doi` | Bộ Đội Khủng Long | `launchRetroArcade` | `duel` |
| 126 | `snowcraft-nem-tuyet-3v3` | Ném Tuyết Tuổi Thơ (Snowcraft) | `launchRetroArcade` | `reflex` |
| 127 | `bowman-nguoi-que-ban-cung` | Xạ Thủ Căn Gió Bowman | `launchGunny` | — |
| 128 | `line-rider-truot-tuyet-vat-ly` | Bút Vẽ Trượt Ván (Line Rider) | `launchRetroArcade` | `puzzle` |
| 129 | `boulder-dash-tho-dao-ngoc` | Thợ Đào Ngọc Hầm Đá | `launchRetroArcade` | `puzzle` |
| 130 | `moorhuhn-ban-ga-dam-lay` | Thợ Săn Gà Rừng (Moorhuhn) | `launchChickenInvaders` | — |
| 131 | `gun-mayhem-dau-sung-loan-da` | Đấu Súng Loạn Đả Sàn Rơi | `launchRetroArcade` | `duel` |
| 132 | `electric-man-2-vo-thuat-nguoi-que` | Người Que Ma Trận | `launchRetroArcade` | `duel` |
| 133 | `fancy-pants-chay-nhay-quan-cam` | Chàng Quần Cam Lướt Gió | `launchRetroArcade` | `runner` |
| 134 | `impossible-quiz-do-vui-xoan-nao` | Đố Mẹo Xoắn Não | `launchRetroArcade` | `quiz` |
| 135 | `centipede-ban-sau-ret` | Bắn Sâu Rết Nấm Rừng | `launchRetroArcade` | `shooter` |
| 136 | `qbert-nhay-khoi-lap-phuong` | Nhảy Bậc Kim Tự Tháp | `launchRetroArcade` | `puzzle` |
| 137 | `1942-khong-chien-thai-binh-duong` | Không Chiến Thái Bình Dương | `launchRetroArcade` | `shooter` |
| 138 | `shinobi-ninja-phi-tieu` | Nhẫn Giả Cứu Con Tin | `launchRetroArcade` | `reflex` |
| 139 | `chip-dale-soc-chuot-cuu-ho` | Sóc Chuột Cứu Hộ Đội | `launchRetroArcade` | `runner` |
| 140 | `tiny-toon-tho-buster-phieu-luu` | Thỏ Nhanh Nhẹn Tiny Toon | `launchRetroArcade` | `runner` |
| 141 | `balloon-fight-dap-bong-bay` | Đập Bóng Bay Tầng Không | `launchRetroArcade` | `shooter` |
| 142 | `ice-climber-dap-bang-leo-nui` | Đập Băng Leo Đỉnh Núi | `launchRetroArcade` | `runner` |
| 143 | `mappy-chuot-canh-sat-nhay-bat` | Chuột Cảnh Sát Đệm Lò Xo | `launchRetroArcade` | `runner` |
| 144 | `twinbee-ban-chuong-bay` | Bắn Chuông Mây Biến Màu | `launchRetroArcade` | `shooter` |
| 145 | `worms-armageddon-giun-chien-tranh` | Giun Đất Bộc Phá (Worms 2D) | `launchRetroArcade` | `duel` |
| 146 | `digger-xe-ui-dao-ham` | Xe Ủi Đào Vàng Hầm Ngầm | `launchRetroArcade` | `puzzle` |
| 147 | `bookworm-sau-noi-chu` | Mọt Sách Nối Chữ (Bookworm) | `launchRetroArcade` | `quiz` |
| 148 | `atomix-ghep-phan-tu-hoa-hoc` | Ghép Phân Tử Hóa Học | `launchRetroArcade` | `puzzle` |
| 149 | `icy-tower-thap-bang-nhay-cao` | Tháp Băng Nhảy Cực Hạn | `launchRetroArcade` | `runner` |
| 150 | `hamsterball-lan-cau-hamster` | Lăn Cầu Chuột Hamster | `launchRetroArcade` | `runner` |

## Điều kiện cần để đánh dấu “hoàn thiện”

Một game chỉ nên được chấp nhận khi có (1) cơ chế chơi và mục tiêu đúng đặc tả; (2) trạng thái thắng, thua, restart, pause; (3) chuyển ải/round thực sự với độ khó tăng; (4) kiểm tra đầu vào từ bàn phím, chuột và cảm ứng; (5) cleanup sau chuyển game; (6) kiểm thử logic các cấp đầu, giữa và cuối, bao gồm save/load nếu có.

