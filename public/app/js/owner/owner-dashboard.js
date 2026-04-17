// ============================================================
// OWNER DASHBOARD JS — FINAL VERSION (WORKS WITH NEW api.js)
// ============================================================

let owner = null;

// Wait until DOM + app.js are ready
window.addEventListener("DOMContentLoaded", () => {
  // dev-owner.js provides getUser()
  owner = (typeof requireUser === "function")
    ? requireUser(["owner"])
    : getUser();

  initOwnerDashboard();
});

// ============================================================
// AUTHED HELPERS (using restored API.get/post/delete)
// ============================================================
async function authedGet(path) {
  return API.get(path, owner);
}

async function authedPost(path, body) {
  return API.post(path, body, owner);
}

async function authedDelete(path) {
  return API.delete(path, owner);
}

// ============================================================
// SECTION SWITCHING
// ============================================================
const navButtons = document.querySelectorAll(".owner-nav button");
const sections = document.querySelectorAll(".owner-section");

navButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    const target = btn.dataset.section;

    navButtons.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    sections.forEach(sec => {
      sec.classList.toggle("active", sec.id === `section-${target}`);
    });
  });
});

// ============================================================
// BRANDING
// ============================================================
const brandPrimary = document.getElementById("brand-primary");
const brandSecondary = document.getElementById("brand-secondary");
const brandAccent = document.getElementById("brand-accent");
const brandTheme = document.getElementById("brand-theme");

const brandLogo = document.getElementById("brand-logo");
const brandFavicon = document.getElementById("brand-favicon");
const brandBackground = document.getElementById("brand-background");

const btnSaveBranding = document.getElementById("btn-save-branding");
const btnUploadBrandAssets = document.getElementById("btn-upload-brand-assets");

async function loadBranding() {
  const res = await authedGet("/api/owner/settings/branding");
  if (!res?.data) return;

  const b = res.data;

  brandPrimary.value = b.primary_color || "#ff4b8b";
  brandSecondary.value = b.secondary_color || "#ffb347";
  brandAccent.value = b.accent_color || "#ffffff";
  brandTheme.value = b.theme_mode || "cinematic";
}

if (btnSaveBranding) {
  btnSaveBranding.addEventListener("click", async () => {
    const payload = {
      primary_color: brandPrimary.value,
      secondary_color: brandSecondary.value,
      accent_color: brandAccent.value,
      theme_mode: brandTheme.value
    };

    const res = await authedPost("/api/owner/settings/branding", payload);
    alert(res.success ? "Branding saved" : "Error saving branding");
  });
}

if (btnUploadBrandAssets) {
  btnUploadBrandAssets.addEventListener("click", async () => {
    const files = [
      { el: brandLogo, key: "logo" },
      { el: brandFavicon, key: "favicon" },
      { el: brandBackground, key: "background" }
    ];

    for (const f of files) {
      if (!f.el?.files?.length) continue;

      const file = f.el.files[0];

      const init = await authedPost("/api/media/init-upload", {
        type: "photo",
        filename: file.name,
        contentType: file.type,
        size: file.size
      });

      if (!init.media || !init.uploadPath) {
        alert("Upload init failed");
        return;
      }

      const uploadRes = await fetch(init.uploadPath, {
        method: "PUT",
        body: file
      });

      if (!uploadRes.ok) {
        alert("Upload failed");
        return;
      }

      await authedPost("/api/owner/settings/branding", {
        [`${f.key}_media_id`]: init.media.id
      });
    }

    alert("Brand assets updated");
  });
}

// ============================================================
// NOTES
// ============================================================
const notesList = document.getElementById("notes-list");
const noteText = document.getElementById("note-text");
const btnAddNote = document.getElementById("btn-add-note");

async function loadNotes() {
  const res = await authedGet("/api/owner/settings/notes");
  if (!res?.data || !notesList) return;

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

  notesList.querySelectorAll(".note-delete").forEach(btn => {
    btn.addEventListener("click", async () => {
      await authedDelete(`/api/owner/settings/notes?id=${btn.dataset.id}`);
      loadNotes();
    });
  });
}

if (btnAddNote) {
  btnAddNote.addEventListener("click", async () => {
    const text = noteText.value.trim();
    if (!text) return;

    await authedPost("/api/owner/settings/notes", { note: text });
    noteText.value = "";
    loadNotes();
  });
}

// ============================================================
// ADS
// ============================================================
const adsTableBody = document.querySelector("#ads-table tbody");

async function loadAds() {
  const res = await authedGet("/api/owner/ads");
  if (!res?.data || !adsTableBody) return;

  const ads = res.data.ads || [];

  adsTableBody.innerHTML = ads.map(a => `
    <tr>
      <td>${a.id}</td>
      <td>${a.business_name}</td>
      <td>${a.media_type}</td>
      <td><span class="status-pill status-${a.status}">${a.status}</span></td>
      <td>${new Date(a.created_at).toLocaleString()}</td>
      <td>
        <button class="btn-approve" data-id="${a.id}">Approve</button>
        <button class="btn-reject" data-id="${a.id}">Reject</button>
      </td>
    </tr>
  `).join("");

  adsTableBody.querySelectorAll(".btn-approve").forEach(btn => {
    btn.addEventListener("click", async () => {
      await authedPost("/api/owner/ads", {
        adId: btn.dataset.id,
        status: "approved"
      });
      loadAds();
    });
  });

  adsTableBody.querySelectorAll(".btn-reject").forEach(btn => {
    btn.addEventListener("click", async () => {
      await authedPost("/api/owner/ads", {
        adId: btn.dataset.id,
        status: "rejected"
      });
      loadAds();
    });
  });
}

// ============================================================
// SPONSORSHIPS
// ============================================================
const sponsorshipsTableBody = document.querySelector("#sponsorships-table tbody");

async function loadSponsorships() {
  const res = await authedGet("/api/owner/sponsorships");
  if (!res?.data || !sponsorshipsTableBody) return;

  const rows = res.data.sponsorships || [];

  sponsorshipsTableBody.innerHTML = rows.map(s => `
    <tr>
      <td>${s.id}</td>
      <td>${s.business_name}</td>
      <td>${s.skater_name}</td>
      <td>$${s.amount}</td>
      <td><span class="status-pill status-${s.status}">${s.status}</span></td>
      <td>${new Date(s.created_at).toLocaleString()}</td>
    </tr>
  `).join("");
}

// ============================================================
// INIT
// ============================================================
async function initOwnerDashboard() {
  await loadBranding();
  await loadNotes();
  await loadAds();
  await loadSponsorships();
}
