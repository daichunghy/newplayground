# Line 98 — NP Classic 1: nghiên cứu, phạm vi và bằng chứng QA

Cập nhật: 2026-10-07. Candidate độc lập cho ID `line-98`. Chưa phát hành, chưa nghiệm thu trình duyệt/thiết bị, chưa chứng nhận replica của một bản Windows 1998 cụ thể.

## 1. Kết quả và phạm vi chốt

Một vòng chơi endless hoàn chỉnh bằng JavaScript/CSS thuần: chọn bóng → đường đi hợp lệ → di chuyển → kiểm tra đường → sinh bóng nếu cần → kiểm tra/xóa đường → tiếp tục hoặc hết chỗ. Có ba màu xem trước, điểm/kỷ lục, đi lại một nước, lưu/khôi phục cả RNG, pause, reset có xác nhận, bàn phím và điều khiển chạm có hủy thao tác. Không có máy chủ, quảng cáo, SDK, vật phẩm trả tiền hay phụ thuộc mới.

Tên bộ luật được lưu là `np-classic-1`, schema 1. Đây là bản diễn giải NewPlayground của họ Color Lines, đối chiếu manual Kolor Lines 1.6 và các luật do nhà phát hành remake công bố. Không trộn bom/rainbow/ads của remake vào mode này. Các khác biệt được ghi rõ dưới đây và trong phần Luật chơi ở giao diện.

Đã đọc `AGENTS.md`, `GAME_OPERATING_STRATEGY.md`, `GAME_OPERATIONS_RUNBOOK.md`, backlog, hồ sơ `game-profiles/line-98.md` và pilot `data/game-pilot-plans.json`. Đáp ứng yêu cầu tách simulation, cleanup, preview/RNG/Undo, ký hiệu phụ cho màu và phân biệt kiểm thử nguồn với nghiệm thu thiết bị.

## 2. Nguồn và mức chứng cứ

Tất cả URL dưới đây được đọc ngày 2026-10-07. Không tải hoặc sao chép mã, sprite, ảnh chụp, nhạc hay logo của những game này.

| Nguồn trực tiếp | Phiên bản / mức chứng cứ | Điều dùng để đối chiếu |
|---|---|---|
| [KDE: How to Play](https://docs.kde.org/stable_kf6/en/klines/klines/howto.html) | Manual Kolor Lines 1.6; source-reviewed | Bàn 9×9, khởi đầu ba bóng, tạo ≥5 bóng, lượt ăn điểm không thêm bóng, endless đến khi đầy bàn |
| [KDE: Interface Overview](https://docs.kde.org/stable_kf6/en/klines/klines/interface.html) | Manual; source-reviewed | Thanh xem trước ba bóng |
| [KDE: Menu Items](https://docs.kde.org/stable_kf6/en/klines/klines/menu-items.html) | Manual; source-reviewed | Undo, điều khiển phím, tùy chọn kết thúc lượt và ẩn preview trong bản KDE |
| [GameRange: Color Lines 5 in a Row](https://www.gamerange.com/) | Trang của nhà phát hành remake, truy cập 2026; source-reviewed, không coi là build 1992/1998 | Bảy màu, chỉ đi ngang/dọc qua ô trống, bốn trục tạo đường, bảng điểm một đường dài 5–9: 10/12/18/28/42; remake này còn có bom/rainbow, không thuộc phạm vi NP |
| [Lines98.net: rules and scoring](https://lines98.net/) | Quy tắc của chính website remake; source-reviewed | Xác nhận có biến thể: điểm 5/7/11/17/25 cho 5–9 bóng và Easy Mode khác. Vì vậy không tuyên bố mọi Lines 98 dùng cùng một bảng điểm |
| [W3C: Grid Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/grid/) | Hướng dẫn WAI-ARIA APG; source-reviewed | Một điểm Tab, điều hướng ô bằng mũi tên/Home/End, hàng/ô có nhãn |
| [W3C: Pointer Cancellation](https://www.w3.org/WAI/WCAG22/Understanding/pointer-cancellation.html) | WCAG 2.2; source-reviewed | Chưa thực hiện nước đi ở pointerdown; kéo ra/hủy thao tác không chơi nhầm |
| [W3C: Target Size Enhanced](https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced.html) | WCAG 2.2; source-reviewed | Mục tiêu kích thước chạm 44 CSS px; đây chưa phải chứng nhận WCAG toàn game |
| [MDN: Pointer events](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events) | Tài liệu web platform; source-reviewed | pointerId, primary pointer, pointercancel khi pan/zoom, phân biệt click với pointerdown |
| [MDN: prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion) | Tài liệu web platform; source-reviewed | Tôn trọng thiết lập giảm chuyển động và thay đổi thiết lập trong phiên |

Không có playthrough/video bản gốc được đo trong đợt này. Những URL trên không cấp quyền tái sử dụng art/code hoặc xác nhận timing của bản gốc.

## 3. Hợp đồng luật chi tiết

| Tình huống | Hành vi NP Classic 1 | Bằng chứng |
|---|---|---|
| Khởi đầu | 81 ô, bảy màu, ba bóng ở ba ô khác nhau; preview ba màu | Model + seeded test |
| Đường đi | BFS ngắn nhất qua ô trống, bốn hướng; không vòng từ cuối hàng sang đầu hàng và không đi chéo | Shortest-path, blocked-corner, obstacle tests |
| Chọn / nước không hợp lệ | Chọn bóng không tính lượt; ô bị chặn không thay đổi board, điểm, preview, RNG hoặc Undo | Model + UI tests |
| Ăn điểm thông thường | Xóa mọi đường liên tiếp dài ≥5 ngang/dọc/hai chéo; không sinh bóng, giữ preview/RNG | Four-axis, maximal-line, preview tests |
| Không ăn điểm | Sinh các màu đang xem trước ở tối đa ba ô trống, chọn không lặp vị trí; sinh xong kiểm tra đường | Spawn tests |
| Bàn gần đầy | Còn 1–2 ô thì sinh 1–2 bóng; xóa đường do bóng mới tạo trước khi kết luận thua | Full-board rescue / terminal tests |
| Giao đường | Xóa hợp của các ô, mỗi bóng tính một lần | Two- and four-axis intersections |
| Điểm | Với N bóng khác nhau bị xóa trong một bước xử lý: `10 + 2 × (N−5)²`, N≥5. Một đường 5–9 khớp bảng điểm GameRange, nhưng áp dụng lên hợp các đường là quyết định NP; không phải lời khẳng định scoring của Gamos | Exact table and crossing tests |
| Xóa sạch bàn | Ngoại lệ NP được công bố: đưa ba bóng xem trước vào để tránh bàn rỗng không có bóng nào có thể chọn; sau đó đổi preview. Không tính thêm lượt. Cả bước vẫn Undo nguyên vẹn | Exact preview/positions/RNG all-clear test + UI announcement |
| Thua | Chỉ khi bàn sau xử lý đường đã đầy; không có giới hạn thời gian | Near-full, frozen terminal + Undo tests |
| Đi lại | Chỉ một nước gần nhất; khôi phục board, score, moves, cleared, preview và RNG. Cùng nước đi lại cho cùng kết quả | Replay equivalence and save/restore tests |

Các lựa chọn riêng: không hiển thị trước vị trí sinh bóng; preview màu luôn bật; không có nút bỏ lượt, Easy Mode, bom, rainbow, cloud leaderboard hoặc điểm thưởng tắt preview. KDE có nút bỏ lượt; NP dùng ngoại lệ all-clear thay vì buộc người chơi tìm nút này. Chỉ một mode endless được cam kết trong phạm vi này.

## 4. Simulation, save và dữ liệu lỗi

`line98-model.js` không có DOM/timer/audio/storage. Mọi kết quả luật hoàn tất đồng bộ trước khi chạy hiệu ứng. Mulberry32 có state uint32 được lưu và Undo. Lấy vị trí từ danh sách ô trống thay vì vòng lặp thử lại nên bàn gần đầy luôn kết thúc được.

API: `NP_Line98Model.create(seed?)`, `restore(snapshot)`, `findPath`, `reachable`, `findLines`, `pointsFor`; model cung cấp `move`, `undo`, `view`, `serialize`, `path`, `reachable`. View/serialize trả bản sao dữ liệu. Schema kiểm tra kích thước, kiểu/số màu, preview, RNG, giới hạn số liệu, trạng thái full-board, các đường chưa xử lý và Undo snapshot. Bàn hoàn toàn rỗng bị từ chối vì save hợp lệ của variant này luôn đã replenished.

Storage mới `np_line98_v1` gồm schema, board và Undo snapshot, tùy chọn chuyển động, kỷ lục đã giữ từ các ván trước. Điểm hiện tại chỉ được tính tạm vào kỷ lục; Undo trả lại điểm/kỷ lục của nước bị bỏ. Khi bắt đầu ván mới, giữ điểm ván trước vào kỷ lục. Kỷ lục engine cũ `np_line98_high_score` được đọc và hiển thị riêng vì scoring không còn đồng nhất.

Nếu parse/schema thất bại, lưu chuỗi gốc vào `np_line98_v1_recovery` trước khi thay thế. Nếu backup thất bại do quota/quyền thì không ghi đè chuỗi gốc. Storage bị từ chối không chặn chơi; có thông báo. Không xóa toàn bộ localStorage. Đây là lưu cục bộ, không chống sửa điểm, không đồng bộ nhiều thiết bị hoặc nhiều tab. Không có dữ liệu cá nhân được gửi ra ngoài.

## 5. Điều khiển, mỹ thuật và cảm giác

- Giao diện tiếng Việt, Calibri theo repo; màu giấy/ô xanh dịu, HUD xanh đậm, bàn bi bóng và bảy ký hiệu hình học nguyên bản. Mỗi màu có tên màu lẫn tên hình trong nhãn ô.
- DOM 81 nút ổn định, chấm ô có thể đi, preview đường khi hover/focus, trạng thái chọn và không có đường. Không dựng lại toàn bàn sau mỗi thao tác.
- Mũi tên, Home/End, Ctrl+Home/End; Enter/Space chọn/đi, U Undo, B bỏ chọn. Key repeat không kích hoạt nước đi. Không lấy phím toàn trang. Escape được để cho modal của portal.
- Chạm/nhấp là hai bước chọn bóng rồi chọn đích. Down không commit; di chuyển >10 CSS px, scroll, release ngoài ô, cancel, leave, blur hay chạm nhiều ngón hủy click tương ứng. Không khóa thao tác pinch zoom.
- Ô 48px desktop, 44px trên layout hẹp; board cuộn ngang thay vì co ô quá nhỏ. Có hướng dẫn vuốt. Điều này cần nghiệm thu thực trên điện thoại: không tuyên bố rằng cả 9 cột đều vừa màn 320px.
- Pause ẩn và inert bàn; tab ẩn/pagehide tự pause. Reopen ván đang chơi hiện nút Chơi tiếp. Restart ván đang chơi hỏi trước, hủy giữ đúng trạng thái pause cũ.
- Đường đi Web Animations tối đa 320ms, sinh 140ms, xóa 170ms. Đây là giá trị thiết kế NP, không phải số đo reference. Undo/pause/scroll/resize/close hủy hiệu ứng và dựng kết quả model đã commit; không có luật trong animation callback.
- Chuyển động tắt được trong UI, tôn trọng `prefers-reduced-motion`; không có WAAPI thì dựng kết quả ngay. CSS forced-colors giữ ký hiệu, border/focus. Những hợp đồng này được kiểm thử nguồn/DOM, chưa thử screen reader.
- Âm sine ngắn được tạo bằng AudioEngine có sẵn, warm-up trong tương tác người dùng; đọc lại mute trước mỗi note, không có autoplay nhạc. Lỗi audio không chặn thao tác.

## 6. Hồ sơ tài sản và tải

| File / nội dung | Nguồn / quyền |
|---|---|
| `assets/line98-original.svg` (2,040 bytes) | Vẽ vector nguyên bản trong đợt này từ hình tròn, lưới và bảy glyph; không dựa vào asset tải ngoài; không cần attribution bên thứ ba |
| Gradient bi/ô, glyph SVG nội tuyến trong `line98.js`, style `line98.css` | Tạo mới cho NewPlayground; không dùng ảnh/logo/sprite từ reference |
| SFX | Tone thủ tục qua AudioEngine hiện có; không có sample nhạc/âm thanh ngoài |

Không có thư viện, network request, font tải mới hay file âm thanh bổ sung. Model + view + CSS + SVG tổng 44,299 bytes nguồn chưa nén tại checkpoint QA. Không coi đó là transfer bytes, tốc độ load, FPS hay latency trên máy yếu. Không chạy RAF/timer vòng lặp lúc bàn đứng yên; timer ngắn chỉ phục vụ hiệu ứng và âm thanh. Lead cần bổ sung SVG vào manifest/register theo schema hiện hành; không sửa license toàn repo.

## 7. Kiểm thử đã chạy

Ngày 2026-10-07 trong worktree cục bộ của dot, Node test runner:

- `node --test tests/line98-*.test.cjs`: **38/38 pass** (18 model, 20 UI/source groups).
- `node --test tests/*.test.cjs`: **139/139 pass** tại base `78b598d` cộng module Line98. Đây không phải tổng test của integration branch sau các game khác.
- `node --check scripts/games/line98-model.js` và `node --check scripts/games/line98.js`: pass.
- 100 seed, tối đa 60 lượt mỗi seed: kiểm tra conservation số bóng, không để line chưa xử lý, score delta, turn count, serialize/restore-equivalence sau mỗi nước.
- UI dùng DOM/event/animation/audio doubles và NP_GameSession thật: selection/path, blocked move, keyboard, gesture cancel, multi-touch, delayed synthetic click, pause/reopen, reset confirmation, terminal/Undo, provisional best, animation interruption/reentrant input, reduced-motion/no-WAAPI, backup/quota/denied-storage, audio failure/mute và teardown.

Một test fixture ban đầu đã tạo sẵn đường ≥5 nên restore đúng là từ chối; fixture đã sửa thành một gap trong đường trước khi di chuyển. Source review còn phát hiện và sửa soft-lock khi xóa sạch bàn và lỗi audio có thể ném exception từ callback bất đồng bộ.

DOM doubles không có layout, event bubbling mặc định, hit testing thật, hardware pointer, audio thật, CSS rendering hay accessibility tree. Các test above không được gọi là browser/device QA.

## 8. Cổng còn chờ và checklist nghiệm thu

Không mở lại route localhost/file/data/socket từng bị từ chối, không dùng lối khác để né giới hạn. Chưa có preview route được xác nhận cho trình duyệt. Vì vậy:

| Cổng | Trạng thái |
|---|---|
| Core rules trong scope NP Classic 1 | Implemented + automated/source-reviewed |
| Save/input/lifecycle hợp đồng | Implemented + automated, browser chưa xác nhận |
| Art provenance | Original source recorded; lead còn gắn manifest/register |
| Browser/device/playtest/performance | **Pending** |
| Exact Gamos/Lines 98 reference parity | **Not claimed** |
| Push/merge/deploy | **Không thực hiện** |

Khi có preview hợp lệ, phải thử Chrome/Firefox desktop, Safari iOS, Chrome Android, touch/pinch/scroll thật và bàn phím; viewport 320/375/768/desktop, landscape, 200% zoom, reduced-motion, forced-colors; âm đầu tiên sau unmute và sau resume tab; touch hủy khi scroll; all-clear, full-board spawn rescue, Undo sau animation/loss; close/reopen 20 lần và đổi sang game khác; storage denied/quota/corrupt; mất asset header; đọc nhãn bằng VoiceOver/NVDA; kiểm tra màu/glyph và contrast thực; thu console/network, long frames, p50/p95 latency. Nghiệm thu này cần ghi thiết bị, browser/build, kết quả và ảnh/video riêng.

## 9. Hợp đồng tích hợp cho lead

Phạm vi commit chỉ gồm model/view/CSS, asset, hai test và dossier. Không sửa `index.html`, router, engines chung, catalog, manifest hoặc harness.

1. Thêm `scripts/games/line98.css` sau CSS portal.
2. Load `scripts/games/line98-model.js` rồi `scripts/games/line98.js` trước khi launcher được gọi.
3. Thay thân launcher `launchLine98(container, game)` bằng bắt đầu NP_GameSession và `window.NP_Line98.mount(container, session, window.NP_AudioEngine)`. Không giữ engine legacy chạy song song. Đóng game dùng cleanup chung đang có.
4. Đăng ký `line-98` đúng launcher hiện hành; không thêm fallback/alias.
5. Giữ asset URL tương đối `assets/line98-original.svg`, thêm record nguồn nguyên bản vào manifest/register; cập nhật pilot/inventory là candidate, các gate device vẫn pending.
6. Thêm load hai module vào harness chung nếu integration launcher test cần chúng. Hai test scoped đã load module trực tiếp, không phụ thuộc sửa harness.
7. Chạy combined tests và release preflight sau khi thay wrapper/index. Preflight trước khi wiring không chứng minh module được đóng gói hoặc route đã dùng engine mới.

## Player UI revision: minimal play surface

The current candidate removes visible tutorial paragraphs, slogans and secondary statistics. Essential controls remain; help is short and optional, while accessible labels/live status stay nonvisual. See `docs/PLAYER_EXPERIENCE_DIRECTION.md`. Earlier detailed interface descriptions above document the previous checkpoint. Browser/device acceptance remains pending.
