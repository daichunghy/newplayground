# Bomberman; phải chọn game solo cụ thể, không nhập luật BnB

ID: `dat-bom-bomberman` · Thứ tự pilot: 8 · Cập nhật: 2026-10-07

**Trạng thái: hồ sơ nghiên cứu một phần; chưa nghiệm thu replica hoàn chỉnh.**

## Hiện trạng từ mã nguồn

Nguồn hiện có: lưới 13×11, stage, crate/item ngẫu nhiên; nhánh Space và J; cần phân biệt item kiểu bom nước.

Mã nguồn: `scripts/engines.js`. Chưa có đo lường trên thiết bị hoặc playthrough đối thủ.

## Các việc phải hoàn thiện

- **Luật:** Khóa fuse, phạm vi nổ, chain reaction, chặn blast theo tường/crate, đi ra khỏi ô bom, exit và điều kiện qua màn.
- **Phím và độ nhạy:** Tách chuyển ô/bẻ góc khỏi tốc độ vẽ; Space edge-trigger đặt một bom; kiểm tra hai hướng cùng lúc, thả phím và focus.
- **Tiến trình và vật phẩm:** Bảng fire/capacity/speed/pass-item theo bản đã chọn; nếu giữ water-bomb/needle thì ghi thành mode khác có luật riêng.
- **Hình ảnh và cảm giác chơi:** Blast đọc được, danger không bị hạt che; nhân vật/crate/exit theo bộ art nhất quán.

## Nghiệm thu đề xuất

Chain không nổ qua tường; không khóa người chơi trong ô spawn; chết/qua màn/reset đưa về trạng thái nhất quán.

Ngoài ra phải đạt các cổng chung trong `docs/GAME_PROFILE_TEMPLATE.md`. Chi phí và lịch chưa chốt.

## Nguồn cần đối chiếu

- [https://dds.konami.com/games/manual/pcemini/en_Bomber93.pdf](https://dds.konami.com/games/manual/pcemini/en_Bomber93.pdf)

Trang giới thiệu xác định tựa/phiên bản; manual và playthrough mới xác nhận chi tiết. Nếu tham khảo phần tiếp theo/mobile, ghi rõ khác biệt với phiên bản mục tiêu. URL không đồng nghĩa với quyền dùng mã, tên, ảnh hoặc âm thanh.
