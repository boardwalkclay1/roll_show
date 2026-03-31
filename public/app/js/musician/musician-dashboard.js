import API from "../api.js";

function getUserIdFromQuery() {
  const params = new URLSearchParams(window.location.search);
  return params.get("user");
}

const userId = getUserIdFromQuery();

async function loadDashboard() {
  const nameEl = document.getElementById("artist-name");
  const earningsEl = document.getElementById("artist-earnings");
  const tracksEl = document.getElementById("artist-tracks");
  const licensesEl = document.getElementById("artist-licenses");
  const statusEl = document.getElementById("artist-status");

  if (!userId) {
    statusEl.textContent = "Missing musician ID in URL.";
    return;
  }

  try {
    statusEl.textContent = "Loading…";

    const res = await API.get(`/api/musician/dashboard?user=${encodeURIComponent(userId)}`);
    if (!res.success) {
      statusEl.textContent = res.error?.message || "Failed to load dashboard.";
      return;
    }

    const data = res.data || {};

    nameEl.textContent = data.name || "Artist";
    earningsEl.textContent = `$${((data.earnings_cents || 0) / 100).toFixed(2)}`;

    tracksEl.innerHTML = "";
    const tracks = Array.isArray(data.tracks) ? data.tracks : [];
    if (tracks.length === 0) {
      tracksEl.innerHTML = "<li>No tracks uploaded yet.</li>";
    } else {
      tracks.forEach(track => {
        const li = document.createElement("li");
        li.textContent = `${track.title} — $${(track.price_cents / 100).toFixed(2)}`;
        tracksEl.appendChild(li);
      });
    }

    licensesEl.innerHTML = "";
    const licenses = Array.isArray(data.licenses) ? data.licenses : [];
    if (licenses.length === 0) {
      licensesEl.innerHTML = "<li>No licenses yet.</li>";
    } else {
      licenses.forEach(lic => {
        const li = document.createElement("li");
        li.textContent = `${lic.skater_name} — ${lic.show_title}`;
        licensesEl.appendChild(li);
      });
    }

    statusEl.textContent = "";

  } catch (err) {
    console.error("Musician dashboard error:", err);
    statusEl.textContent = "Server error loading dashboard.";
  }
}

loadDashboard();
