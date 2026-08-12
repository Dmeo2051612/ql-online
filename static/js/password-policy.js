export function passwordPolicyError(password, email = "") {
    const value = String(password || "");
    if (value.length < 12) return "Mật khẩu phải có ít nhất 12 ký tự.";
    if (value.length > 128) return "Mật khẩu không được vượt quá 128 ký tự.";
    if (/\s/.test(value)) return "Mật khẩu không được chứa khoảng trắng.";
    if (!/[a-z]/.test(value)) return "Mật khẩu cần có ít nhất một chữ thường.";
    if (!/[A-Z]/.test(value)) return "Mật khẩu cần có ít nhất một chữ hoa.";
    if (!/[0-9]/.test(value)) return "Mật khẩu cần có ít nhất một chữ số.";
    if (!/[^A-Za-z0-9]/.test(value)) return "Mật khẩu cần có ít nhất một ký tự đặc biệt.";

    const emailName = String(email || "").trim().toLowerCase().split("@")[0];
    if (emailName.length >= 3 && value.toLowerCase().includes(emailName)) {
        return "Mật khẩu không nên chứa tên tài khoản email.";
    }
    return "";
}
