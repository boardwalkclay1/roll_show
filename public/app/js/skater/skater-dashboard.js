import API from "../api.js";
import { getUserIdFromQuery } from "../utils.js";

const userId = getUserIdFromQuery();

async function loadDashboard() {
  const data = await API.get(`/api/skater/dashboard?user=${userId}`);

  // NAME
  document.getElementById("skater-name").textContent = data.name;

  // EARNINGS
  document.getElementById("skater-earnings").textContent =
    `$${(data.earnings_cents / 100).toFixed(2)}`;

  // SHOWS
  const shows = document.getElementById("skater-shows");
  shows.innerHTML = "";
  data.shows.forEach(show => {
    const li = document.createElement("li");
    li.textContent = `${show.title} — $${(show.price_cents / 100).toFixed(2)}`;
    shows.appendChild(li);
  });

  // BADGE
  if (data.badge_status) {
    const badgeImg = document.getElementById("skater-badge");
    const badgeText = document.getElementById("badge-status");

    if (data.badge_status === "verified") {
      badgeImg.src = "/app/images/badges/badge-verified.png";
      badgeText.textContent = "Roll Show Verified";
    } else if (data.badge_status === "pending") {
      badgeImg.src = "/app/images/badges/badge-pending.png";
      badgeText.textContent = "Verification Pending";
    } else {
      badgeImg.src = "/app/images/badges/badge-unverified.png";
      badgeText.textContent = "Unverified";
    }
  }

  // VERIFICATION CARD
  if (data.badge_status !== "verified") {
    const card = document.getElementById("verify-card");
    if (card) card.style.display = "block";
  }
}

loadDashboard();
