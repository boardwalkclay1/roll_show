// CONFIG
const API_BASE = "https://rollshow.boardwalkclay1.workers.dev";

// USER STORAGE
function saveUser(user) {
  localStorage.setItem("rollshow_user", JSON.stringify(user));
}

function getUser() {
  const raw = localStorage.getItem("rollshow_user");
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

function logout() {
  localStorage.removeItem("rollshow_user");
  window.location.href = "/pages/auth-login.html";
}

function requireUser(roles = null) {
  const user = getUser();
  if (!user) {
    window.location.href = "/pages/auth-login.html";
    return null;
  }
  if (roles && !roles.includes(user.role)) {
    alert("You do not have access to this page.");
    window.location.href = "/index.html";
    return null;
  }
  return user;
}

// Attach logout
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".logout-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      logout();
    });
  });
});

// AUTH
document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm");
  const signupForm = document.getElementById("signupForm");

  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const email = document.getElementById("loginEmail").value;
      const password = document.getElementById("loginPassword").value;

      const res = await fetch(`${API_BASE}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (!data.success) {
        alert("Login failed: " + data.error);
        return;
      }

      saveUser(data.user);

      if (data.user.role === "skater") {
        window.location.href = "/pages/skater-dashboard.html";
      } else {
        window.location.href = "/index.html";
      }
    });
  }

  if (signupForm) {
    signupForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const name = document.getElementById("signupName").value;
      const email = document.getElementById("signupEmail").value;
      const password = document.getElementById("signupPassword").value;
      const role = document.getElementById("signupRole").value;

      const res = await fetch(`${API_BASE}/api/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role })
      });

      const data = await res.json();

      if (!data.success) {
        alert("Signup failed: " + data.error);
        return;
      }

      alert("Account created! Please log in.");
      window.location.href = "/pages/auth-login.html";
    });
  }
});

// HOMEPAGE SHOWS
document.addEventListener("DOMContentLoaded", () => {
  const featured = document.getElementById("featuredShows");
  const grid = document.getElementById("showGrid");

  if (!featured && !grid) return;

  fetch(`${API_BASE}/api/shows`)
    .then(res => res.json())
    .then(shows => {
      if (!Array.isArray(shows) || shows.length === 0) {
        if (featured) featured.innerHTML = "<p>No shows yet.</p>";
        if (grid) grid.innerHTML = "<p>No shows yet.</p>";
        return;
      }

      if (featured) {
        featured.innerHTML = "";
        shows.slice(0, 3).forEach(show => {
          featured.innerHTML += `
            <div class="show-card">
              <img src="${show.thumbnail}" class="thumb">
              <h3>${show.title}</h3>
              <p>${(show.description || "").slice(0, 80)}...</p>
              <button onclick="viewShow('${show.id}')">View Show</button>
            </div>
          `;
        });
      }

      if (grid) {
        grid.innerHTML = "";
        shows.forEach(show => {
          grid.innerHTML += `
            <div class="show-card">
              <img src="${show.thumbnail}" class="thumb">
              <h3>${show.title}</h3>
              <p>${(show.description || "").slice(0, 80)}...</p>
              <button onclick="viewShow('${show.id}')">View Show</button>
            </div>
          `;
        });
      }
    });
});

function viewShow(id) {
  window.location.href = `/pages/show.html?id=${encodeURIComponent(id)}`;
}

// SHOW PAGE
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

  fetch(`${API_BASE}/api/shows/${showId}`)
    .then(res => res.json())
    .then(show => {
      header.innerHTML = `
        <h1>${show.title}</h1>
        <p>${show.description || ""}</p>
      `;

      preview.innerHTML = `
        <img src="${show.thumbnail}" class="video-thumb">
      `;

      priceDisplay.textContent = `$${(show.price_cents / 100).toFixed(2)}`;
      desc.textContent = show.description || "";
    });

  if (buyBtn) {
    buyBtn.addEventListener("click", async () => {
      const user = requireUser(["buyer", "skater"]);
      if (!user) return;

      const res = await fetch(`${API_BASE}/api/tickets/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-buyer-id": user.id
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

// TICKET WALLET
document.addEventListener("DOMContentLoaded", () => {
  const wallet = document.getElementById("ticketWalletList");
  if (!wallet) return;

  const user = requireUser(["buyer", "skater"]);
  if (!user) return;

  fetch(`${API_BASE}/api/tickets`, {
    headers: { "x-buyer-id": user.id }
  })
    .then(res => res.json())
    .then(tickets => {
      if (!tickets.length) {
        wallet.innerHTML = "<p>No tickets yet.</p>";
        return;
      }

      wallet.innerHTML = "";
      tickets.forEach(t => {
        wallet.innerHTML += `
          <div class="ticket-card">
            <h3>${t.title}</h3>
            <p>Premiere: ${t.premiere_date}</p>
            <p>QR: ${t.qr_code}</p>
            <button onclick="viewTicket('${t.id}')">View Ticket</button>
          </div>
        `;
      });
    });
});

function viewTicket(id) {
  window.location.href = `/pages/ticket-view.html?id=${id}`;
}

// PURCHASE HISTORY
document.addEventListener("DOMContentLoaded", () => {
  const history = document.getElementById("purchaseHistoryList");
  if (!history) return;

  const user = requireUser(["buyer", "skater"]);
  if (!user) return;

  fetch(`${API_BASE}/api/purchases`, {
    headers: { "x-buyer-id": user.id }
  })
    .then(res => res.json())
    .then(rows => {
      if (!rows.length) {
        history.innerHTML = "<p>No purchases yet.</p>";
        return;
      }

      history.innerHTML = "";
      rows.forEach(p => {
        history.innerHTML += `
          <div class="purchase-item">
            <h3>${p.title}</h3>
            <p>Amount: $${(p.amount_cents / 100).toFixed(2)}</p>
            <p>Date: ${new Date(p.created_at).toLocaleString()}</p>
            <p>Transaction: ${p.partner_transaction_id}</p>
          </div>
        `;
      });
    });
});
