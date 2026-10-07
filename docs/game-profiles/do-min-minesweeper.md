# Minesweeper cổ điển; đối chiếu riêng với tiện ích của Minesweeper Online

ID: `do-min-minesweeper` · Thứ tự pilot: 1 · Cập nhật: 2026-10-07

**Trạng thái: hồ sơ nghiên cứu một phần; chưa nghiệm thu replica hoàn chỉnh.**

## Hiện trạng từ mã nguồn

Nguồn hiện có: bàn 9×9/10 mìn; ô đầu và vùng lân cận được tránh mìn; có chế độ cắm cờ.

Mã nguồn: `scripts/engines.js`. Chưa có đo lường trên thiết bị hoặc playthrough đối thủ.

## Các việc phải hoàn thiện

- **Luật:** Chốt luật mở vùng trống, chord và thắng khi mở hết ô không mìn; bảng 3 độ khó; tách no-guess thành chế độ riêng nếu chọn.
- **Phím và độ nhạy:** Chuột trái mở, phải cắm cờ; mobile có nút đổi chế độ; nghiên cứu long-press không gây mở nhầm; zoom bàn khó.
- **Tiến trình và vật phẩm:** Không thêm vật phẩm làm sai luật; mục tiêu tốc độ và tỷ lệ thắng theo từng độ khó; lưu kỷ lục theo cấu hình bàn.
- **Hình ảnh và cảm giác chơi:** Bàn, số, cờ và trạng thái thắng/thua phải dễ phân biệt ở 360px; animation không trì hoãn lượt.

## Nghiệm thu đề xuất

Chuỗi open/flag/chord/win/loss/restart khép kín; bàn khó không tràn viewport; timer và lịch sử không chạy sau đóng.

Ngoài ra phải đạt các cổng chung trong `docs/GAME_PROFILE_TEMPLATE.md`. Chi phí và lịch chưa chốt.

## Nguồn cần đối chiếu

- [https://minesweeper.online/help/gameplay](https://minesweeper.online/help/gameplay)

Trang giới thiệu xác định tựa/phiên bản; manual và playthrough mới xác nhận chi tiết. Nếu tham khảo phần tiếp theo/mobile, ghi rõ khác biệt với phiên bản mục tiêu. URL không đồng nghĩa với quyền dùng mã, tên, ảnh hoặc âm thanh.
