// ===============================
// MODULES.JS — UNIVERSAL MODULE ENGINE
// ===============================

// -------------------------------
// SESSION
// -------------------------------
function getUser() {
  try {
    return JSON.parse(localStorage.getItem("rollshow_user")) || null;
  } catch {
    return null;
  }
}

// -------------------------------
// API WRAPPER
// -------------------------------
async function api(path, method = "GET", body = null) {
  const opts = { method, headers: { "Content-Type": "application/json" } };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`/api${path}`, opts);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

// -------------------------------
// PAGE DETECTOR
// -------------------------------
document.addEventListener("DOMContentLoaded", () => {
  const body = document.body;

  if (body.classList.contains("modules-home-page")) initModulesHome();
  if (body.classList.contains("module-detail-page")) initModuleDetail();
  if (body.classList.contains("flow-sessions-page")) initFlowSessions();
  if (body.classList.contains("dance-combos-page")) initDanceCombos();
  if (body.classList.contains("music-sync-page")) initMusicSync();
  if (body.classList.contains("spot-finder-page")) initSpotFinder();
  if (body.classList.contains("module-events-page")) initModuleEvents();
  if (body.classList.contains("module-analytics-page")) initModuleAnalytics();
});

// -------------------------------
// MODULES HOME
// -------------------------------
function initModulesHome() {
  const grid = document.getElementById("modules-grid");
  if (!grid) return;

  grid.addEventListener("click", (e) => {
    const tile = e.target.closest(".module-tile");
    if (!tile) return;

    const moduleName = tile.dataset.module;
    window.location = `/public/pages/modules/module-detail.html?module=${moduleName}`;
  });
}

// -------------------------------
// MODULE DETAIL
// -------------------------------
async function initModuleDetail() {
  const params = new URLSearchParams(window.location.search);
  const moduleName = params.get("module");

  const nameEl = document.getElementById("module-name");
  const descEl = document.getElementById("module-description");
  const contentEl = document.getElementById("module-content");
  const guideEl = document.getElementById("module-guide-list");

  if (!moduleName) return;

  const config = await api(`/modules/${moduleName}`);

  nameEl.textContent = config.name;
  descEl.textContent = config.description;
  contentEl.innerHTML = config.html || "No content available.";
  guideEl.innerHTML = config.guide
    .map((g) => `<div class="sidebar-item">${g.title}<span>${g.desc}</span></div>`)
    .join("");
}

// -------------------------------
// FLOW SESSIONS
// -------------------------------
async function initFlowSessions() {
  const list = document.getElementById("flow-sessions-list");
  const btn = document.getElementById("new-session-btn");

  const sessions = await api("/sessions");

  list.innerHTML = sessions
    .map(
      (s) => `
      <div class="session-card">
        <div class="session-title">${s.title}</div>
        <div class="session-meta">${s.date} · ${s.duration} · ${s.combos} combos</div>
      </div>`
    )
    .join("");

  btn.onclick = async () => {
    await api("/sessions", "POST", { title: "New Session" });
    location.reload();
  };
}

// -------------------------------
// DANCE COMBOS
// -------------------------------
async function initDanceCombos() {
  const list = document.getElementById("combo-list");
  const btn = document.getElementById("new-combo-btn");

  const combos = await api("/combos");

  list.innerHTML = combos
    .map(
      (c) => `
      <div class="combo-card">
        <div class="combo-title">${c.name}</div>
        <div class="combo-meta">${c.length} sec · ${c.date}</div>
      </div>`
    )
    .join("");

  btn.onclick = async () => {
    await api("/combos", "POST", { name: "New Combo" });
    location.reload();
  };
}

// -------------------------------
// MUSIC SYNC
// -------------------------------
async function initMusicSync() {
  const list = document.getElementById("track-list");
  const btn = document.getElementById("upload-track-btn");

  const tracks = await api("/tracks");

  list.innerHTML = tracks
    .map(
      (t) => `
      <div class="track-card">
        <div class="track-info">"${t.title}" · ${t.bpm} BPM</div>
        <button class="btn-primary" onclick="useTrack('${t.id}')">Use</button>
      </div>`
    )
    .join("");

  btn.onclick = () => alert("Upload flow coming soon.");
}

function useTrack(id) {
  localStorage.setItem("selected_track", id);
  alert("Track selected.");
}

// -------------------------------
// SPOT FINDER
// -------------------------------
async function initSpotFinder() {
  const list = document.getElementById("spot-list");
  const spots = await api("/spots");

  list.innerHTML = spots
    .map(
      (s) => `
      <div class="spot-card">
        <div class="spot-title">${s.name}</div>
        <div class="spot-meta">${s.tags.join(" · ")}</div>
      </div>`
    )
    .join("");
}

// -------------------------------
// MODULE EVENTS
// -------------------------------
async function initModuleEvents() {
  const list = document.getElementById("module-events-list");
  const events = await api("/events");

  list.innerHTML = events
    .map(
      (e) => `
      <div class="event-card">
        <div class="event-title">${e.title}</div>
        <div class="event-meta">${e.date} · ${e.location}</div>
      </div>`
    )
    .join("");
}

// -------------------------------
// MODULE ANALYTICS
// -------------------------------
async function initModuleAnalytics() {
  const list = document.getElementById("module-analytics-list");
  const analytics = await api("/analytics");

  list.innerHTML = analytics
    .map(
      (a) => `
      <div class="analytics-block">
        <div class="analytics-title">${a.title}</div>
        <div class="analytics-meta">${a.value}</div>
      </div>`
    )
    .join("");
}
