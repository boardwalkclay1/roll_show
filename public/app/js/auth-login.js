// auth-login.js
import API from "./api.js";

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

    // Worker returns: { success, user: {...} }
    if (!res.success || !res.user) {
      alert("Login failed. Check your email and password.");
      return;
    }

    const user = res.user;

    // Save user to localStorage
    localStorage.setItem("rollshow_user", JSON.stringify(user));

    let target = "/";

    if (user.is_owner) {
      target = "/pages/owner-dashboard.html";
    } else if (user.role === "skater") {
      target = "/pages/skater-dashboard.html";
    } else if (user.role === "musician") {
      target = "/pages/musician-dashboard.html";
    } else if (user.role === "business") {
      target = "/pages/business-dashboard.html";
    } else if (user.role === "buyer") {
      target = "/pages/buyer-dashboard.html";
    }

    window.location.href = target;

  } catch (err) {
    console.error(err);
    alert("Login failed. Check your email and password.");
  }
});
