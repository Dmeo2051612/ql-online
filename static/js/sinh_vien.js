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

function layGhiChuLich() {
    return window.QLStudentNotes?.getAll() || [];
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

        window.QLStudentNotes?.load()
            .then(() => window.QLStudentNotes.migrateLegacy(maSinhVien))
            .then(veLichHoc)
            .catch((loi) => console.error("Không thể đồng bộ ghi chú:", loi));

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
calendarNoteForm?.addEventListener("submit", async function (suKien) {
    suKien.preventDefault();
    const ngay = document.getElementById("calendar-note-date")?.value || "";
    const gio = document.getElementById("calendar-note-time")?.value || "";
    const noidung = document.getElementById("calendar-note-content")?.value.trim() || "";
    if (!ngay || !noidung) return;
    const submitButton = calendarNoteForm.querySelector('button[type="submit"]');
    const oldLabel = submitButton?.textContent;
    if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = "Đang lưu...";
    }
    try {
        await window.QLStudentNotes.create({ ngay, gio, noidung });
        calendarNoteForm.reset();
        const oNgayGhiChu = document.getElementById("calendar-note-date");
        if (oNgayGhiChu) oNgayGhiChu.value = ngay;
        veLichHoc();
    } catch (loi) {
        alert(loi.message || "Không thể lưu ghi chú.");
    } finally {
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = oldLabel;
        }
    }
});
studentCalendar?.addEventListener("click", async function (suKien) {
    const nutXoa = suKien.target.closest(".calendar-note-delete");
    if (!nutXoa) return;
    nutXoa.disabled = true;
    try {
        await window.QLStudentNotes.remove(nutXoa.dataset.noteId);
        veLichHoc();
    } catch (loi) {
        nutXoa.disabled = false;
        alert(loi.message || "Không thể xóa ghi chú.");
    }
});

window.addEventListener("calendar-notes-updated", veLichHoc);

studentConflictList?.addEventListener("click", async function (suKien) {
    const nut = suKien.target.closest("[data-keep-course]");
    if (!nut) return;
    await giaiQuyetXungDotLich(nut.dataset.keepCourse, nut.dataset.dropCourse, nut);
});
