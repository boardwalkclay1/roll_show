import API from "../api.js";
import { getUserIdFromQuery } from "../utils.js";

const userId = getUserIdFromQuery();
const list = document.getElementById("ticket-list");

async function loadWallet() {
  const data = await API.get(`/api/buyer/tickets?user=${userId}`);

  list.innerHTML = "";
  data.tickets.forEach(t => {
    const li = document.createElement("li");
    li.innerHTML = `
      ${t.show_title} — ${t.date}
      <a href="/pages/buyer/ticket-view.html?ticket=${t.id}">View</a>
    `;
    list.appendChild(li);
  });
}

loadWallet();
