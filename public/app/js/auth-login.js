// /js/auth-login.js — FIXED VERSION (correct /api/login route)

const form = document.getElementById("auth-login-form");

if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const fd = new FormData(form);

    const payload = {
      email: fd.get("email"),
      password: fd.get("password")
    };

    // 🔥 FIXED: Correct backend route
    const res = await API.post("/api/login", payload);

    if (!res || !res.success || !res.user) {
      alert(res?.error?.message || "Login failed. Check your email and password.");
      return;
    }

    const user = res.user;

    const session = {
      id: user.id,
      role: user.role,
      is_owner: user.is_owner || false
    };

    localStorage.setItem("user", JSON.stringify(session));

    let target = "/";

    if (session.is_owner) {
      target = "/pages/owner/owner-dashboard.htmll";
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
