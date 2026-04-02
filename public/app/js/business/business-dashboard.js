import { apiGet } from "/app/js/utils.js";

async function loadBusinessDashboard() {
  try {
    const user = await apiGet("/api/auth/me");
    if (!user || user.role !== "business") {
      window.location.href = "/login.html";
      return;
    }

    document.getElementById("business-name").textContent = user.name;

    const profile = await apiGet("/api/business/profile");
    const campaigns = await apiGet("/api/business/campaigns");
    const offers = await apiGet("/api/business/offers");
    const messages = await apiGet("/api/business/messages");

    renderCampaigns(campaigns);
    renderOffers(offers);
    renderMessages(messages);

  } catch (err) {
    console.error("Business Dashboard Error:", err);
  }
}

function renderCampaigns(list) {
  const ul = document.getElementById("business-campaigns");
  ul.innerHTML = "";

  list.forEach(c => {
    const li = document.createElement("li");
    li.textContent = `${c.name} — ${c.status}`;
    ul.appendChild(li);
  });
}

function renderOffers(list) {
  const ul = document.getElementById("business-offers");
  ul.innerHTML = "";

  list.forEach(o => {
    const li = document.createElement("li");
    li.textContent = `${o.type} → ${o.to_user_name} (${o.status})`;
    ul.appendChild(li);
  });
}

function renderMessages(msgs) {
  const ul = document.getElementById("business-messages");
  ul.innerHTML = "";

  msgs.forEach(m => {
    const li = document.createElement("li");
    li.textContent = `${m.sender_name}: ${m.content}`;
    ul.appendChild(li);
  });
}

loadBusinessDashboard();
