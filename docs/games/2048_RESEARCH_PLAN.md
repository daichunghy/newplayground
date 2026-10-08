# 2048: hồ sơ nghiên cứu và kế hoạch pha tiếp theo

Cập nhật: **07/10/2026 (UTC)**. Catalog ID: `tro-choi-2048`. Pilot thứ 2, sau Dò Mìn. **Chỉ nghiên cứu và lập kế hoạch; chưa triển khai, chưa nghiệm thu 2048, chưa push/deploy.** Việc hoàn thành tài liệu này không mở cổng triển khai khi ứng viên Minesweeper còn chờ chấp nhận.

## 1. Kết luận cần dùng ngay

- Phần trượt/ghép/điểm hiện tại có nền tảng đúng: đối chiếu có kiểm soát với model upstream cho **9.184 ca board/score đều khớp**. Đây là probe Node VM tách RNG, không phải suite đã tích hợp hoặc kiểm thử thiết bị.
- Thiếu lớn nhất là vòng thắng → tiếp tục, lưu/phục hồi ván, và animation thể hiện đường đi. Hiện đạt 2048 chỉ tiếp tục im lặng.
- Có lỗi cụ thể: pop sai tọa độ khi đi phải/xuống; tên animation `npPop` không có keyframes trong checkout; đọc storage bị chặn làm khởi tạo lỗi; kỷ lục hỏng thành `NaN`; callback thua cũ có thể phủ lên ván vừa restart.
- Không thêm Undo vào bản tham chiếu. Không mặc định khóa input 300 ms để chờ pop: nguồn gốc nhận input ngay, không có hàng đợi/khóa animation ở model.
- Giữ tiếng Việt, font Calibri theo repo, cải thiện tương phản/khả năng tiếp cận, thiết kế cover riêng. Mọi khác biệt có chủ ý phải ghi trong hồ sơ nghiệm thu.

## 2. Phạm vi và mức chứng cứ

### 2.1 Bản tham chiếu cố định

Chọn **2048 web cổ điển của Gabriele Cirulli**, bàn 4 × 4, một người, không thời gian, không vật phẩm, không campaign, không Undo. Upstream được ghim tại commit [`478b6ec346e3787f589e4af751378d06ded4cbbc`](https://github.com/gabrielecirulli/2048/commit/478b6ec346e3787f589e4af751378d06ded4cbbc), ngày commit 24/10/2024. GitHub API xác nhận đây là đầu `master` tại thời điểm đọc 07/10/2026. Không suy ra app iOS/Android hay website thương mại hiện tại giống tuyệt đối commit này.

Checkout khảo sát có HEAD `78b598dbf6055bc0b70374cc4324fa6117092199` và nhiều thay đổi Minesweeper/portal đang có sẵn. Hàm khảo sát: `scripts/engines-classics.js:4335–4563`. SHA-256 của cả file tại lúc đọc: `f9d7d1460ee960ba3d7be7a6d47d86ba6452963fa3613f043271236a0666cf7f`. Không thay đổi file này trong pha nghiên cứu.

### 2.2 Phân biệt bằng chứng

| Nhãn | Đã làm | Giới hạn |
|---|---|---|
| Đọc nguồn | AGENTS, profile 2048, template game, engine hiện tại, session/game-feel, nguồn upstream và LICENSE | Xác nhận logic/tham số trong mã, không xác nhận cảm giác chơi |
| Đọc web tĩnh | Demo gốc trên GitHub Pages, play2048.co, tài liệu W3C/MDN | Không click/chơi trên browser |
| Probe thực thi có kiểm soát | Node v24.19.0, source được nạp trong VM và DOM double; không tạo file test | Không layout, không CSS animation thật, không touch synthesis, không screen reader |
| Quan sát thiết bị | **Chưa thực hiện** | Browser dùng chung không được sử dụng trong nhiệm vụ này |
| Đo timing/FPS | **Chưa thực hiện** | Mọi ms dưới đây là giá trị nguồn hoặc phương án thiết kế, không phải số đo |
| Nghiệm thu/phát hành | **Chưa thực hiện** | Không tăng số game accepted/complete |

Trang [demo gốc](https://gabrielecirulli.github.io/2048/) đọc được văn bản mục tiêu, New Game, Keep going, Try again và credit tác giả. Trang [play2048.co](https://play2048.co/) và [About](https://play2048.co/about) qua bộ đọc web chỉ trả thông báo cần JavaScript. Đọc JS/CSS trực tiếp từ GitHub Pages bị công cụ web từ chối content-type; nguồn được lấy từ GitHub chính chủ thay thế. Vì vậy **chưa xác minh bundle live trùng commit đã ghim**, cũng chưa có playthrough đối thủ.

### 2.3 Danh mục nguồn chính

Các permalink sau trỏ đúng commit tham chiếu:

| Mã | Nguồn | Dùng để xác nhận |
|---|---|---|
| S1 | [game_manager.js](https://github.com/gabrielecirulli/2048/blob/478b6ec346e3787f589e4af751378d06ded4cbbc/js/game_manager.js) | Luật, điểm, thắng/thua, tiếp tục, lưu ván |
| S2 | [grid.js](https://github.com/gabrielecirulli/2048/blob/478b6ec346e3787f589e4af751378d06ded4cbbc/js/grid.js) | Ô trống, phân bố vị trí spawn, tọa độ, serialization |
| S3 | [tile.js](https://github.com/gabrielecirulli/2048/blob/478b6ec346e3787f589e4af751378d06ded4cbbc/js/tile.js) | Vị trí trước/sau và metadata của tile |
| S4 | [keyboard_input_manager.js](https://github.com/gabrielecirulli/2048/blob/478b6ec346e3787f589e4af751378d06ded4cbbc/js/keyboard_input_manager.js) | Mapping phím, swipe, modifier và dispatch input |
| S5 | [html_actuator.js](https://github.com/gabrielecirulli/2048/blob/478b6ec346e3787f589e4af751378d06ded4cbbc/js/html_actuator.js) | RAF, slide/merge/spawn, điểm cộng, ưu tiên overlay |
| S6 | [main.css](https://github.com/gabrielecirulli/2048/blob/478b6ec346e3787f589e4af751378d06ded4cbbc/style/main.css), [main.scss](https://github.com/gabrielecirulli/2048/blob/478b6ec346e3787f589e4af751378d06ded4cbbc/style/main.scss) | Timing khai báo, màu, kích thước và breakpoint |
| S7 | [local_storage_manager.js](https://github.com/gabrielecirulli/2048/blob/478b6ec346e3787f589e4af751378d06ded4cbbc/js/local_storage_manager.js) | Storage fallback và những điểm chưa chống corruption |
| S8 | [index.html](https://github.com/gabrielecirulli/2048/blob/478b6ec346e3787f589e4af751378d06ded4cbbc/index.html), [README](https://github.com/gabrielecirulli/2048/blob/478b6ec346e3787f589e4af751378d06ded4cbbc/README.md) | Scope UI, credit, hướng dẫn, nguồn demo |
| S9 | [LICENSE.txt](https://github.com/gabrielecirulli/2048/blob/478b6ec346e3787f589e4af751378d06ded4cbbc/LICENSE.txt) | MIT, copyright Gabriele Cirulli 2014 |
| S10 | [Cây nguồn](https://github.com/gabrielecirulli/2048/tree/478b6ec346e3787f589e4af751378d06ded4cbbc), [font CSS](https://github.com/gabrielecirulli/2048/blob/478b6ec346e3787f589e4af751378d06ded4cbbc/style/fonts/clear-sans.css) | Phân biệt CSS/numbers với ảnh icon và font |

## 3. Luật chính xác và các góc cạnh

### 3.1 Hợp đồng core

1. Khởi tạo hai tile trên hai ô trống khác nhau; điểm 0. Mỗi tile mới là 2 với xác suất 90%, 4 với xác suất 10%.
2. Trượt sát cạnh theo hướng input. Hai giá trị bằng nhau ghép thành gấp đôi; **tile kết quả không ghép lại trong cùng nước**. Cộng giá trị tile kết quả vào điểm.
3. Nước làm đổi bàn sinh đúng một tile. No-op không sinh tile, không cộng điểm.
4. Ghép ra 2048 đánh dấu thắng; dừng nhận nước cho tới chọn tiếp tục. Sau đó được ghép lớn hơn 2048.
5. Thua khi hết ô trống và không có cặp bằng nhau kề cạnh ngang/dọc. Chéo không tính. Bàn đầy chưa chắc thua.
6. Game-over chặn nước. Restart reset ván, giữ kỷ lục. Không có Undo trong model tham chiếu. Nguồn: [S1](https://github.com/gabrielecirulli/2048/blob/478b6ec346e3787f589e4af751378d06ded4cbbc/js/game_manager.js).

Vị trí mới chọn đều trên tập ô trống, không chọn đều trên hàng trước rồi chọn cột. Upstream duyệt ô theo `cells[x][y]`; engine hiện tại dùng `board[row][column]`. Cần chuyển đổi tường minh trong fixture, đặc biệt khi so sánh replay. Nguồn: [S2](https://github.com/gabrielecirulli/2048/blob/478b6ec346e3787f589e4af751378d06ded4cbbc/js/grid.js).

**RNG:** upstream rút giá trị trước, vị trí sau; engine hiện tại rút vị trí trước, giá trị sau. Xác suất biên vẫn đúng nếu RNG đều độc lập, nhưng cùng seed không bảo đảm cùng replay. Đề xuất model mới nhận RNG hoặc chỉ định spawn trong fixture; nếu chọn deterministic replay tương thích upstream thì giữ cả thứ tự rút lẫn thứ tự liệt kê ô trống. Đây là hợp đồng kiểm thử đề xuất, chưa phải tính năng người chơi.

### 3.2 Fixture bắt buộc, trước spawn

`0` là ô trống. Kết quả dưới đây là board sau trượt/ghép, trước khi thêm tile:

| Hàng trước | Hướng | Hàng sau | Điểm cộng | Lỗi phải ngăn |
|---|---|---|---:|---|
| 2, 2, 2, 2 | Trái | 4, 4, 0, 0 | 8 | Không ghép thành 8 ngay |
| 2, 2, 4, 0 | Trái | 4, 4, 0, 0 | 4 | Tile 4 vừa tạo không ăn tile 4 cũ |
| 2, 2, 2, 0 | Trái | 4, 2, 0, 0 | 4 | Ưu tiên cặp sát cạnh di chuyển |
| 2, 2, 2, 0 | Phải | 0, 0, 2, 4 | 4 | Không giữ pairing của hướng trái |
| 4, 4, 8, 8 | Trái | 8, 16, 0, 0 | 24 | Hai merge độc lập |
| 2, 0, 2, 2 | Trái | 4, 2, 0, 0 | 4 | Nén khoảng trống trước pairing |
| 4, 0, 4, 4 | Phải | 0, 0, 4, 8 | 8 | Đích merge phải đúng phía phải |
| 2, 4, 8, 16 | Trái | 2, 4, 8, 16 | 0 | No-op không dùng RNG |

Lặp các ca tương đương theo cột lên/xuống và đối xứng bàn. Tổng giá trị tile phải được bảo toàn qua bước trượt/ghép; sau spawn chỉ tăng đúng 2 hoặc 4. Điểm không phải tổng giá trị tile đang có.

### 3.3 Thắng, tiếp tục, thua và các khác biệt cần ghi

- Upstream tiếp tục hoàn tất nước thắng, bao gồm spawn và kiểm tra hết nước đi. Nếu cùng nước có cả `won` và `over`, actuator ưu tiên hiển thị thua. Đề xuất giữ ưu tiên mất nước đi, đồng thời thông báo đã đạt 2048 trong tóm tắt để không mất thành tựu. Đây là bổ sung trình bày. Nguồn: [S5](https://github.com/gabrielecirulli/2048/blob/478b6ec346e3787f589e4af751378d06ded4cbbc/js/html_actuator.js).
- Cờ `won` có thể vẫn đúng sau khi đã ghép 2048 thành 4096; không validate bằng điều kiện bắt buộc còn tile đúng bằng 2048.
- Đề xuất ghi save ngay khi nhấn Tiếp tục. Upstream chỉ bật cờ và xóa thông báo ở handler tiếp tục; reload trước nước hợp lệ kế tiếp có thể trở lại trạng thái chờ tiếp tục. Không sao chép nhược điểm này.
- Upstream xóa active save khi thua, lưu khi thắng; mở lại sau thua bắt đầu ván mới. Đề xuất giữ hành vi này cho active save; nếu sau này muốn xem lại ván thua phải tách thành tính năng/history riêng và công bố khác biệt.
- **Undo:** không triển khai trong scope cổ điển. Nếu có yêu cầu riêng sau này, tách mode/lưu kỷ lục; snapshot phải gồm board, điểm, trạng thái thắng và RNG/spawn để Undo không thành cách reroll miễn phí.

### 3.4 State machine đề xuất

| State logic | Nước hợp lệ? | Hành động hợp lệ |
|---|---|---|
| `playing` | Có | 4 hướng, ván mới, đóng |
| `won-awaiting-continue` | Không | Tiếp tục, ván mới, đóng |
| `playing-beyond-2048` | Có | 4 hướng, ván mới, đóng; không bật lại thông báo thắng ở mỗi lượt |
| `lost` | Không | Xem bàn, chơi lại, đóng |
| `disposed` | Không | Không callback/input nào được đổi ván |

`animating` chỉ là state trình bày, không thay luật hoặc điểm. `hidden`/blur xóa gesture và input đang giữ; 2048 không có đồng hồ cần chạy nền. Khi quay lại, hiển thị trạng thái đã commit; không tự phát lại một loạt input cũ. Một lần Restart phải xóa callback/animation/gesture của ván trước bằng generation token hoặc cancellation rõ ràng.

## 4. Rà engine hiện tại: vấn đề và ưu tiên

| Mức | Vị trí | Kết quả đọc/probe | Việc cần làm ở pha triển khai |
|---|---|---|---|
| P0 | `4410` | `localStorage.getItem` ngoài try; storage denial làm launcher throw | Adapter bao cả truy cập property/get/set/remove, fallback RAM |
| P0 | `4410–4420` | `parseInt('bad')` → `NaN`; so sánh điểm với `NaN` luôn sai | Parse chặt số nguyên hữu hạn không âm, recovery về 0 |
| P0 | `4484–4501`, `4545` | Timeout thua 350 ms không bị hủy khi ván mới trong cùng session | Generation guard hoặc hủy timer trên reset |
| P0 | toàn hàm | Không `won`, `keepPlaying`, terminal state guard | Thêm vòng thắng/tiếp tục và loss idempotent |
| P0 | toàn hàm | Chỉ lưu kỷ lục, không lưu board/score | Save có schema/version và migration |
| P1 | `4391–4407` | Dựng lại 16 ô ở vị trí cuối; không có đường trượt/spawn | Tách model, transition plan và renderer |
| P1 | `4435–4437` | Dùng chỉ số trong hàng đảo cho merge phải/xuống | Ghi tọa độ đích thật từ model |
| P1 | `4397` | `npPop` chỉ xuất hiện ở usage; không có định nghĩa keyframes trong checkout | CSS có namespace và test animation names |
| P1 | `4506–4512` | Global keydown; không bỏ modifier/form/contenteditable | Chỉ xử lý khi game active và context phù hợp; không nuốt Ctrl/Cmd+A/W |
| P1 | `4516–4538` | Tọa độ 0 bị coi như chưa touch; không tracking identifier/cancel/multitouch | Pointer lifecycle đầy đủ, nullable start, một commit mỗi gesture |
| P1 | `4353` | Bàn cố định 320 px cộng vùng padding | Responsive theo vùng modal, kiểm tra 320 px viewport/landscape |
| P1 | `4363–4375` | Một số màu số sáng/nền vàng không đạt tương phản tối thiểu | Palette/high-contrast đủ đọc; kiểm tra từng cặp số/nền |
| P1 | HUD/board | Không semantics theo ô hoặc live status; kỷ lục chỉ hiện lúc thua | HUD điểm/kỷ lục; semantic board, status và focus |
| P2 | `4422–4432`, `4479–4480` | Combo/chấn động/rung khác nguồn; có thể nhiều lần trong một nước | Tắt mặc định với reference; nếu giữ tùy chọn phải respect mute/reduced motion |

Không kết luận sai luật merge chỉ vì animation sai. Probe core hiện tại khớp upstream trên mẫu đã nêu; thay đổi tiếp theo nên tập trung vào state, persistence, input và presentation, rồi bảo vệ core bằng test tách biệt.

## 5. Kiến trúc triển khai đề xuất, chưa thực hiện

1. **Model thuần:** board 4 × 4, score, won, keepPlaying, over; nhận direction và RNG; không DOM/audio/storage. Trả `changed`, `scoreDelta`, board mới, danh sách chuyển động/merge, vị trí/value spawn và sự kiện terminal.
2. **Move transaction:** tính trượt/ghép từ snapshot; no-op trả về ngay; spawn đúng một lần; tính terminal; commit một lần. Animation bị hủy không được hoàn tác hoặc nhân đôi transaction.
3. **Transition metadata:** ID riêng mỗi tile; `from`/`to` cho cả hai tile nguồn của merge; tile kết quả và spawn có ID khác. Không suy lại vị trí ghép từ một mảng đã reverse.
4. **Controller/session:** bind controls, persistence và terminal actions; dùng `NP_GameSession` cho listener/timer/RAF; thêm ownership cho mọi observer/media-query callback/animation nếu session chưa quản lý.
5. **Renderer:** lớp nền 16 ô cố định, lớp tile động, overlay riêng, semantic board riêng nếu layer animation phải `aria-hidden`. Chỉ commit semantics một lần mỗi nước; không đọc cả tile cũ và tile kết quả cho screen reader.
6. **Tích hợp:** giữ `window.NP_Engines.launchGame2048` làm entry để không đổi router nhiều game. Có thể tách thành `scripts/games/game2048-model.js`, `game2048-view.js`, `game2048.css`; tên cuối cùng chọn khi triển khai. Không đưa framework/build step/CDN mới vào chỉ cho game này.

## 6. Input, buffer và cảm giác vuốt

### 6.1 Những gì nguồn gốc thực sự làm

Upstream nhận keydown Mũi tên, WASD và HJKL; R restart. Alt/Ctrl/Meta/Shift chặn mapping. Không tự định nghĩa repeat-delay/rate và không lọc `event.repeat`; repeat do hệ điều hành/trình duyệt phát. Không có queue hay input-lock đợi animation. Swipe commit lúc touchend, ngưỡng **lớn hơn 10 CSS px**, lấy trục có độ dịch chuyển lớn nhất; hòa hai trục chọn dọc. Bỏ đa chạm theo guards hiện có. Nguồn: [S4](https://github.com/gabrielecirulli/2048/blob/478b6ec346e3787f589e4af751378d06ded4cbbc/js/keyboard_input_manager.js).

Engine NewPlayground đang dùng >25 CSS px, chỉ mũi tên/WASD, không R/HJKL và không xử lý modifier. Không có số đo cho cảm giác hai ngưỡng.

### 6.2 Hợp đồng đề xuất

- Dùng Pointer Events thống nhất. Theo dõi một primary `pointerId`; nút chuột chính/pen/touch có cùng đường xử lý. Bỏ/cancel gesture nếu xuất hiện ngón thứ hai; pointercancel/lostpointercapture/blur/visibility/close đều reset.
- Bắt đầu từ tọa độ `0` vẫn hợp lệ. Trạng thái chưa bắt đầu dùng `null`, không dùng truthiness của tọa độ.
- Commit đúng một hướng ở pointerup khi displacement >10 CSS px, matching pointer và ván chưa đổi. Ngưỡng khởi đầu theo reference; chưa tự tăng lên 25 px rồi gọi là giống bản gốc.
- Tie chọn dọc cho parity. Không đặt yêu cầu tốc độ/min-duration/max-duration vì nguồn không có; một cú kéo chậm đủ dài cũng là một nước.
- Capture pointer khi hợp lệ để xử lý release ngoài bàn; phải phân biệt hủy có chủ ý và mất capture sau pointerup. Gesture bắt đầu ngoài bàn không tạo nước trong bàn.
- Chỉ một hệ pointer cho swipe. Không đồng thời đăng ký thêm touchend + mouseup + click để cùng phát move. Nút hướng/Restart/Tiếp tục dùng native button click; không để gesture của board bắt cả thao tác trên nút.
- `touch-action` chỉ áp dụng vùng chơi, không áp dụng toàn trang/modal. Mục tiêu cho phép pinch-zoom, cuộn ngoài board. Thử `touch-action: pinch-zoom` với hủy khi đa chạm; nếu có lỗi Safari thực tế thì ghi cụ thể trước khi chọn fallback. Không phục hồi viewport `user-scalable=no` từ HTML gốc.
- Bổ sung bốn nút hướng ≥44 × 44 CSS px, để người không vuốt được vẫn chơi bằng một tap. Đây là khác biệt tiếp cận có chủ ý.
- Input bàn phím chỉ hoạt động khi modal 2048 active; bỏ input/textarea/select/contenteditable và các tổ hợp shortcut. Bàn có điểm focus rõ; hướng dẫn nêu đúng binding thật. HJKL/R là tùy chọn parity nhỏ; nếu R được bật cần cùng chính sách Restart như nút.

### 6.3 Không đánh đổi input lấy animation

**Lựa chọn đề xuất:** dispatch từng input hợp lệ ngay vào model đồng bộ, theo đúng thứ tự sự kiện; renderer có thể kết thúc/retarget animation cũ để theo snapshot mới nhất. Không drop một input chỉ vì tile đang pop; không xếp queue không giới hạn khiến bàn tự chơi sau khi người dùng đã dừng.

Nếu renderer cần buffer để giữ đường trượt, coi đó là **khác biệt có chủ ý**: queue ngắn có chính sách rõ, không nuốt thao tác im lặng, xóa khi terminal/reset/blur/close, và đo thực tế trước chấp nhận. Không lấy thời gian CSS 100/200 ms làm bằng chứng rằng upstream khóa input tương ứng.

Profile/backlog hiện có câu “khóa input đúng thời gian”; sau khi pha này được duyệt cần diễn giải thành bảo vệ transaction và vòng đời, không mặc định lock toàn bộ animation. Tài liệu này không tự sửa backlog/profile.

Nguồn kỹ thuật: [MDN Pointer Events](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events), [W3C Pointer Cancellation](https://www.w3.org/WAI/WCAG22/Understanding/pointer-cancellation.html), [W3C Pointer Gestures](https://www.w3.org/WAI/WCAG22/Understanding/pointer-gestures.html). Các quyết định ở mục 6.2–6.3 là kế hoạch NewPlayground, chưa được kiểm chứng trên thiết bị.

## 7. Animation và hình ảnh

### 7.1 Tham số được khai báo trong upstream

| Hiệu ứng | Tham số trong CSS | Ý nghĩa |
|---|---|---|
| Trượt tile | 100 ms, ease-in-out, transform | Có vị trí đầu/cuối, không teleport |
| Tile mới | appear 200 ms ease, delay 100 ms | Scale/opacity vào sau pha trượt |
| Merge | pop 200 ms ease, delay 100 ms | Scale 0 → 1.2 → 1; tile kết quả nổi trên tile nguồn |
| Điểm cộng | 600 ms ease-in | Một nhãn +tổng điểm nước |
| Overlay kết thúc | fade 800 ms ease, delay 1200 ms | State đã dừng trước khi lớp phủ hiện đủ |

Đây là **giá trị khai báo**, không phải input latency hoặc FPS đã đo. Nguồn: [S6 CSS](https://github.com/gabrielecirulli/2048/blob/478b6ec346e3787f589e4af751378d06ded4cbbc/style/main.css).

Actuator upstream tạo representation ở vị trí cũ, đổi class vị trí ở RAF sau; khi merge còn render hai tile nguồn đi vào cùng đích. Chỉ repaint các con số ở vị trí mới rồi scale không tái hiện chuyển động này. Nguồn: [S3](https://github.com/gabrielecirulli/2048/blob/478b6ec346e3787f589e4af751378d06ded4cbbc/js/tile.js), [S5](https://github.com/gabrielecirulli/2048/blob/478b6ec346e3787f589e4af751378d06ded4cbbc/js/html_actuator.js).

### 7.2 Yêu cầu cho renderer mới

- Trượt bằng transform, pop ở lớp inner để scale không ghi đè translate. Không screen-shake toàn board ở mode cổ điển.
- Cả hai nguồn merge phải đến đúng ô đích; tile mới/merge chỉ xuất hiện đúng một lần. Nước chỉ trượt không phát pop ghép.
- Dùng các duration trên làm baseline đối chiếu. Nếu rút overlay delay để UX nhanh hơn, ghi độ lệch riêng; state, focus và khả năng bấm nút phải nhất quán ngay cả khi overlay đang mờ.
- Reduced motion tắt slide/scale/score-fly và shake; hiển thị trạng thái cuối ngay, vẫn thông báo điểm/trạng thái. Không đợi một `transitionend` sẽ không bao giờ xảy ra khi duration=0.
- Resize/orientation giữa animation phải giữ đúng tọa độ, không spawn lại. Chuyển game/đóng modal/reset hủy RAF và các callback thuộc generation cũ.
- Giữ HUD ổn định khi số điểm tăng; số lớn hơn 2048 vẫn fit ô. Dùng font stack `'Calibri', 'Inter', -apple-system, sans-serif` theo AGENTS, không quảng cáo pixel-perfect Clear Sans.
- Màu tham chiếu có thể làm baseline nhưng phải kiểm tra tương phản. Tính trực tiếp từ màu hiện tại cho tile 8 ≈1.719:1, 128 ≈1.416:1, 2048 ≈1.577:1. Đây là **tính toán sRGB từ literal màu**, không đo screenshot; các cặp này thấp hơn cả mốc 3:1 cho chữ lớn.

## 8. Save, corruption và vòng đời

### 8.1 Đối chiếu storage upstream

Upstream dùng `bestScore` và `gameState`, có bộ nhớ RAM thay thế nếu probe localStorage thất bại. Payload game gồm grid/score/over/won/keepPlaying. Nhưng JSON.parse không được bọc và dữ liệu không có schema validation; get/set/remove sau probe vẫn có thể lỗi. Không coi nguồn gốc là mẫu đủ an toàn cho persistence sản phẩm. Nguồn: [S7](https://github.com/gabrielecirulli/2048/blob/478b6ec346e3787f589e4af751378d06ded4cbbc/js/local_storage_manager.js). [MDN localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage) mô tả các trường hợp access có thể ném SecurityError và phạm vi theo origin.

### 8.2 Hợp đồng đề xuất

| Thành phần | Đề xuất |
|---|---|
| Key mới | `np_2048_state_v1` và kỷ lục có namespace; không dùng key chung của upstream |
| Payload | `version`, board 4 × 4 theo row-major, score, won, keepPlaying; over được đối chiếu lại với board |
| Checkpoint | Sau khởi tạo, từng nước đổi bàn, chọn Tiếp tục, và Restart; state logic đã commit trước animation |
| Đóng/reload | Không sinh lại tile khi hydrate; resume đúng bàn/điểm/terminal, không replay pop cũ |
| Game-over | Xóa active save theo reference, giữ best; lỗi remove không được làm game hỏng |
| Migration | Đọc `np_2048_high` có guard và parse chặt; không có board cũ để “khôi phục” |
| Best | Số nguyên an toàn, hữu hạn, không âm; lấy max của best hợp lệ và score hợp lệ; không giảm do reset |
| Storage lỗi | Chuyển sang RAM, chơi tiếp; thông báo một lần rằng ván chỉ giữ trong phiên, không báo đã autosave |

Validation bắt buộc: object đúng schema/version, đủ đúng 4 hàng × 4 ô, mỗi ô là 0 hoặc lũy thừa 2 hợp lệ; score nguyên an toàn; flags là boolean; không chấp nhận string thay number, Infinity/NaN, số âm hoặc tile 3. Không dùng phép bitwise 32-bit để kiểm tra mọi giá trị tile lớn. `keepPlaying=true` đòi `won=true`; terminal được xác nhận lại từ bàn. Giữ cờ thắng lịch sử khi còn tile >2048.

Recovery: JSON lỗi hoặc shape sai chỉ ảnh hưởng namespace 2048; không gọi `localStorage.clear()`. Giữ bản backup hợp lệ trước khi thay nếu thiết kế có backup. Bản save phiên bản mới hơn không hiểu phải được giữ nguyên, không ghi đè bằng payload cũ; cho chơi ván RAM và giải thích khi cần. Với quota/denial, thất bại backup không được thành crash. Không đợi pagehide/unload mới ghi vì thiết bị có thể đóng tab đột ngột.

Nhiều tab: tối thiểu tránh ghi đè best thấp hơn; ghi rõ last-writer-wins cho active game hoặc đề xuất cảnh báo khi storage event phát hiện thay đổi ngoài tab. Đây là chính sách còn phải chọn khi triển khai, không phải tính năng đã tồn tại.

## 9. Accessibility, mobile và âm thanh

Đây là yêu cầu cải thiện của NewPlayground; không suy ra upstream đã đáp ứng WCAG.

- Native button cho Ván mới/Tiếp tục/4 hướng, tên tiếng Việt, focus-visible và Enter/Space hoạt động. Một tap phải thay thế được một swipe. Mọi chức năng cần đường bàn phím. [W3C Keyboard](https://www.w3.org/WAI/WCAG22/Understanding/keyboard.html).
- Board có nhãn mục tiêu/hướng dẫn, hàng/cột/value/ô trống đọc được. Ưu tiên semantic bảng tĩnh cộng vùng điều khiển rõ ràng; không gắn `role=grid` một cách hình thức rồi dùng mũi tên vừa điều hướng cell vừa chơi. Nếu chọn ARIA grid phải chốt đầy đủ interaction contract.
- Live status `polite`, atomic cho điểm cộng và sự kiện quan trọng, không đọc liên tục animation. Có cách đọc lại toàn bàn theo hàng. Overlay thắng/thua đưa focus tới lựa chọn phù hợp, tiếp tục/restart trả focus về vùng chơi, không tạo focus trap con chồng modal portal. [W3C Status Messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html).
- Chữ thường ≥4.5:1, chữ lớn đủ điều kiện ≥3:1; không chỉ đổi màu để báo merge/win. Kiểm tra high contrast/forced colors, 200% zoom và tất cả tile/overlay. [W3C Contrast Minimum](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html).
- Target nút ≥44 × 44 CSS px theo repo. 44 px là mức enhanced, không gán nhầm là mọi yêu cầu WCAG AA. [W3C Target Size Enhanced](https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced.html).
- Bàn hình vuông `width:100%` với max-width phù hợp vùng game; đo cả khoảng padding/header của modal ở 320/360/390/768 px và desktop, portrait/landscape. Không thu nút dưới 44 px để nhét vừa màn hình.
- `prefers-reduced-motion` có hiệu lực từ đầu và khi đổi trong phiên; không shake/rung ở chế độ giảm chuyển động. [MDN reduced motion](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion), [W3C Animation from Interactions](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html).
- Cây nguồn classic không có bộ audio game. SFX, BGM, rung hiện tại là biến thể NewPlayground. Khuyến nghị silent/no-shake mặc định cho reference; nếu giữ SFX tùy chọn thì dùng audio shared theo mute, gesture unlock, rate limit mỗi transaction, không phát nhiều lần trên resume/hydrate. Kiểm thử iOS Safari; không yêu cầu Web Vibration để chơi.

## 10. Tài sản tự thiết kế, MIT và attribution

### 10.1 Cách dùng nguồn

[LICENSE.txt chính chủ](https://github.com/gabrielecirulli/2048/blob/478b6ec346e3787f589e4af751378d06ded4cbbc/LICENSE.txt) là MIT, copyright **2014 Gabriele Cirulli**. Khi mang mã/CSS hoặc phần đáng kể của nguồn vào bản phát hành, giữ đầy đủ copyright notice và permission notice trong bản phân phối. Credit UI không thay thế file license. Đây là checklist tuân thủ nguồn đã đọc, không phải kết luận pháp lý cho mọi tài sản của website.

Kế hoạch: trong pha triển khai, nếu có code/CSS được chuyển thể, thêm bản nguyên văn LICENSE vào thư mục third-party notices của dự án, ghi commit gốc + file gốc + mô tả thay đổi và đóng gói cùng site. Không đổi MIT của tác giả thành credit chỉ cho NewPlayground; không coi license gốc tự động cấp quyền logo/nhãn hiệu/trang web ngoài repo.

Credit đề xuất ở phần Giới thiệu game: “Dựa trên 2048 của Gabriele Cirulli. Mã tham chiếu theo giấy phép MIT; bản chuyển thể tiếng Việt bởi NewPlayground.” Kèm link tác giả/repo/license. Không tự gọi NewPlayground là website/bản phát hành chính thức của tác giả.

### 10.2 Ledger cần có trước release

| Tài sản dự kiến | Hướng xử lý | Bằng chứng cần bổ sung lúc triển khai |
|---|---|---|
| Board/tile/số | HTML/CSS procedural, giữ nhận diện số; điều chỉnh contrast | Tác giả code mới; phần chuyển thể upstream và MIT nếu có |
| Cover 2048 | SVG/code-native do NewPlayground tự thiết kế, không copy screenshot/live artwork | File, ngày tạo, tác giả, mô tả nguyên bản và license dự án |
| Icon New/Continue/directions | CSS/SVG tự vẽ hoặc text button | Không hotlink; nguồn và giấy phép nếu dùng icon bên ngoài |
| Font | Stack Calibri theo AGENTS, dùng font có sẵn trên thiết bị | Không sao chép file Calibri từ hệ điều hành lên site |
| Clear Sans upstream | Không nhập ở pha này | Nếu cần sau này, kiểm tra riêng nguồn/font license và notices |
| Âm thanh/rung | Silent mặc định; tùy chọn procedural nếu được chọn | Ghi là biến thể, source ownership và mute/reduced-motion |

Repo upstream chứa favicon/Apple touch icon/startup PNG và file Clear Sans; bản game không cần sprite sheet cho tile. Không nhập toàn bộ assets chỉ vì repo ghi MIT. [Intel Clear Sans](https://github.com/intel/clear-sans) công bố font theo Apache 2.0 và có [LICENSE riêng](https://github.com/intel/clear-sans/blob/main/LICENSE.txt); quyền/font provenance cần xem riêng nếu dùng binary đó. Phiên này không tải font, ảnh hoặc audio vào checkout.

## 11. Chứng cứ probe đã chạy

Các probe chỉ đọc source, sửa bản sao trong bộ nhớ để xuất hàm nội bộ, nạp trong Node VM và dùng DOM/storage/timer double. **Không sửa engine, không cài package, không tạo fixture/test runtime trong repo.** Không được báo các probe này thành browser pass.

| Probe | Phương pháp | Kết quả |
|---|---|---|
| Luật hàng/cột | Tất cả 6⁴ hàng với miền `{0,2,4,8,16,32}` × 4 hướng, đặt trong một hàng/cột bàn 4 × 4 | 5.184 board/score khớp upstream |
| Bàn hỗn hợp | 1.000 bàn deterministic, mỗi ô thuộc miền trên × 4 hướng | 4.000 board/score khớp upstream |
| Phạm vi so sánh | Chặn spawn ở cả hai phía; upstream dùng Grid/Tile/GameManager thật, adapter x/y ↔ row/column | Chỉ chứng minh slide/merge/score trên mẫu; không chứng minh RNG/win/render |
| No-op | `[2,0,0,0]` sang trái, đếm `Math.random` | 0 lần rút RNG, board/score không đổi |
| Pop phải | `[2,2,0,0]` sang phải, đọc markup sinh ra | Tile 4 ở cột 3, marker `npPop` ở cột 0 |
| Touch tại x=0 | Tile tại trái, gesture x:0→80 và y:100→100 | Gesture bị bỏ qua bởi guard tọa độ |
| Storage denial | Stub getItem ném lỗi | Launcher throw, không mở xong ván |
| Best lỗi | getItem trả `bad` | `highScore` thành NaN |
| Restart trước overlay | Fixture thua, nhấn Ván mới trước callback, sau đó flush timer | Overlay thua cũ được gắn lên ván có điểm 0 |
| CSS reference | Tìm toàn repo chuỗi `npPop` | Chỉ usage trong engine; chưa thấy keyframes |

Fixture stale-overlay đã tái hiện:

```text
2   2    8   16
8  16   32   64
16 32   64  128
32 64  128  256
```

Đi trái, spawn 4 vào ô trống cuối hàng đầu, bàn trở thành `[4,8,16,4]` ở hàng đầu và không còn nước. Timer nguồn là 350 ms; probe flush bằng timer double, **không chờ/đo 350 ms thực**. Nhấn Ván mới rồi flush tái hiện overlay stale. Một fixture thử đầu tiên còn cặp bằng nhau nên không thua; nó đã được sửa trước khi chốt kết quả trên.

Bộ bàn hỗn hợp dùng LCG 32-bit seed `0x2048`, multiplier `1664525`, increment `1013904223`, lấy `floor(random × 6)` cho mỗi ô. Probe là khám phá nghiên cứu; khi triển khai phải chuyển các ca quan trọng thành test lưu trong repo để CI tái chạy được. Không gọi “9.184 test CI đã pass”.

## 12. Ma trận nghiệm thu phải xây dựng

### 12.1 Test tự động model/storage/input

| Nhóm | Ca tối thiểu | Điều kiện pass |
|---|---|---|
| Core | Fixture mục 3.2, 4 hướng, chuỗi nhiều move | Board/score đúng; immutable hoặc mutation contract rõ |
| RNG | Giá trị 0, sát 0.9, đúng 0.9, sát 1; đầu/cuối danh sách empty | 2 khi <0.9, 4 khi ≥0.9; chọn đúng index; không overwrite ô có tile |
| No-op | Bàn có ô trống nhưng hướng không đổi; hướng terminal | Không spawn/điểm/save transaction mới; không dùng RNG |
| Win | Hai 1024 ghép, nước tiếp theo trước/sau Continue | Chặn trước Continue; tiếp tục trên cùng bàn sau Continue |
| Loss | Bàn đầy không cặp; bàn đầy có ngang/dọc; chỉ cặp chéo | Chỉ trường hợp thực sự không còn nước mới lost |
| Win+loss | Fixture cả hai cờ trong cùng transaction | Priority và thông báo theo quyết định đã ghi |
| Storage | Denial khi lấy property/get/set/remove, quota sau lúc probe, malformed JSON, schema sai/cũ/mới | Game vẫn chơi; không phá namespace khác hoặc save mới hơn |
| Resume | Playing, won-waiting, just-continued, beyond 2048, lost | Bàn/điểm/cờ đúng, không spawn thêm; loss theo active-save policy |
| Input | x/y=0, threshold 10/10.01, diagonal tie, second pointer, cancel/capture loss | Một gesture tối đa một move, hủy không move |
| Keyboard | Modifier, editable, repeat, hai hướng nhanh, focus ngoài game | Không chặn shortcut; không double/lost transaction |
| Lifecycle | Reset lúc slide/spawn/overlay, close/reopen, chuyển game, blur/resize | Không callback ván cũ, không listener nhân đôi |
| Accessibility DOM | Tên button, row/column, live region, focus, reduced-motion CSS | Không chỉ có assert chuỗi mà bỏ interaction contract |

Không dùng thống kê 90/10 ngẫu nhiên ngắn làm test flaky. Test ranh giới RNG có oracle deterministic; có thể thêm kiểm tra phân bố seeded nhiều mẫu như diagnostic riêng, không thay exact-rule test.

### 12.2 Browser, thiết bị và người chơi mới

Tất cả hiện **pending**, owner QA/phê duyệt **chưa được phân công**:

1. Desktop Chrome/Firefox/Edge và Safari nếu nằm trong hỗ trợ: keyboard, held repeat, mouse buttons, tab/focus, đóng/mở lại, zoom.
2. Android Chrome + iPhone Safari thật: vuốt ngắn/dài/chậm/nhanh, nhiều ngón, release ngoài board, cuộn ngoài board, pinch zoom, landscape và background/resume.
3. Viewport 320/360/390/768 và desktop; DPR 1/2/3; text zoom 200%; kiểm tra font fallback, số 1024/2048/4096/16384.
4. VoiceOver/TalkBack hoặc NVDA theo thiết bị được hỗ trợ: hiểu bố cục bàn, nghe delta/terminal, thao tác Tiếp tục/Restart, không mắc focus trap.
5. Reduced motion và high contrast thật; chặn localStorage và hết quota; reload ngay sau Continue; hai tab.
6. Người mới đọc hướng dẫn rồi tự tạo merge, nhận ra no-op, biết thắng/thua và thử tiếp tục; ghi chỗ hiểu sai hoặc bỏ chơi. Không tự bịa tỷ lệ thành công/churn.

### 12.3 Cách đo hiệu năng, không điền số giả

- Ghi build hash, thiết bị/OS/browser/version, refresh rate, viewport/DPR, trạng thái pin/power-save, cold/warm, reduced motion và cách capture.
- Input-to-feedback: đánh dấu lúc handler nhận event và frame đầu có thay đổi; phân biệt input-to-model, event-to-RAF và pixel thực sự được paint. RAF timestamp không tự chứng minh pixel đã lên màn hình.
- Dùng browser performance trace hoặc video tốc độ cao nếu muốn nhận định input-to-visible trên thiết bị. Báo số mẫu và p50/p95; ghi dropped frames/frame pacing riêng.
- Chạy chuỗi hướng nhanh, merge nhiều cặp, board gần đầy và thao tác trong lúc animation. Ghi số input nhận/chấp nhận/transaction, không chỉ FPS trung bình.
- Dòng kết quả hiện tại: **input latency chưa đo; FPS/frame-time chưa đo; tải cold/warm chưa đo; ngưỡng swipe chưa được hiệu chỉnh bằng playtest**.

## 13. Các cổng cho pha triển khai sau nghiên cứu

| Cổng | Deliverable | Trạng thái hiện tại |
|---|---|---|
| G0: chấp thuận thứ tự | Minesweeper được nghiệm thu hoặc có quyết định rõ cho phép mở 2048 | Chưa xác nhận trong nhiệm vụ này |
| G1: chốt scope | Classic 4 × 4, no Undo, tiếp tục sau thắng, Việt hóa/Calibri, những deviation được duyệt | Đề xuất trong tài liệu |
| G2: model/save | Module luật + deterministic tests + corruption/migration coverage | Chưa triển khai |
| G3: input/render | Slide/merge/spawn đúng, rapid input, reset/cleanup, reduced motion | Chưa triển khai |
| G4: browser/device | Ma trận mục 12 với bằng chứng và bug closure | Chưa chạy |
| G5: quyền/release | Asset ledger/notices, full suite, preflight, duyệt phát hành | Chưa chạy |

Khi đến pha implementation: chạy `node --test tests/*.test.cjs`, bổ sung suite 2048 riêng và `node scripts/release-preflight.mjs --prepare` theo README; kiểm tra hồi quy Minesweeper/modal vì dùng chung session/portal. Các lệnh này là kế hoạch, **chưa chạy toàn suite/preflight trong nghiên cứu chỉ-đọc này**. Không cập nhật trạng thái accepted/complete trước G4–G5.

Ưu tiên thực hiện: (1) khóa luật và state/save bằng test, (2) renderer chuyển động + input sạch, (3) accessibility/mobile/asset notices, (4) device QA và so sánh demo thật. Không bắt đầu Line98/Hàng Rong hoặc thêm biến thể 2048 trong cùng thay đổi để bù số lượng game.

## 14. Checklist bàn giao nghiên cứu

- [x] Đọc AGENTS và profile 2048.
- [x] Ghim upstream commit, đọc logic/input/renderer/storage/CSS/license.
- [x] Kiểm tra nội dung demo qua web tĩnh; ghi rõ giới hạn bundle/live play.
- [x] Tách lỗi prototype khỏi quyết định thiết kế và sai khác có chủ ý.
- [x] Ghi phép thử core và các probe tái hiện, không thay thế device QA.
- [x] Lập kế hoạch assets tự thiết kế và MIT attribution.
- [x] Chỉ tạo tài liệu này; không đổi engine/profile/registry/asset/test, không commit/push/deploy.
- [ ] Browser playthrough, số đo và nghiệm thu vẫn dành cho pha sau.


## Phụ lục A. Lệnh tái lập 9.184 phép so sánh

Chạy từ thư mục gốc checkout bằng Node.js 18+ có `fetch`, cần quyền đọc source công khai tại raw.githubusercontent.com. Lệnh không ghi file, không cài package, không chạy browser. Nó tải đúng ba file MIT từ commit đã ghim; nguồn/license ở S1–S3/S9. SHA-256 guard cố ý dừng nếu engine đã khác snapshot nghiên cứu.

Đoạn dưới là **harness tái lập đầy đủ**, không phải pseudocode. Spawn sau move được bỏ ở cả hai model; DOM, timers, audio và persistence không được kiểm chứng bởi phần differential này. Các ví dụ lỗi UI/storage ở mục 11 có fixture/mô tả riêng. Node VM ở đây là cách chạy model độc lập, không được coi là security sandbox cho mã không tin cậy.

```bash
node <<'NODE'
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');

async function main() {
  const SHA = '478b6ec346e3787f589e4af751378d06ded4cbbc';
  const files = ['js/grid.js', 'js/tile.js', 'js/game_manager.js'];
  const sourceParts = await Promise.all(files.map(async file => {
    const url = 'https://raw.githubusercontent.com/gabrielecirulli/2048/' + SHA + '/' + file;
    const response = await fetch(url);
    assert.equal(response.ok, true, 'Không đọc được ' + url);
    return response.text();
  }));
  const ref = {};
  vm.createContext(ref);
  vm.runInContext(sourceParts.join('\n'), ref);

  const source = fs.readFileSync('scripts/engines-classics.js', 'utf8');
  const hash = crypto.createHash('sha256').update(source).digest('hex');
  assert.equal(hash, 'f9d7d1460ee960ba3d7be7a6d47d86ba6452963fa3613f043271236a0666cf7f',
    'Engine khác snapshot nghiên cứu; cần rà lại adapter trước khi so sánh.');
  const start = source.indexOf('  function launchGame2048(');
  const next = source.indexOf('  function launchDXBall(', start);
  assert.ok(start >= 0 && next > start);
  let fn = source.slice(start, next);
  fn = fn.slice(0, fn.lastIndexOf('}') + 1);
  const end = fn.lastIndexOf('}');
  fn = fn.slice(0, end) + [
    'return {',
    '  set(b) { board = b.map(r => r.slice()); score = 0; mergedPositions = []; },',
    '  get() { return { board: board.map(r => r.slice()), score }; },',
    '  move',
    '};'
  ].join('\n') + fn.slice(end);
  const spawnAndRender = 'spawnTile();\n        render();';
  assert.equal(fn.split(spawnAndRender).length - 1, 1);
  fn = fn.replace(spawnAndRender, 'render();');

  const grid = {
    style: {}, innerHTML: '',
    addEventListener() {}, removeEventListener() {}, appendChild() {}
  };
  const button = { addEventListener() {} };
  const container = {
    innerHTML: '',
    querySelector(selector) {
      return selector === '#g2048Grid' ? grid :
        selector === '#g2048Score' ? {} : button;
    }
  };
  const session = {
    setTimeout() {}, clearTimeout() {}, setInterval() {}, clearInterval() {},
    requestAnimationFrame() {}, cancelAnimationFrame() {},
    listen() {}, onCleanup() {}
  };
  const currentContext = {
    window: { NP_GameSession: { start: () => session } },
    localStorage: { getItem() { return null; }, setItem() {} },
    document: {}
  };
  vm.createContext(currentContext);
  vm.runInContext(fn + '\nglobalThis.launch = launchGame2048;', currentContext);
  const current = currentContext.launch(container, {});

  function expected(board, direction) {
    const game = Object.create(ref.GameManager.prototype);
    Object.assign(game, {
      size: 4, grid: new ref.Grid(4), score: 0,
      over: false, won: false, keepPlaying: false,
      addRandomTile() {}, actuate() {}
    });
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        if (board[y][x]) {
          game.grid.insertTile(new ref.Tile({ x, y }, board[y][x]));
        }
      }
    }
    game.move(direction);
    return {
      board: Array.from({ length: 4 }, (_, y) =>
        Array.from({ length: 4 }, (_, x) => game.grid.cells[x][y]?.value || 0)),
      score: game.score
    };
  }

  const values = [0, 2, 4, 8, 16, 32];
  const directions = ['up', 'right', 'down', 'left'];
  let cases = 0;
  function compare(board, direction) {
    current.set(board);
    current.move(directions[direction]);
    assert.deepEqual(JSON.parse(JSON.stringify(current.get())),
      expected(board, direction), JSON.stringify({ board, direction }));
    cases++;
  }

  for (let n = 0; n < 6 ** 4; n++) {
    let q = n;
    const line = Array.from({ length: 4 }, () => {
      const value = values[q % 6];
      q = Math.floor(q / 6);
      return value;
    });
    for (let direction = 0; direction < 4; direction++) {
      const board = Array.from({ length: 4 }, () => [0, 0, 0, 0]);
      if (direction % 2) board[1] = line.slice();
      else for (let y = 0; y < 4; y++) board[y][1] = line[y];
      compare(board, direction);
    }
  }

  let seed = 0x2048;
  function random() {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  }
  for (let n = 0; n < 1000; n++) {
    const board = Array.from({ length: 4 }, () =>
      Array.from({ length: 4 }, () => values[Math.floor(random() * values.length)]));
    for (let direction = 0; direction < 4; direction++) compare(board, direction);
  }
  assert.equal(cases, 9184);
  console.log(JSON.stringify({
    status: 'pass', cases, lineDirectionCases: 5184, fullBoardDirectionCases: 4000,
    upstream: SHA, currentFileSHA256: hash,
    scope: 'slide/merge/score only; spawn disabled; no browser/device QA'
  }, null, 2));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
NODE
```

Output mong đợi: `status: pass`, `cases: 9184`, `lineDirectionCases: 5184`, `fullBoardDirectionCases: 4000`, đúng SHA upstream và SHA-256 engine bên trên. Mỗi ca reset score/flags và kiểm tra một nước trước spawn; không suy ra coverage cho chuỗi ván, win/continue, distribution RNG, save/reload, CSS hoặc touch thật.

Đã chạy lại phần harness với chính nội dung ba file của commit trên, lấy qua connector GitHub; trong lần kiểm chứng này `fetch` được cấp dữ liệu nguồn đã tải thay vì mở kết nối mạng từ Node. Phần so sánh cho kết quả pass như trên. Đường tải trực tiếp bằng Node trong lệnh bàn giao cần mạng cho phép domain nguồn; chưa được xác nhận riêng trong môi trường hiện tại.
