import API from "/app/js/api.js";

const tableBody = document.querySelector("#tracksTable tbody");
const detailEl = document.getElementById("trackDetail");
const searchInput = document.getElementById("trackSearch");

let allTracks = [];

function renderTable() {
  const q = (searchInput.value || "").toLowerCase();

  const rows = allTracks.filter(t => {
    return (
      !q ||
      (t.title && t.title.toLowerCase().includes(q)) ||
      (t.artist_name && t.artist_name.toLowerCase().includes(q))
    );
  });

  tableBody.innerHTML = rows
    .map(
      t => `
      <tr data-id="${t.id}">
        <td>${t.title || "—"}</td>
        <td>${t.artist_name || "—"}</td>
        <td>${t.length_seconds || "—"}</td>
        <td>${t.usage_label || "—"}</td>
      </tr>
    `
    )
    .join("");
}

function renderDetail(track) {
  if (!track) {
    detailEl.innerHTML =
      "<p>Select a track to view rights, contracts, and usage history.</p>";
    return;
  }

  detailEl.innerHTML = `
    <div class="detail-label">Track ID</div>
    <div class="detail-value">${track.id}</div>

    <div class="detail-label">Title</div>
    <div class="detail-value">${track.title || "—"}</div>

    <div class="detail-label">Artist</div>
    <div class="detail-value">${track.artist_name || "—"}</div>

    <div class="detail-label">Length (seconds)</div>
    <div class="detail-value">${track.length_seconds || "—"}</div>

    <div class="detail-label">Usage</div>
    <div class="detail-value">${track.usage_label || "—"}</div>

    <div class="detail-label">Created At</div>
    <div class="detail-value">${track.created_at || "—"}</div>
  `;
}

async function loadTracks() {
  const res = await API.get("/api/owner/music");
  if (!res.success || !res.data) return;

  allTracks = res.data.tracks || [];
  renderTable();
}

tableBody.addEventListener("click", e => {
  const tr = e.target.closest("tr");
  if (!tr) return;
  const id = tr.getAttribute("data-id");
  const track = allTracks.find(t => t.id === id);
  renderDetail(track);
});

searchInput.addEventListener("input", renderTable);

loadTracks();
