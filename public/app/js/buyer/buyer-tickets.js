import API from "../api.js";

function getUserIdFromQuery() {
  const params = new URLSearchParams(window.location.search);
  return params.get("user");
}

function buildNav(userId) {
  const base = "/app/pages/buyer";
  const links = [
    { href: `${base}/dashboard.html?user=${userId}`, label: "Dashboard" },
    { href: `${base}/profile.html?user=${userId}`, label: "Profile" },
    { href: `${base}/tickets.html?user=${userId}`, label: "Tickets" },
    { href: `${base}/purchases.html?user=${userId}`, label: "Purchases" },
    { href: `${base}/recommended.html?user=${userId}`, label: "Recommended" }
  ];

  const nav = document.getElementById("buyer-nav");
  nav.innerHTML = "";
  const currentPath = window.location.pathname;

  links.forEach(link => {
    const a = document.createElement("a");
    a.href = link.href;
    a.textContent = link.label;
    if (currentPath.endsWith("tickets.html") && link.href.includes("tickets.html")) {
      a.classList.add("rs-dash-nav-active");
    }
    nav.appendChild(a);
  });
}

const userId = getUserIdFromQuery();

async function loadTickets() {
  const listEl = document.getElementById("buyer-tickets-full");
  const statusEl = document.getElementById("buyer-status");

  if (!userId) {
    statusEl.textContent = "Missing buyer ID in URL.";
    return;
  }

  buildNav(userId);
  statusEl.textContent = "Loading tickets…";

  const res = await API.get(`/api/buyer/tickets?user=${encodeURIComponent(userId)}`);
  if (!res.success) {
    statusEl.textContent = res.error?.message || "Failed to load tickets.";
    return;
  }

  const data = res.data || {};
  const tickets = Array.isArray(data.tickets) ? data.tickets : [];

  listEl.innerHTML = "";
  if (!tickets.length) {
    listEl.innerHTML = "<li>No tickets yet.</li>";
  } else {
    tickets.forEach(t => {
      const li = document.createElement("li");
      li.textContent = `${t.show_title} — ${t.date}`;
      listEl.appendChild(li);
    });
  }

  statusEl.textContent = "";
}

loadTickets();
