// /app/js/owner-dashboard.js
import API from "/js/api.js";

/* ============================================================
   GLOBALS
============================================================ */
let user = JSON.parse(localStorage.getItem("user") || "{}");

/* ============================================================
   SECTION SWITCHING
============================================================ */
const navButtons = document.querySelectorAll(".owner-nav button");
const sections = document.querySelectorAll(".owner-section");

navButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    const target = btn.getAttribute("data-section");

    navButtons.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    sections.forEach(sec => {
      sec.classList.toggle("active", sec.id === "section-" + target);
    });
  });
});

/* ============================================================
   BRANDING
============================================================ */
const brandPrimary = document.getElementById("brand-primary");
const brandSecondary = document.getElementById("brand-secondary");
const brandAccent = document.getElementById("brand-accent");
const brandTheme = document.getElementById("brand-theme");

const brandLogo = document.getElementById("brand-logo");
const brandFavicon = document.getElementById("brand-favicon");
const brandBackground = document.getElementById("brand-background");

const btnSaveBranding = document.getElementById("btn-save-branding");
const btnUploadBrandAssets = document.getElementById("btn-upload-brand-assets");

/* Load branding settings */
async function loadBranding() {
  const res = await API.get("/api/owner/settings/branding", API.withUser(user));
  if (!res.success) return;

  const b = res.data;

  brandPrimary.value = b.primary_color || "#ff4b8b";
  brandSecondary.value = b.secondary_color || "#ffb347";
  brandAccent.value = b.accent_color || "#ffffff";
  brandTheme.value = b.theme_mode || "cinematic";
}

/* Save branding colors + theme */
btnSaveBranding.addEventListener("click", async () => {
  const payload = {
    primary_color: brandPrimary.value,
    secondary_color: brandSecondary.value,
    accent_color: brandAccent.value,
    theme_mode: brandTheme.value
  };

  const res = await API.post("/api/owner/settings/branding", payload, API.withUser(user));
  alert(res.success ? "Branding saved" : "Error saving branding");
});

/* Upload logo / favicon / background */
btnUploadBrandAssets.addEventListener("click", async () => {
  const files = [
    { el: brandLogo, key: "logo" },
    { el: brandFavicon, key: "favicon" },
    { el: brandBackground, key: "background" }
  ];

  for (const f of files) {
    if (!f.el.files.length) continue;

    const file = f.el.files[0];

    // Step 1: init upload
    const init = await API.media.initUpload("photo", file, user);
    if (!init.success) {
      alert("Upload init failed");
      return;
    }

    const mediaId = init.data.media.id;

    // Step 2: upload file
    const up = await API.media.uploadFile(mediaId, file, user);
    if (!up.success) {
      alert("Upload failed");
      return;
    }

    // Step 3: save reference
    await API.post("/api/owner/settings/branding", {
      [`${f.key}_media_id`]: mediaId
    }, API.withUser(user));
  }

  alert("Brand assets updated");
});

/* ============================================================
   OWNER NOTES
============================================================ */
const notesList = document.getElementById("notes-list");
const noteText = document.getElementById("note-text");
const btnAddNote = document.getElementById("btn-add-note");

async function loadNotes() {
  const res = await API.get("/api/owner/settings/notes", API.withUser(user));
  if (!res.success) return;

  const notes = res.data.notes || [];

  notesList.innerHTML = notes.map(n => `
    <div class="note-item">
      <div>
        <div class="note-text">${n.note}</div>
        <div class="note-meta">${new Date(n.created_at).toLocaleString()}</div>
      </div>
      <button class="note-delete" data-id="${n.id}">Delete</button>
    </div>
  `).join("");

  document.querySelectorAll(".note-delete").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-id");
      await API.delete(`/api/owner/settings/notes?id=${id}`, API.withUser(user));
      loadNotes();
    });
  });
}

btnAddNote.addEventListener("click", async () => {
  const text = noteText.value.trim();
  if (!text) return;

  await API.post("/api/owner/settings/notes", { note: text }, API.withUser(user));
  noteText.value = "";
  loadNotes();
});

/* ============================================================
   ADS
============================================================ */
const adsTable = document.querySelector("#ads-table tbody");

async function loadAds() {
  const res = await API.get("/api/owner/ads", API.withUser(user));
  if (!res.success) return;

  const ads = res.data.ads || [];

  adsTable.innerHTML = ads.map(a => `
    <tr>
      <td>${a.id}</td>
      <td>${a.business_name}</td>
      <td>${a.media_type}</td>
      <td>
        <span class="status-pill status-${a.status}">
          ${a.status}
        </span>
      </td>
      <td>${new Date(a.created_at).toLocaleString()}</td>
      <td>
        <button class="btn-approve" data-id="${a.id}">Approve</button>
        <button class="btn-reject" data-id="${a.id}">Reject</button>
      </td>
    </tr>
  `).join("");

  document.querySelectorAll(".btn-approve").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-id");
      await API.post("/api/owner/ads", { adId: id, status: "approved" }, API.withUser(user));
      loadAds();
    });
  });

  document.querySelectorAll(".btn-reject").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-id");
      await API.post("/api/owner/ads", { adId: id, status: "rejected" }, API.withUser(user));
      loadAds();
    });
  });
}

/* ============================================================
   SPONSORSHIPS
============================================================ */
const sponsorshipsTable = document.querySelector("#sponsorships-table tbody");

async function loadSponsorships() {
  const res = await API.get("/api/owner/sponsorships", API.withUser(user));
  if (!res.success) return;

  const rows = res.data.sponsorships || [];

  sponsorshipsTable.innerHTML = rows.map(s => `
    <tr>
      <td>${s.id}</td>
      <td>${s.business_name}</td>
      <td>${s.skater_name}</td>
      <td>$${s.amount}</td>
      <td>
        <span class="status-pill status-${s.status}">
          ${s.status}
        </span>
      </td>
      <td>${new Date(s.created_at).toLocaleString()}</td>
    </tr>
  `).join("");
}

/* ============================================================
   INIT
============================================================ */
async function init() {
  await loadBranding();
  await loadNotes();
  await loadAds();
  await loadSponsorships();
}

init();
