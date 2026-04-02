// public/app/js/skater/skater-dashboard.js
import API from "../api.js";

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

// Failsafe: hide loader after full window load regardless
window.addEventListener("load", () => {
  setTimeout(hideSkaterLoader, 800);
});

/* ============================================================
   CORE INIT
============================================================ */
async function initSkaterDashboard() {
  try {
    const userRaw = localStorage.getItem("user");
    if (!userRaw) {
      console.error("No user found in localStorage");
      // optional redirect:
      // window.location.href = "/login.html";
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
        "There was a problem loading your skater dashboard. Please refresh or try again.";
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
    const res = await API.get("/api/skater/dashboard", API.withUser(user));
    if (!res || !res.success) {
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
    const res = await API.get("/api/skater/shows", API.withUser(user));
    if (!res || !res.success) {
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
    if (state.skater) {
      nameEl.textContent = state.skater.display_name || state.skater.name || "Skater";
    } else {
      nameEl.textContent = "Skater";
    }
  }

  if (earningsEl) {
    const value = Number(state.earnings || 0);
    earningsEl.textContent = `$${value.toFixed(2)}`;
  }
}

function renderShows() {
  const list = $("skater-shows");
  if (!list) return;

  list.innerHTML = "";

  if (!state.shows || !state.shows.length) {
    list.innerHTML = `<li>No shows yet. Create your first show.</li>`;
    return;
  }

  state.shows.forEach((show) => {
    const li = document.createElement("li");
    const title = show.title || "Untitled show";
    const type = show.type || "show";
    const duration = show.duration_seconds || 0;
    li.textContent = `${title} — ${type} — ${duration}s`;
    list.appendChild(li);
  });
}

function renderContractsSection() {
  const statusEl = $("skater-contract-status");
  if (!statusEl) return;

  const contracts = Array.isArray(state.contracts) ? state.contracts : [];
  const required = contracts.filter((c) => c.required);
  const unsigned = required.filter((c) => !c.signed_at);

  if (!required.length) {
    statusEl.textContent = "No contracts required yet.";
    return;
  }

  if (unsigned.length) {
    statusEl.textContent = `You have ${unsigned.length} required contract(s) to sign before unlocking royalties and Pro features.`;
  } else {
    statusEl.textContent =
      "All required contracts signed. Royalties and Pro features unlocked.";
  }
}

function renderSecondaryTalent() {
  const el = $("secondary-talent-text");
  if (!el) return;

  const st = state.secondaryTalent;

  if (!st) {
    el.textContent = "Showcase your other talents (music, art, books, etc.).";
    return;
  }

  const label = st.label || st.type || "Secondary talent";
  el.textContent = `Secondary talent: ${label}`;
}

function renderStatus() {
  const el = $("skater-status");
  if (!el) return;

  const contracts = Array.isArray(state.contracts) ? state.contracts : [];
  const pro = contracts.find((c) => c.slug === "pro-skater");
  const rights = contracts.find((c) => c.slug === "video-rights");

  const parts = [];

  parts.push(pro?.signed_at ? "Pro Skater active." : "Pro Skater not active.");
  parts.push(
    rights?.signed_at
      ? "Video rights contract signed."
      : "Video rights contract not signed."
  );

  el.textContent = parts.join(" ");
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

    nav.querySelectorAll("a").forEach((a) => a.classList.remove("rs-dash-nav-active"));
    link.classList.add("rs-dash-nav-active");

    // If you later wire tabbed sections, you can toggle them here by data-tab
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
  initSkaterDashboard().catch((err) => {
    console.error("Skater dashboard init failed", err);
    hideSkaterLoader();
  });
});
