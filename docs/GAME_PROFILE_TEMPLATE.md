# Hồ sơ bắt buộc cho một game

Copy template cho ID chưa có hồ sơ. Không điền thông số giả khi chưa đo.

## Nhận diện và phạm vi

- Catalog ID, tên hiển thị, game version, owner, ngày cập nhật.
- Bản tham chiếu: tên/edition/năm/nền tảng; URL/manual/build/video cụ thể.
- Phạm vi hoàn chỉnh: mode, campaign/màn/boss, item, multiplayer, ngôn ngữ, input/device.
- Nguồn và mức chứng cứ: đọc nguồn / quan sát gameplay / đo thiết bị / đã nghiệm thu.
- Khác biệt chủ ý với reference và lý do; quyền mã/tên/art/audio/map tương ứng.

## Luật và state machine

- Core loop; menu → tutorial → playing → pause → win/loss → reward → replay/next.
- Input hợp lệ/không hợp lệ theo state; scoring/combo; seed/RNG; AI và ngoại lệ.
- Đặc tả collision, grid, projectile/physics; timer tính theo simulation time hay wall time.
- Mỗi rule có source/timestamp, trạng thái implementation và acceptance evidence.

## Nội dung và tăng tiến

| Mode/level ID | Mục tiêu | Unlock | Thông số khó | Kỹ năng/item mới | Win/loss | Trạng thái |
|---|---|---|---|---|---|---|
| Chưa chốt | | | | | | pending |

| Item ID | Cách nhận | Giá/cooldown | Tác dụng/thời hạn | Stack/cap | Counter | Nguồn |
|---|---|---|---|---|---|---|
| Chưa chốt | | | | | | |

Inventory phải bao phủ scope reference. Bản endless không bắt buộc có campaign giả. Economy cần kiểm tra affordability, dead-end, công dụng của upgrade và nhịp giới thiệu cơ chế mới.

## Điều khiển, độ nhạy và độ nhanh

| Hành động | Keyboard/mouse | Touch | Edge/held | Thông số reference | Thông số hiện tại | Đo ở thiết bị nào |
|---|---|---|---|---|---|---|
| Chưa chốt | | | | chưa đo | chưa đo | |

Ghi input buffer, repeat delay/rate, deadzone/drag threshold, snapping, aim mapping, acceleration/braking, jump/gravity, animation lock. Nêu đơn vị: CSS pixels/world units/ms/units per second. Tách game speed và render FPS. Mất focus/pointer-cancel phải thả nút; hướng dẫn khớp binding thật; input không cuộn trang ngoài ý muốn.

## Hình ảnh và âm thanh

- Art direction, bảng màu, sprite sheet/atlas, animation states, resolution/DPR.
- Hitbox riêng so với ảnh; trạng thái damage/invulnerable/target/valid/invalid đọc được.
- HUD, contrast, target >=44px cho nút điều khiển, cách nhìn bàn rộng ở mobile.
- SFX/music/mute, gesture để mở audio, giảm rung/flash theo cài đặt.
- Asset ledger: local file, tác giả, source URL, license, attribution, modification, quyền phát hành.

## Save và vòng đời

- Key/schema/version, các field và miền giá trị; checkpoint; migration/backup/recovery.
- Save không khả dụng/lỗi/quota không ngăn người chơi mở game; không công bố autosave nếu chỉ lưu điểm cao.
- Cleanup timer/RAF/listener/audio và DOM khi đóng/đổi game. API scheduling dùng `NP_GameSession`.
- Tài nguyên async mới (fetch/Promise/WebSocket/worker/media) cần ownership và abort/close riêng. Runtime hiện tại không tự hủy các nhóm này.
- Blur/visibility phải có chính sách pause/resume và reset held inputs riêng của engine.

## Nghiệm thu trước phát hành

Tất cả nhóm dưới đây phải có chứng cứ, owner và build/version. Hiện trạng source review không thay thế kết quả chơi thực tế.

- Luật đúng reference, đủ scope nội dung; mỗi thiếu sót/deviation được ghi.
- Vòng chơi khép kín: thắng, thua, retry, next, kết thúc scope.
- Desktop và từng thiết bị mobile khai báo hỗ trợ; keyboard/mouse/touch/resize/DPR/focus.
- Đóng, đổi game, mở lại, restart; không callback/input game cũ.
- Save/reload/cũ/lỗi/quota; recovery không làm mất dữ liệu hợp lệ.
- Tải cold/warm, frame pacing/input latency trên thiết bị yếu; âm thanh/mute/Safari nếu hỗ trợ.
- Người chơi mới hiểu mục tiêu/thao tác; ghi nhận điểm rời cuộc chơi.
- Quyền phân phối/art/audio và điều kiện SDK của từng kênh.

Chỉ gọi “hoàn chỉnh theo bản tham chiếu” khi inventory đầy đủ được chấp nhận. Limited release có thể dùng scope nhỏ hơn, nhưng trạng thái công bố phải phản ánh phạm vi đó.
