# Kiến trúc hiện tại — NewPlayground

Cập nhật 07/10/2026. Đây là kiến trúc trong mã nguồn. Đề xuất TypeScript/Phaser/monorepo trước đây được lưu ở `ARCHITECTURE_PROPOSAL_V1.md`; chưa triển khai và không phải yêu cầu bắt buộc cho lộ trình 500.

## Stack và luồng tải

HTML, CSS, vanilla JavaScript, Canvas 2D/DOM và Web Audio; không có build framework hay backend bắt buộc. Thứ tự index: catalog nhúng → session manager → registry → game feel → engine packs → app.

- `app.js` fetch `data/games.json`, fallback `games-data.js`; dựng catalog/search/favorites và modal.
- `NP_GameRegistry` nhận đúng ID và gọi một launcher từ `NP_Engines`; ID không có launcher hiện đang phát triển.
- `app.js` dừng session cũ rồi gọi registry; mỗi launcher khởi tạo owner qua `NP_GameSession.start()`, lỗi launch sẽ dọn tài nguyên trước khi báo UI.
- Khi đóng, session chạy cleanup hook, hủy RAF/timeout/interval và bỏ listener được quản lý; app dừng BGM rồi bỏ DOM game.
- Các pack engine vẫn tải eager. Lazy-load theo game/họ game là việc tiếp theo sau đo baseline.

## Quyền sở hữu tài nguyên

Engine destructure scheduling và lifecycle API từ `NP_GameSession`. Global listener dùng `on/off`; DOM listener local mất theo DOM khi modal được dọn. Callback hẹn giờ được vô hiệu khi session dừng. Game feel dùng runtime scheduling khi có session; hiệu ứng portal giữ scheduling native.

Timer và RAF có namespace riêng trong resource map. Timeout/RAF bỏ handle sau khi chạy; interval tồn tại đến cancel/stop. Legacy cleanup hook được null trước khi gọi để tránh gọi lại khi session sau mở.

API này chưa tự quản lý fetch/Promise, worker, socket, media hoặc AudioContext node riêng. Các engine mới có những tài nguyên đó phải thêm ownership/abort/close. Pause/resume tab và held-key reset cũng cần engine policy; cleanup khi đóng không thay thế pause.

`onCleanup(callback)` đăng ký cleanup bổ sung và trả hàm bỏ đăng ký; có thể dùng để abort fetch hoặc đóng worker/socket do engine sở hữu. Game feel dùng nó để phục hồi transform nếu rung màn hình bị ngắt khi đóng.

## Dữ liệu và save

- `data/games.json`: metadata; `games-data.js`: mirror cho fallback.
- `scripts/game-registry.js`: nguồn ánh xạ ID/launcher.
- `data/game-pilot-plans.json`: hồ sơ 12 pilot có công việc/nguồn/acceptance.
- `data/game-operations.json` và CSV/profile markdown: sinh bằng `scripts/sync_game_operations.py`.
- Favorites/theme/mute/CRT và một số game dùng localStorage. Safe wrapper tránh storage bị chặn làm app chết; chưa có schema/migration thống nhất cho mọi game.
- Hàng Rong kiểm tra một phần save và sửa unlock theo bảng stage. Full save recovery vẫn cần hồ sơ/QA.

## Phân phối

`release-preflight.mjs` kiểm tra catalog/mirror/ID/registry/inventory/cú pháp/asset JSON và tạo `.pages-site`. CI chạy cho PR; push main/manual deploy artifact sau preflight. Artifact không chứa backlog/tài liệu/script nội bộ. Chưa có service worker hoặc đảm bảo offline sau lần tải đầu.

## Hướng mở rộng

Giữ registry và runtime nhỏ; tách simulation, input, level/item/economy data, renderer và storage theo game. Dùng common utilities khi luật thật sự chung. Engine hợp cho physics/3D/rhythm được chọn theo nhu cầu và đo tải, không đổi toàn portal chỉ để thêm framework.

Các hợp đồng nghiên cứu/chất lượng ở `GAME_PROFILE_TEMPLATE.md`; vận hành ở `GAME_OPERATIONS_RUNBOOK.md`; dữ liệu đề xuất ở `TELEMETRY_CONTRACT.md`.
