import API from "/app/js/api.js";

const tableBody = document.querySelector("#musiciansTable tbody");
const detailEl = document.getElementById("musicianDetail");
const searchInput = document.getElementById("musicianSearch");

let allMusicians = [];

function renderTable() {
  const q = (searchInput.value || "").toLowerCase();

  const rows = allMusicians.filter(m => {
    return (
      !q ||
      (m.name && m.name.toLowerCase().includes(q)) ||
      (m.email && m.email.toLowerCase().includes(q))
    );
  });

  tableBody.innerHTML = rows
    .map(
      m => `
      <tr data-id="${m.id}">
        <td>${m.name || "—"}</td>
        <td>${m.email || "—"}</td>
        <td>${m.genre || "—"}</td>
        <td>${m.track_count || 0}</td>
      </tr>
    `
    )
    .join("");
}

function renderDetail(musician) {
  if (!musician) {
    detailEl.innerHTML =
      "<p>Select a musician to view profile, tracks, and collaboration history.</p>";
    return;
  }

  detailEl.innerHTML = `
    <div class="detail-label">Musician ID</div>
    <div class="detail-value">${musician.id}</div>

    <div class="detail-label">Name</div>
    <div class="detail-value">${musician.name || "—"}</div>

    <div class="detail-label">Email</div>
    <div class="detail-value">${musician.email || "—"}</div>

    <div class="detail-label">Genre</div>
    <div class="detail-value">${musician.genre || "—"}</div>

    <div class="detail-label">Tracks</div>
    <div class="detail-value">${musician.track_count || 0}</div>

    <div class="detail-label">Created At</div>
    <div class="detail-value">${musician.created_at || "—"}</div>
  `;
}

async function loadMusicians() {
  const res = await API.get("/api/owner/musicians");
  if (!res.success || !res.data) return;

  allMusicians = res.data.musicians || [];
  renderTable();
}

tableBody.addEventListener("click", e => {
  const tr = e.target.closest("tr");
  if (!tr) return;
  const id = tr.getAttribute("data-id");
  const musician = allMusicians.find(m => m.id === id);
  renderDetail(musician);
});

searchInput.addEventListener("input", renderTable);

loadMusicians();
