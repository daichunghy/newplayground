# Color Lines 1992 / biến thể Lines 98 cần chọn một bản

ID: `line-98` · Thứ tự pilot: 3 · Cập nhật: 2026-10-07

**Trạng thái: hồ sơ nghiên cứu một phần; chưa nghiệm thu replica hoàn chỉnh.**

## Hiện trạng từ mã nguồn

Nguồn hiện có: preview ba bóng, lưu điểm cao; engine có BFS và Undo.

Mã nguồn: `scripts/engines.js`. Chưa có đo lường trên thiết bị hoặc playthrough đối thủ.

## Các việc phải hoàn thiện

- **Luật:** Khóa kích thước, số màu, luật đường đi và xóa >=5 theo bốn trục; chốt sinh bóng sau lượt ăn điểm và bàn gần đầy.
- **Phím và độ nhạy:** Chọn bóng rồi chọn ô; phản hồi không có đường; animation không đổi luật; mobile cùng một hệ tọa độ.
- **Tiến trình và vật phẩm:** Chuẩn hóa bảng điểm, preview và Undo; lưu board/preview/RNG; không ghép level vào mode endless gốc.
- **Hình ảnh và cảm giác chơi:** Dùng ký hiệu phụ cho màu, highlight đường đi, cỡ bóng rõ; tắt hiệu ứng khi người chơi cần thao tác nhanh.

## Nghiệm thu đề xuất

Đường bị chặn không di chuyển; giao hai đường không đếm trùng; Undo khôi phục board, preview và điểm.

Ngoài ra phải đạt các cổng chung trong `docs/GAME_PROFILE_TEMPLATE.md`. Chi phí và lịch chưa chốt.

## Nguồn cần đối chiếu

- [https://www.mobygames.com/game/9862/color-lines/](https://www.mobygames.com/game/9862/color-lines/)
- [https://en.wikipedia.org/wiki/Color_Lines](https://en.wikipedia.org/wiki/Color_Lines)

Trang giới thiệu xác định tựa/phiên bản; manual và playthrough mới xác nhận chi tiết. Nếu tham khảo phần tiếp theo/mobile, ghi rõ khác biệt với phiên bản mục tiêu. URL không đồng nghĩa với quyền dùng mã, tên, ảnh hoặc âm thanh.
