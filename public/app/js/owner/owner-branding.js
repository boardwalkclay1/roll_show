import API from "/app/js/api.js";

const user = JSON.parse(localStorage.getItem("user") || "{}");

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
  const res = await API.get("/api/owner/settings/branding", API.withUser(user));
  if (!res.success || !res.data) return;

  const b = res.data;
  brandPrimary.value = b.primary_color || "#ff4b8b";
  brandSecondary.value = b.secondary_color || "#ffb347";
  brandAccent.value = b.accent_color || "#ffffff";
  brandTheme.value = b.theme_mode || "cinematic";
}

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

btnUploadBrandAssets.addEventListener("click", async () => {
  const files = [
    { el: brandLogo, key: "logo" },
    { el: brandFavicon, key: "favicon" },
    { el: brandBackground, key: "background" }
  ];

  for (const f of files) {
    if (!f.el.files.length) continue;

    const file = f.el.files[0];

    const init = await API.media.initUpload("photo", file, user);
    if (!init.success) {
      alert("Upload init failed");
      return;
    }

    const mediaId = init.data.media.id;

    const up = await API.media.uploadFile(mediaId, file, user);
    if (!up.success) {
      alert("Upload failed");
      return;
    }

    await API.post("/api/owner/settings/branding", {
      [`${f.key}_media_id`]: mediaId
    }, API.withUser(user));
  }

  alert("Brand assets updated");
});

loadBranding();
