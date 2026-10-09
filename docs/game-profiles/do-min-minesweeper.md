# Minesweeper cổ điển; đối chiếu riêng với tiện ích của Minesweeper Online

ID: `do-min-minesweeper` · Thứ tự pilot: 1 · Cập nhật: 2026-10-08

**Trạng thái: hồ sơ nghiên cứu một phần; chưa nghiệm thu replica hoàn chỉnh.**

## Hiện trạng từ mã nguồn

Ứng viên ms1: 3 preset cổ điển + pocket 6×8/8; safe opening, flood/chord/win/loss, cờ và dấu hỏi tạm thời, keyboard, giữ-thả cờ, pause/resume, save/records và SVG/CSS/SFX nguyên bản. 90 focused model/UI-double tests pass. Chưa nghiệm thu browser/device. Hồ sơ chi tiết: docs/games/MINESWEEPER_RESEARCH_AND_QA.md.

Mã nguồn: `scripts/games/minesweeper-model.js + scripts/games/minesweeper.js`. Chưa có đo lường trên thiết bị hoặc playthrough đối thủ.

## Các việc phải hoàn thiện

- **Luật:** Đã triển khai và kiểm tra model: số mìn/clue, safe opening, flood, chord đúng/sai, thắng không cần cờ; dấu hỏi chỉ là ghi chú, không tăng bộ đếm cờ hoặc chặn mở/chord. Tiếp: playthrough trên browser; không công bố no-guess.
- **Phím và độ nhạy:** Đã có keyboard roving focus, mode mở/cờ/dấu hỏi, chuột phải xoay cờ → ? → trống, long-press 450 ms cắm cờ khi thả, hủy kéo/đa chạm, 44px targets và pan/zoom. Tiếp: đo cảm giác trên touch thật và Safari.
- **Tiến trình và vật phẩm:** Kỷ lục/played/won riêng bốn preset, active save schema 1, restore paused; không thêm vật phẩm. Còn QA reload/quota trên browser thật.
- **Hình ảnh và cảm giác chơi:** Minimal visible text and essential controls only; optional short help, nonvisual accessibility retained. Browser/device/latency pending.

## Nghiệm thu đề xuất

Chuỗi open/flag/chord/win/loss/restart khép kín; bàn khó không tràn viewport; timer và lịch sử không chạy sau đóng.

Ngoài ra phải đạt các cổng chung trong `docs/GAME_PROFILE_TEMPLATE.md`. Chi phí và lịch chưa chốt.

## Nguồn cần đối chiếu

- [https://minesweeper.online/help/gameplay](https://minesweeper.online/help/gameplay)
- [https://github.com/DavidNHill/JSMinesweeper#how-to-use-the-player](https://github.com/DavidNHill/JSMinesweeper#how-to-use-the-player)
- [https://www.w3.org/WAI/ARIA/apg/patterns/grid/](https://www.w3.org/WAI/ARIA/apg/patterns/grid/)
- [https://www.w3.org/WAI/WCAG22/Understanding/pointer-cancellation.html](https://www.w3.org/WAI/WCAG22/Understanding/pointer-cancellation.html)
- [https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events)

Trang giới thiệu xác định tựa/phiên bản; manual và playthrough mới xác nhận chi tiết. Nếu tham khảo phần tiếp theo/mobile, ghi rõ khác biệt với phiên bản mục tiêu. URL không đồng nghĩa với quyền dùng mã, tên, ảnh hoặc âm thanh.
