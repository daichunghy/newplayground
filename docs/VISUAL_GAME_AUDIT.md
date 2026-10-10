# Rà soát và tái thiết kế đồ họa game — 10/10/2026

## Mục tiêu

Giảm cảm giác giao diện được ghép từ emoji, màu nhấn thiếu nhất quán, khối chữ hướng dẫn dài và những bộ thẻ giống dashboard. Mục tiêu không phải xóa hết chữ mà là để **người chơi nhìn thấy hành động và trạng thái trước khi phải đọc**. Vẫn giữ nhãn cho các quyết định có tác động tới điểm, giá mua, luật và khả năng tiếp cận.

Phân tích dưới đây dựa trên **mã nguồn**, không phải số emoji hiển thị đồng thời và không phải đo lường người dùng thực tế. Khi có ảnh chụp màn hình thiết bị, số lượng thành phần xuất hiện có thể khác.

## Các vấn đề tìm được trong code gốc

| Game/engine | Emoji, ký hiệu đồ họa trong khối mã (xấp xỉ) | Điểm yếu dễ quan sát trong code |
| --- | ---: | --- |
| Hàng Rong (`launchHangRong`) | 84 | Avatar, món ăn, vật tư, nâng cấp, popup đều dựa vào emoji. Dòng tiêu đề và chỉ dẫn chen giữa nhiều thẻ. Đặc biệt, bếp dựng lại tất cả nút mỗi 100 ms |
| Nông Trại Vui Vẻ (`launchNongTrai`) | 46 | Cây, dụng cụ, ô ruộng chủ yếu là chuỗi emoji cùng chữ trạng thái. 9 ô được dựng như 9 thẻ thông tin |
| Pikachu Nối Hình (`launchPikachu`) | 21 | Trong mỗi ô có emoji lẫn tên viết tắt; board 8×12 tạo nhiễu thị giác. Hai event `touchstart` và `click` cùng kích hoạt một hành động |
| Diner Dash (`launchDinerDash`) | 29 | Màn hướng dẫn mở đầu nhiều đoạn chữ; emoji trong thông tin bàn và đồ ăn; sàn bàn cờ vàng chói cạnh tranh với hành động |

Con số được đếm bằng bộ lọc Extended Pictographic trên phần mã từng hàm trước khi sửa. **Đây là chỉ số sàng lọc chứ không phải thang đánh giá thẩm mỹ hay phép đo clutter chuẩn hóa**. Game có nhiều sprite vẫn có thể đẹp; game có ít chữ vẫn có thể khó chơi.

## Đã triển khai

### 1. Bộ vector chung, không phụ thuộc glyph hệ điều hành

`scripts/game-art.js` tạo SVG nội tuyến với cùng cách bo nét và đổ màu. Bao gồm 5 loại cây, 6 dụng cụ, 10 món ăn, 16 nhân vật ghép hình; có chuyển đổi hình nguyên liệu và nâng cấp. Không tải CDN hay font mới. Phần hình tuân theo kích thước có thể mở rộng, không có chữ gắn chặt vào ảnh.

Lưu ý bản hình 16 nhân vật là **linh vật tự vẽ**, không sao chép sprite thương mại. ID game và tên hiển thị cũ được giữ để không phá bookmark và điều hướng.

### 2. Hàng Rong

- Món ăn, khay, bếp, nguyên liệu, nâng cấp dùng minh họa cùng họ thay emoji. Cảnh phố dùng nét và màu dựng bằng Canvas.
- Rút gọn menu, trạng thái bếp và chỉ dẫn lặp. Thông tin về giá còn ở từng món vì đây là cơ chế kinh tế thiết yếu.
- Tách `paintCookingSlot` cập nhật độ chín, nút và màu theo slot có sẵn. **Không thay toàn bộ DOM của bếp mỗi 100 ms**, tránh rớt click/selection đúng lúc nhấc món.

### 3. Nông Trại

- Thêm nền phong cảnh tách khỏi vùng thao tác, luống đất 3×3, hình cây theo giai đoạn, thanh phát triển và trạng thái cần chăm sóc.
- Dụng cụ, hạt giống được thể hiện bằng hình + nhãn ngắn; giá và cấp mở khóa vẫn nhìn thấy.
- Chuyển ô đất sang button thật với nhãn mô tả riêng; các nút điều khiển giữ `aria-pressed` khi đổi lựa chọn. Khu vườn hàng xóm giữ hành động trồng/chăm/thu hoạch và hình cây tương ứng.

### 4. Pikachu Nối Hình

- Mỗi ô dùng một hình nhân vật duy nhất trong 16 hình SVG, không còn hai lớp emoji và tên viết tắt.
- Dùng click thống nhất thay vì tự xử lý cả `touchstart` và `click`, giảm rủi ro chạm kép.
- Duy trì toàn bộ 8×12 ô, luật nối tối đa hai góc và hiệu ứng đường nối.
- Có nút `Phóng to` cho điện thoại và khung cuộn ngang. Chế độ thu nhỏ vẫn cho thấy toàn bộ bàn. Zoom làm tăng kích thước mục tiêu chạm nhưng yêu cầu cuộn ngang nên cần QA với người chơi.

### 5. Diner Dash

- Mở màn bằng ba bước ngắn thay vì đoạn hướng dẫn dài. Văn bản chuyên môn sâu vẫn có thể cần trợ giúp riêng trong bản sau.
- Đổi sàn vàng gắt thành tông dịu để khách/bàn/đơn hàng nổi bật.
- Thay emoji trái tim bằng các chấm báo kiên nhẫn; trạng thái đồ ăn, dọn bàn, thanh toán dùng hình Canvas và biển hiệu ngắn.
- Giữ các trạng thái phục vụ và logic tính tip.

## Phạm vi kiểm thử

Bộ kiểm thử `tests/game-flow.test.cjs` bao phủ **150 lần mở/đóng và cleanup** cùng các luồng hành động cụ thể. Các test mới kiểm tra SVG sinh đủ mẫu, độ ổn định thao tác Pikachu, vườn + gieo trồng, thay đổi bếp và Diner Dash bắt đầu ca. Điều này không chứng minh hình ảnh trong trình duyệt trông đẹp hay game chạy 60 FPS trên thiết bị.

Trước khi xác nhận phát hành đạt chất lượng thẩm mỹ, cần kiểm thử trực quan thực tế trên:
- Android Chrome 360–430 CSS px và iPhone Safari 375–430 CSS px; cả màn lớn 1280px+
- Chạm nhanh Pikachu, vuốt/zoom, phím tab/Enter, kiểm tra không kích hoạt đúp
- Nhấc bếp Hàng Rong đúng 65–92% và khi chuyển tab trong lúc nấu
- Trồng–chăm–thu hoạch Nông Trại, mở khóa các luống và vườn hàng xóm
- Diner Dash với hàng chờ đông và cả ba ca, thử bấm các khu vực sát nhau
- Tùy chọn giảm chuyển động, zoom hệ thống và trình duyệt không tải được ảnh cover

## Vẫn chưa đạt và ưu tiên kế tiếp

Nhiều game ngoài phạm vi còn dùng emoji và HUD/chỉ dẫn quá dày. 86 game thuộc 7 archetype fallback vẫn không tương đương gameplay gốc của từng tựa. Các ưu tiên tiếp theo dựa vào phân tích mã gồm **Boom Online, Age of War, Đặt Bom và Bắn Trứng**. Mỗi game cần được review trên màn hình trước khi kết luận nên thay bằng illustration, sprite animation hay CSS/Canvas.

Nguyên tắc cho các lượt tiếp: *hình ảnh truyền đạt trạng thái; chữ giúp lựa chọn; hiệu ứng hỗ trợ phản hồi, không che gameplay*. Không nên làm sạch giao diện bằng cách giấu thông tin thiết yếu như giá mua, tốc độ hay độ chín.
