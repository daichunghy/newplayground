# Diner Dash bản PC; Adventures chỉ là benchmark nâng cấp mobile

ID: `diner-dash` · Thứ tự pilot: 10 · Cập nhật: 2026-10-07

**Trạng thái: hồ sơ nghiên cứu một phần; chưa nghiệm thu replica hoàn chỉnh.**

## Hiện trạng từ mã nguồn

Nguồn hiện có: stage, màu khách và chuyển trạm; đã có luồng phục vụ prototype.

Mã nguồn: `scripts/engines-popcap.js`. Chưa có đo lường trên thiết bị hoặc playthrough đối thủ.

## Các việc phải hoàn thiện

- **Luật:** Chốt nhóm khách, seating color-match, queue, order-ticket, hai tay mang đồ, delivery/payment/cleaning; tìm manual/video PC.
- **Phím và độ nhạy:** Tap queue/task đổi trạm; đo thời gian chạy và ưu tiên đơn; task có feedback đang chờ và đang làm.
- **Tiến trình và vật phẩm:** Bảng target từng ca, loại khách/kiên nhẫn, layout bàn, nâng cấp và tốc độ; không đem hearts/IAP Adventures sang PC mặc định.
- **Hình ảnh và cảm giác chơi:** Trạng thái bàn trống/ngồi/đặt món/chờ món/trả tiền/bẩn nhìn khác nhau; nhân vật di chuyển có easing nhưng không đổi logic.

## Nghiệm thu đề xuất

Không kẹt khách giữa trạm; task hủy/reorder có luật; một ca đầy đủ đạt hoặc trượt target; tải lại hồi phục mốc ca.

Ngoài ra phải đạt các cổng chung trong `docs/GAME_PROFILE_TEMPLATE.md`. Chi phí và lịch chưa chốt.

## Nguồn cần đối chiếu

- [https://www.dinerdashadventures.com/help-faq/](https://www.dinerdashadventures.com/help-faq/)
- [https://glumobile.helpshift.com/hc/en/102-diner-dash-adventures/faq/8261-what-s-the-difference-between-upgrading-and-leveling-up-customers/?s=clans](https://glumobile.helpshift.com/hc/en/102-diner-dash-adventures/faq/8261-what-s-the-difference-between-upgrading-and-leveling-up-customers/?s=clans)

Trang giới thiệu xác định tựa/phiên bản; manual và playthrough mới xác nhận chi tiết. Nếu tham khảo phần tiếp theo/mobile, ghi rõ khác biệt với phiên bản mục tiêu. URL không đồng nghĩa với quyền dùng mã, tên, ảnh hoặc âm thanh.
