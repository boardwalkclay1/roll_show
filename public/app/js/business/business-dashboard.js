import API from "../api.js";
import { getUserIdFromQuery } from "../utils.js";

const userId = getUserIdFromQuery();

async function loadDashboard() {
  const data = await API.get(`/api/business/dashboard?user=${userId}`);

  document.getElementById("business-name").textContent = data.company_name;

  const offers = document.getElementById("business-offers");
  offers.innerHTML = "";
  data.offers.forEach(o => {
    const li = document.createElement("li");
    li.textContent = `${o.title} — ${o.status}`;
    offers.appendChild(li);
  });

  const inbox = document.getElementById("offers-inbox");
  inbox.innerHTML = "";
  data.inbox.forEach(i => {
    const li = document.createElement("li");
    li.textContent = `${i.skater_name}: ${i.message}`;
    inbox.appendChild(li);
  });
}

loadDashboard();
