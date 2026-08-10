let maSinhVienDangNhap = null;
let trangSinhVienDaKhoiTao = false;

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
    availableSection.classList.add(
        "hidden-section"
    );

    registeredSection.classList.add(
        "hidden-section"
    );

    availableMenu.classList.remove(
        "active"
    );

    registeredMenu.classList.remove(
        "active"
    );

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

                        <td>
                            ${chuyenThanhSoAnToan(
                                lopMon.sisodadangky
                            )}
                            /
                            ${chuyenThanhSoAnToan(
                                lopMon.sisotoida
                            )}
                        </td>

                        <td>
                            ${chuyenThanhVanBanAnToan(
                                dinhDangNgayGio(
                                    lopMon.ngayketthucdk
                                )
                            )}
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
                                lopMon.ngayketthucdk
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

        hienThiLopMonCoTheDangKy(
            danhSachHoanChinh
        );

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
                    colspan="8"
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

                        <td>
                            ${chuyenThanhVanBanAnToan(
                                dinhDangNgay(
                                    lopMon.ngaydangky
                                )
                            )}
                        </td>

                        <td>
                            <span class="registration-status">
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
            hienThiMonDaDangKy(
                []
            );

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

        hienThiMonDaDangKy(
            danhSachHopLe
        );

    } catch (loi) {
        console.error(
            "Không thể tải môn đã đăng ký:",
            loi
        );

        registeredCourseBody.innerHTML = `
            <tr>
                <td
                    colspan="8"
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
