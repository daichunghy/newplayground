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
node --test tests/game-flow.test.cjs
```

Bộ kiểm tra chạy mã nguồn thật với DOM/Canvas/âm thanh giả lập: định tuyến một engine mỗi lần mở,
ưu tiên Retro50, đóng/mở lại/chuyển game, hủy timer và vòng lặp, dọn phím điều khiển, tương thích rung,
và xử lý khởi tạo thất bại. Đây không phải kiểm tra hình ảnh trên trình duyệt hay xác nhận toàn bộ gameplay.

Vui lòng tham khảo file [`AGENTS.md`](./AGENTS.md) để nắm rõ:
- Cơ chế khởi tạo vòng lặp game (`requestAnimationFrame` + delta-time).
- Cơ chế âm thanh dự phòng (Web Audio Procedural Synthesizer fallback).
- Quy chuẩn font chữ `Calibri` và kích thước cảm ứng trên di động (≥ 44px).

---

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
