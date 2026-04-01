import API from "/js/api.js";

function getUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}");
  } catch {
    return {};
  }
}

async function loadCards() {
  const user = getUser();
  const headers = API.withUser(user);

  const res = await API.get("/api/skater/cards", headers);
  if (!res.success) {
    console.error("Failed to load cards", res.error);
    return;
  }

  const grid = document.getElementById("cards-grid");
  grid.innerHTML = "";

  (res.data || []).forEach(card => {
    const div = document.createElement("div");
    div.className = "card skate-card";
    div.innerHTML = `
      <div class="card-image" style="background-image:url('${card.image_url || "/assets/images/card-placeholder.png"}')"></div>
      <h3>${card.title}</h3>
      <p>${card.rarity || ""}</p>
      <p>${card.price_cents ? `$${(card.price_cents / 100).toFixed(2)}` : ""}</p>
    `;
    grid.appendChild(div);
  });
}

function bindCreate() {
  const btn = document.getElementById("create-card-btn");
  if (!btn) return;

  btn.addEventListener("click", () => {
    alert("Card creation UI will hook into branding + upload next.");
  });
}

document.addEventListener("DOMContentLoaded", () => {
  loadCards();
  bindCreate();
});
