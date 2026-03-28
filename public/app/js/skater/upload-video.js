import API from "../api.js";
import { getUserIdFromQuery } from "../utils.js";

const form = document.getElementById("upload-video-form");
const userId = getUserIdFromQuery();

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const fd = new FormData(form);
  const file = fd.get("video");
  const title = fd.get("title");

  const presign = await API.post("/api/upload/video-url", {
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

  await API.post("/api/upload/video-complete", {
    user_id: userId,
    title,
    r2_key: presign.r2_key
  });

  alert("Video uploaded.");
  form.reset();
});
