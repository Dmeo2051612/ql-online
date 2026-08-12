import { auth, db } from "./firebase-config.js";


import { doc, getDoc }
    from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";

import {
    sendPasswordResetEmail,
    signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";


const loginForm = document.getElementById("login-form");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("matkhau");
const loginError = document.getElementById("login-error");
const loginButton = document.getElementById("login-button");
const buttonText = document.getElementById("login-button-text");
const spinner = document.getElementById("login-spinner");

const forgotPasswordForm = document.getElementById("forgot-password-form");
const resetEmailInput = document.getElementById("reset-email");
const resetMessage = document.getElementById("reset-password-message");
const resetButton = document.getElementById("send-reset-email");
const resetButtonText = document.getElementById("reset-button-text");
const resetSpinner = document.getElementById("reset-spinner");
const cancelForgotPasswordButton = document.getElementById("cancel-forgot-password");
const lockoutSupport = document.getElementById("lockout-support");
const openLockoutContact = document.getElementById("open-lockout-contact");
const lockoutContactForm = document.getElementById("lockout-contact-form");
const lockoutMessage = document.getElementById("lockout-message");
const lockoutRequestState = document.getElementById("lockout-request-state");
const cancelLockoutContact = document.getElementById("cancel-lockout-contact");
const sendLockoutContact = document.getElementById("send-lockout-contact");


const KHOA_DANG_NHAP_KEY = "ql-online-login-lockout-v1";
const YEU_CAU_MO_KHOA_KEY = "ql-online-unlock-request-v1";
const SO_LAN_SAI_TOI_DA = 5;
const CUA_SO_THU_DANG_NHAP = 10 * 60 * 1000;
const THOI_GIAN_KHOA = 15 * 60 * 1000;

let dangXuLyDangNhap = false;
let boDemKhoaDangNhap = null;
let boDemKiemTraMoKhoa = null;


auth.languageCode = "vi";


function chuanHoaEmail(email) {
    return String(email || "").trim().toLowerCase();
}


function docDuLieuKhoaDangNhap() {
    try {
        const duLieu = JSON.parse(
            window.localStorage.getItem(KHOA_DANG_NHAP_KEY) || "{}"
        );

        return duLieu && typeof duLieu === "object" ? duLieu : {};
    } catch (loi) {
        console.warn("Không thể đọc trạng thái khóa đăng nhập:", loi);
        return {};
    }
}


function luuDuLieuKhoaDangNhap(duLieu) {
    try {
        if (Object.keys(duLieu).length === 0) {
            window.localStorage.removeItem(KHOA_DANG_NHAP_KEY);
        } else {
            window.localStorage.setItem(
                KHOA_DANG_NHAP_KEY,
                JSON.stringify(duLieu)
            );
        }
    } catch (loi) {
        console.warn("Không thể lưu trạng thái khóa đăng nhập:", loi);
    }
}


function docYeuCauMoKhoa() {
    try {
        return JSON.parse(localStorage.getItem(YEU_CAU_MO_KHOA_KEY) || "{}");
    } catch (_) {
        return {};
    }
}


function luuYeuCauMoKhoa(duLieu) {
    if (Object.keys(duLieu).length) {
        localStorage.setItem(YEU_CAU_MO_KHOA_KEY, JSON.stringify(duLieu));
    } else {
        localStorage.removeItem(YEU_CAU_MO_KHOA_KEY);
    }
}


function layYeuCauMoKhoa(email) {
    return docYeuCauMoKhoa()[chuanHoaEmail(email)] || null;
}


function xoaYeuCauMoKhoa(email) {
    const duLieu = docYeuCauMoKhoa();
    delete duLieu[chuanHoaEmail(email)];
    luuYeuCauMoKhoa(duLieu);
}


function capNhatHoTroKhoa(email, dangBiKhoa) {
    lockoutSupport.classList.toggle("hidden", !dangBiKhoa);
    if (!dangBiKhoa) {
        window.clearTimeout(boDemKiemTraMoKhoa);
        boDemKiemTraMoKhoa = null;
        lockoutContactForm.classList.add("hidden");
        lockoutRequestState.textContent = "";
        return;
    }
    const yeuCau = layYeuCauMoKhoa(email);
    openLockoutContact.classList.toggle("hidden", Boolean(yeuCau));
    if (!yeuCau) {
        lockoutRequestState.textContent = "Nếu cần hỗ trợ sớm, bạn có thể gửi yêu cầu tới nhà trường.";
        return;
    }
    lockoutRequestState.textContent = yeuCau.status === "rejected"
        ? "Nhà trường đã từ chối yêu cầu. Tài khoản vẫn đang bị khóa."
        : "Đã gửi yêu cầu. Tài khoản vẫn bị khóa trong khi chờ admin xử lý.";
    if (yeuCau.status === "pending" && !boDemKiemTraMoKhoa) {
        boDemKiemTraMoKhoa = window.setTimeout(() => {
            boDemKiemTraMoKhoa = null;
            kiemTraYeuCauMoKhoa(email);
        }, 3000);
    }
}


async function kiemTraYeuCauMoKhoa(email) {
    const yeuCau = layYeuCauMoKhoa(email);
    if (!yeuCau?.id) return;
    try {
        const response = await fetch(`/api/login-unlock-requests/${encodeURIComponent(yeuCau.id)}/status`);
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || "Không thể kiểm tra yêu cầu.");
        if (data.status === "approved") {
            xoaTrangThaiDangNhapSai(email);
            xoaYeuCauMoKhoa(email);
            loginError.textContent = "Nhà trường đã mở khóa. Bạn có thể đăng nhập lại.";
            capNhatGiaoDienKhoa(email);
            return;
        }
        const duLieu = docYeuCauMoKhoa();
        duLieu[chuanHoaEmail(email)] = { ...yeuCau, status: data.status };
        luuYeuCauMoKhoa(duLieu);
    } catch (loi) {
        console.warn("Không thể kiểm tra yêu cầu mở khóa:", loi);
    }
    capNhatHoTroKhoa(email, Boolean(layTrangThaiKhoa(email)?.lockedUntil));
}


function layTrangThaiKhoa(email) {
    const khoaEmail = chuanHoaEmail(email);

    if (!khoaEmail) {
        return null;
    }

    const duLieu = docDuLieuKhoaDangNhap();
    const trangThai = duLieu[khoaEmail];

    if (!trangThai) {
        return null;
    }

    const bayGio = Date.now();
    const hetHanKhoa = Number(trangThai.lockedUntil || 0) <= bayGio;
    const hetCuaSoThu =
        bayGio - Number(trangThai.firstFailureAt || 0) > CUA_SO_THU_DANG_NHAP;

    if ((trangThai.lockedUntil && hetHanKhoa) ||
        (!trangThai.lockedUntil && hetCuaSoThu)) {
        delete duLieu[khoaEmail];
        luuDuLieuKhoaDangNhap(duLieu);
        xoaYeuCauMoKhoa(email);
        return null;
    }

    return trangThai;
}


function dinhDangThoiGianConLai(milliseconds) {
    const tongGiay = Math.max(0, Math.ceil(milliseconds / 1000));
    const phut = Math.floor(tongGiay / 60);
    const giay = tongGiay % 60;

    return `${String(phut).padStart(2, "0")}:${String(giay).padStart(2, "0")}`;
}


function capNhatGiaoDienKhoa(email) {
    window.clearTimeout(boDemKhoaDangNhap);

    const trangThai = layTrangThaiKhoa(email);
    const thoiGianConLai = Number(trangThai?.lockedUntil || 0) - Date.now();

    if (thoiGianConLai > 0) {
        const thoiGian = dinhDangThoiGianConLai(thoiGianConLai);

        loginButton.disabled = true;
        spinner.classList.add("hidden");
        buttonText.textContent = `Tạm khóa ${thoiGian}`;
        loginError.dataset.lockout = "true";
        loginError.textContent =
            `Đăng nhập tạm khóa trên thiết bị này. Vui lòng thử lại sau ${thoiGian}.`;
        capNhatHoTroKhoa(email, true);

        boDemKhoaDangNhap = window.setTimeout(function () {
            capNhatGiaoDienKhoa(emailInput.value);
        }, 1000);

        return true;
    }

    capNhatHoTroKhoa(email, false);

    if (loginError.dataset.lockout === "true") {
        loginError.textContent = "Bạn có thể thử đăng nhập lại.";
        delete loginError.dataset.lockout;
    }

    if (!dangXuLyDangNhap) {
        loginButton.disabled = false;
        spinner.classList.add("hidden");
        buttonText.textContent = "Đăng nhập";
    }

    return false;
}


function ghiNhanDangNhapSai(email, khoaNgay = false) {
    const khoaEmail = chuanHoaEmail(email);
    const duLieu = docDuLieuKhoaDangNhap();
    const bayGio = Date.now();
    let trangThai = duLieu[khoaEmail];

    if (!trangThai ||
        bayGio - Number(trangThai.firstFailureAt || 0) > CUA_SO_THU_DANG_NHAP) {
        trangThai = {
            attempts: 0,
            firstFailureAt: bayGio,
            lockedUntil: 0
        };
    }

    trangThai.attempts = Number(trangThai.attempts || 0) + 1;

    if (khoaNgay || trangThai.attempts >= SO_LAN_SAI_TOI_DA) {
        trangThai.lockedUntil = bayGio + THOI_GIAN_KHOA;
    }

    duLieu[khoaEmail] = trangThai;
    luuDuLieuKhoaDangNhap(duLieu);

    return trangThai;
}


function xoaTrangThaiDangNhapSai(email) {
    const khoaEmail = chuanHoaEmail(email);
    const duLieu = docDuLieuKhoaDangNhap();

    delete duLieu[khoaEmail];
    luuDuLieuKhoaDangNhap(duLieu);
    xoaYeuCauMoKhoa(email);
}


function laLoiSaiThongTinDangNhap(maLoi) {
    return [
        "invalid-credential",
        "invalid-login-credentials",
        "wrong-password",
        "user-not-found"
    ].some(function (ma) {
        return maLoi.includes(ma);
    });
}


function setLoading(dang) {
    dangXuLyDangNhap = dang;
    loginButton.disabled = dang;

    if (dang) {
        window.clearTimeout(boDemKhoaDangNhap);
        buttonText.textContent = "Đang đăng nhập...";
        spinner.classList.remove("hidden");
    } else {
        capNhatGiaoDienKhoa(emailInput.value);
    }
}


emailInput.addEventListener("input", function () {
    if (!dangXuLyDangNhap) {
        capNhatGiaoDienKhoa(emailInput.value);
    }
});


openLockoutContact.addEventListener("click", function () {
    lockoutContactForm.classList.remove("hidden");
    openLockoutContact.classList.add("hidden");
    if (!lockoutMessage.value.trim()) {
        lockoutMessage.value = [
            "Mã: ",
            "Họ tên: ",
            "Khoa: ",
            `Email: ${chuanHoaEmail(emailInput.value)}`,
            "Lý do: "
        ].join("\n");
    }
    lockoutMessage.focus();
});


cancelLockoutContact.addEventListener("click", function () {
    lockoutContactForm.classList.add("hidden");
    openLockoutContact.classList.remove("hidden");
});


lockoutContactForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    const email = chuanHoaEmail(emailInput.value);
    const trangThaiKhoa = layTrangThaiKhoa(email);
    if (!trangThaiKhoa?.lockedUntil) {
        capNhatGiaoDienKhoa(email);
        return;
    }
    sendLockoutContact.disabled = true;
    sendLockoutContact.textContent = "Đang gửi...";
    lockoutRequestState.textContent = "";
    try {
        const response = await fetch("/api/login-unlock-requests", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, message: lockoutMessage.value.trim() })
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || "Không thể gửi yêu cầu.");
        const duLieu = docYeuCauMoKhoa();
        duLieu[email] = {
            id: data.id,
            status: "pending"
        };
        luuYeuCauMoKhoa(duLieu);
        lockoutContactForm.reset();
        lockoutContactForm.classList.add("hidden");
        capNhatHoTroKhoa(email, true);
    } catch (loi) {
        lockoutRequestState.textContent = loi.message || "Không thể gửi yêu cầu.";
        openLockoutContact.classList.remove("hidden");
    } finally {
        sendLockoutContact.disabled = false;
        sendLockoutContact.textContent = "Gửi yêu cầu";
    }
});


loginForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    loginError.textContent = "";
    delete loginError.dataset.lockout;

    const email = emailInput.value.trim();
    const matkhau = passwordInput.value;

    if (!email || !matkhau) {
        loginError.textContent = "Vui lòng nhập đầy đủ email và mật khẩu.";
        return;
    }

    if (!emailInput.validity.valid) {
        loginError.textContent = "Email chưa đúng định dạng.";
        emailInput.focus();
        return;
    }

    if (capNhatGiaoDienKhoa(email)) {
        return;
    }

    setLoading(true);
    let dangChuyenTrang = false;

    try {
        const ketQua = await signInWithEmailAndPassword(auth, email, matkhau);
        xoaTrangThaiDangNhapSai(email);

        const taiLieuNguoiDung = await getDoc(
            doc(db, "users", ketQua.user.uid)
        );

        if (!taiLieuNguoiDung.exists()) {
            loginError.textContent = "Tài khoản chưa được phân quyền.";
            return;
        }

        const role = taiLieuNguoiDung.data().role;

        if (role === "admin") {
            dangChuyenTrang = true;
            window.location.href = "/admin";
        } else if (role === "sinhvien") {
            dangChuyenTrang = true;
            window.location.href = "/sinh-vien";
        } else if (role === "giaovien") {
            dangChuyenTrang = true;
            window.location.href = "/giao-vien";
        } else {
            loginError.textContent = "Tài khoản không có phân quyền hợp lệ.";
        }
    } catch (loi) {
        const maLoi = String(loi?.code || "").toLowerCase();

        if (maLoi.includes("too-many-requests")) {
            ghiNhanDangNhapSai(email, true);
            loginError.textContent =
                "Firebase đã chặn do có quá nhiều lần thử. Tài khoản tạm khóa 15 phút trên thiết bị này.";
        } else if (maLoi.includes("network-request-failed")) {
            loginError.textContent =
                "Không thể kết nối Firebase. Vui lòng kiểm tra mạng.";
        } else if (laLoiSaiThongTinDangNhap(maLoi)) {
            const trangThai = ghiNhanDangNhapSai(email);
            const soLanConLai = Math.max(
                0,
                SO_LAN_SAI_TOI_DA - Number(trangThai.attempts || 0)
            );

            loginError.textContent = trangThai.lockedUntil
                ? "Đăng nhập sai quá số lần cho phép. Tài khoản tạm khóa 15 phút trên thiết bị này."
                : `Email hoặc mật khẩu không đúng. Còn ${soLanConLai} lần thử.`;
        } else {
            loginError.textContent = "Không thể đăng nhập. Vui lòng thử lại.";
        }
    } finally {
        if (!dangChuyenTrang) {
            setLoading(false);
        }
    }
});


function setResetLoading(dang) {
    resetButton.disabled = dang;
    resetButtonText.textContent = dang ? "Đang gửi liên kết..." : "Gửi liên kết đặt lại";
    resetSpinner.classList.toggle("hidden", !dang);
}


forgotPasswordForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const email = resetEmailInput.value.trim();

    resetMessage.className = "";
    resetMessage.textContent = "";

    if (!email || !resetEmailInput.validity.valid) {
        resetMessage.className = "message-error";
        resetMessage.textContent = "Vui lòng nhập một địa chỉ email hợp lệ.";
        resetEmailInput.focus();
        return;
    }

    setResetLoading(true);

    try {
        await sendPasswordResetEmail(auth, email);
        resetMessage.className = "message-success";
        resetMessage.textContent = "Nếu email đã đăng ký, Firebase đã gửi liên kết đặt lại mật khẩu. Hãy kiểm tra cả thư rác.";
    } catch (loi) {
        console.error("Không thể đặt lại mật khẩu:", loi);
        const code = String(loi?.code || "");
        if (code.includes("user-not-found")) {
            resetMessage.className = "message-success";
            resetMessage.textContent = "Nếu email đã đăng ký, Firebase đã gửi liên kết đặt lại mật khẩu. Hãy kiểm tra cả thư rác.";
        } else {
            resetMessage.className = "message-error";
            resetMessage.textContent = code.includes("too-many-requests")
                ? "Bạn đã yêu cầu quá nhiều lần. Vui lòng thử lại sau."
                : "Không thể gửi liên kết đặt lại mật khẩu. Vui lòng thử lại.";
        }
    } finally {
        setResetLoading(false);
    }
});


cancelForgotPasswordButton?.addEventListener("click", function () {
    forgotPasswordForm.reset();
    resetMessage.className = "";
    resetMessage.textContent = "";
});


capNhatGiaoDienKhoa(emailInput.value);
