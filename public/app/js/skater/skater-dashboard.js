// public/app/js/skater/skater-dashboard.js

const state = {
  skater: null,
  shows: [],
  merch: [],
  gifts: [],
  contracts: [],
  secondaryTalent: null,
  badges: [],
  earnings: 0,
};

async function initSkaterDashboard() {
  await loadSkaterProfile();
  await Promise.all([
    loadShows(),
    loadMerch(),
    loadContracts(),
    loadBadges(),
  ]);

  renderHeader();
  renderShows();
  renderMerch();
  renderContractsSection();
  renderSecondaryTalent();
  renderStatus();
  setupNav();
  setupActions();
}

/* ========== DATA LOADERS (API HOOKS) ========== */

async function loadSkaterProfile() {
  // TODO: replace with real auth/user lookup
  const res = await fetch("/api/skater/me");
  if (!res.ok) return;
  const data = await res.json();
  state.skater = data.skater;
  state.secondaryTalent = data.secondary_talent || null;
  state.earnings = data.earnings || 0;
}

async function loadShows() {
  const res = await fetch("/api/skater/shows");
  if (!res.ok) return;
  const data = await res.json();
  state.shows = data.shows || [];
}

async function loadMerch() {
  const res = await fetch("/api/skater/merch");
  if (!res.ok) return;
  const data = await res.json();
  state.merch = data.merch || [];
  state.gifts = data.gifts || []; // roses, skates, boards, etc.
}

async function loadContracts() {
  const res = await fetch("/api/skater/contracts");
  if (!res.ok) return;
  const data = await res.json();
  state.contracts = data.contracts || [];
}

async function loadBadges() {
  const res = await fetch("/api/skater/badges");
  if (!res.ok) return;
  const data = await res.json();
  state.badges = data.badges || [];
}

/* ========== RENDERERS ========== */

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
    const typeLabel = show.type || "show"; // premiere, private, short, live, golden
    li.textContent = `${show.title} — ${typeLabel} — ${show.duration_seconds || 0}s`;
    list.appendChild(li);
  });
}

function renderMerch() {
  const merchList = document.getElementById("skater-merch");
  if (!merchList) return;
  merchList.innerHTML = "";

  const allItems = [
    ...state.merch.map(m => ({ ...m, kind: "merch" })),
    ...state.gifts.map(g => ({ ...g, kind: "gift" })),
  ];

  if (!allItems.length) {
    merchList.innerHTML = `<li>No merch or gifts configured yet.</li>`;
    return;
  }

  allItems.forEach(item => {
    const li = document.createElement("li");
    const kindLabel = item.kind === "gift" ? "Gift" : "Merch";
    li.textContent = `${kindLabel}: ${item.name} — $${(item.price || 0).toFixed(2)}`;
    merchList.appendChild(li);
  });
}

function renderContractsSection() {
  const statusEl = document.getElementById("skater-contract-status");
  if (!statusEl) return;

  const required = state.contracts.filter(c => c.required);
  const unsignedRequired = required.filter(c => !c.signed_at);

  if (!required.length) {
    statusEl.textContent = "No contracts required yet.";
    return;
  }

  if (unsignedRequired.length) {
    statusEl.textContent = `You have ${unsignedRequired.length} required contract(s) to sign before unlocking royalties and Pro features.`;
  } else {
    statusEl.textContent = "All required contracts signed. Royalties and Pro features unlocked.";
  }
}

function renderSecondaryTalent() {
  const textEl = document.getElementById("secondary-talent-text");
  if (!textEl) return;

  if (!state.secondaryTalent) {
    textEl.textContent = "Showcase your other talents (music, art, books, etc.).";
    return;
  }

  textEl.textContent = `Secondary talent: ${state.secondaryTalent.label || state.secondaryTalent.type}`;
}

function renderStatus() {
  const statusEl = document.getElementById("skater-status");
  if (!statusEl) return;

  const proContract = state.contracts.find(c => c.slug === "pro-skater");
  const videoRights = state.contracts.find(c => c.slug === "video-rights");

  const parts = [];

  if (proContract && proContract.signed_at) {
    parts.push("Pro Skater active.");
  } else {
    parts.push("Pro Skater not active.");
  }

  if (videoRights && videoRights.signed_at) {
    parts.push("Video rights contract signed (royalties enabled).");
  } else {
    parts.push("Video rights contract not signed (royalties limited).");
  }

  statusEl.textContent = parts.join(" ");
}

/* ========== NAV & ACTIONS ========== */

function setupNav() {
  const nav = document.getElementById("skater-nav");
  if (!nav) return;

  nav.innerHTML = `
    <a href="#" data-tab="shows" class="rs-dash-nav-active">Shows</a>
    <a href="#" data-tab="merch">Merch & Gifts</a>
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

    // You can later wire tab-specific UI changes here if needed.
  });
}

function setupActions() {
  bindClick("create-show-link", () => {
    // open show creation modal / route
    console.log("Create show clicked");
  });

  bindClick("tickets-link", () => {
    console.log("Manage tickets clicked");
  });

  bindClick("golden-ticket-link", () => {
    console.log("Golden tickets clicked");
  });

  bindClick("view-contracts-link", () => {
    console.log("View contracts clicked");
  });

  bindClick("pro-tier-link", () => {
    console.log("Upgrade to Pro Skater clicked");
  });

  bindClick("add-merch-link", () => {
    console.log("Add merch clicked");
  });

  bindClick("gifts-link", () => {
    console.log("Gifts options clicked");
  });

  bindClick("edit-secondary-talent-link", () => {
    console.log("Edit secondary talent clicked");
  });

  bindClick("art-store-link", () => {
    console.log("Art / books store clicked");
  });

  bindClick("edit-profile-link", () => {
    console.log("Edit profile clicked");
  });

  bindClick("ticket-branding-link", () => {
    console.log("Ticket branding studio clicked");
  });

  bindClick("feed-link", () => {
    console.log("Open skater feed clicked");
  });

  bindClick("followers-link", () => {
    console.log("Followers & fans clicked");
  });
}

function bindClick(id, handler) {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener("click", (e) => {
    e.preventDefault();
    handler();
  });
}

/* ========== BOOTSTRAP ========== */

document.addEventListener("DOMContentLoaded", () => {
  initSkaterDashboard().catch(err => {
    console.error("Skater dashboard init failed", err);
  });
});
