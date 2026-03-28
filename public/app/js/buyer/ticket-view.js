import API from "../api.js";

const params = new URLSearchParams(window.location.search);
const ticketId = params.get("ticket");

async function loadTicket() {
  const data = await API.get(`/api/buyer/ticket/${ticketId}`);

  document.getElementById("ticket-title").textContent = data.show_title;
  document.getElementById("ticket-details").textContent = data.date;
  document.getElementById("ticket-code").textContent = `Code: ${data.code}`;
}

loadTicket();
