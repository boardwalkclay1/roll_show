// =============================
// GLOBAL STATE HELPERS
// =============================
function getCurrentUser() {
  const raw = localStorage.getItem("rollshow_user");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function requireUser(roles = null) {
  const user = getCurrentUser();
  if (!user) {
    window.location.href = "/auth.html";
    return null;
  }
  if (roles && !roles.includes(user.role)) {
    alert("You do not have access to this page.");
    window.location.href = "/index.html";
    return null;
  }
  return user;
}

function logout() {
  localStorage.removeItem("rollshow_user");
  window.location.href = "/auth.html";
}

// Attach logout to any .logout-btn if present
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".logout-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      logout();
    });
  });
});

// =============================
// AUTH PAGE (auth.html)
// =============================
document.addEventListener("DOMContentLoaded", () => {
  const signupForm = document.getElementById("signupForm");
  const loginForm = document.getElementById("loginForm");

  // SIGNUP
  if (signupForm) {
    signupForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const signupName = document.getElementById("signupName");
      const signupEmail = document.getElementById("signupEmail");
      const signupPassword = document.getElementById("signupPassword");
      const signupRole = document.getElementById("signupRole");

      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: signupName.value,
          email: signupEmail.value,
          password: signupPassword.value,
          role: signupRole.value
        })
      });

      const data = await res.json();

      if (data.success) {
        alert("Account created! You can now log in.");
        signupForm.reset();
      } else {
        alert("Signup failed: " + (data.error || "Unknown error"));
      }
    });
  }

  // LOGIN
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const loginEmail = document.getElementById("loginEmail");
      const loginPassword = document.getElementById("loginPassword");

      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: loginEmail.value,
          password: loginPassword.value
        })
      });

      const data = await res.json();

      if (!data.success) {
        alert("Login failed: " + (data.error || "Unknown error"));
        return;
      }

      // Save user locally
      localStorage.setItem("rollshow_user", JSON.stringify(data.user));

      // Redirect based on role
      if (data.user.role === "skater") {
        window.location.href = "/create-show.html";
      } else {
        window.location.href = "/index.html";
      }
    });
  }
});

// =============================
// HOMEPAGE (index.html) — LIST SHOWS
// =============================
document.addEventListener("DOMContentLoaded", () => {
  const showsContainer = document.getElementById("showsList");
  if (!showsContainer) return;

  fetch("/api/get-shows")
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
    .catch(err => {
      console.error(err);
      showsContainer.innerHTML = "<p>Error loading shows.</p>";
    });
});

// =============================
// CREATE SHOW PAGE (create-show.html)
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

    const res = await fetch("/api/create-show", {
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

    const data = await res.json();

    if (data.success) {
      alert("Show created!");
      window.location.href = `/show-page.html?id=${encodeURIComponent(data.id)}`;
    } else {
      alert("Failed to create show: " + (data.error || "Unknown error"));
    }
  });
});

// =============================
// SHOW PAGE (show-page.html) — BUY TICKET
// =============================
document.addEventListener("DOMContentLoaded", () => {
  const buyTicketBtn = document.getElementById("buyTicketBtn");
  const showMeta = document.getElementById("showMeta");
  if (!buyTicketBtn && !showMeta) return;

  const url = new URL(window.location.href);
  const showId = url.searchParams.get("id");
  if (!showId) return;

  // Load show details (reuse /api/get-shows and filter client-side for now)
  if (showMeta) {
    fetch("/api/get-shows")
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
      .catch(err => {
        console.error(err);
        showMeta.innerHTML = "<p>Error loading show.</p>";
      });
  }

  // Buy ticket
  if (buyTicketBtn) {
    buyTicketBtn.addEventListener("click", async () => {
      const user = requireUser(["buyer", "skater"]);
      if (!user) return;

      const res = await fetch("/api/buy-ticket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          show_id: showId,
          buyer_id: user.id
        })
      });

      const data = await res.json();

      if (data.success) {
        alert("Ticket purchased! Ticket ID: " + data.ticket_id);
        // You could redirect to ticket view page here
      } else {
        alert("Failed to buy ticket: " + (data.error || "Unknown error"));
      }
    });
  }
});

// =============================
// SIMPLE ROLE-BASED GUARDS (OPTIONAL)
// Attach data-require-role="skater" or "buyer" to any element
// =============================
document.addEventListener("DOMContentLoaded", () => {
  const user = getCurrentUser();
  document.querySelectorAll("[data-require-role]").forEach(el => {
    const needed = el.getAttribute("data-require-role");
    if (!user || user.role !== needed) {
      el.style.display = "none";
    }
  });
});
