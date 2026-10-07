# Chiến lược sản xuất và vận hành NewPlayground

Cập nhật 07/10/2026. Mục tiêu: danh mục 500 game có gameplay riêng, được hoàn thiện theo bản tham chiếu đã chọn. Tài liệu này thay thứ tự triển khai sơ bộ trong báo cáo thị trường trước đó.

## 1. Điểm xuất phát và quyết định triển khai

| Hạng mục | Hiện trạng có chứng cứ | Quyết định |
|---|---|---|
| Danh mục | 150 ID, catalog JSON và bản nhúng đồng nhất qua preflight tĩnh | Giữ làm danh mục nghiên cứu |
| Gameplay | 42 launcher riêng; 108 ID chưa có launcher riêng | 42 bản thử nghiệm, 108 mục đang phát triển |
| Hoàn chỉnh | Chưa có game được chứng nhận đủ luật/nội dung/thiết bị so với bản tham chiếu | Không coi 42 prototype là 42 replica hoàn chỉnh |
| Router | Đã bỏ launcher arcade ghi đè và ánh xạ theo substring | Mỗi ID chỉ mở launcher đã đăng ký chính xác |
| Vòng đời | Engine dùng API quản lý RAF/timer; listener window/document được theo dõi; cleanup chung khi đổi/đóng game | Cần nghiệm thu tương tác và tài nguyên trong trình duyệt trước phát hành |
| Tăng tiến | Đã sửa Hàng Rong dùng sai ngưỡng mở giai đoạn; bản lưu cũ được đồng bộ lại giai đoạn | Cần đối chiếu cả kinh tế, công thức và khả năng hoàn thành ca |
| Dữ liệu kinh doanh | Chưa có funnel/retention/doanh thu nội bộ | Chưa xếp hạng bằng doanh thu hay volume giả |
| Hồ sơ tài sản | 128 file tài sản ngoài manifest; 82 có record và 46 chưa có record | Asset register theo file; bổ sung nguồn/quyền, ưu tiên tài sản pilot |
| Phân phối | Có cấu hình GitHub Pages; đã thêm preflight và artifact chỉ chứa site | Đang đưa thay đổi lên nhánh review; chưa merge hoặc triển khai live |

Mở rộng từ 150 lên 500 cần thêm **350 mục danh mục**. Để có 500 game hoàn chỉnh, còn phải hoàn thiện 42 prototype, xây gameplay cho 108 mục cũ và xây thêm 350 game. Tổng 458 mục hiện chưa có launcher riêng; độ khó mỗi mục rất khác nhau.

**Chọn cách làm:** dùng 12 game để hoàn thiện quy trình và các thành phần dùng chung; sau đó xử lý danh mục theo lô. Duy trì HTML/CSS/JavaScript hiện tại. Chỉ đưa engine/framework khác vào khi một loại game thực sự cần nó và đã đo lợi ích.

## 2. Nghiên cứu lại thị trường và đối thủ

Nghiên cứu thị trường chi tiết nằm ở `WEB_GAME_MARKET_AND_500_ROADMAP.md`. Bổ sung lần này tập trung vào cách đối thủ quyết định game nào đủ tốt để phát hành, vì đây là khoảng trống vận hành lớn nhất của project.

| Nguồn trực tiếp | Điều quan sát được từ tài liệu | Áp dụng |
|---|---|---|
| [Poki Player fit test](https://developers.poki.com/guide/player-fit-test) | Đợt thử với 500 người chơi; cần xem ít nhất 10 video playtest trước khi mở công cụ. Ngưỡng chuyển bước là trung bình >3 phút và ít nhất 25% lượt chơi >3 phút. Game mạnh có mức cao hơn. | Xem người chơi thao tác trước; đo phân bố thời gian và nơi rời game. Đây là ngưỡng của Poki, không áp làm KPI bắt buộc cho mọi game ngắn của project. |
| [CrazyGames Quality](https://docs.crazygames.com/requirements/quality/) | Bắt đầu nhanh, hướng dẫn trong gameplay, input phản hồi rõ, mục tiêu dễ hiểu; nội dung phải dễ mở rộng. | Vòng đầu phải hiểu ngay mục tiêu, thao tác và lý do thất bại; thêm màn qua dữ liệu thay vì copy engine. |
| [CrazyGames Technical](https://docs.crazygames.com/requirements/technical/) | Đường dẫn tương đối; yêu cầu kích thước/tải; cần tính đến Chromebook RAM thấp, mobile và AudioContext iOS. | Đo tải ban đầu của từng game trên cấu hình yếu, kiểm tra iframe và Safari; không lấy kích thước toàn repo làm thời gian tải một lượt chơi. |
| [CrazyGames Ads](https://docs.crazygames.com/requirements/ads/) | Không làm quảng cáo cắt ngang gameplay; vị trí banner và thời điểm hiển thị có quy định. | Cơ hội ads gắn với mốc nghỉ; cần cấu hình riêng theo kênh phát hành. |
| [Poki Monetization](https://developers.poki.com/guide/how-monetization-works) | SDK/platform quyết định cách ads vận hành; rewarded cần lựa chọn rõ. | Engagement phải được đo trước khi thử tăng ad opportunity. |

Đối thủ phân phối để tiếp tục theo dõi: Poki, CrazyGames, Y8, GameDistribution và Newgrounds. Với từng portal, hồ sơ cần lưu ngày truy cập, cách tìm game, thumbnail, thời gian đến thao tác đầu, độ dài vòng chơi, vị trí quảng cáo và yêu cầu SDK. Các chỉ số chưa được quan sát trực tiếp để trống.

Newzoo H5, khảo sát Poki và số liệu mobile Việt Nam có mẫu/phạm vi khác nhau. Chúng hỗ trợ lựa chọn web/mobile và game ngắn, nhưng không cho phép suy ra doanh thu H5 Việt Nam hay dự báo traffic NewPlayground. Hướng khác biệt có thể thử: hướng dẫn tiếng Việt tốt, game tuổi thơ dễ tìm, các game đời sống Việt như Hàng Rong, vào chơi nhanh.

## 3. Nguồn dữ liệu để hoàn thiện từng game

Ưu tiên nguồn theo câu hỏi cần trả lời:

1. **Manual/rulebook chính thức:** luật, vật phẩm, chế độ, điều kiện thắng/thua. Ví dụ manual EA cho PvZ PC, manual Konami cho Bomberman '93, instruction sheet Mattel theo đúng edition UNO.
2. **Build bản gốc hoặc bản phát hành hợp pháp:** quan sát timing, animation, hitbox và progression. Trang giới thiệu chỉ xác định phiên bản, không chứng minh các thông số này.
3. **Video gameplay đầy đủ:** đầu game, giữa game, màn khó/boss, death/retry và kết thúc. Lưu URL, timestamp, bản game, FPS video; dùng frame-count để ước lượng timing và ghi sai số.
4. **Wiki chuyên môn, MobyGames, cộng đồng:** tìm ngoại lệ và danh sách nội dung; kiểm chứng luật quan trọng bằng manual/build. Không trộn sequel, mobile và remake.
5. **Mã nguồn có license rõ:** [2048 gốc](https://github.com/gabrielecirulli/2048) là nguồn đối chiếu luật và có MIT. Mỗi repo khác cần đọc license riêng; public repo không tự đồng nghĩa quyền tái sử dụng.
6. **Art/audio:** [Kenney](https://kenney.nl/support), [OpenGameArt](https://opengameart.org/node/5571), itch.io asset packs và bộ tự làm. Ghi license từng pack/file, attribution và quyền sửa/phân phối. Không chuyển ảnh/video tham khảo thành sprite phát hành mặc định.

Mỗi dữ liệu có bốn trường: **nguồn + phiên bản + ngày + mức chứng cứ**. Tách `source-reviewed`, `observed-in-game`, `measured-on-device`, `implemented-and-accepted`. Hiện 12 hồ sơ ở mức đọc nguồn/mã một phần; chưa có video/playthrough/FPS/input latency đo từ thiết bị.

`docs/ASSET_OPERATIONS_REGISTER.csv` liệt kê 128 tài sản hiện có theo file/kích thước/nguồn/license khai báo và việc cần làm. 82 record trong manifest đều trỏ tới file hiện có; 46 file chưa có record. Việc có record chỉ xác nhận hồ sơ khai báo, chưa xác nhận lại quyền từng nguồn hay độ phù hợp với hình ảnh bản tham chiếu.

## 4. Định nghĩa replica hoàn chỉnh

Trước khi làm, chốt bản game, nền tảng và edition. Ví dụ Tetris hiện đại khác bản NES; Diner Dash Adventures khác Diner Dash PC; PvZ PC 2009 khác PvZ2/3; Bomberman khác BnB. Một engine cùng thể loại chưa đủ để thay thế game khác.

Mỗi hồ sơ cần inventory đủ các mode, màn/boss, vật phẩm, luật, trạng thái nhân vật, economy, scoring, input, save và endgame của phạm vi đã chọn. Mỗi dòng có trạng thái `pending/implemented/accepted` và chứng cứ. Bất kỳ khác biệt chủ ý nào cũng được ghi nhận. Không dùng điểm trung bình để che một luật cốt lõi còn thiếu.

Gameplay parity và quyền phát hành phải cùng được giải quyết. Nếu cần giữ chính xác tên, nhân vật, hình ảnh, âm nhạc hoặc nội dung thuộc bản gốc, hồ sơ vận hành cần quyền tương ứng; nếu dùng nội dung tự làm, ghi rõ phạm vi khác biệt. Với bản làm lại nổi tiếng, đây là việc cần xác định trước khi dành ngân sách sản xuất toàn bộ nội dung.

## 5. Lộ trình triển khai có đầu ra

| Đợt | Phạm vi | Đầu ra | Phụ thuộc/cổng chuyển bước |
|---|---|---|---|
| P0 | Toàn portal | Registry chính xác, cleanup chung, thông báo trạng thái, inventory, đóng gói site | Đã sửa mã/chuẩn bị artifact; còn nghiệm thu trình duyệt/thiết bị |
| P1A | Dò Mìn, 2048, Line 98, Hàng Rong | Bốn vòng chơi khép kín; bộ save/input/progression mẫu; hồ sơ theo template | Chọn phiên bản, xác nhận luật, ghi nhận playtest và thiết bị |
| P1B | Tetris, Pac-Man, Zuma, Bomberman | Chuẩn timing, AI, collision, input buffering, path/wave dữ liệu hóa | Dùng runtime/save đã ổn; đối chiếu đặc điểm từng game |
| P1C | Mario, Diner Dash, PvZ, UNO | Prototype có chiều sâu; bản đồ nội dung, economy/AI/turn state đầy đủ theo scope | Cần nhiều nghiên cứu hơn; không ép đạt parity bằng lịch của nhóm puzzle |
| P2 | 30 prototype còn lại | Hoàn thiện hồ sơ và gameplay từng game, theo thứ tự trong backlog | Ưu tiên lỗi nặng và thành phần dùng chung; vẫn cần phiên bản riêng |
| P3 | 108 mục chưa có engine | Discovery trước, engine phù hợp sau; các game bài và puzzle được đề xuất khảo sát trước | Hồ sơ, estimate, quyền nội dung và gameplay riêng trước khi gắn trạng thái playable |
| P4 | Thêm 350 mục | Danh sách nổi tiếng có chứng cứ nhu cầu và nguồn; production theo lô | Khả năng hoàn thành đo từ lô trước; giới hạn công việc đang làm |

P1 là thứ tự học kỹ thuật và phạm vi cơ chế, chưa phải bảng xếp hạng nhu cầu. Solitaire được đưa vào discovery P3 vì hiện chưa có launcher. Các hồ sơ pilot và tiêu chí cụ thể nằm trong `docs/game-profiles/`; backlog 150 game có thứ tự và việc đầu tiên ở CSV/JSON.

### Nhịp sản xuất đề xuất

- Khi chưa rõ nhân lực, chỉ mở đồng thời một game lớn và một việc nền tảng; không chia 500 mục thành 500 công việc đang chạy.
- Một lô nghiên cứu có thể 10–25 ứng viên. Một lô hoàn thiện ban đầu chỉ 3–5 game để đủ sức nghiệm thu; tăng khi có năng suất và chất lượng thực đo.
- Mỗi game qua: research → scope/estimate → simulation/input → progression/items → art/audio → device/playtest → limited release → vận hành.
- Game có vòng chơi tốt nhưng chưa đủ parity vẫn ở prototype; ghi riêng phần thiếu để tiếp tục đầu tư.

## 6. Mở rộng danh mục nổi tiếng lên 500

Đầu vào ưu tiên khảo sát: classic puzzle/board, arcade ngắn, platform/action, management, physics, rhythm, strategy và party. Trò chơi cùng họ dùng lại code hạ tầng, nhưng có dữ liệu luật, bản đồ, AI và progression riêng. Không tính lại một game chỉ vì đổi tên, màu hay level pack.

| Cụm ứng viên | Ví dụ để khảo sát tiếp | Điều phải xác định |
|---|---|---|
| Puzzle/board | Solitaire, FreeCell, Spider, Sudoku, Mahjong, Reversi, Nonogram, Sokoban | Bản luật, seed solvable, hint/undo, mức độ khó và quyền mã/asset |
| Arcade | Arkanoid, Puzzle Bobble, Galaga, Frogger, Asteroids, Breakout | Cơ chế riêng, hitbox, patterns, mode và nội dung; nhiều tên đã có trong 150 |
| Physics/casual | Cut the Rope, Angry Birds, Peggle, World of Goo | Solver/physics determinism, mục tiêu màn, thao tác touch và phạm vi nội dung |
| Management | Các bản Diner/Papa, farm, aquarium, tycoon | Kinh tế, content inventory, thời gian chơi và save; tránh hàng trăm biến thể giống nhau |
| Action/strategy | Mega Man, Sonic, Contra, tower defense, Age of War | Điều khiển, AI/boss, bản đồ/campaign; estimate lớn hơn game board |

Danh sách này là ứng viên, không phải 350 quyền phát hành hay 350 nghiên cứu đã hoàn thành. Mỗi ứng viên mới cần ID duy nhất, phiên bản cụ thể, ít nhất nguồn xác định game, nguồn luật/gameplay, dấu hiệu nhu cầu và estimate. Dùng search trends có thị trường/ngày, impression/click nội bộ và playtest để chọn; không gán volume chưa đo.

Tiến độ 500 theo dõi bốn số độc lập: **catalog / prototype / accepted scope / complete reference parity**. Chỉ số cuối mới tương ứng mục tiêu replicate hoàn chỉnh.

## 7. Hạ tầng cần hoàn thiện trước khi tăng quy mô

| Hạng mục | Việc tiếp theo | Nghiệm thu |
|---|---|---|
| Simulation | Tách update/render; fixed timestep nơi cần physics/grid; giới hạn dt khi resume | Cùng replay/seed không đổi kết quả do 60/120Hz |
| Input | Binding theo game, key edge/held, pointer-cancel, blur/visibility; scaling canvas | Không kẹt nút, double input, scroll trang hoặc lệch aim |
| Tiến trình | Level/wave/item/economy thành dữ liệu; unlock có prerequisite | Tất cả màn trong scope đi tới được, không dead-end |
| Save | Schema/version/migration/backup; lưu ở checkpoint; phân biệt unavailable storage với save hợp lệ | Save cũ/lỗi/quota không làm game không vào được; không ghi đè dữ liệu hợp lệ khi migrate thất bại |
| Art/audio | Style guide từng họ game, sprite atlas, hitbox riêng, âm lượng/mute; reduced motion | HUD đọc được, không che luật; nguồn từng file có hồ sơ |
| Tải | Tách engine pack và lazy-load theo ID sau baseline; giữ đường dẫn tương đối | Không tải cả 500 engine khi mở portal; đo network trước/sau thay đổi |
| Release | Trạng thái từng game + build/version + rollback | Có danh sách game chịu ảnh hưởng và artifact gắn với commit |
| Dữ liệu | Event contract và dashboard theo game/version/input/device/channel | Có funnel đáng tin cậy; không coi modal-open là gameplay-start |

Mã đang có khoảng 0,95 MB JavaScript nguồn được tham chiếu từ index và khoảng 19,72 MB tài sản trên đĩa, theo preflight. Đây không phải transfer bytes đã nén hoặc thời gian tải đo thực tế. Khi lên 500, vấn đề quan trọng là tải tài sản/engine cần cho game được chọn.

## 8. Đo chất lượng và doanh thu

Các event cần triển khai: `game_open`, `game_loaded`, `gameplay_start`, `first_action`, `round_start`, `round_end`, `retry`, `progress_unlock`, `item_use`, `save_error`, `game_error`, `game_close`. Ads bổ sung `ad_opportunity`, `ad_request`, `ad_impression`, `ad_complete`, `reward_granted`. Chưa có hệ thu thập tập trung trong mã hiện tại.

Mỗi event cần game ID, game version, session, thời gian, input/device class và distribution channel; định nghĩa payload tại `docs/TELEMETRY_CONTRACT.md`. Thời gian modal mở gồm đọc menu/tab ẩn, nên không dùng thay playtime. D1/D7 chỉ có ý nghĩa khi đã chọn cách nhận diện cohort và có đủ thời gian quan sát.

Mục tiêu kỹ thuật đề xuất để đo: input phản hồi rõ trong frame đầu có thể xử lý, pacing ổn định ở 60Hz nếu máy đáp ứng; dùng p50/p95 frame-time và long frames thay vì chỉ FPS trung bình. Mọi con số latency/game-speed được chốt sau đo reference và thiết bị. Game âm nhạc, action và puzzle cần tiêu chuẩn khác nhau.

### Doanh thu theo từng bước

1. **Hiện tại:** giữ donation tự nguyện; đo click khác với giao dịch thành công. Chưa có số doanh thu thực nhận.
2. **Sau khi vòng chơi ổn:** thử ads ở mốc nghỉ trên một game; có nhóm không ads; theo dõi start/completion/replay và net revenue/session.
3. **Rewarded:** người chơi chọn, phần thưởng rõ, chỉ grant khi SDK xác nhận hoàn tất; không thưởng khi timeout/no-fill; save transaction chống cấp hai lần.
4. **Portal:** build và adapter riêng theo SDK; xác nhận điều khoản Basic/Full Launch. Basic Launch CrazyGames không được coi là kênh đã có ad revenue.
5. **Sponsor/premium:** ưu tiên game có bản sắc riêng và người quay lại; đưa chi phí art/support/acquisition vào quyết định.

`Ad net = impressions × net eCPM thực / 1000`. Nếu chỉ có gross eCPM thì áp tỷ lệ chia sẻ theo hợp đồng để ra net; không trừ revenue share lần thứ hai khi eCPM đã net. `Contribution = net revenue − chi phí phân phối/traffic/support trực tiếp`. Game có gross revenue không tự chứng minh có lãi.

Không ước tính CPM, fill rate hoặc doanh thu tháng từ nguồn không tương ứng quốc gia, thiết bị và kênh. Dừng hoặc sửa vị trí ads khi việc tăng doanh thu đi kèm suy giảm hành vi chơi vượt mức đã chốt cho thử nghiệm.

## 9. Nhân lực, chi phí và trách nhiệm

Chưa có headcount, ngân sách, đơn giá hay ngày phát hành được xác nhận. Vai trò dưới đây là đề xuất; một người có thể kiêm nhiều vai trò.

| Kết quả | Người chịu trách nhiệm chính | Người thực hiện/phối hợp |
|---|---|---|
| Bản tham chiếu, scope và ưu tiên | Product/Game owner | Research/game design |
| Simulation, input, save, runtime | Tech owner | Developer |
| Content, progression, art/audio | Game owner | Designer/artist/developer |
| Chứng cứ thiết bị và playtest | Quality owner | QA/người chơi thử |
| Phát hành, rollback, sự cố | Release owner | Developer/quality |
| Doanh thu net và retention | Product owner | Data/operations |

Ước lượng theo công việc, không theo số card: research + luật/engine + level/item data + art/audio + save/input + device QA + sửa sau playtest. Sau P1A, ghi actual person-days, lỗi còn lại và số game được chấp nhận; dùng số thực đó để dự báo các họ game tương tự. Game campaign/boss/multiplayer có estimate riêng.

`Capacity tuần = tổng ngày khả dụng − vận hành/support − sửa lỗi bắt buộc`. `Thời gian lô = effort còn lại / capacity hiệu dụng`, sau khi xét phụ thuộc và người có kỹ năng phù hợp. Chưa có input thì cột estimate/date để trống, không cam kết ngày đạt 500.

## 10. Điều kiện bắt đầu vận hành

Đã có registry, inventory, backlog, 12 hồ sơ, template, runbook và artifact tĩnh. Đợt tiếp theo phải hoàn thiện P1A, ghi chứng cứ thao tác/cleanup và thiết bị, kiểm tra quyền tài sản của lô, rồi giới hạn phát hành ở phạm vi đã được nghiệm thu. Dùng `GAME_OPERATIONS_RUNBOOK.md` để điều hành phát hành và xử lý sự cố.
