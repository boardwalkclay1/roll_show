import API from "../api.js";
import { getUserIdFromQuery } from "../utils.js";

const userId = getUserIdFromQuery();

async function loadFeed() {
  const data = await API.get(`/api/skater/feed?user=${userId}`);

  // Businesses
  const businessList = document.getElementById("business-feed");
  businessList.innerHTML = "";
  data.businesses.forEach(b => {
    const li = document.createElement("li");
    li.textContent = `${b.company_name} — ${b.offer_summary}`;
    businessList.appendChild(li);
  });

  // Musicians
  const musicianList = document.getElementById("musician-feed");
  musicianList.innerHTML = "";
  data.musicians.forEach(m => {
    const li = document.createElement("li");
    li.textContent = `${m.artist_name} — ${m.genre}`;
    musicianList.appendChild(li);
  });

  // Skaters
  const skaterList = document.getElementById("skater-feed");
  skaterList.innerHTML = "";
  data.skaters.forEach(s => {
    const li = document.createElement("li");
    li.textContent = `${s.name} — ${s.discipline}`;
    skaterList.appendChild(li);
  });
}

loadFeed();
