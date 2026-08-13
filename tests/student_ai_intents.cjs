const fs = require("fs");
const vm = require("vm");

function fakeElement() {
    return {
        value: "", hidden: true, dataset: {},
        classList: { add() {}, remove() {}, toggle() {} },
        addEventListener() {}, querySelectorAll() { return []; },
        appendChild() {}, focus() {}, reset() {}, remove() {}, closest() { return null; }
    };
}

const context = {
    console, Date, Math, Map, Set, Promise, Blob, URL,
    localStorage: { getItem() { return null; }, setItem() {} },
    document: {
        getElementById: fakeElement,
        querySelectorAll() { return []; },
        createElement() {
            const item = fakeElement();
            Object.defineProperty(item, "textContent", {
                set(value) { this._text = String(value); },
                get() { return this._text || ""; }
            });
            Object.defineProperty(item, "innerHTML", { get() { return this._text || ""; } });
            return item;
        }
    },
    window: {
        addEventListener() {}, setTimeout,
        location: { hash: "" }, history: { replaceState() {} }
    },
    alert() {}, confirm() { return true; }
};

const testCode = `
const ngayMai = new Date();
ngayMai.setDate(ngayMai.getDate() + 1);
const thuNgayMai = ngayMai.getDay() === 0 ? 8 : ngayMai.getDay() + 1;
danhSachMonDaDangKy = [{ mamon: "OLD", tenmon: "Môn đã học", malopmon: "OLD1", magv: "GV9", tengiaovien: "Cô Mai", hocky: 2, namhoc: 2026, thu: thuNgayMai, giobatdau: "10:00", gioketthuc: "11:00", sotinchi: 2, ngaybatdauhoc: "2020-01-01", ngayketthuchoc: "2030-12-31" }];
danhSachLopMonCoTheDangKy = [
 { mamon: "OS", tenmon: "Hệ điều hành", malopmon: "LM002", magv: "GV1", tengiaovien: "Thầy Hoàng", hocky: 2, namhoc: 2026, thu: 2, giobatdau: "07:00", gioketthuc: "09:30", sotinchi: 3, sisotoida: 40, sisodadangky: 10 },
 { mamon: "OS", tenmon: "Hệ điều hành", malopmon: "LM007", magv: "GV1", tengiaovien: "Thầy Hoàng", hocky: 1, namhoc: 2026, thu: 2, giobatdau: "07:00", gioketthuc: "09:30", sotinchi: 3, sisotoida: 40, sisodadangky: 0 },
 { mamon: "SEC", tenmon: "An toàn thông tin", malopmon: "LM001", magv: "GV2", tengiaovien: "Cô Vân", hocky: 2, namhoc: 2026, thu: 3, giobatdau: "07:00", gioketthuc: "09:30", sotinchi: 3, sisotoida: 40, sisodadangky: 10 },
 { mamon: "WEB", tenmon: "Lập trình Web", malopmon: "LM004", magv: "GV3", tengiaovien: "Cô Hồng", hocky: 2, namhoc: 2026, thu: 4, giobatdau: "14:00", gioketthuc: "16:00", sotinchi: 3, sisotoida: 40, sisodadangky: 10 }
];

function assertAnswer(question, includes, excludes = []) {
    const answer = traLoiTroLy(question);
    includes.forEach((text) => { if (!answer.includes(text)) throw new Error(question + " thiếu " + text + ": " + answer); });
    excludes.forEach((text) => { if (answer.includes(text)) throw new Error(question + " chứa sai " + text + ": " + answer); });
    return answer;
}

assertAnswer("Kiếm hộ mình môn hệ điều hành", ["LM002"], ["LM001", "Phương án"]);
assertAnswer("lọc lớp hệ điều hanhh", ["LM002"], ["LM001"]);
assertAnswer("môn đó mấy tín chỉ?", ["3 tín chỉ"]);
assertAnswer("môn đó còn slot không?", ["LM002"], ["LM001"]);
assertAnswer("ai dạy môn đó?", ["Thầy Hoàng"], ["Cô Vân"]);
assertAnswer("tra cứu lớp của cô Vân", ["LM001"], ["LM002"]);
assertAnswer("cô đó dạy môn gì", ["LM001"], ["LM002"]);
assertAnswer("tôi đăng kí mấy môn rồi", ["1 môn", "2 tín chỉ"]);
assertAnswer("mai tôi học gì", ["OLD1"]);
aiNguCanh.dangLapThoiKhoaBieu = false; aiNguCanh.yeuCauLapLich = "";
assertAnswer("Làm cho tôi thời khóa biểu hai môn học kì hai năm 2026", ["Phương án 1", "2 môn"]);
aiNguCanh.dangLapThoiKhoaBieu = false; aiNguCanh.yeuCauLapLich = "";
assertAnswer("Sắp lịch 2 môn học kỳ 2 năm 2026 nhưng không học thứ 2", ["LM001", "LM004"], ["LM002"]);
assertAnswer("Gợi ý lớp thứ tư buổi chiều", ["LM004"], ["LM002"]);
assertAnswer("Gợi ý lớp t4 từ 2 giờ chiều đến 5 giờ chiều", ["LM004"], ["LM002"]);
assertAnswer("cho tôi xem thời khóa biểu hiện tại", ["OLD1"]);
assertAnswer("tại sao tôi không thấy lớp?", ["chỉ hiện lớp đang mở"]);
aiNguCanh.dangLapThoiKhoaBieu = true;
aiNguCanh.yeuCauLapLich = "lap thoi khoa bieu truoc do";
assertAnswer("sáng thứ 2 từ 7 giờ tới 10 giờ sáng", ["LM002", "Thứ 2", "07:00–10:00"], ["LM001", "Phương án"]);
assertAnswer("còn thứ 3 thì sao, giờ vẫn vậy", ["LM001", "Thứ 3", "07:00–10:00"], ["LM002", "Phương án"]);
aiNguCanh.dangLapThoiKhoaBieu = true;
aiNguCanh.yeuCauLapLich = "lap thoi khoa bieu hoc ky 1";
assertAnswer("thầy hoàng học kì 2", ["LM002", "học kỳ 2"], ["LM007", "Phương án"]);

dienBoLocHocKy(danhSachLopMonCoTheDangKy);
if (!availableSemesterFilter.innerHTML.includes('value="1"') || !availableSemesterFilter.innerHTML.includes('value="2"')) {
    throw new Error("Combobox học kỳ không có đủ lựa chọn theo số học kỳ");
}
if (availableSemesterFilter.innerHTML.includes("2026-2027")) {
    throw new Error("Combobox học kỳ vẫn đang tách lựa chọn theo năm học");
}
availableSemesterFilter.value = "1";
locVaSapXepLopMon();
if (!availableCourseBody.innerHTML.includes("LM007") || availableCourseBody.innerHTML.includes("LM002")) {
    throw new Error("Bộ lọc Học kỳ 1 hiển thị sai lớp môn");
}
availableSemesterFilter.value = "2";
locVaSapXepLopMon();
if (availableCourseBody.innerHTML.includes("LM007") || !availableCourseBody.innerHTML.includes("LM002")) {
    throw new Error("Bộ lọc Học kỳ 2 hiển thị sai lớp môn");
}
console.log("STUDENT_AI_INTENTS_OK: 20 scenarios");
`;

vm.runInNewContext(fs.readFileSync("static/js/sinh_vien.js", "utf8") + testCode, context);
