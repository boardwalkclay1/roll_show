// /app/js/app.js — Single-file app client (Worker-first, minimal, robust)

// ============================================================
// CONFIG
// ============================================================
const API_BASE = "https://rollshow.boardwalkclay1.workers.dev";

// ============================================================
// SIMPLE API HELPERS (prefer global API if present)
// ============================================================
async function apiRequest(method, path, body = null, headers = {}) {
  // Prefer global API if available
  if (typeof window.API !== "undefined" && window.API && typeof window.API.post === "function") {
    try {
      if (method === "GET") return await window.API.get(path, headers);
      if (method === "POST") return await window.API.post(path, body, headers);
      if (method === "PUT") return await window.API.put(path, body, headers);
      if (method === "DELETE") return await window.API.delete(path, headers);
    } catch {
      // fall back to fetch
    }
  }

  const url = `${API_BASE}${path}`;
  const opts = { method, headers: { ...headers }, credentials: "same-origin" };

  if (body && !(body instanceof FormData) && !(body instanceof Blob)) {
    opts.headers["Content-Type"] = "application/json";
    opts.body = JSON.stringify(body);
  } else if (body instanceof FormData || body instanceof Blob) {
    opts.body = body;
  }

  const res = await fetch(url, opts);
  const text = await res.text().catch(() => null);
  const contentType = (res.headers.get("content-type") || "").toLowerCase();

  if (!contentType.includes("application/json")) {
    return { success: false, status: res.status, data: null, error: { message: "Non-JSON response" } };
  }

  try {
    const parsed = JSON.parse(text);
    return parsed;
  } catch {
    return { success: false, status: res.status, data: null, error: { message: "Invalid JSON" } };
  }
}

const API = {
  get(path, headers = {}) { return apiRequest("GET", path, null, headers); },
  post(path, body, headers = {}) { return apiRequest("POST", path, body, headers); },
  put(path, body, headers = {}) { return apiRequest("PUT", path, body, headers); },
  delete(path, headers = {}) { return apiRequest("DELETE", path, null, headers); },
  withUser(user) {
    if (!user) return {};
    return { "x-user-id": user.id, "x-user-role": user.role };
  }
};

// ============================================================
// SESSION STORAGE
// ============================================================
function saveUser(user) {
  try { localStorage.setItem("user", JSON.stringify(user)); } catch {}
}

function getUser() {
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function logout() {
  try { localStorage.removeItem("user"); } catch {}
  window.location.href = "/pages/auth-login.html";
}

// ============================================================
// ROLE GUARD
// ============================================================
function requireUser(roles = null) {
  const user = getUser();
  if (!user) {
    window.location.href = "/pages/auth-login.html";
    return null;
  }
  if (user.role === "owner" || user.is_owner === true) return user;
  if (roles && !roles.includes(user.role)) {
    window.location.href = "/index.html";
    return null;
  }
  return user;
}

// ============================================================
// DOM READY
// ============================================================
function onReady(fn) {
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn);
  else fn();
}

// Attach logout buttons
onReady(() => {
  document.querySelectorAll(".logout-btn").forEach(btn => {
    btn.addEventListener("click", (e) => { e.preventDefault(); logout(); });
  });
});

// ============================================================
// LOGIN FORM
// ============================================================
onReady(() => {
  const form = document.getElementById("auth-login-form");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;

    try {
      const fd = new FormData(form);
      const emailRaw = (fd.get("email") || "").toString().trim();
      const password = (fd.get("password") || "").toString();

      if (!emailRaw || !password) {
        alert("Please enter both email and password.");
        return;
      }

      const payload = { email: emailRaw.toLowerCase(), password };
      const res = await API.post("/api/login", payload);

      if (!res || res.success !== true || !res.user) {
        alert(res?.message || res?.error?.message || "Login failed.");
        return;
      }

      const user = res.user;
      const session = {
        id: user.id,
        role: user.role || "user",
        is_owner: !!user.is_owner,
        email: user.email || payload.email
      };

      saveUser(session);

      if (session.is_owner) {
        window.location.href = "/pages/owner/owner-dashboard.html";
        return;
      }

      switch (session.role) {
        case "skater": window.location.href = "/pages/skater/skater-dashboard.html"; break;
        case "musician": window.location.href = "/pages/musician/musician-dashboard.html"; break;
        case "business": window.location.href = "/pages/business/business-dashboard.html"; break;
        case "buyer": window.location.href = "/pages/buyer/buyer-dashboard.html"; break;
        default: window.location.href = "/";
      }
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });
});

// ============================================================
// HOMEPAGE SHOWS
// ============================================================
onReady(() => {
  const featured = document.getElementById("featuredShows");
  const grid = document.getElementById("showGrid");
  if (!featured && !grid) return;

  (async () => {
    try {
      const res = await API.get("/api/shows");
      const shows = (res && res.success === true) ? (res.data || []) : (Array.isArray(res) ? res : (res.data || []));
      if (!Array.isArray(shows) || shows.length === 0) {
        if (featured) featured.innerHTML = "<p>No shows yet.</p>";
        if (grid) grid.innerHTML = "<p>No shows yet.</p>";
        return;
      }
      if (featured) featured.innerHTML = shows.slice(0, 3).map(showCard).join("");
      if (grid) grid.innerHTML = shows.map(showCard).join("");
    } catch {
      if (featured) featured.innerHTML = "<p>Error loading shows.</p>";
      if (grid) grid.innerHTML = "<p>Error loading shows.</p>";
    }
  })();
});

// ============================================================
// SHOW PAGE
// ============================================================
onReady(() => {
  const header = document.getElementById("showHeader");
  const preview = document.getElementById("showVideoPreview");
  const priceDisplay = document.getElementById("ticketPriceDisplay");
  const desc = document.getElementById("showDescriptionText");
  const buyBtn = document.getElementById("buyTicketBtn");

  if (!header && !buyBtn && !preview && !priceDisplay && !desc) return;

  (async () => {
    const url = new URL(window.location.href);
    const showId = url.searchParams.get("id");
    if (!showId) return;

    try {
      const res = await API.get(`/api/shows/${encodeURIComponent(showId)}`);
      const show = (res && res.success === true) ? (res.data || null) : res;
      if (!show) return;

      if (header) header.innerHTML = `<h1>${escapeHtml(show.title)}</h1><p>${escapeHtml(show.description || "")}</p>`;
      if (preview) preview.innerHTML = `<img src="${escapeAttr(show.thumbnail)}" class="video-thumb" alt="${escapeAttr(show.title || 'preview')}">`;
      if (priceDisplay) priceDisplay.textContent = `$${(Number(show.price_cents || 0) / 100).toFixed(2)}`;
      if (desc) desc.textContent = show.description || "";
    } catch {}
  })();

  if (buyBtn) {
    buyBtn.addEventListener("click", async () => {
      const user = requireUser(["buyer"]);
      if (!user) return;

      try {
        const headers = API.withUser(user);
        const res = await API.post("/api/buyer/tickets", { show_id: new URL(window.location.href).searchParams.get("id") }, headers);
        const ticketId = (res && res.success === true) ? (res.data && res.data.ticketId) : (res && res.ticketId);

        if (!ticketId) {
          alert(res?.message || "Error creating ticket.");
          return;
        }

        window.location.href = `/pages/ticket-confirmation.html?ticket=${encodeURIComponent(ticketId)}`;
      } catch {
        alert("Network error creating ticket.");
      }
    });
  }
});

// ============================================================
// TICKET WALLET
// ============================================================
onReady(() => {
  const wallet = document.getElementById("ticketWalletList");
  if (!wallet) return;

  const user = requireUser(["buyer"]);
  if (!user) return;

  (async () => {
    try {
      const headers = API.withUser(user);
      const res = await API.get("/api/buyer/tickets", headers);
      const tickets = (res && res.success === true) ? (res.data || []) : res;

      if (!Array.isArray(tickets) || tickets.length === 0) {
        wallet.innerHTML = "<p>No tickets yet.</p>";
        return;
      }

      wallet.innerHTML = tickets.map(t => `
        <div class="ticket-card">
          <h3>${escapeHtml(t.title)}</h3>
          <p>Premiere: ${escapeHtml(t.premiere_date)}</p>
          <p>QR: ${escapeHtml(t.qr_code)}</p>
          <button onclick="viewTicket('${encodeURIComponent(t.id)}')">View Ticket</button>
        </div>
      `).join("");
    } catch {
      wallet.innerHTML = "<p>Error loading tickets.</p>";
    }
  })();
});

// ============================================================
// PURCHASE HISTORY
// ============================================================
onReady(() => {
  const history = document.getElementById("purchaseHistoryList");
  if (!history) return;

  const user = requireUser(["buyer"]);
  if (!user) return;

  (async () => {
    try {
      const headers = API.withUser(user);
      const res = await API.get("/api/buyer/purchases", headers);
      const rows = (res && res.success === true) ? (res.data || []) : res;

      if (!Array.isArray(rows) || rows.length === 0) {
        history.innerHTML = "<p>No purchases yet.</p>";
        return;
      }

      history.innerHTML = rows.map(p => `
        <div class="purchase-item">
          <h3>${escapeHtml(p.title)}</h3>
          <p>Amount: $${(Number(p.amount_cents || 0) / 100).toFixed(2)}</p>
          <p>Date: ${new Date(p.created_at).toLocaleString()}</p>
          <p>Transaction: ${escapeHtml(p.partner_transaction_id || '')}</p>
        </div>
      `).join("");
    } catch {
      history.innerHTML = "<p>Error loading purchases.</p>";
    }
  })();
});

// ============================================================
// NAV HELPERS
// ============================================================
function viewTicket(id) { window.location.href = `/pages/ticket-view.html?id=${encodeURIComponent(id)}`; }
function viewShow(id) { window.location.href = `/pages/show.html?id=${encodeURIComponent(id)}`; }

// ============================================================
// SAFETY HELPERS
// ============================================================
function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttr(str) {
  return escapeHtml(str).replaceAll("\n", " ");
}
