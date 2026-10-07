# 2048 bản gốc Gabriele Cirulli

ID: `tro-choi-2048` · Thứ tự pilot: 2 · Cập nhật: 2026-10-07

**Trạng thái: hồ sơ nghiên cứu một phần; chưa nghiệm thu replica hoàn chỉnh.**

## Hiện trạng từ mã nguồn

Nguồn hiện có: bàn 4×4, sinh ô 2/4 tỷ lệ 90/10, phím mũi tên/WASD, lưu điểm cao.

Mã nguồn: `scripts/engines-classics.js`. Chưa có đo lường trên thiết bị hoặc playthrough đối thủ.

## Các việc phải hoàn thiện

- **Luật:** Đối chiếu mỗi ô chỉ ghép một lần trong lượt; nước không đổi bàn không sinh ô; đạt 2048, tiếp tục và hết nước đi.
- **Phím và độ nhạy:** Swipe có ngưỡng và một lượt mỗi gesture; chống hai sự kiện touch/mouse; ghi nhận input-to-feedback.
- **Tiến trình và vật phẩm:** Lưu cả bàn, điểm và trạng thái thắng; Undo là biến thể được ghi rõ, không tự thêm vào bản tham chiếu.
- **Hình ảnh và cảm giác chơi:** Animation di chuyển trước khi pop ghép, khóa input đúng thời gian; tương phản số và thông báo điểm.

## Nghiệm thu đề xuất

Chuỗi 2-2-2-2 ghép đúng; reload phục hồi bàn; swipe một lần chỉ chạy một lượt; tiếp tục sau thắng được.

Ngoài ra phải đạt các cổng chung trong `docs/GAME_PROFILE_TEMPLATE.md`. Chi phí và lịch chưa chốt.

## Nguồn cần đối chiếu

- [https://play2048.co/about](https://play2048.co/about)
- [https://github.com/gabrielecirulli/2048](https://github.com/gabrielecirulli/2048)

Trang giới thiệu xác định tựa/phiên bản; manual và playthrough mới xác nhận chi tiết. Nếu tham khảo phần tiếp theo/mobile, ghi rõ khác biệt với phiên bản mục tiêu. URL không đồng nghĩa với quyền dùng mã, tên, ảnh hoặc âm thanh.
