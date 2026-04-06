// ============================================================
// CONFIG
// ============================================================
const API_BASE = "https://rollshow.boardwalkclay1.workers.dev";

// ============================================================
// API CLIENT
// ============================================================
const API = {
  async get(path) {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" }
    });
    return res.json();
  },

  async post(path, body) {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    return res.json();
  }
};

// ============================================================
// USER SESSION STORAGE
// ============================================================
function saveUser(user) {
  localStorage.setItem("user", JSON.stringify(user));
}

function getUser() {
  try {
    return JSON.parse(localStorage.getItem("user"));
  } catch {
    return null;
  }
}

function logout() {
  localStorage.removeItem("user");
  window.location.href = "/pages/auth-login.html";
}

// ============================================================
// ROLE GUARD (NEW, CLEAN, OWNER-SAFE)
// ============================================================
function requireUser(roles = null) {
  const user = getUser();

  // No session → login
  if (!user) {
    window.location.href = "/pages/auth-login.html";
    return null;
  }

  // OWNER BYPASS — owner can access everything
  if (user.role === "owner" || user.is_owner === true) {
    return user;
  }

  // Normal role check
  if (roles && !roles.includes(user.role)) {
    window.location.href = "/index.html";
    return null;
  }

  return user;
}

// ============================================================
// ATTACH LOGOUT BUTTONS
// ============================================================
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".logout-btn").forEach(btn => {
    btn.addEventListener("click", e => {
      e.preventDefault();
      logout();
    });
  });
});

// ============================================================
// LOGIN HANDLER
// ============================================================
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("auth-login-form");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const fd = new FormData(form);
    const payload = {
      email: fd.get("email"),
      password: fd.get("password")
    };

    let res;
    try {
      res = await API.post("/api/login", payload);
    } catch {
      alert("Network error. Try again.");
      return;
    }

    if (!res || !res.success || !res.user) {
      alert(res?.error?.message || "Login failed.");
      return;
    }

    const user = res.user;

    // Clean session object
    const session = {
      id: user.id,
      role: user.role,
      is_owner: !!user.is_owner
    };

    saveUser(session);

    // Redirect logic
    if (session.is_owner) {
      window.location.href = "/pages/owner/owner-dashboard.html";
      return;
    }

    switch (session.role) {
      case "skater":
        window.location.href = "/pages/skater/skater-dashboard.html";
        break;
      case "musician":
        window.location.href = "/pages/musician/musician-dashboard.html";
        break;
      case "business":
        window.location.href = "/pages/business/business-dashboard.html";
        break;
      case "buyer":
        window.location.href = "/pages/buyer/buyer-dashboard.html";
        break;
      default:
        window.location.href = "/";
    }
  });
});

// ============================================================
// HOMEPAGE SHOWS
// ============================================================
document.addEventListener("DOMContentLoaded", () => {
  const featured = document.getElementById("featuredShows");
  const grid = document.getElementById("showGrid");

  if (!featured && !grid) return;

  API.get("/api/shows")
    .then(shows => {
      if (!Array.isArray(shows) || shows.length === 0) {
        if (featured) featured.innerHTML = "<p>No shows yet.</p>";
        if (grid) grid.innerHTML = "<p>No shows yet.</p>";
        return;
      }

      if (featured) {
        featured.innerHTML = shows.slice(0, 3).map(showCard).join("");
      }

      if (grid) {
        grid.innerHTML = shows.map(showCard).join("");
      }
    })
    .catch(() => {
      if (featured) featured.innerHTML = "<p>Error loading shows.</p>";
      if (grid) grid.innerHTML = "<p>Error loading shows.</p>";
    });
});

function showCard(show) {
  return `
    <div class="show-card">
      <img src="${show.thumbnail}" class="thumb">
      <h3>${show.title}</h3>
      <p>${(show.description || "").slice(0, 80)}...</p>
      <button onclick="viewShow('${show.id}')">View Show</button>
    </div>
  `;
}

function viewShow(id) {
  window.location.href = `/pages/show.html?id=${encodeURIComponent(id)}`;
}

// ============================================================
// SHOW PAGE
// ============================================================
document.addEventListener("DOMContentLoaded", () => {
  const header = document.getElementById("showHeader");
  const preview = document.getElementById("showVideoPreview");
  const priceDisplay = document.getElementById("ticketPriceDisplay");
  const desc = document.getElementById("showDescriptionText");
  const buyBtn = document.getElementById("buyTicketBtn");

  if (!header && !buyBtn) return;

  const url = new URL(window.location.href);
  const showId = url.searchParams.get("id");
  if (!showId) return;

  API.get(`/api/shows/${showId}`)
    .then(show => {
      if (!show) return;

      if (header) {
        header.innerHTML = `
          <h1>${show.title}</h1>
          <p>${show.description || ""}</p>
        `;
      }

      if (preview) {
        preview.innerHTML = `<img src="${show.thumbnail}" class="video-thumb">`;
      }

      if (priceDisplay) {
        priceDisplay.textContent = `$${(show.price_cents / 100).toFixed(2)}`;
      }

      if (desc) {
        desc.textContent = show.description || "";
      }
    });

  if (buyBtn) {
    buyBtn.addEventListener("click", async () => {
      const user = requireUser(["buyer"]);
      if (!user) return;

      const res = await fetch(`${API_BASE}/api/buyer/tickets/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user.id
        },
        body: JSON.stringify({ showId })
      });

      const data = await res.json();

      if (!data.ticketId) {
        alert("Error creating ticket.");
        return;
      }

      window.location.href = `/pages/ticket-confirmation.html?ticket=${data.ticketId}`;
    });
  }
});

// ============================================================
// TICKET WALLET
// ============================================================
document.addEventListener("DOMContentLoaded", () => {
  const wallet = document.getElementById("ticketWalletList");
  if (!wallet) return;

  const user = requireUser(["buyer"]);
  if (!user) return;

  fetch(`${API_BASE}/api/buyer/tickets`, {
    headers: { "x-user-id": user.id }
  })
    .then(res => res.json())
    .then(tickets => {
      if (!tickets || !tickets.length) {
        wallet.innerHTML = "<p>No tickets yet.</p>";
        return;
      }

      wallet.innerHTML = tickets.map(t => `
        <div class="ticket-card">
          <h3>${t.title}</h3>
          <p>Premiere: ${t.premiere_date}</p>
          <p>QR: ${t.qr_code}</p>
          <button onclick="viewTicket('${t.id}')">View Ticket</button>
        </div>
      `).join("");
    })
    .catch(() => {
      wallet.innerHTML = "<p>Error loading tickets.</p>";
    });
});

function viewTicket(id) {
  window.location.href = `/pages/ticket-view.html?id=${encodeURIComponent(id)}`;
}

// ============================================================
// PURCHASE HISTORY
// ============================================================
document.addEventListener("DOMContentLoaded", () => {
  const history = document.getElementById("purchaseHistoryList");
  if (!history) return;

  const user = requireUser(["buyer"]);
  if (!user) return;

  fetch(`${API_BASE}/api/buyer/purchases`, {
    headers: { "x-user-id": user.id }
  })
    .then(res => res.json())
    .then(rows => {
      if (!rows || !rows.length) {
        history.innerHTML = "<p>No purchases yet.</p>";
        return;
      }

      history.innerHTML = rows.map(p => `
        <div class="purchase-item">
          <h3>${p.title}</h3>
          <p>Amount: $${(p.amount_cents / 100).toFixed(2)}</p>
          <p>Date: ${new Date(p.created_at).toLocaleString()}</p>
          <p>Transaction: ${p.partner_transaction_id}</p>
        </div>
      `).join("");
    })
    .catch(() => {
      history.innerHTML = "<p>Error loading purchases.</p>";
    });
});
