# Game nguyên bản Việt Nam; benchmark time-management

ID: `hang-rong` · Thứ tự pilot: 4 · Cập nhật: 2026-10-07

**Trạng thái: hồ sơ nghiên cứu một phần; chưa nghiệm thu replica hoàn chỉnh.**

## Hiện trạng từ mã nguồn

Nguồn hiện có: năm giai đoạn, kho hàng, công thức, nâng cấp, kinh nghiệm; đã sửa lệch ngưỡng mở giai đoạn.

Mã nguồn: `scripts/engines.js`. Chưa có đo lường trên thiết bị hoặc playthrough đối thủ.

## Các việc phải hoàn thiện

- **Luật:** Lập bảng cấp -> ca -> công thức -> nguyên liệu -> chi phí -> lợi nhuận -> nâng cấp; mô phỏng khả năng hết tiền/không có món bán.
- **Phím và độ nhạy:** Click/tap nhận đơn, nấu, giao; chống double-tap; hiển thị trạng thái trạm và thứ tự ưu tiên khách.
- **Tiến trình và vật phẩm:** Đối chiếu nguyên liệu của từng công thức với kho ban đầu/mua hàng; ca có tổng kết, thắng/thua và lý do quay lại.
- **Hình ảnh và cảm giác chơi:** Thay emoji bằng bộ sprite món/khách/quầy đồng nhất; giữ visual feedback đã giao/nấu/thiếu hàng riêng biệt.

## Nghiệm thu đề xuất

Cấp 4/8/15/25 khớp bảng mở khóa đã chốt; save lỗi không làm mất khả năng chơi; không rơi vào ca không thể hoàn thành.

Ngoài ra phải đạt các cổng chung trong `docs/GAME_PROFILE_TEMPLATE.md`. Chi phí và lịch chưa chốt.

## Nguồn cần đối chiếu

- [https://developers.poki.com/guide/player-fit-test](https://developers.poki.com/guide/player-fit-test)
- [https://www.dinerdashadventures.com/help-faq/](https://www.dinerdashadventures.com/help-faq/)

Trang giới thiệu xác định tựa/phiên bản; manual và playthrough mới xác nhận chi tiết. Nếu tham khảo phần tiếp theo/mobile, ghi rõ khác biệt với phiên bản mục tiêu. URL không đồng nghĩa với quyền dùng mã, tên, ảnh hoặc âm thanh.
