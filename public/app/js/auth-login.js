// /app/js/auth-login.js — FINAL PRODUCTION VERSION

const form = document.getElementById("auth-login-form");

if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const fd = new FormData(form);

    const payload = {
      email: fd.get("email"),
      password: fd.get("password")
    };

    // Correct Worker route: /api/login
    let res;
    try {
      res = await API.post("/api/login", payload);
    } catch (err) {
      alert("Network error. Try again.");
      return;
    }

    if (!res || !res.success || !res.user) {
      alert(res?.message || res?.error?.message || "Login failed.");
      return;
    }

    const user = res.user;

    const session = {
      id: user.id,
      role: user.role,
      is_owner: user.is_owner === true
    };

    localStorage.setItem("user", JSON.stringify(session));

    // Redirect logic
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
  });
}
