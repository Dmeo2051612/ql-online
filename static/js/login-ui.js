const togglePasswordButton = document.getElementById("toggle-password");
const passwordField = document.getElementById("matkhau");
const passwordIcon = document.getElementById("eye-icon");
const forgotPasswordButton = document.getElementById("open-forgot-password");
const cancelForgotPasswordButton = document.getElementById("cancel-forgot-password");
const forgotPasswordPanel = document.getElementById("forgot-password-panel");
const loginEmailField = document.getElementById("email");
const resetEmailField = document.getElementById("reset-email");


if (togglePasswordButton && passwordField && passwordIcon) {
    togglePasswordButton.addEventListener("click", function () {
        const dangHienMatKhau = passwordField.type === "text";

        passwordField.type = dangHienMatKhau ? "password" : "text";
        passwordIcon.textContent = dangHienMatKhau ? "👁" : "🙈";
        togglePasswordButton.setAttribute(
            "aria-label",
            dangHienMatKhau ? "Hiện mật khẩu" : "Ẩn mật khẩu"
        );
        togglePasswordButton.setAttribute(
            "aria-pressed",
            String(!dangHienMatKhau)
        );
    });
}


function datTrangThaiQuenMatKhau(dangMo) {
    if (!forgotPasswordPanel || !forgotPasswordButton) {
        return;
    }

    forgotPasswordPanel.classList.toggle("hidden", !dangMo);
    forgotPasswordButton.setAttribute("aria-expanded", String(dangMo));

    if (dangMo && resetEmailField) {
        resetEmailField.value = loginEmailField?.value.trim() || "";
        resetEmailField.focus();
    } else if (!dangMo && loginEmailField) {
        loginEmailField.focus();
    }
}


forgotPasswordButton?.addEventListener("click", function () {
    datTrangThaiQuenMatKhau(true);
});


cancelForgotPasswordButton?.addEventListener("click", function () {
    datTrangThaiQuenMatKhau(false);
});
