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
    if (currentPath.endsWith("tracks.html") && link.href.includes("tracks.html")) {
      a.classList.add("rs-dash-nav-active");
    }
    nav.appendChild(a);
  });
}

const userId = getUserIdFromQuery();

async function loadTracks() {
  const listEl = document.getElementById("artist-tracks-full");
  const statusEl = document.getElementById("artist-status");

  if (!userId) {
    statusEl.textContent = "Missing musician ID in URL.";
    return;
  }

  buildNav(userId);
  statusEl.textContent = "Loading tracks…";

  const res = await API.get(`/api/music/library?user=${encodeURIComponent(userId)}`);
  if (!res.success) {
    statusEl.textContent = res.error?.message || "Failed to load tracks.";
    return;
  }

  const data = res.data || {};
  const tracks = Array.isArray(data.tracks) ? data.tracks : [];

  listEl.innerHTML = "";
  if (!tracks.length) {
    listEl.innerHTML = "<li>No tracks yet.</li>";
  } else {
    tracks.forEach(t => {
      const li = document.createElement("li");
      li.textContent = `${t.title} — $${(t.price_cents / 100).toFixed(2)}`;
      listEl.appendChild(li);
    });
  }

  statusEl.textContent = "";
}

loadTracks();
