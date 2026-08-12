import { auth } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";

const stateBox = document.getElementById("dashboard-state");
const chartsBox = document.getElementById("dashboard-charts");
const refreshButton = document.getElementById("refresh-dashboard");
const updatedAt = document.getElementById("dashboard-updated-at");
const teacherPeriodFilter = document.getElementById("teacher-period-filter");
const teacherPopularityWinner = document.getElementById("teacher-popularity-winner");
const dashboardSortOrder = document.getElementById("dashboard-sort-order");
let colors = [];
let chartTheme = {};
let latestDashboardPayload = null;

function cssColor(name, fallback) {
    return getComputedStyle(document.body).getPropertyValue(name).trim() || fallback;
}

function syncChartTheme() {
    colors = [
        ["--chart-1", "#4f6bed"], ["--chart-2", "#20a39e"],
        ["--chart-3", "#8b6fd6"], ["--chart-4", "#e5a84b"],
        ["--chart-5", "#dc6b72"], ["--chart-6", "#4d9bd6"],
        ["--chart-7", "#75a86b"], ["--chart-8", "#c86da5"]
    ].map(([name, fallback]) => cssColor(name, fallback));
    chartTheme = {
        primary: colors[0],
        teal: colors[1],
        purple: colors[2],
        winner: colors[3],
        track: cssColor("--chart-track", "#e7ecf5"),
        text: cssColor("--chart-text", "#172033"),
        surface: cssColor("--chart-surface", "#ffffff")
    };
}

function waitForUser() {
    if (auth.currentUser) return Promise.resolve(auth.currentUser);
    return new Promise((resolve, reject) => {
        const timer = window.setTimeout(() => reject(new Error("Không tìm thấy phiên đăng nhập admin.")), 10000);
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (!user) return;
            window.clearTimeout(timer);
            unsubscribe();
            resolve(user);
        }, reject);
    });
}

function setState(message, type = "loading") {
    if (!stateBox) return;
    stateBox.classList.toggle("is-error", type === "error");
    stateBox.innerHTML = "";
    if (type === "loading") {
        const spinner = document.createElement("span");
        spinner.className = "analytics-spinner";
        spinner.setAttribute("aria-hidden", "true");
        stateBox.appendChild(spinner);
    }
    const text = document.createElement("span");
    text.textContent = message;
    stateBox.appendChild(text);
    stateBox.hidden = false;
    if (chartsBox) chartsBox.hidden = true;
}

function number(value) {
    return new Intl.NumberFormat("vi-VN").format(Number(value || 0));
}

function sortByMetric(data, metric) {
    const direction = dashboardSortOrder?.value === "asc" ? 1 : -1;
    return [...data].sort((first, second) => {
        const difference = Number(metric(first) || 0) - Number(metric(second) || 0);
        if (difference !== 0) return difference * direction;
        return String(first.label || first.id || "").localeCompare(
            String(second.label || second.id || ""), "vi"
        );
    });
}

function updateKpis(summary) {
    const values = {
        "kpi-departments": number(summary.departments),
        "kpi-subjects": number(summary.subjects),
        "kpi-registrations": number(summary.registrations),
        "kpi-fill-rate": `${number(summary.fillRate)}%`,
        "stat-sinh-vien": number(summary.students),
        "stat-giao-vien": number(summary.teachers),
        "stat-lop-mon": number(summary.courses)
    };
    Object.entries(values).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
            element.classList.remove("loading");
        }
    });
}

function prepareSvg(selector, width = 520, height = 250) {
    const svg = window.d3.select(selector);
    svg.selectAll("*").remove();
    svg.attr("viewBox", `0 0 ${width} ${height}`).attr("preserveAspectRatio", "xMidYMid meet");
    return { svg, width, height };
}

function emptyChart(svg, width, height, message = "Chưa có dữ liệu") {
    svg.append("text")
        .attr("class", "chart-empty-label")
        .attr("x", width / 2)
        .attr("y", height / 2)
        .attr("text-anchor", "middle")
        .text(message);
}

function renderDepartmentDonut(data) {
    const { svg, width, height } = prepareSvg("#chart-departments", 300, 250);
    const valid = data.filter((item) => Number(item.value) > 0);
    const legend = document.getElementById("legend-departments");
    legend.replaceChildren();
    if (!valid.length) return emptyChart(svg, width, height);

    const radius = 88;
    const group = svg.append("g").attr("transform", `translate(${width / 2},${height / 2})`);
    const pie = window.d3.pie().sort(null).value((item) => item.value);
    const arc = window.d3.arc().innerRadius(53).outerRadius(radius).cornerRadius(4);
    group.selectAll("path")
        .data(pie(valid))
        .join("path")
        .attr("d", arc)
        .attr("fill", (_, index) => colors[index % colors.length])
        .attr("stroke", chartTheme.surface)
        .attr("stroke-width", 3)
        .append("title")
        .text((item) => `${item.data.label}: ${number(item.data.value)} sinh viên`);
    group.append("text").attr("text-anchor", "middle").attr("y", -2).style("font-size", "24px").style("font-weight", "800").style("fill", chartTheme.text).text(number(window.d3.sum(valid, (item) => item.value)));
    group.append("text").attr("text-anchor", "middle").attr("y", 18).text("sinh viên");

    valid.slice(0, 8).forEach((item, index) => {
        const row = document.createElement("div");
        row.className = "chart-legend-item";
        const dot = document.createElement("i");
        dot.style.background = colors[index % colors.length];
        const label = document.createElement("span");
        label.textContent = item.label;
        label.title = `${item.code} - ${item.label}`;
        const value = document.createElement("strong");
        value.textContent = number(item.value);
        row.append(dot, label, value);
        legend.appendChild(row);
    });
}

function renderVerticalBars(data) {
    const { svg, width, height } = prepareSvg("#chart-intakes", 520, 250);
    const valid = sortByMetric(
        data.filter((item) => Number(item.value) >= 0),
        (item) => item.value
    );
    if (!valid.length) return emptyChart(svg, width, height);
    const margin = { top: 20, right: 18, bottom: 42, left: 42 };
    const x = window.d3.scaleBand().domain(valid.map((item) => item.label)).range([margin.left, width - margin.right]).padding(0.3);
    const y = window.d3.scaleLinear().domain([0, window.d3.max(valid, (item) => Number(item.value)) || 1]).nice().range([height - margin.bottom, margin.top]);
    svg.append("g").attr("class", "grid").attr("transform", `translate(${margin.left},0)`).call(window.d3.axisLeft(y).ticks(5).tickSize(-(width - margin.left - margin.right)).tickFormat(""));
    svg.selectAll("rect.intake-bar").data(valid).join("rect")
        .attr("class", "intake-bar").attr("x", (item) => x(item.label)).attr("y", (item) => y(item.value))
        .attr("width", x.bandwidth()).attr("height", (item) => y(0) - y(item.value)).attr("rx", 7).attr("fill", chartTheme.primary)
        .append("title").text((item) => `${item.label}: ${number(item.value)} sinh viên`);
    svg.append("g").attr("transform", `translate(0,${height - margin.bottom})`).call(window.d3.axisBottom(x));
    svg.append("g").attr("transform", `translate(${margin.left},0)`).call(window.d3.axisLeft(y).ticks(5).tickFormat(window.d3.format("d")));
}

function renderStatusDonut(data) {
    const { svg, width, height } = prepareSvg("#chart-course-status", 440, 250);
    const total = window.d3.sum(data, (item) => Number(item.value));
    if (!total) return emptyChart(svg, width, height);
    const group = svg.append("g").attr("transform", `translate(${width / 2},${height / 2})`);
    const pie = window.d3.pie().sort(null).value((item) => item.value)(data);
    const arc = window.d3.arc().innerRadius(62).outerRadius(92).cornerRadius(5);
    group.selectAll("path").data(pie).join("path").attr("d", arc)
        .attr("fill", (_, index) => [chartTheme.teal, chartTheme.track][index])
        .attr("stroke", chartTheme.surface).attr("stroke-width", 3)
        .append("title").text((item) => `${item.data.label}: ${number(item.data.value)}`);
    group.append("text").attr("text-anchor", "middle").attr("y", -3).style("font-size", "25px").style("font-weight", "800").style("fill", chartTheme.text).text(number(total));
    group.append("text").attr("text-anchor", "middle").attr("y", 18).text("lớp môn");
    const legend = svg.append("g").attr("transform", `translate(${width - 92},75)`);
    data.forEach((item, index) => {
        legend.append("circle").attr("cx", 0).attr("cy", index * 30).attr("r", 5).attr("fill", [chartTheme.teal, chartTheme.track][index]);
        legend.append("text").attr("x", 12).attr("y", index * 30 + 4).text(`${item.label} (${item.value})`);
    });
}

function renderTopCourses(data) {
    const { svg, width, height } = prepareSvg("#chart-top-courses", 620, 280);
    const sortedData = sortByMetric(data, (item) => item.registered);
    if (!sortedData.length) return emptyChart(svg, width, height);
    const margin = { top: 12, right: 45, bottom: 28, left: 150 };
    const y = window.d3.scaleBand().domain(sortedData.map((item) => item.id)).range([margin.top, height - margin.bottom]).padding(0.32);
    const maxCapacity = window.d3.max(sortedData, (item) => Math.max(item.capacity, item.registered)) || 1;
    const x = window.d3.scaleLinear().domain([0, maxCapacity]).nice().range([margin.left, width - margin.right]);
    svg.selectAll("rect.capacity").data(sortedData).join("rect").attr("class", "capacity")
        .attr("x", margin.left).attr("y", (item) => y(item.id)).attr("width", (item) => x(item.capacity) - margin.left)
        .attr("height", y.bandwidth()).attr("rx", 7).attr("fill", chartTheme.track);
    svg.selectAll("rect.registered").data(sortedData).join("rect").attr("class", "registered")
        .attr("x", margin.left).attr("y", (item) => y(item.id)).attr("width", (item) => Math.max(0, x(item.registered) - margin.left))
        .attr("height", y.bandwidth()).attr("rx", 7).attr("fill", chartTheme.primary)
        .append("title").text((item) => `${item.label}: ${item.registered}/${item.capacity}`);
    svg.append("g").attr("transform", `translate(${margin.left},0)`).call(window.d3.axisLeft(y).tickFormat((id) => {
        const item = sortedData.find((course) => course.id === id);
        const text = item ? `${id} · ${item.label}` : id;
        return text.length > 22 ? `${text.slice(0, 21)}…` : text;
    }).tickSize(0)).call((group) => group.select(".domain").remove());
    svg.append("g").attr("transform", `translate(0,${height - margin.bottom})`).call(window.d3.axisBottom(x).ticks(6).tickFormat(window.d3.format("d")));
    svg.selectAll("text.course-value").data(sortedData).join("text").attr("class", "course-value")
        .attr("x", (item) => x(Math.max(item.capacity, item.registered)) + 7).attr("y", (item) => y(item.id) + y.bandwidth() / 2 + 4)
        .text((item) => `${item.registered}/${item.capacity}`);
}

function renderOnlineActivity(activity) {
    const { svg, width, height } = prepareSvg("#chart-online-activity", 1050, 300);
    const data = activity?.hours || [];
    document.getElementById("online-students-now").textContent = number(activity?.studentsOnlineNow);
    document.getElementById("online-teachers-now").textContent = number(activity?.teachersOnlineNow);
    const dateLabel = document.getElementById("online-activity-date");
    if (dateLabel && activity?.date) {
        const [year, month, day] = activity.date.split("-");
        dateLabel.textContent = `Số tài khoản hoạt động theo từng khung giờ · ${day}/${month}/${year}`;
    }
    if (!data.length) return emptyChart(svg, width, height, "Chưa có dữ liệu hoạt động hôm nay");

    const margin = { top: 28, right: 26, bottom: 42, left: 45 };
    const x = window.d3.scaleBand().domain(data.map((item) => item.label))
        .range([margin.left, width - margin.right]).padding(0.22);
    const subgroup = window.d3.scaleBand().domain(["students", "teachers"])
        .range([0, x.bandwidth()]).padding(0.08);
    const maximum = window.d3.max(data, (item) => Math.max(item.students, item.teachers)) || 1;
    const y = window.d3.scaleLinear().domain([0, maximum]).nice()
        .range([height - margin.bottom, margin.top]);

    svg.append("g").attr("class", "grid").attr("transform", `translate(${margin.left},0)`)
        .call(window.d3.axisLeft(y).ticks(5).tickSize(-(width - margin.left - margin.right)).tickFormat(""));
    const hours = svg.selectAll("g.online-hour").data(data).join("g")
        .attr("class", "online-hour").attr("transform", (item) => `translate(${x(item.label)},0)`);
    hours.selectAll("rect").data((item) => [
        { key: "students", value: item.students, label: "Sinh viên", hour: item.label },
        { key: "teachers", value: item.teachers, label: "Giáo viên", hour: item.label }
    ]).join("rect")
        .attr("x", (item) => subgroup(item.key))
        .attr("y", (item) => y(item.value))
        .attr("width", subgroup.bandwidth())
        .attr("height", (item) => y(0) - y(item.value))
        .attr("rx", 4)
        .attr("fill", (item) => item.key === "students" ? chartTheme.primary : chartTheme.teal)
        .append("title").text((item) => `${item.hour} · ${item.label}: ${number(item.value)}`);
    svg.append("g").attr("transform", `translate(0,${height - margin.bottom})`)
        .call(window.d3.axisBottom(x).tickValues(data.filter((_, index) => index % 2 === 0).map((item) => item.label)));
    svg.append("g").attr("transform", `translate(${margin.left},0)`)
        .call(window.d3.axisLeft(y).ticks(5).tickFormat(window.d3.format("d")));
}

function updateTeacherPeriodFilter(popularity) {
    if (!teacherPeriodFilter) return "";
    const periods = popularity?.periods || [];
    const previous = teacherPeriodFilter.value;
    teacherPeriodFilter.replaceChildren();
    periods.forEach((period) => {
        const option = document.createElement("option");
        option.value = period.key;
        option.textContent = period.label;
        teacherPeriodFilter.appendChild(option);
    });
    const selected = periods.some((period) => period.key === previous)
        ? previous
        : (periods[0]?.key || "");
    teacherPeriodFilter.value = selected;
    teacherPeriodFilter.disabled = periods.length === 0;
    return selected;
}

function renderTeacherPopularity(popularity, requestedPeriod) {
    const { svg, width, height } = prepareSvg("#chart-teacher-popularity", 1050, 320);
    const period = requestedPeriod || popularity?.periods?.[0]?.key || "";
    const data = sortByMetric(popularity?.data?.[period] || [], (item) => item.value);
    if (!data.length) {
        if (teacherPopularityWinner) teacherPopularityWinner.textContent = "";
        return emptyChart(svg, width, height, "Chưa có lớp môn trong học kỳ này");
    }

    const highest = window.d3.max(data, (item) => Number(item.value)) || 0;
    const winners = data.filter((item) => Number(item.value) === highest);
    if (teacherPopularityWinner) {
        teacherPopularityWinner.textContent = highest > 0
            ? `★ Được lựa chọn nhiều nhất: ${winners.map((item) => item.label).join(", ")} · ${number(highest)} lượt`
            : "Chưa phát sinh lượt đăng ký trong học kỳ này.";
    }

    const margin = { top: 36, right: 24, bottom: 86, left: 48 };
    const x = window.d3.scaleBand()
        .domain(data.map((item) => item.id))
        .range([margin.left, width - margin.right])
        .padding(0.28);
    const y = window.d3.scaleLinear()
        .domain([0, highest || 1])
        .nice()
        .range([height - margin.bottom, margin.top]);

    svg.append("g").attr("class", "grid").attr("transform", `translate(${margin.left},0)`)
        .call(window.d3.axisLeft(y).ticks(5).tickSize(-(width - margin.left - margin.right)).tickFormat(""));
    svg.selectAll("rect.teacher-bar").data(data).join("rect")
        .attr("class", "teacher-bar")
        .attr("x", (item) => x(item.id))
        .attr("y", (item) => y(item.value))
        .attr("width", x.bandwidth())
        .attr("height", (item) => y(0) - y(item.value))
        .attr("rx", 8)
        .attr("fill", (item) => highest > 0 && Number(item.value) === highest ? chartTheme.winner : chartTheme.primary)
        .append("title")
        .text((item) => `${item.label} (${item.id}): ${number(item.value)} lượt đăng ký`);
    svg.selectAll("text.teacher-value").data(data).join("text")
        .attr("class", "teacher-value")
        .attr("x", (item) => x(item.id) + x.bandwidth() / 2)
        .attr("y", (item) => y(item.value) - 9)
        .attr("text-anchor", "middle")
        .style("font-weight", "750")
        .style("fill", chartTheme.text)
        .text((item) => number(item.value));
    svg.append("g")
        .attr("transform", `translate(0,${height - margin.bottom})`)
        .call(window.d3.axisBottom(x).tickFormat((id) => {
            const item = data.find((teacher) => teacher.id === id);
            const label = item?.label || id;
            return label.length > 19 ? `${label.slice(0, 18)}…` : label;
        }))
        .selectAll("text")
        .attr("text-anchor", "end")
        .attr("transform", "rotate(-28)")
        .attr("dx", "-0.45em")
        .attr("dy", "0.25em");
    svg.append("g").attr("transform", `translate(${margin.left},0)`)
        .call(window.d3.axisLeft(y).ticks(5).tickFormat(window.d3.format("d")));
}

function renderDashboard(payload) {
    latestDashboardPayload = payload;
    syncChartTheme();
    updateKpis(payload.summary || {});
    renderDepartmentDonut(payload.studentsByDepartment || []);
    renderVerticalBars(payload.studentsByIntake || []);
    renderStatusDonut(payload.courseStatus || []);
    renderTopCourses(payload.topCourses || []);
    renderOnlineActivity(payload.onlineActivity || {});
    const selectedPeriod = updateTeacherPeriodFilter(payload.teacherPopularity || {});
    renderTeacherPopularity(payload.teacherPopularity || {}, selectedPeriod);
    stateBox.hidden = true;
    chartsBox.hidden = false;
    const date = payload.generatedAt ? new Date(payload.generatedAt) : new Date();
    updatedAt.textContent = `Cập nhật ${date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}`;
}

async function loadDashboard() {
    if (!stateBox || !chartsBox) return;
    setState("Đang phân tích dữ liệu...");
    refreshButton.disabled = true;
    try {
        if (!window.d3) throw new Error("Không tải được thư viện D3.js. Hãy kiểm tra kết nối mạng.");
        const user = await waitForUser();
        const token = await user.getIdToken();
        const response = await fetch("/api/admin/dashboard", {
            headers: { Authorization: `Bearer ${token}` }
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Không thể tải dashboard.");
        renderDashboard(payload);
    } catch (error) {
        console.error("Không thể tải dashboard:", error);
        setState(error.message || "Không thể tải dashboard.", "error");
        updatedAt.textContent = "Đồng bộ thất bại";
    } finally {
        refreshButton.disabled = false;
    }
}

refreshButton?.addEventListener("click", loadDashboard);
teacherPeriodFilter?.addEventListener("change", () => {
    if (latestDashboardPayload) {
        renderTeacherPopularity(latestDashboardPayload.teacherPopularity || {}, teacherPeriodFilter.value);
    }
});
dashboardSortOrder?.addEventListener("change", () => {
    if (latestDashboardPayload) renderDashboard(latestDashboardPayload);
});
window.addEventListener("portal-theme-change", () => {
    if (latestDashboardPayload) renderDashboard(latestDashboardPayload);
});
loadDashboard();
