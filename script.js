const STORAGE_KEY = "jobTrackerApplications";

const applicationForm = document.getElementById("applicationForm");
const applicationModal = document.getElementById("applicationModal");
const openFormButton = document.getElementById("openFormButton");
const closeFormButton = document.getElementById("closeFormButton");
const cancelButton = document.getElementById("cancelButton");
const emptyStateButton = document.getElementById("emptyStateButton");
const applicationsGrid = document.getElementById("applicationsGrid");
const emptyState = document.getElementById("emptyState");
const searchInput = document.getElementById("searchInput");
const statusFilter = document.getElementById("statusFilter");
const formHeading = document.getElementById("formHeading");
const formMessage = document.getElementById("formMessage");
const resultCount = document.getElementById("resultCount");

const totalCount = document.getElementById("totalCount");
const appliedCount = document.getElementById("appliedCount");
const interviewCount = document.getElementById("interviewCount");
const offerCount = document.getElementById("offerCount");
const rejectedCount = document.getElementById("rejectedCount");

const applicationId = document.getElementById("applicationId");
const companyName = document.getElementById("companyName");
const jobTitle = document.getElementById("jobTitle");
const locationInput = document.getElementById("location");
const salary = document.getElementById("salary");
const applicationDate = document.getElementById("applicationDate");
const statusInput = document.getElementById("status");
const jobLink = document.getElementById("jobLink");
const notes = document.getElementById("notes");

let applications = loadApplications();

function loadApplications() {
    const savedApplications = localStorage.getItem(STORAGE_KEY);

    if (!savedApplications) {
        return [];
    }

    try {
        return JSON.parse(savedApplications);
    } catch (error) {
        console.error("The saved application data could not be read.", error);
        return [];
    }
}

function saveApplications() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(applications));
}

function createApplicationId() {
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function setDefaultDate() {
    applicationDate.value = new Date().toISOString().split("T")[0];
}

function openForm(application = null) {
    formMessage.textContent = "";

    if (application) {
        formHeading.textContent = "Edit Application";
        applicationId.value = application.id;
        companyName.value = application.company;
        jobTitle.value = application.title;
        locationInput.value = application.location;
        salary.value = application.salary;
        applicationDate.value = application.date;
        statusInput.value = application.status;
        jobLink.value = application.link;
        notes.value = application.notes;
    } else {
        formHeading.textContent = "Add an Application";
        applicationForm.reset();
        applicationId.value = "";
        setDefaultDate();
        statusInput.value = "Applied";
    }

    applicationModal.classList.remove("hidden");
    document.body.classList.add("modal-open");
    companyName.focus();
}

function closeForm() {
    applicationModal.classList.add("hidden");
    document.body.classList.remove("modal-open");
    applicationForm.reset();
    applicationId.value = "";
    formMessage.textContent = "";
}

function formatDate(dateString) {
    if (!dateString) {
        return "Not provided";
    }

    const date = new Date(`${dateString}T00:00:00`);

    return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric"
    }).format(date);
}

function escapeHTML(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function getFilteredApplications() {
    const searchTerm = searchInput.value.trim().toLowerCase();
    const selectedStatus = statusFilter.value;

    return applications
        .filter((application) => {
            const matchesSearch =
                application.company.toLowerCase().includes(searchTerm) ||
                application.title.toLowerCase().includes(searchTerm) ||
                application.location.toLowerCase().includes(searchTerm);

            const matchesStatus =
                selectedStatus === "all" ||
                application.status === selectedStatus;

            return matchesSearch && matchesStatus;
        })
        .sort((firstApplication, secondApplication) => {
            return new Date(secondApplication.date) - new Date(firstApplication.date);
        });
}

function renderApplications() {
    const filteredApplications = getFilteredApplications();

    applicationsGrid.innerHTML = "";

    if (filteredApplications.length === 0) {
        emptyState.classList.remove("hidden");
    } else {
        emptyState.classList.add("hidden");
    }

    filteredApplications.forEach((application) => {
        const card = document.createElement("article");
        card.className = "application-card";

        const statusClass = application.status.toLowerCase();

        card.innerHTML = `
            <div class="card-header">
                <div>
                    <h3 class="company-name">${escapeHTML(application.company)}</h3>
                    <p class="job-title">${escapeHTML(application.title)}</p>
                </div>

                <span class="status-badge status-${statusClass}">
                    ${escapeHTML(application.status)}
                </span>
            </div>

            <div class="card-details">
                <p><strong>Location:</strong> ${escapeHTML(application.location || "Not provided")}</p>
                <p><strong>Salary:</strong> ${escapeHTML(application.salary || "Not provided")}</p>
                <p><strong>Applied:</strong> ${formatDate(application.date)}</p>
                ${
                    application.link
                        ? `<p><a class="job-link" href="${escapeHTML(application.link)}" target="_blank" rel="noopener noreferrer">View job posting</a></p>`
                        : ""
                }
            </div>

            ${
                application.notes
                    ? `<p class="card-notes">${escapeHTML(application.notes)}</p>`
                    : ""
            }

            <div class="card-actions">
                <button
                    class="card-action"
                    type="button"
                    data-action="edit"
                    data-id="${application.id}"
                >
                    Edit
                </button>

                <button
                    class="card-action danger"
                    type="button"
                    data-action="delete"
                    data-id="${application.id}"
                >
                    Delete
                </button>
            </div>
        `;

        applicationsGrid.appendChild(card);
    });

    const applicationLabel =
        filteredApplications.length === 1 ? "application" : "applications";

    resultCount.textContent =
        `${filteredApplications.length} ${applicationLabel}`;

    updateSummary();
}

function updateSummary() {
    totalCount.textContent = applications.length;
    appliedCount.textContent = countStatus("Applied");
    interviewCount.textContent = countStatus("Interview");
    offerCount.textContent = countStatus("Offer");
    rejectedCount.textContent = countStatus("Rejected");
}

function countStatus(status) {
    return applications.filter((application) => {
        return application.status === status;
    }).length;
}

function handleFormSubmit(event) {
    event.preventDefault();

    const company = companyName.value.trim();
    const title = jobTitle.value.trim();
    const date = applicationDate.value;

    if (!company || !title || !date) {
        formMessage.textContent =
            "Please enter a company name, job title, and application date.";
        return;
    }

    const newApplication = {
        id: applicationId.value || createApplicationId(),
        company,
        title,
        location: locationInput.value.trim(),
        salary: salary.value.trim(),
        date,
        status: statusInput.value,
        link: jobLink.value.trim(),
        notes: notes.value.trim()
    };

    const existingIndex = applications.findIndex((application) => {
        return application.id === newApplication.id;
    });

    if (existingIndex >= 0) {
        applications[existingIndex] = newApplication;
    } else {
        applications.push(newApplication);
    }

    saveApplications();
    renderApplications();
    closeForm();
}

function handleCardAction(event) {
    const actionButton = event.target.closest("[data-action]");

    if (!actionButton) {
        return;
    }

    const application = applications.find((item) => {
        return item.id === actionButton.dataset.id;
    });

    if (!application) {
        return;
    }

    if (actionButton.dataset.action === "edit") {
        openForm(application);
    }

    if (actionButton.dataset.action === "delete") {
        const shouldDelete = window.confirm(
            `Delete the application for ${application.company}?`
        );

        if (!shouldDelete) {
            return;
        }

        applications = applications.filter((item) => {
            return item.id !== application.id;
        });

        saveApplications();
        renderApplications();
    }
}

openFormButton.addEventListener("click", () => openForm());
emptyStateButton.addEventListener("click", () => openForm());
closeFormButton.addEventListener("click", closeForm);
cancelButton.addEventListener("click", closeForm);
applicationForm.addEventListener("submit", handleFormSubmit);
applicationsGrid.addEventListener("click", handleCardAction);
searchInput.addEventListener("input", renderApplications);
statusFilter.addEventListener("change", renderApplications);

applicationModal.addEventListener("click", (event) => {
    if (event.target === applicationModal) {
        closeForm();
    }
});

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !applicationModal.classList.contains("hidden")) {
        closeForm();
    }
});

renderApplications();
