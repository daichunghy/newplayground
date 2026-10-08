# Xếp Khối: nghiên cứu trước triển khai

Ngày 07/10/2026. Catalog ID lịch sử `xep-gach-tetris`, pilot 5. Scope mới là game xếp khối nguyên bản của NewPlayground; không tự nhận được cấp phép Tetris hoặc đạt Tetris Guideline. Ứng viên fb1 đã triển khai và tích hợp cục bộ; 27 kiểm tra model/input/DOM pass. Chưa browser/device QA hay phê duyệt phát hành.

## Nguồn trực tiếp đã đọc

- [Trang Tetris chính thức](https://play.tetris.com/): chỉ xác nhận sản phẩm và thông báo thương hiệu/trade dress. Không lấy logo, nhạc, ảnh, branding hoặc code từ trang này. Không xem một nguồn mở có MIT là giấy phép đối với thương hiệu hoặc toàn bộ cách thể hiện game khác.
- [Netflix Games, Tetris Time Warp: Gameplay Options](https://games-netflix.helpshift.com/hc/en/48-tetris-time-warp/faq/1677-gameplay-options/?p=android): publisher phân biệt ghost, next queue, lựa chọn modern mechanics và 18/20 rows; đây không phải thông số chuẩn cho mọi phiên bản.
- [Simon Laroche, tetr.js](https://github.com/simonlc/tetr.js): đọc README, piece.js, preview.js, tetris.js và LICENSE. Có tài liệu tác giả về SRS/hold/ghost/bag/DAS/ARR. License MIT cho code, copyright Simon M. Laroche 2012. Nếu tái sử dụng các bảng offset rotation, phải giữ notice trong mã phát hành. Không lấy skin/fontawesome/font/audio/assets từ repo.
- Nguồn kỹ thuật input/accessibility/animation: [MDN Pointer Events](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events), [W3C Keyboard](https://www.w3.org/WAI/WCAG22/Understanding/keyboard.html), [MDN requestAnimationFrame](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame), [MDN reduced motion](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion).

Chứng cứ: source-reviewed. Không click chơi reference, không đo timing/input-to-paint/FPS. Trang how-to-play cũ của Tetris không truy cập được qua công cụ; không suy diễn nội dung thiếu. Những giá trị timing dưới đây là thiết kế của NewPlayground, không được báo là đã đo từ bản thương mại.

Source tham chiếu đã ghim commit `57e5d07b18920389024ffa2ed07ce309d3644706`. Bảng offset rotation dùng lại được ghi công và giữ nguyên MIT notice tại `assets/licenses/tetr-js-MIT.txt`; license này chỉ áp dụng phần code/data của tác giả đó.

## Vấn đề nguồn hiện tại

`launchTetris` trong engines.js đang: chọn khối random độc lập gây drought; xoay chỉ thử0/-1/+1, không có hệ hướng rõ; hard-drop và giữ phím dựa key-repeat OS; hold không kiểm tra block-out ngay; đọc/ghi localStorage có thể throw; layout ngang khoảng400px làm mobile hẹp khó dùng; hiệu ứng/particles đếm frame; BGM được mô tả authentic nhưng quyền/nguồn không được xác nhận trong game dossier. Chưa có model tests, save ván, pause đúng vòng đời hoặc source-backed acceptance.

## Scope đã triển khai

- Game độc lập mang tên “Xếp Khối”, màu và hình bề mặt tự thiết kế, âm thanh oscillator tùy mute; bỏ BGM tham chiếu và cover cũ chưa rõ quyền khỏi đường phát hành của game này.
- Bàn10×20 visible,2 hàng đệm trên; 7 khối; seven-bag Fisher–Yates với seed lưu được, next3 và ghost chỉ viền. Hold còn được kiểm tra ở model/schema nhưng không có control hoặc phím bật tính năng trên UI tối giản.
- Matrix rotations rõ4 orientation. Tham khảo bảng offset SRS từ MIT source (giữ notice nếu dùng); spawn position và top-out phải ghi khác biệt. Không quảng cáo guideline-compliant.
- UI mở ngay một mode endless. Model còn hỗ trợ mục tiêu40 hàng để kiểm tra luật kết thúc, nhưng không hiển thị selector hoặc quảng cáo mode chưa playtest. Scoring riêng100/300/500/800×level cho1/2/3/4 hàng; soft1/hàng, hard2/hàng. Không T-spin/combo/back-to-back nếu chưa triển khai/kiểm chứng; nói rõ scope.
- Gravity theo elapsed time, model fixed step20ms; level tăng mỗi10 hàng; gravity từ800ms xuống sàn80ms theo bảng/formula đã công bố. Lock delay500ms, tối đa15 lần reset hợp lệ; hard drop khóa ngay. Đây là thông số thiết kế, chưa playtest.
- DAS160ms, ARR45ms, soft drop50ms; press đầu phản hồi ngay, key repeat OS không được thả nhiều khối; release/blur/pointercancel/đóng game dọn held state.
- Native controls >=44px: trái, xoay phải, phải, thả; pause/restart bằng icon. Phím Z và ↓ là tiện ích keyboard tùy chọn; thao tác quan trọng có click/keyboard thay thế gesture. Mobile controls nằm dưới bàn, preview nằm ngang phía trên, không ép bàn xuống cực nhỏ.
- Save schema riêng, seed/queue/active/hold/grid/time/score/rules version; reload ở trạng thái paused; localStorage blocked/corrupt/future version không crash hay ghi đè save không hiểu. Kỷ lục cũ khác luật giữ riêng.

## Nghiệm thu phải có

1. Tetromino conservation, rotations4 lần, wall/floor kicks và fail rollback; active không chồng stack/out-of-bounds.
2. Bảy khối mỗi bag, restore giữ chuỗi tương lai, hold limit/reset và hold block-out.
3. Hard drop đúng ghost, soft/hard score, clear1–4 rows, level boundary, target40 win, spawn/partial-top-out loss.
4. Lock delay reset cap; delta partition60/120Hz cho kết quả tương đương; pause/background không catch-up.
5. DAS/ARR/release, simultaneous keys, no hard-drop repeat, pointer cancellation, reset/close cleanup.
6. Valid/corrupt/sparse/future save; separate legacy records, storage errors.
7. Actual browser/mobile/a11y/audio/contrast/latency và playtest vẫn cần route preview hợp lệ. Không dùng DOM/canvas mocks như chứng cứ đã chơi trên thiết bị.

Toàn bộ150 game tiếp tục theo backlog; đây là một game scope riêng, không tạo thêm ID/clone. Release rights và tên thương mại cần được chủ dự án quyết định trước khi công bố; nghiên cứu này không phải kết luận pháp lý hoặc giấy phép thương hiệu.

## Triển khai và kiểm tra ngày 07/10/2026

- Launcher lịch sử giữ ID để không gãy route, tên hiện hành **Xếp Khối**. Bỏ engine cũ gồm BGM tự nhận authentic; bản mới chỉ dùng synth ngắn qua mute/lifecycle hiện có. Không lấy nhạc hoặc skin thương mại. Cover SVG được tạo tại repo, notice MIT cho rotation offsets được đóng gói riêng.
- View gọn: bàn chơi, điểm, next3, bốn control và icon pause/restart; help chỉ một câu, đóng mặc định. Không tutorial gate, cấp độ/timer/bảng thành tích hoặc setup panel trên mặt chơi. Đọc bàn và các trạng thái dài chỉ phục vụ công nghệ hỗ trợ; không tuyên bố game Canvas đã tiếp cận hoàn toàn với screen reader.
- `scripts/games/falling-blocks-model.js`, `falling-blocks-input.js`, `falling-blocks.js`, `falling-blocks.css`; API `NP_FallingBlocks.mount(container, session, NP_AudioEngine)`.
- Save `np_falling_blocks_v1`; snapshot lỗi được giữ tại `_recovery` trước khi thay thế. Nếu backup thất bại hoặc gặp schema tương lai ở wrapper/model, giữ nguyên dữ liệu gốc và cho chơi trong RAM. Không ghi đè `np_tetris_high_score` vốn khác luật.
- Mỗi lần reload active round ở trạng thái paused. Blur, hidden, pagehide hoặc frame gap >250 ms dừng, không bù thời gian. Release/close hủy RAF, listener, gesture/held state và âm thanh do session sở hữu. Hard drop bỏ OS key repeat; DAS/ARR riêng theo elapsed time.
- 15 model groups +11 input/controller groups =27 focused groups pass; một model group chạy 100 seeded mixed-action campaigns với restore bit-exact sau từng bước. Có tests 30/60/120 Hz, va chạm/rotation rollback, hold block-out, clear1–4, lock-reset cap, corrupt/future save, cancellation, confirmation, pause/reopen và terminal focus.
- Lệnh: `node --test tests/falling-blocks-*.test.cjs`. Log: `docs/qa/falling-blocks-node-tests-20261007.txt`. Shared launcher và initial-copy budget nằm trong full suite.
- Những kiểm tra này dùng Node và DOM/Canvas doubles. Chưa nhìn thấy UI trong trình duyệt, chưa chơi chuột/chạm thật, chưa đo FPS/latency/contrast thực tế hoặc nghe âm thanh. Không coi SVG render hoặc test double là browser/device acceptance.

### Cổng còn mở

Preview browser được hỗ trợ → desktop keyboard/repeated restart/close/reopen → mobile portrait/landscape, 44px/zoom/cancel/scroll → audio mute/background → storage blocked/quota/restore → người mới chơi vòng đầy đủ. Xác minh framing/tên/phạm vi và notice trước publication. Công thức scoring và tuning là thiết kế dự án; không đánh dấu commercial reference parity.
