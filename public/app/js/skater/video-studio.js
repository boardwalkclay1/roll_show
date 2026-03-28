import API from "../api.js";
import { getUserIdFromQuery } from "../utils.js";

const userId = getUserIdFromQuery();
const list = document.getElementById("video-list");

async function loadVideos() {
  const data = await API.get(`/api/skater/videos?user=${userId}`);

  list.innerHTML = "";
  data.videos.forEach(v => {
    const li = document.createElement("li");
    li.textContent = v.title;
    list.appendChild(li);
  });
}

loadVideos();
