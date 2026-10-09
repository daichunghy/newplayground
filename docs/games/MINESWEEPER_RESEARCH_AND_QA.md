# Dò Mìn: nghiên cứu, phạm vi và chứng cứ triển khai

Cập nhật: 08/10/2026. Game ID: `do-min-minesweeper`. Build ứng viên: `ms1` trên nhánh cục bộ `codex/minesweeper-polish-20261007`, dựa trên gói vận hành `be99262c`. **Chưa phát hành, chưa nghiệm thu thiết bị, chưa công nhận replica hoàn chỉnh.**

## 1. Phạm vi được chọn sau nghiên cứu

Vòng chơi Minesweeper cổ điển, single-player, tiếng Việt: đặt mìn sau lượt mở đầu, đọc số, mở vùng trống, cắm/gỡ cờ, tùy chọn ghi dấu hỏi cho ô chưa chắc, chord, thắng/thua, xem lại bàn, chơi lại. Dấu hỏi là ghi chú: không ảnh hưởng bộ đếm mìn/chord và không ngăn mở ô. Bốn cấu hình độc lập:

| ID | Cột × hàng | Mìn | Mục đích |
|---|---:|---:|---|
| pocket | 6 × 8 | 8 | Bàn do NewPlayground thiết kế cho điện thoại hẹp; không gọi đây là preset cổ điển |
| beginner | 9 × 9 | 10 | Cơ bản cổ điển |
| intermediate | 16 × 16 | 40 | Trung cấp cổ điển |
| expert | 30 × 16 | 99 | Chuyên gia cổ điển |

Cả bốn bàn bảo vệ ô đầu tiên và mọi ô lân cận hợp lệ. Đây là **mở đầu an toàn**, không phải bảo đảm `no-guess`. Không dùng solver, không thêm hint/undo/vật phẩm, tài khoản, leaderboard, nhiệm vụ ngày hoặc multiplayer. Không sao chép giao diện/âm thanh Windows hay nội dung thương hiệu Microsoft.

## 2. Đối chiếu nguồn và quyết định

Mức chứng cứ dưới đây được cập nhật ngày 08/10/2026. Chưa quan sát một phiên chơi đối thủ hoặc đo timing trên thiết bị; con số timing input là lựa chọn thiết kế của bản này.

| Câu hỏi | Nguồn trực tiếp | Áp dụng vào bản này |
|---|---|---|
| Preset và safe-opening so với no-guess | [JSMinesweeper, tài liệu của tác giả](https://github.com/DavidNHill/JSMinesweeper#how-to-use-the-player) | Ba preset cổ điển, pocket ghi riêng; không quảng cáo no-guess |
| Dấu hỏi tùy chọn | [Minesweeper Classic, bản tái hiện mã nguồn mở](https://github.com/enis1enis2/minesweeper-classic) (không phải nguồn Microsoft chính thức) | Đối chiếu quy ước cờ → dấu hỏi → bỏ dấu; không dùng mã/hình của dự án này |
| Thắng và chord | [Minesweeper Online: Gameplay](https://minesweeper.online/help/gameplay) | Mở hết ô an toàn là thắng; cờ không bắt buộc. Chord đòi số cờ bằng số trên ô; cờ sai có thể gây thua |
| Hủy thao tác chạm | [W3C: Pointer cancellation](https://www.w3.org/WAI/WCAG22/Understanding/pointer-cancellation.html), [MDN: Pointer Events](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events) | Chỉ cắm cờ khi thả giữ tay trong ô gốc; kéo, hủy và đa chạm không commit |
| Kích thước mục tiêu | [W3C: Target minimum](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html), [Target enhanced](https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced.html) | 44 × 44 CSS px theo yêu cầu repo; không thu nhỏ Expert. WCAG AA minimum là 24 px có ngoại lệ, 44 px là enhanced |
| Pan/zoom | [MDN: touch-action](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/touch-action) | Cho phép pan và pinch zoom; bỏ khóa zoom viewport của portal |
| Bàn phím và đọc màn hình | [W3C: Grid pattern](https://www.w3.org/WAI/ARIA/apg/patterns/grid/), [Status messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html) | Một điểm Tab trong bàn, phím mũi tên/Home/End, nhãn theo hàng/cột và trạng thái công khai, status không đọc timer liên tục |
| DOM và hiệu năng | [MDN: JavaScript performance](https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Performance/JavaScript) | Tạo ô một lần mỗi ván, event delegation, chỉ cập nhật DOM khi trạng thái ô đổi |
| Giảm chuyển động | [MDN: prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion) | Tắt animation khi người chơi yêu cầu, không screen shake |
| Đồng hồ và âm thanh | [MDN: performance.now](https://developer.mozilla.org/en-US/docs/Web/API/Performance/now), [Web Audio best practices](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices) | Đếm elapsed monotonic, dùng AudioContext chung theo mute của portal, không autoplay nhạc |

Các nguồn chỉ dùng đối chiếu hành vi và hướng dẫn kỹ thuật. Không nhập mã, sprite, âm thanh hoặc font từ các trang trên.

## 3. Luật và state machine

- `ready`: chưa sinh mìn, cờ được đặt trước, đồng hồ chưa chạy.
- Ô che có thể luân phiên trống → cờ → dấu hỏi → trống. Dấu hỏi ghi nhớ điều chưa chắc; nó không tính vào cờ lân cận và vẫn có thể bị reveal/flood/chord mở.
- Mở ô chưa cắm cờ lần đầu: Fisher–Yates hữu hạn trên tập ô ngoài vùng an toàn, sinh đúng số mìn, rồi chuyển `playing`.
- Flood-fill lặp, không recursion; dừng ở ô số, không tự mở ô cờ.
- Chord trên ô số đã mở: kiểm tra số cờ lân cận; mở các ô không cờ khi khớp. Cờ sai có thể làm lộ mìn, trạng thái chuyển `lost`.
- `won`: số ô an toàn đã mở bằng tổng ô trừ mìn, không cần cờ. UI đánh dấu các mìn còn lại.
- `won/lost`: khóa thay đổi board, giữ điều hướng bàn để xem lại, dừng clock, cập nhật stats một lần, bỏ active save. Sai cờ có dấu ×, mìn gây thua có nền riêng.
- `paused` là trạng thái presentation của `playing`: che bàn, loại bàn khỏi focus/accessibility tree, dừng clock. Visibility/pagehide tự pause; trở lại phải chủ động Chơi tiếp.
- Ván mới/đổi độ khó trong lúc chơi yêu cầu xác nhận ngay trong game. Ván đã bắt đầu nhưng bỏ dở vẫn nằm trong mẫu số “ván đã bắt đầu”.

## 4. Cảm giác điều khiển

| Hành động | Binding | Thông số hiện tại | Đo thiết bị |
|---|---|---|---|
| Mở/chord | Nhấp hoặc tap; Enter/Space theo mode | State cập nhật ngay trong handler; không khóa chờ animation | Chưa đo input-to-paint |
| Đánh dấu | Chuột phải luân phiên cờ → dấu hỏi → trống; F hoặc mode cờ/dấu hỏi | Cờ xác nhận; dấu hỏi ghi nhớ; dấu hỏi không bảo vệ ô khi mở/chord | Chưa kiểm tra touch thật |
| Giữ tay | Touch/pen | 450 ms chỉ làm viền “đã sẵn sàng”; release trong ô mới commit | Chưa hiệu chỉnh bằng playtest |
| Hủy hold | Di chuyển / pointercancel / second touch / ra ngoài | Di chuyển >10 CSS px hủy; suppression theo pointer/gesture đến click của đúng lần thả | Cần kiểm tra pan thực và Safari |
| Điều hướng | Mũi tên; Home/End; Ctrl+Home/End | Không wrap cạnh; một tab stop; chỉ cuộn ô cần xem | Cần screen-reader audit |
| Reveal feedback | CSS opacity | 150 ms, không thay thời gian xử lý lượt; reduced-motion tắt | Chưa đo dropped frames |
| Đồng hồ | `performance.now()` | HUD refresh 250 ms, hiển thị giây; pause không tính giờ | Chưa đo background/mobile |

Sự kiện dùng delegation trên grid nên restart không tăng số listener. Không có game loop RAF khi đứng yên. Bàn lớn cuộn trong viewport riêng; preset pocket mặc định khi lần đầu mở trên viewport <=520px. Khi một bàn thực sự tràn ngang, nút mũi tên 44px xuất hiện để chuyển nhanh sang mép còn lại; bàn pocket vừa màn hình không hiện nút này. Tất cả nút/ô giữ tối thiểu 44px theo repo. Không hứa “60 FPS” khi chưa đo thiết bị.

## 5. Art, audio và quyền tài sản

Art direction: xanh rêu/kem, ô đóng có viền nổi nhẹ, ô mở phẳng; chữ số và hình dạng bổ sung màu. Calibri là font hệ thống ưu tiên, không nhúng file font mới.

| Tài sản | Nguồn/tác giả | Quyền và chỉnh sửa |
|---|---|---|
| `assets/minesweeper-original.svg` | Vẽ vector mới cho NewPlayground | MIT của repo; không sao chép hình bên ngoài; có record trong manifest |
| Flag/mine inline SVG trong `scripts/games/minesweeper.js` | Hình học do project viết mới | MIT; không dùng emoji khác nhau theo hệ điều hành cho trạng thái quan trọng |
| `scripts/games/minesweeper.css` | Palette, tile/HUD/focus/feedback do project viết mới | MIT; không tải texture hoặc sprite |
| SFX | Oscillator sine từ synthesizer chung, nốt riêng cho mở/cờ/thắng/thua | Không sample/nhạc ngoài; thấp âm lượng, mute chung, audio không chặn game |

Ảnh cũ `assets/do_min_cover.png` không còn được game/catalog tham chiếu. Vẫn giữ nguyên trong repo để không xóa tài liệu nguồn của chủ dự án. Nguồn/quyền ảnh cũ chưa xác minh và không được tính là đã giải quyết trong đợt này. Pipeline loại ảnh cũ khỏi artifact phát hành Minesweeper; audit 46 file chưa có provenance của toàn portal vẫn là công việc riêng.

## 6. Save và hồi phục

Key mới `np_minesweeper_v1`, JSON schema 1. Chỉ chứa difficulty, stats riêng mỗi preset, board đang chơi (mine/reveal/flag/question indices, firstIndex, status) và elapsed milliseconds. Save schema 1 cũ không có `questions` vẫn restore như danh sách rỗng. Không gửi analytics hoặc dữ liệu tới server.

- Save sau mỗi thao tác thay đổi board, pause, close, pagehide. Không ghi storage mỗi tick đồng hồ.
- Restore kiểm tra preset, kích thước/count/range/uniqueness, overlap cờ/ô mở, vùng first-click, không cho lộ mine hoặc active-board đã thắng. Clue được tính lại từ mine indices.
- JSON hỏng/schema không hợp lệ quay về bàn mới. Storage bị chặn/quota đầy không chặn gameplay, hiện thông báo không lưu được.
- Reload/mở lại active game luôn pause. Không tăng `played` khi resume. Không đụng các localStorage key game khác.
- Timer/hold/animation cleanup thuộc `NP_GameSession`; delayed sound thuộc session. Không tạo worker/socket/fetch mới.

## 7. Kiểm chứng đã chạy và cổng còn mở

Lệnh scoped sau bổ sung dấu hỏi: `node --test tests/minesweeper-model.test.cjs tests/minesweeper-ui.test.cjs`.

Tại checkpoint: **101/101 pass** gồm 75 model, 11 Minesweeper UI contract bằng DOM double, 12 portal/session regression và 3 dialog-focus tests. Chi tiết: `docs/qa/minesweeper-node-tests-20261007.txt`.

Đã kiểm tra tự động: 4 preset; corner/edge/center opening; số mìn và clue; flood độc lập; cờ và dấu hỏi; dấu hỏi không được tính trong chord; đúng/sai chord; thắng không cần cờ; terminal lock; RNG lặp; save roundtrip/corrupt/sparse và tương thích save cũ; keyboard; mode; long-press/synthetic click; cancel/drag/multi-touch; clock/pause; restart/difficulty confirmation; stats; storage lỗi; repeated resets và cleanup. Scoped model/UI-double run: **90/90 pass**. Portal regression vẫn kiểm tra đủ 150 catalog entries với 42 exact launchers/108 planned notices.

`node scripts/release-preflight.mjs --prepare` pass. Đã sửa packager để copy CSS được tham chiếu, giữ registry và phần Hàng Rong từ PR bàn giao. CI nay chạy bộ test trước preflight. Header modal xuống dòng ở điện thoại, nút 44px; dialog có focus entry/trap/restore; thẻ catalog có nút chơi bằng bàn phím. Thay đổi này vẫn cần QA layout/browser. Đã sửa lại guard ID không phải chuỗi trong portal, vốn bị gói bàn giao bỏ mất.

**Chưa chạy/chưa được coi là pass:** screenshot thực, viewport 320/360/390/768/desktop; mouse/touch Safari/Chrome; zoom, screen reader và high contrast thật; audio gesture/mute trên iOS; measured latency/FPS/cold-load; playtest người mới. Công cụ browser/localhost trước đó bị chặn; Chromium độc lập không mở được socket trong môi trường. Chưa có phép thử lại thành công trên đường preview được hỗ trợ. DOM double không mô phỏng layout, browser event synthesis hoặc assistive technology.

Tổng tiến độ vẫn **150 catalog / 42 prototype / 0 accepted-scope / 0 complete-reference-parity**. `ms1` là một bản ứng viên cải thiện một game, không phải 1 game đã nghiệm thu.

## 8. Release / rollback cụ thể

1. Rà diff dựa trên `be99262c`, không ghi đè PR bàn giao hoặc commit main `e013af7` đã sửa lifecycle.
2. Chạy toàn bộ suite, sync inventory và preflight; kiểm tra artifact có model/view/CSS/new SVG, không có ảnh cover Minesweeper chưa rõ nguồn.
3. Browser/device matrix ở mục 7 phải có evidence trước khi gọi scope hoàn tất. Parent/chủ dự án quyết định phát hành; hiện chưa push/merge/deploy.
4. Nếu phát hành có lỗi, revert commit Minesweeper trên branch và đi lại preflight/deploy theo runbook. Không force push. Save dùng key mới nên bản cũ bỏ qua, không phá save khác.
5. Sau Minesweeper: 2048 → Line98 → Hàng Rong theo P1A. Không mở thêm hàng loạt prototype khi cổng Minesweeper chưa đóng.

## Player UI revision: minimal play surface

The current candidate removes visible tutorial paragraphs, slogans and secondary statistics. Essential controls remain; help is short and optional, while accessible labels/live status stay nonvisual. See `docs/PLAYER_EXPERIENCE_DIRECTION.md`. Earlier detailed interface descriptions above document the previous checkpoint. Browser/device acceptance remains pending.
