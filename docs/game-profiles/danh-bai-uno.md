# UNO Mattel: chọn một edition/instruction sheet cố định

ID: `danh-bai-uno` · Thứ tự pilot: 12 · Cập nhật: 2026-10-07

**Trạng thái: hồ sơ nghiên cứu một phần; chưa nghiệm thu replica hoàn chỉnh.**

## Hiện trạng từ mã nguồn

Nguồn hiện có: shuffle, AI chọn bài hợp lệ, đổi màu; chưa đối chiếu toàn bộ luật edition.

Mã nguồn: `scripts/engines-popcap.js`. Chưa có đo lường trên thiết bị hoặc playthrough đối thủ.

## Các việc phải hoàn thiện

- **Luật:** Khóa deck, matching, skip/reverse/+2/wild/+4, challenge, draw/play, gọi UNO, reshuffle và cách tính round score.
- **Phím và độ nhạy:** Tap chọn bài rõ valid/invalid; picker màu 4 lựa chọn; thao tác bot không khóa UI; chống double-play.
- **Tiến trình và vật phẩm:** House-rules như stacking tách cấu hình, default theo sheet; AI levels quyết định bằng chiến lược, không biết bài người chơi.
- **Hình ảnh và cảm giác chơi:** Màu có ký hiệu kèm theo, text bài rõ ở màn hẹp; animation reveal/deal không tạo race turn.

## Nghiệm thu đề xuất

Deck conservation đúng; lượt đặc biệt/reshuffle/last-card xử lý nhất quán; thắng vòng và tích điểm rõ; xác định edition trước parity.

Ngoài ra phải đạt các cổng chung trong `docs/GAME_PROFILE_TEMPLATE.md`. Chi phí và lịch chưa chốt.

## Nguồn cần đối chiếu

- [https://m.service.mattel.com/us/Technical/productDetail?prodno=W2085](https://m.service.mattel.com/us/Technical/productDetail?prodno=W2085)
- [https://service.mattel.com/us/results.aspx?ContentType=Product&N=4294967270+4294965484&No=60&Ntk=Product&Ntt=uno&Ntx=mode%2Bmatchany&Nty=1&SubContentType=IS](https://service.mattel.com/us/results.aspx?ContentType=Product&N=4294967270+4294965484&No=60&Ntk=Product&Ntt=uno&Ntx=mode%2Bmatchany&Nty=1&SubContentType=IS)

Trang giới thiệu xác định tựa/phiên bản; manual và playthrough mới xác nhận chi tiết. Nếu tham khảo phần tiếp theo/mobile, ghi rõ khác biệt với phiên bản mục tiêu. URL không đồng nghĩa với quyền dùng mã, tên, ảnh hoặc âm thanh.
