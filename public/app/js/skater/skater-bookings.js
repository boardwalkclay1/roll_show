import API from "/js/api.js";

function getUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}");
  } catch {
    return {};
  }
}

async function loadBookings() {
  const user = getUser();
  const headers = API.withUser(user);

  const res = await API.get("/api/skater/bookings", headers);
  if (!res.success) {
    console.error("Failed to load bookings", res.error);
    return;
  }

  const incomingEl = document.getElementById("incoming-bookings");
  const outgoingEl = document.getElementById("outgoing-bookings");
  incomingEl.innerHTML = "";
  outgoingEl.innerHTML = "";

  (res.data.incoming || []).forEach(b => {
    incomingEl.appendChild(renderBookingCard(b, "incoming"));
  });

  (res.data.outgoing || []).forEach(b => {
    outgoingEl.appendChild(renderBookingCard(b, "outgoing"));
  });
}

function renderBookingCard(b, type) {
  const div = document.createElement("div");
  div.className = "card booking-card";
  div.innerHTML = `
    <h3>${b.title || "Booking"}</h3>
    <p>${b.date || ""} • ${b.location || ""}</p>
    <p>Status: ${b.status || "pending"}</p>
  `;
  return div;
}

function bindTabs() {
  const tabs = document.querySelectorAll(".tabs .tab");
  const incoming = document.getElementById("incoming-bookings");
  const outgoing = document.getElementById("outgoing-bookings");

  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      tabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");

      const tabName = tab.dataset.tab;
      if (tabName === "incoming") {
        incoming.classList.remove("hidden");
        outgoing.classList.add("hidden");
      } else {
        outgoing.classList.remove("hidden");
        incoming.classList.add("hidden");
      }
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  bindTabs();
  loadBookings();
});
