# NewPlayground • Một Chỗ Để Chơi. Không Cần Cài Gì.

> **Tuyển tập game web hoài niệm, đời thường, chạy trên trình duyệt và đám mây.**
> *Slogan: Play a little. Feel a little happier.*

[![GitHub Pages](https://img.shields.io/badge/Live-GitHub%20Pages-brightgreen?logo=github)](https://daichunghy.github.io/newplayground/)
[![Zero Dependencies](https://img.shields.io/badge/Dependencies-Zero%20(Pure%20Vanilla%20JS)-blue)]()
[![Typography](https://img.shields.io/badge/Font-Calibri%20Standard-informational)]()
[![License](https://img.shields.io/badge/License-MIT%20%2B%20CC0-orange)]()

---

## 1. Giới thiệu dự án

**NewPlayground** là nền tảng game web thuần máy khách (Client-First), không cần tải app, không quảng cáo che khuất, không bắt đăng nhập, và không yêu cầu cài đặt bất kỳ môi trường phụ thuộc nào. Toàn bộ trải nghiệm được đóng gói sẵn để chạy trực tiếp trên đám mây (GitHub Pages, Codespaces, Codex cloud sandbox) hoặc máy cá nhân chỉ trong 1 click.

### 4 Nguyên tắc cốt lõi:
1. **Client-First & Zero-Friction:** Chơi ngay trên trình duyệt máy tính và điện thoại. Mục tiêu tải nhẹ; preflight đo kích thước nguồn/tài sản, thời gian tải cần đo trên thiết bị.
2. **Headless & Modular Simulation:** Hướng cải thiện: tách luật chơi khỏi tầng vẽ, chuẩn hóa timing/input và đo độ mượt trên thiết bị.
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
│   ├── game-registry.js     # ID chính xác → launcher; phân biệt prototype và planned
│   ├── game-session.js      # Quản lý RAF/timer/global listener và cleanup
│   ├── release-preflight.mjs # Rà dữ liệu/cú pháp và chuẩn bị artifact site
│   ├── engines.js           # Các engine game đời thường (Ca Phố, Kẹt Xe, Cà Phê,...)
│   ├── engines-classics.js  # Các engine game kinh điển (Xếp gạch, Cờ tướng, Caro,...)
│   ├── engines-popcap.js    # Các engine game arcade (Zuma, Bắn trứng, Kim cương,...)
│   ├── engines-retro50.js   # Tuyển tập engine retro 50 tựa game
│   ├── game-feel.js         # Hiệu ứng rung lắc, hạt nổ (particles), âm thanh hồi đáp
│   └── download_game_assets.py # Bộ công cụ tải asset CC0 portable
├── assets/                  # Âm thanh Web Audio (.ogg), sprite đồ họa CC0, ảnh bìa
├── docs/                    # Đặc tả 150 game, nghiên cứu thị trường và lộ trình 500 game
├── AGENTS.md                # Hướng dẫn chi tiết dành riêng cho AI Coding Agents (Codex)
└── .github/workflows/       # Tự động hóa deploy lên GitHub Pages
```

---

## 5. Chiến lược và chuẩn bị vận hành

Hiện có **150 mục catalog, 56 launcher riêng và 94 mục chưa có launcher riêng**. Các launcher là bản thử nghiệm; chưa có chứng nhận replica hoàn chỉnh hoặc số đo FPS/input latency. Mục tiêu dài hạn là 500 game hoàn chỉnh theo phiên bản tham chiếu đã chốt.

- [Chiến lược sản xuất/vận hành](./docs/GAME_OPERATING_STRATEGY.md): thứ tự P1A → P1B → P1C → danh mục còn lại → 500.
- [Runbook](./docs/GAME_OPERATIONS_RUNBOOK.md): nguồn dữ liệu, chuẩn bị release, sự cố và rollback.
- [Bàn giao và mức sẵn sàng hiện tại](./docs/OPERATIONAL_READINESS.md).
- [Inventory 150 game](./data/game-operations.json) và [backlog có thứ tự](./docs/GAME_RESEARCH_BACKLOG.csv).
- [12 hồ sơ pilot](./docs/game-profiles/) và [template nghiệm thu](./docs/GAME_PROFILE_TEMPLATE.md).
- [Asset register 183 file](./docs/ASSET_OPERATIONS_REGISTER.csv): 137 có manifest, 46 còn thiếu hồ sơ.
- [Kiến trúc trong mã](./docs/ARCHITECTURE.md) và [hợp đồng telemetry đề xuất](./docs/TELEMETRY_CONTRACT.md).

```bash
python3 scripts/sync_game_operations.py
node scripts/release-preflight.mjs --prepare
python3 -m http.server 8080 --directory .pages-site
```

Preflight rà tính nhất quán/cú pháp và đóng gói site; gameplay/thiết bị cần nghiệm thu riêng. Workflow chạy kiểm tra tĩnh trên PR, deploy trên main/manual. Đợt chuẩn bị hiện tại chưa push/deploy live.

## 6. Dành cho Codex & AI Agents

### Kiểm tra hồi quy luồng mở/đóng game

Chạy bằng Node.js 18 trở lên, không cần cài thêm thư viện:

```bash
node --test tests/game-flow.test.cjs
```

Bộ kiểm tra chạy mã nguồn thật với DOM/Canvas/âm thanh giả lập: định tuyến một engine mỗi lần mở,
định tuyến ID chính xác, giữ game chưa có launcher ở trạng thái đang phát triển, đóng/mở lại/chuyển game, hủy timer và vòng lặp, dọn phím điều khiển, tương thích rung,
và xử lý khởi tạo thất bại. Đây không phải kiểm tra hình ảnh trên trình duyệt hay xác nhận toàn bộ gameplay.

Vui lòng tham khảo file [`AGENTS.md`](./AGENTS.md) để nắm rõ:
- Cơ chế khởi tạo vòng lặp game (`requestAnimationFrame` + delta-time).
- Cơ chế âm thanh dự phòng (Web Audio Procedural Synthesizer fallback).
- Quy chuẩn font chữ `Calibri` và kích thước cảm ứng trên di động (≥ 44px).
- Nghiên cứu thị trường web game và lộ trình 150 → 500: [WEB_GAME_MARKET_AND_500_ROADMAP.md](./docs/WEB_GAME_MARKET_AND_500_ROADMAP.md).
- Backlog nghiên cứu theo từng game: [GAME_RESEARCH_BACKLOG.csv](./docs/GAME_RESEARCH_BACKLOG.csv).

---

## 7. Bản quyền & Tài nguyên

- Mã nguồn: Giấy phép [MIT License](./LICENSE).
- Tài nguyên gồm Kenney assets và ảnh minh họa; cần rà quyền/nguồn từng file trước release, không suy ra toàn bộ assets có chung license. Manifest hiện tại ở [`assets/ASSET_MANIFEST.json`](./assets/ASSET_MANIFEST.json).

### Dò Mìn: bản ứng viên ms1

Bản cải thiện cục bộ có 3 preset cổ điển + bàn bỏ túi, mô hình luật riêng, keyboard/touch, pause/resume và lưu ván. Xem [hồ sơ nghiên cứu và QA](docs/games/MINESWEEPER_RESEARCH_AND_QA.md). Chưa nghiệm thu browser/device; không tính là một game hoàn chỉnh.

Chạy toàn bộ kiểm tra không phụ thuộc thư viện:

```bash
node --test tests/*.test.cjs
node scripts/release-preflight.mjs --prepare
```

Suite dùng model thật và DOM/Canvas double; không thay thế visual hoặc thiết bị QA.
