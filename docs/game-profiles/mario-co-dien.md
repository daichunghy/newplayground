# Super Mario Bros. NES 1985; danh mục nội dung đầy đủ cần lập tiếp

ID: `mario-co-dien` · Thứ tự pilot: 9 · Cập nhật: 2026-10-07

**Trạng thái: hồ sơ nghiên cứu một phần; chưa nghiệm thu replica hoàn chỉnh.**

## Hiện trạng từ mã nguồn

Nguồn hiện có: platformer chạy/nhảy; keydown và keyup thay đổi trạng thái nhảy; chưa chứng minh parity NES.

Mã nguồn: `scripts/engines-classics.js`. Chưa có đo lường trên thiết bị hoặc playthrough đối thủ.

## Các việc phải hoàn thiện

- **Luật:** Đặc tả gia tốc, chạy, nhảy theo giữ nút, trọng lực, collision, camera, pipe, enemy, checkpoint và world/level inventory.
- **Phím và độ nhạy:** Đo jump height/airtime/run-up/braking bằng video và frame-count; chỉ thêm coyote-time nếu chọn deviation có ghi nhận.
- **Tiến trình và vật phẩm:** Power-up state machine, coin/life, enemy interactions, end-level và checkpoint; backlog nội dung theo từng màn/boss.
- **Hình ảnh và cảm giác chơi:** Sprite đọc được ở native scale; art/camera parallax nhất quán; motion của nhân vật và camera không giật.

## Nghiệm thu đề xuất

Nhảy thấp/cao theo giữ nút; không xuyên nền; hitbox trạng thái đúng; có chuỗi màn và hồi sinh; parity chưa được chứng nhận.

Ngoài ra phải đạt các cổng chung trong `docs/GAME_PROFILE_TEMPLATE.md`. Chi phí và lịch chưa chốt.

## Nguồn cần đối chiếu

- [https://www.nintendo.com/en-gb/Games/NES/Super-Mario-Bros-803853.html](https://www.nintendo.com/en-gb/Games/NES/Super-Mario-Bros-803853.html)
- [https://mario.nintendo.com/history/](https://mario.nintendo.com/history/)

Trang giới thiệu xác định tựa/phiên bản; manual và playthrough mới xác nhận chi tiết. Nếu tham khảo phần tiếp theo/mobile, ghi rõ khác biệt với phiên bản mục tiêu. URL không đồng nghĩa với quyền dùng mã, tên, ảnh hoặc âm thanh.
