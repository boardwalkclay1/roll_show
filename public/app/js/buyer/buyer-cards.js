import { api } from "/js/core/api.js";

export async function init() {
  const container = document.getElementById("buyer-card-library");
  const cards = await api("/buyer/cards/list");

  container.innerHTML = cards.map(c => `
    <div class="card-item">
      <img src="${c.image_url}" />
      <h3>${c.title}</h3>
      <p>Rarity: ${c.rarity}</p>
    </div>
  `).join("");
}
