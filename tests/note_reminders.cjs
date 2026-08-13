const fs = require("fs");
const vm = require("vm");

const source = fs.readFileSync("static/js/portal-shell.js", "utf8");
const start = source.indexOf("function buildLocalNoteNotifications");
const end = source.indexOf("function refreshLocalNoteNotifications", start);
if (start < 0 || end < 0) throw new Error("Không tìm thấy hàm tạo nhắc ghi chú");

const context = { Date, Intl, Number, String };
vm.runInNewContext(`
const NOTE_REMINDER_BEFORE_MINUTES = 30;
const NOTE_REMINDER_AFTER_MINUTES = 60;
${source.slice(start, end)}

const now = new Date("2026-08-13T10:00:00").getTime();
const result = buildLocalNoteNotifications([
    { id: "soon", ngay: "2026-08-13", gio: "10:20", noidung: "Nộp bài" },
    { id: "too-early", ngay: "2026-08-13", gio: "10:31", noidung: "Chưa đến lúc" },
    { id: "recent", ngay: "2026-08-13", gio: "09:10", noidung: "Vừa quá hạn" },
    { id: "expired", ngay: "2026-08-13", gio: "08:59", noidung: "Đã quá lâu" },
    { id: "all-day", ngay: "2026-08-13", gio: "", noidung: "Cả ngày" }
], now, "student-uid");

if (result.length !== 2) throw new Error("Khoảng thời gian nhắc ghi chú không đúng");
if (!result.some((item) => item.id === "calendar-note-soon" && item.title.includes("sắp đến hạn"))) {
    throw new Error("Thiếu thông báo ghi chú sắp đến hạn");
}
if (!result.some((item) => item.id === "calendar-note-recent" && item.title.includes("vừa đến hạn"))) {
    throw new Error("Thiếu thông báo ghi chú vừa đến hạn");
}
if (result.some((item) => item.id.includes("too-early") || item.id.includes("expired") || item.id.includes("all-day"))) {
    throw new Error("Đã tạo thông báo ngoài khoảng nhắc cho phép");
}
`, context);

console.log("NOTE_REMINDERS_OK: upcoming, recent, out-of-window and all-day cases");
