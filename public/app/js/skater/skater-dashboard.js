import API from "../api.js";
import { getUserIdFromQuery } from "../utils.js";

const userId = getUserIdFromQuery();

// If no user ID → stop immediately
if (!userId) {
  console.error("No user ID found in URL.");
  document.getElementById("skater-name").textContent = "Unknown Skater";
  document.getElementById("skater-earnings").textContent = "$0.00";

  const shows = document.getElementById("skater-shows");
  shows.innerHTML = "<li>Missing user ID in URL.</li>";
} else {
  loadDashboard();
}

async function loadDashboard() {
  try {
    const data = await API.get(`/api/skater/dashboard?user=${encodeURIComponent(userId)}`);

    // NAME
    document.getElementById("skater-name").textContent =
      data.name || "Skater";

    // EARNINGS
    document.getElementById("skater-earnings").textContent =
      `$${((data.earnings_cents || 0) / 100).toFixed(2)}`;

    // SHOWS
    const shows = document.getElementById("skater-shows");
    shows.innerHTML = "";

    if (Array.isArray(data.shows) && data.shows.length > 0) {
      data.shows.forEach(show => {
        const li = document.createElement("li");
        li.textContent = `${show.title} — $${(show.price_cents / 100).toFixed(2)}`;
        shows.appendChild(li);
      });
    } else {
      const li = document.createElement("li");
      li.textContent = "No shows yet.";
      shows.appendChild(li);
    }

  } catch (err) {
    console.error("Dashboard load error:", err);

    const shows = document.getElementById("skater-shows");
    shows.innerHTML = "<li>Failed to load dashboard.</li>";

    if (err?.error === "Unauthorized") {
      shows.innerHTML = "<li>Unauthorized — please sign in again.</li>";
    }
  }
}
