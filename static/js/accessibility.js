(function khoiTaoTroNangGiaoDien() {
    const dialogSelector = [
        ".portal-dialog",
        ".modal-card",
        ".teacher-modal-card",
        "[role='dialog']",
        "[role='alertdialog']"
    ].join(",");
    const focusableSelector = [
        "a[href]",
        "button:not([disabled])",
        "input:not([disabled]):not([type='hidden'])",
        "select:not([disabled])",
        "textarea:not([disabled])",
        "[tabindex]:not([tabindex='-1'])"
    ].join(",");
    const activeDialogs = new Set();
    const returnFocus = new WeakMap();
    let lastExternalFocus = null;

    function visible(element) {
        if (!element?.isConnected) return false;
        if (element.closest(".hidden, .hidden-section, [hidden]")) return false;
        const style = window.getComputedStyle(element);
        return style.display !== "none" && style.visibility !== "hidden";
    }

    function focusableItems(dialog) {
        return [...dialog.querySelectorAll(focusableSelector)].filter(visible);
    }

    function activateDialog(dialog) {
        if (activeDialogs.has(dialog) || !visible(dialog)) return;
        activeDialogs.add(dialog);
        returnFocus.set(dialog, lastExternalFocus || document.activeElement);
        if (!dialog.hasAttribute("role")) dialog.setAttribute("role", "dialog");
        dialog.setAttribute("aria-modal", "true");
        if (!dialog.hasAttribute("tabindex")) dialog.setAttribute("tabindex", "-1");
        const target = dialog.querySelector("[autofocus]") || focusableItems(dialog)[0] || dialog;
        window.requestAnimationFrame(() => target.focus({ preventScroll: true }));
    }

    function deactivateDialog(dialog) {
        if (!activeDialogs.delete(dialog)) return;
        const previous = returnFocus.get(dialog);
        if (previous?.isConnected) {
            window.requestAnimationFrame(() => previous.focus({ preventScroll: true }));
        }
    }

    function synchronizeDialogs() {
        document.querySelectorAll(dialogSelector).forEach((dialog) => {
            if (visible(dialog)) activateDialog(dialog);
            else deactivateDialog(dialog);
        });
    }

    function synchronizeCurrentPage() {
        document.querySelectorAll("nav a, .sidebar a, .menu-item").forEach((link) => {
            if (link.classList.contains("active")) {
                if (link.getAttribute("aria-current") !== "page") {
                    link.setAttribute("aria-current", "page");
                }
            } else if (link.hasAttribute("aria-current")) {
                link.removeAttribute("aria-current");
            }
        });
    }

    document.addEventListener("keydown", (event) => {
        const dialog = [...activeDialogs].filter(visible).at(-1);
        if (!dialog) return;
        if (event.key === "Escape") {
            if (dialog.closest(".portal-password-required")) return;
            const closeButton = dialog.querySelector([
                "[data-close-modal]",
                ".close-modal",
                ".modal-close-button",
                ".teacher-modal-close",
                ".portal-dialog-close"
            ].join(","));
            if (closeButton) {
                event.preventDefault();
                closeButton.click();
            }
            return;
        }
        if (event.key !== "Tab") return;
        const items = focusableItems(dialog);
        if (!items.length) {
            event.preventDefault();
            dialog.focus();
            return;
        }
        const first = items[0];
        const last = items.at(-1);
        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    });

    document.addEventListener("focusin", (event) => {
        const insideActiveDialog = [...activeDialogs]
            .some((dialog) => visible(dialog) && dialog.contains(event.target));
        if (!insideActiveDialog) lastExternalFocus = event.target;
    });

    function start() {
        synchronizeDialogs();
        synchronizeCurrentPage();
        const observer = new MutationObserver(() => {
            synchronizeDialogs();
            synchronizeCurrentPage();
        });
        observer.observe(document.body, {
            subtree: true,
            childList: true,
            attributes: true,
            attributeFilter: ["class", "hidden"]
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", start, { once: true });
    } else {
        start();
    }
})();
