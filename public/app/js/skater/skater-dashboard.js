import API from "../api.js";

function getUserIdFromQuery() {
  const params = new URLSearchParams(window.location.search);
  return params.get("user");
}

function buildNav(userId) {
  const base = "/app/pages/skater";
  const links = [
    { href: `${base}/skater-dashboard.html?user=${userId}`, label: "Dashboard" },
    { href: `${base}/skater-feed.html?user=${userId}`, label: "Feed" },
    { href: `${base}/skater-shows.html?user=${userId}`, label: "Shows" },
    { href: `${base}/create-show.html?user=${userId}`, label: "Create Show" },
    { href: `${base}/skater-intent.html?user=${userId}`, label: "Lessons" },
    { href: `${base}/upload-video.html?user=${userId}`, label: "Upload" },
    { href: `${base}/video-studio.html?user=${userId}`, label: "Studio" },
    { href: `${base}/welcome_skater.html?user=${userId}`, label: "Welcome" }
  ];

  const nav = document.getElementById("skater-nav");
  nav.innerHTML = "";
  const current = window.location.pathname;

  links.forEach(link => {
    const a = document.createElement("a");
    a.href = link.href;
    a.textContent = link.label;
    if (current.includes(link.href.split("/").pop().split("?")[0])) {
      a.classList.add("rs-dash-nav-active");
    }
    nav.appendChild(a);
  });
}

function wirePageLinks(userId) {
  const base = "/app/pages/skater";

  document.getElementById("shows-link").href =
    `${base}/skater-shows.html?user=${userId}`;

  document.getElementById("create-show-link").href =
    `${base}/create-show.html?user=${userId}`;

  document.getElementById("feed-link").href =
    `${base}/skater-feed.html?user=${userId}`;

  document.getElementById("intent-link").href =
    `${base}/skater-intent.html?user=${userId}`;

  document.getElementById("upload-video-link").href =
    `${base}/upload-video.html?user=${userId}`;

  document.getElementById("video-studio-link").href =
    `${base}/video-studio.html?user=${userId}`;

  document.getElementById("welcome-link").href =
    `${base}/welcome_skater.html?user=${userId}`;
}

const userId = getUserIdFromQuery();

async function loadDashboard() {
  const nameEl = document.getElementById("skater-name");
  const earningsEl = document.getElementById("skater-earnings");
  const showsEl = document.getElementById("skater-shows");
  const lessonsEl = document.getElementById("skater-lessons");
  const statusEl = document.getElementById("skater-status");

  if (!userId) {
    statusEl.textContent = "Missing skater ID in URL.";
    return;
  }

  buildNav(userId);
  wirePageLinks(userId);

  statusEl.textContent = "Loading…";

  const res = await API.get(`/api/skater/dashboard?user=${encodeURIComponent(userId)}`);
  if (!res.success) {
    statusEl.textContent = res.error?.message || "Failed to load dashboard.";
    return;
  }

  const data = res.data || {};

  nameEl.textContent = data.skater?.name || "Skater";
  earningsEl.textContent = `$${((data.earnings_cents || 0) / 100).toFixed(2)}`;

  /* SHOWS */
  const shows = Array.isArray(data.shows) ? data.shows : [];
  showsEl.innerHTML = "";
  if (!shows.length) {
    showsEl.innerHTML = "<li>No shows yet.</li>";
  } else {
    shows.slice(0, 5).forEach(show => {
      const li = document.createElement("li");
      li.textContent = `${show.title} — ${show.premiere_date}`;
      showsEl.appendChild(li);
    });
  }

  /* LESSONS */
  const lessons = Array.isArray(data.lessons) ? data.lessons : [];
  lessonsEl.innerHTML = "";
  if (!lessons.length) {
    lessonsEl.innerHTML = "<li>No lessons yet.</li>";
  } else {
    lessons.slice(0, 5).forEach(lesson => {
      const li = document.createElement("li");
      li.textContent = `${lesson.title} — $${(lesson.price_cents / 100).toFixed(2)}`;
      lessonsEl.appendChild(li);
    });
  }

  statusEl.textContent = "";
}

loadDashboard();
