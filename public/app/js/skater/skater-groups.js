import API from "/js/api.js";

function getUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}");
  } catch {
    return {};
  }
}

async function loadGroups() {
  const user = getUser();
  const headers = API.withUser(user);

  const res = await API.get("/api/skater/groups", headers);
  if (!res.success) {
    console.error("Failed to load groups", res.error);
    return;
  }

  const list = document.getElementById("groups-list");
  list.innerHTML = "";

  (res.data || []).forEach(group => {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <h3>${group.name}</h3>
      <p>${group.description || ""}</p>
      <button data-id="${group.id}" class="btn-outline group-open">Open</button>
    `;
    list.appendChild(card);
  });

  list.addEventListener("click", e => {
    const btn = e.target.closest(".group-open");
    if (!btn) return;
    const id = btn.dataset.id;
    window.location.href = `/public/pages/skater/skater-group.html?id=${id}`;
  });
}

function bindCreate() {
  const btn = document.getElementById("create-group-btn");
  if (!btn) return;

  btn.addEventListener("click", async () => {
    const name = prompt("Group name");
    if (!name) return;

    const user = getUser();
    const headers = API.withUser(user);

    const res = await API.post("/api/skater/groups", { name }, headers);
    if (!res.success) {
      alert("Failed to create group");
      return;
    }
    loadGroups();
  });
}

document.addEventListener("DOMContentLoaded", () => {
  loadGroups();
  bindCreate();
});
