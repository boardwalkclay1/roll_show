import API from "/app/js/api.js";
import QRCode from "/app/js/libs/qrcode.min.js";

const user = JSON.parse(localStorage.getItem("user") || "{}");

const typeEl = document.getElementById("qr-type");
const targetEl = document.getElementById("qr-target");
const expirationEl = document.getElementById("qr-expiration");
const trackingEl = document.getElementById("qr-tracking");

const generateBtn = document.getElementById("qr-generate-btn");
const previewEl = document.getElementById("qr-preview");
const emptyEl = document.getElementById("qr-empty");
const canvasEl = document.getElementById("qr-canvas");
const linkEl = document.getElementById("qr-link");

const downloadBtn = document.getElementById("qr-download-btn");
const copyBtn = document.getElementById("qr-copy-btn");

let currentQRLink = "";

/* Load targets based on type */
async function loadTargets() {
  const type = typeEl.value;

  const res = await API.get(`/api/qr/targets?type=${type}`, API.withUser(user));
  if (!res.success) {
    targetEl.innerHTML = `<option value="">No items available</option>`;
    return;
  }

  const items = res.data.items || [];
  targetEl.innerHTML = items.map(i => `
    <option value="${i.id}">${i.name}</option>
  `).join("");
}

typeEl.addEventListener("change", loadTargets);

/* Generate QR */
generateBtn.addEventListener("click", async () => {
  const payload = {
    type: typeEl.value,
    target_id: targetEl.value,
    expiration: expirationEl.value,
    tracking: trackingEl.value
  };

  const res = await API.post("/api/qr/generate", payload, API.withUser(user));
  if (!res.success) {
    alert("Error generating QR");
    return;
  }

  currentQRLink = res.data.url;

  // Render QR
  QRCode.toCanvas(canvasEl, currentQRLink, { width: 260 }, err => {
    if (err) console.error(err);
  });

  linkEl.textContent = currentQRLink;

  emptyEl.classList.add("hidden");
  previewEl.classList.remove("hidden");
});

/* Download QR */
downloadBtn.addEventListener("click", () => {
  const link = document.createElement("a");
  link.download = "rollshow-qr.png";
  link.href = canvasEl.toDataURL("image/png");
  link.click();
});

/* Copy link */
copyBtn.addEventListener("click", async () => {
  await navigator.clipboard.writeText(currentQRLink);
  alert("Link copied");
});

/* INIT */
loadTargets();
