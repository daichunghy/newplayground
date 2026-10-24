# NewPlayground • Một Chỗ Để Chơi. Không Cần Cài Gì.

> **Tuyển tập game web hoài niệm, đời thường, chạy 100% trên trình duyệt và đám mây.**  
> *Slogan: Play a little. Feel a little happier.*

[![GitHub Pages](https://img.shields.io/badge/Live-GitHub%20Pages-brightgreen?logo=github)](https://daichunghy.github.io/newplayground/)
[![Zero Dependencies](https://img.shields.io/badge/Dependencies-Zero%20(Pure%20Vanilla%20JS)-blue)]()
[![Typography](https://img.shields.io/badge/Font-Calibri%20Standard-informational)]()
[![License](https://img.shields.io/badge/License-MIT%20%2B%20CC0-orange)]()

---

## 1. Giới thiệu dự án

**NewPlayground** là nền tảng game web thuần máy khách (Client-First), không cần tải app, không quảng cáo che khuất, không bắt đăng nhập, và không yêu cầu cài đặt bất kỳ môi trường phụ thuộc nào. Toàn bộ trải nghiệm được đóng gói sẵn để chạy trực tiếp trên đám mây (GitHub Pages, Codespaces, Codex cloud sandbox) hoặc máy cá nhân chỉ trong 1 click.

### 4 Nguyên tắc cốt lõi:
1. **Client-First & Zero-Friction:** Chơi ngay trên trình duyệt máy tính và điện thoại. Tải siêu tốc (< 20 MB toàn bộ tài nguyên, ~1 MB code).
2. **Headless & Modular Simulation:** Lõi mô phỏng và luật chơi tách biệt khỏi tầng vẽ (Canvas / DOM), mượt mà ở tần số quét 60 FPS.
3. **Calibri Typography Standard:** Toàn bộ văn bản, giao diện HUD, menu và tài liệu tuân thủ quy chuẩn font chữ **Calibri** sang trọng, hiện đại, thoáng mắt và không lỗi dấu tiếng Việt trên mọi hệ điều hành.
4. **Cloud & AI-Agent Ready:** Mã nguồn mở, cấu trúc chuẩn hóa, tài liệu [`AGENTS.md`](./AGENTS.md) giúp OpenAI Codex, GitHub Copilot, và các AI coding agents có thể đọc hiểu và mở rộng tức thì.

---

## 2. Trải nghiệm trực tiếp trên Cloud

Dự án được triển khai tự động qua GitHub Actions lên GitHub Pages:
🔗 **Chơi ngay tại:** **[https://daichunghy.github.io/newplayground/](https://daichunghy.github.io/newplayground/)**

---

## 3. Chạy cục bộ hoặc trong Sandbox Cloud

Vì NewPlayground sử dụng Vanilla HTML5/CSS/JavaScript thuần, bạn không cần chạy `npm install` hay build phức tạp.

### Cách 1: Sử dụng Python (khuyên dùng)
```bash
python3 -m http.server 8080
```
Mở trình duyệt tại `http://localhost:8080`.

### Cách 2: Sử dụng Node.js
```bash
npx serve . -p 8080
```

### Cách 3: Chạy trên GitHub Codespaces / Codex Cloud Sandbox
Chỉ cần mở repository trên GitHub và nhấn **Codespaces -> Create codespace on main**. Hệ thống sẽ tự động khởi tạo môi trường và mở cổng web preview.

---

## 4. Cấu trúc thư mục

```text
├── index.html               # Khung ứng dụng chính, thanh HUD, modal chọn game
├── style.css                # Giao diện responsive, design tokens, quy chuẩn font Calibri
├── app.js                   # Điều khiển trung tâm, điều hướng và quản lý trạng thái
├── games-data.js            # Danh mục dữ liệu của các trò chơi
├── data/
│   └── games.json           # Dữ liệu game dạng JSON
├── scripts/
│   ├── engines.js           # Các engine game đời thường (Ca Phố, Kẹt Xe, Cà Phê,...)
│   ├── engines-classics.js  # Các engine game kinh điển (Xếp gạch, Cờ tướng, Caro,...)
│   ├── engines-popcap.js    # Các engine game arcade (Zuma, Bắn trứng, Kim cương,...)
│   ├── engines-retro50.js   # Tuyển tập engine retro 50 tựa game
│   ├── game-feel.js         # Hiệu ứng rung lắc, hạt nổ (particles), âm thanh hồi đáp
│   └── download_game_assets.py # Bộ công cụ tải asset CC0 portable
├── assets/                  # Âm thanh Web Audio (.ogg), sprite đồ họa CC0, ảnh bìa
├── docs/                    # Tài liệu kiến trúc và đặc tả chi tiết 100 game
├── AGENTS.md                # Hướng dẫn chi tiết dành riêng cho AI Coding Agents (Codex)
└── .github/workflows/       # Tự động hóa deploy lên GitHub Pages
```

---

## 5. Dành cho Codex & AI Agents

### Kiểm tra hồi quy luồng mở/đóng game

Chạy bằng Node.js 18 trở lên, không cần cài thêm thư viện:

```bash
node --test tests/*.test.cjs
```

Bộ kiểm tra chạy mã nguồn thật với DOM/Canvas/âm thanh giả lập: định tuyến một engine mỗi lần mở,
ưu tiên Retro50, đóng/mở lại/chuyển game, hủy timer và vòng lặp, dọn phím điều khiển, tương thích rung,
và xử lý khởi tạo thất bại. Đây không phải kiểm tra hình ảnh trên trình duyệt hay xác nhận toàn bộ gameplay.

Vui lòng tham khảo file [`AGENTS.md`](./AGENTS.md) để nắm rõ:
- Cơ chế khởi tạo vòng lặp game (`requestAnimationFrame` + delta-time).
- Cơ chế âm thanh dự phòng (Web Audio Procedural Synthesizer fallback).
- Quy chuẩn font chữ `Calibri` và kích thước cảm ứng trên di động (≥ 44px).

---

### Kiểm toán bản gốc và game Flash quốc tế (24/10/2026)

Danh mục hiện có **140 game**. Đã loại **20 mục** thiếu tựa game điện tử gốc xác định được (gồm 5 game mô phỏng do dự án vừa tự tạo), thêm **5 trò Flash có xuất xứ thật**: **The World's Hardest Game (2007)**, **QWOP (2008)**, **Helicopter Game (2002)**, **Desktop Tower Defense (2007)** và **Red Ball (Flash)**. Mỗi trò mới có cơ chế và đồ họa riêng bằng Canvas 2D, không sử dụng tài nguyên có bản quyền của nhà phát triển gốc.

**Lưu ý:** tên game có thật không có nghĩa rằng bản trên website đã tái tạo trung thành. Nhiều mục cũ vẫn chạy engine chung theo thể loại và chưa đúng luật của trò gốc. Xem [báo cáo kiểm toán và toàn bộ ma trận game](./docs/GAME_ORIGIN_AUDIT_2026_10_24.md).

### Cải thiện toàn bộ danh mục (20/10/2026)

- Thanh điều khiển chung cho 150 mục: tạm dừng, tiếp tục, chơi lại/mở lại và hướng dẫn theo game thực sự đang chạy. Đổi tab hoặc rời cửa sổ tự tạm dừng; quay lại cần bấm Tiếp tục.
- Session giữ thời gian còn lại của timer, dừng RAF, nhả phím/chạm đang giữ và loại thời gian nghỉ khỏi đồng hồ gameplay. Không thay đổi thời gian thực dùng cho cây trồng.
- Các vòng arcade cũ chuyển sang simulation 60 Hz độc lập tần số render; đây là thay đổi về tốc độ gameplay, không phải cam kết mọi thiết bị đạt 60 FPS.
- Sửa các lỗi qua màn/kết thúc, va chạm, thao tác cảm ứng, chọn màu/lượt AI UNO, di chuyển Pac-Man, Bloxorz và các cơ chế riêng trong từng nhóm.
- Cả 7 chế độ arcade dùng chung được sửa và có hình ảnh theo thể loại; ghép cặp dùng ô nút thật để dễ chạm và điều khiển bằng bàn phím.
- Canvas giữ tỉ lệ và lấy giới hạn chiều cao từ viewport để không nhỏ dần khi modal tự co giãn; các thông báo resize được gộp và hủy khi đóng game. Nút chung đủ 44 px, có focus rõ và tôn trọng chế độ giảm chuyển động.
- Danh mục hiện có **150 mục: 65 mục dùng engine chuyên biệt/biến thể, 85 mục dùng 7 chế độ arcade theo thể loại**. Đợt sửa này không biến 150 tên trong danh mục thành 150 bản tái hiện độc lập của game gốc.

Chạy tất cả kiểm tra hồi quy:

```bash
node --test tests/*.test.cjs
```

Chạy kiểm tra trên trình duyệt bằng cách mở [`tests/browser-smoke.html`](./tests/browser-smoke.html) trên cùng máy chủ HTTP. Bộ kiểm tra mở/vẽ/tạm dừng/hướng dẫn/tiếp tục/đóng 150 mục ở hai khung desktop và mobile; không thay thế việc chơi hết chiến dịch hay kiểm tra phần cứng thật.

Chi tiết phạm vi và bằng chứng kiểm tra trong [báo cáo cải thiện 20/10](./docs/GAMEPLAY_IMPROVEMENTS_2026_10_20.md).

### Gameplay và cảm giác điều khiển Arcade (11/10/2026)

- **Boom Online** được bổ sung giao diện arcade gọn, nhân vật/sân chơi/vật phẩm vẽ trực tiếp thay emoji, D-pad thống nhất touch/pointer, va chạm theo hitbox nhân vật và simulation 60Hz. Trùm không còn bị trừ máu lặp bởi cùng một vụ nổ; có kết thúc thắng/thua, nút chơi lại và kỷ lục.
- **Bắn Trứng** được giảm chữ hướng dẫn, hợp nhất mouse/touch/pen bằng Pointer Events, thêm nút bắn và bộ đệm sprite trứng vẽ sẵn. Màu trứng ngẫu nhiên ưu tiên màu còn có trên bàn và lưu kỷ lục an toàn hơn.
- Test hồi quy kiểm tra luồng game, các tình huống boss/collision/pointer và tính nhất quán 60Hz/120Hz bằng mock, không phải benchmark FPS thực trên thiết bị.
- Chi tiết và danh sách QA còn thiếu ở [báo cáo Arcade Feel](./docs/ARCADE_FEEL_AUDIT.md).

### Nâng cấp đồ họa game, điều khiển và độ dễ đọc (10/10/2026)

Bốn engine được rà soát và thiết kế lại với mục tiêu ưu tiên hình ảnh thay emoji và khối chữ dày. **Hàng Rong** có hình món ăn nhất quán và bếp cập nhật tiến độ trực tiếp thay vì dựng lại nút liên tục. **Nông Trại** có luống đất, cây trồng và dụng cụ vẽ vector. **Pikachu Nối Hình** có 16 nhân vật minh họa trong ô, không dùng emoji kèm tên viết tắt, có chức năng phóng to trên điện thoại. **Diner Dash** có hướng dẫn ngắn và cảnh chơi bớt nhiễu.

Nét vẽ được lưu trong [`scripts/game-art.js`](./scripts/game-art.js), không dùng CDN, Web font, hay hình ảnh ngoài. Xem [báo cáo đánh giá đồ họa và các giới hạn QA](./docs/VISUAL_GAME_AUDIT.md). Đây là cải thiện bốn game trọng điểm, **không phải chứng nhận tất cả 150 game đã hoàn chỉnh đồ họa**.

### Trạng thái đầy đủ của gameplay (cập nhật 10/10/2026)

- Danh mục hiện có 150 mục, nhưng không phải tất cả đều có cơ chế riêng đúng luật trò chơi gốc.
- 86 mục đang sử dụng `scripts/engines-archetypes.js`, gồm 7 chế độ có thể chơi, thử thách tăng dần, điều khiển cảm ứng, tạm dừng và chơi lại. Đây là gameplay **theo thể loại**, không phải bản tái hiện đầy đủ của từng tựa.
- Các engine riêng có cơ chế và số màn khác nhau. Việc kiểm tra mở/đóng 150 game không thay thế kiểm thử toàn bộ hành trình chơi.
- Xem [ma trận kiểm kê gameplay](./docs/GAMEPLAY_COMPLETENESS_AUDIT.md) để phân biệt các mức hoàn thiện và kế hoạch QA.
- CI trên `main` chạy kiểm tra cú pháp và bộ test hồi quy, bắt buộc qua test trước khi deploy.

## 6. Bản quyền & Tài nguyên

- Mã nguồn: Giấy phép [MIT License](./LICENSE).
- Tài nguyên đồ họa & âm thanh: Được xây dựng từ Kenney Game Assets chuẩn **CC0 1.0 Universal (Public Domain)** và ảnh minh họa tự sáng tạo. Chi tiết ghi nhận tại [`assets/ASSET_MANIFEST.json`](./assets/ASSET_MANIFEST.json).
