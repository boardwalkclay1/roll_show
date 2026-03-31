import API from "../api.js";

function getUserIdFromQuery() {
  const params = new URLSearchParams(window.location.search);
  return params.get("user");
}

function buildNav(userId) {
  const base = "/app/pages/business";
  const links = [
    { href: `${base}/dashboard.html?user=${userId}`, label: "Dashboard" },
    { href: `${base}/profile.html?user=${userId}`, label: "Profile" },
    { href: `${base}/offers.html?user=${userId}`, label: "Offers" },
    { href: `${base}/contracts.html?user=${userId}`, label: "Contracts" },
    { href: `${base}/ads.html?user=${userId}`, label: "Ads" },
    { href: `${base}/events.html?user=${userId}`, label: "Events" }
  ];

  const nav = document.getElementById("business-nav");
  nav.innerHTML = "";
  const currentPath = window.location.pathname;

  links.forEach(link => {
    const a = document.createElement("a");
    a.href = link.href;
    a.textContent = link.label;
    if (currentPath.endsWith("offers.html") && link.href.includes("offers.html")) {
      a.classList.add("rs-dash-nav-active");
    }
    nav.appendChild(a);
  });
}

const userId = getUserIdFromQuery();

async function loadOffers() {
  const listEl = document.getElementById("business-offers-full");
  const statusEl = document.getElementById("business-status");

  if (!userId) {
    statusEl.textContent = "Missing business ID in URL.";
    return;
  }

  buildNav(userId);
  statusEl.textContent = "Loading offers…";

  const res = await API.get(`/api/business/offers?user=${encodeURIComponent(userId)}`);
  if (!res.success) {
    statusEl.textContent = res.error?.message || "Failed to load offers.";
    return;
  }

  const data = res.data || {};
  const offers = Array.isArray(data.offers) ? data.offers : [];

  listEl.innerHTML = "";
  if (!offers.length) {
    listEl.innerHTML = "<li>No offers yet.</li>";
  } else {
    offers.forEach(o => {
      const li = document.createElement("li");
      li.textContent = `${o.title} — $${(o.price_cents / 100).toFixed(2)} — ${o.status || "active"}`;
      listEl.appendChild(li);
    });
  }

  statusEl.textContent = "";
}

loadOffers();
