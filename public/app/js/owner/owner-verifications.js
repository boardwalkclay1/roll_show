import API from "/js/api.js";

function user() {
  return JSON.parse(localStorage.getItem("user") || "{}");
}

async function loadVerifications() {
  const headers = API.withUser(user());
  const res = await API.get("/api/owner/verifications", headers);

  if (!res.success) return console.error(res.error);

  const list = document.getElementById("verification-list");
  list.innerHTML = "";

  (res.data || []).forEach(v => {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <h3>${v.name}</h3>
      <p>Role: ${v.role}</p>
      <button class="btn-primary" data-id="${v.id}" data-action="approve">Approve</button>
      <button class="btn-outline" data-id="${v.id}" data-action="reject">Reject</button>
    `;
    list.appendChild(card);
  });

  list.addEventListener("click", async e => {
    const btn = e.target.closest("button");
    if (!btn) return;

    const id = btn.dataset.id;
    const action = btn.dataset.action;

    const headers = API.withUser(user());
    await API.post(`/api/owner/verifications/${id}`, { action }, headers);

    loadVerifications();
  });
}

document.addEventListener("DOMContentLoaded", loadVerifications);
