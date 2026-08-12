export function chuanHoaChuoi(giaTri) {
    return String(
        giaTri ?? ""
    ).trim();
}


export function chuanHoaSo(
    giaTri,
    giaTriMacDinh = 0
) {
    const so = Number(giaTri);

    return Number.isFinite(so)
        ? so
        : giaTriMacDinh;
}


export function chuanHoaTrangThaiLopMon(
    trangThai
) {
    const giaTri = chuanHoaChuoi(
        trangThai
    ).toUpperCase();

    if (
        giaTri === "MỞ" ||
        giaTri === "MO"
    ) {
        return "MỞ";
    }

    if (
        giaTri === "ĐÓNG" ||
        giaTri === "DONG"
    ) {
        return "ĐÓNG";
    }

    return "ĐÓNG";
}


export function taoDuLieuLopMonMoi(
    duLieu
) {
    return {
        mamon: chuanHoaChuoi(
            duLieu.mamon
        ),

        magv: chuanHoaChuoi(
            duLieu.magv
        ),

        hocky: chuanHoaSo(
            duLieu.hocky
        ),

        namhoc: chuanHoaSo(
            duLieu.namhoc
        ),

        sisotoida: chuanHoaSo(
            duLieu.sisotoida
        ),

        sisodadangky: 0,

        ngaybatdaudk:
            duLieu.ngaybatdaudk,

        ngayketthucdk:
            duLieu.ngayketthucdk,

        thu: chuanHoaSo(
            duLieu.thu
        ),

        giobatdau: chuanHoaChuoi(
            duLieu.giobatdau
        ),

        gioketthuc: chuanHoaChuoi(
            duLieu.gioketthuc
        ),

        ngaybatdauhoc: duLieu.ngaybatdauhoc,

        ngayketthuchoc: duLieu.ngayketthuchoc,

        trangthai: "MỞ"
    };
}
