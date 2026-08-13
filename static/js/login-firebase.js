import { auth, db } from "./firebase-config.js";
import { passwordPolicyError } from "./password-policy.js";


import { doc, getDoc }
    from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";

import {
    signInWithEmailAndPassword,
    signOut
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
const resetOtpFields = document.getElementById("reset-otp-fields");
const resetOtpInput = document.getElementById("reset-otp");
const resetNewPasswordFields = document.getElementById("reset-new-password-fields");
const resetNewPasswordInput = document.getElementById("reset-new-password");
const resetConfirmPasswordInput = document.getElementById("reset-confirm-password");
const resendResetCodeButton = document.getElementById("resend-reset-code");
const lockoutSupport = document.getElementById("lockout-support");
const openLockoutContact = document.getElementById("open-lockout-contact");
const lockoutContactForm = document.getElementById("lockout-contact-form");
const lockoutMessage = document.getElementById("lockout-message");
const lockoutRequestState = document.getElementById("lockout-request-state");
const cancelLockoutContact = document.getElementById("cancel-lockout-contact");
const sendLockoutContact = document.getElementById("send-lockout-contact");
const forcedPasswordPanel = document.getElementById("forced-password-panel");
const forcedPasswordForm = document.getElementById("forced-password-form");
const forcedPasswordAccount = document.getElementById("forced-password-account");
const forcedCurrentPassword = document.getElementById("forced-current-password");
const forcedNewPassword = document.getElementById("forced-new-password");
const forcedConfirmPassword = document.getElementById("forced-confirm-password");
const forcedPasswordMessage = document.getElementById("forced-password-message");
const forcedPasswordSubmit = document.getElementById("forced-password-submit");


const KHOA_DANG_NHAP_KEY = "ql-online-login-lockout-v1";
const YEU_CAU_MO_KHOA_KEY = "ql-online-unlock-request-v1";
const EMAIL_MAT_KHAU_HET_HAN_KEY = "ql-online-expired-password-email";
const SO_LAN_SAI_TOI_DA = 5;
const CUA_SO_THU_DANG_NHAP = 10 * 60 * 1000;
const THOI_GIAN_KHOA = 15 * 60 * 1000;

let dangXuLyDangNhap = false;
let boDemKhoaDangNhap = null;
let boDemKiemTraMoKhoa = null;
let resetStep = "request";
let passwordResetRequestId = "";
let passwordResetToken = "";
let forcedPasswordEmail = "";


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


async function goiApiCoXacThuc(user, url, options = {}) {
    const token = await user.getIdToken(true);
    const response = await fetch(url, {
        ...options,
        headers: {
            "Authorization": `Bearer ${token}`,
            ...(options.body ? { "Content-Type": "application/json" } : {}),
            ...(options.headers || {})
        }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Không thể xử lý yêu cầu.");
    return data;
}


function hienThiBuocDoiMatKhauBatBuoc(email) {
    forcedPasswordEmail = chuanHoaEmail(email);
    emailInput.value = forcedPasswordEmail;
    loginForm.classList.add("login-form-hidden");
    loginError.textContent = "";
    loginError.classList.remove("login-success");
    lockoutSupport.classList.add("hidden");
    document.getElementById("forgot-password-panel")?.classList.add("hidden");
    forcedPasswordAccount.textContent = `Tài khoản: ${forcedPasswordEmail}`;
    forcedPasswordMessage.textContent = "";
    forcedPasswordPanel.classList.remove("hidden");
    document.querySelector(".login-card > h1").textContent = "Xác thực bảo mật";
    forcedCurrentPassword.focus();
}


function quayLaiDangNhapSauKhiDoiMatKhau() {
    forcedPasswordEmail = "";
    forcedPasswordPanel.classList.add("hidden");
    loginForm.classList.remove("login-form-hidden");
    document.querySelector(".login-card > h1").textContent = "Đăng nhập";
    passwordInput.value = "";
    loginError.classList.add("login-success");
    loginError.textContent = "Đổi mật khẩu thành công. Vui lòng đăng nhập bằng mật khẩu mới.";
    window.sessionStorage.removeItem(EMAIL_MAT_KHAU_HET_HAN_KEY);
    passwordInput.focus();
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
    loginError.classList.remove("login-success");
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
        } else if (role === "sinhvien" || role === "giaovien") {
            const trangThaiMatKhau = await goiApiCoXacThuc(
                ketQua.user,
                "/api/password-policy/status"
            );
            if (trangThaiMatKhau.expired) {
                await signOut(auth);
                setLoading(false);
                hienThiBuocDoiMatKhauBatBuoc(email);
                dangChuyenTrang = true;
                return;
            }
            dangChuyenTrang = true;
            window.location.href = role === "sinhvien" ? "/sinh-vien" : "/giao-vien";
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
        if (auth.currentUser && !dangChuyenTrang) {
            await signOut(auth).catch(() => {});
        }
    } finally {
        if (!dangChuyenTrang) {
            setLoading(false);
        }
    }
});


forcedPasswordForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    forcedPasswordMessage.textContent = "";
    const currentPassword = forcedCurrentPassword.value;
    const newPassword = forcedNewPassword.value;
    const confirmation = forcedConfirmPassword.value;
    const policyError = passwordPolicyError(newPassword, forcedPasswordEmail);
    if (!currentPassword || !newPassword || !confirmation) {
        forcedPasswordMessage.textContent = "Vui lòng nhập đầy đủ cả ba trường mật khẩu.";
        return;
    }
    if (currentPassword === newPassword) {
        forcedPasswordMessage.textContent = "Mật khẩu mới phải khác mật khẩu hiện tại.";
        return;
    }
    if (policyError) {
        forcedPasswordMessage.textContent = policyError;
        return;
    }
    if (newPassword !== confirmation) {
        forcedPasswordMessage.textContent = "Hai lần nhập mật khẩu mới chưa khớp.";
        return;
    }

    forcedPasswordSubmit.disabled = true;
    forcedPasswordSubmit.textContent = "Đang cập nhật...";
    try {
        const credential = await signInWithEmailAndPassword(
            auth,
            forcedPasswordEmail,
            currentPassword
        );
        const status = await goiApiCoXacThuc(
            credential.user,
            "/api/password-policy/status"
        );
        if (status.exempt) {
            throw new Error("Tài khoản quản trị không áp dụng chính sách hết hạn mật khẩu.");
        }
        await goiApiCoXacThuc(credential.user, "/api/password-policy/change", {
            method: "POST",
            body: JSON.stringify({ currentPassword, newPassword })
        });
        await signOut(auth);
        forcedPasswordForm.reset();
        quayLaiDangNhapSauKhiDoiMatKhau();
        window.history.replaceState({}, "", "/");
    } catch (loi) {
        await signOut(auth).catch(() => {});
        const code = String(loi?.code || "").toLowerCase();
        forcedPasswordMessage.textContent = laLoiSaiThongTinDangNhap(code)
            ? "Mật khẩu hiện tại không đúng."
            : (loi?.message || "Không thể cập nhật mật khẩu lúc này.");
    } finally {
        forcedPasswordSubmit.disabled = false;
        forcedPasswordSubmit.textContent = "Cập nhật mật khẩu";
    }
});


const thamSoDangNhap = new URLSearchParams(window.location.search);
if (thamSoDangNhap.get("passwordExpired") === "1") {
    hienThiBuocDoiMatKhauBatBuoc(
        window.sessionStorage.getItem(EMAIL_MAT_KHAU_HET_HAN_KEY) || emailInput.value
    );
}


function resetStepLabel() {
    if (resetStep === "verify") return "Xác minh mã OTP";
    if (resetStep === "complete") return "Cập nhật mật khẩu";
    if (resetStep === "done") return "Hoàn tất";
    return "Gửi mã OTP";
}


function setResetLoading(dang) {
    resetButton.disabled = dang || resetStep === "done";
    resendResetCodeButton.disabled = dang;
    resetButtonText.textContent = dang
        ? (resetStep === "verify" ? "Đang xác minh..." : resetStep === "complete" ? "Đang cập nhật..." : "Đang gửi mã...")
        : resetStepLabel();
    resetSpinner.classList.toggle("hidden", !dang);
}


function setResetStep(nextStep) {
    resetStep = nextStep;
    const dangNhapOtp = nextStep === "verify";
    const dangNhapMatKhau = nextStep === "complete";
    resetEmailInput.readOnly = nextStep !== "request";
    resetOtpFields.classList.toggle("hidden", !dangNhapOtp);
    resetNewPasswordFields.classList.toggle("hidden", !dangNhapMatKhau);
    resetButtonText.textContent = resetStepLabel();
    if (dangNhapOtp) resetOtpInput.focus();
    if (dangNhapMatKhau) resetNewPasswordInput.focus();
}


function resetPasswordFlow() {
    forgotPasswordForm.reset();
    passwordResetRequestId = "";
    passwordResetToken = "";
    resetMessage.className = "";
    resetMessage.textContent = "";
    setResetStep("request");
}


async function postResetApi(path, payload) {
    const response = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(data.error || "Không thể xử lý yêu cầu. Vui lòng thử lại.");
    }
    return data;
}


async function requestResetOtp() {
    const email = resetEmailInput.value.trim();

    if (!email || !resetEmailInput.validity.valid) {
        throw new Error("Vui lòng nhập một địa chỉ email hợp lệ.");
    }
    const data = await postResetApi("/api/password-reset/request", { email });
    passwordResetRequestId = String(data.requestId || "");
    passwordResetToken = "";
    resetOtpInput.value = "";
    setResetStep("verify");
    resetMessage.className = "message-success";
    resetMessage.textContent = "Mã OTP đã được gửi, vui lòng kiểm tra email của bạn.";
}


async function verifyResetOtp() {
    const otp = resetOtpInput.value.replace(/\D/g, "");
    if (!/^\d{6}$/.test(otp)) {
        throw new Error("Vui lòng nhập đúng mã OTP gồm 6 chữ số.");
    }
    const data = await postResetApi("/api/password-reset/verify", {
        requestId: passwordResetRequestId,
        otp,
    });
    passwordResetToken = String(data.resetToken || "");
    setResetStep("complete");
    resetMessage.className = "message-success";
    resetMessage.textContent = "Mã OTP hợp lệ. Vui lòng đặt mật khẩu mới.";
}


async function completeResetPassword() {
    const password = resetNewPasswordInput.value;
    const confirmation = resetConfirmPasswordInput.value;
    const policyError = passwordPolicyError(password, resetEmailInput.value);
    if (policyError) throw new Error(policyError);
    if (password !== confirmation) {
        throw new Error("Mật khẩu nhập lại chưa khớp.");
    }
    await postResetApi("/api/password-reset/complete", {
        requestId: passwordResetRequestId,
        resetToken: passwordResetToken,
        password,
    });
    emailInput.value = resetEmailInput.value.trim();
    passwordResetRequestId = "";
    passwordResetToken = "";
    setResetStep("done");
    resetMessage.className = "message-success";
    resetMessage.textContent = "Đặt lại mật khẩu thành công. Bạn có thể quay lại đăng nhập.";
}


forgotPasswordForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    resetMessage.className = "";
    resetMessage.textContent = "";

    setResetLoading(true);

    try {
        if (resetStep === "verify") {
            await verifyResetOtp();
        } else if (resetStep === "complete") {
            await completeResetPassword();
        } else {
            await requestResetOtp();
        }
    } catch (loi) {
        console.error("Không thể đặt lại mật khẩu:", loi);
        resetMessage.className = "message-error";
        resetMessage.textContent = loi?.message || "Không thể xử lý yêu cầu. Vui lòng thử lại.";
    } finally {
        setResetLoading(false);
    }
});


resetOtpInput?.addEventListener("input", function () {
    this.value = this.value.replace(/\D/g, "").slice(0, 6);
});


resendResetCodeButton?.addEventListener("click", async function () {
    resetMessage.className = "";
    resetMessage.textContent = "";
    setResetLoading(true);
    try {
        resetEmailInput.readOnly = false;
        await requestResetOtp();
    } catch (loi) {
        resetMessage.className = "message-error";
        resetMessage.textContent = loi?.message || "Không thể gửi lại mã OTP.";
    } finally {
        setResetLoading(false);
    }
});


cancelForgotPasswordButton?.addEventListener("click", function () {
    resetPasswordFlow();
});


capNhatGiaoDienKhoa(emailInput.value);
