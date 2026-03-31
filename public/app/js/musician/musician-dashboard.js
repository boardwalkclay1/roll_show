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
    { href: `${base}/upload-track.html?user=${userId}`, label: "Upload" },
    { href: `${base}/musician-feed.html?user=${userId}`, label: "Feed" },
    { href: `${base}/branding-studio.html?user=${userId}`, label: "Branding" },
    { href: `${base}/music-library.html?user=${userId}`, label: "Library" }
  ];

  const nav = document.getElementById("artist-nav");
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
  document.getElementById("tracks-link").href =
    `/app/pages/musician/tracks.html?user=${userId}`;

  document.getElementById("licenses-link").href =
    `/app/pages/musician/licenses.html?user=${userId}`;

  document.getElementById("feed-link").href =
    `/app/pages/musician/musician-feed.html?user=${userId}`;

  document.getElementById("upload-link").href =
    `/app/pages/musician/upload-track.html?user=${userId}`;

  document.getElementById("branding-link").href =
    `/app/pages/musician/branding-studio.html?user=${userId}`;

  document.getElementById("library-link").href =
    `/app/pages/musician/music-library.html?user=${userId}`;
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
  wirePageLinks(userId);

  statusEl.textContent = "Loading…";

  const res = await API.get(`/api/musician/dashboard?user=${encodeURIComponent(userId)}`);
  if (!res.success) {
    statusEl.textContent = res.error?.message || "Failed to load dashboard.";
    return;
  }

  const data = res.data || {};
  nameEl.textContent = data.musician?.name || "Artist";
  earningsEl.textContent = `$${((data.musician?.earnings_cents || 0) / 100).toFixed(2)}`;

  const tracks = Array.isArray(data.tracks) ? data.tracks : [];
  tracksEl.innerHTML = tracks.length
    ? tracks.slice(0, 5).map(t => `<li>${t.title}</li>`).join("")
    : "<li>No tracks yet.</li>";

  const licenses = Array.isArray(data.licenses) ? data.licenses : [];
  licensesEl.innerHTML = licenses.length
    ? licenses.slice(0, 5).map(l => `<li>${l.title}</li>`).join("")
    : "<li>No licenses yet.</li>";

  statusEl.textContent = "";
}

loadDashboard();
