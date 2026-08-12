import { auth, db } from "./firebase-config.js";


import { doc, getDoc }
    from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";


import { onAuthStateChanged, signOut }
    from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";


function capNhatEmail(noiDung) {
    const cacViTriEmail =
        document.querySelectorAll(".firebase-user-email");

    cacViTriEmail.forEach(function (phanTu) {
        phanTu.textContent = noiDung;
    });
}


function hienThiLoiXacThuc(noiDung) {
    capNhatEmail("Không thể xác thực");

    let banner = document.getElementById("admin-auth-error");

    if (!banner) {
        banner = document.createElement("div");
        banner.id = "admin-auth-error";
        banner.className = "auth-error-banner";
        banner.setAttribute("role", "alert");

        const message = document.createElement("span");
        const retryButton = document.createElement("button");

        message.className = "auth-error-message";
        retryButton.type = "button";
        retryButton.textContent = "Tải lại";
        retryButton.addEventListener("click", function () {
            window.location.reload();
        });

        banner.append(message, retryButton);
        document.querySelector(".main-content")?.prepend(banner);
    }

    const message = banner.querySelector(".auth-error-message");

    if (message) {
        message.textContent = noiDung;
    }
}


onAuthStateChanged(auth, async function (user) {
    try {
        if (!user) {
            window.location.href = "/";
            return;
        }

        const taiLieuNguoiDung = await getDoc(
            doc(db, "users", user.uid)
        );

        if (!taiLieuNguoiDung.exists()) {
            window.location.href = "/";
            return;
        }

        const nguoiDung = taiLieuNguoiDung.data();

        if (nguoiDung.role !== "admin") {
            window.location.href = "/";
            return;
        }

        capNhatEmail(user.email || "Admin");
    } catch (loi) {
        console.error("Không thể xác thực phiên admin:", loi);
        hienThiLoiXacThuc(
            "Không thể xác thực phiên đăng nhập. Hãy kiểm tra mạng rồi tải lại trang."
        );
    }
});


const logoutForm =
    document.getElementById("logout-form");


logoutForm.addEventListener(
    "submit",
    async function (event) {
        event.preventDefault();

        const logoutButton = logoutForm.querySelector("button");
        const noiDungCu = logoutButton.textContent;

        logoutButton.disabled = true;
        logoutButton.textContent = "Đang đăng xuất...";

        try {
            await signOut(auth);

            window.location.href = "/";
        } catch (loi) {
            console.error("Không thể đăng xuất:", loi);
            hienThiLoiXacThuc(
                "Không thể đăng xuất. Hãy kiểm tra kết nối và thử lại."
            );
            logoutButton.disabled = false;
            logoutButton.textContent = noiDungCu;
        }
    }
);
