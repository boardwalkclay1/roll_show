import API from "../api.js";

function getUserIdFromQuery() {
  const params = new URLSearchParams(window.location.search);
  return params.get("user");
}

const userId = getUserIdFromQuery();

async function loadDashboard() {
  const nameEl = document.getElementById("business-name");
  const revenueEl = document.getElementById("business-revenue");
  const offersEl = document.getElementById("business-offers");
  const contractsEl = document.getElementById("business-contracts");
  const statusEl = document.getElementById("business-status");

  if (!userId) {
    statusEl.textContent = "Missing business ID in URL.";
    return;
  }

  try {
    statusEl.textContent = "Loading…";

    const res = await API.get(`/api/business/dashboard?user=${encodeURIComponent(userId)}`);
    if (!res.success) {
      statusEl.textContent = res.error?.message || "Failed to load dashboard.";
      return;
    }

    const data = res.data || {};

    nameEl.textContent = data.name || "Business";
    revenueEl.textContent = `$${((data.revenue_cents || 0) / 100).toFixed(2)}`;

    offersEl.innerHTML = "";
    const offers = Array.isArray(data.offers) ? data.offers : [];
    if (offers.length === 0) {
      offersEl.innerHTML = "<li>No active offers.</li>";
    } else {
      offers.forEach(offer => {
        const li = document.createElement("li");
        li.textContent = `${offer.title} — $${(offer.price_cents / 100).toFixed(2)}`;
        offersEl.appendChild(li);
      });
    }

    contractsEl.innerHTML = "";
    const contracts = Array.isArray(data.contracts) ? data.contracts : [];
    if (contracts.length === 0) {
      contractsEl.innerHTML = "<li>No contracts yet.</li>";
    } else {
      contracts.forEach(contract => {
        const li = document.createElement("li");
        li.textContent = `${contract.skater_name} — ${contract.status}`;
        contractsEl.appendChild(li);
      });
    }

    statusEl.textContent = "";

  } catch (err) {
    console.error("Business dashboard error:", err);
    statusEl.textContent = "Server error loading dashboard.";
  }
}

loadDashboard();
