// /app/js/musician/musician-dashboard.js
import API from "/js/api.js";

/* ============================================================
   DOM HELPERS
============================================================ */
function $(id) {
  return document.getElementById(id);
}

function setText(id, value) {
  const el = $(id);
  if (el) el.textContent = value ?? "";
}

function setHtml(id, value) {
  const el = $(id);
  if (el) el.innerHTML = value ?? "";
}

/* ============================================================
   LOADER CONTROL
============================================================ */
function hideMusicianLoader() {
  const loader = document.getElementById("musician-loading");
  if (loader) loader.classList.add("rs-hidden");
}

/* Failsafe: hide loader after full window load regardless */
window.addEventListener("load", () => {
  setTimeout(hideMusicianLoader, 800);
});

/* ============================================================
   RENDERERS
============================================================ */
function renderTracks(tracks) {
  const ul = $("artist-tracks") || $("musician-tracks");
  if (!ul) return;

  ul.innerHTML = "";
  if (!Array.isArray(tracks) || tracks.length === 0) {
    ul.innerHTML = "<li>No tracks yet. Upload your first track.</li>";
    return;
  }

  tracks.forEach((t) => {
    const li = document.createElement("li");
    const title = t.title || "Untitled";
    const length = t.length || t.duration || "";
    li.textContent = length ? `${title} — ${length}s` : title;
    ul.appendChild(li);
  });
}

function renderLicenses(licenses) {
  const ul = $("artist-licenses") || $("musician-licenses");
  if (!ul) return;

  ul.innerHTML = "";
  if (!Array.isArray(licenses) || licenses.length === 0) {
    ul.innerHTML = "<li>No active licenses yet.</li>";
    return;
  }

  licenses.forEach((lic) => {
    const li = document.createElement("li");
    const track = lic.track_title || "Track";
    const status = lic.status || "active";
    li.textContent = `${track} — ${status}`;
    ul.appendChild(li);
  });
}

function renderCollabs(collabs) {
  const ul = $("musician-collabs");
  if (!ul) return;

  ul.innerHTML = "";
  if (!Array.isArray(collabs) || collabs.length === 0) {
    ul.innerHTML = "<li>No collaborations yet.</li>";
    return;
  }

  collabs.forEach((c) => {
    const li = document.createElement("li");
    const name = c.with_name || c.partner_name || "Collaborator";
    const status = c.status || "pending";
    li.textContent = `${name} — ${status}`;
    ul.appendChild(li);
  });
}

function renderMessages(msgs) {
  const ul = $("musician-messages");
  if (!ul) return;

  ul.innerHTML = "";
  if (!Array.isArray(msgs) || msgs.length === 0) {
    ul.innerHTML = "<li>No new messages.</li>";
    return;
  }

  msgs.forEach((m) => {
    const li = document.createElement("li");
    const sender = m.sender_name || "Unknown";
    const content = m.content || "";
    li.textContent = `${sender}: ${content}`;
    ul.appendChild(li);
  });
}

function renderProfile(profile) {
  if (!profile) return;

  if (profile.display_name || profile.stage_name) {
    setText("artist-name", profile.display_name || profile.stage_name);
  }

  if (typeof profile.earnings === "number") {
    setText("artist-earnings", `$${profile.earnings.toFixed(2)}`);
  }

  const statusEl = $("artist-status");
  if (statusEl) {
    statusEl.textContent =
      profile.status_message ||
      "Your artist tools, tracks, and contracts are ready.";
  }
}

/* ============================================================
   MAIN DASHBOARD LOAD
============================================================ */
async function loadMusicianDashboard() {
  try {
    const userRaw = localStorage.getItem("user");
    if (!userRaw) {
      window.location.href = "/login.html";
      return;
    }

    const user = JSON.parse(userRaw);

    const me = await apiGet("/api/auth/me", user);
    if (!me || me.role !== "musician") {
      window.location.href = "/login.html";
      return;
    }

    setText("artist-name", me.name || me.email || "Artist");

    const [profileRes, tracksRes, collabsRes, messagesRes, licensesRes] =
      await Promise.allSettled([
        apiGet("/api/musician/profile", user),
        apiGet("/api/musician/tracks", user),
        apiGet("/api/musician/collabs", user),
        apiGet("/api/musician/messages", user),
        apiGet("/api/musician/licenses", user),
      ]);

    const profile =
      profileRes.status === "fulfilled" ? profileRes.value?.data || profileRes.value : null;
    const tracks =
      tracksRes.status === "fulfilled" ? tracksRes.value?.data || tracksRes.value : [];
    const collabs =
      collabsRes.status === "fulfilled" ? collabsRes.value?.data || collabsRes.value : [];
    const messages =
      messagesRes.status === "fulfilled" ? messagesRes.value?.data || messagesRes.value : [];
    const licenses =
      licensesRes.status === "fulfilled" ? licensesRes.value?.data || licensesRes.value : [];

    renderProfile(profile);
    renderTracks(tracks);
    renderLicenses(licenses);
    renderCollabs(collabs);
    renderMessages(messages);

  } catch (err) {
    console.error("Musician Dashboard Error:", err);
    const statusEl = $("artist-status");
    if (statusEl) {
      statusEl.textContent =
        "There was a problem loading your dashboard. Please refresh or try again shortly.";
    }
  } finally {
    hideMusicianLoader();
  }
}

/* ============================================================
   BOOTSTRAP
============================================================ */
window.addEventListener("DOMContentLoaded", () => {
  loadMusicianDashboard();
});
