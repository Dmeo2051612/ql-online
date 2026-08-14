export function escapeHtml(value) {
    const element = document.createElement("span");
    element.textContent = String(value ?? "");
    return element.innerHTML;
}

export function safeNumber(value, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
}

export function replaceSelectOptions(select, options, placeholder = "-- Chọn --") {
    const fragment = document.createDocumentFragment();
    const first = document.createElement("option");
    first.value = "";
    first.textContent = placeholder;
    fragment.appendChild(first);
    options.forEach((option) => {
        const element = document.createElement("option");
        element.value = String(option.value ?? "");
        element.textContent = String(option.label ?? "");
        fragment.appendChild(element);
    });
    select.replaceChildren(fragment);
}
