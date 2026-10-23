# NewPlayground: cơ chế riêng và 200 game

Người dùng yêu cầu cải thiện toàn bộ 150 game, thêm 50 game, giao diện ít chữ/tiêu đề phụ; agent chính điều phối, mọi worker và reviewer dùng gpt-6-luna, reasoning high. Ngày 23/10 người dùng yêu cầu tiếp tục làm trên cloud. Quyết định của điều phối: tự tìm nguồn công khai cho các bản phổ biến, ghi rõ tên/phiên bản và giới hạn; không coi yêu cầu tiếp tục là bằng chứng đạt độ giống tuyệt đối.

Mốc nguồn: d2c1a7778a3c647a23fa21742eaee7ba06eee0ab. Danh mục 150 ID duy nhất; 85 mục thực sự vẽ arcade fallback; 65 mục còn lại gồm engine riêng và alias. Baseline 129 test đạt. Các ca mở/đóng không chứng nhận toàn bộ luật hoặc hình ảnh.

## Hướng triển khai

Giữ vanilla HTML/CSS/JS, Canvas, Web Audio, máy chủ tĩnh, Calibri; không thêm CDN/runtime. Một registry theo ID chính xác đứng trước router cũ, cho phép thay từng game độc lập. Dùng chung công cụ session, vẽ bàn, nút và input; luật, thắng/thua, tiến trình phải riêng. Không thêm các bản đổi tên của arcade fallback.

UI: ưu tiên sân chơi, một gợi ý hành động ngắn, điều khiển có nhãn, phản hồi trực tiếp; hướng dẫn đầy đủ chỉ khi mở trợ giúp. Giữ focus bàn phím, pause, replay, cảm ứng >=44px, bộ nhớ bị chặn và giảm chuyển động. Các nút điều khiển chung dùng cùng session với engine.

50 game mới sẽ chia 5 nhóm 10 game: logic số; cờ/bàn; bài/xúc xắc; arcade cổ điển; logic và trí nhớ. Danh sách trong kế hoạch là quyết định đề xuất của điều phối, chưa phải danh sách do người dùng cung cấp. Mỗi game phải có ID mới, nguồn luật, cơ chế đặc trưng và kiểm thử thực tế. Tái tạo bằng mã và hình vẽ trong dự án; không gọi đó là tài nguyên gốc.

150 game cũ được cải thiện qua UI/session chung, kiểm kê định tuyến và các engine thay thế theo nhóm. Ưu tiên lỗi sai bản chất: Dr. Mario/Mario, Tháp Hà Nội/Sokoban, Peggle/DX-Ball, Chuzzle/Bejeweled; sau đó các fallback. Phải lưu trạng thái thật của từng mục; game còn thiếu hệ thống hoặc campaign gốc tiếp tục ghi là một bản chuyển thể có giới hạn. Mục tiêu "giống tuyệt đối" chỉ được xác nhận khi có đối chiếu đủ luật, nội dung, hình ảnh và âm thanh, không suy ra từ test xanh.

## Nghiệm thu

Đủ 200 ID duy nhất và hai danh mục đồng bộ; 50 game mới không gọi NP_Archetypes. Kiểm tra quy tắc và điều kiện kết thúc của từng game mới; hồi quy phiên chơi của toàn bộ danh mục. Chạy browser desktop/mobile để tìm lỗi render/input, không dùng smoke test làm bằng chứng fidelity. Ghi nguồn đối chiếu, phạm vi đã làm và phần thiếu vào docs; bàn giao nhánh cloud/PR cùng bằng chứng, không tự nhận đã đạt độ giống tuyệt đối.
