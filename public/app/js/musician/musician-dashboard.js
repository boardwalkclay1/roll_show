import API from "../api.js";

function getUserIdFromQuery() {
  const params = new URLSearchParams(window.location.search);
  return params.get("user");
}

function buildNav(userId) {
  const base = "/app/pages/musician";
  const links = [
    { href: `${base}/dashboard.html?user=${userId}`, label: "Dashboard" },
    { href: `${base}/profile.html?user=${userId}`, label: "Profile" },
    { href: `${base}/tracks.html?user=${userId}`, label: "Tracks" },
    { href: `${base}/licenses.html?user=${userId}`, label: "Licenses" },
    { href: `${base}/upload.html?user=${userId}`, label: "Upload" }
  ];

  const nav = document.getElementById("artist-nav");
  nav.innerHTML = "";
  const currentPath = window.location.pathname;

  links.forEach(link => {
    const a = document.createElement("a");
    a.href = link.href;
    a.textContent = link.label;
    if (currentPath.endsWith("dashboard.html") && link.href.includes("dashboard.html")) {
      a.classList.add("rs-dash-nav-active");
    }
    nav.appendChild(a);
  });
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

  buildNav(userId);
  statusEl.textContent = "Loading…";

  const res = await API.get(`/api/musician/dashboard?user=${encodeURIComponent(userId)}`);
  if (!res.success) {
    statusEl.textContent = res.error?.message || "Failed to load dashboard.";
    return;
  }

  const data = res.data || {};
  nameEl.textContent = data.name || "Artist";
  earningsEl.textContent = `$${((data.earnings_cents || 0) / 100).toFixed(2)}`;

  const tracks = Array.isArray(data.tracks) ? data.tracks : [];
  tracksEl.innerHTML = "";
  if (!tracks.length) {
    tracksEl.innerHTML = "<li>No tracks yet.</li>";
  } else {
    tracks.slice(0, 5).forEach(t => {
      const li = document.createElement("li");
      li.textContent = `${t.title} — $${(t.price_cents / 100).toFixed(2)}`;
      tracksEl.appendChild(li);
    });
  }

  const licenses = Array.isArray(data.licenses) ? data.licenses : [];
  licensesEl.innerHTML = "";
  if (!licenses.length) {
    licensesEl.innerHTML = "<li>No licenses yet.</li>";
  } else {
    licenses.slice(0, 5).forEach(l => {
      const li = document.createElement("li");
      li.textContent = `${l.skater_name} — ${l.show_title}`;
      licensesEl.appendChild(li);
    });
  }

  statusEl.textContent = "";
}

loadDashboard();
