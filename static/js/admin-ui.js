// ===========================
// TOAST & CONFIRM SYSTEM
// ===========================

let _toastContainer = null;

function layToastContainer() {
    if (_toastContainer) {
        return _toastContainer;
    }

    _toastContainer = document.createElement("div");
    _toastContainer.id = "toast-container";
    _toastContainer.setAttribute("role", "status");
    _toastContainer.setAttribute("aria-live", "polite");
    _toastContainer.setAttribute("aria-atomic", "true");
    document.body.appendChild(_toastContainer);

    return _toastContainer;
}


export function hienThiThongBao(noiDung, loai) {
    const container = layToastContainer();
    const toast = document.createElement("div");

    toast.className = `toast toast-${loai || "success"}`;
    toast.textContent = noiDung;

    container.appendChild(toast);

    requestAnimationFrame(function () {
        toast.classList.add("toast-show");
    });

    setTimeout(function () {
        toast.classList.remove("toast-show");
        toast.classList.add("toast-hide");

        setTimeout(function () {
            toast.remove();
        }, 350);
    }, 3500);
}


export function xacNhan(noiDung) {
    return new Promise(function (resolve) {
        const overlay = document.createElement("div");
        overlay.className = "confirm-overlay";
        const card = document.createElement("div");
        card.className = "confirm-card";
        card.setAttribute("role", "alertdialog");
        card.setAttribute("aria-modal", "true");

        const message = document.createElement("p");
        message.className = "confirm-message";
        message.id = `confirm-message-${Date.now()}`;
        message.textContent = noiDung;
        card.setAttribute("aria-describedby", message.id);

        const actions = document.createElement("div");
        actions.className = "confirm-actions";

        const cancelButton = document.createElement("button");
        cancelButton.type = "button";
        cancelButton.className = "confirm-cancel";
        cancelButton.textContent = "Hủy";

        const confirmButton = document.createElement("button");
        confirmButton.type = "button";
        confirmButton.className = "confirm-ok";
        confirmButton.textContent = "Xác nhận";

        actions.append(cancelButton, confirmButton);
        card.append(message, actions);
        overlay.appendChild(card);

        document.body.appendChild(overlay);
        document.body.style.overflow = "hidden";

        let daDong = false;

        function ketThuc(ketQua) {
            if (daDong) {
                return;
            }

            daDong = true;
            overlay.remove();
            document.body.style.overflow = "";
            resolve(ketQua);
        }

        confirmButton.addEventListener("click", function () {
            ketThuc(true);
        });

        cancelButton.addEventListener("click", function () {
            ketThuc(false);
        });

        overlay.addEventListener("keydown", function (e) {
            if (e.key === "Escape") {
                ketThuc(false);
            }
        });

        overlay.addEventListener("click", function (event) {
            if (event.target === overlay) {
                ketThuc(false);
            }
        });

        confirmButton.focus();
    });
}


// ===========================
// TABLE LOADING & ERROR STATES
// ===========================

export async function voiGioiHanThoiGian(tacVu, thongBao, thoiGian = 15000) {
    let boDem;

    try {
        return await Promise.race([
            tacVu,
            new Promise(function (_, reject) {
                boDem = window.setTimeout(function () {
                    reject(new Error(thongBao));
                }, thoiGian);
            })
        ]);
    } finally {
        window.clearTimeout(boDem);
    }
}


export function hienThiDangTaiBang(thanBang, soCot, noiDung) {
    if (!thanBang) {
        return;
    }

    thanBang.replaceChildren();
    thanBang.setAttribute("aria-busy", "true");

    const dongThongBao = document.createElement("tr");
    const oThongBao = document.createElement("td");
    const noiDungTai = document.createElement("div");
    const cacCham = document.createElement("span");
    const nhan = document.createElement("span");

    oThongBao.colSpan = soCot;
    oThongBao.className = "table-loading-cell";
    noiDungTai.className = "table-loading-content";
    cacCham.className = "loading-dots";
    cacCham.setAttribute("aria-hidden", "true");

    for (let i = 0; i < 3; i += 1) {
        cacCham.appendChild(document.createElement("i"));
    }

    nhan.textContent = noiDung;
    noiDungTai.append(cacCham, nhan);
    oThongBao.appendChild(noiDungTai);
    dongThongBao.appendChild(oThongBao);
    thanBang.appendChild(dongThongBao);

    const doDaiThanh = ["72%", "88%", "64%", "78%", "56%", "84%", "68%", "74%", "60%"];

    for (let dongIndex = 0; dongIndex < 3; dongIndex += 1) {
        const dong = document.createElement("tr");
        dong.className = "table-skeleton-row";
        dong.setAttribute("aria-hidden", "true");

        for (let cotIndex = 0; cotIndex < soCot; cotIndex += 1) {
            const o = document.createElement("td");
            const thanh = document.createElement("span");

            thanh.className = "skeleton-line";
            thanh.style.width = doDaiThanh[(dongIndex + cotIndex) % doDaiThanh.length];
            o.appendChild(thanh);
            dong.appendChild(o);
        }

        thanBang.appendChild(dong);
    }
}


export function hienThiTrangThaiBang(thanBang, soCot, noiDung, loai = "empty", thuLai) {
    if (!thanBang) {
        return;
    }

    thanBang.replaceChildren();
    thanBang.setAttribute("aria-busy", "false");

    const dong = document.createElement("tr");
    const o = document.createElement("td");
    const khoi = document.createElement("div");
    const bieuTuong = document.createElement("span");
    const nhan = document.createElement("span");

    o.colSpan = soCot;
    o.className = `table-state-cell table-state-${loai}`;
    khoi.className = "table-state-content";
    bieuTuong.className = "table-state-icon";
    bieuTuong.setAttribute("aria-hidden", "true");
    bieuTuong.textContent = loai === "error" ? "!" : "○";
    nhan.textContent = noiDung;

    khoi.append(bieuTuong, nhan);

    if (typeof thuLai === "function") {
        const nutThuLai = document.createElement("button");
        nutThuLai.type = "button";
        nutThuLai.className = "table-retry-button";
        nutThuLai.textContent = "Thử lại";
        nutThuLai.addEventListener("click", thuLai);
        khoi.appendChild(nutThuLai);
    }

    o.appendChild(khoi);
    dong.appendChild(o);
    thanBang.appendChild(dong);
}


export function layThongBaoLoiTaiDuLieu(loi) {
    const maLoi = String(loi?.code || "").toLowerCase();

    if (maLoi.includes("permission-denied")) {
        return "Bạn không có quyền đọc dữ liệu này.";
    }

    if (maLoi.includes("unavailable") || maLoi.includes("network")) {
        return "Không thể kết nối Firebase. Vui lòng kiểm tra mạng.";
    }

    return loi?.message || "Đã xảy ra lỗi khi tải dữ liệu.";
}

