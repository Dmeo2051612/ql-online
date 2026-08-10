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
        "student-logout-button"
    );


if (nutDangXuat) {
    nutDangXuat.addEventListener(
        "click",
        async function () {
            try {
                await signOut(auth);

                window.location.href =
                    "/";

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


onAuthStateChanged(
    auth,
    async function (user) {
        try {
            if (!user) {
                window.location.href =
                    "/";

                return;
            }

            const taiLieuNguoiDung =
                await getDoc(
                    doc(
                        db,
                        "users",
                        user.uid
                    )
                );

            if (
                !taiLieuNguoiDung.exists()
            ) {
                window.location.href =
                    "/";

                return;
            }

            const nguoiDung =
                taiLieuNguoiDung.data();

            const vaiTro =
                String(
                    nguoiDung.role ||
                    ""
                )
                    .trim()
                    .toLowerCase();

            if (
                vaiTro !==
                "sinhvien"
            ) {
                window.location.href =
                    "/";

                return;
            }

            const maSinhVien =
                String(
                    nguoiDung.masv ||
                    ""
                ).trim();

            if (!maSinhVien) {
                throw new Error(
                    "Tài khoản chưa được liên kết với mã sinh viên."
                );
            }

            document.querySelectorAll(
                ".firebase-user-email"
            ).forEach(
                function (phanTu) {
                    phanTu.textContent =
                        user.email || "";
                }
            );

            window.dispatchEvent(
                new CustomEvent(
                    "sinhvien-ready",
                    {
                        detail: {
                            masv:
                                maSinhVien,

                            email:
                                user.email ||
                                ""
                        }
                    }
                )
            );

        } catch (loi) {
            console.error(
                "Lỗi xác thực sinh viên:",
                loi
            );

            alert(
                loi.message ||
                "Không thể xác thực tài khoản sinh viên."
            );

            await signOut(auth);

            window.location.href =
                "/";
        }
    }
);
