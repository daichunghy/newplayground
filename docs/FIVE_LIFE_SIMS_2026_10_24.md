# Năm trò chơi mô phỏng đời sống — 24/10/2026

Nhánh tính năng bổ sung năm trò chơi có luật và engine riêng vào NewPlayground, nâng danh mục từ 150 lên 155 mục. Không đổi luật hay thành phần của những trò chơi hiện hữu.

## Danh mục mới

| Tựa game | Mục tiêu thắng | Vật lý và logic |
| --- | --- | --- |
| Phố Mưa: Giao Hàng | Giao đủ bốn đơn, xe còn hoạt động | Quán tính trên đường mưa, phanh, giao thông, đèn tín hiệu, điểm dừng |
| Đỗ Xe Đúng Chuẩn | Đỗ đúng tâm và chiều của ba vị trí | Mô hình steering, D/R, ga/phanh, hitbox, thời gian đứng yên |
| Đội Cứu Hỏa Đêm | Khống chế ba căn nhà trước khi hỏng kết cấu | Nhiệt lan từ ô đang cháy, vòi phun điều khiển theo mục tiêu, bình nước/nạp nước |
| Thu Ngân Ca Tối | Phục vụ năm khách, trả đúng tiền thừa, tối đa hai lỗi | Mã hàng, hóa đơn, tiền khách trả, cộng đúng mệnh giá, áp lực chờ |
| Cẩu Container Cảng Biển | Xếp ba container an toàn vào bến | Lắc con lắc của cáp, lực gió, quán tính xe tời, nâng/hạ tải, cân góc khi đặt |

## Trải nghiệm

- Chơi trực tiếp trên web, không cài thêm dependency; bìa SVG vẽ riêng, gameplay Canvas 2D.
- Các engine sử dụng NP_GameSession để tạm dừng và dọn RAF, bộ hẹn giờ và sự kiện khi thoát, chuyển trò hoặc chơi lại.
- Các nút cảm ứng cao ít nhất 44px, thao tác bàn phím có phím tắt; canvas xử lý Pointer Events trên điện thoại và máy tính.
- UI có số điểm, đồng hồ, trạng thái nhiệm vụ, kỷ lục lưu cục bộ (khi trình duyệt cho phép), thông báo lỗi và kết quả thắng/thua.
- Mục Cách chơi hiển thị hướng dẫn phù hợp từng tựa. Có thể mở trực tiếp qua query string game=id.
- Hình ảnh là vector minh họa 2D và các mô hình vật lý giản lược cho gameplay; không phải video, đồ họa 3D chân thực hoặc hệ mô phỏng huấn luyện chuyên nghiệp.

## Kiểm tra

Chạy với Node.js 22 bằng lệnh: node --test tests/*.test.cjs

Pipeline trên GitHub kiểm tra cú pháp tất cả JS, số lượng 155 ID duy nhất và bộ regression. tests/life-simulations.test.cjs kiểm tra mở/đóng năm game, dữ liệu, điều khiển, logic trả tiền thừa, pause/resume và cleanup. Các kiểm tra bằng mocked DOM/Canvas không chứng minh chất lượng thị giác trên thiết bị thực; nên thử tay thêm hai kích thước màn hình và cảm ứng đa điểm trước khi quảng bá bản phát hành.
