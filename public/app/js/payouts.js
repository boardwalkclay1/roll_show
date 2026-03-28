// /app/js/payouts.js
import API from "./api.js";
import { getUserIdFromQuery } from "./utils.js";

const userId = getUserIdFromQuery();
const list = document.getElementById("payouts-list");

async function loadPayouts() {
  try {
    const data = await API.get(`/api/payouts?user=${userId}`);

    list.innerHTML = "";
    data.payouts.forEach(p => {
      const li = document.createElement("li");
      li.textContent = `${p.status.toUpperCase()} — $${(p.amount_cents / 100).toFixed(2)}`;
      list.appendChild(li);
    });

  } catch (err) {
    console.error(err);
  }
}

loadPayouts();
