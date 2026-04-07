import API from "/js/api.js";

const musicianState = {
  user: null,
  musician: null,
  analyticsChips: [],
  actions: [],
  tracks: [],
  shows: [],
  earnings: 0
};

const $m = (id) => document.getElementById(id);

async function apiGet(path, user) {
  return API.get(path, user);
}

function hideMusicianLoader() {
  const loader = $m("musician-loading");
  if (loader) loader.classList.add("rs-hidden");
}

async function initMusicianDashboard() {
  try {
    const userRaw = localStorage.getItem("user");
    if (!userRaw) {
      window.location.href = "/login.html";
      return;
    }

    musicianState.user = JSON.parse(userRaw);

    await loadMusicianDashboard(musicianState.user);

    renderMusicianHero();
    renderMusicianChips();
    renderMusicianGhostActions();
    renderMusicianCards();
    renderMusicianBurgerMenu();
  } catch (err) {
    console.error("Musician dashboard init failed", err);
  } finally {
    hideMusicianLoader();
  }
}

async function loadMusicianDashboard(user) {
  try {
    const res = await apiGet("/api/musician/dashboard", user);
    if (!res?.success) {
      console.error("Musician dashboard load failed", res?.error);
      return;
    }

    const data = res.data || {};

    musicianState.musician = data.musician || null;
    musicianState.earnings = data.earnings || 0;
    musicianState.tracks = Array.isArray(data.tracks) ? data.tracks : [];
    musicianState.shows = Array.isArray(data.shows) ? data.shows : [];

    musicianState.analyticsChips = [
      { label: "Tracks", value: musicianState.tracks.length, link: "#mus-tracks" },
      { label: "Shows", value: musicianState.shows.length, link: "#mus-shows" },
      { label: "Earnings", value: `$${Number(musicianState.earnings || 0).toFixed(2)}`, link: "#mus-earnings" }
    ];

    musicianState.actions = [
      { id: "upload-track", label: "Upload Track", icon: "🎵" },
      { id: "view-library", label: "Library", icon: "🎧" },
      { id: "edit-profile", label: "Edit Profile", icon: "🖊️" }
    ];
  } catch (err) {
    console.error("Musician dashboard load error", err);
  }
}

function renderMusicianHero() {
  const nameEl = $m("musician-hero-name");
  const subtitleEl = $m("musician-hero-subtitle");
  const earningsEl = $m("musician-hero-earnings");

  if (nameEl) {
    nameEl.textContent =
      musicianState.musician?.display_name ||
      musicianState.musician?.name ||
      "Musician";
  }

  if (subtitleEl) {
    subtitleEl.textContent = musicianState.musician?.genre || "Roll Show Music";
  }

  if (earningsEl) {
    earningsEl.textContent = `$${Number(musicianState.earnings || 0).toFixed(2)}`;
  }
}

function renderMusicianChips() {
  const container = $m("musician-analytics-chips");
  if (!container) return;

  container.innerHTML = "";
  musicianState.analyticsChips.forEach((chip) => {
    const btn = document.createElement("button");
    btn.className = "rs-chip rs-chip-ghost";
    btn.textContent = `${chip.label}: ${chip.value}`;
    btn.addEventListener("click", () => {
      if (chip.link.startsWith("#")) {
        const target = document.querySelector(chip.link);
        if (target) target.scrollIntoView({ behavior: "smooth" });
      } else {
        window.location.href = chip.link;
      }
    });
    container.appendChild(btn);
  });
}

function renderMusicianGhostActions() {
  const container = $m("musician-ghost-actions");
  if (!container) return;

  container.innerHTML = "";
  musicianState.actions.forEach((action) => {
    const btn = document.createElement("button");
    btn.className = "rs-ghost-button";
    btn.dataset.actionId = action.id;
    btn.innerHTML = `<span class="rs-ghost-icon">${action.icon}</span><span>${action.label}</span>`;
    btn.addEventListener("click", () => handleMusicianAction(action.id));
    container.appendChild(btn);
  });
}

function renderMusicianCards() {
  renderMusicianTracks();
  renderMusicianShows();
}

function renderMusicianTracks() {
  const container = $m("musician-tracks-cards");
  if (!container) return;

  container.innerHTML = "";
  if (!musicianState.tracks.length) {
    container.innerHTML = `<div class="rs-card rs-card-empty">No tracks yet.</div>`;
    return;
  }

  musicianState.tracks.forEach((t) => {
    const card = document.createElement("div");
    card.className = "rs-card rs-card-track";
    card.innerHTML = `
      <div class="rs-card-title">${t.title || "Track"}</div>
      <div class="rs-card-meta">
        <span>${t.length_seconds || 0}s</span>
      </div>
    `;
    container.appendChild(card);
  });
}

function renderMusicianShows() {
  const container = $m("musician-shows-cards");
  if (!container) return;

  container.innerHTML = "";
  if (!musicianState.shows.length) {
    container.innerHTML = `<div class="rs-card rs-card-empty">No shows yet.</div>`;
    return;
  }

  musicianState.shows.forEach((show) => {
    const card = document.createElement("div");
    card.className = "rs-card rs-card-show";
    card.innerHTML = `
      <div class="rs-card-title">${show.title || "Show"}</div>
      <div class="rs-card-meta">
        <span>${show.venue_name || ""}</span>
        <span>${show.date || ""}</span>
      </div>
    `;
    container.appendChild(card);
  });
}

function renderMusicianBurgerMenu() {
  const menu = $m("rs-burger-menu");
  if (!menu) return;

  const items = [
    { label: "Owner Dashboard", link: "/owner.html" },
    { label: "Skater Dashboard", link: "/skater.html" },
    { label: "Business Dashboard", link: "/business.html" },
    { label: "Musician Dashboard", link: "/musician.html" },
    { label: "Buyer Dashboard", link: "/buyer.html" }
  ];

  menu.innerHTML = "";
  items.forEach((item) => {
    const li = document.createElement("button");
    li.className = "rs-burger-item";
    li.textContent = item.label;
    li.addEventListener("click", () => {
      window.location.href = item.link;
    });
    menu.appendChild(li);
  });
}

function handleMusicianAction(id) {
  switch (id) {
    case "upload-track":
      window.location.href = "/musician-upload.html";
      break;
    case "view-library":
      window.location.href = "/musician-library.html";
      break;
    case "edit-profile":
      window.location.href = "/musician-profile.html";
      break;
    default:
      console.log("Unhandled musician action:", id);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initMusicianDashboard();
});
