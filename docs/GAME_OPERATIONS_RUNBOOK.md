# Runbook vận hành và phát hành

Cập nhật 07/10/2026. Site thuần static; không cần npm/build framework. Đợt này chuẩn bị cục bộ, chưa phát hành live.

## 1. Nguồn sự thật và cập nhật danh mục

| Nội dung | File |
|---|---|
| Catalog/metadata | `data/games.json`; bản nhúng phải đồng nhất ở `games-data.js` |
| ID → launcher | `scripts/game-registry.js` |
| Vòng đời tài nguyên | `scripts/game-session.js` |
| Hồ sơ 12 pilot | `data/game-pilot-plans.json` |
| Inventory trạng thái, việc cần làm, cổng nghiệm thu | `data/game-operations.json` |
| Chứng cứ nghiệm thu được giữ qua các lần sync | `data/game-quality-evidence.json` |
| Danh sách làm việc | `docs/GAME_RESEARCH_BACKLOG.csv` |
| Hồ sơ đọc được | `docs/game-profiles/*.md` |
| Tài sản, nguồn và phần hồ sơ thiếu | `docs/ASSET_OPERATIONS_REGISTER.csv` |

Sau sửa catalog/registry/pilot, đồng bộ inventory:

```bash
python3 scripts/sync_game_operations.py
node scripts/release-preflight.mjs --prepare
```

Generator phân biệt engine prototype/planned và trạng thái nghiệm thu. File quality evidence hiện trống nên toàn bộ release gates pending. Ghi kết quả vào file evidence; không sửa riêng file JSON được sinh. Mỗi ID cần `scope` (limited-release/reference-complete), `reference_version`, `accepted_build`, `owner`, `accepted_at` và `gates`. Mỗi gate có `status` và `evidence`; chỉ đủ tám gate accepted có chứng cứ mới được ghi release_ready. Chứng cứ giữ qua sync. Khi code/scope thay đổi, owner phải chuyển các gate chịu ảnh hưởng về pending và nghiệm thu lại theo build mới.

Thêm engine: export launcher riêng; đăng ký ID chính xác; dùng scheduling/session API; chốt luật, nội dung và hồ sơ. Không dùng substring hoặc fallback game khác để tăng số game playable. `lat-the-tri-nho` giữ ID lịch sử từng gắn nhãn Pikachu, nhưng hiện mở ứng viên Nối Hình nguyên bản theo luật Connect/Onet tổng quát; chưa xác định được edition gốc và đây không phải game lật thẻ memory.

## 2. Chuẩn bị một bản phát hành

1. Chốt danh sách game và phạm vi; ghi build/commit, owner, lỗi còn lại và trạng thái từng game.
2. Đọc hồ sơ/template và thu chứng cứ luật/input/nội dung/save/thiết bị. Source preflight không nghiệm thu gameplay.
3. Chạy preflight để kiểm tra ID, catalog nhúng, registry, inventory, asset JSON và cú pháp script; tạo `.pages-site`.
4. Mở preview artifact bằng server static và thực hiện checklist thiết bị khi được yêu cầu nghiệm thu.
5. Xác nhận phạm vi công bố, tài sản và SDK/channel; người chịu trách nhiệm phát hành quyết định release của lô.
6. Khi phát hành đã được quyết định, push/merge main hoặc chạy workflow; ghi URL, commit và artifact. Theo dõi game được sửa trước khi tăng phạm vi.

Lệnh preview artifact:

```bash
python3 -m http.server 8080 --directory .pages-site
```

Workflow mới kiểm tra pull request; push main/manual chuẩn bị artifact rồi deploy GitHub Pages. Chỉ index/style/app/catalog/scripts được tham chiếu và assets được đóng gói; tài liệu/backlog/script nội bộ không nằm trong site. Preflight vẫn chưa chứng minh mọi asset path sử dụng bởi engine tồn tại hoặc quyền mọi asset đã hợp lệ.

## 3. Điều hành hàng ngày

- Release owner rà lỗi launch/save/close của game vừa sửa và tình trạng site khi có monitoring.
- Game owner chọn việc tiếp theo theo `work_order`, điều chỉnh bằng lỗi thực và dữ liệu nhu cầu khi có.
- Quality owner ghi thiết bị, build, hành vi, bước tái hiện và chứng cứ; tránh một nhãn “đã chơi ổn” cho mọi browser.
- Mỗi vòng review: số game đạt scope, phần thiếu, giờ/ngày thực làm, lỗi còn lại, funnel và doanh thu net nếu đã thu thập.
- Cập nhật nguồn/SDK trước lô phát hành; thay đổi hành vi game phải tăng game version và ghi release notes.

Chưa có hệ monitoring/analytics tập trung. Các việc trên là nhịp vận hành cần triển khai; không phải dashboard hiện đang tự chạy.

## 4. Xử lý sự cố

| Triệu chứng | Việc cần làm | Điều kiện phục hồi |
|---|---|---|
| Nhiều game không mở/site trắng | Rà script tải thiếu/sai thứ tự, console và preflight; giữ commit cuối ổn định để rollback | Catalog mở, game trong lô vào đúng màn |
| Một game lỗi | Ghi ID/build/bước; tạm bỏ ID khỏi registry nếu cần để UI hiện đang phát triển; sync inventory | Launcher và vòng chơi đã được nghiệm thu lại |
| Phím/timer tiếp tục sau đóng | Xem `NP_GameSession.getCurrent() (sau khi stop phải là null)` sau đóng; rà engine scheduling/listener và cleanup async riêng | Không còn tài nguyên của session cũ; input portal hoạt động |
| Lệch progression/sai vật phẩm | Rà bảng unlock/economy theo version; không sửa trực tiếp save người chơi hàng loạt | Migration/scope đã được chấp nhận, checkpoint hồi phục được |
| Save lỗi | Giữ bản gốc nếu còn; kiểm tra schema/quota/migration; có fallback playable | Không xóa toàn bộ localStorage như cách khắc phục mặc định |
| Reward không nhận/nhận hai lần | Tắt vị trí rewarded, rà transaction ID/callback SDK và no-fill | Chỉ grant một lần sau completion hợp lệ |

Runtime diagnostics chỉ đếm nhóm tài nguyên được quản lý; số 0 không chứng minh mọi worker/socket/async hoặc browser process đã được đóng.

## 5. Rollback

Ghi commit của bản đang phát hành và bản ổn định trước. Nếu có sự cố gây lỗi vào game, mất tiến trình hoặc sai thưởng, Release owner quyết định rollback: revert commit gây lỗi trên branch, đi qua preflight, merge bản hồi phục và chạy lại deploy. Không dùng reset/force-push để sửa lịch sử cộng tác.

Đổi script/style cache version khi release thay đổi. Không rollback schema save theo cách bản cũ không đọc được save mới; giữ migration tương thích hoặc khóa phát hành cho game bị ảnh hưởng tới khi có bản recovery.

## 6. Trạng thái bàn giao đợt này

- Đã chuẩn bị 150 hồ sơ công việc và 12 hồ sơ pilot nghiên cứu một phần.
- Preflight tĩnh tạo artifact site; repository có regression suite luồng game nhưng chưa chạy trong đợt chỉnh sửa này. Chưa có chứng cứ chơi trên thiết bị.
- Chưa có chứng nhận replica hoàn chỉnh, số đo FPS/latency, cohort retention, ad revenue hoặc tích hợp SDK quảng cáo mới.
- Việc đầu tiên: nghiệm thu nền tảng runtime/launcher rồi hoàn thiện P1A theo hồ sơ, với owner và capacity thực tế.
