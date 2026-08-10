


let cheDoForm = "them"
let maSinhVienDangSua = null;


let cheDoFormGiaoVien = "them";
let maGiaoVienDangSua = null;


function taoO(noiDung) {
    const o = document.createElement("td");
    o.textContent = noiDung || "-";

    return o;
}


function hienThiDanhSachSinhVien(danhSach) {
    const thanBang = document.getElementById(
        "student-table-body"
    );

    thanBang.innerHTML = "";

    if (danhSach.length === 0) {
        const dongTrong = document.createElement("tr");
        const oTrong = document.createElement("td");

        oTrong.colSpan = 7;
        oTrong.textContent = "Chưa có sinh viên nào.";

        dongTrong.appendChild(oTrong);
        thanBang.appendChild(dongTrong);

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
        nhomNut.appendChild(nutXoa);

        oThaoTac.appendChild(nhomNut);
        dong.appendChild(oThaoTac);

         
        thanBang.appendChild(dong);
    }
}



async function taiDanhSachSinhVien() {
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

        const ketQuaSinhVien = await getDocs(
            collection(db, "sinhvien")
        );

        const ketQuaKhoa = await getDocs(
            collection(db, "khoa")
        );

        const bangTenKhoa = {};

        ketQuaKhoa.docs.forEach(function (taiLieu) {
            bangTenKhoa[taiLieu.id] =
                taiLieu.data().tenkhoa || "";
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

        danhSachSinhVienHienTai = danhSach;

        hienThiDanhSachSinhVien(danhSach);

    } catch (loi) {
        console.error(
            "Không thể tải sinh viên:",
            loi
        );
    }
}

taiDanhSachSinhVien();



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

        // 1. Kiểm tra mã sinh viên
        const thamChieuSinhVien = doc(
            db,
            "sinhvien",
            duLieu.masv
        );

        const sinhVienCu =
            await getDoc(thamChieuSinhVien);

        if (sinhVienCu.exists()) {
            throw new Error(
                "Mã sinh viên đã tồn tại."
            );
        }

        // 2. Tạo tài khoản đăng nhập Firebase
        const taiKhoanSinhVien =
            await createUserWithEmailAndPassword(
                secondaryAuth,
                duLieu.mail,
                duLieu.matkhau
            );

        const uidSinhVien =
            taiKhoanSinhVien.user.uid;

        // 3. Tạo thông tin phân quyền
        await setDoc(
            doc(db, "users", uidSinhVien),
            {
                email: duLieu.mail,
                role: "sinhvien",
                masv: duLieu.masv
            }
        );

        // 4. Tạo hồ sơ sinh viên
        await setDoc(
            thamChieuSinhVien,
            {
                uid: uidSinhVien,
                mail: duLieu.mail,
                hoten: duLieu.hoten,
                ngaysinh: duLieu.ngaysinh,
                makhoa: duLieu.makhoa,
                namnhaphoc: Number(
                    duLieu.namnhaphoc
                )
            }
        );

        // 5. Đăng xuất tài khoản phụ
        await signOut(secondaryAuth);

        dongFormSinhVien();

        await taiDanhSachSinhVien();

        alert("Thêm sinh viên thành công.");

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

        alert(
            "Cập nhật sinh viên thành công."
        );

    } catch (loi) {
        formMessage.textContent = loi.message;

    } finally {
        saveButton.disabled = false;
        saveButton.textContent =
            "Cập nhật sinh viên";
    }
}











async function xoaSinhVien(sinhVien, nutXoa) {
    const dongY = window.confirm(
        `Bạn có chắc muốn xóa sinh viên này?\n\n` +
        `Mã sinh viên: ${sinhVien.masv}\n` +
        `Họ tên: ${sinhVien.hoten}`
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

        alert(
            "Xóa sinh viên thành công."
        );

    } catch (loi) {
        alert(`Lỗi: ${loi.message}`);

        nutXoa.disabled = false;
        nutXoa.textContent = "Xóa";
    }
}








const studentMenu =
    document.getElementById("student-menu");

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


console.log({
    studentMenu,
    teacherMenu,
    studentSection,
    teacherSection
});



studentMenu.addEventListener("click", function (suKien) {
    suKien.preventDefault();

    hienThiSection(studentSection, studentMenu);
    window.location.hash = "quan-ly-sinh-vien";

    taiDanhSachSinhVien();
});


teacherMenu.addEventListener("click", function (suKien) {
    suKien.preventDefault();

    
    hienThiSection(teacherSection, teacherMenu);
    window.location.hash = "quan-ly-giao-vien";

    taiDanhSachGiaoVien();
});



courseMenu.addEventListener("click", function (suKien) {
    suKien.preventDefault();

    
    hienThiSection(courseSection, courseMenu);
    window.location.hash = "quan-ly-lop-mon";

    taiDanhSachLopMon();
});




async function taiDanhSachGiaoVien() {
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

        const ketQua = await getDocs(
            collection(db, "giaovien")
        );


        const ketQuaKhoa = await getDocs(
            collection(db, "khoa")
        );

        const bangTenKhoa = {};

        ketQuaKhoa.docs.forEach(function (taiLieu) {
            bangTenKhoa[taiLieu.id] =
                taiLieu.data().tenkhoa || "";
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

        hienThiLoiDanhSachGiaoVien();
    }
}





function hienThiLoiDanhSachGiaoVien() {
    const thanBang = document.getElementById(
        "teacher-table-body"
    );

    thanBang.innerHTML = "";

    const dong = document.createElement("tr");
    const o = document.createElement("td");

    o.colSpan = 6;
    o.textContent =
        "Không thể tải danh sách giáo viên.";

    dong.appendChild(o);
    thanBang.appendChild(dong);
}


function hienThiDanhSachGiaoVien(danhSach) {
    const thanBang = document.getElementById(
        "teacher-table-body"
    );

    thanBang.innerHTML = "";

    if (danhSach.length === 0) {
        const dongTrong = document.createElement("tr");
        const oTrong = document.createElement("td");

        oTrong.colSpan = 6;
        oTrong.textContent = "Chưa có giáo viên nào.";

        dongTrong.appendChild(oTrong);
        thanBang.appendChild(dongTrong);

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

        console.log(
            "UID giáo viên vừa tạo:",
            uidGiaoVien
        );


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

        alert("Thêm giáo viên thành công.");

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

        alert("Cập nhật giáo viên thành công.");

    } catch (loi) {
        teacherFormMessage.textContent = loi.message;

    } finally {
        saveButton.disabled = false;
        saveButton.textContent = "Cập nhật giáo viên";
    }
}




async function xoaGiaoVien(giaoVien, nutXoa) {
    const dongY = window.confirm(
        `Bạn có chắc muốn xóa giáo viên này?\n\n` +
        `Mã giáo viên: ${giaoVien.magv}\n` +
        `Họ tên: ${giaoVien.hoten}`
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

        alert("Xóa giáo viên thành công."); 


    } catch (loi) {
        alert(`Lỗi: ${loi.message}`);

        nutXoa.disabled = false;
        nutXoa.textContent = "Xóa";
    }
}



const courseTableBody = document.getElementById("course-table-body");



function dinhDangNgayGio(chuoiNgay) {
    if (!chuoiNgay) {
        return "";
    }

    const ngay = new Date(chuoiNgay);

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
        courseTableBody.innerHTML = `
            <tr>
                <td colspan="9">
                    Chưa có lớp môn nào được mở.
                </td>
            </tr>
        `;

        return;
    }

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
    courseTableBody.innerHTML = `
        <tr>
            <td colspan="9">
                Đang tải danh sách lớp môn...
            </td>
        </tr>
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


        // 1. Lấy 3 collection cần thiết
        const ketQuaLopMon = await getDocs(
            collection(db, "lopmon")
        );

        const ketQuaMonHoc = await getDocs(
            collection(db, "monhoc")
        );

        const ketQuaGiaoVien = await getDocs(
            collection(db, "giaovien")
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

                    tenmon:
                        bangTenMon[duLieu.mamon] || "",

                    magv: duLieu.magv || "",

                    tengiaovien:
                        bangTenGiaoVien[duLieu.magv] || "",

                    hocky: duLieu.hocky || "",

                    namhoc: duLieu.namhoc || "",

                    sisotoida: Number(
                        duLieu.sisotoida || 0
                    ),

                    sisodadangky: Number(
                        duLieu.sisodadangky || 0
                    ),

                    ngaybatdaudk:
                        duLieu.ngaybatdaudk || "",

                    ngayketthucdk:
                        duLieu.ngayketthucdk || "",

                    trangthai:
                        duLieu.trangthai || ""
                };
            }
        );


        // 5. Đưa dữ liệu sang hàm vẽ bảng cũ
        hienThiDanhSachLopMon(danhSach);

    } catch (loi) {
        console.error(
            "Không thể tải danh sách lớp môn:",
            loi
        );

        courseTableBody.innerHTML = `
            <tr>
                <td colspan="9">
                    ${loi.message}
                </td>
            </tr>
        `;
    }
}





courseTableBody.addEventListener("click", async function (suKien) {
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

    const dongY = confirm(
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

        alert(
            `Đã ${tenHanhDong} lớp ${maLopMon}.`
        );

        await taiDanhSachLopMon();

    } catch (loi) {
        alert(`Lỗi: ${loi.message}`);

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




function moModalLopMon() {
    courseForm.reset();
    courseFormError.textContent = "";

    document.getElementById("course-year").value =
        new Date().getFullYear();

    document.getElementById("course-capacity").value = 40;

    courseModal.hidden = false;
    document.body.style.overflow = "hidden";


    taiLuaChonLopMon();
}


function dongModalLopMon() {
    courseModal.hidden = true;
    document.body.style.overflow = "";
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
        };


        const noiDungNutCu =
            saveCourseButton.textContent;

        saveCourseButton.disabled = true;
        saveCourseButton.textContent =
            "Đang mở lớp...";


        try {
            const { db } = await import(
                "/static/js/firebase-config.js"
            );

            const {
                doc,
                getDoc,
                setDoc
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

            if (lopMonCu.exists()) {
                throw new Error(
                    "Mã lớp môn đã tồn tại."
                );
            }


            if (
                duLieuGuiDi.ngayketthucdk
                <= duLieuGuiDi.ngaybatdaudk
            ) {
                throw new Error(
                    "Ngày kết thúc đăng ký phải sau ngày bắt đầu."
                );
            }


            await setDoc(
                thamChieuLopMon,
                {
                    mamon: duLieuGuiDi.mamon,
                    magv: duLieuGuiDi.magv,
                    hocky: duLieuGuiDi.hocky,
                    namhoc: duLieuGuiDi.namhoc,

                    sisotoida: duLieuGuiDi.sisotoida,

                    // Lớp mới chưa có sinh viên đăng ký
                    sisodadangky: 0,

                    ngaybatdaudk:
                        duLieuGuiDi.ngaybatdaudk,

                    ngayketthucdk:
                        duLieuGuiDi.ngayketthucdk,

                    trangthai: "Mở"
                }
            );



            dongModalLopMon();

            await taiDanhSachLopMon();

            alert(
                "Mở lớp môn thành công."
            );

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
        const { db } = await import(
            "/static/js/firebase-config.js"
        );


        const { collection, getDocs } = await import(
            "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js"
        );


        const ketQua = await getDocs(
            collection(db, "khoa")
        );


        const danhSachKhoa = ketQua.docs.map(
            function (taiLieu) {
                return {
                    makhoa: taiLieu.id,
                    tenkhoa: taiLieu.data().tenkhoa
                };
            }
        );

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




function hienThiSection(sectionCanHien, menuCanChon) {
    studentSection.classList.add("hidden-section");
    teacherSection.classList.add("hidden-section");
    subjectSection.classList.add("hidden-section");
    courseSection.classList.add("hidden-section");

    studentMenu.classList.remove("active");
    teacherMenu.classList.remove("active");
    subjectMenu.classList.remove("active");
    courseMenu.classList.remove("active");

    sectionCanHien.classList.remove("hidden-section");
    menuCanChon.classList.add("active");
}



subjectMenu.addEventListener("click", function (event) {
    event.preventDefault();

    hienThiSection(subjectSection, subjectMenu);
    window.location.hash = "quan-ly-mon-hoc";

    taiDanhSachMonHoc();
});





async function taiDanhSachMonHoc() {
    subjectTableBody.innerHTML = `
        <tr>
            <td colspan="4">
                Đang tải danh sách môn học...
            </td>
        </tr>
    `;

    try {
        const { db } = await import(
            "/static/js/firebase-config.js"
        );

        const { collection, getDocs } = await import(
            "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js"
        );


        const ketQua = await getDocs(
            collection(db, "monhoc")
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
            subjectTableBody.innerHTML = `
                <tr>
                    <td colspan="4">
                        Chưa có môn học nào.
                    </td>
                </tr>
            `;

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

        subjectTableBody.innerHTML = cacDong;
    } catch (loi) {
        subjectTableBody.innerHTML = `
            <tr>
                <td colspan="4">
                    ${loi.message}
                </td>
            </tr>
        `;
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

        alert(
            dangSua
                ? "Cập nhật môn học thành công."
                : "Thêm môn học thành công."
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
        alert("Không tìm thấy thông tin môn học.");
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
            alert("Không lấy được mã môn học.");
            return;
        }
        
        console.log("Mã môn JavaScript gửi xóa:", mamon);


        const monHoc = danhSachMonHocHienTai.find(
            function (mon) {
                return mon.mamon === mamon;
            }
        );

        const tenMon = monHoc
            ? monHoc.tenmon
            : mamon;

        const dongYXoa = confirm(
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

            alert("Xóa môn học thành công.");  
            
            
        } catch (loi) {
            alert(loi.message);

            deleteButton.disabled = false;
            deleteButton.textContent = "Xóa";
        }
    }
);








taiDanhSachKhoa();