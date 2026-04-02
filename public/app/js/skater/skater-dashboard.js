// public/app/js/skater/skater-dashboard.js
import { apiGet } from "/app/js/api.js";

/* ============================================================
   STATE
============================================================ */
const state = {
  skater: null,
  shows: [],
  contracts: [],
  badges: [],
  earnings: 0,
  secondaryTalent: null,
};

/* ============================================================
   DOM HELPERS
============================================================ */
function $(id) {
  return document.getElementById(id);
}

/* ============================================================
   LOADER CONTROL
============================================================ */
function hideSkaterLoader() {
  const loader = $("skater-loading");
  if (loader) loader.classList.add("rs-hidden");
}

/* ============================================================
   CORE INIT
============================================================ */
async function initSkaterDashboard() {
  try {
    const userRaw = localStorage.getItem("user");
    if (!userRaw) {
      console.error("No user found");
      window.location.href = "/login.html";
      return;
    }

    const user = JSON.parse(userRaw);

    await loadDashboard(user);
    await loadShows(user);

    renderHeader();
    renderShows();
    renderContractsSection();
    renderSecondaryTalent();
    renderStatus();
    setupNav();
    setupActions();

  } catch (err) {
    console.error("Skater dashboard init failed", err);
    const statusEl = $("skater-status");
    if (statusEl) {
      statusEl.textContent =
        "There was a problem loading your skater dashboard.";
    }
  } finally {
    hideSkaterLoader();
  }
}

/* ============================================================
   LOADERS — MATCH WORKER ROUTES EXACTLY
============================================================ */
async function loadDashboard(user) {
  try {
    const res = await apiGet("/api/skater/dashboard", user);
    if (!res?.success) {
      console.error("Dashboard load failed", res?.error);
      return;
    }

    const data = res.data || {};

    state.skater = data.skater || null;
    state.earnings = data.earnings || 0;
    state.contracts = Array.isArray(data.contracts) ? data.contracts : [];
    state.badges = Array.isArray(data.badges) ? data.badges : [];
    state.secondaryTalent = data.secondary_talent || null;

  } catch (err) {
    console.error("Dashboard load error", err);
  }
}

async function loadShows(user) {
  try {
    const res = await apiGet("/api/skater/shows", user);
    if (!res?.success) {
      console.error("Shows load failed", res?.error);
      return;
    }

    const data = res.data || {};
    state.shows = Array.isArray(data.shows) ? data.shows : [];

  } catch (err) {
    console.error("Shows load error", err);
  }
}

/* ============================================================
   RENDERERS
============================================================ */
function renderHeader() {
  const nameEl = $("skater-name");
  const earningsEl = $("skater-earnings");

  if (nameEl) {
    nameEl.textContent =
      state.skater?.display_name ||
      state.skater?.name ||
      "Skater";
  }

  if (earningsEl) {
    earningsEl.textContent = `$${Number(state.earnings || 0).toFixed(2)}`;
  }
}

function renderShows() {
  const list = $("skater-shows");
  if (!list) return;

  list.innerHTML = "";

  if (!state.shows.length) {
    list.innerHTML = `<li>No shows yet. Create your first show.</li>`;
    return;
  }

  state.shows.forEach((show) => {
    const li = document.createElement("li");
    li.textContent = `${show.title || "Untitled"} — ${show.type || "show"} — ${show.duration_seconds || 0}s`;
    list.appendChild(li);
  });
}

function renderContractsSection() {
  const statusEl = $("skater-contract-status");
  if (!statusEl) return;

  const required = state.contracts.filter(c => c.required);
  const unsigned = required.filter(c => !c.signed_at);

  if (!required.length) {
    statusEl.textContent = "No contracts required yet.";
    return;
  }

  if (unsigned.length) {
    statusEl.textContent = `You have ${unsigned.length} required contract(s) to sign.`;
  } else {
    statusEl.textContent = "All required contracts signed.";
  }
}

function renderSecondaryTalent() {
  const el = $("secondary-talent-text");
  if (!el) return;

  if (!state.secondaryTalent) {
    el.textContent = "Showcase your other talents.";
    return;
  }

  el.textContent =
    `Secondary talent: ${state.secondaryTalent.label || state.secondaryTalent.type}`;
}

function renderStatus() {
  const el = $("skater-status");
  if (!el) return;

  const pro = state.contracts.find(c => c.slug === "pro-skater");
  const rights = state.contracts.find(c => c.slug === "video-rights");

  el.textContent = [
    pro?.signed_at ? "Pro Skater active." : "Pro Skater not active.",
    rights?.signed_at ? "Video rights signed." : "Video rights not signed."
  ].join(" ");
}

/* ============================================================
   NAV + ACTIONS
============================================================ */
function setupNav() {
  const nav = $("skater-nav");
  if (!nav) return;

  nav.innerHTML = `
    <a href="#" data-tab="shows" class="rs-dash-nav-active">Shows</a>
    <a href="#" data-tab="contracts">Contracts</a>
    <a href="#" data-tab="profile">Profile</a>
    <a href="#" data-tab="social">Social</a>
  `;

  nav.addEventListener("click", (e) => {
    const link = e.target.closest("a[data-tab]");
    if (!link) return;
    e.preventDefault();

    nav.querySelectorAll("a").forEach(a => a.classList.remove("rs-dash-nav-active"));
    link.classList.add("rs-dash-nav-active");
  });
}

function setupActions() {
  bind("create-show-link", () => console.log("Create show"));
  bind("tickets-link", () => console.log("Manage tickets"));
  bind("golden-ticket-link", () => console.log("Golden tickets"));
  bind("view-contracts-link", () => console.log("View contracts"));
  bind("pro-tier-link", () => console.log("Upgrade to Pro"));
  bind("edit-secondary-talent-link", () => console.log("Edit secondary talent"));
  bind("art-store-link", () => console.log("Art store"));
  bind("edit-profile-link", () => console.log("Edit profile"));
  bind("ticket-branding-link", () => console.log("Ticket branding"));
  bind("feed-link", () => console.log("Open feed"));
  bind("followers-link", () => console.log("Followers"));
}

function bind(id, fn) {
  const el = $(id);
  if (!el) return;
  el.addEventListener("click", (e) => {
    e.preventDefault();
    fn();
  });
}

/* ============================================================
   BOOTSTRAP
============================================================ */
document.addEventListener("DOMContentLoaded", () => {
  initSkaterDashboard();
});
