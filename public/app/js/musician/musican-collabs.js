import API from "/js/api.js";

function user() {
  return JSON.parse(localStorage.getItem("user") || "{}");
}

async function loadCollabs() {
  const headers = API.withUser(user());
  const res = await API.get("/api/musician/collabs", headers);

  if (!res.success) return console.error(res.error);

  const list = document.getElementById("collabs-list");
  list.innerHTML = "";

  (res.data || []).forEach(col => {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <h3>${col.title}</h3>
      <p>With: ${col.with_name}</p>
      <p>${col.created_at}</p>
    `;
    list.appendChild(card);
  });
}

document.addEventListener("DOMContentLoaded", loadCollabs);
