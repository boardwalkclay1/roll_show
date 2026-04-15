// /app/js/login.js — minimal login handler for bcrypt Worker
// ----------------------------------------------------------

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("auth-login-form");
  const errorBox = document.getElementById("auth-error");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorBox.hidden = true;
    errorBox.textContent = "";

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    // Build payload
    const payload = JSON.stringify({ email, password });

    // Send raw request through the dumb API client
    const res = await API.raw(
      "/api/login",
      "POST",
      payload,
      { "Content-Type": "application/json" }
    );

    // Parse response text safely
    let data = null;
    try {
      data = JSON.parse(res.text);
    } catch {
      errorBox.textContent = "Invalid server response";
      errorBox.hidden = false;
      return;
    }

    // Handle login failure
    if (!data.success) {
      errorBox.textContent = data.error || "Login failed";
      errorBox.hidden = false;
      return;
    }

    // SUCCESS — user is authenticated
    // Redirect them inside the app
    window.location.href = "/pages/dashboard.html";
  });
});
