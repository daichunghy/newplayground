# Plants vs. Zombies PC 2009; không dùng thông số PvZ2/3

ID: `plants-vs-zombies-2d` · Thứ tự pilot: 11 · Cập nhật: 2026-10-07

**Trạng thái: hồ sơ nghiên cứu một phần; chưa nghiệm thu replica hoàn chỉnh.**

## Hiện trạng từ mã nguồn

Nguồn hiện có: wave, lane, cây và mặt trời; spawn mặt trời có nhánh xác suất theo lượt update.

Mã nguồn: `scripts/engines-classics.js`. Chưa có đo lường trên thiết bị hoặc playthrough đối thủ.

## Các việc phải hoàn thiện

- **Luật:** Chuẩn hóa sun economy, seed cooldown, projectile/collision, armor, plant/zombie counters, wave schedule và lawn mower.
- **Phím và độ nhạy:** Chọn seed/tap ô/tap sun; tọa độ CSS-canvas thống nhất; shovel/cancel dễ tìm; không spawn/tick theo FPS.
- **Tiến trình và vật phẩm:** Ma trận day/night/pool/fog/roof, seed inventory và mở khóa theo level; ghi riêng những nhóm chưa triển khai.
- **Hình ảnh và cảm giác chơi:** Silhouette mỗi vai trò khác nhau; projectile và damaged-state rõ; screenshake không làm khó đặt cây.

## Nghiệm thu đề xuất

Cùng seed/time-step cho cùng wave; đổi refresh rate không đổi kinh tế; hết wave thắng, breach thua và retry cùng luật.

Ngoài ra phải đạt các cổng chung trong `docs/GAME_PROFILE_TEMPLATE.md`. Chi phí và lịch chưa chốt.

## Nguồn cần đối chiếu

- [https://akamai.cdn.ea.com/eadownloads/u/f/manuals/GAME-PVZ/en_US_readme.html](https://akamai.cdn.ea.com/eadownloads/u/f/manuals/GAME-PVZ/en_US_readme.html)

Trang giới thiệu xác định tựa/phiên bản; manual và playthrough mới xác nhận chi tiết. Nếu tham khảo phần tiếp theo/mobile, ghi rõ khác biệt với phiên bản mục tiêu. URL không đồng nghĩa với quyền dùng mã, tên, ảnh hoặc âm thanh.
