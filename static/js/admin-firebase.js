import { auth, db } from "./firebase-config.js";


import { doc, getDoc }
    from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";


import { onAuthStateChanged, signOut }
    from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";


onAuthStateChanged(auth, async function (user) {
    if (!user) {
        window.location.href = "/";
        return;
    }

    const thamChieuNguoiDung = doc(
        db,
        "users",
        user.uid
    );

    const taiLieuNguoiDung =
        await getDoc(thamChieuNguoiDung);



        
    if (!taiLieuNguoiDung.exists()) {
        window.location.href = "/";
        return;
    }  


    const nguoiDung = taiLieuNguoiDung.data();


    if (nguoiDung.role !== "admin") {
        window.location.href = "/";
        return;
    }


    const taiLieuKhoa = await getDoc(
        doc(db, "khoa", "CNTT")
    );



    if (taiLieuKhoa.exists()) {
        console.log(
            "Khoa đọc từ Firestore:",
            taiLieuKhoa.data().tenkhoa
        );
    }

    
    const cacViTriEmail =
        document.querySelectorAll(".firebase-user-email");


    cacViTriEmail.forEach(function (phanTu) {
        phanTu.textContent = user.email;
    });


    console.log(
        "Cho phép vào Admin:",
        user.email
    );

    
    console.log(
        "Firebase đang đăng nhập:",
        user.email
    );
});


const logoutForm =
    document.getElementById("logout-form");


logoutForm.addEventListener(
    "submit",
    async function (event) {
        event.preventDefault();

        await signOut(auth);

        window.location.href = "/";
    }
);