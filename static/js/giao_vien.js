let danhSachSinhVienHienTai = [];

let maGiaoVienDaLay = null;



// =========================
// CÁC PHẦN TỬ GIAO DIỆN
// =========================


// ----- MENU -----

const overviewMenu =
    document.getElementById(
        "teacher-overview-menu"
    );

const classesMenu =
    document.getElementById(
        "teacher-classes-menu"
    );


// ----- SECTION -----

const overviewSection =
    document.getElementById(
        "teacher-overview-section"
    );

const classesSection =
    document.getElementById(
        "teacher-classes-section"
    );


// ----- BẢNG LỚP MÔN -----

const classesTableBody =
    document.getElementById(
        "teacher-classes-body"
    );


// ----- THỐNG KÊ -----

const totalTeacherClasses =
    document.getElementById(
        "total-teacher-classes"
    );

const totalTeacherStudents =
    document.getElementById(
        "total-teacher-students"
    );

const totalOpenClasses =
    document.getElementById(
        "total-open-classes"
    );


// ----- MODAL SINH VIÊN -----

const studentsModal =
    document.getElementById(
        "students-modal"
    );

const closeStudentsModalButton =
    document.getElementById(
        "close-students-modal"
    );

const studentsModalTitle =
    document.getElementById(
        "students-modal-title"
    );

const studentsModalDescription =
    document.getElementById(
        "students-modal-description"
    );

const studentsModalCount =
    document.getElementById(
        "students-modal-count"
    );

const studentsTableBody =
    document.getElementById(
        "students-table-body"
    );

const studentSearchInput =
    document.getElementById(
        "student-search-input"
    );













async function layMaGiaoVienDangNhap() {
    if (maGiaoVienDaLay) {
        return maGiaoVienDaLay;
    }


    const { auth, db } = await import(
        "/static/js/firebase-config.js"
    );

    await auth.authStateReady();

    const {
        doc,
        getDoc
    } = await import(
        "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js"
    );

    const user = auth.currentUser;

    if (!user) {
        throw new Error(
            "Bạn chưa đăng nhập Firebase."
        );
    }

    const taiLieuNguoiDung = await getDoc(
        doc(
            db,
            "users",
            user.uid
        )
    );

    if (!taiLieuNguoiDung.exists()) {
        throw new Error(
            "Không tìm thấy thông tin tài khoản."
        );
    }

    const nguoiDung =
        taiLieuNguoiDung.data();

    const vaiTro = String(
        nguoiDung.role || ""
    )
        .trim()
        .toLowerCase();

    if (vaiTro !== "giaovien") {
        throw new Error(
            "Tài khoản này không phải giáo viên."
        );
    }

    const maGiaoVien = String(
        nguoiDung.magv || ""
    ).trim();

    if (!maGiaoVien) {
        throw new Error(
            "Không tìm thấy mã giáo viên."
        );
    }

    maGiaoVienDaLay =
        maGiaoVien;

    return maGiaoVienDaLay;
}





function chuyenThanhVanBanAnToan(giaTri) {
    const phanTuTam =
        document.createElement("div");

    phanTuTam.textContent =
        String(giaTri ?? "");

    return phanTuTam.innerHTML;
}







function hienThiSection(sectionCanHien, menuCanChon) {
    overviewSection.classList.add("hidden-section");
    classesSection.classList.add("hidden-section");

    overviewMenu.classList.remove("active");
    classesMenu.classList.remove("active");

    sectionCanHien.classList.remove("hidden-section");
    menuCanChon.classList.add("active");
}




function xuLyDieuHuongTuHash() {
    const hashHienTai =
        window.location.hash;


    if (
        hashHienTai ===
        "#lop-mon-phu-trach"
    ) {
        hienThiSection(
            classesSection,
            classesMenu
        );

        taiDanhSachLopMon();

        return;
    }


    hienThiSection(
        overviewSection,
        overviewMenu
    );
}





overviewMenu.addEventListener(
    "click",
    function (event) {
        event.preventDefault();


        if (
            window.location.hash !==
            "#tong-quan"
        ) {
            window.location.hash =
                "tong-quan";

            return;
        }


        hienThiSection(
            overviewSection,
            overviewMenu
        );
    }
);



classesMenu.addEventListener(
    "click",
    function (event) {
        event.preventDefault();


        if (
            window.location.hash !==
            "#lop-mon-phu-trach"
        ) {
            window.location.hash =
                "lop-mon-phu-trach";

            return;
        }


        hienThiSection(
            classesSection,
            classesMenu
        );

        taiDanhSachLopMon();
    }
);





window.addEventListener(
    "hashchange",
    xuLyDieuHuongTuHash
);







async function taiDanhSachLopMon() {
    classesTableBody.innerHTML = `
        <tr>
            <td colspan="8">
                Đang tải danh sách lớp môn...
            </td>
        </tr>
    `;

    try {
        // =========================
        // 1. LẤY FIRESTORE
        // =========================
        const { db } = await import(
            "/static/js/firebase-config.js"
        );


        // =========================
        // 2. IMPORT HÀM FIRESTORE
        // =========================
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


        // =========================
        // 3. LẤY MÃ GIÁO VIÊN
        // =========================
        const maGiaoVien =
            await layMaGiaoVienDangNhap();


        // =========================
        // 4. QUERY LỚP MÔN
        // =========================
        const truyVanLopMon = query(
            collection(
                db,
                "lopmon"
            ),

            where(
                "magv",
                "==",
                maGiaoVien
            )
        );


        const ketQuaLopMon =
            await getDocs(truyVanLopMon);


        // =========================
        // 5. GHÉP THÔNG TIN MÔN HỌC
        // =========================
        const danhSach = await Promise.all(
            ketQuaLopMon.docs.map(
                async function (taiLieuLopMon) {
                    const lopMon =
                        taiLieuLopMon.data();


                    const maMon = String(
                        lopMon.mamon || ""
                    ).trim();


                    let tenMon = "";
                    let soTinChi = 0;


                    if (maMon) {
                        const taiLieuMonHoc =
                            await getDoc(
                                doc(
                                    db,
                                    "monhoc",
                                    maMon
                                )
                            );


                        if (taiLieuMonHoc.exists()) {
                            const monHoc =
                                taiLieuMonHoc.data();


                            tenMon = String(
                                monHoc.tenmon || ""
                            ).trim();


                            soTinChi =
                                chuyenThanhSoAnToan(
                                    monHoc.sotinchi
                                );
                        }
                    }


                    return {
                        malopmon:
                            taiLieuLopMon.id,

                        mamon:
                            maMon,

                        tenmon:
                            tenMon,

                        sotinchi:
                           soTinChi,

                        hocky:
                            chuyenThanhSoAnToan(
                                lopMon.hocky
                            ),

                        namhoc:
                            chuyenThanhSoAnToan(
                                lopMon.namhoc
                            ),

                        sisotoida:
                            chuyenThanhSoAnToan(
                                lopMon.sisotoida
                            ),

                        sisodadangky:
                            chuyenThanhSoAnToan(
                                lopMon.sisodadangky
                            ),

                        trangthai:
                            String(
                                lopMon.trangthai || ""
                            ).trim()
                    };
                }
            )
        );


        // =========================
        // 6. SẮP XẾP THEO MÃ LỚP
        // =========================
        danhSach.sort(
            function (lopA, lopB) {
                return String(
                    lopA.malopmon
                ).localeCompare(
                    String(
                        lopB.malopmon
                    )
                );
            }
        );


        // =========================
        // 7. KHÔNG CÓ LỚP MÔN
        // =========================
        if (danhSach.length === 0) {
            classesTableBody.innerHTML = `
                <tr>
                    <td colspan="8">
                        Bạn chưa được phân công lớp môn nào.
                    </td>
                </tr>
            `;

            return;
        }


        // =========================
        // 8. TẠO CÁC DÒNG BẢNG
        // =========================
        const cacDong = danhSach.map(
            function (lopMon) {
                const trangThai = String(
                    lopMon.trangthai || ""
                ).trim();


                const dangMo =
                    laTrangThaiMo(trangThai);


                const trangThaiClass =
                    dangMo
                        ? "status-open"
                        : "status-closed";


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
                            ${lopMon.sotinchi}
                        </td>

                        <td>
                            Học kỳ ${lopMon.hocky}
                        </td>

                        <td>
                            ${lopMon.namhoc}
                            -
                            ${lopMon.namhoc + 1}
                        </td>

                        <td>
                            ${lopMon.sisodadangky}
                            /
                            ${lopMon.sisotoida}
                        </td>

                        <td>
                            <span
                                class="teacher-status ${trangThaiClass}"
                            >
                                ${chuyenThanhVanBanAnToan(
                                    trangThai
                                )}
                            </span>
                        </td>

                        <td>
                            <button
                                type="button"
                                class="view-students-button"
                            >
                                Xem sinh viên
                            </button>
                        </td>
                    </tr>
                `;
            }
        ).join("");


        // =========================
        // 9. ĐƯA CÁC DÒNG VÀO BẢNG
        // =========================
        classesTableBody.innerHTML =
            cacDong;


        // =========================
        // 10. GÁN MALOPMON CHO NÚT
        // =========================
        const cacNutXemSinhVien =
            classesTableBody.querySelectorAll(
                ".view-students-button"
            );


        cacNutXemSinhVien.forEach(
            function (nut, viTri) {
                nut.dataset.malopmon =
                    danhSach[viTri].malopmon;
            }
        );


    } catch (loi) {
        console.error(
            "Không thể tải lớp môn:",
            loi
        );


        classesTableBody.innerHTML = `
            <tr>
                <td colspan="8">
                    ${chuyenThanhVanBanAnToan(
                        loi.message ||
                        "Không thể tải danh sách lớp môn."
                    )}
                </td>
            </tr>
        `;
    }
}






function dongModalSinhVien() {
    studentsModal.classList.add(
        "hidden"
    );

    studentSearchInput.value = "";

    danhSachSinhVienHienTai = [];
}





async function moDanhSachSinhVien(malopmon) {

    malopmon = String(
        malopmon || ""
    ).trim();


    if (!malopmon) {
        alert(
            "Không lấy được mã lớp môn."
        );

        return;
    }


    // =========================
    // 1. CHUẨN BỊ MODAL
    // =========================
    studentSearchInput.value = "";

    danhSachSinhVienHienTai = [];

    studentsModalTitle.textContent =
        `Danh sách sinh viên - ${malopmon}`;

    studentsModalDescription.textContent =
        `Sinh viên đã đăng ký lớp ${malopmon}.`;

    studentsModalCount.textContent = "0";

    studentsTableBody.innerHTML = `
        <tr>
            <td colspan="6">
                Đang tải danh sách sinh viên...
            </td>
        </tr>
    `;

    studentsModal.classList.remove("hidden");


    try {
        // =========================
        // 2. LẤY FIRESTORE
        // =========================
        const { db } = await import(
            "/static/js/firebase-config.js"
        );


        const {
            collection,
            getDocs,
            query,
            where,
            doc,
            getDoc
        } = await import(
            "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js"
        );


        // =========================
        // 3. LẤY CÁC PHIẾU ĐĂNG KÝ
        // =========================
        const truyVanDangKy = query(
            collection(
                db,
                "dangky"
            ),

            where(
                "malopmon",
                "==",
                malopmon
            )
        );


        const ketQuaDangKy =
            await getDocs(truyVanDangKy);


        const danhSachDangKy =
            ketQuaDangKy.docs.map(
                function (taiLieu) {
                    return {
                        madangky:
                            taiLieu.id,

                        ...taiLieu.data()
                    };
                }
            );


        // =========================
        // 4. GHÉP HỒ SƠ SINH VIÊN
        // =========================
        const danhSachSinhVien =
            await Promise.all(
                danhSachDangKy.map(
                    async function (dangKy) {

                        const maSinhVien = String(
                            dangKy.masv || ""
                        ).trim();


                        if (!maSinhVien) {
                            return null;
                        }


                        const taiLieuSinhVien =
                            await getDoc(
                                doc(
                                    db,
                                    "sinhvien",
                                    maSinhVien
                                )
                            );


                        if (!taiLieuSinhVien.exists()) {
                            return null;
                        }


                        const sinhVien =
                            taiLieuSinhVien.data();


                        // =========================
                        // 5. LẤY THÔNG TIN KHOA
                        // =========================
                        const maKhoa = String(
                            sinhVien.makhoa || ""
                        ).trim();


                        let tenKhoa = "";


                        if (maKhoa) {
                            const taiLieuKhoa =
                                await getDoc(
                                    doc(
                                        db,
                                        "khoa",
                                        maKhoa
                                    )
                                );


                            if (taiLieuKhoa.exists()) {
                                tenKhoa = String(
                                    taiLieuKhoa
                                        .data()
                                        .tenkhoa || ""
                                ).trim();
                            }
                        }


                        // =========================
                        // 6. ĐỊNH DẠNG NGÀY ĐĂNG KÝ
                        // =========================
                        let ngayDangKy = "";


                        if (
                            dangKy.ngaydangky &&
                            typeof dangKy.ngaydangky.toDate
                                === "function"
                        ) {
                            ngayDangKy =
                                dinhDangNgay(
                                    dangKy.ngaydangky.toDate()
                                );
                        }

                        // =========================
                        // 7. TRẢ VỀ OBJECT HOÀN CHỈNH
                        // =========================
                        return {
                            masv:
                                maSinhVien,

                            hoten:
                                String(
                                    sinhVien.hoten || ""
                                ).trim(),

                            mail:
                                String(
                                    sinhVien.mail || ""
                                ).trim(),

                            makhoa:
                                maKhoa,

                            tenkhoa:
                                tenKhoa,

                            ngaydangky:
                                ngayDangKy,

                            trangthai:
                                String(
                                    dangKy.trangthai || ""
                                ).trim()
                        };
                    }
                )
            );


        // =========================
        // 8. BỎ DỮ LIỆU KHÔNG HỢP LỆ
        // =========================
        const danhSachSinhVienHopLe =
            danhSachSinhVien.filter(
                function (sinhVien) {
                    return sinhVien !== null;
                }
            );


        // =========================
        // 9. LƯU DANH SÁCH CHO TÌM KIẾM
        // =========================
        danhSachSinhVienHienTai =
            danhSachSinhVienHopLe;


        // =========================
        // 10. CẬP NHẬT TỔNG SỐ
        // =========================
        studentsModalCount.textContent =
            danhSachSinhVienHopLe.length;


        // =========================
        // 11. HIỂN THỊ BẢNG
        // =========================
        hienThiDanhSachSinhVien(
            danhSachSinhVienHopLe
        );


    } catch (loi) {
        console.error(
            "Không thể tải danh sách sinh viên:",
            loi
        );


        studentsTableBody.innerHTML = `
            <tr>
                <td colspan="6">
                    ${chuyenThanhVanBanAnToan(
                        loi.message ||
                        "Không thể tải danh sách sinh viên."
                    )}
                </td>
            </tr>
        `;
    }
}






classesTableBody.addEventListener(
    "click",
    function (event) {
        const button =
            event.target.closest(
                ".view-students-button"
            );


        if (!button) {
            return;
        }


        moDanhSachSinhVien(
            button.dataset.malopmon
        );
    }
);





closeStudentsModalButton.addEventListener(
    "click",
    dongModalSinhVien
);


studentsModal.addEventListener("click", function (event) {
    if (event.target === studentsModal) {
        dongModalSinhVien();
    }
});




document.addEventListener(
    "keydown",
    function (event) {
        if (
            event.key !== "Escape"
        ) {
            return;
        }


        if (
            studentsModal.classList.contains(
                "hidden"
            )
        ) {
            return;
        }


        dongModalSinhVien();
    }
);






async function taiThongKeTongQuan() {
    try {
        // =========================
        // 1. LẤY FIRESTORE
        // =========================
        const { db } = await import(
            "/static/js/firebase-config.js"
        );


        // =========================
        // 2. IMPORT HÀM FIRESTORE
        // =========================
        const {
            collection,
            getDocs,
            query,
            where
        } = await import(
            "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js"
        );


        // =========================
        // 3. LẤY MÃ GIÁO VIÊN
        // =========================
        const maGiaoVien =
            await layMaGiaoVienDangNhap();


        // =========================
        // 4. QUERY LỚP MÔN
        // =========================
        const truyVanLopMon = query(
            collection(
                db,
                "lopmon"
            ),

            where(
                "magv",
                "==",
                maGiaoVien
            )
        );


        const ketQuaLopMon =
            await getDocs(truyVanLopMon);


        // =========================
        // 5. CHUYỂN DOCUMENT THÀNH OBJECT
        // =========================
        const danhSachLopMon =
            ketQuaLopMon.docs.map(
                function (taiLieu) {
                    return {
                        malopmon:
                            taiLieu.id,

                        ...taiLieu.data()
                    };
                }
            );


        // =========================
        // 6. TỔNG SỐ LỚP PHỤ TRÁCH
        // =========================
        const tongSoLop =
            danhSachLopMon.length;


        // =========================
        // 7. TỔNG SỐ SINH VIÊN
        // =========================
        const tongSoSinhVien =
            danhSachLopMon.reduce(
                function (tong, lopMon) {
                    return (
                        tong +
                        chuyenThanhSoAnToan(
                            lopMon.sisodadangky
                        )
                    );
                },
                0
            );


        // =========================
        // 8. TỔNG SỐ LỚP ĐANG MỞ
        // =========================
        const tongSoLopDangMo =
            danhSachLopMon.filter(
                function (lopMon) {
                    return laTrangThaiMo(
                        lopMon.trangthai
                    );
                }
            ).length;


        // =========================
        // 9. HIỂN THỊ THỐNG KÊ
        // =========================
        totalTeacherClasses.textContent =
            tongSoLop;

        totalTeacherStudents.textContent =
            tongSoSinhVien;

        totalOpenClasses.textContent =
            tongSoLopDangMo;


    } catch (loi) {
        console.error(
            "Lỗi tải thống kê giáo viên:",
            loi
        );


        totalTeacherClasses.textContent =
            "0";

        totalTeacherStudents.textContent =
            "0";

        totalOpenClasses.textContent =
            "0";
    }
}







function hienThiDanhSachSinhVien(danhSach) {
    // =========================
    // 1. KHÔNG CÓ SINH VIÊN
    // =========================
    if (
        !Array.isArray(danhSach) ||
        danhSach.length === 0
    ) {
        studentsTableBody.innerHTML = `
            <tr>
                <td colspan="6">
                    Không tìm thấy sinh viên.
                </td>
            </tr>
        `;

        return;
    }


    // =========================
    // 2. TẠO CÁC DÒNG SINH VIÊN
    // =========================
    const cacDong = danhSach.map(
        function (sinhVien) {

            const trangThai = String(
                sinhVien.trangthai || ""
            ).trim();


            const trangThaiClass =
                trangThai.toUpperCase() ===
                "ĐÃ ĐĂNG KÝ"
                    ? "status-open"
                    : "status-closed";


            // =========================
            // 3. TẠO CHUỖI KHOA
            // =========================
            const maKhoa = String(
                sinhVien.makhoa || ""
            ).trim();

            const tenKhoa = String(
                sinhVien.tenkhoa || ""
            ).trim();


            let thongTinKhoa = "";


            if (maKhoa && tenKhoa) {
                thongTinKhoa =
                    `${maKhoa} - ${tenKhoa}`;
            } else if (maKhoa) {
                thongTinKhoa =
                    maKhoa;
            } else if (tenKhoa) {
                thongTinKhoa =
                    tenKhoa;
            }


            // =========================
            // 4. TẠO DÒNG BẢNG
            // =========================
            return `
                <tr>
                    <td>
                        ${chuyenThanhVanBanAnToan(
                            sinhVien.masv
                        )}
                    </td>

                    <td>
                        ${chuyenThanhVanBanAnToan(
                            sinhVien.hoten
                        )}
                    </td>

                    <td>
                        ${chuyenThanhVanBanAnToan(
                            sinhVien.mail
                        )}
                    </td>

                    <td>
                        ${chuyenThanhVanBanAnToan(
                            thongTinKhoa
                        )}
                    </td>

                    <td>
                        ${chuyenThanhVanBanAnToan(
                            sinhVien.ngaydangky
                        )}
                    </td>

                    <td>
                        <span
                            class="teacher-status ${trangThaiClass}"
                        >
                            ${chuyenThanhVanBanAnToan(
                                trangThai
                            )}
                        </span>
                    </td>
                </tr>
            `;
        }
    ).join("");


    // =========================
    // 5. ĐƯA VÀO BẢNG
    // =========================
    studentsTableBody.innerHTML =
        cacDong;
}







studentSearchInput.addEventListener(
    "input",
    function () {
        // =========================
        // 1. LẤY TỪ KHÓA
        // =========================
        const tuKhoa = String(
            studentSearchInput.value || ""
        )
            .trim()
            .toLowerCase();


        // =========================
        // 2. KHÔNG NHẬP GÌ
        // =========================
        if (!tuKhoa) {
            hienThiDanhSachSinhVien(
                danhSachSinhVienHienTai
            );

            return;
        }


        // =========================
        // 3. LỌC SINH VIÊN
        // =========================
        const danhSachDaLoc =
            danhSachSinhVienHienTai.filter(
                function (sinhVien) {

                    const noiDungTimKiem = [
                        sinhVien.masv,
                        sinhVien.hoten,
                        sinhVien.mail,
                        sinhVien.makhoa,
                        sinhVien.tenkhoa
                    ]
                        .map(function (giaTri) {
                            return String(
                                giaTri || ""
                            ).toLowerCase();
                        });


                    return noiDungTimKiem.some(
                        function (noiDung) {
                            return noiDung.includes(
                                tuKhoa
                            );
                        }
                    );
                }
            );


        // =========================
        // 4. HIỂN THỊ KẾT QUẢ
        // =========================
        hienThiDanhSachSinhVien(
            danhSachDaLoc
        );
    }
);




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




function chuyenThanhSoAnToan(giaTri) {
    const so = Number(giaTri);

    if (!Number.isFinite(so)) {
        return 0;
    }

    return so;
}




function dinhDangNgay(ngay) {
    if (!(ngay instanceof Date)) {
        return "";
    }

    if (Number.isNaN(ngay.getTime())) {
        return "";
    }

    return ngay.toLocaleDateString(
        "vi-VN",
        {
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        }
    );
}



xuLyDieuHuongTuHash();

taiThongKeTongQuan();