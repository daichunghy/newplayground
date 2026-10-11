# TÀI LIỆU ĐẶC TẢ & THU THẬP DỮ LIỆU 50 TRÒ CHƠI KINH ĐIỂN
## DANH SÁCH Ý TƯỞNG, CÂU HỎI NGHIÊN CỨU VÀ NGUỒN THAM KHẢO TÀI SẢN
**Dự án:** NewPlayground (Hệ sinh thái game web hoài niệm & nguyên bản)  
**Tiêu chuẩn văn bản:** Font Calibri, chuẩn hóa hiển thị đa nền tảng, thiết kế rõ ràng và chuyên nghiệp.

---

## CÁCH DÙNG TÀI LIỆU NÀY

Các hàng bên dưới là gợi ý định hướng, không phải ghi nhận một phiên bản đã nghiên cứu, luật đã xác minh, asset đã được cleared, hay game đã triển khai. Trước khi sửa một tựa, xác định đúng edition/build, nền tảng, mode và nguồn; ghi chứng cứ, quan sát, sai khác, test và browser playtest trong [hồ sơ game](./GAME_DEVELOPMENT_GUIDELINES.md) và [sổ bao phủ theo từng tựa](./GAME_COVERAGE.md).

Nghiên cứu hành vi chơi và quyền dùng nội dung là hai việc tách biệt. Việc tham khảo cơ chế không phải ý kiến pháp lý hoặc bảo đảm không có khiếu nại. Các link asset ở bảng chỉ là đầu mối để xem xét; kiểm chứng license, quyền của từng file, điều kiện sử dụng, attribution và các quyền liên quan trước khi thêm vào repo. Không suy quyền từ tên pack hay vendor sang từng file.

---

## DANH MỤC TỔNG HỢP 50 TRÒ CHƠI KINH ĐIỂN

| ID | Tên Game Kinh Điển | Thể Loại | Cơ Chế Cốt Lõi | Hệ Thống Vật Phẩm / Nâng Cấp | Nguồn asset cần kiểm chứng |
| :---: | :--- | :--- | :--- | :--- | :--- |
| **01** | **Hàng Rong (Street Stall)** | Quản lý thời gian | Nấu món $\rightarrow$ Chờ $\rightarrow$ Giao khách $\rightarrow$ Thu tiền $\rightarrow$ Nâng cấp | Khay thêm, bếp nhanh, biển hiệu, gia vị | Kenney Food Kit / Urban 2D Packs |
| **02** | **Diner Dash (Phục vụ bàn)** | Quản lý nhà hàng | Xếp bàn $\rightarrow$ Nhận order $\rightarrow$ Bưng đồ $\rightarrow$ Dọn bàn | Giày trượt, cà phê tăng tốc, hoa bàn | Kenney Restaurant & Character Sprites |
| **03** | **Lemonade Tycoon (Quầy chanh)** | Mô phỏng kinh tế | Pha chế (chanh, đường, đá) $\rightarrow$ Định giá theo thời tiết | Nâng cấp xe đẩy, máy vắt, biển quảng cáo | Kenney UI & Commercial Vector Pack |
| **04** | **Nông Trại Vui Vẻ (Happy Farm)** | Mô phỏng nông trại | Xới đất $\rightarrow$ Gieo hạt $\rightarrow$ Tưới nước $\rightarrow$ Thu hoạch $\rightarrow$ Bán | Phân bón tăng tốc, hạt giống hiếm, kho chứa | Kenney Tiny Town / Farming Kit (CC0) |
| **05** | **Nuôi Cá (Insaniquarium)** | Nuôi thú & Thu hoạch | Thả mồi $\rightarrow$ Nhặt tiền xu rơi $\rightarrow$ Diệt quái vật bảo vệ | Thức ăn dinh dưỡng, ốc nhặt tiền, súng laze | Kenney Fish / Underwater 2D Assets |
| **06** | **Tiệm Bánh Pizza (Pizza Frenzy)** | Phân phối & Định vị | Khách gọi $\rightarrow$ Ghép loại pizza $\rightarrow$ Bấm giao đúng nhà | Xe giao hàng tốc độ, chuông báo, gia nhiệt | Kenney City Top-Down / Food Sprites |
| **07** | **Khách Sạn (Jane's Hotel)** | Quản lý dịch vụ | Nhận chìa khóa $\rightarrow$ Giặt ủi $\rightarrow$ Dọn phòng $\rightarrow$ Thanh toán | Nâng cấp nội thất, phục vụ cà phê, thang máy | Kenney Interior & Furniture 2D Kit |
| **08** | **Siêu Thị Tí Hon (Supermarket)** | Quản lý kho hàng | Điền hàng lên kệ $\rightarrow$ Thu gom giỏ $\rightarrow$ Hỗ trợ tính tiền | Xe đẩy hàng dung tích lớn, nhân viên phụ | Kenney Isometric Commercial Pack |
| **09** | **Đào Vàng (Gold Miner)** | Kéo thả & Vật lý | Con lắc góc $\theta$ $\rightarrow$ Thả móc $\rightarrow$ Kéo vật phẩm theo khối lượng | Thuốc nổ Dynamite, nước tăng lực, sách may mắn | Kenney Mining & Medieval Kit (CC0) |
| **10** | **Gunny / Worms 2D** | Bắn súng tọa độ | Căn góc $\alpha$ + Lực bắn $F$ + Hướng gió $\vec{w}$ $\rightarrow$ Phá hủy địa hình | Đạn chùm, đạn bay xa, hồi máu, máy bay chuyển vị | Kenney Weapons & Destructible Terrain |
| **11** | **Bắn Chim (Slingshot Physics)** | Vật lý va chạm | Kéo súng cao su $\rightarrow$ Bắn đạn động năng $\rightarrow$ Phá vỡ kết cấu gỗ/đá | Chim tách ba, chim nổ bộc phá, chim tăng tốc | Kenney Physics Projectiles & Blocks |
| **12** | **Thả Bi Peggle (Pachinko)** | Vật lý rơi & Nảy | Bắn bi kim loại $\rightarrow$ Nảy qua các chốt $\rightarrow$ Hứng vào rổ đáy | Bi nổ diện rộng, bi dẫn đường, rổ hứng phóng to | Kenney Particle & Marble Physics Pack |
| **13** | **Cắt Dây (Cut the Rope)** | Giải đố vật lý | Cắt dây trọng lực $\rightarrow$ Bong bóng bay $\rightarrow$ Thu thập sao $\rightarrow$ Vào miệng | Dây cao su, đệm nhún, máy thổi khí | Kenney Puzzle & Rope Physics Kit |
| **14** | **Bập Bênh Phá Bóng (Magic Ball)** | Vật lý góc phản xạ | Đỡ bóng rơi $\rightarrow$ Góc nảy theo vị trí chạm thanh trượt | Thanh trượt mở rộng, bóng tách đôi, tia laze | Kenney Breakout & Ball Physics Assets |
| **15** | **Xây Cầu (Bridge Builder)** | Vật lý kết cấu lực | Nối thanh giằng $\rightarrow$ Kiểm tra ứng suất nén/kéo $\rightarrow$ Xe qua an toàn | Dầm thép, cáp treo, dầm gỗ, trụ thủy lực | Kenney Construction 2D Physics Assets |
| **16** | **Bong Bóng Nổi (Bubble Rise)** | Cân bằng lực đẩy | Thổi khí $\rightarrow$ Tránh gai nhọn $\rightarrow$ Gom hạt năng lượng | Khiên chắn tạm thời, tăng lực nổi, nam châm | Kenney Particle & Atmospheric Assets |
| **17** | **Bắn Trứng (Dynomite)** | Ghép màu 2D | Bắn trứng góc $\alpha$ $\rightarrow$ Ghép cụm $\ge 3$ cùng màu $\rightarrow$ Rơi chùm | Trứng bom nổ, trứng đổi màu, trứng nhân đôi điểm | Kenney Puzzle Bubbles & Gemstones |
| **18** | **Zuma (Ếch Phun Ngọc)** | Bắn bóng đường xoắn | Bắn ngọc vào đoàn tàu ngọc đang lăn $\rightarrow$ Ghép $\ge 3$ $\rightarrow$ Đẩy lùi | Ngọc lùi thời gian, ngọc làm chậm, ngọc nổ bom | Kenney Rolling Spheres & Maya Pack |
| **19** | **Kim Cương (Bejeweled)** | Match-3 Matrix | Tráo 2 ô kề nhau $\rightarrow$ Tạo hàng ngang/dọc $\ge 3$ $\rightarrow$ Thác đổ | Kim cương lửa (nổ 3x3), kim cương sét, mắt thần | Kenney Gem Match-3 Spritesheet (CC0) |
| **20** | **Line 98 (Xếp Bóng Màu)** | Tìm đường A* & Logic | Di chuyển bóng trên lưới 9x9 $\rightarrow$ Xếp $\ge 5$ bóng cùng màu | Bóng vạn năng, bom xóa ô, gợi ý bước tiếp | Kenney Board & Colored Balls Pack |
| **21** | **Dò Mìn (Minesweeper)** | Logic suy luận | Mở ô $\rightarrow$ Hiển thị số mìn lân cận (0-8) $\rightarrow$ Cắm cờ | Cờ đánh dấu, kính lúp soi trước 1 ô | Kenney UI Minimal / Retro Minesweeper |
| **22** | **Xếp Gạch (Tetris)** | Ghép khối hình học | Xoay khối Tetromino $\rightarrow$ Lấp đầy hàng ngang $\rightarrow$ Xóa hàng | Giữ khối (Hold), xem trước 3 khối, tăng tốc | Kenney Monospaced Retro Shapes Pack |
| **23** | **2048 (Trượt Khối Số)** | Toán học lũy thừa | Vuốt 4 hướng $\rightarrow$ Gộp 2 số bằng nhau thành $2 \times N$ | Khối quay lui (Undo), khối biến mất ngẫu nhiên | Kenney Clean Number Blocks & Minimal UI |
| **24** | **Đẩy Thùng Sokoban** | Giải đố không gian | Đẩy thùng vào vị trí đích $\rightarrow$ Không được kéo, tránh góc chết | Nước đi hoàn tác (Undo), bản đồ lưới trực quan | Kenney Sokoban Tileset Pack (CC0) |
| **25** | **Nối Ống Nước (Pipemania)** | Ghép nối đường ống | Xoay các đoạn ống $\rightarrow$ Tạo dòng chảy liên tục từ nguồn đến đích | Van điều tiết, ống chữ T, ống lọc cặn | Kenney Industrial Piping 2D Pack |
| **26** | **Tìm Điểm Khác Biệt** | Quan sát chi tiết | So sánh 2 bức tranh $\rightarrow$ Nhấp vào 5 điểm sai khác trước giờ | Kính lúp gợi ý, thêm 30 giây thời gian | Kenney Illustrated Vector Spot Puzzles |
| **27** | **Đặt Bom (Bomberman)** | Hành động mê cung | Đặt bom $\rightarrow$ Chờ 3s nổ chữ thập $\rightarrow$ Phá gạch $\rightarrow$ Tiêu diệt quái | Tăng tầm nổ, tăng số bom, giày chạy nhanh, đá bom | Kenney Pixel Urban / Dungeon Bomb Pack |
| **28** | **Bắn Xe Tăng 1990 (Battle City)** | Chiến thuật 2D | Điều khiển xe tăng $\rightarrow$ Bắn đạn $\rightarrow$ Bảo vệ đại bàng/căn cứ | Khiên bất tử, đồng hồ đóng băng, xẻng bọc thép căn cứ | Kenney Top-Down Tanks Pack (CC0) |
| **29** | **Rắn Săn Mồi (Snake)** | Điều hướng ma trận | Di chuyển rắn $\rightarrow$ Ăn mồi $\rightarrow$ Dài thêm 1 đốt $\rightarrow$ Tránh cắn đuôi | Táo vàng nhân 3 điểm, nấm làm chậm tốc độ | Kenney Snake & Food Minimal 2D |
| **30** | **Pac-Man (Mê Cung Ăn Đậu)** | Điều hướng mê cung | Ăn hết hạt đậu $\rightarrow$ Ăn hạt sức mạnh $\rightarrow$ Ăn ma đuổi theo | Hạt năng lượng biến hình, trái cây thưởng điểm | Kenney Maze & Retro Ghosts Assets |
| **31** | **Bắn Ruồi (Space Invaders)** | Bắn súng cuộn dọc | Trượt ngang đáy màn hình $\rightarrow$ Bắn đàn quái vật đang hạ thấp | Đạn đôi, khiên phòng hộ, vệ tinh hỗ trợ | Kenney Space Shooter 2D Redux (CC0) |
| **32** | **Phá Gạch (DX-Ball / Breakout)** | Phản xạ phản hồi | Thanh đỡ hứng bóng $\rightarrow$ Phá vỡ từng viên gạch đa màu | Thanh dài gấp đôi, đạn bắn súng laze, đa bóng | Kenney Breakout Deluxe Vector Pack |
| **33** | **Mario Nhảy Bục (Platformer)** | Nhảy bục cuộn ngang | Chạy, nhảy $\rightarrow$ Dẫm quái $\rightarrow$ Đập khối gạch $\rightarrow$ Về đích cờ | Nấm tăng kích thước, sao bất tử, hoa lửa | Kenney Platformer Art Complete Pack |
| **34** | **Lửa & Nước (Co-op Platform)** | Giải đố hai người | Nước qua đầm xanh, Lửa qua hồ đỏ $\rightarrow$ Gạt cần $\rightarrow$ Về cửa | Kim cương đỏ, kim cương xanh, nút ấn trọng lực | Kenney Abstract Dual Character Pack |
| **35** | **Đập Chuột Chũi (Whac-A-Mole)** | Phản xạ nhấp chuột | Chuột thò đầu lên từ 9 lỗ $\rightarrow$ Đập nhanh trước khi thụt xuống | Búa vàng nhân điểm, tránh đập phải bom đầu lâu | Kenney Carnival / Whac-A-Mole Set |
| **36** | **Flappy Bird** | Căn thời gian nhịp điệu | Chạm để đập cánh bay lên $\rightarrow$ Lực hấp dẫn kéo xuống $\rightarrow$ Né ống | Huy chương đồng, bạc, vàng, bạch kim | Kenney Tappy Plane / Flappy Flying Pack |
| **37** | **Người Tuyết (Snow Bros)** | Hành động tầng | Lăn cầu tuyết $\rightarrow$ Đẩy cầu tuyết đè quái vật trên tầng | Thuốc đỏ chạy nhanh, thuốc xanh bắn xa, thuốc vàng | Kenney Platformer Winter Snow Set |
| **38** | **Đua Xe 2D Né Chướng Ngại** | Phản xạ cuộn dọc | Lái xe lách làn đường $\rightarrow$ Tránh xe tải, vũng dầu $\rightarrow$ Về đích | Bình Nitro tăng tốc, cờ lê sửa chữa xe, nam châm | Kenney 2D Top-Down Racing Pack |
| **39** | **Cờ Caro (Gomoku)** | Bàn cờ chiến thuật | Đặt quân X/O trên lưới $15 \times 15$ $\rightarrow$ Tạo chuỗi 5 ô liên tiếp | Hoàn tác nước đi (Undo), hiển thị nước đi gợi ý | Kenney Chess & Board Games Tiles |
| **40** | **Cờ Tướng Thế (Xiangqi)** | Bàn cờ chiến thuật | Giải các thế cờ tàn cuộc kinh điển trong 3-5 nước | Nút giải đáp thế cờ, gợi ý nước đi tối ưu | Kenney Traditional Oriental Chess Icons |
| **41** | **Cờ Vua Đơn Giản (Mini Chess)** | Bàn cờ chiến lược | Chơi cờ vua với AI Engine cấp độ nhẹ (MiniMax Alpha-Beta) | Phân tích giá trị quân cờ, hiển thị nước đi an toàn | Kenney Board Game Chess Pieces (CC0) |
| **42** | **Xếp Bài Nhện (Spider Solitaire)** | Sắp xếp bài logic | Xếp bài cùng chất từ K xuống A $\rightarrow$ Thu bài đủ bộ 13 lá | Gợi ý nước đi, chia thêm hàng bài mới | Kenney Playing Cards Vector Assets |
| **43** | **Xếp Bài FreeCell** | Giải đố bài mở | Sử dụng 4 ô nhớ tạm (Free cells) để dịch chuyển chuỗi bài | Nút Undo không giới hạn, kiểm tra bàn cờ tự động | Kenney Complete Deck Solitaire Set |
| **44** | **Đánh Bài Đổi Màu (Uno)** | Thẻ bài tương tác | Đánh trùng màu hoặc trùng số $\rightarrow$ Thẻ chức năng đổi chiều | Thẻ +2, Thẻ +4 đổi màu, Thẻ cấm lượt, Thẻ đảo chiều | Kenney Cards Deck & Action Symbols |
| **45** | **Trực Thăng Bắn Súng (Heli 2D)** | Bắn súng cuộn ngang | Điều khiển trực thăng né tên lửa $\rightarrow$ Tiêu diệt mục tiêu mặt đất | Tên lửa tầm nhiệt, súng máy 6 nòng, lá chắn giáp | Kenney Retro Aircraft & Explosion Pack |
| **46** | **Thủ Thành Mini (Tower Defense)** | Chiến thuật vị trí | Xây tháp canh ven đường đi $\rightarrow$ Tiêu diệt các đợt quái vật | Tháp bắn tỉa, tháp làm chậm băng, tháp pháo cối | Kenney Tower Defense Top-Down Pack |
| **47** | **Chém Hoa Quả (Fruit Slice)** | Tương tác vuốt chạm | Quẹt chuột/tay chém đứt hoa quả bay lên $\rightarrow$ Tránh chém trúng bom | Chuối làm chậm thời gian, chuối x2 điểm, lựu nổ dồn | Kenney Fruit Slice 2D Vector Sprites |
| **48** | **Phím Nhạc Rơi (Piano Tiles)** | Tiết tấu âm nhạc | Nhấp các phím đen trượt xuống theo nhịp điệu $\rightarrow$ Không nhấp phím trắng | Phím kéo dài ngân nga, nhân chuỗi combo nhịp | Kenney Monospaced Rhythms & Audio FX |
| **49** | **Ném Bóng Nước (Water Balloon)** | Đối kháng góc nhìn trên | Căn góc và lực ném bóng nước $\rightarrow$ Đánh gục đối thủ sau chướng ngại | Bóng nước cỡ đại, khiên dù che chắn, giày bơi | Kenney Summer Sports & Water Particles |
| **50** | **Chạy Vô Tận (2D Runner)** | Cuộn màn hình vô tận | Tự động chạy $\rightarrow$ Nhảy né rào cản, trượt dưới gầm $\rightarrow$ Ăn tiền | Nam châm hút xu, giày nhảy đôi, phản lực phản hồi | Kenney City Urban 2D Endless Assets |

---

## NHÓM CƠ CHẾ CÓ THỂ TÁI SỬ DỤNG — KHÔNG PHẢI CAM KẾT ENGINE HAY NGHIỆM THU

Các nhóm dưới đây là cách phân loại ý tưởng kiến trúc trong bản đặc tả. Chúng không mô tả chính xác kiến trúc repo hiện tại, không có nghĩa một engine đã được triển khai, và không chứng minh game khác nhau có luật riêng. Giữ router/session vanilla hiện hữu; chỉ dùng chung code khi hành vi thực sự trùng nhau. Mỗi game vẫn cần hồ sơ tham chiếu, logic đúng luật trong phạm vi, và nghiệm thu riêng theo [guideline](./GAME_DEVELOPMENT_GUIDELINES.md).

```mermaid
flowchart TD
    subgraph Engine1["1. Time-Management & Queue Engine"]
        E1_Desc["Dùng cho Game: 01 - 08 (Hàng Rong, Diner Dash...)"]
        E1_Core["- Hàng chờ khách FIFO\n- Bộ đếm kiên nhẫn (Patience Decay)\n- Công thức kinh tế: Doanh thu, Lãng phí, Phí"]
    end

    subgraph Engine2["2. Grid & Match-3 Logic Engine"]
        E2_Desc["Dùng cho Game: 17 - 26, 39 - 44 (Line 98, Kim Cương, Cờ Caro...)"]
        E2_Core["- Ma trận 2 chiều Grid[x][y]\n- Thuật toán tìm kiếm theo chiều sâu/rộng (BFS/DFS)\n- Thuật toán tìm đường đi A-Star (Pathfinding)"]
    end

    subgraph Engine3["3. 2D Physics & Trajectory Engine"]
        E3_Desc["Dùng cho Game: 09 - 16, 45 - 50 (Đào Vàng, Gunny, Đua xe...)"]
        E3_Core["- Con lắc dao động điều hòa Harmonic Oscillator\n- Phương trình ném xiên: x = v0.cos.t, y = v0.sin.t - 0.5gt^2\n- Kiểm tra va chạm vòng tròn (Circle Collision) & Hộp (AABB)"]
    end

    subgraph Engine4["4. Tilemap Arcade & Patrol Engine"]
        E4_Desc["Dùng cho Game: 27 - 38 (Đặt Bom, Xe Tăng 1990, Pac-Man, Mario...)"]
        E4_Core["- Bản đồ ô gạch Tilemap Grid\n- Máy trạng thái AI tuần tra cơ bản (Patrol, Chase, Flee)\n- Hệ thống bom nổ và lan tỏa sóng chữ thập"]
    end
```

---

## ĐẦU MỐI TÌM ASSET — CẦN XÁC MINH THEO FILE

Các liên kết sau chỉ là nơi để bắt đầu nghiên cứu. Tài liệu này chưa kiểm tra phiên bản tải, từng file, điều khoản hiện hành, quyền bên thứ ba, hoặc attribution; vì vậy không được coi đây là danh sách asset đã duyệt. Trước khi dùng bất kỳ file nào, xác minh license/permission của chính file đó và ghi provenance trong `assets/ASSET_MANIFEST.json`. Tự vẽ hình học mới trong code cũng phải được ghi nhận là artwork nguyên bản của dự án, không mượn screenshot hoặc sprite tham chiếu.

1. **Kenney Game Assets (Thư viện toàn diện nhất):**
   * *Kenney Food Kit & Restaurant:* [https://kenney.nl/assets/food-kit](https://kenney.nl/assets/food-kit) (Phục vụ nhóm game Quản lý quầy ăn, Hàng Rong, Ca Phố).
   * *Kenney Platformer Complete:* [https://kenney.nl/assets/platformer-art-complete-pack](https://kenney.nl/assets/platformer-art-complete-pack) (Phục vụ Mario, Lửa Nước, Người Tuyết).
   * *Kenney Top-Down Tanks & City:* [https://kenney.nl/assets/top-down-tanks](https://kenney.nl/assets/top-down-tanks) (Phục vụ Bắn Xe Tăng 1990, Đua xe 2D).
   * *Kenney Puzzle & Gem Match:* [https://kenney.nl/assets/puzzle-pack](https://kenney.nl/assets/puzzle-pack) (Phục vụ Kim Cương, Line 98, Bắn Trứng).
   * *Kenney Sound Effects (Audio Packs):* kiểm tra trang pack và license cho bản tải/file cụ thể trước khi nhập.
2. **OpenGameArt.org (Cộng đồng đồ họa độc lập):** kiểm tra license và attribution của từng tác giả/file; các license trong kho có thể khác nhau.

---
*Tài liệu này là danh sách gợi ý và không thay cho profile, kiểm chứng quyền, implementation hoặc QA từng game.*
