# Zuma Deluxe; không nhập tính năng Revenge nếu chưa chọn mode

ID: `zuma-ech-ban-ngoc` · Thứ tự pilot: 7 · Cập nhật: 2026-10-07

**Trạng thái: hồ sơ nghiên cứu một phần; chưa nghiệm thu replica hoàn chỉnh.**

## Hiện trạng từ mã nguồn

Nguồn hiện có: stage, tốc độ đạn, swap bằng Space/C, bonus coin; cần đối chiếu luật chuỗi.

Mã nguồn: `scripts/engines-popcap.js`. Chưa có đo lường trên thiết bị hoặc playthrough đối thủ.

## Các việc phải hoàn thiện

- **Luật:** Tài liệu path, khoảng cách bóng, điểm chèn, match-3, gap pullback, combo và ngưỡng thoát hiểm; level dữ liệu hóa.
- **Phím và độ nhạy:** Chuyển clientX/Y sang canvas đúng scale; tap bắn chỉ một đạn; chuột/phím đổi bóng; đo aim và tốc độ bóng theo thời gian.
- **Tiến trình và vật phẩm:** Inventory loại power-up, thời gian hiệu lực, xuất hiện và scoring; so sánh đường khó/chậm với số màu.
- **Hình ảnh và cảm giác chơi:** Bóng phân biệt bằng họa tiết ngoài màu; muzzle/trail/impact không che điểm chèn; giữ frame pacing khi chain dài.

## Nghiệm thu đề xuất

Va chạm gần đoạn uốn không chèn sai nhánh; chuỗi co sau match đúng; FPS không thay tốc độ đoàn bóng.

Ngoài ra phải đạt các cổng chung trong `docs/GAME_PROFILE_TEMPLATE.md`. Chi phí và lịch chưa chốt.

## Nguồn cần đối chiếu

- [https://www.ea.com/games/zuma/zuma](https://www.ea.com/games/zuma/zuma)
- [https://www.ea.com/games/zuma/zumas-revenge](https://www.ea.com/games/zuma/zumas-revenge)

Trang giới thiệu xác định tựa/phiên bản; manual và playthrough mới xác nhận chi tiết. Nếu tham khảo phần tiếp theo/mobile, ghi rõ khác biệt với phiên bản mục tiêu. URL không đồng nghĩa với quyền dùng mã, tên, ảnh hoặc âm thanh.
