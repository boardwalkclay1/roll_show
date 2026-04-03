import API from "/app/js/api.js";

const user = JSON.parse(localStorage.getItem("user") || "{}");
const sponsorshipsTable = document.querySelector("#sponsorships-table tbody");

async function loadSponsorships() {
  const res = await API.get("/api/owner/sponsorships", API.withUser(user));
  if (!res.success) return;

  const rows = res.data.sponsorships || [];

  sponsorshipsTable.innerHTML = rows.map(s => `
    <tr>
      <td>${s.id}</td>
      <td>${s.business_name}</td>
      <td>${s.skater_name}</td>
      <td>$${s.amount}</td>
      <td>
        <span class="status-pill status-${s.status}">
          ${s.status}
        </span>
      </td>
      <td>${new Date(s.created_at).toLocaleString()}</td>
    </tr>
  `).join("");
}

loadSponsorships();
