
const API = window.API;

/* ============================================================
   STATE
============================================================ */
const ownerState = {
  user: null,
  analyticsChips: [],
  ghostButtons: [],
  burgerMenu: [],
  recentUsers: [],
  recentReports: [],
  recentErrors: []
};

/* ============================================================
   DOM HELPER
============================================================ */
const $ = (id) => document.getElementById(id);

/* ============================================================
   API WRAPPER
============================================================ */
async function apiGet(path, user) {
  return API.get(path, API.withUser(user));
}

/* ============================================================
   INIT
============================================================ */
async function initOwnerDashboard() {
  try {
    const raw = localStorage.getItem("user");
    if (!raw) {
      window.location.href = "/login.html";
      return;
    }

    ownerState.user = JSON.parse(raw);

    await loadOwnerDashboard(ownerState.user);

    renderOwnerChips();
    renderOwnerGhostButtons();
    renderOwnerBurgerMenu();
    renderOwnerRecentUsers();
    renderOwnerRecentReports();
    renderOwnerRecentErrors();

  } catch (err) {
    console.error("Owner dashboard init failed:", err);
  }
}

/* ============================================================
   LOAD DATA
============================================================ */
async function loadOwnerDashboard(user) {
  const res = await apiGet("/api/owner/dashboard", user);

  if (!res?.success) {
    console.error("Owner dashboard load failed:", res?.error);
    return;
  }

  const data = res.data || {};

  ownerState.analyticsChips = data.analytics_chips || [];
  ownerState.ghostButtons = data.ghost_buttons || [];
  ownerState.burgerMenu = data.burger_menu || [];
  ownerState.recentUsers = data.recent_users || [];
  ownerState.recentReports = data.recent_reports || [];
  ownerState.recentErrors = data.recent_errors || [];
}

/* ============================================================
   RENDER — ANALYTICS CHIPS (HORIZONTAL)
============================================================ */
function renderOwnerChips() {
  const container = $("owner-analytics-chips");
  if (!container) return;

  container.innerHTML = "";

  ownerState.analyticsChips.forEach((chip) => {
    const btn = document.createElement("button");
    btn.className = "rs-chip rs-chip-ghost";
    btn.textContent = `${chip.label}: ${chip.value}`;
    btn.addEventListener("click", () => {
      if (chip.link.startsWith("/")) {
        window.location.href = chip.link;
      }
    });
    container.appendChild(btn);
  });
}

/* ============================================================
   RENDER — GHOST BUTTON GRID
============================================================ */
function renderOwnerGhostButtons() {
  const container = $("owner-ghost-actions");
  if (!container) return;

  container.innerHTML = "";

  ownerState.ghostButtons.forEach((btnData) => {
    const btn = document.createElement("button");
    btn.className = "rs-ghost-button";
    btn.innerHTML = `
      <span class="rs-ghost-icon">${btnData.icon || "⚪"}</span>
      <span>${btnData.label}</span>
    `;
    btn.addEventListener("click", () => {
      window.location.href = btnData.link;
    });
    container.appendChild(btn);
  });
}

/* ============================================================
   RENDER — BURGER MENU
============================================================ */
function renderOwnerBurgerMenu() {
  const menu = $("rs-burger-menu");
  if (!menu) return;

  menu.innerHTML = "";

  ownerState.burgerMenu.forEach((item) => {
    const li = document.createElement("button");
    li.className = "rs-burger-item";
    li.textContent = item.label;
    li.addEventListener("click", () => {
      window.location.href = item.link;
    });
    menu.appendChild(li);
  });
}

/* ============================================================
   RENDER — RECENT USERS
============================================================ */
function renderOwnerRecentUsers() {
  const container = $("owner-recent-users");
  if (!container) return;

  container.innerHTML = "";

  ownerState.recentUsers.forEach((u) => {
    const row = document.createElement("div");
    row.className = "rs-list-row";
    row.innerHTML = `
      <div>${u.email}</div>
      <div>${u.role}</div>
      <div>${new Date(u.created_at).toLocaleDateString()}</div>
    `;
    container.appendChild(row);
  });
}

/* ============================================================
   RENDER — RECENT REPORTS
============================================================ */
function renderOwnerRecentReports() {
  const container = $("owner-recent-reports");
  if (!container) return;

  container.innerHTML = "";

  ownerState.recentReports.forEach((r) => {
    const row = document.createElement("div");
    row.className = "rs-list-row";
    row.innerHTML = `
      <div>${r.reporter_email || "Unknown"}</div>
      <div>${r.reason || "Report"}</div>
      <div>${new Date(r.created_at).toLocaleDateString()}</div>
    `;
    container.appendChild(row);
  });
}

/* ============================================================
   RENDER — RECENT ERRORS
============================================================ */
function renderOwnerRecentErrors() {
  const container = $("owner-recent-errors");
  if (!container) return;

  container.innerHTML = "";

  ownerState.recentErrors.forEach((e) => {
    const row = document.createElement("div");
    row.className = "rs-list-row rs-error-row";
    row.innerHTML = `
      <div>${e.context || "No context"}</div>
      <div>${e.message}</div>
      <div>${new Date(e.created_at).toLocaleDateString()}</div>
    `;
    container.appendChild(row);
  });
}

/* ============================================================
   BOOTSTRAP
============================================================ */
document.addEventListener("DOMContentLoaded", initOwnerDashboard);
