import API from "../api.js";
import { getUserIdFromQuery } from "../utils.js";

const form = document.getElementById("upload-track-form");
const userId = getUserIdFromQuery();

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const fd = new FormData(form);
  const file = fd.get("track");
  const title = fd.get("title");

  const presign = await API.post("/api/upload/track-url", {
    user_id: userId,
    title,
    filename: file.name,
    content_type: file.type
  });

  await fetch(presign.upload_url, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file
  });

  await API.post("/api/upload/track-complete", {
    user_id: userId,
    title,
    r2_key: presign.r2_key
  });

  alert("Track uploaded.");
  form.reset();
});
