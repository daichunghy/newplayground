# 2048 bản gốc Gabriele Cirulli

ID: `tro-choi-2048` · Thứ tự pilot: 2 · Cập nhật: 2026-10-07

**Trạng thái: hồ sơ nghiên cứu một phần; chưa nghiệm thu replica hoàn chỉnh.**

## Hiện trạng từ mã nguồn

Ứng viên g2048-1: model/view tách riêng, chuẩn merge/spawn/win/continue/loss, save có validation, keyboard/swipe/D-pad, motion có thể hủy, SVG/CSS/SFX mới. Full suite123 groups pass, gồm9.184 oracle comparisons; browser/device pending. Chi tiết docs/games/2048_IMPLEMENTATION_AND_QA.md.

Mã nguồn: `scripts/games/game2048-model.js + scripts/games/game2048-view.js`. Chưa có đo lường trên thiết bị hoặc playthrough đối thủ.

## Các việc phải hoàn thiện

- **Luật:** Core và save đã triển khai/kiểm tra tự động; browser playthrough để nghiệm thu scoped parity. Không Undo.
- **Phím và độ nhạy:** Mũi tên/WASD trong game, swipe>10px capture/cancel/multitouch, 4 nút44px; rapid input không khóa vì animation. Còn QA touch/pinch/Safari.
- **Tiến trình và vật phẩm:** Win2048, Continue tới4096+, terminal/restart, best migration và guarded resume; không campaign/items.
- **Hình ảnh và cảm giác chơi:** Minimal visible text and essential controls only; optional short help, nonvisual accessibility retained. Browser/device/latency pending.

## Nghiệm thu đề xuất

Chuỗi 2-2-2-2 ghép đúng; reload phục hồi bàn; swipe một lần chỉ chạy một lượt; tiếp tục sau thắng được.

Ngoài ra phải đạt các cổng chung trong `docs/GAME_PROFILE_TEMPLATE.md`. Chi phí và lịch chưa chốt.

## Nguồn cần đối chiếu

- [https://play2048.co/about](https://play2048.co/about)
- [https://github.com/gabrielecirulli/2048](https://github.com/gabrielecirulli/2048)

Trang giới thiệu xác định tựa/phiên bản; manual và playthrough mới xác nhận chi tiết. Nếu tham khảo phần tiếp theo/mobile, ghi rõ khác biệt với phiên bản mục tiêu. URL không đồng nghĩa với quyền dùng mã, tên, ảnh hoặc âm thanh.
