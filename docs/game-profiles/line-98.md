# Color Lines 1992 / biến thể Lines 98 cần chọn một bản

ID: `line-98` · Thứ tự pilot: 3 · Cập nhật: 2026-10-07

**Trạng thái: hồ sơ nghiên cứu một phần; chưa nghiệm thu replica hoàn chỉnh.**

## Hiện trạng từ mã nguồn

Ứng viên NP Classic 1 đã triển khai: BFS, bốn trục, preview/RNG/Undo chính xác, ngoại lệ all-clear có công bố, input/cancel/save/animation độc lập. 38 focused tests pass; browser/device pending. Chi tiết docs/games/LINE98_RESEARCH_AND_QA.md.

Mã nguồn: `scripts/games/line98-model.js + scripts/games/line98.js`. Chưa có đo lường trên thiết bị hoặc playthrough đối thủ.

## Các việc phải hoàn thiện

- **Luật:** Variant NP Classic 1 ghi rõ scoring và empty-board replenishment; model đã kiểm tra. Còn browser playthrough/acceptance.
- **Phím và độ nhạy:** 81 ô44px, click/touch/keyboard, preview đường đi, hủy pan/cancel/multitouch; real touch/pinch pending.
- **Tiến trình và vật phẩm:** Endless, preview3, Undo1 giữ cả RNG, safe save/restore và best tách legacy; không vật phẩm trả tiền.
- **Hình ảnh và cảm giác chơi:** Minimal visible text and essential controls only; optional short help, nonvisual accessibility retained. Browser/device/latency pending.

## Nghiệm thu đề xuất

Đường bị chặn không di chuyển; giao hai đường không đếm trùng; Undo khôi phục board, preview và điểm.

Ngoài ra phải đạt các cổng chung trong `docs/GAME_PROFILE_TEMPLATE.md`. Chi phí và lịch chưa chốt.

## Nguồn cần đối chiếu

- [https://www.mobygames.com/game/9862/color-lines/](https://www.mobygames.com/game/9862/color-lines/)
- [https://en.wikipedia.org/wiki/Color_Lines](https://en.wikipedia.org/wiki/Color_Lines)

Trang giới thiệu xác định tựa/phiên bản; manual và playthrough mới xác nhận chi tiết. Nếu tham khảo phần tiếp theo/mobile, ghi rõ khác biệt với phiên bản mục tiêu. URL không đồng nghĩa với quyền dùng mã, tên, ảnh hoặc âm thanh.
