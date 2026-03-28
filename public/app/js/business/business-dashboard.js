// /app/js/business-dashboard.js
import API from "./api.js";
import { getUserIdFromQuery } from "./utils.js";

const userId = getUserIdFromQuery();

async function loadDashboard() {
  try {
    const data = await API.get(`/api/business/dashboard?user=${userId}`);

    document.getElementById("business-name").textContent = data.name;

    const offers = document.getElementById("business-offers");
    offers.innerHTML = "";
    data.offers.forEach(offer => {
      const li = document.createElement("li");
      li.textContent = offer.title;
      offers.appendChild(li);
    });

  } catch (err) {
    console.error(err);
  }
}

loadDashboard();
