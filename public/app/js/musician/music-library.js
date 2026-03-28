import API from "../api.js";
import { getUserIdFromQuery } from "../utils.js";

const userId = getUserIdFromQuery();
const list = document.getElementById("track-list");

async function loadLibrary() {
  const data = await API.get(`/api/musician/library?user=${userId}`);

  list.innerHTML = "";
  data.tracks.forEach(t => {
    const li = document.createElement("li");
    li.textContent = t.title;
    list.appendChild(li);
  });
}

loadLibrary();
