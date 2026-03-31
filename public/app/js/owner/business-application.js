const tableBody = document.querySelector("#applications-table tbody");

async function fetchApplications() {
  const res = await fetch("/api/owner/business/applications", {
    headers: { "Content-Type": "application/json" }
  });
  const data = await res.json();
  renderApplications(data.applications || []);
}

function renderApplications(apps) {
  tableBody.innerHTML = "";

  if (!apps.length) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 8;
    td.textContent = "No pending applications.";
    tr.appendChild(td);
    tableBody.appendChild(tr);
    return;
  }

  apps.forEach((app) => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${app.company_name || "-"}</td>
      <td>${app.owner_name || "-"}<br/><small>${app.owner_email || ""}</small></td>
      <td>${app.website || "-"}</td>
      <td>${app.phone || "-"}</td>
      <td>${app.submitted_at || "-"}</td>
      <td>${app.review_status}</td>
      <td>${app.review_notes || ""}</td>
      <td>
        <button data-action="approve" data-id="${app.id}">Approve</button>
        <button data-action="reject" data-id="${app.id}">Reject</button>
        <button data-action="needs_info" data-id="${app.id}">Needs Info</button>
      </td>
    `;

    tableBody.appendChild(tr);
  });
}

async function updateStatus(businessId, action) {
  const notes = action === "needs_info"
    ? prompt("Enter notes / missing info request:") || ""
    : "";

  const res = await fetch("/api/owner/business/applications/status", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ businessId, action, notes })
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    alert(data.error || "Failed to update status.");
    return;
  }

  await fetchApplications();
}

tableBody.addEventListener("click", (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;

  const action = btn.dataset.action;
  const id = btn.dataset.id;
  if (!action || !id) return;

  updateStatus(id, action);
});

fetchApplications();
