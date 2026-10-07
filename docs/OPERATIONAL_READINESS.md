# Bàn giao chuẩn bị vận hành — 07/10/2026

## Đã thực hiện

- Nghiên cứu bổ sung tài liệu Poki/CrazyGames về chất lượng, playtest, phát hành và quảng cáo; đưa vào chiến lược sản xuất 500 game.
- Registry exact-ID: 42 launcher riêng trong 150 mục. Bỏ generic shooter ghi đè và các ánh xạ khác cơ chế theo substring.
- Runtime quản lý scheduling, global listener, cleanup hook và cleanup bổ sung; error-launch dọn session. UI phân biệt prototype/planned, random chỉ chọn launcher sẵn có.
- Sửa ngưỡng tăng tiến Hàng Rong; đồng bộ giai đoạn trong save cũ và kiểm tra một phần dữ liệu save.
- Safe storage khi localStorage bị chặn; cleanup hiệu ứng rung có thể bị ngắt lúc đóng.
- Inventory/backlog 150 game; 12 hồ sơ pilot; template luật/content/items/input/art/performance; evidence ledger giữ qua sync.
- Asset register 128 file: 82 có manifest, 46 chưa có record. 82 đường dẫn khai báo đều tồn tại; chưa xác minh lại quyền từng source.
- Runbook, event contract và kiến trúc phản ánh mã. Bảo lưu proposal kiến trúc cũ riêng.
- CI preflight cho PR; main/manual deploy artifact chỉ chứa site. Đang chuẩn bị nhánh/PR review trên repository; chưa merge hoặc triển khai live.

## Kiểm tra tĩnh đã chạy

```text
python3 scripts/sync_game_operations.py
node scripts/release-preflight.mjs --prepare
git diff --check
```

Kết quả: 150 ID duy nhất; JSON catalog và cache nhúng đồng nhất; 42 mapping có định nghĩa launcher trong source; inventory đầy đủ/đồng nhất; JavaScript được tham chiếu hợp lệ về cú pháp; 82 record asset có file; không lỗi whitespace trong diff. Artifact ở `.pages-site`.

Kích thước đo trên source: JavaScript 946.795 bytes; assets 19.715.183 bytes. Chưa đo transfer nén, cold-load, FPS hoặc input latency.

## Còn cần nghiệm thu trước vận hành lô cải thiện

1. Chơi thực tế launcher/close/switch/reopen/restart, listener/RAF/timer và các tương tác của 42 prototype trên trình duyệt.
2. Hoàn thiện P1A: Dò Mìn, 2048, Line 98, Hàng Rong; đối chiếu luật, progression/items, save và thiết bị theo từng hồ sơ.
3. Rà reference version và inventory nội dung cho các game tiếp theo; 108 mục còn cần gameplay riêng.
4. Bổ sung/đối chiếu asset source/license, art direction và chất lượng hình ảnh của lô.
5. Phân công owner/capacity, triển khai telemetry state transitions rồi thu playtest/funnel; không dùng modal-open làm gameplay-start.
6. Monetization thử sau khi có vòng chơi ổn; SDK/collector/dashboard quảng cáo chưa được triển khai trong đợt này.

Repository có regression suite cho luồng game; không chạy test suite trong đợt sửa tài liệu/registry này theo phạm vi kiểm tra tĩnh. Không có game được chứng nhận replica hoàn chỉnh; các cổng chất lượng đều pending. Preflight tĩnh và artifact không tự thay thế chứng cứ nghiệm thu.

Thực hiện theo `GAME_OPERATING_STRATEGY.md` và `GAME_OPERATIONS_RUNBOOK.md`. Khi thay đổi mã tiếp, ghi chứng cứ theo build mới và cập nhật lại số liệu bàn giao.
