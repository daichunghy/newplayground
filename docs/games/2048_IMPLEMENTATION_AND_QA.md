# 2048 — ứng viên triển khai g2048-1

Ngày 07/10/2026. Phạm vi: classic 4×4, tiếng Việt, thắng 2048 → tiếp tục, hết nước → chơi lại. Trên integration branch từ Minesweeper checkpoint `78b598d`; **chưa push/deploy, chưa nghiệm thu browser/device, không tăng số game accepted**. Yêu cầu người dùng hiện cho phép hoàn thiện nhiều game song song; device gate riêng không ngăn implementation của game tiếp theo.

## Nghiên cứu và quyết định

Hồ sơ nguồn đầy đủ: [2048_RESEARCH_PLAN.md](2048_RESEARCH_PLAN.md). Bản tham chiếu: [Gabriele Cirulli 2048, commit 478b6ec](https://github.com/gabrielecirulli/2048/commit/478b6ec346e3787f589e4af751378d06ded4cbbc), [MIT LICENSE](https://github.com/gabrielecirulli/2048/blob/478b6ec346e3787f589e4af751378d06ded4cbbc/LICENSE.txt). Nguồn dùng để đối chiếu quy tắc; model/view/CSS/SVG mới viết riêng, không sao chép Clear Sans, icon hoặc assets của upstream. Credit tác giả tham chiếu nằm trong phần hướng dẫn game.

Quyết định giữ: 2 tile đầu; spawn 2/4 = 90/10; vị trí đều trên ô trống; merge một lần mỗi lượt; điểm bằng giá trị mới; no-op không sinh tile; thắng dừng chờ Tiếp tục; cờ thắng giữ khi lên 4096; thua khi không còn ô trống/cặp ngang dọc. Thứ tự RNG value trước/location sau và liệt kê ô trống column-first như nguồn. Không có Undo.

Khác biệt có chủ ý: hướng dẫn tiếng Việt/Calibri, palette tương phản mới, D-pad native button cho thao tác một chạm, pause và xác nhận restart ván đang chơi, save có schema validation, âm thanh sine tùy mute chung. Keyboard hiện Mũi tên/WASD; chưa có HJKL/R shortcut. Overlay kết quả xuất hiện ngay, không trì hoãn 800 ms như CSS tham chiếu. Không gọi pixel-perfect replica.

## Kiến trúc và cảm giác thao tác

- `scripts/games/game2048-model.js`: model không DOM/clock/audio; mỗi input là transaction, trả movement/merge/spawn với tọa độ thật. Không còn pop đảo phía phải/xuống.
- `scripts/games/game2048-view.js`: nền 16 ô, lớp tile visual aria-hidden, bảng semantic đọc được và native buttons. Model commit ngay; animation không khóa hoặc xếp hàng input.
- Slide dùng Web Animations transform 100 ms; input mới cancel visual cũ và retarget theo snapshot mới nhất. Model không bị hoàn tác. Khi Web Animations không có hoặc reduced motion bật, hiển thị snapshot ngay.
- Spawn 150 ms, merge 180 ms, không shake/rung. Đây là thông số cấu hình; chưa đo pixel latency/FPS trên thiết bị.
- Pointer down từ x/y=0 hợp lệ; swipe >10 CSS px, trục lớn hơn, tie theo dọc. Pointer capture nhận release ngoài board; cancel/lost capture/multitouch/blur/visibility bỏ gesture. Không có thêm touchend/click cùng phát move.
- Chỉ vùng bàn dùng `touch-action: pinch-zoom`; cuộn ngoài bàn và zoom trang vẫn được giữ. Cần xác minh Safari/Android thực tế.
- Keyboard chỉ bind trong container game, bỏ Ctrl/Alt/Meta/Shift và editable controls. Game modal dùng focus ownership chung đã có từ Minesweeper.
- SFX sử dụng AudioContext chung, mute chung, gain0.03, không nhạc tự chạy. Legacy shared tone helper nay đăng ký nguồn phát với session và hủy oscillator/gain khi đóng game; có test bằng AudioContext double.

## Save và recovery

`np_2048_state_v1` lưu board/score/moves/won/keepPlaying/over/version. `np_2048_best_v1` giữ best; migrate số hợp lệ từ `np_2048_high` nhưng không xóa key cũ. Restore không thêm tile. Chọn Tiếp tục lưu ngay; thua xóa active save, vẫn giữ best.

Validation: 4×4, không sparse, tile0 hoặc lũy thừa2 nguyên an toàn, score nguyên không âm chia hết4, moves nguyên không âm; flags boolean và nhất quán với board/khả năng di chuyển. Bản schema mới hơn được giữ nguyên, chỉ chơi RAM. Corrupt/denied/quota không chặn gameplay; thông báo rõ. Không dùng localStorage.clear.

Nhiều tab: best lấy max trước ghi; active board dùng last-writer-wins và thông báo khi nhận storage event. Sau khi nhận save mới từ tab khác, pause/blur/visibility/pagehide/cleanup không ghi đè save đó; nước đi đã commit hoặc restart/continue có chủ ý sẽ cho tab hiện tại lưu bàn của mình. Không gộp hai bàn. Đây là local single-user game, không anti-cheat hoặc đồng bộ tài khoản.

## Asset ledger

- `assets/game2048-original.svg`: vector mới của project, MIT theo LICENSE repo; không hình ngoài.
- `scripts/games/game2048.css`: hình ô/palette/animations mới, không file font hay texture tải ngoài.
- SFX: oscillator nguyên bản, không sample. Gameplay vẫn dùng được khi AudioContext lỗi.
- Record cover đã thêm manifest. Những hồ sơ quyền chưa rõ của các game khác không được coi là đã giải quyết bởi thay đổi này.

Tính toán sRGB từ literal CSS, **không phải đo screenshot**: contrast số/nền lần lượt 2:7.39, 4:6.87, 8:6.65, 16:5.57, 32:4.97, 64:5.54, 128:7.36, 256:6.96, 512:6.49, 1024:6.34, 2048:9.13. Tất cả vượt4.5:1. Vẫn cần xem font/forced-colors/zoom thực.

## Chứng cứ đã chạy

`node --test tests/*.test.cjs`: **123/123 groups pass** tại checkpoint2048 (101 base +11 model +11 controller). Model suites chứa thêm9.184 vector comparisons deterministic với oracle độc lập: 5.184 tổ hợp line×direction +4.000 full-board×direction. Đây không phải9.184 device tests.

Đã test: exact merge/no double merge/no-op/RNG bounds, destinations right/down, win/continue/4096, đồng thời won+over, corrupt/sparse saves, replay, zero-coordinate swipe, multi-touch/cancel/lost capture, modifier/editable, live save/Continue, reset trước callback cũ, pause/visibility/close, stale-tab storage event qua blur/pagehide rồi commit move, legacy best/future save/quota, rapid model inputs during motion, shared SFX cleanup. Full portal/session/Minesweeper regression vẫn chạy.

### Follow-up save fix — 09/10/2026

Assessment found that a stale tab's automatic blur pause could overwrite a newer save received from another tab. Lifecycle saves now preserve the external board until the player commits a move or deliberately restarts/continues in the local tab. Regression coverage includes blur, pagehide, and the next committed move. `node --test tests/game2048-model.test.cjs tests/game2048-ui.test.cjs`: **23/23 groups pass**. Full current-tree run, including concurrent work: `node --test tests/*.test.cjs`, **1164/1164 pass**.

Probe nghiên cứu legacy được lưu bền ở `scripts/research/check-2048-legacy.cjs`; source cũ đọc từ checkpoint78b598d với SHA256 guard. Upstream pin478b6ec. Có thể cấp `NP_2048_REFERENCE_DIR` đã được tải hợp lệ để chạy offline; nếu không script cần mạng đọc source GitHub chính thức. Probe này không được ship vào site hoặc chạy mạng trong CI. Đã giữ nguyên giới hạn chứng cứ của phép thử nghiên cứu trước implementation.

`node scripts/release-preflight.mjs --prepare` pass. New model/view/CSS/original cover có trong artifact. Source JS vẫn dưới1MB ở checkpoint này; đây không phải thời gian tải nén/cold-load đo thực.

## Cổng còn mở

Browser playthrough, viewport320/360/390/768/desktop, iOS/Android touch + pinch, focus/screen reader, reduced motion/contrast thật, audio gesture/mute thật, measured frame pacing/input latency, novice playtest và release approval đều **pending**. Không có documented local browser preview route trong môi trường hiện tại; không dùng đường khác để vượt localhost/socket denial. Không giả screenshot hoặc gọi DOM doubles là trình duyệt.

Rollback: revert commit ứng viên sau khi xác định revision ổn; không force-push. Key mới tách khỏi high-score cũ và các game khác; checkpoint Minesweeper78b598d/package cũ được giữ nguyên.

## Player UI revision: minimal play surface

The current candidate removes visible tutorial paragraphs, slogans and secondary statistics. Essential controls remain; help is short and optional, while accessible labels/live status stay nonvisual. See `docs/PLAYER_EXPERIENCE_DIRECTION.md`. Earlier detailed interface descriptions above document the previous checkpoint. Browser/device acceptance remains pending.
