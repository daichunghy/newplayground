# PAC-MAN arcade 1980; trang Museum+ dùng xác định bộ bản gốc

ID: `pac-man` · Thứ tự pilot: 6 · Cập nhật: 2026-10-07

**Trạng thái: hồ sơ nghiên cứu một phần; chưa nghiệm thu replica hoàn chỉnh.**

## Hiện trạng từ mã nguồn

Nguồn hiện có: level, ghost, đổi hướng bằng mũi tên/WASD; một nhánh chọn hướng ghost dùng ngẫu nhiên.

Mã nguồn: `scripts/engines-classics.js`. Chưa có đo lường trên thiết bị hoặc playthrough đối thủ.

## Các việc phải hoàn thiện

- **Luật:** Nghiên cứu target tile từng ghost, scatter/chase/frightened, đường hầm, power pellet, fruit và tốc độ theo màn.
- **Phím và độ nhạy:** Buffer rẽ trước giao lộ; grid snapping; không rẽ xuyên tường; đo sai số giữa phím và tile-turn.
- **Tiến trình và vật phẩm:** Bảng pellet/fruit/life/bonus/ghost-score theo màn; cần inventory hành vi đầy đủ trước khi tuyên bố tương đương.
- **Hình ảnh và cảm giác chơi:** Tường, nhân vật và hitbox nhất quán; hiệu ứng frightened dễ nhận biết; tốc độ theo time-step.

## Nghiệm thu đề xuất

Ghost không chỉ random giống nhau; chuyển mode đúng bảng; ăn pellet cuối chuyển màn; mất mạng/reset giữ đúng score.

Ngoài ra phải đạt các cổng chung trong `docs/GAME_PROFILE_TEMPLATE.md`. Chi phí và lịch chưa chốt.

## Nguồn cần đối chiếu

- [https://www.bandainamcoent.com/games/pac-man-museum-plus](https://www.bandainamcoent.com/games/pac-man-museum-plus)

Trang giới thiệu xác định tựa/phiên bản; manual và playthrough mới xác nhận chi tiết. Nếu tham khảo phần tiếp theo/mobile, ghi rõ khác biệt với phiên bản mục tiêu. URL không đồng nghĩa với quyền dùng mã, tên, ảnh hoặc âm thanh.
