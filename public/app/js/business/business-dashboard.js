// /app/js/business/business-dashboard.js
import API from "/app/js/api.js";

/* ============================================================
   DOM HELPERS
============================================================ */
function $(id) {
  return document.getElementById(id);
}

/* ============================================================
   LOADER CONTROL
============================================================ */
function hideBusinessLoader() {
  const loader = $("business-loading");
  if (loader) loader.classList.add("rs-hidden");
}

/* ============================================================
   MAIN DASHBOARD LOAD
============================================================ */
async function loadBusinessDashboard() {
  try {
    const userRaw = localStorage.getItem("user");
    if (!userRaw) {
      window.location.href = "/login.html";
      return;
    }

    const user = JSON.parse(userRaw);

    // AUTH CHECK
    const me = await apiGet("/api/auth/me", user);
    if (!me || me.role !== "business") {
      window.location.href = "/login.html";
      return;
    }

    // NAME
    setText("business-name", me.name || me.email || "Business");

    // PARALLEL LOADS
    const [profileRes, campaignsRes, offersRes, messagesRes] =
      await Promise.allSettled([
        apiGet("/api/business/profile", user),
        apiGet("/api/business/campaigns", user),
        apiGet("/api/business/offers", user),
        apiGet("/api/business/messages", user),
      ]);

    const profile =
      profileRes.status === "fulfilled"
        ? profileRes.value?.data || profileRes.value
        : null;

    const campaigns =
      campaignsRes.status === "fulfilled"
        ? campaignsRes.value?.data || campaignsRes.value
        : [];

    const offers =
      offersRes.status === "fulfilled"
        ? offersRes.value?.data || offersRes.value
        : [];

    const messages =
      messagesRes.status === "fulfilled"
        ? messagesRes.value?.data || messagesRes.value
        : [];

    renderCampaigns(campaigns);
    renderOffers(offers);
    renderMessages(messages);

  } catch (err) {
    console.error("Business Dashboard Error:", err);
  } finally {
    hideBusinessLoader();
  }
}

/* ============================================================
   RENDERERS (SAFE)
============================================================ */
function setText(id, value) {
  const el = $(id);
  if (el) el.textContent = value ?? "";
}

function renderCampaigns(list) {
  const ul = $("business-campaigns");
  if (!ul) return;

  ul.innerHTML = "";

  if (!Array.isArray(list) || list.length === 0) {
    ul.innerHTML = "<li>No campaigns yet.</li>";
    return;
  }

  list.forEach(c => {
    const li = document.createElement("li");
    li.textContent = `${c.name || "Campaign"} — ${c.status || "active"}`;
    ul.appendChild(li);
  });
}

function renderOffers(list) {
  const ul = $("business-offers");
  if (!ul) return;

  ul.innerHTML = "";

  if (!Array.isArray(list) || list.length === 0) {
    ul.innerHTML = "<li>No offers yet.</li>";
    return;
  }

  list.forEach(o => {
    const li = document.createElement("li");
    li.textContent = `${o.type || "Offer"} → ${o.to_user_name || "User"} (${o.status || "pending"})`;
    ul.appendChild(li);
  });
}

function renderMessages(msgs) {
  const ul = $("business-messages");
  if (!ul) return;

  ul.innerHTML = "";

  if (!Array.isArray(msgs) || msgs.length === 0) {
    ul.innerHTML = "<li>No messages yet.</li>";
    return;
  }

  msgs.forEach(m => {
    const li = document.createElement("li");
    li.textContent = `${m.sender_name || "Unknown"}: ${m.content || ""}`;
    ul.appendChild(li);
  });
}

/* ============================================================
   BOOTSTRAP
============================================================ */
document.addEventListener("DOMContentLoaded", () => {
  loadBusinessDashboard();
});
