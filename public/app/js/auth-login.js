// /app/js/auth-login.js — FINAL PRODUCTION VERSION

const form = document.getElementById("auth-login-form");

if (form) {
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

      const email = emailRaw.toLowerCase();

      const payload = { email, password };

      let res;
      try {
        if (typeof API !== "undefined" && API && typeof API.post === "function") {
          res = await API.post("/api/login", payload);
        } else {
          const r = await fetch("/api/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
            credentials: "same-origin"
          });
          res = await r.json().catch(() => null);
        }
      } catch (err) {
        alert("Network error. Try again.");
        return;
      }

      if (!res || res.success !== true || !res.user) {
        alert(res?.message || res?.error?.message || "Login failed.");
        return;
      }

      const user = res.user;

      const session = {
        id: user.id,
        role: user.role || "user",
        is_owner: user.is_owner === true,
        email: user.email || email,
        created_at: user.created_at || null
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
          default:
            target = "/";
        }
      }

      // Use assign so back button behaves normally
      window.location.assign(target);
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });
}
