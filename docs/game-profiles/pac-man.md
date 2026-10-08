# Original NewPlayground Lối Sáng: finite three-stage maze chase, no licensed PAC-MAN parity claim

ID: `pac-man` · Thứ tự pilot: 6 · Cập nhật: 2026-10-08

**Trạng thái: hồ sơ nghiên cứu một phần; chưa nghiệm thu replica hoàn chỉnh.**

## Hiện trạng từ mã nguồn

Depth update: three connected authored mazes now pair with staged pursuit plans. The interceptor reads 2, 3, then 5 cells ahead, while the patrol window shortens from 5 to 4.5 to 4 seconds; shortest-detour and junction-profile tests keep each route's decisions distinct. Existing best/run saving, finite win/retry, controls and minimal presentation remain in place. Focused model and UI suites pass; see `docs/games/MAZE_CHASE_RESEARCH_AND_QA.md`.

Mã nguồn: `scripts/games/maze-chase-model.js + scripts/games/maze-chase.js`. Chưa có đo lường trên thiết bị hoặc playthrough đối thủ.

## Các việc phải hoàn thiện

- **Luật:** Original rules and AI roles documented; map connectivity and terminal progression tested. No original-game parity claim.
- **Phím và độ nhạy:** Keyboard, swipe, D-pad, mid-edge reversals and turn buffering implemented; physical touch feel pending.
- **Tiến trình và vật phẩm:** Three finite stages with power, return AI, bonus, lives and safe saved run; no setup/progression panels.
- **Hình ảnh và cảm giác chơi:** Original angular lantern/sentry Canvas art, original cover and short synth tones; minimal labels, optional compact help. Device/audio/contrast pending.

## Nghiệm thu đề xuất

Model/controller tests pass; natural full playthrough, browser/mobile/accessibility and rights framing remain gates.

Ngoài ra phải đạt các cổng chung trong `docs/GAME_PROFILE_TEMPLATE.md`. Chi phí và lịch chưa chốt.

## Nguồn cần đối chiếu

- [https://www.bandainamcoent.com/games/pac-man-museum-plus](https://www.bandainamcoent.com/games/pac-man-museum-plus)

Trang giới thiệu xác định tựa/phiên bản; manual và playthrough mới xác nhận chi tiết. Nếu tham khảo phần tiếp theo/mobile, ghi rõ khác biệt với phiên bản mục tiêu. URL không đồng nghĩa với quyền dùng mã, tên, ảnh hoặc âm thanh.
