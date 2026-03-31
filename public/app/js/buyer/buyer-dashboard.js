import API from "../api.js";

function getUserIdFromQuery() {
  const params = new URLSearchParams(window.location.search);
  return params.get("user");
}

function buildNav(userId) {
  const base = "/app/pages/buyer";
  const links = [
    { href: `${base}/dashboard.html?user=${userId}`, label: "Dashboard" },
    { href: `${base}/tickets.html?user=${userId}`, label: "Tickets" },
    { href: `${base}/purchase-history.html?user=${userId}`, label: "Purchases" },
    { href: `${base}/buyer-feed.html?user=${userId}`, label: "Feed" },
    { href: `${base}/ticket-wallet.html?user=${userId}`, label: "Wallet" },
    { href: `${base}/ticket-confirmation.html?user=${userId}`, label: "Confirmations" },
    { href: `${base}/ticket-view.html?user=${userId}`, label: "Ticket Viewer" }
  ];

  const nav = document.getElementById("buyer-nav");
  nav.innerHTML = "";
  const currentPath = window.location.pathname;

  links.forEach(link => {
    const a = document.createElement("a");
    a.href = link.href;
    a.textContent = link.label;
    if (currentPath.includes(link.href.split("/").pop())) {
      a.classList.add("rs-dash-nav-active");
    }
    nav.appendChild(a);
  });
}

function wirePageLinks(userId) {
  document.getElementById("tickets-link").href =
    `/app/pages/buyer/tickets.html?user=${userId}`;

  document.getElementById("purchases-link").href =
    `/app/pages/buyer/purchase-history.html?user=${userId}`;

  document.getElementById("feed-link").href =
    `/app/pages/buyer/buyer-feed.html?user=${userId}`;

  document.getElementById("wallet-link").href =
    `/app/pages/buyer/ticket-wallet.html?user=${userId}`;

  document.getElementById("confirmation-link").href =
    `/app/pages/buyer/ticket-confirmation.html?user=${userId}`;

  document.getElementById("ticketview-link").href =
    `/app/pages/buyer/ticket-view.html?user=${userId}`;
}

const userId = getUserIdFromQuery();

async function loadDashboard() {
  const nameEl = document.getElementById("buyer-name");
  const ticketsEl = document.getElementById("buyer-tickets");
  const purchasesEl = document.getElementById("buyer-purchases");
  const statusEl = document.getElementById("buyer-status");

  if (!userId) {
    statusEl.textContent = "Missing buyer ID in URL.";
    return;
  }

  buildNav(userId);
  wirePageLinks(userId);

  statusEl.textContent = "Loading…";

  const [ticketsRes, purchasesRes] = await Promise.all([
    API.get(`/api/buyer/tickets?user=${encodeURIComponent(userId)}`),
    API.get(`/api/buyer/purchases?user=${encodeURIComponent(userId)}`)
  ]);

  nameEl.textContent = "Buyer";

  ticketsEl.innerHTML = ticketsRes.success
    ? (ticketsRes.data.tickets.length
        ? ticketsRes.data.tickets.slice(0, 5).map(t => `<li>${t.show_title}</li>`).join("")
        : "<li>No tickets yet.</li>")
    : "<li>Error loading tickets.</li>";

  purchasesEl.innerHTML = purchasesRes.success
    ? (purchasesRes.data.purchases.length
        ? purchasesRes.data.purchases.slice(0, 5).map(p => `<li>${p.show_title}</li>`).join("")
        : "<li>No purchases yet.</li>")
    : "<li>Error loading purchases.</li>";

  statusEl.textContent = "";
}

loadDashboard();
