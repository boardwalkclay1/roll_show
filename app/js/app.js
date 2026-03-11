// =============================
// CONFIG — POINT FRONTEND TO WORKER API
// =============================
const API_BASE = "https://roll-worker.boardwalkclay1.workers.dev"; 
// Replace <YOUR-WORKER-SUBDOMAIN> with your actual Worker domain


// =============================
// GLOBAL HELPERS
// =============================
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
  window.location.href = "/auth-login.html";
}

function requireUser(roles = null) {
  const user = getUser();
  if (!user) {
    window.location.href = "/auth-login.html";
    return null;
  }
  if (roles && !roles.includes(user.role)) {
    alert("You do not have access to this page.");
    window.location.href = "/index.html";
    return null;
  }
  return user;
}

// Attach logout to any .logout-btn
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".logout-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      logout();
    });
  });
});


// =============================
// AUTH PAGES (LOGIN + SIGNUP)
// =============================
document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm");
  const signupForm = document.getElementById("signupForm");

  // LOGIN
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

      let data;
      try { data = await res.json(); }
      catch { return alert("Server error. Try again."); }

      if (!data.success) {
        alert("Login failed: " + data.error);
        return;
      }

      saveUser(data.user);

      if (data.user.role === "skater") {
        window.location.href = "/create-show.html";
      } else {
        window.location.href = "/index.html";
      }
    });
  }

  // SIGNUP
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

      let data;
      try { data = await res.json(); }
      catch { return alert("Server error. Try again."); }

      if (!data.success) {
        alert("Signup failed: " + data.error);
        return;
      }

      alert("Account created! Please log in.");
      window.location.href = "/auth-login.html";
    });
  }
});


// =============================
// HOMEPAGE — LIST SHOWS
// =============================
document.addEventListener("DOMContentLoaded", () => {
  const showsContainer = document.getElementById("showsList");
  if (!showsContainer) return;

  fetch(`${API_BASE}/api/get-shows`)
    .then(res => res.json())
    .then(shows => {
      if (!Array.isArray(shows) || shows.length === 0) {
        showsContainer.innerHTML = "<p>No shows yet.</p>";
        return;
      }

      showsContainer.innerHTML = "";
      shows.forEach(show => {
        const card = document.createElement("div");
        card.className = "show-card";
        card.innerHTML = `
          <h3>${show.title}</h3>
          <p>${show.tagline || ""}</p>
          <p><strong>Discipline:</strong> ${show.discipline || "N/A"}</p>
          <p><strong>Price:</strong> $${show.price?.toFixed ? show.price.toFixed(2) : show.price}</p>
          <button data-show-id="${show.id}" class="view-show-btn">View Show</button>
        `;
        showsContainer.appendChild(card);
      });

      showsContainer.addEventListener("click", (e) => {
        const btn = e.target.closest(".view-show-btn");
        if (!btn) return;
        const showId = btn.getAttribute("data-show-id");
        window.location.href = `/show-page.html?id=${encodeURIComponent(showId)}`;
      });
    })
    .catch(() => {
      showsContainer.innerHTML = "<p>Error loading shows.</p>";
    });
});


// =============================
// CREATE SHOW PAGE
// =============================
document.addEventListener("DOMContentLoaded", () => {
  const createShowForm = document.getElementById("createShowForm");
  if (!createShowForm) return;

  const user = requireUser(["skater"]);
  if (!user) return;

  createShowForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const title = document.getElementById("showTitle").value;
    const tagline = document.getElementById("showTagline").value;
    const description = document.getElementById("showDescription").value;
    const discipline = document.getElementById("showDiscipline").value;
    const price = parseFloat(document.getElementById("showPrice").value);
    const premiereDate = document.getElementById("showPremiereDate").value;
    const videoSource = document.getElementById("showVideoSource").value;

    const res = await fetch(`${API_BASE}/api/create-show`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        skater_id: user.id,
        title,
        tagline,
        description,
        discipline,
        price,
        premiereDate,
        videoSource
      })
    });

    let data;
    try { data = await res.json(); }
    catch { return alert("Server error. Try again."); }

    if (data.success) {
      alert("Show created!");
      window.location.href = `/show-page.html?id=${encodeURIComponent(data.id)}`;
    } else {
      alert("Failed to create show: " + (data.error || "Unknown error"));
    }
  });
});


// =============================
// SHOW PAGE — BUY TICKET
// =============================
document.addEventListener("DOMContentLoaded", () => {
  const buyTicketBtn = document.getElementById("buyTicketBtn");
  const showMeta = document.getElementById("showMeta");
  if (!buyTicketBtn && !showMeta) return;

  const url = new URL(window.location.href);
  const showId = url.searchParams.get("id");
  if (!showId) return;

  // Load show details
  if (showMeta) {
    fetch(`${API_BASE}/api/get-shows`)
      .then(res => res.json())
      .then(shows => {
        const show = Array.isArray(shows)
          ? shows.find(s => s.id === showId)
          : null;

        if (!show) {
          showMeta.innerHTML = "<p>Show not found.</p>";
          return;
        }

        showMeta.innerHTML = `
          <h1>${show.title}</h1>
          <p>${show.tagline || ""}</p>
          <p>${show.description || ""}</p>
          <p><strong>Discipline:</strong> ${show.discipline || "N/A"}</p>
          <p><strong>Price:</strong> $${show.price?.toFixed ? show.price.toFixed(2) : show.price}</p>
        `;
      })
      .catch(() => {
        showMeta.innerHTML = "<p>Error loading show.</p>";
      });
  }

  // Buy ticket
  if (buyTicketBtn) {
    buyTicketBtn.addEventListener("click", async () => {
      const user = requireUser(["buyer", "skater"]);
      if (!user) return;

      const res = await fetch(`${API_BASE}/api/buy-ticket`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          show_id: showId,
          buyer_id: user.id
        })
      });

      let data;
      try { data = await res.json(); }
      catch { return alert("Server error. Try again."); }

      if (data.success) {
        alert("Ticket purchased! Ticket ID: " + data.ticket_id);
      } else {
        alert("Failed to buy ticket: " + (data.error || "Unknown error"));
      }
    });
  }
});


// =============================
// ROLE-BASED ELEMENT HIDING
// =============================
document.addEventListener("DOMContentLoaded", () => {
  const user = getUser();
  document.querySelectorAll("[data-require-role]").forEach(el => {
    const needed = el.getAttribute("data-require-role");
    if (!user || user.role !== needed) {
      el.style.display = "none";
    }
  });
});
