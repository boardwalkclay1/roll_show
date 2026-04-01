// public/app/js/skater/skater-dashboard.js
import API from "../api.js";

const state = {
  skater: null,
  shows: [],
  contracts: [],
  badges: [],
  earnings: 0,
  secondaryTalent: null
};

async function initSkaterDashboard() {
  const user = JSON.parse(localStorage.getItem("user"));
  if (!user) {
    console.error("No user found");
    return;
  }

  await loadDashboard(user);
  await loadShows(user);

  renderHeader();
  renderShows();
  renderContractsSection();
  renderSecondaryTalent();
  renderStatus();
  setupNav();
  setupActions();
}

/* ============================================================
   LOADERS — MATCH WORKER ROUTES EXACTLY
============================================================ */

async function loadDashboard(user) {
  const res = await API.get("/api/skater/dashboard", API.withUser(user));
  if (!res.success) {
    console.error("Dashboard load failed", res.error);
    return;
  }

  const data = res.data;

  state.skater = data.skater || null;
  state.earnings = data.earnings || 0;
  state.contracts = data.contracts || [];
  state.badges = data.badges || [];
  state.secondaryTalent = data.secondary_talent || null;
}

async function loadShows(user) {
  const res = await API.get("/api/skater/shows", API.withUser(user));
  if (!res.success) {
    console.error("Shows load failed", res.error);
    return;
  }

  state.shows = res.data.shows || [];
}

/* ============================================================
   RENDERERS
============================================================ */

function renderHeader() {
  const nameEl = document.getElementById("skater-name");
  const earningsEl = document.getElementById("skater-earnings");

  if (state.skater && nameEl) {
    nameEl.textContent = state.skater.display_name || "Skater";
  }
  if (earningsEl) {
    earningsEl.textContent = `$${(state.earnings || 0).toFixed(2)}`;
  }
}

function renderShows() {
  const list = document.getElementById("skater-shows");
  if (!list) return;

  list.innerHTML = "";

  if (!state.shows.length) {
    list.innerHTML = `<li>No shows yet. Create your first show.</li>`;
    return;
  }

  state.shows.forEach(show => {
    const li = document.createElement("li");
    li.textContent = `${show.title} — ${show.type || "show"} — ${show.duration_seconds || 0}s`;
    list.appendChild(li);
  });
}

function renderContractsSection() {
  const statusEl = document.getElementById("skater-contract-status");
  if (!statusEl) return;

  const required = state.contracts.filter(c => c.required);
  const unsigned = required.filter(c => !c.signed_at);

  if (!required.length) {
    statusEl.textContent = "No contracts required yet.";
    return;
  }

  if (unsigned.length) {
    statusEl.textContent = `You have ${unsigned.length} required contract(s) to sign before unlocking royalties and Pro features.`;
  } else {
    statusEl.textContent = "All required contracts signed. Royalties and Pro features unlocked.";
  }
}

function renderSecondaryTalent() {
  const el = document.getElementById("secondary-talent-text");
  if (!el) return;

  if (!state.secondaryTalent) {
    el.textContent = "Showcase your other talents (music, art, books, etc.).";
    return;
  }

  el.textContent = `Secondary talent: ${state.secondaryTalent.label || state.secondaryTalent.type}`;
}

function renderStatus() {
  const el = document.getElementById("skater-status");
  if (!el) return;

  const pro = state.contracts.find(c => c.slug === "pro-skater");
  const rights = state.contracts.find(c => c.slug === "video-rights");

  const parts = [];

  parts.push(pro?.signed_at ? "Pro Skater active." : "Pro Skater not active.");
  parts.push(rights?.signed_at ? "Video rights contract signed." : "Video rights contract not signed.");

  el.textContent = parts.join(" ");
}

/* ============================================================
   NAV + ACTIONS
============================================================ */

function setupNav() {
  const nav = document.getElementById("skater-nav");
  if (!nav) return;

  nav.innerHTML = `
    <a href="#" data-tab="shows" class="rs-dash-nav-active">Shows</a>
    <a href="#" data-tab="contracts">Contracts</a>
    <a href="#" data-tab="profile">Profile</a>
    <a href="#" data-tab="social">Social</a>
  `;

  nav.addEventListener("click", e => {
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
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener("click", e => {
    e.preventDefault();
    fn();
  });
}

/* ============================================================
   BOOTSTRAP
============================================================ */

document.addEventListener("DOMContentLoaded", () => {
  initSkaterDashboard().catch(err => {
    console.error("Skater dashboard init failed", err);
  });
});
