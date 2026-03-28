import API from "../api.js";
import { getUserIdFromQuery } from "../utils.js";

const form = document.getElementById("upload-track-form");
const userId = getUserIdFromQuery();
const checkbox = document.getElementById("rights-checkbox");
const button = document.getElementById("upload-btn");

if (checkbox && button) {
  checkbox.addEventListener("change", () => {
    button.disabled = !checkbox.checked;
  });
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const fd = new FormData(form);
  const file = fd.get("track");
  const title = fd.get("title");
  const legalName = fd.get("legal_name");
  const idLast4 = fd.get("id_last4");

  if (!checkbox.checked) {
    alert("You must attest to rights ownership to upload.");
    return;
  }

  // 1. Presign upload
  const presign = await API.post("/api/upload/track-url", {
    user_id: userId,
    title,
    filename: file.name,
    content_type: file.type
  });

  // 2. Upload to storage
  await fetch(presign.upload_url, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file
  });

  // 3. Complete + store legal attest
  await API.post("/api/upload/track-complete", {
    user_id: userId,
    title,
    r2_key: presign.r2_key,
    legal_name: legalName,
    id_last4: idLast4,
    rights_attested: true
  });

  alert("Track uploaded with rights attestation.");
  form.reset();
  button.disabled = true;
});
