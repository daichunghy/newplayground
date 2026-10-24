# Fidelity pass — năm game Flash quốc tế, 24/10/2026

## Mục tiêu

Không tạo game mới có tên giống bản gốc. Chỉnh trực tiếp năm engine Flash hiện có để tương đồng **cơ chế, giao diện và nhịp chơi** hơn, vẫn giữ NewPlayground thuần HTML/CSS/Canvas và toàn bộ 140 mục trong danh mục.

**Quan trọng:** Không đóng gói SWF, âm thanh, hình gốc hoặc mã nguồn thương mại. Năm bản hiện tại vẫn là những bản **tái dựng độc lập** chứ không phải bản phát hành chính thức, và chưa thể được chứng nhận pixel-perfect hoặc cùng quy luật vật lý 100% với game gốc.

## Chi tiết theo trò

### The World's Hardest Game (2007, Snubby Land)
- Nguồn gốc, 30 màn, xanh an toàn, chấm xanh và xu vàng: https://en.wikipedia.org/wiki/The_World%27s_Hardest_Game
- Trước: mọi màn lặp một hành lang với số chấm xanh tăng dần.
- Sau: 30 đường đi khác nhau từ 15 bố cục viết tay và 15 phản chiếu, có ngã rẽ, bức tường, checkpoint ở các màn sau, chấm xanh di động, xu ở vị trí có đường đi, lưu số lần chết và điều kiện kết thúc. Giao diện đen/tím, checkerboard, ô vuông đỏ, vùng xanh.
- **Còn khác bản gốc:** vị trí từng chấm xanh, mê cung theo chính xác từng level và điểm checkpoint chưa lấy từ dữ liệu chính thức của SWF. Không quảng bá là "30 level y hệt".

### QWOP (Bennett Foddy, 2008)
- Bản gốc và mô tả: https://foddy.net/ và https://flashgaming.fandom.com/wiki/QWOP
- Trước: người chạy được gia tốc từ một phím đùi đơn lẻ, phần hông xuất phát thấp và góc ngã bị cắt tại ngưỡng không tự nhiên; các phím Q/W/O/P tập trung cùng góc.
- Sau: Q/W cho nhóm cơ đùi đối hướng, O/P cho nhóm cơ bắp chân đối hướng; phối hợp QP/WO thay phiên để bước, hỗ trợ chân trên mặt đất và ngã do mất cân bằng/đầu chạm đất, HUD hiển thị THIGHS phía trái, CALVES phía phải; P được giữ cho cơ bắp chân thay vì lệnh Pause.
- **Còn khác bản gốc:** đây là vật lý ragdoll 2D đơn giản hóa, không phải mô phỏng khớp cơ thể và hệ mô phỏng gốc của Foddy.

### Helicopter Game (SeeThru, 2002)
- Nguồn SeeThru: https://www.seethru.co.uk/the-helicopter-game/
- Trước: chỉ kiểm tra va chạm ở một tọa độ giữa chiếc trực thăng; chạm nút giữ BAY trên màn hình sau khi thua không khởi động lại.
- Sau: kiểm tra cả đuôi/thân/đầu, khởi động lại bằng cách giữ chạm hoặc Space, đồng hồ DISTANCE/BEST đen trên nền xanh neon, giữ nhấp để tăng độ cao/thả để giảm.
- **Còn khác:** đường biên, tốc độ và khung va chạm là xấp xỉ gameplay.

### Red Ball 1 (Evgeniy Fedoseev, 2008–2009)
- 12 màn chính + 5 màn King.com: https://redball17levels.com/red-ball-1
- Trước: 17 màn gần như cùng một chuỗi bệ, lặp lại gai và thùng.
- Sau: đúng tên 12 màn chính và 5 màn bổ sung; mỗi màn có cấu hình nền khác nhau và nhóm thử thách theo chủ đề, gồm bẫy gai, cầu hộp, lò xo, sàn nâng, rìu lắc, xe/khối đẩy, tàu, chạm công tắc mở cửa, đối thủ chuyển động; màn PLAY và SELECT LEVEL, màn khóa, ghi mức đã vượt, màn tiếp theo và tổng số lần chết; bóng giữ gia tốc ngang trong không trung.
- **Còn khác:** địa hình/màn boss, trình tự vật thể, va chạm và hoạt ảnh là tái dựng theo chủ đề, không phải tái hiện chính xác tọa độ và bản đồ 17 màn SWF.

### Desktop Tower Defense (Paul Preece, 2007)
- Nhà phát triển: https://www.kongregate.com/en/games/preecep/desktop-tower-defense
- Danh sách sáu họ tháp: https://www.jayisgames.com/review/desktop-tower-defense.php
- Trước: bốn nhóm tháp Squirt, Dart, Splash và Sniper thay thế, chỉ 20 wave, một loại creep.
- Sau: sáu họ tháp Pellet, Squirt, Dart, Swarm, Frost, Bash với hiệu ứng bắn riêng; năm loại quái phụ cùng normal (fast, group, immune, flying, boss); quái bay đi xuyên mê cung và chỉ bị tháp có khả năng chống không kích bắn; Frost làm chậm, Bash gây choáng, Dart nổ lan; 50 đợt; gửi đợt mới sớm trước khi đợt cũ kết thúc để nhận thưởng; BFS đường đi động, đặt/bán/nâng cấp và phím 1–6 U S Space.
- **Còn khác:** chi phí/damage/cấp độ, đối tượng quái, kiểu bố trí và họa tiết bàn làm việc chưa được tái tạo từng pixel từ ấn bản 1.2.

## Kiểm thử và phạm vi tin cậy

Bổ sung tests/original-fidelity.test.cjs, và test tổ hợp phím trong shell. Chạy node --test tests/*.test.cjs ở GitHub Actions với node 22, bên cạnh kiểm tra cú pháp và số lượng/ID danh mục.

Test chạy với DOM/Canvas mô phỏng, kiểm tra được tuyến game, lifecycle, layout/mode, input và cơ chế dễ đối chiếu; **không** thay thế thử nghiệm cảm ứng Safari/Android hoặc đánh giá từng màn bằng mắt. Chỉ tuyên bố triển khai hoàn tất khi CI đã xanh.
