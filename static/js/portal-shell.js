import { auth, db } from "./firebase-config.js";

import {
    EmailAuthProvider,
    onAuthStateChanged,
    reauthenticateWithCredential,
    signOut
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";

import {
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";
import { passwordPolicyError } from "./password-policy.js";


const THEME_KEY = "ql-online-theme";
let currentUser = null;
let currentProfile = null;
let notifications = [];
let localNoteNotifications = [];
let notificationAbortController = null;
let editingNotificationId = null;
let currentRecipientType = "sinhvien";
let recipientCache = { sinhvien: null, giaovien: null };
let selectedRecipientUids = new Set();
let manuallyDeselectedUids = new Set();
let heartbeatTimer = null;
let noteReminderTimer = null;
let passwordPolicyTimer = null;
let passwordChangeRequired = false;
let displayedPasswordWarning = "";
let displayedGracePrompt = "";

const NOTE_REMINDER_BEFORE_MINUTES = 30;
const NOTE_REMINDER_AFTER_MINUTES = 60;


function escapeHtml(value) {
    const element = document.createElement("span");
    element.textContent = String(value || "");
    return element.innerHTML;
}


function roleLabel(role) {
    return {
        admin: "Quản trị viên",
        sinhvien: "Sinh viên",
        giaovien: "Giáo viên"
    }[role] || "Người dùng";
}


function profileCode(profile) {
    return profile?.masv || profile?.magv || "—";
}


function applyTheme(theme) {
    const dark = theme === "dark";
    document.body.classList.toggle("portal-dark", dark);
    document.documentElement.style.colorScheme = dark ? "dark" : "light";
    localStorage.setItem(THEME_KEY, dark ? "dark" : "light");
    window.dispatchEvent(new CustomEvent("portal-theme-change", {
        detail: { theme: dark ? "dark" : "light" }
    }));

    const button = document.getElementById("portal-theme-toggle");
    if (button) {
        button.textContent = dark ? "☀️ Chế độ sáng" : "🌙 Chế độ tối";
    }
}


applyTheme(localStorage.getItem(THEME_KEY) || "light");


function showToast(message, type = "success") {
    let toast = document.getElementById("portal-toast");
    if (!toast) {
        toast = document.createElement("div");
        toast.id = "portal-toast";
        toast.setAttribute("role", "status");
        document.body.append(toast);
    }
    toast.className = `portal-toast portal-toast-${type}`;
    toast.textContent = message;
    window.clearTimeout(showToast.timer);
    requestAnimationFrame(() => toast.classList.add("visible"));
    showToast.timer = window.setTimeout(() => toast.classList.remove("visible"), 3500);
}


function closePopovers() {
    document.getElementById("portal-notification-panel")?.classList.add("hidden");
    document.getElementById("portal-account-panel")?.classList.add("hidden");
    document.getElementById("portal-notification-button")?.setAttribute("aria-expanded", "false");
    document.getElementById("portal-account-button")?.setAttribute("aria-expanded", "false");
}


function togglePopover(panelId, buttonId) {
    const panel = document.getElementById(panelId);
    const button = document.getElementById(buttonId);
    const wasHidden = panel.classList.contains("hidden");
    closePopovers();
    panel.classList.toggle("hidden", !wasHidden);
    button.setAttribute("aria-expanded", String(wasHidden));
}


function injectShell() {
    const header = document.querySelector(".topbar, .top-header, .teacher-header");
    if (!header || document.getElementById("portal-header-actions")) {
        return;
    }

    const greeting = header.querySelector(":scope > p");
    if (greeting) {
        greeting.classList.add("portal-header-greeting");
    }

    const actions = document.createElement("div");
    actions.id = "portal-header-actions";
    actions.className = "portal-header-actions";
    actions.innerHTML = `
        <button class="portal-icon-button" id="portal-notification-button" type="button"
            aria-label="Thông báo" aria-expanded="false">
            <span aria-hidden="true">🔔</span>
            <span class="portal-badge hidden" id="portal-notification-badge">0</span>
        </button>
        <button class="portal-avatar-button" id="portal-account-button" type="button"
            aria-label="Tài khoản" aria-expanded="false">
            <img class="portal-avatar-image hidden" id="portal-header-avatar" alt="Ảnh đại diện">
            <span id="portal-header-initial">?</span>
        </button>
        <section class="portal-popover portal-notification-panel hidden" id="portal-notification-panel"
            aria-label="Danh sách thông báo">
            <div class="portal-popover-heading">
                <div><strong>Thông báo</strong><small id="portal-unread-label">Không có tin mới</small></div>
                <button class="portal-text-button hidden" id="portal-compose-open" type="button">+ Tạo mới</button>
            </div>
            <div class="portal-notification-list" id="portal-notification-list">
                <p class="portal-empty">Đang tải thông báo...</p>
            </div>
        </section>
        <section class="portal-popover portal-account-panel hidden" id="portal-account-panel"
            aria-label="Tài khoản cá nhân">
            <div class="portal-profile-summary">
                <button class="portal-profile-avatar" id="portal-avatar-change" type="button" title="Đổi ảnh đại diện">
                    <img class="portal-avatar-image hidden" id="portal-profile-avatar" alt="Ảnh đại diện">
                    <span id="portal-profile-initial">?</span>
                    <i aria-hidden="true">📷</i>
                </button>
                <div><strong id="portal-profile-email">Đang tải...</strong>
                    <small id="portal-profile-role">Người dùng</small>
                    <small id="portal-profile-code">Mã: —</small>
                </div>
            </div>
            <input class="hidden" id="portal-avatar-input" type="file" accept="image/png,image/jpeg,image/webp">
            <button class="portal-menu-button" id="portal-password-open" type="button">🔐 Đổi mật khẩu</button>
            <button class="portal-menu-button" id="portal-theme-toggle" type="button">🌙 Chế độ tối</button>
        </section>`;
    header.append(actions);

    document.body.insertAdjacentHTML("beforeend", `
        <div class="portal-modal hidden" id="portal-compose-modal" role="dialog" aria-modal="true"
            aria-labelledby="portal-compose-title">
            <div class="portal-dialog">
                <div class="portal-dialog-heading"><div><small>ADMIN</small><h2 id="portal-compose-title">Tạo thông báo</h2></div>
                    <button class="portal-dialog-close" type="button" data-close-modal="portal-compose-modal" aria-label="Đóng">×</button>
                </div>
                <form id="portal-compose-form">
                    <label>Người nhận<select id="portal-compose-audience" required>
                        <option value="both_all">Tất cả sinh viên và giáo viên</option>
                        <option value="sinhvien_all">Tất cả sinh viên</option>
                        <option value="sinhvien_filter">Lọc và chọn sinh viên...</option>
                        <option value="giaovien_all">Tất cả giáo viên</option>
                        <option value="giaovien_filter">Lọc và chọn giáo viên...</option>
                    </select></label>
                    <div class="portal-recipient-selection hidden" id="portal-recipient-selection">
                        <span id="portal-recipient-summary">Chưa chọn người nhận</span>
                        <button type="button" class="portal-text-button" id="portal-recipient-open">Chọn / lọc</button>
                    </div>
                    <label>Tiêu đề<input id="portal-compose-notification-title" maxlength="100" required placeholder="Nhập tiêu đề"></label>
                    <label>Nội dung<textarea id="portal-compose-message" maxlength="1000" rows="6" required placeholder="Nhập nội dung thông báo"></textarea></label>
                    <p class="portal-form-message" id="portal-compose-message-status" role="status"></p>
                    <div class="portal-dialog-actions"><button type="button" class="portal-secondary-button" data-close-modal="portal-compose-modal">Hủy</button>
                        <button type="submit" class="portal-primary-button" id="portal-compose-submit">Gửi thông báo</button></div>
                </form>
            </div>
        </div>
        <div class="portal-modal hidden" id="portal-recipient-modal" role="dialog" aria-modal="true"
            aria-labelledby="portal-recipient-title">
            <div class="portal-dialog portal-dialog-wide">
                <div class="portal-dialog-heading"><div><small>NGƯỜI NHẬN</small><h2 id="portal-recipient-title">Chọn sinh viên</h2></div>
                    <button class="portal-dialog-close" type="button" data-close-modal="portal-recipient-modal" aria-label="Đóng">×</button>
                </div>
                <div class="portal-recipient-filters">
                    <label>Tìm kiếm<input id="portal-recipient-search" type="search" placeholder="Họ tên, mã hoặc email"></label>
                    <label>Khoa<select id="portal-recipient-department"><option value="">Tất cả khoa</option></select></label>
                    <label>Năm sinh<select id="portal-recipient-birth-year"><option value="">Tất cả năm sinh</option></select></label>
                    <label id="portal-recipient-enrollment-wrap">Năm nhập học<select id="portal-recipient-enrollment-year"><option value="">Tất cả năm nhập học</option></select></label>
                </div>
                <div class="portal-recipient-toolbar">
                    <strong id="portal-recipient-result-summary">0 kết quả</strong>
                    <div><button type="button" class="portal-text-button" id="portal-recipient-select-visible">Chọn tất cả đang hiện</button>
                        <button type="button" class="portal-text-button portal-text-danger" id="portal-recipient-clear-visible">Bỏ chọn đang hiện</button></div>
                </div>
                <div class="portal-recipient-table-wrap">
                    <table class="portal-recipient-table"><thead><tr><th>Chọn</th><th>Mã</th><th>Họ tên</th><th>Khoa</th><th>Năm sinh</th><th class="portal-enrollment-column">Năm nhập học</th></tr></thead>
                        <tbody id="portal-recipient-table-body"></tbody></table>
                </div>
                <div class="portal-dialog-actions"><button type="button" class="portal-primary-button" data-close-modal="portal-recipient-modal">Xong</button></div>
            </div>
        </div>
        <div class="portal-modal hidden" id="portal-password-modal" role="dialog" aria-modal="true"
            aria-labelledby="portal-password-title">
            <div class="portal-dialog">
                <div class="portal-dialog-heading"><div><small>BẢO MẬT</small><h2 id="portal-password-title">Đổi mật khẩu</h2></div>
                    <button class="portal-dialog-close" id="portal-password-close" type="button" data-close-modal="portal-password-modal" aria-label="Đóng">×</button>
                </div>
                <form id="portal-password-form">
                    <p class="portal-password-policy-note" id="portal-password-policy-note">Mật khẩu mới phải khác mật khẩu hiện tại và tuân thủ chính sách bảo mật.</p>
                    <label>Mật khẩu hiện tại<input id="portal-current-password" type="password" autocomplete="current-password" required></label>
                    <label>Mật khẩu mới<input id="portal-new-password" type="password" autocomplete="new-password" minlength="12" maxlength="128" required><small>Ít nhất 12 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt.</small></label>
                    <label>Nhập lại mật khẩu mới<input id="portal-confirm-password" type="password" autocomplete="new-password" minlength="12" maxlength="128" required></label>
                    <p class="portal-form-message" id="portal-password-status" role="status"></p>
                    <div class="portal-dialog-actions"><button type="button" class="portal-secondary-button" data-close-modal="portal-password-modal">Hủy</button>
                        <button type="submit" class="portal-primary-button" id="portal-password-submit">Cập nhật</button></div>
                </form>
            </div>
        </div>
        <div class="portal-modal hidden" id="portal-notification-modal" role="dialog" aria-modal="true"
            aria-labelledby="portal-notification-detail-title">
            <div class="portal-dialog">
                <div class="portal-dialog-heading"><div><small id="portal-notification-detail-meta">THÔNG BÁO</small><h2 id="portal-notification-detail-title">Thông báo</h2></div>
                    <button class="portal-dialog-close" type="button" data-close-modal="portal-notification-modal" aria-label="Đóng">×</button>
                </div>
                <p class="portal-notification-detail" id="portal-notification-detail-message"></p>
                <p class="portal-form-message" id="portal-notification-action-status" role="status"></p>
                <div class="portal-dialog-actions">
                    <button type="button" class="portal-secondary-button hidden" id="portal-unlock-reject">Từ chối</button>
                    <button type="button" class="portal-primary-button hidden" id="portal-unlock-approve">Chấp nhận mở khóa</button>
                    <button type="button" class="portal-primary-button" data-close-modal="portal-notification-modal">Đã hiểu</button>
                </div>
            </div>
        </div>`);

    bindShellEvents();
    applyTheme(localStorage.getItem(THEME_KEY) || "light");
}


function openModal(id) {
    closePopovers();
    document.getElementById(id)?.classList.remove("hidden");
}


function closeModal(id) {
    if (id === "portal-password-modal" && passwordChangeRequired) return;
    document.getElementById(id)?.classList.add("hidden");
}


function bindShellEvents() {
    document.getElementById("portal-notification-button").addEventListener("click", (event) => {
        event.stopPropagation();
        togglePopover("portal-notification-panel", "portal-notification-button");
    });
    document.getElementById("portal-account-button").addEventListener("click", (event) => {
        event.stopPropagation();
        togglePopover("portal-account-panel", "portal-account-button");
    });
    document.querySelectorAll(".portal-popover").forEach((item) => item.addEventListener("click", (event) => event.stopPropagation()));
    document.addEventListener("click", closePopovers);
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            closePopovers();
            document.querySelectorAll(".portal-modal").forEach((modal) => closeModal(modal.id));
        }
    });
    document.querySelectorAll("[data-close-modal]").forEach((button) => button.addEventListener("click", () => closeModal(button.dataset.closeModal)));
    document.querySelectorAll(".portal-modal").forEach((modal) => modal.addEventListener("click", (event) => {
        if (event.target === modal) closeModal(modal.id);
    }));
    document.getElementById("portal-compose-open").addEventListener("click", openCreateNotificationModal);
    document.getElementById("portal-password-open").addEventListener("click", () => {
        passwordChangeRequired = false;
        document.getElementById("portal-password-modal").classList.remove("portal-password-required");
        document.getElementById("portal-password-title").textContent = "Đổi mật khẩu";
        document.getElementById("portal-password-policy-note").textContent =
            "Mật khẩu mới phải khác mật khẩu hiện tại và tuân thủ chính sách bảo mật.";
        openModal("portal-password-modal");
    });
    document.getElementById("portal-theme-toggle").addEventListener("click", () => {
        applyTheme(document.body.classList.contains("portal-dark") ? "light" : "dark");
    });
    document.getElementById("portal-avatar-change").addEventListener("click", () => document.getElementById("portal-avatar-input").click());
    document.getElementById("portal-avatar-input").addEventListener("change", handleAvatarChange);
    document.getElementById("portal-compose-form").addEventListener("submit", handleComposeNotification);
    document.getElementById("portal-password-form").addEventListener("submit", handlePasswordChange);
    document.getElementById("portal-compose-audience").addEventListener("change", handleRecipientModeChange);
    document.getElementById("portal-recipient-open").addEventListener("click", () => openRecipientModal(currentRecipientType, false));
    ["portal-recipient-search", "portal-recipient-department", "portal-recipient-birth-year", "portal-recipient-enrollment-year"].forEach((id) => {
        const element = document.getElementById(id);
        element.addEventListener(element.tagName === "INPUT" ? "input" : "change", () => renderRecipientTable(true));
    });
    document.getElementById("portal-recipient-select-visible").addEventListener("click", selectAllVisibleRecipients);
    document.getElementById("portal-recipient-clear-visible").addEventListener("click", clearVisibleRecipients);
    document.getElementById("portal-recipient-table-body").addEventListener("change", handleRecipientCheckbox);
}


function normalizeText(value) {
    return String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
}


function resetRecipientFilters() {
    document.getElementById("portal-recipient-search").value = "";
    document.getElementById("portal-recipient-department").value = "";
    document.getElementById("portal-recipient-birth-year").value = "";
    document.getElementById("portal-recipient-enrollment-year").value = "";
}


function resetComposeState() {
    editingNotificationId = null;
    selectedRecipientUids = new Set();
    manuallyDeselectedUids = new Set();
    document.getElementById("portal-compose-form").reset();
    document.getElementById("portal-compose-title").textContent = "Tạo thông báo";
    document.getElementById("portal-compose-submit").textContent = "Gửi thông báo";
    document.getElementById("portal-compose-message-status").textContent = "";
    document.getElementById("portal-recipient-selection").classList.add("hidden");
    resetRecipientFilters();
    updateRecipientSummary();
}


function openCreateNotificationModal() {
    resetComposeState();
    openModal("portal-compose-modal");
}


function isFilteredRecipientMode(mode) {
    return mode === "sinhvien_filter" || mode === "giaovien_filter";
}


async function handleRecipientModeChange(event) {
    const mode = event.target.value;
    const selection = document.getElementById("portal-recipient-selection");
    selection.classList.toggle("hidden", !isFilteredRecipientMode(mode));
    if (!isFilteredRecipientMode(mode)) return;
    currentRecipientType = mode.startsWith("sinhvien") ? "sinhvien" : "giaovien";
    selectedRecipientUids = new Set();
    manuallyDeselectedUids = new Set();
    resetRecipientFilters();
    await openRecipientModal(currentRecipientType, true);
}


async function fetchAdminApi(url, options = {}) {
    const token = await currentUser.getIdToken();
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


async function sendPresenceHeartbeat() {
    if (!currentUser || document.visibilityState === "hidden") return;
    const role = String(currentProfile?.role || "").toLowerCase();
    if (!new Set(["sinhvien", "giaovien"]).has(role)) return;
    try {
        await fetchAdminApi("/api/presence/heartbeat", { method: "POST" });
    } catch (error) {
        console.debug("Không thể gửi heartbeat:", error);
    }
}


function startPresenceHeartbeat() {
    window.clearInterval(heartbeatTimer);
    sendPresenceHeartbeat();
    heartbeatTimer = window.setInterval(sendPresenceHeartbeat, 5 * 60 * 1000);
}


async function loadRecipients(type) {
    if (recipientCache[type]) return recipientCache[type];
    const data = await fetchAdminApi(`/api/notification-recipients?type=${type}`);
    recipientCache[type] = data.recipients || [];
    return recipientCache[type];
}


function fillRecipientFilterOptions(recipients) {
    const department = document.getElementById("portal-recipient-department");
    const birthYear = document.getElementById("portal-recipient-birth-year");
    const enrollmentYear = document.getElementById("portal-recipient-enrollment-year");
    const departments = [...new Map(recipients.filter((item) => item.departmentCode).map((item) => [item.departmentCode, item.departmentName])).entries()]
        .sort((a, b) => a[0].localeCompare(b[0], "vi"));
    const birthYears = [...new Set(recipients.map((item) => item.birthYear).filter(Boolean))].sort((a, b) => b.localeCompare(a));
    const enrollmentYears = [...new Set(recipients.map((item) => item.enrollmentYear).filter(Boolean))].sort((a, b) => b.localeCompare(a));
    department.innerHTML = '<option value="">Tất cả khoa</option>' + departments.map(([code, name]) => `<option value="${escapeHtml(code)}">${escapeHtml(code)} - ${escapeHtml(name)}</option>`).join("");
    birthYear.innerHTML = '<option value="">Tất cả năm sinh</option>' + birthYears.map((year) => `<option value="${escapeHtml(year)}">${escapeHtml(year)}</option>`).join("");
    enrollmentYear.innerHTML = '<option value="">Tất cả năm nhập học</option>' + enrollmentYears.map((year) => `<option value="${escapeHtml(year)}">${escapeHtml(year)}</option>`).join("");
}


function filteredRecipients() {
    const recipients = recipientCache[currentRecipientType] || [];
    const search = normalizeText(document.getElementById("portal-recipient-search").value);
    const department = document.getElementById("portal-recipient-department").value;
    const birthYear = document.getElementById("portal-recipient-birth-year").value;
    const enrollmentYear = document.getElementById("portal-recipient-enrollment-year").value;
    return recipients.filter((item) => {
        const searchable = normalizeText(`${item.name} ${item.code} ${item.email}`);
        return (!search || searchable.includes(search))
            && (!department || item.departmentCode === department)
            && (!birthYear || item.birthYear === birthYear)
            && (currentRecipientType !== "sinhvien" || !enrollmentYear || item.enrollmentYear === enrollmentYear);
    });
}


function updateRecipientSummary() {
    const count = selectedRecipientUids.size;
    const noun = currentRecipientType === "sinhvien" ? "sinh viên" : "giáo viên";
    const summary = document.getElementById("portal-recipient-summary");
    if (summary) summary.textContent = count ? `Đã chọn ${count} ${noun}` : `Chưa chọn ${noun}`;
}


function renderRecipientTable(autoSelect = false) {
    const visible = filteredRecipients();
    if (autoSelect) {
        selectedRecipientUids = new Set(visible.filter((item) => !manuallyDeselectedUids.has(item.uid)).map((item) => item.uid));
    }
    const body = document.getElementById("portal-recipient-table-body");
    document.getElementById("portal-recipient-result-summary").textContent = `${visible.length} kết quả · ${selectedRecipientUids.size} đã chọn`;
    if (!visible.length) {
        body.innerHTML = '<tr><td colspan="6" class="portal-recipient-empty">Không có người phù hợp bộ lọc.</td></tr>';
        updateRecipientSummary();
        return;
    }
    body.innerHTML = visible.map((item) => `
        <tr><td><input type="checkbox" data-recipient-uid="${escapeHtml(item.uid)}" ${selectedRecipientUids.has(item.uid) ? "checked" : ""}></td>
            <td><strong>${escapeHtml(item.code)}</strong></td><td>${escapeHtml(item.name)}<small>${escapeHtml(item.email)}</small></td>
            <td>${escapeHtml(item.departmentCode)}<small>${escapeHtml(item.departmentName)}</small></td><td>${escapeHtml(item.birthYear || "—")}</td>
            <td class="portal-enrollment-column">${escapeHtml(item.enrollmentYear || "—")}</td></tr>`).join("");
    updateRecipientSummary();
}


async function openRecipientModal(type, autoSelect) {
    currentRecipientType = type;
    document.getElementById("portal-recipient-title").textContent = type === "sinhvien" ? "Chọn sinh viên" : "Chọn giáo viên";
    document.getElementById("portal-recipient-enrollment-wrap").classList.toggle("hidden", type !== "sinhvien");
    document.querySelectorAll(".portal-enrollment-column").forEach((cell) => cell.classList.toggle("hidden", type !== "sinhvien"));
    openModal("portal-recipient-modal");
    const body = document.getElementById("portal-recipient-table-body");
    body.innerHTML = '<tr><td colspan="6" class="portal-recipient-empty">Đang tải danh sách...</td></tr>';
    try {
        const recipients = await loadRecipients(type);
        fillRecipientFilterOptions(recipients);
        renderRecipientTable(autoSelect);
    } catch (error) {
        body.innerHTML = `<tr><td colspan="6" class="portal-recipient-empty portal-error">${escapeHtml(error.message)}</td></tr>`;
    }
}


function handleRecipientCheckbox(event) {
    const checkbox = event.target.closest("[data-recipient-uid]");
    if (!checkbox) return;
    const uid = checkbox.dataset.recipientUid;
    if (checkbox.checked) {
        selectedRecipientUids.add(uid);
        manuallyDeselectedUids.delete(uid);
    } else {
        selectedRecipientUids.delete(uid);
        manuallyDeselectedUids.add(uid);
    }
    renderRecipientTable(false);
}


function selectAllVisibleRecipients() {
    filteredRecipients().forEach((item) => {
        selectedRecipientUids.add(item.uid);
        manuallyDeselectedUids.delete(item.uid);
    });
    renderRecipientTable(false);
}


function clearVisibleRecipients() {
    filteredRecipients().forEach((item) => {
        selectedRecipientUids.delete(item.uid);
        manuallyDeselectedUids.add(item.uid);
    });
    renderRecipientTable(false);
}


function readIdsKey() {
    return `ql-online-read-notifications-${currentUser?.uid || "guest"}`;
}


function getReadIds() {
    try {
        return new Set(JSON.parse(localStorage.getItem(readIdsKey()) || "[]"));
    } catch {
        return new Set();
    }
}


function markRead(id) {
    const ids = getReadIds();
    ids.add(id);
    localStorage.setItem(readIdsKey(), JSON.stringify([...ids].slice(-500)));
    renderNotifications();
}


function notificationTime(item) {
    const milliseconds = item.createdAtMillis || Date.now();
    return new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(new Date(milliseconds));
}


function visibleNotifications() {
    const role = String(currentProfile?.role || "").toLowerCase();
    return [...notifications, ...localNoteNotifications]
        .filter((item) => role === "admin" || item.audiences?.includes(role) || item.recipientUids?.includes(currentUser?.uid))
        .sort((a, b) => (b.createdAtMillis || 0) - (a.createdAtMillis || 0));
}


function recipientDescription(item) {
    if (item.actionType === "calendar_note") {
        return "Nhắc lịch cá nhân";
    }
    if (item.audiences?.includes("admin") || item.recipientType === "admin") {
        return "Chỉ quản trị viên";
    }
    if (item.recipientUids?.length) {
        const noun = item.recipientType === "giaovien" ? "giáo viên" : "sinh viên";
        return `${item.recipientUids.length} ${noun} được chọn`;
    }
    if (item.audiences?.length === 2) return "Tất cả sinh viên và giáo viên";
    if (item.audiences?.[0] === "giaovien") return "Tất cả giáo viên";
    if (item.audiences?.[0] === "sinhvien") return "Tất cả sinh viên";
    return "Thông báo cá nhân";
}


function buildLocalNoteNotifications(notes, now, userId) {
    const beforeWindow = NOTE_REMINDER_BEFORE_MINUTES * 60 * 1000;
    const afterWindow = NOTE_REMINDER_AFTER_MINUTES * 60 * 1000;
    return notes.flatMap((note) => {
        const date = String(note.ngay || "").trim();
        const time = String(note.gio || "").trim();
        if (!date || !/^\d{2}:\d{2}$/.test(time)) return [];
        const scheduledAt = new Date(`${date}T${time}:00`).getTime();
        if (!Number.isFinite(scheduledAt)) return [];
        const remaining = scheduledAt - now;
        if (remaining > beforeWindow || remaining < -afterWindow) return [];

        const formattedTime = new Intl.DateTimeFormat("vi-VN", {
            dateStyle: "short",
            timeStyle: "short"
        }).format(new Date(scheduledAt));
        return [{
            id: `calendar-note-${note.id}`,
            title: remaining >= 0 ? "Ghi chú sắp đến hạn" : "Ghi chú vừa đến hạn",
            message: `${String(note.noidung || "Ghi chú lịch học")} · ${formattedTime}`,
            audiences: [],
            recipientUids: [userId],
            recipientType: "sinhvien",
            actionType: "calendar_note",
            createdAtMillis: scheduledAt - beforeWindow
        }];
    });
}


function refreshLocalNoteNotifications() {
    if (!currentUser || String(currentProfile?.role || "").toLowerCase() !== "sinhvien") {
        localNoteNotifications = [];
        renderNotifications();
        return;
    }

    let notes = [];
    try {
        const studentCode = String(currentProfile?.masv || "").trim();
        notes = JSON.parse(localStorage.getItem(`ql-online-calendar-notes-${studentCode || "guest"}`) || "[]");
        if (!Array.isArray(notes)) notes = [];
    } catch (_) {
        notes = [];
    }

    localNoteNotifications = buildLocalNoteNotifications(notes, Date.now(), currentUser.uid);
    renderNotifications();
}


function startNoteReminderChecks() {
    window.clearInterval(noteReminderTimer);
    refreshLocalNoteNotifications();
    if (String(currentProfile?.role || "").toLowerCase() === "sinhvien") {
        noteReminderTimer = window.setInterval(refreshLocalNoteNotifications, 60000);
    }
}


async function resolveUnlockRequest(item) {
    if (item.title !== "Yêu cầu mở khóa đăng nhập") return null;
    try {
        const data = await fetchAdminApi("/api/admin/login-unlock-requests");
        const requests = data.requests || [];
        if (item.actionId) {
            const exact = requests.find((requestItem) => requestItem.id === item.actionId);
            if (exact) return exact;
        }
        return requests.find((requestItem) =>
            String(requestItem.email).toLowerCase() === String(item.createdByEmail).toLowerCase()
        ) || null;
    } catch (_) {
        return null;
    }
}


async function decideUnlockFromNotification(requestId, status) {
    const approve = document.getElementById("portal-unlock-approve");
    const reject = document.getElementById("portal-unlock-reject");
    const statusText = document.getElementById("portal-notification-action-status");
    approve.disabled = true;
    reject.disabled = true;
    statusText.textContent = "Đang xử lý...";
    try {
        await fetchAdminApi(`/api/admin/login-unlock-requests/${requestId}`, {
            method: "PATCH",
            body: JSON.stringify({ status })
        });
        approve.classList.add("hidden");
        reject.classList.add("hidden");
        statusText.textContent = status === "approved"
            ? "Đã chấp nhận. Trình duyệt người dùng sẽ tự mở khóa."
            : "Đã từ chối. Tài khoản vẫn bị khóa.";
        showToast(status === "approved" ? "Đã chấp nhận mở khóa." : "Đã từ chối mở khóa.");
    } catch (error) {
        statusText.textContent = error.message || "Không thể xử lý yêu cầu.";
        approve.disabled = false;
        reject.disabled = false;
    }
}


async function openNotificationDetail(item) {
    markRead(item.id);
    document.getElementById("portal-notification-detail-title").textContent = item.title;
    document.getElementById("portal-notification-detail-meta").textContent = `${notificationTime(item)} · ${recipientDescription(item)}`;
    document.getElementById("portal-notification-detail-message").textContent = item.message;
    const approve = document.getElementById("portal-unlock-approve");
    const reject = document.getElementById("portal-unlock-reject");
    const actionStatus = document.getElementById("portal-notification-action-status");
    approve.classList.add("hidden");
    reject.classList.add("hidden");
    approve.disabled = false;
    reject.disabled = false;
    actionStatus.textContent = "";
    openModal("portal-notification-modal");
    if (String(currentProfile?.role).toLowerCase() === "admin"
        && item.title === "Yêu cầu mở khóa đăng nhập") {
        const unlockRequest = await resolveUnlockRequest(item);
        if (unlockRequest) {
            const criterionLines = (unlockRequest.validationDetails || []).map((detail) =>
                `${detail.passed ? "✓ Đúng" : "✗ Chưa đúng"}: ${detail.label}`
            );
            document.getElementById("portal-notification-detail-message").textContent = [
                `Tài khoản: ${unlockRequest.email}`,
                `Đối chiếu tự động: ${unlockRequest.validationScore || 0}/${unlockRequest.validationTotal || 4} tiêu chí`,
                ...criterionLines,
                "",
                "Nội dung người dùng gửi:",
                unlockRequest.message || "(Không có lời nhắn)"
            ].join("\n");
        }
        if (unlockRequest?.status === "pending") {
            approve.classList.remove("hidden");
            reject.classList.remove("hidden");
            approve.onclick = () => decideUnlockFromNotification(unlockRequest.id, "approved");
            reject.onclick = () => decideUnlockFromNotification(unlockRequest.id, "rejected");
        } else if (unlockRequest) {
            actionStatus.textContent = unlockRequest.status === "approved"
                ? "Yêu cầu này đã được chấp nhận."
                : "Yêu cầu này đã bị từ chối.";
        } else {
            actionStatus.textContent = "Yêu cầu này đã được xử lý hoặc không còn tồn tại.";
        }
    }
}


function renderNotifications() {
    const list = document.getElementById("portal-notification-list");
    if (!list || !currentUser) return;
    const items = visibleNotifications();
    const readIds = getReadIds();
    const unread = items.filter((item) => !readIds.has(item.id)).length;
    const badge = document.getElementById("portal-notification-badge");
    badge.textContent = unread > 9 ? "9+" : String(unread);
    badge.classList.toggle("hidden", unread === 0);
    document.getElementById("portal-unread-label").textContent = unread ? `${unread} tin chưa đọc` : "Không có tin mới";

    if (!items.length) {
        list.innerHTML = '<p class="portal-empty">Chưa có thông báo nào.</p>';
        return;
    }
    const isAdmin = String(currentProfile?.role || "").toLowerCase() === "admin";
    list.innerHTML = items.slice(0, 40).map((item) => `
        <div class="portal-notification-row ${readIds.has(item.id) ? "" : "unread"}">
            <button class="portal-notification-item" type="button" data-notification-open="${item.id}">
                <span class="portal-unread-dot"></span><span><strong>${escapeHtml(item.title)}</strong>
                <small>${escapeHtml(notificationTime(item))} · ${escapeHtml(recipientDescription(item))}</small><p>${escapeHtml(item.message)}</p></span>
            </button>
            ${isAdmin ? `<div class="portal-notification-actions"><button type="button" data-notification-edit="${item.id}" title="Sửa">✏️</button><button type="button" data-notification-delete="${item.id}" title="Xóa">🗑️</button></div>` : ""}
        </div>`).join("");
    list.querySelectorAll("[data-notification-open]").forEach((button) => button.addEventListener("click", () => {
        const item = items.find((candidate) => candidate.id === button.dataset.notificationOpen);
        if (item) openNotificationDetail(item);
    }));
    list.querySelectorAll("[data-notification-edit]").forEach((button) => button.addEventListener("click", () => {
        const item = items.find((candidate) => candidate.id === button.dataset.notificationEdit);
        if (item) openEditNotificationModal(item);
    }));
    list.querySelectorAll("[data-notification-delete]").forEach((button) => button.addEventListener("click", async () => {
        const target = items.find((candidate) => candidate.id === button.dataset.notificationDelete);
        if (target) await deleteNotification(target);
    }));
}


async function listenNotifications() {
    notificationAbortController?.abort();
    const controller = new AbortController();
    notificationAbortController = controller;
    try {
        const token = await currentUser.getIdToken();
        const response = await fetch("/api/notifications/stream", {
            headers: { "Authorization": `Bearer ${token}` },
            signal: controller.signal
        });
        if (!response.ok || !response.body) throw new Error("Không thể mở luồng thông báo.");
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const events = buffer.split("\n\n");
            buffer = events.pop() || "";
            events.forEach((eventText) => {
                const dataLine = eventText.split("\n").find((line) => line.startsWith("data: "));
                if (!dataLine) return;
                notifications = JSON.parse(dataLine.slice(6));
                renderNotifications();
            });
        }
    } catch (error) {
        if (controller.signal.aborted) return;
        console.error("Không thể nhận thông báo realtime:", error);
        document.getElementById("portal-notification-list").innerHTML = '<p class="portal-empty portal-error">Mất kết nối thông báo. Đang kết nối lại...</p>';
        window.setTimeout(listenNotifications, 4000);
    }
}


function openEditNotificationModal(item) {
    resetComposeState();
    editingNotificationId = item.id;
    document.getElementById("portal-compose-title").textContent = "Sửa thông báo";
    document.getElementById("portal-compose-submit").textContent = "Lưu thay đổi";
    document.getElementById("portal-compose-notification-title").value = item.title;
    document.getElementById("portal-compose-message").value = item.message;
    let mode;
    if (item.recipientUids?.length) {
        currentRecipientType = item.recipientType === "giaovien" ? "giaovien" : "sinhvien";
        mode = `${currentRecipientType}_filter`;
        selectedRecipientUids = new Set(item.recipientUids);
        manuallyDeselectedUids = new Set();
        document.getElementById("portal-recipient-selection").classList.remove("hidden");
    } else if (item.audiences?.length === 2) {
        mode = "both_all";
    } else {
        mode = item.audiences?.[0] === "giaovien" ? "giaovien_all" : "sinhvien_all";
    }
    document.getElementById("portal-compose-audience").value = mode;
    updateRecipientSummary();
    openModal("portal-compose-modal");
}


async function deleteNotification(item) {
    if (!window.confirm(`Xóa thông báo “${item.title}”?`)) return;
    try {
        await fetchAdminApi(`/api/notifications/${item.id}`, { method: "DELETE" });
        showToast("Đã xóa thông báo.");
    } catch (error) {
        showToast(error.message || "Không thể xóa thông báo.", "error");
    }
}


async function handleComposeNotification(event) {
    event.preventDefault();
    const form = event.currentTarget;
    if (String(currentProfile?.role).toLowerCase() !== "admin") return;
    const title = document.getElementById("portal-compose-notification-title").value.trim();
    const message = document.getElementById("portal-compose-message").value.trim();
    const recipientMode = document.getElementById("portal-compose-audience").value;
    const status = document.getElementById("portal-compose-message-status");
    const button = document.getElementById("portal-compose-submit");
    if (!title || !message) return;
    if (isFilteredRecipientMode(recipientMode) && selectedRecipientUids.size === 0) {
        status.textContent = "Hãy chọn ít nhất một người nhận.";
        return;
    }
    const wasEditing = Boolean(editingNotificationId);
    const targetUrl = wasEditing ? `/api/notifications/${editingNotificationId}` : "/api/notifications";
    button.disabled = true;
    button.textContent = wasEditing ? "Đang lưu..." : "Đang gửi...";
    status.textContent = "";
    try {
        await fetchAdminApi(targetUrl, {
            method: wasEditing ? "PUT" : "POST",
            body: JSON.stringify({
                title,
                message,
                recipientMode,
                recipientUids: isFilteredRecipientMode(recipientMode) ? [...selectedRecipientUids] : []
            })
        });
        form.reset();
        closeModal("portal-compose-modal");
        showToast(wasEditing ? "Đã cập nhật thông báo." : "Đã gửi thông báo realtime.");
        resetComposeState();
    } catch (error) {
        console.error("Không thể gửi thông báo:", error);
        status.textContent = error.message || "Không thể gửi thông báo.";
    } finally {
        button.disabled = false;
        button.textContent = editingNotificationId ? "Lưu thay đổi" : "Gửi thông báo";
    }
}


async function logoutBecausePasswordExpired() {
    const email = currentUser?.email || "";
    window.clearTimeout(passwordPolicyTimer);
    notificationAbortController?.abort();
    window.sessionStorage.setItem("ql-online-expired-password-email", email);
    await signOut(auth).catch(() => {});
    window.location.replace("/?passwordExpired=1");
}


async function checkPasswordPolicy() {
    window.clearTimeout(passwordPolicyTimer);
    if (!currentUser) return;
    try {
        const status = await fetchAdminApi("/api/password-policy/status");
        if (status.exempt) return;
        if (status.expired) {
            await logoutBecausePasswordExpired();
            return;
        }
        if (status.graceActive) {
            const remainingSeconds = Math.max(0, Number(status.remainingSeconds || 0));
            const remainingMinutes = Math.max(1, Math.ceil(remainingSeconds / 60));
            passwordChangeRequired = true;
            const modal = document.getElementById("portal-password-modal");
            modal.classList.add("portal-password-required");
            document.getElementById("portal-password-title").textContent = "Yêu cầu đổi mật khẩu";
            document.getElementById("portal-password-policy-note").textContent =
                `Admin đã cấp quyền đăng nhập tạm. Bạn còn tối đa ${remainingMinutes} phút để đổi mật khẩu; hết hạn hệ thống sẽ tự đăng xuất.`;
            openModal("portal-password-modal");
            const graceKey = String(status.expiresAtMillis || "grace");
            if (displayedGracePrompt !== graceKey) {
                displayedGracePrompt = graceKey;
                showToast("Quyền đăng nhập tạm chỉ có hiệu lực 10 phút. Hãy đổi mật khẩu ngay.", "warning");
            }
        }
        const warningKey = String(status.expiresAtMillis || "");
        if (status.warning && !status.graceActive && displayedPasswordWarning !== warningKey) {
            displayedPasswordWarning = warningKey;
            showToast("Mật khẩu còn dưới 1 giờ hiệu lực. Hãy đổi mật khẩu sớm.", "warning");
        }
        if (status.enabled) {
            const waitMilliseconds = Math.max(
                1000,
                Math.min(60000, Number(status.remainingSeconds || 0) * 1000 + 500)
            );
            passwordPolicyTimer = window.setTimeout(checkPasswordPolicy, waitMilliseconds);
        } else {
            passwordPolicyTimer = window.setTimeout(checkPasswordPolicy, 60000);
        }
    } catch (error) {
        console.error("Không thể kiểm tra thời hạn mật khẩu:", error);
        passwordPolicyTimer = window.setTimeout(checkPasswordPolicy, 60000);
    }
}


async function handlePasswordChange(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const currentPassword = document.getElementById("portal-current-password").value;
    const newPassword = document.getElementById("portal-new-password").value;
    const confirmation = document.getElementById("portal-confirm-password").value;
    const status = document.getElementById("portal-password-status");
    const button = document.getElementById("portal-password-submit");
    status.textContent = "";
    const policyError = passwordPolicyError(newPassword, currentUser?.email);
    if (policyError) {
        status.textContent = policyError;
        return;
    }
    if (currentPassword === newPassword) {
        status.textContent = "Mật khẩu mới phải khác mật khẩu hiện tại.";
        return;
    }
    if (newPassword !== confirmation) {
        status.textContent = "Hai lần nhập mật khẩu chưa khớp.";
        return;
    }
    button.disabled = true;
    button.textContent = "Đang cập nhật...";
    try {
        const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
        await reauthenticateWithCredential(currentUser, credential);
        await currentUser.getIdToken(true);
        await fetchAdminApi("/api/password-policy/change", {
            method: "POST",
            body: JSON.stringify({
                currentPassword,
                newPassword
            })
        });
        form.reset();
        passwordChangeRequired = false;
        showToast("Đổi mật khẩu thành công. Vui lòng đăng nhập lại.");
        await signOut(auth);
        window.location.href = "/";
    } catch (error) {
        console.error("Không thể đổi mật khẩu:", error);
        status.textContent = String(error?.code || "").includes("invalid-credential")
            ? "Mật khẩu hiện tại không đúng."
            : (error.message || "Không thể đổi mật khẩu. Vui lòng thử lại.");
    } finally {
        button.disabled = false;
        button.textContent = "Cập nhật";
    }
}


function resizeAvatar(file) {
    return new Promise((resolve, reject) => {
        const image = new Image();
        const url = URL.createObjectURL(file);
        image.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = 256;
            canvas.height = 256;
            const context = canvas.getContext("2d");
            const size = Math.min(image.naturalWidth, image.naturalHeight);
            const x = (image.naturalWidth - size) / 2;
            const y = (image.naturalHeight - size) / 2;
            context.drawImage(image, x, y, size, size, 0, 0, 256, 256);
            URL.revokeObjectURL(url);
            resolve(canvas.toDataURL("image/jpeg", 0.82));
        };
        image.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Ảnh không hợp lệ.")); };
        image.src = url;
    });
}


async function handleAvatarChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) {
        showToast("Chỉ nhận ảnh JPG, PNG, WebP tối đa 5 MB.", "error");
        event.target.value = "";
        return;
    }
    try {
        showToast("Đang cập nhật ảnh đại diện...");
        const avatarDataUrl = await resizeAvatar(file);
        const token = await currentUser.getIdToken();
        const response = await fetch("/api/profile/avatar", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ avatarDataUrl })
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || "Không thể cập nhật ảnh đại diện.");
        currentProfile.avatarDataUrl = avatarDataUrl;
        updateProfileUi();
        showToast("Đã cập nhật ảnh đại diện.");
    } catch (error) {
        console.error("Không thể cập nhật ảnh đại diện:", error);
        showToast(error.message || "Không thể cập nhật ảnh đại diện.", "error");
    } finally {
        event.target.value = "";
    }
}


function updateAvatar(imageId, initialId) {
    const image = document.getElementById(imageId);
    const initial = document.getElementById(initialId);
    const avatar = currentProfile?.avatarDataUrl || "";
    image.classList.toggle("hidden", !avatar);
    initial.classList.toggle("hidden", Boolean(avatar));
    if (avatar) image.src = avatar;
}


function updateProfileUi() {
    if (!currentUser || !currentProfile) return;
    const initial = (currentUser.email || "U").charAt(0).toUpperCase();
    document.getElementById("portal-header-initial").textContent = initial;
    document.getElementById("portal-profile-initial").textContent = initial;
    document.getElementById("portal-profile-email").textContent = currentUser.email || "Không có email";
    document.getElementById("portal-profile-role").textContent = roleLabel(String(currentProfile.role || "").toLowerCase());
    document.getElementById("portal-profile-code").textContent = `Mã: ${profileCode(currentProfile)}`;
    const role = String(currentProfile.role).toLowerCase();
    document.getElementById("portal-compose-open").classList.toggle("hidden", role !== "admin");
    updateAvatar("portal-header-avatar", "portal-header-initial");
    updateAvatar("portal-profile-avatar", "portal-profile-initial");
}


injectShell();

onAuthStateChanged(auth, async (user) => {
    if (!user) return;
    try {
        const profileSnapshot = await getDoc(doc(db, "users", user.uid));
        if (!profileSnapshot.exists()) return;
        currentUser = user;
        currentProfile = profileSnapshot.data();
        updateProfileUi();
        await checkPasswordPolicy();
        listenNotifications();
        startPresenceHeartbeat();
        startNoteReminderChecks();
    } catch (error) {
        console.error("Không thể khởi tạo menu người dùng:", error);
    }
});

document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
        sendPresenceHeartbeat();
        refreshLocalNoteNotifications();
    }
});

window.addEventListener("calendar-notes-updated", refreshLocalNoteNotifications);

window.addEventListener("beforeunload", () => {
    notificationAbortController?.abort();
    window.clearInterval(heartbeatTimer);
    window.clearInterval(noteReminderTimer);
    window.clearTimeout(passwordPolicyTimer);
});
