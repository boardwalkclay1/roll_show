// /app/js/auth-login.js
// Uses global API client (public/app/js/api.js).
// Behavior:
// - POST /api/login via API.post
// - Expects normalized API response: { success, data: { user, redirect, ... } }
// - On success: redirect to server-provided redirect or role-based mapping
// - Uses credentials: same-origin via API client; no manual cookie handling

(function () {
  const form = document.getElementById("auth-login-form");
  const errEl = document.getElementById("auth-error");

  function showError(msg) {
    errEl.textContent = msg || "Login failed";
    errEl.hidden = false;
  }

  function clearError() {
    errEl.textContent = "";
    errEl.hidden = true;
  }

  function roleRedirect(role) {
    const map = {
      owner: "/pages/owner/owner-dashboard.html",
      business: "/pages/business/business-dashboard.html",
      buyer: "/pages/buyer/buyer-dashboard.html",
      skater: "/pages/skater/skater-dashboard.html",
      musician: "/pages/musician/musician-dashboard.html",
      user: "/"
    };
    return map[role] || "/";
  }

  async function onSubmit(e) {
    e.preventDefault();
    clearError();

    const email = (document.getElementById("email").value || "").trim();
    const password = (document.getElementById("password").value || "");

    if (!email || !password) {
      showError("Email and password are required.");
      return;
    }

    // Disable form while request in-flight
    const submitBtn = form.querySelector("button[type='submit']");
    submitBtn.disabled = true;
    submitBtn.textContent = "Signing in…";

    try {
      // Use API client so credentials and fallback logic are consistent
      const res = await API.post("/api/login", { email, password });

      if (!res || res.success !== true) {
        // Try to extract message from server-shaped response
        const msg = (res && res.data && (res.data.message || res.data.error)) || (res && res.error && res.error.message) || "Invalid credentials";
        showError(msg);
        return;
      }

      // Server may return user and redirect inside data
      const payload = res.data || {};
      const user = payload.user || payload;
      const redirect = payload.redirect || (user && user.role ? roleRedirect(user.role) : "/");

      // Successful login: navigate (cookie already set by server if cookie flow)
      window.location.assign(redirect);
    } catch (err) {
      showError("Network error. Try again.");
      console.error("Login error:", err);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Log in";
    }
  }

  form.addEventListener("submit", onSubmit);
})();
