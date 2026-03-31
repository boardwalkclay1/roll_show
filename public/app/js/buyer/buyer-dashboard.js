import API from "../api.js";

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

  if (!userId) {
    statusEl.textContent = "Missing buyer ID in URL.";
    return;
  }

  try {
    statusEl.textContent = "Loading…";

    const res = await API.get(`/api/buyer/dashboard?user=${encodeURIComponent(userId)}`);
    if (!res.success) {
      statusEl.textContent = res.error?.message || "Failed to load dashboard.";
      return;
    }

    const data = res.data || {};

    nameEl.textContent = data.name || "Buyer";

    ticketsEl.innerHTML = "";
    const tickets = Array.isArray(data.tickets) ? data.tickets : [];
    if (tickets.length === 0) {
      ticketsEl.innerHTML = "<li>No tickets yet.</li>";
    } else {
      tickets.forEach(ticket => {
        const li = document.createElement("li");
        li.textContent = `${ticket.show_title} — ${ticket.date}`;
        ticketsEl.appendChild(li);
      });
    }

    recEl.innerHTML = "";
    const recs = Array.isArray(data.recommended) ? data.recommended : [];
    if (recs.length === 0) {
      recEl.innerHTML = "<li>No recommendations yet.</li>";
    } else {
      recs.forEach(skater => {
        const li = document.createElement("li");
        li.textContent = skater.name;
        recEl.appendChild(li);
      });
    }

    statusEl.textContent = "";

  } catch (err) {
    console.error("Buyer dashboard error:", err);
    statusEl.textContent = "Server error loading dashboard.";
  }
}

loadDashboard();
