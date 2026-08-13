const fs = require("fs");
const vm = require("vm");

function fakeElement() {
    const listeners = {};
    const classes = new Set();
    return {
        value: "", hidden: true, dataset: {}, style: {
            removeProperty(name) { delete this[name]; }
        },
        classList: {
            add(name) { classes.add(name); }, remove(name) { classes.delete(name); },
            toggle(name, force) { if (force === false) classes.delete(name); else classes.add(name); },
            contains(name) { return classes.has(name); }
        },
        addEventListener(type, handler) { (listeners[type] ||= []).push(handler); },
        dispatchEvent(event) { (listeners[event.type] || []).forEach((handler) => handler(event)); },
        querySelectorAll() { return []; }, setAttribute() {}, setPointerCapture() {}, releasePointerCapture() {},
        appendChild() {}, focus() {}, reset() {}, remove() {}, closest() { return null; }
    };
}

const fakeElements = new Map();
const windowListeners = {};

const context = {
    console, Date, Math, Map, Set, Promise, Blob, URL,
    localStorage: { getItem() { return null; }, setItem() {} },
    document: {
        getElementById(id) {
            if (!fakeElements.has(id)) fakeElements.set(id, fakeElement());
            return fakeElements.get(id);
        },
        addEventListener() {},
        querySelector(selector) {
            if (selector === ".main-content") {
                return { getBoundingClientRect() { return { left: 325, top: 0, right: 1440, bottom: 900, width: 1115, height: 900 }; } };
            }
            if (selector === ".student-section:not(.hidden-section)") {
                return { getBoundingClientRect() { return { left: 451, top: 490, right: 1380, bottom: 1200, width: 929, height: 710 }; } };
            }
            return null;
        },
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
        addEventListener(type, handler) { (windowListeners[type] ||= []).push(handler); },
        dispatchEvent(event) { (windowListeners[event.type] || []).forEach((handler) => handler(event)); },
        setTimeout, requestAnimationFrame(callback) { callback(); }, innerWidth: 1440, innerHeight: 900,
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
assertAnswer("thầy hoàng đang dạy môn gì", ["LM002", "LM007"], ["LM001"]);
assertAnswer("còn vân thì sao", ["LM001", "Cô Vân"], ["LM002", "LM007"]);
assertAnswer("thế cô hồng?", ["LM004", "Cô Hồng"], ["LM001", "LM002"]);
assertAnswer("cô hồng đang đứng lớp nào", ["LM004"], ["LM001"]);
assertAnswer("thầy hoanh dạy gì", ["LM002", "LM007"], ["LM001"]);
assertAnswer("học kỳ 1 thì sao", ["LM007", "học kỳ 1"], ["LM002"]);
assertAnswer("còn bao nhiêu chỗ", ["LM007", "40 chỗ"], ["LM002"]);
assertAnswer("đổi sang cô vân", ["LM001", "Cô Vân"], ["LM002"]);
assertAnswer("vân dạy môn nào", ["LM001"], ["LM002"]);
assertAnswer("GV3 dạy gì", ["LM004", "Cô Hồng"], ["LM001"]);
assertAnswer("an toàn thông tin do ai phụ trách", ["LM001", "Cô Vân"], ["LM002"]);
assertAnswer("môn đó học buổi nào", ["LM001", "Thứ 3"], ["LM002"]);
assertAnswer("lớp đó full chưa", ["LM001", "30 chỗ"], ["LM002"]);
assertAnswer("hệ điều hành có mấy credit", ["3 tín chỉ"]);
assertAnswer("so sánh thầy hoàng và cô vân", ["So sánh", "Thầy Hoàng", "Cô Vân", "LM002", "LM001"], ["Cô Hồng"]);
assertAnswer("so sánh thầy hoàng và cô vân học kỳ 2", ["Thầy Hoàng", "Cô Vân", "LM002", "LM001"], ["LM007"]);
assertAnswer("lọc lớp cô vân học kỳ 2", ["LM001", "học kỳ 2"], ["LM002"]);
assertAnswer("cho mình danh sách lớp của thầy hoàng", ["LM002", "LM007"], ["LM001"]);
assertAnswer("thầy hoàng còn mấy slot", ["LM002", "LM007"], ["LM001"]);
assertAnswer("lịch môn web", ["LM004", "Thứ 4"], ["LM001"]);
assertAnswer("web học ca nào", ["LM004", "14:00–16:00"], ["LM002"]);
assertAnswer("tôi đăng ký OS chưa", ["chưa đăng ký", "Hệ điều hành"]);
assertAnswer("OS có đăng ký được không", ["LM002", "LM007"], ["LM001"]);
assertAnswer("gợi ý môn nào không trùng lịch", ["không trùng lịch"]);
assertAnswer("tổng credit hiện tại", ["1 môn", "2 tín chỉ"]);
assertAnswer("giảng viên mã GV2 có lớp nào", ["LM001", "Cô Vân"], ["LM002"]);
assertAnswer("cô đó có lớp nào", ["LM001"], ["LM002"]);
assertAnswer("môn SEC bao nhiêu tín chỉ", ["3 tín chỉ"]);
assertAnswer("môn web do giáo viên nào dạy", ["LM004", "Cô Hồng"], ["LM001"]);
assertAnswer("OS còn suất không", ["LM002", "LM007"], ["LM001"]);
assertAnswer("OS hạn đăng ký khi nào", ["LM002", "LM007"], ["LM001"]);
assertAnswer("lọc hk2 môn OS", ["LM002", "học kỳ 2"], ["LM007"]);
assertAnswer("lọc hk1 môn OS", ["LM007", "học kỳ 1"], ["LM002"]);
assertAnswer("tôi rảnh ca chiều thứ tư", ["LM004", "Thứ 4"], ["LM002"]);
assertAnswer("gợi ý t4 từ 14h đến 17h", ["LM004", "14:00–17:00"], ["LM002"]);
assertAnswer("tôi đã đăng ký môn nào", ["OLD1"]);
assertAnswer("bao nhiêu lớp rồi", ["1 môn", "2 tín chỉ"]);
assertAnswer("lịch có bị chồng giờ không", ["không có lớp nào bị trùng"]);
assertAnswer("xin chào", ["Chào bạn"]);
assertAnswer("bạn làm được gì", ["QL Assistant", "lập thời khóa biểu"]);
assertAnswer("cảm ơn nhiều", ["Không có gì"]);
assertAnswer("học phần web mấy tín chỉ", ["3 tín chỉ"]);
assertAnswer("an toan thong tins có lớp không", ["LM001"], ["LM002"]);
assertAnswer("cô vân dạy lớp gì", ["LM001"], ["LM002"]);
assertAnswer("reset", ["đã xóa các điều kiện"]);
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

// Hội thoại nối tiếp: giữ loại câu hỏi, thay đối tượng và hiểu cách nói đời thường.
assertAnswer("thầy Hoàng dạy cái gì", ["LM002", "LM007"], ["LM001"]);
assertAnswer("ông ấy còn chỗ không", ["LM002", "LM007"], ["LM001"]);
assertAnswer("còn cô Vân thì sao", ["LM001", "30 chỗ"], ["LM002"]);
assertAnswer("thế cô Hồng?", ["LM004", "30 chỗ"], ["LM001"]);
assertAnswer("tìm giúp mình môn Web", ["LM004"], ["LM001"]);
assertAnswer("cái đó lịch ra sao", ["LM004", "Thứ 4", "14:00–16:00"], ["LM002"]);
assertAnswer("còn hệ điều hành thì sao", ["LM002", "LM007"], ["LM001"]);
assertAnswer("vậy mấy tín?", ["3 tín chỉ"]);
assertAnswer("còn môn Web?", ["3 tín chỉ"], ["LM001"]);

assertAnswer("cô Vân mở những lớp nào", ["LM001"], ["LM002"]);
assertAnswer("không, ý tôi là thầy Hoàng", ["LM002", "LM007"], ["LM001"]);
assertAnswer("thầy Hoàng dạy bao nhiêu lớp", ["2 lớp"], ["Bạn đã đăng ký"]);
assertAnswer("thế học kỳ 1?", ["1 lớp", "học kỳ 1"]);
assertAnswer("môn OS có nhiêu lớp", ["2 lớp", "Hệ điều hành"]);
assertAnswer("còn học kỳ 2 thì sao", ["1 lớp", "học kỳ 2"]);
assertAnswer("môn Web còn nhiêu chỗ", ["LM004", "30 chỗ"], ["LM001"]);
assertAnswer("OS học vào khi nào", ["LM002", "LM007", "Thứ 2"], ["LM001"]);
assertAnswer("còn môn an toàn thông tin?", ["LM001", "Thứ 3"], ["LM002"]);
assertAnswer("vậy ai dạy?", ["Cô Vân"], ["Thầy Hoàng"]);

assertAnswer("lọc lớp thầy Hoàng học kỳ 1", ["LM007"], ["LM002"]);
assertAnswer("bỏ lọc học kỳ, vẫn thầy đó", ["LM002", "LM007"], ["LM001"]);
assertAnswer("ai dạy", ["môn nào"]);
assertAnswer("lớp nào", ["tiêu chí nào"]);
assertAnswer("xin lỗi nha", ["Không sao"]);
assertAnswer("bạn khỏe không", ["hoạt động ổn"]);
assertAnswer("phiền bạn tìm lớp của cô Hồng", ["LM004"], ["LM001"]);

aiNguCanh.dangLapThoiKhoaBieu = false; aiNguCanh.yeuCauLapLich = "";
assertAnswer("xếp giúp tôi 2 môn học kỳ 2", ["Phương án 1", "2 môn"]);
assertAnswer("không học thứ 2 nữa", ["LM001", "LM004"], ["LM002"]);
assertAnswer("đổi sang học kỳ 1", ["học kỳ 1"], ["LM001", "LM004"]);
assertAnswer("reset", ["đã xóa các điều kiện"]);
assertAnswer("OS deadline là khi nào", ["LM002", "LM007"], ["LM001"]);
assertAnswer("môn kia đăng ký nổi không", ["LM002", "LM007"], ["LM001"]);
assertAnswer("còn Web thì sao", ["LM004"], ["LM002"]);
assertAnswer("lịch học của tôi ra sao", ["OLD1"]);
assertAnswer("ngày mai có tiết gì", ["OLD1"]);
assertAnswer("cô Vân dạy những gì", ["LM001"], ["LM002"]);
assertAnswer("người đó hạn chót khi nào", ["LM001"], ["LM002"]);

// Hiểu mã lớp như một đối tượng riêng và giữ ngữ cảnh theo đúng lớp.
assertAnswer("LM002 học lúc nào", ["LM002", "Thứ 2", "07:00–09:30"], ["LM007"]);
assertAnswer("lớp đó còn bn chỗ", ["LM002", "30 chỗ"], ["LM007"]);
assertAnswer("lớp đó ai dạy", ["LM002", "Thầy Hoàng"], ["LM007"]);
assertAnswer("lm 004 học khi nào", ["LM004", "Thứ 4", "14:00–16:00"], ["LM001"]);
assertAnswer("lớp kia bao nhiêu tín chỉ", ["LM004", "3 tín chỉ"], ["LM001"]);
assertAnswer("chi tiết LM001", ["Thông tin lớp LM001", "Cô Vân", "30 chỗ"], ["LM002"]);
assertAnswer("LM001 có phù hợp với tôi không", ["không trùng", "30 chỗ"]);
assertAnswer("LM001 có trùng tkb của tôi ko", ["không trùng"]);
assertAnswer("LM002 đăng ký nổi không", ["không trùng", "30 chỗ"]);
assertAnswer("LM002 bao nhiêu tín chỉ và còn chỗ", ["3 tín chỉ", "30 chỗ"], ["LM007"]);

assertAnswer("so sánh LM002 với LM007", ["So sánh LM002 và LM007", "30 chỗ", "40 chỗ", "trùng lịch với nhau"]);
assertAnswer("hai lớp này lớp nào nhiều chỗ hơn", ["LM007 còn nhiều hơn 10 chỗ"]);
assertAnswer("nên chọn lớp nào", ["LM002", "LM007", "40 chỗ"]);
assertAnswer("LM002 và LM007 có trùng nhau không", ["trùng lịch với nhau"]);
assertAnswer("LM002 hay LM007", ["So sánh LM002 và LM007"]);
assertAnswer("LM002 có lớp khác cùng môn không", ["LM007"], ["LM002 ·"]);
assertAnswer("không, ý tôi là LM004", ["Thông tin lớp LM004", "Lập trình Web"], ["LM001"]);
assertAnswer("lớp đó có ca khác không", ["chưa có lớp khác"]);

assertAnswer("đúng rồi", ["hiểu đúng ý"]);
assertAnswer("tôi chưa hiểu, giải thích lại", ["từng bước"]);
assertAnswer("tôi muốn hủy đăng ký", ["Môn đã đăng ký", "không tự hủy"]);
assertAnswer("GV2 có bn lớp", ["1 lớp", "Cô Vân"]);
assertAnswer("môn OS có bn lớp", ["2 lớp", "Hệ điều hành"]);
assertAnswer("lm 001 chi tiết giúp tui", ["Thông tin lớp LM001", "An toàn thông tin"]);
assertAnswer("LM004 vs LM001 khác j", ["So sánh LM004 và LM001", "không trùng lịch với nhau"]);
assertAnswer("lmoo2 còn chỗ ko", ["LM002", "30 chỗ"], ["LM007"]);
assertAnswer("lm7 học khi nào", ["LM007", "Thứ 2", "07:00–09:30"], ["LM002"]);
assertAnswer("lớp đó deadline khi nào", ["LM007"], ["LM002"]);
assertAnswer("còn lm2 thì sao", ["LM002"], ["LM007"]);
assertAnswer("vậy lớp đó có trùng lịch ko", ["không trùng", "LM002"]);

const viTriTrongVung = gioiHanViTriTroLy(100, -30, 390, 590, { left: 325, top: 0, right: 1440, bottom: 900 }, 1440, 900);
if (viTriTrongVung.x !== 337 || viTriTrongVung.y !== 12) throw new Error("Chatbot không được giới hạn ở mép trái/trên của vùng nội dung");
const viTriSatGoc = gioiHanViTriTroLy(2000, 2000, 390, 590, { left: 325, top: 0, right: 1440, bottom: 900 }, 1440, 900);
if (viTriSatGoc.x !== 1038 || viTriSatGoc.y !== 298) throw new Error("Chatbot không được giới hạn ở mép phải/dưới của vùng nội dung");
aiChatToggle.getBoundingClientRect = () => ({
    left: Number.parseFloat(aiChatToggle.style.left) || 1324,
    top: Number.parseFloat(aiChatToggle.style.top) || 770,
    right: (Number.parseFloat(aiChatToggle.style.left) || 1324) + 94,
    bottom: (Number.parseFloat(aiChatToggle.style.top) || 770) + 112,
    width: 94, height: 112
});
const mucTieuKeo = { closest() { return null; } };
aiChatToggle.dispatchEvent({ type: "pointerdown", button: 0, clientX: 1360, clientY: 800, pointerId: 1, target: mucTieuKeo });
aiChatToggle.dispatchEvent({ type: "pointermove", clientX: 700, clientY: 300, pointerId: 1, target: mucTieuKeo, preventDefault() {} });
aiChatToggle.dispatchEvent({ type: "pointerup", pointerId: 1, target: mucTieuKeo });
if (aiChatToggle.style.left !== "664px" || aiChatToggle.style.top !== "270px") throw new Error("Giữ chuột chưa kéo được nhân vật robot");
aiChatToggle.dispatchEvent({ type: "click", target: mucTieuKeo, preventDefault() {} });
if (!aiChatbox.hidden) throw new Error("Thả robot sau khi kéo đã vô tình mở chatbot");
if (layVungDiChuyenRobot().left !== 325) throw new Error("Robot vẫn bị giới hạn theo thẻ section thay vì toàn bộ vùng nội dung trắng");
aiChatToggle.style.left = "100px"; aiChatToggle.style.top = "50px";
window.dispatchEvent({ type: "scroll" });
if (aiChatToggle.style.left !== "337px") throw new Error("Cuộn trang chưa giữ robot ngoài vùng sidebar");
aiChatToggle.dispatchEvent({ type: "dblclick", target: mucTieuKeo, preventDefault() {} });
if (aiChatToggle.style.left || aiChatToggle.style.top) throw new Error("Nháy đúp chưa đưa robot về vị trí mặc định");

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
console.log("STUDENT_AI_INTENTS_OK: 130 scenarios");
`;

vm.runInNewContext(fs.readFileSync("static/js/sinh_vien.js", "utf8") + testCode, context);
