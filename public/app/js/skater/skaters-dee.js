import API from "../api.js";

async function loadSkaters() {
  const data = await API.get("/api/feed/skaters");

  const list = document.getElementById("skaters-list");
  list.innerHTML = "";

  data.skaters.forEach(s => {
    const li = document.createElement("li");
    li.textContent = `${s.name} — ${s.discipline}`;
    list.appendChild(li);
  });
}

loadSkaters();
