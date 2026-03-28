import API from "../api.js";
import { getUserIdFromQuery } from "../utils.js";

const userId = getUserIdFromQuery();

async function loadDashboard() {
  const data = await API.get(`/api/musician/dashboard?user=${userId}`);

  document.getElementById("artist-name").textContent = data.name;
  document.getElementById("artist-earnings").textContent =
    `$${(data.earnings_cents / 100).toFixed(2)}`;

  const tracks = document.getElementById("artist-tracks");
  tracks.innerHTML = "";
  data.tracks.forEach(track => {
    const li = document.createElement("li");
    li.textContent = track.title;
    tracks.appendChild(li);
  });
}

loadDashboard();
