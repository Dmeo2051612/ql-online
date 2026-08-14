(function khoiTaoKhoGhiChuDongBo() {
    let notes = [];
    let loadingPromise = null;

    function publish(eventName) {
        window.dispatchEvent(new CustomEvent(eventName, {
            detail: { notes: notes.map((note) => ({ ...note })) }
        }));
    }

    async function authenticatedRequest(url, options = {}) {
        const { auth } = await import("/static/js/firebase-config.js");
        if (!auth.currentUser) {
            throw new Error("Phiên đăng nhập đã hết hạn.");
        }
        const token = await auth.currentUser.getIdToken();
        const response = await fetch(url, {
            ...options,
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
                ...(options.headers || {})
            }
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(payload.error || "Không thể đồng bộ ghi chú.");
        }
        return payload;
    }

    function getAll() {
        return notes.map((note) => ({ ...note }));
    }

    async function load() {
        if (loadingPromise) return loadingPromise;
        loadingPromise = authenticatedRequest("/api/student/calendar-notes")
            .then((payload) => {
                notes = Array.isArray(payload.notes) ? payload.notes : [];
                publish("calendar-notes-loaded");
                publish("calendar-notes-updated");
                return getAll();
            })
            .finally(() => {
                loadingPromise = null;
            });
        return loadingPromise;
    }

    async function create(note) {
        const payload = await authenticatedRequest("/api/student/calendar-notes", {
            method: "POST",
            body: JSON.stringify(note)
        });
        notes.push(payload.note);
        publish("calendar-notes-updated");
        return { ...payload.note };
    }

    async function remove(noteId) {
        await authenticatedRequest(`/api/student/calendar-notes/${encodeURIComponent(noteId)}`, {
            method: "DELETE"
        });
        notes = notes.filter((note) => note.id !== noteId);
        publish("calendar-notes-updated");
    }

    async function migrateLegacy(studentCode) {
        const key = `ql-online-calendar-notes-${studentCode || "guest"}`;
        let legacy = [];
        try {
            legacy = JSON.parse(localStorage.getItem(key) || "[]");
        } catch (_) {
            legacy = [];
        }
        if (!Array.isArray(legacy) || legacy.length === 0) return;

        const existing = new Set(notes.map((note) => [
            note.ngay,
            note.gio || "",
            String(note.noidung || "").trim().toLocaleLowerCase("vi")
        ].join("|")));
        for (const note of legacy) {
            const fingerprint = [
                note.ngay,
                note.gio || "",
                String(note.noidung || "").trim().toLocaleLowerCase("vi")
            ].join("|");
            if (existing.has(fingerprint)) continue;
            try {
                await create({
                    ngay: note.ngay,
                    gio: note.gio || "",
                    noidung: String(note.noidung || "").trim()
                });
                existing.add(fingerprint);
            } catch (error) {
                if (!String(error.message).includes("đã tồn tại")) throw error;
            }
        }
        localStorage.removeItem(key);
    }

    window.QLStudentNotes = Object.freeze({
        load,
        getAll,
        create,
        remove,
        migrateLegacy
    });
})();
