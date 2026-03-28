import API from "../api.js";
import { getUserIdFromQuery } from "../utils.js";

const userId = getUserIdFromQuery();
const list = document.getElementById("skater-feed");

async function loadFeed() {
  const data = await API.get(`/api/musician/feed?user=${userId}`);

  list.innerHTML = "";
  data.skaters.forEach(s => {
    const li = document.createElement("li");
    li.textContent = `${s.name} — ${s.discipline}`;
    list.appendChild(li);
  });
}

loadFeed();
