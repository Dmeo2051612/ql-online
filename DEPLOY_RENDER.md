# Triển khai QL Online miễn phí trên Render

## 1. Đẩy mã nguồn lên GitHub

Mở PowerShell tại thư mục dự án và chạy:

```powershell
git add -A
git commit -m "Update QL Online"
git push origin main
```

Repository hiện tại: `https://github.com/Dmeo2051612/ql-online`

## 2. Tạo dịch vụ từ `render.yaml`

1. Đăng nhập `https://dashboard.render.com` bằng GitHub.
2. Chọn **New > Blueprint**.
3. Chọn repository **ql-online**.
4. Render sẽ đọc `render.yaml`; kiểm tra gói **Free** rồi tạo Blueprint.
5. Chờ lần build đầu tiên hoàn tất.

## 3. Thêm Firebase service account an toàn

1. Mở dịch vụ **ql-online** trên Render.
2. Vào **Environment > Secret Files > Add Secret File**.
3. Filename: `firebase-service-account.json`.
4. Mở file `firebase-service-account.json` trên máy, sao chép toàn bộ JSON vào **Contents**.
5. Chọn **Save, rebuild, and deploy**.

Không tải file này lên GitHub và không gửi nội dung file cho người khác. Ứng dụng đã trỏ biến
`FIREBASE_SERVICE_ACCOUNT` tới `/etc/secrets/firebase-service-account.json`.

## 4. Cho phép tên miền Render trong Firebase

Sau khi Render cấp URL dạng `https://ql-online-xxxx.onrender.com`:

1. Mở Firebase Console của dự án.
2. Vào **Authentication > Settings > Authorized domains**.
3. Chọn **Add domain**.
4. Nhập riêng hostname, ví dụ `ql-online-xxxx.onrender.com` (không nhập `https://`).

## 5. Kiểm tra

1. Mở URL Render và đăng nhập bằng tài khoản thử nghiệm.
2. Kiểm tra các trang admin, sinh viên và giáo viên.
3. Thử **Quên mật khẩu**; Firebase sẽ gửi liên kết đặt lại mật khẩu qua HTTPS.
4. Kiểm tra `https://<ten-dich-vu>.onrender.com/healthz` trả về `{"status":"ok"}`.

## Lưu ý về gói Free

- Dịch vụ có thể ngủ sau 15 phút không có truy cập; lần mở tiếp theo có thể mất khoảng một phút.
- Không lưu dữ liệu bền vững trên ổ đĩa Render. Dự án này lưu dữ liệu trong Firebase nên phù hợp.
- Firebase Spark cho phép tối đa 150 email đặt lại mật khẩu mỗi ngày, đủ cho kiểm thử đồ án.
