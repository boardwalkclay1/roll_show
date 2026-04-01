import API from "/js/api.js";

function user() {
  return JSON.parse(localStorage.getItem("user") || "{}");
}

async function loadNotifications() {
  const headers = API.withUser(user());
  const res = await API.get("/api/notifications", headers);

  if (!res.success) return console.error(res.error);

  const list = document.getElementById("notifications-list");
  list.innerHTML = "";

  (res.data || []).forEach(n => {
    const div = document.createElement("div");
    div.className = "card";
    div.innerHTML = `
      <h3>${n.title}</h3>
      <p>${n.body}</p>
      <p>${n.created_at}</p>
    `;
    list.appendChild(div);
  });
}

document.addEventListener("DOMContentLoaded", loadNotifications);
