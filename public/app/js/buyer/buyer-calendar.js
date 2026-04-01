import { api } from "/js/core/api.js";

export async function init() {
  const container = document.getElementById("buyer-calendar-container");
  const events = await api("/buyer/calendar/list");

  container.innerHTML = events.map(e => `
    <div class="calendar-event">
      <h3>${e.title}</h3>
      <p>${e.start_time}</p>
      <p>${e.location_name || ""}</p>
    </div>
  `).join("");
}
