import {
    auth,
    db
} from "./firebase-config.js";



import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";



import {
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";




const nutDangXuat =
    document.getElementById(
        "teacher-logout-button"
    );


if (nutDangXuat) {
    nutDangXuat.addEventListener(
        "click",
        async function () {
            try {
                await signOut(auth);

                window.location.href = "/";
            } catch (loi) {
                console.error(
                    "Lỗi đăng xuất:",
                    loi
                );

                alert(
                    "Không thể đăng xuất."
                );
            }
        }
    );
}





onAuthStateChanged(auth, async function (user) {
    if (!user) {
        console.log("Chưa đăng nhập Firebase.");

        window.location.href = "/";
        return;
    }

    try {
        /*
         * BƯỚC 1:
         * Tìm tài liệu users/{uid} của tài khoản
         * đang đăng nhập.
         */
        const thamChieuNguoiDung = doc(
            db,
            "users",
            user.uid
        );

        const taiLieuNguoiDung = await getDoc(
            thamChieuNguoiDung
        );

        if (!taiLieuNguoiDung.exists()) {
            throw new Error(
                "Không tìm thấy thông tin tài khoản."
            );
        }

        const nguoiDung = taiLieuNguoiDung.data();

        /*
         * Chuyển role về chữ thường để tránh:
         * "GiaoVien", "giaovien", "GIAOVIEN"
         * bị xem là khác nhau.
         */
        const vaiTro = String(
            nguoiDung.role || ""
        ).trim().toLowerCase();

        if (vaiTro !== "giaovien") {
            throw new Error(
                "Tài khoản này không phải giáo viên."
            );
        }

        /*
         * BƯỚC 2:
         * Lấy mã giáo viên từ users/{uid}.
         */
        const maGiaoVienDangNhap = String(
            nguoiDung.magv || ""
        ).trim();
        

        if (!maGiaoVienDangNhap) {
            throw new Error(
                "Tài khoản giáo viên chưa có mã giáo viên."
            );
        }

        /*
         * BƯỚC 3:
         * Kiểm tra tài liệu giaovien/{magv}.
         */
        const thamChieuGiaoVien = doc(
            db,
            "giaovien",
            maGiaoVienDangNhap
        );

        const taiLieuGiaoVien = await getDoc(
            thamChieuGiaoVien
        );

        if (!taiLieuGiaoVien.exists()) {
            throw new Error(
                "Không tìm thấy hồ sơ giáo viên."
            );
        }

        const giaoVien = taiLieuGiaoVien.data();

        /*
         * UID trong hồ sơ giáo viên phải khớp
         * UID đang đăng nhập.
         */
        if (
            giaoVien.uid &&
            giaoVien.uid !== user.uid
        ) {
            throw new Error(
                "Tài khoản không khớp với hồ sơ giáo viên."
            );
        }

        

        /*
         * Đổ email Firebase vào tất cả phần tử
         * có class firebase-user-email.
         */
        const cacViTriEmail = document.querySelectorAll(
            ".firebase-user-email"
        );

        cacViTriEmail.forEach(function (phanTu) {
            phanTu.textContent = user.email || "";
        });

        /*
         * BƯỚC 4:
         * Sau khi xác thực thành công mới tải lớp môn.
         */
        cacViTriEmail.forEach(function (phanTu) {
            phanTu.textContent = user.email || "";
        });



    } catch (loi) {
        console.error(
            "Lỗi kiểm tra giáo viên:",
            loi
        );

        alert(loi.message);

        window.location.href = "/";
    }
});
