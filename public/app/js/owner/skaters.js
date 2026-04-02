import API from "/app/js/api.js";

const tableBody = document.querySelector("#skatersTable tbody");
const detailEl = document.getElementById("skaterDetail");
const searchInput = document.getElementById("skaterSearch");
const disciplineSelect = document.getElementById("skaterDiscipline");

let allSkaters = [];

function renderTable() {
  const q = (searchInput.value || "").toLowerCase();
  const disc = disciplineSelect.value || "";

  const rows = allSkaters.filter(s => {
    const matchDisc = disc
      ? (s.preferred_disciplines || "").toLowerCase().includes(disc)
      : true;
    const matchSearch =
      !q ||
      (s.name && s.name.toLowerCase().includes(q)) ||
      (s.email && s.email.toLowerCase().includes(q));
    return matchDisc && matchSearch;
  });

  tableBody.innerHTML = rows
    .map(
      s => `
      <tr data-id="${s.id}">
        <td>${s.name || "—"}</td>
        <td>${s.email || "—"}</td>
        <td>${s.preferred_disciplines || "—"}</td>
        <td>${s.city || "—"}</td>
      </tr>
    `
    )
    .join("");
}

function renderDetail(skater) {
  if (!skater) {
    detailEl.innerHTML =
      "<p>Select a skater to view profile details, sponsorship status, and recent shows.</p>";
    return;
  }

  detailEl.innerHTML = `
    <div class="detail-label">Skater ID</div>
    <div class="detail-value">${skater.id}</div>

    <div class="detail-label">Name</div>
    <div class="detail-value">${skater.name || "—"}</div>

    <div class="detail-label">Email</div>
    <div class="detail-value">${skater.email || "—"}</div>

    <div class="detail-label">City</div>
    <div class="detail-value">${skater.city || "—"}</div>

    <div class="detail-label">Preferred Disciplines</div>
    <div class="detail-value">${skater.preferred_disciplines || "—"}</div>

    <div class="detail-label">Created At</div>
    <div class="detail-value">${skater.created_at || "—"}</div>
  `;
}

async function loadSkaters() {
  const res = await API.get("/api/owner/skaters");
  if (!res.success || !res.data) return;

  allSkaters = res.data.skaters || [];
  renderTable();
}

tableBody.addEventListener("click", e => {
  const tr = e.target.closest("tr");
  if (!tr) return;
  const id = tr.getAttribute("data-id");
  const skater = allSkaters.find(s => s.id === id);
  renderDetail(skater);
});

searchInput.addEventListener("input", renderTable);
disciplineSelect.addEventListener("change", renderTable);

loadSkaters();
