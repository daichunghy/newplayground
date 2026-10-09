# Original NewPlayground Xếp Khối endless; MIT rotation offsets attributed; no official Tetris parity claim

ID: `xep-gach-tetris` · Thứ tự pilot: 5 · Cập nhật: 2026-10-07

**Trạng thái: hồ sơ nghiên cứu một phần; chưa nghiệm thu replica hoàn chỉnh.**

## Hiện trạng từ mã nguồn

fb1 integrated: original endless falling-block play, seeded bags, kicks, ghost, time-based input/gravity/lock, safe save and compact UI. 27 focused model/controller groups pass, including 100 seeded campaigns. Dossier: docs/games/FALLING_BLOCKS_RESEARCH_AND_SCOPE.md.

Mã nguồn: `scripts/games/falling-blocks-model.js + falling-blocks-input.js + falling-blocks.js`. Chưa có đo lường trên thiết bị hoặc playthrough đối thủ.

## Các việc phải hoàn thiện

- **Luật:** Implemented original scoring, seven-bag, rotation offset attribution, ghost/drop/line clear/top-out and capped lock delay. Not guideline compliance.
- **Phím và độ nhạy:** DAS160ms/ARR45ms, no OS hard-drop repeat, four touch buttons, keyboard and pause/restart. Device feel unmeasured.
- **Tiến trình và vật phẩm:** Default endless and saved seeded round, separate best. Hidden model compatibility mechanics are not advertised as playable modes.
- **Hình ảnh và cảm giác chơi:** Original SVG/CSS/canvas and muted-aware synth, minimal text, optional one-line help; no commercial BGM/assets. Browser/latency pending.

## Nghiệm thu đề xuất

27 automated model/input/lifecycle groups pass; actual browser/device/playtest and release rights framing remain gates.

Ngoài ra phải đạt các cổng chung trong `docs/GAME_PROFILE_TEMPLATE.md`. Chi phí và lịch chưa chốt.

## Nguồn cần đối chiếu

- [https://play.tetris.com/](https://play.tetris.com/)
- [https://github.com/simonlc/tetr.js/tree/57e5d07b18920389024ffa2ed07ce309d3644706](https://github.com/simonlc/tetr.js/tree/57e5d07b18920389024ffa2ed07ce309d3644706)
- [https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events)

Trang giới thiệu xác định tựa/phiên bản; manual và playthrough mới xác nhận chi tiết. Nếu tham khảo phần tiếp theo/mobile, ghi rõ khác biệt với phiên bản mục tiêu. URL không đồng nghĩa với quyền dùng mã, tên, ảnh hoặc âm thanh.
