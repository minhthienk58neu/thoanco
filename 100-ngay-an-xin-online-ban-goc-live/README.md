# 100 NGÀY ĂN XIN ONLINE — BẢN GỐC + QUẢN TRỊ + WEBSITE CÔNG KHAI

Phiên bản này **GIỮ giao diện pastel / pixel art / retro Windows, mèo trong cốc hồng của BẢN ĐẦU**, không chuyển sang bố cục rút gọn.

Các file quan trọng:

- `index.html` — **trang công khai** cho người xem (giao diện bản đầu).
- `admin.html` — **bảng quản trị mới, đơn giản**: cập nhật lời giới thiệu, mục tiêu, nhiệm vụ, tài khoản ngân hàng, link TikTok/Instagram, tải/xóa ảnh, ẩn nickname.
- `server.js` — máy chủ web, API, mã chuyển khoản, xác minh webhook SePay, bộ đếm tiền, đồng bộ livestream.
- `overlay.html` — lớp phủ OBS để hiện tiền thật và thông báo người ủng hộ đã đồng ý công khai.
- `package.json`, `railway.json` — Railway tự chạy bằng `npm start`; không cần cài thư viện.
- `.env.example` — mẫu các khóa. Không được đưa khóa thật vào GitHub.

## LÀM NHANH NHẤT ĐỂ CÓ LINK PUBLIC — KHÔNG CẦN BIẾT CODE

### BƯỚC 1 — Upload mã lên GitHub

1. Giải nén ZIP.
2. Vào https://github.com/new, tạo một repository **Private** tên ví dụ `an-xin-online`.
3. Chọn `uploading an existing file` hoặc `Add file > Upload files`.
4. Kéo thả **tất cả file trong thư mục đã giải nén** (không kéo cả thư mục ZIP). Tải tối thiểu `index.html`, `admin.html`, `server.js`, `overlay.html`, `package.json`, `railway.json`. Nếu thấy file `.env`, **không tải** file đó. Bấm `Commit changes`.

### BƯỚC 2 — Chạy web trên Railway

1. Vào https://railway.com, đăng nhập bằng GitHub.
2. Chọn `New Project` → `Deploy from GitHub repo` → repo `an-xin-online` → `Deploy`.
3. Mở service → `Variables`, thêm:

   - `ADMIN_TOKEN` = một chuỗi bí mật đủ dài (ít nhất 20 ký tự, nên dùng 32–64 ký tự ngẫu nhiên).
   - `SEPAY_API_KEY` = **chỉ thêm khi đã tạo khóa webhook thật tại SePay**.

   Bạn có thể tự tạo khóa ADMIN_TOKEN bằng https://www.uuidgenerator.net/ (nên tạo trong trình quản lý mật khẩu hoặc lệnh `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` trên máy). Đừng gửi khóa cho ai, đừng điền khóa vào HTML hay GitHub.

4. **QUAN TRỌNG — Lưu dữ liệu lâu dài:** Trên Railway tạo `Volume`, gắn với **cùng service**, đặt mount path **`/data`**. Ứng dụng tự nhận biến `RAILWAY_VOLUME_MOUNT_PATH`, tự lưu giao dịch và ảnh trong volume. Nếu không gắn volume, dữ liệu có thể mất sau khi deploy lại. Chỉ 1 service Node.js và 1 volume; không cần MySQL.
5. Mở service → `Settings` → `Networking` → `Public Networking` → `Generate Domain`.
6. Mở link Railway vừa tạo, ví dụ `https://ten-web-cua-ban.up.railway.app`. Đây là **web công khai**; Railway tự xử lý HTTPS. Có thể chia sẻ link ngay, dù chưa mở chức năng nhận ủng hộ.

**Chi phí:** Railway có gói thử/Free tùy điều kiện tài khoản và mức tài nguyên; nếu dùng Hobby có phí thuê bao hằng tháng. Không khẳng định đây là hosting miễn phí vĩnh viễn; hãy xem bảng giá trong dashboard.

### BƯỚC 3 — Quản trị: không cần sửa mã nguồn

- Vào **`https://TEN-MIEN-CUA-BAN/admin`** hoặc nhấn nút **⚙ QUẢN TRỊ** trên trang chủ.
- Nhập đúng `ADMIN_TOKEN` đã đặt trong Railway → Variables.
- Sửa **lời giới thiệu trang đầu**, **tên tháng**, **mục tiêu (VND)**, **tên nhiệm vụ** và **mô tả**.
- Nhập **mã ngân hàng VietQR** (`MB`, `VCB`, `TCB`...), **STK thật**, **tên người nhận** đúng với ngân hàng.
- Nhấn **♡ LƯU TẤT CẢ THAY ĐỔI**; mọi người truy cập website sẽ thấy nội dung mới.
- Kéo xuống **Ảnh nhật ký** để tải ảnh JPG/PNG/WebP dưới 2 MB, đặt chú thích, xóa ảnh cũ.
- Ở phần **Quản lý nickname**, bạn có thể ẩn thông tin người gửi đã từng đồng ý công khai.

**Lưu ý:** Khi đổi `Tháng chiến dịch` sang tên mới, bộ đếm hiển thị dữ liệu của chiến dịch mới (ban đầu 0 đồng). Số tiền đã xác minh của chiến dịch cũ vẫn được lưu. Không dùng lại tên cũ cho tháng mới nếu muốn tách riêng.

### BƯỚC 4 — Muốn tiền vào là bộ đếm tăng tự động? Kết nối SePay

1. Truy cập https://my.sepay.vn, tạo tài khoản và kết nối tài khoản ngân hàng nhận tiền **do bạn sở hữu/được phép sử dụng**. Tên chủ tài khoản thực tế cần khớp thông tin đã khai báo.
2. Trong SePay → `Webhooks` → `Thêm webhook`:
   - Sự kiện: **Có tiền vào**.
   - Tài khoản: đúng STK đã đặt tại `/admin`.
   - URL: **`https://TEN-MIEN-CUA-BAN/api/webhooks/sepay`**.
   - Xác thực: **API Key**; chọn/khai báo mã khóa trong SePay, rồi sao chép đúng mã đó sang Railway → Variables → `SEPAY_API_KEY`.
   - Nếu dùng bộ lọc theo tiền tố mã thanh toán, dùng `X100` (vì mã thanh toán của web có dạng `X100...`).
3. Đảm bảo mã `SEPAY_API_KEY` có tối thiểu 16 ký tự; Railway sẽ redeploy sau khi lưu biến. Chú ý: đặt biến là **chưa chứng minh webhook thực sự hoạt động**.
4. Mở trang công khai → chọn số tiền → tick các ô xác nhận → `TẠO MÃ QR` → thử chuyển **một khoản nhỏ thật** với **nội dung nguyên văn của QR**.
5. Kiểm tra: tiền thực vào tài khoản, SePay có log webhook thành công, tổng tiền trên web tăng; thử mở 2 máy để xác nhận đồng bộ.

Hệ thống chỉ cộng những giao dịch nhận được qua SePay, đúng tài khoản, có mã chuyển khoản do website tạo và ID giao dịch chưa từng ghi nhận. **Các khoản chuyển thẳng không có mã website sẽ không được tính tự động**. Không được cộng ảo vào tổng tiền thực. Thông báo "đã đặt cấu hình" trên admin không có nghĩa ngân hàng đã kết nối thành công, phải kiểm tra bằng giao dịch thật.

### BƯỚC 5 — Livestream (không bắt buộc)

Trong OBS → `Sources` → `Browser Source`, nhập:

`https://TEN-MIEN-CUA-BAN/overlay.html`

Kích thước gợi ý 900 × 350, nền trong suốt. Nickname chỉ xuất hiện nếu người chuyển tiền đã chủ động đồng ý công khai trước khi tạo mã QR.

## Chạy thử trên Windows (nếu cần)

1. Cài Node.js 22+: https://nodejs.org
2. Mở thư mục bằng VS Code, mở Terminal, chạy `copy .env.example .env` trong CMD (PowerShell dùng `Copy-Item .env.example .env`).
3. Sửa `.env`, thay `ADMIN_TOKEN` bằng mã bí mật dài của riêng bạn. Nếu chưa có SePay, để `SEPAY_API_KEY` như ví dụ, website sẽ báo chưa kết nối, không cho tạo thanh toán thật.
4. Chạy `npm run dev`.
5. Mở `http://localhost:3000` và `http://localhost:3000/admin`.

Đừng mở trực tiếp `file:///index.html` để vận hành thực: chế độ mở file là demo cục bộ, không được đồng bộ giữa người xem.

## Các lỗi dễ gặp

| Hiện tượng | Cách xử lý |
|---|---|
| Railway hiển thị `Application failed to respond` | Kiểm tra `Deploy Logs`, Start Command `npm start`, PORT để Railway tự đặt, service đang chạy. |
| Không mở được `/admin` | Đảm bảo đã upload **`admin.html`** và `server.js` mới lên GitHub. |
| Đăng nhập admin báo lỗi 401 | Kiểm tra `ADMIN_TOKEN` ở Railway → Variables, không có dấu ngoặc kép hay khoảng trắng thừa. |
| Đổi ảnh/nhiệm vụ xong lại mất | Kiểm tra Railway Volume có mount đúng `/data` vào chính service; cần backup. |
| QR báo chưa kết nối | Điền đầy đủ STK ở admin và đặt API key SePay thực tế. |
| Chuyển khoản xong số tiền không tăng | Kiểm tra nội dung chuyển khoản có mã `X100...`, webhook `Có tiền vào`, URL đúng, API key khớp, tài khoản khớp và log của SePay. |
| Trang xem được nhưng cập nhật chậm | Thử tải lại trang; Server-Sent Events cần kết nối internet ổn định. |

## Các điểm cần hiểu trước khi hoạt động công khai

- Trang web **không phải tổ chức từ thiện** và không tuyên bố miễn trừ trách nhiệm pháp luật tuyệt đối. Khoản tiền là tặng cho tự nguyện với thông tin công khai rõ ràng. Có thể phát sinh nghĩa vụ thuế/quyền riêng tư tùy hoàn cảnh.
- Đừng công khai `ADMIN_TOKEN`, `SEPAY_API_KEY`, dữ liệu giao dịch riêng tư. Chỉ đăng ảnh khi có quyền sử dụng và sự đồng ý của người trong ảnh.
- Dù đặt mã quản trị, trang `/admin` vẫn có thể truy cập từ internet; chỉ các thao tác xác thực mới được thực hiện.
- Bản này phù hợp website nhỏ với **một** Node.js instance và một volume. Với quy mô lớn cần nâng cấp database, chống tấn công, sao lưu/kiểm toán giao dịch.

Tài liệu chính thức: Railway https://docs.railway.com/quick-start · Railway Volume https://docs.railway.com/volumes · Railway Domain https://docs.railway.com/networking/public-networking · SePay https://docs.sepay.vn/tich-hop-webhooks.html
