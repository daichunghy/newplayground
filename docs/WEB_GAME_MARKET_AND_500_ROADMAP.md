# NewPlayground: nghiên cứu thị trường web game và lộ trình 150 → 500

**Ngày rà soát:** 07-10-2026
**Thị trường giả định:** Việt Nam là thị trường ưu tiên; Poki, CrazyGames và các cổng H5 toàn cầu là nguồn đối chiếu.
**Phạm vi:** desk research nguồn công khai + đọc code/tài liệu trong repository. Chưa có dữ liệu DAU, retention, doanh thu, playtest hay đo FPS thực tế của NewPlayground; vì vậy các chỉ số dưới đây không được xem là dự báo doanh thu hoặc kết quả kiểm thử sản phẩm.

## Cập nhật sau chuẩn bị vận hành

Router/fallback đã được sửa trong mã; registry chính xác hiện ghi nhận 42 prototype và 108 mục chưa có launcher riêng. Đã có inventory, 12 hồ sơ pilot đọc nguồn một phần, preflight và artifact site cục bộ. Chưa có nghiệm thu gameplay/thiết bị hay số đo FPS. Thứ tự triển khai hiện hành xem [GAME_OPERATING_STRATEGY.md](./GAME_OPERATING_STRATEGY.md) và [GAME_OPERATIONS_RUNBOOK.md](./GAME_OPERATIONS_RUNBOOK.md). Các phát hiện router ở phần dưới mô tả baseline trước sửa.

## Tóm tắt điều hành

NewPlayground có 150 mục trong danh mục, nhưng danh sách game chưa phải là bằng chứng rằng 150 game đã có trải nghiệm riêng hoàn chỉnh. Cơ sở dữ liệu hiện lưu tên, tagline, thể loại, số người chơi, thời lượng và mô tả cơ chế. Những thứ người chơi cảm nhận được — vòng lặp đầy đủ, cấp độ, độ khó, vật phẩm, sơ đồ nút, độ nhạy, tốc độ, art, hiệu ứng, độ mượt và điều kiện kết thúc — chưa được quản lý trong một bộ hồ sơ thống nhất cho từng game.

**Phát hiện baseline đã xử lý trong mã:** luồng cũ gọi `launchGameSandbox` sau launcher riêng, rồi `launchRetroArcade` thay toàn bộ vùng game. Đợt chuẩn bị vận hành đã bỏ đường này, thay bằng registry exact-ID và cleanup chung. Source inventory xác nhận 42 launcher riêng; chưa nghiệm thu runtime trên thiết bị. Các lỗi cơ chế/nội dung riêng của từng game vẫn nằm trong backlog.

**Cơ hội thị trường:** nghiên cứu Google x Newzoo năm 2026 ghi nhận 46% người tiêu dùng online 13–55 tuổi trong mẫu khảo sát chơi game H5 hằng tháng; 83% người chơi H5 trong mẫu chơi trên smartphone; 45% thường bắt đầu tìm game bằng web search. Mẫu gồm hơn 7.000 người chơi ở bảy thị trường, không có Việt Nam, nên đây là tín hiệu toàn cầu để định hướng, không phải ước lượng quy mô thị trường Việt Nam. Cùng nguồn cho biết doanh thu H5 khó đo chính xác do phân mảnh kênh phân phối. [Google x Newzoo: H5 gamers](https://newzoo.com/reports/a-playbook-for-winning-with-h5-gamers)

**Định vị nên thử:** game Việt/hoài niệm, vào chơi tức thì, tải nhẹ, hoạt động tốt trên điện thoại và máy tính, có chỉ dẫn điều khiển rõ ràng. Cạnh tranh không chỉ bằng số lượng 500 game; cần có game riêng đủ khác biệt, chạy đúng trên thiết bị mục tiêu và khiến người chơi muốn chơi lại.

**Mục tiêu 500 game:** xây 500 hồ sơ game có thể kiểm tra, chọn theo nhu cầu người chơi và chi phí triển khai, sau đó phát hành theo từng đợt. “Tái tạo hoàn chỉnh” nên hiểu là tái tạo trọn vẹn vòng chơi và độ sâu cơ chế đã xác định trong phạm vi được phép: luật chơi, cấp độ, vật phẩm, điều khiển, phản hồi và cân bằng. Không lấy mã nguồn, sprite, âm thanh, nhân vật, tên/logo hoặc màn chơi có bản quyền của game khác nếu chưa có giấy phép. Dùng art, âm thanh và tên gọi nguyên bản hoặc tài sản có quyền sử dụng; ghi nguồn và license vào manifest.

## 1. Những gì kiểm tra được trong project

| Hạng mục | Quan sát source | Ý nghĩa cho kế hoạch |
|---|---|---|
| Danh mục | **data/games.json** có 150 ID duy nhất. | Dùng file này làm danh sách chuẩn hiện tại; các tài liệu tên “100 games” đã cũ. |
| Metadata | Mỗi mục có các trường cơ bản như ID, tên, tagline, category, người chơi, thời lượng và mechanic. | Bổ sung schema nghiên cứu, không nhồi số liệu gameplay vào tagline. |
| Tài liệu | Có catalog 100 game và spec 50 game 101–150. | Spec 101–150 mô tả cơ chế khá sâu, nhưng chưa thay thế hồ sơ playtest, nguồn đối thủ, bảng item/cấp độ, dữ liệu đầu vào và license của asset. |
| Router | **openGameModal** gọi engine theo ID; với nhánh không thuộc Retro50, sau đó luôn gọi **launchGameSandbox**. | P0: bỏ gọi ghi đè hoặc chuyển sang fallback chỉ khi không có engine riêng. Kiểm tra cleanup vòng lặp trước khi phát hành. |
| Engine chung | **launchRetroArcade** gán **container.innerHTML**, nên thay nội dung vùng game. | Rủi ro engine riêng đã khởi chạy vẫn chạy animation/listener sau khi DOM bị thay; cần xác minh và xử lý cleanup. |
| Registry Retro50 | **hasGame** nhận diện Boom Online, Audition, Road Rash, Mega Man, Duck Hunt, Street Fighter, Bloxorz, Age of War, Bubble Bobble và Raft Wars. | Không dùng số mục trong catalog làm số game unique đã hoàn tất. Tạo báo cáo coverage ID → engine thực tế. |
| Claim độ mượt | Tài liệu kiến trúc đặt mục tiêu 60 FPS và tải nhẹ. | Đây là mục tiêu trong tài liệu, chưa có telemetry chứng minh. Cần đo theo thiết bị. |
| Tài sản | Repository có ảnh bìa, sprite, âm thanh và **assets/ASSET_MANIFEST.json**. | Rà license theo từng asset, nhất là cover art và sprite; thiếu art nên không được tự động lấp bằng ảnh không rõ quyền. |

**Kết luận kiểm kê:** trước khi lập doanh thu hoặc quảng bá số lượng game, cần sửa luồng khởi chạy, kiểm kê engine thật cho 150 ID và chơi thử đại diện trên desktop/mobile. Không kết luận rằng mọi game đều lỗi; kết luận là danh mục và code hiện tại chưa chứng minh mức hoàn thiện đồng nhất.

## 2. Tín hiệu thị trường và cách diễn giải

| Tín hiệu đã công bố | Diễn giải được | Giới hạn |
|---|---|---|
| Niko Partners 2026 ước tính Việt Nam có 57 triệu game thủ và doanh thu thị trường game nội địa 678 triệu USD trong 2025; báo cáo Vietnam Mobile Gaming Year-in-Review của Gamota nêu 54 triệu người chơi và 825 triệu USD cho riêng thị trường mobile game 2025. | Việt Nam là thị trường game lớn, đủ cơ sở để đặt Việt Nam làm thị trường nghiên cứu đầu tiên. | Khác phạm vi/định nghĩa và phương pháp; một nguồn là thị trường game, một nguồn là mobile. Không lấy hai số để tính trung bình hay suy ra quy mô H5/browser game. |
| 46% người dùng online 13–55 tuổi trong mẫu bảy thị trường chơi H5 mỗi tháng. | Có một tệp người chơi web đáng kể; web game là kênh phân phối cần nghiên cứu nghiêm túc. | Không phải thị phần, doanh thu, TAM hay tỷ lệ tại Việt Nam. |
| 83% người chơi H5 khảo sát chơi bằng smartphone. | Nên ưu tiên thiết kế mobile-first, nhưng vẫn cần giữ bàn phím/chuột tốt cho desktop. | Tỉ lệ của mẫu khảo sát Google/Newzoo, không đại diện riêng cho NewPlayground. |
| 45% bắt đầu khám phá H5 game bằng web search; 23% vào portal quen thuộc trước. | Tên trang, mô tả, ảnh xem trước và trang riêng cho từng game có vai trò trong khám phá. | Không chứng minh thứ hạng SEO hoặc lưu lượng của một từ khóa cụ thể. |
| Khảo sát Poki tại Mỹ/Anh ghi nhận 37% người trả lời chơi web game nhiều lần mỗi ngày, 86% chơi vài lần mỗi tuần trở lên. | Có nhóm người chơi thường xuyên để thử tính năng quay lại, yêu thích và lưu tiến trình. | Đây là khảo sát do Poki đặt hàng, thị trường và phương pháp khác; xem là nguồn bổ sung, không gộp số với mẫu Google/Newzoo. |
| GameAnalytics 2026 báo cáo retention PC trung vị D7 khoảng 1,1–1,3% cho các game trong bộ dữ liệu của họ. | Nhắc rằng chỉ số return phụ thuộc nền tảng và lifecycle; cần theo dõi cả session/playtime, không chỉ D1/D7. | Không phải benchmark riêng cho H5 hoặc game ngắn trong portal; không dùng làm KPI bắt buộc của NewPlayground. |

Nguồn: [Google x Newzoo H5 study](https://newzoo.com/reports/a-playbook-for-winning-with-h5-gamers), [Poki State of Web Gaming 2026](https://poki.com/blog/state-of-web-gaming-report-2026), [GameAnalytics 2026 mobile & PC benchmarks](https://www.gameanalytics.com/cn/reports/2026-mobile-pc-gaming-benchmarks).

Tham chiếu Việt Nam: [Niko Partners, Vietnam at GameVerse 2026](https://nikopartners.com/knowledge-briefs/) và [Gamota, Vietnam Mobile Gaming Year-in-Review 2025](https://gamota.com/en_GB/gamota-lab/gamota-releases-vietnam-mobile-gaming-year-in-review-2025-report-revenue-reaches-825-million-2/). Đây là dữ liệu toàn ngành/mobile, không phải dữ liệu web game. VNG cũng báo cáo các game vòng đời dài chiếm 46% doanh thu phân mảng game của họ năm 2025 và đặt ngưỡng gắn kết/giữ chân vào quyết định phát hành 2026; xem [VNG Games Annual Report 2025](https://ir.vng.com.vn/vi/business-report/game-onlines). Đây là ví dụ chiến lược của một nhà phát hành, không phải chuẩn áp dụng thẳng cho web game nhỏ.

**Không đưa ra TAM/SAM/SOM bằng một con số giả.** Báo cáo Newzoo nói rõ việc định cỡ doanh thu H5 khó vì phân mảnh phân phối và khó theo dõi doanh thu. Với NewPlayground, con số có ích trước tiên là người vào trang, bắt đầu game, thời gian đến thao tác đầu, chơi hết vòng, chơi lại, quay lại và doanh thu thực nhận theo từng kênh. Muốn ước tính cơ hội Việt Nam thì cần analytics nội bộ và kiểm tra nhu cầu từ Việt Nam; dữ liệu quốc tế chỉ làm prior để chọn thử nghiệm.

Gamota nêu nhóm tạo phần lớn doanh thu mobile Việt Nam là MMORPG, 4X Strategy và Team Battle. Đây là dấu hiệu của một thị trường mobile có doanh thu chiều sâu; không phải lý do để biến collection H5 ngắn thành game IAP nặng. VNG nhấn mạnh vòng đời dài và retention trong hoạt động phát hành; NewPlayground nên mượn kỷ luật đo lường đó, còn lựa chọn doanh thu phải được kiểm tra riêng cho người chơi web.

## 3. Đối thủ và nhóm benchmark

| Nhóm | Đối thủ/nguồn cần theo dõi | Điều cần quan sát khi chơi/đọc | Hướng khác biệt cho NewPlayground |
|---|---|---|---|
| Portal game H5 | [Poki](https://poki.com/), [CrazyGames](https://www.crazygames.com/), [Y8](https://www.y8.com/), [Newgrounds](https://www.newgrounds.com/games), [GameDistribution](https://gamedistribution.com/) | Trang khám phá, tìm kiếm/category, vào game, fullscreen, hướng dẫn, lưu tiến trình, hỗ trợ mobile, tiêu chuẩn QA. | Việt hóa có chất lượng, bối cảnh đời sống Việt, chạy ngay, không bắt tạo tài khoản. |
| Puzzle casual | Bubble shooter, match-3, 2048, solitaire, hidden-object và game tìm điểm khác biệt trên Poki/CrazyGames. Ví dụ [Candy Bubble](https://www.crazygames.com/game/candy-bubble), [Arkadium’s Bubble Shooter](https://www.crazygames.com/game/arkadium-s-bubble-shooter). | Thời gian tới lần ghép đầu, độ rõ của hint, preview/undo, cách tăng độ khó, tần suất combo, thông tin điểm và điều kiện thắng. | Mỗi game có mục tiêu rõ, level ngắn, trợ giúp không làm mất cảm giác suy luận, bảng điểm/local best. |
| Quản lý/thời gian | Papa’s series, Diner Dash và các game nấu/đặt bàn. Ví dụ [Papa’s Pancakeria](https://www.crazygames.com/game/papas-pancakeria). | Số trạm thao tác, độ căng của timer, thứ tự đơn, đánh giá kết quả, tiền thưởng, nâng cấp thiết bị và thời gian khách chờ. | Chủ đề và món Việt; nâng cấp ảnh hưởng chiến thuật thật; không kéo grind để ép xem quảng cáo. |
| Arcade và platformer | Game chạy nhảy, bắn màn hình ngang/dọc, bắn mục tiêu, game thùng cũ được tái phát hành trên portal. | Quán tính, gia tốc, khoảng dừng, knockback, nhịp xuất hiện nguy hiểm, checkpoint, hitbox, độ trễ phản hồi. | Điều khiển chính xác bằng bàn phím và cảm ứng; có màn làm quen ngắn, tốc độ mở đầu dễ tiếp cận. |
| Chiến thuật/phòng thủ | Tower defense, RTS nhẹ, Age of War-style và game xây quân. | Thời gian thu tài nguyên, counter unit, khoảng cách/cooldown, mật độ địch, thời gian trận, snowball và khả năng comeback. | Trận ngắn có điểm dừng; mô tả rõ vai trò và chi phí đơn vị; cân bằng theo lượt mô phỏng. |
| Game party/board | Cờ, bài, đố chữ, vẽ đoán, game 2 người chung máy. | Hướng dẫn luật, tốc độ bot, chia sẻ thiết bị, rematch, lượt chờ, cách hỗ trợ người chơi mới. | Ưu tiên pass-and-play hoặc bot trước khi hứa multiplayer online; tránh mô tả online nếu chưa có backend/matching. |

Các portal là đối thủ phân phối và nơi lấy chuẩn trải nghiệm, không phải dữ liệu trực tiếp về doanh thu từng game. Poki mô tả game được tuyển chọn theo UX/core loop/chất lượng kỹ thuật; CrazyGames công khai QA, quality guidelines, analytics dashboard và yêu cầu SDK. Xem [Poki: What we look for](https://developers.poki.com/guide/what-we-look-for), [Poki quality requirements](https://developers.poki.com/guide/requirements-quality), [CrazyGames quality guidelines](https://docs.crazygames.com/requirements/quality/) và [CrazyGames requirements](https://docs.crazygames.com/requirements/intro/).

## 4. Nguồn dữ liệu để nghiên cứu từng game

Ưu tiên dữ liệu trực tiếp và có thể ghi lại. Không để một bài tóm tắt thứ cấp trở thành nguồn duy nhất cho luật chơi, item hoặc tốc độ.

| Cần bổ sung | Nguồn nên dùng | Trường cần ghi |
|---|---|---|
| Nhu cầu và danh tiếng | Google Trends theo Việt Nam + Worldwide; Similarweb cho portal; trang game trên portal; YouTube search/views mới và lịch sử; khảo sát người chơi của NewPlayground. | Tên từ khóa, khu vực, mốc thời gian, search interest tương đối, số trang/portal có game tương tự, ngày chụp số liệu. |
| Thị trường H5 | Google x Newzoo H5 report; Poki State of Web Gaming; báo cáo GameAnalytics để tham khảo chỉ số theo nền tảng. | Cỡ mẫu, quốc gia, ngày khảo sát, định nghĩa web/H5/PC/mobile; đánh dấu dữ liệu nào không áp dụng thẳng cho Việt Nam. |
| Gameplay, điều khiển, độ khó | Chơi bản được cấp phép/đang lưu hành ở Poki/CrazyGames/Newgrounds; trang hỗ trợ/manual chính thức; video gameplay của publisher hoặc người chơi để rà lại tình huống cụ thể. | Build/URL, thiết bị, input, thời gian đến thao tác đầu, hành động hợp lệ, điểm, tử vong, điều kiện kết thúc, tiến trình/độ khó, ngày quan sát. |
| Tiến trình và vật phẩm | Manual/guide của publisher; build hiện có; wiki/forum chỉ dùng đối chiếu khi không có nguồn chính thức. | Tên vật phẩm nội bộ, hiệu ứng gameplay, thời gian tồn tại, chi phí, điều kiện mở, tương tác/khắc chế; phân biệt tính năng bản gốc với thiết kế mới. |
| UI, ảnh, animation, audio | Screenshot/video làm reference nội bộ; asset nguyên bản do đội ngũ tạo; asset có license rõ. | Mood/palette, kích thước vùng chơi, trạng thái animation, âm thanh cần có, nguồn asset, author, license, sửa đổi và ghi nhận trong manifest. |
| Độ mượt và tương thích | [CrazyGames gameplay requirements](https://docs.crazygames.com/requirements/gameplay/), [Poki quality requirements](https://developers.poki.com/guide/requirements-quality), [MDN performance guides](https://developer.mozilla.org/en-US/docs/Web/Performance/Guides), Chrome DevTools/Lighthouse và đo trên thiết bị mục tiêu. | Thời gian tải, lỗi khởi chạy, FPS/frame-time theo máy, dropped frame, resize/orientation, input-to-feedback, tab hidden/pause, dung lượng tải. |
| Tài sản dùng được | [Kenney license/support](https://kenney.nl/support) (asset Kenney nêu là public domain/CC0; vẫn lưu bản license cụ thể); [OpenGameArt FAQ](https://opengameart.org/node/5571) (license do từng tác giả chọn, cần rà từng trang asset). | URL tải, tác giả, license/phiên bản, attribution bắt buộc, sửa đổi có cho phép không, file license được lưu cùng asset. |
| Monetization | [Poki monetization overview](https://developers.poki.com/guide/how-monetization-works), [Poki requirements](https://developers.poki.com/guide/requirements-quality), [CrazyGames ad/in-game purchase requirements](https://docs.crazygames.com/requirements/intro/). | Kênh phát hành, kiểu ad cho phép, ad placement, fill, eCPM theo vùng/thiết bị từ dashboard thực, platform share, conversion, doanh thu net. |

**Thứ tự tin cậy của một ghi chú:** (1) chơi build và quay lại thao tác; (2) tài liệu/publisher chính thức; (3) platform QA/analytics; (4) nghiên cứu thị trường có phương pháp/cỡ mẫu; (5) review, video, wiki/forum; (6) suy luận của nhóm. Mỗi ghi chú nên có nhãn “đã đo”, “quan sát”, “tham khảo”, hoặc “giả thuyết” và thời điểm truy cập.

### Hồ sơ nghiên cứu bắt buộc cho từng game

Tạo một trang/hồ sơ theo ID game với các phần sau:

1. **Định vị và benchmark:** game nào cùng thể loại/cơ chế; lý do người chơi tìm đến; điểm riêng của bản NewPlayground.
2. **Vòng chơi:** trạng thái bắt đầu, thao tác đầu, loop 30–60 giây, loop 3–5 phút, thắng/thua, chơi lại/tiếp tục.
3. **Tiến trình:** danh sách level/wave/round, mục tiêu mỗi chặng, đường tăng độ khó, checkpoint, điều kiện mở khóa.
4. **Item và kinh tế:** item, hiệu ứng, thời lượng/cooldown, giá, nguồn nhận, tương tác và khả năng gây mất cân bằng. Không thêm currency chỉ để tạo grind.
5. **Điều khiển theo thiết bị:** desktop keyboard/mouse và mobile touch; hành động cho từng nút; phương án remap; gesture/hit area; pause; focus lost; trạng thái đầu vào khi giữ/nhả.
6. **Độ nhạy/tốc độ:** tốc độ di chuyển, gia tốc, giảm tốc, lực ném/bắn, vùng deadzone, tốc độ lặp phím, độ rộng timing window, tốc độ game theo cấp. Ghi bảng giá trị và cách chúng được cảm nhận, không chỉ ghi “nhanh/mượt”.
7. **Visual/audio:** moodboard do nhóm tự tạo, HUD, bảng màu, sprite/style, animation states, hit/score feedback, hiệu ứng/âm thanh, quyền sử dụng từng tài sản.
8. **Thiết bị và QA:** khung hình mục tiêu, máy/viewport, độ phân giải, thời gian tải, lỗi, frame pacing, tương thích bàn phím/chuột/cảm ứng, a11y cơ bản.
9. **Analytics:** game start/first input, tutorial/level completion, fail/restart, item picked/used, control type, session length, return, ad prompt/accept/finish và revenue nếu có.
10. **Business/rights:** mô hình doanh thu phù hợp, nơi được phép phát hành, tình trạng quyền đối với tên/nhãn hiệu/art/audio/code/level; ngày cập nhật.

## 5. Chuẩn game feel, điều khiển và tốc độ

Các nền tảng web game yêu cầu giao diện phù hợp desktop/mobile, điều khiển dễ hiểu và hướng dẫn trực quan. Poki nêu rõ cần điều khiển thích ứng theo thiết bị; CrazyGames yêu cầu game hỗ trợ mouse/keyboard/touch nếu có hỗ trợ mobile, nội dung dễ đọc và gameplay chạy mượt. Đây là tiêu chuẩn QA tham khảo, không phải bằng chứng mọi game của NewPlayground đã đạt. Xem [Poki requirements](https://developers.poki.com/guide/requirements-quality), [CrazyGames gameplay](https://docs.crazygames.com/requirements/gameplay/), [Poki browser-game quality guide](https://poki.com/blog/what-makes-high-quality-browser-game).

| Họ game | Desktop | Mobile | Thông số cần tune riêng |
|---|---|---|---|
| Platformer/runner/fighter | Mũi tên/WASD; phím hành động; remap nếu combo nhiều. | Nút ảo lớn hoặc vuốt/lane tap; tránh che nhân vật. | Gia tốc, air control, coyote/buffer time, knockback, tốc độ camera, combo input window. |
| Bắn/aim/physics | Mouse aim + click/hold; bàn phím cho di chuyển. | Aim bằng tap/drag; nút bắn riêng nếu cần. | Hệ số lực, độ nhạy góc, tốc độ ngắm, thời gian giữ, đường preview, vùng aim. |
| Puzzle/board/card | Click, drag, phím tắt hợp lý; undo/hint nếu đúng thể loại. | Tap hoặc drag với snapping rộng và xác nhận rõ. | Thời gian animation, auto-repeat, drag threshold, hitbox, undo/hint cost. |
| Management/tycoon | Click nhanh/chọn nhiều; hiển thị phím phụ. | Chạm vùng đủ lớn, không đòi thao tác hover. | Thời gian khách chờ, cooking/timer, tốc độ chuyển trạm, sai sót và forgiving window. |
| Rhythm/reflex | Bắt phím đúng frame, latency calibration, remap. | Hit zone lớn, không dùng bài nhạc có quyền chưa rõ; audio calibration. | Timing window theo độ khó, tốc độ note, input latency, calibration offset. |
| Chill/sandbox | Pointer, click-drag, phím reset/undo. | Touch/stylus, zoom/pan nếu cần. | Quán tính, friction, tốc độ mô phỏng, giới hạn thao tác và mức áp lực. |

**Chuẩn chung cần đưa vào mỗi hồ sơ:** phím ESC/Space để pause/resume khi phù hợp; hướng dẫn xuất hiện trước hoặc tại lần input đầu; hiển thị nút theo loại thiết bị; không giữ nút sau khi tab mất focus; âm thanh tắt được; text/HUD đọc được ở kích thước iframe/mobile.

**Mục tiêu đo nội bộ đề xuất, cần playtest để hiệu chỉnh:** giữ 60 FPS trên thiết bị đáp ứng được; trên máy yếu ưu tiên frame pacing ổn định và có fallback thay vì hiệu ứng giật. Dùng frame-time và tỷ lệ frame vượt ngân sách theo thiết bị; 60 Hz có ngân sách khoảng 16,7 ms/frame. Đo input-to-feedback riêng cho thao tác nhanh và thao tác thường. Không áp chung một tốc độ cho mọi thể loại; đề xuất ít nhất ba cấu hình độ khó/tốc độ cho game có đường cong tăng dần. Các mục tiêu này là target nội bộ, không phải số benchmark được trích từ portal.

## 6. Monetization phù hợp với NewPlayground

### Mô hình doanh thu nên thử theo thứ tự

1. **Ủng hộ tự nguyện/donation:** phù hợp với lời hứa chơi ngay, không tạo rào cản. Architecture doc có nhắc Ko-fi nhưng cần xác minh trạng thái triển khai và doanh thu.
2. **Ads sau mốc nghỉ tự nhiên:** chỉ thử sau màn, sau round hoặc lúc người chơi tự chọn nghỉ; không phát trước lần input đầu và không chặn core gameplay. Theo dõi tác động tới game start, completion, return và doanh thu net.
3. **Rewarded ad tự chọn:** thêm lượt/retry hoặc một tiện ích không làm mất ý nghĩa chơi; phần thưởng phải rõ, có thể từ chối và không bắt xem nhiều video liên tiếp. Không thưởng nếu ad không chạy.
4. **Tài trợ thương hiệu theo mùa/mini-event:** thử với bối cảnh đời sống Việt và nội dung được thiết kế riêng; không biến nhân vật/đồ vật có thương hiệu thành quảng cáo không được phép.
5. **Mỹ phẩm/premium/ad-free:** chỉ xem xét sau khi có bằng chứng người chơi quay lại và muốn tùy biến. Bản đầu có thể bán sản phẩm ủng hộ minh bạch; không thêm currency kép, loot box hay pay-to-win.
6. **Phân phối qua portal:** thêm adapter riêng cho SDK và điều khoản từng cổng. Poki chỉ cho hệ quảng cáo của họ, không cho IAP nội bộ trong các game của họ; CrazyGames dùng quảng cáo revenue share và một số game được chọn có thể dùng IAP. Không dùng một cấu hình ads chung cho mọi kênh.

Poki nói engagement phải đi trước ad strategy; quảng cáo thưởng phải tùy chọn, không được khóa tiến trình; họ cũng cấm third-party ad system trong build Poki. CrazyGames nêu quảng cáo SDK là mô hình chính và IAP chỉ áp dụng với game được chọn. Xem [Poki monetization](https://developers.poki.com/guide/how-monetization-works), [Poki quality/monetization rules](https://developers.poki.com/guide/requirements-quality), [CrazyGames monetization and requirements](https://docs.crazygames.com/requirements/intro/).

### Mô hình tính doanh thu (chỉ điền khi có số liệu)

- Ad gross = ad requests × fill rate × eCPM thực theo quốc gia/thiết bị ÷ 1.000.
- Ad net = ad gross × tỷ lệ chia sẻ của portal/network.
- Tổng net = ad net + donation + sponsor + doanh thu sản phẩm được phép.

Dashboard tối thiểu phải tách theo game, quốc gia, device, nguồn traffic, loại ad và phiên bản game. Không lấy CPM bên ngoài internet làm dự báo NewPlayground; dùng số thực trong dashboard sau khi có lưu lượng và điều khoản cụ thể. Đặt giới hạn tần suất theo platform; trên build tự phát hành, bắt đầu bằng vị trí sau round và so sánh với nhóm không có ad.

## 7. Thứ tự triển khai từ 150 lên 500

| Đợt | Công việc | Cổng chấp nhận |
|---|---|---|
| P0 — Nền tảng | Sửa router/fallback; đảm bảo chỉ một game loop chạy; cleanup listener/RAF khi đóng; tạo bảng 150 ID → engine → trạng thái; thống nhất 1 schema cho game profile và asset provenance. ID chưa có game riêng phải hiện trạng thái chưa hoàn thiện, không bị tính như một game khác tên. | Mỗi ID mở đúng engine; không có engine arcade chung ghi đè engine riêng; không còn animation/listener của game đã đóng. |
| P1 — Pilot 12 game | Pilot phủ 2 puzzle, 2 arcade, 2 action/platformer, 2 management, 2 strategy/board, 2 chill/party: Tetris, Dò Mìn, Pac-Man, Zuma, Super Mario, Bomberman, Hàng Rong, Diner Dash, Plants vs Zombies, Age of War, UNO và Solitaire. Đây là pilot sơ bộ của baseline; kế hoạch hiện hành thay đổi để ưu tiên engine sẵn và độ phức tạp, xem GAME_OPERATING_STRATEGY.md. | Mỗi game có hồ sơ, build chơi được, QA desktop/mobile theo input dự kiến, và một vòng chơi khép kín. |
| P2 — Backlog 150 | Nghiên cứu từng ID trong CSV, xếp theo demand × fit × cost; giữ các game cùng họ chung engine nhưng có luật, level, item, feedback và visual identity riêng. | Không có mục được tính là “hoàn chỉnh” nếu chỉ đổi tên, màu hoặc tagline trên cùng một mini-game. |
| P3 — Thêm 350 mục | Mở rộng danh sách nổi tiếng theo vùng/ngôn ngữ; mỗi đợt thêm khoảng 25–50 game sau khi có xếp hạng nhu cầu, nguồn benchmark, estimate và quyền phát hành. | Duyệt từng đợt; không công bố 500 “game hoàn chỉnh” khi chỉ có 500 card/catalog entry. |
| P4 — Tối ưu doanh thu | Thử donation, ad tự chọn, vị trí ad sau round, sponsor; build tích hợp portal có adapter riêng. | Doanh thu net dương và không làm giảm đáng kể start/completion/return; kết luận theo dữ liệu từng game. |

### Cách xếp hạng 350 game mới

Chấm điểm 1–5 và giữ nguồn dữ liệu cùng ngày truy cập:

- Nhu cầu/tìm kiếm tại Việt Nam và quốc tế: 20%.
- Nhận diện của game và độ khớp với tệp người chơi mục tiêu: 15%.
- Khác biệt của NewPlayground/local angle: 15%.
- Vòng chơi ngắn, dễ vào, có lý do chơi lại: 15%.
- Dùng lại engine/tooling mà vẫn giữ gameplay riêng: 10%.
- Hỗ trợ được desktop và mobile theo cơ chế: 10%.
- Chi phí/độ phức tạp ước tính: 10%.
- Nguồn benchmark và tài sản hợp pháp: 5%, đồng thời là **điều kiện chặn** nếu quyền không rõ.

Điểm số chọn game chỉ là bộ lọc ưu tiên, không thay cho playtest. Từ khóa nổi tiếng có thể tạo nhu cầu nhưng không chứng minh quyền dùng tên, artwork hoặc nhân vật.

### Các game pilot ứng viên — tạm thời

Danh sách này để phủ cơ chế, **chưa được xếp hạng nhu cầu từ search/analytics Việt Nam**: Hàng Rong, Tetris, Dò Mìn, Pac-Man, Zuma, Super Mario, Bomberman, Diner Dash, Plants vs Zombies, Age of War, UNO và Solitaire. Đây là pilot sơ bộ của baseline; kế hoạch hiện hành thay đổi để ưu tiên engine sẵn và độ phức tạp, xem GAME_OPERATING_STRATEGY.md. Sau P0, xác minh build thật rồi mới khóa 12 game và bắt đầu đo.

## 8. Backlog theo từng game hiện có

**docs/GAME_RESEARCH_BACKLOG.csv** chứa đủ 150 ID/tên/cơ chế hiện có, họ game, đợt ưu tiên sơ bộ và các cột cần nghiên cứu cho từng title: benchmark, tiến trình/vật phẩm, điều khiển/độ nhạy, hình ảnh/license, độ mượt, monetization và nguồn. Trạng thái được phân biệt prototype/planned và mức nghiên cứu; hiện 12 pilot đã có hồ sơ đọc nguồn một phần, các mục còn lại chưa khảo sát bản tham chiếu. Đây là backlog hành động; không giả làm kết quả nghiên cứu từng game.

Cột priority hiện chia P1A/P1B/P1C, P2 và P3-discovery; đây là thứ tự thực hiện kỹ thuật, chưa phải kết luận từ volume tìm kiếm. Bổ sung 350 game mới như record 151–500 trong cùng schema sau khi kiểm tra quyền và demand; các record không có gameplay riêng vẫn ở trạng thái catalog-only.

## 9. Dashboard chất lượng và kinh doanh

**Funnel:** impression → game page/open → first input → tutorial/start complete → first level/round complete → replay → return.
**Feel:** thời gian đến first input, dropped frames, frame-time percentile, input-to-feedback, error rate, quit reason và cảm nhận của người chơi sau playtest.
**Progression:** level/wave completion, thời gian mỗi level, fail/retry, item pick/use/effect, điểm theo skill band.
**Monetization:** ad eligible/opportunity/request/fill/impression/reward complete; donation; sponsor conversion; net revenue theo session; so sánh với hành vi chơi không ad.
**Segment:** game ID, version, desktop/mobile, input type, viewport/device class, locale và acquisition source.

Không đặt KPI D1/D7 giống nhau cho puzzle một lượt, casual dài hạn, multiplayer và game chill. GameAnalytics PC benchmark dùng để đọc xu hướng PC; H5/short-session target cần thiết lập từ cohort NewPlayground của chính mình.

## 10. Giới hạn và bước xác minh kế tiếp

- Số liệu thị trường hiện dùng là khảo sát quốc tế/US-UK; chưa có ước lượng đại diện cho người chơi web game Việt Nam.
- Chưa chạy build trong trình duyệt, quay video đối thủ hoặc đo độ trễ/FPS. Phát hiện router là source review, cần xác nhận sau khi sửa.
- Chưa có analytics hay doanh thu nội bộ để xếp hạng game theo hiệu suất.
- H5 revenue không có một tổng số toàn cầu đủ tin cậy trong nguồn đã rà; nên dùng traffic/funnel và doanh thu thực của từng kênh.
- Các trang marketplace và điều khoản SDK thay đổi; kiểm tra lại trước khi phát hành từng build.
- **GAME_RESEARCH_BACKLOG.csv** là kế hoạch nghiên cứu, không phải 150 kết luận đối thủ.

**Bước thực tế tiếp theo:** nghiệm thu nền tảng launcher/runtime sau sửa, hoàn thiện P1A theo hồ sơ Dò Mìn, 2048, Line 98 và Hàng Rong; ghi playthrough, thiết bị và actual effort. Dùng kế hoạch vận hành hiện hành để quyết định lô tiếp theo.
