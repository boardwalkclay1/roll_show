// auth-login.js — FINAL FIXED VERSION
import API from "/js/api.js";

const form = document.getElementById("auth-login-form");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const fd = new FormData(form);
  const payload = {
    email: fd.get("email"),
    password: fd.get("password")
  };

  try {
    const res = await API.post("/api/login", payload);

    if (!res.success || !res.user) {
      alert("Login failed. Check your email and password.");
      return;
    }

    const user = res.user;

    // 🔥 STORE ONLY WHAT THE DASHBOARDS NEED
    const session = {
      id: user.id,
      role: user.role,
      is_owner: user.is_owner || false
    };

    // 🔥 STORE UNDER THE CORRECT KEY
    localStorage.setItem("user", JSON.stringify(session));

    // 🔥 ROLE-BASED REDIRECT
    let target = "/";

    if (session.is_owner) {
      target = "/pages/owner/owner-dashboard.html";
    } else {
      switch (session.role) {
        case "skater":
          target = "/pages/skater/skater-dashboard.html";
          break;
        case "musician":
          target = "/pages/musician/musician-dashboard.html";
          break;
        case "business":
          target = "/pages/business/business-dashboard.html";
          break;
        case "buyer":
          target = "/pages/buyer/buyer-dashboard.html";
          break;
      }
    }

    window.location.href = target;

  } catch (err) {
    console.error("Login error:", err);
    alert("Login failed. Check your email and password.");
  }
});
