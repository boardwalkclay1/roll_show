import { api } from "/js/core/api.js";

export async function init() {
  const list = document.getElementById("buyer-ticket-list");
  const tickets = await api("/buyer/tickets/list");

  list.innerHTML = tickets.map(t => `
    <div class="ticket-card">
      <h3>${t.show_title}</h3>
      <p>Status: ${t.status}</p>
      <p>Purchased: ${t.purchased_at}</p>
      <img src="${t.qr_code_url}" class="ticket-qr" />
    </div>
  `).join("");
}
