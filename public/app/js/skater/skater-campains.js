import API from "/js/api.js";

function getUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}");
  } catch {
    return {};
  }
}

async function loadCampaigns() {
  const user = getUser();
  const headers = API.withUser(user);

  const res = await API.get("/api/skater/campaigns", headers);
  if (!res.success) {
    console.error("Failed to load campaigns", res.error);
    return;
  }

  const list = document.getElementById("campaigns-list");
  list.innerHTML = "";

  (res.data || []).forEach(c => {
    const div = document.createElement("div");
    div.className = "card";
    div.innerHTML = `
      <h3>${c.title}</h3>
      <p>${c.description || ""}</p>
      <p>Goal: ${c.goal_cents ? `$${(c.goal_cents / 100).toFixed(2)}` : ""}</p>
      <p>Raised: ${c.raised_cents ? `$${(c.raised_cents / 100).toFixed(2)}` : ""}</p>
    `;
    list.appendChild(div);
  });
}

function bindCreate() {
  const btn = document.getElementById("create-campaign-btn");
  if (!btn) return;

  btn.addEventListener("click", async () => {
    const title = prompt("Campaign title");
    if (!title) return;

    const user = getUser();
    const headers = API.withUser(user);

    const res = await API.post("/api/skater/campaigns", { title }, headers);
    if (!res.success) {
      alert("Failed to create campaign");
      return;
    }
    loadCampaigns();
  });
}

document.addEventListener("DOMContentLoaded", () => {
  loadCampaigns();
  bindCreate();
});
