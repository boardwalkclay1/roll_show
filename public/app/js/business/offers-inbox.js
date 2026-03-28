import API from "../api.js";
import { getUserIdFromQuery } from "../utils.js";

const userId = getUserIdFromQuery();
const list = document.getElementById("inbox-list");

async function loadInbox() {
  const data = await API.get(`/api/business/inbox?user=${userId}`);

  list.innerHTML = "";
  data.inbox.forEach(i => {
    const li = document.createElement("li");
    li.textContent = `${i.skater_name}: ${i.message}`;
    list.appendChild(li);
  });
}

loadInbox();
