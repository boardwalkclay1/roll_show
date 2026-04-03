// /app/js/buyer/buyer-dashboard.js
import API from "/app/js/api.js";

/* ============================================================
   LOADER CONTROL
============================================================ */
function hideBuyerLoader() {
  const loader = document.getElementById("buyer-loading");
  if (loader) loader.classList.add("rs-hidden");
}

/* ============================================================
   MAIN DASHBOARD LOAD
============================================================ */
async function loadBuyerDashboard() {
  try {
    const userRaw = localStorage.getItem("user");
    if (!userRaw) {
      console.error("No user found");
      window.location.href = "/login.html";
      return;
    }

    const user = JSON.parse(userRaw);

    // AUTH CHECK
    const me = await apiGet("/api/auth/me", user);
    if (!me || me.role !== "buyer") {
      window.location.href = "/login.html";
      return;
    }

    // NAME
    const nameEl = document.getElementById("buyer-name");
    if (nameEl) nameEl.textContent = me.name || "Buyer";

    // PARALLEL LOADS
    const [profileRes, ticketsRes, recsRes] = await Promise.allSettled([
      apiGet("/api/buyer/profile", user),
      apiGet("/api/buyer/tickets", user),
      apiGet("/api/buyer/recommended-skaters", user)
    ]);

    const profile =
      profileRes.status === "fulfilled"
        ? profileRes.value?.data || profileRes.value
        : null;

    const tickets =
      ticketsRes.status === "fulfilled"
        ? ticketsRes.value?.data || ticketsRes.value
        : [];

    const recs =
      recsRes.status === "fulfilled"
        ? recsRes.value?.data || recsRes.value
        : [];

    renderTickets(tickets);
    renderRecommended(recs);

  } catch (err) {
    console.error("Buyer Dashboard Error:", err);
  } finally {
    hideBuyerLoader();
  }
}

/* ============================================================
   RENDERERS (SAFE)
============================================================ */
function renderTickets(tickets) {
  const ul = document.getElementById("buyer-tickets");
  if (!ul) return;

  ul.innerHTML = "";

  if (!Array.isArray(tickets) || tickets.length === 0) {
    ul.innerHTML = "<li>No tickets yet.</li>";
    return;
  }

  tickets.forEach(t => {
    const li = document.createElement("li");
    li.textContent = `${t.show_name || "Show"} — ${t.status || "unknown"}`;
    ul.appendChild(li);
  });
}

function renderRecommended(list) {
  const ul = document.getElementById("recommended-skaters");
  if (!ul) return;

  ul.innerHTML = "";

  if (!Array.isArray(list) || list.length === 0) {
    ul.innerHTML = "<li>No recommendations yet.</li>";
    return;
  }

  list.forEach(s => {
    const li = document.createElement("li");
    li.textContent = s.display_name || "Skater";
    ul.appendChild(li);
  });
}

/* ============================================================
   BOOTSTRAP
============================================================ */
document.addEventListener("DOMContentLoaded", () => {
  loadBuyerDashboard();
});
