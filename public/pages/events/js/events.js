// ===============================
// EVENTS.JS — EVENTS CATEGORY
// ===============================

document.addEventListener("DOMContentLoaded", () => {
  const body = document.body;

  if (body.classList.contains("events-list-page")) initEventsList();
  if (body.classList.contains("event-detail-page")) initEventDetail();
  if (body.classList.contains("event-create-page")) initEventCreate();
  if (body.classList.contains("event-checkin-page")) initEventCheckin();
});

// -------------------------------
// API
// -------------------------------
async function api(path, method = "GET", body = null) {
  const opts = { method, headers: { "Content-Type": "application/json" } };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`/api${path}`, opts);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

// -------------------------------
// EVENTS LIST
// -------------------------------
async function initEventsList() {
  const list = document.getElementById("events-list");
  const events = await api("/events");

  list.innerHTML = events
    .map(
      (e) => `
      <article class="event-card" onclick="openEvent('${e.id}')">
        <div class="event-card-header">
          <span>${e.title}</span>
          <span class="event-type-pill">${e.type}</span>
        </div>
        <div class="event-card-meta">${e.date} · ${e.location}</div>
        <div class="event-card-meta">${e.description}</div>
      </article>`
    )
    .join("");
}

function openEvent(id) {
  window.location = `/public/pages/events/event-detail.html?id=${id}`;
}

// -------------------------------
// EVENT DETAIL
// -------------------------------
async function initEventDetail() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");

  const data = await api(`/events/${id}`);

  document.getElementById("event-title").textContent = data.title;
  document.getElementById("event-date").textContent = data.date;
  document.getElementById("event-location").textContent = data.location;
  document.getElementById("event-description").textContent = data.description;

  document.getElementById("event-checkin-btn").onclick = () => {
    window.location = `/public/pages/events/event-checkin.html?id=${id}`;
  };
}

// -------------------------------
// EVENT CREATE
// -------------------------------
function initEventCreate() {
  const form = document.getElementById("event-create-form");

  form.onsubmit = async (e) => {
    e.preventDefault();

    const payload = {
      title: form.title.value,
      date: form.date.value,
      location: form.location.value,
      description: form.description.value,
      type: form.type.value,
    };

    await api("/events", "POST", payload);
    window.location = "/public/pages/events/events-list.html";
  };
}

// -------------------------------
// EVENT CHECK-IN
// -------------------------------
async function initEventCheckin() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");

  const btn = document.getElementById("checkin-btn");

  btn.onclick = async () => {
    await api(`/events/${id}/checkin`, "POST", {});
    alert("Checked in!");
    window.location = "/public/pages/events/events-list.html";
  };
}
