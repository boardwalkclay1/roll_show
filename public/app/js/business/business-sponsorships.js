import { api } from "/js/core/api.js";

export async function init() {
  const list = document.getElementById("business-sponsorship-list");
  const offers = await api("/business/sponsorships/list");

  list.innerHTML = offers.map(o => `
    <div class="sponsorship-card">
      <h3>${o.skater_name}</h3>
      <p>Status: ${o.status}</p>
      <p>Campaign: ${o.campaign_title}</p>
    </div>
  `).join("");
}
