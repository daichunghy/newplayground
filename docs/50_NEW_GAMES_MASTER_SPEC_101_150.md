# BÁO CÁO NGHIÊN CỨU & ĐẶC TẢ CHI TIẾT 50 TỰA GAME HOÀI NIỆM MỚI (101 - 150)
## HỆ SINH THÁI NEWPLAYGROUND • NES • ARCADE THÙNG • POPCAP • FLASH • PC 1980-2000s
**Slogan:** Play a little. Feel a little happier.  
**Tiêu chuẩn văn bản:** Ưu tiên font Calibri (cỡ 10-12pt cho nội dung, 12-16pt cho đề mục), hiển thị sắc nét, thoáng mắt, chuẩn dấu tiếng Việt tuyệt đối trên mọi nền tảng.  
**Trạng thái:** Sẵn sàng tích hợp 100% vào `data/games.json`, `games-data.js` và phát triển các Engine Canvas 2D / Web Audio.

---

## 1. TỔNG QUAN CHIẾN LƯỢC MỞ RỘNG DANH MỤC GAME (101 - 150)

Tiếp nối bộ sưu tập 100 trò chơi hiện có của NewPlayground, danh mục **50 tựa game tuổi thơ huyền thoại tiếp theo (STT 101 - 150)** được nghiên cứu và chọn lọc từ 4 nguồn di sản giải trí đỉnh cao gắn liền với ký ức thế hệ 8x, 9x và Gen Z đời đầu:
1. **NES / Famicom 8-Bit (Điện tử 4 nút vàng son):** Mega Man, Duck Hunt, Adventure Island, Pooyan, Balloon Fight, Ice Climber, TwinBee, Chip 'n Dale, Tiny Toon.
2. **Arcade Thùng (Xèng / MAME / Neo Geo / Capcom 1980-1990s):** Street Fighter II, Cadillacs & Dinosaurs (Bộ đội), Double Dragon, Golden Axe, Bubble Bobble, Donkey Kong 1981, Dig Dug, Yie Ar Kung-Fu, Frogger, Elevator Action, 1942, Shinobi, Centipede, Q*bert.
3. **Web Flash Huyền Thoại (Miniclip, Armor Games, Newgrounds, GameVui 2000s):** Boom Online BnB, Age of War, Bloxorz, Raft Wars, Papa's Pizzeria, Stick War, Defend Your Castle, Snowcraft, Bowman, Line Rider, Gun Mayhem, Electric Man 2, Fancy Pants Adventures, The Impossible Quiz.
4. **PC / Windows / PopCap Kinh Điển (1980-2000s):** Road Rash, Audition 4 phím, Moorhuhn, Worms Armageddon, Asteroids, Boulder Dash, Digger, Bookworm, Atomix, Icy Tower, Hamsterball.

### Tiêu Chuẩn Thiết Kế "Cảm Giác Tay" (Tactile Game Feel & Juice)
Mỗi trò chơi được đặc tả cặn kẽ 4 yếu tố xúc giác:
- **Responsive Controls:** Phím điều khiển nhạy bén, bố trí phím công thái học, hỗ trợ D-pad cảm ứng và vuốt màn hình.
- **Screenshake Physics:** Cường độ rung chấn (Trauma system với công thức suy giảm $Trauma = \max(0, Trauma - \Delta t 	imes 	ext{decay})$).
- **Hitstop (Khựng hình tác động):** Tạm dừng cập nhật logic (Micro-freeze 20-100ms) tạo độ nặng, độ đầm và độ dứt khoát của cú va chạm.
- **Procedural Web Audio SFX:** 100% âm thanh tổng hợp thời gian thực từ Web Audio API (không phụ thuộc asset audio ngoài, chống vi phạm bản quyền và giảm dung lượng tải).
- **Particle Sparks / Bursts:** Hệ thống hạt vật lý bung tỏa đa hướng (vận tốc ngẫu nhiên, lực cản không khí, trọng lực, phai màu theo thời gian).


---

## 2. BẢNG TỔNG HỢP DANH MỤC 50 TRÒ CHƠI MỚI (101 - 150)

| STT | ID | Tên Trò Chơi | Nguyên Bản (Gốc) | Thể Loại | Người Chơi | Thời Lượng | Tagline Cảm Xúc |
| :---: | :--- | :--- | :--- | :---: | :---: | :---: | :--- |
| **101** | `boom-online-bnb` | **Boom Online (BnB)** | Crazy Arcade / BnB (Nexon 2001) | Hành động | 1-4 người | 3-5 phút | Bọc bóng nước, kẹp đối thủ, chạy tìm kim châm giải cứu! |
| **102** | `audition-nhip-dieu` | **Audition 4 Phím Space** | Audition Online (T3 Entertainment / VTC Game 2004) | Kỹ năng | 1-6 người | 3-4 phút | Canh nốt Perfect, gõ phím Space vang dội cả quán net! |
| **103** | `road-rash-dua-xe-moto` | **Đua Xe Quái Xế (Road Rash)** | Road Rash (Electronic Arts 1991/1995) | Hành động | 1-2 người | 3-6 phút | Đạp xe đối thủ, vung xích sắt, né xe cảnh sát giao thông! |
| **104** | `rockman-mega-man` | **Người Máy Xanh (Mega Man)** | Mega Man / Rockman (Capcom 1987) | Hành động | 1 người | 5-10 phút | Nạp đạn tụ lực Mega Buster, vượt chông gai đoạt vũ khí Boss! |
| **105** | `duck-hunt-ban-vit` | **Bắn Vịt Cỏ 8-Bit (Duck Hunt)** | Duck Hunt (Nintendo NES 1984) | Kỹ năng | 1 người | 2-4 phút | Canh nòng súng ngắm, đừng để chú chó săn cười nhạo! |
| **106** | `adventure-island-dao-hoang` | **Đảo Phiêu Lưu (Adventure Island)** | Hudson's Adventure Island (Hudson Soft 1986) | Hành động | 1 người | 4-8 phút | Cưỡi ván trượt, ném rìu đá, nhặt chuối giữ thanh sinh mệnh! |
| **107** | `street-fighter-2-doi-khang` | **Đấu Sĩ Đường Phố (Street Fighter II)** | Street Fighter II: The World Warrior (Capcom 1991) | Đối kháng | 1-2 người | 3-5 phút | Hadouken nổ chưởng, Shoryuken thấu trời, hạ gục võ đài thế giới! |
| **108** | `prince-of-persia-1989` | **Hoàng Tử Ba Tư Cổ Điển** | Prince of Persia (Jordan Mechner / Brøderbund 1989) | Hành động | 1 người | 5-15 phút | 60 phút sinh tử, bước chân rón rén né hầm chông và kiếm sĩ! |
| **109** | `bubble-bobble-khung-long-bong-bong` | **Khủng Long Nhả Bóng (Bubble Bobble)** | Bubble Bobble (Taito 1986) | Hành động | 1-2 người | 3-6 phút | Thổi bọc quái vật, nhảy dẫm vỡ bóng thu gom chuối ngọt! |
| **110** | `age-of-war-thoi-dai-chien-tranh` | **Thời Đại Chiến Tranh (Age of War)** | Age of War (Louissi / Armor Games 2007) | Chiến thuật | 1 người | 5-10 phút | Từ người tiền sử cầm dùi cui đến xe tăng công nghệ tương lai! |
| **111** | `bloxorz-khoi-da-lan` | **Khối Đá Lăn Bloxorz** | Bloxorz (Damien Clarke / DX Interactive 2007) | Giải đố | 1 người | 3-8 phút | Lật khối chữ nhật 3D, căn từng bước rớt trúng hố vuông! |
| **112** | `raft-wars-ban-sung-phao` | **Bắn Phao Raft Wars** | Raft Wars (Martijn Kunst 2007) | Kéo thả | 1-2 người | 3-6 phút | Đạn tennis ngắm bắn, bảo vệ rương vàng trên bè phao biển xanh! |
| **113** | `papa-pizzeria-tiem-banh-pizza` | **Tiệm Bánh Pizza Của Papa** | Papa's Pizzeria (Flipline Studios 2007) | Quản lý | 1 người | 4-8 phút | Cán bột, rải đều topping, canh lò giòn rụm làm hài lòng thực khách! |
| **114** | `stick-war-chien-tranh-nguoi-que` | **Chiến Tranh Người Que (Stick War)** | Stick War (Jason Whitham / Brock White 2009) | Chiến thuật | 1 người | 6-12 phút | Đào vàng, rèn kiếm sĩ, giương cung phá hủy tượng đài đối phương! |
| **115** | `defend-your-castle-thu-thanh-nguoi-que` | **Bảo Vệ Lâu Đài (Defend Your Castle)** | Defend Your Castle (XGen Studios 2003) | Kỹ năng | 1 người | 3-6 phút | Nắm bổng kẻ địch quăng lên trời, gia cố tường thành trước biển người que! |
| **116** | `donkey-kong-1981` | **Vượn Khổng Lồ Ném Thùng** | Donkey Kong (Nintendo 1981 - Shigeru Miyamoto) | Hành động | 1 người | 3-5 phút | Leo giàn giáo, nhảy né thùng gỗ lăn cứu lấy người đẹp! |
| **117** | `dig-dug-dao-dat-bom-quai` | **Đào Hầm Bơm Bong Bóng (Dig Dug)** | Dig Dug (Namco 1982) | Hành động | 1 người | 3-6 phút | Đào địa đạo lòng đất, cắm ống bơm phồng tiêu diệt quái vật! |
| **118** | `pooyan-lon-me-ban-bong` | **Heo Mẹ Bắn Nỏ (Pooyan)** | Pooyan (Konami 1982) | Kỹ năng | 1 người | 3-5 phút | Lên xuống giỏ kéo, bắn rách bóng bay của bầy sói đói! |
| **119** | `yie-ar-kung-fu-vo-dai` | **Đấu Võ Đường Thiếu Lâm** | Yie Ar Kung-Fu (Konami 1985) | Đối kháng | 1-2 người | 3-5 phút | Thập lục tuyệt kỹ đấm đá, tỷ thí từng đệ nhất cao thủ võ lâm! |
| **120** | `asteroids-tau-ban-thien-thach` | **Phi Thuyền Bắn Thiên Thạch** | Asteroids (Atari 1979 - Lyle Rains / Ed Logg) | Kỹ năng | 1 người | 3-6 phút | Trôi dạt không trọng lực, bắn vỡ đá vụn giữa dải ngân hà! |
| **121** | `frogger-ech-bang-qua-duong` | **Chú Ếch Sang Sông (Frogger)** | Frogger (Konami / Sega 1981) | Kỹ năng | 1 người | 2-4 phút | Canh nhịp qua xa lộ xe cộ, nhảy trên mai rùa về tổ đầm lầy! |
| **122** | `elevator-action-diep-vien-thang-may` | **Điệp Viên Thang Máy** | Elevator Action (Taito 1983) | Hành động | 1 người | 3-6 phút | Đột nhập cửa đỏ bí mật, đu dây thang máy thoát hiểm tầng hầm! |
| **123** | `double-dragon-hiep-si-rong-doi` | **Rồng Đôi Song Thủ** | Double Dragon (Technōs Japan 1987) | Hành động | 1-2 người | 4-8 phút | Cú hích cùi chỏ, đá xoay người, dẹp loạn đường phố giải cứu mỹ nhân! |
| **124** | `golden-axe-riu-vang` | **Rìu Vàng Cổ Đại (Golden Axe)** | Golden Axe (Sega 1989 - Makoto Uchida) | Hành động | 1-2 người | 4-8 phút | Vung búa chiến binh, cưỡi thằn lằn phun lửa, gọi sấm sét trừng phạt! |
| **125** | `cadillacs-dinosaurs-bo-doi` | **Bộ Đội Khủng Long** | Cadillacs and Dinosaurs (Capcom CPS-1 1993) | Hành động | 1-2 người | 5-10 phút | Cú đá lốc Mustapha, xách súng Uzi giải cứu thế giới khủng long! |
| **126** | `snowcraft-nem-tuyet-3v3` | **Ném Tuyết Tuổi Thơ (Snowcraft)** | Snowcraft (Nstorm 1998) | Kéo thả | 1 người | 2-4 phút | 3 chọi 3 sau bức tường tuyết, kéo thả căn lực ném ngã đội đỏ! |
| **127** | `bowman-nguoi-que-ban-cung` | **Xạ Thủ Căn Gió Bowman** | Bowman (FreeWorldGroup 2004) | Kỹ năng | 1-2 người | 2-5 phút | Đo góc bắn, tính độ lệch gió, một mũi tên xuyên qua khoảng cách nghìn mét! |
| **128** | `line-rider-truot-tuyet-vat-ly` | **Bút Vẽ Trượt Ván (Line Rider)** | Line Rider (Boštjan Čadež 2006) | Chill | 1 người | 3-10 phút | Vẽ đường ray cong vút cho cậu bé trượt ván nảy lộn nhào vô tận! |
| **129** | `boulder-dash-tho-dao-ngoc` | **Thợ Đào Ngọc Hầm Đá** | Boulder Dash (First Star Software 1984 - Peter Liepa) | Giải đố | 1 người | 3-7 phút | Đào đường ngầm gom kim cương, cẩn thận đá tảng sụp đè bẹp dí! |
| **130** | `moorhuhn-ban-ga-dam-lay` | **Thợ Săn Gà Rừng (Moorhuhn)** | Moorhuhn / Crazy Chicken (Phenomedia 1999) | Kỹ năng | 1 người | 2 phút | Lia nòng súng 90 giây, bắn hạ đàn gà rừng ngơ ngác trốn bụi rậm! |
| **131** | `gun-mayhem-dau-sung-loan-da` | **Đấu Súng Loạn Đả Sàn Rơi** | Gun Mayhem (Kevin Gu 2011) | Hành động | 1-4 người | 3-5 phút | Đạn nổ giật tung người, bắn hất đối thủ rơi khỏi mép vực sâu! |
| **132** | `electric-man-2-vo-thuat-nguoi-que` | **Người Que Ma Trận** | Electric Man 2 HS (Damien Clarke 2007) | Đối kháng | 1 người | 3-6 phút | Đòn thế slow-motion xoay người đạp bay kẻ địch tóe tia điện! |
| **133** | `fancy-pants-chay-nhay-quan-cam` | **Chàng Quần Cam Lướt Gió** | The Fancy Pants Adventures (Brad Borne 2006) | Kỹ năng | 1 người | 3-7 phút | Trượt dốc uốn lượn, nhảy bực lò xo, bay bổng cùng chiếc quần cam rực rỡ! |
| **134** | `impossible-quiz-do-vui-xoan-nao` | **Đố Mẹo Xoắn Não** | The Impossible Quiz (Splapp-me-do 2007) | Giải đố | 1 người | 3-8 phút | Suy nghĩ ngược đời, bấm chuột cẩn thận không nổ bom hẹn giờ! |
| **135** | `centipede-ban-sau-ret` | **Bắn Sâu Rết Nấm Rừng** | Centipede (Atari 1981 - Dona Bailey / Ed Logg) | Kỹ năng | 1 người | 2-5 phút | Bắn đứt từng khúc rết uốn éo qua rừng nấm, né bọ chét rơi nhanh! |
| **136** | `qbert-nhay-khoi-lap-phuong` | **Nhảy Bậc Kim Tự Tháp** | Q*bert (Gottlieb 1982 - Warren Davis / Jeff Lee) | Giải đố | 1 người | 3-6 phút | Nhảy đổi màu từng ô lập phương, chửi bới ngộ nghĩnh né rắn Coily! |
| **137** | `1942-khong-chien-thai-binh-duong` | **Không Chiến Thái Bình Dương** | 1942 (Capcom 1984 - Yoshiki Okamoto) | Hành động | 1 người | 3-6 phút | Nhào lộn lượn vòng né đạn pháo, bắn hạ siêu pháo đài bay địch! |
| **138** | `shinobi-ninja-phi-tieu` | **Nhẫn Giả Cứu Con Tin** | Shinobi (Sega 1987) | Hành động | 1 người | 3-7 phút | Phóng phi tiêu shuriken, tung nhẫn thuật lốc xoáy quét sạch sơn tặc! |
| **139** | `chip-dale-soc-chuot-cuu-ho` | **Sóc Chuột Cứu Hộ Đội** | Chip 'n Dale: Rescue Rangers (Capcom 1990) | Hành động | 1-2 người | 4-8 phút | Nhấc thùng gỗ ném mèo Mèo Béo, phối hợp cõng bạn vượt bẫy điện! |
| **140** | `tiny-toon-tho-buster-phieu-luu` | **Thỏ Nhanh Nhẹn Tiny Toon** | Tiny Toon Adventures (Konami 1991) | Hành động | 1 người | 4-8 phút | Lướt chân thỏ Buster, biến hình vịt Plucky bơi lội gom cà rốt vàng! |
| **141** | `balloon-fight-dap-bong-bay` | **Đập Bóng Bay Tầng Không** | Balloon Fight (Nintendo NES 1984 - Satoru Iwata) | Kỹ năng | 1-2 người | 2-5 phút | Đập cánh giữ nhịp bay lơ lửng, đạp vỡ bóng đối thủ né cá đớp mồi! |
| **142** | `ice-climber-dap-bang-leo-nui` | **Đập Băng Leo Đỉnh Núi** | Ice Climber (Nintendo NES 1985) | Hành động | 1-2 người | 3-6 phút | Vung búa đục trần băng, nhảy vọt lên cao chộp lấy chân chim đại bàng! |
| **143** | `mappy-chuot-canh-sat-nhay-bat` | **Chuột Cảnh Sát Đệm Lò Xo** | Mappy (Namco 1983) | Hành động | 1 người | 3-5 phút | Nhún bạt lò xo lầu cao, mở sập cửa vi sóng thổi bay lũ mèo trộm đồ! |
| **144** | `twinbee-ban-chuong-bay` | **Bắn Chuông Mây Biến Màu** | TwinBee (Konami 1985) | Hành động | 1-2 người | 3-6 phút | Bắn nảy chuông trên mây để đổi màu nhặt cánh tay và khiên hộ vệ! |
| **145** | `worms-armageddon-giun-chien-tranh` | **Giun Đất Bộc Phá (Worms 2D)** | Worms Armageddon (Team17 1999) | Chiến thuật | 1-4 người | 5-10 phút | Căn góc gió thả cừu nổ, bắn bazooka khoét thủng đảo đất rơi biển! |
| **146** | `digger-xe-ui-dao-ham` | **Xe Ủi Đào Vàng Hầm Ngầm** | Digger (Windmill Software 1983 - Rob Sleath) | Giải đố | 1 người | 3-6 phút | Ủi hầm ăn ngọc lục bảo, thả túi vàng đè bẹp quái Nobbin rượt đuổi! |
| **147** | `bookworm-sau-noi-chu` | **Mọt Sách Nối Chữ (Bookworm)** | Bookworm (PopCap Games 2003) | Giải đố | 1 người | 4-8 phút | Nối từng chữ cái thành từ vựng kỳ diệu, dập tắt khối chữ bốc cháy! |
| **148** | `atomix-ghep-phan-tu-hoa-hoc` | **Ghép Phân Tử Hóa Học** | Atomix (Thalion Software 1990 - Günter Krämer) | Giải đố | 1 người | 4-8 phút | Đẩy các nguyên tử trượt tự do va tường ghép thành công thức phân tử nước! |
| **149** | `icy-tower-thap-bang-nhay-cao` | **Tháp Băng Nhảy Cực Hạn** | Icy Tower (Free Fall Arcade 2001 - Johan Peitz) | Kỹ năng | 1 người | 2-5 phút | Nhảy bật tường lộn nhào, chuỗi Combo Sweet vượt tầng băng đang sụp đổ! |
| **150** | `hamsterball-lan-cau-hamster` | **Lăn Cầu Chuột Hamster** | Hamsterball (Raptisoft 2004 - John Rapoza) | Kỹ năng | 1 người | 3-6 phút | Cân bằng quả cầu lăn trên mép vực dốc xoắn ốc chạy đua cùng đồng hồ! |

---

## 3. ĐẶC TẢ CHI TIẾT TỪNG TRÒ CHƠI (DEEP GAME DESIGN & IMPLEMENTATION SPEC)

### 101. Boom Online (BnB) (`boom-online-bnb`)
- **Tên gốc & Niên đại:** Crazy Arcade / BnB (Nexon 2001) • *PC Casual / Arcade (2001)*
- **Tagline:** *"Bọc bóng nước, kẹp đối thủ, chạy tìm kim châm giải cứu!"*
- **Thể loại:** Hành động | **Phân mục:** `hot` | **Huy hiệu:** Huyền thoại | **Màu chủ đạo:** `#0284C7`
- **Số người chơi:** 1-4 người | **Thời lượng ván:** 3-5 phút
- **Tóm tắt cơ chế:** Thả bong bóng nước bẫy đối thủ vào bọc nước, sút vỡ kết liễu hoặc giải cứu đồng đội
- **Vòng lặp chơi cốt lõi (Core Loop):**
  > Di chuyển trong mê cung gạch hộp -> Thả bóng nước hẹn giờ 3 giây -> Tia nước nổ 4 hướng phá chướng ngại nhặt vật phẩm -> Kẹp đối thủ vào bọc nước lơ lửng -> Lao tới đạp vỡ bọc nước để K.O hoặc đối thủ dùng kim châm tự cứu -> Trở thành người sống sót cuối cùng.
- **Thiết kế Cảm giác tay (Tactile Game Feel):**
  * **Hệ thống phím điều khiển:** Phím mũi tên / WASD di chuyển 4 hướng; Phím Space thả bóng nước; Phím Ctrl dùng kim châm; Phím Alt kích hoạt phi tiêu / thú cưỡi; Mobile: D-pad ảo cảm ứng phản hồi xúc giác nhẹ.
  * **Độ giật nảy màn hình (Screenshake):** Rung 5px (trauma 0.6, phân rã 200ms) khi nổ bóng đơn; Rung chấn mạnh 12px (trauma 1.0, 350ms) khi kích nổ liên hoàn 4+ quả bóng nước.
  * **Độ đầm & Khựng khung hình (Hitstop):** Khựng micro-frame 50ms khi dẫm vỡ bọc nước đối thủ (K.O Splash); Khựng 30ms khi nhặt phi tiêu hoặc vật phẩm tăng cấp.
  * **Âm thanh phản hồi (Procedural Audio SFX):** Procedural Web Audio: Tiếng thả bóng 'Boing' (Sine 280Hz -> 420Hz, 120ms); Tiếng nước nổ 'Water Splash Crunch' (White Noise qua LPF 650Hz + Sub-bass 65Hz kick, 250ms); Tiếng kẹt bóng 'Bloop-bloop' bong bóng nghẹt thở (Sine 550Hz nhấp nhô); Tiếng kim đâm xì hơi 'Pssss' (Bandpass Noise 4kHz, 180ms); K.O Ding vang vọng (Bell chime 880Hz + 1760Hz).
  * **Hiệu ứng hạt va chạm (Particles):** 16-24 giọt nước bắn tung tóe đa hướng (vận tốc ngẫu nhiên 100-240px/s, co nhỏ dần); Luồng sóng nước chữ thập xanh lam bán trong suốt; Bọt nước óng ánh vỡ lách tách.
- **Nghiên cứu Asset & Canvas 2D Rendering:**
  * **Phong cách đồ họa (Art Style):** Chibi Isometric 2.5D màu nước rực rỡ, đường viền mềm mại phong cách hoạt hình Hàn Quốc
  * **Bảng màu đặc trưng (Color Palette):** `#0284C7`, `#38BDF8`, `#BAE6FD`, `#F59E0B`, `#EF4444`, `#10B981`
  * **Danh mục Sprites cần thiết để render:**
    + Nhân vật Khò Khò / Nhanh Nhẩu (idle, chạy 4 hướng, vùng vẫy trong bọc nước, ăn mừng chiến thắng)
    + Quả bóng nước hoạt hình (nhịp thở phập phồng co giãn theo thời gian đếm ngược)
    + Cột sóng nước nổ chữ thập (tâm nổ tròn, cột nước ngang/dọc, bọt sóng đầu mút)
    + Khối chướng ngại vật: Hộp gỗ, gạch hoa văn, bụi cây có thể phá hủy
    + Icon vật phẩm: Giày đỏ (tốc độ), Bình nước xanh (tầm nổ), Bóng nước (số lượng), Kim châm, Phi tiêu, Rùa chạy chậm, Cú bay nhanh
    + Bọc nước lơ lửng chứa nhân vật kèm hiệu ứng giọt nước rỉ

---

### 102. Audition 4 Phím Space (`audition-nhip-dieu`)
- **Tên gốc & Niên đại:** Audition Online (T3 Entertainment / VTC Game 2004) • *PC Rhythm MMO (2004)*
- **Tagline:** *"Canh nốt Perfect, gõ phím Space vang dội cả quán net!"*
- **Thể loại:** Kỹ năng | **Phân mục:** `hot` | **Huy hiệu:** Huyền thoại | **Màu chủ đạo:** `#EC4899`
- **Số người chơi:** 1-6 người | **Thời lượng ván:** 3-4 phút
- **Tóm tắt cơ chế:** Gõ đúng chuỗi phím mũi tên tăng dần từ cấp 1 đến 9, gõ Space đúng nhịp viên bi ánh sáng chạm vùng sáng
- **Vòng lặp chơi cốt lõi (Core Loop):**
  > Lắng nghe nhịp phách BPM bài hát -> Chuỗi phím mũi tên xuất hiện trên thanh nhịp -> Gõ chính xác từng phím trước khi con trỏ nhịp điệu chạy qua -> Canh đúng khoảnh khắc viên ngọc sáng chạm tâm điểm Perfect để đập phím Space -> Nhận điểm Perfect x1, x2, x3... mở khóa bước nhảy điêu luyện -> Sai nhịp bị Miss tụt mood.
- **Thiết kế Cảm giác tay (Tactile Game Feel):**
  * **Hệ thống phím điều khiển:** Phím mũi tên 4 hướng (hoặc Numpad 8 hướng); Phím Spacebar dập nhịp; Phím Delete đổi chiều nốt đỏ Del; Trên mobile chạm 4 nút điều hướng ảo + nút Beat lớn.
  * **Độ giật nảy màn hình (Screenshake):** Rung nảy nhịp điệu 3px mỗi nốt Perfect; Bùng nổ rung 10px khi kích hoạt Perfect x5 hoặc bước nhảy Finish Move.
  * **Độ đầm & Khựng khung hình (Hitstop):** Khựng 40ms khi chạm nốt Finish Move cấp 9; Flash chớp sáng toàn màn hình trong 60ms.
  * **Âm thanh phản hồi (Procedural Audio SFX):** Procedural Web Audio: Tiếng gõ phím 'Clack' cơ học giòn tan (Square 600Hz + click noise); Tiếng Perfect đanh chắc 'Bass Kick + Cymbal Shimmer' (Sub-bass 55Hz + High White Noise shimmer 8kHz); Tiếng Miss tụt tông 'Womp-womp' (Sawtooth 160Hz tụt xuống 80Hz); Tiếng chuỗi Combo tăng dần cao độ theo cung Sol-La-Si-Đố.
  * **Hiệu ứng hạt va chạm (Particles):** Pháo hoa giấy sắc màu (confetti) bung tỏa; Vòng tròn hào quang sóng xung kích (shockwave ripple) lan tỏa từ thanh nhịp khi trúng Perfect; Sao lấp lánh quanh chân vũ công.
- **Nghiên cứu Asset & Canvas 2D Rendering:**
  * **Phong cách đồ họa (Art Style):** Vector Pop-art thời trang sàn nhảy sôi động, sàn disco đèn neon rực rỡ
  * **Bảng màu đặc trưng (Color Palette):** `#EC4899`, `#8B5CF6`, `#F43F5E`, `#FDE047`, `#06B6D4`, `#1E1B4B`
  * **Danh mục Sprites cần thiết để render:**
    + Vũ công thời trang Chibi 3D cách điệu (dáng đứng chờ, pose nhảy cấp 1-9, động tác xoay vòng Finish Move, ngã khuỵu khi Miss)
    + Thanh nhịp điệu Beat Bar (nền kim loại sáng, vùng sáng Perfect óng ánh, viên bi dẫn hướng trượt mượt mà)
    + Biểu tượng phím mũi tên: Xanh lam (bình thường), Đỏ (ngược hướng), Xám (đã bấm đúng)
    + Huy hiệu chữ động: 'PERFECT' (vàng kim phát sáng), 'GREAT' (xanh lá), 'COOL' (lam), 'BAD', 'MISS' (xám tím)
    + Sàn nhảy Disco gạch vuông đổi màu theo nhịp beat, dàn đèn sân khấu chiếu quét

---

### 103. Đua Xe Quái Xế (Road Rash) (`road-rash-dua-xe-moto`)
- **Tên gốc & Niên đại:** Road Rash (Electronic Arts 1991/1995) • *PC / Genesis / 3DO (1991)*
- **Tagline:** *"Đạp xe đối thủ, vung xích sắt, né xe cảnh sát giao thông!"*
- **Thể loại:** Hành động | **Phân mục:** `hot` | **Huy hiệu:** Huyền thoại | **Màu chủ đạo:** `#EA580C`
- **Số người chơi:** 1-2 người | **Thời lượng ván:** 3-6 phút
- **Tóm tắt cơ chế:** Đua mô tô tốc độ cao góc nhìn thứ ba, dùng đòn đấm đá, cướp gậy/xích giáp lá cà trên đường đua
- **Vòng lặp chơi cốt lõi (Core Loop):**
  > Vặn ga tăng tốc ôm cua -> Quan sát làn đường né ô tô ngược chiều, cây cối, biển báo -> Tiếp cận xe đối thủ bên cạnh -> Tung đòn đấm/đá hoặc vung xích quật ngã đối thủ văng khỏi xe -> Tránh né cảnh sát O'Leary áp sát phạt tiền -> Cán đích top 3 nhận tiền thưởng nâng cấp xe phân khối lớn.
- **Thiết kế Cảm giác tay (Tactile Game Feel):**
  * **Hệ thống phím điều khiển:** Phím Mũi tên Lên (Ga), Xuống (Phanh), Trái/Phải (Lượn xe); Phím Numpad 1 / Z (Đấm/Vung vũ khí); Numpad 2 / X (Đạp chân sang bên hông); Phím Space (Bốc đầu xe vượt chướng ngại).
  * **Độ giật nảy màn hình (Screenshake):** Rung giật 8px khi va quẹt mép đường; Rung cực mạnh 16px (trauma 1.0, 400ms) kèm hiệu ứng nảy lộn nhào khi tông trực diện vào xe hơi.
  * **Độ đầm & Khựng khung hình (Hitstop):** Khựng 60ms cho mỗi cú quật xích trúng mũ bảo hiểm đối phương; Khựng 90ms khi đạp đối thủ văng vào cột điện.
  * **Âm thanh phản hồi (Procedural Audio SFX):** Procedural Web Audio: Tiếng động cơ mô tô gầm rú 2 thì (Sawtooth biến thiên tần số theo tốc độ 90Hz -> 380Hz); Tiếng vung xích 'Whoosh-Clang' (Noise sweep + Triangle kim loại 1.2kHz); Tiếng đấm trúng mặt 'Heavy Thud Crunch' (Bass 80Hz + White Noise lọc méo tiếng); Tiếng còi hú cảnh sát giao thông 'Wee-woo' gấp gáp.
  * **Hiệu ứng hạt va chạm (Particles):** Khói xả ống bô đen xì; Bụi đường đất cát cuộn xoáy sau bánh xe; Tia lửa điện tóe ra khi kim loại cọ sát mặt đường nhựa; Mảnh vỡ mũ bảo hiểm văng tứ tung.
- **Nghiên cứu Asset & Canvas 2D Rendering:**
  * **Phong cách đồ họa (Art Style):** Pseudo-3D Retro Bitmap cuộn dốc uốn lượn (Super Scaler), phong cách bụi bặm đường phố thập niên 90
  * **Bảng màu đặc trưng (Color Palette):** `#EA580C`, `#7C2D12`, `#FACC15`, `#1E293B`, `#475569`, `#DC2626`
  * **Danh mục Sprites cần thiết để render:**
    + Tay đua mô tô (góc nhìn từ phía sau: nghiêng cua trái/phải, vung tay đấm, đạp chân, té ngã lộn mèo lăn đường)
    + Mô tô phân khối lớn (bánh xe quay tốc độ, khói pô, phuộc nhún gập khi tiếp đất)
    + Cảnh sát tuần tra mô tô áo xanh kèm dùi cui
    + Chướng ngại vật đường phố: Xe bán tải, xe hơi ngược chiều, bò băng qua đường, biển báo bo cua, rào chắn công trình
    + Cảnh nền cuộn ngang (Parallax background): Đồi núi California, biển hoàng hôn ráng vàng, hàng cây ven đường thu phóng theo độ sâu z

---

### 104. Người Máy Xanh (Mega Man) (`rockman-mega-man`)
- **Tên gốc & Niên đại:** Mega Man / Rockman (Capcom 1987) • *NES 8-bit (1987)*
- **Tagline:** *"Nạp đạn tụ lực Mega Buster, vượt chông gai đoạt vũ khí Boss!"*
- **Thể loại:** Hành động | **Phân mục:** `classic` | **Huy hiệu:** Huyền thoại | **Màu chủ đạo:** `#2563EB`
- **Số người chơi:** 1 người | **Thời lượng ván:** 5-10 phút
- **Tóm tắt cơ chế:** Chạy nhảy bắn súng diệt trùm, trượt gầm né đạn, hấp thụ vũ khí khắc chế của từng Robot Master
- **Vòng lặp chơi cốt lõi (Core Loop):**
  > Chọn màn chơi Boss chủ đề -> Vượt ải nhảy bục né bẫy gai nhọn chết ngay (Instant Spike Trap) -> Bắn đạn chanh hạ lính máy -> Tụ lực Mega Buster giải phóng phát bắn cực đại -> Chiến đấu với Boss, học quy luật di chuyển -> Tiêu diệt Boss thu nhận vũ khí đặc biệt để khắc chế Boss tiếp theo.
- **Thiết kế Cảm giác tay (Tactile Game Feel):**
  * **Hệ thống phím điều khiển:** Trái/Phải (Di chuyển); Phím Z/K (Nhảy); Phím X/J (Bắn đạn); Giữ X để tụ lực Charge Shot; Xuống + Nhảy để trượt lướt gầm lướt gió (Slide).
  * **Độ giật nảy màn hình (Screenshake):** Rung 4px khi dính sát thương; Rung 12px (trauma 0.8) khi xả phát bắn Charge Shot bự chảng hoặc khi Boss dậm sàn.
  * **Độ đầm & Khựng khung hình (Hitstop):** Khựng 30ms khi đạn trúng giáp kẻ địch; Khựng 80ms khi phát bắn tụ lực phá hủy quái vật to; Nhân vật nhấp nháy bất tử 1.5 giây sau khi dính đòn.
  * **Âm thanh phản hồi (Procedural Audio SFX):** Procedural Web Audio: Tiếng bắn đạn hạt chanh 'Pew' 8-bit (Square wave 440Hz -> 880Hz cực ngắn 40ms); Tiếng tụ lực 'Whirrr-Vrrrr' tần số tăng dần từ 200Hz đến 1200Hz kèm độ ngân vibrato; Tiếng nổ hủy diệt Boss 'Boom-Crunch' (White noise kết hợp Square 8-bit giòn đanh); Tiếng nhân vật tan biến thành các hạt năng lượng rơi lách tách.
  * **Hiệu ứng hạt va chạm (Particles):** Các viên đạn hạt chanh phát sáng; Vòng hào quang tụ lực xanh dương bao quanh thân người máy; Vụ nổ vòng cung tròn 8-bit đặc trưng bung ra 8 hạt năng lượng xoay vòng khi tiêu diệt trùm.
- **Nghiên cứu Asset & Canvas 2D Rendering:**
  * **Phong cách đồ họa (Art Style):** Pixel Art 8-bit NES kinh điển, đường nét sắc gọn, mắt anime to tròn retro
  * **Bảng màu đặc trưng (Color Palette):** `#2563EB`, `#60A5FA`, `#FFFFFF`, `#1E40AF`, `#EF4444`, `#F59E0B`
  * **Danh mục Sprites cần thiết để render:**
    + Người máy xanh Rockman (đứng thở, chạy 3 frame, nhảy giơ súng, trượt gầm, giật lùi khi dính đạn, tụ lực đổi màu)
    + Viên đạn Buster: Đạn nhỏ vàng, đạn tụ lực vừa xanh lục, đạn đại bác Mega chùm xanh dương khổng lồ
    + Robot Master Boss (Cut Man, Fire Man, Air Man với hoạt ảnh tấn công đặc trưng)
    + Lính quái cản đường: Mũ sắt Metool nấp bắn, chim máy thả trứng, mắt máy bay ziczac
    + Bẫy hầm ngục: Gai nhọn chết người, bục nhảy rơi tự do, thang leo dây sắt

---

### 105. Bắn Vịt Cỏ 8-Bit (Duck Hunt) (`duck-hunt-ban-vit`)
- **Tên gốc & Niên đại:** Duck Hunt (Nintendo NES 1984) • *NES Zapper (1984)*
- **Tagline:** *"Canh nòng súng ngắm, đừng để chú chó săn cười nhạo!"*
- **Thể loại:** Kỹ năng | **Phân mục:** `quick` | **Huy hiệu:** Tuổi thơ | **Màu chủ đạo:** `#15803D`
- **Số người chơi:** 1 người | **Thời lượng ván:** 2-4 phút
- **Tóm tắt cơ chế:** Súng ngắm bắn mục tiêu vịt bay vút lên từ bụi cỏ, giới hạn 3 viên đạn mỗi đợt
- **Vòng lặp chơi cốt lõi (Core Loop):**
  > Chó săn đánh hơi sủa vang rồi nhảy vào bụi cỏ -> Vịt cỏ vỗ cánh bay vút lên trời theo đường ziczac ngẫu nhiên -> Nhanh tay rê chuột/chạm nòng súng ngắm bắn chuẩn xác trước khi vịt bay mất -> Vịt trúng đạn rơi thẳng đứng xuống đất -> Chó săn nhô đầu lên hớn hở ngoạm vịt -> Bắn trượt hết đạn, chú chó thò đầu lên khúc khích cười nhạo.
- **Thiết kế Cảm giác tay (Tactile Game Feel):**
  * **Hệ thống phím điều khiển:** Chuột rê ngắm tâm súng + Nhấp chuột trái để bóp cò; Trên màn hình cảm ứng: Chạm trực tiếp vào con vịt đang bay; Phím R nạp đạn nhanh.
  * **Độ giật nảy màn hình (Screenshake):** Rung giật 5px tức thì (Recoil súng Zapper) trong 80ms mỗi phát bắn súng bóp cò; Đèn flash trắng giật khung hình 1-frame đúng chuẩn công nghệ súng quang học Light Gun ngày xưa.
  * **Độ đầm & Khựng khung hình (Hitstop):** Khựng 70ms con vịt đứng hình nhấp nháy xương sườn trước khi rơi xuống.
  * **Âm thanh phản hồi (Procedural Audio SFX):** Procedural Web Audio: Tiếng súng Zapper nổ 'Bang-Crack' (White noise kết hợp bandpass filter 1.5kHz cực đanh, 90ms); Tiếng đập cánh vịt 'Flap-flap' (Triangle sweep nhanh); Tiếng vịt kêu 'Quack-quack'; Điệu cười trứ danh của chú chó săn 'He-he-he-he' (Square wave ngắt nhịp ngộ nghĩnh 600Hz -> 750Hz); Tiếng rơi 'Whistle down' rồi 'Thud' tiếp đất.
  * **Hiệu ứng hạt va chạm (Particles):** Lông vịt rụng lả tả khi trúng đạn; Khói thuốc súng xám tỏa ra ở tâm ngắm; Chấm đạn nổ lóe sáng flash.
- **Nghiên cứu Asset & Canvas 2D Rendering:**
  * **Phong cách đồ họa (Art Style):** Pixel Art NES 8-bit rực rỡ, đồng cỏ xanh ngát, bầu trời lam trong veo hoài niệm
  * **Bảng màu đặc trưng (Color Palette):** `#15803D`, `#4ADE80`, `#38BDF8`, `#F59E0B`, `#B45309`, `#FFFFFF`
  * **Danh mục Sprites cần thiết để render:**
    + Vịt cỏ nhiều màu (xanh cổ vịt, vịt đen, vịt hồng: sải cánh bay nghiêng, bay thẳng, trúng đạn xoay tròn rơi)
    + Chú chó săn đồng cỏ lông nâu (chạy đánh hơi, nhảy qua bụi cây, thò đầu ngoạm vịt cười tít mắt, giơ tay che miệng cười đểu)
    + Bụi cỏ xanh rì rào ở tiền cảnh
    + Thanh HUD: Hàng đạn đỏ đếm lùi, ô hiển thị vịt đã bắn trúng/trượt, điểm số kỷ lục

---

### 106. Đảo Phiêu Lưu (Adventure Island) (`adventure-island-dao-hoang`)
- **Tên gốc & Niên đại:** Hudson's Adventure Island (Hudson Soft 1986) • *NES 8-bit (1986)*
- **Tagline:** *"Cưỡi ván trượt, ném rìu đá, nhặt chuối giữ thanh sinh mệnh!"*
- **Thể loại:** Hành động | **Phân mục:** `classic` | **Huy hiệu:** Kinh điển | **Màu chủ đạo:** `#16A34A`
- **Số người chơi:** 1 người | **Thời lượng ván:** 4-8 phút
- **Tóm tắt cơ chế:** Chạy vượt chướng ngại cuộn cảnh, ném rìu đá diệt ốc sên/quái vật, liên tục nhặt trái cây để không cạn máu
- **Vòng lặp chơi cốt lõi (Core Loop):**
  > Thanh sinh mệnh giảm dần theo từng giây -> Chạy nhanh về phía trước, ném rìu phá trứng đá nhặt phần thưởng -> Trượt ván lướt nhanh qua bãi đá lửa -> Nhặt chuối, táo, dứa để hồi phục năng lượng -> Tránh né quạ đen, ốc sên, lửa trại và đá vấp ngã -> Đánh bại trùm đầu thú cuối mỗi hòn đảo.
- **Thiết kế Cảm giác tay (Tactile Game Feel):**
  * **Hệ thống phím điều khiển:** Trái/Phải (Di chuyển/Giữ thăng bằng); Phím Z/J (Nhảy bật cao); Phím X/K (Ném rìu / Tăng tốc chạy); Giữ nút chạy để nhảy xa hơn.
  * **Độ giật nảy màn hình (Screenshake):** Rung 4px khi vấp phải hòn đá; Rung 8px khi quả trứng khổng lồ nứt vỡ nhả ra ván trượt hoặc tiên nữ bảo hộ.
  * **Độ đầm & Khựng khung hình (Hitstop):** Khựng 35ms khi ném rìu trúng ốc sên hoặc nhện độc; Khựng 60ms khi Boss trúng đòn đổi đầu.
  * **Âm thanh phản hồi (Procedural Audio SFX):** Procedural Web Audio: Tiếng ném rìu vút xoay 'Swish' (Triangle 500Hz -> 200Hz); Tiếng nhặt trái cây 'Gulp-Chime' (Arpeggio nốt cao C6-E6-G6); Tiếng trượt ván lăn bánh 'Rumble-skate' (Noise lọc LPF); Tiếng vấp ngã mất ván trượt 'Bonk' (Square 220Hz ngắn); Tiếng nhạc cảnh báo năng lượng nguy cấp nhấp nháy 'Beep-beep'.
  * **Hiệu ứng hạt va chạm (Particles):** Mảnh vỏ trứng đá vỡ vụn văng ra 4 phía; Hạt sao lấp lánh khi tiên bảo hộ Honey-Girl xuất hiện; Bụi đất tung lên sau bánh ván trượt.
- **Nghiên cứu Asset & Canvas 2D Rendering:**
  * **Phong cách đồ họa (Art Style):** Pixel Art nhiệt đới 8-bit rực rỡ, bãi cát vàng, rừng dừa và biển xanh ngập tràn sức sống
  * **Bảng màu đặc trưng (Color Palette):** `#16A34A`, `#FBBF24`, `#F97316`, `#0284C7`, `#78350F`, `#FFFFFF`
  * **Danh mục Sprites cần thiết để render:**
    + Anh chàng thổ dân Master Higgins đội mũ lưỡi trai trắng, mặc khố cỏ (chạy bộ, nhảy ném rìu, trượt ván té ngã)
    + Vũ khí: Chiếc rìu đá quay tròn, quả cầu lửa bốc cháy
    + Trái cây tăng lực: Chuối chín, táo đỏ, dưa hấu, cà rốt, sữa bình
    + Quái vật: Ốc sên bò chậm, nhện đu dây, quạ đen sà xuống, rắn độc quấn cây
    + Quả trứng đốm bí ẩn, ván trượt bánh xe đỏ, tiên nữ tí hon bay quanh

---

### 107. Đấu Sĩ Đường Phố (Street Fighter II) (`street-fighter-2-doi-khang`)
- **Tên gốc & Niên đại:** Street Fighter II: The World Warrior (Capcom 1991) • *Arcade CPS-1 (1991)*
- **Tagline:** *"Hadouken nổ chưởng, Shoryuken thấu trời, hạ gục võ đài thế giới!"*
- **Thể loại:** Đối kháng | **Phân mục:** `hot` | **Huy hiệu:** Huyền thoại | **Màu chủ đạo:** `#DC2626`
- **Số người chơi:** 1-2 người | **Thời lượng ván:** 3-5 phút
- **Tóm tắt cơ chế:** Đối kháng 2D tỷ thí võ nghệ, xoay phím bấm chiêu chưởng đặc biệt (Hadouken, Shoryuken, Tatsumaki)
- **Vòng lặp chơi cốt lõi (Core Loop):**
  > Chọn võ sĩ (Ryu, Ken, Chun-Li, Guile...) -> Vào trận đấu 3 hiệp thắng 2 (Best of 3) -> Di chuyển giữ cự ly, đỡ đòn (Hold Back), căn thời điểm tung đòn đấm đá tầm xa -> Thực hiện chuỗi tổ hợp nút tung tuyệt chiêu chưởng -> Choáng váng (Dizzy) đối thủ -> K.O hoành tráng kết thúc trận đấu.
- **Thiết kế Cảm giác tay (Tactile Game Feel):**
  * **Hệ thống phím điều khiển:** WASD hoặc Mũi tên (Di chuyển/Nhảy/Ngồi/Đỡ); J/U (Đấm nhẹ/Đấm mạnh); K/I (Đá nhẹ/Đá mạnh); Combo cầu lửa Hadouken: Xuống -> Xuống-Tiến -> Tiến + Đấm; Combo Thăng Long Quyền Shoryuken: Tiến -> Xuống -> Xuống-Tiến + Đấm.
  * **Độ giật nảy màn hình (Screenshake):** Rung 4px đòn đánh trúng thường; Rung 10px (trauma 0.9, 300ms) khi trúng chưởng Hadouken; Rung cực mạnh 15px khi dính đòn quét chân K.O cuối trận.
  * **Độ đầm & Khựng khung hình (Hitstop):** Cảm giác 'Hitstop' đỉnh cao: Khựng khung hình 80ms cho đòn đánh mạnh, khựng 120ms khi cú đấm Shoryuken trúng cằm đối thủ, tạo lực đầm tay tuyệt đối.
  * **Âm thanh phản hồi (Procedural Audio SFX):** Procedural Web Audio: Tiếng chưởng nổ 'Hadouken Whoosh-Boom' (White Noise sweep + Sub-bass 50Hz); Tiếng đấm trúng thịt đanh thép 'Smack Crunch' (Thud 90Hz + High crunch noise méo tiếng); Tiếng chim quay quanh đầu khi bị choáng 'Tweet-tweet' (Sine 1.5kHz arpeggio); Tiếng trọng tài 'K.O!' vang dội.
  * **Hiệu ứng hạt va chạm (Particles):** Quả cầu lửa Hadouken xanh lam tỏa tia lửa; Tia chớp va chạm màu vàng kim (Impact Sparks) bung xòe hình ngôi sao; Gà con/ngôi sao xoay vòng quanh đầu khi bị choáng.
- **Nghiên cứu Asset & Canvas 2D Rendering:**
  * **Phong cách đồ họa (Art Style):** Arcade 16-bit Capcom CPS-1 cơ bắp cuồn cuộn, biểu cảm va chạm mạnh mẽ đầy uy lực
  * **Bảng màu đặc trưng (Color Palette):** `#DC2626`, `#F59E0B`, `#2563EB`, `#FFFFFF`, `#1E293B`, `#10B981`
  * **Danh mục Sprites cần thiết để render:**
    + Võ sĩ Ryu/Ken áo karate trắng/đỏ (thế thủ nhấp nhổm, đấm thẳng, đá xoay, vận công Hadouken, bay người Shoryuken, ngửa người dính đòn)
    + Quả cầu năng lượng Hadouken phát sáng rực lửa
    + Thanh máu đỏ viền vàng rút dần, thanh choáng Stun bar, chữ 'K.O' 3D vàng kim viền đỏ rực
    + Sàn đấu võ đài: Lâu đài Suzaku Nhật Bản, mái ngói cổ kính, trăng rằm treo cao
    + Chân dung võ sĩ bầm dập hài hước sau khi thua trận ở màn hình tiếp tục

---

### 108. Hoàng Tử Ba Tư Cổ Điển (`prince-of-persia-1989`)
- **Tên gốc & Niên đại:** Prince of Persia (Jordan Mechner / Brøderbund 1989) • *PC MS-DOS / Apple II (1989)*
- **Tagline:** *"60 phút sinh tử, bước chân rón rén né hầm chông và kiếm sĩ!"*
- **Thể loại:** Hành động | **Phân mục:** `classic` | **Huy hiệu:** Kinh điển | **Màu chủ đạo:** `#D97706`
- **Số người chơi:** 1 người | **Thời lượng ván:** 5-15 phút
- **Tóm tắt cơ chế:** Nhảy bục thực tế vật lý mượt mà (Rotoscoping), đếm ngược đồng hồ 60 phút, né bẫy chông/dao chém và đấu kiếm tay đôi
- **Vòng lặp chơi cốt lõi (Core Loop):**
  > Đồng hồ cát 60 phút bắt đầu đếm ngược -> Điều khiển hoàng tử leo trèo, đu bám gờ tường, chạy đà nhảy qua hố sâu -> Rón rén bước chân để không kích hoạt bẫy chông nhọn dưới sàn -> Gạt công tắc mở cửa sắt -> Rút kiếm đấu kiếm cận chiến với lính gác cung điện -> Tìm đường đến tháp công chúa trước khi cạn giờ.
- **Thiết kế Cảm giác tay (Tactile Game Feel):**
  * **Hệ thống phím điều khiển:** Trái/Phải (Chạy đà); Giữ Shift/Phím chậm (Bước rón rén cẩn thận); Mũi tên Lên (Nhảy với bám gờ / Đỡ kiếm); Mũi tên Xuống (Cúi ngồi trườn / Thu kiếm); Phím Space / X (Chém kiếm); Phím Z (Uống bình máu).
  * **Độ giật nảy màn hình (Screenshake):** Rung 6px khi sàn đá nứt sụp đổ dưới chân; Rung giật 12px khi bị kiếm chém hoặc rơi từ độ cao 3 tầng sàn.
  * **Độ đầm & Khựng khung hình (Hitstop):** Khựng 70ms khi hai lưỡi kiếm va chạm tóe lửa (Parry); Khựng 90ms khi tung đòn đâm chí mạng hạ lính gác.
  * **Âm thanh phản hồi (Procedural Audio SFX):** Procedural Web Audio: Tiếng bước chân gõ sàn đá nhịp nhàng 'Tap-tap-tap' (Triangle 320Hz ngắn); Tiếng kiếm va kiếm 'Clang-Clank' vang dội kim khí (Square + Filter 2kHz đanh); Tiếng chông nhọn trồi lên 'Sshh-Thunk'; Tiếng nắp cống đá đóng sập ầm ầm (Bass 60Hz + White Noise nặng); Tiếng tim đập 'Thump-thump' khi máu còn 1 giọt.
  * **Hiệu ứng hạt va chạm (Particles):** Bụi cát rơi lả tả từ trần nhà khi sàn rung chuyển; Tia lửa tóe ra giữa 2 thanh gươm va chạm; Máu đỏ rơi khi dính chông; Khói mờ ma quái khi gặp chiếc gương ảo ảnh.
- **Nghiên cứu Asset & Canvas 2D Rendering:**
  * **Phong cách đồ họa (Art Style):** Cinematic Platformer hoạt họa Rotoscoping sống động từng khớp xương, cung điện Ả Rập huyền bí
  * **Bảng màu đặc trưng (Color Palette):** `#D97706`, `#78350F`, `#451A03`, `#FDE68A`, `#DC2626`, `#0284C7`
  * **Danh mục Sprites cần thiết để render:**
    + Hoàng tử áo trắng quần thụng (chạy đà trượt chân, leo bám mép tường, đu người lên, rút kiếm thủ thế, rón rén từng bước)
    + Lính gác cung điện béo/gầy mặc giáp cầm kiếm chém
    + Bẫy cung điện: Hầm chông nhọn hoắt, máy chém răng cưa kẹp ngang, sàn đá nứt rụng rời
    + Bình thuốc hồi máu đỏ, bình tăng tối đa ô máu xanh lam
    + Thanh HUD giọt máu đỏ hình tam giác ở góc dưới màn hình và đồng hồ cát

---

### 109. Khủng Long Nhả Bóng (Bubble Bobble) (`bubble-bobble-khung-long-bong-bong`)
- **Tên gốc & Niên đại:** Bubble Bobble (Taito 1986) • *Arcade (1986)*
- **Tagline:** *"Thổi bọc quái vật, nhảy dẫm vỡ bóng thu gom chuối ngọt!"*
- **Thể loại:** Hành động | **Phân mục:** `classic` | **Huy hiệu:** Tuổi thơ | **Màu chủ đạo:** `#10B981`
- **Số người chơi:** 1-2 người | **Thời lượng ván:** 3-6 phút
- **Tóm tắt cơ chế:** Khủng long phun bong bóng bọc quái vật, nhảy lên lưng bóng để leo tầng, làm vỡ bóng biến quái thành trái cây
- **Vòng lặp chơi cốt lõi (Core Loop):**
  > Di chuyển trên các tầng bục màn hình -> Thổi bong bóng trôi theo luồng gió -> Bọc lũ quái vật lơ lửng trong bong bóng xanh -> Nhảy lên bong bóng như đệm nhún để leo lên cao -> Dùng sừng hoặc dẫm chân nổ tung bong bóng tiêu diệt quái -> Quái vật nổ tung rơi ra bánh ngọt, dưa hấu, kim cương -> Dọn sạch màn chơi để sang tầng tiếp theo.
- **Thiết kế Cảm giác tay (Tactile Game Feel):**
  * **Hệ thống phím điều khiển:** Trái/Phải (Di chuyển); Phím Z/J (Nhảy lò xo); Phím X/K (Thổi bong bóng); Giữ nút nhảy khi tiếp xúc bong bóng để nảy cao gấp đôi.
  * **Độ giật nảy màn hình (Screenshake):** Rung nảy nhẹ 2px mỗi khi bong bóng vỡ; Rung 8px (trauma 0.7) khi kích nổ quả bóng sấm sét hoặc bóng nước cuốn trôi cả hàng quái.
  * **Độ đầm & Khựng khung hình (Hitstop):** Khựng 40ms khi đạp nổ chùm 3+ quả bóng cùng lúc; Khựng 60ms khi nhặt viên kim cương vàng lớn.
  * **Âm thanh phản hồi (Procedural Audio SFX):** Procedural Web Audio: Tiếng phun bóng 'Pwoop-pop' (Sine 400Hz lượn sóng lên 650Hz); Tiếng bóng vỡ giòn tan 'Plop-pop' (White noise kết hợp bandpass 1.8kHz); Tiếng sét giật 'Zzzap' (Sawtooth biến điệu); Tiếng chuông nhặt trái cây 'Ding-dong' ngân vang; Điệu nhạc nền chiptune vui tươi rộn rã tuổi thơ.
  * **Hiệu ứng hạt va chạm (Particles):** Mảnh vỡ bong bóng tỏa ra 4 tia nước nhỏ; Bọt khí lơ lửng trôi theo luồng gió; Điểm số bay lên (+1000, +5000) cùng trái cây rơi xoay vòng.
- **Nghiên cứu Asset & Canvas 2D Rendering:**
  * **Phong cách đồ họa (Art Style):** Pixel Art 8-bit / Arcade tròn trĩnh dễ thương, tông màu pastel kẹo ngọt hoài niệm
  * **Bảng màu đặc trưng (Color Palette):** `#10B981`, `#34D399`, `#38BDF8`, `#F472B6`, `#FBBF24`, `#6366F1`
  * **Danh mục Sprites cần thiết để render:**
    + Khủng long xanh Bub & khủng long đỏ Bob (chạy lăng xăng, há miệng nhả bóng, nhảy nhún, vung đuôi vui sướng)
    + Quả bóng nước tròn trong suốt (bóng rỗng, bóng nhốt quái vật quay cuồng, bóng chứa sét, bóng chứa nước, bóng chứa lửa)
    + Quái vật: Quái phù thủy áo choàng Zen-chan lên dây cót, quái lơ lửng Monsta, quái bay ném đá Banebou
    + Trái cây và quà thưởng: Quả chuối, cây kẹo mút, dưa hấu đỏ, chiếc bánh ngọt kem tươi, kim cương đa sắc
    + Cấu trúc mê cung tầng gạch hoa văn rực rỡ với các khoảng trống rơi xuống đáy lại trồi lên trên đỉnh

---

### 110. Thời Đại Chiến Tranh (Age of War) (`age-of-war-thoi-dai-chien-tranh`)
- **Tên gốc & Niên đại:** Age of War (Louissi / Armor Games 2007) • *Web Flash (2007)*
- **Tagline:** *"Từ người tiền sử cầm dùi cui đến xe tăng công nghệ tương lai!"*
- **Thể loại:** Chiến thuật | **Phân mục:** `hot` | **Huy hiệu:** Huyền thoại | **Màu chủ đạo:** `#B45309`
- **Số người chơi:** 1 người | **Thời lượng ván:** 5-10 phút
- **Tóm tắt cơ chế:** Triệu hồi quân lính, lắp tháp pháo phòng thủ căn cứ, tích lũy điểm kinh nghiệm tiến hóa qua 5 thời kỳ lịch sử
- **Vòng lặp chơi cốt lõi (Core Loop):**
  > Tích lũy tiền vàng theo thời gian -> Mua quân chiến đấu xuất trận từ căn cứ bên trái -> Quân lính tự động hành quân và giao tranh tại chiến tuyến giữa bản đồ -> Mua và nâng cấp các ụ pháo trên nóc căn cứ bắn yểm trợ -> Tích lũy điểm kinh nghiệm (XP) qua mỗi mạng tiêu diệt -> Nhấn nút 'Tiến Hóa' để nâng cấp toàn diện thời kỳ (Thời Tiền Sử -> Cổ Đại -> Phục Hưng -> Hiện Đại -> Tương Lai) -> Phá hủy căn cứ đối phương.
- **Thiết kế Cảm giác tay (Tactile Game Feel):**
  * **Hệ thống phím điều khiển:** Chuột / Touch: Nhấp thanh icon trên đỉnh màn hình để mua lính, xây ụ tháp, kích hoạt chiêu dội thiên thạch đặc biệt; Phím số 1,2,3,4 phím tắt mua quân.
  * **Độ giật nảy màn hình (Screenshake):** Rung 4px khi đạn đại bác bắn nổ; Rung cực đại 16px (trauma 1.0, 450ms) khi kích hoạt Tuyệt Chiêu Thiên Thạch mưa đá rực lửa dội xuống chiến trường.
  * **Độ đầm & Khựng khung hình (Hitstop):** Khựng 50ms khi kỵ binh lao giáo đâm trúng mục tiêu; Khựng 80ms khi xe tăng nã phát pháo công phá căn cứ.
  * **Âm thanh phản hồi (Procedural Audio SFX):** Procedural Web Audio: Tiếng triệu hồi quân 'War Horn' (Sawtooth 220Hz hào hùng); Tiếng chém kiếm 'Slash' (White noise filtered); Tiếng súng trường nã đạn 'Bang-Bang' đanh thép; Tiếng đại bác nổ 'Heavy Sub-Bass Thump' (Bass 45Hz sâu lắng); Tiếng kèn trumpet khải hoàn tiến hóa thời kỳ; Nhạc nền hùng tráng hoài niệm 'Glorious Morning' của Waterflame.
  * **Hiệu ứng hạt va chạm (Particles):** Mưa thiên thạch lửa rơi xé toạc bầu trời; Khói bụi chiến trường xám mù mịt; Mảnh vỡ gạch đá văng tung tóe khi tường thành căn cứ bị bắn vỡ; Tia lửa đạn pháo lóe sáng ban đêm.
- **Nghiên cứu Asset & Canvas 2D Rendering:**
  * **Phong cách đồ họa (Art Style):** Vector Flash 2D cuộn ngang đặc trưng Armor Games những năm 2007, nét vẽ sắc nét hào hùng
  * **Bảng màu đặc trưng (Color Palette):** `#B45309`, `#78350F`, `#DC2626`, `#F59E0B`, `#38BDF8`, `#1E293B`
  * **Danh mục Sprites cần thiết để render:**
    + 5 Thời kỳ lính chiến đấu: Người tiền sử vác gậy / Kỵ sĩ thời trung cổ / Xạ thủ súng hỏa mai / Lính xe tăng hiện đại / Siêu chiến binh người máy tương lai
    + Tòa lâu đài căn cứ biến đổi qua 5 cấp bậc: Hang đá tiền sử -> Lâu đài đá có hào nước -> Pháo đài gạch -> Bunker bê tông cốt thép -> Căn cứ lá chắn từ trường vũ trụ
    + Tháp pháo trên nóc: Nỏ bắn đá, đại bác thần công, pháo cao xạ, súng laze plasma
    + Chiêu thức đặc biệt: Mưa sao băng thiên thạch rực lửa, oanh tạc máy bay ném bom B-52, chùm tia vệ tinh không gian

---

### 111. Khối Đá Lăn Bloxorz (`bloxorz-khoi-da-lan`)
- **Tên gốc & Niên đại:** Bloxorz (Damien Clarke / DX Interactive 2007) • *Web Flash (2007)*
- **Tagline:** *"Lật khối chữ nhật 3D, căn từng bước rớt trúng hố vuông!"*
- **Thể loại:** Giải đố | **Phân mục:** `quick` | **Huy hiệu:** Đỉnh cao | **Màu chủ đạo:** `#475569`
- **Số người chơi:** 1 người | **Thời lượng ván:** 3-8 phút
- **Tóm tắt cơ chế:** Lật khối đá kích thước 1x1x2 trên sàn gạch lơ lửng, đưa khối đá đứng thẳng lọt vào lỗ vuông
- **Vòng lặp chơi cốt lõi (Core Loop):**
  > Quan sát sơ đồ sàn gạch lơ lửng không gian -> Lăn khối đá chữ nhật sang 4 hướng (nằm ngang hoặc dựng đứng) -> Kích hoạt công tắc tròn (gạt nhẹ) hoặc công tắc dấu X (chỉ bật khi khối đá dựng đứng) -> Mở cầu nối giữa các đảo gạch -> Tránh lăn lên gạch cam yếu làm sập sàn -> Dựng đứng khối đá rơi vừa khít vào lỗ vuông đỏ để qua màn.
- **Thiết kế Cảm giác tay (Tactile Game Feel):**
  * **Hệ thống phím điều khiển:** Phím mũi tên 4 hướng (hoặc vuốt màn hình cảm ứng theo góc nghiêng isometric 45 độ); Phím R chơi lại màn chơi; Phím Space chuyển đổi điều khiển khi khối đá tách đôi.
  * **Độ giật nảy màn hình (Screenshake):** Rung nảy 2px mỗi bước lật khối đá chạm nền gạch; Rung 6px kèm hiệu ứng xoay camera khi khối đá trượt chân rơi xuống vực sâu không đáy.
  * **Độ đầm & Khựng khung hình (Hitstop):** Khựng 60ms đúng khoảnh khắc khối đá trượt rơi cắm thẳng xuống lỗ đích thành công.
  * **Âm thanh phản hồi (Procedural Audio SFX):** Procedural Web Audio: Tiếng đá va đá đanh chắc 'Clack-Thud' (Square wave lọc LPF kết hợp Noise burst 200Hz); Tiếng công tắc bật mở 'Click-Whirr' cơ khí; Tiếng cầu sắt mở ra 'Clank-clank'; Tiếng rơi vực sâu gió hú 'Whoooosh' nhỏ dần; Tiếng hoàn thành màn chơi nốt dương cầm trong trẻo (Major Chord C-E-G).
  * **Hiệu ứng hạt va chạm (Particles):** Bụi đá trắng bốc lên nhẹ nhàng ở các cạnh tiếp xúc; Mảnh gạch cam vỡ vụn rơi xoay tròn vào bóng tối; Ánh sáng hào quang phát ra từ lỗ vuông đích khi hoàn thành.
- **Nghiên cứu Asset & Canvas 2D Rendering:**
  * **Phong cách đồ họa (Art Style):** 3D Isometric tối giản thanh lịch, đổ bóng mềm mại, không gian vũ trụ tĩnh lặng bí ẩn
  * **Bảng màu đặc trưng (Color Palette):** `#475569`, `#94A3B8`, `#0F172A`, `#F97316`, `#DC2626`, `#38BDF8`
  * **Danh mục Sprites cần thiết để render:**
    + Khối đá chữ nhật 1x1x2 vân đá hoa cương màu xám kim loại bóng loáng
    + Các loại sàn gạch: Gạch xám kiên cố, gạch cam giòn dễ vỡ khi dựng đứng, gạch laser
    + Công tắc cơ học: Nút tròn mở nhẹ, nút chữ X nặng, nút tách khối đá thành 2 khối lập phương 1x1
    + Lỗ vuông đích phát sáng đỏ rực rỡ ở đáy
    + Cảnh nền: Không gian vũ trụ đen sâu thẳm với những vì sao trôi dạt chậm rãi

---

### 112. Bắn Phao Raft Wars (`raft-wars-ban-sung-phao`)
- **Tên gốc & Niên đại:** Raft Wars (Martijn Kunst 2007) • *Web Flash (2007)*
- **Tagline:** *"Đạn tennis ngắm bắn, bảo vệ rương vàng trên bè phao biển xanh!"*
- **Thể loại:** Kéo thả | **Phân mục:** `quick` | **Huy hiệu:** Tuổi thơ | **Màu chủ đạo:** `#0284C7`
- **Số người chơi:** 1-2 người | **Thời lượng ván:** 3-6 phút
- **Tóm tắt cơ chế:** Bắn súng tọa độ vật lý theo lượt, căn góc bắn và lực phóng bóng tennis/tên lửa hất cướp biển xuống nước
- **Vòng lặp chơi cốt lõi (Core Loop):**
  > Hai anh em bé Simon ngồi trên bè phao giữ rương kim cương -> Kéo chuột căn góc nghiêng và thanh lực bắn -> Thả chuột bắn bóng tennis bay theo đường cong parabol -> Đạn va chạm hất văng cướp biển, dân du kích hoặc tàu cảnh sát rơi xuống biển -> Đổi lượt đối thủ bắn trả -> Tiêu diệt toàn bộ đối phương để kiếm tiền vàng mua nâng cấp thuyền bè và súng phóng lựu.
- **Thiết kế Cảm giác tay (Tactile Game Feel):**
  * **Hệ thống phím điều khiển:** Kéo giữ chuột trái để điều chỉnh đường ngắm và lực bắn; Nhả chuột để bắn đạn; Phím số 1,2,3 đổi vũ khí (Bóng tennis, Lựu đạn nổ, Tên lửa tầm nhiệt).
  * **Độ giật nảy màn hình (Screenshake):** Rung 4px khi đạn tennis nảy; Rung mạnh 10px (trauma 0.8) khi tên lửa va chạm thuyền gỗ phát nổ tung bọt nước.
  * **Độ đầm & Khựng khung hình (Hitstop):** Khựng 50ms khi đạn bắn trúng đầu tên cướp biển khiến hắn lộn nhào 360 độ rơi tòm xuống nước.
  * **Âm thanh phản hồi (Procedural Audio SFX):** Procedural Web Audio: Tiếng súng hơi bắn bóng 'Pfoof' (Triangle 300Hz -> 100Hz); Tiếng bóng nảy 'Boing'; Tiếng nổ lựu đạn 'Boom' uy lực; Tiếng người rơi xuống nước 'Splash' bọt nước bắn tung tóe; Tiếng cười khúc khích 'Yeah-he!' của em bé Simon khi bắn trúng.
  * **Hiệu ứng hạt va chạm (Particles):** Cột nước trắng xóa bắn vọt lên cao khi kẻ địch rơi xuống biển; Mảnh gỗ thuyền văng ra; Khói trắng cuộn tròn sau đuôi quả tên lửa bay.
- **Nghiên cứu Asset & Canvas 2D Rendering:**
  * **Phong cách đồ họa (Art Style):** Vector hoạt hình tươi sáng, nét vẽ tròn trịa vui nhộn đặc trưng phim hoạt hình đầu những năm 2000
  * **Bảng màu đặc trưng (Color Palette):** `#0284C7`, `#38BDF8`, `#FDE047`, `#F97316`, `#EF4444`, `#15803D`
  * **Danh mục Sprites cần thiết để render:**
    + Em bé Simon đội mũ phao vàng và em trai ngồi trên bè phao bơm hơi màu đỏ
    + Rương kho báu chứa kim cương lấp lánh đặt giữa bè
    + Thuyền địch: Ca nô cướp biển, thuyền nan của thổ dân, tàu tuần tra cảnh sát biển
    + Vũ khí đạn: Quả bóng tennis vàng, quả lựu đạn màu xanh quân đội, tên lửa đầu đỏ
    + Cảnh biển nhiệt đới: Bãi biển cát trắng, rặng dừa nghiêng, mây trắng bồng bềnh

---

### 113. Tiệm Bánh Pizza Của Papa (`papa-pizzeria-tiem-banh-pizza`)
- **Tên gốc & Niên đại:** Papa's Pizzeria (Flipline Studios 2007) • *Web Flash (2007)*
- **Tagline:** *"Cán bột, rải đều topping, canh lò giòn rụm làm hài lòng thực khách!"*
- **Thể loại:** Quản lý | **Phân mục:** `hot` | **Huy hiệu:** Kinh điển | **Màu chủ đạo:** `#E11D48`
- **Số người chơi:** 1 người | **Thời lượng ván:** 4-8 phút
- **Tóm tắt cơ chế:** Quản lý 4 trạm công đoạn ẩm thực (Order Station, Topping Station, Baking Station, Cutting Station) theo thời gian thực
- **Vòng lặp chơi cốt lõi (Core Loop):**
  > Nhận phiếu gọi món (Order Ticket) từ khách hàng khó tính -> Sang trạm Topping rải đều xúc xích, phô mai, nấm, ớt chuông đúng tỉ lệ đối xứng -> Chuyển vào lò nướng Bake Station canh chuẩn vạch thời gian vàng -> Sang trạm Cắt bánh dùng dao lăn cắt chính xác 4, 6 hoặc 8 miếng đều tăm tắp -> Trả bánh và nhận tiền tip dựa trên độ hoàn hảo.
- **Thiết kế Cảm giác tay (Tactile Game Feel):**
  * **Hệ thống phím điều khiển:** Kéo thả chuột hoàn toàn: Kẹp vé vào dây phơi, kéo nguyên liệu rải đều lên mặt bánh, bấm công tắc lò nướng, kéo dao lăn cắt bánh; Mobile: Vuốt và chạm đa điểm trơn tru.
  * **Độ giật nảy màn hình (Screenshake):** Rung nhẹ 1px phản hồi khi đặt nguyên liệu trúng tâm; Rung giật 5px khi chuông lò nướng reo báo động bánh bị cháy khét.
  * **Độ đầm & Khựng khung hình (Hitstop):** Khựng 40ms khi lưỡi dao lăn cắt ngọt ngào qua lớp vỏ bánh giòn tan.
  * **Âm thanh phản hồi (Procedural Audio SFX):** Procedural Web Audio: Tiếng kẹp vé kim loại 'Ching' thanh mảnh; Tiếng rải phô mai sột soạt; Tiếng xúc xích rơi 'Plop'; Tiếng lửa lò nướng reo 'Sizzle-hiss'; Tiếng chuông lò reo 'Ding!'; Tiếng dao lăn cắt bánh giòn rụm 'Crunch-crack'; Tiếng vỗ tay hoan hô của khách khi đạt 100% điểm Star.
  * **Hiệu ứng hạt va chạm (Particles):** Hơi nóng bốc lên ngùn ngụt từ chiếc bánh mới ra lò; Vụn phô mai và bột mì rơi lả tả; Tiền xu vàng bay lên lấp lánh khi khách boa tiền tip.
- **Nghiên cứu Asset & Canvas 2D Rendering:**
  * **Phong cách đồ họa (Art Style):** Vector Flash Chibi chi tiết ẩm thực sống động, màu sắc ấm cúng kích thích vị giác
  * **Bảng màu đặc trưng (Color Palette):** `#E11D48`, `#F59E0B`, `#FBBF24`, `#78350F`, `#16A34A`, `#FFFFFF`
  * **Danh mục Sprites cần thiết để render:**
    + Nhân vật đầu bếp Roy / Joy và dàn khách quen đa dạng cá tính (Jojo phê bình gia, Wally, Rita)
    + Đế bánh pizza các kích cỡ từ nhỏ đến lớn, các giai đoạn nướng: Bột trắng -> Chín vàng -> Cháy đen
    + Topping: Xúc xích pepperoni tròn đỏ, phô mai kéo sợi, nấm lát nâu, ớt chuông xanh, hành tây, ô liu đen
    + Dao lăn cắt bánh pizza cán gỗ sắc lẹm
    + Bảng chấm điểm 4 tiêu chí kèm huy chương sao vàng

---

### 114. Chiến Tranh Người Que (Stick War) (`stick-war-chien-tranh-nguoi-que`)
- **Tên gốc & Niên đại:** Stick War (Jason Whitham / Brock White 2009) • *Web Flash (2009)*
- **Tagline:** *"Đào vàng, rèn kiếm sĩ, giương cung phá hủy tượng đài đối phương!"*
- **Thể loại:** Chiến thuật | **Phân mục:** `hot` | **Huy hiệu:** Huyền thoại | **Màu chủ đạo:** `#334155`
- **Số người chơi:** 1 người | **Thời lượng ván:** 6-12 phút
- **Tóm tắt cơ chế:** Chiến thuật thời gian thực (RTS) điều khiển dân tộc người que: khai khoáng, luyện quân, điều khiển tướng thủ công
- **Vòng lặp chơi cốt lõi (Core Loop):**
  > Tuyển phu đào vàng gom tài nguyên mỏ -> Huấn luyện các binh chủng (Kiếm sĩ Swordwrath, Cung thủ Archidon, Giáo binh Spearton, Phù thủy Magikill, Người khổng lồ Giant) -> Chuyển đổi giữa chế độ Phòng thủ (Defend) / Rút lui (Retreat) / Tổng tấn công (Attack) -> Trực tiếp nhập vai điều khiển một binh lính bất kỳ để lật ngược thế cờ -> Đánh sập pho tượng khổng lồ của phe địch.
- **Thiết kế Cảm giác tay (Tactile Game Feel):**
  * **Hệ thống phím điều khiển:** Chuột nhấp chọn biểu tượng luyện quân và chuyển chế độ; Phím Space hoặc nhấp vào lính để trực tiếp điều khiển tướng (WASD di chuyển, Chuột trái tấn công, Chuột phải giơ khiên đỡ đòn).
  * **Độ giật nảy màn hình (Screenshake):** Rung 4px khi cung tên bay trúng đích; Rung chấn 14px (trauma 1.0, 400ms) mỗi bước chân giậm sàn của Người Khổng Lồ và khi pho tượng đá sụp đổ.
  * **Độ đầm & Khựng khung hình (Hitstop):** Khựng 60ms cho mỗi đòn đâm giáo xuyên giáp; Khựng 90ms khi cú đập chùy của Người khổng lồ hất văng cả hàng lính đối phương lên trời.
  * **Âm thanh phản hồi (Procedural Audio SFX):** Procedural Web Audio: Tiếng cuốc bổ vào mỏ vàng 'Clink-clank' kim khí giòn giã; Tiếng rút kiếm xé gió 'Shing!'; Tiếng mưa tên bay rào rào 'Fwip-fwip-fwip'; Tiếng chùy nện xuống đất 'Thump Sub-bass 50Hz'; Tiếng hô xung trận hào hùng 'Attack!'; Tiếng sụp đổ ầm ầm của tượng đá.
  * **Hiệu ứng hạt va chạm (Particles):** Máu đen người que bắn tung tóe; Bụi đá mỏ vàng văng ra; Mũi tên cắm chi chít xuống mặt đất và trên khiên chắn; Tia sét phép thuật xanh phát sáng từ gậy phù thủy.
- **Nghiên cứu Asset & Canvas 2D Rendering:**
  * **Phong cách đồ họa (Art Style):** Silhouette Stickman đen tuyền đối lập với cảnh nền hoàng hôn chiến trường rực lửa kỳ vĩ
  * **Bảng màu đặc trưng (Color Palette):** `#334155`, `#0F172A`, `#F59E0B`, `#DC2626`, `#64748B`, `#FDE047`
  * **Danh mục Sprites cần thiết để render:**
    + Các lớp lính người que: Thợ mỏ vác cuốc, Kiếm sĩ vung kiếm, Cung thủ giương cung, Giáo binh cầm khiên đồng, Phù thủy đội mũ chóp, Khổng lồ vác khúc gỗ
    + Pho tượng đá khổng lồ biểu tượng đế chế hai bên chiến tuyến (nguyên vẹn -> nứt nẻ -> vỡ vụn)
    + Mỏ vàng lấp lánh trên vách núi
    + Vũ khí bay: Mũi tên nhọn bay theo quỹ đạo, quả cầu lửa ma thuật nổ tung

---

### 115. Bảo Vệ Lâu Đài (Defend Your Castle) (`defend-your-castle-thu-thanh-nguoi-que`)
- **Tên gốc & Niên đại:** Defend Your Castle (XGen Studios 2003) • *Web Flash (2003)*
- **Tagline:** *"Nắm bổng kẻ địch quăng lên trời, gia cố tường thành trước biển người que!"*
- **Thể loại:** Kỹ năng | **Phân mục:** `quick` | **Huy hiệu:** Tuổi thơ | **Màu chủ đạo:** `#78716C`
- **Số người chơi:** 1 người | **Thời lượng ván:** 3-6 phút
- **Tóm tắt cơ chế:** Tương tác vật lý kéo thả chuột cực nhanh: túm lấy kẻ địch đang xông tới ném bổng lên trời cho rơi tự do
- **Vòng lặp chơi cốt lõi (Core Loop):**
  > Từng đàn quân xâm lược người que tràn qua bình nguyên tiến về lâu đài -> Nhấp và giữ chuột túm lấy quân địch, vung mạnh tay quăng vút lên trời -> Trọng lực kéo kẻ địch rơi tự do cắm đầu xuống đất tan xác -> Ngăn cản quân địch đập phá tường thành -> Kiếm điểm nâng cấp lâu đài thành đá kiên cố, tuyển cung thủ, pháp sư thu phục tù binh sang phe mình.
- **Thiết kế Cảm giác tay (Tactile Game Feel):**
  * **Hệ thống phím điều khiển:** Kéo chuột trái tốc độ cao để túm và hất văng quân địch; Phím số 1,2,3 kích hoạt kỹ năng ma thuật; Mobile: Vuốt ngón tay hất tung kẻ địch lên không trung.
  * **Độ giật nảy màn hình (Screenshake):** Rung 3px mỗi khi kẻ địch tiếp đất va đập; Rung mạnh 8px khi bom phá thành phát nổ sát vách tường.
  * **Độ đầm & Khựng khung hình (Hitstop):** Khựng 30ms đúng thời điểm túm trúng đầu kẻ địch tạo cảm giác bám dính chắc tay.
  * **Âm thanh phản hồi (Procedural Audio SFX):** Procedural Web Audio: Tiếng túm lấy người 'Grab-squish' (Sine 200Hz); Tiếng vung ném xé gió 'Whoooosh' (Noise sweep); Tiếng rơi đập đất 'Splat-Crunch' (White noise nén + Thud 110Hz); Tiếng quân địch la hét thất thanh khi bay lên không trung; Tiếng chuông vàng nâng cấp lâu đài.
  * **Hiệu ứng hạt va chạm (Particles):** Máu đỏ bắn tung tóe thành vệt trên thảm cỏ xanh khi kẻ địch tiếp đất; Khói bụi bay lên khi lâu đài bị công phá; Vệt gió lốc khi quăng kẻ địch tốc độ cao.
- **Nghiên cứu Asset & Canvas 2D Rendering:**
  * **Phong cách đồ họa (Art Style):** Nghệ thuật vẽ tay phác thảo trên trang giấy nháp (Doodle Art / Notebook Sketch) mộc mạc và hài hước
  * **Bảng màu đặc trưng (Color Palette):** `#78716C`, `#E7E5E4`, `#DC2626`, `#0284C7`, `#15803D`, `#44403C`
  * **Danh mục Sprites cần thiết để render:**
    + Người que xâm lược: Lính chạy bộ tay không, lính vác thang trèo, lính ôm bom tự sát, xe công thành gỗ
    + Tòa lâu đài trung tâm qua các cấp: Hàng rào gỗ mộc -> Thành lũy đất -> Pháo đài đá kiên cố có tháp canh
    + Lực lượng phòng thủ trên tháp: Cung thủ áo xanh bắn tên, pháp sư áo tím niệm chú chuyển hóa quân địch
    + Vết máu và xác lính tan biến dần trên mặt đất

---

### 116. Vượn Khổng Lồ Ném Thùng (`donkey-kong-1981`)
- **Tên gốc & Niên đại:** Donkey Kong (Nintendo 1981 - Shigeru Miyamoto) • *Arcade (1981)*
- **Tagline:** *"Leo giàn giáo, nhảy né thùng gỗ lăn cứu lấy người đẹp!"*
- **Thể loại:** Hành động | **Phân mục:** `classic` | **Huy hiệu:** Kinh điển | **Màu chủ đạo:** `#C2410C`
- **Số người chơi:** 1 người | **Thời lượng ván:** 3-5 phút
- **Tóm tắt cơ chế:** Nhảy bục leo thang tránh né thùng gỗ lăn theo đường dốc ziczac, nhặt búa thần đập tan chướng ngại
- **Vòng lặp chơi cốt lõi (Core Loop):**
  > Donkey Kong bắt cóc nàng Pauline lên đỉnh giàn giáo công trình -> Mario (Jumpman) bắt đầu từ chân tháp -> Chạy và nhảy né các thùng gỗ lăn ziczac xuống các tầng dốc -> Leo thang sắt tránh đốm lửa ma -> Nhặt chiếc búa thần để đập vỡ thùng gỗ nhận điểm thưởng -> Lên đỉnh tháo chốt giàn giáo để giải cứu nàng công chúa.
- **Thiết kế Cảm giác tay (Tactile Game Feel):**
  * **Hệ thống phím điều khiển:** Trái/Phải (Di chuyển); Lên/Xuống (Leo thang sắt); Phím Space / Z (Nhảy né thùng); Khi cầm búa thần nhân vật tự động vung đập liên tục.
  * **Độ giật nảy màn hình (Screenshake):** Rung 3px mỗi khi thùng gỗ lăn nảy trên sàn; Rung 10px (trauma 0.8) khi Donkey Kong đấm ngực dậm chân làm rung chuyển toàn bộ giàn giáo.
  * **Độ đầm & Khựng khung hình (Hitstop):** Khựng 40ms khi vung búa đập vỡ tan một chiếc thùng gỗ; Khựng 70ms khi tiếp đất sau cú nhảy hoàn hảo.
  * **Âm thanh phản hồi (Procedural Audio SFX):** Procedural Web Audio: Tiếng bước chân 'Clump-clump' ngắt nhịp 8-bit ngộ nghĩnh (Square 180Hz); Tiếng nhảy lò xo 'Spring-Boing' (Sine sweep 300Hz -> 600Hz); Tiếng búa đập thùng vỡ 'Crash-bang' (Noise burst + Square 250Hz); Tiếng thùng gỗ lăn 'Rumble-roll' đều đặn; Tiếng kêu cứu 'Help!' của Pauline.
  * **Hiệu ứng hạt va chạm (Particles):** Mảnh gỗ vụn bay ra khi thùng bị đập vỡ; Đốm lửa xanh le lói lập lòe; Trái tim hồng xuất hiện trên đầu đôi bạn trẻ khi đoàn tụ.
- **Nghiên cứu Asset & Canvas 2D Rendering:**
  * **Phong cách đồ họa (Art Style):** Arcade Retro 8-bit nguyên bản 1981, giàn giáo đỏ rực tương phản nền đen huyền bí
  * **Bảng màu đặc trưng (Color Palette):** `#C2410C`, `#EF4444`, `#3B82F6`, `#FACC15`, `#FFFFFF`, `#000000`
  * **Danh mục Sprites cần thiết để render:**
    + Mario Jumpman thợ mộc áo yếm đỏ mũ đỏ (chạy nghiêng, leo thang ngoáy mông, nhảy co chân, vung búa lên xuống)
    + Vượn khổng lồ Donkey Kong lông nâu (đứng trên đỉnh ném thùng, đấm ngực bành bạch, ngã lộn cổ khi sập sàn)
    + Nàng Pauline váy hồng vẫy tay kêu cứu
    + Thùng gỗ lăn nghiêng, thùng gỗ rực lửa, chiếc búa thần màu vàng kim
    + Hệ thống xà gồ sắt màu đỏ nghiêng dốc kết hợp thang leo màu xanh dương

---

### 117. Đào Hầm Bơm Bong Bóng (Dig Dug) (`dig-dug-dao-dat-bom-quai`)
- **Tên gốc & Niên đại:** Dig Dug (Namco 1982) • *Arcade (1982)*
- **Tagline:** *"Đào địa đạo lòng đất, cắm ống bơm phồng tiêu diệt quái vật!"*
- **Thể loại:** Hành động | **Phân mục:** `classic` | **Huy hiệu:** Tuổi thơ | **Màu chủ đạo:** `#0D9488`
- **Số người chơi:** 1 người | **Thời lượng ván:** 3-6 phút
- **Tóm tắt cơ chế:** Đào hầm ngầm trong các tầng địa chất, phóng ống bơm làm căng phồng quái vật đến phát nổ, hoặc đào rơi đá tảng đè bẹp địch
- **Vòng lặp chơi cốt lõi (Core Loop):**
  > Đào các đường hầm ngoằn ngoèo qua từng lớp đất nhiều màu -> Dụ lũ quái Pooka và Fygar đuổi theo trong hầm -> Phóng vòi bơm cắm vào người quái -> Bấm phím bơm liên tục để bơm phồng quái vật to dần cho đến khi nổ tung -> Đào đất dưới chân các tảng đá lớn để đá rơi tự do đè bẹp hàng loạt quái vật -> Thu hoạch trái cây lòng đất nhận điểm cao.
- **Thiết kế Cảm giác tay (Tactile Game Feel):**
  * **Hệ thống phím điều khiển:** Phím mũi tên 4 hướng di chuyển đào đất; Phím Space / Z phóng vòi bơm và ấn nhịp liên tục để bơm khí; Mobile: D-pad vuốt hầm + nút Bơm lớn.
  * **Độ giật nảy màn hình (Screenshake):** Rung 2px mỗi bước đào đất; Rung mạnh 8px khi tảng đá ngàn cân rơi xuống đất đè bẹp quái vật; Rung 6px khi quái nổ tung.
  * **Độ đầm & Khựng khung hình (Hitstop):** Khựng 30ms mỗi nhịp bơm khí phồng; Khựng 60ms khi quái vật nổ tung 'Pop'.
  * **Âm thanh phản hồi (Procedural Audio SFX):** Procedural Web Audio: Điệu nhạc chiptune chỉ phát khi nhân vật di chuyển đào đất (bước dừng thì nhạc dừng cực độc đáo); Tiếng phóng ống bơm 'Zzip' (Square 700Hz); Tiếng bơm phồng 'Pump-pump' (Sine tăng dần cao độ theo 4 nấc phồng); Tiếng nổ tung 'Pop-Bang' (White noise kết hợp bandpass); Tiếng đá rơi ầm ầm (Bass 60Hz).
  * **Hiệu ứng hạt va chạm (Particles):** Hạt đất cát văng ra khi đào hầm; Vụ nổ hạt khí màu vàng/đỏ khi quái vỡ tan; Mảnh đá tảng vỡ vụn khi chạm đáy hầm.
- **Nghiên cứu Asset & Canvas 2D Rendering:**
  * **Phong cách đồ họa (Art Style):** Arcade 8-bit ngộ nghĩnh, lát cắt địa chất 4 tầng màu đặc trưng thập niên 80
  * **Bảng màu đặc trưng (Color Palette):** `#0D9488`, `#EA580C`, `#F59E0B`, `#DC2626`, `#FDE047`, `#1E293B`
  * **Danh mục Sprites cần thiết để render:**
    + Chàng thợ đào Dig Dug mặc đồ lặn trắng đội mũ có gắn vòi bơm cầm mũi khoan
    + Quái Pooka quả cà chua đỏ đeo kính bơi màu vàng; Quái rồng xanh Fygar biết khè lửa ngang qua vách đất
    + Vòi bơm hơi co giãn 4 nấc căng phồng kèm dây dẫn
    + Tảng đá tròn xám lơ lửng chờ rơi
    + Lát cắt 4 tầng đất: Tầng đất mặt vàng nâu, tầng đất cam, tầng đất đỏ và tầng đất tối đáy cùng

---

### 118. Heo Mẹ Bắn Nỏ (Pooyan) (`pooyan-lon-me-ban-bong`)
- **Tên gốc & Niên đại:** Pooyan (Konami 1982) • *Arcade / NES (1982)*
- **Tagline:** *"Lên xuống giỏ kéo, bắn rách bóng bay của bầy sói đói!"*
- **Thể loại:** Kỹ năng | **Phân mục:** `quick` | **Huy hiệu:** Tuổi thơ | **Màu chủ đạo:** `#FB7185`
- **Số người chơi:** 1 người | **Thời lượng ván:** 3-5 phút
- **Tóm tắt cơ chế:** Kéo giỏ thang dây di chuyển theo trục dọc, bắn nỏ làm vỡ bóng bay của bầy sói đang thả dù hoặc leo dây
- **Vòng lặp chơi cốt lõi (Core Loop):**
  > Heo mẹ Mama đứng trong chiếc giỏ cáp treo bên phải vách đá -> Di chuyển giỏ lên xuống nhịp nhàng -> Bắn nỏ tên bay ngang làm nổ bóng bay của lũ sói đang đu dây từ trên trời xuống (Màn 1) hoặc từ dưới đất bay lên (Màn 2) -> Ném miếng thịt đùi heo nướng đặc biệt để quét sạch cả hàng sói -> Ngăn không cho sói leo lên đỉnh vách đá đẩy đá đè bẹp giỏ -> Bảo vệ đàn heo con Pooyan an toàn.
- **Thiết kế Cảm giác tay (Tactile Game Feel):**
  * **Hệ thống phím điều khiển:** Mũi tên Lên/Xuống (Kéo giỏ di chuyển trục dọc); Phím Space / Z (Bắn tên nỏ); Phím X (Ném miếng thịt cung tròn càn quét); Mobile: Thanh trượt dọc điều khiển giỏ + nút Bắn nỏ.
  * **Độ giật nảy màn hình (Screenshake):** Rung 3px mỗi khi mũi tên bắn trúng bóng nổ; Rung 10px (trauma 0.8) khi tảng đá lớn của lũ sói rơi trúng giỏ.
  * **Độ đầm & Khựng khung hình (Hitstop):** Khựng 40ms khi mũi tên xuyên thủng quả bóng bay; Khựng 70ms khi miếng thịt đùi ném trúng bầy sói rụng như sung.
  * **Âm thanh phản hồi (Procedural Audio SFX):** Procedural Web Audio: Tiếng tời cáp quay giỏ 'Rrr-rrr' cót két cơ khí; Tiếng nỏ bắn 'Twang' (Triangle wave 440Hz -> 220Hz nhún nảy); Tiếng bóng bay nổ 'Pop!' giòn rụm (White noise ngắn lọc cao); Tiếng sói rơi xuống vực thất thanh 'Yelp-howl'; Tiếng heo con nhảy múa ăn mừng ríu rít.
  * **Hiệu ứng hạt va chạm (Particles):** Mảnh cao su bóng bay màu sắc bung ra; Chiếc dù rơi lảo đảo; Ngôi sao điểm số rơi theo thân sói rụng xuống đáy vực.
- **Nghiên cứu Asset & Canvas 2D Rendering:**
  * **Phong cách đồ họa (Art Style):** Pixel Art 8-bit NES đồng thoại ngộ nghĩnh, vách núi cây cối xanh tươi
  * **Bảng màu đặc trưng (Color Palette):** `#FB7185`, `#F43F5E`, `#38BDF8`, `#FBBF24`, `#65A30D`, `#78350F`
  * **Danh mục Sprites cần thiết để render:**
    + Heo mẹ Mama đội khăn rằn đỏ đứng trong giỏ mây có 2 chú heo con quay tời dây
    + Lũ sói xám mặc yếm đỏ/xanh nắm dây bóng bay (bóng đỏ 1 phát nổ, bóng hồng nảy đạn, bóng đen cứng cáp)
    + Vũ khí: Mũi tên nỏ gỗ bay ngang, miếng thịt đùi nướng màu nâu thơm lừng ném theo quỹ đạo parabol
    + Vách núi đá có cây cổ thụ bên bờ vực sâu, chiếc thang dây đu đưa trong gió

---

### 119. Đấu Võ Đường Thiếu Lâm (`yie-ar-kung-fu-vo-dai`)
- **Tên gốc & Niên đại:** Yie Ar Kung-Fu (Konami 1985) • *Arcade / NES (1985)*
- **Tagline:** *"Thập lục tuyệt kỹ đấm đá, tỷ thí từng đệ nhất cao thủ võ lâm!"*
- **Thể loại:** Đối kháng | **Phân mục:** `classic` | **Huy hiệu:** Kinh điển | **Màu chủ đạo:** `#B91C1C`
- **Số người chơi:** 1-2 người | **Thời lượng ván:** 3-5 phút
- **Tóm tắt cơ chế:** Đối kháng võ thuật 16 thế đòn biến hóa theo 8 hướng di chuyển kết hợp phím đấm/đá, khắc chế vũ khí đặc thù của từng boss
- **Vòng lặp chơi cốt lõi (Core Loop):**
  > Vào võ đường diện kiến cao thủ -> Nhảy lộn vòng né vũ khí tầm xa (Côn, Quạt phi tiêu, Kiếm, Dây xích, Quả cầu sắt) -> Kết hợp nút di chuyển 8 hướng + nút Đấm/Đá để xuất chiêu (đá tầm thấp, đấm trung lộ, phi cước trên không) -> Tấn công vào sơ hở khi đối thủ hồi chiêu -> Rút cạn thanh máu đối phương để xướng tên đệ nhất võ lâm.
- **Thiết kế Cảm giác tay (Tactile Game Feel):**
  * **Hệ thống phím điều khiển:** 8 hướng Mũi tên (Di chuyển/Nhảy lộn nhào/Cúi); Phím Z (Đấm); Phím X (Đá); Kết hợp Hướng + Đấm/Đá để tạo ra 16 chiêu thức võ thuật Thiếu Lâm khác nhau.
  * **Độ giật nảy màn hình (Screenshake):** Rung 4px cho đòn đá trúng đích; Rung 9px khi tung cú phi cước song phi trên không trúng mặt đối thủ.
  * **Độ đầm & Khựng khung hình (Hitstop):** Khựng 50ms rất đặc trưng khi chiêu thức tiếp xúc cơ thể đối phương, tạo độ nặng chắc nịch của đòn võ cổ truyền.
  * **Âm thanh phản hồi (Procedural Audio SFX):** Procedural Web Audio: Tiếng hét xuất chiêu 'Yie-Ar!' đặc trưng; Tiếng đấm trúng đích 'Thump-smack' (Square wave kết hợp Thud 120Hz); Tiếng vũ khí xé gió vù vù (Noise sweep); Tiếng quạt sắt mở xoạch 'Snap!'; Khúc nhạc thắng trận cung đình ngũ cung Trung Hoa cổ truyền.
  * **Hiệu ứng hạt va chạm (Particles):** Tia chớp va chạm hình hoa mai nở ra khi đòn đánh trúng huyệt đạo; Phi tiêu và ám khí rơi cắm xuống sàn gỗ vỡ vụn.
- **Nghiên cứu Asset & Canvas 2D Rendering:**
  * **Phong cách đồ họa (Art Style):** Pixel Art 8-bit đậm chất võ hiệp Á Đông thập niên 80, võ đường trang nghiêm
  * **Bảng màu đặc trưng (Color Palette):** `#B91C1C`, `#F59E0B`, `#1E293B`, `#FFFFFF`, `#3B82F6`, `#D97706`
  * **Danh mục Sprites cần thiết để render:**
    + Võ sinh Oolong quần xanh cởi trần (thế tấn vững chắc, phi cước trên không, đấm thẳng, đá móc ngược)
    + Dàn cao thủ boss: Buchu (võ sư mập bay lượn), Star (nữ hiệp ném phi tiêu), Nuncha (cao thủ côn nhị khúc), Pole (trượng pháp), Feed (đao kiếm)
    + Vũ khí ám khí bay: Phi tiêu ngôi sao, quạt thép xòe cánh, đầu côn xoay vòng
    + Võ đài Thiếu Lâm với bức hoành phi câu đối chữ Hán và cột gỗ sơn son thếp vàng

---

### 120. Phi Thuyền Bắn Thiên Thạch (`asteroids-tau-ban-thien-thach`)
- **Tên gốc & Niên đại:** Asteroids (Atari 1979 - Lyle Rains / Ed Logg) • *Vector Arcade (1979)*
- **Tagline:** *"Trôi dạt không trọng lực, bắn vỡ đá vụn giữa dải ngân hà!"*
- **Thể loại:** Kỹ năng | **Phân mục:** `classic` | **Huy hiệu:** Kinh điển | **Màu chủ đạo:** `#64748B`
- **Số người chơi:** 1 người | **Thời lượng ván:** 3-6 phút
- **Tóm tắt cơ chế:** Vật lý quán tính không gian 2D xoay hướng và phản lực, bắn vỡ các tảng thiên thạch lớn thành các mảnh nhỏ trôi dạt
- **Vòng lặp chơi cốt lõi (Core Loop):**
  > Tàu con thoi tam giác trôi dạt giữa vũ trụ không trọng lực -> Xoay mũi tàu và nhấn nút đẩy phản lực (Thrust) để lướt đi theo quán tính -> Xuyên qua biên màn hình để xuất hiện ở cạnh đối diện (Screen wrap) -> Bắn đạn laser làm vỡ tảng thiên thạch khổng lồ thành 2 tảng vừa, rồi thành 4 mảnh nhỏ bay nhanh -> Bắn hạ đĩa bay ngoài hành tinh UFO bất ngờ xuất hiện -> Nhấn Hyperspace dịch chuyển tức thời khi bị bao vây.
- **Thiết kế Cảm giác tay (Tactile Game Feel):**
  * **Hệ thống phím điều khiển:** Trái/Phải (Xoay mũi tàu); Mũi tên Lên (Phun lửa phản lực tăng tốc quán tính); Phím Space / Z (Bắn đạn laser); Mũi tên Xuống / Phím Shift (Dịch chuyển không gian Hyperspace).
  * **Độ giật nảy màn hình (Screenshake):** Rung 2px khi bắn laser; Rung 6px khi thiên thạch lớn nổ vỡ; Rung cực mạnh 14px (trauma 1.0) khi phi thuyền va chạm thiên thạch nổ tan xác.
  * **Độ đầm & Khựng khung hình (Hitstop):** Khựng 25ms khi bắn trúng mảnh thiên thạch nhỏ đang bay với vận tốc cao.
  * **Âm thanh phản hồi (Procedural Audio SFX):** Procedural Web Audio: Nhịp tim vũ trụ đập thình thịch tăng tốc dần theo thời gian 'Thump... Thump...' (Sine 60Hz xen kẽ 50Hz); Tiếng đẩy phản lực lửa 'Hiss-Roar' (Noise lọc LPF); Tiếng bắn laser 'Pew-pew' (Square 900Hz -> 300Hz); Tiếng thiên thạch nổ rền vang 'Boom-Crack' (White noise kết hợp Sub-bass); Tiếng đĩa bay UFO vo ve 'Wee-woo-wee-woo'.
  * **Hiệu ứng hạt va chạm (Particles):** Các vệt đường thẳng vector phát sáng tan biến; Vụ nổ bung ra hàng chục đường tia sáng vector bắn tứ tán; Đốm lửa phản lực phụt ra từ đuôi tàu hình tam giác.
- **Nghiên cứu Asset & Canvas 2D Rendering:**
  * **Phong cách đồ họa (Art Style):** Vector Wireframe đồ họa đường nét phát sáng huỳnh quang (Phosphor Glow) trên nền vũ trụ đen sâu thẳm
  * **Bảng màu đặc trưng (Color Palette):** `#FFFFFF`, `#38BDF8`, `#22C55E`, `#EF4444`, `#94A3B8`, `#000000`
  * **Danh mục Sprites cần thiết để render:**
    + Phi thuyền tam giác thanh mảnh (trạng thái trôi, trạng thái phun lửa phản lực đuôi, trạng thái nổ vỡ thành các que sáng)
    + Thiên thạch đa giác 3 cấp kích thước: Khối đá lớn gồ ghề (chậm), khối đá vừa (trung bình), mảnh đá vụn nhỏ (bay cực nhanh)
    + Đĩa bay UFO của người ngoài hành tinh (UFO lớn bắn ngẫu nhiên, UFO nhỏ bắn tỉa cực chuẩn)
    + Các tia laser dạng chấm sáng nối dài theo vector di chuyển

---

### 121. Chú Ếch Sang Sông (Frogger) (`frogger-ech-bang-qua-duong`)
- **Tên gốc & Niên đại:** Frogger (Konami / Sega 1981) • *Arcade (1981)*
- **Tagline:** *"Canh nhịp qua xa lộ xe cộ, nhảy trên mai rùa về tổ đầm lầy!"*
- **Thể loại:** Kỹ năng | **Phân mục:** `classic` | **Huy hiệu:** Kinh điển | **Màu chủ đạo:** `#22C55E`
- **Số người chơi:** 1 người | **Thời lượng ván:** 2-4 phút
- **Tóm tắt cơ chế:** Nhảy từng ô lưới né tránh dòng xe cộ cao tốc và nhảy lên thân gỗ, mai rùa lặn để vượt dòng sông chảy xiết
- **Vòng lặp chơi cốt lõi (Core Loop):**
  > Bắt đầu ở lề đường đáy màn hình -> Nhảy từng bước về phía trước qua 5 làn xe hơi, xe tải, xe ủi chạy với nhiều tốc độ -> Nghỉ chân ở dải phân cách giữa an toàn -> Nhảy tiếp lên các khúc gỗ trôi sông và đàn rùa đang bơi -> Cẩn thận đàn rùa lặn xuống nước làm ếch chìm -> Đưa ếch nhảy vào 1 trong 5 hốc lá sen an toàn trước khi hết giờ -> Cứu đủ 5 chú ếch để qua màn mới.
- **Thiết kế Cảm giác tay (Tactile Game Feel):**
  * **Hệ thống phím điều khiển:** Phím mũi tên 4 hướng (hoặc vuốt cảm ứng 4 hướng); Mỗi lần bấm là một bước nhảy ô cố định dứt khoát không có độ trễ.
  * **Độ giật nảy màn hình (Screenshake):** Rung 2px khi nhảy tiếp đất; Rung 6px khi bị xe cán bẹp hoặc rơi tõm xuống nước.
  * **Độ đầm & Khựng khung hình (Hitstop):** Khựng 40ms khi nhảy trúng tổ lá sen an toàn đón nhận tiếng chuông thưởng điểm.
  * **Âm thanh phản hồi (Procedural Audio SFX):** Procedural Web Audio: Tiếng nhảy 'Hop-Boing' 8-bit ngộ nghĩnh (Sine sweep 250Hz -> 500Hz); Tiếng xe chạy vù vù (Noise sweep); Tiếng còi bóp 'Beep-beep'; Tiếng rơi nước 'Sploosh' (White noise lọc LPF); Tiếng cá sấu ngoạm miệng 'Snap!'; Nhạc nền đồng thoại Nhật Bản cổ điển tươi vui.
  * **Hiệu ứng hạt va chạm (Particles):** Bọt nước trắng xóa nổi lên khi ếch rơi xuống nước; Vết lốp xe in trên mặt đường; Đom đóm phát sáng bay quanh hốc lá sen.
- **Nghiên cứu Asset & Canvas 2D Rendering:**
  * **Phong cách đồ họa (Art Style):** Arcade 8-bit tương phản cao, màu sắc rực rỡ vui mắt đặc trưng thời kỳ hoàng kim game thùng
  * **Bảng màu đặc trưng (Color Palette):** `#22C55E`, `#EAB308`, `#EF4444`, `#3B82F6`, `#854D0E`, `#000000`
  * **Danh mục Sprites cần thiết để render:**
    + Chú ếch xanh mắt lồi (tư thế ngồi thu mình, tư thế nhảy dang 4 chân 4 hướng, tư thế ngã chìm dưới nước)
    + Dòng xe cộ: Xe con thể thao vàng, xe tải ben đỏ, máy kéo nông nghiệp, xe đua F1 siêu tốc
    + Dòng sông: Khúc gỗ dài/ngắn trôi ngang, cụm rùa 2 con / 3 con đang bơi ngoi ngụp
    + Mối nguy: Đầu cá sấu há miệng trên sông, rắn độc bò trên dải phân cách, rái cá bơi lội
    + 5 hốc lá sen tổ ếch trên bờ sông hoa dại đón ếch về đích

---

### 122. Điệp Viên Thang Máy (`elevator-action-diep-vien-thang-may`)
- **Tên gốc & Niên đại:** Elevator Action (Taito 1983) • *Arcade (1983)*
- **Tagline:** *"Đột nhập cửa đỏ bí mật, đu dây thang máy thoát hiểm tầng hầm!"*
- **Thể loại:** Hành động | **Phân mục:** `classic` | **Huy hiệu:** Kinh điển | **Màu chủ đạo:** `#4F46E5`
- **Số người chơi:** 1 người | **Thời lượng ván:** 3-6 phút
- **Tóm tắt cơ chế:** Điệp viên đột nhập tòa nhà 30 tầng bằng hệ thống thang máy và thang cuốn, lấy tài liệu sau các cánh cửa đỏ bí mật
- **Vòng lặp chơi cốt lõi (Core Loop):**
  > Thả dù xuống sân thượng tòa nhà cao ốc 30 tầng -> Đi thang máy và thang cuốn xuống các tầng dưới -> Bắn súng lục tiêu diệt lính gác áo đen núp sau các góc tường -> Vào tất cả các căn phòng cửa màu đỏ để đánh cắp hồ sơ mật -> Bắn đứt dây đèn chùm rơi đè kẻ địch -> Dùng nóc buồng thang máy đè bẹp địch hoặc nhảy xuống né đạn -> Xuống tầng hầm nhảy lên xe thể thao phóng đi trốn thoát.
- **Thiết kế Cảm giác tay (Tactile Game Feel):**
  * **Hệ thống phím điều khiển:** Trái/Phải (Chạy); Lên/Xuống (Điều khiển thang máy / Nhảy thang cuốn / Cúi người); Phím Z (Nhảy); Phím X (Bắn súng lục); Cúi + Bắn để bắn tầm thấp né đạn trả đũa.
  * **Độ giật nảy màn hình (Screenshake):** Rung 3px khi đạn bắn trúng tường bê tông; Rung 8px khi thang máy nghiền nát lính gác hoặc khi đèn chùm rơi rớt vỡ.
  * **Độ đầm & Khựng khung hình (Hitstop):** Khựng 40ms khi bắn trúng điệp viên địch; Khựng 70ms khi mở tung cánh cửa đỏ lấy tài liệu mật.
  * **Âm thanh phản hồi (Procedural Audio SFX):** Procedural Web Audio: Tiếng súng lục nổ 'Bang!' 8-bit đanh gọn (Noise burst + Square 400Hz); Tiếng thang máy chạy cơ khí 'Hummm-clank' kèm dây cáp kéo; Tiếng bóng đèn vỡ 'Tinkle-crash' (High frequency noise); Tiếng bước chân rón rén trên hành lang; Giai điệu nhạc jazz trinh thám hồi hộp phong cách James Bond.
  * **Hiệu ứng hạt va chạm (Particles):** Mảnh kính vỡ rơi lấp lánh khi bắn vỡ đèn trần; Khói súng lục nhả ra từ nòng; Tia lửa đạn bay thẳng ngang màn hình.
- **Nghiên cứu Asset & Canvas 2D Rendering:**
  * **Phong cách đồ họa (Art Style):** Pixel Art 8-bit phong cách trinh thám noir cổ điển thập niên 80, thiết kế mặt cắt kiến trúc tòa nhà thông minh
  * **Bảng màu đặc trưng (Color Palette):** `#4F46E5`, `#DC2626`, `#FACC15`, `#1E293B`, `#64748B`, `#FFFFFF`
  * **Danh mục Sprites cần thiết để render:**
    + Điệp viên Otto mặc com-lê xanh lam đội mũ phớt (chạy nhanh, cúi gập người, nằm bắn súng, đu dây thang máy)
    + Lính gác đối thủ áo đen đội mũ fedora thò đầu ra bắn tỉa
    + Buồng thang máy kim loại kéo dây cáp vàng, thang cuốn trượt chéo tầng
    + Cánh cửa xanh (bình thường) và cánh cửa đỏ rực rỡ phát sáng chứa tài liệu tuyệt mật
    + Chiếc xe thể thao mui trần đỏ chờ sẵn ở gara ngầm tầng hầm

---

### 123. Rồng Đôi Song Thủ (`double-dragon-hiep-si-rong-doi`)
- **Tên gốc & Niên đại:** Double Dragon (Technōs Japan 1987) • *Arcade (1987)*
- **Tagline:** *"Cú hích cùi chỏ, đá xoay người, dẹp loạn đường phố giải cứu mỹ nhân!"*
- **Thể loại:** Hành động | **Phân mục:** `hot` | **Huy hiệu:** Huyền thoại | **Màu chủ đạo:** `#9333EA`
- **Số người chơi:** 1-2 người | **Thời lượng ván:** 4-8 phút
- **Tóm tắt cơ chế:** Đi cảnh đấm đá đường phố (Beat 'em up) 2.5D, nhặt vũ khí rơi (gậy bóng chày, roi da, dao găm, thùng phuy) càn quét bang phái
- **Vòng lặp chơi cốt lõi (Core Loop):**
  > Nàng Marian bị băng đảng Black Warriors bắt cóc -> Hai anh em Billy và Jimmy Lee xông vào khu ổ chuột -> Di chuyển 8 hướng trên mặt đường né đòn và tiếp cận kẻ địch -> Tung chuỗi liên hoàn đấm, đá, húc cùi chỏ ra sau, kẹp cổ lên gối -> Nhặt vũ khí rơi từ tay địch (dao, gậy, xích) để tấn công tầm xa -> Tiêu diệt trùm khổng lồ Abobo để tiến vào hang ổ cuối cùng.
- **Thiết kế Cảm giác tay (Tactile Game Feel):**
  * **Hệ thống phím điều khiển:** WASD / Mũi tên (Di chuyển 8 hướng mặt đường); J (Đấm / Nhặt vũ khí); K (Nhảy); L (Đá chân); Bấm Nhảy + Đấm ngược hướng tung chiêu Cùi Chỏ Bất Bại (Elbow Strike); Áp sát đối thủ để tóm tóc lên gối.
  * **Độ giật nảy màn hình (Screenshake):** Rung 4px mỗi đòn đấm trúng; Rung giật 10px (trauma 0.8) khi tóm kẻ địch quăng qua vai xuống đất hoặc khi ném thùng phuy phát nổ.
  * **Độ đầm & Khựng khung hình (Hitstop):** Khựng cực đầm 65ms khi đòn cùi chỏ húc trúng cằm; Khựng 90ms khi cú đá xoay lốc xoáy quét ngã cả đám côn đồ.
  * **Âm thanh phản hồi (Procedural Audio SFX):** Procedural Web Audio: Tiếng vung quyền xé gió 'Whoosh'; Tiếng đấm trúng mặt 'Thwack-Crack' uy lực (Thud 100Hz + Noise nén); Tiếng kim loại gậy bóng chày vụt trúng 'Clang!'; Tiếng kẻ địch rên rỉ ngã xuống; Khúc nhạc dạo đầu huyền thoại của Double Dragon rực lửa tinh thần trượng nghĩa.
  * **Hiệu ứng hạt va chạm (Particles):** Mảnh vỡ thùng gỗ và thùng phuy bung ra; Mảnh răng và tia lửa va chạm lóe lên theo từng đòn đánh dứt khoát; Bụi đất tung lên khi kẻ địch bị ném văng.
- **Nghiên cứu Asset & Canvas 2D Rendering:**
  * **Phong cách đồ họa (Art Style):** Arcade Beat 'em up 16-bit cơ bắp thập niên 80, bối cảnh khu phố hoang tàn hậu tận thế
  * **Bảng màu đặc trưng (Color Palette):** `#9333EA`, `#3B82F6`, `#DC2626`, `#F59E0B`, `#1E293B`, `#475569`
  * **Danh mục Sprites cần thiết để render:**
    + Anh em song sinh Billy (quần xanh) & Jimmy (quần đỏ) Lee với bộ võ thuật Sōsetsuken đầy đủ các thế đòn
    + Băng đảng địch: Côn đồ Williams cầm dao, Roper ném thùng, nữ quái Linda cầm roi da, gã khổng lồ Abobo đầu trọc da ngăm
    + Vũ khí nhặt được: Thùng phi rỗng, gậy bóng chày gỗ, dao găm sáng loáng, cây roi da quất lửa
    + Khu phố ổ chuột, bờ tường gạch graffiti đổ nát, nhà máy bỏ hoang có băng chuyền nguy hiểm

---

### 124. Rìu Vàng Cổ Đại (Golden Axe) (`golden-axe-riu-vang`)
- **Tên gốc & Niên đại:** Golden Axe (Sega 1989 - Makoto Uchida) • *Arcade / Genesis (1989)*
- **Tagline:** *"Vung búa chiến binh, cưỡi thằn lằn phun lửa, gọi sấm sét trừng phạt!"*
- **Thể loại:** Hành động | **Phân mục:** `classic` | **Huy hiệu:** Huyền thoại | **Màu chủ đạo:** `#D97706`
- **Số người chơi:** 1-2 người | **Thời lượng ván:** 4-8 phút
- **Tóm tắt cơ chế:** Hành động chặt chém thần thoại (Hack and Slash), cưỡi quái thú chiến đấu, thu thập bình phép thuật gọi thần sấm/rồng lửa
- **Vòng lặp chơi cốt lõi (Core Loop):**
  > Chọn anh hùng (Người lùn vác rìu Ax Battler, Chiến binh rìu vàng, hay Nữ kiếm sĩ Tyris Flare) -> Chặt chém tiêu diệt quân đoàn hắc ám của Death Adder -> Đá vào các chú lùn trộm đồ để nhặt bình rượu phép thuật và thịt hồi máu -> Cướp quyền cưỡi quái thú Bizarrian (thằn lằn quất đuôi, kỳ nhông phun lửa) -> Nhấn nút giải phóng phép thuật tối thượng (Sấm sét, Đất lở, Rồng thần phun biển lửa) quét sạch màn chơi.
- **Thiết kế Cảm giác tay (Tactile Game Feel):**
  * **Hệ thống phím điều khiển:** WASD / Mũi tên (Di chuyển); Phím J (Chém vũ khí); Phím K (Nhảy bổ / Chém trên không); Phím L (Niệm phép thuật Magic); Nhấn 2 lần phím di chuyển để lao mình húc vai đối thủ.
  * **Độ giật nảy màn hình (Screenshake):** Rung 5px khi chém gươm; Rung chấn long trời lở đất 16px (trauma 1.0, 500ms) khi triệu hồi Rồng thần khổng lồ phun biển lửa thiêu rụi màn hình.
  * **Độ đầm & Khựng khung hình (Hitstop):** Khựng 75ms cho mỗi nhát chém rìu chặt trúng giáp sắt kẻ địch; Khựng 100ms khi cú húc vai tông văng tên khổng lồ bọc thép.
  * **Âm thanh phản hồi (Procedural Audio SFX):** Procedural Web Audio: Tiếng vũ khí chém xé toạc không khí; Tiếng kim loại chạm giáp đanh rợn người; Tiếng thằn lằn gầm rú quất đuôi 'Rrr-whack'; Tiếng sấm sét giáng xuống 'Kaa-Boom' (Sub-bass 40Hz + White noise chói); Tiếng la hét thảm thiết của quân địch khi bị đánh bại.
  * **Hiệu ứng hạt va chạm (Particles):** Cột lửa rồng bốc cháy rực góc màn hình; Các tia sấm sét xanh giáng từ trên mây xuống đất; Mảnh giáp sắt của quân địch rơi lạch cạch.
- **Nghiên cứu Asset & Canvas 2D Rendering:**
  * **Phong cách đồ họa (Art Style):** Arcade 16-bit thần thoại Bắc Âu sử thi bi tráng, nhân vật cơ bắp cuồn cuộn phong cách Conan the Barbarian
  * **Bảng màu đặc trưng (Color Palette):** `#D97706`, `#B45309`, `#DC2626`, `#F59E0B`, `#1E293B`, `#38BDF8`
  * **Danh mục Sprites cần thiết để render:**
    + 3 Anh hùng: Chiến binh nam kiếm báu, Người lùn Gilius Thunderhead vác rìu chiến khổng lồ, Nữ chiến binh bikini đỏ Tyris Flare
    + Thú cưỡi Bizarrian: Kỳ nhông xanh có mỏ nhọn quất đuôi, rồng đất đỏ biết khè ra quả cầu lửa nổ
    + Chú lùn tinh nghịch đội bao tải chạy lăng xăng nhả bình phép thuật xanh lam
    + Lính địch: Bộ binh xương khô Skeleton vung kiếm khiên, gã đồ tể cầm búa khổng lồ, bạo chúa Death Adder
    + Hiệu ứng phép thuật toàn màn hình: Rồng lửa bay ngang, sấm chớp giật liên hồi

---

### 125. Bộ Đội Khủng Long (`cadillacs-dinosaurs-bo-doi`)
- **Tên gốc & Niên đại:** Cadillacs and Dinosaurs (Capcom CPS-1 1993) • *Arcade (1993)*
- **Tagline:** *"Cú đá lốc Mustapha, xách súng Uzi giải cứu thế giới khủng long!"*
- **Thể loại:** Hành động | **Phân mục:** `hot` | **Huy hiệu:** Huyền thoại | **Màu chủ đạo:** `#15803D`
- **Số người chơi:** 1-2 người | **Thời lượng ván:** 5-10 phút
- **Tóm tắt cơ chế:** Hành động đi cảnh kinh điển nhất làng game thùng Việt Nam: võ thuật cận chiến, nhặt súng máy/lựu đạn bắn xối xả, lái xe Cadillac càn quét
- **Vòng lặp chơi cốt lõi (Core Loop):**
  > Chọn một trong 4 nhân vật anh hùng (Mustapha với cú đá lốc huyền thoại, Jack lái xe, Nữ xạ thủ Hannah, Gã đô con Mess) -> Đánh dẹp bè lũ thợ săn trộm khủng long -> Nhặt các loại súng ống rơi vãi (súng lục, súng ngắn shotgun, súng máy M16, bazooka, súng phóng lựu) xả đạn cực sướng tay -> Thuần hóa khủng long bạo chúa T-Rex biến hung dữ thành hiền lành -> Lái chiếc xe cổ Cadillac màu vàng ủi bay quân địch trên đường cao tốc.
- **Thiết kế Cảm giác tay (Tactile Game Feel):**
  * **Hệ thống phím điều khiển:** WASD / Mũi tên (Di chuyển 8 hướng); Phím J (Đánh / Bắn súng cầm trên tay / Nhặt đồ); Phím K (Nhảy cào); Phím J+K cùng lúc (Tung tuyệt chiêu xoay người thoát hiểm mất một chút máu); Nhấn đúp Tiến + J tung tuyệt chiêu trượt cước lốc xoáy lừng danh của Mustapha.
  * **Độ giật nảy màn hình (Screenshake):** Rung 4px đòn đánh tay; Rung 8px khi bắn súng Shotgun; Rung 15px (trauma 1.0) khi xe Cadillac tông nát chướng ngại vật hoặc khi súng Bazooka nổ tung.
  * **Độ đầm & Khựng khung hình (Hitstop):** Cực kỳ thỏa mãn: Khựng 70ms khi cú đá xoay của Mustapha quét trúng cả tốp địch; Khựng 90ms khi phát đạn shotgun thổi bay kẻ địch ra xa.
  * **Âm thanh phản hồi (Procedural Audio SFX):** Procedural Web Audio: Tiếng đấm trúng mặt 'Whack-Crunch' chuẩn mực Capcom CPS-1; Tiếng nổ giòn tan của súng máy 'Rat-tat-tat' (Square burst); Tiếng shotgun uy lực 'Boom-Chack'; Tiếng gầm vang dội của khủng long bạo chúa T-Rex (Sub-bass rumble 45Hz); Tiếng động cơ xe V8 Cadillac gầm rú hoang dại.
  * **Hiệu ứng hạt va chạm (Particles):** Vỏ đạn đồng văng ra liên tục theo nhịp bắn; Khói thuốc súng mịt mù; Đốm lửa nổ bùng hình nấm từ bazooka; Thùng phuy gỗ vỡ nát thành từng mảnh bay tung tóe.
- **Nghiên cứu Asset & Canvas 2D Rendering:**
  * **Phong cách đồ họa (Art Style):** Arcade Capcom CPS-1 đỉnh cao truyện tranh Mỹ, hoạt họa chuyển động mượt mà, nhân vật cá tính mạnh mẽ
  * **Bảng màu đặc trưng (Color Palette):** `#15803D`, `#FACC15`, `#DC2626`, `#1E293B`, `#38BDF8`, `#78350F`
  * **Danh mục Sprites cần thiết để render:**
    + 4 Nhân vật chính: Mustapha đội mũ beret xanh áo vàng, Jack thợ máy áo trắng quần jeans, Hannah tóc đen quyến rũ, Mess gã hộ pháp da màu
    + Kho vũ khí nhặt được: Súng ngắn Colt, Shotgun cưa nòng, Súng trường tự động M16, Lựu đạn cầm tay, Dao găm rambo
    + Thế giới khủng long: Khủng long ăn cỏ Triceratops húc đầu, bầy Velociraptor nhảy chồm, khủng long bạo chúa T-Rex khổng lồ
    + Chiếc xe cổ mui trần Cadillac màu vàng bóng loáng rẽ gió lao đi trên đại lộ hoang tàn

---

### 126. Ném Tuyết Tuổi Thơ (Snowcraft) (`snowcraft-nem-tuyet-3v3`)
- **Tên gốc & Niên đại:** Snowcraft (Nstorm 1998) • *Web Flash (1998)*
- **Tagline:** *"3 chọi 3 sau bức tường tuyết, kéo thả căn lực ném ngã đội đỏ!"*
- **Thể loại:** Kéo thả | **Phân mục:** `quick` | **Huy hiệu:** Tuổi thơ | **Màu chủ đạo:** `#38BDF8`
- **Số người chơi:** 1 người | **Thời lượng ván:** 2-4 phút
- **Tóm tắt cơ chế:** Chiến thuật thời gian thực kéo thả vị trí và căn lực ném bóng tuyết hạ gục 3 đối thủ phe đỏ
- **Vòng lặp chơi cốt lõi (Core Loop):**
  > 3 chú nhóc đội xanh của bạn đứng bên trái sân tuyết đối đầu đội đỏ bên phải -> Kéo rê chuột để di chuyển các chú nhóc né tránh bóng tuyết đang bay tới -> Nhấp và giữ chuột lên chú nhóc để nặn bóng tuyết và tích lực (vòng tròn lực nở to dần) -> Nhắm vào vị trí đối thủ rồi thả chuột để phóng bóng tuyết bay vòng cung -> Đánh ngã cả 3 chú nhóc đội đỏ để chiến thắng màn chơi và bước vào đợt tấn công đông hơn của kẻ địch.
- **Thiết kế Cảm giác tay (Tactile Game Feel):**
  * **Hệ thống phím điều khiển:** Kéo thả chuột hoàn toàn: Nhấp chuột giữ để nạp lực ném, kéo di chuyển chú nhóc; Nhả chuột để phóng bóng tuyết; Mobile: Chạm giữ kéo thả trực tiếp trên màn hình tuyết.
  * **Độ giật nảy màn hình (Screenshake):** Rung nhẹ 2px khi bóng tuyết va đập; Rung 5px khi bóng tuyết cỡ đại ném trúng mặt chú nhóc khiến cậu ta ngã ngửa bật cẳng lên trời.
  * **Độ đầm & Khựng khung hình (Hitstop):** Khựng 40ms khoảnh khắc bóng tuyết nổ bẹp vào mặt đối phương.
  * **Âm thanh phản hồi (Procedural Audio SFX):** Procedural Web Audio: Tiếng vo tuyết nén chặt 'Squeak-crunch'; Tiếng vung tay ném 'Whoosh' vút qua gió; Tiếng bóng tuyết đập trúng người 'Splat-thump' (Noise + Low Sine 180Hz); Tiếng chú nhóc khóc 'Ouch!' khi bị trúng đòn; Tiếng reo hò cười khoái chí khi đối thủ bị nốc ao.
  * **Hiệu ứng hạt va chạm (Particles):** Mảng tuyết trắng xóa vỡ tung tóe bám vào màn hình; Đốm tuyết bay lả tả trong gió mùa đông; Dấu chân in trên nền tuyết trắng tinh.
- **Nghiên cứu Asset & Canvas 2D Rendering:**
  * **Phong cách đồ họa (Art Style):** Vector Flash Chibi đầu to dễ thương nguyên bản năm 1998, sân tuyết mùa đông trắng muốt tĩnh lặng
  * **Bảng màu đặc trưng (Color Palette):** `#38BDF8`, `#0284C7`, `#EF4444`, `#F8FAFC`, `#047857`, `#FBBF24`
  * **Danh mục Sprites cần thiết để render:**
    + 3 Chú nhóc đội xanh đội mũ len ấm áp áo khoác xanh (đứng nặn bóng tuyết, vung tay ném, bị ném trúng ngã chổng vó, run rẩy)
    + Đội nhóc đỏ tinh nghịch ném tuyết cực hăng hái
    + Quả bóng tuyết trắng tròn bay theo quỹ đạo hình vòng cung với bóng đổ trên mặt tuyết
    + Bức tường thành bằng tuyết che chắn đạn, hàng thông phủ đầy tuyết trắng xóa ở hậu cảnh

---

### 127. Xạ Thủ Căn Gió Bowman (`bowman-nguoi-que-ban-cung`)
- **Tên gốc & Niên đại:** Bowman (FreeWorldGroup 2004) • *Web Flash (2004)*
- **Tagline:** *"Đo góc bắn, tính độ lệch gió, một mũi tên xuyên qua khoảng cách nghìn mét!"*
- **Thể loại:** Kỹ năng | **Phân mục:** `quick` | **Huy hiệu:** Kinh điển | **Màu chủ đạo:** `#64748B`
- **Số người chơi:** 1-2 người | **Thời lượng ván:** 2-5 phút
- **Tóm tắt cơ chế:** Bắn cung tọa độ đối kháng 1v1 theo lượt, tính toán góc độ và lực kéo cung ngược chiều gió
- **Vòng lặp chơi cốt lõi (Core Loop):**
  > Hai xạ thủ người que đứng cách xa nhau hai đầu màn hình (ngăn cách bởi khoảng cách xa hoặc bức tường chắn) -> Quan sát la bàn gió (hướng gió mũi tên và tốc độ gió m/s) -> Kéo chuột từ cung thủ ra phía sau để căn góc bắn độ và phần trăm lực kéo -> Nhả chuột phóng mũi tên bay vút lên bầu trời -> Camera lia theo đường bay của mũi tên -> Mũi tên cắm trúng người đối phương gây sát thương dựa trên vị trí trúng (trúng chân, thân, hoặc Headshot chí mạng) -> Đổi lượt đối thủ bắn trả.
- **Thiết kế Cảm giác tay (Tactile Game Feel):**
  * **Hệ thống phím điều khiển:** Kéo và giữ chuột trái từ người cung thủ ra phía sau để chọn góc độ và lực kéo (hiển thị góc Angle và lực Power bằng số); Thả chuột để bắn; Hỗ trợ chế độ 2 người chơi chung trên 1 bàn phím/máy tính.
  * **Độ giật nảy màn hình (Screenshake):** Rung 1px khi thả dây cung; Rung giật 6px khi mũi tên cắm phập vào thân thể đối thủ; Rung 10px khi bắn trúng đầu Headshot.
  * **Độ đầm & Khựng khung hình (Hitstop):** Khựng 60ms đúng thời điểm mũi tên xé gió cắm ngập vào mục tiêu, kèm hiệu ứng chậm giật thời gian (Bullet time).
  * **Âm thanh phản hồi (Procedural Audio SFX):** Procedural Web Audio: Tiếng căng dây cung cót két 'Creeeak' (Sine biến thiên chậm); Tiếng buông dây cung 'Thwack-twang' (Triangle 480Hz dập tắt nhanh); Tiếng mũi tên xé toạc luồng gió rít 'Fwheeeew'; Tiếng mũi tên cắm ngập vào thịt 'Thump-Squish' đanh thép; Tiếng gió thổi vi vu qua hoang mạc.
  * **Hiệu ứng hạt va chạm (Particles):** Máu bắn tung tóe theo phương đâm của mũi tên; Bụi đất tung lên khi mũi tên bắn trượt cắm xuống đất; Mũi tên rung bần bật sau khi găm vào mục tiêu.
- **Nghiên cứu Asset & Canvas 2D Rendering:**
  * **Phong cách đồ họa (Art Style):** Minimalist Silhouette đen trắng sắc sảo, nền trời chuyển màu hoàng hôn êm dịu
  * **Bảng màu đặc trưng (Color Palette):** `#64748B`, `#0F172A`, `#DC2626`, `#F59E0B`, `#F8FAFC`, `#334155`
  * **Danh mục Sprites cần thiết để render:**
    + Người que cung thủ đen tuyền (tư thế giương cung kéo dây, tư thế nhả tên, tư thế ngã quỵ trúng đòn)
    + Cây cung gỗ mộc mạc uốn cong căng dây
    + Mũi tên nhọn bay theo quỹ đạo vật lý xoay đầu theo vector vận tốc
    + La bàn đo gió hiển thị tốc độ gió (Wind Speed) và mũi tên chỉ hướng gió thổi
    + Chỉ số góc bắn (Angle) và lực kéo (Power) hiển thị số trực quan bên cạnh cung thủ

---

### 128. Bút Vẽ Trượt Ván (Line Rider) (`line-rider-truot-tuyet-vat-ly`)
- **Tên gốc & Niên đại:** Line Rider (Boštjan Čadež 2006) • *Web Flash (2006)*
- **Tagline:** *"Vẽ đường ray cong vút cho cậu bé trượt ván nảy lộn nhào vô tận!"*
- **Thể loại:** Chill | **Phân mục:** `creative` | **Huy hiệu:** Đỉnh cao | **Màu chủ đạo:** `#0284C7`
- **Số người chơi:** 1 người | **Thời lượng ván:** 3-10 phút
- **Tóm tắt cơ chế:** Hộp cát vật lý sáng tạo (Physics Sandbox): vẽ tự do các đường trượt mượt mà cho nhân vật trượt ván trôi theo quán tính và trọng lực
- **Vòng lặp chơi cốt lõi (Core Loop):**
  > Dùng con trỏ chuột vẽ các đường cong, đoạn dốc, vòng lượn xoắn ốc (Loop-de-loop), bục nảy trên trang giấy trắng -> Chọn loại bút vẽ: Bút xanh dương (đường trượt tiêu chuẩn có ma sát), Bút đỏ (đường tăng tốc gia tốc cực đại), Bút xanh lá (đường cảnh quan không va chạm) -> Nhấn nút Play để thả cậu bé Bosh trượt ván từ điểm xuất phát -> Quan sát vật lý chuyển động, quán tính, lực ly tâm đẩy cậu bé bay lượn trên không trung -> Chỉnh sửa và hoàn thiện đường ray nghệ thuật đồng bộ với âm nhạc.
- **Thiết kế Cảm giác tay (Tactile Game Feel):**
  * **Hệ thống phím điều khiển:** Chuột trái vẽ đường nét tự do hoặc công cụ đường thẳng mượt mà; Chuột phải tẩy xóa; Bánh xe cuộn chuột zoom phóng to/thu nhỏ; Phím Space phát/tạm dừng chuyển động (Play/Pause); Phím R đặt lại vị trí xuất phát.
  * **Độ giật nảy màn hình (Screenshake):** Không rung màn hình gắt gỏng, camera di chuyển mượt mà (Smooth dynamic easing) bám sát theo vị trí của cậu bé trượt ván.
  * **Độ đầm & Khựng khung hình (Hitstop):** Không có hitstop chiến đấu, tập trung vào cảm giác lướt êm ái như trượt tuyết thực thụ.
  * **Âm thanh phản hồi (Procedural Audio SFX):** Procedural Web Audio: Tiếng bút chì phác nét sột soạt trên mặt giấy; Tiếng lưỡi ván trượt miết trên băng tuyết 'Shhhhh-whish' biến thiên âm sắc theo vận tốc; Tiếng gió rít khi bay vút trên không; Tiếng va chạm êm tai khi tiếp đất mượt mà; Khúc nhạc giao hưởng nền thư thái du dương.
  * **Hiệu ứng hạt va chạm (Particles):** Bụi tuyết trắng cuộn bay sau gót ván trượt; Vệt sáng lấp lánh theo sau ván trượt khi đạt vận tốc cao; Chiếc khăn len đỏ của cậu bé bay phấp phới trong gió.
- **Nghiên cứu Asset & Canvas 2D Rendering:**
  * **Phong cách đồ họa (Art Style):** Bản vẽ đồ họa tối giản trên nền giấy nháp caro thanh lịch, nét vẽ mượt mà chống răng cưa tuyệt đối
  * **Bảng màu đặc trưng (Color Palette):** `#0284C7`, `#EF4444`, `#10B981`, `#0F172A`, `#F8FAFC`, `#94A3B8`
  * **Danh mục Sprites cần thiết để render:**
    + Cậu bé Bosh quàng khăn len đỏ ngồi trên chiếc ván trượt tuyết gỗ truyền thống (linh hoạt ngả người theo trọng tâm, văng khỏi ván khi lộn nhào)
    + Các nét vẽ bút: Nét xanh dương (Standard solid line), Nét đỏ (Acceleration boost line), Nét xanh lá lá cây (Scenery line)
    + Giao diện thanh công cụ vẽ: Bút chì, cục tẩy, kính lúp zoom, cờ xuất phát, nút Play/Stop mộc mạc

---

### 129. Thợ Đào Ngọc Hầm Đá (`boulder-dash-tho-dao-ngoc`)
- **Tên gốc & Niên đại:** Boulder Dash (First Star Software 1984 - Peter Liepa) • *Atari / C64 / PC (1984)*
- **Tagline:** *"Đào đường ngầm gom kim cương, cẩn thận đá tảng sụp đè bẹp dí!"*
- **Thể loại:** Giải đố | **Phân mục:** `classic` | **Huy hiệu:** Kinh điển | **Màu chủ đạo:** `#854D0E`
- **Số người chơi:** 1 người | **Thời lượng ván:** 3-7 phút
- **Tóm tắt cơ chế:** Đào hầm đất thu gom kim cương theo chỉ tiêu, quản lý vật lý lăn của các tảng đá tròn để không bị đè và bẫy quái vật biến thành ngọc
- **Vòng lặp chơi cốt lõi (Core Loop):**
  > Thợ mỏ Rockford bước vào hầm mỏ tăm tối -> Đào sạch các khối đất mềm mở đường đi -> Thu thập đủ số lượng kim cương lấp lánh yêu cầu của màn chơi -> Luôn tính toán đường đào vì đá tảng phía trên sẽ mất giá đỡ rơi tự do hoặc lăn nghiêng sang bên -> Thả đá đè bẹp quái đom đóm Firefly để biến chúng nổ tung thành một đống kim cương -> Cửa thoát hiểm mở ra, nhanh chóng chạy về đích trước khi cạn giờ.
- **Thiết kế Cảm giác tay (Tactile Game Feel):**
  * **Hệ thống phím điều khiển:** Phím mũi tên 4 hướng di chuyển đào đất; Giữ phím Space + Mũi tên để đào ô đất hoặc nhặt ngọc bên cạnh mà không cần bước chân vào ô đó.
  * **Độ giật nảy màn hình (Screenshake):** Rung 2px khi đào một khối đất; Rung mạnh 7px (trauma 0.7) khi tảng đá lớn rơi chạm đất; Rung 10px khi kích nổ quái vật biến thành kim cương.
  * **Độ đầm & Khựng khung hình (Hitstop):** Khựng 30ms khi Rockford húp gọn một viên kim cương sáng chói.
  * **Âm thanh phản hồi (Procedural Audio SFX):** Procedural Web Audio: Tiếng bước chân đào đất sột soạt 'Scritch-scratch'; Tiếng đá tảng rơi ầm ầm 'Thud-rumble' (Sub-bass 80Hz); Tiếng nhặt kim cương 'Chime-ding' trong veo cao vút (Sine 1.2kHz); Tiếng quái vật vo ve 'Bzzzz'; Tiếng còi báo động khẩn cấp khi sắp hết giờ.
  * **Hiệu ứng hạt va chạm (Particles):** Mảnh đất vụn rơi lả tả sau mỗi bước đào; Kim cương phát ra 4 tia sáng sao nhấp nháy; Tia nổ ngọc bùng tỏa hình tròn 3x3 khi quái bị đè.
- **Nghiên cứu Asset & Canvas 2D Rendering:**
  * **Phong cách đồ họa (Art Style):** Retro Tilemap 8-bit/16-bit chi tiết hầm mỏ khai khoáng, các khối ngọc óng ánh hút mắt
  * **Bảng màu đặc trưng (Color Palette):** `#854D0E`, `#CA8A04`, `#38BDF8`, `#EF4444`, `#15803D`, `#1E293B`
  * **Danh mục Sprites cần thiết để render:**
    + Thợ đào Rockford áo đỏ mắt to tròn (nhìn ngó xung quanh khi đứng yên, đào đất 4 hướng, hoảng hốt khi đá rơi sát đầu)
    + Khối đất mềm có thể đào, bức tường gạch kiên cố không thể phá
    + Tảng đá tròn xám gồ ghề (trạng thái nằm yên, trạng thái lăn nghiêng, trạng thái rơi tự do)
    + Viên kim cương xanh lục / xanh lam phát quang óng ánh
    + Quái vật cơ học Firefly và Butterfly di chuyển men theo vách tường

---

### 130. Thợ Săn Gà Rừng (Moorhuhn) (`moorhuhn-ban-ga-dam-lay`)
- **Tên gốc & Niên đại:** Moorhuhn / Crazy Chicken (Phenomedia 1999) • *PC Windows (1999)*
- **Tagline:** *"Lia nòng súng 90 giây, bắn hạ đàn gà rừng ngơ ngác trốn bụi rậm!"*
- **Thể loại:** Kỹ năng | **Phân mục:** `quick` | **Huy hiệu:** Tuổi thơ | **Màu chủ đạo:** `#16A34A`
- **Số người chơi:** 1 người | **Thời lượng ván:** 2 phút
- **Tóm tắt cơ chế:** Bắn súng ngắm săn điểm thời gian thực 90 giây, lia màn hình cuộn ngang tìm kiếm đàn gà bay ở nhiều tầng cự ly và các bí mật ẩn giấu
- **Vòng lặp chơi cốt lõi (Core Loop):**
  > Thời gian đếm ngược 90 giây bắt đầu -> Lia hồng tâm súng ngắm sang trái/phải dọc cảnh đồng quê Scotland -> Bắn hạ gà bay gần (5 điểm), gà bay trung bình (10 điểm), gà bay tít xa trên chân trời (25 điểm) -> Bắn các mục tiêu bí mật trong khung cảnh (cối xay gió, chuông nhà thờ, tổ chim, bù nhìn rơm) để kích hoạt chuỗi điểm thưởng ẩn khổng lồ -> Nhấn chuột phải nạp đạn nhanh khi hết băng đạn 8 viên -> Đạt điểm số kỷ lục săn gà.
- **Thiết kế Cảm giác tay (Tactile Game Feel):**
  * **Hệ thống phím điều khiển:** Di chuyển chuột để rê tâm ngắm súng; Chuột trái bắn đạn; Chuột phải hoặc phím Space nạp lại đạn (Reload); Cuộn chuột hoặc lia chuột sát mép màn hình để cuộn cảnh ngang.
  * **Độ giật nảy màn hình (Screenshake):** Rung nảy nòng súng 4px mỗi phát đạn shotgun giòn giã; Rung 8px khi bắn trúng cối xay gió làm gãy cánh quạt.
  * **Độ đầm & Khựng khung hình (Hitstop):** Khựng 35ms khi bắn trúng chú gà đang bay khiến nó trợn tròn mắt đứng hình 1 tích tắc trước khi rơi xuống.
  * **Âm thanh phản hồi (Procedural Audio SFX):** Procedural Web Audio: Tiếng súng săn nổ đanh thép 'Bang!' (Noise burst + Triangle); Tiếng lên đạn 'Chack-clack' cơ khí mượt mà; Tiếng gà kêu thất thanh ngơ ngác 'Bawk-bawk-bawk!'; Tiếng chuông nhà thờ ngân vang khi bắn trúng 'Gonggg'; Tiếng huýt sáo kết thúc 90 giây đi săn.
  * **Hiệu ứng hạt va chạm (Particles):** Lông gà trắng và nâu rụng lả tả bay theo chiều gió; Khói xám tỏa ra từ nòng súng săn; Mảnh vụn gỗ văng ra khi bắn trúng biển chỉ đường.
- **Nghiên cứu Asset & Canvas 2D Rendering:**
  * **Phong cách đồ họa (Art Style):** Tranh vẽ phong cảnh minh họa đồng quê châu Âu tươi mát, phong cách hoạt hình hài hước châm biếm
  * **Bảng màu đặc trưng (Color Palette):** `#16A34A`, `#F59E0B`, `#38BDF8`, `#78350F`, `#EF4444`, `#F8FAFC`
  * **Danh mục Sprites cần thiết để render:**
    + Đàn gà Moorhuhn mắt lồi ngộ nghĩnh (bay vỗ cánh cự ly gần/vừa/xa, thò đầu khỏi bụi rậm, rơi rụng xoay tròn)
    + Tâm ngắm súng tròn chữ thập màu đỏ rực rỡ có hiển thị số đạn còn lại
    + Cảnh đồng quê cuộn ngang 3 tầng (Parallax): Đồi cỏ xanh, cối xay gió gỗ quay đều, tháp chuông nhà thờ cổ kính, bù nhìn rơm
    + Băng đạn shotgun 8 viên màu đỏ xếp thẳng hàng ở góc dưới màn hình

---

### 131. Đấu Súng Loạn Đả Sàn Rơi (`gun-mayhem-dau-sung-loan-da`)
- **Tên gốc & Niên đại:** Gun Mayhem (Kevin Gu 2011) • *Web Flash (2011)*
- **Tagline:** *"Đạn nổ giật tung người, bắn hất đối thủ rơi khỏi mép vực sâu!"*
- **Thể loại:** Hành động | **Phân mục:** `hot` | **Huy hiệu:** Huyền thoại | **Màu chủ đạo:** `#E11D48`
- **Số người chơi:** 1-4 người | **Thời lượng ván:** 3-5 phút
- **Tóm tắt cơ chế:** Đấu súng bục platformer 4 người hỗn chiến (Smash Bros style), vũ khí có độ giật cực mạnh đẩy lùi đối thủ rơi khỏi sàn
- **Vòng lặp chơi cốt lõi (Core Loop):**
  > Chọn nhân vật tay súng tí hon và kho vũ khí -> Thả vào đấu trường bục lơ lửng nhiều tầng -> Nhặt các hòm tiếp tế vũ khí ngẫu nhiên rơi từ trên trời xuống (Shotgun, SMG, Sniper, Súng phóng lựu, Súng điện) -> Bắn xả đạn liên tục vào đối thủ -> Tận dụng lực phản hồi (Knockback) của đạn để hất văng đối phương ra khỏi mép vực -> Tránh để bản thân rơi khỏi màn hình -> Ai mất hết mạng (Lives) trước sẽ bị loại.
- **Thiết kế Cảm giác tay (Tactile Game Feel):**
  * **Hệ thống phím điều khiển:** Phím mũi tên / WASD (Chạy/Nhảy 2 bước Double Jump); Phím Z / [ (Bắn đạn); Phím X / ] (Ném lựu đạn Dynamite); Hỗ trợ 4 người chơi cùng lúc trên 1 bàn phím.
  * **Độ giật nảy màn hình (Screenshake):** Rung 4px đạn súng lục; Rung giật 12px (trauma 0.9, 300ms) khi nã Shotgun cự ly gần; Rung 16px khi lựu đạn nổ làm rung chuyển toàn bộ đấu trường.
  * **Độ đầm & Khựng khung hình (Hitstop):** Khựng 50ms khi dính phát bắn Sniper xuyên táo; Khựng 70ms khi ăn trọn chùm đạn shotgun hất tung người lên không trung.
  * **Âm thanh phản hồi (Procedural Audio SFX):** Procedural Web Audio: Tiếng súng nổ đanh giòn tan 'Bang-bang-bang' (Square + White Noise đanh); Tiếng nạp đạn 'Chack-clack'; Tiếng lựu đạn nổ 'Heavy Bass Boom' (Sub-bass 50Hz); Tiếng nhân vật bị thổi bay la hét 'Woooaaa!'; Tiếng nhặt hòm tiếp tế 'Ding-chime' kim loại.
  * **Hiệu ứng hạt va chạm (Particles):** Vỏ đạn bay vèo vèo theo từng phát bắn; Khói súng mịt mù; Tia lửa đạn bay ngang rực rỡ; Vụ nổ lửa hình cầu đỏ cam khi lựu đạn phát nổ.
- **Nghiên cứu Asset & Canvas 2D Rendering:**
  * **Phong cách đồ họa (Art Style):** Vector Flash Chibi tay súng tròn trịa ngộ nghĩnh nhưng hiệu ứng vũ khí khói lửa cực kỳ hoành tráng
  * **Bảng màu đặc trưng (Color Palette):** `#E11D48`, `#F59E0B`, `#1E293B`, `#38BDF8`, `#10B981`, `#F8FAFC`
  * **Danh mục Sprites cần thiết để render:**
    + Tay súng Chibi với nhiều trang phục: Cao bồi viễn tây, ninja, điệp viên com-lê đen, lính đặc nhiệm SWAT
    + Kho vũ khí đa dạng: Súng lục Desert Eagle, Tiểu liên Uzi, Shotgun bắn tỉa, Súng bazooka, Súng phun lửa
    + Hòm gỗ tiếp tế dù bay rơi từ trên trời xuống
    + Đấu trường bục lơ lửng: Nhà máy thép, đỉnh núi tuyết, mái nhà cao ốc đêm, tàu sân bay

---

### 132. Người Que Ma Trận (`electric-man-2-vo-thuat-nguoi-que`)
- **Tên gốc & Niên đại:** Electric Man 2 HS (Damien Clarke 2007) • *Web Flash (2007)*
- **Tagline:** *"Đòn thế slow-motion xoay người đạp bay kẻ địch tóe tia điện!"*
- **Thể loại:** Đối kháng | **Phân mục:** `hot` | **Huy hiệu:** Kinh điển | **Màu chủ đạo:** `#2563EB`
- **Số người chơi:** 1 người | **Thời lượng ván:** 3-6 phút
- **Tóm tắt cơ chế:** Võ thuật đường phố người que kết hợp cơ chế quay chậm Slow-Motion Matrix, tiêu hao pin năng lượng để tung các siêu đòn thế
- **Vòng lặp chơi cốt lõi (Core Loop):**
  > Bước vào giải đấu võ đài Tournament of Voltagen -> Đối đầu từng nhóm võ sĩ người que thuộc các bang phái (The Replicants, The Frozen, The Toxic...) -> Dùng đòn đánh thường (Đấm A, Đá S, Tóm ném D) để tích tụ thanh pin năng lượng điện -> Tung các đòn Slow-Motion siêu thực (Q: Cú đấm xuyên tim quay chậm, W: Cú đá lộn 3 vòng trên không xé gió, E: Chiêu nhào lộn tóm đầu bẻ cổ đối thủ phóng tia điện) -> Quét sạch toàn bộ kẻ địch trong phòng đấu.
- **Thiết kế Cảm giác tay (Tactile Game Feel):**
  * **Hệ thống phím điều khiển:** Trái/Phải (Di chuyển); Xuống (Né/Tránh); Phím A/S/D (Đấm thường / Đá thường / Tóm ném thường); Phím Q/W/E (Siêu đòn Slow-Motion tiêu hao pin năng lượng).
  * **Độ giật nảy màn hình (Screenshake):** Rung 4px đòn đánh thường; Rung giật cực mạnh 14px (trauma 1.0, 400ms) kèm hiệu ứng giật thời gian khi cú đá Slow-Motion cắm thẳng vào ngực đối phương.
  * **Độ đầm & Khựng khung hình (Hitstop):** Cơ chế Slow-Motion làm chậm thời gian xuống 0.25x trong 1.2 giây; Khựng 90ms đúng khoảnh khắc đòn chân tiếp xúc cơ thể kẻ địch.
  * **Âm thanh phản hồi (Procedural Audio SFX):** Procedural Web Audio: Tiếng kéo giãn thời gian 'Whirrr-wub-wub' (Pitch bend tụt tông sâu); Tiếng đòn đánh trúng 'Heavy Impact Thud' (Sub-bass 60Hz + Crunch méo tiếng); Tiếng tia điện nổ lách tách 'Zzzzap-spark'; Tiếng kẻ địch bị đạp bay đập mạnh vào mép màn hình 'Crash!'.
  * **Hiệu ứng hạt va chạm (Particles):** Tia chớp điện xanh dương bao quanh cơ thể người que; Vệt chuyển động mờ (Motion Blur trails) theo sau chân và tay khi tung đòn quay chậm; Tia lửa điện bắn tung tóe khi đối thủ chạm sàn.
- **Nghiên cứu Asset & Canvas 2D Rendering:**
  * **Phong cách đồ họa (Art Style):** Silhouette Stickman kết hợp hiệu ứng hào quang điện Neon rực sáng trong phòng đấu tối giản
  * **Bảng màu đặc trưng (Color Palette):** `#2563EB`, `#60A5FA`, `#FFFFFF`, `#0F172A`, `#EF4444`, `#38BDF8`
  * **Danh mục Sprites cần thiết để render:**
    + Người que điện Electricman phát sáng hào quang xanh dương với hơn 40 khung hình hoạt họa võ thuật đỉnh cao
    + Các phe phái đối thủ: Người que đỏ The Replicants, Người que băng trắng The Frozen, Người que độc xanh lá The Toxic, Người que bóng đêm The Shadows
    + Thanh hiển thị lượng máu và 3 vạch pin năng lượng Battery phát sáng
    + Võ đài phòng thí nghiệm công nghệ cao với sàn lưới kim loại bóng

---

### 133. Chàng Quần Cam Lướt Gió (`fancy-pants-chay-nhay-quan-cam`)
- **Tên gốc & Niên đại:** The Fancy Pants Adventures (Brad Borne 2006) • *Web Flash (2006)*
- **Tagline:** *"Trượt dốc uốn lượn, nhảy bực lò xo, bay bổng cùng chiếc quần cam rực rỡ!"*
- **Thể loại:** Kỹ năng | **Phân mục:** `quick` | **Huy hiệu:** Đỉnh cao | **Màu chủ đạo:** `#F97316`
- **Số người chơi:** 1 người | **Thời lượng ván:** 3-7 phút
- **Tóm tắt cơ chế:** Nhảy bục vật lý gia tốc mượt mà phong cách Sonic: lướt trên dốc cong, chạy ngược trần nhà, nhào lộn bật tường
- **Vòng lặp chơi cốt lõi (Core Loop):**
  > Cậu bé người que tóc nhọn mặc chiếc quần thụng màu cam bắt đầu chuyến phiêu lưu -> Tăng tốc chạy đà qua các con dốc uốn lượn hình sin -> Tận dụng động lượng chạy ngược trần nhà 360 độ -> Trượt gầm tiêu diệt lũ nhện và ốc sên gai -> Bật nhảy liên hoàn qua các vách tường dựng đứng -> Nhặt các vòng xoắn ốc (Squiggles) tăng điểm và tìm kiếm các căn phòng bí mật chứa chiến lợi phẩm.
- **Thiết kế Cảm giác tay (Tactile Game Feel):**
  * **Hệ thống phím điều khiển:** Trái/Phải (Chạy đà gia tốc); Phím S / Mũi tên Lên (Nhảy lò xo / Nhảy bật tường Wall-jump); Mũi tên Xuống (Cúi trượt dốc lướt gió như ván trượt); Phím A (Vung bút chì / Đánh đòn).
  * **Độ giật nảy màn hình (Screenshake):** Rung 2px khi tiếp đất từ độ cao lớn; Rung 6px khi trượt gầm ủi bay cả hàng quái vật gai.
  * **Độ đầm & Khựng khung hình (Hitstop):** Khựng 30ms khi dẫm chân lên đầu nhện để bật nảy lên tầng cao hơn.
  * **Âm thanh phản hồi (Procedural Audio SFX):** Procedural Web Audio: Tiếng gió lướt vù vù khi đạt tốc độ âm thanh; Tiếng nhảy 'Boing' nảy lò xo mượt mà (Sine 350Hz -> 700Hz); Tiếng trượt dốc sột soạt 'Shhh-skid'; Tiếng nhặt vòng xoắn ốc 'Pling-plang' trong trẻo vui tai; Nhạc nền jazz acoustic guitar ấm áp bình yên.
  * **Hiệu ứng hạt va chạm (Particles):** Vệt gió trắng cuộn theo chiếc quần cam; Bụi đất tung lên sau gót chân chạy; Vòng xoắn ốc phát sáng vàng xoay tròn.
- **Nghiên cứu Asset & Canvas 2D Rendering:**
  * **Phong cách đồ họa (Art Style):** Tranh vẽ tay phác thảo ngẫu hứng (Hand-drawn Vector), hoạt họa uyển chuyển như dải lụa
  * **Bảng màu đặc trưng (Color Palette):** `#F97316`, `#0F172A`, `#FBBF24`, `#38BDF8`, `#F8FAFC`, `#475569`
  * **Danh mục Sprites cần thiết để render:**
    + Chàng người que Fancy Pants tóc bù xù mặc chiếc quần thụng màu cam rực rỡ (chạy uốn lượn, nhảy lộn nhào, trượt dốc ngửa người, vung bút chì)
    + Quái vật ngộ nghĩnh: Chuột túi mini, nhện gai đen tròn xoe, ốc sên vỏ cứng
    + Các vòng xoắn ốc Squiggles thu thập bay lơ lửng
    + Địa hình uốn lượn cong vút không theo quy tắc ô vuông, lò xo búng nảy nhấp nhô

---

### 134. Đố Mẹo Xoắn Não (`impossible-quiz-do-vui-xoan-nao`)
- **Tên gốc & Niên đại:** The Impossible Quiz (Splapp-me-do 2007) • *Web Flash (2007)*
- **Tagline:** *"Suy nghĩ ngược đời, bấm chuột cẩn thận không nổ bom hẹn giờ!"*
- **Thể loại:** Giải đố | **Phân mục:** `quick` | **Huy hiệu:** Tuổi thơ | **Màu chủ đạo:** `#8B5CF6`
- **Số người chơi:** 1 người | **Thời lượng ván:** 3-8 phút
- **Tóm tắt cơ chế:** Câu đố mẹo tương tác phá vỡ bức tường thứ tư (Think outside the box): rê chuột né bẫy, gõ chữ bí mật, căn giờ trước khi bom nổ
- **Vòng lặp chơi cốt lõi (Core Loop):**
  > Mỗi câu hỏi là một cái bẫy logic bất ngờ -> Đọc câu hỏi kỳ quặc và quan sát toàn bộ màn hình (đôi khi đáp án nằm ngay trong số thứ tự câu hỏi hoặc ngoài khung giao diện) -> Rê chuột cẩn thận qua mê cung không chạm viền -> Bấm đúng đáp án kỳ quái trước khi quả bom hẹn giờ 10 giây nổ tung -> Mỗi lần sai mất 1 mạng trong số 3 mạng (Lives) -> Thu thập vật phẩm Bỏ qua câu hỏi (Skips) để vượt qua câu đố khó nhằn.
- **Thiết kế Cảm giác tay (Tactile Game Feel):**
  * **Hệ thống phím điều khiển:** Nhấp chuột trái chọn đáp án hoặc kéo thả đối tượng; Rê chuột tỉ mỉ; Phím bàn phím gõ từ khóa bí mật khi được yêu cầu.
  * **Độ giật nảy màn hình (Screenshake):** Rung lắc 8px (trauma 0.8) kèm tiếng còi hú khi trả lời sai mất 1 mạng; Rung 15px khi quả bom nổ Game Over.
  * **Độ đầm & Khựng khung hình (Hitstop):** Khựng 40ms khi bấm trúng đáp án đúng hé lộ câu hỏi tiếp theo.
  * **Âm thanh phản hồi (Procedural Audio SFX):** Procedural Web Audio: Tiếng chuông reo đáp án đúng 'Ding-ding-ding!' vui mừng; Tiếng còi buzzer báo sai 'BZZZZ!' chói tai (Sawtooth 120Hz méo tiếng); Tiếng kim đồng hồ tích tắc 'Tick-tock-tick-tock' giục giã gấp gáp; Tiếng bom nổ 'KABOOM!' long trời lở đất; Tiếng cười ma quái khi thua cuộc.
  * **Hiệu ứng hạt va chạm (Particles):** Mảnh vỡ quả bom văng tung tóe; Tia lửa cháy xèo xèo trên ngòi nổ quả bom hẹn giờ; Bàn tay trỏ chuột biến đổi hình thù ngộ nghĩnh.
- **Nghiên cứu Asset & Canvas 2D Rendering:**
  * **Phong cách đồ họa (Art Style):** Doodle Meme ngẫu hứng thập niên 2000, nét vẽ tay ngộ nghĩnh hài hước không đụng hàng
  * **Bảng màu đặc trưng (Color Palette):** `#8B5CF6`, `#EF4444`, `#F59E0B`, `#10B981`, `#1E293B`, `#FFFFFF`
  * **Danh mục Sprites cần thiết để render:**
    + Biểu tượng chú mèo Chris mỉm cười nham hiểm
    + Quả bom hẹn giờ màu đen có ngòi cháy xèo xèo đếm ngược từng giây
    + 3 Trái tim sinh mạng đỏ thắm và các mũi tên Skip màu xanh lá
    + Các câu đố tương tác: Mê cung ziczac, chiếc xô sơn, phím số bí ẩn, chiếc cầu vồng 7 màu
    + Màn hình kết thúc 'GAME OVER' với những câu trêu chọc hài hước

---

### 135. Bắn Sâu Rết Nấm Rừng (`centipede-ban-sau-ret`)
- **Tên gốc & Niên đại:** Centipede (Atari 1981 - Dona Bailey / Ed Logg) • *Arcade (1981)*
- **Tagline:** *"Bắn đứt từng khúc rết uốn éo qua rừng nấm, né bọ chét rơi nhanh!"*
- **Thể loại:** Kỹ năng | **Phân mục:** `classic` | **Huy hiệu:** Kinh điển | **Màu chủ đạo:** `#CA8A04`
- **Số người chơi:** 1 người | **Thời lượng ván:** 2-5 phút
- **Tóm tắt cơ chế:** Bắn súng cuộn dọc tốc độ cao, tiêu diệt con rết nhiều khúc: mỗi khúc bị bắn trúng biến thành một cây nấm và tách con rết thành 2 đoạn độc lập
- **Vòng lặp chơi cốt lõi (Core Loop):**
  > Con sâu rết khổng lồ bò từ đỉnh màn hình uốn lượn ziczac qua rừng nấm dày đặc -> Người chơi điều khiển khẩu pháo tí hon di chuyển tự do trong khu vực đáy an toàn -> Bắn tỉa từng khúc thân con rết -> Khúc thân trúng đạn biến thành cây nấm cản đường, chia con rết thành 2 con rết ngắn hơn bò độc lập -> Bắn hạ bọ chét rơi thẳng từ trên trời xuống trồng thêm nấm -> Bắn nhện nhảy nhót lung tung ở tầng đáy để dọn sạch màn chơi.
- **Thiết kế Cảm giác tay (Tactile Game Feel):**
  * **Hệ thống phím điều khiển:** Rê chuột (hoặc bi lăn Trackball / Cụm phím mũi tên) di chuyển pháo tự do trong 1/4 đáy màn hình; Giữ chuột trái hoặc phím Space để bắn đạn liên thanh tự động.
  * **Độ giật nảy màn hình (Screenshake):** Rung 1px mỗi phát bắn; Rung 5px khi con rết bị bắn đứt đoạn; Rung 8px khi con nhện nhảy bổ trúng pháo.
  * **Độ đầm & Khựng khung hình (Hitstop):** Khựng 20ms mỗi lần một khúc rết phát nổ biến thành cây nấm mới.
  * **Âm thanh phản hồi (Procedural Audio SFX):** Procedural Web Audio: Tiếng bước chân con rết bò dồn dập 'Diddle-diddle-diddle' tăng tốc độ theo số khúc còn lại; Tiếng bắn đạn 'Pip-pip-pip' 8-bit cực giòn; Tiếng nấm mọc 'Plop'; Tiếng con nhện nhảy rít chói tai (Sine sweep); Tiếng bọ cạp bò ngang mang nọc độc biến nấm thành nấm độc rơi thẳng.
  * **Hiệu ứng hạt va chạm (Particles):** Mảnh vụn thân rết nổ bung thành các chấm sáng màu sắc; Cây nấm nhấp nháy 4 giai đoạn khi bị bắn phá; Tia chớp nổ tròn khi tiêu diệt bọ chét.
- **Nghiên cứu Asset & Canvas 2D Rendering:**
  * **Phong cách đồ họa (Art Style):** Arcade 8-bit cổ điển rực rỡ, ma trận nấm nhiều màu sắc thay đổi bảng màu theo từng đợt tấn công
  * **Bảng màu đặc trưng (Color Palette):** `#CA8A04`, `#EF4444`, `#22C55E`, `#38BDF8`, `#F472B6`, `#000000`
  * **Danh mục Sprites cần thiết để render:**
    + Con rết khổng lồ: Đầu rết mắt đỏ hung dữ, các đốt thân rết tròn trịa màu xanh lục nối đuôi nhau
    + Cây nấm rừng tròn trịa (nguyên vẹn -> nứt 1 phát -> nứt 2 phát -> nấm độc màu tím)
    + Các loài côn trùng hỗ trợ: Bọ chét rơi thẳng đứng tạo nấm, Nhện nhảy nhót ziczac tầng đáy, Bọ cạp bò ngang đầu độc nấm
    + Khẩu pháo tí hon của người chơi (Bug Blaster) hình nón màu trắng viền xanh

---

### 136. Nhảy Bậc Kim Tự Tháp (`qbert-nhay-khoi-lap-phuong`)
- **Tên gốc & Niên đại:** Q*bert (Gottlieb 1982 - Warren Davis / Jeff Lee) • *Arcade (1982)*
- **Tagline:** *"Nhảy đổi màu từng ô lập phương, chửi bới ngộ nghĩnh né rắn Coily!"*
- **Thể loại:** Giải đố | **Phân mục:** `classic` | **Huy hiệu:** Tuổi thơ | **Màu chủ đạo:** `#F59E0B`
- **Số người chơi:** 1 người | **Thời lượng ván:** 3-6 phút
- **Tóm tắt cơ chế:** Nhảy chéo 4 hướng trên kim tự tháp khối lập phương Isometric 3D, đổi màu mặt trên của từng khối lập phương sang màu mục tiêu
- **Vòng lặp chơi cốt lõi (Core Loop):**
  > Sinh vật mũi vòi Q*bert xuất phát trên đỉnh kim tự tháp gồm 28 khối lập phương -> Nhảy chéo theo 4 hướng để đổi màu mặt phẳng trên cùng của từng khối sang màu đích -> Tránh né quả bóng đỏ rơi từ đỉnh xuống -> Rắn Coily nở ra từ quả trứng tím đuổi bám sát nút sau lưng -> Dụ rắn Coily nhảy theo mình ra ngoài không gian rồi nhảy vào chiếc đĩa bay thoát hiểm bên hông kim tự tháp -> Đổi màu toàn bộ khối thành công để hoàn thành màn chơi.
- **Thiết kế Cảm giác tay (Tactile Game Feel):**
  * **Hệ thống phím điều khiển:** 4 hướng nhảy chéo Isometric: Phím Q/W/A/S hoặc Numpad 7/9/1/3 (hoặc vuốt chéo 4 góc cảm ứng màn hình).
  * **Độ giật nảy màn hình (Screenshake):** Rung nảy 2px mỗi bước nhảy tiếp đất khối lập phương; Rung 6px khi Q*bert nhảy hụt chân rơi khỏi kim tự tháp vào hư không.
  * **Độ đầm & Khựng khung hình (Hitstop):** Khựng 40ms khi nhảy trúng chiếc đĩa bay xoay tít đưa Q*bert trở lại đỉnh tháp an toàn.
  * **Âm thanh phản hồi (Procedural Audio SFX):** Procedural Web Audio: Tiếng nhảy 'Hop-Boing' (Sine 300Hz -> 600Hz); Tiếng rơi hụt chân gió rít nhỏ dần; Câu chửi bong bóng hội thoại hài hước trứ danh '@!#?@!' phát âm từ bộ tổng hợp âm thanh giọng nói méo tiếng Votrax cơ học; Tiếng đĩa bay quay tít vo ve; Khúc nhạc hoan ca mừng thắng trận rộn rã.
  * **Hiệu ứng hạt va chạm (Particles):** Mặt khối lập phương lóe sáng đổi màu rực rỡ; Bong bóng thoại hiện ra dòng chữ '@!#?@!' trên đầu Q*bert khi va chạm quái vật; Sao lấp lánh khi đĩa bay nhấc bổng nhân vật lên không trung.
- **Nghiên cứu Asset & Canvas 2D Rendering:**
  * **Phong cách đồ họa (Art Style):** Mô hình ảo giác quang học Isometric 3D (M.C. Escher) rực rỡ sắc màu thập niên 80
  * **Bảng màu đặc trưng (Color Palette):** `#F59E0B`, `#F97316`, `#3B82F6`, `#8B5CF6`, `#22C55E`, `#000000`
  * **Danh mục Sprites cần thiết để render:**
    + Sinh vật cam mũi vòi Q*bert hai chân không tay ngộ nghĩnh (đứng thủ thế, nhảy chéo 4 hướng, bong bóng thoại chửi thề)
    + Kim tự tháp 28 khối lập phương Isometric (mặt màu ban đầu, mặt màu trung gian, mặt màu đích hoàn thành)
    + Kẻ thù: Rắn tím Coily nhảy ziczac, Quả bóng đỏ rơi tự do, Quỷ đỏ Sam và Slick đổi ngược lại màu khối
    + Chiếc đĩa bay màu sắc đỗ lơ lửng bên hông kim tự tháp chờ cứu nguy

---

### 137. Không Chiến Thái Bình Dương (`1942-khong-chien-thai-binh-duong`)
- **Tên gốc & Niên đại:** 1942 (Capcom 1984 - Yoshiki Okamoto) • *Arcade (1984)*
- **Tagline:** *"Nhào lộn lượn vòng né đạn pháo, bắn hạ siêu pháo đài bay địch!"*
- **Thể loại:** Hành động | **Phân mục:** `classic` | **Huy hiệu:** Kinh điển | **Màu chủ đạo:** `#0284C7`
- **Số người chơi:** 1 người | **Thời lượng ván:** 3-6 phút
- **Tóm tắt cơ chế:** Bắn máy bay cuộn dọc cuộn cảnh biển khơi, kỹ năng nhào lộn 360 độ né mưa đạn (Loop-the-loop), ghép đôi máy bay con yểm trợ
- **Vòng lặp chơi cốt lõi (Core Loop):**
  > Điều khiển chiếc tiêm kích Lockheed P-38 Lightning cất cánh từ tàu sân bay -> Bay qua vùng biển Thái Bình Dương rộng lớn -> Bắn hạ các tốp máy bay tiêm kích địch dàn trận đội hình -> Nhặt biểu tượng POW để nâng cấp hỏa lực 4 nòng đạn và 2 máy bay hộ tống nhỏ bay song song -> Bấm nút nhào lộn trên không để né tránh các làn đạn không thể né thoát -> Tiêu diệt siêu pháo đài bay khổng lồ Nakajima G10N của địch để hạ cánh an toàn.
- **Thiết kế Cảm giác tay (Tactile Game Feel):**
  * **Hệ thống phím điều khiển:** Phím mũi tên / WASD (Bay 8 hướng tự do); Phím Z (Bắn súng máy liên thanh); Phím X (Kỹ năng nhào lộn Loop-the-loop tránh mọi sát thương trong 1.5 giây, giới hạn 3 lần mỗi mạng).
  * **Độ giật nảy màn hình (Screenshake):** Rung 2px mỗi phát bắn; Rung giật 6px khi bắn nổ máy bay địch cỡ vừa; Rung chấn 12px (trauma 0.9) khi siêu pháo đài bay nổ tung từng khoang động cơ.
  * **Độ đầm & Khựng khung hình (Hitstop):** Khựng 30ms khi đạn bắn phá trúng động cơ trùm; Hiệu ứng lơ lửng camera khi máy bay thực hiện cú lộn vòng 360 độ hoàn mỹ.
  * **Âm thanh phản hồi (Procedural Audio SFX):** Procedural Web Audio: Tiếng súng máy tiêm kích bắn giòn tan 'Pung-pung-pung' (Square wave 8-bit); Tiếng động cơ cánh quạt quay rù rù; Tiếng còi nhào lộn vút cao; Tiếng nổ tung xác máy bay địch rền vang 'Boom-Crack' (White noise kết hợp Bass); Tiếng kèn quân nhạc khải hoàn khi hạ cánh xuống hàng không mẫu hạm.
  * **Hiệu ứng hạt va chạm (Particles):** Mảnh cánh máy bay vỡ vụn bốc khói đen rơi xuống biển; Cột khói xám bốc lên từ xác tàu chiến; Bọt sóng trắng xóa cuộn trào dưới làn nước biển xanh thẳm.
- **Nghiên cứu Asset & Canvas 2D Rendering:**
  * **Phong cách đồ họa (Art Style):** Arcade cuộn dọc quân sự Thế chiến II sắc nét, bối cảnh quần đảo san hô và đại dương bao la
  * **Bảng màu đặc trưng (Color Palette):** `#0284C7`, `#0369A1`, `#F59E0B`, `#EF4444`, `#F8FAFC`, `#1E293B`
  * **Danh mục Sprites cần thiết để render:**
    + Chiếc tiêm kích thân đôi P-38 Lightning màu xanh bạc (nghiêng cánh lượn trái/phải, thu nhỏ phóng to khi nhào lộn lốc xoáy)
    + Hai chiếc tiêm kích con tí hon bay áp sát hai bên mạn cánh
    + Máy bay địch: Phi đội tiêm kích Zero bay theo đội hình chữ V, Máy bay ném bom hạng nặng hai thân, Siêu pháo đài bay khổng lồ che kín nửa màn hình
    + Biểu tượng nâng cấp 'POW' đổi màu
    + Tàu sân bay khổng lồ có đường băng dài sọc trắng đón máy bay hạ cánh

---

### 138. Nhẫn Giả Cứu Con Tin (`shinobi-ninja-phi-tieu`)
- **Tên gốc & Niên đại:** Shinobi (Sega 1987) • *Arcade (1987)*
- **Tagline:** *"Phóng phi tiêu shuriken, tung nhẫn thuật lốc xoáy quét sạch sơn tặc!"*
- **Thể loại:** Hành động | **Phân mục:** `classic` | **Huy hiệu:** Huyền thoại | **Màu chủ đạo:** `#1E293B`
- **Số người chơi:** 1 người | **Thời lượng ván:** 3-7 phút
- **Tóm tắt cơ chế:** Hành động ninja cuộn ngang 2 tầng cao/thấp, giải cứu các võ sinh nhí con tin, cận chiến kiếm katana và tung nhẫn thuật Ninjutsu
- **Vòng lặp chơi cốt lõi (Core Loop):**
  > Nhẫn giả Joe Musashi tiến vào căn cứ tổ chức khủng bố Zeed -> Nhảy giữa 2 tầng địa hình cao và thấp để tiếp cận kẻ địch -> Phóng phi tiêu shuriken tầm xa hoặc tự động rút kiếm katana chém ngọt khi áp sát cự ly gần -> Giải cứu tất cả các con tin nhí đang bị trói để nâng cấp vũ khí thành súng phóng lựu và mở cửa qua màn -> Tung nhẫn thuật Ninja Magic (Bão lốc xoáy, Sấm sét, Phân thân lửa) khi bị bao vây -> Chơi màn thưởng ném phi tiêu góc nhìn thứ nhất.
- **Thiết kế Cảm giác tay (Tactile Game Feel):**
  * **Hệ thống phím điều khiển:** Trái/Phải (Di chuyển); Xuống (Cúi); Lên + Nhảy (Bật nhảy lên tầng cao hơn); Xuống + Nhảy (Nhảy tụt xuống tầng thấp); Phím Z (Tấn công: Phi tiêu tầm xa / Chém kiếm cận chiến); Phím X (Nhảy); Phím C (Kích hoạt nhẫn thuật Ninja Magic).
  * **Độ giật nảy màn hình (Screenshake):** Rung 3px mỗi nhát chém katana; Rung giật 12px (trauma 0.9, 350ms) khi niệm chú nhẫn thuật lốc xoáy cuốn phăng quân địch.
  * **Độ đầm & Khựng khung hình (Hitstop):** Khựng 60ms khi lưỡi kiếm katana chém gục tên lính mang khiên bọc sắt.
  * **Âm thanh phản hồi (Procedural Audio SFX):** Procedural Web Audio: Tiếng phi tiêu xé gió bay 'Shsh-shing'; Tiếng kiếm chém ngọt lịm 'Slash-Crunch'; Tiếng niệm chú nhẫn thuật trầm hùng bí ẩn; Tiếng lốc xoáy gầm thét 'Whooosh'; Tiếng em bé con tin reo lên cảm ơn 'Thank you!'; Nhạc nền phong cách ninja Nhật Bản trống taiko dồn dập.
  * **Hiệu ứng hạt va chạm (Particles):** Mảnh áo và vũ khí của quân địch tan biến thành khói đen ninja; Tia lửa tóe ra khi phi tiêu va vào khiên sắt; Cột gió lốc lượn quanh toàn bộ màn hình khi niệm chú.
- **Nghiên cứu Asset & Canvas 2D Rendering:**
  * **Phong cách đồ họa (Art Style):** Arcade 16-bit chân thực đậm chất điện ảnh hành động nhẫn giả thập niên 80
  * **Bảng màu đặc trưng (Color Palette):** `#1E293B`, `#DC2626`, `#F59E0B`, `#FFFFFF`, `#38BDF8`, `#475569`
  * **Danh mục Sprites cần thiết để render:**
    + Nhẫn giả Joe Musashi mặc áo giáp ninja trắng viền đỏ (chạy bước dài, ném phi tiêu, rút kiếm katana chém chéo, nhảy nhào lộn giữa 2 tầng)
    + Các con tin nhí mặc đồ võ sinh quỳ gối chờ giải cứu
    + Kẻ địch: Sơn tặc cầm dao, xạ thủ súng máy, ninja áo xanh phóng kiếm bay, trùm khổng lồ Ken-Oh ném cầu lửa
    + Màn thưởng Bonus Stage: Bàn tay ninja giơ phi tiêu ném góc nhìn người thứ nhất (FPS) vào ninja đang nhảy qua tường

---

### 139. Sóc Chuột Cứu Hộ Đội (`chip-dale-soc-chuot-cuu-ho`)
- **Tên gốc & Niên đại:** Chip 'n Dale: Rescue Rangers (Capcom 1990) • *NES 8-bit (1990)*
- **Tagline:** *"Nhấc thùng gỗ ném mèo Mèo Béo, phối hợp cõng bạn vượt bẫy điện!"*
- **Thể loại:** Hành động | **Phân mục:** `classic` | **Huy hiệu:** Tuổi thơ | **Màu chủ đạo:** `#D97706`
- **Số người chơi:** 1-2 người | **Thời lượng ván:** 4-8 phút
- **Tóm tắt cơ chế:** Nhảy bục co-op 2 người kinh điển: nhấc thùng gỗ/táo/hộp sắt ném địch, chui vào thùng giả vờ tàng hình, nhấc bổng bạn chơi ném qua chướng ngại
- **Vòng lặp chơi cốt lõi (Core Loop):**
  > Hai chú sóc chuột Chip và Dale lên đường giải cứu cô chuột thông minh Gadget khỏi tay trùm Mèo Béo (Fat Cat) -> Chạy nhảy qua các căn phòng khổng lồ nơi mọi vật dụng gia đình đều to lớn hơn người -> Nhấc các thùng gỗ rải rác trên đường để ném thẳng hoặc ném chéo lên trời diệt quái -> Cúi người chui vào trong thùng gỗ để quái vật húc vào tự văng ra -> Nhặt các quả sồi hồi máu và biểu tượng ngôi sao -> Hợp sức cùng bạn bè cõng nhau ném lên các bục cao bí mật.
- **Thiết kế Cảm giác tay (Tactile Game Feel):**
  * **Hệ thống phím điều khiển:** Trái/Phải (Chạy); Phím Z/J (Nhảy); Phím X/K (Nhấc thùng / Ném thùng / Nhấc bạn bè); Xuống (Cúi nấp trong thùng); Giữ phím Lên khi ném để ném thùng bay vút lên trần nhà.
  * **Độ giật nảy màn hình (Screenshake):** Rung 3px khi thùng gỗ đập vỡ; Rung 7px khi quả cầu sắt lăn rung chuyển căn phòng nhà bếp.
  * **Độ đầm & Khựng khung hình (Hitstop):** Khựng 40ms khi thùng gỗ đập trúng quái vật khiến quái nổ tung thành sao sáng.
  * **Âm thanh phản hồi (Procedural Audio SFX):** Procedural Web Audio: Tiếng nhấc thùng 'Heave-up' (Triangle 300Hz); Tiếng ném thùng bay vút 'Whoosh'; Tiếng thùng gỗ vỡ toang 'Clack-smash' (Noise burst giòn); Tiếng nhặt quả sồi 'Ding-ding' (Arpeggio nốt cao); Nhạc chủ đề hoạt hình Disney Rescue Rangers huyền thoại sôi nổi hân hoan.
  * **Hiệu ứng hạt va chạm (Particles):** Mảnh gỗ vụn bay tung tóe ra 4 góc khi thùng vỡ; Ngôi sao vàng xoay tít bay lên; Tia lửa điện xẹt xẹt ở các dây cắm điện hở.
- **Nghiên cứu Asset & Canvas 2D Rendering:**
  * **Phong cách đồ họa (Art Style):** Pixel Art 8-bit NES Capcom trau chuốt từng pixel, góc nhìn người tí hon trong thế giới vật dụng đời sống khổng lồ
  * **Bảng màu đặc trưng (Color Palette):** `#D97706`, `#78350F`, `#F59E0B`, `#DC2626`, `#38BDF8`, `#FFFFFF`
  * **Danh mục Sprites cần thiết để render:**
    + Sóc Chip đội mũ phớt áo khoác da & Sóc Dale mũi đỏ áo hoa Hawaii (chạy lon ton, nhấc thùng trên đầu, cúi núp trong thùng, giơ hai tay ăn mừng)
    + Vật phẩm ném: Thùng gỗ vân sọc, hộp sắt nặng, quả táo đỏ khổng lồ, quả bóng năng lượng phát sáng
    + Kẻ địch ngộ nghĩnh: Chuột máy đi dây cót, chó robot nhảy xổ, thằn lằn bay ném boomerang, mèo béo Fat Cat hút xì gà
    + Môi trường khổng lồ: Nhà bếp có vòi nước nhỏ giọt, quạt trần quay gió, đống đồ chơi rực rỡ

---

### 140. Thỏ Nhanh Nhẹn Tiny Toon (`tiny-toon-tho-buster-phieu-luu`)
- **Tên gốc & Niên đại:** Tiny Toon Adventures (Konami 1991) • *NES 8-bit (1991)*
- **Tagline:** *"Lướt chân thỏ Buster, biến hình vịt Plucky bơi lội gom cà rốt vàng!"*
- **Thể loại:** Hành động | **Phân mục:** `classic` | **Huy hiệu:** Tuổi thơ | **Màu chủ đạo:** `#059669`
- **Số người chơi:** 1 người | **Thời lượng ván:** 4-8 phút
- **Tóm tắt cơ chế:** Nhảy bục cuộn ngang đa nhân vật, luân chuyển giữa Thỏ Buster, Vịt Plucky Duck, Quỷ Tasmania Dizzy Devil và Mèo Furrball với bộ kỹ năng độc nhất
- **Vòng lặp chơi cốt lõi (Core Loop):**
  > Thỏ Buster Bunny lên đường giải cứu cô bạn Babs Bunny khỏi gã nhà giàu Montana Max -> Vượt qua các màn chơi nhảy bục thế giới hoạt hình Acme Acres -> Nhặt quả bóng ngôi sao để đổi sang người bạn đồng hành đã chọn trước: Vịt Plucky (vỗ cánh lượn trên không và bơi lội), Quỷ Dizzy (xoay lốc xoáy càn quét đập đá), Mèo Furrball (leo trèo bám tường cao) -> Nhặt đủ cà rốt vàng để nhận mạng từ chú heo Hamton -> Đánh bại trùm cuối giải cứu thỏ hồng Babs.
- **Thiết kế Cảm giác tay (Tactile Game Feel):**
  * **Hệ thống phím điều khiển:** Trái/Phải (Chạy đà trượt chân); Phím Z (Nhảy cao lò xo); Phím X (Tăng tốc chạy nhanh / Kích hoạt kỹ năng đặc thù: Vỗ cánh lượn, Xoay lốc xoáy); Nhảy đạp lên đầu kẻ địch để bật cao hơn.
  * **Độ giật nảy màn hình (Screenshake):** Rung 3px khi dẫm quái; Rung 8px khi Quỷ Dizzy biến thành cơn lốc xoáy húc đổ bức tường đá dày.
  * **Độ đầm & Khựng khung hình (Hitstop):** Khựng 35ms khi dẫm trúng mục tiêu; Khựng 50ms khi biến hình đổi nhân vật giữa màn chơi.
  * **Âm thanh phản hồi (Procedural Audio SFX):** Procedural Web Audio: Tiếng chân thỏ chạy trượt kít kít 'Skid-squeak'; Tiếng nhảy tưng tưng 'Boing-spring'; Tiếng vịt vỗ cánh phành phạch 'Flap-flap'; Tiếng lốc xoáy gầm 'Whirrr-tornado'; Tiếng nhặt củ cà rốt 'Chirp-ping'; Nhạc nền Konami NES âm hưởng hoạt hình rộn ràng tươi vui.
  * **Hiệu ứng hạt va chạm (Particles):** Mây khói tròn cuộn ra sau chân khi phanh xe trượt gót; Cà rốt vàng phát sáng lấp lánh; Mảnh đá vỡ bay ra khi lốc xoáy phá tường.
- **Nghiên cứu Asset & Canvas 2D Rendering:**
  * **Phong cách đồ họa (Art Style):** Pixel Art 8-bit hoạt hình Warner Bros rực rỡ, biểu cảm khuôn mặt phóng đại vui nhộn
  * **Bảng màu đặc trưng (Color Palette):** `#059669`, `#34D399`, `#38BDF8`, `#F59E0B`, `#EF4444`, `#FFFFFF`
  * **Danh mục Sprites cần thiết để render:**
    + Thỏ xanh Buster Bunny áo đỏ (chạy tốc độ cao tai bay phấp phới, nhảy co chân, trượt chân phanh gấp)
    + 3 Bạn đồng hành biến hình: Vịt xanh Plucky Duck vỗ cánh lượn, Quỷ Tasmania Dizzy Devil xoay lốc xoáy tím, Mèo xanh Furrball cào móng bám tường
    + Củ cà rốt vàng tươi tốt lơ lửng trên không trung
    + Môi trường đồi cỏ Acme Acres, biệt thự ma ám u ám, đáy biển sâu với bầy cá ngốc nghếch

---

### 141. Đập Bóng Bay Tầng Không (`balloon-fight-dap-bong-bay`)
- **Tên gốc & Niên đại:** Balloon Fight (Nintendo NES 1984 - Satoru Iwata) • *NES 8-bit (1984)*
- **Tagline:** *"Đập cánh giữ nhịp bay lơ lửng, đạp vỡ bóng đối thủ né cá đớp mồi!"*
- **Thể loại:** Kỹ năng | **Phân mục:** `quick` | **Huy hiệu:** Kinh điển | **Màu chủ đạo:** `#0284C7`
- **Số người chơi:** 1-2 người | **Thời lượng ván:** 2-5 phút
- **Tóm tắt cơ chế:** Vật lý bay lượn quán tính đập cánh nhịp nhàng (Flapping flight do Satoru Iwata lập trình), đạp vỡ bóng bay của địch và tránh cá khổng lồ dưới mặt nước
- **Vòng lặp chơi cốt lõi (Core Loop):**
  > Nhân vật Balloon Fighter đeo 2 quả bóng bay đỏ sau lưng -> Nhấn nhịp phím để vỗ cánh bay bổng lên trên hoặc thả trôi rơi tự do theo quán tính gió -> Canh vị trí bay cao hơn quân địch để dẫm chân làm nổ bóng bay của lũ chim đối thủ -> Quân địch rơi dù xuống đất, nhanh chóng lao tới sút văng trước khi chúng kịp bơm quả bóng mới -> Cẩn thận không bay quá sát mặt nước kẻo cá khổng lồ đớp trọn -> Chế độ phụ Balloon Trip bay né tia sét vô tận.
- **Thiết kế Cảm giác tay (Tactile Game Feel):**
  * **Hệ thống phím điều khiển:** Trái/Phải (Lượn gió); Phím Z / J (Đập cánh 1 nhịp); Phím X / K (Đập cánh liên tục tự động); Canh nhịp bấm ngắt quãng để giữ độ cao ổn định tuyệt đối.
  * **Độ giật nảy màn hình (Screenshake):** Rung 2px khi đạp nổ 1 quả bóng bay; Rung giật 10px (trauma 0.8) khi chú cá khổng lồ nhô khỏi mặt nước ngoạm trọn mục tiêu.
  * **Độ đầm & Khựng khung hình (Hitstop):** Khựng 35ms khi chân tiếp xúc làm vỡ bóng bay đối phương; Khựng 50ms khi bị sét đánh giật tung người.
  * **Âm thanh phản hồi (Procedural Audio SFX):** Procedural Web Audio: Tiếng đập cánh 'Flap-flap' (Square wave ngắn nhẹ nhàng 300Hz); Tiếng bóng bay nổ 'Pop!' giòn tan; Tiếng dù rơi 'Whooosh'; Tiếng cá đớp mồi 'Chomp-gulp!' (Bass 90Hz kết hợp Splash nước); Tiếng tia sét nổ 'Crack-zap!'; Giai điệu Balloon Trip thanh bình êm đềm bất hủ.
  * **Hiệu ứng hạt va chạm (Particles):** Mảnh cao su bóng bay màu đỏ vỡ vụn; Bọt nước bắn lên từ hồ nước sâu; Tia lửa điện xanh nhấp nháy phát sáng từ các đám mây sấm sét.
- **Nghiên cứu Asset & Canvas 2D Rendering:**
  * **Phong cách đồ họa (Art Style):** Pixel Art 8-bit NES màu sắc tối giản tương phản cao trên nền trời đêm đầy sao thơ mộng
  * **Bảng màu đặc trưng (Color Palette):** `#0284C7`, `#EF4444`, `#FACC15`, `#22C55E`, `#1E293B`, `#FFFFFF`
  * **Danh mục Sprites cần thiết để render:**
    + Chiến binh Balloon Fighter mặc áo xanh đeo 2 quả bóng đỏ sau lưng (vỗ cánh bay, rơi tự do, mất 1 bóng, rơi tõm xuống nước)
    + Quân địch chim đội lốt người đeo bóng bay xanh lục/vàng (bay lượn, rơi dù, ngồi bơm bóng bằng miệng)
    + Chú cá khổng lồ màu xanh rêu miệng rộng ngoi lên từ mặt nước đáy màn hình
    + Đám mây đen phát ra các tia sét màu cam nảy qua lại giữa các gờ đá

---

### 142. Đập Băng Leo Đỉnh Núi (`ice-climber-dap-bang-leo-nui`)
- **Tên gốc & Niên đại:** Ice Climber (Nintendo NES 1985) • *NES 8-bit (1985)*
- **Tagline:** *"Vung búa đục trần băng, nhảy vọt lên cao chộp lấy chân chim đại bàng!"*
- **Thể loại:** Hành động | **Phân mục:** `classic` | **Huy hiệu:** Tuổi thơ | **Màu chủ đạo:** `#0EA5E9`
- **Số người chơi:** 1-2 người | **Thời lượng ván:** 3-6 phút
- **Tóm tắt cơ chế:** Hành động nhảy leo 8 tầng núi băng theo phương đứng, đập vỡ trần băng để mở lối nhảy lên tầng trên, nhặt cà tím và đu chân đại bàng
- **Vòng lặp chơi cốt lõi (Core Loop):**
  > Cậu bé Eskimo Popo cầm búa gỗ đứng ở chân ngọn núi băng 8 tầng -> Nhảy lên vung búa đục vỡ các khối băng trên đầu tạo lỗ hổng -> Nhảy luồn qua lỗ hổng leo lên tầng cao hơn -> Né tránh chim hải âu bay ngang và dùng búa đập lũ hải cẩu lấp băng -> Lên tới tầng đỉnh (Màn thưởng Bonus) nhảy qua các khối băng di động trơn trượt -> Nhặt cà tím, ngô, dưa hấu -> Canh nhịp nhảy với tay túm lấy móng vuốt chim đại bàng khổng lồ bay ngang đỉnh núi.
- **Thiết kế Cảm giác tay (Tactile Game Feel):**
  * **Hệ thống phím điều khiển:** Trái/Phải (Chạy lấy đà trơn trượt); Phím Z / J (Nhảy cao phương đứng); Phím X / K (Vung búa đập băng / Đập quái); Quán tính trượt tuyết đòi hỏi căn chỉnh vị trí dừng chân cẩn thận.
  * **Độ giật nảy màn hình (Screenshake):** Rung 2px mỗi nhát búa đập vỡ trần băng; Rung 6px khi gấu Bắc Cực mặc quần bơi giậm chân đẩy cả ngọn núi cuộn lên 1 tầng.
  * **Độ đầm & Khựng khung hình (Hitstop):** Khựng 40ms khi búa đập trúng quái hải cẩu đẩy nó trượt tuyết văng ra khỏi mép màn hình; Khựng 80ms khi túm trúng chân chim đại bàng.
  * **Âm thanh phản hồi (Procedural Audio SFX):** Procedural Web Audio: Tiếng bước chân trượt trên băng 'Scritch-skid'; Tiếng nhảy 'Boing' cao vút; Tiếng búa đập vỡ băng 'Crack-tinkle' (White noise nén lọc cao); Tiếng chim hải âu kêu 'Squawk'; Tiếng đại bàng vỗ cánh hùng dũng; Khúc nhạc kèn mừng chiến thắng trên đỉnh núi rộn rã.
  * **Hiệu ứng hạt va chạm (Particles):** Mảnh băng vụn trong suốt rơi lả tả khi trần băng bị đục vỡ; Mây khói bồng bềnh quanh sườn núi; Củ cà tím màu tím phát sáng xoay tròn.
- **Nghiên cứu Asset & Canvas 2D Rendering:**
  * **Phong cách đồ họa (Art Style):** Pixel Art 8-bit xanh băng tuyết tươi mát, các tầng khối băng lấp lánh trong vắt
  * **Bảng màu đặc trưng (Color Palette):** `#0EA5E9`, `#38BDF8`, `#F8FAFC`, `#A855F7`, `#EF4444`, `#15803D`
  * **Danh mục Sprites cần thiết để render:**
    + Cậu bé Eskimo Popo mặc áo khoác lông xanh & Cô bé Nana áo hồng (chạy trượt tuyết, giơ búa đập trên đầu, vươn tay chộp đại bàng)
    + Khối băng tầng: Băng xanh đập 1 nhát vỡ, băng cứng không thể phá, băng di động trượt ngang trơn tuột
    + Quái vật: Hải cẩu trắng Topi đẩy tảng băng vá lỗ hổng, Chim hải âu Nitpicker sà xuống, Gấu Bắc Cực đeo kính râm mặc quần đùi hồng
    + Chim đại bàng khổng lồ sải cánh bay ngang trên nền trời mây trắng
    + Rau củ thưởng điểm: Cà tím tím rịm, bắp ngô vàng óng, củ cải đỏ

---

### 143. Chuột Cảnh Sát Đệm Lò Xo (`mappy-chuot-canh-sat-nhay-bat`)
- **Tên gốc & Niên đại:** Mappy (Namco 1983) • *Arcade (1983)*
- **Tagline:** *"Nhún bạt lò xo lầu cao, mở sập cửa vi sóng thổi bay lũ mèo trộm đồ!"*
- **Thể loại:** Hành động | **Phân mục:** `classic` | **Huy hiệu:** Kinh điển | **Màu chủ đạo:** `#EC4899`
- **Số người chơi:** 1 người | **Thời lượng ván:** 3-5 phút
- **Tóm tắt cơ chế:** Chuột cảnh sát nhảy bạt lò xo nhún qua các tầng nhà, thu hồi tài sản bị trộm, đóng mở cánh cửa sóng âm Microwave thổi bay bầy mèo
- **Vòng lặp chơi cốt lõi (Core Loop):**
  > Chuột cảnh sát Mappy bước vào dinh thự của băng cướp Mèo Meowky -> Nhún bạt lò xo (Trampoline) nhảy liên tục giữa các tầng lầu (khi đang nhảy trên bạt lò xo Mappy không thể bị mèo bắt) -> Di chuyển vào các hành lang để thu hồi các món đồ gia bảo bị trộm (Radio, Tivi, Tranh vẽ, Két sắt) -> Mở tung các cánh cửa phát sáng để phóng ra sóng âm Microwave Door thổi bay toàn bộ đàn mèo ra khỏi màn hình -> Tránh để bạt lò xo đứt dây sau 4 lần nhún liên tiếp -> Tẩu thoát an toàn.
- **Thiết kế Cảm giác tay (Tactile Game Feel):**
  * **Hệ thống phím điều khiển:** Trái/Phải (Chọn hướng nhảy khỏi bạt lò xo vào hành lang lầu); Phím Space / Z (Mở/Đóng cánh cửa trước mặt để kích hoạt sóng âm); Nhấn hướng ngược lại khi đang trên bạt để đổi hướng tiếp đất.
  * **Độ giật nảy màn hình (Screenshake):** Rung 2px mỗi nhịp bạt lò xo nảy; Rung giật 8px khi sóng âm cửa vi sóng mở ra thổi bay đàn mèo dạt vào chân tường.
  * **Độ đầm & Khựng khung hình (Hitstop):** Khựng 40ms khi gom được tài sản có boss mèo Nyamco đang ẩn nấp phía sau nhân đôi điểm thưởng.
  * **Âm thanh phản hồi (Procedural Audio SFX):** Procedural Web Audio: Tiếng bạt lò xo nhún tưng tưng 'Boing-sproing' (Sine sweep trầm bổng); Tiếng mở cánh cửa gỗ 'Creak-slam'; Tiếng sóng âm vi sóng quét 'Zzzzz-whoosh' tần số cao; Tiếng mèo la thất thanh 'Meowww!'; Tiếng chuông thu hồi két sắt 'Ding-ding-ding!'; Điệu nhạc nền Ragtime tươi vui rộn ràng nổi tiếng bậc nhất lịch sử game thùng.
  * **Hiệu ứng hạt va chạm (Particles):** Vòng tròn sóng âm màu cầu vồng lan tỏa từ cánh cửa; Nốt nhạc bay bổng khi thu hồi Radio; Mảnh dây bạt lò xo chuyển màu xanh -> vàng -> đỏ trước khi đứt.
- **Nghiên cứu Asset & Canvas 2D Rendering:**
  * **Phong cách đồ họa (Art Style):** Arcade 8-bit Namco rực rỡ vui tươi, mặt cắt biệt thự kiểu Mỹ với các món đồ gia dụng cổ điển
  * **Bảng màu đặc trưng (Color Palette):** `#EC4899`, `#3B82F6`, `#FACC15`, `#EF4444`, `#10B981`, `#1E293B`
  * **Danh mục Sprites cần thiết để render:**
    + Chuột cảnh sát Mappy mặc đồng phục cảnh sát xanh cầm dùi cui (nhún bạt lò xo, chạy lạch bạch hai chân, giơ tay chào điều lệnh)
    + Trùm mèo béo Nyamco áo đỏ & bầy mèo con Meowky áo hồng tinh nghịch đuổi bắt
    + Bạt lò xo Trampoline co giãn dưới đáy giếng trời (4 trạng thái màu bền bỉ)
    + Đồ vật trộm cắp: Máy cát-sét Radio, Tivi bóng đèn CRT, Bức họa nàng Mona Lisa, Két sắt kim cương
    + Cánh cửa gỗ thường và Cánh cửa phát sáng nhấp nháy phát sóng âm

---

### 144. Bắn Chuông Mây Biến Màu (`twinbee-ban-chuong-bay`)
- **Tên gốc & Niên đại:** TwinBee (Konami 1985) • *NES / Arcade (1985)*
- **Tagline:** *"Bắn nảy chuông trên mây để đổi màu nhặt cánh tay và khiên hộ vệ!"*
- **Thể loại:** Hành động | **Phân mục:** `classic` | **Huy hiệu:** Tuổi thơ | **Màu chủ đạo:** `#F59E0B`
- **Số người chơi:** 1-2 người | **Thời lượng ván:** 3-6 phút
- **Tóm tắt cơ chế:** Bắn phi thuyền hoạt hình dễ thương (Cute 'em up), bắn các đám mây để nhả chuông, tiếp tục bắn nảy chuông trên không trung để đổi màu tăng cấp
- **Vòng lặp chơi cốt lõi (Core Loop):**
  > Phi thuyền hình chú ong TwinBee bay lượn trên hòn đảo thần tiên Donburi -> Bắn đạn súng trên không diệt quái bay và thả bom tiêu diệt ụ súng mặt đất -> Bắn vào các đám mây trắng xốp để làm rơi ra những chiếc chuông vàng -> Tiếp tục bắn đạn vào chiếc chuông đang rơi để tâng nó nảy lên không trung và đổi màu: Chuông vàng (Điểm số) -> Trắng (Đạn đôi) -> Xanh lam (Tăng tốc độ) -> Xanh lục (Phân thân) -> Đỏ (Khiên hộ vệ) -> Nhặt đúng màu chuông để tối ưu hỏa lực -> Nếu bị bắn gãy cánh tay, chờ xe cứu thương chạy tới cấp cứu.
- **Thiết kế Cảm giác tay (Tactile Game Feel):**
  * **Hệ thống phím điều khiển:** Phím mũi tên / WASD (Bay 8 hướng); Phím Z (Bắn súng diệt mục tiêu trên không / Tâng chuông); Phím X (Thả bom mục tiêu mặt đất); Hỗ trợ phối hợp 2 người nắm tay nhau phóng đại bác liên hợp.
  * **Độ giật nảy màn hình (Screenshake):** Rung 2px mỗi phát bắn; Rung 5px khi tâng nảy chuông; Rung 8px khi bom mặt đất phát nổ phá hủy cối xay gió.
  * **Độ đầm & Khựng khung hình (Hitstop):** Khựng 30ms mỗi lần viên đạn trúng vào quả chuông tâng nó đổi sang màu mới.
  * **Âm thanh phản hồi (Procedural Audio SFX):** Procedural Web Audio: Tiếng súng ong bắn 'Pew-pew' trong trẻo; Tiếng tâng chuông leng keng giòn tan 'Ding-a-ling' (Sine 1.5kHz rung vibrato); Tiếng nhặt chuông thần kỳ 'Chime-glissando'; Tiếng còi xe cứu thương 'Ee-aa-ee-aa' khi chạy ra sửa cánh tay; Giai điệu Cute 'em up kẹo ngọt đầy phấn khởi.
  * **Hiệu ứng hạt va chạm (Particles):** Mảnh mây trắng bay lả tả khi mây tan; Quả chuông phát ra các vòng hào quang đổi màu lung linh; Tia nổ sao hoa mai nở bung khi tiêu diệt quái vật dưa hấu.
- **Nghiên cứu Asset & Canvas 2D Rendering:**
  * **Phong cách đồ họa (Art Style):** Cute 'em up 8-bit rực rỡ sắc màu kẹo ngọt phong cách anime Nhật Bản thập niên 80
  * **Bảng màu đặc trưng (Color Palette):** `#F59E0B`, `#38BDF8`, `#F43F5E`, `#10B981`, `#F8FAFC`, `#8B5CF6`
  * **Danh mục Sprites cần thiết để render:**
    + Phi thuyền ong TwinBee (xanh dương có đôi găng tay boxing trắng) & WinBee (màu hồng đáng yêu)
    + Quả chuông bay chuyển màu 5 cấp độ: Vàng chanh, Trắng tuyết, Xanh dương đậm, Xanh lá ngọc, Đỏ rực rỡ
    + Đám mây xốp trắng bồng bềnh giấu chuông
    + Quái vật ngộ nghĩnh: Củ cải bay, dưa hấu có cánh, búp bê lật đật ném xúc xích
    + Chiếc xe cứu thương tí hon màu trắng chữ thập đỏ chạy ra sửa chữa cánh tay

---

### 145. Giun Đất Bộc Phá (Worms 2D) (`worms-armageddon-giun-chien-tranh`)
- **Tên gốc & Niên đại:** Worms Armageddon (Team17 1999) • *PC Windows (1999)*
- **Tagline:** *"Căn góc gió thả cừu nổ, bắn bazooka khoét thủng đảo đất rơi biển!"*
- **Thể loại:** Chiến thuật | **Phân mục:** `hot` | **Huy hiệu:** Huyền thoại | **Màu chủ đạo:** `#84CC16`
- **Số người chơi:** 1-4 người | **Thời lượng ván:** 5-10 phút
- **Tóm tắt cơ chế:** Chiến thuật pháo binh theo lượt trên địa hình phá hủy hoàn toàn (Destructible Terrain), kho vũ khí hài hước vô tiền khoáng hậu (Holy Hand Grenade, Super Sheep, Banana Bomb)
- **Vòng lặp chơi cốt lõi (Core Loop):**
  > Mỗi đội điều khiển biệt đội những chú giun đất trang bị tận răng -> Đổi lượt 45 giây cho từng chú giun -> Di chuyển bò trườn, bắn dây thừng Ninja lượn lách qua các mỏm đá hiểm trở -> Mở hòm kho vũ khí chọn hàng chục món độc lạ (Bazooka, Lựu đạn chùm, Bom chuối, Lừa bê tông, Cừu phát nổ) -> Căn góc bắn, tính hướng gió thổi và thời gian đếm ngược ngòi nổ -> Nã đạn khoét thủng hòn đảo đất hất đối thủ rơi tòm xuống biển -> Đội nào còn chú giun sống sót cuối cùng sẽ giành cúp vô địch.
- **Thiết kế Cảm giác tay (Tactile Game Feel):**
  * **Hệ thống phím điều khiển:** Trái/Phải (Bò trườn); Phím Enter (Nhảy tới); Nhấn đúp Enter (Nhảy lộn nhào ra sau); Mũi tên Lên/Xuống (Căn góc nòng súng); Giữ phím Space (Tích lực bắn); Chuột phải (Mở bảng chọn kho vũ khí); Phím số 1-5 (Chỉnh giây hẹn giờ ngòi nổ lựu đạn).
  * **Độ giật nảy màn hình (Screenshake):** Rung 4px đạn Bazooka; Rung chấn long trời lở đất 18px (trauma 1.0, 500ms) khi Quả Lựu Đạn Thánh (Holy Hand Grenade) phát nổ khoét một hố khổng lồ trên đảo.
  * **Độ đầm & Khựng khung hình (Hitstop):** Khựng 60ms đúng thời điểm quả lựu đạn phát nổ hất tung chú giun đất bay vèo lên trời la hét.
  * **Âm thanh phản hồi (Procedural Audio SFX):** Procedural Web Audio: Tiếng kêu hài hước lồng tiếng chíp hôi của giun 'Incoming!', 'Fire in the hole!', 'Bye-bye!'; Tiếng nổ Thánh 'HALLELUJAH!' rồi 'KABOOM!' long trời lở đất; Tiếng cừu nổ 'Baaaa-boom'; Tiếng giun rơi xuống biển 'Sploosh!' kèm giọt nước bắn tung tóe.
  * **Hiệu ứng hạt va chạm (Particles):** Mảnh đất đá của hòn đảo vỡ vụn bắn ra hàng trăm hạt; Khói cuộn hình nấm khổng lồ sau vụ nổ; Dấu vết khét đen in trên vách đá bị đạn bắn thủng.
- **Nghiên cứu Asset & Canvas 2D Rendering:**
  * **Phong cách đồ họa (Art Style):** Vector Cartoon 2D hài hước chi tiết, địa hình đảo ngẫu nhiên có thể bị phá hủy từng pixel (Pixel-perfect Destructible Terrain)
  * **Bảng màu đặc trưng (Color Palette):** `#84CC16`, `#F59E0B`, `#EF4444`, `#38BDF8`, `#78350F`, `#1E293B`
  * **Danh mục Sprites cần thiết để render:**
    + Những chú giun đất màu hồng biểu cảm phong phú (vác bazooka, đội mũ bảo hiểm, đeo kính râm, sợ hãi toát mồ hôi khi bom rơi sát chân)
    + Kho vũ khí huyền thoại: Bazooka xả khói, Lựu đạn cầm tay, Chùm chuối vàng Banana Bomb, Chú cừu trắng bay choàng khăn đỏ Super Sheep, Quả Lựu đạn Thánh vàng kim có chữ thập
    + Mặt cắt đảo đất: Lớp cỏ xanh mặt trên, lớp đất nâu xốp ở giữa, nước biển xanh thẳm ở đáy chờ đón giun ngã xuống
    + Bia mộ đá hình thánh giá hoặc chiếc mũ lính cắm xuống khi chú giun hy sinh

---

### 146. Xe Ủi Đào Vàng Hầm Ngầm (`digger-xe-ui-dao-ham`)
- **Tên gốc & Niên đại:** Digger (Windmill Software 1983 - Rob Sleath) • *PC MS-DOS (1983)*
- **Tagline:** *"Ủi hầm ăn ngọc lục bảo, thả túi vàng đè bẹp quái Nobbin rượt đuổi!"*
- **Thể loại:** Giải đố | **Phân mục:** `classic` | **Huy hiệu:** Kinh điển | **Màu chủ đạo:** `#EAB308`
- **Số người chơi:** 1 người | **Thời lượng ván:** 3-6 phút
- **Tóm tắt cơ chế:** Đào hầm địa đạo thu gom ngọc lục bảo, đẩy túi vàng rơi đè bẹp quái vật rượt đuổi, ăn quả anh đào để đảo ngược tình thế đi săn quái
- **Vòng lặp chơi cốt lõi (Core Loop):**
  > Xe ủi màu vàng đào các đường hầm ngầm ngoằn ngoèo xuyên qua lòng đất -> Thu thập các viên ngọc lục bảo Emerald lấp lánh (ăn liên tiếp 8 viên để nhân điểm thưởng) -> Tránh né hai loài quái vật Nobbin (chỉ bò trong hầm) và Hobbins (biết tự đào xuyên đất đuổi theo) -> Ủi dưới đáy các bao tải tiền vàng để bao vàng rơi tự do đè bẹp lũ quái -> Khi bao vàng rơi xuống vỡ toang, quay lại nhặt đống tiền vàng rơi vãi -> Ăn quả anh đào thần kỳ để tạm thời biến xe ủi thành thợ săn quái vật.
- **Thiết kế Cảm giác tay (Tactile Game Feel):**
  * **Hệ thống phím điều khiển:** Phím mũi tên 4 hướng di chuyển đào hầm; Phím F1 / Space bắn một phát đạn pháo hạt nhân (mất 20 giây hồi chiêu mới bắn được phát tiếp theo); Phím Esc tạm dừng.
  * **Độ giật nảy màn hình (Screenshake):** Rung 2px mỗi bước ủi đất; Rung mạnh 7px khi túi vàng ngàn cân rơi xuống đất vỡ toang đè nát quái vật.
  * **Độ đầm & Khựng khung hình (Hitstop):** Khựng 30ms khi xe ủi nhai gọn một viên ngọc lục bảo phát ra nốt nhạc vui nhộn.
  * **Âm thanh phản hồi (Procedural Audio SFX):** Procedural Web Audio: Điệu nhạc nền chiptune PC Speaker kinh điển 'Popcorn' của Gershon Kingsley phát bằng sóng vuông Square 8-bit giòn tan; Tiếng ủi đất sột soạt; Tiếng bao vàng rơi 'Whistle-down' rồi 'Crash!' vỡ toang; Điệu nhạc 'William Tell Overture' hào hùng vang lên khi ăn anh đào đi săn quái.
  * **Hiệu ứng hạt va chạm (Particles):** Mảnh đất cát rơi xuống khi xe đào hầm; Tiền xu vàng bay tung tóe ra từ chiếc túi vàng bị vỡ; Ngôi sao lấp lánh khi xe ủi nuốt chửng quái vật.
- **Nghiên cứu Asset & Canvas 2D Rendering:**
  * **Phong cách đồ họa (Art Style):** Retro CGA 4 màu (Cyan, Magenta, White, Black) hoặc 16 màu EGA kinh điển thuở sơ khai máy tính cá nhân IBM PC
  * **Bảng màu đặc trưng (Color Palette):** `#EAB308`, `#10B981`, `#EC4899`, `#06B6D4`, `#F8FAFC`, `#000000`
  * **Danh mục Sprites cần thiết để render:**
    + Chiếc xe ủi Digger màu vàng có miệng ngoạm mở ra đóng vào ngộ nghĩnh
    + Viên ngọc lục bảo Emerald màu xanh lá hình thoi rực sáng
    + Chiếc túi vàng màu nâu buộc dây thun in ký hiệu '$' (nguyên vẹn, đang rơi, vỡ toang bung tiền vàng)
    + Quái vật: Nobbin tròn trịa màu đỏ mắt to, biến hình thành Hobbin màu xanh răng nhọn hoắt biết đào xuyên lòng đất
    + Quả anh đào đôi màu đỏ mọng xuất hiện góc màn hình

---

### 147. Mọt Sách Nối Chữ (Bookworm) (`bookworm-sau-noi-chu`)
- **Tên gốc & Niên đại:** Bookworm (PopCap Games 2003) • *PC PopCap (2003)*
- **Tagline:** *"Nối từng chữ cái thành từ vựng kỳ diệu, dập tắt khối chữ bốc cháy!"*
- **Thể loại:** Giải đố | **Phân mục:** `chill` | **Huy hiệu:** Kinh điển | **Màu chủ đạo:** `#16A34A`
- **Số người chơi:** 1 người | **Thời lượng ván:** 4-8 phút
- **Tóm tắt cơ chế:** Nối các ô chữ cái liền kề trên lưới tổ ong tạo thành từ vựng tiếng Anh có nghĩa, dập tắt các ô chữ lửa đang cháy lan xuống đáy thư viện
- **Vòng lặp chơi cốt lõi (Core Loop):**
  > Lưới tổ ong đầy ắp các chữ cái ngẫu nhiên -> Kéo rê chuột nối các chữ cái liền kề để ghép thành từ vựng tiếng Anh (từ càng dài điểm càng cao và sinh ra các ô chữ đặc biệt: Xanh lục, Vàng kim, Kim cương) -> Chú sâu mọt sách Lex ăn từ và khen ngợi -> Các ô chữ bốc cháy (Burning Tiles) xuất hiện và rơi dần xuống đáy mỗi lượt -> Phải nhanh chóng ghép từ chứa chữ lửa để dập tắt ngọn lửa trước khi nó thiêu rụi toàn bộ thư viện sách -> Thăng cấp học vị từ Thư sinh lên Bác học.
- **Thiết kế Cảm giác tay (Tactile Game Feel):**
  * **Hệ thống phím điều khiển:** Kéo chuột trái trượt qua chuỗi các ô chữ kề nhau; Nhấp vào chữ cái cuối cùng hoặc bấm Enter để nộp từ; Nhấp vào chú sâu Lex để xáo trộn lại bàn cờ chữ cái khi bế tắc.
  * **Độ giật nảy màn hình (Screenshake):** Rung 2px khi nộp từ thông thường; Rung giật 8px khi khối chữ lửa bốc cháy dữ dội rơi xuống tầng đáy thư viện.
  * **Độ đầm & Khựng khung hình (Hitstop):** Khựng 40ms khi ghép được từ vựng dài 6+ ký tự tạo ra ô chữ ngọc lục bảo.
  * **Âm thanh phản hồi (Procedural Audio SFX):** Procedural Web Audio: Tiếng chạm từng ô chữ cái gõ lách cách như máy đánh chữ 'Clack-tap-click' tăng dần cao độ theo chiều dài của từ; Tiếng nộp từ thành công tiếng chuông ngân 'Ding-chime!' ngọt ngào; Tiếng lửa cháy xèo xèo 'Hiss-crackle'; Giọng đọc trầm ấm khen ngợi của chú sâu Lex: 'Astounding!', 'Fantastic!'; Nhạc nền thư viện êm dịu thư thái.
  * **Hiệu ứng hạt va chạm (Particles):** Mảnh giấy sách và bụi sao vàng lấp lánh rơi ra từ các ô chữ bị ăn; Tàn lửa đỏ bay lên từ khối chữ bốc cháy; Ô chữ kim cương phát ra luồng sáng lăng kính 7 màu.
- **Nghiên cứu Asset & Canvas 2D Rendering:**
  * **Phong cách đồ họa (Art Style):** Học thuật thư viện cổ điển ấm cúng đặc trưng PopCap Games, kệ sách gỗ bóng loáng và bìa sách bọc da
  * **Bảng màu đặc trưng (Color Palette):** `#16A34A`, `#F59E0B`, `#DC2626`, `#38BDF8`, `#78350F`, `#FEF3C7`
  * **Danh mục Sprites cần thiết để render:**
    + Chú sâu xanh đeo kính cận Lex the Bookworm mặc áo cử nhân đứng bên cạnh thư viện (mỉm cười, nhai ngấu nghiến chữ cái, lo lắng toát mồ hôi khi có lửa cháy)
    + Các ô chữ tổ ong: Ô gỗ mộc, ô ngọc lục bảo xanh lá x2 điểm, ô vàng kim x3 điểm, ô kim cương x5 điểm
    + Khối chữ bốc cháy rừng rực với ngọn lửa hoạt họa bập bùng
    + Kệ sách thư viện cổ bọc da mạ vàng và bức tranh minh họa câu đố

---

### 148. Ghép Phân Tử Hóa Học (`atomix-ghep-phan-tu-hoa-hoc`)
- **Tên gốc & Niên đại:** Atomix (Thalion Software 1990 - Günter Krämer) • *Amiga / PC (1990)*
- **Tagline:** *"Đẩy các nguyên tử trượt tự do va tường ghép thành công thức phân tử nước!"*
- **Thể loại:** Giải đố | **Phân mục:** `quick` | **Huy hiệu:** Đỉnh cao | **Màu chủ đạo:** `#6366F1`
- **Số người chơi:** 1 người | **Thời lượng ván:** 4-8 phút
- **Tóm tắt cơ chế:** Giải đố trượt không gian quán tính: đẩy một nguyên tử theo 4 hướng nó sẽ trượt thẳng tắp cho đến khi va vào tường chướng ngại, lắp ráp thành phân tử hóa học chính xác
- **Vòng lặp chơi cốt lõi (Core Loop):**
  > Giao diện hiển thị sơ đồ phân tử hóa học mục tiêu ở góc nhỏ (ví dụ: Nước H2O, Mê-tan CH4, Cồn C2H5OH) -> Trong căn phòng thí nghiệm gồm nhiều ngóc ngách tường đá, các nguyên tử Hydro, Oxy, Carbon nằm rải rác -> Chọn nguyên tử và đẩy theo 1 trong 4 hướng -> Nguyên tử không thể tự dừng lại giữa đường mà sẽ trượt tự do cho đến khi va vào bức tường hoặc nguyên tử khác -> Tính toán các điểm dừng và bức tường kê đỡ để ghép nối các mối liên kết hóa học (liên kết đơn, liên kết đôi) -> Hoàn thành cấu trúc phân tử trước khi đồng hồ cạn giờ.
- **Thiết kế Cảm giác tay (Tactile Game Feel):**
  * **Hệ thống phím điều khiển:** Chuột hoặc Phím mũi tên: Chọn nguyên tử cần di chuyển -> Bấm hướng mũi tên để đẩy nguyên tử trượt đi; Phím U (Undo quay lại 1 bước); Phím R (Đặt lại màn chơi).
  * **Độ giật nảy màn hình (Screenshake):** Rung 2px mỗi khi nguyên tử va đập vào vách tường dừng lại dứt khoát.
  * **Độ đầm & Khựng khung hình (Hitstop):** Khựng 50ms khi hai nguyên tử ghép nối đúng mối liên kết hóa học phát ra tiếng khóa cơ khí chắc nịch.
  * **Âm thanh phản hồi (Procedural Audio SFX):** Procedural Web Audio: Tiếng chọn nguyên tử 'Bloop' (Sine 440Hz); Tiếng nguyên tử trượt lướt vèo trên sàn gạch phòng lab; Tiếng va chạm vách tường 'Clack!' đanh gọn; Tiếng khóa liên kết hóa học 'Snap-click' cơ học chuẩn xác; Khúc nhạc điện tử synthwave phòng thí nghiệm khoa học bí ẩn.
  * **Hiệu ứng hạt va chạm (Particles):** Tia sáng điện kết nối hình thành giữa 2 nguyên tử khi ghép đúng liên kết; Bụi nano lấp lánh quanh mô hình phân tử hoàn thành; Đốm sáng xoay vòng quanh sơ đồ mục tiêu.
- **Nghiên cứu Asset & Canvas 2D Rendering:**
  * **Phong cách đồ họa (Art Style):** Phòng thí nghiệm khoa học vị lai Amiga 16-bit thanh lịch, các khối nguyên tử kim loại bóng bẩy đổ bóng 3D chân thực
  * **Bảng màu đặc trưng (Color Palette):** `#6366F1`, `#38BDF8`, `#F59E0B`, `#EF4444`, `#10B981`, `#0F172A`
  * **Danh mục Sprites cần thiết để render:**
    + Các quả cầu nguyên tử kim loại bóng loáng: Hydro (trắng/xám có 1 mối nối), Oxy (đỏ có 2 mối nối vuông góc hoặc thẳng hàng), Carbon (đen/xanh đậm có 4 mối nối), Nitơ (xanh lam có 3 mối nối)
    + Các thanh giằng liên kết hóa học: Liên kết đơn que thẳng, liên kết đôi song song
    + Bức tường phòng thí nghiệm gạch men sáng bóng có hoa văn vi mạch
    + Khung kính hiển vi thu nhỏ hiển thị sơ đồ cấu trúc phân tử mẫu cần ghép

---

### 149. Tháp Băng Nhảy Cực Hạn (`icy-tower-thap-bang-nhay-cao`)
- **Tên gốc & Niên đại:** Icy Tower (Free Fall Arcade 2001 - Johan Peitz) • *PC Windows (2001)*
- **Tagline:** *"Nhảy bật tường lộn nhào, chuỗi Combo Sweet vượt tầng băng đang sụp đổ!"*
- **Thể loại:** Kỹ năng | **Phân mục:** `hot` | **Huy hiệu:** Huyền thoại | **Màu chủ đạo:** `#06B6D4`
- **Số người chơi:** 1 người | **Thời lượng ván:** 2-5 phút
- **Tóm tắt cơ chế:** Nhảy bục cuộn cảnh thẳng đứng vô tận, tích lũy tốc độ chạy đà để bật tường lộn vòng phóng vọt qua 5 tầng bục cùng lúc tạo chuỗi Combo
- **Vòng lặp chơi cốt lõi (Core Loop):**
  > Chàng thanh niên Harold the Homeboy đứng ở chân tháp băng -> Chạy đà trái phải để lấy trớn tốc độ (thanh Speed Bar tăng dần) -> Bật nhảy lên các tầng bậc thang băng -> Nhảy vào bức tường bên hông tháp để thực hiện cú bật tường lộn nhào (Wall-bounce spin) phóng vút lên cao vượt 4, 5 thậm chí 7 tầng bục cùng lúc -> Mở khóa các cấp bậc Combo trứ danh: Good! -> Sweet! -> Great! -> Super! -> Amazing! -> Đáy màn hình bắt đầu cuộn nhanh dần theo thời gian -> Đừng để hụt chân rơi xuống mép đáy màn hình.
- **Thiết kế Cảm giác tay (Tactile Game Feel):**
  * **Hệ thống phím điều khiển:** Phím mũi tên Trái/Phải (Chạy đà gia tốc); Phím Space (Nhảy bật cao); Giữ nút di chuyển khi nhảy chạm vách tường để bật nảy ngược lại với lực gia tốc cực đại.
  * **Độ giật nảy màn hình (Screenshake):** Rung 2px khi tiếp đất trên bậc thang; Rung 6px khi bật nảy tường với tốc độ tên lửa; Rung 10px kèm rung chuông khi đạt Combo Amazing 100+ tầng.
  * **Độ đầm & Khựng khung hình (Hitstop):** Khựng 40ms ở đỉnh parabol cú nhảy lộn nhào khi nhân vật xoay tít 3 vòng trước khi đáp xuống bậc thang cao ngất.
  * **Âm thanh phản hồi (Procedural Audio SFX):** Procedural Web Audio: Tiếng bước chân chạy thình thịch 'Pat-pat-pat' dồn dập; Tiếng nhảy vút cao 'Boiiing-wheee!' (Sine sweep vút lên 1.2kHz); Tiếng xoay vòng trên không 'Whoosh-whoosh'; Tiếng reo hò phấn khích của Harold khi đạt combo: 'Sweet!', 'Yeah!', 'Super!'; Tiếng đồng hồ quả lắc tích tắc khi tháp cuộn nhanh; Tiếng còi tan trận khi rơi xuống đáy.
  * **Hiệu ứng hạt va chạm (Particles):** Vết tuyết trắng xóa cuộn ra từ gót giày trượt; Tia sao vàng lấp lánh bùng nổ theo chữ combo; Bậc thang băng nứt vỡ nhấp nháy khi cuộn sát đáy.
- **Nghiên cứu Asset & Canvas 2D Rendering:**
  * **Phong cách đồ họa (Art Style):** Pixel Art truyện tranh đường phố Hip-hop đầu thập niên 2000, phong cách ngổ ngáo cá tính
  * **Bảng màu đặc trưng (Color Palette):** `#06B6D4`, `#FACC15`, `#F97316`, `#1E293B`, `#F8FAFC`, `#EF4444`
  * **Danh mục Sprites cần thiết để render:**
    + Cậu bé Harold đội mũ lưỡi trai ngược áo hoodie xanh quần thụng (chạy lấy đà nghiêng người, co chân nhảy, xoay vòng tròn lộn nhào 360 độ trên không, vung tay ăn mừng)
    + Các bậc thang tháp băng biến đổi theo độ cao: Bậc băng trắng xanh, bậc gỗ rừng, bậc kim loại, bậc đá dung nham nóng đỏ
    + Bức tường đá hai bên tháp rêu phong phủ tuyết
    + Chữ huy hiệu Combo 3D bật nảy hoạt họa phóng to thu nhỏ giữa màn hình: 'GOOD!', 'SWEET!', 'GREAT!', 'SUPER!'

---

### 150. Lăn Cầu Chuột Hamster (`hamsterball-lan-cau-hamster`)
- **Tên gốc & Niên đại:** Hamsterball (Raptisoft 2004 - John Rapoza) • *PC Windows (2004)*
- **Tagline:** *"Cân bằng quả cầu lăn trên mép vực dốc xoắn ốc chạy đua cùng đồng hồ!"*
- **Thể loại:** Kỹ năng | **Phân mục:** `quick` | **Huy hiệu:** Tuổi thơ | **Màu chủ đạo:** `#F97316`
- **Số người chơi:** 1 người | **Thời lượng ván:** 3-6 phút
- **Tóm tắt cơ chế:** Lăn quả cầu thủy tinh vật lý Marble 3D chứa chú chuột hamster bên trong, vượt qua các đoạn dốc hiểm trở không có lan can trước khi cạn giờ
- **Vòng lặp chơi cốt lõi (Core Loop):**
  > Chú chuột hamster mũm mĩm ngồi bên trong quả cầu trong suốt lấp lánh -> Lăn bóng xuống đường đua dốc đứng đầy hiểm hóc -> Điều khiển quán tính và lực ma sát của quả cầu để ôm cua gọn gàng trên các đoạn dốc quanh co không hề có lan can bảo vệ -> Vượt qua các chướng ngại vật quái ác: máy giậm búa nghiền nát quả cầu, quạt gió thổi bạt, quả cầu sắt gai lăn ngược chiều, sàn băng trơn tuột -> Căn đúng vạch tăng tốc Speed Boost để phóng vút qua vực thẳm -> Cán đích kiểm tra thời gian kỷ lục.
- **Thiết kế Cảm giác tay (Tactile Game Feel):**
  * **Hệ thống phím điều khiển:** Di chuyển chuột trực tiếp để đẩy hướng lăn của quả cầu (hoặc cụm phím Mũi tên / WASD); Phím Space nạp lực phanh gấp / thắng khẩn cấp; Cảm giác quán tính lăn cầu đầm chắc và chân thực.
  * **Độ giật nảy màn hình (Screenshake):** Rung 2px theo độ gồ ghề của mặt đường dốc; Rung giật 7px khi quả cầu va đập vào vách tường kim loại; Rung 12px (trauma 0.9) khi quả cầu rơi từ trên cao nứt toác.
  * **Độ đầm & Khựng khung hình (Hitstop):** Khựng 35ms khi quả cầu lăn qua vạch đệm tăng tốc Speed Boost kèm tiếng phóng phản lực vút đi.
  * **Âm thanh phản hồi (Procedural Audio SFX):** Procedural Web Audio: Tiếng quả cầu lăn rù rù trên sàn gỗ 'Rumble-roll' biến thiên cao độ theo tốc độ quay; Tiếng chân chú chuột chạy lạch bạch bên trong lồng cầu; Tiếng kính va chạm 'Clink-tinkle' giòn đanh; Tiếng búa nện xuống ầm ầm 'Thump-smash'; Tiếng chuột hamster kêu chí chít 'Squeak-squeak!' khi hoảng sợ; Giai điệu nhạc jazz vui tươi rộn rã đầy thử thách.
  * **Hiệu ứng hạt va chạm (Particles):** Mảnh kính vỡ vụn văng ra khi quả cầu bị va đập quá mạnh; Vệt khói lốp ma sát bốc lên khi phanh gấp; Bụi sao vàng lấp lánh quanh quả cầu khi phóng qua cổng tăng tốc.
- **Nghiên cứu Asset & Canvas 2D Rendering:**
  * **Phong cách đồ họa (Art Style):** 3D Isometric hoạt hình rực rỡ, bề mặt quả cầu thủy tinh bóng loáng phản chiếu ánh sáng chân thực
  * **Bảng màu đặc trưng (Color Palette):** `#F97316`, `#FACC15`, `#38BDF8`, `#10B981`, `#EF4444`, `#78350F`
  * **Danh mục Sprites cần thiết để render:**
    + Quả cầu trong suốt phản chiếu ánh sáng cầu vồng chứa chú chuột hamster lông vàng nâu chạy lon ton bên trong (chú chuột chóng mặt quay cuồng khi cầu lăn nhanh)
    + Các loại mặt đường đua: Đường gỗ ván mộc, đường kẻ sọc cờ caro ca rô đua xe, đường băng xanh trơn trượt, đường dốc xoắn ốc uốn lượn
    + Chướng ngại vật hiểm hóc: Chiếc búa tạ máy giậm liên hồi, quả bóng sắt gai xích sắt đung đưa, cánh quạt khổng lồ thổi gió bão
    + Vạch tăng tốc hình mũi tên vàng phát sáng rực rỡ và cổng vòm đích đến gắn bóng bay sắc màu

---

## 4. HƯỚNG DẪN TÍCH HỢP CODEBASE & BỘ ENGINE DÙNG CHUNG

Toàn bộ 50 tựa game trên được thiết kế để tương thích hoàn toàn với kiến trúc hiện có của NewPlayground:
1. **Tích hợp vào `data/games.json`:** Nối mảng 50 đối tượng từ file `games-101-150.json` vào cuối `data/games.json`.
2. **Tích hợp vào `games-data.js`:** Cập nhật biến `window.__NP_GAMES_CACHE__` để đảm bảo game chạy offline ngay cả khi không có HTTP server.
3. **Tương thích `scripts/game-feel.js`:** Mọi âm thanh procedural audio và hiệu ứng hạt mô tả ở trên đều ánh xạ trực tiếp với các hàm có sẵn:
   - `NP_Audio.tone()`, `NP_Audio.explosion()`, `NP_Audio.thud()`, `NP_Audio.splash()`, `NP_Audio.pop()`, `NP_Audio.clack()`, `NP_Audio.whoosh()`, `NP_Audio.metalClank()`.
   - `NP_Juice.screenShake(intensity, duration)`, `NP_Juice.triggerHitstop(ms)`, `NP_Juice.createParticleSystem()`.
4. **Phân nhóm Engine tái sử dụng:**
   - **Grid & Board Engine:** Bloxorz, Q*bert, Bookworm, Atomix, The Impossible Quiz.
   - **Physics & Projectile Engine:** Raft Wars, Bowman, Snowcraft, Line Rider, Hamsterball, Asteroids.
   - **Arcade & Patrol Action Engine:** Boom Online, Mega Man, Duck Hunt, Adventure Island, Street Fighter II, Prince of Persia, Bubble Bobble, Donkey Kong, Dig Dug, Pooyan, Yie Ar Kung-Fu, Frogger, Elevator Action, Double Dragon, Golden Axe, Cadillacs and Dinosaurs, Gun Mayhem, Electric Man 2, Fancy Pants, Centipede, 1942, Shinobi, Chip 'n Dale, Tiny Toon, Balloon Fight, Ice Climber, Mappy, TwinBee, Worms, Digger, Icy Tower.
   - **Management & Rhythm Engine:** Audition 4 Phím Space, Papa's Pizzeria, Age of War, Stick War, Defend Your Castle, Moorhuhn.


---
*Tài liệu được biên soạn tự động và nghiệm thu hoàn tất theo tiêu chuẩn kỹ thuật NewPlayground.*