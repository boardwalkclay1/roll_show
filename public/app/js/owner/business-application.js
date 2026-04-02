import API from "/app/js/api.js";

const tableBody = document.querySelector("#applicationsTable tbody");
const detailEl = document.getElementById("applicationDetail");
const searchInput = document.getElementById("applicationSearch");
const statusSelect = document.getElementById("applicationStatus");
const notesEl = document.getElementById("applicationNotes");
const resultEl = document.getElementById("applicationResult");

const btnApprove = document.getElementById("btnApprove");
const btnReject = document.getElementById("btnReject");
const btnNeedsInfo = document.getElementById("btnNeedsInfo");

let allApps = [];
let selectedApp = null;

function renderTable() {
  const q = (searchInput.value || "").toLowerCase();
  const status = statusSelect.value || "";

  const rows = allApps.filter(a => {
    const matchStatus = status ? (a.review_status || "") === status : true;
    const matchSearch =
      !q ||
      (a.company_name && a.company_name.toLowerCase().includes(q)) ||
      (a.email && a.email.toLowerCase().includes(q));
    return matchStatus && matchSearch;
  });

  tableBody.innerHTML = rows
    .map(
      a => `
      <tr data-id="${a.id}">
        <td>${a.company_name || "—"}</td>
        <td>${a.name || a.owner_name || "—"}</td>
        <td>${a.review_status || "—"}</td>
        <td>${a.created_at || "—"}</td>
      </tr>
    `
    )
    .join("");
}

function renderDetail(app) {
  if (!app) {
    detailEl.innerHTML =
      "<p>Select an application to review details and take action.</p>";
    return;
  }

  detailEl.innerHTML = `
    <div class="detail-label">Business ID</div>
    <div class="detail-value">${app.id}</div>

    <div class="detail-label">Company Name</div>
    <div class="detail-value">${app.company_name || "—"}</div>

    <div class="detail-label">Owner</div>
    <div class="detail-value">${app.name || app.owner_name || "—"} (${app.email || "—"})</div>

    <div class="detail-label">Website</div>
    <div class="detail-value">${app.website || "—"}</div>

    <div class="detail-label">Review Status</div>
    <div class="detail-value">${app.review_status || "—"}</div>

    <div class="detail-label">Review Notes</div>
    <div class="detail-value">${app.review_notes || "—"}</div>

    <div class="detail-label">Created At</div>
    <div class="detail-value">${app.created_at || "—"}</div>
  `;
}

async function loadApplications() {
  const res = await API.get("/api/owner/business-applications");
  if (!res.success || !res.data) return;

  allApps = res.data.applications || [];
  renderTable();
  renderDetail(null);
  selectedApp = null;
  notesEl.value = "";
  resultEl.textContent = "";
}

tableBody.addEventListener("click", e => {
  const tr = e.target.closest("tr");
  if (!tr) return;
  const id = tr.getAttribute("data-id");
  selectedApp = allApps.find(a => a.id === id);
  renderDetail(selectedApp);
  resultEl.textContent = "";
});

searchInput.addEventListener("input", renderTable);
statusSelect.addEventListener("change", renderTable);

async function sendDecision(action) {
  if (!selectedApp) {
    resultEl.textContent = "Select an application first.";
    return;
  }

  resultEl.textContent = "Submitting decision...";

  const res = await API.post("/api/owner/update-business-status", {
    businessId: selectedApp.id,
    action,
    notes: notesEl.value || ""
  });

  if (!res.success) {
    resultEl.textContent = res.error?.message || "Failed to update status.";
    return;
  }

  resultEl.textContent = `Updated: ${res.data.review_status}`;
  await loadApplications();
}

btnApprove.addEventListener("click", () => sendDecision("approve"));
btnReject.addEventListener("click", () => sendDecision("reject"));
btnNeedsInfo.addEventListener("click", () => sendDecision("needs_info"));

loadApplications();
