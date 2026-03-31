import API from "../api.js";

// INLINE REPLACEMENT FOR utils.js
function getUserIdFromQuery() {
  const params = new URLSearchParams(window.location.search);
  return params.get("user");
}

const userId = getUserIdFromQuery();

async function loadDashboard() {
  if (!userId) {
    console.error("No user ID found in URL.");
    document.getElementById("artist-name").textContent = "Unknown Artist";
    document.getElementById("artist-earnings").textContent = "$0.00";
    document.getElementById("artist-tracks").innerHTML =
      "<li>Missing user ID in URL.</li>";
    return;
  }

  try {
    const data = await API.get(`/api/musician/dashboard?user=${encodeURIComponent(userId)}`);

    document.getElementById("artist-name").textContent = data.name;
    document.getElementById("artist-earnings").textContent =
      `$${(data.earnings_cents / 100).toFixed(2)}`;

    const tracks = document.getElementById("artist-tracks");
    tracks.innerHTML = "";

    if (Array.isArray(data.tracks) && data.tracks.length > 0) {
      data.tracks.forEach(track => {
        const li = document.createElement("li");
        li.textContent = track.title;
        tracks.appendChild(li);
      });
    } else {
      tracks.innerHTML = "<li>No tracks uploaded yet.</li>";
    }

  } catch (err) {
    console.error("Dashboard error:", err);

    const tracks = document.getElementById("artist-tracks");

    // Worker returned HTML instead of JSON
    if (err.message?.includes("<!DOCTYPE")) {
      tracks.innerHTML = "<li>Worker returned HTML instead of JSON — routing issue.</li>";
      return;
    }

    // Unauthorized
    if (err?.error === "Unauthorized") {
      tracks.innerHTML = "<li>Unauthorized — please sign in again.</li>";
      return;
    }

    tracks.innerHTML = "<li>Failed to load dashboard.</li>";
  }
}

loadDashboard();
