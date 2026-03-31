import API from "../api.js";

// INLINE REPLACEMENT FOR utils.js
function getUserIdFromQuery() {
  const params = new URLSearchParams(window.location.search);
  return params.get("user");
}

const userId = getUserIdFromQuery();

async function loadDashboard() {
  const nameEl = document.getElementById("buyer-name");
  const ticketsEl = document.getElementById("buyer-tickets");
  const recEl = document.getElementById("recommended-skaters");
  const statusEl = document.getElementById("buyer-status");

  // Missing user ID
  if (!userId) {
    statusEl.textContent = "Missing buyer ID in URL.";
    nameEl.textContent = "Unknown Buyer";
    ticketsEl.innerHTML = "<li>Missing user ID.</li>";
    recEl.innerHTML = "<li>Missing user ID.</li>";
    return;
  }

  try {
    statusEl.textContent = "Loading…";

    const data = await API.get(`/api/buyer/dashboard?user=${encodeURIComponent(userId)}`);

    // BUYER NAME
    nameEl.textContent = data.name || "Buyer";

    // TICKETS
    ticketsEl.innerHTML = "";
    if (Array.isArray(data.tickets) && data.tickets.length > 0) {
      data.tickets.forEach(ticket => {
        const li = document.createElement("li");
        li.textContent = `${ticket.show_title} — ${ticket.date}`;
        ticketsEl.appendChild(li);
      });
    } else {
      ticketsEl.innerHTML = "<li>No tickets yet.</li>";
    }

    // RECOMMENDED SKATERS
    recEl.innerHTML = "";
    if (Array.isArray(data.recommended) && data.recommended.length > 0) {
      data.recommended.forEach(skater => {
        const li = document.createElement("li");
        li.textContent = skater.name;
        recEl.appendChild(li);
      });
    } else {
      recEl.innerHTML = "<li>No recommendations yet.</li>";
    }

    statusEl.textContent = "";

  } catch (err) {
    console.error("Buyer dashboard error:", err);

    // Worker returned HTML instead of JSON
    if (err.message?.includes("<!DOCTYPE")) {
      ticketsEl.innerHTML = "<li>Worker returned HTML instead of JSON — routing issue.</li>";
      recEl.innerHTML = "<li>Worker returned HTML instead of JSON — routing issue.</li>";
      return;
    }

    // Unauthorized
    if (err?.error === "Unauthorized") {
      ticketsEl.innerHTML = "<li>Unauthorized — please sign in again.</li>";
      recEl.innerHTML = "<li>Unauthorized — please sign in again.</li>";
      return;
    }

    ticketsEl.innerHTML = "<li>Failed to load dashboard.</li>";
    recEl.innerHTML = "<li>Failed to load dashboard.</li>";
  }
}

loadDashboard();
