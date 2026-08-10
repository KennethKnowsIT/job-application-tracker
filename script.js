const STORAGE_KEY = "jobTrackerApplications";
const THEME_KEY = "jobTrackerTheme";
const RESUME_DB = "jobTrackerFiles";
const RESUME_STORE = "resumes";
const ACTIVITY_KEY = "jobTrackerActivity";

// Small helper so we can grab an HTML element by its id.
const $ = (id) => document.getElementById(id);

// Frequently used page elements.
const elements = {
    modal: $("applicationModal"),
    form: $("applicationForm"),
    formHeading: $("formHeading"),
    formMessage: $("formMessage"),
    grid: $("applicationsGrid"),
    emptyState: $("emptyState"),
    resultCount: $("resultCount"),
    search: $("searchInput"),
    filter: $("statusFilter"),
    priorityFilter: $("priorityFilter"),
    sourceFilter: $("sourceFilter"),
    toast: $("toast"),
    pageTitle: $("pageTitle")
};

// Form fields used when adding or editing an application.
const fields = {
    id: $("applicationId"),
    company: $("companyName"),
    title: $("jobTitle"),
    location: $("location"),
    salary: $("salary"),
    date: $("applicationDate"),
    status: $("status"),
    priority: $("priority"),
    source: $("jobSource"),
    interviewDate: $("interviewDate"),
    interviewTime: $("interviewTime"),
    followUpDate: $("followUpDate"),
    link: $("jobLink"),
    notes: $("notes")
};

let applications = loadApplications();
let activityLog = loadActivity();
let toastTimer;

// ---------------- COMPANY AUTOCOMPLETE ----------------
// companies.js owns the large built-in company list. This file adds companies
// from the user's saved applications and controls the visible suggestion menu.
let companyMatches = [];
let activeCompanyIndex = -1;

function getCompanyDatabase() {
    // Learn from the user's own applications, even when a company is not built in.
    const savedCompanies = applications
        .map(app => (app.company || "").trim())
        .filter(Boolean);

    const builtInCompanies = Array.isArray(window.JOBTRACK_COMPANIES)
        ? window.JOBTRACK_COMPANIES
        : [];

    // Remove duplicates without caring about capitalization.
    const unique = new Map();
    [...savedCompanies, ...builtInCompanies].forEach(company => {
        const key = company.toLowerCase();
        if (!unique.has(key)) unique.set(key, company);
    });

    return [...unique.values()].sort((a, b) => a.localeCompare(b));
}

function findCompanyMatches(query) {
    const term = query.trim().toLowerCase();
    if (!term) return [];

    const database = getCompanyDatabase();

    // Companies that START with the typed text appear before companies that only contain it.
    const startsWith = database.filter(company => company.toLowerCase().startsWith(term));
    const contains = database.filter(company => {
        const name = company.toLowerCase();
        return !name.startsWith(term) && name.includes(term);
    });

    return [...startsWith, ...contains].slice(0, 10);
}

function closeCompanySuggestions() {
    const list = $("companySuggestions");
    if (!list) return;
    list.classList.add("hidden");
    list.innerHTML = "";
    fields.company.setAttribute("aria-expanded", "false");
    fields.company.setAttribute("aria-activedescendant", "");
    companyMatches = [];
    activeCompanyIndex = -1;
}

function renderCompanySuggestions() {
    const list = $("companySuggestions");
    if (!list) return;

    companyMatches = findCompanyMatches(fields.company.value);
    activeCompanyIndex = -1;

    if (!companyMatches.length) {
        closeCompanySuggestions();
        return;
    }

    list.innerHTML = companyMatches.map((company, index) => `
        <button
            class="company-suggestion"
            id="company-option-${index}"
            type="button"
            role="option"
            data-company-index="${index}"
            aria-selected="false"
        >
            ${escapeHTML(company)}
        </button>
    `).join("");

    list.classList.remove("hidden");
    fields.company.setAttribute("aria-expanded", "true");
}

function setActiveCompany(index) {
    const options = [...document.querySelectorAll(".company-suggestion")];
    if (!options.length) return;

    activeCompanyIndex = (index + options.length) % options.length;

    options.forEach((option, optionIndex) => {
        const active = optionIndex === activeCompanyIndex;
        option.classList.toggle("active", active);
        option.setAttribute("aria-selected", String(active));
    });

    const activeOption = options[activeCompanyIndex];
    fields.company.setAttribute("aria-activedescendant", activeOption.id);
    activeOption.scrollIntoView({ block: "nearest" });
}

function chooseCompany(index) {
    const company = companyMatches[index];
    if (!company) return;
    fields.company.value = company;
    closeCompanySuggestions();
    fields.company.focus();
}

function handleCompanyKeydown(event) {
    if (event.key === "ArrowDown") {
        event.preventDefault();
        if (!companyMatches.length) renderCompanySuggestions();
        if (companyMatches.length) setActiveCompany(activeCompanyIndex + 1);
    } else if (event.key === "ArrowUp") {
        event.preventDefault();
        if (!companyMatches.length) renderCompanySuggestions();
        if (companyMatches.length) setActiveCompany(activeCompanyIndex - 1);
    } else if (event.key === "Enter" && activeCompanyIndex >= 0) {
        event.preventDefault();
        chooseCompany(activeCompanyIndex);
    } else if (event.key === "Escape") {
        closeCompanySuggestions();
    }
}

function handleCompanySuggestionClick(event) {
    const option = event.target.closest("[data-company-index]");
    if (!option) return;
    chooseCompany(Number(option.dataset.companyIndex));
}

function loadActivity() {
    try {
        return JSON.parse(localStorage.getItem(ACTIVITY_KEY) || "[]");
    } catch (error) {
        console.error(error);
        return [];
    }
}

function saveActivity() {
    localStorage.setItem(ACTIVITY_KEY, JSON.stringify(activityLog.slice(0, 30)));
}

function logActivity(message) {
    activityLog.unshift({ id: createId(), message, time: new Date().toISOString() });
    activityLog = activityLog.slice(0, 30);
    saveActivity();
}

// Load saved applications from the browser's localStorage.
function loadApplications() {
    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
        return saved.map(item => ({
            interviewDate: "",
            followUpDate: "",
            priority: "Medium",
            source: "Other",
            ...item,
            company: item.company || item.companyName || "",
            title: item.title || item.jobTitle || ""
        }));
    } catch (error) {
        console.error(error);
        return [];
    }
}

// Save the current application list so it survives a page refresh.
function saveApplications() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(applications));
}

function showToast(message) {
    elements.toast.textContent = message;
    elements.toast.classList.remove("hidden");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => elements.toast.classList.add("hidden"), 2600);
}

function createId() {
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function todayISO() {
    return new Date().toISOString().split("T")[0];
}

function openForm(application = null) {
    // Start with a clean form every time the modal opens.
    elements.form.reset();
    elements.formMessage.textContent = "";
    fields.id.value = "";

    if (application) {
        elements.formHeading.textContent = "Edit application";

        // Fill the normal fields from the saved application.
        fields.company.value = application.company || "";
        fields.title.value = application.title || "";
        fields.location.value = application.location || "";
        fields.salary.value = application.salary || "";
        fields.date.value = application.date || "";
        fields.status.value = application.status || "Applied";
        fields.priority.value = application.priority || "Medium";
        fields.source.value = application.source || "Other";
        fields.followUpDate.value = application.followUpDate || "";
        fields.link.value = application.link || "";
        fields.notes.value = application.notes || "";

        // interviewDate is stored as YYYY-MM-DDTHH:MM. Split it back
        // into the separate date box and time dropdown while editing.
        if (application.interviewDate) {
            const [interviewDate, interviewTime = ""] = application.interviewDate.split("T");
            fields.interviewDate.value = interviewDate;
            fields.interviewTime.value = interviewTime.slice(0, 5);
        }

        fields.id.value = application.id;
    } else {
        elements.formHeading.textContent = "Add application";
        fields.date.value = todayISO();
        fields.status.value = "Applied";
        fields.priority.value = "Medium";
        fields.source.value = "Other";
    }

    elements.modal.classList.remove("hidden");
    document.body.classList.add("modal-open");
    fields.company.focus();
}

function closeForm() {
    closeCompanySuggestions();
    elements.modal.classList.add("hidden");
    document.body.classList.remove("modal-open");
}

function escapeHTML(value = "") {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function formatDate(value, includeTime = false) {
    if (!value) return "Not set";
    const normalized = value.includes("T") ? value : `${value}T00:00:00`;
    const date = new Date(normalized);
    if (Number.isNaN(date.getTime())) return "Not set";
    return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        ...(includeTime ? { hour: "numeric", minute: "2-digit" } : {})
    }).format(date);
}

function initials(company) {
    return company
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map(word => word[0].toUpperCase())
        .join("") || "?";
}

function daysUntil(dateString) {
    if (!dateString) return null;
    const target = new Date(`${dateString.split("T")[0]}T00:00:00`);
    const today = new Date(`${todayISO()}T00:00:00`);
    return Math.round((target - today) / 86400000);
}

function dueText(application) {
    const candidates = [];
    if (application.interviewDate) {
        candidates.push({ label: "Interview", date: application.interviewDate.split("T")[0] });
    }
    if (application.followUpDate) {
        candidates.push({ label: "Follow-up", date: application.followUpDate });
    }
    candidates.sort((a, b) => new Date(a.date) - new Date(b.date));
    const next = candidates[0];
    if (!next) return "";

    const days = daysUntil(next.date);
    if (days < 0) return `${next.label} overdue`;
    if (days === 0) return `${next.label} today`;
    if (days === 1) return `${next.label} tomorrow`;
    if (days <= 7) return `${next.label} in ${days} days`;
    return "";
}

function getFiltered() {
    const term = elements.search.value.trim().toLowerCase();
    const status = elements.filter.value;
    const priority = elements.priorityFilter.value;
    const source = elements.sourceFilter.value;
    return [...applications]
        .filter(app =>
            (!term || [app.company, app.title, app.location, app.source].some(value => (value || "").toLowerCase().includes(term))) &&
            (status === "all" || app.status === status) &&
            (priority === "all" || app.priority === priority) &&
            (source === "all" || app.source === source)
        )
        .sort((a, b) => new Date(b.date) - new Date(a.date));
}

function renderApplications() {
    const filtered = getFiltered();
    elements.grid.innerHTML = "";
    elements.emptyState.classList.toggle("hidden", filtered.length > 0);
    elements.resultCount.textContent = `${filtered.length} ${filtered.length === 1 ? "application" : "applications"}`;

    filtered.forEach(app => {
        const card = document.createElement("article");
        card.className = "application-card";
        const due = dueText(app);

        card.innerHTML = `
            <div class="card-top">
                <div class="company-logo">${escapeHTML(initials(app.company))}</div>
                <div class="card-title-block">
                    <h3>${escapeHTML(app.company)}</h3>
                    <p>${escapeHTML(app.title)}</p>
                </div>
                <span class="status-badge status-${app.status.toLowerCase()}">${escapeHTML(app.status)}</span>
            </div>

            <div class="card-tags">
                <span class="priority-badge priority-${(app.priority || "Medium").toLowerCase()}">${escapeHTML(app.priority || "Medium")} priority</span>
                <span class="source-badge">${escapeHTML(app.source || "Other")}</span>
                ${due ? `<span class="due-badge">${escapeHTML(due)}</span>` : ""}
            </div>

            <div class="card-details">
                <p><strong>Location:</strong> ${escapeHTML(app.location || "Not provided")}</p>
                <p><strong>Salary:</strong> ${escapeHTML(app.salary || "Not provided")}</p>
                <p><strong>Applied:</strong> ${formatDate(app.date)}</p>
                ${app.interviewDate ? `<p><strong>Interview:</strong> ${formatDate(app.interviewDate, app.interviewDate.includes("T"))}</p>` : ""}
                ${app.followUpDate ? `<p><strong>Follow-up:</strong> ${formatDate(app.followUpDate)}</p>` : ""}
                ${app.link ? `<p><a class="job-link" href="${escapeHTML(app.link)}" target="_blank" rel="noopener noreferrer">View posting</a></p>` : ""}
            </div>

            ${app.notes ? `<p class="card-notes">${escapeHTML(app.notes)}</p>` : ""}

            <div class="card-actions">
                <button class="card-action" data-action="edit" data-id="${app.id}" type="button">Edit</button>
                <button class="card-action danger" data-action="delete" data-id="${app.id}" type="button">Delete</button>
            </div>
        `;
        elements.grid.appendChild(card);
    });

    renderAllDataViews();
}

function renderAllDataViews() {
    renderMetrics();
    renderReminders();
    renderRecentActivity();
    renderCalendar();
    renderStatusChart();
    renderAnalytics();
}

function countStatus(status) {
    return applications.filter(app => app.status === status).length;
}

function renderMetrics() {
    $("totalCount").textContent = applications.length;
    $("appliedCount").textContent = countStatus("Applied");
    $("interviewCount").textContent = countStatus("Interview");
    $("offerCount").textContent = countStatus("Offer");
    $("rejectedCount").textContent = countStatus("Rejected");

    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setHours(0, 0, 0, 0);
    startOfWeek.setDate(now.getDate() - now.getDay());
    $("weekCount").textContent = applications.filter(app => {
        const date = new Date(`${app.date}T00:00:00`);
        return date >= startOfWeek && date <= now;
    }).length;
}

function upcomingItems() {
    const items = [];
    applications.forEach(app => {
        if (app.interviewDate) items.push({ type: "Interview", date: app.interviewDate, app });
        if (app.followUpDate) items.push({ type: "Follow-up", date: app.followUpDate, app });
    });
    return items.sort((a, b) => new Date(a.date) - new Date(b.date));
}

function renderReminders() {
    const container = $("reminderList");
    const relevant = upcomingItems().filter(item => {
        const days = daysUntil(item.date);
        return days !== null && days >= -7 && days <= 14;
    }).slice(0, 5);

    if (!relevant.length) {
        container.innerHTML = `<p class="muted-text">No reminders due in the next two weeks.</p>`;
        return;
    }

    container.innerHTML = relevant.map(item => `
        <div class="reminder-item">
            <span class="reminder-dot"></span>
            <div>
                <strong>${escapeHTML(item.type)} · ${escapeHTML(item.app.company)}</strong>
                <small>${formatDate(item.date, item.type === "Interview")} · ${escapeHTML(item.app.title)}</small>
            </div>
        </div>
    `).join("");
}

function renderRecentActivity() {
    const container = $("activityList");
    if (!container) return;

    if (!activityLog.length) {
        container.innerHTML = `<p class="muted-text">Your latest adds, edits, and status changes will appear here.</p>`;
        return;
    }

    container.innerHTML = activityLog.slice(0, 6).map(item => `
        <div class="activity-item">
            <div>
                <strong>${escapeHTML(item.message)}</strong>
                <small>${formatRelativeTime(item.time)}</small>
            </div>
        </div>
    `).join("");
}

function formatRelativeTime(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Recently";
    const minutes = Math.max(0, Math.round((Date.now() - date.getTime()) / 60000));
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.round(hours / 24);
    return `${days}d ago`;
}

function renderCalendar() {
    const container = $("calendarList");
    const items = upcomingItems();

    if (!items.length) {
        container.innerHTML = `<p class="muted-text">Interview and follow-up dates will appear here.</p>`;
        return;
    }

    container.innerHTML = items.map(item => `
        <div class="calendar-item">
            <div class="company-logo">${escapeHTML(initials(item.app.company))}</div>
            <div>
                <strong>${escapeHTML(item.type)} with ${escapeHTML(item.app.company)}</strong>
                <small>${formatDate(item.date, item.type === "Interview")} · ${escapeHTML(item.app.title)}</small>
            </div>
        </div>
    `).join("");
}

function setupCanvas(canvas) {
    const rect = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.max(320, rect.width * ratio);
    canvas.height = 290 * ratio;
    const ctx = canvas.getContext("2d");
    ctx.scale(ratio, ratio);
    return { ctx, width: rect.width, height: 290 };
}

function cssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function renderStatusChart() {
    const canvas = $("statusChart");
    const { ctx, width, height } = setupCanvas(canvas);
    const data = [
        ["Applied", countStatus("Applied")],
        ["Interview", countStatus("Interview")],
        ["Offer", countStatus("Offer")],
        ["Rejected", countStatus("Rejected")]
    ];
    const max = Math.max(1, ...data.map(([,value]) => value));
    const padding = { left: 46, right: 20, top: 20, bottom: 44 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;
    const gap = 18;
    const barW = (chartW - gap * (data.length - 1)) / data.length;

    ctx.clearRect(0, 0, width, height);
    ctx.font = "12px system-ui";
    ctx.textAlign = "center";

    data.forEach(([label, value], index) => {
        const x = padding.left + index * (barW + gap);
        const barH = value === 0 ? 3 : (value / max) * (chartH - 24);
        const y = padding.top + chartH - barH;
        ctx.fillStyle = cssVar("--primary");
        roundRect(ctx, x, y, barW, barH, 10);
        ctx.fill();
        ctx.fillStyle = cssVar("--text");
        ctx.fillText(String(value), x + barW / 2, Math.max(14, y - 8));
        ctx.fillStyle = cssVar("--muted");
        ctx.fillText(label, x + barW / 2, height - 16);
    });
}

function roundRect(ctx, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + width, y, x + width, y + height, r);
    ctx.arcTo(x + width, y + height, x, y + height, r);
    ctx.arcTo(x, y + height, x, y, r);
    ctx.arcTo(x, y, x + width, y, r);
    ctx.closePath();
}

function monthKey(date) {
    return new Intl.DateTimeFormat("en-US", { month: "short", year: "2-digit" }).format(date);
}

function lastSixMonths() {
    const now = new Date();
    return Array.from({ length: 6 }, (_, index) => {
        const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
        return { date, label: monthKey(date), key: `${date.getFullYear()}-${date.getMonth()}` };
    });
}

function renderTimelineChart() {
    const canvas = $("timelineChart");
    const rect = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.max(320, rect.width * ratio);
    canvas.height = 330 * ratio;
    const ctx = canvas.getContext("2d");
    ctx.scale(ratio, ratio);
    const width = rect.width;
    const height = 330;
    const months = lastSixMonths();
    const values = months.map(month => applications.filter(app => {
        const date = new Date(`${app.date}T00:00:00`);
        return `${date.getFullYear()}-${date.getMonth()}` === month.key;
    }).length);
    const max = Math.max(1, ...values);
    const p = { left: 44, right: 24, top: 30, bottom: 46 };
    const chartW = width - p.left - p.right;
    const chartH = height - p.top - p.bottom;
    const step = chartW / Math.max(1, months.length - 1);

    ctx.clearRect(0, 0, width, height);
    ctx.strokeStyle = cssVar("--border");
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
        const y = p.top + (chartH / 4) * i;
        ctx.beginPath(); ctx.moveTo(p.left, y); ctx.lineTo(width - p.right, y); ctx.stroke();
    }

    ctx.strokeStyle = cssVar("--primary");
    ctx.lineWidth = 3;
    ctx.beginPath();
    values.forEach((value, index) => {
        const x = p.left + index * step;
        const y = p.top + chartH - (value / max) * chartH;
        index === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();

    ctx.font = "12px system-ui";
    ctx.textAlign = "center";
    months.forEach((month, index) => {
        const x = p.left + index * step;
        const y = p.top + chartH - (values[index] / max) * chartH;
        ctx.fillStyle = cssVar("--primary");
        ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = cssVar("--text");
        ctx.fillText(String(values[index]), x, Math.max(16, y - 12));
        ctx.fillStyle = cssVar("--muted");
        ctx.fillText(month.label, x, height - 16);
    });
}

function renderAnalytics() {
    const total = applications.length;
    $("interviewRate").textContent = `${total ? Math.round((countStatus("Interview") / total) * 100) : 0}%`;
    $("offerRate").textContent = `${total ? Math.round((countStatus("Offer") / total) * 100) : 0}%`;
    const progressed = applications.filter(app => app.status !== "Applied").length;
    $("responseRate").textContent = `${total ? Math.round((progressed / total) * 100) : 0}%`;

    const now = new Date();
    $("monthCount").textContent = applications.filter(app => {
        const date = new Date(`${app.date}T00:00:00`);
        return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    }).length;

    const ages = applications.map(app => {
        const applied = new Date(`${app.date}T00:00:00`);
        return Math.max(0, Math.floor((now - applied) / 86400000));
    }).filter(Number.isFinite);
    $("averageAge").textContent = `${ages.length ? Math.round(ages.reduce((sum, days) => sum + days, 0) / ages.length) : 0}d`;

    renderTimelineChart();
    renderCompanyBreakdown();
    renderSourceBreakdown();
}

function renderCompanyBreakdown() {
    const counts = applications.reduce((acc, app) => {
        acc[app.company] = (acc[app.company] || 0) + 1;
        return acc;
    }, {});
    const rows = Object.entries(counts).sort((a,b) => b[1] - a[1]);
    const max = Math.max(1, ...rows.map(([,count]) => count));
    $("companyBreakdown").innerHTML = rows.length ? rows.map(([company, count]) => `
        <div class="company-row">
            <strong>${escapeHTML(company)}</strong>
            <div class="company-bar-track"><div class="company-bar" style="width:${(count/max)*100}%"></div></div>
            <span>${count}</span>
        </div>
    `).join("") : `<p class="muted-text">Add applications to see your company breakdown.</p>`;
}

function renderSourceBreakdown() {
    const counts = applications.reduce((acc, app) => {
        const source = app.source || "Other";
        acc[source] = (acc[source] || 0) + 1;
        return acc;
    }, {});
    const rows = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const max = Math.max(1, ...rows.map(([, count]) => count));
    $("sourceBreakdown").innerHTML = rows.length ? rows.map(([source, count]) => `
        <div class="company-row">
            <strong>${escapeHTML(source)}</strong>
            <div class="company-bar-track"><div class="company-bar" style="width:${(count / max) * 100}%"></div></div>
            <span>${count}</span>
        </div>
    `).join("") : `<p class="muted-text">Choose a job source when adding applications to see this breakdown.</p>`;
}

// Validate the form, build the application object, and save it.
function handleSubmit(event) {
    event.preventDefault();
    const company = fields.company.value.trim();
    const title = fields.title.value.trim();
    const date = fields.date.value;

    if (!company || !title || !date) {
        elements.formMessage.textContent = "Company, job title, and application date are required.";
        return;
    }

    // Combine the separate interview date and time into one value for storage.
    // Example: 2026-08-15 + 14:30 becomes 2026-08-15T14:30.
    let interviewDate = "";
    if (fields.interviewDate.value) {
        interviewDate = fields.interviewTime.value
            ? `${fields.interviewDate.value}T${fields.interviewTime.value}`
            : fields.interviewDate.value;
    }

    const application = {
        id: fields.id.value || createId(),
        company,
        title,
        location: fields.location.value.trim(),
        salary: fields.salary.value.trim(),
        date,
        status: fields.status.value,
        priority: fields.priority.value,
        source: fields.source.value,
        interviewDate,
        followUpDate: fields.followUpDate.value,
        link: fields.link.value.trim(),
        notes: fields.notes.value.trim()
    };

    const index = applications.findIndex(app => app.id === application.id);
    const previous = index >= 0 ? applications[index] : null;
    if (index >= 0) applications[index] = application;
    else applications.push(application);

    if (previous) {
        if (previous.status !== application.status) {
            logActivity(`${application.company}: ${previous.status} → ${application.status}`);
        } else {
            logActivity(`Updated ${application.company} · ${application.title}`);
        }
    } else {
        logActivity(`Added ${application.company} · ${application.title}`);
    }

    saveApplications();
    renderApplications();
    closeForm();
    showToast(index >= 0 ? "Application updated." : "Application added.");
}

// Handles Edit and Delete buttons on application cards.
function handleCardAction(event) {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    const app = applications.find(item => item.id === button.dataset.id);
    if (!app) return;

    if (button.dataset.action === "edit") openForm(app);
    if (button.dataset.action === "delete" && confirm(`Delete ${app.company}?`)) {
        applications = applications.filter(item => item.id !== app.id);
        logActivity(`Deleted ${app.company} · ${app.title}`);
        saveApplications();
        renderApplications();
        showToast("Application deleted.");
    }
}

// Export all saved applications as a CSV spreadsheet file.
function exportCSV() {
    if (!applications.length) {
        showToast("Add an application before exporting.");
        return;
    }

    const headers = ["Company","Job Title","Location","Salary","Application Date","Status","Priority","Source","Interview Date","Follow-up Date","Job Link","Notes"];
    const rows = applications.map(app => [
        app.company, app.title, app.location, app.salary, app.date, app.status, app.priority, app.source,
        app.interviewDate, app.followUpDate, app.link, app.notes
    ]);
    const csv = [headers, ...rows].map(row => row.map(value => `"${String(value || "").replaceAll('"','""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `job-applications-${todayISO()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast("CSV exported.");
}

// Adds sample records so the dashboard can be tested quickly.
function loadDemoData() {
    if (applications.length && !confirm("Add demo entries to your existing applications?")) return;
    const now = new Date();
    const dateOffset = days => new Date(now.getTime() + days * 86400000).toISOString().split("T")[0];
    const dateTimeOffset = days => `${dateOffset(days)}T10:30`;

    const demos = [
        { company: "Microsoft", priority: "High", source: "LinkedIn", title: "Junior Front End Developer", location: "Atlanta, GA", salary: "$82,000", date: dateOffset(-12), status: "Interview", interviewDate: dateTimeOffset(2), followUpDate: dateOffset(4), link: "", notes: "Review React fundamentals and prepare STAR stories." },
        { company: "Lockheed Martin", priority: "High", source: "Company Website", title: "Cybersecurity Analyst I", location: "Marietta, GA", salary: "$78,000", date: dateOffset(-8), status: "Applied", interviewDate: "", followUpDate: dateOffset(1), link: "", notes: "Veteran-friendly role. Follow up with recruiter." },
        { company: "Mailchimp", priority: "Medium", source: "LinkedIn", title: "Web Developer", location: "Atlanta, GA", salary: "$76,000", date: dateOffset(-21), status: "Rejected", interviewDate: "", followUpDate: "", link: "", notes: "Save the posting to compare required skills." },
        { company: "Home Depot", priority: "High", source: "Referral", title: "Software Engineer Associate", location: "Remote", salary: "$88,000", date: dateOffset(-3), status: "Offer", interviewDate: "", followUpDate: dateOffset(3), link: "", notes: "Review offer details and benefits." }
    ].map(item => ({ id: createId(), ...item }));

    applications.push(...demos);
    logActivity(`Loaded ${demos.length} demo applications`);
    saveApplications();
    renderApplications();
    showToast("Demo data loaded.");
}

function switchView(viewName) {
    document.querySelectorAll(".view").forEach(view => view.classList.remove("active-view"));
    document.querySelectorAll(".nav-button").forEach(button => button.classList.remove("active"));
    $(`${viewName}View`).classList.add("active-view");
    document.querySelector(`[data-view="${viewName}"]`).classList.add("active");
    elements.pageTitle.textContent = viewName[0].toUpperCase() + viewName.slice(1);
    if (viewName === "analytics") setTimeout(renderAnalytics, 20);
}

function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    $("themeToggle").textContent = theme === "dark" ? "☀" : "☾";
    localStorage.setItem(THEME_KEY, theme);
    setTimeout(() => {
        renderStatusChart();
        renderTimelineChart();
    }, 20);
}

function initTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    applyTheme(saved || "dark");
}

function openResumeDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(RESUME_DB, 1);
        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(RESUME_STORE)) {
                db.createObjectStore(RESUME_STORE, { keyPath: "id" });
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function saveResume(file) {
    const db = await openResumeDB();
    const transaction = db.transaction(RESUME_STORE, "readwrite");
    transaction.objectStore(RESUME_STORE).put({
        id: "primary",
        name: file.name,
        type: file.type,
        size: file.size,
        updatedAt: new Date().toISOString(),
        blob: file
    });
    await transactionComplete(transaction);
    db.close();
    renderResume();
}

async function getResume() {
    const db = await openResumeDB();
    const transaction = db.transaction(RESUME_STORE, "readonly");
    const request = transaction.objectStore(RESUME_STORE).get("primary");
    const result = await requestResult(request);
    db.close();
    return result;
}

async function deleteResume() {
    const db = await openResumeDB();
    const transaction = db.transaction(RESUME_STORE, "readwrite");
    transaction.objectStore(RESUME_STORE).delete("primary");
    await transactionComplete(transaction);
    db.close();
    renderResume();
    showToast("Resume removed.");
}

function transactionComplete(transaction) {
    return new Promise((resolve, reject) => {
        transaction.oncomplete = resolve;
        transaction.onerror = () => reject(transaction.error);
    });
}

function requestResult(request) {
    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function renderResume() {
    const container = $("resumeDetails");
    try {
        const resume = await getResume();
        if (!resume) {
            container.innerHTML = `<p class="muted-text">No resume saved in this browser.</p>`;
            return;
        }
        container.innerHTML = `
            <div class="resume-card">
                <div>
                    <strong>${escapeHTML(resume.name)}</strong>
                    <small>${(resume.size / 1024 / 1024).toFixed(2)} MB · Saved ${formatDate(resume.updatedAt, true)}</small>
                </div>
                <div class="resume-actions">
                    <button class="card-action" id="downloadResumeButton" type="button">Download</button>
                    <button class="card-action danger" id="deleteResumeButton" type="button">Delete</button>
                </div>
            </div>
        `;
        $("downloadResumeButton").addEventListener("click", async () => {
            const stored = await getResume();
            const url = URL.createObjectURL(stored.blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = stored.name;
            link.click();
            URL.revokeObjectURL(url);
        });
        $("deleteResumeButton").addEventListener("click", deleteResume);
    } catch (error) {
        console.error(error);
        container.innerHTML = `<p class="muted-text">Resume storage is unavailable in this browser.</p>`;
    }
}

document.querySelectorAll(".nav-button").forEach(button => {
    button.addEventListener("click", () => switchView(button.dataset.view));
});

[$("openFormButton"), $("heroAddButton"), $("emptyStateButton")].forEach(button => button.addEventListener("click", () => openForm()));
$("closeFormButton").addEventListener("click", closeForm);
$("cancelButton").addEventListener("click", closeForm);
elements.form.addEventListener("submit", handleSubmit);

// Company autocomplete listeners.
fields.company.addEventListener("input", renderCompanySuggestions);
fields.company.addEventListener("focus", () => {
    if (fields.company.value.trim()) renderCompanySuggestions();
});
fields.company.addEventListener("keydown", handleCompanyKeydown);
$("companySuggestions").addEventListener("click", handleCompanySuggestionClick);
fields.company.addEventListener("blur", () => {
    // Small delay allows a mouse click on a suggestion to register first.
    setTimeout(closeCompanySuggestions, 120);
});
elements.grid.addEventListener("click", handleCardAction);
elements.search.addEventListener("input", renderApplications);
elements.filter.addEventListener("change", renderApplications);
elements.priorityFilter.addEventListener("change", renderApplications);
elements.sourceFilter.addEventListener("change", renderApplications);
$("exportButton").addEventListener("click", exportCSV);
$("loadDemoButton").addEventListener("click", loadDemoData);
$("themeToggle").addEventListener("click", () => applyTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark"));
$("resumeInput").addEventListener("change", event => {
    const file = event.target.files[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
        showToast("Choose a resume smaller than 8 MB.");
        return;
    }
    saveResume(file).then(() => showToast("Resume saved in this browser."));
});
elements.modal.addEventListener("click", event => { if (event.target === elements.modal) closeForm(); });
document.addEventListener("keydown", event => { if (event.key === "Escape" && !elements.modal.classList.contains("hidden")) closeForm(); });
window.addEventListener("resize", () => {
    clearTimeout(window.chartResizeTimer);
    window.chartResizeTimer = setTimeout(renderAllDataViews, 120);
});

initTheme();
renderApplications();
renderResume();
