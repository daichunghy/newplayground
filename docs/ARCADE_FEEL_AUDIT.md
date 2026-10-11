# Gameplay / Visual QA — Arcade polish (11/10/2026)

## Những gì thực sự đã được kiểm tra

Đợt này cải thiện chuyên sâu **Boom Online (BnB)** và **Bắn Trứng Khủng Long (Dynomite)**. Đây là hai engine chơi thật, không phải chuyển game sang chế độ arcade chung. Việc cập nhật tập trung vào cảm giác điều khiển, luật thắng/thua, trình bày trong game và hiệu suất ở màn hình cảm ứng.

### 1. Boom Online

- HUD 6 nhóm chữ/emoji được rút thành tên màn, điểm/kỷ lục, mạng và 4 chỉ số công cụ. Số mạng là số đếm, không phụ thuộc glyph emoji của máy.
- Canvas dùng sân chơi, thùng, nhân vật, vật phẩm, đối thủ, trùm và bóng nước **vẽ trực tiếp bằng nét và hình khối**. Màu sàn thay theo Thị trấn/Làng băng/Cảng biển. Chỉ số HP trùm thể hiện bằng thanh phía trên nhân vật.
- D-pad cảm ứng tối thiểu 44px, pointerdown giữ hướng, pointercancel/pointerup/blur nhả hướng; Space hoặc nút Đặt bóng là một thao tác, không kích hoạt trùng bởi mouse/touch.
- Chỉnh hitbox theo hình nhân vật, tránh kẹt vào cột trụ cạnh vị trí spawn.
- Vòng mô phỏng cố định 60Hz, tối đa 3 bước bắt kịp, chỉ vẽ một lần trong RAF. Mục tiêu là giữ *tốc độ di chuyển theo thời gian*, không hứa đảm bảo 60 FPS trên tất cả máy.
- Mở thông bốn điểm xuất hiện và khoảng giữa bản đồ boss. Hiệu ứng bọc nước có ID riêng; **một vụ nổ chỉ trừ một máu trùm**, không trừ lặp trên nhiều ô / nhiều frame. Vẫn có thể gây sát thương với các quả bóng khác nhau.
- Có trạng thái rõ `playing` / `won` / `lost`, khóa cộng thưởng liên tục sau khi thắng, ngừng nhận lệnh khi thua, nút chơi lại đưa tất cả chỉ số về đầu. Kỷ lục lưu cục bộ khi trình duyệt cho phép.

### 2. Bắn Trứng Khủng Long

- Màn giới thiệu được rút còn một hành động chính cùng hai lời nhắc ngắn; HUD giữ màn, điểm/kỷ lục, trứng tiếp theo, số lượt trước khi trần hạ.
- Chuột, bút và cảm ứng dùng **cùng một chuỗi Pointer Events**. Kéo để ngắm, nhấc ngón tay để bắn; pointercancel không bắn. Không có song song `click` và `touchend` gây trùng.
- Có nút Bắn riêng để hỗ trợ thao tác; phím trái/phải có thể chỉnh góc, Space đổi trứng.
- Trứng thường và trứng đặc biệt được vẽ sẵn vào canvas nhỏ theo màu, tái sử dụng trên từng khung hình bằng `drawImage` thay vì tạo gradient / speckle nhiều lần. Có nét phân biệt hình bên cạnh màu.
- Màu trứng thường phát sinh được lấy từ các màu **còn tồn tại trên bàn** để tránh lãng phí lượt bắn vào màu đã biến mất. Trứng đặc biệt vẫn có xác suất xuất hiện từ màn 2.
- Lưu điểm cao an toàn khi localStorage không khả dụng; thông báo combo ngắn hơn và bớt emoji.

## Regression tests

Bộ kiểm thử `node --test tests/game-flow.test.cjs` bổ sung các kịch bản:

1. Boom hold/release pointer, collision/hitbox cạnh điểm spawn.
2. Sát thương trùm chỉ một lần trên cùng blast; chiến thắng một lần; trạng thái thua khi hết mạng và restart.
3. So sánh quãng di chuyển trong cùng khoảng thời gian giữa nhịp render 60Hz/120Hz.
4. Bắn Trứng sử dụng một pointer sequence duy nhất, không tái tạo sprite mỗi frame, vẫn bắn đúng một quả khi thả chuột/touch.

Những kiểm thử này dùng VM và mock DOM/Canvas/Audio. **Không có phép đo benchmark FPS thực tế** và **không phải kiểm thử thị giác hay UX trên điện thoại thật**. Để kết luận đã đạt tiêu chuẩn phát hành, vẫn cần QA bằng trình duyệt trên iOS/Android/desktop, với Chrome, Firefox, Safari, màn hình 375–430px, 60/120Hz, các màn thắng/thua và nhiều thao tác đồng thời.

## Việc chưa xong

Mặc dù 2 engine trên đã được sửa, nhóm **Đặt Bom, Bắn Trứng khác biến thể, Xe Tăng, Gunny và 86 game đang dùng fallback theo thể loại** vẫn còn cơ hội làm rõ tính nguyên bản, tinh giản HUD/emoji và kiểm tra từng giai đoạn. Không nên diễn giải kết quả của 29 bài test thành “150 game đều đã hoàn thiện gameplay gốc”.

Thiết kế nên tiếp tục theo nguyên tắc: hành động được mô tả bằng hình trước; chữ chỉ xuất hiện ở lựa chọn quan trọng hoặc hỗ trợ người chơi; mục tiêu qua màn, cảm giác thao tác và thắng/thua phải đo được bằng test.
