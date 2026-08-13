let maSinhVienDangNhap = null;
let trangSinhVienDaKhoiTao = false;
let danhSachLopMonCoTheDangKy = [];
let danhSachMonDaDangKy = [];

const boNhoMonHoc = new Map();
const boNhoGiaoVien = new Map();


// =========================
// PHẦN TỬ GIAO DIỆN
// =========================

const availableMenu =
    document.getElementById(
        "available-menu"
    );

const registeredMenu =
    document.getElementById(
        "registered-menu"
    );

const availableSection =
    document.getElementById(
        "available-section"
    );

const registeredSection =
    document.getElementById(
        "registered-section"
    );

const availableCourseBody =
    document.getElementById(
        "available-course-body"
    );

const registeredCourseBody =
    document.getElementById(
        "registered-course-body"
    );

const availableCourseSearch = document.getElementById("available-course-search");
const availableSemesterFilter = document.getElementById("available-semester-filter");
const availableCourseSort = document.getElementById("available-course-sort");
const availableResultCount = document.getElementById("available-result-count");
const studentLastSync = document.getElementById("student-last-sync");
const studentRefreshCourses = document.getElementById("student-refresh-courses");
const exportRegisteredCourses = document.getElementById("export-registered-courses");
const scheduleMenu = document.getElementById("schedule-menu");
const scheduleSection = document.getElementById("schedule-section");
const studentCalendar = document.getElementById("student-calendar");
const calendarWeekLabel = document.getElementById("calendar-week-label");
const calendarNoteForm = document.getElementById("calendar-note-form");
const studentConflictPanel = document.getElementById("student-conflict-panel");
const studentConflictList = document.getElementById("student-conflict-list");
let ngayDauTuanLich = layThuHaiCuaTuan(new Date());
let cacCapXungDotLich = [];
let cacMaLopBiXungDot = new Set();


// =========================
// HÀM DÙNG CHUNG
// =========================

function chuyenThanhVanBanAnToan(giaTri) {
    const phanTuTam =
        document.createElement("div");

    phanTuTam.textContent =
        String(giaTri ?? "");

    return phanTuTam.innerHTML;
}


function chuyenThanhSoAnToan(giaTri) {
    const so = Number(giaTri);

    if (!Number.isFinite(so)) {
        return 0;
    }

    return so;
}


function laTrangThaiMo(trangThai) {
    const giaTri = String(
        trangThai || ""
    )
        .trim()
        .toUpperCase();

    return (
        giaTri === "MỞ" ||
        giaTri === "MO"
    );
}


function chuyenThanhDate(giaTri) {
    if (!giaTri) {
        return null;
    }

    if (giaTri instanceof Date) {
        return Number.isNaN(
            giaTri.getTime()
        )
            ? null
            : giaTri;
    }

    if (
        typeof giaTri.toDate ===
        "function"
    ) {
        const ngay =
            giaTri.toDate();

        return Number.isNaN(
            ngay.getTime()
        )
            ? null
            : ngay;
    }

    const ngay =
        new Date(giaTri);

    if (
        Number.isNaN(
            ngay.getTime()
        )
    ) {
        return null;
    }

    return ngay;
}


function dinhDangNgay(ngay) {
    const ngayHopLe =
        chuyenThanhDate(ngay);

    if (!ngayHopLe) {
        return "";
    }

    return ngayHopLe.toLocaleDateString(
        "vi-VN",
        {
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        }
    );
}


function dinhDangNgayGio(ngay) {
    const ngayHopLe =
        chuyenThanhDate(ngay);

    if (!ngayHopLe) {
        return "";
    }

    return ngayHopLe.toLocaleString(
        "vi-VN",
        {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false
        }
    );
}


function kiemTraSinhVienDaSanSang() {
    if (!maSinhVienDangNhap) {
        throw new Error(
            "Thông tin sinh viên chưa sẵn sàng. Vui lòng thử lại."
        );
    }
}


async function layThongTinMonHoc(
    db,
    doc,
    getDoc,
    maMon
) {
    const maMonDaChuanHoa =
        String(
            maMon || ""
        ).trim();

    if (!maMonDaChuanHoa) {
        return {};
    }

    if (
        boNhoMonHoc.has(
            maMonDaChuanHoa
        )
    ) {
        return boNhoMonHoc.get(
            maMonDaChuanHoa
        );
    }

    const taiLieuMonHoc =
        await getDoc(
            doc(
                db,
                "monhoc",
                maMonDaChuanHoa
            )
        );

    const monHoc =
        taiLieuMonHoc.exists()
            ? taiLieuMonHoc.data()
            : {};

    boNhoMonHoc.set(
        maMonDaChuanHoa,
        monHoc
    );

    return monHoc;
}


async function layThongTinGiaoVien(
    db,
    doc,
    getDoc,
    maGiaoVien
) {
    const maGiaoVienDaChuanHoa =
        String(
            maGiaoVien || ""
        ).trim();

    if (!maGiaoVienDaChuanHoa) {
        return {};
    }

    if (
        boNhoGiaoVien.has(
            maGiaoVienDaChuanHoa
        )
    ) {
        return boNhoGiaoVien.get(
            maGiaoVienDaChuanHoa
        );
    }

    const taiLieuGiaoVien =
        await getDoc(
            doc(
                db,
                "giaovien",
                maGiaoVienDaChuanHoa
            )
        );

    const giaoVien =
        taiLieuGiaoVien.exists()
            ? taiLieuGiaoVien.data()
            : {};

    boNhoGiaoVien.set(
        maGiaoVienDaChuanHoa,
        giaoVien
    );

    return giaoVien;
}


// =========================
// ĐIỀU HƯỚNG
// =========================

function hienThiKhuVuc(
    sectionCanHien,
    menuDangChon
) {
    if (!sectionCanHien || !menuDangChon) return;
    availableSection.classList.add(
        "hidden-section"
    );

    registeredSection.classList.add(
        "hidden-section"
    );

    scheduleSection?.classList.add("hidden-section");

    availableMenu.classList.remove(
        "active"
    );

    registeredMenu.classList.remove(
        "active"
    );

    scheduleMenu?.classList.remove("active");

    sectionCanHien.classList.remove(
        "hidden-section"
    );

    menuDangChon.classList.add(
        "active"
    );
}


function xuLyDieuHuongTuHash() {
    if (!trangSinhVienDaKhoiTao) {
        return;
    }

    if (window.location.hash === "#lich-hoc") {
        hienThiKhuVuc(scheduleSection, scheduleMenu);
        taiMonDaDangKy().then(veLichHoc);
        return;
    }

    if (
        window.location.hash ===
        "#mon-da-dang-ky"
    ) {
        hienThiKhuVuc(
            registeredSection,
            registeredMenu
        );

        taiMonDaDangKy();

        return;
    }

    hienThiKhuVuc(
        availableSection,
        availableMenu
    );

    taiLopMonCoTheDangKy();
}


// =========================
// HIỂN THỊ LỚP CÓ THỂ ĐĂNG KÝ
// =========================

function chuanHoaTimKiem(giaTri) {
    return String(giaTri || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/Đ/g, "D")
        .toLowerCase();
}


function haiLichHocTrungNhau(lopA, lopB) {
    const thuA = chuyenThanhSoAnToan(lopA?.thu);
    const thuB = chuyenThanhSoAnToan(lopB?.thu);
    const batDauA = String(lopA?.giobatdau || "");
    const ketThucA = String(lopA?.gioketthuc || "");
    const batDauB = String(lopB?.giobatdau || "");
    const ketThucB = String(lopB?.gioketthuc || "");

    if (!thuA || !thuB || !batDauA || !ketThucA || !batDauB || !ketThucB) return false;
    if (thuA !== thuB) return false;
    if (Number(lopA.hocky) !== Number(lopB.hocky) || Number(lopA.namhoc) !== Number(lopB.namhoc)) return false;
    const dauNgayA = String(lopA?.ngaybatdauhoc || "");
    const cuoiNgayA = String(lopA?.ngayketthuchoc || "");
    const dauNgayB = String(lopB?.ngaybatdauhoc || "");
    const cuoiNgayB = String(lopB?.ngayketthuchoc || "");
    const trungKhoangNgay = !dauNgayA || !cuoiNgayA || !dauNgayB || !cuoiNgayB
        || (dauNgayA <= cuoiNgayB && cuoiNgayA >= dauNgayB);
    return trungKhoangNgay && batDauA < ketThucB && ketThucA > batDauB;
}


function tenThu(thu) {
    return Number(thu) === 8 ? "Chủ nhật" : `Thứ ${thu}`;
}


function timCacCapXungDot(danhSach) {
    const ketQua = [];
    for (let i = 0; i < danhSach.length; i += 1) {
        for (let j = i + 1; j < danhSach.length; j += 1) {
            if (haiLichHocTrungNhau(danhSach[i], danhSach[j])) {
                ketQua.push([danhSach[i], danhSach[j]]);
            }
        }
    }
    return ketQua;
}


function capNhatBangXungDotLich() {
    cacCapXungDotLich = timCacCapXungDot(danhSachMonDaDangKy);
    cacMaLopBiXungDot = new Set(cacCapXungDotLich.flatMap((cap) => cap.map((lop) => lop.malopmon)));
    if (!studentConflictPanel || !studentConflictList) return;
    studentConflictPanel.classList.toggle("hidden-section", cacCapXungDotLich.length === 0);
    studentConflictList.innerHTML = cacCapXungDotLich.map(([lopA, lopB]) => `
        <article class="student-conflict-item">
            <div>
                <strong>${chuyenThanhVanBanAnToan(lopA.tenmon)} trùng ${chuyenThanhVanBanAnToan(lopB.tenmon)}</strong>
                <p>${tenThu(lopA.thu)}, ${chuyenThanhVanBanAnToan(lopA.giobatdau)}–${chuyenThanhVanBanAnToan(lopA.gioketthuc)}</p>
            </div>
            <div class="student-conflict-actions">
                <button type="button" data-keep-course="${chuyenThanhVanBanAnToan(lopA.malopmon)}" data-drop-course="${chuyenThanhVanBanAnToan(lopB.malopmon)}">Giữ ${chuyenThanhVanBanAnToan(lopA.malopmon)}</button>
                <button type="button" data-keep-course="${chuyenThanhVanBanAnToan(lopB.malopmon)}" data-drop-course="${chuyenThanhVanBanAnToan(lopA.malopmon)}">Giữ ${chuyenThanhVanBanAnToan(lopB.malopmon)}</button>
            </div>
        </article>
    `).join("");
}


function soNgayConLai(giaTri) {
    const ngay = chuyenThanhDate(giaTri);
    if (!ngay) return Number.POSITIVE_INFINITY;
    return Math.ceil((ngay.getTime() - Date.now()) / 86400000);
}


function capNhatThongKeSinhVien() {
    const tongTinChi = danhSachMonDaDangKy.reduce(
        (tong, lopMon) => tong + chuyenThanhSoAnToan(lopMon.sotinchi),
        0
    );
    const sapHetHan = danhSachLopMonCoTheDangKy.filter((lopMon) => {
        const soNgay = soNgayConLai(lopMon.ngayketthucdk);
        return soNgay >= 0 && soNgay <= 3;
    }).length;
    const thongKe = {
        "student-open-class-count": danhSachLopMonCoTheDangKy.length,
        "student-registered-count": danhSachMonDaDangKy.length,
        "student-credit-count": tongTinChi,
        "student-deadline-count": sapHetHan
    };

    Object.entries(thongKe).forEach(([id, giaTri]) => {
        const phanTu = document.getElementById(id);
        if (phanTu) phanTu.textContent = giaTri;
    });
}


function xuatDanhSachMonDaDangKy() {
    if (!danhSachMonDaDangKy.length) {
        alert("Bạn chưa có môn học nào để xuất.");
        return;
    }
    const baoVeCsv = (giaTri) => `"${String(giaTri ?? "").replace(/"/g, '""')}"`;
    const cacDong = [
        ["Mã lớp", "Mã môn", "Tên môn", "Số tín chỉ", "Giảng viên", "Học kỳ", "Năm học", "Lịch học", "Ngày đăng ký", "Trạng thái"],
        ...danhSachMonDaDangKy.map((lopMon) => [
            lopMon.malopmon, lopMon.mamon, lopMon.tenmon, lopMon.sotinchi,
            lopMon.tengiaovien, lopMon.hocky, `${lopMon.namhoc}-${Number(lopMon.namhoc) + 1}`,
            lopMon.thu ? `${tenThu(lopMon.thu)} ${lopMon.giobatdau}-${lopMon.gioketthuc} (${lopMon.ngaybatdauhoc || "?"} đến ${lopMon.ngayketthuchoc || "?"})` : "Chưa xếp lịch",
            dinhDangNgayGio(lopMon.ngaydangky), lopMon.trangthai
        ])
    ];
    const noiDung = "\uFEFF" + cacDong.map((dong) => dong.map(baoVeCsv).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([noiDung], { type: "text/csv;charset=utf-8" }));
    const lienKet = document.createElement("a");
    lienKet.href = url;
    lienKet.download = `mon-da-dang-ky-${maSinhVienDangNhap}.csv`;
    lienKet.click();
    URL.revokeObjectURL(url);
}


function dienBoLocHocKy(danhSach) {
    if (!availableSemesterFilter) return;

    const giaTriCu = availableSemesterFilter.value;
    const cacHocKy = [...new Set(
        danhSach
            .map((lopMon) => chuyenThanhSoAnToan(lopMon.hocky))
            .filter((hocKy) => hocKy > 0)
    )].sort((a, b) => a - b);
    availableSemesterFilter.innerHTML = '<option value="">Tất cả học kỳ</option>' + cacHocKy.map((hocKy) => (
        `<option value="${hocKy}">Học kỳ ${hocKy}</option>`
    )).join("");
    availableSemesterFilter.value = cacHocKy.map(String).includes(String(giaTriCu))
        ? String(giaTriCu)
        : "";
}


function locVaSapXepLopMon() {
    const tuKhoa = chuanHoaTimKiem(availableCourseSearch?.value || "");
    const hocKy = availableSemesterFilter?.value || "";
    const kieuSapXep = availableCourseSort?.value || "code";
    const ketQua = danhSachLopMonCoTheDangKy.filter((lopMon) => {
        const noiDung = chuanHoaTimKiem(`${lopMon.malopmon} ${lopMon.mamon} ${lopMon.tenmon} ${lopMon.magv} ${lopMon.tengiaovien}`);
        return (!tuKhoa || noiDung.includes(tuKhoa))
            && (!hocKy || chuyenThanhSoAnToan(lopMon.hocky) === Number(hocKy));
    });
    ketQua.sort((a, b) => {
        if (kieuSapXep === "deadline") return (chuyenThanhDate(a.ngayketthucdk)?.getTime() || Infinity) - (chuyenThanhDate(b.ngayketthucdk)?.getTime() || Infinity);
        if (kieuSapXep === "seats") return (b.sisotoida - b.sisodadangky) - (a.sisotoida - a.sisodadangky);
        if (kieuSapXep === "credits") return b.sotinchi - a.sotinchi;
        return String(a.malopmon).localeCompare(String(b.malopmon), "vi", { numeric: true });
    });
    if (availableResultCount) {
        availableResultCount.textContent = `Hiển thị ${ketQua.length}/${danhSachLopMonCoTheDangKy.length} lớp môn`;
    }
    hienThiLopMonCoTheDangKy(ketQua);
}

function hienThiLopMonCoTheDangKy(
    danhSach
) {
    if (
        !Array.isArray(danhSach) ||
        danhSach.length === 0
    ) {
        availableCourseBody.innerHTML = `
            <tr>
                <td
                    colspan="8"
                    class="table-message"
                >
                    Hiện không có lớp môn nào có thể đăng ký.
                </td>
            </tr>
        `;

        return;
    }

    const cacDong =
        danhSach.map(
            function (lopMon) {
                const siSoHienTai = chuyenThanhSoAnToan(lopMon.sisodadangky);
                const siSoToiDa = chuyenThanhSoAnToan(lopMon.sisotoida);
                const phanTramDay = siSoToiDa > 0
                    ? Math.min(100, Math.round(siSoHienTai / siSoToiDa * 100))
                    : 0;
                const conLai = Math.max(0, siSoToiDa - siSoHienTai);
                const ngayConLai = soNgayConLai(lopMon.ngayketthucdk);
                const nhanHan = ngayConLai <= 0
                    ? "Hôm nay"
                    : ngayConLai <= 3
                        ? `Còn ${ngayConLai} ngày`
                        : "Đang nhận đăng ký";
                const lopNhanHan = ngayConLai <= 3 ? "urgent" : "normal";

                return `
                    <tr>
                        <td>
                            ${chuyenThanhVanBanAnToan(
                                lopMon.malopmon
                            )}
                        </td>

                        <td>
                            <strong>
                                ${chuyenThanhVanBanAnToan(
                                    lopMon.tenmon
                                )}
                            </strong>

                            <br>

                            <small>
                                ${chuyenThanhVanBanAnToan(
                                    lopMon.mamon
                                )}
                            </small>
                        </td>

                        <td>
                            ${chuyenThanhSoAnToan(
                                lopMon.sotinchi
                            )}
                        </td>

                        <td>
                            <strong>
                                ${chuyenThanhVanBanAnToan(
                                    lopMon.tengiaovien
                                )}
                            </strong>

                            <br>

                            <small>
                                ${chuyenThanhVanBanAnToan(
                                    lopMon.magv
                                )}
                            </small>
                        </td>

                        <td class="schedule-inline">
                            ${lopMon.thu ? (lopMon.thu === 8 ? "Chủ nhật" : `Thứ ${lopMon.thu}`) : "Chưa xếp"}<br>
                            <small>${lopMon.giobatdau && lopMon.gioketthuc ? `${lopMon.giobatdau} – ${lopMon.gioketthuc}` : "—"}</small><br>
                            <small>${lopMon.ngaybatdauhoc && lopMon.ngayketthuchoc ? `${lopMon.ngaybatdauhoc} → ${lopMon.ngayketthuchoc}` : "Chưa có thời hạn"}</small>
                        </td>

                        <td>
                            <div class="capacity-cell"><span>${siSoHienTai}/${siSoToiDa}</span><small>Còn ${conLai} chỗ</small>
                                <i><b style="width:${phanTramDay}%"></b></i></div>
                        </td>

                        <td>
                            <span class="deadline-badge ${lopNhanHan}">${chuyenThanhVanBanAnToan(nhanHan)}</span>
                            <small class="deadline-date">${chuyenThanhVanBanAnToan(
                                dinhDangNgayGio(
                                    lopMon.ngayketthucdk
                                )
                            )}</small>
                        </td>

                        <td>
                            <button
                                type="button"
                                class="register-course-button"
                            >
                                Đăng ký
                            </button>
                        </td>
                    </tr>
                `;
            }
        ).join("");

    availableCourseBody.innerHTML =
        cacDong;

    const cacNutDangKy =
        availableCourseBody.querySelectorAll(
            ".register-course-button"
        );

    cacNutDangKy.forEach(
        function (nut, viTri) {
            nut.dataset.malopmon =
                danhSach[viTri].malopmon;
        }
    );
}


// =========================
// TẢI LỚP CÓ THỂ ĐĂNG KÝ
// =========================

async function taiLopMonCoTheDangKy() {
    availableCourseBody.innerHTML = `
        <tr>
            <td
                colspan="8"
                class="table-message"
            >
                Đang tải danh sách...
            </td>
        </tr>
    `;

    try {
        kiemTraSinhVienDaSanSang();

        const { db } = await import(
            "/static/js/firebase-config.js"
        );

        const {
            doc,
            getDoc,
            collection,
            getDocs,
            query,
            where
        } = await import(
            "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js"
        );

        const [
            ketQuaLopMon,
            ketQuaDangKy
        ] = await Promise.all([
            getDocs(
                collection(
                    db,
                    "lopmon"
                )
            ),

            getDocs(
                query(
                    collection(
                        db,
                        "dangky"
                    ),

                    where(
                        "masv",
                        "==",
                        maSinhVienDangNhap
                    )
                )
            )
        ]);

        const cacMaLopDaDangKy =
            new Set(
                ketQuaDangKy.docs.map(
                    function (taiLieu) {
                        return String(
                            taiLieu
                                .data()
                                .malopmon || ""
                        ).trim();
                    }
                )
            );

        const bayGio =
            new Date();

        const danhSachCanHien =
            ketQuaLopMon.docs
                .map(
                    function (taiLieu) {
                        return {
                            malopmon:
                                taiLieu.id,

                            ...taiLieu.data()
                        };
                    }
                )
                .filter(
                    function (lopMon) {
                        if (
                            !laTrangThaiMo(
                                lopMon.trangthai
                            )
                        ) {
                            return false;
                        }

                        if (
                            cacMaLopDaDangKy.has(
                                lopMon.malopmon
                            )
                        ) {
                            return false;
                        }

                        const ngayBatDau =
                            chuyenThanhDate(
                                lopMon.ngaybatdaudk
                            );

                        const ngayKetThuc =
                            chuyenThanhDate(
                                lopMon.ngayketthucdk
                            );

                        if (
                            !ngayBatDau ||
                            !ngayKetThuc
                        ) {
                            return false;
                        }

                        if (
                            bayGio < ngayBatDau ||
                            bayGio > ngayKetThuc
                        ) {
                            return false;
                        }

                        const siSoHienTai =
                            chuyenThanhSoAnToan(
                                lopMon.sisodadangky
                            );

                        const siSoToiDa =
                            chuyenThanhSoAnToan(
                                lopMon.sisotoida
                            );

                        return (
                            siSoToiDa > 0 &&
                            siSoHienTai <
                                siSoToiDa
                        );
                    }
                );

        const danhSachHoanChinh =
            await Promise.all(
                danhSachCanHien.map(
                    async function (
                        lopMon
                    ) {
                        const [
                            monHoc,
                            giaoVien
                        ] = await Promise.all([
                            layThongTinMonHoc(
                                db,
                                doc,
                                getDoc,
                                lopMon.mamon
                            ),

                            layThongTinGiaoVien(
                                db,
                                doc,
                                getDoc,
                                lopMon.magv
                            )
                        ]);

                        return {
                            malopmon:
                                lopMon.malopmon,

                            mamon:
                                String(
                                    lopMon.mamon || ""
                                ).trim(),

                            tenmon:
                                String(
                                    monHoc.tenmon ||
                                    lopMon.mamon ||
                                    ""
                                ).trim(),

                            sotinchi:
                                chuyenThanhSoAnToan(
                                    monHoc.sotinchi
                                ),

                            makhoa: String(monHoc.makhoa || monHoc.nganh || "").trim(),

                            magv:
                                String(
                                    lopMon.magv || ""
                                ).trim(),

                            tengiaovien:
                                String(
                                    giaoVien.hoten ||
                                    lopMon.magv ||
                                    ""
                                ).trim(),

                            hocky:
                                chuyenThanhSoAnToan(
                                    lopMon.hocky
                                ),

                            namhoc:
                                chuyenThanhSoAnToan(
                                    lopMon.namhoc
                                ),

                            sisodadangky:
                                chuyenThanhSoAnToan(
                                    lopMon.sisodadangky
                                ),

                            sisotoida:
                                chuyenThanhSoAnToan(
                                    lopMon.sisotoida
                                ),

                            ngayketthucdk:
                                lopMon.ngayketthucdk,

                            thu: chuyenThanhSoAnToan(lopMon.thu),
                            giobatdau: String(lopMon.giobatdau || "").trim(),
                            gioketthuc: String(lopMon.gioketthuc || "").trim(),
                            ngaybatdauhoc: String(lopMon.ngaybatdauhoc || "").trim(),
                            ngayketthuchoc: String(lopMon.ngayketthuchoc || "").trim()
                        };
                    }
                )
            );

        danhSachHoanChinh.sort(
            function (lopA, lopB) {
                return String(
                    lopA.malopmon
                ).localeCompare(
                    String(
                        lopB.malopmon
                    ),
                    "vi",
                    {
                        numeric: true
                    }
                );
            }
        );

        danhSachLopMonCoTheDangKy = danhSachHoanChinh;
        dienBoLocHocKy(danhSachHoanChinh);
        locVaSapXepLopMon();
        capNhatThongKeSinhVien();
        if (studentLastSync) {
            studentLastSync.textContent = `Cập nhật lúc ${new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}`;
        }

    } catch (loi) {
        console.error(
            "Lỗi tải lớp môn:",
            loi
        );

        availableCourseBody.innerHTML = `
            <tr>
                <td
                    colspan="8"
                    class="table-message"
                >
                    ${chuyenThanhVanBanAnToan(
                        loi.message ||
                        "Không thể tải danh sách lớp môn."
                    )}
                </td>
            </tr>
        `;
    }
}


// =========================
// ĐĂNG KÝ LỚP MÔN
// =========================

async function dangKyLopMon(
    maLopMon,
    nutDangKy
) {
    maLopMon = String(
        maLopMon || ""
    ).trim();

    if (!maLopMon) {
        alert(
            "Không lấy được mã lớp môn."
        );

        return;
    }

    const noiDungNutCu =
        nutDangKy.textContent;

    nutDangKy.disabled = true;

    nutDangKy.textContent =
        "Đang đăng ký...";

    try {
        kiemTraSinhVienDaSanSang();

        const { db } = await import(
            "/static/js/firebase-config.js"
        );

        const {
            doc,
            getDoc,
            collection,
            getDocs,
            query,
            where,
            runTransaction,
            serverTimestamp
        } = await import(
            "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js"
        );

        const maDangKy =
            `${maSinhVienDangNhap}_${maLopMon}`;

        const thamChieuLopMon =
            doc(
                db,
                "lopmon",
                maLopMon
            );

        const thamChieuDangKy =
            doc(
                db,
                "dangky",
                maDangKy
            );

        const taiLieuLopSapDangKy = await getDoc(thamChieuLopMon);
        if (!taiLieuLopSapDangKy.exists()) {
            throw new Error("Lớp môn không tồn tại.");
        }

        const lopSapDangKy = { malopmon: maLopMon, ...taiLieuLopSapDangKy.data() };
        const ketQuaDangKyHienTai = await getDocs(query(
            collection(db, "dangky"),
            where("masv", "==", maSinhVienDangNhap)
        ));
        const cacLopDaDangKy = await Promise.all(ketQuaDangKyHienTai.docs.map(async (taiLieu) => {
            const maLopDaDangKy = String(taiLieu.data().malopmon || "").trim();
            if (!maLopDaDangKy || maLopDaDangKy === maLopMon) return null;
            const taiLieuLop = await getDoc(doc(db, "lopmon", maLopDaDangKy));
            return taiLieuLop.exists() ? { malopmon: maLopDaDangKy, ...taiLieuLop.data() } : null;
        }));
        const lopBiTrung = cacLopDaDangKy.find((lop) => lop && haiLichHocTrungNhau(lopSapDangKy, lop));

        if (lopBiTrung) {
            throw new Error(
                `Trùng lịch với lớp ${lopBiTrung.malopmon}: ${tenThu(lopSapDangKy.thu)}, ` +
                `${lopSapDangKy.giobatdau}–${lopSapDangKy.gioketthuc}.`
            );
        }

        await runTransaction(
            db,
            async function (
                giaoDich
            ) {
                const [
                    taiLieuLopMon,
                    taiLieuDangKy
                ] = await Promise.all([
                    giaoDich.get(
                        thamChieuLopMon
                    ),

                    giaoDich.get(
                        thamChieuDangKy
                    )
                ]);

                if (
                    !taiLieuLopMon.exists()
                ) {
                    throw new Error(
                        "Lớp môn không tồn tại."
                    );
                }

                if (
                    taiLieuDangKy.exists()
                ) {
                    throw new Error(
                        "Bạn đã đăng ký lớp môn này rồi."
                    );
                }

                const lopMon =
                    taiLieuLopMon.data();

                if (
                    !laTrangThaiMo(
                        lopMon.trangthai
                    )
                ) {
                    throw new Error(
                        "Lớp môn đang đóng đăng ký."
                    );
                }

                const bayGio =
                    new Date();

                const ngayBatDau =
                    chuyenThanhDate(
                        lopMon.ngaybatdaudk
                    );

                const ngayKetThuc =
                    chuyenThanhDate(
                        lopMon.ngayketthucdk
                    );

                if (
                    !ngayBatDau ||
                    !ngayKetThuc
                ) {
                    throw new Error(
                        "Thời gian đăng ký của lớp không hợp lệ."
                    );
                }

                if (
                    bayGio < ngayBatDau ||
                    bayGio > ngayKetThuc
                ) {
                    throw new Error(
                        "Hiện không nằm trong thời gian đăng ký."
                    );
                }

                const siSoHienTai =
                    chuyenThanhSoAnToan(
                        lopMon.sisodadangky
                    );

                const siSoToiDa =
                    chuyenThanhSoAnToan(
                        lopMon.sisotoida
                    );

                if (
                    siSoToiDa <= 0 ||
                    siSoHienTai >=
                        siSoToiDa
                ) {
                    throw new Error(
                        "Lớp môn đã đủ sĩ số."
                    );
                }

                giaoDich.set(
                    thamChieuDangKy,
                    {
                        masv:
                            maSinhVienDangNhap,

                        malopmon:
                            maLopMon,

                        ngaydangky:
                            serverTimestamp(),

                        trangthai:
                            "ĐÃ ĐĂNG KÝ"
                    }
                );

                giaoDich.update(
                    thamChieuLopMon,
                    {
                        sisodadangky:
                            siSoHienTai + 1
                    }
                );
            }
        );

        alert(
            `Đăng ký lớp ${maLopMon} thành công.`
        );

        await taiLopMonCoTheDangKy();

    } catch (loi) {
        console.error(
            "Lỗi đăng ký lớp môn:",
            loi
        );

        alert(
            `Lỗi: ${loi.message}`
        );

        nutDangKy.disabled =
            false;

        nutDangKy.textContent =
            noiDungNutCu;
    }
}


// =========================
// HIỂN THỊ MÔN ĐÃ ĐĂNG KÝ
// =========================

function hienThiMonDaDangKy(
    danhSach
) {
    if (
        !Array.isArray(danhSach) ||
        danhSach.length === 0
    ) {
        registeredCourseBody.innerHTML = `
            <tr>
                <td
                    colspan="9"
                    class="table-message"
                >
                    Bạn chưa đăng ký lớp môn nào.
                </td>
            </tr>
        `;

        return;
    }

    const cacDong =
        danhSach.map(
            function (lopMon) {
                const namKetThuc =
                    chuyenThanhSoAnToan(
                        lopMon.namhoc
                    ) + 1;

                return `
                    <tr>
                        <td>
                            ${chuyenThanhVanBanAnToan(
                                lopMon.malopmon
                            )}
                        </td>

                        <td>
                            <strong>
                                ${chuyenThanhVanBanAnToan(
                                    lopMon.tenmon
                                )}
                            </strong>

                            <br>

                            <small>
                                ${chuyenThanhVanBanAnToan(
                                    lopMon.mamon
                                )}
                            </small>
                        </td>

                        <td>
                            ${chuyenThanhSoAnToan(
                                lopMon.sotinchi
                            )}
                        </td>

                        <td>
                            <strong>
                                ${chuyenThanhVanBanAnToan(
                                    lopMon.tengiaovien
                                )}
                            </strong>

                            <br>

                            <small>
                                ${chuyenThanhVanBanAnToan(
                                    lopMon.magv
                                )}
                            </small>
                        </td>

                        <td>
                            Học kỳ
                            ${chuyenThanhSoAnToan(
                                lopMon.hocky
                            )}

                            <br>

                            <small>
                                ${chuyenThanhSoAnToan(
                                    lopMon.namhoc
                                )}
                                -
                                ${namKetThuc}
                            </small>
                        </td>

                        <td class="schedule-inline">
                            ${lopMon.thu ? (lopMon.thu === 8 ? "Chủ nhật" : `Thứ ${lopMon.thu}`) : "Chưa xếp"}<br>
                            <small>${lopMon.giobatdau && lopMon.gioketthuc ? `${lopMon.giobatdau} – ${lopMon.gioketthuc}` : "—"}</small><br>
                            <small>${lopMon.ngaybatdauhoc && lopMon.ngayketthuchoc ? `${lopMon.ngaybatdauhoc} → ${lopMon.ngayketthuchoc}` : "Chưa có thời hạn"}</small>
                        </td>

                        <td>
                            ${chuyenThanhVanBanAnToan(
                                dinhDangNgay(
                                    lopMon.ngaydangky
                                )
                            )}
                        </td>

                        <td>
                            <span class="registration-status ${String(lopMon.trangthai).includes("XUNG ĐỘT") ? "conflict" : ""}">
                                ${chuyenThanhVanBanAnToan(
                                    lopMon.trangthai
                                )}
                            </span>
                        </td>

                        <td>
                            <button
                                type="button"
                                class="cancel-registration-button"
                            >
                                Hủy đăng ký
                            </button>
                        </td>
                    </tr>
                `;
            }
        ).join("");

    registeredCourseBody.innerHTML =
        cacDong;

    const cacNutHuy =
        registeredCourseBody.querySelectorAll(
            ".cancel-registration-button"
        );

    cacNutHuy.forEach(
        function (nut, viTri) {
            nut.dataset.malopmon =
                danhSach[viTri].malopmon;
        }
    );
}


// =========================
// TẢI MÔN ĐÃ ĐĂNG KÝ
// =========================

async function taiMonDaDangKy() {
    registeredCourseBody.innerHTML = `
        <tr>
            <td
                colspan="9"
                class="table-message"
            >
                Đang tải danh sách...
            </td>
        </tr>
    `;

    try {
        kiemTraSinhVienDaSanSang();

        const { db } = await import(
            "/static/js/firebase-config.js"
        );

        const {
            doc,
            getDoc,
            collection,
            getDocs,
            query,
            where
        } = await import(
            "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js"
        );

        const truyVanDangKy =
            query(
                collection(
                    db,
                    "dangky"
                ),

                where(
                    "masv",
                    "==",
                    maSinhVienDangNhap
                )
            );

        const ketQuaDangKy =
            await getDocs(
                truyVanDangKy
            );

        if (
            ketQuaDangKy.empty
        ) {
            danhSachMonDaDangKy = [];
            capNhatBangXungDotLich();
            hienThiMonDaDangKy(
                []
            );
            capNhatThongKeSinhVien();

            return;
        }

        const danhSach =
            await Promise.all(
                ketQuaDangKy.docs.map(
                    async function (
                        taiLieuDangKy
                    ) {
                        const dangKy =
                            taiLieuDangKy.data();

                        const maLopMon =
                            String(
                                dangKy.malopmon ||
                                ""
                            ).trim();

                        if (!maLopMon) {
                            return null;
                        }

                        const taiLieuLopMon =
                            await getDoc(
                                doc(
                                    db,
                                    "lopmon",
                                    maLopMon
                                )
                            );

                        if (
                            !taiLieuLopMon.exists()
                        ) {
                            return null;
                        }

                        const lopMon =
                            taiLieuLopMon.data();

                        const [
                            monHoc,
                            giaoVien
                        ] = await Promise.all([
                            layThongTinMonHoc(
                                db,
                                doc,
                                getDoc,
                                lopMon.mamon
                            ),

                            layThongTinGiaoVien(
                                db,
                                doc,
                                getDoc,
                                lopMon.magv
                            )
                        ]);

                        return {
                            malopmon:
                                maLopMon,

                            mamon:
                                String(
                                    lopMon.mamon ||
                                    ""
                                ).trim(),

                            tenmon:
                                String(
                                    monHoc.tenmon ||
                                    lopMon.mamon ||
                                    ""
                                ).trim(),

                            sotinchi:
                                chuyenThanhSoAnToan(
                                    monHoc.sotinchi
                                ),

                            magv:
                                String(
                                    lopMon.magv ||
                                    ""
                                ).trim(),

                            tengiaovien:
                                String(
                                    giaoVien.hoten ||
                                    lopMon.magv ||
                                    ""
                                ).trim(),

                            hocky:
                                chuyenThanhSoAnToan(
                                    lopMon.hocky
                                ),

                            namhoc:
                                chuyenThanhSoAnToan(
                                    lopMon.namhoc
                                ),

                            thu: chuyenThanhSoAnToan(lopMon.thu),
                            giobatdau: String(lopMon.giobatdau || "").trim(),
                            gioketthuc: String(lopMon.gioketthuc || "").trim(),
                            ngaybatdauhoc: String(lopMon.ngaybatdauhoc || "").trim(),
                            ngayketthuchoc: String(lopMon.ngayketthuchoc || "").trim(),

                            ngaydangky:
                                dangKy.ngaydangky,

                            trangthai:
                                String(
                                    dangKy.trangthai ||
                                    "ĐÃ ĐĂNG KÝ"
                                ).trim()
                        };
                    }
                )
            );

        const danhSachHopLe =
            danhSach.filter(
                function (lopMon) {
                    return (
                        lopMon !== null
                    );
                }
            );

        danhSachHopLe.sort(
            function (lopA, lopB) {
                return String(
                    lopA.malopmon
                ).localeCompare(
                    String(
                        lopB.malopmon
                    ),
                    "vi",
                    {
                        numeric: true
                    }
                );
            }
        );

        danhSachMonDaDangKy = danhSachHopLe;
        capNhatBangXungDotLich();
        hienThiMonDaDangKy(danhSachHopLe);
        capNhatThongKeSinhVien();

    } catch (loi) {
        console.error(
            "Không thể tải môn đã đăng ký:",
            loi
        );

        registeredCourseBody.innerHTML = `
            <tr>
                <td
                    colspan="9"
                    class="table-message"
                >
                    ${chuyenThanhVanBanAnToan(
                        loi.message ||
                        "Không thể tải môn đã đăng ký."
                    )}
                </td>
            </tr>
        `;
    }
}


// =========================
// HỦY ĐĂNG KÝ
// =========================

async function huyDangKyMon(
    maLopMon,
    nutHuy
) {
    maLopMon = String(
        maLopMon || ""
    ).trim();

    if (!maLopMon) {
        alert(
            "Không lấy được mã lớp môn."
        );

        return;
    }

    const dongY =
        window.confirm(
            `Bạn có chắc muốn hủy đăng ký lớp ${maLopMon} không?`
        );

    if (!dongY) {
        return;
    }

    const noiDungNutCu =
        nutHuy.textContent;

    nutHuy.disabled = true;

    nutHuy.textContent =
        "Đang hủy...";

    try {
        kiemTraSinhVienDaSanSang();

        const { db } = await import(
            "/static/js/firebase-config.js"
        );

        const {
            doc,
            runTransaction
        } = await import(
            "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js"
        );

        const maDangKy =
            `${maSinhVienDangNhap}_${maLopMon}`;

        const thamChieuDangKy =
            doc(
                db,
                "dangky",
                maDangKy
            );

        const thamChieuLopMon =
            doc(
                db,
                "lopmon",
                maLopMon
            );

        await runTransaction(
            db,
            async function (
                giaoDich
            ) {
                const [
                    taiLieuDangKy,
                    taiLieuLopMon
                ] = await Promise.all([
                    giaoDich.get(
                        thamChieuDangKy
                    ),

                    giaoDich.get(
                        thamChieuLopMon
                    )
                ]);

                if (
                    !taiLieuDangKy.exists()
                ) {
                    throw new Error(
                        "Không tìm thấy phiếu đăng ký."
                    );
                }

                if (
                    !taiLieuLopMon.exists()
                ) {
                    throw new Error(
                        "Lớp môn không tồn tại."
                    );
                }

                const phieuDangKy =
                    taiLieuDangKy.data();

                if (
                    String(
                        phieuDangKy.masv ||
                        ""
                    ).trim() !==
                    maSinhVienDangNhap
                ) {
                    throw new Error(
                        "Bạn không có quyền hủy đăng ký này."
                    );
                }

                const lopMon =
                    taiLieuLopMon.data();

                const siSoDaDangKy =
                    chuyenThanhSoAnToan(
                        lopMon.sisodadangky
                    );

                giaoDich.delete(
                    thamChieuDangKy
                );

                giaoDich.update(
                    thamChieuLopMon,
                    {
                        sisodadangky:
                            Math.max(
                                0,
                                siSoDaDangKy - 1
                            )
                    }
                );
            }
        );

        alert(
            "Hủy đăng ký thành công."
        );

        await Promise.all([
            taiMonDaDangKy(),
            taiLopMonCoTheDangKy()
        ]);

    } catch (loi) {
        console.error(
            "Lỗi hủy đăng ký:",
            loi
        );

        alert(
            `Lỗi: ${loi.message}`
        );

        nutHuy.disabled =
            false;

        nutHuy.textContent =
            noiDungNutCu;
    }
}


// =========================
// LỊCH HỌC VÀ GHI CHÚ
// =========================

function layThuHaiCuaTuan(ngay) {
    const ketQua = new Date(ngay);
    ketQua.setHours(0, 0, 0, 0);
    const thu = ketQua.getDay() || 7;
    ketQua.setDate(ketQua.getDate() - thu + 1);
    return ketQua;
}

function khoaNgay(ngay) {
    const nam = ngay.getFullYear();
    const thang = String(ngay.getMonth() + 1).padStart(2, "0");
    const ngayTrongThang = String(ngay.getDate()).padStart(2, "0");
    return `${nam}-${thang}-${ngayTrongThang}`;
}

function khoaLuuGhiChu() {
    return `ql-online-calendar-notes-${maSinhVienDangNhap || "guest"}`;
}

function layGhiChuLich() {
    try {
        const duLieu = JSON.parse(localStorage.getItem(khoaLuuGhiChu()) || "[]");
        if (!Array.isArray(duLieu)) return [];
        const daCo = new Set();
        const khongTrung = duLieu.filter((muc) => {
            const khoa = `${muc.ngay}|${muc.gio || ""}|${String(muc.noidung || "").trim().toLocaleLowerCase("vi")}`;
            if (daCo.has(khoa)) return false;
            daCo.add(khoa);
            return true;
        });
        if (khongTrung.length !== duLieu.length) luuGhiChuLich(khongTrung);
        return khongTrung;
    } catch {
        return [];
    }
}

function luuGhiChuLich(danhSach) {
    localStorage.setItem(khoaLuuGhiChu(), JSON.stringify(danhSach));
}

function veLichHoc() {
    if (!studentCalendar) return;

    const cuoiTuan = new Date(ngayDauTuanLich);
    cuoiTuan.setDate(cuoiTuan.getDate() + 6);
    if (calendarWeekLabel) {
        calendarWeekLabel.textContent = `${ngayDauTuanLich.toLocaleDateString("vi-VN")} – ${cuoiTuan.toLocaleDateString("vi-VN")}`;
    }

    const homNay = khoaNgay(new Date());
    const ghiChu = layGhiChuLich();
    const tenNgay = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"];

    studentCalendar.innerHTML = Array.from({ length: 7 }, (_, viTri) => {
        const ngay = new Date(ngayDauTuanLich);
        ngay.setDate(ngay.getDate() + viTri);
        const khoa = khoaNgay(ngay);
        const thuDuLieu = viTri + 2;
        const lopTrongNgay = danhSachMonDaDangKy
            .filter((lop) => Number(lop.thu) === thuDuLieu
                && Boolean(lop.ngaybatdauhoc)
                && Boolean(lop.ngayketthuchoc)
                && khoa >= lop.ngaybatdauhoc
                && khoa <= lop.ngayketthuchoc)
            .sort((a, b) => String(a.giobatdau).localeCompare(String(b.giobatdau)));
        const ghiChuTrongNgay = ghiChu
            .filter((muc) => muc.ngay === khoa)
            .sort((a, b) => String(a.gio || "").localeCompare(String(b.gio || "")));

        const suKienLop = lopTrongNgay.map((lop) => `
            <article class="calendar-event ${cacMaLopBiXungDot.has(lop.malopmon) ? "conflict" : ""}">
                <strong>${chuyenThanhVanBanAnToan(lop.tenmon)}</strong>
                <span>${chuyenThanhVanBanAnToan(lop.giobatdau)}–${chuyenThanhVanBanAnToan(lop.gioketthuc)}</span><br>
                <small>${chuyenThanhVanBanAnToan(lop.malopmon)} · ${chuyenThanhVanBanAnToan(lop.tengiaovien)}</small>
            </article>
        `).join("");
        const suKienGhiChu = ghiChuTrongNgay.map((muc) => `
            <article class="calendar-event note">
                <strong>${chuyenThanhVanBanAnToan(muc.noidung)}</strong>
                <small>${chuyenThanhVanBanAnToan(muc.gio || "Cả ngày")}</small>
                <button type="button" class="calendar-note-delete" data-note-id="${chuyenThanhVanBanAnToan(muc.id)}" aria-label="Xóa ghi chú">×</button>
            </article>
        `).join("");

        return `
            <div class="calendar-day ${khoa === homNay ? "is-today" : ""}">
                <div class="calendar-day-header"><span>${tenNgay[viTri]}</span><strong>${ngay.getDate()}</strong></div>
                ${suKienLop}${suKienGhiChu || ""}
                ${!suKienLop && !suKienGhiChu ? '<small class="calendar-empty">Không có lịch</small>' : ""}
            </div>
        `;
    }).join("");

    const oNgay = document.getElementById("calendar-note-date");
    if (oNgay && !oNgay.value) oNgay.value = khoaNgay(new Date());
}


async function giaiQuyetXungDotLich(maLopGiu, maLopHuy, nutBam) {
    if (!confirm(`Giữ lớp ${maLopGiu} và hủy đăng ký lớp ${maLopHuy}?`)) return;
    const noiDungCu = nutBam.textContent;
    nutBam.disabled = true;
    nutBam.textContent = "Đang xử lý...";
    try {
        const { auth } = await import("/static/js/firebase-config.js");
        if (!auth.currentUser) throw new Error("Phiên đăng nhập đã hết hạn.");
        const token = await auth.currentUser.getIdToken();
        const phanHoi = await fetch("/api/student/schedule-conflict/resolve", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ keepCourse: maLopGiu, dropCourse: maLopHuy })
        });
        const ketQua = await phanHoi.json().catch(() => ({}));
        if (!phanHoi.ok) throw new Error(ketQua.error || "Không thể xử lý xung đột.");

        await Promise.all([taiMonDaDangKy(), taiLopMonCoTheDangKy()]);
        veLichHoc();
        alert(`Đã giữ lớp ${maLopGiu} và hủy lớp ${maLopHuy}.`);
    } catch (loi) {
        alert(`Không thể xử lý xung đột: ${loi.message}`);
        nutBam.disabled = false;
        nutBam.textContent = noiDungCu;
    }
}


// =========================
// SỰ KIỆN FIREBASE ĐÃ XÁC THỰC
// =========================

window.addEventListener(
    "sinhvien-ready",
    function (suKien) {
        const maSinhVien =
            String(
                suKien.detail?.masv ||
                ""
            ).trim();

        if (!maSinhVien) {
            return;
        }

        maSinhVienDangNhap =
            maSinhVien;

        if (
            trangSinhVienDaKhoiTao
        ) {
            return;
        }

        trangSinhVienDaKhoiTao =
            true;

        if (
            !window.location.hash
        ) {
            window.history.replaceState(
                null,
                "",
                "#dang-ky-mon"
            );
        }

        xuLyDieuHuongTuHash();
        if (window.location.hash === "#mon-da-dang-ky") {
            taiLopMonCoTheDangKy();
        } else if (window.location.hash === "#lich-hoc") {
            taiLopMonCoTheDangKy();
        } else {
            taiMonDaDangKy();
        }
    }
);


// =========================
// SỰ KIỆN GIAO DIỆN
// =========================

availableMenu.addEventListener(
    "click",
    function (suKien) {
        suKien.preventDefault();

        if (
            window.location.hash !==
            "#dang-ky-mon"
        ) {
            window.location.hash =
                "dang-ky-mon";

            return;
        }

        if (
            trangSinhVienDaKhoiTao
        ) {
            hienThiKhuVuc(
                availableSection,
                availableMenu
            );

            taiLopMonCoTheDangKy();
        }
    }
);


registeredMenu.addEventListener(
    "click",
    function (suKien) {
        suKien.preventDefault();

        if (
            window.location.hash !==
            "#mon-da-dang-ky"
        ) {
            window.location.hash =
                "mon-da-dang-ky";

            return;
        }

        if (
            trangSinhVienDaKhoiTao
        ) {
            hienThiKhuVuc(
                registeredSection,
                registeredMenu
            );

            taiMonDaDangKy();
        }
    }
);


window.addEventListener(
    "hashchange",
    xuLyDieuHuongTuHash
);


availableCourseBody.addEventListener(
    "click",
    async function (suKien) {
        const nutDangKy =
            suKien.target.closest(
                ".register-course-button"
            );

        if (!nutDangKy) {
            return;
        }

        await dangKyLopMon(
            nutDangKy.dataset.malopmon,
            nutDangKy
        );
    }
);


registeredCourseBody.addEventListener(
    "click",
    async function (suKien) {
        const nutHuy =
            suKien.target.closest(
                ".cancel-registration-button"
            );

        if (!nutHuy) {
            return;
        }

        await huyDangKyMon(
            nutHuy.dataset.malopmon,
            nutHuy
        );
    }
);

scheduleMenu?.addEventListener("click", function (suKien) {
    suKien.preventDefault();
    if (window.location.hash !== "#lich-hoc") {
        window.location.hash = "lich-hoc";
        return;
    }
    hienThiKhuVuc(scheduleSection, scheduleMenu);
    taiMonDaDangKy().then(veLichHoc);
});


availableCourseSearch?.addEventListener("input", locVaSapXepLopMon);
availableSemesterFilter?.addEventListener("change", locVaSapXepLopMon);
availableCourseSort?.addEventListener("change", locVaSapXepLopMon);

studentRefreshCourses?.addEventListener("click", async function () {
    const noiDungCu = studentRefreshCourses.textContent;
    studentRefreshCourses.disabled = true;
    studentRefreshCourses.textContent = "↻ Đang tải...";
    try {
        await Promise.all([taiLopMonCoTheDangKy(), taiMonDaDangKy()]);
    } finally {
        studentRefreshCourses.disabled = false;
        studentRefreshCourses.textContent = noiDungCu;
    }
});

exportRegisteredCourses?.addEventListener("click", xuatDanhSachMonDaDangKy);

document.getElementById("calendar-prev")?.addEventListener("click", function () {
    ngayDauTuanLich.setDate(ngayDauTuanLich.getDate() - 7);
    veLichHoc();
});
document.getElementById("calendar-next")?.addEventListener("click", function () {
    ngayDauTuanLich.setDate(ngayDauTuanLich.getDate() + 7);
    veLichHoc();
});
document.getElementById("calendar-today")?.addEventListener("click", function () {
    ngayDauTuanLich = layThuHaiCuaTuan(new Date());
    veLichHoc();
});
calendarNoteForm?.addEventListener("submit", function (suKien) {
    suKien.preventDefault();
    const ngay = document.getElementById("calendar-note-date")?.value || "";
    const gio = document.getElementById("calendar-note-time")?.value || "";
    const noidung = document.getElementById("calendar-note-content")?.value.trim() || "";
    if (!ngay || !noidung) return;
    const danhSach = layGhiChuLich();
    const biTrung = danhSach.some((muc) => muc.ngay === ngay
        && String(muc.gio || "") === gio
        && String(muc.noidung || "").trim().toLocaleLowerCase("vi") === noidung.toLocaleLowerCase("vi"));
    if (biTrung) {
        alert("Ghi chú này đã tồn tại trong lịch.");
        return;
    }
    danhSach.push({ id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, ngay, gio, noidung });
    luuGhiChuLich(danhSach);
    window.dispatchEvent(new CustomEvent("calendar-notes-updated"));
    calendarNoteForm.reset();
    const oNgayGhiChu = document.getElementById("calendar-note-date");
    if (oNgayGhiChu) oNgayGhiChu.value = ngay;
    veLichHoc();
});
studentCalendar?.addEventListener("click", function (suKien) {
    const nutXoa = suKien.target.closest(".calendar-note-delete");
    if (!nutXoa) return;
    luuGhiChuLich(layGhiChuLich().filter((muc) => muc.id !== nutXoa.dataset.noteId));
    window.dispatchEvent(new CustomEvent("calendar-notes-updated"));
    veLichHoc();
});

studentConflictList?.addEventListener("click", async function (suKien) {
    const nut = suKien.target.closest("[data-keep-course]");
    if (!nut) return;
    await giaiQuyetXungDotLich(nut.dataset.keepCourse, nut.dataset.dropCourse, nut);
});


// =========================
// TRỢ LÝ HỌC VỤ THÔNG MINH
// =========================

const aiChatToggle = document.getElementById("ai-chat-toggle");
const aiChatbox = document.getElementById("ai-chatbox");
const aiChatMessages = document.getElementById("ai-chat-messages");
const aiChatForm = document.getElementById("ai-chat-form");
const aiChatInput = document.getElementById("ai-chat-input");
let aiDaChao = false;
const aiNguCanh = {
    dangLapThoiKhoaBieu: false,
    yeuCauLapLich: "",
    maMonGanNhat: "",
    maGiaoVienGanNhat: "",
    boLocDoiTuongGanNhat: {
        maMon: "", maGiaoVien: "", hocKy: null, namHoc: null, thu: null, khoangGio: null
    },
    traCuuGanNhat: null,
    yDinhGanNhat: ""
};

function gioiHanViTriTroLy(x, y, rong, cao, vung, rongManHinh, caoManHinh, khoangCach = 12) {
    const traiVung = Number.isFinite(Number(vung?.left)) ? Number(vung.left) : 0;
    const trenVung = Number.isFinite(Number(vung?.top)) ? Number(vung.top) : 0;
    const phaiVung = Number.isFinite(Number(vung?.right)) ? Number(vung.right) : Number(rongManHinh);
    const duoiVung = Number.isFinite(Number(vung?.bottom)) ? Number(vung.bottom) : Number(caoManHinh);
    const traiNhoNhat = Math.max(khoangCach, traiVung + khoangCach);
    const trenNhoNhat = Math.max(khoangCach, trenVung + khoangCach);
    const phaiLonNhat = Math.min(Number(rongManHinh) - khoangCach, phaiVung - khoangCach);
    const duoiLonNhat = Math.min(Number(caoManHinh) - khoangCach, duoiVung - khoangCach);
    const traiLonNhat = Math.max(traiNhoNhat, phaiLonNhat - Number(rong));
    const trenLonNhat = Math.max(trenNhoNhat, duoiLonNhat - Number(cao));
    return {
        x: Math.min(traiLonNhat, Math.max(traiNhoNhat, Number(x) || 0)),
        y: Math.min(trenLonNhat, Math.max(trenNhoNhat, Number(y) || 0))
    };
}

function themTinNhanAI(noiDung, vaiTro = "assistant", laHtml = false) {
    if (!aiChatMessages) return null;
    const tinNhan = document.createElement("div");
    tinNhan.className = `ai-message ${vaiTro}`;
    if (laHtml) tinNhan.innerHTML = noiDung;
    else tinNhan.textContent = noiDung;
    aiChatMessages.appendChild(tinNhan);
    aiChatMessages.scrollTop = aiChatMessages.scrollHeight;
    return tinNhan;
}

function chuanHoaCauHoiAI(giaTri) {
    let cauHoi = chuanHoaTimKiem(giaTri)
        .replace(/[?!.,;]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    const thayThe = [
        [/\b(minh|em|to|tui)\b/g, "toi"],
        [/\bdang ki\b/g, "dang ky"],
        [/\bhoc ki\b/g, "hoc ky"],
        [/\b(tra cuu|kiem|search)\b/g, "tim"],
        [/\b(liet ke|show)\b/g, "xem"],
        [/\b(tkb|lich bieu)\b/g, "thoi khoa bieu"],
        [/\b(hk)\s*([1-3])\b/g, "hoc ky $2"],
        [/\bhoc ky\s*(mot|i)\b/g, "hoc ky 1"],
        [/\bhoc ky\s*(hai|ii)\b/g, "hoc ky 2"],
        [/\bhoc ky\s*(ba|iii)\b/g, "hoc ky 3"],
        [/\b(con slot|con suat|chua day|chua kin)\b/g, "con cho"],
        [/\b(con bao nhieu cho|con may cho|con may slot|full chua|day chua|het cho chua)\b/g, "con cho"],
        [/\b(dung gio|dung lich|trung gio|chong gio|chong lich|va lich)\b/g, "trung lich"],
        [/\b(giang day|phu trach|dung lop|day lop)\b/g, "day"],
        [/\b(bua nay|bay gio)\b/g, "hom nay"],
        [/\b(hom bua nay|ngay hom nay)\b/g, "hom nay"],
        [/\b(bua sau|ngay ke tiep)\b/g, "ngay mai"],
        [/\b(schedule)\b/g, "thoi khoa bieu"],
        [/\b(credit|credits)\b/g, "tin chi"],
        [/\bbao nhieu credit\b/g, "bao nhieu tin chi"],
        [/\bmay\s+(mon|lop)\b/g, "bao nhieu $1"],
        [/\bmay\s+tin chi\b/g, "bao nhieu tin chi"],
        [/\b(co nhiêu|co nhieu|bao nhiêu|bao nhieu)\b/g, "bao nhieu"],
        [/\b(con nhiêu|con nhieu|con may suat|con may slot)\b/g, "con cho"],
        [/\b(han chot|deadline|chot dang ky)\b/g, "han dang ky"],
        [/\b(dang ky noi khong|vao duoc khong|ghi danh duoc khong)\b/g, "dang ky duoc khong"],
        [/\b(lich hoc cua toi ra sao|cho xem lich cua toi|lich toi the nao)\b/g, "xem thoi khoa bieu cua toi"],
        [/\b(ngay mai co tiet gi|bua sau co mon gi)\b/g, "ngay mai toi hoc gi"],
        [/\b(day cai gi|day nhung gi|mo nhung lop nao)\b/g, "day mon nao"],
        [/\b(hoc vao luc nao|hoc vao khi nao|lich ra sao|lich the nao)\b/g, "hoc luc nao"],
        [/\b(ong ay|ba ay|nguoi do|nguoi nay|thay kia|co kia)\b/g, "giao vien do"],
        [/\b(cai do|cai nay|hoc phan do|hoc phan nay|mon kia|lop kia)\b/g, "mon do"],
        [/\b(mot)\s+(mon|lop)\b/g, "1 $2"],
        [/\b(hai)\s+(mon|lop)\b/g, "2 $2"],
        [/\b(ba)\s+(mon|lop)\b/g, "3 $2"],
        [/\b(bon)\s+(mon|lop)\b/g, "4 $2"],
        [/\b(nam)\s+(mon|lop)\b/g, "5 $2"],
    ];
    thayThe.forEach(([mau, giaTriMoi]) => { cauHoi = cauHoi.replace(mau, giaTriMoi); });
    return cauHoi.replace(/\s+/g, " ").trim();
}

function nhanDienYDinhAI(cauHoi) {
    if (/\b(ai day|do ai day|giao vien nao|thay co nao)\b/.test(cauHoi)) return "giao_vien_cua_mon";
    if (/\b(day mon nao|day mon gi|lop cua|mon cua|co lop nao)\b/.test(cauHoi)) return "lop_cua_giao_vien";
    if (/\b(con cho|sap day|het cho)\b/.test(cauHoi)) return "cho_trong";
    if (/\b(may gio|gio nao|ca nao|buoi nao|thu may|khi nao|hoc luc nao|lich mon|lich lop)\b/.test(cauHoi)) return "lich_lop";
    if (/\b(tin chi)\b/.test(cauHoi)) return "tin_chi";
    if (/\b(han dang ky)\b/.test(cauHoi)) return "han_dang_ky";
    if (/\b(dang ky duoc|co the dang ky|duoc dang ky|con nhan)\b/.test(cauHoi)) return "kha_nang_dang_ky";
    if (/\b(da dang ky|dang hoc|dang ky.*chua|da hoc.*chua)\b/.test(cauHoi)) return "trang_thai_dang_ky";
    if (/\b(bao nhieu)\s+(mon|lop)\b/.test(cauHoi)) return "so_luong";
    if (/\b(loc|tim|xem|tra|chon|goi y)\b.*\b(lop|mon)\b/.test(cauHoi)) return "loc_lop";
    return "";
}

function boSungYDinhChoCauNoiTiep(cauHoi) {
    if (!aiNguCanh.yDinhGanNhat) return cauHoi;
    if (aiNguCanh.dangLapThoiKhoaBieu
        && !/\b(bo|xoa|khong)\s+loc\b/.test(cauHoi)
        && /^(them|bo|xoa|doi|chuyen|tranh|ne|khong hoc|bat buoc|phai co|uu tien)\b/.test(cauHoi)) {
        return cauHoi;
    }
    const coYDinhRieng = Boolean(nhanDienYDinhAI(cauHoi));
    const laCauNoiTiep = /^(con|the|vay|vay con|neu la|doi sang|chuyen sang|bo|xoa|khong loc|khong can|khong y toi la|khong phai|hoc ky)\b/.test(cauHoi)
        || /\b(thi sao|the nao|van vay|van the)\b/.test(cauHoi);
    if (coYDinhRieng || !laCauNoiTiep) return cauHoi;
    const cumTu = {
        giao_vien_cua_mon: "do ai day",
        lop_cua_giao_vien: "day mon nao",
        cho_trong: "con cho",
        lich_lop: "hoc luc nao",
        tin_chi: "bao nhieu tin chi",
        han_dang_ky: "han dang ky",
        kha_nang_dang_ky: "dang ky duoc",
        trang_thai_dang_ky: "da dang ky chua",
        so_luong: "bao nhieu lop",
        loc_lop: "tim lop"
    }[aiNguCanh.yDinhGanNhat];
    return cumTu ? `${cauHoi} ${cumTu}` : cauHoi;
}

function docKhoangGio(cauHoi) {
    const daChuanHoa = cauHoi.replace(/(\d{1,2})\s*gio(?:\s*(\d{1,2}))?/g, (_, gio, phut = "") => `${gio}h${phut}`);
    const ketQua = daChuanHoa.match(/(\d{1,2})(?:[:h](\d{1,2})?)?\s*(sang|chieu|toi)?\s*(?:-|den|toi)\s*(\d{1,2})(?:[:h](\d{1,2})?)?\s*(sang|chieu|toi)?/);
    if (!ketQua) {
        if (/\b(buoi|ca) sang\b/.test(cauHoi)) return { batDau: 6 * 60, ketThuc: 12 * 60 };
        if (/\b(buoi|ca) chieu\b/.test(cauHoi)) return { batDau: 12 * 60, ketThuc: 18 * 60 };
        if (/\b(buoi|ca) toi\b/.test(cauHoi)) return { batDau: 18 * 60, ketThuc: 22 * 60 };
        return null;
    }
    const doiSangPhut = (gio, phut, buoi) => {
        let giaTriGio = Number(gio);
        if ((buoi === "chieu" || buoi === "toi") && giaTriGio < 12) giaTriGio += 12;
        if (buoi === "sang" && giaTriGio === 12) giaTriGio = 0;
        return giaTriGio * 60 + Number(phut || 0);
    };
    const batDau = doiSangPhut(ketQua[1], ketQua[2], ketQua[3]);
    const ketThuc = doiSangPhut(ketQua[4], ketQua[5], ketQua[6]);
    return batDau < ketThuc && ketThuc <= 1440 ? { batDau, ketThuc } : null;
}

function phutTuGio(gio) {
    const [phanGio, phut] = String(gio || "").split(":").map(Number);
    return Number.isFinite(phanGio) ? phanGio * 60 + (phut || 0) : -1;
}

function docThu(cauHoi) {
    if (cauHoi.includes("chu nhat")) return 8;
    const ketQua = cauHoi.match(/thu\s*([2-7])/);
    if (ketQua) return Number(ketQua[1]);
    const vietTat = cauHoi.match(/\bt\s*([2-7])\b/);
    if (vietTat) return Number(vietTat[1]);
    const thuBangChu = [
        ["thu hai", 2], ["thu ba", 3], ["thu tu", 4],
        ["thu nam", 5], ["thu sau", 6], ["thu bay", 7]
    ];
    return thuBangChu.find(([ten]) => cauHoi.includes(ten))?.[1] || null;
}

function docCacThuCanTranh(cauHoi) {
    const ketQua = new Set();
    const mauSo = /(?:khong|tranh|ne|ban)(?:\s+[a-z]+){0,3}\s+thu\s*([2-7])/g;
    for (const khop of cauHoi.matchAll(mauSo)) ketQua.add(Number(khop[1]));
    const thuBangChu = [
        ["thu hai", 2], ["thu ba", 3], ["thu tu", 4],
        ["thu nam", 5], ["thu sau", 6], ["thu bay", 7], ["chu nhat", 8]
    ];
    thuBangChu.forEach(([ten, thu]) => {
        const mau = new RegExp(`(?:khong|tranh|ne|ban)(?:\\s+[a-z]+){0,3}\\s+${ten}`);
        if (mau.test(cauHoi)) ketQua.add(thu);
    });
    return ketQua;
}

function khoangCachTu(a, b) {
    const tuA = String(a || "");
    const tuB = String(b || "");
    if (tuA === tuB) return 0;
    if (!tuA.length) return tuB.length;
    if (!tuB.length) return tuA.length;
    let hangTruoc = Array.from({ length: tuB.length + 1 }, (_, i) => i);
    for (let i = 1; i <= tuA.length; i += 1) {
        const hangHienTai = [i];
        for (let j = 1; j <= tuB.length; j += 1) {
            hangHienTai[j] = Math.min(
                hangHienTai[j - 1] + 1,
                hangTruoc[j] + 1,
                hangTruoc[j - 1] + (tuA[i - 1] === tuB[j - 1] ? 0 : 1)
            );
        }
        hangTruoc = hangHienTai;
    }
    return hangTruoc[tuB.length];
}

function timTuGanDung(tuMucTieu, cacTuTrongCau) {
    const doLechChoPhep = tuMucTieu.length >= 8 ? 2 : 1;
    return cacTuTrongCau.find((tu) => tu === tuMucTieu
        || (tuMucTieu.length >= 4 && tu.length >= 4 && tu[0] === tuMucTieu[0]
            && khoangCachTu(tuMucTieu, tu) <= doLechChoPhep));
}

function docHocKyVaNamHoc(cauHoi) {
    const hocKyMatch = cauHoi.match(/hoc k[yi]\s*([1-3])/);
    const namMatch = cauHoi.match(/nam(?: hoc)?\s*(20\d{2})/);
    return {
        hocKy: hocKyMatch ? Number(hocKyMatch[1]) : null,
        namHoc: cauHoi.includes("nam nay")
            ? new Date().getFullYear()
            : (namMatch ? Number(namMatch[1]) : null)
    };
}

function layCacMonDuocNhac(cauHoi) {
    const danhMuc = new Map();
    const cacTuTrongCau = cauHoi.split(/[^a-z0-9]+/).filter(Boolean);
    const tapTuTrongCau = new Set(cacTuTrongCau);
    const tuChung = new Set(["mon", "hoc", "lap", "trinh", "nhap", "co", "ban", "dai", "cuong", "tin", "thong", "chi"]);
    [...danhSachLopMonCoTheDangKy, ...danhSachMonDaDangKy].forEach((lop) => {
        const maMon = String(lop.mamon || "").trim();
        if (maMon && !danhMuc.has(maMon)) danhMuc.set(maMon, lop);
    });

    return [...danhMuc.values()].map((lop) => {
        const cacNhan = [lop.tenmon, lop.mamon]
            .map(chuanHoaTimKiem)
            .filter((nhan) => nhan.length >= 2);
        const cacTuDacTrung = chuanHoaTimKiem(lop.tenmon).split(/[^a-z0-9]+/)
            .filter((tu) => tu.length >= 3 && !tuChung.has(tu));
        const viTriNhan = cacNhan.reduce((ganNhat, nhan) => {
            const ketQua = cauHoi.indexOf(nhan);
            return ketQua >= 0 ? Math.min(ganNhat, ketQua) : ganNhat;
        }, Infinity);
        const viTriTu = cacTuDacTrung.reduce((ganNhat, tu) => {
            const tuKhop = tapTuTrongCau.has(tu) ? tu : timTuGanDung(tu, cacTuTrongCau);
            return tuKhop ? Math.min(ganNhat, cauHoi.indexOf(tuKhop)) : ganNhat;
        }, Infinity);
        const viTri = Math.min(viTriNhan, viTriTu);
        return { lop, viTri };
    }).filter((muc) => Number.isFinite(muc.viTri))
        .sort((a, b) => a.viTri - b.viTri);
}

function layCacGiaoVienDuocNhac(cauHoi) {
    const danhMuc = new Map();
    const cacTuTrongCau = cauHoi.split(/[^a-z0-9]+/).filter(Boolean);
    const tapTuTrongCau = new Set(cacTuTrongCau);
    const tuXungHo = new Set(["co", "thay", "giang", "vien"]);
    const dangHoiGiaoVien = /\b(co|thay|giang vien)\b|\b(day|lop cua|mon cua)\b/.test(cauHoi);
    [...danhSachLopMonCoTheDangKy, ...danhSachMonDaDangKy].forEach((lop) => {
        const maGiaoVien = String(lop.magv || "").trim();
        if (maGiaoVien && !danhMuc.has(maGiaoVien)) danhMuc.set(maGiaoVien, lop);
    });

    const ketQua = [...danhMuc.values()].map((lop) => {
        const cacNhan = [lop.tengiaovien, lop.magv]
            .map(chuanHoaTimKiem)
            .filter((nhan) => nhan.length >= 2);
        const cacTuTrongTen = chuanHoaTimKiem(lop.tengiaovien).split(/[^a-z0-9]+/)
            .filter((tu) => tu.length >= 3 && !tuXungHo.has(tu));
        const viTriNhan = cacNhan.reduce((ganNhat, nhan) => {
            const ketQua = cauHoi.indexOf(nhan);
            return ketQua >= 0 ? Math.min(ganNhat, ketQua) : ganNhat;
        }, Infinity);
        const tuKhopChinhXac = dangHoiGiaoVien
            ? cacTuTrongTen.find((tu) => tapTuTrongCau.has(tu))
            : null;
        const viTriTuChinhXac = tuKhopChinhXac ? cauHoi.indexOf(tuKhopChinhXac) : Infinity;
        const tuKhopGanDung = dangHoiGiaoVien && !tuKhopChinhXac
            ? cacTuTrongTen.map((tu) => timTuGanDung(tu, cacTuTrongCau)).find(Boolean)
            : null;
        const viTriTuGanDung = tuKhopGanDung ? cauHoi.indexOf(tuKhopGanDung) : Infinity;
        const viTri = Math.min(viTriNhan, viTriTuChinhXac, viTriTuGanDung);
        const mucDoKhop = Number.isFinite(viTriNhan) ? 0 : Number.isFinite(viTriTuChinhXac) ? 1 : 2;
        return { lop, viTri, mucDoKhop };
    }).filter((muc) => Number.isFinite(muc.viTri));
    const coKetQuaChinhXac = ketQua.some((muc) => muc.mucDoKhop < 2);
    return ketQua
        .filter((muc) => !coKetQuaChinhXac || muc.mucDoKhop < 2)
        .sort((a, b) => a.mucDoKhop - b.mucDoKhop || a.viTri - b.viTri);
}

function lopMonCoLichDayDu(lop) {
    return Number(lop?.thu) >= 2
        && Number(lop?.thu) <= 8
        && phutTuGio(lop?.giobatdau) >= 0
        && phutTuGio(lop?.gioketthuc) > phutTuGio(lop?.giobatdau);
}

function lopKhongTrungDanhSach(lop, danhSach) {
    return danhSach.every((lopDaChon) => !haiLichHocTrungNhau(lop, lopDaChon));
}

function diemUuTienLop(lop) {
    const conLai = Math.max(0, Number(lop.sisotoida || 0) - Number(lop.sisodadangky || 0));
    return conLai * 10 - phutTuGio(lop.giobatdau) / 1000;
}

function taoHtmlPhuongAnLich(danhSach, viTri) {
    const daSapXep = [...danhSach].sort((a, b) => Number(a.thu) - Number(b.thu)
        || phutTuGio(a.giobatdau) - phutTuGio(b.giobatdau));
    const tongTinChi = daSapXep.reduce((tong, lop) => tong + Number(lop.sotinchi || 0), 0);
    return `<section class="ai-schedule-plan">
        <div class="ai-plan-heading"><strong>Phương án ${viTri + 1}</strong><span>${daSapXep.length} môn · ${tongTinChi} tín chỉ</span></div>
        ${daSapXep.map(taoTheGoiYLop).join("")}
        <small class="ai-plan-safe">✓ Không trùng với lịch đã đăng ký và không trùng nhau.</small>
    </section>`;
}

function lapThoiKhoaBieu(cauHoi) {
    const laYeuCauMoi = /(?:lap|xep|sap xep|sap|tao|len|dung|thiet ke|soan|lam).*\b(?:thoi khoa bieu|lich hoc|lich mon|lich)\b/.test(cauHoi)
        || /(?:thoi khoa bieu|lich hoc|lich mon).*(?:cho toi|giup toi|phu hop|xep|tao|lam)/.test(cauHoi)
        || /(?:chon|goi y|lap|xep|sap xep|tao).*\b\d{1,2}\s*(?:mon|lop)\b/.test(cauHoi);
    let yeuCauTruoc = aiNguCanh.yeuCauLapLich;
    if (!laYeuCauMoi && yeuCauTruoc) {
        const dangThayDoi = /\b(doi|chuyen|thay bang|thay doi|khong y toi la|khong phai)\b/.test(cauHoi);
        if (docHocKyVaNamHoc(cauHoi).hocKy) yeuCauTruoc = yeuCauTruoc.replace(/hoc ky\s*[1-3]/g, " ");
        if (docHocKyVaNamHoc(cauHoi).namHoc) yeuCauTruoc = yeuCauTruoc.replace(/nam(?: hoc)?\s*20\d{2}/g, " ");
        if (dangThayDoi && docThu(cauHoi)) {
            yeuCauTruoc = yeuCauTruoc.replace(/thu\s*[2-7]|thu (hai|ba|tu|nam|sau|bay)|chu nhat/g, " ");
        }
        if (dangThayDoi && layCacGiaoVienDuocNhac(cauHoi).length) {
            const cacNhanGiaoVien = [...danhSachLopMonCoTheDangKy, ...danhSachMonDaDangKy]
                .flatMap((lop) => [chuanHoaTimKiem(lop.tengiaovien), chuanHoaTimKiem(lop.magv)])
                .filter(Boolean);
            cacNhanGiaoVien.forEach((nhan) => { yeuCauTruoc = yeuCauTruoc.replaceAll(nhan, " "); });
        }
    }
    aiNguCanh.yeuCauLapLich = laYeuCauMoi || !yeuCauTruoc
        ? cauHoi
        : `${yeuCauTruoc} ${cauHoi}`.replace(/\s+/g, " ").trim();
    const yeuCau = aiNguCanh.yeuCauLapLich;

    if (!danhSachLopMonCoTheDangKy.length) {
        aiNguCanh.dangLapThoiKhoaBieu = true;
        return "Hiện chưa có lớp đủ điều kiện để xếp lịch. Bạn hãy bấm Làm mới danh sách lớp rồi thử lại.";
    }

    const { hocKy, namHoc } = docHocKyVaNamHoc(yeuCau);
    const cacThuCanTranh = docCacThuCanTranh(yeuCau);
    const thuDuocNhac = docThu(yeuCau);
    const thuRanh = thuDuocNhac && !cacThuCanTranh.has(thuDuocNhac) ? thuDuocNhac : null;
    const khoangGio = docKhoangGio(yeuCau);
    const monDuocNhac = layCacMonDuocNhac(yeuCau);
    const giaoVienDuocNhac = layCacGiaoVienDuocNhac(yeuCau);
    const maMonDaDangKy = new Set(danhSachMonDaDangKy.map((lop) => String(lop.mamon || "").trim()));
    const soMonMatch = yeuCau.match(/(\d{1,2})\s*(?:mon|lop)\b/);
    const tinChiMatch = yeuCau.match(/(\d{1,2})\s*tin chi\b/);
    const soMonMucTieu = Math.min(8, Math.max(1, soMonMatch ? Number(soMonMatch[1]) : 4));
    const tinChiMucTieu = tinChiMatch ? Number(tinChiMatch[1]) : null;

    const monDaCo = monDuocNhac.filter(({ lop }) => maMonDaDangKy.has(String(lop.mamon || "").trim()));
    const monCanXep = monDuocNhac.filter(({ lop }) => !maMonDaDangKy.has(String(lop.mamon || "").trim()));
    if (monDuocNhac.length && !monCanXep.length) {
        aiNguCanh.dangLapThoiKhoaBieu = true;
        return `Các môn bạn yêu cầu (${monDaCo.map(({ lop }) => lop.tenmon).join(", ")}) đã được đăng ký nên mình không xếp lại lần nữa.`;
    }

    let ungVien = danhSachLopMonCoTheDangKy.filter((lop) => lopMonCoLichDayDu(lop)
        && !maMonDaDangKy.has(String(lop.mamon || "").trim())
        && (!hocKy || Number(lop.hocky) === hocKy)
        && (!namHoc || Number(lop.namhoc) === namHoc)
        && !cacThuCanTranh.has(Number(lop.thu))
        && (!thuRanh || Number(lop.thu) === thuRanh)
        && (!khoangGio || (phutTuGio(lop.giobatdau) >= khoangGio.batDau
            && phutTuGio(lop.gioketthuc) <= khoangGio.ketThuc))
        && lopKhongTrungDanhSach(lop, danhSachMonDaDangKy));

    const rangBuocGiaoVien = new Map();
    if (monCanXep.length) {
        giaoVienDuocNhac.forEach((giaoVien) => {
            const monGanNhat = monCanXep.reduce((ganNhat, mon) => (
                Math.abs(mon.viTri - giaoVien.viTri) < Math.abs(ganNhat.viTri - giaoVien.viTri) ? mon : ganNhat
            ));
            const maMon = String(monGanNhat.lop.mamon || "").trim();
            if (!rangBuocGiaoVien.has(maMon)) rangBuocGiaoVien.set(maMon, new Set());
            rangBuocGiaoVien.get(maMon).add(String(giaoVien.lop.magv || "").trim());
        });
    } else if (giaoVienDuocNhac.length) {
        const cacMaGiaoVien = new Set(giaoVienDuocNhac.map(({ lop }) => String(lop.magv || "").trim()));
        ungVien = ungVien.filter((lop) => cacMaGiaoVien.has(String(lop.magv || "").trim()));
    }

    if (monCanXep.length && rangBuocGiaoVien.size) {
        ungVien = ungVien.filter((lop) => {
            const cacMaGiaoVien = rangBuocGiaoVien.get(String(lop.mamon || "").trim());
            return !cacMaGiaoVien || cacMaGiaoVien.has(String(lop.magv || "").trim());
        });
    }

    /* Một thời khóa biểu chỉ thuộc một học kỳ/năm học. */
    if (ungVien.length && (!hocKy || !namHoc)) {
        const maMonBatBuoc = new Set(monCanXep.map(({ lop }) => String(lop.mamon || "").trim()));
        const thongKeKy = new Map();
        ungVien.forEach((lop) => {
            const khoa = `${Number(lop.hocky)}|${Number(lop.namhoc)}`;
            if (!thongKeKy.has(khoa)) thongKeKy.set(khoa, { cacMaMon: new Set(), soLop: 0 });
            const thongKe = thongKeKy.get(khoa);
            thongKe.cacMaMon.add(String(lop.mamon || "").trim());
            thongKe.soLop += 1;
        });
        const kyTotNhat = [...thongKeKy.entries()].sort((a, b) => {
            const doPhuA = maMonBatBuoc.size
                ? [...maMonBatBuoc].filter((maMon) => a[1].cacMaMon.has(maMon)).length
                : a[1].cacMaMon.size;
            const doPhuB = maMonBatBuoc.size
                ? [...maMonBatBuoc].filter((maMon) => b[1].cacMaMon.has(maMon)).length
                : b[1].cacMaMon.size;
            return doPhuB - doPhuA || b[1].soLop - a[1].soLop;
        })[0]?.[0];
        if (kyTotNhat) {
            const [hocKyDuocChon, namHocDuocChon] = kyTotNhat.split("|").map(Number);
            ungVien = ungVien.filter((lop) => Number(lop.hocky) === hocKyDuocChon
                && Number(lop.namhoc) === namHocDuocChon);
        }
    }

    const nhomTheoMon = new Map();
    ungVien.forEach((lop) => {
        const maMon = String(lop.mamon || "").trim();
        if (!nhomTheoMon.has(maMon)) nhomTheoMon.set(maMon, []);
        nhomTheoMon.get(maMon).push(lop);
    });
    nhomTheoMon.forEach((cacLop) => cacLop.sort((a, b) => diemUuTienLop(b) - diemUuTienLop(a)));

    let cacNhom;
    if (monCanXep.length) {
        cacNhom = monCanXep.map(({ lop }) => {
            const maMon = String(lop.mamon || "").trim();
            const cacMaGiaoVien = rangBuocGiaoVien.get(maMon);
            const cacLop = (nhomTheoMon.get(maMon) || []).filter((muc) => !cacMaGiaoVien
                || cacMaGiaoVien.has(String(muc.magv || "").trim()));
            return { maMon, tenMon: lop.tenmon, cacLop };
        });
        const nhomKhongCoLop = cacNhom.find((nhom) => !nhom.cacLop.length);
        if (nhomKhongCoLop) {
            aiNguCanh.dangLapThoiKhoaBieu = true;
            return `Mình chưa tìm được lớp hợp lệ cho môn ${nhomKhongCoLop.tenMon} theo đúng giảng viên, học kỳ hoặc thời gian bạn yêu cầu.`;
        }
    } else {
        cacNhom = [...nhomTheoMon.entries()]
            .map(([maMon, cacLop]) => ({ maMon, tenMon: cacLop[0]?.tenmon || maMon, cacLop }))
            .sort((a, b) => diemUuTienLop(b.cacLop[0]) - diemUuTienLop(a.cacLop[0]));
    }

    const phuongAn = [];
    if (monCanXep.length) {
        const nhomTheoDoKho = [...cacNhom].sort((a, b) => a.cacLop.length - b.cacLop.length);
        const thuPhuongAn = (viTri, daChon) => {
            if (phuongAn.length >= 20) return;
            if (viTri >= nhomTheoDoKho.length) {
                phuongAn.push([...daChon]);
                return;
            }
            nhomTheoDoKho[viTri].cacLop.forEach((lop) => {
                if (lopKhongTrungDanhSach(lop, daChon)) thuPhuongAn(viTri + 1, [...daChon, lop]);
            });
        };
        thuPhuongAn(0, []);
    } else {
        const daChon = [];
        for (const nhom of cacNhom) {
            const lop = nhom.cacLop.find((muc) => lopKhongTrungDanhSach(muc, daChon));
            if (!lop) continue;
            daChon.push(lop);
            const tongTinChi = daChon.reduce((tong, muc) => tong + Number(muc.sotinchi || 0), 0);
            if ((!tinChiMucTieu && daChon.length >= soMonMucTieu)
                || (tinChiMucTieu && tongTinChi >= tinChiMucTieu)) break;
        }
        if (daChon.length) phuongAn.push(daChon);
    }

    if (!phuongAn.length) {
        aiNguCanh.dangLapThoiKhoaBieu = true;
        const dieuKienKy = [hocKy ? `học kỳ ${hocKy}` : "", namHoc ? `năm ${namHoc}` : ""]
            .filter(Boolean).join(", ");
        return `Không thể ghép tất cả yêu cầu${dieuKienKy ? ` trong ${dieuKienKy}` : ""} thành một thời khóa biểu không trùng lịch. Bạn có thể đổi giảng viên, mở rộng khung giờ hoặc bỏ bớt một môn.`;
    }

    phuongAn.sort((a, b) => b.reduce((tong, lop) => tong + diemUuTienLop(lop), 0)
        - a.reduce((tong, lop) => tong + diemUuTienLop(lop), 0));
    const phuongAnKhongTrung = [...new Map(phuongAn.map((danhSach) => [
        danhSach.map((lop) => lop.malopmon).sort().join("|"), danhSach
    ])).values()].slice(0, 2);
    aiNguCanh.dangLapThoiKhoaBieu = true;
    const ghiChuMonDaCo = monDaCo.length
        ? `<p class="ai-plan-warning">Không xếp lại môn đã đăng ký: ${monDaCo.map(({ lop }) => chuyenThanhVanBanAnToan(lop.tenmon)).join(", ")}.</p>`
        : "";
    return `<p>Mình đã lập ${phuongAnKhongTrung.length} phương án từ các lớp còn mở:</p>${ghiChuMonDaCo}${phuongAnKhongTrung.map(taoHtmlPhuongAnLich).join("")}`;
}

function taoTheGoiYLop(lopMon) {
    const conLai = Math.max(0, Number(lopMon.sisotoida) - Number(lopMon.sisodadangky));
    return `<article class="ai-course-card">
        <strong>${chuyenThanhVanBanAnToan(lopMon.tenmon)} · ${chuyenThanhVanBanAnToan(lopMon.malopmon)}</strong>
        <small>${tenThu(lopMon.thu)}, ${chuyenThanhVanBanAnToan(lopMon.giobatdau)}–${chuyenThanhVanBanAnToan(lopMon.gioketthuc)} · ${lopMon.sotinchi} tín chỉ</small>
        <small>Học kỳ ${chuyenThanhSoAnToan(lopMon.hocky)} · ${chuyenThanhSoAnToan(lopMon.namhoc)}–${chuyenThanhSoAnToan(lopMon.namhoc) + 1}</small>
        <small>${chuyenThanhVanBanAnToan(lopMon.tengiaovien)} · còn ${conLai} chỗ</small>
        <button type="button" data-ai-course="${chuyenThanhVanBanAnToan(lopMon.malopmon)}">Xem lớp</button>
    </article>`;
}

function goiYLopTheoLichTrong(dieuKien) {
    const { thu, khoangGio, hocKy, namHoc, dangHoiNganhIT = false } = dieuKien;
    if (!thu || !khoangGio) {
        return "Bạn hãy cho mình biết đủ thứ và khoảng giờ rảnh, ví dụ: “Gợi ý lớp thứ 5 từ 7h đến 10h, học kỳ 1”.";
    }

    aiNguCanh.traCuuGanNhat = { thu, khoangGio, hocKy, namHoc, dangHoiNganhIT };
    const coDuLieuKhoa = danhSachLopMonCoTheDangKy.some((lop) => lop.makhoa);
    const maMonDaDangKy = new Set(danhSachMonDaDangKy.map((lop) => String(lop.mamon || "").trim()));
    const phuHop = danhSachLopMonCoTheDangKy.filter((lop) => Number(lop.thu) === thu
        && phutTuGio(lop.giobatdau) >= khoangGio.batDau
        && phutTuGio(lop.gioketthuc) <= khoangGio.ketThuc
        && (!hocKy || Number(lop.hocky) === hocKy)
        && (!namHoc || Number(lop.namhoc) === namHoc)
        && !maMonDaDangKy.has(String(lop.mamon || "").trim())
        && lopKhongTrungDanhSach(lop, danhSachMonDaDangKy)
        && (!dangHoiNganhIT || !coDuLieuKhoa || /cntt|\bit\b|cong nghe thong tin/.test(chuanHoaTimKiem(lop.makhoa))))
        .sort((a, b) => (b.sisotoida - b.sisodadangky) - (a.sisotoida - a.sisodadangky))
        .slice(0, 5);
    if (!phuHop.length) {
        return `Không có lớp đang mở nào nằm trọn trong ${tenThu(thu)}, khoảng ${dinhDangPhutAI(khoangGio.batDau)}–${dinhDangPhutAI(khoangGio.ketThuc)}. Bạn có thể thử mở rộng khung giờ hoặc đổi học kỳ.`;
    }
    return `<p>Mình tìm thấy ${phuHop.length} lớp phù hợp ${tenThu(thu)}, ${dinhDangPhutAI(khoangGio.batDau)}–${dinhDangPhutAI(khoangGio.ketThuc)}:</p>${phuHop.map(taoTheGoiYLop).join("")}`;
}

function dinhDangPhutAI(tongPhut) {
    const gio = Math.floor(Number(tongPhut) / 60);
    const phut = Number(tongPhut) % 60;
    return `${String(gio).padStart(2, "0")}:${String(phut).padStart(2, "0")}`;
}

function traLoiTroLy(cauHoiGoc) {
    let cauHoi = chuanHoaCauHoiAI(cauHoiGoc);
    cauHoi = boSungYDinhChoCauNoiTiep(cauHoi);
    const yDinhHienTai = nhanDienYDinhAI(cauHoi);
    if (yDinhHienTai) aiNguCanh.yDinhGanNhat = yDinhHienTai;
    const tongTinChi = danhSachMonDaDangKy.reduce((tong, lop) => tong + Number(lop.sotinchi || 0), 0);
    let monDuocNhac = layCacMonDuocNhac(cauHoi);
    const monMoiDuocNhac = monDuocNhac.length > 0;
    const coDauHieuNoiTiepDoiTuong = /^(con|the|vay|vay con|neu la|doi sang|chuyen sang|hoc ky|thu|t[2-7]|buoi|ca|luc|tu)\b/.test(cauHoi)
        || /\b(thi sao|the nao|van vay|van the|con cho|sap day)\b/.test(cauHoi);
    const coTuTenGiaoVienTrongCau = [...danhSachLopMonCoTheDangKy, ...danhSachMonDaDangKy].some((lop) => (
        chuanHoaTimKiem(lop.tengiaovien).split(/[^a-z0-9]+/)
            .filter((tu) => tu.length >= 3 && !["thay", "giao", "vien"].includes(tu))
            .some((tu) => new RegExp(`\\b${tu}\\b`).test(cauHoi))
    ));
    const laCauHoiNoiTiepGiaoVien = Boolean(aiNguCanh.maGiaoVienGanNhat)
        && !/\bthu\s*[2-8]\b/.test(cauHoi)
        && (/\b(co|thay|giao vien)\b/.test(cauHoi)
            || (coDauHieuNoiTiepDoiTuong && coTuTenGiaoVienTrongCau));
    const dangNhacGiaoVienBangDaiTu = /\b(thay|co|giao vien)\s*(do|nay|vua roi)\b|\bgiao vien do\b/.test(cauHoi);
    let giaoVienDuocNhac = dangNhacGiaoVienBangDaiTu ? [] : layCacGiaoVienDuocNhac(
        laCauHoiNoiTiepGiaoVien ? `${cauHoi} giang vien` : cauHoi
    );
    const giaoVienMoiDuocNhac = giaoVienDuocNhac.length > 0;
    const tatCaLop = [...danhSachLopMonCoTheDangKy, ...danhSachMonDaDangKy];
    const dangNhacMonTruoc = /\b(mon|lop)\s*(do|nay|vua roi)\b|\bno\b/.test(cauHoi);
    const dangNhacGiaoVienTruoc = dangNhacGiaoVienBangDaiTu;
    if (!monDuocNhac.length && dangNhacMonTruoc && aiNguCanh.maMonGanNhat) {
        const lop = tatCaLop.find((muc) => String(muc.mamon || "").trim() === aiNguCanh.maMonGanNhat);
        if (lop) monDuocNhac = [{ lop, viTri: 0 }];
    }
    if (!giaoVienDuocNhac.length && dangNhacGiaoVienTruoc && aiNguCanh.maGiaoVienGanNhat) {
        const lop = tatCaLop.find((muc) => String(muc.magv || "").trim() === aiNguCanh.maGiaoVienGanNhat);
        if (lop) giaoVienDuocNhac = [{ lop, viTri: 0 }];
    }
    if (!monDuocNhac.length && !giaoVienDuocNhac.length && coDauHieuNoiTiepDoiTuong) {
        const boLocTruoc = aiNguCanh.boLocDoiTuongGanNhat || {};
        const lopTheoMon = tatCaLop.find((muc) => String(muc.mamon || "").trim() === boLocTruoc.maMon);
        const lopTheoGiaoVien = tatCaLop.find((muc) => String(muc.magv || "").trim() === boLocTruoc.maGiaoVien);
        if (lopTheoMon) monDuocNhac = [{ lop: lopTheoMon, viTri: 0 }];
        if (lopTheoGiaoVien) giaoVienDuocNhac = [{ lop: lopTheoGiaoVien, viTri: 0 }];
    }
    if (monDuocNhac.length) aiNguCanh.maMonGanNhat = String(monDuocNhac[0].lop.mamon || "").trim();
    if (giaoVienDuocNhac.length) aiNguCanh.maGiaoVienGanNhat = String(giaoVienDuocNhac[0].lop.magv || "").trim();
    if (monMoiDuocNhac || giaoVienMoiDuocNhac) {
        aiNguCanh.boLocDoiTuongGanNhat = {
            maMon: monMoiDuocNhac ? String(monDuocNhac[0]?.lop.mamon || "").trim() : "",
            maGiaoVien: giaoVienMoiDuocNhac ? String(giaoVienDuocNhac[0]?.lop.magv || "").trim() : "",
            hocKy: null,
            namHoc: null,
            thu: null,
            khoangGio: null
        };
        aiNguCanh.traCuuGanNhat = null;
    }

    const thuTrongCau = docThu(cauHoi);
    const khoangGioTrongCau = docKhoangGio(cauHoi);
    const hocKyVaNamHocTrongCau = docHocKyVaNamHoc(cauHoi);
    const boLocDoiTuong = aiNguCanh.boLocDoiTuongGanNhat || {};
    if (/\b(bo|xoa|khong can|khong loc)\b.*\bhoc ky\b/.test(cauHoi)) boLocDoiTuong.hocKy = null;
    if (/\b(bo|xoa|khong can|khong loc)\b.*\bnam hoc\b/.test(cauHoi)) boLocDoiTuong.namHoc = null;
    if (/\b(bo|xoa|khong can|khong loc)\b.*\b(thu|ngay hoc)\b/.test(cauHoi)) boLocDoiTuong.thu = null;
    if (/\b(bo|xoa|khong can|khong loc)\b.*\b(gio|ca|buoi|khung gio)\b/.test(cauHoi)) boLocDoiTuong.khoangGio = null;
    const dungDieuKienTruoc = coDauHieuNoiTiepDoiTuong && !monMoiDuocNhac && !giaoVienMoiDuocNhac;
    const hocKyLoc = hocKyVaNamHocTrongCau.hocKy || (dungDieuKienTruoc ? boLocDoiTuong.hocKy : null);
    const namHocLoc = hocKyVaNamHocTrongCau.namHoc || (dungDieuKienTruoc ? boLocDoiTuong.namHoc : null);
    const thuLoc = thuTrongCau || (dungDieuKienTruoc ? boLocDoiTuong.thu : null);
    const khoangGioLoc = khoangGioTrongCau || (dungDieuKienTruoc ? boLocDoiTuong.khoangGio : null);
    if (hocKyVaNamHocTrongCau.hocKy || hocKyVaNamHocTrongCau.namHoc || thuTrongCau || khoangGioTrongCau) {
        aiNguCanh.boLocDoiTuongGanNhat = {
            ...boLocDoiTuong,
            hocKy: hocKyVaNamHocTrongCau.hocKy || boLocDoiTuong.hocKy || null,
            namHoc: hocKyVaNamHocTrongCau.namHoc || boLocDoiTuong.namHoc || null,
            thu: thuTrongCau || boLocDoiTuong.thu || null,
            khoangGio: khoangGioTrongCau || boLocDoiTuong.khoangGio || null
        };
    }
    const laCauHoiNoiTiepLich = Boolean(aiNguCanh.traCuuGanNhat)
        && (/\b(con|the con)\s+thu\b.*\bthi sao\b|\bgio van (vay|the)\b|\bcung (gio|khung gio)\b|\bkhung gio (cu|do|nay)\b/.test(cauHoi)
            || (Boolean(thuTrongCau) && !khoangGioTrongCau && /\b(con|thi sao|van vay|van the)\b/.test(cauHoi)));
    const laYeuCauLocLop = /\b(loc|tim|xem|tra|chon|goi y)\b.*\b(lop|mon)\b|\b(lop|mon)\b.*\b(loc|tim|xem|tra|chon)\b|cho toi (?:danh sach )?(?:cac )?(?:lop|mon)/.test(cauHoi);
    const coDieuKienLoc = Boolean(hocKyVaNamHocTrongCau.hocKy || hocKyVaNamHocTrongCau.namHoc
        || thuTrongCau || khoangGioTrongCau);
    const coLenhSuaLichRoRang = /\b(them|bo|xoa|doi|chuyen|thay bang|thay doi|tranh|ne|khong hoc|bat buoc|phai co|uu tien)\b/.test(cauHoi);
    const laTraCuuRutGonTheoDoiTuong = coDieuKienLoc
        && (monDuocNhac.length > 0 || giaoVienDuocNhac.length > 0)
        && !coLenhSuaLichRoRang;
    const laCauHoiTraCuu = laYeuCauLocLop || laCauHoiNoiTiepLich || laCauHoiNoiTiepGiaoVien || laTraCuuRutGonTheoDoiTuong
        || /ai day|do ai day|giao vien nao|thay co nao|day (mon|lop)? ?gi|day (mon|lop) nao|lop cua|mon cua|co lop nao|con cho|sap day|han dang ky|da dang ky|dang ky duoc|may gio|gio nao|ca nao|buoi nao|thu may|khi nao|hoc luc nao|xem lich|xem thoi khoa bieu|lich hien tai|lich cua toi|thoi khoa bieu hien tai|thoi khoa bieu cua toi|tuan nay/.test(cauHoi);
    const laYeuCauLapLich = /(?:lap|xep|sap xep|sap|tao|len|dung|thiet ke|soan|lam).*\b(?:thoi khoa bieu|lich hoc|lich mon|lich)\b/.test(cauHoi)
        || /(?:thoi khoa bieu|lich hoc|lich mon).*(?:cho toi|giup toi|phu hop|xep|tao|lam)/.test(cauHoi)
        || /(?:chon|goi y|lap|xep|sap xep|tao).*\b\d{1,2}\s*(?:mon|lop)\b/.test(cauHoi)
        || (aiNguCanh.dangLapThoiKhoaBieu && !laCauHoiTraCuu
            && (monDuocNhac.length || giaoVienDuocNhac.length || coLenhSuaLichRoRang));

    if (cauHoi.includes("lam lai tu dau") || cauHoi.includes("xoa yeu cau") || cauHoi === "reset") {
        aiNguCanh.dangLapThoiKhoaBieu = false;
        aiNguCanh.yeuCauLapLich = "";
        aiNguCanh.maMonGanNhat = "";
        aiNguCanh.maGiaoVienGanNhat = "";
        aiNguCanh.boLocDoiTuongGanNhat = {
            maMon: "", maGiaoVien: "", hocKy: null, namHoc: null, thu: null, khoangGio: null
        };
        aiNguCanh.traCuuGanNhat = null;
        aiNguCanh.yDinhGanNhat = "";
        return "Mình đã xóa các điều kiện xếp lịch trước đó. Bạn hãy gửi một yêu cầu thời khóa biểu mới.";
    }

    if (/^(xin chao|chao|hello|hi|alo)\b/.test(cauHoi)) {
        return `Chào bạn! Hiện mình thấy ${danhSachLopMonCoTheDangKy.length} lớp còn có thể đăng ký. Bạn có thể nhờ mình lập thời khóa biểu, tìm lớp theo giảng viên hoặc kiểm tra lịch học.`;
    }
    if (cauHoi.includes("cam on") || cauHoi.includes("thanks") || cauHoi.includes("thank you")) {
        return "Không có gì! Nếu muốn, bạn hãy gửi tên môn, giảng viên và học kỳ để mình lập thêm một phương án thời khóa biểu khác.";
    }
    if (cauHoi.includes("khoe khong") || cauHoi.includes("the nao roi")) {
        return "Mình hoạt động ổn và đã sẵn sàng đọc dữ liệu lớp của bạn. Hôm nay bạn muốn tìm môn hay sắp thời khóa biểu?";
    }
    if (/^(tam biet|bye|goodbye)/.test(cauHoi)) {
        return "Tạm biệt bạn. Chúc bạn đăng ký được thời khóa biểu thật ưng ý!";
    }
    if (cauHoi.includes("ban la ai") || cauHoi.includes("lam duoc gi") || cauHoi.includes("giup gi")
        || cauHoi.includes("huong dan") || cauHoi === "help") {
        return "Mình là QL Assistant. Mình có thể lập thời khóa biểu không trùng lịch, lọc theo môn/giảng viên/học kỳ/giờ rảnh, xem lớp còn chỗ, lịch hôm nay, môn đã đăng ký, tổng tín chỉ và cảnh báo xung đột.";
    }
    if (/^(ok|okay|oke|uh|u|duoc|hieu roi|tot|hay)$/.test(cauHoi)) {
        return "Được rồi. Bạn cứ nói tiếp điều muốn tìm hoặc thay đổi, mình sẽ dựa trên ngữ cảnh vừa trao đổi.";
    }
    if (/^(xin loi|sorry)\b/.test(cauHoi)) {
        return "Không sao đâu. Bạn cứ sửa lại tên môn, giảng viên, học kỳ hoặc khung giờ; mình sẽ dùng thông tin mới nhất.";
    }
    if (/^(ai|giao vien nao|thay nao|co nao)\s*(day|phu trach)?$/.test(cauHoi)) {
        return "Bạn muốn hỏi giảng viên của môn nào? Hãy gửi tên hoặc mã môn, ví dụ: “Ai dạy môn OS?”.";
    }
    if (/^(mon nao|lop nao|hoc gi|chon gi)$/.test(cauHoi)) {
        return "Bạn muốn chọn theo tiêu chí nào: học kỳ, ngày rảnh, khung giờ, giảng viên hay số chỗ còn lại?";
    }
    if (/mon nao de|giao vien nao tot|thay co nao tot/.test(cauHoi)) {
        return "Mình chưa có dữ liệu đánh giá độ khó hoặc chất lượng giảng dạy nên không nên kết luận chủ quan. Mình có thể so sánh các lựa chọn theo lịch, sĩ số còn lại và mức độ trùng lịch.";
    }
    if (/(tai sao|vi sao).*(khong co|khong thay|khong hien).*(lop|mon)/.test(cauHoi)) {
        return "Danh sách chỉ hiện lớp đang mở, còn thời hạn đăng ký, chưa đầy, chưa được bạn đăng ký và được hệ thống cho phép. Một lớp thiếu bất kỳ điều kiện nào sẽ không xuất hiện.";
    }

    if (laCauHoiNoiTiepLich) {
        const truoc = aiNguCanh.traCuuGanNhat;
        return goiYLopTheoLichTrong({
            thu: thuTrongCau || truoc.thu,
            khoangGio: khoangGioTrongCau || truoc.khoangGio,
            hocKy: hocKyVaNamHocTrongCau.hocKy || truoc.hocKy,
            namHoc: hocKyVaNamHocTrongCau.namHoc || truoc.namHoc,
            dangHoiNganhIT: /\b(it|cntt)\b|cong nghe thong tin/.test(cauHoi) || truoc.dangHoiNganhIT
        });
    }

    const cacGiaoVienKhacNhau = [...new Map(
        giaoVienDuocNhac.map((muc) => [String(muc.lop.magv || "").trim(), muc.lop])
    ).values()];
    if (/\b(so sanh|doi chieu|khac nhau|chon giua)\b/.test(cauHoi) && cacGiaoVienKhacNhau.length >= 2) {
        return `<p>So sánh các lớp đang mở theo giảng viên:</p>${cacGiaoVienKhacNhau.map((giaoVien) => {
            const cacLop = danhSachLopMonCoTheDangKy.filter((lop) => String(lop.magv || "").trim() === String(giaoVien.magv || "").trim()
                && (!hocKyLoc || Number(lop.hocky) === hocKyLoc)
                && (!namHocLoc || Number(lop.namhoc) === namHocLoc)
                && (!thuLoc || Number(lop.thu) === thuLoc)
                && (!khoangGioLoc || (phutTuGio(lop.giobatdau) >= khoangGioLoc.batDau
                    && phutTuGio(lop.gioketthuc) <= khoangGioLoc.ketThuc)));
            const tongChoTrong = cacLop.reduce((tong, lop) => tong + Math.max(0, Number(lop.sisotoida || 0) - Number(lop.sisodadangky || 0)), 0);
            return `<section class="ai-schedule-option"><strong>${chuyenThanhVanBanAnToan(giaoVien.tengiaovien)}</strong><small>${cacLop.length} lớp đang mở · tổng ${tongChoTrong} chỗ trống</small>${cacLop.slice(0, 3).map(taoTheGoiYLop).join("")}</section>`;
        }).join("")}`;
    }

    if ((laYeuCauLocLop || laTraCuuRutGonTheoDoiTuong)
        && (monDuocNhac.length || giaoVienDuocNhac.length)) {
        const cacMaMon = new Set(monDuocNhac.map(({ lop }) => String(lop.mamon || "").trim()));
        const cacMaGiaoVien = new Set(giaoVienDuocNhac.map(({ lop }) => String(lop.magv || "").trim()));
        const cacLop = danhSachLopMonCoTheDangKy.filter((lop) => (!cacMaMon.size
            || cacMaMon.has(String(lop.mamon || "").trim()))
            && (!cacMaGiaoVien.size || cacMaGiaoVien.has(String(lop.magv || "").trim()))
            && (!hocKyLoc || Number(lop.hocky) === hocKyLoc)
            && (!namHocLoc || Number(lop.namhoc) === namHocLoc)
            && (!thuLoc || Number(lop.thu) === thuLoc)
            && (!khoangGioLoc || (phutTuGio(lop.giobatdau) >= khoangGioLoc.batDau
                && phutTuGio(lop.gioketthuc) <= khoangGioLoc.ketThuc)))
            .sort((a, b) => diemUuTienLop(b) - diemUuTienLop(a));
        if (!cacLop.length) {
            return "Mình không tìm thấy lớp còn nhận đăng ký đáp ứng đúng các điều kiện lọc đó.";
        }
        const doiTuong = giaoVienDuocNhac.length
            ? giaoVienDuocNhac[0].lop.tengiaovien
            : monDuocNhac[0].lop.tenmon;
        const nhanHocKy = hocKyLoc ? ` trong học kỳ ${hocKyLoc}` : "";
        return `<p>Mình tìm thấy ${cacLop.length} lớp của ${chuyenThanhVanBanAnToan(doiTuong)}${nhanHocKy}:</p>${cacLop.slice(0, 8).map(taoTheGoiYLop).join("")}`;
    }

    if (/bao nhieu\s+(lop|mon)/.test(cauHoi) && giaoVienDuocNhac.length) {
        const giaoVien = giaoVienDuocNhac[0].lop;
        const cacLop = danhSachLopMonCoTheDangKy.filter((lop) => String(lop.magv || "").trim() === String(giaoVien.magv || "").trim()
            && (!hocKyLoc || Number(lop.hocky) === hocKyLoc)
            && (!namHocLoc || Number(lop.namhoc) === namHocLoc));
        return `${giaoVien.tengiaovien} hiện có ${cacLop.length} lớp còn nhận đăng ký${hocKyLoc ? ` trong học kỳ ${hocKyLoc}` : ""}.`;
    }

    if (/bao nhieu\s+(lop|mon)/.test(cauHoi) && monDuocNhac.length) {
        const mon = monDuocNhac[0].lop;
        const cacLop = danhSachLopMonCoTheDangKy.filter((lop) => String(lop.mamon || "").trim() === String(mon.mamon || "").trim()
            && (!hocKyLoc || Number(lop.hocky) === hocKyLoc)
            && (!namHocLoc || Number(lop.namhoc) === namHocLoc));
        return `Môn ${mon.tenmon} hiện có ${cacLop.length} lớp còn nhận đăng ký${hocKyLoc ? ` trong học kỳ ${hocKyLoc}` : ""}.`;
    }

    if (monDuocNhac.length && cauHoi.includes("tin chi")) {
        const lop = monDuocNhac[0].lop;
        return `Môn ${lop.tenmon} có ${Number(lop.sotinchi || 0)} tín chỉ.`;
    }

    if (monDuocNhac.length && /may gio|gio nao|ca nao|buoi nao|thu may|khi nao|lich mon|lich lop|hoc luc nao/.test(cauHoi)) {
        const maMon = String(monDuocNhac[0].lop.mamon || "").trim();
        const cacLop = tatCaLop.filter((lop) => String(lop.mamon || "").trim() === maMon);
        if (!cacLop.length) return `Mình chưa có dữ liệu lịch học của môn ${monDuocNhac[0].lop.tenmon}.`;
        return `<p>Lịch của môn ${chuyenThanhVanBanAnToan(monDuocNhac[0].lop.tenmon)}:</p>${cacLop.slice(0, 8).map(taoTheGoiYLop).join("")}`;
    }

    if (monDuocNhac.length && /dang ky duoc|co the dang ky|duoc dang ky|con nhan/.test(cauHoi)) {
        const maMon = String(monDuocNhac[0].lop.mamon || "").trim();
        const cacLop = danhSachLopMonCoTheDangKy.filter((lop) => String(lop.mamon || "").trim() === maMon);
        if (!cacLop.length) return `Hiện bạn không thể đăng ký thêm môn ${monDuocNhac[0].lop.tenmon} hoặc môn này không còn lớp hợp lệ.`;
        return `<p>Bạn có thể đăng ký ${cacLop.length} lớp của môn ${chuyenThanhVanBanAnToan(monDuocNhac[0].lop.tenmon)}:</p>${cacLop.map(taoTheGoiYLop).join("")}`;
    }

    if (/xem lich|xem thoi khoa bieu|lich hien tai|lich cua toi|thoi khoa bieu hien tai|thoi khoa bieu cua toi|tuan nay/.test(cauHoi)
        && !/lap|xep|tao|thiet ke|soan/.test(cauHoi)) {
        if (!danhSachMonDaDangKy.length) return "Bạn chưa có môn nào trong thời khóa biểu hiện tại.";
        return `<p>Thời khóa biểu hiện tại của bạn có ${danhSachMonDaDangKy.length} môn:</p>${[...danhSachMonDaDangKy]
            .sort((a, b) => Number(a.thu) - Number(b.thu) || phutTuGio(a.giobatdau) - phutTuGio(b.giobatdau))
            .map(taoTheGoiYLop).join("")}`;
    }

    if (/nen hoc gi|chon mon nao|goi y mon|mon nao.*khong trung|mon phu hop/.test(cauHoi)) {
        const maMonDaDangKy = new Set(danhSachMonDaDangKy.map((lop) => String(lop.mamon || "").trim()));
        const theoMon = new Map();
        danhSachLopMonCoTheDangKy.filter((lop) => !maMonDaDangKy.has(String(lop.mamon || "").trim())
            && lopKhongTrungDanhSach(lop, danhSachMonDaDangKy))
            .sort((a, b) => diemUuTienLop(b) - diemUuTienLop(a))
            .forEach((lop) => {
                const maMon = String(lop.mamon || "").trim();
                if (!theoMon.has(maMon)) theoMon.set(maMon, lop);
            });
        const goiY = [...theoMon.values()].slice(0, 5);
        if (!goiY.length) return "Hiện chưa có môn mới nào vừa còn chỗ vừa không trùng lịch của bạn.";
        return `<p>Mình ưu tiên ${goiY.length} môn không trùng lịch và còn nhiều chỗ:</p>${goiY.map(taoTheGoiYLop).join("")}`;
    }

    if (laYeuCauLapLich) {
        return lapThoiKhoaBieu(cauHoi);
    }

    if (/bao nhieu\s+(mon|lop)/.test(cauHoi) || /dang ky.*(may|bao nhieu)\s+(mon|lop)/.test(cauHoi)) {
        return `Bạn đã đăng ký ${danhSachMonDaDangKy.length} môn, tổng cộng ${tongTinChi} tín chỉ.`;
    }

    if (cauHoi.includes("tin chi")) {
        return `Bạn đã đăng ký ${danhSachMonDaDangKy.length} môn, tổng cộng ${tongTinChi} tín chỉ.`;
    }
    if (cauHoi.includes("trung lich") || cauHoi.includes("xung dot")) {
        return cacCapXungDotLich.length
            ? `Bạn đang có ${cacCapXungDotLich.length} cặp lớp trùng lịch. Hãy mở mục Lịch học để chọn lớp muốn giữ.`
            : "Hiện tại lịch học của bạn không có lớp nào bị trùng.";
    }
    if (cauHoi.includes("hom nay") || cauHoi.includes("ngay mai") || /\bmai\b/.test(cauHoi)
        || cauHoi.includes("toi hoc gi")) {
        const ngayCanXem = new Date();
        const laNgayMai = cauHoi.includes("ngay mai") || /\bmai\b/.test(cauHoi);
        if (laNgayMai) ngayCanXem.setDate(ngayCanXem.getDate() + 1);
        const thu = ngayCanXem.getDay() === 0 ? 8 : ngayCanXem.getDay() + 1;
        const khoa = khoaNgay(ngayCanXem);
        const cacLop = danhSachMonDaDangKy.filter((lop) => Number(lop.thu) === thu
            && (!lop.ngaybatdauhoc || khoa >= lop.ngaybatdauhoc)
            && (!lop.ngayketthuchoc || khoa <= lop.ngayketthuchoc));
        const nhanNgay = laNgayMai ? "Ngày mai" : "Hôm nay";
        if (!cacLop.length) return `${nhanNgay} bạn không có lịch học.`;
        return `<p>${nhanNgay} bạn có ${cacLop.length} lớp:</p>${cacLop.map(taoTheGoiYLop).join("")}`;
    }

    if ((cauHoi.includes("da dang ky") || cauHoi.includes("dang hoc") || cauHoi.includes("mon cua toi")
        || /dang ky.*chua|da hoc.*chua/.test(cauHoi))
        && !cauHoi.includes("bao nhieu")) {
        if (monDuocNhac.length) {
            const maMon = String(monDuocNhac[0].lop.mamon || "").trim();
            const daDangKy = danhSachMonDaDangKy.some((lop) => String(lop.mamon || "").trim() === maMon);
            return daDangKy
                ? `Bạn đã đăng ký môn ${monDuocNhac[0].lop.tenmon}.`
                : `Bạn chưa đăng ký môn ${monDuocNhac[0].lop.tenmon}.`;
        }
        if (!danhSachMonDaDangKy.length) return "Bạn chưa đăng ký môn nào.";
        return `<p>Bạn đã đăng ký ${danhSachMonDaDangKy.length} môn:</p>${danhSachMonDaDangKy.map(taoTheGoiYLop).join("")}`;
    }

    if ((cauHoi.includes("ai day") || cauHoi.includes("do ai day") || cauHoi.includes("giao vien nao") || cauHoi.includes("thay co nao"))
        && monDuocNhac.length) {
        const maMon = String(monDuocNhac[0].lop.mamon || "").trim();
        const cacLop = danhSachLopMonCoTheDangKy.filter((lop) => String(lop.mamon || "").trim() === maMon);
        const cacGiaoVien = [...new Map(cacLop.map((lop) => [lop.magv, lop])).values()];
        if (!cacGiaoVien.length) return `Môn ${monDuocNhac[0].lop.tenmon} hiện chưa có lớp nào còn nhận đăng ký.`;
        return `<p>Môn ${chuyenThanhVanBanAnToan(monDuocNhac[0].lop.tenmon)} hiện có ${cacGiaoVien.length} giảng viên:</p>${cacGiaoVien.map(taoTheGoiYLop).join("")}`;
    }

    if ((/day (mon|lop)? ?gi|day (mon|lop) nao/.test(cauHoi) || cauHoi.includes("lop cua") || cauHoi.includes("mon cua") || cauHoi.includes("co lop nao"))
        && giaoVienDuocNhac.length) {
        const maGiaoVien = String(giaoVienDuocNhac[0].lop.magv || "").trim();
        const cacLop = danhSachLopMonCoTheDangKy.filter((lop) => String(lop.magv || "").trim() === maGiaoVien);
        if (!cacLop.length) return `${giaoVienDuocNhac[0].lop.tengiaovien} hiện chưa có lớp nào còn nhận đăng ký.`;
        return `<p>Các lớp đang mở của ${chuyenThanhVanBanAnToan(giaoVienDuocNhac[0].lop.tengiaovien)}:</p>${cacLop.slice(0, 6).map(taoTheGoiYLop).join("")}`;
    }

    if (cauHoi.includes("con cho") || cauHoi.includes("sap day") || cauHoi.includes("han dang ky")
        || cauHoi.includes("lop dang mo")) {
        let nguonLop = [...danhSachLopMonCoTheDangKy];
        if (monDuocNhac.length) {
            const maMon = String(monDuocNhac[0].lop.mamon || "").trim();
            nguonLop = nguonLop.filter((lop) => String(lop.mamon || "").trim() === maMon);
        }
        if (giaoVienDuocNhac.length) {
            const maGiaoVien = String(giaoVienDuocNhac[0].lop.magv || "").trim();
            nguonLop = nguonLop.filter((lop) => String(lop.magv || "").trim() === maGiaoVien);
        }
        nguonLop = nguonLop.filter((lop) => (!hocKyLoc || Number(lop.hocky) === hocKyLoc)
            && (!namHocLoc || Number(lop.namhoc) === namHocLoc)
            && (!thuLoc || Number(lop.thu) === thuLoc)
            && (!khoangGioLoc || (phutTuGio(lop.giobatdau) >= khoangGioLoc.batDau
                && phutTuGio(lop.gioketthuc) <= khoangGioLoc.ketThuc)));
        const sapTheoChoTrongTangDan = cauHoi.includes("sap day") || cauHoi.includes("it cho");
        const cacLop = nguonLop
            .sort((a, b) => {
                const choA = Number(a.sisotoida) - Number(a.sisodadangky);
                const choB = Number(b.sisotoida) - Number(b.sisodadangky);
                return sapTheoChoTrongTangDan ? choA - choB : choB - choA;
            })
            .slice(0, 6);
        if (!cacLop.length) return "Hiện không có lớp nào còn nhận đăng ký.";
        const cachSap = sapTheoChoTrongTangDan ? "gần đầy nhất" : "còn nhiều chỗ nhất";
        return `<p>Đây là ${cacLop.length} lớp ${cachSap}:</p>${cacLop.map(taoTheGoiYLop).join("")}`;
    }

    const thu = thuTrongCau;
    const khoangGio = khoangGioTrongCau;
    const { hocKy, namHoc } = hocKyVaNamHocTrongCau;

    if (thu || khoangGio || cauHoi.includes("goi y") || cauHoi.includes("suggest") || cauHoi.includes("ranh")) {
        const dangHoiNganhIT = /\b(it|cntt)\b/.test(cauHoi) || cauHoi.includes("cong nghe thong tin");
        return goiYLopTheoLichTrong({ thu, khoangGio, hocKy, namHoc, dangHoiNganhIT });
    }

    if (monDuocNhac.length) {
        const maMon = String(monDuocNhac[0].lop.mamon || "").trim();
        const cacLop = danhSachLopMonCoTheDangKy.filter((lop) => String(lop.mamon || "").trim() === maMon);
        if (!cacLop.length) return `Bạn đang hỏi về ${monDuocNhac[0].lop.tenmon}, nhưng hiện môn này không có lớp còn nhận đăng ký.`;
        return `<p>Mình hiểu bạn đang hỏi về ${chuyenThanhVanBanAnToan(monDuocNhac[0].lop.tenmon)}. Đây là các lớp hiện có:</p>${cacLop.map(taoTheGoiYLop).join("")}`;
    }

    if (giaoVienDuocNhac.length) {
        const maGiaoVien = String(giaoVienDuocNhac[0].lop.magv || "").trim();
        const cacLop = danhSachLopMonCoTheDangKy.filter((lop) => String(lop.magv || "").trim() === maGiaoVien);
        if (!cacLop.length) return `${giaoVienDuocNhac[0].lop.tengiaovien} hiện chưa có lớp nào còn nhận đăng ký.`;
        return `<p>Mình hiểu bạn đang hỏi về ${chuyenThanhVanBanAnToan(giaoVienDuocNhac[0].lop.tengiaovien)}. Đây là các lớp đang mở:</p>${cacLop.map(taoTheGoiYLop).join("")}`;
    }

    return "Mình chưa hiểu trọn ý bạn, nhưng có thể tiếp tục nếu bạn nói theo cách tự nhiên như: “Lập thời khóa biểu 4 môn học kỳ 1, phải có Java do cô Vân dạy”, “Thầy Hoàng đang dạy môn gì?” hoặc “Hôm nay tôi học gì?”.";
}

async function xuLyCauHoiAI(cauHoi) {
    const noiDung = String(cauHoi || "").trim();
    if (!noiDung) return;
    themTinNhanAI(noiDung, "user");
    aiChatInput.value = "";
    const dangNhap = themTinNhanAI('<span class="ai-typing"><i></i><i></i><i></i></span>', "assistant", true);
    await new Promise((resolve) => window.setTimeout(resolve, 450));
    dangNhap?.remove();
    const traLoi = traLoiTroLy(noiDung);
    themTinNhanAI(traLoi, "assistant", traLoi.includes("<article") || traLoi.includes("<p>"));
}

function moTroLyAI() {
    if (!aiChatbox) return;
    aiChatbox.hidden = false;
    aiChatToggle?.setAttribute("aria-expanded", "true");
    if (!aiDaChao) {
        themTinNhanAI("Chào bạn! Mình có thể lập thời khóa biểu từ các môn chưa đăng ký, ưu tiên đúng môn và giảng viên bạn yêu cầu, đồng thời tự loại mọi lớp trùng lịch.");
        aiDaChao = true;
    }
    aiChatInput?.focus();
}

let aiDangNhanRobot = false;
let aiRobotDaKeo = false;
let aiBoQuaLanBamRobot = false;
let aiDiemBatDauRobotX = 0;
let aiDiemBatDauRobotY = 0;
let aiDoLechRobotX = 0;
let aiDoLechRobotY = 0;

aiChatToggle?.addEventListener("click", (suKien) => {
    if (aiBoQuaLanBamRobot) {
        aiBoQuaLanBamRobot = false;
        suKien.preventDefault();
        return;
    }
    if (!aiChatbox?.hidden) {
        aiChatbox.hidden = true;
        aiChatToggle.setAttribute("aria-expanded", "false");
        return;
    }
    moTroLyAI();
});
document.getElementById("ai-chat-close")?.addEventListener("click", () => {
    aiChatbox.hidden = true;
    aiChatToggle?.setAttribute("aria-expanded", "false");
});

function layVungDiChuyenRobot() {
    const noiDungChinh = document.querySelector(".main-content");
    const sectionDangMo = document.querySelector(".student-section:not(.hidden-section)");
    const khungRobot = aiChatToggle?.getBoundingClientRect();
    const khungSection = sectionDangMo?.getBoundingClientRect();
    if (khungSection && khungRobot
        && khungSection.width >= khungRobot.width + 24
        && Math.min(khungSection.bottom, window.innerHeight) - Math.max(khungSection.top, 0) >= khungRobot.height + 24) {
        return khungSection;
    }
    return noiDungChinh?.getBoundingClientRect() || {
        left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight
    };
}

function datViTriRobotTrongPhamVi(x, y) {
    if (!aiChatToggle) return;
    const khung = aiChatToggle.getBoundingClientRect();
    const viTri = gioiHanViTriTroLy(
        x, y, khung.width, khung.height, layVungDiChuyenRobot(), window.innerWidth, window.innerHeight
    );
    aiChatToggle.style.left = `${viTri.x}px`;
    aiChatToggle.style.top = `${viTri.y}px`;
    aiChatToggle.style.right = "auto";
    aiChatToggle.style.bottom = "auto";
}

function datLaiViTriRobot() {
    aiDangNhanRobot = false;
    aiRobotDaKeo = false;
    aiChatToggle?.classList.remove("is-dragging");
    aiChatToggle?.style.removeProperty("left");
    aiChatToggle?.style.removeProperty("top");
    aiChatToggle?.style.removeProperty("right");
    aiChatToggle?.style.removeProperty("bottom");
}

aiChatToggle?.addEventListener("dblclick", (suKien) => {
    if (window.innerWidth <= 760) return;
    suKien.preventDefault();
    datLaiViTriRobot();
});

aiChatToggle?.addEventListener("pointerdown", (suKien) => {
    if (window.innerWidth <= 760 || suKien.button !== 0) return;
    const khung = aiChatToggle.getBoundingClientRect();
    aiDangNhanRobot = true;
    aiRobotDaKeo = false;
    aiDiemBatDauRobotX = suKien.clientX;
    aiDiemBatDauRobotY = suKien.clientY;
    aiDoLechRobotX = suKien.clientX - khung.left;
    aiDoLechRobotY = suKien.clientY - khung.top;
    aiChatToggle.setPointerCapture?.(suKien.pointerId);
});

aiChatToggle?.addEventListener("pointermove", (suKien) => {
    if (!aiDangNhanRobot) return;
    if (!aiRobotDaKeo && Math.hypot(
        suKien.clientX - aiDiemBatDauRobotX, suKien.clientY - aiDiemBatDauRobotY
    ) < 6) return;
    aiRobotDaKeo = true;
    aiChatToggle.classList.add("is-dragging");
    datViTriRobotTrongPhamVi(suKien.clientX - aiDoLechRobotX, suKien.clientY - aiDoLechRobotY);
    suKien.preventDefault?.();
});

function dungDiChuyenRobot(suKien) {
    if (!aiDangNhanRobot) return;
    aiDangNhanRobot = false;
    if (aiRobotDaKeo) aiBoQuaLanBamRobot = true;
    aiChatToggle?.classList.remove("is-dragging");
    if (suKien?.pointerId !== undefined) aiChatToggle?.releasePointerCapture?.(suKien.pointerId);
}

aiChatToggle?.addEventListener("pointerup", dungDiChuyenRobot);
aiChatToggle?.addEventListener("pointercancel", dungDiChuyenRobot);
window.addEventListener("resize", () => {
    if (window.innerWidth <= 760) {
        datLaiViTriRobot();
        return;
    }
    if (aiChatToggle && aiChatToggle.style.left) {
        const khung = aiChatToggle.getBoundingClientRect();
        datViTriRobotTrongPhamVi(khung.left, khung.top);
    }
});
window.addEventListener("hashchange", () => {
    window.setTimeout(() => {
        if (!aiChatToggle?.style.left) return;
        const khung = aiChatToggle.getBoundingClientRect();
        datViTriRobotTrongPhamVi(khung.left, khung.top);
    }, 0);
});

aiChatForm?.addEventListener("submit", (suKien) => { suKien.preventDefault(); xuLyCauHoiAI(aiChatInput.value); });
document.querySelectorAll("[data-ai-question]").forEach((nut) => nut.addEventListener("click", () => xuLyCauHoiAI(nut.dataset.aiQuestion)));
aiChatMessages?.addEventListener("click", function (suKien) {
    const nut = suKien.target.closest("[data-ai-course]");
    if (!nut) return;
    window.location.hash = "dang-ky-mon";
    if (availableCourseSearch) {
        availableCourseSearch.value = nut.dataset.aiCourse;
        locVaSapXepLopMon();
    }
    aiChatbox.hidden = true;
    aiChatToggle?.setAttribute("aria-expanded", "false");
});
