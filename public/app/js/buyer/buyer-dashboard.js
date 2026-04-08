// ============================================================
// BUYER DASHBOARD — CLEAN, STABLE, NO IMPORTS, NO CRASHES
// ============================================================

// Pull API from global (loaded in HTML)
const API = window.API;

const buyerState = {
  user: null,
  buyer: null,
  analyticsChips: [],
  actions: [],
  tickets: [],
  favorites: [],
  feedItems: []
};

const $bu = (id) => document.getElementById(id);

// ============================================================
// API WRAPPER
// ============================================================
async function apiGet(path, user) {
  return API.get(path, user);
}

// ============================================================
// LOADER
// ============================================================
function hideBuyerLoader() {
  const loader = $bu("buyer-loading");
  if (loader) loader.classList.add("rs-hidden");
}

// ============================================================
// INIT
// ============================================================
async function initBuyerDashboard() {
  try {
    const userRaw = localStorage.getItem("user");
    if (!userRaw) {
      window.location.href = "/login.html";
      return;
    }

    buyerState.user = JSON.parse(userRaw);

    await loadBuyerDashboard(buyerState.user);

    renderBuyerHero();
    renderBuyerChips();
    renderBuyerGhostActions();
    renderBuyerCards();
    renderBuyerBurgerMenu();
  } catch (err) {
    console.error("Buyer dashboard init failed", err);
  } finally {
    hideBuyerLoader();
  }
}

// ============================================================
// LOAD DASHBOARD DATA
// ============================================================
async function loadBuyerDashboard(user) {
  try {
    const res = await apiGet("/api/buyer/dashboard", user);
    if (!res?.success) {
      console.error("Buyer dashboard load failed", res?.error);
      return;
    }

    const data = res.data || {};

    buyerState.buyer = data.buyer || null;
    buyerState.tickets = Array.isArray(data.tickets) ? data.tickets : [];
    buyerState.favorites = Array.isArray(data.favorites) ? data.favorites : [];
    buyerState.feedItems = Array.isArray(data.feed) ? data.feed : [];

    buyerState.analyticsChips = [
      { label: "Tickets", value: buyerState.tickets.length, link: "#buyer-tickets" },
      { label: "Favorites", value: buyerState.favorites.length, link: "#buyer-favorites" },
      { label: "Feed", value: buyerState.feedItems.length, link: "#buyer-feed" }
    ];

    buyerState.actions = [
      { id: "browse-shows", label: "Browse Shows", icon: "🎟️" },
      { id: "open-feed", label: "Open Feed", icon: "📺" },
      { id: "edit-profile", label: "Edit Profile", icon: "🖊️" }
    ];
  } catch (err) {
    console.error("Buyer dashboard load error", err);
  }
}

// ============================================================
// RENDER HERO
// ============================================================
function renderBuyerHero() {
  const nameEl = $bu("buyer-hero-name");
  const subtitleEl = $bu("buyer-hero-subtitle");

  if (nameEl) {
    nameEl.textContent =
      buyerState.buyer?.display_name ||
      buyerState.buyer?.name ||
      "Buyer";
  }

  if (subtitleEl) {
    subtitleEl.textContent = "Roll Show Audience";
  }
}

// ============================================================
// RENDER CHIPS
// ============================================================
function renderBuyerChips() {
  const container = $bu("buyer-analytics-chips");
  if (!container) return;

  container.innerHTML = "";
  buyerState.analyticsChips.forEach((chip) => {
    const btn = document.createElement("button");
    btn.className = "rs-chip rs-chip-ghost";
    btn.textContent = `${chip.label}: ${chip.value}`;
    btn.addEventListener("click", () => {
      if (chip.link.startsWith("#")) {
        const target = document.querySelector(chip.link);
        if (target) target.scrollIntoView({ behavior: "smooth" });
      } else {
        window.location.href = chip.link;
      }
    });
    container.appendChild(btn);
  });
}

// ============================================================
// RENDER GHOST ACTIONS
// ============================================================
function renderBuyerGhostActions() {
  const container = $bu("buyer-ghost-actions");
  if (!container) return;

  container.innerHTML = "";
  buyerState.actions.forEach((action) => {
    const btn = document.createElement("button");
    btn.className = "rs-ghost-button";
    btn.dataset.actionId = action.id;
    btn.innerHTML = `
      <span class="rs-ghost-icon">${action.icon}</span>
      <span>${action.label}</span>
    `;
    btn.addEventListener("click", () => handleBuyerAction(action.id));
    container.appendChild(btn);
  });
}

// ============================================================
// RENDER CARDS
// ============================================================
function renderBuyerCards() {
  renderBuyerTickets();
  renderBuyerFavorites();
  renderBuyerFeed();
}

// ============================================================
// TICKETS
// ============================================================
function renderBuyerTickets() {
  const container = $bu("buyer-tickets-cards");
  if (!container) return;

  container.innerHTML = "";
  if (!buyerState.tickets.length) {
    container.innerHTML = `<div class="rs-card rs-card-empty">No tickets yet.</div>`;
    return;
  }

  buyerState.tickets.forEach((t) => {
    const card = document.createElement("div");
    card.className = "rs-card rs-card-ticket";
    card.innerHTML = `
      <div class="rs-card-title">${t.show_title || "Ticket"}</div>
      <div class="rs-card-meta">
        <span>${t.date || ""}</span>
        <span>${t.venue_name || ""}</span>
      </div>
    `;
    container.appendChild(card);
  });
}

// ============================================================
// FAVORITES
// ============================================================
function renderBuyerFavorites() {
  const container = $bu("buyer-favorites-cards");
  if (!container) return;

  container.innerHTML = "";
  if (!buyerState.favorites.length) {
    container.innerHTML = `<div class="rs-card rs-card-empty">No favorites yet.</div>`;
    return;
  }

  buyerState.favorites.forEach((f) => {
    const card = document.createElement("div");
    card.className = "rs-card rs-card-favorite";
    card.innerHTML = `
      <div class="rs-card-title">${f.title || "Favorite"}</div>
      <div class="rs-card-meta">
        <span>${f.type || ""}</span>
      </div>
    `;
    container.appendChild(card);
  });
}

// ============================================================
// FEED
// ============================================================
function renderBuyerFeed() {
  const container = $bu("buyer-feed-cards");
  if (!container) return;

  container.innerHTML = "";
  if (!buyerState.feedItems.length) {
    container.innerHTML = `<div class="rs-card rs-card-empty">Your feed is quiet. Follow more skaters and shows.</div>`;
    return;
  }

  buyerState.feedItems.forEach((item) => {
    const card = document.createElement("div");
    card.className = "rs-card rs-card-feed";
    card.innerHTML = `
      <div class="rs-card-title">${item.author_name || "Post"}</div>
      <div class="rs-card-meta">
        <span>${item.content || ""}</span>
      </div>
    `;
    container.appendChild(card);
  });
}

// ============================================================
// BURGER MENU
// ============================================================
function renderBuyerBurgerMenu() {
  const menu = $bu("rs-burger-menu");
  if (!menu) return;

  const items = [
    { label: "Owner Dashboard", link: "/owner.html" },
    { label: "Skater Dashboard", link: "/skater.html" },
    { label: "Business Dashboard", link: "/business.html" },
    { label: "Musician Dashboard", link: "/musician.html" },
    { label: "Buyer Dashboard", link: "/buyer.html" }
  ];

  menu.innerHTML = "";
  items.forEach((item) => {
    const li = document.createElement("button");
    li.className = "rs-burger-item";
    li.textContent = item.label;
    li.addEventListener("click", () => {
      window.location.href = item.link;
    });
    menu.appendChild(li);
  });
}

// ============================================================
// ACTION HANDLER
// ============================================================
function handleBuyerAction(id) {
  switch (id) {
    case "browse-shows":
      window.location.href = "/shows.html";
      break;
    case "open-feed":
      window.location.href = "/feed.html";
      break;
    case "edit-profile":
      window.location.href = "/buyer-profile.html";
      break;
    default:
      console.log("Unhandled buyer action:", id);
  }
}

// ============================================================
// DOM READY
// ============================================================
document.addEventListener("DOMContentLoaded", () => {
  initBuyerDashboard();
});
