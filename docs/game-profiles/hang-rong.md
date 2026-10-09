# Game nguyên bản Việt Nam; benchmark time-management

ID: `hang-rong` · Thứ tự pilot: 4 · Cập nhật: 2026-10-07

**Trạng thái: hồ sơ nghiên cứu một phần; chưa nghiệm thu replica hoàn chỉnh.**

## Hiện trạng từ mã nguồn

hr3-simple: mở là nấu/giao; tự chọn menu, nhập hàng, lấy món và khớp món. Không còn các màn chuẩn bị, chợ, trang bị, thống kê hoặc help dài. Giữ v3/v2 progress. 35 focused tests pass; device/playtest pending.

Mã nguồn: `scripts/games/hangrong-model.js + scripts/games/hangrong.js`. Chưa có đo lường trên thiết bị hoặc playthrough đối thủ.

## Các việc phải hoàn thiện

- **Luật:** Closed shift/economy/progression implemented and deterministic tests; validate human pacing and scoped gameplay in browser.
- **Phím và độ nhạy:** Chạm món để nấu, chạm khách để giao; phím 1–3 và Q/W/E/R; pause/resume. Real touch/AT pending.
- **Tiến trình và vật phẩm:** Cấp và save giữ nguyên dưới game; không yêu cầu người chơi quản lý kho, trang bị hay bước chuẩn bị.
- **Hình ảnh và cảm giác chơi:** Instant play, customers/dishes/timer only, original vector art, optional one-line help. Device/audio/latency pending.

## Nghiệm thu đề xuất

Cấp 4/8/15/25 khớp bảng mở khóa đã chốt; save lỗi không làm mất khả năng chơi; không rơi vào ca không thể hoàn thành.

Ngoài ra phải đạt các cổng chung trong `docs/GAME_PROFILE_TEMPLATE.md`. Chi phí và lịch chưa chốt.

## Nguồn cần đối chiếu

- [https://developers.poki.com/guide/player-fit-test](https://developers.poki.com/guide/player-fit-test)
- [https://www.dinerdashadventures.com/help-faq/](https://www.dinerdashadventures.com/help-faq/)

Trang giới thiệu xác định tựa/phiên bản; manual và playthrough mới xác nhận chi tiết. Nếu tham khảo phần tiếp theo/mobile, ghi rõ khác biệt với phiên bản mục tiêu. URL không đồng nghĩa với quyền dùng mã, tên, ảnh hoặc âm thanh.
