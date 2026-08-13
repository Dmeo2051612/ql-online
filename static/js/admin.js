import { passwordPolicyError } from "./password-policy.js";

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
    document.body.appendChild(_toastContainer);

    return _toastContainer;
}


function hienThiThongBao(noiDung, loai) {
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


function xacNhan(noiDung) {
    return new Promise(function (resolve) {
        const overlay = document.createElement("div");
        overlay.className = "confirm-overlay";
        const card = document.createElement("div");
        card.className = "confirm-card";
        card.setAttribute("role", "alertdialog");
        card.setAttribute("aria-modal", "true");

        const message = document.createElement("p");
        message.className = "confirm-message";
        message.textContent = noiDung;

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

async function voiGioiHanThoiGian(tacVu, thongBao, thoiGian = 15000) {
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


function hienThiDangTaiBang(thanBang, soCot, noiDung) {
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


function hienThiTrangThaiBang(thanBang, soCot, noiDung, loai = "empty", thuLai) {
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


function layThongBaoLoiTaiDuLieu(loi) {
    const maLoi = String(loi?.code || "").toLowerCase();

    if (maLoi.includes("permission-denied")) {
        return "Bạn không có quyền đọc dữ liệu này.";
    }

    if (maLoi.includes("unavailable") || maLoi.includes("network")) {
        return "Không thể kết nối Firebase. Vui lòng kiểm tra mạng.";
    }

    return loi?.message || "Đã xảy ra lỗi khi tải dữ liệu.";
}


// ===========================
// CACHE DANH SÁCH KHOA
// ===========================

let _cachecacLuaChonKhoa = null;
let _promiseTaiDanhSachKhoa = null;


async function layDanhSachKhoaTuCache() {
    if (_cachecacLuaChonKhoa) {
        return _cachecacLuaChonKhoa;
    }

    if (!_promiseTaiDanhSachKhoa) {
        _promiseTaiDanhSachKhoa = (async function () {
            const { db } = await import("/static/js/firebase-config.js");

            const { collection, getDocs } = await import(
                "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js"
            );

            const ketQua = await getDocs(collection(db, "khoa"));

            return ketQua.docs.map(function (taiLieu) {
                return {
                    makhoa: taiLieu.id,
                    tenkhoa: taiLieu.data().tenkhoa
                };
            });
        })();
    }

    try {
        _cachecacLuaChonKhoa = await _promiseTaiDanhSachKhoa;
    } finally {
        _promiseTaiDanhSachKhoa = null;
    }

    return _cachecacLuaChonKhoa;
}


// ===========================
// THỐNG KÊ TỔNG QUAN
// ===========================

async function taiThongKeTongQuan() {
    const cacOThongKe = [
        document.getElementById("stat-sinh-vien"),
        document.getElementById("stat-giao-vien"),
        document.getElementById("stat-lop-mon")
    ];

    cacOThongKe.forEach(function (oThongKe) {
        if (oThongKe) {
            oThongKe.textContent = "";
            oThongKe.title = "";
            oThongKe.classList.add("loading");
        }
    });

    try {
        const [ketQuaSV, ketQuaGV, ketQuaLM] = await voiGioiHanThoiGian(
            (async function () {
                const { db } = await import("/static/js/firebase-config.js");

                const { collection, getDocs } = await import(
                    "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js"
                );

                return Promise.all([
                    getDocs(collection(db, "sinhvien")),
                    getDocs(collection(db, "giaovien")),
                    getDocs(collection(db, "lopmon"))
                ]);
            })(),
            "Quá thời gian tải dữ liệu thống kê."
        );

        const soSV = document.getElementById("stat-sinh-vien");
        const soGV = document.getElementById("stat-giao-vien");
        const soLM = document.getElementById("stat-lop-mon");

        if (soSV) { soSV.textContent = ketQuaSV.size; }
        if (soGV) { soGV.textContent = ketQuaGV.size; }
        if (soLM) { soLM.textContent = ketQuaLM.size; }

    } catch (loi) {
        console.error("Không thể tải thống kê tổng quan:", loi);

        cacOThongKe.forEach(function (oThongKe) {
            if (!oThongKe) {
                return;
            }

            oThongKe.textContent = "—";
            oThongKe.title = "Không thể tải dữ liệu thống kê";
        });
    } finally {
        cacOThongKe.forEach(function (oThongKe) {
            if (oThongKe) {
                oThongKe.classList.remove("loading");
            }
        });
    }
}


let cheDoForm = "them"
let maSinhVienDangSua = null;
let cheDoFormKhoa = "them";


let cheDoFormGiaoVien = "them";
let maGiaoVienDangSua = null;


function taoO(noiDung) {
    const o = document.createElement("td");
    o.textContent = noiDung || "-";

    return o;
}


function taoNutCapMatKhauTam(taiKhoan) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "table-action password-action";
    button.textContent = "Mật khẩu tạm";
    button.addEventListener("click", function () {
        moModalMatKhauTam(taiKhoan);
    });
    return button;
}


function hienThiDanhSachSinhVien(danhSach) {
    const thanBang = document.getElementById(
        "student-table-body"
    );

    thanBang.replaceChildren();
    thanBang.setAttribute("aria-busy", "false");

    if (danhSach.length === 0) {
        hienThiTrangThaiBang(thanBang, 7, "Chưa có sinh viên nào.");
        return;
    }

    for (const sinhVien of danhSach) {
        const dong = document.createElement("tr");

        const thongTinKhoa = sinhVien.tenkhoa
            ? `${sinhVien.makhoa} - ${sinhVien.tenkhoa}`
            : sinhVien.makhoa;

        dong.appendChild(taoO(sinhVien.masv));
        dong.appendChild(taoO(sinhVien.hoten));
        dong.appendChild(taoO(sinhVien.mail));
        dong.appendChild(taoO(sinhVien.ngaysinh));
        dong.appendChild(taoO(thongTinKhoa));
        dong.appendChild(taoO(sinhVien.namnhaphoc));
        const oThaoTac = document.createElement("td");
        const nhomNut = document.createElement("div");

        nhomNut.className = "action-group";
        

        const nutSua = document.createElement("button");
        nutSua.type = "button";
        nutSua.className = "table-action edit-action";
        nutSua.textContent = "Sửa";
        nutSua.dataset.masv = sinhVien.masv;

        nutSua.addEventListener("click", function () {
            moFormSuaSinhVien(sinhVien);
        });


        const nutXoa = document.createElement("button");
        nutXoa.type = "button";
        nutXoa.className = "table-action delete-action";
        nutXoa.textContent = "Xóa";
        nutXoa.dataset.masv = sinhVien.masv;

        nutXoa.addEventListener("click", function() {
            xoaSinhVien(sinhVien, nutXoa);
        });


        nhomNut.appendChild(nutSua);
        nhomNut.appendChild(taoNutCapMatKhauTam({
            uid: sinhVien.uid,
            email: sinhVien.mail,
            name: sinhVien.hoten,
            role: "Sinh viên"
        }));
        nhomNut.appendChild(nutXoa);

        oThaoTac.appendChild(nhomNut);
        dong.appendChild(oThaoTac);

         
        thanBang.appendChild(dong);
    }
}



async function taiDanhSachSinhVien() {
    const thanBang = document.getElementById("student-table-body");
    hienThiDangTaiBang(thanBang, 7, "Đang tải danh sách sinh viên");

    try {
        const [ketQuaSinhVien, danhSachKhoa] = await voiGioiHanThoiGian(
            (async function () {
                const { db } = await import(
                    "/static/js/firebase-config.js"
                );

                const { collection, getDocs } = await import(
                    "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js"
                );

                return Promise.all([
                    getDocs(collection(db, "sinhvien")),
                    layDanhSachKhoaTuCache()
                ]);
            })(),
            "Quá thời gian tải danh sách sinh viên."
        );

        const bangTenKhoa = {};

        danhSachKhoa.forEach(function (khoa) {
            bangTenKhoa[khoa.makhoa] = khoa.tenkhoa || "";
        });

        const danhSach = ketQuaSinhVien.docs.map(
            function (taiLieu) {
                const duLieu = taiLieu.data();

                const maKhoa =
                    String(duLieu.makhoa || "").trim();

                return {
                    masv: taiLieu.id,
                    uid: duLieu.uid || "",
                    mail: duLieu.mail || "",
                    hoten: duLieu.hoten || "",
                    ngaysinh: duLieu.ngaysinh || "",
                    makhoa: maKhoa,
                    tenkhoa: bangTenKhoa[maKhoa] || "",
                    namnhaphoc:
                        duLieu.namnhaphoc || ""
                };
            }
        );

        hienThiDanhSachSinhVien(danhSach);

    } catch (loi) {
        console.error(
            "Không thể tải sinh viên:",
            loi
        );

        hienThiTrangThaiBang(
            thanBang,
            7,
            layThongBaoLoiTaiDuLieu(loi),
            "error",
            taiDanhSachSinhVien
        );
    }
}


const studentModal = document.getElementById("student-modal");
const studentForm = document.getElementById("student-form");
const formMessage = document.getElementById(
    "student-form-message"
);

const openAddButton = document.getElementById(
    "open-add-student"
);

const closeModalButton = document.getElementById(
    "close-student-modal"
);

const cancelFormButton = document.getElementById(
    "cancel-student-form"
);

const subjectMenu = document.getElementById("subject-menu");
const subjectSection = document.getElementById("quan-ly-mon-hoc");
const subjectTableBody = 
    document.getElementById("subject-table-body");

const departmentMenu =
    document.getElementById("department-menu");
const departmentSection =
    document.getElementById("quan-ly-khoa");
const departmentTableBody =
    document.getElementById("department-table-body");

const permissionMenu = document.getElementById("permission-menu");
const permissionSection = document.getElementById("yeu-cau-mo-khoa");
const permissionTableBody = document.getElementById("permission-table-body");
const permissionStatusFilter = document.getElementById("permission-status-filter");
const cleanupPermissionRequests = document.getElementById("cleanup-permission-requests");
const passwordPolicyMenu = document.getElementById("password-policy-menu");
const passwordPolicySection = document.getElementById("chinh-sach-mat-khau");
const passwordPolicyForm = document.getElementById("password-policy-form");
const passwordAgeHours = document.getElementById("password-age-hours");
const passwordAgeMinutes = document.getElementById("password-age-minutes");
const passwordAgeSeconds = document.getElementById("password-age-seconds");
const passwordHistoryCount = document.getElementById("password-history-count");
const passwordPolicyErrorElement = document.getElementById("password-policy-error");
const passwordPolicySummary = document.getElementById("password-policy-summary");
const savePasswordPolicyButton = document.getElementById("save-password-policy");
const temporaryPasswordModal = document.getElementById("temporary-password-modal");
const temporaryPasswordForm = document.getElementById("temporary-password-form");
const temporaryPasswordAccount = document.getElementById("temporary-password-account");
const temporaryPasswordInput = document.getElementById("temporary-password");
const temporaryPasswordConfirm = document.getElementById("temporary-password-confirm");
const temporaryPasswordMessage = document.getElementById("temporary-password-message");
const closeTemporaryPasswordModal = document.getElementById("close-temporary-password-modal");
const cancelTemporaryPassword = document.getElementById("cancel-temporary-password");
const saveTemporaryPassword = document.getElementById("save-temporary-password");
const generateTemporaryPassword = document.getElementById("generate-temporary-password");
const toggleTemporaryPassword = document.getElementById("toggle-temporary-password");
const copyTemporaryPassword = document.getElementById("copy-temporary-password");
let temporaryPasswordTarget = null;


function moModalMatKhauTam(taiKhoan) {
    temporaryPasswordTarget = taiKhoan;
    temporaryPasswordForm.reset();
    temporaryPasswordMessage.textContent = "";
    temporaryPasswordMessage.classList.remove("success");
    temporaryPasswordAccount.textContent = `${taiKhoan.role}: ${taiKhoan.name || "-"} · ${taiKhoan.email || "-"}`;
    temporaryPasswordInput.type = "password";
    temporaryPasswordConfirm.type = "password";
    toggleTemporaryPassword.textContent = "Hiện mật khẩu";
    saveTemporaryPassword.disabled = false;
    saveTemporaryPassword.textContent = "Cấp mật khẩu tạm";
    temporaryPasswordModal.classList.remove("hidden");
    document.body.style.overflow = "hidden";
    temporaryPasswordInput.focus();
}


function dongModalMatKhauTam() {
    temporaryPasswordTarget = null;
    temporaryPasswordModal.classList.add("hidden");
    document.body.style.overflow = "";
}


function taoMatKhauTamManh() {
    const groups = ["ABCDEFGHJKLMNPQRSTUVWXYZ", "abcdefghijkmnopqrstuvwxyz", "23456789", "!@#$%&*?"];
    const all = groups.join("");
    const values = new Uint32Array(18);
    window.crypto.getRandomValues(values);
    const characters = groups.map((group, index) => group[values[index] % group.length]);
    for (let index = groups.length; index < values.length; index += 1) {
        characters.push(all[values[index] % all.length]);
    }
    for (let index = characters.length - 1; index > 0; index -= 1) {
        const swapIndex = values[index] % (index + 1);
        [characters[index], characters[swapIndex]] = [characters[swapIndex], characters[index]];
    }
    return characters.join("");
}


generateTemporaryPassword?.addEventListener("click", function () {
    const generated = taoMatKhauTamManh();
    temporaryPasswordInput.value = generated;
    temporaryPasswordConfirm.value = generated;
    temporaryPasswordInput.type = "text";
    temporaryPasswordConfirm.type = "text";
    toggleTemporaryPassword.textContent = "Ẩn mật khẩu";
    temporaryPasswordMessage.textContent = "Đã tạo mật khẩu mạnh. Hãy sao chép và gửi cho đúng người dùng.";
    temporaryPasswordMessage.classList.add("success");
});


toggleTemporaryPassword?.addEventListener("click", function () {
    const show = temporaryPasswordInput.type === "password";
    temporaryPasswordInput.type = show ? "text" : "password";
    temporaryPasswordConfirm.type = show ? "text" : "password";
    toggleTemporaryPassword.textContent = show ? "Ẩn mật khẩu" : "Hiện mật khẩu";
});


copyTemporaryPassword?.addEventListener("click", async function () {
    if (!temporaryPasswordInput.value) {
        temporaryPasswordMessage.textContent = "Chưa có mật khẩu để sao chép.";
        temporaryPasswordMessage.classList.remove("success");
        return;
    }
    try {
        await navigator.clipboard.writeText(temporaryPasswordInput.value);
        temporaryPasswordMessage.textContent = "Đã sao chép mật khẩu tạm thời.";
        temporaryPasswordMessage.classList.add("success");
    } catch (_) {
        temporaryPasswordInput.select();
        temporaryPasswordMessage.textContent = "Hãy nhấn Ctrl+C để sao chép mật khẩu đang được chọn.";
        temporaryPasswordMessage.classList.remove("success");
    }
});


temporaryPasswordForm?.addEventListener("submit", async function (event) {
    event.preventDefault();
    temporaryPasswordMessage.textContent = "";
    temporaryPasswordMessage.classList.remove("success");
    const password = temporaryPasswordInput.value;
    if (!temporaryPasswordTarget?.uid) {
        temporaryPasswordMessage.textContent = "Tài khoản chưa được liên kết với Firebase Authentication.";
        return;
    }
    if (password !== temporaryPasswordConfirm.value) {
        temporaryPasswordMessage.textContent = "Hai lần nhập mật khẩu tạm thời chưa khớp.";
        return;
    }
    const policyError = passwordPolicyError(password, temporaryPasswordTarget.email);
    if (policyError) {
        temporaryPasswordMessage.textContent = policyError;
        return;
    }

    saveTemporaryPassword.disabled = true;
    saveTemporaryPassword.textContent = "Đang cấp...";
    try {
        await goiApiYeuCau(`/api/admin/accounts/${encodeURIComponent(temporaryPasswordTarget.uid)}/temporary-password`, {
            method: "POST",
            body: JSON.stringify({ temporaryPassword: password })
        });
        temporaryPasswordMessage.textContent = "Đã cấp mật khẩu tạm. Tài khoản đã bị thu hồi phiên và buộc đổi mật khẩu khi đăng nhập.";
        temporaryPasswordMessage.classList.add("success");
        saveTemporaryPassword.textContent = "Đã cấp mật khẩu";
        hienThiThongBao("Cấp mật khẩu tạm thời thành công.", "success");
    } catch (error) {
        temporaryPasswordMessage.textContent = error.message;
        saveTemporaryPassword.disabled = false;
        saveTemporaryPassword.textContent = "Cấp mật khẩu tạm";
    }
});


closeTemporaryPasswordModal?.addEventListener("click", dongModalMatKhauTam);
cancelTemporaryPassword?.addEventListener("click", dongModalMatKhauTam);
temporaryPasswordModal?.addEventListener("click", function (event) {
    if (event.target === temporaryPasswordModal) dongModalMatKhauTam();
});

const departmentModal =
    document.getElementById("department-modal");
const departmentForm =
    document.getElementById("department-form");
const departmentCodeInput =
    document.getElementById("department-code");
const departmentNameInput =
    document.getElementById("department-name");
const departmentFormError =
    document.getElementById("department-form-error");
const departmentModalTitle = document.getElementById("department-modal-title");
const openDepartmentModalButton =
    document.getElementById("open-department-modal");
const closeDepartmentModalButton =
    document.getElementById("close-department-modal");
const cancelDepartmentModalButton =
    document.getElementById("cancel-department-modal");
const saveDepartmentButton =
    document.getElementById("save-department-button");





const openSubjectModalButton =
    document.getElementById("open-subject-modal");

const subjectModal =
    document.getElementById("subject-modal");

const closeSubjectModalButton =
    document.getElementById("close-subject-modal");

const cancelSubjectModalButton =
    document.getElementById("cancel-subject-modal");

const subjectForm =
    document.getElementById("subject-form");

const subjectModalTitle =
    document.getElementById("subject-modal-title");

const subjectFormError =
    document.getElementById("subject-form-error");

const subjectCodeInput =
    document.getElementById("subject-code");

const subjectNameInput =
    document.getElementById("subject-name");

const subjectCreditsInput =
    document.getElementById("subject-credits");    



function moFormThemSinhVien() {
    cheDoForm = "them";
    maSinhVienDangSua = null;

    studentForm.reset();
    formMessage.textContent = "";

    document.getElementById("modal-title").textContent =
        "Thêm sinh viên";

    const oMaSinhVien =
        document.getElementById("student-id");

    const oEmail =
        document.getElementById("student-email");

    const oMatKhau =
        document.getElementById("student-password");

    const saveButton =
        studentForm.querySelector(".save-button");

    oMaSinhVien.disabled = false;
    oEmail.disabled = false;

    oMatKhau.required = true;
    oMatKhau.disabled = false;
    oMatKhau.placeholder = "";

    saveButton.disabled = false;
    saveButton.textContent = "Lưu sinh viên";

    studentModal.classList.remove("hidden");
    document.body.style.overflow = "hidden";

    oMaSinhVien.focus();
}




function moFormSuaSinhVien(sinhVien) {
    cheDoForm = "sua";
    maSinhVienDangSua = sinhVien.masv;

    studentForm.reset();
    formMessage.textContent = "";

    document.getElementById("modal-title").textContent =
        "Sửa sinh viên";

    document.getElementById("student-id").value =
        sinhVien.masv;

    document.getElementById("student-name").value =
        sinhVien.hoten;

    document.getElementById("student-email").value =
        sinhVien.mail;

    document.getElementById("student-birthday").value =
        sinhVien.ngaysinh;

    document.getElementById("student-department").value =
        sinhVien.makhoa;

    document.getElementById("student-year").value =
        sinhVien.namnhaphoc;

    const oMaSinhVien =
        document.getElementById("student-id");

    const oEmail =
        document.getElementById("student-email");

    const oMatKhau =
        document.getElementById("student-password");

    const saveButton =
        studentForm.querySelector(".save-button");

    oMaSinhVien.disabled = true;
    oEmail.disabled = true;

    oMatKhau.required = false;
    oMatKhau.disabled = true;
    oMatKhau.value = "";
    oMatKhau.placeholder =
        "Mật khẩu được quản lý bởi Firebase";


    saveButton.disabled = false;
    saveButton.textContent = "Cập nhật sinh viên";

    studentModal.classList.remove("hidden");
    document.body.style.overflow = "hidden";

    document.getElementById("student-name").focus();
}






function dongFormSinhVien() {
    studentModal.classList.add("hidden");
    document.body.style.overflow = "";
}

openAddButton.addEventListener(
    "click",
    moFormThemSinhVien
);


closeModalButton.addEventListener(
    "click",
    dongFormSinhVien
);


cancelFormButton.addEventListener(
    "click",
    dongFormSinhVien
);


studentModal.addEventListener("click", function (suKien) {
    if (suKien.target === studentModal) {
        dongFormSinhVien();
    }
});


document.addEventListener("keydown", function (suKien) {
    if (
        suKien.key === "Escape" &&
        !studentModal.classList.contains("hidden")
    ) {
        dongFormSinhVien();
    }
});


studentForm.addEventListener(
    "submit",
    async function (suKien) {
        suKien.preventDefault();

        const duLieu = {
            masv: document
                .getElementById("student-id")
                .value
                .trim(),

            hoten: document
                .getElementById("student-name")
                .value
                .trim(),

            mail: document
                .getElementById("student-email")
                .value
                .trim(),

            matkhau: document
                .getElementById("student-password")
                .value
                .trim(),

            ngaysinh: document
                .getElementById("student-birthday")
                .value,

            makhoa: document
                .getElementById("student-department")
                .value,

            namnhaphoc: document
                .getElementById("student-year")
                .value
        };

        if(cheDoForm === "them") {
            const passwordError = passwordPolicyError(duLieu.matkhau, duLieu.mail);
            if (passwordError) {
                formMessage.textContent = passwordError;
                return;
            }
            await guiYeuCauThemSinhVien(duLieu);
        } else {
            await guiYeuCauSuaSinhVien(
                maSinhVienDangSua, 
                duLieu
            );
        }
    }
);





async function guiYeuCauThemSinhVien(duLieu) {
    const saveButton = studentForm.querySelector(
        ".save-button"
    );

    formMessage.textContent = "";
    saveButton.disabled = true;
    saveButton.textContent = "Đang lưu...";

    try {
        const ketQua = await goiApiYeuCau("/api/admin/students", {
            method: "POST",
            body: JSON.stringify(duLieu)
        });

        dongFormSinhVien();

        await taiDanhSachSinhVien();

        hienThiThongBao(
            ketQua.linkedExistingAccount
                ? "Đã bổ sung hồ sơ và phân quyền cho tài khoản hiện có."
                : "Thêm sinh viên thành công.",
            "success"
        );

    } catch (loi) {
        formMessage.textContent = loi.message;

    } finally {
        saveButton.disabled = false;
        saveButton.textContent = "Lưu sinh viên";
    }
}






async function guiYeuCauSuaSinhVien(masv, duLieu) {
    const saveButton = studentForm.querySelector(
        ".save-button"
    );

    formMessage.textContent = "";
    saveButton.disabled = true;
    saveButton.textContent = "Đang cập nhật...";

    try {
        const { db } = await import(
            "/static/js/firebase-config.js"
        );

        const {
            doc,
            updateDoc
        } = await import(
            "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js"
        );

        const thamChieuSinhVien = doc(
            db,
            "sinhvien",
            masv
        );

        await updateDoc(
            thamChieuSinhVien,
            {
                hoten: duLieu.hoten,
                ngaysinh: duLieu.ngaysinh,
                makhoa: duLieu.makhoa,

                namnhaphoc: Number(
                    duLieu.namnhaphoc
                )
            }
        );

        dongFormSinhVien();

        await taiDanhSachSinhVien();

        hienThiThongBao("Cập nhật sinh viên thành công.", "success");

    } catch (loi) {
        formMessage.textContent = loi.message;

    } finally {
        saveButton.disabled = false;
        saveButton.textContent =
            "Cập nhật sinh viên";
    }
}











async function xoaSinhVien(sinhVien, nutXoa) {
    const dongY = await xacNhan(
        `Bạn có chắc muốn xóa sinh viên này?\n\nMã sinh viên: ${sinhVien.masv}\nHọ tên: ${sinhVien.hoten}`
    );

    if (!dongY) {
        return;
    }

    nutXoa.disabled = true;
    nutXoa.textContent = "Đang xóa...";

    try {
        const { db } = await import(
            "/static/js/firebase-config.js"
        );

        const {
            doc,
            getDoc,
            writeBatch
        } = await import(
            "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js"
        );

        // 1. Sinh viên phải có UID Firebase
        if (!sinhVien.uid) {
            throw new Error(
                "Sinh viên này chưa được liên kết với tài khoản Firebase."
            );
        }

        // 2. Tìm tài khoản tương ứng trong users
        const thamChieuTaiKhoan = doc(
            db,
            "users",
            sinhVien.uid
        );

        const taiKhoan =
            await getDoc(thamChieuTaiKhoan);

        if (!taiKhoan.exists()) {
            throw new Error(
                "Không tìm thấy tài khoản của sinh viên."
            );
        }

        const nguoiDung = taiKhoan.data();

        // 3. Kiểm tra role
        if (nguoiDung.role !== "sinhvien") {
            throw new Error(
                "Từ chối xóa: UID này không thuộc sinh viên."
            );
        }

        // 4. Kiểm tra MASV
        if (
            String(nguoiDung.masv || "").trim()
            !== String(sinhVien.masv).trim()
        ) {
            throw new Error(
                "Từ chối xóa: UID và mã sinh viên không khớp."
            );
        }

        // 5. Chuẩn bị xóa 2 document
        const batch = writeBatch(db);

        batch.delete(
            doc(
                db,
                "sinhvien",
                sinhVien.masv
            )
        );

        batch.delete(
            doc(
                db,
                "users",
                sinhVien.uid
            )
        );

        // 6. Thực hiện xóa
        await batch.commit();

        // 7. Tải lại bảng
        await taiDanhSachSinhVien();

        hienThiThongBao("Xóa sinh viên thành công.", "success");

    } catch (loi) {
        hienThiThongBao(`Lỗi: ${loi.message}`, "error");

        nutXoa.disabled = false;
        nutXoa.textContent = "Xóa";
    }
}








const studentMenu =
    document.getElementById("student-menu");

const overviewMenu =
    document.getElementById("overview-menu");

const teacherMenu =
    document.getElementById("teacher-menu");

const courseMenu = 
    document.getElementById("class-menu");



const studentSection =
    document.getElementById("quan-ly-sinh-vien");

const teacherSection =
    document.getElementById("quan-ly-giao-vien");

const courseSection = 
    document.getElementById("quan-ly-lop-mon");

const statCards =
    document.querySelector(".stat-cards");

const dashboardSection =
    document.getElementById("admin-dashboard");





/* Các menu được xử lý tập trung bởi router ở cuối file. */




async function taiDanhSachGiaoVien() {
    const thanBang = document.getElementById("teacher-table-body");
    hienThiDangTaiBang(thanBang, 6, "Đang tải danh sách giáo viên");

    try {
        const [ketQua, danhSachKhoa] = await voiGioiHanThoiGian(
            (async function () {
                const { db } = await import(
                    "/static/js/firebase-config.js"
                );

                const { collection, getDocs } = await import(
                    "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js"
                );

                return Promise.all([
                    getDocs(collection(db, "giaovien")),
                    layDanhSachKhoaTuCache()
                ]);
            })(),
            "Quá thời gian tải danh sách giáo viên."
        );

        const bangTenKhoa = {};

        danhSachKhoa.forEach(function (khoa) {
            bangTenKhoa[khoa.makhoa] = khoa.tenkhoa || "";
        });


        const danhSach = ketQua.docs.map(
            function (taiLieu) {
                const duLieu = taiLieu.data();


                const maKhoa =
                    String(duLieu.makhoa || "").trim();


                return {
                    magv: taiLieu.id,
                    uid: duLieu.uid || "",
                    mail: duLieu.mail || "",
                    hoten: duLieu.hoten || "",
                    ngaysinh: duLieu.ngaysinh || "",
                    makhoa: maKhoa,
                    tenkhoa: bangTenKhoa[maKhoa] || ""
                };
            }
        );

        hienThiDanhSachGiaoVien(danhSach);

    } catch (loi) {
        console.error(
            "Không thể tải danh sách giáo viên:",
            loi
        );

        hienThiTrangThaiBang(
            thanBang,
            6,
            layThongBaoLoiTaiDuLieu(loi),
            "error",
            taiDanhSachGiaoVien
        );
    }
}





function hienThiDanhSachGiaoVien(danhSach) {
    const thanBang = document.getElementById(
        "teacher-table-body"
    );

    thanBang.replaceChildren();
    thanBang.setAttribute("aria-busy", "false");

    if (danhSach.length === 0) {
        hienThiTrangThaiBang(thanBang, 6, "Chưa có giáo viên nào.");
        return;
    }

    for (const giaoVien of danhSach) {
        const dong = document.createElement("tr");

        const thongTinKhoa = giaoVien.tenkhoa
            ? `${giaoVien.makhoa} - ${giaoVien.tenkhoa}`
            : giaoVien.makhoa;

        dong.appendChild(taoO(giaoVien.magv));
        dong.appendChild(taoO(giaoVien.hoten));
        dong.appendChild(taoO(giaoVien.mail));
        dong.appendChild(taoO(giaoVien.ngaysinh));
        dong.appendChild(taoO(thongTinKhoa));

        const oThaoTac = document.createElement("td");
        const nhomNut = document.createElement("div");

        nhomNut.className = "action-group";

        const nutSua = document.createElement("button");

        nutSua.type = "button";
        nutSua.className = "table-action edit-action";
        nutSua.textContent = "Sửa";
        nutSua.dataset.magv = giaoVien.magv;

        nutSua.addEventListener("click", function () {
            moFormSuaGiaoVien(giaoVien);
        });



        const nutXoa = document.createElement("button");

        nutXoa.type = "button";
        nutXoa.className = "table-action delete-action";
        nutXoa.textContent = "Xóa";
        nutXoa.dataset.magv = giaoVien.magv;

        nutXoa.addEventListener("click", function () {
            xoaGiaoVien(giaoVien, nutXoa);
        });

        nhomNut.appendChild(nutSua);
        nhomNut.appendChild(taoNutCapMatKhauTam({
            uid: giaoVien.uid,
            email: giaoVien.mail,
            name: giaoVien.hoten,
            role: "Giáo viên"
        }));
        nhomNut.appendChild(nutXoa);

        oThaoTac.appendChild(nhomNut);
        dong.appendChild(oThaoTac);

        thanBang.appendChild(dong);
    }
}



const teacherModal =
    document.getElementById("teacher-modal");

const teacherForm =
    document.getElementById("teacher-form");

const teacherFormMessage =
    document.getElementById("teacher-form-message");

const openAddTeacherButton =
    document.getElementById("open-add-teacher");

const closeTeacherModalButton =
    document.getElementById("close-teacher-modal");

const cancelTeacherFormButton =
    document.getElementById("cancel-teacher-form");




function moFormThemGiaoVien() {
    cheDoFormGiaoVien = "them";
    maGiaoVienDangSua = null;

    teacherForm.reset();
    teacherFormMessage.textContent = "";

    document.getElementById(
        "teacher-modal-title"
    ).textContent = "Thêm giáo viên";

    const oMaGiaoVien =
        document.getElementById("teacher-id");

    const oEmail =
        document.getElementById("teacher-email");

    const oMatKhau =
        document.getElementById("teacher-password");

    const saveButton = teacherForm.querySelector(
        ".save-button"
    );

    oMaGiaoVien.disabled = false;
    oEmail.disabled = false;

    oMatKhau.disabled = false;
    oMatKhau.required = true;
    oMatKhau.placeholder = "";

    saveButton.disabled = false;
    saveButton.textContent = "Lưu giáo viên";

    teacherModal.classList.remove("hidden");
    document.body.style.overflow = "hidden";

    oMaGiaoVien.focus();
}




function dongFormGiaoVien() {
    teacherModal.classList.add("hidden");
    document.body.style.overflow = "";
}



openAddTeacherButton.addEventListener(
    "click",
    moFormThemGiaoVien
);


closeTeacherModalButton.addEventListener(
    "click",
    dongFormGiaoVien
);



cancelTeacherFormButton.addEventListener(
    "click",
    dongFormGiaoVien
);



teacherModal.addEventListener(
    "click",
    function (suKien) {
        if (suKien.target === teacherModal) {
            dongFormGiaoVien();
        }
    }
);



document.addEventListener(
    "keydown",
    function (suKien) {
        if (
            suKien.key === "Escape" &&
            !teacherModal.classList.contains("hidden")
        ) {
            dongFormGiaoVien();
        }
    }
);




async function guiYeuCauThemGiaoVien(duLieu) {
    const saveButton = teacherForm.querySelector(
        ".save-button"
    );

    teacherFormMessage.textContent = "";
    saveButton.disabled = true;
    saveButton.textContent = "Đang lưu...";

    try {

        const {
            secondaryAuth,
            db
        } = await import(
            "/static/js/firebase-config.js"
        );

        const {
            createUserWithEmailAndPassword,
            signOut
        } = await import(
            "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js"
        );

        const {
            doc,
            getDoc,
            setDoc
        } = await import(
            "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js"
        );



        const thamChieuGiaoVien = doc(
            db,
            "giaovien",
            duLieu.magv
        );

        const giaoVienCu =
            await getDoc(thamChieuGiaoVien);

        if (giaoVienCu.exists()) {
            throw new Error(
                "Mã giáo viên đã tồn tại."
            );
        }


        const taiKhoanGiaoVien =
            await createUserWithEmailAndPassword(
                secondaryAuth,
                duLieu.mail,
                duLieu.matkhau
            );

        const uidGiaoVien =
            taiKhoanGiaoVien.user.uid;


        await setDoc(
            doc(db, "users", uidGiaoVien),
            {
                email: duLieu.mail,
                role: "giaovien",
                magv: duLieu.magv
            }
        );

        await setDoc(
            thamChieuGiaoVien,
            {
                uid: uidGiaoVien,
                mail: duLieu.mail,
                hoten: duLieu.hoten,
                ngaysinh: duLieu.ngaysinh,
                makhoa: duLieu.makhoa
            }
        );

        await signOut(secondaryAuth);


        dongFormGiaoVien();
        await taiDanhSachGiaoVien();

        hienThiThongBao("Thêm giáo viên thành công.", "success");

    } catch (loi) {
        teacherFormMessage.textContent = loi.message;

    } finally {
        saveButton.disabled = false;
        saveButton.textContent = "Lưu giáo viên";
    }
}



teacherForm.addEventListener(
    "submit",
    async function (suKien) {
        suKien.preventDefault();

        const duLieu = {
            magv: document
                .getElementById("teacher-id")
                .value
                .trim(),

            hoten: document
                .getElementById("teacher-name")
                .value
                .trim(),

            mail: document
                .getElementById("teacher-email")
                .value
                .trim(),

            matkhau: document
                .getElementById("teacher-password")
                .value
                .trim(),

            ngaysinh: document
                .getElementById("teacher-birthday")
                .value,

            makhoa: document
                .getElementById("teacher-department")
                .value
        };

        if (cheDoFormGiaoVien === "them") {
            const passwordError = passwordPolicyError(duLieu.matkhau, duLieu.mail);
            if (passwordError) {
                teacherFormMessage.textContent = passwordError;
                return;
            }
            await guiYeuCauThemGiaoVien(duLieu);
        } else {
            await guiYeuCauSuaGiaoVien(
                maGiaoVienDangSua,
                duLieu
            );
        }
    }
);




function moFormSuaGiaoVien(giaoVien) {
    cheDoFormGiaoVien = "sua";
    maGiaoVienDangSua = giaoVien.magv;

    teacherForm.reset();
    teacherFormMessage.textContent = "";

    document.getElementById(
        "teacher-modal-title"
    ).textContent = "Sửa giáo viên";

    document.getElementById("teacher-id").value =
        giaoVien.magv;

    document.getElementById("teacher-name").value =
        giaoVien.hoten;

    document.getElementById("teacher-email").value =
        giaoVien.mail;

    document.getElementById("teacher-birthday").value =
        giaoVien.ngaysinh;

    document.getElementById("teacher-department").value =
        giaoVien.makhoa;

    const oMaGiaoVien =
        document.getElementById("teacher-id");

    const oEmail =
        document.getElementById("teacher-email");

    const oMatKhau =
        document.getElementById("teacher-password");

    const saveButton = teacherForm.querySelector(
        ".save-button"
    );

    oMaGiaoVien.disabled = true;
    oEmail.disabled = true;

    oMatKhau.required = false;
    oMatKhau.disabled = true;
    oMatKhau.value = "";
    oMatKhau.placeholder =
        "Mật khẩu được quản lý bởi Firebase";


    saveButton.disabled = false;
    saveButton.textContent = "Cập nhật giáo viên";

    teacherModal.classList.remove("hidden");
    document.body.style.overflow = "hidden";

    document.getElementById("teacher-name").focus();
}




async function guiYeuCauSuaGiaoVien(magv, duLieu) {
    const saveButton = teacherForm.querySelector(
        ".save-button"
    );

    teacherFormMessage.textContent = "";
    saveButton.disabled = true;
    saveButton.textContent = "Đang cập nhật...";

    try {

        const { db } = await import(
            "/static/js/firebase-config.js"
        );

        const {
            doc,
            updateDoc
        } = await import(
            "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js"
        );


        
        const thamChieuGiaoVien = doc(
            db,
            "giaovien",
            magv
        );

        await updateDoc(
            thamChieuGiaoVien,
            {
                hoten: duLieu.hoten,
                ngaysinh: duLieu.ngaysinh,
                makhoa: duLieu.makhoa
            }
        );



        dongFormGiaoVien();
        await taiDanhSachGiaoVien();

        hienThiThongBao("Cập nhật giáo viên thành công.", "success");

    } catch (loi) {
        teacherFormMessage.textContent = loi.message;

    } finally {
        saveButton.disabled = false;
        saveButton.textContent = "Cập nhật giáo viên";
    }
}




async function xoaGiaoVien(giaoVien, nutXoa) {
    const dongY = await xacNhan(
        `Bạn có chắc muốn xóa giáo viên này?\n\nMã giáo viên: ${giaoVien.magv}\nHọ tên: ${giaoVien.hoten}`
    );

    if (!dongY) {
        return;
    }

    nutXoa.disabled = true;
    nutXoa.textContent = "Đang xóa...";

    try {
        const { db } = await import(
            "/static/js/firebase-config.js"
        );

        const {
            doc,
            getDoc,
            writeBatch
        } = await import(
            "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js"
        );    
        
        

        if (!giaoVien.uid) {
            throw new Error(
                "Giáo viên này chưa được liên kết với tài khoản Firebase."
            );
        }



        const thamChieuTaiKhoan = doc(
            db,
            "users",
            giaoVien.uid
        );

        const taiKhoan =
            await getDoc(thamChieuTaiKhoan);

        if (!taiKhoan.exists()) {
            throw new Error(
                "Không tìm thấy tài khoản của giáo viên."
            );
        }

        const nguoiDung = taiKhoan.data();

        if (nguoiDung.role !== "giaovien") {
            throw new Error(
                "Từ chối xóa: UID này không thuộc giáo viên."
            );
        }

        if (
            String(nguoiDung.magv || "").trim()
            !== String(giaoVien.magv).trim()
        ) {
            throw new Error(
                "Từ chối xóa: UID và mã giáo viên không khớp."
            );
        }

        const batch = writeBatch(db);

        batch.delete(
            doc(db, "giaovien", giaoVien.magv)
        );

        batch.delete(
            doc(db, "users", giaoVien.uid)
        );

        await batch.commit();

        await taiDanhSachGiaoVien();

        hienThiThongBao("Xóa giáo viên thành công.", "success");


    } catch (loi) {
        hienThiThongBao(`Lỗi: ${loi.message}`, "error");

        nutXoa.disabled = false;
        nutXoa.textContent = "Xóa";
    }
}



const courseTableBody = document.getElementById("course-table-body");
const boNhoLopMonQuanLy = new Map();
let maLopMonDangSua = null;



function dinhDangNgayGio(chuoiNgay) {
    if (!chuoiNgay) {
        return "";
    }

    const ngay = typeof chuoiNgay?.toDate === "function"
        ? chuoiNgay.toDate()
        : new Date(chuoiNgay);

    if (Number.isNaN(ngay.getTime())) {
        return chuoiNgay;
    }

    return ngay.toLocaleString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
    });
}


function hienThiDanhSachLopMon(danhSach) {
    if (!Array.isArray(danhSach) || danhSach.length === 0) {
        hienThiTrangThaiBang(courseTableBody, 10, "Chưa có lớp môn nào được mở.");
        return;
    }

    courseTableBody.setAttribute("aria-busy", "false");
    courseTableBody.innerHTML = danhSach.map(function (lopMon) {
        const namKetThuc = Number(lopMon.namhoc) + 1;


        const trangThai = String(
            lopMon.trangthai || ""
        ).trim().toUpperCase();

        const dangMo = trangThai === "MỞ";

        const trangThaiMoi = dangMo ? "ĐÓNG" : "MỞ";
        const tenNut = dangMo ? "Đóng" : "Mở lại";



        return `
            <tr>
                <td>${lopMon.malopmon}</td>

                <td>
                    <strong>${lopMon.tenmon}</strong><br>
                    <small>${lopMon.mamon}</small>
                </td>

                <td>
                    <strong>${lopMon.tengiaovien}</strong><br>
                    <small>${lopMon.magv}</small>
                </td>

                <td>Học kỳ ${lopMon.hocky}</td>

                <td>
                    ${lopMon.namhoc} - ${namKetThuc}
                </td>

                <td>
                    <strong>${lopMon.thu ? (Number(lopMon.thu) === 8 ? "Chủ nhật" : `Thứ ${lopMon.thu}`) : "Chưa xếp"}</strong><br>
                    <small>${lopMon.giobatdau && lopMon.gioketthuc ? `${lopMon.giobatdau} – ${lopMon.gioketthuc}` : "—"}</small><br>
                    <small>${lopMon.ngaybatdauhoc && lopMon.ngayketthuchoc ? `${lopMon.ngaybatdauhoc} → ${lopMon.ngayketthuchoc}` : "Chưa có thời hạn học"}</small>
                </td>

                <td>
                    ${lopMon.sisodadangky}/${lopMon.sisotoida}
                </td>

                <td>
                    ${dinhDangNgayGio(lopMon.ngaybatdaudk)}
                    <br>
                    đến
                    <br>
                    ${dinhDangNgayGio(lopMon.ngayketthucdk)}
                </td>

                <td>
                    <span class="
                        course-status
                        ${dangMo ? "status-open" : "status-closed"}
                    ">
                        ${trangThai}
                    </span>
                </td>

                <td>
                    <button type="button" class="edit-course-button" data-malopmon="${lopMon.malopmon}">Sửa</button>
                    <button
                        type="button"
                        class="
                            close-course-button
                            ${dangMo ? "" : "reopen-course-button"}
                        "
                        data-malopmon="${lopMon.malopmon}"
                        data-trangthai-moi="${trangThaiMoi}">
                        ${tenNut}
                    </button>
                </td>
            </tr>
        `;
    }).join("");
}






async function taiDanhSachLopMon() {
    hienThiDangTaiBang(courseTableBody, 10, "Đang tải danh sách lớp môn");

    try {
        const [ketQuaLopMon, ketQuaMonHoc, ketQuaGiaoVien] =
            await voiGioiHanThoiGian(
                (async function () {
                    const { db } = await import(
                        "/static/js/firebase-config.js"
                    );

                    const { collection, getDocs } = await import(
                        "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js"
                    );

                    return Promise.all([
                        getDocs(collection(db, "lopmon")),
                        getDocs(collection(db, "monhoc")),
                        getDocs(collection(db, "giaovien"))
                    ]);
                })(),
                "Quá thời gian tải danh sách lớp môn."
            );


        // 2. Tạo bảng tra Mã môn -> Tên môn
        const bangTenMon = {};

        ketQuaMonHoc.docs.forEach(function (taiLieu) {
            bangTenMon[taiLieu.id] =
                taiLieu.data().tenmon || "";
        });


        // 3. Tạo bảng tra Mã GV -> Họ tên
        const bangTenGiaoVien = {};

        ketQuaGiaoVien.docs.forEach(function (taiLieu) {
            bangTenGiaoVien[taiLieu.id] =
                taiLieu.data().hoten || "";
        });


        // 4. Chuyển từng document lớp môn thành object
        const danhSach = ketQuaLopMon.docs.map(
            function (taiLieu) {
                const duLieu = taiLieu.data();

                return {
                    malopmon: taiLieu.id,
                    mamon: duLieu.mamon || "",
                    tenmon: bangTenMon[duLieu.mamon] || "",
                    magv: duLieu.magv || "",
                    tengiaovien: bangTenGiaoVien[duLieu.magv] || "",
                    hocky: duLieu.hocky || "",
                    namhoc: duLieu.namhoc || "",
                    sisotoida: Number(duLieu.sisotoida || 0),
                    sisodadangky: Number(duLieu.sisodadangky || 0),
                    ngaybatdaudk: duLieu.ngaybatdaudk || "",
                    ngayketthucdk: duLieu.ngayketthucdk || "",
                    thu: Number(duLieu.thu || 0),
                    giobatdau: duLieu.giobatdau || "",
                    gioketthuc: duLieu.gioketthuc || "",
                    ngaybatdauhoc: duLieu.ngaybatdauhoc || "",
                    ngayketthuchoc: duLieu.ngayketthuchoc || "",
                    trangthai: duLieu.trangthai || ""
                };
            }
        );


        boNhoLopMonQuanLy.clear();
        danhSach.forEach((lopMon) => boNhoLopMonQuanLy.set(lopMon.malopmon, lopMon));

        // 5. Đưa dữ liệu sang hàm vẽ bảng cũ
        hienThiDanhSachLopMon(danhSach);

    } catch (loi) {
        console.error(
            "Không thể tải danh sách lớp môn:",
            loi
        );

        hienThiTrangThaiBang(
            courseTableBody,
            10,
            layThongBaoLoiTaiDuLieu(loi),
            "error",
            taiDanhSachLopMon
        );
    }
}





courseTableBody.addEventListener("click", async function (suKien) {
    const nutSua = suKien.target.closest(".edit-course-button");
    if (nutSua) {
        const lopMon = boNhoLopMonQuanLy.get(nutSua.dataset.malopmon);
        if (lopMon) await moModalLopMon(lopMon);
        return;
    }

    const nutTrangThai = suKien.target.closest(
        ".close-course-button"
    );

    if (!nutTrangThai) {
        return;
    }

    const maLopMon = nutTrangThai.dataset.malopmon;
    const trangThaiMoi = nutTrangThai.dataset.trangthaiMoi;

    const tenHanhDong = (
        trangThaiMoi === "ĐÓNG"
            ? "đóng đăng ký"
            : "mở lại đăng ký"
    );

    const dongY = await xacNhan(
        `Bạn có chắc muốn ${tenHanhDong} lớp ${maLopMon}?`
    );

    if (!dongY) {
        return;
    }

    const noiDungNutCu = nutTrangThai.textContent;

    nutTrangThai.disabled = true;
    nutTrangThai.textContent = "Đang xử lý...";

    try {
        const { db } = await import(
            "/static/js/firebase-config.js"
        );

        const {
            doc,
            updateDoc
        } = await import(
            "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js"
        );

        const lopMonCanSua = doc(
            db,
            "lopmon",
            maLopMon
        );

        await updateDoc(
            lopMonCanSua,
            {
                trangthai: trangThaiMoi
            }
        );

        hienThiThongBao(`Đã ${tenHanhDong} lớp ${maLopMon}.`, "success");

        await taiDanhSachLopMon();

    } catch (loi) {
        hienThiThongBao(`Lỗi: ${loi.message}`, "error");

        nutTrangThai.disabled = false;
        nutTrangThai.textContent = noiDungNutCu;
    }
});





const openCourseButton = document.getElementById(
    "open-course-button"
);

const courseModal = document.getElementById(
    "course-modal"
);

const closeCourseModalButton = document.getElementById(
    "close-course-modal-button"
);

const cancelCourseButton = document.getElementById(
    "cancel-course-button"
);

const courseForm = document.getElementById(
    "course-form"
);

const courseFormError = document.getElementById(
    "course-form-error"
);




async function moModalLopMon(lopMon = null) {
    courseForm.reset();
    courseFormError.textContent = "";
    maLopMonDangSua = lopMon?.malopmon || null;

    const tieuDe = courseModal.querySelector(".modal-header h2");
    const moTa = courseModal.querySelector(".modal-header p");
    const oMaLop = document.getElementById("course-code");
    if (tieuDe) tieuDe.textContent = maLopMonDangSua ? "Sửa lớp môn" : "Mở lớp môn";
    if (moTa) moTa.textContent = maLopMonDangSua
        ? "Cập nhật lịch học và thông tin lớp môn."
        : "Nhập thông tin lớp được mở trong học kỳ.";
    oMaLop.disabled = Boolean(maLopMonDangSua);
    saveCourseButton.textContent = maLopMonDangSua ? "Hoàn tất" : "Mở lớp môn";

    document.getElementById("course-year").value =
        new Date().getFullYear();

    document.getElementById("course-capacity").value = 40;
    document.getElementById("course-start-time").value = "07:00";
    document.getElementById("course-end-time").value = "09:30";

    courseModal.hidden = false;
    document.body.style.overflow = "hidden";


    await taiLuaChonLopMon();

    if (lopMon) {
        oMaLop.value = lopMon.malopmon;
        courseSubject.value = lopMon.mamon;
        courseTeacher.value = lopMon.magv;
        document.getElementById("course-semester").value = lopMon.hocky;
        document.getElementById("course-year").value = lopMon.namhoc;
        document.getElementById("course-capacity").value = lopMon.sisotoida;
        document.getElementById("course-weekday").value = lopMon.thu || "";
        document.getElementById("course-start-time").value = lopMon.giobatdau || "";
        document.getElementById("course-end-time").value = lopMon.gioketthuc || "";
        document.getElementById("course-study-start").value = dinhDangNgayChoInput(lopMon.ngaybatdauhoc);
        document.getElementById("course-study-end").value = dinhDangNgayChoInput(lopMon.ngayketthuchoc);
        document.getElementById("course-registration-start").value = dinhDangNgayChoInput(lopMon.ngaybatdaudk, true);
        document.getElementById("course-registration-end").value = dinhDangNgayChoInput(lopMon.ngayketthucdk, true);
    }
}


function dinhDangNgayChoInput(giaTri, coGio = false) {
    if (!giaTri) return "";
    const ngay = typeof giaTri?.toDate === "function" ? giaTri.toDate() : new Date(giaTri);
    if (Number.isNaN(ngay.getTime())) return String(giaTri).slice(0, coGio ? 16 : 10);
    const buHaiSo = (so) => String(so).padStart(2, "0");
    const phanNgay = `${ngay.getFullYear()}-${buHaiSo(ngay.getMonth() + 1)}-${buHaiSo(ngay.getDate())}`;
    return coGio ? `${phanNgay}T${buHaiSo(ngay.getHours())}:${buHaiSo(ngay.getMinutes())}` : phanNgay;
}


function dongModalLopMon() {
    courseModal.hidden = true;
    document.body.style.overflow = "";
    maLopMonDangSua = null;
    document.getElementById("course-code").disabled = false;
}




openCourseButton.addEventListener("click", function () {
    moModalLopMon();
});


closeCourseModalButton.addEventListener("click", function () {
    dongModalLopMon();
});


cancelCourseButton.addEventListener("click", function () {
    dongModalLopMon();
});




courseModal.addEventListener("click", function (suKien) {
    if (suKien.target === courseModal) {
        dongModalLopMon();
    }
});



document.addEventListener("keydown", function (suKien) {
    if (
        suKien.key === "Escape" &&
        courseModal.hidden === false
    ) {
        dongModalLopMon();
    }
});




const courseSubject = document.getElementById(
    "course-subject"
);

const courseTeacher = document.getElementById(
    "course-teacher"
);





async function taiLuaChonLopMon() {
    courseSubject.disabled = true;
    courseTeacher.disabled = true;

    courseFormError.textContent = "";

    courseSubject.innerHTML = `
        <option value="">
            Đang tải môn học...
        </option>
    `;

    courseTeacher.innerHTML = `
        <option value="">
            Đang tải giáo viên...
        </option>
    `;

    try {
        const { db } = await import(
            "/static/js/firebase-config.js"
        );

        const {
            collection,
            getDocs
        } = await import(
            "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js"
        );


        const [
            ketQuaMonHoc,
            ketQuaGiaoVien
        ] = await Promise.all([
            getDocs(collection(db, "monhoc")),
            getDocs(collection(db, "giaovien"))
        ]);


        const danhSachMonHoc =
            ketQuaMonHoc.docs.map(function (taiLieu) {
                const duLieu = taiLieu.data();

                return {
                    mamon: taiLieu.id,
                    tenmon: duLieu.tenmon || "",
                    sotinchi: duLieu.sotinchi || 0
                };
            });


        const danhSachGiaoVien =
            ketQuaGiaoVien.docs.map(function (taiLieu) {
                const duLieu = taiLieu.data();

                return {
                    magv: taiLieu.id,
                    hoten: duLieu.hoten || ""
                };
            });


        courseSubject.innerHTML = `
            <option value="">
                -- Chọn môn học --
            </option>

            ${danhSachMonHoc.map(function (monHoc) {
                return `
                    <option value="${monHoc.mamon}">
                        ${monHoc.mamon} - ${monHoc.tenmon}
                        (${monHoc.sotinchi} tín chỉ)
                    </option>
                `;
            }).join("")}
        `;


        courseTeacher.innerHTML = `
            <option value="">
                -- Chọn giáo viên --
            </option>

            ${danhSachGiaoVien.map(function (giaoVien) {
                return `
                    <option value="${giaoVien.magv}">
                        ${giaoVien.magv} - ${giaoVien.hoten}
                    </option>
                `;
            }).join("")}
        `;

    } catch (loi) {
        console.error(
            "Không thể tải lựa chọn lớp môn:",
            loi
        );

        courseFormError.textContent = loi.message;

        courseSubject.innerHTML = `
            <option value="">
                Không tải được môn học
            </option>
        `;

        courseTeacher.innerHTML = `
            <option value="">
                Không tải được giáo viên
            </option>
        `;

    } finally {
        courseSubject.disabled = false;
        courseTeacher.disabled = false;
    }
}





const saveCourseButton = document.getElementById(
    "save-course-button"
);



courseForm.addEventListener(
    "submit",
    async function (suKien) {
        suKien.preventDefault();

        courseFormError.textContent = "";
        const dangChinhSua = Boolean(maLopMonDangSua);

        const duLieuGuiDi = {
            malopmon: document
                .getElementById("course-code")
                .value
                .trim(),

            mamon: courseSubject.value,

            magv: courseTeacher.value,

            hocky: Number(
                document
                    .getElementById("course-semester")
                    .value
            ),

            namhoc: Number(
                document
                    .getElementById("course-year")
                    .value
            ),

            sisotoida: Number(
                document
                    .getElementById("course-capacity")
                    .value
            ),

            ngaybatdaudk: document
                .getElementById("course-registration-start")
                .value,

            ngayketthucdk: document
                .getElementById("course-registration-end")
                .value
                .trim(),

            thu: Number(document
                .getElementById("course-weekday")
                .value),

            giobatdau: document
                .getElementById("course-start-time")
                .value,

            gioketthuc: document
                .getElementById("course-end-time")
                .value,

            ngaybatdauhoc: document
                .getElementById("course-study-start")
                .value,

            ngayketthuchoc: document
                .getElementById("course-study-end")
                .value
        };

        if (!duLieuGuiDi.malopmon || !duLieuGuiDi.mamon || !duLieuGuiDi.magv
            || !duLieuGuiDi.hocky || !duLieuGuiDi.namhoc || !duLieuGuiDi.sisotoida
            || !duLieuGuiDi.ngaybatdaudk || !duLieuGuiDi.ngayketthucdk) {
            courseFormError.textContent = "Vui lòng điền đầy đủ thông tin lớp môn và thời gian đăng ký.";
            return;
        }


        const noiDungNutCu =
            saveCourseButton.textContent;

        saveCourseButton.disabled = true;
        saveCourseButton.textContent =
            dangChinhSua ? "Đang lưu..." : "Đang mở lớp...";


        try {
            const { db, auth } = await import(
                "/static/js/firebase-config.js"
            );

            const {
                collection,
                doc,
                getDoc,
                getDocs,
                query,
                where,
                setDoc,
                updateDoc
            } = await import(
                "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js"
            );


            const thamChieuLopMon = doc(
                db,
                "lopmon",
                duLieuGuiDi.malopmon
            );


            const lopMonCu =
                await getDoc(thamChieuLopMon);

            if (!maLopMonDangSua && lopMonCu.exists()) {
                throw new Error(
                    "Mã lớp môn đã tồn tại."
                );
            }

            if (maLopMonDangSua && !lopMonCu.exists()) {
                throw new Error("Lớp môn cần sửa không còn tồn tại.");
            }


            if (
                duLieuGuiDi.ngayketthucdk
                <= duLieuGuiDi.ngaybatdaudk
            ) {
                throw new Error(
                    "Ngày kết thúc đăng ký phải sau ngày bắt đầu."
                );
            }

            if (!duLieuGuiDi.thu || !duLieuGuiDi.giobatdau || !duLieuGuiDi.gioketthuc) {
                throw new Error("Vui lòng chọn đầy đủ thứ và giờ học.");
            }

            if (duLieuGuiDi.gioketthuc <= duLieuGuiDi.giobatdau) {
                throw new Error("Giờ kết thúc phải sau giờ bắt đầu.");
            }

            if (!duLieuGuiDi.ngaybatdauhoc || !duLieuGuiDi.ngayketthuchoc) {
                throw new Error("Vui lòng chọn ngày bắt đầu và kết thúc học.");
            }

            if (duLieuGuiDi.ngayketthuchoc < duLieuGuiDi.ngaybatdauhoc) {
                throw new Error("Ngày kết thúc học phải từ ngày bắt đầu học trở đi.");
            }

            const ngayHocDau = new Date(`${duLieuGuiDi.ngaybatdauhoc}T00:00:00`);
            const ngayHocCuoi = new Date(`${duLieuGuiDi.ngayketthuchoc}T00:00:00`);
            const thuTheoJs = duLieuGuiDi.thu === 8 ? 0 : duLieuGuiDi.thu - 1;
            const ngayXuatHienDau = new Date(ngayHocDau);
            ngayXuatHienDau.setDate(ngayXuatHienDau.getDate() + (thuTheoJs - ngayHocDau.getDay() + 7) % 7);
            if (ngayXuatHienDau > ngayHocCuoi) {
                throw new Error("Khoảng ngày học không chứa ngày học đã chọn.");
            }

            if (maLopMonDangSua) {
                const siSoHienTai = Number(lopMonCu.data().sisodadangky || 0);
                if (duLieuGuiDi.sisotoida < siSoHienTai) {
                    throw new Error(`Sĩ số tối đa không thể nhỏ hơn ${siSoHienTai} sinh viên đã đăng ký.`);
                }
            }

            if (dangChinhSua) {
                const token = await auth.currentUser.getIdToken();
                const guiCapNhat = async (xacNhanXungDot) => {
                    const phanHoi = await fetch(`/api/admin/course-schedule/${encodeURIComponent(duLieuGuiDi.malopmon)}`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                        body: JSON.stringify({ ...duLieuGuiDi, confirmConflicts: xacNhanXungDot })
                    });
                    const ketQua = await phanHoi.json().catch(() => ({}));
                    if (!phanHoi.ok && !(phanHoi.status === 409 && ketQua.requiresConfirmation)) {
                        throw new Error(ketQua.error || "Không thể cập nhật lớp môn.");
                    }
                    return ketQua;
                };

                let ketQua = await guiCapNhat(false);
                if (ketQua.requiresConfirmation) {
                    const dongY = await xacNhan(
                        `Lịch mới làm ${ketQua.affectedCount} sinh viên bị trùng lịch. ` +
                        "Tiếp tục cập nhật và yêu cầu sinh viên chọn lớp muốn giữ?"
                    );
                    if (!dongY) throw new Error("Đã hủy cập nhật lịch học.");
                    ketQua = await guiCapNhat(true);
                }

                dongModalLopMon();
                await taiDanhSachLopMon();
                hienThiThongBao(
                    ketQua.affectedCount
                        ? `Đã cập nhật và gửi cảnh báo cho ${ketQua.affectedCount} sinh viên.`
                        : "Cập nhật lớp môn thành công.",
                    "success"
                );
                return;
            }

            const cacLopCuaGiaoVien = await getDocs(query(
                collection(db, "lopmon"),
                where("magv", "==", duLieuGuiDi.magv)
            ));
            const lopTrungLich = cacLopCuaGiaoVien.docs.find(function (taiLieu) {
                const lop = taiLieu.data();
                if (taiLieu.id === maLopMonDangSua) return false;
                const trungKhoangNgay = !lop.ngaybatdauhoc || !lop.ngayketthuchoc
                    || (String(lop.ngaybatdauhoc) <= duLieuGuiDi.ngayketthuchoc
                        && String(lop.ngayketthuchoc) >= duLieuGuiDi.ngaybatdauhoc);
                return Number(lop.hocky) === duLieuGuiDi.hocky
                    && Number(lop.namhoc) === duLieuGuiDi.namhoc
                    && Number(lop.thu) === duLieuGuiDi.thu
                    && trungKhoangNgay
                    && String(lop.giobatdau || "") < duLieuGuiDi.gioketthuc
                    && String(lop.gioketthuc || "") > duLieuGuiDi.giobatdau;
            });
            if (lopTrungLich) {
                throw new Error(`Giáo viên đã có lớp ${lopTrungLich.id} trùng khung giờ này.`);
            }

            const xungDotPhatSinh = new Map();
            if (dangChinhSua) {
                const dangKyCuaLop = await getDocs(query(
                    collection(db, "dangky"),
                    where("malopmon", "==", duLieuGuiDi.malopmon)
                ));

                for (const taiLieuDangKy of dangKyCuaLop.docs) {
                    const maSinhVien = String(taiLieuDangKy.data().masv || "").trim();
                    if (!maSinhVien) continue;
                    const dangKyCuaSinhVien = await getDocs(query(
                        collection(db, "dangky"),
                        where("masv", "==", maSinhVien)
                    ));

                    for (const taiLieuKhac of dangKyCuaSinhVien.docs) {
                        const maLopKhac = String(taiLieuKhac.data().malopmon || "").trim();
                        if (!maLopKhac || maLopKhac === duLieuGuiDi.malopmon) continue;
                        const taiLieuLopKhac = await getDoc(doc(db, "lopmon", maLopKhac));
                        if (!taiLieuLopKhac.exists()) continue;
                        const lopKhac = taiLieuLopKhac.data();
                        const trungKhoangNgay = !lopKhac.ngaybatdauhoc || !lopKhac.ngayketthuchoc
                            || (String(lopKhac.ngaybatdauhoc) <= duLieuGuiDi.ngayketthuchoc
                                && String(lopKhac.ngayketthuchoc) >= duLieuGuiDi.ngaybatdauhoc);
                        const biTrung = Number(lopKhac.hocky) === duLieuGuiDi.hocky
                            && Number(lopKhac.namhoc) === duLieuGuiDi.namhoc
                            && Number(lopKhac.thu) === duLieuGuiDi.thu
                            && trungKhoangNgay
                            && String(lopKhac.giobatdau || "") < duLieuGuiDi.gioketthuc
                            && String(lopKhac.gioketthuc || "") > duLieuGuiDi.giobatdau;
                        if (biTrung) {
                            if (!xungDotPhatSinh.has(taiLieuDangKy.id)) {
                                xungDotPhatSinh.set(taiLieuDangKy.id, {
                                    thamChieu: taiLieuDangKy.ref,
                                    masv: maSinhVien,
                                    cacLopTrung: new Set()
                                });
                            }
                            xungDotPhatSinh.get(taiLieuDangKy.id).cacLopTrung.add(maLopKhac);
                        }
                    }
                }
            }

            if (xungDotPhatSinh.size > 0) {
                const dongY = await xacNhan(
                    `Lịch mới làm ${xungDotPhatSinh.size} sinh viên bị trùng lịch. ` +
                    "Tiếp tục cập nhật và yêu cầu sinh viên chọn lớp muốn giữ?"
                );
                if (!dongY) throw new Error("Đã hủy cập nhật lịch học.");
            }



            const {
                taoDuLieuLopMonMoi
            } = await import(
                "/static/js/data-schema.js?v=3"
            );

            const duLieuLopMon =
                taoDuLieuLopMonMoi(
                    duLieuGuiDi
                );

            if (maLopMonDangSua) {
                const { sisodadangky, trangthai, ...duLieuCapNhat } = duLieuLopMon;
                await updateDoc(thamChieuLopMon, duLieuCapNhat);
            } else {
                await setDoc(thamChieuLopMon, duLieuLopMon);
            }


            if (xungDotPhatSinh.size > 0) {
                await Promise.all([...xungDotPhatSinh.values()].map((muc) => updateDoc(muc.thamChieu, {
                    trangthai: "XUNG ĐỘT LỊCH",
                    lichcanxuly: true,
                    xungdotvoi: [...muc.cacLopTrung],
                    capnhatlichluc: new Date().toISOString()
                })));

                try {
                    const uidNguoiNhan = [];
                    for (const muc of xungDotPhatSinh.values()) {
                        const hoSo = await getDoc(doc(db, "sinhvien", muc.masv));
                        const uid = String(hoSo.data()?.uid || "").trim();
                        if (uid) uidNguoiNhan.push(uid);
                    }
                    if (uidNguoiNhan.length && auth.currentUser) {
                        const token = await auth.currentUser.getIdToken();
                        await fetch("/api/notifications", {
                            method: "POST",
                            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                            body: JSON.stringify({
                                title: "Lịch học vừa thay đổi",
                                message: `Lớp ${duLieuGuiDi.malopmon} vừa đổi lịch và gây trùng. Hãy vào Lịch học để chọn lớp muốn giữ.`,
                                recipientMode: "sinhvien_filter",
                                recipientUids: [...new Set(uidNguoiNhan)]
                            })
                        });
                    }
                } catch (loiThongBao) {
                    console.warn("Không thể gửi thông báo xung đột:", loiThongBao);
                }
            }



            dongModalLopMon();

            await taiDanhSachLopMon();

            hienThiThongBao(dangChinhSua ? "Cập nhật lớp môn thành công." : "Mở lớp môn thành công.", "success");

        } catch (loi) {
            courseFormError.textContent =
                loi.message;

        } finally {
            saveCourseButton.disabled = false;

            saveCourseButton.textContent =
                noiDungNutCu;
        }
    }
);






const facultySelects = document.querySelectorAll(
    ".faculty-select"
);


async function taiDanhSachKhoa() {
    facultySelects.forEach(function (select) {
        select.disabled = true;

        select.innerHTML = `
            <option value="">
                Đang tải danh sách khoa...
            </option>
        `;
    });

    try {
        // tải danh sách khoa từ cache
        const danhSachKhoa = await layDanhSachKhoaTuCache();

        const cacLuaChon = danhSachKhoa.map(
            function (khoa) {
                return `
                    <option value="${khoa.makhoa}">
                        ${khoa.makhoa} - ${khoa.tenkhoa}
                    </option>
                `;
            }
        ).join("");

        facultySelects.forEach(function (select) {
            select.innerHTML = `
                <option value="">
                    -- Chọn khoa --
                </option>

                ${cacLuaChon}
            `;
        });

    } catch (loi) {
        facultySelects.forEach(function (select) {
            select.innerHTML = `
                <option value="">
                    Không tải được danh sách khoa
                </option>
            `;
        });

        console.error(loi);

    } finally {
        facultySelects.forEach(function (select) {
            select.disabled = false;
        });
    }
}




function hienThiDanhSachKhoaQuanLy(danhSach) {
    departmentTableBody.replaceChildren();
    departmentTableBody.setAttribute("aria-busy", "false");

    if (!Array.isArray(danhSach) || danhSach.length === 0) {
        hienThiTrangThaiBang(
            departmentTableBody,
            3,
            "Chưa có khoa nào."
        );
        return;
    }

    danhSach.forEach(function (khoa) {
        const dong = document.createElement("tr");

        dong.appendChild(taoO(khoa.makhoa));
        dong.appendChild(taoO(khoa.tenkhoa));
        const thaoTac = document.createElement("td");
        const nhomNut = document.createElement("div");
        nhomNut.className = "action-group";
        const nutSua = document.createElement("button");
        nutSua.type = "button";
        nutSua.className = "table-action edit-action";
        nutSua.textContent = "Sửa";
        nutSua.addEventListener("click", () => moModalSuaKhoa(khoa));
        const nutXoa = document.createElement("button");
        nutXoa.type = "button";
        nutXoa.className = "table-action delete-action";
        nutXoa.textContent = "Xóa";
        nutXoa.addEventListener("click", () => xoaKhoa(khoa));
        nhomNut.append(nutSua, nutXoa);
        thaoTac.appendChild(nhomNut);
        dong.appendChild(thaoTac);
        departmentTableBody.appendChild(dong);
    });
}


async function taiDanhSachKhoaQuanLy() {
    hienThiDangTaiBang(
        departmentTableBody,
        3,
        "Đang tải danh sách khoa"
    );

    try {
        const danhSach = await voiGioiHanThoiGian(
            layDanhSachKhoaTuCache(),
            "Quá thời gian tải danh sách khoa."
        );

        const danhSachDaSapXep = [...danhSach].sort(function (a, b) {
            return String(a.makhoa).localeCompare(String(b.makhoa), "vi");
        });

        hienThiDanhSachKhoaQuanLy(danhSachDaSapXep);
    } catch (loi) {
        console.error("Không thể tải danh sách khoa:", loi);
        hienThiTrangThaiBang(
            departmentTableBody,
            3,
            layThongBaoLoiTaiDuLieu(loi),
            "error",
            taiDanhSachKhoaQuanLy
        );
    }
}


function moModalThemKhoa() {
    cheDoFormKhoa = "them";
    departmentForm.reset();
    departmentCodeInput.disabled = false;
    departmentModalTitle.textContent = "Thêm khoa";
    departmentFormError.textContent = "";
    saveDepartmentButton.disabled = false;
    saveDepartmentButton.textContent = "Lưu khoa";
    departmentModal.classList.remove("hidden");
    document.body.style.overflow = "hidden";
    departmentCodeInput.focus();
}


function moModalSuaKhoa(khoa) {
    cheDoFormKhoa = "sua";
    departmentForm.reset();
    departmentCodeInput.value = khoa.makhoa;
    departmentNameInput.value = khoa.tenkhoa;
    departmentCodeInput.disabled = true;
    departmentModalTitle.textContent = `Sửa khoa ${khoa.makhoa}`;
    departmentFormError.textContent = "";
    saveDepartmentButton.disabled = false;
    saveDepartmentButton.textContent = "Lưu thay đổi";
    departmentModal.classList.remove("hidden");
    document.body.style.overflow = "hidden";
    departmentNameInput.focus();
}


async function xoaKhoa(khoa) {
    const dongY = await xacNhan(`Xóa khoa ${khoa.makhoa} - ${khoa.tenkhoa}?`);
    if (!dongY) return;
    try {
        await goiApiYeuCau(`/api/admin/departments/${encodeURIComponent(khoa.makhoa)}`, {
            method: "DELETE"
        });
        _cachecacLuaChonKhoa = null;
        _promiseTaiDanhSachKhoa = null;
        await Promise.all([taiDanhSachKhoaQuanLy(), taiDanhSachKhoa()]);
        hienThiThongBao(`Đã xóa khoa ${khoa.makhoa}.`, "success");
    } catch (loi) {
        hienThiThongBao(loi.message, "error");
    }
}


function dongModalThemKhoa() {
    departmentModal.classList.add("hidden");
    document.body.style.overflow = "";
    departmentFormError.textContent = "";
    departmentCodeInput.disabled = false;
}


openDepartmentModalButton.addEventListener("click", moModalThemKhoa);
closeDepartmentModalButton.addEventListener("click", dongModalThemKhoa);
cancelDepartmentModalButton.addEventListener("click", dongModalThemKhoa);


departmentModal.addEventListener("click", function (event) {
    if (event.target === departmentModal) {
        dongModalThemKhoa();
    }
});


document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" &&
        !departmentModal.classList.contains("hidden")) {
        dongModalThemKhoa();
    }
});


departmentCodeInput.addEventListener("input", function () {
    departmentCodeInput.value = departmentCodeInput.value
        .toUpperCase()
        .replace(/\s+/g, "");
});


departmentForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    departmentFormError.textContent = "";

    const maKhoa = departmentCodeInput.value.trim().toUpperCase();
    const tenKhoa = departmentNameInput.value.trim();

    if (!/^[A-Z0-9_-]{2,10}$/.test(maKhoa)) {
        departmentFormError.textContent =
            "Mã khoa phải có 2–10 ký tự chữ, số, gạch ngang hoặc gạch dưới.";
        departmentCodeInput.focus();
        return;
    }

    if (tenKhoa.length < 2 || tenKhoa.length > 100) {
        departmentFormError.textContent =
            "Tên khoa phải có từ 2 đến 100 ký tự.";
        departmentNameInput.focus();
        return;
    }

    const noiDungNutCu = saveDepartmentButton.textContent;
    saveDepartmentButton.disabled = true;
    saveDepartmentButton.textContent = "Đang lưu...";

    try {
        if (cheDoFormKhoa === "sua") {
            await goiApiYeuCau(`/api/admin/departments/${encodeURIComponent(maKhoa)}`, {
                method: "PATCH",
                body: JSON.stringify({ tenkhoa: tenKhoa })
            });
        } else {
            const { db } = await import(
                "/static/js/firebase-config.js"
            );

            const { doc, runTransaction } = await import(
                "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js"
            );

            const thamChieuKhoa = doc(db, "khoa", maKhoa);

            await runTransaction(db, async function (transaction) {
                const taiLieuKhoa = await transaction.get(thamChieuKhoa);

                if (taiLieuKhoa.exists()) {
                    const loiTrungMa = new Error(`Mã khoa ${maKhoa} đã tồn tại.`);
                    loiTrungMa.code = "department/already-exists";
                    throw loiTrungMa;
                }

                transaction.set(thamChieuKhoa, {
                    tenkhoa: tenKhoa
                });
            });
        }

        _cachecacLuaChonKhoa = null;
        _promiseTaiDanhSachKhoa = null;

        await Promise.all([
            taiDanhSachKhoaQuanLy(),
            taiDanhSachKhoa()
        ]);

        dongModalThemKhoa();
        hienThiThongBao(
            cheDoFormKhoa === "sua" ? `Đã cập nhật khoa ${maKhoa}.` : `Đã thêm khoa ${maKhoa}.`,
            "success"
        );
    } catch (loi) {
        console.error("Không thể lưu khoa:", loi);

        departmentFormError.textContent =
            loi?.code === "department/already-exists"
                ? loi.message
                : layThongBaoLoiTaiDuLieu(loi);
    } finally {
        saveDepartmentButton.disabled = false;
        saveDepartmentButton.textContent = noiDungNutCu;
    }
});


function capNhatTomTatChinhSach(maxAgeSeconds, historyCount) {
    if (!maxAgeSeconds) {
        passwordPolicySummary.textContent = `Không hết hạn · Password History Value: ${historyCount}`;
        return;
    }
    const hours = Math.floor(maxAgeSeconds / 3600);
    const minutes = Math.floor((maxAgeSeconds % 3600) / 60);
    const seconds = maxAgeSeconds % 60;
    passwordPolicySummary.textContent = `${hours} giờ ${minutes} phút ${seconds} giây · Password History Value: ${historyCount}`;
}


async function taiChinhSachMatKhau() {
    passwordPolicyErrorElement.textContent = "";
    passwordPolicySummary.textContent = "Đang tải...";
    try {
        const data = await goiApiYeuCau("/api/admin/password-policy");
        const total = Number(data.maxAgeSeconds || 0);
        passwordAgeHours.value = Math.floor(total / 3600);
        passwordAgeMinutes.value = Math.floor((total % 3600) / 60);
        passwordAgeSeconds.value = total % 60;
        passwordHistoryCount.value = Number(data.historyCount || 0);
        capNhatTomTatChinhSach(total, Number(data.historyCount || 0));
    } catch (loi) {
        passwordPolicyErrorElement.textContent = loi.message;
        passwordPolicySummary.textContent = "Không tải được";
    }
}


passwordPolicyForm?.addEventListener("submit", async function (event) {
    event.preventDefault();
    passwordPolicyErrorElement.textContent = "";
    const hours = Number(passwordAgeHours.value || 0);
    const minutes = Number(passwordAgeMinutes.value || 0);
    const seconds = Number(passwordAgeSeconds.value || 0);
    const historyCount = Number(passwordHistoryCount.value || 0);
    if ([hours, minutes, seconds, historyCount].some((value) => !Number.isInteger(value) || value < 0)) {
        passwordPolicyErrorElement.textContent = "Các giá trị phải là số nguyên không âm.";
        return;
    }
    if (minutes > 59 || seconds > 59 || historyCount > 24) {
        passwordPolicyErrorElement.textContent = "Phút và giây tối đa 59; lịch sử tối đa 24.";
        return;
    }
    const maxAgeSeconds = hours * 3600 + minutes * 60 + seconds;
    const oldText = savePasswordPolicyButton.textContent;
    savePasswordPolicyButton.disabled = true;
    savePasswordPolicyButton.textContent = "Đang lưu...";
    try {
        await goiApiYeuCau("/api/admin/password-policy", {
            method: "PUT",
            body: JSON.stringify({ maxAgeSeconds, historyCount })
        });
        capNhatTomTatChinhSach(maxAgeSeconds, historyCount);
        hienThiThongBao("Đã cập nhật chính sách mật khẩu.", "success");
    } catch (loi) {
        passwordPolicyErrorElement.textContent = loi.message;
    } finally {
        savePasswordPolicyButton.disabled = false;
        savePasswordPolicyButton.textContent = oldText;
    }
});


function nhanTrangThaiYeuCau(trangThai) {
    return {
        pending: "Đang chờ",
        approved: "Đã chấp nhận",
        rejected: "Đã từ chối"
    }[trangThai] || trangThai;
}


async function goiApiYeuCau(url, options = {}) {
    const { auth } = await import("/static/js/firebase-config.js");
    if (!auth.currentUser) throw new Error("Phiên đăng nhập không hợp lệ.");
    const token = await auth.currentUser.getIdToken();
    const response = await fetch(url, {
        ...options,
        headers: {
            Authorization: `Bearer ${token}`,
            ...(options.body ? { "Content-Type": "application/json" } : {})
        }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Không thể xử lý yêu cầu.");
    return data;
}


function hienThiYeuCauMoKhoa(danhSach) {
    permissionTableBody.replaceChildren();
    const boLoc = permissionStatusFilter.value;
    const daLoc = danhSach.filter((item) => boLoc === "all" || item.status === boLoc);
    if (!daLoc.length) {
        hienThiTrangThaiBang(permissionTableBody, 6, "Không có yêu cầu phù hợp.");
        return;
    }

    daLoc.forEach((item) => {
        const dong = document.createElement("tr");
        dong.appendChild(taoO(item.email));
        const loiNhan = taoO(item.message);
        loiNhan.className = "permission-message-cell";
        dong.appendChild(loiNhan);
        const doiChieu = document.createElement("td");
        const diem = document.createElement("span");
        const tong = Number(item.validationTotal || 4);
        const soDiem = Number(item.validationScore || 0);
        diem.className = `permission-score ${soDiem === tong ? "complete" : soDiem >= 3 ? "partial" : "low"}`;
        diem.textContent = `${soDiem}/${tong}`;
        const chiTietDoiChieu = document.createElement("div");
        chiTietDoiChieu.className = "permission-score-details";
        (item.validationDetails || []).forEach((detail) => {
            const tieuChi = document.createElement("span");
            tieuChi.className = detail.passed ? "passed" : "failed";
            tieuChi.textContent = `${detail.passed ? "✓" : "✗"} ${detail.label}`;
            chiTietDoiChieu.appendChild(tieuChi);
        });
        doiChieu.append(diem, chiTietDoiChieu);
        dong.appendChild(doiChieu);
        dong.appendChild(taoO(item.createdAtMillis ? new Date(item.createdAtMillis).toLocaleString("vi-VN") : "Vừa gửi"));
        const trangThai = document.createElement("td");
        const nhan = document.createElement("span");
        nhan.className = `permission-status ${item.status}`;
        nhan.textContent = nhanTrangThaiYeuCau(item.status);
        trangThai.appendChild(nhan);
        dong.appendChild(trangThai);

        const thaoTac = document.createElement("td");
        thaoTac.className = "permission-actions";
        if (item.status === "pending") {
            const chapNhan = document.createElement("button");
            chapNhan.type = "button";
            chapNhan.className = "permission-approve";
            chapNhan.textContent = "Chấp nhận";
            chapNhan.addEventListener("click", () => xuLyYeuCauMoKhoa(item, "approved"));
            const tuChoi = document.createElement("button");
            tuChoi.type = "button";
            tuChoi.className = "permission-reject";
            tuChoi.textContent = "Từ chối";
            tuChoi.addEventListener("click", () => xuLyYeuCauMoKhoa(item, "rejected"));
            thaoTac.append(chapNhan, tuChoi);
        } else {
            thaoTac.textContent = "Đã xử lý";
        }
        dong.appendChild(thaoTac);
        permissionTableBody.appendChild(dong);
    });
}


let boNhoYeuCauMoKhoa = [];

async function taiYeuCauMoKhoa() {
    hienThiDangTaiBang(permissionTableBody, 6, "Đang tải yêu cầu mở khóa");
    try {
        const data = await goiApiYeuCau("/api/admin/login-unlock-requests");
        boNhoYeuCauMoKhoa = data.requests || [];
        hienThiYeuCauMoKhoa(boNhoYeuCauMoKhoa);
    } catch (loi) {
        hienThiTrangThaiBang(permissionTableBody, 6, loi.message, "error", taiYeuCauMoKhoa);
    }
}


async function xuLyYeuCauMoKhoa(item, trangThai) {
    const dongY = await xacNhan(
        `${trangThai === "approved" ? "Mở khóa" : "Từ chối mở khóa"} tài khoản ${item.email}?`
    );
    if (!dongY) return;
    try {
        await goiApiYeuCau(`/api/admin/login-unlock-requests/${item.id}`, {
            method: "PATCH",
            body: JSON.stringify({ status: trangThai })
        });
        hienThiThongBao(trangThai === "approved" ? "Đã cho phép mở khóa đăng nhập." : "Đã từ chối mở khóa.", "success");
        await taiYeuCauMoKhoa();
    } catch (loi) {
        hienThiThongBao(loi.message, "error");
    }
}


permissionStatusFilter?.addEventListener("change", () => {
    hienThiYeuCauMoKhoa(boNhoYeuCauMoKhoa);
});


cleanupPermissionRequests?.addEventListener("click", async () => {
    const soYeuCauDaXuLy = boNhoYeuCauMoKhoa.filter((item) => item.status !== "pending").length;
    if (!soYeuCauDaXuLy) {
        hienThiThongBao("Không có yêu cầu đã xử lý để dọn dẹp.", "success");
        return;
    }
    const dongY = await xacNhan(
        `Xóa ${soYeuCauDaXuLy} yêu cầu đã xử lý và các thông báo liên quan? Yêu cầu đang chờ sẽ được giữ lại.`
    );
    if (!dongY) return;

    const noiDungCu = cleanupPermissionRequests.textContent;
    cleanupPermissionRequests.disabled = true;
    cleanupPermissionRequests.textContent = "Đang dọn...";
    try {
        const ketQua = await goiApiYeuCau("/api/admin/login-unlock-requests/processed", {
            method: "DELETE"
        });
        hienThiThongBao(
            `Đã xóa ${ketQua.deletedRequests || 0} yêu cầu và ${ketQua.deletedNotifications || 0} thông báo liên quan.`,
            "success"
        );
        await taiYeuCauMoKhoa();
    } catch (loi) {
        hienThiThongBao(loi.message, "error");
    } finally {
        cleanupPermissionRequests.disabled = false;
        cleanupPermissionRequests.textContent = noiDungCu;
    }
});


function hienThiSection(sectionCanHien, menuCanChon) {
    const cacSection = [
        dashboardSection,
        studentSection,
        teacherSection,
        departmentSection,
        subjectSection,
        courseSection,
        permissionSection,
        passwordPolicySection
    ];

    const cacMenu = [
        overviewMenu,
        studentMenu,
        teacherMenu,
        departmentMenu,
        subjectMenu,
        courseMenu,
        permissionMenu,
        passwordPolicyMenu
    ];

    cacSection.forEach(function (section) {
        section.classList.add("hidden-section");
    });

    cacMenu.forEach(function (menu) {
        menu.classList.remove("active");
    });

    const dangOTrangTongQuan = menuCanChon === overviewMenu;
    statCards.classList.toggle("hidden-section", !dangOTrangTongQuan);

    if (sectionCanHien) {
        sectionCanHien.classList.remove("hidden-section");
    }

    menuCanChon.classList.add("active");
}


const cacTrangAdmin = {
    "": {
        menu: overviewMenu,
        section: dashboardSection,
        taiDuLieu: taiThongKeTongQuan
    },
    "quan-ly-sinh-vien": {
        menu: studentMenu,
        section: studentSection,
        taiDuLieu: taiDanhSachSinhVien
    },
    "quan-ly-giao-vien": {
        menu: teacherMenu,
        section: teacherSection,
        taiDuLieu: taiDanhSachGiaoVien
    },
    "quan-ly-khoa": {
        menu: departmentMenu,
        section: departmentSection,
        taiDuLieu: taiDanhSachKhoaQuanLy
    },
    "quan-ly-mon-hoc": {
        menu: subjectMenu,
        section: subjectSection,
        taiDuLieu: taiDanhSachMonHoc
    },
    "quan-ly-lop-mon": {
        menu: courseMenu,
        section: courseSection,
        taiDuLieu: taiDanhSachLopMon
    },
    "yeu-cau-mo-khoa": {
        menu: permissionMenu,
        section: permissionSection,
        taiDuLieu: taiYeuCauMoKhoa
    },
    "chinh-sach-mat-khau": {
        menu: passwordPolicyMenu,
        section: passwordPolicySection,
        taiDuLieu: taiChinhSachMatKhau
    }
};


function layHashHienTai() {
    return window.location.hash.replace(/^#/, "").trim();
}


function hienThiTrangTheoHash() {
    const hash = layHashHienTai();
    const trang = cacTrangAdmin[hash] || cacTrangAdmin[""];

    hienThiSection(trang.section, trang.menu);
    trang.taiDuLieu();
}


Object.entries(cacTrangAdmin).forEach(function ([hash, trang]) {
    trang.menu.addEventListener("click", function (event) {
        event.preventDefault();

        const hashMoi = hash ? `#${hash}` : "#";

        if (window.location.hash === hashMoi || (!hash && !layHashHienTai())) {
            hienThiTrangTheoHash();
            return;
        }

        window.location.hash = hash;
    });
});


window.addEventListener("hashchange", hienThiTrangTheoHash);





async function taiDanhSachMonHoc() {
    hienThiDangTaiBang(subjectTableBody, 4, "Đang tải danh sách môn học");

    try {
        const ketQua = await voiGioiHanThoiGian(
            (async function () {
                const { db } = await import(
                    "/static/js/firebase-config.js"
                );

                const { collection, getDocs } = await import(
                    "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js"
                );

                return getDocs(collection(db, "monhoc"));
            })(),
            "Quá thời gian tải danh sách môn học."
        );


        const danhSach = ketQua.docs.map(
            function (taiLieu) {
                const duLieu = taiLieu.data();

                return {
                    mamon: taiLieu.id,
                    tenmon: duLieu.tenmon,
                    sotinchi: duLieu.sotinchi
                };
            }
        );


        danhSachMonHocHienTai = danhSach;



        if (danhSach.length === 0) {
            hienThiTrangThaiBang(subjectTableBody, 4, "Chưa có môn học nào.");
            return;
        }

        const cacDong = danhSach.map(function (monHoc) {
            return `
                <tr>
                    <td>${monHoc.mamon}</td>
                    <td>${monHoc.tenmon}</td>
                    <td>${monHoc.sotinchi}</td>
                    <td>
                        <div class="subject-actions">
                            <button
                                type="button"
                                class="subject-edit-button"
                                data-mamon="${monHoc.mamon}"
                            >
                                Sửa
                            </button>

                            <button
                                type="button"
                                class="subject-delete-button"
                                data-mamon="${monHoc.mamon}"
                            >
                                Xóa
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join("");

        subjectTableBody.setAttribute("aria-busy", "false");
        subjectTableBody.innerHTML = cacDong;
    } catch (loi) {
        hienThiTrangThaiBang(
            subjectTableBody,
            4,
            layThongBaoLoiTaiDuLieu(loi),
            "error",
            taiDanhSachMonHoc
        );
    }
}





function moModalThemMonHoc() {
    maMonDangSua = null;

    subjectForm.reset();
    subjectFormError.textContent = "";

    subjectModalTitle.textContent = "Thêm môn học";
    saveSubjectButton.textContent = "Lưu môn học";

    subjectCodeInput.disabled = false;

    subjectModal.classList.remove("hidden");
    subjectCodeInput.focus();
}


function dongModalMonHoc() {
    subjectModal.classList.add("hidden");
    subjectFormError.textContent = "";

    maMonDangSua = null;
    subjectCodeInput.disabled = false;
}




openSubjectModalButton.addEventListener(
    "click",
    moModalThemMonHoc
);


closeSubjectModalButton.addEventListener(
    "click",
    dongModalMonHoc
);


cancelSubjectModalButton.addEventListener(
    "click",
    dongModalMonHoc
);



subjectModal.addEventListener("click", function (event) {
    if (event.target === subjectModal) {
        dongModalMonHoc();
    }
});




document.addEventListener("keydown", function (event) {
    if (
        event.key === "Escape" &&
        !subjectModal.classList.contains("hidden")
    ) {
        dongModalMonHoc();
    }
});





const saveSubjectButton =
    document.getElementById("save-subject-button");



subjectForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    subjectFormError.textContent = "";

    const dangSua = maMonDangSua !== null;


    const maMon = dangSua
        ? maMonDangSua
        : subjectCodeInput.value.trim();

    const duLieu = {
        tenmon: subjectNameInput.value.trim(),
        sotinchi: Number(subjectCreditsInput.value)
    };


    saveSubjectButton.disabled = true;

    saveSubjectButton.textContent = dangSua
        ? "Đang cập nhật..."
        : "Đang lưu...";

    try {
        const { db } = await import(
            "/static/js/firebase-config.js"
        );

        const {
            doc,
            getDoc,
            setDoc,
            updateDoc
        } = await import(
            "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js"
        );  
        
        
        const thamChieuMonHoc = doc(
            db,
            "monhoc",
            maMon
        );


        if (!dangSua) {
            const monHocDaTonTai =
                await getDoc(thamChieuMonHoc);

            if (monHocDaTonTai.exists()) {
                throw new Error(
                    "Mã môn học đã tồn tại."
                );
            }

            await setDoc(
                thamChieuMonHoc,
                duLieu
            );
        }

        else {
            await updateDoc(
                thamChieuMonHoc,
                duLieu
            );
        }

        dongModalMonHoc();

        await taiDanhSachMonHoc();

        hienThiThongBao(
            dangSua ? "Cập nhật môn học thành công." : "Thêm môn học thành công.",
            "success"
        );


    } catch (loi) {
        subjectFormError.textContent = loi.message;
    } finally {
        saveSubjectButton.disabled = false;

        saveSubjectButton.textContent = dangSua
            ? "Lưu thay đổi"
            : "Lưu môn học";
    }
});



let danhSachMonHocHienTai = [];
let maMonDangSua = null;





function moModalSuaMonHoc(mamon) {
    const monHoc = danhSachMonHocHienTai.find(
        function (mon) {
            return mon.mamon === mamon;
        }
    );

    if (!monHoc) {
        hienThiThongBao("Không tìm thấy thông tin môn học.", "error");
        return;
    }

    maMonDangSua = mamon;

    subjectFormError.textContent = "";

    subjectModalTitle.textContent = "Sửa môn học";
    saveSubjectButton.textContent = "Lưu thay đổi";

    subjectCodeInput.value = monHoc.mamon;
    subjectNameInput.value = monHoc.tenmon;
    subjectCreditsInput.value = monHoc.sotinchi;

    subjectCodeInput.disabled = true;

    subjectModal.classList.remove("hidden");
    subjectNameInput.focus();
}






subjectTableBody.addEventListener(
    "click",
    async function (event) {
        const editButton = event.target.closest(
            ".subject-edit-button"
        );

        if (editButton) {
            const mamon = editButton.dataset.mamon;

            moModalSuaMonHoc(mamon);
            return;
        }

        const deleteButton = event.target.closest(
            ".subject-delete-button"
        );

        if (!deleteButton) {
            return;
        }

        const mamon = deleteButton.dataset.mamon;

        if (!mamon || mamon === "undefined") {
            hienThiThongBao("Không lấy được mã môn học.", "error");
            return;
        }

        const monHoc = danhSachMonHocHienTai.find(
            function (mon) {
                return mon.mamon === mamon;
            }
        );

        const tenMon = monHoc
            ? monHoc.tenmon
            : mamon;

        const dongYXoa = await xacNhan(
            `Bạn có chắc muốn xóa môn "${tenMon}" không?`
        );

        if (!dongYXoa) {
            return;
        }

        deleteButton.disabled = true;
        deleteButton.textContent = "Đang xóa...";

        try {
            const { db } = await import(
                "/static/js/firebase-config.js"
            );

            const {
                doc,
                deleteDoc
            } = await import(
                "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js"
            );

            const thamChieuMonHoc = doc(
                db,
                "monhoc",
                mamon
            );

            await deleteDoc(thamChieuMonHoc);

            await taiDanhSachMonHoc();

            hienThiThongBao("Xóa môn học thành công.", "success");


        } catch (loi) {
            hienThiThongBao(loi.message, "error");

            deleteButton.disabled = false;
            deleteButton.textContent = "Xóa";
        }
    }
);








taiDanhSachKhoa();
hienThiTrangTheoHash();
