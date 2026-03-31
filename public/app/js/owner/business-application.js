const tbody = document.querySelector("#applications-table tbody");

async function loadApps() {
  const res = await fetch("/api/owner/business/applications");
  const data = await res.json();
  render(data.applications || []);
}

function render(apps) {
  tbody.innerHTML = "";

  if (!apps.length) {
    tbody.innerHTML = `<tr><td colspan="8">No pending applications.</td></tr>`;
    return;
  }

  apps.forEach(app => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${app.company_name}</td>
      <td>${app.owner_name}<br><small>${app.owner_email}</small></td>
      <td>${app.website || "-"}</td>
      <td>${app.phone || "-"}</td>
      <td>${app.submitted_at}</td>
      <td>${app.review_status}</td>
      <td>${app.review_notes || ""}</td>
      <td>
        <button data-id="${app.id}" data-action="approve">Approve</button>
        <button data-id="${app.id}" data-action="reject">Reject</button>
        <button data-id="${app.id}" data-action="needs_info">Needs Info</button>
      </td>
    `;

    tbody.appendChild(tr);
  });
}

async function updateStatus(id, action) {
  const notes = action === "needs_info"
    ? prompt("Enter notes / missing info:") || ""
    : "";

  await fetch("/api/owner/business/applications/status", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ businessId: id, action, notes })
  });

  loadApps();
}

tbody.addEventListener("click", (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;
  updateStatus(btn.dataset.id, btn.dataset.action);
});

loadApps();
