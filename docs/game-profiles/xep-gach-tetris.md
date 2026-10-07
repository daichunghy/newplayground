# Chọn rõ bản Tetris cổ điển hoặc luật hiện đại, không trộn

ID: `xep-gach-tetris` · Thứ tự pilot: 5 · Cập nhật: 2026-10-07

**Trạng thái: hồ sơ nghiên cứu một phần; chưa nghiệm thu replica hoàn chỉnh.**

## Hiện trạng từ mã nguồn

Nguồn hiện có: bàn 10×20, next/hold, rơi nhanh, phím xoay; sinh loại khối bằng chọn ngẫu nhiên.

Mã nguồn: `scripts/engines.js`. Chưa có đo lường trên thiết bị hoặc playthrough đối thủ.

## Các việc phải hoàn thiện

- **Luật:** Khóa rotation/wall-kick, randomizer, lock delay, scoring, top-out, level/gravity; lập bảng khác biệt với bản tham chiếu.
- **Phím và độ nhạy:** Đo DAS/ARR từ bản tham chiếu; chỉnh giữ phím độc lập repeat của OS; touch có nút >=44px và thao tác không trùng.
- **Tiến trình và vật phẩm:** Hold/ghost/next và loại ghi điểm chỉ xuất hiện nếu nằm trong mode đã chốt; không bán khối hay lợi thế.
- **Hình ảnh và cảm giác chơi:** Ghost khác màu khối thật, preview đọc được; tốc độ mô phỏng độc lập màn 60/120Hz.

## Nghiệm thu đề xuất

Xoay sát tường/trần đúng luật; giữ phím đúng nhịp; hard-drop không lặp vì key repeat; mất focus không giữ phím.

Ngoài ra phải đạt các cổng chung trong `docs/GAME_PROFILE_TEMPLATE.md`. Chi phí và lịch chưa chốt.

## Nguồn cần đối chiếu

- [https://play.tetris.com/about](https://play.tetris.com/about)

Trang giới thiệu xác định tựa/phiên bản; manual và playthrough mới xác nhận chi tiết. Nếu tham khảo phần tiếp theo/mobile, ghi rõ khác biệt với phiên bản mục tiêu. URL không đồng nghĩa với quyền dùng mã, tên, ảnh hoặc âm thanh.
