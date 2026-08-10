import { auth, db } from "./firebase-config.js";


import { doc, getDoc }
    from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";

import { signInWithEmailAndPassword }
    from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";


const loginForm = document.getElementById("login-form");

const emailInput = document.getElementById("email");

const passwordInput = document.getElementById("matkhau");

const loginError = document.getElementById("login-error");



loginForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    loginError.textContent = "";

    const email = emailInput.value.trim();
    const matkhau = passwordInput.value;


    try {
        const ketQua = await signInWithEmailAndPassword(
            auth,
            email,
            matkhau
        );

        const uid = ketQua.user.uid;


        const thamChieuNguoiDung = doc(
            db,
            "users",
            uid
        );

        const taiLieuNguoiDung =
            await getDoc(thamChieuNguoiDung);

        if (!taiLieuNguoiDung.exists()) {
            loginError.textContent =
                "Tài khoản chưa được phân quyền.";

            return;
        }


        const nguoiDung = taiLieuNguoiDung.data();
        const role = nguoiDung.role;

        if (role === "admin") {
            window.location.href = "/admin";
            return;
        }
        else if (role === "sinhvien") {
            console.log("Sẽ vào trang Sinh viên");

            window.location.href = "/sinh-vien";
            return;
        }
        else if (role === "giaovien") {
            console.log("Sẽ vào trang Giáo viên");

            window.location.href = "/giao-vien";
            return;
        }
        else {
            loginError.textContent =
                "Tài khoản không có phân quyền hợp lệ.";
        }
        

        console.log("Phân quyền:", nguoiDung.role);

        console.log("Đăng nhập thành công!");
        console.log(ketQua.user.uid);
    }


    catch (loi) {
        console.log(loi);

        loginError.textContent =
            "Email hoặc mật khẩu không đúng.";
    }

    console.log(email);
});